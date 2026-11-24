// Walk-gait QA (agent/walk-gait), node: the free walk's own pose call on the real Fighter rig (mirrored root, street
// clothes), carried along a course at 30 fps, then gait-metrics.cjs. No browser, no town (flat ground).
// usage: node qa/walk-gait/gait-sim.cjs <course> [species=lion] [out.json]
//   courses: film (1.25 m/s), walk (2.22 m/s, the free walk's stick held), fast (3.44 m/s, held/Shift), turn (2.22 m/s, 90 deg
//   turns and a reversal), startstop (stick on/off), slow (0.8 m/s, a half stick)
//   env CALL=old  pose him as v1.94's free walk did (no plant, no speed) ; default: as this branch's free walk does
//   (v1.94: the body takes the stick's speed at once; this branch: DreamPose.pace, as free-walk.js)
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')); process.chdir(root);
global.THREE = require(path.join(root, 'assets/vendor/three.min.js')); global.window = global; global.addEventListener = () => { };
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => { } }) }) };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js']) if (fs.existsSync(f)) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const { grab, gait } = require('./gait-metrics.cjs');
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
if (fs.existsSync('assets/models/shoulder-correctives-v2.json')) data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const COURSES = {
  film: [[1, 0, 0], [6, 1.25, 0], [1.5, 0, 0]], slow: [[1, 0, 0], [6, .8, 0], [1.5, 0, 0]],
  walk: [[1, 0, 0], [6, 2.22, 0], [1.5, 0, 0]], fast: [[1, 0, 0], [6, 3.44, 0], [1.5, 0, 0]],
  turn: [[1, 0, 0], [3, 2.22, 0], [2.5, 2.22, Math.PI / 2], [2.5, 2.22, -Math.PI / 2], [1.5, 0, -Math.PI / 2]],
  startstop: [[1, 0, 0], [1.2, 2.22, 0], [1, 0, 0], [.6, 2.22, 0], [.8, 0, 0], [2, 3.44, 0], [1.5, 0, 0]]
};
function run(course, species = 'lion', opts = {}) {
  const segs = COURSES[course]; if (!segs) throw new Error('course ' + course);
  const c = new LionCoach(data, { species }); c.root.scale.set(-1, 1, 1); StoryCast.outfit(c, 'street'); DreamPose.reset(c);
  const old = (opts.call ?? process.env.CALL) === 'old', dt = 1 / 30;
  const s = { x: 0, z: 0, ry: 0, dist: 0 }, rows = [], pace = {}; let t = 0, v = 0, turn = 0, walkAmt = 0, vx = 0, vz = 0;
  for (const [dur, speed, heading] of segs) for (let k = 0; k < Math.round(dur / dt); k++) {
    const tx = Math.sin(heading) * speed, tz = Math.cos(heading) * speed;
    if (old || !DreamPose.pace) { vx = tx; vz = tz; } else [vx, vz] = DreamPose.pace(pace, tx, tz, turn, dt); v = Math.hypot(vx, vz);
    const d = v * dt; s.x += vx * dt; s.z += vz * dt; if (d > 1e-5) s.dist += d; if (v > .05) s.ry = Math.atan2(vx, vz);
    t += dt; turn += Math.atan2(Math.sin(s.ry - turn), Math.cos(s.ry - turn)) * (1 - Math.exp(-dt * 10));
    c.root.position.set(s.x, 0, s.z); c.root.rotation.set(0, turn, 0);
    walkAmt += ((d > 1e-5 ? 1 : 0) - walkAmt) * (1 - Math.exp(-dt * 8));
    const st = old ? { t, dt, dist: s.dist, walk: walkAmt, ground: () => 0, arms: {}, look: { yaw: 0, pitch: 0 } }
      : { t, dt, plant: true, dist: s.dist, walk: walkAmt, ground: () => 0, arms: {}, look: { yaw: 0, pitch: 0 } };
    DreamPose.civil(c, st);
    rows.push({ ...grab(c, THREE, +t.toFixed(4)), v });
  }
  return { rows, c };
}
module.exports = { run, COURSES };
if (require.main === module) {
  const [course = 'walk', species = 'lion', out] = process.argv.slice(2), { rows } = run(course, species);
  const segs = COURSES[course], steady = [segs[0][0] + 1.5, segs[0][0] + segs[1][0] - .2];
  const res = { course, species, call: process.env.CALL === 'old' ? 'v1.94' : 'branch', steady: gait(rows, { from: steady[0], to: steady[1] }), whole: gait(rows, {}) };
  console.log(JSON.stringify(res));
  if (out) fs.writeFileSync(out, JSON.stringify({ ...res, rows }));
}
