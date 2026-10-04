"""
AI Commands router
Handles natural language → scene mutation translation.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

from app.services.ai_agent import AIAgent

router = APIRouter()
agent = AIAgent()


class AICommandRequest(BaseModel):
    prompt: str
    model: str = "gemini-1.5-pro-latest"
    scene_id: str | None = None
    scene_snapshot: Dict[str, Any] | None = None
    selected_object_id: str | None = None


class MutationResult(BaseModel):
    type: str
    payload: Dict[str, Any]


class AICommandResponse(BaseModel):
    response: str
    mutations: List[MutationResult]
    confidence: float
    cached: bool = False
    model_used: str = ""


@router.post("/command", response_model=AICommandResponse)
async def ai_command(req: AICommandRequest):
    """
    Receive a natural language command and return scene mutations.
    Mutation Pipeline: User Prompt → AI Proposal → Constraint Validation → Commit
    """
    res = agent.process_command(
        prompt=req.prompt,
        model=req.model,
        scene_snapshot=req.scene_snapshot,
        selected_object_id=req.selected_object_id
    )
    return AICommandResponse(**res)

@router.get("/models")
async def get_models():
    """Returns available models and their configuration status."""
    return {
        "gemini_configured": bool(agent.gemini_key),
        "groq_configured": bool(agent.groq_key)
    }
