# R95 — rope stays outside the posed character

Baseline `4384f55` (R94); final runtime `ddc111c`. Work is isolated in
`/workspace/fit-r95`; no other worktree is modified.
[Actual before/after renders](../qa/r95/review.html).

## Cause and correction

The old loop was attached at the handles and checked mostly at its overhead and
underfoot extremes. With compact hands, inward-facing outlets allowed the
backward pass to run through the body/hand area between those extremes.

The rope grip now pronates through the existing forearm frame, with a neutral
wrist plus the existing small rope flex. The handles/bearings point outward.
Hand targets stay at ±31.5 cm: the compact posture is retained.

A private `RopeBodyClearance` helper prepares conservative ellipsoids following
the posed torso/shorts, skull/muzzle/mane or ears, upper/lower arms, thighs/calves,
boots and tail. These are mathematical exclusion volumes, not rendered muscle
patches. The 97-point loop's branches move outward around these volumes, fading
in the correction before reaching the protected shell. Anchor points remain on
the actual bearing exits. Floor timing and rope direction are unchanged; a little
more overhead allowance preserves head clearance after the grip reorientation.

The tube's normal frame is now transported along the curve. A global-up cross
product could flip when the branch bows outside a tucked handle. The prior
monotonic-X assertion was an overly restrictive proxy for this: it has been
replaced by actual frame-continuity checks, plus new body-clearance coverage.
No collision threshold or floor/reach bound was relaxed. There is no physical
rope/soft-body simulation, extra runtime dependency or additional rendered mesh.

## Independent geometry evidence

The new CPU suite checks both characters and all four rope drills over two full
revolutions, at 121 time samples, including points inside each segment. A separate
QA check computes the exact minimum over every continuous segment against a
12-mm-expanded diagnostic exclusion union. Both checks pass all eight cases.
The routing shell is larger (30 mm plus a width reserve) to leave interpolation,
rope-radius and coat clearance.

The independent triangle check exports the actual visible character meshes using
the game's CPU skinning/corrective path, including fur, mane, clothing, fingers
and wraps. Intended handle/bearing attachment surfaces are excluded. It does not
read back GPU vertices. The exporter/checker uses free local Node, NumPy and SciPy;
none is added to the app runtime.

- Baseline backward phase 0.75: minimum sampled distance **0.043 mm** to a visible
  skinned surface. A **4.5-mm-radius** cord overlaps this surface; 106 samples fail
  the 18-mm safety threshold. The issue is reproduced rather than judged only
  from a screenshot.
- Final lion: all **421,331 visible triangles** checked in each of eight phase
  snapshots. Minimum sampled centreline distance **32.50 mm**; with samples at
  most 5 mm apart, the continuous spatial lower bound is **30.00 mm** at those
  snapshots. That leaves at least **25.50 mm** beyond the cord radius.
- Final rabbit: **374,406 triangles**, overhead and backward snapshots; minimum
  sample **34.34 mm**, spatial lower bound **31.84 mm**.

These actual-mesh snapshots complement full-cycle exclusion-volume tests; they
are not an exhaustive proof against every mesh at every continuous time or an
unqualified physics-accuracy claim. Binary mesh captures remain outside the app;
compact raw metrics and reproducible scripts are in `qa/r95`.

Matching browser views cover overhead/front/side/rear/backward/underfoot and a
393×844 viewport. WebGL2 and a WebGL1 subset link their shaders without page errors.
These are Chromium/SwiftShader checks, not physical iPhone/Android benchmarks.
All **56 regression suites passed** on exact runtime `ddc111c`: [CI run](https://github.com/ytcat/fit/actions/runs/42395869416).
Exact complete-suite status: [validation.json](../qa/r95/results/validation.json).

Node CPU diagnostics (fake canvas, both using shader padding) measured rope
P50/P95 **1.32/2.53 ms before**, **1.39/2.62 after**. This is shared-host update
cost, affected by JIT/GC/load, not a browser FPS/GPU/thermal measurement. Other
mode timing differences in the raw files are not attributed to this rope change.
There are no additional rope vertices or avatar draw calls.

## Reproduce and rollback

```sh
node tests/rope-clearance.test.cjs
node tests/training-motion.test.cjs
QA_OUT=/tmp/r95-swept.json node qa/r95/swept-check.cjs
QA_OUT=/tmp/r95-mesh node qa/r95/export-mesh.cjs
python qa/r95/check-mesh.py /tmp/r95-mesh
QA_SPECIES=rabbit QA_PHASES=0,.75 QA_OUT=/tmp/r95-rabbit node qa/r95/export-mesh.cjs
python qa/r95/check-mesh.py /tmp/r95-rabbit
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r95-browser node qa/r95/browser.cjs
QA_SHORT=1 QA_WEBGL1=1 NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r95-gl1 node qa/r95/browser.cjs
```

`APP_ROOT=/path/to/frozen-r94` selects the old source for baseline export/render.
Its triangle check is expected to fail, preserving evidence of the original bug.
The export CLI's `QA_PHASES` changes snapshot phases; default is eight phases.

Runtime changes are scoped to `career-drills.js`, rope-handle orientation in
`training-gear.js`, and their versioned references (`2026110708`). R94's same-hand
mitt assignments and wider coaching distance remain. R94 is the release rollback
baseline; legacy controller/model pairing and CPU-padding fallback remain.
