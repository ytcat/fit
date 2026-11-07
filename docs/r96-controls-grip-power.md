# R96 — palm-up rope grip, phone controls and punch drive

Baseline: R95 `e7abc7cbe2255a42912d08b8fd8306a77064e39a`.
Final runtime: `e18bd08708083d9fcc7d0b6fac3b7de78596ccab`.
Isolated worktree `/workspace/fit-r96`; no other worktree edited.
[Actual app captures and raw results](../qa/r96/review.html).

## Changes

- Rope palms now face up through forearm pronation. The existing small wrist
  flex remains; boxing wrist orientation is unchanged. Paired handles turn with
  the hands, and connected bearing necks keep the cable outside the thumbs.
  Compact hand targets, shoulder motion, rope routing and foot timing remain.
- The training menu has three finite panels: Training, Moves & skills, View &
  sound. Eleven techniques and all six earned skill ratings fit together.
  All original selection/progress handlers remain. Combination cards use a
  12-card page with previous/next buttons; selecting one returns to the game.
- Manual Moves/Combos/Defence pages are directly accessible over the stage.
  All twelve action buttons are available by default, on opposite sides.
  Phone layouts constrain text/grid widths; no action-rail scrolling is needed.
- The round pause control uses an absolutely centred glyph, independent of
  inherited button text/pseudo-elements. Back to game is a full-width centred
  footer button instead of inheriting the 40-pixel close-button dimensions.
- Straight-punch extension is 0.19 rather than 0.23 normalized phase units,
  retaining smooth endpoint easing. Free practice and sparring use 12% more body drive.
  Heavy bag, dummy and fight retain their calibrated body-drive values. An initial uncapped trial failed the existing fight
  intrusion test; it was corrected without relaxing any collision threshold. A further regression found
  the heavy-bag cross too bent at contact (163.8°); preserving its calibrated
  drive restores 173.7° extension, within the unchanged 170–178° acceptance range.
  Applying extra body drive to hooks also failed the existing elbow-continuity
  gate; mode-specific power retains those authored target trajectories. The menu
  class assignment uses the existing className interface, compatible with the
  project’s minimal DOM test harness; the real-browser class is unchanged.
- Mitt power changes from .90 to 1.15, recovery from .31 to .25 normalized units.
  Registered contacts derive impulse and bounded pad recoil from incoming speed.
  Cushion compression remains capped. Same-hand mitt mapping and 1.2-metre
  partner root separation remain unchanged. Heavy-bag effective striking mass
  parameters increase; the bag's own mass and contact/release solver remain.

## Evidence and checks

The browser harness checks 320×568, 393×640, 393×844, 844×390 and 1100×950,
English/Hebrew/Russian, all three panels and combination paging. It measures
control rectangles and scroll extents. Another 48 cases cover four phone
viewports × shadow/mitts/speed-bag/fight × Moves/Combos/Defence: all 15 page/action
buttons stay within the stage, with separate rails and no rail scrolling.
Pause/resume clicks pass; the pause glyph has equal horizontal margins (14 px)
and vertical margins (13 px). These are Chromium viewport checks, not physical
phone validation.

Motion tests cover both species, four rope drills, palms facing up throughout
(palm normal Y > .65), outward bearing exits, tucked hands/elbows, bounded wrist
flex, grounded feet and continuous mitt poses. Independent swept diagnostics
check all continuous rope segments against posed protective volumes at 121 time
samples over two revolutions, for all eight species/drill cases.

The actual-mesh checker includes fur, skin, clothing, fingers and wraps, excluding
intended handle/bearing attachments. Eight lion snapshots pass with minimum
sampled centreline distance 39.79 mm and conservative spatial lower bound
37.29 mm; three rabbit snapshots pass at 27.38 / 24.88 mm. Cable radius is 4.5 mm.
This is CPU-deformed geometry at discrete times, not exhaustive continuous-time
GPU or physical-rope proof. The existing 18-mm sample threshold is unchanged.

All six heavy-bag punches still produce exactly one registered impact, release
promptly and leave the target coasting. In the same fixture, jab incoming speed
changes 5.36 → 6.21 and impulse 31.62 → 45.20; cross 6.22 → 7.92 and
69.03 → 104.03. These are simulation outputs, not human force measurements.
Automatic first-mitt contact occurs at .408 s versus .483 s in R95. Side/angle
captures link all shaders without page errors. Existing fight intrusion coverage
passes 12 strike/target cases (largest penetration 19.81 mm, existing limit21 mm).

Full-suite validation and timing evidence are recorded in
[validation.json](../qa/r96/results/validation.json); do not infer its outcome
from the targeted checks above.

## Limits and rollback

Physical iPhone/Android FPS, sustained thermals and audio have NOT been verified
in this environment. No new realism score, photorealism claim, face replacement
or audio upgrade is claimed. Existing manual uppercut-to-mitt scoring gap remains:
the diagnostic reports one real contact each for jab/cross/both hooks, zero for
both manual uppercuts, matching R95. No synthetic contacts were added to hide it.

The default deployed asset/controller pair remains intact; all modified runtime
references use cache version `2026110710`. R95 is the release rollback baseline.
Reproduction tools are same-origin/free Node, Playwright, NumPy/SciPy and Pillow
for QA only; there are no new game runtime dependencies or imported art assets.

## Performance observations

Rope draws remain 169 in the matched front view (159 side/back); submitted
triangles change 433,667 → 433,795, +128 for the two connected bearing necks.
No extra material/draw call is introduced by those merged metal parts.

CPU-only comparison below uses three interleaved fresh Node runs per revision,
GPU-padding path enabled in both, 12 warmup +120 sampled updates per mode.
Cells are medians of each run’s P50/P95 milliseconds. Shared-host/JIT noise is
substantial; these numbers do not establish a game-FPS improvement or phone gate.

|Mode|R95 P50/P95 ms|R96 P50/P95 ms|
|---|---:|---:|
|none|2.03 / 4.75|2.16 / 6.12|
|speed|4.63 / 8.07|2.59 / 8.40|
|rope|3.04 / 6.91|1.34 / 2.53|
|pads|6.57 / 10.54|2.67 / 4.77|

[Raw repeated timings](../qa/r96/results/performance.json). Browser shaders and
resource counts are measured separately in the render reports; no GPU frame
time, GPU-memory peak, full-fight sustained FPS or physical-device thermal result
was obtained. Initial single-run timings were noisy and are retained externally,
not used as proof of an optimization.
