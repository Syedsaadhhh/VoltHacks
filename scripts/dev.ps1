# CutHush Local Development Launcher (PowerShell / Windows)
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CutHush - Two-Device Physical Loop Dev Runner   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Start Backend
Write-Host "[1/2] Starting CutHush FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$BackendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot/..
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
}

# Wait for backend
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "[2/2] Starting CutHush Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location "$PSScriptRoot/../frontend"
npm run dev

# Cleanup background job when frontend stops
Stop-Job $BackendJob -ErrorAction SilentlyContinue
Remove-Job $BackendJob -ErrorAction SilentlyContinue