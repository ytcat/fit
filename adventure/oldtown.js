/* Old Town playable (GOTR-0008 slice C1): Coach Pip's mission list on the Old Town card, a small goal strip while a
 * mission runs on an EXISTING activity, measured results -> AdventureProgress.recordMission, and the boss bout against
 * Brick -> recordBoss. Nothing here changes how the activities work: it listens (engine.onImpact, career.onFrame,
 * career.onFight, AcademyStage.state) and measures what they already produce. Development build: everything open. */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const A = () => window.AdventureProgress, G = () => window.GotrGlossary;
  const POWER_MARK = .7; // the power meter's "strong" level (power-meter.js STRONG)
  const copy = {
    en: { startStory: 'Start the story ▶', startCh: 'Start ▶', cont: 'Continue story ▶ {t}', goTo: 'Go to {c} ▶', step: 'Step {n} of 5', recap: 'Story so far', chWord: 'Chapter', chDone: 'Chapter {n} complete', goal1: "Earn your place in Bruno's gym and beat Brick.", goal2: "Win the street's respect and beat King Hyena.",  challenge: 'Challenge {b} ▶', challengeNeed: 'Challenge {b} (Level {n} needed · you are Level {l}) ▶', fightB: 'Fight {b}', nextCh: '{c} unlocked ▶',  journal: 'Story journal', jEmpty: 'No story lines seen yet.', beat: 'Story beat',  next: 'Next mission: {t} ▶', retry: 'Retry for ★★★', map: 'Old Town map', brickGo: 'Challenge Brick ▶', brickNeed: 'Challenge Brick (Level {n} needed · you are Level {l}) ▶', market: 'Market Row unlocked ▶', xp: '+{n} XP', coins: '+{n} ◈',  coach: 'Coach Bruno, bear', missions: "Coach Bruno's missions", stars: 'stars', goal: '3 stars', best: 'Best', start: 'Start', replay: 'Replay', soon: 'Coming soon', type: { training: 'Training', funny: 'Funny', help: 'Help' }, boss: 'Boss', fl: 'Fighter Level', entry: 'Entry Level', chance: 'Chance', fight: 'Fight Brick', won: 'Beaten', warnT: 'Big difference: low chance to win', warnGo: 'Fight anyway', warnBack: 'Train first', locked: 'Locked. Reach Level {n} to challenge Brick.', quit: 'Quit mission', back: 'Back to Old Town', again: 'Try again', rematch: 'Rematch', result: 'Result', newStars: '+{n} stars', noStars: 'No new stars', measured: 'Measured', level: 'Fighter Level {a} → {b}', stat: { power: 'Power', speed: 'Speed', stamina: 'Stamina' }, none: 'Not enough yet for a star. Try again.', bossWin: 'You beat Brick!', bossLoss: 'Brick won this one. Losing costs nothing.', open: 'Market Row is open.', err: 'Could not save the result: ', noStart: 'This activity could not start right now.', mission: 'Mission' },
    he: { startStory: 'להתחיל את הסיפור ◀', startCh: 'להתחיל ◀', cont: 'להמשיך בסיפור ◀ {t}', goTo: 'ללכת אל {c} ◀', step: 'שלב {n} מתוך 5', recap: 'עד כה בסיפור', chWord: 'פרק', chDone: 'פרק {n} הושלם', goal1: 'הרוויחו את מקומכם באולם של ברונו ונצחו את בריק.', goal2: 'זכו בכבוד הרחוב ונצחו את מלך הצבועים.',  challenge: 'לאתגר את {b} ◀', challengeNeed: 'לאתגר את {b} (נדרשת רמה {n} · אתם ברמה {l}) ◀', fightB: 'להילחם ב{b}', nextCh: '{c} נפתח ◀',  journal: 'יומן הסיפור', jEmpty: 'עוד לא נראו שורות סיפור.', beat: 'שלב בסיפור',  next: 'המשימה הבאה: {t} ◀', retry: 'שוב ל-★★★', map: 'מפת העיר העתיקה', brickGo: 'לאתגר את בריק ◀', brickNeed: 'לאתגר את בריק (נדרשת רמה {n} · אתם ברמה {l}) ◀', market: 'שדרת השוק נפתחה ◀', xp: '+{n} ניסיון', coins: '+{n} ◈',  coach: 'המאמן ברונו, דוב', missions: 'המשימות של המאמן ברונו', stars: 'כוכבים', goal: '3 כוכבים', best: 'שיא', start: 'התחלה', replay: 'שוב', soon: 'בקרוב', type: { training: 'אימון', funny: 'מצחיק', help: 'עזרה' }, boss: 'בוס', fl: 'רמת לוחם', entry: 'רמת כניסה', chance: 'סיכוי', fight: 'להילחם בבריק', won: 'ניצחתם', warnT: 'פער גדול: סיכוי נמוך לנצח', warnGo: 'להילחם בכל זאת', warnBack: 'קודם להתאמן', locked: 'נעול. הגיעו לרמה {n} כדי לאתגר את בריק.', quit: 'יציאה מהמשימה', back: 'חזרה לעיר העתיקה', again: 'עוד פעם', rematch: 'קרב חוזר', result: 'תוצאה', newStars: '+{n} כוכבים', noStars: 'אין כוכבים חדשים', measured: 'נמדד', level: 'רמת לוחם {a} ← {b}', stat: { power: 'כוח', speed: 'מהירות', stamina: 'סיבולת' }, none: 'עדיין לא מספיק לכוכב. נסו שוב.', bossWin: 'ניצחתם את בריק!', bossLoss: 'בריק ניצח הפעם. הפסד לא עולה כלום.', open: 'שדרת השוק פתוחה.', err: 'לא ניתן לשמור את התוצאה: ', noStart: 'לא ניתן להתחיל את הפעילות כרגע.', mission: 'משימה' },
    ru: { startStory: 'Начать историю ▶', startCh: 'Начать ▶', cont: 'Продолжить историю ▶ {t}', goTo: 'Перейти: {c} ▶', step: 'Шаг {n} из 5', recap: 'Что было', chWord: 'Глава', chDone: 'Глава {n} пройдена', goal1: 'Заслужи место в зале Бруно и победи Брика.', goal2: 'Заслужи уважение улицы и победи Короля гиен.',  challenge: 'Вызвать: {b} ▶', challengeNeed: 'Вызвать: {b} (нужен уровень {n} · у вас {l}) ▶', fightB: 'Бой: {b}', nextCh: '{c}: открыто ▶',  journal: 'Дневник истории', jEmpty: 'Пока нет увиденных реплик.', beat: 'Эпизод',  next: 'Следующее задание: {t} ▶', retry: 'Ещё раз на ★★★', map: 'Карта Старого города', brickGo: 'Вызвать Брика ▶', brickNeed: 'Вызвать Брика (нужен уровень {n} · у вас {l}) ▶', market: 'Рыночный ряд открыт ▶', xp: '+{n} опыта', coins: '+{n} ◈',  coach: 'Тренер Бруно, медведь', missions: 'Задания тренера Бруно', stars: 'звёзды', goal: '3 звезды', best: 'Рекорд', start: 'Начать', replay: 'Ещё раз', soon: 'Скоро', type: { training: 'Тренировка', funny: 'Забавное', help: 'Помощь' }, boss: 'Босс', fl: 'Уровень бойца', entry: 'Уровень входа', chance: 'Шанс', fight: 'Бой с Бриком', won: 'Побеждён', warnT: 'Большая разница: шанс победить низкий', warnGo: 'Всё равно драться', warnBack: 'Сначала тренировка', locked: 'Закрыто. Достигните уровня {n}, чтобы бросить вызов Брику.', quit: 'Выйти из задания', back: 'Назад в Старый город', again: 'Ещё раз', rematch: 'Реванш', result: 'Результат', newStars: '+{n} звёзд', noStars: 'Новых звёзд нет', measured: 'Результат', level: 'Уровень бойца {a} → {b}', stat: { power: 'Сила', speed: 'Скорость', stamina: 'Выносливость' }, none: 'Пока не хватает на звезду. Попробуйте ещё.', bossWin: 'Вы победили Брика!', bossLoss: 'Брик выиграл в этот раз. Поражение ничего не стоит.', open: 'Рыночный ряд открыт.', err: 'Не удалось сохранить результат: ', noStart: 'Сейчас это занятие нельзя начать.', mission: 'Задание' }
  };
  const lang = () => copy[window.app?.lang] ? window.app.lang : 'en', W = () => copy[lang()];
  const T = o => o ? (o[lang()] || o.en) : '';
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const term = x => (G() ? G().term(x, lang()) : x);
  // The 3-star goal in words, boxing terms stay English.
  function goalText(id, n) {
    const l = lang(), jab = term('Jab'), cross = term('Cross'), roll = term('Roll'), hook = term('Hook'), guard = term('Guard'), slip = term('Slip'), shadow = term('Shadowboxing');
    const t = {
      // GOTR-0078 "The Dream"
      clean_gym: L(`Mop lanes: ${n} quick steps in 30 seconds`, `מסלולי סמרטוט: ${n} צעדים מהירים ב-30 שניות`, `Дорожки со шваброй: ${n} быстрых шагов за 30 секунд`),
      night_shadow: L(`${n} punches in 45 seconds of ${shadow}`, `${n} מכות ב-45 שניות של ${shadow}`, `${n} ударов за 45 секунд ${shadow}`),
      night_bag: L(`Reach the power mark ${n} times`, `הגיעו לסימן העוצמה ${n} פעמים`, `Достигните отметки силы ${n} раз`),
      bag_drill: L(`${n} hits on the new bag in 40 seconds`, `${n} פגיעות בשק החדש ב-40 שניות`, `${n} ударов по новому мешку за 40 секунд`),
      fight_prep: L(`${n} defences on the mitts (${slip}, ${roll})`, `${n} הגנות על הכפות (${slip}, ${roll})`, `${n} защит на лапах (${slip}, ${roll})`),
      advanced_training: L(`Counter after the ${slip}: ${n} clean runs`, `מכת נגד אחרי ${slip}: ${n} חזרות נקיות`, `Контратака после ${slip}: ${n} чистых повтора`),
      first_stance: L(`Block ${n} partner punches with your ${guard}`, `חסמו ${n} מכות של בן הזוג עם ${guard}`, `Отбейте ${n} ударов партнёра, держа ${guard}`),
      one_two_mitts: L(`${n} clean ${jab}-${cross} hits on the mitts`, `${n} פגיעות נקיות של ${jab}-${cross} בכפות`, `${n} чистых попаданий ${jab}-${cross} по лапам`),
      bag_power: L(`Reach the power mark ${n} times`, `הגיעו לסימן העוצמה ${n} פעמים`, `Достигните отметки силы ${n} раз`),
      roll_under_hook: L(`${roll} under ${n} coach ${hook}s`, `בצעו ${roll} מתחת ל-${n} הוקים של המאמן`, `${roll} под ${n} ${hook} тренера`),
      rope_rhythm: L(`${n} seconds of rope in rhythm`, `${n} שניות חבל בקצב`, `${n} секунд скакалки в ритме`),
      teach_the_kid: L(`Show the ${jab}-${cross} cleanly ${n} times`, `הדגימו ${jab}-${cross} נקי ${n} פעמים`, `Покажите ${jab}-${cross} чисто: ${n} раза`),
      snoring_guard: L(`Sleep talker: repeat ${n} combos he mumbles`, `מדבר מתוך שינה: חזרו על ${n} רצפים שהוא ממלמל`, `Говорун во сне: повторите ${n} серий`), // GOTR-0061 skill trials
      heavy_bag_van: L(`Brick's bag: hit every swing at its peak (${n} misses for gold)`, `השק של בריק: פגעו בכל תנופה בשיא (${n} החטאות לזהב)`, `Мешок Брика: бейте в верхней точке (${n} промахов для золота)`),
      rooftop_balloons: L(`Rooftop barrage: stay dry (${n} for gold)`, `מטח מהגגות: הישארו יבשים (${n} לזהב)`, `Обстрел с крыш: останьтесь сухим (${n} для золота)`),
      whistle_chase: L(`Cut him off: corner the raccoon 5 times in ${n} seconds`, `לחסום אותו: דחקו את הדביבון לפינה 5 פעמים ב-${n} שניות`, `Отрежь путь: загоните енота в угол 5 раз за ${n} секунд`),
      grandma_groceries: L(`The hustler's bet: ${n} clean hits on real openings`, `ההימור של הנוכל: ${n} פגיעות נקיות בפתחים אמיתיים`, `Пари жулика: ${n} чистых попаданий в настоящие окна`),
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
  const heavyHit = h => playerOn() && h.actor === 'lion' && h.receiver === 'heavy' && !h.blocked;
  const powerHit = h => { const p = window.PowerMeter?.power(h, 'heavy'); return playerOn() && p != null && p >= POWER_MARK; };
  const DEFS = {
    // ---- GOTR-0078 Chapter 1 "The Dream" (adventure/story-flow.js). Kinds: film (a 3D scene from agent/dream-1, with a
    // portrait-conversation fallback), talk (portrait conversation), story_fight (a bout whose result is a story event; any:true =
    // a loss advances too), buy (Otto's counter). Trainings reuse existing stations as clearly marked stand-ins (step.stand).
    dream_arrival: { kind: 'film', scene: 'dream_opening' },
    dream_gym_talk: { kind: 'film', scene: 'dream_gym_talk' },
    first_brick: { kind: 'story_fight', brick: true, any: true, after: 'dream_after_brick', rounds: 1, roundSeconds: 60, restSeconds: 0, opponent: L('Brick', 'בריק', 'Брик'),
      // Much stronger than the Fighter on day one (a regular partner is 0.85-1.15 power/tempo): a loss is expected, a win possible.
      foe: { power: 1.4, tempo: 1.18, skill: .1 } },
    clean_gym: { kind: 'training', mode: 'heavy', duration: 30, steps: true },
    night_shadow: { kind: 'training', mode: 'none', duration: 45, frame: (r, f) => { if (playerOn()) r.value += (f.swings || []).filter(x => x.actor === 'lion').length; } },
    night_bag: { kind: 'training', mode: 'heavy', duration: 60, imp: (r, h) => { if (powerHit(h)) r.value++; } },
    dream_apology: { kind: 'talk' },
    market_robber: { kind: 'story_fight', venue: 'street', rounds: 1, roundSeconds: 45, restSeconds: 0, opponent: L('Fang', 'פאנג', 'Фанг'), foe: { power: 1.05, tempo: 1.02, skill: .02 } },
    buy_heavy_bag: { kind: 'buy', item: 'heavy_bag' },
    bag_drill: { kind: 'training', mode: 'heavy', duration: 40, imp: (r, h) => { if (heavyHit(h)) r.value++; } },
    fight_prep: { kind: 'training', mode: 'pads', duration: 60, frame: (r, f) => { if (playerOn() && f.defences > 0) r.value += f.defences; } },
    docks_fight: { kind: 'story_fight', venue: 'docks', rounds: 2, roundSeconds: 30, restSeconds: 8, opponent: L('Hook', 'הוק', 'Хук'), foe: { power: 1.12, tempo: 1.06, skill: .05 } },
    advanced_training: { kind: 'lesson', comboId: 'counter_chain' },
    // ---- older chapter-1 missions (GOTR-0069 list): still valid in saves, no longer story steps
    heavy_bag_van: { kind: 'scene', scene: 'carry_bag' },
    snoring_guard: { kind: 'scene', scene: 'snoring_guard' }, // GOTR-0056 / GOTR-0061 skill trials in the story sets (adventure/story/story-scenes.js)
    rooftop_balloons: { kind: 'scene', scene: 'rooftop_barrage' }, whistle_chase: { kind: 'scene', scene: 'cut_him_off' }, grandma_groceries: { kind: 'scene', scene: 'hustlers_bet' },
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
      if (run && !run.ended && (run.def.kind === 'fight' || run.def.kind === 'boss' || run.def.kind === 'story_fight') && view === run.view && view.match?.result) try { fightDone(view); } catch (x) { console.warn('adventure', x); }
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
    if (r.def.kind === 'story_fight') { setTimeout(() => storyFightDone(view), 1500); return; }
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
    const order = (window.AdventureStory?.order || A().missions.map(m => m.id)).filter(id => DEFS[id] && A().missions.some(m => m.id === id) && (!chap || chapterOfId(id) === chap)).map(id => A().missions.find(m => m.id === id)), i = order.findIndex(m => m.id === afterId), cand = i < 0 ? order : [...order.slice(i + 1), ...order.slice(0, i)];
    return cand.find(m => !starsOf(g, m.id)) || cand.find(m => starsOf(g, m.id) < 3) || null;
  }
  function openMap(id, then) { cleanup(); closeBeat(); run = null; rg()?.open('adventure', { onReady: h => { selectPin = h.select; h.select(id || 'oldtown'); if (then) setTimeout(then, 300); } }); }
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
      // GOTR-0078: the story's current step comes first (films, talks and story fights included), through its BEFORE beat on the map.
      const cur = SF() ? SF().state(g, ch).current : null;
      if (cur) primary = cur.boss ? bossBtn : [fill(w.next, { t: stepLabel(cur.id) }), () => openMap(pinOf(ch), () => before(gameCtx(), cur.id))];
      else {
        const here = nm; // no story data: the recommended next mission of this chapter first
        primary = here ? [fill(w.next, { t: T(here.titles) }), go(here.id)] : bossWon && chapterBtn ? chapterBtn : bossBtn;
        if (here && !bossWon) more.push(bossBtn);
      }
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
    // The result rows can appear after the bar while the scene is idle (no frames): keep the place right until the bar goes.
    const t = setInterval(() => { if (!bar.isConnected) clearInterval(t); else placeNext(); }, 400);
  }
  // GOTR-0078 (owner: no boxes over the game): the Next row is plain buttons in the stage's bottom action band, where the game
  // pad sits during play. While it is shown the idle pad steps aside (CSS), so nothing covers a fighter or another control.
  // A control that stays (the fight result's "details" row) keeps its place: the Next row goes just under it when it fits there,
  // else just above it.
  function placeNext() {
    const bar = document.getElementById('advNext'); if (!bar) return;
    const host = bar.parentElement, hr = host.getBoundingClientRect(), h = bar.getBoundingClientRect().height || 40; let low = -Infinity, high = Infinity;
    for (const el of document.querySelectorAll('#fightResults .fight-result-actions,.ringside-toolbar')) { if (el.offsetParent === null) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && r.top > hr.top + hr.height / 2) { low = Math.max(low, r.bottom); high = Math.min(high, r.top); } }
    const pad = 6, room = hr.bottom - low - 2 * pad;
    bar.style.bottom = (low === -Infinity || room >= h ? pad : Math.max(pad, hr.bottom - high + pad)) + 'px';
  }
  // Called for every awarded activity (replaces the old full-screen card). Mission/boss runs add their own stars and Next bar.
  function reward(a) {
    const w = W(), award = a.award; toast(fill(w.xp, { n: award.xp }), 'xp'); if (award.coins) toast(fill(w.coins, { n: award.coins }), 'coin');
    for (const id of award.unlocks || []) toast('✓ ' + (rg().comboName?.(id) || id), 'gain');
    if ((!run || run.ended) && !pendingAfter) showNext({ kind: 'free' });
    return true;
  }
  function watchNext() {
    const bar = document.getElementById('advNext'); if (!bar) return; placeNext();
    const e = window.app.engine; if (e.career.active || e.arena?.fightView !== bar._view || e.targetMode !== bar._mode) bar.remove();
  }

  // GOTR-0063: leave a running mission/boss run without opening the map (the modes menu decides where to go). Returns its chapter pin.
  // GOTR-0078: Brick (agent/dream-1 StoryCast) stands in the partner slot only during his bouts; always put the partner back.
  function restoreCast(r) { try { r?.restore?.(); } catch (x) { console.warn('adventure', x); } if (r) r.restore = null; }
  function leave() { if (!run) return null; restoreCast(run); const pin = CH[chapterOfId(run.id)]?.pin || null; if (!run.ended) { if (run.def.kind === 'lesson') window.AcademyStage?.stop(); run.ended = true; try { window.app.engine.career.finish(); } catch { /* none active */ } } cleanup(); run = null; return pin; }
  function abort() { if (!run) return; restoreCast(run); const e = window.app.engine; if (run.def.kind === 'lesson') window.AcademyStage?.stop(); run.ended = true; try { e.career.finish(); } catch { /* none active */ } backToTown(); }

  function finishRun() {
    const r = run; if (!r || r.ended) return; r.ended = true; r.ui?.root.remove();
    const store = r.ctx.store, before = A().statPoints(store.game()), res = store.gameAction({ type: 'adventure', adventure: 'mission', missionId: r.id, measured: { [r.mission.metric]: r.value } });
    const after = A().statPoints(store.game()), w = W();
    if (!res.ok) toast(w.err + res.error, 'bad');
    else {
      toast(res.stars ? starsText(res.best) + (res.newStars > 0 ? ' · ' + fill(w.newStars, { n: res.newStars }) : '') : w.none, res.stars ? 'gold' : '');
      for (const k of A().stats) if (after[k] > before[k]) toast(`${w.stat[k]} +${after[k] - before[k]}`, 'gain');
    }
    stamp();
    window.dispatchEvent(new CustomEvent('adventure-mission-result', { detail: { missionId: r.id, value: r.value, result: res } }));
    afterRun(r.id, { stars: res.ok ? res.stars : 0 });
  }

  function begin(ctx, id) {
    const mission = A().missions.find(m => m.id === id), def = DEFS[id]; if (!mission || !def) return false;
    cleanup(); run = { id, mission, def, ctx, value: 0, target: mission.thresholds[2], ended: false };
    hook(); strip(run); paintStrip(); return true;
  }
  // GOTR-0056: story scenes are seen once per browser (a replay of the step shows the short lines instead).
  const seen = k => { try { return localStorage.getItem('gotr-scene-' + k) === '1'; } catch { return false; } };
  const mark = k => { try { localStorage.setItem('gotr-scene-' + k, '1'); } catch { /* fine without storage */ } };
  // GOTR-0078: the older Brick scenes star Pip as the Coach, so the Dream rematch plays none (Bruno speaks in the summary instead).
  const BOSS_SCENE = { brick: [null, null], king_hyena: ['hyena_intro', 'hyena_outro'] };

  // ---- GOTR-0069 story mode: BEFORE beat -> the step -> AFTER beat (on the map, never over the Fighter) -> Next ----
  const SF = () => window.StoryFlow, FW = () => SF().copy[lang()] || SF().copy.en;
  const snaps = {}; let pendingAfter = false, selectPin = null;
  const stepLabel = id => { const s = SF()?.find(id); if (!s) return ''; if (s.side) return `${FW().side} · ${T(s.title)}`; const st = SF().state(rg().store.game(), s.chapter), x = st.main.find(m => m.id === id); return `${x ? x.n + '. ' : ''}${T(s.title)}`; };
  const beatHost = () => document.querySelector('dialog[open].adv-dialog .adv-stage') || window.app?.engine?.stage || document.body;
  function closeBeat() { document.getElementById('sfBeat')?.remove(); }
  // Plain text on the map: kicker, title, up to three character lines, info lines and one row of buttons. No card, no box.
  function beat(o) {
    closeBeat(); const host = beatHost(), el = mk('div', 'sf-beat'); el.id = 'sfBeat'; el.dir = document.documentElement.dir || 'ltr'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    const top = mk('div', 'sf-beat-top'), foot = mk('div', 'sf-beat-foot');
    if (o.kicker) top.append(mk('p', 'sf-beat-kicker', o.kicker)); if (o.title) top.append(mk('p', 'sf-beat-title', o.title));
    for (const l of (o.lines || []).slice(0, 3)) {
      const p = mk('p', 'sf-beat-line' + (l.who ? '' : ' sf-beat-narr')), St = window.AdventureStory;
      if (l.who && St) { p.append(St.bust(l.who)); const t = mk('span'); t.append(mk('strong', '', St.who[l.who].name[lang()]), document.createTextNode(' ' + l.text)); p.append(t); } else p.textContent = l.text;
      top.append(p);
    }
    for (const t of o.info || []) if (t) foot.append(mk('p', 'sf-beat-info' + (t.cls ? ' ' + t.cls : ''), t.text ?? t));
    const row = mk('div', 'sf-beat-acts');
    for (const [label, fn, main] of o.buttons || []) row.append(btn(label, () => { closeBeat(); fn(); }, 'game-button adv-go ' + (main ? 'sf-beat-main' : 'adv-alt')));
    foot.append(row); el.append(top, foot); host.append(el);
    document.querySelector('.adv-card.open')?.classList.remove('open');
    requestAnimationFrame(() => row.querySelector('.sf-beat-main')?.focus({ preventScroll: true }));
    return el;
  }
  const gearPrice = id => window.GameDomain?.gear?.find(x => x.id === id)?.price ?? 90;
  const goalLine = s => s.boss ? `${FW().goal}: ${FW().boss} · ${W().entry} ${A().bosses.find(b => b.id === s.id).entry}` : s.goal ? `${FW().goal}: ${fill(T(s.goal), { price: gearPrice('heavy_bag') })}` : `${FW().goal}: ${goalText(s.id, A().missions.find(m => m.id === s.id).thresholds[2])}`;
  const standLine = s => s?.stand ? { text: fill(FW().stand, { t: T(s.stand) }), cls: 'sf-beat-stand' } : null;
  // A step's spoken lines, following the first Brick fight (GOTR-0078): AdventureStory.pick(id, kind, 'won' | 'lost').
  const said = (id, kind, variant) => (window.AdventureStory?.pick?.(id, kind, variant) || window.AdventureStory?.lines[id]?.[kind] || []).map(l => ({ who: l.who, text: T(l.text) }));
  const coins = () => { try { return window.GameDomain?.wallet(rg().store.game()).coins ?? 0; } catch { return 0; } };
  const kickerOf = (g, s) => { const st = SF().state(g, s.chapter); return `${fill(FW().chapter, { n: s.chapter, c: T(SF().titles[s.chapter]) })} — ${s.side ? FW().side : fill(FW().stepOf, { i: st.main.find(m => m.id === s.id)?.n || 1, n: st.total })}`; };
  // BEFORE beat: the step's scene the first time, otherwise 1-2 lines from the Coach or the character who asks; then the step.
  // GOTR-0078: film steps start with the picture at once (never text first).
  function before(ctx, id, o = {}) {
    closeBeat(); const s = SF()?.find(id), g = ctx.store.game(); if (!s || !g) return false;
    if (!o.force && !SF().playable(g, id)) return false;
    const d = DEFS[id];
    if (d?.kind === 'film') { launch(ctx, id); return true; }
    if (d?.kind === 'buy') { shop(ctx, id); return true; }
    const S = window.StoryScenes, sc = s.scene && S && !seen(s.scene) ? s.scene : null;
    const go = () => { if (d?.kind === 'talk') { recordStory(ctx, id); afterBeat(id, { ok: true }); return; } if (sc) { mark(sc); S.play(sc, { onDone: () => launch(ctx, id) }); } else launch(ctx, id); };
    if (sc && !o.lead) { go(); return true; }
    const lines = []; if (o.lead) lines.push({ text: T(o.lead) });
    if (!sc) lines.push(...said(id, 'intro', SF().firstBrick(g)).slice(0, 2));
    const label = d?.kind === 'talk' ? FW().cont : d?.kind === 'story_fight' || s.boss ? FW().fight : FW().go;
    beat({ kicker: kickerOf(g, s), title: T(s.title), lines, info: [goalLine(s), standLine(s)], buttons: [[label, go, true], [FW().back, () => {}]] });
    return true;
  }
  // Records a story event (film, talk, story fight, purchase) in the save. Returns the action result.
  function recordStory(ctx, id, outcome) {
    const res = ctx.store.gameAction({ type: 'adventure', adventure: 'story', step: id, ...(outcome ? { outcome } : {}) });
    if (!res.ok) toast(W().err + res.error, 'bad'); else { stamp(); rg()?.apply?.(); }
    return res;
  }
  // Portrait conversation (the fallback while a film is missing, and the talk steps): pages of up to three lines, tap Next.
  function conversation(g, s, pages, done) {
    const page = i => beat({ kicker: kickerOf(g, s), title: T(s.title), lines: pages[i], info: i === pages.length - 1 ? [standLine(s)] : [], buttons: [[i < pages.length - 1 ? FW().cont : FW().go, () => i < pages.length - 1 ? page(i + 1) : done(), true], [FW().skipBtn, done]] });
    pages = pages.filter(p => p.length).reduce((out, p) => { const last = out[out.length - 1]; if (last && last.length + p.length <= 3) last.push(...p); else out.push([...p]); return out; }, []);
    if (!pages.length) { done(); return; } page(0);
  }
  // Film steps (beats 0-1). The 3D scene comes from agent/dream-1 (StoryScenes ids dream_opening / dream_gym_talk); without it the
  // lines are shown as a portrait conversation. Skip always advances. On the first run the films chain: arrival -> talk -> Brick.
  function playFilm(ctx, id) {
    const S = window.StoryScenes, d = DEFS[id], s = SF().find(id), g = ctx.store.game(), fresh = !snaps[id]?.done;
    const finish = res => { recordStory(ctx, id); filmDone(ctx, id, res, fresh); };
    if (S && (S.sceneIds || []).includes(d.scene)) { rg()?.close?.(); mark(d.scene); S.play(d.scene, { onDone: finish }); return; }
    const fb = SF().firstBrick(g);
    conversation(g, s, [said(id, 'intro', fb), said(id, 'outro', fb)], () => finish({ id, skipped: true, fallback: true }));
  }
  function filmDone(ctx, id, res, fresh) {
    const i = A().dreamSteps.indexOf(id), next = A().dreamSteps[i + 1];
    if (fresh && next && DEFS[next]?.kind === 'film') { snaps[next] = { done: SF().doneOf(ctx.store.game(), SF().find(next)), stars: 0, level: A().level(ctx.store.game()) }; playFilm(ctx, next); return; }
    if (fresh && next === 'first_brick') { launch(ctx, next); return; }
    openMap(CH[1].pin, () => afterBeat(id, { ok: true }));
  }
  // Otto's Corner (beat 7): the shop counter as a beat. The purchase itself completes the step.
  function shop(ctx, id) {
    const s = SF().find(id), g = ctx.store.game(), w = FW(), price = gearPrice(DEFS[id].item), have = coins(), free = !!window.GameDomain?.freeMode?.();
    snaps[id] = { done: SF().doneOf(g, s), stars: 0, level: A().level(g) };
    const short = !free && have < price, info = [goalLine(s), { text: fill(w.have, { c: have }) }, short ? { text: fill(w.short, { k: price - have }), cls: 'sf-beat-gate' } : null, standLine(s)];
    const buy = () => { const res = recordStory(ctx, id); if (res.ok) afterBeat(id, { ok: true, bought: true }); else shop(ctx, id); };
    const buttons = short ? [[`${T(SF().find('clean_gym').title)} ▶`, () => before(ctx, 'clean_gym'), true], [w.back, () => {}]] : [[fill(w.buy, { p: price }), buy, true], [w.back, () => {}]];
    beat({ kicker: kickerOf(g, s), title: T(s.title), lines: said(id, 'intro'), info, buttons });
  }
  // Starts the step itself (no beat). Remembers the state before, so the AFTER beat can say what changed.
  function launch(ctx, id) {
    const s = SF()?.find(id), g = ctx.store.game();
    if (s && g) snaps[id] = { done: SF().doneOf(g, s), stars: starsOf(g, id), level: A().level(g) };
    if (s?.boss || BOSS[id]) { bossStart(ctx, id); return; }
    const S = window.StoryScenes, d0 = DEFS[id];
    if (d0?.kind === 'film') { playFilm(ctx, id); return; }
    if (d0?.kind === 'talk') { before(ctx, id, { force: true }); return; }
    if (d0?.kind === 'buy') { shop(ctx, id); return; }
    if (d0?.kind === 'story_fight') { storyFightStart(ctx, id); return; }
    if (d0 && d0.kind === 'scene') { if (S) S.play(d0.scene, { onDone: res => sceneDone(id, res) }); return; }
    if (!begin(ctx, id)) return;
    const d = run.def, e = window.app.engine;
    try {
      ctx.change({ type: 'venue', venueId: CH[chapterOfId(id)]?.venue || 'default' }); // the chapter's arena (Old Town gym, Market Row street)
      if (d.kind === 'training') { ctx.startTraining({ mode: d.mode, play: true, duration: d.duration, technique: d.technique }); if (!e.career.active) throw Error(W().noStart); }
      else if (d.kind === 'lesson') { const s2 = window.AcademyStage?.start(d.comboId); if (!s2?.ok) throw Error(s2?.error || W().noStart); }
      else if (d.kind === 'fight') fightStart(ctx, d, run);
    } catch (x) { const ui = run.ui; run.ended = true; ui?.txt && (ui.txt.textContent = x.message); setTimeout(() => { if (run?.ended) backToTown(); }, 1800); }
  }
  // Older entry point (Next bar, tests, QA): a story step goes through its BEFORE beat when it is a story step.
  function start(ctx, id) { if (SF()?.find(id) && SF().playable(ctx.store.game(), id)) { if (!before(ctx, id)) launch(ctx, id); } else launch(ctx, id); }
  function sceneDone(id, res) {
    const g = rg()?.store?.game(), got = res?.mission?.stars ?? res?.saved?.stars;
    if (res?.skipped && got == null && starsOf(g, id) === snaps[id]?.stars) { openMap(CH[chapterOfId(id)]?.pin); return; }
    openMap(CH[chapterOfId(id)]?.pin, () => afterBeat(id, { stars: got || 0 }));
  }
  function afterRun(id, at) { pendingAfter = true; setTimeout(() => { pendingAfter = false; openMap(CH[chapterOfId(id)]?.pin, () => afterBeat(id, at)); }, 1600); }
  // AFTER beat: the Coach reacts to the result (fail / 1-2 stars / 3 stars), the step's own line, the stars, level-up, what opened, and Next.
  function afterBeat(id, at = {}) {
    const s = SF()?.find(id), g = rg()?.store?.game(); if (!s || !g) return;
    const w = FW(), ctx = gameCtx(), snap = snaps[id] || { done: false, stars: 0, level: A().level(g) }, coach = SF().chapters[s.chapter].coach;
    const done = SF().doneOf(g, s), best = starsOf(g, id), fb = SF().firstBrick(g);
    // Story events (GOTR-0078): no stars. ok = finished now (a lost street fight is not); the first Brick fight is ok either way.
    const got = s.event ? (at.ok !== false && done ? 3 : 0) : s.boss ? (at.won ? 3 : 0) : (at.stars || 0);
    let lines, info;
    if (s.event) {
      const variant = id === 'first_brick' ? (at.won ? 'won' : 'lost') : fb;
      lines = (got ? said(id, 'outro', variant) : said(id, 'lost')).slice(0, 2);
      info = [id === 'first_brick' ? { text: at.won ? w.firstWon : w.firstLost, cls: 'sf-beat-result' } : !got ? { text: w.resultLost, cls: 'sf-beat-result' } : null,
        at.coins ? { text: fill(w.paid, { n: at.coins }), cls: 'sf-beat-up' } : null, at.bought ? { text: fill(w.bought, { t: T(window.GameDomain?.gear?.find(x => x.id === DEFS[id].item)?.names) || T(s.title) }), cls: 'sf-beat-up' } : null].filter(Boolean);
    } else {
      lines = [{ who: coach, text: T(SF().react[coach][SF().react3(got)]) }];
      const own = got > 0 ? said(id, 'outro', fb)[0] : s.boss ? said(id, 'lost')[0] : null; if (own && own.who !== coach) lines.push(own); else if (own) lines[0] = { who: own.who, text: `${lines[0].text} ${own.text}` };
      info = [{ text: s.boss ? (got ? w.resultBoss : w.resultLost) : got ? starsText(best) + (best > snap.stars ? '  ' + fill(w.newStars, { n: best - snap.stars }) : '') : w.noStar, cls: 'sf-beat-result' }];
    }
    const lvl = A().level(g); if (lvl > snap.level) info.push({ text: fill(w.levelUp, { l: lvl }), cls: 'sf-beat-up' });
    const next = SF().nextAfter(g, id);
    if (done && !snap.done) { const u = SF().unlocks(id), parts = [u.next && SF().playable(g, u.next) ? stepLabel(u.next) : null, ...u.side.map(stepLabel), u.extra ? T(u.extra) : null].filter(Boolean); if (parts.length) info.push({ text: fill(w.unlocked, { t: parts.join(' · ') }), cls: 'sf-beat-unlock' }); }
    else if (done && next) info.push({ text: fill(w.nextUp, { t: stepLabel(next) }) });
    const buttons = [];
    if (got > 0 || (done && !s.boss && !s.event)) {
      if (next) buttons.push([fill(w.next, { t: stepLabel(next) }), () => { const n2 = SF().find(next); if (n2.chapter !== s.chapter) { selectPin?.(SF().chapters[n2.chapter].pin); setTimeout(() => before(ctx, next), 400); } else before(ctx, next); }, true]);
      if (!s.boss && !s.event && best < 3) buttons.push([w.retry, () => before(ctx, id), !next]);
    } else buttons.push([w.again, () => before(ctx, id), true]);
    buttons.push([w.back, () => {}]);
    beat({ kicker: `${fill(w.chapter, { n: s.chapter, c: T(SF().titles[s.chapter]) })} — ${s.side ? w.side : stepLabel(id)}`, lines, info, buttons });
  }
  // Chapter end: the boss's outro scene has played; summary (stars, level), what opens, and Next to the new chapter's first step.
  function chapterSummary(n) {
    const g = rg()?.store?.game(); if (!g) return; const w = FW(), st = SF().state(g, n), boss = st.boss.id, ctx = gameCtx(), nx = SF().chapters[n + 1];
    const lines = said(boss, 'outro', SF().firstBrick(g)).slice(0, 2);
    const info = [{ text: fill(w.summary, { s: st.stars, m: st.maxStars, l: A().level(g) }), cls: 'sf-beat-result' }];
    if (snaps[boss] && A().level(g) > snaps[boss].level) info.push({ text: fill(w.levelUp, { l: A().level(g) }), cls: 'sf-beat-up' });
    if (st.boss.unlock) info.push({ text: fill(w.unlocked, { t: T(st.boss.unlock) }), cls: 'sf-beat-unlock' });
    const buttons = [];
    if (nx) buttons.push([fill(w.goTo, { c: T(SF().titles[n + 1]) }), () => { selectPin?.(nx.pin); setTimeout(() => titleCard(chapterTitle(n + 1), 1800, () => before(ctx, nx.steps[0].id, { lead: SF().opener[n + 1] })), 500); }, true]);
    buttons.push([w.back, () => {}]);
    beat({ kicker: fill(w.chapter, { n, c: T(SF().titles[n]) }), title: fill(w.complete, { n }), lines, info, buttons });
  }

  // Boss: a bout in the chapter's arena against an existing opponent with the boss's name and strength. Its intro scene is the step's BEFORE beat.
  function bossStart(ctx, bossId = 'brick') {
    const e = window.app.engine, b = A().bosses.find(x => x.id === bossId), cfg = BOSS[bossId], edge = A().bossEdge(ctx.store.game(), bossId);
    cleanup(); run = { id: bossId, def: { kind: 'boss' }, ctx, ended: false, mission: { titles: b.names, metric: 'wins' }, value: 0, target: 1 };
    hook(); ctx.change({ type: 'venue', venueId: CH[cfg.chapter].venue });
    if (bossId === 'brick') castBrick(run);
    ctx.startFight({ preset: 'quick', rounds: 2, roundSeconds: 30, restSeconds: 8 });
    const view = e.arena?.fightView; if (!view) { restoreCast(run); run = null; return; }
    run.view = view; const entry = view.careerEntry, m = view.match, foe = m.fighters[entry.species === 'lion' ? 'rabbit' : 'lion'];
    if (entry) entry.opponentName = cfg.name[lang()];
    // The boss hits a little harder than a regular; each Fighter Level above his entry level softens his hits 3% and slows his reactions 3%.
    foe.power *= cfg.power * edge.damage; foe.tempo *= cfg.tempo / edge.reaction; foe.skill = Math.min(.99, foe.skill + cfg.skill);
    const strip2 = mk('div', 'adv-goal'); strip2.id = 'advGoal'; strip2.dir = document.documentElement.dir || 'ltr';
    const txt = mk('span', 'adv-goal-text', `${T(b.names)} · ${W().entry} ${b.entry}`), quit = btn('×', () => abort(), 'adv-goal-quit'); quit.title = W().quit; quit.setAttribute('aria-label', W().quit); strip2.append(txt, quit); (window.app?.engine?.stage || document.body).append(strip2); run.ui = { root: strip2, txt };
  }
  function bossDone(view) {
    const r = run; if (!r || r.ended) return; r.ended = true; r.ui?.root.remove(); restoreCast(r);
    const entry = view.careerEntry, won = view.match.result.winner === entry.species, store = r.ctx.store, w = W();
    const res = store.gameAction({ type: 'adventure', adventure: 'boss', bossId: r.id, won });
    toast(res.ok ? (won ? w.bossWin : w.bossLoss) : w.err + res.error, won ? 'gold' : 'bad');
    stamp(); pendingAfter = true;
    const chp = BOSS[r.id].chapter, pin = pinOf(chp), S = window.StoryScenes, out = BOSS_SCENE[r.id]?.[1];
    if (won && res.ok) {
      lsSet('gotr.adv.route.' + chp, '1'); // the route dots still draw on the map; the story itself moves on through the summary's Next
      const go = () => { pendingAfter = false; openMap(pin, () => chapterSummary(chp)); };
      setTimeout(() => { if (S && out) S.play(out, { onDone: go }); else go(); }, 600);
    } else setTimeout(() => { pendingAfter = false; openMap(pin, () => afterBeat(r.id, { won: false })); }, 1200);
  }
  // ---- GOTR-0078 story fights: first fight vs Brick (a loss advances the story), the street fight, the Docks ----
  // Brick's look comes from agent/dream-1 (StoryCast.asOpponent); without it the partner fights under Brick's name and strength.
  function castBrick(r) {
    const e = window.app.engine, C = window.StoryCast;
    try { if (C?.outfit && e.coach) C.outfit(e.coach, 'kit'); } catch (x) { console.warn('adventure', x); }
    try { r.restore = typeof C?.asOpponent === 'function' ? C.asOpponent(e, 'brick') || null : null; } catch (x) { r.restore = null; console.warn('adventure', x); }
  }
  function goalStrip(text) {
    const strip2 = mk('div', 'adv-goal'); strip2.id = 'advGoal'; strip2.dir = document.documentElement.dir || 'ltr';
    const txt = mk('span', 'adv-goal-text', text), quit = btn('×', () => abort(), 'adv-goal-quit'); quit.title = W().quit; quit.setAttribute('aria-label', W().quit); strip2.append(txt, quit); (window.app?.engine?.stage || document.body).append(strip2); return { root: strip2, txt };
  }
  function storyFightStart(ctx, id) {
    const e = window.app.engine, d = DEFS[id], s = SF().find(id);
    cleanup(); closeBeat(); run = { id, def: d, ctx, ended: false, mission: { titles: s.title, metric: 'wins' }, value: 0, target: 1 };
    hook(); ctx.change({ type: 'venue', venueId: d.venue || CH[1].venue });
    if (d.brick) castBrick(run);
    try { ctx.startFight({ preset: 'quick', rounds: d.rounds, roundSeconds: d.roundSeconds, restSeconds: d.restSeconds }); } catch (x) { console.warn('adventure', x); }
    const view = e.arena?.fightView; if (!view) { restoreCast(run); run = null; toast(W().noStart, 'bad'); return; }
    run.view = view; const entry = view.careerEntry, foe = view.match.fighters[entry?.species === 'lion' ? 'rabbit' : 'lion'];
    if (entry && d.opponent) entry.opponentName = T(d.opponent);
    if (foe && d.foe) { foe.power *= d.foe.power; foe.tempo *= d.foe.tempo; foe.skill = Math.min(.95, foe.skill + d.foe.skill); } // skill below the cap: a skilled player can still win
    run.ui = goalStrip(`${T(s.title)} · ${goalLine(s).split(': ').slice(1).join(': ')}`);
  }
  function storyFightDone(view) {
    const r = run; if (!r || r.ended) return; r.ended = true; r.ui?.root.remove(); restoreCast(r);
    const won = view.match.result.winner === view.careerEntry.species, d = r.def, ctx = r.ctx, pin = CH[1].pin;
    // The first Brick fight records either outcome; the others only a win (a loss can be retried).
    const res = d.any || won ? recordStory(ctx, r.id, won ? 'won' : 'lost') : null;
    if (res?.ok && res.coins) toast(fill(W().coins, { n: res.coins }), 'coin');
    pendingAfter = true; const at = { ok: d.any ? !!res?.ok : won && !!res?.ok, won, coins: res?.ok ? res.coins : 0 };
    const after = () => { pendingAfter = false; openMap(pin, () => afterBeat(r.id, at)); };
    const S = window.StoryScenes;
    if (d.after && res?.ok && S && (S.sceneIds || []).includes(d.after)) setTimeout(() => { rg()?.close?.(); S.play(d.after, { outcome: won ? 'win' : 'loss', onDone: after }); }, 600);
    else setTimeout(after, 1200);
  }
  // ---- story flow (GOTR-0060): title cards, first open, Continue button, chapter goal, recap ----
  const CH_TITLE = { 1: L('The Dream', 'החלום', 'Мечта'), 2: L('Junior League', 'ליגת הנוער', 'Юниорская лига'), 3: L('The Underground', 'המחתרת', 'Подполье'), 4: L('Rising', 'בדרך למעלה', 'Восхождение'), 5: L('The Championship', 'האליפות', 'Чемпионат') };
  const chapterTitle = n => `${W().chWord} ${n} · ${T(CH_TITLE[n])}`;
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* optional */ } };
  // Plain text on the map (no box), tap to skip.
  function titleCard(text, ms = 2000, done) {
    document.getElementById('advTitleCard')?.remove();
    const el = mk('div', 'adv-title-card', text); el.id = 'advTitleCard'; el.dir = document.documentElement.dir || 'ltr'; el.setAttribute('role', 'status');
    (document.querySelector('dialog[open]') || document.body).append(el);
    let fin = false; const end = () => { if (fin) return; fin = true; clearTimeout(t); el.remove(); done?.(); }, t = setTimeout(end, ms); el.addEventListener('pointerdown', end);
  }
  // First open of Adventure for this profile (GOTR-0078): pictures first. The opening film (beat 0) chains into the gym
  // conversation (beat 1) and the first fight vs Brick (beat 2); each part can be skipped and always advances.
  function onOpen(ctx) {
    const g = ctx.store.game(), pid = ctx.store.current()?.id, key = 'gotr.adv.intro.' + pid, first = SF()?.find('dream_arrival');
    if (!g || !first || lsGet(key) === '1' || A().missions.some(m => starsOf(g, m.id)) || A().bossWon(g, 'brick') || SF().doneOf(g, first)) return false;
    lsSet(key, '1');
    // The film needs the Fighter's rig: on a cold start wait for it (up to 60 s) instead of skipping the film.
    const play = (k = 0) => { if (!window.app?.engine?.coach?.anatomy && k < 120) { setTimeout(() => play(k + 1), 500); return; } launch(gameCtx(), 'dream_arrival'); };
    play();
    return true;
  }
  function chapterIntro(n) { const k = 'ch' + n; if (seen(k) || !window.AdventureStory?.lines['chapter_' + n]) return; mark(k); window.AdventureStory.show('chapter_' + n, 'intro'); }
  const stamp = () => { lsSet('gotr.adv.last', String(Date.now())); };
  // Short tile labels (at most 10 characters); the full title is in the detail. Boxing terms stay English.
  const SHORT = {
    clean_gym: L('Clean', 'ניקיון', 'Уборка'), night_shadow: L('Shadow', 'צל', 'Тень'), night_bag: L('Old bag', 'השק הישן', 'Мешок'), bag_drill: L('Bag drill', 'שק כפול', 'Вдвоём'),
    fight_prep: L('Prep', 'הכנה', 'Подготовка'), advanced_training: L('Advanced', 'מתקדם', 'Мастерство'),
    first_stance: L('Stance', 'עמידה', 'Стойка'), one_two_mitts: L('One-two', 'ימין-שמאל', 'Двойка'), bag_power: L('Power', 'כוח', 'Сила'), roll_under_hook: L('Roll', 'Roll', 'Roll'), rope_rhythm: L('Rope', 'חבל', 'Скакалка'),
    heavy_bag_van: L('New bag', 'שק חדש', 'Мешок'), teach_the_kid: L('Teach kid', 'ללמד', 'Малыш'), morning_sparring: L('Sparring', 'ספארינג', 'Спарринг'), snoring_guard: L('Guard', 'שומר', 'Сторож'),
    curb_footwork: L('Footwork', 'רגליים', 'Шаги'), rooftop_balloons: L('Balloons', 'בלונים', 'Шарики'), whistle_chase: L('Whistle', 'משרוקית', 'Свисток'), kids_skateboard: L('Skateboard', 'סקייט', 'Скейт'), grandma_groceries: L('Grandma', 'סבתא', 'Бабушка'),
    influencer_challenge: L('Show-off', 'משפיען', 'Блогер'), clean_hands: L('Clean', 'נקי', 'Чисто'), crowd_circle: L('Crowd', 'מעגל', 'Круг'), rooftop_callout: L('Callout', 'אתגר', 'Вызов')
  };
  // GOTR-0069: the chapter sheet is a QUEST panel (chapter, step N of M, title, why, goal, reward, one primary button, progress
  // and Fighter Level), then a vertical timeline of every step (done / current / locked, side steps marked) and "Story so far".
  function render(ctx, opts = {}) {
    const w = FW(), W0 = W(), A_ = A(), F = SF(), g = ctx.store.game(), chap = opts.chapter || 1, st = F.state(g, chap), chName = T(F.titles[chap]);
    if (opts.select) selectPin = opts.select;
    const quest = mk('section', 'sf-quest'), rest = [], primary = (label, fn) => btn(label, fn, 'game-button adv-go adv-primary sf-primary');
    const kicker = text => mk('p', 'sf-kicker', text), chLine = fill(w.chapter, { n: chap, c: chName });
    const lvl = A_.level(g), toNext = F.starsToLevel(g, lvl + 1);
    // progress row: bar of finished main steps, Fighter Level and what the next level needs, and the timeline toggle
    const prog = mk('div', 'sf-prog'), bar = mk('span', 'sf-bar'), fillEl = mk('i'); fillEl.style.width = (100 * st.doneCount / st.total).toFixed(0) + '%'; bar.append(fillEl);
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(st.total)); bar.setAttribute('aria-valuenow', String(st.doneCount));
    const lv = mk('span', 'sf-level', `${st.doneCount}/${st.total} · ${fill(w.level, { l: lvl })} · ${fill(w.toNext, { k: toNext, n: lvl + 1 })}`);
    const tog = btn(w.steps + ' ▾', () => opts.expand?.(), 'sf-toggle'); prog.append(bar, lv, tog);
    if (!st.open) {
      const prev = F.chapters[chap - 1];
      quest.append(kicker(chLine), mk('p', 'sf-why', fill(w.lockedCh, { b: T(BOSS[prev.boss].name), c: T(F.titles[chap - 1]) })), primary(fill(w.goTo, { c: T(F.titles[chap - 1]) }), () => opts.select?.(prev.pin)));
    } else if (!st.current) {
      quest.append(kicker(chLine), mk('h4', 'sf-title', fill(w.complete, { n: chap })), mk('p', 'sf-why', fill(w.allDone, { n: chap })));
      const nx = F.chapters[chap + 1]; if (nx) quest.append(primary(fill(w.goTo, { c: T(F.titles[chap + 1]) }), () => opts.select?.(nx.pin)));
    } else {
      const cur = st.current, gt = cur.boss ? F.gate(g, chap) : null, m = A_.missions.find(x => x.id === cur.id);
      // GOTR-0078: the panel leads with the picture (who is in the scene), then ONE short line and the goal. No reward essay.
      if (cur.who && window.AdventureStory?.who[cur.who]) {
        const pic = mk('div', 'sf-pic'), St = window.AdventureStory; pic.append(St.bust(cur.who), mk('strong', 'sf-pic-name', T(St.who[cur.who].name)));
        quest.append(pic);
      }
      quest.append(kicker(`${chLine} — ${fill(w.stepOf, { i: cur.n, n: st.total })}`), mk('h4', 'sf-title', T(cur.title)), mk('p', 'sf-why', T(cur.why)), mk('p', 'sf-goal', goalLine(cur)));
      if (cur.stand) quest.append(mk('p', 'sf-stand', standLine(cur).text));
      const u = F.unlocks(cur.id), opens = [u.next ? T(F.find(u.next).title) : null, u.extra ? T(u.extra) : null].filter(Boolean);
      const rw = cur.boss ? opens : [w.stars, m?.stat ? fill(w.statUp, { s: W0.stat[m.stat] }) : null, opens.length ? `${w.unlocks}: ${opens.join(' · ')}` : null].filter(Boolean);
      if (cur.boss && opens.length) rw.splice(0, rw.length, `${w.unlocks}: ${opens.join(' · ')}`);
      if (rw.length && !cur.who) quest.append(mk('p', 'sf-reward', `${w.reward}: ${rw.join(' · ')}`));
      if (gt) {
        const names = gt.steps.map(id => stepLabel(id)), list = gt.steps.map(id => { const s = F.find(id); return s.side ? `${w.side} · ${T(s.title)}` : fill(w.stepN, { i: st.main.find(x => x.id === id)?.n }); });
        quest.append(mk('p', 'sf-gate', fill(w.gate, { n: gt.need, l: gt.level, k: gt.stars, list: list.join(w.gateOr) })));
        if (gt.steps[0]) quest.append(primary(`${names[0]} ▶`, () => before(ctx, gt.steps[0])));
        const more = mk('div', 'sf-more'); if (gt.steps[1]) more.append(btn(`${names[1]} ▶`, () => before(ctx, gt.steps[1]), 'game-button adv-go adv-alt sf-small'));
        if (A_.freeMode()) more.append(btn(w.fightAnyway, () => before(ctx, cur.id, { force: true }), 'game-button adv-go adv-alt sf-small'));
        if (more.children.length) quest.append(more);
      } else { const k = DEFS[cur.id]?.kind; quest.append(primary(k === 'film' ? w.watch : k === 'story_fight' || cur.boss ? w.fight : st.doneCount === 0 && !st.side.some(s => s.done) ? w.start : w.cont, () => before(ctx, cur.id))); }
    }
    quest.append(prog);
    // timeline (shown when the sheet is expanded)
    const list = mk('ol', 'sf-steps'); list.setAttribute('aria-label', w.steps);
    for (const s of st.timeline) {
      const can = s.status !== 'locked', row = mk('li', `sf-step sf-${s.status}${s.side ? ' sf-side' : ''}`), b = can ? btn('', () => before(ctx, s.id), 'sf-step-b') : mk('div', 'sf-step-b');
      if (!can) b.setAttribute('aria-disabled', 'true');
      const markTxt = s.status === 'done' ? '✓' : s.status === 'locked' ? '🔒' : s.side ? '✦' : String(s.n);
      const state = s.status === 'done' ? (s.boss ? W0.won : s.event ? w.done : starsText(s.stars)) : s.status === 'locked' ? w.locked : s.status === 'current' ? (lang() === 'he' ? '◀' : '▶') : w.side;
      b.append(mk('span', 'sf-mark', markTxt), mk('span', 'sf-name', `${s.side ? w.side + ' · ' : s.n + '. '}${T(s.title)}`), mk('span', 'sf-state', state));
      if (can) b.setAttribute('aria-label', `${s.side ? w.side : s.n}. ${T(s.title)} · ${state}`);
      row.append(b); list.append(row);
    }
    rest.push(list);
    // Story so far: one line per finished step, every chapter
    const jr = F.journal(g, lang()), sofar = mk('div', 'sf-sofar'); sofar.append(mk('strong', '', w.soFar));
    if (!jr.length) sofar.append(mk('p', '', w.soFarEmpty));
    for (const j of jr) { const n = F.state(g, j.chapter).main.find(x => x.id === j.id)?.n; sofar.append(mk('p', '', `✓ ${n ? n + '.' : w.side + ':'} ${j.text}`)); }
    rest.push(sofar);
    return { tiles: [], rest, quest, goal: null, primary: null, recap: null };
  }
  window.AdventureOldTown = { recordStory, storyFightStart, storyFightDone, playFilm, shop, before, afterBeat, chapterSummary, launch, closeBeat, onOpen, chapterIntro, titleCard, chapterTitle, SHORT, CH, BOSS, toastLog, reward, render, start, bossStart, goalText, leave, defs: DEFS, get run() { return run; }, copy };
})();
