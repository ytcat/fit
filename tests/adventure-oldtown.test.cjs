// Old Town missions (GOTR-0008 slice C1): what each playable mission measures from existing game signals, and how the
// measured value maps to stars. Goal wording is checked in EN/HE/RU against the boxing glossary.
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js');
const G = require('../glossary.js');
const PM = require('../power-meter.js');
window.AdventureProgress = A; window.GotrGlossary = G; window.PowerMeter = PM;
window.app = { lang: 'en', engine: { player: { enabled: true } } };
require('../adventure/oldtown.js');
const OT = window.AdventureOldTown, D = OT.defs;

const town = A.missions.filter(m => m.chapter === 1);
assert.equal(town.length, 9);
for (const m of town) {
  if (D[m.id]) assert.ok(['training', 'help'].includes(m.type) || m.id === 'morning_sparring', m.id + ' type');
  else assert.ok(m.type === 'funny' || m.id === 'first_stance', m.id + ' is not playable yet');
}
assert.deepEqual(Object.keys(D).sort(), ['bag_power', 'morning_sparring', 'one_two_mitts', 'roll_under_hook', 'rope_rhythm', 'teach_the_kid']);

const run = id => ({ id, value: 0 });
const stars = r => A.starsFor(r.id, r.value);
const pad = (move, extra = {}) => ({ actor: 'lion', receiver: 'pads', kind: 'pad', move, blocked: false, ...extra });

// One-two on the mitts: only the Fighter's clean jab and cross on the pads, only in manual play.
{
  const r = run('one_two_mitts');
  for (let i = 0; i < 7; i++) D.one_two_mitts.imp(r, pad(i % 2 ? 'cross' : 'jab'));
  assert.equal(stars(r), 0, '7 hits');
  D.one_two_mitts.imp(r, pad('jab')); assert.equal(stars(r), 1, '8 hits = 1 star');
  D.one_two_mitts.imp(r, pad('hook')); D.one_two_mitts.imp(r, pad('jab', { blocked: true })); D.one_two_mitts.imp(r, { ...pad('jab'), actor: 'rabbit' });
  assert.equal(r.value, 8, 'hooks, blocked and partner contacts are not counted');
  window.app.engine.player.enabled = false; D.one_two_mitts.imp(r, pad('jab')); window.app.engine.player.enabled = true;
  assert.equal(r.value, 8, 'coach-driven (auto) hits are not the Fighter\'s');
  for (let i = 0; i < 6; i++) D.one_two_mitts.imp(r, pad('cross'));
  assert.equal(stars(r), 2, '14 hits = 2 stars');
  for (let i = 0; i < 6; i++) D.one_two_mitts.imp(r, pad('jab'));
  assert.equal(r.value, 20); assert.equal(stars(r), 3, '20 hits = 3 stars');
}
// Bag power test: the power meter's strong level (impulse >= 0.7 x 110 on the heavy bag).
{
  const r = run('bag_power'), hit = impulse => ({ actor: 'lion', receiver: 'heavy', impulse, blocked: false });
  D.bag_power.imp(r, hit(76)); D.bag_power.imp(r, hit(40)); assert.equal(r.value, 0);
  D.bag_power.imp(r, hit(77.1)); assert.equal(stars(r), 1);
  for (let i = 0; i < 4; i++) D.bag_power.imp(r, hit(100)); assert.equal(r.value, 5); assert.equal(stars(r), 3);
  D.bag_power.imp(r, { ...hit(104), receiver: 'platform' }); assert.equal(r.value, 5, 'floor contacts do not count');
}
// Roll under the hook: one defence per successful roll frame.
{
  const r = run('roll_under_hook');
  for (let i = 0; i < 4; i++) D.roll_under_hook.frame(r, { defences: 1 }, .016); D.roll_under_hook.frame(r, { defences: 0 }, .016);
  assert.equal(stars(r), 1);
  for (let i = 0; i < 6; i++) D.roll_under_hook.frame(r, { defences: 1 }, .016); assert.equal(stars(r), 3);
}
// Rope rhythm: the longest stretch with a jump at least every 1.5 s (the rope has no miss; the coach sets the beat).
{
  const r = run('rope_rhythm'), tick = (jumps, dt = .5) => D.rope_rhythm.frame(r, { rope: {}, jumps }, dt);
  for (let s = 0; s < 24; s++) tick(1, .9);
  assert.ok(r.value >= 21 && r.value <= 24, 'a steady rope: ' + r.value); assert.equal(stars(r), 2);
  const best = r.value; for (let s = 0; s < 4; s++) tick(0, .5); tick(1, .5); assert.equal(r.value, best, 'a 2 s pause ends the stretch but keeps the best');
  D.rope_rhythm.frame(r, { jumps: 1 }, .5); assert.equal(r.value, best, 'frames without the rope are ignored');
}
// Stars for the two bout/lesson missions come straight from the measured values.
assert.equal(A.starsFor('teach_the_kid', 3), 3); assert.equal(A.starsFor('teach_the_kid', 2), 2);
assert.deepEqual([0, 5, 10, 15].map(v => A.starsFor('morning_sparring', v)), [0, 1, 2, 3]);

// Recording through the save keeps the best and updates the Fighter Level exactly like the core.
{
  const { CareerStore } = require('../career-progress.js');
  const mem = { v: new Map(), getItem(k) { return this.v.get(k) || null; }, setItem(k, x) { this.v.set(k, x); } };
  const s = new CareerStore(mem); s.create('Q');
  const r1 = s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'one_two_mitts', measured: { cleanHits: 14 } });
  assert.equal(r1.ok, true); assert.equal(r1.stars, 2); assert.equal(r1.newStars, 2);
  const r2 = s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'one_two_mitts', measured: { cleanHits: 20 } });
  assert.equal(r2.stars, 3); assert.equal(r2.newStars, 1); assert.equal(A.statPoints(s.game()).speed, 2, '3 stars on a speed mission = +1 Speed');
  assert.equal(s.game().adventure.missions.one_two_mitts.plays, 2);
}

// Goal wording: all three languages, boxing terms stay English, nothing else Latin.
for (const lang of ['en', 'he', 'ru']) {
  window.app.lang = lang;
  for (const m of town.filter(x => D[x.id])) {
    const text = OT.goalText(m.id, m.thresholds[2]);
    assert.ok(text.includes(String(m.thresholds[2])), lang + ' ' + m.id + ' shows the goal number');
    if (lang !== 'en') assert.ok(!/[A-Za-z]/.test(G.strip(text)), lang + ' ' + m.id + ' has untranslated Latin text: ' + text);
  }
}
for (const lang of ['he', 'ru']) for (const [k, v] of Object.entries(OT.copy[lang])) if (typeof v === 'string') assert.ok(!/[A-Za-z]/.test(G.strip(v).replace(/\{\w+\}/g, '')), lang + ' ' + k + ': ' + v);
for (const k of Object.keys(OT.copy.en)) for (const lang of ['he', 'ru']) assert.ok(k in OT.copy[lang], lang + ' is missing ' + k);
console.log('adventure-oldtown ok');
