// prints per-frame rows of a measure.cjs run: node qa/ch1-motion/rows.cjs <run.json> <actor> <t0> <t1>
const d = require(require('path').resolve(process.argv[2])), id = process.argv[3] || 'fighter', t0 = +process.argv[4] || 0, t1 = +process.argv[5] || 1e9;
for (const r of d.rows) {
  const a = r.a[id]; if (!a || r.t < t0 || r.t > t1) continue;
  const f = a.feet.map(f => `${f.ball.map(v => v.toFixed(3)).join(',')}|h${Math.min(f.ball[1] - f.g, f.heel[1] - f.gh).toFixed(3)}|y${f.yaw.toFixed(2)}`);
  console.log(r.t.toFixed(3), r.shot, a.vis ? 'V' : '-', `root ${a.x.toFixed(3)},${a.y.toFixed(3)},${a.z.toFixed(3)} ry${a.ry.toFixed(2)} hipY ${a.hips[1].toFixed(3)} head${a.yHead.toFixed(2)} chest${a.yChest.toFixed(2)}`, 'L', f[0], 'R', f[1]);
}
