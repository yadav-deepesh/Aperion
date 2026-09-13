#!/usr/bin/env bash
# Health gate for the whole stack. Used by `make health` and (later) CI.
# Exits non-zero on the first unhealthy service.
set -euo pipefail

check() { # name url
  if curl -fsS --max-time 5 "$2" | grep -q '"status":"ok"'; then
    echo "ok   $1"
  else
    echo "FAIL $1 ($2)"
    exit 1
  fi
}

check orchestrator http://localhost:8080/health
check skyfield     http://localhost:50052/health
check rain         http://localhost:50053/health

if curl -fsS --max-time 5 http://localhost:8081/ | grep -q gsRoot; then
  echo "ok   frontend"
else
  echo "FAIL frontend (http://localhost:8081/)"
  exit 1
fi
echo "all services healthy"
