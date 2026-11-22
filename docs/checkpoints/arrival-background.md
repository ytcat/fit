# Arrival background · checkpoint (branch `agent/arrival-background`)

Owner request 2026-11-22: improve the background of the bus-arrival shot (dream_opening 7.25–12.4 s) and audit the city's trees.
Base: `claude/ecstatic-clarke-9as2ak` (v1.87 + unreleased v1.88 UI fix, `8dbf08b`). Not merged, no version bump, no PR.

## What changed
- `adventure/story/city-trees.js` (new): procedural street trees, forms `broad` (Old Town) and `upright` (Market Row); trunk,
  limbs and twigs as tapered tubes, leaf clumps with vertex-colour variation, rounded crown normals, gentle breeze in the shader.
- `city-assets.js`: `ARRIVAL_TREES` gains the round tree at (-6.4, -5.4) as form `broad`; `dresses(city, site)` decides who
  plants each site (dressing or generated set, never both); `LAYOUT.cars` puts the compact-car GLB at (8.4, -2.45) and, new,
  (-16, -2.45) painted '#3b7dd8', merged per material (9 draw calls a car instead of 21).
- `dream-sets.js`: fallback trees and cars only where the dressing did not place one. `market-sets.js`, `story-sets.js`: the
  generated `tree()` is the procedural tree (`broad` default, `upright` in Market Row), leaves one mesh per set.
- Tests: `tests/arrival-background.test.cjs` (new), `tests/city-assets.test.cjs` (GLB checks scoped to the authored sites).

## Status / next
In progress; see below for checks and evidence.
