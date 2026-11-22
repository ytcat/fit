# Render realism · checkpoint (branch `agent/render-realism`)

Owner 2026-11-22: "Do whatever you can to improve the graphics … as much realistic as possible, with existing capabilities and
free quota." This branch: renderer, lighting and materials only (no geometry, bodies, gameplay or saves). Base:
`claude/ecstatic-clarke-9as2ak` da5607b (v1.91 + Blender props). Not merged, no version bump, no PR.

## Status
WIP slice 1: `render-look.js` (procedural PMREM environment per place, hemisphere share moved into it, practical lamps,
contact shadows at quality level 0, ring-fitted shadow box) wired into the engine (index.html) and the films
(dream-scenes.js). Untested in the browser at this commit.

## Next
- Baseline captures (before) running: `qa/render-realism/capture.cjs` against an export of da5607b.
- Then: after captures, paired cost (`qa/render-realism/ab.cjs`), calibrate brightness, sheets, tests.
