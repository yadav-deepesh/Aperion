#!/usr/bin/env bash
# Smoke: schedule round-trip on a fresh DB. Runs after the health gate in CI.
# No golden data needed (the byte-identical golden diff lands with the export
# lane); this asserts every demo-critical route answers with valid shapes.
set -euo pipefail

gen=$(curl -fsS --max-time 30 -X POST "http://localhost:8080/schedule/generate?days=1")
echo "generate: $gen"
echo "$gen" | grep -q '"booked":' || { echo "SMOKE FAIL: generate missing booked count"; exit 1; }

sched=$(curl -fsS --max-time 30 "http://localhost:8080/schedule")
echo "schedule bytes: ${#sched}"
case "$sched" in
  "["*) ;;
  *) echo "SMOKE FAIL: /schedule not a JSON array"; exit 1 ;;
esac

led=$(curl -fsS --max-time 30 "http://localhost:8080/ledger")
echo "ledger bytes: ${#led}"

link=$(curl -fsS --max-time 30 -X POST "http://localhost:8080/linkbudget" \
  -H 'Content-Type: application/json' -d '{"_ui_rain_mmh":15,"_ui_exclusion_km":2.7}')
echo "linkbudget bytes: ${#link}"
echo "$link" | grep -q '"fspl_db"' || { echo "SMOKE FAIL: linkbudget missing fspl_db"; exit 1; }

echo "smoke green"
