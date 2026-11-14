/* Player for the Chapter 1 "The Dream" scenes (GOTR-0078 slice 1): the opening film (map dive, bus station, the walk to
 * Bruno's Gym), the gym conversation and Bruno's job offer. Scripts: dream-core.js; sets: dream-sets.js; cast, clothes and
 * bag: story-cast.js; body language and the walk: dream-pose.js. Same technique as story-scenes.js: the engine's own
 * renderer through its demo hook, the stage moved into a full-screen dialog, borrowed rigs handed back exactly as found.
 *
 * DreamScenes.play(id, { onDone(result), outcome?: 'loss' | 'win', reducedMotion?, timeScale?, noMap? }) -> true when it starts
 *   result { id, skipped, outcome?, error? } ; StoryScenes.play forwards these ids here (docs/adventure/DREAM_HOOKS.md)
 * DreamScenes.ids / has(id) / playing / stop() / stats() / debug / seek(t)
 * Beats 5-7 (GOTR-0096, market-core.js): opts.onBuy() -> true when the purchase went through (the scene waits at its buy point
 *   with a Buy button; result.bought), opts.owned (no buy point), opts.price (the {price} in lines; default the heavy bag's price).
 *   Props carried between actors (handbag, reward pouch, the new heavy bag), Fang's jacket-off beat, the old bag on the gym floor.
 * Picture rules (owner): the spoken line is plain text in the bottom bar, nothing covers a character; tap = next line in a
 * conversation; "Skip" always works (the film jumps to the gym door, a conversation ends). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), Core = () => window.DreamCore, Cast = () => window.StoryCast, Pose = () => window.DreamPose;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const W = { en: { skip: 'Skip', next: 'Tap to continue', you: 'Fighter', buy: 'Buy · {p} ◈' }, he: { skip: 'דילוג', next: 'הקישו להמשך', you: 'הלוחם', buy: 'לקנות · {p} ◈' }, ru: { skip: 'Пропустить', next: 'Нажмите, чтобы продолжить', you: 'Боец', buy: 'Купить · {p} ◈' } };
  const lang = () => W[window.app?.lang] ? window.app.lang : 'en';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  let current = null, lastStats = null;
  /* Picture quality of the street film (GOTR-0097): 'high' = real sun shadows (PCF soft, fitted to the shot) and the street life
   * (people, a dog, pigeons); 'low' = contact shadows only, clouds and litter; 'auto' (default) starts high and drops to low
   * when the first second of the film runs below ~30 fps (a phone that cannot keep up). Kept per device. */
  const QKEY = 'gotr.film.quality', QUALITIES = ['auto', 'high', 'low'];
  let quality = 'auto'; try { const q = localStorage.getItem(QKEY); if (QUALITIES.includes(q)) quality = q; } catch { /* private mode */ }
  const BOX = [['jab', .5], ['cross', .58], ['guard', .4], ['jab', .46], ['hook', .6], ['guard', .8]], BOX_T = BOX.reduce((n, x) => n + x[1], 0);

  function speaker(id, e) {
    if (id !== 'fighter') return Cast().names[id]?.[lang()] || id;
    let name = ''; try { name = e.career?.store?.current?.()?.name || ''; } catch { /* no profile */ }
    return name && !/^guest$/i.test(name.trim()) ? name : W[lang()].you;
  }
  const borrow = c => ({ c, parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible });
  function giveBack(b) { const r = b.c.root; r.parent?.remove(r); if (b.parent) b.parent.add(r); r.position.copy(b.pos); r.quaternion.copy(b.q); r.scale.copy(b.scale); r.visible = b.visible; b.c.maneInitialized = false; }

  function play(id, opts = {}) {
    const C = Core(), e = window.app?.engine, done = typeof opts.onDone === 'function' ? opts.onDone : () => {};
    let scene0 = C?.variant(id, opts.outcome); // re-staged once the set is built when the city models are in it (GOTR-0089)
    const fail = error => { setTimeout(() => done({ id, skipped: true, error }), 0); return false; };
    if (!scene0) return fail('unknown scene');
    const price = opts.price ?? window.GameDomain?.gear?.find(x => x.id === 'heavy_bag')?.price ?? 90; if (window.MarketCore) scene0 = window.MarketCore.fill(scene0, price); // GOTR-0096: the reward and the shop name the price
    if (!e?.renderer || !e.coach?.update || !window.StorySets || !Cast() || !Pose()) return fail('engine not ready');
    if (current) current.finish({ skipped: true, replaced: true });
    if (window.StoryScenes?.playing && window.StoryScenes.playing !== id) window.StoryScenes.stop();
    if (e.fightIQDemo) return fail('busy');
    window.DreamSets?.register(); window.MarketSets?.register();
    const reduced = opts.reducedMotion ?? !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, w = W[lang()];
    // ---- overlay: bars, subtitle in the bottom bar, Skip
    const d = el('dialog', 'story-scene dream-scene'); d.dir = lang() === 'he' ? 'rtl' : 'ltr'; d.dataset.kind = 'dream'; d.dataset.tap = String(!!scene0.tap);
    const host = el('div', 'story-host'), busy = el('div', 'story-busy', '…'), fade = el('div', 'dream-fade'), sub = el('div', 'dream-sub'), name = el('strong', 'dream-name'), text = el('p', 'dream-text'), more = el('span', 'dream-more', '▸'), skip = el('button', 'dream-skip', w.skip + ' ▸▸');
    sub.setAttribute('role', 'status'); sub.setAttribute('aria-live', 'polite'); skip.type = 'button'; more.setAttribute('aria-label', w.next); sub.append(name, text, more);
    // GOTR-0096: the purchase in Otto's Corner is confirmed in the scene: a gold button in the bottom bar, under the line
    const buyBtn = el('button', 'dream-buy', w.buy.replace('{p}', price)); buyBtn.type = 'button'; buyBtn.hidden = true;
    Object.assign(buyBtn.style, { position: 'absolute', insetInlineStart: '50%', transform: 'translateX(-50%)', bottom: 'max(10px, env(safe-area-inset-bottom))', minHeight: '44px', padding: '0 22px', border: '0', borderRadius: '22px', background: 'var(--gr-gold,#f4c152)', color: '#16120a', font: 'inherit', fontSize: '16px', fontWeight: '800', letterSpacing: '.02em', cursor: 'pointer', zIndex: '2', touchAction: 'manipulation' });
    if (d.dir === 'rtl') buyBtn.style.transform = 'translateX(50%)';
    d.append(host, el('div', 'story-vignette'), el('div', 'dream-bar dream-bar-top'), el('div', 'dream-bar dream-bar-bottom'), fade, busy, sub, skip, buyBtn); document.body.append(d);
d.tabIndex = -1; try { d.showModal(); } catch { d.setAttribute('open', ''); } d.focus({ preventScroll: true });
    const run = { id, closed: false, t: 0, clock: 0, ack: -1, waiting: false, shot: 0, lineIndex: -1, phase: 'load', mapT: 0, bought: !!opts.owned, buying: false };
    current = run;
    let life = null, proxies = [], castWas = [], shadowWas = null, hi = false, perf = { n: 0, sum: 0 };
    let set = null, scene = null, camera = null, borrowed = [], rigs = {}, stageMove = null, oldFit = null, blobs = [], floorBag = null, map = null, mapScene = null, mapCam = null, lineKey = '', lineAt = 0, ended = false, props = null;
    const look = V(), turn = new Map(), jacketAt = {}; // the time of each actor's jacket-off key (Fang, GOTR-0096)
    for (const [k, a] of Object.entries(scene0.actors || {})) { const j = a.keys.find(q => q.act === 'jacketoff'); if (j) jacketAt[k] = j.t; }
    const finish = (result = {}) => {
      if (run.closed) return; run.closed = true; if (current === run) current = null;
      try { cleanup(); } catch (x) { console.warn('dream', x); }
      d.close?.(); d.remove(); window.removeEventListener('keydown', onKey);
      done({ id, skipped: false, ...(scene0.outcome ? { outcome: scene0.outcome } : {}), ...(scene0.buy ? { bought: run.bought } : {}), ...result });
    };
    run.finish = finish;
    function cleanup() {
      if (e.fightIQDemo === run) e.fightIQDemo = null;
      props?.dispose(); props = null;
      try { life?.dispose(); } catch { /* gone */ } life = null; for (const p of proxies) p.userData.dispose(); proxies = []; for (const [o, v, r] of castWas) { o.castShadow = v; o.receiveShadow = r; } castWas = [];
      if (shadowWas) { Object.assign(e.renderer.shadowMap, shadowWas); shadowWas = null; }
      for (const c of Object.values(rigs)) { Cast().bag(c, 'off'); Cast().outfit(c, 'kit'); if (c.castFight) Cast().market?.wear(c, 'jacket'); Cast().talk(c, 0); Pose().reset(c); c.root.position.y = 0; }
      for (const b of borrowed) giveBack(b); borrowed = [];
      for (const b of blobs) scene?.remove(b.mesh); if (blobs.length) { blobs[0].mesh.geometry.dispose(); blobs[0].mesh.material.map.dispose(); blobs[0].mesh.material.dispose(); } blobs = [];
      if (floorBag) { scene?.remove(floorBag); floorBag.geometry.dispose(); floorBag = null; }
      try { map?.dispose(); } catch { /* already gone */ } map = null; mapScene = null;
      set?.dispose(); set = null;
      if (stageMove) { stageMove.placeholder.replaceWith(stageMove.stage); stageMove.stage.classList.remove('game-preview-live', 'story-live'); stageMove.stage.style.pointerEvents = stageMove.pe; stageMove = null; window.dispatchEvent(new Event('resize')); }
      if (oldFit) { e.fitCameraToModel = oldFit; oldFit = null; }
      e.lastPoseStamp = null; e.lastRenderStamp = null;
    }
    // ---- input: Skip always; tap / Space / Enter = next line in a conversation
    const skipNow = () => { if (run.closed) return; if (id === 'dream_opening' && run.phase !== 'load' && run.t < scene0.duration - 1.3 && !run.skipping) { run.skipping = true; run.phase = 'play'; fade.style.opacity = '0'; run.t = scene0.duration - 1.2; for (const c of Object.values(rigs)) Pose().reset(c); } else finish({ skipped: true }); };
    const advance = () => {
      if (!scene0.tap || run.phase !== 'play') return; const i = run.lineIndex; if (i < 0 || i <= run.ack || !scene0.lines[i].hold) return;
      run.ack = i; run.waiting = false; run.t = Math.max(run.t, i + 1 < scene0.lines.length ? scene0.lines[i + 1].t : scene0.duration);
    };
    const onKey = ev => { if (ev.key === 'Escape') { ev.preventDefault(); finish({ skipped: true }); } else if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); advance(); } };
    window.addEventListener('keydown', onKey);
    d.addEventListener('cancel', ev => { ev.preventDefault(); finish({ skipped: true }); });
    skip.addEventListener('click', ev => { ev.stopPropagation(); skipNow(); }); skip.addEventListener('pointerdown', ev => ev.stopPropagation());
    d.addEventListener('pointerdown', advance);
    buyBtn.addEventListener('pointerdown', ev => ev.stopPropagation());
    buyBtn.addEventListener('click', ev => {
      ev.stopPropagation(); if (run.closed || run.bought || run.buying) return; run.buying = true;
      let ok = false; try { ok = typeof opts.onBuy === 'function' ? !!opts.onBuy() : true; } catch (x) { console.warn('dream buy', x); }
      run.buying = false; buyBtn.hidden = true;
      if (ok) { run.bought = true; run.ack = Math.max(run.ack, scene0.lines.reduce((n, q, i) => q.t <= scene0.buy.t ? i : n, -1)); } else finish({ skipped: true, bought: false });
    });

    // the street waits a few seconds at most for Codex's models (city-assets.js); whatever is not ready stays generated
    const cityWait = scene0.set === 'dream_street' && window.CityAssets ? window.CityAssets.ready().catch(() => null) : null;
    Promise.all([window.StorySets.ready(), cityWait]).then(([, city]) => new Promise(r => requestAnimationFrame(() => r(city)))).then(city => {
      if (run.closed) return;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(36, 1, .1, 260);
      const street = scene0.set === 'dream_street' && !!e.renderer.shadowMap; hi = street && quality !== 'low';
      if (street) { const sm = e.renderer.shadowMap; shadowWas = { enabled: sm.enabled, type: sm.type, autoUpdate: sm.autoUpdate }; if (hi) { sm.enabled = true; sm.type = THREE.PCFSoftShadowMap; } }
      const BB = window.BagBreak, force0 = BB?.force; if (scene0.gymBag && BB) BB.force = scene0.gymBag; // beat 5: the old bag lies on the floor
      try { set = window.StorySets.build(scene0.set, scene, { renderer: e.renderer, shadows: !!e.renderer.shadowMap?.enabled, city }); } finally { if (scene0.gymBag && BB) BB.force = force0; }
      if (street && hi && set.sun) { set.sun.shadow.mapSize.set(2048, 2048); set.sun.shadow.radius = 3; set.sun.shadow.camera.layers.enable(window.StreetLife?.SHADOW_LAYER ?? 1); }
      if (set.objects.city?.bus && C.withCity) scene0 = C.withCity(scene0);
      if (scene0.set === 'dream_gym') tuneInterior(); else if (scene.fog) { scene.fog.near = 34; scene.fog.far = 210; } // the towers down the street stay readable through the haze
      for (const [key, a] of Object.entries(scene0.actors)) {
        const c = a.rig === 'fighter' ? e.coach : Cast().rig(a.rig, e); if (!c) throw Error('rig ' + a.rig);
        borrowed.push(borrow(c)); scene.add(c.root); c.root.visible = true; c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); c.maneInitialized = false; rigs[key] = c; // always the mirrored root (GOTR-0074): a rig taken out of a bout has scale 1 inside the mirrored ring cast and would tear (GOTR-0085) Pose().reset(c);
        if (scene0.outfit?.[key]) Cast().outfit(c, scene0.outfit[key]);
        if (c.castFight) Cast().market?.wear(c, 'jacket'); // Fang starts in his jacket
      }
      if (scene0.carry && window.MarketProps) props = window.MarketProps.create({ scene, set, rigs, carry: scene0.carry });
      if (street && window.StreetLife) { // GOTR-0097: a living street; the characters cast their sun shadow through a light stand-in
        // (fuller than the body, so the body does not receive shadows while it is used: it would shade itself)
        const track = []; for (let tt = 0; tt <= scene0.duration; tt += .1) { const f = C.sample(scene0, tt).actors.fighter; if (f && f.act !== 'off') track.push([tt, f.x, f.z]); }
        try { life = window.StreetLife.build(scene, { level: hi ? 2 : 1, track }); } catch (x) { console.warn('street life', x); life = null; }
        if (hi) for (const c of Object.values(rigs)) { c.root.traverse(o => { if (o.isMesh) { castWas.push([o, o.castShadow, o.receiveShadow]); o.castShadow = false; o.receiveShadow = false; } }); try { proxies.push(window.StreetLife.shadowProxy(c)); } catch (x) { console.warn('shadow stand-in', x); } }
      }
      if (scene0.bag) { floorBag = Cast().duffel(); floorBag.visible = false; floorBag.castShadow = true; scene.add(floorBag); }
      // soft contact shadow under every character (and the bag): long toward the side away from the sun
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(18,13,9,.95)'); gr.addColorStop(.45, 'rgba(18,13,9,.6)'); gr.addColorStop(1, 'rgba(18,13,9,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: e.renderer.shadowMap?.enabled ? .34 : .6, toneMapped: false });
      for (const c of [...Object.values(rigs), ...(floorBag ? [{ root: floorBag, small: true }] : [])]) { const mesh = new THREE.Mesh(blobGeo, blobMat); mesh.renderOrder = 1; scene.add(mesh); blobs.push({ mesh, c }); }
      const stage = e.stage || document.getElementById('stageContainer');
      if (stage) { const placeholder = document.createComment('dream stage'); stage.before(placeholder); stageMove = { stage, placeholder, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
      oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
      run.frame = frame; e.fightIQDemo = run; busy.remove(); window.dispatchEvent(new Event('resize'));
      if (scene0.intro === 'map' && !opts.noMap && !reduced) startMap(); else run.phase = 'play';
    }).catch(x => { console.warn('dream', x); finish({ skipped: true, error: String(x?.message || x) }); });

    /** Indoors: softer sun through the windows, more bounce, no sky fog. */
    function tuneInterior() {
      scene.fog = null; scene.background = new THREE.Color('#2a2420').convertSRGBToLinear();
      set.group.traverse(o => { if (o.isHemisphereLight) { o.intensity = .78; o.color.set(0xfff1dc); o.groundColor.set(0x9a7a5c); } else if (o.isAmbientLight) o.intensity = .2; });
      if (set.sun) { set.sun.intensity = 1.25; set.sun.color.set(0xffe6c2); }
    }
    /** The dive: the city map from high above, falling toward Old Town; a bright haze hides the change to the street. */
    function startMap() {
      try {
        const GM = window.GlorylandMap; mapScene = new THREE.Scene(); mapCam = new THREE.PerspectiveCamera(30, 1, 2, 1600);
        map = GM.build(mapScene, { time: 'morning', renderer: e.renderer, quality: 'low' });
        const p = map.places.find(q => q.id === 'oldtown') || map.places[0]; run.mapTo = { x: p.focus.x, z: p.focus.z }; run.phase = 'map'; run.mapT = 0;
      } catch (x) { console.warn('dream map', x); try { map?.dispose(); } catch { /* ignore */ } map = null; run.phase = 'play'; }
    }
    const MAP_T = 3.4;
    function mapFrame(dt) {
      run.mapT += dt; const k = smooth(run.mapT / MAP_T), kk = k * k, to = run.mapTo, x = 34 + (to.x - 34) * k, z = -14 + (to.z + 14) * k, dist = 250 * Math.pow(12 / 250, kk), pitch = .9 + .38 * kk, yaw = .24 - .5 * k; // GOTR-0089: steepens as it falls, so it ends above the street, never inside a roof
      const size = e.renderer.getSize(new THREE.Vector2()); mapCam.aspect = size.x / Math.max(1, size.y); mapCam.fov = mapCam.aspect < .9 ? 44 : 30; mapCam.updateProjectionMatrix();
      mapCam.position.set(x + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, z + Math.cos(yaw) * Math.cos(pitch) * dist); mapCam.lookAt(x, 0, z);
      if (mapScene.fog) { mapScene.fog.near = dist * .85; mapScene.fog.far = dist * 2.6 + 120; }
      try { map.focusShadows?.(x, z, Math.max(26, dist * .62)); map.update(dt, mapCam, e.renderer); } catch { /* cosmetic */ }
      if (e.renderer.shadowMap?.enabled) e.renderer.shadowMap.needsUpdate = true;
      e.renderer.render(mapScene, mapCam);
      fade.style.opacity = String(smooth((run.mapT - (MAP_T - .5)) / .45));
      if (run.mapT >= MAP_T) { run.phase = 'play'; run.fadeIn = .7; try { map.dispose(); } catch { /* ignore */ } map = null; mapScene = null; }
      const info = e.renderer.info.render; lastStats = { phase: 'map', calls: info.calls, triangles: info.triangles };
    }
    function lens(fovKey) {
      const size = e.renderer.getSize(new THREE.Vector2()), aspect = Math.max(.2, size.x / Math.max(1, size.y));
      let v = Math.min(66, Math.max(36, 2 * Math.atan(.345 / aspect) * 180 / Math.PI)); if (fovKey) v *= fovKey / 36;
      if (camera.aspect !== aspect || Math.abs(camera.fov - v) > .01) { camera.aspect = aspect; camera.fov = v; camera.updateProjectionMatrix(); }
    }
    const headAt = (a, key) => V(a.x, (a.y || 0) + (rigs[key]?.character === 'brick' ? 1.86 : 1.9) - (a.drop || 0), a.z);
    function lookFor(a, key, s) {
      const L = a.look; if (!L) return { yaw: 0, pitch: 0 };
      if (!Array.isArray(L) && typeof L === 'object') return L;
      const from = headAt(a, key), to = typeof L === 'string' ? (s.actors[L] ? headAt(s.actors[L], L) : null) : V(L[0], L[1], L[2]); if (!to) return { yaw: 0, pitch: 0 };
      const dx = to.x - from.x, dz = to.z - from.z; let yaw = Math.atan2(dx, dz) - a.ry; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      if (rigs[key]?.root.scale.x < 0) yaw = -yaw; // a mirrored rig turns its head the other way in its own space
      return { yaw, pitch: Math.atan2(to.y - from.y, Math.hypot(dx, dz)) };
    }
    function frame(delta) {
      if (run.closed) return;
      const dt = Math.min(Math.max(delta || 0, 0), .05) * (opts.timeScale || 1); run.clock += dt;
      if (run.phase === 'map') return mapFrame(dt);
      if (run.fadeIn > 0) { run.fadeIn -= dt; fade.style.opacity = String(clamp(run.fadeIn / .7)); }
      // the timeline: runs on, except that a conversation waits at each line for a tap
      let limit = scene0.duration; run.waiting = false;
      if (scene0.tap) for (let i = run.ack + 1; i < scene0.lines.length; i++) if (scene0.lines[i].hold) { limit = Math.min(limit, scene0.lines[i].t + C.SETTLE); break; }
      const atBuy = !!scene0.buy && !run.bought && scene0.buy.t <= limit; if (atBuy) limit = scene0.buy.t; // the shop waits for the purchase
      run.t = Math.min(run.t + dt, limit); if (scene0.tap && run.t >= limit && limit < scene0.duration && !atBuy) run.waiting = true;
      buyBtn.hidden = !(atBuy && run.t >= limit && !run.closed); sub.style.paddingBottom = buyBtn.hidden ? '' : '52px'; // the line sits above the Buy button
      const s = C.sample(scene0, run.t); run.shot = s.camera.shot; run.lineIndex = s.lineIndex;
      // lines
      const l = s.line, key = l ? s.lineIndex + '|' + lang() : '';
      if (key !== lineKey) { lineKey = key; lineAt = run.clock; sub.dataset.who = l ? l.who : ''; name.textContent = l ? speaker(l.who, e) : ''; text.textContent = l ? l.text[lang()] || l.text.en : ''; sub.classList.remove('in'); if (l) { void sub.offsetWidth; sub.classList.add('in'); } }
      sub.dataset.wait = String(run.waiting);
      const talking = l && run.clock - lineAt < Math.min(3, .6 + (l.text[lang()] || l.text.en).length * .055) ? l.who : null;
      // actors
      for (const [k, a] of Object.entries(s.actors)) {
        const c = rigs[k]; if (!c) continue; c.root.visible = a.act !== 'off'; if (!c.root.visible) continue;
        // turn in place: the body comes round over a few steps of time instead of snapping to the new direction
        let ry = a.ry; const prev = turn.get(c); if (prev != null && dt > 0) { let d = a.ry - prev; d = Math.atan2(Math.sin(d), Math.cos(d)); ry = prev + d * (1 - Math.exp(-dt * (a.walking ? 9 : 5))); } turn.set(c, ry);
        c.root.position.set(a.x, a.y || 0, a.z); c.root.rotation.set(0, ry, 0); c.root.updateMatrixWorld(true);
        if (a.act === 'box' || a.act === 'guard') {
          let u = (run.clock % BOX_T), move = 'guard', ph = 0; if (a.act === 'box') for (const [m, dur] of BOX) { if (u < dur) { move = m; ph = u / dur; break; } u -= dur; }
          if (move === 'guard') c.update(run.clock, 'guard', 'one_two', { simulationTime: run.clock, keepFaceClear: true, guardCover: 1 }); else c.update(ph * 1.22, move, 'one_two', { simulationTime: run.clock, keepFaceClear: true, guardCover: 1, power: 1.15, recoil: 0, advance: 0, contactDrive: 0 });
          Pose().reset(c);
        } else if (a.act !== 'jacketoff' && c.castFight && jacketAt[k] != null && Cast().market) { // before / after Fang's jacket beat, whatever the playback jumped over
          const J = window.MarketCore?.JACKET_T || 2.2; if (run.t >= jacketAt[k] + J) { if (c.castWear !== 'fight' || !c.castJacketGround?.visible) Cast().market.jacketOff(c, 1); } else if (run.t < jacketAt[k] && c.castWear !== 'jacket') Cast().market.wear(c, 'jacket');
          Pose().civil(c, { t: run.clock, dt, dist: a.dist, walk: a.walking ? 1 : 0, arms: a.arms || {}, reach: props?.reach(k, run.t), look: lookFor(a, k, s), lean: a.lean || 0, drop: a.drop || 0, talk: talking === k ? 1 : 0, listen: talking && talking !== k ? 1 : 0, nod: 0 });
        } else if (a.act === 'jacketoff' && Cast().market?.jacketOff) {
          const u = clamp(a.actT / (window.MarketCore?.JACKET_T || 2.2)), p = Cast().market.jacketOff(c, u) || {}; // Fang, before the street fight
          Pose().civil(c, { t: run.clock, dt, dist: a.dist, walk: 0, arms: p.arms || {}, look: p.look || lookFor(a, k, s), lean: p.lean || 0, talk: talking === k ? 1 : 0, listen: talking && talking !== k ? 1 : 0, nod: 0 });
        } else {
          const tired = a.act === 'tired';
          Pose().civil(c, { t: run.clock, dt, dist: a.dist, ground: scene0.ground ? (gx, gz) => C.groundAt(scene0, gx, gz, run.t) : null, walk: a.walking ? 1 : 0, arms: a.arms || {}, reach: props?.reach(k, run.t), look: lookFor(a, k, s), lean: (a.lean || 0) + (tired ? .03 * Math.sin(run.clock * 3.4) : 0), drop: a.drop || 0, talk: talking === k ? 1 : 0, listen: talking && talking !== k ? 1 : 0, nod: 0 });
        }
      }
      // props, bag
      props?.frame(run.t, dt);
      const o = set.objects; if (o.bus && s.props.bus) o.bus.position.x = s.props.bus[0];
      if (o.doors && s.props.doors) for (const m of o.doors) m.position.x = m.userData.shut + (m.userData.open - m.userData.shut) * smooth(s.props.doors[0]);
      if (s.bag && rigs.fighter) { Cast().bag(rigs.fighter, s.bag.on === 'shoulder' && rigs.fighter.root.visible ? 'shoulder' : 'off'); if (floorBag) { floorBag.visible = s.bag.on === 'floor'; if (floorBag.visible) { floorBag.position.set(s.bag.at[0], .135, s.bag.at[1]); floorBag.rotation.y = s.bag.at[2] || 0; } } }
      // camera
      lens(s.camera.fov); camera.position.fromArray(s.camera.pos); look.fromArray(s.camera.look); camera.lookAt(look);
      if (hi && set.sun) { // the sun's shadow box covers what this shot sees near the camera: between the lens and the subject
        const d = Math.hypot(look.x - camera.position.x, look.z - camera.position.z), k = Math.min(1, 9 / Math.max(1e-3, d)) * .55, r = Math.max(7, Math.min(18, d * .55 + 4)), sc = set.sun.shadow.camera;
        set.focus(camera.position.x + (look.x - camera.position.x) * k, camera.position.z + (look.z - camera.position.z) * k, r);
        if (Math.abs(sc.right - r) > r * .15) { sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix(); }
      } else set.focus(look.x, look.z);
      if (life) { const f = rigs.fighter?.root; life.update(dt, run.t, f && f.visible ? f.position : null); }
      if (quality === 'auto' && hi && run.phase === 'play' && perf.n < 60) { perf.n++; if (perf.n > 12) perf.sum += Math.max(0, delta || 0); if (perf.n === 60 && perf.sum / 48 > 1 / 30) lowQuality(); }
      o.city?.frame(s, camera); // GOTR-0089: model bus wheels and doors, distance detail
      for (const b of blobs) { const r = b.c.root, small = b.c.small; b.mesh.visible = r.visible; b.mesh.position.set(r.position.x - .16, (small ? 0 : r.position.y) + .014, r.position.z - .2); b.mesh.rotation.y = .7; b.mesh.scale.set(small ? .95 : 1.75, 1, small ? .6 : 1.05); } // shadows lie on the ground the actor stands on (bus floor, road)
      if (e.renderer.shadowMap?.enabled) e.renderer.shadowMap.needsUpdate = true;
      e.renderer.render(scene, camera);
      const info = e.renderer.info.render; lastStats = { phase: 'play', calls: info.calls, triangles: info.triangles, set: set.stats(), shot: run.shot, quality: run.quality || quality, shadows: !!(hi && set.sun?.castShadow), ...(life ? { life: life.stats() } : {}), ...(o.city ? { city: o.city.stats() } : {}) };
      if (s.done && !ended) { ended = true; setTimeout(() => finish({ skipped: !!run.skipping }), 250); }
    }
    /** This device cannot keep up: contact shadows only, no street people and birds (clouds and litter stay). */
    function lowQuality() { hi = false; if (set?.sun) set.sun.castShadow = false; e.renderer.shadowMap.enabled = false; life?.level(1); for (const b of blobs) b.mesh.material.opacity = .6; run.quality = 'low (auto)'; }
    Object.defineProperty(run, 'rigs', { get: () => rigs }); Object.defineProperty(run, 'set', { get: () => set });
    run.seek = t => { turn.clear(); run.t = clamp(t, 0, scene0.duration); run.ack = scene0.lines.reduce((n, q, i) => q.t + C.SETTLE < run.t ? i : n, -1); if (run.phase === 'map') { run.phase = 'play'; fade.style.opacity = '0'; try { map?.dispose(); } catch { /* ignore */ } map = null; } for (const c of Object.values(rigs)) Pose().reset(c); };
    return true;
  }

  window.DreamScenes = {
    play, has: id => !!Core()?.scenes[id],
    get ids() { return Core()?.ids || []; },
    get playing() { return current ? current.id : null; },
    stop() { current?.finish({ skipped: true }); },
    stats: () => lastStats,
    /** Street film picture quality: 'auto' | 'high' | 'low' (kept per device); no argument = the current setting. */
    quality(q) { if (QUALITIES.includes(q)) { quality = q; try { localStorage.setItem(QKEY, q); } catch { /* private mode */ } } return quality; },
    seek(t) { current?.seek?.(t); },
    get debug() { return current; }
  };
})();
