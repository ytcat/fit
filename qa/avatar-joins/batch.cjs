// node qa/avatar-joins/batch.cjs <outDir> [variant ...] — close-up frames of the audit pose subset for each variant (studio.cjs).
const studio = require('./studio.cjs'), P = require('./poses.js');
const SUBSET = { box: ['guard', 'hook', 'uppercut', 'down'], civil: ['idle', 'walkA', 'talk', 'arms_up', 'mop'], ref: ['count'] };
(async () => {
  const out = process.argv[2], names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(P.VARIANTS);
  for (const n of names) {
    const poses = [...new Set(P.VARIANTS[n].sets.flatMap(s => SUBSET[s]))];
    const t0 = Date.now(); await studio.run(out, n, poses, Object.keys(studio.JOINS), Object.keys(studio.VIEWS)); console.log(n, ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
