/* Gloryland story layer (GOTR-0056, docs/adventure/STORY.md): a 1-2 line intro and outro per mission, spoken by a character with a
 * small drawn portrait, shown as plain text on the scene (no box), tap to skip. Lines already seen are kept in a journal.
 * Display only: nothing here changes rules or the save. EN/HE/RU. */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const who = {
    pip: { name: L('Coach Pip', 'המאמן פיפ', 'Тренер Пип'), look: { ears: 'long', fur: '#e9e2d4', accent: '#e63946' } },
    brick: { name: L('Brick', 'בריק', 'Брик'), look: { ears: 'round', fur: '#8a5a38', accent: '#2b364a', teeth: true } },
    dash: { name: L('Dash', 'דאש', 'Дэш'), look: { ears: 'point', fur: '#d9a441', accent: '#5fd0c7', spiky: true } },
    nephew: { name: L("Pip's nephew", 'האחיין של פיפ', 'Племянник Пипа'), look: { ears: 'long', fur: '#f1ece0', accent: '#f4c152', small: true } },
    guard: { name: L('Night guard', 'שומר הלילה', 'Ночной сторож'), look: { ears: 'round', fur: '#7d8795', accent: '#243044', cap: true } },
    vix: { name: L('Vix', 'ויקס', 'Викс'), look: { ears: 'point', fur: '#d9692f', accent: '#f3f6fb' } }
  };
  // Story beats of chapter 1 (STORY.md): the recommended order. Missions are ids from adventure-progress.js.
  const beats = [
    { n: 1, ids: ['first_stance', 'one_two_mitts'] },
    { n: 2, ids: ['heavy_bag_van', 'bag_power'] },
    { n: 3, ids: ['snoring_guard', 'teach_the_kid'] },
    { n: 4, ids: ['roll_under_hook', 'rope_rhythm', 'morning_sparring'] },
    { n: 5, ids: ['brick'] }
  ];
  const order = beats.flatMap(b => b.ids), beatOf = id => beats.find(b => b.ids.includes(id))?.n || 0;
  const S = (w, en, he, ru) => ({ who: w, text: L(en, he, ru) });
  // intro / outro: up to two lines each. Dash walks in at the start of beat 4 as a scene line.
  const lines = {
    first_stance: { intro: [S('pip', 'Nobody trains alone on my watch. Plant your feet: that is your stance.', 'אף אחד לא מתאמן לבד אצלי. עמדו יציב: זו עמדת הפתיחה שלכם.', 'Под моим присмотром никто не тренируется один. Встань устойчиво: это твоя стойка.')], outro: [S('pip', 'Good. Everything else grows from that.', 'יפה. כל השאר גדל מזה.', 'Хорошо. Всё остальное растёт отсюда.')] },
    one_two_mitts: { intro: [S('pip', 'Jab, cross. Hit the mitt, not the air.', 'Jab, Cross. פגעו בכפה, לא באוויר.', 'Jab, Cross. Бей в лапу, а не в воздух.')], outro: [S('pip', 'That is a one-two. You have a corner here.', 'זה ימין-שמאל. יש לכם פינה אצלנו.', 'Вот это двойка. У тебя теперь есть угол в этом зале.')] },
    heavy_bag_van: { intro: [S('brick', 'Nice gloves, newcomer. Carry the new bag in, if you can lift it.', 'כפפות יפות, חדש. תכניסו את השק החדש, אם אתם מצליחים להרים אותו.', 'Красивые перчатки, новичок. Занеси новый мешок, если поднимешь.')], outro: [S('brick', 'Hmph. Lucky.', 'המ. מזל.', 'Хм. Повезло.')] },
    bag_power: { intro: [S('pip', 'Brick thinks you are soft. Show the bag.', 'בריק חושב שאתם רכים. תראו לשק.', 'Брик думает, что ты слабак. Покажи это мешку.')], outro: [S('brick', '...That was not luck.', '...זה לא היה מזל.', '...Это не было везением.')] },
    snoring_guard: { intro: [S('guard', 'Zzz... five more minutes...', 'זזז... עוד חמש דקות...', 'Зззз... ещё пять минуточек...')], outro: [S('guard', 'Oh! Opening time already?', 'או! כבר זמן פתיחה?', 'О! Уже пора открываться?')] },
    teach_the_kid: { intro: [S('nephew', 'Uncle Pip says you can show me a one-two?', 'דוד פיפ אמר שאתם יכולים להראות לי ימין-שמאל?', 'Дядя Пип говорит, ты покажешь мне двойку?')], outro: [S('nephew', 'Jab, cross! I am doing it!', 'Jab, Cross! אני עושה את זה!', 'Jab, Cross! У меня получается!')] },
    roll_under_hook: { intro: [S('dash', 'Is this the new guy? Cute. Watch how fast I finish a regular.', 'זה החדש? חמוד. תראו כמה מהר אני מסיים קבוע.', 'Это новенький? Мило. Смотри, как быстро я укладываю завсегдатая.'), S('pip', 'Not yet for you. Learn to roll first.', 'עוד לא בשבילכם. קודם לומדים Roll.', 'Тебе ещё рано. Сначала научись Roll.')], outro: [S('pip', 'Clean rolls. Dash would not have landed that.', 'גלגולים נקיים. דאש לא היה פוגע.', 'Чистые Roll. Дэшу бы не попасть.')] },
    rope_rhythm: { intro: [S('pip', 'Footwork is rhythm. Skip.', 'עבודת רגליים היא קצב. קפצו.', 'Работа ног — это ритм. Прыгай.')], outro: [S('pip', 'Light feet. Now a real round.', 'רגליים קלות. עכשיו סיבוב אמיתי.', 'Лёгкие ноги. Теперь настоящий раунд.')] },
    morning_sparring: { intro: [S('pip', 'A friendly round with a regular. Show me the roll.', 'סיבוב ידידותי עם קבוע. תראו לי את ה-Roll.', 'Дружеский раунд с завсегдатаем. Покажи мне Roll.')], outro: [S('pip', 'You are ready. Brick is waiting.', 'אתם מוכנים. בריק מחכה.', 'Ты готов. Брик ждёт.')] },
    brick: { intro: [S('brick', 'My gym, my spot. Prove you belong.', 'האולם שלי, המקום שלי. תוכיחו שמגיע לכם.', 'Мой зал, моё место. Докажи, что ты здесь не зря.')], outro: [S('pip', 'Take my old hand wraps. Go see Vix at Market Row.', 'קחו את חבישות הידיים הישנות שלי. לכו לראות את ויקס בשדרת השוק.', 'Возьми мои старые бинты. Иди к Викс на Рыночный ряд.')], lost: [S('pip', 'You lost a round, not the fight. Train and come back.', 'הפסדתם סיבוב, לא את הקרב. התאמנו וחזרו.', 'Ты проиграл раунд, а не бой. Потренируйся и возвращайся.')] }
  };
  const KEY = 'gotr.adv.story';
  const seenSet = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const markSeen = id => { try { const s = seenSet(); if (!s.includes(id)) { s.push(id); localStorage.setItem(KEY, JSON.stringify(s)); } } catch { /* optional */ } };
  const lang = () => ['en', 'he', 'ru'].includes(window.app?.lang) ? window.app.lang : 'en';
  // Small drawn bust: head, ears, shoulders. No emoji.
  function bust(id) {
    const k = who[id]?.look || {}, ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('width', '40'); svg.setAttribute('height', '40'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('adv-bust');
    const add = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v); svg.append(n); return n; };
    add('circle', { cx: 20, cy: 20, r: 20, fill: '#1a2230' });
    add('path', { d: 'M4 40 C6 30 14 28 20 28 C26 28 34 30 36 40Z', fill: k.accent || '#2b364a' });
    if (k.ears === 'long') { add('ellipse', { cx: 14, cy: 8, rx: 3, ry: 9, fill: k.fur }); add('ellipse', { cx: 26, cy: 8, rx: 3, ry: 9, fill: k.fur }); }
    else if (k.ears === 'point') { add('path', { d: 'M9 14 L12 3 L18 11Z', fill: k.fur }); add('path', { d: 'M31 14 L28 3 L22 11Z', fill: k.fur }); }
    else { add('circle', { cx: 11, cy: 11, r: 4, fill: k.fur }); add('circle', { cx: 29, cy: 11, r: 4, fill: k.fur }); }
    add('ellipse', { cx: 20, cy: 20, rx: k.small ? 8 : 10, ry: k.small ? 8 : 10, fill: k.fur });
    if (k.spiky) add('path', { d: 'M10 14 L13 7 L17 12 L20 5 L23 12 L27 7 L30 14Z', fill: k.fur });
    if (k.cap) add('path', { d: 'M9 15 Q20 4 31 15Z', fill: '#243044' });
    add('circle', { cx: 16.5, cy: 19, r: 1.3, fill: '#111' }); add('circle', { cx: 23.5, cy: 19, r: 1.3, fill: '#111' });
    add('path', { d: k.spiky ? 'M16 25 Q20 28 24 24' : 'M17 25 Q20 27 23 25', stroke: '#111', 'stroke-width': 1.2, fill: 'none' });
    if (k.teeth) add('rect', { x: 18.5, y: 25.5, width: 3, height: 3.5, fill: '#fff' });
    return svg;
  }
  let cur = null;
  function stop() { if (cur) { clearTimeout(cur.timer); cur.el.remove(); cur = null; } }
  // Plays the lines one after another as plain text with a small portrait; a tap skips to the next line.
  function show(id, kind) {
    stop();
    const list = lines[id]?.[kind]; if (!list?.length) return false;
    const el = document.createElement('div'); el.className = 'adv-story'; el.id = 'advStory'; el.dir = document.documentElement.dir || 'ltr'; el.setAttribute('role', 'status');
    document.body.append(el); cur = { el, i: 0 };
    const next = () => {
      clearTimeout(cur.timer); const line = list[cur.i++]; if (!line) { stop(); return; }
      const w = who[line.who]; el.replaceChildren(bust(line.who)); const t = document.createElement('p'), n = document.createElement('strong');
      n.textContent = w.name[lang()]; t.append(n, document.createTextNode(' ' + line.text[lang()])); el.append(t); markSeen(id + '.' + kind + '.' + (cur.i - 1)); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      cur.timer = setTimeout(next, 3600);
    };
    el.addEventListener('pointerdown', next); next(); return true;
  }
  // Journal: every line already seen, in story order.
  function journal() {
    const seen = seenSet(), out = [];
    for (const id of order) for (const kind of ['intro', 'outro', 'lost']) (lines[id]?.[kind] || []).forEach((l, i) => { if (seen.includes(id + '.' + kind + '.' + i)) out.push({ id, kind, who: l.who, name: who[l.who].name[lang()], text: l.text[lang()] }); });
    return out;
  }
  const api = { who, beats, order, beatOf, lines, show, stop, journal, bust, seen: seenSet, reset: () => { try { localStorage.removeItem(KEY); } catch { /* optional */ } } };
  if (typeof module !== 'undefined') module.exports = api; else window.AdventureStory = api;
})();
