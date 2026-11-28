# Gloryland Docks — four container liveries

Working candidates, not in the game yet. Company names are fictional. Check digits are computed from each freight code. Keep the approved rolled ribs, double doors, four locking rods/handles, rails and corner castings.

- For efficient runtime loading, use `shared-shell.glb`, four `*-markings.glb` files and `container-liveries.js`. Call `await ContainerLiveries.load(loader, baseUrl)`, then `kit.create('harborline' | 'tidemarsh' | 'nordquay' | 'sunspoke')`. Shell geometry is shared across all crates, with two lazily cached tint materials per livery and one baked stencil mesh per livery. Clone meshes are ordinary local Three groups; renderer-level instancing per primitive can be added later if crowding the dock.
- Standalone `*-container.glb` files are complete, useful for model viewing/Blender import; **do not ship both sets**. Each runtime crate has seven primitive submissions before instancing (~6.2k triangles) and exactly the approved world bounds. Use no more than one instance per livery within a close scene if unique individual freight codes matter. More individual freight IDs can be added as alternate stencil files without cloning the shell.
- Verified through repository Three.js r128 / GLTFLoader: clone and standalone loads; 4 unique IDs, true shared geometry, same footprint/height as original, matching runtime & standalone color factors, 7 primitives each.
- Supply as candidate for further integration and mobile gameplay QA; no repo modification or deployment.

Recompute: `python make_shell.py`, `blender -b -t 2 --python build_liveries.py`, `python standalone.py`, `python make_runtime.py`. Capture: `blender -b -t 4 --python build_liveries.py -- --render`, then `python sheet.py`. Test with `VENDOR=/absolute/path/to/fit/assets/vendor node test-liveries.cjs`.
