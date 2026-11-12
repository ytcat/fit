/* GOTR-0063: one round "modes" button on the side of the game view instead of the permanent Train / Fight / Adventure tab row.
 * Tapping it opens a small stack of icon buttons below it: Adventure (home map), Training (station picker), Fight (fight setup),
 * Rivals & Cup. Labels show on first use, on long-press and on desktop hover; a tap outside collapses the stack.
 * The Adventure home itself is the game shell's adventure dialog (game-shell.js: open('adventure') / home()). */
(() => {
  const copy = {
    en: { modes: 'Modes', adventure: 'Adventure', train: 'Training', fight: 'Fight', world: 'Rivals & Cup', learn: 'Fight Academy', tools: 'Training tools' },
    he: { modes: 'מצבים', adventure: 'הרפתקה', train: 'אימון', fight: 'קרב', world: 'יריבים וגביע', learn: 'אקדמיית הקרב', tools: 'כלי אימון' },
    ru: { modes: 'Режимы', adventure: 'Приключение', train: 'Тренировка', fight: 'Бой', world: 'Соперники и кубок', learn: 'Академия боя', tools: 'Инструменты' }
  };
  // GOTR-0071: plain-text line on the stage for the timed round (no box): what started, the seconds left, how to stop, the result.
  // Jab, Cross, Hook, Uppercut, Guard, Combo and Burst stay in Latin script in every language.
  const RC = {
    en: { round: '{n}-second round', left: '{s} s left', mitts: 'Land as many clean punches on the mitts as you can. Use the punch buttons.', play: 'Land as many clean punches as you can. Use the punch buttons.', auto: 'Auto: your Fighter boxes by itself. Tap Play to throw the punches yourself.', rope: 'Keep skipping until the bell.', stop: 'Tap the timer again to stop.', over: 'Round over', stopped: 'Round stopped', hits: '{n} clean hits', jumps: '{n} jumps', again: 'Again' },
    he: { round: 'סיבוב של {n} שניות', left: 'נותרו {s} שנ׳', mitts: 'הנחיתו כמה שיותר אגרופים נקיים על כפפות המאמן. השתמשו בכפתורי האגרופים.', play: 'הנחיתו כמה שיותר אגרופים נקיים. השתמשו בכפתורי האגרופים.', auto: 'אוטומטי: המתאגרף מתאגרף בעצמו. הקישו „לשחק” כדי להכות בעצמכם.', rope: 'המשיכו לקפוץ עד הפעמון.', stop: 'הקישו שוב על השעון כדי לעצור.', over: 'הסיבוב הסתיים', stopped: 'הסיבוב נעצר', hits: '{n} פגיעות נקיות', jumps: '{n} קפיצות', again: 'שוב' },
    ru: { round: 'Раунд {n} секунд', left: 'осталось {s} с', mitts: 'Нанесите как можно больше точных ударов по лапам. Используйте кнопки ударов.', play: 'Нанесите как можно больше точных ударов. Используйте кнопки ударов.', auto: 'Авто: боец боксирует сам. Нажмите «Играть», чтобы бить самому.', rope: 'Прыгайте до гонга.', stop: 'Нажмите на таймер ещё раз, чтобы остановить.', over: 'Раунд окончен', stopped: 'Раунд остановлен', hits: 'точных ударов: {n}', jumps: 'прыжков: {n}', again: 'Ещё раз' }
  };
  const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const P = {
    timer: '<circle cx="12" cy="14" r="7"/><path d="M12 14v-3.5M10 3h4M12 3v4M18.5 7.5 20 6"/>',
    adventure: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
    train: '<path d="M12 2v3"/><rect x="7" y="5" width="10" height="16" rx="4"/><path d="M7 10h10M7 16h10"/>',
    fight: '<path d="M7 11V7.5a2.5 2.5 0 0 1 5 0V9h2.5A3.5 3.5 0 0 1 18 12.5V15a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M12 9v3M7 13h5"/>',
    learn: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
    station: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    auto: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h0M15 13h0M9.5 16.5h5"/>',
    world: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>'
  };
  const svg = id => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[id] + '</svg>';
  const ITEMS = ['adventure', 'train', 'fight', 'world', 'learn'];
  const LS = 'gotr.modes.seen';
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* optional */ } };
  let root = null, fab = null, list = null, edge = null, tools = {}, buttons = {}, open = false, lastKey = '', attached = false;
  const rg = () => window.ringfighterGame, eng = () => window.app?.engine, lang = () => (copy[window.app?.lang] ? window.app.lang : 'en'), w = () => copy[lang()];

  // The mode the player is in now: the Adventure home, the Rivals & Cup menu, a fight or training.
  function current() {
    const tab = rg()?.modalTab;
    if (tab === 'adventure') return 'adventure';
    if (tab === 'world' || tab === 'cup') return 'world';
    if (tab === 'learn') return 'learn';
    return eng()?.targetMode === 'fight' ? 'fight' : 'train';
  }
  function setOpen(v, labels) {
    open = !!v; root.classList.toggle('gm-open', open); edge.hidden = open || !edgeOn(); fab.setAttribute('aria-expanded', String(open)); list.hidden = !open;
    root.classList.toggle('gm-labels', open && (labels || lsGet(LS) !== '1'));
    if (open && !labels) { const n = +(lsGet(LS + '.n') || 0) + 1; lsSet(LS + '.n', String(n)); if (n >= 2) lsSet(LS, '1'); }
  }
  function go(id) {
    setOpen(false); const g = rg(), e = eng(); if (!g || !e) return;
    if (id === 'adventure') { g.home(); return; }
    if (id === 'world' || id === 'learn') { g.open(id); return; }
    if (id === 'train') { // free training at the last station, with the station picker open
      const fromActivity = g.activity && !g.modalTab && e.targetMode !== 'fight' && !window.AdventureOldTown?.run;
      window.AdventureOldTown?.leave?.(); g.close(); g.activity = true;
      if (!fromActivity) window.clubInterface?.returnToGym();
      document.getElementById('openTrainingDrawer')?.click();
      return;
    }
    // Fight: the free fight setup opens over the current screen; picking a fight starts it, closing it keeps you where you were.
    if (!window.fightUI) { window.AdventureOldTown?.leave?.(); g.quick(); return; }
    const before = e.fightOptions; window.fightUI.configure();
    const d = [...document.querySelectorAll('dialog.fight-dialog[open]')].pop();
    d?.addEventListener('close', () => { if (e.fightOptions === before) return; const wasModal = !!g.modalTab; window.AdventureOldTown?.leave?.(); g.close(); g.activity = true; if (wasModal) { e.isPlaying = true; e.lastRenderStamp = null; window.app.updatePlayBtnText?.(); } }, { once: true });
  }
  // Owner (GOTR-0063 follow-up): no tab row and no station toolbar over the stage. The button sits at the stage's inline-end edge,
  // below any top HUD line it would cross (fight health bars, mission strip, power meter); on the home map it sits under the header.
  const TOP_HUD = '#fightHealth,#advGoal,#powerGauge,.academy-hud,.stage-hud-line';
  function place() {
    if (!root) return;
    const rtl = (document.documentElement.dir || document.body.dir) === 'rtl', head = document.querySelector('header')?.getBoundingClientRect();
    const home = rg()?.modalTab === 'adventure', st0 = !home && document.getElementById('stageContainer')?.getBoundingClientRect(), st = st0 && st0.height ? st0 : null;
    const S = 44, M = 8, side = st ? (rtl ? st.left : innerWidth - st.right) + M : 10;
    let top = st ? st.top + M : (head ? head.bottom : 0) + M;
    if (st) { // x-range of the button plus its row of edge icons, then step below every top HUD element it would cross
      const n = edge && !edge.hidden ? [...edge.children].filter(b => !b.hidden).length : 0, wd = S + n * (S + 6) + (n ? 6 : 0);
      const x0 = rtl ? st.left + M : st.right - M - wd, x1 = x0 + wd;
      for (const n of document.querySelectorAll(TOP_HUD)) { if (n.hidden || !n.offsetParent) continue; const r = n.getBoundingClientRect(); if (r.width && r.height && r.left < x1 && r.right > x0 && r.top < st.top + st.height * .35 && r.bottom + 6 > top) top = r.bottom + 6; }
    }
    // not enough room for the stack above the right-edge controls (camera lock, pause, pad): open it as a row beside the button instead
    let row = false;
    if (st) { const x0 = rtl ? st.left + M : st.right - M - S, x1 = x0 + S, need = top + S + ITEMS.length * (S + 6) + 4;
      for (const n of document.querySelectorAll('#camLock,#playBtn,.fp-zone,#burstControl')) { if (!n.offsetParent) continue; const r = n.getBoundingClientRect(); if (r.width && r.left < x1 && r.right > x0 && r.top > top && r.top < need) row = true; }
      if (need > st.bottom) row = true; }
    root.classList.toggle('gm-row', row);
    root.style.top = Math.round(Math.max(0, top)) + 'px'; root.style.left = rtl ? Math.round(side) + 'px' : ''; root.style.right = rtl ? '' : Math.round(side) + 'px';
    root.dir = rtl ? 'rtl' : 'ltr'; root.classList.toggle('gm-rtl', rtl);
    document.body.style.setProperty('--gm-home-top', Math.round(head ? head.bottom : 0) + 'px');
  }
  // Small edge icons for the few training/fight controls that lived in the toolbar: station / fight controls, timed session, Auto.
  const EDGE = { station: 'openTrainingDrawer', timer: 'startTraining', auto: 'compactControlMode' };
  const edgeOn = () => !!rg()?.store?.current() && !rg()?.modalTab;
  const shown = n => n && !n.hidden && getComputedStyle(n).display !== 'none';
  function paintEdge() {
    if (!edge) return; edge.hidden = open || !edgeOn(); if (edge.hidden) return;
    for (const [id, src] of Object.entries(EDGE)) {
      const o = document.getElementById(src), b = tools[id]; b.hidden = !shown(o); if (b.hidden) continue;
      const txt = o.textContent.trim(), label = (o.getAttribute('aria-label') || txt).trim(); b.disabled = !!o.disabled; b.setAttribute('aria-label', label); b.title = label;
      if (id === 'station') continue;
      if (id === 'timer') { // stopwatch + seconds ("15s" idle, the seconds left during a round)
        const sec = (txt.match(/\d+/) || [''])[0], k = 'x:' + sec; if (b.dataset.key !== k) { b.dataset.key = k; b.innerHTML = svg('timer') + '<span class="gm-tool-sec">' + sec + (lang() === 'en' ? 's' : '') + '</span>'; }
        b.dataset.state = eng()?.career?.active ? 'run' : ''; b.setAttribute('aria-pressed', String(!!eng()?.career?.active)); continue; }
      const short = id === 'timer' ? ((txt.match(/\d+\s*s|\d+:\d+|\d+/) || [txt.split(/\s+/).pop() || ''])[0]).slice(0, 5) : txt;
      const key = short.length <= 5 ? 't:' + short : 'i:' + (o.dataset.mode || ''); // a word that does not fit 44 px becomes an icon (HE / RU Auto, Play)
      if (b.dataset.key !== key) { b.dataset.key = key; if (short.length <= 5) b.textContent = short; else b.innerHTML = svg(o.dataset.mode === 'play' ? 'auto' : 'fight'); }
      b.dataset.state = o.dataset.mode || '';
    }
  }
  let round = null, line = null, lineKey = '';
  function onRound(ev) {
    const d = ev.detail || {};
    if (window.AdventureOldTown?.run) { round = null; paintRound(); return; } // an Old Town mission shows its own goal strip and result
    if (d.phase === 'start') round = { ...d, phase: 'run' };
    else if (d.phase === 'end') round = d.reason === 'time' || d.reason === 'stop' ? { ...d, phase: 'end', until: 0 } : null;
    if (d.phase === 'start') paintRound(); // the result is painted by the 250 ms tick, which also starts its 12 s
  }
  function paintRound() {
    const e = eng(), st = document.getElementById('stageContainer'); if (!line || !e || !st) return;
    const active = e.career?.active;
    if (round?.phase === 'run' && !active) round = null; // finished elsewhere without an event (old state)
    if (!round && active) round = { phase: 'run', mode: active.mode, duration: active.duration };
    const now = e.animTime || 0; // scene time: the result stays 12 s of play from when it is first shown (and while paused)
    if (round?.phase === 'end' && !round.until) round.until = now + 12;
    if (round?.phase === 'end' && (now > round.until || now < round.until - 13 || active)) round = active ? { phase: 'run', mode: active.mode, duration: active.duration } : null;
    const show = !!round && !window.AdventureOldTown?.run && edgeOn() && e.targetMode !== 'fight' && !rg()?.modalTab && !document.querySelector('dialog[open]');
    line.hidden = !show; if (!show) { lineKey = ''; return; }
    const t = RC[lang()], mode = e.targetMode || 'none', rtl = (document.documentElement.dir || document.body.dir) === 'rtl';
    let title, left = '', sub, hint = '', again = false;
    if (round.phase === 'run') {
      title = fill(t.round, { n: active.duration }); left = fill(t.left, { s: Math.max(0, Math.ceil(active.duration - active.seconds)) });
      sub = mode === 'rope' ? t.rope : e.player?.enabled ? (mode === 'pads' ? t.mitts : t.play) : t.auto; hint = t.stop;
    } else {
      title = round.reason === 'stop' ? t.stopped : t.over; again = true;
      sub = (round.mode === 'rope' ? fill(t.jumps, { n: round.jumps || 0 }) : fill(t.hits, { n: round.hits || 0 })) + (round.recap ? ' · ' + round.recap : '');
    }
    const key = [lang(), title, left, sub, hint, again, rtl].join('|');
    if (key !== lineKey) { lineKey = key; line.dir = rtl ? 'rtl' : 'ltr'; line.dataset.phase = round.phase;
      line.querySelector('.gm-round-name').textContent = title; line.querySelector('.gm-round-left').textContent = left;
      line.querySelector('.gm-round-sub').textContent = sub; const h = line.querySelector('.gm-round-hint'); h.textContent = hint; h.hidden = !hint;
      const a = line.querySelector('.gm-round-again'); a.textContent = t.again; a.hidden = !again; }
    // Top inline-start corner of the stage, beside the edge tools and below the drill cue / power meter when they share the column.
    const sr = st.getBoundingClientRect(), M = 8, busy = [...root.querySelectorAll('.gm-fab,.gm-tool')].filter(n => n.offsetParent).map(n => n.getBoundingClientRect());
    const edgeX = busy.length ? (rtl ? Math.max(...busy.map(r => r.right)) : Math.min(...busy.map(r => r.left))) : (rtl ? sr.left : sr.right);
    const width = Math.max(150, Math.min(300, rtl ? sr.right - M - edgeX - M : edgeX - M - sr.left - M)), x0 = rtl ? sr.right - M - width : sr.left + M;
    let top = sr.top + M;
    for (const n of document.querySelectorAll('.career-drill-cue,#powerGauge')) { if (n.hidden || !n.offsetParent) continue; const r = n.getBoundingClientRect(); if (r.width && r.left < x0 + width && r.right > x0 && r.top < sr.top + sr.height * .3) top = Math.max(top, r.bottom + 6); }
    line.style.width = Math.round(width) + 'px'; line.style.top = Math.round(top - sr.top) + 'px'; line.style.left = rtl ? '' : M + 'px'; line.style.right = rtl ? M + 'px' : '';
  }
  function paint() {
    if (!root) return;
    const has = !!rg()?.store?.current(), cur = current(), key = [lang(), cur, has].join('|');
    root.hidden = !has; document.body.classList.toggle('gm-on', has);
    place(); paintEdge(); paintRound();
    if (key === lastKey) return; lastKey = key;
    const t = w(); fab.setAttribute('aria-label', t.modes + ' · ' + t[cur]); fab.title = t.modes; fab.innerHTML = svg(cur) + '<span class="gm-caret" aria-hidden="true"></span>';
    for (const id of ITEMS) { const b = buttons[id]; b.querySelector('.gm-label').textContent = t[id]; b.setAttribute('aria-label', t[id]); b.setAttribute('aria-current', String(id === cur)); }
    list.setAttribute('aria-label', t.modes);
  }
  function attach() {
    if (attached || !rg() || !document.body) return; attached = true;
    root = document.createElement('div'); root.className = 'gm-modes'; root.id = 'gameModes';
    fab = document.createElement('button'); fab.type = 'button'; fab.className = 'gm-fab'; fab.setAttribute('aria-haspopup', 'true'); fab.setAttribute('aria-controls', 'gameModesList');
    list = document.createElement('div'); list.className = 'gm-list'; list.id = 'gameModesList'; list.setAttribute('role', 'group'); list.hidden = true;
    for (const id of ITEMS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-item'; b.dataset.mode = id; b.innerHTML = svg(id) + '<span class="gm-label"></span>'; b.onclick = () => go(id); buttons[id] = b; list.append(b); }
    edge = document.createElement('div'); edge.className = 'gm-edge'; edge.hidden = true;
    for (const id of Object.keys(EDGE)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-tool gm-tool-' + id; if (id === 'station') b.innerHTML = svg('station'); b.onclick = () => { document.getElementById(EDGE[id])?.click(); setTimeout(paint, 60); }; tools[id] = b; edge.append(b); }
    root.append(fab, list, edge); document.body.append(root);
    line = document.createElement('div'); line.className = 'gm-round'; line.hidden = true; line.setAttribute('role', 'status'); line.setAttribute('aria-live', 'polite');
    line.innerHTML = '<p class="gm-round-title"><span class="gm-round-name"></span> <b class="gm-round-left"></b></p><p class="gm-round-sub"></p><p class="gm-round-hint"></p><button type="button" class="gm-round-again" hidden></button>';
    line.querySelector('.gm-round-again').onclick = () => { round = null; document.getElementById('startTraining')?.click(); setTimeout(paint, 60); };
    document.getElementById('stageContainer')?.append(line); window.addEventListener('ringfighter-round', onRound);
    // tap: toggle; long-press (450 ms): open with labels
    let timer = 0, long = false;
    fab.addEventListener('pointerdown', () => { long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; setOpen(true, true); }, 450); });
    const cancel = () => clearTimeout(timer); fab.addEventListener('pointerup', cancel); fab.addEventListener('pointerleave', cancel); fab.addEventListener('pointercancel', cancel);
    fab.addEventListener('contextmenu', ev => ev.preventDefault());
    fab.addEventListener('click', () => { if (long) { long = false; return; } setOpen(!open); });
    document.addEventListener('pointerdown', ev => { if (open && !root.contains(ev.target)) setOpen(false); }, true);
    document.addEventListener('keydown', ev => { if (open && ev.key === 'Escape') { setOpen(false); fab.focus(); } });
    // A new or switched profile (welcome / profile dialog closed) lands on the Adventure home.
    let pid = rg().store.current()?.id || null;
    const hook = n => n.addEventListener('close', () => setTimeout(() => { const id = rg().store.current()?.id || null; if (id && (id !== pid || (!rg().activity && !rg().modalTab))) rg().home(); pid = id; }, 0), { once: true });
    document.querySelectorAll('dialog.career-welcome').forEach(hook);
    new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches?.('dialog.career-welcome')) hook(n); }).observe(document.body, { childList: true });
    window.addEventListener('resize', place); setInterval(paint, 300); setInterval(paintRound, 250); paint();
  }
  window.GameModes = { attach, paint, place, copy, get open() { return open; }, toggle: v => setOpen(v === undefined ? !open : v), go };
})();
