/* Old Town playable (GOTR-0008 slice C1): Coach Pip's mission list on the Old Town card, a small goal strip while a
 * mission runs on an EXISTING activity, measured results -> AdventureProgress.recordMission, and the boss bout against
 * Brick -> recordBoss. Nothing here changes how the activities work: it listens (engine.onImpact, career.onFrame,
 * career.onFight, AcademyStage.state) and measures what they already produce. Development build: everything open. */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const A = () => window.AdventureProgress, G = () => window.GotrGlossary;
  const POWER_MARK = .7; // the power meter's "strong" level (power-meter.js STRONG)
  const copy = {
    en: { startStory: 'Start the story ▶', startCh: 'Start ▶', cont: 'Continue story ▶ {t}', goTo: 'Go to {c} ▶', step: 'Step {n} of 5', recap: 'Story so far', chWord: 'Chapter', chDone: 'Chapter {n} complete', goal1: "Earn your place in Pip's gym and beat Brick.", goal2: "Win the street's respect and beat King Hyena.",  challenge: 'Challenge {b} ▶', challengeNeed: 'Challenge {b} (Level {n} needed · you are Level {l}) ▶', fightB: 'Fight {b}', nextCh: '{c} unlocked ▶',  journal: 'Story journal', jEmpty: 'No story lines seen yet.', beat: 'Story beat',  next: 'Next mission: {t} ▶', retry: 'Retry for ★★★', map: 'Old Town map', brickGo: 'Challenge Brick ▶', brickNeed: 'Challenge Brick (Level {n} needed · you are Level {l}) ▶', market: 'Market Row unlocked ▶', xp: '+{n} XP', coins: '+{n} ◈',  coach: 'Coach Pip, rabbit', missions: "Coach Pip's missions", stars: 'stars', goal: '3 stars', best: 'Best', start: 'Start', replay: 'Replay', soon: 'Coming soon', type: { training: 'Training', funny: 'Funny', help: 'Help' }, boss: 'Boss', fl: 'Fighter Level', entry: 'Entry Level', chance: 'Chance', fight: 'Fight Brick', won: 'Beaten', warnT: 'Big difference: low chance to win', warnGo: 'Fight anyway', warnBack: 'Train first', locked: 'Locked. Reach Level {n} to challenge Brick.', quit: 'Quit mission', back: 'Back to Old Town', again: 'Try again', rematch: 'Rematch', result: 'Result', newStars: '+{n} stars', noStars: 'No new stars', measured: 'Measured', level: 'Fighter Level {a} → {b}', stat: { power: 'Power', speed: 'Speed', stamina: 'Stamina' }, none: 'Not enough yet for a star. Try again.', bossWin: 'You beat Brick!', bossLoss: 'Brick won this one. Losing costs nothing.', open: 'Market Row is open.', err: 'Could not save the result: ', noStart: 'This activity could not start right now.', mission: 'Mission' },
    he: { startStory: 'להתחיל את הסיפור ◀', startCh: 'להתחיל ◀', cont: 'להמשיך בסיפור ◀ {t}', goTo: 'ללכת אל {c} ◀', step: 'שלב {n} מתוך 5', recap: 'עד כה בסיפור', chWord: 'פרק', chDone: 'פרק {n} הושלם', goal1: 'הרוויחו את מקומכם באולם של פיפ ונצחו את בריק.', goal2: 'זכו בכבוד הרחוב ונצחו את מלך הצבועים.',  challenge: 'לאתגר את {b} ◀', challengeNeed: 'לאתגר את {b} (נדרשת רמה {n} · אתם ברמה {l}) ◀', fightB: 'להילחם ב{b}', nextCh: '{c} נפתח ◀',  journal: 'יומן הסיפור', jEmpty: 'עוד לא נראו שורות סיפור.', beat: 'שלב בסיפור',  next: 'המשימה הבאה: {t} ◀', retry: 'שוב ל-★★★', map: 'מפת העיר העתיקה', brickGo: 'לאתגר את בריק ◀', brickNeed: 'לאתגר את בריק (נדרשת רמה {n} · אתם ברמה {l}) ◀', market: 'שדרת השוק נפתחה ◀', xp: '+{n} ניסיון', coins: '+{n} ◈',  coach: 'המאמן פיפ, ארנב', missions: 'המשימות של המאמן פיפ', stars: 'כוכבים', goal: '3 כוכבים', best: 'שיא', start: 'התחלה', replay: 'שוב', soon: 'בקרוב', type: { training: 'אימון', funny: 'מצחיק', help: 'עזרה' }, boss: 'בוס', fl: 'רמת לוחם', entry: 'רמת כניסה', chance: 'סיכוי', fight: 'להילחם בבריק', won: 'ניצחתם', warnT: 'פער גדול: סיכוי נמוך לנצח', warnGo: 'להילחם בכל זאת', warnBack: 'קודם להתאמן', locked: 'נעול. הגיעו לרמה {n} כדי לאתגר את בריק.', quit: 'יציאה מהמשימה', back: 'חזרה לעיר העתיקה', again: 'עוד פעם', rematch: 'קרב חוזר', result: 'תוצאה', newStars: '+{n} כוכבים', noStars: 'אין כוכבים חדשים', measured: 'נמדד', level: 'רמת לוחם {a} ← {b}', stat: { power: 'כוח', speed: 'מהירות', stamina: 'סיבולת' }, none: 'עדיין לא מספיק לכוכב. נסו שוב.', bossWin: 'ניצחתם את בריק!', bossLoss: 'בריק ניצח הפעם. הפסד לא עולה כלום.', open: 'שדרת השוק פתוחה.', err: 'לא ניתן לשמור את התוצאה: ', noStart: 'לא ניתן להתחיל את הפעילות כרגע.', mission: 'משימה' },
    ru: { startStory: 'Начать историю ▶', startCh: 'Начать ▶', cont: 'Продолжить историю ▶ {t}', goTo: 'Перейти: {c} ▶', step: 'Шаг {n} из 5', recap: 'Что было', chWord: 'Глава', chDone: 'Глава {n} пройдена', goal1: 'Заслужи место в зале Пипа и победи Брика.', goal2: 'Заслужи уважение улицы и победи Короля гиен.',  challenge: 'Вызвать: {b} ▶', challengeNeed: 'Вызвать: {b} (нужен уровень {n} · у вас {l}) ▶', fightB: 'Бой: {b}', nextCh: '{c}: открыто ▶',  journal: 'Дневник истории', jEmpty: 'Пока нет увиденных реплик.', beat: 'Эпизод',  next: 'Следующее задание: {t} ▶', retry: 'Ещё раз на ★★★', map: 'Карта Старого города', brickGo: 'Вызвать Брика ▶', brickNeed: 'Вызвать Брика (нужен уровень {n} · у вас {l}) ▶', market: 'Рыночный ряд открыт ▶', xp: '+{n} опыта', coins: '+{n} ◈',  coach: 'Тренер Пип, кролик', missions: 'Задания тренера Пипа', stars: 'звёзды', goal: '3 звезды', best: 'Рекорд', start: 'Начать', replay: 'Ещё раз', soon: 'Скоро', type: { training: 'Тренировка', funny: 'Забавное', help: 'Помощь' }, boss: 'Босс', fl: 'Уровень бойца', entry: 'Уровень входа', chance: 'Шанс', fight: 'Бой с Бриком', won: 'Побеждён', warnT: 'Большая разница: шанс победить низкий', warnGo: 'Всё равно драться', warnBack: 'Сначала тренировка', locked: 'Закрыто. Достигните уровня {n}, чтобы бросить вызов Брику.', quit: 'Выйти из задания', back: 'Назад в Старый город', again: 'Ещё раз', rematch: 'Реванш', result: 'Результат', newStars: '+{n} звёзд', noStars: 'Новых звёзд нет', measured: 'Результат', level: 'Уровень бойца {a} → {b}', stat: { power: 'Сила', speed: 'Скорость', stamina: 'Выносливость' }, none: 'Пока не хватает на звезду. Попробуйте ещё.', bossWin: 'Вы победили Брика!', bossLoss: 'Брик выиграл в этот раз. Поражение ничего не стоит.', open: 'Рыночный ряд открыт.', err: 'Не удалось сохранить результат: ', noStart: 'Сейчас это занятие нельзя начать.', mission: 'Задание' }
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
      heavy_bag_van: L(`Carry the bag in with at most ${n} mistakes`, `הכניסו את השק עם ${n} טעויות לכל היותר`, `Занесите мешок, ошибок не больше ${n}`),
      curb_footwork: L(`${n} quick steps in 20 seconds`, `${n} צעדים מהירים ב-20 שניות`, `${n} быстрых шагов за 20 секунд`),
      clean_hands: L(`Win a round and take at most ${n} hits`, `נצחו בסיבוב וקבלו לכל היותר ${n} מכות`, `Выиграйте раунд, пропустив не больше ${n} ударов`),
      kids_skateboard: L(`${n} body shots on the hyena who took it`, `${n} מכות לגוף לצבוע שלקח אותו`, `${n} ударов в корпус гиене, укравшей доску`),
      crowd_circle: L(`Beat ${n} challengers in a row`, `נצחו ${n} מתמודדים ברצף`, `Победите ${n} соперников подряд`),
      rooftop_callout: L(`Land ${n} punches in a 10-second round`, `פגעו ${n} פעמים בסיבוב של 10 שניות`, `Нанесите ${n} ударов за раунд в 10 секунд`),
      influencer_challenge: L(`${n} speed-bag punches in 15 seconds`, `${n} מכות בשק המהירות ב-15 שניות`, `${n} ударов по скоростной груше за 15 секунд`),
      morning_sparring: L(`Land ${n} punches in a 30-second round`, `פגעו ${n} פעמים בסיבוב של 30 שניות`, `Нанесите ${n} ударов за раунд в 30 секунд`)
    }[id];
    return t ? t[l] : '';
  }
  const starsText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const tap = () => window.AdventureOldTown;

  // How each playable mission starts and what it measures. Hooks: imp(run, hit), frame(run, frame, dt).
  const playerOn = () => !!window.app?.engine?.player?.enabled;
  const DEFS = {
    heavy_bag_van: { kind: 'scene', scene: 'carry_bag' }, // GOTR-0056 story set mini-game (adventure/story/story-scenes.js)
    // first_stance (guard hold) stays "Coming soon": the sparring partner did not reliably throw at a guarding Fighter in testing, so no honest signal yet.
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
    morning_sparring: { kind: 'fight', rounds: 1, roundSeconds: 30, restSeconds: 0 },
    // ---- Chapter 2, Market Row (Street arena). Signals that already exist; the three street mini-games stay "coming soon".
    // Footwork: every step the Fighter takes (Step buttons) while the heavy bag is up.
    curb_footwork: { kind: 'training', mode: 'heavy', duration: 20, steps: true },
    // Win a round and count the hits taken; a lost round counts as many.
    clean_hands: { kind: 'fight', rounds: 1, roundSeconds: 30, restSeconds: 0, opponent: L('Street regular', 'מקומי מהרחוב', 'Уличный боец'), live: (me, opp) => opp.landed, measure: (me, opp, won) => won ? opp.landed : 99 },
    kids_skateboard: { kind: 'fight', rounds: 1, roundSeconds: 30, restSeconds: 0, opponent: L('Hyena', 'צבוע', 'Гиена'), live: me => me.body, measure: me => me.body },
    crowd_circle: { kind: 'fight', rounds: 1, roundSeconds: 15, restSeconds: 0, chain: 3, opponent: L('Challenger', 'מתמודד', 'Соперник') },
    rooftop_callout: { kind: 'fight', rounds: 1, roundSeconds: 10, restSeconds: 0, opponent: L('Rooftop caller', 'המאתגר מהגג', 'Вызывающий с крыши'), live: me => me.landed, measure: me => me.landed },
    influencer_challenge: { kind: 'training', mode: 'speed', duration: 15,
      imp: (r, h) => { if (playerOn() && h.actor === 'lion' && h.receiver !== 'lion' && h.receiver !== 'platform' && window.app.engine.targetMode === 'speed') r.value++; } }
  };
  // Chapter data (GOTR-0058): venue, map pin, boss and the boss's look/strength. Chapter 2: Market Row, the Street arena, King Hyena.
  const CH = { 1: { venue: 'default', pin: 'oldtown', boss: 'brick' }, 2: { venue: 'street', pin: 'market', boss: 'king_hyena' } };
  const BOSS = {
    brick: { chapter: 1, name: L('Brick', 'בריק', 'Брик'), power: 1.08, tempo: 1.03, skill: .04 },
    king_hyena: { chapter: 2, name: L('King Hyena', 'מלך הצבועים', 'Король гиен'), power: 1.14, tempo: 1.08, skill: .07 }
  };
  const chapterOfId = id => A().missions.find(m => m.id === id)?.chapter || BOSS[id]?.chapter || 1;
  let run = null, hooked = false;

  function strip(r) {
    const root = document.createElement('div'); root.className = 'adv-goal'; root.id = 'advGoal'; root.dir = document.documentElement.dir || 'ltr'; root.setAttribute('role', 'status');
    const txt = document.createElement('span'), bar = document.createElement('span'), fillBar = document.createElement('i'), quit = document.createElement('button');
    txt.className = 'adv-goal-text'; bar.className = 'adv-goal-bar'; bar.append(fillBar); quit.type = 'button'; quit.className = 'adv-goal-quit'; quit.textContent = '×';
    quit.setAttribute('aria-label', W().quit); quit.title = W().quit; quit.onclick = () => abort();
    root.append(txt, bar, quit); (window.app?.engine?.stage||document.body).append(root); r.ui = { root, txt, fillBar };
  }
  function paintStrip() {
    const r = run; if (!r?.ui) return;
    const lower = A().metrics[r.mission.metric]?.lower, stars = lower && !r.ended ? 0 : A().starsFor(r.id, r.value), key = r.id + '|' + r.value + '|' + lang();
    if (r.paintKey === key) return; r.paintKey = key;
    const shown = A().metrics[r.mission.metric].lower ? r.value : Math.min(r.value, r.target);
    r.ui.txt.textContent = lower ? `${goalText(r.id, r.target)} · ${r.value > 9 ? '9+' : r.value}` : `${goalText(r.id, r.target)} · ${r.value >= r.target ? r.target : shown}/${r.target} · ${starsText(stars)}`;
    r.ui.fillBar.style.width = (lower ? 100 * (1 - Math.min(1, r.value / (r.mission.thresholds[0] + 1))) : Math.min(100, 100 * r.value / r.target)).toFixed(0) + '%';
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
    const pl = e.player; if (pl && typeof pl.press === 'function' && !pl.advStepHook) { pl.advStepHook = true; const orig = pl.press; pl.press = function (id, ...a) { const ok = orig.call(this, id, ...a); if (ok && run && !run.ended && run.def.steps && /^step/.test(String(id))) { run.value++; paintStrip(); } return ok; }; }
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
    } else if (d.kind === 'fight' && d.live && r.view?.match && !r.fightDone) {
      const m = r.view.match, sp = r.view.careerEntry?.species || 'lion', t = m.totals, v = d.live(t[sp], t[sp === 'lion' ? 'rabbit' : 'lion']); if (v !== r.value) { r.value = v; paintStrip(); }
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
    const entry = view.careerEntry, m = view.match, totals = m.result.totals || m.totals, sp = entry.species, me = totals[sp], opp = totals[sp === 'lion' ? 'rabbit' : 'lion'], won = m.result.winner === sp, d = r.def;
    if (d.chain) { // Crowd circle: the next challenger steps in after every win; the first loss ends the run
      if (won) r.value = (r.wins = (r.wins || 0) + 1);
      paintStrip();
      if (won && r.value < d.chain) { setTimeout(() => { if (run !== r || r.ended) return; r.fightDone = false; fightStart(r.ctx, d, r); }, 1600); return; }
      r.extra = { won }; setTimeout(finishRun, 1500); return;
    }
    r.value = d.measure ? d.measure(me, opp, won) : me.landed; r.extra = { won }; paintStrip(); setTimeout(finishRun, 1500);
  }
  // Starts (or restarts, for a chain) one bout for a mission and names the opponent.
  function fightStart(ctx, d, r) {
    const e = window.app.engine;
    ctx.startFight({ preset: 'quick', rounds: d.rounds, roundSeconds: d.roundSeconds, restSeconds: d.restSeconds });
    r.view = e.arena?.fightView; if (!r.view) throw Error(W().noStart);
    if (d.opponent && r.view.careerEntry) r.view.careerEntry.opponentName = d.opponent[lang()] + (d.chain ? ' ' + ((r.wins || 0) + 1) : '');
  }

  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, fn, cls) => { const b = mk('button', cls || 'game-button adv-go', text); b.type = 'button'; b.onclick = fn; return b; };
  function cleanup() { run?.ui?.root.remove(); document.getElementById('advNext')?.remove(); }
  function backToTown() {
    cleanup(); const keep = run; run = null; void keep;
    const pin = keep?.id ? CH[chapterOfId(keep.id)]?.pin : null;
    window.ringfighterGame?.open('adventure', { onReady: h => h.select(pin || 'oldtown') });
  }

  // ---- non-blocking feedback and the "Next" bar (GOTR-0052): replaces the full-screen post-activity card ----
  const rg = () => window.ringfighterGame, toastLog = [];
  const gameCtx = () => ({ store: rg().store, startTraining: rg().startTraining, startFight: rg().startFight, change: a => { const r = rg().store.gameAction(a); if (r.ok) rg().apply?.(); return r.ok; } });
  function toast(text, cls) {
    let box = document.getElementById('advToasts');
    if (!box) { box = mk('div', 'adv-toasts'); box.id = 'advToasts'; box.setAttribute('aria-live', 'polite'); (window.app?.engine?.stage || document.body).append(box); } // GOTR-0054: reward chips live in the stage's centre zone
    toastLog.push(text); const t = mk('div', 'adv-toast ' + (cls || ''), text); box.append(t); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => t.remove(), 4200);
  }
  const starsOf = (g, id) => g.adventure?.missions[id]?.stars || 0;
  function nextMission(g, afterId, chap) {
    const order = (window.AdventureStory?.order || A().missions.map(m => m.id)).filter(id => DEFS[id] && (!chap || chapterOfId(id) === chap)).map(id => A().missions.find(m => m.id === id)), i = order.findIndex(m => m.id === afterId), cand = i < 0 ? order : [...order.slice(i + 1), ...order.slice(0, i)];
    return cand.find(m => !starsOf(g, m.id)) || cand.find(m => starsOf(g, m.id) < 3) || null;
  }
  function openMap(id) { cleanup(); run = null; rg()?.open('adventure', { onReady: h => h.select(id || 'oldtown') }); }
  const pinOf = n => ({ 1: 'oldtown', 2: 'market', 3: 'docks', 4: 'downtown', 5: 'hill' }[n]);
  // What to do next, from the adventure state: { primary: [label, fn], more: [[label, fn]...] }
  function nextSteps(info) {
    const w = W(), g = rg().store.game(), ctx = gameCtx(), more = [], A_ = A();
    const ch = info.id ? chapterOfId(info.id) : 1, cd = A_.chapters[ch - 1], bossId = cd.boss, b = A_.bosses.find(x => x.id === bossId), bname = T(BOSS[bossId]?.name || b.names).split(/[,،]/)[0];
    const bossWon = A_.bossWon(g, bossId), lvl = A_.level(g), go = id => () => start(ctx, id), boss = () => bossStart(ctx, bossId);
    const nm = nextMission(g, info.id, ch), bossBtn = [lvl >= b.entry ? fill(w.challenge, { b: bname }) : fill(w.challengeNeed, { b: bname, n: b.entry, l: lvl }), boss];
    const chapterBtn = ch < 5 ? [fill(w.nextCh, { c: T(A_.chapters[ch].names) }), () => openMap(pinOf(ch + 1))] : null;
    let primary;
    if (info.kind === 'boss') {
      primary = info.won && chapterBtn ? chapterBtn : [w.rematch, boss];
      if (info.won) more.push([w.rematch, boss]);
    } else {
      if (info.kind === 'mission' && info.res?.ok && info.res.best < 3) more.push([w.retry, go(info.id)]);
      const here = nm; // the recommended next beat of this chapter first
      primary = here ? [fill(w.next, { t: T(here.titles) }), go(here.id)] : bossWon && chapterBtn ? chapterBtn : bossBtn;
      if (here && !bossWon) more.push(bossBtn);
    }
    more.push([w.map, () => openMap(pinOf(ch))]);
    return { primary, more };
  }
  function showNext(info) {
    document.getElementById('advNext')?.remove(); if (!rg()?.store?.game()) return;
    const e = window.app.engine, { primary, more } = nextSteps(info), bar = mk('div', 'adv-next'); bar.id = 'advNext'; bar.dir = document.documentElement.dir || 'ltr';
    bar.append(btn(primary[0], primary[1], 'game-button adv-go adv-next-main'));
    for (const [label, fn] of more) bar.append(btn(label, fn, 'game-button adv-go adv-alt adv-next-alt'));
    bar._view = e.arena?.fightView || null; bar._mode = e.targetMode;
    (e.stage || document.body).append(bar); placeNext();
  }
  // GOTR-0054: the Next bar sits in the stage's bottom band, directly above the topmost control (game pad zones, camera lock, play/pause, Burst, result row).
  function placeNext() {
    const bar = document.getElementById('advNext'); if (!bar) return;
    const host = bar.parentElement, hr = host.getBoundingClientRect(); let top = Infinity;
    for (const el of document.querySelectorAll('.fp-zone,#camLock,#playBtn,#burstControl,#burstTip,.ringside-toolbar')) { if (el.offsetParent === null) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && r.top > hr.top + hr.height / 2) top = Math.min(top, r.top); }
    bar.style.bottom = (top < Infinity ? Math.max(8, hr.bottom - top + 6) : 10) + 'px';
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
    stamp();
    if (res.ok && res.stars > 0) window.AdventureStory?.show(r.id, 'outro');
    showNext({ kind: 'mission', id: r.id, res });
    window.dispatchEvent(new CustomEvent('adventure-mission-result', { detail: { missionId: r.id, value: r.value, result: res } }));
  }

  function begin(ctx, id) {
    const mission = A().missions.find(m => m.id === id), def = DEFS[id]; if (!mission || !def) return false;
    cleanup(); run = { id, mission, def, ctx, value: 0, target: mission.thresholds[2], ended: false };
    hook(); strip(run); paintStrip(); return true;
  }
  // GOTR-0056: story scenes before the first mission of a beat (once per browser), and scene-type missions.
  const seen = k => { try { return localStorage.getItem('gotr-scene-' + k) === '1'; } catch { return false; } };
  const mark = k => { try { localStorage.setItem('gotr-scene-' + k, '1'); } catch { /* fine without storage */ } };
  const PRE = { one_two_mitts: 'arrival', bag_power: 'brick' };
  function start(ctx, id) {
    const S = window.StoryScenes, d0 = DEFS[id];
    if (d0 && d0.kind === 'scene') { if (S) S.play(d0.scene, { onDone: () => { try { ctx.refresh?.(); } catch { /* sheet may be closed */ } } }); return; }
    if (S && PRE[id] && !seen(PRE[id])) { mark(PRE[id]); S.play(PRE[id], { onDone: () => start(ctx, id) }); return; }
    if (!begin(ctx, id)) return;
    const d = run.def, e = window.app.engine;
    try {
      ctx.change({ type: 'venue', venueId: CH[chapterOfId(id)]?.venue || 'default' }); // the chapter's arena (Old Town gym, Market Row street)
      if (d.kind === 'training') { ctx.startTraining({ mode: d.mode, play: true, duration: d.duration, technique: d.technique }); if (!e.career.active) throw Error(W().noStart); }
      else if (d.kind === 'lesson') { const s = window.AcademyStage?.start(d.comboId); if (!s?.ok) throw Error(s?.error || W().noStart); }
      else if (d.kind === 'fight') {
        fightStart(ctx, d, run);
      }
      window.AdventureStory?.show(id, 'intro');
    } catch (x) { const ui = run.ui; run.ended = true; ui?.txt && (ui.txt.textContent = x.message); setTimeout(() => { if (run?.ended) backToTown(); }, 1800); }
  }

  // Boss: a bout in the Neighborhood Hall against an existing opponent named Brick (new species comes later).
  function bossStart(ctx, bossId = 'brick') {
    const e = window.app.engine, b = A().bosses.find(x => x.id === bossId), cfg = BOSS[bossId], edge = A().bossEdge(ctx.store.game(), bossId);
    cleanup(); run = { id: bossId, def: { kind: 'boss' }, ctx, ended: false, mission: { titles: b.names, metric: 'wins' }, value: 0, target: 1 };
    hook(); ctx.change({ type: 'venue', venueId: CH[cfg.chapter].venue });
    ctx.startFight({ preset: 'quick', rounds: 2, roundSeconds: 30, restSeconds: 8 });
    const view = e.arena?.fightView; if (!view) { run = null; return; }
    window.AdventureStory?.show(bossId, 'intro');
    run.view = view; const entry = view.careerEntry, m = view.match, foe = m.fighters[entry.species === 'lion' ? 'rabbit' : 'lion'];
    if (entry) entry.opponentName = cfg.name[lang()];
    // The boss hits a little harder than a regular; each Fighter Level above his entry level softens his hits 3% and slows his reactions 3%.
    foe.power *= cfg.power * edge.damage; foe.tempo *= cfg.tempo / edge.reaction; foe.skill = Math.min(.99, foe.skill + cfg.skill);
    const strip2 = mk('div', 'adv-goal'); strip2.id = 'advGoal'; strip2.dir = document.documentElement.dir || 'ltr';
    const txt = mk('span', 'adv-goal-text', `${T(b.names)} · ${W().entry} ${b.entry}`), quit = btn('×', () => abort(), 'adv-goal-quit'); quit.title = W().quit; quit.setAttribute('aria-label', W().quit); strip2.append(txt, quit); (window.app?.engine?.stage || document.body).append(strip2); run.ui = { root: strip2, txt };
  }
  function bossDone(view) {
    const r = run; if (!r || r.ended) return; r.ended = true; r.ui?.root.remove();
    const entry = view.careerEntry, won = view.match.result.winner === entry.species, store = r.ctx.store, w = W();
    const res = store.gameAction({ type: 'adventure', adventure: 'boss', bossId: r.id, won });
    toast(res.ok ? (won ? w.bossWin : w.bossLoss) : w.err + res.error, won ? 'gold' : 'bad');
    window.AdventureStory?.show(r.id, won ? 'outro' : 'lost');
    stamp(); showNext({ kind: 'boss', won, res, id: r.id });
    const chp = BOSS[r.id].chapter;
    if (won && res.ok && chp < 5) { // chapter end: outro line, title card, then the map with the route dots to the next chapter
      setTimeout(() => titleCard(fill(w.chDone, { n: chp }), 2200), 3800);
      setTimeout(() => { if (document.getElementById('advNext')) openMap(pinOf(chp)); }, 6200);
    }
  }
  // ---- the Old Town sheet content: small icon tiles (playable first, "coming soon" last), details on tap, boss block ----
  const ICON = { curb_footwork: '👟', rooftop_balloons: '🎈', whistle_chase: '🦝', kids_skateboard: '🛹', grandma_groceries: '👵', influencer_challenge: '🤳', clean_hands: '🧤', crowd_circle: '👥', rooftop_callout: '📣', first_stance: '🛡️', one_two_mitts: '🥊', bag_power: '💥', roll_under_hook: '🌀', rope_rhythm: '🪢', heavy_bag_van: '🚚', teach_the_kid: '🧒', morning_sparring: '🥋', snoring_guard: '😴' };
  // ---- story flow (GOTR-0060): title cards, first open, Continue button, chapter goal, recap ----
  const CH_TITLE = { 1: L('Nobody', 'אף אחד', 'Никто'), 2: L('The Street', 'הרחוב', 'Улица'), 3: L('The Underground', 'המחתרת', 'Подполье'), 4: L('Rising', 'בדרך למעלה', 'Восхождение'), 5: L('The Championship', 'האליפות', 'Чемпионат') };
  const chapterTitle = n => `${W().chWord} ${n} · ${T(CH_TITLE[n])}`;
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* optional */ } };
  // Plain text on the map (no box), tap to skip.
  function titleCard(text, ms = 2000, done) {
    document.getElementById('advTitleCard')?.remove();
    const el = mk('div', 'adv-title-card', text); el.id = 'advTitleCard'; el.dir = document.documentElement.dir || 'ltr'; el.setAttribute('role', 'status');
    (document.querySelector('dialog[open]') || document.body).append(el);
    let fin = false; const end = () => { if (fin) return; fin = true; clearTimeout(t); el.remove(); done?.(); }, t = setTimeout(end, ms); el.addEventListener('pointerdown', end);
  }
  // First open of Adventure for this profile: chapter title, then the arrival scene; the sheet follows with "Start the story".
  function onOpen(ctx) {
    const g = ctx.store.game(), pid = ctx.store.current()?.id, key = 'gotr.adv.intro.' + pid;
    if (!g || lsGet(key) === '1' || A().missions.some(m => starsOf(g, m.id)) || A().bossWon(g, 'brick')) return false;
    lsSet(key, '1');
    titleCard(chapterTitle(1), 2000, () => { const S = window.StoryScenes; if (!S) return; rg().close(); mark('arrival'); if (!S.play('arrival', { onDone: () => openMap('oldtown') })) openMap('oldtown'); });
    return true;
  }
  function chapterIntro(n) { const k = 'ch' + n; if (seen(k) || !window.AdventureStory?.lines['chapter_' + n]) return; mark(k); window.AdventureStory.show('chapter_' + n, 'intro'); }
  const stamp = () => { lsSet('gotr.adv.last', String(Date.now())); };
  let recapShown = false;
  function recapNode() {
    if (recapShown || !window.AdventureStory) return null;
    const last = +lsGet('gotr.adv.last') || 0, ver = window.APP_VERSION?.number || '', old = lsGet('gotr.adv.ver') !== ver || (last && Date.now() - last > 864e5), items = window.AdventureStory.journal().slice(-2);
    if (!old || !items.length) return null;
    recapShown = true; lsSet('gotr.adv.ver', ver);
    return mk('p', 'adv-recap', `${W().recap}: ` + items.map(i => `${i.name}: ${i.text}`).join(' '));
  }
  // Short tile labels (at most 10 characters); the full title is in the detail. Boxing terms stay English.
  const SHORT = {
    first_stance: L('Stance', 'עמידה', 'Стойка'), one_two_mitts: L('One-two', 'ימין-שמאל', 'Двойка'), bag_power: L('Power', 'כוח', 'Сила'), roll_under_hook: L('Roll', 'Roll', 'Roll'), rope_rhythm: L('Rope', 'חבל', 'Скакалка'),
    heavy_bag_van: L('New bag', 'שק חדש', 'Мешок'), teach_the_kid: L('Teach kid', 'ללמד', 'Малыш'), morning_sparring: L('Sparring', 'ספארינג', 'Спарринг'), snoring_guard: L('Guard', 'שומר', 'Сторож'),
    curb_footwork: L('Footwork', 'רגליים', 'Шаги'), rooftop_balloons: L('Balloons', 'בלונים', 'Шарики'), whistle_chase: L('Whistle', 'משרוקית', 'Свисток'), kids_skateboard: L('Skateboard', 'סקייט', 'Скейт'), grandma_groceries: L('Grandma', 'סבתא', 'Бабушка'),
    influencer_challenge: L('Show-off', 'משפיען', 'Блогер'), clean_hands: L('Clean', 'נקי', 'Чисто'), crowd_circle: L('Crowd', 'מעגל', 'Круг'), rooftop_callout: L('Callout', 'אתגר', 'Вызов')
  };
  // The first playable mission of the chapter that has no stars yet, in story order.
  const nextNew = (g, chap) => (window.AdventureStory?.order || []).filter(id => DEFS[id] && chapterOfId(id) === chap && !starsOf(g, id)).map(id => A().missions.find(m => m.id === id))[0] || null;
  function render(ctx, opts = {}) {
    const w = W(), A_ = A(), store = ctx.store, g = store.game(), tiles = [], rest = [], chap = opts.chapter || 1, bossId = A_.chapters[chap - 1].boss;
    const all = A_.missions.filter(x => x.chapter === chap), so = id => { const i = window.AdventureStory?.order.indexOf(id); return i >= 0 ? i : 99; }, ordered = [...all.filter(m => DEFS[m.id]).sort((a, b) => so(a.id) - so(b.id)), ...all.filter(m => !DEFS[m.id]).sort((a, b) => so(a.id) - so(b.id))];
    const detail = mk('div', 'adv-detail'); detail.hidden = true;
    const show = (m, tile) => {
      const rec = g.adventure?.missions[m.id], playable = !!DEFS[m.id];
      detail.replaceChildren(); detail.hidden = false; detail.dataset.mission = m.id;
      const head = mk('div', 'adv-detail-head'); head.append(mk('strong', '', `${ICON[m.id] || ''} ${T(m.titles)}`), mk('span', 'adv-mission-tag', w.type[m.type] || m.type), mk('span', 'adv-mission-stars', starsText(rec?.stars || 0)));
      detail.append(head, mk('p', 'adv-mission-goal', playable ? `${w.goal}: ${goalText(m.id, m.thresholds[2])}${rec ? ` · ${w.best} ${rec.value}` : ''}` : w.soon));
      if (playable) detail.append(btn(rec ? w.replay : w.start, () => start(ctx, m.id), 'game-button adv-go adv-mini'));
      document.querySelectorAll('.adv-tile[data-mission]').forEach(t => t.setAttribute('aria-pressed', String(t === tile)));
      opts.expand?.(); detail.scrollIntoView?.({ block: 'nearest' });
    };
    const rec1 = nextMission(g, null, chap)?.id, St = window.AdventureStory;
    for (const m of ordered) {
      const rec = g.adventure?.missions[m.id], playable = !!DEFS[m.id], n = rec?.stars || 0;
      const t = btn('', () => show(m, t), 'adv-tile' + (playable ? '' : ' adv-tile-soon') + (n === 3 ? ' adv-tile-done' : '')); t.dataset.mission = m.id; t.setAttribute('aria-pressed', 'false'); if (m.id === rec1) { t.classList.add('adv-tile-next'); t.dataset.next = '1'; } if (St) t.dataset.beat = String(St.beatOf(m.id));
      t.setAttribute('aria-label', `${T(m.titles)} · ${playable ? n + '/3 ' + w.stars : w.soon}`); t.title = T(m.titles);
      t.append(mk('i', 'adv-tile-ico', ICON[m.id] || '•'), mk('span', 'adv-tile-name', SHORT[m.id] ? T(SHORT[m.id]) : T(m.titles)), mk('span', 'adv-tile-state', playable ? starsText(n) : '🔒'));
      tiles.push(t);
    }
    if (window.AdventureStory) {
      const jt = btn('', () => {
        const items = AdventureStory.journal(); detail.replaceChildren(); detail.hidden = false; detail.dataset.mission = 'journal';
        detail.append(mk('strong', '', '📖 ' + w.journal));
        if (!items.length) detail.append(mk('p', 'adv-mission-goal', w.jEmpty));
        for (const it of items) { const row = mk('p', 'adv-journal-line'); row.append(AdventureStory.bust(it.who), mk('span', '', `${it.name}: ${it.text}`)); detail.append(row); }
        opts.expand?.(); detail.scrollIntoView?.({ block: 'nearest' });
      }, 'adv-tile adv-tile-journal'); jt.append(mk('i', 'adv-tile-ico', '📖'), mk('span', 'adv-tile-name', { en: 'Journal', he: 'יומן', ru: 'Дневник' }[lang()]), mk('span', 'adv-tile-state', String(AdventureStory.journal().length))); jt.setAttribute('aria-label', w.journal); tiles.push(jt);
    }
    rest.push(detail);
    // Boss block (shown when the sheet is expanded)
    const b = A_.bosses.find(x => x.id === bossId), lvl = A_.level(g), chance = A_.chance(g, bossId), won = A_.bossWon(g, bossId), open = A_.canChallenge(g, bossId, false);
    const boss = mk('div', 'adv-boss'); boss.dataset.won = String(won);
    boss.append(mk('strong', 'adv-boss-name', `🥊 ${w.boss}: ${T(b.names)}${won ? ' · ' + w.won : ''}`));
    boss.append(mk('span', 'adv-boss-gate', `${w.fl} ${lvl} · ${w.entry} ${b.entry} · ${w.chance} ${chance}%`));
    const acts = mk('div', 'adv-actions');
    const fight = () => { if (store.game()) bossStart(ctx, bossId); };
    if (open) acts.append(btn(fill(w.fightB, { b: T(BOSS[bossId].name) }), fight));
    else if (A_.freeMode()) {
      const warn = mk('div', 'adv-warn'); warn.hidden = true; warn.setAttribute('role', 'alert');
      warn.append(mk('strong', '', w.warnT), mk('span', '', `${w.fl} ${lvl} · ${w.entry} ${b.entry} · ${w.chance} ${chance}%`));
      const wa = mk('div', 'adv-actions'); wa.append(btn(w.warnGo, fight), btn(w.warnBack, () => { warn.hidden = true; acts.hidden = false; }, 'game-button adv-go adv-alt')); warn.append(wa);
      acts.append(btn(w.fight, () => { warn.hidden = false; acts.hidden = true; warn.querySelector('button')?.focus({ preventScroll: true }); })); boss.append(warn);
    } else acts.append(mk('span', 'adv-warn-text', fill(w.locked, { n: b.entry })));
    boss.append(acts); rest.push(boss);
    // Chapter goal, story step and the one primary button (tiles stay as replay/secondary)
    const nn = nextNew(g, chap), step = nn ? window.AdventureStory?.beatOf(nn.id) || 1 : 5, goal = `${w['goal' + chap] || ''} · ${fill(w.step, { n: step })}`;
    const bname = T(BOSS[bossId].name).split(/[,،]/)[0], chStart = all.some(m => starsOf(g, m.id));
    let label = null, act = null;
    if (nn) { label = !chStart ? (chap === 1 ? w.startStory : w.startCh) : fill(w.cont, { t: T(SHORT[nn.id] || nn.titles) }); act = () => start(ctx, nn.id); }
    else if (!A_.bossWon(g, bossId)) { label = fill(w.challenge, { b: bname }); act = () => bossStart(ctx, bossId); }
    else if (chap < 5) { label = fill(w.goTo, { c: T(A_.chapters[chap].names) }); act = () => opts.select?.(pinOf(chap + 1)); }
    const primary = label ? btn(label, act, 'game-button adv-go adv-primary') : null;
    return { tiles, rest, goal, primary, recap: recapNode() };
  }
  window.AdventureOldTown = { onOpen, chapterIntro, titleCard, chapterTitle, SHORT, CH, BOSS, toastLog, reward, render, start, bossStart, goalText, defs: DEFS, get run() { return run; }, copy };
})();
