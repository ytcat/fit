// Otto's shop: the Fighter picks up the new heavy bag and carries it out (GOTR-0103 follow-up, arm-fixes).
// usage: node qa/arm-fixes/otto-carry.cjs <lion|rabbit> <outdir> [from] [to]
// Steps the film at 60 fps from `from` to `to` (scene seconds), measures every frame (qa/arm-fixes/probe.js carry()),
// body penetration every 6th frame, and saves pictures at SHOTS times from the film camera, the side, the three-quarter
// view and a side close-up. Writes <outdir>/<species>-carry.json.
const path = require('path'), fs = require('fs');
const { open, film } = require('./harness.cjs');
const species = process.argv[2] || 'lion', out = process.argv[3] || path.join(__dirname, 'out'), from = +(process.argv[4] || 23.0), to = +(process.argv[5] || 31.2);
const SHOTS = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number);
const VIEWS = (process.env.VIEWS || 'film,side,tq,close').split(',');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const h = await open(species), p = h.page;
  await p.addScriptTag({ path: path.join(__dirname, 'probe.js') });
  await film(p, 'dream_otto_shop');
  await p.evaluate(t => __armQA.seek(t), from - .5);
  for (let i = 0; i < 30; i++) await p.evaluate(() => __armQA.step(1 / 60)); // settle into the moment
  const rows = [], shots = SHOTS.slice().sort((a, b) => a - b);
  for (let n = 0; ; n++) {
    const t = await p.evaluate(() => DreamScenes.debug.t); if (t >= to) break;
    const row = await p.evaluate(body => { __armQA.step(1 / 60); return __armQA.carry({ body }); }, n % 6 === 0);
    rows.push(row);
    while (shots.length && row.t >= shots[0]) {
      const s = shots.shift();
      for (const v of VIEWS) {
        await p.evaluate(v => { const c = DreamScenes.debug.rigs.fighter; if (v === 'side') __armQA.view(c, 90, 3.4, 1.5, 44, 1.3); else if (v === 'tq') __armQA.view(c, 40, 2.3, 1.65, 48, 1.3); else if (v === 'close') __armQA.view(c, 60, 1.9, 1.75, 40, 1.65); else if (v === 'back') __armQA.view(c, 150, 2.6, 1.6, 36, 1.3); else __armQA.filmView(); }, v);
        await p.screenshot({ path: path.join(out, `${species}-${v}-${s.toFixed(2)}.png`) });
      }
    }
  }
  fs.writeFileSync(path.join(out, `${species}-carry.json`), JSON.stringify(rows));
  // summary over the frames where the bag is with him (shoulder / lift): contact and jumps
  const held = rows.filter(r => r.pawGap != null && r.bag && Math.hypot(r.bag.pos[0], r.bag.pos[2]) < .8);
  const max = (a, f) => a.reduce((m, r) => Math.max(m, f(r)), -1e9), min = (a, f) => a.reduce((m, r) => Math.min(m, f(r)), 1e9);
  const sum = {
    species, frames: rows.length, held: held.length,
    pawGap: held.length ? [min(held, r => r.pawGap), max(held, r => r.pawGap)] : null,
    wristJumpMax: max(rows, r => r.wristJump), shoulderTwistMax: max(rows, r => r.shoulderTwist), handStepMax: max(rows, r => r.handStep), bagStepMax: max(rows, r => r.bagStep || 0),
    elbowBackMax: held.length ? max(held, r => r.elbow.back) : null, elbowOutMin: held.length ? min(held, r => r.elbow.out) : null, elbowZMin: held.length ? min(held, r => r.elbow.z) : null,
    bodyMin: min(rows.filter(r => r.body), r => r.body.min), bodyInsideMax: max(rows.filter(r => r.body), r => r.body.inside), armInsideMax: max(rows.filter(r => r.body), r => r.body.armInside),
    errors: h.errors
  };
  console.log(JSON.stringify(sum));
  fs.writeFileSync(path.join(out, `${species}-summary.json`), JSON.stringify(sum, null, 1));
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
