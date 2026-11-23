// The step-off check of tests/story-walk-gait.test.cjs, printing every sole point that is under its step (ch1-motion QA).
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '../..'));
global.THREE = require('../../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const Core = require('../../adventure/story/dream-core.js'), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), P = DreamPose;
const SOLE = { heel: V(0, -.12, -.065), ball: V(0, -.12, .13) }, sole = (c, s, k) => c.joints['foot' + s].localToWorld(SOLE[k].clone());
const c = new LionCoach(data, { species: process.argv[2] || 'lion' }); StoryCast.outfit(c, 'street'); StoryCast.bag(c, 'shoulder');
const sc = Core.withCity(Core.scenes.dream_opening), ground = (x, z, t) => Core.groundAt(sc, x, z, t);
P.reset(c); c.root.scale.set(-1, 1, 1); if (process.env.LOG) window.__plantLog = [];
for (let t = 7.3; t <= 9.9; t += 1 / 30) {
  const a = Core.sample(sc, t).actors.fighter; c.root.position.set(a.x, a.y, a.z); c.root.rotation.set(0, a.walking ? a.dir : 0, 0); c.root.updateMatrixWorld(true);
  P.civil(c, { t, dt: t > 7.3 ? 1 / 30 : 0, plant: true, dist: a.dist, walk: a.walking ? 1 : 0, arms: a.arms || {}, ground: (x, z) => ground(x, z, t) });
  c.root.updateMatrixWorld(true);
  for (const s of ['L', 'R']) for (const k of ['heel', 'ball']) { const q = sole(c, s, k), g = ground(q.x, q.z, t); if (g - q.y > .02) console.log(t.toFixed(3), s, k, 'under by', (g - q.y).toFixed(3), 'at', q.x.toFixed(2), q.y.toFixed(3), q.z.toFixed(3), 'g', g); }
}
