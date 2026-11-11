// GOTR-0058: mission tiles visible in the peek sheet; route dots one by one along the streets. Static server :8191. SHOTS=dir for screenshots.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [vp, lang] of [[{ width: 402, height: 690 }, 'en'], [{ width: 360, height: 640 }, 'en'], [{ width: 402, height: 690 }, 'he']]) {
      const p = await b.newPage({ viewport: vp }), errors = [], tag = `${vp.width}x${vp.height} ${lang}`; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.removeItem('gotr.adv.route.1'); if (!app.engine.career.store.current()) app.engine.career.store.create('UI3 QA'); });
      await p.reload({ timeout: 300000 }); await ready(p); await p.evaluate(l => app.setLanguage(l), lang);
      await p.evaluate(() => ringfighterGame.open('adventure', { onReady: h => { window.advH = h; h.select('oldtown'); } })); await p.waitForSelector('.adv-tile', { timeout: 300000 }); await p.waitForTimeout(1500);
      const peek = await p.evaluate(() => { const c = document.querySelector('.adv-card'), cr = c.getBoundingClientRect(), t = document.querySelector('.adv-tiles').getBoundingClientRect(), st = document.querySelector('.adv-stage').getBoundingClientRect(); return { tilesInside: t.bottom <= cr.bottom + 1 && t.top >= cr.top, tilesBottom: Math.round(t.bottom), cardBottom: Math.round(cr.bottom), sheetPct: Math.round(100 * cr.height / innerHeight), mapPct: Math.round(100 * st.height / innerHeight), docW: document.documentElement.scrollWidth, vw: innerWidth }; });
      console.log(tag, 'peek', JSON.stringify(peek)); assert.ok(peek.tilesInside && peek.docW <= peek.vw && peek.mapPct >= 55, JSON.stringify(peek));
      if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/ui3-peek-${vp.width}.png`, timeout: 300000 });
      if (vp.width === 402 && lang === 'en') {
        await p.evaluate(() => { const s = app.engine.career.store; if (!s.gameAction({ type: 'adventure', adventure: 'boss', bossId: 'brick', won: true }).ok) throw Error('boss'); });
        const path = await p.evaluate(() => { const a = advH.map.places.find(q => q.id === 'oldtown'), c = advH.map.places.find(q => q.id === 'market'), r = advH.map.route(a.anchor, c.anchor); return r && { n: r.length, from: r[0], to: r[r.length - 1], a: [a.anchor.x, a.anchor.z], c: [c.anchor.x, c.anchor.z] }; });
        console.log(tag, 'street path', JSON.stringify(path)); assert.ok(path && path.n > 10, 'a street route exists');
        await p.evaluate(() => advH.select('oldtown')); // reopen the sheet after the boss win: the route replays
        await wait(p, () => document.querySelectorAll('.adv-route-dot.on').length >= 3 && document.querySelectorAll('.adv-route-dot.on').length < document.querySelectorAll('.adv-route-dot').length, null, 60000);
        const mid = await p.evaluate(() => [document.querySelectorAll('.adv-route-dot.on').length, document.querySelectorAll('.adv-route-dot').length]); console.log(tag, 'dots mid', mid);
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/ui3-dots-mid.png`, timeout: 300000 });
        await wait(p, () => document.querySelectorAll('.adv-route-dot.on').length === document.querySelectorAll('.adv-route-dot').length, null, 60000); await p.waitForTimeout(1200);
        const fin = await p.evaluate(() => ({ on: document.querySelectorAll('.adv-route-dot.on').length, next: document.querySelector('.adv-pin[data-place=market]').classList.contains('adv-nextpin') })); console.log(tag, 'dots final', JSON.stringify(fin)); assert.ok(fin.next && fin.on >= 8);
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/ui3-dots-end.png`, timeout: 300000 });
      }
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('ui3 browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
