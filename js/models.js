// BIGOLI VICTORIA — equipment, joinery and furniture models.
// Every builder works in a local frame: width w along local x, depth d along
// local z with the working/customer FRONT at +z, y up from finished floor.
// Dimensions in metres, modelled on real commercial kit (see layouts.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fitted } from './materials.js';
import { screenMaterial } from './screens.js';

let M, SIGN;
export function initModels(materials, signage) { M = materials; SIGN = signage; }

// ------------------------------------------------------------ primitives
export function rb(g, cx, cz, w, d, y0, y1, mat, r = 0.006) {
  const h = y1 - y0, rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const m = new THREE.Mesh(rr > 0.0005 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(cx, (y0 + y1) / 2, cz); g.add(m); return m;
}
export function bx(g, cx, cz, w, d, y0, y1, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, d), mat);
  m.position.set(cx, (y0 + y1) / 2, cz); g.add(m); return m;
}
export function cy(g, x, y, z, r, h, mat, seg = 24, rt) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt ?? r, r, h, seg), mat);
  m.position.set(x, y, z); g.add(m); return m;
}
function tube(g, pts, r, mat, seg = 24, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, radial, false), mat); g.add(m); return m;
}
function lathe(g, profile, mat, x, y, z, seg = 32) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([a, b]) => new THREE.Vector2(a, b)), seg), mat);
  m.position.set(x, y, z); g.add(m); return m;
}
function plane(g, w, h, mat, x, y, z, ry = 0, rx = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, 0); g.add(m); return m;
}
const legs4 = (g, w, d, h, mat, inset = 0.03, s = 0.038) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
  rb(g, a * (w / 2 - inset), b * (d / 2 - inset), s, s, 0.03, h, mat, 0.004);
  cy(g, a * (w / 2 - inset), 0.015, b * (d / 2 - inset), 0.022, 0.03, M.steelPlain, 12);
});

// Pasta nest (bigoli / tagliatelle coil) — one merged geometry, used instanced
let NEST;
function nestGeometry() {
  if (NEST) return NEST;
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const t = new THREE.TorusGeometry(0.03 + (i % 3) * 0.006, 0.0035, 5, 22);
    t.rotateX(Math.PI / 2 + (Math.random() - 0.5) * 0.7); t.rotateZ((Math.random() - 0.5) * 0.6);
    t.translate((Math.random() - 0.5) * 0.012, 0.006 + i * 0.0035, (Math.random() - 0.5) * 0.012);
    parts.push(t);
  }
  NEST = mergeGeometries(parts); return NEST;
}
function nests(g, positions, scale = 1) {
  const inst = new THREE.InstancedMesh(nestGeometry(), M.pasta, positions.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  positions.forEach(([x, y, z], i) => { q.setFromEuler(new THREE.Euler(0, Math.random() * 6, 0)); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(scale, scale, scale)); inst.setMatrixAt(i, m4); });
  g.add(inst); return inst;
}
// open-top tray (Totebox-style red dough tray)
function tray(g, x, y, z, w, d, h = 0.07, mat = M.redPlastic, fill = true) {
  const t = 0.006;
  bx(g, x, z, w, d, y, y + t, mat);
  bx(g, x, z - d / 2 + t / 2, w, t, y, y + h, mat); bx(g, x, z + d / 2 - t / 2, w, t, y, y + h, mat);
  bx(g, x - w / 2 + t / 2, z, t, d, y, y + h, mat); bx(g, x + w / 2 - t / 2, z, t, d, y, y + h, mat);
  if (fill) {
    const pos = []; const nx = Math.max(1, Math.round(w / 0.1)), nz = Math.max(1, Math.round(d / 0.1));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) pos.push([x - w / 2 + (i + 0.5) * w / nx, y + t, z - d / 2 + (j + 0.5) * d / nz]);
    nests(g, pos, Math.min(w / nx, d / nz) / 0.085);
    bx(g, x, z, w - 0.02, d - 0.02, y + t, y + t + 0.002, M.flour);
  }
}
function pan(g, x, y, z, r, handleDir = 1, fill) {
  lathe(g, [[0, 0], [r * 0.82, 0], [r * 0.9, 0.004], [r, 0.05], [r * 1.02, 0.052], [r * 0.99, 0.05], [r * 0.88, 0.004], [0, 0.004]], M.steelPlain, x, y, z);
  tube(g, [[x + handleDir * r * 0.95, y + 0.045, z], [x + handleDir * (r + 0.1), y + 0.07, z], [x + handleDir * (r + 0.22), y + 0.09, z]], 0.008, M.steelPlain, 8, 8);
  if (fill) {
    cy(g, x, y + 0.012, z, r * 0.85, 0.01, fill, 28);
    if (fill === M.sauce || fill === M.arrabbiata) for (let i = 0; i < 10; i++) {
      const a = Math.random() * 6, rr = Math.random() * r * 0.6;
      tube(g, [[x + Math.cos(a) * rr, y + 0.02, z + Math.sin(a) * rr], [x + Math.cos(a + 0.8) * rr * 0.8, y + 0.028, z + Math.sin(a + 0.8) * rr * 0.8], [x + Math.cos(a + 1.6) * rr, y + 0.022, z + Math.sin(a + 1.6) * rr]], 0.004, M.pasta, 8, 5);
    }
  }
}
function bowl(g, x, y, z, lid = true) { // Bigoli kraft pasta bowl with red band
  lathe(g, [[0, 0], [0.055, 0], [0.075, 0.075], [0.077, 0.078], [0.072, 0.078], [0.052, 0.004], [0, 0.004]], M.kraft, x, y, z, 24);
  lathe(g, [[0.061, 0.02], [0.071, 0.06], [0.0725, 0.06], [0.0625, 0.02]], M.red, x, y, z, 24);
  if (lid) cy(g, x, y + 0.08, z, 0.078, 0.006, M.perspex, 24);
}
function bag(g, x, y, z) {
  rb(g, x, z, 0.24, 0.14, y, y + 0.3, M.kraft, 0.004);
  tube(g, [[x - 0.05, y + 0.3, z], [x, y + 0.36, z], [x + 0.05, y + 0.3, z]], 0.004, M.kraft, 8, 5);
  plane(g, 0.12, 0.06, M.red, x, y + 0.18, z + 0.0705);
}
function bottle(inst, list) { return list; }

// ------------------------------------------------------------ fresh pasta
const B = {};
B.pastaBench = (g, w, d) => {
  rb(g, 0, 0, w, d, 0.86, 0.9, fitted(M.steel, w, d), 0.004);
  bx(g, 0, d / 2 - 0.01, w, 0.02, 0.8, 0.86, M.steelPlain);           // front apron
  legs4(g, w, d, 0.86, M.steelPlain);
  rb(g, 0, 0, w - 0.08, d - 0.08, 0.2, 0.225, M.steelPlain, 0.003);   // undershelf
  // under-shelf: dough tubs + 25 kg semolina / 00 flour sacks
  rb(g, -w / 4, 0.02, 0.4, 0.3, 0.225, 0.4, M.whiteGloss, 0.02);
  rb(g, -w / 4, 0.02, 0.41, 0.31, 0.4, 0.42, M.whiteGloss, 0.01);
  rb(g, w / 4, 0.02, 0.42, 0.3, 0.225, 0.36, M.paper, 0.05);
  rb(g, w / 4 + 0.02, 0.0, 0.4, 0.28, 0.36, 0.48, M.paper, 0.05);
};
B.board = (g, w, d) => {
  rb(g, 0, 0, w, d * 0.9, 0.9, 0.925, M.oak, 0.004);
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), M.dough); dough.scale.set(1, 0.45, 1); dough.position.set(-w * 0.15, 0.94, -0.05); g.add(dough);
  bx(g, w * 0.2, 0.08, 0.12, 0.1, 0.925, 0.927, M.flour);
  rb(g, w * 0.22, -0.12, 0.12, 0.09, 0.925, 0.95, M.steelPlain, 0.004);   // scraper
  rb(g, -w * 0.2, 0.17, 0.2, 0.16, 0.925, 0.96, M.steelPlain, 0.006);    // scale
  plane(g, 0.07, 0.025, M.ledCool, -w * 0.2, 0.95, 0.251, 0, 0);
};
B.extruder = (g, w, d) => {
  // benchtop mixer-extruder: motor body, top mixing tank with polycarbonate lid,
  // horizontal extrusion head with bronze die at the front (+z)
  const y = 0.9, bw = Math.min(w, 0.4);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, a * bw * 0.4, y + 0.012, b * d * 0.34 - 0.04, 0.018, 0.024, M.rubber, 12));
  rb(g, 0, -0.05, bw, d * 0.72, y + 0.024, y + 0.36, fitted(M.steel, bw, 0.35), 0.02);           // motor body
  for (let i = 0; i < 6; i++) bx(g, bw / 2 + 0.001, -0.18 + i * 0.03, 0.002, 0.012, y + 0.08, y + 0.2, M.blackMetal); // vents
  rb(g, 0, -0.07, bw * 1.02, d * 0.6, y + 0.36, y + 0.52, fitted(M.steel, bw, 0.2), 0.025);     // mixing tank
  bx(g, 0, -0.07, bw * 0.88, d * 0.5, y + 0.505, y + 0.521, M.steelDark);                       // tank interior
  for (let i = 0; i < 40; i++) {                                                                 // dough crumbs
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.008 + Math.random() * 0.01), M.dough);
    s.position.set((Math.random() - 0.5) * bw * 0.8, y + 0.523, -0.07 + (Math.random() - 0.5) * d * 0.45); g.add(s);
  }
  const lid = new THREE.Group(); lid.position.set(0, y + 0.525, -0.07 - d * 0.3); lid.rotation.x = -0.55; g.add(lid);
  rb(lid, 0, d * 0.3, bw * 1.02, d * 0.6, 0, 0.008, M.perspex, 0.003);
  rb(lid, 0, d * 0.6 - 0.01, bw * 0.3, 0.02, 0.008, 0.02, M.blackMetal, 0.004);
  // extrusion head
  const zf = d * 0.31;
  const head = cy(g, 0, y + 0.2, zf + 0.04, 0.062, 0.14, M.steelPlain, 32); head.rotation.x = Math.PI / 2;
  const ring = cy(g, 0, y + 0.2, zf + 0.115, 0.07, 0.022, new THREE.MeshStandardMaterial({ color: 0xb58a4c, metalness: 1, roughness: 0.35 }), 32); ring.rotation.x = Math.PI / 2;
  const die = cy(g, 0, y + 0.2, zf + 0.127, 0.05, 0.004, new THREE.MeshStandardMaterial({ color: 0x9a7440, metalness: 1, roughness: 0.5 }), 32); die.rotation.x = Math.PI / 2;
  bx(g, 0.04, zf + 0.134, 0.09, 0.004, y + 0.19, y + 0.205, M.chrome);                           // cutter blade
  // bigoli strands leaving the die and dropping to the tray
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, r = 0.012 + (i % 3) * 0.011;
    const sx = Math.cos(a) * r, sy = y + 0.2 + Math.sin(a) * r;
    const len = 0.03 + Math.random() * 0.02;
    tube(g, [[sx, sy, zf + 0.13], [sx * 1.1, sy - 0.01, zf + 0.13 + len], [sx * 1.4, sy - 0.07, zf + 0.15 + len], [sx * 1.8 + (Math.random() - 0.5) * 0.03, y + 0.06, zf + 0.2 + len]], 0.0017, M.pasta, 14, 5);
  }
  // control panel + emergency stop on the side
  rb(g, bw / 2 + 0.006, 0.02, 0.012, 0.16, y + 0.2, y + 0.33, M.blackMetal, 0.003);
  [[0.05, 0x2fa84f], [0, 0xd9d9d9], [-0.05, 0xd9d9d9]].forEach(([z, c]) => { const b = cy(g, bw / 2 + 0.014, y + 0.29, 0.02 + z, 0.011, 0.01, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), 16); b.rotation.z = Math.PI / 2; });
  const es = cy(g, bw / 2 + 0.02, y + 0.23, 0.02, 0.018, 0.02, M.red, 20); es.rotation.z = Math.PI / 2;
  plane(g, 0.08, 0.025, new THREE.MeshStandardMaterial({ color: 0x0b2014, emissive: 0x5cff9a, emissiveIntensity: 0.6 }), bw / 2 + 0.0125, y + 0.315, 0.02, Math.PI / 2);
};
B.traySet = (g, w, d) => {
  tray(g, -w / 4, 0.9, 0, w / 2 - 0.01, d * 0.92, 0.06);
  tray(g, w / 4, 0.9, 0, w / 2 - 0.01, d * 0.92, 0.06);
};
B.rack = (g, w, d) => {
  const post = 0.025;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
    rb(g, a * (w / 2 - post / 2), b * (d / 2 - post / 2), post, post, 0.1, 1.78, M.steelPlain, 0.003);
    const fork = rb(g, a * (w / 2 - 0.03), b * (d / 2 - 0.03), 0.03, 0.04, 0.07, 0.1, M.steelPlain, 0.003);
    const wheel = cy(g, a * (w / 2 - 0.03), 0.04, b * (d / 2 - 0.03), 0.038, 0.025, M.rubber, 16); wheel.rotation.z = Math.PI / 2;
  });
  rb(g, 0, 0, w, d, 1.76, 1.79, M.steelPlain, 0.004);
  bx(g, 0, 0, w - 0.04, d - 0.04, 0.12, 0.14, M.steelPlain);
  for (let i = 0; i < 10; i++) {
    const y = 0.22 + i * 0.152;
    [-1, 1].forEach(a => bx(g, a * (w / 2 - post), 0, 0.02, d - 0.03, y - 0.008, y, M.steelPlain));
    tray(g, 0, y, 0, w - 0.06, d - 0.04, 0.07, M.redPlastic, i < 8);
  }
};
// ------------------------------------------------------------ cook line
function cabinet(g, w, d, h = 0.85, doors = 1, mat = M.steel) {
  rb(g, 0, 0, w, d, 0.1, h, fitted(mat, w, h), 0.004);
  legs4(g, w * 0.95, d * 0.9, 0.1, M.steelPlain, 0.03, 0.035);
  for (let i = 0; i < doors; i++) {
    const dw = (w - 0.04) / doors, x = -w / 2 + 0.02 + dw * (i + 0.5);
    bx(g, x, d / 2 + 0.001, dw - 0.01, 0.002, 0.14, h - 0.08, M.steelPlain);
    rb(g, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), d / 2 + 0.015, 0.015, 0.02, h - 0.35, h - 0.12, M.chrome, 0.005);
  }
}
B.boiler = (g, w, d, it, anim) => {
  cabinet(g, w, d, 0.85, 1);
  rb(g, 0, 0, w, d, 0.85, 0.9, fitted(M.steel, w, d), 0.004);
  bx(g, 0, d / 2 + 0.002, w - 0.04, 0.004, 0.72, 0.84, M.blackMetal);                              // control strip
  plane(g, 0.12, 0.04, new THREE.MeshStandardMaterial({ color: 0x06121e, emissive: 0x7fd4ff, emissiveIntensity: 0.9 }), -w * 0.25, 0.78, d / 2 + 0.0045);
  [0.05, 0.14, 0.23].forEach(x => { const k = cy(g, x, 0.78, d / 2 + 0.015, 0.018, 0.02, M.blackMetal, 20); k.rotation.x = Math.PI / 2; });
  // well + water
  bx(g, 0, 0.03, w - 0.12, d - 0.26, 0.899, 0.902, M.steelDark);
  const water = bx(g, 0, 0.03, w - 0.14, d - 0.28, 0.87, 0.895, M.water);
  // rear backsplash + lift tower
  rb(g, 0, -d / 2 + 0.07, w, 0.14, 0.9, 1.42, fitted(M.steel, w, 0.5), 0.01);
  bx(g, 0, -d / 2 + 0.141, w - 0.1, 0.002, 1.02, 1.3, M.blackMetal);
  // two lift arms, each with two baskets (one raised with pasta, one cooking)
  const bw = (w - 0.14) / 4;
  [[-1, true], [1, false]].forEach(([side, up]) => {
    const armY = up ? 1.3 : 1.02;
    const x0 = side * (w / 4 - 0.02);
    rb(g, x0, -d / 2 + 0.25, 0.03, 0.22, armY - 0.02, armY + 0.02, M.steelPlain, 0.006);
    [-1, 1].forEach(k => {
      const x = x0 + k * bw / 2, by0 = up ? armY - 0.3 : 0.76;
      const bk = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.02, 0.17, 0.2, 1, 1, 1), M.basket); bk.position.set(x, by0 + 0.085, 0.04); g.add(bk);
      bx(g, x, 0.04, bw - 0.02, 0.2, by0, by0 + 0.003, M.basket);
      tube(g, [[x, by0 + 0.17, 0.04 - 0.1], [x, armY - 0.01, -d / 2 + 0.3]], 0.005, M.steelPlain, 4, 6);
      if (up) nests(g, [[x, by0 + 0.005, 0.02], [x, by0 + 0.03, 0.07]], 1.1);
    });
  });
  // steam
  const steamMat = new THREE.SpriteMaterial({ map: steamTexture(), transparent: true, opacity: 0.22, depthWrite: false });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(steamMat.clone()); s.scale.set(0.35, 0.35, 1);
    s.position.set((Math.random() - 0.5) * (w - 0.2), 1.0 + i * 0.12, 0.03); s.userData.base = s.position.y; s.userData.phase = Math.random() * 6;
    g.add(s); anim && anim.push(s);
  }
};
let STEAM;
function steamTexture() {
  if (STEAM) return STEAM;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); STEAM = new THREE.CanvasTexture(c); return STEAM;
}
B.hob = (g, w, d) => {
  cabinet(g, w, d, 0.85, 2);
  rb(g, 0, 0, w, d, 0.85, 0.89, fitted(M.steel, w, d), 0.004);
  bx(g, 0, 0, w - 0.08, d - 0.1, 0.889, 0.9, M.blackGlass);
  [-1, 1].forEach((s, i) => { const k = cy(g, s * w * 0.3, 0.8, d / 2 + 0.012, 0.02, 0.02, M.blackMetal, 20); k.rotation.x = Math.PI / 2; });
  pan(g, -w / 4, 0.9, 0.0, 0.13, 1, M.arrabbiata);
  pan(g, w / 4, 0.9, -0.02, 0.13, 1, M.sauce);
  // utensil rail on the canopy back
  rb(g, 0, -d / 2 + 0.03, w, 0.02, 1.45, 1.47, M.steelPlain, 0.005);
  [-0.25, -0.1, 0.05, 0.2].forEach((x, i) => {
    tube(g, [[x, 1.46, -d / 2 + 0.045], [x, 1.2, -d / 2 + 0.05]], 0.004, M.steelPlain, 4, 6);
    if (i % 2) lathe(g, [[0, 0], [0.04, 0.005], [0.045, 0.03], [0, 0.03]], M.steelPlain, x, 1.17, -d / 2 + 0.05, 16);
  });
};
B.bain = (g, w, d) => {
  cabinet(g, w, d, 0.85, 1);
  rb(g, 0, 0, w, d, 0.85, 0.9, fitted(M.steel, w, d), 0.004);
  const cols = [M.sauce, M.arrabbiata, M.pesto, M.cream_sauce, M.sauce, M.pesto];
  const nx = 2, nz = 3, pw = (w - 0.12) / nx, pd = (d - 0.14) / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = -w / 2 + 0.06 + pw * (i + 0.5), z = -d / 2 + 0.07 + pd * (j + 0.5);
    rb(g, x, z, pw - 0.015, pd - 0.015, 0.83, 0.905, M.steelPlain, 0.004);
    bx(g, x, z, pw - 0.03, pd - 0.03, 0.9, 0.903, cols[i * nz + j]);
  }
  tube(g, [[-w * 0.2, 0.905, -0.05], [-w * 0.2, 0.99, 0.1], [-w * 0.2, 1.02, 0.14]], 0.005, M.steelPlain, 8, 6);
  // plate / pan over-shelf
  rb(g, 0, -d / 2 + 0.16, w, 0.3, 1.5, 1.52, M.steelPlain, 0.004);
  for (let i = 0; i < 3; i++) lathe(g, [[0, 0], [0.12, 0], [0.13, 0.04], [0, 0.004]], M.steelPlain, -w * 0.25 + i * 0.03, 1.52 + i * 0.012, -d / 2 + 0.16, 24);
};
B.saladette = (g, w, d) => {
  cabinet(g, w, d, 0.85, 2);
  rb(g, 0, 0, w, d, 0.85, 0.9, fitted(M.steel, w, d), 0.004);
  const cols = [M.flour, M.pesto, M.sauce, M.cream_sauce, M.dough, M.pesto];
  const n = 5, pw = (w - 0.1) / n;
  for (let i = 0; i < n; i++) { rb(g, -w / 2 + 0.05 + pw * (i + 0.5), -d / 2 + 0.16, pw - 0.015, 0.22, 0.85, 0.905, M.steelPlain, 0.004); bx(g, -w / 2 + 0.05 + pw * (i + 0.5), -d / 2 + 0.16, pw - 0.03, 0.2, 0.9, 0.903, cols[i]); }
  const lid = rb(g, 0, -d / 2 + 0.03, w - 0.04, 0.26, 0.9, 0.915, M.steelPlain, 0.004); lid.rotation.x = -1.1; lid.position.set(0, 1.02, -d / 2 + 0.01);
};
B.underFridge = (g, w, d) => { cabinet(g, w, d, 0.86, 2); rb(g, 0, 0, w, d, 0.86, 0.9, fitted(M.steel, w, d), 0.004); };
B.filler = (g, w, d) => { rb(g, 0, 0, w, d, 0, 0.9, M.steelPlain, 0.003); };
B.potwash = (g, w, d) => {
  cabinet(g, w, d, 0.86, 0);
  rb(g, 0, 0, w, d, 0.86, 0.9, fitted(M.steel, w, d), 0.004);
  rb(g, 0, -d / 2 + 0.02, w, 0.04, 0.9, 1.1, M.steelPlain, 0.004);                                // upstand
  bx(g, -w / 2 + 0.25, 0.02, 0.4, d - 0.14, 0.72, 0.901, M.steelDark);                            // sink bowl
  bx(g, -w / 2 + 0.25, 0.02, 0.38, d - 0.16, 0.719, 0.72, M.steelPlain);
  tube(g, [[-w / 2 + 0.25, 0.9, -d / 2 + 0.06], [-w / 2 + 0.25, 1.35, -d / 2 + 0.06], [-w / 2 + 0.25, 1.42, -d / 2 + 0.12], [-w / 2 + 0.25, 1.3, 0.0]], 0.012, M.chrome, 16, 8);
  const coil = []; for (let i = 0; i < 60; i++) coil.push([-w / 2 + 0.25 + Math.cos(i * 0.9) * 0.02, 1.02 + i * 0.004, -d / 2 + 0.06 + Math.sin(i * 0.9) * 0.02]); tube(g, coil, 0.003, M.chrome, 120, 5);
  for (let i = 0; i < 8; i++) bx(g, 0.05 + i * 0.05 - 0.18, 0.02, 0.01, d - 0.16, 0.9, 0.903, M.steelPlain);    // drainer ribs
  // undercounter dishwasher
  rb(g, w / 2 - 0.33, d / 2 - 0.01, 0.6, 0.02, 0.12, 0.82, M.steelPlain, 0.004);
  bx(g, w / 2 - 0.33, d / 2 + 0.001, 0.56, 0.002, 0.74, 0.8, M.blackMetal);
  // hand-wash basin at the end (knee operated)
  lathe(g, [[0, 0], [0.1, 0.0], [0.13, 0.12], [0.12, 0.12], [0, 0.01]], M.steelPlain, w / 2 - 0.1, 0.95, -0.02, 24);
  rb(g, 0, -d / 2 + 0.12, w, 0.24, 1.55, 1.57, M.steelPlain, 0.004);                              // wall shelf
  for (let i = 0; i < 4; i++) rb(g, -w / 2 + 0.2 + i * 0.25, -d / 2 + 0.12, 0.18, 0.18, 1.57, 1.72, M.whiteGloss, 0.01);
};
B.fridge = (g, w, d, it) => {
  rb(g, 0, 0, w, d, 0.12, 2.02, fitted(M.steel, w, 1.9), 0.01);
  legs4(g, w * 0.95, d * 0.9, 0.12, M.steelPlain, 0.03, 0.035);
  bx(g, 0, d / 2 + 0.001, w - 0.03, 0.002, 0.16, 1.78, M.steelPlain);
  rb(g, w / 2 - 0.07, d / 2 + 0.025, 0.02, 0.03, 0.9, 1.5, M.chrome, 0.006);
  bx(g, 0, d / 2 + 0.002, w - 0.03, 0.002, 1.82, 1.98, M.blackMetal);
  plane(g, 0.08, 0.03, new THREE.MeshStandardMaterial({ color: 0x051208, emissive: 0x44ff88, emissiveIntensity: 0.8 }), -w * 0.25, 1.9, d / 2 + 0.0035);
};
B.shelving = (g, w, d) => {
  for (let i = 0; i < 4; i++) rb(g, 0, 0, w, d, 0.18 + i * 0.4, 0.2 + i * 0.4, M.steelPlain, 0.003);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, a * (w / 2 - 0.015), 0.73, b * (d / 2 - 0.015), 0.012, 1.46, M.steelPlain, 10));
  rb(g, -w * 0.2, 0, w * 0.5, d * 0.7, 0.2, 0.42, M.paper, 0.05);                                  // flour sacks
  rb(g, w * 0.22, 0, w * 0.45, d * 0.7, 0.2, 0.4, M.paper, 0.05);
  for (let i = 0; i < 8; i++) lathe(g, [[0, 0], [0.05, 0], [0.05, 0.12], [0, 0.12]], M.red, -w / 2 + 0.08 + (i % 4) * (w - 0.16) / 3, 0.6, -0.1 + Math.floor(i / 4) * 0.2, 20); // tomato tins
  for (let i = 0; i < 3; i++) rb(g, -w / 2 + 0.15 + i * (w - 0.3) / 2, 0, 0.22, 0.3, 1.0, 1.22, M.kraft, 0.004);
};
B.prepTable = (g, w, d) => {
  B.pastaBench(g, w, d);
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), M.dough); dough.scale.set(1.2, 0.4, 1); dough.position.set(0, 0.93, 0); g.add(dough);
};
// ------------------------------------------------------------ counter
// Custom joinery: recessed black plinth, red square-tile front, cream terrazzo
// customer ledge, stainless staff worktop, integrated display, POS and a heated
// collection shelf. Zones are given along the counter length (local x).
B.counter = (g, w, d, it, anim, zonesLocal) => {
  const front = d / 2;
  rb(g, 0, -0.04, w - 0.08, d - 0.1, 0, 0.1, M.blackMetal, 0.005);                                  // recessed plinth
  rb(g, 0, 0, w, d - 0.02, 0.1, 0.88, M.whitePowder, 0.01);                                          // carcass
  rb(g, 0, front - 0.03, w + 0.02, 0.06, 0.1, 1.04, fitted(M.redTile, w, 0.94), 0.02);               // tiled customer face
  rb(g, 0, front - 0.14, w + 0.08, 0.36, 1.04, 1.075, fitted(M.stone, w, 0.36), 0.008);              // terrazzo ledge
  bx(g, 0, front + 0.03, w, 0.01, 1.025, 1.035, M.ledWarm);                                           // under-ledge LED
  rb(g, 0, -d / 2 + 0.2, w, 0.4, 0.88, 0.92, fitted(M.steel, w, 0.4), 0.004);                         // staff worktop
  // staff-side storage: doors + drawers
  const n = Math.max(2, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * w / n;
    bx(g, x, -d / 2 + 0.009, w / n - 0.012, 0.002, 0.14, 0.84, M.steelPlain);
    rb(g, x, -d / 2 - 0.012, w / n * 0.5, 0.015, 0.78, 0.8, M.chrome, 0.005);
  }
  // brand panel on the tiled front (backlit wordmark)
  const wm = plane(g, Math.min(0.9, w * 0.5), Math.min(0.9, w * 0.5) * 0.43, M.wordmark, 0, 0.62, front + 0.002);
  const Z = zonesLocal;
  if (Z.display) {
    const [a, b] = Z.display, dw = b - a, cx = (a + b) / 2, cz = front - 0.17;
    rb(g, cx, cz - 0.03, dw, 0.28, 0.92, 0.95, M.blackMetal, 0.004);
    const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.02, 0.3), M.glassTint); glassFront.position.set(cx, 1.225, front - 0.06); glassFront.rotation.x = -0.18; g.add(glassFront);
    plane(g, dw - 0.02, 0.3, M.glassTint, cx, 1.37, cz - 0.02, 0, -Math.PI / 2);
    [a + 0.01, b - 0.01].forEach(x => plane(g, 0.3, 0.3, M.glassTint, x, 1.225, cz, Math.PI / 2));
    bx(g, cx, cz - 0.02, dw - 0.02, 0.3, 1.14, 1.146, M.glass);                                          // glass shelf
    bx(g, cx, cz - 0.1, dw - 0.03, 0.02, 1.36, 1.37, M.ledWarm);
    // cabinet frame: black corner posts, top rim and a heated-display fascia so it reads as one unit
    [a, b].forEach(x => [front - 0.05, cz - 0.16].forEach(z => bx(g, x, z, 0.02, 0.02, 0.95, 1.39, M.blackMetal)));
    bx(g, cx, front - 0.05, dw + 0.02, 0.02, 1.37, 1.39, M.blackMetal); bx(g, cx, cz - 0.16, dw + 0.02, 0.02, 1.37, 1.39, M.blackMetal);
    [a, b].forEach(x => bx(g, x, (front - 0.05 + cz - 0.16) / 2, 0.02, front - 0.05 - (cz - 0.16), 1.37, 1.39, M.blackMetal));
    // arancini on paper-lined trays (lower deck)
    const ar = new THREE.InstancedMesh(new THREE.SphereGeometry(0.034, 18, 12), M.arancini, 8), m4 = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) { m4.makeTranslation(cx - dw / 2 + 0.07 + (i % 4) * (dw - 0.14) / 3, 0.985, cz + (i < 4 ? 0.06 : -0.04)); ar.setMatrixAt(i, m4); }
    g.add(ar); bx(g, cx, cz + 0.01, dw - 0.06, 0.26, 0.95, 0.952, M.paper);
    // focaccia squares + focaccia sandwiches (upper deck)
    for (let i = 0; i < 3; i++) {
      const x = cx - dw / 2 + 0.09 + i * (dw - 0.18) / 2;
      rb(g, x, cz + 0.04, 0.1, 0.1, 1.147, 1.18, M.focaccia, 0.01);
      rb(g, x, cz - 0.08, 0.11, 0.09, 1.147, 1.165, M.bread, 0.008);
      bx(g, x, cz - 0.08, 0.105, 0.085, 1.165, 1.172, M.pesto);
      bx(g, x, cz - 0.08, 0.1, 0.08, 1.172, 1.18, new THREE.MeshStandardMaterial({ color: 0xe7a1a0, roughness: 0.6 }));
      rb(g, x, cz - 0.08, 0.11, 0.09, 1.18, 1.198, M.focaccia, 0.008);
    }
    for (let i = 0; i < 3; i++) plane(g, 0.05, 0.025, M.paper, cx - dw / 2 + 0.09 + i * (dw - 0.18) / 2, 0.97, front - 0.03, 0, -0.3);
  }
  if (Z.pos) {
    const [a, b] = Z.pos, cx = (a + b) / 2;
    cy(g, cx, 1.085, front - 0.12, 0.05, 0.02, M.blackMetal, 24);
    cy(g, cx, 1.14, front - 0.12, 0.012, 0.1, M.blackMetal, 12);
    const scr = rb(g, cx, front - 0.1, 0.27, 0.012, 1.18, 1.36, M.blackMetal, 0.006); scr.rotation.x = -0.3;
    const ui = plane(g, 0.25, 0.16, screenMaterial(SIGN.menus[4], 0.8), cx, 1.27, front - 0.093, 0, -0.3);
    rb(g, cx + 0.2, front - 0.1, 0.08, 0.14, 1.075, 1.1, M.blackMetal, 0.008);                        // card terminal
    plane(g, 0.05, 0.035, new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: 0x9fd5ff, emissiveIntensity: 0.5 }), cx + 0.2, 1.101, front - 0.12, 0, -Math.PI / 2);
    rb(g, cx, -d / 2 + 0.14, 0.14, 0.18, 0.92, 1.02, M.blackMetal, 0.01);                              // receipt / ticket printer
  }
  if (Z.collect) {
    // flush heated pass inset into the ledge; strip heater hangs from the menu-screen rail (no posts, no gantry)
    const [a, b] = Z.collect, cw = b - a, cx = (a + b) / 2;
    rb(g, cx, front - 0.2, cw - 0.04, 0.3, 1.066, 1.078, M.steelPlain, 0.003);                           // heated pass plate
    rb(g, cx, front - 0.22, cw - 0.1, 0.12, 1.62, 1.68, M.blackMetal, 0.01);                              // strip heater
    bx(g, cx, front - 0.22, cw - 0.14, 0.06, 1.615, 1.62, new THREE.MeshStandardMaterial({ color: 0xff8a50, emissive: 0xff5a1e, emissiveIntensity: 0.9 }));
    [cx - cw / 3, cx + cw / 3].forEach(x => cy(g, x, 1.95, front - 0.22, 0.004, 0.54, M.blackMetal, 6));
    bowl(g, cx - cw / 4, 1.078, front - 0.2); bowl(g, cx + 0.02, 1.078, front - 0.22); bag(g, cx + cw / 4 + 0.02, 1.078, front - 0.2);
    // staff-side plating: bowl stacks, parmesan, squeeze bottles
    for (let i = 0; i < 4; i++) bowl(g, cx - cw / 3, 0.92 + i * 0.02, -d / 2 + 0.15, false);
    cy(g, cx, 0.97, -d / 2 + 0.14, 0.05, 0.1, M.cream, 20);
    [0, 0.05].forEach(o => cy(g, cx + cw / 3 + o, 1.0, -d / 2 + 0.12, 0.025, 0.16, M.red, 16));
  }
  // end caps: the tiled face and terrazzo ledge wrap both ends so the run reads as one piece of joinery
  [-1, 1].forEach(sd => rb(g, sd * (w / 2 + 0.005), 0, 0.03, d - 0.02, 0.1, 1.04, fitted(M.redTile, d, 0.94), 0.01));
};
// ------------------------------------------------------------ collection wall
// Full-height joinery return at the end of the counter: red tile base matching the
// counter, terrazzo cap, cream panel with the order-status TV set flush, green
// COLLECT HERE lightbox above. Closes off back of house from the lane.
B.collectWall = (g, w, d) => {
  rb(g, 0, 0, w, d, 0, 0.1, M.blackMetal, 0.005);
  rb(g, 0, 0, w, d, 0.1, 1.04, fitted(M.redTile, w, 0.94), 0.01);
  rb(g, 0, 0, w + 0.02, d + 0.04, 1.04, 1.075, fitted(M.stone, w, 0.2), 0.006);
  rb(g, 0, 0, w, d, 1.075, 2.55, M.cream, 0.01);
  rb(g, 0, 0, w + 0.02, d + 0.02, 2.55, 2.6, M.blackMetal, 0.005);
  [-1, 1].forEach(side => {
    const zf = side * (d / 2);
    const sw = Math.min(0.98, w - 0.16), sh = sw * 0.5625, y = 1.72;
    rb(g, 0, zf + side * 0.012, sw + 0.03, 0.025, y - sh / 2 - 0.015, y + sh / 2 + 0.015, M.blackMetal, 0.006);
    const scr = plane(g, sw - 0.01, sh - 0.01, screenMaterial(SIGN.orderStatus, 1.0), 0, y, zf + side * 0.0255);
    if (side < 0) scr.rotation.y = Math.PI;
    const lb = plane(g, sw, sw * 0.18, screenMaterial(SIGN.collectHere, 1.1), 0, 2.33, zf + side * 0.003);
    if (side < 0) lb.rotation.y = Math.PI;
  });
};
// ------------------------------------------------------------ self-order kiosk
// Floor-standing kiosk (Elo / PAR / Acrelec class): weighted base plate, slim
// powder-coated column, 32" portrait touchscreen, card terminal on a side shelf,
// receipt slot. White body, Bigoli red header.
B.kiosk = (g, w, d, it) => {
  if (it && it.accessible) return kioskLow(g, w, d);
  const body = M.whiteGloss, dark = M.blackMetal;
  rb(g, 0, 0, w, d, 0, 0.02, dark, 0.008);                                                              // base plate
  rb(g, 0, -0.02, 0.16, 0.12, 0.02, 0.95, body, 0.02);                                                  // column
  rb(g, 0, -0.02, 0.46, 0.09, 0.95, 1.95, body, 0.02);                                                  // screen housing
  const scr = plane(g, 0.4, 0.71, screenMaterial(SIGN.menus[4], 0.9), 0, 1.4, 0.026);                  // 32" portrait
  rb(g, 0, 0.0, 0.46, 0.05, 1.86, 1.95, M.redSatin, 0.01);                                              // red header
  const hl = plane(g, 0.2, 0.2 * 0.43, M.wordmark, 0, 1.905, 0.027);
  rb(g, 0, 0.0, 0.3, 0.06, 0.98, 1.02, body, 0.01);                                                    // receipt slot bar
  bx(g, 0, 0.031, 0.12, 0.003, 0.995, 1.0, dark);
  rb(g, 0.19, 0.06, 0.14, 0.14, 0.98, 1.0, body, 0.01);                                                 // payment shelf
  const t = rb(g, 0.19, 0.06, 0.075, 0.14, 1.0, 1.02, dark, 0.008); t.rotation.x = -0.2;                // card terminal
  plane(g, 0.05, 0.035, new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: 0x9fd5ff, emissiveIntensity: 0.5 }), 0.19, 1.023, 0.05, 0, -Math.PI / 2 + 0.2);
};
// ------------------------------------------------------------ drinks cooler
B.drinks = (g, w, d) => {
  const inner = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.6 });
  rb(g, 0, -d / 2 + 0.03, w, 0.06, 0.08, 2.0, M.redSatin, 0.01);
  [-1, 1].forEach(s => rb(g, s * (w / 2 - 0.03), 0, 0.06, d, 0.08, 2.0, M.redSatin, 0.01));
  rb(g, 0, 0, w, d, 0.0, 0.14, M.blackMetal, 0.01);
  rb(g, 0, 0, w, d, 1.74, 2.04, M.redSatin, 0.01);
  bx(g, 0, -d / 2 + 0.065, w - 0.12, 0.004, 0.14, 1.74, inner);
  [-1, 1].forEach(s => bx(g, s * (w / 2 - 0.065), d / 2 - 0.1, 0.012, 0.012, 0.16, 1.72, M.ledCool));   // side LEDs
  const header = plane(g, w - 0.08, (w - 0.08) * 0.43, M.wordmark, 0, 1.89, d / 2 + 0.002);
  // shelves + stock (cans and bottles, brand-neutral colours)
  const canGeo = new THREE.LatheGeometry([[0, 0], [0.031, 0], [0.033, 0.01], [0.033, 0.105], [0.028, 0.115], [0, 0.115]].map(p => new THREE.Vector2(...p)), 18);
  const btlGeo = new THREE.LatheGeometry([[0, 0], [0.033, 0], [0.034, 0.14], [0.03, 0.17], [0.014, 0.21], [0.014, 0.24], [0, 0.24]].map(p => new THREE.Vector2(...p)), 18);
  const cols = [0xc8102e, 0x151515, 0xf08a1c, 0x2f8f3c, 0xf2d64b, 0x9fc5dc, 0xe6e2d6];
  const perRow = Math.floor((w - 0.14) / 0.075);
  for (let s = 0; s < 5; s++) {
    const y = 0.16 + s * 0.31;
    bx(g, 0, 0, w - 0.13, d - 0.12, y, y + 0.008, M.steelPlain);
    const bottles = s % 2 === 1, geo = bottles ? btlGeo : canGeo;
    for (let row = 0; row < 3; row++) {
      const mat = new THREE.MeshStandardMaterial({ color: cols[(s * 2 + row) % cols.length], roughness: bottles ? 0.15 : 0.3, metalness: bottles ? 0 : 0.6, transparent: bottles && row === 0, opacity: bottles && row === 0 ? 0.75 : 1 });
      const inst = new THREE.InstancedMesh(geo, mat, perRow), m4 = new THREE.Matrix4();
      for (let i = 0; i < perRow; i++) { m4.makeTranslation(-w / 2 + 0.1 + i * 0.075, y + 0.008, d / 2 - 0.12 - row * 0.1); inst.setMatrixAt(i, m4); }
      g.add(inst);
    }
  }
  // glass door with aluminium frame and handle
  const door = new THREE.Group(); door.position.set(0, 0, d / 2); g.add(door);
  [[0, 0.16, w - 0.02, 0.04], [0, 1.72, w - 0.02, 0.04]].forEach(([x, y, ww, hh]) => bx(door, x, 0.01, ww, 0.03, y - hh / 2, y + hh / 2, M.steelPlain));
  [-1, 1].forEach(s => bx(door, s * (w / 2 - 0.02), 0.01, 0.035, 0.03, 0.14, 1.74, M.steelPlain));
  const dg = plane(door, w - 0.07, 1.54, M.glass, 0, 0.94, 0.01); dg.renderOrder = 3;
  rb(door, w / 2 - 0.07, 0.04, 0.02, 0.025, 0.7, 1.35, M.chrome, 0.006);
};
// Lowered self-order kiosk: touch area and card reader inside the 750–1200 mm reach
// range (BS 8300), knee space under the screen for a wheelchair user.
function kioskLow(g, w, d) {
  const body = M.whiteGloss, dark = M.blackMetal;
  rb(g, 0, 0, w, d, 0, 0.02, dark, 0.008);
  [-0.2, 0.2].forEach(x => rb(g, x, -0.12, 0.05, 0.1, 0.02, 1.5, body, 0.01));                         // twin posts, open knee space
  const hs = new THREE.Group(); hs.position.set(0, 1.12, -0.06); hs.rotation.x = -0.35; g.add(hs);       // tilted screen
  rb(hs, 0, 0, 0.46, 0.08, -0.36, 0.36, body, 0.02);
  plane(hs, 0.4, 0.62, screenMaterial(SIGN.menus[4], 0.9), 0, 0, 0.041);
  rb(g, 0, -0.1, 0.5, 0.06, 1.5, 1.6, M.redSatin, 0.01);
  plane(g, 0.2, 0.086, M.wordmark, 0, 1.55, -0.069);
  rb(g, 0.2, 0.08, 0.14, 0.16, 0.86, 0.88, body, 0.01);                                                // card shelf at 880 mm
  const t = rb(g, 0.2, 0.08, 0.075, 0.14, 0.88, 0.9, dark, 0.008); t.rotation.x = -0.2;
  plane(g, 0.12, 0.12, new THREE.MeshStandardMaterial({ color: 0x1d5fb4, roughness: 0.5 }), -0.16, 0.95, 0.0);   // access symbol plate
}
// Hand-wash basin (hands only): wall-hung stainless basin with knee valve, soap and
// paper-towel dispensers and a HAND WASH ONLY plate — one within a few steps of each food zone.
B.handwash = (g, w, d) => {
  const back = -d / 2;
  rb(g, 0, back + 0.19, 0.42, 0.34, 0.78, 0.9, M.steelPlain, 0.02);
  bx(g, 0, back + 0.2, 0.34, 0.24, 0.84, 0.901, M.steelDark);
  rb(g, 0, back + 0.19, 0.3, 0.16, 0.45, 0.78, M.steelPlain, 0.01);                                     // knee-valve panel
  tube(g, [[0, 0.9, back + 0.04], [0, 1.05, back + 0.05], [0, 1.08, back + 0.14], [0, 1.0, back + 0.2]], 0.01, M.chrome, 12, 8);
  rb(g, -0.3, back + 0.05, 0.12, 0.1, 1.1, 1.32, M.whiteGloss, 0.01);                                   // soap
  rb(g, 0.34, back + 0.07, 0.28, 0.13, 1.1, 1.45, M.whiteGloss, 0.01);                                  // towels
  rb(g, 0.34, back + 0.13, 0.12, 0.02, 1.08, 1.12, M.paper, 0.004);
  rb(g, 0, back + 0.01, 0.4, 0.02, 1.52, 1.6, M.whiteGloss, 0.004);
  plane(g, 0.36, 0.05, new THREE.MeshStandardMaterial({ color: 0x1f6b3a, roughness: 0.5 }), 0, 1.56, back + 0.021);
};
// ------------------------------------------------------------ B2 revision items
// Fresh-pasta shelving: open stainless shelving holding kraft/wicker baskets of
// the day's nests, set at the end of the pasta bench so staff at the machines can
// reach it and passers-by see the stock through the glazing.
B.pastaShelf = (g, w, d, it) => {
  if (it && it.chilled) {                                    // refrigerated open-front multideck, 0–5 °C
    rb(g, 0, 0, w, d, 0, 0.2, M.blackMetal, 0.006);
    bx(g, 0, d / 2 + 0.001, w - 0.06, 0.004, 0.04, 0.16, M.steelDark);                                   // intake grille
    [-1, 1].forEach(sd => { const p = plane(g, d, 1.72, M.glassTint, sd * w / 2, 1.06, 0, Math.PI / 2); p.renderOrder = 3; });
    rb(g, 0, -d / 2 + 0.02, w, 0.04, 0.2, 1.92, M.steelPlain, 0.004);
    rb(g, 0, 0, w, d, 1.9, 1.98, M.blackMetal, 0.006);
    bx(g, 0, d / 2 - 0.05, w - 0.04, 0.02, 1.885, 1.9, M.ledCool);
    plane(g, 0.09, 0.035, new THREE.MeshStandardMaterial({ color: 0x06121e, emissive: 0x7fd4ff, emissiveIntensity: 1.0 }), 0, 0.12, d / 2 + 0.004);   // temp display
  }
  const post = 0.025;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => rb(g, a * (w / 2 - post / 2), b * (d / 2 - post / 2), post, post, 0.0, 1.85, M.steelPlain, 0.003));
  for (let i = 0; i < 5; i++) {
    const y = 0.2 + i * 0.36;
    rb(g, 0, 0, w, d, y, y + 0.02, M.steelPlain, 0.003);
    if (i === 0) continue;
    const n = Math.max(1, Math.floor((w - 0.04) / 0.34));
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + 0.02 + (k + 0.5) * (w - 0.04) / n;
      tray(g, x, y + 0.02, 0, (w - 0.04) / n - 0.02, d - 0.06, 0.08, i % 2 ? M.kraft : M.redPlastic, true);
    }
  }
  if (!(it && it.chilled)) plane(g, Math.min(0.4, w * 0.9), Math.min(0.4, w * 0.9) * 0.43, M.wordmark, 0, 1.97, 0.0);
};
// Delivery pick-up: a counter-height return in the same red tile / terrazzo as the
// main counter, with a heated pick-up shelf loaded from the staff side and a blue
// DELIVERY PICK-UP lightbox, so riders have their own point off the customer queue.
B.deliveryPoint = (g, w, d) => {
  const front = d / 2;
  rb(g, 0, 0, w - 0.06, d - 0.06, 0, 0.1, M.blackMetal, 0.005);
  rb(g, 0, 0, w, d, 0.1, 1.04, fitted(M.redTile, w, 0.94), 0.01);
  rb(g, 0, 0, w + 0.04, d + 0.06, 1.04, 1.075, fitted(M.stone, w, d), 0.006);
  // heated pick-up rack: two stainless shelves under a strip heater
  [1.075, 1.36].forEach(y => rb(g, 0, 0, w - 0.1, d - 0.04, y, y + 0.015, M.steelPlain, 0.003));
  [-1, 1].forEach(sd => rb(g, sd * (w / 2 - 0.06), 0, 0.03, d - 0.04, 1.075, 1.66, M.blackMetal, 0.004));
  rb(g, 0, 0, w - 0.08, d - 0.02, 1.62, 1.68, M.blackMetal, 0.008);
  bx(g, 0, 0, w - 0.14, 0.05, 1.615, 1.62, new THREE.MeshStandardMaterial({ color: 0xff8a50, emissive: 0xff5a1e, emissiveIntensity: 0.9 }));
  for (let i = 0; i < 3; i++) bag(g, -w / 3 + i * w / 3, 1.09, 0.0);
  bag(g, -w / 6, 1.375, 0.0);
  // lightbox on the rail above
  rb(g, 0, 0, Math.min(1.0, w - 0.1), 0.05, 1.9, 2.14, M.blackMetal, 0.006);
  const lb = plane(g, Math.min(0.96, w - 0.14), Math.min(0.96, w - 0.14) * 0.25, screenMaterial(SIGN.deliveryHere, 1.1), 0, 2.02, 0.026);
  const lb2 = lb.clone(); lb2.position.z = -0.026; lb2.rotation.y = Math.PI; g.add(lb2);
  [-0.3, 0.3].forEach(x => cy(g, x, 2.9, 0, 0.006, 1.52, M.blackMetal, 6));
  // floor marker for riders
  bx(g, 0, front + 0.45, w * 0.8, 0.5, 0.001, 0.004, new THREE.MeshStandardMaterial({ color: 0x2b5fa8, roughness: 0.7 }));
};
// Wall-mounted order-status TV (55", landscape) on a flat bracket.
B.orderTV = (g, w, d) => {
  const sw = Math.min(w, 1.21), sh = sw * 0.5625, y = 2.62;
  rb(g, 0, -d / 2 + 0.02, 0.4, 0.03, y - 0.2, y + 0.2, M.blackMetal, 0.004);
  rb(g, 0, -d / 2 + 0.06, sw + 0.02, 0.045, y - sh / 2 - 0.01, y + sh / 2 + 0.01, M.blackMetal, 0.006);
  plane(g, sw - 0.02, sh - 0.02, screenMaterial(SIGN.orderStatus, 1.0), 0, y, -d / 2 + 0.0835);
};
// Customer waste + tray-return station: built-in oak-and-red-tile joinery with
// three apertures (trays / recycling / general waste) over removable bins, a tray
// stack on top and a lit sign, sized to sit in the low-headroom bay beside the stair.
B.binStation = (g, w, d) => {
  const front = d / 2;
  rb(g, 0, 0, w - 0.04, d - 0.04, 0, 0.1, M.blackMetal, 0.005);
  rb(g, 0, 0, w, d, 0.1, 0.98, fitted(M.redTile, w, 0.88), 0.01);
  rb(g, 0, 0, w + 0.03, d + 0.03, 0.98, 1.01, fitted(M.oak, w, d), 0.005);
  const n = 3, cw = (w - 0.08) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.04 + (i + 0.5) * cw;
    rb(g, x, front + 0.001, cw - 0.04, 0.01, 0.12, 0.9, M.oak, 0.006);                       // bin door
    bx(g, x, front - 0.12, cw - 0.12, 0.16, 1.005, 1.012, M.blackMetal);                      // aperture
    rb(g, x, front + 0.012, 0.12, 0.015, 0.78, 0.8, M.blackMetal, 0.004);                     // pull
  }
  for (let i = 0; i < 6; i++) rb(g, w / 2 - 0.2, -0.05, 0.3, 0.2, 1.01 + i * 0.018, 1.025 + i * 0.018, M.redPlastic, 0.004); // tray stack
  rb(g, 0, -d / 2 + 0.015, w, 0.03, 1.01, 1.45, M.cream, 0.006);                             // upstand
  plane(g, w - 0.08, (w - 0.08) * 0.15, screenMaterial(SIGN.waste, 0.9), 0, 1.3, -d / 2 + 0.031);
};
// Staff gate: self-closing half-height swing gate in the same stainless + glass as
// the guard, with a STAFF ONLY plate. Drawn closed; walkers pass through it.
B.staffGate = (g, w, d) => {
  const h = 1.0;
  [-w / 2 + 0.02, w / 2 - 0.02].forEach(x => rb(g, x, 0, 0.03, 0.03, 0, h + 0.2, M.steelPlain, 0.005));
  rb(g, 0, 0, w - 0.08, 0.025, h - 0.03, h, M.steelPlain, 0.004);
  rb(g, 0, 0, w - 0.08, 0.025, 0.12, 0.15, M.steelPlain, 0.004);
  const gl = plane(g, w - 0.1, h - 0.18, M.glassTint, 0, 0.14 + (h - 0.18) / 2, 0); gl.renderOrder = 3;
  if (M.manifest) plane(g, w - 0.12, 0.07, M.manifest, 0, 0.925, 0.004);
  rb(g, 0, 0.016, 0.26, 0.006, 0.7, 0.78, M.blackMetal, 0.002);
  plane(g, 0.22, 0.05, M.whitePowder, 0, 0.74, 0.02);
};
// ------------------------------------------------------------ signage objects
B.menuScreens = (g, w, d, it) => {
  const ids = it.screens || [0, 1, 2], n = ids.length;
  const sw = 0.575, sh = 0.99, gap = Math.max(0.02, (w - n * sw) / (n - 1 || 1)), y = 2.72;
  const total = n * sw + (n - 1) * gap;
  bx(g, 0, -0.03, total + 0.1, 0.05, 3.3, 3.34, M.blackMetal);
  [-total / 2, total / 2].forEach(x => cy(g, x, 3.48, -0.03, 0.012, 0.3, M.blackMetal, 10));
  ids.forEach((id, i) => {
    const x = -total / 2 + sw / 2 + i * (sw + gap);
    rb(g, x, -0.01, sw, 0.035, y - sh / 2, y + sh / 2, M.blackMetal, 0.006);
    plane(g, sw - 0.02, sh - 0.02, screenMaterial(SIGN.menus[id], 0.95), x, y, 0.0085);
    bx(g, x, -0.03, 0.03, 0.02, y + sh / 2, 3.3, M.blackMetal);
  });
};
B.orderScreen = (g, w, d) => {
  const sw = Math.min(w, 0.97), sh = sw * 0.5625, y = 2.52;
  rb(g, 0, 0, sw + 0.02, 0.04, y - sh / 2 - 0.01, y + sh / 2 + 0.01, M.blackMetal, 0.006);
  plane(g, sw - 0.02, sh - 0.02, screenMaterial(SIGN.orderStatus, 1.0), 0, y, 0.021);
  [-sw / 3, sw / 3].forEach(x => cy(g, x, (y + sh / 2 + 3.62) / 2, 0, 0.01, 3.62 - y - sh / 2, M.blackMetal, 8));
};
B.glassScreen = (g, w, d, it) => {
  const h = it.height || 1.3;
  if (M.manifest) [0.004, -0.004].forEach(o => { const b = plane(g, w - 0.04, 0.07, M.manifest, 0, 0.925, o); if (o < 0) b.rotation.y = Math.PI; });   // Part K band 850–1000
  const s = plane(g, w, h - 0.05, M.glassTint, 0, 0.05 + (h - 0.05) / 2, 0); s.renderOrder = 3;
  rb(g, 0, 0, w, 0.03, h - 0.01, h + 0.02, M.steelPlain, 0.005);
  rb(g, 0, 0, w, 0.03, 0.0, 0.06, M.steelPlain, 0.005);
  [-w / 2, w / 2].forEach(x => rb(g, x, 0, 0.03, 0.03, 0, h + 0.02, M.steelPlain, 0.005));
};
// ------------------------------------------------------------ furniture (spec: Pop chair, Mizzi table, RIO stool, Ila pendant)
B.table = (g, w, d) => {
  rb(g, 0, 0, w, d, 0.725, 0.75, M.whitePowder, 0.006);
  rb(g, 0, 0, w - 0.06, d - 0.06, 0.7, 0.725, M.whitePowder, 0.004);
  const n = Math.max(w, d) > 1.0 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const off = n === 1 ? 0 : (i - 0.5) * Math.max(w, d) * 0.55, x = w >= d ? off : 0, z = w >= d ? 0 : off;
    cy(g, x, 0.36, z, 0.03, 0.68, M.whitePowder, 16);
    rb(g, x, z, 0.4, 0.4, 0.0, 0.012, M.whitePowder, 0.004);
  }
};
export function chair(g) { // one-piece polypropylene stacking chair, SH 460
  const mat = M.redPlastic;
  rb(g, 0, 0.01, 0.44, 0.43, 0.43, 0.46, mat, 0.012);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24, 1, true, Math.PI - 0.55, 1.1), mat);
  back.material = mat.clone(); back.material.side = THREE.DoubleSide;
  back.position.set(0, 0.64, 0.2); back.rotation.x = -0.12; g.add(back);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
    const l = rb(g, a * 0.19, b * 0.18, 0.035, 0.035, 0, 0.44, mat, 0.008); l.rotation.set(b * 0.05, 0, -a * 0.05);
  });
  [-0.19, 0.19].forEach(x => rb(g, x, -0.2, 0.03, 0.03, 0.46, 0.78, mat, 0.01).rotation.x = -0.12);
}
export function stool(g) { // RIO bar stool, SH 750, powder-coated steel
  const mat = M.redPowder;
  rb(g, 0, 0, 0.38, 0.38, 0.73, 0.76, mat, 0.01);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => tube(g, [[a * 0.16, 0.73, b * 0.16], [a * 0.2, 0, b * 0.2]], 0.011, mat, 2, 8));
  [[0, 0.21, 0.4, 0.02], [0, -0.21, 0.4, 0.02]].forEach(([x, z, ww]) => rb(g, x, z, ww, 0.02, 0.28, 0.3, mat, 0.005));
  [[0.21, 0], [-0.21, 0]].forEach(([x, z]) => rb(g, x, z, 0.02, 0.4, 0.28, 0.3, mat, 0.005));
  [-0.15, 0.15].forEach(x => tube(g, [[x, 0.76, -0.17], [x, 0.98, -0.2]], 0.01, mat, 2, 8));
  rb(g, 0, -0.2, 0.34, 0.02, 0.9, 0.98, mat, 0.008);
}
B.banquette = (g, w, d) => {
  rb(g, 0, 0.03, w, d - 0.06, 0.08, 0.44, fitted(M.seatTerrazzo, w, 0.4), 0.01);
  rb(g, 0, 0.0, w - 0.02, d - 0.14, 0, 0.08, M.blackMetal, 0.004);
  rb(g, 0, 0.06, w - 0.02, d - 0.14, 0.44, 0.5, M.fabric, 0.02);
  const n = Math.max(1, Math.round(w / 0.32)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const c = rb(g, -w / 2 + (i + 0.5) * cw, -d / 2 + 0.09, cw - 0.012, 0.09, 0.5, 0.95, M.fabric, 0.03); c.rotation.x = -0.1;
  }
  rb(g, 0, -d / 2 + 0.03, w, 0.06, 0.95, 0.99, M.oak, 0.005);
};
B.ledge = (g, w, d) => {
  rb(g, 0, 0, w, d, 1.02, 1.055, fitted(M.oak, w, d), 0.006);
  for (let x = -w / 2 + 0.15; x <= w / 2; x += Math.max(0.6, (w - 0.3) / Math.max(1, Math.round((w - 0.3) / 0.8)))) {
    rb(g, x, -d / 2 + 0.02, 0.04, 0.04, 0, 1.02, M.blackMetal, 0.004);
  }
  tube(g, [[-w / 2 + 0.05, 0.25, d / 2 + 0.15], [w / 2 - 0.05, 0.25, d / 2 + 0.15]], 0.016, M.blackMetal, 2, 12);
  [-w / 2 + 0.1, w / 2 - 0.1].forEach(x => tube(g, [[x, 0.25, d / 2 + 0.15], [x, 0.25, -d / 2 + 0.03]], 0.01, M.blackMetal, 2, 8));
};
export function pendant(g) { // Ila Orient red pendant
  cy(g, 0, 2.95, 0, 0.003, 1.3, M.blackMetal, 6);
  lathe(g, [[0.006, 0.22], [0.052, 0.21], [0.056, 0.2], [0.056, 0.0], [0.05, 0.0]], M.redSatin, 0, 2.08, 0, 32);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.048, 20, 14), M.bulb); b.position.set(0, 2.06, 0); g.add(b);
}

export const BUILDERS = B;
