/* ===== APLIKACJA: scena, stan, UI, interakcje ===== */
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const view = $('#view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe7ecf0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa5ad, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 0.5); sun.position.set(-5, 16, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 }); sun.shadow.bias = -0.0004;
sun.target.position.set(W / 2, 0, D / 2); scene.add(sun, sun.target);
levels.forEach(l => scene.add(l.group)); scene.add(outside);

const persp = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
const ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
const ctrlP = new THREE.OrbitControls(persp, renderer.domElement);
const ctrlO = new THREE.OrbitControls(ortho, renderer.domElement);
ctrlP.enableDamping = true; ctrlP.dampingFactor = 0.12; ctrlP.maxPolarAngle = Math.PI / 2 - 0.02; ctrlP.minDistance = 1.5; ctrlP.maxDistance = 40;
ctrlO.enableRotate = false; ctrlO.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; ctrlO.screenSpacePanning = true; ctrlO.minZoom = 0.4; ctrlO.maxZoom = 6;

const S = { // stan aplikacji
  mode: 'orbit', level: 'ground', selected: null, snapGrid: true, snapWall: true, items: [], nextId: 1, drag: null,
  walk: { x: 3.2, z: 9.0, yaw: Math.PI, pitch: 0, keys: {} }, dirty: true, saved: 0
};
let activeCam = persp, activeCtrl = ctrlP;
const LV_KEYS = ['ground', 'upper', 'attic'], LV_NAMES = ['Parter', 'Piętro', 'Poddasze'];
const lvIdx = () => Math.max(0, LV_KEYS.indexOf(S.level));
const levelVisible = l => S.level === 'both' || LV_KEYS[l] === S.level;
const spawnPos = l => l === 2 ? { x: 1.5, z: 4.9 } : l === 1 ? { x: 1.4, z: 1.5 } : { x: 2.9, z: 2.6 };
const levelY = l => l === 0 ? 0 : (S.level === 'both' ? LEVEL_Y[l] + EXPLODE * l : (S.level === 'upper' || S.level === 'attic') ? 0 : LEVEL_Y[l]);
const byId = id => S.items.find(f => f.fid === id);
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const cm = v => Math.round(v * 100);

function resize() {
  const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h);
  persp.aspect = w / h; persp.updateProjectionMatrix();
  const hh = 6.4; ortho.top = hh; ortho.bottom = -hh; ortho.left = -hh * w / h; ortho.right = hh * w / h; ortho.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

/* ---------- widoczność poziomów / tryby kamery ---------- */
function applyLevels() {
  levels.forEach(l => { l.group.visible = levelVisible(l.i); l.group.position.y = levelY(l.i); });
  stairsCopy1.visible = S.level === 'upper'; stairsCopy2.visible = S.level === 'attic';
  outside.visible = true;
  $$('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === S.level));
}
function focusCamera(keepAngle) {
  const y = S.level === 'both' ? 4.0 : 0;
  const t = new THREE.Vector3(W / 2, y, D / 2);
  if (S.mode === 'orbit') {
    if (!keepAngle) persp.position.set(W / 2 - 7 - y, y + 11 + y * 0.6, D / 2 + 9.5 + y);
    ctrlP.target.copy(t); ctrlP.update();
  } else if (S.mode === 'top') {
    ortho.position.set(W / 2, y + 40, D / 2); ortho.up.set(0, 0, -1); ctrlO.target.set(W / 2, y, D / 2); ortho.zoom = 1; ortho.updateProjectionMatrix(); ctrlO.update();
  }
}
function setMode(m) {
  if (m === 'walk' && BUILD.on) setEdit(false);
  S.mode = m;
  ctrlP.enabled = m === 'orbit'; ctrlO.enabled = m === 'top';
  activeCam = m === 'top' ? ortho : persp; activeCtrl = m === 'top' ? ctrlO : ctrlP;
  $$('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  $('#walkhint').style.display = m === 'walk' ? 'block' : 'none';
  if (m === 'walk') {
    if (houseOpts.cut) { S.prevCut = true; houseOpts.cut = false; rebuildHouse(); applyOpts(); syncChecks(); }
    if (S.level === 'both') S.level = 'ground'; applyLevels(); walkTo(lvIdx());
  }
  else {
    if (S.prevCut) { S.prevCut = false; houseOpts.cut = true; rebuildHouse(); applyLevels(); applyOpts(); syncChecks(); }
    focusCamera(m === 'orbit' && !!S.camSet);
  }
  S.camSet = true; resizeTick();
}
function setLevel(l) {
  S.level = l; if (S.selected && !levelVisible(byId(S.selected).level)) select(null);
  applyLevels(); if (S.mode === 'walk') walkTo(lvIdx()); else focusCamera(true); S.dirty = true; renderChecklist(); if (BUILD.on) { hideHover(); buildHUD(); }
}
function resizeTick() { resize(); }

/* ---------- tryb spaceru ---------- */
function walkTo(l) {
  const p = l === 2 ? { x: 2.4, z: 4.9, yaw: Math.PI } : l === 1 ? { x: 2.78, z: 5.0, yaw: Math.PI } : { x: 3.2, z: 9.2, yaw: Math.PI };
  Object.assign(S.walk, p, { pitch: 0, lvl: l });
}
function walkStep(dt) {
  if (S.mode !== 'walk') return;
  const k = S.walk.keys, sp = (k.shift ? 3.2 : 1.6) * dt, w = S.walk;
  let fx = 0, fz = 0;
  const fwd = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0), str = (k.d ? 1 : 0) - (k.a ? 1 : 0);
  const sy = Math.sin(w.yaw), cy = Math.cos(w.yaw);
  fx = (-sy * fwd + cy * str) * sp; fz = (-cy * fwd - sy * str) * sp;
  const lv = levels[w.lvl || 0], r = 0.22;
  const hit = (x, z) => lv.solids.some(s => x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r);
  if (!hit(w.x + fx, w.z)) w.x += fx; if (!hit(w.x, w.z + fz)) w.z += fz;
  if (k.arrowleft) w.yaw += dt * 1.8; if (k.arrowright) w.yaw -= dt * 1.8;
  persp.position.set(w.x, levelY(w.lvl || 0) + 1.70, w.z);
  persp.rotation.order = 'YXZ'; persp.rotation.set(w.pitch, w.yaw, 0);
}

/* ---------- geometria pomocnicza ---------- */
function corners(f) {
  const hw = f.w / 200, hd = f.d / 200, c = Math.cos(f.rot), s = Math.sin(f.rot);
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, lz]) => [f.x + lx * c + lz * s, f.z - lx * s + lz * c]);
}
function aabb(pts) { let a = { x0: 1e9, z0: 1e9, x1: -1e9, z1: -1e9 }; pts.forEach(([x, z]) => { a.x0 = Math.min(a.x0, x); a.x1 = Math.max(a.x1, x); a.z0 = Math.min(a.z0, z); a.z1 = Math.max(a.z1, z); }); return a; }
const rectPoly = r => [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
function polyOverlap(A, B, eps) { // SAT – zwraca true gdy penetracja > eps na każdej osi
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length]; let nx = -(q[1] - p[1]), nz = q[0] - p[0]; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    A.forEach(v => { const d = v[0] * nx + v[1] * nz; a0 = Math.min(a0, d); a1 = Math.max(a1, d); });
    B.forEach(v => { const d = v[0] * nx + v[1] * nz; b0 = Math.min(b0, d); b1 = Math.max(b1, d); });
    if (Math.min(a1, b1) - Math.max(a0, b0) <= eps) return false;
  }
  return true;
}
function pointInPoly(p, P) { // wypukły wielokąt
  let sign = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (c !== 0) { if (sign && Math.sign(c) !== sign) return false; sign = Math.sign(c); } } return true;
}
function doorHit(f, lv) {
  const P = corners(f);
  for (const s of lv.sectors) {
    if (s.state === 'removed') continue;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { // próbkowanie obrysu
      const a = i / 8, b = j / 8; const x = P[0][0] + (P[1][0] - P[0][0]) * a + (P[3][0] - P[0][0]) * b, z = P[0][1] + (P[1][1] - P[0][1]) * a + (P[3][1] - P[0][1]) * b;
      if (sectorContains(s, x, z)) return s;
    }
    const a0 = Math.atan2(s.cd[1], s.cd[0]); let da = Math.atan2(s.od[1], s.od[0]) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= 12; k++) for (const rr of [0.4, 0.75, 1]) { const a = a0 + da * k / 12; if (pointInPoly([s.cx + Math.cos(a) * s.r * rr, s.cz + Math.sin(a) * s.r * rr], P)) return s; }
  }
  return null;
}
const IGNORE_TYPES = f => f.type === 'rug';
function ignorePair(a, b) {
  const t = [a.type, b.type];
  if (t.includes('chair') && (t.includes('desk') || t.includes('table'))) return true;
  if (IGNORE_TYPES(a) || IGNORE_TYPES(b)) return true;
  return false;
}

/* ---------- ocena kolizji ---------- */
function evaluate() {
  S.dirty = false;
  const vis = S.items.filter(f => f.visible && levelVisible(f.level));
  S.items.forEach(f => { f.status = []; f.info = {}; });
  vis.forEach(f => {
    const P = corners(f), lv = levels[f.level];
    if (lv.solids.some(s => polyOverlap(P, rectPoly(s), 0.012))) f.status.push('wall');
    vis.forEach(g => { if (g !== f && g.level === f.level && !ignorePair(f, g) && polyOverlap(P, corners(g), 0.012)) { if (!f.status.includes('item')) f.status.push('item'); } });
    const ds = doorHit(f, lv); if (ds) { f.status.push('door'); f.info.door = DOORS.find(d => d.id === ds.id).label; }
    if (f.level >= 1) {
      const bb = aabb(P); let allow;
      if (f.level === 1) allow = ceilH(Math.max(0, Math.min(bb.z0, D - bb.z1)));
      else { const dd = Math.min(bb.z0 - AZ0, AZ1 - bb.z1); allow = dd < 0 ? 0 : Math.min(A_R, A_K + dd * A_TAN); }
      if (f.h / 100 > allow + 0.005) { f.status.push('slope'); f.info.allow = allow; }
    }
  });
  S.items.forEach(f => {
    const red = f.status.includes('wall') || f.status.includes('item'), amb = f.status.includes('door') || f.status.includes('slope');
    const col = red ? 0x9b1c1c : (amb ? 0x9a6700 : 0x000000);
    f.obj.traverse(n => { if (n.isMesh && n.material && n.material.emissive && n.userData.furniture) n.material.emissive.setHex(col); });
  });
  renderChecklist(true); updateHUD(); S.saved = performance.now();
}

function distances(f) {
  const bb = aabb(corners(f)), lv = levels[f.level];
  const obs = lv.solids.map(s => Object.assign({ name: s.kind === 'wall' ? 'ściana' : s.kind === 'stairs' ? 'schody' : s.kind === 'hole' ? 'otwór schodów' : 'zabudowa' }, s));
  S.items.forEach(g => { if (g !== f && g.visible && g.level === f.level && g.type !== 'rug') { const b = aabb(corners(g)); obs.push({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, name: g.name }); } });
  const res = { L: null, R: null, U: null, D: null };
  const e = 0.001;
  obs.forEach(o => {
    const zov = o.z1 > bb.z0 + e && o.z0 < bb.z1 - e, xov = o.x1 > bb.x0 + e && o.x0 < bb.x1 - e;
    if (zov && o.x0 >= bb.x1 - 0.02) { const g = o.x0 - bb.x1; if (!res.R || g < res.R.g) res.R = { g, n: o.name }; }
    if (zov && o.x1 <= bb.x0 + 0.02) { const g = bb.x0 - o.x1; if (!res.L || g < res.L.g) res.L = { g, n: o.name }; }
    if (xov && o.z0 >= bb.z1 - 0.02) { const g = o.z0 - bb.z1; if (!res.D || g < res.D.g) res.D = { g, n: o.name }; }
    if (xov && o.z1 <= bb.z0 + 0.02) { const g = bb.z0 - o.z1; if (!res.U || g < res.U.g) res.U = { g, n: o.name }; }
  });
  return res;
}

/* ---------- meble: tworzenie / transformacje ---------- */
function addItem(spec) {
  const f = Object.assign({ fid: S.nextId++, rot: 0, level: 0, visible: true, opts: {}, x: 2.9, z: 3, group: null }, spec);
  f.status = []; f.info = {}; f.obj = buildFurniture(f); f.obj.userData.fid = f.fid;
  levels[f.level].furn.add(f.obj); S.items.push(f); syncObj(f); return f;
}
function rebuildObj(f) {
  f.obj.parent && f.obj.parent.remove(f.obj); f.obj.traverse(n => { if (n.geometry) n.geometry.dispose(); });
  f.obj = buildFurniture(f); f.obj.userData.fid = f.fid; levels[f.level].furn.add(f.obj); syncObj(f);
}
function syncObj(f) { f.obj.position.set(f.x, 0, f.z); f.obj.rotation.y = f.rot; f.obj.visible = f.visible; }
function removeItem(f) { f.obj.parent && f.obj.parent.remove(f.obj); S.items = S.items.filter(g => g !== f); if (S.selected === f.fid) select(null); S.dirty = true; renderChecklist(); }
function setLevelOf(f, l) { if (f.level === l) return; f.obj.parent.remove(f.obj); f.level = l; levels[l].furn.add(f.obj); S.dirty = true; }
function findCat(brand, prefix) { return CATALOG.find(c => c.brand === brand && c.name.startsWith(prefix)); }
function specFromCat(c) { return { cid: c.id, name: c.brand + ' ' + c.name, brand: c.brand, type: c.type, w: c.w, d: c.d, h: c.h, color: c.color || '#cccccc', opts: Object.assign({}, c, { id: undefined, name: undefined }), url: c.url, note: c.note, approx: c.approx }; }

/* ---------- układ domyślny i presety ---------- */
const PI = Math.PI;
const LAYOUT = [
  { id: 'tv', c: ['IKEA', 'BESTÅ szafka RTV'], l: 0, x: 0.23, z: 1.95, rot: PI / 2 },
  { id: 'sofa', c: ['IKEA', 'KIVIK sofa 2-os.'], l: 0, x: W - 0.475 - 0.02, z: 1.95, rot: -PI / 2 },
  { id: 'arm1', c: ['IKEA', 'STRANDMON'], l: 0, x: 3.5, z: 0.9, rot: -PI / 2 },
  { id: 'arm2', c: ['IKEA', 'POÄNG'], l: 0, x: 3.3, z: 3.1, rot: PI },
  { id: 'coffee', c: ['VOX', 'Stolik kawowy 80×80'], l: 0, x: 4.15, z: 1.95, rot: 0 },
  { id: 'dtable', c: ['IKEA', 'EKEDALEN stół rozłożony'], l: 0, x: 1.45, z: 4.7, rot: PI / 2 },
  ...[4.1, 4.7, 5.3].map((z, i) => ({ id: 'chL' + i, c: ['IKEA', 'ADDE'], l: 0, x: 0.80, z, rot: PI / 2, group: 'Krzesła jadalniane ×6' })),
  ...[4.1, 4.7, 5.3].map((z, i) => ({ id: 'chR' + i, c: ['IKEA', 'ADDE'], l: 0, x: 2.10, z, rot: -PI / 2, group: 'Krzesła jadalniane ×6' })),
  { id: 'washer', c: ['IKEA', 'Pralka'], l: 0, x: 5.48, z: 8.10, rot: -PI / 2 },
  { id: 'dryer', c: ['IKEA', 'Suszarka'], l: 0, x: 5.46, z: 8.80, rot: -PI / 2 },
  { id: 'bed1', c: ['IKEA', 'MALM łóżko 160×200'], l: 1, x: W - 1.045 - 0.01, z: 7.95, rot: -PI / 2, label: 'Łóżko 160×200 (Pokój 1)' },
  { id: 'ns1', c: ['IKEA', 'MALM szafka nocna'], l: 1, x: 5.54, z: 6.80, rot: -PI / 2, group: 'Szafki nocne ×2' },
  { id: 'ns2', c: ['IKEA', 'MALM szafka nocna'], l: 1, x: 5.54, z: 9.10, rot: -PI / 2, group: 'Szafki nocne ×2' },
  { id: 'arm3', c: ['IKEA', 'POÄNG'], l: 1, x: 2.85, z: 8.9, rot: PI, label: 'Fotel (Pokój 1)' },
  { id: 'bed2', c: ['IKEA', 'MALM łóżko 90×200'], l: 1, x: 0.55, z: 1.075, rot: 0, label: 'Łóżko 90×200 (Pokój 2)' },
  { id: 'desk2', c: ['IKEA', 'MICKE biurko 105'], l: 1, x: 2.57, z: 1.35, rot: -PI / 2, label: 'Biurko MICKE (Pokój 2)' },
  { id: 'chair2', c: ['IKEA', 'Krzesło biurowe'], l: 1, x: 2.0, z: 1.35, rot: PI / 2, label: 'Krzesło biurowe (Pokój 2)' },
  { id: 'vihals', c: ['IKEA', 'VIHALS biurko 125×74 + 2'], l: 1, x: W - 0.37 - 0.01, z: 1.1, rot: -PI / 2, label: 'VIHALS + 2 monitory (Pokój 3)' },
  { id: 'chair3', c: ['IKEA', 'Krzesło biurowe'], l: 1, x: 4.7, z: 1.1, rot: PI / 2, label: 'Krzesło biurowe (Pokój 3)' },
  { id: 'kallax', c: ['IKEA', 'KALLAX regał 77×39×147'], l: 1, x: 3.215, z: 1.2, rot: PI / 2, label: 'KALLAX 77×39×147 (Pokój 3)' },
  { id: 'bedg', c: ['IKEA', 'MALM łóżko 90×200'], l: 1, x: 4.40, z: 1.1, rot: 0, v: false, label: 'Łóżko gościnne 90×200 (Pokój 3)' },
  { id: 'pax', c: ['IKEA', 'PAX szafa 150'], l: 1, x: 0.30, z: 8.0, rot: PI / 2, label: 'PAX 150 (Garderoba)' }
];
const PRESETS = {
  1: { name: 'Preset 1 – domyślny', desc: 'Salon z jadalnią i sofą, sypialnia w Pokoju 1, biuro w Pokoju 3, dzieciak/gość w Pokoju 2.', o: {} },
  2: { name: 'Preset 2 – biuro w salonie', desc: 'Biurko VIHALS z monitorami przy tylnej ścianie salonu, Pokój 3 → pokój gościnny.', o: { vihals: { l: 0, x: 3.52, z: 0.45, rot: 0 }, chair3: { l: 0, x: 3.52, z: 1.05, rot: PI, label: 'Krzesło biurowe (salon)' }, bedg: { v: true }, kallax: { x: 3.215, z: 1.8 }, arm1: { x: 2.3, z: 2.2 } } },
  3: { name: 'Preset 3 – sypialnia w Pokoju 2', desc: 'Podwójne łóżko w Pokoju 2; Pokój 1 jako gabinet (VIHALS + monitory); łóżko 90 cm w Pokoju 3.', o: {
    bed1: { x: 1.42, z: 1.12, rot: 0 }, ns1: { x: 0.30, z: 0.26, rot: 0 }, ns2: { x: 2.60, z: 0.26, rot: 0 }, bed2: { x: 4.40, z: 1.1, rot: 0 },
    desk2: { v: false }, chair2: { v: false }, bedg: { v: false }, vihals: { l: 1, x: W - 0.38, z: 8.0, rot: -PI / 2 }, chair3: { l: 1, x: 4.75, z: 8.0, rot: PI / 2 } } }
};
function loadPreset(n) {
  S.items.slice().forEach(f => { f.obj.parent && f.obj.parent.remove(f.obj); }); S.items = []; S.selected = null;
  const o = PRESETS[n].o;
  LAYOUT.forEach(L => {
    const c = findCat(L.c[0], L.c[1]); if (!c) { console.warn('brak w katalogu', L.c); return; }
    const ov = o[L.id] || {};
    const spec = Object.assign(specFromCat(c), { key: L.id, level: ov.l !== undefined ? ov.l : L.l, x: ov.x !== undefined ? ov.x : L.x, z: ov.z !== undefined ? ov.z : L.z, rot: ov.rot !== undefined ? ov.rot : L.rot, visible: ov.v !== undefined ? ov.v : (L.v !== false), group: L.group || null });
    if (ov.label || L.label) spec.name = ov.label || L.label;
    addItem(spec);
  });
  S.preset = n; $$('[data-preset]').forEach(b => b.classList.toggle('on', +b.dataset.preset === n)); $('#presetdesc').textContent = PRESETS[n].desc;
  S.dirty = true; renderChecklist(); renderInspector(); save();
}

/* ---------- zaznaczenie, obracanie, przyciąganie ---------- */
const boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0x0ea5e9); boxHelper.visible = false; scene.add(boxHelper);
function select(fid) {
  if (BUILD.on && fid) return;
  S.selected = fid; boxHelper.visible = false;
  if (fid) { const f = byId(fid); if (f) { boxHelper.setFromObject(f.obj); boxHelper.visible = true; } }
  renderInspector(); renderChecklist(true); updateHUD();
}
function snapPos(f) {
  if (S.snapGrid) { f.x = Math.round(f.x / 0.05) * 0.05; f.z = Math.round(f.z / 0.05) * 0.05; }
  if (S.snapWall) {
    const lv = levels[f.level], walls = lv.solids.filter(s => s.kind === 'wall' || s.kind === 'fixed');
    for (let it = 0; it < 2; it++) {
      const bb = aabb(corners(f)); let dx = null, dz = null;
      walls.forEach(s => {
        const zov = s.z1 > bb.z0 + 0.001 && s.z0 < bb.z1 - 0.001, xov = s.x1 > bb.x0 + 0.001 && s.x0 < bb.x1 - 0.001;
        if (zov) { let g = s.x0 - bb.x1; if (g > -0.03 && g < 0.09 && (dx === null || Math.abs(g) < Math.abs(dx))) dx = g; g = s.x1 - bb.x0; if (g < 0.03 && g > -0.09 && (dx === null || Math.abs(g) < Math.abs(dx))) dx = g; }
        if (xov) { let g = s.z0 - bb.z1; if (g > -0.03 && g < 0.09 && (dz === null || Math.abs(g) < Math.abs(dz))) dz = g; g = s.z1 - bb.z0; if (g < 0.03 && g > -0.09 && (dz === null || Math.abs(g) < Math.abs(dz))) dz = g; }
      });
      if (dx !== null) f.x += dx; if (dz !== null) f.z += dz;
    }
  }
}
function rotateSel(dDeg) {
  const f = byId(S.selected); if (!f) return; f.rot = ((f.rot + rad(dDeg)) % (2 * PI) + 2 * PI) % (2 * PI); if (S.snapGrid || S.snapWall) snapPos(f); syncObj(f); S.dirty = true; renderInspector();
}

/* ---------- interakcje myszy ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
function setRay(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, activeCam); }
function pick(e) {
  setRay(e); const objs = S.items.filter(f => f.visible && levelVisible(f.level)).map(f => f.obj);
  const hits = ray.intersectObjects(objs, true); if (!hits.length) return null;
  let o = hits[0].object; while (o && o.userData.fid === undefined) o = o.parent; return o ? byId(o.userData.fid) : null;
}
let downInfo = null, look = null;
view.addEventListener('pointerdown', e => {
  if (e.target !== renderer.domElement || e.button !== 0) return;
  if (S.mode === 'walk') { look = { x: e.clientX, y: e.clientY }; return; }
  if (BUILD.on) { buildDown(e); return; }
  const f = pick(e); downInfo = { x: e.clientX, y: e.clientY, moved: false, hit: !!f };
  if (f) {
    activeCtrl.enabled = false; select(f.fid);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelY(f.level));
    setRay(e); const p = new THREE.Vector3(); ray.ray.intersectPlane(plane, p);
    S.drag = { f, plane, off: { x: f.x - p.x, z: f.z - p.z } };
  }
}, true);
window.addEventListener('pointermove', e => {
  if (look) { S.walk.yaw -= (e.clientX - look.x) * 0.004; S.walk.pitch = Math.max(-1.2, Math.min(1.2, S.walk.pitch - (e.clientY - look.y) * 0.004)); look = { x: e.clientX, y: e.clientY }; return; }
  if (BUILD.on) { if (BUILD.drag || e.target === renderer.domElement) buildMove(e); else hideHover(); return; }
  if (downInfo && (Math.abs(e.clientX - downInfo.x) + Math.abs(e.clientY - downInfo.y) > 4)) downInfo.moved = true;
  if (!S.drag) return;
  setRay(e); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(S.drag.plane, p)) return;
  const f = S.drag.f; f.x = p.x + S.drag.off.x; f.z = p.z + S.drag.off.z; snapPos(f); syncObj(f); S.dirty = true;
});
window.addEventListener('pointerup', e => {
  look = null;
  if (BUILD.on) { buildUp(e); return; }
  if (S.drag) { S.drag = null; activeCtrl.enabled = (S.mode !== 'walk'); renderInspector(); save(); }
  else if (downInfo && !downInfo.moved && !downInfo.hit && S.mode !== 'walk') select(null);
  downInfo = null;
});

/* ---------- klawiatura ---------- */
window.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const k = e.key.toLowerCase();
  if (S.mode === 'walk') { S.walk.keys[k] = true; S.walk.keys.shift = e.shiftKey; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); return; }
  if (k === 'r') { rotateSel(e.shiftKey ? -90 : 90); }
  else if (k === 'e') rotateSel(15); else if (k === 'q') rotateSel(-15);
  else if (k === 'delete' || k === 'backspace') { const f = byId(S.selected); if (f) { f.visible = false; syncObj(f); S.dirty = true; renderChecklist(); } }
  else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k) && S.selected) {
    e.preventDefault(); const f = byId(S.selected), st = e.shiftKey ? 0.01 : 0.05;
    if (k === 'arrowleft') f.x -= st; if (k === 'arrowright') f.x += st; if (k === 'arrowup') f.z -= st; if (k === 'arrowdown') f.z += st; syncObj(f); S.dirty = true; renderInspector();
  }
  else if (k === 'escape') select(null);
});
window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); S.walk.keys[k] = false; S.walk.keys.shift = e.shiftKey; });

/* ---------- UI: lista kontrolna ---------- */
const STATUS_TXT = { wall: ['#dc2626', 'koliduje ze ścianą/zabudową'], item: ['#dc2626', 'nachodzi na inny mebel'], door: ['#d97706', 'w zasięgu otwierania drzwi'], slope: ['#d97706', 'wyższy niż skos'] };
function dotFor(f) { const s = f.status || []; if (s.includes('wall') || s.includes('item')) return 'red'; if (s.length) return 'amb'; return 'ok'; }
function renderChecklist(light) {
  const box = $('#checklist'); if (!box) return;
  if (light && box.dataset.n == S.items.length + ':' + S.items.map(f => f.fid + (f.group || '')).join()) { // tylko aktualizacja kropek / zaznaczenia
    $$('#checklist [data-fid]').forEach(r => { const f = byId(+r.dataset.fid); if (!f) return; r.querySelector('.dot').className = 'dot ' + dotFor(f); r.classList.toggle('sel', S.selected === f.fid); r.querySelector('input').checked = f.visible; });
    return;
  }
  box.dataset.n = S.items.length + ':' + S.items.map(f => f.fid + (f.group || '')).join(); box.innerHTML = '';
  const seen = new Set();
  [0, 1, 2].forEach(l => {
    const list = S.items.filter(f => f.level === l); if (!list.length) return;
    const h = document.createElement('div'); h.className = 'lvhead'; h.textContent = LV_NAMES[l]; box.appendChild(h);
    list.forEach(f => {
      if (f.group) {
        if (seen.has(f.group + l)) return; seen.add(f.group + l);
        const mem = list.filter(g => g.group === f.group), row = document.createElement('label'); row.className = 'row grp';
        row.innerHTML = `<input type="checkbox" ${mem.every(g => g.visible) ? 'checked' : ''}><span class="nm">${f.group}</span><span class="dim">${mem.length} szt.</span>`;
        row.querySelector('input').onchange = ev => { mem.forEach(g => { g.visible = ev.target.checked; syncObj(g); }); S.dirty = true; save(); };
        row.onclick = ev => { if (ev.target.tagName !== 'INPUT') select(mem[0].fid); };
        box.appendChild(row); return;
      }
      const row = document.createElement('label'); row.className = 'row' + (S.selected === f.fid ? ' sel' : ''); row.dataset.fid = f.fid;
      row.innerHTML = `<input type="checkbox" ${f.visible ? 'checked' : ''}><span class="dot ${dotFor(f)}"></span><span class="nm">${f.name}</span><span class="dim">${Math.round(f.w)}×${Math.round(f.d)}×${Math.round(f.h)}</span>`;
      row.querySelector('input').onchange = ev => { f.visible = ev.target.checked; syncObj(f); S.dirty = true; if (!f.visible && S.selected === f.fid) select(null); save(); };
      row.onclick = ev => { if (ev.target.tagName !== 'INPUT') { if (!levelVisible(f.level)) setLevel(LV_KEYS[f.level]); select(f.fid); } };
      box.appendChild(row);
    });
  });
}
function renderInspector() {
  const box = $('#inspector'), f = byId(S.selected);
  box.classList.toggle('empty', !f);
  if (!f) { box.innerHTML = '<p class="muted small" style="margin:0">Kliknij mebel na planie lub na liście, a potem przeciągaj go myszą po podłodze. <kbd>R</kbd> obraca.</p>'; return; }
  box.innerHTML = `
  <div class="insp-title">${f.name}${f.approx ? ' <span class="chip warn">~ orientacyjne</span>' : ''}</div>
  <div class="btnrow" style="margin-top:0"><button id="b_r90" class="primary">⟳ Obróć 90°</button><button id="b_dup">⧉ Duplikuj</button><button id="b_del" class="danger">🗑 Usuń</button></div>
  <label class="small muted">Kondygnacja<select id="b_lvl" style="margin-top:3px">${LV_NAMES.map((n, i) => `<option value="${i}" ${i === f.level ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  <details style="margin:10px 0 0"><summary>Dokładne wymiary i pozycja</summary><div class="in">
    <div class="grid3">
      <label>Szer. (cm)<input id="i_w" type="number" step="0.5" value="${+f.w.toFixed(1)}"></label>
      <label>Głęb. (cm)<input id="i_d" type="number" step="0.5" value="${+f.d.toFixed(1)}"></label>
      <label>Wys. (cm)<input id="i_h" type="number" step="0.5" value="${+f.h.toFixed(1)}"></label>
    </div>
    <div class="grid3">
      <label>X (cm)<input id="i_x" type="number" step="5" value="${cm(f.x)}"></label>
      <label>Z (cm)<input id="i_z" type="number" step="5" value="${cm(f.z)}"></label>
      <label>Obrót (°)<input id="i_r" type="number" step="15" value="${Math.round(deg(f.rot))}"></label>
    </div>
    <div class="btnrow"><button id="b_rm15">↺ −15°</button><button id="b_r15">↻ +15°</button><input id="i_c" type="color" value="${f.color && f.color[0] === '#' ? f.color : '#cccccc'}" title="Kolor"></div>
  </div></details>
  ${f.url ? `<div class="btnrow"><a class="btn" href="${f.url}" target="_blank" rel="noopener">${f.brand === 'VOX' ? 'katalog PDF' : 'sklep / katalog'} ↗</a></div>` : ''}
  ${f.note ? `<p class="muted small" style="margin:4px 0 0">${f.note}</p>` : ''}`;
  const num = id => parseFloat($(id).value);
  const apply = () => { const a = num('#i_w'), b = num('#i_d'), c = num('#i_h'); if (a > 5 && b > 5 && c > 2) { f.w = a; f.d = b; f.h = c; rebuildObj(f); S.dirty = true; renderChecklist(); } };
  ['#i_w', '#i_d', '#i_h'].forEach(id => $(id).onchange = apply);
  ['#i_x', '#i_z', '#i_r'].forEach(id => $(id).onchange = () => { f.x = num('#i_x') / 100; f.z = num('#i_z') / 100; f.rot = rad(num('#i_r')); syncObj(f); S.dirty = true; });
  $('#b_r90').onclick = () => rotateSel(90); $('#b_r15').onclick = () => rotateSel(15); $('#b_rm15').onclick = () => rotateSel(-15);
  $('#b_lvl').onchange = ev => { const nl = +ev.target.value; setLevelOf(f, nl); f.x = Math.min(Math.max(f.x, 0.5), W - 0.5); f.z = Math.min(Math.max(f.z, nl === 2 ? AZ0 + 0.5 : 0.5), nl === 2 ? AZ1 - 0.5 : D - 0.5); syncObj(f); if (!levelVisible(f.level)) setLevel(LV_KEYS[f.level]); renderChecklist(); renderInspector(); save(); };
  $('#i_c').oninput = ev => { f.color = ev.target.value; rebuildObj(f); S.dirty = true; };
  $('#b_dup').onclick = () => { const g = addItem(Object.assign({}, f, { fid: undefined, obj: undefined, x: f.x + 0.3, z: f.z + 0.3, group: null, name: f.name })); renderChecklist(); select(g.fid); S.dirty = true; save(); };
  $('#b_del').onclick = () => { if (confirm('Usunąć „' + f.name + '” z planu?')) { removeItem(f); save(); } };
}
function updateHUD() {
  if (BUILD.on) return;
  const f = byId(S.selected), h = $('#hud');
  if (!f) { h.innerHTML = '<b>Brak zaznaczenia</b><br><span class="muted">Zaznacz mebel, aby zobaczyć odległości od ścian i kolizje.</span>'; return; }
  const d = distances(f), fmt = (x, a) => x ? `<b>${cm(x.g)} cm</b> <span class="muted">${x.n}</span>` : '<span class="muted">—</span>';
  const st = (f.status || []).map(s => `<span class="tag" style="background:${STATUS_TXT[s][0]}">${STATUS_TXT[s][1]}${s === 'door' && f.info.door ? ' (' + f.info.door + ')' : ''}${s === 'slope' ? ' (max ' + cm(f.info.allow) + ' cm)' : ''}</span>`).join(' ') || '<span class="tag ok">OK – bez kolizji</span>';
  h.innerHTML = `<b>${f.name}</b> · ${Math.round(f.w)}×${Math.round(f.d)}×${Math.round(f.h)} cm<br>${st}<div class="dist"><div>◀ ${fmt(d.L)}</div><div>▶ ${fmt(d.R)}</div><div>▲ ${fmt(d.U)}</div><div>▼ ${fmt(d.D)}</div></div>`;
}

/* ---------- katalog ---------- */
const cf = { brand: 'Wszystkie', type: 'Wszystkie', q: '' };
function renderCatalog() {
  const brands = ['Wszystkie', 'IKEA', 'VOX', 'Agata', 'Własne'], types = ['Wszystkie', ...Object.keys(TYPE_LABEL)];
  $('#cat-brands').innerHTML = brands.map(b => `<button class="${cf.brand === b ? 'on' : ''}" data-b="${b}">${b === 'Agata' ? 'Agata Meble' : b}</button>`).join('');
  const sel = $('#cat-type'); sel.innerHTML = types.map(x => `<option value="${x}" ${cf.type === x ? 'selected' : ''}>${x === 'Wszystkie' ? 'Wszystkie rodzaje mebli' : TYPE_LABEL[x]}</option>`).join('');
  sel.onchange = () => { cf.type = sel.value; renderCatalog(); };
  $$('#cat-brands button').forEach(b => b.onclick = () => { cf.brand = b.dataset.b; renderCatalog(); });
  const q = cf.q.toLowerCase();
  const list = CATALOG.filter(c => (cf.brand === 'Wszystkie' || c.brand === cf.brand) && (cf.type === 'Wszystkie' || c.type === cf.type) && (!q || (c.brand + ' ' + c.name).toLowerCase().includes(q)));
  $('#cat-count').textContent = list.length + ' poz.';
  $('#cat-list').innerHTML = list.map(c => `<div class="card"><div class="ct"><span class="bd ${c.brand}">${c.brand}</span> ${c.name}</div><div class="cs">${c.w}×${c.d}×${c.h} cm ${c.approx ? '<span class="chip warn">~</span>' : '<span class="chip ok">✓</span>'} ${TYPE_LABEL[c.type] || ''}</div>${c.note ? `<div class="cn">${c.note}</div>` : ''}<div class="ca"><button data-add="${c.id}">+ Dodaj do planu</button>${c.url ? `<a href="${c.url}" target="_blank" rel="noopener">${c.brand === 'VOX' ? 'katalog PDF' : 'sklep'} ↗</a>` : ''}</div></div>`).join('');
  $$('#cat-list [data-add]').forEach(b => b.onclick = () => {
    const c = CATALOG.find(x => x.id === b.dataset.add); const lvl = lvIdx(), sp = spawnPos(lvl);
    const f = addItem(Object.assign(specFromCat(c), { level: lvl, x: sp.x, z: sp.z }));
    if (!levelVisible(lvl)) setLevel(LV_KEYS[lvl]); renderChecklist(); select(f.fid); S.dirty = true; save(); toast('Dodano: ' + f.name);
  });
}

function renderDoors() {
  $('#doorlist').innerHTML = DOORS.map(d => `<div class="door"><div class="dn">${d.l ? '↑' : '⌂'} ${d.label}<span class="muted"> · ${Math.round(d.w * 100)} cm</span></div><div class="seg" data-door="${d.id}">${[['closed', 'Zamknięte'], ['open', 'Otwarte 90°'], ['removed', 'Brak']].map(([v, t]) => `<button class="${doorState[d.id] === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>`).join('');
  $$('#doorlist .seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => { doorState[sg.dataset.door] = b.dataset.v; levels.forEach(buildDoors); S.dirty = true; renderDoors(); save(); }));
}

/* ---------- opcje widoku ---------- */
function syncChecks() { $$('[data-opt]').forEach(c => c.checked = c.dataset.opt in houseOpts ? houseOpts[c.dataset.opt] : S[c.dataset.opt]); }
function applyOpts() {
  levels.forEach(lv => { lv.labels.visible = houseOpts.labels; lv.dims.visible = houseOpts.dims; lv.xg.visible = houseOpts.showX; });
}
$$('[data-opt]').forEach(c => c.onchange = () => {
  const k = c.dataset.opt;
  if (k in houseOpts) { houseOpts[k] = c.checked; if (['cut', 'roof', 'showX', 'arcs'].includes(k)) { rebuildHouse(); applyLevels(); applyOpts(); } else applyOpts(); }
  else S[k] = c.checked;
  S.dirty = true; save();
});
$$('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$$('[data-level]').forEach(b => b.onclick = () => setLevel(b.dataset.level));
$$('[data-preset]').forEach(b => b.onclick = () => loadPreset(+b.dataset.preset));
$('#cat-q').oninput = e => { cf.q = e.target.value; renderCatalog(); };
$('#btn-side').onclick = () => document.body.classList.toggle('sideoff');
$('#btn-menu').onclick = e => { e.stopPropagation(); const m = $('#menu'); m.classList.toggle('open'); const r = $('#btn-menu').getBoundingClientRect(); m.style.position = 'fixed'; m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.max(8, Math.min(r.left, innerWidth - 280)) + 'px'; m.style.right = 'auto'; };
document.addEventListener('click', e => { if (!e.target.closest('#menuwrap') || e.target.closest('#menu button')) $('#menu').classList.remove('open'); });
$$('[data-dlg]').forEach(b => b.onclick = () => $('#' + b.dataset.dlg).showModal());
$$('dialog [data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
$('#btn-all').onclick = () => setLevel('both');
function showPanel(n) { $('#panel-layout').style.display = n === 'layout' ? 'block' : 'none'; $('#panel-build').style.display = n === 'build' ? 'block' : 'none'; }
$('#welcome-ok').onclick = () => { $('#welcome').style.display = 'none'; try { localStorage.setItem('zw-welcomed', '1'); } catch (e) { } };
$('#btn-reset').onclick = () => { if (confirm('Przywrócić układ domyślny (Preset 1) i drzwi?')) { DOORS.forEach(d => doorState[d.id] = 'closed'); levels.forEach(buildDoors); renderDoors(); loadPreset(1); } };
$('#custom-form').onsubmit = e => {
  e.preventDefault(); const v = id => parseFloat($(id).value);
  const lvl = lvIdx(), sp = spawnPos(lvl);
  const f = addItem({ name: ($('#cb-name').value || 'Klocek'), type: 'box', brand: 'Własne', w: v('#cb-w'), d: v('#cb-d'), h: v('#cb-h'), color: $('#cb-c').value, level: lvl, x: sp.x, z: sp.z });
  renderChecklist(); select(f.fid); S.dirty = true; save();
};

/* ---------- zapis / odczyt / udostępnianie ---------- */
function slimItem(f) {
  const c = f.cid && CATALOG.find(x => x.id === f.cid), o = { n: f.name, x: round3(f.x), z: round3(f.z), r: round3(f.rot), l: f.level };
  if (!f.visible) o.v = 0; if (f.group) o.g = f.group; if (f.key) o.k = f.key;
  if (c) { o.c = f.cid; if (f.w !== c.w) o.w = f.w; if (f.d !== c.d) o.d = f.d; if (f.h !== c.h) o.h = f.h; if (f.color !== (c.color || '#cccccc')) o.col = f.color; }
  else { o.t = f.type; o.w = f.w; o.d = f.d; o.h = f.h; o.col = f.color; }
  return o;
}
function fromSlim(o) {
  let spec;
  if (o.c) { const c = CATALOG.find(x => x.id === o.c); if (!c) return null; spec = specFromCat(c); if (o.w) spec.w = o.w; if (o.d) spec.d = o.d; if (o.h) spec.h = o.h; if (o.col) spec.color = o.col; }
  else spec = { type: o.t, brand: 'Własne', w: o.w, d: o.d, h: o.h, color: o.col, opts: {} };
  return Object.assign(spec, { name: o.n, x: o.x, z: o.z, rot: o.r, level: o.l, visible: o.v !== 0, group: o.g || null, key: o.k });
}
function serialize() {
  const ds = {}; Object.keys(doorState).forEach(k => { if (doorState[k] !== 'closed') ds[k] = doorState[k]; });
  const ho = {}; ['cut', 'roof', 'showX', 'arcs', 'dims', 'labels'].forEach(k => ho[k] = houseOpts[k] ? 1 : 0);
  return { v: 2, i: S.items.map(slimItem), d: ds, b: buildingState(), o: ho, s: [S.snapGrid ? 1 : 0, S.snapWall ? 1 : 0], p: S.preset || 0 };
}
function deserialize(o) {
  if (o.v !== 2) throw new Error('nieznana wersja pliku');
  S.items.slice().forEach(f => f.obj.parent && f.obj.parent.remove(f.obj)); S.items = []; S.selected = null; boxHelper.visible = false;
  if (o.b) loadBuilding(o.b);
  Object.keys(doorState).forEach(k => doorState[k] = 'closed'); Object.assign(doorState, o.d || {});
  if (o.o) Object.keys(o.o).forEach(k => houseOpts[k] = !!o.o[k]);
  if (o.s) { S.snapGrid = !!o.s[0]; S.snapWall = !!o.s[1]; }
  BUILD.undo = []; BUILD.redo = [];
  rebuildHouse(); applyLevels(); applyOpts(); syncChecks(); renderDoors();
  o.i.forEach(i => { const s = fromSlim(i); if (s) addItem(s); });
  S.preset = o.p || null; $$('[data-preset]').forEach(b => b.classList.toggle('on', +b.dataset.preset === S.preset)); $('#presetdesc').textContent = S.preset ? PRESETS[S.preset].desc : 'Układ własny (wczytany/zmieniony).';
  S.dirty = true; renderChecklist(); renderInspector(); updateBuildUI();
}
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
async function pipeStream(u8, stream) { const w = stream.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(stream.readable).arrayBuffer()); }
async function encodeState() { const raw = new TextEncoder().encode(JSON.stringify(serialize())); return window.CompressionStream ? 'z' + b64(await pipeStream(raw, new CompressionStream('deflate-raw'))) : 'j' + b64(raw); }
async function decodeState(code) { const u = unb64(code.slice(1)); const raw = code[0] === 'z' ? await pipeStream(u, new DecompressionStream('deflate-raw')) : u; return JSON.parse(new TextDecoder().decode(raw)); }
let saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    try { const code = await encodeState(); try { localStorage.setItem('zw-planner-v2', code); } catch (e) { } S.lastHash = '#p=' + code; history.replaceState(null, '', S.lastHash); } catch (e) { }
  }, 500);
}
window.addEventListener('hashchange', async () => {
  const h = location.hash; if (h === S.lastHash || !h.startsWith('#p=')) return;
  try { deserialize(await decodeState(h.slice(3))); S.lastHash = h; toast('Wczytano układ z linku'); } catch (e) { }
});
$('#btn-share').onclick = async () => {
  const code = await encodeState(), url = location.href.split('#')[0] + '#p=' + code;
  try { await navigator.clipboard.writeText(url); toast('Link skopiowany (' + Math.round(url.length / 100) / 10 + ' tys. znaków) – wyślij go bratu'); } catch (e) { prompt('Skopiuj ten link i wyślij bratu:', url); }
};
$('#btn-export').onclick = () => { const b = new Blob([JSON.stringify(serialize())], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'zielona-widawa-uklad.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
$('#btn-import').onclick = () => $('#file-import').click();
$('#file-import').onchange = e => { const fl = e.target.files[0]; if (!fl) return; const r = new FileReader(); r.onload = () => { try { deserialize(JSON.parse(r.result)); save(); toast('Wczytano układ'); } catch (err) { alert('Nieprawidłowy plik: ' + err.message); } }; r.readAsText(fl); e.target.value = ''; };
$('#btn-shot').onclick = () => { renderer.render(scene, activeCam); const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'zielona-widawa-widok.png'; a.click(); };
let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => el.style.opacity = 0, 2600); }

/* ---------- pętla ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S.mode === 'walk') walkStep(dt); else activeCtrl.update();
  if (S.dirty) evaluate();
  const f = byId(S.selected); if (f && f.visible && levelVisible(f.level)) { boxHelper.setFromObject(f.obj); boxHelper.visible = true; } else boxHelper.visible = false;
  renderer.render(scene, activeCam);
}

/* ---------- start ---------- */
async function init() {
  rebuildHouse(); applyLevels(); applyOpts(); resize(); syncChecks(); renderCatalog(); renderDoors(); initBuild();
  let loaded = false;
  try { const h = location.hash; if (h.startsWith('#p=')) { deserialize(await decodeState(h.slice(3))); S.lastHash = h; loaded = true; toast('Wczytano układ z linku – możesz go edytować i odesłać dalej przyciskiem „Udostępnij”'); } } catch (e) { loaded = false; }
  if (!loaded) { try { const raw = localStorage.getItem('zw-planner-v2'); if (raw) { deserialize(await decodeState(raw)); loaded = S.items.length > 0; } } catch (e) { loaded = false; } }
  if (!loaded) loadPreset(1);
  setMode('orbit'); evaluate(); requestAnimationFrame(frame);
  try { if (!localStorage.getItem('zw-welcomed')) $('#welcome').style.display = 'block'; } catch (e) { $('#welcome').style.display = 'block'; }
}
window.__S = S; // debug
init();
