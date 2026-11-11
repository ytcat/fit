// GOTR-0008 map preview interaction check: UI present, pins on screen and not overlapping,
// a pin click flies the camera to that place, Day/Night toggle rebuilds, phone portrait layout.
// Usage: node qa/gotr-0008/map/interact.cjs [outDir]   (static server on :8177, see capture.cjs)
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.MAP_URL || 'http://127.0.0.1:8177/adventure/map-preview.html';
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    for (const [name, vp] of [['desktop', { width: 1366, height: 768 }], ['phone', { width: 393, height: 852 }]]) {
      const page = await browser.newPage({ viewport: vp });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${URL}?shadow=1024&dpr=1`, { timeout: 600000 });
      await page.waitForFunction(() => window.GL_PREVIEW && window.GL_PREVIEW.map, null, { timeout: 600000 });
      await page.waitForTimeout(3000);
      const pins = await page.evaluate(() => {
        const r = [...document.querySelectorAll('.pin')].filter(p => p.style.display !== 'none').map(p => { const t = p.querySelector('.tag').getBoundingClientRect(); return { name: p.querySelector('.name').textContent, l: t.left, t: t.top, r: t.right, b: t.bottom }; });
        let overlaps = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.r > b.l + 2 && b.r > a.l + 2 && a.b > b.t + 2 && b.b > a.t + 2) overlaps++; }
        return { shown: r.length, total: document.querySelectorAll('.pin').length, overlaps, offscreen: r.filter(p => p.l < 0 || p.t < 0 || p.r > innerWidth || p.b > innerHeight).map(p => p.name), hScroll: document.documentElement.scrollWidth > innerWidth };
      });
      console.log(name, JSON.stringify(pins));
      assert.equal(pins.total, 11, 'eleven places have pins');
      assert.ok(!pins.hScroll, 'no horizontal scroll');
      if (name === 'desktop') { assert.equal(pins.shown, 11, 'whole city view shows every pin'); assert.equal(pins.overlaps, 0, 'pin labels do not overlap'); assert.deepEqual(pins.offscreen, []); }
      assert.deepEqual(pins.offscreen, [], 'labels stay inside the screen');
      const bar = await page.evaluate(() => { const b = document.getElementById('bar').getBoundingClientRect(); return [...document.querySelectorAll('.pin')].filter(p => p.style.display !== 'none').filter(p => { const r = p.querySelector('.tag').getBoundingClientRect(); return r.right > b.left && b.right > r.left && r.bottom > b.top && b.bottom > r.top; }).map(p => p.querySelector('.name').textContent); });
      console.log(name, 'pins under the control bar', JSON.stringify(bar));
      if (out) await page.screenshot({ path: `${out}/ui-${name}.png`, timeout: 600000 });
      // click the Market Row pin: the camera target should move to the market
      const before = await page.evaluate(() => ({ x: GL_PREVIEW.cam.x, z: GL_PREVIEW.cam.z, dist: GL_PREVIEW.cam.dist }));
      const target = await page.evaluate(() => GL_PREVIEW.map.places.find(p => p.id === 'market').focus);
      await page.evaluate(() => { const el = [...document.querySelectorAll('.pin')].find(p => p.querySelector('.name').textContent === 'Market Row'); if (el.style.display === 'none') GL_PREVIEW.cam.dist = 300; el.click(); });
      await page.waitForFunction(t => Math.abs(GL_PREVIEW.cam.dist - t.dist) < 30, target, { timeout: 300000 });
      const after = await page.evaluate(() => ({ x: GL_PREVIEW.cam.x, z: GL_PREVIEW.cam.z, dist: GL_PREVIEW.cam.dist }));
      console.log(name, 'pin click', JSON.stringify({ before, after, target }));
      assert.ok(Math.hypot(after.x - target.x, after.z - target.z) < Math.hypot(before.x - target.x, before.z - target.z), 'camera moved toward Market Row');
      // night toggle
      await page.evaluate(() => setTimeout(() => document.getElementById('tNight').click(), 0)); // DOM click: SwiftShader keeps the main thread busy
      await page.waitForFunction(() => GL_PREVIEW.map.night === true, null, { timeout: 300000 });
      const pressed = await page.getAttribute('#tNight', 'aria-pressed');
      assert.equal(pressed, 'true');
      if (out) { await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/ui-${name}-night-market.png`, timeout: 600000 }); }
      console.log(name, 'errors', JSON.stringify(errors));
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
