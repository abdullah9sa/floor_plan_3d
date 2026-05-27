"""
AI Commands router
Handles natural language → scene mutation translation.
Phase 1: Rule-based parser. Phase 4: Groq/Gemini integration.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
import re

from app.services.ai_agent import AIAgent
from app.routers.scene import _scenes

router = APIRouter()
agent = AIAgent()


class AICommandRequest(BaseModel):
    prompt: str
    scene_id: str | None = None


class MutationResult(BaseModel):
    type: str
    payload: Dict[str, Any]


class AICommandResponse(BaseModel):
    response: str
    mutations: List[MutationResult]
    confidence: float


@router.post("/command", response_model=AICommandResponse)
async def ai_command(req: AICommandRequest):
    """
    Receive a natural language command and return scene mutations.
    Mutation Pipeline: User Prompt → AI Proposal → (Phase 3) Constraint Validation → Commit
    """
    scene = None
    if req.scene_id and req.scene_id in _scenes:
        scene = _scenes[req.scene_id]

    res = agent.process_command(req.prompt, scene)
    return AICommandResponse(**res)
