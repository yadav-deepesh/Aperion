/**
 * @fileoverview Leaflet map at 17.03N 78.18E + 2.7 km green exclusion circle + ground tracks.
 * Falls back to a schematic SVG when Leaflet/offline tiles are unavailable.
 */

const SHADNAGAR = [17.03, 78.18]; // IN-SPACe site per config/site.shadnagar.yaml
const DEFAULT_RADIUS_KM = 2.7;

let leafletMap = null;
let exclusionCircle = null;
let trackLayer = null;
let antennaMarkers = [];
let leafletPromise = null;

// Keep zoom level for fallback SVG
let fallbackZoom = 1;

// Antenna offsets (degrees lat/lon) around the campus centroid — purely for viz.
const ANT_OFFSETS = {
  1: [0.0009, 0.0007],
  2: [-0.0008, 0.0009],
  3: [0.0011, -0.0006],
  4: [-0.001, -0.0008],
  5: [0.0003, 0.0013],
  6: [-0.0005, -0.0013],
};

function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('leaflet load failed'));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function destPoint(center, bearingDeg, distKm) {
  const R = 6371, brng = bearingDeg * Math.PI / 180;
  const lat1 = center[0] * Math.PI / 180, lon1 = center[1] * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distKm / R) + Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distKm / R) * Math.cos(lat1), Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2));
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

/**
 * Initialise the map inside `containerId`. Call once from app.js.
 * @param {string} containerId
 * @param {{ radiusKm?: number, onReady?: ()=>void }=} opts
 */
export function initMap(containerId, opts = {}) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  // Create inner leaflet container
  wrap.innerHTML = '<div id="leafletMap" style="position:absolute;inset:0;"></div><div id="mapFallback" style="position:absolute;inset:0;display:none;"></div>';
  const cap = document.getElementById('mapCaption');
  if (cap) cap.textContent = 'Loading live map…';

  ensureLeaflet().then(() => {
    try {
      mountLeaflet(opts.radiusKm ?? DEFAULT_RADIUS_KM);
      if (cap) cap.textContent = 'Live coverage · Shadnagar (17.03°N 78.18°E) · 5G exclusion 2.7 km';
      if (opts.onReady) opts.onReady();
    } catch (e) {
      drawFallback(opts.radiusKm ?? DEFAULT_RADIUS_KM);
    }
  }).catch(() => drawFallback(opts.radiusKm ?? DEFAULT_RADIUS_KM));
}

function mountLeaflet(radiusKm) {
  const container = document.getElementById('leafletMap');
  if (!container || !window.L) throw new Error('no container/leaflet');

  if (leafletMap) { try { leafletMap.remove(); } catch {} leafletMap = null; }

  leafletMap = L.map(container, { zoomControl: false, attributionControl: true }).setView(SHADNAGAR, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
  }).addTo(leafletMap);

  exclusionCircle = L.circle(SHADNAGAR, {
    radius: radiusKm * 1000,
    color: '#16a34a', weight: 2, dashArray: '6 4',
    fillColor: '#22c55e', fillOpacity: 0.08,
  }).addTo(leafletMap).bindPopup(`5G exclusion zone — ${radiusKm.toFixed(1)} km (DoT 24.25–27.5 GHz)`);

  const stationIcon = L.divIcon({
    className: '',
    html: '<div style="width:16px;height:16px;border-radius:50%;background:#0f9baa;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
    iconSize: [16, 16], iconAnchor: [8, 8],
  });
  L.marker(SHADNAGAR, { icon: stationIcon }).addTo(leafletMap)
    .bindPopup('<b>Shadnagar Ground Station</b><br>NRSC campus · 17.03°N 78.18°E<br>Alt 0.54 km · S/X/Ka');

  // Antenna markers are added/updated via updateTracks()
  trackLayer = L.layerGroup().addTo(leafletMap);
  antennaMarkers = [];
}

function drawFallback(radiusKm) {
  const fb = document.getElementById('mapFallback');
  const ll = document.getElementById('leafletMap');
  if (fb) fb.style.display = 'block';
  if (ll) ll.style.display = 'none';
  const cap = document.getElementById('mapCaption');
  if (cap) cap.textContent = 'Schematic view — live tiles unavailable';
  renderFallbackSvg(fb, radiusKm);
}

function renderFallbackSvg(container, radiusKm) {
  if (!container) return;
  const s = fallbackZoom;
  const exclR = (radiusKm / 2.7) * 90 * s;
  container.innerHTML = `<svg viewBox="0 0 400 300" style="width:100%;height:100%;background:radial-gradient(circle at 50% 45%, #eef7f8 0%, #e4eef0 55%, #dbe6e8 100%);">
    <circle cx="200" cy="150" r="${140 * s}" fill="none" stroke="#d1d5db" stroke-dasharray="3 4"/>
    <circle cx="200" cy="150" r="${exclR}" fill="#22c55e" opacity=".08" stroke="#16a34a" stroke-dasharray="4 3"/>
    <circle cx="200" cy="150" r="7" fill="#0f9baa"/>
    <circle cx="200" cy="150" r="12" fill="none" stroke="#0f9baa" stroke-width="1.5"/>
    <text x="200" y="176" text-anchor="middle" font-size="10" fill="#6b7280" font-family="Inter,system-ui">SHADNAGAR 17.03°N 78.18°E</text>
    <text x="200" y="188" text-anchor="middle" font-size="8" fill="#9ca3af">exclusion ${radiusKm.toFixed(1)} km</text>
  </svg>`;
}

/**
 * Update exclusion circle radius.
 * @param {number} radiusKm 0.3–2.7
 */
export function setRadius(radiusKm) {
  if (exclusionCircle && leafletMap) {
    exclusionCircle.setRadius(radiusKm * 1000);
    exclusionCircle.setPopupContent(`5G exclusion zone — ${radiusKm.toFixed(1)} km`);
  } else {
    const fb = document.getElementById('mapFallback');
    if (fb && fb.style.display !== 'none') renderFallbackSvg(fb, radiusKm);
  }
  // keep legend in sync
  const legendVal = document.getElementById('mapLegendRadius');
  if (legendVal) legendVal.textContent = `${radiusKm.toFixed(1)} km`;
}

/**
 * Render ground tracks: dashed polylines from each antenna along AOS azimuth
 * for bookings that intersect "now".
 * @param {Array<{ant?:string, antenna_id?:number, sat_name?:string, sat?:string, az_aos?:number, aosAz?:number}>} bookings
 */
export function updateTracks(bookings) {
  if (!leafletMap || !trackLayer) return;
  trackLayer.clearLayers();
  // clear previous antenna markers (re-add each update)
  antennaMarkers.forEach(m => { try { leafletMap.removeLayer(m); } catch {} });
  antennaMarkers = [];

  const palette = { 1: '#ef4444', 2: '#22c55e', 3: '#6b7280' };

  bookings.forEach((b) => {
    const antId = b.antenna_id ?? (b.ant ? parseInt(String(b.ant).replace(/\D/g, ''), 10) : 0);
    const off = ANT_OFFSETS[antId] || [0, 0];
    const pos = [SHADNAGAR[0] + off[0], SHADNAGAR[1] + off[1]];
    const color = palette[b.tier] || '#0f9baa';

    const marker = L.circleMarker(pos, { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
      .addTo(leafletMap).bindPopup(`<b>${b.antenna_id ? 'ANT-' + String(b.antenna_id).padStart(2, '0') : b.ant}</b><br>${b.sat_name || b.sat}`);
    antennaMarkers.push(marker);

    const az = b.az_aos ?? b.aosAz;
    if (typeof az === 'number') {
      const dest = destPoint(pos, az, 2.5);
      L.polyline([pos, dest], { color, weight: 2, dashArray: '2 5', opacity: 0.75 })
        .addTo(trackLayer).bindPopup(`${b.sat_name || b.sat} — az ${az.toFixed(0)}°`);
    }
  });
}

export function zoomIn() {
  if (leafletMap) leafletMap.zoomIn();
  else { fallbackZoom = Math.min(1.6, fallbackZoom + 0.15); const fb = document.getElementById('mapFallback'); if (fb) renderFallbackSvg(fb, DEFAULT_RADIUS_KM); }
}
export function zoomOut() {
  if (leafletMap) leafletMap.zoomOut();
  else { fallbackZoom = Math.max(0.7, fallbackZoom - 0.15); const fb = document.getElementById('mapFallback'); if (fb) renderFallbackSvg(fb, DEFAULT_RADIUS_KM); }
}

export const MapModule = { initMap, setRadius, updateTracks, zoomIn, zoomOut, SHADNAGAR };
export default MapModule;
