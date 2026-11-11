/* Old Town playable (GOTR-0008 slice C1): Coach Pip's mission list on the Old Town card, a small goal strip while a
 * mission runs on an EXISTING activity, measured results -> AdventureProgress.recordMission, and the boss bout against
 * Brick -> recordBoss. Nothing here changes how the activities work: it listens (engine.onImpact, career.onFrame,
 * career.onFight, AcademyStage.state) and measures what they already produce. Development build: everything open. */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const A = () => window.AdventureProgress, G = () => window.GotrGlossary;
  const POWER_MARK = .7; // the power meter's "strong" level (power-meter.js STRONG)
  const copy = {
    en: { next: 'Next mission: {t} ▶', retry: 'Retry for ★★★', map: 'Old Town map', brickGo: 'Challenge Brick ▶', brickNeed: 'Challenge Brick (Level {n} needed · you are Level {l}) ▶', market: 'Market Row unlocked ▶', xp: '+{n} XP', coins: '+{n} ◈',  coach: 'Coach Pip, rabbit', missions: "Coach Pip's missions", stars: 'stars', goal: '3 stars', best: 'Best', start: 'Start', replay: 'Replay', soon: 'Coming soon', type: { training: 'Training', funny: 'Funny', help: 'Help' }, boss: 'Boss', fl: 'Fighter Level', entry: 'Entry Level', chance: 'Chance', fight: 'Fight Brick', won: 'Beaten', warnT: 'Big difference: low chance to win', warnGo: 'Fight anyway', warnBack: 'Train first', locked: 'Locked. Reach Level {n} to challenge Brick.', quit: 'Quit mission', back: 'Back to Old Town', again: 'Try again', rematch: 'Rematch', result: 'Result', newStars: '+{n} stars', noStars: 'No new stars', measured: 'Measured', level: 'Fighter Level {a} → {b}', stat: { power: 'Power', speed: 'Speed', stamina: 'Stamina' }, none: 'Not enough yet for a star. Try again.', bossWin: 'You beat Brick!', bossLoss: 'Brick won this one. Losing costs nothing.', open: 'Market Row is open.', err: 'Could not save the result: ', noStart: 'This activity could not start right now.', mission: 'Mission' },
    he: { next: 'המשימה הבאה: {t} ◀', retry: 'שוב ל-★★★', map: 'מפת העיר העתיקה', brickGo: 'לאתגר את בריק ◀', brickNeed: 'לאתגר את בריק (נדרשת רמה {n} · אתם ברמה {l}) ◀', market: 'שדרת השוק נפתחה ◀', xp: '+{n} ניסיון', coins: '+{n} ◈',  coach: 'המאמן פיפ, ארנב', missions: 'המשימות של המאמן פיפ', stars: 'כוכבים', goal: '3 כוכבים', best: 'שיא', start: 'התחלה', replay: 'שוב', soon: 'בקרוב', type: { training: 'אימון', funny: 'מצחיק', help: 'עזרה' }, boss: 'בוס', fl: 'רמת לוחם', entry: 'רמת כניסה', chance: 'סיכוי', fight: 'להילחם בבריק', won: 'ניצחתם', warnT: 'פער גדול: סיכוי נמוך לנצח', warnGo: 'להילחם בכל זאת', warnBack: 'קודם להתאמן', locked: 'נעול. הגיעו לרמה {n} כדי לאתגר את בריק.', quit: 'יציאה מהמשימה', back: 'חזרה לעיר העתיקה', again: 'עוד פעם', rematch: 'קרב חוזר', result: 'תוצאה', newStars: '+{n} כוכבים', noStars: 'אין כוכבים חדשים', measured: 'נמדד', level: 'רמת לוחם {a} ← {b}', stat: { power: 'כוח', speed: 'מהירות', stamina: 'סיבולת' }, none: 'עדיין לא מספיק לכוכב. נסו שוב.', bossWin: 'ניצחתם את בריק!', bossLoss: 'בריק ניצח הפעם. הפסד לא עולה כלום.', open: 'שדרת השוק פתוחה.', err: 'לא ניתן לשמור את התוצאה: ', noStart: 'לא ניתן להתחיל את הפעילות כרגע.', mission: 'משימה' },
    ru: { next: 'Следующее задание: {t} ▶', retry: 'Ещё раз на ★★★', map: 'Карта Старого города', brickGo: 'Вызвать Брика ▶', brickNeed: 'Вызвать Брика (нужен уровень {n} · у вас {l}) ▶', market: 'Рыночный ряд открыт ▶', xp: '+{n} опыта', coins: '+{n} ◈',  coach: 'Тренер Пип, кролик', missions: 'Задания тренера Пипа', stars: 'звёзды', goal: '3 звезды', best: 'Рекорд', start: 'Начать', replay: 'Ещё раз', soon: 'Скоро', type: { training: 'Тренировка', funny: 'Забавное', help: 'Помощь' }, boss: 'Босс', fl: 'Уровень бойца', entry: 'Уровень входа', chance: 'Шанс', fight: 'Бой с Бриком', won: 'Побеждён', warnT: 'Большая разница: шанс победить низкий', warnGo: 'Всё равно драться', warnBack: 'Сначала тренировка', locked: 'Закрыто. Достигните уровня {n}, чтобы бросить вызов Брику.', quit: 'Выйти из задания', back: 'Назад в Старый город', again: 'Ещё раз', rematch: 'Реванш', result: 'Результат', newStars: '+{n} звёзд', noStars: 'Новых звёзд нет', measured: 'Результат', level: 'Уровень бойца {a} → {b}', stat: { power: 'Сила', speed: 'Скорость', stamina: 'Выносливость' }, none: 'Пока не хватает на звезду. Попробуйте ещё.', bossWin: 'Вы победили Брика!', bossLoss: 'Брик выиграл в этот раз. Поражение ничего не стоит.', open: 'Рыночный ряд открыт.', err: 'Не удалось сохранить результат: ', noStart: 'Сейчас это занятие нельзя начать.', mission: 'Задание' }
  };
  const lang = () => copy[window.app?.lang] ? window.app.lang : 'en', W = () => copy[lang()];
  const T = o => o ? (o[lang()] || o.en) : '';
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const term = x => (G() ? G().term(x, lang()) : x);
  // The 3-star goal in words, boxing terms stay English.
  function goalText(id, n) {
    const l = lang(), jab = term('Jab'), cross = term('Cross'), roll = term('Roll'), hook = term('Hook'), guard = term('Guard');
    const t = {
      first_stance: L(`Block ${n} partner punches with your ${guard}`, `חסמו ${n} מכות של בן הזוג עם ${guard}`, `Отбейте ${n} ударов партнёра, держа ${guard}`),
      one_two_mitts: L(`${n} clean ${jab}-${cross} hits on the mitts`, `${n} פגיעות נקיות של ${jab}-${cross} בכפות`, `${n} чистых попаданий ${jab}-${cross} по лапам`),
      bag_power: L(`Reach the power mark ${n} times`, `הגיעו לסימן העוצמה ${n} פעמים`, `Достигните отметки силы ${n} раз`),
      roll_under_hook: L(`${roll} under ${n} coach ${hook}s`, `בצעו ${roll} מתחת ל-${n} הוקים של המאמן`, `${roll} под ${n} ${hook} тренера`),
      rope_rhythm: L(`${n} seconds of rope in rhythm`, `${n} שניות חבל בקצב`, `${n} секунд скакалки в ритме`),
      teach_the_kid: L(`Show the ${jab}-${cross} cleanly ${n} times`, `הדגימו ${jab}-${cross} נקי ${n} פעמים`, `Покажите ${jab}-${cross} чисто: ${n} раза`),
      morning_sparring: L(`Land ${n} punches in a 30-second round`, `פגעו ${n} פעמים בסיבוב של 30 שניות`, `Нанесите ${n} ударов за раунд в 30 секунд`)
    }[id];
    return t ? t[l] : '';
  }
  const starsText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const tap = () => window.AdventureOldTown;

  // How each playable mission starts and what it measures. Hooks: imp(run, hit), frame(run, frame, dt).
  const playerOn = () => !!window.app?.engine?.player?.enabled;
  const DEFS = {
    first_stance: { kind: 'training', mode: 'rabbit', technique: 'random', duration: 60,
      // The sparring partner's punch lands on the Fighter's glove or arm: a held guard.
      imp: (r, h) => { if (playerOn() && h.actor === 'rabbit' && (h.blocked || ['glove', 'arm'].includes(h.kind))) r.value++; } },
    one_two_mitts: { kind: 'training', mode: 'pads', duration: 60,
      imp: (r, h) => { if (playerOn() && h.actor === 'lion' && h.receiver === 'pads' && !h.blocked && (h.move === 'jab' || h.move === 'cross')) r.value++; } },
    bag_power: { kind: 'training', mode: 'heavy', duration: 60,
      imp: (r, h) => { const p = window.PowerMeter?.power(h, 'heavy'); if (playerOn() && p != null && p >= POWER_MARK) r.value++; } },
    roll_under_hook: { kind: 'training', mode: 'pads', duration: 60,
      frame: (r, f) => { if (playerOn() && f.defences > 0) r.value += f.defences; } },
    // Rope has no miss: the coach sets the rhythm. Measured: the longest stretch of rope seconds in rhythm (a jump at least every 1.5 s).
    rope_rhythm: { kind: 'training', mode: 'rope', duration: 45,
      frame: (r, f, dt) => { if (!f.rope || !(dt > 0)) return; r.t = (r.t || 0) + dt; if (f.jumps) { r.lastJump = r.t; r.runStart ??= r.t; } if (r.lastJump != null && r.t - r.lastJump > 1.5) r.runStart = null; if (r.runStart != null && r.lastJump != null) r.value = Math.max(r.value, Math.floor(r.lastJump - r.runStart + 1)); } },
    teach_the_kid: { kind: 'lesson', comboId: 'first_rhythm' },
    morning_sparring: { kind: 'fight', rounds: 1, roundSeconds: 30, restSeconds: 0 }
  };
  let run = null, hooked = false;

  function strip(r) {
    const root = document.createElement('div'); root.className = 'adv-goal'; root.id = 'advGoal'; root.dir = document.documentElement.dir || 'ltr'; root.setAttribute('role', 'status');
    const txt = document.createElement('span'), bar = document.createElement('span'), fillBar = document.createElement('i'), quit = document.createElement('button');
    txt.className = 'adv-goal-text'; bar.className = 'adv-goal-bar'; bar.append(fillBar); quit.type = 'button'; quit.className = 'adv-goal-quit'; quit.textContent = '×';
    quit.setAttribute('aria-label', W().quit); quit.title = W().quit; quit.onclick = () => abort();
    root.append(txt, bar, quit); document.body.append(root); r.ui = { root, txt, fillBar };
  }
  function paintStrip() {
    const r = run; if (!r?.ui) return;
    const stars = A().starsFor(r.id, r.value), key = r.id + '|' + r.value + '|' + lang();
    if (r.paintKey === key) return; r.paintKey = key;
    const shown = A().metrics[r.mission.metric].lower ? r.value : Math.min(r.value, r.target);
    r.ui.txt.textContent = `${goalText(r.id, r.target)} · ${r.value >= r.target ? r.target : shown}/${r.target} · ${starsText(stars)}`;
    r.ui.fillBar.style.width = Math.min(100, 100 * r.value / r.target).toFixed(0) + '%';
    r.ui.root.dataset.stars = String(stars);
  }
  // Wrapped once: engine.onImpact (every contact), career.onFrame (every frame, with its dt), career.onFight (fight state each frame).
  function hook() {
    const e = window.app?.engine; if (hooked || !e?.career || !e.onImpact) return;
    hooked = true;
    const prevImpact = e.onImpact; e.onImpact = function (hit) { prevImpact?.call(this, hit); if (run && !run.ended) try { DEFS[run.id].imp?.(run, hit); paintStrip(); } catch (x) { console.warn('adventure', x); } };
    const c = e.career, prevFrame = c.onFrame; c.onFrame = function (frame, dt) {
      const out = prevFrame.call(this, frame, dt); watchNext();
      if (run && !run.ended) try { tickRun(frame, dt); } catch (x) { console.warn('adventure', x); }
      return out;
    };
    const prevFight = c.onFight; c.onFight = function (view) {
      const out = prevFight.call(this, view);
      if (run && !run.ended && (run.def.kind === 'fight' || run.def.kind === 'boss') && view === run.view && view.match?.result) try { fightDone(view); } catch (x) { console.warn('adventure', x); }
      return out;
    };
  }
  function tickRun(frame, dt) {
    const r = run, d = r.def, e = window.app.engine;
    if (d.kind === 'training') {
      d.frame?.(r, frame, dt); paintStrip();
      const a = e.career.active;
      if (a) { r.session = a.id; if (!r.early && r.value >= r.target) { r.early = true; setTimeout(() => { if (run === r && !r.ended) e.career.finish(); }, 700); } }
      else if (r.session) finishRun();
    } else if (d.kind === 'lesson') {
      const s = window.AcademyStage?.state;
      if (s && s.comboId === d.comboId) { r.seen = true; r.value = Math.max(r.value, s.reps || 0); paintStrip(); if (s.phase === 'pass' || s.passed) { r.value = Math.max(r.value, r.target); paintStrip(); setTimeout(() => { window.AcademyStage?.stop(); finishRun(); }, 400); r.passing = true; } }
      else if (r.seen && !r.passing) finishRun();
    }
  }
  // Fight finished (sparring mission or the boss bout): the verdict stays visible for a moment, then the result card opens.
  function fightDone(view) {
    const r = run; if (r.fightDone) return; r.fightDone = true;
    if (r.def.kind === 'boss') { setTimeout(() => bossDone(view), 1500); return; }
    const entry = view.careerEntry, m = view.match, totals = m.result.totals || m.totals;
    r.value = totals[entry.species].landed; r.extra = { won: m.result.winner === entry.species }; paintStrip(); setTimeout(finishRun, 1500);
  }

  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, fn, cls) => { const b = mk('button', cls || 'game-button adv-go', text); b.type = 'button'; b.onclick = fn; return b; };
  function cleanup() { run?.ui?.root.remove(); document.getElementById('advNext')?.remove(); }
  function backToTown() {
    cleanup(); const keep = run; run = null; void keep;
    window.ringfighterGame?.open('adventure', { onReady: h => h.select('oldtown') });
  }

  // ---- non-blocking feedback and the "Next" bar (GOTR-0052): replaces the full-screen post-activity card ----
  const rg = () => window.ringfighterGame;
  const gameCtx = () => ({ store: rg().store, startTraining: rg().startTraining, startFight: rg().startFight, change: a => { const r = rg().store.gameAction(a); if (r.ok) rg().apply?.(); return r.ok; } });
  function toast(text, cls) {
    let box = document.getElementById('advToasts');
    if (!box) { box = mk('div', 'adv-toasts'); box.id = 'advToasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = mk('div', 'adv-toast ' + (cls || ''), text); box.append(t); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => t.remove(), 4200);
  }
  const starsOf = (g, id) => g.adventure?.missions[id]?.stars || 0;
  function nextMission(g, afterId) {
    const order = A().missions.filter(m => m.chapter === 1 && DEFS[m.id]), i = order.findIndex(m => m.id === afterId), cand = i < 0 ? order : [...order.slice(i + 1), ...order.slice(0, i)];
    return cand.find(m => !starsOf(g, m.id)) || cand.find(m => starsOf(g, m.id) < 3) || null;
  }
  function openMap(id) { cleanup(); run = null; rg()?.open('adventure', { onReady: h => h.select(id || 'oldtown') }); }
  // What to do next, from the adventure state: { primary: [label, fn], more: [[label, fn]...] }
  function nextSteps(info) {
    const w = W(), g = rg().store.game(), ctx = gameCtx(), brickWon = A().bossWon(g, 'brick'), lvl = A().level(g), entry = A().bosses[0].entry, more = [];
    const go = id => () => start(ctx, id), brick = () => bossStart(ctx);
    const nm = nextMission(g, info.id), bossBtn = [lvl >= entry ? w.brickGo : fill(w.brickNeed, { n: entry, l: lvl }), brick];
    let primary;
    if (info.kind === 'boss') {
      primary = info.won ? [w.market, () => openMap('market')] : [w.rematch, brick];
      if (info.won) more.push([w.rematch, brick]);
    } else {
      if (info.kind === 'mission' && info.res?.ok && info.res.best < 3) more.push([w.retry, go(info.id)]);
      primary = nm ? [fill(w.next, { t: T(nm.titles) }), go(nm.id)] : brickWon ? [w.market, () => openMap('market')] : bossBtn;
      if (nm && !brickWon) more.push(bossBtn);
    }
    more.push([w.map, () => openMap('oldtown')]);
    return { primary, more };
  }
  function showNext(info) {
    document.getElementById('advNext')?.remove(); if (!rg()?.store?.game()) return;
    const e = window.app.engine, { primary, more } = nextSteps(info), bar = mk('div', 'adv-next'); bar.id = 'advNext'; bar.dir = document.documentElement.dir || 'ltr';
    bar.append(btn(primary[0], primary[1], 'game-button adv-go adv-next-main'));
    for (const [label, fn] of more) bar.append(btn(label, fn, 'game-button adv-go adv-alt adv-next-alt'));
    bar._view = e.arena?.fightView || null; bar._mode = e.targetMode;
    document.body.append(bar); placeNext();
  }
  function placeNext() {
    const bar = document.getElementById('advNext'); if (!bar) return;
    const pad = document.getElementById('fighterPad'), r = pad && !pad.hidden ? pad.getBoundingClientRect() : null;
    bar.style.bottom = (r && r.height ? Math.max(8, innerHeight - r.top + 6) : 10) + 'px';
  }
  // Called for every awarded activity (replaces the old full-screen card). Mission/boss runs add their own stars and Next bar.
  function reward(a) {
    const w = W(), award = a.award; toast(fill(w.xp, { n: award.xp }), 'xp'); if (award.coins) toast(fill(w.coins, { n: award.coins }), 'coin');
    for (const id of award.unlocks || []) toast('✓ ' + (rg().comboName?.(id) || id), 'gain');
    if (!run || run.ended) showNext({ kind: 'free' });
    return true;
  }
  function watchNext() {
    const bar = document.getElementById('advNext'); if (!bar) return; placeNext();
    const e = window.app.engine; if (e.career.active || e.arena?.fightView !== bar._view || e.targetMode !== bar._mode) bar.remove();
  }

  function abort() { if (!run) return; const e = window.app.engine; if (run.def.kind === 'lesson') window.AcademyStage?.stop(); run.ended = true; try { e.career.finish(); } catch { /* none active */ } backToTown(); }

  function finishRun() {
    const r = run; if (!r || r.ended) return; r.ended = true; r.ui?.root.remove();
    const store = r.ctx.store, before = A().statPoints(store.game()), res = store.gameAction({ type: 'adventure', adventure: 'mission', missionId: r.id, measured: { [r.mission.metric]: r.value } });
    const after = A().statPoints(store.game()), w = W();
    if (!res.ok) toast(w.err + res.error, 'bad');
    else {
      toast(res.stars ? starsText(res.best) + (res.newStars > 0 ? ' · ' + fill(w.newStars, { n: res.newStars }) : '') : w.none, res.stars ? 'gold' : '');
      for (const k of A().stats) if (after[k] > before[k]) toast(`${w.stat[k]} +${after[k] - before[k]}`, 'gain');
      if (res.level !== res.levelBefore) toast(fill(w.level, { a: res.levelBefore, b: res.level }), 'gain');
    }
    showNext({ kind: 'mission', id: r.id, res });
    window.dispatchEvent(new CustomEvent('adventure-mission-result', { detail: { missionId: r.id, value: r.value, result: res } }));
  }

  function begin(ctx, id) {
    const mission = A().missions.find(m => m.id === id), def = DEFS[id]; if (!mission || !def) return false;
    cleanup(); run = { id, mission, def, ctx, value: 0, target: mission.thresholds[2], ended: false };
    hook(); strip(run); paintStrip(); return true;
  }
  function start(ctx, id) {
    if (!begin(ctx, id)) return;
    const d = run.def, e = window.app.engine;
    try {
      ctx.change({ type: 'venue', venueId: 'default' }); // the Old Town gym
      if (d.kind === 'training') { ctx.startTraining({ mode: d.mode, play: true, duration: d.duration, technique: d.technique }); if (!e.career.active) throw Error(W().noStart); }
      else if (d.kind === 'lesson') { const s = window.AcademyStage?.start(d.comboId); if (!s?.ok) throw Error(s?.error || W().noStart); }
      else if (d.kind === 'fight') {
        ctx.startFight({ preset: 'quick', rounds: d.rounds, roundSeconds: d.roundSeconds, restSeconds: d.restSeconds });
        run.view = e.arena?.fightView; if (!run.view) throw Error(W().noStart);
      }
    } catch (x) { const ui = run.ui; run.ended = true; ui?.txt && (ui.txt.textContent = x.message); setTimeout(() => { if (run?.ended) backToTown(); }, 1800); }
  }

  // Boss: a bout in the Neighborhood Hall against an existing opponent named Brick (new species comes later).
  function bossStart(ctx) {
    const e = window.app.engine, b = A().bosses.find(x => x.id === 'brick'), edge = A().bossEdge(ctx.store.game(), 'brick');
    cleanup(); run = { id: 'brick', def: { kind: 'boss' }, ctx, ended: false, mission: { titles: b.names, metric: 'wins' }, value: 0, target: 1 };
    hook(); ctx.change({ type: 'venue', venueId: 'default' });
    ctx.startFight({ preset: 'quick', rounds: 2, roundSeconds: 30, restSeconds: 8 });
    const view = e.arena?.fightView; if (!view) { run = null; return; }
    run.view = view; const entry = view.careerEntry, m = view.match, foe = m.fighters[entry.species === 'lion' ? 'rabbit' : 'lion'];
    if (entry) entry.opponentName = { en: 'Brick', he: 'בריק', ru: 'Брик' }[lang()];
    // Brick hits a little harder than a gym regular; each Fighter Level above his entry level softens his hits 3% and slows his reactions 3%.
    foe.power *= 1.08 * edge.damage; foe.tempo *= 1.03 / edge.reaction; foe.skill = Math.min(.99, foe.skill + .04);
    const strip2 = mk('div', 'adv-goal'); strip2.id = 'advGoal'; strip2.dir = document.documentElement.dir || 'ltr';
    const txt = mk('span', 'adv-goal-text', `${T(b.names)} · ${W().entry} ${b.entry}`), quit = btn('×', () => abort(), 'adv-goal-quit'); quit.title = W().quit; quit.setAttribute('aria-label', W().quit); strip2.append(txt, quit); document.body.append(strip2); run.ui = { root: strip2, txt };
  }
  function bossDone(view) {
    const r = run; if (!r || r.ended) return; r.ended = true; r.ui?.root.remove();
    const entry = view.careerEntry, won = view.match.result.winner === entry.species, store = r.ctx.store, w = W();
    const res = store.gameAction({ type: 'adventure', adventure: 'boss', bossId: 'brick', won });
    toast(res.ok ? (won ? w.bossWin : w.bossLoss) : w.err + res.error, won ? 'gold' : 'bad');
    showNext({ kind: 'boss', won, res });
  }
  // ---- the Old Town card ----
  function render(ctx) {
    const w = W(), A_ = A(), store = ctx.store, g = store.game(), root = mk('div', 'adv-town');
    root.append(mk('h4', 'adv-town-h', w.missions));
    const total = A_.missions.filter(m => m.chapter === 1).reduce((n, m) => n + (g.adventure?.missions[m.id]?.stars || 0), 0);
    root.querySelector('h4').append(mk('span', 'adv-town-total', `${total} / 27 ${w.stars}`));
    const list = mk('ul', 'adv-missions');
    for (const m of A_.missions.filter(x => x.chapter === 1)) {
      const rec = g.adventure?.missions[m.id], playable = !!DEFS[m.id], li = mk('li', 'adv-mission'); li.dataset.mission = m.id;
      const info = mk('div', 'adv-mission-info'), name = mk('strong', '', T(m.titles)), tag = mk('span', 'adv-mission-tag', w.type[m.type] || m.type);
      const goal = mk('span', 'adv-mission-goal', playable ? `${w.goal}: ${goalText(m.id, m.thresholds[2])}${rec ? ` · ${w.best} ${rec.value}` : ''}` : w.soon);
      info.append(mk('span', 'adv-mission-head'), goal); info.firstChild.append(name, tag);
      const star = mk('span', 'adv-mission-stars', starsText(rec?.stars || 0)); star.setAttribute('aria-label', `${rec?.stars || 0} / 3 ${w.stars}`); star.dataset.stars = String(rec?.stars || 0);
      li.append(info, star);
      if (playable) li.append(btn(rec ? w.replay : w.start, () => start(ctx, m.id), 'game-button adv-go adv-mini'));
      else li.append(mk('span', 'adv-soon-pill', w.soon));
      list.append(li);
    }
    root.append(list);
    // Boss card
    const b = A_.bosses.find(x => x.id === 'brick'), lvl = A_.level(g), chance = A_.chance(g, 'brick'), won = A_.bossWon(g, 'brick'), open = A_.canChallenge(g, 'brick', false);
    const boss = mk('div', 'adv-boss'); boss.dataset.won = String(won);
    boss.append(mk('strong', 'adv-boss-name', `${w.boss}: ${T(b.names)}${won ? ' · ' + w.won : ''}`));
    boss.append(mk('span', 'adv-boss-gate', `${w.fl} ${lvl} · ${w.entry} ${b.entry} · ${w.chance} ${chance}%`));
    const acts = mk('div', 'adv-actions');
    const fight = () => { if (store.game()) bossStart(ctx); };
    if (open) acts.append(btn(w.fight, fight));
    else if (A_.freeMode()) {
      const warn = mk('div', 'adv-warn'); warn.hidden = true; warn.setAttribute('role', 'alert');
      warn.append(mk('strong', '', w.warnT), mk('span', '', `${w.fl} ${lvl} · ${w.entry} ${b.entry} · ${w.chance} ${chance}%`));
      const wa = mk('div', 'adv-actions'); wa.append(btn(w.warnGo, fight), btn(w.warnBack, () => { warn.hidden = true; acts.hidden = false; list.scrollIntoView?.({ block: 'nearest' }); }, 'game-button adv-go adv-alt')); warn.append(wa);
      acts.append(btn(w.fight, () => { warn.hidden = false; acts.hidden = true; warn.querySelector('button')?.focus({ preventScroll: true }); })); boss.append(warn);
    } else acts.append(mk('span', 'adv-warn-text', fill(w.locked, { n: b.entry })));
    boss.append(acts); root.append(boss);
    return root;
  }
  window.AdventureOldTown = { reward, render, start, bossStart, goalText, defs: DEFS, get run() { return run; }, copy };
})();
