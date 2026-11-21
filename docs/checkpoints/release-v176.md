# Fit v1.76 checkpoint (2026-11-21)

Branch `claude/ecstatic-clarke-9as2ak`, based on v1.74; merged with ChatGPT's v1.75 (`ee2c2e1`, same gym films and CI work).

## In this release
- Gym films 9–10 and the CI work came in through ChatGPT's v1.75 on main (`ee2c2e1`); this branch had merged the same `wip/combined-chapter1-qa-candidate-20261121` commits.
- `tests/offline-version-match.test.cjs`: worker, manifest and build script must name the same offline version.
- Approved referee "Fight!" EN/HE/RU from `audio/approved-sounds-staging-20261113` (`approved-fight-audio.js`, `fight-ui.js`). Opus plus AAC copies of the same recordings. Bell, punch and KO applause files were never imported; those keep the current sounds.
- Backlog statuses reconciled with RELEASES.md.

## Held back
- GOTR-0100 paws (`agent/street-clothes`): merged, reviewed, reverted — close-ups read as joined lumps.
- GOTR-0082 Brick authored head (`art/character-brick-20261113`): WIP study, owner verdict needed before attaching.

## Checks
- `bash scripts/run-tests.sh -j 4` — see the release row / session report for the result.
- `GOTR_REQUIRE_GYM_BROWSER=1 node tests/dream-gym-return.test.cjs` — passed in Chromium at 402×690 (touch-through, both tails, Skip, Escape, correct drill once).
- `node tests/approved-fight-audio.test.cjs` — passed.
- Not checked on a physical phone; Opus/AAC decoding on iOS not measured.

## Next
Owner review of films 9–10 and the referee voice on a phone; films 11 (Docks) and 12 (fight night); paws and Brick head art.
