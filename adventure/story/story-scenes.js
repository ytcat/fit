/* Story scenes (GOTR-0056 layers 2 + 3): plays a short scripted scene, or an on-rails mini-game, in a small 3D story
 * set (story-sets.js) with the game's own rigs: the player's Fighter (engine.coach), Coach Pip (a rabbit rig holding
 * the mitt-work focus mitts) and characters of the opponent species dressed by colour (Brick, Dash, the night guard).
 * Lines are plain text with a portrait and the speaker's name in the accent colour, in the bottom third.
 *
 * STABLE API
 *   StoryScenes.play(id, { onDone(result), reducedMotion?, timeScale? }) -> true when it starts
 *     scene ids (StoryScenes.sceneIds): arrival, brick, dash, boss_intro, boss_outro (+ any StoryCore.scenes[id] added later)
 *     game ids  (StoryScenes.gameIds):  carry_bag (mission heavy_bag_van), snoring_guard (mission snoring_guard)
 *     result: { id, skipped, error?, mission?: measured run, saved?: save result }
 *   StoryScenes.games[id] = { set, roles, make(Core), frame(ctx, view, dt), hud(view, words), detail(res, words), caps, words }
 *   StoryScenes.looks[role] = { gloves, shorts }   colours for a character played by the opponent-species rig
 *   StoryScenes.playing / stop() / stats() (last frame: draw calls, triangles, set meshes, worst frame edge of a framed actor)
 * Tap (or Esc) skips a scene; reduced motion: no dolly or pan, the camera cuts. Uses the engine's renderer through its
 * demo hook (engine.fightIQDemo), so no second WebGL context; the set is built when played and disposed after, borrowed
 * rigs go back exactly where they were. EN/HE/RU; boxing terms stay English (GotrGlossary). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const Core = () => window.StoryCore;
  const term = (x, l) => window.GotrGlossary ? window.GotrGlossary.term(x, l) : x;
  const W = {
    en: { skip: 'Tap to skip', quit: 'Quit', again: 'Try again', next: 'Continue', none: 'Not enough yet for a star.', saveErr: 'Could not save the result: ', dir: { up: 'Up', down: 'Down', left: 'Left', right: 'Right' } },
    he: { skip: 'הקישו כדי לדלג', quit: 'יציאה', again: 'עוד פעם', next: 'המשך', none: 'עדיין לא מספיק לכוכב.', saveErr: 'לא ניתן לשמור את התוצאה: ', dir: { up: 'למעלה', down: 'למטה', left: 'שמאלה', right: 'ימינה' } },
    ru: { skip: 'Нажмите, чтобы пропустить', quit: 'Выйти', again: 'Ещё раз', next: 'Дальше', none: 'Пока не хватает на звезду.', saveErr: 'Не удалось сохранить результат: ', dir: { up: 'Вверх', down: 'Вниз', left: 'Влево', right: 'Вправо' } }
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
  const looks = { brick: { gloves: '#1d1f24', shorts: '#8f2f22' }, dash: { gloves: '#f2c230', shorts: '#12a59c' }, guard: { gloves: '#5d6878', shorts: '#1f3559' } };
  const cast = {}; // species -> [own rigs], reused between scenes
  function inScene(c, scene) { let o = c?.root; while (o) { if (o === scene) return true; o = o.parent; } return false; }
  function dress(c, look) {
    const paint = (m, hex) => { if (!m?.color) return; if (!m.userData.storyBase) m.userData.storyBase = m.color.clone(); if (hex) m.color.set(hex).convertSRGBToLinear(); else m.color.copy(m.userData.storyBase); };
    for (const side of ['L', 'R']) paint(c.gloveMeshes?.[side]?.material, look?.gloves); paint(c.shorts?.material, look?.shorts);
  }
  function rigFor(role, e, used) {
    if (role === 'fighter') return e.coach;
    const species = role === 'pip' ? 'rabbit' : e.coach.species === 'rabbit' ? 'lion' : 'rabbit', free = c => c && c !== e.coach && c.root && !inScene(c, e.scene) && !used.includes(c);
    if (!looks[role]) { const b = [e.arena?.padTrainers?.[species], species !== e.coach.species ? e.roster?.get?.(species) : null].find(free); if (b) return b; }
    const pool = cast[species] || (cast[species] = []); let c = pool.find(x => !used.includes(x));
    if (!c) { c = new window.LionCoach(e.roster?.data || e.arena?.data, { species }); pool.push(c); }
    dress(c, looks[role]); return c;
  }
  const borrow = c => ({ c, parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible });
  function giveBack(b) { const r = b.c.root; r.parent?.remove(r); if (b.parent) b.parent.add(r); r.position.copy(b.pos); r.quaternion.copy(b.q); r.scale.copy(b.scale); r.visible = b.visible; b.c.maneInitialized = false; }

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
  function pose(c, a, t, o = {}) {
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
    const host = el('div', 'story-host'), lineBox = el('div', 'story-line'), hint = el('div', 'story-hint', kind === 'game' ? '' : w().skip), busy = el('div', 'story-busy', '…');
    lineBox.setAttribute('role', 'status'); lineBox.setAttribute('aria-live', 'polite');
    d.append(host); if (kind === 'scene') d.append(el('div', 'story-bar story-bar-top'), el('div', 'story-bar story-bar-bottom'));
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

  /* ---------------------------------------------------------------- mini-games (presentation; rules are in story-core.js) */
  const games = {
    // The Fighter carries the new heavy bag along the pavement to the gym door.
    carry_bag: {
      set: 'gymfront', roles: { fighter: {} }, make: C => new C.CarryBag(), keys: ['up', 'left', 'right', 'down'],
      words: {
        en: { goal: 'Carry the heavy bag to the gym door', count: 'Mistakes', step: 'Step!', wait: 'Wait!', balance: 'Balance!', help: 'Walk. Press again to step over things. Catch the bag when it tips.', bumps: 'bumps', drops: 'balance lost', overtime: 'slow', caps: { up: 'Push', down: 'Pull', left: 'Back', right: 'Walk' } },
        he: { goal: 'סחבו את השק הכבד עד דלת האולם', count: 'טעויות', step: 'צעד!', wait: 'חכו!', balance: 'איזון!', help: 'לכו. לחצו שוב כדי לעבור מעל מכשולים. תפסו את השק כשהוא נוטה.', bumps: 'התנגשויות', drops: 'איבוד איזון', overtime: 'איטי', caps: { up: 'לדחוף', down: 'למשוך', left: 'אחורה', right: 'ללכת' } },
        ru: { goal: 'Донесите тяжёлый мешок до двери зала', count: 'Ошибки', step: 'Шаг!', wait: 'Ждите!', balance: 'Баланс!', help: 'Идите. Нажмите ещё раз, чтобы перешагнуть. Ловите мешок, когда он кренится.', bumps: 'столкновения', drops: 'потеря баланса', overtime: 'медленно', caps: { up: 'Толкать', down: 'Тянуть', left: 'Назад', right: 'Идти' } }
      },
      hud: (v, g) => ({ goal: `${g.goal} · ${g.count} ${v.mistakes}`, prompt: v.prompt === 'step' ? g.step : v.prompt === 'wait' ? g.wait : v.prompt ? g.balance : '', arrow: v.prompt === 'step' ? 'right' : v.prompt === 'up' || v.prompt === 'down' ? v.prompt : '', kind: v.prompt || '' }),
      detail: (r, g) => `${r.time} s · ${g.count} ${r.mistakes} (${g.bumps} ${r.bumps}, ${g.drops} ${r.drops}, ${g.overtime} ${r.overtime})`,
      frame(x, v, dt) {
        const C = Core(), c = x.rigs.fighter, X0 = -11, Z = -1.2, sim = x.sim;
        const walking = !x.over && (sim.held.right || sim.held.left || v.striding) && v.stagger === 0 && v.s > 0 && v.s < C.CARRY.length;
        x.place(c, { x: X0 + v.s, z: Z, ry: Math.PI / 2 });
        const wob = v.stagger > 0 && !x.reduced ? .05 * Math.sin(x.t * 30) * v.stagger : 0;
        pose(c, { act: 'carry', walking, stepPhase: (v.s / C.STEP) % 1, actT: x.t }, x.t, { reduced: x.reduced });
        if (wob) { c.root.rotation.z = wob; c.root.updateMatrixWorld(true); }
        x.set.objects.bag.visible = true; x.bagOnRig(c, v.swayDir * v.theta * .55 + wob * 2);
        const cy = x.set.objects.cyclist; cy.visible = v.cyclist.riding; cy.position.set(5, v.cyclist.z > .5 ? -.15 : 0, v.cyclist.z);
        const fx = X0 + v.s, cx = x.memo.cx = x.reduced || x.memo.cx == null ? fx : x.memo.cx + (fx - x.memo.cx) * Math.min(1, dt * 3);
        return { pos: [cx + .5, 1.75, 4.6], look: [cx + 1.2, 1.05, Z], fit: [c] };
      }
    },
    // The night guard sleeps on his feet at the door and swings his pillow in his sleep.
    snoring_guard: {
      set: 'gymfront', roles: { fighter: {}, guard: { rig: 'guard' } }, make: C => new C.GuardGame(), keys: ['up', 'left', 'right', 'down'],
      words: {
        en: { goal: 'Sneak up to the bell and wake the night guard', count: 'Dodged', slip: l => term('Slip', l) + '!', duck: 'Duck!', bell: 'Ring the bell!', zzz: 'z Z z', help: 'Sneak closer. Slip the pokes, duck the swings, then ring the bell.', hits: 'pillow hits', caps: { up: 'Bell', down: 'Duck', left: 'Slip', right: 'Sneak' } },
        he: { goal: 'התגנבו אל הפעמון והעירו את שומר הלילה', count: 'התחמקויות', slip: l => term('Slip', l) + '!', duck: 'להתכופף!', bell: 'צלצלו בפעמון!', zzz: 'ז ז ז', help: 'התקרבו בשקט. Slip מול דחיפות, התכופפו מתחת להנפות, ואז צלצלו בפעמון.', hits: 'פגיעות כרית', caps: { up: 'פעמון', down: 'להתכופף', left: 'Slip', right: 'להתגנב' } },
        ru: { goal: 'Подкрадитесь к колокольчику и разбудите сторожа', count: 'Уклонения', slip: l => term('Slip', l) + '!', duck: 'Пригнись!', bell: 'Звони в колокольчик!', zzz: 'х р р', help: 'Подкрадывайтесь. Slip от тычков, пригибайтесь под замахи, потом звоните.', hits: 'попадания подушкой', caps: { up: 'Звонок', down: 'Пригнуться', left: 'Slip', right: 'Красться' } }
      },
      hud: (v, g, l) => ({ goal: `${g.goal} · ${g.count} ${v.dodges}/${v.total}`, prompt: v.prompt === 'left' ? g.slip(l) : v.prompt === 'down' ? g.duck : v.prompt === 'bell' ? g.bell : g.zzz, arrow: v.prompt === 'bell' ? 'up' : v.prompt || '', kind: v.prompt || 'zzz' }),
      detail: (r, g) => `${r.time} s · ${g.count} ${r.dodges}/${Core().GUARD.swings.length} · ${g.hits} ${r.hits}`,
      frame(x, v, dt) {
        const C = Core(), f = x.rigs.fighter, gd = x.rigs.guard, X0 = 4.4, Z = -1.5, GX = 10.25, GZ = -1.7, fx = X0 + v.s, t = x.t;
        x.place(f, { x: fx, z: Z, ry: Math.PI / 2 }); x.place(gd, { x: GX, z: GZ, ry: -Math.PI / 2 });
        // Fighter: sneak, Slip, duck (the controller's roll), wobble after a pillow hit, fist up after the bell
        if (x.over && x.sim.rung) pose(f, { act: 'flex', actT: t - x.overAt }, t);
        else if (v.dodge) pose(f, { act: 'move', move: v.dodge.key === 'left' ? 'slip' : 'roll', phase: Math.min(.98, v.dodge.k) }, t, { options: { defenceSide: -1, guardCover: 1 } });
        else pose(f, { act: 'guard', walking: v.moving, stepPhase: (v.s / C.STEP) % 1 }, t);
        if (v.stun > 0 && !x.reduced) { f.root.rotation.z = .07 * Math.sin(t * 28) * v.stun; f.root.updateMatrixWorld(true); }
        // Guard: asleep on his feet, swings the pillow hand (round swing = rear hook, poke = cross), jumps awake at the bell
        const since = v.last ? t - v.last.t : 9; let hop = 0;
        if (x.over && x.sim.rung) { pose(gd, { act: 'flex', actT: (t - x.overAt) * 1.6 }, t); if (!x.reduced) hop = .12 * Math.max(0, Math.sin(Math.min(1, (t - x.overAt) / .45) * Math.PI)); }
        else if (v.swing) pose(gd, { act: 'move', move: v.swing.type === 'hook' ? 'rear_hook' : 'cross', phase: .06 + v.swing.k * .38 }, t, { options: { power: 1.1 } });
        else if (since < .4) pose(gd, { act: 'move', move: v.last.type === 'hook' ? 'rear_hook' : 'cross', phase: .44 + since / .4 * .54 }, t);
        else { pose(gd, { act: 'sleep' }, t); if (!x.reduced) { gd.root.rotation.z = .035 * Math.sin(t * 1.4); } }
        gd.root.position.y = hop; gd.root.updateMatrixWorld(true);
        const pl = x.set.objects.pillow, hand = gd.joints?.handR; if (pl && hand) { pl.visible = true; hand.getWorldPosition(pl.position); hand.getWorldQuaternion(pl.quaternion); pl.position.y -= .06; }
        const mid = (fx + GX) / 2, cx = x.memo.cx = x.reduced || x.memo.cx == null ? mid : x.memo.cx + (mid - x.memo.cx) * Math.min(1, dt * 2.5);
        return { pos: [cx - .3, 1.6, 3.7], look: [cx, 1.12, -1.6], fit: [f, gd] };
      }
    }
  };

  /* ---------------------------------------------------------------- runner */
  function play(id, opts = {}) {
    const C = Core(), e = window.app?.engine, done = typeof opts.onDone === 'function' ? opts.onDone : () => {};
    const game = games[id] || null, scene0 = C?.scenes[id];
    const fail = error => { setTimeout(() => done({ id, skipped: true, error }), 0); return false; };
    if (!C || (!game && !scene0)) return fail('unknown scene');
    if (!e?.renderer || !e.coach?.update || !window.StorySets || !window.LionCoach) return fail('engine not ready');
    if (current) current.finish({ skipped: true, replaced: true });
    if (e.fightIQDemo) return fail('busy');
    const reduced = opts.reducedMotion ?? reducedMotion(), L = lang(), gw = game ? game.words[L] || game.words.en : null;
    const ui = overlay(game ? 'game' : 'scene');
    const run = { id, closed: false, t: 0, ui, host: ui.host, edge: 0 };
    current = run;
    let set = null, scene = null, camera = null, borrowed = [], mitts = [], rigs = {}, sim = null, stageMove = null, oldFit = null, finished = false;
    const memo = {}, look = V();
    const finish = (result = {}) => {
      if (run.closed) return; run.closed = true; if (current === run) current = null;
      try { cleanup(); } catch (x) { console.warn('story', x); }
      ui.d.close?.(); ui.d.remove(); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      done({ id, ...result });
    };
    run.finish = finish; Object.defineProperty(run, 'sim', { get: () => sim });
    function cleanup() {
      if (e.fightIQDemo === run) e.fightIQDemo = null;
      for (const m of mitts) window.TrainingGear?.dispose(m); mitts = [];
      for (const b of borrowed) giveBack(b); borrowed = [];
      set?.dispose(); set = null;
      if (stageMove) { stageMove.placeholder.replaceWith(stageMove.stage); stageMove.stage.classList.remove('game-preview-live', 'story-live'); stageMove.stage.style.pointerEvents = stageMove.pe; stageMove = null; window.dispatchEvent(new Event('resize')); }
      if (oldFit) { e.fitCameraToModel = oldFit; oldFit = null; }
      e.lastPoseStamp = null; e.lastRenderStamp = null;
    }
    const press = (k, down) => { if (!sim || run.result) return; sim.key(k, down); const b = ui.arrows?.[k]; if (b) { b.dataset.pressed = String(down); if (down) ui.dpad.dataset.dir = k; else if (ui.dpad.dataset.dir === k) delete ui.dpad.dataset.dir; } };
    const onKey = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); finish({ skipped: true }); return; }
      const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[ev.key]; if (!k || !game) return;
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
        const c = rigFor(a.rig || key, e, borrowed.map(b => b.c));
        borrowed.push(borrow(c)); scene.add(c.root); c.root.visible = true; c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(1); c.maneInitialized = false; rigs[key] = c;
        if (a.mitts && window.TrainingGear) mitts.push(window.TrainingGear.mitt(c, 'L'), window.TrainingGear.mitt(c, 'R'));
      }
      if (game) sim = game.make(C);
      // Take the engine's canvas: same demo hook and stage move as the Fight IQ examples.
      const stage = e.stage || document.getElementById('stageContainer');
      if (stage) { const placeholder = document.createComment('story stage'); stage.before(placeholder); stageMove = { stage, placeholder, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; ui.host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
      oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
      run.frame = frame; e.fightIQDemo = run; ui.busy.remove();
      window.dispatchEvent(new Event('resize'));
    }).catch(x => { console.warn('story', x); finish({ skipped: true, error: String(x?.message || x) }); });

    const place = (c, a, y = 0) => { c.root.position.set(a.x, y, a.z); c.root.rotation.set(0, a.ry, 0); c.root.updateMatrixWorld(true); };
    function bagOnRig(c, tilt = 0) { const b = set.objects.bag; b.position.copy(c.root.localToWorld(V(0, 1.12, .38))); b.quaternion.copy(c.root.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt)); }
    function aimCamera(shot, limY) {
      camera.position.fromArray(shot.pos); look.fromArray(shot.look); camera.lookAt(look);
      const framed = (shot.fit || []).map(k => typeof k === 'string' ? rigs[k] : k).filter(Boolean);
      const edge = keepInFrame(camera, look, framed, .93, limY); run.edge = Math.max(run.edge, edge); set.focus(look.x, look.z);
      return edge;
    }
    function frame(delta) {
      if (run.closed) return;
      const dt = Math.min(Math.max(delta || 0, 0), .05) * (opts.timeScale || 1); run.t += dt;
      fitLens(camera, e);
      const edge = game ? gameFrame(dt) : sceneFrame();
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

    /* ---- mini-game: fixed-step rules, the game's own frame, HUD with the fighter pad's D-pad */
    function gameFrame(dt) {
      if (!run.result) { for (let left = dt; left > 1e-6 && !sim.done; left -= .05) sim.step(Math.min(left, .05)); if (sim.done) endGame(); }
      const v = sim.view(), shot = game.frame({ set, rigs, sim, t: run.t, reduced, memo, place, bagOnRig, over: !!run.result, overAt: run.overAt || 0 }, v, dt);
      const edge = aimCamera(shot, .86); paintHud(v); return edge;
    }
    function buildGameUi() {
      const hud = el('div', 'story-hud'), goal = el('p', 'story-goal'), help = el('p', 'story-help', gw.help), prompt = el('div', 'story-prompt'), pIcon = el('span', 'story-prompt-arrow'), pText = el('span', 'story-prompt-text'), quit = el('button', 'story-quit', '×');
      quit.type = 'button'; quit.setAttribute('aria-label', w().quit); quit.title = w().quit; quit.onclick = () => finish({ skipped: true, quit: true });
      pIcon.innerHTML = CHEVRON; prompt.append(pIcon, pText);
      // The game's own D-pad (fighter-pad.css): one round base, four wedge keys, a hub.
      const pad = el('div', 'fighter-pad story-pad'), zone = el('div', 'fp-zone fp-left'), dpad = el('div', 'fp-dpad'), face = el('div', 'fp-face'), arrows = {};
      for (const k of ['up', 'right', 'left', 'down']) {
        const b = el('button', 'fp-arrow'); b.type = 'button'; b.dataset.dir = k; b.setAttribute('aria-label', `${w().dir[k]}: ${gw.caps[k]}`);
        const ink = el('span', 'fp-ink'), cap = el('span', 'fp-cap', gw.caps[k]); ink.innerHTML = CHEVRON; cap.dir = 'auto'; ink.append(cap); b.append(ink); face.append(b); arrows[k] = b;
        const on = down => ev => { ev.preventDefault(); if (down) b.setPointerCapture?.(ev.pointerId); if (down === (b.dataset.pressed === 'true')) return; press(k, down); };
        b.addEventListener('pointerdown', on(true)); for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(n, on(false));
      }
      dpad.append(face, el('span', 'fp-hub')); zone.append(dpad); pad.append(zone); hud.append(goal, help);
      ui.d.append(hud, prompt, pad, quit); Object.assign(ui, { goal, prompt, pIcon, pText, help, pad, dpad, arrows, hud });
    }
    function paintHud(v) {
      const h = game.hud(v, gw, L), s = Math.floor(v.t), txt = `${h.goal} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (ui.goal.textContent !== txt) ui.goal.textContent = txt;
      const p = run.result ? '' : h.prompt, key = p + '|' + h.arrow;
      if (ui.promptKey !== key) { ui.promptKey = key; ui.pText.textContent = p; ui.prompt.dataset.kind = run.result ? '' : h.kind; ui.prompt.dataset.arrow = run.result ? '' : h.arrow; for (const k of Object.keys(ui.arrows)) ui.arrows[k].dataset.active = String(!run.result && h.arrow === k); }
      if (v.t > 7 && ui.help.isConnected) ui.help.remove();
    }
    function endGame() {
      const A = window.AdventureProgress, res = sim.result(A?.starsFor); run.result = res; run.overAt = run.t;
      for (const k of Object.keys(ui.arrows)) { ui.arrows[k].dataset.pressed = 'false'; } delete ui.dpad.dataset.dir;
      let saved = null;
      if (res.finished) {
        const rg = window.ringfighterGame, store = rg?.store;
        try {
          if (store?.gameAction) { saved = store.gameAction({ type: 'adventure', adventure: 'mission', missionId: res.missionId, measured: { [res.metric]: res.value } }); if (saved?.ok) rg.apply?.(); }
          else if (A) saved = { ok: true, ...A.recordMission(opts.game || { adventure: A.fresh() }, res.missionId, res.value, true) };
        } catch (x) { saved = { ok: false, error: x.message }; }
        window.dispatchEvent(new CustomEvent('adventure-mission-result', { detail: { missionId: res.missionId, value: res.value, result: saved, source: 'story-' + id } }));
      }
      run.saved = saved;
      const box = el('div', 'story-result'), head = el('p', 'story-result-stars', res.stars ? stars(res.stars) : w().none), detail = el('p', 'story-result-detail', game.detail(res, gw));
      if (saved && !saved.ok) detail.textContent += ' · ' + w().saveErr + saved.error;
      const again = el('button', 'story-btn', w().again), next = el('button', 'story-btn story-btn-main', w().next); again.type = next.type = 'button';
      again.onclick = () => { box.remove(); run.result = null; run.saved = null; sim = game.make(C); memo.cx = null; ui.promptKey = null; };
      next.onclick = () => finish({ skipped: false, mission: res, saved: run.saved });
      box.append(head, detail, again, next); ui.d.append(box); next.focus({ preventScroll: true });
    }
    return true;
  }

  window.StoryScenes = {
    play, games, looks,
    get sceneIds() { return Object.keys(Core()?.scenes || {}); },
    get gameIds() { return Object.keys(games); },
    get ids() { return [...this.sceneIds, ...this.gameIds]; },
    get playing() { return current ? current.id : null; },
    /** Ends the current scene as skipped. */
    stop() { current?.finish({ skipped: true }); },
    /** Last rendered frame: draw calls, triangles, the set's own meshes/triangles, frame edge (QA, performance report). */
    stats: () => lastStats,
    /** QA: the running scene or mini-game (read-only use). */
    get debug() { return current; }
  };
})();
