"""
Canonical Scene Graph — Pydantic schemas
Matches the JSON schemas defined in plan.md exactly.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import uuid4


# ── Primitives ────────────────────────────────────────────────────────────────
Point2D = List[float]   # [x, z]
Point3D = List[float]   # [x, y, z]
Polygon  = List[Point2D]


# ── Room ─────────────────────────────────────────────────────────────────────
class Room(BaseModel):
    id: str = Field(default_factory=lambda: f"room_{uuid4().hex[:6]}")
    type: str  # living_room | bedroom | kitchen | bathroom | hallway | ...
    polygon: Polygon
    usable_area: Optional[float] = None
    adjacent_rooms: List[str] = []
    entry_points: List[str] = []
    lighting_score: Optional[float] = None
    metadata: Dict[str, Any] = {}


# ── Wall ──────────────────────────────────────────────────────────────────────
class Wall(BaseModel):
    id: str = Field(default_factory=lambda: f"wall_{uuid4().hex[:6]}")
    start: Point2D
    end: Point2D
    height: float = 3.0
    thickness: float = 0.2
    material: str = "wall_paint_white"


# ── Opening (Door / Window) ───────────────────────────────────────────────────
class Opening(BaseModel):
    id: str = Field(default_factory=lambda: f"open_{uuid4().hex[:6]}")
    type: str  # door | window
    wall_id: str
    position: float   # 0.0–1.0 along wall
    width: float = 0.9
    height: float = 2.1


# ── Furniture ─────────────────────────────────────────────────────────────────
class Furniture(BaseModel):
    id: str = Field(default_factory=lambda: f"furn_{uuid4().hex[:6]}")
    asset_id: str
    position: Point3D
    rotation: Point3D = [0.0, 0.0, 0.0]
    scale: Point3D = [1.0, 1.0, 1.0]
    bounding_box: Point3D = [1.0, 1.0, 1.0]


# ── Material ──────────────────────────────────────────────────────────────────
class Material(BaseModel):
    id: str = Field(default_factory=lambda: f"mat_{uuid4().hex[:6]}")
    name: str
    category: str   # wall | floor | ceiling | furniture
    color_hex: Optional[str] = None
    texture_url: Optional[str] = None
    roughness: float = 0.8
    metalness: float = 0.0


# ── Light ─────────────────────────────────────────────────────────────────────
class Light(BaseModel):
    id: str = Field(default_factory=lambda: f"light_{uuid4().hex[:6]}")
    type: str   # ambient | directional | point | spot
    position: Optional[Point3D] = None
    intensity: float = 1.0
    color: str = "#ffffff"


# ── Constraint ────────────────────────────────────────────────────────────────
class Constraint(BaseModel):
    id: str = Field(default_factory=lambda: f"con_{uuid4().hex[:6]}")
    type: str   # no_overlap | min_clearance | must_face | ...
    targets: List[str] = []
    params: Dict[str, Any] = {}


# ── Event (Event Sourcing) ────────────────────────────────────────────────────
class SceneEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid4().hex[:8]}")
    timestamp: int
    type: str
    target: Optional[str] = None
    payload: Dict[str, Any] = {}


# ── Project ───────────────────────────────────────────────────────────────────
class Project(BaseModel):
    id: str = Field(default_factory=lambda: f"proj_{uuid4().hex[:6]}")
    name: str = "Untitled Project"


# ── Canonical Scene Graph ─────────────────────────────────────────────────────
class SceneGraph(BaseModel):
    project: Project = Field(default_factory=Project)
    rooms: List[Room] = []
    walls: List[Wall] = []
    openings: List[Opening] = []
    furniture: List[Furniture] = []
    materials: List[Material] = []
    lights: List[Light] = []
    constraints: List[Constraint] = []
    navigation_mesh: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {"scale": 1, "version": "1.0.0"}


# ── Mutation ──────────────────────────────────────────────────────────────────
class MutationRequest(BaseModel):
    type: str
    payload: Dict[str, Any]


class MutationBatch(BaseModel):
    mutations: List[MutationRequest]
