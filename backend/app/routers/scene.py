"""
Scene Graph CRUD router
In-memory store for Phase 1. Will migrate to PostgreSQL in Phase 2.
"""
from fastapi import APIRouter, HTTPException
from app.models.scene import SceneGraph, Room, Wall, Opening, Furniture, Light, MutationBatch
from uuid import uuid4
import time

router = APIRouter()

# ── In-Memory Store ───────────────────────────────────────────────────────────
_scenes: dict[str, SceneGraph] = {}


def _get_scene(scene_id: str) -> SceneGraph:
    if scene_id not in _scenes:
        raise HTTPException(status_code=404, detail=f"Scene '{scene_id}' not found")
    return _scenes[scene_id]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_scene(name: str = "New Project"):
    """Create a new empty scene graph"""
    from app.models.scene import Project
    scene = SceneGraph(project=Project(name=name))
    _scenes[scene.project.id] = scene
    return {"scene_id": scene.project.id, "scene": scene}


@router.get("/{scene_id}")
async def get_scene(scene_id: str):
    """Retrieve the full scene graph"""
    return _get_scene(scene_id)


@router.post("/{scene_id}/mutate")
async def apply_mutations(scene_id: str, batch: MutationBatch):
    """
    Apply a batch of mutations to the scene.
    All mutations pass through this single pipeline endpoint.
    """
    scene = _get_scene(scene_id)
    applied = []

    for mut in batch.mutations:
        t = mut.type
        p = mut.payload

        if t == "ADD_ROOM":
            scene.rooms.append(Room(**p))
        elif t == "ADD_WALL":
            scene.walls.append(Wall(**p))
        elif t == "ADD_OPENING":
            scene.openings.append(Opening(**p))
        elif t == "ADD_FURNITURE":
            scene.furniture.append(Furniture(**p))
        elif t == "ADD_LIGHT":
            scene.lights.append(Light(**p))
        elif t == "MOVE_OBJECT":
            for f in scene.furniture:
                if f.id == p.get("target"):
                    f.position = p["to"]
        elif t == "REMOVE_FURNITURE":
            scene.furniture = [f for f in scene.furniture if f.id != p.get("id")]
        elif t == "REMOVE_WALL":
            scene.walls = [w for w in scene.walls if w.id != p.get("id")]
        elif t == "REMOVE_ROOM":
            scene.rooms = [r for r in scene.rooms if r.id != p.get("id")]
        else:
            applied.append({"type": t, "status": "unknown_mutation"})
            continue

        applied.append({"type": t, "status": "ok"})

    return {"applied": applied, "scene": scene}


@router.delete("/{scene_id}")
async def delete_scene(scene_id: str):
    _get_scene(scene_id)
    del _scenes[scene_id]
    return {"deleted": scene_id}


@router.get("/")
async def list_scenes():
    return [{"id": s.project.id, "name": s.project.name} for s in _scenes.values()]
