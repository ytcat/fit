// Story layer (GOTR-0056): every chapter 1 mission and the boss have intro/outro lines in EN/HE/RU, at most two lines, known speakers.
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), G = require('../glossary.js'), S = require('../adventure/story.js');
// GOTR-0078: chapter 1 is "The Dream" (13 beats + side job A); the older chapter-1 missions are kept as legacy lines.
const dream = [...A.dreamSteps, 'clean_gym'], legacy = ['first_stance', 'one_two_mitts', 'heavy_bag_van', 'bag_power', 'snoring_guard', 'teach_the_kid', 'roll_under_hook', 'rope_rhythm', 'morning_sparring'];
const ids = [...dream, ...A.missions.filter(m => m.chapter === 2).map(m => m.id), 'king_hyena', ...legacy];
assert.deepEqual([...S.order].sort(), [...dream, ...A.missions.filter(m => m.chapter === 2).map(m => m.id), 'king_hyena'].sort(), 'story beats cover every Dream step, every chapter 2 mission and King Hyena exactly once');
assert.deepEqual([...S.legacy].sort(), [...legacy].sort()); assert.ok(A.missions.filter(m => m.chapter === 1).every(m => S.order.includes(m.id) || S.legacy.includes(m.id)));
assert.deepEqual(S.beats.map(b => b.n), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
assert.equal(S.beatOf('first_brick'), 1); assert.equal(S.beatOf('brick'), 5); assert.equal(S.beatOf('kids_skateboard'), 2);
for (const id of ids) {
  const l = S.lines[id]; assert.ok(l && l.intro?.length && l.outro?.length, id + ' has intro and outro');
  for (const kind of Object.keys(l)) for (const line of l[kind] || []) {
    assert.ok(S.who[line.who], 'speaker ' + line.who); assert.ok((l[kind] || []).length <= 2);
    for (const lang of ['en', 'he', 'ru']) { const t = line.text[lang]; assert.ok(t && t.length < 120, id + ' ' + lang); if (lang !== 'en') assert.ok(!/[A-Za-z]/.test(G.strip(t)), id + ' ' + lang + ' untranslated: ' + t); }
  }
}
for (const [k, w] of Object.entries(S.who)) for (const lang of ['he', 'ru']) assert.ok(!/[A-Za-z]/.test(w.name[lang]), k + ' name ' + lang);
assert.ok(S.lines.roll_under_hook.intro.some(l => l.who === 'dash'), 'Dash appears as a scene line in the old beat 4');
assert.equal(S.pick('brick', 'intro', 'won')[0], S.lines.brick.intro_won[0]); assert.equal(S.pick('brick', 'intro', null)[0], S.lines.brick.intro[0]); assert.equal(S.pick('brick', 'outro', 'won')[0], S.lines.brick.outro[0], 'no variant: the default');
assert.deepEqual(S.journal(), [], 'no storage in node: empty journal');
console.log('adventure-story ok');
