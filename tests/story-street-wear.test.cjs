// node tests/story-street-wear.test.cjs — GOTR-0093: the Fighter's street clothes are worn, not painted on.
// The clothes are their own mesh skinned to the rig (same skeleton, bind and shader), the body under them is not drawn,
// no drawn body vertex ends up outside the cloth in a set of poses (walk, talk, strap, arms up, bend, bare-hand guard,
// punch; also inside a mirrored parent), the duffel never cuts the arm or leg on a walk, and the kit comes back exactly.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/lion-paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SW = StoryCast.streetWear; assert.ok(SW, 'street-wear.js registers on StoryCast');

// page wiring: loaded after story-cast.js, with its own version tag, cached offline
{ const html = fs.readFileSync('index.html', 'utf8'), man = fs.readFileSync('offline-manifest.json', 'utf8');
  assert.ok(/\.\/adventure\/story\/street-wear\.js\?v=\d+/.test(html) && html.indexOf('story-cast.js') < html.indexOf('street-wear.js') && html.indexOf('street-wear.js') < html.indexOf('dream-scenes.js'), 'street-wear.js loads after story-cast.js, before the scenes');
  assert.ok(man.includes('adventure/story/street-wear.js'), 'street-wear.js is cached offline'); }

const G = DreamPose.GESTURES; G.__up = { h: [.26, 2.12, .12], pole: [.6, -.2, -.6], palm: [0, 0, 1], turn: .4 };
const POSES = {
  idle: c => DreamPose.civil(c, { t: 1, dist: 0 }),
  strap: c => DreamPose.civil(c, { t: 1, dist: 0, arms: { R: 'strap' } }),
  talk: c => DreamPose.civil(c, { t: 2.3, dist: 0, arms: { L: 'open', R: 'open' }, talk: .6 }),
  cross: c => DreamPose.civil(c, { t: 1, dist: 0, arms: { L: 'cross', R: 'cross2' } }),
  armsUp: c => DreamPose.civil(c, { t: 1, dist: 0, arms: { L: '__up', R: '__up' } }),
  bend: c => DreamPose.civil(c, { t: 1, dist: 0, lean: .45, drop: .12, arms: { L: 'carry', R: 'carry' } }),
  walkA: c => DreamPose.civil(c, { t: .3, dist: .45, walk: 1 }),
  walkB: c => DreamPose.civil(c, { t: .7, dist: 1.05, walk: 1 }),
  guard: c => c.update(1, 'guard', 'one_two', { guardCover: 1 }),
  punch: c => c.update(.35, 'combo', 'one_two')
};
const covered = (c, i, P) => { const L = SW.lines, x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], a = c.skin.geometry.attributes.coachArmBlend.array[i], ax = Math.abs(x);
  if (a >= .5) return ax < L.CUFF - .006 ? 'H' : null;
  const th = Math.atan2(x, z), r = Math.hypot(x, z + .012), neck = L.neckY(Math.atan2(x, z + .012)) + 1.1 * Math.max(0, r - .128);
  return y > L.HEM + .006 && y < Math.min(1.79, neck - .014) ? 'H' : y < L.waistY(th) - .006 && y > L.hemJ(Math.atan2(ax - L.LEG_X, z)) + .006 ? 'J' : null; };

const CAND = new WeakMap();
/** For each drawn body vertex that should be covered: the cloth vertices of its garment that grew within 4 cm of it (rest pose). */
function candidates(c, nMain, nH) {
  if (CAND.has(c)) return CAND.get(c);
  const shape = StoryCast.streetWear.clothFor(c, '').shape, B = c.storyCast.base.position.array, orig = [...shape.parts.H.orig, ...shape.parts.J.orig], g = c.skin.geometry, drawn = new Uint8Array(B.length / 3);
  for (const i of g.index.array) drawn[i] = 1;
  const cell = .04, grid = new Map(); orig.forEach((i, k) => { const kk = Math.floor(B[i * 3] / cell) + ',' + Math.floor(B[i * 3 + 1] / cell) + ',' + Math.floor(B[i * 3 + 2] / cell); (grid.get(kk) || grid.set(kk, []).get(kk)).push(k); });
  const out = [];
  for (let i = 0; i < drawn.length; i++) { const zone = drawn[i] && covered(c, i, B); if (!zone) continue; const list = [], x0 = Math.floor(B[i * 3] / cell), y0 = Math.floor(B[i * 3 + 1] / cell), z0 = Math.floor(B[i * 3 + 2] / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const k of grid.get((x0 + dx) + ',' + (y0 + dy) + ',' + (z0 + dz)) || []) { if ((k < nH) !== (zone === 'H')) continue; const j = orig[k]; if ((B[j * 3] - B[i * 3]) ** 2 + (B[j * 3 + 1] - B[i * 3 + 1]) ** 2 + (B[j * 3 + 2] - B[i * 3 + 2]) ** 2 < .0016) list.push(k); }
    out.push([i, list]); }
  CAND.set(c, out); return out;
}
/** Drawn body vertices that should be under the clothes but end up outside them (posed, CPU skinning = the shader's). */
function poke(c, cloth, nMain, nH, tag) {
  const g = c.skin.geometry, P = g.attributes.position.array, idx = g.index.array, drawn = new Uint8Array(P.length / 3);
  for (const i of idx) drawn[i] = 1;
  const cp = new Float32Array(nMain * 3), t = V(); for (let k = 0; k < nMain; k++) { c.skinPoint(cloth, k, t); cp[k * 3] = t.x; cp[k * 3 + 1] = t.y; cp[k * 3 + 2] = t.z; }
  const ci = cloth.geometry.index.array, tris = []; for (let k = 0; k < ci.length; k += 3) if (ci[k] < nMain && ci[k + 1] < nMain && ci[k + 2] < nMain) tris.push(ci[k], ci[k + 1], ci[k + 2]);
  const cn = new Float32Array(cp.length), a = V(), b = V(), n = V(); for (let k = 0; k < tris.length; k += 3) { const [i, j, l] = [tris[k] * 3, tris[k + 1] * 3, tris[k + 2] * 3]; a.set(cp[j] - cp[i], cp[j + 1] - cp[i + 1], cp[j + 2] - cp[i + 2]); b.set(cp[l] - cp[i], cp[l + 1] - cp[i + 1], cp[l + 2] - cp[i + 2]); n.crossVectors(a, b); for (const q of [i, j, l]) { cn[q] += n.x; cn[q + 1] += n.y; cn[q + 2] += n.z; } }
  const base = c.storyCast.base.position.array; let tested = 0, out = 0, worst = 0, at = null;
  const cand = candidates(c, nMain, nH);
  for (const [i, list] of cand) {
    tested++; c.skinPoint(c.skin, i, t); let best = -1, bd = 1e9;
    for (const k of list) { if (cn[k * 3] ** 2 + cn[k * 3 + 1] ** 2 + cn[k * 3 + 2] ** 2 < 1e-12) continue; const d = (cp[k * 3] - t.x) ** 2 + (cp[k * 3 + 1] - t.y) ** 2 + (cp[k * 3 + 2] - t.z) ** 2; if (d < bd) { bd = d; best = k; } }
    if (best < 0) continue; n.set(cn[best * 3], cn[best * 3 + 1], cn[best * 3 + 2]).normalize();
    const s = (t.x - cp[best * 3]) * n.x + (t.y - cp[best * 3 + 1]) * n.y + (t.z - cp[best * 3 + 2]) * n.z;
    if (s > .002) { out++; if (s > worst) { worst = s; at = [t.x, t.y, t.z].map(v => +v.toFixed(3)); if (process.env.DBG) at.push('rest', ...[0, 1, 2].map(q => +base[i * 3 + q].toFixed(3)), 'cloth', best, ...[0, 1, 2].map(q => +cloth.geometry.attributes.position.array[best * 3 + q].toFixed(3))); } }
  }
  return { tag, tested, out, worst: +worst.toFixed(4), at };
}

for (const species of ['lion', 'rabbit']) {
  const c = new LionCoach(data, { species }), g = c.skin.geometry, fullIndex = g.index, kit = StoryCast.kitParts(c), vis = () => Object.values(kit).flat().map(o => o.visible);
  const v0 = vis(), stream0 = g.attributes.position;
  assert.equal(c.root.scale.x, -1, 'the fighter rig is mirrored (GOTR-0051)');
  assert.equal(StoryCast.outfit(c, 'street'), true);
  const cloth = c.root.children.find(o => o.userData.streetCloth), geo = cloth.geometry, shape = SW.clothFor(c, '').shape, nMain = shape.parts.H.orig.length + shape.parts.J.orig.length;
  // skinned to the rig
  assert.ok(cloth.isSkinnedMesh && cloth.visible && cloth.skeleton === c.skeleton && cloth.parent === c.root, species + ': clothes are a skinned mesh on the rig skeleton');
  assert.ok(cloth.bindMatrix.equals(c.skin.bindMatrix) && cloth.material.skinning && cloth.material.side === THREE.DoubleSide, species + ': same bind as the body, skinning material');
  assert.ok(c.skeleton.boneInverses.every((m, i) => m.equals(new LionCoach(data, { species }).skeleton.boneInverses[i])), species + ': the bone inverses are untouched by dressing');
  const W = geo.attributes.skinWeight.array, I = geo.attributes.skinIndex.array, nb = c.bones.length;
  for (let v = 0; v < W.length / 4; v++) { const s = W[v * 4] + W[v * 4 + 1] + W[v * 4 + 2] + W[v * 4 + 3]; assert.ok(Math.abs(s - 1) < 1e-4 && I[v * 4] < nb, 'weights normalised, bones valid'); }
  // the weights follow the body region: sleeves past the elbow ride the forearm, jeans below the knee the shin
  const P = geo.attributes.position.array, boneOf = name => c.bones.indexOf(c.joints[name]); let fore = 0, foreN = 0, shin = 0, shinN = 0;
  for (let v = 0; v < nMain; v++) { const x = P[v * 3], y = P[v * 3 + 1], dom = I[v * 4]; if (Math.abs(x) > .74 && Math.abs(x) < .84 && y > 1.45) { foreN++; if (dom === boneOf(x < 0 ? 'elbowL' : 'elbowR')) fore++; } if (y > .3 && y < .45 && Math.abs(x) < .35) { shinN++; if (dom === boneOf(x < 0 ? 'kneeL' : 'kneeR')) shin++; } }
  assert.ok(fore / foreN > .97 && shin / shinN > .97, species + ': cloth weights follow the body region ' + (fore / foreN).toFixed(3) + ' ' + (shin / shinN).toFixed(3));
  // garment lines: hem above the belt, cuffs at the wrist, jeans down to the shoe; offset 1-3 cm (sampled at the waist)
  let maxOff = 0; { const B = c.storyCast.base.position.array; for (let k = 0; k < shape.parts.H.orig.length; k += 37) { const i = shape.parts.H.orig[k]; maxOff = Math.max(maxOff, Math.hypot(P[k * 3] - B[i * 3], P[k * 3 + 1] - B[i * 3 + 1], P[k * 3 + 2] - B[i * 3 + 2])); } }
  assert.ok(maxOff < .14, species + ': the hoodie stays close to the body (max ' + maxOff.toFixed(3) + ' m)');
  // the body under the clothes is not drawn; shoes and bare hands replace boots and gloves
  assert.ok(g.index !== fullIndex && g.index.count < fullIndex.count * .4, species + ': covered body triangles are left out (' + g.index.count / 3 + ' of ' + fullIndex.count / 3 + ')');
  assert.ok(['footL', 'footR'].every(f => c.joints[f].children.some(o => o.name === 'Sneaker' && o.visible)), species + ': sneakers on both feet');
  // GOTR-0100: big bare paws on the hand bones, relaxed with a fist morph; at least glove-scale across the knuckles
  for (const s of ['L', 'R']) { const paw = c.joints['hand' + s].children.find(o => o.name === 'Bare hand' && o.visible); assert.ok(paw && paw.geometry.morphAttributes.position?.length === 1 && paw.morphTargetInfluences.length === 1, species + ': paw with a fist morph');
    paw.geometry.computeBoundingBox(); const b = paw.geometry.boundingBox; assert.ok(b.max.x - b.min.x > .13 && b.max.y - b.min.y > .2, species + ': big paws ' + (b.max.x - b.min.x).toFixed(3)); }
  // no drawn body vertex outside the cloth, in every pose
  const results = [];
  StoryCast.bag(c, 'shoulder');
  for (const [name, fn] of Object.entries(POSES)) { DreamPose.reset(c); for (let k = 0; k < 3; k++) fn(c); c.root.updateMatrixWorld(true); const r = poke(c, cloth, nMain, shape.parts.H.orig.length, name); results.push(r); }
  // mirrored root (scale.x = -1, GOTR-0051) moved and turned in the world, as in a scene
  { c.root.position.set(3.1, .26, -2); c.root.rotation.y = 2.2; DreamPose.reset(c); POSES.walkA(c); c.root.updateMatrixWorld(true); results.push(poke(c, cloth, nMain, shape.parts.H.orig.length, 'movedMirroredRoot')); c.root.position.set(0, 0, 0); c.root.rotation.y = 0; assert.equal(c.root.scale.x, -1); }
  console.log(species, results.map(r => `${r.tag}:${r.out}/${r.tested}${r.out ? ' worst ' + r.worst + ' at ' + r.at : ''}`).join('  '));
  for (const r of results) assert.ok(r.tested > 200 && r.out / r.tested < .01 && r.worst < .012, species + ' ' + r.tag + ': body pokes through the clothes ' + JSON.stringify(r));
  // the duffel: hangs behind the hip, never cuts the forearm or the shin on a walk
  { const st = c.storyCast, body = st.bag.children[1].children[0]; let near = 9;
    for (let i = 0; i <= 60; i++) { const d = i * .025; c.root.position.set(0, 0, d); DreamPose.civil(c, { t: d / 1.3, dist: d, walk: 1, dt: 1 / 30 }); c.root.updateMatrixWorld(true); st.bagPlace(null);
      const inv = body.matrixWorld.clone().invert(), seg = (a, b) => { for (let k = 0; k <= 8; k++) { const p = c.joints[a].getWorldPosition(V()).lerp(c.joints[b].getWorldPosition(V()), k / 8).applyMatrix4(inv); const s = 1 / .8; const r = Math.hypot(p.y, p.z) - .135, ax = Math.abs(p.x) - .26; near = Math.min(near, Math.max(r, ax) / s); } };
      for (const s of ['L', 'R']) { seg('elbow' + s, 'hand' + s); seg('knee' + s, 'foot' + s); } }
    console.log(species, 'closest forearm/shin joint line to the bag surface (m)', near.toFixed(3));
    assert.ok(near > .045, species + ': the bag stays clear of the arm and leg on a walk: ' + near.toFixed(3)); c.root.position.set(0, 0, 0); }
  // the kit comes back exactly: index, streams, every visibility flag; clothes, shoes and bag hidden
  assert.equal(StoryCast.outfit(c, 'kit'), true);
  assert.ok(g.index === fullIndex && g.attributes.position === stream0, species + ': index and streams restored');
  assert.deepEqual(vis(), v0, species + ': kit visibility restored');
  assert.ok(!cloth.visible && !c.storyCast.bag.visible, species + ': clothes and bag hidden with the kit');
  // a tint re-colours, shares the shape and weights
  StoryCast.outfit(c, 'street', { tint: '#8f2f22' }); const tinted = c.root.children.filter(o => o.userData.streetCloth && o.visible); assert.equal(tinted.length, 1); assert.ok(tinted[0] !== cloth && tinted[0].geometry.attributes.skinIndex.array === geo.attributes.skinIndex.array, 'tint shares weights');
  StoryCast.outfit(c, 'kit'); assert.deepEqual(vis(), v0, 'kit again');
}
console.log('street wear ok');
