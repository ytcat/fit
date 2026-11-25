# Checkpoint: armpit-fold (GOTR-0127, AUDIT #5-#7: armpit / shoulder folds of the skin and of the clothes)

Status: READY FOR QA. Branch `agent/armpit-fold` (from `origin/claude/ecstatic-clarke-9as2ak` 8aa6ebb). Not merged, not
released, no version bump (the ?v= tags of the changed files and `offline-manifest.json` are updated).

## Root causes (measured, `qa/armpit-fold/axilla.cjs`: crossing triangle pairs of one surface in the shoulder region)
1. **The rest surface already folded.** `boxing-coach-v2.js` `sculptBody`: the torso relief stopped at a hard border
   (|x| = .30, y 1.12 / 1.70); the 7 % chest widening jumped ~2 cm there. The authored surface has 0 crossings, the sculpted
   one 436 along the front and back armpit folds (lion and rabbit): the crack / pin-hole lines on the deltoid-pectoral and back
   armpit lines that every pose then carried, the hoodie cut from it (slits, #6) and every cast body built on it.
   Fix: the relief fades out across |x| .24-.36 and at its top / bottom (monotonic in x): 0 crossings at rest.
2. **The "connected axillary surface" projection folded the pit.** `avatar-detail.js` projected the skinned armpit onto an
   implicit chest + arm surface (3 Newton steps, up to 3.5 cm). A projection collapses each normal line onto one point, so the
   chest and arm sides of the pit landed on the same sheet and crossed (visible back faces in mop / uppercut / walk) and made
   9 cm webs across the pit in the punches. Removed (GPU and CPU paths); the underarm normal frame stays.
3. **Clothes made on the skin's streams crossed themselves** (`StoryCast.dress`): 1-3 cm of cloth thickness along the normals
   in the concave armpit creases (Bruno, Fang, Hazel, Otto). Now the dressed surface fills the crease first (Laplacian, the
   pit region only) and a last `untangle` smooths any triangle turned over (> 100 deg); the hoodie (`street-wear.js`) gets the
   same untangle under the arm. Painted armhole seams were 6 mm on ~8 mm vertices (a jagged dark "crack", Hazel): 10 mm now.
4. The guard shoulder corrective was regenerated for the new rest surface (`assets/models/shoulder-correctives-v2.json`,
   max 1.8 cm instead of the 2.5 cm clamp); the exporter now hashes the rest surface where the corrective validates it
   (before `sculptHead`) - an asset exported after it would not load.

## Numbers (before = 8aa6ebb, after = this branch; `qa/armpit-fold/crossings.json`, `backface-counts.json`)
| | before | after |
|---|---|---|
| lion rest surface (authored 0) | 436 | 0 |
| lion, shoulder region: rest / arms up / winner's raise / uppercut / guard / walk | 1,769 / 2,256 / 2,733 / 2,132 / 1,762 / 2,418 | 0 / 177 / 140 / 320 / 386 / 238 |
| lion, all 29 poses | 74,062 | 8,659 |
| rabbit, all 29 poses | 70,457 | 8,221 |
| pit web (longest pit edge, punches) | 9.0 cm | 3.4 cm |
| hoodie armhole: rest / walk / guard | 740 / 751 / 1,492 | 4 / 11 / 444 |
| clothes on skin at rest: Bruno / Fang / Hazel / Otto | 1,922 / 1,435 / 1,102 / 204 | 0 / 0 (97 in the collar) / 0 / 0 |
| visible back faces, magenta px in 260 close-ups (lion / rabbit kit) | 66,867 / 68,550 | 361 / 260 |
| ... Brick / Rourke / Fang fight / Hazel | 16,756 / 41,375 / 9,051 / 16,205 | 588 / 1,831 / 2,062 / 2,537 |
| ... Bruno / Otto / Fang jacket (lapel fringe #16 included) | 4,502 / 11,712 / 18,377 | 3,256 / 7,222 / 10,503 |
| clothes on skin, walk: Bruno / Fang / Hazel / Otto | 4,889 / 3,192 / 1,083 / 838 | 1,299 / 1,164 / 22 / 344 |
Residual crossings are the arm pressed against the chest (hidden in the contact; the back-face check sees none there) and
thin folds of the thick cloth in the pressed front armpit (Bruno, Fang, Otto; in shadow). Edge stretch in the region, over
all poses (0.1 % / 99.9 % / max, posed / rest length): lion 0.11 / 5.6 / 34 -> 0.20 / 4.9 / 7.2; no character's stretch got worse (all 13 in `crossings.json`).
Bruno's folded-triangle count over all poses is flat (35,503 -> 36,298) while his crossings drop 94,748 -> 19,025: thin
folds inside the pressed front armpit of the thick cardigan (AUDIT #18).

## Evidence (`qa/armpit-fold/`)
- `<character>-before-after.webp`: every character, its poses, the moving shoulder from front / side / back / below / 3/4.
- `sequence-raise-lion-kit.webp`, `sequence-upper-lion-kit.webp`: the referee raising the winner's arm and the lead uppercut,
  9 steps, 4 views, before / after.
- `backface-counts.json` (visible back faces per frame, before / after), `crossings.json` (per character and pose).

## Tests
`tests/armpit-fold.test.cjs` (new, ~80 s; fails on the old tree: first failure "torso relief continuous across |x| 0.3 ...
11.1 mm apart"; old values also break every other gate). Ran -j 1, all PASS: armpit-fold, avatar-joins, shoulder-corrective,
muscle-definition, coach, avatar-surface, avatar-detail, avatar-normal-frame, shoulder-motion, story-street-wear,
story-cast-market, rourke-cast, accessory-gear-fit, head-seams, knockdown-floor, film-performance, offline-version-match.
Not the full suite. No physical phone.

## Tools
- `node qa/armpit-fold/batch.cjs <out> [variant ...]` (BACKFACE=1: visible back faces in magenta, `python3 qa/armpit-fold/count.py`),
  `node qa/armpit-fold/sequence.cjs <out> [variant]`, `python3 qa/armpit-fold/make_sheets.py <before> <after> <out> [seqB seqA]`.
  ROOT=<checkout> renders another tree.

## Open (AUDIT #16-#18)
Fang's ragged jacket front edge (pre-existing), the 11 % chest weight step at the neck base (y 1.76), thin posed folds of
thick clothes in the front armpit.
