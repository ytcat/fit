// How long each harness stage takes on this machine (loading, seeking, stepping, measuring, a picture).
const path = require('path'), { open, film } = require('./harness.cjs');
(async () => {
  const t0 = Date.now(), log = m => console.log(((Date.now() - t0) / 1000).toFixed(1), m);
  const h = await open(process.argv[2] || 'lion'); log('loaded'); const p = h.page;
  await p.addScriptTag({ path: path.join(__dirname, 'probe.js') });
  await film(p, 'dream_otto_shop'); log('film');
  await p.evaluate(() => DreamScenes.debug.seek(27)); log('seek');
  for (let i = 0; i < 5; i++) await p.evaluate(() => __armQA.step(1 / 60)); log('5 steps');
  for (let i = 0; i < 5; i++) await p.evaluate(() => { __armQA.step(1 / 60); return __armQA.carry({}); }); log('5 carry');
  await p.evaluate(() => { __armQA.step(1 / 60); return __armQA.carry({ body: true }); }); log('1 body');
  await p.evaluate(() => __armQA.filmView()); await p.screenshot({ path: path.join(process.argv[3] || '.', 'timing.png') }); log('shot');
  console.log(JSON.stringify(await p.evaluate(() => __armQA.carry({ body: true }))));
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
