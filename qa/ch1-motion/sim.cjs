// Fast motion check without a browser (ch1-motion): the film player's actor loop (dream-scenes.js frame(): turn smoothing,
// DreamPose.civil with ground, Fang's jacket beat, the market props) on the real story rigs in node, then the same metrics as
// measure.cjs. usage: node qa/ch1-motion/sim.cjs <scene> <t0> <t1> [city=1] [dt=1/30] [out.json]
// It does not render, cull or load the city models (the city re-staging is applied from the script when city=1).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')); process.chdir(root);
global.THREE = require(path.join(root, 'assets/vendor/three.min.js')); global.window = global; global.addEventListener = () => { };
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => { } }) }) };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js', 'adventure/story/market-sets.js']) if (fs.existsSync(f)) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const C = require(path.join(root, 'adventure/story/dream-core.js')), M = require(path.join(root, 'adventure/story/market-core.js'));
C.register(M.scenes);
const [id = 'dream_opening', a0 = '6.9', a1 = '16.5', city = '1', dts = String(1 / 30), outFile] = process.argv.slice(2);
let scene0 = C.variant(id); if (M.fill) scene0 = M.fill(scene0, 90); if (city === '1') scene0 = C.withCity(scene0);
if (process.env.PATCH) eval(process.env.PATCH); // QA: tweak the script before playing (e.g. a start position)
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
const scene = new THREE.Scene(), rigs = {};
for (const [k, a] of Object.entries(scene0.actors)) { const c = a.rig === 'fighter' ? new LionCoach(data, { species: 'lion' }) : StoryCast.rig(a.rig, engine); c.root.scale.set(-1, 1, 1); scene.add(c.root); rigs[k] = c; }
for (const [k, o] of Object.entries(scene0.outfit || {})) if (rigs[k]) StoryCast.outfit(rigs[k], o);
const props = scene0.carry && window.MarketProps ? MarketProps.create({ scene, set: { objects: {} }, rigs, carry: scene0.carry }) : null;
const jacketAt = {}; for (const [k, a] of Object.entries(scene0.actors)) { const j = a.keys.find(q => q.act === 'jacketoff'); if (j) jacketAt[k] = j.t; }
const V = (x, y, z) => new THREE.Vector3(x, y, z), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), turn = new Map();
const headAt = (a, key) => V(a.x, (a.y || 0) + 1.9 - (a.drop || 0), a.z);
function lookFor(a, key, s) {
  const L = a.look; if (!L) return { yaw: 0, pitch: 0 }; if (!Array.isArray(L) && typeof L === 'object') return L;
  const from = headAt(a, key), to = typeof L === 'string' ? (s.actors[L] ? headAt(s.actors[L], L) : null) : V(L[0], L[1], L[2]); if (!to) return { yaw: 0, pitch: 0 };
  const dx = to.x - from.x, dz = to.z - from.z; let yaw = Math.atan2(dx, dz) - a.ry; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)); if (rigs[key].root.scale.x < 0) yaw = -yaw;
  return { yaw, pitch: Math.atan2(to.y - from.y, Math.hypot(dx, dz)) };
}
const T0 = +a0, T1 = +a1, DT = +dts, rows = []; let clock = 0;
const ground = (x, z, t) => C.groundAt(scene0, x, z, t);
function frame(t, dt) {
  clock += dt; const s = C.sample(scene0, t);
  for (const [k, a] of Object.entries(s.actors)) {
    const c = rigs[k]; c.root.visible = a.act !== 'off'; if (!c.root.visible) continue;
    let ry = a.ry; const prev = turn.get(c); if (prev != null && dt > 0) { let d = a.ry - prev; d = Math.atan2(Math.sin(d), Math.cos(d)); ry = prev + d * (1 - Math.exp(-dt * (a.walking ? 9 : 5))); } turn.set(c, ry);
    c.root.position.set(a.x, a.y || 0, a.z); c.root.rotation.set(0, ry, 0); c.root.updateMatrixWorld(true);
    const base = { t: clock, dt, plant: !!scene0.plant, dist: a.dist, look: lookFor(a, k, s), reach: props?.reach?.(k, t) };
    if (a.act !== 'jacketoff' && c.castFight && jacketAt[k] != null) {
      const J = M.JACKET_T || 2.2; if (t >= jacketAt[k] + J) { if (c.castWear !== 'fight' || !c.castJacketGround?.visible) StoryCast.market.jacketOff(c, 1); } else if (t < jacketAt[k] && c.castWear !== 'jacket') StoryCast.market.wear(c, 'jacket');
      DreamPose.civil(c, { ...base, walk: a.walking ? 1 : 0, arms: a.arms || {}, lean: a.lean || 0, drop: a.drop || 0 });
    } else if (a.act === 'jacketoff') {
      const u = clamp(a.actT / (M.JACKET_T || 2.2)), p = StoryCast.market.jacketOff(c, u) || {};
      DreamPose.civil(c, { ...base, walk: 0, arms: p.arms || {}, look: p.look || base.look, lean: p.lean || 0, ...(p.state || {}) });
    } else DreamPose.civil(c, { ...base, ground: scene0.ground ? (x, z) => ground(x, z, t) : null, walk: a.walking ? 1 : 0, arms: a.arms || {}, lean: a.lean || 0, drop: a.drop || 0 });
  }
  props?.frame(t, dt);
  return s;
}
// settle 1.5 s before t0 (as measure.cjs), then step
let t = Math.max(0, T0 - 1.5); frame(t, 0); while (t < T0 - 1e-9) { t += DT; frame(t, DT); }
while (t < T1 - 1e-9) {
  t += DT; const s = frame(t, DT), row = { t: +t.toFixed(4), shot: s.camera.shot, a: {} };
  for (const [k, c] of Object.entries(rigs)) {
    const R = c.root; R.updateMatrixWorld(true); const j = c.joints;
    const yawOf = o => { const a = o.localToWorld(V(0, 0, 0)), f = o.localToWorld(V(0, 0, 1)); return Math.atan2(f.x - a.x, f.z - a.z); };
    const feet = ['L', 'R'].map(sd => { const f = j['foot' + sd], ball = f.localToWorld(V(0, -.12, .13)), heel = f.localToWorld(V(0, -.12, -.065)); return { ball: ball.toArray(), heel: heel.toArray(), g: ground(ball.x, ball.z, t), gh: ground(heel.x, heel.z, t), yaw: Math.atan2(ball.x - heel.x, ball.z - heel.z) }; });
    row.a[k] = { vis: R.visible, x: R.position.x, y: R.position.y, z: R.position.z, ry: R.rotation.y, hips: j.hips.getWorldPosition(V()).toArray(), head: j.head.getWorldPosition(V()).toArray(), yHead: yawOf(j.head), yChest: yawOf(j.chest), yHips: yawOf(j.hips), feet, hands: ['L', 'R'].map(sd => j['hand' + sd].getWorldPosition(V()).toArray()) };
  }
  if (process.env.PROBE) row.probe = eval(process.env.PROBE);
  rows.push(row);
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ scene: id, dt: DT, rows }));
module.exports = { rows, rigs, scene, props };
if (require.main === module) {
  const { summary } = require('./metrics.cjs');
  console.log(JSON.stringify(summary(rows)).replace(/\},"/g, '},\n"'));
}
