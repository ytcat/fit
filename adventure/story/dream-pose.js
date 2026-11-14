/* Everyday body language for the story rigs (GOTR-0078): standing, a real walk cycle, talk gestures, head turns.
 * The fight rig only knows boxing poses, so story scenes pose it through the controller's own overlay hook
 * (update(..., { poseOverlay })): the controller still runs the face, fur and skin; this file places the pelvis, spine,
 * head, both legs (two-bone IK to ankle targets) and both arms (IK to hand targets). Nothing here touches the stance or
 * guard code.
 *
 * DreamPose.civil(rig, state) poses one rig for this frame. state:
 *   t            scene time (s)
 *   dist         metres walked so far (drives the step phase: the planted foot does not slide)
 *   walk         0..1 how much of the walk cycle shows (0 = standing)
 *   arms         { L, R }: gesture name per arm (GESTURES) ; look: { yaw, pitch } head turn (radians, + = to the rig's +x / up)
 *   lean         forward lean (radians) ; talk 0..1 mouth ; nod 0..1 ; drop metres the pelvis sinks (step down, sitting back)
 *   dt           frame time for smoothing (0 = jump to the pose)
 * DreamPose.STRIDE  metres per walk cycle (two steps). DreamPose.feet(rig) -> world positions of both foot balls (QA: sliding).
 * Rig axes: +z forward, +y up; the side called L is at -x. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const STRIDE = 1.30, DUTY = .62, ANKLE = .12, BALL = .13, HIP = .972, GAIT_X = .092, WALK_Y = .958, BOB = .028;
  // hand targets in rig space for the +x arm (mirrored for the other): [hand x, y, z], elbow pole, palm direction, wrist turn
  const GESTURES = {
    hang: { h: [.335, .985, .055], pole: [.25, -.1, -1], palm: [-1, 0, 0], turn: .35 },
    strap: { h: [.175, 1.50, .225], pole: [.3, -1, -.3], palm: [0, 0, -1], turn: .6 },   // holding the bag strap at the chest
    open: { h: [.30, 1.20, .36], pole: [.7, -.8, -.3], palm: [0, 1, 0], turn: .9 },        // palm up: explaining
    fist: { h: [.085, 1.43, .255], pole: [.9, -.45, -.1], palm: [0, 0, -1], turn: .6 },    // fist on the chest: a promise
    point: { h: [.2, 1.47, .64], pole: [.6, -.8, 0], palm: [0, -1, 0], turn: .4 },
    hips: { h: [.305, 1.085, .03], pole: [1, .1, -.55], palm: [-1, 0, .2], turn: .5 },
    thumb: { h: [.47, 1.50, -.02], pole: [.4, -.9, .3], palm: [0, 0, 1], turn: .5 },       // thumb over the shoulder: "him"
    chin: { h: [.075, 1.735, .275], pole: [.8, -.7, .1], palm: [0, 0, -1], turn: .6 },
    cross: { h: [-.105, 1.36, .255], pole: [.8, -.75, .2], palm: [0, 0, -1], turn: .7 },   // arms folded
    cross2: { h: [-.14, 1.305, .285], pole: [.8, -.75, .2], palm: [0, 0, -1], turn: .7 },
    pound: { h: [.075, 1.36, .33], pole: [.85, -.6, 0], palm: [-1, 0, 0], turn: .5 },      // glove into glove
    shrug: { h: [.36, 1.16, .2], pole: [.9, -.5, -.3], palm: [0, 1, .2], turn: .9 },         // both palms out: "what can I say"
    count: { h: [.3, 1.6, .34], pole: [.9, -.6, -.1], palm: [-1, 0, 0], turn: .4 },          // the referee's count
    wave: { h: [.40, 1.93, .12], pole: [1, -.3, -.2], palm: [0, 0, 1], turn: .5 },           // hand up: hello
    low: { h: [.30, 1.02, .16], pole: [.4, -.3, -1], palm: [-1, 0, 0], turn: .4 },         // offering a hand low
    carry: { h: [.31, .93, .06], pole: [.25, -.1, -1], palm: [-1, 0, 0], turn: .35 }       // straight arm with a weight (bag handles)
  };
  const mem = new WeakMap();
  const memo = rig => { let m = mem.get(rig); if (!m) { m = { hand: { L: null, R: null }, pole: { L: null, R: null }, palm: { L: null, R: null }, turn: { L: .35, R: .35 }, yaw: 0, pitch: 0, walk: 0, lean: 0, drop: 0, last: -1 }; mem.set(rig, m); } return m; };
  const mirror = (a, s) => V(a[0] * s, a[1], a[2]);

  /* The walk cycle from human gait (GOTR-0097). Phase 0 = this leg's heel strike; stance 0..DUTY, swing DUTY..1; double
   * support 0..0.12 and 0.50..0.62 (each foot is on the ground 62 % of the cycle, so one foot is always down, never airborne).
   *   heel strike, ankle dorsiflexed (toes up) -> the foot rolls down round the heel -> foot flat (0.10) -> the body passes
   *   over it (mid-stance ~0.25) -> heel off (0.42), the foot rolls over the ball -> toe off (DUTY) -> swing: the knee folds
   *   (~60 deg at 0.72), the foot passes under the body with the toes clear and reaches forward, knee almost straight, heel first.
   * The contact point (heel, then the whole sole, then the ball) is fixed to the ground: in the rig frame it moves back at
   * exactly the walking speed, so nothing slides. The swing starts and ends at ground speed (Hermite tangents). */
  const G = { hs: .30, flat: .10, heelOff: .34, toe: .75, heel: .065, sole: ANKLE, lift: .085 };
  const rot = (oy, oz, th) => [oy * Math.cos(th) - oz * Math.sin(th), oy * Math.sin(th) + oz * Math.cos(th)]; // (y, z) of a foot point at pitch th (+ = toes down)
  const herm = (a, b, ma, mb, w) => { const w2 = w * w, w3 = w2 * w; return (2 * w3 - 3 * w2 + 1) * a + (w3 - 2 * w2 + w) * ma + (-2 * w3 + 3 * w2) * b + (w3 - w2) * mb; };
  function stance(p, stride) {
    const hz = stride * .2 - stride * p; // heel contact point (rig z) while the foot is down
    if (p < G.flat) { const th = -G.hs * (1 - smooth(p / G.flat)), [y, z] = rot(-G.sole, -G.heel, th); return { y: -y, z: hz - z, pitch: th, hz, ball: false }; } // heel rocker
    if (p < G.heelOff) return { y: G.sole, z: hz + G.heel, pitch: 0, hz, ball: false };                                                                          // foot flat
    const th = G.toe * smooth((p - G.heelOff) / (DUTY - G.heelOff)) ** 1.15, [y, z] = rot(-G.sole, BALL, th); return { y: -y, z: hz + G.heel + BALL - z, pitch: th, hz, ball: true }; // over the ball
  }
  /** One leg of the walk cycle at phase p (0..1): ankle target in rig space, foot pitch, whether it is planted. */
  function step(p, s, stride) {
    p = ((p % 1) + 1) % 1;
    if (p < DUTY) { const a = stance(p, stride); return { x: s * GAIT_X, y: a.y, z: a.z, pitch: a.pitch, planted: true, u: p / DUTY, hz: a.hz, ball: a.ball }; } // hz: heel contact z; ball: rolling over the ball
    const w = (p - DUTY) / (1 - DUTY), a = stance(DUTY - 1e-6, stride), b = stance(0, stride), m = -stride * (1 - DUTY);
    const lift = G.lift * Math.sin(Math.PI * Math.pow(w, .5)) ** 1.2, y = herm(a.y, b.y, 0, 0, w) + lift;
    const pitch = w < .8 ? lerp(G.toe, -G.hs * 1.1, smooth(w / .8)) : lerp(-G.hs * 1.1, -G.hs, (w - .8) / .2);
    return { x: s * GAIT_X, y, z: herm(a.z, b.z, m, m, w), pitch, planted: false, u: w };
  }
  const footQ = (yaw, pitch) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

  /* ---------------------------------------------------------------- arms beside the body (GOTR-0094)
   * A torso profile from what the rig wears (the street clothes, or the skin and trunks), in the rest pose: per height and
   * direction round the body, the outermost radius of everything that does not ride the arm bones. After the arm IK, the
   * hand, forearm, elbow and upper arm are taken back into the rest frame of the torso bone they pass and, if they would
   * come closer than their own thickness + 2 cm, the hand target (and with it the whole arm) is moved out and the IK
   * solved again, with the elbow turned out. Fighters with a huge chest and lats get their arms held further out. */
  const ARM = /^(arm|elbow|hand)[LR]$/, PY0 = .78, PDY = .01, PNY = 102, PNT = 48, profiles = new WeakMap();
  function profile(c) {
    const cloth = c.root.children.find(o => o.userData?.streetCloth && o.visible) || null, key = cloth ? cloth.uuid : 'kit' + (c.shorts?.visible ? 1 : 0) + c.skin.geometry.attributes.position.uuid;
    let p = profiles.get(c); if (p?.key === key) return p;
    const R = new Float32Array(PNY * PNT), arm = c.bones.map(b => ARM.test(b.name));
    const add = g => { const P = g.attributes.position.array, I = g.attributes.skinIndex?.array, W = g.attributes.skinWeight?.array; if (!I) return;
      for (let i = 0; i < P.length / 3; i++) { let dom = 0; for (let k = 1; k < 4; k++) if (W[i * 4 + k] > W[i * 4 + dom]) dom = k; if (arm[I[i * 4 + dom]]) continue;
        const y = P[i * 3 + 1], b = Math.round((y - PY0) / PDY); if (b < 0 || b >= PNY) continue; const x = P[i * 3], z = P[i * 3 + 2], t = Math.round(((Math.atan2(x, z) / (Math.PI * 2)) % 1 + 1) % 1 * PNT) % PNT, r = Math.hypot(x, z), q = b * PNT + t; if (r > R[q]) R[q] = r; } };
    if (cloth) add(cloth.geometry); add(c.skin.geometry); if (c.shorts?.visible) add(c.shorts.geometry);
    const S = new Float32Array(R); for (let b = 0; b < PNY; b++) for (let t = 0; t < PNT; t++) { let v = 0; for (let db = -1; db <= 1; db++) for (let dt = -1; dt <= 1; dt++) { const bb = b + db; if (bb >= 0 && bb < PNY) v = Math.max(v, R[bb * PNT + (t + dt + PNT) % PNT]); } S[b * PNT + t] = v; }
    p = { key, R: S }; profiles.set(c, p); return p;
  }
  const restOf = (c, bone) => { const v = V(); for (let b = bone; b && b !== c.root; b = b.parent) v.add(b.name === 'hips' ? V(0, .99, 0) : b.name === 'neck' ? c.neckRest : b.position); return v; };
  /** How far (root space) point q, of thickness r, must move to clear the torso; null when clear. */
  function clearance(c, prof, q, r, gap = .02, side = 'R') {
    const j = c.joints, bone = q.y > 1.36 ? j.chest : q.y > 1.13 ? j.spine : q.y > .95 ? j.hips : j['thigh' + side], inv = new THREE.Matrix4().copy(c.root.matrixWorld).invert().multiply(bone.matrixWorld), local = q.clone().applyMatrix4(inv.clone().invert()), rest = local.clone().add(restOf(c, bone));
    const b = Math.round((rest.y - PY0) / PDY); if (b < 0 || b >= PNY) return null;
    const t = Math.round(((Math.atan2(rest.x, rest.z) / (Math.PI * 2)) % 1 + 1) % 1 * PNT) % PNT, need = prof.R[b * PNT + t] + r + gap, have = Math.hypot(rest.x, rest.z);
    if (!(need > 0) || have >= need || prof.R[b * PNT + t] === 0) return null;
    const out = rest.clone(); if (have < 1e-4) out.x = need; else { out.x *= need / have; out.z *= need / have; }
    return out.sub(restOf(c, bone)).applyMatrix4(inv).sub(q);
  }
  /** Corners and face centres of the box round what the hand joint carries (bare hand or glove), in the hand frame. */
  const handBoxes = new WeakMap();
  function handPoints(c, side) {
    const hand = c.joints['hand' + side], vis = []; hand.traverse(o => { if (o.isMesh && o.visible) vis.push(o); }); const key = vis.map(o => o.uuid).join();
    let m = handBoxes.get(hand); if (m?.key === key) return m.pts;
    const box = new THREE.Box3(), inv = new THREE.Matrix4().copy(hand.matrixWorld).invert(), v = V(); hand.updateWorldMatrix(true, true);
    for (const o of vis) { if (o.geometry.attributes.position.count < 30) continue; const P = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); for (let i = 0; i < P.count; i += 3) box.expandByPoint(v.fromBufferAttribute(P, i).applyMatrix4(M)); }
    const pts = []; if (!box.isEmpty()) { const lo = box.min, hi = box.max, mid = box.getCenter(V()); for (const x of [lo.x, mid.x, hi.x]) for (const y of [lo.y, mid.y, hi.y]) for (const z of [lo.z, mid.z, hi.z]) if ((x !== mid.x) + (y !== mid.y) + (z !== mid.z) >= 2) pts.push(V(x, y, z).lerp(mid, .12)); }
    handBoxes.set(hand, { key, pts }); return pts;
  }
  function clearArm(c, side, target, pole, rest = false, orient = () => {}) {
    const j = c.joints, prof = profile(c), glove = c.gloveMeshes?.[side]?.visible, hr = glove ? .11 : .05, t = target.clone(), pl = pole.clone();
    let err = c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], t, pl); orient();
    for (let it = 0; it < 6; it++) {
      const sh = c.point(j['arm' + side]), el = c.point(j['elbow' + side]), ha = c.point(j['hand' + side]);
      j['hand' + side].updateWorldMatrix(true, false); let dt = null; if (!rest) for (const q of handPoints(c, side)) { const d = clearance(c, prof, c.root.worldToLocal(j['hand' + side].localToWorld(q.clone())), .008, .022, side); if (d && (!dt || d.lengthSq() > dt.lengthSq())) dt = d; }
      const dh0 = clearance(c, prof, ha, hr, rest ? .006 : .02, side), dh = dt && (!dh0 || dt.lengthSq() > dh0.lengthSq()) ? dt : dh0, dm = clearance(c, prof, ha.clone().lerp(el, .5), .068, .02, side), de = clearance(c, prof, el, .055, .012, side), du = sh.y - el.y > .12 ? clearance(c, prof, sh.clone().lerp(el, .7), .062, .006, side) : null;
      if (!dh && !dm && !de && !du) break;
      const arm = [de, du, dm].filter(Boolean).reduce((a, d) => d.lengthSq() > a.lengthSq() ? d : a, V());
      t.add(dh && dh.lengthSq() > arm.lengthSq() ? dh : arm).add(dh && arm.lengthSq() ? dh.clone().multiplyScalar(.3) : V());
      if (arm.lengthSq()) pl.lerp(arm.clone().normalize(), .5).normalize();
      const reach = (j['elbow' + side].position.length() + j['hand' + side].position.length()) * .985, off = t.clone().sub(sh); if (off.length() > reach) t.copy(sh).addScaledVector(off.normalize(), reach); // never past the arm's reach
      err = c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], t, pl); orient();
    }
    target.copy(t); return err;
  }

  function overlay(c, st, m) {
    const j = c.joints, t = st.t || 0, w = m.walk, phase = ((st.dist || 0) / STRIDE) % 1, tau = Math.PI * 2, sw = Math.sin(phase * tau), cw = Math.cos(phase * tau);
    const breath = Math.sin(t * 1.7 + (c.character ? 1.3 : 0)), idle = 1 - w, shift = Math.sin(t * .43 + (c.character === 'bruno' ? 2 : 0)) * idle;
    // legs: stand targets blended with the walk cycle. st.ground(x, z) -> world height under a point (steps: the bus floor,
    // its tread, the kerb): each foot stands on what is under it; a planted foot keeps its step, a swinging foot clears the
    // edge and lands on the next one (GOTR-0097)
    const plans = [], R = c.root, gnd = typeof st.ground === 'function' ? (x, ...zs) => Math.max(...zs.map(z => { const q = R.localToWorld(V(x, 0, z)); return st.ground(q.x, q.z); })) - R.position.y : null;
    if (gnd) R.updateMatrixWorld(true);
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R', pg = (phase + (s < 0 ? 0 : .5)) % 1, g = step(pg, s, STRIDE), stand = st.feet?.[side];
      const sx = stand ? stand[0] : s * (st.wide ?? .118), sz = stand ? stand[2] : s * -.012, sy = ANKLE + (stand ? stand[1] : 0);
      let off = 0;
      if (gnd) {
        let ow = 0; const back = G.heel + .01, fore = BALL;
        if (g.planted) ow = gnd(g.x, g.z - back, g.z + fore);
        else { const a = stance(DUTY - 1e-6, STRIDE).z - (pg - DUTY) * STRIDE, b = stance(0, STRIDE).z + (1 - pg) * STRIDE, o0 = gnd(g.x, a - back - BALL, a), o1 = gnd(g.x, b - back, b + fore); ow = Math.max(lerp(o0, o1, o1 > o0 ? smooth(g.u / .55) : smooth((g.u - .35) / .5)), gnd(g.x, g.z - back - .03, g.z + fore + .03)); } // never through the step it passes over
        off = lerp(gnd(sx, sz - back, sz + fore), ow, w);
      }
      const yawF = s * lerp(st.toes ?? .16, .07, w);
      if (g.planted) { // the toed-out foot: heel and ball lie along its own (turned) axis, the pivot stays on its spot
        const sy = Math.sin(yawF), cy = Math.cos(yawF), [oy, oz] = rot(-G.sole, g.ball ? BALL : -G.heel, g.pitch), L = g.ball ? G.heel + BALL : 0;
        g.x = g.x + L * sy - oz * sy; g.z = g.hz + L * cy - oz * cy; g.y = -oy;
      } else { // the same turn at toe-off and at the next heel strike, blended through the swing (no jump at either end)
        const sy = Math.sin(yawF), cy = Math.cos(yawF), L = G.heel + BALL, o0 = rot(-G.sole, BALL, G.toe)[1], o1 = rot(-G.sole, -G.heel, -G.hs)[1], k = smooth(g.u);
        g.x += lerp((L - o0) * sy, -o1 * sy, k); g.z += lerp((L - o0) * (cy - 1), -o1 * (cy - 1), k);
      }
      plans.push({ side, s, off, x: lerp(sx, g.x, w), y: lerp(sy, g.y, w) + off, z: lerp(sz, g.z, w), pitch: g.pitch * w, yaw: yawF, planted: g.planted || w < .5 });
    }
    // pelvis (GOTR-0097): nearly level. A small bob, lowest just after each heel strike (double support), highest at
    // mid-stance; it turns +-5 deg (the hip of the leading leg forward), drops +-3.5 deg on the swing side while the other
    // leg takes the weight, and shifts 2 cm over the stance foot
    const hips = j.hips, pL = phase, yaw = .085 * Math.cos(pL * tau) * w, roll = -.06 * Math.sin((pL + .15) * tau) * w, hb = (pL * 2) % 1, bob = hb < .16 ? -.3 * Math.sin(Math.PI * hb / .16) : hb < .5 ? smooth((hb - .16) / .34) : 1 - smooth((hb - .5) / .5); // the knee gives a little as the heel takes the weight (dip at loading)
    const sway = -.02 * Math.sin((pL - .05) * tau) * w + .012 * shift;
    hips.rotation.set(0, yaw, roll + .02 * shift); hips.position.set(sway, HIP, .012 * w);
    c.root.updateMatrixWorld(true);
    let y = lerp(HIP + .004 * breath * idle, WALK_Y + BOB * bob, w) - (m.drop || 0) + (plans[0].off + plans[1].off) / 2;
    for (const p of plans) { const start = c.point(j['thigh' + p.side]), reach = (j['knee' + p.side].position.length() + j['foot' + p.side].position.length()) * (p.planted ? .998 : 1.02), dx = start.x - p.x, dz = start.z - p.z; y = Math.min(y, p.y + Math.sqrt(Math.max(.01, reach * reach - dx * dx - dz * dz))); } // never past the legs' reach
    hips.position.y = y;
    const stoop = c.cast?.stoop ?? (c.character === 'bruno' ? .085 : 0), lean = m.lean + .04 * w + stoop; // the old champion carries his years in his back
    // the thorax turns against the pelvis and keeps the shoulders level; neck and head take the turn back out (head steady)
    j.spine.rotation.set(.02 + lean * .5 + .008 * breath, -yaw * .85, -roll * .5 - .012 * shift); j.chest.rotation.set(.015 + lean * .5 - .012 * breath, -yaw * 1.0, -roll * .35 - .008 * shift);
    j.neck.position.copy(c.neckRest); j.neck.rotation.set(-m.pitch * .4 - (lean - stoop * .4) * .5, m.yaw * .4 + yaw * .4, 0);
    const nod = (st.nod || 0) * .06 * Math.sin(t * 6.5) + (st.talk || 0) * .025 * Math.sin(t * 9.1) + (st.listen || 0) * .05 * Math.max(0, Math.sin(t * 1.9 + 1)) ** 4;
    j.head.rotation.set(.03 - m.pitch * .6 - lean * .4 + nod + .012 * w * Math.cos(2 * tau * (pL - .02)), m.yaw * .6 + yaw * .45, (st.tilt || 0) + (st.listen || 0) * .05 + .012 * shift - roll * .15);
    for (const side of ['L', 'R']) { const s = side === 'L' ? -1 : 1; j['scapula' + side].position.set(s * .17, .17, -.06); j['scapula' + side].rotation.set(0, 0, 0); }
    c.root.updateMatrixWorld(true);
    const footTargets = [];
    for (const p of plans) {
      const ankle = V(p.x, p.y, p.z), q = footQ(p.yaw, p.pitch), foot = j['foot' + p.side];
      const err = c.solve(j['thigh' + p.side], j['knee' + p.side], foot, ankle, V(p.s * .06, 0, 1)); c.orient(foot, q);
      if (foot.userData.bootAnkle) foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0, 1, 0), c.point(j['knee' + p.side]).sub(ankle).normalize().applyQuaternion(q.clone().invert()));
      footTargets.push({ side: p.side, error: err, ankle: ankle.toArray(), pivot: 0, lift: p.y - ANKLE, contact: [p.x, 0, p.z + BALL] });
    }
    // arms: gesture targets, smoothed; while walking the hanging arm swings against its leg
    const gloves = [], handErrors = [];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1, name = st.arms?.[side] || 'hang', g = GESTURES[name] || GESTURES.hang, swing = (name === 'hang' ? 1 : name === 'carry' ? .25 : 0) * w * (s < 0 ? -1 : 1) * Math.cos((phase - .04) * tau); // the arm swings against its own leg
      const hand = st.reach?.[side] ? V(...st.reach[side]) : mirror(g.h, s), pole = mirror(g.pole, s), palm = mirror(g.palm, s); // reach: an exact hand target in rig space
      hand.z += swing > 0 ? .21 * swing : .15 * swing; hand.y += (swing > 0 ? .055 : .015) * Math.abs(swing) + .004 * breath * idle; hand.x += s * (.012 * w) - s * .015 * Math.max(0, swing); // from the shoulder: ~22 deg forward with the elbow a little more bent, ~15 deg back
      if (name !== 'hang' && name !== 'carry' && name !== 'strap' && name !== 'hips' && name !== 'cross' && name !== 'cross2') { const beat = (st.talk || 0) * Math.sin(t * 5.3 + s); hand.y += .022 * beat; hand.z += .018 * beat; } // the hand moves with the words
      const k = st.dt > 0 && m.hand[side] ? 1 - Math.exp(-st.dt * 9) : 1;
      m.hand[side] = m.hand[side] ? m.hand[side].lerp(hand, k) : hand; m.pole[side] = m.pole[side] ? m.pole[side].lerp(pole, k) : pole; m.palm[side] = m.palm[side] ? m.palm[side].lerp(palm, k) : palm; m.turn[side] = lerp(m.turn[side], g.turn, k);
      const target = m.hand[side].clone(); target.y += hips.position.y - HIP; // hands ride with the pelvis
      if (name === 'strap') { const ch = j.chest, M = new THREE.Matrix4().copy(c.root.matrixWorld).invert().multiply(ch.matrixWorld); target.copy(m.hand[side]).sub(restOf(c, ch)).applyMatrix4(M); } // the hand on the strap moves with the chest
      let glove = null; handErrors.push(clearArm(c, side, target, m.pole[side], name === 'strap', () => (glove = c.orientGlove(side, m.turn[side], m.palm[side])))); gloves.push(glove); // the strap hand rests on the strap; the last orientation is returned
    }
    const bag = c.storyCast?.bagBody; if (bag) bag.rotation.z = -.5 + .045 * Math.sin(phase * tau * 2) * w;
    return { gloves, handErrors, footTargets };
  }
  function civil(c, st = {}) {
    const m = memo(c), dt = st.dt > 0 && m.last >= 0 ? st.dt : 0, k = dt ? 1 - Math.exp(-dt * 7) : 1, kw = dt ? 1 - Math.exp(-dt * 10) : 1;
    // with nothing to look at, the eyes wander: slow glances to the sides and down the street
    const t0 = st.t || 0, seedC = c.character === 'bruno' ? 1.7 : c.character === 'brick' ? 3.1 : c.species === 'rabbit' ? 4.2 : 0, wander = st.look ? 0 : 1 - .6 * clamp(st.walk || 0);
    const gy = wander * (.32 * Math.sin(t0 * .37 + seedC) + .16 * Math.sin(t0 * .83 + seedC * 2)), gp = wander * .06 * Math.sin(t0 * .29 + seedC);
    m.walk = lerp(m.walk, clamp(st.walk || 0), kw); m.yaw = lerp(m.yaw, clamp((st.look?.yaw || 0) + gy, -1.15, 1.15), k); m.pitch = lerp(m.pitch, clamp((st.look?.pitch || 0) + gp, -.5, .6), k); m.lean = lerp(m.lean, st.lean || 0, k); m.drop = lerp(m.drop, st.drop || 0, k); m.last = st.t || 0;
    const t = st.t || 0, metrics = c.update(t, 'guard', 'one_two', { simulationTime: t, keepFaceClear: true, presentation: { mode: 'waiting', raise: 0 }, poseOverlay: rig => overlay(rig, { ...st, dt }, m) });
    if (st.talk != null) window.StoryCast?.talk(c, st.talk > 0 ? clamp(st.talk * (.35 + .65 * Math.abs(Math.sin(t * 11.3) * Math.sin(t * 4.1 + 1)))) : 0);
    return metrics;
  }
  /** World positions of the two foot balls (QA: a planted foot must not slide). */
  function feet(c) { c.root.updateMatrixWorld(true); return ['L', 'R'].map(s => c.joints['foot' + s].localToWorld(V(0, -.08, BALL)).toArray()); }
  /** Forgets the smoothed pose (new scene, or the rig went back to the game). */
  function reset(c) { mem.delete(c); }

  window.DreamPose = { civil, feet, reset, GESTURES, STRIDE, DUTY, step, profile, clearance };
})();
