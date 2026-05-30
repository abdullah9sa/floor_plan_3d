# run.ps1
# Launch Plany Backend and Frontend Dev Servers in separate windows

Write-Host "🚀 Starting Plany Project..." -ForegroundColor Cyan

# 1. Launch Backend FastAPI Server
if (Test-Path "backend\venv") {
    Write-Host "🐍 Launching Backend (FastAPI) on Port 8000 in a new window..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Plany FastAPI Backend...' -ForegroundColor Green; cd backend; .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000" -WindowStyle Normal
} else {
    Write-Warning "Backend virtual environment 'backend\venv' not found. Please set up the backend venv first."
}

# 2. Launch Frontend Vite Dev Server
if (Test-Path "frontend\package.json") {
    Write-Host "⚛️ Launching Frontend (Vite) in a new window..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Plany Vite Frontend...' -ForegroundColor Blue; cd frontend; npm run dev" -WindowStyle Normal
} else {
    Write-Warning "Frontend 'frontend\package.json' not found."
}

Write-Host "✨ Both servers have been launched in separate windows!" -ForegroundColor Yellow
