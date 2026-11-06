# R86 — actual graphics and advanced-combo evidence

Baseline `7a7b7389d171af2317427bd3d2ff37b5de2ce07f`.
Runtime `88227e373e05344e5d123079670f0c5ce87ae059`.
[Before/after viewer](comparison.html) ·
[Implementation and limitations](../../docs/r86-combo-groom-polish.md).

## Completed checks

- Complete **46-suite** Node regression workflow: **Success**, 6m 17s,
  [exact-runtime GitHub Actions run](https://github.com/ytcat/fit/actions/runs/42211316025).
  Its syntax/asset checks also passed. Evidence-only release commits do not alter
  the validated runtime, assets, tests or workflow.
- New advanced-combo test covers twelve complete timing sequences, full step
  completion, actual reachable/planted feet, explicit movement cues, deterministic
  variable replay and both hands plus defence in four new speed-bag patterns.
- Real browser chooser: all twelve Super phrases selected in EN/HE/RU (36 native
  selections), fourteen relevant speed-bag choices and five actual heavy-bag
  contacts in the first three seconds of Super Lightning counter.
- Both species: six matched app renders each, before and after. Front, profile,
  face close-up, rear, jab and uppercut; same lighting/pose/camera, shadows on,
  DPR 1. No browser/shader errors. JPEG contact sheets only resize/arrange those
  actual renders; no generated artwork is used as evidence.
- Native camera regression: all six modes at 393×650, drag, pinch, cancellation,
  failed pointer capture, wider zoom, Watch/Play containment, rail scrolling and
  EN/HE/RU. Prior larger-layout evidence remains in R85; layout code is unchanged.
- Actual manual bag contact during orbit, player-versus-independent-AI fight and
  user-selected camera view through the ceremony also passed in the browser.

## Resource observations

`results/before.json` and `after.json` record each matched view. Draw calls are
unchanged in every pair: 194 lion/front, 104 lion/face, 168 rabbit/front and 77
rabbit/face, for example. Lion triangles decrease by six through one root-mask
difference; rabbit triangles are unchanged. This is not a polygon-count increase.
Uploaded renderer texture count is initially two higher for the lion's added
material maps, then is 25 in both runs once both cached boxers have been drawn.
These counts depend on prior uploads and visibility; they are not GPU byte counts.

Chromium 155.0.8059.79 uses software WebGL. These checks validate rendering and
input compatibility, not sustained hardware frame time. **Physical iPhone/Android,
Safari, GPU memory bytes, sustained FPS and thermal behavior remain unverified.**
The still-procedural face and visible close-up hair strips remain art limitations;
this release does not complete the authored-head realism roadmap.

## Reproduce

From the repository root, with Playwright installed outside the deployed app:

```sh
NODE_PATH=/tmp/fit-tools/node_modules node tests/advanced-combos.test.cjs
QA_OUT=/tmp/r86-after NODE_PATH=/tmp/fit-tools/node_modules node qa/r86/visual.cjs
APP_ROOT=/path/to/baseline QA_OUT=/tmp/r86-before NODE_PATH=/tmp/fit-tools/node_modules node qa/r86/visual.cjs
QA_OUT=/tmp/r86-combos NODE_PATH=/tmp/fit-tools/node_modules node qa/r86/combos.cjs
QA_VIEWPORTS='[[393,650]]' QA_OUT=/tmp/r86-camera NODE_PATH=/tmp/fit-tools/node_modules node qa/r85/browser.cjs
QA_OUT=/tmp/r86-play NODE_PATH=/tmp/fit-tools/node_modules node qa/r85/play.cjs
for test in tests/*.test.cjs; do node "$test" || exit 1; done
```

`BROWSER_EXECUTABLE` selects another Chromium executable. Harnesses pause RAF
using the existing M0 instrumentation and bypass CSP solely for Playwright's
evaluation. Production CSP is unchanged. The contact check advances actual
arena simulation; it does not add hits from button clicks.
