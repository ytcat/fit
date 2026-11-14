# Hazel's fruit stall — Chapter 1 asset delivery

Scope: original authored stall for Chapter 1 beat 6, Mrs. Hazel's market scene (`CHAPTER1_SCRIPT_V2.md`). Latest main inspected `827371e`. Work is isolated on `art/city-components-20261113`; no story, character, collision, interface or production renderer code changed.

[Asset contract / rebuild](../../assets/street/ch01-market/README.md) · [packed Blender source](../../assets/street/ch01-market/hazel-fruit-stall.blend) · [GLB](../../assets/street/ch01-market/hazel-fruit-stall.glb)

Actual r128 renders: [front](../../qa/city-art/market/front.png), [side](../../qa/city-art/market/side.png), [seller side](../../qa/city-art/market/rear.png), [produce](../../qa/city-art/market/produce.png), [scale](../../qa/city-art/market/scale.png), [canopy](../../qa/city-art/market/roof.png), [portrait](../../qa/city-art/market/portrait.png).

The fitted stall has an open seller side, curved fabric canopy, supported eaves, scalloped valance, grain aligned with timber boards, slatted crates, shaped fruit and leaves, price lettering, hollow weighing pan and dial, and a folded paper bag. An initial rear support gap was found in real renders and corrected. Numeric texture synthesis and authored geometry are original, with provenance in `assets/street/LICENSES.md`; no downloaded assets or paid service.

## Measured result

GLB **2,743,044 bytes**, **56,014 triangles**, 21 exported mesh nodes / 22 r128 mesh primitives, **15 browser material instances**. Envelope 3.0032 × 2.6810 × 1.8513 m (width, height, depth); metre units, Y-up, +Z customer side. Three original maps embedded; no required extensions.

`python qa/city-art/validate_glb.py`: seven assets PASS (structural, finite vertex/index data, embedded resources). `NODE_PATH=/tmp/fit-tools/node_modules node qa/city-art/market/capture.cjs`: actual local r128 GLB loads, positive mesh scales, seven view captures including 393×852 portrait, **zero page/console errors and warnings**. Source generated with `blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_market_stall.py` (Blender 4.3.2). `node --check qa/city-art/market/capture.cjs` and `git diff --check` pass. Production test suite was not rerun because no production code changed.

The front diagnostic render's `renderer.info.render` snapshot is 23 calls / 56,016 submitted triangles including its floor. This is a renderer snapshot, not a separate full shadow-pass cost measurement. QA uses Chromium SwiftShader, 1000×850, one 1024 directional shadow map and a locally generated neutral studio reflection environment; no FPS or hardware claim. No actual game-market loading, physical-phone performance or thermal test has been completed.

## Adoption and limits

Claude should load this optional asset through the current same-origin city-asset fallback mechanism, position it outside the fight/crowd clearance and reserve seller space behind the counter. It is a static environment prop: no live scale, pickable produce, collision, cloth wind or NPC attachment is implemented. Character heads and bodies remain separately owned.

This is a more detailed game-art candidate, not photorealism: produce spacing is still regular, canvas/wear are restrained and a full market requires surrounding stalls, ground dressing, shops and populated story scenes. Do not represent this asset as the completed market or GOTR-0066. Source and QA viewers may be adopted separately; never replace newer production files or the current backlog with this older branch's copies.
