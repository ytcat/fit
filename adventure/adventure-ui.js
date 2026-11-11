/* Adventure tab, slice A (GOTR-0008, GOTR-0044): the Gloryland 3D map inside the game dialog.
 * Tap a pin -> the camera flies there -> a place card (chapter, coach, boss and entry level) with
 * buttons that open the matching existing activity. The map script is loaded and built only when the
 * tab opens, and everything (renderer, GPU memory, listeners) is released when the dialog closes. */
(() => {
  const MAP_SRC = './adventure/gloryland-map.js?v=2026111100';
  const L = (en, he, ru) => ({ en, he, ru });
  const copy = {
    en: { loading: 'Building Gloryland…', failed: 'The map could not start on this device.', chapter: 'Chapter', side: 'Side zone', place: 'Chapter 4 place', coach: 'Coach', boss: 'Boss', entry: 'entry level', soon: 'Missions are coming next. For now everything is open: train or fight here freely.', sideSoon: 'Side missions come later. You can still fight a free bout.', train: 'Train', fight: 'Fight', day: 'Day', night: 'Night', all: 'Whole city', hint: 'Tap a place to travel there.', close: 'Back to map' },
    he: { loading: 'בונים את גלורילנד…', failed: 'לא ניתן להפעיל את המפה במכשיר הזה.', chapter: 'פרק', side: 'אזור צדדי', place: 'מקום בפרק 4', coach: 'מאמן', boss: 'בוס', entry: 'רמת כניסה', soon: 'המשימות מגיעות בהמשך. בינתיים הכל פתוח: אפשר להתאמן או להתאגרף כאן בחופשיות.', sideSoon: 'משימות צדדיות יגיעו בהמשך. אפשר כבר עכשיו לקרב חופשי.', train: 'אימון', fight: 'קרב', day: 'יום', night: 'לילה', all: 'כל העיר', hint: 'הקישו על מקום כדי לנסוע אליו.', close: 'חזרה למפה' },
    ru: { loading: 'Строим Глориленд…', failed: 'Карта не запускается на этом устройстве.', chapter: 'Глава', side: 'Побочная зона', place: 'Место главы 4', coach: 'Тренер', boss: 'Босс', entry: 'уровень входа', soon: 'Задания появятся следующими. Пока всё открыто: тренируйтесь или деритесь здесь свободно.', sideSoon: 'Побочные задания появятся позже. Свободный бой доступен уже сейчас.', train: 'Тренировка', fight: 'Бой', day: 'День', night: 'Ночь', all: 'Весь город', hint: 'Нажмите на место, чтобы отправиться туда.', close: 'Назад к карте' }
  };
  // Content from the approved design (docs/adventure/gloryland-design.html). Bosses are not built yet.
  const PLACES = {
    oldtown: { name: L('Old Town', 'העיר העתיקה', 'Старый город'), sub: L('Home Gym · morning', 'אולם הבית · בוקר', 'Домашний зал · утро'), coach: L('Coach Pip, rabbit · basics and guard', 'המאמן פיפ, ארנב · יסודות ושמירה', 'Тренер Пип, кролик · основы и защита'), boss: L('Brick, beaver gym bully', 'בריק, הבונה בריון האולם', 'Брик, бобр-задира из зала'), level: 5, train: 'default' },
    market: { name: L('Market Row', 'שדרת השוק', 'Рыночный ряд'), sub: L('Street fights · evening', 'קרבות רחוב · ערב', 'Уличные бои · вечер'), coach: L('Vix, fox · footwork and slipping', 'ויקס, שועלה · עבודת רגליים והתחמקויות', 'Викс, лиса · работа ног и уклоны'), boss: L('King Hyena, leader of the crew', 'מלך הצבועים, ראש החבורה', 'Король Гиен, главарь банды'), level: 12, arenas: ['street'] },
    docks: { name: L('The Docks', 'הנמל', 'Доки'), sub: L('The Basement · Dockside Hangar · night', 'המרתף · האנגר הנמל · לילה', 'Подвал · Портовый ангар · ночь'), coach: L('Tusk, retired walrus brawler · power punching', 'טאסק, סוס ים מתאגרף בדימוס · אגרופי עוצמה', 'Таск, морж-боец на пенсии · сильные удары'), boss: L('The Iron Bull', 'השור מברזל', 'Железный Бык'), level: 20, arenas: ['underground', 'docks'] },
    downtown: { name: L('Downtown', 'מרכז העיר', 'Центр'), sub: L('Boxing Club · City Sports Hall', 'מועדון האגרוף · היכל הספורט העירוני', 'Боксёрский клуб · Городской спортзал'), coach: L('Kip, kangaroo · technique and combos', 'קיפ, קנגורו · טכניקה ושילובים', 'Кип, кенгуру · техника и комбинации'), boss: L('Onyx, panther city champion', 'אוניקס, פנתר אלוף העיר', 'Оникс, пантера, чемпион города'), level: 30, arenas: ['boxing_club', 'regional'] },
    neon: { name: L('Neon Strip', 'רצועת הניאון', 'Неоновая набережная'), sub: L('Beach nightlife', 'חיי לילה על החוף', 'Ночная жизнь на пляже'), chapterOf: 4, arenas: ['neon_strip'] },
    dome: { name: L('Harbor Dome', 'כיפת הנמל', 'Купол гавани'), sub: L('In the bay', 'במפרץ', 'В бухте'), chapterOf: 4, arenas: ['harbor_dome'] },
    hill: { name: L('Glory Hill', 'גבעת התהילה', 'Холм славы'), sub: L('Championship Arena · stadium lights', 'זירת האליפות · אורות האצטדיון', 'Арена чемпионата · огни стадиона'), coach: L('Tembo, elephant · ring strategy', 'טמבו, פיל · אסטרטגיה בזירה', 'Тембо, слон · тактика ринга'), boss: L('Blaze, tiger world champion', 'בלייז, נמר אלוף העולם', 'Блейз, тигр, чемпион мира'), level: 40, arenas: ['championship'] },
    tech: { name: L('Tech Pier', 'מזח הטכנולוגיה', 'Технопирс'), sub: L('Sparring robots and gadget gloves', 'רובוטים לספרינג וכפפות גאדג׳טים', 'Роботы для спарринга и гаджет-перчатки'), side: true, arenas: ['default'] },
    fair: { name: L('Midnight Fairground', 'יריד חצות', 'Полуночная ярмарка'), sub: L('Spooky fights after dark', 'קרבות מפחידים אחרי החשכה', 'Жуткие бои после заката'), side: true, arenas: ['default'] },
    cove: { name: L('Pirate Cove', 'מפרץ הפיראטים', 'Пиратская бухта'), sub: L('A fight on a rocking deck', 'קרב על סיפון מתנדנד', 'Бой на качающейся палубе'), side: true, arenas: ['default'] },
    fort: { name: L('Old Fort', 'המבצר העתיק', 'Старый форт'), sub: L('Armour, a dragon mascot, jousting footwork', 'שריון, קמע דרקון ועבודת רגליים של אבירים', 'Доспехи, дракон-талисман, рыцарская работа ног'), side: true, arenas: ['default'] }
  };
  let loader = null;
  function loadMap() {
    if (window.GlorylandMap) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = MAP_SRC; s.onload = () => resolve(); s.onerror = () => { loader = null; reject(Error('map script')); }; document.head.append(s); });
    return loader;
  }
  const VIEW = { yaw: .24, pitch: .9 };
  function render(ctx) {
    const { modal, store, app, el, button, change, startFight, startTraining } = ctx;
    const lang = copy[app.lang] ? app.lang : 'en', w = copy[lang], T = o => o ? (o[lang] || o.en) : '';
    const venueName = id => window.GameVenues?.catalog?.find(v => v.id === id)?.names?.[lang] || id;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    modal.classList.add('adv-dialog');
    const stage = el('div', 'adv-stage'), status = el('p', 'adv-status', w.loading), pinsEl = el('div', 'adv-pins'), card = el('section', 'adv-card');
    card.hidden = true; card.setAttribute('aria-live', 'polite');
    const tools = el('div', 'adv-tools'), seg = el('div', 'adv-seg'), dayB = button(w.day, () => setTime('day'), 'adv-seg-b'), nightB = button(w.night, () => setTime('night'), 'adv-seg-b'), allB = button(w.all, () => { card.hidden = true; fly(home()); }, 'adv-chip');
    seg.append(dayB, nightB); tools.append(seg, allB);
    stage.append(status, pinsEl, tools);
    modal.append(stage, card, el('p', 'adv-hint', w.hint));
    let alive = true, renderer = null, scene = null, camera = null, map = null, raf = 0, goal = null, time = store.game()?.adventureTime === 'night' ? 'night' : 'day', last = 0, dirty = true;
    const cam = { x: 0, z: 0, dist: 280, ...VIEW };
    const portrait = () => stage.clientWidth / Math.max(1, stage.clientHeight) < .9;
    const home = () => portrait() ? { x: 34, z: -14, dist: 250 } : { x: -2, z: 12, dist: 282 };
    function cleanup() {
      alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
      if (map) map.dispose(); map = null;
      if (renderer) { renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove(); } renderer = null; scene = null;
    }
    modal.adventureCleanup = cleanup;
    function apply() {
      if (!camera) return;
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      camera.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.dist, sp * cam.dist, cam.z + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.x, 0, cam.z);
      if (map) { map.focusShadows(cam.x, cam.z - cam.dist * .05, Math.max(26, cam.dist * .62)); renderer.shadowMap.needsUpdate = true; if (scene.fog) { scene.fog.near = cam.dist * .85; scene.fog.far = cam.dist * 2.6 + 120; } }
      dirty = true;
    }
    function clamp() { cam.dist = Math.min(330, Math.max(34, cam.dist)); if (map) { const b = map.bounds; cam.x = Math.min(b.x1, Math.max(b.x0, cam.x)); cam.z = Math.min(b.z1, Math.max(b.z0, cam.z)); } }
    function fly(f) { if (!f) return; if (reduced) { Object.assign(cam, { x: f.x, z: f.z, dist: f.dist }); clamp(); apply(); } else goal = { ...f }; }
    function resize() { if (!renderer) return; const W = stage.clientWidth, H = stage.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); for (const p of pins) p.tag._w = 0; apply(); }
    let pins = [];
    function makePins() {
      pinsEl.replaceChildren(); pins = [];
      for (const p of map.places) {
        const info = PLACES[p.id]; if (!info) continue;
        const b = button('', () => select(p), 'adv-pin adv-' + p.kind + (p.state ? ' adv-' + p.state : ''));
        const tag = el('span', 'adv-tag'), badge = el('span', 'adv-badge', p.kind === 'side' ? '✦' : String(p.chapter || info.chapterOf || '')), txt = el('span', 'adv-txt');
        txt.append(el('span', 'adv-name', T(info.name)));
        if (p.kind === 'chapter') txt.append(el('span', 'adv-sub', T(info.sub)));
        tag.append(badge, txt); b.append(tag, el('span', 'adv-stem'), el('span', 'adv-dot'));
        b.setAttribute('aria-label', T(info.name)); b.dataset.place = p.id;
        pinsEl.append(b); pins.push({ p, el: b, tag });
      }
    }
    const v3 = window.THREE ? new THREE.Vector3() : null;
    function placePins() {
      const W = stage.clientWidth, H = stage.clientHeight;
      for (const { p, el: b, tag } of pins) {
        v3.copy(p.anchor).project(camera);
        const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
        b.style.display = vis ? '' : 'none'; if (!vis) continue;
        const sx = (v3.x + 1) / 2 * W, sy = (1 - v3.y) / 2 * H;
        b.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-100%)`;
        const half = (tag._w || (tag._w = tag.offsetWidth)) / 2, shift = Math.min(0, W - 6 - (sx + half)) + Math.max(0, 6 - (sx - half));
        tag.style.transform = shift ? `translateX(${shift.toFixed(1)}px)` : '';
      }
    }
    function select(p) {
      const info = PLACES[p.id]; if (!info) return;
      fly(p.focus);
      card.replaceChildren();
      const head = el('div', 'adv-card-head');
      head.append(el('span', 'adv-badge', p.kind === 'side' ? '✦' : String(p.chapter || info.chapterOf || '')));
      const titles = el('div', 'adv-card-titles');
      titles.append(el('h3', '', T(info.name)), el('p', 'adv-kicker', p.kind === 'side' ? w.side : p.kind === 'place' ? w.place : `${w.chapter} ${p.chapter} · ${T(info.sub)}`));
      head.append(titles, button('×', () => { card.hidden = true; }, 'adv-card-close'));
      card.append(head);
      if (info.coach) { const d = el('dl', 'adv-facts'); d.append(el('dt', '', w.coach), el('dd', '', T(info.coach)), el('dt', '', w.boss), el('dd', '', `${T(info.boss)} · ${w.entry} ${info.level}`)); card.append(d); }
      else if (info.sub && p.kind !== 'chapter') card.append(el('p', 'adv-sub-line', T(info.sub)));
      const town = p.id === 'oldtown' && window.AdventureOldTown ? AdventureOldTown.render(ctx) : null;
      if (town) card.append(town); else card.append(el('p', 'adv-soon', info.side ? w.sideSoon : w.soon));
      card.classList.toggle('adv-has-town', !!town); modal.classList.toggle('adv-town-open', !!town);
      const acts = el('div', 'adv-actions');
      if (info.train) acts.append(button(`${w.train} · ${venueName(info.train)}`, () => { change({ type: 'venue', venueId: info.train }); startTraining({ mode: 'pads', play: true }); }, 'game-button adv-go'));
      for (const id of info.arenas || []) acts.append(button(`${w.fight} · ${venueName(id)}`, () => { if (change({ type: 'venue', venueId: id })) startFight({}); }, 'game-button adv-go' + (info.train ? ' adv-alt' : '')));
      card.append(acts); card.hidden = false;
      acts.firstChild?.focus({ preventScroll: true });
    }
    function setTime(t) {
      time = t; dayB.setAttribute('aria-pressed', String(t === 'day')); nightB.setAttribute('aria-pressed', String(t === 'night'));
      if (!renderer) return;
      if (map) map.dispose();
      map = GlorylandMap.build(scene, { time, renderer, shadowSize: 2048 }); makePins(); apply();
    }
    // input: drag to pan, wheel / pinch to zoom
    const ptrs = new Map(); let pinch0 = 0, dist0 = 0, moved = 0;
    stage.addEventListener('pointerdown', ev => { if (ev.target.closest('.adv-pin,.adv-tools')) return; stage.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); goal = null; moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.dist; } });
    stage.addEventListener('pointermove', ev => {
      const q = ptrs.get(ev.pointerId); if (!q || !camera) return;
      const dx = ev.clientX - q.x, dy = ev.clientY - q.y; q.x = ev.clientX; q.y = ev.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 1) { const k = cam.dist * 2 * Math.tan(camera.fov * Math.PI / 360) / stage.clientHeight, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); cam.x -= (dx * c + dy * s / Math.sin(cam.pitch)) * k; cam.z -= (-dx * s + dy * c / Math.sin(cam.pitch)) * k; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.dist = dist0 * pinch0 / d; }
      clamp(); apply();
    });
    const up = ev => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch0 = 0; };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', ev => { ev.preventDefault(); cam.dist *= Math.exp(ev.deltaY * .0012); clamp(); apply(); }, { passive: false });
    function frame(now) {
      if (!alive || !renderer) return;
      raf = requestAnimationFrame(frame);
      if (!modal.isConnected) { cleanup(); return; }
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      if (goal) { const k = 1 - Math.exp(-dt * 4); cam.x += (goal.x - cam.x) * k; cam.z += (goal.z - cam.z) * k; cam.dist += (goal.dist - cam.dist) * k; if (Math.abs(goal.dist - cam.dist) < .3 && Math.abs(goal.x - cam.x) < .3) goal = null; apply(); }
      if (!reduced) { map.update(dt, camera, renderer); dirty = true; } else if (dirty) map.update(0, camera, renderer);
      if (dirty) { renderer.render(scene, camera); placePins(); dirty = false; }
    }
    loadMap().then(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)))).then(() => {
      if (!alive) return;
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
      renderer.domElement.className = 'adv-canvas'; stage.prepend(renderer.domElement);
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 2, 1600);
      Object.assign(cam, home());
      setTime(time); resize(); status.remove();
      window.addEventListener('resize', resize);
      ctx.onReady?.({ map, cam, select: id => { const p = map.places.find(q => q.id === id); if (p) select(p); }, pins: () => pins.map(q => q.el) });
      raf = requestAnimationFrame(frame);
    }).catch(() => { status.textContent = w.failed; });
  }
  window.AdventureUI = { render, places: PLACES, copy };
})();
