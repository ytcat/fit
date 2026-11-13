# Old Town building assets — second city-art delivery

**Two full-depth masonry building prototypes for Chapter 1**, with real recessed windows and shallow furnished interiors. The kit adds a brick/hip-roof bakery frontage and a plaster/parapet coffee-shop frontage using the existing Gloryland palette. It remains on `art/city-components-20261113` for Claude's integration review; production game code is unchanged.

Source/material commit: `5714256`. Export and browser evidence: `bfeb1ac`. Authoring started at art baseline `791e1d05bf3835c03d5b79d9e1884517fc689fa8`; concurrent main was checked at `dab12f682e58f68f1d35398069aa606fe15001fa`. No reset, cherry-pick, main merge or game deployment was performed.

## Assets

[`assets/street/ch01-oldtown/`](../../assets/street/ch01-oldtown/README.md) contains editable `.blend`, self-contained GLB, original PBR maps and a manifest. Source is reproducible with Blender 4.3.2, NumPy and Pillow; no external asset, paid tool, runtime service or new shader is required.

| Export | Value |
|---|---:|
| GLB bytes | 9,000,840 |
| Triangles | 61,904 |
| Mesh nodes | 36 |
| Materials observed in r128 | 20 |
| Texture objects observed in r128 | 13 |
| Building prototypes | 2 |

The first candidate was 12,297,248 bytes, including about 8.8 MB of images. Color maps remain 1024 px; micro normal/roughness maps were reduced to 512 px rather than removing masonry openings or changing building proportions. The resulting GLB meets the existing per-asset 10 MB guideline; that does not establish a full-scene phone budget.

Modeled details include 35 cm masonry, reveals, recessed frames/glass, projecting sills/cornice, bounded interior pockets, curtains, books/plants, supported lamps and shop counter props; real plaster removal over brick; a fictional paint tag; gutter/downpipe/brackets; hipped clay roof, rounded ridge/hip caps and eave tiles; hollow chimney crown; parapet/coping/vent; supported canvas with modest sag, thickness and rounded valance. Foundations extend below the placement origin.

## Actual r128 render evidence

- [Street overview](../../qa/city-art/oldtown-day.png) · [night](../../qa/city-art/oldtown-night.png) · [phone-sized portrait](../../qa/city-art/oldtown-portrait.png).
- [Window front](../../qa/city-art/oldtown-window-front.png) · [oblique window/reveal](../../qa/city-art/oldtown-window-oblique.png) · [street-height view](../../qa/city-art/oldtown-street-height.png).
- [Plaster corner/awning](../../qa/city-art/oldtown-plaster-corner.png) · [rear](../../qa/city-art/oldtown-rear.png) · [roof/crown](../../qa/city-art/oldtown-roof.png).
- Initial **unpublished candidate** [overview](../../qa/city-art/oldtown-review-before.png) / [window](../../qa/city-art/oldtown-review-window-before.png), matched to the later overview/front-window camera and light. These are intermediate asset comparisons, not screenshots of the current live game's old buildings.

All evidence is rendered from the exported GLB in the repository's Three.js r128. No generated concept image is presented as a game render. The shared QA viewer's **Old Town** button assembles the kit with the previous bus/station; its **Window detail** button gives a close view. This page is separate from the production app.

## Validation

`python qa/city-art/validate_glb.py` — **PASS** for bus, station and buildings: binary structure, finite vertex/animation data, valid indices, embedded resources and no required extensions. The new building GLB has no extension dependency.

`NODE_PATH=/tmp/fit-tools/node_modules node qa/city-art/oldtown-browser.cjs` — **PASS**, zero errors/warnings. Rays establish:

- A solid wall at 1.000 m from the test ray, with no masonry hit through the adjacent real opening.
- Glass at 1.255 m: **25.5 cm behind the wall**.
- Rear interior wall at 2.050 m: about **79.5 cm behind the glass**.
- Corner plaster at 1.000 m and brick at 1.022 m: separated surfaces, avoiding the initial coplanar endcap artifact.
- No plaster at the chipped patch, with its brick core still present.
- An empty chimney crown center through the tested cavity depth, with a solid crown rim beside it.
- Both buildings retain exported interior vertex colors; 393×852 viewer has no horizontal overflow.

Raw measurements: [`oldtown-browser.json`](../../qa/city-art/oldtown-browser.json), [`glb-validation.json`](../../qa/city-art/glb-validation.json). Python AST checks and Node syntax checks passed. The full game suite was not rerun because no production runtime file changed.

Read-only Astra design/visual review informed proportions, reveals, material hierarchy and geometry acceptance. It reviewed initial/refined candidates, identified material and construction weaknesses, and found no further blocking geometry beyond the final awning mounting/valance/chimney items. Root implemented those final changes and rechecked the actual captures and geometry. No independent final aesthetic score or photorealism claim is made.

## Performance / remaining art work

Cloud tests use headless Chromium with **SwiftShader software rendering**, not a representative phone or desktop GPU. The default composed day view (bus + station + two buildings) submitted **283,830 triangles / 185 calls including shadows**. This is an integration cost to profile, not a claim of acceptable sustained FPS. Real iPhone/Android FPS, memory/thermal behavior, repeated-building scenes and full gameplay are **NOT VERIFIED**.

Further art polish is still warranted: more harmonious tile relief across roof slopes, subtler/layered chimney flashing, selectively aged brick/trim, richer fabric and interior props. Authored interior vertex shading is not a physical light-transport bake. Glazing/paint sorting and distant LOD should be checked in the real street. There are no supplied inhabitants, walking routes or enter-shop interactions.

Next component groups remain street trees and a detailed parked car, then gym approach/interior, market/shops and docks in the current Chapter 1 script. Chapter 2 remains the Junior League outline. Integration stays with Claude; preserve existing maps, gameplay and fallback sets.
