/* ===== TRYB BUDOWANIA (styl Sims): ściany, drzwi, okna, podłogi, kolory ===== */
const BUILD = { on: false, tool: 'wall', thick: 0.10, doorW: 0.9, winW: 1.2, floor: 0, color: '#e8dcc4', undo: [], redo: [], pre: null, drag: null, hover: null };
const TOOLS = [
  ['wall', '▭ Rysuj ścianę', 'Przeciągnij po podłodze. Siatka 5 cm, przyciąga do innych ścian.'],
  ['select', '↔ Przesuń ścianę', 'Przeciągnij ścianę wewnętrzną w bok – sąsiednie ściany się rozciągają. Ściany zewnętrzne są zablokowane.'],
  ['door', '🚪 Drzwi', 'Kliknij ścianę: drzwi otwierają się w stronę klikniętej połowy ściany. Klik w istniejące drzwi = zmiana zawiasu/kierunku.'],
  ['window', '🪟 Okno', 'Kliknij ścianę, aby wstawić okno.'],
  ['erase', '✖ Usuń', 'Kliknij drzwi/okno albo ścianę wewnętrzną.'],
  ['paint', '🎨 Kolor ścian', 'Wybierz kolor i kliknij ścianę (cała ściana, obie strony).'],
  ['floor', '▦ Podłoga', 'Kliknij pomieszczenie, aby wypełnić je materiałem, albo przeciągnij prostokąt.']
];
const LVNAME = ['Parter', 'Piętro', 'Poddasze'];
const buildLevel = () => S.level === 'attic' ? 2 : S.level === 'upper' ? 1 : 0;
const snap05 = v => Math.round(v / 0.05) * 0.05;

/* ---------- historia ---------- */
const snapshot = () => JSON.stringify(buildingState());
function beginEdit() { BUILD.pre = snapshot(); }
function commitEdit() {
  if (BUILD.pre !== null && snapshot() !== BUILD.pre) { BUILD.undo.push(BUILD.pre); if (BUILD.undo.length > 60) BUILD.undo.shift(); BUILD.redo = []; save(); updateBuildUI(); }
  BUILD.pre = null;
}
function applyBuilding() { rebuildHouse(); applyLevels(); applyOpts(); renderDoors(); S.dirty = true; }
function buildUndo() { if (!BUILD.undo.length) return; BUILD.redo.push(snapshot()); loadBuilding(JSON.parse(BUILD.undo.pop())); applyBuilding(); save(); updateBuildUI(); }
function buildRedo() { if (!BUILD.redo.length) return; BUILD.undo.push(snapshot()); loadBuilding(JSON.parse(BUILD.redo.pop())); applyBuilding(); save(); updateBuildUI(); }
let rbPending = false;
function scheduleRebuild() { if (rbPending) return; rbPending = true; requestAnimationFrame(() => { rbPending = false; applyBuilding(); }); }

/* ---------- picking ---------- */
function pickBuild(e) {
  setRay(e); const lv = levels[buildLevel()];
  const hits = ray.intersectObjects([lv.fixed, lv.doorsG], true);
  for (const h of hits) {
    let o = h.object; while (o && !(o.userData.wid || o.userData.doorId)) o = o.parent;
    if (!o) continue;
    const door = o.userData.doorId ? DOORS.find(d => d.id === o.userData.doorId) : null;
    const w = door ? WALLS.find(x => x.id === door.wid) : WALLS.find(x => x.id === o.userData.wid);
    if (w) return { hit: h, w, door };
  }
  return null;
}
function floorPt(e) {
  setRay(e); const p = new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelY(buildLevel())), p) ? p : null;
}
const alongCoord = (w, pt) => wallAxis(w) === 'x' ? pt.x : pt.z;
const perpCoord = (w, pt) => wallAxis(w) === 'x' ? pt.z : pt.x;
const wallRange = w => wallAxis(w) === 'x' ? [w.r.x0, w.r.x1] : [w.r.z0, w.r.z1];
const wallThick = w => wallAxis(w) === 'x' ? w.r.z1 - w.r.z0 : w.r.x1 - w.r.x0;
const opAt = (w, c) => (w.ops || []).find(o => c >= o.a - 0.03 && c <= o.a + o.w + 0.03);

function snapXZ(l, p) {
  let x = snap05(p.x), z = snap05(p.z); const th = 0.07;
  const xs = [0, W], zs = [0, D]; WALLS.filter(w => w.l === l).forEach(w => { xs.push(w.r.x0, w.r.x1); zs.push(w.r.z0, w.r.z1); });
  let bx = th, bz = th;
  xs.forEach(v => { if (Math.abs(v - p.x) < bx) { bx = Math.abs(v - p.x); x = v; } });
  zs.forEach(v => { if (Math.abs(v - p.z) < bz) { bz = Math.abs(v - p.z); z = v; } });
  return { x: Math.min(Math.max(x, 0), W), z: Math.min(Math.max(z, 0), D) };
}

/* ---------- elementy pomocnicze w scenie ---------- */
const hoverLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x0ea5e9, depthTest: false })); hoverLines.renderOrder = 60; hoverLines.visible = false; hoverLines.frustumCulled = false;
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45, depthTest: false })); ghost.visible = false; ghost.renderOrder = 59;
function showBox(l, x0, z0, x1, z1, y1, color, solid) {
  const lv = levels[l]; const y = lv.group.position.y;
  const pos = new THREE.Vector3((x0 + x1) / 2, y + y1 / 2, (z0 + z1) / 2);
  if (solid) { ghost.position.copy(pos); ghost.scale.set(Math.max(x1 - x0, 0.01), y1, Math.max(z1 - z0, 0.01)); ghost.material.color.set(color); ghost.visible = true; hoverLines.visible = false; return; }
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(x1 - x0, y1, z1 - z0)); g.translate(pos.x, pos.y, pos.z);
  hoverLines.geometry.dispose(); hoverLines.geometry = g; hoverLines.material.color.set(color); hoverLines.visible = true; ghost.visible = false;
}
function hideHover() { hoverLines.visible = false; ghost.visible = false; }

/* ---------- tryb włącz / wyłącz ---------- */
function setEdit(on) {
  BUILD.on = on; $$('[data-edit]').forEach(b => b.classList.toggle('on', (b.dataset.edit === 'build') === on));
  select(null); hideHover();
  if (on) {
    if (S.level === 'both') setLevel('ground');
    if (S.mode === 'walk') setMode('top'); else if (S.mode === 'orbit') setMode('top');
    ctrlP.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; ctrlO.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    showPanel('build');
    renderer.domElement.style.cursor = 'crosshair'; buildHUD();
  } else {
    ctrlP.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; ctrlO.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    renderer.domElement.style.cursor = ''; showPanel('layout'); updateHUD();
  }
}
function setTool(t) { BUILD.tool = t; BUILD.drag = null; hideHover(); updateBuildUI(); buildHUD(); }
function buildHUD(msg) {
  const t = TOOLS.find(x => x[0] === BUILD.tool);
  $('#hud').innerHTML = `<b>Tryb budowania · ${LVNAME[buildLevel()]}</b><br>${msg ? `<span>${msg}</span><br>` : ''}<span class="muted">${t[1]} – ${t[2]}<br>Prawy przycisk myszy = obrót/przesuwanie kamery, kółko = zoom. <kbd>Ctrl</kbd>+<kbd>Z</kbd> cofnij.</span>`;
}
const toastB = m => toast(m);

/* ---------- operacje na modelu ---------- */
function removeOp(w, op) {
  w.ops = w.ops.filter(o => o !== op);
  if (op.did) { const i = DOORS.findIndex(d => d.id === op.did); if (i >= 0) DOORS.splice(i, 1); delete doorState[op.did]; }
}
function removeWall(w) {
  DOORS.filter(d => d.wid === w.id).forEach(d => { delete doorState[d.id]; DOORS.splice(DOORS.indexOf(d), 1); });
  WALLS.splice(WALLS.indexOf(w), 1);
}
function addOpening(w, pt, type, camSide) {
  const [a0, a1] = wallRange(w), width = type === 'door' ? BUILD.doorW : BUILD.winW, axis = wallAxis(w);
  if (a1 - a0 < width + 0.1) return toastB('Ściana jest za krótka (' + cm(a1 - a0) + ' cm)');
  if (type === 'door' && w.h < 2.1) return toastB('Przy skosie zmieści się tylko okno');
  let a = snap05(alongCoord(w, pt) - width / 2); a = Math.min(Math.max(a, a0 + 0.05), a1 - 0.05 - width); a = snap05(a);
  if (a < a0 + 0.04 || a + width > a1 - 0.04) a = a0 + (a1 - a0 - width) / 2;
  if ((w.ops || []).some(o => a < o.a + o.w + 0.05 && a + width > o.a - 0.05)) return toastB('Tu już jest otwór – wybierz wolne miejsce');
  w.ops = w.ops || [];
  const center = perpMin(w) + wallThick(w) / 2, side = perpCoord(w, pt) - center >= 0 ? 1 : -1;
  if (type === 'door') {
    const id = 'u' + (doorSeq++); const hs = (alongCoord(w, pt) - a) > width / 2 ? 'end' : 'start';
    const d = { id, l: w.l, label: 'Drzwi (własne)', axis, a, w: width, c: round3(center), leaves: [{ hs }], swing: side, wid: w.id, cOff: round3(center - perpMin(w)), ext: w.ext ? 1 : 0, user: 1 };
    DOORS.push(d); doorState[id] = 'closed'; w.ops.push({ a, w: width, sill: 0, hh: 2.05, type: 'door', did: id });
  } else {
    const knee = w.h <= 1.1, sill = w.l === 0 ? 0.9 : (knee ? 0.25 : 0.9), hh = w.l === 0 ? 1.3 : (knee ? 0.75 : 1.0);
    w.ops.push({ a, w: width, sill, hh, type: 'win' });
  }
  return true;
}
function flipDoor(d) {
  if (d.leaves.length > 1) { d.swing *= -1; return; }
  const combos = [['start', 1], ['end', 1], ['end', -1], ['start', -1]];
  const cur = combos.findIndex(c => c[0] === d.leaves[0].hs && c[1] === d.swing), nx = combos[(cur + 1) % 4];
  d.leaves[0].hs = nx[0]; d.swing = nx[1];
}

/* ---------- malowanie podłogi ---------- */
function blockedGrid(l) {
  const g = new Uint8Array(NX * NZ), rect = (x0, z0, x1, z1) => {
    const ix0 = Math.max(0, Math.floor(x0 / CELL)), ix1 = Math.min(NX - 1, Math.ceil(x1 / CELL)), iz0 = Math.max(0, Math.floor(z0 / CELL)), iz1 = Math.min(NZ - 1, Math.ceil(z1 / CELL));
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) { const cx = (ix + 0.5) * CELL, cz = (iz + 0.5) * CELL; if (cx > x0 && cx < x1 && cz > z0 && cz < z1) g[iz * NX + ix] = 1; }
  };
  levels[l].solids.forEach(s => { if (s.kind === 'wall' || s.kind === 'hole' || s.kind === 'stairs') rect(s.x0, s.z0, s.x1, s.z1); });
  if (l === 2) { rect(-1, -1, W + 1, AZ0 + 0.0001); rect(-1, AZ1 - 0.0001, W + 1, D + 1); }
  WALLS.filter(w => w.l === l).forEach(w => (w.ops || []).filter(o => o.type === 'door').forEach(o => { if (wallAxis(w) === 'x') rect(o.a, w.r.z0, o.a + o.w, w.r.z1); else rect(w.r.x0, o.a, w.r.x1, o.a + o.w); }));
  return g;
}
function floodRoom(l, x, z) {
  if (x < 0 || z < 0 || x > W || z > D) return [];
  const g = blockedGrid(l), sx = Math.floor(x / CELL), sz = Math.floor(z / CELL), out = [];
  if (sx >= NX || sz >= NZ || g[sz * NX + sx]) return [];
  const seen = new Uint8Array(NX * NZ), q = [sx + sz * NX]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], ix = c % NX, iz = (c - ix) / NX; out.push([ix, iz]);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const nx = ix + dx, nz = iz + dz; if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) return; const k = nz * NX + nx; if (!seen[k] && !g[k]) { seen[k] = 1; q.push(k); } });
  }
  return out;
}
function paintCells(l, cells, kind) {
  const m = FLOORCELLS[l]; cells.forEach(([ix, iz]) => { const key = iz * 1000 + ix; if (kind < 0) m.delete(key); else m.set(key, kind); });
}

/* ---------- zdarzenia myszy w trybie budowania ---------- */
function buildDown(e) {
  const l = buildLevel(), t = BUILD.tool;
  if (t === 'wall' || t === 'floor' || t === 'select') {
    const fp = floorPt(e); if (!fp) return;
    if (t === 'wall') { const s = snapXZ(l, fp); BUILD.drag = { type: 'wall', a: s, b: s }; beginEdit(); activeCtrl.enabled = false; return; }
    if (t === 'floor') { BUILD.drag = { type: 'floor', a: fp, b: fp, moved: false }; beginEdit(); activeCtrl.enabled = false; return; }
    const pk = pickBuild(e);
    if (!pk) return;
    if (pk.w.ext) return toastB('Ściany zewnętrzne i szczytowe są zablokowane');
    beginEdit(); activeCtrl.enabled = false;
    BUILD.drag = { type: 'move', w: pk.w, start: fp, orig: WALLS.map(w => ({ id: w.id, r: Object.assign({}, w.r) })), axis: wallAxis(pk.w) };
    return;
  }
  const pk = pickBuild(e); if (!pk) return;
  const w = pk.w, c = alongCoord(w, pk.hit.point);
  if (t === 'erase') {
    const op = pk.door ? (w.ops || []).find(o => o.did === pk.door.id) : opAt(w, c);
    if (!op && w.ext) return toastB('Ściany zewnętrznej nie można usunąć');
    beginEdit(); if (op) removeOp(w, op); else removeWall(w); commitEdit(); applyBuilding(); return;
  }
  if (t === 'paint') { beginEdit(); if (BUILD.color === WALL_COLORS[0]) delete w.color; else w.color = BUILD.color; commitEdit(); applyBuilding(); return; }
  if (t === 'door' || t === 'window') {
    const op = pk.door ? (w.ops || []).find(o => o.did === pk.door.id) : opAt(w, c);
    beginEdit();
    if (op && op.type === 'door' && t === 'door') { const d = DOORS.find(x => x.id === op.did); if (d) flipDoor(d); }
    else if (op) { BUILD.pre = null; return toastB('Tu już jest otwór'); }
    else if (!addOpening(w, pk.hit.point, t)) { BUILD.pre = null; return; }
    commitEdit(); applyBuilding();
  }
}
function buildMove(e) {
  const l = buildLevel(), d = BUILD.drag, t = BUILD.tool;
  if (!d) { // podgląd
    if (['select', 'erase', 'paint', 'door', 'window'].includes(t)) {
      const pk = pickBuild(e);
      if (!pk) return hideHover();
      const w = pk.w, hy = Math.min(w.h, houseOpts.cut ? CUT : w.h) + 0.02;
      if (t === 'door' || t === 'window') {
        const width = t === 'door' ? BUILD.doorW : BUILD.winW, [a0, a1] = wallRange(w), c = alongCoord(w, pk.hit.point);
        const ex = opAt(w, c); if (ex) { const o = ex; return showBox(l, ...(wallAxis(w) === 'x' ? [o.a, w.r.z0, o.a + o.w, w.r.z1] : [w.r.x0, o.a, w.r.x1, o.a + o.w]), hy, t === 'door' && ex.type === 'door' ? '#f59e0b' : '#ef4444'); }
        let a = Math.min(Math.max(snap05(c - width / 2), a0 + 0.05), a1 - 0.05 - width); const ok = a1 - a0 >= width + 0.1 && !(t === 'door' && w.h < 2.1);
        return showBox(l, ...(wallAxis(w) === 'x' ? [a, w.r.z0, a + width, w.r.z1] : [w.r.x0, a, w.r.x1, a + width]), t === 'door' ? Math.min(2.05, hy) : Math.min(hy, 1.5), ok ? '#22c55e' : '#ef4444', true);
      }
      const bad = (t === 'select' || t === 'erase') && w.ext && !opAt(w, alongCoord(w, pk.hit.point));
      return showBox(l, w.r.x0, w.r.z0, w.r.x1, w.r.z1, hy, bad ? '#ef4444' : '#0ea5e9');
    }
    if (t === 'floor') { const fp = floorPt(e); if (!fp) return; const c = floodRoom(l, fp.x, fp.z); if (!c.length) return hideHover(); let a = 1e9, b = 1e9, x1 = -1, z1 = -1; c.forEach(([ix, iz]) => { a = Math.min(a, ix); b = Math.min(b, iz); x1 = Math.max(x1, ix); z1 = Math.max(z1, iz); }); return showBox(l, a * CELL, b * CELL, (x1 + 1) * CELL, (z1 + 1) * CELL, 0.03, '#0ea5e9'); }
    return hideHover();
  }
  const fp = floorPt(e); if (!fp) return;
  if (d.type === 'wall') {
    let s = snapXZ(l, fp); const dx = Math.abs(s.x - d.a.x), dz = Math.abs(s.z - d.a.z);
    s = dx >= dz ? { x: s.x, z: d.a.z } : { x: d.a.x, z: s.z }; d.b = s;
    const th = BUILD.thick, horiz = dx >= dz, len = Math.hypot(s.x - d.a.x, s.z - d.a.z);
    const r = horiz ? [Math.min(d.a.x, s.x), d.a.z - th / 2, Math.max(d.a.x, s.x), d.a.z + th / 2] : [d.a.x - th / 2, Math.min(d.a.z, s.z), d.a.x + th / 2, Math.max(d.a.z, s.z)];
    showBox(l, r[0], r[1], r[2], r[3], Math.min(houseOpts.cut ? CUT : (l ? H1 : H0), 2.6), '#22c55e', true); buildHUD('Długość: <b>' + cm(len) + ' cm</b>');
  } else if (d.type === 'floor') {
    d.b = fp; d.moved = Math.hypot(fp.x - d.a.x, fp.z - d.a.z) > 0.15;
    if (d.moved) showBox(l, Math.min(d.a.x, fp.x), Math.min(d.a.z, fp.z), Math.max(d.a.x, fp.x), Math.max(d.a.z, fp.z), 0.03, '#22c55e', true);
  } else if (d.type === 'move') {
    const horiz = d.axis === 'x'; let delta = snap05(horiz ? fp.z - d.start.z : fp.x - d.start.x);
    const o = d.orig.find(x => x.id === d.w.id).r, th = horiz ? o.z1 - o.z0 : o.x1 - o.x0;
    const lo = -(horiz ? o.z0 : o.x0), hi = (horiz ? D - o.z1 : W - o.x1); delta = Math.min(Math.max(delta, lo), hi);
    d.delta = delta;
    d.orig.forEach(og => { const w = WALLS.find(x => x.id === og.id); if (w) Object.assign(w.r, og.r); });
    const W0 = d.orig.find(x => x.id === d.w.id).r;
    if (horiz) { d.w.r.z0 = W0.z0 + delta; d.w.r.z1 = W0.z1 + delta; } else { d.w.r.x0 = W0.x0 + delta; d.w.r.x1 = W0.x1 + delta; }
    // rozciągnij prostopadłe ściany stykające się z przesuwaną
    WALLS.forEach(v => {
      if (v === d.w || v.l !== d.w.l || wallAxis(v) === d.axis || v.ext) return;
      const ov = d.orig.find(x => x.id === v.id).r;
      if (horiz) { // v pionowa (wzdłuż Z); styka się, jeśli jej koniec przy ścianie W0 i zakres X pokrywa się
        if (ov.x1 < W0.x0 - 0.02 || ov.x0 > W0.x1 + 0.02) return;
        if (Math.abs(ov.z1 - W0.z0) < 0.03) v.r.z1 = ov.z1 + delta; else if (Math.abs(ov.z0 - W0.z1) < 0.03) v.r.z0 = ov.z0 + delta;
        if (v.r.z1 - v.r.z0 < 0.12) { v.r.z0 = ov.z0; v.r.z1 = ov.z1; }
      } else {
        if (ov.z1 < W0.z0 - 0.02 || ov.z0 > W0.z1 + 0.02) return;
        if (Math.abs(ov.x1 - W0.x0) < 0.03) v.r.x1 = ov.x1 + delta; else if (Math.abs(ov.x0 - W0.x1) < 0.03) v.r.x0 = ov.x0 + delta;
        if (v.r.x1 - v.r.x0 < 0.12) { v.r.x0 = ov.x0; v.r.x1 = ov.x1; }
      }
    });
    DOORS.filter(x => x.wid === d.w.id).forEach(x => { x.c = round3(perpMin(d.w) + x.cOff); });
    scheduleRebuild(); buildHUD('Przesunięcie: <b>' + cm(delta) + ' cm</b>');
  }
}
function buildUp(e) {
  const d = BUILD.drag; BUILD.drag = null; if (!d) return;
  activeCtrl.enabled = true; hideHover(); const l = buildLevel();
  if (d.type === 'wall') {
    const len = Math.hypot(d.b.x - d.a.x, d.b.z - d.a.z);
    if (len >= 0.2) {
      const th = BUILD.thick, horiz = Math.abs(d.b.x - d.a.x) >= Math.abs(d.b.z - d.a.z);
      const r = horiz ? { x0: Math.min(d.a.x, d.b.x), z0: d.a.z - th / 2, x1: Math.max(d.a.x, d.b.x), z1: d.a.z + th / 2 } : { x0: d.a.x - th / 2, z0: Math.min(d.a.z, d.b.z), x1: d.a.x + th / 2, z1: Math.max(d.a.z, d.b.z) };
      Object.keys(r).forEach(k => r[k] = round3(r[k]));
      WALLS.push({ id: 'w' + (wallSeq++), l, r, h: l === 2 ? A_R : l === 1 ? H1 : H0, ops: [], user: 1 }); commitEdit(); applyBuilding();
    } else BUILD.pre = null;
  } else if (d.type === 'floor') {
    let cells;
    if (d.moved) {
      const x0 = Math.min(d.a.x, d.b.x), x1 = Math.max(d.a.x, d.b.x), z0 = Math.min(d.a.z, d.b.z), z1 = Math.max(d.a.z, d.b.z); cells = [];
      const g = blockedGrid(l);
      for (let iz = Math.max(0, Math.floor(z0 / CELL)); iz <= Math.min(NZ - 1, Math.floor(z1 / CELL)); iz++) for (let ix = Math.max(0, Math.floor(x0 / CELL)); ix <= Math.min(NX - 1, Math.floor(x1 / CELL)); ix++) if (!g[iz * NX + ix]) cells.push([ix, iz]);
    } else cells = floodRoom(l, d.a.x, d.a.z);
    if (!cells.length) { BUILD.pre = null; return toastB('Tu nie ma podłogi do pomalowania'); }
    paintCells(l, cells, BUILD.floor < 0 ? -1 : BUILD.floor); commitEdit(); applyBuilding();
  } else if (d.type === 'move') { commitEdit(); applyBuilding(); buildHUD(); }
  buildHUD();
}

/* ---------- panel „Budowa” ---------- */
function renderBuildUI() {
  const box = $('#build-ui');
  box.innerHTML = `
  <p class="muted small">Tryb jak w Sims: rysuj i przesuwaj ściany, wstawiaj drzwi/okna, maluj podłogi i ściany. Pracujesz na jednej kondygnacji naraz (przełącznik <b>Parter / Piętro / Poddasze</b> u góry). Najwygodniej w widoku <b>Rzut 2D</b>.</p>
  <h3>Narzędzia</h3><div class="tools" id="b-tools">${TOOLS.map(t => `<button data-tool="${t[0]}">${t[1]}</button>`).join('')}</div>
  <div class="btnrow"><button id="b-undo">↶ Cofnij</button><button id="b-redo">↷ Ponów</button></div>
  <div id="b-opt-wall"><h3>Grubość nowej ściany</h3><div class="seg" id="b-thick">${[0.08, 0.10, 0.12, 0.15, 0.25].map(v => `<button data-v="${v}">${Math.round(v * 100)} cm</button>`).join('')}</div></div>
  <div id="b-opt-door"><h3>Szerokość drzwi</h3><div class="seg" id="b-doorw">${[0.7, 0.8, 0.9, 1.0].map(v => `<button data-v="${v}">${Math.round(v * 100)}</button>`).join('')}</div></div>
  <div id="b-opt-win"><h3>Szerokość okna</h3><div class="seg" id="b-winw">${[0.6, 0.9, 1.2, 1.5, 1.8].map(v => `<button data-v="${v}">${Math.round(v * 100)}</button>`).join('')}</div></div>
  <div id="b-opt-paint"><h3>Kolor ściany</h3><div class="sw" id="b-colors">${WALL_COLORS.map(c => `<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" id="b-color-pick" value="#e8dcc4" title="Własny kolor"></div></div>
  <div id="b-opt-floor"><h3>Materiał podłogi</h3><div class="sw big" id="b-floors">${FLOOR_KINDS.map((f, i) => `<button data-k="${i}" style="background:${f.sw}" title="${f.n}"><span>${f.n}</span></button>`).join('')}<button data-k="-1" class="reset" title="Przywróć domyślną"><span>Usuń malowanie</span></button></div></div>
  <h3>Plan domu</h3><div class="btnrow"><button id="b-reset" class="danger">Przywróć oryginalny plan domu</button></div>
  <p class="muted small">Uwaga: nazwy pomieszczeń i wymiary „z rzutu” zostają oryginalne. Kuchnia, łazienki i schody są elementami stałymi (nie da się ich usunąć). Meble zostają na swoich miejscach.</p>`;
  $$('#b-tools button').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $('#b-undo').onclick = buildUndo; $('#b-redo').onclick = buildRedo;
  $$('#b-thick button').forEach(b => b.onclick = () => { BUILD.thick = +b.dataset.v; updateBuildUI(); });
  $$('#b-doorw button').forEach(b => b.onclick = () => { BUILD.doorW = +b.dataset.v; updateBuildUI(); });
  $$('#b-winw button').forEach(b => b.onclick = () => { BUILD.winW = +b.dataset.v; updateBuildUI(); });
  $$('#b-colors button').forEach(b => b.onclick = () => { BUILD.color = b.dataset.c; setTool('paint'); });
  $('#b-color-pick').oninput = ev => { BUILD.color = ev.target.value; BUILD.tool = 'paint'; updateBuildUI(); };
  $$('#b-floors button').forEach(b => b.onclick = () => { BUILD.floor = +b.dataset.k; setTool('floor'); });
  $('#b-reset').onclick = () => { if (confirm('Przywrócić oryginalny plan domu (ściany, drzwi, podłogi, kolory)? Meble zostaną.')) { beginEdit(); loadBuilding(JSON.parse(ORIGINAL_BUILDING)); commitEdit(); applyBuilding(); } };
  updateBuildUI();
}
function updateBuildUI() {
  $$('#b-tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === BUILD.tool));
  const show = { wall: 'b-opt-wall', door: 'b-opt-door', window: 'b-opt-win', paint: 'b-opt-paint', floor: 'b-opt-floor' };
  Object.values(show).forEach(id => { const el = $('#' + id); if (el) el.style.display = 'none'; });
  if (show[BUILD.tool]) $('#' + show[BUILD.tool]).style.display = 'block';
  $$('#b-thick button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - BUILD.thick) < 1e-6));
  $$('#b-doorw button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - BUILD.doorW) < 1e-6));
  $$('#b-winw button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - BUILD.winW) < 1e-6));
  $$('#b-colors button').forEach(b => b.classList.toggle('on', b.dataset.c === BUILD.color));
  $$('#b-floors button').forEach(b => b.classList.toggle('on', +b.dataset.k === BUILD.floor));
  const u = $('#b-undo'), r = $('#b-redo'); if (u) { u.disabled = !BUILD.undo.length; r.disabled = !BUILD.redo.length; }
}
function initBuild() {
  scene.add(hoverLines, ghost); renderBuildUI();
  $$('[data-edit]').forEach(b => b.onclick = () => setEdit(b.dataset.edit === 'build'));
  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (!BUILD.on) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? buildRedo() : buildUndo(); }
    else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); buildRedo(); }
    else if (k === 'escape') { BUILD.drag = null; hideHover(); activeCtrl.enabled = true; BUILD.pre = null; }
    else { const m = { w: 'wall', v: 'select', d: 'door', o: 'window', x: 'erase', c: 'paint', f: 'floor' }[k]; if (m && !e.ctrlKey && !e.metaKey) setTool(m); }
  }, true);
}
