/* Story mode (GOTR-0069): each chapter is an ORDERED list of numbered story steps. Exactly one main step is current;
 * finished steps (at least one star, or the boss beaten) stay finished and can be replayed; later steps are locked.
 * Side steps are optional and appear once the step they follow is finished. A step's state is derived from the adventure save:
 * mission stars, boss wins and, for chapter 1 "The Dream" (GOTR-0078), adventure.story (films, talks, story fights, the purchase;
 * older saves are mapped once by adventure-progress.js migrate).
 * Data + pure rules + EN/HE/RU story text. Works in node (tests) and the browser (window.StoryFlow). */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  // S(id, title, why, recap, opts): why = why the Fighter does this NOW (who asked, what is at stake); recap = one line for "Story so far".
  const S = (id, title, why, recap, o = {}) => ({ id, title, why, recap, ...o });
  const chapters = {
    // GOTR-0078 Chapter 1 "The Dream" (docs/adventure/CHAPTER1_SCRIPT_V2.md): beats 0-12 + side job A. Ids are stable and listed in
    // adventure-progress.js dreamSteps (save order and old-save mapping). why = ONE short line under the picture; who = the face shown.
    // event: finished by a story event (film, talk, fight, purchase), not by stars. stand: what still stands in for the real scene.
    1: { coach: 'bruno', pin: 'oldtown', boss: 'brick', steps: [
      S('dream_arrival', L('The big city', 'העיר הגדולה', 'Большой город'),
        L('The bus stops. One bag, no money, and a dream.', 'האוטובוס עוצר. תיק אחד, בלי כסף, וחלום.', 'Автобус останавливается. Одна сумка, ни денег, и мечта.'),
        L('Came to the big city with one bag, no money and a dream: world champion.', 'הגעתם לעיר הגדולה עם תיק אחד, בלי כסף ועם חלום: אלוף העולם.', 'Приехал в большой город с одной сумкой, без денег и с мечтой: стать чемпионом мира.'),
        { event: true, who: 'fighter', beat: 0, goal: L('Watch the arrival (Skip any time)', 'צפו בהגעה (אפשר לדלג)', 'Посмотри приезд (можно пропустить)') }),
      S('dream_gym_talk', L('Coach Bruno', 'המאמן ברונו', 'Тренер Бруно'),
        L('Bruno ran this gym before you were born. Ask him for a chance.', 'ברונו מנהל את האולם הזה עוד לפני שנולדתם. בקשו ממנו הזדמנות.', 'Бруно держит этот зал дольше, чем ты живёшь. Попроси у него шанс.'),
        L('Asked Coach Bruno for a chance. "Words are cheap. Show me."', 'ביקשתם מהמאמן ברונו הזדמנות. "מילים זה זול. תראו לי."', 'Попросил тренера Бруно о шансе. «Слова дёшевы. Покажи».'),
        { event: true, who: 'bruno', beat: 1, goal: L('Talk to Coach Bruno (Skip any time)', 'דברו עם המאמן ברונו (אפשר לדלג)', 'Поговори с тренером Бруно (можно пропустить)') }),
      S('first_brick', L('First fight: Brick', 'קרב ראשון: בריק', 'Первый бой: Брик'),
        L('Brick is the gym champion. Win or lose, get up.', 'בריק הוא אלוף האולם. בניצחון או בהפסד, קומו.', 'Брик — чемпион зала. Победа или поражение — вставай.'),
        L('Lost to Brick on the first day, but got up. Bruno gave you a job and a bed.', 'הפסדתם לבריק ביום הראשון, אבל קמתם. ברונו נתן לכם עבודה ומיטה.', 'В первый день проиграл Брику, но встал. Бруно дал тебе работу и койку.'),
        { event: true, who: 'brick', beat: 2, recapWon: L('Beat Brick on the first day. Bruno gave you a job and a bed.', 'ניצחתם את בריק ביום הראשון. ברונו נתן לכם עבודה ומיטה.', 'В первый же день побил Брика. Бруно дал тебе работу и койку.'),
          goal: L('Fight Brick. Win or lose, the story goes on.', 'הילחמו בבריק. בניצחון או בהפסד, הסיפור ממשיך.', 'Бой с Бриком. Победа или поражение — история продолжается.'),
          unlock: L('a job, a bed and the night gym', 'עבודה, מיטה והאולם בלילה', 'работа, койка и ночной зал') }),
      S('clean_gym', L('Clean the gym', 'לנקות את האולם', 'Уборка зала'),
        L('Your job: mop in rhythm, feet light. Small pay.', 'העבודה שלכם: סמרטוט בקצב, רגליים קלות. שכר קטן.', 'Твоя работа: швабра в ритм, ноги лёгкие. Плата небольшая.'),
        L("Took the job: cleaning Bruno's gym.", 'קיבלתם את העבודה: לנקות את האולם של ברונו.', 'Взялся за работу: убирать зал Бруно.'),
        { side: true, after: 'first_brick', who: 'bruno', beat: 'A', stand: L('footwork on the heavy bag stands in for the mop lanes', 'עבודת רגליים מול השק במקום מסלולי הסמרטוט', 'работа ног у мешка вместо дорожек со шваброй') }),
      S('night_shadow', L('Night Shadowboxing', 'Shadowboxing בלילה', 'Shadowboxing ночью'),
        L('Night, the gym is empty. Just you and your shadow.', 'לילה, האולם ריק. רק אתם והצל.', 'Ночь, зал пуст. Только ты и твоя тень.'),
        L('Trained Shadowboxing alone at night.', 'התאמנתם Shadowboxing לבד בלילה.', 'Ночью в одиночку тренировал Shadowboxing.'),
        { who: 'fighter', beat: 3 }),
      S('night_bag', L('The old bag', 'השק הישן', 'Старый мешок'),
        L('Still night. Hit the old heavy bag like you mean it.', 'עדיין לילה. הכו בשק הכבד הישן ברצינות.', 'Всё та же ночь. Бей старый тяжёлый мешок всерьёз.'),
        L('Hit the old heavy bag so hard the chain snapped.', 'הכיתם בשק הישן כל כך חזק שהשרשרת נקרעה.', 'Бил старый мешок так, что лопнула цепь.'),
        { who: 'fighter', beat: 4, stand: L('the bag-break scene is still to come', 'סצנת השק הנופל עוד תגיע', 'сцена падения мешка ещё впереди') }),
      S('dream_apology', L('Owning up', 'לקחת אחריות', 'Признание'),
        L('The bag is on the floor. Tell Bruno before he finds it.', 'השק על הרצפה. ספרו לברונו לפני שהוא ימצא.', 'Мешок на полу. Скажи Бруно, пока он сам не нашёл.'),
        L('Owned up to Bruno and went to the market for supplies.', 'סיפרתם לברונו את האמת ויצאתם לשוק להביא ציוד.', 'Признался Бруно и пошёл на рынок за припасами.'),
        { event: true, who: 'bruno', beat: 5, goal: L('Own up to Bruno', 'ספרו לברונו', 'Признайся Бруно'), stand: L('portraits stand in for the gym scene and the walk', 'דיוקנאות במקום סצנת האולם וההליכה', 'портреты вместо сцены в зале и прогулки') }),
      S('market_robber', L('The robber', 'השודד', 'Грабитель'),
        L("Market Row. A wolf just grabbed a lady's handbag.", 'שדרת השוק. זאב חטף עכשיו תיק לגברת.', 'Рыночный ряд. Волк только что вырвал сумку у дамы.'),
        L('Stopped Fang the robber; the market paid for a new heavy bag.', 'עצרתם את השודד פאנג; השוק שילם על שק כבד חדש.', 'Остановил грабителя Фанга; рынок заплатил за новый тяжёлый мешок.'),
        { event: true, who: 'fang', beat: 6, goal: L('Win the street fight', 'נצחו בקרב הרחוב', 'Выиграй уличную драку'), stand: L('a street bout with gloves stands in for the bare-hand fight at the market', 'קרב רחוב עם כפפות במקום הקרב בידיים חשופות בשוק', 'уличный бой в перчатках вместо драки голыми руками на рынке') }),
      S('buy_heavy_bag', L('A new bag', 'שק חדש', 'Новый мешок'),
        L("Otto's Corner. The reward pays for a new heavy bag.", 'הפינה של אוטו. הפרס משלם על שק כבד חדש.', 'Лавка Отто. Награды хватит на новый тяжёлый мешок.'),
        L("Bought a new heavy bag at Otto's Corner.", 'קניתם שק כבד חדש בפינה של אוטו.', 'Купил новый тяжёлый мешок в лавке Отто.'),
        { event: true, who: 'otto', beat: 7, goal: L('Buy the heavy bag: {price} ◈', 'קנו את השק הכבד: {price} ◈', 'Купи тяжёлый мешок: {price} ◈'), stand: L("the shop counter is shown here until Otto's Corner is built", 'הדלפק מוצג כאן עד שהפינה של אוטו תיבנה', 'прилавок показан здесь, пока лавка Отто не построена') }),
      S('bag_drill', L('Two-sided drill', 'תרגיל משני הצדדים', 'Мешок с двух сторон'),
        L('Bruno heard about the market. Test the new bag with Mack.', 'ברונו שמע על השוק. בדקו את השק החדש עם מאק.', 'Бруно слышал про рынок. Проверь новый мешок с Маком.'),
        L('Tested the new bag with Mack, from both sides.', 'בדקתם את השק החדש עם מאק, משני הצדדים.', 'Проверил новый мешок с Маком, с двух сторон.'),
        { who: 'bruno', beat: 8, stand: L('the heavy bag alone stands in for the drill with Mack', 'השק לבד במקום התרגיל עם מאק', 'один мешок вместо упражнения с Маком') }),
      S('fight_prep', L('Fight preparation', 'הכנה לקרב', 'Подготовка к бою'),
        L('An unofficial fight is coming. Mitts, Slip and Roll with Mack.', 'קרב לא רשמי בדרך. כפות, Slip ו-Roll עם מאק.', 'Скоро неофициальный бой. Лапы, Slip и Roll с Маком.'),
        L('Said yes to an unofficial fight and trained for it with Mack.', 'הסכמתם לקרב לא רשמי והתאמנתם אליו עם מאק.', 'Согласился на неофициальный бой и готовился к нему с Маком.'),
        { who: 'pip', beat: 9 }),
      S('docks_fight', L('The Docks', 'הנמל', 'Доки'),
        L('Night at the Docks. No ring, no gloves, cash on a barrel.', 'לילה בנמל. בלי זירה, בלי כפפות, כסף על חבית.', 'Ночь в Доках. Ни ринга, ни перчаток, деньги на бочке.'),
        L('Won a bare-knuckle fight against Rourke at the Docks.', 'ניצחתם את רורק בקרב בלי כפפות בנמל.', 'Выиграл бой без перчаток против Рурка в Доках.'),
        { event: true, who: 'hook', beat: 10, goal: L('Win the fight at the Docks', 'נצחו בקרב בנמל', 'Выиграй бой в Доках'), stand: L('a bout with gloves in the Docks arena stands in for the bare-knuckle fight', 'קרב עם כפפות בזירת הנמל במקום הקרב בלי כפפות', 'бой в перчатках на арене Доков вместо боя без перчаток') }),
      S('advanced_training', L('Advanced training', 'אימון מתקדם', 'Продвинутая тренировка'),
        L('Longer Combos: a counter after the Slip, body then head.', 'Combo ארוכים יותר: מכת נגד אחרי Slip, גוף ואז ראש.', 'Длинные Combo: контратака после Slip, корпус, потом голова.'),
        L('Learned to counter after a Slip. Bruno taught you his finisher, the Sunday Punch.', 'למדתם להחזיר מכה אחרי Slip. ברונו לימד אתכם את מכת הסיום שלו, Sunday Punch.', 'Научился контратаковать после Slip. Бруно научил тебя своему добивающему удару — Sunday Punch.'),
        { who: 'bruno', beat: 11 }),
      S('brick', L('Rematch: Brick', 'קרב חוזר: בריק', 'Реванш: Брик'),
        L('Fight night at the gym. The whole neighbourhood came to watch.', 'ערב קרבות באולם. כל השכונה באה לראות.', 'Вечер боёв в зале. Посмотреть пришёл весь район.'),
        L('Beat Brick in front of the whole neighbourhood.', 'ניצחתם את בריק מול כל השכונה.', 'Победил Брика на глазах у всего района.'),
        { boss: true, who: 'brick', beat: 12, unlock: L('Chapter 2: Junior League', 'פרק 2: ליגת הנוער', 'Глава 2: Юниорская лига'), stand: L('the gym ring stands in for fight night with the audience', 'הזירה באולם במקום ערב הקרבות עם הקהל', 'ринг в зале вместо вечера боёв со зрителями') })
    ] },
    2: { coach: 'vix', pin: 'market', boss: 'king_hyena', steps: [
      S('curb_footwork', L("Vix's test", 'המבחן של ויקס', 'Проверка Викс'),
        L("Mack's hand wraps got you in front of Vix, the fox who coaches Market Row. She trains nobody who cannot move: quick feet on the curb, now.",
          'החבישות של מאק הביאו אתכם אל ויקס, השועלה שמאמנת בשדרת השוק. היא לא מאמנת מי שלא זז: רגליים מהירות על המדרכה, עכשיו.',
          'Бинты Мака привели тебя к Викс, лисе, что тренирует на Рыночном ряду. Она не учит тех, кто не умеет двигаться: быстрые ноги у бордюра, сейчас.'),
        L("Passed Vix's footwork test on the curb.", 'עברתם את מבחן עבודת הרגליים של ויקס.', 'Прошёл проверку работы ног у Викс.'),
        { scene: 'vix_intro', unlock: L('training with Vix', 'אימונים עם ויקס', 'тренировки у Викс') }),
      S('clean_hands', L('Clean hands', 'ידיים נקיות', 'Чистые руки'),
        L('Vix: "In the street nobody gets hit twice." Win a round against a street regular and take as few hits as you can.',
          'ויקס: "ברחוב לא חוטפים פעמיים." נצחו סיבוב מול מקומי מהרחוב וספגו כמה שפחות מכות.',
          'Викс: «На улице дважды не бьют». Выиграй раунд у уличного бойца и пропусти как можно меньше.'),
        L('Won a street round with clean hands; the Hyena crew noticed.', 'ניצחתם סיבוב ברחוב בידיים נקיות; חבורת הצבועים שמה לב.', 'Выиграл уличный раунд чисто; банда гиен заметила.')),
      S('kids_skateboard', L('The skateboard', 'הסקייטבורד', 'Скейтборд'),
        L("The Hyena crew runs the market and just took a kid's skateboard. Vix will not step in, so you do: body shots until the hyena gives it back.",
          'חבורת הצבועים שולטת בשוק ועכשיו לקחה לילד את הסקייטבורד. ויקס לא תתערב, אז אתם כן: מכות לגוף עד שהצבוע יחזיר אותו.',
          'Банда гиен держит рынок и только что отняла у мальчишки скейт. Викс не вмешается, значит, вмешаешься ты: удары в корпус, пока гиена не вернёт доску.'),
        L("Got a kid's skateboard back from the Hyena crew.", 'החזרתם לילד את הסקייטבורד מחבורת הצבועים.', 'Вернул мальчишке скейт, отобранный гиенами.')),
      S('rooftop_callout', L('Rooftop callout', 'אתגר על הגג', 'Вызов с крыши'),
        L('Optional: a hyena on a roof bets you cannot land five punches in ten seconds. Easy coins and a little respect.',
          'רשות: צבוע על גג מתערב שלא תצליחו לפגוע חמש פעמים בעשר שניות. מטבעות קלים וקצת כבוד.',
          'По желанию: гиена на крыше спорит, что ты не нанесёшь пять ударов за десять секунд. Лёгкие монеты и немного уважения.'),
        L('Won the rooftop bet.', 'ניצחתם בהתערבות על הגג.', 'Выиграл спор на крыше.'),
        { side: true, after: 'kids_skateboard' }),
      S('rooftop_balloons', L('Rooftop barrage', 'מטח מהגגות', 'Обстрел с крыш'),
        L('The crew did not like losing the board. Now they pelt you with water balloons from the roofs on your way to Vix. Stay dry.',
          'החבורה לא אהבה לאבד את הסקייטבורד. עכשיו הם מפציצים אתכם בבלוני מים מהגגות בדרך לוויקס. הישארו יבשים.',
          'Банде не понравилось терять доску. Теперь они кидают в тебя водяные шарики с крыш по дороге к Викс. Останься сухим.'),
        L("Stayed dry under the crew's balloon barrage.", 'נשארתם יבשים תחת מטח הבלונים של החבורה.', 'Остался сухим под обстрелом шариков.')),
      S('whistle_chase', L('The stolen whistle', 'המשרוקית הגנובה', 'Украденный свисток'),
        L("Mack came to see how you are doing, and a raccoon from the crew snatched his whistle. Cut him off before he vanishes into the market.",
          'מאק בא לראות מה שלומכם, ודביבון מהחבורה חטף לו את המשרוקית. חסמו אותו לפני שייעלם בשוק.',
          'Мак пришёл проведать тебя, а енот из банды стащил его свисток. Отрежь ему путь, пока он не скрылся на рынке.'),
        L("Cornered the raccoon and got Mack's whistle back.", 'דחקתם את הדביבון לפינה והחזרתם למאק את המשרוקית.', 'Загнал енота в угол и вернул Маку свисток.'),
        { scene: 'whistle_theft' }),
      S('influencer_challenge', L('The show-off', 'המתנשא', 'Хвастун'),
        L('Optional: a show-off keeps filming you for his channel. Beat his speed-bag challenge and the camera goes off.',
          'רשות: מתנשא אחד מצלם אתכם בלי הפסקה לערוץ שלו. נצחו את אתגר שק המהירות שלו והמצלמה נכבית.',
          'По желанию: хвастун снимает тебя для своего канала. Побей его рекорд на скоростной груше — и камера выключится.'),
        L("Beat the show-off's speed-bag challenge.", 'ניצחתם את אתגר שק המהירות של המתנשא.', 'Побил рекорд хвастуна на груше.'),
        { side: true, after: 'whistle_chase' }),
      S('grandma_groceries', L("The hustler's bet", 'ההימור של הנוכל', 'Пари жулика'),
        L("The same raccoon is hustling Grandma's grocery money with a rigged bet. Take the bet and hit him only when he really opens up.",
          'אותו דביבון מוציא מסבתא את כסף הקניות בהימור מכור. קבלו את ההימור והכו רק כשהוא באמת נפתח.',
          'Тот же енот выманивает у бабушки деньги на продукты нечестным пари. Прими пари и бей, только когда он правда открылся.'),
        L("Beat the raccoon at his own bet and won back Grandma's money.", 'ניצחתם את הדביבון בהימור שלו והחזרתם לסבתא את הכסף.', 'Обыграл енота в его же пари и вернул бабушке деньги.'),
        { unlock: L("the crowd circle", 'מעגל הקהל', 'круг зрителей') }),
      S('crowd_circle', L('The crowd circle', 'מעגל הקהל', 'Круг зрителей'),
        L('Word spread: the street holds a crowd circle tonight, but Dash got there first. Beat three challengers in a row to take the crowd back.',
          'השמועה התפשטה: הלילה יש מעגל קהל ברחוב, אבל דאש הגיע ראשון. נצחו שלושה מתמודדים ברצף כדי להחזיר את הקהל.',
          'Слух разошёлся: вечером на улице круг зрителей, но Дэш пришёл первым. Победи троих подряд, чтобы вернуть толпу.'),
        L('Took the crowd circle back from Dash.', 'החזרתם את מעגל הקהל מדאש.', 'Отбил круг зрителей у Дэша.'),
        { scene: 'dash_circle', unlock: L("King Hyena's challenge", 'האתגר של מלך הצבועים', 'вызов Короля гиен') }),
      S('king_hyena', L('King Hyena', 'מלך הצבועים', 'Король гиен'),
        L('King Hyena says nobody fights in his market without his say. Beat him and the market is free, and the road to the Docks opens.',
          'מלך הצבועים אומר שאף אחד לא נלחם בשוק שלו בלי רשותו. נצחו אותו והשוק חופשי, והדרך לנמל נפתחת.',
          'Король гиен говорит, что на его рынке без его слова не дерутся. Победи его — рынок свободен, и открыта дорога в Доки.'),
        L('Beat King Hyena; the crew whispers about real fights at the Docks.', 'ניצחתם את מלך הצבועים; החבורה לוחשת על קרבות אמיתיים בנמל.', 'Победил Короля гиен; банда шепчется о настоящих боях в Доках.'),
        { boss: true, scene: 'hyena_intro', outro: 'hyena_outro', unlock: L('The Docks (coming next)', 'הנמל (בקרוב)', 'Доки (скоро)') })
    ] }
  };
  // The chapter's Coach reacts to the result first: fail / 1-2 stars / 3 stars. Plain lines, the story line follows.
  const react = {
    bruno: { fail: L('Not yet. Shake it out. Again.', 'עוד לא. לנער את הידיים. שוב.', 'Пока нет. Встряхнись. Ещё раз.'),
      some: L('Good. Not great. Good.', 'טוב. לא מצוין. טוב.', 'Хорошо. Не отлично. Но хорошо.'),
      three: L('Hm. I have seen champions do worse.', 'הממ. ראיתי אלופים שעשו פחות.', 'Хм. Я видел чемпионов, которые делали хуже.') },
    pip: { fail: L('Not yet. Breathe, shake it out, go again.', 'עוד לא. נשימה, לנער את הידיים, ושוב.', 'Пока нет. Выдохни, встряхнись и ещё раз.'),
      some: L('Done. There is a third star in there if you want it.', 'עשיתם את זה. יש שם עוד כוכב שלישי, אם תרצו.', 'Готово. Там есть и третья звезда, если хочешь.'),
      three: L('Three stars. I have nothing to fix.', 'שלושה כוכבים. אין לי מה לתקן.', 'Три звезды. Мне нечего поправить.') },
    vix: { fail: L('The street gives no second looks. I do. Again.', 'הרחוב לא נותן הזדמנות שנייה. אני כן. שוב.', 'Улица второго шанса не даёт. Я даю. Ещё раз.'),
      some: L('Passed. Sloppy, but passed.', 'עברתם. מרושל, אבל עברתם.', 'Прошёл. Небрежно, но прошёл.'),
      three: L('Clean. I almost smiled.', 'נקי. כמעט חייכתי.', 'Чисто. Я почти улыбнулась.') }
  };
  // Chapter openers (the first time a chapter opens) and the end-of-chapter line.
  const opener = {
    1: L('Gloryland. One bag, no money, and a dream: world champion.', 'גלורילנד. תיק אחד, בלי כסף, וחלום: אלוף העולם.', 'Глориленд. Одна сумка, ни денег, и мечта: стать чемпионом мира.'),
    2: L('Real gear, a real league. The Arena is waiting.', 'ציוד אמיתי, ליגה אמיתית. הזירה הגדולה מחכה.', 'Настоящая экипировка, настоящая лига. Арена ждёт.')
  };
  const titles = { 1: L('The Dream', 'החלום', 'Мечта'), 2: L('Junior League', 'ליגת הנוער', 'Юниорская лига') };
  const copy = {
    en: { statUp: '★★★: +1 {s}', chapter: 'Chapter {n} · {c}', stepOf: 'Step {i} of {n}', side: 'Side', done: 'Done', locked: 'Locked', goal: 'Goal', reward: 'Reward', stars: '★ 1 to finish · ★★★ best', boss: 'Win the bout', unlocks: 'Unlocks', start: 'Start ▶', go: "Let's go ▶", cont: 'Continue ▶', retry: 'Retry for more stars ▶', replay: 'Replay', next: 'Next: {t} ▶', back: 'Back to map', again: 'Retry ▶', level: 'Fighter Level {l}', toNext: '{k} ★ to Level {n}', gate: 'Level {n} needed, you are {l}: earn {k} more stars. Replay {list}.', gateOr: ' or ', stepN: 'step {i}', fightAnyway: 'Fight anyway (low chance)', unlocked: 'Unlocked: {t}', nextUp: 'Next: {t}', levelUp: 'Level up! Fighter Level {l}', result: '{s}', resultBoss: 'You won the bout!', resultLost: 'You lost the bout. Losing costs nothing.', noStar: 'No star yet.', newStars: '+{n} ★', complete: 'Chapter {n} complete', summary: '★ {s}/{m} · Fighter Level {l}', lockedCh: 'Locked. Beat {b} in {c} first.', goTo: 'Go to {c} ▶', allDone: 'Chapter {n} complete. Replay any step for more stars.', steps: 'All steps', soFar: 'Story so far', soFarEmpty: 'Your story starts with step 1.', skip: 'Tap to skip', stand: 'Stand-in: {t}', buy: 'Buy · {p} ◈ ▶', have: 'You have {c} ◈', short: 'Not enough coins: {k} ◈ more. Clean the gym to earn them.', paid: '+{n} ◈ reward', bought: 'Bought: {t}', watch: 'Watch ▶', fight: 'Fight ▶', talk: 'Talk ▶', firstLost: 'You lost to Brick. The story goes on.', firstWon: 'You beat Brick!', skipBtn: 'Skip ▶▶', devSkip: 'Skip step (dev)' },
    he: { statUp: '★★★: +1 {s}', chapter: 'פרק {n} · {c}', stepOf: 'שלב {i} מתוך {n}', side: 'צד', done: 'הושלם', locked: 'נעול', goal: 'מטרה', reward: 'פרס', stars: '★ אחד כדי לסיים · ★★★ הכי טוב', boss: 'נצחו בקרב', unlocks: 'פותח', start: 'להתחיל ◀', go: 'יוצאים ◀', cont: 'להמשיך ◀', retry: 'שוב, בשביל עוד כוכבים ◀', replay: 'שוב', next: 'הבא: {t} ◀', back: 'חזרה למפה', again: 'שוב ◀', level: 'רמת לוחם {l}', toNext: 'עוד {k} ★ לרמה {n}', gate: 'נדרשת רמה {n}, אתם ברמה {l}: הרוויחו עוד {k} כוכבים. שחקו שוב {list}.', gateOr: ' או ', stepN: 'שלב {i}', fightAnyway: 'להילחם בכל זאת (סיכוי נמוך)', unlocked: 'נפתח: {t}', nextUp: 'הבא: {t}', levelUp: 'עליתם רמה! רמת לוחם {l}', result: '{s}', resultBoss: 'ניצחתם בקרב!', resultLost: 'הפסדתם בקרב. הפסד לא עולה כלום.', noStar: 'עדיין אין כוכב.', newStars: '+{n} ★', complete: 'פרק {n} הושלם', summary: '★ {s}/{m} · רמת לוחם {l}', lockedCh: 'נעול. קודם נצחו את {b} ב{c}.', goTo: 'ללכת אל {c} ◀', allDone: 'פרק {n} הושלם. אפשר לשחק שוב כל שלב בשביל עוד כוכבים.', steps: 'כל השלבים', soFar: 'עד כה בסיפור', soFarEmpty: 'הסיפור שלכם מתחיל בשלב 1.', skip: 'הקישו כדי לדלג', stand: 'זמני: {t}', buy: 'לקנות · {p} ◈ ◀', have: 'יש לכם {c} ◈', short: 'אין מספיק מטבעות: חסרים {k} ◈. נקו את האולם כדי להרוויח.', paid: '+{n} ◈ פרס', bought: 'נקנה: {t}', watch: 'לצפות ◀', fight: 'להילחם ◀', talk: 'לדבר ◀', firstLost: 'הפסדתם לבריק. הסיפור ממשיך.', firstWon: 'ניצחתם את בריק!', skipBtn: 'לדלג ◀◀', devSkip: 'דילוג על השלב (פיתוח)' },
    ru: { statUp: '★★★: +1 {s}', chapter: 'Глава {n} · {c}', stepOf: 'Шаг {i} из {n}', side: 'Побочное', done: 'Пройдено', locked: 'Закрыто', goal: 'Цель', reward: 'Награда', stars: '★ чтобы пройти · ★★★ лучший', boss: 'Выиграй бой', unlocks: 'Откроет', start: 'Начать ▶', go: 'Вперёд ▶', cont: 'Продолжить ▶', retry: 'Ещё раз за звёздами ▶', replay: 'Ещё раз', next: 'Дальше: {t} ▶', back: 'Назад к карте', again: 'Ещё раз ▶', level: 'Уровень бойца {l}', toNext: 'ещё {k} ★ до уровня {n}', gate: 'Нужен уровень {n}, у тебя {l}: заработай ещё {k} звёзд. Перепройди {list}.', gateOr: ' или ', stepN: 'шаг {i}', fightAnyway: 'Всё равно драться (шанс низкий)', unlocked: 'Открыто: {t}', nextUp: 'Дальше: {t}', levelUp: 'Новый уровень! Уровень бойца {l}', result: '{s}', resultBoss: 'Ты выиграл бой!', resultLost: 'Бой проигран. Поражение ничего не стоит.', noStar: 'Пока без звезды.', newStars: '+{n} ★', complete: 'Глава {n} пройдена', summary: '★ {s}/{m} · Уровень бойца {l}', lockedCh: 'Закрыто. Сначала победи: {b}, {c}.', goTo: 'Перейти: {c} ▶', allDone: 'Глава {n} пройдена. Любой шаг можно перепройти за звёздами.', steps: 'Все шаги', soFar: 'Что было', soFarEmpty: 'Твоя история начинается с шага 1.', skip: 'Нажмите, чтобы пропустить', stand: 'Временно: {t}', buy: 'Купить · {p} ◈ ▶', have: 'У тебя {c} ◈', short: 'Не хватает монет: ещё {k} ◈. Заработай уборкой зала.', paid: '+{n} ◈ награда', bought: 'Куплено: {t}', watch: 'Смотреть ▶', fight: 'В бой ▶', talk: 'Говорить ▶', firstLost: 'Ты проиграл Брику. История продолжается.', firstWon: 'Ты победил Брика!', skipBtn: 'Пропустить ▶▶', devSkip: 'Пропустить шаг (разработка)' }
  };
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
  const P = () => (typeof window !== 'undefined' && window.AdventureProgress) || (typeof require === 'function' ? require('../adventure-progress.js') : null);
  const all = n => chapters[n]?.steps || [];
  const find = id => { for (const n of Object.keys(chapters)) { const s = all(+n).find(x => x.id === id); if (s) return { ...s, chapter: +n }; } return null; };
  const starsOf = (g, id) => g?.adventure?.missions?.[id]?.stars || 0;
  // Chapter 1 beats use the Dream save (adventure.story + stars + boss win, adventure-progress.js dreamDone); the rest stars / boss wins.
  const doneOf = (g, s) => P().dreamSteps?.includes(s.id) ? P().dreamDone(g, s.id) : s.boss ? P().bossWon(g, s.id) : starsOf(g, s.id) > 0;
  const firstBrick = g => g?.adventure?.story?.firstBrick || null;
  // Chapter 1 is always open. Chapter n opens when the previous boss is beaten, or when an old save already finished a step there.
  function chapterOpen(g, n) { if (!chapters[n]) return false; if (n === 1) return true; return P().bossWon(g, chapters[n - 1].boss) || all(n).some(s => doneOf(g, s)); }
  // The chapter's steps with their state. Main steps are numbered; status: done | current | locked. Side: done | open | hidden.
  function state(g, n) {
    const ch = chapters[n], open = chapterOpen(g, n), main = [], side = []; let i = 0, current = null;
    for (const s of ch.steps) {
      const done = doneOf(g, s), stars = s.boss ? (done ? 3 : 0) : starsOf(g, s.id);
      if (s.side) continue;
      const st = { ...s, chapter: n, n: ++i, done, stars, status: done ? 'done' : (!current && open ? 'current' : 'locked') };
      if (st.status === 'current') current = st; main.push(st);
    }
    for (const s of ch.steps.filter(x => x.side)) {
      const done = doneOf(g, s), parent = main.find(m => m.id === s.after);
      side.push({ ...s, chapter: n, done, stars: starsOf(g, s.id), status: done ? 'done' : (open && parent?.done ? 'open' : 'hidden') });
    }
    // Timeline order: side steps sit right after the step they follow.
    const timeline = []; for (const m of main) { timeline.push(m); for (const s of side) if (s.after === m.id && s.status !== 'hidden') timeline.push(s); }
    const visible = [...main, ...side.filter(s => s.status !== 'hidden')], stars = visible.reduce((k, s) => k + (s.boss ? 0 : s.stars), 0), maxStars = ch.steps.filter(s => !s.boss && !s.event).length * 3;
    return { chapter: n, open, main, side, timeline, current, total: main.length, doneCount: main.filter(m => m.done).length, complete: main.every(m => m.done), stars, maxStars, boss: main[main.length - 1] };
  }
  // Can this step be started now? Done (replay), current, or an open side step.
  function playable(g, id) { const s = find(id); if (!s) return false; const st = state(g, s.chapter), x = [...st.main, ...st.side].find(q => q.id === id); return !!x && ['done', 'current', 'open'].includes(x.status); }
  // Stars still needed to reach a level (3 stars = 1 level; 3 stars on a training step also add a stat point, so it may take fewer).
  function starsToLevel(g, target) { const A = P(), lvl = A.level(g); if (lvl >= target) return 0; const s = A.stars(g); return 3 * (Math.floor(s / 3) + (target - lvl)) - s; }
  // Boss gate: when the boss is the current step and the Fighter Level is below his entry level, say exactly what to do.
  function gate(g, n) {
    const A = P(), st = state(g, n), b = A.bosses.find(x => x.id === chapters[n].boss), lvl = A.level(g);
    if (lvl >= b.entry) return null;
    const pool = [...st.main.filter(m => !m.boss && !m.event && m.status === 'done' && m.stars < 3), ...st.side.filter(s => s.status !== 'hidden' && s.stars < 3)]
      .sort((a, c) => a.stars - c.stars || st.timeline.indexOf(a) - st.timeline.indexOf(c));
    return { need: b.entry, level: lvl, stars: starsToLevel(g, b.entry), steps: pool.slice(0, 2).map(s => s.id), ready: st.current?.boss === true };
  }
  // What finishing a step opens: the next main step, side steps that follow it, and the step's own unlock (move / place / item).
  function unlocks(id) {
    const s = find(id); if (!s) return { next: null, side: [], extra: null };
    const ch = chapters[s.chapter], main = ch.steps.filter(x => !x.side), i = main.findIndex(x => x.id === id);
    const next = s.side ? null : (main[i + 1] || (chapters[s.chapter + 1] ? chapters[s.chapter + 1].steps[0] : null));
    return { next: next?.id || null, side: ch.steps.filter(x => x.side && x.after === id).map(x => x.id), extra: s.unlock || null };
  }
  // The step to play after this one: the chapter's current step, else the first open side step, else the next chapter's current step.
  function nextAfter(g, id) {
    const s = find(id); if (!s) return null; const st = state(g, s.chapter);
    if (st.current) return st.current.id;
    const side = st.side.find(x => x.status === 'open'); if (side && side.id !== id) return side.id;
    const nx = chapters[s.chapter + 1] ? state(g, s.chapter + 1) : null; return nx?.open && nx.current ? nx.current.id : null;
  }
  const react3 = n => n >= 3 ? 'three' : n >= 1 ? 'some' : 'fail';
  // "Story so far": finished steps, one line each, in story order.
  function journal(g, lang = 'en') { const out = []; for (const n of Object.keys(chapters)) for (const s of all(+n)) if (doneOf(g, s)) { const r = s.recapWon && firstBrick(g) === 'won' ? s.recapWon : s.recap; out.push({ id: s.id, chapter: +n, text: r[lang] || r.en }); } return out; }
  const api = { firstBrick, chapters, react, opener, titles, copy, fill, find, all, chapterOpen, state, playable, starsToLevel, gate, unlocks, nextAfter, react3, journal, doneOf };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryFlow = api;
})();
