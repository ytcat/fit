# GOTR-0050 (muscle-3): smooth, built body

**What changed:**
- **Volume:** the built-up volume (pecs, rib cage, lats, upper back, traps, delts, arms, forearms) and the muscle shapes are both low-passed in space. No feature is narrower than about 5 cm.
- **Displacement:** each vertex moves along a smoothed normal field, with a fold guard on top. Relief is capped at -6/+10 mm.
- **Shading:** crease darkening is 0.04 (it was 0.28–0.42) and the crest sheen is off.
- **Fur:** there are no strands on downward-facing torso skin.

**Defects in muscle-2 and their fixes:**

- (a) **Specks and flecks** came from mass being pushed along raw normals. Those normals cross in the mesh's sub-millimetre sliver strips, so the surface folded (99th-percentile normal angle about 157°) and fur strands caught the folds. Fixed by the smoothed normals, the low-pass and the fold guard.
- (b) **Dark smudge** came from crease darkening plus strands on shadowed skin facing downward. Both are now removed.
- (c) **Hard groove** came from a hard step at y 1.40 in the arm-mass function, plus the crisp borders. It is now continuous and low-passed.
- (d) **Pinched join** had the same cause as (c), plus local folding at the axilla. The smoothed displacement direction fixes it.

## Noise metric
The metric (`noise.cjs`, data in `noise.jsonl`) is the RMS angle in degrees between neighbouring vertex normals on the rendered surface. Lower is smoother. Values are for the lion, rest pose / guard pose:

| | torso | back | arms |
|---|---|---|---|
| v1.23 | 6.1 / 11.4 | 5.7 / 8.4 | 5.2 / 11.0 |
| v1.24 | 13.3 / 15.1 | 16.3 / 16.1 | 12.5 / 13.7 |
| muscle-2 | 27.0 / 27.8 | 21.9 / 19.4 | 23.2 / 20.2 |
| muscle-3 | 6.3 / 11.8 | 5.9 / 8.5 | 4.9 / 12.6 |

The rabbit's values are within 0.6° of the lion's.

## Girths
Girths are measured against v1.24 (`girths-*.json`):

| | Lion | Rabbit |
|---|---|---|
| Upper arm | +15% | +11% |
| Forearm | +13% | +10% |
| Deltoid | +11% | +8% |
| Chest depth | +11% | +8% |
| Waist | unchanged | unchanged |
| Calf | unchanged | unchanged |

## Evidence
- Sheets: `{lion,rabbit}-guard-sheet.webp`, with rows v1.24 / muscle-2 / muscle-3. The views are front, side, back, torso and a side close-up (the owner's crop framing). The back 3/4 close-up shows the lats and rear shoulder.
- Tests: `scripts/run-tests.sh -j 2 anatomy accessory muscle shoulder avatar mitt fight-range strike gear boot` gave files=15 fails=0. In `tests/muscle-definition.test.cjs` the mass is now stored as a vector and the carve depth threshold is 1 mm, because the surface is intentionally less carved.
