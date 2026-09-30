// BIGOLI VICTORIA — Ground Floor interactive design-review model (Phase 1).
// Scene = existing building (survey.js) + one layout option (layouts.js),
// finished with the material library (materials.js), signage (screens.js) and
// equipment/furniture models (models.js). Plan coords (X east, Z north) map to
// three.js as (x, y, -z).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SURVEY as S } from './survey.js';
import { OPTIONS, STEPS } from './layouts.js';
import { buildMaterials, fitted } from './materials.js';
import { buildSignage, screenMaterial } from './screens.js';
import { initModels, BUILDERS, rb, cy, chair, stool, pendant } from './models.js';

// ------------------------------------------------------------------ renderer
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const persp = new THREE.PerspectiveCamera(68, 1, 0.03, 250);
persp.rotation.order = 'YXZ';
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
let camera = persp;
const orbit = new OrbitControls(persp, labelRenderer.domElement);
orbit.enabled = false; orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.495;
orbit.minDistance = 2; orbit.maxDistance = 30;

const V = (x, y, z) => new THREE.Vector3(x, y, -z);
const loader = new THREE.TextureLoader();
const loadTex = (url) => { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ------------------------------------------------------------------ materials + signage
const M = buildMaterials(loadTex);
const SIGN = buildSignage(loadTex);
const logoRed = loadTex('textures/logo_red.jpg');
const wordmarkTex = loadTex('textures/logo_red.jpg'); wordmarkTex.repeat.set(1, 0.44); wordmarkTex.offset.set(0, 0.17);
const charsTex = loadTex('textures/characters.png'); charsTex.wrapS = THREE.RepeatWrapping;
const sloganTex = loadTex('textures/slogan.png');
M.logo = new THREE.MeshStandardMaterial({ map: logoRed, roughness: 0.45, emissive: 0xffffff, emissiveMap: logoRed, emissiveIntensity: 0.12 });
M.wordmark = new THREE.MeshStandardMaterial({ map: wordmarkTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: wordmarkTex, emissiveIntensity: 0.35 });
M.characters = new THREE.MeshStandardMaterial({ map: charsTex, roughness: 0.7 });
M.slogan = new THREE.MeshStandardMaterial({ map: sloganTex, roughness: 0.7 });
M.manifest = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
initModels(M, SIGN);

// ------------------------------------------------------------------ helpers (plan coords)
function box(parent, x0, x1, z0, z1, y0, y1, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -(z0 + z1) / 2);
  m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
function shapeFrom(pts) { const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); s.closePath(); return s; }
function slab(parent, pts, y, mat, down = false) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeFrom(pts)), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = y;
  if (down) { m.material = mat.clone(); m.material.side = THREE.DoubleSide; }
  m.receiveShadow = true; parent.add(m); return m;
}
const planar = (mat) => { const m = mat.clone(); const t = mat.userData.tile || 1; for (const k of ['map', 'normalMap', 'roughnessMap']) if (mat[k]) { m[k] = mat[k].clone(); m[k].needsUpdate = true; m[k].repeat.set(1 / t, 1 / t); } return m; };
const FACE_ROT = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };

let colSegs = [], colBoxes = [];
const shellSegs = [], shellBoxes = [];

function wallSeg(parent, a, b, ref, t, y0, y1, mat, openings = []) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  let nx = dz / len, nz = -dx / len;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if ((ref[0] - mx) * nx + (ref[1] - mz) * nz > 0) { nx = -nx; nz = -nz; }
  const pieces = []; let last = 0;
  openings.forEach(([t0, t1, head]) => { pieces.push([last, t0, y0, y1]); pieces.push([t0, t1, head, y1]); last = t1; });
  pieces.push([last, 1, y0, y1]);
  for (const [p0, p1, h0, h1] of pieces) {
    if (p1 - p0 < 1e-3 || h1 - h0 < 1e-3) continue;
    const l = (p1 - p0) * len + (openings.length ? 0 : t), pm = (p0 + p1) / 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, h1 - h0, t), fitted(mat, l, h1 - h0));
    m.position.set(a[0] + dx * pm + nx * t / 2, (h0 + h1) / 2, -(a[1] + dz * pm + nz * t / 2));
    m.rotation.y = Math.atan2(dz, dx); m.castShadow = m.receiveShadow = true; parent.add(m);
  }
  let prev = 0;
  openings.forEach(([t0, t1]) => { shellSegs.push([a[0] + dx * prev, a[1] + dz * prev, a[0] + dx * t0, a[1] + dz * t0]); prev = t1; });
  shellSegs.push([a[0] + dx * prev, a[1] + dz * prev, b[0], b[1]]);
}
function wallPlane(parent, a, b, ref, y0, y1, mat, offset = 0.004) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  let nx = -dz / len, nz = dx / len;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if ((ref[0] - mx) * nx + (ref[1] - mz) * nz < 0) { nx = -nx; nz = -nz; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, y1 - y0), fitted(mat, len, y1 - y0));
  m.position.set(mx + nx * offset, (y0 + y1) / 2, -(mz + nz * offset));
  m.rotation.y = Math.atan2(nx, -nz); m.receiveShadow = true; parent.add(m); return m;
}

// ------------------------------------------------------------------ building shell
const shell = new THREE.Group(); scene.add(shell);
const ceilings = new THREE.Group(); shell.add(ceilings);
const upper = new THREE.Group(); shell.add(upper);
const W = S.west, E = S.east, PW = S.partyWall;
const WALL_H = 3.75, T = 0.35;
const Wref = [2.5, 2.5], Eref = [7.7, 3.0];

slab(shell, W.outline, 0, planar(M.floor));
slab(shell, E.outline, 0, planar(M.floor));
box(shell, PW.x0, PW.x1, PW.door.z0, PW.door.z1, -0.02, 0.002, M.stone, false);
// ceilings (painted soffit) + downlights
slab(ceilings, W.outline, W.ceiling, M.ceiling, true);
slab(ceilings, E.outline, E.ceiling, M.ceiling, true);
box(ceilings, 0, 5.28, 0, 0.3, W.glazing.head, W.ceiling, M.soffit);
box(ceilings, 5.70, 9.76, 0, 0.12, E.glazing.head, E.ceiling, M.soffit);
E.bulkheads.forEach(b => box(ceilings, b.x0, b.x1, b.z0, b.z1, b.h, E.ceiling, M.soffit));
box(ceilings, W.stair.lowHeadroom.x0, W.stair.lowHeadroom.x1, W.stair.lowHeadroom.z0, W.stair.lowHeadroom.z1, 2.0, W.ceiling, M.soffit);
const downlights = [[1.2, 1.1], [2.7, 1.1], [3.9, 1.1], [1.9, 3.0], [3.4, 3.2], [6.5, 1.0], [8.1, 1.0], [6.7, 2.8], [8.3, 2.8], [6.9, 4.5]];
downlights.forEach(([x, z]) => {
  const y = x < 5.5 ? W.ceiling : E.ceiling;
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), M.ledWarm); d.rotation.x = Math.PI / 2; d.position.copy(V(x, y - 0.003, z)); ceilings.add(d);
  const r = new THREE.Mesh(new THREE.RingGeometry(0.045, 0.06, 20), M.whitePowder); r.rotation.x = Math.PI / 2; r.position.copy(V(x, y - 0.002, z)); ceilings.add(r);
});

// walls
wallSeg(shell, [0, 0], [0, 4.84], Wref, T, 0, WALL_H, M.plaster);
wallSeg(shell, [0, 4.84], [2.0, 4.30], Wref, T, 0, WALL_H, M.plaster);
wallSeg(shell, [2.0, 4.30], [5.28, 5.13], Wref, T, 0, WALL_H, M.plaster);
wallSeg(shell, [5.70, 5.25], [9.47, 6.085], Eref, T, 0, WALL_H, M.plaster);
{
  const a = [9.47, 6.085], b = [9.76, 4.894];
  const t0 = (E.storeDoor.z1 - a[1]) / (b[1] - a[1]), t1 = (E.storeDoor.z0 - a[1]) / (b[1] - a[1]);
  wallSeg(shell, a, b, Eref, 0.14, 0, WALL_H, M.plaster, [[t0, t1, E.storeDoor.head]]);
}
wallSeg(shell, [9.76, 4.894], [9.76, 0], Eref, 0.14, 0, WALL_H, M.plaster);
const cb = W.chimneyBreast;
box(shell, -0.1, cb.x1, cb.z0, cb.z1, 0, WALL_H, fitted(M.plaster, 1.9, 3.7)); shellBoxes.push([0, cb.x1, cb.z0, cb.z1]);
box(shell, cb.x1 - 0.2, cb.x1 + 0.004, cb.fireplace.z0, cb.fireplace.z1, 0, cb.fireplace.h, M.blackMetal);
box(shell, PW.x0, PW.x1, -0.1, PW.door.z0, 0, WALL_H, fitted(M.plaster, 1.2, 3.7)); shellBoxes.push([PW.x0, PW.x1, -0.1, PW.door.z0]);
box(shell, PW.x0, PW.x1, PW.door.z1, 5.45, 0, WALL_H, fitted(M.plaster, 3.5, 3.7)); shellBoxes.push([PW.x0, PW.x1, PW.door.z1, 5.45]);
box(shell, PW.x0, PW.x1, PW.door.z0, PW.door.z1, PW.door.head, WALL_H, M.plaster);
// party-wall door: painted frame + leaf held open against the East side
box(shell, PW.x1, PW.x1 + 0.02, PW.door.z0 - 0.05, PW.door.z0, 0, PW.door.head + 0.05, M.whitePowder);
box(shell, PW.x1, PW.x1 + 0.02, PW.door.z1, PW.door.z1 + 0.05, 0, PW.door.head + 0.05, M.whitePowder);
// existing stair (retained)
{
  const rise = 0.19, wz = [2.13, 2.46, 2.79, 3.12];
  for (let i = 0; i < 3; i++) {
    const xl = 4.15 + (4.47 - 4.15) * ((wz[i] - 2.13) / 0.99);
    box(shell, xl, 5.28, wz[i], 3.12, 0, rise * (i + 1), M.cream);
    box(shell, xl - 0.01, 5.28, wz[i] - 0.01, wz[i] + 0.03, rise * (i + 1) - 0.01, rise * (i + 1) + 0.005, M.oak);
  }
  const st = W.stair.flight, n = 8, dz = (st.z1 - st.z0) / n;
  for (let i = 0; i < n; i++) {
    box(shell, st.x0, st.x1, st.z0 + i * dz, st.z1, 0, rise * (4 + i), M.cream);
    box(shell, st.x0, st.x1, st.z0 + i * dz - 0.01, st.z0 + i * dz + 0.03, rise * (4 + i) - 0.01, rise * (4 + i) + 0.005, M.oak);
  }
  box(shell, 4.42, 4.47, 3.3, 5.13, 0, W.ceiling, fitted(M.plaster, 1.8, 3.7));
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 10), M.blackMetal);
  rail.rotation.x = Math.PI / 2 - 0.5; rail.position.copy(V(4.12, 1.2, 2.75)); shell.add(rail);
  shellBoxes.push([4.15, 5.28, 2.13, 5.13], [3.61, 4.47, 4.35, 5.13]);
}
[...W.elec, ...E.elec].forEach(e => box(shell, e.x0, e.x1, e.z0, e.z1, 0.9, 1.75, M.whitePowder));
// neighbouring upper-floor lobby block + store beyond dh.1810 (context only)
box(shell, 9.76, 10.95, -0.1, 4.90, 0, WALL_H, M.neighbour); shellBoxes.push([9.76, 10.95, -0.1, 4.90]);
box(shell, 10.85, 11.0, 4.9, 6.45, 0, WALL_H, M.neighbour);
box(shell, 9.40, 11.0, 6.30, 6.45, 0, WALL_H, M.neighbour);
slab(shell, [[9.76, 4.894], [10.85, 4.9], [10.85, 6.3], [9.45, 6.3], [9.47, 6.085]], 0.001, M.cream);
box(ceilings, 9.6, 10.85, 4.9, 6.3, 1.85, 1.9, M.soffit);
shellSegs.push([10.85, 4.9, 10.85, 6.3], [9.45, 6.3, 10.85, 6.3]);
shellBoxes.push([-14, -0.02, -0.12, 6.4], [9.76, 24, -0.12, 4.9]);

// wall finishes — tiles depend on which unit is operational
const finishes = new THREE.Group(); shell.add(finishes);
const WALL_LINES = {
  W: [[[0, 0.02], [0, 1.495]], [[cb.x1, 1.495], [cb.x1, 3.386]], [[0, 1.495], [cb.x1, 1.495]], [[0, 3.386], [cb.x1, 3.386]], [[0, 3.386], [0, 4.84]], [[0, 4.84], [2.0, 4.30]], [[2.0, 4.30], [4.42, 4.91]], [[5.28, 0.02], [5.28, 1.19]], [[5.28, 1.98], [5.28, 2.13]]],
  E: [[[5.70, 0.02], [5.70, 1.19]], [[5.70, 1.98], [5.70, 5.25]], [[5.70, 5.25], [9.47, 6.085]], [[9.76, 4.894], [9.76, 0.02]]],
};
function applyFinishes(opsUnit) {
  finishes.clear();
  for (const u of ['W', 'E']) {
    const ref = u === 'W' ? Wref : Eref, ops = u === opsUnit;
    WALL_LINES[u].forEach(([a, b]) => {
      wallPlane(finishes, a, b, ref, 0, ops ? 2.1 : 1.2, ops ? M.kitchenTile : M.diningTile);
      if (!ops) wallPlane(finishes, a, b, ref, 1.2, 1.235, M.oak, 0.012);   // oak capping rail
    });
  }
}

// shopfront -----------------------------------------------------------------
// Shopfront + doors are rebuilt per option: an option may relocate a door
// (layouts.js `shopfront`); otherwise the surveyed arrangement is used.
const front = new THREE.Group(); shell.add(front);
let frontSegs = [], frontBoxes = [];
function shopfront(x0, x1, head, mullions) {
  const shell = front;
  box(shell, x0, x1, -0.12, 0, 0, 0.32, fitted(M.redTile, x1 - x0, 0.32));
  box(shell, x0, x1, -0.16, -0.02, 0.32, 0.36, M.frame);
  const gl = box(shell, x0, x1, -0.07, -0.05, 0.36, head, M.glass, false); gl.renderOrder = 2;
  [x0, ...mullions, x1].forEach(x => box(shell, x - 0.025, x + 0.025, -0.1, 0.0, 0.32, head, M.frame));
  box(shell, x0, x1, -0.1, 0, head - 0.06, head, M.frame);
  frontSegs.push([x0, 0, x1, 0]);
}
const SURVEY_FRONT = {
  west: { glazing: [W.glazing.x0, W.glazing.x1, [2.185]], door: { ...W.door, sign: 'ENTRANCE' } },
  east: { glazing: [E.glazing.x0, E.glazing.x1, [7.315]], door: { ...E.door, sign: 'EXIT' } },
};
function buildFront(opt) {
  front.clear(); frontSegs = []; frontBoxes = [];
  const f = opt.shopfront || SURVEY_FRONT;
  shopfront(f.west.glazing[0], f.west.glazing[1], W.glazing.head, f.west.glazing[2]);
  shopfront(f.east.glazing[0], f.east.glazing[1], E.glazing.head, f.east.glazing[2]);
  doorway(f.west.door, W.glazing.head, f.west.door.sign);
  doorway(f.east.door, E.glazing.head, f.east.door.sign);
  if (!opt.partyDoorOpen) {   // existing leaf held open against the East side
    box(front, PW.x1, PW.x1 + 0.79, PW.door.z1 + 0.005, PW.door.z1 + 0.045, 0.01, 1.98, M.whitePowder);
    frontBoxes.push([PW.x1, PW.x1 + 0.79, PW.door.z1, PW.door.z1 + 0.05]);
  }
  (f.infill || []).forEach(([x0, x1]) => { box(front, x0, x1, -0.12, 0, 0, W.glazing.head, fitted(M.plaster, x1 - x0, 3.2)); frontSegs.push([x0, 0, x1, 0]); });
}
function doorway(d, glazingHead, labelText) {
  const shell = front;
  const w = d.x1 - d.x0, west = d.hinge === 'west', hx = west ? d.x0 : d.x1; // leaf held open inward against the hinge jamb
  box(shell, d.x0 - 0.03, d.x0 + 0.02, -0.1, 0, 0, glazingHead, M.frame);
  box(shell, d.x0, d.x1, -0.1, 0, d.head, d.head + 0.07, M.frame);
  const tg = box(shell, d.x0, d.x1, -0.07, -0.05, d.head + 0.07, glazingHead, M.glass, false); tg.renderOrder = 2;
  box(shell, d.x0 - 0.1, d.x1 + 0.1, -0.2, 0, -0.15, 0.0, M.stone);                           // stone threshold step
  box(shell, d.x0 + 0.05, d.x1 - 0.05, 0.05, 0.95, 0.0, 0.012, M.rubber, false);             // entrance matting
  box(shell, d.x1 - 0.02, d.x1 + 0.03, -0.1, 0, 0, glazingHead, M.frame);
  const leaf = new THREE.Group(); leaf.position.copy(V(west ? hx + 0.03 : hx - 0.03, 0, 0)); leaf.rotation.y = Math.PI / 2; shell.add(leaf);
  const lw = w - 0.06;
  [[lw / 2, 0.06], [lw / 2, d.head - 0.06]].forEach(([x, y]) => rb(leaf, x, 0, lw, 0.05, y - 0.05, y + 0.05, M.frame, 0.004));
  [0.03, lw - 0.03].forEach(x => rb(leaf, x, 0, 0.06, 0.05, 0.01, d.head - 0.01, M.frame, 0.004));
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.1, d.head - 0.2), M.glass); lg.position.set(lw / 2, d.head / 2, 0); lg.renderOrder = 2; leaf.add(lg);
  [0.925, 1.5].forEach(y => [0.004, -0.004].forEach(o => { const b = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.12, 0.07), M.manifest); b.position.set(lw / 2, y, o); if (o < 0) b.rotation.y = Math.PI; leaf.add(b); }));   // Part K manifestation
  cy(leaf, lw - 0.1, 1.05, 0.06, 0.015, 1.0, M.chrome, 12); cy(leaf, lw - 0.1, 1.05, -0.06, 0.015, 1.0, M.chrome, 12);
  frontBoxes.push(west ? [hx + 0.01, hx + 0.08, 0, lw] : [hx - 0.08, hx - 0.01, 0, lw]);
  const tex = SIGN.doorSign(labelText);
  const vm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const v = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, w * 0.18), vm); v.position.copy(V((d.x0 + d.x1) / 2, d.head + 0.25, 0.075)); v.renderOrder = 3; shell.add(v);
  const v2 = v.clone(); v2.rotation.y = Math.PI; v2.position.z = 0.045; shell.add(v2);
}

// facade + fascia + street ---------------------------------------------------
box(upper, -0.6, 11.0, -0.12, 0.0, W.glazing.head, 3.62, M.frame);
box(upper, -0.6, 11.0, -0.12, 6.4, 4.35, 9.2, fitted(M.brick, 11.6, 4.85));
box(upper, -0.7, 11.1, -0.22, 0.0, 4.35, 4.45, M.stone);                                     // string course
box(shell, -0.35, 9.85, -0.32, -0.1, 3.62, 4.34, M.redSatin);                                // fascia
[2.64, 7.73].forEach(cx => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.82), M.wordmark); p.position.set(cx, 3.98, 0.325); shell.add(p); });
box(shell, -0.35, 9.85, -0.42, -0.32, 4.3, 4.34, M.frame);                                   // fascia light trough
box(shell, -0.3, 9.8, -0.42, -0.38, 4.27, 4.3, M.ledWarm, false);
box(shell, -0.6, -0.35, -0.12, 6.4, 0, 4.35, fitted(M.brick, 0.3, 4.35));
box(shell, 9.98, 10.74, -0.12, -0.1, 0, 2.135, new THREE.MeshStandardMaterial({ color: 0x1f2a24, roughness: 0.5 }));
box(shell, -16, 26, -4.2, -0.12, -0.3, -0.15, fitted(M.paving, 42, 4.1), false);
box(shell, -16, 26, -4.35, -4.2, -0.42, -0.15, M.kerb, false);
box(shell, -16, 26, -12.5, -4.35, -0.45, -0.3, fitted(M.asphalt, 42, 8), false);
box(shell, -16, 26, -16, -12.5, -0.3, -0.15, fitted(M.paving, 42, 3.5), false);
const lineMat = new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.8 });
[-8.4].forEach(z => { for (let x = -14; x < 25; x += 4) box(shell, x, x + 2.2, z - 0.06, z + 0.06, -0.3, -0.298, lineMat, false); });
const context = new THREE.Group(); shell.add(context);
function neighbour(x0, x1) {
  box(context, x0, x1, -0.12, 6.4, -0.15, 9.2, fitted(M.brick, x1 - x0, 9.4));
  box(context, x0 + 0.3, x1 - 0.3, -0.14, -0.12, 0.3, 3.2, M.neighbourGlass, false);
  box(context, x0 + 0.2, x1 - 0.2, -0.3, -0.12, 3.3, 3.95, new THREE.MeshStandardMaterial({ color: 0x3b3f42, roughness: 0.6 }));
  for (let x = x0 + 0.8; x < x1 - 1.0; x += 2.2) for (const y of [5.0, 7.2]) box(context, x, x + 1.1, -0.14, -0.12, y, y + 1.5, M.neighbourGlass, false);
}
neighbour(-16, -0.6); neighbour(11.0, 26);
{ const g = new THREE.Group(); g.position.copy(V(1.2, -0.15, -3.9)); context.add(g);   // street lamp
  cy(g, 0, 3.0, 0, 0.06, 6, M.blackMetal, 12); rb(g, 0, 0.35, 0.18, 0.7, 5.95, 6.05, M.blackMetal, 0.02);
  rb(g, 0, 0.55, 0.14, 0.3, 5.9, 5.94, M.ledWarm, 0.01); }

const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: M.sky, side: THREE.BackSide, fog: false }));
skyMesh.position.set(5, 0, 0); scene.add(skyMesh);
scene.fog = new THREE.Fog(0xd9dfe2, 35, 110);

// ------------------------------------------------------------------ lighting
const hemi = new THREE.HemisphereLight(0xe6edf2, 0x857c70, 0.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
sun.position.set(-4, 18, 16); sun.target.position.set(5, 0, -3); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
const interior = [];
function pointLight(x, y, z, i, color = 0xffe2c0) { const l = new THREE.PointLight(color, i, 0, 2); l.position.copy(V(x, y, z)); scene.add(l); interior.push([l, i]); return l; }
// a few fill lights stand in for the downlight grid (keeps the model fast on laptops)
[[1.4, 1.3], [3.6, 2.2], [6.6, 1.4], [8.4, 3.4]].forEach(([x, z]) => pointLight(x, 3.3, z, 7.5));
function spot(x, z, tx, tz, i) {
  const s = new THREE.SpotLight(0xffe6c8, i, 0, 0.95, 0.85, 2); s.position.copy(V(x, 3.5, z)); s.target.position.copy(V(tx, 0, tz));
  s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.normalBias = 0.02;
  scene.add(s, s.target); interior.push([s, i]); return s;
}
spot(2.6, 1.8, 2.2, 2.0, 22); spot(7.7, 2.8, 7.7, 2.8, 22);
const streetLamp = new THREE.PointLight(0xffc27a, 0, 0, 2); streetLamp.position.copy(V(1.2, 5.6, -3.4)); scene.add(streetLamp);

// ------------------------------------------------------------------ option build
const layout = new THREE.Group(); scene.add(layout);
const labelsGroup = new THREE.Group(); scene.add(labelsGroup);
const flowGroup = new THREE.Group(); scene.add(flowGroup);
let current = null, animated = [], optionLights = [];
const NO_COLLIDE = new Set(['staffGate', 'orderTV', 'extruder', 'traySet', 'board', 'menuScreens', 'orderScreen', 'canopy', 'feature', 'slogan', 'characters', 'pendant', 'chair', 'stool', 'filler']);
const NAMES = {
  pastaBench: 'Pasta production bench', extruder: 'Fresh pasta extruder (benchtop mixer-extruder)', traySet: 'Pasta trays 600 × 400',
  board: 'Dough board + scale', rack: 'Drying / holding rack (10 trays, mobile)', boiler: 'Pasta boiler, automatic basket lift',
  hob: 'Induction hob: sauce + pan finishing', bain: 'Heated sauce well (GN 1/6)', saladette: 'Refrigerated prep counter',
  filler: 'Stainless filler', canopy: 'Extraction canopy', counter: 'Service counter: display · POS · collection',
  menuScreens: 'Digital menu screens (3 × 43″ portrait)', orderScreen: 'Order-status screen (43″)', drinks: 'Upright drinks cooler', collectWall: 'Collection wall + order-status TV', kiosk: 'Self-order kiosk (32″ portrait)',
  glassScreen: 'Glass screen', potwash: 'Pot wash + dishwasher + hand-wash basin', fridge: 'Upright fridge', shelving: 'Dry-store shelving',
  underFridge: 'Under-counter fridge', prepTable: 'Prep table', ledge: 'Oak window bar', stool: 'Bar stool (RIO, SH 750)',
  chair: 'Stacking chair (Pop, SH 460)', table: 'Table (Mizzi)', banquette: 'Banquette (terrazzo base, upholstered)',
  pendant: 'Pendant (Ila, red)', pastaShelf: 'Fresh pasta shelving (baskets, staff side)', deliveryPoint: 'Delivery / Uber Eats pick-up point',
  orderTV: 'Order-status TV (55″)', staffGate: 'Staff gate (self-closing, half height)', handwash: 'Hand-wash basin (knee-operated, hands only)', binStation: 'Customer waste + tray return station', feature: 'Brand feature wall', characters: 'Pasta-character graphic band', slogan: 'Slogan strip',
};

function frameFor(it) {
  const cx = (it.x0 + it.x1) / 2, cz = (it.z0 + it.z1) / 2, f = it.face || 'S';
  const ew = f === 'E' || f === 'W';
  return { cx, cz, w: ew ? it.z1 - it.z0 : it.x1 - it.x0, d: ew ? it.x1 - it.x0 : it.z1 - it.z0, f };
}
function alongToLocal(it, P) { // plan coordinate along an item's length → local x
  const { cx, cz, f } = frameFor(it);
  return f === 'E' ? P - cz : f === 'W' ? -(P - cz) : f === 'S' ? P - cx : -(P - cx);
}
function tagItem(g, it) {
  g.userData.info = { it, name: it.label || NAMES[it.type] || it.type };
  g.traverse(o => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
}
function label(html, x, y, z, cls) {
  const el = document.createElement('div'); el.className = cls; el.innerHTML = html;
  const o = new CSS2DObject(el); o.position.copy(V(x, y, z)); labelsGroup.add(o); return o;
}
function ribbon(pts, color, width, dashed) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx2, bz] = pts[i + 1];
    const len = Math.hypot(bx2 - ax, bz - az), n = dashed ? Math.max(1, Math.floor(len / 0.22)) : 1;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = dashed ? t0 + 0.55 / n : 1;
      const x0 = ax + (bx2 - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx2 - ax) * t1, z1 = az + (bz - az) * t1;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(x1 - x0, z1 - z0), width), mat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(z1 - z0, x1 - x0);
      m.position.copy(V((x0 + x1) / 2, (z0 + z1) / 2 < -0.13 ? -0.145 : 0.014, (z0 + z1) / 2)); m.renderOrder = 4; flowGroup.add(m);
    }
  }
}
function wallGraphic(it, mat, h, y0, width, at) {
  const [a, b] = it.wall, dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const ref = a[0] < 5.5 ? Wref : Eref;
  let nx = -dz / len, nz = dx / len; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if ((ref[0] - mx) * nx + (ref[1] - mz) * nz < 0) { nx = -nx; nz = -nz; }
  const w = width ?? len, t = at ?? 0.5;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.position.copy(V(a[0] + dx * t + nx * 0.02, y0 + h / 2, a[1] + dz * t + nz * 0.02)); p.rotation.y = Math.atan2(nx, -nz);
  return { p, nx, nz, len };
}

function buildOption(id) {
  current = OPTIONS[id];
  layout.clear(); labelsGroup.clear(); flowGroup.clear(); animated = [];
  optionLights.forEach(l => { scene.remove(l); const k = interior.findIndex(([x]) => x === l); if (k >= 0) interior.splice(k, 1); }); optionLights = [];
  buildFront(current);
  colBoxes = [...shellBoxes, ...frontBoxes]; colSegs = [...shellSegs, ...frontSegs];
  applyFinishes(current.opsUnit);
  const addLight = (l, i) => { scene.add(l); optionLights.push(l); interior.push([l, i]); };

  for (const it of current.items) {
    const g = new THREE.Group();
    if (it.type === 'chair' || it.type === 'stool') {
      g.position.copy(V(it.x, 0, it.z)); g.rotation.y = FACE_ROT[it.face || 'S'];
      (it.type === 'chair' ? chair : stool)(g);
    } else if (it.type === 'pendant') {
      g.position.copy(V(it.x, 0, it.z)); pendant(g);
    } else if (it.type === 'feature') {
      const { p, nx, nz } = wallGraphic(it, M.logo, it.width, 1.3, it.width, it.at); g.add(p);
      const l = new THREE.SpotLight(0xffe8d0, 12, 0, 0.6, 0.7, 2); l.position.copy(p.position).add(new THREE.Vector3(nx * 1.4, 1.6, -nz * 1.4)); l.target = p; addLight(l, 12);
    } else if (it.type === 'slogan') {
      const [a, b] = it.wall, len = Math.hypot(b[0] - a[0], b[1] - a[1]), w = (it.to - it.from) * len;
      g.add(wallGraphic(it, M.slogan, w * 118 / 2048, 2.45, w, (it.from + it.to) / 2).p);
    } else if (it.type === 'characters') {
      const [a, b] = it.wall, len = Math.hypot(b[0] - a[0], b[1] - a[1]), h = 0.3;
      const mat = M.characters.clone(); mat.map = charsTex.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(len / (h * 1317 / 241), 1);
      g.add(wallGraphic(it, mat, h, it.y ?? 1.28, len, 0.5).p);
    } else if (it.type === 'canopy') {
      if (it.wall === 'N') {
        const sub = new THREE.Group(), len = it.x1 - it.x0, depth = it.z1 - it.z0;
        sub.position.set((it.x0 + it.x1) / 2, 0, -it.z1); sub.rotation.y = -Math.PI / 2; g.add(sub);
        const addLocal = (l, i) => { sub.updateMatrixWorld(true); l.position.applyMatrix4(sub.matrixWorld); addLight(l, i); };
        buildCanopy(sub, { x0: 0, x1: depth, z0: -len / 2, z1: len / 2, wall: 'W' }, addLocal);
      } else buildCanopy(g, it, addLight);
    } else {
      const { cx, cz, w, d, f } = frameFor(it);
      g.position.copy(V(cx, 0, cz)); g.rotation.y = FACE_ROT[f];
      const zones = {};
      if (it.zones) for (const [k, [p0, p1]] of Object.entries(it.zones)) { const a = alongToLocal(it, p0), b = alongToLocal(it, p1); zones[k] = [Math.min(a, b), Math.max(a, b)]; }
      (BUILDERS[it.type] || ((gg) => rb(gg, 0, 0, w, d, 0, 0.9, M.steelPlain)))(g, w, d, it, animated, zones);
      if (it.type === 'counter') counterSigns(it);
    }
    tagItem(g, it); layout.add(g);
    if (!NO_COLLIDE.has(it.type) && it.x0 !== undefined) colBoxes.push([it.x0, it.x1, it.z0, it.z1]);
  }
  // "fresh pasta made here daily" vinyl on the operational glazing
  const fg = (current.shopfront || SURVEY_FRONT)[current.opsUnit === 'W' ? 'west' : 'east'].glazing;
  const gz = { x0: fg[0], x1: fg[1] };
  const vm = new THREE.MeshBasicMaterial({ map: SIGN.pastaLab, transparent: true, depthWrite: false });
  const vw = Math.min(2.6, gz.x1 - gz.x0 - 0.4), v = new THREE.Mesh(new THREE.PlaneGeometry(vw, vw * 0.08), vm);
  v.position.copy(V((gz.x0 + gz.x1) / 2, 2.35, 0.075)); v.renderOrder = 3; layout.add(v);

  const tag = (n) => { const s = STEPS[n - 1]; return `<b>${s.n}</b><span>${s.name}</span>`; };
  for (const it of current.items) {
    if (!it.step) continue;
    const cx = (it.x0 + it.x1) / 2, cz = (it.z0 + it.z1) / 2;
    if (it.type === 'counter') {
      const c = it.zones.collect, mid = (c[0] + c[1]) / 2;
      if (it.face === 'S') { label(tag(5), mid, 1.75, it.z1 - 0.15, 'badge'); label(tag(6), mid, 1.3, it.z0, 'badge'); }
      else {
        label(tag(5), it.face === 'E' ? it.x0 + 0.15 : it.x1 - 0.15, 1.75, mid, 'badge');
        label(tag(6), it.face === 'E' ? it.x1 : it.x0, 1.3, mid, 'badge');
      }
    } else label(tag(it.step), cx, it.type === 'extruder' ? 1.62 : 2.0, cz, 'badge');
  }
  current.zones.forEach(z => label(z.text, z.x, 0.05, z.z, 'zone'));
  ribbon(current.flow, 0xcc1305, 0.07, false);
  ribbon(current.customerPath, 0x2f7a4f, 0.06, true);
  if (current.staffPath) ribbon(current.staffPath, 0x8a8f94, 0.05, true);
  if (current.deliveryPath) ribbon(current.deliveryPath, 0x2b5fa8, 0.06, true);
  (current.extraPaths || []).forEach(p => ribbon(p, 0x2f7a4f, 0.06, true));
  setNight(state.night, true);
  refreshVisibility(); drawMinimapBase();
}
function buildCanopy(g, it, addLight) {
  const wallX = it.wall === 'W' ? it.x0 : it.x1, outX = it.wall === 'W' ? it.x1 : it.x0, s = it.wall === 'W' ? 1 : -1;
  const len = it.z1 - it.z0, cz = (it.z0 + it.z1) / 2, depth = Math.abs(outX - wallX);
  box(g, Math.min(wallX, outX), Math.max(wallX, outX), it.z0, it.z1, 2.5, 2.56, M.steelPlain);
  box(g, Math.min(outX, outX - s * 0.02), Math.max(outX, outX - s * 0.02), it.z0, it.z1, 2.1, 2.56, fitted(M.steel, len, 0.46));
  [it.z0, it.z1 - 0.02].forEach(z => box(g, Math.min(wallX, outX), Math.max(wallX, outX), z, z + 0.02, 2.1, 2.56, M.steelPlain));
  const fm = M.baffle.clone(); fm.map = M.baffle.map.clone(); fm.map.repeat.set(len / 0.5, 1); fm.map.needsUpdate = true;
  const fg = new THREE.Group(); fg.position.copy(V(wallX + s * depth * 0.42, 2.32, cz)); fg.rotation.z = -s * 0.5; g.add(fg);
  const filt = new THREE.Mesh(new THREE.PlaneGeometry(depth * 0.85, len - 0.06), fm); filt.rotation.x = Math.PI / 2; fg.add(filt);
  box(g, Math.min(outX - s * 0.1, outX - s * 0.06), Math.max(outX - s * 0.1, outX - s * 0.06), it.z0 + 0.05, it.z1 - 0.05, 2.08, 2.1, M.ledCool, false);
  const dx = wallX + s * 0.3; box(g, dx - 0.2, dx + 0.2, cz - 0.25, cz + 0.25, 2.56, 3.66, M.steelPlain);
  const l = new THREE.PointLight(0xf6f8ff, 3.5, 0, 2); l.position.copy(V(outX - s * 0.35, 1.9, cz)); addLight(l, 3.5);
}
function counterSigns(it) {
  const signAt = (zoneKey, tex) => {
    const [p0, p1] = it.zones[zoneKey], mid = (p0 + p1) / 2;
    const g = new THREE.Group(); g.rotation.y = FACE_ROT[it.face]; layout.add(g);
    if (it.face === 'S') g.position.copy(V(mid, 0, it.z0 + 0.05));
    else g.position.copy(V(it.face === 'E' ? it.x1 - 0.05 : it.x0 + 0.05, 0, mid));
    rb(g, 0, 0, 0.52, 0.045, 1.8, 1.94, M.blackMetal, 0.005);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), screenMaterial(tex, 1.1)); p.position.set(0, 1.87, 0.024); g.add(p);
    [-0.2, 0.2].forEach(o => cy(g, o, 2.33, 0, 0.006, 0.76, M.blackMetal, 6));
    g.userData.info = { it: { ...it, x0: undefined }, name: zoneKey === 'pos' ? 'Order-here sign' : 'Collect-here sign' };
  };
  signAt('pos', SIGN.orderHere);
  if (it.collectSign) signAt('collect', SIGN.collectHere);
}

// ------------------------------------------------------------------ day / night
const state = { free: false, labels: true, flow: false, ceiling: true, night: false, hq: !matchMedia('(hover: none)').matches };
function setNight(on, silent) {
  state.night = on;
  skyMesh.material.map = on ? M.skyNight : M.sky; skyMesh.material.needsUpdate = true;
  scene.fog.color.set(on ? 0x0b0f18 : 0xd9dfe2);
  hemi.intensity = on ? 0.03 : 0.4; sun.intensity = on ? 0 : 2.4; sun.castShadow = !on;
  streetLamp.intensity = on ? 60 : 0;
  interior.forEach(([l, i]) => { l.intensity = i * (on ? 1.35 : 1); });
  M.wordmark.emissiveIntensity = on ? 1.4 : 0.35;
  M.ledWarm.emissiveIntensity = on ? 3.2 : 2.2;
  renderer.toneMappingExposure = on ? 1.0 : 0.92;
  scene.traverse(o => { const m = o.material; if (m && !Array.isArray(m) && m.envMapIntensity !== undefined) { if (m.userData.baseEnv === undefined) m.userData.baseEnv = m.envMapIntensity; m.envMapIntensity = m.userData.baseEnv * (on ? 0.12 : 0.42); } });
  if (!silent) document.getElementById('tg-night').setAttribute('aria-pressed', String(on));
}

// ------------------------------------------------------------------ collisions + walking
const R = 0.2;
function resolve(px, pz) {
  if (state.free) return [Math.max(-3, Math.min(13, px)), Math.max(-4, Math.min(6.3, pz))];
  for (let iter = 0; iter < 3; iter++) {
    for (const [ax, az, bx2, bz] of colSegs) {
      const dx = bx2 - ax, dz = bz - az, l2 = dx * dx + dz * dz;
      let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const cx = ax + dx * t, cz = az + dz * t, ex = px - cx, ez = pz - cz, dist = Math.hypot(ex, ez);
      if (dist < R && dist > 1e-6) { px = cx + ex / dist * R; pz = cz + ez / dist * R; }
    }
    for (const [x0, x1, z0, z1] of colBoxes) {
      const cx = Math.max(x0, Math.min(px, x1)), cz = Math.max(z0, Math.min(pz, z1));
      const ex = px - cx, ez = pz - cz, dist = Math.hypot(ex, ez);
      if (dist < R) {
        if (dist > 1e-6) { px = cx + ex / dist * R; pz = cz + ez / dist * R; }
        else { const o = [[px - x0 + R, -1, 0], [x1 - px + R, 1, 0], [pz - z0 + R, 0, -1], [z1 - pz + R, 0, 1]].sort((a, b) => a[0] - b[0])[0]; px += o[1] * o[0]; pz += o[2] * o[0]; }
      }
    }
  }
  return [Math.max(-3, Math.min(13, px)), Math.max(-4, Math.min(6.3, pz))];
}
const EYE = 1.6;
const player = { x: 4.9, z: -7.2, yaw: 0, pitch: 0 };
const floorAt = (z) => (z < -0.15 ? -0.15 : 0);
function applyWalkCamera() { persp.position.set(player.x, floorAt(player.z) + EYE, -player.z); persp.rotation.set(player.pitch, player.yaw, 0); }
function lookAtPlan(ex, ez, lx, ly, lz) {
  const dx = lx - ex, dy = ly - (floorAt(ez) + EYE), dz = -(lz - ez);
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

// ------------------------------------------------------------------ ambient occlusion (post)
let composer = null, gtao = null, renderPass = null;
async function setupComposer() {
  try {
    const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/GTAOPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
    const c = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, persp); c.addPass(renderPass);
    gtao = new GTAOPass(scene, persp, stage.clientWidth, stage.clientHeight);
    gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.0 });
    gtao.blendIntensity = 0.8; c.addPass(gtao);
    c.addPass(new OutputPass());
    composer = c; resize();
  } catch (e) { composer = null; console.warn('Ambient occlusion unavailable', e); }
}

// ------------------------------------------------------------------ modes, tour, input
let mode = 'walk', tween = null, tourIndex = 0;
const keys = new Set();
const el = labelRenderer.domElement;
function setMode(m) {
  mode = m; tween = null;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  orbit.enabled = m === 'orbit';
  if (m === 'orbit') { camera = persp; persp.fov = 45; persp.updateProjectionMatrix(); persp.position.set(3.2, 11.5, 8.5); orbit.target.set(4.9, 0.3, -2.8); orbit.update(); }
  else if (m === 'plan') { camera = ortho; ortho.position.set(4.9, 30, -2.6); ortho.up.set(0, 0, -1); ortho.lookAt(4.9, 0, -2.6); }
  else { camera = persp; persp.fov = 68; persp.updateProjectionMatrix(); persp.up.set(0, 1, 0); applyWalkCamera(); }
  document.body.dataset.mode = m; refreshVisibility(); resize();
}
function refreshVisibility() {
  const inside = mode === 'walk';
  ceilings.visible = inside && state.ceiling; upper.visible = inside; context.visible = inside;
  labelsGroup.visible = state.labels;
  labelsGroup.children.forEach(o => { o.visible = o.element.className === 'zone' ? mode !== 'walk' : true; });
  flowGroup.visible = state.flow || mode === 'plan';
  skyMesh.visible = mode !== 'plan';
  scene.background = mode === 'plan' ? new THREE.Color(0xeeebe2) : null;
}
function goTour(i, instant = false) {
  const stops = current.tour; tourIndex = (i + stops.length) % stops.length;
  const s = stops[tourIndex];
  if (mode !== 'walk') setMode('walk');
  const [ex, ez] = resolve(s.eye[0], s.eye[1]);
  const to = { x: ex, z: ez, ...lookAtPlan(ex, ez, ...s.look) };
  let dyaw = to.yaw - player.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  tween = { from: { ...player }, to: { ...to, yaw: player.yaw + dyaw }, t: 0, dur: (reduceMotion || instant) ? 0.001 : 1.4 };
  document.getElementById('tour-step').textContent = `${String(tourIndex + 1).padStart(2, '0')} / ${stops.length}`;
  document.getElementById('tour-title').textContent = s.t;
  document.getElementById('tour-desc').textContent = s.d;
  document.getElementById('tour-staff').hidden = !s.staff;
  document.querySelectorAll('#stops button').forEach((b, k) => b.setAttribute('aria-current', String(k === tourIndex)));
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

let drag = null;
el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; if (mode === 'walk') { el.setPointerCapture(e.pointerId); tween = null; } });
el.addEventListener('pointermove', (e) => {
  if (!drag || mode !== 'walk') return;
  const k = 0.0042 * (persp.fov / 68);
  player.yaw += (e.clientX - drag.x) * k; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch + (e.clientY - drag.y) * k));
  drag.x = e.clientX; drag.y = e.clientY;
});
el.addEventListener('pointerup', (e) => { if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) inspect(e); drag = null; });
el.addEventListener('pointercancel', () => { drag = null; });
el.addEventListener('wheel', (e) => {
  if (mode === 'plan') { planZoom = Math.max(0.45, Math.min(2.5, planZoom * (e.deltaY > 0 ? 1.1 : 0.9))); resize(); }
  else if (mode === 'walk') { persp.fov = Math.max(35, Math.min(90, persp.fov + e.deltaY * 0.03)); persp.updateProjectionMatrix(); }
}, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input,select,textarea')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e'].includes(k)) { keys.add(k); tween = null; if (k.startsWith('arrow')) e.preventDefault(); }
  if (k === 'n' || k === 'pagedown') goTour(tourIndex + 1);
  if (k === 'p' || k === 'pageup') goTour(tourIndex - 1);
  if (k === 'escape') document.getElementById('inspect').hidden = true;
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
document.querySelectorAll('[data-pad]').forEach(btn => {
  const k = btn.dataset.pad;
  const on = (e) => { e.preventDefault(); keys.add(k); tween = null; if (mode !== 'walk') setMode('walk'); };
  const off = () => keys.delete(k);
  btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointerleave', off); btn.addEventListener('pointercancel', off);
});

// click-to-inspect: name, footprint, height, position from the shopfront
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), floorHit = new THREE.Vector3();
// From Plan or 3D overview: click any spot to step into the model there, at eye
// height, facing into that room (or into the shop from the street).
function walkInto(x, z) {
  const [px, pz] = resolve(x, z);
  const c = pz < 0 ? [px, 2.5] : px < 5.5 ? [2.6, 2.5] : [7.7, 2.8];
  let [tx, tz] = c; if (Math.hypot(tx - px, tz - pz) < 0.8) { tx = px; tz = pz + 2; }
  setMode('walk'); tween = null;
  Object.assign(player, { x: px, z: pz }, lookAtPlan(px, pz, tx, 1.35, tz));
  document.getElementById('inspect').hidden = true;
}
function inspect(e) {
  const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (mode !== 'walk') { if (ray.ray.intersectPlane(floorPlane, floorHit)) walkInto(floorHit.x, -floorHit.z); return; }
  const hit = ray.intersectObjects(layout.children, true)[0], panel = document.getElementById('inspect');
  let o = hit && hit.object; while (o && !o.userData.info) o = o.parent;
  if (!o) { panel.hidden = true; return; }
  const { it, name } = o.userData.info, bb = new THREE.Box3().setFromObject(o), f = (v) => v.toFixed(2);
  let dims = '', pos = '';
  if (it.x0 !== undefined) {
    const { w, d } = frameFor(it);
    dims = `${Math.round(w * 1000)} × ${Math.round(d * 1000)} mm footprint · ${Math.round(bb.max.y * 1000)} mm high`;
    pos = `X ${f(it.x0)}–${f(it.x1)} m · ${f(it.z0)}–${f(it.z1)} m back from the glazing`;
  } else if (it.x !== undefined) { dims = `${Math.round(bb.max.y * 1000)} mm high`; pos = `X ${f(it.x)} m · ${f(it.z)} m back from the glazing`; }
  document.getElementById('inspect-name').textContent = name;
  document.getElementById('inspect-dims').textContent = dims;
  document.getElementById('inspect-pos').textContent = pos;
  document.getElementById('inspect-key').textContent = `Option ${current.id} · layouts.js type "${it.type}"`;
  panel.hidden = false;
}

function step(dt, raw) {
  if (tween) {
    tween.t += raw / tween.dur; const t = ease(Math.min(1, tween.t));
    for (const k of ['x', 'z', 'yaw', 'pitch']) player[k] = tween.from[k] + (tween.to[k] - tween.from[k]) * t;
    if (tween.t >= 1) tween = null;
  } else if (mode === 'walk') {
    const sp = (keys.has('shift') ? 2.4 : 1.2) * dt;
    let f = 0, s = 0;
    if (keys.has('w') || keys.has('arrowup') || keys.has('fwd')) f += 1;
    if (keys.has('s') || keys.has('arrowdown') || keys.has('back')) f -= 1;
    if (keys.has('a') || keys.has('left')) s -= 1;
    if (keys.has('d') || keys.has('right')) s += 1;
    if (keys.has('arrowleft') || keys.has('q') || keys.has('turnl')) player.yaw += 1.5 * dt;
    if (keys.has('arrowright') || keys.has('e') || keys.has('turnr')) player.yaw -= 1.5 * dt;
    if (f || s) {
      const fx = -Math.sin(player.yaw), fz3 = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz3 = -Math.sin(player.yaw);
      [player.x, player.z] = resolve(player.x + (fx * f + rx * s) * sp, player.z - (fz3 * f + rz3 * s) * sp);
    }
  }
  if (mode === 'walk') {
    applyWalkCamera();
    labelsGroup.children.forEach(o => { if (o.element.className === 'badge') o.visible = state.labels && Math.hypot(o.position.x - player.x, -o.position.z - player.z) < 3.0; });
  }
  const t = performance.now() / 1000;
  animated.forEach(s => { const k = ((t * 0.25 + s.userData.phase) % 1); s.position.y = s.userData.base + k * 0.5; s.material.opacity = 0.22 * (1 - k); });
}

// ------------------------------------------------------------------ minimap
const mm = document.getElementById('minimap'), mctx = mm.getContext('2d', { willReadFrequently: true });
const MMB = { x0: -0.8, x1: 11.2, z0: -2.2, z1: 6.7 };
let mmBase = null;
function mmTf() {
  const w = mm.width, h = mm.height, s = Math.min(w / (MMB.x1 - MMB.x0), h / (MMB.z1 - MMB.z0));
  const ox = (w - s * (MMB.x1 - MMB.x0)) / 2, oy = (h - s * (MMB.z1 - MMB.z0)) / 2;
  return { s, px: (x) => ox + (x - MMB.x0) * s, py: (z) => h - oy - (z - MMB.z0) * s };
}
function drawMinimapBase() {
  if (!current) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  mm.width = (mm.clientWidth || 240) * dpr; mm.height = (mm.clientHeight || 180) * dpr;
  const { s, px, py } = mmTf(), g = mctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, mm.width, mm.height);
  g.fillStyle = '#d7d8d3'; g.fillRect(0, py(0), mm.width, py(-2.2) - py(0));
  const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), py(z)) : g.moveTo(px(x), py(z)))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2 * dpr; g.stroke(); } };
  poly(W.outline, '#e7eee6', '#1d1f1e'); poly(E.outline, '#e7eee6', '#1d1f1e');
  const rect = (b, fill) => { g.fillStyle = fill; g.fillRect(px(b[0]), py(b[3]), (b[1] - b[0]) * s, (b[3] - b[2]) * s); };
  shellBoxes.slice(0, 7).forEach(b => rect(b, '#8d8f8b'));
  const col = { extruder: '#cc1305', rack: '#cc1305', boiler: '#cc1305', hob: '#cc1305', counter: '#cc1305', drinks: '#9e1208', collectWall: '#cc1305', kiosk: '#1b1d1c', pastaShelf: '#cc1305', deliveryPoint: '#2b5fa8', binStation: '#5b5f5c', table: '#ffffff', banquette: '#376a4a', ledge: '#c49a68' };
  current.items.forEach(it => { if (it.x0 !== undefined && !['canopy', 'feature', 'slogan', 'characters', 'menuScreens', 'orderScreen', 'orderTV', 'traySet', 'board', 'glassScreen'].includes(it.type)) rect([it.x0, it.x1, it.z0, it.z1], col[it.type] || '#b9bfc2'); });
  g.fillStyle = '#1d1f1e'; g.font = `600 ${9 * dpr}px Oswald, sans-serif`; g.textAlign = 'center';
  (current.mapMarks || [['IN', 4.82], ['OUT', 9.35]]).forEach(([t, x]) => g.fillText(t, px(x), py(-0.6))); g.fillText('VICTORIA STREET', px(5), py(-1.6));
  mmBase = g.getImageData(0, 0, mm.width, mm.height);
}
function drawMinimap() {
  if (!mmBase) return;
  mctx.putImageData(mmBase, 0, 0);
  if (mode === 'plan') return;
  const { px, py } = mmTf(), dpr = Math.min(window.devicePixelRatio, 2);
  let x = player.x, z = player.z, yaw = player.yaw;
  if (mode === 'orbit') { x = persp.position.x; z = -persp.position.z; yaw = Math.atan2(-(orbit.target.x - persp.position.x), -(orbit.target.z - persp.position.z)); }
  const cx = px(x), cyy = py(z), half = Math.min(1.1, (persp.fov * Math.PI / 180) * persp.aspect * 0.5), L = 38 * dpr;
  mctx.fillStyle = 'rgba(204,19,5,0.2)'; mctx.beginPath(); mctx.moveTo(cx, cyy);
  for (const a of [yaw - half, yaw + half]) mctx.lineTo(cx - Math.sin(a) * L, cyy - Math.cos(a) * L);
  mctx.closePath(); mctx.fill();
  mctx.fillStyle = '#cc1305'; mctx.beginPath(); mctx.arc(cx, cyy, 4.5 * dpr, 0, 7); mctx.fill(); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5 * dpr; mctx.stroke();
}
mm.addEventListener('click', (e) => {
  const r = mm.getBoundingClientRect(), dpr = mm.width / r.width, { s, px, py } = mmTf();
  const X = MMB.x0 + ((e.clientX - r.left) * dpr - px(MMB.x0)) / s, Z = MMB.z0 + (py(MMB.z0) - (e.clientY - r.top) * dpr) / s;
  if (mode !== 'walk') setMode('walk');
  [player.x, player.z] = resolve(X, Z); tween = null;
});

// ------------------------------------------------------------------ resize + loop
let planZoom = 1;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
  if (composer) composer.setSize(w, h);
  persp.aspect = w / h; persp.updateProjectionMatrix();
  const span = 13.5 * planZoom, a = w / h, hh = a > 1.36 ? span / 1.36 / 2 : span / a / 2, hw = hh * a;
  Object.assign(ortho, { left: -hw, right: hw, top: hh, bottom: -hh }); ortho.updateProjectionMatrix();
  drawMinimapBase();
}
window.addEventListener('resize', resize);
const clock = new THREE.Clock();
let frameMs = 0;
function frame() {
  const t0 = performance.now();
  const raw = clock.getDelta();
  if (renderer.xr.isPresenting) {           // headset: controllers drive movement, no post / labels
    xrStep(Math.min(0.05, raw));
    renderer.render(scene, persp);
    frameMs = performance.now() - t0;
    return;
  }
  step(Math.min(0.05, raw), Math.min(raw, 0.5));
  if (mode === 'orbit') orbit.update();
  if (composer && state.hq && camera === persp) composer.render();
  else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  drawMinimap();
  frameMs = performance.now() - t0;
}

// ------------------------------------------------------------------ VR (WebXR, Meta Quest browser)
// The user's real head height is used (local-floor). A "dolly" carries the camera:
// left stick walks (with the same collisions as desktop), right stick snap-turns 30°,
// A / B = next / previous review view, X = night, Y = walk through objects.
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
const dolly = new THREE.Group(); scene.add(dolly);
const xrPad = { prev: {} }, _hp = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function headPlan() { persp.getWorldPosition(_hp); persp.getWorldQuaternion(_q); _e.setFromQuaternion(_q); return { x: _hp.x, z: -_hp.z, yaw: _e.y }; }
function xrPlace(x, z, yaw) {             // put the viewer's head at plan (x, z) facing yaw
  const h = headPlan();
  dolly.rotation.y += yaw - h.yaw; dolly.updateMatrixWorld(true);
  const h2 = headPlan();
  dolly.position.x += x - h2.x; dolly.position.z += -(z - h2.z); dolly.position.y = floorAt(z);
}
// floating caption so the review view names are readable inside the headset
const capCanvas = document.createElement('canvas'); capCanvas.width = 1024; capCanvas.height = 256;
const capTex = new THREE.CanvasTexture(capCanvas); capTex.colorSpace = THREE.SRGBColorSpace;
const caption = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: capTex, transparent: true, depthTest: false }));
caption.renderOrder = 10; caption.visible = false; scene.add(caption);
let captionUntil = 0;
function showCaption(title, sub) {
  const g = capCanvas.getContext('2d'); g.clearRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(20,22,24,0.86)'; g.beginPath(); g.roundRect(0, 0, 1024, 256, 28); g.fill();
  g.fillStyle = '#cc1305'; g.fillRect(0, 0, 14, 256);
  g.fillStyle = '#fff'; g.font = "600 64px Oswald, 'Arial Narrow', sans-serif"; g.fillText(title.toUpperCase(), 44, 100);
  g.fillStyle = '#c9ccc9'; g.font = "400 34px Archivo, sans-serif";
  const words = (sub || '').split(' '); let line = '', y = 160;
  for (const w of words) { if (g.measureText(line + w).width > 930) { g.fillText(line, 44, y); line = ''; y += 44; if (y > 240) break; } line += w + ' '; }
  if (y <= 240) g.fillText(line, 44, y);
  capTex.needsUpdate = true;
  const h = headPlan(); persp.getWorldPosition(_hp);
  caption.position.set(_hp.x - Math.sin(h.yaw) * 1.4, _hp.y - 0.25, _hp.z - Math.cos(h.yaw) * 1.4);
  caption.rotation.set(0, h.yaw, 0); caption.visible = true; captionUntil = performance.now() + 6000;
}
function xrTour(i) {
  const stops = current.tour; tourIndex = (i + stops.length) % stops.length; const st = stops[tourIndex];
  const [ex, ez] = resolve(st.eye[0], st.eye[1]);
  xrPlace(ex, ez, Math.atan2(-(st.look[0] - ex), (st.look[2] - ez)));
  showCaption(`${String(tourIndex + 1).padStart(2, '0')} · ${st.t}`, st.d);
}
function xrStep(dt) {
  const session = renderer.xr.getSession(); if (!session) return;
  let mx = 0, mz = 0, turn = 0; const pressed = {};
  for (const src of session.inputSources) {
    const gp = src.gamepad; if (!gp) continue;
    const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] || 0, gp.axes[1] || 0];
    if (src.handedness === 'left') { mx = ax[0]; mz = ax[1]; }
    else turn = ax[0];
    const hand = src.handedness === 'left' ? 'L' : 'R';
    [4, 5].forEach(b => { if (gp.buttons[b]?.pressed) pressed[hand + b] = true; });
  }
  const edge = (k) => pressed[k] && !xrPad.prev[k];
  if (edge('R4')) xrTour(tourIndex + 1);
  if (edge('R5')) xrTour(tourIndex - 1);
  if (edge('L4')) setNight(!state.night);
  if (edge('L5')) { state.free = !state.free; showCaption(state.free ? 'Walk through objects: ON' : 'Walk through objects: OFF', ''); }
  xrPad.prev = pressed;
  // snap turn
  if (Math.abs(turn) > 0.7 && !xrPad.turned) { const h = headPlan(); xrPlace(h.x, h.z, h.yaw - Math.sign(turn) * Math.PI / 6); xrPad.turned = true; }
  if (Math.abs(turn) < 0.3) xrPad.turned = false;
  // smooth walk relative to where the head looks, same collision resolver as desktop
  if (Math.hypot(mx, mz) > 0.15) {
    const h = headPlan(), sp = 1.3 * dt;
    const fx = -Math.sin(h.yaw), fz = Math.cos(h.yaw), rx = Math.cos(h.yaw), rz = Math.sin(h.yaw);
    const nx = h.x + (fx * -mz + rx * mx) * sp, nz = h.z + (fz * -mz + rz * mx) * sp;
    const [px, pz] = resolve(nx, nz);
    dolly.position.x += px - h.x; dolly.position.z += -(pz - h.z); dolly.position.y = floorAt(pz);
  }
  if (caption.visible && performance.now() > captionUntil) caption.visible = false;
  const t = performance.now() / 1000;
  animated.forEach(s => { const k = ((t * 0.25 + s.userData.phase) % 1); s.position.y = s.userData.base + k * 0.5; s.material.opacity = 0.22 * (1 - k); });
}
renderer.xr.addEventListener('sessionstart', () => {
  if (mode !== 'walk') setMode('walk');
  camera = persp; dolly.add(persp); persp.position.set(0, 0, 0); persp.rotation.set(0, 0, 0);
  dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // static shadows: keeps Quest at frame rate
  if (renderer.xr.setFoveation) renderer.xr.setFoveation(1);
  document.body.dataset.xr = 'on';
  setTimeout(() => xrTour(tourIndex), 300);
});
renderer.xr.addEventListener('sessionend', () => {
  dolly.remove(persp); renderer.shadowMap.autoUpdate = true; caption.visible = false;
  document.body.dataset.xr = ''; applyWalkCamera(); resize();
});
const vrBtn = document.getElementById('tg-vr');
// The button is always visible; if this browser can't do VR it explains where to open it.
const VR_LINK = 'https://emirnazari03-cmd.github.io/bigoli-victoria-vr/#B2';
async function initVR() {
  const note = document.getElementById('vr-note');
  const say = (html) => { note.innerHTML = html; note.hidden = false; setTimeout(() => { note.hidden = true; }, 9000); };
  const supported = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  const framed = window.top !== window.self;
  vrBtn.addEventListener('click', async () => {
    if (renderer.xr.isPresenting) { renderer.xr.getSession().end(); return; }
    if (!supported) {
      say(framed ? `VR can't start inside this page. In the Meta Quest Browser open:<br><b>${VR_LINK}</b>`
                 : `This browser has no VR headset. Open this link in the <b>Meta Quest Browser</b> (inside the headset):<br><b>${VR_LINK}</b>`);
      return;
    }
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      await renderer.xr.setSession(session);
    } catch (e) { say(`VR was blocked (${e.name}). Open in the Meta Quest Browser:<br><b>${VR_LINK}</b>`); console.warn(e); }
  });
}
initVR();

// ------------------------------------------------------------------ UI wiring
function setOption(id) {
  buildOption(id);
  document.querySelectorAll('[data-option]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.option === id)));
  document.getElementById('opt-summary').textContent = current.summary;
  document.getElementById('opt-journey').textContent = current.journey;
  document.getElementById('opt-seats').textContent = current.seats;
  const list = document.getElementById('stops'); list.innerHTML = '';
  current.tour.forEach((s, k) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<i>${String(k + 1).padStart(2, '0')}</i>${s.t}`; b.addEventListener('click', () => goTour(k)); list.appendChild(b); });
  try { localStorage.setItem('bigoli-option', id); } catch (e) { /* storage unavailable */ }
  if (mode === 'walk') goTour(Math.min(tourIndex, current.tour.length - 1));
}
document.querySelectorAll('[data-option]').forEach(b => b.addEventListener('click', () => setOption(b.dataset.option)));
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.toggle; state[k] = !state[k]; b.setAttribute('aria-pressed', String(state[k]));
  if (k === 'night') setNight(state.night); else if (k === 'free') { if (!state.free) [player.x, player.z] = resolve(player.x, player.z); } else refreshVisibility();
}));
document.getElementById('tg-hq').setAttribute('aria-pressed', String(state.hq));
document.getElementById('tour-prev').addEventListener('click', () => goTour(tourIndex - 1));
document.getElementById('tour-next').addEventListener('click', () => goTour(tourIndex + 1));
document.getElementById('inspect-close').addEventListener('click', () => { document.getElementById('inspect').hidden = true; });

let startOpt = 'A';
try { startOpt = localStorage.getItem('bigoli-option') || 'A'; } catch (e) { /* storage unavailable */ }
const hash = location.hash.replace('#', '').toUpperCase();
if (OPTIONS[hash]) startOpt = hash;
if (!OPTIONS[startOpt]) startOpt = 'A';
resize();
setOption(startOpt);
{ const s = current.tour[0]; player.x = s.eye[0]; player.z = s.eye[1]; Object.assign(player, lookAtPlan(s.eye[0], s.eye[1], ...s.look)); }
setMode('walk'); goTour(0, true);
setupComposer();
renderer.setAnimationLoop(frame);

// automation hook (used to export review stills)
window.bigoli = { xrTest: { dolly, headPlan, xrPlace, persp, resolve }, walkInto, get frameMs() { return frameMs; }, setOption, setMode, goTour, setNight, state, refreshVisibility, player, orbitTo: (p, t) => { persp.position.set(...p); orbit.target.set(...t); orbit.update(); } };
