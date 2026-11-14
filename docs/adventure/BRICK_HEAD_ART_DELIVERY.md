# Brick head — anatomy study handoff, 2026-11-14

**WIP art candidate, not owner-approved or production-ready.** Isolated branch `art/character-brick-20261113`, originally based on `d884ac1`; no runtime/body/facial-animation code changed and no main publication. The six owner photos were unavailable, so no likeness or realistic-reference parity is claimed.

Delivery: [self-contained GLB](../../assets/characters/brick/brick-head.glb), [editable packed Blender source](../../assets/characters/brick/brick-head.blend), [attachment contract and limitations](../../assets/characters/brick/README.md), original maps/manifest, and reproducible `scripts/authoring/build_brick_head_sculpt.py`.

The anatomical revision connects the chin into the skin, gives the upper lips a downturned hanging boundary, reduces projecting muzzle mass, narrows the neutral bite over the incisor row, and sews a dark oral lining to the exact mouth edges. The lining no longer hangs outside the cheeks. Weighting now distinguishes upper-lip droop from mandibular motion. Geometry AO is baked on the CPU; white pigment is concentrated on muzzle/throat.

| View | Inherited candidate | Revised study |
|---|---|---|
| Front | [before](../../qa/character-art/brick/before-anatomy-revision/front.png) | [after](../../qa/character-art/brick/front.png) |
| Profile | [before](../../qa/character-art/brick/before-anatomy-revision/profile.png) | [after](../../qa/character-art/brick/profile.png) |
| Mouth open | [before](../../qa/character-art/brick/before-anatomy-revision/open.png) | [after](../../qa/character-art/brick/open.png) |

Additional actual-r128 evidence: [three-quarter](../../qa/character-art/brick/threequarter.png), [rear](../../qa/character-art/brick/rear.png), ten bone stress images, [static audit](../../qa/character-art/brick/static-report.json) and [loader/deformation report](../../qa/character-art/brick/r128-report.json).

Technical checks pass: 38,456 triangles, five materials, 3,430,940 bytes, exact eleven bones, positive scale, self-contained textures ≤768 px, no required extensions. r128 bounds 0.6619 × 0.5800 × 0.4909 m; all ten individual bone poses finite and bounded; 130 sewn boundary matches stay within 0 m under deformation. Browser errors/warnings: 0/0. No morph targets supplied.

The technical pass is not a visual acceptance pass. Broad cheek mass, regular forehead folds, simplified ears/lids, nose-to-muzzle transitions and the economical oral floor still need reference/owner review. No fight/talk/camera integration, fully sealed blink, combined-pose collision guarantee or physical-phone result is claimed. GOTR-0082 remains dependent on further art review, Claude's integration, game-camera validation and owner approval.
