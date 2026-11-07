# R91 motion review

Baseline `d18dad2`; candidate runtime and exact test result in
[validation.json](results/validation.json). [View actual renders](review.html).
The former is published R90, retained untouched in `/workspace/fit-r90`.
No generated art or imported motion asset is presented as game output.

`browser.cjs` captures sixteen rope phases and twelve mitt poses, shader link
status, draw/triangle counts and WebGL errors. `QA_ONLY=pads` captures just mitts.
`clay.cjs` disables coat and body color/texture to inspect the continuous surface,
with the existing arena lights, not a separately calibrated studio light rig.
`assemble.py` labels/composes those captures with Pillow. Node24, Playwright,
Chromium155/SwiftShader, Pillow are QA-only tools, with no new runtime dependency.

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r91-after node qa/r91/browser.cjs
APP_ROOT=/path/to/frozen-r90 NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r91-before node qa/r91/browser.cjs
QA_ONLY=pads NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r91-pads node qa/r91/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r91-clay node qa/r91/clay.cjs
QA_KIND=gpu QA_WEBGL1=1 NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r91-gl1 node qa/r91/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r91-native node qa/r90/native.cjs
QA_GPU_PADDING=1 QA_OUT=/tmp/r91-cpu.json node qa/r90/cpu.cjs
```

Browser render viewport 1100×950; native input viewport 393×844 then 1440×900.
Captures use reduced DPR .45 to make software rendering practical. This is
compatibility/visual evidence, not physical-phone sustained FPS. Clay uses
393×844. GIFs sample authored poses; GIF playback rate is not measured app FPS.
Both CPU diagnostic runs enable the normal shader-padding path; fake canvas,
12 warmup/120 samples, no real renderer. JIT, GC and shared host load affect them.
Raw update timings do not measure GPU time, complete frames, heat or phone speed.

Rope and clay candidates were captured at `044d9a9`; the final `1b7c32c` changes
only the pad duck depth. Final pad renders and final targeted suites use
`1b7c32c`. Unchanged rope/clay code is verified against that final runtime.
Original full-size captures remain outside the app in `/workspace/ringfighter-review`.

R91 keeps the existing IK, contact clocks, score/audio, rig and local Three.js
r128. The stronger muscle correctives retain existing CPU/GPU/depth formulas,
normal deltas and the original sub-25-mm deformation test. No objects are added
to fake muscles; muscle attributes keep the same dimensions. The major authored
head/mane replacement and physical-device acceptance remain unfinished.
