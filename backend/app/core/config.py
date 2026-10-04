"""
Application configuration — reads from .env
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Plany"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database (Phase 1: in-memory, Phase 2+: PostgreSQL)
    DATABASE_URL: str = "sqlite:///./plany.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Keys (set in .env)
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # AI Cache Settings
    AI_CACHE_MAX_SIZE: int = 100
    AI_CACHE_TTL_SECONDS: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
