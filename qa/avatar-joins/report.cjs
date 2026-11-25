// node qa/avatar-joins/report.cjs <dir> [variant ...] — condenses audit-<variant>.json into the flagged findings.
// Thresholds: edge stretch > 1.9x or < 0.4x (>= 2 mm edges), folded triangles (> 6 in a region), hand part > 1.2 cm under the
// body, arm skin > 2 cm inside the trunk, a rigid part that floats > 1.5 cm more than in the first pose or sinks > 2.5 cm deeper.
const fs = require('node:fs'), path = require('node:path');
const dir = process.argv[2], only = process.argv.slice(3);
const files = fs.readdirSync(dir).filter(f => /^audit-.*\.json$/.test(f) && (!only.length || only.includes(f.slice(6, -5))));
const r3 = a => a ? a.map(v => +(+v).toFixed(3)).join(',') : '';
for (const f of files) {
  const A = JSON.parse(fs.readFileSync(path.join(dir, f))), lines = [], first = Object.values(A.poses)[0];
  for (const [pose, R] of Object.entries(A.poses)) {
    for (const [mesh, regs] of [['skin', R.skin], ...Object.entries(R.cloth).map(([k, v]) => ['cloth:' + k, v])]) for (const [reg, s] of Object.entries(regs)) {
      if (s.maxRatio > 1.9) lines.push(`${pose} ${mesh} ${reg}: stretch x${s.maxRatio.toFixed(2)} (p99.9 ${s.p999.toFixed(2)}) at ${r3(s.worstMax)}`);
      if (s.minRatio < .4) lines.push(`${pose} ${mesh} ${reg}: squash x${s.minRatio.toFixed(2)} (p0.1 ${s.p001.toFixed(2)}) at ${r3(s.worstMin)}`);
      if (s.folds > 6) lines.push(`${pose} ${mesh} ${reg}: ${s.folds} folded triangles of ${s.tris}, e.g. at ${r3(s.worstFold)}`);
    }
    for (const [side, h] of Object.entries(R.hands)) if (h.depth > .012) lines.push(`${pose} hand${side} ${h.part}: ${(h.depth * 100).toFixed(1)} cm under the body (${h.count} pts) at ${r3(h.at)}`);
    if (R.armInTrunk.depth > .02) lines.push(`${pose} arm skin ${(R.armInTrunk.depth * 100).toFixed(1)} cm inside the trunk (${R.armInTrunk.count} pts) at ${r3(R.armInTrunk.at)}`);
    for (const [k, p] of Object.entries(R.parts)) { const b = first.parts[k]; if (!b) continue;
      if (p.gap - b.gap > .015) lines.push(`${pose} part ${k.replace(/:\d+$/, '')}: gap ${(b.gap * 100).toFixed(1)} -> ${(p.gap * 100).toFixed(1)} cm`);
      if (p.pen.depth - b.pen.depth > .025) lines.push(`${pose} part ${k.replace(/:\d+$/, '')}: under the body ${(b.pen.depth * 100).toFixed(1)} -> ${(p.pen.depth * 100).toFixed(1)} cm at ${r3(p.pen.at)}`); }
  }
  console.log('=== ' + A.variant + ' (' + lines.length + ')'); for (const l of lines) console.log('  ' + l);
}
