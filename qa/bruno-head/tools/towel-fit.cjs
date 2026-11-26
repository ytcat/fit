// node qa/bruno-head/tools/towel-fit.cjs — how Bruno's towel (the skinned shell shown with the authored head) sits on his cardigan in
// poses, with the hybrid skinning's CPU twin (rig.skinPoint: DQ + linear blend + the anatomy morph, as the shader draws it):
// for each outer towel vertex, its height over the cardigan point it was made from (along that point's normal turned by its main
// bone). Prints per pose: min / median / max height and the count under 2 mm (cloth through the towel) and over 15 mm (floating).
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..', '..', '..'));
global.THREE = require(process.cwd() + '/assets/vendor/three.min.js'); global.window = global; global.addEventListener = () => {};
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }) };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
THREE.GLTFLoader = class { load(url, ok, _p, err) { setTimeout(() => err(Error('off')), 1); } };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json')); global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
const c = StoryCast.rig('bruno', engine), T = c.castTowel, towel = T.alt, src = T.src, V = () => new THREE.Vector3();
const inner = new Map(); for (let k = 0; k < src.length; k++) if (src[k] < 0) inner.set(-1 - src[k], k);
const P0 = towel.geometry.attributes.position, SI = c.skin.geometry.attributes.skinIndex, NR = c.skin.geometry.attributes.normal;
const fit = () => {
  c.syncSkin(); window.AvatarAnatomy?.update(c); const hs = []; let under = 0, over = 0; // bone matrices, dual quaternions and muscle activations of this pose
  for (let k = 0; k < src.length; k++) {
    const s = src[k]; if (s < 0 || P0.getY(k) < 1.6) continue; // over the shoulder (rest y > 1.6)
    const a = c.skinPoint(towel, k), sk = c.skinPoint(c.skin, s), q4 = c.dqReal[SI.getX(s)], n = V().fromBufferAttribute(NR, s).applyQuaternion(new THREE.Quaternion(q4.x, q4.y, q4.z, q4.w)).normalize(); // the skin's rest normal turned by its main bone
    const h = a.clone().sub(sk).dot(n); hs.push(h); if (h < .002) under++; if (h > .015) over++;
  }
  hs.sort((x, y) => x - y); return { n: hs.length, min: +hs[0].toFixed(4), med: +hs[hs.length >> 1].toFixed(4), max: +hs[hs.length - 1].toFixed(4), under, over };
};
const POSES = { stand: {}, raiseL: { arms: { L: 'hips', R: 'hips' }, reach: { L: { at: [-.55, 2.0, .25], w: 1, pole: [-1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } } }, walk: { walk: 1 }, hips: { arms: { L: 'hips', R: 'hips' } }, cross: { arms: { L: 'cross', R: 'cross2' } } };
for (const [nm, st] of Object.entries(POSES)) { DreamPose.reset(c); for (let k = 0; k < 30; k++) DreamPose.civil(c, { t: 2 + k / 30, dt: 1 / 30, dist: st.walk ? (2 + k / 30) * 1.25 : 0, ...st }); console.log(nm, JSON.stringify(fit())); }
console.log('towel', JSON.stringify({ outer: T.outer, faces: T.faces, islands: T.islands }));
