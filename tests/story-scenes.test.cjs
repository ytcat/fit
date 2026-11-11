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

// ---- story 2: every Chapter 1 scene id exists; lines are short (70 characters) in every language
assert.deepEqual(Object.keys(S.scenes).sort(), ['arrival', 'boss_intro', 'boss_outro', 'brick', 'dash']);
const ST = require('../adventure/story.js');
for (const [id, scene] of Object.entries(S.scenes)) for (const l of scene.lines) { assert.ok(ST.who[l.who], id + ' speaker ' + l.who); for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang].length <= 70, `${id} ${lang} line too long (${l.text[lang].length})`); }
for (const [id, m] of Object.entries(ST.lines)) for (const kind of ['intro', 'outro', 'lost']) for (const l of m[kind] || []) for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang].length <= 70, `${id} ${kind} ${lang} too long (${l.text[lang].length}): ${l.text[lang]}`);
// camera easing is smooth at both ends and the framing list follows the destination key
const ck = [{ t: 0, pos: [0], look: [0], fit: ['a'] }, { t: 1, pos: [1], look: [0], fit: ['b'] }];
assert.ok(S.camera(ck, .1).pos[0] < .02 && S.camera(ck, .9).pos[0] > .98, 'eases in and out'); assert.deepEqual(S.camera(ck, .2).fit, ['a']); assert.deepEqual(S.camera(ck, .8).fit, ['b']);
// Dash: beats the regular within seconds, laughs, then calls out the Fighter; Pip is only heard
const da = S.scenes.dash; assert.equal(da.actors.dash.rig, 'dash'); assert.equal(S.sample(da, 2.6).actors.dash.act, 'combo');
const downAt = da.actors.regular.keys.find(k => k.act === 'down').t, comboAt = da.actors.dash.keys.find(k => k.act === 'combo').t; assert.ok(downAt - comboAt < 1.5, 'the regular is down in under 1.5 s');
assert.equal(S.sample(da, 4.5).actors.dash.act, 'laugh'); assert.equal(S.sample(da, 9).line.who, 'pip'); assert.ok(!da.actors.pip);
// Boss scenes: Brick blocks the door; after the win Pip hands the wraps over and sends the Fighter to Vix
const bi = S.scenes.boss_intro, bo = S.scenes.boss_outro;
assert.equal(S.sample(bi, 1).actors.brick.act, 'block'); const bk = S.sample(bi, 1).actors.brick; assert.ok(Math.hypot(bk.x - 11, bk.z + 3.5) < 1.2, 'Brick stands in the doorway');
assert.deepEqual(bo.item.holders.map(h => h.who), ['pip', 'fighter']); assert.match(bo.lines.at(-1).text.en, /Vix at Market Row/);
assert.ok(S.sample(bo, 3).actors.brick.x > 12.5, 'Brick has stepped aside');

// ---- the snoring night guard
const GR = S.GUARD; assert.ok(A.missions.some(m => m.id === GR.missionId && m.metric === 'dodges'));
assert.equal(GR.swings.length, 9, 'nine swings = the 3-star threshold'); assert.deepEqual(A.missions.find(m => m.id === GR.missionId).thresholds, [3, 6, 9]);
function playGuard(bot) { const g = new S.GuardGame(); let n = 0; while (!g.done && n++ < 100 * 60) { bot(g); g.step(1 / 60); } return g; }
// perfect: sneak, dodge each swing with the right key a moment before it lands, ring the bell
const ace = playGuard(g => { const v = g.view(); if (!g.held) g.key('right', true); if (v.swing && v.swing.k > .55 && !v.dodge) g.key(v.prompt, true); if (v.atBell) g.key('up', true); }), ar = ace.result(starsFor);
assert.equal(ar.finished, true); assert.equal(ar.dodges, 9); assert.equal(ar.hits, 0); assert.equal(ar.stars, 3); assert.ok(ar.time < 30, 'under 30 s: ' + ar.time);
// only walking: every pillow lands, the bell still wakes him, no stars
const sleepy = playGuard(g => { if (!g.held) g.key('right', true); if (g.view().atBell) g.key('up', true); }), sr = sleepy.result(starsFor);
assert.equal(sr.finished, true); assert.equal(sr.dodges, 0); assert.equal(sr.hits, 9); assert.equal(sr.stars, 0);
// wrong dodge, a dodge that started before the swing, and a dodge that ended too early all count as hits
const one = (key, at) => { const g = new S.GuardGame(); g.s = g.mark(0); g.step(.01); assert.ok(g.swing); const tele = g.swing.tele; let pressed = false; while (g.swing) { if (!pressed && g.t - g.swing.t0 >= at * tele) { g.key(key, true); pressed = true; } g.step(1 / 120); } return g; };
assert.equal(one('down', .6).dodges, 1, 'hook: duck in time'); assert.equal(one('left', .6).hits, 1, 'hook: a Slip does not help'); assert.equal(one('down', .05).hits, 1, 'ducked too early');
const pre = new S.GuardGame(); pre.s = pre.mark(0) - .01; pre.key('down', true); pre.key('right', true); pre.step(.02); pre.step(.02); assert.equal(pre.swing, null, 'no sneaking while ducking');
// the bell only rings at the end
const nb = new S.GuardGame(); nb.key('up', true); assert.equal(nb.done, false);
assert.deepEqual(playGuard(g => { const v = g.view(); if (!g.held) g.key('right', true); if (v.swing && v.swing.k > .55 && !v.dodge) g.key(v.prompt, true); if (v.atBell) g.key('up', true); }).result(starsFor), ar, 'deterministic');
console.log('story-scenes ok', JSON.stringify({ perfect: res, lazy: lr, guard: ar }));
