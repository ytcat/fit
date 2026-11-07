# R90 evidence and reproduction

Baseline `368c2ea`; final runtime and full-suite result are recorded in
[validation.json](results/validation.json). [Open actual app comparisons](review.html).
No generated art is used. Full-size source captures remain outside the deployed
app under `/workspace/ringfighter-review/r90-*`; compact review artifacts are here.

QA tools: Node24, Playwright/system Chromium155 and Pillow. No new app runtime
package, service, external model, CDN or paid authoring dependency is added.

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
NODE_PATH=/tmp/fit-tools/node_modules QA_KIND=gpu QA_OUT=/tmp/r90-gpu node qa/r90/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_KIND=gpu QA_WEBGL1=1 QA_OUT=/tmp/r90-gl1 node qa/r90/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r90-motion node qa/r90/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_KIND=interaction QA_MOBILE=1 QA_OUT=/tmp/r90-input node qa/r90/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r90-native node qa/r90/native.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r90-gear node qa/r90/gear.cjs
APP_ROOT=/path/to/frozen-baseline QA_OUT=/tmp/r90-before.json node qa/r90/cpu.cjs
QA_GPU_PADDING=1 QA_OUT=/tmp/r90-after.json node qa/r90/cpu.cjs
```

`APP_ROOT` selects a frozen source tree; default is this repository. `QA_OUT`
selects a separate evidence folder. The assembler takes the external evidence
root as its first argument. `?padding=cpu` selects the original CPU deformation
on reload; the default shader path uses the same local WebGL renderer.

The browser comparison tests force asymmetric glove compression and a registered
bag dent, capture both CPU/GPU routes and collect actual GL buffer traffic. Color,
depth and distance shader formulas share uniforms. All linked programs succeeded
in the tested WebGL1 and WebGL2 contexts; the captured CPU/GPU PNGs were identical.
These tests are Chromium/SwiftShader compatibility tests, not iPhone Safari.

The 12-frame upload sample includes an initial 150 ms physics catch-up. It is not
a steady-FPS benchmark. Uniform traffic is not included in bufferData/SubData
bytes. Node timing uses a fake canvas, 12 warmup and 120 samples at 60 Hz; inclusive
method timings cannot be summed, and JIT/GC/host load affect tail values. Neither
method establishes physical-device GPU speed, thermal stability or VRAM bytes.

Native CDP touch checks cover pinch, touch cancellation and a subsequent drag.
Actual mouse input covers interruption by blur and a fresh desktop drag. The
1,000-event stress check verifies zero per-event world updates and no paused pose
resimulation. Three equipment/fight cycles retain stable geometry, texture and
program allocation counts; this is not proof of unlimited-session heap behavior.

Images were captured on the candidate before the final reset-only fix; that fix
clears shader dents during mode/seek resets without changing geometry or motion.
Full CPU suites and the explicit GPU reset contract validate the final source.
The separate authored realistic head/mane milestone remains unfinished.
