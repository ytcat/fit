# Avatar joins audit (2026-11-25)

Owner rule (AGENTS.md, 2026-11-25): "all joins, not just head ... hands, neck, legs, arm pits, muscles". Every character on the
game rig was built exactly as the page builds it (same scripts, the rabbit body and the shoulder correctives) and checked in
two ways:

- **Pictures** — `qa/avatar-joins/studio.cjs` / `batch.cjs`: the rig alone in a lit studio in Chromium (SwiftShader), phone
  viewport 402x690, close-ups of the neck, both shoulders/armpits, elbow, both wrists, waist, hip, knee, ankle and tail root,
  each from the front, side, back, below (camera at chest height looking up) and 3/4, plus full-body frames. Poses: rest
  (bind), guard, hook, uppercut, knockdown (boxers); idle, walk, talk, arms up, mop (everyday); the referee count (Bruno).
  ~6,400 frames before and after; the sheets below are cut from them (centre crop of the phone frame).
- **Numbers** — `qa/avatar-joins/audit.cjs` (CPU skinning = the vertex shader, `rig.skinPoint`): edge stretch and folded
  triangles per bone region, new sharp creases, hands under the body, arm skin inside the trunk, rigid part gaps;
  `covers.cjs` (skin through what covers it); `joins-lib.cjs` + `measure.cjs` (the numbers the test uses).

Characters: the player's Fighter (lion and rabbit) in the boxing kit, the street hoodie and jeans with bare paws, and the
docks track pants with hand wraps; Mack (the rabbit rig in the kit); Bruno; Brick (current model, on hold: only breakage);
Fang in his jacket and in his fight top; Mrs. Hazel; Otto; Rourke. The referee (rhino, its own sculpted model), the crowd and
the street walkers (low-poly, far from the camera) and the dog walker were not part of the close-up pass (see "Not covered").

## Findings

Severity: **High** = visible to a player in normal play or films at phone size; **Medium** = visible in close shots or from
below; **Low** = needs a deliberate close look.

| # | Character | Join | Pose | Severity | What | Status | Pictures |
|---|-----------|------|------|----------|------|--------|----------|
| 1 | Fighter lion + rabbit (kit), Mack, Brick | waist – shorts, hips – leg hems | every pose; below, side | Medium-High | Shorts were cut by capping the sculpt field: the cells along the cut left near-horizontal facets: a **saw-tooth leg hem** and a **jagged dark rim under the waistband**. 2,033 cap facets along the openings (Brick 2,230). | **Fixed** (`boxing-coach-v2.js`: fabric extracted past the openings and clipped exactly at .735 / 1.085; 0 facets) | `shorts-before-after.webp` |
| 2 | Fighter lion + rabbit (kit), Mack, Brick | wrist – glove cuff | every punch, guard, hits | High | The forearm came **out through the cuff front and back** (the .058 x .050 oval was narrower than the .055-.061 forearm): a ragged fur rim on the black strap, up to 5.9 mm, 1,815 vertices over the punch set. | **Fixed** (cuff opens to .066 x .062 at the elbow end, glove end unchanged; 0 mm) | `cuff-before-after.webp` |
| 3 | Fighter lion + rabbit (kit), Mack | shorts – side piping | walk, punches, knockdown | Medium | The gold piping was a rigid tube on the thigh bone: when the hip moved off the thigh it **sank into the shorts** (a dashed, saw-toothed stripe); 54 % of it under the fabric in the walk. | **Fixed** (one skinned tube seated 3 mm over the fabric, weights as the shorts; 6.5 % worst, the knockdown crouch) | `piping-before-after.webp` |
| 4 | Fighter lion + rabbit (street) | sneaker sole | walk (foot lifted), from below | Low-Medium | A **slit along the middle of the sole** (inner tread ring at 2 % width: 108 open edges). | **Fixed** (`street-wear.js`: the tread closes on the centre line; 0) | `sole-before-after.webp` |
| 5 | Every bare-chested rig: Fighter (kit, wraps), Brick, Fang (fight top), Rourke | armpit / shoulder fold | arms up (celebration, winner's raise), the lead uppercut | High | The skin **folds through itself** in the axilla: a bright jagged line along the armpit crease (side/below views) and dark pin-holes on the front deltoid–pec line with the arm raised. Not the fur, not the shoulder correctives (both switched off in tests: same picture). | **Open** — tried more linear skinning in the fold (x2.6): no visible gain. Needs a pose-space corrective for the raised arm or a collision-aware armpit pass (fit_realism-level work). | `armpit-skin-raised.webp` |
| 6 | Fighter lion + rabbit (street hoodie) | armhole (hoodie shoulder) | rest, guard, walk, punches | High | A groove down the hoodie's shoulder seam already at rest, and **slits/holes behind the shoulder** in the guard and the walk (the cloth folds through itself where the torso drape meets the sleeve tube). | **Open** — two attempts measured worse or no better and were reverted: (a) the skin's axillary correction applied to the cloth at its own height: folded cloth triangles in the armhole 415 → 1,080 (guard), 134 → 512 (walk); (b) armhole smoothing: rest groove less deep (sharp edges 1,159 → 820) but folds 415 → 462 (guard). Needs the armhole re-authored (separate sleeve with its own seam) or a cloth corrective. | `hoodie-armhole.webp` |
| 7 | Bruno (cardigan), Fang (jacket), Hazel, Otto (clothes on the skin's streams) | back armpit fold | walk, talk | Medium | Same fold as #5 under clothes: thin light cracks along the back armpit fold (Bruno most). | **Open** (same root cause as #5; the lift experiment above also increased creases on Bruno: 2,093 → 2,629 sharp edges idle) | `bruno-armpit.webp` |
| 8 | Fighter lion (kit, wraps, street) | whiskers – gloves/paws | guard, block | Low | Whiskers pass through the gloves / paws held at the cheeks. | Open | `misc-findings.webp` |
| 9 | Rourke | teeth – wrapped fists | guard | Low-Medium | The long snout's teeth cut through the wrapped fists in the high guard. | Open (pose/clearance for his snout) | `misc-findings.webp` |
| 10 | Fighter lion (street) | mane – hood | walk, guard (back) | Low | Mane locks pierce the hood on the upper back. | Open | `hoodie-armhole.webp` |
| 11 | Brick | head – neck | guard (side, back) | Low | A thin horizontal crease ring round the bull neck. | Open (Brick on hold) | `brick-seams-before-after.webp` |
| 12 | Fighter (kit, street), Rourke | tail root – shorts / jeans / trousers | all | Low | The tail comes straight through the fabric (no tail opening). | Open (design) | `fighter-kit-seams-before-after.webp` |
| 13 | Rourke | waist – work trousers | walk | Low | A jagged colour step / fringe along the trouser waistline. | Open | `rourke-seams-before-after.webp` |
| 14 | Otto | collar – neck | walk (below) | Low | Ragged edge of the shirt collar seen from below. | Open | `otto-seams-before-after.webp` |
| 15 | Fang, Hazel | TRELLIS head – collar ring | rest, talk, walk, guard | — | Audited only: handled by the other agent (`fix/hazel-neck`, merged into the release branch as 249f16c, `tests/head-seams.test.cjs`). Not touched here. | Other agent | `fang-seams-before-after.webp`, `hazel-seams-before-after.webp` |

Checked and clean in the tested poses: elbows (all), knees (all), ankles – kit boots and street/work shoes, wrists – paws and
sleeve cuffs (street, Bruno, Hazel, Otto, Fang), wraps over the paws (Fighter, Rourke), hips – thighs under the shorts, jeans
and trousers, the waistband over the shorts, Bruno's towel at the neck (no poke-through seen).

## Automated checks

`tests/avatar-joins.test.cjs` (Node, ~1.5 min): fails on the old code (first failure: `lion-kit: shorts openings ... {"worst":1,"steep":2033}`);
the numbers of each check on the old and the new tree are in `measure-before.json` / `measure-after.json`
(`node qa/avatar-joins/measure.cjs`, `ROOT=<old checkout>` for the old one):

| Check | Old | New | Gate |
|-------|-----|-----|------|
| shorts: near-horizontal facets along the openings (lion / rabbit / Brick) | 2,033 / 2,033 / 2,230 | 0 / 0 / 0 | 0 |
| shorts: openings exactly at .735 and 1.085 | — | yes | yes |
| glove cuff: forearm outside the cuff over 14 boxing poses (lion / rabbit / Brick) | 5.9 / 5.9 / 6.5 mm | 0 / 0 / 0 | ≤ 1 mm |
| side piping under the shorts (share, worst pose; walk, punches, knockdown, everyday) | 53.7 % (walkB) | 6.5 % (down) | < 10 % |
| sneaker sole: open edges on the underside | 108 | 0 | 0 |
| every variant (13): finite skinning, no vertex > 15 cm off its bone (spike) in rest + its poses | — | worst 10.5 cm (Rourke down) | < 15 cm |

## Not covered (honest limits)

- The referee (rhino, its own sculpt), the crowd, the street walkers and the dog walker were not close-up audited: they are
  separate low-poly or sculpted models seen at distance in play. Their joins are untested here.
- Real films/fights were not replayed for this pass; the poses are the rig's own boxing moves and DreamPose gestures (the
  same code the films and fights call), held still in a studio.
- No physical phone.
