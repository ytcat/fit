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
 *   acts: idle guard shadow mitts wave point laugh carry combo down block flex off (off = hidden; walking is inferred from moving keys)
 *   StoryCore.sample(scene, t, { reduced }) -> { camera, actors, props, line, done } ; StoryCore.validate(scene) -> [errors]
 *   The side games are skill trials with their own pure rules: adventure/story/trials-core.js (window.StoryTrials).
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
    // Bus-stop street corner. The bus pulls away, the Fighter is shadowboxing at the stop, Mack walks over.
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
        { t: 3.3, dur: 4.6, who: 'brick', text: L('Ha! Meet the new bag, rookie. This one hits back!', 'הא! תכירו את השק החדש, טירון. הוא מחזיר!', 'Ха! Знакомься с новым мешком, салага. Он даёт сдачи!') }
      ]
    },
    // Beat 4. Dash walks up to the morning session, drops a regular in seconds and laughs. Mack is heard, not seen.
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
    // Boss intro: Brick blocks the gym door. Mack is heard from the Fighter's corner, not seen (two rigs on screen).
    boss_intro: {
      set: 'gymfront', duration: 8.6, chapter: 1,
      camera: [
        { t: 0, pos: [10.3, 1.15, 1.4], look: [11, 1.55, -2.6], fit: ['brick'] },
        { t: 1.0, pos: [10.2, 1.2, 1.2], look: [11, 1.55, -2.6], fit: ['brick'], ease: 'linear' },
        { t: 3.2, pos: [7.4, 1.65, 1.9], look: [10.1, 1.3, -2.2], fit: ['brick', 'fighter'] },
        { t: 5.4, pos: [8.2, 1.55, 2.4], look: [10.1, 1.3, -2.1], fit: ['brick', 'fighter'] },
        { t: 8.6, pos: [8.4, 1.55, 2.2], look: [10.2, 1.3, -2.1], fit: ['brick', 'fighter'], ease: 'linear' }
      ],
      actors: {
        brick: { rig: 'brick', keys: [{ t: 0, x: 11, z: -2.5, act: 'block', face: [9.4, -1.5] }, { t: 5.6, x: 11, z: -2.5, act: 'guard' }] },
        fighter: { rig: 'fighter', keys: [{ t: 0, x: 6.4, z: -1.0, act: 'idle', face: Math.PI / 2 }, { t: 0.5, x: 6.4, z: -1.0 }, { t: 2.8, x: 9.5, z: -1.7, act: 'idle', face: [11, -2.5] }, { t: 5.6, x: 9.5, z: -1.7, act: 'guard' }] }
      },
      props: {},
      lines: [
        { t: 2.7, dur: 2.5, who: 'brick', text: L('Lost, rookie? The exit is right behind you.', 'הלכתם לאיבוד, טירון? היציאה מאחוריכם.', 'Заблудился, салага? Выход у тебя за спиной.') },
        { t: 5.4, dur: 2.8, who: 'pip', text: L('Hands up, chin down. You know how.', 'ידיים למעלה, סנטר למטה. אתם יודעים איך.', 'Руки выше, подбородок ниже. Ты умеешь.') }
      ]
    },
    // Boss outro: Brick steps aside, Mack hands over his old hand wraps.
    boss_outro: {
      set: 'gymfront', duration: 9.4, chapter: 1, item: { id: 'wraps', holders: [{ t: 3.2, who: 'pip', hand: 'L' }, { t: 6.0, who: 'fighter', hand: 'R' }] },
      camera: [
        { t: 0, pos: [8.6, 1.6, 2.8], look: [10.6, 1.3, -2.2], fit: ['brick', 'fighter'] },
        { t: 2.4, pos: [8.8, 1.6, 2.6], look: [10.8, 1.3, -2.0], fit: ['brick', 'fighter'], ease: 'linear' },
        { t: 4.2, pos: [8.6, 1.5, 2.0], look: [8.6, 1.3, -1.6], fit: ['pip', 'fighter'] },
        { t: 9.4, pos: [8.6, 1.5, 1.6], look: [8.6, 1.3, -1.6], fit: ['pip', 'fighter'], ease: 'linear' }
      ],
      actors: {
        brick: { rig: 'brick', keys: [{ t: 0, x: 11, z: -2.5, act: 'idle', face: [9.5, -1.7] }, { t: 0.5, x: 11, z: -2.5 }, { t: 2.2, x: 12.9, z: -1.5, act: 'idle', face: [9.5, -1.7] }, { t: 4.4, x: 12.9, z: -1.5, act: 'off' }] }, // out of the shot: not drawn
        fighter: { rig: 'fighter', keys: [{ t: 0, x: 9.6, z: -1.7, act: 'guard', face: [11, -2.5] }, { t: 2.6, x: 9.6, z: -1.7, act: 'idle', face: [8.3, -1.5] }, { t: 6.0, x: 9.6, z: -1.7, act: 'flex' }] },
        pip: { rig: 'pip', keys: [{ t: 0, x: 6.6, z: -0.8, act: 'idle', face: Math.PI / 2 }, { t: 2.2, x: 6.6, z: -0.8 }, { t: 3.6, x: 7.6, z: -1.5, act: 'point', face: [9.6, -1.7] }, { t: 6.2, x: 7.6, z: -1.5, act: 'idle' }, { t: 7.2, x: 7.6, z: -1.5, act: 'wave' }] }
      },
      props: {},
      lines: [
        { t: 0.6, dur: 2.5, who: 'brick', text: L('...Fine. That door was heavy anyway.', '...טוב. הדלת הזאת ממילא כבדה.', '...Ладно. Дверь всё равно тяжёлая.') },
        { t: 3.8, dur: 3.2, who: 'pip', text: L('My old hand wraps. They are yours now.', 'החבישות הישנות שלי. עכשיו הן שלכם.', 'Мои старые бинты. Теперь они твои.') },
        { t: 7.1, dur: 2.2, who: 'pip', text: L('Go see Vix at Market Row.', 'לכו לוויקס בשדרת השוק.', 'Иди к Викс на Рыночный ряд.') }
      ]
    }
  };

  /* ---------------------------------------------------------------- Chapter 2, Market Row (evening). The side games are skill trials: trials-core.js */
  const HALF = Math.PI / 2;
  Object.assign(scenes, {
    // Vix, the fox coach of Market Row, is working her feet between the stalls when the Fighter arrives.
    vix_intro: {
      set: 'market', duration: 9.6, chapter: 2,
      camera: [
        { t: 0, pos: [-7.5, 3.4, 7.2], look: [-0.5, 1.7, -2.2] },
        { t: 1.2, pos: [-7.0, 3.2, 6.8], look: [-0.3, 1.6, -2.0], ease: 'linear' },
        { t: 3.6, pos: [-1.6, 1.6, 3.6], look: [0.3, 1.3, -0.9], fit: ['vix', 'fighter'] },
        { t: 9.6, pos: [-1.2, 1.55, 3.1], look: [0.3, 1.3, -0.9], fit: ['vix', 'fighter'], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [{ t: 0, x: -5.2, z: -0.5, act: 'idle', face: HALF }, { t: 0.4, x: -5.2, z: -0.5 }, { t: 3.3, x: -0.7, z: -0.8, act: 'idle', face: [1.3, -1.0] }, { t: 6.4, x: -0.7, z: -0.8, act: 'guard' }] },
        vix: { rig: 'vix', keys: [{ t: 0, x: 1.3, z: -1.0, act: 'shadow', face: 0.5 }, { t: 3.3, x: 1.3, z: -1.0, act: 'idle', face: [-0.7, -0.8] }, { t: 4.4, x: 1.3, z: -1.0, act: 'point' }, { t: 6.2, x: 1.3, z: -1.0, act: 'mitts' }] }
      },
      props: {},
      lines: [
        { t: 3.5, dur: 2.6, who: 'vix', text: L('Old Town sent you? Market Row eats slow feet.', 'העיר העתיקה שלחה אתכם? שדרת השוק אוכלת רגליים איטיות.', 'Тебя прислал Старый город? Рыночный ряд ест медленных.') },
        { t: 6.3, dur: 3.0, who: 'vix', text: L('Keep up with me and you have a coach.', 'תעמדו בקצב שלי ויש לכם מאמנת.', 'Не отставай от меня — и у тебя есть тренер.') }
      ]
    },
    // The raccoon lifts Mack's whistle and runs.
    whistle_theft: {
      set: 'market', duration: 9.6, chapter: 2, item: { id: 'whistle', holders: [{ t: 0, who: 'pip', hand: 'R' }, { t: 3.35, who: 'raccoon', hand: 'L' }] },
      camera: [
        { t: 0, pos: [-2.2, 1.6, 3.4], look: [-2.1, 1.35, -0.9], fit: ['pip', 'fighter'] },
        { t: 3.0, pos: [-2.6, 1.6, 3.2], look: [-2.6, 1.35, -1.0], fit: ['pip', 'fighter', 'raccoon'], ease: 'linear' },
        { t: 5.2, pos: [0.6, 1.9, 5.0], look: [3.6, 1.2, -1.2] },
        { t: 6.6, pos: [-1.8, 1.55, 3.2], look: [-2.0, 1.3, -0.9], fit: ['pip', 'fighter'] },
        { t: 9.6, pos: [-1.6, 1.55, 2.9], look: [-2.0, 1.3, -0.9], fit: ['pip', 'fighter'], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [{ t: 0, x: -1.2, z: -0.8, act: 'idle', face: [-3, -1] }, { t: 5.4, x: -1.2, z: -0.8, act: 'guard', face: HALF }] },
        pip: { rig: 'pip', keys: [{ t: 0, x: -3.0, z: -1.0, act: 'idle', face: [-1.2, -0.8] }, { t: 0.6, x: -3.0, z: -1.0, act: 'wave' }, { t: 3.4, x: -3.0, z: -1.0, act: 'idle' }, { t: 5.6, x: -3.0, z: -1.0, act: 'point', face: HALF }] },
        raccoon: { rig: 'raccoon', keys: [{ t: 0, x: -8.5, z: -2.0, act: 'off', face: HALF }, { t: 1.0, x: -8.5, z: -2.0, act: 'idle' }, { t: 3.1, x: -3.75, z: -1.55, act: 'point', face: [-3.0, -1.0] }, { t: 3.7, x: -3.75, z: -1.55, act: 'idle' }, { t: 6.2, x: 9.5, z: -1.3 }, { t: 6.3, x: 9.5, z: -1.3, act: 'off' }] }
      },
      props: {},
      lines: [
        { t: 0.7, dur: 2.4, who: 'pip', text: L('Good work. One blow of this whistle and—', 'עבודה טובה. שריקה אחת במשרוקית הזאת ו—', 'Хорошая работа. Один свисток — и...') },
        { t: 3.6, dur: 2.3, who: 'raccoon', text: L('Finders keepers, coach! Catch me!', 'מי שמצא, שלו, מאמן! תתפסו אותי!', 'Кто нашёл, того и свисток, тренер! Лови!') },
        { t: 6.3, dur: 3.0, who: 'pip', text: L('My whistle! Do not just stand there. After him!', 'המשרוקית שלי! אל תעמדו ככה. אחריו!', 'Мой свисток! Не стой столбом. За ним!') }
      ]
    },
    // Dash has taken the crowd circle before the Fighter arrives.
    dash_circle: {
      set: 'market', duration: 9.6, chapter: 2,
      camera: [
        { t: 0, pos: [10.4, 2.8, 6.6], look: [13.2, 1.3, -1.0] },
        { t: 3.0, pos: [10.8, 1.7, 3.8], look: [12.4, 1.3, -0.9], fit: ['dash', 'fighter'] },
        { t: 9.6, pos: [11.0, 1.6, 3.4], look: [12.3, 1.3, -0.9], fit: ['dash', 'fighter'], ease: 'linear' }
      ],
      actors: {
        regular: { rig: 'regular', keys: [{ t: 0, x: 14.4, z: -1.3, act: 'down', face: [12.9, -1] }] },
        dash: { rig: 'dash', keys: [{ t: 0, x: 12.9, z: -1.0, act: 'flex', face: 0.3 }, { t: 3.4, x: 12.9, z: -1.0, act: 'point', face: [11.0, -0.7] }, { t: 6.4, x: 12.9, z: -1.0, act: 'laugh' }] },
        fighter: { rig: 'fighter', keys: [{ t: 0, x: 8.2, z: -0.4, act: 'idle', face: HALF }, { t: 0.6, x: 8.2, z: -0.4 }, { t: 2.6, x: 11.0, z: -0.7, act: 'idle', face: [12.9, -1.0] }, { t: 3.6, x: 11.0, z: -0.7, act: 'guard' }] }
      },
      props: {},
      lines: [
        { t: 0.9, dur: 2.5, who: 'dash', text: L('Too slow again, new one. The circle is mine.', 'שוב איטיים מדי, חדשים. המעגל שלי.', 'Опять медленно, новенький. Круг мой.') },
        { t: 3.6, dur: 2.7, who: 'dash', text: L('Win three here. Then you may say my name.', 'נצחו כאן שלושה. אז תוכלו להגיד את השם שלי.', 'Победи здесь троих. Тогда можешь звать меня по имени.') },
        { t: 6.6, dur: 2.8, who: 'vix', text: L('Three challengers. Then the crowd is yours.', 'שלושה מתמודדים. ואז הקהל שלכם.', 'Трое соперников. И толпа твоя.') }
      ]
    },
    // Boss of Market Row: King Hyena and his crew.
    hyena_intro: {
      set: 'market', duration: 8.8, chapter: 2,
      camera: [
        { t: 0, pos: [-12.6, 1.1, 2.4], look: [-14, 1.5, -1.2], fit: ['king'] },
        { t: 1.2, pos: [-12.5, 1.15, 2.2], look: [-14, 1.5, -1.2], fit: ['king'], ease: 'linear' },
        { t: 3.4, pos: [-11.6, 1.6, 3.4], look: [-13.1, 1.3, -1.0], fit: ['king', 'fighter'] },
        { t: 8.8, pos: [-11.9, 1.55, 3.0], look: [-13.1, 1.3, -1.0], fit: ['king', 'fighter'], ease: 'linear' }
      ],
      actors: {
        king: { rig: 'king', keys: [{ t: 0, x: -14, z: -1.2, act: 'block', face: [-12.2, -0.9] }, { t: 5.6, x: -14, z: -1.2, act: 'guard' }] },
        fighter: { rig: 'fighter', keys: [{ t: 0, x: -8.6, z: -0.5, act: 'idle', face: -HALF }, { t: 0.5, x: -8.6, z: -0.5 }, { t: 2.8, x: -12.2, z: -0.9, act: 'idle', face: [-14, -1.2] }, { t: 5.6, x: -12.2, z: -0.9, act: 'guard' }] }
      },
      props: {},
      lines: [
        { t: 2.6, dur: 2.7, who: 'king', text: L('My market. Here you fight when I say so.', 'השוק שלי. כאן נלחמים כשאני אומר.', 'Мой рынок. Здесь дерутся, когда я скажу.') },
        { t: 5.5, dur: 3.0, who: 'vix', text: L('He talks big. Make him prove it.', 'הוא מדבר גדול. תנו לו להוכיח.', 'Говорит он громко. Пусть докажет.') }
      ]
    },
    hyena_outro: {
      set: 'market', duration: 9.2, chapter: 2,
      camera: [
        { t: 0, pos: [-11.8, 1.5, 3.2], look: [-13.2, 1.2, -1.0], fit: ['king', 'fighter'] },
        { t: 9.2, pos: [-12.2, 1.55, 2.7], look: [-13.1, 1.3, -1.0], fit: ['king', 'fighter'], ease: 'linear' }
      ],
      actors: {
        king: { rig: 'king', keys: [{ t: 0, x: -14, z: -1.2, act: 'down', face: [-12.2, -0.9] }, { t: 3.4, x: -14, z: -1.2, act: 'idle' }] },
        fighter: { rig: 'fighter', keys: [{ t: 0, x: -12.2, z: -0.9, act: 'guard', face: [-14, -1.2] }, { t: 1.0, x: -12.2, z: -0.9, act: 'idle' }, { t: 3.8, x: -12.2, z: -0.9, act: 'flex', face: 0.6 }] }
      },
      props: {},
      lines: [
        { t: 0.7, dur: 2.7, who: 'king', text: L('...Fine. The market is yours. For now.', '...טוב. השוק שלכם. בינתיים.', '...Ладно. Рынок твой. Пока что.') },
        { t: 3.7, dur: 2.5, who: 'vix', text: L('You beat the King! The whole row saw it.', 'ניצחתם את המלך! כל השדרה ראתה.', 'Ты победил Короля! Весь ряд это видел.') },
        { t: 6.4, dur: 2.6, who: 'vix', text: L('The real fights are down at the Docks. Go.', 'הקרבות האמיתיים הם בנמל. לכו.', 'Настоящие бои — в Доках. Иди.') }
      ]
    }
  });

  const api = { clamp, smooth, EASE, segment, camera, prop, actor, line, sample, validate, scenes, STEP, L };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryCore = api;
})();
