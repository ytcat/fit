# Render realism · checkpoint (branch `agent/render-realism`, GOTR-0017)

Owner 2026-11-22: "Do whatever you can to improve the graphics … as much realistic as possible, with existing capabilities and
free quota." This branch: renderer, lighting and materials only — no geometry, character bodies, gameplay or saves; no
`setIndex`. Base: `claude/ecstatic-clarke-9as2ak` da5607b (v1.91 + Blender props). Not merged, no version bump, no PR.

## What was already there (investigation)
The engine renderer (index.html) already had sRGB output, ACES Filmic, `physicallyCorrectLights`, PCF-soft shadows and an
adaptive quality ladder (levels 0-6: pixel ratio, shadow pass 1024/2048; level 0 = no shadow pass). Films (dream-scenes.js)
use the same renderer with per-set hemisphere + sun lights; `DreamScenes.quality('auto'|'high'|'low')`. What was missing:
any image-based light (no `scene.environment`; metal went black, gloves/eyes/glass had no reflections, only the city GLBs had a
tiny gradient env), directional ambient indoors, practical lights, contact shadows in fights without a shadow pass or on the
built venues' baked (unlit) floors, and the key light's shadow box covered ±5 m for a 3.5 m ring.
Colour audit: canvas colour maps, set vertex colours (`C()`), venue palettes, arena-set bakes and GLB maps are all sRGB→linear
correctly; data maps (bump, pores, roughness) are linear on purpose. Character material hex colours are authored as linear
values and were tuned on screen for months — left as they are (changing them would change the approved characters' look).

## What changed
1. **`render-look.js` (new, loaded right after three):** a procedural PMREM environment per place (no download, RGBE 8-bit,
   works on WebGL 1). Its sky and ground are the place's own HemisphereLight colours (a sky/ground step convolves to exactly
   the hemisphere light's Lambert term) and a share R (0.7-0.85) of each hemisphere is MOVED into it — an "anti" hemisphere
   light at −R × the original rides along — so the tuned light level stays and the light gains direction and reflections.
   Looks: `day`, `market` (street canyon, sun-side facades lit), `shop` (cream room, open door, front window, three lamps),
   `gym` / `gym_evening` (tall windows on back and right walls, six enamel lamps), `hall` (engine: lit truss, warm/cool rims),
   `street_night` (built street, basement, docks venues), `boxing_club`, `arena`, `studio` (Shop preview). Material families:
   metal 1.15, fur / painted skin 0.92, wet dark leather (noses, lips) 0.5, the rest 1; city GLB materials that brought their
   own bright sky keep their ambient level (intensity raised by their old env's share). Everything is given back on `high(false)`
   and `dispose()` (lights, environment, envMap/intensity, exposure, hooks).
2. **Light rigs:** Bruno's gym — the sun comes in through the right-hand windows (every tier, no cost) + the two enamel lamps
   nearest the action as warm point lights (high); Otto's shop — two warm practical lamps (high), exposure 0.97; street,
   market — sky + facade bounce from the environment; ring — the env's truss and rims; Docks film untouched (already tuned).
3. **Shadows:** engine key light box fitted to the ring in a fight (±3.2 m instead of ±5 m: 2.4× texel density, same map);
   films on a high look indoors/market use the shot-fitted box the street film had (same 1024 map, ~1.4 cm texels instead of
   ~3 cm). Contact shadows (two feet + body ellipse per fighter, one under the referee) when the shadow pass is off (level 0)
   and on the built ringless venues whose floor is baked and takes no shadow — on every tier.
4. **Tiers:** films — `low` = exactly the old lights (no environment, no lamps); `high` = the look; `auto` = the look, dropped
   (with the street film's own auto drop) when the first second runs under ~30 fps. Engine — environment from adaptive level 2
   up (a struggling device gives it up first, before resolution and the shadow pass). No full-screen post effects: in three
   r128 a post chain renders into a target without the canvas MSAA (jaggies) and costs fill rate on phones; the existing CSS
   vignette of the films stays.
5. `game-presentation.js`: the Shop preview studio gets the `studio` look (softbox, rim strip) instead of copying the engine's
   environment on top of its own hemisphere light. `dream-scenes.js`: look per set, `run.look` for QA, cleanup.

## Numbers (headless Chromium + SwiftShader, 402×690, iPhone 13 UA; shared 4-core machine at load 5-17 — times are noisy)
Picture (qa/render-realism/picture-numbers.json; mean luma 0-255 / RMS contrast / max clipped ≥250 / max crushed ≤6, picture
area only), high: opening 82.4→84.4 / 43.5→42.0 / 0→0 % / 16.0→13.4 %; market 79.6→81.6 / 47.5→46.5 / 0→0 / 8.3→6.8;
Otto's shop 90.8→98.8 / 55.1→54.4 / 0→0 / 4.6→0.8 (lamp-lit ceiling); gym talk 102.6→100.2 / 61.4→59.4 / 0→0 / 0.7→0.3;
ring 60.1→62.9 / 49.5→50.6 / 0→0 / 0.6→0.5; street fight 64.5→64.7 / 46.4→46.7 / 0.08→0.07 / 1.2→1.2.
Low: films identical (gym −4 %: window sun direction), fights ±1.6 % (contact shadows).
renderer.info: films same draw calls and triangles on both tiers; fights +4…+7 calls (contact shadows: transparent quads);
+2-3 textures (environment target, shadow texture); +1 hemisphere light (the moved share) and up to 2 point lights on high.
Cost, paired in ONE page (look on/off alternately, 6 rounds, each the median of 8 renders + 1-pixel read; `ab.cjs`):
films high — best-of ratio opening ×1.11, market ×1.12, Otto's shop ×1.21 (env + 2 lamps), gym ×1.12 (median ratios 1.27,
1.10, 1.28, 1.05). fights high (`hall` / `street` look) — ring ×1.15 best / ×1.11 median, street fight ×1.13 / ×1.16 (with its contact shadows). Fights low (level 0, contact shadows only): ring ×0.96 / ×0.99, street ×1.01 / ×1.04 — within the noise; rAF interval under CDP 4× CPU throttling: ring 883→917 ms, street 533→517 ms. Low: the films draw exactly what they drew before (same calls, triangles, lights; no environment
in the shaders), so there is nothing to time there.

## Evidence (`qa/render-realism/`)
`<case>-<high|low>.webp` (top before da5607b, bottom after; 402×690 frames): dream_opening, dream_market_robbery,
dream_otto_shop, dream_gym_talk, ring (Neighborhood Hall), street (Street Fight venue). `picture-numbers.json`,
`numbers-*.json` (renderer.info and frame times per frame), `ab-*.json` (paired cost), `fallbacks.json` (WebGL 1 context: the
film's look works, no errors; PMREM throwing: no environment, no moved light, lamps only, no errors, nothing left behind).
Tools: `capture.cjs` (ROOT=<tree> QUALITY=high|low), `ab.cjs`, `fallbacks.cjs`, `sheet.py`.

## Checks
`node tests/render-look.test.cjs` (new: share moved exactly, sky/ground radiance, families, city ambient kept, low = nothing,
practical lamps, hooks, engine contact shadows / level threshold / shadow box, film wiring). Full suite
`bash scripts/run-tests.sh -j 2`: on the final tree (e2137b0) files=149 fails=0 (1526 s); an earlier run under heavy machine
load (2c9d035) had story-clean-gym failing (known flaky under load; passed alone).

## Limits / next
- Not checked on a physical phone. SwiftShader runs the GPU work on the CPU; the high look's ~10-20 % is an estimate of the
  shader cost, not a phone measurement. `auto` films and the engine's adaptive ladder are the safety nets.
- The fight frames before/after are from separate runs, so the poses differ (the fight clock is not deterministic in QA).
- Character base colours left as authored (linear hex) — a deliberate choice, see the audit above.
- Next: owner review of the sheets; the integrator merges with the release checklist (version bump there, not here).
