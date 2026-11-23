// Owner rules (2026-11-23, AGENTS.md "Languages"): nothing in the game is specific to one language, and the layout stays
// left-to-right in every language. Fails on a new single-language player-visible text (scripts/lang-audit.cjs: Hebrew or
// Russian without its twins, a {en,he,ru} table missing a language, English written straight into a visible place, static
// HTML text nobody translates), on any right-to-left layout ('rtl', [dir=rtl], direction:rtl), and on text tables whose
// Hebrew/Russian is missing or not written in that script (scripts/lang-data-audit.cjs). Deliberate cases: tests/lang-allow.json.
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const A = require('../scripts/lang-audit.cjs'), D = require('../scripts/lang-data-audit.cjs');
const allow = A.loadAllow();

// ---- every allow entry has a reason and still matches a finding (no stale permissions)
const found = A.audit();
for (const e of allow.entries) {
  assert.ok(e.reason && e.reason.length > 10, 'allow entry without a reason: ' + JSON.stringify(e));
  assert.ok(found.some(f => f.file === e.file && f.rule === e.rule && f.text.includes(e.match)), 'stale allow entry: ' + JSON.stringify(e));
}
// ---- no single-language text and no RTL layout in the audited files
const open = found.filter(f => !A.allowed(f, allow));
assert.deepEqual(open.map(f => `${f.file}:${f.line} [${f.rule}] ${f.text}`), [], 'single-language text or RTL layout (fix it in EN/HE/RU, or list a deliberate case in tests/lang-allow.json)');
assert.ok(!allow.entries.some(e => e.rule === 'rtl'), 'the layout is left-to-right in every language: no RTL exceptions');

// ---- the audit itself catches what it must (a guard against a silently weakened scanner)
const probe = (name, src) => { const f = path.join(root, 'tests', '.lang-probe-' + name + '.js'); fs.writeFileSync(f, src); try { return A.auditFile(path.relative(root, f)).map(x => x.rule); } finally { fs.unlinkSync(f); } };
assert.ok(probe('he', "const t={title:'שלום'};").includes('he-only'), 'a lone Hebrew text is found');
assert.ok(probe('ru', "x.textContent='Привет';").includes('ru-only'), 'a lone Russian text is found');
assert.ok(probe('map', "const W={en:{a:'Hi'},he:{a:'היי'}};").includes('lang-map'), 'a table without Russian is found');
assert.ok(probe('keys', "const W={en:{a:'Hi',b:'Go'},he:{a:'היי',b:'לך'},ru:{a:'Привет'}};").includes('lang-map'), 'a Russian table missing a key is found');
assert.ok(probe('sink', "b.textContent='Start the round';b.setAttribute('aria-label','Close menu');").filter(r => r === 'en-sink').length === 2, 'English into textContent / aria-label is found');
assert.ok(probe('tern', "b.textContent=on?'Freeze motion':'Play motion';").filter(r => r === 'en-sink').length === 2, 'English in a ternary is found');
assert.ok(probe('rtl', "d.dir=lang==='he'?'rtl':'ltr';").includes('rtl'), "a dialog set to 'rtl' is found");
assert.deepEqual(probe('ok', "const W={en:{a:'Hi'},he:{a:'היי'},ru:{a:'Привет'}};const L=(en,he,ru)=>({en,he,ru});const x=L('Go','לך','Иди');b.textContent=W[l].a;b.textContent=({he:'הקפאה',ru:'Стоп'})[l]||'Freeze';c.direction=l==='he'?'rtl':'ltr';"), [], 'translated text and canvas text direction pass');
const css = path.join(root, 'tests', '.lang-probe.css'); fs.writeFileSync(css, '[dir=rtl] .x{left:0}.y{direction:rtl}');
try { assert.equal(A.auditFile(path.relative(root, css)).filter(x => x.rule === 'rtl').length, 2, 'RTL CSS is found'); } finally { fs.unlinkSync(css); }

// ---- the page keeps html dir="ltr" in every language; Hebrew lines read right-to-left inside their own boxes
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<html lang="en" dir="ltr">/);
assert.match(html, /document\.documentElement\.dir = 'ltr';/, 'setLanguage keeps the page left-to-right');
assert.doesNotMatch(html, /documentElement\.dir\s*=\s*(dict|[a-z]+\s*===)/, 'no language-dependent page direction');
const tokens = fs.readFileSync(path.join(root, 'design-tokens.css'), 'utf8');
assert.match(tokens, /:lang\(he\) body \*\{unicode-bidi:plaintext\}/, 'Hebrew lines take their direction from their own text');
assert.match(tokens, /:lang\(he\) body\{text-align:left\}/, 'alignment does not change sides in Hebrew');
for (const f of A.listFiles().filter(f => f.endsWith('.css'))) assert.doesNotMatch(fs.readFileSync(path.join(root, f), 'utf8'), /text-align:\s*(start|end)\b/, f + ': start/end alignment would follow a Hebrew line to the right');

// ---- text tables loaded in Node: every {en} has he and ru in their own scripts
const data = D.audit();
assert.ok(data.loaded.filter(x => x[1] === 'ok').length >= D.MODULES.length - 1, 'text modules load: ' + JSON.stringify(data.loaded.filter(x => x[1] !== 'ok')));
assert.deepEqual(data.findings.map(f => `${f.where} [${f.rule}] ${f.text}`), [], 'text tables with a missing or untranslated language');

// ---- the coach-called chips and the pads follow glossary.js: Hook / Uppercut / Guard / Slip stay Latin, Straight is translated
const pad = fs.readFileSync(path.join(root, 'fighter-pad.js'), 'utf8'), town = fs.readFileSync(path.join(root, 'adventure/oldtown.js'), 'utf8');
assert.match(pad, /he:\{[^}]*straight:'ישרה',hook:'\\u2068Hook\\u2069',uppercut:'\\u2068Uppercut\\u2069',guard:'\\u2068Guard\\u2069'/);
assert.match(pad, /ru:\{[^}]*straight:'Прямой',hook:'Hook',uppercut:'Uppercut',guard:'Guard'/);
assert.match(town, /straight: L\('Straight', 'ישרה', 'Прямой'\)/);
console.log(`lang-generic: ok (${found.length} findings, ${found.length - open.length} allowed; ${data.loaded.length} text modules)`);
