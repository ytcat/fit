# First master-brief motion milestone

Baseline: `a7fe5a4376cbe08a3237ae7d6f1355117b6b6282` (R96).
Runtime candidate: `50cf99760b03e02eadbadab6fd2716cd239e8b05`.
Final browser capture: `ad2d2491f5c40df5c91689c3d34e519061149957`, identical runtime.

[Actual four-angle uppercut comparison](../../qa/realism/motion-review.html).
[Architecture and coordinate contracts](architecture-contracts.md).
[Remaining master-brief work](execution-status.md).

## Changes and evidence

Mitt training now practices all six punches, retaining same-hand mitt assignments,
the existing 1.2 m separation and both roll-under sweeps. Uppercuts rise beneath
a down-facing receiving pad, with a compact centreline finish and bounded
whole-arm endpoint correction. Wrist/forearm alignment stays neutral. Manual
strikes work after arbitrary waits instead of following the automatic sequence.

The pilot runs mitt simulation at 120 Hz, with bounded catch-up and one final
skin/face/mane upload per displayed update. Contact uses incoming relative glove/
pad velocity, a swept face-plane crossing and the physical oval face bounds;
separating motion, gaps and time jumps cannot manufacture a hit. Contact samples
carry an actual simulation timestamp and preserve existing event fields.

The optional `?poseAudit=1` records final post-contact poses into reusable typed
buffers. The browser's hero/trainer audit agrees exactly with the current world
control point (reported error zero). This is an observation contract, not a
replacement rig or applied render interpolation.

Baseline artifacts include both species, four views, 16 sampled states, neutral
clay checks and short full-scene software-renderer diagnostics. Final mitt captures
include both uppercuts at load/strike/recovery from four views. They are real
Chromium app renders, not generated character images. Metadata and selected test
logs are in `qa/realism/results/`. The comparison uses matching pose, camera and
phase; old manual-control labels differ and are not evidence of a UI redesign.

## Validation and cost

The earlier runtime `0ca5d5b` passed all 58 suites in
[CI](https://github.com/ytcat/fit/actions/runs/42412193247).
Final compact uppercut changes passed the pose contract, six-punch mitt controller,
career drill and fluid/training-motion tests locally. New gates exercise both
species, long manual waits, misses/separating motion, duplicate rejection,
30/144-Hz pacing, neutral wrists, near-vertical centreline uppercuts and one final
detail update per display sample. Final runtime `50cf997` passed all 58 suites in
[CI](https://github.com/ytcat/fit/actions/runs/42426315067), including JavaScript
syntax and local asset checks. Exact provenance is recorded in
`qa/realism/results/validation.json`. Release documentation/assets leave runtime
and tests identical to that tested commit.

The same-source fake-canvas CPU station diagnostic (240 samples after 30 warmup,
60-Hz requested calls) measured fixed-step P50/P95 5.08/12.14 ms at 1x and
12.23/22.98 ms at 3x. Legacy variable stepping measured 2.62/5.88 ms and
2.18/3.73 ms respectively. These noisy CPU-only results show a material cost for
rate-independent contact, particularly at 3x; this is not a performance improvement
claim. Full renderer draw-call deltas are not established by this capture.
`?padClock=legacy` retains the original station clock for rollback/comparison.
No physical iPhone/Android, sustained thermal test, hardware GPU frame measurement
or mobile FPS acceptance is claimed.

## Scope and next work

This is a tested first milestone, not completion of the master realism program.
There is no new face sculpt, mane asset, skeleton or realism score. Fight/bag/rope
clocks and collision rules are not migrated. Next: profile the 3x catch-up cost,
establish explicit whole-game animation layer ownership and visual interpolation,
then migrate complete action/defense families and authoritative impacts. Continue
with authored anatomy/materials and isolated engine/asset/physics experiments only
after behavioral gates. The YouTube reference and GitHub PR API are blocked by the
session network policy; source-based work and public Actions pages remain usable.
