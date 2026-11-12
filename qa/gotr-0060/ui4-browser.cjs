// GOTR-0060: 3D route markers on the road (hidden by buildings), short tile labels, clean peek bottom. Static server :8191. SHOTS=dir.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
const open = (p, pin) => p.evaluate(pin => new Promise(r => ringfighterGame.open('adventure', { onReady: h => { window.advH = h; h.select(pin); r(); } })), pin);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of ['en', 'he']) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.removeItem('gotr.adv.route.1'); localStorage.removeItem('gotr.adv.route.2'); if (!app.engine.career.store.current()) app.engine.career.store.create('UI4 QA'); });
      await p.reload({ timeout: 300000 }); await ready(p); await p.evaluate(l => app.setLanguage(l), lang);
      await p.evaluate(() => { const s = app.engine.career.store; s.gameAction({ type: 'adventure', adventure: 'boss', bossId: 'brick', won: true }); });
      await open(p, 'oldtown'); await p.waitForSelector('.adv-tile', { timeout: 300000 }); await p.waitForTimeout(1200);
      const t = await p.evaluate(() => { const c = document.querySelector('.adv-card'), cr = c.getBoundingClientRect(), tl = document.querySelector('.adv-tiles').getBoundingClientRect(); const names = [...c.querySelectorAll('.adv-tile-name')]; return { labels: names.map(x => x.textContent), cut: names.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent), tilesBottom: Math.round(tl.bottom), cardBottom: Math.round(cr.bottom), visibleAfter: [...c.children].filter(x => x.offsetHeight && x.getBoundingClientRect().top >= tl.bottom - 1).length, docW: document.documentElement.scrollWidth }; });
      console.log(lang, 'tiles', JSON.stringify(t)); assert.ok(t.cut.length === 0 && t.cardBottom - t.tilesBottom <= 8 && t.visibleAfter === 0 && t.docW <= 402, JSON.stringify(t));
      assert.ok(t.labels.every(x => [...x].length <= 10));
      await wait(p, () => document.querySelector('dialog[open]').dataset.routeDots, null, 120000); await p.waitForTimeout(800);
      const r1 = await p.evaluate(() => ({ dots: document.querySelector('dialog[open]').dataset.routeDots, html2d: document.querySelectorAll('.adv-route-dot').length }));
      console.log(lang, 'route 1->2', JSON.stringify(r1)); assert.ok(+r1.dots >= 10 && r1.html2d === 0, 'markers are 3D, no overlay dots');
      if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/ui4-route-1-2.png`, timeout: 300000 });
      await p.evaluate(() => { const s = app.engine.career.store; s.gameAction({ type: 'adventure', adventure: 'boss', bossId: 'king_hyena', won: true }); ringfighterGame.close(); });
      await open(p, 'market'); await wait(p, () => document.querySelector('dialog[open]').dataset.route === '2', null, 120000); await p.waitForTimeout(800);
      const r2 = await p.evaluate(() => document.querySelector('dialog[open]').dataset.routeDots); console.log(lang, 'route 2->3 markers', r2); assert.ok(+r2 >= 10);
      if (SHOTS && lang === 'en') { await p.screenshot({ path: `${SHOTS}/ui4-route-2-3.png`, timeout: 300000 }); await p.screenshot({ path: `${SHOTS}/ui4-tiles.png`, timeout: 300000, clip: { x: 0, y: 480, width: 402, height: 210 } }); }
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('ui4 browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
