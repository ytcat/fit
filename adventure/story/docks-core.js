/* Chapter 1 films 11 and 12 (docs/adventure/FILMS.md, docs/adventure/CHAPTER1_SCRIPT_V2.md beats 10 and 12):
 *   dream_docks        beat 10, before the bare-knuckle fight: night at the Docks. Bruno brings the Fighter (track pants, hand wraps)
 *                      in from the quay; no ring, a crowd in a circle, cash on a drum; he sees it is illegal, Bruno leaves it to him,
 *                      he stays; Rourke (crocodile dock worker) waits in the circle. Hands over to the fight (oldtown.js docks_fight).
 *   dream_docks_after  after the fight: 'win' Rourke pays the purse and the Fighter says it goes to the gym; 'loss' Rourke's jibe.
 *   dream_fight_night  beat 12, before the rematch: evening in Bruno's Gym, the neighbourhood (Mrs. Hazel, Otto, Mack) round the
 *                      ring, Brick waiting in it; variant 'won' when the Fighter won the first fight.
 *   dream_chapter_end  after the rematch is won: in the ring, Bruno's verdict, Brick's respect; then the chapter summary.
 * Lines reuse adventure/story.js where the script already has them. Rourke's rig is 'rourke' (adventure/story/cast-docks.js); while it
 * is missing the scenes are not registered and the steps keep their portrait lines (oldtown.js falls back by itself). */
(() => {
  const C = typeof module !== 'undefined' ? require('./dream-core.js') : window.DreamCore;
  const Story = typeof module !== 'undefined' ? require('../story.js') : window.AdventureStory;
  const L = (en, he, ru) => ({ en, he, ru });
  const said = (id, kind, i, t, who) => { const l = Story.lines[id][kind][i]; return { t, who: who || l.who, text: l.text, hold: true }; };
  const PRIZE = (typeof window !== 'undefined' && window.GameDomain?.storyRewards?.docks_fight) || 120;
  const prize = s => String(s).replace(/\{prize\}/g, String(PRIZE));
  const P = (en, he, ru) => L(prize(en), prize(he), prize(ru));

  /* ---------------------------------------------------------------- beat 10: the Docks (arena-sets.js docks: circle at 0,0; quay door on -z) */
  const DOOR = [1.5, -11.2], STOP_F = [.4, -1.85], STOP_B = [-.55, -2.25], ROURKE = [.15, .95];
  const docks = {
    set: 'dream_docks', place: 'docks', chapter: 1, tap: true, duration: 24, outfit: { fighter: 'track_wraps' },
    actors: {
      fighter: { rig: 'fighter', keys: [
        { t: 0, x: 1.9, z: -15.5, face: [.2, -4], look: { yaw: 0, pitch: .1 } },                        // in through the quay door
        { t: 4.4, x: .9, z: -8.6, look: { yaw: 0, pitch: 0 } },
        { t: 6.4, x: .25, z: -4.6 },                                                                 // the lane through the crowd
        { t: 8.6, x: STOP_F[0], z: STOP_F[1], face: [ROURKE[0], ROURKE[1]], look: [0, 1.4, .3] },
        { t: 10.6, look: 'bruno', face: 'bruno' },
        { t: 13.3, arms: { R: 'open' } }, { t: 14.6, arms: {} },
        { t: 16.0, look: [ROURKE[0], 1.6, ROURKE[1]], face: [ROURKE[0], ROURKE[1]] },
        { t: 17.4, arms: { L: 'fist', R: 'fist' } }, { t: 18.8, arms: {} },                         // "I didn't come this far to walk away."
        { t: 21.6, arms: { R: 'fist' } }
      ] },
      bruno: { rig: 'bruno', keys: [
        { t: 0, x: .7, z: -16.1, face: [.2, -4], look: 'fighter' },
        { t: 4.6, x: -.1, z: -9.2 },
        { t: 6.8, x: .0, z: -5.2 },
        { t: 9.0, x: STOP_B[0], z: STOP_B[1], face: [0, .3], look: [0, 1.4, .3] },
        { t: 11.4, look: 'fighter', face: 'fighter', arms: { R: 'open' } }, { t: 13.0, arms: { L: 'hips', R: 'hips' } },
        { t: 19.4, look: [ROURKE[0], 1.6, ROURKE[1]] }
      ] },
      hook: { rig: 'rourke', keys: [
        { t: 0, x: ROURKE[0], z: ROURKE[1], face: [STOP_F[0], STOP_F[1]], look: [1.2, 1.6, -9], arms: { L: 'hips', R: 'hips' } },
        { t: 8.0, look: 'fighter' },
        { t: 18.6, arms: { R: 'point' } },                                                          // "Fresh meat. Wrap those hands, pup."
        { t: 20.6, x: ROURKE[0], z: ROURKE[1], arms: { L: 'fist', R: 'fist' } },
        { t: 21.8, x: ROURKE[0], z: .6 }
      ] }
    },
    camera: [
      { t: 0, pos: [-.7, 1.95, 1.7], look: [1.4, 1.5, -11], fov: 40 },                                // from the circle: the quay door, night outside, two figures
      { t: 4.4, pos: [-.6, 1.9, 1.5], look: [.9, 1.45, -8.5], fov: 38, ease: 'smooth' },
      { t: 4.4, cut: true, pos: [1.7, 1.7, -.6], look: [.3, 1.5, -6.2], fov: 36 },                  // through the lane in the crowd
      { t: 8.6, pos: [1.6, 1.7, -.4], look: [-.1, 1.5, -2.4], fov: 34, ease: 'smooth' },
      { t: 8.6, cut: true, pos: [1.25, 1.65, .6], look: [-.15, 1.5, -2.05], fov: 34 },              // the two of them inside the circle
      { t: 11.6, pos: [1.2, 1.65, .5], look: [-.15, 1.5, -2.05], fov: 33, ease: 'linear' },
      { t: 11.6, cut: true, pos: [.45, 1.66, -.55], look: [-.55, 1.5, -2.25], fov: 33 },          // three-quarter front on Bruno
      { t: 16.0, pos: [.48, 1.66, -.5], look: [-.55, 1.5, -2.25], fov: 32, ease: 'linear' },
      { t: 16.0, cut: true, pos: [-.05, 1.62, -.55], look: [.4, 1.62, -1.85], fov: 31 },            // on the Fighter: he stays
      { t: 18.4, pos: [-.08, 1.62, -.45], look: [.4, 1.62, -1.85], fov: 30, ease: 'linear' },
      { t: 18.4, cut: true, pos: [-.55, 1.7, -.7], look: [.15, 1.68, .95], fov: 30 },              // three-quarter front on Rourke
      { t: 24, pos: [-.6, 1.68, -.8], look: [.15, 1.64, .7], fov: 29, ease: 'linear' }
    ],
    props: {},
    lines: [
      { t: 2.2, who: 'bruno', dur: 2.0, text: L('Stay close. And keep your mouth shut.', 'תישאר קרוב. ותסתום את הפה.', 'Держись рядом. И помалкивай.') },
      said('docks_fight', 'intro', 0, 9.6),                                                         // "No ring, no gloves... this is illegal."
      said('docks_fight', 'intro', 1, 12.0),                                                        // Bruno: "Your call. Walk away or fight."
      { t: 16.4, who: 'fighter', hold: true, text: L("I didn't come this far to walk away.", 'לא באתי עד לפה כדי ללכת.', 'Я не для того так далеко зашёл, чтобы уйти.') },
      { t: 18.8, who: 'hook', hold: true, text: L('Fresh meat. Wrap those hands tight, pup.', 'בשר טרי. תהדק את התחבושות, גור.', 'Свежее мясо. Бинтуй руки крепче, щенок.') },
      { t: 21.8, who: 'bruno', text: L('Guard up. Go.', 'שמירה למעלה. קדימה.', 'Руки выше. Вперёд.') }
    ]
  };

  /* after the fight: in the circle under the work lamp */
  const after = win => ({
    set: 'dream_docks', place: 'docks', chapter: 1, tap: true, duration: win ? 17 : 9, outcome: win ? 'win' : 'loss', outfit: { fighter: 'track_wraps' },
    carry: win ? { pouch: [{ t: 0, on: 'off' }, { t: 3.4, on: 'hook', hand: 'R' }, { t: 6.4, on: 'fighter', hand: 'R' }] } : undefined,
    actors: {
      fighter: { rig: 'fighter', keys: win ? [
        { t: 0, x: -.55, z: -.2, face: [.9, .05], look: 'hook' },
        { t: 6.0, arms: { R: 'low' } }, { t: 7.2, arms: { R: 'fist' } },
        { t: 9.2, look: 'bruno' }, { t: 9.8, arms: { R: 'fist', L: 'open' } }, { t: 12.2, arms: {} }
      ] : [
        { t: 0, x: -.55, z: -.2, face: [.9, .05], look: 'hook', lean: .08, arms: { L: 'low', R: 'hang' } },
        { t: 5.0, look: 'bruno' }
      ] },
      hook: { rig: 'rourke', keys: win ? [
        { t: 0, x: 2.35, z: -.05, face: [2.9, -.08], look: [2.9, .9, -.08] },                        // at the drum
        { t: 2.6, arms: { R: 'low' } },                                                            // picks up the purse
        { t: 3.6, x: 2.35, z: -.05, arms: {} },
        { t: 5.2, x: .75, z: .05, face: 'fighter', look: 'fighter', arms: { R: 'low' } },
        { t: 7.0, arms: {} }, { t: 13.4, arms: { R: 'thumb' } }, { t: 15.0, arms: {} }
      ] : [
        { t: 0, x: .95, z: .1, face: 'fighter', look: 'fighter', arms: { L: 'hips', R: 'hips' } },
        { t: 1.2, arms: { R: 'point' } }, { t: 3.4, arms: { L: 'hips', R: 'hips' } }
      ] },
      bruno: { rig: 'bruno', keys: [
        { t: 0, x: -1.7, z: -1.9, face: 'fighter', look: 'fighter' },
        { t: win ? 9.0 : 4.6, x: -1.15, z: -1.1, face: 'fighter', look: 'fighter', arms: win ? { R: 'thumb' } : { R: 'open' } },
        { t: win ? 11.0 : 6.6, arms: {} }
      ] }
    },
    camera: win ? [
      { t: 0, pos: [.6, 1.75, -1.2], look: [2.6, 1.0, -.05], fov: 36 },                               // Rourke at the drum (every camera inside the circle)
      { t: 3.8, pos: [.7, 1.72, -1.15], look: [2.4, 1.05, -.05], fov: 36, ease: 'smooth' },
      { t: 3.8, cut: true, pos: [-2.0, 2.15, 1.2], look: [.1, 1.25, -.07], fov: 40 },               // the purse changes hands (from behind the Fighter, high)
      { t: 8.6, pos: [-1.95, 2.1, 1.15], look: [.1, 1.25, -.07], fov: 39, ease: 'linear' },
      { t: 8.6, cut: true, pos: [.55, 1.62, -.9], look: [-.55, 1.62, -.2], fov: 30 },               // on the Fighter: "this goes to the gym"
      { t: 13.0, pos: [.52, 1.62, -.85], look: [-.55, 1.62, -.2], fov: 29, ease: 'linear' },
      { t: 13.0, cut: true, pos: [-.2, 2.2, -2.3], look: [.2, 1.2, .1], fov: 40 },                  // the three of them in the circle
      { t: 17, pos: [-.25, 2.3, -2.4], look: [.2, 1.2, .1], fov: 40, ease: 'smooth' }
    ] : [
      { t: 0, pos: [.2, 1.6, -2.2], look: [.2, 1.45, 0], fov: 34 },
      { t: 4.4, pos: [.15, 1.6, -2.1], look: [.2, 1.45, 0], fov: 33, ease: 'linear' },
      { t: 4.4, cut: true, pos: [-.6, 2.1, -2.2], look: [-.4, 1.2, -.4], fov: 38 },
      { t: 9, pos: [-.65, 2.25, -2.3], look: [-.4, 1.2, -.4], fov: 38, ease: 'smooth' }
    ],
    props: {},
    lines: win ? [
      { t: 4.2, who: 'hook', hold: true, text: P('You hit hard, pup. {prize} coins. Yours.', 'אתה מכה חזק, גור. {prize} מטבעות. שלך.', 'Бьёшь крепко, щенок. {prize} монет. Твои.') },
      { t: 9.4, ...said('docks_fight', 'outro', 1, 9.4) },                                            // "This money goes to the gym."
      { t: 13.4, who: 'hook', hold: true, text: L('Come back any night. They will pay to see you.', 'תחזור מתי שתרצה. ישלמו כדי לראות אותך.', 'Приходи в любую ночь. За тебя будут платить.') },
      { t: 15.2, who: 'bruno', text: L('He won\'t. We have a real fight coming.', 'הוא לא יחזור. יש לנו קרב אמיתי בדרך.', 'Не придёт. У нас впереди настоящий бой.') }
    ] : [
      said('docks_fight', 'lost', 0, 1.0, 'hook'),                                                   // "The Docks aren't a gym, pup."
      { t: 4.8, who: 'bruno', hold: true, text: L('Get up. We learn and we come back.', 'קום. לומדים וחוזרים.', 'Вставай. Учимся и возвращаемся.') }
    ]
  });

  /* ---------------------------------------------------------------- beat 12: fight night in Bruno's Gym (dream-sets.js: the ring at -4.6, -3.3) */
  const RX = -4.6, RZ = -3.3, TOP = .92, STEPS = [-3.3, -.2];
  const night = won => ({
    set: 'dream_gym', place: 'gym', chapter: 1, tap: true, duration: 21, evening: true, outfit: { fighter: 'kit', pip: 'kit' },
    actors: {
      fighter: { rig: 'fighter', keys: [
        { t: 0, x: 2.6, z: 4.2, face: [RX, RZ], look: [RX, 1.6, RZ] },                                 // in from the locker side
        { t: 5.6, x: STEPS[0] + .4, z: STEPS[1] + .9, face: [RX, RZ], look: 'bruno' },
        { t: 8.2, look: 'hazel' }, { t: 9.0, arms: { R: 'wave' } }, { t: 10.2, arms: {} },
        { t: 11.0, look: [RX, 1.9, RZ], face: [RX, RZ] },
        { t: 14.6, look: 'bruno', face: 'bruno' }, { t: 17.8, look: [RX, 1.9, RZ], face: [RX, RZ], arms: { L: 'fist', R: 'fist' } }
      ] },
      bruno: { rig: 'bruno', keys: [
        { t: 0, x: -2.25, z: .55, face: 'fighter', look: 'fighter', arms: { L: 'hips', R: 'hips' } },
        { t: 5.6, x: -2.4, z: .9, face: 'fighter', look: 'fighter', arms: {} },
        { t: 14.8, arms: { R: 'point' } }, { t: 16.4, arms: { L: 'hips', R: 'hips' } }                 // "The whole neighbourhood's here."
      ] },
      brick: { rig: 'brick', keys: [
        { t: 0, x: RX + .6, y: TOP, z: RZ + .9, face: [STEPS[0], STEPS[1]], look: [STEPS[0], 1.6, STEPS[1]], arms: { L: 'hips', R: 'hips' } },
        { t: 11.2, arms: { R: 'point' } }, { t: 13.2, arms: { L: 'fist', R: 'fist' } }
      ] },
      hazel: { rig: 'hazel', keys: [
        { t: 0, x: -.6, z: 1.9, face: [RX, RZ], look: [RX, 1.7, RZ] },
        { t: 7.6, look: 'fighter' }, { t: 8.4, arms: { R: 'wave' } }, { t: 9.8, arms: {} }, { t: 11.2, look: [RX, 1.7, RZ] }
      ] },
      otto: { rig: 'otto', keys: [
        { t: 0, x: .55, z: 1.3, face: [RX, RZ], look: [RX, 1.7, RZ], arms: { L: 'hips', R: 'hips' } },
        { t: 7.8, look: 'fighter', arms: { R: 'thumb' } }, { t: 9.6, arms: { L: 'hips', R: 'hips' } }, { t: 11.2, look: [RX, 1.7, RZ] }
      ] },
      pip: { rig: 'pip', keys: [
        { t: 0, x: -1.25, z: -.05, face: [RX, RZ], look: [RX, 1.7, RZ] },
        { t: 6.0, look: 'fighter', face: 'fighter', arms: { R: 'fist' } }, { t: 7.4, arms: {} }, { t: 11.2, look: [RX, 1.7, RZ], face: [RX, RZ] }
      ] }
    },
    camera: [
      { t: 0, pos: [3.4, 2.4, 8.4], look: [-2.2, 1.3, -1.4], fov: 44 },                                // the hall at night: people round the ring
      { t: 5.4, pos: [2.2, 2.2, 7.0], look: [-2.6, 1.3, -1.6], fov: 42, ease: 'smooth' },
      { t: 5.4, cut: true, pos: [-3.7, 1.65, 2.1], look: [-.5, 1.45, .9], fov: 38 },                   // the neighbours turn and greet him
      { t: 11.0, pos: [-3.75, 1.65, 2.2], look: [-.6, 1.45, .9], fov: 37, ease: 'linear' },
      { t: 11.0, cut: true, pos: [-1.45, 1.4, -1.6], look: [RX + .6, 2.05, RZ + .9], fov: 32 },          // up at Brick, through the ropes
      { t: 14.6, pos: [-1.4, 1.35, -1.55], look: [RX + .6, 2.1, RZ + .9], fov: 31, ease: 'linear' },
      { t: 14.6, cut: true, pos: [-3.3, 1.65, 1.9], look: [-2.4, 1.55, .9], fov: 32 },                  // Bruno to the Fighter
      { t: 18.0, pos: [-3.32, 1.65, 1.95], look: [-2.4, 1.55, .9], fov: 31, ease: 'linear' },
      { t: 18.0, cut: true, pos: [-1.9, 1.55, 2.4], look: [-3.0, 1.6, .55], fov: 32 },                  // on the Fighter: "Let's go."
      { t: 21, pos: [-1.95, 1.55, 2.5], look: [-3.0, 1.6, .55], fov: 31, ease: 'linear' }
    ],
    props: {},
    lines: [
      { t: 6.2, who: 'pip', hold: true, text: L('Look at this place. Full!', 'תראה את המקום. מלא!', 'Ты глянь. Полный зал!') },
      { t: 8.6, who: 'hazel', hold: true, text: L('We came for you, dear. Be careful!', 'באנו בשבילך, יקירי. תיזהר!', 'Мы пришли ради тебя, милый. Осторожнее!') },
      said('brick', won ? 'intro_won' : 'intro', 0, 11.4),                                            // Brick from the ring
      said('brick', 'intro', 1, 15.0),                                                              // Bruno: "The whole neighbourhood's here. Show them."
      { t: 18.2, who: 'fighter', text: L("Let's go.", 'קדימה.', 'Поехали.') }
    ]
  });

  /* after the rematch is won: the winner in the ring, the neighbours below it */
  const end = {
    set: 'dream_gym', place: 'gym', chapter: 1, tap: true, duration: 20, evening: true, outfit: { fighter: 'kit', pip: 'kit' },
    actors: {
      fighter: { rig: 'fighter', keys: [
        { t: 0, x: RX - .3, y: TOP, z: RZ + .4, face: [RX + 2.6, RZ + 2.6], look: [-1, 1.4, 1.2], arms: { L: 'fist', R: 'fist' } },
        { t: 3.0, arms: {} }, { t: 4.2, look: 'bruno', face: [RX + 2.4, RZ + 3.2] },
        { t: 11.6, look: 'brick', face: 'brick' }, { t: 14.4, arms: { R: 'open' } }, { t: 16.4, arms: {} }
      ] },
      brick: { rig: 'brick', keys: [
        { t: 0, x: RX + 1.1, y: TOP, z: RZ - .5, face: 'fighter', look: 'fighter', lean: .06 },
        { t: 11.4, x: RX + .6, y: TOP, z: RZ, lean: 0 }, { t: 12.4, arms: { R: 'open' } }, { t: 15.0, arms: {} }
      ] },
      bruno: { rig: 'bruno', keys: [
        { t: 0, x: -2.1, z: .2, face: [RX, RZ], look: 'fighter' },
        { t: 4.8, arms: { R: 'point' } }, { t: 6.4, arms: { L: 'hips', R: 'hips' } }
      ] },
      hazel: { rig: 'hazel', keys: [{ t: 0, x: -.6, z: 1.9, face: [RX, RZ], look: 'fighter', arms: { R: 'wave' } }, { t: 2.4, arms: {} }] },
      otto: { rig: 'otto', keys: [{ t: 0, x: .55, z: 1.3, face: [RX, RZ], look: 'fighter', arms: { L: 'fist', R: 'fist' } }, { t: 2.6, arms: { R: 'thumb' } }, { t: 4.4, arms: {} }] },
      pip: { rig: 'pip', keys: [{ t: 0, x: -1.25, z: -.05, face: [RX, RZ], look: 'fighter', arms: { L: 'fist', R: 'fist' } }, { t: 3.2, arms: {} }] }
    },
    camera: [
      { t: 0, pos: [-1.3, 1.2, -1.2], look: [RX - .2, 2.2, RZ + .4], fov: 40 },                          // low, through the ropes: the winner
      { t: 4.4, pos: [-1.35, 1.2, -1.3], look: [RX - .2, 2.25, RZ + .4], fov: 39, ease: 'linear' },
      { t: 4.4, cut: true, pos: [-2.7, 2.15, -1.0], look: [-2.1, 1.5, .2], fov: 34 },                    // from the ring down at Bruno: the verdict
      { t: 11.2, pos: [-2.75, 2.2, -1.05], look: [-2.1, 1.5, .2], fov: 33, ease: 'linear' },
      { t: 11.2, cut: true, pos: [RX + 2.4, 2.1, RZ + 2.2], look: [RX + .1, 1.95, RZ - .1], fov: 32 },   // Brick and the Fighter
      { t: 20, pos: [RX + 2.7, 2.2, RZ + 2.6], look: [RX + .1, 1.95, RZ - .1], fov: 34, ease: 'smooth' }
    ],
    props: {},
    lines: [
      { t: 1.2, who: 'pip', text: L('Champ! Champ!', 'אלוף! אלוף!', 'Чемпион! Чемпион!') },
      said('brick', 'outro', 0, 5.0),                                                                 // Bruno: "Now you need real gear and a real league."
      { t: 8.4, who: 'fighter', hold: true, text: L('A real league? Then I start tomorrow.', 'ליגה אמיתית? אז אני מתחיל מחר.', 'Настоящая лига? Тогда начну завтра.') },
      said('brick', 'outro', 1, 12.6)                                                                 // Brick: "Good fight, champ. I mean it."
    ]
  };

  const scenes = { dream_docks: docks, dream_docks_after: after(true), dream_fight_night: night(false), dream_chapter_end: end };
  const variants = { dream_docks_after: { win: after(true), loss: after(false) }, dream_fight_night: { won: night(true), lost: night(false) } };
  const api = { scenes, variants, ids: Object.keys(scenes), PRIZE, places: { DOOR, STOP_F, STOP_B, ROURKE, RING: [RX, RZ, TOP] } };
  if (typeof module !== 'undefined') module.exports = api;
  else {
    window.DocksCore = api;
    // The gym films register now; the Docks films need Rourke's rig (cast-docks.js): without it they stay unregistered and the step
    // keeps its portrait lines.
    const pick = ids => [Object.fromEntries(ids.map(k => [k, scenes[k]])), Object.fromEntries(ids.filter(k => variants[k]).map(k => [k, variants[k]]))];
    window.DreamCore?.register?.(...pick(['dream_fight_night', 'dream_chapter_end']));
    const docksIn = () => { if (window.StoryCast?.defs?.rourke) window.DreamCore?.register?.(...pick(['dream_docks', 'dream_docks_after'])); };
    if (window.StoryCast?.defs?.rourke) docksIn(); else window.addEventListener('DOMContentLoaded', docksIn);
  }
})();
