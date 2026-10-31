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
