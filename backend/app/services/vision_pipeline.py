"""
Vision Pipeline Service — Phase 2 / CubiCasa5k
Converts a 2D floor plan image into a Canonical Scene Graph using CubiCasa5k.
"""
from __future__ import annotations

import logging
import math
import uuid
import os
import sys
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from PIL import Image

# Ensure PyTorch and Shapely can be imported
import torch
import torch.nn.functional as F
from shapely.geometry import Polygon

# Ensure app/services is in sys.path so we can import floortrans
services_dir = os.path.dirname(os.path.abspath(__file__))
if services_dir not in sys.path:
    sys.path.append(services_dir)

from floortrans.models import get_model
from floortrans.post_prosessing import split_prediction, get_polygons

logger = logging.getLogger(__name__)

# ─── Caching Mechanism for PyTorch Model ──────────────────────────────────────

_cached_model = None
_cached_device = None

def load_cubicasa_model():
    """Loads and caches the CubiCasa5k PyTorch model in memory for high performance."""
    global _cached_model, _cached_device
    if _cached_model is not None:
        return _cached_model, _cached_device

    _cached_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"[Vision] Loading CubiCasa5k model weights on device: {_cached_device}")

    # Initialize model architecture (51 classes initially in get_model)
    model = get_model('hg_furukawa_original', 51)

    # Adjust output layers for the 44 standard prediction classes
    n_classes = 44
    model.conv4_ = torch.nn.Conv2d(256, n_classes, bias=True, kernel_size=1)
    model.upsample = torch.nn.ConvTranspose2d(n_classes, n_classes, kernel_size=4, stride=4)

    # Load weights
    weights_path = os.path.join(services_dir, "model_best_val_loss_var.pkl")
    if not os.path.exists(weights_path):
        raise FileNotFoundError(f"Model weights file not found at: {weights_path}")

    checkpoint = torch.load(weights_path, map_location=_cached_device)
    model.load_state_dict(checkpoint['model_state'])
    model.to(_cached_device)
    model.eval()

    _cached_model = model
    logger.info("[Vision] CubiCasa5k model loaded and cached successfully.")
    return _cached_model, _cached_device


# ─── Data Types ──────────────────────────────────────────────────────────────

@dataclass
class Segment:
    x1: float; y1: float; x2: float; y2: float

    @property
    def length(self) -> float:
        return math.hypot(self.x2 - self.x1, self.y2 - self.y1)

    @property
    def midpoint(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)

    @property
    def angle_deg(self) -> float:
        return math.degrees(math.atan2(self.y2 - self.y1, self.x2 - self.x1)) % 180


@dataclass
class VisionResult:
    """Full output from the vision pipeline"""
    walls: list[dict]           # wall schema dicts for scene graph
    rooms: list[dict]           # room schema dicts
    openings: list[dict]        # openings (doors, windows)
    ocr_texts: list[dict]       # [{ text, x, y, confidence }]
    scale_m_per_px: float       # estimated meters per pixel
    image_w: int
    image_h: int
    debug_images: dict[str, bytes] = field(default_factory=dict)  # name -> PNG bytes
    warnings: list[str] = field(default_factory=list)


# ─── Class Mappings ───────────────────────────────────────────────────────────

ROOM_CLASSES_MAP = {
    1: "outdoor",
    3: "kitchen",
    4: "living_room",
    5: "bedroom",
    6: "bathroom",
    7: "hallway",
    9: "storage",
    10: "garage",
    11: "room"
}


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _wall_poly_to_segment(poly_px: np.ndarray, scale: float) -> tuple[list[float], list[float], float]:
    """
    Translates a 4-point rectangle polygon representing a wall in pixels to 
    a single start/end line segment and width in meters.
    """
    p0, p1, p2, p3 = poly_px[0], poly_px[1], poly_px[2], poly_px[3]

    # Compute side lengths
    d01 = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    d12 = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    d23 = math.hypot(p3[0] - p2[0], p3[1] - p2[1])
    d30 = math.hypot(p0[0] - p3[0], p0[1] - p3[1])

    # Find the short edges (thickness) vs long edges (length)
    if (d01 + d23) > (d12 + d30):
        # 1-2 and 3-0 are the short sides
        mid_start = [(p0[0] + p3[0]) / 2.0, (p0[1] + p3[1]) / 2.0]
        mid_end = [(p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0]
        thickness = (d12 + d30) / 2.0
    else:
        # 0-1 and 2-3 are the short sides
        mid_start = [(p0[0] + p1[0]) / 2.0, (p0[1] + p1[1]) / 2.0]
        mid_end = [(p2[0] + p3[0]) / 2.0, (p2[1] + p3[1]) / 2.0]
        thickness = (d01 + d23) / 2.0

    start_m = [round(mid_start[0] * scale, 3), round(mid_start[1] * scale, 3)]
    end_m = [round(mid_end[0] * scale, 3), round(mid_end[1] * scale, 3)]
    thickness_m = round(thickness * scale, 3)

    # Restrict thickness to realistic wall sizes (0.05m to 0.5m)
    if thickness_m < 0.05:
        thickness_m = 0.1
    elif thickness_m > 0.5:
        thickness_m = 0.2

    return start_m, end_m, thickness_m


def _extract_polygon_coords(geom) -> list[list[float]]:
    """Helper to safely extract exterior coordinates from a Shapely geometry."""
    if geom.geom_type == 'Polygon':
        return [[float(x), float(y)] for x, y in geom.exterior.coords]
    elif geom.geom_type == 'MultiPolygon':
        if len(geom.geoms) > 0:
            largest = max(geom.geoms, key=lambda p: p.area)
            return [[float(x), float(y)] for x, y in largest.exterior.coords]
    return []


# ─── Vision Pipeline ──────────────────────────────────────────────────────────

class VisionPipeline:
    """
    Neural Network Vision Pipeline using CubiCasa5k segmentation.
    """

    def __init__(self, debug: bool = False):
        self.debug = debug

    def process(self, image_bytes: bytes, confidence_threshold: float = 0.2) -> VisionResult:
        logger.info("[Vision] Starting CubiCasa5k pipeline")

        # 1. Decode image
        arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Could not decode image. Ensure it is a valid JPEG/PNG.")

        h, w = img_bgr.shape[:2]
        logger.info(f"[Vision] Image size: {w}×{h}")

        # 2. OCR text extraction for scale detection (Stage 3 legacy)
        ocr_texts = self._stage3_ocr(img_bgr)

        # 3. Model Inference
        model, device = load_cubicasa_model()
        
        # Convert BGR to RGB and resize to 512x512
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (512, 512), interpolation=cv2.INTER_AREA)
        
        # Normalize and construct tensor
        img_tensor = np.moveaxis(img_resized, -1, 0)
        img_tensor = 2 * (img_tensor / 255.0) - 1
        img_tensor = torch.tensor(img_tensor).float().unsqueeze(0).to(device)

        split = [21, 12, 11]
        with torch.no_grad():
            prediction = model(img_tensor)
            
            # Post-processing splits expectations (handles interpolation and softmax)
            heatmaps, rooms_logits, icons_logits = split_prediction(prediction, (h, w), split)

        # Extract polygons (openings classes = [1, 2])
        polygons, types, room_polygons, room_types = get_polygons(
            (heatmaps, rooms_logits, icons_logits), confidence_threshold, [1, 2]
        )

        # 4. Scale Estimation
        # Convert wall polygons into legacy Segment objects to reuse the scale estimation
        wall_segments = []
        for pol, t in zip(polygons, types):
            if t['type'] == 'wall':
                start_px, end_px, _ = _wall_poly_to_segment(pol, 1.0)
                wall_segments.append(Segment(start_px[0], start_px[1], end_px[0], end_px[1]))

        scale = self._estimate_scale(wall_segments, ocr_texts, w, h)

        # 5. Translate Detected Elements to Canonical Scene Graph Schema
        walls = []
        openings = []
        rooms = []

        # Parse walls and openings
        for pol, t in zip(polygons, types):
            if t['type'] == 'wall':
                start_m, end_m, thickness_m = _wall_poly_to_segment(pol, scale)
                walls.append({
                    "id": f"wall_{uuid.uuid4().hex[:6]}",
                    "start": start_m,
                    "end": end_m,
                    "height": 3.0,
                    "thickness": thickness_m,
                    "material": "wall_paint_white",
                })
            elif t['type'] == 'icon' and t['class'] in [1, 2]:
                start_m, end_m, thickness_m = _wall_poly_to_segment(pol, scale)
                open_type = "window" if t['class'] == 1 else "door"
                openings.append({
                    "id": f"open_{uuid.uuid4().hex[:6]}",
                    "type": open_type,
                    "start": start_m,
                    "end": end_m,
                    "thickness": thickness_m,
                })

        # Parse rooms
        for r_poly, r_type in zip(room_polygons, room_types):
            poly_px = _extract_polygon_coords(r_poly)
            if not poly_px:
                continue

            # Scale to meters
            poly_m = [[round(pt[0] * scale, 3), round(pt[1] * scale, 3)] for pt in poly_px]
            area = self._polygon_area(poly_m)

            # Centroid
            cx_px, cy_px = r_poly.centroid.x, r_poly.centroid.y
            centroid_m = [round(cx_px * scale, 3), round(cy_px * scale, 3)]

            # Map room type
            room_cls_id = r_type.get('class', 11)
            room_label = ROOM_CLASSES_MAP.get(room_cls_id, "room")

            rooms.append({
                "id": f"room_{uuid.uuid4().hex[:6]}",
                "type": room_label,
                "polygon": poly_m,
                "usable_area": round(abs(area), 2),
                "label": room_label.replace("_", " ").title(),
                "centroid_m": centroid_m,
            })

        # 6. Match openings to their parent walls
        openings = self._match_openings_to_walls(openings, walls)

        # 7. Generate Debug Images
        debug_imgs = {}
        if self.debug:
            # Create a simple room segmentation visualization map
            # argmax across the channels
            rooms_pred_map = np.argmax(rooms_logits, axis=0).astype(np.uint8)
            # Normalize to 0-255 for visualization
            rooms_vis = cv2.normalize(rooms_pred_map, None, 0, 255, cv2.NORM_MINMAX)
            debug_imgs["binary"] = self._encode_png(rooms_vis)

            # Draw green walls, orange room boundaries, and blue/purple doors/windows on the original image
            detected_overlay = self._draw_detections(img_bgr.copy(), walls, rooms, openings, scale)
            debug_imgs["detected"] = self._encode_png(detected_overlay)

        logger.info(f"[Vision] Done parsing: {len(walls)} walls, {len(rooms)} rooms, {len(openings)} openings")
        return VisionResult(
            walls=walls,
            rooms=rooms,
            openings=openings,
            ocr_texts=ocr_texts,
            scale_m_per_px=scale,
            image_w=w,
            image_h=h,
            debug_images=debug_imgs,
            warnings=["Parsed using CubiCasa5k local neural segmentation."]
        )

    # ── Opening-to-Wall Matching ───────────────────────────────────────────────

    def _match_openings_to_walls(self, openings: list[dict], walls: list[dict]) -> list[dict]:
        """
        Matches each opening (with start/end coordinates) to its nearest wall
        and converts to wall_id + position format for rendering.
        """
        if not openings or not walls:
            return openings

        matched = []
        for op in openings:
            op_start = np.array(op["start"])
            op_end = np.array(op["end"])
            op_mid = (op_start + op_end) / 2.0
            op_width = float(np.linalg.norm(op_end - op_start))

            best_wall = None
            best_dist = float("inf")
            best_pos = 0.5

            for wall in walls:
                w_start = np.array(wall["start"])
                w_end = np.array(wall["end"])
                w_vec = w_end - w_start
                w_len = float(np.linalg.norm(w_vec))
                if w_len < 0.01:
                    continue

                # Project the opening midpoint onto the wall line segment
                w_dir = w_vec / w_len
                t = float(np.dot(op_mid - w_start, w_dir))
                t_clamped = max(0.0, min(w_len, t))
                closest_pt = w_start + w_dir * t_clamped

                dist = float(np.linalg.norm(op_mid - closest_pt))

                if dist < best_dist:
                    best_dist = dist
                    best_wall = wall
                    best_pos = t_clamped / w_len if w_len > 0 else 0.5

            # Only match if the opening is within reasonable distance of the wall
            max_match_dist = 0.8  # meters
            if best_wall and best_dist < max_match_dist:
                height = 2.1 if op["type"] == "door" else 1.2
                matched.append({
                    "id": op["id"],
                    "type": op["type"],
                    "wall_id": best_wall["id"],
                    "position": round(best_pos, 3),
                    "width": round(max(op_width, 0.6), 3),
                    "height": height,
                    # Keep originals for debug
                    "start": op["start"],
                    "end": op["end"],
                })
                logger.info(f"[Vision] Matched opening {op['id']} ({op['type']}) to wall {best_wall['id']} at pos={best_pos:.2f}, dist={best_dist:.3f}m")
            else:
                logger.warning(f"[Vision] Opening {op['id']} ({op['type']}) could not be matched to any wall (best_dist={best_dist:.3f}m)")
                matched.append(op)  # Keep original as fallback

        return matched

    # ── Legacy Heuristics Stage 3 & 4 ────────────────────────────────────────

    def _stage3_ocr(self, img_bgr: np.ndarray) -> list[dict]:
        """Tesseract OCR for scale and label detection."""
        try:
            import pytesseract
            from pytesseract import Output

            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            scale = 2.0 if max(gray.shape) < 1000 else 1.0
            if scale > 1:
                gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            data = pytesseract.image_to_data(
                gray,
                output_type=Output.DICT,
                config="--psm 11 --oem 3",
            )

            texts = []
            for i in range(len(data["text"])):
                txt = data["text"][i].strip()
                conf = int(data["conf"][i])
                if txt and conf > 30:
                    texts.append({
                        "text": txt,
                        "x": int(data["left"][i] / scale),
                        "y": int(data["top"][i] / scale),
                        "w": int(data["width"][i] / scale),
                        "h": int(data["height"][i] / scale),
                        "confidence": conf,
                    })

            logger.info(f"[Vision] OCR found {len(texts)} text regions")
            return texts

        except ImportError:
            logger.warning("[Vision] pytesseract not available — skipping OCR")
            return []
        except Exception as e:
            logger.warning(f"[Vision] OCR failed: {e}")
            return []

    def _estimate_scale(
        self, segments: list[Segment], ocr_texts: list[dict], img_w: int, img_h: int
    ) -> float:
        """Heuristic scale estimation using OCR labels or fallback to longest segment."""
        import re
        for item in ocr_texts:
            txt = item["text"].lower()
            m = re.search(r"(\d+\.?\d*)\s*(m|cm|mm)", txt)
            if m:
                value = float(m.group(1))
                unit = m.group(2)
                if unit == "cm":
                    value /= 100
                elif unit == "mm":
                    value /= 1000
                if segments:
                    longest = max(segments, key=lambda s: s.length)
                    if longest.length > 0:
                        computed = value / longest.length
                        if 0.001 < computed < 1.0:
                            logger.info(f"[Vision] Scale from OCR: {computed:.5f} m/px")
                            return computed

        if segments:
            longest = max(segments, key=lambda s: s.length)
            if longest.length > 0:
                scale = 6.0 / longest.length
                logger.info(f"[Vision] Scale fallback (longest wall = 6m): {scale:.5f} m/px")
                return scale

        return 10.0 / max(img_w, 1)

    @staticmethod
    def _polygon_area(polygon: list[list[float]]) -> float:
        n = len(polygon)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += polygon[i][0] * polygon[j][1]
            area -= polygon[j][0] * polygon[i][1]
        return area / 2.0

    # ── Debug Visualization Helpers ───────────────────────────────────────────

    def _draw_detections(
        self, img: np.ndarray, walls: list[dict], rooms: list[dict], openings: list[dict], scale: float
    ) -> np.ndarray:
        # Draw rooms
        for r in rooms:
            poly_px = np.array([[int(p[0] / scale), int(p[1] / scale)] for p in r["polygon"]], np.int32)
            cv2.polylines(img, [poly_px], True, (0, 165, 255), 2) # Orange for rooms
            
            # Centroid label
            cx, cy = int(r["centroid_m"][0] / scale), int(r["centroid_m"][1] / scale)
            cv2.putText(img, r["label"], (cx - 20, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)

        # Draw walls
        for w in walls:
            x1, y1 = int(w["start"][0] / scale), int(w["start"][1] / scale)
            x2, y2 = int(w["end"][0] / scale), int(w["end"][1] / scale)
            cv2.line(img, (x1, y1), (x2, y2), (0, 255, 100), 3) # Green for walls

        # Draw openings (windows / doors)
        for op in openings:
            x1, y1 = int(op["start"][0] / scale), int(op["start"][1] / scale)
            x2, y2 = int(op["end"][0] / scale), int(op["end"][1] / scale)
            color = (255, 0, 0) if op["type"] == "window" else (255, 0, 255) # Blue for window, Purple for door
            cv2.line(img, (x1, y1), (x2, y2), color, 4)

        return img

    @staticmethod
    def _encode_png(img: np.ndarray) -> bytes:
        _, buf = cv2.imencode(".png", img)
        return buf.tobytes()
