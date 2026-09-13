/**
 * @fileoverview per-pass slide-out: link-budget waterfall + flags (KEYHOLE_RISK etc.)
 */

import { Api } from '../api/client.js';

let currentId = null;
let rootEl = null;

function flagMeta(flag) {
  const F = String(flag).toUpperCase();
  const map = {
    KEYHOLE_RISK: { label: 'KEYHOLE_RISK', tone: 'amber', desc: 'Max el >85° — azimuth rate approaches infinity near zenith' },
    SLEW_GAP:     { label: 'SLEW_GAP', tone: 'amber', desc: 'Gap to next pass shorter than required slew + settle' },
    OVERLAP:      { label: 'OVERLAP', tone: 'red', desc: 'Time overlap on same antenna' },
    CABLE_WRAP:   { label: 'CABLE_WRAP', tone: 'red', desc: 'Azimuth exceeds ±380° cable-wrap limit' },
    UPLINK:       { label: 'UPLINK_SHORT', tone: 'red', desc: 'Uplink window insufficient for required contacts' },
    WRAP:         { label: 'CABLE_WRAP', tone: 'red', desc: 'Azimuth wrap violation' },
    KEYHOLE:      { label: 'KEYHOLE_RISK', tone: 'amber', desc: 'Keyhole risk' },
    SLEW:         { label: 'SLEW_GAP', tone: 'amber', desc: 'Slew gap violation' },
  };
  return map[F] || { label: F, tone: 'amber', desc: '' };
}

/**
 * Open drawer for a pass.
 * @param {HTMLElement} mount - container to append overlay into (e.g. document.body or #app)
 * @param {any} pass - enriched booking/pass
 * @param {{ kaRadius?: number, rain?: number }=} ctx
 */
export async function openDrawer(mount, pass, ctx = {}) {
  closeDrawer();
  currentId = pass.id || pass.pass_id;

  const sat = pass.sat_name || pass.sat || pass.pass_id || 'PASS';
  const tier = pass.tier ?? 2;
  const flags = pass.flags || [];
  const azAos = pass.az_aos ?? pass.aosAz ?? 0;
  const azLos = pass.az_los ?? pass.losAz ?? 0;
  const maxEl = pass.max_el ?? pass.elevMax ?? 0;

  // Build waterfall placeholder; fill after budget fetch
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = 'aperionDrawer';
  overlay.innerHTML = `
    <div class="drawer" role="dialog" aria-modal="true" aria-label="Pass ${sat}">
      <div class="drawer-head">
        <div><h3>${sat}</h3><div class="drawer-sub">T${tier} · ${pass.antenna_id ? 'ANT-' + String(pass.antenna_id).padStart(2,'0') : pass.ant || ''} · ${pass.contract_id || ''}</div></div>
        <button class="drawer-close" id="drawerClose" aria-label="Close">✕</button>
      </div>

      <div class="drawer-grid">
        <div class="drawer-row"><span>AOS → LOS</span><b>${fmtTime(pass.aos)} → ${fmtTime(pass.los)}</b></div>
        <div class="drawer-row"><span>Max elevation</span><b>${Number(maxEl).toFixed(1)}°</b></div>
        <div class="drawer-row"><span>Azimuth AOS → LOS</span><b>${Number(azAos).toFixed(0)}° → ${Number(azLos).toFixed(0)}°</b></div>
        <div class="drawer-row"><span>Slant range</span><b>${pass.slant_km ? Number(pass.slant_km).toFixed(0) + ' km' : '—'}</b></div>
        ${pass.slew_gap_seconds != null ? `<div class="drawer-row"><span>Slew gap</span><b>${Number(pass.slew_gap_seconds).toFixed(1)} s</b></div>` : ''}
        ${pass.mbps != null ? `<div class="drawer-row"><span>Booked rate</span><b>${Number(pass.mbps).toFixed(0)} Mbps · ${pass.modcod || ''}</b></div>` : ''}
      </div>

      <div class="drawer-section">
        <div class="sec-title">Flags</div>
        ${flags.length ? `<div class="flag-row">${flags.map(f=>{ const m=flagMeta(f); return `<span class="flag-chip ${m.tone}" title="${m.desc}">${m.label}</span>`; }).join('')}</div>
          <ul class="flag-list">${flags.map(f=>`<li><b>${flagMeta(f).label}</b> — ${flagMeta(f).desc}</li>`).join('')}</ul>`
          : `<div class="muted">No flags — clean pass.</div>`}
      </div>

      <div class="drawer-section">
        <div class="sec-title">Link-budget waterfall <span class="sec-sub">Go → Rust</span></div>
        <div id="drawerWaterfall" class="waterfall">
          <div class="muted">Loading waterfall…</div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="sec-title">Doppler (illustrative)</div>
        <svg viewBox="0 0 360 60" width="100%" height="60" class="doppler">
          <path d="${dopplerPath(maxEl)}" fill="none" stroke="var(--teal)" stroke-width="1.6"/>
        </svg>
      </div>
    </div>
  `;
  mount.appendChild(overlay);
  rootEl = overlay;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDrawer(); });
  overlay.querySelector('#drawerClose').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', escClose);

  // Fetch waterfall
  const wfEl = overlay.querySelector('#drawerWaterfall');
  try {
    const budget = await fetchBudgetForPass(pass, ctx);
    wfEl.innerHTML = renderWaterfall(budget);
  } catch (e) {
    wfEl.innerHTML = `<div class="muted">Waterfall unavailable — ${String(e.message).slice(0,120)}</div>`;
  }
}

function escClose(e) { if (e.key === 'Escape') closeDrawer(); }

export function closeDrawer() {
  currentId = null;
  if (rootEl) { try { rootEl.remove(); } catch {} rootEl = null; }
  document.removeEventListener('keydown', escClose);
}

function fmtTime(v) {
  if (!v) return '—';
  if (typeof v === 'number') return `${v.toFixed(2)}h`;
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false }) + ' UTC';
}

function dopplerPath(maxEl) {
  const pts = Array.from({length:40}, (_,i)=>{
    const x = i*9;
    const y = 30 + Math.sin(i/3)*16*((maxEl||45)/90);
    return (i===0?'M':'L')+x+' '+y;
  });
  return pts.join(' ');
}

async function fetchBudgetForPass(pass, ctx) {
  // Prefer per-pass geometry if available; else use Shadnagar defaults
  const el = pass.max_el ?? 30;
  const req = {
    pointing_error_deg: 0.1, beamwidth_3db_deg: 1.5,
    transmit_power_dbm: 20, tx_gain_dbi: 40, rx_gain_dbi: 40,
    interference_to_noise_db: 0, system_temperature_k: 290,
    distance_km: pass.slant_km || 500,
    latitude_deg: 17.03, longitude_deg: 78.18,
    frequency_ghz: 26.5, elevation_deg: el, station_height_km: 0.54,
    time_percent: 0.1, rain_rate_r001_mmh: ctx.rain ?? 26,
    rain_polarization_deg: 0, polarization_mismatch_deg: 5,
    antenna_diameter_m: 7.5, symbol_rate_sps: 1e6, bandwidth_hz: 10e6,
  };
  try {
    const r = await Api.fetchLinkBudget(req);
    return r;
  } catch {
    // fallback to local
    return Api.localBudget({ rain: ctx.rain ?? 15, radius: ctx.kaRadius ?? 2.7 });
  }
}

function renderWaterfall(b) {
  const rows = [
    ['FSPL', b.fspl_db], ['Rain', b.rain_db], ['Gas', b.gas_db],
    ['Cloud', b.cloud_db], ['Scintillation', b.scintillation_db],
    ['Pointing', b.pointing_db], ['Polarization', b.polarization_db],
  ];
  const total = b.total_loss_db ?? rows.reduce((s,[,v])=>s+(Number(v)||0), 0);
  return `
    <table class="wf-table">
      <thead><tr><th>Term</th><th>dB</th><th></th></tr></thead>
      <tbody>
        ${rows.map(([k,v])=>`<tr><td>${k}</td><td>${v!=null?Number(v).toFixed(2):'—'}</td><td><span class="wf-bar" style="width:${Math.min(100, Math.abs(Number(v))*4)}%"></span></td></tr>`).join('')}
        <tr class="wf-total"><td>Total loss</td><td>${Number(total).toFixed(2)}</td><td></td></tr>
      </tbody>
    </table>
    <div class="wf-summary">
      <span>Pr <b>${b.received_power_dbm!=null?Number(b.received_power_dbm).toFixed(1)+' dBm':'—'}</b></span>
      <span>C/N₀ <b>${(b.effective_cn0_db_hz ?? b.cn0_db_hz)!=null?Number(b.effective_cn0_db_hz ?? b.cn0_db_hz).toFixed(1)+' dB-Hz':'—'}</b></span>
      <span>MODCOD <b>${b.modcod_name || b.Modcod || '—'}</b></span>
      <span>Rate <b>${b.data_rate_mbps!=null?Number(b.data_rate_mbps).toFixed(0)+' Mbps': b.mbps!=null?Number(b.mbps).toFixed(0)+' Mbps':'—'}</b></span>
    </div>
  `;
}

export const Drawer = { openDrawer, closeDrawer };
export default Drawer;
