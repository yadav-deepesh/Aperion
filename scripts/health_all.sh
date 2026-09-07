#!/usr/bin/env bash
set -euo pipefail
# Priyanka D1: health gate — prints PASS/FAIL per service, retries 60s, exits nonzero on failure
# Hits compose services via localhost ports (8080, 50051, 50052, 50053, 3000)

SERVICES=(
  "orchestrator:8080/health"
  "engine:50051/health"
  "skyfield_svc:50052/health"
  "rain_svc:50053/health"
  "frontend:3000/"
)

# Map service names to ports for local check
declare -A PORTS=(
  ["orchestrator"]="8080"
  ["engine"]="50051"
  ["skyfield_svc"]="50052"
  ["rain_svc"]="50053"
  ["frontend"]="3000"
)

MAX_WAIT=60
INTERVAL=2
elapsed=0
all_pass=false

check_once() {
  local ok=0 fail=0
  for svc in "${!PORTS[@]}"; do
    port=${PORTS[$svc]}
    path="health"
    [[ "$svc" == "frontend" ]] && path=""
    url="http://localhost:${port}/${path}"
    # engine stub may respond on / rather than /health
    if curl -fs --max-time 2 "$url" >/dev/null 2>&1; then
      echo "PASS $svc ($url)"
      ok=$((ok+1))
    else
      # fallback for engine
      if [[ "$svc" == "engine" ]] && curl -fs --max-time 2 "http://localhost:${port}/" >/dev/null 2>&1; then
        echo "PASS $svc (fallback /)"
        ok=$((ok+1))
      else
        echo "FAIL $svc ($url)"
        fail=$((fail+1))
      fi
    fi
  done
  if [[ $fail -eq 0 ]]; then return 0; else return 1; fi
}

echo "health_all: waiting up to ${MAX_WAIT}s for 5 services..."
while [[ $elapsed -lt $MAX_WAIT ]]; do
  if check_once; then
    echo "All services PASS"
    exit 0
  fi
  sleep $INTERVAL
  elapsed=$((elapsed+INTERVAL))
  echo "--- retry ${elapsed}s ---"
done

echo "health_all: FAIL after ${MAX_WAIT}s"
# also show compose ps for debugging
docker compose -f deploy/docker-compose.yml ps || true
exit 1
