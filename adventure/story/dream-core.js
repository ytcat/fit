/* Chapter 1 "The Dream" (GOTR-0078), pure part: the scene scripts of beats 0 to 2 and their sampler. No DOM, no three.js:
 * used by adventure/story/dream-scenes.js in the browser (window.DreamCore) and by tests/dream-scenes.test.cjs in node.
 * World: metres, y up, sets face the camera at +z, rigs face +z when ry = 0. Script: docs/adventure/CHAPTER1_SCRIPT_V2.md.
 *
 * A scene is one timeline:
 *   { set, duration, intro?: 'map' (dive from the city map first), outfit: { actorId: 'street' | 'kit' },
 *     bag?: [{ t, on: 'shoulder' | 'floor' | 'off', at?: [x, z, ry] }],
 *     camera: [{ t, pos, look, ease?, cut?: true }],          cut = the picture jumps to this key at t (a new shot)
 *     actors: { id: { rig: 'fighter' | 'bruno' | 'brick', keys: [{ t, x, z, y?, face?, arms?, look?, act?, lean?, drop? }] } },
 *         moving between two keys = walking (the step phase comes from the distance, so feet do not slide);
 *         face / look: radians, [x, z] / [x, y, z] point, or another actor's id; arms: { L, R } gesture names (DreamPose);
 *         act: 'off' hidden, 'box' shadow boxing, 'guard', 'down', 'tired'; the latest value of each field holds
 *     props: { name: [{ t, v: [..], ease? }] },
 *     lines: [{ t, who, text: { en, he, ru }, hold?: true }] }  hold = the timeline waits here for a tap (conversations)
 * DreamCore.sample(scene, t) -> { camera: { pos, look, shot }, actors: { id: { x, y, z, ry, walking, dist, arms, look, act, lean, drop } },
 *                                 props, bag, line, lineIndex, done } ; DreamCore.validate(scene) -> [errors]
 * DreamCore.variant(id, outcome) -> the scene for an outcome ('dream_after_brick': 'loss' | 'win'). */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const EASE = { linear: t => clamp(t), smooth: t => { t = clamp(t); return t * t * (3 - 2 * t); }, smoother: t => { t = clamp(t); return t * t * t * (t * (6 * t - 15) + 10); }, in: t => { t = clamp(t); return t * t; }, out: t => { t = clamp(t); return 1 - (1 - t) * (1 - t); } };
  const L = (en, he, ru) => ({ en, he, ru }), mix = (p, q, k) => p.map((v, i) => lerp(v, q[i], k));
  /** Index of the last key at or before t (the later of two keys with the same time wins: that is how a cut is written). */
  function at(keys, t) { let i = 0; for (let k = 1; k < keys.length; k++) if (keys[k].t <= t) i = k; else break; return i; }
  function camera(keys, t) {
    if (!keys?.length) return null; const i = at(keys, t), a = keys[i], b = keys[i + 1]; let shot = 0; for (let k = 1; k <= i; k++) if (keys[k].cut) shot++;
    if (!b || b.cut || t <= a.t) return { pos: a.pos.slice(), look: a.look.slice(), shot, fov: a.fov || 0 };
    const k = (EASE[b.ease] || EASE.smoother)((t - a.t) / Math.max(1e-6, b.t - a.t));
    return { pos: mix(a.pos, b.pos, k), look: mix(a.look, b.look, k), shot, fov: lerp(a.fov || 0, b.fov || a.fov || 0, k) };
  }
  function prop(keys, t) { const i = at(keys, t), a = keys[i], b = keys[i + 1]; if (!b || t <= a.t) return a.v.slice(); return mix(a.v, b.v, (EASE[b.ease] || EASE.smooth)((t - a.t) / Math.max(1e-6, b.t - a.t))); }
  /** One actor at time t. A key without x / z stays where the previous key was. */
  function actor(keys, t) {
    let x = keys[0].x || 0, z = keys[0].z || 0, y = keys[0].y || 0, dist = 0; const held = { face: 0, arms: null, look: null, act: 'idle', lean: 0, drop: 0 }, pts = [];
    for (const k of keys) { if (k.x != null) x = k.x; if (k.z != null) z = k.z; if (k.y != null) y = k.y; pts.push({ t: k.t, x, z, y, jump: !!k.jump }); }
    const i = at(keys, t); for (let k = 0; k <= i; k++) for (const f of Object.keys(held)) if (keys[k][f] != null) held[f] = keys[k][f];
    for (let k = 0; k < i; k++) if (!pts[k + 1].jump) dist += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
    const a = pts[i], b = pts[i + 1]; let px = a.x, pz = a.z, py = a.y, walking = false, dir = null, speed = 0;
    if (b && !b.jump && t > a.t) { const u = clamp((t - a.t) / Math.max(1e-6, b.t - a.t)), d = Math.hypot(b.x - a.x, b.z - a.z); px = lerp(a.x, b.x, u); pz = lerp(a.z, b.z, u); py = lerp(a.y, b.y, EASE.smooth(u)); if (d > 1e-3) { walking = true; dist += d * u; dir = Math.atan2(b.x - a.x, b.z - a.z); speed = d / Math.max(1e-6, b.t - a.t); } }
    return { x: px, y: py, z: pz, walking, dist, dir, speed, ...held, actT: t - keys[i].t };
  }
  const visible = (lines, t) => { let n = -1; for (let i = 0; i < (lines || []).length; i++) if (lines[i].t <= t && t < (lines[i].t + (lines[i].dur ?? 1e9)) && (i + 1 >= lines.length || t < lines[i + 1].t)) n = i; return n; };
  function sample(scene, t) {
    t = clamp(t, 0, scene.duration); const actors = {}, props = {};
    for (const [id, a] of Object.entries(scene.actors || {})) actors[id] = actor(a.keys, t);
    // facing: walking direction, else an angle, a point or another actor
    for (const a of Object.values(actors)) { const f = a.face, p = typeof f === 'string' ? actors[f] && [actors[f].x, actors[f].z] : Array.isArray(f) ? f : null; a.ry = a.walking ? a.dir : p ? Math.atan2(p[0] - a.x, p[1] - a.z) : +f || 0; }
    for (const [id, keys] of Object.entries(scene.props || {})) props[id] = prop(keys, t);
    const bag = scene.bag ? scene.bag[at(scene.bag, t)] : null, li = visible(scene.lines, t);
    return { t, done: t >= scene.duration, camera: camera(scene.camera, t), actors, props, bag, lineIndex: li, line: li >= 0 ? scene.lines[li] : null };
  }
  /** Next time the timeline must stop and wait for a tap after time t (a line with hold), or Infinity. */
  const SETTLE = .9;
  function holdAfter(scene, t) { for (const l of scene.lines || []) if (l.hold && l.t + SETTLE > t - 1e-6) return l.t + SETTLE; return Infinity; }
  function validate(scene) {
    const e = [], sorted = (k, n) => { if (!k?.length) e.push(n + ' empty'); for (let i = 1; i < (k || []).length; i++) if (k[i].t < k[i - 1].t) e.push(n + ' keys not sorted'); };
    if (!(scene.duration > 0)) e.push('duration'); if (!scene.set) e.push('set'); sorted(scene.camera, 'camera');
    for (const c of scene.camera || []) if (c.pos?.length !== 3 || c.look?.length !== 3) e.push('camera key');
    for (const [id, a] of Object.entries(scene.actors || {})) { sorted(a.keys, id); if (!['fighter', 'bruno', 'brick'].includes(a.rig)) e.push(id + ' rig'); if (a.keys?.[0]?.x == null || a.keys?.[0]?.z == null) e.push(id + ' start'); }
    for (const [id, k] of Object.entries(scene.props || {})) sorted(k, id);
    let last = -1; for (const l of scene.lines || []) { for (const g of ['en', 'he', 'ru']) if (!l.text?.[g]) e.push('line ' + g); if (l.t <= last) e.push('lines not sorted'); last = l.t; if (l.t >= scene.duration) e.push('line past the end'); if (!scene.actors[l.who]) e.push('line speaker ' + l.who); if (/\bnobody\b/i.test(l.text?.en || '')) e.push('the Fighter is never called nobody'); }
    return e;
  }

  /* ---------------------------------------------------------------- places (set coordinates, see dream-sets.js) */
  const DOOR = [2.75, 4.5], GYM = [27, -6.7];      // where the Fighter stands after the bus; in front of Bruno's Gym door
  const F = [-.78, .8], B = [.78, .8], K = [2.35, .15]; // gym hall: Fighter, Bruno, Brick's mark
  const HALF = Math.PI / 2;

  const scenes = {
    /* Beat 0. Map dive, the bus pulls in, the Fighter steps off with his bag, looks up at the city, walks to Bruno's Gym. */
    dream_opening: {
      set: 'dream_street', intro: 'map', duration: 31.5, chapter: 1, outfit: { fighter: 'street' }, bag: [{ t: 0, on: 'shoulder' }],
      camera: [
        { t: 0, pos: [-24, 40, 5], look: [-2, 0, 3] },                                        // down from the sky
        { t: 4.6, pos: [8.4, 2.6, 9.8], look: [1.2, 1.5, 2.6] },
        { t: 7.2, pos: [7.6, 1.55, 9.2], look: [2.2, 1.35, 3.0], ease: 'smooth' },            // the bus has stopped, doors open
        { t: 9.6, pos: [7.0, 1.5, 8.4], look: [2.6, 1.3, 4.0], ease: 'smooth' },
        { t: 9.6, cut: true, pos: [5.5, .95, 6.5], look: [2.85, 1.72, 4.45] },       // low on his face: he looks up at the city
        { t: 12.4, pos: [5.2, 1.0, 6.2], look: [2.85, 1.76, 4.45], fov: 33, ease: 'linear' },
        { t: 12.4, cut: true, pos: [.3, 2.05, 5.5], look: [24, 6.5, -7] },                   // over his shoulder: the street, the towers
        { t: 15.6, pos: [1.0, 2.3, 5.3], look: [26, 8, -8], ease: 'linear' },
        { t: 15.6, cut: true, pos: [6.6, 1.25, .8], look: [3.9, 1.15, 5.4] },                 // walk 1: from the road, he passes
        { t: 19.2, pos: [9.8, 1.25, .8], look: [8.1, 1.15, 7.0], ease: 'linear' },
        { t: 19.2, cut: true, pos: [20.4, 1.5, 8.0], look: [15.8, 1.25, 7.1] },               // walk 2: ahead of him, walking backwards
        { t: 22.6, pos: [24.4, 1.5, 8.0], look: [20.0, 1.25, 7.1], ease: 'linear' },
        { t: 22.6, cut: true, pos: [17.2, 2.5, 6.0], look: [22.6, 1.0, -2.5] },                // the crossing
        { t: 26.2, pos: [18.4, 2.2, 4.4], look: [24.2, 1.1, -5], ease: 'linear' },
        { t: 26.2, cut: true, pos: [24.2, 1.2, -1.6], look: [26.6, 2.3, -8] },                // the gym: door and sign over his shoulder
        { t: 31.5, pos: [25.0, 1.45, -2.6], look: [26.9, 2.5, -8], ease: 'smooth' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: 2.75, z: 2.5, y: .26, act: 'off', face: 0, arms: { R: 'strap' } },
          { t: 7.3, act: 'idle', face: 0 },
          { t: 7.9, x: 2.75, z: 2.5, y: .26 },
          { t: 8.75, x: 2.75, z: 3.55, y: .0 },                                               // one step down to the kerb
          { t: 9.5, x: DOOR[0], z: DOOR[1], face: [30, -6], look: { yaw: 0, pitch: .12 } },
          { t: 10.2, look: { yaw: -.25, pitch: .34 } },                                        // up at the towers
          { t: 11.6, look: { yaw: .3, pitch: .3 } },
          { t: 13.2, look: { yaw: 0, pitch: .3 } },
          { t: 14.8, look: { yaw: 0, pitch: .05 }, arms: { R: 'strap' } },
          { t: 15.6, x: 3.5, z: 5.0 },
          { t: 19.2, x: 7.6, z: 6.9 },
          { t: 19.2, x: 15.4, z: 7.1, jump: true },
          { t: 22.6, x: 19.65, z: 7.1 },
          { t: 22.6, x: 21.5, z: 2.9, jump: true },
          { t: 26.2, x: 23.4, z: -1.2, look: { yaw: .2, pitch: .1 } },
          { t: 26.2, x: 24.9, z: -3.3, jump: true },
          { t: 29.4, x: GYM[0] - .25, z: GYM[1] + .15, face: [27, -9], look: { yaw: 0, pitch: .05 } },
          { t: 29.9, look: { yaw: 0, pitch: .4 } }                                              // up at the sign
        ] }
      },
      props: {
        bus: [{ t: 0, v: [-62] }, { t: 2.2, v: [-40] }, { t: 6.7, v: [-1], ease: 'out' }, { t: 10.6, v: [-1] }, { t: 15.4, v: [70], ease: 'in' }],
        doors: [{ t: 0, v: [0] }, { t: 6.8, v: [0] }, { t: 7.4, v: [1] }, { t: 9.9, v: [1] }, { t: 10.5, v: [0] }]
      },
      lines: []
    },

    /* Beat 1. The gym hall. He has no money, one bag and a dream. "Words are cheap. Show me." Brick steps forward. */
    dream_gym_talk: {
      set: 'dream_gym', duration: 44, chapter: 1, tap: true, outfit: { fighter: 'street' },
      bag: [{ t: 0, on: 'shoulder' }, { t: 4.2, on: 'floor', at: [-1.5, .55, .5] }],
      camera: [
        { t: 0, pos: [-1.2, 2.3, 8.6], look: [.6, 1.25, -1.5] },                               // the hall: ring, bags, Bruno
        { t: 4.2, pos: [.2, 1.75, 6.4], look: [.2, 1.3, .6], ease: 'smooth' },
        { t: 4.2, cut: true, pos: [0, 1.5, 4.9], look: [0, 1.3, .8] },                         // two-shot
        { t: 8, pos: [0, 1.5, 4.7], look: [0, 1.3, .8], ease: 'linear' },
        { t: 8, cut: true, pos: [1.75, 1.72, 2.25], look: [-.9, 1.62, .7], fov: 30 },          // over Bruno's shoulder, on the Fighter
        { t: 12, pos: [1.7, 1.72, 2.3], look: [-.9, 1.62, .7], fov: 30, ease: 'linear' },
        { t: 12, cut: true, pos: [-1.8, 1.7, 2.2], look: [.9, 1.66, .7], fov: 30 },            // over the Fighter's shoulder, on Bruno
        { t: 16, pos: [-1.75, 1.7, 2.25], look: [.9, 1.66, .7], fov: 30, ease: 'linear' },
        { t: 16, cut: true, pos: [1.75, 1.72, 2.25], look: [-.9, 1.62, .7], fov: 30 },
        { t: 20, pos: [1.6, 1.72, 2.1], look: [-.9, 1.66, .7], fov: 27, ease: 'linear' },
        { t: 20, cut: true, pos: [-1.8, 1.7, 2.2], look: [.9, 1.66, .7], fov: 30 },
        { t: 24, pos: [-1.8, 1.7, 2.2], look: [.9, 1.66, .7], fov: 30, ease: 'linear' },
        { t: 24, cut: true, pos: [.2, 1.3, 2.9], look: [-.8, 1.7, .8], fov: 28 },              // low and close: "world champion"
        { t: 32, pos: [.1, 1.3, 2.7], look: [-.8, 1.72, .8], fov: 26, ease: 'linear' },
        { t: 32, cut: true, pos: [-1.5, 1.68, 2.5], look: [.9, 1.68, .7], fov: 28 },           // "Words are cheap. Show me."
        { t: 36, pos: [-1.45, 1.68, 2.4], look: [.9, 1.68, .7], fov: 27, ease: 'linear' },
        { t: 36, cut: true, pos: [-.6, 1.45, 5.4], look: [1.1, 1.3, .2] },                     // wide: Brick comes over
        { t: 40, pos: [-.3, 1.45, 5.0], look: [1.1, 1.3, .3], ease: 'smooth' },
        { t: 40, cut: true, pos: [-.2, 1.25, 2.3], look: [2.3, 1.72, .2], fov: 30 },           // Brick, from below
        { t: 44, pos: [-.1, 1.25, 2.2], look: [2.3, 1.74, .2], fov: 28, ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: -5.6, z: 3.4, arms: { R: 'strap' }, look: { yaw: .5, pitch: .1 } },
          { t: 3.9, x: F[0], z: F[1], face: 'bruno', look: 'bruno' },
          { t: 4.2, arms: {} },
          { t: 8, arms: { R: 'open' } },                                                       // "To train."
          { t: 12, arms: {} },
          { t: 16, arms: { L: 'open', R: 'open' } },                                           // "No money. One bag. A dream."
          { t: 20, arms: {} },
          { t: 24, arms: {}, look: { yaw: 0, pitch: .12 } },                                   // "World champion."
          { t: 28, arms: { R: 'fist' }, look: 'bruno' },                                       // "I'll do whatever is needed."
          { t: 32, arms: {} },
          { t: 37.5, look: 'brick' }, { t: 40, face: 'brick', arms: {} }
        ] },
        bruno: { rig: 'bruno', keys: [
          { t: 0, x: B[0], z: B[1], face: [3.6, -2.2], arms: { L: 'hips', R: 'hips' }, look: { yaw: 0, pitch: 0 } },
          { t: 2.6, look: { yaw: -1, pitch: 0 } },
          { t: 3.4, face: 'fighter', look: 'fighter', arms: { L: 'cross', R: 'cross2' } },    // "What do you want?"
          { t: 12, arms: { L: 'cross', R: 'chin' } },                                          // "Training costs money."
          { t: 16, arms: { L: 'cross', R: 'cross2' } },
          { t: 20, arms: { L: 'hips', R: 'open' } },                                           // "Everybody has a dream. What's yours?"
          { t: 24, arms: { L: 'hips', R: 'hips' } },
          { t: 32, arms: { L: 'hips', R: 'point' } },                                          // "Words are cheap. Show me."
          { t: 36, arms: { L: 'hips', R: 'thumb' }, look: { yaw: .9, pitch: 0 } },             // "Brick!"
          { t: 38.5, arms: { L: 'cross', R: 'cross2' }, look: 'fighter' }
        ] },
        brick: { rig: 'brick', keys: [
          { t: 0, x: 4.3, z: -2.1, face: [5.6, -2.5], act: 'box' },
          { t: 36.4, act: 'idle', face: 'fighter', look: 'fighter' },
          { t: 37, x: 4.3, z: -2.1 },
          { t: 39.4, x: K[0], z: K[1], face: 'fighter', arms: { L: 'pound', R: 'pound' } },
          { t: 42.2, arms: { L: 'pound', R: 'point' } }
        ] }
      },
      props: {},
      lines: [
        { t: 4.4, who: 'bruno', hold: true, text: L('The gym is closed to strangers. What do you want?', 'האולם סגור לזרים. מה אתם רוצים?', 'Зал закрыт для чужих. Чего тебе?') },
        { t: 8.2, who: 'fighter', hold: true, text: L('To train. I just got off the bus.', 'להתאמן. הרגע ירדתי מהאוטובוס.', 'Тренироваться. Я только с автобуса.') },
        { t: 12.2, who: 'bruno', hold: true, text: L('Training costs money.', 'אימונים עולים כסף.', 'Тренировки стоят денег.') },
        { t: 16.2, who: 'fighter', hold: true, text: L('I have no money. One bag. And a dream.', 'אין לי כסף. יש לי תיק אחד. וחלום.', 'Денег нет. Одна сумка. И мечта.') },
        { t: 20.2, who: 'bruno', hold: true, text: L('Everybody has a dream. What is yours?', 'לכולם יש חלום. מה שלכם?', 'Мечта есть у всех. Какая твоя?') },
        { t: 24.2, who: 'fighter', hold: true, text: L('World champion.', 'אלוף העולם.', 'Чемпион мира.') },
        { t: 28.2, who: 'fighter', hold: true, text: L("I'll do whatever is needed.", 'אעשה כל מה שצריך.', 'Я сделаю всё, что нужно.') },
        { t: 32.2, who: 'bruno', hold: true, text: L('Words are cheap. Show me.', 'מילים זה זול. תראו לי.', 'Слова дёшевы. Покажи.') },
        { t: 36.2, who: 'bruno', dur: 3.4, text: L('Brick! Come here.', 'בריק! בוא לכאן.', 'Брик! Иди сюда.') },
        { t: 40.2, who: 'brick', hold: true, text: L("This one? He won't last a minute.", 'זה? דקה אחת, לא יותר.', 'Этот? Он и минуты не простоит.') }
      ]
    }
  };

  /* Beat 2, after the fight. Bruno's job offer; the loss is the expected story, a win is remembered. */
  function afterBrick(win) {
    return {
      set: 'dream_gym', duration: 24, chapter: 1, tap: true, outcome: win ? 'win' : 'loss', outfit: { fighter: 'kit' },
      camera: [
        { t: 0, pos: [-.3, 1.2, 4.6], look: [.2, 1.15, .7] },
        { t: 4, pos: [0, 1.5, 4.5], look: [0, 1.3, .8], ease: 'smooth' },
        { t: 4, cut: true, pos: [-1.8, 1.7, 2.2], look: [.9, 1.66, .7], fov: 30 },
        { t: 8, pos: [-1.75, 1.7, 2.2], look: [.9, 1.66, .7], fov: 29, ease: 'linear' },
        { t: 8, cut: true, pos: [1.75, 1.72, 2.25], look: [-.9, 1.6, .7], fov: 30 },
        { t: 12, pos: [1.7, 1.72, 2.2], look: [-.9, 1.62, .7], fov: 29, ease: 'linear' },
        { t: 12, cut: true, pos: [-1.6, 1.68, 2.4], look: [.9, 1.66, .7], fov: 29 },
        { t: 20, pos: [-1.5, 1.68, 2.3], look: [.9, 1.66, .7], fov: 28, ease: 'linear' },
        { t: 20, cut: true, pos: [0, 1.5, 4.6], look: [0, 1.3, .8] },
        { t: 24, pos: [0, 1.5, 4.9], look: [0, 1.3, .8], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: win ? [
          { t: 0, x: F[0], z: F[1], face: 'bruno', look: 'bruno', act: 'idle', lean: .04 },
          { t: 8, arms: { R: 'fist' } }, { t: 12, arms: {} }, { t: 20, arms: { R: 'fist' } }
        ] : [
          { t: 0, x: F[0], z: F[1], face: 'bruno', act: 'tired', lean: .34, drop: .1, look: { yaw: 0, pitch: -.3 } },
          { t: 2.2, lean: .12, drop: 0, look: 'bruno' },                                       // he straightens up
          { t: 8, arms: { R: 'fist' }, lean: .05 }, { t: 12, arms: {}, lean: .03 }, { t: 20, arms: { R: 'fist' } }
        ] },
        bruno: { rig: 'bruno', keys: [
          { t: 0, x: 3.0, z: 1.6, look: 'fighter', arms: {} },
          { t: 2.8, x: B[0], z: B[1], face: 'fighter', arms: win ? { L: 'hips', R: 'chin' } : { L: 'hips', R: 'hips' } },
          { t: 4, arms: { L: 'hips', R: 'open' } }, { t: 8, arms: { L: 'hips', R: 'hips' } },
          { t: 12, arms: { L: 'hips', R: 'point' } }, { t: 16, arms: { L: 'hips', R: 'thumb' } }, { t: 20, arms: { L: 'cross', R: 'cross2' } }
        ] },
        brick: { rig: 'brick', keys: [{ t: 0, x: 3.9, z: -1.2, face: 'fighter', look: 'fighter', arms: win ? {} : { L: 'pound', R: 'pound' }, lean: win ? .1 : 0 }] }
      },
      props: {},
      lines: win ? [
        { t: 4.2, who: 'bruno', hold: true, text: L('You beat Brick. On your first day.', 'ניצחתם את בריק. ביום הראשון.', 'Ты побил Брика. В первый же день.') },
        { t: 8.2, who: 'fighter', hold: true, text: L('I told you. Whatever is needed.', 'אמרתי לכם. כל מה שצריך.', 'Я же сказал. Всё, что нужно.') },
        { t: 12.2, who: 'bruno', hold: true, text: L('Then listen. I need someone to clean this gym.', 'אז תקשיבו. אני צריך מישהו שינקה את האולם.', 'Тогда слушай. Мне нужен тот, кто будет убирать зал.') },
        { t: 16.2, who: 'bruno', hold: true, text: L('There is a bed in the store room. You start tomorrow.', 'יש מיטה במחסן. מתחילים מחר.', 'В кладовой есть койка. Начнёшь завтра.') },
        { t: 20.2, who: 'fighter', hold: true, text: L('Thank you, Coach.', 'תודה, מאמן.', 'Спасибо, тренер.') }
      ] : [
        { t: 4.2, who: 'bruno', hold: true, text: L('You got up. That I can work with.', 'קמתם. עם זה אפשר לעבוד.', 'Ты встал. С этим можно работать.') },
        { t: 8.2, who: 'fighter', hold: true, text: L('Again. I can do better.', 'שוב. אני יכול יותר.', 'Ещё раз. Я могу лучше.') },
        { t: 12.2, who: 'bruno', hold: true, text: L('Not today. I need someone to clean this gym.', 'לא היום. אני צריך מישהו שינקה את האולם.', 'Не сегодня. Мне нужен тот, кто будет убирать зал.') },
        { t: 16.2, who: 'bruno', hold: true, text: L('There is a bed in the store room. You start tomorrow.', 'יש מיטה במחסן. מתחילים מחר.', 'В кладовой есть койка. Начнёшь завтра.') },
        { t: 20.2, who: 'fighter', hold: true, text: L('Thank you, Coach.', 'תודה, מאמן.', 'Спасибо, тренер.') }
      ]
    };
  }
  scenes.dream_after_brick = afterBrick(false);
  const variants = { dream_after_brick: { loss: scenes.dream_after_brick, win: afterBrick(true) } };
  const variant = (id, outcome) => variants[id]?.[outcome] || scenes[id] || null;

  const api = { scenes, variant, sample, validate, holdAfter, camera, actor, prop, EASE, SETTLE, ids: Object.keys(scenes), places: { DOOR, GYM, F, B, K } };
  if (typeof module !== 'undefined') module.exports = api; else window.DreamCore = api;
})();
