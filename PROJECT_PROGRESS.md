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

## Jab milestone — incremental implementation
- Committed `5bf13f6`: add a small jab-phase chin tuck and raise the rear cheek guard during lead-hand extension.
- Scope: targeted guard/head biomechanics only; full jab mechanics, shoulder deformation and glove orientation still require rendered visual regression checks.
- JavaScript syntax and GitHub Actions outcome for this commit have not yet been confirmed.

## Jab footwork milestone
- Committed `3d71265`: lead jab advances the lead foot while keeping the rear foot planted as support. Other movements retain their previous footwork behavior.
- This is a code-level change only. No measured foot-skating, visual joint deformation, or browser performance result is available yet.

## Next action
Inspect rig joint names and animation update paths, identify a free licensed boxing jab clip, and test retargeting on a separate branch before altering main.

## Review and contact repair — 2026-11-04
- Started the architecture/contact/regression milestones with a review of the
  current procedural rig and target response paths.
- Removed duplicate uppercut bag kicks and dummy torque boosts; added bounded
  lever-arm lift response, reachable uppercut wrists and earlier release.
- Reduced uppercut side sway and head recoil, applied planted-leg support to
  solo uppercuts, moved their load chamber forward and ramped rabbit reactions.
- Corrected a hook shoulder-vector mutation, softened its chamber and widened
  its swing timing.
- Refined dummy/referee detail, ring corners/ropes and transient material cleanup.
- Repaired CPU canvas mocks, obsolete referee assertions and browser harness.
- Evidence and limitations: docs/review-2026-11-04.md. Mocap sourcing, retargeting
  and measured device performance remain open; this does not complete the roadmap.

## R73 completion pass
- Completed the pending rig/contact repair from this review: compact uppercut
  load/rise/recovery, stable elbow planes and gaze, consistent closing footwork,
  live dummy chin targeting, coupled bag/dummy recoil and pause-safe aiming.
- Corrected continuity checks to use anatomical shoulder references and
  distinguish whole-body travel from a discontinuous IK correction.
- Preserved contact-derived fight scoring and added bounded seeded outcome
  coverage, equipment browser checks and complete CPU suites in CI.
- Mocap sourcing/retargeting and measured device-performance milestones remain
  separate pending work; no completion or benchmark is claimed for those.
