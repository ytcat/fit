// node tests/avatar-joins.test.cjs — joins between the characters' parts (owner rule 2026-11-25, AGENTS.md "Avatars and character
// parts: joins must be checked"; audit qa/avatar-joins/AUDIT.md). CPU skinning = the vertex shader (rig.skinPoint), the same
// scripts and surface data as the page (rabbit body, shoulder correctives). Fails on the defects fixed by the audit:
//   1. boxing shorts openings: a saw-tooth hem and a jagged rim under the waistband (cap facets left along the cut)
//   2. glove cuff: the forearm came out through the strap front and back in the punches (a ragged fur rim on the black cuff)
//   3. side piping: a rigid tube on the thigh that sank into the shorts whenever the hip moved (a dashed, saw-toothed stripe)
//   4. street sneakers: a slit along the middle of the sole
// and guards every character variant (Fighter lion/rabbit in kit, street clothes and wraps; Bruno, Brick, Fang jacket/fight,
// Hazel, Otto, Rourke): finite skinning and no vertex flung off its bone (spikes) in rest, idle, walk, talk, arms up, guard,
// punches and a knockdown.
const assert = require('node:assert/strict'), path = require('node:path');
const lib = require('../qa/avatar-joins/lib.cjs'); lib.load(); process.chdir(path.join(__dirname, '..'));
const J = require('../qa/avatar-joins/joins-lib.cjs'), M = require('../qa/avatar-joins/metrics.cjs'), cast = require('../qa/avatar-joins/cast.cjs');
const fs = require('node:fs');
const { box, civil } = cast.POSES, results = {};

// 1-3: the boxing kit on every wearer of it (the Fighter in both species; Mack is the rabbit rig; Brick's own trunks)
for (const name of ['lion-kit', 'rabbit-kit', 'brick']) {
  const c = cast.make(name), r = results[name] = {};
  r.rim = J.shortsRim(c);
  assert.equal(r.rim.steep, 0, `${name}: shorts openings are clean cuts (no near-horizontal cap facets along the hems or the waist): ${JSON.stringify(r.rim)}`);
  assert.ok(r.rim.worst < .7, `${name}: the fabric runs straight into the openings (${r.rim.worst})`);
  // every opening is exactly on its line: the hems at .735, the waist under the waistband at 1.085
  { const P = c.shorts.geometry.attributes.position.array; let lo = 9, hi = -9; for (let i = 1; i < P.length; i += 3) { lo = Math.min(lo, P[i]); hi = Math.max(hi, P[i]); } assert.ok(Math.abs(lo - .735) < 1e-4 && Math.abs(hi - 1.085) < 1e-4, `${name}: shorts span .735-1.085 (${lo}, ${hi})`); }
  r.cuff = J.cuffEnvelope(c, box);
  assert.ok(r.cuff.worst <= .001, `${name}: the forearm stays inside the glove cuff in guard, every punch, slip, roll, block, hits and a knockdown (worst ${(r.cuff.worst * 1000).toFixed(1)} mm in ${r.cuff.at}, ${r.cuff.count} vertices)`);
  r.piping = J.pipingUnderShorts(c, { ...box, ...civil });
  if (name !== 'brick') {
    assert.equal(r.piping.pipes, 1, `${name}: one skinned side piping (both legs), not rigid tubes on the thighs`);
    const pipe = c.root.children.find(o => o.name === 'Satin side piping'); assert.ok(pipe?.isSkinnedMesh && pipe.skeleton === c.skeleton && pipe.visible, name + ': piping skinned to the rig');
    assert.ok(r.piping.worst < .1, `${name}: the piping stays on the shorts in every pose (${(r.piping.worst * 100).toFixed(1)} % under the fabric in ${r.piping.at})`);
    // dressing hides the piping with the shorts and brings it back with them
    StoryCast.outfit(c, 'street'); assert.equal(pipe.visible, false, name + ': no piping on the street clothes'); StoryCast.outfit(c, 'kit'); assert.equal(pipe.visible, true, name + ': piping back with the kit');
  } else { const pipe = c.root.children.find(o => o.name === 'Satin side piping'); assert.ok(!pipe || !pipe.visible, 'Brick: his trunks keep their own painted stripe (no gold piping)'); }
}

// 4: street sneakers have a closed sole
for (const name of ['lion-street', 'rabbit-street']) { const c = cast.make(name), r = results[name] = { sole: J.soleSlit(c) }; assert.equal(r.sole.open, 0, `${name}: no slit through the sneaker soles (${r.sole.open} open edges)`); }

// guard: every character variant, the poses each one does (subset), no NaN and no vertex flung away from its bone
const SPIKE = +(process.env.AJ_SPIKE || .15); // the largest normal bulge (crouch, muscle flex, blend) is 10.5 cm (Rourke down); a flung vertex is far more
const SET = { box: ['guard', 'jab', 'hook', 'uppercut', 'hit_head', 'down'], civil: ['idle', 'walkA', 'talk', 'arms_up', 'mop'], ref: ['count'] };
for (const name of Object.keys(cast.VARIANTS)) {
  const c = cast.make(name), dom = M.dominant(c.skin), poses = cast.posesFor(name), rest = c.skin.geometry.attributes.position.array, n = rest.length / 3;
  J.pose(c, poses.bind); const inv = c.root.matrixWorld.clone().invert(), bones0 = c.bones.map(b => b.getWorldPosition(M.V()).applyMatrix4(inv));
  const d0 = new Float32Array(n); for (let i = 0; i < n; i++) { const b = bones0[dom[i]]; d0[i] = Math.hypot(rest[i * 3] - b.x, rest[i * 3 + 1] - b.y, rest[i * 3 + 2] - b.z); }
  let worst = 0, at = '';
  for (const p of ['bind', ...cast.VARIANTS[name].sets.flatMap(s => SET[s])]) {
    J.pose(c, poses[p]); const s = M.skinAll(c, c.skin), inv2 = c.root.matrixWorld.clone().invert(), bones = c.bones.map(b => b.getWorldPosition(M.V()).applyMatrix4(inv2));
    for (let i = 0; i < n; i++) { const x = s[i * 3], y = s[i * 3 + 1], z = s[i * 3 + 2]; assert.ok(Number.isFinite(x + y + z), `${name} ${p}: finite skin`); const b = bones[dom[i]], g = Math.hypot(x - b.x, y - b.y, z - b.z) - d0[i]; if (g > worst) { worst = g; at = p; } }
  }
  results[name] = { ...results[name], spike: { worst: +worst.toFixed(4), at } };
  assert.ok(worst < SPIKE, `${name}: no skin vertex moves more than ${SPIKE * 100} cm away from its bone in any pose (worst ${(worst * 100).toFixed(1)} cm in ${at})`);
}
if (process.env.AJ_OUT) fs.writeFileSync(process.env.AJ_OUT, JSON.stringify(results, null, 1));
console.log(JSON.stringify(results));
console.log('PASS avatar joins: clean shorts openings, forearm inside the glove cuff, skinned piping on the shorts, closed sneaker soles, no spikes on any character');
