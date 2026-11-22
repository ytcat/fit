// arm-fixes: the referee's victory hand raise as a motion, not only the final pose (fight-arena.js ceremony, fight-referee.js,
// boxing-coach-v2.js presentation). Measured before the fix (qa/arm-fixes/raise-probe.cjs): the referee's hand landed on
// the wrist in one frame (44 cm), the winner's arm folded shut beside the shoulder on the way up (150 deg) with the elbow
// swinging from down through out to behind (wrist up to 20 deg and upper arm up to 20 deg in a frame), it ended with the
// elbow pointing back, and nobody ever let go. Now: pickup, lift on an arc out to the side, hold, release.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict'); process.chdir(require('path').join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => { } }) }) };
for (const f of ['boxing-routines.js', 'boxing-coach-v2.js', 'contact-response.js', 'training-arena.js', 'boxing-fight.js', 'fight-referee.js', 'fight-arena.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), deg = r => r * 180 / Math.PI, R = RhinoReferee.RAISE;
const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), coach = new LionCoach(data), e = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(38, .6, .1, 100), coach, animTime: 0, technique: 'guard', currentAnim: 'one_two', fitCameraToModel() { } };
e.demoModel = coach.root; e.scene.add(coach.root); const arena = e.arena = new TrainingArena(e, data);
// the timing: a reach, then the lift, a hold, the release
{ const a = RhinoReferee.raiseAt, near = (x, y, m) => assert.ok(Math.abs(x - y) < 1e-6, m); near(a(0).hold, 0, 'no grip at first'); near(a(R.reach).hold, 1, 'held'); near(a(R.lift).raise, 0, 'lift starts'); near(a(R.lift + R.liftFor).raise, 1, 'lifted'); near(a(R.release + R.releaseFor).hold, 0, 'let go'); assert.ok(R.lift >= R.reach, 'the grip is taken before the lift'); }
for (const winner of ['lion', 'rabbit']) {
  e.fightOptions = { seed: 3, rounds: 1, roundSeconds: 2, restSeconds: 0 }; arena.setTarget('fight'); const view = arena.fightView, m = view.match; for (const f of Object.values(m.fighters)) f.next = Infinity; m.decide = () => { };
  let t = 0; while (m.phase === 'intro' || m.phase === 'round' && m.roundTime < 1) arena.update(t += 1 / 30, 'fight', 'one_two');
  m.finish(winner, 'KO', true);
  const side = winner === 'lion' ? 'R' : 'L', s = side === 'R' ? 1 : -1, rs = winner === 'lion' ? -1 : 1, c = view.coaches[winner], j = c.joints, rows = []; let prev = null;
  while (t < 200 && !(m.phase === 'ceremony' && m.phaseTime > R.release + R.releaseFor + 1)) {
    arena.update(t += 1 / 60, 'fight', 'one_two'); if (m.phase !== 'ceremony') continue;
    const ref = view.referee, grip = ref.root.localToWorld(ref.arms[rs].points.wrist.clone()), wrist = j['hand' + side].getWorldPosition(V());
    const L = o => c.root.worldToLocal(o.getWorldPosition(V())), sh = L(j['arm' + side]), el = L(j['elbow' + side]), ha = L(j['hand' + side]);
    const u = ha.clone().sub(sh).normalize(), off = el.clone().sub(sh); off.sub(u.clone().multiplyScalar(off.dot(u))).normalize();
    const hq = j['hand' + side].getWorldQuaternion(new THREE.Quaternion()), aq = j['arm' + side].getWorldQuaternion(new THREE.Quaternion());
    rows.push({ pt: m.phaseTime, gap: grip.distanceTo(wrist), gripStep: prev ? grip.distanceTo(prev.grip) : 0, wristJump: prev ? deg(2 * Math.acos(Math.min(1, Math.abs(hq.dot(prev.hq))))) : 0, armJump: prev ? deg(2 * Math.acos(Math.min(1, Math.abs(aq.dot(prev.aq))))) : 0,
      bend: deg(el.clone().sub(sh).angleTo(ha.clone().sub(el))), out: off.x * s, back: -off.z, up: ha.y - sh.y });
    prev = { grip, hq, aq };
  }
  const span = (a, b) => rows.filter(r => r.pt >= a && r.pt < b), max = (a, f) => Math.max(...a.map(f)), min = (a, f) => Math.min(...a.map(f)), all = rows.slice(1);
  assert.ok(max(all, r => r.gripStep) < .06, `${winner}: the referee's hand travels to the wrist, no jump (${(max(all, r => r.gripStep) * 100).toFixed(1)} cm in a frame)`);
  assert.ok(max(span(R.reach + .05, R.release), r => r.gap) < .035, `${winner}: grip on the wrist through the lift and the hold (${(max(span(R.reach + .05, R.release), r => r.gap) * 100).toFixed(1)} cm)`);
  assert.ok(max(all, r => r.wristJump) < 7 && max(all, r => r.armJump) < 7, `${winner}: no wrist or shoulder jump (${max(all, r => r.wristJump).toFixed(1)} / ${max(all, r => r.armJump).toFixed(1)} deg in a frame)`);
  assert.ok(max(span(R.lift, R.release), r => r.bend) < 95, `${winner}: the arm opens on the way up, never folds shut (${max(span(R.lift, R.release), r => r.bend).toFixed(0)} deg)`);
  const top = span(R.lift + R.liftFor + .1, R.release);
  assert.ok(min(top, r => r.out) > .8 && max(top, r => r.back) < .3, `${winner}: at the top the little bend points out to the side, not back`);
  assert.ok(min(top, r => r.up) > .55, `${winner}: the arm is up`);
  const after = span(R.release + R.releaseFor, 99); assert.ok(min(after, r => r.gap) > .3, `${winner}: the referee lets go`); assert.ok(min(after, r => r.up) > .55, `${winner}: he keeps his arm up`);
  console.log(`${winner}: grip step <= ${(max(all, r => r.gripStep) * 100).toFixed(1)} cm, held within ${(max(span(R.reach + .05, R.release), r => r.gap) * 100).toFixed(1)} cm, wrist <= ${max(all, r => r.wristJump).toFixed(1)} deg, upper arm <= ${max(all, r => r.armJump).toFixed(1)} deg per frame, elbow bend <= ${max(span(R.lift, R.release), r => r.bend).toFixed(0)} deg`);
}
arena.setTarget('none');
console.log('PASS referee raise motion: pickup, lift, hold, release (both corners)');
