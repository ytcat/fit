# R90 — coordinated skipping and training frame cost

Baseline: `368c2ea`. Validated runtime: `ae7dbf1`.
[Actual app comparisons](../qa/r90/review.html) · [Raw results and method](../qa/r90/README.md).

Rope skipping now coordinates wrist circles, outboard hands, shoulder lift,
trunk loading, head counterbalance, hip transfer and toe/ankle pulses. The final
pose reaches skinning, muscle correction, expressions and mane together. All four
drills retain their existing rope timing and two-bone IK. This is authored animation,
not motion capture or a claim of measured human biomechanics.

Coach mitts use oxblood/red leather, black edges and contrasting stitching. Handles
have rubber grip channels, red end caps, merged bearing details and a textured,
round cord. Pooled cord vectors and analytic normals avoid per-frame allocation
and full normal rebuilding. The existing body, skeleton and game modes remain.

The main measured training cost was CPU glove/bag deformation and its repeated
vertex uploads. The default local WebGL path uses the exact existing equations
with independent per-glove uniforms and matching color/depth/distance shaders.
`?padding=cpu` restores the original route on reload. Both WebGL1 and WebGL2
Chromium captures are pixel-identical to CPU deformation, including shadows.
The 12-frame sample uploaded 58,605,120 bytes before and 8,247,744 after (86% less).
This includes catch-up and excludes uniforms; it is not an FPS or memory claim.

Camera pointer events no longer update the complete world synchronously. Paused
orbits reuse the pose; world rendering still updates normally. Auto quality now
includes severe frame stalls, with separate down/up hysteresis. Mane transforms
and scratch vectors are reused without changing the groom or spring model.

## Validation

All **54 regression suites passed** on exact runtime `ae7dbf1`:
[CI run](https://github.com/ytcat/fit/actions/runs/42362890585), Success, 8m8s.
The known workflow runs syntax checks and every `tests/*.test.cjs`; hosted detailed
logs require login. Browser tests additionally cover native CDP pinch and cancelled
finger recovery, mouse drag after blur, both shader contexts and three complete
mode cycles. Warmed resource counts stayed at 365 geometries, 29 textures and
41 programs. A 1,000-event orbit stress sample triggered zero per-event world
updates and zero paused-pose simulations.

Sequential Node diagnostics (fake canvas, 120 samples) measured speed-bag CPU
P50/P95 7.15/68.93 ms before and 2.08/3.47 ms after; rope 1.27/2.45 and 1.08/1.71.
Mitts measured 2.17/3.73 before and 2.62/9.36 after: its tail was higher, so no
universal timing improvement is claimed. JIT, GC and host load affect these
numbers. See complete raw results; these are not browser GPU frame timings.

**NOT VERIFIED ON PHYSICAL PHONE:** Safari/Android sustained FPS, thermal impact,
long-session memory and device-specific gesture behavior remain unverified.
The separate authored realistic head/mane milestone is still unfinished; this
release makes no 75/100 realism claim. Existing faces remain stylized.

## Rollback and reproducibility

No new paid, hosted, CDN or runtime authoring dependency. Current local Three.js
r128, boxing mechanics and cached legacy model pair remain. Shader padding is
optional with the CPU URL above; ordinary release rollback can return to the
frozen baseline. Source commands, capture provenance and test harnesses are in
`qa/r90/README.md`. Original screenshots remain outside the live app; compact
labeled comparisons in this release contain only actual browser renders.
