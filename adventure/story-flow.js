/* Story mode (GOTR-0069): each chapter is an ORDERED list of numbered story steps. Exactly one main step is current;
 * finished steps (at least one star, or the boss beaten) stay finished and can be replayed; later steps are locked.
 * Side steps are optional and appear once the step they follow is finished. Nothing new is saved: a step's state is
 * derived from the existing adventure save (mission stars, boss wins), so old saves keep every step they completed.
 * Data + pure rules + EN/HE/RU story text. Works in node (tests) and the browser (window.StoryFlow). */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  // S(id, title, why, recap, opts): why = why the Fighter does this NOW (who asked, what is at stake); recap = one line for "Story so far".
  const S = (id, title, why, recap, o = {}) => ({ id, title, why, recap, ...o });
  const chapters = {
    1: { coach: 'pip', pin: 'oldtown', boss: 'brick', steps: [
      S('one_two_mitts', L("Pip's trial", 'המבחן של פיפ', 'Испытание Пипа'),
        L('You stepped off the bus in Gloryland with one bag and nothing else. Coach Pip saw you shadowboxing at the stop: pass one trial on his mitts and a corner of his gym is yours.',
          'ירדתם מהאוטובוס בגלורילנד עם תיק אחד ותו לא. המאמן פיפ ראה אתכם מתאגרפים מול הצל בתחנה: עברו מבחן אחד על הכפות שלו, ופינה באולם שלו שלכם.',
          'Ты вышел из автобуса в Глориленде с одной сумкой и больше ничем. Тренер Пип увидел, как ты боксируешь с тенью на остановке: пройди одно испытание на его лапах — и угол в его зале твой.'),
        L("Arrived with nothing; passed Pip's trial and got a corner of his gym.", 'הגעתם בלי כלום; עברתם את המבחן של פיפ וקיבלתם פינה באולם.', 'Приехал ни с чем; прошёл испытание Пипа и получил угол в зале.'),
        { scene: 'arrival', unlock: L("a corner in Pip's gym", 'פינה באולם של פיפ', 'угол в зале Пипа') }),
      S('heavy_bag_van', L("Brick's bag", 'השק של בריק', 'Мешок Брика'),
        L('Brick, the gym bully, wants the newcomer gone. He hung the new heavy bag swinging by the door to make you look silly. Hit every swing at its peak.',
          'בריק, הבריון של האולם, רוצה שהחדשים ייעלמו. הוא תלה את השק הכבד החדש מתנדנד ליד הדלת כדי שתיראו מגוחכים. פגעו בכל תנופה בשיא.',
          'Брик, задира зала, хочет выжить новичка. Он повесил новый мешок раскачиваться у двери, чтобы выставить тебя смешным. Бей каждый замах в верхней точке.'),
        L("Tamed Brick's swinging bag in front of the whole gym.", 'אילפתם את השק המתנדנד של בריק מול כל האולם.', 'Укротил качающийся мешок Брика на глазах у всего зала.'),
        { scene: 'brick' }),
      S('bag_power', L('Pillow hands', 'ידיים של כרית', 'Руки-подушки'),
        L('Brick now tells everyone you punch like a pillow. Pip says there is one answer: the power mark on the heavy bag, in front of him.',
          'עכשיו בריק מספר לכולם שאתם מכים כמו כרית. פיפ אומר שיש רק תשובה אחת: סימן העוצמה על השק הכבד, מולו.',
          'Теперь Брик всем рассказывает, что ты бьёшь как подушка. Пип говорит, ответ один: отметка силы на тяжёлом мешке, прямо при нём.'),
        L('Hit the power mark and silenced Brick, for now.', 'הגעתם לסימן העוצמה והשתקתם את בריק, בינתיים.', 'Достал отметку силы и заткнул Брика. Пока что.')),
      S('snoring_guard', L('The night guard', 'שומר הלילה', 'Ночной сторож'),
        L('To train before Brick arrives you need the gym open at dawn, but the night guard sleeps on the keys and mumbles combos. Repeat them and he wakes up.',
          'כדי להתאמן לפני שבריק מגיע צריך אולם פתוח עם שחר, אבל שומר הלילה ישן על המפתחות וממלמל רצפים. חזרו עליהם והוא יתעורר.',
          'Чтобы тренироваться до прихода Брика, зал нужен открытым на рассвете, но ночной сторож спит на ключах и бормочет серии. Повтори их — и он проснётся.'),
        L('Woke the night guard; the gym now opens for you at dawn.', 'העירו את שומר הלילה; האולם נפתח בשבילכם עם שחר.', 'Разбудил ночного сторожа; теперь зал открыт для тебя на рассвете.'),
        { unlock: L('the gym at dawn', 'האולם עם שחר', 'зал на рассвете') }),
      S('teach_the_kid', L("Pip's nephew", 'האחיין של פיפ', 'Племянник Пипа'),
        L('Pip trusts you with his nephew for one lesson. If the kid throws a clean one-two, you are part of the gym, not a guest.',
          'פיפ סומך עליכם עם האחיין שלו לשיעור אחד. אם הילד יזרוק ימין-שמאל נקי, אתם חלק מהאולם ולא אורחים.',
          'Пип доверяет тебе племянника на один урок. Если малыш чисто выбросит двойку, ты часть зала, а не гость.'),
        L("Taught Pip's nephew the one-two; Pip gave you your own locker.", 'לימדתם את האחיין של פיפ ימין-שמאל; פיפ נתן לכם לוקר משלכם.', 'Научил племянника Пипа двойке; Пип дал тебе свой шкафчик.'),
        { unlock: L('your own locker', 'לוקר משלכם', 'свой шкафчик') }),
      S('rope_rhythm', L('Rope at dawn', 'חבל עם שחר', 'Скакалка на рассвете'),
        L("Optional: Pip's dawn rope routine for members only. Light feet build Stamina for later fights.",
          'רשות: שגרת החבל של פיפ עם שחר, לחברי האולם בלבד. רגליים קלות בונות סיבולת לקרבות הבאים.',
          'По желанию: утренняя скакалка Пипа, только для своих. Лёгкие ноги дают выносливость для будущих боёв.'),
        L("Joined Pip's dawn rope routine.", 'הצטרפתם לשגרת החבל של פיפ עם שחר.', 'Присоединился к утренней скакалке Пипа.'),
        { side: true, after: 'teach_the_kid' }),
      S('roll_under_hook', L('Dash walks in', 'דאש נכנס', 'Входит Дэш'),
        L('Dash, a cocky young fighter, beat a regular in seconds and laughed at you. Pip: "Not yet. First you learn to Roll under a Hook."',
          'דאש, לוחם צעיר ושחצן, ניצח מתאמן קבוע תוך שניות וצחק עליכם. פיפ: "עוד לא. קודם לומדים Roll מתחת ל-Hook."',
          'Дэш, дерзкий молодой боец, за секунды побил завсегдатая и посмеялся над тобой. Пип: «Рано. Сначала научись Roll под Hook».'),
        L('Dash laughed at you; you learned to Roll under the Hook.', 'דאש צחק עליכם; למדתם Roll מתחת ל-Hook.', 'Дэш посмеялся; ты научился Roll под Hook.'),
        { scene: 'dash', unlock: L('new move: Roll', 'מהלך חדש: Roll', 'новый приём: Roll') }),
      S('morning_sparring', L('First Sparring', 'Sparring ראשון', 'Первый Sparring'),
        L('Pip sets up your first real Sparring round so the gym can see you fight. Brick watches from the door, waiting for you to fail.',
          'פיפ מארגן לכם סיבוב Sparring אמיתי ראשון כדי שכל האולם יראה אתכם נלחמים. בריק צופה מהדלת ומחכה שתיכשלו.',
          'Пип устраивает твой первый настоящий раунд Sparring, чтобы зал увидел тебя в деле. Брик смотрит из дверей и ждёт провала.'),
        L('Won the gym\'s respect in your first Sparring round.', 'זכיתם בכבוד של האולם בסיבוב ה-Sparring הראשון.', 'Заслужил уважение зала в первом раунде Sparring.'),
        { unlock: L("Brick's challenge", 'האתגר של בריק', 'вызов Брика') }),
      // GOTR-0062 scouting: optional, about 30 s, before the boss. Done once watched; a right answer marks the tell in the fight.
      S('scout_brick', L('Scout Brick', 'סיור: בריק', 'Разведка: Брик'),
        L("Optional, 30 seconds: Pip filmed Brick fighting a regular last week. Watch it and learn what he does before his big Hook.",
          'רשות, 30 שניות: פיפ צילם את בריק נלחם במתאמן קבוע בשבוע שעבר. צפו ולמדו מה הוא עושה לפני ה-Hook הגדול שלו.',
          'По желанию, 30 секунд: Пип снял, как Брик дрался с завсегдатаем на прошлой неделе. Посмотри и узнай, что он делает перед своим большим Hook.'),
        L("Watched Pip's video of Brick before the fight.", 'צפיתם בסרטון של פיפ על בריק לפני הקרב.', 'Посмотрел видео Пипа с Бриком перед боем.'),
        { side: true, after: 'morning_sparring', scout: 'brick' }),
      S('brick', L('Brick', 'בריק', 'Брик'),
        L('Brick says this gym has room for only one of you. Win the bout and your place is yours for good; Pip promises his old hand wraps.',
          'בריק אומר שבאולם הזה יש מקום רק לאחד מכם. נצחו בקרב והמקום שלכם לתמיד; פיפ מבטיח את חבישות הידיים הישנות שלו.',
          'Брик говорит, что в зале место только для одного. Выиграй бой — и место твоё навсегда; Пип обещает свои старые бинты.'),
        L('Beat Brick. Pip gave you his old hand wraps and sent you to Vix at Market Row.', 'ניצחתם את בריק. פיפ נתן לכם את החבישות הישנות שלו ושלח אתכם לוויקס בשדרת השוק.', 'Победил Брика. Пип отдал свои старые бинты и отправил тебя к Викс на Рыночный ряд.'),
        { boss: true, scene: 'boss_intro', outro: 'boss_outro', unlock: L('Market Row and Coach Vix', 'שדרת השוק והמאמנת ויקס', 'Рыночный ряд и тренер Викс') })
    ] },
    2: { coach: 'vix', pin: 'market', boss: 'king_hyena', steps: [
      S('curb_footwork', L("Vix's test", 'המבחן של ויקס', 'Проверка Викс'),
        L("Pip's hand wraps got you in front of Vix, the fox who coaches Market Row. She trains nobody who cannot move: quick feet on the curb, now.",
          'החבישות של פיפ הביאו אתכם אל ויקס, השועלה שמאמנת בשדרת השוק. היא לא מאמנת מי שלא זז: רגליים מהירות על המדרכה, עכשיו.',
          'Бинты Пипа привели тебя к Викс, лисе, что тренирует на Рыночном ряду. Она не учит тех, кто не умеет двигаться: быстрые ноги у бордюра, сейчас.'),
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
        L("Pip came to see how you are doing, and a raccoon from the crew snatched his whistle. Cut him off before he vanishes into the market.",
          'פיפ בא לראות מה שלומכם, ודביבון מהחבורה חטף לו את המשרוקית. חסמו אותו לפני שייעלם בשוק.',
          'Пип пришёл проведать тебя, а енот из банды стащил его свисток. Отрежь ему путь, пока он не скрылся на рынке.'),
        L("Cornered the raccoon and got Pip's whistle back.", 'דחקתם את הדביבון לפינה והחזרתם לפיפ את המשרוקית.', 'Загнал енота в угол и вернул Пипу свисток.'),
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
    pip: { fail: L('Not yet. Breathe, shake it out, go again.', 'עוד לא. נשימה, לנער את הידיים, ושוב.', 'Пока нет. Выдохни, встряхнись и ещё раз.'),
      some: L('Done. There is a third star in there if you want it.', 'עשיתם את זה. יש שם עוד כוכב שלישי, אם תרצו.', 'Готово. Там есть и третья звезда, если хочешь.'),
      three: L('Three stars. I have nothing to fix.', 'שלושה כוכבים. אין לי מה לתקן.', 'Три звезды. Мне нечего поправить.') },
    vix: { fail: L('The street gives no second looks. I do. Again.', 'הרחוב לא נותן הזדמנות שנייה. אני כן. שוב.', 'Улица второго шанса не даёт. Я даю. Ещё раз.'),
      some: L('Passed. Sloppy, but passed.', 'עברתם. מרושל, אבל עברתם.', 'Прошёл. Небрежно, но прошёл.'),
      three: L('Clean. I almost smiled.', 'נקי. כמעט חייכתי.', 'Чисто. Я почти улыбнулась.') }
  };
  // Chapter openers (the first time a chapter opens) and the end-of-chapter line.
  const opener = {
    1: L('Gloryland. You have one bag, no gym and no name. Everyone starts somewhere.', 'גלורילנד. יש לכם תיק אחד, אין אולם ואין שם. כולם מתחילים מאיפשהו.', 'Глориленд. У тебя одна сумка, ни зала, ни имени. Все с чего-то начинают.'),
    2: L('Market Row, evening. Pip\'s hand wraps in your bag, and a new Coach to find.', 'שדרת השוק, ערב. החבישות של פיפ בתיק, ומאמנת חדשה למצוא.', 'Рыночный ряд, вечер. Бинты Пипа в сумке, и нужно найти нового тренера.')
  };
  const titles = { 1: L('Old Town', 'העיר העתיקה', 'Старый город'), 2: L('Market Row', 'שדרת השוק', 'Рыночный ряд') };
  const copy = {
    en: { scouted: 'Watched', scoutGoal: 'Watch the video, answer one question', notebook: 'Notebook: {t}', scoutFirst: 'Scout {b} first (30 s) ▶', scoutTitle: 'Scouting: {b}', scoutWatch: '{b} vs a gym regular, last week. Watch his hands.', scoutQ: 'What does {b} do before his big Hook?', scoutRight: 'Right. You read him.', scoutRightInfo: 'In the fight his tell is marked.', scoutWrong: 'Not quite. No hint in the fight this time.', scoutAgain: 'Watch again ▶', skipClip: 'Skip ▶', challenge: 'Challenge {b} ▶', choiceKick: 'Your choice', choiceSaved: 'Saved in Story so far.', statUp: '★★★: +1 {s}', chapter: 'Chapter {n} · {c}', stepOf: 'Step {i} of {n}', side: 'Side', done: 'Done', locked: 'Locked', goal: 'Goal', reward: 'Reward', stars: '★ 1 to finish · ★★★ best', boss: 'Win the bout', unlocks: 'Unlocks', start: 'Start ▶', go: "Let's go ▶", cont: 'Continue ▶', retry: 'Retry for more stars ▶', replay: 'Replay', next: 'Next: {t} ▶', back: 'Back to map', again: 'Retry ▶', level: 'Fighter Level {l}', toNext: '{k} ★ to Level {n}', gate: 'Level {n} needed, you are {l}: earn {k} more stars. Replay {list}.', gateOr: ' or ', stepN: 'step {i}', fightAnyway: 'Fight anyway (low chance)', unlocked: 'Unlocked: {t}', nextUp: 'Next: {t}', levelUp: 'Level up! Fighter Level {l}', result: '{s}', resultBoss: 'You won the bout!', resultLost: 'You lost the bout. Losing costs nothing.', noStar: 'No star yet.', newStars: '+{n} ★', complete: 'Chapter {n} complete', summary: '★ {s}/{m} · Fighter Level {l}', lockedCh: 'Locked. Beat {b} in {c} first.', goTo: 'Go to {c} ▶', allDone: 'Chapter {n} complete. Replay any step for more stars.', steps: 'All steps', soFar: 'Story so far', soFarEmpty: 'Your story starts with step 1.', skip: 'Tap to skip' },
    he: { scouted: 'נצפה', scoutGoal: 'לצפות בסרטון ולענות על שאלה אחת', notebook: 'מחברת: {t}', scoutFirst: 'קודם סיור: {b} (30 שניות) ◀', scoutTitle: 'סיור: {b}', scoutWatch: '{b} מול מתאמן קבוע, בשבוע שעבר. הסתכלו על הידיים שלו.', scoutQ: 'מה {b} עושה לפני ה-Hook הגדול שלו?', scoutRight: 'נכון. קראתם אותו.', scoutRightInfo: 'בקרב הסימן שלו יסומן.', scoutWrong: 'לא בדיוק. הפעם בלי רמז בקרב.', scoutAgain: 'לצפות שוב ◀', skipClip: 'דילוג ◀', challenge: 'לאתגר את {b} ◀', choiceKick: 'הבחירה שלכם', choiceSaved: 'נשמר ביומן הסיפור.', statUp: '★★★: +1 {s}', chapter: 'פרק {n} · {c}', stepOf: 'שלב {i} מתוך {n}', side: 'צד', done: 'הושלם', locked: 'נעול', goal: 'מטרה', reward: 'פרס', stars: '★ אחד כדי לסיים · ★★★ הכי טוב', boss: 'נצחו בקרב', unlocks: 'פותח', start: 'להתחיל ◀', go: 'יוצאים ◀', cont: 'להמשיך ◀', retry: 'שוב, בשביל עוד כוכבים ◀', replay: 'שוב', next: 'הבא: {t} ◀', back: 'חזרה למפה', again: 'שוב ◀', level: 'רמת לוחם {l}', toNext: 'עוד {k} ★ לרמה {n}', gate: 'נדרשת רמה {n}, אתם ברמה {l}: הרוויחו עוד {k} כוכבים. שחקו שוב {list}.', gateOr: ' או ', stepN: 'שלב {i}', fightAnyway: 'להילחם בכל זאת (סיכוי נמוך)', unlocked: 'נפתח: {t}', nextUp: 'הבא: {t}', levelUp: 'עליתם רמה! רמת לוחם {l}', result: '{s}', resultBoss: 'ניצחתם בקרב!', resultLost: 'הפסדתם בקרב. הפסד לא עולה כלום.', noStar: 'עדיין אין כוכב.', newStars: '+{n} ★', complete: 'פרק {n} הושלם', summary: '★ {s}/{m} · רמת לוחם {l}', lockedCh: 'נעול. קודם נצחו את {b} ב{c}.', goTo: 'ללכת אל {c} ◀', allDone: 'פרק {n} הושלם. אפשר לשחק שוב כל שלב בשביל עוד כוכבים.', steps: 'כל השלבים', soFar: 'עד כה בסיפור', soFarEmpty: 'הסיפור שלכם מתחיל בשלב 1.', skip: 'הקישו כדי לדלג' },
    ru: { scouted: 'Просмотрено', scoutGoal: 'Посмотри видео и ответь на один вопрос', notebook: 'Блокнот: {t}', scoutFirst: 'Сначала разведка: {b} (30 с) ▶', scoutTitle: 'Разведка: {b}', scoutWatch: '{b} против завсегдатая, прошлая неделя. Следи за его руками.', scoutQ: 'Что делает {b} перед своим большим Hook?', scoutRight: 'Верно. Ты его прочитал.', scoutRightInfo: 'В бою его сигнал будет отмечен.', scoutWrong: 'Не совсем. В этот раз без подсказки в бою.', scoutAgain: 'Посмотреть ещё ▶', skipClip: 'Пропустить ▶', challenge: 'Вызвать: {b} ▶', choiceKick: 'Твой выбор', choiceSaved: 'Сохранено в «Что было».', statUp: '★★★: +1 {s}', chapter: 'Глава {n} · {c}', stepOf: 'Шаг {i} из {n}', side: 'Побочное', done: 'Пройдено', locked: 'Закрыто', goal: 'Цель', reward: 'Награда', stars: '★ чтобы пройти · ★★★ лучший', boss: 'Выиграй бой', unlocks: 'Откроет', start: 'Начать ▶', go: 'Вперёд ▶', cont: 'Продолжить ▶', retry: 'Ещё раз за звёздами ▶', replay: 'Ещё раз', next: 'Дальше: {t} ▶', back: 'Назад к карте', again: 'Ещё раз ▶', level: 'Уровень бойца {l}', toNext: 'ещё {k} ★ до уровня {n}', gate: 'Нужен уровень {n}, у тебя {l}: заработай ещё {k} звёзд. Перепройди {list}.', gateOr: ' или ', stepN: 'шаг {i}', fightAnyway: 'Всё равно драться (шанс низкий)', unlocked: 'Открыто: {t}', nextUp: 'Дальше: {t}', levelUp: 'Новый уровень! Уровень бойца {l}', result: '{s}', resultBoss: 'Ты выиграл бой!', resultLost: 'Бой проигран. Поражение ничего не стоит.', noStar: 'Пока без звезды.', newStars: '+{n} ★', complete: 'Глава {n} пройдена', summary: '★ {s}/{m} · Уровень бойца {l}', lockedCh: 'Закрыто. Сначала победи: {b}, {c}.', goTo: 'Перейти: {c} ▶', allDone: 'Глава {n} пройдена. Любой шаг можно перепройти за звёздами.', steps: 'Все шаги', soFar: 'Что было', soFarEmpty: 'Твоя история начинается с шага 1.', skip: 'Нажмите, чтобы пропустить' }
  };
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
  const P = () => (typeof window !== 'undefined' && window.AdventureProgress) || (typeof require === 'function' ? require('../adventure-progress.js') : null);
  const all = n => chapters[n]?.steps || [];
  const find = id => { for (const n of Object.keys(chapters)) { const s = all(+n).find(x => x.id === id); if (s) return { ...s, chapter: +n }; } return null; };
  const starsOf = (g, id) => g?.adventure?.missions?.[id]?.stars || 0;
  const doneOf = (g, s) => s.boss ? P().bossWon(g, s.id) : s.scout ? P().scoutTries(g, s.scout) > 0 : starsOf(g, s.id) > 0;
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
      side.push({ ...s, chapter: n, done, stars: starsOf(g, s.id), status: done ? 'done' : (open && parent?.done && !(s.scout && P().bossWon(g, s.scout)) ? 'open' : 'hidden') }); // scouting a beaten boss is not offered
    }
    // Timeline order: side steps sit right after the step they follow.
    const timeline = []; for (const m of main) { timeline.push(m); for (const s of side) if (s.after === m.id && s.status !== 'hidden') timeline.push(s); }
    const visible = [...main, ...side.filter(s => s.status !== 'hidden')], stars = visible.reduce((k, s) => k + (s.boss ? 0 : s.stars), 0), maxStars = ch.steps.filter(s => !s.boss && !s.scout).length * 3;
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
    const pool = [...st.main.filter(m => !m.boss && m.status === 'done' && m.stars < 3), ...st.side.filter(s => !s.scout && s.status !== 'hidden' && s.stars < 3)]
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
  // GOTR-0062 story choices: one per chapter, made once after the boss (saved by AdventureProgress.recordChoice), shown in
  // "Story so far" and referenced later as a note on later steps (quest panel and BEFORE beats). Never locks content.
  const choices = {
    ch1: { chapter: 1, after: 'brick', who: 'brick',
      title: L('Brick holds out his glove', 'בריק מושיט את הכפפה', 'Брик протягивает перчатку'),
      ask: L('...Fair fight. Shake on it?', '...קרב הוגן. לוחצים ידיים?', '...Честный бой. Пожмём руки?'),
      options: {
        handshake: { label: L('Shake his hand', 'ללחוץ לו את היד', 'Пожать ему руку'),
          reply: L('Then I hold the mitts for you sometimes. No charge.', 'אז לפעמים אני אחזיק לכם את הכפות. בחינם.', 'Тогда иногда буду держать тебе лапы. Бесплатно.'),
          recap: L("Shook Brick's hand: he is your Sparring partner now.", 'לחצתם את היד של בריק: עכשיו הוא בן הזוג שלכם ל-Sparring.', 'Пожал руку Брику: теперь он твой партнёр по Sparring.') },
        walk: { label: L('Walk past him', 'לעבור לידו בלי לעצור', 'Пройти мимо'),
          reply: L('Fine. Dash pays better than handshakes.', 'בסדר. דאש משלם יותר טוב מלחיצות ידיים.', 'Ладно. Дэш платит лучше, чем рукопожатия.'),
          recap: L("Walked past Brick: he went to Dash's corner.", 'עברתם ליד בריק בלי לעצור: הוא עבר לפינה של דאש.', 'Прошёл мимо Брика: он ушёл в угол Дэша.') }
      } }
  };
  // Later steps that remember the choice: one line each, the person who says it (or narration).
  const notes = {
    ch1: {
      morning_sparring: { handshake: { who: 'brick', text: L('Brick holds the mitts now. "Again. Faster."', 'בריק מחזיק עכשיו את הכפות. "שוב. מהר יותר."', 'Теперь лапы держит Брик. «Ещё. Быстрее».') } },
      curb_footwork: { handshake: { who: 'brick', text: L('Vix bites. Bite back. And keep that right hand up.', 'ויקס נושכת. תנשכו בחזרה. ותשמרו את יד ימין למעלה.', 'Викс кусается. Кусай в ответ. И держи правую руку повыше.') },
        walk: { text: L('Word from Old Town: Brick left the gym with Dash.', 'שמועה מהעיר העתיקה: בריק עזב את האולם עם דאש.', 'Слух из Старого города: Брик ушёл из зала вместе с Дэшем.') } },
      crowd_circle: { handshake: { who: 'brick', text: L('I came to shout for you. Watch their hands, like mine.', 'באתי לצעוק בשבילכם. תסתכלו על הידיים שלהם, כמו על שלי.', 'Я пришёл за тебя покричать. Следи за их руками, как за моими.') },
        walk: { who: 'brick', text: L("Surprised? I carry Dash's water now.", 'מופתעים? עכשיו אני סוחב את המים של דאש.', 'Удивлён? Теперь я ношу воду Дэшу.') } },
      king_hyena: { handshake: { who: 'brick', text: L('A tip: hyenas laugh before they bite.', 'טיפ: צבועים צוחקים לפני שהם נושכים.', 'Совет: гиены смеются, прежде чем укусить.') },
        walk: { text: L('Brick told the crew how you fight. They know your Duck.', 'בריק סיפר לחבורה איך אתם נלחמים. הם מכירים את ההתכופפות שלכם.', 'Брик рассказал банде, как ты дерёшься. Они знают твой нырок.') } }
    }
  };
  const choiceOf = (g, id) => P().choice?.(g, id) || null;
  // The remembered choice lines for a step: [{who?, text}] in the asked language.
  function notesFor(g, id, lang = 'en') { const out = []; for (const [c, by] of Object.entries(notes)) { const v = choiceOf(g, c), n = v && by[id]?.[v]; if (n) out.push({ who: n.who || null, text: n.text[lang] || n.text.en }); } return out; }
  // The choice still to make after a step (its boss beaten, nothing chosen yet), or null.
  function pendingChoice(g, afterId) { for (const [id, c] of Object.entries(choices)) if (c.after === afterId && P().bossWon(g, c.after) && !choiceOf(g, id)) return id; return null; }
  // The scouting question per boss: three answers, one right (shown in this order).
  const scouting = {
    brick: { answers: [
      { id: 'step_back', text: L('He steps back first', 'הוא צועד אחורה קודם', 'Сначала шагает назад') },
      { id: 'drops_right', right: true, text: L('He drops his right hand', 'הוא מוריד את יד ימין', 'Опускает правую руку') },
      { id: 'jab_first', text: L('He throws a Jab first', 'הוא זורק Jab קודם', 'Сначала бьёт Jab') }] }
  };
  // The Coach's one tip from the Fighter's weakest stat (ties: Stamina, Speed, Power).
  const tips = {
    brick: {
      stamina: L('Your Stamina is low: finish him before phase 3, when he swings wild.', 'הסיבולת שלכם נמוכה: גמרו אותו לפני שלב 3, כשהוא מניף בפראות.', 'Выносливость у тебя слабая: добей его до третьей фазы, когда он начнёт махать.'),
      speed: L('You are not fast yet: Duck the moment his hand drops, not later.', 'אתם עוד לא מהירים: התכופפו ברגע שהיד יורדת, לא אחר כך.', 'Ты пока не быстрый: ныряй, как только рука пошла вниз, не позже.'),
      power: L('Your punches are light: save the big ones for the weak point.', 'המכות שלכם קלות: שמרו את החזקות לנקודת התורפה.', 'Удар у тебя лёгкий: прибереги сильные для слабого места.')
    }
  };
  function tipFor(g, boss, lang = 'en') { const st = P().statPoints(g), k = ['stamina', 'speed', 'power'].reduce((a, c) => st[c] < st[a] ? c : a, 'stamina'); const t = tips[boss]?.[k]; return t ? { stat: k, text: t[lang] || t.en } : null; }
  const react3 = n => n >= 3 ? 'three' : n >= 1 ? 'some' : 'fail';
  // "Story so far": finished steps, one line each, in story order.
  function journal(g, lang = 'en') {
    const out = [];
    for (const n of Object.keys(chapters)) for (const s of all(+n)) if (doneOf(g, s)) {
      out.push({ id: s.id, chapter: +n, text: s.recap[lang] || s.recap.en });
      for (const [cid, c] of Object.entries(choices)) { const v = c.after === s.id && choiceOf(g, cid); if (v) out.push({ id: cid, chapter: +n, choice: v, text: c.options[v].recap[lang] || c.options[v].recap.en }); }
    }
    return out;
  }
  const api = { chapters, react, opener, titles, copy, fill, find, all, chapterOpen, state, playable, starsToLevel, gate, unlocks, nextAfter, react3, journal, doneOf, choices, notes, choiceOf, notesFor, pendingChoice, scouting, tips, tipFor };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryFlow = api;
})();
