// GOTR-0092: the story portraits (adventure/portraits.js) for the cast, rendered by the game itself. node portraits.cjs <out.png>
// Each id gets StoryPortraits.el(id); we wait until every badge is a 3D render (data-kind="3d") and screenshot the strip.
const { chromium } = require('playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8613/';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 760, height: 240 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryPortraits && window.StoryCast, null, { timeout: 300000 });
  const ids = ['fighter', 'bruno', 'brick', 'fang', 'hazel', 'otto'];
  await p.evaluate(ids => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const row = document.createElement('div'); row.id = 'qaPortraits'; row.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0d1117;display:flex;gap:18px;align-items:center;justify-content:center;font:14px sans-serif;color:#dde';
    for (const id of ids) { const c = document.createElement('div'); c.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px'; const el = StoryPortraits.el(id, { name: StoryCast.names[id]?.en || 'Fighter' }); el.style.cssText += ';width:96px;height:96px'; const t = document.createElement('div'); t.textContent = id; c.append(el, t); row.append(c); }
    document.body.append(row);
  }, ids);
  await p.waitForFunction(n => document.querySelectorAll('#qaPortraits .sp-portrait[data-kind="3d"]').length >= n || document.querySelectorAll('#qaPortraits .sp-portrait[data-kind="silhouette"]').length > 0, ids.length, { timeout: 300000 }).catch(() => {});
  console.log(JSON.stringify(await p.evaluate(() => ({ kinds: [...document.querySelectorAll('#qaPortraits .sp-portrait')].map(e => e.dataset.who + ':' + e.dataset.kind), debug: StoryPortraits.debug }))));
  await p.screenshot({ path: process.argv[2] });
  await b.close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
