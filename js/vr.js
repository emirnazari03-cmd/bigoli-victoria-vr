// BIGOLI VICTORIA — VR mode (WebXR, Meta Quest Browser).
// The desktop scene is ~1,300 meshes, 15 lights and 3 soft shadow maps: far too heavy
// for a headset at 72 fps, which is what made VR judder and drop frames. On entering VR:
//  * every static mesh is merged per material (≈1,300 draw calls → ≈150), originals hidden
//  * lights at zero intensity are switched off, shadows become static PCF (rendered once)
//  * a frame-time governor steps quality down (foveation → small lights → shadows)
//    until the headset holds its refresh rate, and never steps back up mid-session
// Controls: trigger / pinch = teleport (arc) or press menu buttons; left stick = walk;
// right stick = snap turn 30°; A / B = next / previous view; X = menu; Y = day / night.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { OPTIONS } from './layouts.js';

export function setupVR(ctx) {
  const { renderer, scene, persp, resolve, floorAt, state } = ctx;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  const dolly = new THREE.Group(); scene.add(dolly);
  const _hp = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  let eyeLift = 0;   // only used if the headset gives no floor-level reference space
  function headPlan() { persp.getWorldPosition(_hp); persp.getWorldQuaternion(_q); _e.setFromQuaternion(_q); return { x: _hp.x, z: -_hp.z, yaw: _e.y }; }
  function xrPlace(x, z, yaw) {          // put the viewer's head at plan (x, z) facing yaw
    const h = headPlan();
    dolly.rotation.y += yaw - h.yaw; dolly.updateMatrixWorld(true);
    const h2 = headPlan();
    dolly.position.x += x - h2.x; dolly.position.z += -(z - h2.z); dolly.position.y = floorAt(z) + eyeLift;
    dolly.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- static batching
  const baked = { group: null, hidden: [] };
  function underMovable(o) { for (let p = o; p; p = p.parent) { if (p.userData.gateLeaf || p === dolly || p.isCamera) return true; if (p.visible === false) return true; } return false; }
  function bake() {
    unbake();
    scene.updateMatrixWorld(true);
    const buckets = new Map(), animatedSet = new Set(ctx.animated());
    scene.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || animatedSet.has(o) || Array.isArray(o.material)) return;
      const m = o.material;
      if (m.transparent || o.renderOrder || underMovable(o) || o === ctx.sky || o.userData.noBake) return;
      const g = o.geometry; if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      const key = `${m.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
      let b = buckets.get(key); if (!b) buckets.set(key, b = { m, cast: o.castShadow, recv: o.receiveShadow, geos: [], src: [] });
      const c = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) c.setAttribute(k, g.attributes[k].clone());
      if (g.index) c.setIndex(g.index.clone());
      else { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; c.setIndex(new THREE.BufferAttribute(ix, 1)); }
      c.applyMatrix4(o.matrixWorld);
      if (o.matrixWorld.determinant() < 0) { const ix = c.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
      b.geos.push(c); b.src.push(o);
    });
    const group = new THREE.Group(); group.name = 'xr-baked';
    for (const b of buckets.values()) {
      if (b.src.length < 2) continue;                  // nothing to gain; leave the original in place
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere(); merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, b.m); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false;
      group.add(mesh);
      b.src.forEach(o => { o.visible = false; baked.hidden.push(o); });
    }
    scene.add(group); baked.group = group;
    return { buckets: buckets.size, merged: group.children.length, hidden: baked.hidden.length };
  }
  function unbake() {
    baked.hidden.forEach(o => { o.visible = true; }); baked.hidden = [];
    if (baked.group) { scene.remove(baked.group); baked.group.children.forEach(m => m.geometry.dispose()); baked.group = null; }
  }

  // ---------------------------------------------------------------- quality governor
  // tier 0: full (foveation 0.3) · 1: foveation 1 · 2: small accent lights off · 3: no shadows
  const quality = { tier: 0, samples: [], last: 0, settleUntil: 0, frameMs: 1000 / 72 };
  let lightsOff = [];
  function allLights() { const L = []; scene.traverse(o => { if (o.isLight) L.push(o); }); return L; }
  function setMaterialsDirty() { scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); }); }
  function applyLights() {
    lightsOff.forEach(l => { l.visible = true; }); lightsOff = [];
    for (const l of allLights()) {
      const small = (l.isPointLight && l.distance > 0 && l.distance < 3) || (l.isSpotLight && l.intensity <= 12);
      const off = l.intensity <= 0 || (quality.tier >= 2 && small);
      if (off && l.visible) { l.visible = false; lightsOff.push(l); }
      if (l.castShadow !== undefined && l.shadow && l.userData.xrCast === undefined) l.userData.xrCast = l.castShadow;
    }
    for (const l of allLights()) if (l.shadow && l.userData.xrCast !== undefined) l.castShadow = l.userData.xrCast && quality.tier < 3 && !(state.night && l.isDirectionalLight);
    renderer.shadowMap.needsUpdate = true;
  }
  function restoreLights() {
    lightsOff.forEach(l => { l.visible = true; }); lightsOff = [];
    for (const l of allLights()) if (l.userData.xrCast !== undefined) { l.castShadow = l.userData.xrCast; delete l.userData.xrCast; }
    if (state.night) { const sun = allLights().find(l => l.isDirectionalLight); if (sun) sun.castShadow = false; }
  }
  function setTier(t) {
    quality.tier = t;
    if (renderer.xr.setFoveation) renderer.xr.setFoveation(t === 0 ? 0.3 : 1);
    if (t >= 2) { applyLights(); setMaterialsDirty(); renderer.compile(scene, persp); }
    quality.samples = []; quality.settleUntil = performance.now() + 2500;
  }
  function govern(now) {
    const dt = now - quality.last; quality.last = now;
    if (dt <= 0 || dt > 500 || now < quality.settleUntil || quality.tier >= 3) return;
    quality.samples.push(dt);
    if (quality.samples.length < 90) return;
    const s = quality.samples.slice().sort((a, b) => a - b), p75 = s[Math.floor(s.length * 0.75)];
    quality.samples = [];
    if (p75 > quality.frameMs * 1.25) setTier(quality.tier + 1);
  }

  // ---------------------------------------------------------------- caption + menu + fade
  const capCanvas = document.createElement('canvas'); capCanvas.width = 1024; capCanvas.height = 256;
  const capTex = new THREE.CanvasTexture(capCanvas); capTex.colorSpace = THREE.SRGBColorSpace; capTex.anisotropy = 4;
  const caption = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: capTex, transparent: true, depthTest: false, fog: false, toneMapped: false }));
  caption.renderOrder = 10; caption.visible = false; scene.add(caption);
  let captionUntil = 0;
  function showCaption(title, sub) {
    const g = capCanvas.getContext('2d'); g.clearRect(0, 0, 1024, 256);
    g.fillStyle = 'rgba(20,22,24,0.88)'; g.beginPath(); g.roundRect(0, 0, 1024, 256, 28); g.fill();
    g.fillStyle = '#cc1305'; g.fillRect(0, 0, 14, 256);
    g.fillStyle = '#fff'; g.font = "600 64px Oswald, 'Arial Narrow', sans-serif"; g.fillText(title.toUpperCase(), 44, 100);
    g.fillStyle = '#c9ccc9'; g.font = "400 34px Archivo, sans-serif";
    const words = (sub || '').split(' '); let line = '', y = 160;
    for (const w of words) { if (g.measureText(line + w).width > 930) { g.fillText(line, 44, y); line = ''; y += 44; if (y > 240) break; } line += w + ' '; }
    if (y <= 240) g.fillText(line, 44, y);
    capTex.needsUpdate = true;
    placeInFront(caption, 1.4, -0.3); caption.visible = true; captionUntil = performance.now() + 6000;
  }
  function placeInFront(obj, dist, dy) {
    const h = headPlan(); persp.getWorldPosition(_hp);
    obj.position.set(_hp.x - Math.sin(h.yaw) * dist, _hp.y + dy, _hp.z - Math.cos(h.yaw) * dist);
    obj.rotation.set(0, h.yaw, 0);
  }

  // menu panel: world-fixed in front of the user, pressed with the laser (trigger / pinch)
  const MW = 1024, ROW = 96;
  const menuCanvas = document.createElement('canvas'); menuCanvas.width = MW; menuCanvas.height = 1400;
  const menuTex = new THREE.CanvasTexture(menuCanvas); menuTex.colorSpace = THREE.SRGBColorSpace; menuTex.anisotropy = 4;
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.64 * 1400 / MW), new THREE.MeshBasicMaterial({ map: menuTex, transparent: true, depthTest: false, fog: false, toneMapped: false }));
  menu.renderOrder = 11; menu.visible = false; scene.add(menu);
  let buttons = [], hover = null;
  function drawMenu() {
    const cur = ctx.current(), tour = cur.tour, rows = Math.ceil(tour.length / 2);
    const H = Math.min(2048, 470 + rows * ROW + 150);
    if (menuCanvas.height !== H) { menuCanvas.height = H; menu.geometry.dispose(); menu.geometry = new THREE.PlaneGeometry(0.64, 0.64 * H / MW); }
    const g = menuCanvas.getContext('2d'); buttons = [];
    g.clearRect(0, 0, MW, H);
    g.fillStyle = 'rgba(18,20,22,0.94)'; g.beginPath(); g.roundRect(0, 0, MW, H, 36); g.fill();
    g.fillStyle = '#cc1305'; g.fillRect(0, 0, MW, 12);
    g.fillStyle = '#fff'; g.font = "600 62px Oswald, 'Arial Narrow', sans-serif"; g.fillText('BIGOLI VICTORIA', 48, 96);
    g.fillStyle = '#9aa09a'; g.font = "400 30px Archivo, sans-serif"; g.fillText('Point and press trigger (or pinch) · X closes this menu', 48, 140);
    const btn = (id, label, x, y, w, h, on) => {
      const hov = hover === id;
      g.fillStyle = on ? '#cc1305' : hov ? '#3a3f42' : '#2a2e30'; g.beginPath(); g.roundRect(x, y, w, h, 16); g.fill();
      if (hov) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); }
      g.fillStyle = '#fff'; g.font = "500 32px Archivo, sans-serif";
      let t = label; while (g.measureText(t).width > w - 36 && t.length > 4) t = t.slice(0, -2) + '…';
      g.fillText(t, x + 18, y + h / 2 + 11);
      buttons.push({ id, x, y, w, h });
    };
    const ids = Object.keys(OPTIONS);
    g.fillStyle = '#9aa09a'; g.font = "600 26px Archivo, sans-serif"; g.fillText('LAYOUT', 48, 198);
    const ow = (MW - 96 - (ids.length - 1) * 16) / ids.length;
    ids.forEach((id, k) => btn('opt:' + id, 'Option ' + id, 48 + k * (ow + 16), 214, ow, 80, cur === OPTIONS[id]));
    const hw = (MW - 96 - 16) / 2;
    btn('night', state.night ? 'Night  (Y)' : 'Day  (Y)', 48, 314, hw, 80, state.night);
    btn('free', 'Walk through objects', 48 + hw + 16, 314, hw, 80, state.free);
    g.fillStyle = '#9aa09a'; g.font = "600 26px Archivo, sans-serif"; g.fillText('VIEWS  (A next · B back)', 48, 440);
    tour.forEach((s, k) => btn('tour:' + k, `${String(k + 1).padStart(2, '0')}  ${s.t}`, 48 + (k % 2) * (hw + 16), 456 + Math.floor(k / 2) * ROW, hw, ROW - 14, k === ctx.tourIndex()));
    btn('exit', 'Exit VR', 48, H - 116, MW - 96, 80, false);
    menuTex.needsUpdate = true;
  }
  function toggleMenu(on = !menu.visible) {
    if (on) { drawMenu(); placeInFront(menu, 1.0, -0.15); }
    menu.visible = on; hover = null;
  }
  function pressMenu(id) {
    if (id.startsWith('opt:')) { ctx.setOption(id.slice(4)); afterOptionChange(); }
    else if (id.startsWith('tour:')) { goView(+id.slice(5)); toggleMenu(false); return; }
    else if (id === 'night') toggleNight();
    else if (id === 'free') { state.free = !state.free; }
    else if (id === 'exit') { renderer.xr.getSession()?.end(); return; }
    drawMenu();
  }
  function toggleNight() { ctx.setNight(!state.night); applyLights(); }

  const fade = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 1, depthTest: false, fog: false }));
  fade.renderOrder = 20; fade.visible = false; persp.add(fade);
  const fader = { v: 1, target: 0, then: null };
  function fadeThen(fn) { fader.target = 1; fader.then = fn; }

  // ---------------------------------------------------------------- controllers, hands, teleport
  const cmf = new XRControllerModelFactory(), hmf = new XRHandModelFactory();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.9, depthTest: false, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 40).rotateX(-Math.PI / 2), ringMat);
  ring.renderOrder = 9; ring.visible = false; scene.add(ring);
  const ARC_N = 40, arcPos = new Float32Array(ARC_N * 3);
  const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
  const arcMat = new THREE.LineBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.85, depthTest: false, fog: false });
  const arc = new THREE.Line(arcGeo, arcMat); arc.renderOrder = 9; arc.frustumCulled = false; arc.visible = false; scene.add(arc);
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    const laser = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthTest: false, fog: false }));
    laser.scale.z = 1.5; laser.renderOrder = 9; laser.visible = false; c.add(laser);
    const h = { c, laser, src: null, aiming: false, hit: null };
    c.addEventListener('connected', (e) => { h.src = e.data; });
    c.addEventListener('disconnected', () => { h.src = null; h.aiming = false; });
    c.addEventListener('selectstart', () => { if (menuHit(h)) return; h.aiming = true; });
    c.addEventListener('selectend', () => {
      if (h.menuId) { pressMenu(h.menuId); h.menuId = null; return; }
      if (!h.aiming) return; h.aiming = false;
      if (h.hit) { const t = h.hit; fadeThen(() => { const yaw = headPlan().yaw; xrPlace(t.x, t.z, yaw); }); }
      else if (h.src && h.src.hand) toggleMenu();          // hand tracking: pinch at nothing opens / closes the menu
    });
    dolly.add(c);
    const grip = renderer.xr.getControllerGrip(i); grip.add(cmf.createControllerModel(grip)); dolly.add(grip);
    const hand = renderer.xr.getHand(i); hand.add(hmf.createHandModel(hand, 'mesh')); dolly.add(hand);
    hands.push(h);
  }
  const raycaster = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3(), _m4 = new THREE.Matrix4();
  function aimRay(h) { h.c.updateMatrixWorld(true); _o.setFromMatrixPosition(h.c.matrixWorld); _d.set(0, 0, -1).applyQuaternion(h.c.getWorldQuaternion(_q)); raycaster.set(_o, _d); }
  function menuHit(h) {
    if (!menu.visible) return false;
    aimRay(h); const hit = raycaster.intersectObject(menu, false)[0];
    if (!hit) return false;
    const px = hit.uv.x * MW, py = (1 - hit.uv.y) * menuCanvas.height;
    const b = buttons.find(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
    h.menuId = b ? b.id : null; return true;
  }
  // walls between head and target block a teleport (so you can't jump into the next unit)
  function crosses(ax, az, bx, bz) {
    const { segs, boxes } = ctx.collision();
    const cr = (x1, z1, x2, z2) => { const d = (bx - ax) * (z2 - z1) - (bz - az) * (x2 - x1); if (Math.abs(d) < 1e-9) return false;
      const t = ((x1 - ax) * (z2 - z1) - (z1 - az) * (x2 - x1)) / d, u = ((x1 - ax) * (bz - az) - (z1 - az) * (bx - ax)) / d; return t > 0 && t < 1 && u >= 0 && u <= 1; };
    for (const [x1, z1, x2, z2] of segs) if (cr(x1, z1, x2, z2)) return true;
    for (const [x0, x1, z0, z1] of boxes) if (cr(x0, z0, x1, z0) || cr(x1, z0, x1, z1) || cr(x1, z1, x0, z1) || cr(x0, z1, x0, z0)) return true;
    return false;
  }
  function updateAim(h) {
    h.hit = null;
    aimRay(h);
    const v = 6.5, g = -9.8; let n = 0, landed = null;
    for (let k = 0; k < ARC_N; k++) {
      const t = k * 0.035, x = _o.x + _d.x * v * t, y = _o.y + _d.y * v * t + 0.5 * g * t * t, z = _o.z + _d.z * v * t;
      const fy = floorAt(-z) + eyeLift;
      if (y <= fy) { const tz = -z; landed = { x, z: tz, y: fy }; arcPos.set([x, fy, z], k * 3); n = k + 1; break; }
      arcPos.set([x, y, z], k * 3); n = k + 1;
    }
    arcGeo.setDrawRange(0, n); arcGeo.attributes.position.needsUpdate = true;
    if (landed) {
      const [rx, rz] = resolve(landed.x, landed.z), hp = headPlan();
      const ok = Math.hypot(rx - landed.x, rz - landed.z) < 0.03 && (state.free || !crosses(hp.x, hp.z, landed.x, landed.z));
      ring.position.set(landed.x, landed.y + 0.01, -landed.z); ring.visible = true;
      ringMat.color.set(ok ? 0x35d07f : 0xe0453a); arcMat.color.set(ok ? 0x35d07f : 0xe0453a);
      if (ok) h.hit = landed;
    } else ring.visible = false;
    arc.visible = true;
  }

  // ---------------------------------------------------------------- views + per-frame step
  function goView(i) {
    const stops = ctx.current().tour, k = (i + stops.length) % stops.length, st = stops[k];
    ctx.setTourIndex(k);
    fadeThen(() => {
      const [ex, ez] = resolve(st.eye[0], st.eye[1]);
      xrPlace(ex, ez, Math.atan2(-(st.look[0] - ex), (st.look[2] - ez)));
      ctx.gateFor(ex, ez);
      showCaption(`${String(k + 1).padStart(2, '0')} · ${st.t}`, st.d);
    });
  }
  function afterOptionChange() {
    bake(); applyLights(); setMaterialsDirty(); renderer.compile(scene, persp);
    renderer.shadowMap.needsUpdate = true; goView(0);
  }
  const pad = { prev: {}, turned: false, frames: 0 };
  function step(dt) {
    const session = renderer.xr.getSession(); if (!session) return;
    const now = performance.now(); govern(now);
    if (++pad.frames === 3) goView(ctx.tourIndex());      // pose is valid from the 2nd XR frame
    // fade in / out (teleports and view jumps go through black: no motion sickness)
    if (fader.target !== fader.v) {
      fader.v += Math.sign(fader.target - fader.v) * Math.min(Math.abs(fader.target - fader.v), dt / 0.14);
      if (fader.v >= 1 && fader.then) { const f = fader.then; fader.then = null; f(); fader.target = 0; }
    }
    fade.material.opacity = fader.v; fade.visible = fader.v > 0.001;

    let mx = 0, mz = 0, turn = 0; const pressed = {};
    for (const src of session.inputSources) {
      const gp = src.gamepad; if (!gp || src.hand) continue;
      const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] || 0, gp.axes[1] || 0];
      if (src.handedness === 'left') { mx = ax[0]; mz = ax[1]; } else turn = ax[0];
      const hand = src.handedness === 'left' ? 'L' : 'R';
      [4, 5].forEach(b => { if (gp.buttons[b]?.pressed) pressed[hand + b] = true; });
    }
    const edge = (k) => pressed[k] && !pad.prev[k];
    if (edge('R4')) goView(ctx.tourIndex() + 1);
    if (edge('R5')) goView(ctx.tourIndex() - 1);
    if (edge('L4')) toggleMenu();
    if (edge('L5')) { toggleNight(); if (menu.visible) drawMenu(); }
    pad.prev = pressed;
    if (Math.abs(turn) > 0.7 && !pad.turned) { const h = headPlan(); xrPlace(h.x, h.z, h.yaw - Math.sign(turn) * Math.PI / 6); pad.turned = true; }
    if (Math.abs(turn) < 0.3) pad.turned = false;
    if (Math.hypot(mx, mz) > 0.15) {
      const h = headPlan(), sp = 1.2 * dt;
      const fx = -Math.sin(h.yaw), fz = Math.cos(h.yaw), rx = Math.cos(h.yaw), rz = Math.sin(h.yaw);
      const [px, pz] = resolve(h.x + (fx * -mz + rx * mx) * sp, h.z + (fz * -mz + rz * mx) * sp);
      dolly.position.x += px - h.x; dolly.position.z += -(pz - h.z); dolly.position.y = floorAt(pz) + eyeLift;
      ctx.gateFor(px, pz);
    }

    // lasers, menu hover, teleport arc (only one arc shown: the hand that is aiming)
    let newHover = null, aimed = false;
    for (const h of hands) {
      const onMenu = menu.visible && h.src && (aimRay(h), raycaster.intersectObject(menu, false)[0]);
      h.laser.visible = !!h.src && (menu.visible || !h.aiming);
      if (onMenu) {
        h.laser.scale.z = onMenu.distance;
        const px = onMenu.uv.x * MW, py = (1 - onMenu.uv.y) * menuCanvas.height;
        const b = buttons.find(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
        if (b) newHover = b.id;
      } else h.laser.scale.z = 1.5;
      if (h.aiming && !aimed) { updateAim(h); aimed = true; h.laser.visible = false; }
    }
    if (!aimed) { arc.visible = false; ring.visible = false; }
    if (menu.visible && newHover !== hover) { hover = newHover; drawMenu(); }
    if (caption.visible && now > captionUntil) caption.visible = false;
    const t = now / 1000;
    ctx.animated().forEach(s => { const k = ((t * 0.25 + s.userData.phase) % 1); s.position.y = s.userData.base + k * 0.5; s.material.opacity = 0.22 * (1 - k); });
  }

  // ---------------------------------------------------------------- session lifecycle
  const prevShadowType = renderer.shadowMap.type;
  renderer.xr.addEventListener('sessionstart', () => {
    const session = renderer.xr.getSession();
    ctx.enterWalk();
    dolly.add(persp); persp.position.set(0, 0, 0); persp.rotation.set(0, 0, 0);
    dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0);
    fader.v = 1; fader.target = 0; fader.then = null; pad.frames = 0; pad.prev = {};
    renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
    const info = bake(); console.info('[vr] batched', info);
    quality.tier = 0; applyLights(); setMaterialsDirty();
    if (session.frameRate) quality.frameMs = 1000 / session.frameRate;
    if (session.updateTargetFrameRate && session.supportedFrameRates?.includes(72)) session.updateTargetFrameRate(72).then(() => { quality.frameMs = 1000 / 72; }).catch(() => {});
    if (renderer.xr.setFoveation) renderer.xr.setFoveation(0.3);
    renderer.compile(scene, persp);                       // compile shaders now, behind the black fade, not mid-walk
    renderer.shadowMap.needsUpdate = true;
    quality.settleUntil = performance.now() + 4000; quality.samples = [];
    document.body.dataset.xr = 'on';
  });
  renderer.xr.addEventListener('sessionend', () => {
    dolly.remove(persp); persp.remove(fade); persp.add(fade);
    unbake(); restoreLights();
    renderer.shadowMap.type = prevShadowType; renderer.shadowMap.autoUpdate = true; setMaterialsDirty();
    caption.visible = menu.visible = ring.visible = arc.visible = false; fade.visible = false;
    document.body.dataset.xr = ''; ctx.exitVR();
  });

  async function start() {
    renderer.xr.setFramebufferScaleFactor(1.0);           // headset-native resolution; supersampling was what dropped frames
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    const floor = !session.enabledFeatures || session.enabledFeatures.includes('local-floor');
    renderer.xr.setReferenceSpaceType(floor ? 'local-floor' : 'local'); eyeLift = floor ? 0 : 1.6;
    await renderer.xr.setSession(session);
  }

  return { step, start, bake, unbake, test: { dolly, headPlan, xrPlace, quality, menu, buttons: () => buttons, pressMenu, toggleMenu, hands, updateAim, setTier } };
}
