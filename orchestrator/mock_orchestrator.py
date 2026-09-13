"""
Mock orchestrator — Python fallback for Windows when Go/Postgres are unavailable.
Serves the exact same REST + WS contract as orchestrator/internal/api,
plus static frontend at /.  Uses data/reference/pass_cache.json as source,
so `GET /schedule` works without DB.  Run:  python orchestrator/mock_orchestrator.py
"""

import asyncio
import json
import math
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

ROOT = Path(__file__).resolve().parents[1]
FE_DIR = Path(os.getenv("FE_DIR", ROOT / "frontend"))
CACHE_PATH = ROOT / "data" / "reference" / "pass_cache.json"

app = FastAPI(title="Aperion Mock Orchestrator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- in-memory state (mirrors Go Store) ----
bookings_cache = []  # populated on /schedule/generate
ledger_by_week = {}  # week_start -> rows

# simple hub for WS /live
class Hub:
    def __init__(self):
        self.clients: set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def broadcast(self, typ: str, payload):
        msg = json.dumps({"type": typ, "payload": payload})
        async with self.lock:
            dead = []
            for ws in list(self.clients):
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.append(ws)
            for d in dead:
                self.clients.discard(d)

hub = Hub()

def _load_cache():
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"satellites": {}, "generated_at": datetime.now(timezone.utc).isoformat()}

def _parse_time(v: str | None):
    if not v:
        return None
    try:
        # handle Z
        s = v.replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except Exception:
        return None

@app.get("/health")
def health():
    return {"status": "ok", "service": "mock-orchestrator", "version": "0.1.0", "db": "cache"}

@app.get("/passes")
def list_passes(start: str | None = Query(default=None), end: str | None = Query(default=None)):
    now = datetime.now(timezone.utc)
    s = _parse_time(start) or now
    e = _parse_time(end) or (now + timedelta(days=7))
    cache = _load_cache()
    out = []
    for norad, passes in cache.get("satellites", {}).items():
        for p in passes:
            aos = _parse_time(p["aos"])
            los = _parse_time(p["los"])
            if aos is None or los is None:
                continue
            if los > s and aos < e:
                # enrich with tier/contract mock — tier cycles 1..3
                tier = (int(norad) % 3) + 1
                if tier == 1:
                    tier = 3  # keep T1 rare
                out.append({
                    "id": f"{norad}-{p['aos']}",
                    "norad_id": int(norad),
                    "sat_name": f"SAT-{norad}",
                    "aos": p["aos"],
                    "los": p["los"],
                    "max_el": p.get("max_el", 45),
                    "az_aos": p.get("az_aos", 0),
                    "az_los": p.get("az_los", 180),
                    "el_aos": p.get("el_aos", 10),
                    "el_los": p.get("el_los", 10),
                    "slant_km": 550,
                    "tier": tier,
                    "contract_id": "pixxel-1" if tier == 2 else ("isro-1" if tier == 1 else "academic-1"),
                    "needs_uplink": bool(p.get("ul_insufficient") is False),
                    "flags": ["KEYHOLE_RISK"] if p.get("max_el", 0) > 85 else [],
                })
    out.sort(key=lambda x: x["aos"])
    return out[:500]  # cap for browser

@app.get("/schedule")
def get_schedule(start: str | None = Query(default=None), end: str | None = Query(default=None)):
    # if we have a generated schedule, filter it; otherwise synthesize thin schedule
    global bookings_cache
    if bookings_cache:
        s = _parse_time(start)
        e = _parse_time(end)
        def _in(p):
            aos = _parse_time(p["aos"])
            los = _parse_time(p["los"])
            if s and los and s > los:
                return False
            if e and aos and aos > e:
                return False
            return True
        return [b for b in bookings_cache if _in(b)]
    # fallback: take first 20 passes and assign antennas round-robin
    cache = _load_cache()
    passes = []
    for norad, lst in cache.get("satellites", {}).items():
        for p in lst[:4]:
            passes.append({"norad": norad, **p})
        if len(passes) >= 20:
            break
    passes.sort(key=lambda x: x["aos"])
    out = []
    for i, p in enumerate(passes):
        ant = (i % 2) + 1
        out.append({
            "id": i+1,
            "pass_id": f"{p['norad']}-{p['aos']}",
            "antenna_id": ant,
            "aos": p["aos"],
            "los": p["los"],
            "slew_gap_seconds": 42.0 if i else 0,
            "preempted_by": None,
            "mbps": 360 if i % 3 else 220,
            "modcod": "8PSK 3/4",
            "margin_db": 2.1,
            "flags": [],
        })
    return out

@app.post("/schedule/generate")
async def generate_schedule():
    global bookings_cache
    # simple greedy: take /passes and assign to least-loaded antenna respecting slew 42s
    rows = list_passes()
    # keep first 30
    rows = rows[:30]
    # sort T1 first
    rows.sort(key=lambda r: (r["tier"], r["aos"]))
    ants = {1: [], 2: []}

    def slew_ok(prev, cur):
        if prev is None:
            return True
        # 20deg/s az
        d = abs(cur["az_aos"] - prev["az_los"]) % 360
        d = min(d, 360 - d)
        need = d / 20 + 1.0
        prev_los = _parse_time(prev["los"])
        cur_aos = _parse_time(cur["aos"])
        gap = (cur_aos - prev_los).total_seconds() if prev_los and cur_aos else 999
        return gap >= need

    booked = []
    bid = 1
    for r in rows:
        placed = False
        for aid in (1, 2):
            last = ants[aid][-1] if ants[aid] else None
            # also check no overlap
            last_los = _parse_time(last["los"]) if last else None
            cur_aos = _parse_time(r["aos"])
            overlap = last_los and cur_aos and cur_aos < last_los
            if not overlap and slew_ok(last, r):
                ants[aid].append(r)
                booked.append({
                    "id": bid, "pass_id": r["id"], "antenna_id": aid,
                    "aos": r["aos"], "los": r["los"], "slew_gap_seconds": 1.0 if last else 0,
                    "preempted_by": None, "mbps": 360, "modcod": "8PSK 3/4", "margin_db": 1.5,
                    "flags": r["flags"],
                })
                bid += 1
                placed = True
                break
        if not placed:
            # mark as unscheduled (preempted)
            booked.append({
                "id": bid, "pass_id": r["id"], "antenna_id": 0,
                "aos": r["aos"], "los": r["los"], "slew_gap_seconds": 0,
                "preempted_by": "T1",
                "mbps": None, "modcod": None, "margin_db": None,
                "flags": ["OVERLAP"],
            })
            bid += 1
    bookings_cache = booked
    await hub.broadcast("booking.created", {"booked": len([b for b in booked if b["antenna_id"] != 0])})
    return {"booked": len([b for b in booked if b["antenna_id"] != 0]), "rejected": len(booked) - len([b for b in booked if b["antenna_id"] != 0])}

@app.get("/ledger")
def get_ledger(week: str | None = Query(default=None)):
    now = datetime.now(timezone.utc)
    if week:
        try:
            ws = datetime.fromisoformat(week.replace("Z", "+00:00"))
        except Exception:
            ws = now
    else:
        ws = now
    # align to Monday
    while ws.weekday() != 0:
        ws -= timedelta(days=1)
    key = ws.date().isoformat()
    if key not in ledger_by_week:
        ledger_by_week[key] = [
            {"contract_id": "isro-1", "week_start": key, "passes_booked": 18, "passes_completed": 18, "passes_missed": 0, "passes_preempted": 0, "preemption_count": 0, "credits_owed": 0, "revenue": 0},
            {"contract_id": "pixxel-1", "week_start": key, "passes_booked": 21, "passes_completed": 19, "passes_preempted": 2, "preemption_count": 2, "credits_owed": 40000, "revenue": 945000},
            {"contract_id": "academic-1", "week_start": key, "passes_booked": 9, "passes_completed": 7, "passes_missed": 1, "passes_preempted": 1, "preemption_count": 1, "credits_owed": 8000, "revenue": 72000},
        ]
    return ledger_by_week[key]

@app.post("/inject-emergency")
async def inject_emergency(payload: dict):
    # naive: just broadcast and pretend preemption
    await hub.broadcast("booking.preempted", {"booked": payload.get("sat_name", "EMG"), "preempted": "SAT-25397"})
    return {"booked": payload.get("sat_name", "EMG"), "preempted": "SAT-25397", "antenna": 1}

@app.post("/linkbudget")
@app.post("/api/linkbudget")
@app.post("/compute")
def linkbudget(payload: dict):
    # local replica of Go computeLinkBudgetLocal
    freq = float(payload.get("frequency_ghz") or 26.5)
    dist = float(payload.get("distance_km") or 550)
    rain = float(payload.get("_ui_rain_mmh") or payload.get("rain_rate_r001_mmh") or 15)
    excl = float(payload.get("_ui_exclusion_km") or 2.7)
    interf = float(payload.get("interference_to_noise_db") or max(0, (2.7 - excl) / 1.7 * 4))
    elev = float(payload.get("elevation_deg") or 30)
    tx = float(payload.get("transmit_power_dbm") or 20)
    txg = float(payload.get("tx_gain_dbi") or 40)
    rxg = float(payload.get("rx_gain_dbi") or 40)
    bw = float(payload.get("bandwidth_hz") or 1e7)
    sr = float(payload.get("symbol_rate_sps") or 1e6)
    tsys = float(payload.get("system_temperature_k") or 290)

    rain_db = min(12, 0.06 * rain + 0.3)
    fspl = 92.45 + 20 * math.log10(freq) + 20 * math.log10(dist)
    gas = 1.2 if elev < 15 else 0.6
    cloud, scint, pointing, pol = 0.3, 0.35, 0.2, 0.1
    total = fspl + rain_db + gas + cloud + scint + pointing + pol + interf * 0.2
    pr = tx + txg + rxg - total
    noise_dbw = -228.6 + 10 * math.log10(tsys)
    noise_dbm = noise_dbw + 30
    cn0 = pr - noise_dbm
    eff = cn0 - interf
    esn0 = eff - 10 * math.log10(sr)
    table = [
        ("32APSK 9/10", 16, 4.45),
        ("16APSK 8/9", 13, 3.5),
        ("8PSK 3/4", 10, 2.2),
        ("QPSK 3/4", 7, 1.45),
        ("QPSK 1/2", 4, 0.99),
    ]
    chosen = None
    for name, thr, se in table:
        if esn0 >= thr:
            chosen = (name, se, thr)
            break
    if chosen:
        name, se, thr = chosen
        mbps = se * bw / 1e6
        margin = eff - (thr + 10 * math.log10(sr))
    else:
        name, se, mbps, margin = "No Lock", 0.0, 0.0, eff - 999
    return {
        "fspl_db": fspl, "rain_db": rain_db, "gas_db": gas, "cloud_db": cloud,
        "scintillation_db": scint, "pointing_db": pointing, "polarization_db": pol,
        "total_loss_db": total, "received_power_dbm": pr, "noise_density_dbm_hz": noise_dbm,
        "cn0_db_hz": cn0, "effective_cn0_db_hz": eff,
        "modcod_name": name, "spectral_efficiency": se, "data_rate_mbps": mbps, "margin_db": margin,
        "modcod": name, "mbps": mbps, "a_rain_db": rain_db, "a_gas_db": gas,
    }

@app.websocket("/live")
async def live(ws: WebSocket):
    await ws.accept()
    hub.clients.add(ws)
    try:
        while True:
            # keepalive + echo client pings
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.clients.discard(ws)

# ---- static frontend (must be last) ----
if FE_DIR.exists():
    # mount /css and /js as static, and / as FileResponse fallback
    if (FE_DIR / "css").exists():
        app.mount("/css", StaticFiles(directory=str(FE_DIR / "css")), name="fe-css")
    if (FE_DIR / "js").exists():
        app.mount("/js", StaticFiles(directory=str(FE_DIR / "js")), name="fe-js")
    # also mount src legacy for /src/* if someone hits old path
    if (FE_DIR / "src").exists():
        app.mount("/src", StaticFiles(directory=str(FE_DIR / "src")), name="fe-src")

    @app.get("/")
    def serve_root():
        idx = FE_DIR / "index.html"
        if idx.exists():
            return FileResponse(str(idx))
        return JSONResponse({"detail": "frontend not built"}, status_code=404)

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        # don't shadow api
        if full_path.startswith(("health", "passes", "schedule", "ledger", "inject", "live", "linkbudget", "api/", "compute", "css/", "js/", "src/")):
            return JSONResponse({"detail": "not found"}, status_code=404)
        cand = FE_DIR / full_path
        if cand.is_file():
            return FileResponse(str(cand))
        idx = FE_DIR / "index.html"
        if idx.exists():
            return FileResponse(str(idx))
        return JSONResponse({"detail": "not found"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    print(f"Mock orchestrator serving frontend at {FE_DIR} -> http://localhost:{port}/")
    print(f"  GET  /schedule  (cache {CACHE_PATH})")
    print(f"  WS   /live")
    print(f"  POST /linkbudget  (local compute, same as Go proxy)")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
