# R85 camera, studio and existing game-mode evidence

Baseline `eb3c50ad829580ecb5fa09b67dca2398d0273cbd`.
Runtime `b9fe5000fbf5846e7885cad8fd31dccaf10aab32`.
See [actual app before/after and orbit views](comparison.html),
[implementation report](../../docs/r85-studio-camera.md), and
[consolidated game-mode requirements](../../docs/game-mode.md).

## Browser reproduction

Install Playwright outside the app or use an existing installation:

```sh
NODE_PATH=/tmp/fit-tools/node_modules node qa/r85/browser.cjs
QA_OUT=/tmp/r85-play NODE_PATH=/tmp/fit-tools/node_modules node qa/r85/play.cjs
QA_OUT=/tmp/r85-after NODE_PATH=/tmp/fit-tools/node_modules node qa/r85/studio-compare.cjs
QA_BASELINE=1 APP_ROOT=/path/to/baseline QA_OUT=/tmp/r85-before NODE_PATH=/tmp/fit-tools/node_modules node qa/r85/studio-compare.cjs
```

Use `BROWSER_EXECUTABLE` for another Chromium installation and `QA_OUT` for
output location. `QA_VIEWPORTS='[[393,650]]'` narrows the main browser check.
The tests pause RAF with the existing M0 instrumentation to inspect repeatable
poses. Harness contexts bypass CSP for Playwright evaluation; production CSP is
unchanged. The comparison script rotates the old root and refits the new camera
to show equivalent front/side/rear views.

`results/browser.json` records native touch/pinch/capture-recovery and control
containment at three layouts, all six modes, eight gym directions, renderer
counts and zero browser errors. Actual raycasts reject occluding room scenery.
Both Watch and Play retain zoom controls; native technique scrolling still works.

Matched front/side/back screenshots use 393×650, DPR 0.75, shadows disabled.
The renderer reports draw calls 193/175/172 before and 198/182/185 after;
triangles 565,599/565,043/563,017 before and 567,949/565,479/566,043 after.
Counts depend on the culling angle, not just total mesh capacity. The eight-view
final run spans 180–201 draw calls across the tested layouts.

`results/world-cost.json` records total scenery geometry before visibility
culling; instanced triangle counts include every instance. Gym: 41 → 64 mesh
objects and 4,422 → 7,818 triangles. Arena: 20 / 8,546 unchanged. The existing
less-than-65 gym-mesh gate was retained, including after the first failed run.

These are software-WebGL browser checks, not a sustained frame-time benchmark.
**Physical iPhone/Android, Safari gesture behavior and thermal performance are
not verified.** Historical QA evidence is unchanged. The old published release
remains the rollback point.

## Regression gates

```sh
node tests/ring-camera.test.cjs
node tests/club-world.test.cjs
node tests/club-interface.test.cjs
for test in tests/*.test.cjs; do node "$test" || exit 1; done
```

The complete committed runtime is gated by the 45-suite GitHub Actions workflow.
Final status and exact source revision are recorded in `results/validation.json`.
The first R85 run failed the fixture-count gate at 67 objects; batching repeated
medicine balls and the ceiling reduced the count to 64 without relaxing the gate.

Final runtime workflow: [42202094217](https://github.com/ytcat/fit/actions/runs/42202094217),
**Success**, 45 suites, 5m 17s, exact runtime `b9fe500`. All browser layouts
passed with no errors. `results/play.json` additionally verifies a manual heavy-bag
contact during orbit, independent fight AI and stable user view through ceremony.
The local duplicate full-suite run was stopped after complete committed-runtime
CI success; local full completion is not claimed.
