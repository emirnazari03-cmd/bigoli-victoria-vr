// BIGOLI VICTORIA — material library.
// Procedural PBR textures (colour + normal + roughness) generated on canvas so the
// project has no heavy image dependencies. Finishes follow the Bigoli interior spec:
// green terrazzo floor (VTS.M77), square glazed tiles in dual colours, exposed
// distressed plaster, stainless kitchen, red + green brand colours, oak ledges.
import * as THREE from 'three';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }

// Height canvas (grey) → tangent-space normal map canvas
function normalFromHeight(h, strength = 2) {
  const n = h.width, src = h.getContext('2d').getImageData(0, 0, n, n).data;
  const out = canvas(n), ctx = out.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
  const H = (x, y) => src[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return out;
}
function tex(c, srgb, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return t;
}
// A surface = colour canvas + height canvas (+ optional roughness canvas)
function surface({ n = 512, draw, normal = 2, rough, repeat }) {
  const col = canvas(n), hgt = canvas(n), rgh = rough ? canvas(n) : null;
  const hctx = hgt.getContext('2d'); hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, n, n);
  if (rgh) { const r = rgh.getContext('2d'); r.fillStyle = rough; r.fillRect(0, 0, n, n); }
  draw(col.getContext('2d'), hctx, rgh && rgh.getContext('2d'), n);
  return {
    map: tex(col, true, repeat),
    normalMap: tex(normalFromHeight(hgt, normal), false, repeat),
    roughnessMap: rgh ? tex(rgh, false, repeat) : null,
  };
}

// ------------------------------------------------------------ finishes
function terrazzo(base, chips, n = 1024, tileJoint = true) {
  return surface({
    n, normal: 1.2, rough: '#4a4a4a',
    draw(g, h, r, s) {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) { // fine aggregate
        g.fillStyle = chips[(rnd() * chips.length) | 0]; g.globalAlpha = 0.55 + rnd() * 0.45;
        const rr = 0.6 + rnd() * 1.8; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, rr, rr * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill();
      }
      for (let i = 0; i < 520; i++) { // larger chips
        const x = rnd() * s, y = rnd() * s, rr = 3 + rnd() * 8;
        g.fillStyle = chips[(rnd() * chips.length) | 0]; g.globalAlpha = 1;
        g.beginPath(); const k = 5 + (rnd() * 4 | 0);
        for (let j = 0; j < k; j++) { const a = j / k * 6.283, q = rr * (0.6 + rnd() * 0.5); j ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
      if (tileJoint) { // 600 x 600 tiles: texture = 1.2 m
        g.strokeStyle = 'rgba(30,45,35,0.55)'; g.lineWidth = 2; h.strokeStyle = '#5a5a5a'; h.lineWidth = 3; r.strokeStyle = '#b0b0b0'; r.lineWidth = 3;
        for (const c of [g, h, r]) { c.beginPath(); c.moveTo(s / 2, 0); c.lineTo(s / 2, s); c.moveTo(0, s / 2); c.lineTo(s, s / 2); c.moveTo(1, 0); c.lineTo(1, s); c.moveTo(0, 1); c.lineTo(s, 1); c.stroke(); }
      }
      for (let i = 0; i < 60; i++) { r.fillStyle = `rgba(${90 + rnd() * 40 | 0},${90 + rnd() * 40 | 0},${90 + rnd() * 40 | 0},0.25)`; r.beginPath(); r.arc(rnd() * s, rnd() * s, 20 + rnd() * 60, 0, 7); r.fill(); }
    },
  });
}
function tiles(colA, colB, count = 8, pattern = 'check', grout = '#cfcac0') {
  return surface({
    n: 512, normal: 3, rough: '#262626',
    draw(g, h, r, s) {
      const t = s / count;
      g.fillStyle = grout; g.fillRect(0, 0, s, s);
      h.fillStyle = '#404040'; h.fillRect(0, 0, s, s);
      r.fillStyle = '#c8c8c8'; r.fillRect(0, 0, s, s);
      for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
        const useB = colB && (pattern === 'check' ? (i + j) % 2 : pattern === 'band' ? j === 0 : false);
        const base = new THREE.Color(useB ? colB : colA);
        const v = (rnd() - 0.5) * 0.05; base.offsetHSL(0, 0, v);
        const gw = 2.5, x = i * t + gw, y = j * t + gw, w = t - gw * 2;
        const grd = g.createLinearGradient(x, y, x + w, y + w);
        grd.addColorStop(0, '#' + base.clone().offsetHSL(0, 0, 0.03).getHexString()); grd.addColorStop(1, '#' + base.clone().offsetHSL(0, 0, -0.03).getHexString());
        g.fillStyle = grd; g.fillRect(x, y, w, w);
        h.fillStyle = '#9a9a9a'; h.fillRect(x, y, w, w);
        h.fillStyle = '#a4a4a4'; h.fillRect(x + 2, y + 2, w - 4, w - 4); // pillowed glaze edge
        r.fillStyle = `rgb(${24 + rnd() * 16 | 0},${24 + rnd() * 16 | 0},${24 + rnd() * 16 | 0})`; r.fillRect(x, y, w, w);
      }
    },
  });
}
function plaster() {
  return surface({
    n: 512, normal: 1.4, rough: '#e0e0e0',
    draw(g, h, r, s) {
      g.fillStyle = '#e6d9cc'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2200; i++) {
        const x = rnd() * s, y = rnd() * s, rr = 6 + rnd() * 40;
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        const c = rnd() < 0.5 ? '205,176,158' : rnd() < 0.5 ? '238,228,215' : '214,190,170';
        gr.addColorStop(0, `rgba(${c},${0.08 + rnd() * 0.1})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        h.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; h.beginPath(); h.arc(x, y, rr * 0.6, 0, 7); h.fill();
      }
    },
  });
}
function brushed(base = '#c9cdd0') {
  return surface({
    n: 512, normal: 0.6, rough: '#5a5a5a',
    draw(g, h, r, s) {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 1800; i++) {
        const y = rnd() * s, a = 0.03 + rnd() * 0.05, l = 60 + rnd() * s;
        const x = rnd() * s;
        g.strokeStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '60,60,60'},${a})`; g.lineWidth = 0.6 + rnd();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (rnd() - 0.5) * 2); g.stroke();
        r.strokeStyle = `rgba(${rnd() < 0.5 ? '120,120,120' : '70,70,70'},0.25)`; r.beginPath(); r.moveTo(x, y); r.lineTo(x + l, y); r.stroke();
        h.strokeStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},0.08)`; h.beginPath(); h.moveTo(x, y); h.lineTo(x + l, y); h.stroke();
      }
    },
  });
}
function oak() {
  return surface({
    n: 512, normal: 1.5, rough: '#8a8a8a',
    draw(g, h, r, s) {
      g.fillStyle = '#b98a58'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 260; i++) {
        const y0 = rnd() * s, amp = 2 + rnd() * 8, f = 0.004 + rnd() * 0.01, ph = rnd() * 6;
        const dark = rnd() < 0.6;
        g.strokeStyle = dark ? `rgba(110,70,35,${0.12 + rnd() * 0.2})` : `rgba(230,190,140,${0.1 + rnd() * 0.15})`;
        g.lineWidth = 0.6 + rnd() * 2.2; h.strokeStyle = dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; h.lineWidth = g.lineWidth;
        for (const c of [g, h]) { c.beginPath(); for (let x = 0; x <= s; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      }
    },
  });
}
function brick() {
  return surface({
    n: 512, normal: 3, rough: '#e8e8e8', repeat: [1, 1],
    draw(g, h, r, s) {
      g.fillStyle = '#9d9687'; g.fillRect(0, 0, s, s); h.fillStyle = '#3a3a3a'; h.fillRect(0, 0, s, s);
      const bh = s / 12, bw = s / 4; // texture = 0.9 m x 0.9 m (215 x 65 brick + 10 joint)
      for (let row = 0; row < 12; row++) for (let i = -1; i < 5; i++) {
        const x = i * bw + (row % 2 ? bw / 2 : 0) + 2, y = row * bh + 2;
        const tone = ['#c9b58c', '#bfa57b', '#d3c197', '#a8906a', '#c4ad86', '#8f7b5c'][(rnd() * 6) | 0];
        g.fillStyle = tone; g.fillRect(x, y, bw - 4, bh - 4);
        for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,40,25' : '240,225,200'},0.12)`; g.fillRect(x + rnd() * (bw - 6), y + rnd() * (bh - 6), 2 + rnd() * 5, 1 + rnd() * 3); }
        h.fillStyle = '#b0b0b0'; h.fillRect(x, y, bw - 4, bh - 4);
      }
    },
  });
}
function paving() {
  return surface({
    n: 512, normal: 2.5, rough: '#e0e0e0',
    draw(g, h, r, s) {
      g.fillStyle = '#9fa09b'; g.fillRect(0, 0, s, s); h.fillStyle = '#404040'; h.fillRect(0, 0, s, s);
      const t = s / 2; // 600 x 600 flags: texture = 1.2 m
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const c = new THREE.Color('#a9aaa5').offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
        g.fillStyle = '#' + c.getHexString(); g.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
        for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,70,70' : '210,210,205'},0.12)`; g.fillRect(i * t + rnd() * t, j * t + rnd() * t, 2, 2); }
        h.fillStyle = '#9a9a9a'; h.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
      }
    },
  });
}
function noiseSurface(base, amount, n = 256, normal = 1) {
  return surface({
    n, normal, draw(g, h, r, s) {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      for (let i = 0; i < s * s / 6; i++) { const v = rnd(); g.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * amount})`; g.fillRect(rnd() * s, rnd() * s, 1.5, 1.5); h.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},0.3)`; h.fillRect(rnd() * s, rnd() * s, 2, 2); }
    },
  });
}
function focacciaTop() {
  return surface({
    n: 256, normal: 4, draw(g, h, r, s) {
      g.fillStyle = '#d4a059'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) { const x = rnd() * s, y = rnd() * s, rr = 6 + rnd() * 8; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(150,90,30,.55)'); gr.addColorStop(1, 'rgba(150,90,30,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); h.fillStyle = 'rgba(0,0,0,.5)'; h.beginPath(); h.arc(x, y, rr * 0.5, 0, 7); h.fill(); }
      for (let i = 0; i < 90; i++) { g.fillStyle = rnd() < 0.5 ? '#3f6b2a' : '#f2e2b4'; g.fillRect(rnd() * s, rnd() * s, 3, 2); }
    },
  });
}
function crumb() { // arancini breadcrumb
  return surface({
    n: 256, normal: 5, draw(g, h, r, s) {
      g.fillStyle = '#c9781f'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 5000; i++) { g.fillStyle = ['#e0a04a', '#a55a14', '#d88c30', '#f0c070'][(rnd() * 4) | 0]; const x = rnd() * s, y = rnd() * s; g.fillRect(x, y, 2 + rnd() * 3, 2 + rnd() * 3); h.fillStyle = rnd() < 0.5 ? '#fff' : '#000'; h.fillRect(x, y, 3, 3); }
    },
  });
}
function baffle() {
  const c = canvas(256), g = c.getContext('2d');
  g.fillStyle = '#9ea4a8'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) { const gr = g.createLinearGradient(i * 16, 0, i * 16 + 16, 0); gr.addColorStop(0, '#6d7377'); gr.addColorStop(0.5, '#d9dde0'); gr.addColorStop(1, '#6d7377'); g.fillStyle = gr; g.fillRect(i * 16, 0, 16, 256); }
  return tex(c, true);
}
function meshAlpha() { // wire basket
  const c = canvas(128), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#fff'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  return tex(c, false, [3, 3]);
}
function inductionTop() {
  const c = canvas(512), g = c.getContext('2d');
  g.fillStyle = '#0d0e0f'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(200,200,200,0.35)'; g.lineWidth = 3;
  [[128, 256], [384, 256]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 100, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, 60, 0, 7); g.stroke(); });
  g.fillStyle = 'rgba(220,220,220,0.5)'; for (let i = 0; i < 6; i++) g.fillRect(170 + i * 30, 470, 16, 16);
  return tex(c, true);
}
function sky(night) {
  const c = canvas(512), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  if (night) { gr.addColorStop(0, '#05070d'); gr.addColorStop(0.55, '#141b2b'); gr.addColorStop(1, '#2a2f3a'); }
  else { gr.addColorStop(0, '#9fb6c8'); gr.addColorStop(0.6, '#d5dde2'); gr.addColorStop(1, '#e6e4de'); }
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------ material set
export function buildMaterials(loadTex) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const floor = terrazzo('#557d61', ['#e8e2d2', '#27402f', '#a9c0aa', '#d6ccb6', '#6f957a', '#1c2e23', '#bfae8e']);
  const stone = terrazzo('#e9e4d8', ['#cc1305', '#376a4a', '#b7ad98', '#8c8676', '#f7f4ec'], 512, false);
  const seatTerrazzo = terrazzo('#557d61', ['#e8e2d2', '#27402f', '#a9c0aa', '#d6ccb6', '#6f957a'], 512, false);
  const kitchenTile = tiles('#f3f2ee', null, 8, 'none', '#d8d6d0');
  const diningTile = tiles('#e2ddc9', '#376a4a', 6, 'check', '#cfc9b6');
  const redTile = tiles('#c8150a', null, 6, 'none', '#9d1208');
  const greenTile = tiles('#376a4a', null, 6, 'none', '#2b523a');
  const pl = plaster(), st = brushed(), stDark = brushed('#7c8286'), wood = oak(), br = brick(), pv = paving();
  const fabric = noiseSurface('#b8140a', 0.25, 256, 1.5);
  const foc = focacciaTop(), cr = crumb();
  const M = {
    floor: std({ ...floor, roughness: 1, color: 0xffffff, envMapIntensity: 0.9 }),
    stone: std({ ...stone, roughness: 1, envMapIntensity: 0.8 }),
    seatTerrazzo: std({ ...seatTerrazzo, roughness: 1 }),
    kitchenTile: std({ ...kitchenTile, roughness: 1, envMapIntensity: 1 }),
    diningTile: std({ ...diningTile, roughness: 1, envMapIntensity: 1 }),
    redTile: std({ ...redTile, roughness: 1, envMapIntensity: 1 }),
    greenTile: std({ ...greenTile, roughness: 1, envMapIntensity: 1 }),
    plaster: std({ ...pl, roughness: 1 }),
    ceiling: std({ color: 0xf0eeea, roughness: 0.95 }),
    soffit: std({ color: 0xe9e7e2, roughness: 0.95 }),
    steel: std({ ...st, color: 0xffffff, metalness: 1, roughness: 1, envMapIntensity: 1.1 }),
    steelPlain: std({ color: 0xcfd3d6, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 }),
    steelDark: std({ ...stDark, color: 0xffffff, metalness: 1, roughness: 1 }),
    chrome: std({ color: 0xeeeeee, metalness: 1, roughness: 0.08 }),
    blackMetal: std({ color: 0x1b1c1d, metalness: 0.55, roughness: 0.42 }),
    frame: std({ color: 0x1e2022, metalness: 0.6, roughness: 0.35 }),
    blackGlass: std({ map: inductionTop(), roughness: 0.08, metalness: 0.1 }),
    rubber: std({ color: 0x151515, roughness: 0.9 }),
    red: std({ color: 0xc8150a, roughness: 0.5 }),
    redSatin: std({ color: 0xc8150a, roughness: 0.32, envMapIntensity: 0.8 }),
    redPlastic: std({ color: 0xc8170c, roughness: 0.38, envMapIntensity: 0.9 }),
    redPowder: std({ color: 0xb5140b, roughness: 0.45, metalness: 0.3 }),
    green: std({ color: 0x376a4a, roughness: 0.55 }),
    cream: std({ color: 0xe2ddc9, roughness: 0.6 }),
    whitePowder: std({ color: 0xf1f0ec, roughness: 0.42, metalness: 0.15 }),
    whiteGloss: std({ color: 0xf6f5f1, roughness: 0.2 }),
    oak: std({ ...wood, roughness: 1, envMapIntensity: 0.7 }),
    fabric: std({ ...fabric, roughness: 0.9 }),
    glass: phys({ color: 0xeef5f6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.07, envMapIntensity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
    glassTint: phys({ color: 0xd9e6e8, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.12, envMapIntensity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    perspex: phys({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    water: phys({ color: 0x9cb9c0, roughness: 0.06, transparent: true, opacity: 0.82, envMapIntensity: 1.2 }),
    basket: std({ color: 0xd7dadc, metalness: 1, roughness: 0.3, alphaMap: meshAlpha(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }),
    baffle: std({ map: baffle(), metalness: 0.9, roughness: 0.3 }),
    pasta: std({ color: 0xf0cd73, roughness: 0.55, emissive: 0x3a2a00, emissiveIntensity: 0.15 }),
    pastaDry: std({ color: 0xead089, roughness: 0.7 }),
    dough: std({ color: 0xe6c36d, roughness: 0.8 }),
    flour: std({ color: 0xf4f0e6, roughness: 1 }),
    sauce: std({ color: 0x9e1d0b, roughness: 0.35 }),
    pesto: std({ color: 0x4f7a26, roughness: 0.4 }),
    cream_sauce: std({ color: 0xf1e3bd, roughness: 0.35 }),
    arrabbiata: std({ color: 0xb3300f, roughness: 0.35 }),
    arancini: std({ ...cr, roughness: 0.9 }),
    focaccia: std({ ...foc, roughness: 0.8 }),
    bread: std({ color: 0xd9ac68, roughness: 0.85 }),
    kraft: std({ color: 0xc9a172, roughness: 0.9 }),
    paper: std({ color: 0xf5f2ea, roughness: 0.9 }),
    brick: std({ ...br, roughness: 1 }),
    paving: std({ ...pv, roughness: 1 }),
    kerb: std({ color: 0x8d8d88, roughness: 0.9 }),
    asphalt: std({ ...noiseSurface('#3a3c3e', 0.25, 256, 1.5), roughness: 0.95 }),
    neighbour: std({ color: 0x9a948a, roughness: 0.95 }),
    neighbourGlass: std({ color: 0x20262a, metalness: 0.4, roughness: 0.12 }),
    ledWarm: std({ color: 0xfff4e0, emissive: 0xffe2b8, emissiveIntensity: 2.2 }),
    ledCool: std({ color: 0xffffff, emissive: 0xf4f7ff, emissiveIntensity: 1.8 }),
    bulb: std({ color: 0xfff2d6, emissive: 0xffd28a, emissiveIntensity: 3 }),
    screenOff: std({ color: 0x0b0c0d, roughness: 0.15, metalness: 0.2 }),
    sky: sky(false), skyNight: sky(true),
  };
  // tiling scales (texture sizes in metres)
  M.floor.userData.tile = 1.2; M.paving.userData.tile = 1.2; M.brick.userData.tile = 0.9;
  M.kitchenTile.userData.tile = 0.8; M.diningTile.userData.tile = 0.9; M.redTile.userData.tile = 0.6; M.greenTile.userData.tile = 0.6;
  M.plaster.userData.tile = 1.6; M.oak.userData.tile = 1.2; M.stone.userData.tile = 0.8; M.seatTerrazzo.userData.tile = 0.8;
  M.steel.userData.tile = 1.0;
  return M;
}

// Clone a tiled material with repeat fitted to a surface of w × h metres
export function fitted(mat, w, h) {
  const t = mat.userData.tile || 1;
  const m = mat.clone();
  for (const k of ['map', 'normalMap', 'roughnessMap']) if (mat[k]) { m[k] = mat[k].clone(); m[k].needsUpdate = true; m[k].repeat.set(w / t, h / t); }
  return m;
}
