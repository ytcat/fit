/* GOTR-0088 Finisher, shown to the player as "Super Punch" (renamed 2026-11-22; ids, saves and this file name keep
 * `sunday_punch`): the knockout film of the Finisher (rules in boxing-fight.js, the punch itself in fight-arena.js /
 * boxing-coach-v2.js, what differs per fight in super-punch-film.js). Everything runs on the game rigs in real time, inside the
 * mirrored ring cast (no video files):
 *  - a camera choreography picked per fight (low orbit, over-the-shoulder push-in, side tracking, overhead drop, low front) and
 *    letterbox bars; a touch of slow motion on the dip, then very slow motion from the moment the glove meets the jaw;
 *  - the face takes it: the head snaps back and turns, the jaw and cheek squash on the impact (a skin dent that rebounds and
 *    wobbles), the mouth opens, sweat sprays in slow motion, a flash and speed lines;
 *  - the knocked-out fall: the feet leave the canvas, the body goes limp and falls flat on its back, one arm flops, a short settle,
 *    eyes closed, jaw slack. The rest height is calibrated on the rig's own final pose and a support pass keeps every limb above
 *    the canvas, so the body neither floats nor sinks;
 *  - the referee (Coach Bruno in the gym) waves it off without a count; in ringless venues nobody does;
 *  - a blackout with the K.O. beat, then the winner's celebration (super-punch-film.js) and the scene's ending: in the ring and the
 *    gym the referee / Bruno raises the winner's hand; on the street the crowd cheers and the beaten man drags himself away, at the
 *    Docks the crowd closes in, in the basement it roars;
 *  - a deep impact, the landing thud, canvas dust and the crowd.
 * Rig roots keep scale 1 inside the mirrored cast (the view's dispose gives them back -1, as for every bout).
 * The match result waits while it plays (BoxingFight.finisherHold); a tap skips it once the player has seen it once. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const Film = (typeof window !== 'undefined' && window.SuperPunchFilm) || (typeof require === 'function' ? require('./super-punch-film.js') : null);
  const F = Film.FILM, SEEN = 'gotr-sunday-punch-seen', SLOW = Film.SLOW_HIT, FOV = 50;
  // Fall timeline in fight seconds after the impact (referee, blackout and celebration times: super-punch-film.js FILM).
  const T = { snap: .06, air: .24, land: .80, flop: 1.02, settle: 1.6, refWalk: F.refWalk, wave: F.wave, follow: .9, celebrate: F.celebrate };
  const END = F.hold + 1; // where a skip jumps to
  const other = a => a === 'lion' ? 'rabbit' : 'lion';
  // Slow motion: a touch slow on the dip and drive, very slow from the glove contact, back to real time as the body goes.
  function timeScale(view) {
    const m = view.match, sp = view.sundayPunch; if (!m || sp?.skip) return 1;
    const r = m.result;
    if (r?.finisher) return Film.timeScale(m.time - r.finisherTime, true);
    for (const a of ['lion', 'rabbit']) { const act = m.fighters[a].action; if (act?.finisher && !act.recorded) return m.time - act.start < .05 ? lerp(1, Film.SLOW_DIP, (m.time - act.start) / .05) : Film.SLOW_DIP; }
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
    // the impact jolt: the head is knocked round, away from the glove, for a moment (the face takes it)
    const jolt = snap * (1 - smooth((u - .08) / .5));
    // street endings: he comes to and drags himself away on his elbows (super-punch-film.js crawl)
    const crawl = ctx?.crawls ? Film.crawl(u) : { up: 0, drag: 0, push: 0, cycle: 0 };
    return { u, snap, air, s, landed, after, bounce, limp, rest, tilt, jolt, crawl };
  }
  // Overlay for the controller (update(..., {poseOverlay})): pelvis, spine, head, legs and both limp arms for this frame.
  function koOverlay(c, st, ctx) {
    const j = c.joints, { u, snap, s, landed, bounce, limp, rest, jolt } = st, flop = ctx.flop, sg = flop === 'L' ? -1 : 1;
    const up = st.crawl?.up || 0, push = st.crawl?.push || 0; // coming to (street endings): up on the elbows, pushing with the heels
    const breathe = landed ? Math.sin(u * 2.1) * .012 * rest * (1 + 2 * up) : 0;
    // pelvis: in the air the hips are carried up and back by the blow; falling, the knees give a little; flat on the back at rest
    const knee = .10 * limp * (1 - rest) + .05 * rest;
    j.hips.position.set(0, .935 - knee * .35, -.02 * limp);
    j.hips.rotation.set(-.06 * snap * (1 - s) + .05 * rest, 0, 0);
    // trunk: thrown back by the uppercut (extension), then lying flat; a slight rebound on landing
    const arch = -.16 * snap * (1 - rest) - .08 * s * (1 - rest);
    const adj = ctx.adj || { spine: 0, neck: 0, hand: { L: 0, R: 0 }, foot: { L: 0, R: 0 } };
    // coming to: the trunk curls up off the canvas (forward flexion lifts the chest of a man on his back), swaying with each push
    j.spine.rotation.set(arch * .6 - .04 * rest + adj.spine * rest + breathe + .36 * up + .05 * push, .04 * limp * sg, .03 * limp * sg + .05 * up * Math.sin(u * 1.3));
    j.chest.rotation.set(arch * .5 - .03 * rest - breathe + .20 * up, .03 * limp * sg, .02 * limp * sg);
    for (const side of ['L', 'R']) { const k = side === 'L' ? -1 : 1, sc = j['scapula' + side]; if (sc) { sc.position.set(k * .17, .17 + .02 * limp * (1 - rest), -.06); sc.rotation.set(0, 0, 0); } }
    // head: snaps back with the chin lifted, lags the fall, bumps the canvas, then rolls to one side (toward the camera)
    const roll = smooth((u - (T.land + .10)) / .55);
    // (jolt: knocked round away from the glove on the impact; up: lifted, hanging and rolling groggily as he comes to)
    const groggy = up * Math.sin(u * 1.7), keep = 1 - up;
    j.neck.position.copy(c.neckRest); j.neck.rotation.set((-.30 * snap * (1 - .6 * rest) + .18 * bounce + adj.neck * rest) * keep + .30 * up, .10 * roll * ctx.face * keep - .18 * jolt * ctx.hit, .10 * jolt * ctx.hit);
    j.head.rotation.set((-.55 * snap * (1 - .7 * rest) - .10 * s * (1 - rest) + .22 * bounce - .05 * rest) * keep + .18 * up, (.55 * roll * ctx.face) * keep + .30 * groggy - .34 * jolt * ctx.hit, (.14 * roll * ctx.face) * keep + .12 * groggy + .20 * jolt * ctx.hit);
    c.root.updateMatrixWorld(true);
    // legs: feet stay at the heels' pivot (they lift with the body, then slide out), knees buckle a little, toes fall outward at rest
    const footTargets = [];
    for (const side of ['L', 'R']) {
      const k = side === 'L' ? -1 : 1, foot = j['foot' + side];
      const stand = V(k * .118, .12, k * -.03 + (side === 'L' ? .10 : -.06));
      const lying = V(k * (.20 + (side === ctx.bentLeg ? -.04 : .02)), side === ctx.bentLeg ? .30 : .10, side === ctx.bentLeg ? .02 : -.11);
      lying.z += adj.foot[side];
      // coming to: both knees up, the heels planted near the hips and dug in on each push
      const tuck = V(k * .19, .50 - .07 * push * (side === 'L' ? 1 : .7), -.07 + adj.foot[side] * .5);
      const ankle = stand.lerp(lying, smooth((u - .15) / .75)).lerp(tuck, up);
      const out = k * .55 * rest * (1 - up), toePitch = lerp(lerp(0, side === ctx.bentLeg ? .25 : -.30, rest) + .20 * limp * (1 - rest), 1.35, up); // sole flat on the canvas
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(toePitch, out, 0, 'YXZ'));
      const err = c.solve(j['thigh' + side], j['knee' + side], foot, ankle, V(k * .10, .05, 1).lerp(V(k * .15, -.2, 1), up).normalize()); c.orient(foot, q);
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
      // coming to: propped on both elbows, the forearms flat on the canvas beside the hips
      if (up > 0) hand.lerp(V(k * .27, 1.02 - .03 * push, -.03 + adj.hand[side] * .5), up);
      // the elbow bends in the plane of the canvas once down (an elbow pointing into the floor would prop the body up);
      // propped up, it points down into the canvas behind him
      const pole = V(k * .2, -.4, -1).lerp(isFlop ? V(k * .35, -1, .25) : V(k * 1, -.35, .25), b).lerp(V(k * .45, .35, -1), up);
      handErrors.push(c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], hand, pole.normalize()));
      gloves.push(c.orientGlove(side, .3 * limp, V(0, lerp(-1, 0, limp), lerp(0, -1, limp)).lerp(V(0, 0, -1), up).normalize()));
    }
    return { gloves, handErrors, footTargets };
  }
  // Poses the knocked-out fighter at u: root transform from the timeline, the body by the overlay, then the canvas support.
  function poseFallen(view, actor, u) {
    const sp = view.sundayPunch, ctx = sp.fall, coach = view.coaches[actor], st = fallState(u, ctx);
    const travel = .16 * smooth(u / T.air) + .24 * smooth((u - T.air) / (T.land - T.air + .2)), twist = ctx.twist * smooth((u - .1) / (T.land - .1));
    const root = coach.root, back = V(-Math.sin(ctx.yaw + twist), 0, -Math.cos(ctx.yaw + twist));
    root.position.copy(ctx.start).addScaledVector(back, travel + Math.min(st.crawl.drag, ctx.maxDrag ?? 0)).add(ctx.shift.clone().multiplyScalar(smooth(u / T.land))); // drag: dragging himself away, head first
    root.quaternion.setFromEuler(new THREE.Euler(st.tilt, ctx.yaw + twist, 0, 'YXZ'));
    const lift = .075 * Math.sin(Math.PI * clamp(u / T.air)), restY = ctx.restY ?? .2;
    root.position.y = st.landed ? restY + .035 * Math.abs(st.bounce) * Math.exp(-st.after / .2) : lift + restY * Math.sin(-st.tilt) ** 2 * smooth(st.s);
    const t = view.match.time;
    const metrics = coach.update(t, 'guard', 'one_two', { simulationTime: t, keepFaceClear: false, poseOverlay: rig => koOverlay(rig, st, ctx) });
    // the face takes it: the jaw and cheek squash under the glove, rebound and wobble (a skin dent in the bind pose)
    const dent = Film.squash(u); coach.surfaceDent = dent > 1e-4 && ctx.dent ? { point: ctx.dent.point, normal: ctx.dent.normal, depth: dent } : null;
    // support: never below the canvas while falling; flat on it (not hovering) once landed
    const low = lowest(coach), floor = Math.min(.004, ctx.supportLow ?? .004);
    if (low < floor) { root.position.y += floor - low; coach.syncSkin(); }
    const su = coach.surfaceUniforms; if (su?.dent) { const d = coach.surfaceDent; su.dent.value.set(d?.point[0] || 0, d?.point[1] || 0, d?.point[2] || 0, d?.depth || 0); if (d) su.dentNormal.value.fromArray(d.normal); }
    face(coach, u, st.crawl.up);
    return metrics;
  }
  // Eyes closed, jaw slack (the face controller ran inside update; these come after it). On the impact the mouth is knocked
  // open; coming to (street endings), the eyes half open.
  function face(coach, u, up = 0) {
    const shut = smooth((u - .05) / .12) * (1 - .55 * up), f = coach.faceActing;
    for (const eye of f?.eyes || coach.facialRest?.filter(x => x.eye) || []) eye.part.scale.y = eye.sy * Math.max(.06, 1 - shut * .94);
    if (f?.inner) { const jaw = Math.max(.55 * smooth((u - .15) / .4) * (1 - .5 * up), .95 * smooth(u / .03) * (1 - smooth((u - .10) / .25))); f.inner.visible = jaw > .08; f.inner.scale.y = .001 + .018 * jaw; f.lip.position.y = -.018 * jaw; }
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
    // this fight's film (super-punch-film.js): camera choreography, celebration and the scene's ending
    const pick = filmFor(view, striker);
    if (!sp.filmSaved) { sp.filmSaved = true; Film.writeLast(pick); }
    const end = pick.ending, along = V(-Math.sin(yaw + twist), 0, -Math.cos(yaw + twist)), across = V(Math.cos(yaw + twist), 0, -Math.sin(yaw + twist));
    // the struck side of the face (the glove's side in the Opponent's head frame) and the jaw dent in the bind pose of the head
    const glove = fc.joints.head.worldToLocal(sc.joints.handR.getWorldPosition(V())), hit = glove.x < 0 ? -1 : 1;
    const hi = fc.bones.indexOf(fc.joints.head), bind = hi >= 0 ? fc.skeleton.boneInverses[hi].clone().invert() : null;
    const chin = (typeof FightArena !== 'undefined' && FightArena.chin) || [0, -.04, .20];
    const dent = bind ? { point: V(chin[0] + hit * .022, chin[1] - .012, chin[2] - .035).applyMatrix4(bind).toArray(), normal: V(hit * .42, -.80, .42).normalize().applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(bind)).toArray() } : null;
    // the street ending: he comes to and drags himself head first toward the people, never into them
    const rest = start.clone().add(shift).addScaledVector(along, .40), limit = view.ringless ? 2.35 : 1.42;
    let maxDrag = 0; if (end.fallen === 'crawl') { for (let d = 0; d <= 1.6; d += .05) { const h = rest.clone().addScaledVector(along, 1.85 + d); if ((view.ringless ? Math.hypot(h.x, h.z) : Math.max(Math.abs(h.x), Math.abs(h.z))) > limit) break; maxDrag = d; } }
    sp.fall = { yaw, start, twist, shift, guard, flop: face > 0 ? 'R' : 'L', bentLeg: face > 0 ? 'L' : 'R', face, hit, dent, crawls: end.fallen === 'crawl', maxDrag };
    // the striker: where he stood, his punch options at the impact; after the blackout he celebrates beside the fallen fighter
    const action = r.finisherAction, sStart = sc.root.position.clone(); sStart.y = 0;
    const mid = rest.clone().addScaledVector(along, .85), bound = view.ringless ? 1.7 : 1.15;
    const spots = [1, -1].map(k => { const p = mid.clone().addScaledVector(across, k * 1.05).addScaledVector(along, -.25); return { p, k, out: Math.max(0, (view.ringless ? Math.hypot(p.x, p.z) : Math.max(Math.abs(p.x), Math.abs(p.z))) - bound) }; }).sort((a, b) => a.out - b.out || a.p.length() - b.p.length());
    const spot = spots[0]; let W = spot.p.clone(); if (spot.out > 0) W.multiplyScalar((W.length() - spot.out) / W.length()); W.y = 0;
    // he faces the lens, which looks at him over the fallen body (turned a little per fight so the body lies across the picture)
    const toBody = mid.clone().sub(W).setY(0).normalize(), turn = .38 * pick.mirror; let camDir = toBody.clone().applyAxisAngle(V(0, 1, 0), turn);
    // street endings: he stands at the beaten man's feet, seen from the side, so the man is seen dragging himself away from him
    const feet = rest.clone().addScaledVector(along, -.95); feet.y = 0;
    if (end.fallen === 'crawl' && Math.hypot(feet.x, feet.z) < bound) { W = feet; camDir = across.clone().multiplyScalar(pick.mirror).addScaledVector(along, .35).normalize(); }
    sp.striker = { actor: striker, start: sStart, yaw: sc.ringYaw ?? 0, options: { ...(view.poseOptions?.[striker] || {}) }, phase: clamp((action ? (r.finisherTime - action.start) / action.duration : .4)), corner: W, dist: 0,
      spot: W, camDir, celebYaw: Math.atan2(camDir.x, camDir.z), raise: striker === 'lion' ? 'R' : 'L' };
    delete sp.striker.options.hitReaction; delete sp.striker.options.plantedContacts; delete sp.striker.options.contactReturn; delete sp.striker.options.ringStep; delete sp.striker.options.blockCover;
    if (sp.striker.options.uppercutBagTarget) { const t = sp.striker.options.uppercutBagTarget.slice(); t[1] += .34; t[2] += .06; sp.striker.options.uppercutBagTarget = t; }
    // the referee (or Bruno) during the celebration: a step behind the winner and to one side (never between the lens and him),
    // on the side nearer the middle of the ring
    const lateral = V(-camDir.z, 0, camDir.x), byAt = k => W.clone().addScaledVector(camDir, -.55).addScaledVector(lateral, k * 1.0);
    const by = [byAt(1), byAt(-1)].sort((a, b) => Math.max(Math.abs(a.x), Math.abs(a.z)) - Math.max(Math.abs(b.x), Math.abs(b.z)))[0]; by.x = clamp(by.x, -1.4, 1.4); by.z = clamp(by.z, -1.4, 1.4); by.y = 0;
    sp.ref = { start: view.referee.root.position.clone(), yaw: view.referee.root.rotation.y, by };
    calibrate(view, fallen);
    sp.begun = true; sp.fallen = fallen;
  }
  // DreamPose.civil with both gloves in the metrics (dream-pose.js v1.69 no longer returns them from its overlay; the bout's
  // contact pass needs both fists). Without DreamPose (node tests, old builds): the controller's winner pose.
  function civil(coach, state) {
    const Pose = typeof window !== 'undefined' && window.DreamPose;
    if (!Pose) return coach.update(state.t, 'guard', 'one_two', { stance: 1, simulationTime: state.t, presentation: { mode: 'winner', side: 'R', raise: 1 } });
    Film.register(Pose);
    const mt = Pose.civil(coach, state);
    if (mt && !(mt.gloves?.length === 2)) mt.gloves = ['L', 'R'].map(sd => coach.orientGlove(sd, .6, V(0, 0, -1)));
    return mt;
  }
  function strikerPose(view, u, metrics) {
    const sp = view.sundayPunch, s = sp.striker, coach = view.coaches[s.actor], m = view.match, root = coach.root;
    if (u < T.follow) {
      // follow-through: the glove keeps rising past where the chin was, then comes home to the guard
      const p = u < .45 ? lerp(s.phase, .58, smooth(u / .45)) : lerp(.58, 1, smooth((u - .45) / .5));
      root.position.copy(s.start); root.quaternion.setFromEuler(new THREE.Euler(0, s.yaw, 0, 'YXZ'));
      metrics[s.actor] = coach.update(p * 1.22, 'rear_uppercut', 'one_two', { ...s.options, simulationTime: m.time });
      return;
    }
    const dt = s.lastT != null ? Math.max(0, m.time - s.lastT) : 0; s.lastT = m.time;
    if (u >= T.celebrate) { celebratePose(view, u, metrics, dt); return; }
    // he stands over him and looks down at him, gloves still up (until the blackout)
    root.position.copy(s.start); root.quaternion.setFromEuler(new THREE.Euler(0, s.yaw, 0, 'YXZ'));
    const fallenHead = view.coaches[sp.fallen].joints.head.getWorldPosition(V()), look = root.worldToLocal(fallenHead.clone());
    metrics[s.actor] = civil(coach, { t: m.time, dt, dist: 0, walk: 0, arms: { L: 'fist', R: 'fist' }, reach: { L: [-.16, 1.40, .30], R: [.16, 1.40, .30] }, // gloves up at chest height
      look: { yaw: clamp(Math.atan2(look.x, look.z), -1, 1), pitch: -.35 }, lean: .04 });
  }
  // The winner after the blackout (super-punch-film.js celebrate), beside the fallen fighter, facing the lens. raise 0..1: the
  // referee lifts his arm (ring and gym endings): that arm goes straight up, the other fist pumps.
  function celebratePose(view, u, metrics, dt, raise = 0) {
    const sp = view.sundayPunch, s = sp.striker, coach = view.coaches[s.actor], m = view.match, root = coach.root, pick = sp.film;
    let c = Math.max(0, u - T.celebrate); if (c > 4.6) c = 1.0 + (c - 4.6) % 3.6; // ringless endings keep celebrating with the crowd
    const st = Film.celebrate(pick.celebrate, c, pick.mirror);
    if (raise > 0) {
      const side = s.raise, k = side === 'R' ? 1 : -1, o = side === 'R' ? 'L' : 'R', r = smooth(raise);
      st.arms[side] = 'yeah'; st.reach[side] = [k * lerp(.30, .60, r), lerp(1.62, 2.0, r), lerp(.26, .14, r)]; st.paws[side] = 'fist'; // up and out, toward the referee
      st.arms[o] = 'fist'; st.reach[o] = [-k * .16, 1.42 + .035 * Math.sin(m.time * 7) * r, .30]; st.paws[o] = 'fist';
      st.lift = 0; st.feet = null; st.yaw *= 1 - r; st.drop *= 1 - r; st.look = { yaw: 0, pitch: .18 }; st.talk = .5 * r;
    }
    root.position.copy(s.spot); root.position.y = st.lift;
    root.quaternion.setFromEuler(new THREE.Euler(0, s.celebYaw + st.yaw, 0, 'YXZ'));
    metrics[s.actor] = civil(coach, { t: m.time, dt, dist: 0, walk: 0, arms: st.arms, reach: st.reach, paws: st.paws, look: st.look, lean: st.lean, drop: st.drop, talk: st.talk, feet: st.feet });
  }
  // The rhino referee has one trouser mesh and separate shoes: his walk steps the shoes under the trousers with a body bob and sway.
  function refStep(ref, phase, amount) {
    const feet = ref.sundayFeet || (ref.sundayFeet = ref.root.children.filter(o => o.isGroup && Math.abs(o.position.y - .102) < .01 && Math.abs(Math.abs(o.position.x) - .148) < .02).map(o => ({ o, p: o.position.clone() })));
    for (const f of feet) { const s = f.p.x < 0 ? 0 : Math.PI, a = phase * Math.PI * 2 + s; f.o.position.set(f.p.x, f.p.y + .055 * Math.max(0, Math.sin(a)) * amount, f.p.z + .16 * Math.cos(a) * amount); }
    ref.root.position.y = .022 * Math.abs(Math.sin(phase * Math.PI * 2)) * amount; ref.root.rotation.z = .035 * Math.sin(phase * Math.PI * 2) * amount;
  }
  function refereePose(view, u) {
    const sp = view.sundayPunch, ref = view.referee, root = ref.root, m = view.match, fallen = view.coaches[sp.fallen];
    if (!root.visible && !ref.isBruno && !sp.refHidden) return; // ringless venues (GOTR-0065): no referee, nobody counts or waves
    const chest = view.cast.worldToLocal(fallen.joints.chest.getWorldPosition(V())); chest.y = 0;
    if (u >= T.celebrate) { // after the blackout: by the fallen fighter's head, watching him, while the winner celebrates
      const by = sp.ref.by, lookAt = fallen.joints.head.getWorldPosition(V()); root.position.copy(by); root.rotation.set(0, Math.atan2(chest.x - by.x, chest.z - by.z), 0);
      if (!ref.isBruno) refStep(ref, 0, 0);
      view.cast.updateMatrixWorld(true);
      if (ref.isBruno) ref.update(m.time, null, 1, { lookAt, waveOff: { t: 0, w: 0 }, walk: { dist: 0, w: 0 } }); else ref.update(m.time, null, 1, { lookAt, alert: .4 });
      return;
    }
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
  // After the knockout has played out: the fallen fighter stays down (or drags himself away on the street); in the ring and the
  // gym the referee / Bruno walks to the winner and raises his arm; in ringless venues nobody does and he keeps celebrating.
  function ceremonyPose(view, metrics, u) {
    const sp = view.sundayPunch, m = view.match, s = sp.striker, coach = view.coaches[s.actor], ref = view.referee, judged = sp.film.ending.raise && (ref.root.visible || ref.isBruno || sp.refHidden);
    const reveal = m.phase === 'ceremony', raise = judged && reveal ? clamp((m.phaseTime - .4) / 1.5) : 0;
    const dt = s.lastT != null ? Math.max(0, m.time - s.lastT) : 0; s.lastT = m.time;
    celebratePose(view, Math.max(u, T.celebrate), metrics, dt, raise);
    view.cast.updateMatrixWorld(true);
    if (!judged) return;
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
    if (sp.skip && sp.skipAt == null) sp.skipAt = m.time;
    if (sp.skip && !r.finisherSkipped) m.skipFinisher(); // skipped during the dip: the result does not wait for a film nobody sees
    const u = sp.skip ? END + (m.time - sp.skipAt) : Math.max(0, m.time - r.finisherTime), metrics = {}, a = view.arena;
    a.group.updateMatrixWorld(true);
    metrics[sp.fallen] = poseFallen(view, sp.fallen, Math.min(u, sp.fall.crawls ? 14 : T.settle + 3));
    if (m.finisherHold() && !sp.skip) { strikerPose(view, u, metrics); refereePose(view, u); }
    else ceremonyPose(view, metrics, u);
    crowd(view, u);
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
      const rearShoulder = sc.joints.armR.getWorldPosition(V()), leadShoulder = sc.joints.armL.getWorldPosition(V()), across = rearShoulder.sub(leadShoulder).setY(0); // shoulders, not gloves: in the guard the gloves line up along the punch
      let side = V(-line.z, 0, line.x); if (side.dot(across) < 0) side.negate();
      // the referee must not stand between the lens and the punch: take the other side when he would
      const mid = a.clone().lerp(b, .5), ref = view.referee.root.getWorldPosition(V()).sub(mid).setY(0), blocked = sd => { const f = sd.clone().multiplyScalar(Math.cos(-.14)).addScaledVector(line, Math.sin(.14)).normalize(); return ref.length() > .2 && ref.clone().normalize().dot(f) > Math.cos(.75); };
      if (blocked(side) && !blocked(side.clone().negate())) side.negate();
      sp.axis = { line, side };
    }
    const u = r?.finisher ? (sp.skip ? END + (m.time - (sp.skipAt ?? m.time)) : m.time - r.finisherTime) : null;
    const act = ['lion', 'rabbit'].map(a => m.fighters[a].action).find(x => x?.finisher);
    if (u != null && u >= 0) sp.filmT = (sp.filmT || 0) + Math.max(0, dt); // film clock: wall seconds since the glove met the jaw
    const f = u == null ? (act ? m.time - act.start - .75 : -1) : sp.filmT, pick = filmFor(view, striker);
    const fov = THREE.MathUtils.degToRad(cam.fov), tv = Math.tan(fov / 2), th = tv * Math.max(.2, cam.aspect);
    const { side, line } = sp.axis, up = V(0, 1, 0);
    // after the blackout cut: the winner's celebration, seen over the fallen body (and the referee once he comes to raise the hand)
    const celebrating = u != null && (sp.skip || u >= F.black[1] + .08) && sp.striker?.spot;
    if (celebrating && !sp.celebCut) { sp.celebCut = true; sp.cut = true; }
    let dir, pts, tight = [], sh = null;
    const add = (list, coach, names) => { for (const n of names) { const p = coach.joints[n].getWorldPosition(V()); if (n === 'head') p.y += .26; if (n.startsWith('foot')) p.y = Math.max(0, p.y - .1); list.push(p); } };
    if (celebrating) {
      const s = sp.striker, W = view.cast.localToWorld(s.spot.clone()), D = view.cast.localToWorld(s.spot.clone().add(s.camDir)).sub(W).setY(0).normalize();
      dir = D; const right = up.clone().cross(dir).normalize();
      pts = [W.clone(), W.clone().setY(2.28), W.clone().addScaledVector(right, .62).setY(1.75), W.clone().addScaledVector(right, -.62).setY(1.75)];
      add(pts, fc, ['head', 'hips']);
      const judged = pick.ending.raise && m.phase === 'ceremony' && !m.finisherHold() && view.referee?.root && (view.referee.root.visible || view.referee.isBruno);
      if (judged) { const rr = view.referee.root; pts.push(rr.localToWorld(V(0, 2.25, 0)), rr.localToWorld(V(0, 0, 0))); }
    } else {
      // the choreography of the punch and the fall (super-punch-film.js SHOTS), round the line between the fighters
      sh = Film.shot(pick.camera, f, u);
      const flat = side.clone().multiplyScalar(Math.cos(sh.az)).addScaledVector(line, -Math.sin(sh.az)).normalize();
      dir = sh.el != null ? flat.multiplyScalar(Math.cos(sh.el)).addScaledVector(up, Math.sin(sh.el)).normalize() : flat;
      pts = []; add(pts, fc, ['head', 'hips', 'footL', 'footR', 'handL', 'handR']);
      if (u == null || u < 1.3) add(pts, sc, ['head', 'footL', 'footR', 'handR']); else if (u < 2.1) add(pts, sc, ['hips']);
      // close-up on the impact: both faces and the punching glove
      tight = [fc.joints.head.localToWorld(V(0, .14, .05)), fc.joints.head.localToWorld(V(0, -.12, .1)), fc.joints.chest.getWorldPosition(V()), sc.joints.handR.getWorldPosition(V()), sc.joints.head.localToWorld(V(0, .12, 0))];
    }
    const right = up.clone().cross(dir).normalize(), camUp = dir.clone().cross(right).normalize();
    const bounds = list => { const c0 = V(); for (const p of list) c0.add(p); c0.divideScalar(list.length); let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; for (const p of list) { const d = p.clone().sub(c0), x = d.dot(right), y = d.dot(camUp); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } return { c0, minX, maxX, minY, maxY }; };
    const wide = bounds(pts), k = sh ? clamp(sh.tight) : 0, close = k > 0 ? bounds(tight) : wide, mix = (a, b) => lerp(a, b, k);
    const minX = mix(wide.minX, close.minX), maxX = mix(wide.maxX, close.maxX), minY = mix(wide.minY, close.minY), maxY = mix(wide.maxY, close.maxY), c0 = wide.c0.clone().lerp(close.c0, k);
    const centre = c0.clone().addScaledVector(right, (minX + maxX) / 2).addScaledVector(camUp, (minY + maxY) / 2 + (u == null ? -.05 : .02));
    const margin = lerp(u == null ? 1.18 : 1.24, 1.12, k), dist = (Math.max(((maxX - minX) / 2 + lerp(.22, .10, k)) * margin / th, ((maxY - minY) / 2 + lerp(.18, .08, k)) * margin / tv) + .3) * (sh?.dk ?? 1);
    // the gym room is small (hanging bags just off the mat): past the cap the lens widens instead of backing into the props
    let cap = view.gymFight ? 5.2 : 7.5;
    // ringless venues: the lens stays inside the circle of people and props (2.75 m from the middle); past it the lens widens
    if (view.ringless) { const p = centre.clone().sub(view.cast.getWorldPosition(V())).setY(0), dh = dir.clone().setY(0), a = dh.lengthSq(), b = p.dot(dh), disc = b * b - a * (p.lengthSq() - 2.75 * 2.75); if (a > 1e-4 && disc > 0) cap = Math.max(1.6, Math.min(cap, (-b + Math.sqrt(disc)) / a)); }
    const goal = { c: centre, d: clamp(dist, lerp(2.4, 1.25, k), cap), fov: dist > cap ? THREE.MathUtils.radToDeg(2 * Math.atan(tv * (dist - .3) / (cap - .3))) : FOV };
    if (!sp.cam || sp.cut) { sp.cam = { c: goal.c.clone(), d: goal.d, fov: goal.fov }; sp.cut = false; }
    else { const kk = 1 - Math.exp(-Math.max(0, dt) / .35); sp.cam.c.lerp(goal.c, kk); sp.cam.d = lerp(sp.cam.d, goal.d, kk); sp.cam.fov = lerp(sp.cam.fov ?? FOV, goal.fov, kk); }
    cam.fov = Math.min(75, sp.cam.fov);
    const position = sp.cam.c.clone().addScaledVector(dir, sp.cam.d);
    if (celebrating) position.y = 1.28; else if (sh.h != null) position.y = sh.h; // low lens, looking up at the punch; eye level for the celebration
    if (sp.ceiling === undefined) { let top = 0; view.engine.scene?.traverse?.(n => { const c = n.userData?.cameraCeiling; if (c > 0 && n.visible !== false && (!top || c < top)) top = c; }); sp.ceiling = top || null; }
    if (sp.ceiling && position.y > sp.ceiling) position.y = sp.ceiling; // the overhead drop stays under the basement's pipes
    cam.position.copy(position); cam.zoom = 1; cam.up.set(0, 1, 0); cam.lookAt(sp.cam.c); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const grid = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) grid.push(c0.clone().addScaledVector(right, lerp(minX, maxX, i / 4)).addScaledVector(camUp, lerp(minY, maxY, j / 4)));
    clearView(view, position, grid.concat([fc.joints.head, fc.joints.hips, sc.joints.head, sc.joints.handR].map(b => b.getWorldPosition(V()))));
    refereeClear(view, position, celebrating ? [] : [fc.joints.head, fc.joints.chest, sc.joints.handR, fc.joints.hips, sc.joints.head, sc.joints.hips, sc.joints.chest].map(b => b.getWorldPosition(V())));
  }
  // The referee (or Bruno) walking over must not fill the lens during the punch and the fall: while he stands between the lens
  // and the fighters (a 0.4 m column, 2.1 m tall) or right in front of it he is left out of the picture; he is always back for the celebration.
  function refereeClear(view, eye, targets) {
    const ref = view.referee, sp = view.sundayPunch; if (!ref?.root || view.ringless) return;
    const p = ref.root.getWorldPosition(V()), fwd = V(0, 0, -1).applyQuaternion(view.engine.camera.quaternion), near = Math.hypot(eye.x - p.x, eye.z - p.z);
    let block = near < .55 || targets.length > 0 && near < 1.5 && fwd.dot(p.clone().setY(eye.y).sub(eye)) > 0; // right in front of the lens: he would fill a third of the picture
    for (const t of targets) { if (block) break; const dx = t.x - eye.x, dz = t.z - eye.z, len2 = dx * dx + dz * dz; if (len2 < 1e-6) continue; const k = clamp(((p.x - eye.x) * dx + (p.z - eye.z) * dz) / len2), x = eye.x + dx * k, z = eye.z + dz * k, y = lerp(eye.y, t.y, k); if (k > .02 && k < .97 && Math.hypot(p.x - x, p.z - z) < .42 && y < 2.1) block = true; }
    if (block) { if (ref.root.visible) { ref.root.visible = false; sp.refHidden = true; } } else if (sp.refHidden) { ref.root.visible = true; sp.refHidden = false; }
  }
  // This fight's film (camera, celebration, ending), chosen once per bout view from the fight itself (super-punch-film.js choose).
  function filmFor(view, striker) {
    const sp = view.sundayPunch || (view.sundayPunch = {}); if (sp.film) return sp.film;
    const fallen = other(striker), fc = view.coaches[fallen], sc = view.coaches[striker];
    const place = view.ringless?.id || (view.gymFight ? 'gym' : 'ring'), venue = view.ringless?.id || (view.gymFight ? 'gym' : (typeof window !== 'undefined' && window.app?.engine?.career?.store?.game?.()?.venue) || 'ring');
    return (sp.film = Film.choose({ seed: view.match.seed, venue, place, opponent: fc?.character || fallen, striker: sc?.character || striker }));
  }
  // Ropes, posts and corner pads between the lens and the fighters are hidden while the cinematic runs (like a film crew's
  // camera inside the ropes); everything is shown again when it ends.
  function clearView(view, eye, targets) {
    const ring = view.ring; const sp = view.sundayPunch, ray = new THREE.Ray(), hit = V(), box = new THREE.Box3();
    sp.hidden = sp.hidden || new Set(); const hide = new Set(), corners = [];
    const boxBlocks = () => { box.expandByScalar(.04); if (box.containsPoint(eye)) return true; for (const t of targets) { ray.origin.copy(eye); ray.direction.copy(t).sub(eye); const far = ray.direction.length(); ray.direction.divideScalar(far); if (ray.intersectBox(box, hit) && hit.distanceTo(eye) < far - .25) return true; } return false; };
    const blocks = part => { box.setFromObject(part).expandByScalar(.04); if (box.distanceToPoint(eye) < .8) return true; /* a post right by the lens */ for (const t of targets) { ray.origin.copy(eye); ray.direction.copy(t).sub(eye); const far = ray.direction.length(); ray.direction.divideScalar(far); if (ray.intersectBox(box, hit) && hit.distanceTo(eye) < far - .25) return true; } return false; };
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
    sp.axis = null; sp.cam = null; sp.filmT = 0; sp.celebCut = false; sp.ceiling = undefined; // a later finisher in this bout frames afresh
    if (sp.refHidden && view.referee?.root) { view.referee.root.visible = true; sp.refHidden = false; }
    if (view.engine.impactFx) view.engine.impactFx.slowmo = 1;
    filmOverlay(view, null);
  }
  function audio() { return typeof window !== 'undefined' ? window.app?.audio : null; }
  // The people round a ringless fight (the venue set's crowd, arena-sets.js tick): they cheer from the knockout; at the Docks they
  // close in round the winner; in the basement they roar. Ring venues: the arena audience cheers as before (FightAudience).
  function crowd(view, u) {
    const set = view.ringless?.set, end = view.sundayPunch.film?.ending; if (!set || !end) return;
    const after = smooth((u - T.celebrate + .2) / .6);
    set.cheer = lerp(u > .05 ? .45 : 0, end.crowd === 'roar' ? 1.6 : 1, after);
    set.close = end.crowd === 'close' ? .8 * smooth((u - T.celebrate) / 2.6) : 0;
  }
  // Letterbox bars while the film plays, the blackout with the K.O. beat, speed lines on the impact (super-punch-film.js overlay).
  function filmOverlay(view, u) {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const stage = document.getElementById('stageContainer'); if (!stage) return;
    const sp = view.sundayPunch || {}, m = view.match, on = u !== null && presenting(view) && !sp.skip && (!m.result?.finisher || m.finisherHold());
    const b = on && u != null ? Film.blackout(u) : { black: 0, ko: false };
    if (!on && !stage.querySelector('.sp-film')) return;
    Film.overlay(stage, { bars: on, black: b.black, ko: b.ko, lines: on && u != null && u >= 0 && u < .2 });
  }
  function effects(view, events) {
    const e = view.engine, sp = view.sundayPunch, fx = e.impactFx, au = audio(), gym = !!view.gymFight;
    for (const ev of events) {
      if (ev.type === 'finisher-start') { try { au?.playSample?.('effort-' + (1 + (ev.id % 2)), .16, .86, 0, 3000); } catch { } }
      if (ev.type === 'finisher-ko') {
        sp.koAt = ev.time;
        const fallen = view.coaches[ev.receiver], chin = fallen.joints.head.localToWorld(V(0, .02, .2)), striker = view.coaches[ev.actor];
        const n = chin.clone().sub(striker.joints.chest.getWorldPosition(V())).setY(0).normalize().add(V(0, 1.2, 0)).normalize();
        // sweat flies off the face in a wide fan (in slow motion: impact-fx.js follows the film's time scale)
        try { for (const [v, side] of [[1.9, 0], [1.5, .5], [1.3, -.5]]) { const dn = n.clone().add(V(side, 0, -side).multiplyScalar(.6)).normalize(); fx?.spray(chin.toArray(), dn.toArray(), v, 'head'); } if (fx) fx.kick = { t: 0, amp: .06, phase: 0 }; } catch { }
        flash(e);
        try { au?.playSample?.('body-2', .8, .55, 0, 520); au?.playSample?.('pad', .62, .80, .002, 3600); au?.playSample?.('body-1', .5, .66, .012, 900); if (!gym) au?.playSample?.('applause', .62, .94, .25); } catch { }
      }
    }
    // the crowd at the celebration (not in the gym: Bruno's room is quiet); the basement roars
    const r = view.match.result;
    if (sp?.begun && !sp.cheered && r?.finisher && view.match.time - r.finisherTime >= T.celebrate + .2 && !sp.skip) {
      sp.cheered = true; const end = sp.film?.ending;
      try { if (end?.crowd) { au?.playSample?.('applause', end.crowd === 'roar' ? .85 : .7, end.crowd === 'roar' ? .82 : 1, 0); au?.playSample?.('clap-' + (1 + (view.match.seed % 3)), .35, 1, .15); if (end.crowd !== 'cheer') au?.playSample?.('applause', .5, .7, .35); } } catch { }
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
      const active = presenting(this), r = this.match.result;
      if (this.engine?.impactFx) this.engine.impactFx.slowmo = active ? timeScale(this) : 1; // sweat drops fly in slow motion too
      if (active) camera(this, dt); else if (sp.saved) restoreCamera(this);
      if (active) filmOverlay(this, r?.finisher ? (sp.skip ? null : this.match.time - r.finisherTime) : undefined);
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
  const api = { install, timeScale, fallState, koOverlay, poseFallen, lowest, skinLowest, presenting, filmFor, T, SLOW, SEEN, END, film: Film };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') { window.SundayPunch = api; if (window.FightArena) install(window.FightArena); }

  /* ---------- skip (after the first time) and the caption ---------- */
  if (typeof document === 'undefined' || !document.getElementById) return;
  function boot() {
    const app = window.app, e = app?.engine, stage = document.getElementById('stageContainer'); if (!e || !stage) { if ((boot.n = (boot.n || 0) + 1) < 100) setTimeout(boot, 200); return; }
    if (window.FightArena) install(window.FightArena);
    const cap = document.createElement('div'); cap.className = 'sp-caption'; cap.hidden = true; cap.setAttribute('role', 'status');
    const title = document.createElement('strong'); title.textContent = 'Super Punch'; title.dir = 'ltr'; const scene = document.createElement('em'); scene.className = 'sp-scene'; const hint = document.createElement('span'); cap.append(title, scene, hint); stage.append(cap);
    const SKIP = { en: 'Tap to skip', he: 'הקישו לדילוג', ru: 'Нажмите, чтобы пропустить' };
    let seen = false; try { seen = localStorage.getItem(SEEN) === '1'; } catch { }
    let marked = false;
    const view = () => e.targetMode === 'fight' ? e.arena?.fightView : null;
    setInterval(() => {
      const v = view(), m = v?.match, r = m?.result, on = !!(v && SundayPunch.presenting(v) && (r?.finisher ? m.finisherHold() : true));
      document.body.classList.toggle('sunday-punch-on', on);
      const u = r?.finisher ? m.time - r.finisherTime : -1, show = on && !!r?.finisher && u > .25 && Film.blackout(u).black < .2; // the K.O. beat has the black screen to itself
      if (cap.hidden === show) cap.hidden = !show;
      // after the blackout, ringless scenes say who stops it there (nobody): the crowd (super-punch-film.js ENDINGS / STORY)
      const line = u >= F.black[2] && v?.sundayPunch?.film?.ending?.line; scene.textContent = line ? (line[app.lang] || line.en) : ''; scene.dir = document.documentElement.dir || 'ltr';
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
