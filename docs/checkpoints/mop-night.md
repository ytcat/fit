# Checkpoint: mop-night (GOTR-0099 night shift rebuild)

Branch `agent/mop-night` (from `claude/ecstatic-clarke-9as2ak` a42fa83, v1.91 candidate). Not merged, not released; no version bump.

## Owner requests (2026-11-22)
- "Rebuild again the game of mopping … something that graphically will look better … he will mop after everyone is gone, so you don't need the coach there and it should be at the night."
- "In mopping game emulate real body movement of the player, not just he is holding the mop."

## What changed
- `adventure/story/mop-core.js`: new rules (5 cm dirt grid from seeded stains: scuffs / chalk / sweat / footprints; mop load, smears, rinse incl. the walk to the bucket, 90 s clock + streak/area bonus up to +20 s, marks = % of starting dirt gone). Mission id `clean_gym`, metric `marks`, 25/50/75 stars and the 6/10/15 wage unchanged.
- `adventure/story/mop-game.js`: night gym (lights off, one hanging lamp, store-room light, moonlight through the windows, skyline panorama), no Bruno; floor dirt + wet sheen in one canvas texture; string mop with ribbon strands; yellow bucket with wringer, wet-floor sign; whole-body mopping (`mopBody`: planted feet and steps, twist, hip counter-turn, lean, knee bend, weight shift, both hands on the handle, rinse = carry, dunk, wring, straighten; tired stretch); overlay (clock, mop gauge, Rinse button on the bucket, Bruno's note, pops, lights out).
- `adventure/story/dream-pose.js`: optional `twist`, `hipYaw`, `shift`, per-foot yaw in `feet` (defaults keep every other scene unchanged).
- `adventure/story.js`, `adventure/story-flow.js`: note-on-the-door / Fighter-alone lines (EN/HE/RU).
- `adventure/story/story.css`, `index.html` `?v=20261122night`, `offline-manifest.json` regenerated.

## Remaining / next
- See the latest section below.

## Checks
- (filled in at each checkpoint)
