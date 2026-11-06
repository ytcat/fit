# RingFighter R82 — glove-first guard, ring movement and view controls

Baseline: `74176e0290420a77a592513ab7571fe9b967ce02`. Development used the
isolated `lion/r82-movement-camera` branch/worktree; previous worktrees and
published main were retained during testing.

## Changes

- Fight guards keep the wrist ahead of the elbow. Straight punches use the
  existing complete-endpoint wrist planner. A transported elbow reference bounds
  bend-plane changes before and after contact correction; wrist targets, arm
  lengths, neutral glove axes and contact-derived scoring remain authoritative.
- Fighters step through a bounded path across the ring and change facing/range
  between exchanges. Root travel stops during committed punches and knockdowns;
  alternating foot offsets and leg support follow the travel, then settle into
  authored punching footwork. This is procedural choreography, not a navigation
  or rigid-body simulation.
- Four additional step/punch/defence/exit routines bring the preset total to 28.
  Generated phrases can start with a repositioning step; automatic step beats
  also alternate lateral directions. Manual left/right controls are retained.
- Gym and arena scenery rotate with the selected view, including paused views.
  Side/end walls and side grandstands complete the surroundings. Camera-facing
  walls are cut away rather than hiding the boxer. Fixtures remain instanced.
- The default fight camera is wider. Canvas pointer gestures support one-finger
  or mouse orbit, two-finger pinch and wheel zoom, with bounded zoom, cancellation,
  pointer capture and paused-render invalidation. Gesture listeners stay on the
  canvas so move buttons retain their own input.

## Validation and evidence

The final runtime source is `afd763a`. The full validation workflow is
https://github.com/ytcat/fit/actions/runs/42168536778 passed JavaScript syntax,
local-asset validation and all 42 Node regression suites (8m 5s). The same
runtime remains in subsequent evidence-only commits; no application or test
sources changed after that validated commit.

- The existing 108 simultaneous move/offset cases pass without relaxing their
  penetration or temporal limits: maximum sampled intrusion 0.012298 m versus a
  0.027 m gate; maximum upper-arm frame change 0.997104 rad versus a pi/3 gate.
  These are engineering regression bounds, not medical joint limits.
- The fight scene regression adds bounded ring traversal, reachable moving feet,
  a glove-ahead-of-elbow guard, pause repeatability and frozen travel during a
  planted attack, alongside the existing contact/scoring and frame-rate checks.
- Browser layout/input checks pass at 393×650, 844×390 and 1100×950, including
  Watch/Play, real equipment impacts, EN/HE/RU, all twelve manual buttons, rotation
  and zoom. The layout run precedes the final arm/foot refinements; those changes
  do not change UI/layout sources. Final native-input and scene checks cover the
  final runtime separately.
- Native Chromium mouse drag/pointer capture, CDP touch pinch, single-touch orbit,
  wheel zoom and frozen-workout behavior pass. This is browser touch emulation.
- Actual WebGL room captures cover front/side/rear/opposite side in gym and fight.
  Visible scenery is ray-tested from the camera to the boxer to reject walls
  obscuring the view. The baseline keeps the scenery fixed at every angle;
  the new view rotates it consistently.
- `qa/r82/` contains reproducible browser scripts, raw results and app-rendered
  comparison captures. Diagnostic motion hides fur/scenery to expose joints;
  these images are not new artwork or beauty-render claims.

Early candidates were rejected for an arm reversal, an unreachable moving foot,
and an unsupported guard token in a new preset. The corrective changes are in
separate commits; the original regression limits were preserved.

## Performance scope

Scene counts and CPU update samples use Chromium/SwiftShader at 393×650, DPR .75,
with shadows disabled. They describe the submitted software-rendered scene,
not phone FPS, GPU timing, GPU memory bytes or sustained thermal performance.
At the sampled view, gym submissions change from 190 calls / 566,521 triangles
to 194 / 566,559; fight changes from 556 / 1,310,121 to 574 / 1,308,577.
Wider framing and cutaways affect visibility, so these are submitted counts,
not a reduction in asset complexity. The samples are short, CPU-contended and
noisy (fight update P50/P95: 16/26.1 ms before, 12.4/49.9 ms after); do not
interpret them as an established speedup or sustained frame rate. Raw
before/final metrics are retained with the evidence.

Physical iPhone Safari and Android performance/gesture behavior remain
**NOT VERIFIED ON PHYSICAL PHONE**. This release does not claim a face/mane
realism overhaul. It preserves the existing character assets and WebGL runtime.
