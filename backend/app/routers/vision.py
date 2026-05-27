"""
Vision Router — Phase 2
Exposes the floor plan parsing pipeline as HTTP endpoints.

Endpoints:
  POST /api/vision/upload      — Upload image, get scene graph mutations
  GET  /api/vision/status/{id} — Job status (async ready for Phase 4)
  GET  /api/vision/debug/{id}  — Get debug overlay images
"""
from __future__ import annotations

import base64
import logging
import uuid
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.vision_pipeline import VisionPipeline, VisionResult
from app.services.ai_agent import AIAgent

logger = logging.getLogger(__name__)
router = APIRouter()

# ── In-memory job store (Phase 4 → Celery/Redis) ──────────────────────────────
_jobs: dict[str, dict] = {}
_pipeline = VisionPipeline(debug=True)
_ai_agent = AIAgent()


# ── Schemas ───────────────────────────────────────────────────────────────────

class VisionMutation(BaseModel):
    type: str
    payload: dict


class VisionUploadResponse(BaseModel):
    job_id: str
    status: str
    walls_detected: int
    rooms_detected: int
    openings_detected: int
    ocr_texts: list[dict]
    scale_m_per_px: float
    mutations: list[VisionMutation]
    warnings: list[str]
    fixes_applied: list[str]
    debug_images: dict[str, str]   # name → base64 PNG


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=VisionUploadResponse)
async def upload_floorplan(
    file: UploadFile = File(...),
    scene_id: Optional[str] = Form(default=None),
    confidence_threshold: float = Form(default=0.2, ge=0.05, le=0.95),
    enable_ai_fix: bool = Form(default=False),
):
    """
    Upload a 2D floor plan image.
    Returns detected walls, rooms, and scene graph mutations ready to apply.

    Supports: JPEG, PNG, WebP, BMP

    - **confidence_threshold**: Detection sensitivity (0.05=very sensitive, 0.95=very strict). Default 0.2.
    - **enable_ai_fix**: If true, passes the detected floor plan through an LLM to fix missing windows, doors, and illogical structures.
    """
    # Validate mime type
    if file.content_type not in {
        "image/jpeg", "image/jpg", "image/png",
        "image/webp", "image/bmp", "image/tiff",
    }:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: {file.content_type}. Use JPEG, PNG, or WebP."
        )

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 20MB)")

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    logger.info(f"[Vision] Processing job {job_id} — {file.filename} ({len(image_bytes)//1024}KB) "
                f"threshold={confidence_threshold} ai_fix={enable_ai_fix}")

    try:
        result: VisionResult = _pipeline.process(image_bytes, confidence_threshold=confidence_threshold)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"[Vision] Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Vision pipeline failed: {str(e)}")

    # ── AI Evaluation / Fix Step ───────────────────────────────────────────────
    fixes_applied: list[str] = []
    if enable_ai_fix:
        logger.info(f"[Vision] Running AI structural evaluation for job {job_id}...")
        scene_data = {
            "walls": result.walls,
            "rooms": result.rooms,
            "openings": result.openings,
        }
        try:
            fixed = _ai_agent.evaluate_and_fix_floorplan(scene_data)
            result.walls = fixed.get("walls", result.walls)
            result.rooms = fixed.get("rooms", result.rooms)
            result.openings = fixed.get("openings", result.openings)
            fixes_applied = fixed.get("fixes_applied", [])
            logger.info(f"[Vision] AI fixes: {fixes_applied}")
        except Exception as e:
            logger.warning(f"[Vision] AI evaluation error (non-fatal): {e}")
            fixes_applied = [f"AI evaluation error: {str(e)}"]

    # Build mutations
    mutations: list[VisionMutation] = []

    # Clear existing scene if scene_id provided
    if scene_id:
        mutations.append(VisionMutation(type="CLEAR_SCENE", payload={}))

    # Add rooms first
    for room in result.rooms:
        mutations.append(VisionMutation(type="ADD_ROOM", payload=room))

    # Add walls
    for wall in result.walls:
        mutations.append(VisionMutation(type="ADD_WALL", payload=wall))

    # Add openings
    if hasattr(result, "openings") and result.openings:
        for opening in result.openings:
            mutations.append(VisionMutation(type="ADD_OPENING", payload=opening))

    # Encode debug images to base64
    debug_b64: dict[str, str] = {}
    for name, png_bytes in result.debug_images.items():
        debug_b64[name] = base64.b64encode(png_bytes).decode("utf-8")

    response = VisionUploadResponse(
        job_id=job_id,
        status="complete",
        walls_detected=len(result.walls),
        rooms_detected=len(result.rooms),
        openings_detected=len(result.openings) if result.openings else 0,
        ocr_texts=result.ocr_texts,
        scale_m_per_px=result.scale_m_per_px,
        mutations=mutations,
        warnings=result.warnings,
        fixes_applied=fixes_applied,
        debug_images=debug_b64,
    )

    # Cache result
    _jobs[job_id] = response.model_dump()
    logger.info(f"[Vision] Job {job_id} complete: {len(result.walls)} walls, {len(result.rooms)} rooms, "
                f"{len(result.openings) if result.openings else 0} openings")
    return response


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Retrieve a previous vision job result by ID."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return _jobs[job_id]


@router.get("/debug/{job_id}/{image_name}")
async def get_debug_image(job_id: str, image_name: str):
    """Return a debug overlay image (PNG) for a vision job."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    debug = _jobs[job_id].get("debug_images", {})
    if image_name not in debug:
        raise HTTPException(status_code=404, detail=f"Debug image '{image_name}' not found")
    img_bytes = base64.b64decode(debug[image_name])
    return Response(content=img_bytes, media_type="image/png")


@router.get("/jobs")
async def list_jobs():
    """List all vision jobs (job_id, walls, rooms)"""
    return [
        {
            "job_id": jid,
            "walls_detected": d["walls_detected"],
            "rooms_detected": d["rooms_detected"],
            "status": d["status"],
        }
        for jid, d in _jobs.items()
    ]
