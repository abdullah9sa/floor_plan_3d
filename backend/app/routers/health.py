"""
Health check router
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "plany-api",
        "phase": 1,
        "timestamp": datetime.utcnow().isoformat(),
    }
