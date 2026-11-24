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
 *   twist, hipYaw  optional (radians, default 0): the thorax's turn and the pelvis's turn (work: the mop sweep) ; shift: pelvis
 *                sideways over one foot (metres, rig x) ; feet { L, R }: [x, y, z, yaw?] ankle stands in rig space (y = lift)
 *   dt           frame time for smoothing (0 = jump to the pose)
 *   paws         { L, R }: paw shape override (relaxed | open | point | grip | fist); by default the gesture picks it (Paws.shapeFor,
 *                an exact reach holds a grip) and rig.pawPose = { L, R, time: renderTime } tells adventure/story/paws.js (GOTR-0100)
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
    carry: { h: [.31, .93, .06], pole: [.25, -.1, -1], palm: [-1, 0, 0], turn: .35 },      // straight arm with a weight (bag handles)
    pole: { h: [.2, 1.05, .4], pole: [.85, -.55, -.15], palm: [-1, 0, .3], turn: .5 }       // both hands on a stick in front (the mop): elbows out and down
  };
  const mem = new WeakMap();
  const memo = rig => { let m = mem.get(rig); if (!m) { m = { corr: { L: null, R: null }, roll: { L: null, R: null }, hand: { L: null, R: null }, pole: { L: null, R: null }, palm: { L: null, R: null }, turn: { L: .35, R: .35 }, yaw: 0, pitch: 0, walk: 0, lean: 0, drop: 0, last: -1 }; mem.set(rig, m); } return m; };
  const mirror = (a, s) => V(a[0] * s, a[1], a[2]);
  /** Turns direction a (in place) k of the way to direction b round their common axis: a lerp of two near-opposite
   *  directions passed through zero and the hand flipped over in one frame (155 deg at the start of the Super Punch raise). */
  const turnTo = (a, b, k) => { const la = a.length() || 1, n = b.clone().normalize(), u = a.clone().divideScalar(la), c = clamp(u.dot(n), -1, 1); if (c > .999) return a.lerp(b, k); let ax = u.clone().cross(n); if (ax.lengthSq() < 1e-8) { ax = u.clone().cross(V(0, 1, 0)); if (ax.lengthSq() < 1e-8) ax = u.clone().cross(V(1, 0, 0)); } return a.copy(u.applyAxisAngle(ax.normalize(), Math.acos(c) * k).multiplyScalar(lerp(la, b.length(), k))); };

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
  function clearArm(c, side, target, pole, rest = false, orient = () => {}, out = null) {
    const j = c.joints, prof = profile(c), glove = c.gloveMeshes?.[side]?.visible, hr = glove ? .11 : .05, t = target.clone(), pl = pole.clone();
    let err = c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], t, pl); orient();
    for (let it = 0; it < 6; it++) {
      const sh = c.point(j['arm' + side]), el = c.point(j['elbow' + side]), ha = c.point(j['hand' + side]);
      j['hand' + side].updateWorldMatrix(true, false); let dt = null; if (!rest) for (const q of handPoints(c, side)) { const d = clearance(c, prof, c.root.worldToLocal(j['hand' + side].localToWorld(q.clone())), .008, .022, side); if (d && (!dt || d.lengthSq() > dt.lengthSq())) dt = d; }
      const dh0 = clearance(c, prof, ha, hr, rest ? .006 : .02, side), dh = dt && (!dh0 || dt.lengthSq() > dh0.lengthSq()) ? dt : dh0, dm = clearance(c, prof, ha.clone().lerp(el, .5), .068, .02, side), de = clearance(c, prof, el, .055, .012, side), du = sh.y - el.y > .12 ? clearance(c, prof, sh.clone().lerp(el, .7), .062, .006, side) : null;
      if (!dh && !dm && !de && !du) break;
      const arm = [de, du, dm].filter(Boolean).reduce((a, d) => d.lengthSq() > a.lengthSq() ? d : a, V());
      t.add(dh && dh.lengthSq() > arm.lengthSq() ? dh : arm).add(dh && arm.lengthSq() ? dh.clone().multiplyScalar(.3) : V());
      if (arm.lengthSq()) pl.lerp(arm.clone().normalize(), .5 * clamp(arm.length() / .03)).normalize(); // turned out as far as the arm intrudes (a fixed half turn switched on and off between frames: a 28 deg shoulder pop, arm-fixes)
      const reach = (j['elbow' + side].position.length() + j['hand' + side].position.length()) * .985, off = t.clone().sub(sh); if (off.length() > reach) t.copy(sh).addScaledVector(off.normalize(), reach); // never past the arm's reach
      err = c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], t, pl); orient();
    }
    target.copy(t); if (out) out.pole = pl; return err;
  }

  /* ---------------------------------------------------------------- planted feet (ch1-motion; opt-in: state.plant)
   * The gait and the standing pose say where each ankle should go; this layer decides where it IS, in the world:
   *  - a foot on the ground stays exactly where it stands: no sliding when the body starts, stops, slows down or turns;
   *  - in the walk, each swing carries the foot from where it really is to where the gait lands it (the difference fades out
   *    over the swing), so the first steps out of a stand and the last ones into it are real steps;
   *  - standing, a foot more than 7 cm or 20 deg from where the stance wants it takes a step (one foot at a time, 0.26-0.42 s,
   *    lifted 3.5-7 cm, heel first off and heel first down, the pelvis over the other foot): he turns on the spot step by step.
   * Returns the pelvis shift toward the standing foot (rig x). A seek (dt 0), a pause or a cut that moves him > 0.8 m starts over. */
  const P_TOL = .07, P_YTOL = .35, CAD_MIN = .72, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function plant(c, st, m, plans, w, gnd) {
    const R = c.root; R.updateMatrixWorld(true);
    const o = R.localToWorld(V()), t = st.t || 0, dt = st.dt > 0 ? st.dt : 0, gait = w > .5 && (st.walk || 0) > 0; // he stopped: what is in the air finishes as a step
    const worldYaw = y => { const d = R.localToWorld(V(Math.sin(y), 0, Math.cos(y))).sub(o); return Math.atan2(d.x, d.z); };
    const localYaw = y => { const d = R.worldToLocal(o.clone().add(V(Math.sin(y), 0, Math.cos(y)))); return Math.atan2(d.x, d.z); };
    if (!m.plant || Math.abs(t - m.plant.t) > .25) m.plant = { t, L: null, R: null }; // a still frame (dt 0) keeps the feet; DreamPose.reset (a seek) starts over
    m.plant.t = t;
    const want = {};
    for (const p of plans) {
      const d = R.localToWorld(V(p.x, 0, p.z)); d.y = 0; want[p.side] = { d, yaw: worldYaw(p.yaw) };
      const F = m.plant[p.side];
      if (!F || Math.hypot(F.A.x - d.x, F.A.z - d.z) > .8) m.plant[p.side] = { A: d.clone(), yaw: want[p.side].yaw, swing: null, gp: false, O: V(), Oy: 0 };
    }
    const contactOff = (ly, th, ball) => R.localToWorld(V(0, -G.sole, ball ? BALL : -G.heel).applyQuaternion(footQ(ly, th))).sub(o); // ankle -> heel / ball, world
    const offAt = A => { if (!gnd) return 0; const l = R.worldToLocal(V(A.x, o.y, A.z)); return gnd(l.x, l.z - G.heel - .01, l.z + BALL); };
    let support = 0;
    for (const p of plans) {
      const F = m.plant[p.side], other = m.plant[p.side === 'L' ? 'R' : 'L'], { d, yaw: dy } = want[p.side];
      const standStep = (off, oy) => (F.settle = false, { kind: 'stand', A0: F.A.clone(), yaw0: F.yaw, O0: F.A.clone().sub(d), Y0: wrapA(F.yaw - dy), k: 0, dur: clamp(.24 + off * .6 + oy * .08, .26, .42), h: clamp(off * .45, .035, .07) });
      if (F.swing?.kind === 'gait' && !gait && (F.swing.kk ?? 0) > .85 && F.swing.kc == null) { // he stopped as this foot came down: it lands here, heel first
        const th = Math.min(0, p.pitch); F.swing = null; F.settle = true; F.ball = false; F.sp = th; F.C = F.A.clone().add(contactOff(localYaw(F.yaw), th, false));
      }
      if (F.swing?.kind === 'gait' && !gait) F.swing = standStep(Math.hypot(F.A.x - d.x, F.A.z - d.z), Math.abs(wrapA(F.yaw - dy))); // he stopped in mid-swing: the foot finishes as a step
      if (!F.swing) {
        if (gait && !p.planted && !other.swing) F.swing = { kind: 'gait', A0: F.A.clone(), yaw0: F.yaw, O0: F.A.clone().sub(d), Y0: wrapA(F.yaw - dy), u0: Math.min(p.u || 0, .95), g0: offAt(F.A) + R.position.y };
        else if (gait && !other.swing && Math.hypot(F.A.x - d.x, F.A.z - d.z) > .3) F.swing = standStep(Math.hypot(F.A.x - d.x, F.A.z - d.z), Math.abs(wrapA(F.yaw - dy))); // it missed its swing (the other foot was stepping): a catch-up step
        else if (!gait && !((st.walk || 0) > 0) && !other.swing && !(F.settle && Math.abs(F.sp) > .06)) { const off = Math.hypot(F.A.x - d.x, F.A.z - d.z), oy = Math.abs(wrapA(F.yaw - dy)); if (off > P_TOL || oy > P_YTOL) F.swing = standStep(off, oy); }
      }
      let lift = 0, pitch = null;
      if (F.swing) {
        const S = F.swing; let k;
        if (S.kind === 'gait') k = p.planted ? 1 : clamp(((p.u || 0) - S.u0) / Math.max(.05, 1 - S.u0));
        else { S.k += dt / S.dur; k = clamp(S.k); lift = S.h * Math.sin(Math.PI * k) ** .7; pitch = .22 * Math.sin(2 * Math.PI * k); support = -p.s * .03 * Math.sin(Math.PI * k); }
        S.kk = k; if (S.kind === 'stand') { const e = smooth((k - .15) / .7); F.A.copy(S.A0).lerp(d, e); F.yaw = S.yaw0 + wrapA(dy - S.yaw0) * e; } // from where it stood to where it is wanted now
        else if (S.hold) F.A.copy(S.hold); else if (k < .12) { S.O0.copy(S.A0).sub(d); S.Y0 = wrapA(S.yaw0 - dy); F.A.copy(S.A0); F.yaw = S.yaw0; } // toe-off: the ball stays on its spot (the body may be turning)
        else { const e = 1 - smooth((k - .12) / .88); F.A.copy(d).addScaledVector(S.O0, e); F.yaw = dy + S.Y0 * e; if (k >= 1) S.hold = F.A.clone(); } // then the gait's own swing, with what is left of the difference fading out // over its spot, still coming down: it stays over that spot
        if (k >= 1 && (S.kc == null || S.q >= 1)) { F.swing = null; F.gp = false; F.settle = false; F.C = null; F.sp = 0; } // landed: nothing of the last stance carries over // a step down lands when it has come down
      } else if (gait) { // planted in the walk: the point it rolls over (heel, then ball) stays on its spot; the ankle goes round it
        if (!p.planted) p.pitch = clamp(p.pitch, 0, .5); // held on its toes or flat (below)
        const ball = p.pitch > .02, off = contactOff(localYaw(F.yaw), p.pitch, ball);
        if (!F.gp || F.ball !== ball) { F.C = F.A.clone().add(off); F.gp = true; F.ball = ball; }
        F.A.copy(F.C).sub(off); F.settle = ball; F.sp = p.pitch;
      } else { // planted, standing: it stays where it is, flat; a foot stopped on its toes lowers its heel round the ball
        F.gp = false;
        if (F.settle && F.C && Math.abs(F.sp) > .01) { F.sp *= Math.exp(-dt * 9); pitch = F.sp; F.A.copy(F.C).sub(contactOff(localYaw(F.yaw), F.sp, F.ball)); } else { F.settle = false; pitch = 0; }
      }
      const loc = R.worldToLocal(V(F.A.x, o.y, F.A.z)), offA = gnd ? gnd(loc.x, loc.z - G.heel - .01, loc.z + BALL) : 0;
      if (!F.swing && gait && !p.planted) { const th = clamp(p.pitch, 0, .5); p.pitch = th; p.y = offA + G.sole * Math.cos(th) + BALL * Math.sin(th); p.off = offA; } // waits on its toes for the other foot to land
      else if (F.swing?.kind !== 'gait') { p.y = p.y - p.off + offA + lift; p.off = offA; if (pitch != null) p.pitch = pitch; }
      else { // a walking swing over a step: from the height it left to the height it lands on, never through the edge it passes
        const S = F.swing, k = S.kk, land = R.localToWorld(V(p.s * GAIT_X, 0, step(0, p.s, STRIDE).z + (1 - (p.u || 0)) * (1 - DUTY) * STRIDE * w)), g0 = S.g0 - R.position.y, g1 = offAt(land); S.down = g1 < g0 - .05; // land: where this step will come down (the body goes on for 1 - u of the swing)
        const edge = gnd ? gnd(loc.x, loc.z - (S.down ? -.01 : G.heel + .04), loc.z + BALL + .03) : 0; // stepping down, the toes go down first
        if (S.down && S.kc == null && edge < g0 - .05) { S.kc = k; S.qt = 0; } // stepping down: it comes down (in 0.2 s) once the toes are past the edge
        if (S.kc != null) S.qt += dt;
        const q = S.kc != null ? smooth(S.qt / .3) : S.down ? 0 : g1 > g0 ? smooth(k / .55) : smooth((k - .3) / .7), ow = Math.max(lerp(g0, g1, q), edge); S.q = q;
        p.y = p.y - p.off + ow + .02 * smooth(k / .2) * (1 - smooth((k - .82) / .18)); p.off = ow; p.hoff = S.down ? lerp(g0, g1, smooth(Math.max(k, q))) : lerp(g0, g1, smooth(k)); if (S.down && q > 0) p.pitch = Math.max(p.pitch, .38 * Math.sin(Math.PI * Math.min(1, q * 1.15)));
      }
      p.x = loc.x; p.z = loc.z; p.yaw = localYaw(F.yaw); p.planted = !F.swing;
    }
    return support;
  }

  function overlay(c, st, m) {
    // plant (ch1-motion): the step phase is integrated, and never slower than CAD_MIN cycles a second while he walks, so a
    // walk that speeds up from standing or slows into a stop takes short steps at a near-normal rhythm instead of one long
    // step in slow motion (a foot that hung in the air); the planted foot holds its own spot (plant), so this cannot slide
    let phase;
    if (st.plant && (st.walk || 0) > 0 && !m.going && m.plant?.L && m.plant?.R) { // setting off from standing: the foot further back steps first (its swing starts now)
      const R0 = c.root; R0.updateMatrixWorld(true); const zl = R0.worldToLocal(m.plant.L.A.clone().setY(R0.position.y)).z, zr = R0.worldToLocal(m.plant.R.A.clone().setY(R0.position.y)).z;
      m.ph = Math.floor(m.ph || 0) + (zl <= zr ? DUTY : DUTY - .5 + 1) + 1e-3;
    }
    m.going = st.plant && (st.walk || 0) > 0;
    if (st.plant) { const d = st.dist || 0; if (m.pd == null) m.ph = d / STRIDE; else if (st.dt > 0) { const dd = Math.max(0, d - m.pd); m.ph += Math.max(dd / STRIDE, (st.walk || 0) > 0 && dd > 1e-6 ? st.dt * CAD_MIN : 0); } m.pd = d; phase = ((m.ph % 1) + 1) % 1; }
    else phase = ((st.dist || 0) / STRIDE) % 1;
    const j = c.joints, t = st.t || 0, w = m.walk, tau = Math.PI * 2, sw = Math.sin(phase * tau), cw = Math.cos(phase * tau);
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
      const yawF = stand && stand[3] != null ? stand[3] : s * lerp(st.toes ?? .16, .07, w); // a planted foot keeps its own turn when the body turns over it
      if (g.planted) { // the toed-out foot: heel and ball lie along its own (turned) axis, the pivot stays on its spot
        const sy = Math.sin(yawF), cy = Math.cos(yawF), [oy, oz] = rot(-G.sole, g.ball ? BALL : -G.heel, g.pitch), L = g.ball ? G.heel + BALL : 0;
        g.x = g.x + L * sy - oz * sy; g.z = g.hz + L * cy - oz * cy; g.y = -oy;
      } else { // the same turn at toe-off and at the next heel strike, blended through the swing (no jump at either end)
        const sy = Math.sin(yawF), cy = Math.cos(yawF), L = G.heel + BALL, o0 = rot(-G.sole, BALL, G.toe)[1], o1 = rot(-G.sole, -G.heel, -G.hs)[1], k = smooth(g.u);
        g.x += lerp((L - o0) * sy, -o1 * sy, k); g.z += lerp((L - o0) * (cy - 1), -o1 * (cy - 1), k);
      }
      plans.push({ side, s, off, x: lerp(sx, g.x, w), y: lerp(sy, g.y, w) + off, z: lerp(sz, g.z, w), pitch: g.pitch * w, yaw: yawF, planted: g.planted || w < .5, u: g.u });
    }
    const support = st.plant ? plant(c, st, m, plans, w, gnd) : 0;
    // pelvis (GOTR-0097): nearly level. A small bob, lowest just after each heel strike (double support), highest at
    // mid-stance; it turns +-5 deg (the hip of the leading leg forward), drops +-3.5 deg on the swing side while the other
    // leg takes the weight, and shifts 2 cm over the stance foot
    const hips = j.hips, pL = phase, yaw = .085 * Math.cos(pL * tau) * w, roll = -.06 * Math.sin((pL + .15) * tau) * w, hb = (pL * 2) % 1, bob = hb < .16 ? -.3 * Math.sin(Math.PI * hb / .16) : hb < .5 ? smooth((hb - .16) / .34) : 1 - smooth((hb - .5) / .5); // the knee gives a little as the heel takes the weight (dip at loading)
    const sway = -.02 * Math.sin((pL - .05) * tau) * w + .012 * shift;
    const twist = st.twist || 0, hipYaw = st.hipYaw || 0; // work (the mop, GOTR-0099): the thorax turns toward the job, the pelvis a little the other way
    hips.rotation.set(0, yaw + hipYaw, roll + .02 * shift); hips.position.set(sway + (st.shift || 0) + support, HIP, .012 * w); // shift: the weight over one foot (rig x); support: over the standing foot during a step (plant)
    c.root.updateMatrixWorld(true);
    let ho = ((plans[0].hoff ?? plans[0].off) + (plans[1].hoff ?? plans[1].off)) / 2; // the ground under the feet; plant: the body goes down a step (or up) over ~0.2 s, the knees take it
    if (st.plant) { ho = m.ho == null || !(st.dt > 0) ? ho : m.ho + (ho - m.ho) * (1 - Math.exp(-st.dt * 12)); m.ho = ho; }
    let y = lerp(HIP + .004 * breath * idle, WALK_Y + BOB * bob, w) - (m.drop || 0) + ho;
    for (const p of plans) { const start = c.point(j['thigh' + p.side]), reach = (j['knee' + p.side].position.length() + j['foot' + p.side].position.length()) * (p.planted ? .998 : 1.02), dx = start.x - p.x, dz = start.z - p.z; y = Math.min(y, p.y + Math.sqrt(Math.max(.01, reach * reach - dx * dx - dz * dz))); } // never past the legs' reach
    if (st.plant) { if (m.hy != null && st.dt > 0 && y > m.hy) y = m.hy + (y - m.hy) * (1 - Math.exp(-st.dt * 10)); m.hy = y; } // plant: the body rises back smoothly (it may always sink: the legs reach)
    hips.position.y = y;
    const stoop = c.cast?.stoop ?? (c.character === 'bruno' ? .085 : 0), lean = m.lean + .04 * w + stoop; // the old champion carries his years in his back
    // the thorax turns against the pelvis and keeps the shoulders level; neck and head take the turn back out (head steady)
    // plant (ch1-motion): the shoulders follow the gaze a little (a third of the head turn is taken by the spine and chest,
    // the neck and head the rest: the same gaze), so eyes, shoulders and then the feet turn in that order
    const gz = st.plant ? .32 * m.yaw : 0;
    j.spine.rotation.set(.02 + lean * .5 + .008 * breath, -yaw * .85 + (twist - hipYaw) * .45 + gz * .4, -roll * .5 - .012 * shift); j.chest.rotation.set(.015 + lean * .5 - .012 * breath, -yaw * 1.0 + (twist - hipYaw) * .55 + gz * .6, -roll * .35 - .008 * shift);
    j.neck.position.copy(c.neckRest); j.neck.rotation.set(-m.pitch * .4 - (lean - stoop * .4) * .5, (m.yaw - gz) * .4 + yaw * .4, 0);
    const nod = (st.nod || 0) * .06 * Math.sin(t * 6.5) + (st.talk || 0) * .025 * Math.sin(t * 9.1) + (st.listen || 0) * .05 * Math.max(0, Math.sin(t * 1.9 + 1)) ** 4;
    j.head.rotation.set(.03 - m.pitch * .6 - lean * .4 + nod + .012 * w * Math.cos(2 * tau * (pL - .02)), (m.yaw - gz) * .6 + yaw * .45, (st.tilt || 0) + (st.reach?.tilt || 0) + (st.listen || 0) * .05 + .012 * shift - roll * .15);
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
    const gloves = [], handErrors = [], paws = { time: c.renderTime }; // GOTR-0100: the paw shape for each gesture (adventure/story/paws.js reads it this frame)
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1, name = st.arms?.[side] || 'hang', g = GESTURES[name] || GESTURES.hang, swing = (name === 'hang' ? 1 : name === 'carry' ? .25 : 0) * w * (s < 0 ? -1 : 1) * Math.cos((phase - .04) * tau); // the arm swings against its own leg
      // reach[side]: an array = the hand target in rig space (smoothed like a gesture); an object { at: [x, y, z] | (rig) =>
      // [x, y, z], w 0..1, pole?, palm?, turn?, paw? } = a contact taken after the gesture: the hand goes w of the way from
      // the gesture to `at`, exactly (not smoothed), so a hand on a moving prop stays on it (arm-fixes); a function is
      // evaluated now, after the trunk is posed, so a target on the body moves with it this frame
      const rr = st.reach?.[side], ro = rr && !Array.isArray(rr) && typeof rr === 'object' ? rr : null, rw = ro ? clamp(ro.w ?? 1) : 0;
      paws[side] = st.paws?.[side] || (ro ? (ro.paw && rw > .5 ? ro.paw : rw > .5 ? 'grip' : (window.Paws?.shapeFor(name) || 'relaxed')) : rr ? 'grip' : (window.Paws?.shapeFor(name) || 'relaxed')); // an exact reach holds something (the mop): a grip
      const hand = rr && !ro ? V(...rr) : mirror(g.h, s), pole = mirror(g.pole, s), palm = mirror(g.palm, s); // reach: an exact hand target in rig space
      hand.z += swing > 0 ? .21 * swing : .15 * swing; hand.y += (swing > 0 ? .055 : .015) * Math.abs(swing) + .004 * breath * idle; hand.x += s * (.012 * w) - s * .015 * Math.max(0, swing); // from the shoulder: ~22 deg forward with the elbow a little more bent, ~15 deg back
      if (name !== 'hang' && name !== 'carry' && name !== 'strap' && name !== 'hips' && name !== 'cross' && name !== 'cross2') { const beat = (st.talk || 0) * Math.sin(t * 5.3 + s); hand.y += .022 * beat; hand.z += .018 * beat; } // the hand moves with the words
      const k = st.dt > 0 && m.hand[side] ? 1 - Math.exp(-st.dt * 9) : 1;
      m.hand[side] = m.hand[side] ? m.hand[side].lerp(hand, k) : hand; m.pole[side] = m.pole[side] ? turnTo(m.pole[side], pole, k) : pole; m.palm[side] = m.palm[side] ? turnTo(m.palm[side], palm, k) : palm; m.turn[side] = lerp(m.turn[side], g.turn, k);
      const target = m.hand[side].clone(); target.y += hips.position.y - HIP; // hands ride with the pelvis
      if (name === 'strap') { const ch = j.chest, M = new THREE.Matrix4().copy(c.root.matrixWorld).invert().multiply(ch.matrixWorld); target.copy(m.hand[side]).sub(restOf(c, ch)).applyMatrix4(M); } // the hand on the strap moves with the chest
      let aPole = m.pole[side], aPalm = m.palm[side], aTurn = m.turn[side];
      if (ro && rw > 0) {
        c.root.updateMatrixWorld(true); const at = typeof ro.at === 'function' ? ro.at(c) : ro.at;
        if (at) { target.lerp(V(...at), rw); if (ro.pole) aPole = aPole.clone().lerp(V(...ro.pole).normalize(), rw).normalize(); if (ro.palm) aPalm = aPalm.clone().lerp(V(...ro.palm).normalize(), rw).normalize(); if (ro.turn != null) aTurn = lerp(aTurn, ro.turn, rw); }
      }
      let glove = null; const asked = target.clone(), cleared = {}, orient = () => (glove = c.orientGlove(side, aTurn, aPalm, m.roll));
      let err = clearArm(c, side, target, aPole, name === 'strap' || !!(ro?.rest && rw > 0), orient, cleared); // the strap hand rests on the strap; the last orientation is returned
      // arm-fixes: the body clearance switches between the trunk's bones by height, so the push it gives the hand could appear
      // for a single frame (a 2.5 cm hand pop and an 8 deg shoulder jump as he stopped beside Otto's bag). The push is eased in
      // over ~40 ms and out over ~100 ms.
      const push = target.clone().sub(asked), had = m.corr[side];
      if (st.dt > 0 && had && !(rr && !ro)) { // not for an exact array target (the corner, the mop, the count keep their exact clearance)
        had.lerp(push, 1 - Math.exp(-st.dt * (push.lengthSq() > had.lengthSq() ? 25 : 10)));
        if (had.distanceTo(push) > .002) { target.copy(asked).add(had); err = c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], target, cleared.pole || aPole); orient(); }
      } else m.corr[side] = push;
      handErrors.push(err); gloves.push(glove);
    }
    c.pawPose = paws;
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

  window.DreamPose = { civil, feet, reset, GESTURES, STRIDE, DUTY, step, profile, clearance, restOf };
})();
