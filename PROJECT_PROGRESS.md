# Lion app development checkpoints

Updated: 2026-11-02

## Rules
- No paid dependencies or external AI API.
- One independently testable milestone per commit.
- Never claim visual/performance validation without actual browser/device measurements.
- GitHub Actions validates committed code; it does NOT generate new AI code or resume ChatGPT after usage limits.
- Preserve existing working features and avoid automatic merges of untested animation changes.

## Dependency order
1. **IN PROGRESS — architecture audit and realistic jab feasibility**: inventory animation, rig, render loop and speed-bag behavior; verify a candidate free motion-capture source/license; prototype a jab on the existing skeleton. Acceptance: documented skeleton compatibility, valid jab motion, no glove inversion or armpit distortion, no regression in other modes.
2. **PENDING — rig and animation foundation**: resolve glove orientation, shoulder deformation, joint limits and retargeting.
3. **PENDING — complete boxing movements**: cross, hook, uppercut, combos, defensive movement and footwork.
4. **PENDING — contact and reactions**: heavy/speed bag, dummy, rabbit, impact and sound.
5. **PENDING — responsive UX**: desktop/mobile navigation, accessible controls, lion framing.
6. **PENDING — regression/performance**: frame timing, memory, mobile/desktop and rotating fight ring.

## Initial code audit
- `boxing-coach-v2.js`: custom bone rig and authored kinematics, not imported motion capture.
- `training-arena.js`: speed bag geometry is created lazily and cached by mode; spring-based response.
- `index.html`: local Three.js and separate coach/arena/fight scripts.
- Actual frame-time measurements, live browser visual tests and motion-capture retargeting are NOT yet completed.

## Verification update (2026-11-02)
- Confirmed that `index.html`, `boxing-coach-v2.js`, `training-arena.js`, and `boxing-routines.js` are present in the default branch.
- Corrected a malformed Python regex in `.github/workflows/lion-ci.yml` (commit `3d613f3`). This is a source-level fix, not a confirmed passing Actions run.
- GitHub's combined commit-status endpoint returned no reported statuses for the previous workflow commit. GitHub Actions job outcome remains unverified.
- Inspected the coach skeleton definition: `hips`, `spine`, `chest`, `neck`, `head`, paired `arm`, `elbow`, `hand`, `scapula`, `thigh`, `knee`, `foot` bones. The rig is custom, so third-party mocap would require retargeting rather than direct playback.
- No jab prototype, full-body visual check, or device frame-rate benchmark is complete yet.

## Next action
Inspect rig joint names and animation update paths, identify a free licensed boxing jab clip, and test retargeting on a separate branch before altering main.
