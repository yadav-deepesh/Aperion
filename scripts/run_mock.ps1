# Run the Python mock orchestrator that serves both API and frontend.
# Works without Go/Postgres/Rust — uses data/reference/pass_cache.json as DB.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run_mock.ps1

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT
$env:FE_DIR = Join-Path $ROOT "frontend"
$env:PORT = if ($env:PORT) { $env:PORT } else { "8080" }
Write-Host "Starting Aperion mock orchestrator (frontend + API) at http://localhost:$env:PORT/" -ForegroundColor Cyan
Write-Host "  FE_DIR=$env:FE_DIR  PORT=$env:PORT"
python orchestrator/mock_orchestrator.py
