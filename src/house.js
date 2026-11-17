/* ===== GEOMETRIA DOMU (wg rzutu: Osiedle Zielona Widawa, Wrocław) =====
   Układ współrzędnych (metry): X → prawo (E), Z → w dół rzutu (S, front z wejściem).
   Początek (0,0) = wewnętrzny lewy-górny (NW) narożnik parteru. Szerokość wewn. W = 5,79 m, głębokość D = 9,72 m.
   Poziom 0 = parter (podłoga y=0), poziom 1 = piętro (podłoga y = 2,85 m). */
const W = 5.79, D = 9.72, TS = 0.25, TF = 0.40, H0 = 2.60, SLAB = 0.25, H1 = 2.55, KNEE = 1.0, CUT = 1.10;
const PROFILE = [[0, 1.0], [0.70, 1.90], [1.40, 2.55]]; // skosy piętra: wysokość sufitu w funkcji odległości od ściany frontowej/tylnej (wg oznaczeń h=190/h=120)
const LEVEL_Y = [0, H0 + SLAB, H0 + SLAB + H1 + SLAB];
// PODDASZE (strych): prostokątna podłoga nad piętrem + dach dwuspadowy (trójkątny przekrój), kalenica wzdłuż osi X
const AZ0 = 1.4, AZ1 = D - 1.4, A_K = 0.4, A_TAN = Math.tan(42 * Math.PI / 180), A_R = A_K + (AZ1 - AZ0) / 2 * A_TAN;
const ceilAt = (l, z) => l === 0 ? H0 : l === 1 ? ceilH(z) : atticH(z);
function atticH(z) { const d = Math.min(z - AZ0, AZ1 - z); return d < 0 ? 0 : Math.min(A_R, A_K + d * A_TAN); }
const EXPLODE = 1.9;

function ceilH(z) {
  const d = Math.max(0, Math.min(z, D - z));
  if (d >= PROFILE[2][0]) return PROFILE[2][1];
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const a = PROFILE[i], b = PROFILE[i + 1];
    if (d <= b[0]) return a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]);
  }
  return PROFILE[2][1];
}

const MAT = {
  plaster: M('#f2eee5', { roughness: 0.95 }), top: M('#1d4d36', { roughness: 0.9 }), ext: M('#d6d2c7', { roughness: 0.95 }),
  slab: M('#b9b6ae', { roughness: 0.95 }), frame: M('#f7f7f5'), door: M('#c9a56b', { roughness: 0.6 }), doorExt: new THREE.MeshStandardMaterial({ color: 0xb9cfe0, transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fd0f0, transparent: true, opacity: 0.30, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
  slope: (op) => new THREE.MeshStandardMaterial({ color: 0xe9eef2, transparent: true, opacity: op, roughness: 0.95, side: THREE.DoubleSide, depthWrite: op > 0.9 }),
  counter: M('#c9a875', { roughness: 0.6 }), cabinet: M('#f3f1ec', { roughness: 0.7 }), steel: M('#9aa3ab', { metalness: 0.7, roughness: 0.35 }),
  fixedBox: M('#dcc9a1', { roughness: 0.8 }), stair: M('#d8c2a0', { roughness: 0.8 }), ground: M('#dfe6dc', { roughness: 1 }), conc: M('#bdbab2', { roughness: 0.95 })
};
let _wood = null, _tile = null;
function canvasTex(draw, size) {
  const c = document.createElement('canvas'); c.width = c.height = size || 512; draw(c.getContext('2d'), c.width);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function woodTex() {
  return _wood || (_wood = canvasTex((x, s) => {
    const rows = 8, ph = s / rows; let seed = 11; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    x.fillStyle = '#9a7a52'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < rows; i++) {
      const off = Math.floor(r() * 2) * (s / 2), L = s / 2;      // dwa deseczki na rząd, przesunięte
      for (let j = 0; j < 2; j++) {
        const k = 0.88 + r() * 0.2;
        x.fillStyle = `rgb(${Math.round(200 * k)},${Math.round(164 * k)},${Math.round(116 * k)})`;
        x.fillRect(((off + j * L) % s), i * ph, L - 2, ph - 2);
      }
      x.fillStyle = 'rgba(80,50,20,0.08)'; for (let k2 = 0; k2 < 6; k2++) x.fillRect(r() * s, i * ph + r() * ph, 30 + r() * 80, 1);
    }
  }));
}
function tileTex() {
  return _tile || (_tile = canvasTex((x, s) => {
    x.fillStyle = '#9ea3a8'; x.fillRect(0, 0, s, s);
    const n = 2, t = s / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = 0.94 + ((i * 3 + j * 5) % 4) * 0.03; x.fillStyle = `rgb(${Math.round(188 * k)},${Math.round(192 * k)},${Math.round(196 * k)})`; x.fillRect(i * t + 2, j * t + 2, t - 4, t - 4); }
  }));
}
const _texCache = new Map();
function floorMat(kind, w, d, tint, emis) {
  const key = kind + '|' + Math.round(w * 20) + '|' + Math.round(d * 20);
  let t = _texCache.get(key);
  if (!t) {
    if (_texCache.size > 160) { _texCache.forEach(v => v.dispose()); _texCache.clear(); }
    const base = kind === 'tile' ? tileTex() : woodTex(); t = base.clone(); t.needsUpdate = true;
    const per = kind === 'tile' ? 1.2 : 1.0; t.repeat.set(w / per, d / per); _texCache.set(key, t);
  }
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 });
  if (tint) m.color.set(tint); if (emis) m.emissive.set(emis);
  return m;
}
/* materiały podłogi do malowania (tryb budowania) */
const FLOOR_KINDS = [
  { n: 'Drewno (domyślne)', tex: 'wood', sw: '#c8a46f' }, { n: 'Ciemny orzech', tex: 'wood', tint: '#8a6a4a', sw: '#7a5a3c' },
  { n: 'Jasne drewno', tex: 'wood', tint: '#ffffff', emis: '#4a4338', sw: '#e6d3b0' }, { n: 'Płytki szare', tex: 'tile', sw: '#a8adb2' },
  { n: 'Płytki białe', tex: 'tile', tint: '#ffffff', emis: '#555555', sw: '#eef0f1' }, { n: 'Płytki czarne', tex: 'tile', tint: '#3a3d42', sw: '#2f3237' },
  { n: 'Beton', color: '#b9b6ae', sw: '#b9b6ae' }, { n: 'Dywan beżowy', color: '#d8ccb4', sw: '#d8ccb4' },
  { n: 'Dywan szary', color: '#9aa0a6', sw: '#9aa0a6' }, { n: 'Dywan zielony', color: '#7fa58a', sw: '#7fa58a' },
  { n: 'Dywan niebieski', color: '#8fa9c6', sw: '#8fa9c6' }, { n: 'Dywan różowy', color: '#d9a9b4', sw: '#d9a9b4' }
];
function floorKindMat(k, w, d) {
  const f = FLOOR_KINDS[k] || FLOOR_KINDS[0];
  return f.tex ? floorMat(f.tex, w, d, f.tint, f.emis) : new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.9 });
}
const WALL_COLORS = ['#f2eee5', '#e8dcc4', '#cfd3d4', '#b7c9b0', '#b8cbe0', '#d9a58b', '#e0c066', '#a65a46', '#3d5a47', '#4a4f55'];
const _wm = {};
function wallSideMat(color, ext) {
  if (color) return _wm[color] || (_wm[color] = M(color, { roughness: 0.95 }));
  return ext ? MAT.ext : MAT.plaster;
}

/* ---------- opisy ścian ---------- */
const R = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });
const WALLS = [
  // ===== PARTER =====
  { l: 0, r: R(-TS, -TF, 0, D + TF), h: H0, ext: 1 }, { l: 0, r: R(W, -TF, W + TS, D + TF), h: H0, ext: 1 },
  { l: 0, r: R(-TS, -TF, W + TS, 0), h: H0, ext: 1, ops: [{ a: 0.99, w: 1.80, sill: 0, hh: 2.2, type: 'door' }, { a: 4.24, w: 0.96, sill: 0, hh: 2.2, type: 'door' }] },
  { l: 0, r: R(-TS, D, W + TS, D + TF), h: H0, ext: 1, ops: [{ a: 0.50, w: 1.20, sill: 0.9, hh: 1.3, type: 'win' }, { a: 2.49, w: 0.88, sill: 0, hh: 2.1, type: 'door' }, { a: 4.54, w: 0.62, sill: 0.9, hh: 1.2, type: 'win' }] },
  { l: 0, r: R(2.19, 7.23, 2.32, D), h: H0 },                                                        // kuchnia | przedsionek
  { l: 0, r: R(2.19, 7.23, W, 7.35), h: H0, ops: [{ a: 2.42, w: 0.90, sill: 0, hh: 2.05, type: 'door' }] },  // przedsionek ↔ salon, dół WC i gosp.
  { l: 0, r: R(4.12, 7.35, 4.24, D), h: H0, ops: [{ a: 7.42, w: 0.90, sill: 0, hh: 2.05, type: 'door' }] }, // przedsionek | gospodarcze
  { l: 0, r: R(3.54, 5.80, 3.66, 7.23), h: H0, ops: [{ a: 6.22, w: 0.80, sill: 0, hh: 2.05, type: 'door' }] }, // WC – lewa ściana
  { l: 0, r: R(3.54, 5.80, W, 5.98), h: H0 },                                                        // WC – górna / podstawa schodów
  { l: 0, r: R(5.54, 5.98, W, 7.23), h: H0 },                                                        // pion przy WC
  { l: 0, r: R(0, 5.65, 0.27, 6.41), h: H0 },                                                        // słup/filar przy lewej ścianie
  { l: 0, r: R(5.03, 2.96, W, 3.84), h: H0 },                                                        // filar przy schodach
  // ===== PIĘTRO (kolana 1,0 m + skosy) =====
  { l: 1, r: R(-TS, -TF, 0, D + TF), h: H1, ext: 1 }, { l: 1, r: R(W, -TF, W + TS, D + TF), h: H1, ext: 1 },
  { l: 1, r: R(-TS, -TF, W + TS, 0), h: KNEE, ext: 1, ops: [{ a: 1.43, w: 0.92, sill: 0.25, hh: 0.75, type: 'win' }] },
  { l: 1, r: R(-TS, D, W + TS, D + TF), h: KNEE, ext: 1, ops: [{ a: 3.58, w: 0.88, sill: 0.25, hh: 0.75, type: 'win' }] },
  { l: 1, r: R(2.83, 0, 3.00, 2.51), h: H1 },                                                        // Pokój 2 | Pokój 3
  { l: 1, r: R(2.11, 2.51, 3.44, 2.66), h: H1 },                                                     // zamknięcie korytarza od góry
  { l: 1, r: R(2.11, 2.66, 2.28, 6.62), h: H1, ops: [{ a: 2.80, w: 0.80, sill: 0, hh: 2.05, type: 'door' }, { a: 4.46, w: 0.82, sill: 0, hh: 2.05, type: 'door' }] },
  { l: 1, r: R(3.27, 2.66, 3.44, 3.88), h: H1, ops: [{ a: 2.80, w: 0.80, sill: 0, hh: 2.05, type: 'door' }] },
  { l: 1, r: R(0, 3.71, 2.28, 3.88), h: H1 },                                                        // Pokój 2 | Łazienka
  { l: 1, r: R(3.44, 3.71, 5.18, 3.88), h: H1 },                                                     // Pokój 3 | schody
  { l: 1, r: R(5.18, 3.29, W, 3.88), h: H1 },                                                        // filar
  { l: 1, r: R(2.28, 5.88, W, 6.03), h: H1, ops: [{ a: 2.40, w: 0.82, sill: 0, hh: 2.05, type: 'door' }] }, // schody / korytarz | Pokój 1
  { l: 1, r: R(0, 6.47, 2.11, 6.62), h: H1 },                                                        // Łazienka | Garderoba
  { l: 1, r: R(1.73, 6.62, 1.84, D), h: H1, ops: [{ a: 7.32, w: 0.82, sill: 0, hh: 2.05, type: 'door' }] }, // Garderoba | Pokój 1
  { l: 1, r: R(0, 4.90, 0.27, 6.47), h: H1 },                                                        // słup w łazience
  // ===== PODDASZE: ściany kolankowe + trójkątne szczyty =====
  { l: 2, r: R(-TS, AZ0 - 0.3, W + TS, AZ0), h: A_K, ext: 1 }, { l: 2, r: R(-TS, AZ1, W + TS, AZ1 + 0.3), h: A_K, ext: 1 },
  { l: 2, r: R(-TS, AZ0, 0, AZ1), h: A_R, ext: 1 }, { l: 2, r: R(W, AZ0, W + TS, AZ1), h: A_R, ext: 1 }
];

/* ---------- drzwi ---------- */
// axis: oś ściany ('x' = ściana pozioma, drzwi wzdłuż X); a = początek otworu; c = współrzędna osi drzwi; swing = ±1 (w którą stronę się otwierają)
const DOORS = [
  { id: 'g-wej', l: 0, label: 'Drzwi wejściowe', axis: 'x', a: 2.49, w: 0.88, c: D - 0.02, leaves: [{ hs: 'start' }], swing: -1, ext: 1 },
  { id: 'g-przed', l: 0, label: 'Przedsionek → salon', axis: 'x', a: 2.42, w: 0.90, c: 7.29, leaves: [{ hs: 'start' }], swing: 1 },
  { id: 'g-wc', l: 0, label: 'Toaleta', axis: 'z', a: 6.22, w: 0.80, c: 3.60, leaves: [{ hs: 'end' }], swing: -1 },
  { id: 'g-gosp', l: 0, label: 'Pom. gospodarcze', axis: 'z', a: 7.42, w: 0.90, c: 4.18, leaves: [{ hs: 'start' }], swing: 1 },
  { id: 'g-taras', l: 0, label: 'Drzwi tarasowe (2-skrzydłowe)', axis: 'x', a: 0.99, w: 1.80, c: 0.02, leaves: [{ hs: 'start', w: 0.9 }, { hs: 'end', w: 0.9 }], swing: 1, ext: 1 },
  { id: 'g-balk', l: 0, label: 'Drzwi ogrodowe (prawe)', axis: 'x', a: 4.24, w: 0.96, c: 0.02, leaves: [{ hs: 'start' }], swing: 1, ext: 1 },
  { id: 'p-p2', l: 1, label: 'Pokój 2', axis: 'z', a: 2.80, w: 0.80, c: 2.195, leaves: [{ hs: 'end' }], swing: -1 },
  { id: 'p-p3', l: 1, label: 'Pokój 3', axis: 'z', a: 2.80, w: 0.80, c: 3.355, leaves: [{ hs: 'end' }], swing: 1 },
  { id: 'p-baz', l: 1, label: 'Łazienka', axis: 'z', a: 4.46, w: 0.82, c: 2.195, leaves: [{ hs: 'start' }], swing: 1 },
  { id: 'p-p1', l: 1, label: 'Pokój 1 (główna sypialnia)', axis: 'x', a: 2.40, w: 0.82, c: 5.955, leaves: [{ hs: 'end' }], swing: 1 },
  { id: 'p-gar', l: 1, label: 'Garderoba', axis: 'z', a: 7.32, w: 0.82, c: 1.785, leaves: [{ hs: 'start' }], swing: -1 }
];
const doorState = {}; DOORS.forEach(d => doorState[d.id] = 'closed');

/* ---- edytowalność: id ścian, powiązanie drzwi ze ścianami, malowana podłoga ---- */
WALLS.forEach((w, i) => { w.id = 'w' + i; });
const ATTIC_BASE = WALLS.filter(w => w.l === 2).map(w => JSON.parse(JSON.stringify(w)));
const wallAxis = w => (w.r.x1 - w.r.x0) >= (w.r.z1 - w.r.z0) ? 'x' : 'z';
const perpMin = w => wallAxis(w) === 'x' ? w.r.z0 : w.r.x0;
const CELL = 0.05, NX = Math.ceil(W / CELL), NZ = Math.ceil(D / CELL);
const FLOORCELLS = [new Map(), new Map(), new Map()]; // klucz = iz*1000+ix → indeks FLOOR_KINDS
function linkDoors() {
  DOORS.forEach(d => {
    if (d.wid) return;
    const w = WALLS.find(w => w.l === d.l && wallAxis(w) === d.axis && (w.ops || []).some(o => o.type === 'door' && Math.abs(o.a - d.a) < 1e-3 && Math.abs(o.w - d.w) < 1e-3) &&
      (() => { const p0 = d.axis === 'x' ? w.r.z0 : w.r.x0, p1 = d.axis === 'x' ? w.r.z1 : w.r.x1; return d.c >= p0 - 0.06 && d.c <= p1 + 0.06; })());
    if (w) { d.wid = w.id; d.cOff = d.c - perpMin(w); const op = w.ops.find(o => o.type === 'door' && Math.abs(o.a - d.a) < 1e-3); op.did = d.id; }
  });
}
linkDoors();
const round3 = v => Math.round(v * 1000) / 1000;
function buildingState() {
  const runs = [];
  [0, 1, 2].forEach(l => { const rows = new Map(); FLOORCELLS[l].forEach((k, key) => { const iz = Math.floor(key / 1000), ix = key % 1000; (rows.get(iz) || rows.set(iz, []).get(iz)).push([ix, k]); });
    [...rows.keys()].sort((a, b) => a - b).forEach(iz => { let cur = null; rows.get(iz).sort((a, b) => a[0] - b[0]).forEach(([ix, k]) => { if (cur && cur[4] === k && ix === cur[3] + 1) cur[3] = ix; else { cur = [l, iz, ix, ix, k]; runs.push(cur); } }); }); });
  return {
    w: WALLS.map(w => ({ id: w.id, l: w.l, r: [w.r.x0, w.r.z0, w.r.x1, w.r.z1].map(round3), h: w.h, ext: w.ext, ops: (w.ops || []).map(o => Object.assign({}, o)), color: w.color, user: w.user })),
    d: DOORS.map(d => JSON.parse(JSON.stringify(d))), f: runs
  };
}
function loadBuilding(o) {
  WALLS.length = 0; DOORS.length = 0; FLOORCELLS.forEach(m => m.clear());
  o.w.forEach(w => WALLS.push({ id: w.id, l: w.l, r: { x0: w.r[0], z0: w.r[1], x1: w.r[2], z1: w.r[3] }, h: w.h, ext: w.ext, ops: w.ops, color: w.color, user: w.user }));
  if (!WALLS.some(w => w.l === 2)) ATTIC_BASE.forEach(w => WALLS.push(JSON.parse(JSON.stringify(w))));
  o.d.forEach(d => { DOORS.push(d); if (!(d.id in doorState)) doorState[d.id] = 'closed'; });
  Object.keys(doorState).forEach(id => { if (!DOORS.some(d => d.id === id)) delete doorState[id]; });
  (o.f || []).forEach(([l, iz, a, b, k]) => { for (let ix = a; ix <= b; ix++) FLOORCELLS[l].set(iz * 1000 + ix, k); });
  let mx = 1000; WALLS.forEach(w => { const n = parseInt(String(w.id).slice(1)); if (n >= mx) mx = n + 1; }); wallSeq = mx;
  let md = 1; DOORS.forEach(d => { const n = parseInt(String(d.id).replace(/\D/g, '')); if (d.id[0] === 'u' && n >= md) md = n + 1; }); doorSeq = md;
}
let wallSeq = 1000, doorSeq = 1;
const ORIGINAL_BUILDING = JSON.stringify(buildingState());

/* ---------- elementy stałe (kuchnia, łazienka, symbole X z rzutu) ---------- */
const FIXED = [
  // KUCHNIA (parter) – układ L: lewa ściana + dolna
  { l: 0, g: 'kuchnia', n: 'Zabudowa kuchenna', r: R(0.03, 6.45, 0.60, 9.72), y1: 0.86, mat: 'cabinet', top: 'counter' },
  { l: 0, g: 'kuchnia', n: 'Zabudowa kuchenna', r: R(0.60, 9.12, 1.50, 9.72), y1: 0.86, mat: 'cabinet', top: 'counter' },
  { l: 0, g: 'kuchnia', n: 'Lodówka', r: R(1.55, 9.07, 2.15, 9.72), y1: 1.85, mat: 'steel' },
  { l: 0, g: 'kuchnia', n: 'Szafki wiszące', r: R(0.03, 6.45, 0.36, 8.80), y0: 1.45, y1: 2.15, mat: 'cabinet', nosolid: 1 },
  // ŁAZIENKA parter
  { l: 0, g: 'wc', n: 'WC', r: R(5.00, 6.02, 5.42, 6.60), y1: 0.40, mat: 'frame', wc: 1 },
  { l: 0, g: 'wc', n: 'Umywalka', r: R(3.97, 6.80, 4.50, 7.18), y1: 0.85, mat: 'frame' },
  // Symbole X z rzutu (zabudowy / szachty – zakładam szafy wnękowe, wysokość 2,0 m)
  { l: 0, g: 'x', n: 'Szachta/szafa (symbol X)', r: R(3.54, 8.74, 4.11, 9.65), y1: 2.2, mat: 'fixedBox' },
  { l: 1, g: 'x', n: 'Zabudowa (symbol X) – Pokój 2', r: R(0, 2.62, 0.59, 3.71), y1: 2.0, mat: 'fixedBox' },
  { l: 1, g: 'x', n: 'Zabudowa (symbol X) – Pokój 3', r: R(5.18, 1.98, W, 3.27), y1: 2.0, mat: 'fixedBox' },
  { l: 1, g: 'x', n: 'Zabudowa (symbol X) – Pokój 1', r: R(3.54, 6.03, 5.52, 6.51), y1: 2.0, mat: 'fixedBox' },
  { l: 1, g: 'x', n: 'Zabudowa (symbol X) – Garderoba', r: R(0.24, 6.64, 1.70, 7.22), y1: 2.0, mat: 'fixedBox' },
  // ŁAZIENKA piętro
  { l: 1, g: 'baz', n: 'Wanna narożna', r: R(0.61, 5.47, 2.08, 6.45), y1: 0.55, mat: 'frame', tub: 1 },
  { l: 1, g: 'baz', n: 'Umywalka', r: R(1.05, 3.88, 1.85, 4.35), y1: 0.85, mat: 'frame' },
  { l: 1, g: 'baz', n: 'WC', r: R(0.27, 5.00, 0.80, 5.42), y1: 0.40, mat: 'frame', wc: 1 }
];

const ROOM_LABELS = [
  { l: 0, t: '1.01 Przedsionek', a: '4,25 m²', x: 3.22, z: 8.45 }, { l: 0, t: '1.02 Salon z aneksem kuch.', a: '43,48 m²', x: 2.9, z: 5.0 },
  { l: 0, t: '1.03 Toaleta', a: '2,22 m²', x: 4.6, z: 6.68 }, { l: 0, t: '1.04 Pom. gosp.', a: '3,70 m²', x: 5.0, z: 7.85 },
  { l: 1, t: '2.01 Korytarz', a: '3,69 m²', x: 2.78, z: 4.9 }, { l: 1, t: '2.02 Pokój 1', a: '11,66 m²', x: 4.2, z: 7.5 },
  { l: 1, t: '2.03 Łazienka', a: '5,00 m²', x: 1.1, z: 5.1 }, { l: 1, t: '2.04 Pokój 2', a: '9,05 m²', x: 1.35, z: 1.8 },
  { l: 1, t: '2.05 Pokój 3', a: '7,64 m²', x: 4.4, z: 1.8 }, { l: 1, t: '2.06 Garderoba', a: '4,00 m²', x: 0.85, z: 8.3 },
  { l: 2, t: 'Poddasze (strych)', a: '≈ 40 m² podłogi', x: 1.7, z: 4.9 }
];
const DIMS = [ // wymiary z rzutu (cm)
  { l: 0, p: [0, 1.1, W, 1.1], t: '579' }, { l: 0, p: [3.3, 0, 3.3, 6.08], t: '608' }, { l: 0, p: [0, 6.85, 3.54, 6.85], t: '354' },
  { l: 0, p: [0, 8.2, 2.19, 8.2], t: '219' }, { l: 0, p: [1.0, 6.08, 1.0, 9.72], t: '364' }, { l: 0, p: [2.32, 7.75, 4.12, 7.75], t: '180' },
  { l: 0, p: [4.24, 7.75, W, 7.75], t: '155' }, { l: 0, p: [3.66, 6.45, 5.54, 6.45], t: '186' }, { l: 0, p: [4.45, 5.98, 4.45, 7.18], t: '120' },
  { l: 0, p: [3.0, 7.35, 3.0, 9.72], t: '237' }, { l: 0, p: [4.1, 3.84, 4.1, 5.80], t: '197' },
  { l: 1, p: [0, 2.3, 2.85, 2.3], t: '285' }, { l: 1, p: [3.0, 2.3, W, 2.3], t: '279' }, { l: 1, p: [1.5, 0, 1.5, 3.72], t: '372' },
  { l: 1, p: [0, 4.05, 2.11, 4.05], t: '211' }, { l: 1, p: [0.9, 3.88, 0.9, 6.45], t: '257' }, { l: 1, p: [2.78, 2.66, 2.78, 5.85], t: '319' },
  { l: 1, p: [1.84, 7.0, W, 7.0], t: '395' }, { l: 1, p: [4.9, 6.03, 4.9, 9.72], t: '373' }, { l: 1, p: [0, 7.2, 1.73, 7.2], t: '173' },
  { l: 1, p: [0.7, 6.62, 0.7, 9.72], t: '312' }
];

/* ---------- budowa ---------- */
const levels = [0, 1, 2].map(i => {
  const group = new THREE.Group(); group.position.y = LEVEL_Y[i];
  const fixed = new THREE.Group(), dims = new THREE.Group(), labels = new THREE.Group(), furn = new THREE.Group(), doorsG = new THREE.Group(), x = new THREE.Group();
  group.add(fixed, dims, labels, furn, doorsG, x);
  return { i, group, fixed, dims, labels, furn, doorsG, xg: x, solids: [], sectors: [] };
});
const stairsGroup = new THREE.Group(); levels[0].group.add(stairsGroup);
const stairs2Group = new THREE.Group(); levels[1].group.add(stairs2Group);
// kopie schodów widoczne przy podglądzie samego piętra / poddasza (żeby otwór w podłodze nie był pustką)
const stairsCopy1 = new THREE.Group(); levels[1].group.add(stairsCopy1); stairsCopy1.position.y = -(H0 + SLAB);
const stairsCopy2 = new THREE.Group(); levels[2].group.add(stairsCopy2); stairsCopy2.position.y = -(H1 + SLAB);
const outside = new THREE.Group();
const houseOpts = { cut: true, roof: false, showX: true, arcs: true, dims: true, labels: true };

function disposeGroup(g) {
  while (g.children.length) {
    const c = g.children.pop();
    c.traverse(n => { if (n.geometry) n.geometry.dispose(); });
  }
}

function mkBox(g, x0, z0, x1, z1, y0, y1, mats, name) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mats);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true; if (name) m.name = name; g.add(m); return m;
}
function wallMats(ext, color) { const s = wallSideMat(color, ext); return [s, s, MAT.top, MAT.top, s, s]; }

function zProfilePiece(g, x0, x1, z0, z1, maxH, ext, color, lvl) { // ściana wzdłuż Z ze skosem (wg PROFILE)
  const pts = [z0]; (lvl === 2 ? [AZ0, D / 2, AZ1] : [0, 0.7, 1.4, D - 1.4, D - 0.7, D]).forEach(z => { if (z > z0 + 1e-3 && z < z1 - 1e-3) pts.push(z); }); pts.push(z1);
  const hh = z => Math.min(maxH, houseOpts.cut ? CUT : 99, lvl === 2 ? atticH(z) : ceilH(z));
  const sh = new THREE.Shape(); sh.moveTo(z0, 0); sh.lineTo(z1, 0);
  for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(pts[i], hh(pts[i]));
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(x1, 0, 0);
  const s = wallSideMat(color, ext);
  const m = new THREE.Mesh(geo, [s, MAT.top]); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}

function buildWall(lv, w) {
  const g = lv.fixed, r = w.r, alongX = (r.x1 - r.x0) >= (r.z1 - r.z0);
  const a0 = alongX ? r.x0 : r.z0, a1 = alongX ? r.x1 : r.z1, c0 = alongX ? r.z0 : r.x0, c1 = alongX ? r.z1 : r.x1;
  let wh = w.h; if (alongX && !w.ext && w.l >= 1) wh = Math.min(wh, ceilAt(w.l, (c0 + c1) / 2));
  const hMax = houseOpts.cut ? Math.min(wh, CUT) : wh;
  const ops = (w.ops || []).filter(o => o.a >= a0 - 1e-6 && o.a + o.w <= a1 + 1e-6).sort((p, q) => p.a - q.a);
  const piece = (s, e, y0, y1) => {
    if (e - s < 0.004 || y1 - y0 < 0.004) return;
    const rr = alongX ? { x0: s, x1: e, z0: c0, z1: c1 } : { x0: c0, x1: c1, z0: s, z1: e };
    let m;
    if (!alongX && w.l >= 1 && y0 === 0 && y1 >= hMax - 1e-6 && !w.noprofile) m = zProfilePiece(g, rr.x0, rr.x1, rr.z0, rr.z1, w.h, w.ext, w.color, w.l);
    else m = mkBox(g, rr.x0, rr.z0, rr.x1, rr.z1, y0, y1, wallMats(w.ext, w.color));
    m.userData.wid = w.id;
  };
  let cur = a0; const solidSegs = [];
  ops.forEach(op => {
    piece(cur, op.a, 0, hMax); solidSegs.push([cur, op.a]);
    const top = op.sill + op.hh;
    if (op.type === 'win') solidSegs.push([op.a, op.a + op.w]);
    if (op.sill > 0) piece(op.a, op.a + op.w, 0, Math.min(op.sill, hMax));
    if (top < hMax) piece(op.a, op.a + op.w, top, hMax);
    if (op.type === 'win' && op.sill < hMax) { // szyba + rama
      const gh = Math.min(top, hMax) - op.sill, ctr = (c0 + c1) / 2;
      const gm = new THREE.Mesh(new THREE.BoxGeometry(alongX ? op.w : 0.02, gh, alongX ? 0.02 : op.w), MAT.glass);
      gm.position.set(alongX ? op.a + op.w / 2 : ctr, op.sill + gh / 2, alongX ? ctr : op.a + op.w / 2); gm.userData.wid = w.id; g.add(gm);
      const f = M('#f7f7f5'); const t = 0.05;
      const fr = (cx, cy, sx, sy) => { const b = new THREE.Mesh(new THREE.BoxGeometry(alongX ? sx : 0.06, sy, alongX ? 0.06 : sx), f); b.position.set(alongX ? op.a + op.w / 2 + cx : ctr, op.sill + gh / 2 + cy, alongX ? ctr : op.a + op.w / 2 + cx); g.add(b); };
      fr(0, gh / 2 - t / 2, op.w, t); fr(0, -gh / 2 + t / 2, op.w, t); fr(-op.w / 2 + t / 2, 0, t, gh); fr(op.w / 2 - t / 2, 0, t, gh); fr(0, 0, t * 0.6, gh);
    }
    cur = op.a + op.w;
  });
  piece(cur, a1, 0, hMax); solidSegs.push([cur, a1]);
  solidSegs.forEach(([s, e]) => { if (e - s > 0.01) lv.solids.push(alongX ? { x0: s, x1: e, z0: c0, z1: c1, kind: 'wall' } : { x0: c0, x1: c1, z0: s, z1: e, kind: 'wall' }); });
}

function buildFloors(lv) {
  const g = lv.fixed;
  if (lv.i === 0) {
    const slab = mkBox(g, -TS, -TF, W + TS, D + TF, -0.22, 0, [MAT.conc, MAT.conc, floorMat('wood', W, D), MAT.conc, MAT.conc, MAT.conc]);
    const wet = (x0, z0, x1, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorMat('tile', x1 - x0, z1 - z0)); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.004, (z0 + z1) / 2); m.receiveShadow = true; g.add(m); };
    wet(2.32, 7.35, 4.12, D); wet(3.66, 5.98, 5.54, 7.23); wet(4.24, 7.35, W, D);
    // (wood top uses slab's top face; UV 0..1 → repeat set on whole slab; nudge by building a separate wood plane for exact scale)
    slab.material[2] = MAT.conc;
    const wp = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat('wood', W, D)); wp.rotation.x = -Math.PI / 2; wp.position.set(W / 2, 0.002, D / 2); wp.receiveShadow = true; g.add(wp);
  } else if (lv.i === 1) {
    const hole = { x0: 3.40, z0: 3.88, x1: W, z1: 5.88 };
    const piece = (x0, z0, x1, z1) => {
      mkBox(g, x0, z0, x1, z1, -SLAB, 0, [MAT.conc, MAT.conc, MAT.conc, MAT.conc, MAT.conc, MAT.conc]);
      const wp = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(x1, W) - Math.max(x0, 0), Math.min(z1, D) - Math.max(z0, 0)), floorMat('wood', Math.min(x1, W) - Math.max(x0, 0), Math.min(z1, D) - Math.max(z0, 0)));
      wp.rotation.x = -Math.PI / 2; wp.position.set((Math.min(x1, W) + Math.max(x0, 0)) / 2, 0.002, (Math.min(z1, D) + Math.max(z0, 0)) / 2); wp.receiveShadow = true; g.add(wp);
    };
    piece(-TS, -TF, W + TS, hole.z0); piece(-TS, hole.z1, W + TS, D + TF); piece(-TS, hole.z0, hole.x0, hole.z1);
    const wet = (x0, z0, x1, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorMat('tile', x1 - x0, z1 - z0)); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.004, (z0 + z1) / 2); g.add(m); };
    wet(0, 3.88, 2.11, 6.47);
    lv.solids.push(Object.assign({ kind: 'hole' }, hole));
  } else {
    const hole = { x0: 3.40, z0: 3.88, x1: W, z1: 5.88 };
    const piece = (x0, z0, x1, z1) => {
      mkBox(g, x0, z0, x1, z1, -SLAB, 0, MAT.conc);
      const ix0 = Math.max(x0, 0), ix1 = Math.min(x1, W), iz0 = Math.max(z0, AZ0), iz1 = Math.min(z1, AZ1);
      if (ix1 > ix0 && iz1 > iz0) { const wp = new THREE.Mesh(new THREE.PlaneGeometry(ix1 - ix0, iz1 - iz0), floorMat('wood', ix1 - ix0, iz1 - iz0)); wp.rotation.x = -Math.PI / 2; wp.position.set((ix0 + ix1) / 2, 0.002, (iz0 + iz1) / 2); wp.receiveShadow = true; g.add(wp); }
    };
    piece(-TS, AZ0 - 0.3, W + TS, hole.z0); piece(-TS, hole.z1, W + TS, AZ1 + 0.3); piece(-TS, hole.z0, hole.x0, hole.z1);
    lv.solids.push(Object.assign({ kind: 'hole' }, hole));
  }
  paintFloorMeshes(lv);
}
function paintFloorMeshes(lv) {
  const cells = FLOORCELLS[lv.i]; if (!cells.size) return;
  const rows = new Map(); cells.forEach((k, key) => { const iz = Math.floor(key / 1000), ix = key % 1000; (rows.get(iz) || rows.set(iz, []).get(iz)).push([ix, k]); });
  const open = new Map(), rects = [];
  [...rows.keys()].sort((a, b) => a - b).forEach(iz => {
    let cur = null; const runs = [];
    rows.get(iz).sort((a, b) => a[0] - b[0]).forEach(([ix, k]) => { if (cur && cur.k === k && ix === cur.ix1 + 1) cur.ix1 = ix; else { cur = { ix0: ix, ix1: ix, k }; runs.push(cur); } });
    runs.forEach(r => { const key = r.ix0 + ':' + r.ix1 + ':' + r.k, o = open.get(key); if (o && o.iz1 === iz - 1) o.iz1 = iz; else { const n = { ix0: r.ix0, ix1: r.ix1, k: r.k, iz0: iz, iz1: iz }; open.set(key, n); rects.push(n); } });
  });
  rects.forEach(r => {
    const x0 = r.ix0 * CELL, x1 = (r.ix1 + 1) * CELL, z0 = r.iz0 * CELL, z1 = (r.iz1 + 1) * CELL;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorKindMat(r.k, x1 - x0, z1 - z0));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.007, (z0 + z1) / 2); m.receiveShadow = true; lv.fixed.add(m);
  });
}

function buildFixed(lv) {
  FIXED.filter(f => f.l === lv.i).forEach(f => {
    if (f.g === 'x' && !houseOpts.showX) return;
    const target = f.g === 'x' ? lv.xg : lv.fixed, r = f.r, y0 = f.y0 || 0, y1 = houseOpts.cut ? Math.min(f.y1, CUT) : f.y1;
    if (y1 <= y0) return;
    if (f.wc || f.tub) {
      const it = { type: f.wc ? 'wc' : 'tub', w: (r.x1 - r.x0) * 100, d: (r.z1 - r.z0) * 100, h: (y1 - y0) * 100, color: '#fff' };
      const m = buildFurniture(it); m.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2); target.add(m);
      if (f.wc && lv.i === 1) m.rotation.y = Math.PI / 2;
    } else if (f.mat === 'cabinet' && f.top) {
      mkBox(target, r.x0, r.z0, r.x1, r.z1, y0, y1 - 0.04, M('#f3f1ec'));
      mkBox(target, r.x0, r.z0, r.x1 + 0.03, r.z1 + 0.03, y1 - 0.04, y1, MAT[f.top]);
    } else mkBox(target, r.x0, r.z0, r.x1, r.z1, y0, y1, MAT[f.mat] || MAT.cabinet);
    if (!f.nosolid) lv.solids.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, kind: 'fixed' });
  });
  if (lv.i === 0) { // płyta grzewcza + zlew
    const hob = new THREE.Group(); hob.position.set(0.30, 0.865, 7.9);
    [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]].forEach(([a, b]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.008, 20), M('#1a1a1a')); c.position.set(a, 0, b); hob.add(c); });
    const hp = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.006, 0.6), M('#222')); hp.position.y = -0.004; hob.add(hp); lv.fixed.add(hob);
    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.4), MAT.steel); sink.position.set(1.0, 0.865, 9.45); lv.fixed.add(sink);
  }
}

function stairSeq(step) { // wspólny układ stopni (U z zabiegami) – parter i strych
  const x0 = 3.40, x1 = 4.89, dx = (x1 - x0) / 6;
  for (let i = 0; i < 6; i++) step(x0 + i * dx, 3.84, x0 + (i + 1) * dx, 4.64);
  step(4.89, 3.84, W, 4.40); step(4.89, 4.40, W, 4.95); step(4.89, 4.95, W, 5.50);
  const dx2 = (x1 - x0) / 7;
  for (let i = 0; i < 7; i++) step(x1 - (i + 1) * dx2, 4.95, x1 - i * dx2, 5.80);
}
function buildStairs() {
  disposeGroup(stairsGroup); disposeGroup(stairs2Group); disposeGroup(stairsCopy1); disposeGroup(stairsCopy2);
  const rh = (H0 + SLAB) / 16; let n = 0;
  stairSeq((xa, za, xb, zb) => { n++; mkBox(stairsGroup, xa, za, xb, zb, 0, n * rh, MAT.stair); mkBox(stairsCopy1, xa, za, xb, zb, 0, n * rh, MAT.stair); });
  mkBox(stairsGroup, 3.40, 4.64, 4.89, 4.67, 0.9, 0.93, M('#3b3b3b')); // poręcz
  levels[0].solids.push({ x0: 3.40, z0: 3.84, x1: W, z1: 5.80, kind: 'stairs' });
  // schody na poddasze: to samo pudło schodowe, odbite (start przy lądowaniu z parteru, wejście na strych od północy)
  const rh2 = (H1 + SLAB) / 16, zc = 3.84 + 5.80; let m = 0;
  stairSeq((xa, za, xb, zb) => { m++; mkBox(stairs2Group, xa, zc - zb, xb, zc - za, 0, m * rh2, MAT.stair); mkBox(stairsCopy2, xa, zc - zb, xb, zc - za, 0, m * rh2, MAT.stair); });
}

function buildDoors(lv) {
  const g = lv.doorsG; disposeGroup(g); lv.sectors = [];
  DOORS.filter(d => d.l === lv.i).forEach(d => {
    const st = doorState[d.id];
    d.leaves.forEach((lf, li) => {
      const lw = lf.w || d.w;
      const hx = d.axis === 'x' ? (lf.hs === 'start' ? d.a : d.a + d.w) : d.c;
      const hz = d.axis === 'x' ? d.c : (lf.hs === 'start' ? d.a : d.a + d.w);
      const cd = d.axis === 'x' ? [lf.hs === 'start' ? 1 : -1, 0] : [0, lf.hs === 'start' ? 1 : -1];
      const od = d.axis === 'x' ? [0, d.swing] : [d.swing, 0];
      lv.sectors.push({ id: d.id, cx: hx, cz: hz, r: lw, cd, od, state: st });
      // łuk
      if (houseOpts.arcs && st !== 'removed') {
        const pts = []; const a0 = Math.atan2(cd[1], cd[0]); let a1 = Math.atan2(od[1], od[0]);
        let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        for (let k = 0; k <= 24; k++) { const a = a0 + da * k / 24; pts.push(new THREE.Vector3(hx + Math.cos(a) * lw, 0.03, hz + Math.sin(a) * lw)); }
        pts.push(new THREE.Vector3(hx, 0.03, hz)); pts.unshift(new THREE.Vector3(hx + cd[0] * lw, 0.03, hz + cd[1] * lw));
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x1d4d36, dashSize: 0.07, gapSize: 0.05 }));
        ln.computeLineDistances(); ln.renderOrder = 5; g.add(ln);
      }
      if (st === 'removed') return;
      const ang = st === 'open' ? Math.PI / 2 : 0;
      const dir = [cd[0] * Math.cos(ang) + od[0] * Math.sin(ang), cd[1] * Math.cos(ang) + od[1] * Math.sin(ang)];
      const pv = new THREE.Group(); pv.position.set(hx, 0, hz); pv.rotation.y = -Math.atan2(dir[1], dir[0]);
      const lh = houseOpts.cut ? CUT : 2.05;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(lw - 0.02, Math.min(lh, 2.05), 0.045), d.ext ? MAT.doorExt : MAT.door);
      leaf.position.set(lw / 2, Math.min(lh, 2.05) / 2, 0); leaf.castShadow = true; leaf.userData.doorId = d.id; pv.add(leaf);
      if (!houseOpts.cut || CUT > 1) { const hd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.07), MAT.steel); hd.position.set(lw - 0.1, 1.0, 0); pv.add(hd); }
      g.add(pv);
    });
  });
}

function sectorContains(s, px, pz) {
  const vx = px - s.cx, vz = pz - s.cz; if (vx * vx + vz * vz > s.r * s.r) return false;
  return vx * s.cd[0] + vz * s.cd[1] >= -1e-6 && vx * s.od[0] + vz * s.od[1] >= -1e-6;
}

function flatText(lines, w, h, opts) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  if (opts && opts.bg) { x.fillStyle = opts.bg; const r = 14; x.beginPath(); x.roundRect ? x.roundRect(2, 2, c.width - 4, c.height - 4, r) : x.rect(2, 2, c.width - 4, c.height - 4); x.fill(); }
  x.fillStyle = (opts && opts.color) || '#14532d'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const fs = (opts && opts.fs) || 46; lines.forEach((t, i) => { x.font = (i === 0 ? '600 ' : '400 ') + (i === 0 ? fs : fs * 0.85) + 'px system-ui, sans-serif'; x.fillText(t, c.width / 2, c.height / (lines.length + 1) * (i + 1)); });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: !(opts && opts.top) }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = (opts && opts.top) ? 40 : 3; return m;
}

const DIM_MAT = new THREE.LineBasicMaterial({ color: 0x111827, depthTest: false });
function dimLine(lv, x1, z1, x2, z2, text) { // architektoniczna linia wymiarowa: kreski ukośne + kreski pomocnicze + wartość w cm
  const y = 0.05, vert = Math.abs(x2 - x1) < 1e-6, P = (x, z) => new THREE.Vector3(x, y, z);
  const L = (a, b) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), DIM_MAT); l.renderOrder = 30; lv.dims.add(l); };
  L(P(x1, z1), P(x2, z2)); const t = 0.07;
  [[x1, z1], [x2, z2]].forEach(([x, z]) => {
    L(vert ? P(x - t, z - t) : P(x - t, z + t), vert ? P(x + t, z + t) : P(x + t, z - t));
    L(vert ? P(x - 0.11, z) : P(x, z - 0.11), vert ? P(x + 0.11, z) : P(x, z + 0.11));
  });
  const lab = flatText([text], 0.8, 0.26, { top: true, bg: 'rgba(255,255,255,0.92)', color: '#111827', fs: 84 });
  lab.position.set((x1 + x2) / 2, y + 0.01, (z1 + z2) / 2); if (vert) lab.rotation.z = Math.PI / 2; lv.dims.add(lab);
}
function computeRooms(l) {
  const g = blockedGrid(l), comp = new Int32Array(NX * NZ).fill(-1), rooms = [];
  for (let s = 0; s < NX * NZ; s++) {
    if (g[s] || comp[s] >= 0) continue;
    const id = rooms.length, q = [s]; comp[s] = id; let n = 0, x0 = 1e9, x1 = -1, z0 = 1e9, z1 = -1;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], ix = c % NX, iz = (c - ix) / NX; n++; x0 = Math.min(x0, ix); x1 = Math.max(x1, ix); z0 = Math.min(z0, iz); z1 = Math.max(z1, iz);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const nx = ix + dx, nz = iz + dz; if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) return; const k = nz * NX + nx; if (!g[k] && comp[k] < 0) { comp[k] = id; q.push(k); } });
    }
    rooms.push({ id, n, x0, x1, z0, z1 });
  }
  return { comp, rooms };
}
function buildAnnotations(lv) {
  disposeGroup(lv.labels); disposeGroup(lv.dims);
  ROOM_LABELS.filter(r => r.l === lv.i).forEach(r => { const m = flatText([r.t, r.a], 1.9, 0.5, { fs: 44 }); m.position.set(r.x, 0.012, r.z); lv.labels.add(m); });
  const { comp, rooms } = computeRooms(lv.i), pad = 5, span = 18, TOL = 0.06;
  const hard = lv.solids.filter(s => s.kind === 'wall' || s.kind === 'hole' || s.kind === 'stairs');
  const snapH = (pos, z, left) => { let b = pos; hard.forEach(s => { if (z > s.z0 && z < s.z1) { const e = left ? s.x1 : s.x0; if (Math.abs(e - pos) < TOL && Math.abs(e - pos) <= Math.abs(b - pos)) b = e; } }); return b; };
  const snapV = (pos, x, top) => { let b = pos; hard.forEach(s => { if (x > s.x0 && x < s.x1) { const e = top ? s.z1 : s.z0; if (Math.abs(e - pos) < TOL && Math.abs(e - pos) <= Math.abs(b - pos)) b = e; } }); return b; };
  rooms.filter(r => r.n * CELL * CELL >= 1.0).forEach(r => {
    let best = null; // najdłuższy poziomy odcinek wewnątrz pomieszczenia blisko jego górnej krawędzi
    const rows = []; for (let iz = r.z0 + pad; iz <= Math.min(r.z1, r.z0 + span); iz++) rows.push(iz); if (!rows.length) rows.push(Math.round((r.z0 + r.z1) / 2));
    rows.forEach(iz => { let s = -1; for (let ix = r.x0; ix <= r.x1 + 1; ix++) { const inn = ix <= r.x1 && comp[iz * NX + ix] === r.id; if (inn && s < 0) s = ix; if (!inn && s >= 0) { const len = ix - s; if (!best || len > best.len) best = { len, a: s, b: ix, iz }; s = -1; } } });
    if (best && best.len * CELL >= 0.6) { const zz = (best.iz + 0.5) * CELL, xa = snapH(best.a * CELL, zz, true), xb = snapH(best.b * CELL, zz, false); dimLine(lv, xa, zz, xb, zz, String(Math.round((xb - xa) * 100))); }
    let bv = null; // najdłuższy pionowy odcinek blisko lewej krawędzi
    const cols = []; for (let ix = r.x0 + pad; ix <= Math.min(r.x1, r.x0 + span); ix++) cols.push(ix); if (!cols.length) cols.push(Math.round((r.x0 + r.x1) / 2));
    cols.forEach(ix => { let s = -1; for (let iz = r.z0; iz <= r.z1 + 1; iz++) { const inn = iz <= r.z1 && comp[iz * NX + ix] === r.id; if (inn && s < 0) s = iz; if (!inn && s >= 0) { const len = iz - s; if (!bv || len > bv.len) bv = { len, a: s, b: iz, ix }; s = -1; } } });
    if (bv && bv.len * CELL >= 0.6) { const xx = (bv.ix + 0.5) * CELL, za = snapV(bv.a * CELL, xx, true), zb = snapV(bv.b * CELL, xx, false); dimLine(lv, xx, za, xx, zb, String(Math.round((zb - za) * 100))); }
  });
  // wymiary całkowite (światło między ścianami) na zewnątrz rzutu
  const z0 = lv.i === 2 ? AZ0 : 0, z1 = lv.i === 2 ? AZ1 : D;
  dimLine(lv, 0, z0 - (lv.i === 2 ? 0.8 : 0.95), W, z0 - (lv.i === 2 ? 0.8 : 0.95), String(Math.round(W * 100)));
  dimLine(lv, -TS - 0.55, z0, -TS - 0.55, z1, String(Math.round((z1 - z0) * 100)));
}

const roofGroup = new THREE.Group(); levels[1].group.add(roofGroup);
const roofGroup2 = new THREE.Group(); levels[2].group.add(roofGroup2);
const SKYLIGHTS = [ // okna połaciowe (z rzutu – zaznaczone przerywaną linią z X)
  { side: 'back', x0: 1.43, x1: 2.35 }, { side: 'back', x0: 3.61, x1: 4.40 }, { side: 'back', x0: 4.48, x1: 5.23 },
  { side: 'front', x0: 3.54, x1: 4.46 }, { side: 'front', x0: 0.97, x1: 1.70 }
];
function slopeStrip(side, x0, x1, d0, d1, mat) {
  const pts = [d0]; [0.7].forEach(v => { if (v > d0 && v < d1) pts.push(v); }); pts.push(d1);
  const pos = [], idx = [];
  pts.forEach((d, i) => { const z = side === 'back' ? d : D - d, y = ceilH(z); pos.push(x0, y, z, x1, y, z); if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
function buildRoof() {
  disposeGroup(roofGroup); disposeGroup(roofGroup2);
  if (houseOpts.cut) return;
  const op = houseOpts.roof ? 1 : 0.30;
  ['back', 'front'].forEach(s => { roofGroup.add(slopeStrip(s, 0, W, 0, 1.4, MAT.slope(op))); });
  SKYLIGHTS.forEach(sk => {
    const m = slopeStrip(sk.side, sk.x0, sk.x1, 0.12, 1.15, new THREE.MeshStandardMaterial({ color: 0x7fb6e8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.1 }));
    m.position.y += 0.01; roofGroup.add(m);
  });
  // dach poddasza: dwuspadowy (trójkątny przekrój), kalenica wzdłuż X
  const rm = () => new THREE.MeshStandardMaterial({ color: 0x8a96a3, transparent: op < 1, opacity: op, side: THREE.DoubleSide, roughness: 0.9, depthWrite: op > 0.9 });
  [[AZ0 - 0.3, A_K, D / 2, A_R], [AZ1 + 0.3, A_K, D / 2, A_R]].forEach(([za, ya, zb, yb]) => {
    const x0 = -TS, x1 = W + TS, pos = [x0, ya, za, x1, ya, za, x1, yb, zb, x0, yb, zb];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
    const m = new THREE.Mesh(g, rm()); m.castShadow = true; roofGroup2.add(m);
  });
}

function buildOutside() {
  disposeGroup(outside);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), MAT.ground); gr.rotation.x = -Math.PI / 2; gr.position.set(W / 2, -0.221, D / 2); gr.receiveShadow = true; outside.add(gr);
  mkBox(outside, 2.02, D + TF, 4.31, D + TF + 1.0, -0.2, 0.0, [MAT.conc, MAT.conc, MAT.conc, MAT.conc, MAT.conc, MAT.conc]); // wejście
  mkBox(outside, 2.02, D + TF + 0.35, 4.31, D + TF + 0.70, -0.2, -0.1, MAT.conc);
  mkBox(outside, 0, -3.0, W, -TF, -0.2, -0.02, [M('#c5b8a0'), M('#c5b8a0'), M('#d2c5ab'), M('#c5b8a0'), M('#c5b8a0'), M('#c5b8a0')]); // taras tył
  const tl = flatText(['Wejście', '▲'], 1.4, 0.8, { color: '#1d4d36', fs: 50 }); tl.position.set(3.16, 0.02, D + TF + 0.5); outside.add(tl);
  // sąsiednie segmenty szeregowca (uproszczone bryły)
  const nb = new THREE.MeshBasicMaterial({ color: 0xcfd6d0, transparent: true, opacity: 0.10, depthWrite: false });
  [-1, 1].forEach(s => { const x0 = s < 0 ? -TS - 6.0 : W + TS; const m = mkBox(outside, x0, -TF, x0 + 6.0, D + TF, -0.22, 5.2, nb); m.castShadow = false; m.receiveShadow = false; m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x9aa7a0, transparent: true, opacity: 0.5 }))); });
}

function rebuildHouse() {
  levels.forEach(lv => { disposeGroup(lv.fixed); disposeGroup(lv.xg); lv.solids = []; });
  WALLS.forEach(w => buildWall(levels[w.l], w));
  buildStairs();
  levels.forEach(lv => { buildFloors(lv); buildFixed(lv); buildDoors(lv); buildAnnotations(lv); });
  buildRoof(); buildOutside();
  levels.forEach(lv => { lv.labels.visible = houseOpts.labels; lv.dims.visible = houseOpts.dims; });
}
