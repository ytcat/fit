# Checkpoint: mop-night (GOTR-0099 night shift rebuild)

Branch `agent/mop-night` (from `claude/ecstatic-clarke-9as2ak` a42fa83, the v1.91 candidate). Not merged, not released; no
`version.js` / offline-worker bump (only `?v=20261122night` on the changed files and a regenerated `offline-manifest.json`).

## Owner requests (2026-11-22)
- "Rebuild again the game of mopping … something that graphically will look better … he will mop after everyone is gone, so you don't need the coach there and it should be at the night."
- "In mopping game emulate real body movement of the player, not just he is holding the mop."

## What changed
- `adventure/story/mop-core.js` — new rules, node-testable. Floor x 0.05..3.25, z -1.7..1.6 (between the ring corner and the
  bag mat) as a 5 cm grid of dirt laid from a seed: shoe scuffs (lines and pivot arcs, stubborn), chalk (easy), sweat drops,
  a trail of street-shoe footprints; three areas (by the ring, by the bags, the middle). The head follows the finger at
  ≤ 2.2 m/s; a far touch carries the mop first (no cleaning). The mop loads up with dirt; past 62 % it cleans less and lays
  grey streaks on clean boards (smears count as dirt again). Rinse: tap the bucket's button / drag the mop into the bucket /
  R; 1 s + the walk to the bucket. Clock 80 s from the first stroke ("before the lights go out"); long clean strokes
  (≥ 0.7 m) build a streak (+0.5 s, +1 s from ×4), each cleared area +3 s, at most +20 s. `marks` = % of the starting dirt
  gone; stars 25/50/75, mission id `clean_gym`, metric `marks`, wage 6/10/15 and the save format unchanged. Time up under 25 %:
  lights out, no stars, nothing saved.
- `adventure/story/mop-game.js` — the picture: night gym (hall lamps' glow and pools off; one hanging lamp with a soft beam
  and warm pool; the store room's light through a door left ajar; moonlight on the boards through the back windows; a
  skyline panorama with the moon in the windows; dark fog); no Bruno (roles: the Fighter only, street clothes). One floor
  canvas: dirt art masked by the dirt grid, wet darkening + cool sheen streaks masked by wetness (dries over 7 s), roughness
  map from the same wetness; smear streaks painted where the core laid grey water. String mop: handle, cap, steel socket,
  band, 46 ribbon strands (one dynamic geometry) that splay, trail behind the stroke and hang when lifted, a wet cotton
  shadow under them. Yellow bucket on casters with wringer (merged), wet-floor sign. Overlay: clock and mop gauge in the HUD
  card, Rinse button on the bucket (pulses when the mop is grey), Bruno's note until the first stroke, pops (clean stroke ×n,
  smear, clean mop, area clean), darkening at lights out; the lamp flickers in the last 10 s.
- Whole-body mopping (`mopBody` in mop-game.js): the mop's home is in front at his right; the body walks after it (≤ 2.2 m/s)
  and turns square to the work; feet are planted in world space and step one at a time (0.25 s, lifted 6.5 cm) to a wide
  staggered stance; chest turns toward the mop and with the sweep (adaptive bias so both hands reach), pelvis counter-turns,
  lean into the push and reach, knees bend, weight shifts over the planted foot. Hands: top (left) hand placed from its
  shoulder in front of the chest, lower (right) hand down the same line as far as the arm reaches; the handle is laid through
  both real grips. Rinse: carry, two dunks (bend), wring (press twice, strands twist), lift out; idle breathing; a tired
  stretch (mop standing, hand on the small of the back, look up) near the end and after the shift.
- `adventure/story/dream-pose.js` — optional `twist`, `hipYaw`, `shift`, a per-foot yaw in `feet`, gesture `pole`; defaults
  leave every other scene unchanged.
- `adventure/story.js` (note on the door / the Fighter alone / note on the desk, EN/HE/RU), `adventure/story-flow.js` (step
  text), `adventure/story/story.css`, `index.html`, `offline-manifest.json`, `docs/adventure/DREAM_HOOKS.md`, backlog entry.
- `tests/story-clean-gym.test.cjs` rewritten for the new rules; browser part plays the shift with real touch at 402×690.

## QA tools (`qa/mop-night/`)
- `launch.cjs` (serve + open + walk the story + `AdventureOldTown.launch(ctx,'clean_gym')`), `before.cjs` (old game pictures),
  `play.cjs` (bot: 1, 2, 3 stars, rinses with the Rinse button, checks save/wage/story), `body.cjs` + `strips.py` (whole-body
  metrics and frame strips: phone, side, 3/4), `grip-probe.cjs`, `lang.cjs`, `look.cjs`.

## Status / next
- See the latest numbers in the final section.
