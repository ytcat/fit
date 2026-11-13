// GOTR-0081: character portraits and the name Mack. Fresh profile at 402x690 (device scale 2, to judge crispness), EN and HE:
// the opening conversation lines (the Fighter, Bruno, Brick), the quest panel face, and a gallery of every story character in
// the beat-line and quest-panel sizes. Reports which portraits are 3D renders, monograms or silhouettes, and that no visible text
// says "Pip". Usage: APP_URL=http://127.0.0.1:8293/ SHOTS=qa/gotr-0081 node qa/gotr-0081/portraits-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8293/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
async function shot(p, name, clip) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000, ...(clip ? { clip } : {}) });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=85)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
const noPip = p => p.evaluate(() => /\bPip\b|פיפ|Пип/.test(document.body.innerText));
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const tag = `402x690-${lang}`, p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 2 }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); }); await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(l); localStorage.setItem('shadowbox-language', l); app.engine.career.store.create('Portrait QA'); }, lang); await p.reload({ timeout: 300000 });
      // Beat 0/1 conversation (the portrait fallback while agent/dream-1's films are not merged).
      await wait(p, () => document.querySelector('#sfBeat .sf-beat-line .sp-portrait'), null, 300000);
      await wait(p, () => !document.querySelector('.sp-portrait[data-kind="pending"]'), null, 300000); await p.waitForTimeout(800);
      await shot(p, `${tag}-1-arrival-lines`);
      await p.evaluate(() => document.querySelector('#sfBeat .sf-beat-main').click());
      await wait(p, () => document.querySelectorAll('#sfBeat .sf-beat-line .sp-portrait').length >= 2 && /Bruno|ברונו/.test(document.getElementById('sfBeat').innerText), null, 300000);
      await wait(p, () => !document.querySelector('.sp-portrait[data-kind="pending"]'), null, 300000); await p.waitForTimeout(800);
      const talk = await p.evaluate(() => [...document.querySelectorAll('#sfBeat .sp-portrait')].map(x => x.dataset.who + ':' + x.dataset.kind));
      console.log(tag, 'gym talk portraits', talk.join(' ')); await shot(p, `${tag}-2-gym-talk-lines`);
      assert.ok(talk.includes('fighter:3d'), 'the Fighter is a 3D head: ' + talk);
      // Gallery: every character in the two sizes used on phones (42 px lines, 56 px quest panel).
      const gal = await p.evaluate(() => {
        document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.getElementById('sfBeat')?.remove();
        const g = document.createElement('div'); g.id = 'spGallery'; g.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0f16;color:#e9edf3;font:12px system-ui;padding:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start;overflow:auto';
        g.dir = document.documentElement.dir || 'ltr';
        const S = window.AdventureStory, ids = ['fighter', 'pip', 'bruno', 'brick', 'fang', 'hazel', 'otto', 'slick', 'hook', 'vix', 'king', 'dash', 'hyena', 'raccoon', 'nephew'];
        for (const id of ids) { const c = document.createElement('div'); c.style.cssText = 'display:grid;justify-items:center;gap:4px;text-align:center'; const big = S.bust(id), small = S.bust(id); big.style.setProperty('--sp', '56px'); big.style.width = big.style.height = '56px'; small.style.setProperty('--sp', '42px'); small.style.width = small.style.height = '42px'; const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;align-items:center'; row.append(big, small); const n = document.createElement('span'); n.textContent = S.who[id].name[app.lang] || S.who[id].name.en; c.append(row, n); g.append(c); }
        document.body.append(g); return ids;
      });
      await wait(p, () => !document.querySelector('#spGallery .sp-portrait[data-kind="pending"]'), null, 300000); await p.waitForTimeout(800);
      const kinds = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#spGallery .sp-portrait')].map(x => [x.dataset.who, x.dataset.kind])));
      const dbg = await p.evaluate(() => ({ renders: StoryPortraits.debug.renders, fails: StoryPortraits.debug.fails, storyCast: typeof window.StoryCast?.rig === 'function' }));
      console.log(tag, 'gallery', JSON.stringify(kinds), JSON.stringify(dbg)); await shot(p, `${tag}-3-gallery`);
      assert.equal(kinds.fighter, '3d'); assert.ok(['3d', 'silhouette'].includes(kinds.pip)); for (const id of ['fang', 'hazel', 'otto', 'slick', 'hook', 'vix', 'king', 'dash']) assert.equal(kinds[id], 'monogram', id);
      assert.equal(await noPip(p), false, 'no visible "Pip"');
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('portraits browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
