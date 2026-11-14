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
 * DreamCore.variant(id, outcome) -> the scene for an outcome ('dream_after_brick': 'loss' | 'win').
 * DreamCore.withCity(scene) -> the scene re-staged for the city models when it has a city part (GOTR-0089), else the same.
 * DreamCore.register({ id: scene }) adds scenes from another file (market-core.js); DreamCore.ids lists them all. */
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
    return { pos: mix(a.pos, b.pos, k), look: mix(a.look, b.look, k), shot, fov: a.fov || b.fov ? lerp(a.fov || 36, b.fov || a.fov || 36, k) : 0 }; // a key without fov is the normal lens (36), not 0 (GOTR-0097: the face shot opened on an extreme zoom)
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
  const RIGS = ['fighter', 'bruno', 'brick', 'fang', 'hazel', 'otto']; // story-cast.js + cast-market.js (GOTR-0092)
  function validate(scene) {
    const e = [], sorted = (k, n) => { if (!k?.length) e.push(n + ' empty'); for (let i = 1; i < (k || []).length; i++) if (k[i].t < k[i - 1].t) e.push(n + ' keys not sorted'); };
    if (!(scene.duration > 0)) e.push('duration'); if (!scene.set) e.push('set'); sorted(scene.camera, 'camera');
    for (const c of scene.camera || []) if (c.pos?.length !== 3 || c.look?.length !== 3) e.push('camera key');
    for (const [id, a] of Object.entries(scene.actors || {})) { sorted(a.keys, id); if (!RIGS.includes(a.rig)) e.push(id + ' rig'); if (a.keys?.[0]?.x == null || a.keys?.[0]?.z == null) e.push(id + ' start'); }
    for (const [id, k] of Object.entries(scene.props || {})) sorted(k, id);
    let last = -1; for (const l of scene.lines || []) { for (const g of ['en', 'he', 'ru']) if (!l.text?.[g]) e.push('line ' + g); if (l.t <= last) e.push('lines not sorted'); last = l.t; if (l.t >= scene.duration) e.push('line past the end'); if (!scene.actors[l.who]) e.push('line speaker ' + l.who); if (/\bnobody\b/i.test(l.text?.en || '')) e.push('the Fighter is never called nobody'); }
    return e;
  }

  /* ---------------------------------------------------------------- places (set coordinates, see dream-sets.js) */
  const DOOR = [2.75, 4.5], GYM = [27, -6.7];      // where the Fighter stands after the bus; in front of Bruno's Gym door
  const F = [-.78, .8], B = [.78, .8], K = [2.35, .15]; // gym hall: Fighter, Bruno, Brick's mark
  const HALF = Math.PI / 2;

  /* GOTR-0089: the same film when Codex's bus model is in the street (adventure/story/city-assets.js). The model is turned
   * half a turn (its doors are on its left), so it drives in toward -x and stops with the front door at the same spot (x 2.75):
   * wrapper x = 2.75 + 4.49. The real door clip (open 0-1.3 s, hold to 3.0 s, shut by 4.33 s) runs on the film clock and is
   * fully open before the Fighter moves; he steps from the entry floor (y 0.57) over the tread to the kerb marker (z 3.85). */
  const BUS_STOP = 2.75 + 4.49;
  const CITY_OPENING = {
    props: {
      bus: [{ t: 0, v: [BUS_STOP + 56.6] }, { t: 2.2, v: [BUS_STOP + 28.6], ease: 'linear' }, { t: 6.7, v: [BUS_STOP], ease: 'out' }, { t: 10.7, v: [BUS_STOP] }, { t: 15.4, v: [BUS_STOP - 71], ease: 'in' }],
      doorClip: [{ t: 0, v: [0] }, { t: 6.7, v: [0] }, { t: 7.6, v: [1.3], ease: 'linear' }, { t: 9.3, v: [3.0], ease: 'linear' }, { t: 10.63, v: [4.33], ease: 'linear' }] // opens once stopped, fully open before his first step (GOTR-0097)
    },
    // GOTR-0097: one even walk from the floor marker over the kerb marker to the door spot (1.14 m/s, a careful step down).
    // Unseen in the bus he takes his last half step to the door (2.01 -> 2.5): that sets the step phase so the right foot
    // lands on the entry tread and the left one on the pavement; the feet find the steps through `ground`
    fighter: [
      { t: 0, x: 2.75, z: 2.01, y: .57, act: 'off', face: 0, arms: { R: 'strap' } },
      { t: 6.9, x: 2.75, z: 2.01 },
      { t: 7.25, x: 2.75, z: 2.5 },
      { t: 7.3, act: 'idle', face: 0 },
      { t: 7.7, x: 2.75, z: 2.5, y: .57 },                                                // the floor marker
      { t: 8.88, x: 2.75, z: 3.85, y: 0 },                                                // the kerb marker
      { t: 9.45, x: 2.75, z: 4.5, y: 0 }
    ],
    // what the feet stand on (world boxes, the highest wins; elsewhere the pavement, y 0): the bus floor and its entry tread
    // (bus model markers: floor y 0.57 to z ~2.85, tread y 0.26 to the body side at z 3.15), the road (y -0.15) between the kerbs
    ground: [{ x: [-70, 110], z: [-3.56, 3.45], y: -.15 }, { x: [1.6, 3.9], z: [.7, 2.85], y: .57, until: 10.7 }, { x: [2.15, 3.35], z: [2.85, 3.15], y: .26, until: 10.7 }],
    // the arrival shot sits further along the kerb (the model bus is longer, its door near its front) and stays clear of
    // the Old Town façades and awnings at z 9.4 (the old camera stood in the house fronts at z 10.4)
    camera: { 1: { pos: [11.2, 2.5, 9.1], look: [2.6, 1.5, 3.2] }, 2: { pos: [10.0, 1.75, 9.1], look: [3.7, 1.4, 3.3] }, 3: { pos: [8.5, 1.6, 8.9], look: [3.3, 1.3, 4.0] } }
  };
  /** The film with the city models: the bus props and the Fighter's step-off replaced, everything after 9.5 s unchanged. */
  function withCity(scene) {
    const c = scene?.city; if (!c) return scene;
    const fighter = scene.actors.fighter, rest = fighter.keys.filter(k => k.t >= 9.5);
    return { ...scene, cityCut: true, ground: c.ground || scene.ground, props: { ...scene.props, ...c.props }, actors: { ...scene.actors, fighter: { ...fighter, keys: [...c.fighter, ...rest] } }, camera: c.camera ? scene.camera.map((k, i) => c.camera[i] ? { ...k, ...c.camera[i] } : k) : scene.camera };
  }

  /** Height of the ground at world (x, z) at scene time t: the highest `ground` box there, else the pavement (0). */
  function groundAt(scene, x, z, t = 0) { let y = null; for (const g of scene?.ground || []) if (x >= g.x[0] && x <= g.x[1] && z >= g.z[0] && z <= g.z[1] && !(t > g.until)) y = y == null ? g.y : Math.max(y, g.y); return y ?? 0; }

  const scenes = {
    /* Beat 0. Map dive, the bus pulls in, the Fighter steps off with his bag, looks up at the city, walks to Bruno's Gym. */
    dream_opening: {
      set: 'dream_street', place: 'street', intro: 'map', duration: 31.5, chapter: 1, outfit: { fighter: 'street' }, bag: [{ t: 0, on: 'shoulder' }],
      camera: [
        { t: 0, pos: [-24, 40, 5], look: [-2, 0, 3] },                                        // down from the sky
        { t: 4.6, pos: [9.6, 2.7, 10.4], look: [.4, 1.5, 3.4] },
        { t: 7.2, pos: [8.2, 1.6, 9.4], look: [1.9, 1.35, 3.2], ease: 'smooth' },            // the bus has stopped, doors open
        { t: 9.6, pos: [7.0, 1.5, 8.4], look: [2.6, 1.3, 4.0], ease: 'smooth' },
        { t: 9.6, cut: true, pos: [5.9, 1.2, 6.9], look: [2.85, 1.68, 4.45], fov: 17 }, // low on his face: he looks up at the city (slow pull-out to 33)
        { t: 12.4, pos: [5.6, 1.2, 6.6], look: [2.85, 1.72, 4.45], fov: 33, ease: 'linear' },
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
          { t: 22.6, x: 21.5, z: 2.9, y: -.15, jump: true },                                // on the road (GOTR-0089: not 15 cm above it)
          { t: 26.2, x: 23.4, z: -1.2, look: { yaw: .2, pitch: .1 } },
          { t: 26.2, x: 24.9, z: -3.3, jump: true },
          { t: 26.52, x: 25.08, z: -3.62, y: .0 },                                            // up the far kerb
          { t: 29.4, x: GYM[0] - .25, z: GYM[1] + .15, face: [27, -9], look: { yaw: 0, pitch: .05 } },
          { t: 29.9, look: { yaw: 0, pitch: .4 } }                                              // up at the sign
        ] }
      },
      props: {
        bus: [{ t: 0, v: [-62] }, { t: 2.2, v: [-40] }, { t: 6.7, v: [-1], ease: 'out' }, { t: 10.6, v: [-1] }, { t: 15.4, v: [70], ease: 'in' }],
        doors: [{ t: 0, v: [0] }, { t: 6.8, v: [0] }, { t: 7.4, v: [1] }, { t: 9.9, v: [1] }, { t: 10.5, v: [0] }]
      },
      lines: [],
      ground: [{ x: [-70, 110], z: [-3.56, 3.45], y: -.15 }, { x: [-6.4, 4.4], z: [.65, 3.2], y: .26, until: 10.7 }], // road; the generated bus floor (GOTR-0097)
      city: CITY_OPENING
    },

    /* Beat 1. The gym hall. He has no money, one bag and a dream. "Words are cheap. Show me." Brick steps forward. */
    dream_gym_talk: {
      set: 'dream_gym', place: 'gym', duration: 44, chapter: 1, tap: true, outfit: { fighter: 'street' },
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
        { t: 36, cut: true, pos: [-.2, 1.5, 6.6], look: [.9, 1.25, .2] },                     // wide: Brick comes over
        { t: 40, pos: [0, 1.5, 6.2], look: [.8, 1.25, .3], ease: 'smooth' },
        { t: 40, cut: true, pos: [.55, 1.3, 3.0], look: [2.2, 1.6, .2], fov: 32 },           // Brick, from below
        { t: 44, pos: [.6, 1.3, 2.85], look: [2.2, 1.62, .2], fov: 30, ease: 'linear' }
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
        // GOTR-0084: spoken as people talk (owner). Same voices as adventure/story.js dream_gym_talk / first_brick.
        { t: 4.4, who: 'bruno', hold: true, text: L("Gym's closed, kid. Looking for someone?", 'סגור, ילד. מחפש מישהו?', 'Закрыто, парень. Ищешь кого-то?') },
        { t: 8.2, who: 'fighter', hold: true, text: L('Are you Bruno? I just got off the bus!', 'אתה ברונו? הרגע ירדתי מהאוטובוס!', 'Вы Бруно? Я только с автобуса!') },
        { t: 12.2, who: 'bruno', hold: true, text: L("That's me. What do you want?", 'זה אני. מה אתה רוצה?', 'Ну, я. Чего хотел?') },
        { t: 16.2, who: 'fighter', hold: true, text: L('I came here to become a champion!', 'באתי לפה להיות אלוף!', 'Я приехал стать чемпионом!') },
        { t: 20.2, who: 'bruno', hold: true, text: L('You and half the city. Got money for training?', 'אתה וחצי עיר. יש לך כסף לאימונים?', 'Ты и полгорода. Деньги на тренировки есть?') },
        { t: 24.2, who: 'fighter', hold: true, text: L("No. Not a coin. But I'll do whatever it takes.", 'לא. אפילו לא שקל. אבל אעשה כל מה שצריך.', 'Нет. Ни копейки. Но я сделаю всё что угодно.') },
        { t: 28.2, who: 'fighter', hold: true, text: L('Sweep, carry, anything. The best started here!', 'לטאטא, לסחוב, הכול. הכי טובים התחילו פה!', 'Подмету, потаскаю, что скажете. Лучшие начинали здесь!') },
        { t: 32.2, who: 'bruno', hold: true, text: L('They did. The rest quit in a week. Talk is free.', 'נכון. השאר נשברו אחרי שבוע. דיבורים זה בחינם.', 'Начинали. Остальные сдувались за неделю. Болтать — дело нехитрое.') },
        { t: 36.2, who: 'bruno', hold: true, text: L("Brick, glove up. Let's see what he's made of.", 'בריק, תעלה כפפות. בוא נראה ממה הוא עשוי.', 'Брик, перчатки. Посмотрим, из чего он сделан.') },
        { t: 40.2, who: 'brick', hold: true, text: L("This one? He won't last a minute.", 'זה? הוא לא יחזיק דקה.', 'Этот? Да он и минуты не продержится.') }
      ]
    }
  };

  /* Beat 2, after the fight. Bruno's job offer; the loss is the expected story, a win is remembered. */
  function afterBrick(win) {
    return {
      set: 'dream_gym', place: 'gym', duration: 24, chapter: 1, tap: true, outcome: win ? 'win' : 'loss', outfit: { fighter: 'kit' },
      camera: [
        { t: 0, pos: [-1.0, 1.25, 4.3], look: [-.55, 1.2, .8] },
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
      // GOTR-0084: the job offer as a deal (clean, errands, a bed in the back; Bruno trains him). Win: Brick wants a rematch.
      lines: win ? [
        { t: 1.0, who: 'brick', hold: true, text: L('That was luck! I want a rematch. Now!', 'זה היה מזל! אני רוצה קרב חוזר. עכשיו!', 'Это случайность! Требую реванш. Сейчас же!') },
        { t: 4.2, who: 'bruno', hold: true, text: L('You beat Brick. On day one. Huh.', 'ניצחת את בריק. ביום הראשון. מעניין.', 'Побил Брика. В первый же день. Ну надо же.') },
        { t: 8.2, who: 'fighter', hold: true, text: L('I told you. Whatever it takes!', 'אמרתי לך. כל מה שצריך!', 'Я же говорил. Всё что угодно!') },
        { t: 12.2, who: 'bruno', hold: true, text: L("Then here's the deal. No pay.", 'אז הנה העסקה. בלי משכורת.', 'Тогда уговор такой. Без зарплаты.') },
        { t: 16.2, who: 'bruno', hold: true, text: L('You clean, run errands, sleep in the back. I train you.', 'אתה מנקה, עושה סידורים, ישן מאחור. אני מאמן אותך.', 'Ты убираешь, бегаешь по делам, спишь в подсобке. Я тренирую.') },
        { t: 20.2, who: 'fighter', hold: true, text: L('Deal! When do we start?', 'סגרנו! מתי מתחילים?', 'Договорились! Когда начинаем?') },
        { t: 22.4, who: 'bruno', hold: true, text: L("You already did. Mop's over there.", 'כבר התחלת. המגב שם.', 'Уже начали. Швабра вон там.') }
      ] : [
        { t: 4.2, who: 'bruno', hold: true, text: L('You lost. But you kept getting up.', 'הפסדת. אבל קמת כל פעם מחדש.', 'Проиграл. Но каждый раз вставал.') },
        { t: 8.2, who: 'fighter', hold: true, text: L('Let me go again. I can do better!', 'תן לי עוד סיבוב. אני יכול יותר טוב!', 'Дайте ещё раунд. Я могу лучше!') },
        { t: 12.2, who: 'bruno', hold: true, text: L("That I can work with. Here's the deal.", 'עם זה אני יכול לעבוד. הנה העסקה.', 'С этим можно работать. Уговор такой.') },
        { t: 16.2, who: 'bruno', hold: true, text: L('You clean, run errands, sleep in the back. I train you.', 'אתה מנקה, עושה סידורים, ישן מאחור. אני מאמן אותך.', 'Ты убираешь, бегаешь по делам, спишь в подсобке. Я тренирую.') },
        { t: 20.2, who: 'fighter', hold: true, text: L('Deal! When do we start?', 'סגרנו! מתי מתחילים?', 'Договорились! Когда начинаем?') },
        { t: 22.4, who: 'bruno', hold: true, text: L("You already did. Mop's over there.", 'כבר התחלת. המגב שם.', 'Уже начали. Швабра вон там.') }
      ]
    };
  }
  scenes.dream_after_brick = afterBrick(false);
  const variants = { dream_after_brick: { loss: scenes.dream_after_brick, win: afterBrick(true) } };
  const variant = (id, outcome) => variants[id]?.[outcome] || scenes[id] || null;

  /** More scenes from another file (market-core.js, beats 5-7, GOTR-0096): they play through the same player. */
  const register = more => { Object.assign(scenes, more); return Object.keys(scenes); };
  const api = { scenes, variant, withCity, groundAt, BUS_STOP, sample, validate, holdAfter, camera, actor, prop, EASE, SETTLE, RIGS, register, get ids() { return Object.keys(scenes); }, places: { DOOR, GYM, F, B, K } };
  if (typeof module !== 'undefined') module.exports = api; else window.DreamCore = api;
})();
