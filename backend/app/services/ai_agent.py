"""
AI Agent Service — Phase 4 AI Integration
Translates natural language prompts into structural scene graph mutations using Gemini or Groq APIs,
with automatic scene context injection and a rule-based fallback mode.
"""
import json
import logging
import requests
import re
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.models.scene import SceneGraph

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert AI Spatial Architect and Interior Design agent.
Your job is to translate the user's natural language requests into concrete scene graph mutation commands for a 3D real estate platform.

### Mutation Commands Schema
You must return a list of mutations. Each mutation is an object with a `type` and a `payload`.
Supported mutation types and their payloads:

1. **ADD_ROOM**
   - payload: `{"type": "living_room"|"bedroom"|"kitchen"|"bathroom"|"hallway"|"dining_room", "polygon": [[x, z], [x, z], ...], "usable_area": float}`
   - *Note: Room polygons are 2D vertices on the XZ floor plane.*

2. **ADD_WALL**
   - payload: `{"start": [x, z], "end": [x, z], "height": 3.0, "thickness": 0.2, "material": "wall_paint_white"|"concrete_polished"|"brick_exposed"}`

3. **ADD_OPENING**
   - payload: `{"type": "door"|"window", "wall_id": "wall_id_string", "position": 0.5, "width": 0.9, "height": 2.1}`
   - *Note: Position is a float between 0.0 and 1.0 along the wall segment.*

4. **ADD_FURNITURE**
   - payload: `{"asset_id": "sofa_modern_01"|"bed_king_01"|"dining_table_6p"|"chair_modern"|"coffee_table_01"|"desk_wood", "position": [x, y, z], "rotation": [rx, ry, rz], "bounding_box": [w, h, d]}`
   - *Note: y should be 0.0 (sitting on floor). Rotation is in degrees. Bounding box matches standard furniture sizes.*

5. **UPDATE_FURNITURE**
   - payload: `{"id": "furn_id_string", "position": [x, y, z], "rotation": [rx, ry, rz]}`

6. **REMOVE_FURNITURE** / **REMOVE_WALL** / **REMOVE_ROOM**
   - payload: `{"id": "id_string"}`

7. **SCALE_ROOM**
   - payload: `{"id": "room_id_string", "scale_factor": 1.15}`
   - *Note: scales the room polygon from its centroid by the factor.*

### Spatial Guidelines
- Make coordinates exact and aligned.
- Place furniture inside existing room polygons.
- Do not let furniture overlap with existing furniture bounding boxes.
- Place items realistically: a bed headboard should face/hug a wall; a coffee table sits in front of a sofa.

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

VISION_SYSTEM_PROMPT = """You are an expert Architectural AI Vision system.
You will receive a 2D floor plan image. Your task is to analyze it and extract its structural layout as a JSON object.
Ignore noisy lines like furniture, text labels, hatching, and dimensions. Focus ONLY on the core structural walls and the rooms they form.

### Output JSON Format
You MUST respond with a single JSON object containing exactly these fields:
{
  "walls": [
    {"start_m": [x, z], "end_m": [x, z]}
  ],
  "rooms": [
    {
      "type": "living_room"|"bedroom"|"kitchen"|"bathroom"|"hallway"|"dining_room",
      "polygon": [[x, z], [x, z], ...],
      "label": "Room Name Found in Image (if any)"
    }
  ],
  "scale_m_per_px": 0.05
}

Assume an arbitrary sensible scale if none is given (e.g. standard doors are 0.9m). Output only the raw JSON.
"""

FLOORPLAN_EVAL_SYSTEM_PROMPT = """You are an expert Architectural AI Evaluator and Structural Repair Agent.
You will receive a JSON representation of a partially-detected floor plan from a computer vision model.
The detection may have errors: missing windows, disconnected walls, missing doors between rooms, or illogical placements.

Your job is to logically evaluate the floor plan and return a corrected, improved version.

### Evaluation Rules
1. **Windows**: Every exterior-facing room (bedroom, living_room, kitchen) MUST have at least one window opening on an outer wall. Add a window if none exist.
2. **Doors**: Every room must be accessible. If a room has no door opening connecting it to a hallway or adjacent room, add one at a logical midpoint of a shared wall.
3. **Wall Connectivity**: Walls should connect at endpoints. If two walls are very close but not touching, snap them to connect.
4. **Dangling Walls**: Remove walls shorter than 0.3m that don't connect to anything.
5. **Duplicate Openings**: Remove duplicate openings that overlap significantly (within 0.2m of each other on the same wall).
6. **Realistic Sizes**: Doors should be 0.85-1.0m wide, 2.0-2.2m tall. Windows should be 0.8-1.8m wide, 0.9-1.4m tall.

### Input JSON Format
{
  "walls": [{"id": "...", "start": [x, z], "end": [x, z], "height": 3.0, "thickness": 0.2, "material": "..."}],
  "rooms": [{"id": "...", "type": "...", "polygon": [[x, z], ...], "label": "...", "centroid_m": [x, z]}],
  "openings": [{"id": "...", "type": "door"|"window", "start": [x, z], "end": [x, z], "thickness": 0.1}]
}

### Output JSON Format
Return the COMPLETE corrected floor plan in the SAME format. Do not omit any valid elements.
Also include a "fixes_applied" array describing what you changed.
{
  "walls": [...],
  "rooms": [...],
  "openings": [...],
  "fixes_applied": ["Added window to bedroom on north wall", "Connected wall gap at [3.2, 1.0]", ...]
}

Output ONLY raw JSON. No markdown, no explanation outside the JSON.
"""

class AIAgent:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.is_configured = bool(self.gemini_key or self.groq_key)
        
        if not self.is_configured:
            logger.warning("[AIAgent] No API keys configured. Running in Mock Fallback Mode.")

    def build_scene_context(self, scene: Optional[SceneGraph]) -> str:
        """Compiles a text summary of the current layout for the LLM to understand context."""
        if not scene:
            return "Current Scene Context: Empty scene."

        context = []
        context.append("Current Scene Context:")
        
        # Rooms
        context.append("\nRooms in scene:")
        if not scene.rooms:
            context.append("- None")
        for r in scene.rooms:
            context.append(f"- Room ID: {r.id}, Type: {r.type}, Usable Area: {r.usable_area} sqm, Polygon: {r.polygon}")
            
        # Walls
        context.append("\nWalls in scene:")
        if not scene.walls:
            context.append("- None")
        for w in scene.walls:
            context.append(f"- Wall ID: {w.id}, Start: {w.start}, End: {w.end}, Height: {w.height}, Thickness: {w.thickness}, Material: {w.material}")
            
        # Openings
        context.append("\nOpenings (Doors/Windows) in scene:")
        if not scene.openings:
            context.append("- None")
        for op in scene.openings:
            context.append(f"- Opening ID: {op.id}, Type: {op.type}, Parent Wall: {op.wall_id}, Position along wall: {op.position}, Width: {op.width}, Height: {op.height}")

        # Furniture
        context.append("\nPlaced Furniture in scene:")
        if not scene.furniture:
            context.append("- None")
        for f in scene.furniture:
            context.append(f"- Furniture ID: {f.id}, Asset: {f.asset_id}, Position: {f.position}, Bounding Box: {f.bounding_box}, Rotation: {f.rotation}")

        return "\n".join(context)

    def _post_with_retry(self, url: str, json_payload: dict, headers: dict = None, timeout: float = 60.0, max_retries: int = 3) -> requests.Response:
        """
        Sends a POST request with exponential backoff retry logic for transient errors (429, 502, 503, 504).
        """
        import time
        last_exception = None
        for attempt in range(max_retries):
            try:
                res = requests.post(url, json=json_payload, headers=headers, timeout=timeout)
                if res.status_code in (429, 502, 503, 504):
                    logger.warning(f"[AIAgent] Transient error {res.status_code} from {url}. Attempt {attempt + 1}/{max_retries}...")
                    res.raise_for_status()
                else:
                    res.raise_for_status()
                    return res
            except requests.exceptions.RequestException as e:
                last_exception = e
                # Wait 1.5^attempt seconds
                sleep_time = 1.5 ** attempt
                logger.warning(f"[AIAgent] Request failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {sleep_time:.1f}s...")
                time.sleep(sleep_time)
        
        # If all retries failed, raise the last exception
        raise last_exception

    def extract_floorplan(self, image_bytes: bytes, mime_type: str = "image/png") -> Dict[str, Any]:
        """Uses Gemini Vision API to extract walls and rooms directly from a floor plan image."""
        if not self.gemini_key:
            raise ValueError("GEMINI_API_KEY is required for multimodal floor plan extraction.")

        import base64
        import requests
        
        logger.info("[AIAgent] Calling Gemini Vision API for floor plan extraction...")
        
        b64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": VISION_SYSTEM_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        models = ["gemini-1.5-flash", "gemini-2.5-flash"]
        last_err = None
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            try:
                logger.info(f"[AIAgent] Requesting Gemini Vision using model {model}...")
                res = self._post_with_retry(url, payload, timeout=45)
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
            except Exception as e:
                logger.warning(f"[AIAgent] Gemini Vision failed with model {model}: {e}")
                last_err = e
        raise last_err

    def evaluate_and_fix_floorplan(self, scene_data: dict) -> dict:
        """
        Sends the raw CubiCasa detection output (walls, rooms, openings) to an LLM
        for structural evaluation. The LLM applies architectural logic to:
        - Add missing windows to bedrooms/living rooms on exterior walls
        - Add missing doors between rooms
        - Fix disconnected or dangling walls
        - Remove duplicate openings
        Returns the corrected scene_data dict plus a 'fixes_applied' list.
        Falls back to the original data if no API key is configured or if the call fails.
        """
        if not self.gemini_key and not self.groq_key:
            logger.warning("[AIAgent] No API keys configured — skipping AI structural evaluation.")
            scene_data["fixes_applied"] = ["AI evaluation skipped: no API key configured."]
            return scene_data

        payload_str = json.dumps(scene_data, indent=2)
        full_prompt = f"{FLOORPLAN_EVAL_SYSTEM_PROMPT}\n\n### Input Floor Plan JSON:\n{payload_str}\n\n### Corrected Floor Plan JSON:"

        result = None
        errors = []
        
        if self.gemini_key:
            try:
                result = self._call_llm_gemini(full_prompt)
            except Exception as e:
                logger.error(f"[AIAgent] Gemini structural evaluation failed: {e}")
                errors.append(f"Gemini failed: {str(e)}")
                
        if not result and self.groq_key:
            try:
                logger.info("[AIAgent] Trying Groq as fallback for structural evaluation...")
                result = self._call_llm_groq(full_prompt)
            except Exception as e:
                logger.error(f"[AIAgent] Groq structural evaluation failed: {e}")
                errors.append(f"Groq failed: {str(e)}")

        if not result:
            # Both failed or weren't configured
            logger.error("[AIAgent] All configured LLMs failed for structural evaluation. Returning original data.")
            error_msg = "; ".join(errors) if errors else "No API key configured"
            scene_data["fixes_applied"] = [f"AI evaluation error: {error_msg}"]
            return scene_data

        try:
            # Validate the result has the necessary keys
            if not isinstance(result, dict):
                raise ValueError("LLM returned non-dict response")

            # Ensure required keys are present and fall back to originals if missing
            fixed = {
                "walls": result.get("walls", scene_data.get("walls", [])),
                "rooms": result.get("rooms", scene_data.get("rooms", [])),
                "openings": result.get("openings", scene_data.get("openings", [])),
                "fixes_applied": result.get("fixes_applied", []),
            }
            logger.info(f"[AIAgent] AI structural eval applied {len(fixed['fixes_applied'])} fix(es).")
            return fixed

        except Exception as e:
            logger.error(f"[AIAgent] AI result processing failed: {e}. Returning original data.")
            scene_data["fixes_applied"] = [f"AI evaluation error: {str(e)}"]
            return scene_data

    def _call_llm_gemini(self, prompt: str) -> Dict[str, Any]:
        """Calls Gemini with a plain text prompt and expects JSON back, trying multiple models."""
        models = ["gemini-2.5-flash", "gemini-1.5-flash"]
        last_err = None
        
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            }
            try:
                logger.info(f"[AIAgent] Requesting Gemini using model {model}...")
                res = self._post_with_retry(url, payload, timeout=45)
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
            except Exception as e:
                logger.warning(f"[AIAgent] Gemini call failed with model {model}: {e}")
                last_err = e
        
        raise last_err

    def _call_llm_groq(self, prompt: str) -> Dict[str, Any]:
        """Calls Groq with a plain text prompt and expects JSON back, with retry."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.groq_key}", "Content-Type": "application/json"}
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
        }
        res = self._post_with_retry(url, payload, headers=headers, timeout=60)
        data = res.json()
        text = data["choices"][0]["message"]["content"]
        return json.loads(text)

    def process_command(self, prompt: str, scene: Optional[SceneGraph] = None) -> Dict[str, Any]:
        """Translates a user prompt to mutations using Gemini or Groq or Fallback."""
        scene_context = self.build_scene_context(scene)
        full_user_prompt = f"{scene_context}\n\nUser Request: \"{prompt}\"\n\nJSON Output:"

        # Try Gemini first
        if self.gemini_key:
            return self._call_gemini(full_user_prompt)
        
        # Try Groq second
        if self.groq_key:
            return self._call_groq(full_user_prompt)

        # Fallback Mock Parser
        return self._fallback_parser(prompt, scene)

    def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        """Calls Google Gemini developer API with JSON schema enforcement, trying multiple models."""
        logger.info("[AIAgent] Calling Gemini API for mutation processing...")
        models = ["gemini-2.5-flash", "gemini-1.5-flash"]
        last_err = None
        
        for model in models:
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
                logger.warning(f"[AIAgent] Gemini call failed with model {model}: {e}")
                last_err = e
                
        # If all failed, fall back to rule-based fallback
        return {
            "response": f"Gemini API error ({str(last_err)}). Fell back to mock mode.",
            "mutations": self._get_fallback_mutations(prompt, scene=None),
            "confidence": 0.4
        }

    def _call_groq(self, prompt: str) -> Dict[str, Any]:
        """Calls Groq Cloud API with OpenAI compatibility client format, with retry."""
        logger.info("[AIAgent] Calling Groq API...")
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
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
                "response": f"Groq API error ({str(e)}). Fell back to mock mode.",
                "mutations": self._get_fallback_mutations(prompt, scene=None),
                "confidence": 0.4
            }

    def _fallback_parser(self, prompt: str, scene: Optional[SceneGraph]) -> Dict[str, Any]:
        """Rule-based mock fallback if no API keys are provided."""
        logger.info("[AIAgent] Running in rule-based fallback mode...")
        mutations = self._get_fallback_mutations(prompt, scene)
        
        msg = f"[Mock Fallback Mode] Understood prompt: \"{prompt}\". "
        if mutations:
            msg += f"Generated {len(mutations)} mock mutations. "
        else:
            msg += "No mock matching rule found. "
        msg += "Add a GEMINI_API_KEY or GROQ_API_KEY to backend/.env for live LLM generation!"

        return {
            "response": msg,
            "mutations": mutations,
            "confidence": 0.5
        }

    def _get_fallback_mutations(self, prompt: str, scene: Optional[SceneGraph]) -> List[Dict[str, Any]]:
        """Phase 1 pattern matcher logic."""
        p = prompt.lower().strip()
        mutations = []

        # Check furnish living room
        if "furnish" in p and "living" in p:
            mutations.extend([
                {
                    "type": "ADD_FURNITURE",
                    "payload": {
                        "asset_id": "sofa_modern_01",
                        "position": [2.5, 0.0, 3.5],
                        "bounding_box": [2.2, 0.9, 0.85],
                        "rotation": [0, 0, 0]
                    }
                },
                {
                    "type": "ADD_FURNITURE",
                    "payload": {
                        "asset_id": "coffee_table_01",
                        "position": [2.5, 0.0, 4.5],
                        "bounding_box": [1.0, 0.45, 0.6],
                        "rotation": [0, 0, 0]
                    }
                }
            ])
            return mutations

        # Check sofa
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
        
        # Check bed
        elif "bed" in p:
            mutations.append({
                "type": "ADD_FURNITURE",
                "payload": {
                    "asset_id": "bed_king_01",
                    "position": [11.0, 0.0, 2.5],
                    "bounding_box": [1.8, 0.6, 2.2],
                    "rotation": [0, 0, 0]
                }
            })
            
        # Check table
        elif "table" in p or "dining" in p:
            mutations.append({
                "type": "ADD_FURNITURE",
                "payload": {
                    "asset_id": "dining_table_6p",
                    "position": [3.0, 0.0, 4.0],
                    "bounding_box": [1.8, 0.76, 0.9],
                    "rotation": [0, 90, 0]
                }
            })

        # Check light
        elif "light" in p or "ceiling" in p:
            mutations.append({
                "type": "ADD_LIGHT",
                "payload": {
                    "type": "point",
                    "position": [4.0, 2.8, 3.0],
                    "intensity": 1.2,
                    "color": "#fff5e0",
                }
            })

        return mutations
