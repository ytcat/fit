# Street asset provenance

## `ch01-bus/`

Original Gloryland municipal bus authored for this project with the deterministic Blender script `scripts/authoring/build_city_bus.py` on 2026-11-13. Fictional fleet, destination and registration; no real vehicle manufacturer's badge or copied branded livery. Palette and arrival role follow the project's existing map/story references.

No external mesh, photograph, texture, animation clip or paid asset was imported. Geometry and motion are authored locally. Lettering uses Blender's bundled default font; no separately downloaded font is embedded. No new blanket license is granted to the project by this manifest; ownership/licensing follows the project's owner.

Blender is a build-time authoring tool under its own GPL license; it is not distributed as a runtime dependency. The preview loads the repository's existing MIT-licensed Three.js distribution (`assets/vendor/THREE-LICENSE.txt`).

Future downloaded textures/models must add an entry with exact source URL, creator, asset-specific license, download date and modifications **before** inclusion. A free add-on's software license does not establish permission to redistribute every asset it can download.

## `ch01-station/`

Original station, street furniture and geometry authored locally with `scripts/authoring/build_station_kit.py`. Six original PBR maps generated with `scripts/authoring/build_street_textures.py` using seeded numeric synthesis; no photographic input or downloaded material. Poster lettering and glove pictograms are original project artwork using Blender's bundled default font. No real transit brand or paid content is included. Ownership/licensing follows the project's owner.

Build-time tools: Blender (GPL), Python, NumPy (BSD) and Pillow (HPND). These tools/libraries are not bundled into the browser game. This entry records provenance without granting a new public license to project artwork.

## `ch01-oldtown/`

Original two-building geometry, furnishings, plant leaves, signs and fictional RISE tag authored for this project with `build_oldtown_kit.py`, `city_blender_helpers.py` and `build_oldtown_textures.py`. Material maps are seeded numeric synthesis using NumPy/Pillow; no scan or downloaded texture was imported. Store names/livery are fictional. Signs use Blender's bundled default font; the graffiti letter paths are hand-authored polylines without an external font. `.blend` packs the generated material images. Ownership/licensing follows the project's owner; build-time tool licenses do not add a license to original exported artwork.

## `ch01-trees/`

The broadleaf tree, its four textures and its three-bone breeze animation are original project artwork. The editable Blender source, build scripts and asset measurements are on the [city art branch](https://github.com/ytcat/fit/tree/cf31ccd5435c1f5c99d6d81127b40d9fac103b9e/assets/street/ch01-trees). The game uses the reduced-detail GLB.

## `ch01-market/`

Hazel's fruit stall and textures are original project artwork. The editable source and build instructions are on the [city art branch](https://github.com/ytcat/fit/tree/cf31ccd5435c1f5c99d6d81127b40d9fac103b9e/assets/street/ch01-market). Wood color and roughness and the fruit skin normals were generated with NumPy and Pillow. The lettering uses Blender's bundled font. The game uses the exported GLB.
