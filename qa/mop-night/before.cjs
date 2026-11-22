// The shift as it was (v1.91 candidate): launch it and take two pictures at 402x690.
// usage: node qa/mop-night/before.cjs [outdir]
const { open, launchShift, frames } = require('./launch.cjs'), path = require('path');
(async () => {
  const out = process.argv[2] || __dirname; const { p, touch, close, errors } = await open();
  try {
    await launchShift(p); await frames(p, 8);
    await p.screenshot({ path: path.join(out, 'before-01-start.png') });
    const pts = await p.evaluate(() => MopCore.MOP.spots.slice(0, 3).flatMap(([x, z]) => [StoryScenes.debug.projectFloor(x - .42, z), StoryScenes.debug.projectFloor(x + .42, z)]));
    for (let i = 0; i < pts.length; i += 2) { await touch('touchStart', [pts[i]]); for (let k = 1; k <= 6; k++) await touch('touchMove', [{ x: pts[i].x + (pts[i + 1].x - pts[i].x) * k / 6, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k / 6 }]); await frames(p, 1); if (i < pts.length - 2) await touch('touchEnd'); }
    await frames(p, 4); await p.screenshot({ path: path.join(out, 'before-02-mopping.png') }); await touch('touchEnd');
    console.log('errors', errors);
  } finally { await close(); }
})().catch(e => { console.error(e); process.exit(1); });
