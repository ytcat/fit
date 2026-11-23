// Languages audit (owner rule 2026-11-23, AGENTS.md "Languages"): every player-visible text exists in EN, HE and RU
// and follows app.lang, including direction. This static scan reads the game's own JS/HTML/CSS (no dependencies) and
// lists text that is written in one language only:
//   he-only / ru-only   a Hebrew (Russian) literal with no Russian (Hebrew) sibling and no `he:` (`ru:`) key above it
//   lang-map            a {en,he,ru} object that lacks one language, or whose languages differ in keys/length
//   en-sink             an English literal written straight into a visible place (textContent, title, aria-label,
//                       placeholder, alt, createTextNode, innerHTML text, el(tag, class, 'Text') helpers)
//   rtl                 a right-to-left layout: 'rtl' set on an element, dir="rtl", [dir=rtl] / :dir(rtl) rules, CSS
//                       direction:rtl. The layout stays left-to-right in every language (owner, 2026-11-23); Hebrew lines
//                       read right-to-left inside their own boxes (design-tokens.css). Canvas text (ctx.direction) is text.
//   css-text            CSS `content:` with letters
// Terms the game keeps in English on purpose come from glossary.js (GOTR-0046); other deliberate cases are listed with
// a reason in tests/lang-allow.json. usage: node scripts/lang-audit.cjs [--json out.json] [--all] [files…]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
// The free walk is being rewritten by another agent (2026-11-23); it is audited there, not here.
const SKIP = [/^chapter1-roam\.html$/, /^adventure\/story\/chapter1-roam[^/]*$/, /^adventure\/story\/street-walk\.js$/,
  /^(tests|qa|tools|scripts|docs|modules|node_modules)\//, /vendor\//, /^adventure\/map-preview\.html$/];
const HE = /[֐-׿]/, RU = /[Ѐ-ӿ]/, LAT = /[A-Za-z]/;
const glossary = require(path.join(ROOT, 'glossary.js'));

function listFiles() {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const rel = d ? d + '/' + e.name : e.name; if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) { if (!SKIP.some(r => r.test(rel + '/'))) walk(rel); continue; }
    if (/\.(js|html|css)$/.test(e.name) && !SKIP.some(r => r.test(rel))) out.push(rel);
  } };
  walk(''); return out.sort();
}

// ---------- a small JS tokenizer: strings, template chunks, regexes, identifiers, punctuation (with offsets)
const KW_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const unescape = s => s.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\(.)/g, (m, a, b, c, d) => a || b || c ? String.fromCodePoint(parseInt(a || b || c, 16)) : d === 'n' ? '\n' : d === 't' ? '\t' : d);
function tokenize(src, base = 0) {
  const toks = [], stack = []; let i = 0; const n = src.length;
  const prevSig = () => toks[toks.length - 1];
  const regexOk = () => { const p = prevSig(); if (!p) return true; if (p.t === 'p') return !/^[)\]]$/.test(p.v); if (p.t === 'id') return KW_BEFORE_REGEX.has(p.v); return false; };
  const readTpl = () => { // at the char after ` or after the } that closes ${
    let s = '', st = i;
    while (i < n) { const c = src[i];
      if (c === '\\') { s += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { toks.push({ t: 's', q: '`', raw: s, v: unescape(s), a: base + st, b: base + i }); i++; return; }
      if (c === '$' && src[i + 1] === '{') { toks.push({ t: 's', q: '`', raw: s, v: unescape(s), a: base + st, b: base + i, open: true }); toks.push({ t: 'p', v: '${', a: base + i }); i += 2; stack.push('tpl'); return; }
      s += c; i++; }
  };
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '\'' || c === '"') { let j = i + 1, s = ''; while (j < n && src[j] !== c) { if (src[j] === '\\') { s += src.slice(j, j + 2); j += 2; continue; } if (src[j] === '\n') break; s += src[j++]; } toks.push({ t: 's', q: c, raw: s, v: unescape(s), a: base + i, b: base + j }); i = j + 1; continue; }
    if (c === '`') { i++; readTpl(); continue; }
    if (c === '/' && regexOk()) { let j = i + 1, cls = false; while (j < n) { const d = src[j]; if (d === '\\') { j += 2; continue; } if (d === '\n') break; if (cls) { if (d === ']') cls = false; } else if (d === '[') cls = true; else if (d === '/') break; j++; } j++; while (j < n && /[a-z]/.test(src[j])) j++; toks.push({ t: 'r', v: src.slice(i, j), a: base + i }); i = j; continue; }
    if (/[A-Za-z_$À-￿]/.test(c)) { let j = i + 1; while (j < n && /[\w$À-￿]/.test(src[j])) j++; toks.push({ t: 'id', v: src.slice(i, j), a: base + i }); i = j; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) { let j = i + 1; while (j < n && /[\w.]/.test(src[j])) j++; toks.push({ t: 'n', v: src.slice(i, j), a: base + i }); i = j; continue; }
    if (c === '{') { stack.push('{'); toks.push({ t: 'p', v: '{', a: base + i }); i++; continue; }
    if (c === '}') { const top = stack.pop(); toks.push({ t: 'p', v: '}', a: base + i }); i++; if (top === 'tpl') readTpl(); continue; }
    const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
    const op = ['===', '!==', '...', '**=', '>>>', '<<=', '>>=', '&&=', '||=', '??='].includes(three) ? three : ['=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '**', '<<', '>>'].includes(two) ? two : c;
    toks.push({ t: 'p', v: op, a: base + i }); i += op.length;
  }
  return toks;
}

// ---------- groups: (), [], {}, ${} with their tokens; object entries carry their key
function build(toks) {
  const root = { kind: 'root', items: [], parent: null }; let g = root;
  for (const t of toks) {
    if (t.t === 'p' && (t.v === '(' || t.v === '[' || t.v === '{' || t.v === '${')) {
      const ng = { kind: t.v, items: [], parent: g, a: t.a }, it = g.items, n1 = it[it.length - 1], n2 = it[it.length - 2], n3 = it[it.length - 3];
      // W.he = {…} / Object.assign(words.he, {…}) / W['he'] = […]: the group is that language's
      if (n1 && n1.t === 'p' && (n1.v === '=' || n1.v === ',') && n2 && (n2.t === 'id' || n2.t === 's') && LANGS.includes(n2.v) && n3 && n3.t === 'p' && n3.v === '.') ng.key = n2.v;
      if (n1 && n1.t === 'p' && (n1.v === '=' || n1.v === ',') && n2 && n2.items && n2.kind === '[' && n2.items.length === 1 && n2.items[0].t === 's' && LANGS.includes(n2.items[0].v)) ng.key = n2.items[0].v;
      g.items.push(ng); g = ng; continue; }
    if (t.t === 's' && LANGS.includes(t.v) && g.kind === '[' && g.items.length === 0) g.key = t.v; // ['he', …] rows
    if (t.t === 'p' && (t.v === ')' || t.v === ']' || t.v === '}')) { if (g.parent) g = g.parent; continue; }
    t.g = g; g.items.push(t);
  }
  // entries of {} groups: key ':' value up to ','
  const visit = grp => {
    if (grp.kind === '{') {
      const it = grp.items; let start = 0, keyed = 0, entries = [];
      for (let k = 0; k <= it.length; k++) {
        const x = it[k];
        if (k === it.length || (x.t === 'p' && x.v === ',')) {
          const seg = it.slice(start, k);
          if (seg.length >= 3 && (seg[0].t === 'id' || seg[0].t === 's' || seg[0].t === 'n') && seg[1].t === 'p' && seg[1].v === ':') { keyed++; entries.push({ key: seg[0].v, value: seg.slice(2) }); }
          else if (seg.length === 1 && seg[0].t === 'id') entries.push({ key: seg[0].v, value: null, shorthand: true });
          else if (seg.length) entries.push({ key: null, value: seg });
          start = k + 1;
        }
      }
      grp.isObject = keyed > 0 && keyed >= entries.filter(e => e.key == null).length; grp.entries = entries;
      if (grp.isObject) for (const e of entries) if (e.key != null && e.value) for (const v of e.value) if (!v.key) v.key = e.key;
    }
    for (const x of grp.items) if (x.items) visit(x);
  };
  visit(root); return root;
}
const LANGS = ['en', 'he', 'ru'];
const descend = function* (items) { for (const x of items) { if (x.items) yield* descend(x.items); else yield x; } };
// The statement (or argument list / array / object value) that holds a token: the place to look for its translations.
function segmentOf(t) {
  let g = t.g, node = t;
  // climb through template ${} and small wrapping groups
  const parentItem = x => { const p = x.parent || x.g; return p; };
  for (;;) {
    if (g.kind === '{' && g.isObject) { // the value of its entry
      const e = g.entries.find(e => e.value && e.value.includes(node)); if (e) return e.value;
      return g.items;
    }
    if (g.kind === '{' || g.kind === 'root') { // a block: the statement around it
      const it = g.items, k = it.indexOf(node); let a = k, b = k;
      while (a > 0 && !(it[a - 1].t === 'p' && it[a - 1].v === ';')) a--;
      while (b < it.length - 1 && !(it[b + 1].t === 'p' && it[b + 1].v === ';')) b++;
      return it.slice(a, b + 1);
    }
    if (g.kind === '${' || g.kind === '(') { // an expression: widen to the enclosing statement or call
      const up = g.parent; if (!up) return g.items; node = g; g = up;
      if (g.kind === '(' || g.kind === '[') return g.items; continue;
    }
    return g.items; // [ ] array
  }
}
function keyPath(t) { const keys = []; if (t.key) keys.push(t.key); let g = t.g; while (g) { if (g.key) keys.push(g.key); g = g.parent; } return keys; }
// mark keys on groups too
function markGroupKeys(root) { const visit = g => { if (g.isObject) for (const e of g.entries) if (e.value) for (const v of e.value) if (v.items && !v.key) v.key = e.key; for (const x of g.items) if (x.items) visit(x); }; visit(root); }

const isHe = k => k === 'he' || k === 'iw', isRu = k => k === 'ru';
const visibleLatin = s => { const t = glossary.strip(String(s)).replace(/\$\{[^}]*\}/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/<[^>]*>/g, ' '); return /[A-Za-z]{2,}/.test(t) || /\b[A-Za-z]\b/.test(t) && /\s/.test(t.trim()); };
const lineOf = (src, a) => src.slice(0, a).split('\n').length;

function auditJs(file, src, base = 0, whole = src) {
  const out = [], toks = tokenize(src, base), root = build(toks); markGroupKeys(root);
  const add = (rule, t, text, extra) => out.push({ file, line: lineOf(whole, t.a), rule, text: String(text).replace(/\s+/g, ' ').trim().slice(0, 100), ...extra });
  for (const t of toks) {
    if (t.t !== 's') continue; const v = t.v;
    if (HE.test(v) || RU.test(v)) {
      const he = HE.test(v), ru = RU.test(v), keys = keyPath(t);
      const okKey = he ? keys.some(isHe) : keys.some(isRu);
      if (!okKey) {
        const seg = segmentOf(t); let other = false;
        for (const x of descend(seg)) if (x.t === 's' && x !== t && (he ? RU.test(x.v) : HE.test(x.v))) { other = true; break; }
        if (!other && !(he && ru)) add(he ? 'he-only' : 'ru-only', t, v);
      }
    }
  }
  // language maps: {en,he,ru} complete, same keys / lengths
  const shape = v => { if (!v || !v.length) return null; const x = v[0]; if (v.length === 1 && x.items && x.kind === '{' && x.isObject) return { obj: x }; if (v.length === 1 && x.items && x.kind === '[') return { arr: x }; return null; };
  const keysOf = g => g.entries.filter(e => e.key != null).map(e => e.key);
  const arrLen = g => g.items.filter(x => x.t === 'p' && x.v === ',').length + (g.items.length ? 1 : 0) - (g.items.length && g.items[g.items.length - 1].t === 'p' && g.items[g.items.length - 1].v === ',' ? 1 : 0);
  const visit = g => {
    if (g.isObject) {
      const ks = keysOf(g), have = LANGS.filter(l => ks.includes(l));
      const langish = have.length >= 2 || (have.length === 1 && have[0] !== 'en' && ks.length <= 2);
      if (langish && have.length < 3) {
        const anyText = g.entries.some(e => e.value && LANGS.includes(e.key) && [...descend(e.value)].some(x => x.t === 's' && /\p{L}/u.test(x.v)));
        if (anyText) out.push({ file, line: lineOf(whole, g.a), rule: 'lang-map', text: `missing ${LANGS.filter(l => !have.includes(l)).join(',')} (has ${have.join(',')})` });
      }
      if (have.length === 3) {
        const val = l => g.entries.find(e => e.key === l).value, sh = LANGS.map(l => shape(val(l)));
        if (sh.every(s => s && s.obj)) {
          const sets = sh.map(s => new Set(keysOf(s.obj))), all = new Set(sets.flatMap(s => [...s]));
          const miss = LANGS.map((l, i) => [l, [...all].filter(k => !sets[i].has(k))]).filter(([, m]) => m.length);
          if (miss.length) out.push({ file, line: lineOf(whole, g.a), rule: 'lang-map', text: miss.map(([l, m]) => `${l} lacks ${m.slice(0, 6).join(',')}${m.length > 6 ? '…' : ''}`).join('; ') });
        } else if (sh.every(s => s && s.arr)) {
          const lens = sh.map(s => arrLen(s.arr)); if (new Set(lens).size > 1) out.push({ file, line: lineOf(whole, g.a), rule: 'lang-map', text: `array lengths en/he/ru ${lens.join('/')}` });
        }
      }
    }
    for (const x of g.items) if (x.items) visit(x);
  };
  visit(root);
  // Object.assign(words.he, {…}) next to Object.assign(words.ru, {…}): the same keys in every language given
  const assigns = new Map();
  for (let k = 0; k + 6 < toks.length; k++) {
    if (toks[k].v !== 'Object' || toks[k + 1].v !== '.' || toks[k + 2].v !== 'assign' || toks[k + 3].v !== '(') continue;
    let j = k + 4, base = ''; while (j < toks.length && toks[j].v !== ',' && toks[j].v !== ')' && j < k + 12) base += toks[j++].v;
    const m = base.match(/^(.*)\.(en|he|ru)$/); if (!m || toks[j].v !== ',' || toks[j + 1].v !== '{') continue;
    const grp = toks[j + 1].g?.items?.find(x => x.items && x.a === toks[j + 1].a); if (!grp || !grp.isObject) continue;
    if (!assigns.has(m[1])) assigns.set(m[1], {}); const rec = assigns.get(m[1]); rec[m[2]] = rec[m[2]] || { keys: new Set(), a: toks[k].a }; for (const e of grp.entries) if (e.key != null) rec[m[2]].keys.add(e.key);
  }
  for (const [base, rec] of assigns) {
    const langs = LANGS.filter(l => rec[l]); if (langs.length === 3 || (langs.length === 2 && !langs.includes('en'))) {
      const all = new Set(langs.flatMap(l => [...rec[l].keys]));
      for (const l of langs) { const miss = [...all].filter(x => !rec[l].keys.has(x)); if (miss.length) out.push({ file, line: lineOf(whole, rec[l].a), rule: 'lang-map', text: `Object.assign(${base}.${l}) lacks ${miss.slice(0, 6).join(',')}${miss.length > 6 ? '…' : ''}` }); }
    } else if (langs.length === 1 && langs[0] !== 'en') out.push({ file, line: lineOf(whole, rec[langs[0]].a), rule: 'lang-map', text: `Object.assign(${base}.${langs[0]}) has no ${LANGS.filter(l => l !== 'en' && l !== langs[0]).join(',')} twin` });
  }
  // L(en, he, ru) with a language missing
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k]; if (t.t !== 'id' || t.v !== 'L' || toks[k + 1]?.v !== '(' || toks[k - 1]?.v === '.' || toks[k - 1]?.v === 'const' || toks[k - 1]?.v === 'function') continue;
    const grp = t.g.items[t.g.items.indexOf(t) + 1]; if (!grp || !grp.items) continue;
    const args = grp.items.filter(x => x.t === 'p' && x.v === ',').length + 1, strs = grp.items.filter(x => x.t === 's');
    if (strs.length && args !== 3 && strs.some(x => /\p{L}/u.test(x.v))) add('lang-map', t, `L() with ${args} argument(s): ${strs[0].v}`);
  }
  // English-only display data: {title: 'Night shift'} with no language around it
  const DATA_KEYS = new Set(['title', 'label', 'text', 'hint', 'caption', 'line', 'note', 'tip', 'help', 'msg', 'message', 'desc', 'description', 'subtitle', 'button', 'cta', 'goal', 'aria', 'heading', 'toast', 'body', 'say', 'sub', 'prompt', 'question', 'answer', 'blurb', 'lead', 'detail', 'name']);
  for (const t of toks) {
    if (t.t !== 's' || !t.key || !DATA_KEYS.has(t.key) || HE.test(t.v) || RU.test(t.v) || !/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(glossary.strip(t.v))) continue;
    if (t.key === 'name' && !/\s[a-z]/.test(t.v)) continue; // proper names (people, places) stay as they are
    const keys = keyPath(t); if (keys.some(k => LANGS.includes(k))) continue;
    const seg = segmentOf(t); if ([...descend(seg)].some(x => x.t === 's' && (HE.test(x.v) || RU.test(x.v)))) continue;
    const ent = t.g.entries?.find(e => e.value && e.value.includes(t)); if (ent && ent.value.length !== 1) continue; // a whole literal value only
    add('en-data', t, `${t.key}: ${t.v}`);
  }
  // a right-to-left layout
  for (const t of toks) {
    if (t.t !== 's') continue;
    if (t.v === 'rtl') { const seg = segmentOf(t); if (![...descend(seg)].some(x => x.t === 'id' && x.v === 'direction')) add('rtl', t, `'rtl' in ${[...descend(seg)].filter(x => x.t === 'id').slice(0, 4).map(x => x.v).join('.')}`); }
    else if (/\[dir=["']?rtl|:dir\(rtl\)|direction\s*:\s*rtl|\sdir\s*=\s*["']?rtl/.test(t.v)) add('rtl', t, t.v.match(/.{0,30}(\[dir=["']?rtl|:dir\(rtl\)|direction\s*:\s*rtl|dir\s*=\s*["']?rtl).{0,30}/)[0]);
  }
  // English straight into a visible place
  const SINK_PROPS = new Set(['textContent', 'innerText', 'title', 'placeholder', 'alt', 'ariaLabel', 'innerHTML', 'label']);
  const SINK_ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'data-label']);
  const HELPERS = new Set(['el', 'mk', 'make', 'h', 'node', 'tag', 'div', 'elem', 'createEl', 'button']);
  const english = t => t && t.t === 's' && visibleLatin(t.v) && !HE.test(t.v) && !RU.test(t.v);
  const htmlText = s => s.replace(/<[^>]*>/g, ' ');
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    // x.textContent = 'Text'  /  x.title = 'Text'
    if (t.t === 'id' && SINK_PROPS.has(t.v) && toks[k - 1]?.v === '.' && (toks[k + 1]?.v === '=' || toks[k + 1]?.v === '+=')) {
      const val = toks[k + 2], next = toks[k + 3];
      const whole1 = !next || next.t === 'p' && /^[;,)}\]]$/.test(next.v) || next.t === 'id';
      if (val && val.t === 's' && whole1) {
        const text = t.v === 'innerHTML' ? htmlText(val.v) : val.v;
        if (t.v === 'label' && !/\s/.test(text)) continue;
        if (visibleLatin(text) && !HE.test(text) && !RU.test(text)) add('en-sink', val, `${t.v} = ${text}`);
      }
    }
    // setAttribute('aria-label', 'Text')
    if (t.t === 'id' && t.v === 'setAttribute' && toks[k + 1]?.v === '(') {
      const name = toks[k + 2], val = toks[k + 4], close = toks[k + 5];
      if (name?.t === 's' && toks[k + 3]?.v === ',' && val?.t === 's' && close?.v === ')') {
        if (SINK_ATTRS.has(name.v) && english(val)) add('en-sink', val, `${name.v}: ${val.v}`);
      }
    }
    // document.createTextNode('Text')
    if (t.t === 'id' && t.v === 'createTextNode' && toks[k + 1]?.v === '(' && english(toks[k + 2]) && toks[k + 3]?.v === ')') add('en-sink', toks[k + 2], toks[k + 2].v);
    // el('tag', 'class', 'Text') helpers
    if (t.t === 'id' && HELPERS.has(t.v) && toks[k + 1]?.v === '(' && toks[k - 1]?.v !== '.' && toks[k - 1]?.v !== 'function') {
      const a = toks[k + 2], c1 = toks[k + 3], b2 = toks[k + 4], c2 = toks[k + 5], txt = toks[k + 6], end = toks[k + 7];
      if (a?.t === 's' && /^[a-z][a-z0-9-]*$/.test(a.v) && c1?.v === ',' && (b2?.t === 's') && c2?.v === ',' && english(txt) && (end?.v === ')' || end?.v === ',')) add('en-sink', txt, txt.v);
    }
    // an HTML string with dir/lang fixed, or English text between tags
    if (t.t === 's' && /<\/?(div|span|p|b|i|em|strong|small|button|label|h[1-6]|li|ul|ol|a|section|header|footer|article|figure|figcaption|img|svg|dialog|form|input|select|option|details|summary|table|tr|td|th|br|kbd|mark|output|progress|meter|nav|aside|main|text|tspan|title)\b[^>]*>/i.test(t.v)) {
      const text = t.v.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]*>/g, '\u0000').split('\u0000').map(s => s.trim()).filter(s => s && visibleLatin(s) && !HE.test(s) && !RU.test(s) && !/^[\w-]+=/.test(s));
      for (const s of text) add('en-sink', t, `markup text: ${s}`);
    }
  }
  return out;
}

function auditCss(file, src) {
  const out = [], clean = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  for (const m of clean.matchAll(/(^|[;{\s])direction\s*:\s*rtl|\[dir=["']?rtl|:dir\(rtl\)/g)) out.push({ file, line: lineOf(clean, m.index), rule: 'rtl', text: m[0].trim() });
  for (const m of clean.matchAll(/content\s*:\s*(["'])((?:\\.|(?!\1).)*)\1/g)) { const s = m[2]; if (HE.test(s) || RU.test(s) || visibleLatin(s)) out.push({ file, line: lineOf(clean, m.index), rule: 'css-text', text: `content: "${s}"` }); }
  return out;
}

function auditHtml(file, src) {
  const out = [];
  // inline scripts
  for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) if (m[1].trim()) out.push(...auditJs(file, m[1], m.index + m[0].indexOf('>') + 1, src));
  for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) out.push(...auditCss(file, m[1]).map(f => ({ ...f, line: f.line + lineOf(src, m.index) - 1 })));
  const markup = src.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, m => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  for (const m of markup.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(), attrs = m[2];
    for (const a of attrs.matchAll(/\sdir\s*=\s*["']?rtl/g)) out.push({ file, line: lineOf(src, m.index), rule: 'rtl', text: `<${tag} dir="rtl">` });
    for (const a of attrs.matchAll(/\s(aria-label|title|placeholder|alt)\s*=\s*"([^"]*)"/g)) if (tag !== 'meta' && tag !== 'link' && (visibleLatin(a[2]) || HE.test(a[2]) || RU.test(a[2]))) out.push({ file, line: lineOf(src, m.index), rule: 'html-attr', text: `<${tag} ${a[1]}="${a[2]}">`, id: (attrs.match(/\sid\s*=\s*"([^"]+)"/) || [])[1] || null });
  }
  // static text between tags (index.html replaces some of it at start; the browser sweep checks what stays)
  const body = markup.slice(Math.max(0, markup.search(/<body\b/i)));
  const off = markup.length - body.length;
  for (const m of body.matchAll(/>([^<>]+)</g)) {
    const s = m[1].replace(/\s+/g, ' ').trim(); if (!s || /^&[a-z]+;$/.test(s)) continue;
    if (visibleLatin(s) || HE.test(s) || RU.test(s)) {
      const before = body.slice(0, m.index + 1), tagm = before.match(/<([a-z][\w-]*)\b([^>]*)>$/i);
      out.push({ file, line: lineOf(src, off + m.index), rule: 'html-text', text: s.slice(0, 100), id: tagm && (tagm[2].match(/\sid\s*=\s*"([^"]+)"/) || [])[1] || null });
    }
  }
  return out;
}

function auditFile(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (rel.endsWith('.css')) return auditCss(rel, src);
  if (rel.endsWith('.html')) return auditHtml(rel, src);
  return auditJs(rel, src);
}
const fingerprint = f => `${f.file}|${f.rule}|${f.text}`;
function audit(files = listFiles()) { const all = []; for (const f of files) all.push(...auditFile(f)); return all; }
function loadAllow() { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/lang-allow.json'), 'utf8')); } catch { return { entries: [] }; } }
// An allow entry: {file, rule, match (substring of the finding's text), reason}
function allowed(f, allow) { return allow.entries.some(e => e.file === f.file && e.rule === f.rule && f.text.includes(e.match)); }

module.exports = { audit, auditFile, listFiles, tokenize, fingerprint, loadAllow, allowed };
if (require.main === module) {
  const args = process.argv.slice(2), jsonAt = args.indexOf('--json'), jsonOut = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;
  const all = args.includes('--all'); const files = args.filter(a => !a.startsWith('--'));
  const found = audit(files.length ? files : undefined), allow = loadAllow();
  const open = found.filter(f => all || !allowed(f, allow));
  const by = {}; for (const f of open) by[f.rule] = (by[f.rule] || 0) + 1;
  for (const f of open) console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.text}${f.id ? '  #' + f.id : ''}`);
  console.log(`\nlang-audit: ${open.length} findings${all ? '' : ` (${found.length - open.length} allowed)`} ${JSON.stringify(by)}`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ total: open.length, byRule: by, allowed: found.length - open.length, findings: open }, null, 1) + '\n');
}
