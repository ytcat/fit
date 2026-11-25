// node tests/armpit-fold.test.cjs — the armpit / shoulder fold (GOTR-0127, qa/avatar-joins/AUDIT.md #5-#7, qa/armpit-fold/).
// CPU skinning = the vertex shader (rig.skinPoint), the page's scripts and surface data (rabbit body, shoulder correctives).
// Fails on the old code:
//   #5 the bare skin folded through itself along the front and back armpit folds: the REST surface already crossed itself
//      (the torso relief jumped ~2 cm at |x| = .30), and the "connected axillary surface" projection collapsed both sides of
//      the pit onto one sheet (crossings, visible back faces and 9 cm webs across the pit in the punches);
//   #6 the street hoodie, cut from that rest surface, had grooves and slits in the armhole (crossing cloth at rest);
//   #7 clothes made on the skin's streams (Bruno, Fang, Hazel, Otto) crossed themselves in the concave armpit creases.
// Counts are crossing triangle pairs of one surface (skin, or the hoodie body) in the shoulder region (qa/armpit-fold/axilla.cjs).
const assert = require('node:assert/strict'), path = require('node:path');
const lib = require('../qa/avatar-joins/lib.cjs'); lib.load(); process.chdir(path.join(__dirname, '..'));
const cast = require('../qa/avatar-joins/cast.cjs'), M = require('../qa/avatar-joins/metrics.cjs'), AX = require('../qa/armpit-fold/axilla.cjs');
const results = {}, { box, civil } = cast.POSES;
const restX = (mesh, reg) => AX.selfIntersections(mesh, mesh.geometry.attributes.position.array, AX.regionMask(mesh, reg)).pairs;
const posedX = (c, mesh, fn, reg) => { AX.pose(c, fn); return AX.selfIntersections(mesh, M.skinAll(c, mesh), AX.regionMask(mesh, reg)).pairs; };

// #5 a: the torso relief is continuous: two rest points a hair apart on either side of the old borders stay together
{ const c = new LionCoach(lib.data());
  for (const sign of [-1, 1]) for (const z of [-.14, 0, .14]) for (const [x, y, dx, dy] of [[.30, 1.45, 1e-5, 0], [.30, 1.56, 1e-5, 0], [.30, 1.65, 1e-5, 0], [.20, 1.12, 0, 1e-5], [.20, 1.70, 0, 1e-5]]) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([sign * (x - dx), y - dy, z, sign * (x + dx), y + dy, z, sign * (x + .01), y + .01, z + .01], 3)); g.setIndex([0, 1, 2]);
    c.sculptBody(g); const p = g.attributes.position, gap = new THREE.Vector3().fromBufferAttribute(p, 0).distanceTo(new THREE.Vector3().fromBufferAttribute(p, 1));
    assert.ok(gap < 2e-4, `torso relief continuous across |x| ${x}, y ${y}, z ${z} (rest points 0.02 mm apart end ${(gap * 1000).toFixed(1)} mm apart)`); g.dispose();
  } }

// #5 b: the bare rest surface does not cross itself round the shoulders (Fighter lion and rabbit; Mack = the rabbit rig)
for (const name of ['lion-kit', 'rabbit-kit']) {
  const c = cast.make(name), r = results[name] = { restX: restX(c.skin) };
  assert.equal(r.restX, 0, `${name}: the rest skin does not cross itself along the armpit folds (${r.restX} crossing triangle pairs)`);
  assert.ok(c.shoulderData && c.skin.geometry.attributes.shoulderDelta, `${name}: the guard shoulder corrective validates against the rest surface`);
  // #5 c: the pit is the skinned surface itself, one connected sheet: no web across the pit in guard and the punches
  const g = c.skin.geometry, mask = g.attributes.avatarAxilla, tri = g.index.array, sel = [];
  for (let i = 0; i < tri.length; i += 3) if ([0, 1, 2].some(k => mask.getX(tri[i + k]) > .9)) sel.push(i);
  let web = 0, at = '';
  for (const move of ['guard', 'jab', 'cross', 'hook', 'rear_hook', 'uppercut', 'rear_uppercut']) for (const phase of [.18, .46, .78]) {
    c.update(phase * 1.22, move, 'one_two', { simulationTime: phase * 1.22 }); const s = M.skinAll(c, c.skin);
    for (const i of sel) for (let k = 0; k < 3; k++) { const a = tri[i + k] * 3, b = tri[i + (k + 1) % 3] * 3, e = Math.hypot(s[a] - s[b], s[a + 1] - s[b + 1], s[a + 2] - s[b + 2]); if (e > web) { web = e; at = move + ' ' + phase; } }
  }
  r.web = +web.toFixed(4);
  assert.ok(web < .045, `${name}: no web across the pit (longest pit edge ${(web * 100).toFixed(1)} cm in ${at}; the projection made 9 cm)`);
  // #5 d: raised arm (celebration, the referee's raise of the winner's arm), the lead and rear uppercut, guard: few crossings
  // left in the shoulder region (contact of the arm against the chest, hidden), far below the old fold
  r.posed = {};
  for (const [p, fn, max] of [['arms_up', civil.arms_up, 260], ['uppercut', box.uppercut, 480], ['rear_uppercut', box.rear_uppercut, 1100], ['guard', box.guard, 560], ['walkA', civil.walkA, 360]]) {
    const x = r.posed[p] = posedX(c, c.skin, fn);
    assert.ok(x <= max, `${name} ${p}: the armpit skin does not fold through itself (${x} crossing triangle pairs > ${max})`);
  }
}

// #6 the street hoodie: no crossing cloth in the armhole at rest, in the guard and in the walk
for (const name of ['lion-street', 'rabbit-street']) {
  const c = cast.make(name), cloth = c.root.children.find(o => o.userData.streetCloth && o.visible), reg = { x0: .22, x1: .52, y0: 1.30, y1: 1.62 };
  const r = results[name] = { restX: restX(cloth, reg) };
  // 4 pairs are left under the arm at the front (8 triangles of 1-3 mm, not visible in the close-ups: qa/armpit-fold/)
  assert.ok(r.restX <= 8, `${name}: the hoodie armhole does not cross itself at rest (${r.restX} crossing triangle pairs; 740 before)`);
  for (const [p, fn, max] of [['guard', box.guard, 600], ['walkA', civil.walkA, 40]]) { const x = r[p] = posedX(c, cloth, fn, reg); assert.ok(x <= max, `${name} ${p}: no slits in the hoodie armhole (${x} crossing pairs > ${max})`); }
}

// #7 clothes made on the skin's streams: they bridge the armpit crease instead of crossing it
const WALK = { bruno: 1350, 'fang-jacket': 1350, hazel: 120, otto: 550 }; // crossings in the walk: before 4,889 / 3,192 / 1,083 / 838
for (const name of ['bruno', 'fang-jacket', 'hazel', 'otto']) {
  const c = cast.make(name), r = results[name] = { restX: restX(c.skin, { ...AX.REGION, y1: 1.80 }) };
  assert.equal(r.restX, 0, `${name}: the clothes on the skin do not cross themselves in the armpit (${r.restX} crossing triangle pairs at rest)`);
  if (c.castFight) { const g = c.skin.geometry, keep = g.attributes.position; g.setAttribute('position', c.castFight.position); r.fightRestX = restX(c.skin, { ...AX.REGION, y1: 1.80 }); g.setAttribute('position', keep); assert.equal(r.fightRestX, 0, `${name}: the fight top does not cross itself in the armpit (${r.fightRestX})`); }
  r.walkA = posedX(c, c.skin, civil.walkA, { ...AX.REGION, y1: 1.80 });
  assert.ok(r.walkA <= WALK[name], `${name} walk: the armpit folds of the clothes do not crack (${r.walkA} crossing pairs > ${WALK[name]})`);
}
console.log(JSON.stringify(results));
console.log('PASS armpit fold: continuous rest surface, no crossing at rest, no pit web, raised-arm / uppercut / guard / walk folds bounded; hoodie armhole and clothes on the skin clean');
