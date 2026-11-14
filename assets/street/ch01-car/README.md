# Original Old Town compact car — review asset

`compact-car.glb` is an unbranded older compact, about 4.0 m long and 1.72 m wide excluding mirrors. Units are metres, +Y up, **+X forward**. Origin is on the ground between the axles. Wheel radius is .298 m; wheelbase is 2.45 m. Editable source is `compact-car.blend`.

The body uses longitudinal curved sections, crowned hood/roof, real wheel apertures/liners, hollow cabin and cut side/windscreen/hatch apertures. Glazing is inset, with visible seats/headrests, dashboard, steering wheel and console. Details include headlight reflector pockets/lenses, grille, tail lights, fictional plate, door pulls/narrow panel gaps, fitted mirrors, rounded tires and open-spoke alloy wheels.

This is an original authored asset, not a scan or a copied real car. It uses ordinary r128-compatible PBR and alpha glazing, no required extensions, textures, CDN, add-on or paid service. No image generator or external model was used. Surface weathering and a richer studio/environment reflection setup remain future art work; do not claim photorealism.

## Rebuild / review

```sh
blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_street_car.py
python qa/city-art/validate_glb.py
```

The local helper `city_blender_helpers.py` is required. Preview through `qa/city-art/bus/viewer.html` → **Trees & car**. Browser evidence is captured by `qa/city-art/details-browser.cjs` with the repository's Three.js r128 and system Chromium. The example scene parks it at `(-6.2, -0.15, 2.35)` and rotates it about Y by π for the opposite traffic lane. Match the actual scene's traffic direction; use rotation and positive scales.

Named `Front_*_steer` / `Rear_*_steer` assemblies contain separate `*_wheel` pivots. These are placement/control points, not vehicle physics or a driving animation. The parking pose is static. A future driver must rotate wheels by distance/radius, set steering, and check ground support; none of that is installed into the game here.

Glass/headlamp transparency, material/shadow cost, terrain contact and clearance must be checked in the actual scene. The lens is emissive/reflective geometry; it does not create a headlight beam by itself. Reuse geometry/materials for repeated parked instances and dispose shared resources carefully.

`manifest.json` and `qa/city-art/details-browser.json` record exact export/browser counts. Physical-phone performance and long-session GPU/memory behavior are **NOT VERIFIED**. This art branch does not change the production game, its collisions, characters or saved progression.
