/**
 * @fileoverview Canvas/SVG timeline: T1 red-border, T2 green, T3 dashed;
 * gray hatched slew gaps; click -> drawer.
 */

const TOTAL_WINDOW_H = 2; // matches orchestrator default window shown in console
const AZ_RATE = 20, EL_RATE = 10; // deg/s SGSS spec

function angDelta(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
function slewSeconds(azD, elD) { return Math.max(azD / AZ_RATE, elD / EL_RATE) + 1.0; }

function statusOf(b) {
  if (b.preempted || b.preempted_by) return 'preempted';
  const flags = b.flags || [];
  if (flags.includes('OVERLAP') || flags.includes('overlap') || flags.includes('CABLE_WRAP') || flags.includes('wrap')) return 'red';
  if (flags.includes('SLEW_GAP') || flags.includes('slew') || flags.includes('KEYHOLE_RISK') || flags.includes('keyhole')) return 'amber';
  return 'green';
}

function tierClass(tier) {
  if (tier === 1) return 'tier1';
  if (tier === 2) return 'tier2';
  if (tier === 3) return 'tier3';
  return 'tier2';
}

/**
 * Render Gantt into container.
 * @param {HTMLElement} container
 * @param {Array<any>} bookings enriched with pass fields
 * @param {{ onSelect: (id:string)=>void, antennas?: string[] }} opts
 */
export function renderGantt(container, bookings, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  // Derive antenna lanes; prefer explicit list then bookings.
  const antennas = opts.antennas || [...new Set(bookings.map(b => b.antenna_id ? `ANT-${String(b.antenna_id).padStart(2,'0')}` : b.ant).filter(Boolean))].sort();
  const lanes = antennas.length ? antennas : ['ANT-01','ANT-02','ANT-03','ANT-04','ANT-05','ANT-06'];

  const hours = ['Now','+15m','+30m','+45m','+1h','+1h15','+1h30','+1h45'];

  // Group bookings per lane
  const byLane = new Map(lanes.map(a => [a, []]));
  const unscheduled = [];
  bookings.forEach(b => {
    const key = b.antenna_id ? `ANT-${String(b.antenna_id).padStart(2,'0')}` : (b.ant || 'UNSCHEDULED');
    if (byLane.has(key)) byLane.get(key).push(b);
    else if (key === 'UNSCHEDULED' || key === 'ANT-00') unscheduled.push(b);
    else {
      // unknown antenna — create lane on fly
      if (!byLane.has(key)) { byLane.set(key, []); lanes.push(key); }
      byLane.get(key).push(b);
    }
  });

  // Sort each lane by start
  for (const [k, list] of byLane) list.sort((a,b) => (a.start ?? toHours(a.aos)) - (b.start ?? toHours(b.aos)));

  function toHours(v) {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const t = Date.parse(v);
    if (isNaN(t)) return 0;
    const base = Date.now();
    return (t - base) / 3600000;
  }
  function barLeft(b) {
    const s = b.start ?? toHours(b.aos);
    // clamp to [0, TOTAL_WINDOW_H]
    return Math.max(0, Math.min(100, (s / TOTAL_WINDOW_H) * 100));
  }
  function barWidth(b) {
    const s = b.start ?? toHours(b.aos);
    const e = b.end ?? toHours(b.los);
    const dur = (b.dur ?? (e - s));
    const w = (Math.max(0.05, dur) / TOTAL_WINDOW_H) * 100;
    return Math.max(3, Math.min(100 - barLeft(b), w));
  }

  // Compute slew gaps per lane (gray hatched)
  const gaps = [];
  for (const lane of lanes) {
    const list = byLane.get(lane) || [];
    for (let i = 1; i < list.length; i++) {
      const prev = list[i-1], curr = list[i];
      const prevEnd = (prev.start ?? toHours(prev.aos)) + (prev.dur ?? (toHours(prev.los) - toHours(prev.aos)));
      const currStart = curr.start ?? toHours(curr.aos);
      const gapH = currStart - prevEnd;
      if (gapH <= 0 || gapH > 0.5) continue; // only tight gaps
      const gapSec = gapH * 3600;
      const azPrev = prev.az_los ?? prev.losAz ?? 0;
      const azCurr = curr.az_aos ?? curr.aosAz ?? 0;
      const need = slewSeconds(angDelta(azPrev, azCurr), 0);
      if (gapSec < need) {
        const left = (prevEnd / TOTAL_WINDOW_H) * 100;
        const width = (gapH / TOTAL_WINDOW_H) * 100;
        gaps.push({ lane, left, width, need, gapSec });
      }
    }
  }

  container.innerHTML = `
    <div class="gantt-wrap"><div class="gantt">
      <div class="gantt-header"><div></div>${hours.map(h=>`<div class="hcell">${h}</div>`).join('')}</div>
      ${lanes.map(lane => `
        <div class="gantt-row" data-lane="${lane}">
          <div class="gantt-label">${lane}</div>
          <div class="gantt-track">
            ${gaps.filter(g=>g.lane===lane).map(g=>`
              <div class="gantt-gap" title="Slew gap ${g.gapSec.toFixed(0)}s < need ${g.need.toFixed(0)}s"
                style="left:${g.left}%; width:${g.width}%;"></div>
            `).join('')}
            ${(byLane.get(lane)||[]).map(b=>{
              const id = b.id || b.pass_id || b.passId || '';
              const sat = b.sat_name || b.sat || 'PASS';
              const tier = b.tier ?? 2;
              const st = statusOf(b);
              const cls = st === 'preempted' ? 'preempted' : st;
              const tierCls = tierClass(tier);
              const left = barLeft(b).toFixed(3);
              const width = barWidth(b).toFixed(3);
              return `<div class="gantt-bar ${cls} ${tierCls}" data-id="${id}"
                style="left:${left}%; width:${width}%;" title="${sat} · T${tier} · ${lane}">${sat}</div>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
      ${unscheduled.length ? `
        <div class="gantt-row">
          <div class="gantt-label" style="color:var(--red-tx);">Unscheduled</div>
          <div class="gantt-track">
            ${unscheduled.map(b=>{
              const id = b.id || b.pass_id || '';
              const sat = b.sat_name || b.sat || 'PASS';
              return `<div class="gantt-bar red tier1" data-id="${id}" style="left:${barLeft(b)}%; width:${barWidth(b)}%;">${sat}</div>`;
            }).join('')}
          </div>
        </div>` : ''}
    </div></div>
  `;

  container.querySelectorAll('.gantt-bar').forEach(el => {
    el.addEventListener('click', () => onSelect(el.dataset.id));
  });
}

/**
 * Helper: enrich raw bookings with display fields if needed (no-op if already enriched).
 */
export function normalizeBookings(raw) {
  // Already in hours for demo; for real API parse RFC3339 to hours-from-now
  const now = Date.now();
  return raw.map(b => {
    if (typeof b.start === 'number') return b;
    const aos = b.aos ? Date.parse(b.aos) : now;
    const los = b.los ? Date.parse(b.los) : aos + 15*60*1000;
    return {
      ...b,
      id: b.pass_id || b.id,
      sat: b.sat_name || b.sat,
      start: (aos - now)/3600000,
      dur: (los - aos)/3600000,
      aosAz: b.az_aos, losAz: b.az_los,
      elevMax: b.max_el,
      tier: b.tier || 2,
      flags: b.flags || [],
      ant: b.antenna_id ? `ANT-${String(b.antenna_id).padStart(2,'0')}` : b.ant,
    };
  });
}

export const Gantt = { renderGantt, normalizeBookings };
export default Gantt;
