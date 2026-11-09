# F-006 — safe station return (2026-11-09)

Baseline published app: https://ytcat.github.io/fit/?build=2e855e7.
Isolated branch: `lion/foundation-return-station`, based on `2e855e72c6caf7c05f38afb8f718eebba4f6c9cf`.

World now offers **Return to station**. It restores that profile's last training station, fighter, technique, routine and Play/Watch role, in a paused state. Starting the next workout uses the normal **15-second** default. An unfinished fight cannot be replaced through this action. This is station navigation, not recovery of an unfinished workout or live bout.

The optional versioned `ringfighter-resume-v1` key is separate from career data and exports. The schema excludes reward, wallet, timer, queue, match/RNG and contact state. Quota failures preserve the preceding checkpoint; corrupt/future data remains untouched; missing profiles or removed assets safely omit the return card. Passive page exit captures only changed setups, and model startup initializes its baseline without overwriting the prior station. Explicit fresh training clears transient rope tricks and player queues.

The compact return row preserves the current World tabs, redesigned store, accessories, short fights and existing training behavior. No rig, mesh, lighting, contact, audio or renderer change is included. There are no added WebGL draw calls or textures from this DOM/storage feature. Physical-phone performance remains unverified.

## Checks

```sh
node tests/game-resume.test.cjs
node tests/club-interface.test.cjs
node tests/career-interface.test.cjs
node tests/game-domain.test.cjs
node tests/game-loadout.test.cjs
node tests/player-combo.test.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/station-resume/browser.cjs
APP_URL=http://127.0.0.1:8131 NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/offline.cjs
```

The actual browser restores rabbit/body-dummy/uppercut after reload, preserves the checkpoint on an untouched reload/page exit, stays paused without a reward session, preserves wallet and empty history, confirms a fresh 15-second session, rejects station return during an unfinished fight, and captures English/Hebrew/Russian phone-sized layouts. The offline pack has **79 same-origin assets**. Full CI runs all 71 test suites before publication. Source-only review initially missed the bootstrap overwrite; the browser test caught it and the startup guard corrected it.

Rollback: revert this milestone's source/index/offline commits together. Removing these optional modules leaves career records, rewards and equipment unchanged. `?game=classic` remains available. No half-implemented crossover or other pending branch is included.

## Session handoff

User preference: end at a tested, published checkpoint and always provide its app link. ChatGPT remaining allowance is not available through the repository/runtime tools; do not invent a token balance or assume enough capacity for a large new milestone. Keep unfinished work isolated and do not merge it because usage is running out.

After this verified station milestone, pending work includes the unsafe rope crossover, F-008 venue integration, F-009 tournament integration, and later PRD/realism acceptance gates. Preserved branches contain earlier experiments and partial work; inspect their current state and coordinate ownership before reuse. The crossover has no enabled runtime path in the published bug release because arm/torso clearance failed. Do not call the whole PRD complete.
