/**
 * @fileoverview REST + WS client — single place for all network I/O.
 * Covers GET /schedule, GET /ledger, GET /passes, POST /schedule/generate,
 * POST /inject-emergency and WS /live. Ka link-budget path is POST /linkbudget
 * which the Go orchestrator proxies to the Rust engine (engine:50051).
 * Falls back to local compute when the proxy is not yet deployed.
 */

/** @type {string} */
const BASE = (typeof window !== 'undefined' && window.__APERION_API__)
  ? String(window.__APERION_API__).replace(/\/$/, '')
  : '';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function fetchJSON(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: JSON_HEADERS,
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  // 204 or empty
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

/**
 * GET /schedule?start=&end= — enriched bookings for the window.
 * @param {{start?: string, end?: string}} [q]
 * @returns {Promise<import('../types.js').BookingRow[]>}
 */
export async function fetchSchedule(q = {}) {
  const p = new URLSearchParams();
  if (q.start) p.set('start', q.start);
  if (q.end) p.set('end', q.end);
  const qs = p.toString() ? `?${p}` : '';
  return fetchJSON(`/schedule${qs}`);
}

/**
 * GET /passes?start=&end= — raw visibility windows.
 */
export async function fetchPasses(q = {}) {
  const p = new URLSearchParams();
  if (q.start) p.set('start', q.start);
  if (q.end) p.set('end', q.end);
  const qs = p.toString() ? `?${p}` : '';
  return fetchJSON(`/passes${qs}`);
}

/**
 * GET /ledger?week=YYYY-MM-DD — weekly SLA accounting.
 * @param {string} [week] Monday string
 */
export async function fetchLedger(week) {
  const qs = week ? `?week=${encodeURIComponent(week)}` : '';
  return fetchJSON(`/ledger${qs}`);
}

/**
 * POST /schedule/generate
 */
export async function generateSchedule() {
  return fetchJSON('/schedule/generate', { method: 'POST' });
}

/**
 * POST /inject-emergency { tier:1, ... }
 */
export async function injectEmergency(payload) {
  return fetchJSON('/inject-emergency', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /linkbudget via Go proxy to Rust engine.
 * If the endpoint is not yet deployed (404), caller should fall back to localBudget().
 * @param {import('../types.js').BudgetRequest} req
 * @returns {Promise<import('../types.js').BudgetResponse>}
 */
export async function fetchLinkBudget(req) {
  // Try canonical proxy path first, then legacy.
  const paths = ['/linkbudget', '/api/linkbudget', '/compute'];
  let lastErr;
  for (const path of paths) {
    try {
      return await fetchJSON(path, { method: 'POST', body: JSON.stringify(req) });
    } catch (e) {
      lastErr = e;
      // only fall through on 404; surface other errors
      if (!String(e.message).includes('404')) throw e;
    }
  }
  throw lastErr;
}

/**
 * Local simplified budget — mirrors the demo model in the old console
 * until the Rust proxy is available. Used as fallback for kaPanel.
 * @param {{ rain: number, radius: number }} p
 */
export function localBudget({ rain, radius }) {
  const MODCOD = [
    { name: '32APSK 9/10', minCN0: 16, rate: 620 },
    { name: '16APSK 8/9',  minCN0: 13, rate: 480 },
    { name: '8PSK 3/4',    minCN0: 10, rate: 360 },
    { name: 'QPSK 3/4',    minCN0: 7,  rate: 220 },
    { name: 'QPSK 1/2',    minCN0: 4,  rate: 140 },
    { name: 'No Lock',     minCN0: -999, rate: 0 },
  ];
  const BASE_CN0 = 18;
  const rainAtten = Math.min(12, 0.06 * rain);
  const shrink = Math.max(0, 2.7 - radius);
  const interference = Math.min(4, (shrink / 1.7) * 4);
  const cn0 = BASE_CN0 - rainAtten - interference;
  const modcod = MODCOD.find((m) => cn0 >= m.minCN0) || MODCOD[MODCOD.length - 1];
  return {
    fspl_db: 210.0, rain_db: rainAtten, gas_db: 0.6, cloud_db: 0.3,
    scintillation_db: 0.4, pointing_db: 0.2, polarization_db: 0.1,
    total_loss_db: 211.6 + rainAtten + interference,
    received_power_dbm: -95 + cn0 - BASE_CN0,
    noise_density_dbm_hz: -174,
    cn0_db_hz: cn0 + 60, effective_cn0_db_hz: cn0 + 60,
    modcod_name: modcod.name, spectral_efficiency: modcod.rate / 200,
    data_rate_mbps: modcod.rate, margin_db: cn0 - modcod.minCN0,
    _local: true, _rainAtten: rainAtten, _interference: interference, _cn0: cn0, _modcod: modcod,
  };
}

/**
 * Connect to WS /live. Returns a handle with close().
 * @param {{ onEvent: (e: import('../types.js').LiveEvent)=>void, onOpen?: ()=>void, onClose?: ()=>void }} handlers
 */
export function connectLive({ onEvent, onOpen, onClose }) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = BASE || `${proto}//${location.host}`;
  // BASE may be empty or absolute; derive ws url.
  let wsUrl;
  if (BASE.startsWith('http')) {
    wsUrl = BASE.replace(/^http/, 'ws') + '/live';
  } else if (BASE) {
    wsUrl = `${proto}//${location.host}${BASE}/live`;
  } else {
    wsUrl = `${proto}//${location.host}/live`;
  }

  let ws;
  let closed = false;
  let retryMs = 1500;
  let timer = null;

  function open() {
    if (closed) return;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      scheduleRetry();
      return;
    }
    ws.onopen = () => {
      retryMs = 1500;
      if (onOpen) onOpen();
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onEvent(data);
      } catch (e) {
        onEvent({ type: 'raw', payload: ev.data });
      }
    };
    ws.onclose = () => {
      if (onClose) onClose();
      if (!closed) scheduleRetry();
    };
    ws.onerror = () => {
      try { ws.close(); } catch {}
    };
  }

  function scheduleRetry() {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(open, retryMs);
    retryMs = Math.min(retryMs * 1.7, 15000);
  }

  open();

  return {
    close() {
      closed = true;
      clearTimeout(timer);
      try { ws && ws.close(); } catch {}
    },
    get url() { return wsUrl; },
  };
}

export const Api = {
  fetchSchedule, fetchPasses, fetchLedger, generateSchedule,
  injectEmergency, fetchLinkBudget, localBudget, connectLive,
};
export default Api;
