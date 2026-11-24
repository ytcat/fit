/* Free walk across the whole of Gloryland (GOTR-0118): the pure rules, shared by the game (free-walk.js, free-walk-town.js)
 * and the node tests (tests/free-walk.test.cjs). No THREE, no DOM.
 *
 *   FreeWalkCore.COPY / text(lang, key, vars)      every visible word in EN / HE / RU (the player's language setting;
 *                                                  the layout stays left-to-right in every language, owner 2026-11-23)
 *   FreeWalkCore.walkGrid(heights, nx, nz, opts)   which cells of the town height field a person can stand on
 *   FreeWalkCore.grid(spec)                        { allowed(x, z), height(x, z), nearest(x, z), move(state, x, z, dt, blocked) }
 *   FreeWalkCore.saveKey(profileId) / serialize(state) / restore(raw, grid, fallback)   the walk's own save (never the game save)
 *   FreeWalkCore.district(x, z, places)            the district a point is in (nearest landmark within its reach)
 *   FreeWalkCore.carStep(car, dt, player, ahead)   one car on one lane: cruise, brake for a person or a car in its path
 *   FreeWalkCore.STORY_TARGETS / storyTarget(step) where a Chapter 1 step happens (a waypoint only: walking never plays a step)
 * World: metres, x east, z south, y up (the map's own axes, 3 m per map unit, the scale of the story sets). */
(function (root) {
  'use strict';
  const L = (en, he, ru) => ({ en, he, ru });
  const COPY = {
    title: L('Free walk', 'הליכה חופשית', 'Свободная прогулка'),
    loading: L('Building the town…', 'בונים את העיר…', 'Строим город…'),
    failed: L('Free walk could not start on this device.', 'לא ניתן להתחיל הליכה חופשית במכשיר הזה.', 'Свободная прогулка не запускается на этом устройстве.'),
    lost: L('The view stopped. Close and open the walk again.', 'התצוגה נעצרה. סגרו ופתחו שוב את ההליכה.', 'Изображение остановилось. Закройте и снова откройте прогулку.'),
    help: L('Walk anywhere in town. Missions do not start or change here.', 'אפשר ללכת לכל מקום בעיר. משימות לא מתחילות ולא משתנות כאן.', 'Гуляйте по всему городу. Задания здесь не начинаются и не меняются.'),
    exit: L('Map', 'מפה', 'Карта'),
    exitLabel: L('Back to the town map', 'חזרה למפת העיר', 'Назад к карте города'),
    walkTo: L('Walk to', 'ללכת אל', 'Идти к'),
    none: L('No destination', 'ללא יעד', 'Без цели'),
    arrived: L('You are here', 'הגעת', 'Вы на месте'),
    metres: L('{n} m', '{n} מ׳', '{n} м'),
    noRoute: L('No path from here', 'אין דרך מכאן', 'Отсюда не пройти'),
    storyReturn: L('Back to the story mission', 'חזרה למשימת הסיפור', 'Вернуться к заданию'),
    stick: L('Movement stick (arrow keys or WASD)', 'ג׳ויסטיק תנועה (חצים או WASD)', 'Стик движения (стрелки или WASD)'),
    zoomIn: L('Zoom in', 'התקרבות', 'Приблизить'),
    zoomOut: L('Zoom out', 'התרחקות', 'Отдалить'),
    day: L('Day', 'יום', 'День'),
    night: L('Night', 'לילה', 'Ночь'),
    outskirts: L('Gloryland', 'גלורילנד', 'Глориленд'),
    walkHere: L('Walk here', 'ללכת כאן', 'Пройтись здесь'),
    freeWalk: L('Free walk', 'הליכה חופשית', 'Прогулка'),
    freeWalkHint: L('Walk anywhere in town. No missions start.', 'הליכה בכל העיר. משימות לא מתחילות.', 'Прогулка по городу. Задания не начинаются.'),
    // story waypoints (Chapter 1): places, not steps
    bruno: L('Bruno’s gym', 'חדר הכושר של ברונו', 'Зал Бруно'),
    market_stall: L('Market fruit stall', 'דוכן הפירות בשוק', 'Фруктовый прилавок'),
    otto: L('Otto’s shop', 'החנות של אוטו', 'Лавка Отто'),
    docks_quay: L('Docks quay', 'רציף הנמל', 'Причал'),
    ottoSign: L('OTTO’S', 'אוטו', 'У ОТТО'),
    // GOTR-0120 story walks: the objective line of each walk (keyed by the step the walk leads to) and the story HUD
    goal_dream_gym_talk: L('Walk to Bruno’s gym', 'לכו לחדר הכושר של ברונו', 'Иди в зал Бруно'),
    goal_market_robber: L('Walk to the market', 'לכו לשוק', 'Иди на рынок'),
    goal_buy_heavy_bag: L('Walk to Otto’s shop for a new bag', 'לכו לחנות של אוטו לקנות שק חדש', 'Иди в лавку Отто за новым мешком'),
    goal_bag_drill: L('Carry the new bag back to Bruno’s gym', 'סחבו את השק החדש בחזרה לחדר הכושר של ברונו', 'Отнеси новый мешок в зал Бруно'),
    goal_docks_fight: L('Walk to the Docks for the underground fight', 'לכו לנמל לקרב המחתרת', 'Иди в доки на подпольный бой'),
    goal_advanced_training: L('Walk back to Bruno’s gym', 'חזרו לחדר הכושר של ברונו', 'Возвращайся в зал Бруно'),
    goalPlace: L('Story: {place}', 'סיפור: {place}', 'История: {place}'),
    goalDone: L('Chapter complete: walk anywhere', 'הפרק הושלם: אפשר ללכת לכל מקום', 'Глава пройдена: гуляйте где угодно'),
    walkHelp: L('Walk into the glowing ring to go on with the story.', 'היכנסו לטבעת הזוהרת כדי להמשיך בסיפור.', 'Войдите в светящийся круг, чтобы продолжить историю.'),
    keysHint: L('Arrow keys or WASD to walk · Shift to hurry · Q/E to turn', 'חצים או WASD להליכה · Shift למהר · Q/E לסובב', 'Стрелки или WASD — идти · Shift — быстрее · Q/E — поворот'),
    entry: L('Walk', 'הליכה', 'Прогулка'),
    entryLabel: L('Free walk through the town', 'הליכה חופשית בעיר', 'Свободная прогулка по городу'),
    entryBusy: L('Free walk opens after the film or fight', 'ההליכה החופשית תיפתח אחרי הסרט או הקרב', 'Прогулка откроется после фильма или боя')
  };
  const LANGS = ['en', 'he', 'ru'];
  const langOf = lang => LANGS.includes(lang) ? lang : 'en';
  function text(lang, key, vars) {
    const v = COPY[key]; if (!v) return key;
    let s = v[langOf(lang)] || v.en;
    if (vars) for (const [k, x] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(x));
    return s;
  }
  const finite = x => typeof x === 'number' && Number.isFinite(x);

  /* ---------------------------------------------------------------- the walkable town
   * heights: top surface of everything solid seen from above (buildings, plates, hills, quays; not trees or people),
   * Float32Array nx * nz, row-major by z (index = j * nx + i), metres. A cell can be stood on when it is above the sea and
   * every step to a neighbour is no taller than opts.step; only the part connected to the seeds counts (roofs are not). */
  function walkGrid(heights, nx, nz, opts = {}) {
    const n = nx * nz, step = opts.step ?? .3, sea = opts.sea ?? .15, walk = new Uint8Array(n);
    const ok = new Uint8Array(n);
    for (let k = 0; k < n; k++) ok[k] = heights[k] > sea && heights[k] < (opts.ceiling ?? 1e9) ? 1 : 0;
    const queue = new Int32Array(n); let qh = 0, qt = 0;
    for (const k of opts.seeds || []) if (k >= 0 && k < n && ok[k] && !walk[k]) { walk[k] = 1; queue[qt++] = k; }
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (qh < qt) {
      const k = queue[qh++], i = k % nx, j = (k - i) / nx, h = heights[k];
      for (const [di, dj] of D) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const q = b * nx + a; if (walk[q] || !ok[q] || Math.abs(heights[q] - h) > step) continue;
        walk[q] = 1; queue[qt++] = q;
      }
    }
    // Keep the body out of walls and water: a cell next to a cell that is not walkable is not walkable (one cell = the radius).
    const erode = opts.erode ?? 1;
    for (let r = 0; r < erode; r++) {
      const edge = [];
      for (let k = 0; k < n; k++) if (walk[k]) {
        const i = k % nx, j = (k - i) / nx;
        if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1 || !walk[k - 1] || !walk[k + 1] || !walk[k - nx] || !walk[k + nx]) edge.push(k);
      }
      for (const k of edge) walk[k] = 0;
    }
    return walk;
  }
  /** Marks discs (tree trunks, lamp posts) as not walkable. discs: [[x, z, r], ...] in metres. */
  function blockDiscs(walk, spec, discs) {
    const { x0, z0, cell, nx, nz } = spec;
    for (const [x, z, r] of discs) {
      const i0 = Math.max(0, Math.floor((x - r - x0) / cell)), i1 = Math.min(nx - 1, Math.floor((x + r - x0) / cell));
      const j0 = Math.max(0, Math.floor((z - r - z0) / cell)), j1 = Math.min(nz - 1, Math.floor((z + r - z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(x0 + (i + .5) * cell - x, z0 + (j + .5) * cell - z) <= r + cell * .5) walk[j * nx + i] = 0;
    }
  }
  /** Drops walkable cells that the seeds cannot reach any more (pockets closed by tree trunks or posts). 8-neighbour,
   * the same moves the body can make (a diagonal only between two open sides). */
  function keepConnected(walk, nx, nz, seeds) {
    const n = nx * nz, seen = new Uint8Array(n), queue = new Int32Array(n); let h = 0, t = 0;
    for (const k of seeds) if (k >= 0 && k < n && walk[k] && !seen[k]) { seen[k] = 1; queue[t++] = k; }
    while (h < t) {
      const k = queue[h++], i = k % nx, j = (k - i) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const q = b * nx + a; if (seen[q] || !walk[q]) continue;
        if (di && dj && (!walk[j * nx + a] || !walk[b * nx + i])) continue;
        seen[q] = 1; queue[t++] = q;
      }
    }
    let dropped = 0; for (let k = 0; k < n; k++) if (walk[k] && !seen[k]) { walk[k] = 0; dropped++; }
    return dropped;
  }
  /** spec: { x0, z0, cell, nx, nz, heights, walk } -> lookups and movement on the grid. */
  function grid(spec) {
    const { x0, z0, cell, nx, nz, heights, walk } = spec;
    const idx = (x, z) => { const i = Math.floor((x - x0) / cell), j = Math.floor((z - z0) / cell); return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i; };
    const allowed = (x, z) => { if (!finite(x) || !finite(z)) return false; const k = idx(x, z); return k >= 0 && walk[k] === 1; };
    function height(x, z) { // bilinear over walkable neighbours (a curb is a small ramp, not a jump)
      const fx = (x - x0) / cell - .5, fz = (z - z0) / cell - .5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
      let sum = 0, wsum = 0;
      for (const [a, b, w] of [[i, j, (1 - u) * (1 - v)], [i + 1, j, u * (1 - v)], [i, j + 1, (1 - u) * v], [i + 1, j + 1, u * v]]) {
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a;
        if (!walk[k]) continue; sum += heights[k] * w; wsum += w;
      }
      if (wsum > 1e-6) return sum / wsum;
      const k = idx(x, z); return k >= 0 ? heights[k] : 0;
    }
    function nearest(x, z, maxR = 400) { // the closest walkable cell centre (spiral by rings)
      const ci = Math.floor((x - x0) / cell), cj = Math.floor((z - z0) / cell), R = Math.ceil(maxR / cell);
      for (let r = 0; r <= R; r++) {
        let best = null, bd = Infinity;
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= nz || !walk[j * nx + i]) continue;
          const px = x0 + (i + .5) * cell, pz = z0 + (j + .5) * cell, d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = { x: px, z: pz }; }
        }
        if (best) return best;
      }
      return null;
    }
    /** Moves state {x, z, ry, dist, walking} by world velocity (vx, vz) m/s for dt s; slides along walls; blocked(x, z) adds moving obstacles. */
    function move(s, vx, vz, dt, blocked = () => false) {
      s.walking = false; if (!finite(dt) || dt <= 0 || !finite(vx) || !finite(vz)) return s;
      const speed = Math.hypot(vx, vz); if (speed < 1e-4) return s;
      const T = Math.min(dt, .1), n = Math.max(1, Math.ceil(speed * T / (cell * .4))), h = T / n, ox = s.x, oz = s.z;
      // a moving obstacle (a car) never traps the body: from inside its footprint the body may step out
      const inside = !!blocked(s.x, s.z), free = (x, z) => allowed(x, z) && (inside || !blocked(x, z)); // (from inside: free to step out)
      for (let k = 0; k < n; k++) {
        const x = s.x + vx * h, z = s.z + vz * h;
        if (free(x, z)) { s.x = x; s.z = z; } else if (free(x, s.z)) s.x = x; else if (free(s.x, z)) s.z = z;
      }
      const d = Math.hypot(s.x - ox, s.z - oz);
      if (d > 1e-5) { s.walking = true; s.dist = (s.dist || 0) + d; }
      if (speed > .05) s.ry = Math.atan2(vx, vz); // face where the stick points, also against a wall
      return s;
    }
    /** The top of whatever is there (roofs too): for the camera, which must not end up inside a building. */
    const top = (x, z) => { const k = idx(x, z); return k >= 0 ? heights[k] : -1e9; };
    return { ...spec, idx, allowed, height, nearest, move, top };
  }
  /** Camera-relative stick (h right, v forward, length <= 1) -> world velocity for a camera looking along yaw. */
  function velocity(h, v, yaw, speed) {
    const a = Math.hypot(h, v); if (!finite(a) || a < 1e-4) return [0, 0];
    const k = speed * Math.min(1, a) / a, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    return [(h * rx + v * fx) * k, (h * rz + v * fz) * k];
  }

  /* ---------------------------------------------------------------- the walk's own save (one per profile) */
  const SAVE_PREFIX = 'gotr.freewalk.v1.', LEGACY_KEY = 'fit.private.chapter1-roam.v1';
  const saveKey = id => SAVE_PREFIX + (typeof id === 'string' && id ? id : 'guest');
  const serialize = s => JSON.stringify({ x: Math.round(s.x * 100) / 100, z: Math.round(s.z * 100) / 100, ry: Math.round((s.ry || 0) * 1000) / 1000, t: Date.now() });
  /** A saved spot that is still walkable, else the fallback (a landmark). raw may be anything (old or broken saves). */
  function restore(raw, g, fallback) {
    let p = null; try { p = typeof raw === 'string' ? JSON.parse(raw) : null; } catch { p = null; }
    const ok = p && finite(p.x) && finite(p.z) && (!g || g.allowed(p.x, p.z));
    const at = ok ? p : fallback;
    return { x: at.x, z: at.z, ry: ok && finite(p.ry) ? Math.atan2(Math.sin(p.ry), Math.cos(p.ry)) : (fallback.ry || 0), dist: 0, walking: false, restored: !!ok };
  }
  /** The v1.92 Chapter 1 roam saved a district of its own page; it maps to the same district of the town. */
  function legacyPlace(raw) {
    try { const p = JSON.parse(raw); return ({ oldtown: 'bruno', market: 'market_stall', otto: 'otto', docks: 'docks_quay' })[p?.id] || null; } catch { return null; }
  }

  /* ---------------------------------------------------------------- districts and destinations */
  /** places: [{ id, x, z, r }] metres. The nearest landmark whose reach (r) covers the point, else null (outskirts). */
  function district(x, z, places) {
    let best = null, bd = Infinity;
    for (const p of places) { const d = Math.hypot(p.x - x, p.z - z) / (p.r || 1); if (d < 1 && d < bd) { bd = d; best = p; } }
    return best;
  }
  // Chapter 1 steps -> the place where they happen (the same table as the v1.92 roam). A waypoint only.
  const STORY_TARGETS = Object.freeze({ dream_gym_talk: 'bruno', first_brick: 'bruno', clean_gym: 'bruno', night_shadow: 'bruno', night_bag: 'bruno', dream_apology: 'bruno',
    market_robber: 'market_stall', buy_heavy_bag: 'otto', bag_drill: 'bruno', fight_prep: 'bruno', docks_fight: 'docks_quay', advanced_training: 'bruno', brick: 'bruno' });
  const storyTarget = step => Object.hasOwn(STORY_TARGETS, step) ? STORY_TARGETS[step] : null;
  const ARRIVE = 4; // metres
  /* ---- GOTR-0120 story walks (owner 2026-11-25): whenever the next Chapter 1 step happens at another place than where the
   * last film ended, the story goes on as a walk. Keyed by the step the walk leads to: from = where the film before it ends
   * (bus_stop: the arrival film ends when the Fighter has stepped off the bus), to = that step's place, carry = what the
   * Fighter carries (his duffel off the bus; the new heavy bag on his shoulder out of Otto's), after = the step it follows.
   * Same-place steps (the gym days, the boss in the gym) have no walk. Pinned by tests/story-walk.test.cjs. */
  const STORY_WALKS = Object.freeze({
    dream_gym_talk: Object.freeze({ after: 'dream_arrival', from: 'bus_stop', to: 'bruno', carry: 'duffel' }),
    market_robber: Object.freeze({ after: 'dream_apology', from: 'bruno', to: 'market_stall' }),
    buy_heavy_bag: Object.freeze({ after: 'market_robber', from: 'market_stall', to: 'otto' }),
    bag_drill: Object.freeze({ after: 'buy_heavy_bag', from: 'otto', to: 'bruno', carry: 'heavybag' }),
    docks_fight: Object.freeze({ after: 'fight_prep', from: 'bruno', to: 'docks_quay' }),
    advanced_training: Object.freeze({ after: 'docks_fight', from: 'docks_quay', to: 'bruno' })
  });
  const walkFor = step => Object.hasOwn(STORY_WALKS, step) ? STORY_WALKS[step] : null;
  /** Is the walk to `step` still to be walked? record = the profile's walk record (parseWalk), attempted = the save already
   *  holds a try of that step (an older save that reached the step before walks existed: it is never sent back to walk). */
  function walkDue(step, record, attempted) {
    const w = walkFor(step); if (!w) return null;
    if (record && record.step === step) return record.phase === 'arrived' ? null : w;
    return attempted ? null : w;
  }
  // The walk record (one per profile, localStorage): { step, phase: 'walk' | 'arrived', x?, z?, ry?, open?, t }
  const WALK_PREFIX = 'gotr.storywalk.v1.';
  const walkKey = id => WALK_PREFIX + (typeof id === 'string' && id ? id : 'guest');
  function parseWalk(raw) {
    let p = null; try { p = typeof raw === 'string' ? JSON.parse(raw) : null; } catch { return null; }
    if (!p || typeof p !== 'object' || !walkFor(p.step) || (p.phase !== 'walk' && p.phase !== 'arrived')) return null;
    const out = { step: p.step, phase: p.phase, open: p.open === true, t: finite(p.t) ? p.t : 0 };
    if (finite(p.x) && finite(p.z)) { out.x = p.x; out.z = p.z; out.ry = finite(p.ry) ? p.ry : 0; }
    return out;
  }
  /** The light of the town while the story stands at `step` (owner 2026-11-25: no Day/Night buttons, the walk follows the
   *  story): the nights of the old bag and the Docks (and the walk back from them), fight night in the evening, else the
   *  chapter's own grade (GlorylandMap.gradeForChapter). */
  const STEP_TIME = Object.freeze({ night_shadow: 'night', night_bag: 'night', docks_fight: 'night', advanced_training: 'night', brick: 'evening' });
  const CHAPTER_TIME = Object.freeze({ 1: 'morning', 2: 'evening', 3: 'night', 4: 'night', 5: 'night' });
  const storyTime = (step, chapter) => (step && Object.hasOwn(STEP_TIME, step) ? STEP_TIME[step] : CHAPTER_TIME[chapter] || 'day');
  /** Where the arrival bus stops in the town: the middle of a street 40-70 m from Bruno's gym (nearest to 52 m), on the kerb
   *  side toward the gym, at a spot a person can stand on. roads = roadGraph(..), g = grid(..), gym = { x, z }. */
  function busStop(roads, g, gym) {
    let best = null, bd = Infinity;
    for (const e of roads.edges) {
      if (e.len < 14) continue;
      const A = roads.nodes[e.a], mx = A.x + e.ux * e.len / 2, mz = A.z + e.uz * e.len / 2, d = Math.hypot(mx - gym.x, mz - gym.z);
      if (d < 40 || d > 70 || Math.abs(d - 52) >= bd) continue;
      const side = ((gym.x - mx) * -e.uz + (gym.z - mz) * e.ux) >= 0 ? 1 : -1, off = e.w / 2 + 1.2;
      const x = mx - e.uz * off * side, z = mz + e.ux * off * side, at = g.allowed(x, z) ? { x, z } : g.nearest(x, z, 6);
      if (!at) continue;
      bd = Math.abs(d - 52); best = { x: at.x, z: at.z, ry: Math.atan2(gym.x - at.x, gym.z - at.z) };
    }
    return best;
  }
  /* ---- the story walk: a one-time ticket (owner/integrator 2026-11-23). When the player deliberately marks the place of the
   * current Chapter 1 step (still playable), walking into that place's ring opens that step ONCE, through the game's own
   * quest action. Ordinary walking, any other marker, a locked step, a stale or reused ticket never start anything.
   * storage: sessionStorage-like ; now() ms ; nonce() 32 hex ; eligible() -> { profile, step, target, boss } | null (live). */
  const TICKET_KEY = 'gotr.freewalk.story.v1', TICKET_AGE = 30 * 60 * 1000;
  function storyWalk(storage, now, nonce, eligible) {
    const read = () => { try { const t = JSON.parse(storage().getItem(TICKET_KEY)); return t && /^[0-9a-f]{32}$/.test(t.nonce) && typeof t.profile === 'string' && t.profile && finite(t.created) && now() >= t.created && now() - t.created <= TICKET_AGE && STORY_TARGETS[t.step] === t.target ? t : null; } catch { return null; } };
    const clear = () => { try { storage().removeItem(TICKET_KEY); return true; } catch { return false; } };
    const same = (a, b) => !!a && !!b && a.profile === b.profile && a.step === b.step && a.target === b.target;
    return {
      /** The player marked `target` on purpose: a ticket when it is the live current step's place (not a boss), else none. */
      arm(target) {
        clear(); const cur = eligible(); if (!cur || cur.boss || cur.target !== target) return null;
        let n; try { n = nonce(); } catch { return null; } if (!/^[0-9a-f]{32}$/.test(n)) return null;
        const t = { profile: cur.profile, step: cur.step, target: cur.target, nonce: n, created: now() };
        try { storage().setItem(TICKET_KEY, JSON.stringify(t)); } catch { return null; }
        return t;
      },
      cancel(n) { const t = read(); if (!n || t?.nonce === n) clear(); },
      clear,
      /** Physically walked in: outside the ring the frame before, inside now (a spot saved inside the ring is not an entry). */
      entered: (before, after, radius = ARRIVE) => finite(before) && finite(after) && before > radius && after <= radius,
      /** Burns the ticket (always) and returns it only if it is this run's and still the live current step. */
      consume(n) { const t = read(); if (!t || t.nonce !== n) return null; if (!clear()) return null; return same(t, eligible()) ? t : null; },
      still: t => same(t, eligible()),
      read
    };
  }

  /* ---------------------------------------------------------------- traffic: one car on one lane
   * car: { s (m along the lane), speed, lane: { len }, cruise }, player: lane-local { u (along, from the car's lane start), v (across) } or null,
   * ahead: metres to the car in front on the same lane (Infinity if none). Brakes so it always stops before a person in its path. */
  const CAR = Object.freeze({ halfLen: 2.1, halfWidth: 1.0, body: .35, safety: .9, look: 1.1, accel: 1.6, brake: 4.2, cruise: 7.5 });
  function carStep(car, dt, player, ahead = Infinity) {
    if (!finite(dt) || dt <= 0) return car;
    const C = CAR, T = Math.min(dt, .1), n = Math.max(1, Math.ceil(T / (1 / 60))), h = T / n;
    for (let k = 0; k < n; k++) {
      let room = Math.max(0, ahead - 2 * C.halfLen - 1.5);
      if (player && finite(player.u) && finite(player.v)) {
        const gap = player.u - car.s, side = Math.abs(player.v);
        if (gap > -C.halfLen && side < C.halfWidth + C.body + C.look) room = Math.min(room, Math.max(0, gap - C.halfLen - C.body - C.safety));
      }
      const vmax = Math.sqrt(2 * C.brake * Math.max(0, room - .05)), target = Math.min(car.cruise || C.cruise, vmax);
      const v1 = Math.max(0, Math.min(target, car.speed + C.accel * h), car.speed - C.brake * h * 1.6);
      const stepLen = Math.min(Math.max(0, room), (v1 + car.speed) * h / 2);
      car.s += stepLen; car.speed = stepLen <= 1e-6 && v1 < .05 ? 0 : Math.min(v1, target === 0 ? 0 : v1);
      car.waiting = room < 3 && car.speed < .3;
    }
    return car;
  }
  /** Is a body at lane-local (u, v) inside the car's footprint (the car at s)? */
  const carHits = (car, u, v) => Math.abs(u - car.s) < CAR.halfLen + CAR.body && Math.abs(v) < CAR.halfWidth + CAR.body;

  /* ---------------------------------------------------------------- the street network for cars
   * segments: [{ a: [x, z], b: [x, z], w }] metres (street centre lines). Ends closer than snap join into one node, so a
   * car reaching the end of a street turns into a street that leaves the same crossing. */
  function roadGraph(segments, snap = 2) {
    const nodes = [], edges = [];
    const node = (x, z) => {
      for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i].x - x, nodes[i].z - z) <= snap) return i;
      nodes.push({ x, z, edges: [] }); return nodes.length - 1;
    };
    for (const s of segments) {
      const a = node(s.a[0], s.a[1]), b = node(s.b[0], s.b[1]); if (a === b) continue;
      const A = nodes[a], B = nodes[b], len = Math.hypot(B.x - A.x, B.z - A.z); if (len < 3) continue;
      if (edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
      const e = { id: edges.length, a, b, len, ux: (B.x - A.x) / len, uz: (B.z - A.z) / len, w: s.w || 6 };
      edges.push(e); A.edges.push(e.id); B.edges.push(e.id);
    }
    return { nodes, edges };
  }
  /** Where a car on edge e driving dir (+1 a->b, -1 b->a) is at s metres: position, heading and its lane (right-hand traffic). */
  function lanePose(g, e, dir, s) {
    const E = g.edges[e], A = g.nodes[dir > 0 ? E.a : E.b], ux = E.ux * dir, uz = E.uz * dir, off = Math.min(E.w / 4, 2.2);
    return { x: A.x + ux * s - uz * off, z: A.z + uz * s + ux * off, ux, uz, rx: -uz, rz: ux, ry: Math.atan2(ux, uz), off, sx: A.x, sz: A.z };
  }
  /** The next street after edge e (driving dir): any other street at the end crossing; a dead end turns back. */
  function nextEdge(g, e, dir, rnd = Math.random) {
    const E = g.edges[e], end = dir > 0 ? E.b : E.a, out = g.nodes[end].edges.filter(k => k !== e);
    if (!out.length) return { e, dir: -dir };
    // prefer going on (a small turn) over sharp turns, as traffic does
    const w = out.map(k => { const N = g.edges[k], d = N.a === end ? 1 : -1, dot = N.ux * d * E.ux * dir + N.uz * d * E.uz * dir; return { k, d, w: dot > .7 ? 3 : dot > -.3 ? 1.4 : .2 }; });
    let r = rnd() * w.reduce((n, x) => n + x.w, 0);
    for (const x of w) { r -= x.w; if (r <= 0) return { e: x.k, dir: x.d }; }
    return { e: w[0].k, dir: w[0].d };
  }

  const api = { COPY, LANGS, text, langOf, walkGrid, blockDiscs, keepConnected, grid, velocity, SAVE_PREFIX, LEGACY_KEY, saveKey, serialize, restore, legacyPlace,
    district, STORY_TARGETS, storyTarget, ARRIVE, storyWalk, STORY_WALKS, walkFor, walkDue, WALK_PREFIX, walkKey, parseWalk, STEP_TIME, storyTime, busStop, TICKET_KEY, CAR, carStep, carHits, roadGraph, lanePose, nextEdge, SPEED: 2.22 };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FreeWalkCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
