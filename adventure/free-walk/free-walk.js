/* Free walk (GOTR-0118): walk anywhere in Gloryland, inside the game, with the player's own Fighter (rig, species, street
 * outfit), in the player's language. The town is free-walk-town.js; this file is the mode: the full-screen view on the
 * game's renderer (the engine's demo hook, like the story films), the stick, keys and zoom, the district name, the story's
 * destination with an arrow and the distance, and the way back to the map.
 *
 * GOTR-0122 (owner 2026-11-25): the walk is part of the story, not a separate toy.
 *   - The destination is always set by the game from the current story step (no selector), with a short objective line;
 *     the light follows the story (no Day/Night buttons): FreeWalkCore.storyTime(step, chapter).
 *   - Story walks: when the next Chapter 1 step happens at another place than where the last film ended
 *     (FreeWalkCore.STORY_WALKS), the story opens the walk at the place the film ended; walking into the destination ring
 *     starts that step once (the one-time story ticket, re-checked live). The walk record (FreeWalkCore.walkKey(profile))
 *     keeps the step, the position and whether the walk was open, so a player who quits mid-walk resumes in it.
 *   - The Fighter carries what the story gives him: the duffel off the bus, the new heavy bag out of Otto's (market-sets.js).
 *   - A persistent "Walk" entry in the top bar (never during a film, a fight or a timed round).
 * Walking never writes the game save itself (only the quest action it opens does). Left-to-right in every language; text
 * elements use dir="auto".
 *
 *   FreeWalk.open({ start?: placeId | 'resume', walk?: stepId }) -> Promise<boolean>   (false: could not start; nothing left open)
 *   FreeWalk.close(how?)   'map' (default) | 'story' | 'quiet'
 *   FreeWalk.storyWalk() -> { step, after, from, to, carry, record } | null   the walk the story waits for now
 *   FreeWalk.arrive(step)  marks a story walk as walked (the device fallback); FreeWalk.available()
 *   FreeWalk.storyDestination() / storyNow() / tickets() ; FreeWalk.playing ; FreeWalk.snapshot() (QA)
 * World: metres, x east, z south, y up. */
(() => {
  'use strict';
  const MAP_SRC = './adventure/gloryland-map.js?v=20261127city1';
  const Core = () => window.FreeWalkCore;
  const STORY_IDS = ['bruno', 'market_stall', 'otto', 'docks_quay'];
  const PLACE_IDS = ['oldtown', 'market', 'docks', 'downtown', 'neon', 'dome', 'hill', 'tech', 'fair', 'cove', 'fort'];
  // GOTR-0122 (owner: "It has to be zoom out"): a wide chase view, behind and above the Fighter, showing the street round him
  const PITCH = .6, DIST = 11.5, FOV = 50, YAW0 = .24, ZOOM_MIN = .55, ZOOM_MAX = 1.45;
  let run = null, loader = null;

  const app = () => window.app, engine = () => window.app?.engine, game = () => window.ringfighterGame;
  const lang = () => Core().langOf(app()?.lang);
  const t = (key, vars) => Core().text(lang(), key, vars);
  const placeName = id => { const p = window.AdventureUI?.places?.[id]; return p ? (p.name[lang()] || p.name.en) : t('outskirts'); };
  const targetName = id => STORY_IDS.includes(id) ? t(id) : placeName(id);
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) { n.textContent = text; n.dir = 'auto'; } return n; }
  function loadMap() {
    if (window.GlorylandMap?.build) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = MAP_SRC; s.onload = () => resolve(); s.onerror = () => { loader = null; reject(Error('map script')); }; document.head.append(s); });
    return loader;
  }
  const profileId = () => { try { return game()?.store?.current?.()?.id || window.app?.engine?.career?.store?.current?.()?.id || null; } catch { return null; } };
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

  /** The Chapter 1 waypoint of the current step (the same rules as the v1.92 roam): a place, only when that step may be played now. */
  function storyNow() {
    try {
      const g = game()?.store?.game?.(), flow = window.StoryFlow, step = flow?.state(g, 1)?.current, id = step?.id, target = Core().storyTarget(id), profile = profileId();
      if (!profile || !target || !flow.playable(g, id) || window.AdventureProgress?.blockedByGymShift?.(g, id) || (step.boss && flow.gate(g, 1))) return null;
      return { profile, step: id, target, boss: !!step.boss };
    } catch { return null; }
  }
  const storyDestination = () => storyNow()?.target || null;
  // ---- the story walk record (one per profile)
  const walkRead = () => { const id = profileId(); return id ? Core().parseWalk(read(Core().walkKey(id))) : null; };
  const walkWrite = rec => { const id = profileId(); if (id && rec) write(Core().walkKey(id), JSON.stringify({ ...rec, t: Date.now() })); };
  /** The story walk the game waits for now: the current Chapter 1 step needs a walk that has not been walked. */
  function storyWalk() {
    try {
      const now = storyNow(); if (!now) return null;
      const g = game()?.store?.game?.(), record = walkRead(), attempted = !!g?.adventure?.missions?.[now.step];
      const w = Core().walkDue(now.step, record, attempted);
      return w ? { step: now.step, ...w, record: record && record.step === now.step ? record : null } : null;
    } catch { return null; }
  }
  /** Will finishing the step before `step` lead into its walk? (the arrival film is cut short when it does) */
  function willWalk(step) {
    try { const g = game()?.store?.game?.(); return available() && !!Core().walkDue(step, walkRead(), !!g?.adventure?.missions?.[step]); } catch { return false; }
  }
  /** The walk to `step` is done (walked into the ring, or the device could not show the walk): never asked again for it. */
  function arrive(step) { if (Core().walkFor(step)) walkWrite({ step, phase: 'arrived', open: false }); }
  /** What the story says now: the chapter, the step, where it happens (a story place or, after Chapter 1, the chapter's
   *  district), the light, and the walk (if one is due). */
  function storyPlan() {
    const plan = { chapter: 1, step: null, target: null, time: 'day', walk: null, done: false };
    try {
      const g = game()?.store?.game?.(), flow = window.StoryFlow, A = window.AdventureProgress;
      if (A && g) { const i = A.chapters.findIndex(c => !A.bossWon(g, c.boss)); plan.chapter = i < 0 ? A.chapters.length : i + 1; plan.done = i < 0; }
      const cur = flow && g ? flow.state(g, plan.chapter)?.current : null;
      plan.step = cur?.id || null;
      plan.target = plan.chapter === 1 ? Core().storyTarget(plan.step) : (flow?.chapters?.[plan.chapter]?.pin || null);
      if (plan.done && !cur) plan.target = null;
      plan.time = Core().storyTime(plan.step, plan.chapter);
      plan.walk = storyWalk();
    } catch { /* no story data: a plain walk */ }
    return plan;
  }
  let ticketBox = null;
  const tickets = () => ticketBox || (ticketBox = Core().storyWalk(() => window.sessionStorage, () => Date.now(), () => Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''), storyNow));
  const lowTier = () => (navigator.deviceMemory && navigator.deviceMemory < 4) || /[?&]gfx=low/.test(location.search);
  const touchDevice = () => { try { return navigator.maxTouchPoints > 0 || !!window.matchMedia?.('(any-pointer: coarse)').matches; } catch { return true; } };
  /** Something else holds the screen: a film, a fight, a timed round or a mission run. The walk never opens over it. */
  function busy() {
    const e = engine(); if (!e) return true;
    if (window.StoryScenes?.playing || e.fightIQDemo) return true;
    const fv = e.arena?.fightView; if (fv?.match && !fv.match.result) return true;
    if (e.career?.active) return true;
    const r = window.AdventureOldTown?.run; if (r && !r.ended) return true;
    return false;
  }
  const available = () => { const e = engine(); return !!(e?.renderer && e.coach?.root && window.FreeWalkTown && Core() && profileId()); };

  async function open(opts = {}) {
    if (run) return true;
    const e = engine(), C = Core();
    if (!e?.renderer || !e.coach?.root || !window.FreeWalkTown || !C || e.fightIQDemo || window.StoryScenes?.playing) return false;
    if (!profileId()) { game()?.home?.(); return false; }
    const plan = storyPlan(), walk = plan.walk && (!opts.walk || opts.walk === plan.walk.step) ? plan.walk : null;
    if (opts.walk && !walk) return false; // the story moved on: the caller goes on without a walk
    game()?.close?.();
    window.FreeWalkTown?.prepare?.(4000); // walk-town-look: the films' street models load alongside the map script
    const R = run = { closed: false, opts, e, plan, walk, time: plan.time, zoom: 1, zoomTarget: 1, yaw: YAW0, keys: new Set(), analog: [0, 0], full: 0, poseT: 0, last: { save: 0, hud: -1, guide: -1 }, perf: { n: 0, sum: 0, max: 0, calls: 0, tris: 0 }, destination: walk ? walk.to : plan.target, story: walk ? walk.to : plan.target, arrived: false };
    R.wasPlaying = e.isPlaying; e.isPlaying = false;
    // ---- overlay (left-to-right in every language; each text line dir="auto")
    const d = el('dialog', 'story-scene free-walk'); d.lang = lang(); d.dataset.kind = 'walk'; d.dataset.story = walk ? 'walk' : plan.target ? 'target' : 'none';
    const host = el('div', 'story-host'), hud = el('div', 'fw-hud'), title = el('small', 'fw-title', t('title')), zone = el('strong', 'fw-zone', '');
    hud.append(title, zone);
    const exit = el('button', 'fw-exit', t('exit')); exit.type = 'button'; exit.setAttribute('aria-label', t('exitLabel')); exit.onclick = () => close('map');
    // the objective: set by the game from the story (owner 2026-11-25: "The game should select for me")
    const goalOf = () => walk ? t('goal_' + walk.step) : plan.target ? t('goalPlace', { place: targetName(plan.target) }) : plan.done ? t('goalDone') : '', goalText = goalOf();
    const nav = el('section', 'fw-nav'), goal = el('strong', 'fw-goal', goalText), status = el('div', 'fw-nav-status'), arrow = el('span', 'fw-arrow', '➤'), dist = el('strong', 'fw-dist', ''), help = el('span', 'fw-help', t(plan.target ? 'walkHelp' : 'help'));
    arrow.setAttribute('aria-hidden', 'true'); arrow.hidden = true; status.append(arrow, dist); nav.append(goal, status, help); nav.hidden = !goalText;
    setTimeout(() => nav.classList.add('quiet'), 9000); // the how-to line, then only the objective and the distance
    // the stick (GOTR-0122 redesign): a floating stick in the lower-left area, resting at a fixed spot; keys on a computer
    const pad = el('div', 'fw-pad'), stick = el('div', 'fw-stick'), glow = el('span', 'fw-glow'), ticks = el('span', 'fw-ticks'), thumb = el('i', 'fw-knob');
    stick.append(ticks, glow, thumb); pad.append(stick); stick.setAttribute('role', 'group'); stick.setAttribute('aria-label', t('stick'));
    const keysHint = el('p', 'fw-keys', t('keysHint')); const touch = touchDevice(); pad.hidden = !touch; keysHint.hidden = touch; d.dataset.input = touch ? 'touch' : 'keys';
    const zoomBox = el('aside', 'fw-zoom'), plus = el('button', '', '+'), minus = el('button', '', '−'); plus.type = minus.type = 'button'; plus.setAttribute('aria-label', t('zoomIn')); minus.setAttribute('aria-label', t('zoomOut')); zoomBox.append(plus, minus);
    const back = el('button', 'fw-story', t('storyReturn')); back.type = 'button'; back.hidden = true; back.onclick = () => close('story');
    const notice = el('p', 'fw-notice', t('loading')); notice.setAttribute('role', 'status');
    const fade = el('div', 'fw-fade active');
    d.append(host, hud, exit, nav, pad, keysHint, zoomBox, back, fade, notice); document.body.append(d);
    d.tabIndex = -1; try { d.showModal(); } catch { d.setAttribute('open', ''); } d.focus({ preventScroll: true });
    d.addEventListener('cancel', ev => { ev.preventDefault(); close('map'); });
    Object.assign(R, { d, host, zone, goal, nav, arrow, dist, back, notice, fade, stick, thumb, glow, pad });
    // the player's language can change while walking (or be applied after a resumed walk opened at boot): every line follows it
    R.relabel = () => {
      d.lang = lang(); title.textContent = t('title'); exit.textContent = t('exit'); exit.setAttribute('aria-label', t('exitLabel'));
      goal.textContent = goalOf(); help.textContent = t(plan.target ? 'walkHelp' : 'help'); keysHint.textContent = t('keysHint'); back.textContent = t('storyReturn');
      stick.setAttribute('aria-label', t('stick')); plus.setAttribute('aria-label', t('zoomIn')); minus.setAttribute('aria-label', t('zoomOut'));
      if (!notice.hidden) notice.textContent = t(R.lost ? 'lost' : 'loading'); R.zone.textContent = ''; R.last.hud = -1; R.last.guide = -1;
    };
    // the story ticket: entering the ring of the current step's place opens that step once (re-checked live). A story walk
    // without session storage keeps its ticket in memory (still re-checked live), so the story never blocks.
    const live = storyNow();
    tickets().clear();
    if (live && !live.boss && live.target === R.destination) { R.ticket = tickets().arm(live.target) || (walk ? { ...live, nonce: null, mem: true } : null); R.prevD = null; }
    // input
    const down = ev => {
      if (R.closed) return;
      const k = ev.code;
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'KeyD', 'KeyA', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight'].includes(k)) { ev.preventDefault(); R.keys.add(k); }
      else if (k === 'KeyQ' || k === 'KeyE') { ev.preventDefault(); R.keys.add(k); }
      else if (k === 'Equal' || k === 'Minus' || k === 'NumpadAdd' || k === 'NumpadSubtract') { ev.preventDefault(); if (!ev.repeat) zoomBy(k === 'Equal' || k === 'NumpadAdd' ? -.15 : .15); }
    };
    const up = ev => R.keys.delete(ev.code), blur = () => { R.keys.clear(); release(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    const hide = () => { if (document.hidden) { blur(); save(); } };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', save);
    R.unlisten = () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', save); };
    // The stick: a touch inside its resting ring drives it from its centre (as before); a touch elsewhere in the lower-left
    // area moves the stick under the thumb first (a floating stick). It goes back to its resting spot on release.
    let stickId = null, base = null;
    function release(ev) {
      if (ev && ev.pointerId !== stickId) return; stickId = null; base = null; R.analog = [0, 0];
      thumb.style.transform = 'translate(-50%,-50%)'; glow.style.opacity = '0'; stick.style.left = stick.style.top = ''; pad.classList.remove('active');
    }
    function point(ev) {
      if (ev.pointerId !== stickId || !base) return; const r = base.size * .32, dx = ev.clientX - base.x, dy = ev.clientY - base.y;
      R.analog = window.StreetWalkPrototype?.stickInput ? window.StreetWalkPrototype.stickInput(dx, dy, r) : (() => { const l = Math.hypot(dx, dy); return l < r * .14 ? [0, 0] : [dx / Math.max(l, r), -dy / Math.max(l, r)]; })();
      const l = Math.max(1, Math.hypot(dx, dy) / r); thumb.style.transform = `translate(calc(-50% + ${dx / l}px),calc(-50% + ${dy / l}px))`;
      const m = Math.min(1, Math.hypot(...R.analog)); glow.style.opacity = String(m); glow.style.transform = `rotate(${Math.atan2(dx, -dy)}rad)`;
    }
    pad.addEventListener('pointerdown', ev => {
      if (stickId !== null || !R.town) return; ev.preventDefault(); stickId = ev.pointerId; pad.setPointerCapture?.(ev.pointerId);
      const b = stick.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (Math.hypot(ev.clientX - cx, ev.clientY - cy) <= b.width / 2) base = { x: cx, y: cy, size: b.width };
      else { // float: the stick's centre comes under the thumb (kept inside the area)
        const z = pad.getBoundingClientRect(), h = b.width / 2, x = Math.min(z.right - h, Math.max(z.left + h, ev.clientX)), y = Math.min(z.bottom - h, Math.max(z.top + h, ev.clientY));
        stick.style.left = (x - z.left - h) + 'px'; stick.style.top = (y - z.top - h) + 'px'; base = { x, y, size: b.width };
      }
      pad.classList.add('active'); point(ev);
    });
    pad.addEventListener('pointermove', point);
    for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(k, release);
    // drag on the view turns the camera round the Fighter
    let dragId = null, dragX = 0;
    host.addEventListener('pointerdown', ev => { if (dragId !== null) return; dragId = ev.pointerId; dragX = ev.clientX; host.setPointerCapture?.(ev.pointerId); });
    host.addEventListener('pointermove', ev => { if (ev.pointerId !== dragId) return; R.yaw -= (ev.clientX - dragX) * .008; dragX = ev.clientX; R.dragAt = performance.now(); });
    for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(k, ev => { if (ev.pointerId === dragId) dragId = null; });
    host.addEventListener('wheel', ev => { ev.preventDefault(); zoomBy(ev.deltaY > 0 ? .1 : -.1); }, { passive: false });
    function zoomBy(a) { R.zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round((R.zoomTarget + a) * 100) / 100)); plus.disabled = R.zoomTarget <= ZOOM_MIN; minus.disabled = R.zoomTarget >= ZOOM_MAX; }
    plus.onclick = () => zoomBy(-.15); minus.onclick = () => zoomBy(.15);

    // ---- the stage: the game's canvas moves into the overlay (as in the films)
    const stage = e.stage || document.getElementById('stageContainer');
    if (stage) { const ph = document.createComment('free walk stage'); stage.before(ph); R.stageMove = { stage, ph, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
    R.oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
    if (!e.fightIQDemo) e.fightIQDemo = R.hold = { frame() {} }; // walk-town-look: the arena is not drawn behind the loading cover
    R.camera = new THREE.PerspectiveCamera(FOV, 1, .1, 520);
    R.onLost = ev => { ev.preventDefault?.(); notice.textContent = t('lost'); notice.hidden = false; R.lost = true; };
    e.renderer.domElement.addEventListener('webglcontextlost', R.onLost);
    window.dispatchEvent(new Event('resize'));
    // the Fighter: the player's own rig in the street outfit, mirrored root as in every film (GOTR-0074)
    const c = e.coach; R.rig = c; R.borrow = { parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible, outfit: window.StoryCast?.outfitOf?.(c) };
    // contact shadow under the Fighter
    { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(18,13,9,.85)'); gr.addColorStop(.5, 'rgba(18,13,9,.45)'); gr.addColorStop(1, 'rgba(18,13,9,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      R.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, toneMapped: false })); R.blob.renderOrder = 1; }
    try { await loadMap(); } catch { return fail(); }
    if (R.closed) return false;
    const ok = await buildTown();
    if (!ok) return fail();
    R.frame = frame; e.fightIQDemo = R;
    if (walk) walkWrite({ step: walk.step, phase: 'walk', open: true, x: R.s.x, z: R.s.z, ry: R.s.ry });
    return true;

    // A story walk that cannot start leaves nothing open: the story goes on without it (the caller's direct transition).
    function fail() { if (R.closed) return false; if (opts.walk || walk) { close('quiet'); return false; } notice.textContent = t('failed'); notice.hidden = false; fade.classList.remove('active'); return false; }
    async function buildTown() {
      R.busy = true; fade.classList.add('active'); notice.textContent = t('loading'); notice.hidden = false; clear();
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      if (R.closed) return false;
      const prev = R.town; R.town = null;
      try {
        if (prev) { dropCarry(); prev.scene.remove(c.root, R.blob); if (R.ringMesh) prev.scene.remove(R.ringMesh); prev.dispose(); }
        const t0 = performance.now();
        // walk-town-look: the films' street kit and models (never longer than 4 s from the open: a later open has them cached), the build, then the GPU warm-up in slices;
        // the cover shows how far it got
        const say = f => { notice.textContent = t('loading') + ' ' + Math.round(f * 100) + '%'; };
        await window.FreeWalkTown.prepare?.(4000, f => say(f * .3));
        if (R.closed) return false;
        say(.3); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
        const town = window.FreeWalkTown.build({ renderer: e.renderer, time: R.opts.look || R.time, quality: lowTier() ? 'low' : 'high', lang: lang(), defer: true });
        R.buildMs = Math.round(performance.now() - t0);
        say(.4); await town.ready?.(f => say(.4 + f * .6), () => !R.closed);
        if (R.closed) { town.dispose(); return false; }
        R.town = town;
      } catch (x) { console.warn('free walk', x); R.town = null; R.busy = false; return false; } // the map button still leaves cleanly
      const town = R.town;
      if (!town.targets.bus_stop) { const gym = town.targets.bruno, b = gym && town.roads && Core().busStop(town.roads, town.grid, gym); if (b) town.targets.bus_stop = b; }
      if (!R.s) R.s = startState(town);
      if (!town.grid.allowed(R.s.x, R.s.z)) { const n = town.grid.nearest(R.s.x, R.s.z); if (n) { R.s.x = n.x; R.s.z = n.z; } }
      town.scene.add(c.root, R.blob);
      c.root.visible = true; c.root.rotation.set(0, R.s.ry, 0); c.root.scale.set(-1, 1, 1); c.maneInitialized = false;
      try { window.StoryCast?.outfit?.(c, 'street'); } catch (x) { console.warn('free walk outfit', x); }
      window.DreamPose?.reset?.(c); R.groundY = town.grid.height(R.s.x, R.s.z); R.turn = R.s.ry;
      if (R.faceRoute) { R.yaw = R.camYaw = openYaw(town, R.s, R.s.ry + Math.PI); R.faceRoute = false; } // behind him, looking where he goes (turned to the open side by a wall)
      c.root.position.set(R.s.x, R.groundY, R.s.z);
      takeCarry(town);
      R.center = new THREE.Vector3(R.s.x, R.groundY + .9, R.s.z); place(true);
      ring();
      notice.hidden = true; fade.classList.remove('active'); R.busy = false; R.last.hud = -1; R.last.guide = -1; R.route = null;
      return true;
    }
    function clear() { R.keys.clear(); release(); }
  }
  /** What the Fighter carries on this walk: his duffel (off the bus), or the new heavy bag on his right shoulder (the carry of
   *  Otto's film, market-sets.js, settled on the shoulder). Optional: without the props he walks empty-handed. */
  function takeCarry(town) {
    const R = run, c = R.rig, kind = R.walk?.carry; R.carry = null;
    try {
      if (kind === 'duffel' && window.StoryCast?.bag) { window.StoryCast.bag(c, 'shoulder'); R.carry = 'duffel'; }
      else if (kind === 'heavybag' && window.MarketProps?.create && window.BagBreak?.bag) {
        R.props = window.MarketProps.create({ scene: town.scene, set: { objects: { display: { x: 0, y: 0, z: 0 } } }, rigs: { fighter: c }, carry: { heavybag: [{ t: 0, on: 'shoulder' }] } });
        if (R.props?.heavy) R.carry = 'heavybag'; else { R.props?.dispose(); R.props = null; }
      }
    } catch (x) { console.warn('free walk carry', x); dropCarry(); }
  }
  function dropCarry(R = run) {
    if (!R) return; const c = R.rig;
    try { if (c) window.StoryCast?.bag?.(c, 'off'); } catch { /* none */ }
    try { R.props?.dispose(); } catch (x) { console.warn('free walk carry', x); }
    R.props = null; R.carry = null;
  }
  function startState(town) {
    const C = Core(), R = run, o = R.opts, id = profileId(), raw = read(C.saveKey(id));
    if (R.walk) { // a story walk: where the player left it, else where the film before it ended (facing the way to go)
      const rec = R.walk.record;
      if (rec && rec.phase === 'walk' && Number.isFinite(rec.x) && town.grid.allowed(rec.x, rec.z)) { R.faceRoute = true; return { x: rec.x, z: rec.z, ry: rec.ry || 0, dist: 0, walking: false, restored: true }; }
      const at = town.targets[R.walk.from];
      if (at) { // out of the doorway he came from: a few steps on toward where he goes
        const ry = routeHeading(town, at, town.targets[R.walk.to]), step = R.walk.from === 'bus_stop' ? 0 : 4, x = at.x + Math.sin(ry) * step, z = at.z + Math.cos(ry) * step, ok = town.grid.allowed(x, z);
        R.faceRoute = true; return { x: ok ? x : at.x, z: ok ? z : at.z, ry, dist: 0, walking: false };
      }
    }
    const at = o.start && o.start !== 'resume' ? (town.places.find(p => p.id === o.start)?.spawn || town.targets[o.start] || null) : null;
    if (at) return { x: at.x, z: at.z, ry: Math.PI, dist: 0, walking: false };
    const legacy = !raw ? C.legacyPlace(read(C.LEGACY_KEY)) : null; // the v1.92 Chapter 1 roam: start in the same district
    const fallback = town.targets[legacy || R.destination || 'oldtown'] || town.places[0].spawn;
    return C.restore(raw, town.grid, { x: fallback.x, z: fallback.z, ry: Math.PI });
  }
  /** The camera yaw nearest to `base` (within about 90 degrees) with the most open view of the Fighter at s: a story walk
   *  that starts at a door begins with the street in view, not the wall behind him. */
  function openYaw(town, s, base) {
    const g = town.grid, y = g.height(s.x, s.z) + 1.25, cp = Math.cos(PITCH), sp = Math.sin(PITCH); let best = base, bf = -Infinity;
    for (let k = -8; k <= 8; k++) {
      const yaw = base + k * .2; let f = 1;
      for (; f < DIST; f += .5) { const x = s.x + Math.sin(yaw) * cp * f, z = s.z + Math.cos(yaw) * cp * f, h = y + sp * f - .4; if (g.top(x, z) > h || (town.canopy?.(x, z) ?? -1e9) > h) break; }
      const score = Math.min(f, DIST) - Math.abs(k) * .25; if (score > bf) { bf = score; best = yaw; }
    }
    return best;
  }
  /** The heading from a to the street route toward b (about 8 m on), the Fighter's facing at the start of a story walk. */
  function routeHeading(town, a, b) {
    if (!b) return Math.PI; const S = town.S; let to = [b.x, b.z];
    try { const path = town.map.route?.({ x: a.x / S, z: a.z / S }, { x: b.x / S, z: b.z / S }); if (path && path.length > 1) { for (const [x, z] of path) { if (Math.hypot(x * S - a.x, z * S - a.z) > 8) { to = [x * S, z * S]; break; } } } } catch { /* straight on */ }
    return Math.atan2(to[0] - a.x, to[1] - a.z);
  }
  function save() {
    const R = run; if (!R?.s || !R.town || R.busy) return;
    write(Core().saveKey(profileId()), Core().serialize(R.s));
    if (R.walk && !R.walkDone) walkWrite({ step: R.walk.step, phase: 'walk', open: !R.closed, x: Math.round(R.s.x * 100) / 100, z: Math.round(R.s.z * 100) / 100, ry: Math.round(R.s.ry * 1000) / 1000 });
  }
  // the destination ring on the ground
  function ring() {
    const R = run; if (!R?.town) return;
    if (R.ringMesh) { R.town.scene.remove(R.ringMesh); R.ringMesh.geometry.dispose(); R.ringMesh.material.dispose(); R.ringMesh = null; }
    const at = R.destination && R.town.targets[R.destination]; if (!at) return;
    const m = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.85, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5ce6d8, transparent: true, opacity: .9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.position.set(at.x, R.town.grid.height(at.x, at.z) + .04, at.z); m.renderOrder = 3; R.ringMesh = m; R.town.scene.add(m);
  }
  function place(snap) {
    const R = run, d = DIST * R.zoom;
    const goal = new THREE.Vector3(R.s.x, R.groundY + 1.25, R.s.z);
    if (snap) R.center.copy(goal); else R.center.lerp(goal, .18);
    // Never inside the town: march along the view ray over the height field. Rising ground (a hill, a ramp: walkable) lifts
    // the camera over it; a building or wall (not walkable) brings it closer to the Fighter.
    const g = R.town.grid, ox = R.center.x, oy = R.center.y, oz = R.center.z;
    // the camera body has a size: each sample along the ray checks 0.6 m round it (a thin wall between samples is still seen)
    // GOTR-0122: 0 free, 1 a wall (not walkable), 2 rising ground (walkable: lift the view), 3 only a tree crown. The sample
    // that hits decides (before, a wall 0.6 m beside a walkable centre counted as rising ground and tipped the view top-down).
    const solidAt = (x, y, z) => { let s = 0; for (const [a, b] of [[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6]]) { if (g.top(x + a, z + b) > y) { if (!g.allowed(x + a, z + b)) return 1; s = 2; } else if (!s && (R.town.canopy?.(x + a, z + b) ?? -1e9) > y) s = 3; } return s; };
    const probe = (yaw, pitch) => { const cp = Math.cos(pitch), sp = Math.sin(pitch); for (let k = 1; k <= 24; k++) { const f = d * k / 24, x = ox + Math.sin(yaw) * cp * f, z = oz + Math.cos(yaw) * cp * f, h = solidAt(x, oy + sp * f - .4, z); if (h) return { k: k * 16 / 24, ground: h >= 2, crown: h === 3 }; } return null; };
    // the player's own view first; a wall or stall right behind the Fighter swings the camera a little round instead
    let best = null;
    for (const off of [0, .35, -.35, .7, -.7, 1.05, -1.05]) {
      const yaw = R.yaw + off; let pitch = PITCH, hit = probe(yaw, pitch);
      while (hit && pitch < (hit.crown ? .9 : hit.ground ? 1.25 : .98)) { pitch += .08; hit = probe(yaw, pitch); } // over rising ground; over a wall or a crown only a little higher (then closer)
      const free = hit ? Math.max(2.2, d * (hit.k - 1.5) / 16) : d, c = { off, pitch, free };
      if (!best || free > best.free + .5) best = c;
      if (free >= d * .6) { best = c; break; }
    }
    const target = R.yaw + best.off;
    R.camYaw = snap || R.camYaw === undefined ? target : R.camYaw + Math.atan2(Math.sin(target - R.camYaw), Math.cos(target - R.camYaw)) * .08;
    R.camP = snap || !R.camP ? best.pitch : R.camP + (best.pitch - R.camP) * .1;
    R.camD = snap || !R.camD || best.free < R.camD ? best.free : R.camD + (best.free - R.camD) * .06;
    const D = R.camD, cp = Math.cos(R.camP), sp = Math.sin(R.camP);
    R.camera.position.set(ox + Math.sin(R.camYaw) * cp * D, oy + sp * D, oz + Math.cos(R.camYaw) * cp * D);
    R.camera.lookAt(ox, oy + .2, oz);
  }
  function guide(ms) {
    const R = run, town = R.town, at = R.destination && town.targets[R.destination], C = Core();
    if (!at) { R.dist.textContent = ''; R.arrow.hidden = true; R.back.hidden = true; R.arrived = false; return; }
    const straight = Math.hypot(at.x - R.s.x, at.z - R.s.z);
    R.arrived = straight <= C.ARRIVE;
    if (R.ticket && R.ticket.target === R.destination) {
      // a story walk that starts (or resumes) inside the ring has arrived; an ordinary walk needs a real entry
      const entered = R.walk && R.prevD == null ? straight <= C.ARRIVE : tickets().entered(R.prevD, straight); R.prevD = straight;
      if (entered) {
        const tk = R.ticket.mem ? (tickets().still(R.ticket) ? R.ticket : null) : tickets().consume(R.ticket.nonce); R.ticket = null;
        if (tk) { if (R.walk?.step === tk.step) { R.walkDone = true; arrive(tk.step); } R.launched = tk.step; setTimeout(() => close('quest', tk), 0); return; }
      }
    }
    R.back.hidden = !(R.arrived && !R.ticket && !R.launched && R.story && R.destination === R.story);
    if (R.arrived) { R.dist.textContent = t('arrived'); R.arrow.hidden = true; return; }
    // the streets' route (the map's own street router, the same one that draws the Adventure route dots)
    const S = town.S;
    if (!R.route || ms - R.routeAt > 1500 || Math.hypot(R.routeFrom.x - R.s.x, R.routeFrom.z - R.s.z) > 6) {
      R.routeAt = ms; R.routeFrom = { x: R.s.x, z: R.s.z };
      const path = town.map.route?.({ x: R.s.x / S, z: R.s.z / S }, { x: at.x / S, z: at.z / S });
      R.route = path && path.length > 1 ? path.map(([x, z]) => [x * S, z * S]).concat([[at.x, at.z]]) : [[at.x, at.z]];
    }
    // the point about 9 m on along the route from the nearest point of it
    let best = 0, bd = Infinity; R.route.forEach((p, i) => { const q = Math.hypot(p[0] - R.s.x, p[1] - R.s.z); if (q < bd) { bd = q; best = i; } });
    let len = bd, next = R.route[best], acc = 0;
    for (let i = best; i < R.route.length - 1; i++) { const a = R.route[i], b = R.route[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); len += l; if (acc < 9) { acc += l; next = b; } }
    if (straight < 14) next = [at.x, at.z];
    R.dist.textContent = t('metres', { n: Math.max(1, Math.round(straight < 14 ? straight : Math.max(straight, Math.min(len, straight * 3)))) }); // close by: straight there
    const dx = next[0] - R.s.x, dz = next[1] - R.s.z, l = Math.hypot(dx, dz); if (l < .05) { R.arrow.hidden = true; return; }
    const y = R.groundY, A = new THREE.Vector3(R.s.x, y, R.s.z).project(R.camera), B = new THREE.Vector3(R.s.x + dx / l, y, R.s.z + dz / l).project(R.camera);
    R.arrow.style.transform = 'rotate(' + Math.atan2(A.y - B.y, (B.x - A.x) * R.camera.aspect) + 'rad)'; R.arrow.hidden = false;
  }
  function frame(delta) {
    const R = run; if (!R || R.closed || !R.town || R.lost) return;
    const e = R.e, town = R.town, dt = Math.min(Math.max(delta || 0, 0), .05), ms = performance.now();
    const cv = e.renderer.domElement, w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
    if (w && h && Math.abs(R.camera.aspect - w / h) > .002) { R.camera.aspect = w / h; R.camera.updateProjectionMatrix(); }
    if (!R.busy && dt > 0) step(dt, ms, true);
    const t0 = performance.now();
    e.renderer.render(town.scene, R.camera);
    const info = e.renderer.info.render, P = R.perf; P.calls = info.calls; P.tris = info.triangles;
    const raw = Math.max(0, delta || 0); if (raw > 0 && raw < 1) { P.n++; P.sum += raw; P.max = Math.max(P.max, raw); P.cpu = performance.now() - t0; }
  }
  /** One step of the walk (input, movement, traffic, people, the Fighter's pose, the camera, the HUD). QA calls it without a render. */
  function step(dt, ms, pose) {
    const R = run, C = Core(), town = R.town;
    {
      const K = R.keys, lr = (K.has('ArrowRight') || K.has('KeyD') ? 1 : 0) - (K.has('ArrowLeft') || K.has('KeyA') ? 1 : 0), ud = (K.has('ArrowUp') || K.has('KeyW') ? 1 : 0) - (K.has('ArrowDown') || K.has('KeyS') ? 1 : 0);
      const hIn = lr || ud ? lr : R.analog[0], vIn = lr || ud ? ud : R.analog[1], mag = Math.hypot(hIn, vIn);
      R.full = mag > .93 ? R.full + dt : 0; // held all the way: a brisk walk after a moment
      const brisk = K.has('ShiftLeft') || K.has('ShiftRight') || R.full > .8;
      if (K.has('KeyQ')) R.yaw += dt * 1.6; if (K.has('KeyE')) R.yaw -= dt * 1.6;
      if (K.has('KeyQ') || K.has('KeyE')) R.dragAt = ms;
      // GOTR-0122 chase camera (owner: GTA-style, behind and above): while he walks, the view comes round behind him unless
      // the player turned it in the last 1.5 s
      if (R.s.walking && ms - (R.dragAt || -1e9) > 1500) { const d = Math.atan2(Math.sin(R.s.ry + Math.PI - R.yaw), Math.cos(R.s.ry + Math.PI - R.yaw)); R.yaw += d * (1 - Math.exp(-dt * 1.3)) * (R.walkAmt || 0); }
      let [vx, vz] = C.velocity(hIn, vIn, R.camYaw ?? R.yaw, C.SPEED * (brisk ? 1.55 : 1));
      if (window.DreamPose?.pace) [vx, vz] = window.DreamPose.pace(R.pace || (R.pace = {}), vx, vz, R.turn, dt); // walk-gait: a heavy man's start, stop and turn (DreamPose.pace)
      town.grid.move(R.s, vx, vz, dt, town.blocked);
      town.update(dt, R.s, R.camera);
      R.poseT += dt; R.zoom += (R.zoomTarget - R.zoom) * (1 - Math.exp(-dt * 10));
      const floor = town.grid.height(R.s.x, R.s.z), u = 1 - Math.exp(-dt * 12);
      R.groundY += (floor - R.groundY) * u;
      R.turn += Math.atan2(Math.sin(R.s.ry - R.turn), Math.cos(R.s.ry - R.turn)) * (1 - Math.exp(-dt * 10));
      const c = R.rig; c.root.position.set(R.s.x, R.groundY, R.s.z); c.root.rotation.set(0, R.turn, 0);
      R.walkAmt = (R.walkAmt || 0) + ((R.s.walking ? 1 : 0) - (R.walkAmt || 0)) * (1 - Math.exp(-dt * 8));
      // GOTR-0122 carry: the duffel's strap in his right hand, or his right hand on the heavy bag (market-sets.js reach); walk-gait: plant, walk flag
      if (pose) { c.root.updateMatrixWorld(true); window.DreamPose?.civil?.(c, { t: R.poseT, dt, plant: true, dist: R.s.dist, walk: R.s.walking ? 1 : 0, ground: (x, z) => town.grid.height(x, z), arms: R.carry === 'duffel' ? { R: 'strap' } : {}, reach: R.props?.reach?.('fighter', 100) || undefined, look: { yaw: 0, pitch: 0 } }); R.props?.frame(100, dt); }
      R.blob.position.set(R.s.x, R.groundY + .03, R.s.z);
      if (R.ringMesh) { const k = .5 + .5 * Math.sin(R.poseT * 4); R.ringMesh.material.opacity = .55 + .4 * k; R.ringMesh.scale.setScalar(1 + .08 * k); }
      place(false);
      if (ms - R.last.hud > 400) { R.last.hud = ms; const p = C.district(R.s.x, R.s.z, town.places); const name = p ? placeName(p.id) : t('outskirts'); if (R.zone.textContent !== name) R.zone.textContent = name; R.district = p?.id || null; }
      if (ms - R.last.guide > 200) { R.last.guide = ms; guide(ms); }
      if (ms - R.last.save > 1000) { R.last.save = ms; save(); }
    }
  }
  /** QA: walk with the stick held at (h, v) for the given seconds of game time, in 1/30 s steps, without drawing. */
  function qaWalk(h, v, seconds) {
    const R = run; if (!R?.town || R.busy) return null;
    const keep = R.analog; R.analog = [h, v]; let ms = performance.now();
    for (let k = 0; k < Math.round(seconds * 30) && run === R && !R.closed; k++) { ms += 1000 / 30; step(1 / 30, ms, false); }
    R.analog = keep; if (run === R && !R.closed) step(1 / 30, ms + 34, true); return snapshot() || { closed: true, launched: R.launched || null };
  }
  function close(how = 'map', ticket = null) {
    const R = run; if (!R || R.closed) return; R.closed = true; save(); run = null;
    const e = R.e, c = R.rig;
    try {
      if (e.fightIQDemo === R || (R.hold && e.fightIQDemo === R.hold)) e.fightIQDemo = null;
      R.unlisten?.(); e.renderer.domElement.removeEventListener('webglcontextlost', R.onLost);
      dropCarry(R);
      if (c) {
        c.root.parent?.remove(c.root);
        try { window.StoryCast?.outfit?.(c, R.borrow.outfit && R.borrow.outfit !== 'street' ? R.borrow.outfit : 'kit'); } catch { /* keep */ }
        window.DreamPose?.reset?.(c);
        if (R.borrow.parent) R.borrow.parent.add(c.root);
        c.root.position.copy(R.borrow.pos); c.root.quaternion.copy(R.borrow.q); c.root.scale.copy(R.borrow.scale); c.root.visible = R.borrow.visible; c.maneInitialized = false;
      }
      if (R.ringMesh) { R.ringMesh.geometry.dispose(); R.ringMesh.material.dispose(); }
      if (R.blob) { R.blob.geometry.dispose(); R.blob.material.map.dispose(); R.blob.material.dispose(); }
      R.town?.dispose();
      if (R.stageMove) { const m = R.stageMove; m.ph.replaceWith(m.stage); m.stage.classList.remove('game-preview-live', 'story-live'); m.stage.style.pointerEvents = m.pe; }
      if (R.oldFit) e.fitCameraToModel = R.oldFit;
      e.lastPoseStamp = null; e.lastRenderStamp = null;
    } catch (x) { console.warn('free walk close', x); }
    R.d.close?.(); R.d.remove(); window.dispatchEvent(new Event('resize'));
    if (R.ticket && !R.ticket.mem) tickets().cancel(R.ticket.nonce);
    paintEntry();
    if (how === 'quiet') return;
    if (how === 'quest' && ticket) { // the quest card's own action for that step (its confirmations, films and rewards)
      game()?.open?.('adventure', { onReady: h => { h.select?.('oldtown'); setTimeout(() => h.story?.(ticket), 350); } });
      return;
    }
    if (how === 'story') { try { history.replaceState(history.state, '', location.pathname + location.search + '#chapter1-story'); } catch { /* history unavailable */ } }
    game()?.home?.();
  }
  function snapshot() {
    const R = run; if (!R) return null;
    const P = R.perf;
    return { s: R.s && { x: +R.s.x.toFixed(2), z: +R.s.z.toFixed(2), ry: +R.s.ry.toFixed(3), walking: !!R.s.walking }, busy: !!R.busy, district: R.district || null, zone: R.zone.textContent,
      time: R.time, destination: R.destination, story: R.story, walk: R.walk ? R.walk.step : null, goal: R.goal.textContent, carry: R.carry || null, ticket: R.ticket ? R.ticket.step : null, launched: R.launched || null, arrived: R.arrived, storyReturn: !R.back.hidden, distance: R.dist.textContent, yaw: R.camYaw ?? R.yaw, zoom: R.zoom, camDist: R.camD, camPitch: R.camP,
      perf: { frames: P.n, meanMs: P.n ? +(P.sum / P.n * 1000).toFixed(1) : null, maxMs: +(P.max * 1000).toFixed(1), calls: P.calls, triangles: P.tris, cpuMs: P.cpu && +P.cpu.toFixed(1), buildMs: R.buildMs },
      town: R.town?.snapshot() || null };
  }

  /* ---- GOTR-0122: the persistent entry in the top bar (phone and computer): an icon and a short word, in the player's
   * language. Disabled (with the reason) while a film, a fight, a timed round or a mission run holds the screen. */
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="M10.5 21l2-6 2.5 2.5V22M8 11l3.5-3 3 2.5 2.5 1.5M11.5 8l-1.8 6.5-2.7 1"/></svg>';
  let entry = null, entryKey = '';
  function paintEntry() {
    if (!entry) return;
    const on = !run && available() && !busy(), key = [lang(), on, !!run].join('|');
    entry.hidden = !!run || !profileId(); entry.disabled = !on;
    if (key === entryKey) return; entryKey = key;
    entry.querySelector('.fw-entry-word').textContent = t('entry');
    const label = on ? t('entryLabel') : t('entryBusy'); entry.setAttribute('aria-label', label); entry.title = label;
  }
  function mountEntry() {
    if (entry) { // the top bar is rebuilt by the game shell (club-interface.js): keep the button in its tools row
      const tools = document.querySelector('header .club-head-tools'); if (tools && entry.parentElement !== tools) tools.prepend(entry); return;
    }
    // the game's top bar: its tools row (Fighter level, Shop, profile), once the club shell has built it (never the header's
    // first child: club-interface.js takes that one as the brand)
    const group = document.querySelector('header .club-head-tools'); if (!group) { setTimeout(mountEntry, 400); return; }
    entry = document.createElement('button'); entry.type = 'button'; entry.id = 'freeWalkBtn'; entry.className = 'fw-entry';
    entry.innerHTML = ICON; const word = el('span', 'fw-entry-word', ''); entry.append(word);
    entry.addEventListener('click', () => { if (!entry.disabled) open({ start: 'resume' }); });
    group.prepend(entry); paintEntry();
    setInterval(() => { mountEntry(); paintEntry(); }, 600);
    const hook = () => { const a = app(); if (!a?.setLanguage) { setTimeout(hook, 500); return; } if (a.setLanguage.fwEntry) return; const prev = a.setLanguage.bind(a); a.setLanguage = function (l) { const r = prev(l); entryKey = ''; paintEntry(); try { run?.relabel?.(); } catch (x) { console.warn('free walk language', x); } return r; }; a.setLanguage.fwEntry = true; };
    hook();
  }
  // a link from outside the game (the old chapter1-roam.html page): index.html#free-walk[=destination] (the story sets the destination)
  function fromHash() {
    const m = /^#free-walk(?:=([a-z_]+))?$/.exec(location.hash); if (!m) return;
    let tries = 0; const go = () => {
      if (++tries > 120) return;
      if (!game()?.home || !engine()?.coach?.root || !profileId()) { setTimeout(go, 500); return; }
      try { history.replaceState(history.state, '', location.pathname + location.search); } catch { /* history unavailable */ }
      open({ start: 'resume' });
    };
    setTimeout(go, 800);
  }
  const boot = () => { mountEntry(); fromHash(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  window.FreeWalk = { open, close, storyDestination, storyNow, storyWalk, storyPlan, willWalk, arrive, available, busy, tickets, snapshot, qa: { walk: qaWalk, set yaw(v) { if (run) { run.yaw = v; run.camYaw = v; } }, view() { if (!run?.town) return null; const g = run.town.grid, s = run.s, y = g.height(s.x, s.z); let best = 0, bd = -1; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; let d = 0; while (d < 80 && g.top(s.x - Math.sin(a) * (d + 1), s.z - Math.cos(a) * (d + 1)) < y + 2.5) d++; if (d > bd) { bd = d; best = a; } } run.yaw = run.camYaw = best; return { yaw: best, open: bd }; }, teleport(x, z) { if (run?.town?.grid.allowed(x, z)) { run.s.x = x; run.s.z = z; return true; } return false; }, get town() { return run?.town || null; }, get camera() { return run?.camera || null; } }, get playing() { return !!run; }, STORY_IDS, PLACE_IDS, MAP_SRC };
})();
