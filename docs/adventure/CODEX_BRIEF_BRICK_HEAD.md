# Brief for Codex — Brick's head as an authored 3D model (GOTR-0082)

**From:** Claude (integrator, branch `claude/serene-cannon-riwk4l`). **For:** Codex, which owns authored art in this repository.
**Date:** 2026-11-13. **Owner's decision:** Codex sculpts Brick's head; Claude attaches it to the game rig and animates it.

## Why
Brick is the Chapter 1 boss: a tough English-bulldog heavyweight. His head is currently built from code (procedural
geometry in `adventure/story/story-cast.js`). The owner rejected four code-built versions; the last one (pictures
`qa/gotr-0082/brick-face-v3-*.webp` on branch `agent/dream-1b`) was called "terrible". The lower face (flews, jaw, teeth,
white muzzle) is the worst part. A sculpted model is needed to reach the bar the owner expects.

## What the owner wants (his words, 2026-11-13)
"Try to make it look as much as possible like a real bulldog boxer. Check every wrinkle on the face, look how enormous his
proportions are, how the eyes are positioned, the chin, the ears, the teeth, the shadows. Plus when he moves, the dynamics
of the face also change and move accordingly."

**References:** the owner has six pictures of bulldog boxers (front and three-quarter, fawn-and-white and white coats,
one with the mouth open showing the lower teeth). They are style and anatomy references only and are **not stored in the
repository** (they are third-party images). The owner will give them to Codex directly. Do not copy any picture, logo or
brand (one shows an Everlast waistband); Brick is an original character.

**Measured spec:** [`BRICK_HEAD_SPEC.md`](BRICK_HEAD_SPEC.md) — proportions, coat and face dynamics written from those six
pictures. Build to it; where the references and the spec disagree, follow the references and say so.

## Look — checklist
- Head as wide as it is tall; the jaw, cheeks and jowls are the biggest mass. Head set low and forward; the neck is wider
  than the head and merges into big trapezius muscles (no visible thin neck).
- Very short, flat, wide muzzle; a large broad wet black nose set back high, almost between the eyes.
- Eyes small, deep-set, low and wide apart, under a heavy permanent frown; dark rims; brown iris with a highlight; lids.
- Many deep curved folds across the forehead and skull, plus a thick "rope" fold arching over the nose. Real depth, with
  strong dark shading in every crease (bake ambient occlusion and curvature into the textures).
- Heavy flews (upper lips) hanging in soft folds on both sides, well below the jawline, overlapping the lower jaw; a dark lip
  edge and a dark mask round the nose and mouth.
- Undershot lower jaw, broad square chin; the lower lip and two lower canines visible with the mouth closed; when open: a
  row of teeth, dark gums and lips, a tongue.
- Small rose ears, high on the corners of the skull, folded back and slightly down, darker edge, pink inside; one torn.
- Loose skin and dewlap folds under the chin flowing into the chest.
- Coat: fawn head and back of the skull; white blaze up the forehead; white muzzle, chin, throat and chest; dark-brown patch
  over his left eye up to the ear (Brick's mark); a pink scar through that brow. Short coat with a slight sheen; no plastic
  look, no pale flat colour.
- Expression: a confident, grumpy fighter. Readable at phone size (the head is about 120–200 px tall in the gym talk and
  60–100 px in fights) — exaggerate the big forms slightly so they survive small sizes.

## Deliverable
`assets/characters/brick/` (new folder, Codex-owned):
- `brick-head.glb` — head and neck only, self-contained glTF 2.0, no required extensions (r128 loader, `assets/vendor/GLTFLoader.js`).
- `brick-head.blend` — editable source; build script under `scripts/authoring/` if procedural steps are used.
- `README.md` with the contract below, triangle counts and known limits; `manifest.json` like the street assets.
- Renders from the actual r128 loader (like `qa/city-art/`): front, three-quarter, side, back three-quarter, mouth open, and
  each blend shape at full weight → `qa/character-art/brick/`.

## Integration contract (so Claude can attach it)
- Units metres; **+Y up, +Z toward the nose (forward), +X to the character's left**. Origin at the base of the skull on the
  neck axis (the joint the head rotates around). Positive scale only; do not mirror (the game mirrors the whole fighter at
  its root, `scale.x = -1`, for the orthodox stance — Brick's eye patch will appear on the other side in fights; that is accepted).
- Size: about **0.66 m wide** jowl to jowl, **0.58 m** crown to the bottom of the dewlap (matches the spec). The game's
  head joint sits 0.12 m above the neck joint; Claude will scale and offset to fit.
- The neck/dewlap must end in a clean open ring (or a short collar) that tucks into the body's neck so no seam shows.
- **Skeleton in the GLB** (names exact), parented under one root bone `Brick_Head`:
  `Brick_Jaw` (hinge for the lower jaw, axis X), `Brick_Brow_L`, `Brick_Brow_R`, `Brick_Jowl_L`, `Brick_Jowl_R`,
  `Brick_Dewlap`, `Brick_Ear_L`, `Brick_Ear_R`, `Brick_Lid_U_L`, `Brick_Lid_U_R`. Skin weights smooth so the jowls and dewlap
  can swing on springs (Claude drives these bones at runtime) without tearing.
- **Blend shapes** (morph targets, names exact) as a bonus if easy: `frown`, `snarl`, `talk_A`, `talk_O`, `hit_squash`, `blink`.
- Materials: standard PBR (base colour, normal, roughness; optional AO) with 1024 px colour maps at most; separate material
  for eyes (glossy) and nose (wet). Keep it to ≤ 5 materials.
- Budget: **≤ 40 k triangles** for head and neck, ≤ 6 MB GLB. The rest of Brick's body stays the game's own rig.
- Eyes as separate meshes (spheres) so Claude can aim them.

## Not in scope for Codex
Body, gloves, trunks, poses, fight animation, the spring physics and runtime face animation — Claude does those after
the GLB arrives. Please work on your own branch (like `art/character-brick-YYYYMMDD`) and leave game code untouched, as
with the city delivery.

## After delivery (Claude)
Load the GLB with a fallback to the current head, attach it to Brick's head joint, hide the code-built head, drive the jaw,
brow, lids, ears and spring jowls/dewlap, check the fight cameras and the gym talk at 402×690, and show the owner pictures
before release.

## Also requested (owner, 2026-11-13): heads for Fang, Mrs. Hazel and Otto
Same route, same contract (folder `assets/characters/<id>/`, bones `<Id>_Head`, `<Id>_Jaw`, `<Id>_Brow_L/R`, `<Id>_Ear_L/R`,
`<Id>_Lid_U_L/R`, eyes as separate meshes, ≤ 40 k triangles, ≤ 5 materials, r128 renders in `qa/character-art/<id>/`).
Bodies, clothes and animation already exist in the game (`adventure/story/cast-market.js`, branch `agent/cast-market`,
pictures `qa/gotr-0092/heads.webp` and `bodies.webp` there) — only the heads are needed. Order after Brick: Fang, Hazel, Otto.

- **Fang** (`fang`) — the robber the Fighter must beat in a bare-hand street fight. A big, mean grey wolf: long strong
  muzzle, black nose and lips, amber eyes with a cold squint under a heavy brow, tall pointed ears (left one notched), thick
  cheek and neck ruff, a scar or two; snarl with visible canines when the mouth opens. Reads as dangerous and as a fighter.
- **Mrs. Hazel** (`hazel`) — a kind older doe who runs a fruit stall. Unmistakably a deer, not a fox: long slender muzzle
  with a soft dark nose and a pale chin, very large dark eyes with lashes set on the sides of the head, long wide ears on the
  sides, a few grey hairs, gentle smile lines; she wears a headscarf (ears out through it). The current head reads as a fox.
- **Otto** (`otto`) — the otter who owns the boxing shop. Unmistakably an otter, not a bear: flat broad skull with tiny low
  ears (no round bear ears), wide blunt muzzle with big whisker pads and long whiskers, small dark eyes, sleek glossy fur,
  lighter throat; friendly, a bit fussy; reading glasses on his nose.
