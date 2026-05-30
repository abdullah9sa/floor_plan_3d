import os
import math
from PIL import Image, ImageDraw

def generate_tile_texture(output_dir, tile_size=512, grid=4):
    os.makedirs(output_dir, exist_ok=True)
    
    # Diffuse Map
    diffuse = Image.new('RGB', (tile_size, tile_size), color='#e2e8f0')
    draw_diffuse = ImageDraw.Draw(diffuse)
    
    # Normal Map (flat is [128, 128, 255])
    normal = Image.new('RGB', (tile_size, tile_size), color=(128, 128, 255))
    draw_normal = ImageDraw.Draw(normal)
    
    # Displacement Map (height)
    disp = Image.new('L', (tile_size, tile_size), color=255)
    draw_disp = ImageDraw.Draw(disp)
    
    step = tile_size // grid
    grout_width = max(2, tile_size // 100)
    
    for i in range(grid):
        for j in range(grid):
            x0 = i * step
            y0 = j * step
            x1 = x0 + step
            y1 = y0 + step
            
            # Draw grout lines on diffuse
            draw_diffuse.rectangle([x0, y0, x1, y1], outline='#94a3b8', width=grout_width)
            
            # Normal map: bevel edges
            bevel = grout_width * 2
            # grout is deeper
            draw_normal.rectangle([x0, y0, x1, y1], outline=(128, 128, 128), width=grout_width)
            
            # Displacement map: grout is dark (low), tile is white (high)
            draw_disp.rectangle([x0, y0, x1, y1], outline=50, width=grout_width)
            
    diffuse.save(os.path.join(output_dir, 'tiles_diffuse.jpg'))
    normal.save(os.path.join(output_dir, 'tiles_normal.jpg'))
    disp.save(os.path.join(output_dir, 'tiles_displacement.jpg'))
    print(f"Generated textures in {output_dir}")

if __name__ == "__main__":
    frontend_textures = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/public/textures/sample_tiles'))
    generate_tile_texture(frontend_textures)
