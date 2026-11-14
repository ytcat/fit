// node tests/story-arm-clearance.test.cjs — GOTR-0094: in the everyday poses the arms hang and swing beside the body.
// Over a full walk cycle, in the talk gesture and while holding the bag strap, the hand and forearm surfaces (sleeve and bare
// hand in street clothes, skin and glove in the kit) stay at least 2 cm from the torso surface (the clothes, or the skin and
// trunks); the hand on the strap rests on it (in front of the chest, not inside). Lion and rabbit, kit and street clothes.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ARM = /^(arm|elbow|hand)[LR]$/, FORE = /^(elbow|hand)[LR]$/;

function dominant(g, i) { const W = g.attributes.skinWeight.array; let d = 0; for (let k = 1; k < 4; k++) if (W[i * 4 + k] > W[i * 4 + d]) d = k; return g.attributes.skinIndex.array[i * 4 + d]; }
/** Rest-pose sample lists: torso (not riding the arm bones) and forearm (riding elbow/hand), per skinned mesh. */
function samples(c) {
  const names = c.bones.map(b => b.name), torso = [], fore = [];
  const meshes = c.root.children.filter(o => o.isSkinnedMesh && o.visible && o !== c.bodyFur && (o.userData.streetCloth || o === c.skin || o === c.shorts));
  const cloth = meshes.find(o => o.userData.streetCloth);
  for (const m of meshes) { const g = m.geometry, n = g.attributes.position.count, step = m === c.skin ? 11 : 9, drawn = m === c.skin && g.index ? new Set(g.index.array) : null;
    for (let i = 0; i < n; i += step) { if (drawn && !drawn.has(i)) continue; const b = names[dominant(g, i)], y = g.attributes.position.getY(i); if (!ARM.test(b)) { if (y > .8 && y < 1.75 && !(cloth && m === c.skin)) torso.push([m, i]); } else if (FORE.test(b)) fore.push([m, i]); } }
  if (cloth) for (let i = 0; i < cloth.geometry.attributes.position.count; i += 9) if (!ARM.test(names[dominant(cloth.geometry, i)])) { const y = cloth.geometry.attributes.position.getY(i); if (y > .8 && y < 1.75) torso.push([cloth, i]); }
  // hands: bare hands or gloves (rigid on the hand joints)
  const hands = [];
  for (const s of ['L', 'R']) c.joints['hand' + s].traverse(o => { if (o.isMesh && o.visible && o.geometry.attributes.position.count > 50) { let v = o.visible, q = o; while (v && q.parent && q !== c.joints['hand' + s]) { q = q.parent; v = q.visible; } if (v) hands.push(o); } });
  return { torso, fore, hands };
}
function minGap(c, S) {
  c.root.updateMatrixWorld(true); const t = V(), inv = new THREE.Matrix4().copy(c.root.matrixWorld).invert();
  const T = new Float32Array(S.torso.length * 3); S.torso.forEach(([m, i], k) => { c.skinPoint(m, i, t); T[k * 3] = t.x; T[k * 3 + 1] = t.y; T[k * 3 + 2] = t.z; });
  const cell = .04, grid = new Map(); for (let k = 0; k < S.torso.length; k++) { const key = Math.floor(T[k * 3] / cell) + ',' + Math.floor(T[k * 3 + 1] / cell) + ',' + Math.floor(T[k * 3 + 2] / cell); (grid.get(key) || grid.set(key, []).get(key)).push(k); }
  let bk = -1; const near = p => { let best = 9; const x0 = Math.floor(p.x / cell), y0 = Math.floor(p.y / cell), z0 = Math.floor(p.z / cell); for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (const k of grid.get((x0 + dx) + ',' + (y0 + dy) + ',' + (z0 + dz)) || []) { const d = Math.hypot(T[k * 3] - p.x, T[k * 3 + 1] - p.y, T[k * 3 + 2] - p.z); if (d < best) { best = d; bk = k; } } return best; };
  let fore = 9, hand = 9;
  for (const [m, i] of S.fore) fore = Math.min(fore, near(c.skinPoint(m, i, t)));
  let hp = null, tp = null; for (const h of S.hands) { const P = h.geometry.attributes.position; for (let i = 0; i < P.count; i += 5) { const q = t.fromBufferAttribute(P, i).applyMatrix4(h.matrixWorld).applyMatrix4(inv), d = near(q); if (d < hand) { hand = d; hp = q.toArray().map(v => +v.toFixed(3)); const [mm, ii] = S.torso[bk]; tp = [mm.name || 'skin', ...[0, 1, 2].map(o => +T[bk * 3 + o].toFixed(3)), 'rest', ...[0, 1, 2].map(o => +mm.geometry.attributes.position.array[ii * 3 + o].toFixed(3)), c.bones[dominant(mm.geometry, ii)].name]; } } }
  if (process.env.DBG && hand < .02) console.log('  hand', hp, 'torso', tp);
  return { fore: +fore.toFixed(4), hand: +hand.toFixed(4) };
}

const rows = [];
for (const species of ['lion', 'rabbit']) for (const wear of ['street', 'kit']) {
  const c = new LionCoach(data, { species }); StoryCast.outfit(c, wear); if (wear === 'street') StoryCast.bag(c, 'shoulder');
  const S = samples(c); assert.ok(S.torso.length > 1500 && S.fore.length > 200 && S.hands.length >= 2, species + ' ' + wear + ': samples');
  let worst = { fore: 9, hand: 9 }, at = null; DreamPose.reset(c);
  const cycle = 12; for (let i = 0; i <= cycle + 6; i++) { const d = i * DreamPose.STRIDE / cycle; DreamPose.civil(c, { t: d / 1.3, dist: d, walk: 1, dt: i ? 1 / 30 : 0 }); if (i < 6) continue; const g = minGap(c, S); if (Math.min(g.fore, g.hand) < Math.min(worst.fore, worst.hand)) at = (i - 6) + '/' + cycle; worst = { fore: Math.min(worst.fore, g.fore), hand: Math.min(worst.hand, g.hand) }; }
  DreamPose.reset(c); for (let k = 0; k < 4; k++) DreamPose.civil(c, { t: 2.3, dist: 0, arms: { L: 'open', R: 'open' }, talk: .5, dt: k ? .5 : 0 }); const talk = minGap(c, S);
  DreamPose.reset(c); for (let k = 0; k < 4; k++) DreamPose.civil(c, { t: 1, dist: 0, arms: { R: 'strap' }, dt: k ? .5 : 0 }); const strap = minGap(c, S);
  DreamPose.reset(c); for (let k = 0; k < 4; k++) DreamPose.civil(c, { t: 1.5, dist: 1.5 + k * .03, walk: 1, arms: { R: 'strap' }, dt: k ? 1 / 30 : 0 }); const strapWalk = minGap(c, S);
  rows.push({ species, wear, walk: worst, at, talk, strap, strapWalk });
  console.log(species, wear, 'walk', JSON.stringify(worst), 'worst frame', at, '| talk', JSON.stringify(talk), '| strap', JSON.stringify(strap), '| strap walking', JSON.stringify(strapWalk));
}
for (const r of rows) {
  const id = r.species + ' ' + r.wear;
  assert.ok(r.walk.fore >= .02 && r.walk.hand >= .02, id + ': walk cycle keeps hand and forearm 2 cm off the torso ' + JSON.stringify(r.walk));
  assert.ok(r.talk.fore >= .02 && r.talk.hand >= .02, id + ': talk gesture clear of the torso ' + JSON.stringify(r.talk));
  for (const k of ['strap', 'strapWalk']) assert.ok(r[k].fore >= .02 && r[k].hand >= .006 && r[k].hand < .06, id + ': the strap hand rests on the strap in front of the chest, the forearm clear ' + JSON.stringify(r[k]));
}
console.log('arm clearance ok');
