// Story mode (GOTR-0069): ordered steps, one current step, locking, unlock on completion, old-save migration, boss gate advice,
// and the story text in EN/HE/RU (boxing terms stay English).
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), G = require('../glossary.js');
window.AdventureProgress = A;
const F = require('../adventure/story-flow.js');
const g0 = () => ({ adventure: A.fresh() });
const rec = (g, id, value) => A.recordMission(g, id, value, true);

// Ordering: every chapter 1-2 mission except the unplayable First stance is a step exactly once; the boss is the last main step.
{
  const ids = [1, 2].flatMap(n => F.all(n).map(s => s.id));
  assert.equal(new Set(ids).size, ids.length, 'no duplicate steps');
  for (const m of A.missions.filter(x => x.chapter <= 2 && x.id !== 'first_stance')) assert.ok(ids.includes(m.id), m.id + ' is a step');
  assert.equal(F.state(g0(), 1).boss.id, 'brick'); assert.equal(F.state(g0(), 2).boss.id, 'king_hyena');
  assert.deepEqual(F.state(g0(), 1).main.map(s => s.id), ['one_two_mitts', 'heavy_bag_van', 'bag_power', 'snoring_guard', 'teach_the_kid', 'roll_under_hook', 'morning_sparring', 'brick']);
  assert.deepEqual(F.state(g0(), 2).main.map(s => s.id), ['curb_footwork', 'clean_hands', 'kids_skateboard', 'rooftop_balloons', 'whistle_chase', 'grandma_groceries', 'crowd_circle', 'king_hyena']);
  for (const n of [1, 2]) for (const s of F.all(n).filter(x => x.side)) assert.ok(F.all(n).some(m => m.id === s.after && !m.side), s.id + ' follows a main step');
}
// A fresh profile: step 1 is the only current step, everything after it is locked and not startable; chapter 2 is locked.
{
  const g = g0(), st = F.state(g, 1);
  assert.equal(st.current.id, 'one_two_mitts'); assert.equal(st.current.n, 1); assert.equal(st.total, 8);
  assert.equal(st.main.filter(s => s.status === 'current').length, 1);
  assert.ok(st.main.slice(1).every(s => s.status === 'locked'));
  assert.ok(st.side.every(s => s.status === 'hidden'), 'side steps appear later');
  assert.equal(F.playable(g, 'one_two_mitts'), true); assert.equal(F.playable(g, 'bag_power'), false); assert.equal(F.playable(g, 'brick'), false);
  assert.equal(F.chapterOpen(g, 2), false); assert.ok(F.state(g, 2).main.every(s => s.status === 'locked'));
}
// Finishing a step with at least one star unlocks the next; zero stars unlocks nothing; replay stays possible.
{
  const g = g0();
  rec(g, 'one_two_mitts', 5); assert.equal(F.state(g, 1).current.id, 'one_two_mitts', 'no star: still current');
  rec(g, 'one_two_mitts', 8); const st = F.state(g, 1);
  assert.equal(st.main[0].status, 'done'); assert.equal(st.main[0].stars, 1); assert.equal(st.current.id, 'heavy_bag_van'); assert.equal(st.doneCount, 1);
  assert.equal(F.playable(g, 'one_two_mitts'), true, 'finished steps can be replayed');
  assert.equal(F.nextAfter(g, 'one_two_mitts'), 'heavy_bag_van');
  assert.deepEqual(F.unlocks('one_two_mitts'), { next: 'heavy_bag_van', side: [], extra: F.find('one_two_mitts').unlock });
  assert.deepEqual(F.unlocks('teach_the_kid').side, ['rope_rhythm'], 'the side step appears after Pip\'s nephew');
  for (const id of ['heavy_bag_van', 'bag_power', 'snoring_guard']) rec(g, id, A.missions.find(m => m.id === id).thresholds[0]);
  assert.equal(F.state(g, 1).side[0].status, 'hidden');
  rec(g, 'teach_the_kid', 1); const s2 = F.state(g, 1);
  assert.equal(s2.side[0].status, 'open'); assert.equal(s2.current.id, 'roll_under_hook'); assert.equal(F.playable(g, 'rope_rhythm'), true);
  assert.deepEqual(s2.timeline.map(s => s.id).slice(4, 7), ['teach_the_kid', 'rope_rhythm', 'roll_under_hook'], 'the side step sits after the step it follows');
  assert.equal(F.unlocks('brick').next, 'curb_footwork', 'the boss opens the next chapter');
}
// Save migration: an old save (everything was open) keeps every finished step; the current step is the first unfinished one.
{
  const g = g0(); rec(g, 'one_two_mitts', 20); rec(g, 'morning_sparring', 10); rec(g, 'curb_footwork', 5);
  const st = F.state(g, 1);
  assert.equal(st.main.find(s => s.id === 'morning_sparring').status, 'done', 'a later finished step stays finished');
  assert.equal(st.current.id, 'heavy_bag_van');
  assert.equal(F.chapterOpen(g, 2), true, 'a chapter 2 step finished in an old save keeps chapter 2 open');
  assert.equal(F.state(g, 2).main[0].status, 'done'); assert.equal(F.state(g, 2).current.id, 'clean_hands');
  assert.deepEqual(F.journal(g).map(j => j.id), ['one_two_mitts', 'morning_sparring', 'curb_footwork'], 'Story so far: finished steps in story order');
}
// Boss gate: below Brick's entry level the advice names the level, the missing stars and the steps to replay.
{
  const g = g0();
  for (const s of F.state(g, 1).main.filter(s => !s.boss)) rec(g, s.id, A.missions.find(m => m.id === s.id).thresholds[0]);
  const st = F.state(g, 1); assert.equal(st.current.id, 'brick');
  const gt = F.gate(g, 1); assert.equal(A.level(g), 2); assert.equal(gt.need, 5); assert.equal(gt.level, 2); assert.equal(gt.ready, true);
  assert.equal(gt.stars, F.starsToLevel(g, 5)); assert.equal(gt.stars, 8, '7 stars now; 15 stars = Level 5');
  assert.equal(gt.steps.length, 2); assert.ok(gt.steps.every(id => F.playable(g, id)));
  rec(g, 'rope_rhythm', 30); // 3 stars + a Stamina point
  assert.ok(F.starsToLevel(g, 5) < 8);
  const g2 = g0(); for (const m of A.missions.filter(x => x.chapter === 1 && x.id !== 'first_stance')) rec(g2, m.id, m.thresholds[2]);
  assert.equal(F.gate(g2, 1), null, 'enough level: no gate');
  A.recordBoss(g2, 'brick', true, false);
  assert.equal(F.state(g2, 1).complete, true); assert.equal(F.chapterOpen(g2, 2), true); assert.equal(F.nextAfter(g2, 'brick'), 'curb_footwork');
  assert.equal(F.state(g2, 2).current.id, 'curb_footwork');
}
// Text: every step has a title, a why (1-2 sentences) and a recap in EN/HE/RU; HE/RU keep only the glossary terms in Latin.
const latin = t => /[A-Za-z]/.test(G.strip(String(t).replace(/\{\w+\}/g, '')));
for (const n of [1, 2]) for (const s of F.all(n)) for (const k of ['title', 'why', 'recap', 'unlock']) {
  if (!s[k]) { assert.notEqual(k, 'title'); continue; }
  for (const lang of ['en', 'he', 'ru']) { const t = s[k][lang]; assert.ok(t && t.length < 240, s.id + ' ' + k + ' ' + lang); if (lang !== 'en') assert.ok(!latin(t), s.id + ' ' + k + ' ' + lang + ': ' + t); }
  if (k === 'why') assert.ok(s.why.en.split(/[.!?]["”]?\s/).length <= 3, s.id + ' why is 1-2 sentences');
}
for (const lang of ['he', 'ru']) {
  for (const [k, v] of Object.entries(F.copy[lang])) assert.ok(!latin(v), lang + ' ' + k + ': ' + v);
  for (const k of Object.keys(F.copy.en)) assert.ok(k in F.copy[lang], lang + ' is missing ' + k);
  for (const c of Object.values(F.react)) for (const v of Object.values(c)) assert.ok(!latin(v[lang]), v[lang]);
  for (const v of Object.values(F.opener)) assert.ok(!latin(v[lang]), v[lang]);
}
assert.equal(F.fill(F.copy.en.gate, { n: 5, l: 3, k: 6, list: 'step 2 or step 4' }), 'Level 5 needed, you are 3: earn 6 more stars. Replay step 2 or step 4.');
console.log('story-flow ok');
