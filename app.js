/* ═══════════════════════════════════════════════
   app.js — UNIB Maps — Dijkstra Navigator
   ───────────────────────────────────────────────
   Dijkstra  → menentukan JALUR terpendek (POI mana)
   OSRM      → menggambar rute mengikuti JALAN ASLI
   ═══════════════════════════════════════════════ */

// ── Data lokasi kampus ──
// Koordinat fpertanian diperbaiki agar presisi berada di dalam kompleks kampus utama
const NODES = {
  rektorat    : { name: "Gedung Rektorat",        lat: -3.7597, lng: 102.2724, iconType: "admin" },
  glt         : { name: "Gedung Layanan Terpadu (GLT)", lat: -3.7581402, lng: 102.2719062, iconType: "office" },
  lptik       : { name: "LPTIK UNIB",             lat: -3.75843, lng: 102.27493, iconType: "tech" },
  kedokteran  : { name: "Fakultas Kedokteran",    lat: -3.75505, lng: 102.27797, routingLat: -3.75505, routingLng: 102.27797, iconType: "medical" },
  mipa        : { name: "Dekanat MIPA",           lat: -3.7560482, lng: 102.2748329, iconType: "science" },
  fteknik     : { name: "Dekanat Teknik",         lat: -3.75864, lng: 102.27660, routingLat: -3.75864, routingLng: 102.27660, iconType: "engineering" },
  lab_terpadu : { name: "Laboratorium Teknik",    lat: -3.75895, lng: 102.27678, routingLat: -3.75895, routingLng: 102.27678, iconType: "chemistry" },
  stadion     : { name: "Stadion UNIB",           lat: -3.75770, lng: 102.27806, iconType: "stadium" },
  fpertanian  : { name: "Dekanat Fakultas Pertanian", lat: -3.7595750, lng: 102.2691479, iconType: "agriculture" },
  fkip        : { name: "Dekanat FKIP",           lat: -3.75768, lng: 102.27498, iconType: "education" },
  fekon       : { name: "Dekanat FEB",            lat: -3.7616179, lng: 102.2684234, iconType: "economics" },
  perpus      : { name: "UPT Perpustakaan",       lat: -3.7568392, lng: 102.2748198, iconType: "library" },
  gedung_bersama: { name: "Gedung Bersama (GB) II", lat: -3.75810, lng: 102.27391, iconType: "office" },
  masjid      : { name: "Masjid Baitul Hikmah UNIB",   lat: -3.7590596, lng: 102.2759543, iconType: "mosque" },
  fhukum      : { name: "Fakultas Hukum UNIB",    lat: -3.7606953, lng: 102.2683459, iconType: "law" },
  fisipol     : { name: "Dekanat FISIP",          lat: -3.7591964, lng: 102.2741934, iconType: "admin" },
  
  // Tambahan Gedung Bersama & GSG
  gb_v        : { name: "Gedung Bersama (GB) V",   lat: -3.75544, lng: 102.27645, iconType: "office" },
  gb_i        : { name: "Gedung Bersama (GB) I",   lat: -3.75695, lng: 102.27383, iconType: "office" },
  gb_iii      : { name: "Gedung Bersama (GB) III", lat: -3.75640, lng: 102.27662, iconType: "office" },
  gb_iv       : { name: "Gedung Bersama (GB) IV",  lat: -3.75653, lng: 102.27629, iconType: "office" },
  gsg         : { name: "Gedung Serba Guna (GSG)", lat: -3.75774, lng: 102.27658, iconType: "stadium" },
};

// ── Edge Data ──
// [dari, ke, jarak, mode]
//   "all" = jalan raya (mobil, motor, jalan kaki)
//   "wm"  = gang sempit (motor + jalan kaki saja)
//   "w"   = jalan setapak (jalan kaki saja)
const EDGES = [
  // ═══ JALAN RAYA — semua kendaraan ═══
  ["fekon",       "fhukum",      100, "all"],
  ["fhukum",      "rektorat",    300, "all"],
  ["rektorat",    "glt",         180, "all"],
  ["glt",         "fpertanian",  340, "all"],
  ["fpertanian",  "rektorat",    260, "all"],
  ["mipa",        "kedokteran",  360, "all"],
  ["fteknik",     "kedokteran",  420, "all"],
  
  // Rektorat & Gedung Bersama (GB)
  ["rektorat",    "gedung_bersama", 230, "all"],
  ["gedung_bersama", "lptik",     120, "all"],
  ["gedung_bersama", "fisipol",   130, "all"],
  ["gb_i",        "gedung_bersama", 130, "all"],
  ["perpus",      "gb_i",        110, "all"],
  
  // Kampus Utara & Tengah
  ["perpus",      "mipa",        100, "all"],
  ["perpus",      "fkip",        100, "all"],
  ["lptik",       "fkip",         80, "all"],
  ["lptik",       "masjid",      130, "all"],
  ["fkip",        "masjid",      190, "all"],
  ["fisipol",     "masjid",      200, "all"],
  ["fisipol",     "stadion",     380, "all"],
  
  // Kampus Timur (Fakultas Teknik & GB V, III, IV, GSG, Stadion)
  ["gb_v",        "gb_iii",      110, "all"],
  ["gb_iii",      "gb_iv",        40, "all"],
  ["gb_iv",       "gsg",         140, "all"],
  ["gsg",         "fteknik",     100, "all"],
  ["fteknik",     "lab_terpadu",  50, "all"],
  ["mipa",        "gb_iii",      200, "all"],
  ["lptik",       "fteknik",     180, "all"],
  ["gsg",         "stadion",     160, "all"],
  ["kedokteran",  "stadion",     290, "all"],

  // ═══ GANG SEMPIT — motor + jalan kaki ═══
  ["glt",         "lptik",       220, "wm"],
  ["gedung_bersama", "masjid",   240, "wm"],

  // ═══ JALAN SETAPAK — jalan kaki saja ═══
  ["glt",         "lptik",       200, "w"],
  ["gedung_bersama", "masjid",   220, "w"],
  ["rektorat",    "perpus",      300, "w"],
  ["mipa",        "gedung_bersama", 250, "w"],
];

// ── Parse mode tag ──
function parseModes(m) {
  if (m === 'all') return ['walk','motor','car'];
  if (m === 'wm')  return ['walk','motor'];
  return ['walk'];
}

// ── Build graph ──
const graph = {};
for (const id in NODES) graph[id] = [];
for (const [a, b, w, mode] of EDGES) {
  const modes = parseModes(mode);
  graph[a].push({ to: b, w, modes });
  graph[b].push({ to: a, w, modes });
}

// ── Dijkstra ──
function dijkstra(start, end, mode) {
  const dist = {}, prev = {}, visited = new Set();
  for (const id in NODES) { dist[id] = Infinity; prev[id] = null; }
  dist[start] = 0;
  const pq = [{ id: start, cost: 0 }];

  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const { id: u } = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === end) break;

    for (const { to: v, w, modes } of graph[u]) {
      if (!modes.includes(mode)) continue;
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push({ id: v, cost: alt });
      }
    }
  }

  if (dist[end] === Infinity) return null;
  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return { distance: dist[end], path };
}

// ── Mode config ──
const MODE_CONFIG = {
  walk:  { profile: 'foot',    label: '🚶 Jalan Kaki', color: '#34a853' },
  motor: { profile: 'bicycle', label: '🏍️ Motor',      color: '#1a73e8' },
  car:   { profile: 'driving', label: '🚗 Mobil',      color: '#ea4335' },
};
let currentMode = 'walk';

// ── Map ──
const map = L.map('map', { center: [-3.7595, 102.2726], zoom: 16 });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 21,
  maxNativeZoom: 19,
  detectRetina: true
}).addTo(map);

// Fungsi snap koordinat klik ke jalan (edge) Dijkstra terdekat agar rute OSRM tidak melenceng keluar pagar/kampus
function snapToNetwork(lat, lng) {
  let minD = Infinity;
  let snappedLat = lat;
  let snappedLng = lng;

  // 1) Proyeksikan ke jalan (edge) terdekat
  for (const [a, b, w, mode] of EDGES) {
    const nodeA = NODES[a];
    const nodeB = NODES[b];

    const ax = nodeA.lat, ay = nodeA.lng;
    const bx = nodeB.lat, by = nodeB.lng;
    const px = lat, py = lng;

    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;

    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) continue;

    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t)); // Clamp ke segmen jalan

    const cx = ax + t * abx;
    const cy = ay + t * aby;

    const dx = px - cx, dy = py - cy;
    const d2 = dx * dx + dy * dy;

    if (d2 < minD) {
      minD = d2;
      snappedLat = cx;
      snappedLng = cy;
    }
  }

  // 2) Cari node POI terdekat
  let minNodeD = Infinity;
  let nearestNodeId = null;
  for (const id in NODES) {
    const dx = NODES[id].lat - lat, dy = NODES[id].lng - lng;
    const d2 = dx * dx + dy * dy;
    if (d2 < minNodeD) {
      minNodeD = d2;
      nearestNodeId = id;
    }
  }

  return { lat: snappedLat, lng: snappedLng, nodeId: nearestNodeId };
}

function findNearestPOI(lat, lng) {
  let minD = Infinity, nearest = null;
  for (const id in NODES) {
    const dx = NODES[id].lat - lat, dy = NODES[id].lng - lng;
    const d = dx*dx + dy*dy;
    if (d < minD) { minD = d; nearest = id; }
  }
  return nearest;
}

// ── SVG Icon Definitions & Generator ──
const MARKER_COLOR = "#1a73e8"; // Warna biru seragam, profesional, dan non-animasi

const ICON_PATHS = {
  gate: "M19,4H5C3.89,4 3,4.89 3,6V20H5V8H19V20H21V6C21,4.89 20.1,4 19,4M11,10H13V18H11V10Z",
  admin: "M4,10V21H6V10H4M9,10V21H11V10H9M14,10V21H16V10H14M19,10V21H21V10H19M2,22H22V24H2M2,8H22V9H2M12,2L2,7H22L12,2Z",
  office: "M15,11V13H13V11H15M15,7V9H13V7H15M15,15V17H13V15H15M11,11V13H9V11H11M11,7V9H9V7H11M11,15V17H9V15H11M7,11V13H5V11H7M7,7V9H5V7H7M7,15V17H5V15H7M19,21V1H3V21H19M17,19H5V3H17V19Z",
  tech: "M20,18c1.1,0,1.99-0.9,1.99-2L22,6c0-1.1-0.9-2-2-2H4C2.9,4,2,4.9,2,6v10c0,1.1,0.9,2,2,2H0v2h24v-2H20z M4,6h16v10H4V6z",
  medical: "M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z",
  science: "M19,3H5C3.89,3 3,3.89 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19M12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17Z",
  engineering: "M19.43,12.98C19.47,12.66 19.5,12.34 19.5,12C19.5,11.66 19.47,11.34 19.43,11.02L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.97 19.05,5.05L16.56,6.05C16.04,5.65 15.48,5.32 14.87,5.07L14.49,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.51,2.42L9.13,5.07C8.52,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.97 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11.02C4.53,11.34 4.5,11.66 4.5,12C4.5,12.34 4.53,12.66 4.57,12.98L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.95C7.96,18.35 8.52,18.68 9.13,18.93L9.51,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.49,21.58L14.87,18.93C15.48,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.98ZM12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5Z",
  chemistry: "M6,22H18A1,1 0 0,0 19,21C19,20.17 18.27,18.23 16,14V5H17V3H7V5H8V14C5.73,18.23 5,20.17 5,21A1,1 0 0,0 6,22Z",
  stadium: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z",
  agriculture: "M17,2H14C10,2 6.5,5 5,9C3.5,13 4.5,17.5 8,20C9.5,21 11,21.5 12.5,21.5C14.5,21.5 16.5,20.5 18,19C21,16 22,11 20,7C19.5,6 18.5,4.5 17,2M12.5,19.5C9.5,19.5 7.5,17.5 7,14.5C8,14.5 9,14 10,13C11.5,11.5 12,9 11.5,7C12.5,8 14.5,8.5 16,10C17.5,11.5 18,14 17.5,16C16.5,18.5 14.5,19.5 12.5,19.5Z",
  food: "M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.85 6.75,12.97V22H8.25V12.97C10.34,12.85 12,11.12 12,9V2H11V9M16,6A3,3 0 0,0 13,9V14H16V22H18V2H16V6Z",
  education: "M12,3L1,9L12,15L21,10.09V17H23V9L12,3M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z",
  economics: "M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V12H17V17Z",
  library: "M19,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2M19,20H5V4H7V12L9.5,9.5L12,12V4H19V20Z",
  mosque: "M12,2A3,3 0 0,0 9,5V6H8V11H16V6H15V5A3,3 0 0,0 12,2M5,12V22H19V12H17V14H15V12H9V14H7V12H5Z",
  parking: "M13,3H6V21H10V15H13A6,6 0 0,0 19,9A6,6 0 0,0 13,3M13,11H10V7H13A2,2 0 0,1 15,9A2,2 0 0,1 13,11Z",
  law: "M12,2A1,1 0 0,1 13,3V5H19A1,1 0 0,1 20,6V8A4,4 0 0,1 16,12H13V19H17A1,1 0 0,1 18,20V22H6V20A1,1 0 0,1 7,19H11V12H8A4,4 0 0,1 4,8V6A1,1 0 0,1 5,5H11V3A1,1 0 0,1 12,2Z"
};

function getIconSvg(type, color = MARKER_COLOR, size = 12) {
  const path = ICON_PATHS[type] || ICON_PATHS.office;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path fill="${color}" d="${path}"/></svg>`;
}

function makeCustomMarker(iconType) {
  const iconSvg = getIconSvg(iconType, MARKER_COLOR, 13);
  const htmlContent = `
    <div class="custom-pin-container">
      <svg class="custom-pin-svg" viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="38" rx="7" ry="2" fill="rgba(0,0,0,0.18)" />
        <path d="M16 0C7.16 0 0 7.16 0 16C0 26 16 42 16 42C16 42 32 26 32 16C32 7.16 24.84 0 16 0Z" fill="${MARKER_COLOR}" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="16" cy="16" r="7.5" fill="#ffffff" />
      </svg>
      <div class="custom-pin-icon-wrapper">
        ${iconSvg}
      </div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: htmlContent,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}

function makeIcon(color, size = 10) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2],
  });
}

// ── State ──
let pickStep = 0;
let startPos = null, endPos = null;
let startM = null, endM = null;
let pathLayers = [];

// Mapping dari ID node kita ke nama-nama yang ada di export.geojson
const GEOJSON_MAPPING = {
  rektorat: "Gedung Rektorat",
  glt: "Gedung Layanan Terpadu (GLT)",
  mipa: "Dekanat MIPA",
  fteknik: "Dekanat Teknik",
  lab_terpadu: "Laboratorium Teknik",
  fpertanian: "Dekanat Fakultas Pertanian",
  fkip: "LAB Pembelajaran FKIP",
  perpus: "UPT Perpustakaan",
  masjid: "Masjid Al-Barru UNIB",
  fhukum: "Fakultas Hukum UNIB",
  fisipol: "Dekanat FISIP",
  fekon: "Dekanat FEB",
  kedokteran: "Fakultas Kedokteran dan Ilmu Kesehatan",
  
  // Tambahan mapping baru
  gb_v: "Gedung Bersama (GB) V",
  gb_i: "Gedung Bersama (GB) I",
  gb_iii: "Gedung Bersama (GB) III",
  gb_iv: "Gedung Bersama (GB) IV",
  gedung_bersama: "Gedung Bersama (GB) II",
  lptik: "LPTIK UNIB",
  stadion: "Stadion UNIB",
  gsg: "Gedung Serba Guna (GSG)"
};

// ── POI markers ──
let markerObjects = {};
function initMarkers() {
  // Hapus marker yang ada sebelumnya jika ada
  for (const id in markerObjects) {
    map.removeLayer(markerObjects[id]);
  }
  markerObjects = {};

  for (const id in NODES) {
    const n = NODES[id];
    const m = L.marker([n.lat, n.lng], { icon: makeCustomMarker(n.iconType) }).addTo(map);
    m.on('click', e => { L.DomEvent.stopPropagation(e); selectPoint(n.lat, n.lng, n.name, id, false); });
    m.bindTooltip(n.name, { permanent: false, direction: 'top', offset: [0, -28] });
    markerObjects[id] = m;
  }
}

async function loadGeoJsonCoordinates() {
  try {
    const resp = await fetch('export.geojson');
    const geojsonData = await resp.json();
    
    geojsonData.features.forEach(feat => {
      const name = feat.properties && feat.properties.name;
      if (!name) return;
      
      const geom = feat.geometry;
      if (!geom || geom.type !== 'Point' || !geom.coordinates) return;
      
      const [lng, lat] = geom.coordinates;
      
      // Cocokkan nama dengan mapping
      for (const id in GEOJSON_MAPPING) {
        if (GEOJSON_MAPPING[id] === name) {
          let finalLat = lat;
          let finalLng = lng;
          
          // Gunakan koordinat klik kustom eksak pengguna demi presisi maksimal
          if (id === 'fteknik') {
            finalLat = -3.75864;
            finalLng = 102.27660;
          } else if (id === 'lab_terpadu') {
            finalLat = -3.75895;
            finalLng = 102.27678;
          } else if (id === 'kedokteran') {
            finalLat = -3.75505;
            finalLng = 102.27797;
          } else if (id === 'gb_v') {
            finalLat = -3.75544;
            finalLng = 102.27645;
          } else if (id === 'gb_i') {
            finalLat = -3.75695;
            finalLng = 102.27383;
          } else if (id === 'gb_iii') {
            finalLat = -3.75640;
            finalLng = 102.27662;
          } else if (id === 'gb_iv') {
            finalLat = -3.75653;
            finalLng = 102.27629;
          } else if (id === 'gedung_bersama') {
            finalLat = -3.75810;
            finalLng = 102.27391;
          } else if (id === 'lptik') {
            finalLat = -3.75843;
            finalLng = 102.27493;
          } else if (id === 'fkip') {
            finalLat = -3.75768;
            finalLng = 102.27498;
          } else if (id === 'stadion') {
            finalLat = -3.75770;
            finalLng = 102.27806;
          } else if (id === 'gsg') {
            finalLat = -3.75774;
            finalLng = 102.27658;
          }
          
          NODES[id].lat = finalLat;
          NODES[id].lng = finalLng;
          
          // Simpan koordinat perutean terpisah
          NODES[id].routingLat = finalLat;
          NODES[id].routingLng = finalLng;
          
          // Tetap gunakan nama asli untuk konsistensi UI
          if (id === 'masjid') {
            NODES[id].name = "Masjid Baitul Hikmah UNIB";
          } else if (id === 'kedokteran') {
            NODES[id].name = "Fakultas Kedokteran";
          } else if (id === 'gb_v') {
            NODES[id].name = "Gedung Bersama (GB) V";
          } else if (id === 'gb_i') {
            NODES[id].name = "Gedung Bersama (GB) I";
          } else if (id === 'gb_iii') {
            NODES[id].name = "Gedung Bersama (GB) III";
          } else if (id === 'gb_iv') {
            NODES[id].name = "Gedung Bersama (GB) IV";
          } else if (id === 'gedung_bersama') {
            NODES[id].name = "Gedung Bersama (GB) II";
          } else if (id === 'lptik') {
            NODES[id].name = "LPTIK UNIB";
          } else if (id === 'fkip') {
            NODES[id].name = "Dekanat FKIP";
          } else if (id === 'stadion') {
            NODES[id].name = "Stadion UNIB";
          } else if (id === 'gsg') {
            NODES[id].name = "Gedung Serba Guna (GSG)";
          } else {
            NODES[id].name = name;
          }
        }
      }
    });
    
    console.log("Koordinat marker berhasil diselaraskan secara dinamis dari export.geojson!");
  } catch (err) {
    console.error("Gagal membaca export.geojson secara dinamis:", err);
  }
  
  // Render POI markers setelah koordinat berhasil diselaraskan
  initMarkers();
}

// Mulai muat koordinat dari GeoJSON secara dinamis
loadGeoJsonCoordinates();

// ── Map click (Klik Bebas pada Jalan/Lahan) ──
map.on('click', e => {
  const poi = findNearestPOI(e.latlng.lat, e.latlng.lng);
  const name = `Titik Peta (${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)})`;
  selectPoint(e.latlng.lat, e.latlng.lng, name, poi, true);
});

// ── UI ──
const hintBar = document.getElementById('hintBar');
const routePanel = document.getElementById('routePanel');
const rpStart = document.getElementById('rpStart');
const rpEnd = document.getElementById('rpEnd');

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.mode === mode));
  if (startPos && endPos) computeAndDraw();
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mode-btn').forEach(btn =>
    btn.addEventListener('click', () => setMode(btn.dataset.mode)));
});

// ── Pilih titik ──
function selectPoint(lat, lng, name, nodeId, isCustom = false) {
  if (pickStep === 0 || pickStep === 1) {
    startPos = { lat, lng, name, nodeId, isCustom };
    endPos = null;
    pickStep = 2;

    rpStart.textContent = name;
    rpStart.classList.remove('placeholder');
    rpEnd.textContent = 'Klik titik tujuan...';
    rpEnd.classList.add('placeholder');
    routePanel.classList.add('visible');
    hintBar.classList.add('hidden');

    if (startM) map.removeLayer(startM);
    startM = L.marker([lat, lng], { icon: makeIcon('#34a853', 16) }).addTo(map);
    clearRouteLines();
    document.getElementById('routeDetail').classList.remove('open');
    showToast(`Asal: ${name} — Klik titik tujuan`);

  } else if (pickStep === 2) {
    endPos = { lat, lng, name, nodeId, isCustom };
    pickStep = 1;

    rpEnd.textContent = name;
    rpEnd.classList.remove('placeholder');

    if (endM) map.removeLayer(endM);
    endM = L.marker([lat, lng], { icon: makeIcon('#ea4335', 16) }).addTo(map);
    computeAndDraw();
  }
}

// ══════════════════════════════════════════════════
// Hitung rute: Dijkstra → path, OSRM → visual
// ══════════════════════════════════════════════════
async function computeAndDraw() {
  clearRouteLines();

  // 1) DIJKSTRA: cari jalur terpendek dari representasi POI terdekat
  const result = dijkstra(startPos.nodeId, endPos.nodeId, currentMode);
  if (!result) {
    showToast('Jalur tidak ditemukan untuk mode ini');
    return;
  }
  const { path, distance: dijkstraDist } = result;

  // 2) Siapkan koordinat OSRM secara langsung dari titik asal ke titik tujuan untuk rute meliuk tanpa detur snapping POI tengah
  const cfg = MODE_CONFIG[currentMode];
  const startLng = startPos.isCustom ? startPos.lng : (NODES[startPos.nodeId].routingLng || NODES[startPos.nodeId].lng);
  const startLat = startPos.isCustom ? startPos.lat : (NODES[startPos.nodeId].routingLat || NODES[startPos.nodeId].lat);
  const endLng = endPos.isCustom ? endPos.lng : (NODES[endPos.nodeId].routingLng || NODES[endPos.nodeId].lng);
  const endLat = endPos.isCustom ? endPos.lat : (NODES[endPos.nodeId].routingLat || NODES[endPos.nodeId].lat);

  const coords = `${startLng},${startLat};${endLng},${endLat}`;
  const url = `https://router.project-osrm.org/route/v1/${cfg.profile}/${coords}?overview=full&geometries=geojson&steps=false`;

  let latlngs, osrmDist, osrmDuration;
  const speeds = { walk: 1.3, motor: 8.3, car: 5.6 }; // Kecepatan realistis m/detik

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code === 'Ok' && data.routes.length) {
      const route = data.routes[0];
      latlngs      = route.geometry.coordinates.map(c => [c[1], c[0]]);
      osrmDist     = Math.round(route.distance);
      // Menghitung waktu tempuh realistis berdasarkan jarak asli jalan dari OSRM
      osrmDuration = Math.round(route.distance / speeds[currentMode]);
    } else throw new Error('No route');
  } catch {
    // Fallback: garis lurus (termasuk titik kustom)
    latlngs = [];
    if (startPos.isCustom) latlngs.push([startPos.lat, startPos.lng]);
    path.forEach(id => latlngs.push([NODES[id].lat, NODES[id].lng]));
    if (endPos.isCustom) latlngs.push([endPos.lat, endPos.lng]);
    
    osrmDist     = dijkstraDist;
    osrmDuration = Math.round(dijkstraDist / speeds[currentMode]);
  }

  // 3) Gambar polyline di peta
  // Tambahkan koordinat visual asli ke awal dan akhir latlngs OSRM agar garis terhubung sempurna ke pin di atas gedung
  const visualLatLngs = [...latlngs];
  if (!startPos.isCustom) {
    visualLatLngs.unshift([NODES[startPos.nodeId].lat, NODES[startPos.nodeId].lng]);
  }
  if (!endPos.isCustom) {
    visualLatLngs.push([NODES[endPos.nodeId].lat, NODES[endPos.nodeId].lng]);
  }

  const shadow = L.polyline(visualLatLngs, { color: cfg.color, weight: 9, opacity: .15 }).addTo(map);
  const line   = L.polyline(visualLatLngs, { color: cfg.color, weight: 5, opacity: 1,
                                            lineJoin: 'round', lineCap: 'round' }).addTo(map);
  pathLayers = [shadow, line];
  // map.fitBounds(line.getBounds(), { padding: [80, 80] });

  // 4) Render detail
  renderSheet(path, osrmDist, osrmDuration, dijkstraDist);
  document.getElementById('routeDetail').classList.add('open');
}

function clearRouteLines() { pathLayers.forEach(l => map.removeLayer(l)); pathLayers = []; }

function resetRoute() {
  pickStep = 0; startPos = endPos = null;
  clearRouteLines();
  if (startM) { map.removeLayer(startM); startM = null; }
  if (endM)   { map.removeLayer(endM);   endM   = null; }
  routePanel.classList.remove('visible');
  hintBar.classList.remove('hidden');
  document.getElementById('routeDetail').classList.remove('open');
}

// ── Format ──
function fmtDist(m) { return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${m} m`; }
function fmtTime(s) {
  if (!s) return '';
  if (s < 60) return '< 1 menit';
  const min = Math.ceil(s / 60);
  return min >= 60 ? `${Math.floor(min/60)} jam ${min%60} mnt` : `~${min} menit`;
}

// Fungsi hitung jarak koordinat bumi (Haversine) dalam meter
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // radius bumi dalam meter
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// ── Render detail rute ──
function renderSheet(path, osrmDist, osrmDuration, dijkstraDist) {
  const el  = document.getElementById('sheetContent');
  const cfg = MODE_CONFIG[currentMode];

  // Konstruksi array timelineItems yang mencerminkan titik kustom sesungguhnya
  const timelineItems = [];

  // 1) Tambah Titik Awal jika Kustom
  if (startPos.isCustom) {
    timelineItems.push({
      name: startPos.name,
      iconType: 'pin',
      sub: 'Titik asal (Kustom)',
      lat: startPos.lat,
      lng: startPos.lng,
      isCustom: true
    });
  }

  // 2) Tambah Semua Node dari Path Dijkstra
  path.forEach((id, i) => {
    const node = NODES[id];
    const isFirst = i === 0 && !startPos.isCustom;
    const isLast = i === path.length - 1 && !endPos.isCustom;
    const sub = isFirst ? 'Titik asal' : isLast ? 'Titik tujuan' : 'Melewati';
    
    timelineItems.push({
      name: node.name,
      iconType: node.iconType,
      sub: sub,
      lat: node.lat,
      lng: node.lng,
      isCustom: false,
      id: id
    });
  });

  // 3) Tambah Titik Tujuan jika Kustom
  if (endPos.isCustom) {
    timelineItems.push({
      name: endPos.name,
      iconType: 'pin',
      sub: 'Titik tujuan (Kustom)',
      lat: endPos.lat,
      lng: endPos.lng,
      isCustom: true
    });
  }

  let stepsHtml = '';
  timelineItems.forEach((item, j) => {
    const isFirst  = j === 0;
    const isLast   = j === timelineItems.length - 1;
    const dotClass = isFirst ? 'first' : isLast ? 'last' : 'mid';
    const showLine = !isLast;

    // Hitung jarak ke node berikutnya
    let distBadge = '';
    if (!isLast) {
      const next = timelineItems[j+1];
      let w = null;
      if (!item.isCustom && !next.isCustom) {
        w = edgeWeight(item.id, next.id, currentMode);
      }
      if (w === null) {
        w = haversineDistance(item.lat, item.lng, next.lat, next.lng);
      }
      distBadge = `<span class="tl-dist-badge">${w} m</span>`;
    }

    // Gunakan icon kustom atau dari jenis POI
    const iconSvg = item.isCustom 
      ? `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path fill="${MARKER_COLOR}" d="M12,2a8,8,0,0,0-8,8c0,5.25,8,12,8,12s8-6.75,8-12A8,8,0,0,0,12,2Zm0,11a3,3,0,1,1,3-3A3,3,0,0,1,12,13Z"/></svg>`
      : getIconSvg(item.iconType, MARKER_COLOR, 14);

    stepsHtml += `
      <div class="tl-item">
        <div class="tl-left">
          <div class="tl-dot ${dotClass}"></div>
          ${showLine ? '<div class="tl-line"></div>' : ''}
        </div>
        <div class="tl-right">
          <div class="tl-name">
            ${iconSvg} 
            ${item.name}
          </div>
          <div class="tl-sub">${item.sub}</div>
          ${distBadge}
        </div>
      </div>`;
  });

  const timeStr = fmtTime(osrmDuration);

  el.innerHTML = `
    <div class="route-header">
      <div class="route-dist">${fmtDist(osrmDist)}</div>
      <div class="route-meta">
        <div class="route-meta-title">${startPos.name} → ${endPos.name}</div>
        <div class="route-meta-sub">${cfg.label}${timeStr ? ' • ' + timeStr : ''} • Dijkstra</div>
      </div>
      <button class="close-sheet" onclick="closeSheet()">✕</button>
    </div>
    <div class="steps-label">Rute perjalanan (Dijkstra shortest path)</div>
    <div class="timeline">${stepsHtml}</div>
    <div class="dijkstra-note">
      <small>Graph: ${Object.keys(NODES).length} node, ${EDGES.length} edge — Dijkstra weight: ${dijkstraDist} m</small>
    </div>
  `;
}

// Cari bobot edge terkecil untuk mode tertentu
function edgeWeight(a, b, mode) {
  const edges = graph[a].filter(e => e.to === b && e.modes.includes(mode));
  if (!edges.length) return null;
  return Math.min(...edges.map(e => e.w));
}

function closeSheet() { document.getElementById('routeDetail').classList.remove('open'); }

// ── Toast ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}