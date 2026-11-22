// Grip probe: puts the mop head at a few places (through the core, no touch), lets the body settle and prints the
// hands-on-handle numbers. usage: node qa/mop-night/grip-probe.cjs [outdir]
const { open, launchShift, frames } = require('./launch.cjs'), path = require('path');
(async () => {
  const out = process.argv[2]; const { p, close } = await open();
  try {
    await launchShift(p); await frames(p, 4);
    for (const [x, z] of (process.env.PTS ? JSON.parse(process.env.PTS) : [[1.65, .3], [1.0, .4], [2.3, .2], [1.65, -1.2], [.3, 1.2], [3.0, -1.4]])) {
      await p.evaluate(([x, z]) => { const s = StoryScenes.debug.sim; s.point = { x, z }; }, [x, z]); await frames(p, 30);
      const q = await p.evaluate(() => { const q = StoryScenes.debug.memo.qa; return { dbg: q.dbg, both: q.both, top: q.top, low: q.low, headOff: q.headOff, apart: q.apart, jL: q.jL, jR: q.jR, body: q.body, handle: q.handle, feet: q.feet.map(f => f.planted) }; });
      console.log(x, z, JSON.stringify(q));
      if (out) await p.screenshot({ path: path.join(out, `grip-${x}-${z}.png`) });
    }
  } finally { await close(); }
})().catch(e => { console.error(e); process.exit(1); });
