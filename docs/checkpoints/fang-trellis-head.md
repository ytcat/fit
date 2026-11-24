# Checkpoint: Fang's TRELLIS.2 head in the game (branch `agent/fang-trellis-head`)

Owner 2026-11-24: "fang looks good" (the TRELLIS.2 head, `assets/characters/fang/trellis/`). Not merged, not released;
no version bump (the release does that).

## What changed
- `tools/blender/fang_head_game.py` -> `assets/characters/fang/fang-head.glb`: the source bust welded (glTF seam splits), scaled
  0.88 m/unit into the head joint's frame (+Z nose, origin at the joint, dy 0.075, dz -0.03), cut at head-frame y -0.285 (below
  the mane tips, the stump sits inside the chest), decimated 96.7k -> 16.0k triangles, one 1024 px JPEG base colour, constant
  roughness 0.82, metal 0 (the TRELLIS metal map averaged 0.48: an artifact on fur). 0.77 MB.
- `adventure/story/cast-market.js`: `authoredHead(rig)` at the end of Fang's build; one download per page shared by every rig;
  `headOn(rig, on)` adds the model under the head joint, takes every code head part under the joint off the render layers
  (their `visible` flags stay with the face acting) and folds the skin's head/neck above the collar (y > 1.79, neck+head
  weighted) 62 % toward the neck axis in both outfit streams (restored exactly when off). Fallback: until the file is ready or
  when it fails the code head stays (never both). API `StoryCast.market.head { url, load, ready(ms), on(rig, bool), state() }`.
- `adventure/story/dream-scenes.js`: films with Fang wait for the head (max 5 s); `dream_apology` starts the download.
- `adventure/portraits.js`: ignores parts off the render layers, frames Fang's model face, waits (max 6 s) for the download.
- Offline pack: the head GLB is precached (`scripts/build_offline_manifest.py`); `tests/city-assets.test.cjs` now forbids
  city models only and allows small `assets/characters/<id>/<id>-head.glb`.

## Remaining / next
- Film, street-fight and portrait pictures; renderer.info and frame time before/after (402x690, low quality).
- Full test selection; push.

## Checks run
- story-cast-market, portraits, offline-version-match, city-assets: ok.
