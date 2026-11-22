/* Skill trials, pure rules (GOTR-0061): the side games of the adventure are short trials built on the boxing mechanics:
 * a readable challenge, escalating tempo, a streak multiplier, risk and reward, and a score to chase. No DOM, no three.js:
 * used by adventure/story/story-scenes.js (window.StoryTrials) and by tests/story-trials.test.cjs in node.
 *
 * Every trial: new Trial(rules?, { hard }) ; key(k, down) with k in left right up down straight hook uppercut ;
 * step(dt) ; view() (what the screen shows) ; result(starsFor) -> { missionId, metric, value, score, streak, time, hard,
 * stars, finished } ; .done. "value" is what the mission records (adventure-progress.js metric); "score" is the number to
 * beat. hard = the variant unlocked by gold: the same trial about a quarter faster.
 *   BagTrial     heavy_bag_van      Brick's bag: a real swinging bag; the punch lands where the glove meets the leather (GOTR-0077)
 *   EchoTrial    snoring_guard      Sleep talker: repeat the growing combo the guard mumbles (lamps), duck if you wake him
 *   BarrageTrial rooftop_balloons   Rooftop barrage: slip / duck / step out, punch the marked balloons back
 *   CutoffTrial  whistle_chase      Cut him off: footwork on a grid, corner the raccoon five times, each time faster
 *   BetTrial     grandma_groceries  The hustler's bet: punish real openings, three bites on feints lose the bet
 *   DuoTrial     bag_drill          Two-sided drill: Mack hits the bag, hit it back at the top of the swing with the called punch */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const rng = seed => { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; };
  const PUNCH = ['straight', 'hook', 'uppercut'], isPunch = k => PUNCH.includes(k);
  class Trial {
    constructor(rules, opts = {}) { this.r = rules; this.hard = !!opts.hard; this.k = this.hard ? 1.25 : 1; this.t = 0; this.score = 0; this.streak = 0; this.maxStreak = 0; this.done = false; this.flash = null; this.log = []; }
    get mult() { return Math.min(5, 1 + Math.floor(this.streak / 4)); }
    event(type, extra) { this.log.push({ t: +this.t.toFixed(2), type, ...extra }); }
    gain(base, type = 'hit') { const pts = base * this.mult; this.score += pts; this.streak++; this.maxStreak = Math.max(this.maxStreak, this.streak); this.flash = { type, pts, mult: this.mult, t: this.t }; this.event(type, { pts }); }
    fail(type = 'miss') { this.streak = 0; this.flash = { type, pts: 0, t: this.t }; this.event(type); }
    base() { return { t: this.t, score: this.score, streak: this.streak, mult: this.mult, flash: this.flash, done: this.done, hard: this.hard }; }
    finish(starsFor, value, finished = true) { return { missionId: this.r.missionId, metric: this.r.metric, value, score: this.score, streak: this.maxStreak, time: +this.t.toFixed(1), hard: this.hard, stars: !finished ? 0 : typeof starsFor === 'function' ? starsFor(this.r.missionId, value) : null, finished }; }
  }

  /* ---------------------------------------------------------------- Brick's bag (GOTR-0077: a real pendulum, hits decided at the glove) */
  // Brick holds the new heavy bag on his side, winds it up and shoves it; it swings to the Fighter as a chain-and-bag pendulum
  // (a double pendulum in the drill plane: chain from the swivel, the bag a rigid cylinder hanging from its ring; plus a sideways
  // swing and the swivel's spin). The call is the punch for the range the bag comes to (boxing ranges): it comes in a little =
  // Straight, further = Hook, right in = Uppercut. A press starts the punch; the glove travels along the rig's measured path and
  // the punch lands where and when the glove meets the leather (the bag reacts to that impulse at that moment), so a punch that
  // visibly touches counts and one that falls short never does. One punch per swing (mashing loses the swing). A wrong punch, a
  // short or a late one is a mistake, and Brick shoves the bag back at you: step back (left) or it hits you (a second mistake).
  // Frame: metres, the Fighter's root at x = 0 (before a step back) facing +x, y up, z sideways (lead hand at -z). The bag's
  // angles are + toward the Fighter. value = mistakes (adventure-progress.js heavy_bag_van thresholds 12 / 6 / 0).
  // Striking hand (joint) per punch phase .14, .18 ... .58 of the game rig in kit facing +x, thrown from the guard (story-scenes.js
  // PUNCH_OPT; measured inside the running trial with qa/gotr-0077/hands.cjs: the uppercut's path depends on the pose before it). The punch phase runs .14 + (t - press) * .8 / .38.
  const HANDS = Object.freeze({
    jab: [[.522, 1.764, -.128], [.522, 1.763, -.128], [.536, 1.759, -.129], [.58, 1.751, -.129], [.622, 1.752, -.126], [.809, 1.744, -.111], [.999, 1.736, -.092], [1.092, 1.732, -.082], [1.092, 1.732, -.082], [1.086, 1.732, -.082], [1.023, 1.735, -.088], [.88, 1.741, -.102]],
    cross: [[.478, 1.746, .129], [.478, 1.743, .129], [.499, 1.738, .125], [.567, 1.725, .105], [.654, 1.724, .073], [.765, 1.741, .051], [1.003, 1.734, .029], [1.12, 1.731, .019], [1.12, 1.731, .019], [1.113, 1.731, .02], [1.036, 1.733, .027], [.854, 1.739, .043]],
    hook: [[.458, 1.751, -.158], [.475, 1.726, -.211], [.418, 1.709, -.291], [.333, 1.694, -.377], [.352, 1.683, -.418], [.573, 1.675, -.32], [.722, 1.675, -.146], [.807, 1.675, .025], [.859, 1.675, .184], [.861, 1.675, .225], [.86, 1.675, .237], [.858, 1.675, .237]],
    rear_uppercut: [[.274, 1.229, .243], [.268, 1.153, .246], [.267, 1.122, .237], [.276, 1.153, .213], [.306, 1.231, .18], [.364, 1.337, .142], [.44, 1.447, .107], [.511, 1.539, .08], [.56, 1.603, .061], [.589, 1.64, .05], [.602, 1.662, .044], [.588, 1.678, .041]]
  });
  // the other hand during each punch (same phases): it rides up and forward a little, the bag must stay clear of it too
  const OTHER = Object.freeze({
    jab: [[.479, 1.75, .129], [.479, 1.749, .129], [.485, 1.747, .129], [.499, 1.743, .127], [.518, 1.739, .126], [.567, 1.731, .127], [.581, 1.712, .133], [.581, 1.706, .135], [.581, 1.706, .135], [.58, 1.707, .134], [.573, 1.717, .131], [.556, 1.733, .125]],
    cross: [[.521, 1.759, -.128], [.521, 1.757, -.128], [.527, 1.754, -.132], [.532, 1.752, -.147], [.554, 1.751, -.167], [.577, 1.725, -.197], [.575, 1.68, -.213], [.574, 1.667, -.214], [.574, 1.667, -.214], [.574, 1.67, -.213], [.57, 1.685, -.206], [.563, 1.726, -.186]],
    hook: [[.491, 1.718, .117], [.504, 1.696, .105], [.509, 1.69, .102], [.513, 1.691, .103], [.509, 1.714, .12], [.514, 1.741, .139], [.513, 1.748, .16], [.515, 1.714, .184], [.517, 1.68, .2], [.52, 1.661, .202], [.52, 1.661, .201], [.518, 1.662, .2]],
    rear_uppercut: [[.513, 1.631, -.032], [.511, 1.586, -.009], [.525, 1.599, -.034], [.542, 1.632, -.08], [.552, 1.669, -.127], [.55, 1.702, -.168], [.542, 1.727, -.196], [.535, 1.74, -.211], [.532, 1.745, -.216], [.532, 1.745, -.216], [.532, 1.745, -.215], [.533, 1.747, -.208]]
  });
  const GUARD = Object.freeze([[.527, 1.767, -.127], [.484, 1.753, .129]]); // both hands in the guard, same rig and frame
  const smooth01 = u => { u = clamp(u); return u * u * (3 - 2 * u); };
  const PH = Object.freeze({ start: .14, step: .04, rate: .8 / .38, land: .5 }); // a glove that has not met the leather by phase .5 has missed
  function handAt(move, ph, out = [0, 0, 0]) { const T = HANDS[move], u = clamp((ph - PH.start) / PH.step, 0, T.length - 1), i = Math.min(T.length - 2, Math.floor(u)), f = u - i; for (let k = 0; k < 3; k++) out[k] = lerp(T[i][k], T[i + 1][k], f); return out; }
  const BAG = Object.freeze({
    missionId: 'heavy_bag_van', metric: 'mistakes', swings: 16, seed: 77,
    // the bag (Bag break's new bag: radius, half height, ring above its centre), chain, swivel; Brick stands beyond it
    m: 36, r: .235, h: .575, d: .93, chain: .40, pivot: [1.65, 2.75, -.05], glove: .06, g: 9.81, damp: [.05, .5], brick: 2.72,
    impulse: { straight: 24, hook: 28, uppercut: 22 }, hit: { straight: [-1, 0, 0], hook: [-.82, 0, .57], uppercut: [-.64, .77, 0] }, // N s along the punch (+ = toward the Fighter)
    windup: [1.05, .55], release: [.42, .27], depth: [.2, .12], reach: { straight: .5, uppercut: .75 }, // depth: how far the leather comes inside the punch's path (an uppercut is close range)
    bite: { windup: .55, release: .3, depth: .12 },
    range: { straight: [0, 0], hook: [.22, 0], uppercut: [.3, -.12] }, // where the Fighter stands for the call (m toward the bag, m sideways): in for the Hook, in and to the left for the rear Uppercut (clear of his lead guard)
    perfect: .085, hold: .07, clear: .04, chest: [.2, 1.36], back: .42, step: .26, stay: .62, catchAfter: .25, dt: 1 / 120
  });
  /** The bag's physics, pure: state { a1, w1, a2, w2, p, wp, s, ws } = chain angle, bag angle (+ toward the Fighter, rad), their
   *  rates, the sideways swing and the swivel spin. Fixed step RK4 for the drill plane, damped linear modes sideways. */
  const bagPhysics = (R = BAG) => {
    const { m, d, g, h, r } = R, a = R.chain, Ic = m * (3 * r * r + 4 * h * h) / 12, L = a + d, Ip = m * L * L + Ic, Is = m * r * r / 2, wl = Math.sqrt(m * g * L / Ip);
    const acc = (a1, w1, a2, w2) => {
      const c = Math.cos(a1 - a2), s = Math.sin(a1 - a2), M11 = m * a * a, M12 = m * a * d * c, M22 = m * d * d + Ic;
      const f1 = -m * a * d * s * w2 * w2 - m * g * a * Math.sin(a1) - R.damp[0] * w1, f2 = m * a * d * s * w1 * w1 - m * g * d * Math.sin(a2) - R.damp[1] * (w2 - w1), det = M11 * M22 - M12 * M12;
      return [(f1 * M22 - M12 * f2) / det, (M11 * f2 - M12 * f1) / det];
    };
    function step(q, dt) {
      const k1 = acc(q.a1, q.w1, q.a2, q.w2), s2 = [q.a1 + q.w1 * dt / 2, q.w1 + k1[0] * dt / 2, q.a2 + q.w2 * dt / 2, q.w2 + k1[1] * dt / 2], k2 = acc(...s2);
      const s3 = [q.a1 + s2[1] * dt / 2, q.w1 + k2[0] * dt / 2, q.a2 + s2[3] * dt / 2, q.w2 + k2[1] * dt / 2], k3 = acc(...s3), s4 = [q.a1 + s3[1] * dt, q.w1 + k3[0] * dt, q.a2 + s3[3] * dt, q.w2 + k3[1] * dt], k4 = acc(...s4);
      const wp = (q.wp - wl * wl * q.p * dt) * (1 - .12 * dt), ws = q.ws * Math.exp(-1.1 * dt);
      return { a1: q.a1 + (q.w1 + 2 * s2[1] + 2 * s3[1] + s4[1]) * dt / 6, w1: q.w1 + (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * dt / 6, a2: q.a2 + (q.w2 + 2 * s2[3] + 2 * s3[3] + s4[3]) * dt / 6, w2: q.w2 + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * dt / 6, p: q.p + wp * dt, wp, s: q.s + ws * dt, ws };
    }
    /** Ring, axis direction (down the bag) and the sideways tilt; world-free (pivot from the rules). */
    function axis(q) { const P = R.pivot, ring = [P[0] - a * Math.sin(q.a1), P[1] - a * Math.cos(q.a1), P[2]], u = [-Math.sin(q.a2), -Math.cos(q.a2), 0]; return { ring, u, tilt: q.p }; }
    /** Distance from a point to the leather (negative = inside), the height along the bag (0 = centre) and the unit direction from the axis. */
    function leather(q, pt) {
      const { ring, u } = axis(q), P = R.pivot, cz = Math.sin(q.p) * (P[1] - pt[1]); // the sideways swing moves the bag along z (pivot fixed)
      const v = [pt[0] - ring[0], pt[1] - ring[1], pt[2] - ring[2] - cz], along = v[0] * u[0] + v[1] * u[1], y = d - along;
      const px = v[0] - along * u[0], py = v[1] - along * u[1], pz = v[2], dist = Math.hypot(px, py, pz) || 1e-9;
      const out = Math.max(0, Math.abs(y) - h); // above the top or below the bottom: distance to the rim
      return { gap: (out > 0 ? Math.hypot(Math.max(0, dist - r), out) : dist - r), y, dir: [px / dist, py / dist, pz / dist], inside: out === 0 };
    }
    /** Applies an impulse J (N s; x + toward the Fighter's side is -x in the world, so pass the drill-plane components) at a point
     *  `e` metres below the ring along the bag. Returns the new state. */
    function kick(q, J, e) {
      const c = Math.cos(q.a1 - q.a2), M11 = m * a * a, M12 = m * a * d * c, M22 = m * d * d + Ic, det = M11 * M22 - M12 * M12;
      const Q1 = J[0] * a * Math.cos(q.a1) + J[1] * a * Math.sin(q.a1), Q2 = J[0] * e * Math.cos(q.a2) + J[1] * e * Math.sin(q.a2);
      return { ...q, w1: q.w1 + (Q1 * M22 - M12 * Q2) / det, w2: q.w2 + (M11 * Q2 - M12 * Q1) / det, wp: q.wp + (J[2] || 0) * (a + e) / Ip, ws: q.ws + (J[2] || 0) * r / Is };
    }
    /** Velocity of the bag point `e` below the ring along the drill line (+ = toward the Fighter) and the effective mass there. */
    function pointVel(q, e) { const v = a * Math.cos(q.a1) * q.w1 + e * Math.cos(q.a2) * q.w2, c = Math.cos(q.a1 - q.a2), M11 = m * a * a, M12 = m * a * d * c, M22 = m * d * d + Ic, det = M11 * M22 - M12 * M12, j1 = a * Math.cos(q.a1), j2 = e * Math.cos(q.a2); return { v, mass: 1 / ((j1 * j1 * M22 - 2 * j1 * j2 * M12 + j2 * j2 * M11) / det) }; }
    const period = 2 * Math.PI * Math.sqrt(Ip / (m * g * L)); // small swings, rigid chain
    return { step, axis, leather, kick, pointVel, period, consts: { a, d, Ic, Ip, L } };
  };
  const SOLVED = new Map(); // swing key -> [release angle, shove]: solving costs a few ms, a phone would drop a frame at every catch
  class BagTrial extends Trial {
    constructor(rules = BAG, opts) {
      super(rules, opts); const R = rng(rules.seed + (this.hard ? 9 : 0));
      this.types = Array.from({ length: rules.swings }, (_, i) => i < 3 ? PUNCH[i] : PUNCH[Math.floor(R() * 3)]);
      this.phys = bagPhysics(rules); this.acts = 0; this.i = 0; this.mistakes = 0; this.hits = 0; this.dodged = 0; this.bitten = 0; this.straights = 0;
      this.q = { a1: -.2, w1: 0, a2: -.2, w2: 0, p: 0, wp: 0, s: 0, ws: 0 }; this.path = null; this.punch = null; this.dodge = null; this.events = [];
      this.call(0, -.2, true);
    }
    /** The Fighter's root offset along the drill line at time t (a step back and the step in again). */
    stanceAt(t, k) { const s = this.stance; return s ? lerp(s.from[k], s.to[k], smooth01((t - s.at) / this.r.step)) : 0; }
    stanceX(t) { return this.stanceAt(t, 0); }
    fighterZ(t) { return this.stanceAt(t, 1); }
    fighterX(t) { const d = this.dodge, r = this.r, st = this.stanceX(t); if (!d || t < d.at) return st; const u = t - d.at; return st - r.back * (u < r.step ? smooth01(u / r.step) : u < r.step + r.stay ? 1 : 1 - smooth01((u - r.step - r.stay) / r.step)); }
    /** Brick catches the bag (at `angle`) and starts the next swing: a call, or the bite after a mistake. */
    call(at, angle, first = false) {
      const r = this.r, i = this.i, bite = !!this.biteNext; this.biteNext = false;
      const u = i / (r.swings - 1), wind = (bite ? r.bite.windup : lerp(r.windup[0], r.windup[1], u) / this.k) + (first ? .35 : 0);
      const A0 = bite ? r.bite.release : lerp(r.release[0], r.release[1], u) * (this.hard ? .9 : 1), depth = bite ? r.bite.depth : lerp(r.depth[0], r.depth[1], u) * (this.hard ? .8 : 1) * (r.reach[this.types[i]] || 1);
      const stance = bite ? [0, 0] : r.range[this.types[i]] || [0, 0]; this.stance = { from: [this.stanceX(at), this.fighterZ(at)], to: stance, at };
      this.sw = { i, type: bite ? 'bite' : this.types[i], bite, stance, t0: at, from: angle, fromP: this.q.p, A0, release: at + wind, depth, state: 'hold', verdict: null };
      this.path = null; this.punch = null; this.q = { ...this.q, a1: angle, w1: 0, a2: angle, w2: 0, wp: 0, ws: 0 };
      this.plan(this.sw);
    }
    /** Solves the shove (release speed) that brings the leather `depth` inside the called punch's reach (or onto the chest for a
     *  bite), and predicts the free swing: apex time, the press window and the ideal press. */
    plan(sw) {
      const r = this.r, start = { a1: -sw.A0, w1: 0, a2: -sw.A0, w2: 0, p: 0, wp: 0, s: this.q.s, ws: 0 };
      // How the swing ends up, released from A0 with a shove of w0 rad/s, up to the top of the swing: > 0 while the leather stays
      // short of `depth` inside the called punch's path and clear of the guard; a bite comes `depth` into the guard or the chest.
      const fly = (A0, w0) => { let q = { ...start, a1: -A0, a2: -A0, w1: w0, w2: w0 }, reach = 9, body = 9; for (let n = 0; n < 400; n++) { q = this.phys.step(q, r.dt); body = Math.min(body, this.bodyGap(q, sw.stance[0], null, sw.bite ? null : this.moveFor(sw.type, true), sw.stance[1])); if (!sw.bite) reach = Math.min(reach, this.punchGap(q, sw.type, sw.stance[0], sw.stance[1])); if (q.w1 <= 0 && n > 4) break; } return sw.bite ? body + sw.depth : Math.min(reach + sw.depth, body - r.clear); };
      const SHOVE = .3, key = [sw.bite ? 'bite' : sw.type, sw.A0, sw.depth, sw.stance.join(), r.pivot, r.chain].join('|'), known = SOLVED.get(key); let lo, hi;
      if (known) [sw.A0, sw.w0] = known; // the same swing was solved before (each swing of a run, and every run, is the same physics)
      else if (fly(sw.A0, SHOVE) < 0) { lo = .02; hi = sw.A0; for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (fly(mid, SHOVE) < 0) hi = mid; else lo = mid; } sw.A0 = (lo + hi) / 2; sw.w0 = SHOVE; } // a short swing: he pulls it back less
      else { lo = SHOVE; hi = 6; for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (fly(sw.A0, mid) > 0) lo = mid; else hi = mid; } sw.w0 = (lo + hi) / 2; } // a long one: a harder shove
      if (!known) SOLVED.set(key, [sw.A0, sw.w0]);
      start.a1 = start.a2 = -sw.A0; sw.start = { ...start, w1: sw.w0, w2: sw.w0 };
      this.predict(sw.release, sw.start);
      let apex = null; for (let k = 1; k < this.path.q.length; k++) if (this.path.q[k].w1 <= 0 && this.path.q[k - 1].w1 > 0) { apex = this.path.t0 + k * r.dt; break; }
      sw.apex = apex ?? sw.release + .9; sw.flight = sw.apex - sw.release;
      if (!sw.bite) { // the press window: every press whose glove meets the leather while the punch is still going out
        const move = this.moveFor(sw.type, true); let open = null, close = null, due = null, bestD = 9;
        const probe = tp => { const c = this.contact(move, tp); if (!c) return; if (open == null || tp < open) open = tp; if (close == null || tp > close) close = tp; const dd = Math.abs(c.t - sw.apex); if (dd < bestD) { bestD = dd; due = tp; } };
        for (let tp = sw.release - .3; tp < sw.apex + .6; tp += r.dt * 3) probe(tp); // coarse, then fine around the edges and the best press
        if (open != null) for (const c0 of [open, close, due]) for (let k = -3; k <= 3; k++) probe(c0 + k * r.dt);
        sw.open = open; sw.close = close; sw.due = due ?? sw.apex - .12;
      } else { sw.due = sw.apex - .25; sw.open = sw.release; sw.close = sw.apex; }
    }
    /** Integrates the bag from (t0, q) for the next 3 s (the prediction the rules and the picture share). */
    predict(t0, q) { const list = [q]; for (let k = 0; k < 360; k++) list.push(q = this.phys.step(q, this.r.dt)); this.path = { t0, q: list }; }
    /** Bag state at time t: Brick's hands, or the predicted swing. */
    bagAt(t) {
      const sw = this.sw;
      if (!this.path || (sw && t < sw.release)) { // held by Brick: from where he caught it to the wind-up angle
        const u = sw ? smooth01((t - sw.t0) / Math.max(.05, sw.release - sw.t0)) : 0, a = sw ? lerp(sw.from, -sw.A0, u) : this.q.a1;
        return { ...this.q, a1: a, w1: 0, a2: a, w2: 0, p: sw ? lerp(sw.fromP, 0, u) : 0, wp: 0, ws: 0 };
      }
      const P = this.path, u = Math.max(0, t - P.t0) / this.r.dt, i = Math.min(P.q.length - 2, Math.floor(u)), f = clamp(u - i), A = P.q[i], B = P.q[i + 1], o = {};
      for (const k in A) o[k] = lerp(A[k], B[k], f); return o;
    }
    moveFor(type, peek = false) { if (type === 'uppercut') return 'rear_uppercut'; if (type !== 'straight') return type; const n = peek ? this.straights : this.straights++; return n % 2 ? 'cross' : 'jab'; }
    /** How far inside the called punch's path the leather comes at state q (negative = the glove would sink in). */
    punchGap(q, type, fx = 0, fz = 0) { const move = type === 'straight' ? 'jab' : this.moveFor(type, true), hp = [0, 0, 0]; let best = 9; handAt(move, .46, hp); hp[0] += fx; hp[2] += fz; if (this.phys.leather(q, hp).gap > .6) return 9; for (let ph = .3; ph <= PH.land + 1e-9; ph += .02) { handAt(move, ph, hp); hp[0] += fx; hp[2] += fz; best = Math.min(best, this.phys.leather(q, hp).gap - this.r.glove); } return best; }
    /** The Fighter's body points the bag can run into (both guard gloves, the chest), shifted by a step back. */
    bodyPoints(fx, move, fz = 0) { const r = this.r, pts = [[fx + r.chest[0], r.chest[1], fz, 0], ...GUARD.map(g => [fx + g[0], g[1], fz + g[2], r.glove])]; if (move) for (const o of OTHER[move].slice(5, 9)) pts.push([fx + o[0], o[1], fz + o[2], r.glove]); return pts; }
    /** Gap between the leather and the Fighter's guard or chest (negative = the bag is in him); with the point it would meet. */
    bodyGap(q, fx, out, move, fz = 0) { let best = 9; for (const b of this.bodyPoints(fx, move, fz)) { const L = this.phys.leather(q, b); if (!L.inside) continue; const gp = L.gap - b[3]; if (gp < best) { best = gp; if (out) { out.e = this.r.d - L.y; out.pt = b; } } } return best; }
    /** Where and when a punch pressed at tp meets the leather on the predicted swing (null: it falls short / goes past). */
    contact(move, tp) {
      const r = this.r, hp = [0, 0, 0], at = tau => { const t = tp + tau, ph = PH.start + tau * PH.rate; handAt(move, ph, hp); hp[0] += this.fighterX(t); hp[2] += this.fighterZ(t); const L = this.phys.leather(this.bagAt(t), hp); return { t, ph, tau, L, on: L.gap <= r.glove && L.y < r.h + r.glove }; }; // the side or the bottom of the bag (an uppercut from below), not the straps above it
      const h = r.dt / 2; if (at(0).on) return null; // the bag is already on the glove: no room to punch (a jam, not a hit)
      for (let tau = h; ; tau += h) {
        if (PH.start + tau * PH.rate > PH.land) return null;
        if (!at(tau).on) continue;
        let lo = tau - h, hi = tau; for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2; if (at(mid).on) hi = mid; else lo = mid; } // the glove moves ~4 cm per step: find where it meets the leather
        const c = at(hi); return { t: c.t, ph: c.ph, tau: hi, y: c.L.y, dir: c.L.dir, e: r.d - clamp(c.L.y, -r.h, r.h), hand: hp.slice() };
      }
    }
    key(k, down) {
      const sw = this.sw; if (this.done || !down || !sw) return;
      if (k === 'left') { if (!this.dodge || this.t > this.dodge.at + this.r.step * 2 + this.r.stay) { if (this.punch && !this.punch.over) return; this.dodge = { at: this.t }; this.event('step'); } return; }
      if (!isPunch(k) || this.punch || sw.verdict || sw.bite || this.t < sw.t0) return; // one punch per swing
      if (this.dodge && this.fighterX(this.t) < -.02) return; // stepping: no punch
      const move = this.moveFor(k), c = this.contact(move, this.t);
      this.punch = { k, move, at: this.t, n: ++this.acts, contact: c, ends: c ? c.t + this.r.hold + .22 : this.t + .38, over: false };
      if (!c) this.punch.missAt = this.t + (PH.land - PH.start) / PH.rate; // the glove reaches the end of its path: a miss, judged there
    }
    /** The glove reached the leather: the bag takes the punch's impulse at that point, the verdict is given. */
    land(p) {
      const sw = this.sw, r = this.r, c = p.contact, J = r.impulse[p.k], dir = r.hit[p.k];
      this.q = this.bagAt(c.t); this.q = this.phys.kick(this.q, [dir[0] * J, dir[1] * J, dir[2] * J], c.e); this.predict(c.t, this.q);
      if (p.k !== sw.type) { this.miss('wrong'); return; }
      const d = Math.abs(c.t - sw.apex), perfect = d <= r.perfect; this.hits++; sw.verdict = 'hit'; sw.verdictAt = this.t; this.gain(perfect ? 150 : 100, perfect ? 'perfect' : 'hit');
    }
    miss(type) { const sw = this.sw; sw.verdict = type; sw.verdictAt = this.t; this.mistakes++; this.fail(type); this.biteNext = true; }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); const t1 = this.t + dt, sw = this.sw, r = this.r;
      // events inside this step, in time order: the release, the glove on the leather, a punch that ran out, the bag on the chest
      if (sw.state === 'hold' && t1 >= sw.release) sw.state = 'swing';
      const p = this.punch;
      if (p && !p.over && p.contact && t1 >= p.contact.t) { this.t = p.contact.t; this.land(p); p.over = true; }
      else if (p && !p.over && !p.contact && t1 >= p.missAt) { this.t = p.missAt; p.over = true; if (p.k !== sw.type) this.miss('wrong'); else this.miss(this.t < sw.apex ? 'early' : 'late'); }
      this.t = t1;
      if (sw.state === 'swing' && !sw.verdict && !sw.bite && !(p && !p.over) && this.t > (sw.close ?? sw.apex) + .02) this.miss('late');
      // the bite: the bag swings into the guard unless the Fighter stepped back
      if (sw.bite && sw.state === 'swing' && !sw.verdict) {
        const q = this.bagAt(this.t), at = {}, gap = this.bodyGap(q, this.fighterX(this.t), at, null, this.fighterZ(this.t));
        if (gap <= 0) { const e = at.e, pv = this.phys.pointVel(q, e);
          if (pv.v > 0) { this.q = this.phys.kick(q, [-1.35 * pv.v * pv.mass, 0, 0], e); this.predict(this.t, this.q); } sw.verdict = 'bagged'; sw.verdictAt = this.t; this.bitten++; this.mistakes++; this.fail('bagged'); }
        else if (this.t > sw.apex + .05) { sw.verdict = 'dodge'; sw.verdictAt = this.t; this.dodged++; this.flash = { type: 'dodge', pts: 0, t: this.t }; this.event('dodge'); }
      }
      // Brick catches the bag at the end of its swing back to him and starts the next one
      if (sw.state === 'swing' && sw.verdict && (!p || p.over || this.t > p.ends)) {
        const q = this.bagAt(this.t), prev = this.bagAt(this.t - r.dt);
        const caught = this.hard ? q.a1 < -.14 && q.w1 < 0 : q.a1 < -.05 && q.w1 >= 0 && prev.w1 < 0; // hard: Brick meets it on the way back instead of waiting for the end of the swing
        if ((caught && this.t - sw.verdictAt > r.catchAfter) || this.t - sw.verdictAt > 3) {
          this.q = q; if (!this.biteNext) { this.i++; if (this.i >= r.swings) { this.done = true; this.sw = { ...sw, state: 'end' }; this.event('end'); return this; } }
          this.call(this.t, q.a1);
        }
      }
      if (this.punch?.over && this.t > this.punch.ends) this.punch = null;
      return this;
    }
    view() {
      const sw = this.sw, r = this.r, v = this.base(), q = this.bagAt(this.t), fx = this.fighterX(this.t), fz = this.fighterZ(this.t), p = this.punch;
      const dodge = this.dodge && this.t - this.dodge.at < r.step * 2 + r.stay ? { u: this.t - this.dodge.at, x: fx } : null, st = this.stance;
      const stepIn = st && this.t - st.at < r.step && Math.hypot(st.to[0] - st.from[0], st.to[1] - st.from[1]) > .01 ? { u: (this.t - st.at) / r.step, delta: st.to[0] - st.from[0], dz: st.to[1] - st.from[1] } : null; // footwork to the call's range
      if (!sw || sw.state === 'end' || this.done) return { ...v, phase: 'end', i: this.i, total: r.swings, mistakes: this.mistakes, hits: this.hits, prompt: null, progress: 1, bag: q, fx, fz, punch: p, dodge, stepIn };
      const live = !sw.verdict && !sw.bite, open = live && !p && sw.open != null && this.t >= sw.open && this.t <= sw.close;
      const k = sw.verdict ? 1 : this.t < sw.release ? 0 : clamp((this.t - sw.release) / Math.max(.05, sw.due - sw.release));
      const phase = sw.bite ? (sw.verdict ? 'back' : 'bite') : sw.verdict === 'hit' ? 'hit' : sw.verdict ? 'missed' : sw.state;
      return { ...v, phase, type: sw.bite ? null : sw.type, bite: sw.bite, hold: sw.state === 'hold', k, open, due: sw.due, apex: sw.apex, release: sw.release, i: this.i, total: r.swings, mistakes: this.mistakes, hits: this.hits, progress: this.i / r.swings,
        prompt: sw.bite ? (sw.verdict ? null : 'back') : live ? sw.type : null, bag: q, fx, fz, punch: p, dodge, stepIn, verdict: sw.verdict, depth: sw.depth };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.mistakes, this.i >= this.r.swings), hits: this.hits, dodged: this.dodged, bitten: this.bitten }; }
  }

  /* ---------------------------------------------------------------- Sleep talker */
  const ECHO = Object.freeze({ missionId: 'snoring_guard', metric: 'dodges', lengths: [2, 2, 3, 3, 4, 4, 5, 5, 6], show: .6, gap: .16, limit: 2.0, lives: 3, wake: .85, dodge: .45, rest: .7, seed: 31 });
  class EchoTrial extends Trial {
    constructor(rules = ECHO, opts) { super(rules, opts); this.R = rng(rules.seed + (this.hard ? 5 : 0)); this.round = 0; this.lives = rules.lives; this.ducked = 0; this.deal(.6); }
    deal(delay) { const n = this.r.lengths[this.round]; this.seq = Array.from({ length: n }, () => PUNCH[Math.floor(this.R() * 3)]); this.idx = 0; this.phase = 'rest'; this.until = this.t + delay; this.dodgeAt = -9; }
    get showStep() { return (this.r.show + this.r.gap) / this.k; }
    wakeUp(why) { this.fail(why); this.phase = 'wake'; this.t0 = this.t; this.until = this.t + this.r.wake / this.k; this.dodgeAt = -9; }
    key(k, down) {
      if (this.done || !down) return;
      if (this.phase === 'wake') { if (k === 'down') this.dodgeAt = this.t; return; }
      if (this.phase !== 'input' || !isPunch(k)) return;
      if (k !== this.seq[this.idx]) { this.wakeUp('wrong'); return; }
      this.idx++; this.deadline = this.t + this.r.limit / this.k;
      if (this.idx < this.seq.length) { this.flash = { type: 'note', pts: 0, t: this.t }; return; }
      this.gain(100 * this.seq.length, 'combo'); this.round++;
      if (this.round >= this.r.lengths.length) { this.done = true; this.event('end'); } else this.deal(this.r.rest);
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt;
      if (this.phase === 'rest' && this.t >= this.until) { this.phase = 'show'; this.t0 = this.t; }
      else if (this.phase === 'show' && this.t >= this.t0 + this.seq.length * this.showStep) { this.phase = 'input'; this.deadline = this.t + this.r.limit / this.k; }
      else if (this.phase === 'input' && this.t >= this.deadline) this.wakeUp('faded');
      else if (this.phase === 'wake' && this.t >= this.until) { // the pillow arrives
        if (this.t - this.dodgeAt <= this.r.dodge) { this.ducked++; this.flash = { type: 'dodge', pts: 0, t: this.t }; this.event('dodge'); } else { this.lives--; this.flash = { type: 'bagged', pts: 0, t: this.t }; this.event('pillow'); }
        if (this.lives <= 0) { this.done = true; this.event('end'); } else this.deal(this.r.rest);
      }
      return this;
    }
    view() {
      const r = this.r, show = this.phase === 'show' ? (this.t - this.t0) / this.showStep : -1, lit = show >= 0 && show % 1 < r.show / (r.show + r.gap) ? Math.floor(show) : -1;
      return { ...this.base(), phase: this.phase, seq: this.seq, lit, litType: lit >= 0 ? this.seq[lit] : null, idx: this.idx, round: this.round, rounds: r.lengths.length, lives: this.lives, progress: this.round / r.lengths.length,
        fade: this.phase === 'input' ? clamp((this.deadline - this.t) / (r.limit / this.k)) : 1, wake: this.phase === 'wake' ? clamp((this.t - this.t0) / (r.wake / this.k)) : 0,
        prompt: this.phase === 'wake' ? 'down' : this.phase === 'input' ? 'repeat' : this.phase === 'show' ? 'watch' : null };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.round), lives: this.lives, rounds: this.round }; }
  }

  /* ---------------------------------------------------------------- Rooftop barrage */
  const BARRAGE = Object.freeze({ missionId: 'rooftop_balloons', metric: 'dodges', count: 20, flight: [1.5, .8], gap: .5, max: 12, dodge: .46, reflect: [.78, .98], keys: { head: 'left', low: 'down', wide: 'right' }, seed: 12 });
  class BarrageTrial extends Trial {
    constructor(rules = BARRAGE, opts) {
      super(rules, opts); const R = rng(rules.seed + (this.hard ? 3 : 0)), kinds = ['head', 'low', 'wide'];
      this.list = Array.from({ length: rules.count }, (_, i) => ({ kind: i < 3 ? kinds[i] : kinds[Math.floor(R() * 3)], marked: i > 1 && R() < .4, from: Math.floor(R() * 3) }));
      this.i = 0; this.clean = 0; this.hits = 0; this.reflected = 0; this.dodge = null; this.launch(.8);
    }
    launch(at) { const b = this.list[this.i]; this.b = { ...b, t0: at, land: at + lerp(this.r.flight[0], this.r.flight[1], this.i / (this.r.count - 1)) / this.k, state: 'fly' }; }
    key(k, down) {
      const b = this.b; if (this.done || !down || !b || this.t < b.t0 || b.state !== 'fly' && b.state !== 'whiff') return;
      if (k === 'straight' && b.state === 'fly') {
        const u = (this.t - b.t0) / (b.land - b.t0);
        if (b.marked && u >= this.r.reflect[0] && u <= this.r.reflect[1]) { this.reflected++; this.clean++; this.gain(300, 'reflect'); b.state = 'back'; b.until = this.t + .35; }
        else { b.state = 'whiff'; this.flash = { type: 'early', pts: 0, t: this.t }; } // swung at air: this one will land
      } else if (['left', 'down', 'right'].includes(k) && b.state === 'fly' && !(this.dodge && this.t < this.dodge.until)) this.dodge = { key: k, t0: this.t, until: this.t + this.r.dodge };
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt; const b = this.b;
      if (b.state === 'back') { if (this.t >= b.until) this.advance(); }
      else if (this.t >= b.land) {
        const ok = b.state === 'fly' && this.dodge && this.dodge.key === this.r.keys[b.kind] && this.t < this.dodge.until && this.dodge.t0 >= b.t0;
        if (ok) { this.clean++; this.gain(100, 'dodge'); } else { this.hits++; this.fail('splash'); }
        this.advance();
      }
      return this;
    }
    advance() { this.i++; if (this.i >= this.r.count) { this.done = true; this.b = null; this.event('end'); } else this.launch(this.t + this.r.gap / this.k); }
    view() {
      const b = this.b, dodging = this.dodge && this.t < this.dodge.until;
      const u = b ? clamp((this.t - b.t0) / (b.land - b.t0)) : 0, flying = b && this.t >= b.t0;
      return { ...this.base(), balloon: flying ? { kind: b.kind, marked: b.marked, from: b.from, k: u, state: b.state, back: b.state === 'back' ? clamp(1 - (b.until - this.t) / .35) : 0 } : null, i: this.i, total: this.r.count, clean: this.clean, hits: this.hits, reflected: this.reflected, progress: this.i / this.r.count,
        dodge: dodging ? { key: this.dodge.key, k: clamp((this.t - this.dodge.t0) / this.r.dodge) } : null, canReflect: !!(flying && b.marked && b.state === 'fly' && u >= this.r.reflect[0] && u <= this.r.reflect[1]),
        prompt: flying && b.state === 'fly' ? this.r.keys[b.kind] : null, bonus: !!(flying && b.marked && b.state === 'fly') };
    }
    /** Recorded value: 12 minus the balloons that landed (a flawless barrage is gold). */
    result(starsFor) { return { ...this.finish(starsFor, Math.max(0, this.r.max - this.hits), this.i >= this.r.count), clean: this.clean, hits: this.hits, reflected: this.reflected }; }
  }

  /* ---------------------------------------------------------------- Cut him off */
  // A 7 x 5 grid in the alley. Column 0 is a dead end, the raccoon escapes past column 6. He only steps to cells out of the
  // Fighter's reach (not next to him, diagonals count), so staying level with him and stepping in takes his angles away.
  const CUTOFF = Object.freeze({ missionId: 'whistle_chase', metric: 'secondsToFinish', cols: 7, rows: 5, catches: 5, beat: [.5, .44, .38, .34, .3], move: .15, escape: 5, timeout: 60, starts: [[3, 2], [4, 0], [3, 4], [4, 1], [4, 3]], seed: 5 });
  class CutoffTrial extends Trial {
    constructor(rules = CUTOFF, opts) { super(rules, opts); this.R = rng(rules.seed); this.catches = 0; this.escapes = 0; this.place(); }
    place() { const [c, r] = this.r.starts[this.catches % this.r.starts.length]; this.rc = { c, r, fc: c, fr: r, t0: this.t }; this.f = { c: 6, r: 2, fc: 6, fr: 2, t0: this.t }; this.nextBeat = this.t + .9; this.ready = 0; }
    reach(c, r, f = this.f) { return Math.max(Math.abs(c - f.c), Math.abs(r - f.r)) <= 1; }
    key(k, down) {
      if (this.done || !down || this.t < this.ready) return;
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[k]; if (!d) return;
      const c = this.f.c + d[0], r = this.f.r + d[1]; if (c < 0 || c >= this.r.cols || r < 0 || r >= this.r.rows || (c === this.rc.c && r === this.rc.r)) return;
      this.f = { c, r, fc: this.f.c, fr: this.f.r, t0: this.t }; this.ready = this.t + this.r.move;
    }
    /** The raccoon's options: neighbouring cells (or the way out past the last column) that are out of the Fighter's reach. */
    options() {
      const { c, r } = this.rc, out = [];
      for (const [dc, dr] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) { const nc = c + dc, nr = r + dr; if (nr < 0 || nr >= this.r.rows || nc < 0) continue; if (nc >= this.r.cols) { out.push({ c: nc, r: nr, exit: true, score: 99 }); continue; } if (!this.reach(nc, nr)) out.push({ c: nc, r: nr, score: nc * 2 + Math.abs(nr - this.f.r) + this.R() * .5 }); }
      return out;
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt;
      if (this.t >= this.nextBeat) {
        const o = this.options().sort((a, b) => b.score - a.score)[0];
        if (!o) { this.catches++; this.gain(300, 'catch'); if (this.catches >= this.r.catches) { this.done = true; this.event('end'); } else this.place(); }
        else if (o.exit) { this.escapes++; this.t += this.r.escape; this.fail('escape'); this.place(); }
        else { this.rc = { c: o.c, r: o.r, fc: this.rc.c, fr: this.rc.r, t0: this.t }; this.nextBeat = this.t + this.r.beat[Math.min(this.catches, this.r.beat.length - 1)] / this.k; }
      }
      if (this.t >= this.r.timeout && !this.done) { this.done = true; this.event('timeout'); }
      return this;
    }
    view() {
      const mv = (p, d) => { const k = clamp((this.t - p.t0) / d); return { c: lerp(p.fc, p.c, k), r: lerp(p.fr, p.r, k), k, moving: k < 1 }; };
      return { ...this.base(), f: mv(this.f, this.r.move), rc: mv(this.rc, .22), cell: { f: [this.f.c, this.f.r], rc: [this.rc.c, this.rc.r] }, catches: this.catches, need: this.r.catches, escapes: this.escapes, options: this.options().length, left: Math.max(0, this.r.timeout - this.t), progress: this.catches / this.r.catches, prompt: null };
    }
    result(starsFor) { return { ...this.finish(starsFor, +this.t.toFixed(1), this.catches >= this.r.catches), catches: this.catches, escapes: this.escapes }; }
  }

  /* ---------------------------------------------------------------- The hustler's bet */
  const BET = Object.freeze({ missionId: 'grandma_groceries', metric: 'dodges', opens: 14, feints: 14, open: [.62, .38], feint: .3, idle: [.55, 1.0], bites: 3, offerAt: 4, offer: 5, bonusOpen: .3, max: 12, seed: 41 });
  class BetTrial extends Trial {
    constructor(rules = BET, opts) {
      super(rules, opts); const R = this.R = rng(rules.seed + (this.hard ? 7 : 0)), ev = [...Array(rules.opens).fill('open'), ...Array(rules.feints).fill('feint')];
      for (let i = ev.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ev[i], ev[j]] = [ev[j], ev[i]]; }
      if (ev[0] === 'open') { const j = ev.indexOf('feint'); [ev[0], ev[j]] = [ev[j], ev[0]]; } // he always opens with a feint
      this.events = ev; this.i = 0; this.hits = 0; this.bites = 0; this.opened = 0; this.stage = 'main'; this.idle(.9);
    }
    idle(d) { this.phase = 'idle'; this.until = this.t + d; }
    tell() {
      const kind = this.events[this.i], r = this.r; this.phase = kind; this.t0 = this.t; this.punished = false;
      this.until = this.t + (kind === 'feint' ? r.feint : this.stage === 'bonus' ? r.bonusOpen : lerp(r.open[0], r.open[1], this.opened / (r.opens - 1))) / this.k; if (kind === 'open') this.opened++;
    }
    get value() { return Math.min(this.r.max, this.hits); }
    key(k, down) {
      if (this.done || !down) return;
      if (this.phase === 'offer') { if (k === 'up') { this.stage = 'bonus'; this.events = ['feint', 'feint', 'feint', 'open']; this.i = 0; this.idle(.7); this.event('double'); } else if (k === 'down') { this.done = true; this.event('end'); } return; }
      if (!isPunch(k)) return;
      if (this.phase === 'open' && !this.punished) { this.punished = true; if (this.stage === 'bonus') { this.hits = Math.min(this.r.max, this.hits + 2); this.score *= 2; this.flash = { type: 'double', pts: this.score, t: this.t }; this.done = true; this.event('end'); } else { this.hits++; this.gain(150, 'hit'); } }
      else if (this.phase !== 'open') { // bit on a feint, or swung at nothing
        if (this.stage === 'bonus') { this.lose(); return; }
        this.bites++; this.fail('bite'); if (this.bites >= this.r.bites) { this.done = true; this.event('end'); }
      }
    }
    lose() { this.hits = Math.floor(this.hits / 2); this.score = 0; this.fail('bust'); this.done = true; this.event('end'); }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt;
      if (this.t < this.until) return this;
      if (this.phase === 'idle') this.tell();
      else if (this.phase === 'offer') { this.done = true; this.event('end'); }
      else {
        if (this.stage === 'bonus' && this.phase === 'open' && !this.punished) { this.lose(); return this; }
        this.i++;
        if (this.i < this.events.length) this.idle(lerp(this.r.idle[0], this.r.idle[1], this.R()) / this.k);
        else if (this.stage === 'main' && this.hits >= this.r.offerAt) { this.phase = 'offer'; this.until = this.t + this.r.offer; }
        else { this.done = true; this.event('end'); }
      }
      return this;
    }
    view() {
      const k = this.phase === 'idle' || this.phase === 'offer' ? 0 : clamp((this.t - this.t0) / (this.until - this.t0));
      return { ...this.base(), phase: this.phase, stage: this.stage, k, hits: this.hits, bites: this.bites, maxBites: this.r.bites, left: this.events.length - this.i, progress: this.stage === 'bonus' ? 1 : this.i / this.events.length, punished: !!this.punished, prompt: this.phase === 'offer' ? 'offer' : null };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.value), hits: this.hits, bites: this.bites, doubled: this.stage === 'bonus' }; }
  }

  /* ---------------------------------------------------------------- Two-sided bag drill (Chapter 1 beat 8, GOTR-0106) */
  // "Other side's mine! You hit, I hit." Mack hits the new bag from his side; it swings to the Fighter, who hits it back at the top
  // of the swing with the punch Mack calls. One cycle = Mack's hit + the Fighter's answer. The tempo rises; after `doubleFrom`
  // cycles some calls are a double (the same punch twice, the second `doubleGap` after the first). A miss breaks the streak and
  // the bag swings on to Mack, who keeps the rhythm. value = landed (bag hits on the beat): adventure-progress.js bag_drill
  // thresholds 15 / 25 / 35.
  const DUO = Object.freeze({ missionId: 'bag_drill', metric: 'landed', time: 40, period: [1.55, .94], window: .24, perfect: .085, doubleFrom: 8, doubleEvery: 2, doubleGap: .34, doubleWindow: .17, contact: .1, seed: 53 }); // contact: s from the press to glove on leather (punch phase .14 -> .375 of .38 s)
  class DuoTrial extends Trial {
    constructor(rules = DUO, opts) { super(rules, opts); this.R = rng(rules.seed + (this.hard ? 7 : 0)); this.cycle = 0; this.landed = 0; this.misses = 0; this.perfects = 0; this.start(.9); }
    period() { return lerp(this.r.period[0], this.r.period[1], clamp(this.t / this.r.time)) / this.k; }
    start(at) { // Mack hits at `at`; the bag reaches the Fighter half a period later
      const half = this.period() / 2, dbl = this.cycle >= this.r.doubleFrom && this.cycle % this.r.doubleEvery === 0;
      const type = this.cycle < 3 ? PUNCH[this.cycle] : PUNCH[Math.floor(this.R() * 3)];
      this.c = { type, mack: at, peak: at + half, back: at + half * 2, hits: 0, need: dbl ? 2 : 1, state: 'mack', second: dbl ? at + half + this.r.doubleGap / this.k : null };
    }
    get due() { const c = this.c; return c.hits === 0 ? c.peak : c.second; }
    get win() { return this.c.hits === 0 ? this.r.window : this.r.doubleWindow; }
    key(k, down) {
      const c = this.c; if (this.done || !down || !c || !isPunch(k) || this.t < c.mack) return;
      if (c.state === 'missed' || c.hits >= c.need) return; // the swing is lost or already answered: wait for Mack
      const d = Math.abs(this.t - this.due);
      if (k === c.type && d <= this.win) {
        c.hits++; this.landed++; const perfect = d <= this.r.perfect; if (perfect) this.perfects++;
        this.gain(perfect ? 150 : 100, perfect ? 'perfect' : 'hit'); c.state = c.hits >= c.need ? 'answered' : 'toward';
        if (c.hits >= c.need) { c.answered = this.t + this.r.contact; c.back = c.answered + this.period() / 2; } // the bag flies back to Mack once the glove lands
      } else { c.state = 'missed'; this.misses++; this.fail(k !== c.type ? 'wrong' : this.t < this.due ? 'early' : 'late'); }
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt; const c = this.c;
      if (c.state === 'mack' && this.t >= c.mack) c.state = 'toward';
      if (c.state === 'toward' && this.t > this.due + this.win) { c.state = 'missed'; this.misses++; this.fail('late'); }
      if (this.t >= c.back) { // the bag is back on Mack's side: his next hit, or the end of the drill
        this.cycle++;
        if (this.t >= this.r.time) { this.done = true; this.c = { ...c, state: 'end' }; this.event('end'); }
        else this.start(this.t);
      }
      return this;
    }
    view() {
      const c = this.c, v = this.base(), r = this.r;
      if (!c || this.done) return { ...v, phase: 'end', landed: this.landed, misses: this.misses, left: 0, progress: 1, prompt: null };
      // bag angle along the drill line: +1 = at Mack's side (just hit), -1 = at the top of the swing toward the Fighter
      let swing;
      if (c.state === 'answered') swing = this.t < c.answered ? -1 : -Math.cos(Math.PI * clamp((this.t - c.answered) / (c.back - c.answered))); // held at the top until the glove lands
      else if (this.t < c.peak) swing = Math.cos(Math.PI * clamp((this.t - c.mack) / (c.peak - c.mack)));
      else swing = c.state === 'missed' || c.hits < c.need ? -Math.cos(Math.PI * clamp((this.t - c.peak) / (c.back - c.peak))) : -1;
      const open = (c.state === 'toward') && Math.abs(this.t - this.due) <= this.win;
      return { ...v, phase: c.state, type: c.type, need: c.need, hits: c.hits, double: c.need > 1, swing, k: clamp((this.t - c.mack) / Math.max(.01, this.due - c.mack)), open,
        landed: this.landed, misses: this.misses, perfects: this.perfects, cycle: this.cycle, left: Math.max(0, r.time - this.t), progress: clamp(this.t / r.time),
        mackHit: this.t >= c.mack && this.t - c.mack < .3, mackAge: this.t - c.mack, mackPhase: this.t >= c.mack && this.t - c.mack < .3 ? .375 - clamp((this.t - c.mack - .05) / .25) * .235 : c.back - this.t < .1 && c.state !== 'toward' && c.state !== 'mack' ? .14 + (1 - clamp((c.back - this.t) / .1)) * .235 : null, prompt: c.state === 'toward' || c.state === 'mack' ? c.type : null };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.landed), landed: this.landed, misses: this.misses, perfects: this.perfects }; }
  }

  const api = { PUNCH, rng, Trial, BAG, BagTrial, HANDS, OTHER, GUARD, PH, handAt, bagPhysics, ECHO, EchoTrial, BARRAGE, BarrageTrial, CUTOFF, CutoffTrial, BET, BetTrial, DUO, DuoTrial };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryTrials = api;
})();
