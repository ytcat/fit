// Story sets (GOTR-0056 layers 2 + 3): scene timeline sampling, Chapter 1 scripts and the carry-the-bag mini-game scoring.
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), G = require('../glossary.js'), S = require('../adventure/story/story-core.js');
const near = (a, b, e = 1e-6, m = '') => assert.ok(Math.abs(a - b) <= e, `${m} ${a} != ${b}`);

// ---- timeline sampling
const keys = [{ t: 0, pos: [0, 0, 0], look: [0, 0, -1] }, { t: 2, pos: [2, 0, 0], look: [0, 0, -1], ease: 'linear' }];
near(S.camera(keys, 1).pos[0], 1, 1e-9, 'linear camera midpoint');
near(S.camera(keys, -5).pos[0], 0, 0, 'clamped before start'); near(S.camera(keys, 9).pos[0], 2, 0, 'clamped after end');
near(S.camera(keys, 1, true).pos[0], 0, 0, 'reduced motion: no dolly, holds the key');
near(S.camera(keys, 2, true).pos[0], 2, 0, 'reduced motion: cuts at the next key');
near(S.camera([{ t: 0, pos: [0], look: [0] }, { t: 1, pos: [1], look: [0] }], .5).pos[0], .5, 1e-9, 'smooth ease is symmetric');
const walk = [{ t: 0, x: 0, z: 0, act: 'idle', face: 0 }, { t: 1, x: 0, z: 0 }, { t: 3, x: 4, z: 0, act: 'wave', face: [4, 5] }];
let a = S.actor(walk, .5); assert.equal(a.walking, false); assert.equal(a.act, 'idle'); near(a.ry, 0);
a = S.actor(walk, 2); assert.equal(a.walking, true); near(a.x, 2, 1e-9, 'constant walking speed'); near(a.ry, Math.PI / 2, 1e-9, 'faces the travel direction'); near(a.speed, 2); near(a.dist, 2, 1e-9);
near(a.stepPhase, (2 / S.STEP) % 1, 1e-9, 'step phase follows distance');
a = S.actor(walk, 4); assert.equal(a.walking, false); assert.equal(a.act, 'wave'); near(a.actT, 1, 1e-9); near(a.ry, 0, 1e-9, 'faces a point after arriving'); near(a.dist, 4, 1e-9);
assert.equal(S.line([{ t: 1, dur: 2, who: 'pip' }], 2.9).who, 'pip'); assert.equal(S.line([{ t: 1, dur: 2 }], 3), null);

// ---- Chapter 1 scripts
for (const [id, scene] of Object.entries(S.scenes)) {
  assert.deepEqual(S.validate(scene), [], id + ' script is valid');
  assert.ok(scene.duration >= 5 && scene.duration <= 11, id + ' is a short scene (5-11 s)');
  for (const l of scene.lines) for (const lang of ['he', 'ru']) assert.ok(!/[A-Za-z]/.test(G.strip(l.text[lang])), id + ' ' + lang + ' untranslated: ' + l.text[lang]);
  const end = S.sample(scene, scene.duration + 3); assert.equal(end.done, true, id + ' ends'); assert.equal(S.sample(scene, 0).done, false);
}
const arr = S.scenes.arrival;
assert.equal(arr.set, 'busstop'); assert.equal(arr.actors.pip.mitts, true, 'Coach Pip holds the mitts');
assert.ok(S.sample(arr, 0).props.bus[0] < 1 && S.sample(arr, 4).props.bus[0] > 25, 'the bus pulls away');
assert.equal(S.sample(arr, 3).actors.fighter.act, 'shadow', 'the Fighter shadowboxes at the stop');
assert.equal(S.sample(arr, 3).actors.pip.walking, true, 'Pip walks over');
const pipEnd = S.sample(arr, 6).actors.pip, fEnd = S.sample(arr, 6).actors.fighter;
assert.ok(Math.hypot(pipEnd.x - fEnd.x, pipEnd.z - fEnd.z) > 1.2 && Math.hypot(pipEnd.x - fEnd.x, pipEnd.z - fEnd.z) < 2.2, 'Pip stops at talking distance');
assert.match(S.sample(arr, 7).line.text.en, /corner in my gym/);
const br = S.scenes.brick;
assert.equal(br.set, 'gymfront'); assert.equal(br.bag.holder, 'brick');
assert.equal(S.sample(br, 1).actors.brick.act, 'carry'); assert.equal(S.sample(br, 4).actors.brick.act, 'laugh', 'Brick laughs after dropping the bag');
assert.ok(br.bag.drop < S.sample(br, 4).line.t, 'the line comes after the drop');

// ---- carry the heavy bag
const R = S.CARRY;
assert.ok(A.missions.some(m => m.id === R.missionId && m.metric === 'mistakes'), 'records the existing mission and metric');
const starsFor = A.starsFor;
function play(bot, maxT = 130) { const g = new S.CarryBag(); let guard = 0; while (!g.done && guard++ < maxT * 60) { bot(g); g.step(1 / 60); } return g; }
// A perfect player: walks, re-presses Right inside each step window, waits for the cyclist, catches every sway in time.
function perfect(g) {
  const v = g.view();
  if (g.sway && g.theta > .45) { const k = S.swayKey(g.sway.dir); g.key(k, true); g.key(k, false); }
  const o = g.nextObstacle();
  if (o && !g.stride && o.s - g.s <= .6 && o.s - g.s >= .15) { g.key('right', false); g.key('right', true); return; }
  // Before the alley: go only if the whole crossing fits before the bike is in the lane.
  const c = R.cyclist, before = g.s < c.s - c.half && g.s > c.s - c.half - .6;
  if (before) { const clear = (c.s + c.half + .05 - g.s) / R.walk; for (let k = 0; k <= clear + .05; k += 1 / 60) if (g.cyclist(g.t + k).inLane) { g.key('right', false); return; } }
  if (!g.held.right) g.key('right', true);
  void v;
}
const best = play(perfect), res = best.result(starsFor);
assert.equal(res.finished, true, 'perfect run reaches the door');
assert.equal(res.bumps, 0, 'no bumps: ' + JSON.stringify(best.log.filter(e => e.type === 'bump')));
assert.equal(res.drops, 0); assert.equal(res.caught, R.sways.length);
assert.ok(res.time <= R.par, 'within par: ' + res.time); assert.equal(res.mistakes, 0); assert.equal(res.stars, 3);
// Holding Right the whole way: bumps the bench and the puddle and drops every sway.
const lazy = play(g => { if (!g.held.right) g.key('right', true); }), lr = lazy.result(starsFor);
assert.equal(lr.finished, true); assert.ok(lr.bumps >= 2, 'bench + puddle bumps'); assert.equal(lr.drops, R.sways.length);
assert.ok(lr.mistakes >= 5 && lr.stars <= 1, 'careless run earns at most one star: ' + JSON.stringify(lr));
// Wrong key and early key make the tip worse; catching too early is not allowed.
const w = new S.CarryBag(); w.s = R.sways[0].s; w.step(.01); assert.ok(w.sway); const th = w.theta;
w.key(S.swayKey(-w.sway.dir), true); assert.ok(w.theta > th + .2, 'wrong key tips further');
const e = new S.CarryBag(); e.s = R.sways[0].s; e.step(.01); e.key(S.swayKey(e.sway.dir), true); assert.ok(e.sway, 'too early: not caught'); assert.equal(e.log.at(-1).type, 'early');
// A stride only starts from a fresh Right press inside the window.
const st = new S.CarryBag(); st.s = R.obstacles[0].s - 3; st.key('right', true); assert.equal(st.stride, null, 'far from the bench: no stride');
st.key('right', false); st.s = R.obstacles[0].s - .5; st.key('right', true); assert.ok(st.stride, 'stride in the window');
while (st.stride) st.step(1 / 60); assert.ok(st.s > R.obstacles[0].s + R.obstacles[0].len, 'stepped over the bench'); assert.equal(st.bumps, 0);
// Time over par costs a mistake per started 8 s.
const slow = new S.CarryBag(); slow.t = R.par + 8.5; assert.equal(slow.overtime(), 2);
// Standing in the cyclist lane while the bike passes: one bump per pass.
const cy = new S.CarryBag(); cy.s = R.cyclist.s; for (let i = 0; i < 60 * 10; i++) cy.step(1 / 60);
assert.ok(cy.bumps >= 2 && cy.bumps <= 3, 'one bump per pass: ' + cy.bumps);
// Deterministic: the same inputs give the same result.
assert.deepEqual(play(perfect).result(starsFor), res);
// Stars come from the mission thresholds (lower is better: 5, 2, 0).
assert.deepEqual([0, 1, 2, 3, 5, 6].map(n => starsFor(R.missionId, n)), [3, 2, 2, 1, 1, 0]);
console.log('story-scenes ok', JSON.stringify({ perfect: res, lazy: lr }));
