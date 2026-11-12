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

// ---- story 2: every Chapter 1 scene id exists; lines are short (70 characters) in every language
assert.deepEqual(Object.keys(S.scenes).filter(k => S.scenes[k].chapter === 1).sort(), ['arrival', 'boss_intro', 'boss_outro', 'brick', 'dash']);
const ST = require('../adventure/story.js');
for (const [id, scene] of Object.entries(S.scenes)) for (const l of scene.lines) { assert.ok(ST.who[l.who], id + ' speaker ' + l.who); for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang].length <= 70, `${id} ${lang} line too long (${l.text[lang].length})`); }
for (const [id, m] of Object.entries(ST.lines).filter(([id]) => ST.beats.some(b => !b.chapter && b.ids.includes(id)))) for (const kind of ['intro', 'outro', 'lost']) for (const l of m[kind] || []) for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang].length <= 70, `${id} ${kind} ${lang} too long (${l.text[lang].length}): ${l.text[lang]}`);
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

// ---- Chapter 2, Market Row
assert.deepEqual(Object.keys(S.scenes).filter(k => S.scenes[k].chapter === 2).sort(), ['dash_circle', 'hyena_intro', 'hyena_outro', 'vix_intro', 'whistle_theft']);
for (const id of ['dash_circle', 'hyena_intro', 'hyena_outro', 'vix_intro', 'whistle_theft']) { assert.equal(S.scenes[id].set, 'market'); assert.ok(Object.keys(S.scenes[id].actors).length <= 3, id + ' at most three rigs'); }
const wt = S.scenes.whistle_theft; assert.deepEqual(wt.item.holders.map(h => h.who), ['pip', 'raccoon'], 'the whistle changes hands');
assert.ok(S.sample(wt, 5).actors.raccoon.walking && S.sample(wt, 5).actors.raccoon.speed > 4, 'the raccoon runs'); assert.equal(S.sample(wt, 7).actors.raccoon.act, 'off');
assert.match(S.scenes.hyena_outro.lines.at(-1).text.en, /Docks/); assert.equal(S.sample(S.scenes.hyena_intro, 1).actors.king.act, 'block');
console.log('story-scenes ok');
