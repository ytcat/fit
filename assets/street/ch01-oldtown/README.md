# Old Town masonry building kit — review candidate

Two original street-scale buildings for Chapter 1's arrival/gym neighborhood. Designed against the approved Gloryland map and the bus/station assets on `art/city-components-20261113`. The game does not import this file yet.

## Contents

- **`OldTown_brick_hiproof`**: 7.2 × 6.4 m footprint, three storeys, 9.5 m masonry height; hipped terracotta roof, curved ridge/hip covers and modeled eave courses, fitted chimney/flashing, original bakery frontage.
- **`OldTown_plaster_parapet`**: 6.6 × 6.4 m footprint, two storeys, 6.6 m masonry height; thin lime-plaster coat over continuous brick, irregular exposed-brick chip, localized sill/base stains, original RISE paint tag, flat roof/parapet/coping and vent unit, original coffee-shop frontage.
- True 35 cm masonry walls with openings/reveals on front, sides and rear; glass about 25.5 cm behind the façade, frames about 20.5 cm back. Interiors are bounded 1.05 m deep pockets with curtains, books/plants, small supported lamps or shop counters/packages.
- Projecting stone sills/cornices, bent downpipes with brackets and gutter connection, planted window boxes, shaped awnings with slight sag, edge thickness and scalloped valances.
- Original 1024 px color textures, 512 px normal/roughness textures and a 1024×512 original alpha paint tag. No photographic scan, real brand, external model, paid add-on or service is used.

These are authored game assets with procedural materials. They are not scans, a complete enterable neighborhood, a completed photorealistic city or populated shops.

## Rebuild

```sh
python scripts/authoring/build_oldtown_textures.py
blender -b -t 2 --python scripts/authoring/build_oldtown_kit.py
python qa/city-art/validate_glb.py
```

Requires local Blender 4.3.2 and build-time NumPy/Pillow. `city_blender_helpers.py` is a local original helper module. No third-party Blender add-on is required. `.blend` packs all images so it can be opened outside this workspace. `gloryland-oldtown.glb` embeds its resources and uses standard PBR, vertex colors and alpha glass/paint, with no required extension.

## Placement contract for Claude

Units are metres, **+Y up, +Z facing the street** after export. A building origin lies at the middle of its front wall at sidewalk height. Geometry extends into negative Z. Foundations extend 0.4 m below origin to meet terrain.

The kit is exported as a sample row: brick building X=-4.05, plaster building X=3.45. To place either prototype individually, clone its named group and set its position to the desired front-wall center. Preserve unit positive scale. Meshes are merged by material within each building; shared materials/textures can be reused across clones. Do not clone/dispose shared resources indiscriminately.

The QA viewer places the kit root at `(0, 0, -8.4)` behind the existing station sidewalk, with the bus/station at their earlier documented positions. This is an integration example, not a replacement of the current map's district layout or its story progression.

`Warm_room_anchor_*` markers indicate selected interior lamp locations. The QA preview attaches two restrained, short-range, non-shadow point lights at selected markers at night. Emissive lamps alone do not light the room. Production lighting, distant-window LOD, shadows, occlusion, asset disposal and navigation/door interaction belong to the integration pass. The door/window shapes here are static; there is no supplied enter-shop action or resident animation.

## Review and limits

Run a root HTTP server on port 8142, open `qa/city-art/bus/viewer.html` and press **Old Town**, **Street view**, **Window detail**, or **Night lighting**. Drag/pinch/scroll to inspect angles. `qa/city-art/oldtown-browser.cjs` captures front/oblique windows, street height, plaster corner, rear, roof, dusk and portrait. Its rays verify actual masonry holes, glazing/interior depth, separated plaster/core surfaces and an actual exposed-brick patch.

`qa/city-art/oldtown-review-before.png` and `oldtown-review-window-before.png` are the first **unpublished candidate**, not the live game's baseline. Later `oldtown-day.png` and `oldtown-window-front.png` use matched camera/light for the refinement comparison.

Close weathering/trim/fabric polish, vegetation variation and hardware performance remain review work. Interior shading uses authored vertex colors, not measured light transport. Texture/material/mesh costs are in the manifests and browser report; the first texture-heavy export was 12.3 MB and was reduced by lowering micro-map resolution. Do not infer mobile FPS from the software-rendered cloud screenshots. **NOT VERIFIED ON PHYSICAL IPHONE/ANDROID.**
