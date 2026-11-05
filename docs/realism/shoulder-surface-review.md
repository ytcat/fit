# Reported shoulder lump: correction and evidence

**Scope:** the user's rear-view shoulder/armpit defect. The wider lion face/mane realism overhaul is **not complete**. No75/100 aesthetic score, physical-phone benchmark, merge or public deployment is claimed.

## Visible cause and change

The frozen R78 rear view contains a folded strip at the deltoid/trunk transition. Root rotation also rotates a normal into the wrong coordinate frame, exaggerating the brown/black underarm patch. A hard rest-contour branch at `abs(x)=.33` adds another abrupt displacement.

The isolated change:

1. Keeps underarm normals in the same mesh-local frame as the corrective field, including root/fight rotations.
2. Smoothly fades the existing upper-arm contour through its boundary.
3. Adds a compact, offline-baked guard-shoulder correction for **both lion and rabbit**. Masked Taubin relaxation smooths existing connected vertices; no balls, tubes, replacement rig or new anatomical meshes are attached. Delta positions are limited to25 mm, with up to1 micrometre additional quantization error. Correction strength follows each shoulder's rotation relative to the chest and fades smoothly away from the authored guard pose.
4. Applies the same position delta to skin, fur roots/tips and shadow passes. The existing mesh indices, bone lengths, IK, glove axes, contact/scoring logic, modes, audio and controls remain authoritative.

[Matched before/after viewer](../../qa/appearance-v2/review.html): both rear three-quarters, straight rear, hook and uppercut; neutral clay and textured. Its manifest records exact cameras, phases, resolution and source-file hashes. Before is app source`280775eef9cb80903eaf258cb43f7900cd0d61a4`; after is this isolated branch. These are browser/WebGL renders, not generated art.

The shoulder connection reads more smoothly and the turn-dependent dark stain is removed in these views. This does not establish correct anatomy for every possible pose or a realistic completed character. The rest of the body/face still shows faceting, simplified anatomy and other art limitations.

## Reproduction, format and fallback

```sh
node scripts/authoring/export_shoulder_pose.cjs /workspace/lion-realism-evidence/appearance-v2/shoulder-pose.json
python scripts/authoring/build_shoulder_correctives.py /workspace/lion-realism-evidence/appearance-v2/shoulder-pose.json assets/models/shoulder-correctives-v1.json
python3 -m http.server 8080
```

Open`/index.html` or`/qa/appearance-v2/review.html`. `?shoulderSurface=v1` disables the baked pose correction. The normal-space and contour bug fixes remain active. The original controller/model assets are untouched; exact frozen R78 remains in the original checkout. Absent, malformed, mismatched or missing-detail assets fall back to the continuous base mesh. Rest-position FNV32, vertex count, packed lengths, pose quaternions and displacement bounds are checked before applying baked data.

The build uses local Node/Python NumPy/SciPy only, with no downloaded art or new runtime dependency. Positions are quantized to1 micrometre; normals use signed16-bit components and masks8-bit. The1,003,295-byte same-origin JSON contains packed data for22,104 vertices per species. Runtime geometry topology and triangle counts are unchanged.

## Verification

- **34 CPU suites passed**, zero syntax failures. Exact per-suite outcomes: [test summary](../../qa/appearance-v2/test-summary.json). Includes new root-rotation normal regression, real corrected skin positions, all actions, frozen-pose repeatability, unchanged rest mesh/weights/bone lengths and hand trajectories, fur attachment, shadow hook and invalid-asset fallback.
- Existing`tests/browser.cjs` and`tests/browser-r78.cjs` passed at1100×950 and393×852: techniques, camera views, freeze, languages, generated routines, simultaneous uppercuts/contact limits, ring, trusted-tap audio and rendered audio samples.
- Dedicated WebGL2 and forced WebGL1 checks passed all actions/targets, both species, landscape, linked shaders and four fallback paths. [Browser record](../../qa/appearance-v2/browser-shoulders.json). A phone-sized Chromium viewport/UA is not Safari or a physical phone.
- Actual compiled r128 color/depth vertex programs were compared against CPU`skinPoint` with WebGL2 transform feedback,259 sampled vertices per pose, guard/root turns/jab/uppercut. [GPU comparison](../../qa/appearance-v2/gpu-positions.json). This exercises the full actual vertex position pipeline, not a separately rewritten approximation.
- Full raw evidence/logs: `/workspace/lion-realism-evidence/appearance-v2/`.

## Costs and limits

On Chromium155, Linux, ANGLE SwiftShader:13 body geometry attributes, at most12 active linked attributes in the checked programs (device maximum16). The new correction adds **zero meshes/triangles/draw calls**, two static attributes to body/coat and a small frame/weight uniform update. Added typed geometry storage: lion5,740,064 / rabbit6,290,368 bytes at desktop coat density; compact profile lion4,438,112 / rabbit4,535,392 bytes. These are geometry buffers, not total driver GPU memory.

A1000-call update microbenchmark measured approximately0.002–0.003 ms/call on this cloud CPU; it is not whole-frame cost, mobile FPS or GPU timing. Complete scene renderer records are included in the browser JSON. Draw-call totals there describe its quality/shadow state and must not be compared directly to M0 all-pass totals. No phone thermal/sustained30 FPS or desktop hardware60 FPS claim is made.

Only one guard corrective is baked; extrapolation is deliberately faded out. Full striking extensions therefore retain the original skinning/field behavior. Further anatomy and face/mane work remain separate, reviewable milestones. Physical iPhone Safari/Android and long-session performance remain unverified.

## Review artifact and branch

`/workspace/shadowbox-shoulder-review.html` is a self-contained **shoulder-fix review app**, not a completed realism release. Rebuild with`node scripts/authoring/package_review.cjs`. It embeds the local scripts/styles/model/audio assets and makes no runtime HTTP asset requests. A trusted tap initializes the ten audio samples. The managed Chromium policy blocks direct`file://` navigation, so this artifact was verified over local HTTP; direct-file behavior on physical phones is unverified.

Development branch:`feature/lion-authored-appearance-v2` in`/workspace/fit-appearance-v2`. Other checkouts and earlier experiments have not been overwritten. No changes were pushed, merged or published.
