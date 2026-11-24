# Checkpoint: Fang's TRELLIS.2 head in the game (branch `agent/fang-trellis-head`)

Owner 2026-11-24: "fang looks good" (the TRELLIS.2 head, `assets/characters/fang/trellis/`). Not merged, not released;
no version bump (the release does that). PAUSED 2026-11-24 by the coordinator (v1.93 release needs the CPU).

## What changed
- `tools/blender/fang_head_game.py` -> `assets/characters/fang/fang-head.glb` (run: `<blender venv python> tools/blender/fang_head_game.py
  -- assets/characters/fang/trellis/fang-head-trellis-source.glb assets/characters/fang/fang-head.glb scale=0.88 cut=-0.285`):
  source welded (glTF seam splits), scaled 0.88 m/unit into the head joint's frame (+Z nose, origin at the joint, dy 0.075, dz -0.03),
  cut at head-frame y -0.285 (below the mane tips; the stump sits inside the chest), decimated 96.7k -> 16.0k triangles (8.0k verts),
  one 1024 px JPEG base colour, constant roughness 0.82, metal 0 (TRELLIS metal map averaged 0.48: an artifact on fur). 0.77 MB.
- `adventure/story/cast-market.js`: `authoredHead(rig)` at the end of Fang's build; one download per page shared by every rig;
  `headOn(rig, on)` adds the model under the head joint, takes every code head part under the joint off the render layers
  (their `visible` flags stay with the face acting/teeth) and folds the skin's head/neck above the collar (y > 1.79, neck+head
  weighted) 62 % toward the neck axis in both outfit streams (restored exactly when off). Fallback: until the file is ready or
  when it fails the code head stays (never both); a later `head.load()`/`asOpponent('fang')` retries.
  API `StoryCast.market.head { url, load, ready(ms), on(rig, bool), state() }`.
- `adventure/story/dream-scenes.js`: films with Fang wait for the head (max 5 s); `dream_apology` starts the download.
- `adventure/portraits.js`: ignores parts off the render layers, frames Fang's model face, waits (max 6 s) for the download and
  redraws portraits on screen if it arrives later.
- Offline pack: head GLB precached (`scripts/build_offline_manifest.py`, manifest regenerated, version string unchanged);
  `tests/city-assets.test.cjs` now forbids city models only and allows small `assets/characters/<id>/<id>-head.glb`.
- `index.html`: `?v=2026112401` for portraits.js, cast-market.js, dream-scenes.js.
- New test `tests/fang-head.test.cjs`; backlog GOTR-0092 entry.

## Evidence (`qa/fang-trellis/`, tools in `qa/fang-trellis/tools/`)
studio before/after (front, 3/4, side, back), neck seam jacket + fight, poses (guard, cross, hook, hit, KO-down, talk, walk, front
and back), throat close-ups, market robbery film before/after (4 moments + head close-ups), street fight guard/punch before/after,
portrait before/after/cold start, Super Punch KO film vs Fang (after).

## Numbers (headless SwiftShader, 402x690 page)
- Market robbery film, same frames: draw calls 90/147/117/115 -> 62/121/88/86 (-26..-29); triangles -90k (838k -> 748k at 11.5 s).
- Low quality, same frame: calls 116 -> 88, triangles 838k -> 748k.
- Street fight: calls 120-125 -> 95-96, triangles -84k.
- Frame times: NOT conclusive. The machine ran at load 12-16 on 4 cores (other agents); interleaved same-page renders gave
  on/off ratios between 0.78 and 1.25 run to run (`perf.log`). No phone measurement.

## Remaining / next
1. KO close-ups: `KEEP=1 node qa/fang-trellis/tools/superfilm.cjs <out> street` (the close renders now render the top scene; the
   first try rendered the rig's parent group only and came out black). Check head on the ground / crawl.
2. Run the tests (interrupted by the pause, none failed before the kill):
   `bash scripts/run-tests.sh -j 2 market fang cast story portrait offline` and
   `node tests/sunday-punch.test.cjs`, `super-punch-film`, `ringless-release`, `city-assets`.
3. Known look limits: the TRELLIS head is blue-grey while Fang's body/arms stay neutral grey (visible in the tank top fight);
   mouth stays closed (no jaw/talk on this head, no face squash on the Super Punch impact, the head still jolts with the bone);
   in the KO-down studio pose the longer muzzle dips into the chest like the old one did.

## Checks run
- story-cast-market, portraits, offline-version-match, city-assets, fang-head: ok (individually, before the pause).
- Full selection started, killed by the pause (no result).
