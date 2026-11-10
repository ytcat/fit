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
- **Status:** IN PROGRESS — slices 1–2 published (`9945b10`, `34d82dd`); badges/confirmation/store look remain
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

### GOTR-0002 — Redesign championship belts, headbands and side ribbons as real wearable accessories
- **Reported:** 2026-11-09
- **Status:** OPEN
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** 3D cosmetics / shop / rendering
- **Reported behavior / request:** The championship belt currently resembles a square on a ribbon instead of a recognizable champion belt; head and side ribbons also look like crude placeholders.
- **Expected behavior:** Distinct premium, realistic belts with curved leather strap, anatomical wrap, sculpted central plate, side plates, tasteful engraving/embossed detailing and proper attachment; layered and fitted headbands/side ribbons with convincing thickness, drape or cloth treatment, and attachment. Include multiple earned and purchasable variants, no clipping.
- **Acceptance criteria:** Belt silhouette clearly recognizable from front, three-quarter, side and rear views; proportionate for multiple animal rigs and clothing; fits during punches, footwork and camera rotation; mobile FPS preserved; store thumbnails accurately represent equipped result.
- **Implementation:** Not started; research and inspect real championship belts, combat headgear/bands and fighting apparel references before modeling. No unlicensed brand logos.
- **Evidence:** Pending real-life reference board and in-game multi-angle comparisons.

### GOTR-0003 — Design a richer wardrobe and glove / shoe catalog using real boxing apparel references
- **Reported:** 2026-11-09
- **Status:** OPEN
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
- **Status:** IN PROGRESS — purchase slice published (`34d82dd`); in-Shop demonstration and confirmation remain
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
- **Status:** OPEN
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
- **Status:** IN PROGRESS
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Fight IQ / tutorial / usability
- **Reported behavior / request:** User does not understand how to use Fight IQ. Wants the system to teach by showing a move/combination and then asking the player to click the exact move buttons to recreate it.
- **Expected behavior:** A short progressive tutorial: choose concept (e.g. jab–cross–hook, defense/counter), show slow motion and clear move order, coach explains when/why, let player practice via highlighted move buttons, recognize exact sequence and timing, provide immediate understandable success/correction feedback and replay, then let the user repeat independently. First lesson requires no reading long docs. Optional hints/skip/retry, control legends and accessibility.
- **Acceptance criteria:** Novice can find Fight IQ, finish an interactive demo, correctly execute a specified 2-3 move sequence, see and understand feedback and continue to a next lesson; touch UI and localization verified. Never claim a combo was correctly performed just because buttons were randomly tapped.
- **User follow-up 2026-11-10 (after the visual redesign):** "I still don't understand how to use it. The concept is the same… what you show me is some tips and we see how it's done very, very slowly for some reason, and what next? I'm stuck. What should I do with this information? Should this somehow affect the fighter? … How does this contribute to the game?"
- **Decision 2026-11-10:** Rebuild the Academy around combo lessons with a visible purpose: **Watch** the coach at real speed → **Repeat** it with the real move buttons (exact order and timing checked) → **Use it** in a fight. Passing a lesson unlocks that combo for the fighter and pays coins once. The existing decision quizzes become a clearly optional section. Assigned to the Academy agent.
- **Implementation:** In progress (Academy agent).
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
- **Status:** IN PROGRESS
- **Priority:** P1
- **Area:** Mitt training / sparring / fight
- **Reported behavior / request:** Opponent and coach stand too close; the jab should extend straight at an appropriate distance.
- **Implementation:** Coach mitt contact currently measured at56.3° elbow /47.5% extension. Clean sparring/fight jabs already reach172.3°/171.1°; inspect visual crowding separately and preserve contact stops on blocked punches. No spacing change published yet.
- **User follow-up 2026-11-10:** "I mentioned multiple times that during coach training with mitts they have to stand a bit farther from each other… the punch does not straighten the arm; he punches with his arm at 90°." Assigned to the mitt-range agent; fight straights tracked in GOTR-0018.
- **Evidence:** New matched real-app views and contact tests required before resolving.
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
- **Status:** IN PROGRESS
- **Priority:** P1
- **Area:** UI / design system
- **Reported behavior / request:** "The buttons are not proportional. For example in Fight Academy the X button that closes the card is huge. Every button has to be proportional and relevant."
- **Expected behavior:** One consistent control scale (icon, small, standard, primary) applied to every screen; the dialog close button is a normal icon button without an oversized focus box; no decorative or duplicate buttons.
- **Acceptance criteria:** Before/after screenshots of every dialog and toolbar at phone and desktop sizes in EN/HE/RU; close buttons ≤ 44 px; touch targets ≥ 40 px where space allows; no clipped labels; existing layout QA scripts still pass.
- **Implementation:** Assigned to the design-system agent together with GOTR-0015.
- **Evidence:** Pending.

### GOTR-0015 — Professional visual redesign and new colour system
- **Reported:** 2026-11-10
- **Status:** IN PROGRESS
- **Priority:** P1 (user: "very, very important")
- **Area:** Visual design / whole app
- **Reported behavior / request:** "Initially we designed this with a kind of brown-orange theme. I'd like something more advanced, professional and good looking… it looks like an amateur app, so please invest in thinking how to make it better and redesign the whole app eventually."
- **Expected behavior:** A coherent design system (colour tokens, type scale, spacing, radii, button and card styles) replacing the brown/orange-gold look with a modern sports-app palette; applied consistently to header, navigation, training and fight controls, dialogs, Shop, Academy, World and results.
- **Acceptance criteria:** All UI colours come from shared tokens; contrast is readable; EN/HE/RU and phone/desktop screenshots; two or three alternative accent palettes captured from the real app for the user to choose; existing layout/flow QA scripts pass.
- **Implementation:** Assigned to the design-system agent. Default direction chosen by the integrator: near-black cool neutrals, white text, one strong accent, gold reserved for coins and titles.
- **Evidence:** Pending.

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
- **Status:** IN PROGRESS
- **Priority:** P1
- **Area:** Fight mechanics / realism
- **Reported behavior / request:** "In the fight, if I hit with a jab or cross he has to straighten his whole arm and move his body a bit so the punch comes from the back to the shoulder to the arm to the fist. Currently the punch does not straighten the arm; he punches with his arm at 90°, which is not correct, not accurate and not real."
- **Expected behavior:** Clean jabs and crosses land at range with a nearly straight arm and visible hip → chest → shoulder → arm sequencing; fighters keep or create punching range instead of throwing cramped straights chest to chest.
- **Acceptance criteria:** Measured elbow angle and arm extension at contact for landed straights in real fights (Play and Watch), both species; matched before/after renders; blocked punches still stop at the guard; no regression in scoring, KO or existing contact tests.
- **Implementation:** Assigned to the fight-range agent. Related: GOTR-0012 (mitt work).
- **Evidence:** Pending.

## Intake session — 2026-11-10 (third message)

### GOTR-0019 — Lockable side-view camera in fights and training
- **Reported:** 2026-11-10
- **Status:** OPEN (queued for the camera/graphics agent)
- **Priority:** P1
- **Area:** Camera / controls
- **Reported behavior / request:** "Add a task to lock and unlock the camera during a fight or training to a side view. If I click, it positions the camera on a side view and locks on this position, so if the fighters move the camera will always see both from the side. The side camera tilt will be locked but zoom will still work by the user."
- **Expected behavior:** One clearly labelled toggle in fights and at every training station. On: the camera moves smoothly to a true side view, keeps both fighters (or the fighter and the equipment) framed as they move, ignores orbit/tilt gestures, and still obeys pinch/wheel zoom. Off: the previous free camera returns.
- **Acceptance criteria:** Both fighters stay fully in frame during a whole fight and a mitt session at phone and desktop sizes; tilt/orbit input does nothing while locked; zoom works within sensible limits; state survives round changes and station changes; EN/HE/RU label; no judder.
- **Implementation:** Not started.
- **Evidence:** Pending.

### GOTR-0020 — Fight intro: 360° arena fly-around that settles on the fighters
- **Reported:** 2026-11-10
- **Status:** OPEN (queued for the camera/graphics agent)
- **Priority:** P2
- **Area:** Fight presentation / camera
- **Reported behavior / request:** "Before every fight, start with a rotating 360-degree view of the stadium and zoom in slowly until it gets to the position where both players are in starting position."
- **Expected behavior:** A short cinematic orbit around the arena that slowly closes in and ends exactly on the normal fight framing with both fighters in their corners/stance; then the bell. Skippable with a tap; shortened or skipped for reduced-motion users; does not eat into the 20-second fight clock.
- **Acceptance criteria:** Smooth, no clipping through arena geometry, ends without a camera jump, works in every arena style, skip works, fight timing and results unchanged.
- **Implementation:** Not started.
- **Evidence:** Pending.

### GOTR-0021 — Designed health bars and fighter names with "VS"
- **Reported:** 2026-11-10
- **Status:** OPEN (queued as a follow-up for the design agent)
- **Priority:** P1
- **Area:** Fight HUD / design
- **Reported behavior / request:** "Replace the health bars with more designed ones, design the names above the bars better and add 'vs' between them."
- **Expected behavior:** A broadcast-style HUD: two styled health bars that drain toward the centre with clear damage feedback, well-set fighter names above them, a "VS" badge between, consistent with the new design system; readable over any arena.
- **Acceptance criteria:** Phone portrait/landscape and desktop; EN/HE/RU (RTL mirrors correctly, names never clip); health values still accurate; no overlap with round banner or move buttons.
- **Implementation:** Not started.
- **Evidence:** Pending.

### GOTR-0022 — More arenas: street, boxing club, underground, docks hangar, professional tiers
- **Reported:** 2026-11-10
- **Status:** OPEN (queued; needs the fight and Academy branches merged first)
- **Priority:** P2
- **Area:** Arenas / world
- **Reported behavior / request:** "I want additional arenas: a street fight (boxing in the street with an audience), a boxing club, an underground arena (illegal fighting theme), docks (a hangar in a port), and a few professional arenas from simple to championship arena."
- **Expected behavior:** New selectable arena styles with distinct architecture, lighting, crowd and mood: street ring with onlookers; local boxing club; gritty underground venue; port hangar; and a ladder of professional venues ending in a championship arena. Original, fictional signage only. Existing three styles remain.
- **Acceptance criteria:** Each arena recognisable at a glance in its gallery card and in a fight; no change to combat; frame cost measured per arena with a phone-safe budget; selection saved per player; EN/HE/RU names.
- **Dependencies / risks:** Arena ids are validated in the save rules; several arenas at broadcast quality is days of art work — deliver in batches, best ones first.
- **Implementation:** Not started.
- **Evidence:** Pending.

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
