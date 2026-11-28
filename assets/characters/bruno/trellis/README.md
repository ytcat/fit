# Coach Bruno: TRELLIS.2 head source (2026-11-26, awaiting the owner's approval)

- **`bruno-head-input.png`:** FLUX.1-schnell on the free ZeroGPU tier, seed 11.
  - The picture: an old brown bear and former champion with a grey-white muzzle, a worn grey-brown tweed flat cap (the game's cap colour), a closed half smile and heavy brows, in a 3/4 view.
  - Seed 22 was rejected: it faces the other way and the muzzle is barely grey. Both seeds are in `qa/bruno-trellis/flux-seeds-11-22.webp`.
- **`bruno-head-trellis-source.glb`:** the microsoft/TRELLIS.2 Space on the free ZeroGPU tier.
  - Steps: /preprocess_image, /image_to_3d (seed 0, resolution 1024), /extract_glb (decimation 100000, texture 1024).
  - Result: 98,439 triangles, 1 material, two 1024 textures, 4.7 MB.
- **Review:**
  - `qa/bruno-trellis/game-vs-trellis.webp`: the current game head against TRELLIS front / 3/4 / profile (Blender Cycles), plus the input.
  - `qa/bruno-trellis/face-closeup.webp`: the face up close.
- **Known:**
  - The fur texture is very dark, as dark as in the input. The eyes sit deep under the brows.
  - Fine light crack lines show in the texture on the muzzle and brows.
  - No scar or broken nose (FLUX did not draw them).
- **Not in the game yet.** After approval it is fitted like Hazel and Fang:
  - about 14–16k triangles, a colour match to his body, a child of the head joint;
  - the neck skin pulled inside the new head, the code head kept as the fallback, added to the offline pack;
  - every join checked (AGENTS.md).
