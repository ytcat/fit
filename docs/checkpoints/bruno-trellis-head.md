# Checkpoint: Coach Bruno's TRELLIS.2 head in the game (branch `agent/bruno-head`, GOTR-0139)

Owner 2026-11-26: approved the TRELLIS.2 head ("yes"). Branch from `origin/claude/ecstatic-clarke-9as2ak` 7a6baa8.
Not merged, not released, no version bump. Round 2 (2026-11-26): main's review "NOT ready" (eyes vanish in the films, too big / a
mask on the shoulders, towel sliver at the neck, ragged brim, plain neck colour) addressed below.

## Round 5 (owner: "Bruno looked terrible ... improve the new one ... much more natural with more face details"): LOOK PASS, look sheets only
- Head (`tools/blender/bruno_head_game.py`, defaults = the shipped file): the 98k source's relief baked as a normal map (1024),
  the face unwrapped separately with 50% of the atlas, colour baked at 2048; real eyes (glossy ball, amber iris, pupil,
  catch-light, upper lid with a lash rim that blinks); dark chocolate fur (darker crown/back, warmer cheeks), warm cream muzzle
  and brows, wet slate nose (roughness .28, highlight), soft-sheen lips (roughness map); 122 alpha-tested fur cards (cheeks,
  chin front, ear rims, nape; MASK, two-sided, same as the cast's alpha-test materials); the muzzle cut along the lip line, a
  dark mouth pocket with upper teeth and tongue, a `jaw` morph on skin/mouth/fur; scale .63 -> .6 (chin and neck kept). Skin
  20k triangles, all 25k; 1.43 MB.
- Page (`adventure/story/cast-market.js`): `headFace` drives the jaw morph from his speech (StoryCast.talk's code mouth) or a hit,
  eased, and the lids blink on the rigs' rhythm (4.6 s); `HEADS.bruno.eyes` re-measured, `face: { jaw, blink }`; part names kept
  in `userData.part`. Cache keys: head `?v=2026112604`, cast-market.js `?v=20261126br5` (no game version bump).
- Tests: `tests/bruno-head.test.cjs` (file layout, jaw opens/closes with speech, lids blink, contact now also: no fur card inside
  the towel or the body, with the jaw where speech puts it; head vs towel still 0/0 over 97 frames); `tests/head-seams.test.cjs`
  probes the skin mesh (`brunoHead`).
- Look sheets (`qa/bruno-head/look-studio.webp`, `look-films.webp`, `look-films-close.webp`; `tools/make_look_sheets.sh`,
  `plan-look.json`). Join sheets NOT redone this round (main: look sheets first).
- Measured: see the report in GOTR-0139.
- Round 5b (main's look review: nose, body match, brows, cards): nose normal map replaced by pebbling + two nostrils, roughness
  .4; brows pushed in 5 mm, cream trimmed and dimmed 18%; fuller card strands (they vanished in the mips) and 20 front jowl cards;
  `bodyTint` (cast-market.js): while the model head is on, Bruno's paws (a tinted copy of the paw material) and bare wrists (skin
  colours, |x| .917-.945) take `HEADS.bruno.bodyFur` #4f3f34; the code head restores them. Paw vs cheek under the film light
  (gym talk 13 s): dE 0.8 (code head 5.6). Tests: bruno-head adds the paw/wrist tint and its restore.

## Round 4 (main's review: jowl into the towel when walking; frayed towel hem beside the whistle)
- Jowl, fixed at the contact on both sides: (b) the head (`tools/blender/bruno_head_game.py`): the cheek fur below the jaw line
  (head-frame y < `jowl_y` -0.005) wider than `jowl_x` 0.165 is drawn in over `jowl_len` 0.035 (300 vertices); the neck tube slimmer
  (`neck_rx` .185, `mid_rx` .16) and the fold column to match (`HEADS.bruno.fold.column.rx` .215). (a) the towel
  (`BRUNO_TOWEL.chamfer` .05 from y 1.66 over .09): its inner top corner on the chest is rounded off; `neckIn` .245 above y 1.72
  keeps the top clear of the neck. The towel itself is not moved; no walk-cycle change.
- Hem: the towel's inner front hem crossed the cardigan's open-front edge (its furry step, story-cast.js brunoClothes) and frayed
  there. Its inner edge now stays `openGap` 2 cm outside that edge on the chest: a straight hem from every view
  (`qa/bruno-head/towel-hem-front.webp`; the ragged green line left of it is the cardigan's own edge on the shirt, same with the
  code head).
- Test (`tests/bruno-head.test.cjs`): contact over 97 frames (every walking frame of gym talk, docks and fight night every 1/6 s,
  plus the head-seams poses), towel as the shader draws it (rig.skinPoint), the model by its world matrix (winding sign-corrected
  for the mirrored root): towel vertices inside the head 0, head vertices inside the towel 0. Negative control: the same build with
  `jowl_x=.5` (the old cheek) fails (13 towel vertices inside the head, 3 mm).
- Versions: head `?v=2026112603` (HEADS.bruno, offline manifest), cast-market.js `?v=20261126br4`; eyes re-measured
  ([-.0733,.2087,.2473], [.0734,.2081,.2472]). The script reproduces the GLB (sha1 1192c3a4).
- Sheets redone: all seams, towel-cord, towel-arm, chin, body, referee-face, portrait, gym-talk and apology frames and eyes, new
  `jowl-walk-before-after.webp` (rows code head / reviewed round 3 / now; walk at 3 moments, side, 3/4, below) and
  `towel-hem-front.webp`. `head-source-vs-game.webp` and `gym-referee-before-after.webp` are from round 3 (Blender/gym renders
  not redone; the change is below the jaw).
- Checks (round 4, final files): the same 29 related tests one at a time (`scripts/run-tests.sh -j 1 ...`, list under "Checks run
  (round 2)") -> files=29 fails=0 (1336 s), incl. bruno-head (contact 97 frames 0/0), bruno-head-eyes, head-seams (Bruno 229
  poses). Not checked on a physical phone. Full suite: integrator.

## Round 3 (main's review: towel and wave-off)
- Towel (`adventure/story/cast-market.js` `brunoTowel`, `BRUNO_TOWEL`): the rigid ribbon replacement is gone. With the model on, ONE
  towel: a skinned shell on the cardigan (the body's own bone weights, smoothed over the cloth; installed as a body surface so the
  anatomy morph, muscle definition, mass and shoulder corrective move it exactly as the cardigan under it). Centre x -0.155 on the
  chest and back (as before), out to -0.262 and gathered to 0.11 wide over the shoulder between the neck tube and the arm's root
  (no arm skin under it); both ends hang straight down (front to 1.33, back to 1.40), closed hems and ends, blue stripes; hems
  straightened, offset along smoothed normals, interior relaxed in its own plane and untangled (story-cast `untangle`), all within
  5 mm of where each point was made. With the code head the old towel shows (draw range), story-cast.js unchanged.
- Wave-off (`adventure/story/gym-fight.js`): the arc comes from `bruno.gestureAt.waveOff` when present (Bruno with the model: hands
  beside the head, x 0.38-0.56, never crossing over it); gym-fight's default arc otherwise.
- Neck tube: narrows under the collar at the front only (the step showed at the sides with an arm raised); the skin fold column is
  shallower (rx .23, rz .2 x 0.7) so the shirt and cardigan meet the tube instead of a trench.
- `index.html`: cast-market.js `?v=20261126br3`, gym-fight.js `?v=20261126br`.
- Tests (`tests/bruno-head.test.cjs`): towel one piece, its top surface closed (every edge shared, hems and ends walled); in stand,
  left arm raised and walk (rig.skinPoint, the shader's CPU twin): every outer vertex 7-15.4 mm from the cardigan point it was made
  from (limit 4-16 mm); fold-over: turned top-surface triangles below 10 mm2 in all (now 0.8 / 1.9 / 5.1 mm2: slivers where the skin
  itself has 7 / 0 / 22 turned); wave-off over its whole swing: no paw inside the head. head-seams: the wave-off with his arc.
- Checks (round 3, final files): the same 29 related tests one at a time -> files=29 fails=0 (1384 s). Paw probe: 0 paws inside
  the head in all nine films and the referee poses incl. the whole wave-off swing. The script reproduces the GLB (sha1 a45ed87f).
- Sheets redone: seams (6 poses x 6 views), towel-cord, towel-arm (left arm raised, walk, wave-off ends), chin, body,
  referee-face, portrait, gym referee, films (gym talk and apology frames and eye close-ups).
- Remaining: walking in the films (the head bobs), the model's jowl touches the towel's top corner beside the neck (the probe's
  nearest-vertex measure gives 2-3 cm of towel under the jowl at gym-talk/docks walking frames; seen as the jowl resting on the towel
  edge); lowering the towel's top 1.7 cm did not change it. Fixed in round 4 (above).

## What changed (rounds 1-2)
- `tools/blender/bruno_head_game.py` -> `assets/characters/bruno/bruno-head.glb?v=2026112602` (defaults; run:
  `<blender venv python> tools/blender/bruno_head_game.py -- assets/characters/bruno/trellis/bruno-head-trellis-source.glb assets/characters/bruno/bruno-head.glb`;
  reproduces the shipped file byte for byte, sha1 b59d3859):
  - 98.4k -> 16.1k triangles (head 14.6k + neck 1.5k), base colour JPEG 1024 + an emissive JPEG 1024 (black but the eyes), 0.49 MB.
  - Geometry: the source is thin walls (two sheets ~1.5 mm apart, the cap in layers): thickened inward, voxel-remeshed, cut at
    head-frame y -0.12, decimated, re-UV'd (Smart UV Project on a smoothed copy) and the colour re-baked from the source.
  - Size (round 2): scale 0.63 (was 0.70): cap top at head-frame y 0.448, the code head's cap 0.424 (+2.4 cm; was +7 cm); snout
    tip z 0.38 (code nose 0.35); ears x +-0.23.
  - Eyes (round 2): each pupil found in the bake; the iris (source shape) lifted x2.2 and warmed, the pupil dark, a catch-light
    painted; iris (x0.35) and catch-light (x0.95) also in the emissive map. Measured in the films (below).
  - Cracks: the source atlas's chart borders, inpainted before the bake; 16 px extended margins in the new atlas.
  - Neck (round 2): a tube from inside the skull into the body that tapers from the collar (0.2 wide, back 0.17) to a nape under the
    skull (0.17 / 0.15 at y -0.01), then widens into the skull; narrower under the collar. Fur texture (strands at the head fur's own
    contrast) on the colours of the jaw line; the bust's cut rim lies inside the tube and the body.
  - Brim (round 2): the lip's vertices smoothed (8 passes, 621 vertices: the remesh had left it lumpy), the underside and front edge
    one even colour from the cap's top (x0.78 / x0.85).
  - Colour: dark fur median matched per channel to his body (#6f4a31), variation softened; cap, muzzle, brows, nose kept.
- `adventure/story/cast-market.js`: `HEADS.bruno` (fold column zc 0, rx .2, rz .15, margin .7, from 1.75 to 1.78, maxX .2;
  `gestures.chin`; `eyes`: the pupils for QA/tests). Bruno's `finish` (story-cast.js def) is wrapped: `brunoTowel(rig)`,
  `authoredHead(rig)`, the ground rule. Every code head part is a head-joint child and leaves the render layers.
  - Towel (round 2): with the model on, the towel's part of the merged towel-and-whistle mesh is not drawn (draw range from the cord;
    whistle and cord stay) and `Bruno: towel (authored head)` shows: same terry cloth and path down the chest and the back, but over
    the shoulder it lies on the trapezius beside the neck (centre x -0.283, 0.13 wide, tilted with the shoulder): no contact with the
    neck. Code head back: the original towel back. story-cast.js unchanged.
- `adventure/story/dream-pose.js`: `rig.gestureAt[name]` overrides a gesture's hand target (Bruno's chin with the model).
- `adventure/story/dream-scenes.js`: films with Bruno wait up to 5 s; the opening asks for his head (the gym talk follows).
- Offline pack: `./assets/characters/bruno/bruno-head.glb?v=2026112602` (builder + regenerated manifest, version string untouched).
- `index.html`: cast-market.js `?v=20261126br2`, dream-scenes.js and dream-pose.js `?v=20261126br`.
- Tests: `tests/bruno-head.test.cjs` (round 2: two JPEGs + emissive map, model top within 3 cm of the code head's cap, towel swap
  and towel outside the neck tube, chin paw out of the muzzle), new `tests/bruno-head-eyes.test.cjs` (real page: gym talk 13 s,
  each eye mean luminance >= 25 and a catch-light >= 110; the reviewed build fails: 5.3), `tests/head-seams.test.cjs` covers Bruno
  (227 poses; fails with the v1.96 fold: 103 vertices out, 3.1 cm; and with the head built without its tube).

## Measured (round 2)
- Eyes, 9x9 px round each pupil in the film close-ups (402x402 from the film camera's side), facing frames, mean/max luminance:
  gym talk 13/21/33 s: code head 38.6-62.6/225; reviewed build 2.5-27.5/15-104; now 33.5-46.4/112-213. Apology 6/22 s: code head
  30-61/225; reviewed 1.9-8.8/13-51; now 39.9-44.2/203-215.
- Head top +2.4 cm over the code head's cap (limit 3 cm, test). Portrait: the cap clears the top edge.
- Paw probe `qa/bruno-head/tools/paw-head.cjs` (nine films every 0.5 s + referee poses): paws 0 inside, towel 0 inside the head.
- Draw calls (gym talk, same frames): 180/174 -> 160/154; triangles -37k.

## Join checks (evidence in `qa/bruno-head/`, tools in `qa/bruno-head/tools/`, sheets rebuilt by `make_sheets.sh <render dir>`)
- `seams-{stand,talk,walk,point,count,raise}-before-after.webp`: front, side, back, below (camera at chest height looking up), 3/4,
  back 3/4; top the code head, bottom the model.
- `body-before-after.webp`, `referee-face-before-after.webp`, `towel-cord-before-after.webp`, `towel-arm-before-after.webp` (left
  arm raised as referee, wave-off), `chin-gesture-before-after.webp`, `head-source-vs-game.webp`, `portrait-before-after.webp`.
- Real game: `film-gym_talk-eyes.webp`, `film-apology-eyes.webp` (rows code head / reviewed build / now, eye luminance in the labels),
  `film-gym_talk-frames.webp`, `film-apology-frames.webp` (402x690 framing), `gym-referee-before-after.webp`.

## Checks run (round 2, on the final files)
- `bash scripts/run-tests.sh -j 1 bruno-head head-seams hazel-head fang-head avatar-joins armpit-fold story-cast-market rourke-cast
  gym-ring-rematch gym-door-glass dream-gym-return dream-scenes dream-market-films dream-bag-break docks-films story-clean-gym
  offline-version-match pc-smooth-start portraits paws.test sunday-punch fight-corner-break story-flow adventure-story city-assets
  lang-generic super-punch-film fight-pause` -> files=29 fails=0 (1391 s; bruno-head matches bruno-head and bruno-head-eyes).
- Negative controls: `BRUNO_GLB=<v2026112601 build> EYES='[[-0.082,0.236,0.243],[0.082,0.236,0.243]]' node tests/bruno-head-eyes.test.cjs`
  fails (eye mean 5.3); `BRUNO_GLB=<build with tube=0> ONLY=bruno node tests/head-seams.test.cjs` fails (239 vertices out, 6.9 cm);
  the in-test v1.96 fold: 103 vertices out, 3.1 cm.
- The script with its defaults reproduces the shipped GLB byte for byte (sha1 b59d3859).
- Full suite: not run here (integrator).

## Remaining / known limits
- The wave-off now waves beside the head (it no longer reads as arms crossing over it).
- No jaw: closed smile, the head nods with the words. The eyes are still deep-set and small at film distance; they read (iris and
  catch-light), not big.
- The towel is narrower over the shoulder (11 cm) than on the chest (15 cm), gathered between the neck and the arm.
- The remesh softened the fur relief; the dark fur streaks at the back of the head (source) remain, softened.

## Next
- Integrator: full suite before release.
