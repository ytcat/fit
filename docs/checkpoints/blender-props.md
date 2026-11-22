# Checkpoint: Blender props (branch `agent/blender-props`)

Owner goal (2026-11-22): more realistic graphics with existing capabilities: real modelled props instead of primitive ones.
Not merged, no version bump, no PR (integrator decides).

## What changed
- `tools/blender/prop_kit.py` (shared helpers), `tools/blender/street-props.py`, `tools/blender/gym-props.py`: deterministic
  headless-Blender scripts -> `assets/street/ch01-props/gloryland-street-props.glb` and `gloryland-gym-props.glb`
  (one node per prop, linear vertex colours, four material classes gloss / matte / glow / lantern) + Cycles previews in `qa/blender-props/`.
- `adventure/story/city-assets.js`: FILES.props / FILES.gymProps, `propKit(city)`, `placeProp(parts, matrix, batches)`;
  `props` joins the opening preload.
- `adventure/story/story-sets.js`: `ctx.prop(name, x, y, z, ry, sx)`; lamp / bin / planter / bollard use the model when it
  is ready, else the generated piece (never both). Matte parts join the street batch, glossy parts one shared mesh, bulbs the
  glow batch; lantern glass glows (plus a light pool) in evening sets, pale glass by day.
- `adventure/story/dream-sets.js`: gym-front bench and two hydrants (dream_street); the gym hall props (lockers, bench, water
  cooler, glove rack, medicine balls, dumbbell rack, wall clock, ring bell, speed-bag platform, corner stool, bucket with towel,
  pendant lamps) each `if (!c.prop(...)) { generated }`; kettlebells and skipping ropes only with the model.
- `adventure/story/dream-scenes.js`: market / shop films wait for `props`, gym films for `gymProps` (same 5 s deadline).
  `bag-break.js`: uses the gym props when already cached (never waits).

## Remaining / next
- Browser verification (before/after sheets, close-ups, renderer numbers), tests, offline manifest regeneration.
- Next command: `node qa/blender-props/capture.cjs <out> <tag>` (see header) for each scene, then `bash scripts/run-tests.sh -j 2 city street dream market gym offline arrival`.

## Checks run
- (pending)
