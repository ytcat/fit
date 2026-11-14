/* Gloryland story layer (GOTR-0056, docs/adventure/STORY.md): a 1-2 line intro and outro per mission, spoken by a character with a
 * small drawn portrait, shown as plain text on the scene (no box), tap to skip. Lines already seen are kept in a journal.
 * Display only: nothing here changes rules or the save. EN/HE/RU. */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const who = {
    pip: { name: L('Mack', 'מאק', 'Мак'), look: { ears: 'long', fur: '#e9e2d4', accent: '#e63946' } },
    brick: { name: L('Brick', 'בריק', 'Брик'), look: { ears: 'round', fur: '#8a5a38', accent: '#2b364a', teeth: true } },
    dash: { name: L('Dash', 'דאש', 'Дэш'), look: { ears: 'point', fur: '#d9a441', accent: '#5fd0c7', spiky: true } },
    nephew: { name: L("Mack's nephew", 'האחיין של מאק', 'Племянник Мака'), look: { ears: 'long', fur: '#f1ece0', accent: '#f4c152', small: true } },
    guard: { name: L('Night guard', 'שומר הלילה', 'Ночной сторож'), look: { ears: 'round', fur: '#7d8795', accent: '#243044', cap: true } },
    hyena: { name: L('Hyena', 'צבוע', 'Гиена'), look: { ears: 'point', fur: '#b08a5a', accent: '#6b3b2b' } },
    king: { mono: L('KH', 'מה', 'КГ'), name: L('King Hyena', 'מלך הצבועים', 'Король гиен'), look: { ears: 'point', fur: '#8c6a3a', accent: '#c9a227', spiky: true, teeth: true } },
    raccoon: { name: L('Raccoon', 'דביבון', 'Енот'), look: { ears: 'round', fur: '#8b8f98', accent: '#2b2f3a', cap: true } },
    grandma: { name: L('Grandma', 'סבתא', 'Бабушка'), look: { ears: 'round', fur: '#d8cfc4', accent: '#8e5fa8' } },
    influencer: { name: L('Show-off', 'המתנשא', 'Хвастун'), look: { ears: 'point', fur: '#e0c8a0', accent: '#ff4d8d' } },
    vix: { name: L('Vix', 'ויקס', 'Викс'), look: { ears: 'point', fur: '#d9692f', accent: '#f3f6fb' } },
    // GOTR-0078 "The Dream" cast (docs/adventure/CHAPTER1_SCRIPT_V2.md). The Fighter is the player's boxer, shown as "You".
    fighter: { name: L('You', 'אתם', 'Ты'), look: { ears: 'round', fur: '#d9a35a', accent: '#b5562f', mane: '#8a4b22' } },
    bruno: { name: L('Coach Bruno', 'המאמן ברונו', 'Тренер Бруно'), look: { ears: 'round', fur: '#7a5a42', accent: '#5b6472', cap: true, muzzle: '#b9b2a6' } },
    fang: { name: L('Fang', 'פאנג', 'Фанг'), look: { ears: 'point', fur: '#6f737c', accent: '#17181c', teeth: true, chain: true } },
    hazel: { name: L('Mrs. Hazel', 'גברת הייזל', 'Миссис Хейзел'), look: { ears: 'point', fur: '#b98a5e', accent: '#7fa36b' } },
    otto: { name: L('Otto', 'אוטו', 'Отто'), look: { ears: 'round', fur: '#6b4a32', accent: '#2f6f8f', small: true } },
    slick: { name: L('Slick', 'סליק', 'Слик'), look: { ears: 'round', fur: '#a8865a', accent: '#4a4a52' } },
    hook: { name: L('Rourke', 'רורק', 'Рурк'), look: { ears: 'none', fur: '#5f7a4a', accent: '#3b5a7a', teeth: true } }
  };
  // Story beats of chapter 1 (STORY.md): the recommended order. Missions are ids from adventure-progress.js.
  // Chapter 1 "The Dream" (GOTR-0078): beats 0-12 and side job A, grouped by the script's build slices.
  const beats = [
    { n: 1, ids: ['dream_arrival', 'dream_gym_talk', 'first_brick'] },
    { n: 2, ids: ['clean_gym', 'night_shadow', 'night_bag', 'dream_apology'] },
    { n: 3, ids: ['market_robber', 'buy_heavy_bag'] },
    { n: 4, ids: ['bag_drill', 'fight_prep', 'docks_fight'] },
    { n: 5, ids: ['advanced_training', 'brick'] },
    // Chapter 2, Market Row (STORY.md): Vix tests footwork, the Hyena crew runs the market, the raccoon steals Mack's whistle,
    // Grandma and the skateboard, Dash takes the crowd circle first, then King Hyena.
    { n: 1, chapter: 2, ids: ['curb_footwork', 'clean_hands'] },
    { n: 2, chapter: 2, ids: ['kids_skateboard', 'rooftop_balloons'] },
    { n: 3, chapter: 2, ids: ['whistle_chase', 'rooftop_callout'] },
    { n: 4, chapter: 2, ids: ['grandma_groceries', 'influencer_challenge', 'crowd_circle'] },
    { n: 5, chapter: 2, ids: ['king_hyena'] }
  ];
  // The older chapter-1 missions (GOTR-0069 list) are no longer story steps; their lines stay for saves and the journal.
  const legacy = ['first_stance', 'one_two_mitts', 'heavy_bag_van', 'bag_power', 'snoring_guard', 'teach_the_kid', 'roll_under_hook', 'rope_rhythm', 'morning_sparring'];
  const order = beats.flatMap(b => b.ids), beatOf = id => beats.find(b => b.ids.includes(id))?.n || 0;
  const S = (w, en, he, ru) => ({ who: w, text: L(en, he, ru) });
  // intro / outro: up to two lines each. Dash walks in at the start of beat 4 as a scene line.
  // Kept short (about 70 characters at most) so a line reads at a glance on a 402 px phone.
  const lines = {
    first_stance: { intro: [S('pip', 'Feet first, kid. A house starts at the floor.', 'קודם הרגליים. בית מתחיל מהרצפה.', 'Сначала ноги. Дом начинается с пола.')], outro: [S('pip', 'Good. Now nobody tips you over. Almost nobody.', 'יפה. עכשיו אף אחד לא יפיל אתכם. כמעט.', 'Хорошо. Теперь тебя не свалить. Почти.')] },
    one_two_mitts: { intro: [S('pip', 'Jab, Cross. Hit the mitt, not my nose.', 'Jab, Cross. לכפה, לא לאף שלי.', 'Jab, Cross. В лапу, а не мне в нос.')], outro: [S('pip', 'That is a one-two. The corner by the window is yours.', 'זה ימין-שמאל. הפינה ליד החלון שלכם.', 'Вот это двойка. Угол у окна теперь твой.')] },
    heavy_bag_van: { intro: [S('brick', 'Nice gloves, rookie. The new bag is outside. It bites.', 'כפפות יפות, טירון. השק החדש בחוץ. הוא נושך.', 'Милые перчатки, салага. Новый мешок на улице. Кусается.')], outro: [S('brick', 'Huh. It did not flatten you. Beginner luck.', 'הא. הוא לא שיטח אתכם. מזל של מתחילים.', 'Хм. Он тебя не расплющил. Новичкам везёт.')] },
    bag_power: { intro: [S('pip', 'Brick says you hit like a pillow. Tell the bag.', 'בריק אומר שאתם מכים כמו כרית. ספרו לשק.', 'Брик говорит, ты бьёшь как подушка. Объясни мешку.')], outro: [S('brick', '...Who taught the pillow to punch?', '...מי לימד את הכרית להכות?', '...Кто научил подушку бить?')] },
    snoring_guard: { intro: [S('guard', 'Zzz... Jab... Hook... five more minutes, Mum...', 'זזז... Jab... Hook... עוד חמש דקות, אמא...', 'Хррр... Jab... Hook... ещё пять минут, мам...')], outro: [S('guard', 'I was not sleeping! I was guarding. With my eyes shut.', 'לא ישנתי! שמרתי. בעיניים עצומות.', 'Я не спал! Я сторожил. С закрытыми глазами.')] },
    teach_the_kid: { intro: [S('nephew', 'Uncle Mack says you know the one-two. Show me!', 'דוד מאק אמר שאתם יודעים ימין-שמאל. תראו לי!', 'Дядя Мак сказал, ты знаешь двойку. Покажи!')], outro: [S('nephew', 'Jab, Cross! Look out, world!', 'Jab, Cross! עולם, תיזהר!', 'Jab, Cross! Берегись, мир!')] },
    roll_under_hook: { intro: [S('dash', 'So this is the new one? My warm-up hits harder.', 'זה החדש? החימום שלי מכה חזק יותר.', 'Это новенький? Моя разминка бьёт сильнее.'), S('pip', 'Not yet. First you learn to Roll.', 'עוד לא. קודם לומדים Roll.', 'Рано. Сначала научись Roll.')], outro: [S('pip', 'Clean. His Hook would have hit only air.', 'נקי. ה-Hook שלו היה פוגע רק באוויר.', 'Чисто. Его Hook попал бы только в воздух.')] },
    rope_rhythm: { intro: [S('pip', 'Footwork is music. Do not step on the rope.', 'עבודת רגליים היא מוזיקה. לא לדרוך על החבל.', 'Работа ног — это музыка. На скакалку не наступать.')], outro: [S('pip', 'Light feet. Now a real round.', 'רגליים קלות. עכשיו סיבוב אמיתי.', 'Лёгкие ноги. Теперь настоящий раунд.')] },
    morning_sparring: { intro: [S('pip', 'A friendly round. Friendly still means you duck.', 'סיבוב ידידותי. גם בידידותי מתכופפים.', 'Дружеский раунд. В дружеском тоже ныряют.')], outro: [S('pip', 'You are ready. Brick is at the door. Literally.', 'אתם מוכנים. בריק בדלת. ממש בדלת.', 'Ты готов. Брик стоит в дверях. Буквально.')] },
    curb_footwork: { intro: [S('vix', 'Market Row does not wait. Show me quick feet.', 'שדרת השוק לא מחכה. תראו לי רגליים מהירות.', 'Рыночный ряд не ждёт. Покажи быстрые ноги.')], outro: [S('vix', 'Not bad for Old Town.', 'לא רע בשביל העיר העתיקה.', 'Неплохо для Старого города.')] },
    clean_hands: { intro: [S('vix', 'In the street nobody gets hit twice. Keep your hands clean.', 'ברחוב לא חוטפים פעמיים. שמרו על ידיים נקיות.', 'На улице дважды не бьют. Держи руки чистыми.')], outro: [S('vix', 'Clean. The crew noticed.', 'נקי. החבורה שמה לב.', 'Чисто. Банда заметила.')] },
    kids_skateboard: { intro: [S('hyena', 'Finders keepers, rookie. Take the board back if you can.', 'מוצא שומר, טירון. קחו את הסקייטבורד בחזרה אם אתם מסוגלים.', 'Нашёл — моё, новичок. Забери доску, если сможешь.')], outro: [S('hyena', 'Okay, okay! Take your board.', 'טוב, טוב! קחו את הסקייטבורד.', 'Ладно, ладно! Забирай доску.')] },
    rooftop_balloons: { intro: [S('vix', 'Pranksters on the roof. Slip or get wet.', 'מתיחות מהגג. התחמקו או תירטבו.', 'Шутники на крыше. Уклоняйся, или промокнешь.')], outro: [S('vix', 'Dry. Impressive.', 'יבשים. מרשים.', 'Сухой. Впечатляет.')] },
    whistle_chase: { intro: [S('raccoon', 'Nice whistle! Mine now. You will never corner me!', 'משרוקית יפה! עכשיו שלי. לא תצליחו לדחוק אותי לפינה!', 'Классный свисток! Теперь мой. В угол не загонишь!')], outro: [S('pip', 'My whistle! You cut him off like a pro.', 'המשרוקית שלי! חסמתם אותו כמו מקצוענים.', 'Мой свисток! Ты отрезал ему путь как профи.')] },
    rooftop_callout: { intro: [S('hyena', 'Hey, you! Five punches in ten seconds. Bet you cannot.', 'היי, אתם! חמש מכות בעשר שניות. מתערב שלא תצליחו.', 'Эй, ты! Пять ударов за десять секунд. Спорим, не сможешь.')], outro: [S('hyena', '...Okay, you can.', '...טוב, אתם יכולים.', '...Ладно, можешь.')] },
    grandma_groceries: { intro: [S('raccoon', 'Ten coins say you cannot touch me, champ.', 'עשרה מטבעות שלא תצליחו לגעת בי, אלופים.', 'Десять монет, что ты меня не заденешь, чемпион.')], outro: [S('raccoon', 'Okay, okay! You read me like a menu.', 'טוב, טוב! קראתם אותי כמו תפריט.', 'Ладно, ладно! Ты читаешь меня как меню.')] },
    influencer_challenge: { intro: [S('influencer', 'Beat my speed-bag challenge and I stop filming you.', 'תנצחו את אתגר שק המהירות שלי ואפסיק לצלם אתכם.', 'Побей мой рекорд на груше — и я перестану тебя снимать.')], outro: [S('influencer', 'Fine. Camera off.', 'בסדר. המצלמה כבויה.', 'Ладно. Камера выключена.')] },
    crowd_circle: { intro: [S('dash', 'Too slow, newcomer. The circle is already mine.', 'איטיים מדי, חדשים. המעגל כבר שלי.', 'Слишком медленно, новичок. Круг уже мой.'), S('vix', 'Beat three challengers and the crowd is yours.', 'נצחו שלושה מתמודדים והקהל שלכם.', 'Победи троих — и толпа твоя.')], outro: [S('vix', 'The crowd is yours. Dash was watching.', 'הקהל שלכם. דאש צפה.', 'Толпа твоя. Дэш смотрел.')] },
    king_hyena: { intro: [S('king', 'This is my market. Nobody fights here without my say.', 'זה השוק שלי. אף אחד לא נלחם כאן בלי רשותי.', 'Это мой рынок. Здесь никто не дерётся без моего слова.')], outro: [S('vix', 'You beat him. They say real fights are on at the Docks.', 'ניצחתם אותו. אומרים שיש קרבות אמיתיים בנמל.', 'Ты его победил. Говорят, настоящие бои идут в Доках.')], lost: [S('vix', 'He is big. Train and come back.', 'הוא גדול. התאמנו וחזרו.', 'Он большой. Потренируйся и возвращайся.')] },
    chapter_2: { intro: [S('vix', 'Welcome to Market Row. Everything here is fought for.', 'ברוכים הבאים לשדרת השוק. כאן נלחמים על הכול.', 'Добро пожаловать на Рыночный ряд. Здесь за всё приходится драться.')] },
    // ---- GOTR-0078 / GOTR-0084 Chapter 1 "The Dream", spoken as people talk. The Fighter: eager, a bit out of breath, respectful.
    // Bruno: gruff, dry, has seen a hundred kids like this. Brick: dismissive. Hebrew and Russian are written as native speech
    // (Hebrew: the characters say "you" to one young man, masculine singular). Variants: <kind>_won / <kind>_lost follow the first
    // Brick fight (adventure.story.firstBrick); <kind> is the default. The gym talk and the job offer match dream-core.js subtitles.
    dream_arrival: { intro: [S('fighter', 'So this is the big city... Okay. Find the gym.', 'אז זאת העיר הגדולה... טוב. למצוא את האולם.', 'Вот он, большой город... Так. Ищем зал.')],
      outro: [S('fighter', "Bruno's Gym. This is it. Breathe.", 'האולם של ברונו. זהו. לנשום.', 'Зал Бруно. Вот он. Дыши.')] },
    dream_gym_talk: { intro: [S('fighter', "Are you Bruno? I just got off the bus. I'm here to be a champion!", 'אתה ברונו? הרגע ירדתי מהאוטובוס. באתי לפה להיות אלוף!', 'Вы Бруно? Я только с автобуса. Я приехал стать чемпионом!'), S('bruno', 'You and half the city. Got money for training?', 'אתה וחצי עיר. יש לך כסף לאימונים?', 'Ты и полгорода. Деньги на тренировки есть?')],
      outro: [S('fighter', "Not a coin. But I'll do whatever it takes. The best ones started here!", 'אפילו לא שקל. אבל אעשה כל מה שצריך. הכי טובים התחילו פה!', 'Ни копейки. Но я сделаю всё что угодно. Лучшие начинали здесь!'), S('bruno', "Talk is free. Brick, glove up. Let's see what the kid is made of.", 'דיבורים זה בחינם. בריק, תעלה כפפות. בוא נראה ממה הילד עשוי.', 'Болтать нехитро. Брик, перчатки. Посмотрим, из чего парень сделан.')] },
    first_brick: { intro: [S('brick', "This one? He won't last a minute.", 'זה? הוא לא יחזיק דקה.', 'Этот? Да он и минуты не продержится.'), S('bruno', 'Hands up, kid. Just stay on your feet.', 'ידיים למעלה, ילד. רק תישאר על הרגליים.', 'Руки выше, парень. Просто устой на ногах.')],
      outro: [S('bruno', 'You lost, but you kept getting up. Deal: you clean, I train you.', 'הפסדת, אבל קמת כל פעם. עסקה: אתה מנקה, אני מאמן.', 'Проиграл, но вставал. Уговор: ты убираешь, я тренирую.'), S('fighter', 'Deal! When do we start?', 'סגרנו! מתי מתחילים?', 'Договорились! Когда начинаем?')],
      outro_won: [S('bruno', 'You beat Brick on day one. Huh. Deal: you clean, I train you.', 'ניצחת את בריק ביום הראשון. מעניין. עסקה: אתה מנקה, אני מאמן.', 'Побил Брика в первый же день? Ну надо же. Уговор: убираешь, я тренирую.'), S('fighter', 'Deal! When do we start?', 'סגרנו! מתי מתחילים?', 'Договорились! Когда начинаем?')],
      reply: [S('bruno', "You already did. Mop's over there.", 'כבר התחלת. המגב שם.', 'Уже начали. Швабра вон там.')] },
    clean_gym: { intro: [S('bruno', 'Mop in rhythm, light feet. Same as the ring.', 'מגב בקצב, רגליים קלות. בדיוק כמו בזירה.', 'Шваброй в ритм, ноги лёгкие. Как на ринге.')],
      outro: [S('bruno', 'Floor shines. Here. You earned it.', 'הרצפה מבריקה. קח. הרווחת.', 'Пол блестит. Держи. Заработал.')],
      // GOTR-0099: said inside the mop game (adventure/story/mop-game.js): job = before the shift, job_<stars> = his reaction after it
      job: [S('bruno', "Floor's yours, kid. Mop on the beat, mind the bags.", 'הרצפה שלך, ילד. מגב בקצב, ותיזהר מהשקים.', 'Пол твой, малой. Шваброй в такт и следи за мешками.')],
      job_0: [S('bruno', 'Call that clean? Again.', 'זה נקרא נקי? עוד פעם.', 'Это, по-твоему, чисто? Ещё раз.')],
      job_1: [S('bruno', 'Not bad. Quicker feet next time.', 'לא רע. בפעם הבאה רגליים יותר מהירות.', 'Неплохо. В следующий раз ноги побыстрее.')],
      job_2: [S('bruno', 'Good. You ducked that bag like a boxer.', 'יפה. התכופפת מתחת לשק כמו מתאגרף.', 'Хорошо. Под мешок нырнул как боксёр.')],
      job_3: [S('bruno', 'Floor shines. Feet like that win fights.', 'הרצפה מבריקה. עם רגליים כאלה מנצחים קרבות.', 'Пол блестит. С такими ногами бои выигрывают.')] },
    night_shadow: { intro: [S('fighter', "Brick put me down today. Tonight I find out why.", 'בריק הפיל אותי היום. הלילה אני מבין למה.', 'Сегодня Брик меня уронил. Ночью разберусь почему.'), S('fighter', 'Just me and the shadow. Jab, Cross, move.', 'רק אני והצל. Jab, Cross, לזוז.', 'Только я и тень. Jab, Cross, двигаемся.')],
      intro_won: [S('fighter', 'One lucky win means nothing. Tonight I work.', 'ניצחון אחד במזל זה כלום. הלילה עובדים.', 'Одна удачная победа — это ничего. Ночью работаю.'), S('fighter', 'Just me and the shadow. Jab, Cross, move.', 'רק אני והצל. Jab, Cross, לזוז.', 'Только я и тень. Jab, Cross, двигаемся.')],
      outro: [S('fighter', 'Again. Faster.', 'שוב. יותר מהר.', 'Ещё. Быстрее.')] },
    night_bag: { intro: [S('fighter', 'Come on, old bag. Harder. Harder!', 'יאללה, שק זקן. יותר חזק. יותר חזק!', 'Давай, старый мешок. Сильнее. Сильнее!')],
      outro: [S('fighter', 'The chain snapped... Bruno is going to kill me.', 'השרשרת נקרעה... ברונו יהרוג אותי.', 'Цепь лопнула... Бруно меня убьёт.')] },
    dream_apology: { intro: [S('fighter', "Coach, I broke the bag. I'm sorry, I'll work it off.", 'מאמן... שברתי את השק. סליחה. אני אעבוד ואחזיר.', 'Тренер... я сломал мешок. Простите. Я отработаю.'), S('bruno', "That bag was older than you. You're paying anyway.", 'השק הזה היה יותר זקן ממך. אתה משלם בכל מקרה.', 'Этот мешок был старше тебя. Платить всё равно тебе.')],
      outro: [S('bruno', 'Market. Supplies. And no fights on the way, got it?', 'לשוק. ציוד. ובלי מכות בדרך, הבנת?', 'На рынок. За припасами. И без драк по дороге, понял?')] },
    market_robber: { intro: [S('hazel', 'My bag! Somebody stop him!', 'התיק שלי! שמישהו יעצור אותו!', 'Моя сумка! Держите его!'), S('fang', 'Walk away, kid. Bare hands hurt.', 'תמשיך ללכת, ילד. ידיים חשופות כואבות.', 'Иди своей дорогой, малой. Голыми кулаками больно.')],
      outro: [S('hazel', 'You got it back! Wait, the whole market wants to thank you.', 'החזרת אותו! רגע, כל השוק רוצה להגיד לך תודה.', 'Ты её вернул! Погоди, весь рынок хочет тебя отблагодарить.'), S('fighter', "Thank you! That's a new bag for the gym.", 'תודה! זה שק חדש לאולם.', 'Спасибо! Это же новый мешок для зала.')],
      lost: [S('fang', 'Told you. Go home, kid.', 'אמרתי לך. לך הביתה, ילד.', 'Я же говорил. Иди домой, малой.')] },
    buy_heavy_bag: { intro: [S('otto', 'A heavy bag? I have just the one. Chain included.', 'שק כבד? יש לי בדיוק אחד כזה. עם שרשרת.', 'Тяжёлый мешок? Есть как раз такой. С цепью.')],
      outro: [S('otto', 'Lift with your legs, not your back.', 'להרים עם הרגליים, לא עם הגב.', 'Поднимай ногами, не спиной.')] },
    bag_drill: { intro: [S('bruno', 'Heard about the market. Let me see that bag.', 'שמעתי על השוק. בוא נראה את השק הזה.', 'Слышал про рынок. Ну-ка, покажи мешок.'), S('pip', "Other side's mine! You hit, I hit.", 'הצד השני שלי! אתה מכה, אני מכה.', 'Другая сторона моя! Ты бьёшь, я бью.')],
      outro: [S('bruno', 'First day, Brick put you down. Today the bag is shaking.', 'ביום הראשון בריק הפיל אותך. היום השק רועד.', 'В первый день Брик тебя уронил. А сегодня мешок дрожит.')],
      outro_won: [S('bruno', 'You beat Brick on day one. Now you hit like you mean it.', 'ניצחת את בריק ביום הראשון. עכשיו אתה מכה ברצינות.', 'Побил Брика в первый день. А теперь бьёшь всерьёз.')] },
    fight_prep: { intro: [S('bruno', "There's a fight. Not official. You in?", 'יש קרב. לא רשמי. אתה בפנים?', 'Есть бой. Неофициальный. Ты в деле?'), S('fighter', "I'm in!", 'בטח שאני בפנים!', 'Конечно в деле!')],
      outro: [S('pip', "Slip, Roll, Combo. You're ready. I think.", 'Slip, Roll, Combo. אתה מוכן. נראה לי.', 'Slip, Roll, Combo. Ты готов. Наверное.')] },
    docks_fight: { intro: [S('fighter', 'No ring, no gloves... this is illegal.', 'בלי זירה, בלי כפפות... זה לא חוקי.', 'Ни ринга, ни перчаток... это же незаконно.'), S('bruno', 'Your call. Walk away or fight.', 'אתה מחליט. ללכת או להילחם.', 'Тебе решать. Уйти или драться.')],
      outro: [S('slick', 'The kid can fight. Here, your cut.', 'הילד יודע להרביץ. הנה החלק שלך.', 'Малой умеет драться. Держи, твоя доля.'), S('fighter', 'This money goes to the gym.', 'הכסף הזה הולך לאולם.', 'Эти деньги — в зал.')],
      lost: [S('hook', "The Docks aren't a gym, pup.", 'הנמל זה לא אולם, גור.', 'Доки — не зал, щенок.')] },
    advanced_training: { intro: [S('bruno', 'Slip, then answer. Every Slip opens a door.', 'Slip, ואז לענות. כל Slip פותח דלת.', 'Slip — и сразу ответ. Каждый Slip открывает дверь.')],
      outro: [S('bruno', "Now you're ready for Brick.", 'עכשיו אתה מוכן לבריק.', 'Вот теперь ты готов к Брику.')] },
    brick: { intro: [S('brick', 'Back for more? Last time you were on the floor.', 'חזרת לעוד? בפעם שעברה שכבת על הרצפה.', 'Ещё захотел? В прошлый раз ты лежал на полу.'), S('bruno', "The whole neighbourhood's here. Show them.", 'כל השכונה פה. תראה להם.', 'Весь район здесь. Покажи им.')],
      intro_won: [S('brick', 'Day one was luck. Tonight the whole street sees it.', 'היום הראשון היה מזל. הערב כל השכונה תראה.', 'В первый день тебе повезло. Сегодня это увидит весь район.'), S('bruno', "The whole neighbourhood's here. Show them.", 'כל השכונה פה. תראה להם.', 'Весь район здесь. Покажи им.')],
      outro: [S('bruno', 'Now you need real gear and a real league.', 'עכשיו אתה צריך ציוד אמיתי וליגה אמיתית.', 'Теперь тебе нужна настоящая экипировка и настоящая лига.'), S('brick', 'Good fight, champ. I mean it.', 'קרב טוב, אלוף. ברצינות.', 'Хороший бой, чемпион. Честно.')],
      lost: [S('bruno', 'Not yet. Train, and he goes down next time.', 'עוד לא. תתאמן, ובפעם הבאה הוא נופל.', 'Пока нет. Тренируйся — и в следующий раз он ляжет.')] },
  };
  // The lines for a step and kind, following the first Brick fight: lines[id][kind + '_won'|'_lost'] when it exists, else lines[id][kind].
  const pick = (id, kind, firstBrick) => (firstBrick && lines[id]?.[kind + '_' + firstBrick]) || lines[id]?.[kind] || [];
  const KEY = 'gotr.adv.story';
  const seenSet = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const markSeen = id => { try { const s = seenSet(); if (!s.includes(id)) { s.push(id); localStorage.setItem(KEY, JSON.stringify(s)); } } catch { /* optional */ } };
  const lang = () => ['en', 'he', 'ru'].includes(window.app?.lang) ? window.app.lang : 'en';
  // Small drawn bust: head, ears, shoulders. No emoji.
  // GOTR-0081: portraits come from adventure/portraits.js (3D head renders / monogram badges in a metal ring). The drawn bust
  // below is only the last fallback when that module is not loaded.
  function bust(id) {
    if (window.StoryPortraits) return window.StoryPortraits.el(id, { name: who[id]?.name?.[lang()] || '', mono: who[id]?.mono?.[lang()], accent: who[id]?.look?.accent });
    const k = who[id]?.look || {}, ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('width', '40'); svg.setAttribute('height', '40'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('adv-bust');
    const add = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v); svg.append(n); return n; };
    add('circle', { cx: 20, cy: 20, r: 20, fill: '#1a2230' });
    add('path', { d: 'M4 40 C6 30 14 28 20 28 C26 28 34 30 36 40Z', fill: k.accent || '#2b364a' });
    if (k.mane) add('circle', { cx: 20, cy: 19, r: 15, fill: k.mane }); // the lion Fighter: a mane behind the head
    if (k.ears === 'none') { /* crocodile: no ears */ }
    else if (k.ears === 'long') { add('ellipse', { cx: 14, cy: 8, rx: 3, ry: 9, fill: k.fur }); add('ellipse', { cx: 26, cy: 8, rx: 3, ry: 9, fill: k.fur }); }
    else if (k.ears === 'point') { add('path', { d: 'M9 14 L12 3 L18 11Z', fill: k.fur }); add('path', { d: 'M31 14 L28 3 L22 11Z', fill: k.fur }); }
    else { add('circle', { cx: 11, cy: 11, r: 4, fill: k.fur }); add('circle', { cx: 29, cy: 11, r: 4, fill: k.fur }); }
    add('ellipse', { cx: 20, cy: 20, rx: k.small ? 8 : 10, ry: k.small ? 8 : 10, fill: k.fur });
    if (k.muzzle) add('ellipse', { cx: 20, cy: 23.5, rx: 5.5, ry: 4, fill: k.muzzle });
    if (k.chain) add('path', { d: 'M13 31 Q20 36 27 31', stroke: '#e0b23a', 'stroke-width': 1.6, fill: 'none' });
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
    (document.querySelector('dialog[open]') || window.app?.engine?.stage || document.body).append(el); cur = { el, i: 0 };
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
    for (const id of [...order, ...legacy]) for (const kind of Object.keys(lines[id] || {})) (lines[id]?.[kind] || []).forEach((l, i) => { if (seen.includes(id + '.' + kind + '.' + i)) out.push({ id, kind, who: l.who, name: who[l.who].name[lang()], text: l.text[lang()] }); });
    return out;
  }
  // A line said somewhere else (a skill game's own screen) goes into the journal too.
  const mark = (id, kind, i = 0) => markSeen(id + '.' + kind + '.' + i);
  const api = { pick, legacy, who, beats, order, beatOf, lines, show, stop, journal, bust, mark, seen: seenSet, reset: () => { try { localStorage.removeItem(KEY); } catch { /* optional */ } } };
  if (typeof module !== 'undefined') module.exports = api; else window.AdventureStory = api;
})();
