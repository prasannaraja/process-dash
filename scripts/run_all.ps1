# Run both Backend (FastAPI) and Frontend (Vite) from the same script
# Run from repository root or scripts folder

# Resolve the directory of the script
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

Write-Host "Starting Backend and Frontend..." -ForegroundColor Green

# ===== Start Backend =====
Write-Host "`nStarting Backend (FastAPI)..." -ForegroundColor Cyan
$apiPath = Join-Path $PROJECT_ROOT "api"
$frontendPath = Join-Path (Join-Path $PROJECT_ROOT "frontend") "beta"

# Check if venv exists, if not show warning
$venvPath = Join-Path $apiPath "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "WARNING: venv not found in api/venv. Make sure dependencies are installed." -ForegroundColor Yellow
}

# Set PYTHONPATH for proper module resolution
$env:PYTHONPATH = $apiPath

# Start backend in a new process
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; `$env:PYTHONPATH='$apiPath'; python -m uvicorn app.main:app --reload --port 8000" -PassThru

Write-Host "Backend started (PID: $($backendJob.Id))" -ForegroundColor Green

# ===== Start Frontend =====
Write-Host "`nStarting Frontend (Vite)..." -ForegroundColor Cyan

# Start frontend in a new process
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -PassThru

Write-Host "Frontend started (PID: $($frontendJob.Id))" -ForegroundColor Green

# ===== Summary =====
Write-Host "`n" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SERVICES RUNNING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each window to stop the services, or close the windows.`n" -ForegroundColor Yellow

# Keep this window alive
Wait-Process -Id $backendJob.Id, $frontendJob.Id
