// GOTR-0097: walk-cycle measurements of a build (ROOT=<checkout>, default this one): per frame over two cycles at 1.25 m/s,
// pelvis height, lowest sole point and heel/ball heights of each foot, knee flexion, contact-point travel while loaded.
//   ROOT=... node qa/gotr-0097/tools/gait-data.cjs <out.json> [species] [wear]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const OUT = path.resolve(process.argv[2] || 'gait.json'), ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '../../..')); process.chdir(ROOT);
global.THREE = require(path.join(ROOT, 'assets/vendor/three.min.js')); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
for (const f of ['boxing-routines.js', 'boxing-footwear.js', 'boxing-coach-v2.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const [out = 'gait.json', species = 'lion', wear = 'street'] = process.argv.slice(2), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const c = new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), { species }); StoryCast.outfit(c, wear); if (wear === 'street') StoryCast.bag(c, 'shoulder');
const S = DreamPose.STRIDE, N = 60, speed = 1.25, j = c.joints, frames = [];
const knee = s => { const a = c.point(j['thigh' + s]), b = c.point(j['knee' + s]), f = c.point(j['foot' + s]); return 180 - a.sub(b).angleTo(f.sub(b)) * 180 / Math.PI; };
DreamPose.reset(c);
for (let i = 0; i <= 3 * N; i++) {
  const d = i * S / N; c.root.position.set(0, 0, d); c.root.updateMatrixWorld(true);
  DreamPose.civil(c, { t: d / speed, dist: d, walk: 1, arms: wear === 'street' ? { R: 'strap' } : {}, dt: i ? S / N / speed : 0 });
  if (i < N) continue; c.root.updateMatrixWorld(true); const f = { t: +((d - S) / speed).toFixed(4), d: +(d - S).toFixed(4), pelvis: +j.hips.getWorldPosition(V()).y.toFixed(4) };
  for (const s of ['L', 'R']) { const h = j['foot' + s].localToWorld(V(0, -.12, -.065)), b = j['foot' + s].localToWorld(V(0, -.12, .13)); f[s] = { heel: [+h.y.toFixed(4), +h.z.toFixed(4)], ball: [+b.y.toFixed(4), +b.z.toFixed(4)], low: +Math.min(h.y, b.y).toFixed(4), knee: +knee(s).toFixed(1) }; }
  frames.push(f);
}
fs.writeFileSync(OUT, JSON.stringify({ root: ROOT, species, wear, stride: S, speed, cadence: +(2 * speed / S).toFixed(2), frames }) + '\n');
console.log('wrote', out, frames.length, 'frames, stride', S);
