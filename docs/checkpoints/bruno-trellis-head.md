# Checkpoint: Coach Bruno's TRELLIS.2 head in the game (branch `agent/bruno-head`, GOTR-0139)

Owner 2026-11-26: approved the TRELLIS.2 head ("yes"). Branch from `origin/claude/ecstatic-clarke-9as2ak` 7a6baa8.
Not merged, not released, no version bump.

## What changed
- `tools/blender/bruno_head_game.py` -> `assets/characters/bruno/bruno-head.glb` (defaults; run:
  `<blender venv python> tools/blender/bruno_head_game.py -- assets/characters/bruno/trellis/bruno-head-trellis-source.glb assets/characters/bruno/bruno-head.glb`):
  - 98.4k -> 16.2k triangles (head 14.6k + neck tube 1.6k), one 1024 px JPEG, roughness 0.85, metal 0, 0.48 MB.
  - Frame: scale 0.70 m/unit, dy 0.153, dz 0.03 (snout tip z 0.39, code nose 0.35; cap top y 0.50, code cap 0.42; ears x +-0.26).
    The TRELLIS head is taller than the code head (bigger forehead and cap), so Bruno is ~7 cm taller at the cap.
  - The source is thin walls (two sheets ~1.5 mm apart, the cap in layers): weld + decimate stopped at ~29k. It is thickened inward,
    voxel-remeshed, cut at head-frame y -0.12, decimated, re-UV'd (Smart UV Project on a smoothed copy: 110 islands) and the colour
    re-baked from the source.
  - Cracks: they were the source atlas's chart borders (dark speckle texels sampled along every UV seam). Chart borders inpainted from
    each chart's interior before the bake; the new atlas has 16 px extended margins; thin dark lines left in the light areas filled.
  - Neck: the source's slanted fur cone and ragged tips are gone; a clean tube from inside the skull into the body (-0.2), widening
    toward the occiput above the collar (thick bear nape, no hollow under the skull), narrower under the collar (never through the
    open cardigan front). The bust's cut rim lies inside the tube and the body.
  - Colour: dark fur median matched per channel to his body (#6f4a31), variation softened; cap, muzzle, brows, nose kept; the eyes
    keep their own colours and their dark texels are lifted x1.4 (the first recolour had turned them into flat fur: fixed).
- `adventure/story/cast-market.js`: `HEADS.bruno` (fold column zc 0, rx .2, rz .15, margin .7, from 1.75 to 1.78, maxX .2); Bruno's
  `finish` (story-cast.js def) is wrapped: `authoredHead(rig)` + the ground rule on his update. Every code head part is a child of
  the head joint (ears/nose/flat cap, brows, eyes, mouth, cheek ruff, brow tufts) and leaves the render layers; towel, whistle,
  buttons, paws, shoes, clothes untouched. `gestures.chin` (with the model on): the hand-to-chin gesture sits under the new, lower
  and longer chin (was 1-4 cm inside the muzzle in the gym talk and the apology film). `StoryCast.market.heads.bruno`.
- `adventure/story/dream-pose.js`: `rig.gestureAt[name]` overrides a gesture's hand target (only Bruno's chin uses it).
- `adventure/story/dream-scenes.js`: films with Bruno wait up to 5 s (generic `headIds`); the opening asks for his head (the gym
  talk follows).
- Offline pack: `./assets/characters/bruno/bruno-head.glb?v=2026112601` (builder + regenerated manifest, version string untouched).
- `index.html`: `?v=20261126br` for cast-market.js, dream-scenes.js, dream-pose.js.
- Tests: new `tests/bruno-head.test.cjs`; `tests/head-seams.test.cjs` covers Bruno (227 poses: nine films every second, talk, walk,
  point, hips, shrug, looks, referee count, wrist held high both sides, wave-off); negative controls: the v1.96 fold (59 vertices out,
  3.1 cm) and the head without its neck tube (`BRUNO_GLB=<tube=0 build>`: 59 vertices out at the back of the neck, 3.3 cm).

## Join checks (evidence in `qa/bruno-head/`, tools in `qa/bruno-head/tools/`)
See the sheets listed in the backlog entry GOTR-0139. Probe `node qa/bruno-head/tools/paw-head.cjs`: paws vs the head model in all
nine films and the referee poses (after the chin fix: 0 in the films).

## Remaining / known limits
- The towel's crest over the left shoulder runs into the base of the neck (story-cast.js routes it at y ~1.82 over x -0.07..-0.24,
  inside the neck before as well, where the code head's cheek ruff covered it). With the model the towel meets the neck in a clean
  line with a small white sliver at the crossing in close-ups. Lowering the crest made it worse (towel through the shoulder); left.
- The referee's Sunday Punch wave-off (gym-fight.js) sweeps a paw through the side of the head at the crossing, with the code head
  as well (pre-existing motion); not changed here.
- No jaw on this head: the mouth stays in its closed smile; the head nods with the words (DreamPose talk), the hidden jaw channel runs.
- The eyes are deep-set as in the source: visible as dark sockets with the iris, not bright.
- Bruno's head is larger and taller than the code head (film framing checked on the gym talk; other films not re-rendered).

## Next
- Integrator: full suite before release.
