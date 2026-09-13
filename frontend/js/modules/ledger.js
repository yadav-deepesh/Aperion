/**
 * @fileoverview SLA sidebar (contracts, preemption credits).
 */

import { Api } from '../api/client.js';

function slaPct(row) {
  const denom = Math.max(1, row.passes_booked || row.passesBooked || 1);
  const ok = row.passes_completed ?? row.passesCompleted ?? 0;
  return Math.round((ok / denom) * 100);
}
function pctColor(pct) {
  if (pct >= 97) return 'var(--green-dot)';
  if (pct >= 85) return 'var(--amber-dot)';
  return 'var(--red-dot)';
}
function pctBadge(pct) {
  if (pct >= 97) return 'green';
  if (pct >= 85) return 'amber';
  return 'red';
}

/**
 * Render ledger table into container.
 * @param {HTMLElement} container
 * @param {import('../types.js').LedgerRow[]} rows
 */
export function renderLedger(container, rows) {
  if (!rows || rows.length === 0) {
    container.innerHTML = `
      <div class="panel-head"><span class="ph-title">SLA Ledger</span></div>
      <div class="empty">No ledger rows for this week yet. Generate a schedule first.</div>
    `;
    return;
  }

  // Normalise snake vs camel
  const norm = rows.map(r => ({
    contract_id: r.contract_id || r.contractId,
    week_start: r.week_start || r.weekStart,
    passes_booked: r.passes_booked ?? r.passesBooked ?? 0,
    passes_completed: r.passes_completed ?? r.passesCompleted ?? 0,
    passes_preempted: r.passes_preempted ?? r.passesPreempted ?? 0,
    preemption_count: r.preemption_count ?? r.preemptionCount ?? 0,
    credits_owed: r.credits_owed ?? r.creditsOwed ?? 0,
    revenue: r.revenue ?? 0,
  }));

  container.innerHTML = `
    <div class="panel-head"><span class="ph-title">SLA Ledger</span><span class="ph-sub">this week · credits in ₹</span></div>
    <table class="sla-table">
      <thead><tr>
        <th>Contract</th><th>Booked</th><th>Preempted</th><th>Credits</th><th>SLA%</th>
      </tr></thead>
      <tbody>
        ${norm.map(r => {
          const pct = slaPct(r);
          return `<tr>
            <td><b>${r.contract_id}</b></td>
            <td>${r.passes_booked}</td>
            <td>${r.passes_preempted} <span class="muted">(${r.preemption_count})</span></td>
            <td>${r.credits_owed ? '₹' + Number(r.credits_owed).toLocaleString('en-IN') : '—'}</td>
            <td>
              <span class="sla-pct">
                <span class="sla-bar"><span class="sla-fill" style="width:${Math.min(100,pct)}%;background:${pctColor(pct)}"></span></span>
                <span class="badge ${pctBadge(pct)}">${pct}%</span>
              </span>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="ledger-foot">
      <div class="legend"><span class="dot green"></span> Met (≥97%) <span class="dot amber"></span> At risk <span class="dot red"></span> Breached</div>
      <div class="hint">Credits accrue per TLE spec when T1 preempts T2/T3 within weekly allowance.</div>
    </div>
  `;
}

/**
 * Fetch and render — call from app.js on boot and on WS ledger.updated.
 * @param {HTMLElement} container
 * @param {string} [week]
 */
export async function loadLedger(container, week) {
  try {
    const rows = await Api.fetchLedger(week);
    renderLedger(container, rows);
  } catch (e) {
    // Fallback demo rows so the sidebar is never blank offline
    const demo = [
      { contract_id: 'isro-1', passes_booked: 18, passes_completed: 18, passes_preempted: 0, preemption_count: 0, credits_owed: 0 },
      { contract_id: 'pixxel-1', passes_booked: 21, passes_completed: 19, passes_preempted: 2, preemption_count: 2, credits_owed: 40000 },
      { contract_id: 'academic-1', passes_booked: 9, passes_completed: 7, passes_preempted: 1, preemption_count: 1, credits_owed: 8000 },
    ];
    renderLedger(container, demo);
    const note = document.createElement('div');
    note.className = 'ledger-error';
    note.textContent = 'ledger offline — showing demo values';
    container.appendChild(note);
  }
}

export const Ledger = { renderLedger, loadLedger };
export default Ledger;
