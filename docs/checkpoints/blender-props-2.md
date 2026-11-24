# Checkpoint: Blender props round 2 (branch `agent/blender-props-2`)

Owner goal (2026-11-24): more design/graphics work before the long pause; stability first (every model has the generated
fallback, never both; phone budgets hold). Round 2 replaces the remaining primitive props of Market Row, Otto's shop, the Docks,
ringside and the bus stop, with the same pattern as round 1 (`docs/checkpoints/blender-props.md`).
**Not merged, no version bump, no PR.** Base: `origin/claude/ecstatic-clarke-9as2ak` 719e9bc.

## What changed
- New deterministic scripts (same bytes on re-run, checked): `tools/blender/market-props.py`, `dock-props.py`, `ring-props.py`,
  `stop-props.py`; new helpers appended to `prop_kit.py` (`moved`, `heap`, `jitter`, `tint`; round-1 output unchanged);
  `tools/blender/glb_pack.py` rewrites each new GLB with KHR_mesh_quantization (byte normals, byte colours: -33 % size, no decoder;
  r128 GLTFLoader reads it, `CityAssets.parseProps` already renormalizes and divides by 255).
- Models (`assets/street/ch01-props/`): `gloryland-market-props.glb` 1.10 MB, `gloryland-dock-props.glb` 258 KB,
  `gloryland-ring-props.glb` 133 KB, `gloryland-stop-props.glb` 35 KB. Triangles per prop:
  Market: Fruit_crate_{apples,oranges,lemons,pears,plums,limes} 1076, Stall_counter 780, Barrel 1230, Sack 438,
  Basket_{apples,pears,oranges} 986, Price_board 216, Hand_cart 3886. Shop: Shop_counter 380, Cash_register 700, Glove_wall 5688
  (big piece, 16 pairs + 2 head guards on the pegboard), Shop_shelf 708, Display_stand 200, Shop_cartons 240, Shop_bench 396,
  Shop_lamp 636. Docks: Dock_crate 644, Oil_drum_{blue,red,green,rust} 692, Rope_coil 788, Mooring_bollard 416, Pallet 264,
  Cargo 264, Work_lamp 856. Ring: Ring_stool 766, Water_bucket 952, Spit_bucket 888, Towel_rack 576, Ring_steps 152,
  Judges_table 332, Timekeeper_table 784. Stop: Ticket_machine 1120.
- `adventure/story/city-assets.js`: FILES marketProps / dockProps / ringProps / stopProps (in PROP_FILES, never dressed),
  stopProps joins the opening preload, `CityAssets.cached(names)` (loaded models now, starts loading the rest; never waits).
- `story-sets.js`: `ctx.prop(name, x, y, z, ry, sx, s)` (new uniform scale `s`, default 1).
- `market-sets.js` (`dream_market`): each stall's counter, posts and awning frame (`Stall_counter`, scaled for the 3.6 m stalls; the
  striped cloth stays generated), the fruit trays on the counters and the crates on the ground (`Fruit_crate_*` by fruit colour),
  barrels and sacks; model only (no generated counterpart): 3 chalk price boards, 3 baskets, a hand cart, all off the walking lane.
  Hazel's modelled stall untouched. `dream_shop`: counter, cash register, glove wall, shelves, price stand (the price card stays the
  game's text board), bench, three pendant lamps; cartons in the back corner (model only). Heavy bags, the new bag's display point
  and MarketProps CARRY untouched.
- `arena-sets.js`: `Kit.prop()` bakes a model into the set's existing sector meshes (lit by the set's lamps like every piece; bulbs
  into the glow mesh) -> no extra draw call; props come on top of the crowd budget (the crowd keeps its detail).
  `build(id, lang, title, { kit })`; without a kit the venue uses what `CityAssets` has loaded (and starts loading the rest).
  Docks: crates round the circle, all drums (nearest paint), pallets + wrapped cargo, quay bollards, the work lamp; 3 rope coils
  (model only). Boxing Club: corner stool, bucket, ring steps; a towel rail (model only). Regional: the timekeeper's table.
  Championship: two judges' tables + the timekeeper's table (bell, round clock), press labels kept.
- `docks-sets.js` passes the film's dockProps to the hangar; `dream-scenes.js` waits for marketProps (market films), marketProps
  (Otto's shop), dockProps (the Docks films) within the same 5 s deadline; gym films preload ringProps (never waited for).
- `dream-sets.js`: the bus stop's ticket machine (`Ticket_machine`, the station GLB already models shelter, bench, pole and
  timetable); fight night (`dream_gym_ring`): timekeeper's table, towel rail, water and spit buckets at ringside (model only).
- `gym-fight.js`: the gym fights build with the cached gymProps (+ ringProps in ring mode), so the fight matches the films.
- `index.html` `?v=20261124props2` for the eight changed scripts; `offline-manifest.json` regenerated (version unchanged).
- Delivery (as round 1): GLBs are not precached; the worker's runtime street cache keeps them after first use; a changed model
  needs a new file name.

## Tests
- New `tests/blender-props-2.test.cjs`: budgets, quantized files, sizes vs the generated pieces, real sets built in node (model or
  generated, never both; at most one more draw call per story set; arena sets: same mesh count), the films' waits.
- `tests/blender-props.test.cjs`: two regexes widened for the new ready lists.

## Remaining / next
- Venue fights (free fights in Boxing Club / Regional / Championship / Docks): the set is built at once, so the very first
  build of a session uses the generated pieces while ringProps/dockProps load; the next build has the models. Story fights at the
  Docks follow the Docks film (loaded). Optional: preload ringProps when the venue picker opens (game-venues-ui.js, not touched).
- The free-walk / roam builds (`chapter1-roam.js`, other agent) pass their own city keys: the market there keeps the generated
  pieces until it asks for marketProps.
- Rebuild: `<venv>/bin/python tools/blender/<market|dock|ring|stop>-props.py -- assets/street/ch01-props qa/blender-props-2`.
