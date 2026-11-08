# F-006 — safe station return

Adds per-profile, versioned station setup metadata in its own device-local key.
World offers an explicit Return to station button. It restores selected species,
target, technique, routine and control role in a paused state. No elapsed time,
match snapshot, historical contact, reward, inventory or wallet state is restored.
A fresh workout starts through the normal training controls. During an unfinished
bout, the button is disabled; the preceding safe station remains available later.
This is a station checkpoint, not a promise of mid-fight or mid-workout recovery.
Full tournament checkpoints belong to F-009. Metadata is outside career exports.

`node tests/game-resume.test.cjs` passes schema/allowlist, profile isolation,
cloned lookup, quota rollback, corrupt/future preservation, stale assets and
30-profile bounds. Existing club, career-interface, domain and loadout checks pass.
The actual browser restores a rabbit/body-dummy/uppercut after reload, remains
paused with no active reward session, preserves wallet and empty activity history,
rejects a station switch during a live fight, and captures EN/HE/RU phone layouts.
`qa/station-resume/browser.cjs` reproduces that flow on localhost8126.
Offline pack reload passes with78 resources and cachefoundation-20261108b.

No renderer, rig, contact, score, audio or animation changes. Physical phone
performance is unverified. Source and app handoff is updated in the existing PRD
chain using verified R2 deployment28f959b; newer release links follow publication.
Rollback UI: `?game=classic`; removing the optional module leaves career untouched.
Current catalog removal safely returns to World instead of restoring an invalid
clip. Future or corrupt resume data is preserved and cannot lock career access.
