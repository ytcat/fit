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
assert.equal(town.length, 15); // 9 older + 6 measured beats of "The Dream" (GOTR-0078)
const street = A.missions.filter(m => m.chapter === 2);
for (const m of town) {
  if (D[m.id]) assert.ok(['training', 'help'].includes(m.type) || m.id === 'morning_sparring' || D[m.id].kind === 'scene', m.id + ' type'); // GOTR-0056: funny missions play as story-set scenes
  else assert.ok(m.type === 'funny' || m.id === 'first_stance', m.id + ' is not playable yet');
}
assert.deepEqual(Object.keys(D).sort(), ['advanced_training', 'bag_drill', 'bag_power', 'buy_heavy_bag', 'clean_gym', 'clean_hands', 'crowd_circle', 'curb_footwork', 'docks_fight', 'dream_apology', 'dream_arrival', 'dream_gym_talk', 'fight_prep', 'first_brick', 'grandma_groceries', 'heavy_bag_van', 'influencer_challenge', 'kids_skateboard', 'market_robber', 'morning_sparring', 'night_bag', 'night_shadow', 'one_two_mitts', 'roll_under_hook', 'rooftop_balloons', 'rooftop_callout', 'rope_rhythm', 'snoring_guard', 'teach_the_kid', 'whistle_chase']);

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
  for (const m of [...town, ...street].filter(x => D[x.id])) {
    const text = OT.goalText(m.id, m.thresholds[2]);
    assert.ok(text.includes(String(m.thresholds[2])), lang + ' ' + m.id + ' shows the goal number');
    if (lang !== 'en') assert.ok(!/[A-Za-z]/.test(G.strip(text)), lang + ' ' + m.id + ' has untranslated Latin text: ' + text);
  }
}
for (const lang of ['he', 'ru']) for (const [k, v] of Object.entries(OT.copy[lang])) if (typeof v === 'string') assert.ok(!/[A-Za-z]/.test(G.strip(v).replace(/\{\w+\}/g, '')), lang + ' ' + k + ': ' + v);
for (const k of Object.keys(OT.copy.en)) for (const lang of ['he', 'ru']) assert.ok(k in OT.copy[lang], lang + ' is missing ' + k);
// Chapter 2 (Market Row): measures and stars. Street mini-games without a signal stay "coming soon".
for (const m of street) assert.ok(D[m.id] || ['rooftop_balloons', 'whistle_chase', 'grandma_groceries'].includes(m.id), m.id + ' is playable or one of the three street mini-games');
assert.equal(OT.CH[2].venue, 'street'); assert.equal(OT.BOSS.king_hyena.chapter, 2); assert.equal(A.bosses.find(b => b.id === 'king_hyena').entry, 12);
{
  const me = { landed: 12, body: 6 }, opp = { landed: 1 };
  assert.equal(D.clean_hands.measure(me, opp, true), 1); assert.equal(A.starsFor('clean_hands', 1), 2, 'won a round taking 1 hit = 2 stars (<=2)');
  assert.equal(D.clean_hands.measure(me, opp, false), 99); assert.equal(A.starsFor('clean_hands', 99), 0, 'losing the round earns nothing');
  assert.equal(A.starsFor('clean_hands', 0), 3);
  assert.equal(D.kids_skateboard.measure(me), 6); assert.equal(A.starsFor('kids_skateboard', 6), 2);
  assert.equal(D.rooftop_callout.measure(me), 12); assert.equal(A.starsFor('rooftop_callout', 5), 3);
  const r = run('influencer_challenge'); for (let i = 0; i < 20; i++) { window.app.engine.targetMode = 'speed'; D.influencer_challenge.imp(r, { actor: 'lion', receiver: 'speedbag' }); } assert.equal(stars(r), 1);
  assert.equal(D.crowd_circle.chain, 3); assert.equal(A.starsFor('crowd_circle', 3), 3);
}
// Tile labels: every mission has a short label in EN/HE/RU, at most 10 characters.
for (const m of A.missions.filter(x => x.chapter <= 2)) for (const lang of ['en', 'he', 'ru']) { const t = OT.SHORT[m.id]?.[lang]; assert.ok(t && [...t].length <= 10, m.id + ' ' + lang + ' short label: ' + t); }
// GOTR-0069 story mode: every story step can start (a playable mission or a boss), boss steps match the chapter data,
// and the chip row is gone: the sheet is a quest panel with BEFORE/AFTER beats exported for the flow.
{
  const SF = require('../adventure/story-flow.js');
  for (const n of [1, 2]) {
    for (const s of SF.all(n)) assert.ok(s.boss ? OT.BOSS[s.id]?.chapter === n : !!D[s.id], s.id + ' can start from the quest panel');
    assert.equal(SF.chapters[n].boss, OT.CH[n].boss); assert.equal(SF.chapters[n].pin, OT.CH[n].pin);
  }
  for (const f of ['before', 'afterBeat', 'chapterSummary', 'launch', 'render', 'start', 'recordStory', 'storyFightStart', 'storyFightDone', 'playFilm', 'shop']) assert.equal(typeof OT[f], 'function', f);
}
// GOTR-0078 "The Dream": how each beat runs, what the measured beats count, Brick's strength, chapter titles.
{
  const SF = require('../adventure/story-flow.js');
  const kinds = Object.fromEntries(SF.all(1).map(s => [s.id, s.boss ? 'boss' : D[s.id].kind]));
  assert.deepEqual(kinds, { dream_arrival: 'film', dream_gym_talk: 'film', first_brick: 'story_fight', clean_gym: 'scene', night_shadow: 'training', night_bag: 'training', dream_apology: 'film', market_robber: 'story_fight', buy_heavy_bag: 'buy', bag_drill: 'training', fight_prep: 'training', docks_fight: 'story_fight', advanced_training: 'lesson', brick: 'boss' });
  assert.equal(D.dream_arrival.scene, 'dream_opening'); assert.equal(D.dream_gym_talk.scene, 'dream_gym_talk'); assert.equal(D.first_brick.after, 'dream_after_brick');
  assert.equal(D.first_brick.any, true, 'a loss vs Brick advances'); assert.ok(!D.market_robber.any && !D.docks_fight.any, 'the street fights must be won');
  // Brick on day one: clearly stronger than any regular partner (power/tempo 0.85-1.15 before the multiplier) and than the rematch boss.
  assert.ok(D.first_brick.foe.power >= 1.35 && D.first_brick.foe.tempo >= 1.15 && D.first_brick.foe.skill >= .1);
  assert.ok(D.first_brick.foe.power > OT.BOSS.brick.power && D.first_brick.foe.tempo > OT.BOSS.brick.tempo);
  assert.equal(D.docks_fight.venue, 'docks'); assert.equal(D.market_robber.venue, 'street'); assert.equal(D.advanced_training.comboId, 'counter_chain');
  window.app.engine.player.enabled = true;
  const sh = run('night_shadow'); D.night_shadow.frame(sh, { swings: [{ actor: 'lion' }, { actor: 'rabbit' }, { actor: 'lion' }] }); assert.equal(sh.value, 2, 'only the Fighter\'s punches count');
  window.app.engine.player.enabled = false; D.night_shadow.frame(sh, { swings: [{ actor: 'lion' }] }); assert.equal(sh.value, 2, 'Auto does not count'); window.app.engine.player.enabled = true;
  const bd = run('bag_drill'); for (const h of [{ actor: 'lion', receiver: 'heavy' }, { actor: 'lion', receiver: 'heavy', blocked: true }, { actor: 'lion', receiver: 'platform' }]) D.bag_drill.imp(bd, h); assert.equal(bd.value, 1);
  const nb = run('night_bag'); D.night_bag.imp(nb, { actor: 'lion', receiver: 'heavy', impulse: 100, blocked: false }); D.night_bag.imp(nb, { actor: 'lion', receiver: 'heavy', impulse: 30, blocked: false }); assert.equal(nb.value, 1);
  const fp = run('fight_prep'); D.fight_prep.frame(fp, { defences: 2 }); assert.equal(fp.value, 2);
  window.app.lang = 'en'; assert.equal(OT.chapterTitle(1), 'Chapter 1 · The Dream'); assert.equal(OT.chapterTitle(2), 'Chapter 2 · Junior League');
  window.app.lang = 'he'; assert.ok(/החלום/.test(OT.chapterTitle(1)) && !/אף אחד/.test(OT.chapterTitle(1))); window.app.lang = 'ru'; assert.ok(/Мечта/.test(OT.chapterTitle(1))); window.app.lang = 'en';
}
console.log('adventure-oldtown ok');
