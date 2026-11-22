# Checkpoint: Super Punch (GOTR-0088 follow-up, owner 2026-11-22)

Branch `agent/super-punch` (from v1.87 `37247bc`). Not merged, no version bump, no PR.

- **Slice 1 (rename):** every player-visible "Sunday Punch" is now "Super Punch" (pad button and aria label, KO caption, Shop name via `game-domain.js`, glossary term, Chapter 1 recap line EN/HE/RU). Internal ids stay (`sunday_punch`, `gotr-sunday-punch-seen`, ledger `purchase:finisher:sunday_punch`, `window.SundayPunch`), so saves stay valid. `tests/sunday-punch.test.cjs` expects the new name.
- **Next:** knockout film variants (camera choreography, slow motion from glove contact, face squash, blackout), winner celebrations, scene endings in ringless venues; tests; Playwright contact sheets in `qa/super-punch/`.
- **Checks:** see below as slices land.
