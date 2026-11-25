# Mrs. Hazel — TRELLIS.2 head source (v1.96, awaiting owner approval)

- `hazel-head-input.png`: FLUX.1-schnell (free ZeroGPU), seed 505 — an older doe, red polka-dot kerchief over the head and
  knotted at the neck, closed smile, 3/4 view. Seeds 101/202/303 drew antlers and were rejected.
- `hazel-head-trellis-source.glb`: microsoft/TRELLIS.2 Space (free ZeroGPU): /preprocess_image, /image_to_3d (seed 0,
  resolution 1024), /extract_glb (decimation 100000, texture 1024). 99,701 triangles, 1 material, two 1024 textures, 4.1 MB.
- Review renders: `qa/hazel-trellis/input-vs-trellis.webp` (input | front | 3/4 | profile, Blender Cycles).
- Not in the game yet. After approval it is fitted like Fang (`tools/blender/fang_head_game.py`: ~16k triangles, colour
  match to her body, child of the head joint, code head as fallback, offline pack).
