"""
Organize textures from a flat folder into subfolders for the Plany texture pipeline.
Groups files by their base name prefix (e.g., 'granite_tile_diff_4k.jpg' -> group 'granite_tile').
Only copies web-friendly formats (.jpg, .png) since .exr is not supported by WebGL natively.
"""
import os
import shutil
import re

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../textures"))
DST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/public/textures"))

# Map of file suffixes to their role
MAP_TYPES = {
    'diff': 'diffuse',
    'color': 'diffuse',
    'albedo': 'diffuse',
    'nor': 'normal',
    'nrm': 'normal',
    'normal': 'normal',
    'disp': 'displacement',
    'displacement': 'displacement',
    'height': 'displacement',
    'rough': 'roughness',
    'roughness': 'roughness',
}

def get_base_name(filename):
    """Extract the base material name from the filename.
    e.g. 'granite_tile_diff_4k.jpg' -> 'granite_tile'
    """
    name = os.path.splitext(filename)[0]
    # Remove resolution suffix like _4k, _2k, _1k
    name = re.sub(r'_\d+k$', '', name, flags=re.IGNORECASE)
    # Remove the map type suffix
    parts = name.split('_')
    # Find and remove the map type part
    for i, part in enumerate(parts):
        if part.lower() in MAP_TYPES:
            return '_'.join(parts[:i])
    return name

def get_map_type(filename):
    """Determine what type of map this file is."""
    name = os.path.splitext(filename)[0].lower()
    for key, val in MAP_TYPES.items():
        if f'_{key}' in name or f'_{key}_' in name:
            return val
    return None

def main():
    if not os.path.exists(SRC_DIR):
        print(f"Source directory not found: {SRC_DIR}")
        return

    os.makedirs(DST_DIR, exist_ok=True)
    
    # Only process web-friendly formats
    valid_exts = {'.jpg', '.jpeg', '.png', '.webp'}
    
    files = [f for f in os.listdir(SRC_DIR) if os.path.isfile(os.path.join(SRC_DIR, f))]
    
    groups = {}
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext not in valid_exts:
            print(f"  Skipping (unsupported format): {f}")
            continue
            
        base = get_base_name(f)
        map_type = get_map_type(f)
        
        if not map_type:
            print(f"  Skipping (unknown map type): {f}")
            continue
            
        if base not in groups:
            groups[base] = {}
        groups[base][map_type] = f
    
    print(f"\nFound {len(groups)} texture groups:")
    for group_name, maps in groups.items():
        group_dir = os.path.join(DST_DIR, group_name)
        os.makedirs(group_dir, exist_ok=True)
        
        print(f"\n  {group_name}/")
        for map_type, filename in maps.items():
            src = os.path.join(SRC_DIR, filename)
            # Rename to a standard format: {group}_{type}.{ext}
            ext = os.path.splitext(filename)[1]
            dst_name = f"{group_name}_{map_type}{ext}"
            dst = os.path.join(group_dir, dst_name)
            shutil.copy2(src, dst)
            print(f"    {map_type}: {filename} -> {dst_name}")

    print(f"\nDone! Organized {len(groups)} texture sets into {DST_DIR}")

if __name__ == "__main__":
    main()
