// The referee raises the winner's arm (ring result ceremony, fight-arena.js + fight-referee.js), measured frame by frame in
// node at 60 fps from the end of the bout through pickup, lift, hold and (when there is one) the release.
// usage: node qa/arm-fixes/raise-probe.cjs [out.json]   prints a summary per winner.
// Per frame: referee grip (his wrist point) vs the fighter's wrist joint; per-frame steps of both (cm); the fighter's wrist
// and upper-arm rotation jumps (deg) and upper-arm twist; elbow bend (deg) and where the elbow points (fighter rig space:
// out = away from the body side, back = behind, fwd); the bend-plane normal flip between frames; skin pinch at the
// shoulder/upper arm (CPU skinning: triangles whose area falls under 35 % of rest, or whose normal turns > 120 deg against
// the dominant bone's rigid turn).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..'); process.chdir(root);
global.THREE = require(path.join(root, 'assets/vendor/three.min.js')); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => { } }) }) };
for (const f of ['boxing-routines.js', 'boxing-coach-v2.js', 'contact-response.js', 'training-arena.js', 'boxing-fight.js', 'fight-referee.js', 'fight-arena.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), deg = r => r * 180 / Math.PI;
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), coach = new LionCoach(data), e = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(38, .6, .1, 100), coach, animTime: 0, technique: 'guard', currentAnim: 'one_two', fitCameraToModel() { } };
e.demoModel = coach.root; e.scene.add(coach.root); const arena = e.arena = new TrainingArena(e, data);
const HOLD = +(process.env.HOLD || 9);
// skin pinch: CPU skinned triangles of the arm/shoulder region of one side, against the same triangles in a reference
// frame (the guard before the result): area under 35 % of the reference, or the normal turned > 90 deg away from where the
// triangle's dominant bone carried it
function skinned(c, side) {
  const mesh = c.skin, g = mesh.geometry, P = g.attributes.position, I = g.attributes.skinIndex.array, W = g.attributes.skinWeight.array, idx = g.index.array, bones = mesh.skeleton.bones;
  const names = new Set(['arm' + side, 'elbow' + side, 'scapula' + side]);
  if (!c.__tri) c.__tri = {};
  let tri = c.__tri[side];
  if (!tri) { tri = []; const dom = i => { let d = 0; for (let k = 1; k < 4; k++) if (W[i * 4 + k] > W[i * 4 + d]) d = k; return I[i * 4 + d]; };
    for (let f = 0; f < idx.length; f += 3) { const a = idx[f], b = idx[f + 1], cc = idx[f + 2]; if ([a, b, cc].some(v => names.has(bones[dom(v)]?.name))) tri.push(a, b, cc, dom(a)); } c.__tri[side] = tri; }
  mesh.updateMatrixWorld(true); mesh.skeleton.update();
  const pos = new Map(), get = i => { let v = pos.get(i); if (!v) { v = V().fromBufferAttribute(P, i); mesh.boneTransform(i, v); pos.set(i, v); } return v; };
  const out = [];
  for (let k = 0; k < tri.length; k += 4) { const a = get(tri[k]), b = get(tri[k + 1]), cc = get(tri[k + 2]), n = b.clone().sub(a).cross(cc.clone().sub(a)); out.push(n.length(), n.normalize(), bones[tri[k + 3]].getWorldQuaternion(new THREE.Quaternion())); }
  return out;
}
function pinch(c, side, ref) {
  const now = skinned(c, side); let small = 0, flip = 0, worstArea = 9;
  for (let k = 0; k < now.length; k += 3) { if (ref[k] < 1e-9) continue; const area = now[k] / ref[k]; if (area < worstArea) worstArea = area; if (area < .35) small++;
    const expect = ref[k + 1].clone().applyQuaternion(now[k + 2].clone().multiply(ref[k + 2].clone().invert())); if (expect.angleTo(now[k + 1]) > Math.PI / 2) flip++; }
  return { small, flip, worstArea: +worstArea.toFixed(2), tris: now.length / 3 };
}
const all = {};
for (const winner of (process.env.WINNERS || 'lion,rabbit').split(',')) {
  e.fightOptions = { seed: 3, rounds: 1, roundSeconds: 2, restSeconds: 0 }; arena.setTarget('fight'); const view = arena.fightView, m = view.match; for (const f of Object.values(m.fighters)) f.next = Infinity; m.decide = () => { };
  let t = 0; while (m.phase === 'intro' || m.phase === 'round' && m.roundTime < 1) arena.update(t += 1 / 30, 'fight', 'one_two');
  m.finish(winner, 'TKO', true);
  const rows = [], prev = {}, side = winner === 'lion' ? 'R' : 'L', s = side === 'R' ? 1 : -1, rs = winner === 'lion' ? -1 : 1;
  const w = o => view.cast.worldToLocal(o.getWorldPosition(V()));
  while (t < 200 && !(m.phase === 'ceremony' && m.phaseTime > HOLD)) {
    arena.update(t += 1 / 60, 'fight', 'one_two'); if (m.phase !== 'ceremony' && !(m.phase === 'scoring' && m.phaseTime > 9.5)) continue;
    const c = view.coaches[winner], j = c.joints, ref = view.referee, rl = p => view.cast.worldToLocal(ref.root.localToWorld(p.clone()));
    const sh = w(j['arm' + side]), el = w(j['elbow' + side]), ha = w(j['hand' + side]), grip = rl(ref.arms[rs].points.wrist), rel = rl(ref.arms[rs].points.elbow);
    const rig = p => c.root.worldToLocal(view.cast.localToWorld(p.clone()));
    const shL = rig(sh), elL = rig(el), haL = rig(ha), u = haL.clone().sub(shL).normalize(), off = elL.clone().sub(shL); off.sub(u.clone().multiplyScalar(off.dot(u))); const on = off.length() > 1e-4 ? off.clone().normalize() : V();
    const plane = elL.clone().sub(shL).cross(haL.clone().sub(elL)).normalize();
    const hq = j['hand' + side].getWorldQuaternion(new THREE.Quaternion()), aq = j['arm' + side].getWorldQuaternion(new THREE.Quaternion());
    const ang = (a, b) => a ? deg(2 * Math.acos(Math.min(1, Math.abs(a.dot(b))))) : 0;
    const tw = (() => { if (!prev.aq) return 0; const d = aq.clone().multiply(prev.aq.clone().invert()), ax = elL.clone().sub(shL).normalize(); const axW = j['elbow' + side].getWorldPosition(V()).sub(j['arm' + side].getWorldPosition(V())).normalize(); const r = V(d.x, d.y, d.z), p = axW.multiplyScalar(r.dot(axW)); const tq = new THREE.Quaternion(p.x, p.y, p.z, d.w).normalize(); return deg(2 * Math.acos(Math.min(1, Math.abs(tq.w)))); })();
    const row = {
      phase: m.phase, pt: +m.phaseTime.toFixed(3), gripGap: +(grip.distanceTo(ha) * 100).toFixed(1),
      gripStep: prev.grip ? +(grip.distanceTo(prev.grip) * 100).toFixed(2) : 0, refElbowStep: prev.rel ? +(rel.distanceTo(prev.rel) * 100).toFixed(2) : 0, wristStep: prev.ha ? +(ha.distanceTo(prev.ha) * 100).toFixed(2) : 0,
      wristJump: +ang(prev.hq, hq).toFixed(2), armJump: +ang(prev.aq, aq).toFixed(2), twist: +tw.toFixed(2),
      bend: +deg(el.clone().sub(sh).angleTo(ha.clone().sub(el))).toFixed(1), elbow: { out: +(on.x * s).toFixed(2), back: +(-on.z).toFixed(2), down: +(-on.y).toFixed(2) },
      planeFlip: prev.plane && plane.lengthSq() > .5 ? +deg(prev.plane.angleTo(plane)).toFixed(1) : 0, handUp: +(haL.y - shL.y).toFixed(3), handOut: +((haL.x - shL.x) * s).toFixed(3)
    };
    if (!prev.skin) prev.skin = skinned(c, side); if (rows.length % 6 === 0) row.pinch = pinch(c, side, prev.skin);
    Object.assign(prev, { grip, rel, ha, hq, aq, plane: plane.lengthSq() > .5 ? plane : prev.plane });
    rows.push(row);
  }
  const cer = rows.filter(r => r.phase === 'ceremony'), mx = (a, f) => a.reduce((q, r) => Math.max(q, f(r)), -1e9), mn = (a, f) => a.reduce((q, r) => Math.min(q, f(r)), 1e9);
  const held = cer.filter(r => r.pt > .5 && r.pt < 5.4);
  const sum = {
    winner, frames: rows.length,
    gripGapMax: mx(held, r => r.gripGap), gripStepMax: mx(rows.slice(1), r => r.gripStep), gripStepAt: rows.slice(1).reduce((a, r) => r.gripStep > a.gripStep ? r : a, { gripStep: -1 }).pt,
    wristStepMax: mx(rows.slice(1), r => r.wristStep), wristJumpMax: mx(rows.slice(1), r => r.wristJump), armJumpMax: mx(rows.slice(1), r => r.armJump), twistMax: mx(rows.slice(1), r => r.twist),
    planeFlipMax: mx(rows.slice(1), r => r.planeFlip), bendRange: [mn(cer, r => r.bend), mx(cer, r => r.bend)],
    elbowAtTop: cer.length ? cer[cer.length - 1].elbow : null, elbowBackMax: mx(cer, r => r.elbow.back),
    pinch: { small: mx(rows.filter(r => r.pinch), r => r.pinch.small), flip: mx(rows.filter(r => r.pinch), r => r.pinch.flip), worstArea: mn(rows.filter(r => r.pinch), r => r.pinch.worstArea) },
    final: cer[cer.length - 1]
  };
  console.log(JSON.stringify(sum));
  all[winner] = { sum, rows };
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(all));
