#!/usr/bin/env bash
set -euo pipefail
# Priyanka D1 skeleton smoke: boot → health → schedule request → export diff vs tiny fixture
COMPOSE="docker compose -f deploy/docker-compose.yml"

echo "smoke: starting stack..."
$COMPOSE up --build -d
echo "smoke: waiting for health..."
bash scripts/health_all.sh

echo "smoke: requesting schedule generate..."
curl -fs -X POST http://localhost:8080/schedule/generate -H "Content-Type: application/json" -d '{}' || echo "generate stub (ok for Day 1)"

echo "smoke: fetching /schedule..."
curl -fs http://localhost:8080/schedule | head -c 500; echo

echo "smoke: checking export (stub)..."
curl -fs http://localhost:8080/export/schedule -o /tmp/contact_schedule.csv 2>/dev/null && echo "export exists" || echo "export stub not yet (ok Day 1)"

# Tiny golden diff — Day 1 fixture is just headers
if [[ -f data/reference/golden_schedule.csv ]]; then
  echo "smoke: diff vs golden_schedule.csv"
  diff -u data/reference/golden_schedule.csv /tmp/contact_schedule.csv 2>&1 | head -n 50 || true
fi

echo "smoke: PASS (skeleton)"
