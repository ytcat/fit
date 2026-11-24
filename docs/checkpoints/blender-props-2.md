# Checkpoint: Blender props round 2 (branch `agent/blender-props-2`)

Owner goal (2026-11-24): more design/graphics work before the long pause; stability first (model or generated fallback, never both;
phone budgets hold). Round 2 replaces the remaining primitive props of Market Row, Otto's shop, the Docks, ringside and the bus stop.
**Not merged, no version bump, no PR.**

## Status
- WIP 1: four new deterministic Blender scripts + GLBs (not wired into the game yet):
  `tools/blender/market-props.py`, `dock-props.py`, `ring-props.py`, `stop-props.py`; `tools/blender/glb_pack.py`
  (KHR_mesh_quantization: byte normals + byte colours, -35 % file size). Previews in `qa/blender-props-2/`.

## Next
- Wire into `city-assets.js` (FILES/PROP_FILES), `story-sets.js` prop(), `market-sets.js`, `arena-sets.js` (Kit.prop),
  `dream-sets.js` (ticket machine, ring-night table), `dream-scenes.js` waits; tests; browser before/after.
