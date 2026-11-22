// node tests/paws.test.cjs — GOTR-0100: animal paws for every bare-handed character (adventure/story/paws.js).
// Every species and shape builds on both sides as ONE continuous surface (a single connected skin piece; claws rooted inside the
// fingertips), within the per-paw triangle budget; the right paw is the mirrored left; wraps sit over the wrist, palm and knuckles
// with the fingers and thumb free; the shape follows the pose (fresh DreamPose stamp, else a fist; QA override wins); geometry is
// shared across rigs and coats; every bare-hand call site uses the builder and index.html loads it before story-cast.js.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const Paws = require('../adventure/story/paws.js');
const MAX_TRIS = 6000, t0 = Date.now();

assert.deepEqual(Paws.species, ['lion', 'bear', 'rabbit', 'wolf', 'bulldog', 'otter', 'doe', 'croc'], 'species');
assert.deepEqual(Paws.shapes, ['relaxed', 'grip', 'fist', 'open', 'point'], 'shapes');

// ---- every species, shape and side: one continuous skin, the budget, claws rooted in the fingertips, the mirror
const sizes = {};
for (const sp of Paws.species) for (const sh of Paws.shapes) {
  const L = Paws.build(sp, sh, 'L'), R = Paws.build(sp, sh, 'R'), s = L.stats, tag = sp + ' ' + sh;
  assert.ok(s.triangles <= MAX_TRIS && s.triangles > 3000, `${tag}: ${s.triangles} triangles within the ${MAX_TRIS} budget`);
  assert.equal(Paws.components(L.idx.slice(0, s.skin * 3), L.nSkin), 1, `${tag}: the skin is one connected surface`);
  assert.ok(s.dropped / s.netTris < .02, `${tag}: no real piece was thrown away (${s.dropped} of ${s.netTris})`);
  for (const a of [L.pos, L.nor, L.base, L.streak]) for (let i = 0; i < a.length; i += 17) assert.ok(Number.isFinite(a[i]), tag + ' finite');
  const A = Paws._anatomy(sp, sh), F = Paws._field(A);
  if (sp === 'doe') assert.equal(A.claws.length, 0, 'the doe has hoof-like tips, no claws'); else {
    assert.equal(A.claws.length, 5, tag + ': a claw on every finger and the thumb');
    for (const c of A.claws) assert.ok(F.field(...c.root) < 0, tag + ': each claw is rooted inside its fingertip');
  }
  for (const fr of A.frames) assert.ok(F.field(...fr.tip) < 0, tag + ': fingertips are part of the surface');
  // the right paw: x mirrored, winding flipped (still facing out)
  for (let i = 0; i < L.pos.length; i += 31) { assert.equal(R.pos[i - i % 3], -L.pos[i - i % 3]); }
  assert.equal(R.idx[1], L.idx[2]); assert.equal(R.idx[2], L.idx[1]);
  let lo = [9, 9, 9], hi = [-9, -9, -9]; for (let i = 0; i < s.skin * 3; i++) { const v = L.idx[i]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], L.pos[v * 3 + k]); hi[k] = Math.max(hi[k], L.pos[v * 3 + k]); } }
  sizes[tag] = { w: hi[0] - lo[0], len: -lo[1], t: hi[2] - lo[2] };
}
// outward winding: the face normals agree with the field normals
{ const d = Paws.build('lion', 'relaxed', 'R'); let ok = 0, n = 0; for (let t = 0; t < d.idx.length; t += 3) { const [a, b, c] = [d.idx[t], d.idx[t + 1], d.idx[t + 2]], P = i => [d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]], u = P(b).map((v, k) => v - P(a)[k]), w = P(c).map((v, k) => v - P(a)[k]); const fn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; let s = 0; for (let k = 0; k < 3; k++) s += fn[k] * (d.nor[a * 3 + k] + d.nor[b * 3 + k] + d.nor[c * 3 + k]); n++; if (s > 0) ok++; } assert.ok(ok / n > .99, 'faces point out (right paw, mirrored) ' + ok + '/' + n); }
// big paws: the lion's is far bigger than the old hand (0.094 m wide, 0.15 m long) and the biggest of the cast; the doe's is the slimmest
const lion = sizes['lion relaxed'], old = { w: .094, len: .15 };
assert.ok(lion.w > old.w * 1.4 && lion.len > old.len * 1.25, `lion paw ${lion.w.toFixed(3)} x ${lion.len.toFixed(3)} m is much bigger than the old hand`);
assert.ok(sizes['lion fist'].w > .14, 'a lion fist about a glove wide (~0.15 m)');
assert.ok(sizes['doe relaxed'].w < sizes['wolf relaxed'].w && sizes['wolf relaxed'].w < sizes['bear relaxed'].w, 'doe slimmer than wolf, wolf slimmer than bear');
assert.ok(sizes['lion fist'].len < sizes['lion relaxed'].len - .04, 'the fist rolls the fingers into the palm');
console.log('sizes (m)', JSON.stringify(Object.fromEntries(['lion relaxed', 'lion fist', 'bear relaxed', 'rabbit relaxed', 'wolf relaxed', 'doe relaxed', 'otter relaxed', 'croc relaxed', 'bulldog relaxed'].map(k => [k, Object.values(sizes[k]).map(v => +v.toFixed(3))]))));

// ---- wraps: over the wrist, palm and knuckles, fingers and thumb free, in the same mesh, within the budget
for (const sp of ['lion', 'rabbit', 'croc']) for (const sh of ['relaxed', 'fist']) {
  const d = Paws.build(sp, sh, 'L', { wraps: true }), s = d.stats, A = Paws._anatomy(sp, sh);
  assert.ok(s.wraps > 800 && s.triangles <= MAX_TRIS, `${sp} ${sh} wraps: ${s.triangles} triangles (${s.wraps} cloth)`);
  let knuckle = false, top = -1; for (let i = d.nSkin + s.claws * 0; i < d.pos.length / 3; i++) { if (d.coatW[i] !== 1 || d.gloss[i] !== 0 || i < d.nSkin) continue; const y = d.pos[i * 3 + 1], z = d.pos[i * 3 + 2]; if (y < -.1 * A.S && z < 0) knuckle = true; top = Math.max(top, y); }
  assert.ok(knuckle, sp + ' ' + sh + ': the cloth covers the knuckles'); assert.ok(top > .04, sp + ' ' + sh + ': and goes up the wrist');
  assert.ok(s.skin < Paws.build(sp, sh, 'L').stats.skin, sp + ' ' + sh + ': the skin under the cloth is left out');
}
{ // fingertips and the thumb tip stay out of the cloth: no cloth vertex near a fingertip
  const d = Paws.build('lion', 'relaxed', 'L', { wraps: true }), A = Paws._anatomy('lion', 'relaxed');
  for (const fr of A.frames) { let near = Infinity; for (let i = d.nSkin; i < d.pos.length / 3; i++) { if (d.gloss[i] !== 0) continue; near = Math.min(near, Math.hypot(d.pos[i * 3] - fr.tip[0], d.pos[i * 3 + 1] - fr.tip[1], d.pos[i * 3 + 2] - fr.tip[2])); } assert.ok(near > .03, 'fingers free of the wraps ' + near.toFixed(3)); }
}

// ---- shapes follow the pose
assert.equal(Paws.shapeFor('hang'), 'relaxed'); assert.equal(Paws.shapeFor('fist'), 'fist'); assert.equal(Paws.shapeFor('pound'), 'fist'); assert.equal(Paws.shapeFor('point'), 'point');
assert.equal(Paws.shapeFor('wave'), 'open'); assert.equal(Paws.shapeFor('carry'), 'grip'); assert.equal(Paws.shapeFor('strap'), 'open'); // the palm lies on the strap: curled fingers would go into the chest assert.equal(Paws.shapeFor('nonsense'), 'relaxed');
const fakeRig = (species = 'lion') => { const root = new THREE.Group(), joints = { handL: new THREE.Bone(), handR: new THREE.Bone() }; root.add(joints.handL, joints.handR); return { root, joints, species, renderTime: 0 }; };
{
  const rig = fakeRig(), [pl, pr] = Paws.attach(rig, { fallback: '#b98143' });
  assert.ok(pl.name === 'Bare hand' && pr.name === 'Bare hand' && pl.parent === rig.joints.handL && pr.parent === rig.joints.handR, 'one paw on each hand joint');
  assert.ok(pl.userData.storyPart && pl.castShadow && pl.userData.paw.species === 'lion', 'story part, casts a shadow');
  const shape = () => { rig.root.updateMatrixWorld(true); return [pl.userData.shape, pr.userData.shape]; };
  rig.renderTime = 1; rig.pawPose = { L: 'relaxed', R: 'point', time: 1 }; assert.deepEqual(shape(), ['relaxed', 'point'], 'a fresh DreamPose stamp: the gesture shapes');
  rig.renderTime = 2; for (let k = 0; k < 3; k++) { shape(); const t = Date.now(); while (Date.now() - t < 60); } // (an opening or closing hand passes the grip for ~2 frames)
  assert.deepEqual(shape(), ['fist', 'fist'], 'no fresh everyday pose (a fight, a drill): fists');
  rig.pawOverride = { L: 'open', R: 'grip' }; assert.deepEqual(shape(), ['open', 'grip'], 'the QA override wins');
  rig.pawOverride = null; rig.renderTime = 3; rig.pawPose = { L: 'grip', R: 'grip', time: 3 }; assert.deepEqual(shape(), ['grip', 'grip']);
  assert.equal(pl.geometry.userData.paw.shape, 'grip'); assert.ok(pl.geometry.index.count / 3 <= MAX_TRIS, 'one mesh, one draw call, within budget');
  // shared across rigs: same coat -> same geometry; another coat -> same positions, its own colours
  const rig2 = fakeRig(), [ql] = Paws.attach(rig2, { fallback: '#b98143' }), rig3 = fakeRig(), [ml] = Paws.attach(rig3, { fur: '#6f4a31', species: 'lion' });
  rig2.pawOverride = rig3.pawOverride = { L: 'grip', R: 'grip' }; rig2.root.updateMatrixWorld(true); rig3.root.updateMatrixWorld(true);
  assert.equal(ql.geometry, pl.geometry, 'the same paw geometry is shared by rigs with the same coat');
  assert.equal(ml.geometry.attributes.position, pl.geometry.attributes.position, 'positions shared across coats'); assert.notEqual(ml.geometry.attributes.color, pl.geometry.attributes.color, 'colours per coat');
  assert.equal(ml.material, pl.material, 'one material for every paw');
}
{ // species by character, wraps flag
  assert.equal(Paws.speciesOf({ character: 'bruno' }), 'bear'); assert.equal(Paws.speciesOf({ character: 'fang' }), 'wolf'); assert.equal(Paws.speciesOf({ character: 'hazel' }), 'doe');
  assert.equal(Paws.speciesOf({ character: 'otto' }), 'otter'); assert.equal(Paws.speciesOf({ character: 'rourke' }), 'croc'); assert.equal(Paws.speciesOf({ character: 'brick' }), 'bulldog');
  assert.equal(Paws.speciesOf({ species: 'rabbit' }), 'rabbit'); assert.equal(Paws.speciesOf({ species: 'lion' }), 'lion');
  const rig = fakeRig('rabbit'), [w] = Paws.attach(rig, { wraps: true }); assert.ok(w.userData.wraps && w.userData.paw.species === 'rabbit', 'wrapped rabbit paw');
}

// ---- every bare-hand call site uses the builder
const src = f => fs.readFileSync(f, 'utf8');
const cast = src('adventure/story/story-cast.js'), market = src('adventure/story/cast-market.js'), docks = src('adventure/story/cast-docks.js'), street = src('adventure/story/street-wear.js'), pose = src('adventure/story/dream-pose.js'), html = src('index.html');
assert.match(cast, /function bareHands\(rig, fur, pad, o = \{\}\) \{\n\s+if \(window\.Paws\) return window\.Paws\.attach\(/, 'StoryCast.bareHands -> Paws.attach');
assert.match(cast, /bareHands\(rig, BRUNO\.fur/, 'Bruno'); assert.match(cast, /bareHands\(rig, f\.fur, f\.pad, \{ wraps: true \}\)/, 'track_wraps: paws in wraps'); assert.ok(!/P\.mesh\('Hand wraps'\); rig\.joints/.test(cast), 'no old torus wraps');
assert.match(market, /function hands\(rig, fur, pad\) \{ return SC\.bareHands\(rig, fur, pad\); \}/, 'Fang, Hazel, Otto'); assert.ok(!/meshOf\(P, 'Bare hand'/.test(market), 'no old market hand');
assert.match(docks, /function hands\(rig\) \{ return SC\.bareHands\(rig, '#4b5a2c', '#b8ad7c', \{ wraps: true, species: 'croc' \}\); \}/, 'Rourke: croc paws in wraps'); assert.ok(!/meshOf\(P, 'Bare hand'/.test(docks), 'no old docks hand');
assert.match(street, /SC\.bareHands\(rig,/, 'street wear');
assert.match(pose, /c\.pawPose = paws;/, 'DreamPose stamps the paw shape'); assert.match(pose, /window\.Paws\?\.shapeFor\(name\)/, 'from the gesture');
const iP = html.indexOf('adventure/story/paws.js?v='), iC = html.indexOf('adventure/story/story-cast.js?v=');
assert.ok(iP > 0 && iP < iC, 'index.html loads paws.js before story-cast.js');
assert.ok(JSON.parse(src('offline-manifest.json')).urls.some(u => u.startsWith('./adventure/story/paws.js?v=')), 'paws.js is in the offline pack (the worker loads the same file)');
console.log('paws ok', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
