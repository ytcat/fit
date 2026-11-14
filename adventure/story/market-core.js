/* Chapter 1 "The Dream", beats 5-7 (GOTR-0096), pure part: the scene scripts of the apology, the market robbery, the market
 * reward and Otto's Corner. Same format and sampler as dream-core.js (DreamCore.sample / validate); played by dream-scenes.js
 * (StoryScenes.play forwards the ids). Sets: market-sets.js ('dream_market', 'dream_shop') and dream-sets.js ('dream_gym').
 * Script: docs/adventure/CHAPTER1_SCRIPT_V2.md beats 5-7; tracker docs/adventure/FILMS.md rows 6-8.
 *
 * Extra scene fields read by the player (dream-scenes.js):
 *   gymBag: 'broken'            the old bag lies on the floor under its empty chain whatever the save says (BagBreak.force)
 *   carry: { handbag | pouch | heavybag: [{ t, on, hand?, at? }] }
 *       handbag (Mrs. Hazel's, StoryCast.market.handbag) / pouch (the reward): on = an actor id (held in hand 'L' | 'R'),
 *       'ground' (at [x, z, ry]) or 'off'; heavybag (the new bag from Otto's display): on 'display' | 'shoulder' (the Fighter) | 'off'
 *   buy: { t }                  the timeline stops at t until the purchase is confirmed in the scene (opts.onBuy), unless opts.owned
 *   act 'jacketoff'             Fang takes his jacket off (StoryCast.market.jacketOff, about 2.2 s from that key)
 *   {price} in a line           filled with the heavy bag's price (game-domain.js gear) when the scene plays
 * MarketCore.scenes / ids ; in the browser they are registered into DreamCore (DreamCore.register). */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const JACKET_T = 2.2; // seconds of Fang's jacket-off beat (StoryCast.market.jacketOff u = 0..1)
  // ---- places (set coordinates)
  const BAG_FLOOR = [3.0, -2.7];                  // where the old bag lies in Bruno's Gym (BagBreakCore.rest(), dream_gym)
  const HZ = [1.85, -1.75];                       // Mrs. Hazel beside her fruit stall (dream_market, stall at x 0)
  const SHOP = 40;                                // dream_shop: the interior stands at x 36..44; the street front at x -12..12

  const scenes = {
    /* Beat 5. Morning, Bruno's Gym: the old bag on the floor. The Fighter owns up; Bruno grumbles, then sends him to the market. */
    dream_apology: {
      set: 'dream_gym', place: 'gym', duration: 34.5, chapter: 1, tap: true, gymBag: 'broken', outfit: { fighter: 'street' },
      camera: [
        { t: 0, pos: [-1.4, 1.95, 4.8], look: [2.4, .8, -2.2] },                               // the hall in the morning: him and the bag
        { t: 3.2, pos: [-.9, 1.75, 4.1], look: [2.5, .85, -2.2], ease: 'smooth' },
        { t: 3.2, cut: true, pos: [1.0, 1.55, 3.1], look: [5.0, 1.35, -2.8] },                // Bruno comes out of his office
        { t: 5.8, pos: [1.2, 1.6, 2.6], look: [4.1, 1.45, -1.6], ease: 'smooth' },
        { t: 5.8, cut: true, pos: [.55, 1.72, -.05], look: [4.15, 1.6, -1.25], fov: 30 },    // over the Fighter's shoulder, on Bruno
        { t: 9.4, pos: [.6, 1.72, -.1], look: [4.15, 1.62, -1.25], fov: 29, ease: 'linear' },
        { t: 9.4, cut: true, pos: [5.6, 1.74, .85], look: [1.75, 1.5, -1.45], fov: 27 },    // past Bruno's shoulder, on the Fighter
        { t: 13, pos: [5.55, 1.74, .8], look: [1.75, 1.52, -1.45], fov: 26, ease: 'linear' },
        { t: 13, cut: true, pos: [1.7, 1.35, 1.9], look: [3.75, 1.2, -1.75], fov: 44 },        // Bruno over the bag on the floor
        { t: 16.6, pos: [1.85, 1.38, 1.75], look: [3.75, 1.22, -1.75], fov: 43, ease: 'linear' },
        { t: 16.6, cut: true, pos: [5.6, 1.74, .85], look: [1.75, 1.5, -1.45], fov: 26 },
        { t: 20.2, pos: [5.55, 1.74, .8], look: [1.75, 1.52, -1.45], fov: 25, ease: 'linear' },
        { t: 20.2, cut: true, pos: [.55, 1.72, -.05], look: [4.15, 1.6, -1.25], fov: 29 },
        { t: 27.4, pos: [.65, 1.72, -.15], look: [4.15, 1.62, -1.25], fov: 27, ease: 'linear' },
        { t: 27.4, cut: true, pos: [3.0, 1.55, 5.2], look: [2.6, 1.25, -1.3] },               // wide: he heads out, Bruno stays with the bag
        { t: 34.5, pos: [3.4, 1.6, 4.8], look: [3.4, 1.15, -1.8], ease: 'smooth' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: 1.75, z: -1.45, face: [3.0, -2.6], look: [3.0, .25, -2.7], lean: .05, arms: {} },
          { t: 3.6, look: { yaw: .6, pitch: 0 } },                                              // hears the office door
          { t: 4.6, face: 'bruno', look: 'bruno', lean: 0 },
          { t: 9.6, arms: { R: 'fist' } },                                                       // "I'm sorry, Bruno."
          { t: 13.2, arms: {}, look: [3.0, .25, -2.7], lean: .05 },
          { t: 16.4, look: 'bruno', lean: 0 },
          { t: 16.8, arms: { L: 'open', R: 'open' } },                                          // "I'll pay it back."
          { t: 20.4, arms: {} },
          { t: 27.6, arms: { R: 'fist' } },                                                      // "On my way, Coach!"
          { t: 28.6, arms: {} },
          { t: 28.8, x: 1.75, z: -1.45 },
          { t: 30.2, x: 1.0, z: .3 },
          { t: 34.5, x: -.9, z: 5.6 }                                                            // out toward the street door
        ] },
        bruno: { rig: 'bruno', keys: [
          { t: 0, x: 8.3, z: -6.9, act: 'off', face: [4.2, -1.3] },
          { t: .6, act: 'idle' },
          { t: .6, x: 8.3, z: -6.9 },
          { t: 5.4, x: 4.15, z: -1.2, face: 'fighter', look: [3.0, .3, -2.7], arms: { L: 'hips', R: 'hips' } },
          { t: 5.8, look: 'fighter', arms: { L: 'hips', R: 'point' } },                          // "What happened to my bag?"
          { t: 9.4, arms: { L: 'cross', R: 'cross2' } },
          { t: 13.0, look: [3.0, .3, -2.7], arms: { L: 'hips', R: 'hips' } },                    // "Forty years..."
          { t: 16.6, look: 'fighter', arms: { L: 'cross', R: 'cross2' } },
          { t: 20.2, look: [5.6, 3.2, -2.5], arms: { L: 'hips', R: 'chin' } },                   // the snapped chain: "Hm."
          { t: 22.0, look: 'fighter' },
          { t: 23.8, arms: { L: 'hips', R: 'thumb' } },                                          // "Market Row. ... Go."
          { t: 27.4, arms: { L: 'cross', R: 'cross2' } },
          { t: 30.4, look: [3.0, .3, -2.7], arms: { L: 'hips', R: 'hips' } }                    // alone with the bag
        ] }
      },
      props: {},
      lines: [
        { t: 5.8, who: 'bruno', hold: true, text: L('What happened to my bag?', 'מה קרה לשק שלי?', 'Что с моим мешком?') },
        { t: 9.4, who: 'fighter', hold: true, text: L("That was me. Last night. I'm sorry, Bruno.", 'זה הייתי אני. אתמול בלילה. סליחה, ברונו.', 'Это я. Вчера ночью. Простите, Бруно.') },
        { t: 13.0, who: 'bruno', hold: true, text: L('Forty years that bag hung there. Forty.', 'ארבעים שנה השק הזה היה תלוי שם. ארבעים.', 'Сорок лет он там висел. Сорок.') },
        { t: 16.6, who: 'fighter', hold: true, text: L("I'll pay it back. Every coin. I'll work.", 'אני אחזיר הכול. עד השקל האחרון. אעבוד.', 'Я всё верну. До копейки. Отработаю.') },
        { t: 20.2, who: 'bruno', hold: true, text: L('Snapped the chain, huh? Hm.', 'קרעת את השרשרת, אה? הממ.', 'Цепь порвал, значит? Хм.') },
        { t: 23.8, who: 'bruno', hold: true, text: L('Market Row. Tape, chalk, a new mop. Go.', 'לשוק. טייפ, גיר, מגב חדש. לך.', 'На рынок. Тейп, мел, новую швабру. Бегом.') },
        { t: 27.4, who: 'fighter', hold: true, text: L('On my way, Coach!', 'כבר רץ, המאמן!', 'Уже бегу, тренер!') },
        { t: 31.6, who: 'bruno', text: L('…Forty years.', '…ארבעים שנה.', '…Сорок лет.') }
      ]
    },

    /* Beat 6. Day, Market Row: Fang snatches Mrs. Hazel's handbag and runs; the Fighter blocks his way; Fang drops the bag,
     * takes his jacket off. The film ends with the two facing each other: the street fight starts (oldtown.js). */
    dream_market_robbery: {
      set: 'dream_market', place: 'street', duration: 18.8, chapter: 1, outfit: { fighter: 'street' },
      carry: { handbag: [{ t: 0, on: 'hazel', hand: 'L' }, { t: 6.05, on: 'fang', hand: 'L' }, { t: 13.9, on: 'ground', at: [-1.5, .5, .6] }] },
      camera: [
        { t: 0, pos: [-3.2, 2.5, 8.6], look: [.2, 1.25, -2.4] },                               // Market Row by day
        { t: 3.6, pos: [-2.2, 2.15, 7.4], look: [.8, 1.25, -2.0], ease: 'smooth' },
        { t: 3.6, cut: true, pos: [.2, 1.55, 2.6], look: [2.35, 1.25, -1.4], fov: 36 },      // Mrs. Hazel; Fang walks up, grabs the bag
        { t: 6.8, pos: [.45, 1.55, 2.4], look: [2.2, 1.2, -1.3], fov: 36, ease: 'linear' },
        { t: 6.8, cut: true, pos: [-6.3, 1.5, 2.8], look: [-1.2, 1.25, -.6] },              // past the Fighter: Fang runs at him
        { t: 9.4, pos: [-6.0, 1.5, 2.8], look: [-1.9, 1.3, -.4], ease: 'linear' },
        { t: 9.4, cut: true, pos: [-2.4, 1.55, 3.6], look: [-2.4, 1.48, -.25], fov: 32 },    // side two-shot: the stand-off
        { t: 13.4, pos: [-2.4, 1.55, 3.35], look: [-2.4, 1.48, -.25], fov: 31, ease: 'linear' },
        { t: 13.4, cut: true, pos: [-4.0, 1.5, 2.0], look: [-1.75, 1.4, -.3], fov: 32 },     // over the Fighter's shoulder: the jacket comes off
        { t: 16.4, pos: [-3.85, 1.48, 1.8], look: [-1.75, 1.38, -.3], fov: 30, ease: 'linear' },
        { t: 16.4, cut: true, pos: [-2.2, .95, 4.4], look: [-2.3, 1.4, -.6] },               // low and wide: Mrs. Hazel behind them
        { t: 18.8, pos: [-2.25, .95, 4.0], look: [-2.3, 1.42, -.6], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: -10.5, z: .85, arms: {} },
          { t: 6.2, x: -4.3, z: .75 },
          { t: 6.4, look: [2.0, 1.6, -1.6], face: [0, -1] },                                     // "Stop him!"
          { t: 7.0, x: -4.3, z: .75 },
          { t: 7.9, x: -3.05, z: -.2, face: 'fang', look: 'fang' },                             // steps into his way
          { t: 9.6, arms: { L: 'open' } },                                                       // "Going somewhere?"
          { t: 11.4, arms: {} },
          { t: 13.5, arms: { R: 'low' } },                                                       // "Give the lady her bag back."
          { t: 15.0, arms: {} }
        ] },
        fang: { rig: 'fang', keys: [
          { t: 0, x: 9.5, z: 1.4, act: 'off' },
          { t: 1.6, act: 'idle' },
          { t: 1.6, x: 9.5, z: 1.4 },
          { t: 5.6, x: 2.75, z: -1.2, face: 'hazel', look: 'hazel' },                            // "Nice bag, lady."
          { t: 6.05, arms: { L: 'carry' } },                                                     // the snatch
          { t: 6.4, x: 2.75, z: -1.2 },
          { t: 8.6, x: -1.75, z: -.25, face: 'fighter', look: 'fighter' },                       // runs, stops short
          { t: 11.2, arms: { L: 'carry', R: 'hips' }, lean: .06 },                               // "Move, kid."
          { t: 13.5, arms: { L: 'low', R: 'hang' }, lean: 0 },                                   // drops the bag
          { t: 14.0, act: 'jacketoff' },
          { t: 16.4, act: 'idle', arms: { L: 'hang', R: 'hang' }, lean: .05, look: 'fighter' }   // "You asked for it."
        ] },
        hazel: { rig: 'hazel', keys: [
          { t: 0, x: HZ[0], z: HZ[1], face: [-1.5, 2.2], arms: {}, look: { yaw: 0, pitch: 0 } },
          { t: 1.2, arms: { R: 'open' } },                                                       // "Pears! Sweet pears!"
          { t: 3.4, arms: {} },
          { t: 5.0, face: 'fang', look: 'fang' },
          { t: 6.3, arms: { R: 'point' }, lean: .06 },                                           // "Hey! My bag!"
          { t: 6.6, face: [-2.5, -.2], look: 'fang' },
          { t: 9.0, arms: {}, lean: 0 }
        ] }
      },
      props: {},
      lines: [
        { t: 1.2, who: 'hazel', dur: 2.6, text: L('Pears! Sweet pears! Best on Market Row!', 'אגסים! אגסים מתוקים! הכי טובים בשוק!', 'Груши! Сладкие груши! Лучшие на рынке!') },
        { t: 4.6, who: 'fang', dur: 1.5, text: L('Nice bag, lady.', 'תיק יפה, גברת.', 'Симпатичная сумочка, дамочка.') },
        { t: 6.3, who: 'hazel', dur: 2.6, text: L('Hey! My bag! Stop him!', 'היי! התיק שלי! תעצרו אותו!', 'Эй! Моя сумка! Держите его!') },
        { t: 9.5, who: 'fighter', dur: 1.7, text: L('Whoa. Going somewhere?', 'וואו. לאן אתה ממהר?', 'Опа. Далеко собрался?') },
        { t: 11.3, who: 'fang', dur: 2.0, text: L('Move, kid. Or I move you.', 'זוז, ילד. או שאני אזיז אותך.', 'С дороги, малой. Или я тебя подвину.') },
        { t: 13.5, who: 'fighter', dur: 2.6, text: L('Give the lady her bag back.', 'תחזיר לגברת את התיק.', 'Верни даме сумку.') },
        { t: 16.6, who: 'fang', text: L('You asked for it.', 'ביקשת את זה.', 'Сам напросился.') }
      ]
    },

    /* Beat 6, after a won street fight: Mrs. Hazel gets her bag back; she, Otto and the stall owners hand over the reward
     * (exactly the heavy bag's price, game-domain.js storyRewards.market_robber). */
    dream_market_reward: {
      set: 'dream_market', place: 'street', duration: 26, chapter: 1, tap: true, outfit: { fighter: 'street' },
      carry: {
        handbag: [{ t: 0, on: 'fighter', hand: 'L' }, { t: 2.3, on: 'hazel', hand: 'L' }],
        pouch: [{ t: 0, on: 'off' }, { t: 12.0, on: 'hazel', hand: 'R' }, { t: 14.1, on: 'fighter', hand: 'R' }]
      },
      camera: [
        { t: 0, pos: [-.2, 1.7, 4.6], look: [-.1, 1.3, -.2] },                                // two-shot: the bag goes back
        { t: 4.2, pos: [-.15, 1.65, 4.2], look: [-.1, 1.3, -.2], ease: 'linear' },
        { t: 4.2, cut: true, pos: [1.9, 1.7, 1.95], look: [-.85, 1.6, .55], fov: 30 },        // over Mrs. Hazel, on the Fighter
        { t: 8.2, pos: [1.85, 1.7, 1.9], look: [-.85, 1.6, .55], fov: 29, ease: 'linear' },
        { t: 8.2, cut: true, pos: [-1.2, 1.55, 4.9], look: [1.3, 1.3, -.4] },                 // Otto comes over from his corner
        { t: 12.2, pos: [-1.0, 1.55, 4.5], look: [1.0, 1.3, -.3], ease: 'smooth' },
        { t: 12.2, cut: true, pos: [-2.2, 1.6, 3.3], look: [.2, 1.3, -.1], fov: 34 },        // past the Fighter, on Mrs. Hazel: the reward
        { t: 16.2, pos: [-2.1, 1.6, 3.15], look: [.2, 1.3, -.1], fov: 33, ease: 'linear' },
        { t: 16.2, cut: true, pos: [.3, 1.3, 2.6], look: [-.85, 1.68, .55], fov: 30 },        // low on the Fighter: "exactly a new bag"
        { t: 20.2, pos: [.25, 1.3, 2.45], look: [-.85, 1.7, .55], fov: 28, ease: 'linear' },
        { t: 20.2, cut: true, pos: [-.4, 1.65, 5.2], look: [.5, 1.3, -.3] },                  // the three of them
        { t: 26, pos: [-.4, 1.75, 5.8], look: [.5, 1.3, -.3], ease: 'smooth' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: -.85, z: .55, face: 'hazel', look: 'hazel', arms: { L: 'low' } },
          { t: 2.6, arms: {} },
          { t: 8.6, look: 'otto' },
          { t: 12.0, look: 'hazel' },
          { t: 13.8, arms: { R: 'low' } },                                                       // takes the pouch
          { t: 15.0, arms: { R: 'fist' } },
          { t: 16.4, arms: { L: 'open', R: 'fist' } },                                          // "That's exactly a new bag!"
          { t: 20.2, arms: {}, look: 'otto' }
        ] },
        hazel: { rig: 'hazel', keys: [
          { t: 0, x: .55, z: -.25, face: 'fighter', look: 'fighter', arms: {} },
          { t: 1.6, arms: { L: 'low' } },                                                        // reaches for her bag
          { t: 2.6, arms: { R: 'fist' } },                                                       // hand on her heart
          { t: 6.0, arms: {} },
          { t: 8.6, look: 'otto' },
          { t: 11.8, look: 'fighter', arms: { R: 'low' } },                                      // the pouch
          { t: 14.4, arms: {} }
        ] },
        otto: { rig: 'otto', keys: [
          { t: 0, x: 6.4, z: 1.6, act: 'off' },
          { t: 8.2, act: 'idle' },
          { t: 8.2, x: 6.4, z: 1.6 },
          { t: 10.4, x: 1.75, z: .85, face: 'fighter', look: 'fighter', arms: { L: 'hang', R: 'wave' } },
          { t: 11.6, arms: {} },
          { t: 20.4, arms: { R: 'point' } },                                                     // "Otto's Corner. I've got one."
          { t: 23.0, arms: { L: 'hips', R: 'hips' } }
        ] }
      },
      props: {},
      lines: [
        { t: .9, who: 'hazel', hold: true, text: L('My bag! Oh, thank you, dear. Are you hurt?', 'התיק שלי! תודה, יקירי. אתה בסדר?', 'Моя сумка! Спасибо, милый. Не ранен?') },
        { t: 4.4, who: 'fighter', hold: true, text: L("I'm fine. He won't be back.", 'אני בסדר. הוא לא יחזור.', 'Я в порядке. Он сюда не вернётся.') },
        { t: 9.0, who: 'otto', hold: true, text: L('Saw it all from my door. Bravo!', 'ראיתי הכול מהדלת שלי. בראבו!', 'Всё видел со своего порога. Браво!') },
        { t: 12.4, who: 'hazel', hold: true, text: L('The whole row chipped in. {price} coins. Take it.', 'כל השוק אסף בשבילך. {price} מטבעות. קח.', 'Весь ряд скинулся. {price} монет. Бери.') },
        { t: 16.4, who: 'fighter', hold: true, text: L("{price}? That's exactly a new heavy bag!", '{price}? זה בדיוק שק כבד חדש!', '{price}? Ровно на новый тяжёлый мешок!') },
        { t: 20.4, who: 'otto', hold: true, text: L("Then come to Otto's Corner. I've got one.", 'אז בוא לפינה של אוטו. יש לי אחד.', 'Тогда загляни в лавку Отто. Есть такой.') }
      ]
    },

    /* Beat 7. Otto's Corner: the Fighter walks in, Otto greets him and shows the heavy bag; the purchase is confirmed in the
     * scene (the save action of buy_heavy_bag); he carries the bag out on his shoulder. */
    dream_otto_shop: {
      set: 'dream_shop', place: 'shop', duration: 35.5, chapter: 1, tap: true, outfit: { fighter: 'street' }, buy: { t: 21.8 },
      carry: { heavybag: [{ t: 0, on: 'display' }, { t: 27.5, on: 'shoulder' }] },
      camera: [
        { t: 0, pos: [-5.6, 1.45, 3.4], look: [-.6, 2.0, -4.2] },                              // the street: Otto's Corner
        { t: 4.4, pos: [-4.4, 1.4, 2.4], look: [.4, 2.1, -4.2], ease: 'smooth' },
        { t: 4.4, cut: true, pos: [SHOP + 1.2, 1.75, 3.1], look: [SHOP + 1.0, 1.35, -1.6] },  // inside: counter, glove wall, Otto
        { t: 7.6, pos: [SHOP + .9, 1.7, 2.8], look: [SHOP + 1.2, 1.35, -1.6], ease: 'smooth' },
        { t: 7.6, cut: true, pos: [SHOP + 2.95, 1.78, 1.45], look: [SHOP + 1.15, 1.45, -2.1], fov: 30 }, // past the Fighter, on Otto
        { t: 11.0, pos: [SHOP + 2.9, 1.78, 1.4], look: [SHOP + 1.15, 1.45, -2.1], fov: 29, ease: 'linear' },
        { t: 11.0, cut: true, pos: [SHOP + .55, 1.75, -2.85], look: [SHOP + 1.5, 1.5, -.35], fov: 32 }, // past Otto, on the Fighter
        { t: 14.2, pos: [SHOP + .5, 1.75, -2.85], look: [SHOP + 1.5, 1.52, -.35], fov: 31, ease: 'linear' },
        { t: 14.2, cut: true, pos: [SHOP + 2.4, 1.6, 3.0], look: [SHOP - .4, 1.3, -.6] },      // Otto shows the bag
        { t: 17.8, pos: [SHOP + 1.9, 1.6, 2.7], look: [SHOP - .8, 1.35, -.2], ease: 'smooth' },
        { t: 17.8, cut: true, pos: [SHOP - 1.6, 1.5, 3.1], look: [SHOP - .55, 1.35, -.05], fov: 40 }, // the new bag between them
        { t: 22.4, pos: [SHOP - 1.5, 1.5, 2.95], look: [SHOP - .55, 1.35, -.05], fov: 39, ease: 'linear' },
        { t: 22.4, cut: true, pos: [SHOP - 1.95, 1.62, -1.2], look: [SHOP + .35, 1.62, .65], fov: 30 }, // "Deal!"
        { t: 27.5, pos: [SHOP - 1.9, 1.62, -1.15], look: [SHOP + .35, 1.62, .65], fov: 29, ease: 'linear' },
        { t: 27.5, cut: true, pos: [SHOP - .5, 1.8, 3.3], look: [SHOP + 1.9, 1.45, .6], fov: 40 }, // he carries it to the door
        { t: 30.2, pos: [SHOP - .2, 1.8, 3.3], look: [SHOP + 2.8, 1.45, .9], fov: 40, ease: 'linear' },
        { t: 30.2, cut: true, pos: [5.6, 1.5, 1.6], look: [1.6, 1.5, -2.6] },                  // out on the street, toward the gym
        { t: 35.5, pos: [6.6, 1.6, 1.2], look: [5.0, 1.4, -2.4], ease: 'linear' }
      ],
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: -6.2, z: -2.4, arms: {} },
          { t: 3.6, x: -.9, z: -2.85, look: { yaw: 0, pitch: .3 } },                             // looks up at the sign
          { t: 4.4, x: .9, z: -3.3 },
          { t: 4.4, x: SHOP + 3.55, z: 1.45, jump: true, look: { yaw: 0, pitch: 0 } },           // inside, at the door
          { t: 7.0, x: SHOP + 1.45, z: -.4, face: 'otto', look: 'otto' },
          { t: 11.2, arms: { R: 'open' } },                                                      // "Mrs. Hazel sent me."
          { t: 14.2, arms: {} },
          { t: 15.0, x: SHOP + 1.45, z: -.4 },
          { t: 17.2, x: SHOP + .35, z: .65, face: [SHOP - 1.15, .45], look: [SHOP - 1.15, 1.6, .45] },
          { t: 19.6, look: 'otto' },
          { t: 22.5, arms: { R: 'fist' } },                                                      // "Deal!"
          { t: 23.8, arms: {} },
          { t: 27.5, x: SHOP + .35, z: .65, arms: { R: 'hang' }, look: { yaw: 0, pitch: 0 } },
          { t: 30.2, x: SHOP + 3.55, z: 1.45 },
          { t: 30.2, x: .9, z: -3.4, jump: true },                                               // out of the door
          { t: 35.5, x: 7.2, z: -2.2 }
        ] },
        otto: { rig: 'otto', keys: [
          { t: 0, x: SHOP + 1.25, z: -2.2, face: [SHOP + 1.25, 0], arms: { L: 'hips', R: 'hips' }, look: { yaw: 0, pitch: -.2 } },
          { t: 5.2, look: 'fighter', arms: { R: 'wave' } },                                      // "Welcome!"
          { t: 7.4, arms: {} },
          { t: 11.2, arms: { L: 'hips', R: 'hips' } },
          { t: 14.6, arms: { R: 'point' } },                                                     // "Right this way."
          { t: 15.0, x: SHOP + 1.25, z: -2.2 },
          { t: 16.2, x: SHOP - .25, z: -2.05 },
          { t: 17.6, x: SHOP - .1, z: -.5, face: 'fighter', look: 'fighter', arms: { L: 'open' } },
          { t: 18.0, arms: { R: 'open' } },                                                      // "Double-stitched."
          { t: 21.0, arms: { L: 'hips', R: 'open' } },
          { t: 26.0, arms: { L: 'hips', R: 'point' } },                                          // "Lift with your legs!"
          { t: 27.5, arms: { L: 'hips', R: 'wave' } },
          { t: 29.6, arms: { L: 'hips', R: 'hips' } }
        ] }
      },
      props: {},
      lines: [
        { t: 7.8, who: 'otto', hold: true, text: L("Welcome to Otto's Corner! Mind the step.", 'ברוך הבא לפינה של אוטו! זהירות, מדרגה.', 'Добро пожаловать в лавку Отто! Тут ступенька.') },
        { t: 11.2, who: 'fighter', hold: true, text: L('Mrs. Hazel sent me. I need a heavy bag.', 'גברת הייזל שלחה אותי. אני צריך שק כבד.', 'Меня прислала миссис Хейзел. Нужен тяжёлый мешок.') },
        { t: 14.4, who: 'otto', hold: true, text: L('The hero of Market Row! Right this way.', 'הגיבור של השוק! בוא, מכאן.', 'Герой рынка! Прошу сюда.') },
        { t: 18.0, who: 'otto', hold: true, text: L("Double-stitched. She'll outlast us both.", 'תפר כפול. הוא עוד ישרוד את שנינו.', 'Двойная строчка. Нас обоих переживёт.') },
        { t: 21.0, who: 'otto', text: L("{price} coins, and she's yours.", '{price} מטבעות, והוא שלך.', '{price} монет — и он твой.') },
        { t: 22.5, who: 'fighter', hold: true, text: L('Deal! Here you go.', 'סגרנו! הנה.', 'По рукам! Держите.') },
        { t: 26.0, who: 'otto', hold: true, text: L('Lift with your legs, champ!', 'תרים עם הרגליים, אלוף!', 'Поднимай ногами, чемпион!') },
        { t: 31.0, who: 'fighter', text: L("Bruno's going to love this.", 'ברונו הולך לאהוב את זה.', 'Бруно это понравится.') }
      ]
    }
  };
  // The reward line names the price; filled when the scene plays (the price lives in game-domain.js).
  const fill = (scene, price) => price == null ? scene : { ...scene, lines: scene.lines.map(l => ({ ...l, text: Object.fromEntries(Object.entries(l.text).map(([k, v]) => [k, String(v).replace(/\{price\}/g, String(price))])) })) };
  const api = { scenes, ids: Object.keys(scenes), fill, JACKET_T, places: { BAG_FLOOR, HZ, SHOP } };
  if (typeof module !== 'undefined') module.exports = api;
  else { window.MarketCore = api; window.DreamCore?.register?.(scenes); }
})();
