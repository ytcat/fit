# Checkpoint: head–neck seams of the authored heads (branch `fix/hazel-neck`, GOTR-0126 follow-up)

Owner on live v1.96, pointing at Hazel's side view: "what is in her neck?". Rule added to AGENTS.md the same day ("Avatars and
character parts: joins must be checked"). Branch from the release branch (v1.96 live, 8d1af99; merged cab6332 with the rule).
Not merged, not released, no version bump.

## What was wrong (found, not guessed)
- Hazel: the ragged pale "ring" under her jaw was not the model: it was her own body skin. Her code jaw and throat start right above
  the cardigan (rest y 1.77-1.81, front z up to 0.3 m) and the skin fold under the model only began at 1.78 and eased in to 1.84, so
  the old jaw stuck out under the model's jaw (the model alone, rendered in Blender, has a clean throat there).
- Hazel's model also had, below the jaw, the source's neck with holes where the scarf faces came off, and the scarf's flared top rim
  lying on the collar at the back (red fragments over the collar).
- Fang had the same skin fault (fold from 1.79, eased to 1.85): a tan, ragged band under his jaw above the jacket and the fight top
  (`qa/hazel-trellis/fang-seams-before-after.webp`). His mane and ruff over the back and shoulders are by design.

## Fix
- `adventure/story/cast-market.js`: per character `fold.column`: the skin above the neckline goes into an elliptic column inside the
  model's neck (ellipse round x 0, z `zc`, scaled by `margin`), eased in from `from` to `to` (Hazel 1.745 -> 1.775: the dress
  neckline slopes in to meet the neck; Fang 1.775 -> 1.805, margin 0.55 so a tucked chin in a punch does not pull neck fur out). The
  whole head goes in; only the shoulder tops (|x| > maxX) near the collar stay. Knocked down, the model now nods up to 0.96 rad
  before it lifts (the lift pulled the throat stump out of the chest).
- `tools/blender/hazel_head_game.py`: the scarf removal reaches the scarf's rim (`scarf_top` -0.045); below `neck_cut` (-0.045) the
  source's neck is replaced by a clean elliptic tube fitted to the neck just above the cut (zc -0.065, rx 0.102, rz 0.112), from inside
  the jaw down into the cardigan; its colours are the neck's own (sampled round the cut, white throat in front, brown sides and back),
  painted as a strip into a free corner of the atlas. Face, kerchief and drape unchanged. Head file `?v=2026112502`.
- `tests/head-seams.test.cjs` (new): in every tested pose (Fang: stand, talk, walk, look in the jacket; guard, jab, cross, hook,
  uppercut, hit, knockdown in the fight top; Hazel: her two films every 0.5 s, talk, walk): (1) no body-skin vertex above the collar
  line sticks out of the model's own cross-section (5 mm); (2) the model's bottom ring (Fang: the throat stump) stays inside the
  torso (cut square to the chest); (3) Hazel: no flare out of the neck envelope below the drape's hem; (4) negative control: with
  v1.96's skin settings both heads fail (1). Run on v1.96's Hazel model (`HAZEL_GLB=...`) it fails (2).
- `tests/fang-head.test.cjs`, `tests/hazel-head.test.cjs`: the fold now starts at the neckline/collar (1.775 / 1.745).

## Evidence
`qa/hazel-trellis/neck-fix-before-after.webp`, `hazel-seams-before-after.webp`, `fang-seams-jacket-before-after.webp`,
`fang-seams-fight-before-after.webp`, `hazel-neckline-close-after.webp`, `fang-jab-tucked-chin-after.webp` (front, side, back,
below from chest height, 3/4; rest, talk, walk; Fang in jacket and fight top, guard), film close-ups before/after.

## Checks run
- `bash scripts/run-tests.sh -j 1 head-seams hazel-head fang-head story-cast-market portraits dream-market-films city-assets offline-version-match` -> files=8 fails=0 (289 s).
- head-seams on v1.96 Hazel model (`HAZEL_GLB=<v1.96 file>`): fails ("the model's bottom ring leaves the body at 5 points (worst 0.015 m)"); with v1.96 skin settings (in-test control) Fang 41 / Hazel 848 vertices stick out (worst 4.6 / 17.3 cm).
- Not re-rendered: the Super Punch knockout film after the larger knockdown nod (covered by fang-head and head-seams tests only). Full suite not run here.
