# Checkpoint: walk-gait (the Fighter's walk and jog, owner feedback 2026-11-25)

Branch `agent/walk-gait` from `origin/claude/ecstatic-clarke-9as2ak` (67ddca4 = v1.94). Not merged, no `version.js` /
offline-worker bump, no PR (coordinator's rule). Backlog: GOTR-0120 (READY FOR QA).

## What changed
- `adventure/story/dream-pose.js` (the one walk cycle used by the free walk and every film):
  - `params(v)`: stride and cadence follow the ground speed (stride ~ v^0.6, exactly 1.30 m at 1.25 m/s or when the speed is
    unknown, so stateless callers get the GOTR-0097 walk); brisk walk; heavy boxer's jog above 2.6 m/s (stance 36 %, short
    flight, heel kick, lowest at mid-stance, loose fists).
  - per-leg heel memory (no slide while the stride changes, also without `plant`); integrated step phase; quicker steps in
    turns; the next step sooner when a planted foot is left far behind (not during a step down).
  - pelvis turn / tilt / bob grow with pace; thorax counter-rotation (shoulders turn more than the pelvis); shoulder roll (arm
    joint forward/up with its swing); damped spring on the chest/shoulders; lean with speed and acceleration; bank into turns
    (only when actually moving > 0.8 m/s); head stabilised; lion's tail follows with lag.
  - arms: `armSwing` pendulum from the shoulder against the leg, elbow bend grows forward and with pace, carried out from the
    body, forearm turning in; jog: elbow ~60-90 deg, fists.
  - plant layer: heel anchored at its landing pitch; landing spot stops turning with the body in the last third of a swing;
    touchdown speed capped in turns, stand steps and the last step into a stop; both feet may be in the air in the jog; a late
    swing still takes 0.1-0.2 s; the pelvis reach clamp is measured from the hip joint, ignores feet early in a swing, takes in a
    long step at <= 0.75 m/s and never falls faster than 1.2 m/s (bus step-off), never more than 12 cm under its curve.
  - `DreamPose.pace(state, vx, vz, facing, dt)`: stick velocity -> body velocity (accelerate 4.5 m/s2, stop 5.5 m/s2, arc
    turns ~7 m/s2 sideways, slower through sharp turns). `DreamPose.params`, `DreamPose.strideAt` exported.
- `adventure/free-walk/free-walk.js` (3 lines, for the walk-town / story-walk owners) in `step()`:
  1. `const [vx, vz] = C.velocity(...)` became `let [vx, vz] = ...` followed by
     `if (window.DreamPose?.pace) [vx, vz] = window.DreamPose.pace(R.pace || (R.pace = {}), vx, vz, R.turn, dt);`
  2. the `DreamPose.civil` call adds `plant: true` and passes `walk: R.s.walking ? 1 : 0` instead of `walk: R.walkAmt`
     (with `plant` a never-quite-zero walk amount blocked the settle steps after a stop; `R.walkAmt` is now unused).
- `index.html` `?v=` for both files (20261125g1), `offline-manifest.json` regenerated.
- Tests: `tests/walk-gait-speed.test.cjs` (new); `tests/story-walk-gait.test.cjs` arm swing bound 0.5 -> 0.55 m.
- QA tools: `qa/walk-gait/gait-sim.cjs`, `gait-metrics.cjs` (node), `free-walk.cjs` (browser, touch stick), `strip.py`.

## Measurements
See GOTR-0120 in the backlog (free walk before/after, ch1-motion film metrics before/after).
Node courses (`node qa/walk-gait/gait-sim.cjs <film|walk|fast|turn|startstop>`): film 1.30 m / 115 spm, walk 2.22 m/s
1.70 m / 157 spm, jog 3.44 m/s 2.39 m / 173 spm; slide <= 3.3 cm/frame max, < 1.4 mm mean; hip drop <= 2.6 cm/frame
(turn 3.4); airborne 0 walking (turn course 1 frame), jog flight by design.

## Evidence
`qa/walk-gait/*.webp` (before = v1.94 `67ddca4` served from a git archive, after = this branch), `*-clip.webm`.
Raw runs: session scratchpad `wg/` (not durable).

## Checks
`node tests/story-walk-gait.test.cjs`, `node tests/walk-gait-speed.test.cjs`, `node tests/story-arm-clearance.test.cjs`
pass; targeted run `bash scripts/run-tests.sh -j 1 story-walk-gait walk-gait-speed free-walk dream-scenes story-scenes
story-mirror story-arm-clearance offline-version-match` -> files=8 fails=0 (150 s). Full suite not run.
Film metrics (browser, `qa/ch1-motion/measure.cjs`): see GOTR-0120.

## Next
Owner review of the strips and clips; phone check; merge into the next release candidate (integrator).
