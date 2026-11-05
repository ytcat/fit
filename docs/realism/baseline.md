# Lion realism: frozen baseline and authoring handoff

**Status: M0 engineering evidence assembled; approved-reference gate pending. M1 appearance not accepted or integrated.** The user's 2026-11-05 inline *Lion Boxer — 75% Visual-Realism Target* is the review contract. That named plan file was not present in the checkout. The initial ~25/100 is the user's subjective estimate, not a measured baseline rating. No 75/100 result is claimed.

## Isolation and source

- Frozen app source: `280775eef9cb80903eaf258cb43f7900cd0d61a4` (R78).
- QA baseline commit: `a07fc04c7d0c82d5657f6bed7dd4650f4023a020`; application source unchanged.
- Current handoff branch: `review/lion-75-authoring-20261105`, isolated worktree `/workspace/fit-lion-authoring`.
- Previous unfinished procedural trials remain in `/workspace/fit-realism-m1` on their existing branch; they are not an accepted M1. No edits to that worktree are part of this handoff.
- Remote main and other advertised branches were inspected. External branch ownership cannot be established from Git alone; no claim of external-agent coordination is made. No merge, push or publication is included.

Fourteen source/asset SHA-256 hashes and ordered script dependencies are frozen in [baseline.json](../../qa/lion-realism-m0/baseline.json). The authoring export checks these hashes before reading runtime geometry. Old controller/model pairs and all game files remain unchanged.

## Actual rendered comparison evidence

Open the [eight-slot comparison viewer](../../qa/realism/review.html) via a local HTTP server. Its [manifest](../../qa/realism/baseline-manifest.json) records source SHA, camera, light/material preset, move, phase, canvas resolution and image hash. Eight slots contain nine PNGs because uppercut has load and nominal-strike frames. A nominal strike pose is not a registered collision.

The compact set is copied without alteration from 196 verified browser/WebGL captures. The broader set includes front, both profiles and three-quarters, rear, clay and textured, face/eye/muzzle, shoulders, gloves, boots, expressions and punch phases. Sixteen compositor screenshots were verified against WebGL readback. Motion evidence is a sparse software-rendered VP9 sequence; it is not proof of fluid animation.

Full evidence and raw metrics: `/workspace/lion-realism-evidence/280775e/`. Portable archive: `/workspace/lion-realism-evidence/r78-lion-m0-280775e.tar.gz`. The [full M0 report](../../qa/lion-realism-m0/REPORT.md) documents methodology, exclusions and limitations. No generated concept image is presented as an in-game result.

**Reference gap:** only existing app screenshots are available here. No approved photorealistic lion sheet was found in the repository or conversation attachments. Research photographs are not approved references and are not distributed. The reference pane is explicitly empty. The facial proportions/hairline cannot be calibrated to the approved target until that board is accessible. Candidate pane and reviewer scores remain empty too.

## Measured architecture and costs

The lion combines baked JSON, runtime anatomical refinements, custom DQ/linear skinning, IK, procedural face, mane and short coat. It is not a conventional default GLB. Bundled Three.js is r128. The full M0 audit covers `onBeforeCompile`, shader/depth variants, local asset loading, legacy pairing and cache behavior.

| Frozen desktop lion / scene | Measurement |
|---|---:|
| Lion visible triangles, before shadow resubmission | 561,257 |
| Runtime body vertices / triangles | 121,804 / 243,664 |
| Shorts triangles | 75,346 |
| Each glove triangles | 32,228 |
| Mane vertices / triangles | 57,294 / 19,098 |
| Short coat triangles desktop / phone profile | 19,191 / 5,629 |
| Lion meshes / visible meshes / geometries | 163 / 158 / 162 |
| Lion materials, including depth variants / textures | 38 / 8 |
| Lion typed geometry storage | 58,383,692 bytes |
| Estimated lion RGBA8 texture memory, including mip chains | 4.63 MB |
| Idle scene calls / submitted triangles, including shadows | 318 / 1.12 million |
| Full fight calls / submitted triangles, including shadows | 943 / 2.58 million |
| Fight low/shadows-off calls / submitted triangles | 526 / 1.30 million |
| Full fight geometry arrays / estimated texture memory | 120.8 MB / 15.55 MB |

Counts come from renderer/geometry inventory, not asset file size. Texture estimates are not driver GPU-memory measurements. A head-only asset does not automatically solve these broader costs.

Mane motion currently rewrites 687,528 position bytes per update; mane-off ablation removed those uploads without proving throughput improvement on the software renderer. Thus no speculative LOD/instancing optimization is included here.

## Timing and device limits

Recorded profiles: Chromium 155, Linux, ANGLE Vulkan **SwiftShader software rendering**, desktop 1100×950 DPR1 and phone-sized 393×852 touch profile DPR2 (render cap1.5), 12 scenarios; 5 warmup and 30 recorded frames each. Raw P50/P95 rows, update/submission costs, heap, startup and resource inventories are in the linked M0 report/data. No GPU timer extension was available.

Representative median total coach update: idle ~1 ms, heavy training ~34 ms, fight ~22.8 ms. Software-renderer RAF intervals around 1,316 ms idle / 3,000 ms fight are **not physical-device FPS**. Render CPU submission (~2 / ~5 ms) is not completed GPU work. Initial three-model JSON load is ~17.13 MB uncompressed; measured constructor ~2.07 s desktop / ~2.31 s phone-sized profile. First model draw is distinct from first displayed frame.

**NOT VERIFIED ON PHYSICAL PHONE:** iPhone Safari, Android, sustained 30 FPS, thermal throttling, GPU memory, long rounds or desktop hardware 60 FPS. These release gates cannot be passed with viewport emulation or SwiftShader. Named hardware and sustained timing remain required.

## Regression status

On the frozen app, all **32 CPU suites** and app/vendor JS syntax checks passed. `tests/browser.cjs` and `tests/browser-r78.cjs` exited zero at desktop and phone-sized profiles. Exact commands, logs and per-suite outcomes are recorded in [test-summary.json](../../qa/lion-realism-m0/test-summary.json) and the full report. These are reused because the application hashes are unchanged; they are not described as fresh tests of a new sculpt.

The new Blender interchange/browser check is documented in [M1 authoring proposal](m1-authored-head.md). It verifies only compatibility and coordinate fidelity, not new anatomy, neck seams, dynamic expressions, mobile performance or a completed appearance.

## Aesthetic review

Use [score-sheet.csv](score-sheet.csv) or the viewer. Seven weighted categories total100; three independent complete reviews are needed for a median. No ratings have been invented. Final aesthetic approval belongs to the user. The absent approved reference prevents a defensible comparison score; failed procedural face trials are not promoted by passing code tests.

Next bounded work is an offline-authored head/neck and a constrained integration layer, detailed in the proposal. All other characters and objects remain in overall scope, but their appearance is unchanged by M0.
