# GLORY OF THE RING — CONTINUOUS FEEDBACK & FIXES

**Purpose:** This is the SINGLE permanent, append-only-by-default location for user-reported bugs, improvements, UI problems, gameplay corrections, and new feature requests. Keep the latest reports in this same file; do not create a separate PRD or random issue file for each report.

**Product name:** Glory of the Ring (working title).
**Code repository:** https://github.com/ytcat/fit
**Entry points:** [Agent instructions](../../AGENTS.md) · [Codex master index](../../GLORY_OF_THE_RING_START_HERE.md) · [Master PRD V2](V2/FIT_MASTER_PRD_V2.md).

## Mandatory operating workflow for Codex / development agents

1. **Every new coding session, before planning edits**, read this file and `AGENTS.md`; re-fetch the latest version immediately before choosing work. Other agents may have added updates.
2. Read all **OPEN**, **IN PROGRESS**, and **BLOCKED** items; reconcile with current code, PRs and known failures; prioritize blockers and regressions over cosmetic improvements unless instructed otherwise.
3. Treat reports as requirements to **investigate and verify**, not as proof a bug exists. Keep original report wording. Do not quietly drop, rewrite away, or mark a request as completed because the code merely changed.
4. Work on a safe branch. Preserve fighter quality, training modes, persistence and mobile performance; coordinate with concurrent branches and avoid merge conflicts.
5. For each issue, record status, exact commit/PR, evidence (test + screenshot/video where applicable), resolution and remaining work. Mark **DONE** only after validation on the actual app or relevant automated and visual checks.
6. For new suggestions, assess feasibility and scope (NOW / LATER / NEEDS INFRASTRUCTURE / NEEDS CLARIFICATION). Record reasons for deferral; do not silently reject.
7. At the end of a session, summarize completed items and the next OPEN items. Include a **verified** app URL if available. Do not invent a deployment link or claim an unmerged change is live.
8. Never overwrite or remove previously reported issues. Add new entries with stable IDs and timestamps; use GitHub's latest blob SHA when committing updates to avoid losing edits.
9. If a report conflicts with a core PRD principle (100% free, licensed content restrictions, fairness, safety or mobile viability), record the conflict and propose an alternative rather than implement it uncritically.
10. **The user can dictate changes conversationally.** An assistant with GitHub access should append them to this file and commit. Changes discussed only in chat are not automatically present in the repository until a successful commit.

## Status vocabulary
- **OPEN** — captured, not started
- **TRIAGE** — investigating / needs reproduction
- **IN PROGRESS** — active implementation underway
- **BLOCKED** — blocked; document why
- **READY FOR QA** — implemented but not verified
- **DONE** — verified and linked to evidence
- **DEFERRED** — consciously scheduled later, with explanation

## Prioritization
- **P0**: App not playable, corrupted saves, severe crash or high-impact regression
- **P1**: Broken core fight, training, controls, rewards or major visual defect
- **P2**: Significant improvement/new functionality
- **P3**: Polish and optional enhancements

## Issues / requests

<!-- Append entries below; keep issue IDs stable. Do not invent prior reports. -->

### GOTR-0001 — Make the shop immediately discoverable and feel like a real store
- **Reported:** 2026-11-09
- **Status:** READY FOR QA — finished in v1.17 (confirm step, badges, store look); user to review
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Shop / navigation / UX
- **Reported behavior / request:** The user struggled to find the place where equipment can be purchased; the current interface does not look like a shop.
- **Expected behavior:** A clearly labeled Shop destination accessible prominently from the hub and relevant inventory/character screens, with obvious categories (Gloves, Shorts, Shoes, Belts, Headwear, Accessories, Combos), currency balance, item previews, price tags, locked/unlocked/owned/equipped states, purchase confirmation and return-to-game path.
- **Acceptance criteria:** On phone and PC, a new player can reach Shop in no more than two obvious actions; browsing, previewing, buying and equipping are understandable without instructions. No dead buttons; virtual credits persist after reload; touch targets are comfortable and localization does not clip.
- **Implementation (2026-11-10, slice 1):** Investigation: a store already existed (categories, live preview, prices, owned/equipped, buy/equip, persisted coins) but its only header entry was an unlabeled "0 ◈" chip and the screen was titled "Equipment". The header chip is now a gold **🛒 Shop · coins** button on every screen (one tap), the screen is titled Shop/חנות/Магазин, and the EN "Waistband" category reads "Belts". Store logic unchanged (`game-shell.js`, `game-shell.css`).
- **Evidence:** `qa/gotr-0001/` — real-app checks in EN/HE/RU at 393×852, 360×640, 852×393 and 1366×768 on Train, Fight and World: button visible, ≥40 px tall, unclipped, not overlapped, no horizontal scroll; one tap opens the Shop with localized title and five categories; purchase without coins gives the actionable "Not enough coins…" message; equip persists; zero page errors. Purchase with earned coins remains covered by `tests/game-domain.test.cjs`.
- **Slice 2 (2026-11-10):** Found during QA: on PC/tablet the Shop showed only 2 of 4 products per category — square cards sized for portrait phones overflowed behind the buy row (`before-desk-products-cut-off.webp`, present on the live site). Products now use four columns on wide screens; six categories fit every layout (two rows of three on short narrow phones); product names no longer collapse in short landscape. Combos category added (GOTR-0004). Evidence: `qa/gotr-0001/layout-browser.cjs` — 0 issues (product outside/under the buy row, hidden name, clipped or overlapping category, scrolling dialog) across all six categories × EN/HE/RU × 1366×768, 1440×900, 820×1180, 393×852, 375×812, 360×740, 360×640, 852×393, 640×360.
- **Remaining for full acceptance:** clearer locked/owned/equipped badges, purchase confirmation step, and a store look closer to a real shop.
- **Slice 3 (v1.17, `agent/shop`):** one state badge per card and in the detail row (price, Owned, Equipped, or Locked with a short unlock hint; gold only for prices); confirm step before spending (item, price, balance after, Cancel/Pay; one tap to equip after buying); "Need N more ◈ — earn coins in training or a fight" when short; combo Preview plays the combo on the Shop's preview fighter with the move chips lighting in sync; accessory cards use the modelled thumbnails from `GameAccessories.icon`. New `shop.css`.
- **Evidence (v1.17):** `qa/gotr-0001/shop-states-browser.cjs` and results: a double tap on Pay charges once, Cancel spends nothing, chips light within one frame of the move timing, fight state unchanged by the preview, purchases survive reload, EN/HE/RU, phone/small/landscape by the agent and desktop by the integrator on the merged tree; `layout-browser.cjs` 0 issues on 9 sizes × 3 languages; full suite before publishing.

### GOTR-0002 — Redesign championship belts, headbands and side ribbons as real wearable accessories
- **Reported:** 2026-11-09
- **Status:** READY FOR QA — published in v1.15 (2026-11-11); user to review
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** 3D cosmetics / shop / rendering
- **Reported behavior / request:** The championship belt currently resembles a square on a ribbon instead of a recognizable champion belt; head and side ribbons also look like crude placeholders.
- **Expected behavior:** Distinct premium, realistic belts with curved leather strap, anatomical wrap, sculpted central plate, side plates, tasteful engraving/embossed detailing and proper attachment; layered and fitted headbands/side ribbons with convincing thickness, drape or cloth treatment, and attachment. Include multiple earned and purchasable variants, no clipping.
- **Acceptance criteria:** Belt silhouette clearly recognizable from front, three-quarter, side and rear views; proportionate for multiple animal rigs and clothing; fits during punches, footwork and camera rotation; mobile FPS preserved; store thumbnails accurately represent equipped result.
- **Implementation:** Not started; research and inspect real championship belts, combat headgear/bands and fighting apparel references before modeling. No unlicensed brand logos.
- **Evidence:** Pending real-life reference board and in-game multi-angle comparisons.
- **Delivered (v1.15, `agent/gear-3d-local`):** Two belts — `champion_belt` (crest plate with enamel, wreath, star, crown and banner on a black strap with back snaps) and new `heritage_belt` (round sunburst medallion, side plates, buckle); straps fitted to each rig's real waist. Two headbands — `headband` tied at the back with two tails and new `bandana` tied at the side; arm ribbons gain a knot and tails. One belt and one headband at a time; old saves load. Shop thumbnails exported as `GameAccessories.icon(item)` (wired in the Shop when the Shop agent merges).
- **Evidence:** `qa/gotr-0002/` (README with real-world references, front/three-quarter/side/rear renders for lion and rabbit, belt and headband close-ups). New `tests/accessory-gear-fit.test.cjs`: strap at least 14 mm clear of body and shorts in guard, all punches, slip, roll, step and jump rope, both rigs. Full suite 83/83 on the agent branch. Cost (lion): belts 7.0–7.8k triangles / 3 calls each (was 92 / 2), headbands 1.5–2.8k / 1–2.
- **Remaining:** head knot can look detached from the side on the lion; tails are rigid; the old surface-fitted arm band still has jagged edges.

### GOTR-0003 — Design a richer wardrobe and glove / shoe catalog using real boxing apparel references
- **Reported:** 2026-11-09
- **Status:** IN PROGRESS — boots delivered in v1.15 (classic high-top, mid-top, panelled with strap); gloves and shorts designs remain
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Clothing / character materials / shop
- **Reported behavior / request:** The shop has unattractive, generic green/yellow pants; shorts, gloves and shoes look like crude shapes or recolors. Add more genuinely designed items to buy.
- **Expected behavior:** Reference real boxing trunks (waistbands, contrasting side stripes, panels, satin or woven material, piping, stitching, logos original to the game), boxing gloves (cuffs, palms/thumbs, seams, laces or velcro, padding, boxing proportions) and footwear (high-/mid-top silhouettes, laces, sole tread, ankle support, accent panels). Create coherent collections by level/style, visible quality tiers and meaningful cosmetic choices; more optional headwear/wraps/robes/socks/accessories as feasible. Avoid rainbow palette swaps as the only difference.
- **Acceptance criteria:** At least three unmistakably different designed examples in each essential category (shorts, gloves, shoes) for first delivery, with documented expansion plan; item preview matches boxer; full-body animation without clothing holes, ugly stretching or interpenetration; smartphone performance and existing lion/rabbit quality maintained. Design and verify against referenced real-life silhouettes rather than inventing arbitrary shapes.
- **Implementation:** Not started; inspect available design/render pipelines and product image references before choosing geometry/material techniques.
- **Evidence:** Pending reference board, shop screenshots and animation QA.

### GOTR-0004 — Sell and unlock combos through the shop with equip slots
- **Reported:** 2026-11-09
- **Status:** READY FOR QA — finished in v1.17 (combo preview before buying, confirm step); user to review
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Combo shop / progression / inventory
- **Reported behavior / request:** User wants to buy combos with earned in-game currency as well as accessories.
- **Expected behavior:** Shop Combo category offering preview/demonstration, clear move sequence, mastery or progression requirement where appropriate, virtual-credit price, buy/owned/equipped states and separate Training versus Fight loadouts. Unlocks are persisted and purchases never double-charge. Combo access follows a clear balance policy (no unavoidable grind, no real money).
- **Acceptance criteria:** User earns sufficient virtual credits, purchases combo, equips it and can trigger it in relevant mode; states survive reload; invalid or insufficient-balance purchase gives actionable feedback.
- **Implementation (2026-11-10, slice 1):** Review: combos unlocked only through activity counters; Training (5) and Fight (3) loadouts, persistence and the input queue already existed. Added coin prices (First Rhythm stays the free first-activity unlock; Corner Turn 20, Counter Chain 40, Thunder Arc 40, Rolling Return 70, School Signature 120 — a 60-second session earns about 35 coins, so nothing needs a long grind and every combo can still be earned by play). New atomic `combo-buy` action writes exactly one `purchase:combo:<id>` spend row; save validation accepts an owned combo only if earned by activity or backed by that row at the listed price. Shop has a **Combos** category (sequence, price, Owned state, shortcut to loadouts); Combo loadouts shows the balance and a Buy button on locked combos. Move names in sequences are now properly localized (`game-domain.js`, `game-shell.js`, `game-shell.css`).
- **Evidence:** `tests/game-domain.test.cjs` — insufficient coins gives the actionable message, no double charge, Fight/Training equip, reload and backup/restore keep the purchase, later activity unlock neither duplicates nor refunds, forged unlock / wrong price / orphan purchase rejected, failed save leaves coins and ownership unchanged. `qa/gotr-0004/browser.cjs` — real app at 393×852, 360×640, 852×393, 1366×768: earn 105 coins from three real sessions → Shop → Combos → Buy 20 → balance 85 in Shop and header → Owned → loadouts → equip → the combo appears on the Combos page and runs → still owned after reload; EN/HE/RU labels; zero page errors.
- **Remaining:** animated demonstration of a combo inside the Shop before buying; purchase confirmation step; rollback note — a save containing a bought combo is rejected by app versions before this change.

### GOTR-0005 — Player-controlled burst / special action in PLAY and WATCH modes
- **Reported:** 2026-11-09
- **Status:** IN PROGRESS (agent `burst`)
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Fight controls / AI / mode parity
- **Reported behavior / request:** During WATCH the user feels unable to intervene; wants a special Burst or power move they can command in both interactive play and spectator/coach mode.
- **Expected behavior:** A prominent usable Burst command with visible charge/cooldown meter and clear effects. In PLAY mode it issues a controllable action in the fighter's existing motion pipeline. In WATCH mode it offers limited but meaningful tactical override/boost without destroying simulation, e.g. one approved Burst order that queues at a safe AI action boundary. Add tutorial explaining usage, costs and counters. Avoid guaranteed hits / unfair power spikes or animation discontinuities.
- **Acceptance criteria:** Trigger visible and functional in both modes; user can tell when ready and why unavailable; correct guard/counter mechanics; respects pause, round state, KO and cooldown; visuals and damage synchronized; tested on mobile.
- **Implementation:** Not started; define exact balance with current hit systems.
- **Evidence:** Pending demonstration in both modes.

### GOTR-0006 — Fix cramped, wrapped and tiny combo / action buttons
- **Reported:** 2026-11-09
- **Status:** DONE
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** UI / responsiveness / accessibility
- **Reported behavior / request:** As more combos are added, action buttons become small, labels wrap badly and the interface looks broken. User explicitly suggested limiting active buttons to three if necessary.
- **Expected behavior:** Max three visible primary combo buttons with a clear More/Select dropdown, carousel or loadout editor for additional owned combos. Consistent widths/heights, compact readable labels, sensible iconography, accessible touch targets and stable layout across phone portrait/landscape and desktop. The full collection remains accessible; excess items are not deleted.
- **Acceptance criteria:** No cramped unreadable labels in common screen sizes or English/Hebrew/Russian; at most three primary active combo controls; swapping equipped combos does not break queued actions or change ownership; verified screenshots at mobile and desktop breakpoints.
- **Implementation (2026-11-10, branch `claude/serene-cannon-riwk4l`):** Root cause: the Combos page always rendered all six combos (`ringfighter-controls.js` fixed `comboLayout`), appending " · 🔒" to unequipped ones, and the bottom quick bar (`game-shell.js`) squeezed up to five equipped combos with `overflow-wrap:anywhere`, so words broke letter by letter. Now the Combos page shows only the equipped loadout for the current mode (or the full drill set without the game layer), max three, with **More n/m** paging and **Choose combos** opening the loadout screen. Keys 1–3 follow the visible combos. The quick bar shows max three, wraps only between words and hides while the side Combos page is open. Ownership, loadout validation and the input queue are unchanged.
- **Evidence:** `qa/gotr-0006/` — before/after captures and `browser.cjs` (real app, EN/HE/RU × 393×852, 360×640, 852×393, 1366×768): new player sees only *Choose combos*; Fight loadout shows 3; Training loadout of 5 pages 3 → 2 → back to 3; speed-bag combos page 3 + More; no clipped or off-screen button; pressing a visible combo starts it (`combo_one_two` → jab, queue 1); *Choose combos* opens the loadout; zero page errors. New paging assertions in `tests/club-interface.test.cjs`; full suite 76/76 test files pass on `d47da6f`.
- **Published:** `d47da6f` on `main`, re-checked on the live site.
- **Follow-up (2026-11-10):** The Moves/Defence pages on short narrow phones (e.g. 360×640) used two 46-px columns in the gym, splitting words such as RU "Передний апперкот" (11 bad buttons measured across heavy/speed bag in EN/RU). They now use one 78-px column with whole words; more room is left for the fighter. Evidence: `qa/gotr-0006/moves-browser.cjs` — 0 mid-word breaks, clipped or off-stage buttons across fight/heavy/speed × EN/HE/RU × Moves/Defence at 360×640, 393×852, 852×393, 640×360 and 1366×768; `after-small-moves-ru.webp`. Buttons there are 36 px tall (below the 44-px ideal) so six fit without scrolling.

### GOTR-0007 — Make Fight IQ a guided interactive lesson, not a confusing menu
- **Reported:** 2026-11-09
- **Status:** DONE (published 2026-11-10, `40256fc`; user to confirm it is now understandable)
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Fight IQ / tutorial / usability
- **Reported behavior / request:** User does not understand how to use Fight IQ. Wants the system to teach by showing a move/combination and then asking the player to click the exact move buttons to recreate it.
- **Expected behavior:** A short progressive tutorial: choose concept (e.g. jab–cross–hook, defense/counter), show slow motion and clear move order, coach explains when/why, let player practice via highlighted move buttons, recognize exact sequence and timing, provide immediate understandable success/correction feedback and replay, then let the user repeat independently. First lesson requires no reading long docs. Optional hints/skip/retry, control legends and accessibility.
- **Acceptance criteria:** Novice can find Fight IQ, finish an interactive demo, correctly execute a specified 2-3 move sequence, see and understand feedback and continue to a next lesson; touch UI and localization verified. Never claim a combo was correctly performed just because buttons were randomly tapped.
- **User follow-up 2026-11-10 (after the visual redesign):** "I still don't understand how to use it. The concept is the same… what you show me is some tips and we see how it's done very, very slowly for some reason, and what next? I'm stuck. What should I do with this information? Should this somehow affect the fighter? … How does this contribute to the game?"
- **Decision 2026-11-10:** Rebuild the Academy around combo lessons with a visible purpose: **Watch** the coach at real speed → **Repeat** it with the real move buttons (exact order and timing checked) → **Use it** in a fight. Passing a lesson unlocks that combo for the fighter and pays coins once. The existing decision quizzes become a clearly optional section. Assigned to the Academy agent.
- **Implementation (`agent/academy`):** Landing shows three steps (Watch, Repeat ×3, Fight), one line ("Buy a combo in the Shop — or earn it here") and six lessons, one per combo; quizzes and coach notes are closed secondary groups; the demonstration plays at real speed. A lesson runs on the real training stage: a short skippable watch, then the combo's move names as boxes that fill when the right real move buttons are pressed in order and tempo; a wrong or slow press clears only the current run-through; three successful run-throughs pass. Passing pays 15 coins once (`lesson:<combo>` ledger row), unlocks and equips the combo, and offers "Try it in a fight". Lesson logic is a pure module (`academy-lesson.js`); stage controller `academy-stage.js`; styles `academy.css`.
- **Evidence:** `tests/academy-lesson.test.cjs`, extended `tests/game-domain.test.cjs` and `tests/fight-iq.test.cjs`; `qa/gotr-0007/browser.cjs` in the real app at four sizes in EN/HE/RU: wrong move named, too-slow and combo-button presses rejected, three run-throughs → +15 coins, combo unlocked, equipped and usable in a fight, reload keeps it, random tapping (57 taps) earns nothing. Full suite 79/79. Re-run on the live site: all six lessons passed with the real buttons (90 coins once; practising again pays 0).
- **Remaining:** combo is granted after the third run-through in the Academy (not after also using it in a fight); individual single moves are not taught as lessons yet.
- **Evidence:** Pending lesson walkthrough, interaction tests and recordings.

### GOTR-0008 — Long-term 3D explorable adventure world connecting gyms, quests and boss fights
- **Reported:** 2026-11-09
- **Status:** OPEN
- **Priority:** P2
- **Delivery:** LATER — only after preceding shop, controls, Fight IQ and core milestones are implemented and verified
- **Area:** World exploration / quests / progression
- **Reported behavior / request:** Transform the game over time into an adventure, with a character freely walking between recognizable places doing assignments, similar in feel to Roblox experiences. The existing boxing and training arenas should be *places inside* this broader game, not the whole game. Training missions in successive locations unlock tougher opponents.
- **Expected behavior:** A navigable stylized but visually polished 3D world map/hub with a walking player, buildings/locations/NPCs, assignments, travel, world events, gym training and ranked ring battles. Example journey: local gym tutorial → street training task → equipment shop → city club rival → regional arena → elite destination → final champion. Staged difficulty gates are transparent, reachable through specific skills and practice, not grinding. Preserve 3-minute task sessions and optional long-form exploration. Support save/resume at any location.
- **Acceptance criteria:** First vertical slice: player can walk between at least three distinct functioning spaces, take a quest, train, enter a fight with a numerically-rated boss, earn a persistent reward and return to hub; acceptable mobile framerate; no break to existing direct-entry boxing mode. Later expansion to larger worlds after feasibility QA.
- **Dependencies / risks:** Requires navigation/camera, interactive environments, streaming/scene transitions and performance budget; cannot ship as an unplayable decorative map. Separate PRD and architecture review when scheduled.
- **Implementation:** Deferred for sequencing, not rejected.
- **Evidence:** Future vertical-slice prototype and measured mobile test.

### GOTR-0009 — Expand roster and bosses with varied species, silhouettes, size and combat IQ
- **Reported:** 2026-11-09
- **Status:** OPEN
- **Priority:** P2
- **Delivery:** LATER / staged character expansion; start reference/prototyping after immediate priorities
- **Area:** Avatars / opponents / world progression
- **Reported behavior / request:** Do not use the rabbit model for every opponent. Each next opponent should feel substantially different, have a visible score/power rating, a distinctive fighting style, different dimensions and progressively harder training requirements. User referenced famous game/movie characters and politicians as examples of recognizable variety.
- **Expected behavior:** Unique, original varied animal and human-inspired fantasy fighters across weight/size classes, named personalities, consistent readable ratings and strengths/weaknesses, adaptive attack patterns and training-based challenge readiness. Show height/mass differences realistically while balancing hitboxes and fairness. Example ORIGINAL archetypes: agile small fox, counterpuncher wolf, large heavyweight bear, fast female cyberboxer, theatrical media personality, oversized green powerhouse — not copies of recognizable protected characters.
- **Acceptance criteria:** Each new fighter has unique mesh, face, clothing, stance, signature combo, AI behavior, scale/collision profile, reactions, intro and progression reward; visual quality matches existing lion baseline and phone performance passes. Opponent rating is explainable and does not guarantee victory.
- **Legal boundary:** Do NOT add Vi (League of Legends), Hulk, movie figures, Trump likeness/name or other recognizable characters/real people without verified applicable rights and approval. Original fictional characters or appropriately licensed integrations are viable instead; keep intentional differences in names, designs and characterization.
- **User follow-up 2026-11-10:** "Also add more avatars as discussed in the PRD." Queued to start once the mitt-range branch (which changes the shared fighter rig file) is merged.
- **Implementation:** Not started; complex art/rig pipeline and licensing assessment required.
- **Evidence:** Future approved character sheets and 360° rendered QA.

## Intake session — 2026-11-09
These nine reports were recorded from the user's latest message. **None is marked implemented or tested.** The immediate batch is GOTR-0001 through GOTR-0007; GOTR-0008 and GOTR-0009 are expansion roadmap items. Triage these against the latest code and any active Codex branches before scheduling work.

### GOTR-0010 — Compact training-menu tabs and agreed public title
- **Reported:** 2026-11-09
- **Status:** DONE
- **Priority:** P1
- **Area:** Training menu / public branding
- **Reported behavior / request:** Huge stretched Training, Moves & skills and View & sound buttons in the screenshot; restore the agreed app name.
- **Resolution:** Fixed tab/content grid placement and applied Glory of the Ring to public title/signs while retaining saves and technical identifiers.
- **Implementation:** `70d7fd3`, `48ea185`; latest main documentation preserved.
- **Evidence:** [Actual app captures,36 localized layouts, offline test and rollback](menu-brand-release.md). Full validation/deployment recorded in session handoff after successful publication. GOTR-0006 concerns separate play-action controls and remains open.

### GOTR-0011 — Remove square upper edge from boxer shorts
- **Reported:** 2026-11-09
- **Status:** DONE
- **Priority:** P1
- **Area:** 3D clothing
- **Reported behavior / request:** Pants look square at the top and strange.
- **Implementation:** `c5a2311` rounds the existing garment upper caps into its hip shell. No rig/contact/weight algorithm changes; versioned release integration preserves the menu update.
- **Evidence:** [24 matched views per version, both species, geometry/weight counters and five focused tests](rounded-shorts-release.md). Full integration/deployment recorded after publication. Existing jagged hems/stripes remain separate polish.

### GOTR-0012 — Correct coach/opponent spacing for straight jabs
- **Reported:** 2026-11-09
- **Status:** DONE for mitt work (published 2026-11-10); fight straights continue in GOTR-0018
- **Priority:** P1
- **Area:** Mitt training / sparring / fight
- **Reported behavior / request:** Opponent and coach stand too close; the jab should extend straight at an appropriate distance.
- **Implementation:** Coach mitt contact currently measured at56.3° elbow /47.5% extension. Clean sparring/fight jabs already reach172.3°/171.1°; inspect visual crowding separately and preserve contact stops on blocked punches. No spacing change published yet.
- **User follow-up 2026-11-10:** "I mentioned multiple times that during coach training with mitts they have to stand a bit farther from each other… the punch does not straighten the arm; he punches with his arm at 90°." Assigned to the mitt-range agent; fight straights tracked in GOTR-0018.
- **Resolution (2026-11-10, `agent/mitt-range` merged):** Mitt partners now stand at jab range (root separation 1.20 → 1.74, guard head-to-head 1.11 → 1.65). The coach holds the pad near their own shoulder line for straights, feeds it forward for hooks and uppercuts and takes real lifted steps for the roll; the boxer's lifted step replaces the old slide. No contact tolerance was widened. One option-gated line in `boxing-coach-v2.js` (`stepLift`), unused by fights.
- **Evidence:** `qa/gotr-0012/before-after.txt` and renders. Jab at pad contact: 49.6% extension / 59° elbow → 98.9% / 163° (Watch) and 99.1% / 164° (manual Play); cross 45.7% / 54° → 98.9% / 163°. Hooks 60–69° → 84–91°, uppercuts 50–62° → 75–97°; both rolls still duck; manual mixed chain lands 9/9; root drift 0, planted-sole slide 0. Lion and rabbit identical. New `tests/mitt-range.test.cjs`; spacing numbers in `tests/fluid-drills.test.cjs` updated with the same intent (no sliding, room to punch). Agent's full suite 77/77; integrator re-ran the drill and fight tests and an independent measurement (98.9% / 163.3°) on the merged tree.
- **Remaining / limits:** the mitt auto sequence still uses a fixed 1.2-second beat (Variable rhythm not applied there); the coach's rear-uppercut catching arm is fairly long (84% extension); clearance was checked on still frames, not video; on phone portrait the pair is drawn smaller because the framing is wider; physical phones untested.
- **Investigation 2026-11-10 (no code change yet):** Reproduced headlessly. In mitt work the pad face sits only 0.22 from the boxer's guard knuckle (partner roots 1.20 apart; arm 0.66 + glove 0.20). Jab contact: 49% arm extension, 58° elbow; cross: 47%, 55°. The punch lands because the shoulder lunges 0.45–0.56 forward while the arm stays folded. Moving the trainer back alone does **not** fix it: at 1.35–1.55 root separation jab/cross stop touching the pad (peak extension stays 67–81%) and the roll no longer scores, while hooks/uppercuts still land. So the fix needs the straight-punch reach in mitt mode plus spacing/roll retuning together, not a single distance constant. Root cause detail: the jab is a step-in punch — lead foot +0.15, hips +0.20, lead shoulder +0.45 toward the coach — while the hand target is the pad itself, so arm extension is only what is left between the advanced shoulder and the pad (about 0.25). A ~90% extended contact needs the pad about 0.73 ahead of the shoulder at contact, i.e. roughly 0.47 more range for straights, while hooks, uppercuts and the coach's roll sweep need the current close range. Planned fix: two ranges in the drill (long for jab/cross, close for the rest) with real stepping, the coach catching straights nearer their own shoulder, and updated spacing tests; needs multi-angle visual QA.

### GOTR-0013 — Rename Fight IQ to Fight Academy and give it a designed look
- **Reported:** 2026-11-10
- **Status:** DONE for rename and visual redesign (`31a17bd`, `b9c65ed`, live); guided show-and-repeat lesson continues in GOTR-0007
- **Priority:** P1
- **Delivery:** NOW — rename as a small release; visual redesign delivered with the GOTR-0007 guided lesson
- **Area:** Fight IQ / branding / UI design
- **Reported behavior / request:** "Change Fight IQ to Fight Academy and make sure that this will be better looking, more designed."
- **Expected behavior:** Every user-visible "Fight IQ" label (toolbar, World hub, lesson screens, tips) reads "Fight Academy" in EN with matching HE/RU names. The Academy screen looks like a designed product area (clear header, lesson cards with progress, consistent typography/spacing/icons), not a plain text menu. Saved Fight IQ progress, ledger entries and technical IDs are preserved.
- **Acceptance criteria:** No visible "Fight IQ" text remains in EN/HE/RU; saved progress survives reload; before/after screenshots at phone and desktop sizes in EN/HE/RU show readable, unclipped layout; existing Fight IQ tests pass.
- **Dependencies / risks:** Coordinate with GOTR-0007 so the redesign and guided lesson share one layout. Keep internal IDs (`IQ-*`, `learn` tab) unchanged to avoid save migration.
- **Implementation (2026-11-10, branch `claude/serene-cannon-riwk4l`):** Rename done: EN "Fight Academy", HE "אקדמיית הקרב", RU "Академия боя" in the toolbar button, World hub button and Academy screen title/loading text (`fight-iq-ui.js`, `game-shell.js`, `game-world-ui.js`). Internal IDs, file names, `learn` tab and saved progress unchanged. Redesign not started; planned with GOTR-0007. Observed during QA: on phones the intro line runs under the close button — fix in the redesign.
- **Evidence:** `qa/gotr-0013/` — real-app check in EN/HE/RU at 393×852 and 1366×768: new name in toolbar, World and screen title; no old name visible; zero page errors. `tests/fight-iq.test.cjs` and `tests/club-interface.test.cjs` pass.
- **Redesign (2026-11-10, part 2):** Academy landing now has a hero panel (emblem, tagline, real progress bar of solved decision variants out of 18), six numbered lesson cards with three progress pips each and a full-width gold action button (card turns green when all three variants are solved), corner notes as cards with a seen marker, and the coach-tip setting as its own row. The lesson screen shows the lesson number/title, numbered answer choices and green/amber feedback. Learning rules, IDs, rewards and saved progress are unchanged (`fight-iq-ui.js`, `game-shell.css`). Fixed during QA: intro text no longer runs under the close button; the Hebrew progress count kept left-to-right order ("0 / 18", not "18 / 0").
- **Redesign evidence:** `qa/gotr-0013/design-*.webp` and `design-browser.cjs` — real app, EN/HE/RU at 393×852, 360×640 and 1366×768: 6 lessons, 12 notes, no clipped card/button, no horizontal scroll, buttons ≥40 px, hero not under the close button; answering a lesson (wrong then right) colours feedback and the landing meter/pips rise to the saved progress; zero page errors.
- **Remaining:** guided show-then-repeat lesson with real move buttons (GOTR-0007).

## Intake session — 2026-11-10 (second message)
User tested the published build. Wording below is the user's request, lightly cleaned from dictation. Work is split across parallel agents on isolated branches (requested by the user), integrated and published by one integrator.

### GOTR-0014 — Proportional, relevant buttons everywhere
- **Reported:** 2026-11-10
- **Status:** READY FOR QA — first pass published 2026-11-10; user to review
- **Priority:** P1
- **Area:** UI / design system
- **Reported behavior / request:** "The buttons are not proportional. For example in Fight Academy the X button that closes the card is huge. Every button has to be proportional and relevant."
- **Expected behavior:** One consistent control scale (icon, small, standard, primary) applied to every screen; the dialog close button is a normal icon button without an oversized focus box; no decorative or duplicate buttons.
- **Acceptance criteria:** Before/after screenshots of every dialog and toolbar at phone and desktop sizes in EN/HE/RU; close buttons ≤ 44 px; touch targets ≥ 40 px where space allows; no clipped labels; existing layout QA scripts still pass.
- **Implementation (`agent/design`):** One control scale in `design-system.css` (icon 36–40 px, standard 40–44 px, small 32–36 px; primary, secondary and quiet styles; deliberate selected/disabled/focus-visible states). The dialog close button is a normal 36-px icon button with a thin focus ring instead of the oversized gold box; footer buttons and compact layouts follow the same scale.
- **Evidence:** `qa/gotr-0015/after-*.webp`; existing layout QA re-run on the redesign: Shop layout 0 issues (9 sizes × 3 languages), Moves/Defence 0 bad buttons, combos panel, combo purchase, Academy lessons and rhythm checks all pass; full suite 79/79.
- **Remaining:** a screen-by-screen review with the user; button relevance (removing or merging rarely used buttons) has not been audited yet.

### GOTR-0015 — Professional visual redesign and new colour system
- **Reported:** 2026-11-10
- **Status:** READY FOR QA — first pass published 2026-11-10; user to choose the accent palette
- **Priority:** P1 (user: "very, very important")
- **Area:** Visual design / whole app
- **Reported behavior / request:** "Initially we designed this with a kind of brown-orange theme. I'd like something more advanced, professional and good looking… it looks like an amateur app, so please invest in thinking how to make it better and redesign the whole app eventually."
- **Expected behavior:** A coherent design system (colour tokens, type scale, spacing, radii, button and card styles) replacing the brown/orange-gold look with a modern sports-app palette; applied consistently to header, navigation, training and fight controls, dialogs, Shop, Academy, World and results.
- **Acceptance criteria:** All UI colours come from shared tokens; contrast is readable; EN/HE/RU and phone/desktop screenshots; two or three alternative accent palettes captured from the real app for the user to choose; existing layout/flow QA scripts pass.
- **Implementation (`agent/design`):** About 530 hard-coded colours in seven CSS files replaced by tokens defined once in `design-tokens.css`; shared component layer in `design-system.css`; rules documented in `docs/design-system.md`. Default palette: cool near-black neutrals, white text, crimson accent for primary actions and selection, blue for information/focus, gold only for coins and rewards. The palette can be swapped by changing token values only.
- **Evidence:** `qa/gotr-0015/` — after screenshots (fight, Shop, training, World, Hebrew fight) and `palettes-compare.webp` showing the same fight and Academy screens in three accents (A crimson, B electric blue, C lime on graphite) produced by token changes alone. All layout/flow QA scripts pass on the redesign; full suite 79/79.
- **Remaining:** the design agent was stopped by the account usage limit before writing its own report, so its list of colours embedded in JavaScript (for example Shop icon colours and 3D signage) and its contrast audit output are not available yet; fight HUD redesign is GOTR-0021; the user's palette choice.

### GOTR-0016 — Variable ("asynchronous") practice rhythm by default
- **Reported:** 2026-11-10
- **Status:** DONE (`3672c18`, live; full suite 76/76; re-checked on the live site)
- **Priority:** P2
- **Area:** Training
- **Reported behavior / request:** "Change the synchronous punches that are the default to asynchronous by default everywhere."
- **Investigation:** This is the existing **Practice rhythm** setting: "Synchronized" (evenly paced) was the default; "Variable" (quick combinations, slower reads, unpredictable pauses) was optional.
- **Implementation (2026-11-10):** Variable is now the default for every training station and is listed first; Synchronized remains one tap away (`training-controls.js`). Low-level fallbacks used by headless tests are unchanged.
- **Evidence:** `qa/gotr-0016/browser.cjs` — real app: default is Variable on heavy bag, speed bag, shadow and mitts; choosing Synchronized still works. Related tests pass.
- **Remaining:** The mitt-work auto sequence has its own fixed 1.2-second beat; making it follow Variable rhythm is handed to the mitt agent (GOTR-0012).

### GOTR-0017 — More realistic, smoother graphics
- **Reported:** 2026-11-10
- **Status:** IN PROGRESS
- **Priority:** P2
- **Area:** Rendering / performance
- **Reported behavior / request:** "If you can run in parallel a few additional engines that improve the graphics and make everything a bit more realistic and a bit more smooth, it will be great."
- **Investigation:** The renderer already uses antialiasing, sRGB output, ACES tone mapping, soft shadows and a capped pixel ratio, so gains must come from frame pacing, lighting/material polish and adaptive quality rather than switching features on.
- **Acceptance criteria:** Measured before/after frame times; matched before/after renders; no change to poses, contacts or scoring; phone-size performance not worse; quality toggle preserved.
- **Implementation:** Assigned to the graphics agent.
- **Evidence:** Pending.

### GOTR-0018 — Straight punches in fights must fully extend with body rotation
- **Reported:** 2026-11-10
- **Status:** DONE (published 2026-11-10, `6f56434`; user to confirm the feel)
- **Priority:** P1
- **Area:** Fight mechanics / realism
- **Reported behavior / request:** "In the fight, if I hit with a jab or cross he has to straighten his whole arm and move his body a bit so the punch comes from the back to the shoulder to the arm to the fist. Currently the punch does not straighten the arm; he punches with his arm at 90°, which is not correct, not accurate and not real."
- **Expected behavior:** Clean jabs and crosses land at range with a nearly straight arm and visible hip → chest → shoulder → arm sequencing; fighters keep or create punching range instead of throwing cramped straights chest to chest.
- **Acceptance criteria:** Measured elbow angle and arm extension at contact for landed straights in real fights (Play and Watch), both species; matched before/after renders; blocked punches still stop at the guard; no regression in scoring, KO or existing contact tests.
- **Diagnosis (measured, 12 seeded fights per case):** fighters started a straight 1.22–1.27 apart, where the guards touch; 73–95% of landed straights were stopped by the guard with the elbow at about 110° — the "90° punch". The earlier 171° claim was a staged clean hit one frame after contact.
- **Implementation (`agent/fight-range`, all in `fight-arena.js`):** stance holds 1.74–1.88 range including the opening; a reach controller shifts the striker's weight so the glove meets its target at the end of the extension; head straights aim at the face surface; committed straights follow the opponent's steps; hooks and uppercuts step in from range; straights score the drive carried into the target so landing at full extension is not weaker.
- **Evidence:** `qa/gotr-0018/` (README, `stats.md`, before/after renders). Same six seeds: clean straights elbow median 132–149° → 156–160°, extension 91–96% → about 98%; blocked straights elbow median 108–113° → 136–147°, extension 81–83% → 93–96%. New `tests/fight-range.test.cjs`. Full suite 78/78 on the merged tree; GitHub checks run on `main`.
- **Remaining / limits:** blocked punches still stop at the guard, so the arm is not fully straight there (lowest tenth about 100°); judged from still frames and statistics, not motion video; physical phones untested.

## Intake session — 2026-11-10 (third message)

### GOTR-0019 — Lockable side-view camera in fights and training
- **Reported:** 2026-11-10
- **Status:** DONE (published 2026-11-10, `8f710df`; user to confirm the feel)
- **Priority:** P1
- **Area:** Camera / controls
- **Reported behavior / request:** "Add a task to lock and unlock the camera during a fight or training to a side view. If I click, it positions the camera on a side view and locks on this position, so if the fighters move the camera will always see both from the side. The side camera tilt will be locked but zoom will still work by the user."
- **Expected behavior:** One clearly labelled toggle in fights and at every training station. On: the camera moves smoothly to a true side view, keeps both fighters (or the fighter and the equipment) framed as they move, ignores orbit/tilt gestures, and still obeys pinch/wheel zoom. Off: the previous free camera returns.
- **Acceptance criteria:** Both fighters stay fully in frame during a whole fight and a mitt session at phone and desktop sizes; tilt/orbit input does nothing while locked; zoom works within sensible limits; state survives round changes and station changes; EN/HE/RU label; no judder.
- **Implementation:** `agent/graphics` (camera): new `camera-director.js` and `camera.css`; a **Side lock** toggle on the stage in fights and at every training station. Locked: the camera eases to a view perpendicular to the line between the fighters (or fighter and equipment), tracks the midpoint, widens when they separate, ignores orbit/tilt drags and still obeys zoom (0.55–1.85). Unlock restores the exact free camera. Front/Profile/Back buttons release the lock.
- **Evidence:** `qa/gotr-0019/` at 393×852, 852×393, 1366×768: a whole 20-second bout, mitts and heavy bag stay framed (worst point 0.84 of half-screen); at most 13.6° off side-on while fighters circle; a drag changes yaw by 0; zoom works; survives station change and pause; EN/HE/RU labels fit. `tests/camera-director.test.cjs`. Full suite 81/81. **Limits:** the referee or a ring post can stand in front of a fighter; on portrait phones the locked camera rises to about 3.1–3.4 m to see over the stands; motion judged from sampled frames, not watched live.

### GOTR-0020 — Fight intro: 360° arena fly-around that settles on the fighters
- **Reported:** 2026-11-10
- **Status:** DONE (published 2026-11-10, `8f710df`; arena camera limits added 2026-11-11)
- **Priority:** P2
- **Area:** Fight presentation / camera
- **Reported behavior / request:** "Before every fight, start with a rotating 360-degree view of the stadium and zoom in slowly until it gets to the position where both players are in starting position."
- **Expected behavior:** A short cinematic orbit around the arena that slowly closes in and ends exactly on the normal fight framing with both fighters in their corners/stance; then the bell. Skippable with a tap; shortened or skipped for reduced-motion users; does not eat into the 20-second fight clock.
- **Acceptance criteria:** Smooth, no clipping through arena geometry, ends without a camera jump, works in every arena style, skip works, fight timing and results unchanged.
- **Implementation:** Same branch: one full turn around the arena in about 5.2 s that closes in and ends exactly on the fight framing (0 m jump), then the bell with the full 20-second clock. Tap to skip; skipped for reduced motion; ends in the locked side view when the lock is on. 2026-11-11: built arenas can declare a camera ceiling and intro radius so the orbit stays under low ceilings and inside partitions (Basement 2.35 m / 6 m; Boxing Club 6.4 m).
- **Evidence:** `qa/gotr-0020/` (three sizes, three original arena styles, skip, reduced motion, clock and bout length unchanged at 23.017 s); `qa/gotr-0022/intro-*.webp` and `intro-occlusion.cjs` for the new arenas. **Limits:** results with and without the intro were not compared seed by seed; never watched in real time (software renderer); no physical phone.

### GOTR-0021 — Designed health bars and fighter names with "VS"
- **Reported:** 2026-11-10
- **Status:** DONE (published 2026-11-10, `60a7914`; user to review the look)
- **Priority:** P1
- **Area:** Fight HUD / design
- **Reported behavior / request:** "Replace the health bars with more designed ones, design the names above the bars better and add 'vs' between them."
- **Expected behavior:** A broadcast-style HUD: two styled health bars that drain toward the centre with clear damage feedback, well-set fighter names above them, a "VS" badge between, consistent with the new design system; readable over any arena.
- **Acceptance criteria:** Phone portrait/landscape and desktop; EN/HE/RU (RTL mirrors correctly, names never clip); health values still accurate; no overlap with round banner or move buttons.
- **Implementation:** `agent/hud`: `fight-ui.js` builds the HUD once; new `fight-hud.css`. Bold fighter names, a centred VS badge, two bars that drain toward the centre with a damage trail and hit flash, subtle exact numbers, a compact round/clock/score chip. Ids and `.fight-health-*` classes kept. Hebrew mirrors the sides.
- **Evidence:** `qa/gotr-0021/` at four sizes in EN/HE/RU: bar width matches reported health within 1.2%; no overlap with tabs, move buttons, banner or countdown; long names end in an ellipsis; reduced motion disables the effects. Integrator check with the camera features merged: VS and Side lock present, no overlaps at three sizes. Full suite 81/81. **Limits:** low-health, knockdown and final-seconds states were injected rather than played; in Play mode on landscape phones the round banner still sits behind the Moves/Combos tabs (pre-existing).

### GOTR-0022 — More arenas: street, boxing club, underground, docks hangar, professional tiers
- **Reported:** 2026-11-10
- **Status:** DONE (published 2026-11-11, `383fd47`, full suite 82/82, re-checked on the live site; user to review the look)
- **Priority:** P2
- **Area:** Arenas / world
- **Reported behavior / request:** "I want additional arenas: a street fight (boxing in the street with an audience), a boxing club, an underground arena (illegal fighting theme), docks (a hangar in a port), and a few professional arenas from simple to championship arena."
- **Expected behavior:** New selectable arena styles with distinct architecture, lighting, crowd and mood: street ring with onlookers; local boxing club; gritty underground venue; port hangar; and a ladder of professional venues ending in a championship arena. Original, fictional signage only. Existing three styles remain.
- **Acceptance criteria:** Each arena recognisable at a glance in its gallery card and in a fight; no change to combat; frame cost measured per arena with a phone-safe budget; selection saved per player; EN/HE/RU names.
- **Dependencies / risks:** Arena ids are validated in the save rules; several arenas at broadcast quality is days of art work — deliver in batches, best ones first.
- **Implementation:** `agent/arenas`: new `arena-sets.js`, `arena-gallery.css`; six selectable arenas — Street Fight, Boxing Club, The Basement (underground), Dockside Hangar, City Sports Hall (regional) and Championship Arena — each with its own architecture, baked lighting, crowd and fictional signage in EN/HE/RU. `venueIds` extended; old saves load; unknown ids rejected. No change to ring, fighters, camera framing or match state.
- **Evidence:** `qa/gotr-0022/` (fight and wide renders of each arena, gallery at four sizes in EN/HE/RU, `cost.json`): new arenas draw 396–401 calls on desktop and 380–385 on phone (existing three: 539 / 460) at about 1.13–1.16 M triangles. New `tests/arena-sets.test.cjs`. **Limits:** crowds only sway (no applause); near-side props and crowd are hidden per camera sector, so wide shots look open on the near side; one professional mid-tier arena is still missing; no physical-phone measurement.

## Intake session — 2026-11-11

### GOTR-0023 — New logo: realistic hanging boxing gloves
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — published 2026-11-11; user to review
- **Priority:** P2
- **Area:** Branding
- **Reported behavior / request:** "Fix and design our logo on the way, make it hanging realistic boxing gloves."
- **Expected behavior:** A crafted mark of a pair of boxing gloves hanging by their laces (shading, laces, cuffs, stitching), used in the header, favicon and app icon; works small (16–32 px) and large, on the dark theme, without real brand marks.
- **Acceptance criteria:** Header, favicon and offline icon updated; readable at 16 px; EN/HE/RU headers unaffected; no layout shift.
- **Implementation:** New vector logo `assets/brand/logo-gloves.svg`: a pair of red boxing gloves hanging by white laces from a peg, with padded fist, thumb lying along the side, white cuff with stripe and lace eyelets, centre stitching, knuckle seam and leather sheen. Used as the header mark (replacing the tilted red tile with a rabbit icon) and as the favicon (`assets/favicon.svg`, same drawing on a dark tile); added to the offline pack. Original artwork, no brand marks.
- **Evidence:** `qa/gotr-0023/logo-sizes.webp` (256 → 16 px on dark and light) and `header-en-he-desktop.webp` (real app header in EN, HE and desktop; no overlap with the title).
- **Remaining:** at 16 px the laces and stitching disappear (silhouette still reads as two gloves); no PNG app icons for home-screen install yet.

### GOTR-0024 — Punches must look powerful, not like touches (Watch/coach mode and everywhere)
- **Reported:** 2026-11-11
- **Status:** IN PROGRESS (agent `punch-feel`)
- **Priority:** P1
- **Area:** Fight feel / animation
- **Reported behavior / request:** "In coach mode, make punches more powerful — it looks like now the fighter is just touching the opponent, not punching it." (Coach mode = the AI-controlled Watch mode; the save records it as `control:'coach'`.)
- **Expected behavior:** A landed punch reads as an impact: sharp acceleration into contact, body weight behind it, glove compression, a visible snap of the target's head or torso with a short recovery, a brief hit-stop/impact accent and stronger sound, scaled by punch type and power; blocked punches jolt the guard. Same in Watch and Play, fights and mitt/bag work.
- **Acceptance criteria:** Measured before/after peak glove speed at contact and target recoil per punch type; matched before/after frame sequences; no change to who wins, damage balance or contact detection beyond what is intended and documented; no gloves through heads; reduced-motion respected for camera effects.
- **Implementation:** In progress.
- **Evidence:** Pending.

### GOTR-0025 — Faster punches, especially combinations
- **Reported:** 2026-11-11
- **Status:** IN PROGRESS (agent `punch-feel`)
- **Priority:** P1
- **Area:** Fight feel / timing
- **Reported behavior / request:** "Make also a bit faster punches, specifically combinations."
- **Expected behavior:** Single punches extend faster; combination punches flow into each other with shorter gaps (no full guard reset between linked punches), in Play, Watch, training and Academy lessons, while keeping the readable recovery after the last punch.
- **Acceptance criteria:** Measured before/after time per punch and per combo for each combo; the Academy tempo windows still accept correct input; player input queue and FIFO behaviour unchanged; all tests pass (timing numbers updated deliberately).
- **Implementation:** In progress.
- **Evidence:** Pending.

### GOTR-0026 — Gym wall sign text overlaps
- **Reported:** 2026-11-11 (screenshot from the user's phone, v1.14)
- **Status:** DONE — published in v1.16
- **Priority:** P2
- **Area:** 3D gym signage
- **Reported behavior / request:** "Bug. Look at the sign behind, the words overlap." The "MOVE & RECOVER" wall sign drew the small "GLORY OF THE RING / BOXING CLUB" line underneath the big title.
- **Root cause:** `club-world.js` `label()` used fixed pixel positions (brand line at y=80, 72 px title centred at half height, subtitle 57 px above the bottom) whatever the sign's proportions; on wide, short wall signs (canvas height 158 px) all three landed on top of each other.
- **Fix:** Layout is computed from the sign's real height: short signs (and signs whose title is already the brand) drop the brand line; the title size fits the space between the top and the subtitle; posters keep their layout.
- **Evidence:** `qa/gotr-0026/before-user-phone.webp` (user's report) and `after-signs.webp` (every gym label texture exported from the real app: four wall signs, floor mark and scoreboard, no overlap); `export-signs.cjs`. Club-world, character-selection, arena-sets and venue tests pass; full suite before publishing.

## Parallel work in progress — 2026-11-10
The user asked to run as many independent tasks in parallel as possible and to take decisions without waiting. Rules and the file-ownership map are in [`docs/agents/PARALLEL_AGENTS.md`](../agents/PARALLEL_AGENTS.md). Each agent works on `agent/<name>`; the integrator merges, runs the full suite, publishes and records evidence here. Nothing below is done until its entry says so.

| Branch | Scope | Source |
|---|---|---|
| `agent/mitt-range` | Mitt-work range and straight-arm jab/cross | GOTR-0012 |
| `agent/fight-range` | Fight straights land extended with body rotation | GOTR-0018 |
| `agent/academy` | Fight Academy lessons: watch → repeat with real buttons (3 successes) → combo earned → try in a fight | GOTR-0007 (user detail 2026-11-10: move names as semi-transparent boxes in a row that fill as the right buttons are pressed; little text; combos can be bought or earned) |
| `agent/design` | Colour system, proportional buttons | GOTR-0014, GOTR-0015 |
| `agent/graphics` | Frame pacing, adaptive quality, lighting | GOTR-0017 |
| `agent/gear-3d` | Real championship belts, headbands, ribbons; three boot designs | GOTR-0002, boots part of GOTR-0003 |
| `agent/world-content` | Short missions, JSON event packs, return digest | PRD F-010, F-013, F-014 |
| `agent/i18n-a11y` | Mixed-language strings, "Boxing Club" wording, RTL, accessibility | PRD F-019, feedback brief of 2026-11-08 |
| `agent/adventure-world` | Walkable 3D district prototype (not published until it meets the bar) | GOTR-0008 |

Queued because they touch files being changed above: Burst (GOTR-0005), rival memory F-011, coach tactics F-012, FIFO combo-queue check from the 2026-11-08 brief (after `fight-range`); gloves and shorts designs of GOTR-0003, new fighter GOTR-0009 / F-016 (after `mitt-range`); gym station F-015, Skill Fusion F-017, performance automation F-020.

### Issue template

```markdown
### GOTR-0001 — Short descriptive title
- **Reported:** YYYY-MM-DD
- **Status:** OPEN
- **Priority:** P1 / P2 / P3
- **Area:** Fighting / Training / Avatars / UI / Shop / Progression / Audio / Performance / Other
- **Reported behavior / request:** [Exact or faithful user description]
- **Expected behavior:** [...]
- **How to reproduce:** [Device, browser, mode and steps, if known]
- **Acceptance criteria:** [Specific observable test]
- **Dependencies / risks:** [If any]
- **Implementation:** Not started
- **Evidence:** Not yet available
```

## Session handoff log

| Date | Agent / branch | Completed & verified | Still open | Application link |
|---|---|---|---|---|
| 2026-11-09 | Backlog setup / main | Created persistent intake workflow | Awaiting user reports | Not verified |
| 2026-11-10 | Claude / `claude/serene-cannon-riwk4l` → main | Published and re-checked on the live site, each with full suite 76/76: GOTR-0006 combo controls (`d47da6f`) + small-phone Moves follow-up (`fa7c158`) — DONE; GOTR-0013 Fight Academy rename (`31a17bd`) + designed landing/lesson screens (`b9c65ed`); GOTR-0001 Shop header button (`9945b10`) + PC/tablet product overflow fix and six-category layout (`34d82dd`); GOTR-0004 buy combos with coins (`34d82dd`). One Pages deployment (`9945b10`) timed out on GitHub's side and was redeployed by the next commit. | GOTR-0012 (measured; needs straight-punch range choreography, see entry), GOTR-0007 guided lesson, GOTR-0005 Burst, GOTR-0002/0003 3D gear, GOTR-0001/0004 remainders; 0008/0009 later. Physical-phone performance still unverified. | https://ytcat.github.io/fit/ |
