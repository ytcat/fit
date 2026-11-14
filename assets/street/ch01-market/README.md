# Hazel's fruit stall — original Chapter 1 art

`hazel-fruit-stall.glb` is an optional authored replacement for Mrs. Hazel's market stall in Chapter 1, beat 6. The buyer side faces **glTF +Z**, Y is up, units are metres, origin at ground under the counter. Envelope: about 3.00 m wide × 1.85 m deep × 2.68 m high, including the empty return crate behind the seller side. Leave a separate clear aisle behind it for Hazel and story action.

Included: fitted iron canopy supports/feet/collars, a continuously shaped sagging striped canopy with stitched seams and scalloped valance; a timber counter/skirt with directional original grain; open slatted crates and fasteners; apples with recessed poles, oranges, tapered pears with stems/leaves and subtle skin normals; price slates; hollow weighing pan, analog dial/needle and enamel pedestal; an open creased kraft bag. The fruit is arranged, not simulated. No character, physics, navigation, interaction or cloth animation is included.

Editable packed source: `hazel-fruit-stall.blend`. Rebuild from the repository root:

```sh
blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_market_stall.py
python qa/city-art/validate_glb.py
```

Original seeded geometry and three generated texture maps; no imported meshes, scans, photos, paid add-ons or CDN. Python/NumPy/Pillow run only at authoring time. Font is Blender's bundled default. Project ownership applies. PBR materials and vertex colors use ordinary local Three.js r128 GLTFLoader; no required glTF extensions. GLB embeds all maps.

Preview at `qa/city-art/market/viewer.html` with a local HTTP server. Actual r128 captures and browser counts live in that directory. The neutral QA scene uses one 1024 directional shadow map and a small locally generated studio environment for metal reflections. The environment is a QA aid, not a new game dependency or a baked texture imported into this asset. Production lighting remains the integrating agent's responsibility.

Limitations: clean, somewhat regular fruit sorting and cloth; no grime/weathering paint pass or fabric motion; this remains a game-art candidate, not a scanned or photorealistic stall. Reuse meshes/materials across copies and measure the entire market, characters and shadows before choosing placement density. Physical-phone frame time, thermal behavior and production scene integration are **NOT VERIFIED**. Claude owns story/runtime integration; this branch leaves it unchanged.
