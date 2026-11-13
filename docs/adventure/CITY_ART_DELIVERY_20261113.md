# Gloryland city art — first delivery, 2026-11-13

**Detailed arrival bus and modular station assets, ready for integration review.** This is the first component group, not a completed city or a claimed photorealism score.

Authoring branch: `art/city-components-20261113`. Bus/tool-review commit `0e222ed`; station commit `7d714a9`. Original code/map baseline `b6a19c2424fc179af6d702137c391b8677e25fd9`; concurrent `main` checked at `dab12f682e58f68f1d35398069aa606fe15001fa`. Claude's story changes and active game work were not overwritten, cherry-picked, reset or merged. No game runtime, skeleton, choreography, save data, release version or offline manifest was modified.

## Actual assets and screenshots

| Asset | GLB bytes | Triangles | Mesh nodes | Contents |
|---|---:|---:|---:|---|
| `assets/street/ch01-bus/gloryland-bus.glb` | 2,993,632 | 55,484 | 41 | Formed coachwork with wheel arches, glazing and interior, seats/rails, wipers/mirrors, grilles, lights, registration/destination, separate wheel and door pivots, internal wheel housings and entry steps. |
| `assets/street/ch01-station/gloryland-station.glb` | 6,808,148 | 25,860 | 21 | Shelter, bench, stop/timetable, lamp and attachment marker, bin, road/curb/paving and open drain, six original 1024 px PBR maps. |

Both include editable `.blend` source and reproducible offline build scripts. Station source packs its textures for portability. Each GLB is self-contained, below the existing per-asset 10 MB guideline, and loads with the repository's existing r128 loader. Asset provenance is in [`assets/street/LICENSES.md`](../../assets/street/LICENSES.md).

- [Bus original](../../qa/city-art/bus/baseline-front.png) / [bus candidate, matched camera and light](../../qa/city-art/bus/browser-front.png).
- [Open doors and entry detail](../../qa/city-art/bus/browser-entry.png), [rear](../../qa/city-art/bus/browser-rear.png), [side](../../qa/city-art/bus/browser-side.png), [portrait](../../qa/city-art/bus/browser-portrait.png).
- [Composed arrival kit, day](../../qa/city-art/station-day.png), [night](../../qa/city-art/station-night.png), [night from curb side](../../qa/city-art/station-night-curb.png), [entry](../../qa/city-art/station-entry.png), [portrait](../../qa/city-art/station-portrait.png).

These are actual Three.js screenshots of the exported GLBs, not generated concept art. The viewer is a separate QA page, not the published game. Use its **Original bus** and **Arrival street** switches for review. The night setup is a simple light/shadow prototype; final street lighting and atmospheric art direction remain a separate pass.

## Tools reviewed

See [the free-tool comparison and primary sources](FREE_3D_AUTHORING_REVIEW.md). Recommended workflow: **local Blender authoring + native Geometry Nodes/animation + licensed PBR materials + baked GLB**, then measured integration into the existing runtime. Rigify and Sapling merit isolated character/tree pilots. FreeMoCap is a possible offline capture route with camera footage and cleanup. glTF Transform is useful after art approval if configured for the pinned loader.

Blender 4.3.2 is installed and was used. None of the third-party add-ons was installed; there is no Canva connector here. Poly Haven assets are free, but its official asset-browser add-on is currently sold. BlenderKit has free and paid assets; Rokoko's README/license evidence conflicts and needs clarification. Some vendor websites were blocked; the comparison explicitly identifies unverified current terms. No paid API/service, remote rendering, runtime CDN or imported third-party asset is included in this delivery.

## Validation and performance limits

- `python qa/city-art/validate_glb.py` — **PASS for both**: valid binary structure, finite vertex/animation values, in-range indices, increasing animation times, embedded resources and no required extensions. [Raw results](../../qa/city-art/glb-validation.json).
- `NODE_PATH=/tmp/fit-tools/node_modules node qa/city-art/bus/inspect.cjs` — **PASS**: r128 load, door hinge changes, wheel rotation, tire/ground bounds, multiple views and 393×852 viewer without overflow; zero browser errors. [Raw results](../../qa/city-art/bus/browser-results.json).
- `NODE_PATH=/tmp/fit-tools/node_modules node qa/city-art/station-browser.cjs` — **PASS**: bus and station load together, lamp/light attachment agrees, day/night/entry/portrait captures; zero browser errors or warnings. [Raw results](../../qa/city-art/station-browser.json).
- Authoring Python AST parsing and `node --check` for the viewer/browser harnesses — **PASS**. Production JS and the full game suite were not rerun: production runtime files are unchanged; this is an isolated asset/QA delivery.

Measured in **headless Chromium using SwiftShader software rendering**, not a physical phone or representative desktop GPU. Bus-only default view submitted 109,026 triangles / 78 calls including its shadow pass. Composed bus/station submitted 160,374 triangles / 118 calls in the default day view. Adding the night shadow pass increases submissions. These costs are important integration inputs, not evidence that a populated city meets its phone budget.

The software-rendered bus benchmark recorded median **622.9 ms**, p95 **3367.1 ms** over 30 warm frame intervals. That environment is slow and is **not** a mobile performance result. Real iPhone/Android FPS, startup/texture memory costs in the complete game, sustained play and thermals are **NOT VERIFIED**. No 30/60 FPS claim is made.

The bus has optional `KHR_materials_emissive_strength`; r128 uses its standard emissive fallback, as pictured. The station requires no glTF extension. Details are in the component READMEs. Glazing, LOD and material/draw-call consolidation must be reviewed in the complete scene before release.

## Next component order / handoff

1. Old Town façade kit: coherent walls and roof geometry, recessed windows/sills/frames, a few interior/window prop variants, drains, brick/plaster wear and original graffiti. Add station-area trees and a detailed parked car.
2. Bruno's gym approach/interior and storeroom: doors, floor, shelving, equipment/chain/lamp props.
3. Market Row: authored stalls/awnings/crates/produce and licensed/rigged civilian/animal walk/carry/shop cycles; Otto's shop and contents.
4. Docks: warehouse kit, roof/trusses, pallets/barrels/cables, lamps and crowd placement.
5. Chapter 2 Junior League components after detailed story beats are specified. The current Chapter 1 script includes market and docks; do not reuse the old chapter split.

Remaining bus/station polish: baked vehicle weathering/material detail, mobile LODs, more varied road wear, scene lighting, passengers/driver, final driving/boarding animation and navigation/collision clearance. The supplied wheel and door clips are asset controls; they do not implement bus physics or story movement.

Claude can integrate the GLBs through the existing `StorySets` layer after review, keeping the generated bus/set as fallback. Use the READMEs' axes, placement and named pivots; preserve the existing game and its maps. This branch is deliberately unmerged and has not been deployed over the live game.
