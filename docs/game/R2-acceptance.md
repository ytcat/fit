# R2 — school loop and Fight IQ

Baseline: `eec73c500951b61ea73eb382acd9a8325891e6b9`. Isolated branch:
`lion/prd-r2-school-world`. Target: November 8 Phase 2 Fight IQ PRD §25A.
Runtime commit: `8395988`. Current main also contains the newer `GLORY_OF_THE_RING_START_HERE.md` chain;
its independent documentation is preserved. This milestone does not claim the
newer Release A–E backlog is finished.

## Delivered contracts

- World hub: identity, optional guide, 30–45-second practice deck, first facilities,
  three named rival profiles, original E01/E02 invitations and optional return digest.
- World tick: seeded, monotonic, seven-day cap; fictional rival practice only. No
  unseen player matches, absence penalties, passive wallet changes or lost inventory.
- Facilities: atomic unique purchase through existing ledger; floor marks, school
  board, recovery poster and meaningful practice shortcuts. No combat stat bonus.
- Events: registered same-origin content, actual ordered jab/cross/hook contacts or
  a genuine fight result; failed objectives remain available. Rival openings reuse
  existing move plans. Adaptive rival memory remains next-phase work.
- Fight IQ: 12 EN/HE/RU cards, six decision challenges with three seeded states each,
  six isolated rig illustrations, correct/incorrect explanations, free retry and
  optional transition into actual training. No player body tracking.
- Learning separates discovered/viewed/practiced/mastered decision knowledge.
  Six XP per distinct scenario, 18 lifetime credits maximum, no coins or combat
  attribute gains. Mastery needs three varied successes over at least two sessions.
  The immutable ledger and XP commit together; failed persistence rolls back both.
- Optional tips: Off/Occasional/On saved per profile, one spontaneous prompt per
  activity, cooldowns, calm reward screen only. Observational wording requires at
  least three unique real event IDs; otherwise the card is a general principle.
- A single renderer draws dedicated cached demo rigs. Live match state/bones remain
  untouched; camera and canvas restore on close. Failed construction cannot detach
  the live canvas. Reduced motion exposes frozen beginning/key/recovery controls.
- TRAIN / FIGHT / WORLD remain prominent. Fight IQ is optional inside training and
  World; wallet opens Club; World provides combo loadouts. Classic remains available
  with `?game=classic`.

## Evidence and reproducibility

- `node tests/fight-iq.test.cjs`: content/schema, seed/state grading, reward caps,
  startup with pending JSON fetch, evidence thresholds, cooldown/off, mastery,
  real CareerStore atomic rollback and persistence; no combat attribute gains.
- `node tests/game-world.test.cjs`: migration, tutorial steps, facility ledger,
  deterministic seven-day catch-up, rival/event provenance, idempotence and profiles.
- `NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r2/browser.cjs` on port8124:
  two real 45s bag sessions, buy/equip, facility purchase, real three-contact E01,
  Circuit opening/result, seven-day return, locales and exact refresh persistence.
  The fight clock is shortened near its end for result UI integration.
- `node qa/fight-iq/browser.cjs`: actual screenshots, both correct/incorrect UI
  outcomes, one credit per challenge, paused live-fight isolation, locales/reload.
  Each illustration is sampled at 60Hz. Pose-only iterations skip renderer calls;
  screenshot frames are rendered by the actual app. Not a sustained FPS benchmark.
- `node qa/fight-iq/variants.cjs`: all18 variant animations, hand/foot IK, closed
  guard conditions, deliberate failed-rig recovery, clean localized phone preview.
- `APP_URL=http://127.0.0.1:8124 node qa/career-r1/offline.cjs`: install76 local
  resources, disconnect and reload actual app/model. Cache `r2-20261108c` (~21MB).
- Actual render review: `qa/fight-iq/review.html`, pose/resource summary
  `qa/fight-iq/results.json`, variant checks `qa/fight-iq/variants.json`.

## Honest limits and next work

The examples illustrate existing authored clips, not motion capture or instructor
certification. Prior federation citations are documented in repository research;
several cards remain pending technical source review and are labeled game examples.
C02 claims no hit, C05 is a scripted opening with visible glove gap, C06 steps and
resets rather than promising lasting displacement. No synthetic replay is presented
as an actual recorded match. The character art itself is not a new realism upgrade.

Software Chromium and phone viewport emulation only: NOT VERIFIED ON PHYSICAL
IPHONE/ANDROID. GPU memory figures are renderer resource counts, not driver bytes.
Lazy demo cache holds at most one additional rig per species; the paired example
costs roughly twice the solo submission count. Real-phone sustained FPS and thermal
behavior remain unverified. Arena/avatars and the live fight engine are preserved.

Next implementation follows the newer V2 ticket mapping: close foundation gaps
(F-005 six combos, F-006 resume, F-008 two venue skins, F-009 three-bout tournament,
F-010 resumable short missions), then bounded rival memory and Coach tactics.
The earlier R3 strategy/story objectives remain tracked, alongside the still-open
face/mane asset quality and physical-phone performance gates. Optional online
infrastructure stays deferred under both PRDs. Do not label the complete game done.

Rollback: `?game=classic` restores prior UI. Keep an exported save before rolling
back source; older code is not guaranteed to preserve newer learning/world fields.
