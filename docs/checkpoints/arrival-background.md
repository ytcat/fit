# Arrival background · checkpoint (branch `agent/arrival-background`, GOTR-0115)

Owner request 2026-11-22: improve the background of the bus-arrival shot (dream_opening 7.25–12.4 s) and audit the city's trees.
Base: `claude/ecstatic-clarke-9as2ak` (v1.87 + unreleased v1.88 UI fix, `8dbf08b`). Not merged, no version bump, no PR.
Camera, film timing, walking route (dream-core.js), collision and saves are untouched.

## What changed
1. **Bus-exit shot.** The round tree at (-6.4, -5.4) is an `ARRIVAL_TREES` site (form `broad`) planted by `CityAssets.dress`;
   the blue car at (-16, -2.45) is the compact-car GLB from `LAYOUT.cars` (painted '#3b7dd8', same half-turn as the generated
   car: parked with the traffic). `CityAssets.dresses(city, site)` is the single rule for who plants a tree site; dream-sets.js
   builds the generated tree / car only where the dressing did not (decided once at set build; a model that arrives later is
   used on the next play, never added to a running set).
2. **Asset pipeline.** `adventure/story/city-trees.js` (new script, in index.html and the offline pack): procedural `broad`
   (~3.2k triangles: wide rounded crown, trunk, limbs and twigs, irregular leaf clumps, colour variation, rounded crown
   lighting, light breeze in the shader) and `upright` (~2k, narrow). No new binary asset. Cars are merged per material
   (9 draw calls a car instead of 21) with a far copy beyond 14 m (vertices welded per facing, 44k → 16k triangles; two
   meshes, one visible; no re-index of a drawn mesh).
3. **City audit** (gloryland-map.js as the guide): Old Town (opening street, bus stop, gym front) = broad shade trees plus the
   three authored narrow GLB trees where they were; Market Row (market films, Otto's street, evening market alley) = upright
   trees plus the two authored GLB trees; the GLB fallback is now an upright tree (was a round one). Palms (waterfront,
   Downtown plaza, cove) and pines (hills, fort) stay on the map only: no film set stands in those neighbourhoods. Map unchanged.
- Tests: `tests/arrival-background.test.cjs` (new), `tests/city-assets.test.cjs` (GLB checks scoped to the authored sites).

## Measurements (headless Chromium + SwiftShader, 402×690, iPhone 13 UA; DreamScenes.stats; machine load ~16 on 4 cores)
Bus-exit shot, before (8dbf08b) → after, draw calls / triangles:
| t | high | low |
|---|---|---|
| 7.3 | 170 / 551k → 179 / 586k | 161 / 547k → 170 / 582k |
| 8.5 | 158 / 511k → 167 / 546k | 149 / 508k → 158 / 542k |
| 9.8 | 127 / 466k → 132 / 500k | 118 / 463k → 123 / 496k |
| 11.0 | 131 / 469k → 141 / 505k | 122 / 465k → 132 / 501k |
| 12.2 (next shot) | 131 / 496k → 123 / 517k | 123 / 492k → 115 / 513k |
Walk shots (low) +16…+19k triangles, calls +0…+9; Market film +1 call / +6.5k; Otto street +1 / +3k. Render time of a held
frame (8 renders with a 1-pixel read, median): low before 352–537 ms, after 323–431 ms; high before 1022–2025 ms, after
409–564 ms — dominated by the shared machine's load, so no regression is visible but none can be excluded by these numbers.
Duplicate probe (vertices of every drawn mesh inside 2.6 m of the car / 2.4 m of the tree): before only the generated street
batch (car, tree); after only the model car (far copy) and one tree (bark in the street batch + the set's leaf mesh); no
generated car vertices remain at -16, no second tree.

## Evidence (`qa/arrival-background/`)
`shot-high-before-after.webp`, `shot-low-before-after.webp` (top before, bottom after; 7.3, 8.5, 9.8, 11, 12.2 s),
`tree-car-closeups.webp`, `walk-before-after.webp` (16.5–27.5 s, low; frame 2 drifted to a neighbouring moment in the
after run), `sets-before-after.webp` (set-only street views: Old Town west/east, bus stop, gym front, evening market alley,
Market Row), `market-shop-before-after.webp`, `tree-forms.webp` (old ball tree, broad, upright, authored GLB),
`car-far-copy.webp`. Tools: `capture.cjs` (film frames + numbers + probe), `setview.cjs`, `trees.cjs`, `cars.cjs`.

## Checks
`node tests/arrival-background.test.cjs`, `node tests/city-assets.test.cjs`, `bash scripts/run-tests.sh -j 2 dream city street map
offline opening` → files=8 fails=0; `run-tests.sh -j 2 arrival docks adventure-story gym-door gym-ring market story-walk` →
files=8 fails=0 (2026-11-22, tree at the evidence commit).

## Limits / next
- Not checked on a physical iPhone. Shots with the blue car in view draw ~+9 calls and ~+34k triangles (the car's far copy,
  16k, and the leafy trees); a coarser far copy or merged opaque parts could trim more if a phone shows a cost.
- Trees are procedural (no GLB) so the "detailed asset vs fallback" choice for them is the script being present; the broad
  tree's breeze uses real time, not film time.
- Next: owner review of the sheets; integrator merges with the release checklist.
