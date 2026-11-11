/* Story scenes (GOTR-0056 layers 2 + 3): plays a short scripted scene, or the carry-the-bag mini-game, in a small 3D
 * story set (story-sets.js) with the game's own rigs: the player's Fighter (engine.coach), Coach Pip (a rabbit rig
 * holding the mitt-work focus mitts) and Brick (the opponent rig). Lines are plain text with a small portrait.
 *   StoryScenes.play('arrival' | 'brick' | 'carry_bag', { onDone(result) }) -> true when it starts
 *   result: { id, skipped, error?, mission? } ; for 'carry_bag' also the measured run and the save result.
 * Tap (or Esc) skips a scene; reduced motion: no dolly or pan, the camera cuts. Uses the engine's renderer through its
 * demo hook (engine.fightIQDemo), so no second WebGL context; the set is built when played and disposed after, the
 * borrowed rigs go back exactly where they were. EN/HE/RU; boxing terms stay English (GotrGlossary). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const Core = () => window.StoryCore;
  const W = {
    en: { skip: 'Tap to skip', quit: 'Quit', goal: 'Carry the heavy bag to the gym door', mistakes: 'Mistakes', step: 'Step!', wait: 'Wait!', balance: 'Balance!',
      help: '▶ walk · ◀ back · fresh ▶ steps over · ▲ ▼ catch the bag', result: 'At the door', bumps: 'bumps', drops: 'balance lost', overtime: 'slow', again: 'Try again', next: 'Continue', none: 'Not enough yet for a star.', saveErr: 'Could not save the result: ', fighter: 'You', left: 'Back', right: 'Walk', up: 'Push forward', down: 'Pull back' },
    he: { skip: 'הקישו כדי לדלג', quit: 'יציאה', goal: 'סחבו את השק הכבד עד דלת האולם', mistakes: 'טעויות', step: 'צעד!', wait: 'חכו!', balance: 'איזון!',
      help: '▶ הליכה · ◀ אחורה · ▶ חדש לצעד מעל · ▲ ▼ לתפוס את השק', result: 'ליד הדלת', bumps: 'התנגשויות', drops: 'איבוד איזון', overtime: 'איטי', again: 'עוד פעם', next: 'המשך', none: 'עדיין לא מספיק לכוכב.', saveErr: 'לא ניתן לשמור את התוצאה: ', fighter: 'אתם', left: 'אחורה', right: 'הליכה', up: 'לדחוף קדימה', down: 'למשוך אחורה' },
    ru: { skip: 'Нажмите, чтобы пропустить', quit: 'Выйти', goal: 'Донесите тяжёлый мешок до двери зала', mistakes: 'Ошибки', step: 'Шаг!', wait: 'Ждите!', balance: 'Баланс!',
      help: '▶ идти · ◀ назад · новое ▶ — шаг через · ▲ ▼ удержать мешок', result: 'У двери', bumps: 'столкновения', drops: 'потеря баланса', overtime: 'медленно', again: 'Ещё раз', next: 'Дальше', none: 'Пока не хватает на звезду.', saveErr: 'Не удалось сохранить результат: ', fighter: 'Вы', left: 'Назад', right: 'Идти', up: 'Толкнуть вперёд', down: 'Потянуть назад' }
  };
  const NAMES = { pip: { en: 'Coach Pip', he: 'המאמן פיפ', ru: 'Тренер Пип' }, brick: { en: 'Brick', he: 'בריק', ru: 'Брик' } };
  const lang = () => W[window.app?.lang] ? window.app.lang : 'en', w = () => W[lang()];
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const owned = {}; // own rigs, only when no free game rig of that species exists (one per species, like FightIQDemo)
  let current = null, lastStats = null;

  /* ---------------------------------------------------------------- rigs */
  function inScene(c, scene) { let o = c?.root; while (o) { if (o === scene) return true; o = o.parent; } return false; }
  function rigFor(role, e) {
    if (role === 'fighter') return e.coach;
    const species = role === 'pip' ? 'rabbit' : e.coach.species === 'rabbit' ? 'lion' : 'rabbit';
    const free = [e.arena?.padTrainers?.[species], species !== e.coach.species ? e.roster?.get?.(species) : null].find(c => c && c !== e.coach && c.root && !inScene(c, e.scene));
    if (free) return free;
    return owned[species] || (owned[species] = new window.LionCoach(e.roster?.data || e.arena?.data, { species }));
  }
  const borrow = c => ({ c, parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible });
  function giveBack(b) { const r = b.c.root; r.parent?.remove(r); if (b.parent) b.parent.add(r); r.position.copy(b.pos); r.quaternion.copy(b.q); r.scale.copy(b.scale); r.visible = b.visible; b.c.maneInitialized = false; }

  /* ---------------------------------------------------------------- poses (existing rig controller, no new animation data) */
  const SHADOW = [['jab', .55], ['cross', .62], ['guard', .45], ['jab', .5], ['jab', .5], ['cross', .62], ['guard', .8]], SHADOW_T = SHADOW.reduce((n, x) => n + x[1], 0);
  function carryOverlay(c) {
    const j = c.joints, gloves = [], handErrors = [];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1;
      handErrors.push(c.solve(j['arm' + side], j['elbow' + side], j['hand' + side], V(s * .2, 1.2, .36), V(s * .9, -.7, -.3)));
      gloves.push(c.orientGlove(side, 1, V(-s, 0, 0)));
    }
    return { gloves, handErrors };
  }
  /** Poses one rig from a sampled actor state: act + walking (procedural boxer's step through the controller's ringStep). */
  function pose(c, a, t, o = {}) {
    const base = { simulationTime: t, keepFaceClear: true }, act = a.act;
    if (a.walking) base.ringStep = { first: -1, phase: a.stepPhase, ease: a.stepPhase, weight: 1, turn: 0, delta: [0, 0, Core().STEP] };
    let y = 0;
    if (act === 'carry' || o.carry) c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'waiting', raise: 0 }, poseOverlay: carryOverlay });
    else if (a.walking || act === 'idle') c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'waiting', raise: 0 } });
    else if (act === 'guard') c.update(t, 'guard', 'one_two', { ...base, guardCover: 1 });
    else if (act === 'mitts') c.update(t, 'guard', 'one_two', { ...base, guardElbowBack: .5, guardWidth: .22 });
    else if (act === 'wave') c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'waiting', side: 'R', raise: Math.min(1, a.actT / .35) * (.84 + (o.reduced ? 0 : .16 * Math.sin(a.actT * 11))) } });
    else if (act === 'point') { const p = Math.min(1, a.actT / .45) * .44; c.update(p * 1.22, 'jab', 'one_two', { ...base, simulationTime: t }); }
    else if (act === 'laugh') { c.update(t, 'guard', 'one_two', { ...base, presentation: { mode: 'winner', raise: 0 } }); if (!o.reduced) y = .022 * Math.abs(Math.sin(a.actT * 12)); }
    else if (act === 'shadow') {
      let k = a.actT % SHADOW_T, move = 'guard', phase = 0; for (const [m, d] of SHADOW) { if (k < d) { move = m; phase = k / d; break; } k -= d; }
      if (move === 'guard') c.update(t, 'guard', 'one_two', { ...base, guardCover: 1 });
      else c.update(phase * 1.22, move, 'one_two', { ...base, guardCover: 1, power: 1.1, recoil: 0, advance: 0, contactDrive: 0 });
    } else c.update(t, 'guard', 'one_two', base);
    return y;
  }

  /* ---------------------------------------------------------------- overlay */
  function overlay(kind) {
    const d = el('dialog', 'story-scene'); d.dir = lang() === 'he' ? 'rtl' : 'ltr'; d.dataset.kind = kind;
    const host = el('div', 'story-host'), lineBox = el('div', 'story-line'), hint = el('div', 'story-hint', kind === 'game' ? '' : w().skip), busy = el('div', 'story-busy', '…');
    lineBox.setAttribute('role', 'status'); lineBox.setAttribute('aria-live', 'polite');
    d.append(host, busy, lineBox, hint); document.body.append(d);
    try { d.showModal(); } catch { d.setAttribute('open', ''); }
    return { d, host, lineBox, hint, busy };
  }
  function showLine(ui, l) {
    const key = l ? l.who + '|' + l.t + '|' + lang() : '';
    if (ui.lineKey === key) return; ui.lineKey = key; ui.lineBox.replaceChildren();
    if (!l) return;
    const bust = window.AdventureStory?.bust?.(l.who); if (bust) ui.lineBox.append(bust);
    const p = el('p'), n = el('strong', '', (window.AdventureStory?.who?.[l.who]?.name || NAMES[l.who] || {})[lang()] || '');
    p.append(n, document.createTextNode(' ' + (l.text[lang()] || l.text.en))); ui.lineBox.append(p);
    ui.lineBox.classList.remove('in'); void ui.lineBox.offsetWidth; ui.lineBox.classList.add('in');
  }

  /* ---------------------------------------------------------------- camera */
  function fit(camera, e) {
    const size = e.renderer.getSize(new THREE.Vector2()), aspect = Math.max(.2, size.x / Math.max(1, size.y));
    // Keep at least a 40-degree horizontal view on a phone in portrait; 38 degrees vertical otherwise.
    const v = Math.max(38, 2 * Math.atan(.36 / aspect) * 180 / Math.PI);
    if (camera.aspect !== aspect || camera.fov !== v) { camera.aspect = aspect; camera.fov = Math.min(68, v); camera.updateProjectionMatrix(); }
  }

  /* ---------------------------------------------------------------- runner */
  function play(id, opts = {}) {
    const C = Core(), e = window.app?.engine, done = typeof opts.onDone === 'function' ? opts.onDone : () => {};
    const game = id === 'carry_bag', scene0 = C?.scenes[id];
    const fail = error => { setTimeout(() => done({ id, skipped: true, error }), 0); return false; };
    if (!C || (!game && !scene0)) return fail('unknown scene');
    if (!e?.renderer || !e.coach?.update || !window.StorySets || !window.LionCoach) return fail('engine not ready');
    if (current) current.finish({ skipped: true, replaced: true });
    if (e.fightIQDemo) return fail('busy');
    const reduced = opts.reducedMotion ?? reducedMotion();
    const ui = overlay(game ? 'game' : 'scene');
    const run = { id, closed: false, t: 0, ui, host: ui.host };
    current = run;
    let set = null, scene = null, camera = null, borrowed = [], mitts = [], rigs = {}, sim = null, stageMove = null, oldFit = null, finished = null;
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
    // Tap / Esc: skip a scene. The mini-game has its own quit button and keys.
    const onKey = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); finish({ skipped: true }); return; }
      if (!sim || run.result) return;
      const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[ev.key]; if (!k) return;
      ev.preventDefault(); if (ev.type === 'keydown' && ev.repeat) return; sim.key(k, ev.type === 'keydown');
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    ui.d.addEventListener('cancel', ev => { ev.preventDefault(); finish({ skipped: true }); });
    if (!game) ui.d.addEventListener('pointerdown', () => finish({ skipped: true }));
    if (game) buildGameUi();

    window.StorySets.ready().then(() => new Promise(r => requestAnimationFrame(() => r()))).then(() => {
      if (run.closed) return;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(38, 1, .1, 200);
      set = window.StorySets.build(game ? 'gymfront' : scene0.set, scene, { renderer: e.renderer, shadows: !!e.renderer.shadowMap?.enabled });
      const roles = game ? { fighter: {} } : scene0.actors;
      for (const [key, a] of Object.entries(roles)) {
        const c = rigFor(a.rig || key, e); if (borrowed.some(b => b.c === c)) continue;
        borrowed.push(borrow(c)); scene.add(c.root); c.root.visible = true; c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(1); c.maneInitialized = false; rigs[key] = c;
        if (a.mitts && window.TrainingGear) mitts.push(window.TrainingGear.mitt(c, 'L'), window.TrainingGear.mitt(c, 'R'));
      }
      if (game) sim = new C.CarryBag();
      // Take the engine's canvas: same demo hook and stage move as the Fight IQ examples.
      const stage = e.stage || document.getElementById('stageContainer');
      if (stage) { const placeholder = document.createComment('story stage'); stage.before(placeholder); stageMove = { stage, placeholder, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; ui.host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
      oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
      run.frame = frame; e.fightIQDemo = run; ui.busy.remove();
      window.dispatchEvent(new Event('resize'));
    }).catch(x => { console.warn('story', x); finish({ skipped: true, error: String(x?.message || x) }); });

    const placeRig = (c, a, y = 0) => { c.root.position.set(a.x, y, a.z); c.root.rotation.set(0, a.ry, 0); c.root.updateMatrixWorld(true); };
    function bagOnRig(c, tilt = 0) { const b = set.objects.bag; b.position.copy(c.root.localToWorld(V(0, 1.12, .38))); b.quaternion.copy(c.root.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt)); }
    function frame(delta) {
      if (run.closed) return;
      const dt = Math.min(Math.max(delta || 0, 0), .05) * (opts.timeScale || 1); run.t += dt;
      fit(camera, e);
      if (game) gameFrame(dt); else sceneFrame();
      if (e.renderer.shadowMap?.enabled) e.renderer.shadowMap.needsUpdate = true;
      e.renderer.render(scene, camera);
      const info = e.renderer.info.render; lastStats = { calls: info.calls, triangles: info.triangles, set: set.stats() };
    }
    function sceneFrame() {
      const s = C.sample(scene0, run.t, { reduced });
      for (const [key, a] of Object.entries(s.actors)) { const c = rigs[key]; if (!c || !a) continue; placeRig(c, a); const y = pose(c, a, run.t, { reduced }); if (y) { c.root.position.y = y; c.root.updateMatrixWorld(true); } }
      if (set.objects.bus && s.props.bus) set.objects.bus.position.x = s.props.bus[0];
      if (scene0.bag && set.objects.bag) {
        const holder = rigs[scene0.bag.holder], drop = scene0.bag.drop;
        if (run.t < drop) bagOnRig(holder);
        else {
          if (!run.bagFall) { const h = C.sample(scene0, drop).actors[scene0.bag.holder], o = new THREE.Object3D(); o.position.set(h.x, 0, h.z); o.rotation.y = h.ry; o.updateMatrixWorld(true);
            run.bagFall = { p0: o.localToWorld(V(0, 1.12, .38)), q0: o.quaternion.clone(), p1: o.localToWorld(V(0, .17, .8)), q1: o.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2)) }; }
          const f = run.bagFall, k = Math.min(1, (run.t - drop) / .45), g = k * k, bounce = reduced ? 0 : .06 * Math.max(0, Math.sin(Math.min(1, (run.t - drop - .45) / .3) * Math.PI));
          const b = set.objects.bag; b.position.lerpVectors(f.p0, f.p1, g); b.position.y += bounce; b.quaternion.copy(f.q0).slerp(f.q1, Math.min(1, k * 1.2));
        }
      }
      if (s.camera) { camera.position.fromArray(s.camera.pos); camera.lookAt(V(...s.camera.look)); }
      showLine(ui, s.line);
      if (s.done && !finished) { finished = true; setTimeout(() => finish({ skipped: false }), reduced ? 400 : 250); }
    }

    /* ---- carry the heavy bag */
    const X0 = -11, Z = -1.2;
    function gameFrame(dt) {
      if (!run.result) { for (let left = dt; left > 1e-6 && !sim.done; left -= .05) sim.step(Math.min(left, .05)); if (sim.done) endGame(); }
      const v = sim.view(), c = rigs.fighter;
      const stepPhase = (v.s / C.STEP) % 1, walking = !run.result && (sim.held.right || sim.held.left || v.striding) && v.stagger === 0 && v.s > 0 && v.s < C.CARRY.length;
      placeRig(c, { x: X0 + v.s, z: Z, ry: Math.PI / 2 });
      const wob = v.stagger > 0 && !reduced ? .05 * Math.sin(run.t * 30) * v.stagger : 0;
      pose(c, { act: 'carry', walking, stepPhase, actT: run.t }, run.t, { carry: true, reduced });
      if (wob) { c.root.rotation.z = wob; c.root.updateMatrixWorld(true); }
      bagOnRig(c, v.swayDir * v.theta * .55 + wob * 2);
      const cy = set.objects.cyclist; if (cy) { cy.visible = v.cyclist.riding; cy.position.set(5, v.cyclist.z > .5 ? -.15 : 0, v.cyclist.z); }
      const target = reduced ? X0 + v.s : (run.camX ?? X0 + v.s) + (X0 + v.s - (run.camX ?? X0 + v.s)) * Math.min(1, dt * 3);
      run.camX = target; camera.position.set(target + .4, 1.9, 4.4); camera.lookAt(V(target + 1.3, 1.05, Z));
      paintHud(v);
    }
    function buildGameUi() {
      const hud = el('div', 'story-hud'), goal = el('p', 'story-goal'), prompt = el('div', 'story-prompt'), help = el('p', 'story-help', w().help), quit = el('button', 'story-quit', '×'), pad = el('div', 'story-pad');
      quit.type = 'button'; quit.setAttribute('aria-label', w().quit); quit.title = w().quit; quit.onclick = () => finish({ skipped: true, quit: true });
      for (const [k, sym] of [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']]) {
        const b = el('button', 'story-key story-key-' + k, sym); b.type = 'button'; b.dataset.key = k; b.setAttribute('aria-label', w()[k]);
        const press = down => ev => { ev.preventDefault(); if (!sim || run.result) return; if (down) b.setPointerCapture?.(ev.pointerId); if (down === !!b.dataset.down) return; if (down) b.dataset.down = '1'; else delete b.dataset.down; sim.key(k, down); };
        b.addEventListener('pointerdown', press(true)); b.addEventListener('pointerup', press(false)); b.addEventListener('pointercancel', press(false)); b.addEventListener('lostpointercapture', press(false));
        pad.append(b);
      }
      pad.dir = 'ltr'; hud.append(goal, help); ui.d.append(hud, prompt, pad, quit); Object.assign(ui, { goal, prompt, help, pad, hud });
    }
    function paintHud(v) {
      const s = Math.floor(v.t), txt = `${w().goal} · ${w().mistakes} ${v.mistakes} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (ui.goal.textContent !== txt) ui.goal.textContent = txt;
      const p = run.result ? '' : v.prompt === 'step' ? w().step + ' ▶' : v.prompt === 'wait' ? w().wait : v.prompt === 'up' ? '▲ ' + w().balance : v.prompt === 'down' ? '▼ ' + w().balance : '';
      if (ui.prompt.textContent !== p) { ui.prompt.textContent = p; ui.prompt.dataset.kind = v.prompt || ''; }
      if (v.t > 6 && ui.help.isConnected && !run.helpKept) ui.help.remove();
    }
    function endGame() {
      const A = window.AdventureProgress, res = sim.result(A?.starsFor); run.result = res;
      let saved = null;
      if (res.finished) {
        const rg = window.ringfighterGame, store = rg?.store;
        try {
          if (store?.gameAction) { saved = store.gameAction({ type: 'adventure', adventure: 'mission', missionId: res.missionId, measured: { mistakes: res.mistakes } }); if (saved?.ok) rg.apply?.(); }
          else if (A) saved = { ok: true, ...A.recordMission(opts.game || { adventure: A.fresh() }, res.missionId, res.mistakes, true) };
        } catch (x) { saved = { ok: false, error: x.message }; }
        window.dispatchEvent(new CustomEvent('adventure-mission-result', { detail: { missionId: res.missionId, value: res.mistakes, result: saved, source: 'story-carry' } }));
      }
      run.saved = saved;
      const box = el('div', 'story-result'), head = el('p', 'story-result-stars', res.stars ? stars(res.stars) : w().none), detail = el('p', '', `${w().result} · ${res.time} s · ${w().mistakes} ${res.mistakes} (${w().bumps} ${res.bumps}, ${w().drops} ${res.drops}, ${w().overtime} ${res.overtime})`);
      if (saved && !saved.ok) detail.textContent += ' · ' + w().saveErr + saved.error;
      const again = el('button', 'story-btn', w().again), next = el('button', 'story-btn story-btn-main', w().next); again.type = next.type = 'button';
      again.onclick = () => { box.remove(); run.result = null; run.saved = null; sim = new C.CarryBag(); run.camX = null; };
      next.onclick = () => finish({ skipped: false, mission: res, saved: run.saved });
      box.append(head, detail, again, next); ui.d.append(box); next.focus({ preventScroll: true });
    }
    return true;
  }

  window.StoryScenes = {
    play, ids: ['arrival', 'brick', 'carry_bag'],
    get playing() { return current ? current.id : null; },
    /** Ends the current scene as skipped. */
    stop() { current?.finish({ skipped: true }); },
    /** Last rendered frame: draw calls, triangles, and the set's own meshes/triangles (QA, performance report). */
    stats: () => lastStats,
    /** QA: the running mini-game simulation (read-only use). */
    get debug() { return current; }
  };
})();
