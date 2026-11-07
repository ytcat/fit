# R88 review evidence

This folder contains screenshots rendered by the actual app in Chromium, not
concept art. The update adds sustained defensive covers, longer supported ring
steps and one-press Play combinations. It does not contain the planned authored
head/character overhaul. Physical iPhone/Android and sustained hardware FPS are
**not verified**.

Open [the comparison page](comparison.html). Exact source, workflow result,
commands and limitations are in [validation.json](results/validation.json).

## Reproduction

Serve/run from the repository root. Node 24, Playwright and system Chromium were
used; Pillow assembles labeled image sheets/GIFs without changing the scene.
Tools are QA/build-time dependencies, not app dependencies.

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
find . -type f -name '*.js' -not -path './node_modules/*' -print0 | xargs -0 -r -n1 node --check
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r88-ui node qa/r88/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r88-poses node qa/r88/visual.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r88-player node qa/r88/player-fight.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r88-motion node qa/r88/motion.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r88-arms node qa/r88/arm-continuity.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r88-cpu node qa/r88/profile.cjs
```

`APP_ROOT` selects the published R87 (`de93d11`) checkout for the first four harnesses;
`QA_APP_ROOT` selects the frozen pre-fix R87 candidate for arm-continuity renders.
The arm comparison labels that candidate explicitly; it was never published.
That diagnostic disables AI decisions and career aim spread and stages a
mid-round clock so introductory announcements do not hide the contact. Main
and opposite-side cameras are recorded; graphics are rendered by the app.
`QA_TRACKS='["ring"]'` limits the motion harness to walking, a jab and braking.
The comparison assembly script takes the external evidence directory as its
first argument. Full-size source captures remain outside the deployed app.

## What the checks establish

- Existing CPU suites cover arm/reach continuity, contact follow-through,
  simultaneous trades, guard/own-face clearance, floor contact, equipment,
  scoring, referee ceremony, deterministic clocks and application behavior.
  The existing 60-degree/60 Hz continuity and 21 mm follow-through limits have
  not been relaxed. These are engineering regression gates, not certification
  of human biomechanics.
- New defence/gait checks sample actual collider coverage and supporting boot
  ball points. They verify direction-dependent first-foot choice, planted
  support, monotonic braking, rest and the referee's reserved corner.
- Browser layout/input checks use native Play/Combos/Defence clicks in all seven Play-capable
  modes plus the automatic rope station, four viewport sizes and EN/HE/RU. Repeated macros cannot build a long
  queue; a defensive command cancels the remaining chain.
- The player fight harness executes a Super burst with independent opponent AI
  and real registered contacts, then interrupts with high cover. Its separate
  27 mm stress limit is not substituted for the stricter follow-through suite.
- Motion GIFs show selected app-rendered keyframes from dense simulation sampling,
  without interpolation; they are not recordings of real-time smoothness/FPS.
  Software WebGL timing measures CPU update/submission only. Screenshots and
  emulated phone viewports do not establish Safari behavior, thermal stability
  or a mobile performance gate.

## Regressions found while preparing the release

The higher guard exposed insufficient padding margin after coupled contact
corrections. Braking initially had a floating-point backwards-clock edge and an
abrupt stop. Finally, the rising elbow plane needed filtering perpendicular to
its current reach axis; contact correction also allowed an arm to fold almost
onto its own shoulder. The release constrains folding and transports the elbow
plane before filtering it. See the report for verified results and remaining
limits. No legacy controller/model pair or original asset was replaced.

## Timing and final source equivalence

The profile harness measures only main-thread `FightArena.step`: 30 warmup and
180 samples with seeded AI, RAF paused and no drawing during the sampling loop.
It is not a phone/FPS/GPU benchmark. Capture-trace timing under concurrent
software rendering is retained separately and is not used as the performance
comparison. `renderer.info` capture counters describe the main pass; they do not
include the total extra shadow-pass cost or measure texture memory bytes.

Pose sheets and sampled motion were captured on `53eb060`. Transform optimization `8345741`
changes only closest-contact transform reuse, its regression test and the asset
version. A fresh actual-app arm trace is compared against the captured pose
trace, and a fresh native player-fight run is retained after optimization. Exact
trace delta and final CI results are in validation.json. No material, mesh,
shader, light or choreography changed after those pose captures.

Final validated source `3efa994` also prevents a low/side/parry cover from being
replaced mid-pose by a macro. Its full 51-suite run passed. Native Play checking
includes the disabled-during-cover and enabled-after-recovery handoff.
