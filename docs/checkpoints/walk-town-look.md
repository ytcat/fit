# Checkpoint: walk-town-look (GOTR-0120)

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

## Next
- Finish the evidence run (sheets for phone/PC, morning/evening/night, low tier), numbers table, final checkpoint.
