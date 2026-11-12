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
  const STRIDE = 1.16, DUTY = .62, ANKLE = .12, BALL = .13, HIP = .972, GAIT_X = .092;
  // hand targets in rig space for the +x arm (mirrored for the other): [hand x, y, z], elbow pole, palm direction, wrist turn
  const GESTURES = {
    hang: { h: [.335, .985, .055], pole: [.25, -.1, -1], palm: [-1, 0, 0], turn: .35 },
    strap: { h: [.175, 1.50, .225], pole: [.9, -.7, -.15], palm: [0, 0, -1], turn: .6 },   // holding the bag strap at the chest
    open: { h: [.30, 1.20, .36], pole: [.7, -.8, -.3], palm: [0, 1, 0], turn: .9 },        // palm up: explaining
    fist: { h: [.085, 1.43, .255], pole: [.9, -.45, -.1], palm: [0, 0, -1], turn: .6 },    // fist on the chest: a promise
    point: { h: [.2, 1.47, .64], pole: [.6, -.8, 0], palm: [0, -1, 0], turn: .4 },
    hips: { h: [.305, 1.085, .03], pole: [1, .1, -.55], palm: [-1, 0, .2], turn: .5 },
    thumb: { h: [.47, 1.50, -.02], pole: [.4, -.9, .3], palm: [0, 0, 1], turn: .5 },       // thumb over the shoulder: "him"
    chin: { h: [.075, 1.735, .275], pole: [.8, -.7, .1], palm: [0, 0, -1], turn: .6 },
    cross: { h: [-.105, 1.36, .255], pole: [.8, -.75, .2], palm: [0, 0, -1], turn: .7 },   // arms folded
    cross2: { h: [-.14, 1.305, .285], pole: [.8, -.75, .2], palm: [0, 0, -1], turn: .7 },
    pound: { h: [.075, 1.36, .33], pole: [.85, -.6, 0], palm: [-1, 0, 0], turn: .5 },      // glove into glove
    low: { h: [.30, 1.02, .16], pole: [.4, -.3, -1], palm: [-1, 0, 0], turn: .4 },         // offering a hand low
    carry: { h: [.31, .93, .06], pole: [.25, -.1, -1], palm: [-1, 0, 0], turn: .35 }       // straight arm with a weight (bag handles)
  };
  const mem = new WeakMap();
  const memo = rig => { let m = mem.get(rig); if (!m) { m = { hand: { L: null, R: null }, pole: { L: null, R: null }, palm: { L: null, R: null }, turn: { L: .35, R: .35 }, yaw: 0, pitch: 0, walk: 0, lean: 0, drop: 0, last: -1 }; mem.set(rig, m); } return m; };
  const mirror = (a, s) => V(a[0] * s, a[1], a[2]);

  /** One leg of the walk cycle at phase p (0..1): ankle position in rig space, foot pitch, whether it is planted. */
  function step(p, s, stride) {
    const half = stride * DUTY / 2;
    if (p < DUTY) { // stance: the ball of the foot stays on its spot while the body travels over it
      const u = p / DUTY, toe = .62 * smooth((u - .66) / .34), heel = -.30 * (1 - smooth(u / .16));
      return { x: s * GAIT_X, y: ANKLE + BALL * Math.sin(toe), z: half - stride * DUTY * u + BALL * (1 - Math.cos(toe)), pitch: toe + heel, planted: true, u };
    }
    const w = (p - DUTY) / (1 - DUTY), k = smooth(w), toe0 = .62, z0 = -half + BALL * (1 - Math.cos(toe0)), y0 = ANKLE + BALL * Math.sin(toe0);
    return { x: s * GAIT_X, y: lerp(y0, ANKLE, k) + .075 * Math.sin(Math.PI * Math.min(1, w * 1.08)) * (1 - .3 * w), z: lerp(z0, half, k), pitch: lerp(toe0, -.30, smooth(w * 1.15)), planted: false, u: w };
  }
  const footQ = (yaw, pitch) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

  function overlay(c, st, m) {
    const j = c.joints, t = st.t || 0, w = m.walk, phase = ((st.dist || 0) / STRIDE) % 1, tau = Math.PI * 2, sw = Math.sin(phase * tau), cw = Math.cos(phase * tau);
    const breath = Math.sin(t * 1.7 + (c.character ? 1.3 : 0)), idle = 1 - w, shift = Math.sin(t * .43 + (c.character === 'bruno' ? 2 : 0)) * idle;
    // legs: stand targets blended with the walk cycle
    const plans = [];
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R', g = step((phase + (s < 0 ? 0 : .5)) % 1, s, STRIDE), stand = st.feet?.[side];
      const sx = stand ? stand[0] : s * (st.wide ?? .118), sz = stand ? stand[2] : s * -.012, sy = ANKLE + (stand ? stand[1] : 0);
      plans.push({ side, s, x: lerp(sx, g.x, w), y: lerp(sy, g.y, w), z: lerp(sz, g.z, w), pitch: g.pitch * w, yaw: s * lerp(st.toes ?? .16, .07, w), planted: g.planted });
    }
    // pelvis: turns with the swinging leg, rolls onto the stance leg, rides as high as the legs allow
    const hips = j.hips, yaw = .11 * sw * w, sway = (-.022 * sw) * w + .012 * shift;
    hips.rotation.set(0, yaw, .035 * sw * w + .02 * shift); hips.position.set(sway, HIP, .01 * w);
    c.root.updateMatrixWorld(true);
    let y = HIP + .004 * breath * idle - (m.drop || 0);
    for (const p of plans) { const start = c.point(j['thigh' + p.side]), reach = (j['knee' + p.side].position.length() + j['foot' + p.side].position.length()) * (p.planted ? .992 : .975), dx = start.x - p.x, dz = start.z - p.z; y = Math.min(y, p.y + Math.sqrt(Math.max(.01, reach * reach - dx * dx - dz * dz))); }
    hips.position.y = y - .012 * w;
    const lean = m.lean + .035 * w;
    j.spine.rotation.set(.02 + lean * .5 + .008 * breath, -yaw * .75, -.03 * sw * w - .012 * shift); j.chest.rotation.set(.015 + lean * .5 - .012 * breath, -yaw * .9, -.02 * sw * w - .008 * shift);
    j.neck.position.copy(c.neckRest); j.neck.rotation.set(-m.pitch * .4 - lean * .5, m.yaw * .4 + yaw * .3, 0);
    const nod = (st.nod || 0) * .06 * Math.sin(t * 6.5) + (st.talk || 0) * .025 * Math.sin(t * 9.1);
    j.head.rotation.set(.03 - m.pitch * .6 - lean * .4 + nod, m.yaw * .6 + yaw * .35, (st.tilt || 0) + .012 * shift);
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
      const s = side === 'L' ? -1 : 1, name = st.arms?.[side] || 'hang', g = GESTURES[name] || GESTURES.hang, swing = (name === 'hang' ? 1 : name === 'carry' ? .25 : 0) * w * (s < 0 ? -sw : sw);
      const hand = mirror(g.h, s), pole = mirror(g.pole, s), palm = mirror(g.palm, s);
      hand.z += .19 * swing; hand.y += .035 * Math.abs(swing) + .004 * breath * idle; hand.x += s * (.012 * w);
      if (name !== 'hang' && name !== 'carry' && name !== 'strap' && name !== 'hips' && name !== 'cross' && name !== 'cross2') { const beat = (st.talk || 0) * Math.sin(t * 5.3 + s); hand.y += .022 * beat; hand.z += .018 * beat; } // the hand moves with the words
      const k = st.dt > 0 && m.hand[side] ? 1 - Math.exp(-st.dt * 9) : 1;
      m.hand[side] = m.hand[side] ? m.hand[side].lerp(hand, k) : hand; m.pole[side] = m.pole[side] ? m.pole[side].lerp(pole, k) : pole; m.palm[side] = m.palm[side] ? m.palm[side].lerp(palm, k) : palm; m.turn[side] = lerp(m.turn[side], g.turn, k);
      const target = m.hand[side].clone(); target.y += hips.position.y - HIP; // hands ride with the pelvis
      handErrors.push(c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], target, m.pole[side])); gloves.push(c.orientGlove(side, m.turn[side], m.palm[side]));
    }
    const bag = c.storyCast?.bagBody; if (bag) bag.rotation.z = -.5 + .045 * Math.sin(phase * tau * 2) * w;
    return { gloves, handErrors, footTargets };
  }
  function civil(c, st = {}) {
    const m = memo(c), dt = st.dt > 0 && m.last >= 0 ? st.dt : 0, k = dt ? 1 - Math.exp(-dt * 7) : 1, kw = dt ? 1 - Math.exp(-dt * 10) : 1;
    m.walk = lerp(m.walk, clamp(st.walk || 0), kw); m.yaw = lerp(m.yaw, clamp(st.look?.yaw || 0, -1.15, 1.15), k); m.pitch = lerp(m.pitch, clamp(st.look?.pitch || 0, -.5, .6), k); m.lean = lerp(m.lean, st.lean || 0, k); m.drop = lerp(m.drop, st.drop || 0, k); m.last = st.t || 0;
    const t = st.t || 0, metrics = c.update(t, 'guard', 'one_two', { simulationTime: t, keepFaceClear: true, presentation: { mode: 'waiting', raise: 0 }, poseOverlay: rig => overlay(rig, { ...st, dt }, m) });
    if (st.talk != null) window.StoryCast?.talk(c, st.talk > 0 ? clamp(st.talk * (.35 + .65 * Math.abs(Math.sin(t * 11.3) * Math.sin(t * 4.1 + 1)))) : 0);
    return metrics;
  }
  /** World positions of the two foot balls (QA: a planted foot must not slide). */
  function feet(c) { c.root.updateMatrixWorld(true); return ['L', 'R'].map(s => c.joints['foot' + s].localToWorld(V(0, -.08, BALL)).toArray()); }
  /** Forgets the smoothed pose (new scene, or the rig went back to the game). */
  function reset(c) { mem.delete(c); }

  window.DreamPose = { civil, feet, reset, GESTURES, STRIDE, DUTY, step };
})();
