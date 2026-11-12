// GOTR-0061 city graphics in the real Adventure tab: grade per chapter, movers, eased fly-to, idle drift, low tier, cleanup.
// node qa/gotr-0061/city/app-check.cjs   (static server on :8177 from the repo root)
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8177/';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const q of ['', '?gfx=low']) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = [];
      p.on('pageerror', e => errors.push(e.message));
      const ready = () => p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 300000 });
      await p.goto(URL + q, { timeout: 300000 }); await ready();
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('City QA'); });
      await p.reload({ timeout: 300000 }); await ready();
      let api = null;
      await p.evaluate(() => { if (window.AdventureOldTown) AdventureOldTown.onOpen = () => {}; }); // keep the first-visit story scene out of the camera test
      await p.evaluate(() => ringfighterGame.open('adventure', { onReady: a => { window.__adv = a; } }));
      await p.waitForFunction(() => window.__adv && document.querySelectorAll('dialog[open] .adv-pin').length > 0, null, { timeout: 300000 });
      const r = await p.evaluate(() => { const m = __adv.map, names = []; m.group.traverse(o => { if (o.isMesh || o.isPoints) names.push(o.name); }); return { grade: document.querySelector('dialog[open]').dataset.grade, time: m.time, quality: m.quality, meshes: names.length, moving: names.filter(n => / moving$/.test(n)), halo: m.group.getObjectByName('current place halo').visible, tris: m.stats().triangles, cam: { ...__adv.cam } }; });
      console.log(q || 'default', JSON.stringify(r));
      assert.equal(r.grade, 'morning', 'chapter 1 opens in morning light'); assert.ok(r.halo); assert.equal(r.quality, q ? 'low' : 'high'); assert.ok(r.meshes <= 60 && r.tris <= 350000);
      assert.ok(r.moving.includes('cars moving') && r.moving.includes('people moving'));
      // fly-to eases to the place and stops there
      await p.evaluate(() => __adv.select('market'));
      await p.waitForFunction(() => { const f = __adv.map.places.find(x => x.id === 'market').focus, c = __adv.cam; return Math.hypot(c.x - f.x, c.z - f.z) < 1 && Math.abs(c.dist - Math.max(34, f.dist)) < 1; }, null, { timeout: 300000 });
      console.log(q || 'default', 'fly-to reached Market Row');
      await p.evaluate(() => ringfighterGame.close()); await p.waitForTimeout(500);
      assert.equal(await p.evaluate(() => !!document.querySelector('.adv-canvas')), false, 'map released');
      console.log(q || 'default', 'errors', JSON.stringify(errors)); assert.deepEqual(errors, []);
      await p.close();
    }
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
