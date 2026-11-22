// Owner 2026-11-22: "you need to have few combinations and make this in shorter time, so it's not by clicking three times on three
// buttons in 50 seconds"; "shadow boxing with the same punch 50 times … is not a game. Go over all exercises." The Chapter 1 trainings
// (night shadowboxing, the old heavy bag, fight preparation on the mitts, advanced training) are coach-called combo drills.
const assert = require('assert'), fs = require('fs'), path = require('path');
const C = require('../adventure/story/call-core.js'), A = require('../adventure-progress.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const R = s => () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
const play = (kind, react, gap, err, seed = 5) => { const d = new C.CallDrill(kind), r = R(seed); let at = null, last = -1;
  while (!d.done) { const v = d.view(); if (v.seq && !v.waiting) { if (d.calls !== last) { last = d.calls; at = d.t + react; } if (d.t >= at) { d.input(r() < err ? C.MOVES[Math.floor(r() * 5)] : v.seq[v.at]); at = d.t + gap; } } if (v.waiting) d.power(); d.step(.01); } return d; };
const spam = (kind, mv, every = 18) => { const d = new C.CallDrill(kind); let k = 0; while (!d.done) { if (k++ % every === 0) d.input(mv); if (d.view().waiting) d.power(); d.step(.01); } return d.value; };
const ids = { shadow: 'night_shadow', bag: 'night_bag', mitts: 'fight_prep', counter: 'advanced_training' };
for (const [kind, id] of Object.entries(ids)) {
  const m = A.missions.find(x => x.id === id); assert.strictEqual(m.metric, 'combos', id);
  const [one, two, three] = m.thresholds, sharp = play(kind, .45, .22, 0).value, good = play(kind, .7, .32, .05).value, ok = play(kind, .9, .42, .12).value;
  assert.ok(sharp >= three, `${kind}: a sharp player reaches gold (${sharp} >= ${three})`);
  assert.ok(good >= two && good < sharp, `${kind}: a good player gets silver (${good})`);
  assert.ok(ok >= one - 2, `${kind}: an average player is near a medal (${ok})`);
  for (const mv of C.MOVES) assert.ok(spam(kind, mv) < one, `${kind}: spamming ${mv} must not earn a star (${spam(kind, mv)})`);
  for (const every of [6, 12, 30]) assert.ok(spam(kind, 'straight', every) < one, `${kind}: spamming Straight every ${every} ticks`);
  assert.ok(C.DRILLS[kind].time <= 45, 'short');
  // variety: no single move is more than half of the moves called
  const d = new C.CallDrill(kind), seen = {}; let total = 0; while (!d.done) { const v = d.view(); if (v.seq && v.at === 0) { d.input(v.seq[0]); } if (v.waiting) d.power(); d.step(.01); }
  for (const st of C.DRILLS[kind].stages) for (const seq of st) for (const mv of seq) { seen[mv] = (seen[mv] || 0) + 1; total++; }
  assert.ok(Math.max(...Object.values(seen)) / total < .55, kind + ' varies its calls');
}
// defences are in the mitts and counter drills; every counter call starts with a defence
for (const st of C.DRILLS.counter.stages) for (const seq of st) assert.ok(['slip', 'duck'].includes(seq[0]), 'counter calls start with Slip or Duck');
assert.ok(C.DRILLS.mitts.stages.flat().some(s => s.includes('slip')) && C.DRILLS.mitts.stages.flat().some(s => s.includes('duck')));
// rules: wrong move breaks with a penalty pause; the heavy bag needs the power hit; a call can time out
{ const d = new C.CallDrill('shadow'); while (!d.view().seq) d.step(.01); const v = d.view(); assert.strictEqual(d.input(C.MOVES.find(m => m !== v.seq[0])), 'wrong'); assert.strictEqual(d.misses, 1); const t0 = d.t; while (!d.view().seq) d.step(.01); assert.ok(d.t - t0 >= C.RULES.penalty - .02); }
{ const d = new C.CallDrill('bag'); while (!d.view().seq) d.step(.01); for (const mv of d.view().seq) d.input(mv); assert.ok(d.view().waiting && d.value === 0, 'waits for the power hit'); d.power(); assert.strictEqual(d.value, 1); }
{ const d = new C.CallDrill('bag'); while (!d.view().seq) d.step(.01); for (const mv of d.view().seq) d.input(mv); for (let i = 0; i < 120; i++) d.step(.01); assert.strictEqual(d.value, 0, 'a soft finish does not count'); assert.strictEqual(d.flash?.why, 'soft'); }
{ const d = new C.CallDrill('mitts'); while (!d.view().seq) d.step(.01); for (let i = 0; i < 500 && d.view().seq; i++) d.step(.01); assert.strictEqual(d.misses, 1, 'too slow'); }
// input mapping (boxing-input.js ids, fighter-pad.js buttons)
assert.deepStrictEqual(['jab', 'cross', 'hook', 'rear_hook', 'uppercut', 'rear_uppercut', 'slip_left', 'slip_right', 'roll', 'guard', 'step_left'].map(C.moveOf), ['straight', 'straight', 'hook', 'hook', 'uppercut', 'uppercut', 'slip', 'slip', 'duck', null, null]);
// wiring
const town = read('adventure/oldtown.js'), html = read('index.html');
assert.match(town, /run\.caller\.input\(window\.CallCore\.moveOf\(String\(id\)\)\)/, 'real presses feed the drill');
assert.match(town, /if \(r\.caller\) \{ r\.caller\.step\(dt\); r\.value = r\.caller\.value; paintCalls\(\); \}/);
assert.ok(html.indexOf('call-core.js') > 0 && html.indexOf('call-core.js') < html.indexOf('oldtown.js'));
console.log('call-drills: ok');
