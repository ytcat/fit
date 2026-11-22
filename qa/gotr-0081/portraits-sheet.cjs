// GOTR-0081 review sheets: every story portrait large (112 css px) and at the sizes used on phones (56 quest panel, 42 story
// lines), plus the portraits in place: the quest panel and the story lines on the map (first Brick fight, the market robbery,
// the Docks). Headless Chromium (SwiftShader), 402x690 at device scale 2.
// node qa/gotr-0081/portraits-sheet.cjs <siteRoot> <outDir> [tag=after] [lang=en]
// Prints which portraits are 3D renders, monograms or silhouettes, and fails on page errors or a visible "Pip".
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..')), OUT = process.argv[3] || path.join(__dirname), TAG = process.argv[4] || 'after', LANG = process.argv[5] || 'en';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const IDS = ['fighter', 'bruno', 'pip', 'brick', 'fang', 'hazel', 'otto', 'hook', 'slick', 'vix', 'king', 'dash', 'hyena', 'raccoon', 'nephew', 'guard', 'grandma', 'influencer'];
async function shot(p, file, clip) { const png = file + '.png'; await p.screenshot({ path: png, timeout: 300000, ...(clip ? { clip } : {}) }); try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=88)', png, file + '.webp']); fs.unlinkSync(png); } catch { /* keep the png */ } }
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const URL = `http://127.0.0.1:${server.address().port}/`, b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), errors = [];
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(l => { try { localStorage.setItem('gotr.adv.nointro', '1'); localStorage.setItem('shadowbox-language', l); } catch { /* ignore */ } }, LANG);
    await p.goto(URL, { timeout: 300000 });
    const ready = () => p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.StoryCast?.docks && window.AdventureStory && window.AdventureOldTown, null, { timeout: 300000, polling: 300 });
    await ready();
    await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage?.(l); app.engine.career.store.create('Portrait QA'); localStorage.setItem('gotr.adv.intro.' + app.engine.career.store.current().id, '1'); }, LANG);
    await p.reload({ timeout: 300000 }); await ready();
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__closer = setInterval(() => document.querySelectorAll('dialog[open]:not(.adv-dialog)').forEach(d => d.close()), 300); });
    // paws ready first (bare-handed characters show their own paws if a hand comes into the picture)
    await p.evaluate(async () => { for (const id of ['bruno', 'fang', 'hazel', 'otto', 'rourke']) try { StoryCast.rig(id, app.engine); } catch { /* none */ } const t0 = performance.now(); await new Promise(r => setTimeout(r, 400)); while (window.Paws && Paws._pending() && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 200)); });
    // 1. gallery
    await p.evaluate(ids => {
      const g = document.createElement('div'); g.id = 'spGallery'; g.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0f16;color:#e9edf3;font:11px system-ui;padding:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px 4px;align-content:start;overflow:hidden';
      g.dir = document.documentElement.dir || 'ltr'; const S = window.AdventureStory;
      for (const id of ids) {
        const c = document.createElement('div'); c.style.cssText = 'display:grid;justify-items:center;gap:2px;text-align:center';
        const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:4px;align-items:end';
        for (const px of [74, 42]) { const e = S.bust(id); e.style.setProperty('--sp', px + 'px'); e.style.width = e.style.height = px + 'px'; row.append(e); }
        const n = document.createElement('span'); n.textContent = S.who[id].name[app.lang] || S.who[id].name.en; c.append(row, n); g.append(c);
      }
      document.body.append(g);
    }, IDS);
    await p.waitForFunction(() => !document.querySelector('#spGallery .sp-portrait[data-kind="pending"]'), null, { timeout: 300000 }); await p.waitForTimeout(600);
    const kinds = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#spGallery .sp-portrait')].map(x => [x.dataset.who, x.dataset.kind])));
    console.log(TAG, 'gallery', JSON.stringify(kinds)); await shot(p, path.join(OUT, `${TAG}-${LANG}-gallery`));
    // 2. big faces (the source images) for a close look
    await p.evaluate(ids => {
      document.getElementById('spGallery').remove(); const g = document.createElement('div'); g.id = 'spBig'; g.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0f16;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px;align-content:start';
      for (const id of ids) { const e = AdventureStory.bust(id); e.style.setProperty('--sp', '120px'); e.style.width = e.style.height = '120px'; const c = document.createElement('div'); c.style.cssText = 'display:grid;justify-items:center'; c.append(e); g.append(c); }
      document.body.append(g);
    }, IDS.slice(0, 9));
    await p.waitForTimeout(600); await shot(p, path.join(OUT, `${TAG}-${LANG}-big`)); await p.evaluate(() => document.getElementById('spBig').remove());
    // 3. in place: the quest panel, then story lines on the map
    await p.evaluate(() => { window.StoryScenes?.stop?.(); ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }); });
    await p.waitForFunction(() => document.querySelector('.sf-quest .sf-pic .sp-portrait'), null, { timeout: 300000 });
    await p.waitForFunction(() => !document.querySelector('.sp-portrait[data-kind="pending"]'), null, { timeout: 300000 }); await p.waitForTimeout(800);
    await shot(p, path.join(OUT, `${TAG}-${LANG}-quest`));
    // the map card of a later chapter: the coach as a small portrait next to his name (was an emoji)
    await p.evaluate(() => { document.querySelector('.adv-card-close')?.click(); }); await p.waitForTimeout(300);
    const card = await p.evaluate(() => new Promise(res => { try { ringfighterGame.open('adventure', { onReady: h => { h.select('docks'); setTimeout(() => res(true), 1500); } }); } catch { res(false); } setTimeout(() => res(false), 60000); }));
    if (card) { await p.waitForFunction(() => !document.querySelector('.sp-portrait[data-kind="pending"]'), null, { timeout: 120000 }).catch(() => {}); await p.evaluate(() => document.querySelectorAll('.adv-card').forEach(c => c.classList.add('open'))); await p.waitForTimeout(800); console.log(TAG, 'map card coach', await p.evaluate(() => [...document.querySelectorAll('.adv-fact .sp-portrait')].map(x => x.dataset.who + ':' + x.dataset.kind).join(' ') || 'emoji')); await shot(p, path.join(OUT, `${TAG}-${LANG}-mapcard`)); }
    await p.evaluate(() => { window.StoryScenes?.stop?.(); ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }); }); await p.waitForFunction(() => document.querySelector('.sf-quest .sf-pic .sp-portrait'), null, { timeout: 300000 });
    for (const [step, kind] of [['first_brick', 'intro'], ['market_robber', 'intro'], ['docks_fight', 'lost']]) {
      await p.evaluate(([id, kind]) => { const S = AdventureStory, lines = S.pick(id, kind); AdventureOldTown.closeBeat?.(); const host = document.querySelector('dialog[open].adv-dialog .adv-stage') || document.body;
        const el = document.createElement('div'); el.className = 'sf-beat'; el.id = 'sfBeat'; const top = document.createElement('div'); top.className = 'sf-beat-top';
        for (const l of lines.slice(0, 3)) { const q = document.createElement('p'); q.className = 'sf-beat-line'; q.append(S.bust(l.who)); const t = document.createElement('span'), n = document.createElement('strong'); n.textContent = S.who[l.who].name[app.lang] || S.who[l.who].name.en; t.append(n, document.createTextNode(' ' + (l.text[app.lang] || l.text.en))); q.append(t); top.append(q); }
        el.append(top); host.append(el); }, [step, kind]);
      await p.waitForFunction(() => !document.querySelector('#sfBeat .sp-portrait[data-kind="pending"]'), null, { timeout: 300000 }); await p.waitForTimeout(600);
      const who = await p.evaluate(() => [...document.querySelectorAll('#sfBeat .sp-portrait')].map(x => x.dataset.who + ':' + x.dataset.kind).join(' '));
      console.log(TAG, step, who);
      const box = await p.evaluate(() => { const r = document.getElementById('sfBeat').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top - 6), width: 402, height: Math.min(690 - Math.max(0, r.top - 6), r.height + 12) }; });
      await shot(p, path.join(OUT, `${TAG}-${LANG}-lines-${step}`), box.height > 20 ? box : undefined);
    }
    const pip = await p.evaluate(() => /\bPip\b|פיפ|Пип/.test(document.body.innerText));
    const dbg = await p.evaluate(() => window.StoryPortraits ? { renders: StoryPortraits.debug.renders, fails: StoryPortraits.debug.fails } : null);
    console.log(TAG, 'portraits', JSON.stringify(dbg), 'visible Pip', pip);
    const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); if (bad.length) { console.log('PAGE ERRORS', bad.join('\n')); process.exitCode = 1; }
    if (pip) process.exitCode = 1;
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
