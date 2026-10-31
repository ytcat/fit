# Boxing motion review — 31 October 2026

## References

- [England Boxing Level 1 handbook](https://www.englandboxing.org/wp-content/uploads/2022/03/EB_Boxing-Coaching-Handbook-Part-1_v8-002.pdf), straight punches, pp. 73–75.
- [England Boxing Level 2 handbook](https://www.englandboxing.org/wp-content/uploads/2022/03/Level-2-Coaching-Handbook-compressed.pdf), punch mechanics and bent-arm punches, pp. 80–83.

The reference principles are floor-driven movement, coordinated hip/trunk rotation,
straight wrists, late pronation for straight punches, a protected chin and prompt
guard recovery. Hooks use a bent-arm arc; uppercuts use upward leg/hip drive.
Hook palm orientation varies with range: this demo uses a palm-down head hook.

## Implementation and evidence

| Region | Correction | Verification |
| --- | --- | --- |
| Gloves and wrists | Build a full anatomical frame from forearm and palm axes; roll about the forearm. Guard palms face inward, straight/hook contact palms face down, uppercut palms face the boxer. | Sample actual glove transforms at 611 points per action; verify wrist alignment and bounded frame rotation. |
| Elbows | Straight punch endpoint derives from current shoulder and arm reach, retaining a small bend. Hook bend poles blend from guard; uppercut elbows stay under the hand. | Reachability and continuity checks, plus contact orientation. |
| Shoulders | Small strike-linked elevation and forward displacement. | Existing skinning and shadow invariants. |
| Head | Counter-rotate torso yaw, retain chin tuck and forward gaze. | Forward gaze checked throughout every action. |
| Hips/trunk | Hip drive precedes torso and hand; modest lateral shifts for bent-arm punches. | Guard recovery and reachable limb constraints. |
| Legs | Uppercut dip releases into the upward strike; knee direction follows foot pivot. | Uppercut pelvis rises from loading to contact. |
| Feet | Ball-of-foot pivot, planted contact during punches, ordered steps with smoothly introduced knee bend. | Foot contact, ankle reachability and cycle recovery. |

These are authored animation approximations. Tests establish geometric constraints,
not coaching certification, dynamic balance or exact human biomechanics. The cloud
browser cannot initialize WebGL, so rendered-motion inspection remains unverified.
Uploaded GLB animation clips are independent and are not rewritten by these changes.

## Follow-up: range and punch readability

Straight punches now reach a measured elbow angle above 170 degrees while retaining
a small bend. Shoulder protraction and torso rotation contribute to that reach.
Uppercuts have separate preparation, upward drive and direct guard recovery phases:
the pelvis lowers 8 cm and the wrist rises more than 38 cm from the low position.
Hooks sweep across a horizontal arc with a bent elbow and return directly to guard.
These distances are animation choices for this model, not prescriptions from the
handbooks. New regression checks measure extension, monotonic leg/hand rise,
recovery without a second scoop, horizontal hook travel and elbow angle.

## Follow-up: committed exercise repetitions

[Boxing Canada, Instruction Beginners Reference Manual (2024)](https://boxingcanada.org/wp-content/uploads/2025/01/Instruction-Beginners-Reference-Manual-EN.pdf),
pp. 49–52 and 57, describes hip/shoulder initiation before arm extension, rear-leg
drive for the cross, forward transfer and quick recovery. This iteration increases
controlled pelvis transfer, distributes torso rotation through spine and chest,
and adds striking-shoulder protraction with opposite-shoulder retraction. Punch
delivery accelerates before full reach; the glove recoils before the torso settles.
The jab retains a smaller pivot than the cross. Limb lengths remain unchanged.
Tests check shoulder-driven reach, body-before-arm sequencing, foot participation
and recovery to guard. Forward pelvis placement is a geometric balance proxy;
this is still not a force-based balance simulation or measured motion capture.

## Follow-up: articulated body motion and lion anatomy

The [Boxing Scotland defence guidance](https://www.boxingscotlandtoolkit.org/session-delivery/defence-use-trunk-defence-if-no-use-of-lower-body-etc/)
describes knee flexion, torso rotation and lateral transfer for slips and rolls.
The [Dinu and Louis study](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2020.598861/full)
reports distinct segment contributions for crosses, hooks and uppercuts. Neither
source specifies this model's joint angles: the animation parameters are authored.

| Technique | New articulation |
| --- | --- |
| Jab | Small thoracic side bend while the shoulder drives forward; rear glove follows the cheek. |
| Cross | Pelvis and torso roll combine with distributed back rotation; opposite guard tracks the head. |
| Both hooks | Foot pivot, pelvis roll, chest turn and slight torso pitch support the horizontal arm arc. |
| Both uppercuts | Load over the punching side with lowered shoulder, flexed knees, lateral pelvis transfer and a tilted/turned trunk; unwind upward across the body, counter-adjusting the head to retain gaze. |
| Slip | Knee bend, rearward/lateral transfer and trunk rotation/tilt move the head off line. |
| Roll | Knee lowering accompanies lateral transfer, pelvis and thoracic rotation, and a compact moving guard. |
| Footwork | Pelvis shifts and rolls toward support while the torso counterbalances ordered steps. |

Added continuous rest-surface contours for chest, abdomen, obliques and shoulder
blades, a lighter chest bib and darker back, eyelid/brow details, ear backs and glove
seams. Mane hair roots now cover the full rear ellipsoid instead of a cylindrical
ring that exposed the back of the skull.

Geometry QA is available without WebGL:

```sh
node qa/render-model.cjs /tmp/poses.json
python3 qa/render-model.py /tmp/poses.json /tmp/poses.png
# Optional third argument selects any technique for three phase snapshots:
node qa/render-model.cjs /tmp/uppercut.json uppercut
```

This CPU diagnostic applies the same dual-quaternion deformation to actual scene
triangles. It uses simple flat lighting and painter sorting; it does not reproduce
browser textures, shadows, antialiasing or all occlusion. Front/rear morphology and
uppercut load/contact poses were inspected this way. Live WebGL remains unverified.
Regression checks additionally cover loading-shoulder asymmetry, lateral head travel,
torso unwinding, cheek-following guard and hair coverage at the rear skull.
