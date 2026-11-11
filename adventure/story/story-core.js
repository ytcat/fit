/* Story sets, pure part (GOTR-0056 presentation layers 2 + 3, docs/adventure/STORY.md "How the story is shown").
 * Timeline sampling for short scripted scenes, the Chapter 1 scene scripts (EN/HE/RU lines) and the rules of the
 * "carry the heavy bag" on-rails mini-game. No DOM, no three.js: used by adventure/story/story-scenes.js in the
 * browser (window.StoryCore) and by tests/story-scenes.test.cjs in node. World units are metres, y up, rigs face +z. */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const EASE = { linear: t => clamp(t), smooth, in: t => { t = clamp(t); return t * t; }, out: t => { t = clamp(t); return 1 - (1 - t) * (1 - t); } };
  const L = (en, he, ru) => ({ en, he, ru });
  const STEP = .42; // metres per walk cycle (both feet), used for the procedural step phase

  /** The key segment around time t: a, b, eased k (0..1) and raw progress. Keys are sorted by t. */
  function segment(keys, t, ease = 'smooth') {
    if (!keys?.length) return null;
    if (t <= keys[0].t) return { a: keys[0], b: keys[0], k: 0, raw: 0, i: 0 };
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b.t) { const raw = (t - a.t) / Math.max(1e-6, b.t - a.t); return { a, b, k: (EASE[b.ease || ease] || smooth)(raw), raw, i }; }
    }
    const z = keys[keys.length - 1]; return { a: z, b: z, k: 1, raw: 1, i: keys.length - 1 };
  }
  const mix = (p, q, k) => p.map((v, i) => lerp(v, q[i], k));
  /** Camera at time t: { pos, look }. Reduced motion: no dolly or pan, the camera cuts to each key at its time. */
  function camera(keys, t, reduced = false) {
    const s = segment(keys, t); if (!s) return null;
    const k = reduced ? (s.raw >= 1 ? 1 : 0) : s.k;
    return { pos: mix(s.a.pos, s.b.pos, k), look: mix(s.a.look, s.b.look, k), cut: reduced };
  }
  /** Generic numeric prop track: keys { t, v: [..] }. */
  function prop(keys, t) { const s = segment(keys, t); return s ? mix(s.a.v, s.b.v, s.k) : null; }
  const angleTo = (x, z, p) => Math.atan2(p[0] - x, p[1] - z);
  /** Actor at time t. Keys: { t, x, z, act, face (radians or [x, z] point) }. Moving between keys = walking at constant
   * speed (linear); the act of the latest key holds. Returns { x, z, ry, act, actT, walking, dist, stepPhase }. */
  function actor(keys, t) {
    if (!keys?.length) return null;
    let dist = 0, act = keys[0].act || 'idle', actStart = keys[0].t, face = keys[0].face ?? 0;
    for (let i = 0; i < keys.length; i++) {
      const a = keys[i]; if (a.t > t) break;
      if (a.act && a.act !== act) { act = a.act; actStart = a.t; }
      if (a.face != null) face = a.face;
      const b = keys[i + 1]; if (b) dist += Math.hypot(b.x - a.x, b.z - a.z) * clamp((t - a.t) / Math.max(1e-6, b.t - a.t));
    }
    const s = segment(keys, t, 'linear'), x = lerp(s.a.x, s.b.x, s.k), z = lerp(s.a.z, s.b.z, s.k);
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, walking = s.raw > 0 && s.raw < 1 && Math.hypot(dx, dz) > 1e-3;
    const ry = walking ? Math.atan2(dx, dz) : Array.isArray(face) ? angleTo(x, z, face) : face;
    const speed = walking ? Math.hypot(dx, dz) / Math.max(1e-6, s.b.t - s.a.t) : 0;
    return { x, z, ry, act, actT: t - actStart, walking, speed, dist, stepPhase: (dist / STEP) % 1 };
  }
  /** The spoken line at time t (plain text with a portrait), or null. */
  function line(lines, t) { return (lines || []).find(l => t >= l.t && t < l.t + l.dur) || null; }
  /** Everything a frame needs from a scene script at time t. */
  function sample(scene, t, { reduced = false } = {}) {
    t = clamp(t, 0, scene.duration);
    const actors = {}, props = {};
    for (const [id, a] of Object.entries(scene.actors || {})) actors[id] = actor(a.keys, t);
    for (const [id, keys] of Object.entries(scene.props || {})) props[id] = prop(keys, t);
    return { t, done: t >= scene.duration, camera: camera(scene.camera, t, reduced), actors, props, line: line(scene.lines, t) };
  }
  /** Checks a script for the mistakes that would break playback (unsorted keys, missing lines in a language). */
  function validate(scene) {
    const errors = [], sorted = (k, n) => { for (let i = 1; i < (k || []).length; i++) if (k[i].t < k[i - 1].t) errors.push(n + ' keys not sorted'); };
    if (!(scene.duration > 0)) errors.push('duration');
    sorted(scene.camera, 'camera'); if (!scene.camera?.length) errors.push('camera');
    for (const [id, a] of Object.entries(scene.actors || {})) sorted(a.keys, id);
    for (const [id, k] of Object.entries(scene.props || {})) sorted(k, id);
    for (const l of scene.lines || []) { for (const g of ['en', 'he', 'ru']) if (!l.text?.[g]) errors.push('line ' + g); if (l.t + l.dur > scene.duration + 1e-6) errors.push('line past the end'); }
    return errors;
  }

  /* ---------------------------------------------------------------- Chapter 1 scenes */
  const WAVE = 'wave', POINT = 'point';
  const scenes = {
    // Bus-stop street corner. The bus pulls away, the Fighter is shadowboxing at the stop, Coach Pip walks over.
    arrival: {
      set: 'busstop', duration: 10.6, chapter: 1,
      camera: [
        { t: 0, pos: [5.2, 1.75, 7.2], look: [0.6, 1.35, -4.4] },
        { t: 2.6, pos: [5.2, 1.75, 7.2], look: [0.6, 1.35, -4.4] },
        { t: 5.2, pos: [2.6, 1.6, 2.6], look: [0.3, 1.3, -4.8] },
        { t: 6.6, pos: [-0.6, 1.55, 1.0], look: [-0.5, 1.35, -5.0] },
        { t: 10.6, pos: [-0.4, 1.5, 0.4], look: [-0.5, 1.35, -5.0], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: 0.6, z: -4.8, act: 'shadow', face: 0.25 },
          { t: 5.6, x: 0.6, z: -4.8, act: 'guard', face: [-1.5, -5.1] },
          { t: 8.0, x: 0.6, z: -4.8, act: 'idle', face: [-1.5, -5.1] }
        ] },
        pip: { rig: 'pip', mitts: true, keys: [
          { t: 0, x: -8.2, z: -5.3, act: 'idle', face: Math.PI / 2 },
          { t: 1.0, x: -8.2, z: -5.3 },
          { t: 5.6, x: -1.5, z: -5.1, act: WAVE, face: [0.6, -4.8] },
          { t: 6.8, x: -1.5, z: -5.1, act: POINT },
          { t: 8.4, x: -1.5, z: -5.1, act: 'mitts' }
        ] }
      },
      props: { bus: [{ t: 0, v: [0.4] }, { t: 0.7, v: [0.4] }, { t: 3.6, v: [30], ease: 'in' }] },
      lines: [
        { t: 5.8, dur: 4.8, who: 'pip', text: L('You punch like you mean it. Want a corner in my gym?', 'אתם מכים כאילו אתם מתכוונים לזה. רוצים פינה באולם שלי?', 'Ты бьёшь так, будто всерьёз. Хочешь угол в моём зале?') }
      ]
    },
    // Gym front door. Brick dumps the new heavy bag on the pavement and laughs.
    brick: {
      set: 'gymfront', duration: 9.6, chapter: 1, bag: { holder: 'brick', drop: 2.5 },
      camera: [
        { t: 0, pos: [8.4, 2.3, 6.4], look: [11, 2.6, -3.4] },
        { t: 0.9, pos: [8.4, 2.3, 6.4], look: [11, 2.6, -3.4] },
        { t: 3.0, pos: [-7.4, 1.8, 5.0], look: [-10.6, 1.2, -1.0] },
        { t: 6.2, pos: [-9.2, 1.6, 2.6], look: [-11.2, 1.35, -1.1] },
        { t: 9.6, pos: [-9.0, 1.6, 2.3], look: [-11.0, 1.35, -1.1], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: -8.2, z: -0.9, act: 'idle', face: [-11.6, -1.2] },
          { t: 2.6, x: -8.2, z: -0.9, act: 'guard' },
          { t: 4.4, x: -8.2, z: -0.9, act: 'idle' }
        ] },
        brick: { rig: 'brick', keys: [
          { t: 0, x: -13.2, z: -0.6, act: 'carry', face: 0.9 },
          { t: 0.6, x: -13.2, z: -0.6 },
          { t: 2.3, x: -11.6, z: -1.2, act: 'carry', face: [-8.2, -0.9] },
          { t: 2.5, x: -11.6, z: -1.2, act: 'idle' },
          { t: 3.1, x: -11.6, z: -1.2, act: 'laugh' },
          { t: 7.4, x: -11.6, z: -1.2, act: POINT },
          { t: 8.4, x: -11.6, z: -1.2, act: 'idle' }
        ] }
      },
      props: {},
      lines: [
        { t: 3.3, dur: 4.6, who: 'brick', text: L('Ha! The new heavy bag. All yours, newcomer. Carry it in!', 'הא! השק הכבד החדש. כולו שלכם, חדשים. תסחבו אותו פנימה!', 'Ха! Новый тяжёлый мешок. Он весь твой, новичок. Занеси его!') }
      ]
    }
  };

  /* ---------------------------------------------------------------- carry the heavy bag (mini-game rules) */
  // Fixed path along the pavement from where Brick dropped the bag to the gym door: s = 0 .. LENGTH metres.
  const CARRY = Object.freeze({
    missionId: 'heavy_bag_van', length: 22, walk: 1.5, back: .9, par: 22, overtimeStep: 8, timeout: 120,
    stride: { before: [.15, 1.1], time: .6, past: .35 }, stagger: { bump: .7, drop: .9 },
    obstacles: [{ id: 'bench', s: 6.5, len: .5 }, { id: 'puddle', s: 10, len: 1.0 }],
    cyclist: { s: 16, half: .55, period: 4.2, offset: 1.5, ride: 1.6, from: -4.8, to: 5.2, lane: [.40, .56] },
    sways: [{ s: 3, dir: 1 }, { s: 12.6, dir: -1 }, { s: 19, dir: 1 }],
    sway: { stand: 1.3, walk: 1.0, catchFrom: .3, early: .15, wrong: .25 }
  });
  // Bag tips forward (dir +1): pull it back with Down. Tips back (dir -1): push it forward with Up.
  const swayKey = dir => dir > 0 ? 'down' : 'up';
  class CarryBag {
    constructor(rules = CARRY) {
      this.r = rules; this.t = 0; this.s = 0; this.held = { left: false, right: false };
      this.cleared = new Set(); this.swayDone = 0; this.sway = null; this.theta = 0; this.stride = null; this.stagger = 0;
      this.bumps = 0; this.drops = 0; this.caught = 0; this.passHit = -1; this.done = false; this.log = [];
    }
    /** Pass key events: 'left' | 'right' | 'up' | 'down', down = pressed (true) or released (false). */
    key(k, down) {
      if (this.done) return;
      if (k === 'left' || k === 'right') { const fresh = down && !this.held[k]; this.held[k] = down; if (fresh && k === 'right') this.tryStride(); return; }
      if (!down || !this.sway) return;
      if (k !== swayKey(this.sway.dir)) { this.theta += this.r.sway.wrong; this.event('wrong'); return; }
      if (this.theta < this.r.sway.catchFrom) { this.theta += this.r.sway.early; this.event('early'); return; }
      this.caught++; this.sway = null; this.theta = 0; this.event('caught');
    }
    event(type, extra) { this.log.push({ t: +this.t.toFixed(2), s: +this.s.toFixed(2), type, ...extra }); }
    nextObstacle() { return this.r.obstacles.find(o => !this.cleared.has(o.id) && o.s + o.len > this.s); }
    /** Where a fresh Right press starts a stride over the next obstacle. */
    strideWindow() { const o = this.nextObstacle(); if (!o) return null; const d = o.s - this.s, [a, b] = this.r.stride.before; return d >= a && d <= b ? o : null; }
    tryStride() {
      if (this.stride || this.stagger > 0) return;
      const o = this.strideWindow(); if (!o) return;
      this.cleared.add(o.id); this.stride = { from: this.s, to: o.s + o.len + this.r.stride.past, t: 0, id: o.id }; this.event('stride', { id: o.id });
    }
    /** Cyclist: z across the pavement (alley -> road) and whether the bike is in the walking lane now. */
    cyclist(t = this.t) {
      const c = this.r.cyclist, k = t - c.offset; if (k < 0) return { u: -1, z: c.from, inLane: false, pass: -1 };
      const pass = Math.floor(k / c.period), u = (k - pass * c.period) / c.ride;
      return { u, pass, z: u <= 1 ? lerp(c.from, c.to, u) : c.from, riding: u <= 1, inLane: u >= c.lane[0] && u <= c.lane[1] };
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this;
      dt = Math.min(dt, .1); this.t += dt; const r = this.r;
      if (this.stagger > 0) this.stagger = Math.max(0, this.stagger - dt);
      let moving = false;
      if (this.stride) {
        const st = this.stride; st.t += dt; const k = clamp(st.t / r.stride.time); this.s = lerp(st.from, st.to, smooth(k)); moving = true;
        if (k >= 1) this.stride = null;
      } else if (this.stagger === 0) {
        const v = this.held.right && !this.held.left ? r.walk : this.held.left && !this.held.right ? -r.back : 0;
        let s = clamp(this.s + v * dt, 0, r.length); moving = v !== 0 && s !== this.s;
        const o = this.nextObstacle();
        if (o && v > 0 && s >= o.s - .1 && this.s < o.s) { // walked into it without a step
          this.bumps++; this.cleared.add(o.id); this.stagger = r.stagger.bump; s = o.s + o.len + .2; this.event('bump', { id: o.id });
        }
        this.s = s;
      }
      // Cyclist crossing the pavement from the alley.
      const c = this.cyclist();
      if (c.inLane && c.pass !== this.passHit && Math.abs(this.s - r.cyclist.s) < r.cyclist.half) { this.passHit = c.pass; this.bumps++; this.stagger = r.stagger.bump; this.event('bump', { id: 'cyclist' }); }
      // Sways: the bag starts to tip at fixed points of the path; catch it with Up / Down in time.
      const next = r.sways[this.swayDone];
      if (!this.sway && next && this.s >= next.s) { this.sway = { dir: next.dir, t0: this.t }; this.swayDone++; this.theta = 0; this.event('sway', { dir: next.dir }); }
      if (this.sway) {
        this.theta += dt / (moving ? r.sway.walk : r.sway.stand);
        if (this.theta >= 1) { this.drops++; this.sway = null; this.theta = 0; this.stagger = r.stagger.drop; this.event('drop'); }
      }
      if (this.s >= r.length && !this.stride) { this.done = true; this.event('door'); }
      if (this.t >= r.timeout) { this.done = true; this.event('timeout'); }
      return this;
    }
    /** What the screen shows: which prompt, the tip, the cyclist. */
    view() {
      const r = this.r, c = this.cyclist(), o = this.nextObstacle(), stride = this.strideWindow();
      const nearLane = this.s < r.cyclist.s + r.cyclist.half && this.s > r.cyclist.s - 3 && c.riding && c.u < r.cyclist.lane[1];
      const prompt = this.sway ? swayKey(this.sway.dir) : stride ? 'step' : nearLane ? 'wait' : null;
      return { s: this.s, t: this.t, progress: this.s / r.length, theta: this.theta, swayDir: this.sway?.dir || 0, prompt, obstacle: o?.id || null, cyclist: c, striding: !!this.stride, stagger: this.stagger, mistakes: this.mistakes(), done: this.done };
    }
    overtime() { return Math.max(0, Math.ceil((this.t - this.r.par) / this.r.overtimeStep)); }
    /** The measured value for the mission (metric "mistakes", lower is better): bumps + dropped balance + time over par. */
    mistakes() { return this.bumps + this.drops + this.overtime(); }
    result(starsFor) {
      const mistakes = this.mistakes(), stars = typeof starsFor === 'function' ? starsFor(this.r.missionId, mistakes) : null;
      return { missionId: this.r.missionId, time: +this.t.toFixed(1), bumps: this.bumps, drops: this.drops, caught: this.caught, overtime: this.overtime(), mistakes, stars, finished: this.s >= this.r.length };
    }
  }

  const api = { clamp, smooth, EASE, segment, camera, prop, actor, line, sample, validate, scenes, CARRY, CarryBag, swayKey, STEP, L };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryCore = api;
})();
