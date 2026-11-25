// node qa/armpit-fold/sequence.cjs <outDir> [variant] — frame sequences of the shoulder in motion (studio, phone 402x690):
//   raise_0..8     the winner's arm raised by the referee (presentation { mode: 'winner', raise: 0 -> 1 }, right arm)
//   upper_0..8     the lead uppercut, phase 0 -> 1 (left arm)
// Frames <out>/<variant>/<raise_k|upper_k>-<shoulderR|shoulderL>-<view>.png. ROOT=<checkout> renders another tree; BACKFACE=1 as in batch.cjs.
const fs = require('fs'), path = require('path'), studio = require('../avatar-joins/studio.cjs');
const N = 9, VIEWS = (process.env.VIEWS || 'front,side,below,q34').split(',');
process.env.STUDIO_SETUP = `(() => { const B = AJ.POSES.box; for (let k = 0; k < ${N}; k++) {
  const u = k / ${N - 1};
  B['raise_' + k] = c => c.update(0, 'guard', 'one_two', { simulationTime: 0, presentation: { mode: 'winner', side: 'R', raise: u } });
  B['upper_' + k] = c => c.update(u * 1.22, 'uppercut', 'one_two', { simulationTime: u * 1.22 });
} })()`;
if (process.env.BACKFACE) process.env.STUDIO_AFTER = fs.readFileSync(path.join(__dirname, 'backface.js'), 'utf8');
(async () => {
  const [out, variant = 'lion-kit'] = process.argv.slice(2), ks = [...Array(N).keys()];
  await studio.run(out, variant, ks.map(k => 'raise_' + k), ['shoulderR'], VIEWS);
  await studio.run(out, variant, ks.map(k => 'upper_' + k), ['shoulderL'], VIEWS);
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
