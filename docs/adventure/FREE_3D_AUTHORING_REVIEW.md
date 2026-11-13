# Free tools for Gloryland's city assets and animation

Reviewed 2026-11-13 against the paused `main` snapshot `b6a19c2424fc179af6d702137c391b8677e25fd9`. This is an asset-authoring recommendation, not a runtime replacement or permission to integrate unfinished Claude branches.

## Recommendation

Use **local Blender → baked, optimized GLB → the existing same-origin Three.js r128 loader**. Blender 4.3.2 is installed in this environment and is being used to author the Chapter 1 bus. Model the forms properly, use real surface detail and sensible materials, and inspect animations in the actual browser. A connector alone does not improve art or motion quality.

Canva was requested, but no Canva tools are exposed in this session. Its checked-in map references can guide palette, composition and placement; a 2D design is not a rigged, collision-ready 3D asset. No Canva session or external design has been accessed. None of the reviewed third-party add-ons has been installed in this task.

## Tool decisions

| Tool | Cost/license evidence | Best use here | Decision and limits |
|---|---|---|---|
| **Blender + Geometry Nodes + glTF exporter** | Free; Blender's official GPL notice inspected. Installed 4.3.2. | Authored buses/cars/buildings, modular windows and roof details, baked door/wheel animations, offline cloth and secondary motion. | **Use now.** CPU authoring and rendering work here. Export meshes and sampled animation; node graphs, constraints and arbitrary Blender shaders do not run in Three.js. |
| **Rigify** | Official source identifies GPL-2.0-or-later. | Control rigs for future street characters: walking, carrying shopping, sitting, turning, gesturing. | **Recommended for an isolated character pilot.** Fit the metarig to each anatomy, clean deformation, bake to deform bones. Do not replace the current custom boxer skeleton. Not installed or export-tested here. |
| **Sapling Tree Gen** | Official source identifies GPL-2.0-or-later. | Organic trunk/branch structure with varied growth; a starting point for Old Town trees. | **Recommended for a tree pilot.** Needs current-Blender compatibility check, authored leaf clusters, LOD and wind weights. It does not supply a finished mobile tree or browser wind automatically. |
| **Poly Haven assets** | Official add-on README explicitly says its assets are free; Poly Haven is known for CC0 assets. Live license page blocked here; retain the actual asset license when downloading. | Scanned brick, plaster, asphalt, wood, metal and HDRIs; stronger realism gain than adding polygons to flat materials. | **Use individual verified assets when accessible.** The official **asset-browser add-on is currently sold**, per its README: do not treat it as a free requirement. Manual asset download/import avoids it. No assets imported yet. |
| **ambientCG** | Known CC0 material library; current license page blocked here. | Road, paving and wall PBR texture sets. | **Candidate, pending per-asset license/source retrieval.** Download and package locally; no runtime network calls. Not installed or imported. |
| **BlenderKit / Blendkit add-on** | Inspected GPL license and official README: free open-source add-on, a selection of free assets, larger paid catalog. | Find individual props/materials where their shape and license fit the map. | **Optional only.** Free add-on does not mean every model is free or freely redistributable. Check the selected asset's license for inclusion in a downloadable browser game. |
| **Rokoko Studio Live / retargeting add-on** | Official README advertises retargeting. It labels itself MIT, but the fetched `LICENSE.md` contains LGPLv3: inconsistent evidence. | Retarget already licensed motion to an authored street-character rig. | **Hold until license/version clarified.** A free connector does not guarantee free capture, Studio export or streaming. No suit or subscription required for our baseline workflow. |
| **FreeMoCap** | Official source license AGPLv3; README documents a CPU-only install option. | Offline capture of real walking, weight transfers and everyday actions from calibrated camera footage. | **Later pilot if suitable footage/cameras are available.** Requires recording, calibration, processing and cleanup; no usable capture footage was supplied here. Keep its software offline, inspect output/data terms separately. Not real-time game infrastructure. |
| **Mixamo** | Proprietary Adobe service, historically free with an Adobe account; current FAQ inaccessible here. | Possible licensed humanoid walk/idle reference clips. | **Not a dependency.** Current terms need verification; automatic humanoid retargeting does not solve lion/rabbit anatomy, paws, facial acting or boxing contact. No account action performed. |
| **Blender MCP** | Inspected MIT license and current README. Local Blender control plus optional hosted/premium generation integrations. | Interactive scene inspection and authoring automation in a client that supports its connector. | **Not needed here:** direct local Blender Python already works. No connector exposed in this session. Do not enable paid generators or assume an MCP-created model is realistic. Review telemetry and local socket settings before any installation. |
| **glTF Transform** | Official MIT license inspected. | Offline mesh/material deduplication, texture resizing, animation cleanup and size inspection. | **Recommended after art approval.** Do not blindly use its default optimization preset: Draco, Meshopt, WebP or KTX2 require compatible local loaders/decoders and testing against r128. Initial bus uses ordinary GLB without required compression extensions. |

Software license and exported-asset license are different questions. GPL authoring tools do not automatically make an original artwork GPL; imported meshes, motion clips and textures still need their own recorded redistribution terms. No paid service, subscription, runtime AI model or external CDN is part of the proposed path.

## How this improves the actual city

1. **Hard-surface assets:** reference proportions → continuous body surfaces/openings → real panel thickness, seams, glazing and fitted interior → authored UVs and PBR textures → game LODs. The bus must have clear door/step space and wheels that rotate from distance travelled, not a decorative wheel loop unrelated to motion.
2. **Buildings:** a reusable structural kit with real window recesses, lintels, sills, cornices, drains, varied roofs and occasional balcony/interior modules. Brick/plaster damage belongs in geometry where it changes silhouette, and in baked maps elsewhere. Graffiti is locally packed original artwork or licensed decals. Shared atlases keep draw calls under control.
3. **Trees:** organic branch structure and deliberately arranged leaf clusters, then bounded wind with roots fixed. Validate silhouette and alpha overdraw in the complete street, not one isolated tree.
4. **Street life:** separate background-character rigs; idle/walk/turn/carry/shop clips with foot plants, stride matching, gaze and hand-object contact. Blend clips at compatible phases and vary schedules. Use facial morphs for nearby characters. Do not randomize each limb independently or reuse boxing guard as civilian idle.
5. **Night:** emissive lamp/window meshes plus a small number of actual lights and tested shadow casters. Emissive material alone does not illuminate the street. Bake static lighting where practical; preserve one coherent light direction per source. Keep night readability without filling every window with a shadow-casting point light.
6. **Browser acceptance:** load with the repository's r128 `GLTFLoader`, check material/animation compatibility, door sweep, feet/wheels on the ground, bounds, texture memory, draw calls and frame-time distributions. CPU Blender previews prove asset appearance only; they do not prove mobile game performance.

## Story order and ownership

`CHAPTER1_SCRIPT_V2.md` supersedes the older chapter split: Chapter 1 now includes arrival, gym, market, Otto's shop and the docks. Chapter 2 is the Junior League outline. Follow the existing map geography; do not renumber or relocate districts to match the old chapter list.

| Order | Component group | Animation/detail priority |
|---|---|---|
| 1 | Arrival bus, station shelter, curb and road | Detailed vehicle; doors, steering/wheels, steps, arrival and departure; coherent morning shadows. Bus asset pilot started in this branch. |
| 2 | Gym approach and Old Town façades | Recessed windows, terracotta roofs, downpipes, shop glazing, brick/plaster wear, benches, streetlights and trees. |
| 3 | Bruno's gym and storeroom | Doors, lamps, worn floor, racks, bags/chains and usable dressing/storage props. Keep fighter contact logic owned by the game. |
| 4 | Market Row | Fruit/vegetable stalls, fabric awnings, crates, baskets, scale, bags and circulating/carrying/shopping characters. |
| 5 | Otto's equipment shop | Display glazing, shelving, bag stock, counter and shopkeeper's handling gestures. |
| 6 | Night docks/warehouse | Corrugated roofs, doors, trusses, pallets, barrels, cables, hanging lamps and crowd behavior. |
| 7 | Chapter 2 Junior League | Professional equipment and arena/interior kit; await detailed beat list before inventing new locations or plot. |

Codex authors isolated assets, manifests and render evidence. Claude integrates through `StorySets.build()` and story choreography after review. Existing map, game scripts, rig, physics, save data and release version remain untouched by this asset milestone.

## Primary sources checked

Retrieved 2026-11-13. Where a vendor page was blocked, that is explicitly noted above; no claim of checking its current pricing/terms is made.

- [Blender GPL notice](https://github.com/blender/blender/blob/main/COPYING)
- [Rigify source/license](https://github.com/blender/blender-addons/blob/main/rigify/__init__.py)
- [Sapling source/license](https://github.com/blender/blender-addons/blob/main/add_curve_sapling/__init__.py)
- [Poly Haven add-on README: free assets, paid convenience add-on](https://github.com/Poly-Haven/polyhavenassets)
- [BlenderKit source and free/paid catalog description](https://github.com/BlenderKit/blenderkit)
- [Rokoko README](https://github.com/Rokoko/rokoko-studio-live-blender), [conflicting license file](https://github.com/Rokoko/rokoko-studio-live-blender/blob/master/LICENSE.md)
- [FreeMoCap source/CPU installation](https://github.com/freemocap/freemocap), [AGPL license](https://github.com/freemocap/freemocap/blob/main/LICENSE)
- [Blender MCP source, optional services and telemetry](https://github.com/ahujasid/blender-mcp)
- [glTF Transform](https://github.com/donmccurdy/glTF-Transform), [MIT license](https://github.com/donmccurdy/glTF-Transform/blob/main/LICENSE.md)
- [ambientCG license](https://docs.ambientcg.com/license/), [Poly Haven license](https://polyhaven.com/license), [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) — blocked from this environment.

No new plugin was installed, no third-party asset was imported, and no new capture/retargeting system was tested. Physical-phone performance remains unverified.
