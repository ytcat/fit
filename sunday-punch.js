/* GOTR-0088 "Sunday Punch": the knockout presentation of the Finisher (rules in boxing-fight.js, the punch itself in
 * fight-arena.js / boxing-coach-v2.js). Everything here runs on the game rigs in real time, inside the mirrored ring cast:
 *  - slow motion (~0.3x) from the dip to the impact and just after it (FightArena.update maps wall time to fight time);
 *  - the knocked-out fall: head snaps back, the feet leave the canvas, the body goes limp and falls flat on its back,
 *    one arm flops, a short settle, eyes closed, jaw slack. The rest height is calibrated on the rig's own final pose and a
 *    support pass keeps every limb above the canvas, so the body neither floats nor sinks;
 *  - the striker follows through, turns away and walks to a neutral corner; the referee (Coach Bruno in the gym fight)
 *    waves it off without a count, then raises the winner's arm;
 *  - a low side camera, impact flash, sweat spray, canvas dust, a deep impact, the landing thud and the crowd.
 * Rig roots keep scale 1 inside the mirrored cast (the view's dispose gives them back -1, as for every bout).
 * The match result waits while it plays (BoxingFight.finisherHold); a tap skips it once the player has seen it once. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const SEEN = 'gotr-sunday-punch-seen', SLOW = .3, FOV = 50;
  // Fall timeline in fight seconds after the impact.
  const T = { snap: .06, air: .24, land: .80, flop: 1.02, settle: 1.6, refWalk: [.12, 1.15], wave: [1.15, 2.55], turn: [.9, 1.25], walk: [1.25, 2.85] };
  const other = a => a === 'lion' ? 'rabbit' : 'lion';
  // Slow motion: the dip and drive, the impact and a little after it run at SLOW, then ease back to real time.
  function timeScale(view) {
    const m = view.match, sp = view.sundayPunch; if (!m || sp?.skip) return 1;
    const r = m.result;
    if (r?.finisher) { const u = m.time - r.finisherTime; return u < .25 ? SLOW : u < .62 ? lerp(SLOW, 1, smooth((u - .25) / .37)) : 1; }
    for (const a of ['lion', 'rabbit']) { const act = m.fighters[a].action; if (act?.finisher && !act.recorded) return m.time - act.start < .05 ? lerp(1, SLOW, (m.time - act.start) / .05) : SLOW; }
    return 1;
  }

  /* ---------- the knocked-out body ---------- */
  // Body volume supports (the same ellipsoids the knockdown uses) plus the real boot and glove boxes: lowest world y.
  function lowest(coach) {
    const j = coach.joints; let low = Infinity; coach.root.updateMatrixWorld(true);
    const ell = (bone, centre, r) => { const p = bone.localToWorld(V(...centre)), a = bone.matrixWorld.elements; low = Math.min(low, p.y - Math.hypot(a[1] * r[0], a[5] * r[1], a[9] * r[2])); };
    ell(j.hips, [0, .06, 0], [.25, .23, .19]); ell(j.spine, [0, .10, 0], [.25, .23, .19]); ell(j.chest, [0, .13, -.018], [.34, .27, .22]); ell(j.head, [0, .13, .03], [.19, .22, .20]);
    for (const side of ['L', 'R']) {
      ell(j['thigh' + side], [0, -.20, .01], [.14, .24, .15]); ell(j['knee' + side], [0, -.18, -.01], [.10, .22, .11]);
      const sign = side === 'L' ? -1 : 1; ell(j['arm' + side], [sign * .17, 0, 0], [.20, .13, .13]); ell(j['elbow' + side], [sign * .15, 0, 0], [.18, .075, .08]);
      for (const root of [j['foot' + side], coach.gloveMeshes?.[side]]) if (root?.visible !== false) root?.traverse(part => { if (!part.isMesh || !part.visible) return; const g = part.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) low = Math.min(low, V(x, y, z).applyMatrix4(part.matrixWorld).y); });
    }
    return low;
  }
  // Rig-space pose of the knocked-out fighter at fall time u (seconds after the impact). Rig axes: +z forward, +y up, L at -x.
  function fallState(u, ctx) {
    const snap = smooth(u / T.snap), air = clamp(u / T.air), s = clamp((u - T.air) / (T.land - T.air));
    const landed = u >= T.land, after = Math.max(0, u - T.land), bounce = landed ? Math.exp(-after / .10) * Math.sin(after * 30) : 0;
    const limp = smooth((u - .08) / .45), rest = smooth((u - T.land) / (T.settle - T.land));
    // the whole body rotates back about the heels: a little in the air, then like a falling tree (accelerating), flat at landing
    const tilt = u < T.air ? -.20 * smooth(air) : -.20 - (Math.PI / 2 - .20) * s * s;
    return { u, snap, air, s, landed, after, bounce, limp, rest, tilt };
  }
  // Overlay for the controller (update(..., {poseOverlay})): pelvis, spine, head, legs and both limp arms for this frame.
  function koOverlay(c, st, ctx) {
    const j = c.joints, { u, snap, s, landed, bounce, limp, rest } = st, flop = ctx.flop, sg = flop === 'L' ? -1 : 1;
    const breathe = landed ? Math.sin(u * 2.1) * .012 * rest : 0;
    // pelvis: in the air the hips are carried up and back by the blow; falling, the knees give a little; flat on the back at rest
    const knee = .10 * limp * (1 - rest) + .05 * rest;
    j.hips.position.set(0, .935 - knee * .35, -.02 * limp);
    j.hips.rotation.set(-.06 * snap * (1 - s) + .05 * rest, 0, 0);
    // trunk: thrown back by the uppercut (extension), then lying flat; a slight rebound on landing
    const arch = -.16 * snap * (1 - rest) - .08 * s * (1 - rest);
    const adj = ctx.adj || { spine: 0, neck: 0, hand: { L: 0, R: 0 }, foot: { L: 0, R: 0 } };
    j.spine.rotation.set(arch * .6 - .04 * rest + adj.spine * rest + breathe, .04 * limp * sg, .03 * limp * sg);
    j.chest.rotation.set(arch * .5 - .03 * rest - breathe, .03 * limp * sg, .02 * limp * sg);
    for (const side of ['L', 'R']) { const k = side === 'L' ? -1 : 1, sc = j['scapula' + side]; if (sc) { sc.position.set(k * .17, .17 + .02 * limp * (1 - rest), -.06); sc.rotation.set(0, 0, 0); } }
    // head: snaps back with the chin lifted, lags the fall, bumps the canvas, then rolls to one side (toward the camera)
    const roll = smooth((u - (T.land + .10)) / .55);
    j.neck.position.copy(c.neckRest); j.neck.rotation.set(-.30 * snap * (1 - .6 * rest) + .18 * bounce + adj.neck * rest, .10 * roll * ctx.face, 0);
    j.head.rotation.set(-.55 * snap * (1 - .7 * rest) - .10 * s * (1 - rest) + .22 * bounce - .05 * rest, .55 * roll * ctx.face, .14 * roll * ctx.face);
    c.root.updateMatrixWorld(true);
    // legs: feet stay at the heels' pivot (they lift with the body, then slide out), knees buckle a little, toes fall outward at rest
    const footTargets = [];
    for (const side of ['L', 'R']) {
      const k = side === 'L' ? -1 : 1, foot = j['foot' + side];
      const stand = V(k * .118, .12, k * -.03 + (side === 'L' ? .10 : -.06));
      const lying = V(k * (.20 + (side === ctx.bentLeg ? -.04 : .02)), side === ctx.bentLeg ? .30 : .10, side === ctx.bentLeg ? .02 : -.11);
      lying.z += adj.foot[side];
      const ankle = stand.lerp(lying, smooth((u - .15) / .75));
      const out = k * .55 * rest, toePitch = lerp(0, side === ctx.bentLeg ? .25 : -.30, rest) + .20 * limp * (1 - rest);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(toePitch, out, 0, 'YXZ'));
      const err = c.solve(j['thigh' + side], j['knee' + side], foot, ankle, V(k * .10, .05, 1)); c.orient(foot, q);
      if (foot.userData.bootAnkle) foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0, 1, 0), c.point(j['knee' + side]).sub(ankle).normalize().applyQuaternion(q.clone().invert()));
      footTargets.push({ side, error: err, ankle: ankle.toArray(), pivot: 0, lift: 1, contact: ankle.toArray() });
    }
    // arms: from the guard they are flung up by the fall, the far arm lands with the body, the flop arm a beat later and bounces
    const gloves = [], handErrors = [];
    for (const side of ['L', 'R']) {
      const k = side === 'L' ? -1 : 1, isFlop = side === flop, guard = V(...ctx.guard[side]);
      const fling = V(k * .40, 1.78, .30);
      const lie = isFlop ? V(k * .74, 1.78, -.02 + adj.hand[side]) : V(k * .50, 1.14, -.02 + adj.hand[side]);
      const landAt = isFlop ? T.flop : T.land + .04, a = smooth(u / .45), b = smooth((u - (landAt - .30)) / .30);
      const hand = guard.clone().lerp(fling, a * (1 - b)).lerp(lie, b);
      if (isFlop && u > landAt) { const w = u - landAt; hand.z += .07 * Math.exp(-w / .09) * Math.abs(Math.sin(w * 26)); } // the glove bounces off the canvas
      hand.z += breathe * .5;
      // the elbow bends in the plane of the canvas once down (an elbow pointing into the floor would prop the body up)
      const pole = V(k * .2, -.4, -1).lerp(isFlop ? V(k * .35, -1, .25) : V(k * 1, -.35, .25), b);
      handErrors.push(c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], hand, pole.normalize()));
      gloves.push(c.orientGlove(side, .3 * limp, V(0, lerp(-1, 0, limp), lerp(0, -1, limp)).normalize()));
    }
    return { gloves, handErrors, footTargets };
  }
  // Poses the knocked-out fighter at u: root transform from the timeline, the body by the overlay, then the canvas support.
  function poseFallen(view, actor, u) {
    const sp = view.sundayPunch, ctx = sp.fall, coach = view.coaches[actor], st = fallState(u, ctx);
    const travel = .16 * smooth(u / T.air) + .24 * smooth((u - T.air) / (T.land - T.air + .2)), twist = ctx.twist * smooth((u - .1) / (T.land - .1));
    const root = coach.root, back = V(-Math.sin(ctx.yaw + twist), 0, -Math.cos(ctx.yaw + twist));
    root.position.copy(ctx.start).addScaledVector(back, travel).add(ctx.shift.clone().multiplyScalar(smooth(u / T.land)));
    root.quaternion.setFromEuler(new THREE.Euler(st.tilt, ctx.yaw + twist, 0, 'YXZ'));
    const lift = .075 * Math.sin(Math.PI * clamp(u / T.air)), restY = ctx.restY ?? .2;
    root.position.y = st.landed ? restY + .035 * Math.abs(st.bounce) * Math.exp(-st.after / .2) : lift + restY * Math.sin(-st.tilt) ** 2 * smooth(st.s);
    const t = view.match.time;
    const metrics = coach.update(t, 'guard', 'one_two', { simulationTime: t, keepFaceClear: false, poseOverlay: rig => koOverlay(rig, st, ctx) });
    // support: never below the canvas while falling; flat on it (not hovering) once landed
    const low = lowest(coach), floor = Math.min(.004, ctx.supportLow ?? .004);
    if (low < floor) { root.position.y += floor - low; coach.syncSkin(); }
    face(coach, u);
    return metrics;
  }
  // Eyes closed, jaw slack (the face controller ran inside update; these come after it).
  function face(coach, u) {
    const shut = smooth((u - .05) / .12), f = coach.faceActing;
    for (const eye of f?.eyes || coach.facialRest?.filter(x => x.eye) || []) eye.part.scale.y = eye.sy * Math.max(.06, 1 - shut * .94);
    if (f?.inner) { const jaw = .55 * smooth((u - .15) / .4); f.inner.visible = jaw > .08; f.inner.scale.y = .001 + .018 * jaw; f.lip.position.y = -.018 * jaw; }
    if (coach.painMouth) coach.painMouth.visible = false;
  }
  // Lowest world y of the deformed skin (sampled) and of the boots and gloves: what really touches the canvas.
  function skinLowest(coach, stride = 3) {
    coach.root.updateMatrixWorld(true); let low = Infinity; const p = coach.skin?.geometry?.attributes?.position;
    if (p && coach.skinPoint) for (let i = 0; i < p.count; i += stride) low = Math.min(low, coach.root.localToWorld(coach.skinPoint(coach.skin, i)).y);
    return Math.min(low, lowest(coach));
  }
  // Gaps of the parts that should rest on the canvas (ellipsoid / mesh-box lows), for the settle.
  function gaps(coach) {
    const j = coach.joints, g = { hand: {}, foot: {} }; coach.root.updateMatrixWorld(true);
    const ell = (bone, centre, r) => { const p = bone.localToWorld(V(...centre)), a = bone.matrixWorld.elements; return p.y - Math.hypot(a[1] * r[0], a[5] * r[1], a[9] * r[2]); };
    const box = root => { let low = Infinity; if (root?.visible === false) return low; root?.traverse(part => { if (!part.isMesh || !part.visible) return; const b = part.geometry.boundingBox || (part.geometry.computeBoundingBox(), part.geometry.boundingBox); for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) low = Math.min(low, V(x, y, z).applyMatrix4(part.matrixWorld).y); }); return low; };
    g.hips = ell(j.hips, [0, .06, 0], [.25, .23, .19]); g.chest = ell(j.chest, [0, .13, -.018], [.34, .27, .22]); g.head = ell(j.head, [0, .13, .03], [.19, .22, .20]);
    for (const side of ['L', 'R']) { const h = box(coach.gloveMeshes?.[side]); g.hand[side] = Number.isFinite(h) ? h : j['hand' + side].getWorldPosition(V()).y - .045; g.foot[side] = box(j['foot' + side]); } // bare hands (ringless venues): the fist itself
    return g;
  }
  // The settle: from this rig's own final lying pose, bring the pelvis, the back of the head, both gloves and both heels onto the
  // canvas plane of the back (a few passes), then take the rest height at which the lowest point of the skin touches the canvas.
  function calibrate(view, actor) {
    const sp = view.sundayPunch, coach = view.coaches[actor], root = coach.root, keep = { p: root.position.clone(), q: root.quaternion.clone() };
    const ctx = sp.fall, end = T.settle + .6, st = fallState(end, ctx), t = view.match.time;
    ctx.restY = 0; ctx.adj = { spine: 0, neck: 0, hand: { L: 0, R: 0 }, foot: { L: 0, R: 0 } };
    const posed = () => { root.position.set(0, 0, 0); root.quaternion.setFromEuler(new THREE.Euler(st.tilt, 0, 0, 'YXZ')); coach.update(t, 'guard', 'one_two', { simulationTime: t, poseOverlay: rig => koOverlay(rig, st, ctx) }); return gaps(coach); };
    for (let pass = 0; pass < 4; pass++) {
      const g = posed(), base = g.chest, a = ctx.adj;
      a.spine = clamp(a.spine + (g.hips - base) / .40, -.35, .35);
      a.neck = clamp(a.neck - (g.head - base - .01) / .24, -.6, .4);
      for (const side of ['L', 'R']) { a.hand[side] = clamp(a.hand[side] - (g.hand[side] - base), -.25, .25); a.foot[side] = clamp(a.foot[side] - (g.foot[side] - base), -.25, .25); }
    }
    posed(); ctx.restY = .002 - skinLowest(coach, 2); ctx.supportLow = lowest(coach) + ctx.restY; // the ellipsoid low that means "touching"
    root.position.copy(keep.p); root.quaternion.copy(keep.q); root.updateMatrixWorld(true);
  }

  /* ---------- the bout under the finisher ---------- */
  function begin(view) {
    const m = view.match, r = m.result, striker = r.finisherActor, fallen = other(striker), sc = view.coaches[striker], fc = view.coaches[fallen];
    const yaw = fc.ringYaw ?? fc.root.rotation.y, start = fc.root.position.clone(); start.y = 0;
    const guard = {}; for (const side of ['L', 'R']) guard[side] = fc.point(fc.joints['hand' + side]).toArray();
    // land inside the ring: turn the fall a little toward the centre (and slide it) when the head would reach the ropes
    const reach = (yw, shift) => { const b = V(-Math.sin(yw), 0, -Math.cos(yw)); return start.clone().add(shift).addScaledVector(b, .40 + 1.95); };
    let twist = 0, best = Infinity;
    for (const t of [0, .2, -.2, .4, -.4, .6, -.6, .8, -.8]) { const h = reach(yaw + t, V()), over = Math.max(0, Math.abs(h.x) - 1.42) + Math.max(0, Math.abs(h.z) - 1.42); const score = over * 10 + Math.abs(t); if (score < best) { best = score; twist = t; } }
    const head = reach(yaw + twist, V()), shift = V(Math.sign(head.x) * -Math.max(0, Math.abs(head.x) - 1.42), 0, Math.sign(head.z) * -Math.max(0, Math.abs(head.z) - 1.42));
    const sp = view.sundayPunch;
    // which way the head rolls: toward the camera side of the body
    const cam = view.cast.worldToLocal(view.engine.camera.position.clone()), side = V(Math.cos(yaw), 0, -Math.sin(yaw));
    const face = side.dot(cam.clone().sub(start)) > 0 ? 1 : -1;
    sp.fall = { yaw, start, twist, shift, guard, flop: face > 0 ? 'R' : 'L', bentLeg: face > 0 ? 'L' : 'R', face };
    // the striker: where he stood, his punch options at the impact, and the neutral corner farthest from the fallen fighter
    const action = r.finisherAction, sStart = sc.root.position.clone(); sStart.y = 0;
    const land = start.clone().add(shift).addScaledVector(V(-Math.sin(yaw + twist), 0, -Math.cos(yaw + twist)), 1.2);
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => V(x * 1.05, 0, z * 1.05));
    const corner = corners.sort((a, b) => b.distanceTo(land) - a.distanceTo(land) + .5 * (a.distanceTo(sStart) - b.distanceTo(sStart)))[0];
    sp.striker = { actor: striker, start: sStart, yaw: sc.ringYaw ?? 0, options: { ...(view.poseOptions?.[striker] || {}) }, phase: clamp((action ? (r.finisherTime - action.start) / action.duration : .4)), corner, dist: 0 };
    delete sp.striker.options.hitReaction; delete sp.striker.options.plantedContacts; delete sp.striker.options.contactReturn; delete sp.striker.options.ringStep; delete sp.striker.options.blockCover;
    if (sp.striker.options.uppercutBagTarget) { const t = sp.striker.options.uppercutBagTarget.slice(); t[1] += .34; t[2] += .06; sp.striker.options.uppercutBagTarget = t; }
    sp.ref = { start: view.referee.root.position.clone(), yaw: view.referee.root.rotation.y };
    calibrate(view, fallen);
    sp.begun = true; sp.fallen = fallen;
  }
  function strikerPose(view, u, metrics) {
    const sp = view.sundayPunch, s = sp.striker, coach = view.coaches[s.actor], m = view.match, root = coach.root;
    const toCorner = s.corner.clone().sub(s.start); toCorner.y = 0; const len = toCorner.length(), heading = Math.atan2(toCorner.x, toCorner.z);
    if (u < T.turn[0]) {
      // follow-through: the glove keeps rising past where the chin was, then comes home to the guard
      const p = u < .45 ? lerp(s.phase, .58, smooth(u / .45)) : lerp(.58, 1, smooth((u - .45) / .5));
      root.position.copy(s.start); root.quaternion.setFromEuler(new THREE.Euler(0, s.yaw, 0, 'YXZ'));
      metrics[s.actor] = coach.update(p * 1.22, 'rear_uppercut', 'one_two', { ...s.options, simulationTime: m.time });
      return;
    }
    // he looks down at him, turns away and walks to a neutral corner
    const w = clamp((u - T.walk[0]) / (T.walk[1] - T.walk[0])), along = len * (w < 1 ? smooth(w) * .98 + .02 * w : 1), turn = smooth((u - T.turn[0]) / (T.turn[1] - T.turn[0]));
    const dyaw = Math.atan2(Math.sin(heading - s.yaw), Math.cos(heading - s.yaw)), yaw = s.yaw + dyaw * turn;
    root.position.copy(s.start).addScaledVector(toCorner.normalize(), along);
    root.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    const dt = s.lastT != null ? Math.max(0, m.time - s.lastT) : 0; s.lastT = m.time;
    s.dist = along; const walking = u > T.walk[0] && u < T.walk[1] + .2 ? 1 : 0;
    const fallenHead = view.coaches[sp.fallen].joints.head.getWorldPosition(V()), look = root.worldToLocal(fallenHead.clone());
    const Pose = window.DreamPose;
    if (Pose) metrics[s.actor] = Pose.civil(coach, { t: m.time, dt, dist: along, walk: walking, arms: { L: 'fist', R: 'fist' }, reach: { L: [-.16, 1.40, .30], R: [.16, 1.40, .30] }, // gloves up at chest height
      look: u < T.walk[0] ? { yaw: clamp(Math.atan2(look.x, look.z), -1, 1), pitch: -.35 } : null, lean: .04 });
    else metrics[s.actor] = coach.update(m.time, 'step', 'one_two', { simulationTime: m.time });
    // dream-pose.js (v1.69) no longer returns the gloves from its overlay: rebuild them so the bout's contact pass has both fists
    const mt = metrics[s.actor]; if (mt && !(mt.gloves?.length === 2)) mt.gloves = ['L', 'R'].map(sd => coach.orientGlove(sd, .6, V(0, 0, -1)));
  }
  // The rhino referee has one trouser mesh and separate shoes: his walk steps the shoes under the trousers with a body bob and sway.
  function refStep(ref, phase, amount) {
    const feet = ref.sundayFeet || (ref.sundayFeet = ref.root.children.filter(o => o.isGroup && Math.abs(o.position.y - .102) < .01 && Math.abs(Math.abs(o.position.x) - .148) < .02).map(o => ({ o, p: o.position.clone() })));
    for (const f of feet) { const s = f.p.x < 0 ? 0 : Math.PI, a = phase * Math.PI * 2 + s; f.o.position.set(f.p.x, f.p.y + .055 * Math.max(0, Math.sin(a)) * amount, f.p.z + .16 * Math.cos(a) * amount); }
    ref.root.position.y = .022 * Math.abs(Math.sin(phase * Math.PI * 2)) * amount; ref.root.rotation.z = .035 * Math.sin(phase * Math.PI * 2) * amount;
  }
  function refereePose(view, u) {
    const sp = view.sundayPunch, ref = view.referee, root = ref.root, m = view.match, fallen = view.coaches[sp.fallen];
    if (!root.visible && !ref.isBruno) return; // ringless venues (GOTR-0065): no referee, nobody counts or waves
    const chest = view.cast.worldToLocal(fallen.joints.chest.getWorldPosition(V())); chest.y = 0;
    // beyond the body as the camera sees it (decided once), so he faces the lens over the fallen fighter
    if (!sp.ref.side) { const side = V(Math.cos(sp.fall.yaw), 0, -Math.sin(sp.fall.yaw)), camAt = view.cast.worldToLocal(view.engine.camera.position.clone()).sub(chest).setY(0); if (side.dot(camAt) > 0) side.negate(); sp.ref.side = side; }
    const spot = chest.clone().addScaledVector(sp.ref.side, .9);
    // he walks over as the body falls (T.refWalk), then faces the fallen fighter
    const [w0, w1] = T.refWalk, k = clamp((u - w0) / (w1 - w0)), path = spot.clone().sub(sp.ref.start).setY(0), dist = path.length() * smooth(k);
    root.position.copy(sp.ref.start).addScaledVector(path.clone().normalize(), dist); root.position.y = 0;
    const heading = Math.atan2(path.x, path.z), face = Math.atan2(chest.x - root.position.x, chest.z - root.position.z), walking = k > 0 && k < 1 ? 1 : 0;
    const turnIn = smooth((u - w0) / .25) * (1 - smooth((u - w1 + .15) / .3)), yaw = Math.atan2(Math.sin(heading - face), Math.cos(heading - face)) * turnIn + face;
    root.rotation.set(0, path.lengthSq() > 1e-4 ? yaw : face, 0);
    const wave = smooth((u - T.wave[0]) / .18) * (1 - smooth((u - T.wave[1]) / .3)), t = Math.max(0, u - T.wave[0]);
    const lookAt = fallen.joints.head.getWorldPosition(V());
    if (ref.isBruno) { view.cast.updateMatrixWorld(true); ref.update(m.time, null, 1, { lookAt, waveOff: { t, w: wave }, walk: { dist, w: walking } }); return; }
    refStep(ref, dist / .62, walking ? Math.min(1, Math.min(k, 1 - k) * 8) : 0);
    view.cast.updateMatrixWorld(true);
    if (wave < .01) { ref.update(m.time, null, 1, { lookAt, alert: .6 }); return; }
    // the wave-off: both arms high, crossing over the head, three big sweeps — readable on a phone
    const c = Math.sin(t * Math.PI * 2 * 1.4), grip = {};
    for (const s of [-1, 1]) grip[s] = root.localToWorld(V(lerp(s * .36, s * (.05 - .44 * c), wave), lerp(1.04, 2.08 + .05 * Math.abs(c), wave), lerp(.12, .22, wave)));
    ref.update(m.time, grip, 1, { lookAt, alert: .9 });
  }
  // After the knockout has played out: the fallen fighter stays down, the referee raises the winner's arm at his corner.
  function ceremonyPose(view, metrics) {
    const sp = view.sundayPunch, m = view.match, s = sp.striker, coach = view.coaches[s.actor], root = coach.root, reveal = m.phase === 'ceremony', raise = reveal ? clamp((m.phaseTime - .4) / 1.5) : 0;
    root.position.copy(s.corner); const centre = V(0, 0, 0).sub(s.corner), yaw = Math.atan2(centre.x, centre.z); root.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    metrics[s.actor] = coach.update(m.time, 'guard', 'one_two', { stance: 1, simulationTime: m.time, presentation: { mode: 'winner', side: s.actor === 'lion' ? 'R' : 'L', raise } });
    view.cast.updateMatrixWorld(true);
    const ref = view.referee; if (!ref.root.visible && !ref.isBruno) return;
    const handAt = view.cast.worldToLocal(coach.joints[s.actor === 'lion' ? 'handR' : 'handL'].getWorldPosition(V())).sub(s.corner).setY(0);
    // beside the winner across the picture (camera right/left), on the side of the arm he raises
    const camRight = V(1, 0, 0).applyQuaternion(view.engine.camera.quaternion), across = view.cast.worldToLocal(view.cast.getWorldPosition(V()).add(camRight)).sub(view.cast.worldToLocal(view.cast.getWorldPosition(V()))).setY(0).normalize();
    if (across.dot(handAt) < 0) across.negate(); const beside = s.corner.clone().addScaledVector(across, .82);
    if (!sp.ref.cer) sp.ref.cer = ref.root.position.clone();
    const before = sp.ref.cer.clone(); sp.ref.cer.lerp(beside, .06); const step = before.distanceTo(sp.ref.cer); sp.ref.cdist = (sp.ref.cdist || 0) + step;
    ref.root.position.copy(sp.ref.cer); ref.root.position.y = 0; ref.root.rotation.set(0, Math.atan2(s.corner.x - ref.root.position.x, s.corner.z - ref.root.position.z), 0);
    if (!ref.isBruno) refStep(ref, sp.ref.cdist / .62, step > .004 ? 1 : 0); // he walks to the winner too
    view.cast.updateMatrixWorld(true);
    const hand = coach.joints[s.actor === 'lion' ? 'handR' : 'handL'].getWorldPosition(V());
    ref.update(m.time, raise > 0 ? hand : null, s.actor === 'lion' ? -1 : 1, { lookAt: coach.joints.head.getWorldPosition(V()) });
  }
  // FightArena.pose while the bout ends on a finisher.
  function pose(view) {
    const m = view.match, r = m.result, sp = view.sundayPunch || (view.sundayPunch = {});
    if (!sp.begun) begin(view);
    const u = sp.skip ? T.walk[1] + 1 : Math.max(0, m.time - r.finisherTime), metrics = {}, a = view.arena;
    a.group.updateMatrixWorld(true);
    metrics[sp.fallen] = poseFallen(view, sp.fallen, Math.min(u, T.settle + 3));
    if (m.finisherHold() && !sp.skip) { strikerPose(view, u, metrics); refereePose(view, u); }
    else { if (!sp.striker.done) { sp.striker.done = true; sp.striker.corner = view.coaches[sp.striker.actor].root.position.clone().setY(0); } ceremonyPose(view, metrics); }
    view.audience?.update(m.time, true);
    a.group.updateMatrixWorld(true);
    view.metrics = metrics; view.specs = { lion: { move: 'guard', phase: .35, attack: false, id: 0 }, rabbit: { move: 'guard', phase: .35, attack: false, id: 0 } };
    return metrics;
  }

  /* ---------- camera, effects, sound, skip ---------- */
  function camera(view, dt) {
    const e = view.engine, cam = e.camera, sp = view.sundayPunch || (view.sundayPunch = {}), m = view.match, r = m.result;
    if (!cam) return;
    if (!sp.saved) sp.saved = { p: cam.position.clone(), q: cam.quaternion.clone(), zoom: cam.zoom, fov: cam.fov };
    cam.fov = FOV; // a wider lens, so a low camera close to the fighters still holds the whole action on a phone
    if (cam.view?.enabled) { cam.clearViewOffset(); const cv = e.renderer?.domElement; if (cv?.clientHeight) cam.aspect = cv.clientWidth / cv.clientHeight; }
    const striker = r?.finisherActor || ['lion', 'rabbit'].find(a => m.fighters[a].action?.finisher) || sp.actor, fallen = other(striker), sc = view.coaches[striker], fc = view.coaches[fallen];
    sp.actor = striker;
    // the side of the striker's rear (punching) hand, perpendicular to the line between the fighters, fixed at the start
    if (!sp.axis) {
      const a = sc.root.getWorldPosition(V()), b = fc.root.getWorldPosition(V()), line = b.clone().sub(a).setY(0).normalize();
      const rearHand = sc.joints.handR.getWorldPosition(V()), leadHand = sc.joints.handL.getWorldPosition(V()), across = rearHand.sub(leadHand).setY(0);
      let side = V(-line.z, 0, line.x); if (side.dot(across) < 0) side.negate();
      // the referee must not stand between the lens and the punch: take the other side when he would
      const mid = a.clone().lerp(b, .5), ref = view.referee.root.getWorldPosition(V()).sub(mid).setY(0), blocked = sd => { const f = sd.clone().multiplyScalar(Math.cos(-.14)).addScaledVector(line, Math.sin(.14)).normalize(); return ref.length() > .2 && ref.clone().normalize().dot(f) > Math.cos(.75); };
      if (blocked(side) && !blocked(side.clone().negate())) side.negate();
      sp.axis = { line, side };
    }
    const u = r?.finisher ? (sp.skip ? 9 : m.time - r.finisherTime) : -1;
    // what must stay in the picture
    const pts = [];
    const add = (coach, names) => { for (const n of names) { const p = coach.joints[n].getWorldPosition(V()); if (n === 'head') p.y += .26; if (n.startsWith('foot')) p.y = Math.max(0, p.y - .1); pts.push(p); } };
    add(fc, ['head', 'hips', 'footL', 'footR', 'handL', 'handR']);
    if (u < 1.3 || u > 2.9) add(sc, ['head', 'footL', 'footR', 'handR']); else if (u < 2.1) add(sc, ['hips']);
    if (u > 2.9 && view.referee?.root?.visible !== false) { const rr = view.referee.root; pts.push(rr.localToWorld(V(0, 2.25, 0)), rr.localToWorld(V(0, 0, 0))); } // the result: winner and referee/Bruno whole // the winner at his corner comes back into the picture for the result
    const fov = THREE.MathUtils.degToRad(cam.fov), tv = Math.tan(fov / 2), th = tv * Math.max(.2, cam.aspect);
    const { side, line } = sp.axis, up = V(0, 1, 0);
    // a low profile view from the striker's punching side, a touch in front of him, so the rising glove is seen meeting the
    // underside of the jaw; then it swings round as the body falls, so the fall reads across the picture
    const swing = u < 0 ? -.14 : lerp(-.14, .10, smooth(u / .9)), flat = side.clone().multiplyScalar(Math.cos(swing)).addScaledVector(line, -Math.sin(swing));
    const height = u < 0 ? .62 : lerp(.62, 1.40, smooth((u - .7) / 1.1)); // then it rises to look down on the body on the canvas
    const dir = flat.clone().normalize(), right = up.clone().cross(dir).normalize(), camUp = up.clone();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; const c0 = V();
    for (const p of pts) c0.add(p); c0.divideScalar(pts.length);
    for (const p of pts) { const d = p.clone().sub(c0), x = d.dot(right), y = d.dot(camUp); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const centre = c0.clone().addScaledVector(right, (minX + maxX) / 2).addScaledVector(camUp, (minY + maxY) / 2 + (u < 0 ? -.05 : .02));
    const margin = u < 0 ? 1.18 : 1.24, dist = Math.max(((maxX - minX) / 2 + .22) * margin / th, ((maxY - minY) / 2 + .18) * margin / tv) + .3;
    // the gym room is small (hanging bags just off the mat): past the cap the lens widens instead of backing into the props
    const cap = view.gymFight ? 5.2 : 7.5, goal = { c: centre, d: clamp(dist, 2.4, cap), fov: dist > cap ? THREE.MathUtils.radToDeg(2 * Math.atan(tv * (dist - .3) / (cap - .3))) : FOV };
    if (!sp.cam || sp.cut) { sp.cam = { c: goal.c.clone(), d: goal.d, fov: goal.fov }; sp.cut = false; }
    else { const k = 1 - Math.exp(-Math.max(0, dt) / .35); sp.cam.c.lerp(goal.c, k); sp.cam.d = lerp(sp.cam.d, goal.d, k); sp.cam.fov = lerp(sp.cam.fov ?? FOV, goal.fov, k); }
    cam.fov = Math.min(75, sp.cam.fov);
    const position = sp.cam.c.clone().addScaledVector(dir, sp.cam.d);
    position.y = height; // low lens, looking up at the punch
    cam.position.copy(position); cam.zoom = 1; cam.up.set(0, 1, 0); cam.lookAt(sp.cam.c); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const grid = []; for (let i = 0; i <= 4; i++) for (let k = 0; k <= 4; k++) grid.push(c0.clone().addScaledVector(right, lerp(minX, maxX, i / 4)).addScaledVector(camUp, lerp(minY, maxY, k / 4)));
    clearView(view, position, grid.concat([fc.joints.head, fc.joints.hips, sc.joints.head, sc.joints.handR].map(b => b.getWorldPosition(V()))));
  }
  // Ropes, posts and corner pads between the lens and the fighters are hidden while the cinematic runs (like a film crew's
  // camera inside the ropes); everything is shown again when it ends.
  function clearView(view, eye, targets) {
    const ring = view.ring; const sp = view.sundayPunch, ray = new THREE.Ray(), hit = V(), box = new THREE.Box3();
    sp.hidden = sp.hidden || new Set(); const hide = new Set(), corners = [];
    const boxBlocks = () => { box.expandByScalar(.04); if (box.containsPoint(eye)) return true; for (const t of targets) { ray.origin.copy(eye); ray.direction.copy(t).sub(eye); const far = ray.direction.length(); ray.direction.divideScalar(far); if (ray.intersectBox(box, hit) && hit.distanceTo(eye) < far - .25) return true; } return false; };
    const blocks = part => { box.setFromObject(part).expandByScalar(.04); for (const t of targets) { ray.origin.copy(eye); ray.direction.copy(t).sub(eye); const far = ray.direction.length(); ray.direction.divideScalar(far); if (ray.intersectBox(box, hit) && hit.distanceTo(eye) < far - .25) return true; } return false; };
    const cornerOf = part => { const p = part.position; return Math.abs(Math.abs(p.x) - 1.65) < .2 && Math.abs(Math.abs(p.z) - 1.65) < .2 ? Math.sign(p.x) + ',' + Math.sign(p.z) : null; };
    if (ring?.visible) for (const part of ring.children) { if (!part.isMesh || part.position.y < -.05 && !cornerOf(part)) continue; if (blocks(part)) { hide.add(part); const c = cornerOf(part); if (c) corners.push(c); } }
    if (ring?.visible) for (const part of ring.children) if (corners.includes(cornerOf(part))) hide.add(part); // a corner goes as a whole: post, pads and turnbuckles
    if (ring?.visible) for (const part of ring.children) { if (hide.has(part)) { part.visible = false; sp.hidden.add(part); } else if (sp.hidden.has(part)) { part.visible = true; sp.hidden.delete(part); } }
    // props of the room (heavy bags, posts, equipment) between the lens and the fighters go too
    const props = [], skip = new Set([view.cast, view.ring, view.audience?.root]); (function walk(o) { for (const c of o.children) { if (skip.has(c)) continue; if (c.isMesh) props.push(c); walk(c); } })(view.engine.scene || view.arena.group); // e.g. a heavy bag of the gym room
    for (const obj of props) {
      if (!obj.visible && !sp.hidden.has(obj)) continue;
      let hit = false;
      if (obj.isInstancedMesh) { // batched fixtures (a row of hanging bags): each instance is its own box; one in the way hides the batch
        const g = obj.geometry; if (!g.boundingBox) g.computeBoundingBox(); const mat = new THREE.Matrix4(), w = new THREE.Matrix4();
        for (let i = 0; i < obj.count && !hit; i++) { obj.getMatrixAt(i, mat); box.copy(g.boundingBox).applyMatrix4(w.multiplyMatrices(obj.matrixWorld, mat)); if (box.isEmpty() || box.getSize(V()).length() > 3.2 || box.max.y < .05) continue; hit = boxBlocks(); }
      } else { box.setFromObject(obj); if (box.isEmpty() || box.getSize(V()).length() > 3.2 || box.max.y < .05) continue; hit = boxBlocks(); } // walls, floor and mats stay
      if (hit) { obj.visible = false; sp.hidden.add(obj); } else if (sp.hidden.has(obj)) { obj.visible = true; sp.hidden.delete(obj); }
    }
    // spectators on the camera's side of the ring stay hidden, as in the bout
    const aud = view.audience?.root; if (aud) { const centre = ring.getWorldPosition(V()), toCam = eye.clone().sub(centre).setY(0).normalize(); for (const fan of aud.children) { if (fan.userData.audienceSide === undefined) continue; const o = fan.getWorldPosition(V()).sub(centre).setY(0); fan.visible = o.dot(toCam) < -.15; } }
  }
  function restoreCamera(view) {
    const sp = view.sundayPunch, cam = view.engine.camera; if (!sp?.saved || !cam) return;
    cam.position.copy(sp.saved.p); cam.quaternion.copy(sp.saved.q); cam.zoom = sp.saved.zoom; cam.fov = sp.saved.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); sp.saved = null;
    for (const part of sp.hidden || []) part.visible = true; sp.hidden?.clear();
    const rf = view.referee?.sundayFeet; if (rf) for (const f of rf) f.o.position.copy(f.p); if (view.referee?.root && !view.referee.isBruno) view.referee.root.rotation.z = 0;
  }
  function audio() { return window.app?.audio; }
  function effects(view, events) {
    const e = view.engine, sp = view.sundayPunch, fx = e.impactFx, au = audio(), gym = !!view.gymFight;
    for (const ev of events) {
      if (ev.type === 'finisher-start') { try { au?.playSample?.('effort-' + (1 + (ev.id % 2)), .16, .86, 0, 3000); } catch { } }
      if (ev.type === 'finisher-ko') {
        sp.koAt = ev.time;
        const fallen = view.coaches[ev.receiver], chin = fallen.joints.head.localToWorld(V(0, .02, .2)), striker = view.coaches[ev.actor];
        const n = chin.clone().sub(striker.joints.chest.getWorldPosition(V())).setY(0).normalize().add(V(0, 1.2, 0)).normalize();
        try { fx?.spray(chin.toArray(), n.toArray(), 1.6, 'head'); fx?.spray(chin.toArray(), n.toArray(), 1.2, 'head'); if (fx) fx.kick = { t: 0, amp: .05, phase: 0 }; } catch { }
        flash(e);
        try { au?.playSample?.('body-2', .8, .55, 0, 520); au?.playSample?.('pad', .62, .80, .002, 3600); au?.playSample?.('body-1', .5, .66, .012, 900); if (!gym) au?.playSample?.('applause', .62, .94, .25); } catch { }
      }
    }
    // the landing thud and canvas dust
    if (sp?.begun && !sp.landed && view.match.result?.finisher && view.match.time - view.match.result.finisherTime >= T.land) {
      sp.landed = true; const fallen = view.coaches[sp.fallen], back = fallen.joints.chest.getWorldPosition(V()); back.y = .02;
      try { fx?.spray(back.toArray(), [0, 1, 0], 1.3, 'bag'); fx?.spray(fallen.joints.hips.getWorldPosition(V()).setY(.02).toArray(), [0, 1, 0], .9, 'bag'); } catch { }
      try { au?.playSample?.('body-1', .62, .62, 0, 700); au?.playSample?.('body-2', .4, .5, .03, 500); } catch { }
    }
  }
  function flash(e) {
    const stage = typeof document !== 'undefined' && document.getElementById?.('stageContainer'); if (!stage) return;
    let n = stage.querySelector('.sp-flash'); if (!n) { n = document.createElement('div'); n.className = 'sp-flash'; n.setAttribute('aria-hidden', 'true'); stage.append(n); }
    n.classList.remove('on'); void n.offsetWidth; n.classList.add('on');
  }

  /* ---------- FightArena hooks ---------- */
  function install(FightArena) {
    if (!FightArena || FightArena.prototype.sundayPunchInstalled) return;
    const P = FightArena.prototype, basePose = P.pose, baseUpdate = P.update, baseDispose = P.dispose;
    P.sundayPunchInstalled = true;
    P.pose = function () { return this.match?.result?.finisher ? pose(this) : basePose.call(this); };
    P.update = function (time) {
      const sp = this.sundayPunch || (this.sundayPunch = {});
      if (sp.wall != null && time > sp.wall) sp.shift = (sp.shift || 0) + (time - sp.wall) * (1 - timeScale(this));
      const dt = sp.wall != null ? Math.max(0, time - sp.wall) : 0; sp.wall = time;
      const cursor = this.match.events.length ? this.match.events[this.match.events.length - 1].id : 0;
      const out = baseUpdate.call(this, time - (sp.shift || 0));
      const fresh = this.match.events.filter(x => x.id > (sp.cursor ?? cursor) && x.type.startsWith('finisher')); sp.cursor = this.match.events.length ? this.match.events[this.match.events.length - 1].id : 0;
      if (fresh.length) effects(this, fresh); else if (sp.begun) effects(this, []);
      const active = presenting(this);
      if (active) camera(this, dt); else if (sp.saved) restoreCamera(this);
      return out;
    };
    P.dispose = function (...args) { restoreCamera(this); return baseDispose.apply(this, args); };
  }
  // The cinematic owns the camera from the start of the finisher until the bout view goes away (or the finisher missed).
  function presenting(view) {
    const m = view.match; if (!m) return false;
    if (m.result?.finisher) return true;
    return ['lion', 'rabbit'].some(a => m.fighters[a].action?.finisher && !m.fighters[a].action.recorded);
  }
  const api = { install, timeScale, fallState, koOverlay, poseFallen, lowest, skinLowest, presenting, T, SLOW, SEEN };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') { window.SundayPunch = api; if (window.FightArena) install(window.FightArena); }

  /* ---------- skip (after the first time) and the caption ---------- */
  if (typeof document === 'undefined' || !document.getElementById) return;
  function boot() {
    const app = window.app, e = app?.engine, stage = document.getElementById('stageContainer'); if (!e || !stage) { if ((boot.n = (boot.n || 0) + 1) < 100) setTimeout(boot, 200); return; }
    if (window.FightArena) install(window.FightArena);
    const cap = document.createElement('div'); cap.className = 'sp-caption'; cap.hidden = true; cap.setAttribute('role', 'status');
    const title = document.createElement('strong'); title.textContent = 'Sunday Punch'; title.dir = 'ltr'; const hint = document.createElement('span'); cap.append(title, hint); stage.append(cap);
    const SKIP = { en: 'Tap to skip', he: 'הקישו לדילוג', ru: 'Нажмите, чтобы пропустить' };
    let seen = false; try { seen = localStorage.getItem(SEEN) === '1'; } catch { }
    let marked = false;
    const view = () => e.targetMode === 'fight' ? e.arena?.fightView : null;
    setInterval(() => {
      const v = view(), m = v?.match, r = m?.result, on = !!(v && SundayPunch.presenting(v) && (r?.finisher ? m.finisherHold() : true));
      document.body.classList.toggle('sunday-punch-on', on);
      const show = on && !!r?.finisher && m.time - r.finisherTime > .25;
      if (cap.hidden === show) cap.hidden = !show;
      hint.textContent = seen && on ? (SKIP[app.lang] || SKIP.en) : '';
      if (r?.finisher && !marked && !m.finisherHold()) { marked = true; seen = true; try { localStorage.setItem(SEEN, '1'); } catch { } }
      if (!r?.finisher) marked = false;
    }, 120);
    stage.addEventListener('pointerdown', ev => {
      const v = view(), m = v?.match; if (!v || !seen || !SundayPunch.presenting(v) || ev.target.closest?.('button,dialog,.fighter-pad')) return;
      const sp = v.sundayPunch || (v.sundayPunch = {});
      if (m.result?.finisher) { if (!m.finisherHold()) return; sp.skip = true; m.skipFinisher(); sp.cut = true; } else sp.skip = true;
      e.lastRenderStamp = null;
    }, true);
    window.sundayPunchUI = { get active() { const v = view(); return !!(v && SundayPunch.presenting(v)); }, resetSeen() { seen = false; try { localStorage.removeItem(SEEN); } catch { } } };
  }
  if (document.readyState === 'loading' || !window.app) document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
