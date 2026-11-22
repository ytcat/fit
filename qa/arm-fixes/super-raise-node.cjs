// Super Punch ring ending in node (staged like tests/sunday-punch.test.cjs, with DreamPose for the celebration): the referee
// walks to the winner and raises his arm. Measured at 60 fps from the start of the ceremony: the referee's grip vs the
// winner's wrist, per-frame steps, the winner's wrist turn and where his elbow points.
// usage: node qa/arm-fixes/super-raise-node.cjs [tree root] (default: this checkout; pass the v1.91 export for "before")
const fs = require('fs'), vm = require('vm'), path = require('path');
process.chdir(process.argv[2] || path.join(__dirname, '../..'));
global.THREE = require(path.resolve('assets/vendor/three.min.js')); global.window = global; window.addEventListener = () => { };
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => { } }) }) };
global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'boxing-coach-v2.js', 'contact-response.js', 'training-arena.js', 'boxing-fight.js', 'fight-referee.js', 'fight-arena.js', 'ringless-venues.js', 'super-punch-film.js', 'adventure/story/dream-pose.js', 'sunday-punch.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
SundayPunch.install(FightArena);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), deg = r => r * 180 / Math.PI, data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
for (const [species, seed] of [['lion', 5], ['rabbit', 13]]) {
  const coach = new LionCoach(data, { species }), e = { coach, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(38, .6, .1, 100), animTime: 0, fitCameraToModel() { } }; e.demoModel = coach.root; e.scene.add(coach.root);
  const arena = e.arena = new TrainingArena(e, data); e.fightOptions = { seed, preset: 'quick', finishers: { lion: ['sunday_punch'], rabbit: ['sunday_punch'] } }; arena.setTarget('fight');
  const v = arena.fightView, m = v.match, s = species, o = s === 'lion' ? 'rabbit' : 'lion';
  while (m.phase === 'intro') v.step(); for (let i = 0; i < 60; i++) v.step();
  m.fighters[o].condition = 20; m.fighters[s].burst.charge = 1; let k = 0; while (!m.requestFinisher(s) && k++ < 120) v.step();
  for (let i = 0; i < 150 && !m.result; i++) v.step();
  if (!m.result?.finisher) { console.log(species, 'no finisher'); continue; }
  for (let i = 0; i < 3000 && m.phase !== 'ceremony'; i++) v.step();
  const side = s === 'lion' ? 'R' : 'L', sg = side === 'R' ? 1 : -1, rows = []; let prev = null;
  for (let i = 0; i < 60 * 13; i++) {
    v.step(); const ref = v.referee, c = v.coaches[s], j = c.joints, wrist = j['hand' + side].getWorldPosition(V()), grip = ref.root.localToWorld(ref.arms[s === 'lion' ? -1 : 1].points.wrist.clone());
    const L = b => c.root.worldToLocal(b.getWorldPosition(V())), sh = L(j['arm' + side]), el = L(j['elbow' + side]), ha = L(j['hand' + side]), u = ha.clone().sub(sh).normalize(), off = el.clone().sub(sh); off.sub(u.clone().multiplyScalar(off.dot(u))).normalize();
    const q = j['hand' + side].getWorldQuaternion(new THREE.Quaternion()), aq = j['arm' + side].getWorldQuaternion(new THREE.Quaternion());
    rows.push({ pt: m.phaseTime, hold: m.finisherHold(), gap: grip.distanceTo(wrist), gripStep: prev ? grip.distanceTo(prev.grip) : 0, wristJump: prev ? deg(2 * Math.acos(Math.min(1, Math.abs(q.dot(prev.q))))) : 0, armJump: prev ? deg(2 * Math.acos(Math.min(1, Math.abs(aq.dot(prev.aq))))) : 0, out: off.x * sg, back: -off.z, up: ha.y - sh.y });
    prev = { grip, q, aq };
  }
  const mx = (a, f) => Math.max(...a.map(f)), held = rows.filter(r => r.pt > .6 && r.pt < 5.3), all = rows.slice(1).filter(r => !r.hold); // after the film (its own cuts and the wave-off are not the raise)
  console.log(species, JSON.stringify({ ceremonyStart: +rows[0].pt.toFixed(2), gripStepMax: +(mx(all, r => r.gripStep) * 100).toFixed(1), gapHeldMax: +(mx(held, r => r.gap) * 100).toFixed(1), wristJumpMax: +mx(all, r => r.wristJump).toFixed(1), armJumpMax: +mx(all, r => r.armJump).toFixed(1), elbowTop: held.length ? { out: +held[held.length - 1].out.toFixed(2), back: +held[held.length - 1].back.toFixed(2) } : null, upTop: held.length ? +held[held.length - 1].up.toFixed(2) : null, gapEnd: +(rows[rows.length - 1].gap * 100).toFixed(1) }));
  if (process.env.ROWS) rows.forEach((r, i) => { if (!r.hold && (i % 30 === 0 || r.wristJump > 5 || r.gripStep > .05)) console.log(i, r.pt.toFixed(2), r.hold, 'gap', (r.gap * 100).toFixed(1), 'step', (r.gripStep * 100).toFixed(1), 'wJ', r.wristJump.toFixed(1), 'aJ', r.armJump.toFixed(1), 'up', r.up.toFixed(2)); });
  arena.setTarget('none');
}
