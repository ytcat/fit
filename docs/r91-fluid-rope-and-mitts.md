# R91 — coupled rope motion, round mitt sweeps and muscle definition

Published baseline `d18dad244cd0aff88cf97185a59a49f3fe83167a` (R90).
Candidate runtime `1b7c32c9e934ac430a9e1736d409feba6eef9b05`.
[Actual before/after motion and clay views](../qa/r91/review.html) ·
[Raw results and reproduction](../qa/r91/README.md).

## Changes

Skipping now has a two-beat boxer weight shift, distributed pelvis/spine/chest
rotation, more pronounced loading and landing, shoulder glide, wrist circles,
head counterbalance and stronger ankle articulation. All four existing rope
exercises remain. The cable follows the actual handle bearings and has a small
traveling bend/phase lag rather than rotating as a perfectly rigid plane.
Overhead and underfoot timing, direction, sole clearance and endpoints retain
the original regression limits. No extra rope mesh or draw call is added.

Mitt work now uses an outside chamber, round overhead sweep and recovery,
alternating the trainer's left and right sweep. The palm pronates downward through
the existing anatomical forearm frame; the hand is not bent at the wrist to fake
orientation. The non-sweeping hand folds into guard. The trainer's hip/chest turn
advances the sweeping shoulder, and both feet are re-solved against planted
anchors after the torso/hip overlay. The partner stays in a close stance instead
of sliding toward the boxer. Registered contacts compress/recoil the catching
mitt and carry a small reaction through the chest.

Jab and cross target the corresponding same-screen-side mitt of the facing
trainer (the opposite anatomical side). The target is the real catching surface,
not the hand origin. Automatic rolls are shallower to avoid the near-kneeling
pose seen during render review. Rabbit ears fold back during this drill's roll.
Defence credit additionally requires horizontal proximity to the passing mitt;
manual idle still earns no defence credit. Existing scoring, sounds, player
commands, other modes and boxing IK remain in charge.

The existing continuous-body muscle correctives have broader arm recruitment
and stronger bounded displacement in chest, back, abs, quads and calves. Back
activation follows the rope load/drive; limbs follow flexion and extension. The
original sub-25-mm deformation bound, CPU/GPU normal deltas and matching shadow
path remain. This adds no disconnected muscle objects or new shader attributes.
It is pose-driven surface deformation, not simulated muscles or motion capture.

## Evidence and limits

Exact CI status, SHA and suite count are in
[validation.json](../qa/r91/results/validation.json).
Targeted original rope/mitt suites pass for both species, all four rope patterns,
real pad contacts, manual covers/idle, lifecycle cleanup and grounded boots.
The new bilateral sweep suite checks continuous muscle activation, non-planar
cable motion, arm reach, palm direction, straight wrists and both partners' feet.
Minimum tested palm-down alignment was 0.839; sweep hand-target reach error was
numerical noise, below 1e-15 m. These are authored-pose checks, not a certification
of human joint angles. Native Chromium touch pinch/cancel/recovery and mouse drag
after blur pass. All linked shaders passed in WebGL1 and WebGL2 without errors.

At matching full-scene captures, rope submits 169 calls / 433,667 triangles and
mitt work 268 calls / 891,931 triangles, unchanged from R90. These include submitted
passes, not unique visible triangles. Warmed full-capture resource counts also
match: rope 155 geometries/14 textures; mitts 266/21. The pads-only capture has a
different cache warm-up history and must not be compared as a memory reduction.
There is no new geometry/texture allocation for the muscle parameter changes.

Sequential Node CPU diagnostics (fake canvas, 12 warmup +120 samples, both using
normal shader-padding route) measured:

| Mode | R90 P50/P95 ms | R91 P50/P95 ms |
| --- | --- | --- |
| Idle | 1.07 / 1.83 | 0.93 / 1.58 |
| Speed bag | 1.97 / 2.91 | 1.96 / 3.77 |
| Rope | 1.22 / 2.17 | 1.15 / 2.12 |
| Mitts | 2.18 / 3.56 | 2.76 / 4.68 |

Mitts cost more CPU for iterative surface targeting and grounded-leg correction.
Do not interpret incidental differences in other modes as an optimization claim.
These are update timings on a shared host, affected by JIT/GC/load; no actual
renderer runs in this diagnostic. They are not complete-frame or GPU timings.
**NOT VERIFIED ON PHYSICAL PHONE:** Safari/Android sustained FPS, thermal behavior
and hardware-specific input remain unverified.

The linked GIFs contain actual app samples, with matching cameras, lighting and
resolution. Body-clay views disable coat and body texture under the same existing
arena lights, not a separately calibrated studio. The major authored head/mane
milestone remains unfinished; there is no 75/100 visual score or photorealism claim.
This release targets believable motion within the existing cartoon style.

## Collaboration and rollback

Current remote main was fetched, the open-PR page inspected, and development
isolated in `lion/r91-fluid-training` at `/workspace/fit-r91`. No other worktree was
changed or reset. Final publication requires a fresh ancestry check and a
controlled fast-forward; no forced push or automatic merge of concurrent changes.

Changed runtime: `career-drills.js`, `avatar-anatomy.js`, the scoped rabbit-ear
option in `boxing-coach-v2.js`, and corresponding versioned references in
`index.html`. Existing legacy controller/model pairing remains. No external asset,
paid package, CDN, remote renderer, rig replacement or runtime authoring dependency.
The frozen R90 branch remains available for release rollback; `?padding=cpu`
retains the earlier CPU-padding fallback.

Motion choices build on the repository's coaching/kinetic-chain review in
[prior research](research/r88-movement-notes.md) and
[R90 analysis](research/r90-rope-and-frame-cost.md). External handbooks were not
newly retrieved here; these curves are explicit authored approximations, with
render/geometry tests providing the evidence actually claimed.
