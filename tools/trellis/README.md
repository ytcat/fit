# TRELLIS.2 head pipeline (free Hugging Face only)

These scripts made the generated heads for Fang, Hazel and Bruno: a FLUX reference picture, then a TRELLIS.2 GLB, then a Blender check render.

## Owner rules (verbatim)

- "Do not use a paid endpoint, rent a GPU, or buy a subscription."
- "Do not upload game files or private references without my approval."
- "If the free quota or the service blocks the export, report the exact failing step and error, and stop rather than paying or substituting another model."
- "Send me the GLB and the comparison for approval before rigging, merging or deploying anything."

## Token handling

- The Hugging Face token comes ONLY from the command environment, for example `HF_TOKEN=... python3 tools/trellis/flux_ref_bruno.py 11 22`.
- Never write it to a file, commit or log.
- Never ask the owner to paste it in a chat.

## Steps

1. **Reference picture.** Run `python3 tools/trellis/flux_ref_<name>.py <seed> [<seed> ...]`.
   - It calls the free Space `black-forest-labs/FLUX.1-schnell` `/infer`, at 1024 px with 4 steps.
   - Output: `<name>-<seed>.webp`.
   - Show the seeds to the owner and let them pick one.
2. **3D model.** Run `python3 tools/trellis/trellis_image_to_glb.py <image> <out.glb>`.
   - It calls the free Space `microsoft/TRELLIS.2` (ZeroGPU) through these endpoints: `/start_session` → `/preprocess_image` → `/image_to_3d` (seed 0, '1024') → `/extract_glb` (100000 faces, 1024 texture).
   - It prints each step, so a quota failure names the step that failed.
3. **Check render.** Run `blender -b -P tools/trellis/blender_view_glb.py -- <glb> <outdir>`.
   - It renders front, 3/4 and profile in Cycles.
   - It prints the triangle count, materials and texture sizes.
4. **Owner approval.** Send the GLB and the comparison against the in-game head.
   - Lesson from Bruno (GOTR-0139): the studio render is not enough. Also show the head roughly placed on the body in a film frame, under the film light, before the full fit.
5. **Game head.** Each character has its own Blender script that turns the source into the game head:
   - Fang: `tools/blender/fang_head_game.py`.
   - Hazel: `tools/blender/hazel_head_game.py`.
   - Bruno: `tools/blender/bruno_head_game.py`, on branch `agent/bruno-head`. It remeshes and re-bakes the source, bakes a normal map, adds eyes, jaw and fur cards, and adds a neck tube.

   The heads load in `adventure/story/cast-market.js`. The joins are checked by `tests/head-seams.test.cjs` and by the owner's joins rule in AGENTS.md.

## Sources kept in the repo

- `assets/characters/bruno/trellis/`: Bruno's input picture (seed 11) and the TRELLIS source GLB (98k triangles).
- `qa/bruno-trellis/`: the seeds and the source-vs-game pictures the owner approved.
- Fang's and Hazel's sources are described in `docs/checkpoints/fang-trellis-head.md` and `docs/checkpoints/hazel-trellis-head.md`.
