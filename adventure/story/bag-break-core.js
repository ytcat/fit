/* Chapter 1 beat 4, "the old bag breaks" (GOTR-0087), pure part: the film script, the time warp (slow motion at the
 * impact) and the precomputed physics. No DOM, no three.js: used by adventure/story/bag-break.js in the browser
 * (window.BagBreakCore) and by tests/bag-break.test.cjs in node.
 *
 * Two clocks: WALL time (what the viewer sits through, camera keys and the subtitle use it) and SIM time (the physics and
 * the Fighter's moves). warp(wall) -> sim is 1:1 except around the big punch, where sim time runs at a fifth of the speed.
 *
 * Physics (all in the punch plane: s = metres along the punch direction, y = up, w = sideways; SI units):
 *   - the bag is a rigid body (mass, inertia of a solid cylinder) hanging from the ceiling mount by an inextensible chain
 *     (a distance constraint at the top ring): a real double pendulum, so every punch makes it swing AND wobble;
 *   - a punch is a short horizontal force at glove height on the near side;
 *   - the chain snaps when the big punch has swung it far out; from then on the bag is in free flight under gravity,
 *     lands on its lower rim (restitution, Coulomb friction at the rim contacts), bounces once, tips over, slides, and
 *     rolls a little sideways against rolling resistance;
 *   - the chain is 13 links: the 4 top links stay on the mount (verlet rope, keeps swinging), 3 fly off as loose links
 *     (ballistic, bounce), 6 stay on the bag's ring (verlet rope dragged by the bag, lies on the floor);
 *   - the lamp is a damped pendulum kicked by the jolt in the ceiling.
 * BagBreakCore.track() -> the recorded motion (120 Hz) ; sample(simTime) -> { bag: { s, y, th, w, roll, yaw }, links: [{ p: [s, y, w], d: [..] }], snapped, lamp: [a, b] }
 * th = tilt of the bag axis in the punch plane (radians, + = bottom swings away from the Fighter). */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, L = (en, he, ru) => ({ en, he, ru });
  const ID = 'dream_bag_break';
  // ---- the bag and where it hangs (the old bag of Bruno's Gym: first bag on the mat of the set 'dream_gym')
  const BAG = { r: .235, h: .575, cy: 1.54, ring: .93, mount: 3.30, mass: 36, links: 13, keep: 4, fly: 3 };
  BAG.chain = BAG.mount - BAG.cy - BAG.ring; BAG.pitch = BAG.chain / BAG.links; BAG.inertia = BAG.mass * (3 * BAG.r * BAG.r + 4 * BAG.h * BAG.h) / 12;
  const PLACE = { x: 5.6, z: -2.5, dir: [-1, 0], side: [0, -1], stand: .675, lamp: [-.95, 5.4, .55, 2.3] }; // lamp: offset along -dir, ceiling y, offset sideways, cord length
  // ---- sim-time script of the Fighter: guard, jab, cross, guard, the big cross, guard, then the reaction
  const HIT_PHASE = .372; // phase of a straight punch at which the glove meets the leather (measured in the browser)
  const MOVES = [{ move: 'jab', t: 1.9, dur: .5, dv: .3, y: .16 }, { move: 'cross', t: 2.4, dur: .58, dv: .5, y: .14 }, { move: 'cross', t: 3.75, dur: .74, dv: 3.3, y: .05, big: true }];
  for (const m of MOVES) m.hit = m.t + HIT_PHASE * m.dur;
  const BIG = MOVES[2], REACT = BIG.hit + 2.6, SIM_END = REACT + 6.3;
  // ---- time warp: [sim from, sim to, speed]
  const SLOW = [[BIG.hit - .05, BIG.hit + .30, .2], [BIG.hit + .30, BIG.hit + .55, .5]];
  function wallOf(sim) { let w = sim; for (const [a, b, k] of SLOW) w += (clamp(sim, a, b) - a) * (1 / k - 1); return w; }
  function warp(wall) { let lo = 0, hi = SIM_END; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (wallOf(mid) < wall) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  const DURATION = wallOf(SIM_END), W = wallOf;

  /** What the Fighter does at sim time t: { act: 'guard' | 'punch' | 'react', move, phase, big } */
  function fighterAt(t) {
    if (t >= REACT) return { act: 'react', t: t - REACT };
    for (const m of MOVES) if (t >= m.t && t < m.t + m.dur) return { act: 'punch', move: m.move, phase: (t - m.t) / m.dur, big: !!m.big };
    return { act: 'guard' };
  }
  // Reaction (sim seconds after REACT): hands drop, a step back, he stares at the bag, looks at his glove, then at the office door.
  const REACTION = [
    { t: 0, back: 0, arms: { L: 'chin', R: 'chin' }, look: 'bag', lean: .1 },
    { t: .2, arms: {}, look: 'bag', lean: .05 },
    { t: 1.9, arms: { R: 'open' }, look: 'glove', lean: .08 },
    { t: 3.3, arms: { L: 'head', R: 'head' }, look: 'door', lean: -.03 }
  ];
  const STEP_BACK = { from: .35, to: 1.45, dist: .42 };
  function reactionAt(t) { let k = REACTION[0]; for (const q of REACTION) if (q.t <= t) k = q; const u = clamp((t - STEP_BACK.from) / (STEP_BACK.to - STEP_BACK.from)); return { ...k, back: STEP_BACK.dist * u * u * (3 - 2 * u), walking: u > 0 && u < 1 }; }

  // ---- camera (wall time; world metres; same key format as DreamCore.camera) and the one line
  const b = PLACE, R0 = W(REACT);
  const scene = {
    id: ID, set: 'dream_gym', place: 'gym', chapter: 1, duration: DURATION, tap: false, outfit: { fighter: 'kit' },
    actors: { fighter: { rig: 'fighter', keys: [{ t: 0, x: b.x - b.dir[0] * b.stand, z: b.z - b.dir[1] * b.stand, face: [b.x, b.z], act: 'guard' }] } },
    camera: [
      { t: 0, pos: [3.5, 1.7, -6.5], look: [5.95, 1.75, -2.5], fov: 44 },                              // night gym: the lamp, the bag, the Fighter
      { t: W(1.8), pos: [4.1, 1.6, -6.0], look: [5.95, 1.62, -2.5], fov: 40, ease: 'smooth' },
      { t: W(BIG.t - .1), pos: [4.4, 1.55, -5.7], look: [5.9, 1.6, -2.5], fov: 38, ease: 'linear' },
      { t: W(BIG.t - .1), cut: true, pos: [6.75, 1.6, -5.2], look: [5.85, 1.5, -2.5], fov: 34 },       // he loads up: the rear hand side
      { t: W(BIG.hit - .05), pos: [6.6, 1.6, -5.0], look: [5.8, 1.5, -2.5], fov: 32, ease: 'linear' },
      { t: W(BIG.hit - .05), cut: true, pos: [5.5, 1.52, -4.25], look: [5.78, 1.45, -2.5], fov: 34 },  // impact, slow motion: the bag folds round the glove
      { t: W(BIG.hit + .13), pos: [5.4, 1.52, -4.2], look: [5.62, 1.47, -2.5], fov: 33, ease: 'linear' },
      { t: W(BIG.hit + .13), cut: true, pos: [6.0, 1.45, -4.7], look: [5.25, 2.75, -2.5], fov: 36 },    // the chain: a link opens, links fly
      { t: W(BIG.hit + .42), pos: [5.9, 1.45, -4.8], look: [4.95, 2.6, -2.5], fov: 38, ease: 'linear' },
      { t: W(BIG.hit + .42), cut: true, pos: [4.9, 1.2, -6.9], look: [4.5, 1.2, -2.5], fov: 46 },       // wide: the fall, the floor, the roll
      { t: W(BIG.hit + 1.3), pos: [4.3, 1.05, -6.7], look: [3.5, .6, -2.5], fov: 42, ease: 'smooth' },
      { t: R0, pos: [4.1, 1.0, -6.4], look: [3.3, .5, -2.5], fov: 40, ease: 'linear' },
      { t: R0, cut: true, pos: [4.5, 1.6, -4.7], look: [6.55, 1.48, -2.5], fov: 30 },                   // reaction: hands drop, he steps back
      { t: R0 + 3.3, pos: [4.4, 1.6, -4.8], look: [6.6, 1.48, -2.5], fov: 30, ease: 'linear' },
      { t: R0 + 3.3, cut: true, pos: [.45, 1.4, -3.05], look: [6.4, .8, -2.5], fov: 40 },             // the bag on the floor, the empty chain, "...uh oh"
      { t: DURATION, pos: [.3, 1.45, -3.05], look: [6.4, .85, -2.5], fov: 39, ease: 'linear' }
    ],
    lines: [{ t: R0 + 3.6, who: 'fighter', text: L('…Bruno\'s going to kill me.', '…ברונו יהרוג אותי.', '…Бруно меня убьёт.') }]
  };
  function validate(s = scene) {
    const e = []; if (!(s.duration > 10 && s.duration < 18)) e.push('duration'); if (s.set !== 'dream_gym') e.push('set'); if (s.outfit?.fighter !== 'kit') e.push('outfit');
    for (let i = 0; i < s.camera.length; i++) { const c = s.camera[i]; if (c.pos?.length !== 3 || c.look?.length !== 3 || ![...c.pos, ...c.look, c.t].every(Number.isFinite)) e.push('camera key ' + i); if (i && c.t < s.camera[i - 1].t) e.push('camera keys not sorted'); }
    if (s.camera[s.camera.length - 1].t > s.duration + 1e-6) e.push('camera past the end');
    for (const l of s.lines) { for (const g of ['en', 'he', 'ru']) if (!l.text?.[g]) e.push('line ' + g); if (!(l.t > 0 && l.t < s.duration)) e.push('line time'); if (!s.actors[l.who]) e.push('line speaker'); }
    if (!s.actors.fighter || s.actors.fighter.rig !== 'fighter') e.push('fighter');
    return e;
  }

  // ---------------------------------------------------------------- physics
  const G = 9.81, DT = 1 / 480, EVERY = 4, RATE = 1 / (DT * EVERY), FLOOR_E = .3, MU = .55, LINK_Y = .012;
  function simulate() {
    const { r, h, cy, ring, mount, mass: m, inertia: I, links: N, keep, fly, pitch } = BAG, Lc = BAG.chain;
    const bag = { x: 0, y: cy, th: 0, vx: .1, vy: 0, om: 0, w: 0, vw: 0, roll: 0, yaw: 0 };
    const frames = [], events = { snap: null, floor: [], flat: null, rest: null, hits: MOVES.map(q => q.hit) };
    const axis = () => [-Math.sin(bag.th), Math.cos(bag.th)], norm = () => [Math.cos(bag.th), Math.sin(bag.th)];
    const off = (lx, ly) => { const a = axis(), n = norm(); return [lx * n[0] + ly * a[0], lx * n[1] + ly * a[1]]; };
    const velAt = o => [bag.vx - bag.om * o[1], bag.vy + bag.om * o[0]];
    const push = (o, jx, jy) => { bag.vx += jx / m; bag.vy += jy / m; bag.om += (o[0] * jy - o[1] * jx) / I; };
    let snapped = false, top = null, low = null, loose = null, flatAt = null, still = 0, rocked = false, lampKick = null;
    // 3D helpers for the lying bag: the ring position with the sideways roll and the yaw
    const ring3 = () => { const o = off(0, ring), c = Math.cos(bag.yaw), s = Math.sin(bag.yaw); return [bag.x + o[0] * c, bag.y + o[1], bag.w + o[0] * s]; };
    const linePts = () => { const o = off(0, ring), rx = bag.x + o[0], ry = bag.y + o[1], out = []; for (let i = 0; i <= N; i++) { const k = i / N; out.push([rx * k, mount + (ry - mount) * k, 0]); } return out; };
    const rope = (pts, prev, pin, iterations, floor) => {
      for (let i = 0; i < pts.length; i++) { if (i === pin.i) continue; const p = pts[i], q = prev[i], drag = floor && p[1] <= LINK_Y + 1e-4 ? .9 : .9992; for (let k = 0; k < 3; k++) { const v = (p[k] - q[k]) * drag; q[k] = p[k]; p[k] += v; } p[1] -= G * DT * DT; }
      for (let it = 0; it < iterations; it++) {
        pts[pin.i][0] = pin.p[0]; pts[pin.i][1] = pin.p[1]; pts[pin.i][2] = pin.p[2];
        for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], c = pts[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], d = Math.hypot(dx, dy, dz) || 1e-9, e = (d - pitch) / d, wa = i === pin.i ? 0 : .5, wc = i + 1 === pin.i ? 0 : .5, sum = wa + wc || 1; for (const [p, wgt, sg] of [[a, wa / sum, 1], [c, wc / sum, -1]]) { p[0] += dx * e * wgt * sg; p[1] += dy * e * wgt * sg; p[2] += dz * e * wgt * sg; } }
        if (floor) for (const p of pts) if (p[1] < LINK_Y) p[1] = LINK_Y;
      }
    };
    let prevLine = linePts();
    const steps = Math.round(SIM_END / DT);
    for (let n = 0; n <= steps; n++) {
      const t = n * DT;
      if (!events.rest) {
        // forces: gravity, light air drag, the punches
        bag.vy -= G * DT; const drag = snapped ? .05 : .32; bag.vx *= 1 - drag * DT; bag.om *= 1 - drag * DT;
        for (const q of MOVES) if (t >= q.hit && t < q.hit + .03) { const o = off(-r, q.y), j = m * q.dv * DT / .03; push(o, j, 0); }
        if (!snapped) { // the chain: the ring cannot get further from the mount than the chain is long
          const o = off(0, ring), dx = bag.x + o[0], dy = bag.y + o[1] - mount, d = Math.hypot(dx, dy), C = d - Lc;
          if (C > -1e-4) { const u = [dx / d, dy / d], v = velAt(o), vn = v[0] * u[0] + v[1] * u[1] + .2 * Math.max(C, 0) / DT; if (vn > 0) { const cr = o[0] * u[1] - o[1] * u[0], lam = -vn / (1 / m + cr * cr / I); push(o, lam * u[0], lam * u[1]); } }
          const ang = Math.atan2(Math.abs(dx), -dy);
          if (t > BIG.hit && (ang > .3 || t > BIG.hit + .4)) {
            snapped = true; events.snap = t; lampKick = t;
            const now = linePts(), vel = now.map((p, i) => p.map((c, k) => (c - prevLine[i][k]) / DT));
            top = { pts: now.slice(0, keep + 1), prev: prevLine.slice(0, keep + 1).map((p, i) => p.map((c, k) => c - (i ? [.004, -.003, .0015][k] * i : 0))) }; // the freed end whips back
            low = { pts: now.slice(keep + fly).reverse(), prev: prevLine.slice(keep + fly).reverse() };
            const kicks = [[-1.5, 2.9, 1.0], [-.5, 3.5, -1.4], [1.0, 2.4, .6]];
            loose = kicks.map((kv, i) => { const a = now[keep + i], c = now[keep + i + 1], d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], len = Math.hypot(...d); return { p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0], v: vel[keep + i].map((x, k) => x + kv[k]), d: d.map(x => x / len), spin: 11 + 5 * i, ax: i % 2 ? [.3, .2, .93] : [.5, -.3, .8], rest: false }; });
          }
        }
        if (snapped) { // floor: the four rim corners of the bag's outline in the punch plane
          let touching = 0, side = 0;
          for (let it = 0; it < 4; it++) for (const [lx, ly] of [[-r, -h], [r, -h], [-r, h], [r, h]]) {
            const o = off(lx, ly), py = bag.y + o[1]; if (py > 0) continue; if (!it) { touching++; side += lx; }
            const v = velAt(o), kn = 1 / m + o[0] * o[0] / I, vn = v[1], want = (vn < -.7 ? -FLOOR_E * vn : 0) + Math.min(1.5, .12 * -py / DT);
            if (vn < want) {
              const jn = (want - vn) / kn; if (!it && vn < -.7) events.floor.push({ t, s: bag.x + o[0], speed: -vn, flat: Math.abs(Math.cos(bag.th)) < .35 });
              push(o, 0, jn);
              const v2 = velAt(o), kt = 1 / m + o[1] * o[1] / I, jt = clamp(-v2[0] / kt, -MU * jn, MU * jn); push(o, jt, 0);
            }
          }
          const lying = touching >= 2 && Math.abs(Math.cos(bag.th)) < .12;
          if (lying) { bag.om *= 1 - 9 * DT; bag.vx *= 1 - 2.2 * DT; if (flatAt == null) { flatAt = t; events.flat = t; bag.vw = .5 * Math.sign(side || 1); } }
          if (flatAt != null) { // sideways roll against rolling resistance, one small rock back, a slight turn on the floor
            const s = Math.sign(bag.vw); if (s) { bag.vw -= s * .62 * DT; if (Math.sign(bag.vw) !== s) { bag.vw = rocked ? 0 : -s * .07; rocked = true; } }
            bag.w += bag.vw * DT; bag.roll = bag.w / r; bag.yaw = .2 * (1 - Math.exp(-2.4 * (t - flatAt)));
          }
          still = lying && Math.hypot(bag.vx, bag.vy) < .03 && Math.abs(bag.om) < .05 && bag.vw === 0 ? still + DT : 0;
          if (still > .25) { events.rest = t; bag.vx = bag.vy = bag.om = 0; bag.th = Math.sign(bag.th) * Math.PI / 2; bag.y = r; }
        }
        if (!events.rest) { bag.x += bag.vx * DT; bag.y += bag.vy * DT; bag.th += bag.om * DT; }
      }
      if (snapped) {
        rope(top.pts, top.prev, { i: 0, p: [0, mount, 0] }, 14, false);
        rope(low.pts, low.prev, { i: 0, p: ring3() }, 14, true);
        for (const q of loose) if (!q.rest) {
          q.v[1] -= G * DT; for (let k = 0; k < 3; k++) q.p[k] += q.v[k] * DT;
          const a = q.spin * DT, c = Math.cos(a), s = Math.sin(a), [ux, uy, uz] = q.ax, [dx, dy, dz] = q.d, dot = ux * dx + uy * dy + uz * dz; // Rodrigues
          q.d = [dx * c + (uy * dz - uz * dy) * s + ux * dot * (1 - c), dy * c + (uz * dx - ux * dz) * s + uy * dot * (1 - c), dz * c + (ux * dy - uy * dx) * s + uz * dot * (1 - c)];
          if (q.p[1] < LINK_Y) { q.p[1] = LINK_Y; if (q.v[1] < -.5) { q.v[1] *= -.34; q.v[0] *= .6; q.v[2] *= .6; q.spin *= .5; q.d[1] *= .35; } else { q.v = [0, 0, 0]; q.spin = 0; q.d[1] = 0; q.rest = true; } const len = Math.hypot(...q.d) || 1; q.d = q.d.map(x => x / len); }
        }
      }
      const line = snapped ? null : linePts(); if (line) prevLine = line;
      if (n % EVERY === 0) {
        const links = [];
        const seg = (a, c) => { const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], len = Math.hypot(...d) || 1; links.push({ p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], d: d.map(x => x / len) }); };
        if (!snapped) for (let i = 0; i < N; i++) seg(line[i], line[i + 1]);
        else { for (let i = 0; i < keep; i++) seg(top.pts[i], top.pts[i + 1]); for (const q of loose) links.push({ p: q.p.slice(), d: q.d.slice() }); for (let i = low.pts.length - 1; i > 0; i--) seg(low.pts[i], low.pts[i - 1]); }
        // the lamp: a pendulum on its cord, a small idle sway, then kicked by the jolt (two axes, slow decay)
        const wl = Math.sqrt(G / PLACE.lamp[3]), u = lampKick == null ? -1 : t - lampKick, lamp = [.012 * Math.sin(wl * t), .008 * Math.cos(wl * t * .97)];
        if (u >= 0) { const e = Math.exp(-.11 * u); lamp[0] += .21 * e * Math.sin(wl * u); lamp[1] += .075 * e * Math.sin(wl * .97 * u + .9) * clamp(u * 2); }
        frames.push({ bag: { s: bag.x, y: bag.y, th: bag.th, w: bag.w, roll: bag.roll, yaw: bag.yaw }, links, snapped, lamp });
      }
    }
    return { frames, events, rate: RATE };
  }
  let cached = null;
  const track = () => cached || (cached = simulate());
  const mix = (a, c, k) => a + (c - a) * k;
  function sample(t) {
    const T = track(), f = clamp(t, 0, SIM_END) * T.rate, i = Math.min(T.frames.length - 1, Math.floor(f)), j = Math.min(T.frames.length - 1, i + 1), k = f - i, A = T.frames[i], B = T.frames[j];
    if (A.snapped !== B.snapped) return A;
    const bag = {}; for (const key of Object.keys(A.bag)) bag[key] = mix(A.bag[key], B.bag[key], k);
    return { bag, snapped: A.snapped, lamp: [mix(A.lamp[0], B.lamp[0], k), mix(A.lamp[1], B.lamp[1], k)], links: A.links.map((l, n) => ({ p: l.p.map((v, q) => mix(v, B.links[n].p[q], k)), d: l.d.map((v, q) => mix(v, B.links[n].d[q], k)) })) };
  }
  /** Where the bag lies in the end (gym afterwards): same record as sample().bag plus the chain links at rest. */
  const rest = () => sample(SIM_END);

  /** State of the old bag in Bruno's Gym from the save: 'hanging' (before beat 4), 'broken' (beat 4 done, no new bag yet), 'new' (bought, beat 7). */
  function gymState(game) {
    const a = game?.adventure, done = id => !!(a?.story?.done?.includes(id) || (a?.missions?.[id]?.stars || 0) > 0);
    return done('buy_heavy_bag') ? 'new' : done('night_bag') ? 'broken' : 'hanging';
  }

  const api = { ID, BAG, PLACE, MOVES, BIG, REACT, SIM_END, DURATION, HIT_PHASE, scene, validate, warp, wallOf, fighterAt, reactionAt, STEP_BACK, simulate, track, sample, rest, gymState };
  if (typeof module !== 'undefined') module.exports = api; else window.BagBreakCore = api;
})();
