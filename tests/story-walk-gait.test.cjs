// node tests/story-walk-gait.test.cjs — GOTR-0097: the everyday walk follows human gait (owner: "he walks very strangely,
// jumping while walking"). Lion and rabbit, kit and street clothes, the body carried along at the film's walking speed:
//   never airborne (a sole on the ground in every frame); pelvis bob 2-4 cm, lowest in double support, highest in mid-stance;
//   no foot sliding while it carries weight (heel/sole/ball contact fixed); knee almost straight at heel strike, ~10-22 deg at
//   loading, 50-65 deg in the swing; ankle dorsiflexed at heel strike; arms swing against the legs; pelvis turns 4-6 deg and
//   tilts 3-5 deg; cadence 1.8-2.0 steps/s at the opening film's walking speeds. And the step-off the bus: each foot stands
//   on its step (floor, tread, pavement), nothing goes through a step, never airborne.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const Core = require('../adventure/story/dream-core.js');
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const P = DreamPose, S = P.STRIDE, D = P.DUTY, deg = r => r * 180 / Math.PI;
const SOLE = { heel: V(0, -.12, -.065), ball: V(0, -.12, .13) };
const sole = (c, s, k) => c.joints['foot' + s].localToWorld(SOLE[k].clone());
const knee = (c, s) => { const j = c.joints, a = c.point(j['thigh' + s]), b = c.point(j['knee' + s]), f = c.point(j['foot' + s]); return 180 - deg(a.sub(b).angleTo(f.sub(b))); };

// cadence of the opening film's walks
{
  const sc = Core.withCity(Core.scenes.dream_opening), speeds = [];
  for (let t = 7.8; t < 29.4; t += .05) { const a = Core.sample(sc, t).actors.fighter; if (a.walking) speeds.push(a.speed); }
  const lo = Math.min(...speeds), hi = Math.max(...speeds); console.log('film walking speeds', lo.toFixed(2), '-', hi.toFixed(2), 'm/s -> steps/s', (2 * lo / S).toFixed(2), '-', (2 * hi / S).toFixed(2));
  for (const v of speeds) { const cad = 2 * v / S; assert.ok(cad > 1.7 && cad < 2.2, 'cadence ' + cad.toFixed(2) + ' steps/s at ' + v.toFixed(2) + ' m/s'); }
  const main = speeds.filter(v => v > 1.2 && v < 1.32); assert.ok(main.length > 100 && main.every(v => 2 * v / S >= 1.8 && 2 * v / S <= 2.0), 'the long walks (1.25 m/s): 1.8-2 steps/s');
}

const N = 60, speed = 1.25, rows = [];
for (const species of ['lion', 'rabbit']) for (const wear of ['street', 'kit']) {
  const c = new LionCoach(data, { species }); StoryCast.outfit(c, wear); if (wear === 'street') StoryCast.bag(c, 'shoulder');
  const fr = [];
  P.reset(c);
  for (let i = 0; i <= 2 * N; i++) {
    const d = i * S / N; c.root.position.set(0, 0, d); c.root.updateMatrixWorld(true);
    P.civil(c, { t: d / speed, dist: d, walk: 1, arms: wear === 'street' ? { R: 'strap' } : {}, dt: i ? S / N / speed : 0 });
    if (i < N) continue; c.root.updateMatrixWorld(true); const j = c.joints;
    const f = { p: (d / S) % 1, pelvis: j.hips.getWorldPosition(V()).y, yaw: j.hips.rotation.y, roll: j.hips.rotation.z, kneeL: knee(c, 'L'), kneeR: knee(c, 'R'), handL: j.handL.getWorldPosition(V()).z - d, footL: j.footL.getWorldPosition(V()).z - d, pitchL: new THREE.Euler().setFromQuaternion(j.footL.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').x };
    for (const s of ['L', 'R']) for (const k of ['heel', 'ball']) f[s + k] = sole(c, s, k);
    f.lowest = Math.min(...['L', 'R'].map(s => Math.min(f[s + 'heel'].y, f[s + 'ball'].y))); fr.push(f);
  }
  // airborne
  const air = Math.max(...fr.map(f => f.lowest)); assert.ok(air < .012, species + ' ' + wear + ': a sole on the ground in every frame (highest lowest sole ' + air.toFixed(4) + ' m)');
  // pelvis bob
  const ys = fr.map(f => f.pelvis), bob = Math.max(...ys) - Math.min(...ys), lowAt = fr[ys.indexOf(Math.min(...ys))].p % .5, highAt = fr[ys.indexOf(Math.max(...ys))].p % .5;
  assert.ok(bob >= .02 && bob <= .04, species + ' ' + wear + ': pelvis bob 2-4 cm (' + (bob * 100).toFixed(1) + ' cm)');
  assert.ok(lowAt <= .13 || lowAt >= .48, 'pelvis lowest in double support (phase ' + lowAt.toFixed(2) + ')'); assert.ok(highAt >= .17 && highAt <= .4, 'pelvis highest in mid-stance (phase ' + highAt.toFixed(2) + ')');
  // sliding of the weight-bearing contacts (left foot: phase 0 = heel strike)
  let slide = 0; const hold = {};
  for (const f of fr) {
    const p = f.p, contacts = p >= .1 && p < .34 ? ['heel', 'ball'] : p >= .34 && p < D - .02 ? ['ball'] : p < .1 ? ['heel'] : [];
    for (const k of ['heel', 'ball']) { if (!contacts.includes(k)) { hold[k] = null; continue; } const q = f['L' + k]; if (hold[k]) slide = Math.max(slide, Math.hypot(q.x - hold[k].x, q.z - hold[k].z)); else hold[k] = q.clone(); }
  }
  assert.ok(slide < .006, species + ' ' + wear + ': no foot sliding in stance (' + (slide * 1000).toFixed(1) + ' mm)');
  // knees and ankle
  const at = p => fr.reduce((a, f) => Math.abs(f.p - p) < Math.abs(a.p - p) ? f : a);
  const hs = at(0).kneeL, load = Math.max(...fr.filter(f => f.p > .05 && f.p < .2).map(f => f.kneeL)), swing = Math.max(...fr.filter(f => f.p > D).map(f => f.kneeL)), mid = at(.28).kneeL;
  assert.ok(hs <= 8, 'knee almost straight at heel strike: ' + hs.toFixed(1)); assert.ok(load >= 10 && load <= 22, 'knee bends at loading: ' + load.toFixed(1)); assert.ok(mid <= 10, 'knee extends in mid-stance: ' + mid.toFixed(1)); assert.ok(swing >= 50 && swing <= 66, 'knee folds ~60 deg in the swing: ' + swing.toFixed(1));
  assert.ok(at(0).pitchL < -.2, 'ankle dorsiflexed (toes up) at heel strike: ' + at(0).pitchL.toFixed(2));
  // pelvis rotation and tilt
  const yawA = deg(Math.max(...fr.map(f => Math.abs(f.yaw)))), rollA = deg(Math.max(...fr.map(f => Math.abs(f.roll))));
  assert.ok(yawA >= 4 && yawA <= 6, 'pelvis turns +-4-6 deg: ' + yawA.toFixed(1)); assert.ok(rollA >= 3 && rollA <= 5, 'pelvis tilts +-3-5 deg: ' + rollA.toFixed(1));
  // arm swing against the legs (the free left arm against the left foot)
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, hz = fr.map(f => f.handL), fz = fr.map(f => f.footL), mh = mean(hz), mf = mean(fz);
  const corr = mean(hz.map((h, i) => (h - mh) * (fz[i] - mf))) / Math.sqrt(mean(hz.map(h => (h - mh) ** 2)) * mean(fz.map(v => (v - mf) ** 2)));
  const swingM = Math.max(...hz) - Math.min(...hz); assert.ok(corr < -.7, 'the left arm swings against the left leg (correlation ' + corr.toFixed(2) + ')'); assert.ok(swingM > .2 && swingM < .5, 'arm swing ' + swingM.toFixed(2) + ' m at the hand');
  rows.push({ species, wear, air: +air.toFixed(4), bob: +(bob * 100).toFixed(1), slideMM: +(slide * 1000).toFixed(1), knee: { hs: +hs.toFixed(1), load: +load.toFixed(1), mid: +mid.toFixed(1), swing: +swing.toFixed(1) }, pelvisDeg: { yaw: +yawA.toFixed(1), tilt: +rollA.toFixed(1) }, armCorr: +corr.toFixed(2) });
  console.log(JSON.stringify(rows[rows.length - 1]));

  // ---- the step-off the bus in the film (Codex's bus): the feet find the floor, the tread, the pavement
  if (wear !== 'street') continue;
  const sc = Core.withCity(Core.scenes.dream_opening), ground = (x, z, t) => Core.groundAt(sc, x, z, t);
  P.reset(c); c.root.scale.set(-1, 1, 1); let worstIn = 0, worstAir = 0; const onTread = new Set();
  for (let t = 7.3; t <= 9.9; t += 1 / 30) {
    const a = Core.sample(sc, t).actors.fighter; c.root.position.set(a.x, a.y, a.z); c.root.rotation.set(0, a.walking ? a.dir : 0, 0); c.root.updateMatrixWorld(true);
    P.civil(c, { t, dt: t > 7.3 ? 1 / 30 : 0, dist: a.dist, walk: a.walking ? 1 : 0, arms: a.arms || {}, ground: (x, z) => ground(x, z, t) });
    c.root.updateMatrixWorld(true); let low = 9;
    for (const s of ['L', 'R']) for (const k of ['heel', 'ball']) { const q = sole(c, s, k), g = ground(q.x, q.z, t); worstIn = Math.max(worstIn, g - q.y); low = Math.min(low, q.y - g); if (Math.abs(g - .26) < 1e-6 && q.y - g < .01) onTread.add(s); }
    worstAir = Math.max(worstAir, low);
  }
  c.root.scale.set(1, 1, 1);
  console.log(species, 'step-off: deepest sole under its step', (worstIn * 100).toFixed(1), 'cm, highest lowest sole', (worstAir * 100).toFixed(1), 'cm, on the tread:', [...onTread].join(''));
  assert.ok(worstIn < .03, species + ': no foot through a step (' + worstIn.toFixed(3) + ')'); assert.ok(worstAir < .03, species + ': never airborne stepping down (' + worstAir.toFixed(3) + ')'); assert.ok(onTread.size >= 1, species + ': a foot stands on the entry tread');
}
console.log('walk gait ok');
