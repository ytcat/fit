# Brick — authored anatomy study, revision 2

**WIP art candidate; not owner-approved, integrated, or a reference match.** The owner's six photo references were unavailable. This original study follows the written brief; technical delivery checks do not establish the requested realism or complete GOTR-0082's game-camera acceptance.

The main coat, chin and hanging upper lips form one continuous authored surface with a real mouth opening. An oral lining starts on its exact cut boundaries. Separate anatomical meshes supply the nose, eyes, folded ears, gums, teeth and tongue. These are scripted contour surfaces authored in offline Blender, not a runtime primitive assembly or an imported model. The packed `.blend`, self-contained `.glb`, original textures and deterministic authoring script are included.

Revision 2 replaces the broad exposed tooth strip and disconnected-looking lower jaw with a narrow neutral bite, deeper connected chin, downturned upper lips, reduced muzzle depth and a continuous oral lining. The lower lip, two canines and small incisor tips remain visible in the neutral bite. White pigment is concentrated on the muzzle and throat; genuine CPU Cycles geometry AO is baked into the coat colour. The original inherited renders are preserved in `qa/character-art/brick/before-anatomy-revision/` for direct comparison.

## Attachment contract

- Metres, **+Y up, +Z nose, +X character-left**, positive scale. Origin is the skull/neck rotation axis. Actual r128 bounds: 0.6619 × 0.5800 × 0.4909 m. Crown Y=0.370; collar Y=-0.210. The open lower ring is approximately 0.45 m wide and must tuck inside the body's broad neck.
- Exactly eleven bones: root `Brick_Head`; direct children `Brick_Jaw`, `Brick_Brow_L/R`, `Brick_Jowl_L/R`, `Brick_Dewlap`, `Brick_Ear_L/R`, `Brick_Lid_U_L/R`.
- Jaw rotation uses **local +X**, 0–0.32 rad (18.3°). Lower teeth, gum and tongue follow it; the connected chin blends into the cheeks/throat. Upper teeth, nose and eyes remain on the head. Upper-lip jaw weights use the original surface coordinate so the hanging lip does not accidentally acquire jaw weight.
- Convert head/world spring translation into parent-bone local space. Bone rest Y points along delivery -Z; local position.y is not world vertical. See the review harness. Nominal jowl/dewlap travel ≤0.015 m; captures stress 0.030 m downward. Brows: 0.015 m down; ears: local Z 0.22 rad; lids: local X 0.80 rad.
- `Brick_Eye_L/R` are separate meshes with origins at globe centres. Keep their head binding when aiming. Character-left carries the patch, scar and gold-coloured canine; the game root mirror swaps its apparent side as accepted in the brief.
- No morph targets or animation clips. This delivers facial bones, not a tuned spring system.

## Budgets and verification

38,456 triangles; five PBR materials; 3,430,940-byte GLB. Colour and roughness maps: 768²; coat normal: 512². No required glTF extensions or external image files. AO is baked in the neutral pose; animated contact shading still depends on the runtime renderer.

Static audit reads the actual GLB independently of the manifest. Actual bundled Three r128 loading and all ten individual bone poses passed: finite bounds, nonzero intended movement, positive scales, normalized weights, jaw-held lower teeth, fixed eyes/nose on jaw opening, and 130 matched mouth-boundary vertices. Maximum measured mouth seam separation: 0 m. Browser errors/warnings: 0/0.

```sh
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_brick_head_sculpt.py
python qa/character-art/brick/validate.py
python -m http.server 8143
# separate terminal; local Playwright at /tmp/fit-tools/node_modules
node qa/character-art/brick/capture.cjs
```

Blender 4.3.2, CPU, two threads, 32-sample AO bake, denoising disabled. The build regenerates unbaked pigment before each AO bake. Captures use system Chromium with SwiftShader. Reports bind evidence to the exported GLB SHA-256.

## Remaining art and integration limits

This still reads as a broad **stylized bulldog study**. The forehead fold pattern, eyelids, rose-ear cartilage, nose-to-muzzle transitions and oral floor remain simplified; the large cheek masses need owner/reference review. The lower oral surfaces can appear flat in a close open-mouth view. The shared enamel material makes the gold canine a gold colour, not a separate metal material. A fully sealed cinematic blink and collision-free combined facial poses are not claimed.

No in-game attachment, gym talk, fight, knockout, 402×690 game-camera acceptance or physical-phone performance test has been performed. No realistic-reference parity or production-readiness claim is made. Claude owns runtime attachment/animation; keep the fallback until owner review and the actual game acceptance tests pass. GOTR-0082 remains open.
