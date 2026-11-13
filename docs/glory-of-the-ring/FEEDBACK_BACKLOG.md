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
- **Status:** READY FOR QA — in v1.18; user to try it
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Fight controls / AI / mode parity
- **Reported behavior / request:** During WATCH the user feels unable to intervene; wants a special Burst or power move they can command in both interactive play and spectator/coach mode.
- **Expected behavior:** A prominent usable Burst command with visible charge/cooldown meter and clear effects. In PLAY mode it issues a controllable action in the fighter's existing motion pipeline. In WATCH mode it offers limited but meaningful tactical override/boost without destroying simulation, e.g. one approved Burst order that queues at a safe AI action boundary. Add tutorial explaining usage, costs and counters. Avoid guaranteed hits / unfair power spikes or animation discontinuities.
- **Acceptance criteria:** Trigger visible and functional in both modes; user can tell when ready and why unavailable; correct guard/counter mechanics; respects pause, round state, KO and cooldown; visuals and damage synchronized; tested on mobile.
- **Implementation:** `agent/burst`: Burst button with a charge ring (new `burst-ui.js`, `burst.css`; `B` key; EN/HE/RU tip). Charge is empty at every bell and fills from time (0.045/s), clean hits (+0.10) and blocks/slips (+0.07), so it is ready about once per 20-second round. Play: an explosive jab–cross–hook–rear uppercut–hook at 0.76× normal move time through the real motion pipeline. Watch (coach mode): one order that starts at the next safe boundary. No damage multiplier; cost: 0.7 s recovery without defence, −0.08 stamina, and the opponent attacks. Disabled with a short reason during the intro, pause, knockdown count, round end and KO. Values in `BoxingFight.burst`.
- **Evidence:** `tests/burst.test.cjs` (the Watch order never cut a punch in progress across 6 seeds; identical contacts score identically with or without Burst); `qa/gotr-0005/` browser QA: ready at 12–14 s from real play, bursts start 0.17–0.8 s after the order, 6 of 20 Burst punches landed and 13 were blocked (the opponent can defend), no overlaps in 96 layout checks (4 sizes × EN/HE/RU × modes). **Limits:** the opponent AI never uses Burst; the QA advances the fight clock itself because software rendering is slow; physical phones untested.

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
- **Status:** IN DEVELOPMENT — slices A (Adventure tab + 3D map) and B (progression core) merged for v1.25; slice C1 Old Town missions in progress (agent `adventure-oldtown`)
- **Priority:** P2
- **Delivery:** LATER — only after preceding shop, controls, Fight IQ and core milestones are implemented and verified
- **Area:** World exploration / quests / progression
- **Reported behavior / request:** Transform the game over time into an adventure, with a character freely walking between recognizable places doing assignments, similar in feel to Roblox experiences. The existing boxing and training arenas should be *places inside* this broader game, not the whole game. Training missions in successive locations unlock tougher opponents.
- **Expected behavior:** A navigable stylized but visually polished 3D world map/hub with a walking player, buildings/locations/NPCs, assignments, travel, world events, gym training and ranked ring battles. Example journey: local gym tutorial → street training task → equipment shop → city club rival → regional arena → elite destination → final champion. Staged difficulty gates are transparent, reachable through specific skills and practice, not grinding. Preserve 3-minute task sessions and optional long-form exploration. Support save/resume at any location.
- **Acceptance criteria:** First vertical slice: player can walk between at least three distinct functioning spaces, take a quest, train, enter a fight with a numerically-rated boss, earn a persistent reward and return to hub; acceptable mobile framerate; no break to existing direct-entry boxing mode. Later expansion to larger worlds after feasibility QA.
- **Dependencies / risks:** Requires navigation/camera, interactive environments, streaming/scene transitions and performance budget; cannot ship as an unplayable decorative map. Separate PRD and architecture review when scheduled.
- **Owner direction (2026-11-11):** The adventure's progression order: beginner training → street fight → fights in the underground and other places → advancing step by step → championship. Until the adventure exists, all arenas stay available.
- **Implementation:** Deferred for sequencing, not rejected.
- **Evidence:** Future vertical-slice prototype and measured mobile test.
- **Owner (2026-11-11):** "I do want adventure scenarios. But I want to design the world with you here before you start development."
- **Design decisions so far (owner, 2026-11-11):** (1) **World form:** illustrated 3D city map first (tap a place to travel), walkable streets per chapter later. (2) **Story:** rise to champion — an unknown fighter climbs from nothing to the title. (3) **Unlocks:** missions give stars; enough stars lets the fighter challenge the place's boss; beating the boss opens the next place. (4) **Coach:** a new local coach in every place. Draft chapter ladder (to confirm): 1 Home Gym (beginner training) → 2 Street → 3 Underground (Basement, Dockside Hangar) → 4 Rising (Boxing Club, City Sports Hall, Neon Strip, Harbor Dome) → 5 Championship Arena; each place 3–5 missions + 1 boss.
- **Design decisions round 2 (owner, 2026-11-11):** (5) **Coaches:** each place's coach teaches its own style and unlocks moves of that style (Home Gym basics and guard; Street footwork and slipping; Underground power; Clubs technique and combos; Championship ring strategy). (6) **Characters:** a venue animal per chapter, plus funny characters dressed as boxers from themes people know (cartoons, movies, genres) — e.g. absurd fighters in illegal fights, robots in a future theme. **IP rule (integrator):** only original characters that evoke a genre or archetype; no names, emblems, costumes or colour schemes of existing franchise characters (needs licences and would block publishing; PRD V2 §17 Tier C). (7) **Missions:** training challenges, help a character, street events (time-limited map challenges), and funny non-boxing tasks (comic everyday conflicts and rescues). (8) **Map look:** day to night per chapter (morning gym → evening street → night underground → stadium lights).
- **Design decisions round 3 (owner, 2026-11-11):** (9) **Main setting:** one big city with a sunny coastal, neon-nightlife, retro feel; future/tech, spooky, pirate harbour, medieval and more themed zones exist as **side missions**, not main chapters. **IP rule:** an original city (own name, map, art, music, characters) — the genre mood only, never a recreation of an existing game's city, name, map or look. (10) **Growth:** coaches unlock moves and combos, plus light stats from training (power, speed, stamina); gear stays cosmetic. (11) **Losing:** no penalty, but each boss fight has an entry level; the higher the fighter's score (stars, stats) above it, the better the chance to win — losing tells the player to raise the score first. (12) **Length:** about 4–6 hours for a first play-through, in 3–10 minute pieces.
- **Design decisions round 4 (owner, 2026-11-11):** (13) **City name: Gloryland.** (14) **Fighter Level** = mission stars + training stats; every boss shows an entry level; each level above it raises the chance to win. (15) **First playable slice:** city map + Home Gym + Street (two coaches, two bosses, Fighter Level, save and return) with **more tasks** than the proposed 8. (16) **Next step:** a visual design document for the owner to approve before any development.
- **Design document v1 (2026-11-11):** `docs/adventure/gloryland-design.html` (also published privately for the owner as an Artifact): city map sketch, five chapters with places, coaches (Pip rabbit, Vix fox, Tusk walrus, Kip kangaroo, Tembo elephant), bosses and entry levels (5/12/20/30/40), four side zones, 18 first-slice missions, Fighter Level = stars ÷ 3 + stat points above start, length ≈ 4½–5½ h. Waiting for the owner's confirmation of the five open points on the page.
- **Owner on the design doc map (2026-11-11):** "The map should look professional and 3-D, like a real designed city map, not just circles and squares and lines. Invest in this." → agent `gloryland-map` builds a stylised 3D city diorama in three.js (day and night, landmarks for every chapter and side zone, chapter pins) as the foundation of the in-game adventure map; its renders replace the sketch in the design doc. New files only (`adventure/`), not wired into the game before approval.
- **Owner approval (2026-11-11):** "I approve your recommendation in the artifact." Approved as proposed: coaches Pip (rabbit), Vix (fox), Tusk (walrus), Kip (kangaroo), Tembo (elephant); bosses and entry levels Brick 5, King Hyena 12, Iron Bull 20, Onyx 30, Blaze 40; the 18 first-slice missions; Fighter Level = stars ÷ 3 + stat points above start, with a small per-point edge; map layout as rendered (Old Town north-east, Docks on the south coast, Glory Hill on top).
- **Build plan (first slice, small releases):** A) Adventure tab replaces World (with GOTR-0044) and shows the 3D Gloryland map with tap-to-travel; B) progression core: stars, stats, Fighter Level, boss entry gate and chance (also feeds GOTR-0041/0042); C) Old Town: coach Pip, 9 missions, boss Brick; D) Market Row: coach Vix, 9 missions, street events, boss King Hyena. New species (beaver, fox, hyena, raccoon) come from the avatar work (GOTR-0009) after the muscle system (GOTR-0037) lands, so new characters get muscles from day one; until then missions run with the existing fighters. Development build: everything open.
- **Slice A+B result (v1.25):** World tab → Adventure (EN/HE/RU) with the 3D Gloryland map (11 pins, tap to fly, place card with chapter, coach, boss and entry level, buttons to the matching activity/arena; built only when the tab opens and released on close; ~215–220k triangles, 28/34 draw calls day/night); rivals, Cup and events moved behind a "Rivals & Cup" button beside Fight. Progression core `adventure-progress.js`: 18 missions as data, stars, Power/Speed/Stamina (+1 at 3 stars, max 10), Fighter Level, boss gate and chance (50% at equal level, +7 per level above, max 85%), small stat edge in fights, opponent levels for rivals; Fighter level button in the header. Evidence `qa/gotr-0008/` (adventure-browser: 11 pins, 0 overlaps, 0 page errors at 1366×768 EN/HE/RU and 402×690 EN/HE), `tests/adventure-progress.test.cjs`. Gaps: reward screen still opens the old hub; in-world sign text English; phone frame rate of the map untested; a new profile starts at Level 0.

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
- **Status:** READY FOR QA — in v1.18; user to judge the feel
- **Priority:** P1
- **Area:** Fight feel / animation
- **Reported behavior / request:** "In coach mode, make punches more powerful — it looks like now the fighter is just touching the opponent, not punching it." (Coach mode = the AI-controlled Watch mode; the save records it as `control:'coach'`.)
- **Expected behavior:** A landed punch reads as an impact: sharp acceleration into contact, body weight behind it, glove compression, a visible snap of the target's head or torso with a short recovery, a brief hit-stop/impact accent and stronger sound, scaled by punch type and power; blocked punches jolt the guard. Same in Watch and Play, fights and mitt/bag work.
- **Acceptance criteria:** Measured before/after peak glove speed at contact and target recoil per punch type; matched before/after frame sequences; no change to who wins, damage balance or contact detection beyond what is intended and documented; no gloves through heads; reduced-motion respected for camera effects.
- **Implementation:** `agent/punch-feel`. Measured causes: every clean hit saturated the target reaction (head jumped 17 cm / 23° in one frame, then froze about 0.4 s regardless of punch); the straight's speed curve had dropped to about 20% of peak where straights land; a blocked jab moved the guard 1 mm. Now: the glove keeps its speed into the target (`boxing-coach-v2.js`), the target's head/torso snaps by punch type and recovers (`fight-arena.js` `reaction()`), blocked blows always jolt the guard and rock the shoulders. No damage constants changed.
- **Evidence:** `qa/gotr-0024/` (README, `table.md`, before/after JSON, three before/after frame strips). Staged clean cross: glove speed one frame before contact 5.3 → 7.6 m/s; head snaps 20° and recovers below half by 0.45 s instead of holding; blocked-jab guard jolt 0.1 → 2.9 cm. New `tests/punch-feel.test.cjs`. Balance check: more punches thrown (Watch 56 → 66 over three bouts); winners unchanged in 12 of 15 seeded bouts (3 combo bouts flipped). **Limits:** no camera impulse or sound change yet; mitt hooks still meet the pad slowly (about 1.1 m/s); the head snap is easier to see in motion than in still strips.

### GOTR-0025 — Faster punches, especially combinations
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — in v1.18; user to judge the speed
- **Priority:** P1
- **Area:** Fight feel / timing
- **Reported behavior / request:** "Make also a bit faster punches, specifically combinations."
- **Expected behavior:** Single punches extend faster; combination punches flow into each other with shorter gaps (no full guard reset between linked punches), in Play, Watch, training and Academy lessons, while keeping the readable recovery after the last punch.
- **Acceptance criteria:** Measured before/after time per punch and per combo for each combo; the Academy tempo windows still accept correct input; player input queue and FIFO behaviour unchanged; all tests pass (timing numbers updated deliberately).
- **Implementation:** `agent/punch-feel`: a shared punch clock (`boxing-routines.js`, `boxing-input.js`, `fight-arena.js`) drives into the target 1.25× faster and absorbs the saved time in the return; linked punches inside a combination end once the hand is back at the guard, so the next one starts sooner. Input queue and FIFO unchanged.
- **Evidence:** `qa/gotr-0024/table.md`: Watch time to contact jab .32 → .28 s, cross .34 → .28, hook .33 → .28; linked punches start-to-start 1.03 → .83 s; Play combos one-two 1.40 → 1.25 s, three-punch 2.34 → 2.05, uppercut-hook-cross 2.78 → 2.36; bag and mitts time to contact −17 to −21%. Integrator re-ran `qa/gotr-0007/browser.cjs` on the merged tree (phone and desktop, EN/HE/RU): all Academy lessons still pass with the faster combos. **Limits:** mitt uppercuts keep the old timing (to keep their contact tests valid).

### GOTR-0026 — Gym wall sign text overlaps
- **Reported:** 2026-11-11 (screenshot from the user's phone, v1.14)
- **Status:** DONE — published in v1.16
- **Priority:** P2
- **Area:** 3D gym signage
- **Reported behavior / request:** "Bug. Look at the sign behind, the words overlap." The "MOVE & RECOVER" wall sign drew the small "GLORY OF THE RING / BOXING CLUB" line underneath the big title.
- **Root cause:** `club-world.js` `label()` used fixed pixel positions (brand line at y=80, 72 px title centred at half height, subtitle 57 px above the bottom) whatever the sign's proportions; on wide, short wall signs (canvas height 158 px) all three landed on top of each other.
- **Fix:** Layout is computed from the sign's real height: short signs (and signs whose title is already the brand) drop the brand line; the title size fits the space between the top and the subtitle; posters keep their layout.
- **Evidence:** `qa/gotr-0026/before-user-phone.webp` (user's report) and `after-signs.webp` (every gym label texture exported from the real app: four wall signs, floor mark and scoreboard, no overlap); `export-signs.cjs`. Club-world, character-selection, arena-sets and venue tests pass; full suite before publishing.

### GOTR-0027 — Hand and arm motion is not smooth
- **Reported:** 2026-11-11 (screen recording on the user's iPhone, v1.17, heavy bag)
- **Status:** IN PROGRESS — measured, no fix shipped yet
- **Priority:** P1
- **Area:** Animation / frame pacing / performance
- **Reported behavior / request:** "Look how hands are moving. They are not smooth moves."
- **Integrator measurement of the recording (60 fps capture, 7.7 s):** during punches, consecutive captured frames are often identical (held frames, sometimes every other frame, i.e. ~30 fps bursts) and the next frame then jumps; at rest the pose barely changes. So part of the problem is presentation/frame pacing on the phone, part may be pose discontinuities (glove direction/velocity changing abruptly).
- **Acceptance criteria:** Measured glove trajectories have no velocity spikes or reversals that are not part of the punch; animation time advances smoothly even when frames are late (no double-size jumps); phone-size rendering cost reduced or adapted so a mid-range phone holds a steady frame rate; before/after measurements and frame strips.
- **Implementation:** `agent/smooth-motion` measured, no code change: the owner's recordings show the phone dropping frames (sparring 20–30 fps, bag 30 fps during punches). Pose time already advances correctly when frames are late (no double jumps). JS cost per frame ~2.5 ms on the bag (so bag drops are GPU-bound) and 8–11 ms in fights. Gaps: fights on 120 Hz screens show each pose twice (60 Hz fight ticks without interpolation). **Defect found:** in mitt work the guard hand jumps 23 cm for one tick during the rear hook (two fixes reverted). Next: render interpolation, GPU cost reduction / adaptive quality, fix the guard flicker.
- **Evidence:** `qa/gotr-0027/README.md` (measurements). No physical phone; CPU timings noisy (shared machine).

### GOTR-0028 — Hit opponent slides back on its feet in sparring
- **Reported:** 2026-11-11 (screen recording, v1.17, Train → Sparring)
- **Status:** READY FOR QA in sparring — in v1.20; fights still OPEN
- **Priority:** P1
- **Area:** Animation / foot contact
- **Reported behavior / request:** "Look when the lion is hitting the rabbit, the rabbit slides back with his legs; this is not realistic."
- **Expected behavior:** When pushed back by a punch, the receiver absorbs it in the upper body and hips with planted feet, or takes a real step (foot lifts and plants). Planted feet never glide across the floor. Same rule in fights.
- **Acceptance criteria:** Measured planted-foot slide per frame ≈ 0 for the receiver during and after hits in sparring and fights, both species; any displacement of the body root happens through visible steps; matched before/after frame strips.
- **Implementation:** `agent/smooth-motion` (merged 486a4e0). Cause: `training-arena.js` moved the sparring partner's root with a pushback spring (up to 30 cm) while its feet are posed relative to the root, so planted feet glided. Now a hard hit makes the partner take a real step back (rear foot lifts ~45 mm and plants), pause and step in again; lighter hits are absorbed by the existing body recoil. **Fights not fixed:** feet still snap at step take-off and some planted feet slide up to 172 mm in one frame (details in `qa/gotr-0028/README.md`).
- **Evidence:** `qa/gotr-0028/` — worst planted-foot slide per frame in sparring 59.9 mm → 0.19 mm (node), 59.9 mm → 0.4 mm (real app); total 3.0 m → 1 mm over 8 s; frame strip `spar-hit-before-after.webp`; new `tests/foot-plant.test.cjs`. No physical phone.

### GOTR-0029 — Redesign the Combo loadouts screen
- **Reported:** 2026-11-11 (screenshot from the user's phone: "Redesign")
- **Status:** READY FOR QA — in v1.19
- **Priority:** P1
- **Area:** UI / combos
- **Reported behavior / request:** The Combo loadouts screen showed the coin balance alone in an empty grid cell, "Locked" up to three times per card, disabled Training/Fight buttons without a reason, an expandable "▼ Locked" block, and no visible title.
- **Implementation (integrator):** Rebuilt `combos()` in `game-shell.js` with styles in `shop.css`: title "Combo loadouts"; a loadout panel at the top with the balance and the real Fight (3) and Training (5) slots filled with equipped combos; one card per combo with a single state pill (Locked / Owned / Equipped), the moves as chips, and for owned combos Fight and Training toggles plus Try; for locked combos the requirement with a progress bar, Buy (with confirm, disabled with "Need N more ◈" when short) and Learn in Academy. Fight toggles are disabled with one explanatory line during a fight; full loadouts disable the add button with a tooltip. Dialogs now take focus themselves on open, so the close button no longer shows a focus ring until the keyboard reaches it.
- **Evidence:** `qa/gotr-0029/` — user's before screenshot and after screenshots; `browser.cjs`: 6 cards, 8 slots, at most one "Locked" per card, no clipping or horizontal scroll at 402×690, 360×640, 852×393 and 1366×768 in EN/HE/RU; earn → buy with confirm → equip for Fight → card shows Equipped and the Fight slot shows the combo.

### GOTR-0030 — Improve and align every Shop component
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — merged (`agent/store-polish` dce010f), ships in v1.23
- **Priority:** P1
- **Area:** Shop / 3D cosmetics
- **Reported behavior / request:** "Improve and align all store components. The ribbon is on the fighter's eyes, some old belts don't look good. The gloves and shoes look bad in pictures on the store. Improve all."
- **Expected behavior:** Headband sits on the forehead above the eyes on both species; the old "cosmetic band" belt-slot items are redesigned (or retired with saves migrated safely); every Shop thumbnail (gloves, shorts, boots, belts, accessories, combos) is a clear, consistent, good-looking picture of the real item; all Shop cards, badges, buttons and spacing line up on one grid at every size.
- **Acceptance criteria:** Multi-angle renders showing the headband above the eyes in guard and moving; before/after thumbnail sheet for every item; layout QA (9 sizes × 3 languages) with 0 issues; purchase/equip flows still pass; old saves load.
- **Implementation:** Head ribbon and bandana refitted above the brows; the old belt-slot "cosmetic bands" became four woven waistband designs skinned to the shorts (ids, prices and saves unchanged; shown as Waistbands); every Shop thumbnail is rendered from the real 3D item (`assets/shop/`, 23 files); one card system for all categories (`game-shell.js`, `shop.css`).
- **Evidence:** `qa/gotr-0030/` — headband now clears eyes and brows by 18 mm (lion) / 15 mm (rabbit) across 7 pose families, before it sat 21 / 33 mm below the brows; waistbands stay on the shorts in 34 poses on both species; Shop card QA 0 issues (5 sizes × EN/HE/RU × 6 categories) and `qa/gotr-0001/layout-browser.cjs` 0 issues (10 sizes × 3 languages); touched tests pass. Still weak: arm-ribbons thumbnail (opaque worn crop), lion head-ribbon knot sits on the mane, desktop thumbnails ~71 px. `qa/gotr-0004/browser.cjs` step 3 targets the pre-GOTR-0029 loadouts layout and is obsolete.

### GOTR-0031 — Map every user flow and make the first-time experience clear, simple and exciting
- **Reported:** 2026-11-11
- **Status:** R1 READY FOR QA — merged (`agent/ux-r1` 6e35cd8), next release; R2–R4 open
- **Priority:** P1
- **Area:** UX / onboarding / navigation
- **Reported behavior / request:** "Can you please prepare all UX flows with decision making. I want to see all game process and user flow. I feel that the user experience is still not intuitive, clear and simple. I want the new user to be able to understand exactly what to do and it will be clear and make sense and exciting."
- **Expected behavior:** (1) A visual map of the whole game as it exists today: every screen, entry point and decision (first launch, train, fight, academy, shop, loadouts, world, cup, missions, settings) with where players get lost. (2) A proposed simplified journey for a new player (first 5 minutes, then the daily loop) with one obvious next step at every moment. (3) After the user reviews it, implement the new flow in slices.
- **Acceptance criteria:** Diagrams cover every reachable screen; each friction point backed by evidence from the real app; the proposed first-time path reaches a first win, a first reward and a first unlock with no dead ends; the user approves before implementation.
- **Delivered (`agent/ux-flows`):** `docs/ux/UX_FLOWS.md` (screen inventory, current flow, friction map F1–F15, proposed navigation Home · Train · Fight · Learn · Shop, first five minutes, core loop, "Next up" rules, empty states, reward moments, longer arc, ranked changes and release slices R1–R4) and the phone page `docs/ux/ux-flows.html`, published privately for the owner as an Artifact. Top findings: no first step after naming; Train/Fight run under coach control unless Play is on; the World hub pops up after every activity and hides who won; one place has four names; language is three levels deep; developer notes on player screens.
- **Evidence:** `qa/gotr-0031/` (34 screenshots from v1.19 at 402×690 and 1366×768, Playwright helpers). Limits: the third Academy repetition and the "Lesson passed" screen were described from code (software rendering too slow); Mermaid diagrams not rendered here; no physical phone.
- **Open questions for the owner:** arenas as earned rewards for new players (existing players keep all); Lion/Rabbit choice on the first screen and rival cards no longer switching species; one name for the player's place (Gym / Club / Corner).
- **Owner decisions (2026-11-11):** (1) Arenas: keep all nine available for now — no earned arenas during development. Future adventure order: beginner training → street fight → underground and other places → advancing → championship (recorded on GOTR-0008). Change #8 (progressive unlocks) is deferred to go-live. (2) Lion/Rabbit choice on the first screen; rival cards stop switching the player's species. (3) One name: **Gym**. Everything else as proposed.
- **Plan:** R1 = changes 2, 5, 10, 12 plus the Lion/Rabbit choice; R2 = 1, 6, 9; R3 = 3, 4; R4 = 7, 11 (8 deferred). Each release is published with its own version number.
- **R1 result:** player controls by default (Auto is a separate button); Gym naming; owner's terms; developer notes removed; empty states; Academy single Start; Lion/Rabbit chosen on the first screen and rival cards no longer switch species — same-species fights are not supported by the engine (training-arena.js forces the opposite species), so rivals show only the other species and say which are for the other fighter. Evidence: `qa/gotr-0031/r1/results.txt` 93/93 checks at 4 sizes × EN/HE/RU before the merge, 29/29 after (402×690 + old save); affected tests 21 files, 0 fails. With a Rabbit fighter the mitts are held by a lion (career-drills.js).

### GOTR-0032 — Mitt-work punches still look like small touches
- **Reported:** 2026-11-11 (after v1.18)
- **Status:** IN PROGRESS — whole-body drive, remaining speeds and guard-hand jump (agent `smooth-motion-3`)
- **Priority:** P1
- **Area:** Mitt training / animation feel
- **Reported behavior / request:** "In the coach training the punches are not strong enough; it still looks like a small touch."
- **Known cause:** v1.18 (GOTR-0024/0025) sped up fight, bag and shadow punches but left mitt choreography unchanged: mitt hooks meet the pad at about 1.1 m/s, mitt uppercuts keep the old timing, pad recoil is small (0.065 × force, fast decay) and the coach's arm and body barely react.
- **Expected behavior:** The glove accelerates into the mitt, the mitt pops back clearly, the coach's arm and shoulder absorb and the coach meets straights with a short counter-push; crisp impact accent and pad-pop sound.
- **Acceptance criteria:** Measured before/after glove speed at mitt contact for all six punches and pad displacement; matched before/after frame strips; GOTR-0012 extension results and mitt contact tests still pass; no sliding feet.
- **Implementation:** `agent/smooth-motion` (merged 486a4e0): hooks aim 5 cm and uppercuts 4.5 cm through the mitt, and every punch aims at the mitt's un-recoiled position so the glove no longer chases the mitt back (4.7 cm → 0.1 cm); mitt pop bigger and sharper; the coach's shoulder gives 5–8 cm (was 1.2) and chest 1.0–1.5 cm (was 0.3); brief glove squash on contact and an extra mitt sound layer. Not done: real hit-stop; Watch-mode straights at the mitts still slow (2.2–3.8 m/s at contact); mitt uppercuts show a one-tick speed jump.
- **Evidence:** `qa/gotr-0032/` (`before.json`, `after.json`, `measure.cjs`) — glove speed at contact in Play: hooks 1.09 → 2.45/2.32 m/s, uppercuts 3.17/3.72 → 4.92/4.00 m/s; straights unchanged (elbow 164°/167°, extension 0.990/0.994); mitt pop 2.7–5.5 cm → 5.5–8.7 cm, peak at 25 ms (was 42 ms); new `tests/mitt-power.test.cjs`. Before/after frame strips not produced (screenshots did not show the stepped pose).
- **Owner feedback after v1.20 (2026-11-11):** "Also the punches still not powerful enough." The owner's screenshot was taken in automatic (coach-controlled) mitt training, where straights still reach only 2.2–3.8 m/s at contact (agent measurement). Real boxers reach roughly 6–10 m/s at the glove.
- **Next targets:** glove speed at contact in Play and automatic modes, in mitt work, bag and fights: straights ≥ 6 m/s, hooks and uppercuts ≥ 6.5 m/s; whole-body drive (hip and shoulder rotation, rear-heel pivot, weight transfer, short load before the punch); a brief hit-stop (~50–70 ms) on clean contact; stronger impact accents (mitt/bag pop, spray or dust, layered sound, slight camera kick on power shots); before/after video-like frame strips.
- **Result after v1.22 work (glove speed in the tick before contact, m/s):** automatic mitt straights 3.9–5.2 → 10.4–12.6, hooks 2.6–2.8 → 5.0–5.4, uppercuts 8.4–8.6 → 8.9–12.8; Play mitt hooks 3.7–3.9 → 4.9–5.3; bag straights 15–16.5, hooks 6.1–6.8, uppercuts 6.4–7.4; fights straights 8.4–9.1, hooks 6.6–8.6, lead uppercut 8.0, rear uppercut 5.0–5.4. New `impact-fx.js`: hit-stop on clean contact (67 ms measured), camera kick on power shots (does not disturb camera locks), spray at the contact point, deeper sound layer.
- **Still open:** mitt hooks and the fight rear uppercut below 6.5 m/s (deeper aim breaks the mitt elbow limit); mitt uppercut one-tick spike; whole-body drive (hips, heel pivot) and the 23 cm guard-hand jump need `boxing-coach-v2.js` (after the muscle agent); no before/after strip.

### GOTR-0033 — Free development mode: everything available, price tags kept
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — UI merged; switch turned on in v1.23
- **Priority:** P1
- **Area:** Shop / progression / release control
- **Reported behavior / request:** "While we are building the app, try to make all the possibilities available, including the shop — let me buy for free, but add a price tag on the things that need to be, and only when we go live those will be locked until they are purchased or earned."
- **Expected behavior:** One release switch. In development: every Shop item, accessory and combo can be taken for free with one tap; its normal price stays visible; a short notice says purchases are free during development; coins are still earned and shown but not spent. At go-live (switch flipped): prices are charged and locks apply until bought or earned.
- **Acceptance criteria:** With the switch in development mode, a fresh player with 0 coins can get and equip every item and every combo; price tags remain visible in EN/HE/RU; the ledger records zero-cost development grants that validate on reload. With the switch in live mode, the same actions are refused without enough coins exactly as before; old saves load in both modes; full test suite passes.
- **Dependencies / risks:** Shop UI is being changed by `agent/store-polish` (GOTR-0030); the UI part follows its merge. Decision at go-live: keep or revoke development grants in the owner's own save.
- **Implementation:** Rules in `game-domain.js`/`game-accessories.js` (2d6142f); Shop and Combo loadouts UI by `agent/store-polish`: with `version.js` channel 'dev' every priced item, accessory and combo shows its price tag and a "Get free" button (no balance check, combos without the confirm row) plus a one-line development notice in EN/HE/RU.
- **Evidence:** `tests/free-mode.test.cjs`; agent browser run at 402×690 EN/HE/RU: gloves, head ribbon and two combos taken free and equipped, coins stayed 0, all kept after reload; with the switch off nothing changes.

### GOTR-0034 — One set of words for the three characters
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — merged with UX R1, next release
- **Priority:** P1
- **Area:** UI copy / terminology
- **Owner's definitions:** **Coach** = the rabbit who holds the mitts. **Fighter** = the main character (the player's boxer). **Opponent** = whoever the fighter faces in sparring and in a fight.
- **Expected behavior:** Every player-facing text in EN/HE/RU uses these three words with these meanings only. Today the app also says "coach" for the player's own boxer ("Lion coach", "using lion coach", auto-control called coach mode, "Coach could not load"); those become Fighter (or "Auto" for automatic control). Code identifiers such as `engine.coach` stay as they are (internal only). Docs and agent briefs use the same words.
- **Acceptance criteria:** A search of player-visible strings finds "coach"/"מאמן"/"тренер" only where it means the mitt-holder; screenshots of the first screen, Train, mitt training and Fight in EN/HE/RU.
- **Open point:** When the player chooses Rabbit as the fighter, who holds the mitts must be checked in the engine (the coach is a rabbit today).
- **Implementation:** In progress.
- **Evidence:** Pending.
- **Result:** see GOTR-0031 R1 and GOTR-0046 audit.

### GOTR-0035 — Game-pad controls: round D-pad and one-screen punch buttons
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — merged (`agent/fighter-pad`), ships in the next release
- **Priority:** P1
- **Area:** Controls / fight / sparring / training
- **Reported behavior / request:** "I need some kind of controls: a round move controller with 4 direction arrows inside (make it designed) and on the other side some punch move buttons. Because it doesn't matter if the punch will be left or right, you now have fewer options for buttons and you can use everything there. Use this also in fight and in sparring."
- **Decisions (integrator):** D-pad on the left, punches on the right in every language. ← / → step back / forward on screen; ↑ slip; ↓ duck/roll. Punch buttons Straight, Hook, Uppercut, plus Guard, Burst and the equipped combos on the same screen; the hand is chosen automatically (lead first, then alternate; back to lead after a pause), so Straight, Straight = jab, cross. Replaces the Moves/Combos/Defence pages in fight, sparring and the punch trainings; rope keeps its own buttons.
- **Acceptance criteria:** All four directions and all punches work in fight, sparring and mitt work (measured input/fight events); move and punch at the same time on touch; no overlap with the boxers; phone portrait/landscape and desktop in EN/HE/RU; Academy lessons still pass; full suite passes.
- **Implementation:** New `fighter-pad.js`, `fighter-pad.css` (no edits to `ringfighter-controls.js`). The pad shows in fight, sparring, mitts, bag, dummy, speed bag and shadowboxing; rope, Watch and Academy lessons keep their own buttons. ←/→ step by the fighter's on-screen facing (from the live camera), ↑ alternating slips, ↓ roll; Straight/Hook/Uppercut with automatic hand choice (lead first, alternate, back to lead after 0.8 s; speed bag: taps/doubles/triples); Guard; Burst moved into the pad; equipped combos as chips. Keys: arrows/WASD unchanged, J/K/L punches, 1–3 combos, B Burst. Academy lessons hide the pad and keep the 12 exact move buttons (auto hands cannot make sequences like uppercut-hook-cross).
- **Evidence:** `qa/gotr-0035/` (agent run, headless with touch emulation): Straight, Straight, Hook → jab, cross, hook and 3 thrown punches counted in a fight; all four arrows, three punches and Guard accepted in sparring and mitts, steps move the hips 22–45 px the matching way on screen, also with the camera turned half way; two-finger move + punch both accepted 4 ms apart; hold → 3.5 s = 3 steps; no page scroll or zoom; buttons ≥ 49 px; pad never covers the boxers (14–110 px clearance) at 4 sizes × EN/HE/RU; Academy jab-cross ×3 → +15 coins with the save check accepting the proof; full suite 86/86. Limits: no physical phone; in portrait the pad shifts and zooms out the 3D view (boxers ~17% smaller at 402 px with 3 combos equipped, ~21% at 360 px); combo chips 37–42 px tall (< 48 px target); the first-time Burst tip is hidden on phones; fight steps are short in-place footwork.

### GOTR-0036 — Burst meter charges too slowly
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — in v1.20
- **Priority:** P1
- **Area:** Fight / Burst
- **Reported behavior / request:** "Charging takes too long. You need to get to fully charge faster."
- **Known cause:** Burst rules as published in v1.18 (commit 869ecac): +0.045 per second of round time (22 s alone), +0.10 per clean hit, +0.07 per block or evasion; the meter was designed so time alone cannot fill it in a 20 s round.
- **Acceptance criteria:** Measured time to the first full meter in Watch fights before/after; full well before the end of a 20 s round in normal play; Burst tests updated on purpose.
- **Implementation:** `boxing-fight.js` `BoxingFight.burst`: time fill 0.045 → 0.11/s, clean hit +0.10 → +0.25, block/evasion +0.07 → +0.17. `tests/burst.test.cjs` updated on purpose (time alone fills in 7–12 s; two hits and a block in 2–8 s).
- **Evidence:** `qa/gotr-0036/` — 4 Watch fights, 8 fighters, real contact solver: first full meter (round time) mean 12.3 s → 5.4 s, range 8.9–17.6 s → 3.8–9.1 s; full within the first 10 s of the round 2/8 → 8/8.

### GOTR-0037 — Visible muscles on every avatar (definition, form shadows, muscle shapes)
- **Reported:** 2026-11-11 (screen recording of an illustrated human boxer from an ad, used only as a quality reference)
- **Status:** READY FOR QA — merged (`agent/muscle-definition` da07b61), next release
- **Priority:** P1
- **Area:** Avatars / 3D realism / lighting
- **Reported behavior / request:** "Look at how the fighter is visualized. Look at his muscles and the shadows and the shapes of each muscle on his body. I want to achieve this kind of level for my players, not just smooth hands but actually to see muscles on each one of the avatars. Try to get as close as possible to this level."
- **Reference (not stored in the repo):** clearly separated deltoids, traps, lats, back and spinal grooves, pecs, six-pack and obliques, serratus, biceps/triceps, forearm and calf shapes, with strong form shadows and highlights on each muscle. Our characters stay our own Lion and Rabbit; the reference sets only the level of muscle definition.
- **Expected behavior:** Lion and Rabbit (and every future avatar) show readable muscle shapes on torso, back, arms and legs, in guard and while punching, in the gym and the arenas; fur does not hide them; muscles deform with the pose.
- **Acceptance criteria:** Matched before/after renders (front, back, side, 3/4; guard, jab extended, hook) for both species; muscle groups named on a labelled sheet; gear and accessories still fit; measured GPU/JS frame cost before/after at phone size with a lower-quality fallback; full suite passes.
- **Implementation:** Real surface relief built once per species at load and stored per vertex (121,804 body vertices, ~6.5 mm apart): a data atlas in `avatar-anatomy.js` with 38 muscle parts (22 named groups per side) and per-species profiles (lion heavier, rabbit leaner); 22 pose-driven channels (biceps bunch, deltoid rounding, lat stretch…); crease shading and fine normal detail off at the lowest adaptive-quality level; fur strands follow the relief (removed back specks); pec seam and dark chest band fixed.
- **Evidence:** `qa/gotr-0037/` — 14 before/after sheets (front/back/side/3-quarter; guard, jab, hook; both species; gym and arena) and labelled muscle atlases; `tests/muscle-definition.test.cjs` (lead biceps 1.18 in guard → 0.97 in the jab, triceps 1.28, lat 0.80); full suite 92/92 after merge; gear fit: belt plate 1.6 mm (lion) / 0.8 mm (rabbit) into the body vs 4 mm limit; boot closure 0.961 (limit 0.99); frame cost A/B ratio 0.96–0.99 (within noise); +2.15 MB vertex data per rig; build 3.1 s once per species in a loaded browser. Still below the reference: no veins or fibre lines, soft creases in close-ups (an authored sculpt baked to maps would close the gap); lighting unchanged; two old seams (armpit on reach, shoulder front).

### GOTR-0038 — Coach's mitt goes inside his own face in mitt work
- **Reported:** 2026-11-11 (screenshot from the owner's iPhone, v1.20, Train → Coach mitts, cue "Roll under the hook")
- **Status:** READY FOR QA — merged (`agent/smooth-motion-2` c0578c4), next release
- **Priority:** P1
- **Area:** Animation / mitt work / collision
- **Reported behavior / request:** "Bug: look at the rabbit's hand, it's inside his face."
- **Observed:** while the coach swings a mitt hook for the fighter to roll under, the coach's other mitt sits inside the coach's own face/muzzle. Related known defect: in mitt work the fighter's guard hand jumps 23 cm for one tick during the rear hook (GOTR-0027 measurement).
- **Expected behavior:** No hand, glove or mitt of either character ever penetrates its own head or body; the coach keeps the non-swinging mitt in a real guard beside the cheek.
- **Acceptance criteria:** Measured minimum distance between each mitt/glove and the owner's head and torso surfaces stays positive in every mitt-work drill, both species as coach where supported; frame strip of the hook-roll drill before/after; mitt tests pass.
- **Evidence:** `qa/gotr-0038/user-v1.20-coach-mitt-in-face.webp` (owner's screenshot).
- **Result:** the coach's free mitt sat up to 13.5 cm inside his own skull in the roll drill; it is now placed beside the cheek and any overlap with the coach's head or torso is pushed out to 1 cm. Worst clearance in every drill, both species: −13.5 cm → ≥ +0.79 cm; straights still land extended (164°/167°). Evidence `qa/gotr-0038/`.

### GOTR-0039 — Combo preview in the Shop shows an empty arena
- **Reported:** 2026-11-11 (screenshot from the owner's iPhone, v1.20, Shop → Combos → First Rhythm preview)
- **Status:** READY FOR QA — merged, ships in v1.23
- **Priority:** P1
- **Area:** Shop / combo preview / camera
- **Reported behavior / request:** "When you click on preview the screen is empty."
- **Observed:** the preview is playing (Jab/Cross chips, Stop button) but the pane shows only the arena wall and a "Fight Night" sign; the fighter is out of frame.
- **Expected behavior:** Every combo preview frames the whole fighter performing the combo, in the narrow phone pane and in Full view, in every arena.
- **Acceptance criteria:** Screenshots of at least two combos at 402×690 and 1366×768 show the fighter fully in frame; EN/HE/RU.
- **Evidence:** `qa/gotr-0030/` — 0 issues across all 9 venues on phone in HE/RU and 3 venues × 2 combos on desktop, both views. Remaining: the phone preview pane is 112 px wide and the move chips cover the lower legs.
- **Implementation:** Cause: venue scenery stood between the preview camera and the fighter. The combo preview now frames the fighter in every venue, in the phone pane and Full view.

### GOTR-0040 — Punch power meter in fights and training
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — merged, next release
- **Priority:** P1
- **Area:** Fight HUD / training feedback
- **Reported behavior / request:** "Please show some kind of small meter of the punch power under the health bar in the fight and something for the training."
- **Expected behavior:** In fights, a slim meter under each fighter's health bar shows the power of that fighter's last landed punch (fills, then fades; stronger colour for power shots). In bag, mitt and speed training, a power gauge shows the last punch and the session best.
- **Acceptance criteria:** Meter values come from the real contact impulse; screenshots at phone and desktop sizes in EN/HE/RU; no overlap with the health bars, Burst button or game pad.
- **Result:** new `power-meter.js`/`.css`: a "Power" row under each fight health bar and a training gauge (last punch and session best), from the real contact impulse; no overlap at 402×690 (EN/HE/RU), 360×640, 852×393, 1366×768. Evidence `qa/gotr-0040/`.

### GOTR-0041 — Quick view of the fighter's characteristics
- **Reported:** 2026-11-11
- **Status:** OPEN — planned for UX release R2 (agent `ux-r1` after R1)
- **Priority:** P1
- **Area:** UI / progression
- **Reported behavior / request:** "Add a small expandable button that will show all characteristics of the fighter; I don't need to go to options to see how much the power and stamina level and the rest."
- **Expected behavior:** A small button (header or HUD) that expands to show level/rank, power, speed, stamina, defence and the other ratings of the current fighter, then collapses; reachable in one tap from Train and Fight.
- **Acceptance criteria:** Values match the career ratings; opens and closes in one tap; phone portrait/landscape and desktop; EN/HE/RU.

### GOTR-0042 — Show both fighters' level and score; warn on a big gap
- **Reported:** 2026-11-11
- **Status:** OPEN — planned for UX release R2 (agent `ux-r1` after R1)
- **Priority:** P1
- **Area:** Fight setup / rivals / progression
- **Reported behavior / request:** "I want to see the level and the player score and opponent scores, so if the opponent's score is too high I know I need to train a bit. If there is a huge difference, add a warning with consent that the difference is too big and there is a low chance to win."
- **Expected behavior:** Before every fight (rival cards, cup, quick fight) the fighter's and the opponent's level and score are shown side by side with an estimated chance. Above a set gap, starting the fight first shows a warning ("Big difference: low chance to win") with Fight anyway / Train first.
- **Acceptance criteria:** Numbers come from the real ratings; the warning appears only above the threshold and remembers nothing; Train first opens a useful training; EN/HE/RU.

### GOTR-0043 — Losing still pays participation money
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — in the next release
- **Priority:** P1
- **Area:** Economy
- **Reported behavior / request:** "Let the user earn money even if he is losing, but less; it's basically participation money."
- **Finding:** Before this change a fight paid the same for a win or a loss (time × quality); Watch (automatic control) paid 0, which is why a player who never pressed Play saw 0 coins.
- **Implementation:** `game-domain.js` `fightPay`: win × 1.5, draw × 1, loss × 0.6 of the time-and-quality pay; Watch still pays 0; training pay unchanged.
- **Evidence:** `tests/fight-pay.test.cjs` — 60 s fight with equal stats: win 52, draw 35, loss 21 coins; Watch 0; heavy-bag training still 35.

### GOTR-0044 — "World" makes no sense; make it the Adventure and move its parts
- **Reported:** 2026-11-11
- **Status:** OPEN — planned for UX release R2 (navigation part of change #7), Adventure content per GOTR-0008
- **Priority:** P1
- **Area:** Navigation / information architecture
- **Reported behavior / request:** "The World category is very strange. I don't understand how this is relevant to the world. This one should include probably the adventure, and the components that are in there should be placed in different locations, because this sounds like settings more than world."
- **Expected behavior:** The World tab becomes **Adventure** (Gloryland map; until the first slice exists, a clear "coming soon" with the plan). Its current parts move: rivals, cup and events → Fight; arena choice → fight setup; history/record book, player & backup, school and other settings → the Settings sheet behind the header gear.
- **Acceptance criteria:** Every former World item reachable within two taps from its new place; no item lost; screenshots of the new navigation in EN/HE/RU.

### GOTR-0045 — Player profile dialog stays in English in Hebrew (and Russian)
- **Reported:** 2026-11-11 (screenshot from the owner's iPhone, v1.20, Hebrew)
- **Status:** READY FOR QA — merged with UX R1, next release
- **Priority:** P1
- **Area:** i18n / RTL / profile
- **Reported behavior / request:** "I'm in Hebrew view and my corner still shows English."
- **Cause (integrator):** every string of the profile dialog in `career-interface.js` ("Your corner", "Create player", "Play as guest", "Import backup", "Export backup", the guest/account note…) is hard-coded English; the file has no HE/RU strings, so in the RTL layout the full stops jump to the start of the lines.
- **Expected behavior:** The dialog (and every other player-visible string in that file) is fully translated in HE and RU with correct RTL punctuation; one name for this place consistent with the Gym/terms pass; no developer note about an account service; the close button shows no focus ring on open.
- **Acceptance criteria:** HE and RU screenshots at 402×690 with no English left except the player's own name; bidi-isolated names.
- **Evidence:** `qa/gotr-0045/user-v1.20-he-profile-english.webp` (owner's screenshot).
- **Result:** see GOTR-0031 R1 and GOTR-0046 audit.

### GOTR-0046 — Hebrew/Russian screens still show a lot of English (systematic sweep)
- **Reported:** 2026-11-11 (screenshot from the owner's iPhone, v1.20, Hebrew, fight intro): "Again, you see a lot in English."
- **Status:** MOSTLY DONE — merged; last 6 strings per language in game-shell.js in progress (`agent/ux-r1b`)
- **Priority:** P1
- **Area:** i18n / RTL
- **Observed:** header "Guest", HUD names "GUEST" / "SHADOW", intro card "GUEST VS SHADOW · ROUND 1 · GET READY", the "VS" badge and the title.
- **Causes (integrator):** `fight-presentation.js` has no HE/RU strings; the fight uses the opponent's English name although rivals have HE/RU names; the default profile name "Guest" is stored data shown untranslated.
- **Owner correction (2026-11-11):** "Not everything should be in Russian or Hebrew. Real terminology should stay in English, like shadowboxing — it doesn't sound right in Hebrew. The game name should always be in English."
- **English glossary (kept in Latin script in every language):** Glory of the Ring (game name); Shadowboxing, Sparring; Jab, Cross, Hook, Uppercut (and lead/rear variants); Slip, Roll, Guard; Combo, KO, Burst, VS; the combo names (First Rhythm, Corner Turn, Counter Chain, Thunder Arc, Rolling Return, School Signature). Bidi-isolated inside HE sentences. Everything else is translated (menus, buttons, instructions, places, tips, round text, Guest → אורח / Гость, opponents' HE/RU names). The owner can add or remove terms.
- **Acceptance criteria:** a Playwright audit (`qa/gotr-0046/i18n-audit.cjs`) walks every main screen and state in HE and RU and lists visible Latin-letter text; allowlist = the English glossary, the version number, numbers/coins and player-typed names; final run: 0 findings in both languages.
- **Evidence:** `qa/gotr-0046/user-v1.20-he-fight-english.webp` (owner's screenshot).
- **Result:** `qa/gotr-0046/i18n-audit.cjs` over 50 states per language with the English glossary (`GotrGlossary`): 0 findings outside game-shell.js; 12 remain there (reward card, history rows, Gym section title), being fixed now.

### GOTR-0047 — Camera in front for the result ceremony and for rope jumping
- **Reported:** 2026-11-11
- **Status:** READY FOR QA — in the next release
- **Priority:** P1
- **Area:** Camera
- **Reported behavior / request:** "When the fight is over and the referee holds the fighters, the camera should always be in front of them. Also, as a default, the camera lock when rope jumping should be in front."
- **Cause:** the side lock kept the side it had during the fight, so after the line-up it could end up beside or behind the fighters; an unlocked camera stayed wherever the player left it. Rope jumping under the lock used the same side view as the other stations.
- **Implementation:** `camera-director.js` `front()`: during scoring and the ceremony the camera frames both lined-up fighters (and the referee between them) from where they face, locked or unlocked, once per fight; an explicit unlock during the ceremony is respected; afterwards the player's own choice returns. Locked rope jumping is framed from the front, and the lock button reads "Front lock" there (HE/RU too).
- **Tests:** new `tests/camera-front.test.cjs`; `tests/camera-director.test.cjs` rope assertion changed on purpose from side-on to front.
- **Evidence:** `qa/gotr-0047/` — real app (`browser.cjs`, `results.json`): ceremony with the lock on (phone 402×690) and off (desktop 1366×768) and locked rope (phone): camera direction vs the subjects' facing = 1.000 in all three (1 = straight in front); screenshots `ceremony-locked-phone.webp`, `ceremony-free-desktop.webp`, `rope-front-lock-phone.webp` show both fighters and the referee from the front with the winner's hand raised, and the lion jumping rope seen from the front with the button "Front lock". Found on the way: after the bout the World window opens over the ceremony (`dialogsOverCeremony`), so players miss it — fixed by UX R2's result card (GOTR-0031 change #1). Tests: `tests/camera-front.test.cjs`, `tests/camera-director.test.cjs` pass.

### GOTR-0048 — Realistic rope jumping: real technique, several exercises by level
- **Reported:** 2026-11-11 with three YouTube Shorts as reference (`_R_YnM8wsro`, `pHwDFfgjwhg`, `S_1TLFc1uzE`)
- **Status:** PAUSED by the owner (2026-11-11: "leave the rope for now, I will come back later"); work so far kept on `agent/rope-real`. Reference videos: Drive files are 34–50 MB, over the 10 MB connector limit; owner may send ≤10 MB clips later.
- **Priority:** P1
- **Area:** Rope training / animation realism
- **Reported behavior / request:** "Investigate those rope jumping techniques and make the player jump in the same ways, different exercises in different levels. Look at the hands, the head, the legs, how he holds the rope, how he looks and stands. The current player looks artificial; imitate how a real person moves."
- **Note:** youtube.com is blocked by this environment's network policy, so the videos could not be opened here; the owner can upload screen recordings (frame analysis as done for GOTR-0027/0037) or allow the domain.
- **Target technique (boxing rope skipping):** upright torso, head neutral and eyes forward, shoulders relaxed and low; elbows close to the ribs, hands at hip height about a hand's width out, the rope turned by the wrists (small circles), not the arms; low jumps (2–5 cm) on the balls of the feet, heels never touch, soft knees; rope handles held loosely in the fingers; breathing rhythm and slight sway.
- **Exercises by level (proposal):** 1 basic two-foot bounce; 2 alternate-foot boxer skip; 3 side-to-side and front-back hops; 4 boxer shuffle (light weight shift, one foot leading); 5 high knees and running in place; 6 criss-cross; 7 double unders; 8 free-style combination. Each with its own rhythm, unlocked by level later (all open during development).
- **Acceptance criteria:** measured jump height, wrist circle radius, elbow-to-ribs distance and heel contact match the targets; side-by-side frame strips with the owner's references (once uploaded); every exercise loops without foot sliding or rope clipping through the body; existing rope tests pass.
- **Implementation:** Not started.
- **Evidence:** Not yet available.
- **Paused state (`agent/rope-real` dd389a2, pushed, not merged):** 7 selectable exercises (bounce, boxer skip, side/front hops, shuffle, high knees, double unders, free combination; EN/HE/RU); lion basic bounce measured: jump 18 cm → 3.4 cm, heels ≥ 2.4 cm up, planted-foot slide 0, hands 10–13 cm out from the hips with 2 cm wrist circles, elbows 1.4 cm from the ribs, head level (−2°), rope clears the feet; criss-cross behind a flag (rope cuts the forearms); rabbit not measured; no screenshots yet; 4 rope test limits changed on purpose (see branch). Not merged until checked visually.

### GOTR-0049 — Outfits that fit the place and the activity
- **Reported:** 2026-11-11
- **Status:** OPEN — queued after the muscle work (GOTR-0037), because outfits must fit the new body shapes
- **Priority:** P1
- **Area:** Gear / presentation / adventure themes
- **Reported behavior / request:** "During trainings without an opponent you can use hand wraps instead of gloves. For street fighting you don't use gloves or special boxing clothes; you can use sport long pants, sporty track style. Adapt the clothes, accessories, the look and everything to the theme."
- **Proposal (integrator):** an outfit set chosen automatically by activity and place, with the player's Shop items applied where they fit:
  - **Hand wraps, no gloves:** rope, shadowboxing, speed bag (and footwork drills). Gloves stay for heavy bag, mitts, sparring and fights.
  - **Street (Street Fight arena, Market Row):** bare or taped fists, track pants with side piping, T-shirt or tank top, sneakers.
  - **Underground (Basement, Dockside Hangar):** taped fists or fingerless gloves, cargo or track pants, no ring robe.
  - **Gym and clubs:** training shorts or joggers with gloves for contact work.
  - **Pro arenas and Championship:** full boxing kit (trunks, belt, boots, robe at the walk-in).
  - Shop gains outfit items per theme (wraps colours, track pants, tops, sneakers); prices kept, free during development.
- **IP rule:** original sportswear designs only; no brand marks, logos or a brand's signature stripe pattern.
- **Acceptance criteria:** the right outfit appears automatically in every activity and arena for both species; it follows the body in all poses (fit tests); Shop shows the new items with rendered thumbnails; screenshots per theme.
- **Implementation:** Not started.
- **Evidence:** Not yet available.

### GOTR-0050 — Muscular avatar is too skinny; smoother, more realistic surface
- **Reported:** 2026-11-11 (after v1.24)
- **Status:** READY FOR QA — reworked (`agent/muscle-3` 81a082b) and shipped in v1.26; surface roughness (RMS neighbour-normal angle, lion torso/back/arms rest) v1.24 13.3/16.3/12.5 → 6.3/5.9/4.9 (v1.23 smooth body 6.1/5.7/5.2); girths vs v1.24 upper arm +15%/+11%, forearm +13%/+10%, chest depth +11%/+8% (lion/rabbit); the four defects in the owner's crop removed; a soft dark patch remains on the front of the abs
- **Priority:** P1
- **Area:** Avatars / anatomy
- **Reported behavior / request:** "The new muscular avatar is good, but he's very skinny. He should be more built, his chest has to be bigger, his arms have to be bigger. [Stomach] please also make this a bit smoother. The muscles are good, but it now doesn't look realistic anymore." (voice-typed; "stop alarm" read as the stomach/abs)
- **Expected behavior:** More real volume (bigger chest and rib cage, bigger upper arms and forearms, broader shoulders and lats) on both species; softer abdominal grid and fine creases with smooth transitions; main muscle shapes kept.
- **Acceptance criteria:** measured chest, upper-arm and forearm girths before/after; before/after sheets per species; gear fit and punch range tests pass.
- **Implementation:** fixed extra-volume layer in `avatar-anatomy.js` (pecs, rib cage, lats, upper back, traps, deltoids, arms, forearms; rabbit 72% of the lion amount; waist, hands and legs untouched); rounder, lower ab pads, softer serratus, lighter muscle-border darkening (lion 0.42 → 0.28, rabbit 0.52 → 0.34).
- **Evidence:** `qa/gotr-0050/` — girths v1.24 → now, lion / rabbit: chest +5% / +3%, chest depth +12% / +9%, rib cage +8% / +5%, deltoid +12% / +9%, upper arm +16% / +11%, forearm +14% / +11%; waist and calf unchanged; before/after sheets per species; affected tests 15 files, 0 fails (incl. mitt-range, fight-range, strike-alignment); belt plate 1.6 / 0.6 mm (limit 4). The rabbit change is modest.

### GOTR-0051 — Real boxing stance: lead glove and lead foot forward
- **Reported:** 2026-11-11 (reference photo of two people doing pad work; not stored in the repo)
- **Status:** RELEASED v1.45 (compact guard) — gloves beside the cheeks, elbows bent 45–87°, in shadow, bag, mitts, sparring and fights, both species; `tests/compact-guard.test.cjs`, pictures `qa/gotr-0051/guard-lion.webp`, `guard-rabbit.webp`. **Owner decision 2026-11-12: keep southpaw for good** — the left-forward flip (`agent/stance-4`) is dropped. Awaiting owner check on a phone
- **Priority:** P1
- **Area:** Animation / stance
- **Reported behavior / request:** "I don't like how he stands. The gloves have to be left in front of the right, same with the legs."
- **Expected behavior (orthodox):** left foot forward and right foot back, about shoulder width and staggered, rear heel slightly raised, knees soft; torso turned about 30–45° (bladed); lead (left) glove in front at eye/cheek height, rear (right) glove back at the chin; elbows in. Same in guard, shadowboxing, mitt work, bag and fights, both species; punches start and return to this stance.
- **Acceptance criteria:** measured lead-to-rear glove offset along the facing direction, foot stagger and torso angle in guard for both species; front and side screenshots before/after; punch range tests pass.

### GOTR-0052 — No blocking summary after activities; inline rewards and always a next step
- **Reported:** 2026-11-11 (after v1.25)
- **Status:** IN PROGRESS (agent `adventure-oldtown`, with slice C1)
- **Priority:** P1
- **Area:** UX / adventure flow
- **Reported behavior / request:** "I don't understand what happens with missions: the first one brings me to training with mitts. When I finish it, what next? Every time you finish training or a fight you show me a summary I need to close to get back to the game. Don't show it — it covers the whole screen and I cannot do anything until I close it. Just show plus score plus coins under the winner announcement or after the exercise (notifications like in the fight). After a fight or training I need next steps, always. All has to be relevant to the adventure scenario flow."
- **Expected behavior:** the full-screen post-activity hub never opens by itself; rewards (+XP, +coins, mission stars, stat gains) appear as small non-blocking notifications on the stage; a compact Next bar always follows a training or fight with one primary action driven by the adventure state (next mission, retry for 3 stars, map, boss challenge with level comparison, newly unlocked place); missions show their goal at the start with a live counter.
- **Acceptance criteria:** browser run at 402×690 EN/HE: Adventure → Old Town → mission → finish → no blocking card, notifications visible, Next bar starts the next mission; same after a free fight and a free training.
- **Implementation:** In progress.
- **Evidence:** Pending.

### GOTR-0053 — D-pad stuck on "Out" in mitt training; mission goal strip covers the header
- **Reported:** 2026-11-11 (screenshot, v1.27, Old Town mission "Roll under 10 coach hooks")
- **Status:** READY FOR QA — fixed by the integrator in v1.28 (not verified on a phone)
- **Reported behavior / request:** "During training I clicked several times on the back arrow and it's just stuck on it; it doesn't give me any option to move anywhere else."
- **Cause:** `fighter-pad.js` ignored every new touch while it still remembered an earlier finger; when iOS loses the finger-lifted event, the D-pad stayed on "Out" forever. The goal strip was fixed to the top of the page, over the header.
- **Fix:** a new touch always takes over the D-pad, and a finger lift anywhere on the page releases it; the goal strip now sits inside the 3D stage below the cue and power rows.
- **Evidence:** `scripts/run-tests.sh fighter-pad adventure controls` pass; full suite for v1.28. No physical-phone test.

### GOTR-0054 — No floating cards over the game: every message part of the screen
- **Reported:** 2026-11-11 (on the v1.27 screenshot)
- **Status:** READY FOR QA — merged (`agent/clean-stage` f10608e), v1.32
- **Priority:** P1
- **Area:** UI / HUD layout
- **Reported behavior / request:** "Look where you put the message. It's blocking everything on top, floating over other buttons and the logo. It has to be part of the fighting screen, including the messages after the win with the stars, points and coins — part of the screen, even smaller. For example, if I win, one message and the rewards under it, as part of the picture, so everything stays clean. After playing, the judges' scores are also a card that opens and blocks the view. Go through the whole game, find similar cards that block the game, and embed them into the screen so it all looks clean."
- **Expected behavior:** a fixed HUD layout with reserved zones inside the 3D stage (top: names/health/power and one status line; centre: one short announcement such as the winner, with rewards and stars directly under it; bottom: controls and the Next bar); compact, translucent, small type; nothing ever covers the header, tabs, logo, controls or the fighters' bodies; judges' scores as a slim row inside the stage (details on demand); every other blocking card in the game audited and moved into these zones.
- **Acceptance criteria:** an overlap audit (Playwright) of every state — training, mission running and finished, fight intro, round, KO/count, decision with judges, Burst tip, Academy lesson — at 402×690, 360×640, 852×393, 1366×768 in EN/HE: 0 overlaps of HUD elements with the header, controls or each other, and no element covering more than the agreed share of the stage; before/after screenshots.
- **Result:** new `stage-hud.css` zones; all HUD messages plain text with a soft shadow; judges as one slim row with Details / New fight; rewards and the Next bar inside the stage above the lowest control; cue, gauge, skip pill and Academy HUD compacted. Overlap audit `qa/gotr-0054/hud-audit.cjs` (7 states + lesson): 60 overlapping pairs and 8 outside-stage elements before → 0 after (final run 402×690 and 852×393 EN; earlier full run EN+HE at 4 sizes had 2 left, since fixed); largest HUD share 32.3% (judges card) → 14.4%. Open: centre text and judges row can still cross the fighters' bodies (not in the audit); Cup result dialogs still open by themselves; no HE re-run after the last fix.

### GOTR-0055 — Adventure screen: map first, graphic, ordered, progress and side quests
- **Reported:** 2026-11-11 (screenshot, v1.29, Adventure → Old Town)
- **Status:** READY FOR QA — merged (`agent/adventure-ui2` fea451b), next release
- **Priority:** P1
- **Area:** Adventure UI
- **Reported behavior / request:** "The screen is stretched. The text in the boxes takes too much of the screen; make it more graphic so the map is the large portion. Locked, unlocked, then locked again — the order doesn't make sense; unlocked on top, next steps after. Show a progress bar per stage that moves to the next milestone; when a stage is completely done, show on the map animated dots appearing one by one from stage one to stage two (the player moving). I don't know how to embed the side missions; I was thinking of walking like in Roblox/GTA, but that may be complicated now — if it can be done simply and fast do it, if not, embed the side missions simply and clearly into the stages."
- **Decision (integrator):** walking the city is a large separate project (character controller, collisions, street layout, camera, phone performance) and is not fast; deferred. Side zones become optional side quests attached to chapters: Old Fort ← 1, Midnight Fairground ← 2, Pirate Cove ← 3, Tech Pier ← 4; their pins appear when the chapter is reached and open a themed bonus fight or training.
- **Acceptance criteria:** no horizontal overflow at 402 and 360 px; map ≥ 60% of the phone screen; compact icon-based bottom sheet; playable missions first and "coming soon" last; per-chapter progress bar with milestones; route dots animation between chapter pins on completion; EN/HE.
- **Result:** no overflow at 402/360/1366; map 65% of the screen at 402×690, 62% at 360×640 (47% at 1366×768); bottom sheet with ~26% peek, icon tiles with stars; playable first, coming soon last; chapter progress bar with marks every 3 stars + boss (animates, e.g. 0 → 21.4%); 10 route dots after a boss win, next pin highlighted; side-zone pins appear/pulse when their chapter is reached (side quests open a themed free fight; bonus reward not yet). Evidence `qa/gotr-0055/ui2-browser.cjs`. Not verified: route-dot screenshots, 360 px in HE.

### GOTR-0056 — The adventure must be one connected story
- **Reported:** 2026-11-11
- **Status:** IN PROGRESS — story lines and journal merged (`adventure/story.js`, 0688cd7); story sets and scenes in progress (agent `story-sets`)
- **Priority:** P1
- **Area:** Adventure / narrative
- **Reported behavior / request:** "Make sure it will be interesting, challenging and fluent. We are building an adventure game, so it's a story; a story has a flow with different things related to it, everything connected — not just jumping between arena and arena, training and training."
- **Approved (owner chose "Yes, build it"):** story layer in `docs/adventure/STORY.md` — short character lines before/after each mission with portraits, missions chained as story beats, the Next bar shows the next beat, recurring rival Dash, a story journal; Chapter 1 "Nobody" and Chapter 2 "The Street" first.

### GOTR-0060 — The story needs a clear start, next step and end
- **Reported:** 2026-11-11 (v1.38)
- **Status:** IN PROGRESS (agent `adventure-ui4`)
- **Priority:** P1
- **Reported behavior / request:** "I don't understand the story flow. What is the beginning? What is the end? I don't understand what's going on. Where is the start?" Also confirmed: route dots drawn over roofs, truncated tile names, clipped sheet.
- **Plan:** first open of Adventure plays a chapter title and the arrival scene, then one "Start the story" button; afterwards a primary "Continue story" button with the next mission; chapter goal line and "Step N of 5"; chapter end with closing scene, "Chapter complete", route dots and the next chapter's title; "Story so far" recap on return. Route dots as 3D markers on the road; short tile labels; sheet not clipped.

### GOTR-0061 — Smarter side games and better city graphics
- **Reported:** 2026-11-12
- **Status:** IN PROGRESS (agents `story-3` skill trials, `city-gfx` city graphics)
- **Priority:** P1
- **Reported behavior / request:** "Let's improve the graphics on the city and side tasks. Also improve the side games; I don't like a game where the lion needs to carry a bag. How is this interesting? Be smart and intelligent, and make the game smart and intelligent. Players will be gamers aged 12 to 50 who play advanced games, so story and graphics are crucial."
- **Design rule (integrator):** no chore, carry or escort games. Every side game is a 45–90 s skill trial built on the boxing mechanics: readable challenge, escalating difficulty, risk/reward, medals (1–3 stars), personal best, harder variant after gold. Humour lives in scenes and characters.
- **Trials:** Ch.1 "Brick's bag" (pendulum bag: timing + punch selection + slip), "Sleep talker" (memory combos, Simon-style); Ch.2 "Rooftop barrage" (dodge and reflect), "Cut him off" (footwork puzzle: cutting off the ring), "The hustler's bet" (read feints, wager coins).
- **City graphics:** ambient occlusion, colour grading per time of day, animated water, moving traffic/boats/pedestrians, landmark craft, cinematic camera; budget ≤ 60 draw calls, ≤ 350k triangles.
- **Next design steps (not started):** bosses with readable patterns and phases, scouting a rival before the fight, story choices with consequences.

### GOTR-0062 — Bosses with phases and tells, scouting, story choices
- **Reported:** 2026-11-12 ("Yes, design the bosses, scouting and story choices"; design approved: "Yes, build it")
- **Status:** APPROVED DESIGN — `docs/adventure/BOSSES_SCOUTING_CHOICES.md`; build queued (Opus agent) starting with Brick, when an agent slot frees
- **Priority:** P1

### GOTR-0063 — Adventure is the permanent main screen; Training and Fight behind one side icon
- **Reported:** 2026-11-12
- **Status:** RELEASED v1.45 — Adventure map is the home layer, both rows removed, one round modes button at the side (`modes-menu.js/css`); evidence `qa/gotr-0063/` (402×690 home and training screenshots: nothing over the fighter's head). Awaiting owner check
- **Reported behavior / request:** "Take training, fight and adventure off the main permanent screen. Always stay in adventure mode; the three modes go into one icon on the side of the screen that expands to small icons below it for training and fight. There should always be a way to get back to adventure."
- **Owner follow-up (2026-11-12, screenshot v1.42):** remove BOTH rows — the Train/Fight/Adventure tabs and the station toolbar (Shadowbox ▾, Train 15s, Auto, Fight Academy) — because they overlap the fighter's head; Adventure is the default; everything else as small icons at the screen edge; nothing may cover the fighter's head or body (add the head to the HUD overlap audit).

### GOTR-0072 — Shop preview broken: the Fighter's body is invisible
- **Reported:** 2026-11-12 (v1.47, iPhone; picture `qa/owner-2026-11-12/v147-1.webp`: only mane, one glove, tail and boots are drawn)
- **Status:** FIXED on branch `agent/preview-occluders` (not released) — reproduced in the browser at 402×690 and 460×860, awaiting release and owner check
- **Root cause (proven):** the body is skinned on the GPU from world-space dual quaternions that only a pose update refreshes (`LionCoach.syncSkin`). A story scene or skill trial (v1.47 story flow) borrows the Fighter's rig, poses it in the story set and gives it back; with the game paused on the Adventure map at the mitts station the engine never posed the rig again (mitt work keeps its last fixed-step frame while the clock stands still), so the body stayed ~9 m away in the story set while gloves, boots, mane and tail (rigid, on the bones) came back — and the bones kept the trial's pose, seen from behind. Not the camera, view offset, culling or clipping planes.
- **Fix:** `adventure/story/story-scenes.js` re-syncs the skin of every rig it gives back and asks the arena to pose again; `career-drills.js` `TrainingArena.repose()` (drops the held mitt frame); `game-presentation.js` Shop preview poses again on open and syncs the skin whenever it frames.
- **Evidence:** `qa/gotr-0072/before-402x690-lion-after-trial.webp` (same picture as the owner's), `after-402x690-*.webp` (lion and rabbit, every category); test `tests/shop-preview-body.test.cjs` (real browser: body pixels and skin-to-rig distance in every category, item view and Full view, both species — fails without the fix: "the skin is 9.3 m away from the rig").
- **Acceptance:** the whole Fighter is drawn in the Shop preview for every category, both species; browser picture at 402×690; a test that fails when the body mesh is not rendered.

### GOTR-0073 — Gym equipment in front of the camera hides the Fighter
- **Reported:** 2026-11-12 (v1.47; pictures `v147-2.webp` dummy station: a heavy bag fills the left third and covers the Fighter; `v147-4.webp` mitts: a bag covers the Coach)
- **Status:** FIXED on branch `agent/preview-occluders` (not released), awaiting release and owner check
- **Cause (reproduced, `qa/gotr-0073/before-402x690-pads-orbit.webp`):** on a tall phone the camera stands 7–12 m from the figures, further out than the gym's two background hanging bags (5.9 m from the centre), benches, racks and lockers; the room's cutaway hides the near WALLS but not this equipment, and the existing ray test only checked a camera 5.8 m away. Any orbit (or the side lock choosing that side) puts a bag between the camera and the figures. In the fight the free camera on a tall phone (10.7 m, 1.8 m high) looks through the near grandstand tier.
- **Fix:** new `occlusion-guard.js`, run once per drawn frame after the camera is placed: lines from the camera to head, chest, hips, hands, knees and feet of the Fighter and the Coach / partner / opponent and to the target's centre, widened to a body's width (0.26 m), tested against the oriented bounding box of every scenery mesh (and every instance of the batched fixtures); what a line crosses is hidden and shown again 18 frames after the line is clear. Never touched: the figures, the active target with its stand, the ring, the referee. The fight's near-side crowd rule now also holds while the bout is paused. The stations' default cameras are unchanged: at 402×690 their sight lines were already clear (browser run: 0 blocked default views in training, side lock on and off).
- **Evidence:** `tests/occlusion-rays.test.cjs` — shadow, heavy bag, dummy, speed bag, sparring, mitts, rope and the fight; camera every 15° at 5.8–12.5 m and two or three heights (2,040 views): independent triangle ray casts find blocked views without the guard at every station (hanging bags, benches, dumbbells, towels, lockers, grandstand) and none with it. Browser run `qa/gotr-0073/occluders-browser.cjs` (+ `-run.txt`) at 402×690, lock off and on: 0 blocked with the guard. Pictures `qa/gotr-0073/before-…/after-402x690-*.webp` (mitts: the leather bag fills the screen before, both figures clear after).
- **Known limits:** a figure can still stand in front of another figure or of the target (the Fighter between the camera and the Coach from behind), and the referee or a ring post/rope can cross a fighter — these are never hidden (ring geometry is kept on purpose, see fight-arena.js). Props are hidden, not faded.
- **Acceptance:** nothing between the camera and the Fighter / Coach / target: occluding equipment is moved, hidden or faded for every station and camera angle (side lock and free); measured by ray tests from the camera to head, chest and feet of each figure.

### GOTR-0074 — Stance must be the real orthodox boxing stance, exactly as the owner's reference photo
- **Reported:** 2026-11-12, repeated ("you are mistaken for several times already"); picture `v147-3.webp` shows today's pose: both gloves on the face
- **Status:** RELEASED v1.51 — owner approved the pictures on 2026-11-13 ("Approve"). Each fighter mirrored across its own sagittal plane (no canvas mirror). Measured: left foot 41–54 cm ahead, left glove 32 cm in front of the chin with the elbow at 83–84°, right glove 2.8–4.7 cm from the cheek, shoulders 33° bladed. Pictures `qa/gotr-0074/`. Not pressed in the browser: Hook and Uppercut buttons; not checked on a phone. Supersedes GOTR-0051
- **Owner's words:** "right leg back, left leg front, right hand back defending the face, left hand a bit bent in front. This is the actual boxing position… exactly how I want him by default."
- **Acceptance (measured, both species, every mode):** left foot forward, right foot back, feet about shoulder width and staggered, rear heel raised, knees soft, torso bladed 30–45°; LEFT glove in front of the face at eye/cheek height with the elbow bent about 80–110° (not straight, not touching the face); RIGHT glove at the right cheek/jaw, close but not pressed into the face (gap 2–5 cm), elbow down at the ribs; chin slightly down. Jab = left hand, Cross = right hand. Front, 3/4 and side pictures shown to the owner BEFORE release.

### GOTR-0075 — Guard button is not understood; fight clock half off-screen; ceremony text badly placed
- **Reported:** 2026-11-12 (pictures `v147-5.webp` "7 SECONDS" cut at the left edge; `v147-6.webp` result text and judges' line across the fighters)
- **Status:** READY FOR QA — branch `agent/timer-sound` (headless browser at 402×690 EN/HE/RU; not checked on a phone)
- **Found (a):** Guard queued a 0.55 s `guard` action, but the player's idle stance is already `guard` with `defend`, and an ordered guard had no `guardStyle`, so the pose did not change at all (gloves measured identical) — nothing showed it worked. In fights a punch on the gloves/arms is `blocked`: no health lost, Burst charged (`boxing-fight.js` contact). Sparring counts blocks as defence. On the mitts the Coach's swing is ducked (Duck), not blocked; at the bag, dummy, speed bag and shadowboxing nothing hits back, so Guard has no effect there. **Proposal (not built):** on the mitts let the Coach also throw slow straights at the Fighter's head that Guard catches (counted as defence, a pad "thud"), so Guard is trained where the owner trains most.
- **Fix (a):** a held Guard eases both gloves into the blocking cover (fight and stations; measured in the fighter's frame: lead glove 11 cm in, 11 cm up, 10 cm forward, rear 9 cm in, 15 cm up); plain-text hint in the free top band the first 3 presses per place and in the first 2 fights, worded per place (fight / sparring / mitts → Duck / "nothing hits back here"); "Blocked · no damage" text and a glow on the Guard button for each punch the player blocks.
- **Found (b):** the countdown had `left:auto` (career-interface.css) + `right:auto` (stage-hud.css) + `translateX(-50%)` (game-shell.css) → half outside the stage. **Fix:** centred under the round bar in the band left of the edge tools (mirrored in RTL), one line, gold digits.
- **Fix (c):** judges' cards only when the bout goes to the cards (`stoppage==='points'`); then three compact gold-edged score cards in a row at the inline-start side under the winner line, above the heads; winner/KO line moved to the top band; Details / New fight in the bottom band; after the result the pad and the old move panel are put away; the Next bar stacks above the result buttons. Evidence `qa/gotr-0075/` (pictures + `fight-browser.cjs`, boxes measured against both fighters: no overlap, nothing clipped). Tests `tests/fight-guard-hud.test.cjs`, `tests/fight-ui.test.cjs` (KO without cards).
- **Not changed:** the post-award Next bar (`adventure/oldtown.js`) is still a box across the fighters' legs when it appears.
- **Requests:** (a) Guard button: the player does not understand what it does — make the effect visible and explained. (b) The last-seconds countdown must be in the middle, never cut. (c) Ceremony: do not show the judges' numbers unless the fight goes to the cards; then show them as designed score cards at one side (part of the arena theme), not text over the fighters; nothing over the fighters' heads or bodies.

### GOTR-0076 — Corner break like a real fight
- **Reported:** 2026-11-12 ("I also asked several times"; picture `v147-7.webp`: during BREAK both fighters stand in the middle in guard)
- **Status:** OPEN — P1
- **Request:** at the break each fighter walks to their own corner; a cornerman puts a stool in the corner (corner colour), the fighter sits, the cornerman puts a towel on them, and the fighter drinks water from a bottle; they stand up and the stool is removed before the next round.

### GOTR-0077 — "Brick's bag" trial: hard to hit properly; scene must look and move realistically
- **Reported:** 2026-11-12 (v1.47, story step 2: the swinging bag trial with two characters)
- **Status:** OPEN — P1 (queued; starts when an agent slot frees)
- **Owner's words:** "This is a good task, but I'm not managing to hit properly. Something doesn't work right, so improve the usability and experience and graphics around this… the scene, the theme, the movement, everything has to be more realistic, the movements more smooth, and shadows. Add better design of the street, the road, the bag, everything."
- **Acceptance:** (1) input: find why hits do not register (timing window, touch target, missing feedback) with measurements; a first-time player lands a hit within the first 3 swings; clear cue for the right moment and clear hit / miss feedback; works with the punch pad on a phone. (2) motion: bag swings with real pendulum physics, reacts to each hit; the Fighter's punch connects with the bag (no gap, no pass-through); smooth 60 fps motion of all characters. (3) look: street set with a real road, kerb, pavement, building fronts, street lamp, shadows for every character and the bag; a believable heavy bag (chain, swivel, leather, seams). Phone pictures before/after shown to the owner.

### GOTR-0078 — Chapter 1 rewritten as a visual story: "The Dream" (owner's script)
- **Reported:** 2026-11-12
- **Status:** IN PROGRESS — P0 for the Adventure (flow/text on `agent/dream-flow`, visuals on `agent/dream-1`). Script: [`docs/adventure/CHAPTER1_SCRIPT_V2.md`](../adventure/CHAPTER1_SCRIPT_V2.md). Supersedes the chapter-1 step list of GOTR-0069; absorbs GOTR-0067, 0049, 0065, 0062, 0077, 0066, 0009.
- **Owner's points:** the story is "not game enough": it starts with text, people will not read it like a book. Open with visuals: zoom from the city map to the bus station, the Fighter gets off the bus in normal clothes with a bag, goes to the gym, talks with the Coach (skippable), and only then the first task, which follows from that talk. Never call him "nobody": he comes with no money and a dream to be world champion. Beats: first fight in the gym against the gym's best boxer (chapter boss; a loss is expected) → job cleaning the gym (side task) → night Shadowboxing and bag; the last hit drops the bag to the floor → apology, sent to the market → stops a robber stealing a woman's bag, street fight without gloves in street clothes → reward equals the price of a new bag → buys it in the shop → Coach impressed, two-sided bag drill → unofficial fight proposed, exercises → night, illegal fight at the docks, no gloves, long pants, hand wraps → advanced exercises → rematch in the gym with an audience → chapter complete. Chapter 2: more skills, side missions, first professional equipment, first professional Arena fight in the junior league.
- **Also required:** really moving from place to place through the streets with a Skip option; very good graphics for streets, audience, venues and equipment (the bag); all moves smooth and realistic; clothes always fit the situation; new detailed characters — the story Coach is not a rabbit, the robber is a bigger muscular animal (suggested: a wolf in black rocker leather with a gold necklace).
- **Acceptance:** each build slice in the script is played from a fresh profile in the browser at 402×690 and shown to the owner as pictures before release.
- **Slice 1, pictures (branch `agent/dream-1`, READY FOR QA, not released):** Coach Bruno (bear) and Brick (bulldog) on the game's rig (`adventure/story/story-cast.js`), street clothes + bare hands + duffel bag for the lion and the rabbit with an outfit switch that restores the kit, everyday poses and a walk cycle (`dream-pose.js`), the bus-station street and the gym hall (`dream-sets.js`), scenes `dream_opening`, `dream_gym_talk`, `dream_after_brick` (`dream-core.js`, `dream-scenes.js`). Hooks for the story flow: `docs/adventure/DREAM_HOOKS.md`. Test `tests/dream-scenes.test.cjs`. Pictures: `qa/gotr-0078/slice1/`. Not wired into the step list (owned by `agent/dream-flow`); real shadows and frame rate not measured on a phone.
- **Progress 2026-11-13 — game logic and text, branch `agent/dream-flow` (not released; pictures/3D on `agent/dream-1`):** chapter 1 step list = the script's beats 0–12 + side job A (ids in `adventure-progress.js` dreamSteps; table in `docs/adventure/STORY.md`); chapter titles "The Dream" / "Junior League" ("Nobody" removed); Coach Bruno. Fresh profile: opening film → gym talk → first fight vs Brick start by themselves, each skippable (portrait conversation while `dream-1` is not merged; its scenes and Brick's look are used through the DREAM_HOOKS API when present). Brick on day one: power ×1.4, tempo ×1.18, skill +0.10; **a loss advances** (save `adventure.story.firstBrick`), then job + side job A unlock; Bruno's later lines follow the first result. Beat 6 reward = heavy bag price (90 ◈, `game-domain.js` gear), beat 7 purchase completes the step; Docks prize 120 ◈. Rematch = boss rules (entry Level 5, gate advice) → chapter summary. Old saves mapped once (old step → new beat; stars kept). All lines EN/HE/RU. Stand-ins (marked in the game): side job A (steps at the bag), bag-break scene, apology scene/walks, market fight with gloves, Otto's Corner counter on the map, two-sided drill (bag alone), Docks fight with gloves, fight-night audience. Also: the post-fight Next row is plain buttons in the stage's bottom band (no panel; the idle pad steps aside), measured clear of both fighters at 402×690. Evidence: `qa/gotr-0078/flow/` (`flow-browser.cjs`, `next-row-browser.cjs`, branch alone, EN+HE, forced loss); `qa/gotr-0078/flow/with-dream-1/` = a local throwaway merge with `agent/dream-1` + v1.51: the flow runs end to end with the films, Brick's rig and `dream_after_brick`, but the dream-1 scene pictures show the characters' limbs stretched into huge loops (not caused by the flow code; suspected v1.51 root mirroring vs dream-1 poses — for the dream-1 agent); tests `story-flow`, `adventure-oldtown`, `adventure-progress`, `adventure-story`.

### GOTR-0079 — A gold band floats behind the rabbit Fighter and moves with it
- **Reported:** 2026-11-12 (v1.48, iPhone, heavy-bag station, rabbit as the Fighter; picture `qa/owner-2026-11-12/v148-floating-band.webp`: a gold band with a buckle hovers at waist height about half a metre behind the rabbit)
- **Status:** FIXED on branch `agent/preview-occluders` (not released), awaiting release and owner check
- **Root cause (proven):** `game-presentation.js` waistbandMesh moved the band into the shorts' bind space with `SkinnedMesh.bindMatrixInverse`, which three.js rewrites every frame from the mesh's CURRENT world matrix. A band first built while the Fighter stood at a station was baked that far from the pelvis (0.67 m at the heavy bag) and then followed the rig. The lion's band is built at start-up at the scene origin, so it was right; the rabbit's is built later, at whatever station the player is in. Not species-specific geometry: a lion first dressed at a station failed the same way in the test.
- **Fix:** use the inverse of the shorts' bind matrix. Test `tests/waistband-pelvis.test.cjs`: band centre within 6 cm of the pelvis bone and within 5 cm of the shorts, both species, built at every station, four designs, five poses, and after switching species at the heavy bag (before: 0.674 m, after: 1–3 mm).
- **Acceptance:** no detached gear on either species in any station, also after switching species and equipping each waistband; a test measuring the waistband's distance to the pelvis.

### GOTR-0080 — Story scenes and skill trials: characters torn apart after v1.51
- **Reported:** 2026-11-13 (v1.51, iPhone, "Brick's bag" trial: both characters stretched into huge sheets)
- **Status:** RELEASED v1.52 (hotfix)
- **Root cause:** v1.51 mirrors every fighter at its root (`scale.x = -1`, GOTR-0074) and the pose code relies on it; `adventure/story/story-scenes.js` reset a borrowed rig to scale 1. Regression missed because the full suite has no rendered check of a story scene after the mirror.
- **Fix:** borrowed rigs keep the mirrored root. Evidence: screenshot of a story scene at 402×690 with intact characters; `tests/story-mirror.test.cjs`. Not verified by picture: every trial and scene (choreography may now face the other way in places).

### GOTR-0081 — Character portraits look childish; "Pip" is not a coach's name
- **Reported:** 2026-11-13 (crop of the story line portrait: a flat cartoon rabbit face in a gold ring next to "Coach Pip")
- **Status:** OPEN — P1
- **Request:** portraits must look designed, not kids' style; change the names — "Pip" is not a good coach name.
- **Plan:** portraits rendered from the real 3D heads (lit three-quarter view, dark vignette, thin metal ring), one per character; the story Coach is Bruno (GOTR-0078); the rabbit mitt holder is renamed **Mack**; every "Pip" text, id shown to players and journal line updated in EN/HE/RU.
- **Progress 2026-11-14 (branch `agent/dream-flow`, not released):** players see **Mack** / מאק / Мак everywhere (internal id `pip` kept; test `adventure-story` scans the player-visible sources and story data for Pip/פיפ/Пип). `adventure/portraits.js`: portraits rendered once per session from the real 3D heads with the game renderer (three-quarter view, studio light, gloves hidden, dark vignette), cached as images; thin brushed-metal ring with a coloured accent arc; 3D today: the Fighter, Mack, Bruno and Brick (agent/dream-1 StoryCast); monogram badges for Fang, Mrs. Hazel, Otto, Slick, Hook, Vix, King Hyena, Dash and the chapter-2 extras; neutral silhouette if render-to-image fails. 42 px in story lines, 56 px in the quest panel, 2x pixels. Evidence `qa/gotr-0081/` (EN+HE, 402×690 at 2x).

### GOTR-0082 — Brick's model is broken: long rods stick out through his shoulders
- **Reported:** 2026-11-13 (v1.54, iPhone; pictures `qa/owner-2026-11-12/v154-brick-broken-talk.webp`, `v154-brick-broken-fight.webp`: two long tan bars cross the neck/shoulders in the gym talk and in the fight; also brow pieces float off the head)
- **Status:** OPEN — P0
- **Acceptance:** Brick rendered in the talk scene and in a real fight on the game's own cameras with no detached or stretched parts, in guard, punching and knocked down; a test measuring that every Brick mesh stays within a body-sized bound of the rig.

### GOTR-0083 — First fight vs Brick must be in the gym, not an arena ring; Bruno referees
- **Reported:** 2026-11-13 (v1.54: the fight ran in the Fight Night ring with ropes and audience and the rhino referee)
- **Status:** OPEN — P1
- **Request:** "Please fight in a gym and not in a ring, without audience and without the ropes; the judge is the coach."
- **Acceptance:** beat 2 takes place on the gym floor (mat area of Bruno's Gym), no ring, ropes, posts or crowd; Bruno counts and stops the fight in place of the referee; fighters stay inside the mat by an invisible boundary.

### GOTR-0084 — Gym conversation reads unnatural; rewrite the opening dialogue
- **Reported:** 2026-11-13 (v1.54: "I want to train. Training costs money. I don't have money, I have only a bag… This is not how people talk")
- **Status:** OPEN — P1
- **Owner's direction:** the Fighter is excited: he came to the city to follow his dream. Coach: "Do you have money for training?" Fighter: no, but he will do whatever it takes — he heard this is the best place, all the best fighters started here. The Coach then offers him jobs to do as payment for the training.

### GOTR-0085 — After the first Brick fight the Fighter's arms are stretched into huge loops
- **Reported:** 2026-11-13 (v1.54, iPhone; pictures `qa/owner-2026-11-12/v154-after-fight-torn-1.webp`, `-2.webp`)
- **Status:** RELEASED v1.56 (hotfix)
- **Root cause:** inside a bout the fighters sit in one mirrored ring group with root scale 1 (GOTR-0074); the job-offer scene took the Fighter straight out of the bout and kept that scale, so the pose code (which expects the mirrored root) tore the skin. Fix: `adventure/story/dream-scenes.js` always sets the mirrored root on a borrowed rig. Evidence: scene replayed in the browser with the rig forced to scale 1 — intact; `tests/story-mirror.test.cjs`. Not replayed through a real fight in the browser.

### GOTR-0086 — "KO … won" stays on screen in the next training; goal line and tools cross the Fighter's face
- **Reported:** 2026-11-13 (v1.54; picture `qa/owner-2026-11-12/v154-stale-ko-text.webp`: after the Brick fight, the Shadowboxing step shows "KO Barak won" and the goal line "50 punches in 45 seconds…" over the lion's face, behind the Auto / timer tools)
- **Status:** OPEN — P1
- **Acceptance:** the bout announcement is cleared when a fight ends or the mode changes; the goal line sits above the head area and never under the edge tools; nothing over the Fighter's head at 402×690 (measured).

### GOTR-0088 — Finisher: a signature super punch that knocks the Opponent out cold (earned or bought)
- **Reported:** 2026-11-13
- **Status:** OPEN — P1 (queued; needs a Fable animation agent when a slot frees)
- **Owner's words:** "Add a final super punch, like for example the famous uppercut to the chin [of a well-known heavyweight champion], and the opponent will fall on the floor, fainted. This has to be really animated. And this can be something that can be earned or bought."
- **Design (integrator's proposal; original names only, no real fighter's name or likeness):**
  - A **Finisher** slot on the pad. First finisher: **"Sunday Punch"** (owner chose the name 2026-11-13; boxing slang for the knockout blow) — a dipping step inside, then a rising rear Uppercut under the chin.
  - **When it is available:** the Opponent is hurt (health under about 25 %) and the Burst meter is full; the Finisher button lights up for a few seconds. A miss or a block spends the Burst.
  - **What it shows (about 4–5 s, skippable after the first time):** camera cuts to a low side angle, slow motion on the dip and drive from the legs, the glove lifts the chin, sweat spray, the Opponent's feet leave the canvas, eyes roll, body goes limp and drops flat on the back, one arm flops, the referee (or the Coach in the gym) waves it off without a count; the Fighter stands over him, then walks to a neutral corner. Crowd reaction and a deep impact sound.
  - **How to get it:** earned by finishing Chapter 1 (Bruno teaches it before the Brick rematch), or bought in the Shop (price shown; free in the development build). More finishers later (e.g. a liver Hook, an overhand Cross) as rewards or Shop items.
  - **Opponents:** bosses can have their own finisher with a visible tell that the player can Slip or Guard.
- **Acceptance:** real-time 3D animation on the game rigs in the orthodox stance; the knocked-out Opponent ends lying on the floor with a believable ragdoll-like settle (no hovering, no clipping through the canvas); works in the ring, in the gym and in ringless venues; frame strip and a phone recording-style sequence shown to the owner before release.

### GOTR-0070 — Picture stretched tall on the phone in training
- **Reported:** 2026-11-12 (iPhone screenshot, v1.45, mitts: Fighter and Coach tall and thin)
- **Status:** RELEASED v1.46
- **Priority:** P0
- **Root cause (measured):** `fighter-pad.js` portrait safe frame called `camera.setViewOffset(1,1,…)`; three.js r128 sets `camera.aspect = fullWidth/fullHeight` there, so the camera became square (aspect 1.000) on a 460×860 canvas (0.535). Visible since the stage got taller in v1.45.
- **Fix:** the full size passed to the view offset carries the canvas aspect; re-applied when the canvas shape changes. Measured after: camera 0.535 = canvas 0.535. Test `tests/pad-frame-aspect.test.cjs`.

### GOTR-0071 — Timed round: sound stops and the red "15s" button is unexplained
- **Reported:** 2026-11-12 (iPhone Safari, v1.45, mitts with the Coach; screenshot: edge tools "Play", red "2s", settings, station)
- **Status:** READY FOR QA — branch `agent/timer-sound` (not verified on an iPhone)
- **Priority:** P0
- **Reported behavior / request:** "I clicked on the training and it started to calculate 15 seconds back and sound disappeared."
- **Root cause (measured in the browser, game time stepped in the page):** one tap on the timer silently switched Auto to Play (UX R1: the round is the player's turn), so the Fighter stopped punching: Auto free training 26 sounds / 10 s, after the tap 0 swings, 0 contacts, 0 sounds; the same round left in Auto 26 sounds / 10 s; punches by hand during the round sound normally (23 sounds / 6 s). Nothing said the round had started or that the punch buttons were needed; no bell at start or end; at 0 the scene froze (`isPlaying=false`). The owner's screenshot ("Play" label, no pad at 2 s) shows Auto at that moment; why it was silent then is not reproduced (Auto rounds sound here).
- **Fix:** start bell (1 strike) and final bell at 0 (3 strikes); a second tap stops the round (no final bell); scene keeps running after the bell; timer tool = stopwatch + seconds with "Start a 15-second round" / "Stop the round · Ns left" labels; plain-text line at the top inline-start corner (no box, measured clear of Fighter and Coach): "15-second round · N s left / Land as many clean punches on the mitts as you can. Use the punch buttons. / Tap the timer again to stop", Auto text when the round runs in Auto, result line "Round over · N clean hits · XP…" with an "Again" action; EN/HE/RU; pad repainted at once. Audio hardening (GOTR-0068): a sound request on an unlocked but `suspended`/`interrupted` context asks it to resume (≤ 2/s) instead of staying silent until the next tap — effect on a real iPhone unverified.
- **Evidence:** `qa/gotr-0071/` (402×690 EN/HE idle, start, mid-round, result; before picture; `round-browser.cjs` + run log); test `tests/timed-round-sound.test.cjs`.
- **Seen, not changed:** the post-award "Next mission / Challenge Brick" bar (`adventure/oldtown.js` showNext) is a box across the fighters' bodies. → moved on `agent/dream-flow` (GOTR-0078): plain buttons in the bottom band, measured clear of the fighters.

### GOTR-0064 — Lion head and face (and the other avatars)
- **Reported:** 2026-11-12 (three reference pictures of lion boxers, style targets only, not stored in the repo)
- **Status:** RELEASED v1.48 — owner approved the corrected face on 2026-11-12 ("yes it's much better"). Pictures `qa/gotr-0064/lion-forehead-phone-head.webp`
- **Reported behavior / request:** "Please fix the lion head. His head is sharp on the top and he needs more volume. Improve the shape of his face; same for the rest of the avatars."
- **Targets from the references:** broad rounded skull, heavy brow, strong wide muzzle with defined nose bridge and chin, eyes set under the brow with a focused look, full voluminous mane flowing back and down onto the shoulders (no pointed top), small rounded ears inside the mane; rabbit: fuller cheeks and skull, stronger jaw, expressive brow. Original design; references set the quality level only.

### GOTR-0065 — Street, underground and story fights without a boxing ring
- **Reported:** 2026-11-12
- **Status:** OPEN — queued for agent `city-gfx` after the city graphics
- **Reported behavior / request:** "When you have a street fight, you don't need a ring, you just need a floor and an audience. It's a street fight; same with underground, or missions where you fight against a robber or any other characters in your story."
- **Plan:** Street Fight, Basement and Dockside Hangar lose the ring (posts, ropes, canvas); fights happen on the ground inside a close circle of spectators with fitting lighting; no referee there; a per-venue `ring:false` flag so story missions can use ringless fights anywhere.

### GOTR-0066 — Street-level city scenes must look like a real 3D city
- **Reported:** 2026-11-12
- **Status:** IN PROGRESS — initial bus/station and Old Town building assets on isolated `art/city-components-20261113`; game integration still pending review
- **Reported behavior / request:** "When I asked to update city graphics, it's not the map; it's when the player is in the city: the buildings, the street, the cars, everything looks 2D and like geometric squares, not like real buildings or designed streets. Remember GTA games; I understand you will not get to that level, but this is my goal. If I can help by generating pictures or files in ChatGPT and uploading them, tell me."
- **Plan:** owner supplies free-licence or generated assets into `assets/street/` on the integration branch (GLB models < 10 MB each: buildings, bus, cars, stalls, lamps, props; seamless 1024 px textures; sky panoramas; concept pictures). Integrator adds a GLTF loader for three r128, rebuilds the story sets (`adventure/story/*`) from the models with proper lighting and shadows, within the phone budget. No real brands or logos; licence noted per asset in `assets/street/LICENSES.md`.
- **Owner follow-up (2026-11-13):** Build realistic 3D streets, objects, trees, detailed buses/cars, buildings/windows/roofs, wear/graffiti, shops/market crowds and moving people/animals in current story order (Chapter 1 before Chapter 2). Review free plugins/tools to improve 3D visual quality and animation. Canva requested; no Canva connector is exposed in this session. Preserve Claude's active implementation; work on isolated art assets.
- **Initial asset delivery (not a completed city):** `0e222ed` — original editable arrival bus + GLB, door/wheel clips, matched original/new r128 viewer and free-tool research; `7d714a9` — modular shelter, bench, timetable/stop, lamp, bin, pavement/curb/drain and six original PBR maps. See [`CITY_ART_DELIVERY_20261113.md`](../adventure/CITY_ART_DELIVERY_20261113.md), `assets/street/` provenance and component READMEs. Real browser captures and structural/animation checks are under `qa/city-art/`. No main merge or game publication by this art work. Physical-phone performance, city integration, façades/trees/cars/market population and Chapter 2 remain unverified/unimplemented here; do not mark this issue DONE.
- **Old Town asset follow-up (2026-11-13):** `5714256` source/materials; `bfeb1ac` editable/GLB exports and r128 render evidence. Two building prototypes with substantial walls and true window holes, bounded interiors, hip/parapet roofs, exposed masonry and paint tag, drainage, supported awnings and roof details. Exact ray/loader checks pass, zero browser errors/warnings; [delivery and limitations](../adventure/OLDTOWN_ART_DELIVERY_20261113.md). This supersedes only the earlier note that façades were unimplemented. Full city integration, tree/car/market/character assets and physical-phone performance remain pending. No production app release or main merge from this asset batch.

### GOTR-0067 — Story scenes: street clothes, a sport bag and natural movement
- **Reported:** 2026-11-12 (v1.41 arrival scene)
- **Status:** OPEN — queued for the 3D story agent at the next resume (with GOTR-0049 outfits)
- **Reported behavior / request:** "I don't get it: he is wearing boxing clothes getting out of the bus, and all the time he stands he's shadowboxing. He should get out of the bus wearing normal clothes with a sport bag in his hand. He is on the street, not in a fight. Everyone has to have appropriate clothes in movement."
- **Plan:** street outfit for the fighter in all street scenes (hoodie/T-shirt, joggers/jeans, sneakers, sport bag; no gloves or boxing shorts); relaxed walk/idle/look-around animations instead of guard and shadowboxing; every character dressed for the place (Pip tracksuit + whistle, Brick gym wear, Dash street wear, locals everyday clothes); boxing gear only in gym, training and fights. Proposed new arrival beat: a pickpocket grabs the bag, the fighter stops him with one reflex, Pip notices ("Fast hands. Ever boxed? Come by my gym.").

### GOTR-0068 — Sound disappears during mitt training; better applause
- **Reported:** 2026-11-12
- **Status:** READY FOR QA — v1.44 (integrator; not verified on a phone)
- **Reported behavior / request:** "During mitts training sometimes the sound disappeared. Also improve claps at fight sound."
- **Likely cause:** `playSample` is silent whenever the audio context is not running, and iOS suspends/interrupts it (notification, call, silent switch, tab switch); it was only resumed on tab return. **Fix:** any touch or key resumes the context. Applause: the recorded room applause now plays in three staggered layers at native pitch with individual claps on top. If the sound still drops, capture when (after a pause? after many fast hits?) to look for a voice-limit cause.

### GOTR-0069 — A real step-by-step story mode: levels, progress, unlocks
- **Reported:** 2026-11-12
- **Status:** IN PROGRESS (agent `story-flow`, branch `agent/story-flow`)
- **Priority:** P1
- **Reported behavior / request:** "I don't understand how the story starts, how he proceeds. You added a few buttons, but it doesn't actually tell a story. I want to start a story. I want step-by-step. I want levels. I want progress. I want to do something and finish it, and then it will open additional things. What I see right now is a flow bar, but with no reasonable flow narrative."
- **Plan:** each chapter is an ordered list of numbered story steps; exactly one is current, finished steps show ✓ and stars (replayable), later steps are locked. The chapter sheet becomes a quest panel ("Chapter 1 · Old Town — Step 3 of N", title, why the Fighter does it now, measurable objective, rewards, one primary button) with a vertical timeline, progress bar and Fighter Level. Every step has a before beat and an after beat (scene or plain-text lines, never a box over the Fighter); the after beat reacts to the result and says what was unlocked, with Next / Retry / Back to map. The boss gate says exactly how many stars are missing and which steps to replay. First open: arrival → step 1 automatically; boss → outro → chapter summary → chapter 2. Existing saves keep their completed steps. Step lists in `docs/adventure/STORY.md`.

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
- **Presentation (owner approved "Yes, sets + scenes"):** character lines first; then small 3D story sets (bus stop corner, gym front door, market alley, dock pier) for short scripted scenes and on-rails street mini-games; no videos; free walking optional later. Details in `docs/adventure/STORY.md`.
- **Result so far:** EN/HE/RU intro/outro lines per mission with drawn SVG portraits, plain text on the scene, tap to skip; story beats 1–5 drive the Next bar and the recommended tile; journal tile; Dash speaks at beat 4.

### Agent status — 2026-11-11 09:45 UTC (owner asked to remove duplicate agents and continue some)
The four cloud sessions started on 2026-11-10 stopped at the 5-hour usage limit and pushed nothing. Checked against current work:

| Agent | Decision | Why |
|---|---|---|
| `gear-3d` (cloud) | Archived — duplicate | Done locally as `agent/gear-3d-local`, published in v1.15 |
| `i18n-a11y` (cloud) | Archived — duplicate | Wording, Gym name, owner's terms and HE/RU translation are in UX R1 (`agent/ux-r1`, GOTR-0031/0034). The accessibility part (screen-reader labels, focus order, contrast, reduced motion) restarts as a fresh agent after R1 merges |
| `world-content` (cloud) | Archived — merged into UX R3 | Short missions and the return digest become the "Next up" card and Home of UX R3/R4; restarts as a fresh agent with that brief after R1 merges |
| `adventure-world` (cloud) | Parked (not a duplicate) | Owner: the adventure comes later (training → street → underground → … → championship, GOTR-0008); a fresh brief will replace the stale one |

Running locally (max four at a time): `store-polish` (GOTR-0030, 0033, 0039), `ux-r1` (GOTR-0031 R1, 0034), `fighter-pad` (GOTR-0035), `muscle-definition` (GOTR-0037). Next when a slot frees: `smooth-motion` follow-up (GOTR-0032 punch power, GOTR-0038 mitt in face, guard flicker), then world-content as UX R3, then accessibility.

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
| 2026-11-11 20:15 UTC (saved before the usage limit) | integrator `claude/serene-cannon-riwk4l` | Live **v1.39** (`973b5e9`, 98/98 tests): Adventure chapters 1–2 (Old Town, Market Row), story scenes, clean HUD, stance turn in all modes (owner says the turn direction and straight lead arm are wrong). | Saved, unreviewed, agents still running at save time: `agent/stance-3` + `wip/stance-3` 1f0d2b3 (true orthodox stance matching the owner's reference photo: left shoulder/glove/foot ahead, both elbows bent and tucked; add left-ahead tests); `agent/story-2` 929794b + `wip/story-2` e35c49b (Chapter 1 design upgrade of story sets, better lines, night-guard mini-game, Dash and boss scenes); `agent/adventure-ui4` d11ef4b + `wip/adventure-ui4` 17e134f (route dots as 3D road markers, short tile labels, sheet not clipped, GOTR-0060 clear story start / Continue / chapter end). Next after those: Market Row street mini-games (balloons, raccoon chase, groceries), outfits by place (GOTR-0049), fight guard height. | https://ytcat.github.io/fit/ |
| 2026-11-13 14:40 UTC (owner: usage at 92%, finish the latest version, rest after reset) | integrator `claude/serene-cannon-riwk4l` | Live **v1.59** (`dab12f6`). **v1.60** (`f0985bc`: natural dialogue GOTR-0084 from `agent/dream-flow` 2d5ceea; Brick sculpted head round 1 + bound test from `agent/dream-1` 67b0246) is committed and in its full test run — publish with `git push origin f0985bc:main` if green and record the sha in RELEASES.md. Published today: v1.50–v1.59 (see RELEASES.md). | **Not merged, saved on GitHub:** `agent/dream-1` ce57e06 + `wip/dream-1` 9092318 — Brick head rebuilt from volumes (v3 redesign the owner asked for; he must see pictures incl. fight-camera angles before release) and GOTR-0083 gym-floor fight with Bruno as referee (wired, untested in the browser); `wip/dream-flow` 2210221 — GOTR-0086 goal line under the edge tools / over the head (in progress); `wip/bag-break` df21759 — GOTR-0087 bag-break film (in progress, nothing committed on its branch yet). **Not started:** GOTR-0088 Finisher "Sunday Punch" (owner chose the name), GOTR-0076 corner break, GOTR-0077 rest of the bag trial, stand-in steps of chapter 1 (bare-hand market fight, Otto shop, docks), name clash "Hook" (character vs punch), fur/Bruno polish. Codex owns city graphics (streets, bus, sets). Lessons today: a rig borrowed from a bout or scene must get root scale (-1,1,1); CSS display rules outrank `[hidden]`; font shorthands with `inherit` are invalid. | https://ytcat.github.io/fit/ |
| 2026-11-13 12:15 UTC (owner: session at 94%, save everything) | integrator `claude/serene-cannon-riwk4l` | Live **v1.53** (`510bf6a`): The Dream part 1 (opening film, street clothes, Bruno, Brick, gym talk, first Brick fight, 12-step list with stand-ins), dev "Skip step", "Reset game", easier bag trial, Pip→Mack. Full suite on the pre-fix build: 110/111 (only the Shop preview test, whose flow waited for the old arrival scene — fixed and passing); after the fix only the story/adventure/offline tests were rerun. | **Owner 2026-11-13: ChatGPT Codex now owns city graphics — streets, bus, sets. This agent: bugs, avatar graphics, natural walking and conversation movement (no guard pose outside fights).** Saved WIP: `wip/dream-1` (third cast pass: fur locks, Brick head, outfit-by-place rule and relaxed idle for ALL street scenes — stopped by the limit mid-work; resume agent ae13f18… after 13:10 UTC and tell it to leave sets/bus/streets to Codex), `agent/dream-flow` 66bca44 (GOTR-0081 3D portraits + Mack rename, finished, NOT merged yet — merge and release as v1.54). Open: GOTR-0076 corner break, GOTR-0077 rest of the bag trial (hit feel, graphics), stand-in steps of chapter 1 (market fight bare hands, Otto shop, bag break, docks), name suggestions (Hook clashes with the punch name; King Hyena), camera clips a building during the map dive. Coordinate with Codex through this backlog to avoid overwriting each other. | https://ytcat.github.io/fit/ |
| 2026-11-12 21:40 UTC (owner: usage at 81%, save everything) | integrator `claude/serene-cannon-riwk4l` | Live **v1.48** (`dc4d2d3`). **v1.49** (`9bebbcc`: timed round bells/explanation, visible Guard, centred countdown, score cards) committed and in its full test run — publish with `git push origin 9bebbcc:main` if green, then record the sha in RELEASES.md. | Work in progress saved on GitHub as `wip/<name>` snapshots: `wip/orthodox` e489d9c (GOTR-0074 orthodox stance, Fable agent a445d90…; owner must see pictures before release), `wip/preview-occluders` 8287335 (GOTR-0072 Shop preview body invisible, GOTR-0079 rabbit waistband floating — rabbit only, GOTR-0073 equipment hiding the Fighter), `wip/dream-1` 76a4fdd (GOTR-0078 slice 1: Bruno bear, Brick bulldog, street clothes, opening film, gym talk; hooks in docs/adventure/DREAM_HOOKS.md), `wip/bosses` 6f5cf08 (GOTR-0062, stopped by the limit), `wip/city-gfx` 07ceb9b (GOTR-0065 ringless fights, stopped by the limit). Not started: Opus agent `agent/dream-flow` (beats 0–2 in story-flow.js, first Brick fight where a loss advances the story), GOTR-0076 corner break, GOTR-0077 bag trial (now step 8 of the script), the Next bar box across the fighters' legs. Script: `docs/adventure/CHAPTER1_SCRIPT_V2.md`. Rules: max 3 agents; Fable = 3D/hard, Opus = story/UI, Sonnet = simple; agents run affected tests only; integrator runs the full suite per release. | https://ytcat.github.io/fit/ |
| 2026-11-11 18:50 UTC (owner: "save everything and stop"; changing the engine) | integrator `claude/serene-cannon-riwk4l` | Live up to v1.35 (`12dc5fe`); v1.36 (`c727884`, stance part 1 in training) was in its final test run and publishes itself if green. Branch head adds: Chapter 1 story sets (`adventure/story/*`: arrival and Brick scenes, carry-the-bag mini-game) wired into Old Town (scenes play once before One-two and Bag power; heavy_bag_van playable) — tests pass, not yet released (next: v1.37). | Saved, unreviewed: `agent/stance-2` + `wip/stance-2` 9852cb1 (stance part 2: same bladed guard in fights and sparring, lead glove ≥ 15 cm — stopped mid-work). Open: GOTR-0051 part 2, GOTR-0032 rear uppercut and whole-body drive, GOTR-0054 centre text crossing fighters and Cup dialogs, GOTR-0055 routes 2→3+, Market Row chapter (slice D), outfits by place (GOTR-0049), rope (GOTR-0048, paused), new species (GOTR-0009). Release process: bump `version.js`, row in RELEASES.md, `bump.py <live sha> <stamp> <token>` (see earlier rows), `scripts/run-tests.sh -j 3`, push sha to main, check live version.js. | https://ytcat.github.io/fit/ |
| 2026-11-11 16:00 UTC (saved before the weekly usage limit) | integrator `claude/serene-cannon-riwk4l` | Live **v1.25** (`6ae838d`, 95/95 tests): Adventure tab with the 3D Gloryland map, progression core, Fighter level button, HE/RU complete; v1.21–v1.24 shipped camera front views, fight pay, game pad, Shop + free mode, muscles, punch power, power meter, UX R1. Branch head = v1.25 + reverted muscle-2 (owner rejected the distortion) + docs. | Saved on GitHub, unreviewed: `agent/adventure-oldtown` 40ec968 + `wip/adventure-oldtown` f569be2 (slice C1 Old Town missions + GOTR-0052 inline rewards / Next bar); `agent/smooth-motion-3` 89d4bb3 + `wip/smooth-motion-3` 965ed99 (whole-body punch drive, real orthodox stance GOTR-0051, guard jump); `agent/muscle-3` daee1de + `wip/muscle-3` f74d66f (smooth body rework GOTR-0050, owner crop of defects in the backlog entry); `agent/rope-real` dd389a2 (paused by owner). Next: finish and merge those three, then Market Row (slice D), outfits by place (GOTR-0049), UX R2 leftovers (GOTR-0041/0042 UI on rival cards, Settings gear). Rules: max 3 agents, `scripts/run-tests.sh`, integrator runs the full suite per release. | https://ytcat.github.io/fit/ |
| 2026-11-11 12:15 UTC (saved before the account usage limit) | integrator `claude/serene-cannon-riwk4l` | Live **v1.20** (`2ef46f6`). **v1.21** = `3e6629f` (camera in front for the ceremony and rope, participation pay): 81 of 90 tests passed before the suite hit its 1-hour limit; the last 9 (`shoulder-motion` … `workout`) were re-running — re-run them, then `git push origin 3e6629f:main`. Branch head also has `agent/fighter-pad` merged (game pad, GOTR-0035) = the v1.22 candidate. | Agents saved to GitHub, all unreviewed: `agent/store-polish` f426bd1 (GOTR-0030/0033/0039, looked finished, no report yet); `agent/ux-r1` b3d2240 + `wip/ux-r1` f8eee8e (R1, terms, HE/RU audit — GOTR-0031/0034/0045/0046); `agent/smooth-motion-2` addbf62 + `wip/smooth-motion-2` 1ace5a8 (punch power, coach mitt in face, power meter — GOTR-0032/0038/0040); `agent/muscle-definition` 7246a17 + `wip/muscle-definition` 31552d3 (GOTR-0037); `agent/gloryland-map` dd320e4 + `wip/gloryland-map` 54d66be (GOTR-0008 map). Next: v1.21 publish → merge store-polish, flip `version.js` channel to 'dev' (free mode) → v1.22 → UX R1 → R2 (GOTR-0041/0042/0044, result card) → Adventure first slice (approved design `docs/adventure/gloryland-design.html`). Rules: max 3 agents on this 4-core machine; `scripts/run-tests.sh`; heavy agents as separate cloud sessions. | https://ytcat.github.io/fit/ |
| 2026-11-09 | Backlog setup / main | Created persistent intake workflow | Awaiting user reports | Not verified |
| 2026-11-10 | Claude / `claude/serene-cannon-riwk4l` → main | Published and re-checked on the live site, each with full suite 76/76: GOTR-0006 combo controls (`d47da6f`) + small-phone Moves follow-up (`fa7c158`) — DONE; GOTR-0013 Fight Academy rename (`31a17bd`) + designed landing/lesson screens (`b9c65ed`); GOTR-0001 Shop header button (`9945b10`) + PC/tablet product overflow fix and six-category layout (`34d82dd`); GOTR-0004 buy combos with coins (`34d82dd`). One Pages deployment (`9945b10`) timed out on GitHub's side and was redeployed by the next commit. | GOTR-0012 (measured; needs straight-punch range choreography, see entry), GOTR-0007 guided lesson, GOTR-0005 Burst, GOTR-0002/0003 3D gear, GOTR-0001/0004 remainders; 0008/0009 later. Physical-phone performance still unverified. | https://ytcat.github.io/fit/ |
