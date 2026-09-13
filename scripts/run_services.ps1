# Run all Aperion services locally (mock orchestrator + rain_svc + skyfield_svc)
# Each service runs in its own job so you can see logs.
# Requires: python, pip deps from requirements.txt + rain_svc installed.

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT

Write-Host "Installing python deps if missing..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet 2>&1 | Out-Null
pip install itur scipy --quiet 2>&1 | Out-Null

$jobs = @()

Write-Host "Starting skyfield_svc :8001 ..." -ForegroundColor Cyan
$jobs += Start-Job -Name skyfield -ScriptBlock {
    Set-Location $using:ROOT
    $env:PYTHONPATH = $using:ROOT
    python -m uvicorn services.skyfield_svc.main:app --host 0.0.0.0 --port 8001 --reload
}

Write-Host "Starting rain_svc :50053 ..." -ForegroundColor Cyan
$jobs += Start-Job -Name rain -ScriptBlock {
    Set-Location $using:ROOT
    $env:PYTHONPATH = "$using:ROOT;$(Join-Path $using:ROOT 'services/rain_svc/src')"
    python -m uvicorn rain_svc.main:app --host 0.0.0.0 --port 50053 --reload
}

Start-Sleep -Seconds 2

Write-Host "Starting mock orchestrator :8080 (serves frontend + /schedule /live /linkbudget) ..." -ForegroundColor Cyan
$jobs += Start-Job -Name orchestrator -ScriptBlock {
    Set-Location $using:ROOT
    $env:FE_DIR = Join-Path $using:ROOT "frontend"
    $env:PORT = "8080"
    python orchestrator/mock_orchestrator.py
}

Write-Host "`nAll jobs started. Use Receive-Job -Name <name> -Keep to tail logs." -ForegroundColor Green
Write-Host "  Frontend:      http://localhost:8080/"
Write-Host "  Orchestrator:  http://localhost:8080/health"
Write-Host "  Rain svc:      http://localhost:50053/docs"
Write-Host "  Skyfield svc:  http://localhost:8001/docs"
Write-Host "`nPress Ctrl+C then run: Get-Job | Stop-Job; Get-Job | Remove-Job  to stop."

while ($true) {
    Start-Sleep -Seconds 5
    Get-Job | Format-Table Name, State, HasMoreData -AutoSize | Out-String -Width 4000 | Write-Host
}
