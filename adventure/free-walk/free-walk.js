/* Free walk (GOTR-0118): walk anywhere in Gloryland, inside the game, with the player's own Fighter (rig, species, street
 * outfit), in the player's language. The town is free-walk-town.js; this file is the mode: the full-screen view on the
 * game's renderer (the engine's demo hook, like the story films), the stick, keys and zoom, the district name, an
 * optional destination with an arrow and the distance, and the way back to the map.
 *
 * Rules (owner 2026-11-23 and the v1.92 roam): walking never starts or completes a story step, never spends coins and never
 * touches the game save; the position is kept in its own key (FreeWalkCore.saveKey(profile)). When the walk was opened from
 * the Chapter 1 card for the current step, arriving at that step's place offers a way back to the quest card (nothing else).
 * The layout is left-to-right in every language (owner 2026-11-23); text elements use dir="auto".
 *
 *   FreeWalk.open({ start?: placeId | 'resume', destination?: targetId, story?: true }) -> Promise<boolean>
 *   FreeWalk.close(how?)   'map' (default) | 'story' | 'quiet'
 *   FreeWalk.storyDestination() -> the Chapter 1 waypoint of the current step, or null
 *   FreeWalk.playing ; FreeWalk.snapshot() (QA)
 * World: metres, x east, z south, y up. */
(() => {
  'use strict';
  const MAP_SRC = './adventure/gloryland-map.js?v=20261123walk1';
  const Core = () => window.FreeWalkCore;
  const TIME_KEY = 'gotr.freewalk.time.v1';
  const STORY_IDS = ['bruno', 'market_stall', 'otto', 'docks_quay'];
  const PLACE_IDS = ['oldtown', 'market', 'docks', 'downtown', 'neon', 'dome', 'hill', 'tech', 'fair', 'cove', 'fort'];
  const PITCH = .46, DIST = 7.6, FOV = 48, YAW0 = .24; // the map's own view direction, behind the Fighter at street level
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
  let ticketBox = null;
  const tickets = () => ticketBox || (ticketBox = Core().storyWalk(() => window.sessionStorage, () => Date.now(), () => Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''), storyNow));
  function timeOfDay() {
    const pick = read(TIME_KEY); if (pick === 'day' || pick === 'night') return pick;
    return game()?.store?.game?.()?.adventureTime === 'night' ? 'night' : 'day';
  }
  function grade(time) { // the map's look for the current chapter (morning / evening light by day), night at night
    if (time === 'night') return 'night';
    try { const g = game()?.store?.game?.(), A = window.AdventureProgress, n = g && A ? (A.chapters.findIndex(c => !A.bossWon(g, c.boss)) + 1 || 5) : 1; return ({ 1: 'morning', 2: 'evening' })[n] || 'day'; } catch { return 'day'; }
  }
  const lowTier = () => (navigator.deviceMemory && navigator.deviceMemory < 4) || /[?&]gfx=low/.test(location.search);

  async function open(opts = {}) {
    if (run) return true;
    const e = engine(), C = Core();
    if (!e?.renderer || !e.coach?.root || !window.FreeWalkTown || !C || e.fightIQDemo) return false;
    if (!profileId()) { game()?.home?.(); return false; }
    game()?.close?.();
    const R = run = { closed: false, opts, e, time: timeOfDay(), zoom: 1, zoomTarget: 1, yaw: YAW0, keys: new Set(), analog: [0, 0], full: 0, poseT: 0, last: { save: 0, hud: -1, guide: -1 }, perf: { n: 0, sum: 0, max: 0, calls: 0, tris: 0 }, destination: null, story: null, arrived: false };
    R.wasPlaying = e.isPlaying; e.isPlaying = false;
    // ---- overlay (left-to-right in every language; each text line dir="auto")
    const d = el('dialog', 'story-scene free-walk'); d.lang = lang(); d.dataset.kind = 'walk';
    const host = el('div', 'story-host'), hud = el('div', 'fw-hud'), title = el('small', 'fw-title', t('title')), zone = el('strong', 'fw-zone', ''), help = el('span', 'fw-help', t('help'));
    hud.append(title, zone, help); setTimeout(() => hud.classList.add('quiet'), 8000); // the rule line, then only the district
    const exit = el('button', 'fw-exit', t('exit')); exit.type = 'button'; exit.setAttribute('aria-label', t('exitLabel')); exit.onclick = () => close('map');
    const timeSeg = el('div', 'fw-time'), dayB = el('button', 'fw-seg', t('day')), nightB = el('button', 'fw-seg', t('night'));
    dayB.type = nightB.type = 'button'; timeSeg.append(dayB, nightB);
    const nav = el('section', 'fw-nav'), label = el('label', 'fw-nav-label', t('walkTo')), select = document.createElement('select'), status = el('div', 'fw-nav-status'), arrow = el('span', 'fw-arrow', '➤'), dist = el('strong', 'fw-dist', '');
    select.className = 'fw-select'; select.id = 'fw-destination'; label.htmlFor = select.id; arrow.setAttribute('aria-hidden', 'true'); arrow.hidden = true; status.append(arrow, dist); nav.append(label, select, status);
    const stick = el('div', 'fw-stick'), thumb = el('i'); stick.append(thumb); stick.setAttribute('role', 'group'); stick.setAttribute('aria-label', t('stick'));
    const zoomBox = el('aside', 'fw-zoom'), plus = el('button', '', '+'), minus = el('button', '', '−'); plus.type = minus.type = 'button'; plus.setAttribute('aria-label', t('zoomIn')); minus.setAttribute('aria-label', t('zoomOut')); zoomBox.append(plus, minus);
    const back = el('button', 'fw-story', t('storyReturn')); back.type = 'button'; back.hidden = true; back.onclick = () => close('story');
    const notice = el('p', 'fw-notice', t('loading')); notice.setAttribute('role', 'status');
    const fade = el('div', 'fw-fade active');
    d.append(host, hud, exit, timeSeg, nav, stick, zoomBox, back, fade, notice); document.body.append(d);
    d.tabIndex = -1; try { d.showModal(); } catch { d.setAttribute('open', ''); } d.focus({ preventScroll: true });
    d.addEventListener('cancel', ev => { ev.preventDefault(); close('map'); });
    Object.assign(R, { d, host, zone, select, arrow, dist, back, notice, fade, stick, thumb, dayB, nightB });
    // destinations: the story places first, then every district of the map
    const story = opts.story ? (opts.destination || storyDestination()) : null; R.story = story;
    // a deliberately marked story place: a one-time ticket (entering its ring opens that step once, through the quest card)
    const arm = target => { if (R.ticket) tickets().cancel(R.ticket.nonce); R.ticket = target ? tickets().arm(target) : null; R.prevD = null; };
    const opt = (v, text) => { const o = document.createElement('option'); o.value = v; o.textContent = text; return o; };
    select.append(opt('', t('none')));
    const g1 = document.createElement('optgroup'); g1.label = t('title'); for (const id of STORY_IDS) g1.append(opt(id, targetName(id)));
    const g2 = document.createElement('optgroup'); g2.label = t('outskirts'); for (const id of PLACE_IDS) g2.append(opt(id, placeName(id)));
    select.append(g1, g2);
    R.destination = opts.destination && (STORY_IDS.includes(opts.destination) || PLACE_IDS.includes(opts.destination)) ? opts.destination : story;
    select.value = R.destination || '';
    select.addEventListener('change', () => { R.destination = select.value || null; R.route = null; R.last.guide = -1; ring(); arm(STORY_IDS.includes(R.destination) ? R.destination : null); });
    if (story && R.destination === story) arm(story); else tickets().clear();
    // input
    const down = ev => {
      if (R.closed) return;
      const k = ev.code;
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'KeyD', 'KeyA', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight'].includes(k)) { if (ev.target === select) return; ev.preventDefault(); R.keys.add(k); }
      else if (k === 'KeyQ' || k === 'KeyE') { ev.preventDefault(); R.keys.add(k); }
      else if (k === 'Equal' || k === 'Minus' || k === 'NumpadAdd' || k === 'NumpadSubtract') { ev.preventDefault(); if (!ev.repeat) zoomBy(k === 'Equal' || k === 'NumpadAdd' ? -.15 : .15); }
    };
    const up = ev => R.keys.delete(ev.code), blur = () => { R.keys.clear(); release(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    const hide = () => { if (document.hidden) { blur(); save(); } };
    document.addEventListener('visibilitychange', hide);
    R.unlisten = () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hide); };
    let stickId = null;
    function release(ev) { if (ev && ev.pointerId !== stickId) return; stickId = null; R.analog = [0, 0]; thumb.style.transform = 'translate(-50%,-50%)'; }
    function point(ev) {
      if (ev.pointerId !== stickId) return; const b = stick.getBoundingClientRect(), r = b.width * .32, dx = ev.clientX - b.left - b.width / 2, dy = ev.clientY - b.top - b.height / 2;
      R.analog = window.StreetWalkPrototype?.stickInput ? window.StreetWalkPrototype.stickInput(dx, dy, r) : (() => { const l = Math.hypot(dx, dy); return l < r * .14 ? [0, 0] : [dx / Math.max(l, r), -dy / Math.max(l, r)]; })();
      const l = Math.max(1, Math.hypot(dx, dy) / r); thumb.style.transform = `translate(calc(-50% + ${dx / l}px),calc(-50% + ${dy / l}px))`;
    }
    stick.addEventListener('pointerdown', ev => { if (stickId !== null || !R.town) return; ev.preventDefault(); stickId = ev.pointerId; stick.setPointerCapture?.(ev.pointerId); point(ev); });
    stick.addEventListener('pointermove', point);
    for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(k, release);
    // drag on the view turns the camera round the Fighter
    let dragId = null, dragX = 0;
    host.addEventListener('pointerdown', ev => { if (dragId !== null) return; dragId = ev.pointerId; dragX = ev.clientX; host.setPointerCapture?.(ev.pointerId); });
    host.addEventListener('pointermove', ev => { if (ev.pointerId !== dragId) return; R.yaw -= (ev.clientX - dragX) * .008; dragX = ev.clientX; });
    for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(k, ev => { if (ev.pointerId === dragId) dragId = null; });
    host.addEventListener('wheel', ev => { ev.preventDefault(); zoomBy(ev.deltaY > 0 ? .1 : -.1); }, { passive: false });
    function zoomBy(a) { R.zoomTarget = Math.max(.6, Math.min(1.7, Math.round((R.zoomTarget + a) * 100) / 100)); plus.disabled = R.zoomTarget <= .6; minus.disabled = R.zoomTarget >= 1.7; }
    plus.onclick = () => zoomBy(-.15); minus.onclick = () => zoomBy(.15);
    const paintTime = () => { dayB.setAttribute('aria-pressed', String(R.time === 'day')); nightB.setAttribute('aria-pressed', String(R.time === 'night')); };
    dayB.onclick = () => setTime('day'); nightB.onclick = () => setTime('night'); paintTime();
    async function setTime(v) { if (v === R.time || R.busy) return; R.time = v; write(TIME_KEY, v); paintTime(); await buildTown(); }

    // ---- the stage: the game's canvas moves into the overlay (as in the films)
    const stage = e.stage || document.getElementById('stageContainer');
    if (stage) { const ph = document.createComment('free walk stage'); stage.before(ph); R.stageMove = { stage, ph, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
    R.oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
    R.camera = new THREE.PerspectiveCamera(FOV, 1, .1, 520);
    R.onLost = ev => { ev.preventDefault?.(); notice.textContent = t('lost'); notice.hidden = false; R.lost = true; };
    e.renderer.domElement.addEventListener('webglcontextlost', R.onLost);
    window.dispatchEvent(new Event('resize'));
    // the Fighter: the player's own rig in the street outfit, mirrored root as in every film (GOTR-0074)
    const c = e.coach; R.rig = c; R.borrow = { parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible, outfit: window.StoryCast?.outfitOf?.(c) };
    // contact shadow under the Fighter
    { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(18,13,9,.85)'); gr.addColorStop(.5, 'rgba(18,13,9,.45)'); gr.addColorStop(1, 'rgba(18,13,9,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      R.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, toneMapped: false })); R.blob.renderOrder = 1; }
    try { await loadMap(); } catch { fail(); return false; }
    if (R.closed) return false;
    const ok = await buildTown();
    if (!ok) { fail(); return false; }
    R.frame = frame; e.fightIQDemo = R;
    return true;

    function fail() { notice.textContent = t('failed'); notice.hidden = false; fade.classList.remove('active'); }
    async function buildTown() {
      R.busy = true; fade.classList.add('active'); notice.textContent = t('loading'); notice.hidden = false; clear();
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      if (R.closed) return false;
      const prev = R.town; R.town = null;
      try {
        if (prev) { prev.scene.remove(c.root, R.blob); if (R.ringMesh) prev.scene.remove(R.ringMesh); prev.dispose(); }
        const t0 = performance.now();
        R.town = window.FreeWalkTown.build({ renderer: e.renderer, time: grade(R.time), quality: lowTier() ? 'low' : 'high', lang: lang() });
        R.buildMs = Math.round(performance.now() - t0);
      } catch (x) { console.warn('free walk', x); R.busy = false; return false; }
      const town = R.town;
      if (!R.s) R.s = startState(town);
      if (!town.grid.allowed(R.s.x, R.s.z)) { const n = town.grid.nearest(R.s.x, R.s.z); if (n) { R.s.x = n.x; R.s.z = n.z; } }
      town.scene.add(c.root, R.blob);
      c.root.visible = true; c.root.rotation.set(0, R.s.ry, 0); c.root.scale.set(-1, 1, 1); c.maneInitialized = false;
      try { window.StoryCast?.outfit?.(c, 'street'); } catch (x) { console.warn('free walk outfit', x); }
      window.DreamPose?.reset?.(c); R.groundY = town.grid.height(R.s.x, R.s.z); R.turn = R.s.ry;
      c.root.position.set(R.s.x, R.groundY, R.s.z);
      R.center = new THREE.Vector3(R.s.x, R.groundY + .9, R.s.z); place(true);
      ring();
      notice.hidden = true; fade.classList.remove('active'); R.busy = false; R.last.hud = -1; R.last.guide = -1; R.route = null;
      return true;
    }
    function clear() { R.keys.clear(); release(); }
  }
  function startState(town) {
    const C = Core(), o = run.opts, id = profileId(), raw = read(C.saveKey(id));
    const at = o.start && o.start !== 'resume' ? (town.places.find(p => p.id === o.start)?.spawn || town.targets[o.start] || null) : null;
    if (at) return { x: at.x, z: at.z, ry: Math.PI, dist: 0, walking: false };
    const legacy = !raw ? C.legacyPlace(read(C.LEGACY_KEY)) : null; // the v1.92 Chapter 1 roam: start in the same district
    const fallback = town.targets[legacy || o.destination || 'oldtown'] || town.places[0].spawn;
    return C.restore(raw, town.grid, { x: fallback.x, z: fallback.z, ry: Math.PI });
  }
  function save() { if (!run?.s || !run.town || run.busy) return; write(Core().saveKey(profileId()), Core().serialize(run.s)); }
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
    const solidAt = (x, y, z) => { for (const [a, b] of [[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6]]) if (Math.max(g.top(x + a, z + b), R.town.canopy?.(x + a, z + b) ?? -1e9) > y) return true; return false; };
    const probe = (yaw, pitch) => { const cp = Math.cos(pitch), sp = Math.sin(pitch); for (let k = 1; k <= 24; k++) { const f = d * k / 24, x = ox + Math.sin(yaw) * cp * f, z = oz + Math.cos(yaw) * cp * f; if (solidAt(x, oy + sp * f - .4, z)) return { k: k * 16 / 24, ground: g.allowed(x, z) }; } return null; };
    // the player's own view first; a wall or stall right behind the Fighter swings the camera a little round instead
    let best = null;
    for (const off of [0, .35, -.35, .7, -.7, 1.05, -1.05]) {
      const yaw = R.yaw + off; let pitch = PITCH, hit = probe(yaw, pitch);
      while (hit && hit.ground && pitch < 1.25) { pitch += .08; hit = probe(yaw, pitch); }
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
      const entered = tickets().entered(R.prevD, straight); R.prevD = straight;
      if (entered) { const t = tickets().consume(R.ticket.nonce); R.ticket = null; if (t) { R.launched = t.step; setTimeout(() => close('quest', t), 0); return; } }
    }
    R.back.hidden = !(R.arrived && R.story && R.destination === R.story);
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
    R.dist.textContent = t('metres', { n: Math.max(1, Math.round(Math.max(straight, Math.min(len, straight * 3)))) });
    const dx = next[0] - R.s.x, dz = next[1] - R.s.z, l = Math.hypot(dx, dz); if (l < .05) { R.arrow.hidden = true; return; }
    const y = R.groundY, A = new THREE.Vector3(R.s.x, y, R.s.z).project(R.camera), B = new THREE.Vector3(R.s.x + dx / l, y, R.s.z + dz / l).project(R.camera);
    R.arrow.style.transform = 'rotate(' + Math.atan2(A.y - B.y, (B.x - A.x) * R.camera.aspect) + 'rad)'; R.arrow.hidden = false;
  }
  function frame(delta) {
    const R = run; if (!R || R.closed || !R.town || R.lost) return;
    const e = R.e, C = Core(), town = R.town, dt = Math.min(Math.max(delta || 0, 0), .05), ms = performance.now();
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
      const [vx, vz] = C.velocity(hIn, vIn, R.camYaw ?? R.yaw, C.SPEED * (brisk ? 1.55 : 1));
      town.grid.move(R.s, vx, vz, dt, town.blocked);
      town.update(dt, R.s, R.camera);
      R.poseT += dt; R.zoom += (R.zoomTarget - R.zoom) * (1 - Math.exp(-dt * 10));
      const floor = town.grid.height(R.s.x, R.s.z), u = 1 - Math.exp(-dt * 12);
      R.groundY += (floor - R.groundY) * u;
      R.turn += Math.atan2(Math.sin(R.s.ry - R.turn), Math.cos(R.s.ry - R.turn)) * (1 - Math.exp(-dt * 10));
      const c = R.rig; c.root.position.set(R.s.x, R.groundY, R.s.z); c.root.rotation.set(0, R.turn, 0);
      R.walkAmt = (R.walkAmt || 0) + ((R.s.walking ? 1 : 0) - (R.walkAmt || 0)) * (1 - Math.exp(-dt * 8));
      if (pose) window.DreamPose?.civil?.(c, { t: R.poseT, dt, dist: R.s.dist, walk: R.walkAmt, ground: (x, z) => town.grid.height(x, z), arms: {}, look: { yaw: 0, pitch: 0 } });
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
    for (let k = 0; k < Math.round(seconds * 30); k++) { ms += 1000 / 30; step(1 / 30, ms, false); }
    R.analog = keep; step(1 / 30, ms + 34, true); return snapshot();
  }
  function close(how = 'map', ticket = null) {
    const R = run; if (!R || R.closed) return; R.closed = true; save(); run = null;
    const e = R.e, c = R.rig;
    try {
      if (e.fightIQDemo === R) e.fightIQDemo = null;
      R.unlisten?.(); e.renderer.domElement.removeEventListener('webglcontextlost', R.onLost);
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
    if (R.ticket) tickets().cancel(R.ticket.nonce);
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
      time: R.time, destination: R.destination, story: R.story, ticket: R.ticket ? R.ticket.step : null, launched: R.launched || null, arrived: R.arrived, storyReturn: !R.back.hidden, distance: R.dist.textContent, yaw: R.camYaw ?? R.yaw, zoom: R.zoom,
      perf: { frames: P.n, meanMs: P.n ? +(P.sum / P.n * 1000).toFixed(1) : null, maxMs: +(P.max * 1000).toFixed(1), calls: P.calls, triangles: P.tris, cpuMs: P.cpu && +P.cpu.toFixed(1), buildMs: R.buildMs },
      town: R.town?.snapshot() || null };
  }
  // a link from outside the game (the old chapter1-roam.html page): index.html#free-walk[=destination]
  function fromHash() {
    const m = /^#free-walk(?:=([a-z_]+))?$/.exec(location.hash); if (!m) return;
    let tries = 0; const go = () => {
      if (++tries > 120) return;
      if (!game()?.home || !engine()?.coach?.root || !profileId()) { setTimeout(go, 500); return; }
      try { history.replaceState(history.state, '', location.pathname + location.search); } catch { /* history unavailable */ }
      const dest = m[1] && Core().STORY_TARGETS && Object.values(Core().STORY_TARGETS).includes(m[1]) ? m[1] : null;
      open({ start: 'resume', destination: dest || undefined }); // a waypoint only: a link never arms a story start
    };
    setTimeout(go, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash, { once: true }); else fromHash();
  window.FreeWalk = { open, close, storyDestination, storyNow, tickets, snapshot, qa: { walk: qaWalk, set yaw(v) { if (run) { run.yaw = v; run.camYaw = v; } }, view() { if (!run?.town) return null; const g = run.town.grid, s = run.s, y = g.height(s.x, s.z); let best = 0, bd = -1; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; let d = 0; while (d < 80 && g.top(s.x - Math.sin(a) * (d + 1), s.z - Math.cos(a) * (d + 1)) < y + 2.5) d++; if (d > bd) { bd = d; best = a; } } run.yaw = run.camYaw = best; return { yaw: best, open: bd }; }, teleport(x, z) { if (run?.town?.grid.allowed(x, z)) { run.s.x = x; run.s.z = z; return true; } return false; }, get town() { return run?.town || null; } }, get playing() { return !!run; }, STORY_IDS, PLACE_IDS, MAP_SRC };
})();
