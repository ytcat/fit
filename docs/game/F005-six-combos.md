# F-005 — six earned combinations

Baseline published R2: `28f959b`. Catalog change: `793c945`.

Adds Rolling Return (24 actual completed-activity defences) and School Signature
(150 actual completed-activity contacts), using the existing `combo_roll` and
`combo_super` controllers and exactly their authored sequences. No new rig,
physics, damage, paid content or automatic equip is introduced. Existing four
unlock routes, old saves, five Training slots and three Fight slots remain valid.
The two independent equip toggles provide Training, Fight, Both and Vault states.

Nine relevant suites passed: game-domain, game-loadout, career-progress,
player-input, player-combo, advanced-combos, club-interface, game-world and Fight IQ.
Tests cover six exact controller sequences, activity gates, spectator exclusion,
old-four ownership migration, quotas, persistence, profile isolation, separate
mode slots, locked/execution checks, and actual planted combo exits.
The published R2 baseline passed all66 suites and independent GitHub validation;
full CI runs again on this branch.

`NODE_PATH=/tmp/fit-tools/node_modules node qa/foundation-six/browser.cjs`
checks six library cards, independent equips, actual controller/rig execution,
phone width and errors. This UI fixture seeds valid activity records; it is not
claimed as five real played fights/workouts. Screenshots: `qa/foundation-six/`.
Physical phone performance remains unverified; avatar and arena geometry are
unchanged. Cache manifest is rebuilt for the updated module versions.

Next: F-006 safe station checkpoints, F-008 arena themes, F-009 persistent local
three-bout tournament, F-010 short missions. Full PRD is not claimed complete.
Rollback requires an exported save; older four-combo validators cannot read a
save containing either newly earned ID. Classic UI remains `?game=classic`.
