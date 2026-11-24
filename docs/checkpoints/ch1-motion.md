# Checkpoint: ch1-motion (Chapter 1 motion for the next release)

Branch `agent/ch1-motion` (from `claude/ecstatic-clarke-9as2ak`). Not merged, no version bump, no PR (coordinator's rule).
Acceptance items from PR #40: bus opening motion, the dog walker in the bus-exit shot, market full-body motion.

## Done so far
- **Planted feet (opt-in `scene.plant`)** — `adventure/story/dream-pose.js` `plant()`: a foot on the ground keeps its world
  spot (heel, then ball, as the contact point) while the body starts, stops, slows or turns; walking swings leave from where
  the foot really is and land on the gait's spot; standing, a foot more than 7 cm / 20 deg off takes a real step (one foot at a
  time, heel first); a step down (bus tread, kerb) goes out over the edge and comes down over 0.3 s, the hips follow smoothly;
  shoulders take a third of the head turn (gaze leads, shoulders follow, then the feet). The step phase is integrated with a
  minimum rhythm so slow starts/stops take short steps instead of a frozen foot in the air.
- **Speed ramps (opt-in actor `ramp`)** — `dream-core.js` `actor()`: walks speed up from standing and slow into a stop
  (smoothstep over `ramp` s) inside the same key times; `easing` flag on the sample.
- **Bus opening** (`dream_opening`, city keys): he walks down the aisle while the bus stops (unseen until 7.3 s), no pause in
  the doorway, left foot mid-tread / right on the pavement, eyes on the step, then gaze to the town on the kerb, two pivot
  steps; walk start at 14.8 looks along the pavement first. Doors fully open at the floor marker (7.6 s, test kept).
- **Native walk handoff** (`?walkPrototype=1`, 15.6 s): the walk continues from the film's step distance (`run.walkDist`).
- **Dog walker** — new `adventure/story/dog-walker.js`: a fox townswoman made from the crowd people
  (`ArenaSets.spectators.parts`, tier 2) on a small walking skeleton, a real dog (crowd dog head, four two-segment legs, collar)
  walking a four-beat walk on the road side of her, a 1.05 m leash tube solved to exactly its length (never stretches),
  never more than 98.5 % taut, never through her or the dog. `street-life.js` uses it (old figure only without ArenaSets).

## Measurements (see qa/ch1-motion/README in the final report; raw runs are in the session scratchpad)
- Opening 6.9-16.5 s, Chromium 402x690, 30 fps, per frame: slide max 17.3 -> 3.9 cm, slide total 2.37 -> 0.34 m, hip drop max
  23.6 -> 6.1 cm/frame, airborne frames 0 -> 0.
- Dog walker (browser, 4.6-6.2 s): leash drawn length 1.05 m constant, chord 0.99-1.03 m, clearance > 0, paw slide <= 0.4 cm.

## Next
- Market films (`dream_market_robbery` / `dream_market_reward`): plant + ramps, jacket removal without teleport, handbag.
- Strips to `qa/ch1-motion/*.webp`; full suite.

## Tools
`qa/ch1-motion/measure.cjs` (browser), `sim.cjs` (node, fast), `metrics.cjs`, `rows.cjs`, `stepoff-keys.cjs`,
`stepoff-check.cjs`, `dogwalker-node.cjs`.
