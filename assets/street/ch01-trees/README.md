# Gloryland original street broadleaf tree

Original generic broadleaf tree, authored locally using seeded Blender geometry
and Pillow/NumPy textures. No downloaded models, photographs, commercial service,
runtime CDN, or external asset license is used.

- `street-tree.glb`: detailed version, opaque shaped leaves.
- `street-tree-low.glb`: fewer leaves and fewer woody surface triangles. Select
  this separate asset at integration time; automatic LOD switching is not included.
- `street-tree.blend`: packed editable source with both versions at the same
  origin. Hidden source collections retain the branch graphs and native Skin /
  subdivision modifiers. The low version is initially hidden for viewing/rendering.
- `textures/`: four original 512 px PNGs and texture provenance.
- `manifest.json`: exact export size, triangles, bounds and animation metadata.
- `qa/inspect_tree.py`: source topology, animation checks and actual-GLB CPU
  renders. `qa/structure.json` records the measured checks.

Units are metres. Blender is Z-up; exported glTF is Y-up, with `(x,y,z)` mapping
to `(x,z,-y)`. Both LODs place the trunk centre at `(0,0,0)` on the paving plane.
The soil bed and buried root tips extend slightly below zero. The crown is about
6.3 m high and 4 m wide. Keep the root bed in an opening in the pavement.

`Breeze` is one four-second, looping, standard glTF skeletal animation with
three bones (`base`, `mid`, `crown`). Root weights remain fixed. The bark and
leaves use the same smooth height-weight function. This is restrained artistic
motion, not a physical wind simulation. Leave the clip stopped for a static tree.
Leaves use opaque double-sided materials, with no blended transparency.

Rebuild from the repository root:

```sh
python scripts/authoring/build_tree_textures.py
blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_street_tree.py
blender -b -t 2 --python-exit-code 1 --python assets/street/ch01-trees/qa/inspect_tree.py
```

The exports are uncompressed standard glTF; Draco is not required. Source and
CPU-render checks do not establish r128 browser integration or physical-phone
performance. Actual Three.js r128 loading, cloned-skeleton independence, fixed-root/loop motion and two-detail captures now pass in `qa/city-art/details-browser.json`. Production scene and physical-phone checks remain with the integrating agent. No game runtime,
physics, fighter skeleton, or live scene is changed by these assets.

Final CPU previews were inspected after the broader-leaf revision. The woody
surface in each LOD is one closed connected component, with zero nonmanifold
edges; sampled fixed-root motion and loop-endpoint error are zero. The crown
retains a relatively sparse, tiered young-tree silhouette, especially at its
two upper sprays. This is a remaining aesthetic limitation, not a photorealism
claim. A denser upper-branch experiment was reverted before the final exports;
there are no pending geometry edits outside the delivered source.
