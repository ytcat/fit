# CODEX EXECUTION ENTRYPOINT — FIT V2 (IMPLEMENT IN SAFE INCREMENTS)

Repository: `ytcat/fit`. Authoritative specification: [`FIT_MASTER_PRD_V2.md`](FIT_MASTER_PRD_V2.md). Read it completely, including V2 Part II. This file is a compact control contract, NOT a substitute for the PRD.

## Objective
Transform the existing statically hosted Three.js-based RingFighter into FIT: Rise of the Champions — local-first free-to-play tactical boxing world. Implement genuine playable loops, not screens without behaviors. Preserve current combat realism, motion, camera, opponents, gym, training, sounds, language UI and career save. **No real money or paid functionality.**

## Workflow
1. Fresh fetch + audit open branches/PRs. Use isolated branch; do not change other agent's work. Establish SHA and baseline tests and screenshots. Read current repo and exact file paths; never assume React, backend, Vite or a newer Three.js than actually present.
2. Break Release A into tickets F-001 to F-010; for each make typed state contract, tests, completed implementation and before/after capture. Deliver first functional profile + match ownership + durable rewards before building cosmetic screens.
3. Then Release B F-011 to F-014: bounded rival memory, 2 useful tactics, JSON event packs, return digest. Prove behavior with seeded matches, not storytelling alone.
4. Release C F-015 to F-020 only after QA and visual parity on existing lion/rabbit. New fighters require mesh/rig and mobile verification; if not ready, ship richer variants of existing quality-controlled models rather than crude geometry.
5. Releases D/E require separate architectural review and backend/rights/ops prerequisites. Never claim they work in a static-only build.

## Release gates
- All existing regression tests pass; no breaking current fighter motion, outfit geometry, collision or saved career.
- Usernames displayed in announcements, results, leaderboard and local history.
- Credits earned and spent only once per verified event; Shop + Inventory persist after reload.
- Combo skill Library supports Training/Fight/Both/Vault states; points bonus requires verified performance.
- 3-minute playable objective available within 3 taps from homepage; pause/resume intact.
- Character stat sidegrades are fair; ranked modes normalized; no actual licensed characters/celebrity impersonations.
- Language support English/Hebrew/Russian and mobile responsive UI.
- Documentation includes screenshot evidence, benchmark, exact commit IDs, tests and rollback.

## Strict implementation architecture
Preserve current game engine. Make feature-flagged domain services: Profile, MatchRecord, RewardLedger, Wallet, Inventory, Catalog, SkillUnlock, Loadouts, WorldEvents, RivalMemory and Academy. Implement event schema plus migrations. All current results must flow through one immutable MatchRecord. Add no untrusted runtime content from external URLs. Bundle event packs and visuals locally.

## Creative & legal boundaries
Real-world flavor comes from original fictional seasonal events, never unlicensed recognizably famous people, Toy Story/Marvel characters, logos, likeness, music or war-against-nationality themes. Source links in PRD are engineering references, not licenses. No addictive punishments, paid gaming mechanics or fabricated push/online alerts.

## Output contract
A milestone PR is done only when its user journeys are demonstrable, tests/screenshots exist, save migrations pass and prior modes work. Commit completed work with a changelog and exact next milestone. Do not merely write a plan; implement the agreed phase systematically. Do not force merge concurrent branches.