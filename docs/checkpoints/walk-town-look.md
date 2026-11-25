# Checkpoint: walk-town-look (GOTR-0125)

Branch `agent/walk-town-look` from `origin/claude/ecstatic-clarke-9as2ak` (67ddca4 = v1.94). Not merged, not released.

## Owner report (2026-11-25, iPhone, city-wide free walk)
"the graphics are terrible ... Everything is blurry, and the walls look terrible, pieces of components on the screen are
missing, for example there is a stick that holds a roof in front of Bruno's gym that is cut off on top ... it doesn't look
like in the video ... Make everything more realistic ... the style of, let's say, GTA 5."

## Causes found
- Blurry: the walk draws on the engine's renderer at the engine's adaptive pixel ratio. Measured in the QA phone (DPR 3):
  pixel ratio 1 (402x690 drawing buffer for a 1206x2070 screen): a third of the screen's resolution. The engine starts at
  1.5 and its ladder drops to 1 after slow frames; the walk never raised it. Facade textures were the map's (128 px per
  window bay, ~27 px/m) and the haze started at 110 m.
- Walls: the map's facades are flat painted quads (windows painted on the wall), no shadow pass (the walk turned the sun's
  shadow off: the map's shadow camera did not reach the ground at 3 m per unit), no image-based light.
- The cut-off stick: the map's Home Gym awning (a tilted 1.9 x 1.1 unit box) with two posts 0.96 units tall standing 0.5
  units in front of the awning's edge, i.e. in the street, ending below the awning (a map piece built for a top view).
- "HOME GYM": the map's own fascia letters (the map calls it Home Gym; the films call it Bruno's Gym).

## What changed (so far)
- `adventure/free-walk/free-walk-look.js` (new): pixel ratio up to 2 with a quality ladder (ratio, shadow map, image-based
  light) driven by the real frame interval; the films' light per time of day (morning/day/evening/night: hemisphere, sun,
  sky gradient, haze; render-look.js environment); sun shadow fitted round the player (38 m, 2048/1024 map); facades
  repainted at 2x (shop 3x) with lit windows at dusk/night and windows with depth (per-pixel parallax box: reveals, sill,
  soffit, glossy glass); merged map meshes cut into 96 m tiles (view and shadow culling); clip helper.
- `adventure/free-walk/free-walk-sets.js` (new): the films' street at the story places, fitted to the map plan: Bruno's
  Gym + bus stop + Old Town houses (gym block), Market Row round Hazel's stall (13 film stalls + her authored stall), Otto's
  Corner shop front, the Docks quay door and The Basement. Signs in EN/HE/RU.
- `adventure/gloryland-map.js`: `opts.skip(x, z, kind, o, W)` leaves out buildings / the Home Gym / market stalls where a
  set stands; the piece is generated into a throwaway batch so the random sequence (rest of the town) is unchanged.
- `adventure/free-walk/free-walk-town.js`: uses the above; story targets moved to the films' doors/counter.
- `adventure/free-walk/free-walk.js` (owned by agent/story-walk; 3 small edits): `await FreeWalkTown.prepare(6000)` before
  the build (films' kit and models, at most 6 s), `time: R.opts.look || grade(R.time)` (QA/story override of the time of
  day), `FreeWalk.qa.camera` getter (QA measurement).
- `index.html`: two new scripts, ?v bumps (map, story-sets, adventure-ui, free walk); MAP_SRC in adventure-ui.js,
  story-sets.js, free-walk.js = `gloryland-map.js?v=20261125wt1`; `offline-manifest.json` regenerated.

- Also: the town's trees and lamps within 64 m of the player are drawn as the films' trees (city-trees.js, instanced,
  22 broad + 14 upright at most) and the Blender street lamp (32 at most); the map's low copies hide meanwhile.
- The Docks: the map's barrel vault is open at its ends (street level showed its black inside): the set adds the corrugated
  gable with the quay door, the hall behind it, work lamps, crates, drums, pallets, rope and a localized sign.
- Camera far plane set to the haze's end (+30 m) by the look (the walk's camera object, no other camera change).
- English lettering modelled into the Old Town / stop GLBs (CORNER COFFEE, BAKERY, the shelter's poster and timetable)
  is hidden in HE/RU; the two shop names are painted on boards in the player's language.

## QA
- `qa/walk-town-look/shots.cjs` (screens + renderer numbers per spot; ZOOM key presses for a wider view; pinned ladder level),
  `qa/walk-town-look/probe.cjs` (top views), `qa/walk-town-look/run-all.sh` (every capture, two chains),
  `qa/walk-town-look/sheet.py` (before | after | film sheets).
- Tests (targeted, -j 1): walk-town-look, free-walk, city-assets, blender-props, blender-props-2, arrival-background,
  lang-generic, offline-version-match: 8 files, 0 fails.

## Evidence so far
- `qa/walk-town-look/sheet-phone-morning.webp`: before (v1.94) | after | the films' frame, at Bruno's Gym, the bus stop,
  Market Row (Hazel), Otto's Corner, the Docks; 402x690 at DPR 3, morning, ladder pinned at the top level.
  The docks picture in this sheet predates the hangar gable fix (commit 28b13a2): re-capture.
- Numbers (`numbers-*-phone-morning.json`, SwiftShader): before pixel ratio 1 (402x690 buffer), 82-90 calls, 472-552k
  triangles, no shadow, no environment, build 1.2 s; after pixel ratio 2 (804x1380), 115-139 calls, 538-778k triangles
  (before the far-plane and tree-count cut of 28b13a2), shadow 2048 + environment, held frame 0.57-0.70 s at ratio 1 /
  1.0-1.5 s at ratio 2 (SwiftShader), build 4.9 s (the map build plus the sets; models cached).

## Next
- Run `qa/walk-town-look/run-all.sh <scratch> <git archive of 67ddca4>` (was running when the session ended): phone/PC
  morning/evening/night after, before baselines with render ms, the light path; then `sheet.py` per size/time.
- Check the evening and night pictures (lit windows, lamps), PC framing, and the walk tour on foot
  (`node qa/free-walk-city/tour.cjs <out> en bruno,market_stall,otto,market,docks_quay`: not finished in this session).
- Not checked on a physical phone. The camera framing is agent/story-walk's (QA zooms out with the walk's own key).

## Round 2 (integrator review: hitches, build time, docks)
- Hitch causes found (qa/walk-town-look/hitches.cjs, real rAF frames, route gym -> Hazel -> Docks quay): new walkers were built
  while walking (body, skeleton, bone texture: +1 texture +geometry, up to 164 ms frames); the ladder switched the shadow
  pass and the image-based light (program rebuilds); first draws of far pieces (uploads); the trees/lamps refresh did all
  kinds in one frame (26 ms).
- Fixes: warm-up behind the loading cover (renderer.compile with the walk's lights incl. the Fighter in every outfit piece,
  initTexture for every texture, one draw of everything into a 1-pixel viewport); walkers pooled (10 made at build);
  ladder steps only change pixel ratio and shadow-map size/refresh (shadow pass and environment fixed per tier: no program
  ever rebuilt while walking); trees/lamps refresh one kind a frame with precomputed positions; one facade paint (the map
  paints sharp/lit itself: GlorylandMap.build facadeScale / litWindows); the town is parked between opens (GPU copies
  freed, rebuilt in ~0.6 s instead of ~6.8 s in SwiftShader; dropped after 3 min / pagehide / on <4 GB devices); the
  models start loading as the walk opens (FreeWalkTown.prepare shared; one line in free-walk.js open()).
- Measured (SwiftShader PC, STEP 8 m/frame, loaded machine; JS time of the walk's frame): after the fixes 0 new programs
  and 0 new textures while walking (before the pool: 22 textures, longest 164 ms); remaining spikes have no GPU-object
  event (machine load / GPU-process backpressure); town update median 0.4 ms. Final STEP 1.2 runs (phone + PC, before and
  after) were started in a scratch chain (`hit-chain.sh`) and are not recorded here yet.
- Docks: the map's hangar end cap faced inward (black from the quay): cut out (FreeWalkSets cuts), gable with door leaves,
  a lit hall with crates and the painted circle; view moved. Needs the final picture.
- Next: run `node qa/walk-town-look/hitches.cjs <out> after|before phone|pc` (ROOT=<git archive of 67ddca4> for before),
  then `qa/walk-town-look/run-all.sh` for the picture set, sheets with sheet.py.

## Round 3 (first open, hitches, pictures; merged with the release branch e7fd602)
- Renumbered GOTR-0125 (GOTR-0120..0124 are taken on the release branch). Merged `origin/claude/ecstatic-clarke-9as2ak`
  (story walks, walk gait, PC film warm-up, start cover); free-walk.js kept both: prepare() calls, `time: R.opts.look || R.time`
  (QA override), `qa.camera`, plus round 3's lines below.
- First open, where the 28 s went (SwiftShader phone, `qa/walk-town-look/open-time.cjs`: timeline, long tasks, cover text):
  ~2.5 s models + kit (downloads already parallel; GLB parse on the main thread), 4-8 s build (map, sets, walkable incl.
  the height-field readback, warm-up compile), then ~15-17 s of GPU work queued by the warm-up's single 1-px draw of
  everything (SwiftShader builds a pipeline per program: ~80 programs) which blocked the page at the next frame (one
  10-15 s long task with the cover up and no progress). The machine load (5-9 on 4 cores) inflated all of it: the same
  tree measures 16-18 s at load 1-2.
- Changes: free-walk.js puts a stub in `engine.fightIQDemo` while loading (the arena, ~0.5 M triangles, is no longer
  drawn behind the cover; close() clears it); the cover reads "Building the town… n%" (models 0-30 %, build 40 %, warm-up
  40-100 %; digits only, every language); `FreeWalkTown.prepare(ms, progress)` (a settled wait is kept 20 s: a second call
  in the same open no longer waits the whole budget again) with the budget now 4 s from the open; `build({ defer: true })`
  + `town.ready(progress, alive)`: one renderer.compile of every program and the textures, then the first draw of one
  object per program in two slices, then everything once with the shadow pass, the GPU awaited with a WebGL2 fence
  polled on the frame clock (never blocking); no WebGL2 or a caller without defer: the old one-shot warm-up. Instanced
  meshes with no instance yet (cars, pigeons) draw one during the warm-up.
- Measured, same machine back to back (`open-ab10-*`): round 2 17.8 s to the first frame, longest freeze 10.7 s, one
  cover text; round 3 17.2 s, longest freeze 5.3 s, 6 progress steps (these include ~1.5 s the merged story walk adds at
  open). More, smaller slices cost more in SwiftShader (each slice ~0.5-1.5 s of fixed GPU work): 10-25 slices measured
  +4-6 s, so two.
- Hitches (`hitches.cjs`, STEP 1.2 m/frame gym -> Hazel -> Docks quay, 363 frames, JS time of the walk frame; load 0.5-1.4):
  after phone (DPR 3, ratio 2) 0 frames > 50 ms, longest 22.9 ms (38.1 in the earlier run); after PC 1366x768 0 > 50,
  longest 21.1; before (67ddca4) phone 0 > 50, longest 28.5 (9 textures made while walking); before PC 0 > 50, longest
  30.3 (13 textures). After: 0 programs, 0 textures made while walking. The first frame after the cover still compiles
  2 programs (~250 ms: the contact shadow / ring / carried bag added by free-walk.js after the warm-up).
  Pre-merge run under load 4.5: 1 frame of 106 ms, none > 150.
- Camera (story-walk's note): market umbrellas and the sets' overhead batches (awnings, stall roofs; not bunting or wires)
  are in a fine roof map read by `town.canopy()`; roofs within 3 m of the player do not count (at Hazel's counter the
  first version dropped the camera onto his head; now it rises over the stalls).
- Pictures: `qa/walk-town-look/sheet-{phone,pc}-{morning,evening,night}.webp`, `sheet-phone-low.webp` (before v1.94 |
  after | film; no "before" evening exists: grey tiles). Looked at each: market fixed (above), docks shows the quay,
  gable and lit hall end, no black void; remaining: the map's black bollards stand in the water at the quay edge (also
  in v1.94), the gym's upper windows read very bright at dusk/night, the docks view is steep (the chase camera is
  story-walk's). Pictures are EN only (HE/RU signs covered by tests/walk-town-look.test.cjs, not re-shot).
- Reachability (`qa/free-walk-city/tour.cjs`, en): bruno, market_stall, otto, market, docks_quay, docks, downtown, dome,
  cove reached in one run; fort, hill, fair, neon, tech reported "no path on foot" from where the cove leg stopped (the
  player's final cell is off the walk grid there), and were all reached walking from Old Town in a second run
  (fort 438 m, hill 441, fair 483, neon 112, tech 165); cove from Tech Pier ran out of the tour's time 16 m short.
  `qa/walk-town-look/round3/tour.txt`.
- Tests: `bash scripts/run-tests.sh -j 1 walk-town-look free-walk city-assets blender-props blender-props-2
  arrival-background lang-generic offline-version-match`: 8 files, 0 fails.
- Next: physical phone check; optionally warm the free-walk.js pieces added after ready() (blob, ring, carry); the
  integrator merges (no version bump done here).
