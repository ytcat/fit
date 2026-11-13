# Chapter 1 arrival station kit — review candidate

Original, modular street components for The Dream's bus arrival. Uses the current map's road/curb orientation and Old Town ironwork/ivory/brass palette. No game script imports these assets yet.

## Included

`gloryland-station.glb` contains independently reusable groups:

- `Road_and_pavement`: 20 m road strip, individual beveled paving and curb stones, lane dashes and an open drain grate with a recessed well.
- `Shelter`: curved sheet-metal canopy, structural frames, anchor bolts, separate safety glazing, visibility marks and fitted original fight-night poster.
- `Bench`: rounded timber slats, curved steel armrests, braced feet and open gaps.
- `Bus_stop_sign`: pole, enamel Route 12 plate and a readable fictional timetable.
- `Streetlamp`: turned iron base/shaft, framed lantern, shaped crown and `Lamp_light_anchor` attachment point.
- `Litter_bin`: separate vertical ribs, rolled rim and recessed liner.

`gloryland-station.blend` is editable Blender source. `textures/` contains six original 1024×1024 color, roughness and tangent-space normal PNGs for asphalt and stone, embedded in the GLB. They are procedurally authored material maps, not photographic scans. Some material variation and weathering still need artistic refinement.

## Rebuild

```sh
python scripts/authoring/build_street_textures.py
blender -b -t 2 --python scripts/authoring/build_station_kit.py
```

Texture authoring requires free NumPy and Pillow. Geometry/export requires local Blender 4.3.2, no add-on. No external download or runtime service is used.

Run the local preview server from the repository root and open `qa/city-art/bus/viewer.html`; press **Arrival street**. The bus is a separate asset. Reproduce browser checks with `NODE_PATH=/tmp/fit-tools/node_modules node qa/city-art/station-browser.cjs` and structural checks with `python qa/city-art/validate_glb.py`.

## Placement / integration

Export is metres, +Y up, +X along the street, negative Z toward the sidewalk. The road surface is Y=-0.15; sidewalk top is approximately Y=0. The kit occupies X=-10…10, Z=-8.3…3.5. It is a modular patch to assemble into a larger street; its outer edges are not a finished city boundary.

The example bus placement is `(0.4, -0.15, -1.9)`, matching the current `StorySets.busstop` bus location. Door sweep, bags, boarding and character clearance must be checked against the final character/animation during integration.

Each named component has a useful base pivot; cloning a component and resetting its position puts its pivot at the new placement origin. `Road_and_pavement` is centered along the road. `Lamp_light_anchor` is attached to its lamp and therefore follows placement/rotation.

The preview attaches one budgeted warm **spotlight** at the lamp anchor as an approximation of its ground illumination. It uses a 1024 shadow map with near=0.45 m to keep the luminaire's immediate housing out of its own shadow map. Actual night-scene light count/range, shadows and distant lights remain the integrator's responsibility. The emissive diffuser by itself does not illuminate surroundings. There is no expensive glass transmission, runtime material generator or required glTF extension.

## Evidence and limits

See `qa/city-art/station-browser.json`, `station-day.png`, `station-night.png`, `station-entry.png`, `station-portrait.png`. These are actual local Three.js r128 screenshots, separate from the published game. Structural checks validate finite geometry, valid indices, embedded resources and no required extensions.

The test machine uses Chromium/SwiftShader software rendering. Real iPhone/Android performance, a complete populated street and long-session thermals are **NOT VERIFIED**. No background people/animals, cars, trees or buildings are included in this kit. No claim of a finished photorealistic city is made.
