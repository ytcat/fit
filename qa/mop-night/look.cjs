// Quick look at the night shift: start picture, a few real touch strokes, a dirty-mop picture, a rinse, numbers.
// usage: node qa/mop-night/look.cjs <outdir> [lang]
const { open, launchShift, frames } = require('./launch.cjs'), path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || path.join(__dirname, 'look'); fs.mkdirSync(out, { recursive: true });
  const { p, touch, close, errors } = await open({ lang: process.argv[3] || 'en' });
  const probe = () => p.evaluate(() => { const d = StoryScenes.debug, v = d.sim.view(); return { marks: v.score, load: +v.load.toFixed(2), left: +v.left.toFixed(1), rinses: v.rinses, smears: v.smears, streak: v.best, qa: d.memo.qa, stats: StoryScenes.stats() }; });
  const proj = (x, z) => p.evaluate(([x, z]) => StoryScenes.debug.projectFloor(x, z), [x, z]);
  const waitHead = (x, z, tol = .06) => p.waitForFunction(([x, z, tol]) => { const h = StoryScenes.debug.sim.point; return Math.hypot(h.x - x, h.z - z) < tol && !StoryScenes.debug.sim.lift; }, [x, z, tol], { timeout: 120000 });
  try {
    await launchShift(p); await frames(p, 6);
    const R = await p.evaluate(() => MopCore.MOP);
    console.log('corners', JSON.stringify(await Promise.all([[R.minX, R.minZ], [R.maxX, R.minZ], [R.minX, R.maxZ], [R.maxX, R.maxZ], [R.bucket.x, R.bucket.z]].map(([x, z]) => proj(x, z)))));
    await p.screenshot({ path: path.join(out, '01-start.png') });
    const row = async (z, x0, x1) => {
      const a = await proj(x0, z); await touch('touchStart', [a]); await waitHead(x0, z);
      for (let k = 1; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8, b = await proj(x, z); await touch('touchMove', [b]); await waitHead(x, z, .1); }
    };
    const X0 = R.minX + .1, X1 = R.maxX - .1;
    await row(-2.05, X0, X1); await row(-1.8, X1, X0);
    await p.screenshot({ path: path.join(out, '02-mopping.png') });
    console.log('after 2 rows', JSON.stringify(await probe()));
    await row(-1.55, X0, X1); await row(-1.3, X1, X0);
    await touch('touchEnd'); await frames(p, 3);
    console.log('after 4 rows', JSON.stringify(await probe()));
    await p.screenshot({ path: path.join(out, '03-dirty-mop.png') });
    const btn = await p.locator('.mop-night-rinse').boundingBox(); await touch('touchStart', [{ x: btn.x + btn.width / 2, y: btn.y + btn.height / 2 }]); await touch('touchEnd');
    await p.waitForFunction(() => StoryScenes.debug.memo.qa?.phase === 'wring', null, { timeout: 60000 });
    await p.screenshot({ path: path.join(out, '04-rinsing.png') });
    await p.waitForFunction(() => !StoryScenes.debug.sim.rinsing, null, { timeout: 60000 }); await frames(p, 3);
    console.log('after rinse', JSON.stringify(await probe()));
    await row(.2, X0, X1); await row(.45, X1, X0); await touch('touchEnd'); await frames(p, 2);
    await p.screenshot({ path: path.join(out, '05-wet-trail.png') });
    console.log('end', JSON.stringify(await probe()), 'errors', errors);
  } finally { await close(); }
})().catch(e => { console.error(e); process.exit(1); });
