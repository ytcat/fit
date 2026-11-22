# Checkpoint: Blender props (branch `agent/blender-props`)

Owner goal (2026-11-22): "improve the graphics … as realistic as possible, with existing capabilities and free quota". This
slice: real modelled props (headless Blender 5.2) instead of primitive box/cylinder props. **Not merged, no version bump, no PR.**

## What changed
- `tools/blender/prop_kit.py` (shared helpers, contract), `tools/blender/street-props.py`, `tools/blender/gym-props.py`:
  deterministic scripts (same bytes on re-run, checked) -> `assets/street/ch01-props/gloryland-street-props.glb` (402 KB) and
  `gloryland-gym-props.glb`, plus Cycles previews `qa/blender-props/street-*.png`, `gym-*.png`.
  One node per prop, linear vertex colours, four material classes: gloss (paint/enamel/vinyl, roughness 0.42), matte
  (wood, terracotta, foliage, cloth: joins the set's street batch), glow (bulbs), lantern (lit at dusk, pale glass by day).
- Triangles: Lamp 908, Bin 1634, Planter 1934, Planter_wide 2514, Bollard 410, Bench 2260, Hydrant 1182; Lockers (bank of six)
  2192, Gym_bench 720, Water_cooler 956, Glove_rack 2164, Medicine_balls (3) 1728, Dumbbell_rack (8 dumbbells) 2568,
  Kettlebells (3) 1452, Skipping_ropes (3) 1652, Wall_clock 592, Ring_bell 516, Speed_bag 872, Corner_stool 726,
  Bucket_towel 992, Pendant_lamp 712.
- `adventure/story/city-assets.js`: FILES.props / FILES.gymProps; `propKit(city)` (parsed once per model, COLOR_0
  denormalized for r128), `placeProp(parts, matrix, batches)`; `props` joins the opening preload; prop models are not dressed.
- `adventure/story/story-sets.js`: `ctx.prop(name, x, y, z, ry, sx)`; `lamp`, `bin`, `planter`, `bollard` place the model
  when it is ready, else build the generated piece (never both). All instances merge into: the street batch (matte), ONE new
  glossy mesh, the glow batch. Evening sets: lantern glass in the glow batch plus a light pool under each lamp. `set.props`
  counts what was placed.
- `adventure/story/dream-sets.js`: gym-front bench, two hydrants (model only) in dream_street; the gym hall: speed bag
  platform, lockers, bench, water cooler, glove rack, medicine balls, dumbbell rack, wall clock, ring bell, corner stool,
  bucket + towel, six pendant lamps (`if (!c.prop(...)) { generated }`); kettlebells and skipping ropes only with the model.
  Heavy bags, ring, mop, posters untouched.
- `adventure/story/dream-scenes.js`: market films wait for `props`, Otto's shop for `props`, gym films for `gymProps`
  (same 5 s deadline, fallback after). `bag-break.js`: gym props only when already cached (never waits).
- `index.html` `?v=20261122props1` for the five changed scripts; `offline-manifest.json` regenerated (version unchanged).
- Delivery: like every street GLB the models are NOT precached (tests/city-assets.test.cjs keeps "no .glb in the offline
  manifest"); the worker's runtime street cache keeps them after first use; offline-first plays get the generated fallback.
  The runtime cache ignores `?v=`: a changed model needs a new file name.
- Tests: new `tests/blender-props.test.cjs` (budgets, sizes vs the generated pieces, placement maths, real sets built in node:
  model or generated, never both; station lamps not doubled; at most +1 mesh per set). `tests/city-assets.test.cjs` status
  expectations include the two new files.

## Evidence (qa/blender-props/)
- Before/after film sheets (402x690, swiftshader): `opening|market|gym|walk-{high,low}-before-after.webp`.
- Close-ups in place: `closeups-{opening,gym,market}-before-after.webp`. Numbers: `renderer-numbers.json`.
- Renderer: +1 draw call per scene (the glossy prop mesh); triangles +28k opening/walk (~+6 %), +10k market, +16k gym.
- Tools: `capture.cjs` (TIMES / WALK / CAM close-ups), `sheets.py`, `inspect-glb.cjs`.

## Remaining / next
- Owner review of the look. Optional: lighter planter foliage core (sub 1) would save ~6k triangles in the opening.
- Not done: the training gym in `club-world.js` (own primitive lockers/dumbbells, separate builder, not shared with dream-sets);
  docks / old busstop-gymfront-market sets (no city models passed: generated fallback as before).
- Rebuild: `<venv>/bin/python tools/blender/street-props.py -- assets/street/ch01-props qa/blender-props` (same for gym-props.py).

## Checks run (2026-11-22)
- `bash scripts/run-tests.sh -j 2 city street dream market gym offline arrival props` -> files=14 fails=0 (784 s), includes
  tests/blender-props, city-assets, arrival-background, offline-version-match, dream-bag-break, story-clean-gym.
- Browser (Playwright/Chromium swiftshader, 402x690): dream_opening, dream_market_robbery, dream_gym_talk, walking; high and
  low; zero page errors after. Walking route and positions identical before/after (`walk-long-high-before-after.webp`).
