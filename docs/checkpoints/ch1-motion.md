# Checkpoint: ch1-motion (Chapter 1 motion for the next release)

Branch `agent/ch1-motion` (from `claude/ecstatic-clarke-9as2ak`, merged with v1.93 = 60d658d on 2026-11-25). Not merged to
main, no version bump, no PR (coordinator's rule). Acceptance items from PR #40: bus opening motion, the dog walker in the
bus-exit shot, market full-body motion. Contains PR #40's continuous handbag drop and its bag-drop camera (identical hunks).

## What changed
- **Planted feet (opt-in `scene.plant`)** — `adventure/story/dream-pose.js` `plant()`: a foot on the ground keeps its world
  spot (heel, then ball) while the body starts, stops, slows or turns; walking swings leave from where the foot is and land on
  the gait's spot (2 cm clearance until landing); standing, a foot more than 7 cm / 20 deg off takes a real step (one foot at a
  time, heel first, after the heel has settled); a step down (bus tread, kerb) goes out over the edge and comes down over 0.3 s,
  hips following; setting off, the foot further back steps first; a missed swing gets a catch-up step; shoulders take a third
  of the head turn (gaze leads, shoulders follow, feet last). The step phase has a minimum rhythm at slow speeds.
- **Speed ramps (opt-in `ramp`)** — `dream-core.js` `actor()`: starts and stops ease in/out inside the same key times
  (`easing` flag on samples). Also fixes the actor standing still at an exact key time inside a walk (the film -> walk handoff
  at 15.6 s used to turn him back toward the town).
- **Bus opening** (`dream_opening` city keys, `qa/ch1-motion/stepoff-keys.cjs 6.6 9.47`): walks down the aisle while the bus
  stops, no pause in the doorway (doors fully open at the floor marker, 7.6 s), left foot mid-tread / right on the pavement, eyes
  on the step, then on the town; walk at 14.8 starts with a look along the pavement. Native walk handoff keeps the step phase.
- **Dog walker** — `adventure/story/dog-walker.js` (new): fox townswoman from the crowd people (`ArenaSets.spectators.parts`)
  on a walking skeleton, a dog (crowd dog head, two-segment legs, collar) in a four-beat walk on the road side, a 1.05 m leash
  solved to exactly its length, clear of both bodies. `street-life.js` uses it (old figure only without ArenaSets). No text.
- **Market** — robbery and reward use plant + ramps (runners 0.2 s); Fang's jacket (`cast-market.js jacketOff`): hands to the
  lapels in the wide shot, changes hands on the 14.95 s cut (beat at 14.19 s), hangs edge-on in his right hand, thrown in a
  parabola, lands as the heap behind his right side. Reward: Mrs. Hazel steps up to 1.0 m; the handbag (his right hand -> her
  left) and the pouch (her right -> his left) pass between the hands at chest height (`market-sets.js handover`); the reward
  shot (12.2-16.2 s) is reframed so she is not hidden behind him.

## Measurements (Chromium 402x690, 30 fps; before = v1.93 60d658d, after = this branch)
| | before | after |
|---|---|---|
| Opening 6.9-16.5 s, foot slide max / total | 17.3 cm / 2.37 m | 2.9 cm / 0.27 m |
| Opening hip drop max per frame | 23.6 cm | 6.1 cm |
| Film -> walk handoff (walkPrototype), slide max / total | 18.8 cm / 1.56 m (feet snap 60 cm, body spins round) | 1.4 cm / 0.04 m |
| Robbery slide max: Fighter / Fang / Mrs. Hazel | 8.7 / 13.2 / 4.2 cm | 2.6 / 3.0 / 2.6 cm |
| Robbery slide total: Fighter / Fang / Mrs. Hazel | 0.84 / 2.03 / 0.97 m | 0.17 / 0.52 / 0.28 m |
| Reward: handbag between hands at the handover (node) | 1.47 m jump | 0.035 m/frame max |
| Dog walker leash | straight line to above the dog | 1.05 m drawn always, chord 0.99-1.03 m, clear >= 2.4 cm |
Airborne frames: 0 everywhere. Jacket (node, jacket-check.cjs): >= 5.8 cm from Fang's body, continuous apart from the cut.

Strips (looked at): `qa/ch1-motion/opening-before-after.webp`, `walk-handoff-before-after.webp`,
`dog-walker-before-after.webp`, `robbery-before-after.webp`, `reward-before-after.webp`.

## Limitations
- The jacket in Fang's hand is the existing simple prop; the change from worn to held is hidden by the 14.95 s cut (which comes
  from PR #40's camera) - without that cut it would show.
- Film end -> street fight: the fight opens on its own screen in the engine's guard stance; unchanged.
- In the reward, Mrs. Hazel now stands closer (1.0 m); the 4.2 s over-her-shoulder shot was not reframed.
- No CMU mocap used; all motion is procedural / hand keyed. Phones not measured.

## Next
Targeted tests (2026-11-25, after the v1.93 merge): `bash scripts/run-tests.sh -j 1 dream market otto street opening story
lang-generic offline-version-match city-assets` -> files=24 fails=0 (1016 s), incl. story-clean-gym, otto-carry,
otto-civilian-lifecycle, story-walk-gait, market-handbag-drop, lang-generic. Full suite not run (the integrator runs it).
Owner review of the strips, then integration into the next release candidate. Raw runs: session scratchpad `ch1m-0125/runs` (not durable).
Tools: `qa/ch1-motion/measure.cjs` (browser; CAM, WALK), `sim.cjs` (node; PATCH, PROBE), `metrics.cjs`, `rows.cjs`,
`stepoff-keys.cjs`, `stepoff-check.cjs`, `dogwalker-node.cjs`, `jacket-check.cjs`, `strip.py`, `dog-strip.py`.
