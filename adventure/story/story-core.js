/* Story sets, pure part (GOTR-0056 presentation layers 2 + 3, docs/adventure/STORY.md "How the story is shown").
 * Timeline sampling for short scripted scenes, the Chapter 1 scene scripts (EN/HE/RU lines) and the rules of the
 * on-rails mini-games. No DOM, no three.js: used by adventure/story/story-scenes.js in the browser (window.StoryCore)
 * and by tests/story-scenes.test.cjs in node. World units are metres, y up, rigs face +z.
 *
 * STABLE API for other chapters (add scenes and games from your own file, do not edit this one):
 *   StoryCore.scenes[id] = {                       // a scripted scene, played by StoryScenes.play(id, { onDone })
 *     set: 'busstop' | 'gymfront' | <id registered with StorySets.register>, duration (s),
 *     camera: [{ t, pos: [x,y,z], look: [x,y,z], ease?, fit?: [actorId..] }],   // fit = actors kept inside the frame
 *     actors: { id: { rig: 'fighter' | 'pip' | 'brick' | 'dash' | 'guard' | 'regular', mitts?, keys: [{ t, x, z, act?, face? }] } },
 *     props?: { bus: [{ t, v: [x] }] }, bag?: { holder, drop }, item?: { id, holders: [{ t, who, hand: 'L' | 'R' }] },
 *     lines: [{ t, dur, who (AdventureStory.who id), text: { en, he, ru } }] }
 *   acts: idle guard shadow mitts wave point laugh carry combo down block flex (walking is inferred from moving keys)
 *   StoryCore.sample(scene, t, { reduced }) -> { camera, actors, props, line, done } ; StoryCore.validate(scene) -> [errors]
 *   StoryCore.CarryBag / StoryCore.GuardGame: mini-game rules: key(k, down), step(dt), view(), result(starsFor), .done
 *   StoryScenes.games[id] = { set, roles, make(Core), frame(ctx, dt), hud(view, words), keys } registers another mini-game.
 *   StoryScenes.looks[role] = { gloves: '#hex', shorts: '#hex' } dresses the opponent-species rig for a new character.
 */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const EASE = { linear: t => clamp(t), smooth, smoother: t => { t = clamp(t); return t * t * t * (t * (6 * t - 15) + 10); }, in: t => { t = clamp(t); return t * t; }, out: t => { t = clamp(t); return 1 - (1 - t) * (1 - t); } };
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
    const s = segment(keys, t, 'smoother'); if (!s) return null;
    const k = reduced ? (s.raw >= 1 ? 1 : 0) : s.k;
    return { pos: mix(s.a.pos, s.b.pos, k), look: mix(s.a.look, s.b.look, k), cut: reduced, fit: (k < .5 ? s.a.fit : s.b.fit) || s.b.fit || s.a.fit || null };
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
        { t: 0, pos: [5.6, 1.7, 7.4], look: [0.8, 1.5, -4.4], fit: ['fighter'] },
        { t: 2.6, pos: [5.2, 1.7, 7.0], look: [0.6, 1.4, -4.4], fit: ['fighter'], ease: 'linear' },
        { t: 5.2, pos: [2.8, 1.55, 2.2], look: [0.2, 1.3, -4.8], fit: ['fighter'] },
        { t: 6.8, pos: [-0.2, 1.5, 0.6], look: [-0.45, 1.3, -5.0], fit: ['fighter', 'pip'] },
        { t: 10.6, pos: [-0.5, 1.5, 0.1], look: [-0.45, 1.3, -5.0], fit: ['fighter', 'pip'], ease: 'linear' }
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
        { t: 0, pos: [8.2, 1.9, 5.6], look: [11, 2.5, -3.4] },
        { t: 1.0, pos: [8.0, 1.9, 5.4], look: [11, 2.5, -3.4], ease: 'linear' },
        { t: 3.2, pos: [-7.4, 1.7, 4.6], look: [-10.4, 1.15, -1.0], fit: ['fighter', 'brick'] },
        { t: 6.2, pos: [-8.6, 1.55, 3.0], look: [-10.4, 1.25, -1.1], fit: ['fighter', 'brick'] },
        { t: 9.6, pos: [-8.9, 1.55, 2.7], look: [-10.4, 1.25, -1.1], fit: ['fighter', 'brick'], ease: 'linear' }
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
        { t: 3.3, dur: 4.6, who: 'brick', text: L('Ha! Special delivery, rookie. Carry it in!', 'הא! משלוח מיוחד, טירון. תסחבו פנימה!', 'Ха! Спецдоставка, салага. Заноси!') }
      ]
    },
    // Beat 4. Dash walks up to the morning session, drops a regular in seconds and laughs. Pip is heard, not seen.
    dash: {
      set: 'gymfront', duration: 10.2, chapter: 1,
      camera: [
        { t: 0, pos: [3.6, 1.8, 5.4], look: [7.4, 1.3, -1.4], fit: ['dash', 'regular'] },
        { t: 2.2, pos: [5.2, 1.6, 4.0], look: [8.0, 1.25, -1.4], fit: ['dash', 'regular'] },
        { t: 3.7, pos: [6.6, 1.45, 3.0], look: [8.0, 1.2, -1.4], fit: ['dash', 'regular'] },
        { t: 6.4, pos: [5.4, 1.55, 3.6], look: [6.9, 1.3, -1.0], fit: ['dash', 'fighter'] },
        { t: 10.2, pos: [5.2, 1.55, 3.3], look: [6.9, 1.3, -1.0], fit: ['dash', 'fighter'], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [{ t: 0, x: 5.4, z: -0.5, act: 'idle', face: [8, -1.4] }, { t: 6.2, x: 5.4, z: -0.5, act: 'guard', face: [7.4, -1.4] }, { t: 8.4, x: 5.4, z: -0.5, act: 'idle' }] },
        regular: { rig: 'regular', keys: [{ t: 0, x: 8.7, z: -1.4, act: 'shadow', face: [7.4, -1.4] }, { t: 2.0, x: 8.7, z: -1.4, act: 'guard' }, { t: 2.95, x: 8.7, z: -1.4, act: 'down' }] },
        dash: { rig: 'dash', keys: [
          { t: 0, x: 2.4, z: -1.6, act: 'idle', face: Math.PI / 2 },
          { t: 2.2, x: 7.45, z: -1.4, act: 'combo', face: [8.7, -1.4] },
          { t: 3.5, x: 7.45, z: -1.4, act: 'laugh', face: [6.6, 3] },
          { t: 6.0, x: 7.45, z: -1.4, act: 'point', face: [5.4, -0.5] },
          { t: 8.0, x: 7.45, z: -1.4, act: 'flex' }
        ] }
      },
      props: {},
      lines: [
        { t: 3.7, dur: 2.2, who: 'dash', text: L('Eight seconds. And I was being polite.', 'שמונה שניות. ועוד הייתי מנומס.', 'Восемь секунд. И это я был вежлив.') },
        { t: 6.0, dur: 2.1, who: 'dash', text: L('You are next, new one. Bring a pillow.', 'אתם הבאים, חדשים. תביאו כרית.', 'Ты следующий, новенький. Захвати подушку.') },
        { t: 8.2, dur: 2.0, who: 'pip', text: L('Easy. You will get him. Later.', 'רגוע. תגיעו אליו. אחר כך.', 'Спокойно. Ты до него доберёшься. Позже.') }
      ]
    },
    // Boss intro: Brick blocks the gym door.
    boss_intro: {
      set: 'gymfront', duration: 8.6, chapter: 1,
      camera: [
        { t: 0, pos: [10.3, 1.15, 1.4], look: [11, 1.55, -2.6], fit: ['brick'] },
        { t: 1.0, pos: [10.2, 1.2, 1.2], look: [11, 1.55, -2.6], fit: ['brick'], ease: 'linear' },
        { t: 3.2, pos: [7.4, 1.65, 1.9], look: [10.1, 1.3, -2.2], fit: ['brick', 'fighter'] },
        { t: 5.4, pos: [7.9, 1.6, 2.6], look: [9.4, 1.3, -1.6], fit: ['brick', 'fighter', 'pip'] },
        { t: 8.6, pos: [8.1, 1.6, 2.4], look: [9.5, 1.3, -1.6], fit: ['brick', 'fighter', 'pip'], ease: 'linear' }
      ],
      actors: {
        brick: { rig: 'brick', keys: [{ t: 0, x: 11, z: -2.5, act: 'block', face: [9.4, -1.5] }, { t: 5.6, x: 11, z: -2.5, act: 'guard' }] },
        fighter: { rig: 'fighter', keys: [{ t: 0, x: 6.4, z: -1.0, act: 'idle', face: Math.PI / 2 }, { t: 0.5, x: 6.4, z: -1.0 }, { t: 2.8, x: 9.5, z: -1.7, act: 'idle', face: [11, -2.5] }, { t: 5.6, x: 9.5, z: -1.7, act: 'guard' }] },
        pip: { rig: 'pip', mitts: true, keys: [{ t: 0, x: 5.6, z: -0.2, act: 'idle', face: Math.PI / 2 }, { t: 1.2, x: 5.6, z: -0.2 }, { t: 3.6, x: 8.5, z: -0.4, act: 'idle', face: [9.5, -1.7] }, { t: 5.4, x: 8.5, z: -0.4, act: 'mitts' }] }
      },
      props: {},
      lines: [
        { t: 2.7, dur: 2.5, who: 'brick', text: L('Lost, rookie? The exit is right behind you.', 'הלכתם לאיבוד, טירון? היציאה מאחוריכם.', 'Заблудился, салага? Выход у тебя за спиной.') },
        { t: 5.4, dur: 2.8, who: 'pip', text: L('Hands up, chin down. You know how.', 'ידיים למעלה, סנטר למטה. אתם יודעים איך.', 'Руки выше, подбородок ниже. Ты умеешь.') }
      ]
    },
    // Boss outro: Brick steps aside, Pip hands over his old hand wraps.
    boss_outro: {
      set: 'gymfront', duration: 9.4, chapter: 1, item: { id: 'wraps', holders: [{ t: 3.2, who: 'pip', hand: 'L' }, { t: 6.0, who: 'fighter', hand: 'R' }] },
      camera: [
        { t: 0, pos: [8.6, 1.6, 2.8], look: [10.6, 1.3, -2.2], fit: ['brick', 'fighter'] },
        { t: 2.4, pos: [8.8, 1.6, 2.6], look: [10.8, 1.3, -2.0], fit: ['brick', 'fighter'], ease: 'linear' },
        { t: 4.2, pos: [8.9, 1.5, 2.0], look: [9.0, 1.3, -1.6], fit: ['pip', 'fighter'] },
        { t: 9.4, pos: [8.9, 1.5, 1.6], look: [9.0, 1.3, -1.6], fit: ['pip', 'fighter'], ease: 'linear' }
      ],
      actors: {
        brick: { rig: 'brick', keys: [{ t: 0, x: 11, z: -2.5, act: 'idle', face: [9.5, -1.7] }, { t: 0.5, x: 11, z: -2.5 }, { t: 2.2, x: 12.9, z: -1.5, act: 'idle', face: [9.5, -1.7] }] },
        fighter: { rig: 'fighter', keys: [{ t: 0, x: 9.6, z: -1.7, act: 'guard', face: [11, -2.5] }, { t: 2.6, x: 9.6, z: -1.7, act: 'idle', face: [8.3, -1.5] }, { t: 6.0, x: 9.6, z: -1.7, act: 'flex' }] },
        pip: { rig: 'pip', keys: [{ t: 0, x: 6.6, z: -0.8, act: 'idle', face: Math.PI / 2 }, { t: 2.2, x: 6.6, z: -0.8 }, { t: 3.6, x: 8.25, z: -1.5, act: 'point', face: [9.6, -1.7] }, { t: 6.2, x: 8.25, z: -1.5, act: 'idle' }, { t: 7.2, x: 8.25, z: -1.5, act: 'wave' }] }
      },
      props: {},
      lines: [
        { t: 0.6, dur: 2.5, who: 'brick', text: L('...Fine. That door was heavy anyway.', '...טוב. הדלת הזאת ממילא כבדה.', '...Ладно. Дверь всё равно тяжёлая.') },
        { t: 3.8, dur: 3.2, who: 'pip', text: L('My old hand wraps. They are yours now.', 'החבישות הישנות שלי. עכשיו הן שלכם.', 'Мои старые бинты. Теперь они твои.') },
        { t: 7.1, dur: 2.2, who: 'pip', text: L('Go see Vix at Market Row.', 'לכו לוויקס בשדרת השוק.', 'Иди к Викс на Рыночный ряд.') }
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
      return { missionId: this.r.missionId, time: +this.t.toFixed(1), bumps: this.bumps, drops: this.drops, caught: this.caught, overtime: this.overtime(), mistakes, value: mistakes, metric: 'mistakes', stars, finished: this.s >= this.r.length };
    }
  }

  /* ---------------------------------------------------------------- the snoring night guard (mini-game rules) */
  // The guard sleeps on his feet in front of the gym door and swings his pillow in his sleep. Sneak up with Right,
  // Slip (Left) the straight pokes, duck (Down) under the round swings, then ring the bell (Up) to wake him.
  const GUARD = Object.freeze({
    missionId: 'snoring_guard', approach: 3, gap: .15, bell: .3, sneak: 1.0, dodge: .5, stun: .6, rest: .35, timeout: 90,
    swings: [['hook', .9], ['jab', .85], ['hook', .8], ['jab', .75], ['jab', .7], ['hook', .7], ['jab', .65], ['hook', .6], ['jab', .6]]
  });
  const dodgeKey = type => type === 'hook' ? 'down' : 'left';
  class GuardGame {
    constructor(rules = GUARD) {
      this.r = rules; this.t = 0; this.s = 0; this.held = false; this.i = 0; this.swing = null; this.dodge = null; this.stun = 0; this.rest = 0;
      this.dodges = 0; this.hits = 0; this.rung = false; this.done = false; this.log = []; this.last = null;
    }
    get end() { return this.r.approach + this.r.gap * (this.r.swings.length - 1) + this.r.bell; }
    mark(i) { return this.r.approach + this.r.gap * i; }
    event(type, extra) { this.log.push({ t: +this.t.toFixed(2), type, ...extra }); }
    key(k, down) {
      if (this.done) return;
      if (k === 'right') { this.held = down; return; }
      if (!down) return;
      if (k === 'up') { if (this.s >= this.end - 1e-6 && !this.swing) { this.rung = true; this.done = true; this.event('bell'); } return; }
      if ((k === 'left' || k === 'down') && this.stun === 0 && !(this.dodge && this.t < this.dodge.until)) this.dodge = { key: k, t0: this.t, until: this.t + this.r.dodge };
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this;
      dt = Math.min(dt, .1); this.t += dt; const r = this.r;
      this.stun = Math.max(0, this.stun - dt); this.rest = Math.max(0, this.rest - dt);
      if (this.swing) {
        if (this.t >= this.swing.t0 + this.swing.tele) { // the pillow arrives now
          const ok = this.dodge && this.dodge.key === dodgeKey(this.swing.type) && this.t < this.dodge.until && this.dodge.t0 >= this.swing.t0;
          if (ok) { this.dodges++; this.event('dodge', { swing: this.swing.type }); } else { this.hits++; this.stun = r.stun; this.event('hit', { swing: this.swing.type }); }
          this.last = { type: this.swing.type, ok: !!ok, t: this.t }; this.swing = null; this.rest = r.rest; this.i++;
        }
      } else {
        const limit = this.i < r.swings.length ? this.mark(this.i) : this.end, dodging = this.dodge && this.t < this.dodge.until;
        if (this.held && this.stun === 0 && this.rest === 0 && !dodging) this.s = Math.min(limit, this.s + r.sneak * dt);
        if (this.i < r.swings.length && this.s >= limit - 1e-6 && this.rest === 0) { const [type, tele] = r.swings[this.i]; this.swing = { type, tele, t0: this.t }; this.event('swing', { swing: type }); }
      }
      if (this.t >= r.timeout) { this.done = true; this.event('timeout'); }
      return this;
    }
    view() {
      const sw = this.swing, dodging = this.dodge && this.t < this.dodge.until, atBell = this.s >= this.end - 1e-6;
      return { s: this.s, t: this.t, progress: this.s / this.end, swing: sw ? { type: sw.type, k: clamp((this.t - sw.t0) / sw.tele) } : null,
        dodge: dodging ? { key: this.dodge.key, k: clamp((this.t - this.dodge.t0) / this.r.dodge) } : null,
        prompt: sw ? dodgeKey(sw.type) : atBell ? 'bell' : null, stun: this.stun, dodges: this.dodges, hits: this.hits, total: this.r.swings.length, atBell,
        moving: this.held && !sw && this.stun === 0 && this.rest === 0 && !dodging && !atBell && this.s < (this.i < this.r.swings.length ? this.mark(this.i) : this.end), last: this.last, done: this.done };
    }
    /** Measured value for the mission (metric "dodges", higher is better). */
    result(starsFor) { return { missionId: this.r.missionId, time: +this.t.toFixed(1), dodges: this.dodges, hits: this.hits, value: this.dodges, metric: 'dodges', stars: typeof starsFor === 'function' ? starsFor(this.r.missionId, this.dodges) : null, finished: this.rung }; }
  }

  const api = { clamp, smooth, EASE, segment, camera, prop, actor, line, sample, validate, scenes, CARRY, CarryBag, swayKey, GUARD, GuardGame, dodgeKey, STEP, L };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryCore = api;
})();
