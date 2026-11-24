# Checkpoint: story walks (GOTR-0122)

Branch `agent/story-walk` from `origin/claude/ecstatic-clarke-9as2ak` 67ddca4 (v1.94), release branch 0852c79 merged in. Backlog GOTR-0122. Not merged, no version bump, no PR.
Owner requests 2026-11-25: the free walk is always available and part of the story; after a film the player walks to the next
place with the joystick; wide default camera; no Day/Night buttons (the light follows the story); no destination selector (the
game sets it); a better joystick.

## Chapter 1: step -> walk mapping (`FreeWalkCore.STORY_WALKS`, pinned by `tests/story-walk.test.cjs`)
| After (where the film ends) | Walk | To the step | Opens from | Carries |
|---|---|---|---|---|
| `dream_arrival` (arrival film, cut at 15.6 s when he sets off from the bus) | bus stop -> Bruno's gym | `dream_gym_talk` | film end (Skip too) | his duffel |
| `dream_apology` (morning in the gym) | gym -> market fruit stall | `market_robber` (robbery film, street fight) | film end | - |
| `market_robber` won (reward film at the market) | market -> Otto's shop | `buy_heavy_bag` | reward film end | - |
| `buy_heavy_bag` bought (Otto's film) | Otto's -> Bruno's gym | `bag_drill` | Otto film end | the new heavy bag on the shoulder |
| `fight_prep` (gym training) | gym -> Docks quay | `docks_fight` (night) | the after-beat's Next / quest card | - |
| `docks_fight` won (after film at the Docks) | Docks -> Bruno's gym | `advanced_training` (night walk back) | after film end | - |
Same place, no walk: gym talk -> first Brick fight -> clean gym -> night shadowboxing -> old bag -> apology; advanced training -> Brick rematch.
The "Next" / quest card button of a step whose walk is due reads the objective ("Walk to Otto's shop for a new bag ▶") and opens the walk.

## What changed (files)
- `adventure/free-walk/free-walk-core.js`: `STORY_WALKS`, `walkFor`, `walkDue` (record + older-save rule), walk record
  (`walkKey` `gotr.storywalk.v1.<profile>`, `parseWalk`), `storyTime` (step/chapter light), `busStop` (a kerb 40-70 m from the
  gym, computed from the town's street graph; no town edit), new EN/HE/RU copy (objectives, story help, keys hint, top-bar entry).
- `adventure/free-walk/free-walk.js` (shared with the town and gait agents; my edits only): HUD (objective line + arrow +
  distance, no selector, no Day/Night), story plan (destination and light from the current step), story walk mode (start at the
  film's end place or the saved spot, facing the route; walk record with position and `open`; one-time ticket, in memory when
  sessionStorage fails; first frame inside the ring counts for a story walk; arrival marks the walk done before the step opens),
  carry (duffel `StoryCast.bag`, heavy bag `MarketProps.create` shoulder carry, `arms`/`reach` passed to `DreamPose.civil`),
  camera defaults (PITCH .6, DIST 11.5, FOV 50, zoom .55-1.45; tree crowns lift the camera only a little), the floating stick,
  keyboard hint on computers without touch, top-bar entry (`#freeWalkBtn`), `FreeWalk.storyWalk/storyPlan/willWalk/arrive/available/busy`.
  Not touched: `free-walk-town.js` (town look), the walk gait in `DreamPose.civil`.
- `adventure/free-walk/free-walk.css`: removed `.fw-time`, `.fw-select`, old `.fw-stick`; new `.fw-goal`, `.fw-pad`/`.fw-stick`/`.fw-knob`/`.fw-glow`/`.fw-ticks`, `.fw-keys`, `.fw-entry`.
- `adventure/oldtown.js`: `walkGate(id)` in `before()` (every way into a step), `walkOn()` after the reward / Docks-after films and
  the Otto purchase, `filmDone` -> walk, arrival film `until: 15.6`, `onOpen` -> `resumeWalk()` (a walk left open when the page
  went away reopens once), quest card button label. Fallback: when `FreeWalk.open` resolves false the walk is marked done and the
  step goes on directly (`before(..., { walked: true })`).
- `adventure/story/dream-scenes.js`: `opts.until` ends a film early (fade); the `?walkPrototype=1` hand-over removed.
- `adventure/story/street-walk.js`: `enabled`/`introSkip` removed (flag retired); `stickInput` stays (free walk, roam page).
- No edits in `index.html` other than `?v=` bumps; none in `game-shell.js` / `adventure-ui.js`.

Later additions on the same files: a GTA-style chase camera (the view comes round behind him while he walks, unless the player
turned it in the last 1.5 s; Q/E and drag still turn it), a story walk that starts at a door starts 4 m out of it with the camera
turned to the open side (`openYaw`), the distance close by is the straight distance, and the HUD follows a language change made
while walking (`R.relabel`, hooked to `app.setLanguage`). Merged `origin/claude/ecstatic-clarke-9as2ak` 0852c79 (bus doors
GOTR-0120, walk gait GOTR-0121): `step()` keeps the gait's `DreamPose.pace` before `grid.move` and `plant: true`,
`walk: R.s.walking ? 1 : 0` in the civil call, plus this branch's chase camera, `arms`/`reach` carry and `props.frame`.

## Checks
- Pure tests: `tests/story-walk.test.cjs` (new: sequence of walks vs `dreamSteps`, walk due/once/resume record, older saves,
  story light, bus stop, EN/HE/RU copy, wiring, and oldtown.js in a stub page: gate opens the walk, a walk that cannot start
  falls back to the direct step exactly once, walked = no second walk, arrival film cut at 15.6 s only before a walk);
  `tests/free-walk.test.cjs` (updated: story-led ticket, no selector / Day-Night); `tests/story-walk-controls.test.cjs`
  (updated: the `?walkPrototype=1` flag is gone).
- Targeted run `bash scripts/run-tests.sh -j 1 free-walk story dream market otto clean opening lang-generic offline-version-match walk-gait`
  (after the merge): files=26, fails=3. `dream-gym-return` and `dream-market-films` called `AdventureOldTown.before()` on steps
  that now open a story walk first; they pin the film chain, so they now run it with `FreeWalk.available = () => false` (the device
  fallback, which chains the films directly as before): both pass alone. `otto-carry` ("no shoulder jump: 6.8 deg in a frame")
  fails the same way on the release branch 0852c79 itself (extracted with git archive): from the walk-gait merge, not this branch.
  `story-clean-gym` (real touchscreen tap, untouched) passes.
- Real playthrough `qa/story-walk/play.cjs` (Playwright Chromium + SwiftShader, new profile, real save):
  phone 402x690 EN, HE, RU: all six walks open where the film ended (or from the quest card after a dev-skipped fight),
  show the objective + arrow + distance, the stick is driven by REAL CDP touch events for 6 s at each start (1.2-4.2 m walked
  at SwiftShader frame rates), then the game's own movement (`FreeWalk.qa.walk`) into the ring; each ring started its step
  exactly once (`launches` = 1 per walk: gym talk film, robbery film, Otto film, new-bag film, Docks film, advanced training beat);
  the walk record is `arrived` afterwards. Walk 2 is quit mid-way (page reload): it reopens by itself at the same spot (moved 0 m)
  with the same destination. Otto's film: Buy tapped, then the walk back carries the heavy bag on his shoulder. Light: morning,
  the Docks walks at night. After the walks the top-bar entry opens a story-led walk ("Story: Bruno's gym"), no `<select>`, no Day/Night.
  PC 1366x768 EN (walks 1, 2 with resume, 4): real arrow keys move him, the stick is hidden and the keys line shown; same results.
  No page errors in any run.
- Evidence `qa/story-walk/evidence/`: `sheet-{phone-en,phone-he,phone-ru,pc-en}.webp` (per walk: start, near the ring, the step
  it started), `sheet-*-entry-resume.webp` (top-bar entry, the resumed walk, the quest card button, Otto's Buy, the story-led
  walk), `joystick-before-after.webp`, JSON reports. `qa/story-walk/before/` = v1.94 free walk and stick.
  Note: the EN pictures of walks 1-2 were taken before the door start / chase camera polish (walk 2 starts close on his back);
  HE/RU/PC show the final behaviour. HE and RU walk 2 (quit and resume) were re-run after the gait merge and the language fix
  (resumed at the same spot, moved 0.07 m, in the player's language); the other pictures predate the merged walk gait.

## Limits / next
- Not checked on a real phone. SwiftShader frame rates: most of each walk is moved by the game's movement function, not real time.
- The camera still comes close among market stalls and under umbrellas (umbrellas are not in the camera's crown map:
  free-walk-town.js, the town agent's file).
- Losing the afterBeat after the reward / Docks / Otto films: the walk opens at once (no "Unlocked ..." line); coins and the
  purchase are still toasted by the fight / the film.
- The old `qa/free-walk-city/story.cjs` uses the removed destination selector (superseded by `qa/story-walk/play.cjs`).
- An ordinary free walk now arms the ring of the current step's place (the story sets the destination): walking into it starts
  that step once per walk.
- Next: integrator review/merge; then a phone check of the touch stick and the chase camera.
