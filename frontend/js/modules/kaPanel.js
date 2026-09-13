/**
 * @fileoverview two sliders (Ka radius 0.3–2.7 km, rain 0–100 mm/h),
 * debounced 150 ms, live-wired via Go proxy to Rust.
 */

import { Api } from '../api/client.js';

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Initialise Ka panel controls.
 * @param {HTMLElement} container
 * @param {{ initialRadius?: number, initialRain?: number, onBudget?: (res:any)=>void }=} opts
 * @returns {{ getValues: ()=>{radius:number, rain:number}, destroy: ()=>void }}
 */
export function initKaPanel(container, opts = {}) {
  const radiusInit = opts.initialRadius ?? 2.7;
  const rainInit = opts.initialRain ?? 15;

  container.innerHTML = `
    <div class="ka-panel">
      <div class="panel-head"><span class="ph-title">Ka-band & Weather</span><span class="ph-sub">via Go → Rust</span></div>
      <div class="ka-slider">
        <label><span>Ka exclusion radius</span><b id="kaRadiusVal">${radiusInit.toFixed(1)} km</b></label>
        <input type="range" id="kaRadius" min="0.3" max="2.7" step="0.1" value="${radiusInit}" />
        <div class="ka-hint">DoT 2.7 km nominal · slide to simulate 5G encroachment</div>
      </div>
      <div class="ka-slider">
        <label><span>Rain rate</span><b id="kaRainVal">${rainInit} mm/h</b></label>
        <input type="range" id="kaRain" min="0" max="100" step="1" value="${rainInit}" />
        <div class="ka-hint">0 clear · 100 monsoon extreme (R0.01 Hyderabad ≈ 26 mm/h)</div>
      </div>
      <div class="ka-readouts">
        <div class="ka-read"><span class="k">Rain atten.</span><b class="v" id="kaRainAtten">—</b></div>
        <div class="ka-read"><span class="k">Interference</span><b class="v" id="kaInterf">—</b></div>
        <div class="ka-read"><span class="k">C/N₀</span><b class="v" id="kaCn0">—</b></div>
        <div class="ka-read"><span class="k">Data rate</span><b class="v" id="kaRate">—</b></div>
      </div>
      <div class="ka-modcod" id="kaModcod">MODCOD: —</div>
      <div class="ka-curve" id="kaCurve"></div>
      <div class="ka-status" id="kaStatus">live · debounced 150 ms</div>
    </div>
  `;

  const radiusEl = container.querySelector('#kaRadius');
  const rainEl = container.querySelector('#kaRain');
  const statusEl = container.querySelector('#kaStatus');

  let current = { radius: radiusInit, rain: rainInit };

  function renderBudget(res) {
    // Support both Rust shape and local shape
    const rainAtten = res.rain_db ?? res._rainAtten ?? 0;
    const interf = res.interference ?? res._interference ?? res.I5gDbm ?? 0;
    const cn0 = res.effective_cn0_db_hz ?? res.cn0_db_hz ?? res._cn0 ?? 0;
    const rate = res.data_rate_mbps ?? res.mbps ?? res._modcod?.rate ?? 0;
    const modcod = res.modcod_name ?? res.Modcod ?? res._modcod?.name ?? '—';
    container.querySelector('#kaRainAtten').textContent = `${Number(rainAtten).toFixed(1)} dB`;
    container.querySelector('#kaInterf').textContent = `${Number(interf).toFixed(1)} dB`;
    container.querySelector('#kaCn0').textContent = `${Number(cn0).toFixed(1)} dB-Hz`;
    container.querySelector('#kaRate').textContent = `${Number(rate).toFixed(0)} Mbps`;
    container.querySelector('#kaModcod').textContent = `MODCOD: ${modcod}`;
    if (res._local) statusEl.textContent = 'local model (proxy unavailable)';
    else statusEl.textContent = 'Rust engine · via Go proxy';
    drawCurve(current.radius, current.rain);
    if (opts.onBudget) opts.onBudget(res);
    // Notify map if needed
    window.dispatchEvent(new CustomEvent('aperion:kaChange', { detail: { ...current, budget: res } }));
  }

  async function fetchAndRender() {
    statusEl.textContent = 'querying Rust…';
    // Build a minimal ComputeBudget request. For the demo we fix geometry to Shadnagar + Ka 26.5 GHz.
    const req = {
      pointing_error_deg: 0.1, beamwidth_3db_deg: 1.5,
      transmit_power_dbm: 20, tx_gain_dbi: 40, rx_gain_dbi: 40,
      interference_to_noise_db: Math.min(4, ((2.7 - current.radius)/1.7)*4),
      system_temperature_k: 290,
      distance_km: 500, latitude_deg: 17.03, longitude_deg: 78.18,
      frequency_ghz: 26.5, elevation_deg: 30, station_height_km: 0.54,
      time_percent: 0.1, rain_rate_r001_mmh: 26, rain_polarization_deg: 0,
      polarization_mismatch_deg: 5, antenna_diameter_m: 7.5,
      symbol_rate_sps: 1e6, bandwidth_hz: 10e6,
      // UI overrides injected for server that supports them:
      _ui_rain_mmh: current.rain, _ui_exclusion_km: current.radius,
    };
    try {
      const res = await Api.fetchLinkBudget(req);
      renderBudget(res);
    } catch (e) {
      // fallback to local deterministic model so sliders never appear broken offline
      const local = Api.localBudget({ rain: current.rain, radius: current.radius });
      renderBudget(local);
    }
  }

  const debouncedFetch = debounce(fetchAndRender, 150);

  function onRadiusInput() {
    current.radius = parseFloat(radiusEl.value);
    container.querySelector('#kaRadiusVal').textContent = `${current.radius.toFixed(1)} km`;
    debouncedFetch();
  }
  function onRainInput() {
    current.rain = parseFloat(rainEl.value);
    container.querySelector('#kaRainVal').textContent = `${current.rain} mm/h`;
    debouncedFetch();
  }

  radiusEl.addEventListener('input', onRadiusInput);
  rainEl.addEventListener('input', onRainInput);

  // Curve: data rate vs rain for current radius
  function drawCurve(radius, rainNow) {
    const box = container.querySelector('#kaCurve');
    if (!box) return;
    const W = 360, H = 140, pad = 24;
    const pts = [];
    let maxRate = 620;
    for (let r = 0; r <= 100; r += 2) {
      const b = Api.localBudget({ rain: r, radius });
      const x = pad + (r / 100) * (W - 2 * pad);
      const y = H - pad - (b.data_rate_mbps / maxRate) * (H - 2 * pad);
      pts.push(`${x},${y}`);
    }
    const cx = pad + (rainNow / 100) * (W - 2 * pad);
    const cur = Api.localBudget({ rain: rainNow, radius });
    const cy = H - pad - (cur.data_rate_mbps / maxRate) * (H - 2 * pad);
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Data rate vs rain">
      <line x1="${pad}" y1="${H-pad}" x2="${W-8}" y2="${H-pad}" stroke="var(--border)"/>
      <line x1="${pad}" y1="8" x2="${pad}" y2="${H-pad}" stroke="var(--border)"/>
      <text x="${W-8}" y="${H-10}" text-anchor="end" font-size="9" fill="var(--muted)">100 mm/h</text>
      <text x="${pad}" y="14" font-size="9" fill="var(--muted)">620 Mbps</text>
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--teal)" stroke-width="2"/>
      <line x1="${cx}" y1="8" x2="${cx}" y2="${H-pad}" stroke="var(--muted-2)" stroke-dasharray="3 3"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="var(--orange)"/>
    </svg>`;
  }

  // initial fetch
  fetchAndRender();

  return {
    getValues() { return { ...current }; },
    destroy() {
      radiusEl.removeEventListener('input', onRadiusInput);
      rainEl.removeEventListener('input', onRainInput);
    },
  };
}

export const KaPanel = { initKaPanel };
export default KaPanel;
