/**
 * @fileoverview boot + wiring — single entry point.
 * Layout shell: map top, Gantt middle, Ka panel + ledger sidebar.
 * Wires REST (GET /schedule), WS (/live), and all modules.
 */

import { Api } from './api/client.js';
import { initMap, setRadius, updateTracks, zoomIn, zoomOut } from './modules/map.js';
import { renderGantt, normalizeBookings } from './modules/gantt.js';
import { initKaPanel } from './modules/kaPanel.js';
import { loadLedger } from './modules/ledger.js';
import { openDrawer, closeDrawer } from './modules/drawer.js';

const state = {
  bookings: [],
  ka: { radius: 2.7, rain: 15 },
  theme: 'light',
};

/** @type {ReturnType<typeof Api.connectLive> | null} */
let liveHandle = null;

function qs(sel) { return document.querySelector(sel); }

function setTheme(t) {
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  try{ document.body.setAttribute('data-theme', t); }catch(e){}
  const gs = document.getElementById('gsRoot'); if(gs) gs.setAttribute('data-theme', t);
  localStorage.setItem('aperion:theme', t);
}

async function boot() {
  const savedTheme = localStorage.getItem('aperion:theme');
  if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);

  // Theme toggle
  const themeBtn = qs('#themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => setTheme(state.theme === 'light' ? 'dark' : 'light'));
    // keep label in sync
    const obs = new MutationObserver(() => {
      themeBtn.textContent = state.theme === 'light' ? '☾ Dark' : '☀ Light';
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    themeBtn.textContent = state.theme === 'light' ? '☾ Dark' : '☀ Light';
  }

  // Map controls
  const zIn = qs('#zIn'), zOut = qs('#zOut');
  if (zIn) zIn.addEventListener('click', zoomIn);
  if (zOut) zOut.addEventListener('click', zoomOut);

  // Ka panel
  const kaContainer = qs('#kaPanel');
  if (kaContainer) {
    initKaPanel(kaContainer, {
      initialRadius: state.ka.radius,
      initialRain: state.ka.rain,
      onBudget: (b) => {
        // keep map exclusion in sync
        setRadius(state.ka.radius);
      },
    });
    window.addEventListener('aperion:kaChange', (e) => {
      state.ka = { radius: e.detail.radius, rain: e.detail.rain };
      setRadius(state.ka.radius);
    });
  }

  // Initialise map (top)
  initMap('mapBox', { radiusKm: state.ka.radius });

  // Schedule toolbar
  qs('#autoBtn')?.addEventListener('click', async () => {
    qs('#autoBtn').disabled = true;
    try { await Api.generateSchedule(); toast('Auto-schedule requested — waiting for /live update'); await refreshSchedule(); } catch (e) { toast('Auto-schedule failed: ' + e.message); } finally { qs('#autoBtn').disabled = false; }
  });
  qs('#emgBtn')?.addEventListener('click', async () => {
    const payload = { tier: 1, sat_name: 'RISAT-2B (Flood Response)', aos: new Date(Date.now()+ 20*60*1000).toISOString(), los: new Date(Date.now()+ 35*60*1000).toISOString(), max_el: 52, az_aos: 100, az_los: 250 };
    try { const r = await Api.injectEmergency(payload); toast(`Emergency injected — ${r.preempted ? 'preempted '+r.preempted : 'booked'}`); await refreshSchedule(); } catch (e) { toast('Inject failed: '+e.message); }
  });
  qs('#csvBtn')?.addEventListener('click', () => exportCSV());

  // First paints (ledger + schedule)
  await Promise.all([refreshSchedule(), refreshLedger()]);

  // WS /live
  const dot = qs('#liveDot');
  const liveLabel = qs('#liveLabel');
  try {
    liveHandle = Api.connectLive({
      onEvent: (ev) => {
        if (ev.type === 'booking.created' || ev.type === 'booking.preempted' || ev.type === 'schedule.updated') {
          toast(`Live: ${ev.type}`);
          refreshSchedule();
          refreshLedger();
        } else if (ev.type === 'ledger.updated') {
          refreshLedger();
        }
      },
      onOpen: () => { if (dot) dot.className = 'dot live'; if (liveLabel) liveLabel.textContent = 'live'; },
      onClose: () => { if (dot) dot.className = 'dot offline'; if (liveLabel) liveLabel.textContent = 'offline'; },
    });
  } catch {
    if (dot) dot.className = 'dot offline';
  }

  // Close drawer on overlay handled inside drawer module
}

async function refreshSchedule() {
  const ganttEl = qs('#gantt');
  const countEl = qs('#passCount');
  try {
    const rows = await Api.fetchSchedule();
    const norm = normalizeBookings(rows);
    // Also try to enrich with passes if schedule is just bookings
    let enriched = norm;
    if (rows.length && !rows[0].sat_name && !rows[0].sat) {
      try {
        const passes = await Api.fetchPasses();
        const passById = new Map(passes.map(p => [p.id, p]));
        enriched = norm.map(b => {
          const p = passById.get(b.pass_id || b.id);
          return p ? { ...b, sat_name: p.sat_name, max_el: p.max_el, az_aos: p.az_aos, az_los: p.az_los, slant_km: p.slant_km, tier: p.tier, contract_id: p.contract_id, flags: [...(b.flags||[]), ...(p.flags||[])] } : b;
        });
      } catch {}
    }
    state.bookings = enriched;
    if (ganttEl) renderGantt(ganttEl, enriched, { onSelect: onGanttSelect });
    if (countEl) countEl.textContent = `${enriched.length} passes`;
    updateTracks(enriched);
  } catch (e) {
    // Demo fallback so the shell is never empty offline
    const demo = demoBookings();
    state.bookings = demo;
    if (ganttEl) renderGantt(ganttEl, demo, { onSelect: onGanttSelect });
    if (countEl) countEl.textContent = `${demo.length} passes (demo)`;
    updateTracks(demo);
  }
}

async function refreshLedger() {
  const ledgerEl = qs('#ledger');
  if (!ledgerEl) return;
  await loadLedger(ledgerEl);
}

function onGanttSelect(id) {
  const b = state.bookings.find(x => (x.id === id) || (x.pass_id === id));
  if (!b) return;
  openDrawer(document.body, b, state.ka);
}

function demoBookings() {
  const now = Date.now();
  const h = (x) => new Date(now + x*3600000).toISOString();
  return normalizeBookings([
    { id:'p1', pass_id:'p1', sat_name:'CARTOSAT-3', antenna_id:1, aos:h(0.15), los:h(0.5), max_el:61, az_aos:40, az_los:190, tier:2, flags:[], slant_km:540 },
    { id:'p2', pass_id:'p2', sat_name:'RESOURCESAT-2A', antenna_id:1, aos:h(0.3), los:h(0.6), max_el:34, az_aos:200, az_los:10, tier:2, flags:['OVERLAP'], slant_km:620 },
    { id:'p3', pass_id:'p3', sat_name:'OCEANSAT-3', antenna_id:2, aos:h(0.05), los:h(0.45), max_el:78, az_aos:300, az_los:90, tier:1, flags:[], slant_km:720 },
    { id:'p4', pass_id:'p4', sat_name:'RISAT-2BR2', antenna_id:2, aos:h(0.35), los:h(0.6), max_el:22, az_aos:95, az_los:260, tier:3, flags:['SLEW_GAP'], slant_km:480 },
    { id:'p7', pass_id:'p7', sat_name:'INSAT-3DS', antenna_id:2, aos:h(0.4), los:h(0.7), max_el:89, az_aos:88, az_los:300, tier:1, flags:['KEYHOLE_RISK'], slant_km:35786 },
  ]);
}

function exportCSV() {
  const rows = [['Antenna','Satellite','Tier','AOS','LOS','MaxEl','AzAOS','AzLOS','Flags']];
  state.bookings.forEach(b=>{
    rows.push([b.antenna_id?`ANT-${String(b.antenna_id).padStart(2,'0')}`:b.ant||'', b.sat_name||b.sat||'', b.tier||'', b.aos||'', b.los||'', b.max_el??b.elevMax??'', b.az_aos??b.aosAz??'', b.az_los??b.losAz??'', (b.flags||[]).join(';')]);
  });
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='shadnagar-schedule.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

let toastTimer=null;
function toast(msg){
  let el = document.getElementById('toast');
  if (!el) { el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg; el.style.display='flex';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ el.style.display='none'; }, 4000);
}

document.addEventListener('DOMContentLoaded', boot);
