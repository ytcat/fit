# F-009 — Local School Cup

Baseline: `417ba187a2b09bc8857db7b57e9247e94fc67873`.
Branch: `lion/foundation-school-cup-release`.

World → **Local cup** now provides three actual 20-second Play bouts against original NPC identities using the existing lion/rabbit rigs. Each opponent uses an existing counter, outside or pressure tactic library; a cup preference survives multiple phrases, with the normal low-health/stamina retreat retained. Names, current player identity and results remain profile-bound. A title requires three saved Play wins. Losses and draws retry the same stage; Watch never advances it.

## State and result contract

- Optional `game.cup` schema1 initializes safely for earlier saves. It stores monotonic cup IDs, an active species/stage, bounded attempts, processed result IDs and the latest50 earned titles with their three canonical win proofs. Archive pruning does not prevent another cup; a52-cup regression verifies rollover.
- `{type:'cup',cupAction:'start'|'resume'|'bind'|'abandon'}` uses the existing atomic career transaction. Bind persists a new match ID, current profile and stage before a fight starts, and returns a deterministic bout seed and canonical opponent.
- The existing career entry factory checks that binding/profile/species/stage/seed/opponent before capturing an entry. The descriptor is consumed once, including rejected setups, so training/legacy Fight navigation cannot accidentally reuse it. No live health, clock, contact or RNG snapshot is restored.
- Cup evidence is exactly `cupId`, `cupStage`, `cupOpponentId` plus ordinary match metadata. It cannot simultaneously carry an unrelated rival/event opportunity. Cup entry clears a stale opportunity.
- The ordinary immutable match record and standard XP/coin transaction are persisted first. In that **same** transaction, the cup validates the record and reward ledger, then advances or archives the title. Duplicate, wrong-owner, wrong-seed, Watch, missing or unbound records cannot grant a win. There is no additional cup reward transaction or combat-stat bonus.
- Failed storage writes roll back both rewards and cup progression. Pending results can be retried before another bout. Resume restarts the current stage, not an unfinished fight; imported profile IDs clear old pending entry metadata before rebinding.
- Live-fight entry/restart/abandon actions are guarded in both UI handlers and the cup start API. Existing normal fights are preserved. A fresh player with no equipped fight combinations sees direct Moves controls on cup entry.

The compact localized cup panel has three stage cards, retry/continue, Watch, safe exit and a paged earned-title archive. It retains all existing World sections, arena styles, station return and short-session behavior. The title is distinct from the purchased champion-style cosmetic belt. Model-loading/missing optional UI-core paths omit the cup panel instead of throwing; a saved cup whose core is unavailable is retained rather than silently trusted or overwritten.

## Actual evidence

`qa/cup/playthrough.cjs` drives **production Play input and collision/contact updates** against unmodified seeded NPCs. It injects neither health nor match outcomes. With cup seed74, the scripted controller completed six bouts: **win, loss, loss, loss, win, win**. Stages were **0,1,1,1,1,2**. Three recorded wins earned one title; the wallet had six ordinary reward transactions plus its original baseline (72coins /353XP), with no tournament bonus. Reload preserved the title. This is a scripted test, not human-played progress.

`qa/cup/browser.cjs` checks initial/live-entry guards, a contact-driven real bout and reload checkpoint. `title-layout.cjs` replays those captured actual match records into an isolated career fixture to inspect completed-title layouts; it does not claim another set of played matches. Entry and completed-title panels pass all nine EN/HE/RU layouts at393×852,320×568 and844×390. The old generic dialog selector overrode intended sizing; one scoped cup-dialog rule fixes the actual cascade rather than hiding controls. Expanded title details may scroll when deliberately opened.

```sh
node tests/game-tournament.test.cjs
node tests/game-tournament-integration.test.cjs
node tests/game-tournament-ui.test.cjs
node tests/career-interface.test.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/cup/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/cup/playthrough.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/cup/title-layout.cjs
APP_URL=http://127.0.0.1:8133 NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/offline.cjs
```

Full CI runs **76 suites**, asset references and JS syntax before publication. The offline pack contains **86 same-origin assets**. No new model, runtime dependency, remote service, light, per-frame geometry or paid package is introduced. Existing movement/contact/arena tests remain required. Physical-phone FPS, thermal behavior and driver memory are still **NOT VERIFIED**; scripted simulation time is not a device benchmark.

Rollback: revert the cup source/index/offline commits together. The optional cup data confers no extra rewards or sporting title through a cosmetic purchase. Export a current career backup before using an older build that cannot validate newer match evidence; never silently strip cup records from it.

This milestone does not complete the whole PRD or realism plan. F-010 training missions, later releases and the unsafe rope crossover remain separate. Preserve the next-task draft branches and inspect the current main before reusing them. End work at a tested published checkpoint and include its app link; ChatGPT account allowance cannot be read from these development tools.
