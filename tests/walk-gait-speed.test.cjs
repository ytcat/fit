// node tests/walk-gait-speed.test.cjs — walk-gait (owner 2026-11-25: "his upper body is not moving and legs are walking with
// slow steps ... move his shoulders, his hands have to move properly ... as much as possible the style of GTA 5"). The free
// walk's own pose call (planted feet, DreamPose.pace) on the Fighter rig, carried along courses at 30 fps (qa/walk-gait/gait-sim.cjs):
//   stride and cadence follow the speed (film walk 1.30 m / ~115 steps a minute, brisk walk at the free walk's 2.22 m/s,
//   heavy jog at its 3.44 m/s brisk pace); no airborne frames walking, a short flight only jogging; feet do not slide;
//   no hip drops; pelvis and shoulders turn against each other and grow with the pace; the arms swing forward and back of the
//   vertical with the elbows bending more forward and when jogging; lean grows with speed; the head stays steady.
//   Plus: an unknown speed is exactly the GOTR-0097 walk; a stride that changes with the speed does not slide a foot even
//   without the plant layer; DreamPose.pace accelerates like a heavy man.
const assert = require('node:assert/strict');
const { run } = require('../qa/walk-gait/gait-sim.cjs'), { gait } = require('../qa/walk-gait/gait-metrics.cjs');
const P = DreamPose;
assert.equal(P.params(NaN).S, P.STRIDE, 'unknown speed: the film stride'); assert.equal(+P.strideAt(1.25).toFixed(6), P.STRIDE, '1.25 m/s: the film stride');
assert.equal(P.params(NaN).D, P.DUTY); assert.ok(P.params(3.44).D < .45 && P.params(2.22).D > .55, 'jog has a flight, the walk never');
{ const s = {}; let v = 0; for (let i = 0; i < 6; i++) v = Math.hypot(...P.pace(s, 0, 2.22, 0, 1 / 30)); assert.ok(v > .8 && v < 1, 'from standing: ~0.9 m/s after 0.2 s (' + v.toFixed(2) + ')');
  for (let i = 0; i < 30; i++) v = Math.hypot(...P.pace(s, 0, 2.22, 0, 1 / 30)); assert.ok(Math.abs(v - 2.22) < 1e-6, 'reaches the stick speed');
  for (let i = 0; i < 6; i++) v = Math.hypot(...P.pace(s, 0, 0, 0, 1 / 30)); assert.ok(v > 1 && v < 1.3, 'stops over ~0.4 s'); }
const out = {};
const steady = (course, a, b) => { const { rows } = run(course, 'lion'); return { s: gait(rows, { from: a, to: b }), all: gait(rows, {}) }; };
// courses: 1 s standing, then 6 s at speed (steady window 2.5-6.8 s), then a stop
for (const [name, lo, hi] of [['film', 1.25, 1.35], ['walk', 1.6, 1.85], ['fast', 2.2, 2.6]]) {
  const { s, all } = steady(name, 2.5, 6.8); out[name] = { steady: s, whole: { slideMaxCm: all.slideMaxCm, airFrames: all.airFrames, dropCmMax: all.dropCmMax } };
  console.log(name, JSON.stringify(out[name]));
  assert.ok(s.strideM >= lo && s.strideM <= hi, `${name}: stride ${s.strideM} m`);
  assert.ok(s.slideMaxCm < 3, `${name}: planted feet do not slide (${s.slideMaxCm} cm/frame)`); assert.ok(s.slideMeanMm < 2.5, `${name}: mean slide ${s.slideMeanMm} mm`);
  assert.ok(all.slideMaxCm < 5, `${name}: start and stop without sliding (${all.slideMaxCm} cm)`); assert.ok(all.dropCmMax < 3, `${name}: no hip drop (${all.dropCmMax} cm/frame)`);
  assert.ok(s.headYawDeg < 2, `${name}: head steady (${s.headYawDeg} deg)`);
  assert.ok(s.armFlexDeg.L[1] > 10 && s.armFlexDeg.L[0] < -15, `${name}: the arm swings in front of and behind the body ${JSON.stringify(s.armFlexDeg.L)}`);
  assert.ok(s.shoulderDeg > s.pelvisDeg, `${name}: the shoulders swing more than the pelvis (${s.shoulderDeg} / ${s.pelvisDeg})`);
}
const F = out.film.steady, W = out.walk.steady, J = out.fast.steady;
assert.ok(F.stepsPerMin > 108 && F.stepsPerMin < 122, 'film walk cadence ' + F.stepsPerMin); assert.ok(W.stepsPerMin > 140 && W.stepsPerMin < 165, 'brisk walk cadence ' + W.stepsPerMin); assert.ok(J.stepsPerMin > 160 && J.stepsPerMin < 185, 'jog cadence ' + J.stepsPerMin);
assert.equal(F.airFrames, 0, 'film walk never airborne'); assert.equal(W.airFrames, 0, 'brisk walk never airborne'); assert.equal(out.film.whole.airFrames, 0); assert.equal(out.walk.whole.airFrames, 0);
assert.ok(J.flightFrames > 15 && J.flightFrames < 60, 'the jog has a short flight each step (' + J.flightFrames + ' of ' + J.frames + ' frames)');
assert.ok(F.bobCm >= 2 && F.bobCm <= 4.5 && W.bobCm <= 6.5 && J.bobCm <= 7, `bob film ${F.bobCm} / walk ${W.bobCm} / jog ${J.bobCm} cm`);
assert.ok(F.pelvisDeg >= 4 && F.pelvisDeg <= 6 && W.pelvisDeg > F.pelvisDeg, `pelvis turn grows with pace (${F.pelvisDeg} -> ${W.pelvisDeg})`);
assert.ok(F.shoulderDeg >= 5 && W.shoulderDeg > F.shoulderDeg && J.shoulderDeg > W.shoulderDeg, `shoulder turn ${F.shoulderDeg} / ${W.shoulderDeg} / ${J.shoulderDeg}`);
assert.ok(F.elbowDeg.L[0] < 25 && F.elbowDeg.L[1] > 28 && W.elbowDeg.L[1] > F.elbowDeg.L[1] && J.elbowDeg.L[0] > 50 && J.elbowDeg.L[1] > 80, `elbows ${JSON.stringify([F.elbowDeg.L, W.elbowDeg.L, J.elbowDeg.L])}`);
assert.ok(W.handSwingM.L > F.handSwingM.L, 'the arms swing more in the brisk walk');
assert.ok(F.leanDeg < W.leanDeg && W.leanDeg < J.leanDeg && J.leanDeg > 4.5, `lean grows with speed ${F.leanDeg} / ${W.leanDeg} / ${J.leanDeg}`);
assert.ok(F.shoulderRollCm > .4 && J.shoulderRollCm > F.shoulderRollCm, 'the shoulders roll');
assert.ok(F.tailSwingCm > 1, 'the tail swings');
// turns (90 deg, then a reversal) and stop-start at walk and jog
for (const c of ['turn', 'startstop']) { const { rows } = run(c, 'lion'), g = gait(rows, {}); console.log(c, JSON.stringify({ slideMaxCm: g.slideMaxCm, slideMeanMm: g.slideMeanMm, airFrames: g.airFrames, dropCmMax: g.dropCmMax }));
  assert.ok(g.slideMaxCm < (c === 'turn' ? 5 : 8), `${c}: slide ${g.slideMaxCm} cm`); assert.ok(g.slideMeanMm < 2, `${c}: mean slide ${g.slideMeanMm} mm`); assert.ok(g.dropCmMax < 6, `${c}: hip drop ${g.dropCmMax} cm`);
  if (c === 'turn') assert.ok(g.airFrames <= 1, 'turning at a walk: never airborne (' + g.airFrames + ')'); }
// without the plant layer (most films): the stride follows the speed and a planted foot still does not slide
{
  const c = new LionCoach(require('../assets/models/coach-surface-v2.json'), { species: 'lion' }); StoryCast.outfit(c, 'street'); P.reset(c);
  let d = 0, worst = 0; const hold = {}, V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (let i = 0; i < 240; i++) {
    const v = i < 80 ? 1.25 : i < 160 ? 1.25 + (i - 80) / 80 * .9 : 2.15; d += v / 30; c.root.position.set(0, 0, d); c.root.updateMatrixWorld(true);
    P.civil(c, { t: i / 30, dt: i ? 1 / 30 : 0, dist: d, walk: 1 });
    for (const s of ['L', 'R']) { const f = c.joints['foot' + s], h = f.localToWorld(V(0, -.12, -.065)), b = f.localToWorld(V(0, -.12, .13)), q = h.y < b.y ? h : b, k = s + (h.y < b.y ? 'h' : 'b');
      if (q.y < .004) { if (hold[k]) worst = Math.max(worst, Math.hypot(q.x - hold[k].x, q.z - hold[k].z)); else hold[k] = q.clone(); } else hold[k] = null; for (const o of ['h', 'b']) if (o !== k.slice(1)) hold[s + o] = null; }
  }
  console.log('no plant, speed 1.25 -> 2.15 m/s: worst contact slide', (worst * 1000).toFixed(1), 'mm');
  assert.ok(worst < .012, 'a planted foot holds its spot while the stride changes (' + (worst * 1000).toFixed(1) + ' mm)');
}
console.log('walk gait speed ok');
