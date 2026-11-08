# R1 — School, earned economy and equipment

Source baseline: `ab412d0a468cc9a9b06404a0552ee8dcbf12f51c` (straight-fight fixes,
60 passing suites and matched browser comparisons). Target design is the unmodified
`docs/FIT_RISE_OF_THE_CHAMPIONS_MASTER_PRD_V2.md`, from the user-linked PRD branch.

## Implementation boundaries

| Requirement | Implementation | Evidence / gate |
|---|---|---|
| Username, school name, crest, philosophy | Existing device profiles + school editor | Browser EN/HE/RU and domain validation |
| One XP/coin source | CareerStore transaction + GameDomain immutable transaction IDs | Migration, exact-once replay, quota rollback tests |
| 12 earned cosmetic variants, 4 slots | Material variants for gloves, shorts, boots, waistband | Actual lion/rabbit material/geometry test; live 3D locker |
| Buy vs equip | Separate ledger purchase and owned-item equip actions | Wallet, profile isolation, refresh tests |
| 4 combo unlocks, separate Training 5 / Fight 3 loadouts | Verified completed-activity counters, execution-time gate | Actual controller/store tests; no automatic equip |
| 2-minute quick action | Existing fight engine with explicit 120-second override | Browser result/provenance integration gate |
| Real results and reward | Existing registered contacts, clock, scorecards and immutable local evidence | Fight/interface tests; Watch receives no coins |
| Save, backup, migration | Checksum envelope, previous-save recovery, preserved legacy source | Corrupt/future schema/quota/import tests |
| Offline | Optional 21 MB complete pack; same-origin versioned cache | Offline Chromium reload + actual local model |
| Existing interface | `?game=classic` | No new navigation or combo gates in classic |

These are local device observations, not server verification or cross-device accounts.
No paid service, new renderer, replacement skeleton, remote model, or runtime CDN is added.
School philosophy is identity/flavor in R1; tactical effects belong to R3.
Cosmetic items do not increase combat stats. The waistband is fashion, not a title.
Training accuracy describes in-game avatar contacts, not the user's physical exercise.

## Storage failure behavior

Awards and purchases commit atomically. A failed award retains the exact event and
ID in memory for `career.retryAwards()`; no coins, XP, ownership or success event
is granted before persistence succeeds. Pending events cannot survive page closure
when the browser provides no working persistence channel. Export backups before
leaving if the storage warning appears. A locked future save is preserved.

## Browser methodology

`NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/browser.cjs` loads the actual
app in Chromium and captures the school, a completed bag session, reward, purchase,
equip, live preview, loadouts and EN/HE/RU portrait layouts. Training advances the
real arena deterministically; it does not synthesize contact events. The quick-fight
clock is shortened near the end for UI integration. This is not sustained performance
or a complete two-minute human input playtest. Browser viewport tests are not physical
phone testing.

`NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/offline.cjs` uses a local
HTTP server, installs the complete pack, disables network, reloads and waits for the
real app and lion model. Rebuild manifest after shell changes:
`python3 scripts/build_offline_manifest.py`.

Run `for test in tests/*.test.cjs; do node "$test" || exit 1; done` plus JS syntax
and browser gates before integrating. Source review uses the repository's
quality-first routing skill. Remaining release results are recorded at publication.

## Remaining roadmap — not claimed complete

R2: facilities, tutorial, three-minute deck, three rival profiles, bounded return
digest and E01/E02. R3: editable tactics, evidence-driven rival adaptation, story
branches and tournament. R4: approved additional high-quality animated characters,
arenas, outfit authoring, replay and academy. R5: mentoring, lineage, leagues and
advanced challenge design. R6 online remains a separately scoped optional architecture.
Earlier authored face/mane realism and sustained physical iPhone/Android performance
remain separate unverified goals; this release does not claim a 75/100 visual score.

Rollback: use `?game=classic` for interface rollback. Keep a pre-upgrade exported save;
older application code cannot interpret new ledger state as full career data.

## Verified R1 checkpoint

All 64 current regression suites pass: the full 62-suite sequential run plus the
two material/loadout suites added during review. Browser integration, portrait /
landscape rendering, exact save reload, camera restoration and optional offline
reload pass. The bag run produced 55 contacts / 55 attempts, 102 XP and 35 Coins;
the first material variant costs 25. The controlled quick-bout test produces a
real engine result, stored evidence and Play reward. No console errors.

The actual scene before/after temporary locker preview submits 170 draw calls
and 498,663 triangles at the same portrait view. No added geometry, body/rig
changes or additional renderer. These counts are not a sustained FPS measurement.
Physical iPhone/Android performance, thermal behavior and new visual-realism
art quality remain unverified. See `qa/career-r1/review.html`.
