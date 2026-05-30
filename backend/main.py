"""
FastAPI Backend — Phase 2 Vision Reconstruction
Entry point for the AI-Powered 2D-to-3D Real Estate Platform
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.routers import scene, ai_commands, health, vision, textures
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Plany backend starting — Phase 2 Vision Reconstruction")
    yield
    logger.info("🛑 Plany backend shutting down")


app = FastAPI(
    title="Plany API",
    description="AI-Powered 2D-to-3D Interactive Real Estate Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(scene.router, prefix="/api/scene", tags=["Scene Graph"])
app.include_router(ai_commands.router, prefix="/api/ai", tags=["AI Commands"])
app.include_router(vision.router, prefix="/api/vision", tags=["Vision"])
app.include_router(textures.router, prefix="/api/textures", tags=["Textures"])
