// Free walk QA (GOTR-0118): open the walk in the game at each district (phone 402x690, touch), walk with the keys and the
// touch stick, screenshot per district and language, report position, district, traffic, frame time and draw calls.
//   node qa/free-walk-city/walk.cjs <out dir> [lang=en] [places=oldtown,market,...] [time=day]
const { chromium } = require('playwright'), fs = require('fs');
const { serve, boot } = require('./serve.cjs');
const out = process.argv[2] || 'qa/free-walk-city/out', lang = process.argv[3] || 'en', places = (process.argv[4] || 'oldtown,market,docks,downtown,neon,dome,hill,tech,fair,cove,fort').split(','), time = process.argv[5] || '';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const s = await serve(), base = `http://localhost:${s.address().port}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 402, height: 690 }, hasTouch: true, deviceScaleFactor: 1 }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await boot(p, base, lang);
  if (time) await p.evaluate(t => localStorage.setItem('gotr.freewalk.time.v1', t), time);
  const snap = () => p.evaluate(() => FreeWalk.snapshot());
  const report = {};
  for (const id of places) {
    if (await p.evaluate(() => FreeWalk.playing)) await p.evaluate(() => FreeWalk.close('quiet'));
    const ok = await p.evaluate(id => FreeWalk.open({ start: id }), id);
    await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    const at = await snap();
    // walk: keys forward 3 s, then right 2 s
    const key = async (k, ms) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
    await key('ArrowUp', 3000); await key('ArrowRight', 1500);
    await p.waitForTimeout(500);
    const after = await snap();
    await p.screenshot({ path: `${out}/${lang}-${id}.png` });
    report[id] = { ok, start: at.s, end: after.s, moved: +Math.hypot(after.s.x - at.s.x, after.s.z - at.s.z).toFixed(1), zone: after.zone, district: after.district, cars: after.town.cars.length, walkers: after.town.walkers, perf: after.perf };
    console.log(id, JSON.stringify(report[id]));
  }
  fs.writeFileSync(`${out}/${lang}-report.json`, JSON.stringify({ lang, report, errors: errs.slice(0, 10) }, null, 1));
  console.log('errors', JSON.stringify(errs.slice(0, 8)));
  await b.close(); s.close();
})();
