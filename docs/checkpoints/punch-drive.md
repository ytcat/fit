# Checkpoint: punch drive and smooth hands (GOTR-0032, GOTR-0027)

Branch `agent/punch-drive` (from v1.87 `37247bc`). Not merged, no version bump, no PR.

## Root cause found
In Play the Fighter's guard was "cover" (`guardCover:1`): both technique guard positions sat inside the muzzle and
`clearOwnFace()` walked the gloves out by 15-27 cm every tick (rate-limited to 3.5 cm/tick for the guard hand, all at once
for the striking hand, switching between cheek and forward modes). That produced the guard-hand swing, the hitch before
every punch, the uppercut chamber jump (27-30 m/s for one tick) and most isolated velocity spikes. Hooks were fitted to
the mitt by a growing fraction, so the glove braked to ~5 m/s on contact.

## Changes (all behind `options.cheekGuard`, set only for the Fighter in training: `career-drills.js` mitts,
`training-arena.js` bag/shadow/dummy/sparring; fights and story scenes unchanged)
- `boxing-coach-v2.js`: striking glove leaves from and returns to its open guard; guard glove moves to a cover point in front
  of the chin that is already clear of the face (rest rear guard pre-cleared too); straights get onto the shoulder-target
  line first (quadratic sideways close) and the ready point uses a smooth maximum; fitted hooks move the authored arc onto
  the target by one offset fitted at 85 % of the swing, faster hip/rib drive (0.15 of the action), earlier and quicker return,
  lead hook turns 1.3x; rear uppercut loads wider (clear of the muzzle); striking-glove face clearance follows a critically
  damped spring (~14 ms); action switches are inertialized per wrist (critically damped, ~0.1 s) via `options.actionKey`.
- `career-drills.js`: `cheekGuard`, `actionKey`, mitt hook swing 0.17.
- `training-arena.js`: `cheekGuard`, `actionKey` for the hero.
- `tests/heavy-reference.test.cjs`: guard rule now "in front of the face, outside it" (<45 cm from the cheek point and
  <0.5 cm inside the face). The old 20 cm rule was only met with the guard glove 4-7 cm inside the muzzle in that automatic
  station (`qa/gotr-0032-v2/guard-cheek.cjs`).

## Evidence / tools
`qa/gotr-0032-v2/measure.cjs` (per punch and rapid sequences), `trace.cjs`, `guard-cheek.cjs`, `strips.cjs` + `compose.py`
(browser frames). `before-*.json/log` = 37247bc, `after-*.json/log` = this branch.

## Checks
- `bash scripts/run-tests.sh -j 2 coach pose mitt pads bag stance training`: files=13 fails=0 (final code 8e068b5+).
- Extra set (heavy-reference compact orthodox shoulder punch-feel contact career-drills fluid foot-plant generated
  fight-guard sunday dream): 23 files, 1 fail (contact: sparring guarded blocks) -> fixed by excluding sparring, contact
  passes alone afterwards. Full suite NOT run.
- `tests/offline-version-match.test.cjs` ok (version still 1.87).
- Media: `qa/gotr-0032-v2/pads-before-after.webp`, `heavy-before-after.webp`; raw frames were in the session scratchpad
  (regenerate with `node qa/gotr-0032-v2/strips.cjs <dir>`, ~1 h on a loaded machine).

## Next
- Review; hooks still below 8 m/s; bag jab first-contact elbow 130 deg; jab/cross/uppercut hip turn unchanged; fights and
  sparring could adopt `cheekGuard` after their own contact tests are retimed. Run the full suite before any merge.
