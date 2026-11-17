/* ===== PROCEDURALNE MODELE MEBLI (jednostki: metry; przód mebla = +Z, tył = -Z; podłoga y=0) ===== */
const M = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.8, metalness: 0.02 }, o || {}));
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

function bx(g, w, h, d, x, y, z, mat) { // y = dół bryły
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function cyl(g, r, h, x, y, z, mat, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 20), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = true; g.add(m); return m;
}

function buildFurniture(it) {
  const g = new THREE.Group();
  const w = it.w / 100, d = it.d / 100, h = it.h / 100;
  const col = it.color || '#cccccc';
  const o = it.opts || {};
  const main = M(col), dark = M(shade(col, 0.78)), light = M(shade(col, 1.08));
  const wood = M('#b98e5a'), black = M('#1c1d20', { roughness: 0.5 }), white = M('#f4f4f2');
  switch (it.type) {
    case 'bed': {
      const mw = (o.mattress ? o.mattress / 100 : w - 0.12), ml = d - 0.14;
      bx(g, w, 0.20, d, 0, 0.12, 0, main);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, 0.06, 0.12, 0.06, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), dark));
      bx(g, mw, 0.22, ml, 0, 0.32, 0.03, white);                     // materac
      bx(g, w, h, 0.07, 0, 0, -d / 2 + 0.035, main);                // wezgłowie
      bx(g, w, Math.min(0.40, h * 0.5), 0.05, 0, 0, d / 2 - 0.025, main); // zagłówek (nóżki)
      const pillowW = Math.min(0.6, mw / 2 - 0.05);
      const np = mw > 1.2 ? 2 : 1;
      for (let i = 0; i < np; i++) bx(g, pillowW, 0.12, 0.38, (np === 1 ? 0 : (i - 0.5) * (mw / 2)), 0.54, -d / 2 + 0.40, M('#ecebe6'));
      bx(g, mw + 0.02, 0.04, ml * 0.62, 0, 0.54, d / 2 - 0.05 - ml * 0.31 + 0.0, M('#d7dbe0'));
      break;
    }
    case 'wardrobe': {
      bx(g, w, h - 0.04, d, 0, 0.04, 0, main);
      bx(g, w + 0.01, 0.04, d + 0.01, 0, 0, 0, dark); // cokół
      const n = Math.max(1, Math.round(w / 0.5));
      const dw = (w - 0.02) / n;
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.01 + dw * (i + 0.5);
        bx(g, dw - 0.006, h - 0.1, 0.02, x, 0.06, d / 2 + 0.005, light);
        const hx = n === 1 ? x + dw / 2 - 0.05 : (i % 2 === 0 ? x + dw / 2 - 0.04 : x - dw / 2 + 0.04);
        bx(g, 0.012, 0.18, 0.02, hx, h * 0.45, d / 2 + 0.025, M('#8a8a8a', { metalness: 0.6 }));
      }
      break;
    }
    case 'sofa': case 'armchair': {
      const sh = (o.seatH || 44) / 100, arm = (o.arm || 16) / 100;
      const legH = 0.10, backT = Math.min(0.24, d * 0.26), isCorner = !!o.corner;
      const fab = main, cush = light;
      if (isCorner) {
        const mainD = Math.min(d, 0.95), chW = Math.min(0.95, w * 0.4);
        bx(g, w, sh - legH - 0.12, mainD, 0, legH, -d / 2 + mainD / 2, fab);
        bx(g, chW, sh - legH - 0.12, d, w / 2 - chW / 2, legH, 0, fab);
        bx(g, w, h - sh + 0.12, backT, 0, sh - 0.12, -d / 2 + backT / 2, fab);
        bx(g, arm, h - sh * 0.85, mainD, -w / 2 + arm / 2, legH, -d / 2 + mainD / 2, fab);
        const seatW = w - chW - arm; const nseat = Math.max(2, Math.round(seatW / 0.62));
        for (let i = 0; i < nseat; i++) bx(g, seatW / nseat - 0.01, 0.13, mainD - backT, -w / 2 + arm + seatW / nseat * (i + 0.5), sh - 0.13, -d / 2 + backT + (mainD - backT) / 2, cush);
        bx(g, chW - 0.02, 0.13, d - backT, w / 2 - chW / 2, sh - 0.13, backT / 2, cush);
        for (let i = 0; i < nseat; i++) bx(g, seatW / nseat - 0.02, h - sh - 0.04, 0.16, -w / 2 + arm + seatW / nseat * (i + 0.5), sh, -d / 2 + backT + 0.04, cush);
      } else {
        bx(g, w, sh - legH - 0.12, d, 0, legH, 0, fab);                       // korpus
        bx(g, w, h - sh + 0.12, backT, 0, sh - 0.12, -d / 2 + backT / 2, fab); // oparcie
        bx(g, arm, h - sh * 0.82, d, -w / 2 + arm / 2, legH, 0, fab);         // podłokietniki
        bx(g, arm, h - sh * 0.82, d, w / 2 - arm / 2, legH, 0, fab);
        const seatW = w - 2 * arm; const nseat = it.type === 'armchair' ? 1 : Math.max(2, Math.round(seatW / 0.64));
        for (let i = 0; i < nseat; i++) {
          const cx = -w / 2 + arm + seatW / nseat * (i + 0.5);
          bx(g, seatW / nseat - 0.012, 0.14, d - backT - 0.01, cx, sh - 0.14, backT / 2 + 0.005, cush);
          bx(g, seatW / nseat - 0.02, h - sh - 0.06, 0.17, cx, sh, -d / 2 + backT + 0.05, cush);
        }
      }
      const legM = o.wood ? wood : black;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, 0.05, legH, 0.05, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08), legM));
      break;
    }
    case 'desk': {
      const t = 0.03, lg = 0.04;
      bx(g, w, t, d, 0, h - t, 0, main);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, lg, h - t, lg, sx * (w / 2 - 0.04), 0, sz * (d / 2 - 0.04), main));
      bx(g, w - 0.1, 0.06, 0.02, 0, h - t - 0.1, -d / 2 + 0.06, main);
      if (o.monitors) {
        const zb = -d / 2 + 0.03;
        bx(g, 0.05, 0.05, 0.08, 0, h, zb, black);       // klamra
        bx(g, 0.03, 0.42, 0.03, 0, h, zb, black);       // słupek 42 cm
        const span = 0.53;
        [-1, 1].forEach(s => {
          const pivot = new THREE.Group(); pivot.position.set(s * span / 2, h + 0.14 + 0.16, zb + 0.14); pivot.rotation.y = -s * 0.21; // ~12°
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.02), black); body.castShadow = true; pivot.add(body);
          const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.51, 0.29), new THREE.MeshStandardMaterial({ color: 0x15202b, roughness: 0.2, emissive: 0x0a1018 }));
          scr.position.z = 0.0115; pivot.add(scr); g.add(pivot);
          const arm = bx(g, 0.28, 0.02, 0.025, s * 0.12, h + 0.32, zb + 0.07, black); arm.rotation.y = s * 0.45;
        });
        const base = bx(g, 0.25, 0.012, 0.15, 0, h, 0.0, M('#d9d9d9')); base.visible = false;
      }
      break;
    }
    case 'chair': {
      if (o.office) {
        const seatY = 0.46;
        cyl(g, 0.28, 0.03, 0, 0.06, 0, black, 5);
        cyl(g, 0.025, seatY - 0.12, 0, 0.09, 0, black);
        bx(g, 0.48, 0.07, 0.46, 0, seatY - 0.04, 0.02, main);
        bx(g, 0.46, 0.42, 0.06, 0, seatY + 0.03, -0.22, main);
        bx(g, 0.04, 0.2, 0.3, -0.25, seatY + 0.14, 0.0, black); bx(g, 0.04, 0.2, 0.3, 0.25, seatY + 0.14, 0.0, black);
      } else {
        const sy = 0.45;
        bx(g, w, 0.04, d, 0, sy - 0.04, 0, main);
        bx(g, w, h - sy, 0.03, 0, sy, -d / 2 + 0.015, main);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, 0.03, sy - 0.04, 0.03, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03), dark));
      }
      break;
    }
    case 'shelf': {
      const t = 0.022, n = Math.max(2, Math.round(h / 0.36));
      bx(g, t, h, d, -w / 2 + t / 2, 0, 0, main); bx(g, t, h, d, w / 2 - t / 2, 0, 0, main);
      bx(g, w, h, 0.01, 0, 0, -d / 2 + 0.005, dark);
      for (let i = 0; i <= n; i++) bx(g, w - 2 * t, t, d - 0.01, 0, i * (h - t) / n, 0.005, main);
      const pal = ['#8a3b3b', '#3d5a80', '#c9a227', '#4f6d4a', '#6b4f7a', '#d9d4c8'];
      let seed = it.id ? it.id.length * 7 : 3;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.3) continue;
        const y0 = i * (h - t) / n + t, cell = (h - t) / n - t;
        let x = -w / 2 + t + 0.02;
        const end = w / 2 - t - 0.04 - rnd() * w * 0.3;
        while (x < end) { const bw = 0.02 + rnd() * 0.03, bh = Math.min(cell - 0.04, 0.2 + rnd() * 0.12); bx(g, bw, bh, d * 0.7, x + bw / 2, y0, 0, M(pal[Math.floor(rnd() * pal.length)])); x += bw + 0.002; }
      }
      break;
    }
    case 'dresser': case 'nightstand': case 'tvunit': {
      const legH = it.type === 'tvunit' && h < 0.5 ? 0.10 : 0.07;
      bx(g, w, h - legH, d, 0, legH, 0, main);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, 0.04, legH, 0.04, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), wood));
      const cols = it.type === 'tvunit' ? Math.max(2, Math.round(w / 0.5)) : (w > 1.1 ? 2 : 1);
      const rows = it.type === 'tvunit' ? 1 : Math.max(1, Math.round((h - legH) / 0.22));
      const fw = (w - 0.02) / cols, fh = (h - legH - 0.02) / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        bx(g, fw - 0.01, fh - 0.01, 0.015, -w / 2 + 0.01 + fw * (c + 0.5), legH + 0.01 + fh * r, d / 2 + 0.004, light);
        bx(g, Math.min(0.12, fw * 0.4), 0.012, 0.02, -w / 2 + 0.01 + fw * (c + 0.5), legH + 0.01 + fh * (r + 0.5), d / 2 + 0.02, M('#8a8a8a', { metalness: 0.6 }));
      }
      if (o.tv) {
        const tvw = Math.min(1.25, w * 0.7);
        bx(g, 0.34, 0.015, 0.2, 0, h, -d * 0.1, black); bx(g, 0.04, 0.12, 0.03, 0, h, -d * 0.1, black);
        const tv = bx(g, tvw, tvw * 0.56, 0.04, 0, h + 0.1, -d * 0.1, black);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(tvw - 0.04, tvw * 0.56 - 0.04), new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.15, emissive: 0x070b10 }));
        scr.position.set(0, h + 0.1 + tvw * 0.28, -d * 0.1 + 0.021); g.add(scr);
      }
      break;
    }
    case 'table': {
      if (o.round || Math.abs(w - d) < 0.001 && w < 0.7) {
        cyl(g, w / 2, 0.03, 0, h - 0.03, 0, main, 32);
        cyl(g, 0.03, h - 0.03, 0, 0, 0, dark);
        cyl(g, w * 0.3, 0.02, 0, 0, 0, dark, 24);
      } else {
        bx(g, w, 0.035, d, 0, h - 0.035, 0, main);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, 0.05, h - 0.035, 0.05, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06), dark));
      }
      break;
    }
    case 'appliance': {
      bx(g, w, h, d, 0, 0, 0, main);
      if (o.kind === 'fridge') {
        bx(g, w - 0.01, 0.01, 0.01, 0, h * 0.35, d / 2 + 0.005, black);
        bx(g, 0.02, 0.5, 0.03, w / 2 - 0.07, h * 0.4, d / 2 + 0.015, M('#999', { metalness: 0.7 }));
        bx(g, 0.02, 0.35, 0.03, w / 2 - 0.07, h * 0.6, d / 2 + 0.015, M('#999', { metalness: 0.7 }));
      } else {
        const door = new THREE.Mesh(new THREE.CircleGeometry(0.22, 28), M('#6e7a86', { roughness: 0.2, metalness: 0.4, side: THREE.DoubleSide }));
        door.position.set(0, h * 0.45, d / 2 + 0.003); g.add(door);
        bx(g, w - 0.08, 0.05, 0.01, 0, h - 0.1, d / 2 + 0.004, black);
      }
      break;
    }
    case 'wc': {
      bx(g, 0.38, 0.4, 0.2, 0, 0, -d / 2 + 0.1, white);
      const bowl = bx(g, 0.36, 0.4, 0.45, 0, 0, 0.05, white); bowl.scale.set(1, 1, 1);
      bx(g, 0.34, 0.03, 0.4, 0, 0.4, 0.06, M('#e8e8e8'));
      break;
    }
    case 'vanity': {
      bx(g, w, h - 0.15, d, 0, 0, 0, main);
      bx(g, w, 0.03, d, 0, h - 0.18, 0, white);
      const b = cyl(g, Math.min(0.2, d * 0.4), 0.02, 0, h - 0.17, 0.02, M('#f1f1f1'), 24);
      bx(g, 0.02, 0.18, 0.02, 0, h - 0.15, -d * 0.3, M('#999', { metalness: 0.8 }));
      break;
    }
    case 'tub': {
      bx(g, w, h, d, 0, 0, 0, white);
      bx(g, w - 0.14, 0.02, d - 0.14, 0, h - 0.02, 0, M('#cfe3f0', { roughness: 0.2 }));
      break;
    }
    case 'box': default: {
      const m = bx(g, w, h, d, 0, 0, 0, M(col, { transparent: true, opacity: 0.88 }));
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x334155 })));
      if (it.name) { const s = labelSprite(it.name.replace(/\s*\d+×\d+×\d+$/, ''), 0.5); s.position.set(0, h + 0.18, 0); g.add(s); }
    }
  }
  g.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; n.userData.furniture = true; } });
  return g;
}

function labelSprite(text, scale) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,0.88)'; x.strokeStyle = '#334155'; x.lineWidth = 3;
  x.beginPath(); x.roundRect ? x.roundRect(4, 4, 504, 88, 16) : x.rect(4, 4, 504, 88); x.fill(); x.stroke();
  x.fillStyle = '#1f2937'; x.font = 'bold 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text.slice(0, 22), 256, 50);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(scale * 2.4, scale * 0.45, 1); s.renderOrder = 50; return s;
}
