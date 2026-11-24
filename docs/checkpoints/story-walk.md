# Checkpoint: story walks (GOTR-0122)

Branch `agent/story-walk` from `origin/claude/ecstatic-clarke-9as2ak` 67ddca4 (v1.94). Not merged, no version bump, no PR.
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

## Checks
(see below; updated per checkpoint)

## Next
(see below)
