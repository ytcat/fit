# Checkpoint: Brick's bag trial (GOTR-0077)

Branch `agent/brick-bag-trial` (from v1.87 `37247bc`). Not merged, not released, no version bump.

## Done so far
- Reproduced in the browser (`qa/gotr-0077/bag-trial.cjs`, 402x690): the old rules judged a press only by the clock (+-0.27 s
  around the "peak"), so hits counted while the glove stopped 32-42 cm short of the bag, and presses whose glove went 14 cm
  into the leather were "early". The bag hung with no chain, the stand's upright stood in front of it, Brick was a rabbit.
- New rules (`adventure/story/trials-core.js` BagTrial): a chain-and-bag double pendulum; Brick winds up and shoves; the punch
  lands where the glove's measured path meets the leather (impulse at that point), one punch per swing, step back from the
  bite after a miss. Tests `tests/story-trials.test.cjs`.
- New scene (`adventure/story/story-scenes.js` carry_bag): boom stand, swivel, chain, the new heavy bag (bag-break.js model with
  dents), Brick the bulldog holding/shoving/catching it with his hands on the leather, the Fighter in kit, a ring on the spot
  where the glove will meet the leather.

## Next
- Browser verification pictures (before/after contact sheets in `qa/gotr-0077/`), contact measurement per frame.
- `?v=` bumps in index.html for the changed files, `python3 scripts/build_offline_manifest.py`.

## Checks
- `node tests/story-trials.test.cjs` ok.
