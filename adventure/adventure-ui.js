/* Adventure tab, slice A (GOTR-0008, GOTR-0044): the Gloryland 3D map inside the game dialog.
 * Tap a pin -> the camera flies there -> a place card (chapter, coach, boss and entry level) with
 * buttons that open the matching existing activity. The map script is loaded and built only when the
 * tab opens, and everything (renderer, GPU memory, listeners) is released when the dialog closes. */
(() => {
  const MAP_SRC = './adventure/gloryland-map.js?v=2026111100';
  const L = (en, he, ru) => ({ en, he, ru });
  const copy = {
    en: { loading: 'Building Gloryland…', failed: 'The map could not start on this device.', chapter: 'Chapter', side: 'Side zone', place: 'Chapter 4 place', coach: 'Coach', boss: 'Boss', entry: 'entry level', soon: 'Missions are coming next. For now everything is open: train or fight here freely.', sideSoon: 'Side missions come later. You can still fight a free bout.', train: 'Train', fight: 'Fight', day: 'Day', night: 'Night', all: 'Whole city', hint: 'Tap a place to travel there.', close: 'Back to map', more: 'Details', sq: 'Side quest', sqNote: 'Optional bonus zone' },
    he: { loading: 'בונים את גלורילנד…', failed: 'לא ניתן להפעיל את המפה במכשיר הזה.', chapter: 'פרק', side: 'אזור צדדי', place: 'מקום בפרק 4', coach: 'מאמן', boss: 'בוס', entry: 'רמת כניסה', soon: 'המשימות מגיעות בהמשך. בינתיים הכל פתוח: אפשר להתאמן או להתאגרף כאן בחופשיות.', sideSoon: 'משימות צדדיות יגיעו בהמשך. אפשר כבר עכשיו לקרב חופשי.', train: 'אימון', fight: 'קרב', day: 'יום', night: 'לילה', all: 'כל העיר', hint: 'הקישו על מקום כדי לנסוע אליו.', close: 'חזרה למפה', more: 'פרטים', sq: 'משימת צד', sqNote: 'אזור בונוס אופציונלי' },
    ru: { loading: 'Строим Глориленд…', failed: 'Карта не запускается на этом устройстве.', chapter: 'Глава', side: 'Побочная зона', place: 'Место главы 4', coach: 'Тренер', boss: 'Босс', entry: 'уровень входа', soon: 'Задания появятся следующими. Пока всё открыто: тренируйтесь или деритесь здесь свободно.', sideSoon: 'Побочные задания появятся позже. Свободный бой доступен уже сейчас.', train: 'Тренировка', fight: 'Бой', day: 'День', night: 'Ночь', all: 'Весь город', hint: 'Нажмите на место, чтобы отправиться туда.', close: 'Назад к карте', more: 'Подробнее', sq: 'Побочное задание', sqNote: 'Необязательная бонус-зона' }
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
    let alive = true, renderer = null, scene = null, camera = null, map = null, raf = 0, goal = null, time = store.game()?.adventureTime === 'night' ? 'night' : 'day', last = 0, dirty = true, idleAt = performance.now();
    const cam = { x: 0, z: 0, dist: 280, ...VIEW };
    const portrait = () => stage.clientWidth / Math.max(1, stage.clientHeight) < .9;
    const home = () => portrait() ? { x: 34, z: -14, dist: 250 } : { x: -2, z: 12, dist: 282 };
    function cleanup() {
      alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); stage.__ro?.disconnect();
      clearRoute3d(); if (map) map.dispose(); map = null;
      if (renderer) { renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove(); } renderer = null; scene = null;
    }
    modal.adventureCleanup = cleanup;
    function apply() {
      if (!camera) return; idleAt = performance.now();
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      camera.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.dist, sp * cam.dist, cam.z + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.x, 0, cam.z);
      if (map) { map.focusShadows(cam.x, cam.z - cam.dist * .05, Math.max(26, cam.dist * .62)); renderer.shadowMap.needsUpdate = true; if (scene.fog) { scene.fog.near = cam.dist * .85; scene.fog.far = cam.dist * 2.6 + 120; } }
      dirty = true;
    }
    function clamp() { cam.dist = Math.min(330, Math.max(34, cam.dist)); if (map) { const b = map.bounds; cam.x = Math.min(b.x1, Math.max(b.x0, cam.x)); cam.z = Math.min(b.z1, Math.max(b.z0, cam.z)); } }
    function fly(f) { if (!f) return; if (reduced) { Object.assign(cam, { x: f.x, z: f.z, dist: f.dist }); clamp(); apply(); } else goal = { ...f, t: 0, from: { x: cam.x, z: cam.z, dist: cam.dist } }; }
    function resize() { if (!renderer) return; const W = stage.clientWidth, H = stage.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); for (const p of pins) p.tag._w = 0; apply(); }
    let pins = [];
    const CHAPTER_PIN = { 1: 'oldtown', 2: 'market', 3: 'docks', 4: 'downtown', 5: 'hill' };
    const P = () => window.AdventureProgress, game = () => store.game();
    // Side zones appear (and pulse) once their chapter is reached; the next chapter pin glows after a boss win.
    function pinState(p) {
      const g = game(), A = P(); if (!g || !A) return '';
      const z = A.sideZones.find(q => q.id === p.id); if (z) return A.chapterOpen(g, z.chapter, false) ? ' adv-pulse' : ' adv-hidden';
      const n = +Object.keys(CHAPTER_PIN).find(k => CHAPTER_PIN[k] === p.id) || 0, prev = n > 1 && A.chapterOpen(g, n, false) && A.bossWon(g, A.chapters[n - 2].boss);
      return prev && !A.bossWon(g, A.chapters[n - 1].boss) ? ' adv-nextpin' : '';
    }
    // Route dots from one chapter pin to the next (player moving 1 -> 2), then the next pin is highlighted.
    const flagKey = n => 'gotr.adv.route.' + n;
    const flag = (n, set) => { try { if (set) localStorage.setItem(flagKey(n), '1'); return localStorage.getItem(flagKey(n)) === '1'; } catch { return false; } };
    // Evenly spaced points along a polyline.
    function along(pts, count) {
      const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = seg[seg.length - 1], out = [];
      for (let k = 1; k <= count; k++) { const d = total * k / (count + 1); let i = 1; while (i < seg.length - 1 && seg[i] < d) i++; const f = (d - seg[i - 1]) / ((seg[i] - seg[i - 1]) || 1); out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i][1] + (pts[i][1] - pts[i - 1][1]) * f]); }
      return out;
    }
    let routeTimers = [], routeGroup = null, routeMarks = [];
    // Route markers are real 3D discs on the road (depth-tested: buildings hide them), gold with a dark rim, popping in one by one.
    function clearRoute3d() { if (routeGroup) { scene?.remove(routeGroup); routeGroup.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); } routeGroup = null; routeMarks = []; }
    function playRoute(n, story) {
      const a = map?.places.find(q => q.id === CHAPTER_PIN[n]), b = map?.places.find(q => q.id === CHAPTER_PIN[n + 1]); if (!a || !b || !scene) return false;
      routeTimers.forEach(clearTimeout); routeTimers = []; clearRoute3d(); pins.forEach(q => q.el.classList.remove('adv-nextpin'));
      // along the streets (A* on the road network, preferring streets the default camera can see); a straight line only if the places are not connected
      const path = map.route?.(a.anchor, b.anchor), line = path && path.length > 3 ? path : [[a.anchor.x, a.anchor.z], [b.anchor.x, b.anchor.z]], count = Math.max(8, Math.min(16, Math.round(line.length / 6)));
      routeGroup = new THREE.Group(); const rim = new THREE.MeshBasicMaterial({ color: 0x1a1206 }), gold = new THREE.MeshBasicMaterial({ color: 0xf4c152 });
      const g1 = new THREE.CylinderGeometry(2.1, 2.1, .1, 20), g2 = new THREE.CylinderGeometry(1.5, 1.5, .16, 20);
      const pts = [line[0], ...along(line, count), line[line.length - 1]]; // first and last sit at the pin bases
      for (const [x, z] of pts) { const m = new THREE.Group(); m.add(new THREE.Mesh(g1, rim), new THREE.Mesh(g2, gold)); m.position.set(x, .8, z); m.scale.setScalar(.001); m.visible = false; routeGroup.add(m); routeMarks.push({ m, t0: 0 }); }
      scene.add(routeGroup);
      fly({ x: (a.anchor.x + b.anchor.x) / 2, z: (a.anchor.z + b.anchor.z) / 2, dist: Math.min(300, 90 + a.anchor.distanceTo(b.anchor) * 1.1) });
      const step = reduced ? 0 : 150;
      routeMarks.forEach((d, i) => routeTimers.push(setTimeout(() => { if (!alive) return; d.m.visible = true; d.t0 = performance.now(); if (reduced) d.t0 = -1e9; dirty = true; }, reduced ? 0 : 500 + i * step)));
      routeTimers.push(setTimeout(() => { if (!alive) return; pins.find(q => q.p === b)?.el.classList.add('adv-nextpin'); modal.dataset.route = String(n); modal.dataset.routeDots = String(routeMarks.length); if (story && window.AdventureOldTown) setTimeout(() => { if (!alive) return; AdventureOldTown.titleCard(AdventureOldTown.chapterTitle(n + 1), 2000, () => { if (alive) select(b); }); }, 700); }, reduced ? 0 : 500 + routeMarks.length * step + 150));
      flag(n, true); dirty = true; return true;
    }
    function animateRoute(now) {
      if (!routeMarks.length) return; const base = Math.max(.7, cam.dist / 170);
      for (const d of routeMarks) { if (!d.t0) continue; const k = Math.min(1, (now - d.t0) / 350), pop = k < .6 ? k / .6 * 1.7 : 1.7 - (k - .6) / .4 * .7; d.m.scale.setScalar(Math.max(.001, pop * base)); }
    }
    function checkRoute() { const A = P(), g = game(); if (!A || !g) return; for (let n = 1; n <= 4; n++) if (A.bossWon(g, A.chapters[n - 1].boss) && !flag(n)) { playRoute(n, true); return; } }
    function makePins() {
      pinsEl.replaceChildren(); pins = [];
      for (const p of map.places) {
        const info = PLACES[p.id]; if (!info) continue;
        const b = button('', () => select(p), 'adv-pin adv-' + p.kind + (p.state ? ' adv-' + p.state : '') + pinState(p));
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
    // Compact bottom sheet (GOTR-0055): peek = title, icon facts, chapter progress, mission tiles; tap the handle or a tile to expand.
    const SIDE_SHORT = { fort: L('Fort', 'מבצר', 'Форт'), fair: L('Fair', 'יריד', 'Ярмарка'), cove: L('Cove', 'מפרץ', 'Бухта'), tech: L('Tech Pier', 'מזח', 'Пирс') };
    const COACH_ICON = { pip: '🐰', vix: '🦊', tusk: '🦭', kip: '🦘', tembo: '🐘' };
    function progressBar(chap) {
      const A = P(), g = game(), ms = A.missions.filter(m => m.chapter === chap), stars = ms.reduce((n, m) => n + (g.adventure?.missions[m.id]?.stars || 0), 0), max = ms.length * 3 || 27, boss = A.bossWon(g, A.chapters[chap - 1].boss), units = max + 1;
      const bar = el('div', 'adv-prog'), fillEl = el('i', 'adv-prog-fill'), key = 'gotr.adv.p.' + chap; let old = 0;
      try { old = Math.min(stars + (boss ? 1 : 0), +localStorage.getItem(key) || 0); localStorage.setItem(key, String(stars + (boss ? 1 : 0))); } catch { /* storage is optional */ }
      bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemax', String(max)); bar.setAttribute('aria-valuenow', String(stars));
      for (let k = 1; k <= max / 3; k++) { const m = el('b', 'adv-mark' + (stars >= 3 * k ? ' hit' : '')); m.style.insetInlineStart = (100 * 3 * k / units) + '%'; bar.append(m); }
      const bm = el('b', 'adv-mark adv-mark-boss' + (boss ? ' hit' : ''), '★'); bm.style.insetInlineStart = '100%'; bar.append(fillEl, bm);
      fillEl.style.width = (100 * old / units) + '%'; fillEl.dataset.to = String(100 * (stars + (boss ? 1 : 0)) / units);
      requestAnimationFrame(() => requestAnimationFrame(() => { fillEl.style.width = fillEl.dataset.to + '%'; }));
      const wrap = el('div', 'adv-prog-wrap'); wrap.append(bar, el('span', 'adv-prog-n', stars + '/' + max)); wrap.dataset.stars = String(stars); return wrap;
    }
    function select(p) {
      const info = PLACES[p.id]; if (!info) return;
      fly(p.focus);
      card.replaceChildren(); card.classList.remove('open');
      { const n = +Object.keys(CHAPTER_PIN).find(k => CHAPTER_PIN[k] === p.id) || 0; if (n && n < 5 && P().bossWon(game(), P().chapters[n - 1].boss) && !reduced) { const first = !flag(n); setTimeout(() => { if (alive) playRoute(n, first); }, 700); } }
      const A = P(), g = game(), chap = p.chapter || info.chapterOf || 0, zone = A.sideZones.find(z => z.id === p.id), cinfo = A.chapters[chap - 1];
      const handle = button('', () => card.classList.toggle('open'), 'adv-handle'); handle.setAttribute('aria-label', w.more); handle.setAttribute('aria-expanded', 'false'); handle.append(el('span'));
      card.append(handle);
      const head = el('div', 'adv-card-head');
      head.append(el('span', 'adv-badge', p.kind === 'side' ? '✦' : String(chap || '')));
      const titles = el('div', 'adv-card-titles');
      titles.append(el('h3', '', T(info.name)), el('p', 'adv-kicker', p.kind === 'side' ? `${w.sq} · ${w.chapter} ${zone?.chapter || ''}` : p.kind === 'place' ? w.place : `${w.chapter} ${p.chapter} · ${T(info.sub)}`));
      head.append(titles, button('×', () => { card.hidden = true; }, 'adv-card-close'));
      card.append(head);
      // icons instead of sentences: coach, boss level, stars
      const story = (p.id === 'oldtown' || p.id === 'market') && !!window.AdventureOldTown && !!window.StoryFlow; // GOTR-0069: the quest panel carries progress and level
      if (info.coach && cinfo && !story) {
        const stars = A.missions.filter(m => m.chapter === chap).reduce((n, m) => n + (g.adventure?.missions[m.id]?.stars || 0), 0);
        const d = el('div', 'adv-glance');
        const fact = (icon, text, label) => { const f = el('span', 'adv-fact'); f.append(el('i', '', icon), document.createTextNode(text)); f.title = label; f.setAttribute('aria-label', label); return f; };
        d.append(fact(COACH_ICON[cinfo.coach] || '🐾', T(info.coach).split(/[,·]/)[0], `${w.coach}: ${T(info.coach)}`), fact('🥊', `Lv ${info.level}`, `${w.boss}: ${T(info.boss)} · ${w.entry} ${info.level}`), fact('★', `${stars}/${A.missions.filter(m => m.chapter === chap).length * 3}`, ''));
        card.append(d, progressBar(chap));
      } else if (info.sub && p.kind !== 'chapter') card.append(el('p', 'adv-sub-line', T(info.sub)));
      const town = (p.id === 'oldtown' || p.id === 'market') && window.AdventureOldTown ? AdventureOldTown.render(ctx, { select: id => { const q = map?.places.find(z => z.id === id); if (q) select(q); }, chapter: p.id === 'market' ? 2 : 1, expand: () => { card.classList.add('open'); handle.setAttribute('aria-expanded', 'true'); } }) : null;
      const tiles = el('div', 'adv-tiles');
      if (town?.quest) card.append(town.quest); else if (town) tiles.append(...town.tiles);
      const sideZone = A.sideZones.find(z => z.chapter === chap && A.chapterOpen(g, chap, false)), sp = sideZone && map.places.find(q => q.id === sideZone.id);
      if (sp) { const t = button('', () => select(sp), 'adv-tile adv-tile-side'); t.append(el('i', 'adv-tile-ico', '✦'), el('span', 'adv-tile-name', T(SIDE_SHORT[sp.id] || PLACES[sp.id].name)), el('span', 'adv-tile-state', w.sq)); t.setAttribute('aria-label', `${w.sq}: ${T(PLACES[sp.id].name)}`); tiles.append(t); }
      if (town) { const gl = card.querySelector('.adv-glance'); if (gl && town.goal) card.insertBefore(el('p', 'adv-goal-line', town.goal), gl); if (town.recap) card.append(town.recap); if (town.primary) card.append(town.primary); }
      if (tiles.children.length && !town?.quest) card.append(tiles);
      if (town) card.append(...town.rest);
      if (tiles.children.length && town?.quest) card.append(tiles); else if (p.kind !== 'chapter' || !info.coach) card.append(el('p', 'adv-soon', info.side ? w.sideSoon : w.soon));
      card.classList.toggle('adv-has-town', !!town); modal.classList.toggle('adv-town-open', true);
      const acts = el('div', 'adv-actions');
      if (info.train) acts.append(button(`${w.train} · ${venueName(info.train)}`, () => { change({ type: 'venue', venueId: info.train }); startTraining({ mode: 'pads', play: true }); }, 'game-button adv-go'));
      for (const id of info.arenas || []) acts.append(button(`${w.fight} · ${venueName(id)}`, () => { if (change({ type: 'venue', venueId: id })) startFight({}); }, 'game-button adv-go' + (info.train ? ' adv-alt' : '')));
      card.append(acts); card.hidden = false;
      const fitPeek = () => { const t = card.querySelector('.sf-quest') || card.querySelector('.adv-tiles'); if (!card.classList.contains('open')) card.scrollTop = 0; if (alive) card.style.setProperty('--peek', t ? (t.offsetTop + t.offsetHeight + 4) + 'px' : 'none'); };
      requestAnimationFrame(fitPeek); setTimeout(fitPeek, 300); setTimeout(fitPeek, 1200); document.fonts?.ready?.then(fitPeek);
      new MutationObserver(() => handle.setAttribute('aria-expanded', String(card.classList.contains('open')))).observe(card, { attributes: true, attributeFilter: ['class'] });
    }
    function setTime(t) {
      time = t; dayB.setAttribute('aria-pressed', String(t === 'day')); nightB.setAttribute('aria-pressed', String(t === 'night'));
      if (!renderer) return;
      if (map) map.dispose();
      const g = game(), A = P(), chNow = g && A ? (A.chapters.findIndex(c => !A.bossWon(g, c.boss)) + 1 || 5) : 1, low = (navigator.deviceMemory && navigator.deviceMemory < 4) || /[?&]gfx=low/.test(location.search); // GOTR-0061 city-gfx hook
      map = GlorylandMap.build(scene, { time: time === 'night' ? 'night' : ({ 1: 'morning', 2: 'evening' })[chNow] || 'day', renderer, quality: low ? 'low' : 'high' }); map.setCurrent?.(CHAPTER_PIN[chNow]); modal.dataset.grade = map.time || time; makePins(); apply();
    }
    // input: drag to pan, wheel / pinch to zoom
    const ptrs = new Map(); let pinch0 = 0, dist0 = 0, moved = 0;
    stage.addEventListener('pointerdown', ev => { idleAt = performance.now(); if (ev.target.closest('.adv-pin,.adv-tools')) return; stage.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); goal = null; moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.dist; } });
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
      if (stage.clientWidth && (Math.abs(stage.clientWidth / stage.clientHeight - camera.aspect) > 0.005)) resize(); // never draw a stretched map
      raf = requestAnimationFrame(frame);
      if (!modal.isConnected) { cleanup(); return; }
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      if (goal) { const G = goal, F = G.from, far = Math.hypot(G.x - F.x, G.z - F.z); G.t = Math.min(1, G.t + dt / (1 + Math.min(.6, far / 220))); const k = G.t * G.t * (3 - 2 * G.t); cam.x = F.x + (G.x - F.x) * k; cam.z = F.z + (G.z - F.z) * k; cam.dist = F.dist + (G.dist - F.dist) * k + Math.sin(Math.PI * G.t) * Math.min(36, far * .22); if (G.t >= 1) goal = null; clamp(); apply(); idleAt = now; }
      else if (!reduced && !ptrs.size && now - idleAt > 6000) { cam.yaw = VIEW.yaw + Math.sin((now - idleAt - 6000) * .00016) * .045; const cp = Math.cos(cam.pitch); camera.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.dist, Math.sin(cam.pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.x, 0, cam.z); } // idle drift: camera only, shadows untouched
      if (!reduced) { map.update(dt, camera, renderer); dirty = true; } else if (dirty) map.update(0, camera, renderer);
      animateRoute(performance.now());
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
      // Owner rule: the map is never stretched. Re-fit whenever the map box changes size (sheet expand/collapse, rotation, browser bars).
      if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => resize()); ro.observe(stage); stage.__ro = ro; }
      ctx.onReady?.({ route: playRoute, map, cam, select: id => { const p = map.places.find(q => q.id === id); if (p) select(p); }, pins: () => pins.map(q => q.el) });
      raf = requestAnimationFrame(frame);
      setTimeout(() => { if (alive) checkRoute(); }, 900);
      setTimeout(() => { if (alive) window.AdventureOldTown?.onOpen?.(ctx); }, 400);
    }).catch(() => { status.textContent = w.failed; });
  }
  window.AdventureUI = { render, places: PLACES, copy };
})();
