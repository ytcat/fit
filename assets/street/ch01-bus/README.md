# Route 12 arrival bus — review candidate

Original asset for **The Dream, Chapter 1, beat 0**. Isolated authoring branch `art/city-components-20261113`, frozen source baseline `b6a19c2424fc179af6d702137c391b8677e25fd9`. The production game has not been modified and does not load this file.

## Files and preview

- `gloryland-bus.glb`: self-contained standard glTF 2.0 asset; no required compression extension or remote resource.
- `gloryland-bus.blend`: editable authoring source, including a separate render-only floor, camera and lights. GLB contains only the bus hierarchy.
- `manifest.json`: deterministic export counts and limitations.
- `../../../qa/city-art/bus/viewer.html`: same-origin, actual Three.js r128 comparison viewer. Root-relative repository path is `qa/city-art/bus/viewer.html`.
- `../../../docs/adventure/FREE_3D_AUTHORING_REVIEW.md`: recommended tools, license checks and story-ordered city inventory.

From the repository root:

```sh
blender -b -t 2 --python scripts/authoring/build_city_bus.py
python -m http.server 8142
# Open http://localhost:8142/qa/city-art/bus/viewer.html
NODE_PATH=/tmp/fit-tools/node_modules node qa/city-art/bus/inspect.cjs
```

Blender 4.3.2 was used. The build requires no third-party Python packages or Blender add-ons. Optional `-- --render` produces CPU Cycles previews; those are not game screenshots. The browser harness requires Playwright and Chromium (system executable `/usr/bin/chromium` in this environment).

## Integration contract for Claude

- Exported coordinates: **metres, +Y up, +X forward, doors on -Z**. This matches the current bus heading and curb side in `adventure/story/story-sets.js`.
- Ground is local Y=0 at the bottom of the tires. Place the root at the road elevation (currently -0.15 m). Preserve positive unit scale; do not mirror this asset.
- Keep the existing `objects.bus` wrapper/movement contract. Load asynchronously and retain the current generated bus if loading fails. Nothing here rewrites `StorySets` or choreography.
- Named wheel assemblies: `Front_curb_steer`, `Front_road_steer`, `Rear_curb_steer`, `Rear_road_steer`; wheel child pivots end in `_wheel`. Front steering and rolling are separate pivots. Physical tire radius: **0.515 m**.
- `Wheels_one_revolution`: two-second reference rotation. For actual driving use accumulated road distance / 0.515 to rotate the wheels, or drive clip time from that value. Do not loop it while the bus is stopped. Steering geometry/Ackermann behavior, path acceleration and suspension are game integration work, not supplied physics.
- `Doors_open_hold_close`: one shared clip controlling four hinges. Closed at 0; fully open around 1.3 s; hold until about 3 s; closed by 4.3 s. `Entry_left_door` / `Entry_right_door` are the front pair; `Exit_*` are the middle pair. Leaves swing outward, with no negative scaling.
- `Entry_curb_marker` and `Entry_floor_marker` are staging references for the player's arrival path. They are **not** an implemented navigation path or collision solver. Review the full character width, luggage, curb height and door sweep when integrating the scene.
- Tires, door panels, glazing and static body are batched within each assembly by material. Interior wheel housings and entry treads are modeled. No passenger character or driver animation is included.
- Glass is ordinary alpha-blended PBR, not transmission/refraction. Separate translucent window faces can create sorting artifacts in some views; inspect in the actual street. Eyes, hairs and custom fighter shaders are unaffected.
- Blender emits optional `KHR_materials_emissive_strength` for the headlamp's 1.2 strength. r128 ignores this optional boost and uses the ordinary emissive factor; the screenshots show that r128 fallback. No extension is required to load the asset. A future export can cap authoring emission to 1 if the integrator wants an extension-free material list.
- The night preview uses an actual shadow-casting street spotlight. Headlamp lenses are emissive; they **do not cast light by themselves**. Actual headlight beams and scene night-light budgets remain integration work.

## What still needs art/integration review

This is an initial detailed mesh and motion-control asset, not a finished photorealistic vehicle. It has no baked wear/grime/normal/roughness texture set, no mobile LOD, no passengers, no validated boarding animation, no suspension system and no driving path. The preview verifies the GLB and its clips in isolation; complete street scenes and physical iPhone/Android performance are **not verified**. Do not release it as a completed city upgrade on the strength of these screenshots alone.

Next asset group: station shelter/curb and Old Town façade kit, followed by gym, market/shop and docks in the current story order. Chapter 2's Junior League only has an outline; do not invent a replacement plot or move districts.

See `qa/city-art/bus/browser-results.json` for measured counts and environment, and `docs/adventure/FREE_3D_AUTHORING_REVIEW.md` for the tool decision.
