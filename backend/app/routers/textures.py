from fastapi import APIRouter
from pydantic import BaseModel
import os
import glob

router = APIRouter()

class TextureSet(BaseModel):
    id: str
    name: str = ""
    diffuse: str | None = None
    normal: str | None = None
    displacement: str | None = None
    roughness: str | None = None

@router.get("/")
def get_textures():
    # The frontend public directory path relative to the backend
    textures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/public/textures"))
    
    if not os.path.exists(textures_dir):
        return {"textures": []}

    texture_sets = {}
    
    # Walk through subdirectories to find texture sets
    for root, _, files in os.walk(textures_dir):
        rel_path = os.path.relpath(root, textures_dir)
        if rel_path == ".":
            continue
        
        # Skip nested subdirectories beyond 1 level
        if os.sep in rel_path or "/" in rel_path:
            continue
            
        texture_id = os.path.basename(root)
        
        diffuse = None
        normal = None
        displacement = None
        roughness = None
        
        for f in files:
            f_lower = f.lower()
            # Only process web-friendly formats
            ext = os.path.splitext(f_lower)[1]
            if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
                continue
                
            if "diffuse" in f_lower or "diff" in f_lower or "color" in f_lower or "albedo" in f_lower:
                diffuse = f"/textures/{rel_path}/{f}".replace("\\", "/")
            elif "normal" in f_lower or "nrm" in f_lower or "nor_" in f_lower:
                normal = f"/textures/{rel_path}/{f}".replace("\\", "/")
            elif "displacement" in f_lower or "disp" in f_lower or "height" in f_lower:
                displacement = f"/textures/{rel_path}/{f}".replace("\\", "/")
            elif "rough" in f_lower:
                roughness = f"/textures/{rel_path}/{f}".replace("\\", "/")
                
        if diffuse or normal or displacement:
            # Make a nice display name from the id
            display_name = texture_id.replace("_", " ").title()
            texture_sets[texture_id] = TextureSet(
                id=texture_id,
                name=display_name,
                diffuse=diffuse,
                normal=normal,
                displacement=displacement,
                roughness=roughness,
            )
            
    return {"textures": list(texture_sets.values())}
