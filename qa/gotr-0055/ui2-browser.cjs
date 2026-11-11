// GOTR-0055: Adventure screen redesign. Numbers first; screenshots only with SHOTS=dir. Static server on :8191 (APP_URL to change).
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a) => p.waitForFunction(f, a, { timeout: 300000 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
const open = p => p.evaluate(() => new Promise(r => ringfighterGame.open('adventure', { onReady: h => { window.advH = h; h.select('oldtown'); r(); } })));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, lang] of [['p402', { width: 402, height: 690 }, 'en'], ['p402', { width: 402, height: 690 }, 'he'], ['p360', { width: 360, height: 640 }, 'en'], ['p360', { width: 360, height: 640 }, 'he'], ['desk', { width: 1366, height: 768 }, 'en']]) {
      const p = await b.newPage({ viewport: vp }), errors = [], tag = `${name} ${lang}`, shot = n => SHOTS && name === 'p402' && lang === 'en' && p.screenshot({ path: `${SHOTS}/ui2-${n}.png`, timeout: 300000 });
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.removeItem('gotr.adv.route.1'); if (!app.engine.career.store.current()) app.engine.career.store.create('UI2 QA'); });
      await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(l => app.setLanguage(l), lang);
      await open(p); await p.waitForSelector('.adv-tile', { timeout: 300000 }); await p.waitForTimeout(1800);
      const m = await p.evaluate(() => {
        const d = document.querySelector('dialog[open]'), q = s => d.querySelector(s).getBoundingClientRect(), st = q('.adv-stage'), c = q('.adv-card'), x = q('.game-close, .adv-dialog .game-dialog-head button');
        const order = [...d.querySelectorAll('.adv-tile[data-mission]')].map(t => t.classList.contains('adv-tile-soon') ? 'S' : 'P').join('');
        return { vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth, dlgScroll: d.scrollWidth, dlgClient: d.clientWidth, dlgRight: Math.round(d.getBoundingClientRect().right), closeRight: Math.round(x.right), mapPct: Math.round(100 * st.height / innerHeight), sheetPct: Math.round(100 * c.height / innerHeight), cardW: [Math.round(c.left), Math.round(c.right)], order, tiles: d.querySelectorAll('.adv-tile').length, glance: d.querySelector('.adv-glance')?.innerText.replace(/\n+/g, ' | '), prog: !!d.querySelector('.adv-prog'), marks: d.querySelectorAll('.adv-mark').length, hiddenFair: document.querySelector('.adv-pin[data-place=fair]')?.classList.contains('adv-hidden'), fort: !!document.querySelector('.adv-pin[data-place=fort]:not(.adv-hidden)'), sideTile: !!d.querySelector('.adv-tile-side') };
      });
      console.log(tag, JSON.stringify(m));
      assert.ok(m.docW <= m.vw && m.dlgScroll <= m.dlgClient + 1 && m.dlgRight <= m.vw && m.closeRight <= m.vw, 'no horizontal overflow');
      if (vp.width < 520) assert.ok(m.mapPct >= 58, 'map share ' + m.mapPct);
      assert.ok(/^P+S+$/.test(m.order) && m.tiles >= 9, 'playable first, coming soon last: ' + m.order);
      assert.ok(m.prog && m.marks === 10 && m.hiddenFair === true && m.fort && m.sideTile, JSON.stringify(m));
      await shot('sheet-peek');
      // tap a tile -> details, sheet expands, no overflow
      await p.evaluate(() => document.querySelector('.adv-tile[data-mission=one_two_mitts]').click()); await p.waitForTimeout(600);
      const ex = await p.evaluate(() => ({ open: document.querySelector('.adv-card').classList.contains('open'), detail: document.querySelector('.adv-detail').innerText.replace(/\n+/g, ' | '), docW: document.documentElement.scrollWidth, vw: innerWidth }));
      console.log(tag, 'tile tap', JSON.stringify(ex)); assert.ok(ex.open && /20|‏/.test(ex.detail) && ex.docW <= ex.vw);
      await shot('sheet-open');
      if (name === 'p402' || name === 'desk') {
        // progress animates forward when stars are earned
        const before = await p.evaluate(() => document.querySelector('.adv-prog-fill').style.width);
        await p.evaluate(() => { const s = app.engine.career.store; s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'one_two_mitts', measured: { cleanHits: 20 } }); s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'bag_power', measured: { powerMarks: 5 } }); advH.select('oldtown'); });
        const start = await p.evaluate(() => document.querySelector('.adv-prog-fill').style.width); await p.waitForTimeout(1600);
        const end = await p.evaluate(() => ({ w: document.querySelector('.adv-prog-fill').style.width, hit: document.querySelectorAll('.adv-mark.hit').length }));
        console.log(tag, 'progress', before, start, '->', end.w, 'marks hit', end.hit); assert.ok(parseFloat(end.w) > parseFloat(start) && end.hit === 2);
        // boss beaten: route dots appear one by one 1 -> 2, next pin highlighted, side zone for chapter 2 appears
        await p.evaluate(() => { const s = app.engine.career.store; if (!s.gameAction({ type: 'adventure', adventure: 'boss', bossId: 'brick', won: true }).ok) throw Error('boss'); ringfighterGame.close(); });
        await open(p); await p.waitForTimeout(1500);
        const mid = await p.evaluate(() => document.querySelectorAll('.adv-route-dot.on').length); await shot('route-start');
        await p.waitForFunction(() => document.querySelectorAll('.adv-route-dot.on').length === 10, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(400);
        const fin = await p.evaluate(() => ({ dots: document.querySelectorAll('.adv-route-dot.on').length, all: document.querySelectorAll('.adv-route-dot').length, next: document.querySelector('.adv-pin[data-place=market]').classList.contains('adv-nextpin'), fair: !document.querySelector('.adv-pin[data-place=fair]').classList.contains('adv-hidden') }));
        console.log(tag, 'route dots mid', mid, 'final', JSON.stringify(fin)); await shot('route-end');
        assert.ok(mid < fin.dots && fin.dots === 10 && fin.next && fin.fair);
      }
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n'));
      await p.close();
    }
    console.log('ui2 browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
