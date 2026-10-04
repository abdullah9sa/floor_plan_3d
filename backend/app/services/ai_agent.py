"""
AI Agent Service — Phase 4 AI Integration
Translates natural language prompts into structural scene graph mutations using Gemini or Groq APIs,
with automatic scene context injection, model routing, prompt caching, and a rule-based fallback mode.
"""
import json
import logging
import requests
import re
import hashlib
import time
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)

# --- In-Memory Prompt Cache ---
_prompt_cache = {}

def get_cache_key(system_prompt: str, context: str, user_prompt: str, model: str) -> str:
    s = f"{system_prompt}|{context}|{user_prompt}|{model}"
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


# --- LLM Strict Manual ---
SYSTEM_PROMPT = """You are an expert AI Spatial Architect and Interior Design agent.
Your job is to translate the user's natural language requests into concrete scene graph mutation commands for a 3D real estate platform.

### Mutation Commands Schema
You must return a list of mutations. Each mutation is an object with a `type` and a `payload`.
Supported mutation types and their payloads:

1. **ADD_ROOM**
   - payload: `{"type": "living_room"|"bedroom"|"kitchen"|"bathroom"|"hallway"|"dining_room", "polygon": [[x, z], [x, z], ...], "usable_area": float}`

2. **ADD_WALL**
   - payload: `{"start": [x, z], "end": [x, z], "height": 3.0, "thickness": 0.2, "material": "wall_paint_white"}`

3. **ADD_OPENING**
   - payload: `{"type": "door"|"window", "wall_id": "wall_id_string", "position": 0.5, "width": 0.9, "height": 2.1}`

4. **ADD_FURNITURE**
   - payload: `{"asset_id": "sofa_modern_01"|"bed_king_01"|"dining_table_6p"|"coffee_table_01", "position": [x, y, z], "rotation": [rx, ry, rz], "bounding_box": [w, h, d]}`
   - *Note: y should be 0.0 (sitting on floor).*

5. **UPDATE_FURNITURE**
   - payload: `{"id": "furn_id_string", "position": [x, y, z], "rotation": [rx, ry, rz]}`

6. **REMOVE_FURNITURE** / **REMOVE_WALL** / **REMOVE_ROOM**
   - payload: `{"id": "id_string"}`

7. **SCALE_ROOM**
   - payload: `{"id": "room_id_string", "scale_factor": 1.15}`
   - *Note: This will topologically stretch adjacent rooms to keep them attached. Use ONLY if you want to distort connected rooms.*

8. **SCALE_SCENE**
   - payload: `{"scale_factor": 1.15}`
   - *Note: Proportional scaling of the ENTIRE house. Use this if the user wants to keep everything rectangular when scaling.*

### STRICT RULES — NEVER VIOLATE:
1. ONLY make changes the user explicitly requested. Never add extra items.
2. If user says "make room bigger" -> check intent. To maintain rectangles without distortion, use SCALE_SCENE. To stretch topological connections, use SCALE_ROOM.
3. If user says "add window" -> use ADD_OPENING only. Don't modify walls or rooms.
4. If the scene context shows existing objects -> reference their exact IDs.
5. Furniture position.y MUST be 0.0 (floor level).
6. Room polygons must be clockwise, closed loops.
7. Openings position must be 0.0-1.0 along the parent wall.
8. If unsure -> return empty mutations with a clarifying question.
9. NEVER hallucinate room IDs, wall IDs, or furniture IDs. If selected_object_id is provided, prioritize it.
10. LIMIT: Maximum 5 mutations per request unless the user explicitly asks for a bulk operation.

### Output JSON Format
You MUST respond with a single JSON object containing exactly these fields:
{
  "response": "A friendly message explaining what changes you made.",
  "mutations": [
    { "type": "ADD_FURNITURE", "payload": { ... } }
  ],
  "confidence": 0.95
}
Do not output markdown code blocks outside of the JSON payload. Respond ONLY with the raw JSON.
"""

class AIAgent:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.is_configured = bool(self.gemini_key or self.groq_key)
        
        if not self.is_configured:
            logger.warning("[AIAgent] No API keys configured. Running in Mock Fallback Mode.")

    def build_scene_context(self, scene: Optional[Dict[str, Any]], selected_id: Optional[str]) -> str:
        """Compiles a text summary of the current layout for the LLM to understand context."""
        if not scene:
            return "Current Scene Context: Empty scene."

        context = []
        context.append("Current Scene Context:")
        
        # Rooms
        rooms = scene.get('rooms', [])
        context.append("\nRooms in scene:")
        if not rooms:
            context.append("- None")
        for r in rooms:
            context.append(f"- Room ID: {r.get('id')}, Type: {r.get('type')}, Polygon: {r.get('polygon')}")
            
        # Walls
        walls = scene.get('walls', [])
        context.append("\nWalls in scene:")
        if not walls:
            context.append("- None")
        for w in walls:
            context.append(f"- Wall ID: {w.get('id')}, Start: {w.get('start')}, End: {w.get('end')}")
            
        # Furniture
        furniture = scene.get('furniture', [])
        context.append("\nPlaced Furniture in scene:")
        if not furniture:
            context.append("- None")
        for f in furniture:
            context.append(f"- Furniture ID: {f.get('id')}, Asset: {f.get('asset_id')}, Position: {f.get('position')}")

        if selected_id:
            context.append(f"\nCurrently Selected Object ID: {selected_id}")

        return "\n".join(context)

    def _post_with_retry(self, url: str, json_payload: dict, headers: dict = None, timeout: float = 60.0, max_retries: int = 3) -> requests.Response:
        last_exception = None
        for attempt in range(max_retries):
            try:
                res = requests.post(url, json=json_payload, headers=headers, timeout=timeout)
                if res.status_code in (429, 502, 503, 504):
                    res.raise_for_status()
                else:
                    res.raise_for_status()
                    return res
            except requests.exceptions.RequestException as e:
                last_exception = e
                sleep_time = 1.5 ** attempt
                time.sleep(sleep_time)
        raise last_exception

    def process_command(self, prompt: str, model: str = "gemini-1.5-pro-latest", scene_snapshot: Optional[Dict[str, Any]] = None, selected_object_id: Optional[str] = None) -> Dict[str, Any]:
        """Translates a user prompt to mutations using the specified model."""
        scene_context = self.build_scene_context(scene_snapshot, selected_object_id)
        
        # Determine if we should cache
        # We skip cache if selected_object_id is provided, since specific IDs change often
        can_cache = not selected_object_id
        cache_key = ""
        
        if can_cache:
            cache_key = get_cache_key(SYSTEM_PROMPT, scene_context, prompt, model)
            if cache_key in _prompt_cache:
                entry = _prompt_cache[cache_key]
                if time.time() - entry['time'] < settings.AI_CACHE_TTL_SECONDS:
                    logger.info("[AIAgent] Cache hit for prompt.")
                    result = entry['data'].copy()
                    result['cached'] = True
                    result['model_used'] = model
                    return result
        
        full_user_prompt = f"{scene_context}\n\nUser Request: \"{prompt}\"\n\nJSON Output:"

        result = None
        if model.startswith("gemini-") and self.gemini_key:
            result = self._call_gemini(full_user_prompt, model)
        elif model.startswith("llama-") and self.groq_key:
            result = self._call_groq(full_user_prompt, model)
        else:
            result = self._fallback_parser(prompt, scene_snapshot)
            model = "fallback"

        result['cached'] = False
        result['model_used'] = model

        if can_cache and result.get('mutations'):
            # Enforce max cache size
            if len(_prompt_cache) >= settings.AI_CACHE_MAX_SIZE:
                # Evict oldest
                oldest = min(_prompt_cache.keys(), key=lambda k: _prompt_cache[k]['time'])
                del _prompt_cache[oldest]
                
            _prompt_cache[cache_key] = {
                'data': result,
                'time': time.time()
            }

        return result

    def _call_gemini(self, prompt: str, model: str) -> Dict[str, Any]:
        logger.info(f"[AIAgent] Calling Gemini API ({model})...")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SYSTEM_PROMPT},
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        try:
            res = self._post_with_retry(url, payload, timeout=20)
            data = res.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception as e:
            logger.warning(f"[AIAgent] Gemini call failed: {e}")
            return {
                "response": f"Gemini API error ({str(e)}).",
                "mutations": [],
                "confidence": 0.0
            }

    def _call_groq(self, prompt: str, model: str) -> Dict[str, Any]:
        logger.info(f"[AIAgent] Calling Groq API ({model})...")
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        try:
            res = self._post_with_retry(url, payload, headers=headers, timeout=15)
            data = res.json()
            text = data["choices"][0]["message"]["content"]
            return json.loads(text)
        except Exception as e:
            logger.error(f"[AIAgent] Groq API call failed: {e}")
            return {
                "response": f"Groq API error ({str(e)}).",
                "mutations": [],
                "confidence": 0.0
            }

    def _fallback_parser(self, prompt: str, scene: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Rule-based mock fallback if no API keys are provided."""
        logger.info("[AIAgent] Running in rule-based fallback mode...")
        mutations = []
        p = prompt.lower().strip()
        
        if "sofa" in p:
            mutations.append({
                "type": "ADD_FURNITURE",
                "payload": {
                    "asset_id": "sofa_modern_01",
                    "position": [2.5, 0.0, 3.5],
                    "bounding_box": [2.2, 0.9, 0.85],
                    "rotation": [0, 0, 0]
                }
            })
            
        msg = f"[Offline Mode] Understood: \"{prompt}\"."
        return {
            "response": msg,
            "mutations": mutations,
            "confidence": 0.5
        }
