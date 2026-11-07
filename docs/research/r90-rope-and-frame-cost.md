# R90 — rope coordination, equipment and frame cost

Baseline inspected before edits: `368c2eacfe81452c3bb821a7f99e4d006cb6de77`.
Dedicated worktree `/workspace/fit-r90`; the original baseline is preserved in
`/workspace/fit-r90-base`. Other worktrees were not modified.

## References and interpretation

Reviewed the repository's motion review, R89 gear/rope report, progress log and
realism authoring audit. The existing boxing coaching references support linked
lower-body/trunk/shoulder motion and neutral wrists for punches. The rope-specific
motion is a separate overlay; it does not bend wrists during boxing strikes.

Retrieved and read the `Rope_Jumping` entry in the public exercise dataset:
https://github.com/yuhonas/free-exercise-db/blob/main/dist/exercises.json
The entry describes bringing the rope overhead and down in front, jumping as it
reaches the ground, coordinated repetition and cadence variation. It is a basic
exercise description, not peer-reviewed kinematic data or a source of precise
joint angles. No calorie claims, images, dataset assets or third-party animation
were imported. Its README identifies the dataset as public domain/Unlicense.

Implementation choices are authored, visually plausible: a short grounded loading
and landing period, ankle push-off, knee/hip absorption, small torso counterbalance,
stabilized head, relaxed shoulders, elbows beside the waist and small wrist turns.
This is not motion capture or a validated musculoskeletal simulation. Pose phases
and amplitudes must be judged from actual app renders, not source inspection.

The pose overlay runs before mane, expressions and skin updates. All four rope
exercises retain the same action clock, handle attachment and floor constraints.
The rope has pooled centreline vectors and analytic radial tube normals; no
per-frame triangulated-normal rebuild or new centreline allocation is needed.

## Measured bottleneck and compatible remedy

A 120-frame Node CPU diagnostic found the speed-bag path spending about 617 ms
inside glove deformation and 232 ms in equipment dents. That diagnostic uses a
fake canvas, not WebGL, and inclusive timings are not a frame-rate benchmark.
The existing glove and equipment formulas rewrote position/normal attributes at
physics rate; the speed-bag soft mesh alone has 32,100 vertices.

The shader version uses the same position and normal formulas in Three.js r128
color, depth and distance passes. Only independent pressure/contact uniforms
change. Original geometry, contacts, timing and CPU deformation fallback remain.
`?padding=cpu` selects the original route on reload. No new GPU, runtime service,
paid library, CDN or renderer version is required; this runs on device WebGL.

Actual Chromium renders with forced asymmetric glove pressure and a bag dent
matched the CPU fallback pixel-for-pixel in the tested WebGL2 scene. All linked
programs succeeded. The 12-frame upload sample recorded 58,605,120 buffer bytes
on the CPU path versus 8,247,744 on the shader path (about 86% less). The first
sample includes a deliberate 150 ms physics catch-up, so it is not representative
steady frame timing. WebGL1 compilation/rendering is checked separately. These
are software-browser compatibility/upload measurements, not physical-phone FPS.

Other fixes target observed work rather than adding arbitrary polygon limits:
- The quality controller now includes severe stalls and can downshift promptly;
  upshifts retain a longer dwell to avoid oscillation.
- Camera events update the camera and invalidate the next render. World cutaways
  update once in the render loop, not once per pointer event.
- A paused camera change reuses the existing pose instead of rerunning exercise
  physics/skinning. Technique, time, mode and player changes invalidate the pose.
- Mane guide transforms are computed once per update, and temporary vectors are
  reused. The 24 guides, groom, force limits and integration remain intact.
- Handle metalwork is batched; the live cable still terminates at hand-mounted
  bearing anchors. Red/oxblood padding, black straps and contrasting seams make
  coach mitts read as equipment rather than fur/skin.

## Plan alignment and remaining limits

This continues the agreed synchronization, equipment-detail and measured mobile
performance work. It does not complete the separately planned authored face/mane
asset, establish a 75/100 score or validate sustained phone thermal performance.
Run the complete CPU suites, compare matched app renders and shader shadows, check
interrupted gestures and resource cycling, and record named hardware gaps before
publishing. Never claim that any browser can be guaranteed free of all stalls.
