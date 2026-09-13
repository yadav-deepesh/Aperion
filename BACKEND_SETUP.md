# Backend Setup — how the restructured frontend connects

## Quick start (Windows, no Go/Postgres needed)

The new frontend at `frontend/index.html` + `js/api/client.js` talks to
`GET /schedule`, `GET /ledger`, `POST /linkbudget` and `WS /live` all
in one place (`frontend/js/api/client.js:1`).  A Python mock orchestrator
is provided so you can run the full console without installing Go/Rust/Postgres:

```powershell
# 1) install python deps (once)
pip install -r requirements.txt
pip install itur scipy httpx

# 2) run the mock (serves frontend + API at same origin — no CORS needed)
powershell -ExecutionPolicy Bypass -File scripts/run_mock.ps1
# → http://localhost:8080/   (map top, Gantt middle, Ka panel + ledger sidebar)
#   http://localhost:8080/health
#   http://localhost:8080/schedule
#   ws://localhost:8080/live
```

For rain/skyfield dev, run all three services:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run_services.ps1
```

## Full stack (Go orchestrator + Postgres + Rust engine)

When you want the real Go orchestrator (caches, Postgres, preemption logic)
instead of the mock:

```powershell
# Install Go 1.26 (winget will resume the download started on Sep 13)
winget install GoLang.Go --silent --accept-package-agreements --accept-source-agreements
# then reopen terminal so `go` is on PATH

# Postgres 15+ — easiest via Docker (once Docker Desktop is installed):
docker run --name aperion-pg -e POSTGRES_USER=aperion -e POSTGRES_PASSWORD=localdev `
  -e POSTGRES_DB=aperion -p 5432:5432 -d postgres:16

# Go deps + build
cd orchestrator
go mod download
go run ./cmd/server          # listens :8080, serves frontend/ statically, CORS enabled
# env overrides:
$env:DATABASE_URL="postgres://aperion:localdev@localhost:5432/aperion?sslmode=disable"
$env:PORT="8080"
$env:FE_DIR="../frontend"
$env:ENGINE_ADDR="engine:50051"   # Rust gRPC (optional)
```

### What was patched to connect frontend↔backend

* `orchestrator/internal/api/cors.go` — `corsMiddleware` allows the Vite mock and
  same-origin frontend to call the API (`Access-Control-Allow-*`).
* `orchestrator/internal/api/linkbudget.go` — new `POST /linkbudget` (`/api/linkbudget`, `/compute` aliases)
  proxies Ka rain (0–100 mm/h) + exclusion (0.3–2.7 km) sliders to the Rust `engine`
  (`orchestrator/internal/clients/engine.go:1`).  If `ENGINE_ADDR` is unreachable,
  it falls back to the same local model as `frontend/js/api/client.js:110 localBudget`
  so `js/modules/kaPanel.js:1` never blocks (debounced 150 ms).
* `orchestrator/internal/api/router.go` — registers CORS, the linkbudget aliases,
  and optional static serving: if `FE_DIR` or `frontend/index.html` exists, `GET /`
  serves the new layout shell (`map top / Gantt middle / Ka panel + ledger sidebar`).
* `orchestrator/cmd/server/main.go` — fallback mux (when Postgres is down) now also
  serves `/linkbudget` and CORS, and the full `NewRouter` path serves frontend
  statically so the console works even without DB (graceful demo).

### Python services

```powershell
# rain_svc — ITU-R P.618 rain attenuation (proxied via /linkbudget when Go is up,
# otherwise frontend localBudget covers it)
$env:PYTHONPATH="services/rain_svc/src;$PWD"
python -m uvicorn rain_svc.main:app --port 50053 --reload

# skyfield_svc — TLE → pass windows (warm cache lives at data/reference/pass_cache.json)
$env:PYTHONPATH="$PWD"
python -m uvicorn services.skyfield_svc.main:app --port 8001 --reload
```

Both are optional for the mock; the mock reads `data/reference/pass_cache.json`
directly.

### Frontend contract (frozen shapes live in `frontend/js/types.js`)

The new shell expects `frontend/js/types.js:1` shapes:
`GET /schedule` → `BookingRow[]`, `GET /passes` → `Pass[]`, `GET /ledger` → `LedgerRow[]`,
`POST /linkbudget` → `BudgetResponse`, `WS /live` → `{type,payload}`.
`frontend/js/api/client.js` centralises all fetch + WS reconnection.

### Legacy frontend

`frontend/src/gsaas-console-app.js` + `frontend/src/index.html` are untouched
and remain runnable at `src/index.html` for comparison.  The new shell at
`frontend/index.html` is the canonical layout per the spec image.

### Verify

```powershell
# lint + unit
pip install pytest httpx
pytest -q

# smoke (mock)
python orchestrator/mock_orchestrator.py &
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/schedule | Select-Object -First 3
```
