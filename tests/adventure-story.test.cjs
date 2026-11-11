// Story layer (GOTR-0056): every chapter 1 mission and the boss have intro/outro lines in EN/HE/RU, at most two lines, known speakers.
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), G = require('../glossary.js'), S = require('../adventure/story.js');
const ids = [...A.missions.filter(m => m.chapter <= 2).map(m => m.id), 'brick', 'king_hyena'];
assert.deepEqual([...S.order].sort(), [...ids].sort(), 'story beats cover every chapter 1 and 2 mission and both bosses exactly once');
assert.deepEqual(S.beats.map(b => b.n), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
assert.equal(S.beatOf('roll_under_hook'), 4); assert.equal(S.beatOf('brick'), 5);
for (const id of ids) {
  const l = S.lines[id]; assert.ok(l && l.intro?.length && l.outro?.length, id + ' has intro and outro');
  for (const kind of ['intro', 'outro', 'lost']) for (const line of l[kind] || []) {
    assert.ok(S.who[line.who], 'speaker ' + line.who); assert.ok((l[kind] || []).length <= 2);
    for (const lang of ['en', 'he', 'ru']) { const t = line.text[lang]; assert.ok(t && t.length < 120, id + ' ' + lang); if (lang !== 'en') assert.ok(!/[A-Za-z]/.test(G.strip(t)), id + ' ' + lang + ' untranslated: ' + t); }
  }
}
for (const [k, w] of Object.entries(S.who)) for (const lang of ['he', 'ru']) assert.ok(!/[A-Za-z]/.test(w.name[lang]), k + ' name ' + lang);
assert.ok(S.lines.roll_under_hook.intro.some(l => l.who === 'dash'), 'Dash appears as a scene line in beat 4');
assert.deepEqual(S.journal(), [], 'no storage in node: empty journal');
console.log('adventure-story ok');
