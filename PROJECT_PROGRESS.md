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

## R75 practice and contact experience
- Added synchronized/variable practice pacing, seeded bursts and guard pauses for
  every practice target; live bouts keep independent stamina/read/defence decisions.
- Preserved centered uppercuts and neutral glove/forearm alignment. Rising contact
  now carries direction into the receiving fighter, with bounded upward head/neck
  response, rearward torso recoil and planted leg support; body/block reactions
  and contact-derived scoring stay distinct.
- Reworked speed-bag pendulum/platform rebound, actual contact-event aggregation,
  swing events and dummy response. Misses cannot add bag momentum or scored hits.
- Rebuilt anatomical dummy and detailed rhino/referee clothing and surfaces. Added
  a reproducible geometry bake to remove procedural sculpture work on selection.
- Bundled licensed local impact, air-swing, vocal, clap and struck-metal recordings;
  added contact gating, voice cleanup, limiting, mute and accessible source credits.
- Browser validation covered desktop/phone layouts, practice controls, all target
  modes, fight, languages, pause and actual Web Audio rendering. The reference,
  measurement and remaining realism/device-performance limits are documented in
  docs/r75-reference-and-design.md. Imported mocap/retargeting remain pending.

## R76 follow-up — physical contacts and animal surfaces
- Fixed rendered glove pass-through after a scored contact, corrected the sign of
  root recoil and fitted uppercuts to the supplied wrist target. Added compliant
  local skin response, stronger visible recoil and contact-side facial damage.
- Added a bounded connected shoulder correction, dense skeleton-attached short
  coat with inertial tips, stable face attachments and revised animal features.
- Restored persistent phone audio activation with a visible stage sound control,
  interrupted-context recovery and callback-compatible/partial asset decoding.
- Added six speed-bag drill patterns and four combinations with per-move tempos.
- Detailed findings, free model/material research and limits are recorded in
  docs/r76-contact-avatar-review.md. Mocap and physical-device benchmarks remain
  separate open work; no photorealism or full soft-body simulation is claimed.

## R77 coat color correction
- Reproduced the reported brown rabbit underarm in the raised lead-hook pose.
  The short coat used a beige material multiplier on top of species vertex colors,
  and both amber rim lights plus brown ground bounce exaggerated the color cast.
- Made the fur multiplier neutral and replaced colored rims/ground bounce with
  neutral studio lighting. Rabbit underarm shading now stays grey; the lion's
  tawny color still comes from its own coat colors.
- Inspected matched before/after closeups and a fresh 393×852 browser render of
  the source-level fix; no page or shader errors. Existing avatar-detail and app
  regression suites, syntax and whitespace checks passed. Physical-phone testing
  is not claimed.

## R78 professional presentation and simultaneous exchanges
- Reproduced an offset two-uppercut failure with overlapping torsos and added
  torso separation plus coupled glove/wrist/forearm constraints for both fighters.
- Added pose-driven continuous muscle/normal deformation, coordinated facial
  acting, reactive referee gaze, a native rabbit head/body surface and detailed
  boxing canvas, ropes and stitched equipment.
- Expanded to 24 presets and seeded generated attack/defence/exit combinations.
- Removed game-character vocals from active playback and replaced them with dry
  local leather/air Foley and unvoiced exhalations; retained licensing for legacy
  files and added reproducible original-asset build scripts.
- Evidence, measurements and realism limits: docs/r78-realism-and-trades.md.

## R79 motion, recovery and recorded-sound release (2026-11-05)
- Corrected uppercut forearm stacking and loading continuity; collision
  repositioning preserves the intended palm orientation.
- Added bounded speed-bag self-face clearance and replaced the existing technique
  rail with ten relevant drills, including bursts followed by defence.
- Added articulated canvas support, staged faster recovery, bounded shock shake
  and persistent final-KO behavior for both fighters; increased practice/fight pace.
- Replaced active punch/bell samples with licensed CC0 recordings and authored a
  stereo crowd mix from recorded claps; retained mobile audio unlocking/fallback.
- Implementation, reproducible QA and limitations: docs/r79-motion-speedbag-knockdown-audio.md.
- This release does not claim completion of the separate authored face/mane
  realism overhaul or sustained performance verification on physical phones.

## RingFighter R81 — direct play and contained mobile layout (2026-11-05)
- Renamed the header, document and rendered club/ring branding to RingFighter.
- Replaced the overflowing phone page with a viewport-sized arena and contained
  transport, compact setup, safe-area handling and short-screen controls.
- Added Watch / Play and left/right move controls for both selectable boxers in
  every practice target, sparring and fights, with independent opponents and
  real-contact scoring/audio. Speed bag uses relevant taps/doubles/triples.
- Reproduced the simultaneous-contact upper-arm reversal and added stable elbow
  references, suitable striking range and coordinated contact-driven recovery.
- Validation and limitations: docs/r81-ringfighter-interactive-controls.md.
- Physical-device performance and the separate face/mane realism overhaul remain
  unverified/incomplete; this release does not claim photorealism.

## RingFighter R82 — ring travel and camera gestures (2026-11-06)
- Added a glove-first fight guard, stable elbow transitions and continued real
  contact constraints; retained the prior simultaneous-punch regression gates.
- Added bounded between-exchange ring movement, supported alternating steps and
  smooth settling into punch footwork; expanded presets to 28 with more steps.
- Made gym/arena surroundings follow rotation, completed side/end scenery and
  cut away near walls; widened fight framing and added pinch/wheel zoom.
- Review, validation provenance and device limitations:
  docs/r82-ring-movement-camera.md. Physical phone testing remains unverified.

## RingFighter R83 — folded guard correction (2026-11-06)
- Reproduced the R82 elbow pole projecting the guard elbows into the chest.
- Corrected the pole and cheek-side wrist spacing; added own-face clearance
  after pose stabilization and final fight contact correction.
- Replaced the incorrect wrist-forward guard criterion with anatomical guard
  checks; added actual glove-mesh clearance tests for both fighters.
- Matched app-rendered evidence and validation: docs/r83-fight-hand-correction.md.

## RingFighter R84 — arm hinge frame (2026-11-06)
- Reproduced a 90° upper-arm roll during isolated elbow flexion, despite correct
  joint endpoints. Corrected the model's bind-space elbow fold to -Z.
- Added humeral-roll, actual palm/forearm alignment and world-space hit-volume
  compatibility tests. The complete 44-suite validation passes.
- Rebuilt the versioned shoulder corrective for the new frame; retained v1 and
  incompatible-data fallback. Repeated authoring output is byte-identical.
- Actual normal/clay motion comparisons and limitations:
  docs/r84-arm-hinge-frame.md and qa/r84/comparison.html.
