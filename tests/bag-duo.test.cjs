// GOTR-0106: the two-sided bag drill with Mack (Chapter 1 beat 8) is a skill game: Mack hits, the bag swings to the Fighter,
// who hits it back at the top of the swing with the called punch. Rules (trials-core.js DuoTrial) and wiring.
const assert = require('assert'), fs = require('fs'), path = require('path');
const T = require('../adventure/story/trials-core.js'), A = require('../adventure-progress.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const play = (hard, acc, jit, seed = 9) => { const t = new T.DuoTrial(undefined, { hard }), R = T.rng(seed); let pend = null;
  while (!t.done) { const v = t.view(); if (t.c.state === 'toward' && pend == null && t.c.hits < t.c.need) pend = t.due + (R() - .5) * 2 * jit;
    if (pend != null && t.t >= pend) { t.key(R() < acc ? v.type : 'hook', true); pend = null; } t.step(.005); }
  return t.result(A.starsFor); };
// it records the bag_drill mission (landed hits), thresholds 15 / 25 / 35
const m = A.missions.find(x => x.id === 'bag_drill'); assert.strictEqual(m.metric, 'landed'); assert.deepStrictEqual(m.thresholds, [15, 25, 35]);
const perfect = play(false, 1, 0); assert.strictEqual(perfect.missionId, 'bag_drill'); assert.strictEqual(perfect.metric, 'landed');
assert.ok(perfect.value >= 37 && perfect.misses === 0 && perfect.stars === 3, 'gold is reachable with clean timing: ' + perfect.value);
assert.ok(perfect.time >= 40 && perfect.time < 43, 'about 40 s');
const sloppy = play(false, .8, .25); assert.ok(sloppy.value >= 15 && sloppy.value < 35, 'a loose player gets a medal but not gold: ' + sloppy.value);
// doing nothing or mashing a wrong punch earns nothing; every swing counts as a miss
const idle = new T.DuoTrial(); while (!idle.done) idle.step(.05); assert.strictEqual(idle.result(A.starsFor).value, 0); assert.ok(idle.misses >= 25);
const mash = new T.DuoTrial(); let i = 0; while (!mash.done) { if (i++ % 3 === 0) mash.key('straight', true); mash.step(.05); } assert.ok(mash.result().value <= 6, 'mashing must not pay');
// the right punch out of the window misses, the wrong punch in the window misses
{ const t = new T.DuoTrial(); while (t.c.state !== 'toward' || t.t < t.due - .5) t.step(.01); t.key(t.c.type, true); assert.strictEqual(t.c.state, 'missed'); }
{ const t = new T.DuoTrial(); while (t.c.state !== 'toward' || t.t < t.due) t.step(.005); t.key(T.PUNCH.find(p => p !== t.c.type), true); assert.strictEqual(t.c.state, 'missed'); }
// doubles appear later and need two hits; the first three calls teach Straight, Hook, Uppercut
{ const t = new T.DuoTrial(), calls = [], doubles = []; let last = -1; while (!t.done) { if (t.cycle !== last) { last = t.cycle; calls.push(t.c.type); if (t.c.need > 1) doubles.push(t.cycle); } t.step(.01); }
  assert.deepStrictEqual(calls.slice(0, 3), ['straight', 'hook', 'uppercut']); assert.ok(doubles.length >= 4 && doubles[0] >= T.DUO.doubleFrom); }
// the bag swings both ways for the picture: +1 at Mack, -1 at the Fighter's peak
{ const t = new T.DuoTrial(); let lo = 0, hi = 0; for (let k = 0; k < 600; k++) { const v = t.view(); lo = Math.min(lo, v.swing); hi = Math.max(hi, v.swing); t.step(.01); } assert.ok(lo < -.95 && hi > .95); }
// hard (unlocked by gold) is faster
assert.ok(play(true, 1, 0).value > perfect.value);
// wiring: beat 8 opens the game after the New Bag film; Mack is the rabbit pad rig; kit in the gym; the new bag swings
const scenes = read('adventure/story/story-scenes.js'), town = read('adventure/oldtown.js'), flow = read('adventure/story-flow.js');
assert.match(town, /bag_drill: \{ kind: 'scene', scene: 'bag_duo' \}/);
assert.match(flow, /beat: 8, scene: 'dream_new_bag' \}/); assert.ok(!/stands in for the drill with Mack/.test(flow), 'the stand-in note is gone');
assert.match(scenes, /bag_duo: \{\n\s+set: 'dream_gym', wear: 'kit', dpad: false, roles: \{ fighter: \{\}, pip: \{\} \}, make: \(T, o\) => new T\.DuoTrial/);
assert.match(scenes, /GymReturnCore\.bagPoseAt\(/); assert.match(read('adventure/story/gym-return-core.js'), /function bagPoseAt\(base, th\)/);
console.log('bag-duo: ok', { perfect: perfect.value, sloppy: sloppy.value });
// gloves stop on the leather (owner 2026-11-21: "the hands of players are inside the bag"): at the top of each swing the bag's centre is
// at least reach + glove + bag radius from the puncher; the punch rises only to its contact phase (measured in qa/gotr-0106/contact.cjs)
{ const BB = require('../adventure/story/bag-break-core.js');
  const m = scenes.match(/R0 = ([\d.]+), ARM = ([\d.]+)/), table = scenes.match(/CONTACT = \{ straight: \[([\d.]+), ([\d.]+)\], hook: \[([\d.]+), ([\d.]+)\], uppercut: \[([\d.]+), ([\d.]+)\] \}/);
  assert.ok(m && table, 'contact table'); const R0 = +m[1], ARM = +m[2];
  for (const [i, k] of [[1, 'straight'], [3, 'hook'], [5, 'uppercut']]) { const phase = +table[i], reach = +table[i + 1], d = Math.min(.6, Math.max(0, R0 - reach - .06 - BB.BAG.r));
    assert.ok(phase > .3 && phase < .42, k + ' stops at its contact phase, before full extension'); assert.ok(R0 - ARM * Math.sin(Math.asin(d / ARM)) >= reach + .06 + BB.BAG.r - 1e-9, k + ' glove would enter the bag'); }
  assert.match(scenes, /phase: age < C \? \.14 \+ age \/ C \* \(hit - \.14\) : hit - /, 'the Fighter\'s punch rises to contact and pulls back');
  assert.ok(T.DUO.contact > 0, 'the bag waits for the glove'); }
console.log('bag-duo contact: ok');
