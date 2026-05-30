#!/bin/bash
# Launch Plany Backend and Frontend Dev Servers in parallel

echo -e "\033[0;36m🚀 Starting Plany Project...\033[0m"

# Trap SIGINT (Ctrl+C) to terminate all spawned background processes on exit
trap "kill 0" EXIT

# 1. Start Backend FastAPI Server
if [ -d "backend/venv" ]; then
    echo -e "\033[0;32m🐍 Starting Backend (FastAPI)...\033[0m"
    # Detect appropriate venv activation script path
    if [ -f "backend/venv/Scripts/activate" ]; then
        source backend/venv/Scripts/activate
    else
        source backend/venv/bin/activate
    fi
    (cd backend && python -m uvicorn main:app --reload --port 8000) &
else
    echo -e "\033[0;33m⚠️ Warning: backend/venv not found. Please set up the backend virtual environment first.\033[0m"
fi

# 2. Start Frontend Vite Dev Server
if [ -f "frontend/package.json" ]; then
    echo -e "\033[0;34m⚛️ Starting Frontend (Vite)...\033[0m"
    (cd frontend && npm run dev) &
else
    echo -e "\033[0;33m⚠️ Warning: frontend/package.json not found.\033[0m"
fi

# Wait for all background tasks to finish
wait
