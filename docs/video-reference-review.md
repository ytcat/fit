# Uploaded commercial review

Reviewed the user's 33.63-second, 512×1112 screen recording, including a 6 fps
sample of the punch/defence sequence at 5–7 seconds and a full-video storyboard.
The recording was used for analysis only; no competitor artwork or footage is
included in this repository.

## Visible observations

- Large illustrated instructor against a warm interior; detailed muscle linework,
  foreshortening and changing torso silhouettes make rotation readable.
- Flexed knees, changing hip/shoulder orientation, maintained guard and head
  displacement accompany punches and evasions.
- A small inset shows a separate workout demonstration/countdown.
- The closing screens show a 28-day challenge, day tiles and workout progress.
- The recording is a commercial with edited overlays. It does not establish
  whether the central character is generated, hand animated, motion captured,
  or rendered from a real-time 3D rig; it does not establish app tracking features.

## Implemented from the reference

- A self-guided 28-day plan using the existing four drill families, with locally
  saved completion, day selection and week labels. Days remain freely selectable.
- Optional focus view, preserving the camera controls and instructor while hiding
  secondary controls and explanatory cards.
- Upcoming drill/countdown during timed training; current drill during preview.
- Root-anchored secondary mane deformation, deterministic for freeze/slow motion.
- Correct round counter, workout completion/reset, and pause/resume during rests.
- Three-language UI and keyboard-accessible native challenge dialog.

This is a first adaptation, not a reproduction of the commercial's character
quality. The lion's coarse procedural anatomical surfaces, fur shading and authored
joint trajectories remain the main visual limits. Matching that illustrated detail
requires a substantially more developed character asset and animation treatment;
it cannot be established by passing kinematic tests. Hair response here is authored,
not a hair dynamics simulation. Browser WebGL visual QA remains unavailable.

## Validation

`node tests/coach.test.cjs`, `node tests/app.test.cjs`, and
`node tests/workout.test.cjs` cover existing motion invariants and the new selection,
persistence, completion, focus and translation behavior. Challenge progress is
stored on the current device/browser and is not an account-synced record.
