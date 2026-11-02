# R23: reference-based glove and shoulder corrections

## Findings and changes

Reviewed the supplied R22 screenshot and all six boxing photographs separately.
The photographs establish positions and silhouettes; they do not establish timing.
England Boxing's coaching handbook supplies the technique guidance for transitions.

- Straight-punch photographs: nearly horizontal reach, raised striking shoulder,
  tucked chin, and opposite glove beside the cheek. Lowered the default wrist aim
  by 8 cm and increased striking-shoulder elevation by 2 cm. Explicit equipment
  and fight target heights continue to use their own contact plans.
- Side and foreshortened straights: broad knuckle pad leads; thumb curls against
  the inside of a closed fist. Reduced the protruding thumb and finger pocket,
  darkened the palm leather, and added a dorsal label. Pronation completes near
  full extension while the wrist stays aligned with the forearm.
- Bag body shot: preserve its compact bent arm, level change and opposite guard;
  do not convert every punch into an overhead reach. Lowered the shadowboxing
  hook path by 6 cm; uppercuts retain their dip, leg/hip drive and upward fist path.
- Recipient head-recoil photograph: retain the contact-driven head/neck and trunk
  reaction system introduced in R22. These are geometric contacts, not scripted
  reactions triggered solely by an attack being selected.

The underarm defect was a separate rigging problem. Recut the rest-surface axilla,
replaced the coordinate threshold with an anatomical volume-distance partition,
and added intermediate axilla bones. Lower-rib skin and biceps no longer share
the old broad attachment region. Added independently moving scapula helpers to
make the outer back protract with shoulder reach. Bone weights are normalized
and limited to the four influences supported by the renderer.

The solo camera previously sat below the gloves, exposing their palm underside
and exaggerating apparent punch height. Raised the solo/equipment/fight cameras
and biased solo framing toward the reach envelope. Profile punches now remain
inside the portrait viewport. Updated asset query versions so the body geometry
and rig ship together rather than mixing a cached R22 surface with the R23 rig.

Lion refinements: round pupils, a softer brow, broader nose, fur-colored ear backs,
less aggressive coat bump, and a shorter, narrower, more downward-curving mane.
Mane tips retain motion coupled to body turning and recovery. Everything remains
bundled in the app; no external inference, animation or rendering service is used.

## Validation

All 15 `tests/*.test.cjs` suites pass, including existing bag mechanics, contact,
power, fixed-step fights, guard, planted feet, uppercut and hook regressions.
`reference-motion.test.cjs` adds checks of the actual skinned underarm, moving
scapulae, lower wrist targets, and glove visibility through portrait/profile/back
views using the application's real camera method.

At phase 0.47, comparing surface edges longer than 2 mm in the raised-arm region
(absolute X 0.22–0.48 m, Y 1.30–1.65 m):

| Punch | R22 p95 edge stretch ratio | R23 p95 | R22 p99 | R23 p99 |
| --- | ---: | ---: | ---: | ---: |
| Jab | 3.456 | 2.036 | 4.723 | 2.773 |
| Cross | 3.476 | 2.070 | 4.739 | 2.866 |
| Lead hook | 3.700 | 2.164 | 5.045 | 2.915 |
| Rear hook | 3.614 | 2.160 | 5.380 | 3.103 |
| Lead uppercut | 2.758 | 1.878 | 3.585 | 2.437 |
| Rear uppercut | 2.791 | 1.807 | 3.578 | 2.433 |

This is a deformation diagnostic, not a claim of physically simulated skin.
Some local stretching remains. `qa/render-model.cjs ... references` exports the
actual skinning with the real app camera; `qa/render-gloves.cjs` exports glove
anatomy and foam compression. CPU previews omit textures, PBR lighting and shadows.
The available cloud browser cannot create WebGL, so final shaded animation still
requires observation on a WebGL-capable device.

## Primary references

- [England Boxing Level 2 Coaching Handbook](https://www.englandboxing.org/wp-content/uploads/2022/03/Level-2-Coaching-Handbook-compressed.pdf): straight pronation, guard, hip/foot rotation, hook and uppercut mechanics.
- [ISBS 2024 boxing technique research](https://commons.nmu.edu/isbs/vol42/iss1/156/): ground-to-fist coordination and coaching observations.
- [Disney Research: Real-time Skeletal Skinning with Optimized Centers of Rotation](https://la.disneyresearch.com/wp-content/uploads/Real-time-Skeletal-Skinning-with-Optimized-Centers-of-Rotation-Paper.pdf): limitations of linear and dual-quaternion skinning. R23 uses authored helper bones and surface changes; it does not implement the paper's optimized CoR algorithm.
