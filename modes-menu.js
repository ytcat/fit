/* GOTR-0063: one round "modes" button on the side of the game view instead of the permanent Train / Fight / Adventure tab row.
 * Tapping it opens a small stack of icon buttons below it: Adventure (home map), Training (station picker), Fight (fight setup),
 * Rivals & Cup. Labels show on first use, on long-press and on desktop hover; a tap outside collapses the stack.
 * The Adventure home itself is the game shell's adventure dialog (game-shell.js: open('adventure') / home()). */
(() => {
  const copy = {
    en: { modes: 'Modes', adventure: 'Adventure', train: 'Training', fight: 'Fight', world: 'Rivals & Cup' },
    he: { modes: 'מצבים', adventure: 'הרפתקה', train: 'אימון', fight: 'קרב', world: 'יריבים וגביע' },
    ru: { modes: 'Режимы', adventure: 'Приключение', train: 'Тренировка', fight: 'Бой', world: 'Соперники и кубок' }
  };
  const P = {
    adventure: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
    train: '<path d="M12 2v3"/><rect x="7" y="5" width="10" height="16" rx="4"/><path d="M7 10h10M7 16h10"/>',
    fight: '<path d="M7 11V7.5a2.5 2.5 0 0 1 5 0V9h2.5A3.5 3.5 0 0 1 18 12.5V15a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M12 9v3M7 13h5"/>',
    world: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>'
  };
  const svg = id => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[id] + '</svg>';
  const ITEMS = ['adventure', 'train', 'fight', 'world'];
  const LS = 'gotr.modes.seen';
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* optional */ } };
  let root = null, fab = null, list = null, buttons = {}, open = false, lastKey = '', attached = false;
  const rg = () => window.ringfighterGame, eng = () => window.app?.engine, lang = () => (copy[window.app?.lang] ? window.app.lang : 'en'), w = () => copy[lang()];

  // The mode the player is in now: the Adventure home, the Rivals & Cup menu, a fight or training.
  function current() {
    const tab = rg()?.modalTab;
    if (tab === 'adventure') return 'adventure';
    if (tab === 'world' || tab === 'cup') return 'world';
    return eng()?.targetMode === 'fight' ? 'fight' : 'train';
  }
  function setOpen(v, labels) {
    open = !!v; root.classList.toggle('gm-open', open); fab.setAttribute('aria-expanded', String(open)); list.hidden = !open;
    root.classList.toggle('gm-labels', open && (labels || lsGet(LS) !== '1'));
    if (open && !labels) { const n = +(lsGet(LS + '.n') || 0) + 1; lsSet(LS + '.n', String(n)); if (n >= 2) lsSet(LS, '1'); }
  }
  function go(id) {
    setOpen(false); const g = rg(), e = eng(); if (!g || !e) return;
    if (id === 'adventure') { g.home(); return; }
    if (id === 'world') { g.open('world'); return; }
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
  // Pin the button to the inline end of the toolbar row under the header (the toolbar keeps that space free), or under the header on the home map.
  function place() {
    if (!root) return;
    const rtl = (document.documentElement.dir || document.body.dir) === 'rtl', head = document.querySelector('header')?.getBoundingClientRect();
    const home = rg()?.modalTab === 'adventure', bar = document.querySelector('.ringside-toolbar'), br = bar?.offsetParent && !home ? bar.getBoundingClientRect() : null;
    const S = 44, top = br && br.height >= S - 8 ? br.top + (br.height - S) / 2 : (head ? head.bottom : 0) + 8;
    const side = br ? (rtl ? br.left : innerWidth - br.right) + 4 : 10;
    root.style.top = Math.round(Math.max(0, top)) + 'px'; root.style.left = rtl ? Math.round(side) + 'px' : ''; root.style.right = rtl ? '' : Math.round(side) + 'px';
    root.dir = rtl ? 'rtl' : 'ltr'; root.classList.toggle('gm-rtl', rtl);
    document.body.style.setProperty('--gm-home-top', Math.round(head ? head.bottom : 0) + 'px');
  }
  function paint() {
    if (!root) return;
    const has = !!rg()?.store?.current(), cur = current(), key = [lang(), cur, has].join('|');
    root.hidden = !has; document.body.classList.toggle('gm-on', has);
    place();
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
    root.append(fab, list); document.body.append(root);
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
    window.addEventListener('resize', place); setInterval(paint, 300); paint();
  }
  window.GameModes = { attach, paint, place, copy, get open() { return open; }, toggle: v => setOpen(v === undefined ? !open : v), go };
})();
