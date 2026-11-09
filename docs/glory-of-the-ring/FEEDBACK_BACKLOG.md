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
- **Status:** OPEN
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Shop / navigation / UX
- **Reported behavior / request:** The user struggled to find the place where equipment can be purchased; the current interface does not look like a shop.
- **Expected behavior:** A clearly labeled Shop destination accessible prominently from the hub and relevant inventory/character screens, with obvious categories (Gloves, Shorts, Shoes, Belts, Headwear, Accessories, Combos), currency balance, item previews, price tags, locked/unlocked/owned/equipped states, purchase confirmation and return-to-game path.
- **Acceptance criteria:** On phone and PC, a new player can reach Shop in no more than two obvious actions; browsing, previewing, buying and equipping are understandable without instructions. No dead buttons; virtual credits persist after reload; touch targets are comfortable and localization does not clip.
- **Implementation:** Not started; investigate current code first.
- **Evidence:** Pending before/after screen captures and walkthrough.

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
- **Status:** OPEN
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Combo shop / progression / inventory
- **Reported behavior / request:** User wants to buy combos with earned in-game currency as well as accessories.
- **Expected behavior:** Shop Combo category offering preview/demonstration, clear move sequence, mastery or progression requirement where appropriate, virtual-credit price, buy/owned/equipped states and separate Training versus Fight loadouts. Unlocks are persisted and purchases never double-charge. Combo access follows a clear balance policy (no unavoidable grind, no real money).
- **Acceptance criteria:** User earns sufficient virtual credits, purchases combo, equips it and can trigger it in relevant mode; states survive reload; invalid or insufficient-balance purchase gives actionable feedback.
- **Implementation:** Not started; review existing combo input queue and scoring so economy cannot be exploited.
- **Evidence:** Pending functional demonstration and tests.

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
- **Status:** OPEN
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** UI / responsiveness / accessibility
- **Reported behavior / request:** As more combos are added, action buttons become small, labels wrap badly and the interface looks broken. User explicitly suggested limiting active buttons to three if necessary.
- **Expected behavior:** Max three visible primary combo buttons with a clear More/Select dropdown, carousel or loadout editor for additional owned combos. Consistent widths/heights, compact readable labels, sensible iconography, accessible touch targets and stable layout across phone portrait/landscape and desktop. The full collection remains accessible; excess items are not deleted.
- **Acceptance criteria:** No cramped unreadable labels in common screen sizes or English/Hebrew/Russian; at most three primary active combo controls; swapping equipped combos does not break queued actions or change ownership; verified screenshots at mobile and desktop breakpoints.
- **Implementation:** Not started; inspect CSS and existing control panels before redesign.
- **Evidence:** Pending before/after QA.

### GOTR-0007 — Make Fight IQ a guided interactive lesson, not a confusing menu
- **Reported:** 2026-11-09
- **Status:** OPEN
- **Priority:** P1
- **Delivery:** NOW / next implementation batch
- **Area:** Fight IQ / tutorial / usability
- **Reported behavior / request:** User does not understand how to use Fight IQ. Wants the system to teach by showing a move/combination and then asking the player to click the exact move buttons to recreate it.
- **Expected behavior:** A short progressive tutorial: choose concept (e.g. jab–cross–hook, defense/counter), show slow motion and clear move order, coach explains when/why, let player practice via highlighted move buttons, recognize exact sequence and timing, provide immediate understandable success/correction feedback and replay, then let the user repeat independently. First lesson requires no reading long docs. Optional hints/skip/retry, control legends and accessibility.
- **Acceptance criteria:** Novice can find Fight IQ, finish an interactive demo, correctly execute a specified 2-3 move sequence, see and understand feedback and continue to a next lesson; touch UI and localization verified. Never claim a combo was correctly performed just because buttons were randomly tapped.
- **Implementation:** Not started; assess current Fight IQ logic and gesture/input validation before changing.
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
- **Status:** TRIAGE
- **Priority:** P1
- **Area:** Mitt training / sparring / fight
- **Reported behavior / request:** Opponent and coach stand too close; the jab should extend straight at an appropriate distance.
- **Implementation:** Coach mitt contact currently measured at56.3° elbow /47.5% extension. Clean sparring/fight jabs already reach172.3°/171.1°; inspect visual crowding separately and preserve contact stops on blocked punches. No spacing change published yet.
- **Evidence:** New matched real-app views and contact tests required before resolving.

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
