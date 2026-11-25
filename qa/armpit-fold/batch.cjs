// node qa/armpit-fold/batch.cjs <outDir> [variant ...] — shoulder/armpit close-ups (both sides, 5 views: front, side, back,
// below, 3/4) of every character variant in every pose it does, rendered by qa/avatar-joins/studio.cjs at phone size 402x690.
// BACKFACE=1 paints visible back faces magenta (qa/armpit-fold/backface.js) for qa/armpit-fold/count.py. ROOT=<checkout> for
// another tree (before pictures). POSES=a,b,c / JOINS=... / VIEWS=... narrow the set.
const fs = require('fs'), path = require('path');
const studio = require('../avatar-joins/studio.cjs'), P = require('../avatar-joins/poses.js');
const POSES = (process.env.POSES || 'bind,idle,talk,walkA,walkB,jog,guard,jab,cross,hook,rear_hook,uppercut,rear_uppercut,slip,roll,block,hit_head,hit_body,down,arms_up,carry,mop,bend,point,wave,cross_arms,count,raise').split(',');
const JOINS = (process.env.JOINS || 'shoulderL,shoulderR').split(','), VIEWS = (process.env.VIEWS || 'front,side,back,below,q34').split(',');
if (process.env.BACKFACE) process.env.STUDIO_AFTER = fs.readFileSync(path.join(__dirname, 'backface.js'), 'utf8');
(async () => {
  const [out, ...want] = process.argv.slice(2);
  for (const v of (want.length ? want : Object.keys(P.VARIANTS))) {
    const have = P.posesFor(v), poses = POSES.filter(p => have[p]);
    await studio.run(out, v, poses, JOINS, VIEWS);
  }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
