# Chapter 1 "The Dream" — hooks for the story flow (GOTR-0078, slice 1)

Branch `agent/dream-1` builds the pictures (cast, clothes, opening film, gym conversation). Branch `agent/dream-flow` owns the
step list and the fight rules. This page is the contract between them. Everything here is a browser global; nothing needs an
import. Terms: Coach = Bruno, Fighter = the player's boxer, Opponent = whoever he faces.

## Files (load order, all `defer`, after `adventure/story/story-scenes.js`)
| File | Global | What |
|---|---|---|
| `adventure/story/dream-core.js` | `DreamCore` | Pure data: scene scripts, lines EN/HE/RU, validation. Loads in node (`require`). |
| `adventure/story/story-cast.js` | `StoryCast` | Characters Bruno and Brick, outfits, bare hands, duffel bag. |
| `adventure/story/cast-market.js` | registers into `StoryCast` | Fang, Mrs. Hazel and Otto (GOTR-0092); loads right after `story-cast.js`. |
| `adventure/story/dream-pose.js` | `DreamPose` | Everyday poses on the fight rig: standing, walk cycle, talk gestures, head turns (`DreamPose.civil(rig, state)`). |
| `adventure/story/dream-sets.js` | registers sets in `StorySets` | `dream_street` (bus station → Bruno's Gym front), `dream_gym` (gym hall). |
| `adventure/story/dream-scenes.js` | `DreamScenes` | Player for the three scenes. `StoryScenes.play` forwards the ids below to it. |

## Scenes — `StoryScenes.play(id, { onDone, outcome?, reducedMotion?, timeScale? }) -> true when it starts`
| id | Beat | What the player sees | Ends with |
|---|---|---|---|
| `dream_opening` | 0 | Map dive → bus station; the bus stops; the Fighter steps off (street clothes, duffel bag), looks up; walks to Bruno's Gym. | Fighter at the gym door. |
| `dream_gym_talk` | 1 | Gym hall. Fighter (street clothes, bag down) and Bruno talk; Bruno: "Words are cheap. Show me." Brick steps forward. | Brick facing the Fighter → start the fight. |
| `dream_after_brick` | 2 (after the fight) | Bruno's job offer. `outcome: 'loss'` (default): "You got up. That I can work with." `outcome: 'win'`: he is stunned, same offer. | Offer made → unlock beat 3 and side job A. |

- `onDone(result)`; `result = { id, skipped: boolean, outcome?: 'loss' | 'win', error?: string }`. It is called exactly once, also on
  Skip, on Esc and when the scene could not start (`error` set, `skipped: true`). The story always advances on `onDone`.
- Controls: the "Skip" button (and Esc) ends the scene at once. In the film a tap does nothing else; in the two conversations a
  tap (or Space / Enter) shows the next line. No timers to wait for in conversations.
- `StoryScenes.sceneIds` lists the three ids; `StoryScenes.playing` is the id while one runs; `StoryScenes.stop()` skips it.
- QA: `DreamScenes.debug` (running scene state: `t`, `shot`, `lineIndex`, `waiting`), `DreamScenes.seek(seconds)`,
  `StoryScenes.stats()` (draw calls, triangles of the last frame). `{ noMap: true }` starts the film on the street.
- Skip in `dream_opening` jumps to the gym door (about one second of the last shot), then `onDone({ skipped: true })`.
- The scenes dress the Fighter themselves (`street`) and always put the boxing kit back before `onDone`.

## Outfits — `StoryCast.outfit(rig, name)`
- `StoryCast.outfit(engine.coach, 'street')` → hoodie, jeans, worn sneakers, bare hands. `'kit'` → the boxing kit exactly as it
  was (gloves, trunks, boots and any Shop gear: the visibility of every hidden part is restored, nothing is rebuilt).
- `StoryCast.outfitOf(rig) -> 'kit' | 'street' | …`; `StoryCast.outfits -> ['kit', 'street', …]`.
- `StoryCast.bag(rig, 'shoulder' | 'off')` → the duffel bag on the shoulder, or hidden (sets put their own bag prop on the floor).
- Later outfits (`track_wraps`): `StoryCast.registerOutfit(name, { cloth(rig) -> v => ({ d, c, move? }) | null, parts(rig, add), hide: ['gloves', 'shorts', 'boots', 'trim', 'fur'] })`
  (`cloth` dresses the skin itself: offset `d` metres along the normal and colour `c` per rest-pose vertex; `parts` adds small meshes).
- Works on both Fighter species (lion, rabbit). Call `outfit(rig, 'kit')` before a gym fight if you dressed the rig yourself.

## Characters — `bruno`, `brick`
- `StoryCast.ids -> ['bruno', 'brick']`; `StoryCast.rig(id, engine) -> rig` (a `LionCoach` on the game's own skeleton, cached;
  `rig.character === id`). Same `update()` / fight animation API as the lion and the rabbit.
- **Brick as the fight Opponent:** `const restore = StoryCast.asOpponent(engine, 'brick')` before the fight is started
  (before `startFight` / `arena.setTarget('rabbit')`), and `restore()` after the result. While set, the sparring partner slot
  (`engine.arena.rabbit`) is Brick; the fight code, HUD and scoring are untouched.
- `StoryCast.names[id][lang]` → display name (`Bruno`, `Brick`) for HUD labels (the fight HUD still shows its own Opponent name).
- Both are built on the lion body, so `rig.species === 'lion'` for either Fighter species; tell them apart by `rig.character`.
- Scene scripts use `rig: 'bruno' | 'brick' | 'fighter'`.

## Beat 4: the old bag breaks (GOTR-0087) — `adventure/story/bag-break-core.js` (`BagBreakCore`, node too), `adventure/story/bag-break.js` (`BagBreak`)
- Film `dream_bag_break` (about 14.6 s, Skip / Esc at any time, `StoryScenes.play` forwards it): night gym, one lamp; Jab-Cross,
  then the big rear-hand Cross (the game's own punch animation, slowed at the impact); the leather folds, the top chain link
  snaps, the bag swings up, lands on its end, bounces, tips over and rolls; reaction in the everyday pose; one line
  "…Bruno's going to kill me." (EN/HE/RU). The Fighter wears the kit; his root scale, outfit and place are handed back.
- Wiring (`adventure/oldtown.js`): `night_bag` has `after: 'dream_bag_break'`; the film plays the FIRST time the step is
  finished with at least 1 ★, then the step's after-beat goes on. A finished step shows "Watch the scene ▶" in its beat.
  `BagBreak.filmFor('night_bag') -> 'dream_bag_break'`.
- **Gym state hook:** `BagBreak.gymState() -> 'hanging' | 'broken' | 'new'` from the save (`BagBreakCore.gymState(game)`):
  `'broken'` once `night_bag` has a star, `'new'` once `buy_heavy_bag` is done (beat 7). The set `dream_gym` calls
  `BagBreak.dress(ctx)`, so every gym scene shows the old bag hanging, the bag on the floor under the empty chain, or the new
  (blue) bag; `set.objects.oldBag` is that rig (`.state`, `.bag.group`, `.links`). QA: `BagBreak.force = 'broken'` overrides the save.
- The night training hits the same bag: `BagBreak.training(true)` dresses the training heavy bag in the old bag's leather,
  chain and pipe while `night_bag` runs; `training(false)` (on leaving) puts the game's bag back.
- Physics (all precomputed at 480 Hz, sampled at 120 Hz): rigid bag on a chain constraint (double pendulum), punch impulses,
  snap, free flight, floor contacts with restitution and Coulomb friction, rolling resistance; 13 chain links (4 stay on the
  mount, 3 fly, 6 stay on the bag's ring); the lamp is a damped pendulum. `BagBreakCore.sample(simT)`, `.rest()`, `.track().events`.
- Tests: `tests/dream-bag-break.test.cjs` (node part + browser part). Evidence tool: `qa/gotr-0087/tools/film.cjs`.

## Characters — `fang`, `hazel`, `otto` (GOTR-0092, `adventure/story/cast-market.js`)
- Same API as Bruno and Brick: `StoryCast.rig('fang' | 'hazel' | 'otto', engine)`, `StoryCast.names[id][lang]`, `DreamPose.civil(rig, …)`;
  `StoryCast.ids` lists all five. Each wears its own clothes (`StoryCast.outfit` leaves them as they are). Scene scripts use the same ids.
- **Fang** (beat 6, the robber): big grey wolf, black leather rocker jacket over a T-shirt, gold chain, ripped jeans, boots. He never
  wears gloves: `const restore = StoryCast.asOpponent(engine, 'fang')` makes him the Opponent of the bare-handed street fight with the
  normal fight animations (bare fists); `restore()` after the result. `StoryCast.market.barehanded` lists him.
  He has the lion fighter's body (same skeleton, muscle relief, a heavyweight's few percent bigger) and runs the lion's own `update`
  (every punch, slip, roll, block, hit reaction, knockdown). `asOpponent` puts him in his fight clothes (fitted tank top, jeans,
  boots, chain); `restore()` puts the jacket back. Before the fight: `StoryCast.market.jacketOff(rig, u)` (u 0..1, about 2 s) swaps the
  clothes, shows the jacket in his hand then on the ground (in the rig's parent space) and returns the `DreamPose.civil` state
  (`{ arms, lean, look }`) for that moment. `StoryCast.market.wear(rig, 'jacket' | 'fight')` switches directly.
- **Mrs. Hazel** (beat 6, the stall owner): doe, headscarf, cardigan over a dress, stall apron; stands a little stooped (`rig.cast.stoop`).
  Her handbag is a prop in her left hand: `StoryCast.market.handbag(rig)` → the `THREE.Group` (hide it or re-parent it for the snatch).
- **Otto** (beat 7, Otto's Corner): otter, reading glasses on a cord, flannel shirt, navy shop apron, tape measure round the neck.
- Face dynamics: `StoryCast.talk(rig, a)` opens a real jaw (a skin morph; a hit in the fight opens it too); they blink; ears, cheek
  ruffs, tails and the handbag lag behind the motion. `StoryPortraits` renders their heads (no monogram badges).
- Same skeleton as the fighters: Mrs. Hazel and Otto read smaller (slimmer / lower head, shorter neck, stoop) but their legs and
  arms are the rig's; the fight rig cannot be shortened without changing the shared pose code.

## Beats 5-7 as films (GOTR-0096) — `adventure/story/market-core.js` (`MarketCore`, node too), `adventure/story/market-sets.js`
- Scenes (same format and player as above; `DreamCore.register` adds them, `StoryScenes.play` forwards them):
  `dream_apology` (beat 5, gym, tap), `dream_market_robbery` (beat 6, timed, ends with Fang facing the Fighter),
  `dream_market_reward` (after a WON street fight, tap), `dream_otto_shop` (beat 7, tap, purchase inside the film).
- Wiring (`adventure/oldtown.js`, `adventure/story-flow.js`): `dream_apology` is a `film` step and chains (first time) into
  `market_robber`; that step has `scene: 'dream_market_robbery'` (once per browser, then the fight), `cast: 'fang'`
  (`StoryCast.asOpponent(engine, 'fang')`, ringless `street` venue, bare hands) and `after: 'dream_market_reward'` (only after a
  win; a loss shows the usual lost beat and Retry, as before). `buy_heavy_bag` has `film: 'dream_otto_shop'`: played when the coins
  are enough (or owned / dev); `opts.onBuy` = the step's own save action; Skip before buying -> the old counter beat.
- Player options: `onBuy() -> boolean` (the scene waits at `scene.buy.t` with a Buy button; `result.bought`), `owned`, `price`
  (`{price}` in lines; default the heavy bag's price). Scene fields: `gymBag: 'broken'` (BagBreak.force while the set is built),
  `carry` (handbag / pouch / heavybag between hands, the ground, the display, the Fighter's shoulder; `MarketProps`), act `'jacketoff'`.
- Rigs handed back: mirrored root, outfit, Fang in his jacket, Mrs. Hazel's handbag in her hand.
- Sets (placeholders until Codex's): `dream_market` (day market row, Mrs. Hazel's stall at x 0), `dream_shop` (street front at
  x -12..12, interior at x 36..44.4, `objects.display`). Test `tests/dream-market-films.test.cjs`; evidence tool `qa/gotr-0096/tools/film.cjs`.
## Side job A: Clean the gym (GOTR-0099) — `adventure/story/mop-core.js` (`MopCore`, node too), `adventure/story/mop-game.js` (`MopGame`)
- A skill game in the story runner: `StoryScenes.play('clean_gym', { onDone, hard? })` (it is `StoryScenes.games.clean_gym`, so it
  gets the runner's pad, tutorial, hit-stop, score pops, result card, retry and hard mode). Step wiring: `adventure/oldtown.js`
  DEFS `clean_gym: { kind: 'scene', scene: 'clean_gym' }`; one star finishes side job A; replayable.
- Set `dream_gym` (place `gym`) but the game says `wear: 'street'`: the runner dresses the Fighter in street clothes, bare hands
  (`game.wear` overrides the place's outfit). Roles: `fighter`, `bruno` (the runner now takes story characters from
  `StoryCast.rig`, scale -1 at the root like everyone).
- Rules (`MopCore.MOP`): two lanes x five spots (world x = -1.0 + 0.8 * spot, streak z = 0.7 / 1.9, the Fighter 0.8 m behind it);
  left / right = a step along the lane, up = Slip to the other lane, down = Duck, `straight` (J, the "Mop" button) = wipe.
  The mop's beat: a push lands every 0.9 s after arriving; a tap within 0.15 s wipes (0.06 s = perfect), otherwise smears
  (combo lost). Every 5th streak is big (two wipes). A streak sets into a stain after 7.0 -> 4.2 s (combo lost). Bruno shoves a
  bag every 8.5 -> 5.5 s (1.1 s wind-up, the lane tape turns red): a pendulum L = 3.05 m, g = 9.81, half period 1.75 s, 0.8 rad
  out and back; it knocks the Fighter (stun 1 s, combo lost) when it meets him in its lane low enough to reach his head, unless he
  ducks or has slipped out (a dodge counts in the combo). 50 s shift.
- Result value (`metric marks`) = score / 100, floored; stars at 25 / 50 / 75 (`adventure-progress.js`). Wage per shift by stars
  `MopCore.PAY` = `GameDomain.jobs.clean_gym` = 0 / 6 / 10 / 15 coins: the save action `{ type: 'job', jobId: 'clean_gym', stars }`
  pays once per recorded shift (ledger `job:clean_gym:<n>`, rule `job-pay-v1`, checked on load: paid shifts <= recorded plays,
  stars <= best stars). The runner pays it after a finished shift with a star (`game.job`).
- Lines: Bruno's one line in the tutorial and one reaction on the result card (`AdventureStory.lines.clean_gym.job`,
  `job_0`..`job_3`, EN/HE/RU; they go into the journal via `AdventureStory.mark`).
- Pose: `DreamPose.civil` with exact hand targets (`reach`) on the mop handle, staggered feet and a shuffle for the steps; no
  change to `dream-pose.js`. QA: `StoryScenes.debug.sim` is the running `MopTrial`; evidence tool `qa/gotr-0099/clean-gym.cjs`.

## Not in this slice (owned by `agent/dream-flow`)
The step list, the "expected loss still advances" rule, rewards, saving. Suggested order for beats 0–2:
`dream_opening` → `dream_gym_talk` → fight vs Brick (`asOpponent`) → `dream_after_brick` with `outcome`.

## Measured (headless Chromium, SwiftShader, 402×690; phones not measured)
| What | Draw calls | Triangles |
|---|---|---|
| Fighter in the boxing kit (lion / rabbit) | 136 / 110 meshes | 469 k / 422 k |
| Fighter in street clothes with the bag (lion / rabbit) | 58 / 32 meshes | 341 k / 294 k |
| Bruno | 19 meshes | 293 k |
| Brick | 95 meshes | 421 k |
| Set `dream_street` / `dream_gym` | 12 / 6 meshes | 21 k / 13 k |
| Opening film, street shots (set + Fighter) | 44–73 | 0.32–0.36 M |
| Map dive | 31–34 | 0.19 M |
| Gym conversation (set + three rigs) | 54–150 | 0.9–1.03 M |

The triangles are almost all the rig's skin (0.24 M per character, as in every fight); clothes add none because they are the
same skin with other vertex streams. Building Bruno or Brick the first time takes about 1.5 s here, the street outfit 0.4–0.6 s.
