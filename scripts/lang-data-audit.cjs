// Languages audit, data half (owner rule 2026-11-23): loads the game's text modules in Node and walks every exported
// value. Any {en: '…'} text must also have non-empty he and ru, Hebrew must be written in Hebrew letters (beyond the
// glossary.js terms, names and numbers) and Russian in Cyrillic. usage: node scripts/lang-data-audit.cjs
'use strict';
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const glossary = require(path.join(ROOT, 'glossary.js'));
// Modules that export their text tables to Node (module.exports; career-drills.js needs THREE and is covered by the static audit). The free walk (chapter1-roam*, street-walk) is audited elsewhere.
const MODULES = ['adventure/story-flow.js', 'adventure/story.js', 'adventure/story/story-core.js', 'adventure/story/market-core.js', 'adventure/story/dream-core.js',
  'adventure/story/docks-core.js', 'adventure/story/gym-return-core.js', 'adventure/story/call-core.js', 'adventure/story/trials-core.js', 'adventure/story/bag-break-core.js',
  'adventure/story/mop-core.js', 'adventure-progress.js', 'game-domain.js', 'game-tournament.js', 'game-world.js', 'game-venues.js', 'fight-iq.js', 'career-progress.js'];
const HE = /[֐-׿]/, RU = /[Ѐ-ӿ]/;
const latinLeft = s => /[A-Za-z]{2,}/.test(glossary.strip(String(s)).replace(/\{[^}]*\}/g, ' ').replace(/GLORY OF THE RING/gi, ' '));
function load(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return { error: 'missing' };
  global.window = global.window || {}; // some modules attach to window when module is missing
  try { delete require.cache[require.resolve(file)]; return { api: require(file) }; } catch (e) { return { error: e.message.split('\n')[0] }; }
}
function audit() {
  const out = [], seen = new WeakSet(), loaded = [];
  const walk = (v, where, depth) => {
    if (!v || typeof v !== 'object' || depth > 12 || seen.has(v)) return; seen.add(v);
    if (typeof v.en === 'string' && v.en.trim() && /\p{L}/u.test(v.en)) {
      for (const l of ['he', 'ru']) if (typeof v[l] !== 'string' || !v[l].trim()) out.push({ where, rule: 'missing-' + l, text: v.en.slice(0, 90) });
      if (typeof v.he === 'string' && v.he.trim() && !HE.test(v.he) && latinLeft(v.he)) out.push({ where, rule: 'he-not-hebrew', text: v.he.slice(0, 90) });
      if (typeof v.ru === 'string' && v.ru.trim() && !RU.test(v.ru) && latinLeft(v.ru)) out.push({ where, rule: 'ru-not-russian', text: v.ru.slice(0, 90) });
    }
    for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object') walk(x, where + '.' + k, depth + 1);
  };
  for (const rel of MODULES) { const r = load(rel); loaded.push([rel, r.error || 'ok']); if (r.api) walk(r.api, rel, 0); }
  return { findings: out, loaded };
}
module.exports = { audit, MODULES };
if (require.main === module) {
  const { findings, loaded } = audit();
  for (const [f, s] of loaded) if (s !== 'ok') console.log('not loaded', f, s);
  for (const f of findings) console.log(`${f.where}  [${f.rule}]  ${f.text}`);
  console.log(`\nlang-data-audit: ${findings.length} findings in ${loaded.filter(x => x[1] === 'ok').length}/${loaded.length} modules`);
}
