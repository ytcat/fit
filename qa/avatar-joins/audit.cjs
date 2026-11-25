// node qa/avatar-joins/audit.cjs [variant ...] — numeric join audit of every character variant across its pose set.
// Writes qa/avatar-joins/audit-<variant>.json and prints the flagged findings. ROOT=<checkout> audits another tree (before).
const fs = require('node:fs'), path = require('node:path');
const lib = require('./lib.cjs'); lib.load();
const M = require('./metrics.cjs'), cast = require('./cast.cjs');
const OUT = process.env.OUT || __dirname;
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cast.VARIANTS);
const shown = (o, root) => { for (let q = o; q && q !== root; q = q.parent) if (!q.visible) return false; return o.visible; };
const handOf = (c, o) => { for (let q = o; q && q !== c.root; q = q.parent) { if (q === c.joints.handL) return 'L'; if (q === c.joints.handR) return 'R'; } return null; };
const boneOf = (c, o) => { for (let q = o; q && q !== c.root; q = q.parent) if (q.isBone) return q.name; return 'root'; };

function auditVariant(name) {
  const t0 = Date.now(), c = cast.make(name), poses = cast.posesFor(name), out = { variant: name, poses: {} };
  const arm = c.skin.geometry.attributes.coachArmBlend.array;
  for (const [pose, fn] of Object.entries(poses)) {
    fn(c); c.root.updateMatrixWorld(true); c.syncSkin();
    const skin = M.skinAll(c, c.skin), res = { skin: M.stretch(c, c.skin, skin), crease: { skin: M.creases(c, c.skin, skin) } };
    const cloths = []; c.root.traverse(o => { if (o.isSkinnedMesh && o !== c.skin && shown(o, c.root)) cloths.push(o); });
    res.cloth = {}; const clothPosed = [];
    for (const m of cloths) { const p = M.skinAll(c, m); clothPosed.push([m, p]); res.cloth[m.name || 'cloth'] = M.stretch(c, m, p); if (m !== c.bodyFur) res.crease[m.name || 'cloth'] = M.creases(c, m, p); }
    // the body that hands may not enter: trunk, head and legs (not the arms), skin as drawn plus any skinned clothes over it
    const trunk = M.bodyField(c, skin, i => arm[i] < .3), clothF = clothPosed.filter(([m]) => m !== c.shorts).map(([m, p]) => M.bodyField(c, p, null, m));
    const sd = (x, y, z) => { let best = trunk.sd(x, y, z); for (const f of clothF) { const r = f.sd(x, y, z); if (Math.abs(r.d) < Math.abs(best.d)) best = r; } return best; };
    const field = { sd };
    res.hands = {};
    for (const side of ['L', 'R']) {
      const parts = []; c.joints['hand' + side].traverse(o => { if (o.isMesh && shown(o, c.root) && o.geometry.attributes.position) parts.push(o); });
      let worst = { depth: 0 }; for (const p of parts) { const r = M.penetration(field, M.rigidPoints(c, p, 3)); if (r.depth > worst.depth) worst = { ...r, part: p.name }; }
      res.hands[side] = worst;
    }
    // arm skin through the trunk (elbow into ribs, upper arm through the chest)
    const armPts = []; for (let i = 0; i < arm.length; i += 2) if (arm[i] > .9) armPts.push(skin[i * 3], skin[i * 3 + 1], skin[i * 3 + 2]);
    res.armInTrunk = M.penetration(trunk, new Float32Array(armPts));
    // rigid parts (not on the hands): gap to the body and depth under it
    res.parts = {};
    c.root.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || !shown(o, c.root) || handOf(c, o) || !o.geometry.attributes.position || o.geometry.attributes.position.count < 20) return;
      const pts = M.rigidPoints(c, o, Math.max(1, Math.floor(o.geometry.attributes.position.count / 300))), key = boneOf(c, o) + ':' + (o.name || 'part') + ':' + o.id;
      res.parts[key] = { gap: M.partGap(field, pts), pen: M.penetration(field, pts) }; });
    out.poses[pose] = res;
  }
  fs.writeFileSync(path.join(OUT, 'audit-' + name + '.json'), JSON.stringify(out, (k, v) => typeof v === 'number' ? +v.toFixed(4) : v));
  console.log(name, 'done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  return out;
}
for (const n of want) auditVariant(n);
