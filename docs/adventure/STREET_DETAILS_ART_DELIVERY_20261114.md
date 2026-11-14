# Old Town car and trees — review delivery, 2026-11-14

Art branch `art/city-components-20261113`; follows frozen city batch `8fe3600`. Latest main inspected: `827371e`. Claude already integrated the earlier bus/station/buildings in GOTR-0089. This batch changes assets and isolated QA only; no production game code or main merge.

## Assets

|Asset|GLB bytes|Triangles|Browser materials|Behavior|
|---|---:|---:|---:|---|
|[Compact car](../../assets/street/ch01-car/README.md)|1,517,124|44,076|9|Parked; named steering/wheel pivots, no driving simulation|
|[Tree detailed](../../assets/street/ch01-trees/README.md)|3,256,092|41,136|5|Three-bone Breeze clip|
|Tree reduced detail|2,104,620|19,618|5|Same trunk origin, separate GLB selection|

Packed `.blend` sources, manifests, deterministic offline build scripts and original texture provenance included. No new runtime dependency, paid service, external asset or required glTF extension.

## Actual browser evidence

[Street day](../../qa/city-art/details-street-day.png) · [night](../../qa/city-art/details-street-night.png) · [portrait](../../qa/city-art/details-portrait.png) · [car front](../../qa/city-art/car-front.png) · [rear](../../qa/city-art/car-rear.png) · [side](../../qa/city-art/car-side.png) · [cabin](../../qa/city-art/car-cabin.png) · [tree detailed](../../qa/city-art/tree-hero.png) · [breeze pose](../../qa/city-art/tree-breeze.png) · [tree reduced](../../qa/city-art/tree-low.png).

Captured from actual GLBs with bundled Three.js r128, Chromium/SwiftShader, 1100×800 and 393×852. These are not generated concept pictures. The phone viewport is not a physical-phone test.

Commands, from repository root:

```sh
python qa/city-art/validate_glb.py
# Serve this root on port 8142 in a separate terminal:
python -m http.server 8142
# Playwright must be installed; this workspace uses NODE_PATH=/tmp/fit-tools/node_modules
node qa/city-art/details-browser.cjs
```

Structural validation passes all six city GLBs. Browser assertions pass: real wheel apertures with tires and upper fenders, side-window opening with inset glass, independent skeletons in cloned trees, reduced-detail triangle reduction. Across 1,610 sampled skinned vertices, root displacement and loop error were zero; sampled crown movement was 54.75 mm. Browser exported clip duration is 4.0417 s (Blender frame endpoint convention); use the loaded clip duration, not a hard-coded four-second reset. No browser errors or warnings. Source tree QA also finds one connected closed woody component per detail level.

Day composition submits 534,702 triangles / 243 draw calls including shadow passes; night capture shows 732,402 / 301. These counts include the bus, station and buildings, not just the new assets. Software screenshot readback initially timed out at 30 seconds; removing redundant draws and using a 90-second capture timeout produced the full evidence set. No useful device FPS claim follows from this software renderer. Physical-phone FPS, memory, sustained heat and actual game loading remain **NOT VERIFIED**.

## Integration and remaining visual limits

Car: metres, Y-up, +X forward, .298 m tire radius and 2.45 m wheelbase. Place on road surface; prototype road is at Y=-.15. Use positive scales and Y rotation to match traffic. Real cabin, lamps, reflectors, mirrors, complete rims and panel seams are included. Appearance is a clean older compact, with limited weathering and modest paint reflections; not photorealistic.

Trees: Y-up, root/soil at paving plane, about 6.3 m tall; allow an opening around the soil/root bed. Reuse geometry/materials but clone bone hierarchies independently. Opaque double-sided leaves avoid blended foliage layers. A sparse tiered young-tree crown remains visible, especially at the top. Use reduced detail for repeated background trees after measuring the complete game scene. Automatic LOD and collision are not installed. Pause mixers when hidden. The isolated viewer offers detail selection and a breeze toggle.

Use the existing same-origin optional loader/fallback path. Do not merge the old art branch wholesale over newer story code or backlog; adopt the new asset paths and append the delivery note. City coverage remains incomplete: market stalls, shops, populated streets and later chapters still need authored passes. Facial assets are owned by the separate Brick worktree. No claim that this delivery finishes GOTR-0066.
