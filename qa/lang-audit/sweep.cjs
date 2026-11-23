// Languages sweep (owner rule 2026-11-23): opens the game at 402x690 (touch) in EN, HE and RU, walks the main screens
// and lists every visible text, aria-label, title and placeholder that is not in the active language:
//   EN: Hebrew or Cyrillic letters;  HE: Latin (beyond glossary.js terms) or Cyrillic;  RU: Latin (beyond terms) or Hebrew.
// It also lists direction faults (Hebrew text laid out left-to-right, RTL boxes in EN/RU) and text boxes that leave the
// screen. Screenshots of the main screens go to <out>/<lang>-<screen>.png.
// usage: node qa/lang-audit/sweep.cjs [root=repo] [out=qa/lang-audit/after] [langs=en,he,ru] [screens=a,b,...]
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../..')), out = path.resolve(process.argv[3] || path.join(__dirname, 'after'));
const langs = (process.argv[4] || 'en,he,ru').split(','), only = (process.argv[5] || '').split(',').filter(Boolean);
const GLOSSARY = require(path.join(root, 'glossary.js')).terms;
const TYPED = ['QA']; // the player name typed on the welcome card
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const serve = () => new Promise(res => { const s = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1', () => res(s)); });
const wait = ms => new Promise(r => setTimeout(r, ms));

// Runs in the page: what the player sees that is not in `lang`.
function collect([lang, typed, terms]) {
  const HE = /[֐-׿]/, RU = /[Ѐ-ӿ]/;
  const strip = t => { let s = t.replace(/[⁦-⁩‎‏]/g, '').replace(/\bv?\d+(\.\d+)+\b/g, ''); for (const name of [...typed, ...terms]) s = s.split(name).join(' '); return s; };
  const foreign = t => { const s = strip(t); if (lang === 'en') return HE.test(s) || RU.test(s); if (lang === 'he') return /[A-Za-z]/.test(s) || RU.test(s); return /[A-Za-z]/.test(s) || HE.test(s); };
  const shown = el => { if (!el || el.closest('script,style,noscript,template,#langEN,#langHE,#langRU')) return false; if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const where = el => { const parts = []; for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) parts.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '')); return parts.join('>'); };
  const words = [], dirs = [], spill = [], seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = walker.nextNode())) {
    const text = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!text || !/\p{L}/u.test(text)) continue;
    const el = n.parentElement; if (!shown(el)) continue;
    if (foreign(text) && !seen.has('t' + text)) { seen.add('t' + text); words.push({ text: text.slice(0, 140), at: where(el) }); }
    const dir = getComputedStyle(el).direction;
    if (lang === 'he' && HE.test(text) && dir === 'ltr' && !seen.has('d' + text)) { seen.add('d' + text); dirs.push({ text: text.slice(0, 80), at: where(el), dir }); }
    if (lang !== 'he' && dir === 'rtl' && !seen.has('d' + text)) { seen.add('d' + text); dirs.push({ text: text.slice(0, 80), at: where(el), dir }); }
    const r = el.getBoundingClientRect();
    if ((r.right > innerWidth + 2 || r.left < -2) && !seen.has('s' + text)) { seen.add('s' + text); spill.push({ text: text.slice(0, 60), at: where(el), left: Math.round(r.left), right: Math.round(r.right) }); }
  }
  for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
    if (!shown(el)) continue;
    for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v && /\p{L}/u.test(v) && foreign(v) && !seen.has('a' + v)) { seen.add('a' + v); words.push({ text: `[${a}] ${v.slice(0, 120)}`, at: where(el) }); } }
  }
  return { words, dirs, spill, htmlDir: document.documentElement.dir, htmlLang: document.documentElement.lang };
}

const CTX = `(() => { const rg = window.ringfighterGame; return window.__ctx = window.__ctx || { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } }; })()`;
const closeAll = `try{StoryScenes?.stop();}catch{} try{ringfighterGame.close();}catch{} document.querySelectorAll('dialog[open]').forEach(d=>d.close()); try{AdventureOldTown.leave?.();}catch{}`;
const tick = `window.__tick = n => { const e = app.engine; for (let i = 0; i < n; i++) { e.animTime += 1/60; const f = e.arena.update(e.animTime, e.technique, e.currentAnim); e.career?.onFrame?.(f, 1/60); e.world?.update?.(e.animTime, e.arena?.mode || 'none'); if (e.cameraDirector?.holdsClock) e.cameraDirector.skipIntro?.(); } };`;
// [id, screenshot?, script to run in the page, wait ms, optional readiness condition]
const STEPS = [
  ['home', true, `${closeAll}; ringfighterGame.home?.() || ringfighterGame.open('adventure')`, 4000, `!!document.querySelector('.adv-pin')`],
  ['map-card', true, `const b=[...document.querySelectorAll('.adv-pin')][0]; b?.click()`, 2500],
  ['map-card-2', false, `const b=[...document.querySelectorAll('.adv-pin')][2]; b?.click()`, 2000],
  ['map-night', false, `[...document.querySelectorAll('.adv-seg-b')][1]?.click()`, 2000],
  ['modes', true, `${closeAll}; window.GameModes?.toggle(true)`, 1500],
  ['shop', true, `${closeAll}; GameModes?.toggle(false); ringfighterGame.open('club')`, 3000],
  ['shop-2', false, `document.querySelectorAll('dialog[open] .store-categories button')[2]?.click()`, 1500],
  ['settings', true, `${closeAll}; (document.getElementById('openPracticeControls')||document.querySelector('[data-gm=settings],.gm-settings'))?.click()`, 1500],
  ['profile', false, `${closeAll}; document.getElementById('playerProfile')?.click(); document.querySelectorAll('dialog[open] details').forEach(d=>d.open=true)`, 1500],
  ['world', false, `${closeAll}; ringfighterGame.open('world'); document.querySelectorAll('dialog[open] details').forEach(d=>d.open=true)`, 2000],
  ['academy', false, `${closeAll}; ringfighterGame.open('learn')`, 2500],
  ['venues', false, `${closeAll}; ringfighterGame.open('venues')`, 2000],
  ['history', false, `${closeAll}; ringfighterGame.open('history')`, 1500],
  ['loadouts', false, `${closeAll}; ringfighterGame.open('lab')`, 1500],
  ['story-card', true, `${closeAll}; ringfighterGame.home?.(); setTimeout(()=>{ const S=AdventureStory; const id=S.order.find(i=>S.lines[i]&&Object.keys(S.lines[i]).length); S.show(id, Object.keys(S.lines[id])[0]); }, 1500)`, 3500],
  ['film', true, `${closeAll}; StoryScenes.play('dream_arrival', { onDone(){} })`, 6000, `window.DreamScenes?.debug?.phase==='play'`, `DreamScenes.seek(7)`, 2500],
  ['film-2', false, `DreamScenes.seek(16)`, 2500],
  ['film-3', false, `DreamScenes.seek(30)`, 2500],
  ['market-film', false, `${closeAll}; StoryScenes.play('dream_apology', { onDone(){} })`, 6000, `window.DreamScenes?.debug?.phase==='play'`, `DreamScenes.seek(8)`, 2500],
  ['training-calls', true, `${closeAll}; ${CTX}; AdventureOldTown.launch(__ctx, 'night_bag')`, 6000, `!!document.querySelector('#advCalls .adv-call')`],
  ['story-fight', true, `${closeAll}; ${CTX}; ${tick}; AdventureOldTown.storyFightStart(__ctx, 'market_robber')`, 5000, `!!app.engine.arena?.fightView?.match`, `app.engine.isPlaying=true; app.engine.speed=0; if(app.engine.player) app.engine.player.enabled=false; const m=app.engine.arena.fightView.match; let k=0; while(m.phase!=='round'&&k<60){__tick(60);k++;} __tick(120);`, 2500],
  ['super-punch', true, `const v=app.engine.arena.fightView,m=v.match,s=m.playerActor||'lion',o=s==='lion'?'rabbit':'lion'; window.__s=s; m.finisherOwned={...(m.finisherOwned||{}),[s]:['sunday_punch']}; for(let a=0;a<6&&!m.result;a++){ m.fighters[o].condition=Math.min(m.fighters[o].condition,18); m.fighters[s].burst.charge=1; let k=0; while(!(m.fighters[s].action?.finisher||m.requestFinisher(s))&&k<900){__tick(1);k++;} k=0; while(!m.result&&k<120){__tick(1);k++;} } let k=0; while(m.result?.finisher&&m.time-m.result.finisherTime<3.6&&k<600){__tick(1);k++;}`, 2500],
  ['fight-result', true, `const m=app.engine.arena.fightView.match; let k=0; while(!(m.phase==='ceremony'&&m.phaseTime>2.5)&&k<3000){__tick(1);k++;} for(let i=0;i<300;i++)__tick(1);`, 3500],
  ['bag-trial', true, `${closeAll}; StoryScenes.play('carry_bag', { noIntro: true, onDone(){} })`, 6000],
  ['mop', true, `${closeAll}; ${CTX}; const st=__ctx.store, c=__ctx.change; for (const step of ['dream_arrival','dream_gym_talk','first_brick']) { const s=StoryFlow.find(step); if (!StoryFlow.doneOf(st.game(), s)) c({type:'adventure',adventure:'story',step,outcome:step==='first_brick'?'lost':undefined}); } AdventureOldTown.launch(__ctx,'clean_gym')`, 7000, `!!StoryScenes.debug?.sim`],
  ['mop-result', true, `const g=StoryScenes.debug.sim; g.started=true; g.left=0.02;`, 5000],
];

(async () => {
  const server = await serve(), browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--no-sandbox'] }), report = {};
  try {
    for (const lang of langs) {
      const ctx = await browser.newContext({ viewport: { width: 402, height: 690 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message.slice(0, 200))); p.setDefaultTimeout(300000);
      await p.addInitScript(l => { try { localStorage.setItem('shadowbox-language', l); localStorage.setItem('gotr.adv.nointro', '1'); } catch { } }, lang);
      await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
      await p.waitForFunction(() => window.ringfighterGame?.store && window.StoryScenes && window.AdventureOldTown, null, { timeout: 300000 });
      const first = await p.evaluate(collect, [lang, TYPED, GLOSSARY]);
      if (!only.length || only.includes('welcome')) await p.screenshot({ path: path.join(out, `${lang}-welcome.png`) });
      for (let k = 0; k < 120 && !(await p.evaluate(() => !!ringfighterGame.store.game())); k++) {
        await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'), i = d?.querySelector('input[name=player]'); if (!i) return; i.value = 'QA'; i.dispatchEvent(new Event('input', { bubbles: true })); d.querySelector('form')?.requestSubmit(); });
        await wait(1000);
      }
      await p.waitForFunction(() => app.engine.coach?.anatomy && ringfighterGame.store.game(), null, { timeout: 300000 });
      const res = { welcome: first }, t0 = Date.now();
      for (const [id, shot, js, ms, ready, then, ms2] of STEPS) {
        if (only.length && !only.includes(id)) continue;
        try {
          await p.evaluate(js);
          if (ready) await p.waitForFunction(new Function('return (' + ready + ')'), null, { timeout: 120000, polling: 300 }).catch(() => errors.push(id + ': not ready'));
          await wait(ms);
          if (then) { await p.evaluate(then); await wait(ms2 || 1500); }
        } catch (e) { errors.push(id + ': ' + e.message.slice(0, 160)); }
        res[id] = await p.evaluate(collect, [lang, TYPED, GLOSSARY]).catch(e => ({ error: e.message }));
        if (shot) await p.screenshot({ path: path.join(out, `${lang}-${id}.png`) }).catch(() => { });
        console.log(lang, id, (res[id].words || []).length, 'foreign', (res[id].dirs || []).length, 'dir', (res[id].spill || []).length, 'spill', Math.round((Date.now() - t0) / 1000) + 's');
      }
      report[lang] = { states: res, errors }; await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  // summary: unique texts per language with the screens they were seen on
  const sum = {}; let total = 0;
  for (const [lang, r] of Object.entries(report)) {
    const m = new Map(), d = new Map(), s = new Map();
    for (const [st, c] of Object.entries(r.states)) { for (const w of c.words || []) { if (!m.has(w.text)) m.set(w.text, { at: w.at, screens: [] }); m.get(w.text).screens.push(st); } for (const w of c.dirs || []) { if (!d.has(w.text)) d.set(w.text, { at: w.at, screens: [] }); d.get(w.text).screens.push(st); } for (const w of c.spill || []) { if (!s.has(w.text)) s.set(w.text, { ...w, screens: [] }); s.get(w.text).screens.push(st); } }
    sum[lang] = { foreign: Object.fromEntries(m), direction: Object.fromEntries(d), offscreen: Object.fromEntries(s), errors: r.errors, html: Object.values(r.states).map(c => c.htmlDir + '/' + c.htmlLang).filter((v, i, a) => a.indexOf(v) === i) };
    total += m.size + d.size;
    console.log(`\n== ${lang.toUpperCase()}: ${m.size} foreign texts, ${d.size} direction faults, ${s.size} off-screen, html ${sum[lang].html.join(' ')}`);
    for (const [t, v] of m) console.log(`  "${t}"  ${v.at}  [${v.screens.slice(0, 4).join(',')}]`);
    for (const [t, v] of d) console.log(`  DIR "${t}"  ${v.at}  [${v.screens.slice(0, 4).join(',')}]`);
    for (const [t, v] of s) console.log(`  OFF "${t}"  ${v.at} ${v.left}..${v.right}  [${v.screens.slice(0, 3).join(',')}]`);
    for (const e of r.errors) console.log('  ERROR ' + e);
  }
  fs.writeFileSync(path.join(out, 'sweep.json'), JSON.stringify(sum, null, 1) + '\n');
  console.log(`\nTOTAL foreign+direction: ${total}`);
})().catch(e => { console.error(e); process.exit(2); });
