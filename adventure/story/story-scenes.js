/* Story scenes and skill trials (GOTR-0056, GOTR-0061): plays a short scripted scene, or a skill trial, in a small 3D
 * story set (story-sets.js) with the game's own rigs: the player's Fighter (engine.coach), Mack (a rabbit rig holding
 * the mitt-work focus mitts) and characters of the opponent species dressed by colour (Brick, Dash, the night guard, Vix,
 * the raccoon, King Hyena). Lines are plain text with a portrait and the speaker's name in the accent colour.
 *
 * STABLE API
 *   StoryScenes.play(id, { onDone(result), hard?, reducedMotion?, timeScale? }) -> true when it starts
 *     scene ids (StoryScenes.sceneIds): arrival brick dash boss_intro boss_outro | vix_intro whistle_theft dash_circle hyena_intro hyena_outro
 *     trial ids (StoryScenes.gameIds):  carry_bag = Brick's bag (heavy_bag_van), snoring_guard = Sleep talker,
 *                                       rooftop_barrage (rooftop_balloons), cut_him_off (whistle_chase), hustlers_bet (grandma_groceries)
 *     result: { id, skipped, error?, mission?: measured run (value, score, stars), saved?: save result }
 *   StoryScenes.games[id] = { set, roles, make(Trials, { hard }), pads, ghost, words, hud(view, words, lang), detail(res, words), frame(ctx, view, dt), dpad? (false: punches only) }
 *   StoryScenes.looks[role] = { gloves, shorts }   colours for a character played by the opponent-species rig
 *   StoryScenes.best(id) -> { score, hard, gold }   personal best kept in this browser
 *   StoryScenes.playing / stop() / stats() (last frame: draw calls, triangles, set meshes, worst frame edge of a framed actor)
 * A trial: 3 s tutorial with ghost input on the pad, the game's D-pad and punch buttons (keyboard: arrows, J K L), hit-stop
 * and score pops, instant retry, medal + personal best, a harder variant unlocked by gold.
 * Tap (or Esc) skips a scene; reduced motion: no dolly or pan, the camera cuts. Uses the engine's renderer through its
 * demo hook (engine.fightIQDemo), so no second WebGL context; the set is built when played and disposed after, borrowed
 * rigs go back exactly where they were. EN/HE/RU; boxing terms stay English (GotrGlossary). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const Core = () => window.StoryCore;
  const term = (x, l) => window.GotrGlossary ? window.GotrGlossary.term(x, l) : x;
  const W = {
    en: { skip: 'Tap to skip', quit: 'Quit', again: 'Try again', next: 'Continue', none: 'No medal yet', medal: ['', 'Bronze', 'Silver', 'Gold'], score: 'Score', best: 'Best', newBest: 'New best!', streak: 'Best streak', hardGo: 'Hard mode', hardTag: 'Hard', hardNew: 'Hard mode unlocked', retry: 'Restart', ready: 'Get ready', why: { early: 'Too early', late: 'Too late', wrong: 'Wrong punch', bagged: 'Bagged!' }, punch: { straight: 'Straight', hook: 'Hook', uppercut: 'Uppercut' }, saveErr: 'Could not save the result: ', dir: { up: 'Up', down: 'Down', left: 'Left', right: 'Right' } },
    he: { skip: 'הקישו כדי לדלג', quit: 'יציאה', again: 'עוד פעם', next: 'המשך', none: 'עדיין בלי מדליה', medal: ['', 'ארד', 'כסף', 'זהב'], score: 'ניקוד', best: 'שיא', newBest: 'שיא חדש!', streak: 'הרצף הטוב', hardGo: 'מצב קשה', hardTag: 'קשה', hardNew: 'מצב קשה נפתח', retry: 'מחדש', ready: 'היכונו', why: { early: 'מוקדם מדי', late: 'מאוחר מדי', wrong: 'מכה לא נכונה', bagged: 'השק פגע!' }, punch: { straight: 'ישרה', hook: 'הוק', uppercut: 'אפרקאט' }, saveErr: 'לא ניתן לשמור את התוצאה: ', dir: { up: 'למעלה', down: 'למטה', left: 'שמאלה', right: 'ימינה' } },
    ru: { skip: 'Нажмите, чтобы пропустить', quit: 'Выйти', again: 'Ещё раз', next: 'Дальше', none: 'Пока без медали', medal: ['', 'Бронза', 'Серебро', 'Золото'], score: 'Очки', best: 'Рекорд', newBest: 'Новый рекорд!', streak: 'Лучшая серия', hardGo: 'Сложный режим', hardTag: 'Сложно', hardNew: 'Открыт сложный режим', retry: 'Заново', ready: 'Приготовьтесь', why: { early: 'Рано', late: 'Поздно', wrong: 'Не тот удар', bagged: 'Мешок попал!' }, punch: { straight: 'Прямой', hook: 'Хук', uppercut: 'Апперкот' }, saveErr: 'Не удалось сохранить результат: ', dir: { up: 'Вверх', down: 'Вниз', left: 'Влево', right: 'Вправо' } }
  };
  const lang = () => W[window.app?.lang] ? window.app.lang : 'en', w = () => W[lang()];
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 15.5 12 9l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let current = null, lastStats = null;

  /* ---------------------------------------------------------------- rigs and looks */
  // Characters of the opponent species wear their own colours on a rig this module owns (never on a borrowed game rig).
  const looks = { brick: { gloves: '#1d1f24', shorts: '#8f2f22' }, dash: { gloves: '#f2c230', shorts: '#12a59c' }, guard: { gloves: '#5d6878', shorts: '#1f3559' },
    vix: { gloves: '#f3f6fb', shorts: '#e2702a' }, raccoon: { gloves: '#2b2f3a', shorts: '#6f7684' }, king: { gloves: '#c9a227', shorts: '#5b2a6b' } };
  const BEST = 'gotr.trial.v1';
  const bestAll = () => { try { return JSON.parse(localStorage.getItem(BEST) || '{}'); } catch { return {}; } };
  const best = id => bestAll()[id] || { score: 0, hard: 0, gold: false };
  function saveBest(id, res) { const all = bestAll(), b = all[id] || { score: 0, hard: 0, gold: false }, key = res.hard ? 'hard' : 'score', isNew = res.finished && res.score > (b[key] || 0); if (isNew) b[key] = res.score; const unlocked = !b.gold && res.stars === 3; if (res.stars === 3) b.gold = true; all[id] = b; try { localStorage.setItem(BEST, JSON.stringify(all)); } catch { /* optional */ } return { isNew, unlocked, best: b[key] || 0, gold: b.gold }; }
  const cast = {}; // species -> [own rigs], reused between scenes
  function inScene(c, scene) { let o = c?.root; while (o) { if (o === scene) return true; o = o.parent; } return false; }
  function dress(c, look) {
    const paint = (m, hex) => { if (!m?.color) return; if (!m.userData.storyBase) m.userData.storyBase = m.color.clone(); if (hex) m.color.set(hex).convertSRGBToLinear(); else m.color.copy(m.userData.storyBase); };
    for (const side of ['L', 'R']) paint(c.gloveMeshes?.[side]?.material, look?.gloves); paint(c.shorts?.material, look?.shorts);
  }
  function rigFor(role, e, used, a = {}) {
    if (role === 'fighter') return e.coach;
    if ((!looks[role] || a.cast) && window.StoryCast?.ids?.includes(role)) return window.StoryCast.rig(role, e); // GOTR-0099: Coach Bruno in a skill game (his own clothes); GOTR-0077: Brick the bulldog at his bag
    const species = role === 'pip' ? 'rabbit' : e.coach.species === 'rabbit' ? 'lion' : 'rabbit', free = c => c && c !== e.coach && c.root && !inScene(c, e.scene) && !used.includes(c);
    if (!looks[role]) { const b = [e.arena?.padTrainers?.[species], species !== e.coach.species ? e.roster?.get?.(species) : null].find(free); if (b) return b; }
    const pool = cast[species] || (cast[species] = []); let c = pool.find(x => !used.includes(x));
    if (!c) { c = new window.LionCoach(e.roster?.data || e.arena?.data, { species }); pool.push(c); }
    dress(c, looks[role]); return c;
  }
  const borrow = c => ({ c, parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible });
  function giveBack(b) { const r = b.c.root; r.parent?.remove(r); if (b.parent) b.parent.add(r); r.position.copy(b.pos); r.quaternion.copy(b.q); r.scale.copy(b.scale); r.visible = b.visible; b.c.maneInitialized = false;
    // GOTR-0072: the skin is placed by world-space dual quaternions that only a pose update refreshes. Without this the body
    // stayed in the story set (metres away) while gloves, boots, mane and tail followed the rig back to the gym.
    b.c.syncSkin?.(); }

  /* ---------------------------------------------------------------- poses (existing rig controller, no new animation data) */
  const seq = list => { const total = list.reduce((n, x) => n + x[1], 0); return { list, total }; };
  const SHADOW = seq([['jab', .55], ['cross', .62], ['guard', .45], ['jab', .5], ['jab', .5], ['cross', .62], ['guard', .8]]), COMBO = seq([['jab', .3], ['cross', .34], ['hook', .42], ['guard', 60]]);
  function carryOverlay(c) {
    const j = c.joints, gloves = [], handErrors = [];
    for (const side of ['L', 'R']) { const s = side === 'L' ? -1 : 1; handErrors.push(c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], V(s * .2, 1.2, .36), V(s * .9, -.7, -.3))); gloves.push(c.orientGlove(side, 1, V(-s, 0, 0))); }
    return { gloves, handErrors };
  }
  function punches(c, s, k, loop, t, base, power) {
    k = loop ? k % s.total : Math.min(k, s.total - .001); let move = 'guard', phase = 0; for (const [m, d] of s.list) { if (k < d) { move = m; phase = k / d; break; } k -= d; }
    if (move === 'guard') c.update(t, 'guard', 'one_two', { ...base, guardCover: 1 });
    else c.update(phase * 1.22, move, 'one_two', { ...base, guardCover: 1, power, recoil: 0, advance: 0, contactDrive: 0 });
  }
  /** Poses one rig from an actor state: act + walking (procedural boxer's step through the controller's ringStep). Returns a hop height. */
  const everyT = new WeakMap();
  const CIVIL = { idle: {}, wave: { R: 'wave' }, point: { R: 'point' }, laugh: { L: 'hips', R: 'hips' }, block: { L: 'cross', R: 'cross2' }, flex: { R: 'fist' }, mitts: { L: 'open', R: 'open' } };
  /** Owner's rule: outside a fight or drill moment a character stands, walks and talks like a person (DreamPose), never in the guard. */
  function everyday(c, a, t, o) {
    const P = window.DreamPose, fight = Core().FIGHT_ACTS.includes(a.act); if (!P || fight || ['carry', 'sleep', 'down'].includes(a.act)) return false;
    const last = everyT.get(c), dt = last != null && t > last && t - last < .2 ? t - last : 0; everyT.set(c, t); // own clock: gestures and the start and stop of a walk ease in
    P.civil(c, { t, dt, dist: a.dist ?? (a.stepPhase || 0) * P.STRIDE, walk: a.walking ? 1 : 0, arms: a.walking && a.act !== 'idle' && !(a.act in CIVIL) ? {} : CIVIL[a.act] || {}, nod: a.act === 'laugh' ? 1 : 0, talk: o.talking ? 1 : null }); return true;
  }
  function pose(c, a, t, o = {}) {
    if (everyday(c, a, t, o)) return a.act === 'laugh' && !o.reduced ? .012 * Math.abs(Math.sin(a.actT * 12)) : 0;
    const base = { simulationTime: t, keepFaceClear: true, ...o.options }, act = a.act, relaxed = { mode: 'waiting', raise: 0 };
    if (a.walking) base.ringStep = { first: -1, phase: a.stepPhase, ease: a.stepPhase, weight: 1, turn: 0, delta: [0, 0, Core().STEP] };
    let y = 0;
    if (act === 'carry') c.update(t, 'guard', 'one_two', { ...base, presentation: relaxed, poseOverlay: carryOverlay });
    else if (act === 'move') c.update((a.phase || 0) * 1.22, a.move, 'one_two', base);
    else if (a.walking && act !== 'guard' || act === 'idle') c.update(t, 'guard', 'one_two', { ...base, presentation: relaxed });
    else if (act === 'guard') c.update(t, 'guard', 'one_two', { ...base, guardCover: 1 });
    else if (act === 'mitts') c.update(t, 'guard', 'one_two', { ...base, guardElbowBack: .5, guardWidth: .22 });
    else if (act === 'block') c.update(t, 'guard', 'one_two', { ...base, presentation: relaxed, stanceWidth: .8 });
    else if (act === 'sleep') c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'loser', raise: 0 }, down: .1 });
    else if (act === 'down') c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'loser', raise: 0 }, down: smooth(a.actT / .5) });
    else if (act === 'wave') c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'waiting', side: 'R', raise: Math.min(1, a.actT / .35) * (.84 + (o.reduced ? 0 : .16 * Math.sin(a.actT * 11))) } });
    else if (act === 'flex') c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'winner', side: 'R', raise: smooth(a.actT / .4) } });
    else if (act === 'point') c.update(Math.min(1, a.actT / .45) * .44 * 1.22, 'jab', 'one_two', base);
    else if (act === 'laugh') { c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'winner', raise: 0 } }); if (!o.reduced) y = .022 * Math.abs(Math.sin(a.actT * 12)); }
    else if (act === 'shadow') punches(c, SHADOW, a.actT, true, t, base, 1.1);
    else if (act === 'combo') punches(c, COMBO, a.actT, false, t, base, 1.3);
    else c.update(t, 'guard', 'one_two', base);
    return y;
  }

  /* ---------------------------------------------------------------- overlay and speech lines */
  function overlay(kind) {
    const d = el('dialog', 'story-scene'); d.dir = lang() === 'he' ? 'rtl' : 'ltr'; d.dataset.kind = kind;
    const vignette = el('div', 'story-vignette'), host = el('div', 'story-host'), lineBox = el('div', 'story-line'), hint = el('div', 'story-hint', kind === 'game' ? '' : w().skip), busy = el('div', 'story-busy', '…');
    lineBox.setAttribute('role', 'status'); lineBox.setAttribute('aria-live', 'polite');
    d.append(host, vignette); if (kind === 'scene') d.append(el('div', 'story-bar story-bar-top'), el('div', 'story-bar story-bar-bottom'));
    d.append(busy, lineBox, hint); document.body.append(d);
    try { d.showModal(); } catch { d.setAttribute('open', ''); }
    return { d, host, lineBox, hint, busy };
  }
  function showLine(ui, l) {
    const key = l ? l.who + '|' + l.t + '|' + lang() : '';
    if (ui.lineKey === key) return; ui.lineKey = key; ui.lineBox.replaceChildren(); ui.lineBox.dataset.who = l ? l.who : '';
    if (!l) return;
    const bust = window.AdventureStory?.bust?.(l.who); if (bust) { bust.classList.add('story-face'); ui.lineBox.append(bust); }
    const box = el('div', 'story-words'), name = (window.AdventureStory?.who?.[l.who]?.name || {})[lang()] || '';
    box.append(el('strong', 'story-name', name), el('p', 'story-text', l.text[lang()] || l.text.en)); ui.lineBox.append(box);
    ui.lineBox.classList.remove('in'); void ui.lineBox.offsetWidth; ui.lineBox.classList.add('in');
  }

  /* ---------------------------------------------------------------- camera */
  function fitLens(camera, e) {
    const size = e.renderer.getSize(new THREE.Vector2()), aspect = Math.max(.2, size.x / Math.max(1, size.y));
    // 36 degrees vertical on wide screens; on a phone in portrait keep at least a 38-degree horizontal view.
    const v = Math.min(66, Math.max(36, 2 * Math.atan(.345 / aspect) * 180 / Math.PI));
    if (camera.aspect !== aspect || camera.fov !== v) { camera.aspect = aspect; camera.fov = v; camera.updateProjectionMatrix(); }
  }
  const _p = V(), _r = V();
  /** Worst frame edge reached by the framed rigs (1 = exactly on the edge), measured over feet, head top and both sides. */
  function frameEdge(camera, rigs, limX, limY) {
    camera.updateMatrixWorld(true); _r.setFromMatrixColumn(camera.matrixWorld, 0);
    let worst = 0;
    for (const c of rigs) for (const y of [.02, c.species === 'rabbit' ? 2.28 : 2.08]) for (const s of [-.42, .42]) {
      _p.copy(c.root.position).addScaledVector(_r, s); _p.y = y; _p.project(camera);
      if (_p.z > 1) return 9; worst = Math.max(worst, Math.abs(_p.x) / limX, Math.abs(_p.y) / limY);
    }
    return worst;
  }
  /** Characters are never cut by the frame: the camera backs away along its own view line until every framed rig fits. */
  function keepInFrame(camera, look, rigs, limX = .93, limY = .8) {
    if (!rigs.length) return 0; let worst = frameEdge(camera, rigs, limX, limY);
    for (let i = 0; i < 24 && worst > 1; i++) { camera.position.sub(look).multiplyScalar(1 + Math.min(.12, (worst - 1) * .6 + .02)).add(look); camera.lookAt(look); worst = frameEdge(camera, rigs, limX, limY); }
    return worst;
  }

  /* ---------------------------------------------------------------- skill trials (presentation; rules are in trials-core.js) */
  const PCOL = { straight: '#ff5a66', hook: '#ff8a1f', uppercut: '#f5c02e' }; // the main pad's colours (fighter-pad.css)
  const ease = k => smooth(k);
  /** The Fighter's body follows the last input for a moment: punches, Slip, duck (the controller's roll), side step. */
  function fighterAct(c, x, o = {}) {
    const a = x.memo.act, age = a ? x.t - a.t : 9, dur = a && ['left', 'down', 'right'].includes(a.k) ? .46 : .38;
    if (a && age < dur && a.k !== 'up' && !o.still) {
      const move = { straight: a.n % 2 ? 'jab' : 'cross', hook: 'hook', uppercut: 'uppercut', left: 'slip', down: 'roll', right: 'slip' }[a.k];
      pose(c, { act: 'move', move, phase: Math.min(.97, .14 + age / dur * .8) }, x.t, { options: { defenceSide: a.k === 'right' ? 1 : -1, guardCover: 1, power: 1.2, recoil: 0, advance: 0, contactDrive: 0 } });
    } else { const hot = !!(x.view?.prompt || x.view?.canReflect || x.view?.open || (a && age < 1.0)) && !x.over; pose(c, { act: hot ? 'guard' : 'idle', walking: !!o.walking, stepPhase: o.stepPhase || 0 }, x.t); } // guard only in the fight moment
    const fl = x.view.flash, hurt = fl && ['bagged', 'splash'].includes(fl.type) ? Math.max(0, 1 - (x.view.t - fl.t) / .45) : 0;
    if (hurt && !x.reduced) { c.root.rotation.z = .08 * Math.sin(x.t * 30) * hurt; c.root.updateMatrixWorld(true); }
  }
  /** The bag on its rope: pivot, rope length, swing angle toward the Fighter (-x), swing plane turned by yaw. */
  function hangBag(bag, px, py, pz, L, th, yaw = 0) {
    const dx = -Math.sin(th) * L, dy = -Math.cos(th) * L, c = Math.cos(yaw), s = Math.sin(yaw);
    bag.visible = true; bag.position.set(px + dx * c, py + dy, pz - dx * s); bag.quaternion.setFromUnitVectors(V(0, 1, 0), V(px, py, pz).sub(bag.position).normalize());
  }
  /** Three small lamps (Straight / Hook / Uppercut colours), created for the trial and disposed with it. */
  function lamps(x, at) {
    if (!x.memo.lamps) { const g = new THREE.SphereGeometry(.11, 12, 8); x.memo.lamps = T_PUNCH.map((k, i) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ toneMapped: false })); m.position.set(at[0], at[1], at[2] + (i - 1) * .52); x.scene.add(m); x.extras.push(m); return m; }); }
    return (lit, dim = .16) => x.memo.lamps.forEach((m, i) => m.material.color.set(PCOL[T_PUNCH[i]]).multiplyScalar(lit === T_PUNCH[i] ? 1 : dim));
  }
  /* ---------------------------------------------------------------- Brick's bag: stand, swivel, chain, the bag and both bodies (GOTR-0077) */
  const BAGF = Object.freeze({ x: 8.35, z: -1.55 }); // where the Fighter stands in the set 'gymfront' (the origin of the rules' frame)
  const PUNCH_OPT = Object.freeze({ guardCover: 1, power: 1.2, recoil: 0, advance: 0, contactDrive: 0 }); // the options the hand paths in trials-core.js were measured with
  const UPV = V(0, 1, 0);
  /** The boom stand on the pavement (upright behind the bag, out of the camera's way), swivel, chain and the new heavy bag. */
  function bagProps(scene) {
    const R = Trials().BAG, P = V(BAGF.x + R.pivot[0], R.pivot[1], BAGF.z + R.pivot[2]), group = new THREE.Group(); group.name = "Brick's bag stand";
    const lin = hex => new THREE.Color(hex).convertSRGBToLinear(), geos = [], mats = [];
    const mat = (hex, roughness, metalness) => { const m = new THREE.MeshStandardMaterial({ color: lin(hex), roughness, metalness }); mats.push(m); return m; };
    const frame = mat('#23272e', .48, .55), rubber = mat('#141518', .92, 0), iron = mat('#2b2e33', .5, .55), steel = mat('#aab2bc', .34, .85), red = mat('#a4262c', .5, .2);
    const add = (g, m, x, y, z, parent = group) => { geos.push(g); const n = new THREE.Mesh(g, m); n.position.set(x, y, z); n.castShadow = n.receiveShadow = true; parent.add(n); return n; };
    const T8 = .08, top = 3.0, postZ = P.z - 1.05, boomY = top - T8 / 2, boomZ0 = postZ - .05, boomZ1 = P.z + .12;
    add(new THREE.BoxGeometry(T8, top, T8), frame, P.x, top / 2, postZ);                                                     // upright
    add(new THREE.BoxGeometry(T8, T8, boomZ1 - boomZ0), frame, P.x, boomY, (boomZ0 + boomZ1) / 2);                         // boom over the bag
    add(new THREE.BoxGeometry(.004 + T8, .012, .08), red, P.x, boomY + T8 / 2 + .006, boomZ1 - .06);                      // red end cap
    const brace = add(new THREE.BoxGeometry(.05, Math.hypot(.6, .6), .05), frame, P.x, top - .38, postZ + .3); brace.rotation.x = Math.PI / 4; // diagonal brace
    add(new THREE.BoxGeometry(1.5, .07, .1), frame, P.x, .035, postZ);                                                       // H base: cross bar
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(.09, .07, 1.25), frame, P.x + s * .7, .035, postZ + .25);                                   // legs
      for (const z of [postZ - .33, postZ + .83]) add(new THREE.CylinderGeometry(.05, .055, .03, 14), rubber, P.x + s * .7, .015, z); // feet
      const horn = add(new THREE.CylinderGeometry(.025, .025, .34, 12), steel, P.x + s * .36, .2, postZ - .02); horn.rotation.z = Math.PI / 2; // weight horn
      for (const k of [0, 1]) { const pl = add(new THREE.CylinderGeometry(.19 - k * .04, .19 - k * .04, .045, 28), iron, P.x + s * (.25 + k * .05), .2, postZ - .02); pl.rotation.z = Math.PI / 2; } // plates
    }
    add(new THREE.BoxGeometry(.2, .18, .05), frame, P.x, top - .3, postZ + .045);                                            // gusset
    // swivel under the boom: eye plate, swivel body, shackle; the chain hangs from the shackle (the pivot)
    add(new THREE.BoxGeometry(.1, .012, .1), iron, P.x, boomY - T8 / 2 - .006, P.z);
    add(new THREE.CylinderGeometry(.022, .022, .07, 14), steel, P.x, P.y + .095, P.z);
    add(new THREE.TorusGeometry(.024, .006, 8, 16), steel, P.x, P.y + .035, P.z);
    const B = window.BagBreak?.bag?.({ worn: false }) || null, bag = B ? B.group : add(new THREE.CylinderGeometry(R.r, R.r, R.h * 2, 32), red, 0, 0, 0);
    if (B) { group.add(bag); bag.traverse(n => { if (n.isMesh) n.castShadow = n.receiveShadow = true; }); B.body.userData = { r: R.r, h: R.h, cy: 0 }; }
    else { bag.name = 'Heavy bag leather'; bag.userData = { r: R.r, h: R.h, cy: 0 }; }
    const linkG = new THREE.TorusGeometry(.0205, .0058, 6, 14), n = Math.max(4, Math.round(R.chain / .044)), links = []; geos.push(linkG);
    for (let i = 0; i < n; i++) { const l = new THREE.Mesh(linkG, steel); l.scale.set(1, 1.5, 1); l.castShadow = true; group.add(l); links.push(l); }
    // soft shade on the pavement under the bag (keeps it grounded when the device has shadows off)
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(20,14,8,.9)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), blobM = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .35, toneMapped: false }); mats.push(blobM);
    const blob = add(new THREE.PlaneGeometry(.75, .75).rotateX(-Math.PI / 2), blobM, P.x, .013, P.z); blob.castShadow = blob.receiveShadow = false; blob.renderOrder = 1;
    scene.add(group);
    const ring = V(), centre = V(), up = V(), tmp = V(), qT = new THREE.Quaternion(), qS = new THREE.Quaternion(), twist = new THREE.Quaternion().setFromAxisAngle(UPV, Math.PI / 2);
    const lateral = (pt, p) => { const dy = P.y - pt.y; pt.z += Math.sin(p) * dy; pt.y = P.y - dy * Math.cos(p); return pt; };
    /** Places bag and chain from a rules state { a1, a2, p, s } (angles + toward the Fighter, i.e. toward -x). */
    function pose(q) {
      ring.set(P.x - R.chain * Math.sin(q.a1), P.y - R.chain * Math.cos(q.a1), P.z); centre.set(ring.x - R.d * Math.sin(q.a2), ring.y - R.d * Math.cos(q.a2), P.z);
      lateral(ring, q.p); lateral(centre, q.p); up.copy(ring).sub(centre).normalize();
      bag.position.copy(centre); qT.setFromUnitVectors(UPV, up); qS.setFromAxisAngle(UPV, q.s || 0); bag.quaternion.copy(qT).multiply(qS);
      for (let i = 0; i < links.length; i++) { const l = links[i]; l.position.lerpVectors(P, ring, (i + .5) / links.length); tmp.copy(P).sub(ring).normalize(); l.quaternion.setFromUnitVectors(UPV, tmp); if (i % 2) l.quaternion.multiply(twist); }
      blob.position.set(centre.x, .013, centre.z); const k = Math.max(0, 1 - Math.hypot(centre.x - P.x, centre.z - P.z) / 1.6); blob.material.opacity = .18 + .2 * k;
      bag.updateMatrixWorld(true);
    }
    /** A world point on the leather: `y` up the bag from its centre, `ang` round it from the side facing +x (Brick's side). */
    function leatherPoint(y, ang, out = V()) {
      const xp = tmp.set(1, 0, 0).addScaledVector(up, -up.x).normalize(), zp = V().crossVectors(xp, up).normalize();
      return out.copy(centre).addScaledVector(up, y).addScaledVector(xp, R.r * Math.cos(ang)).addScaledVector(zp, R.r * Math.sin(ang));
    }
    /** Rules point -> world. */
    const world = (pt, out = V()) => out.set(BAGF.x + pt[0], pt[1], BAGF.z + pt[2]);
    return { group, bag: B, mesh: B ? B.body : bag, pose, leatherPoint, world, pivot: P, centre, up,
      dispose() { if (B) B.dispose(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); tex.dispose(); } };
  }
  /** The Fighter at the bag: guard, the punch driven by the rules (out to the leather, a short hold, back), the step back, the knock. */
  function bagFighter(c, x, v, props) {
    const T = Trials(), R = T.BAG, p = v.punch, t = x.t, base = { simulationTime: t, keepFaceClear: true, ...PUNCH_OPT };
    const d = v.dodge; let ringStep = null;
    if (d && d.u < R.step) ringStep = { phase: d.u / R.step, ease: smooth(d.u / R.step), weight: 1, turn: 0, delta: [0, 0, -R.back] };
    else if (d && d.u > R.step + R.stay && d.u < R.step * 2 + R.stay) { const k = (d.u - R.step - R.stay) / R.step; ringStep = { phase: k, ease: smooth(k), weight: 1, turn: 0, delta: [0, 0, R.back] }; }
    else if (v.stepIn) ringStep = { phase: v.stepIn.u, ease: smooth(v.stepIn.u), weight: 1, turn: 0, delta: [v.stepIn.dz, 0, v.stepIn.delta] }; // in to the call's range (or back out); rig x = world +z here (mirrored root facing +x)
    if (ringStep) base.ringStep = ringStep;
    let ph = null;
    if (p) {
      const tau = t - p.at, c0 = p.contact;
      if (c0) ph = tau < c0.tau ? PH0 + tau * PRATE : tau < c0.tau + R.hold ? c0.ph : c0.ph - (c0.ph - PH0) * smooth((tau - c0.tau - R.hold) / .22);
      else { ph = Math.min(.94, PH0 + tau * PRATE); // a miss: the punch runs out and comes back; the leather pushes a glove that is still out of the way
        const hp = [0, 0, 0]; while (ph > T.PH.land && ph < .62 && x.sim.phys.leather(v.bag, (T.handAt(p.move, Math.min(ph, .58), hp), hp[0] += v.fx, hp[2] += v.fz || 0, hp)).gap < R.glove) ph += .01; }
      if (tau > .5 || (c0 && tau > c0.tau + R.hold + .22)) ph = null;
    }
    if (ph != null) c.update(ph * 1.22, p.move, 'one_two', base);
    else c.update(t, 'guard', 'one_two', base);
    const fl = v.flash, age = fl ? v.t - fl.t : 9;
    if (fl?.type === 'bagged' && age < .6 && !x.reduced) { const k = Math.sin(Math.PI * Math.min(1, age / .6)); c.root.position.x -= .12 * k; c.root.rotation.z = .07 * Math.sin(age * 28) * (1 - age / .6); c.root.updateMatrixWorld(true); }
  }
  /** Brick: hands on the leather while he holds and winds the bag up, the shove, ready hands, and he meets the bag coming back. */
  function bagBrick(c, x, v, props, dt) {
    const P = window.DreamPose; if (!P) { pose(c, { act: 'idle' }, x.t); return; }
    const q = v.bag, since = x.t - (v.release ?? -9), holding = v.hold || since < .16, back = q.w1 < -.15 && q.a1 < .25;
    let reach = null, lean = .05;
    const near = (y, ang) => props.leatherPoint(y, ang);
    if (holding || back) {
      const pts = [near(.12, .62), near(-.02, -.62)], sh = ['L', 'R'].map(s => c.joints['arm' + s].getWorldPosition(V()));
      const a = pts[0].distanceTo(sh[0]) + pts[1].distanceTo(sh[1]) <= pts[1].distanceTo(sh[0]) + pts[0].distanceTo(sh[1]) ? pts : [pts[1], pts[0]];
      const far = a.some((pt, i) => pt.distanceTo(sh[i]) > .78); // out of his reach: hands wait in front instead
      if (!far || holding) { reach = { L: c.root.worldToLocal(a[0].clone()).toArray(), R: c.root.worldToLocal(a[1].clone()).toArray() }; lean = holding ? .16 : .1; }
    }
    if (!reach) reach = { L: [-.2, 1.38, .36], R: [.2, 1.4, .36] };
    const fl = v.flash, jeer = fl && fl.type === 'bagged' && v.t - fl.t < 1.1;
    P.civil(c, { t: x.t, dt: dt || 0, arms: { L: 'wave', R: 'wave' }, reach, paws: { L: 'open', R: 'open' }, lean, look: { yaw: 0, pitch: -.08 }, nod: jeer ? 1 : 0, talk: jeer ? .6 : null, wide: .15 });
  }
  const PH0 = .14, PRATE = .8 / .38; // punch phase at the press and per second (trials-core.js PH)
  function bagFrame(x, v, dt) {
    const T = Trials(), R = T.BAG, f = x.rigs.fighter, b = x.rigs.brick, props = x.memo.props ||= bagProps(x.scene);
    props.pose(v.bag);
    x.place(f, { x: BAGF.x + (v.fx || 0), z: BAGF.z + (v.fz || 0), ry: Math.PI / 2 }); x.place(b, { x: BAGF.x + R.brick, z: BAGF.z + R.pivot[2], ry: -Math.PI / 2 });
    bagFighter(f, x, v, props); bagBrick(b, x, v, props, dt);
    // the leather gives where the glove lands, then springs back (the bag's own dent: bag-break.js)
    const pc = v.punch?.contact, B = props.bag;
    if (B && pc && x.t >= pc.t && x.memo.dentFor !== v.punch) {
      const hand = f.joints['hand' + (/^(cross|rear_)/.test(v.punch.move) ? 'R' : 'L')].getWorldPosition(V()), l = B.group.worldToLocal(hand), r = Math.hypot(l.x, l.z) || 1;
      x.memo.dentFor = v.punch; x.memo.dent = { y: Math.max(-R.h + .08, Math.min(R.h - .08, l.y)), ax: l.x / r, az: l.z / r, t0: pc.t, k: v.punch.k === 'hook' ? 1.15 : 1 };
    }
    const dn = x.memo.dent;
    if (B && dn) { const age = x.t - dn.t0, depth = .045 * dn.k * (age < R.hold ? 1 : Math.exp(-(age - R.hold) / .07)), fold = .02 * dn.k * Math.exp(-age / .12) * Math.cos(age * 30);
      if (age > .5) { B.dent(null); x.memo.dent = null; props.dented = false; } else { B.dent({ y: dn.y, ax: dn.ax, az: dn.az, depth }, fold); props.dented = true; } }
    else if (B && props.dented) { B.dent(null); props.dented = false; } // a restart in the middle of a dent
    // where the glove will meet the leather on this swing: the ring closes there
    let cue = null;
    if (v.prompt && v.prompt !== 'back') {
      const key = v.i + '|' + v.due; if (x.memo.cueKey !== key) { x.memo.cueKey = key; const c0 = x.sim.contact(x.sim.moveFor(v.type, true), v.due); x.memo.cuePos = c0 ? props.world(c0.hand).toArray() : null; }
      if (x.memo.cuePos) cue = { pos: x.memo.cuePos, k: v.k, now: !!v.open, kind: v.type };
    }
    return { pos: [9.35, 1.85, 4.1], look: [9.5, 1.3, BAGF.z], fit: [f, b], cue }; // wide enough for the step back: the camera does not have to back off
  }
  const T_PUNCH = ['straight', 'hook', 'uppercut'];
  const pw = (g, k, l) => W[l].punch[k];
  const games = {
    // Two-sided drill (Chapter 1 beat 8, GOTR-0106): Mack and the Fighter on the two sides of the new heavy bag in Bruno's Gym.
    // "You hit, I hit": Mack hits, the bag swings over; hit it back at the top of the swing with the punch he calls (x2: twice).
    bag_duo: {
      set: 'dream_gym', wear: 'kit', dpad: false, roles: { fighter: {}, pip: {} }, make: (T, o) => new T.DuoTrial(undefined, o), pads: T_PUNCH, ghost: ['straight', 'hook', 'uppercut'],
      words: {
        en: { title: 'Two-sided drill', goal: 'Hit the bag back to Mack', count: 'Hits', miss: 'Misses', help: 'Mack hits, then it is your turn: hit the bag when it swings to you, with the punch he calls. ×2 means twice.', caps: { up: '', down: '', left: '', right: '' } },
        he: { title: 'תרגיל משני הצדדים', goal: 'החזירו את השק למאק', count: 'פגיעות', miss: 'החטאות', help: 'מאק מכה ואז תורכם: הכו בשק כשהוא מגיע אליכם, במכה שהוא קורא. ×2 זה פעמיים.', caps: { up: '', down: '', left: '', right: '' } },
        ru: { title: 'Мешок с двух сторон', goal: 'Отбейте мешок Маку', count: 'Удары', miss: 'Промахи', help: 'Мак бьёт, потом ваш ход: бейте, когда мешок качнётся к вам, тем ударом, который он называет. ×2 — дважды.', caps: { up: '', down: '', left: '', right: '' } }
      },
      hud: (v, g, l) => ({ goal: `${g.goal} · ${g.count} ${v.landed} · ${Math.ceil(v.left || 0)} s`, prompt: v.prompt ? pw(g, v.prompt, l) + (v.double ? ` ×${v.need - v.hits}` : '') : '', arrow: v.prompt || '', kind: v.prompt || '', ring: v.phase === 'toward' ? v.k : -1, now: !!v.open }),
      detail: (r, g) => `${g.count} ${r.value} · ${g.miss} ${r.misses} · ${r.time} s`,
      frame(x, v) {
        // Contact without the glove going into the bag (owner, 2026-11-21: "the hands of players are inside the bag"). Measured in the game
        // (rig facing the bag): forward hand reach at the punch phase where the glove meets the leather — Straight 0.90 m at 0.36, Hook
        // 0.80 m at 0.40, Uppercut 0.715 m at 0.38 (measured during play, glove edge included). Both stand R0 from the bag's rest point; at the top of each swing the bag comes in just
        // far enough for that punch to touch it (centre at reach + glove 0.06 + bag radius); the punch rises to that phase, holds on the
        // leather and pulls back. Mack always answers with a Straight. Swing angle about the mount, 1.57 m above the gloves.
        const P = window.BagBreakCore.PLACE, B = window.BagBreakCore.BAG, R0 = 1.45, ARM = 1.57, f = x.rigs.fighter, m = x.rigs.pip, bag = x.set.objects.oldBag;
        const CONTACT = { straight: [.36, .90], hook: [.40, .80], uppercut: [.38, .715] }, amp = ([, reach]) => Math.asin(Math.min(.6, Math.max(0, R0 - reach - .06 - B.r)) / ARM);
        x.place(f, { x: P.x + R0, z: P.z, ry: -Math.PI / 2 }); x.place(m, { x: P.x - R0, z: P.z, ry: Math.PI / 2 });
        const a = x.memo.act, age = a ? x.t - a.t : 9, C = window.StoryTrials.DUO.contact, opt = { options: { guardCover: 1, power: 1.2, recoil: 0, advance: 0, contactDrive: 0 } };
        if (a && T_PUNCH.includes(a.k) && age < C + .3) { const hit = CONTACT[a.k][0]; pose(f, { act: 'move', move: { straight: a.n % 2 ? 'jab' : 'cross', hook: 'hook', uppercut: 'uppercut' }[a.k], phase: age < C ? .14 + age / C * (hit - .14) : hit - Math.min(1, Math.max(0, age - C - .05) / .25) * (hit - .14) }, x.t, opt); }
        else pose(f, { act: v.phase === 'end' ? 'idle' : 'guard' }, x.t);
        // trial mackPhase runs .14 -> .375 (contact) -> .14; scaled to the Straight's contact phase
        if (v.mackPhase != null) pose(m, { act: 'move', move: 'cross', phase: .14 + (Math.min(.375, v.mackPhase) - .14) / (.375 - .14) * (CONTACT.straight[0] - .14) }, x.t, opt);
        else pose(m, { act: v.phase === 'end' ? 'idle' : 'guard' }, x.t);
        const sw = v.swing ?? 0, th = sw > 0 ? amp(CONTACT.straight) * sw : amp(CONTACT[v.type] || CONTACT.straight) * sw; // + toward Mack, - toward the Fighter
        if (bag?.pose && bag.sample) { x.memo.base ||= bag.sample; bag.pose(window.GymReturnCore.bagPoseAt(x.memo.base, th)); }
        return { pos: [P.x, 1.6, P.z + 3.7], look: [P.x, 1.3, P.z], fit: [f, m] };
      }
    },
    // Brick's bag (GOTR-0077): Brick swings the new heavy bag at the Fighter from a boom stand on the pavement; throw the punch he
    // calls so the glove meets the leather (trials-core.js BagTrial: a real chain-and-bag pendulum, the hit is decided where the
    // glove touches). Miss and he shoves it back: step back. The rules work in the Fighter's frame (root at the origin facing +x);
    // here that frame sits at BAGF in the street, so a rules point (x, y, z) is the world point (BAGF.x + x, y, BAGF.z + z).
    carry_bag: {
      set: 'gymfront', roles: { fighter: { wear: 'kit' }, brick: { rig: 'brick', cast: true } }, make: (T, o) => new T.BagTrial(undefined, o), pads: T_PUNCH, ghost: ['straight', 'hook', 'uppercut', 'left'],
      words: {
        en: { title: "Brick's bag", goal: 'Hit the bag as it swings in', count: 'Misses', help: 'Brick swings the bag at you and calls the punch. Throw it so the glove meets the leather as the ring closes on the bag. Miss, and he shoves it back: step back (←).', back: 'Step back!', caps: { up: '', down: '', left: 'Back', right: '' } },
        he: { title: 'השק של בריק', goal: 'הכו בשק כשהוא מתנדנד אליכם', count: 'החטאות', help: 'בריק מנדנד אליכם את השק וקורא את המכה. זרקו אותה כך שהכפפה פוגשת את העור כשהטבעת נסגרת על השק. פספסתם? הוא דוחף אותו בחזרה: צעד אחורה (←).', back: 'צעד אחורה!', caps: { up: '', down: '', left: 'אחורה', right: '' } },
        ru: { title: 'Мешок Брика', goal: 'Бейте мешок, когда он летит к вам', count: 'Промахи', help: 'Брик раскачивает мешок на вас и называет удар. Бейте так, чтобы перчатка встретила кожу, когда кольцо сомкнётся на мешке. Промах — он толкнёт мешок обратно: шаг назад (←).', back: 'Шаг назад!', caps: { up: '', down: '', left: 'Назад', right: '' } }
      },
      hud: (v, g, l) => ({ goal: `${g.goal} · ${Math.min(v.i + 1, v.total)}/${v.total} · ${g.count} ${v.mistakes}`, prompt: v.prompt === 'back' ? g.back : v.prompt ? pw(g, v.prompt, l) : '', arrow: v.prompt === 'back' ? 'left' : v.prompt || '', kind: v.prompt === 'back' ? 'warn' : v.prompt || '', ring: v.prompt && v.prompt !== 'back' ? v.k : -1, now: !!v.open || (v.phase === 'bite' && !v.hold) }),
      detail: (r, g) => `${g.count} ${r.value} · ${r.time} s`,
      frame(x, v, dt) { return bagFrame(x, v, dt); },
      dispose({ scene, memo }) { const P = memo.props; if (!P) return; scene?.remove(P.group); P.dispose(); memo.props = null; }
    },
    // Sleep talker: the night guard mumbles combos in his sleep; the lamps light in that order; repeat it on the bag.
    snoring_guard: {
      set: 'gymfront', roles: { fighter: {}, guard: { rig: 'guard' } }, make: (T, o) => new T.EchoTrial(undefined, o), pads: T_PUNCH, ghost: ['straight', 'hook', 'uppercut', 'down'],
      words: {
        en: { title: 'Sleep talker', goal: 'Repeat the combo he mumbles', count: 'Combos', help: 'Watch the lamps, then hit the same combo before it fades. Wrong hit? Duck the pillow.', watch: 'z Z z', duck: 'Duck!', caps: { up: '', down: 'Duck', left: '', right: '' } },
        he: { title: 'מדבר מתוך שינה', goal: 'חזרו על הרצף שהוא ממלמל', count: 'רצפים', help: 'עקבו אחרי המנורות ואז הכו את אותו רצף לפני שהוא דועך. טעיתם? התכופפו מהכרית.', watch: 'ז ז ז', duck: 'להתכופף!', caps: { up: '', down: 'להתכופף', left: '', right: '' } },
        ru: { title: 'Говорун во сне', goal: 'Повторите серию, которую он бормочет', count: 'Серии', help: 'Следите за лампами и повторите серию, пока она не погасла. Ошиблись? Ныряйте под подушку.', watch: 'х р р', duck: 'Нырок!', caps: { up: '', down: 'Нырок', left: '', right: '' } }
      },
      hud: (v, g, l) => ({ goal: `${g.goal} · ${g.count} ${v.round}/${v.rounds} · ${'♥'.repeat(v.lives)}`, prompt: v.prompt === 'down' ? g.duck : v.prompt === 'watch' ? v.seq.slice(0, v.lit + 1).map(k => pw(g, k, l)).join(' … ') || g.watch : v.prompt === 'repeat' ? v.seq.map((k, i) => i < v.idx ? '●' : '○').join(' ') : g.watch,
        arrow: v.prompt === 'down' ? 'down' : v.litType || '', kind: v.prompt === 'down' ? 'warn' : v.litType || (v.prompt === 'repeat' ? 'repeat' : 'zzz'), ring: v.prompt === 'repeat' ? 1 - v.fade : -1 }),
      detail: (r, g) => `${g.count} ${r.value}/${Trials().ECHO.lengths.length} · ${'♥'.repeat(r.lives)} · ${r.time} s`,
      frame(x, v) {
        const f = x.rigs.fighter, gd = x.rigs.guard, PX = 10.05, PZ = -1.4, st = x.set.objects.stand, t = x.t, a = x.memo.act, age = a ? t - a.t : 9;
        x.place(f, { x: 8.55, z: PZ, ry: Math.PI / 2 }); fighterAct(f, x);
        if (st) { st.visible = true; st.position.set(PX, 0, PZ); }
        hangBag(x.set.objects.bag, PX, 2.56, PZ, 1.2, a && T_PUNCH.includes(a.k) && age < .9 ? -.34 * Math.exp(-age * 3.2) * Math.cos(age * 9) - .04 : -.04);
        lamps(x, [PX, 2.98, PZ])(v.litType || (a && T_PUNCH.includes(a.k) && age < .22 ? a.k : null));
        x.place(gd, { x: 9.75, z: -2.75, ry: -.5 });
        if (v.phase === 'wake') pose(gd, { act: 'move', move: 'rear_hook', phase: .06 + v.wake * .4 }, t, { options: { power: 1.1 } });
        else { pose(gd, { act: 'sleep' }, t); if (!x.reduced) gd.root.rotation.z = .035 * Math.sin(t * 1.4); }
        gd.root.updateMatrixWorld(true);
        const pl = x.set.objects.pillow, hand = gd.joints?.handR; if (pl && hand) { pl.visible = true; hand.getWorldPosition(pl.position); hand.getWorldQuaternion(pl.quaternion); pl.position.y -= .06; }
        return { pos: [9.2, 1.7, 3.7], look: [9.5, 1.45, -1.7], fit: [f, gd] };
      }
    },
    // Rooftop barrage: read the arc (Slip the lob, duck the swinging one, step out of the splash), punch the gold ones back.
    rooftop_barrage: {
      set: 'market', roles: { fighter: {} }, make: (T, o) => new T.BarrageTrial(undefined, o), pads: ['straight'], ghost: ['left', 'down', 'right', 'straight'],
      words: {
        en: { title: 'Rooftop barrage', goal: 'Stay dry. Punch the gold balloons back', count: 'Dry', help: 'Lob: Slip. Swinging: duck. Big one: step out. Gold: punch it back late, for a bonus.', left: 'Slip!', down: 'Duck!', right: 'Step out!', bonus: 'Punch it back!', caps: { up: '', down: 'Duck', left: 'Slip', right: 'Step' } },
        he: { title: 'מטח מהגגות', goal: 'הישארו יבשים. החזירו את בלוני הזהב במכה', count: 'יבש', help: 'קשת: Slip. מתנדנד: התכופפו. גדול: צעד הצידה. זהב: הכו אותו חזרה ברגע האחרון, לבונוס.', left: 'Slip!', down: 'להתכופף!', right: 'צעד הצידה!', bonus: 'החזירו במכה!', caps: { up: '', down: 'להתכופף', left: 'Slip', right: 'צעד' } },
        ru: { title: 'Обстрел с крыш', goal: 'Останьтесь сухим. Отбивайте золотые шарики', count: 'Сухо', help: 'Навесом: Slip. Качается: нырок. Большой: шаг в сторону. Золотой: отбейте в последний момент, за бонус.', left: 'Slip!', down: 'Нырок!', right: 'Шаг в сторону!', bonus: 'Отбей!', caps: { up: '', down: 'Нырок', left: 'Slip', right: 'Шаг' } }
      },
      hud: (v, g) => ({ goal: `${g.goal} · ${v.i}/${v.total} · ${g.count} ${v.clean}`, prompt: v.canReflect ? g.bonus : v.prompt ? g[v.prompt] : '', arrow: v.canReflect ? 'straight' : v.prompt || '', kind: v.bonus ? 'uppercut' : v.prompt ? 'hook' : '', ring: v.balloon && v.balloon.state === 'fly' ? v.balloon.k : -1, now: v.canReflect }),
      detail: (r, g) => `${g.count} ${r.clean}/${Trials().BARRAGE.count} · ★ ${r.reflected} · ${r.time} s`,
      frame(x, v) {
        const f = x.rigs.fighter, FX = -4.7, FZ = -1.0, a = x.memo.act, age = a ? x.t - a.t : 9, side = a && a.k === 'right' && age < .46 ? Math.sin(Math.min(1, age / .46) * Math.PI) * .7 : 0;
        x.place(f, { x: FX + side, z: FZ, ry: Math.PI }); fighterAct(f, x);
        const o = x.set.objects, b = v.balloon; o.balloon.visible = o.balloon2.visible = false;
        if (b) {
          const m = b.marked ? o.balloon2 : o.balloon, sx = [-7, -2.4, 3.2][b.from], S0 = V(sx + .45, 4.7, -3.8), k = b.state === 'back' ? 1 - b.back : b.k;
          const E = b.kind === 'head' ? V(FX, 1.82, FZ - .2) : b.kind === 'low' ? V(FX, 1.22, FZ - .25) : V(FX, .35, FZ - .1), lift = b.kind === 'head' ? 1.0 : b.kind === 'low' ? -.2 : 2.6;
          m.visible = true; m.position.lerpVectors(S0, E, k); m.position.y += Math.sin(k * Math.PI) * lift; if (b.kind === 'low') m.position.x += Math.sin(k * Math.PI) * (sx < FX ? -1.6 : 1.6);
          m.scale.setScalar((b.kind === 'wide' ? 1.7 : 1) * (b.marked && !x.reduced ? 1 + .12 * Math.sin(x.t * 18) : 1)); m.rotation.z = k * 3;
        }
        return { pos: [FX + 1.5, 2.35, 4.1], look: [FX - .2, 2.3, -3.6], fit: [f] };
      }
    },
    // Cut him off: footwork on a grid in the alley. Stay level with the raccoon and step in until he has no way out.
    cut_him_off: {
      set: 'market', roles: { fighter: {}, raccoon: { rig: 'raccoon' } }, make: (T, o) => new T.CutoffTrial(undefined, o), pads: [], ghost: ['up', 'down', 'left'],
      words: {
        en: { title: 'Cut him off', goal: 'Corner the raccoon', count: 'Caught', help: 'He only runs where you cannot reach. Stay level with him, then step in.', esc: 'He got past! +5 s', caps: { up: 'Side', down: 'Side', left: 'Step in', right: 'Step out' } },
        he: { title: 'לחסום אותו', goal: 'דחקו את הדביבון לפינה', count: 'נתפס', help: 'הוא בורח רק לאן שאינכם מגיעים. הישארו מולו ואז צעדו פנימה.', esc: 'הוא חמק! +5 שנ׳', caps: { up: 'הצידה', down: 'הצידה', left: 'פנימה', right: 'החוצה' } },
        ru: { title: 'Отрежь путь', goal: 'Загоните енота в угол', count: 'Поймано', help: 'Он бежит только туда, куда вы не достаёте. Держитесь напротив и шагайте вперёд.', esc: 'Проскочил! +5 с', caps: { up: 'Вбок', down: 'Вбок', left: 'Вперёд', right: 'Назад' } }
      },
      hud: (v, g) => ({ goal: `${g.goal} · ${g.count} ${v.catches}/${v.need}`, prompt: v.flash && v.flash.type === 'escape' && v.t - v.flash.t < 6.2 ? g.esc : `${Math.floor(v.t / 60)}:${String(Math.floor(v.t % 60)).padStart(2, '0')}`, arrow: '', kind: v.flash && v.flash.type === 'escape' && v.t - v.flash.t < 6.2 ? 'warn' : 'clock', ring: -1 }),
      detail: (r, g) => `${r.time} s · ${g.count} ${r.catches}/${Trials().CUTOFF.catches}`,
      frame(x, v) {
        const f = x.rigs.fighter, rc = x.rigs.raccoon, X0 = -1.4, cell = p => ({ x: X0 + p.c * 1.15, z: -2.0 + p.r * .8 }), F = cell(v.f), Rc = cell(v.rc), o = x.set.objects;
        x.place(f, { ...F, ry: Math.atan2(Rc.x - F.x, Rc.z - F.z) }); x.place(rc, { ...Rc, ry: Math.atan2(Rc.x - F.x, Rc.z - F.z) + (v.options ? 0 : Math.PI) });
        pose(f, { act: 'idle', walking: v.f.moving, stepPhase: v.f.k }, x.t); // a chase on foot, not a fight
        const caught = v.flash && v.flash.type === 'catch' && v.t - v.flash.t < .8;
        pose(rc, caught || x.over ? { act: 'down', actT: 1 } : { act: 'idle', walking: v.rc.moving, stepPhase: v.rc.k }, x.t);
        for (const [m, z] of [[o.crate, -1.7], [o.crate2, .5]]) { m.visible = true; m.position.set(X0 - 1.15, 0, z); } o.bar.visible = true; o.bar.position.set(X0 - 1.15, 0, -.4);
        const wh = o.whistle, hand = rc.joints?.handL; if (wh && hand) { wh.visible = true; hand.getWorldPosition(wh.position); wh.scale.setScalar(2); }
        return { pos: [2.05, 5.2, 4.9], look: [2.05, .6, -.5], fit: [f, rc] };
      }
    },
    // The hustler's bet: the raccoon feints. Punish only the real openings; three bites on feints lose the bet.
    hustlers_bet: {
      set: 'market', roles: { fighter: {}, raccoon: { rig: 'raccoon' } }, make: (T, o) => new T.BetTrial(undefined, o), pads: ['straight'], ghost: ['straight'],
      words: {
        en: { title: "The hustler's bet", goal: 'Hit him only when he really opens up', count: 'Clean hits', help: 'A twitch is a feint. Arm up and a grin is the real opening. Three bites and you lose.', offer: 'Double or nothing?', yes: 'Double', no: 'Keep it', caps: { up: 'Double', down: 'Keep', left: '', right: '' } },
        he: { title: 'ההימור של הנוכל', goal: 'הכו רק כשהוא באמת נפתח', count: 'פגיעות נקיות', help: 'קפיצה קטנה היא הטעיה. יד למעלה וחיוך הם פתח אמיתי. שלוש נפילות בפח והפסדתם.', offer: 'כפול או כלום?', yes: 'כפול', no: 'לשמור', caps: { up: 'כפול', down: 'לשמור', left: '', right: '' } },
        ru: { title: 'Пари жулика', goal: 'Бейте, только когда он правда открылся', count: 'Чистые попадания', help: 'Рывок — это финт. Рука вверх и ухмылка — настоящее окно. Три ошибки, и пари проиграно.', offer: 'Вдвое или ничего?', yes: 'Вдвое', no: 'Оставить', caps: { up: 'Вдвое', down: 'Оставить', left: '', right: '' } }
      },
      hud: (v, g) => ({ goal: `${g.goal} · ${g.count} ${v.hits} · ${'✕'.repeat(v.bites)}${'·'.repeat(v.maxBites - v.bites)}`, prompt: v.phase === 'offer' ? g.offer : v.stage === 'bonus' ? '×2' : '', arrow: v.phase === 'offer' ? 'up' : '', kind: v.phase === 'offer' || v.stage === 'bonus' ? 'uppercut' : '', ring: -1 }),
      detail: (r, g) => `${g.count} ${r.hits} · ${'✕'.repeat(r.bites)} · ${r.time} s`,
      frame(x, v) {
        const f = x.rigs.fighter, rc = x.rigs.raccoon, t = x.t, fl = v.flash, hit = fl && ['hit', 'double'].includes(fl.type) ? v.t - fl.t : 9;
        x.place(f, { x: 4.0, z: -1.0, ry: Math.PI / 2 }); x.place(rc, { x: 5.42, z: -1.0, ry: -Math.PI / 2 }); fighterAct(f, x);
        let hop = 0;
        if (hit < .5) pose(rc, { act: 'down', actT: Math.min(.3, hit) }, t);
        else if (v.phase === 'feint') pose(rc, { act: 'move', move: v.k < .5 ? 'jab' : 'cross', phase: .1 + Math.sin(v.k * Math.PI) * .16 }, t);
        else if (v.phase === 'open') pose(rc, { act: 'flex', actT: .25 + v.k * .3 }, t);
        else if (v.phase === 'offer') pose(rc, { act: 'point', actT: 1 }, t);
        else { pose(rc, { act: 'guard' }, t); if (!x.reduced) hop = .03 * Math.abs(Math.sin(t * 7)); }
        rc.root.position.y = hop; rc.root.updateMatrixWorld(true);
        return { pos: [4.75, 1.55, 3.1], look: [4.72, 1.3, -1.0], fit: [f, rc] };
      }
    }
  };
  const Trials = () => window.StoryTrials;

  /* ---------------------------------------------------------------- runner */
  function play(id, opts = {}) {
    window.RinglessVenues?.release(window.app?.engine, true); // a story scene takes over from any street/Docks bout: the Fighter gets his own gloves back
    if (window.DreamScenes?.has(id)) return window.DreamScenes.play(id, opts); // Chapter 1 "The Dream" (GOTR-0078): dream-scenes.js
    if (window.BagBreak?.has(id)) return window.BagBreak.play(id, opts); // beat 4, the old bag breaks (GOTR-0087): bag-break.js
    const C = Core(), e = window.app?.engine, done = typeof opts.onDone === 'function' ? opts.onDone : () => {};
    const game = games[id] || null, scene0 = C?.scenes[id];
    const direct = !!game?.direct;
    const fail = error => { setTimeout(() => done({ id, skipped: true, error }), 0); return false; };
    if (!C || (!game && !scene0)) return fail('unknown scene');
    if (!e?.renderer || !e.coach?.update || !window.StorySets || !window.LionCoach || (game && !Trials())) return fail('engine not ready');
    if (current) current.finish({ skipped: true, replaced: true });
    if (e.fightIQDemo) return fail('busy');
    const reduced = opts.reducedMotion ?? reducedMotion(), L = lang(), gw = game ? game.words[L] || game.words.en : null;
    const ui = overlay(game ? 'game' : 'scene');
    const run = { id, closed: false, t: 0, ui, host: ui.host, edge: 0 }; if (game) ui.d.dataset.game = id;
    current = run;
    let set = null, scene = null, camera = null, borrowed = [], mitts = [], rigs = {}, sim = null, stageMove = null, oldFit = null, finished = false, blobs = [];
    let directInput = null;
    let memo = {}, hard = !!opts.hard, acts = 0; const look = V(), extras = [], dressed = [];
    const placeKind = C.placeOf(game || scene0), wear = game?.wear || C.outfitFor(placeKind); run.place = placeKind; run.wear = wear; // a job in the gym (GOTR-0099) is street clothes
    const finish = (result = {}) => {
      if (run.closed) return; run.closed = true; if (current === run) current = null;
      try { cleanup(); } catch (x) { console.warn('story', x); }
      ui.d.close?.(); ui.d.remove(); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      done({ id, ...result });
    };
    run.finish = finish; Object.defineProperty(run, 'sim', { get: () => sim }); Object.defineProperty(run, 'rigs', { get: () => rigs }); Object.defineProperty(run, 'memo', { get: () => memo }); // read-only, for QA probes
    function cleanup() {
      directInput?.dispose(); directInput = null;
      if (e.fightIQDemo === run) e.fightIQDemo = null;
      for (const m of mitts) window.TrainingGear?.dispose(m); mitts = [];
      try { game?.dispose?.({ scene, memo }); } catch (x) { console.warn('story', x); } // a game's own props (GOTR-0099)
      for (const m of extras) { scene?.remove(m); m.material?.dispose(); } if (extras.length) extras[0].geometry.dispose(); extras.length = 0;
      for (const c of dressed) { window.StoryCast?.outfit(c, 'kit'); window.DreamPose?.reset(c); } dressed.length = 0;
      for (const b of borrowed) giveBack(b); borrowed = [];
      for (const b of blobs) { scene?.remove(b.mesh); } if (blobs.length) { blobs[0].mesh.geometry.dispose(); blobs[0].mesh.material.map.dispose(); blobs[0].mesh.material.dispose(); } blobs = [];
      set?.dispose(); set = null;
      if (stageMove) { stageMove.placeholder.replaceWith(stageMove.stage); stageMove.stage.classList.remove('game-preview-live', 'story-live'); stageMove.stage.style.pointerEvents = stageMove.pe; stageMove = null; window.dispatchEvent(new Event('resize')); }
      if (oldFit) { e.fitCameraToModel = oldFit; oldFit = null; }
      // The engine poses the Fighter again on its next frame, also when the game is paused at the mitts (GOTR-0072).
      e.arena?.repose?.(); e.lastPoseStamp = null; e.lastRenderStamp = null;
    }
    const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', j: 'straight', k: 'hook', l: 'uppercut', z: 'straight', x: 'hook', c: 'uppercut' };
    const press = (k, down) => {
      if (!sim || run.result) return;
      if (run.intro > 0) { if (down) run.intro = 0; return; } // any input ends the tutorial
      if (down) memo.act = { k, t: run.t, n: ++acts };
      sim.key(k, down); const b = ui.keys?.[k]; if (b) { b.dataset.pressed = String(down); if (ui.arrows[k]) { if (down) ui.dpad.dataset.dir = k; else if (ui.dpad.dataset.dir === k) delete ui.dpad.dataset.dir; } }
    };
    const onKey = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); finish({ skipped: true }); return; }
      if (direct && ev.target !== ui.surface && ev.type === 'keydown') return;
      const k = (game?.keymap || KEYMAP)[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key]; if (!k || !game) return;
      ev.preventDefault(); if (ev.type === 'keydown' && ev.repeat) return; press(k, ev.type === 'keydown');
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    ui.d.addEventListener('cancel', ev => { ev.preventDefault(); finish({ skipped: true }); });
    if (!game) ui.d.addEventListener('pointerdown', () => finish({ skipped: true }));
    if (game) buildGameUi();

    window.StorySets.ready().then(() => new Promise(r => requestAnimationFrame(() => r()))).then(() => {
      if (run.closed) return;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(36, 1, .1, 220);
      set = window.StorySets.build(game ? game.set : scene0.set, scene, { renderer: e.renderer, shadows: !!e.renderer.shadowMap?.enabled });
      for (const [key, a] of Object.entries(game ? game.roles : scene0.actors)) {
        const c = rigFor(a.rig || key, e, borrowed.map(b => b.c), a), wearOf = a.wear || wear;
        borrowed.push(borrow(c)); scene.add(c.root); c.root.visible = true; c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); /* GOTR-0074: fighters are mirrored at the root; a plain scale of 1 tears the skin */ c.maneInitialized = false; rigs[key] = c;
        window.DreamPose?.reset(c); if (window.StoryCast) { window.StoryCast.outfit(c, wearOf, { tint: looks[a.rig || key]?.shorts }); dressed.push(c); } // clothes follow the place (kit and gloves only in the gym and the ring; a role may say otherwise: the Fighter's gloves at Brick's bag)
        if (a.mitts && window.TrainingGear && wearOf === 'kit') mitts.push(window.TrainingGear.mitt(c, 'L'), window.TrainingGear.mitt(c, 'R'));
      }
      if (game) { sim = game.make(Trials(), { hard }); run.intro = opts.noIntro || direct ? 0 : 3; }
      // Soft contact shade under every character: keeps feet on the ground when the device has turned shadows off.
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(20,14,8,1)'); gr.addColorStop(.55, 'rgba(20,14,8,.55)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: e.renderer.shadowMap?.enabled ? .3 : .55, toneMapped: false });
      for (const c of Object.values(rigs)) { const mesh = new THREE.Mesh(blobGeo, blobMat); mesh.renderOrder = 1; mesh.scale.set(1.25, 1, 1.0); scene.add(mesh); blobs.push({ mesh, c }); }
      // Take the engine's canvas: same demo hook and stage move as the Fight IQ examples.
      const stage = e.stage || document.getElementById('stageContainer');
      if (stage) { const placeholder = document.createComment('story stage'); stage.before(placeholder); stageMove = { stage, placeholder, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; ui.host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
      if (direct && stage) {
        const canvas = stage.querySelector('canvas');
        if (!canvas) throw Error('game canvas unavailable');
        directInput = game.mount({ surface: ui.surface, canvas, camera, getSim: () => sim });
        run.projectFloor = (x,z) => directInput?.project(x,z);
      }
      oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
      run.frame = frame; e.fightIQDemo = run; ui.busy.remove();
      window.dispatchEvent(new Event('resize'));
    }).catch(x => { console.warn('story', x); finish({ skipped: true, error: String(x?.message || x) }); });

    const place = (c, a, y = 0) => { c.root.position.set(a.x, y, a.z); c.root.rotation.set(0, a.ry, 0); c.root.updateMatrixWorld(true); };
    function bagOnRig(c, tilt = 0) { const b = set.objects.bag; b.position.copy(c.root.localToWorld(V(0, 1.12, .38))); b.quaternion.copy(c.root.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt)); }
    function aimCamera(shot, limY) {
      camera.position.fromArray(shot.pos); look.fromArray(shot.look); camera.lookAt(look);
      if (shot.minHorizontal) {
        const v = Math.min(96, Math.max(camera.fov, 2 * Math.atan(Math.tan(shot.minHorizontal * Math.PI / 360) / camera.aspect) * 180 / Math.PI));
        if (camera.fov !== v) { camera.fov = v; camera.updateProjectionMatrix(); }
      }
      const framed = (shot.fit || []).map(k => typeof k === 'string' ? rigs[k] : k).filter(Boolean);
      const edge = keepInFrame(camera, look, framed, .93, limY); run.edge = Math.max(run.edge, edge); set.focus(look.x, look.z);
      return edge;
    }
    function frame(delta) {
      if (run.closed) return;
      const dt = Math.min(Math.max(delta || 0, 0), .05) * (opts.timeScale || 1); run.t += dt;
      fitLens(camera, e);
      const edge = game ? gameFrame(dt) : sceneFrame();
      for (const b of blobs) { b.mesh.visible = b.c.root.visible; b.mesh.position.set(b.c.root.position.x - .1, .012, b.c.root.position.z - .12); b.mesh.rotation.y = b.c.root.rotation.y; }
      if (e.renderer.shadowMap?.enabled) e.renderer.shadowMap.needsUpdate = true;
      e.renderer.render(scene, camera);
      const info = e.renderer.info.render; lastStats = { calls: info.calls, triangles: info.triangles, set: set.stats(), edge: +edge.toFixed(3), worstEdge: +run.edge.toFixed(3) };
    }
    function sceneFrame() {
      const s = C.sample(scene0, run.t, { reduced });
      for (const [key, a] of Object.entries(s.actors)) { const c = rigs[key]; if (!c || !a) continue; c.root.visible = a.act !== 'off'; if (!c.root.visible) continue; place(c, a); const y = pose(c, a, run.t, { reduced }); if (y) { c.root.position.y = y; c.root.updateMatrixWorld(true); } }
      if (set.objects.bus && s.props.bus) set.objects.bus.position.x = s.props.bus[0];
      if (scene0.bag && set.objects.bag) {
        const holder = rigs[scene0.bag.holder], drop = scene0.bag.drop, b = set.objects.bag; b.visible = true;
        if (run.t < drop) bagOnRig(holder);
        else {
          if (!run.bagFall) { const h = C.sample(scene0, drop).actors[scene0.bag.holder], o = new THREE.Object3D(); o.position.set(h.x, 0, h.z); o.rotation.y = h.ry; o.updateMatrixWorld(true);
            run.bagFall = { p0: o.localToWorld(V(0, 1.12, .38)), q0: o.quaternion.clone(), p1: o.localToWorld(V(0, .17, .8)), q1: o.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2)) }; }
          const f = run.bagFall, k = Math.min(1, (run.t - drop) / .45), bounce = reduced ? 0 : .06 * Math.max(0, Math.sin(Math.min(1, (run.t - drop - .45) / .3) * Math.PI));
          b.position.lerpVectors(f.p0, f.p1, k * k); b.position.y += bounce; b.quaternion.copy(f.q0).slerp(f.q1, Math.min(1, k * 1.2));
        }
      }
      if (scene0.item && set.objects[scene0.item.id]) {
        const it = set.objects[scene0.item.id], h = [...scene0.item.holders].reverse().find(x => run.t >= x.t), hand = h && rigs[h.who]?.joints?.['hand' + h.hand];
        it.visible = !!hand; if (hand) { hand.getWorldPosition(it.position); it.position.y += .02; it.quaternion.copy(rigs[h.who].root.quaternion); }
      }
      const edge = s.camera ? aimCamera(s.camera, .78) : 0;
      showLine(ui, s.line);
      if (s.done && !finished) { finished = true; setTimeout(() => finish({ skipped: false }), reduced ? 400 : 250); }
      return edge;
    }

    /* ---- skill trial: 3 s tutorial, fixed-step rules, hit-stop, the game's own frame, HUD with the fighter pad */
    function restart(nextHard = hard) { directInput?.clear(); hard = nextHard; ui.result?.remove(); ui.result = null; run.result = null; run.saved = null; sim = game.make(Trials(), { hard }); memo = memo.props ? { props: memo.props } : {}; acts = 0; run.intro = 0; run.freeze = 0; run.flashT = -1; ui.promptKey = null; ui.d.dataset.hard = String(hard); }
    function gameFrame(dt) {
      if (run.intro > 0) run.intro = Math.max(0, run.intro - dt);
      else if (run.freeze > 0) run.freeze -= dt; // hit-stop: the world holds for a moment on a clean hit
      else if (!run.result) { for (let left = dt; left > 1e-6 && !sim.done; left -= 1 / 120) sim.step(Math.min(left, 1 / 120)); if (sim.done) endGame(); } // 120 Hz rules: timing windows do not depend on the frame rate
      const v = sim.view(), fl = v.flash;
      if (fl && fl.t !== run.flashT) { run.flashT = fl.t; pop(fl); if (['hit', 'perfect', 'reflect', 'catch', 'combo', 'double'].includes(fl.type) && !reduced) run.freeze = fl.type === 'hit' ? .05 : .09; }
      const shot = game.frame({ set, scene, rigs, sim, view: v, t: run.t, reduced, memo, extras, place, over: !!run.result, overAt: run.overAt || 0 }, v, dt);
      const edge = aimCamera(shot, .86); paintHud(v); paintCue(shot.cue); return edge;
    }
    /** A ring in the world (where the glove will meet the leather) that closes as the moment comes: k 0 -> 1; now = press now. */
    function paintCue(c) {
      const n = ui.cue; if (!n) return;
      if (!c || run.result || run.intro > 0) { if (!n.hidden) n.hidden = true; return; }
      const p = _p.fromArray(c.pos).project(camera), r = e.renderer.domElement.getBoundingClientRect(), box = ui.d.getBoundingClientRect();
      if (p.z > 1) { n.hidden = true; return; }
      n.hidden = false; n.dataset.kind = c.kind || ''; n.dataset.now = String(!!c.now);
      n.style.transform = `translate(${(r.left - box.left + (p.x + 1) / 2 * r.width).toFixed(1)}px,${(r.top - box.top + (1 - p.y) / 2 * r.height).toFixed(1)}px)`;
      n.firstChild.style.transform = `translate(-50%,-50%) scale(${(1 + 2.2 * (1 - Math.min(1, c.k))).toFixed(3)})`; n.firstChild.style.opacity = String((.35 + .65 * Math.min(1, c.k)).toFixed(2));
    }
    function pop(fl) {
      const good = ['hit', 'perfect', 'reflect', 'catch', 'combo', 'dodge', 'double'].includes(fl.type), why = w().why[fl.type], n = el('div', 'story-pop', fl.type === 'note' ? '' : good ? (fl.type === 'perfect' ? '★ ' : '') + (fl.pts ? '+' + fl.pts : '✓') + (fl.mult > 1 ? ' ×' + fl.mult : '') : '✕' + (why ? ' ' + why : ''));
      if (fl.type === 'note') return; n.dataset.kind = good ? (fl.type === 'perfect' || fl.type === 'reflect' || fl.type === 'double' ? 'gold' : 'good') : 'bad'; ui.d.append(n); setTimeout(() => n.remove(), 700);
      if (!good && !reduced) { ui.d.classList.remove('shake'); void ui.d.offsetWidth; ui.d.classList.add('shake'); }
    }
    /** One spoken line inside the tutorial or the result (portrait, name, words): never a box over the scene. */
    function said(l) {
      const p = el('p', 'story-say'); p.dataset.who = l.who; const bust = window.AdventureStory?.bust?.(l.who); if (bust) { bust.classList.add('story-face'); p.append(bust); }
      const name = (window.AdventureStory?.who?.[l.who]?.name || {})[L] || ''; p.append(el('strong', 'story-name', name), el('span', 'story-text', l.text[L] || l.text.en)); p.dir = 'auto';
      try { if (l.kind) window.AdventureStory?.mark?.(l.id || id, l.kind, 0); } catch { /* journal is optional */ }
      return p;
    }
    function buildDirectUi() {
      const hud = el('div','story-mop-hud'), title = el('strong','story-mop-title',gw.title), goal = el('span','story-mop-value'),
        bar = el('div','story-mop-bar'), barFill = el('i'), surface = el('div','story-mop-surface'),
        footer = el('div','story-mop-footer'), help = el('p','story-mop-help',gw.help), keyboard = el('p','story-mop-keyboard',gw.keyboard),
        finishShift = el('button','story-btn story-mop-finish',gw.finish),
        quit = el('button','story-quit','×'), again = el('button','story-quit story-retry','↻');
      ui.d.dataset.direct = 'true';
      surface.tabIndex = 0; surface.setAttribute('role','group'); surface.setAttribute('aria-label',gw.help+' '+gw.keyboard);
      bar.setAttribute('role','progressbar'); bar.setAttribute('aria-label',gw.goal); bar.setAttribute('aria-valuemin','0'); bar.setAttribute('aria-valuemax','100'); bar.setAttribute('aria-valuenow','0'); bar.append(barFill);
      for (const b of [quit,again,finishShift]) b.type = 'button';
      quit.setAttribute('aria-label',w().quit); again.setAttribute('aria-label',w().retry); quit.title=w().quit; again.title=w().retry;
      quit.onclick=()=>finish({ skipped:true,quit:true }); again.onclick=()=>{ restart(); surface.focus({preventScroll:true}); };
      finishShift.disabled=true; finishShift.onclick=()=>sim?.finish();
      hud.append(title,goal,bar); footer.append(help,keyboard,finishShift);
      const intro=game.say?.('intro'); if (intro) footer.append(said(intro));
      ui.d.append(surface,hud,footer,again,quit); Object.assign(ui,{ surface,goal,bar,barFill,footer,finishShift,keys:{},dpad:{ dataset:{} } });
    }
    function buildGameUi() {
      if (direct) { buildDirectUi(); return; }
      const hud = el('div', 'story-hud'), goal = el('p', 'story-goal'), score = el('p', 'story-score'), help = el('div', 'story-tutorial'), prompt = el('div', 'story-prompt'), ring = el('span', 'story-ring'), pIcon = el('span', 'story-prompt-arrow'), pText = el('span', 'story-prompt-text'), bar = el('div', 'story-progress'), barFill = el('i'), quit = el('button', 'story-quit', '×'), again = el('button', 'story-quit story-retry', '↻');
      quit.type = again.type = 'button'; quit.setAttribute('aria-label', w().quit); quit.title = w().quit; quit.onclick = () => finish({ skipped: true, quit: true });
      again.setAttribute('aria-label', w().retry); again.title = w().retry; again.onclick = () => restart();
      pIcon.innerHTML = CHEVRON; prompt.append(ring, pIcon, pText); bar.append(barFill);
      help.append(el('strong', 'story-tutorial-title', gw.title), el('p', '', gw.help));
      const intro = game.say?.('intro'); if (intro) help.append(said(intro)); // GOTR-0099: the Coach's one line before the job
      help.append(el('span', 'story-tutorial-count'));
      // The game's own pad (fighter-pad.css): round D-pad on the left, punch buttons on the right.
      const pad = el('div', 'fighter-pad story-pad'), zone = el('div', 'fp-zone fp-left'), dpad = el('div', 'fp-dpad'), face = el('div', 'fp-face'), arrows = {}, keys = {};
      const bind = (b, k) => { const on = down => ev => { ev.preventDefault(); if (down) b.setPointerCapture?.(ev.pointerId); if (down === (b.dataset.pressed === 'true') && !(run.intro > 0)) return; press(k, down); }; b.addEventListener('pointerdown', on(true)); for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(n, on(false)); keys[k] = b; };
      for (const k of ['up', 'right', 'left', 'down']) {
        const b = el('button', 'fp-arrow'); b.type = 'button'; b.dataset.dir = k; b.setAttribute('aria-label', `${w().dir[k]}${gw.caps[k] ? ': ' + gw.caps[k] : ''}`); if (!gw.caps[k]) b.dataset.idle = 'true';
        const ink = el('span', 'fp-ink'), cap = el('span', 'fp-cap', gw.caps[k]); ink.innerHTML = CHEVRON; cap.dir = 'auto'; ink.append(cap); b.append(ink); face.append(b); arrows[k] = b; bind(b, k);
      }
      dpad.append(face, el('span', 'fp-hub')); zone.append(dpad); pad.append(zone); if (game.dpad === false) zone.hidden = true; // punches only (bag_duo)
      if (game.pads.length) {
        const right = el('div', 'fp-zone fp-right'), arc = el('div', 'fp-arc');
        for (const k of game.pads) { const b = el('button', 'fp-btn'); b.type = 'button'; b.dataset.pad = k; b.dataset.punch = k; const label = el('span', 'fp-label', game.padWords?.(L)?.[k] || w().punch[k]); if (game.padWords) b.setAttribute('aria-label', label.textContent); label.dir = 'auto'; const key = el('span', 'fp-key', { straight: 'J', hook: 'K', uppercut: 'L' }[k]); b.append(label, key); arc.append(b); bind(b, k); }
        right.append(arc); pad.append(right);
      }
      hud.append(goal, score, bar);
      const cue = el('div', 'story-cue'); cue.hidden = true; cue.append(el('i'), el('b')); cue.setAttribute('aria-hidden', 'true');
      ui.d.append(cue, hud, prompt, help, pad, again, quit); ui.d.dataset.hard = String(hard); Object.assign(ui, { goal, score, prompt, ring, pIcon, pText, help, pad, dpad, arrows, keys, hud, barFill, cue });
    }
    function paintHud(v) {
      const h = game.hud(v, gw, L), intro = run.intro > 0;
      if (ui.goal.textContent !== h.goal) ui.goal.textContent = h.goal;
      if (direct) {
        ui.barFill.style.width=v.score+'%'; ui.bar.setAttribute('aria-valuenow',String(v.score));
        ui.footer.hidden=!!run.result; ui.surface.hidden=!!run.result; ui.finishShift.disabled=v.score<25||!!run.result;
        return;
      }
      const sc = `${v.score}${v.mult > 1 ? '  ×' + v.mult : ''}${hard ? '  · ' + w().hardTag : ''}`; if (ui.score.textContent !== sc) { ui.score.textContent = sc; ui.score.dataset.mult = String(v.mult); }
      ui.barFill.style.width = Math.round((v.progress || 0) * 100) + '%';
      // tutorial: the keys of this trial pulse on the pad one after another (ghost input), with a 3-2-1
      ui.help.hidden = !intro;
      const ghost = intro ? game.ghost[Math.floor((3 - run.intro) / .45) % game.ghost.length] : null;
      if (intro) ui.help.lastChild.textContent = String(Math.ceil(run.intro));
      const p = run.result || intro ? '' : h.prompt, arrow = run.result ? '' : intro ? ghost : h.arrow, key = p + '|' + arrow + '|' + h.kind + '|' + !!h.now;
      if (ui.promptKey !== key) {
        ui.promptKey = key; ui.pText.textContent = p; ui.prompt.dataset.kind = run.result || intro ? '' : h.kind; ui.prompt.dataset.arrow = ui.arrows[arrow] && !intro ? arrow : ''; ui.prompt.dataset.now = String(!!h.now && !intro);
        for (const k of Object.keys(ui.keys)) { ui.keys[k].dataset.active = String(arrow === k); ui.keys[k].dataset.ghost = String(intro && arrow === k); }
      }
      const r = intro || run.result ? -1 : h.ring; ui.ring.style.display = r >= 0 ? '' : 'none'; if (r >= 0) ui.ring.style.transform = `translate(-50%,-50%) scale(${(1 + (1 - Math.min(1, r)) * .8).toFixed(3)})`;
    }
    function endGame() {
      directInput?.clear();
      const A = window.AdventureProgress, res = sim.result(A?.starsFor); run.result = res; run.overAt = run.t;
      for (const k of Object.keys(ui.keys)) ui.keys[k].dataset.pressed = 'false'; delete ui.dpad.dataset.dir;
      let saved = null;
      if (res.finished) {
        const rg = window.ringfighterGame, store = rg?.store;
        try {
          if (store?.gameAction) { saved = store.gameAction({ type: 'adventure', adventure: 'mission', missionId: res.missionId, measured: { [res.metric]: res.value } }); if (saved?.ok) rg.apply?.(); }
          else if (A) saved = { ok: true, ...A.recordMission(opts.game || { adventure: A.fresh() }, res.missionId, res.value, true) };
        } catch (x) { saved = { ok: false, error: x.message }; }
        window.dispatchEvent(new CustomEvent('adventure-mission-result', { detail: { missionId: res.missionId, value: res.value, result: saved, score: res.score, source: 'story-' + id } }));
      }
      // GOTR-0099: a job pays a small wage for every finished shift with a star (game-domain.js 'job' action)
      if (game.job && res.finished && res.stars > 0 && saved?.ok !== false) { const rg = window.ringfighterGame; try { const j = rg?.store?.gameAction?.({ type: 'job', jobId: game.job, stars: res.stars }); if (j?.ok) { res.pay = j.coins ?? j.result?.coins ?? 0; rg.apply?.(); } } catch (x) { console.warn('story', x); } }
      run.saved = saved; const pb = run.best = saveBest(id, res);
      const box = el('div', 'story-result'), medal = el('p', 'story-medal', res.stars ? `${stars(res.stars)}  ${w().medal[res.stars]}` : w().none), sc = el('p', 'story-result-score', String(res.score)), detail = el('p', 'story-result-detail', direct ? game.detail(res, gw) : `${game.detail(res, gw)} · ${w().streak} ${res.streak}`);
      medal.dataset.medal = String(res.stars || 0);
      const bestLine = el('p', 'story-result-best', pb.isNew ? w().newBest : `${w().best} ${pb.best}`); bestLine.dataset.new = String(pb.isNew);
      if (saved && !saved.ok) detail.textContent += ' · ' + w().saveErr + saved.error;
      const again = el('button', 'story-btn', w().again), next = el('button', 'story-btn story-btn-main', w().next); again.type = next.type = 'button';
      again.onclick = () => restart(); next.onclick = () => finish({ skipped: false, mission: res, saved: run.saved, best: pb });
      box.append(medal, sc, bestLine, detail); if (pb.unlocked && !direct) box.append(el('p', 'story-result-unlock', w().hardNew));
      if (res.pay) box.append(el('p', 'story-result-pay', (gw.pay || '+{n}').replace('{n}', res.pay)));
      const end = game.say?.('end', res); if (end) box.append(said(end)); // the Coach's one-line reaction
      box.append(again); if (pb.gold && !hard && !direct) { const hb = el('button', 'story-btn story-btn-hard', w().hardGo); hb.type = 'button'; hb.onclick = () => restart(true); box.append(hb); }
      box.append(next); ui.d.append(box); ui.result = box; next.focus({ preventScroll: true });
    }
    return true;
  }

  window.StoryScenes = {
    play, games, looks, best,
    get sceneIds() { return [...Object.keys(Core()?.scenes || {}), ...(window.DreamScenes?.ids || []), ...(window.BagBreak?.ids || [])]; },
    get gameIds() { return Object.keys(games); },
    get ids() { return [...this.sceneIds, ...this.gameIds]; },
    get playing() { return current ? current.id : window.DreamScenes?.playing || window.BagBreak?.playing || null; },
    /** Ends the current scene as skipped. */
    stop() { current?.finish({ skipped: true }); window.DreamScenes?.stop(); window.BagBreak?.stop(); },
    /** Last rendered frame: draw calls, triangles, the set's own meshes/triangles, frame edge (QA, performance report). */
    stats: () => window.DreamScenes?.playing ? window.DreamScenes.stats() : lastStats,
    /** QA: the running scene or mini-game (read-only use). */
    get debug() { return current; }
  };
})();
