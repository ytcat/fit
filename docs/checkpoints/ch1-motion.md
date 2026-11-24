# Checkpoint: ch1-motion (Chapter 1 motion for the next release)

Branch `agent/ch1-motion` (from `claude/ecstatic-clarke-9as2ak`). Not merged, no version bump, no PR (coordinator's rule).
Acceptance items from PR #40: bus opening motion, the dog walker in the bus-exit shot, market full-body motion.
**Status 2026-11-24: PAUSED by the coordinator (v1.93 release needs the CPU). WIP, not fully verified — see "Remains".**

## Done
- **Planted feet (opt-in `scene.plant`)** — `adventure/story/dream-pose.js` `plant()`: a foot on the ground keeps its world
  spot (heel, then ball, as the contact point) while the body starts, stops, slows or turns; walking swings leave from where the
  foot is and land on the gait's spot (2 cm extra clearance until landing); standing, a foot more than 7 cm / 20 deg off takes a
  real step (one foot at a time, heel first, after the heel has settled); a step down (bus tread, kerb) goes out over the edge
  and comes down over 0.3 s with the hips following; setting off, the foot further back steps first (gait re-phased); a missed
  swing gets a catch-up step; stance state is reset on every landing (fixed a 1 m foot jump). Shoulders take a third of the
  head turn (gaze leads). The step phase is integrated with a minimum rhythm (no frozen foot in the air at slow speeds).
- **Speed ramps (opt-in actor/scene `ramp`)** — `dream-core.js` `actor()`: walks speed up from standing and slow into a stop
  inside the same key times (ramp share capped at 1/4 of a short walk; correct at exact key times); `easing` flag on samples.
- **Bus opening** (`dream_opening`, city keys made with `qa/ch1-motion/stepoff-keys.cjs 6.6 9.47`): he walks down the aisle while
  the bus stops (unseen until 7.3 s), no pause in the doorway, doors fully open at the floor marker (7.6 s), left foot mid-tread /
  right on the pavement, eyes on the step, gaze to the town on the kerb, pivot steps; at 14.3 looks along the pavement first.
- **Native walk handoff** (`?walkPrototype=1`, 15.6 s): walk continues from the film's step distance (`run.walkDist`).
- **Dog walker** — `adventure/story/dog-walker.js` (new): fox townswoman from the crowd people (`ArenaSets.spectators.parts`,
  tier 2) on a walking skeleton, a real dog (crowd dog head, two-segment legs, collar) walking a four-beat walk on the road side,
  a 1.05 m leash solved to exactly its length, 95 % taut, clear of both bodies. `street-life.js` uses it.
- **Market** (`market-core.js` bottom, `market-sets.js`, `cast-market.js`): robbery + reward use plant and ramps (runners
  ramp 0.2); PR #40's continuous handbag drop brought in unchanged (identical hunks); Fang's jacket: hands to the lapels in the
  wide shot, changes hands exactly on the 14.95 s cut (beat moved to 14.19 s, `J_CUT .346`), hangs edge-on in his right hand,
  is thrown in a parabola (~4.5 m/s at the pavement) and lands as the heap behind his right side; reward: Mrs. Hazel steps in
  and the handbag (his right hand to her left) and the pouch (her right to his left) pass between the hands at a point between
  the shoulders (`handover()` in market-sets.js).

## Measurements so far (Chromium 402x690 30 fps unless noted; node sim = qa/ch1-motion/sim.cjs)
- Opening 6.9-16.5 s, browser (commit a5cd074): slide max 17.3 -> 3.9 cm/frame, slide total 2.37 -> 0.34 m, hip drop max
  23.6 -> 6.1 cm/frame, airborne 0 -> 0. Latest code, node sim: slide max 2.7 cm, total 0.25 m, hop 0.6 cm.
- Native walk handoff (walkPrototype): before slide max 18.8 cm, total 1.50 m; the after run used older code and showed a
  hop at the handoff (key-time ramp bug, since fixed) -> **must be re-measured**.
- Dog walker (browser): leash drawn 1.05 m constant, chord 0.99-1.03 m, leash clear of bodies (min > 0), paw slide <= 0.4 cm.
- Robbery, browser: Fighter slide max 8.7 -> 2.6 cm, total 0.84 -> 0.17 m; Fang 13.2 -> 3.0 cm, 2.03 -> 0.52 m; Hazel 4.2 ->
  2.6 cm, 0.97 -> 0.28 m. Jacket (node, jacket-check.cjs): clearance to Fang's body >= 5.8 cm, no jump except the cut,
  heap 1.2 m from the handbag.
- Reward handbag handover (node): jump 1.47 m -> 0.03 m/frame; pouch max 6.8 cm/frame (a gesture, not a jump).

## Remains (next session)
1. Run `bash scripts/run-tests.sh -j 2 dream market otto street opening story` (was interrupted; earlier subsets passed:
   dream, story-walk, story-scenes, city-assets, story-mirror, dream-market-films, story-cast-market, market-handbag-drop,
   dream-street-life, offline) and then the full suite. story-cast-market and otto tests not yet re-run after the last edits.
2. Browser re-runs with the latest code (raw runs go to the scratchpad, strips to qa/ch1-motion/):
   `SCENE=dream_opening T0=6.9 T1=16.5 SHOTS="7.5,7.9,8.3,8.7,9.1,9.5,14.9,15.3" OUT=<dir>/open-after node qa/ch1-motion/measure.cjs`,
   the same with `WALK=1 T0=13.5 T1=17.5 SHOTS="15.5,15.7,16.2"`, robbery `T0=0.5 T1=18.8`, reward `T0=0.3 T1=15`,
   dog close-up `CAM="-7.2,1.1,-1.9,-7.75,.55,-5.3,44"`; before runs use `ROOT=<export of 45fdcf8>`.
   Then `python3 qa/ch1-motion/strip.py` for opening / walk / dog / robbery / reward strips; look at them critically.
3. Film-end -> street fight handoff: the fight engine opens on a new screen in its own guard stance (no shared frame); not
   changed — report it.
4. Update FEEDBACK_BACKLOG / film tracker, final report.

## Tools
`qa/ch1-motion/measure.cjs` (browser; CAM, WALK, conversation holds skipped), `sim.cjs` (node, fast; PATCH, PROBE),
`metrics.cjs`, `rows.cjs`, `stepoff-keys.cjs`, `stepoff-check.cjs`, `dogwalker-node.cjs`, `jacket-check.cjs`, `strip.py`.
Strips committed so far (older "after"): `qa/ch1-motion/opening-before-after.webp`, `robbery-before-after.webp`.
