# R89 — attached mitts, natural training motion and a larger ring

The trainer's old mitts were children of the scene root, positioned at desired
targets rather than the hands. A target outside the arm's reach left the mitt
floating beyond the wrist. Focus mitts now inherit the actual hand-bone
transform. Their wrist opening cannot separate from the forearm, including
during the trainer's hook.

## Training graphics and movement

- Rebuilt adult-sized focus mitts with cupped striking faces, padded sidewalls,
  fitted hand/thumb pockets, leather grain, stitched binding and wrist straps.
  Perimeter stitches are batched to avoid dozens of extra draw calls.
- Trainer hooks use the existing hips, torso, shoulder and planted-foot motion,
  blended smoothly from the mitt-holding stance. Contact recoil moves the arm;
  pad compression stays within the attached padding.
- The trainee rolls below the incoming mitt and returns to guard. Observed
  contacts and real duck clearance still determine scoring.
- Corrected forward skipping: the rope descends in front and travels front to
  back beneath the feet. Its round cable connects to both handle swivels.
- Added wrapped hands, detailed handles, small wrist turns, softer landings and
  four exercises: two feet, alternating feet, left leg and right leg. Both
  characters support every exercise. Boxing gloves return on leaving rope mode.

## More room to play

One Training menu now contains character choice, stations, rope exercises,
techniques, statistics, camera controls and settings. The existing handlers and
saved scores are retained. Opening this menu pauses the scene; closing it
restores the previous playback state.

The main screen keeps a compact station/session/control bar and a circular
pause button. Camera orbit and pinch/wheel zoom still work directly on the
canvas. Basic Play mode has six controls; mitt work shows only Jab, Cross and
Roll. The full punch/defence/footwork controls remain available in the menu.

The phone browser measurement at 393 × 844 is a 377 × 694 canvas, about 82% of
the viewport height, with no horizontal overflow. The native dialog has one
sticky return control and scrolls independently of the ring.

## Verification

- Thirteen targeted motion, progression, input, character, camera, audio and UI
  suites pass. The new motion test uses the actual anatomy/detail/shoulder
  modules and both character surfaces.
- Sampled the entire mitt cycle at 120 Hz: no detached mitts or wrist flips;
  maximum adjacent target displacement 3.84 cm and rotation 0.050 radians.
- Verified every rope exercise for both characters: cable direction, handle
  attachment, outward surface normals, overhead mane/ear clearance, raised-leg
  selection and boot/floor clearance.
- Automated Chromium/SwiftShader checks exercise real menu selection, rope
  selection, visible controls and scene rendering. The browser check caught and
  fixed a bubbling body click that immediately closed the Training menu.
- Browser automation: `node tests/browser-r89.cjs`. This is software-rendered
  Chromium; physical iPhone Safari performance and touch behaviour still need
  device verification.

Cross-device accounts remain as documented in R87: not connected. This update
preserves local player saves and backup import/export.

The concurrently published R88 defensive covers, player combinations and exact
collision-transform optimizations are preserved, including manual mitt coverage.
