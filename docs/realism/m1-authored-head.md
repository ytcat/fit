# M1 proposal: authored lion head, existing game and rig

**Decision:** change the appearance-authoring approach. Stop extending the unaccepted procedural face trials. Use free local **Blender 4.3.2** to author a coherent head/ears/muzzle and fitted neck transition, then validate it inside the existing Three.js r128 app. Do not replace the body, skeleton or complete character with another GLB. The approved target reference is still missing; this handoff establishes the workflow, not the sculpt or aesthetic acceptance.

## Completed authoring preparation

`scripts/authoring/export_runtime_head.cjs` extracts the exact **runtime-refined rest geometry**, rather than approximating it from raw baked JSON. It checks the frozen application hashes, then emits head-local positions/normals/UVs, original source vertex IDs, existing joint names/rest transforms and skin weights. A locked body reference is included. The threshold selection is a diagnostic cut, not a validated final neck seam.

`scripts/authoring/prepare_head_scene.py` creates a reproducible Blender scene with locked references, existing-joint orientation guides, the baseline head working copy, diagnostic boundary-lock group and five **empty** authoring shape-key slots. These slots contain no finished expressions. A disabled subdivision modifier is a tool for subsequent authoring, not an appearance improvement. No imported character, generated reference or licensed third-party art is used.

The round-trip GLB contains only unchanged baseline geometry and test metadata. It is **not installed into the app**, and is not advertised as the new lion. Export is uncompressed; the optional unavailable Draco library is not a dependency. Blender is an offline tool, not a deployed runtime requirement. Output is derived from repository geometry; Blender's tool license does not itself impose that license on generated art. Any future imported references/assets require their own provenance review.

Generated working assets stay outside the app:

- `/workspace/lion-realism-evidence/authoring-75/lion-head-authoring-template.blend`
- `/workspace/lion-realism-evidence/authoring-75/runtime-head.json`
- `/workspace/lion-realism-evidence/authoring-75/baseline-head-roundtrip.glb`
- `/workspace/lion-realism-evidence/authoring-75/roundtrip-check.json`

Rebuild from this isolated worktree:

```sh
node scripts/authoring/export_runtime_head.cjs /workspace/lion-realism-evidence/authoring-75/runtime-head.json
blender --background --factory-startup --python scripts/authoring/prepare_head_scene.py -- /workspace/lion-realism-evidence/authoring-75/runtime-head.json /workspace/lion-realism-evidence/authoring-75
NODE_PATH=/tmp/fit-tools/node_modules node qa/realism/roundtrip.cjs
```

Blender4.3.2, Node24 and Playwright1.51.1/system Chromium are authoring/QA tools; no new game dependencies. Default output directory may be overridden with `AUTHORING_OUT` for browser QA.

## Verified interchange result

Chromium155 / r128 loaded and drew the GLB in a separate QA scene: **41,233 triangles, one draw call**, 20,762 exported vertices after UV/normal splitting. All **20,710 source IDs** were recovered; maximum head-local position error was **2.421438694e-8 metres**. Five empty position/normal morph slots loaded, all linked shader programs reported success, and no page/shader errors were recorded. The new head program used10 active attributes on a16-attribute WebGL2 context. This is an unskinned baseline check: new sculpt normals, nonzero morphs, DQ/depth integration, seam deformation and WebGL1/Safari remain unverified.

Machine-readable [round-trip record](../../qa/realism/roundtrip-check.json) and [viewer smoke check](../../qa/realism/review-smoke.json) are included. Viewer tests passed all8 slots, both uppercut phases, desktop/phone-sized layouts, missing-reference/candidate states and weighted-score/incomplete-review behavior.

## Narrow sculpt scope and review

1. Obtain the approved reference board; freeze front, profile and three-quarter proportions. Do not invent approval for a research photograph.
2. Sculpt skull/brow/orbit, nasal bridge, unified whisker-pad/muzzle, jaw/chin and fitted ears as connected primary forms. Inspect bare gray clay without mane. Avoid pasted ellipsoid cheeks or eye globes.
3. Retopologize the critical contours, preserve the original neck boundary, UV unwrap, bake multires detail into initial1K maps, compare2K only if captures justify cost. Albedo/normal/roughness must improve anatomical reading rather than add random speckles. Author inset eyes/lids, nose leather/nostrils and mouth cavity as fitted secondary surfaces.
4. Create real blink, squint, jaw-open, snarl and pain deltas with stationary boundary vertices, safe tooth/lid margins and no eye popping. Empty template keys must not be mistaken for finished expressions.
5. Return to the actual game renderer for front/profile/both three-quarters, full-body and pose comparisons before proceeding to mane work. If the face remains below3/5, revise sculpt authoring instead of spending effort on lighting.

## Compatibility contract for future integration

Introduce a scoped `LionAppearanceV2` owner with deterministic load, attach, reset and dispose operations. Feature flag **`lionAppearance=v2`** selects the candidate; baseline v1 remains the default and a one-click review fallback. Failure/timeout falls back without breaking the workout. This is a proposal; no such product flag is implemented in this M0 handoff.

- Preserve `LionCoach`, all existing joint names, IK, glove/contact points, choreography, scoring, audio, camera, UI, legacy model/controller pairing and cache-safe asset loading.
- Head-local metre coordinates: existing head origin `[0,1.84,0]` in rest world; runtime X right/Y up/+Z forward. Blender conversion `(x,-z,y)` and Y-up glTF export are explicitly checked. Never export a replacement armature; the template joint empties are references only.
- **Remove the old head's indexed surface only within the validated replacement region.** The original head is part of the body SkinnedMesh; simply attaching a new head leaves overlapping geometry. Keep original lower-body vertices and topology untouched, store reversible original index data and fit a neck adapter to exact seam positions, weights and normals.
- Export source vertex IDs and verify them after the loader: glTF may split/reorder vertices. The diagnostic185-vertex cut boundary is not yet a clean authored seam; inspect and select a single intended neck contour before relying on it.
- Seam rings copy original existing-bone weights and remain unchanged by facial morphs. New face vertices follow the existing head joint; neck transition follows existing head/neck weights using the current DQ/bind-frame conventions. Apply facial deltas before skeletal deformation and matching depth/shadow transforms. Do not assume standard imported glTF skinning reproduces the custom DQ body shader.
- Keep the head a separately owned render component so facial morph attributes do not overflow the body's custom attribute budget. Check actual linked shader variants on r128/WebGL1 and2, including morph normals and maximum vertex attributes; a baseline unskinned round-trip pass is insufficient for the final integration.
- Preserve muzzle/contact landmarks and bruise/hit-side presentation. Expression weights follow existing blink/focus/hit/pain timelines; no invented hits or independent animation clock. Pause freezes expressions, seek/resume resets temporal state. Mane stays baseline until its own accepted milestone.
- Existing short fur/normal/detail logic must respect the new head region; no hidden duplicate coat, unsupported newer shader chunks or rabbit color changes. Corrective normals/depth passes require separate pose evidence.

## Required acceptance evidence

Actual app captures, not Blender beauty renders: matched eight-slot board, bare clay front/profile/three-quarters, neutral and arena lights, mouth open/closed, blinking, left/right head hits, guard, jab/cross extension and recovery, both hooks and uppercuts, slip/roll, equipment and fight. Inspect seam from rear/side, raised shoulders, eye/ear attachment, shadow silhouette and missing-asset fallback.

Run all CPU suites and syntax checks, desktop/portrait/landscape browser workflows, shader compile/error checks, old/new fallback switching and pause/seek. Compare source landmarks, unaffected body vertices, neck boundary, deformation and contact behavior. Shared rabbit/referee behavior must not change silently.

Record new face mesh/material/texture/draw-call costs and P50/P95 update/render/frame times in idle and full fight. Current cloud software rendering is a compatibility environment, not a hardware FPS gate. Physical iPhone Safari and representative Android remain unverified until named devices are tested for sustained performance and heat.

Only after matched evidence and independent rubric review may M1 be accepted and M2 groom work begin. No75/100 claim, merge or publication is authorized by this document. Rollback for this handoff is simply leaving this QA-only branch unused; the active application has not changed.
