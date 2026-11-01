# R9: character surface and motion refinement

Revisited the user's supplied commercial's 5–7 second motion sample, concentrating
on changing torso silhouette, a bladed guard, shoulder-led reach and bent knees.

- Refine body, shorts and glove triangles with shared-edge Phong subdivision.
  Midpoints project to endpoint tangent planes, improving curved silhouettes.
- Sculpt stronger continuous pectoral/abdominal/shoulder-blade contours, tapered
  quadriceps/calves and upper-arm relief before calculating skin weights.
- Use quintic easing with zero first and second derivatives at timing endpoints.
- Start from a slightly bladed orthodox torso instead of a square guard.
- Carry the cross through a fuller pelvis/back turn and rear-foot pivot; place
  hook travel farther in front of the rotated shoulder, retaining a bent elbow.
- Transport the hand's guard frame with its forearm before pronation, avoiding
  a near-parallel reference-vector singularity discovered during dense sampling.
- Display R9 in the app subtitle and version the animation script to distinguish
  the new character build from cached pages.

Software-rendered front, rear, uppercut, jab, hook and slip poses were inspected.
The final hook was rendered again after its reach/orientation corrections. This
is geometry/pose evidence; the software renderer does not establish live browser
frame rate or reproduce PBR lighting. Browser WebGL remains unverified.

Motion, controller and workout checks pass. Surface tests additionally verify
fourfold triangle refinement and finite vertex/normal data. The extra geometry
increases loading and rendering work; mobile performance has not been measured.
The character still uses authored kinematics rather than captured human motion.
