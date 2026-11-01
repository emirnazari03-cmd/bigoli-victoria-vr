// Continuous walkthrough ("film") along one fixed camera path through the model.
// The same path drives the in-browser "Play walkthrough" and the rendered MP4, so
// the film can never show a different layout from the model.
//
// A path is a list of control points { p:[x,z], look:[x,y,z], hold?, cap?, sub?, speed? }
// in plan coordinates (X east, Z north from the glazing). Consecutive points with the
// same p are a pan in place (duration = hold; optional dwell = still moment before it). A point with hold > 0 is a stop: the
// camera eases in, holds, and eases out. Between stops the eye follows a centripetal
// Catmull-Rom spline through the points at walking speed.

const EYE = 1.6;
const floorAt = (z) => (z < -0.15 ? -0.15 : 0);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function angles(p, look) {
  const dx = look[0] - p[0], dz = look[2] - p[1], dy = look[1] - (floorAt(p[1]) + EYE);
  return { yaw: Math.atan2(-dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
function cr(p0, p1, p2, p3, t) {            // centripetal Catmull-Rom (Barry-Goldman), 2D
  const d = (a, b) => Math.max(1e-4, Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5));
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const L = (a, b, ta, tb) => [0, 1].map(k => ((tb - u) * a[k] + (u - ta) * b[k]) / (tb - ta));
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
const lerp = (a, b, t) => a + (b - a) * t;

export function buildFilm(points, { speed = 0.85 } = {}) {
  // unwrap yaw along the whole path so turns always take the short way
  const ang = points.map(q => angles(q.p, q.look));
  for (let i = 1; i < ang.length; i++) {
    let d = ang[i].yaw - ang[i - 1].yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    ang[i].yaw = ang[i - 1].yaw + d;
  }
  // split into segments: 'pan' (same eye) or 'run' (maximal chain of moves between stops)
  const segs = [];
  const same = (a, b) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]) < 1e-3;
  let i = 0, t = 0;
  const pushHold = (k) => {
    const panNext = k + 1 < points.length && same(points[k], points[k + 1]);
    const h = panNext ? (points[k].dwell || 0) : (points[k].hold || 0);   // dwell = still moment before a pan
    if (h > 0) { segs.push({ kind: 'hold', k, t0: t, t1: t + h }); t += h; }
  };
  pushHold(0);
  while (i < points.length - 1) {
    if (same(points[i], points[i + 1])) {
      const dur = points[i].hold || 2;
      segs.push({ kind: 'pan', a: i, b: i + 1, t0: t, t1: t + dur }); t += dur; i++;
      pushHold(i);
      continue;
    }
    let j = i + 1;                          // run continues through pass-through points
    while (j < points.length - 1 && !(points[j].hold > 0) && !same(points[j], points[j + 1])) j++;
    const idx = []; for (let k = i; k <= j; k++) idx.push(k);
    // dense samples for arc length
    const P = (k) => points[Math.max(i, Math.min(j, k))].p;
    const samples = [];
    for (let k = i; k < j; k++) {
      for (let s = 0; s < 40; s++) {
        const u = s / 40, q = cr(P(k - 1), P(k), P(k + 1), P(k + 2), u);
        samples.push({ k, u, x: q[0], z: q[1] });
      }
    }
    samples.push({ k: j - 1, u: 1, x: P(j)[0], z: P(j)[1] });
    let len = 0; samples[0].s = 0;
    for (let n = 1; n < samples.length; n++) { len += Math.hypot(samples[n].x - samples[n - 1].x, samples[n].z - samples[n - 1].z); samples[n].s = len; }
    const v = points[i].speed || speed;
    const dur = len / v * 1.35 + 0.4;       // smootherstep peak speed ≈ 1.9× mean; 1.35 keeps the peak near walking pace
    segs.push({ kind: 'run', a: i, b: j, samples, len, t0: t, t1: t + dur }); t += dur;
    i = j; pushHold(i);
  }
  const duration = t;

  function capAt(k) { for (let n = k; n >= 0; n--) if (points[n].cap !== undefined) return { cap: points[n].cap, sub: points[n].sub || '' }; return { cap: '', sub: '' }; }

  function pose(time) {
    time = Math.max(0, Math.min(duration - 1e-6, time));
    const sg = segs.find(s => time >= s.t0 && time < s.t1) || segs[segs.length - 1];
    const f = (time - sg.t0) / (sg.t1 - sg.t0);
    if (sg.kind === 'hold') {
      const q = points[sg.k], a = ang[sg.k];
      return { x: q.p[0], z: q.p[1], yaw: a.yaw, pitch: a.pitch, ...capAt(sg.k), k: sg.k };
    }
    if (sg.kind === 'pan') {
      const q = points[sg.a], e = smoother(f), A = ang[sg.a], B = ang[sg.b];
      return { x: q.p[0], z: q.p[1], yaw: lerp(A.yaw, B.yaw, e), pitch: lerp(A.pitch, B.pitch, e), ...capAt(f < 0.5 ? sg.a : sg.b), k: f < 0.5 ? sg.a : sg.b };
    }
    // run: eased arc-length position, angles interpolated by control index
    const target = smoother(f) * sg.len, S = sg.samples;
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= target) lo = m; else hi = m; }
    const A = S[lo], B = S[hi], w = B.s > A.s ? (target - A.s) / (B.s - A.s) : 0;
    const x = lerp(A.x, B.x, w), z = lerp(A.z, B.z, w);
    const kf = lerp(A.k + A.u, B.k + B.u, w);            // fractional control index
    const k0 = Math.min(sg.b - 1, Math.floor(kf)), u = Math.min(1, kf - k0);
    const Y = (k) => ang[Math.max(sg.a, Math.min(sg.b, k))];
    const cubic = (key) => {                              // Catmull-Rom (uniform) on angles: smooth turns
      const p0 = Y(k0 - 1)[key], p1 = Y(k0)[key], p2 = Y(k0 + 1)[key], p3 = Y(k0 + 2)[key];
      const u2 = u * u, u3 = u2 * u;
      return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
    };
    return { x, z, yaw: cubic('yaw'), pitch: cubic('pitch'), ...capAt(Math.round(kf)), k: Math.round(kf) };
  }
  return { duration, pose, segs, points };
}
