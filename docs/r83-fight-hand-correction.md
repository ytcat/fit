# R83 — correct the folded fight guard

Baseline: `7949bd8efe78ea0b973823cee69623341aab2d79` (published R82).
Runtime candidate: `1403697`, developed in the isolated `lion/r83-arm-anatomy`
worktree. No character assets, skeleton dimensions, game UI, camera controls,
room, scoring rules or sounds were replaced.

## Reproduced cause

R82's backward elbow pole projected inward when the wrist was near the cheek.
In the matched initial guard, the left elbow moved 0.345 m inward relative to
its shoulder; the right moved 0.225 m inward. That put the bent limb across the
pectoral region and made it look disconnected or folded into the body.

The previous regression demanded that the wrist be at least 25 mm farther
forward than the elbow. That is an unsuitable rule for a raised boxing guard:
the forearm can be nearly upright. The rule encouraged the wrong correction.
It has been replaced with checks that the guard elbow stays outside the chest,
below the glove, with both bone lengths preserved. Existing opponent intrusion
and frame-continuity limits are retained.

## Correction

- Reduce the backward elbow bias and widen the fight wrist positions toward the
  cheeks. Both lion and rabbit share the correction. Practice defaults retain
  their existing guard coordinates.
- Apply the existing own-face clearance system in fight poses. Recheck after
  bend stabilization and final opponent contact correction, because either can
  change the visible glove orientation after the authored pose.
- Transport the elbow reference when clearing a glove from the face; retain
  the neutral forearm-to-glove axis. Contact scoring remains driven by the real
  glove sweep rather than any synthetic hit.
- The coupled arm solver now treats the owner's head and the opponent as
  simultaneous constraints. Final face clearance favors the cheek side, so a
  correction need not push the glove back into the opponent. The original
  108-case sweep passes: maximum sampled opponent intrusion 12.271 mm
  (27 mm gate), maximum upper-arm frame change 0.811265 rad (pi/3 gate).
- Version the cached scripts. No external dependency or new geometry is added.

## Evidence and checks

`qa/r83/comparison.html` shows actual before/after app renders at matching
camera angles, lighting and 1.65× diagnostic zoom. The initial guard matches the
reported rest pose; later frames cover moving poses. This is not generated art.
Raw joint coordinates, sampled glove geometry and source hashes are retained.

The corrected initial elbows sit 0.104 m / 0.088 m outward of their shoulders.
The new real-mesh guard test passes through idle and simultaneous jab, cross,
hook and uppercut exchanges for both species. It samples actual glove vertices
against skull/muzzle envelopes: minimum normalized distance 1.229, with 1.0 the
surface. It also checks guard elbow position, forearm rise and fixed bone lengths.
These envelopes are conservative collision proxies, not a claim of anatomical
soft-body simulation.

Full release validation workflow:
https://github.com/ytcat/fit/actions/runs/42172474960 . Confirm success before
publishing. Subsequent evidence-only commits retain identical runtime sources.

Physical iPhone Safari/Android performance remains unverified. Browser captures
use software WebGL and do not establish device FPS. The correction adds CPU
clearance checks; it adds no meshes, textures, materials or draw calls.
