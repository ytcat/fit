// GOTR-0103 + arm-fixes: carrying the new heavy bag out of Otto's Corner. v1.77 put the hand inside the bag; until v1.91 the
// bag appeared on the shoulder in one frame (161 cm), the wrist turned 45 deg and the upper arm twisted 55 deg in that frame,
// the elbow folded 29 cm behind the chest and the bag sat 23 cm inside his head (qa/arm-fixes). Now he steps up to the
// display, reaches out to the side of the bag, lifts it onto his right shoulder with his hand on the leather the whole way
// and comes round to the door in steps. This test plays the shop film's pickup on the Fighter rig in node at 60 fps
// (DreamPose + MarketProps, as dream-scenes.js does) and measures the wrist against the leather, the jumps, the elbow.
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; window.addEventListener = () => { };
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => { } }) }) };
const src = fs.readFileSync('adventure/story/market-sets.js', 'utf8');
const core = require('../adventure/story/bag-break-core.js'); window.BagBreakCore = core;
const C = require('../adventure/story/dream-core.js'), MC = require('../adventure/story/market-core.js');
for (const f of ['boxing-routines.js', 'boxing-coach-v2.js', 'adventure/story/dream-pose.js', 'adventure/story/bag-break.js', 'adventure/story/market-sets.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), deg = r => r * 180 / Math.PI;

// ---- the script: bought, then reach, lift, shoulder; the hand target sits outside the leather
const shop = MC.scenes.dream_otto_shop, hv = shop.carry.heavybag, on = n => hv.find(k => k.on === n);
assert.deepEqual(C.validate(shop), [], 'the shop film is valid');
assert.deepEqual(hv.map(k => k.on), ['display', 'reach', 'lift', 'shoulder'], 'display -> reach -> lift -> shoulder');
assert.ok(on('reach').t > shop.buy.t, 'he picks it up after buying it');
assert.ok(on('shoulder').t - on('lift').t >= .8, 'the lift takes time');
const hr = src.match(/const BAG_R = ([\d.]+), HAND_R = BAG_R \+ ([\d.]+);/); assert.ok(hr, 'HAND_R not found');
assert.strictEqual(+hr[1], core.BAG.r, 'HAND_R starts from the bag radius'); assert.ok(+hr[2] >= .05, 'the wrist stays at least 5 cm off the leather');
// no street tree between the shop door (x 0.9) and the end of the walk (x 7.2) on the near pavement (GOTR-0103)
for (const m of src.slice(src.indexOf("Sets.register('dream_shop'"), src.indexOf('// ---- the interior')).matchAll(/tree\((-?[\d.]+), (-?[\d.]+)/g)) assert.ok(+m[1] < -2 || +m[1] > 12, `tree at x ${m[1]} stands in the walk-out shot`);
const last = shop.camera[shop.camera.length - 1]; assert.deepEqual([last.pos, last.look], [[5.0, 1.6, 2.0], [6.8, 1.35, -2.3]], 'the last shot pans with him');
// once the bag is on him he never turns on the spot: the walking direction changes by at most 15 deg between keys
{ const keys = shop.actors.fighter.keys, door = keys.find(k => k.jump && k.t > on('lift').t).t, pts = keys.filter(k => k.t >= on('lift').t && k.t <= door && k.x != null && !k.jump); let lastDir = null; // inside the shop
  assert.ok(!keys.some(k => k.t > on('lift').t && k.face != null), 'no face key (a turn on the spot) while he carries the bag');
  for (let i = 1; i < pts.length; i++) { const d = Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z) < 1e-3) continue;
    if (lastDir != null) { const dd = Math.abs(Math.atan2(Math.sin(d - lastDir), Math.cos(d - lastDir))); assert.ok(deg(dd) <= 15.5, `turn of ${deg(dd).toFixed(0)} deg at ${pts[i - 1].t}`); } lastDir = d; } }

// ---- the film on the rig (lion) at 60 fps
const D0 = src.match(/const D = \{ x: ([\d.]+), y: ([\d.]+), z: ([\d.-]+) \}; objects.display = D;/); assert.ok(D0, 'display spot');
const set = { objects: { display: { x: +D0[1], y: +D0[2], z: +D0[3] } } };
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), c = new LionCoach(data), scene = new THREE.Scene();
scene.add(c.root); c.root.scale.set(-1, 1, 1);
const props = MarketProps.create({ scene, set, rigs: { fighter: c }, carry: shop.carry }), bag = props.heavy.b.group, B = core.BAG;
const sdf = p => { const q = bag.worldToLocal(p.clone()), dx = Math.hypot(q.x, q.z) - B.r, dy = Math.abs(q.y) - B.h; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0); };
let ry = null, prev = null; const rows = [];
for (let t = 24.0; t <= 30.4; t += 1 / 60) {
  const a = C.sample(shop, t).actors.fighter; if (ry == null) ry = a.ry; else { const d = Math.atan2(Math.sin(a.ry - ry), Math.cos(a.ry - ry)); ry += d * (1 - Math.exp(-(a.walking ? 9 : 5) / 60)); } // dream-scenes.js turn
  c.root.position.set(a.x, a.y || 0, a.z); c.root.rotation.set(0, ry, 0); c.root.updateMatrixWorld(true);
  DreamPose.civil(c, { t, dt: rows.length ? 1 / 60 : 0, dist: a.dist, walk: a.walking ? 1 : 0, arms: a.arms || {}, reach: props.reach('fighter', t), look: { yaw: 0, pitch: 0 }, lean: a.lean || 0, drop: a.drop || 0 });
  props.frame(t); bag.updateMatrixWorld(true); c.root.updateMatrixWorld(true);
  const j = c.joints, w = j.handR.getWorldPosition(V()), L = p => c.root.worldToLocal(p.clone()), sh = L(j.armR.getWorldPosition(V())), el = L(j.elbowR.getWorldPosition(V())), ha = L(w), ch = L(j.chest.getWorldPosition(V()));
  const u = ha.clone().sub(sh).normalize(), off = el.clone().sub(sh); off.sub(u.clone().multiplyScalar(off.dot(u))).normalize();
  const q = j.handR.getWorldQuaternion(new THREE.Quaternion()), qa = j.armR.getWorldQuaternion(new THREE.Quaternion()), bp = bag.getWorldPosition(V());
  rows.push({ t, wristOff: sdf(w), wristJump: prev ? deg(2 * Math.acos(Math.min(1, Math.abs(q.dot(prev.q))))) : 0, armJump: prev ? deg(2 * Math.acos(Math.min(1, Math.abs(qa.dot(prev.qa))))) : 0,
    bagStep: prev ? bp.distanceTo(prev.bp) : 0, ha: ha.toArray().map(v => +v.toFixed(3)), el: el.toArray().map(v => +v.toFixed(3)), out: off.x, back: -off.z, elbowZ: el.z - ch.z, bagIn: sdf(j.head.getWorldPosition(V())) });
  prev = { q, qa, bp };
}
const span = (a, b) => rows.filter(r => r.t >= a && r.t < b), max = (a, f) => Math.max(...a.map(f)), min = (a, f) => Math.min(...a.map(f));
const contact = span(on('reach').t + .95, 30.4), lifted = span(on('lift').t, 30.4), all = rows.slice(1);
// the wrist rides on the bag: its centre HAND_R off the axis (the palm on the leather) from the moment the reach ends
const want = +hr[2]; for (const r of contact) assert.ok(Math.abs(r.wristOff - want) < .02, `wrist ${(r.wristOff * 100).toFixed(1)} cm off the leather at ${r.t.toFixed(2)} (want ${want * 100})`);
assert.ok(max(all, r => r.bagStep) < .06, 'the bag never jumps: ' + max(all, r => r.bagStep).toFixed(3) + ' m in a frame');
assert.ok(max(all, r => r.wristJump) < 7, 'no wrist jump: ' + max(all, r => r.wristJump).toFixed(1) + ' deg in a frame');
assert.ok(max(all, r => r.armJump) < 6.5, 'no shoulder jump: ' + max(all, r => r.armJump).toFixed(1) + ' deg in a frame');
const settled = span(on('shoulder').t, 30.4);
assert.ok(min(settled, r => r.out) > .3 && max(settled, r => r.back) < .35, 'on the shoulder the elbow points out (and down), not behind');
assert.ok(min(lifted, r => r.elbowZ) > -.06, 'the elbow never folds behind the torso: ' + min(lifted, r => r.elbowZ).toFixed(3));
assert.ok(min(lifted, r => r.bagIn) > .1, 'the bag is beside his head, not on it');
console.log(`otto-carry: wrist ${(min(contact, r => r.wristOff) * 100).toFixed(1)}-${(max(contact, r => r.wristOff) * 100).toFixed(1)} cm off the leather, bag step <= ${(max(all, r => r.bagStep) * 100).toFixed(1)} cm, wrist <= ${max(all, r => r.wristJump).toFixed(1)} deg, upper arm <= ${max(all, r => r.armJump).toFixed(1)} deg per frame; elbow out ${min(settled, r => r.out).toFixed(2)}, ahead of the chest >= ${min(lifted, r => r.elbowZ).toFixed(3)} m`);
if (process.env.ROWS) for (const r of all) if (r.wristJump > 4 || r.armJump > 4) console.log(r.t.toFixed(3), r.wristJump.toFixed(1), r.armJump.toFixed(1), 'hand', r.ha.join(','), 'elbow', r.el.join(','));
console.log('otto-carry: ok');
