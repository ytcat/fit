// Story walk QA (GOTR-0122): the free walk as it was before this branch (v1.94): the full phone view and a close-up of the
// joystick idle and held (a real CDP touch). node qa/story-walk/before.cjs <out dir>
const { chromium } = require('playwright'), fs = require('fs');
const { serve, boot } = require('../free-walk-city/serve.cjs');
const out = process.argv[2] || 'qa/story-walk/before'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const s = await serve(), base = `http://localhost:${s.address().port}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 402, height: 690 }, hasTouch: true }), p = await ctx.newPage();
  await boot(p, base, 'en');
  await p.evaluate(() => FreeWalk.open({ start: 'oldtown' }));
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/phone-walk.png` });
  const r = await p.evaluate(() => { const b = document.querySelector('.fw-stick').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const clip = { x: 0, y: Math.max(0, r.y - 40), width: 220, height: 690 - Math.max(0, r.y - 40) };
  await p.screenshot({ path: `${out}/stick-idle.png`, clip });
  const cdp = await ctx.newCDPSession(p), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 22, y: cy - 30, id: 1 }] });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/stick-held.png`, clip });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await b.close(); s.close();
})();
