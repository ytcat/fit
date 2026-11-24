// Walk-gait QA (agent/walk-gait): per-frame raw samples of one rig -> gait metrics. Shared by gait-sim.cjs (node) and
// free-walk.cjs (browser, the real free walk with the touch stick).
//   grab(c, THREE) -> one row (world metres): root x/z/yaw, hips, thighs, shoulders (arm joints), elbows, hands, neck, head,
//                     both soles (heel and ball), tail tip
//   gait(rows, { from, to }) -> metrics over rows with from <= t <= to
// Definitions:
//   strideM        horizontal distance between two touchdowns of the same foot (mean); stepsPerMin from touchdowns of both feet
//   speed          mean ground speed of the root ; strideRel stride / leg length (0.97 m)
//   slideMaxCm     largest per-frame horizontal move of a foot's lowest contact point while it stays within 1.5 cm of the ground
//                  in both frames (the ch1-motion definition) ; slideMeanMm mean of those per-frame moves
//   airFrames      frames with both feet more than 3 cm above the ground (ch1-motion) ; flightFrames: more than 1.2 cm
//   pelvisDeg      +- half range of the hip axis (thigh to thigh) turn about the vertical, against the walking direction
//   shoulderDeg    the same for the shoulder line (arm joint to arm joint) ; xDeg the shoulder line against the hip line
//   shoulderRollCm +- half range of the height difference of the two shoulders ; obliquityDeg the hip axis tilt
//   armFlexDeg     per arm: forward / back angle of the upper arm (shoulder -> elbow) from the vertical in the walking plane
//   elbowDeg       elbow flexion min / max ; handSwingM hand fore-aft range against the pelvis
//   bobCm          pelvis height range ; dropCmMax largest per-frame fall of the pelvis ; swayCm pelvis side to side range
//   leanDeg        mean forward lean of hips -> neck ; headYawDeg / headPitchDeg +- half range of the head (stabilised)
const V = (T, x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
function grab(c, T, t) {
  const R = c.root; R.updateMatrixWorld(true); const j = c.joints, w = o => o.getWorldPosition(V(T)).toArray();
  const yaw = o => { const a = o.localToWorld(V(T)), f = o.localToWorld(V(T, 0, 0, 1)); return Math.atan2(f.x - a.x, f.z - a.z); };
  const feet = ['L', 'R'].map(s => { const f = j['foot' + s]; return { heel: f.localToWorld(V(T, 0, -.12, -.065)).toArray(), ball: f.localToWorld(V(T, 0, -.12, .13)).toArray() }; });
  let tail = null; if (c.tail && c.tail.children.length) { const b = new T.Box3().setFromObject(c.tail); tail = b.getCenter(V(T)).toArray(); }
  const head = j.head, hf = head.localToWorld(V(T, 0, 0, 1)), h0 = head.getWorldPosition(V(T));
  return { t, x: R.position.x, z: R.position.z, ry: R.rotation.y, fwd: (() => { const a = R.localToWorld(V(T)), f = R.localToWorld(V(T, 0, 0, 1)); return Math.atan2(f.x - a.x, f.z - a.z); })(),
    hips: w(j.hips), thL: w(j.thighL), thR: w(j.thighR), shL: w(j.armL), shR: w(j.armR), elL: w(j.elbowL), elR: w(j.elbowR), haL: w(j.handL), haR: w(j.handR),
    neck: w(j.neck), head: h0.toArray(), headF: [hf.x - h0.x, hf.y - h0.y, hf.z - h0.z], feet, tail, yChest: yaw(j.chest) };
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), deg = r => r * 180 / Math.PI, mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const half = a => a.length ? (Math.max(...a) - Math.min(...a)) / 2 : NaN, r1 = v => Number.isFinite(v) ? +v.toFixed(1) : v, r2 = v => Number.isFinite(v) ? +v.toFixed(2) : v;
function gait(all, { from = -Infinity, to = Infinity, ground = () => 0 } = {}) {
  const rows = all.filter(r => r.t >= from - 1e-9 && r.t <= to + 1e-9); if (rows.length < 3) return null;
  const low = f => { const h = f.heel[1] - ground(f.heel[0], f.heel[2]), b = f.ball[1] - ground(f.ball[0], f.ball[2]); return h < b ? { y: h, p: f.heel } : { y: b, p: f.ball }; };
  const td = [[], []], slides = []; let slideMax = 0, slideAt = null, air = 0, flight = 0, dropMax = 0; const up = [false, false];
  const travelAt = (i) => { const a = rows[Math.max(0, i - 2)], b = rows[Math.min(rows.length - 1, i + 2)]; const d = Math.hypot(b.x - a.x, b.z - a.z); return d > 1e-3 ? Math.atan2(b.x - a.x, b.z - a.z) : rows[i].fwd; };
  const P = { pelvis: [], shoulder: [], x: [], roll: [], obl: [], flexL: [], flexR: [], elL: [], elR: [], handL: [], handR: [], bob: [], sway: [], lean: [], hy: [], hp: [], tailY: [] };
  let dist = 0, time = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], q = rows[i - 1];
    const lows = r.feet.map(low); if (Math.min(lows[0].y, lows[1].y) > .03) air++; if (Math.min(lows[0].y, lows[1].y) > .012) flight++;
    for (let k = 0; k < 2; k++) { if (lows[k].y > .03) up[k] = true; else if (up[k] && lows[k].y < .012) { up[k] = false; td[k].push({ t: r.t, p: lows[k].p }); } }
    if (q) {
      dist += Math.hypot(r.x - q.x, r.z - q.z); time += r.t - q.t;
      const ql = q.feet.map(low);
      for (let k = 0; k < 2; k++) if (ql[k].y < .015 && lows[k].y < .015) { const sameBall = (ql[k].p === q.feet[k].ball) === (lows[k].p === r.feet[k].ball), a = sameBall ? ql[k].p : q.feet[k].ball, b = sameBall ? lows[k].p : r.feet[k].ball, d = Math.hypot(b[0] - a[0], b[2] - a[2]); slides.push(d); if (d > slideMax) { slideMax = d; slideAt = r.t; } }
      dropMax = Math.max(dropMax, q.hips[1] - r.hips[1]);
    }
    const tr = travelAt(i), fx = Math.sin(tr), fz = Math.cos(tr), lx = fz, lz = -fx; // forward and lateral (to the walker's left/right) axes
    const ang = (a, b) => wrap(Math.atan2(b[0] - a[0], b[2] - a[2]) - tr - Math.PI / 2); // a line from a to b against the perpendicular of travel
    const lineYaw = (a, b) => { let v = ang(a, b); if (Math.abs(v) > Math.PI / 2) v = wrap(v + Math.PI); return v; };
    const pel = lineYaw(r.thL, r.thR), sh = lineYaw(r.shL, r.shR); P.pelvis.push(pel); P.shoulder.push(sh); P.x.push(wrap(sh - pel));
    P.roll.push(r.shL[1] - r.shR[1]); P.obl.push(Math.atan2(r.thL[1] - r.thR[1], Math.hypot(r.thL[0] - r.thR[0], r.thL[2] - r.thR[2])));
    for (const s of ['L', 'R']) {
      const S = r['sh' + s], E = r['el' + s], H = r['ha' + s], u = [E[0] - S[0], E[1] - S[1], E[2] - S[2]], fwd = u[0] * fx + u[2] * fz;
      P['flex' + s].push(Math.atan2(fwd, -u[1])); const a = [S[0] - E[0], S[1] - E[1], S[2] - E[2]], b = [H[0] - E[0], H[1] - E[1], H[2] - E[2]], cosv = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.hypot(...a) / Math.hypot(...b);
      P['el' + s].push(180 - deg(Math.acos(Math.max(-1, Math.min(1, cosv))))); P['hand' + s].push((H[0] - r.hips[0]) * fx + (H[2] - r.hips[2]) * fz);
    }
    P.bob.push(r.hips[1]); P.sway.push((r.hips[0] - r.x) * lx + (r.hips[2] - r.z) * lz);
    const n = [r.neck[0] - r.hips[0], r.neck[1] - r.hips[1], r.neck[2] - r.hips[2]]; P.lean.push(Math.atan2(n[0] * fx + n[2] * fz, n[1]));
    P.hy.push(wrap(Math.atan2(r.headF[0], r.headF[2]) - tr)); P.hp.push(Math.atan2(r.headF[1], Math.hypot(r.headF[0], r.headF[2])));
    if (r.tail) P.tailY.push((r.tail[0] - r.hips[0]) * lx + (r.tail[2] - r.hips[2]) * lz);
  }
  const strides = td.flatMap(list => list.slice(1).map((e, i) => Math.hypot(e.p[0] - list[i].p[0], e.p[2] - list[i].p[2])));
  const all2 = td.flat().map(e => e.t).sort((a, b) => a - b), steps = all2.length > 1 ? (all2.length - 1) / (all2[all2.length - 1] - all2[0]) * 60 : NaN;
  return {
    frames: rows.length, speed: r2(dist / Math.max(1e-6, time)), strideM: r2(mean(strides)), strideRel: r2(mean(strides) / .97), stepsPerMin: r1(steps), touchdowns: td[0].length + td[1].length,
    slideMaxCm: r2(slideMax * 100), slideAt, slideMeanMm: r2(mean(slides) * 1000), airFrames: air, flightFrames: flight,
    pelvisDeg: r1(deg(half(P.pelvis))), shoulderDeg: r1(deg(half(P.shoulder))), xDeg: r1(deg(half(P.x))), shoulderRollCm: r1(half(P.roll) * 100), obliquityDeg: r1(deg(half(P.obl))),
    armFlexDeg: { L: [r1(deg(Math.min(...P.flexL))), r1(deg(Math.max(...P.flexL)))], R: [r1(deg(Math.min(...P.flexR))), r1(deg(Math.max(...P.flexR)))] },
    elbowDeg: { L: [r1(Math.min(...P.elL)), r1(Math.max(...P.elL))], R: [r1(Math.min(...P.elR)), r1(Math.max(...P.elR))] },
    handSwingM: { L: r2(2 * half(P.handL)), R: r2(2 * half(P.handR)) }, bobCm: r1(2 * half(P.bob) * 100), dropCmMax: r2(dropMax * 100), swayCm: r1(2 * half(P.sway) * 100),
    leanDeg: r1(deg(mean(P.lean))), headYawDeg: r1(deg(half(P.hy))), headPitchDeg: r1(deg(half(P.hp))), tailSwingCm: P.tailY.length ? r1(2 * half(P.tailY) * 100) : null
  };
}
module.exports = { grab, gait };
