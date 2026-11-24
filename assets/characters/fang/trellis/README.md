# Fang head — TRELLIS.2 source (owner approved 2026-11-24: "fang looks good")

- `fang-head-input.png`: input picture (FLUX.1-schnell on Hugging Face ZeroGPU, seed 11, white background removed locally).
- `fang-head-trellis-source.glb`: microsoft/TRELLIS.2 Space (free ZeroGPU), resolution 1024, Extract GLB decimation 100000, texture 1024 —
  1 mesh, 98,585 triangles, 1 material, two 1024 px textures. Raw output: not for the game as is (too heavy for phones; static, no rig).
- Checked in Blender with `tools/blender/fang_view.py`; comparison with the current Fang: `qa/fang-trellis/compare-current-vs-trellis.png`.
Fitting into the game (decimation, scale, attachment to the rig's head bone, neck seam): branch `agent/fang-trellis-head`.
