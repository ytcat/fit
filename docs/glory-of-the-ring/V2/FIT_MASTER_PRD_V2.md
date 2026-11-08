# GLORY OF THE RING
## Full Product Requirements Document | Living world, original seasonal stories, free economy, gear store, player academy and Codex implementation plan
**Status:** Proposed product design, not implemented. All visuals are concepts. **Version:** 2.0 | **Date:** 8 November 2026 | **Platforms:** Mobile web and desktop web | **Repository:** `ytcat/fit`

> **North star:** A living boxing universe where players train, invent tactics, evolve fighters, collect rewards, influence rivalries, run a gym, and eventually become architects of an enduring fighting legacy. Boxing is the expressive engine; decisions and progression are the game.

![Concept storyboard (illustrative, not actual built UI)](assets/vision_storyboard.png)

## 0. Reading guide and decisions
This document defines a *future product*, not current features. The screenshots in this report are generated concept illustrations, **not screenshots of implemented software**. The product specification and diagrams below are authoritative where a generated picture differs in labels, numbers or UI.

**Player identity** is the profile username, never merely the fighter species. Fight introductions: **Yossi (Lion) vs Shadow (Rabbit)**, not just Lion vs Rabbit. Each fighter is an avatar under a named owner (human or in-world NPC). The owner username appears in result, scoreboard, achievements, tournaments, replay and history. Avoid suggesting the game is only about boxing; preserve the core fitness training use case and offer four play modes: Play, Coach, Architect and Watch.

**Core invariants:** (1) user can always train or enter a quick match without lengthy menus; (2) earned rewards persist; (3) progression never requires excessive exercise or punishes medically necessary rest; (4) all competitors have counterplay; (5) no pay-to-win and no real-money wagering; (6) state changes are deterministic and auditable, not fabricated; (7) realistic motion and rendered hit contact are prerequisites; (8) modern phones remain first-class; (9) accessibility and shorter sessions are legitimate play styles; (10) offline single-player works without a backend.

**Release strategy:** M0 gameplay foundation (existing); M1 game shell/rewards; M2 rivals and tactical control; M3 world/academy; M4 asynchronous competition/backend; M5 optional emergent world. No claim of real cross-device social or persistent simulation until backend exists.

---
## 1. Game identity and differentiated proposition
### 1.1 Product pillars
1. **Train to evolve** — authentic boxing drills unlock skills and measurable mastery.
2. **Own your fighting intelligence** — equip combos into Training/Fight separately; compose safe, understandable tactical rules and signatures.
3. **An opponent remembers** — rivals retain style profiles, detect habits and adapt within bounded, beatable constraints.
4. **The world responds** — fictional invitations, challenges and narrative events arise from real recorded results, not purely random menus.
5. **Build a legacy** — collect fighters, develop facilities, become a coach, seed a new generation and carry forward named achievements.
6. **Several ways to win** — timed defense, accuracy, strategic counters, skill missions, team management and tournaments beyond KO.

### 1.2 Player fantasy and audience
- **The exerciser (5–15 min):** quick training, achievable objectives, progress feedback, low-friction return.
- **The competitor (10–30 min):** direct combat, ranked offline ladders, rivals, tournaments, spectacular presentation.
- **The strategist (5–20 min):** Coach mode, round planning, opponent scouting, tactical brain, simulations.
- **The collector/creator (5–20 min):** fighters, equipment, signature combo crafting, academy and gym progression.
- **The spectator (2–10 min):** Watch autonomous exhibition, review fight highlights, influence next tactics.

### 1.3 Unique differentiating hook: the combat invention economy
Unlock **technique fragments** (a strike, evasive step, guard response or transition), arrange them as viable **combos**, equip to Training or Fight, master them through contextual challenges, and publish fictional in-world techniques for opponents to adapt to. Training equips reward form/mastery; Fight equips grant tactical options. **Earn bonuses only for actual correct execution and effectiveness; repeated tapping is not rewarded.** Skill fusion changes tactical shape (setup, timing and counterability), not magic damage.

---
## 2. Macro journey: beginner to endgame
### 2.1 12 chapters / gates
| Chapter | Identity | Entry gate | Experience and storyline | New permissions | End state |
|---|---|---|---|---|---|
| 0 | Guest / prospect | Launch | See cinematic fight, choose quick start | Immediate demo without login | Onboarding |
| 1 | Rookie | Create local profile | Username, pronouns optional, accessibility, first fighter | Basic training, Fight/Watch | First result |
| 2 | Apprentice | Complete first interactive drill | Jab, cross, guard, movement, safe pace | XP, daily goals, drill book | 3 mastered drills |
| 3 | Contender | Accumulate mastery + fight result | First 3-part combo, choose equipment slot | Combo loadout, basic shop | First tournament ticket |
| 4 | Specialist | Meet skill-based objectives | Hook/uppercut, counter training, rival discovered | Coach mode, opponent scouting | Rival rematch |
| 5 | Challenger | Win regional trial or skill-equivalent route | Multiple arenas, conditional objectives, gear | Arena selection, tournaments | Regional final |
| 6 | Creator | Complete tactic builder tutorial | Compose reaction rule and test it | Architect mode, tactical decks | Tactical victory |
| 7 | Club Owner | Reach reputation milestone | Upgrade gym and recruit coach | Facilities, coach, expanded drills | Gym tier 2 |
| 8 | Elite | Win multi-format season | Character collection, style counter system | New fighters, roster switching | Elite title |
| 9 | Champion | Earn qualifying rank | Championship bracket, event presentation | Champion title, signature badge | World title |
| 10 | Mentor | Finish champion path | Recruit trainees, mentor skills with caps | Academy, guest fighters | First trainee debut |
| 11 | Legend | Legacy milestones | Create school style, generational roster | Prestige cosmetics, legacy records | Endless non-coercive play |

**Gating rule:** storyline gates permit alternative routes: win a fight **or** demonstrate comparable competency via training/tactics. Avoid making physical exercise the sole way to access story. Suggested level labels are placeholders and require balancing with actual player testing; gates are defined primarily by achievements, not XP alone.

### 2.2 First 10 minutes (specific scene-by-scene)
| Time | Scene / screen | Player input | Game feedback | Stored event | Failure/exit behavior |
|---|---|---|---|---|---|
| 0:00 | Cinematic home | Tap Play, Train or Watch | One-tap entry; auto play muted until permission | session_start | Skip available |
| 0:20 | Identity | Username + choose avatar | Preview shows `Username (Lion)` | profile_created | Guest/local profile allowed |
| 1:00 | Fighter introduction | Rotate/view avatar, select | Distinct stance and attributes, not promises of superiority | fighter_selected | Default lion |
| 1:45 | Movement tutorial | Step, guard | Ghost target, instant feedback | tutorial_movement_completed | Skip to guided training |
| 3:00 | Punch tutorial | Jab then cross | Whole-body animation, target contact and accuracy cue | basic_drill_completed | Retries unlimited |
| 4:30 | Mini challenge | 3 timed clean contacts | Earn first XP and coins | reward_granted | Partial XP, no punishment |
| 6:00 | First unlock | Claim 1–2 combo | Choice: equip Training, Fight, both, or save | combo_unlocked/equipped | Save to inventory |
| 6:40 | Showcase fight | Quick 60s exhibition vs named rival | Username fight HUD and natural opponent reactions | match_started | Player may Watch |
| 8:30 | Result / replay | See score & highlight | Exact method of victory, XP/coins and next quest | match_finalized | Resumable result |
| 9:30 | Hub / next choice | Train, Rematch, Upgrade, Quest | Personalized to recorded actions | hub_viewed | Progress autosaved |

### 2.3 Full long-term lifecycle
**Cycle:** launch > world hub > select role > prepare > act (drill/fight/tactic/challenge) > outcome validation > rewards ledger > choose allocation > world changes > next goal. Every action creates visible progression but none should force a daily login. A season has a finite climax and fair reset of competition ratings, while accumulated collections and legacy persist.

---
## 3. Navigation and product screens
### 3.1 Global navigation
Top-level tabs: **World** (home/feed), **Train**, **Fight**, **Lab** (combos/tactics), **Club** (fighters/gym/inventory), plus **Profile** under avatar/settings. Keep existing stage canvas and controls intact behind modular overlays. Contextual bottom bar on phone; left rail on desktop. Clear return-to-fight path. Icons must always have text alternatives.

### 3.2 Screen inventory / state rules
| ID | Screen | Essential data and UI | Primary action | Empty/offline/error |
|---|---|---|---|---|
| S01 | Splash / resume | Username + resume card + current quests | Continue | Show local guest option |
| S02 | Identity setup | Username validation, fighter selection | Create profile | Duplicate local name prompt; no forced account |
| S03 | World hub | Upcoming rival, training offer, event, reward, gym | Choose activity | Offline activities only |
| S04 | Mode chooser | Play, Coach, Architect, Watch | Select | Locked modes explain unlock route |
| S05 | Training | Drill library, duration, difficulty, targets | Start | Default starter routine |
| S06 | In-training HUD | Round timer, combo, accurate contacts, pause | Complete drill | Pause and resume |
| S07 | Reward reveal | XP, coins, combo fragments, achievements | Claim | Idempotent claim; safe restore |
| S08 | Combo library | Owned, equipped by mode, mastery, compatibility | Equip / edit | Explain unused slots |
| S09 | Tactical designer | Trigger/defend/counter/exit blocks, test simulator | Save deck | Reject impossible rules visibly |
| S10 | Fight preparation | Named opponent, arena, loadout, style hints | Enter | No opponent: practice mode |
| S11 | Arena selection | Venue previews, rule set, unlocked state | Select venue | Default gym ring |
| S12 | Live fight | **Username (fighter)** vs **opponent name (fighter)**, health/stamina, round, controls | Play/Watch/Coach | Save/resume solo when possible |
| S13 | Between-round coach | Defense, pressure, targeting, tempo, stamina | Apply plan | Time-out auto-resume default |
| S14 | Result + replay | Method, scores, stats, XP ledger, narrative | Claim/Rematch | Prevent duplicate rewards |
| S15 | Rival profile | Match history, observed habits, last changes | Challenge | No rival? new qualifier |
| S16 | Tournament map | Bracket, rules, rewards, qualification | Join | Local NPC bracket offline |
| S17 | Fighter roster | Selected, owned/locked, styles, progression | Switch / inspect | Preview locked fighter |
| S18 | Equipment | Owned, slots, drill effects, cosmetics | Equip / upgrade | Show no-stat cosmetic items |
| S19 | Gym builder | Rooms, expansion, feature unlocks | Build | Locked by milestone + currency |
| S20 | Challenge creator | Goal, rule, constraints, preview | Publish locally | Sharing gated on backend |
| S21 | Academy | Trainees, mentors, lessons, safe caps | Recruit / train | Academy first unlock story |
| S22 | Legacy museum | Named champions, signature combos, histories | View / coach | New player sees future milestones |
| S23 | Ranking | Local and later verified online leagues | View standings | No fake live online rankings |
| S24 | Settings/accessibility | Motion reduction, language, audio, saves | Adjust | Always accessible |

### 3.3 HUD contract
- Match headline: `Yossi (Lion) vs Shadow (Rabbit)`; human usernames are shown whenever applicable. NPC names stay stable within a rivalry.
- Score outcome: `Yossi wins - Unanimous Decision (30-27, 29-28, 30-27)` only if three actual judged scores support this; KO/TKO/count/draw cases need their real outcome method.
- Controls default to manageable subset; advanced attack pages and defensive shortcuts expandable. Speed and motion-freeze preserved. Live action feedback should not cover fighters.
- Training HUD: accuracy, timing, combo quality, stamina cue and safe effort indicator; no medical performance interpretation.
- Accessibility: captions, color-independent health indicators, reduced camera shake, scalable text, remappable keys, one-handed alternative for basic content, simplified coach/watch paths.

![Illustrative interface storyboard; final text and UI governed by screen specs](assets/product_screen_storyboard.png)

---
## 4. Gameplay modes and match scenarios
### 4.1 Play / Coach / Architect / Watch
**Play:** player commands punches, steps, defense and equipped combos; scene uses continuous realistic character animation, hit events, current fight rules. **Coach:** player selects between-round instructions and optionally calls limited tactical cues (no invulnerability). **Architect:** create constrained behavior rules, simulate and train without live frame-by-frame control. **Watch:** full autonomous bout, selectable commentary/camera/analytics; spectator gets fewer technique-mastery points and cannot claim active-combat challenges.

### 4.2 Fight scenarios (mandatory content deck)
| Scenario ID | Narrative setup | Win condition | Distinct mechanic | Rewards | Difficulty/edge case |
|---|---|---|---|---|---|
| F01 | First exhibition | Win on points or survive round | Simplified controls, 60 sec | Rookie XP, basic coin | Draw allowed |
| F02 | Accuracy duel | Land 8 clean scored shots before time | Accuracy > power | Precision fragment | Do not count blocked taps |
| F03 | Guard fortress | Prevent 10 clean hits | Defense and range | Guard mastery | Cannot spam idle guard |
| F04 | Counter laboratory | Score 3 valid counter windows | Read attacks | Counter card | AI must telegraph fairly |
| F05 | Stamina survival | Manage two rounds with limited energy | Strategy and pacing | Recovery drill | Skip when accessibility requires |
| F06 | Combo challenge | Execute unlocked sequence cleanly 3 times | Timing and footwork | Combo mastery | Button mash earns zero bonus |
| F07 | Rival rematch | Beat Shadow after adaptation | Learned opponent counters | Reputation + rival chapter | Adaptation capped and explainable |
| F08 | Special arena | Win with ring zone constraint | Footwork and space | Arena cosmetic | No arbitrary unfair hazards |
| F09 | Tactical mastermind | Win with a selected tactical deck | Coach / Architect | Tactical research | Validate feasible triggers |
| F10 | Tag team exhibition | Team score across 2 fighter bouts | Roster strategy | Academy token | Two bouts, no simultaneous 3D collision required |
| F11 | Tournament final | Best of rounds, official scoring | Preparation and adaptation | Trophy, gym access | Draw/tie-break documented |
| F12 | Legacy duel | New generation challenges retired champion's echo | Tactical memory, mentoring | Prestige banner | Echo based on actual stored behavior |

**Not all gameplay must be a fight:** Speed-bag rhythm challenge, punch-the-target sequence, obstacle footwork navigation, coach-a-fighter puzzle, knockout-recovery demonstration (stylized), combo design contest, shadow fight against historical self and tournament prediction/analysis (no wagering).

### 4.3 Event director
Use a seeded **Event Director** with event classes: tactical opportunity, opponent adaptation, crowd momentum, coach advice, rival invitation and arena objective. Triggers arise from score/stamina/history and rules; event must be authored/validated and never covertly alter match outcome. Limit frequency, enforce cooldown and player option to reduce narrative overlays. Example: if player misses 3 hooks vs high guard, coach suggests body feint; player may accept or ignore. Cinematic replays only during non-critical pauses.

---
## 5. Progression, economy and reward balancing
### 5.1 Separate currencies and achievements
- **XP:** level/story visibility, earned from verified sessions, training and match objectives; never spent.
- **Coins:** earned in-game; spent on gym facilities, equipment and optional cosmetics; no real-money implementation.
- **Mastery:** per technique, increases on quality execution; not transferable.
- **Reputation:** unlocks rivals/arenas/tournament invitations; season-specific; not purchased.
- **Research tokens:** rare rewards for creating/test-driving tactics or challenges, used for skill fusion. Hard weekly caps optional after balancing; no artificial streak pressure.
- **Rank rating:** skill-relative competition scoring; offline rating clearly labeled simulated; verified multiplayer ranking deferred.

### 5.2 Illustrative economy, tunable constants
| Event | XP | Coins | Mastery/restriction |
|---|---:|---:|---|
| Beginner drill completed | 60 | 15 | +1 per accurate technique window |
| Three clean combo repetitions | 90 | 20 | +3 combo mastery if accuracy threshold met |
| Quick fight completed | 75 | 20 | Results bonus only once per unique match ID |
| Quick fight win | +45 | +20 | No exploit repeated same passive route |
| Special objective | 100–180 | 30–55 | First-clear bonus; repeat payout decreases |
| Regional tournament | 300 | 100 | Trophy and unlock, regardless of XP |
| Rival first victory | 150 | 60 | Rival chapter and tactical intel |
| Coach tactical success | 100 | 25 | Not the same manual execution mastery |

**Balance rules:** minimum guaranteed partial progress for genuine effort; no penalties for stopping a workout; soft daily diminishing returns on repeated identical farming, not hard exclusion; server verification necessary for future public rankings; capped stat advantage in ranked competition; cosmetic upgrades never change punch hitbox/damage; equipment utility unlocks drill types more than power; backfill rewards after crash via event log.

### 5.3 Unlock and equip spec
Every combo has `comboId`, `name`, `techniqueSequence`, `requirements`, `mastery`, `slotCost`, `eligibleModes`, `risk`, `counterFamilies`, `rewardMultiplier`, `cooldown`, `unlockEventId`. Inventory supports `unlocked`, `trainingEquipped`, `fightEquipped`, `archived`; no consuming combo on use. Player may equip separately in both modes. Equipping requires valid slot capacity and fighter technique compatibility. Fighting bonus comes only from landed clean sequence or tactical effectiveness, NOT automatic damage multiplication; training XP can temporarily increase for a newly mastered technique then normalize. Every bonus must have anti-farm per-opponent/round limits.

Sample: **Lion's Fury** = Jab -> Cross -> Lead Hook -> Uppercut. Unlock via Chapter 3 objective; training bonus +25% relevant mastery XP for the first *five correctly timed* completions per session; fight bonus +10 tactical score on first clean valid chain per round (illustrative only, not raw health damage); combo telegraph makes it counterable, with stamina cost. Train-only, Fight-only, both or neither are explicit selections.

### 5.4 Skill fusion and loadout decisions
Combine a defensive trigger + footwork transition + counter technique to create a named **signature strategy**. Use rule constraints for physically possible chains and sensible distance/timing. Skill fusion never invents a new unanimated action: it composes validated clips + contextual transitions; advanced visual moves require separately built animations. Rules occupy finite deck capacity; more powerful chains increase stamina cost, commitment or predictability. Display matchup strengths/weaknesses and the counterplay.

---
## 6. Fighter AI, adaptive rivals and memory
### 6.1 Three layers of intelligence
1. **Combat controller:** existing deterministic state and collision authority.
2. **Tactical policy:** utility scores for attack/guard/step/counter, influenced by observed patterns, stamina and range. Use readable logic with seeded variation.
3. **Narrative memory:** observed opponent tendencies, previous outcome, notable combos, story states and bounded relationship values; never imply unlimited ML or model training.

### 6.2 Opponent learning loop
Observe: `attackFrequencyByType`, `comboSignature`, `blockRate`, `preferredExitSide`, `range`, `staminaState`, with sample size, confidence and decay. After a match, update a rival profile: `learningWeight = clamp(confidence * recency,0,maxAdaptation)`. Choose one or two counter tactics with visible hints; give players a strategy adjustment opportunity. Cap adaptation so counters are not predictive mind-reading. Fictional opponent rematches must be explainable: “Shadow noticed you exit right after hooks,” and the pattern must be grounded in recorded data. Memory resets or imports should be user controlled.

### 6.3 Fight state machine
`INTRO -> ROUND -> [PAUSE/COACH] -> ROUND -> {COUNT, ROUND_END, FINAL} -> RESULTS -> [RIVAL/TOURNAMENT/REPLAY]`. On clean impact: `STABLE -> FLINCH -> [STAGGER -> CATCH_STEP -> RECOVER | DOWN -> COUNT -> STAND] -> STABLE`, with hit intensity and balance rules. Only actual registered collisions update score; dramatic reactions aren't a substitute for scoring logic.

### 6.4 Tactical rules design
Rule syntax: `WHEN observableTrigger AND context THEN defense THEN counter THEN exit`. Trigger examples: jab windup, opponent inside range, stamina low, left hook missed. Constraints: no impossible simultaneous moves, cooldowns, minimum response latency, commitment risk, limited rule slots and priority ordering. Architect mode preview shows explanation and estimated success *under a known scripted scenario*, never fabricated probabilities. Store rule versions; offline test and rollback.

---
## 7. World, content, characters, arenas, gym and academy
### 7.1 Arena catalog (fictional, design targets)
| Venue | Unlock narrative | Gameplay identity | New visual/interaction | Device requirement |
|---|---|---|---|---|
| Starter Gym | Beginning | Neutral ring and tutorial | Practical equipment | Low |
| Underground Club | Win first trial | Close crowd and momentum | Moody light, tight camera | Low/Med |
| Rooftop Ring | Regional rank | Footwork zones | Skyline and wind cosmetic only | Medium |
| Neon City Arena | Specialist reputation | Precision challenge | Dynamic signage and lighting | Medium |
| National Stadium | Regional champion | Broadcast tournament | Intro graphics and referee | Medium/High |
| World Championship | Elite qualification | Multi-bout high stakes | Cinematic crowd, medals | Adaptive LOD |
| Legacy Hall | Legend | Histories and mentorship | Trophies, portraits, memorial bouts | Low/Med |

### 7.2 Characters and collectible identities
Initial roster: Lion (balanced power), Rabbit (speed/evasion), Tiger (pressure), Wolf (counter/positioning); later Bear (high durability but slow). All must have complete punches, defense, impact animation and correct rigging before release. Visual identity, unique idle animations and style tendencies; never guarantee superior stats in every environment. Characters are owned per account/profile; default lion is always available. Cosmetic sets and equipment are modular, with preview showing current/after. Do not hide user name behind species.

### 7.3 Gym room progression
Starter gym -> training zone -> equipment workshop -> tactical analysis desk -> recovery corner -> coaching office -> academy -> showcase hall. Each facility has `requiredReputation`, `coinCost`, `buildState`, `availableDrills`, cosmetic tier and preview. Facilities take effect immediately in single-player unless there is an explicit story build milestone; do not create meaningless waiting timers. Show visible improvements and new activities. Room layouts must remain legible on phone.

### 7.4 Academy and legacy (later-phase scope)
Recruit NPC apprentices via story, not exploitative randomized loot boxes. Give trainees distinct talents, caps and development paths. Assign mentor signature moves subject to prerequisites, train with safe scheduling, compete in separate brackets. Champion retirement is optional; mentoring retains the owner's historical identity. Legacy museum stores hall-of-fame, signature combos, trophies, rivals, team lineage, gym evolution and major highlights. Prestige resets may restart campaign chapters **only voluntarily**; owned purchases/achievements are never silently discarded.

### 7.5 World-feed event types
- Rival challenge (grounded in previous result).
- Gym upgrade unlocked by reputation.
- Skill mastery ready to claim after threshold.
- Tournament qualification and expiring *event* (clear end date, no fear-of-missing-out pressure).
- Challenge recommendation based on training weakness (private, supportive).
- Academy student milestone after simulated or played sessions (not fictional real-time training while offline without simulation).
Every card shows reason, benefit, action and dismiss option. World can change only when a saved event or reproducible simulation step changes it.

---
## 8. Complete scenario walkthroughs
### Scenario A — new player to first meaningful choice
A01 launch -> A02 select quick start -> A03 choose username and avatar -> A04 first drill movement/guard -> A05 jab/cross targets -> A06 first combo trial -> A07 unlock dialog: equip Training/Fight/both/none -> A08 quick match with a named NPC -> A09 scoring -> A10 highlights/result -> A11 first gym task -> A12 World hub. **Branches:** tutorial skip, fatigue break, failed drill, training-only player, no sound, guest without login. **Done when:** player understands how choices affect progression and can re-enter any mode.

### Scenario B — one combo becomes a new style
B01 receive combo fragment from objective -> B02 open inventory -> B03 inspect technique prerequisites -> B04 add to Training -> B05 practice clean chain -> B06 mastery progress -> B07 unlock Fight eligibility -> B08 equip to Fight -> B09 land or miss in combat -> B10 tactical post-match report -> B11 rival learns preferred chain -> B12 player changes exit rule. **Branches:** incompatible fighter, insufficient loadout slots, failed combo, blocked attack, stamina low, unequip. **Done when:** reward is visibly useful but has plausible cost/counter.

### Scenario C — rivalry with memory
C01 match vs Shadow -> C02 player loses from predictable exits -> C03 rivalry event saves observation -> C04 analysis shows evidence and optional hint -> C05 player trains left pivot -> C06 chooses Coach mode vs Shadow -> C07 between rounds switches to counter plan -> C08 Shadow tries learned counter -> C09 player may win/lose/draw -> C10 rematch history adds new chapter. **Branches:** player ignores hint, repeated losses, no stored sample data, AI adaptation cap. **Done when:** rematch materially differs while staying fair.

### Scenario D — meaningful non-KO competition
D01 open tournament -> D02 choose Counter Masters event -> D03 review rule: three clean counters in two rounds -> D04 select loadout -> D05 fight defensive specialist -> D06 valid successful counter count from event stream -> D07 win objective without KO -> D08 score and reward -> D09 unlock advanced defense drill. **Branches:** time-out, clean KO before objective, draw, blocked attempt, exploit spam. **Done when:** a distinct victory condition changes how the player plays.

### Scenario E — gym to academy to legacy
E01 reputation qualifies for gym upgrade -> E02 preview costs and activity benefit -> E03 buy facility -> E04 new drill appears -> E05 qualify regional tournament -> E06 earn title -> E07 academy feature unlock -> E08 recruit trainee -> E09 assign champion as mentor -> E10 trainee masters allowed fragment -> E11 enters rookie bracket -> E12 adds to legacy lineage -> E13 former champion becomes optional AI rival. **Branches:** insufficient currency, character switch, losing tournament, skipping academy, data migration. **Done when:** the player owns a persistent long-term outcome beyond level progression.

### Scenario F — creator/share mode (requires backend for public use)
F01 select Create Challenge -> F02 choose scenario template -> F03 set objective (e.g. three clean counters) -> F04 choose valid rules and rewards -> F05 local validation simulation -> F06 local preview -> F07 publish privately/local or server with moderation -> F08 other player attempts -> F09 results verified and ranked fairly -> F10 creator sees outcomes, can version challenge. **Branches:** impossible objective, offensive name, incompatible client version, offline publishing, cheating, unfair equipment. **Done when:** shared content is actually verified; otherwise label it offline/local.

### Scenario G — return after a week
G01 launch -> G02 show verified saved highlights, unfinished quests, currently accessible opponent challenge -> G03 no fabricated real-time result -> G04 user picks 5-min practice, 60-sec fight, tactical test or legacy review -> G05 reward and next choice. **Branches:** player declined notifications; no streak penalty; no online connection. **Done when:** returning feels meaningful without manipulative obligation.

---
## 9. Detailed edge cases and game rules
- **Save during fight:** snapshots include event and RNG state, timer, actor statuses, temporary loadouts and reward eligibility; restore with clear resume/restart; no double XP on crash.
- **AI vs player:** explicitly label watch/coached/direct control, and differentiate rewards. Autonomous match can't generate unlimited unattended rewards.
- **Draws and judging:** show per-round scorecards; draw and technical finish supported; never always report a winner.
- **KO / dizziness:** existing contact physics produces hit severity; staged reactions respect state and no instant teleport; safety setting reduces aggressive camera motion.
- **Unlock claim offline:** append immutable local reward transaction, reconcile safely if future backend introduced; inventory cannot lose item on refresh.
- **Profile switching:** data scoped by local profile ID; visible username on HUD and results; guest portability requires explicit export/import until accounts exist.
- **Fighter switch:** technique compatibility revalidated; incompatible equipped combos move to inactive rather than deleted.
- **Tournament quit:** explain resume/forfeit conditions; no unexpected coin loss.
- **Equipment effects:** cosmetics never affect stats; functional equipment alters drill availability, not competitive damage without balancing.
- **Rankings:** locally simulated AI league explicitly labeled; public ranked table waits for verified backend.
- **Challenge creator abuse:** content moderation, rate limits, impossible-goal checker and reward cap mandatory before publishing.
- **Access:** keyboard, touch, reduced motion, color-blind-friendly cues, captions and optional simplified training; pause always possible.
- **Performance:** gracefully downgrade visual fidelity, not gameplay state, when devices slow down; deterministic fixed-step logic separated from presentation.
- **Privacy:** no automatic collection of real fitness/health data; user permission for external integrations; local-only defaults.

---
## 10. Data model and implementation architecture
### 10.1 Suggested domain records
`Profile {profileId, username, createdAt, settings, progression, activeFighterId}`
`Fighter {fighterId, ownerProfileId, archetype, level, attributes, styles, loadouts, fatigue, mastery, cosmetics}`
`Technique {techniqueId, family, prerequisites, clips, staminaCost, counterTags}`
`Combo {comboId, steps, mastery, eligibleModes, equipSlots, bonusRules, version}`
`InventoryItem {itemId, category, ownedAt, effects, cosmeticOnly}`
`Gym {profileId, tier, facilities, availableDrills, reputation}`
`RivalMemory {npcId, profileId, matchIds, observedHabits, sampleCounts, confidence, adaptationPolicy}`
`Match {matchId, seed, ruleSet, mode, participants, rounds, contactEvents, scoring, result, rewardStatus}`
`ProgressEvent {eventId, profileId, type, sourceId, timestamp, payload, processedVersion}`
`RewardTransaction {transactionId, eventId, xp, coins, items, claimedAt, idempotencyKey}`
`Challenge {challengeId, authorId, rules, objective, constraints, visibility, verifiedVersion}`
`Academy {profileId, recruits, coaches, inheritedTechniques, legacyRecords}`

### 10.2 Event-driven game services
- **Core combat authority:** retain `boxing-coach-v2.js`, `boxing-fight.js`, `training-arena.js`, `contact-response.js`, `padding-deformation.js`, `avatar-anatomy.js` and their existing behavior; introduce small adapters rather than rewrite.
- **Identity/Profile Service:** local deterministic IDs, username display and per-profile state; migration-safe storage.
- **Progression Service:** checks event validity, achievement criteria, XP and mastery; one authoritative transaction ledger.
- **Reward/Inventory Service:** grants and equips unlocks idempotently, rules by mode.
- **Quest/World Director:** deterministic seeded event selection from validated history and currently eligible content.
- **Tactical AI Service:** tactic evaluation from observed in-game actions with bounded learning.
- **Content Registry:** versioned fighters, arenas, techniques, events, rule sets, localization strings and device-tier assets.
- **Presentation Shell:** HUD and modular screens, reduced-motion accommodations, mobile layout and transitions.
- **Persistence:** current local device storage first with explicit export/import; migrate to backend only for shared leagues, public created challenges and cross-device identity.

### 10.3 Important separation of concerns
Combat result -> verified match event -> progression rules -> reward transaction -> inventory unlock -> world event -> UI. **Never** let visual confetti, result animations or replay effects generate scores/rewards. Use event IDs to avoid duplicate awards. World events do not mutate current active fight. All generated rewards and rival adaptations must be traceable to match and training records.

---
## 11. Flow diagrams and graph specifications

### 1. Full progression: beginner to legacy
![Full progression: beginner to legacy](diagrams/01_player_journey.svg)

### 2. Core gameplay and reward loop
![Core gameplay and reward loop](diagrams/02_core_loop.svg)

### 3. Product-system architecture
![Product-system architecture](diagrams/03_architecture.svg)

### 4. Fight and knockdown states
![Fight and knockdown states](diagrams/04_fight_states.svg)

### 5. Combo unlock and equip decision
![Combo unlock and equip decision](diagrams/05_unlock_equip.svg)

### 6. Adaptive rival memory
![Adaptive rival memory](diagrams/06_rival_learning.svg)

### 7. Milestones and release gates
![Milestones and release gates](diagrams/07_roadmap.svg)

See `diagrams/*.svg` for printable flows and `diagrams/*.mmd` for editable Mermaid source. Required views: **player journey**, **core gameplay loop**, **system architecture**, **fight state machine**, **unlock/equip decision**, **rival learning cycle**, **release roadmap**. The product mockup posters are conceptual art only.

---
## 12. Delivery plan and acceptance gates
### Milestone M0 — verify existing game, no code changes
Inventory current mode/function behavior, list enabled features, screenshot baseline, test the real rendering/animation engine and collect baseline CPU/GPU metrics. Build integration map and migration plan; do not duplicate existing modules.

### Milestone M1 — functional game foundation (first lovable release)
- Profile identity & username on every relevant screen.
- World hub; Play/Train/Watch choice, current game flow preserved.
- Verified XP, coins, achievements, match records, 8 curated quests, 4 combo unlocks.
- Combo ownership/equip to Training and Fight independently; basic inventory.
- Results screen with genuine judging, rematch, reliable persistence.
- 2 venues (starter and underground) if visuals meet frame budgets.
**Acceptance:** New player reaches an earned unlock and a match result within ~10 min; progress survives refresh; all existing test suites pass; no duplicated reward grants; portrait mobile fully operable.

### Milestone M2 — adaptive game depth
- Coach mode with between-round strategy.
- Tactical rules editor with 6 vetted blocks and sandbox test.
- Rival memory from actual last 3–10 match records; clear counters/feedback.
- 5 distinct challenge types; 2 rivals with tailored styles and scripted introduction.
- Equipment/gym tier 1–2; rewards and previews.
**Acceptance:** 3 replayable rematches demonstrate explainable different tactics; each has a viable counter; no cheating/no hidden perfect foresight.

### Milestone M3 — world and collection
- Expand 4 fully animated fighters, 4 more arenas, 2 tournaments, 2 gym upgrades.
- World event director, character roster, tactical fusion, season summaries.
- Replay highlights and long-term collection/legacy view.
**Acceptance:** Different player choices lead to visibly distinct progression paths; save migration tested; mobile FPS/performance meets established device budgets.

### Milestone M4 — validated community
- User-authenticated profiles, cross-device sync, server-authoritative outcomes for public competition, privacy/security policies.
- Asynchronous challenge publishing, moderation and version verification.
- Real public leaderboards and seasonal competitions (not mocked).
**Acceptance:** cheat-resistant server verification, account recovery, moderation, retention/deletion controls, and regression performance tests.

### Milestone M5 — academy and living universe
- Apprentice recruitment, bounded mentorship, school identities, legacy challenges, optional generational campaigns.
- Additional scenario generators and reputation-driven events, safely content-curated.
**Acceptance:** clear progression without compulsion, sustainable content costs, long-term retention measured honestly.

### 12.1 Metrics to test, not promises
Activation: onboarding completion, first valid punch, first reward claim, first repeat session. Engagement: sessions/week, meaningful session depth, tactical edits, quest completion and *voluntary* return rate. Quality: fight FPS p50/p95, input lag, crash rate, invalid contacts, save loss/duplicate rewards. Economy health: unlock pacing, % underpowered/overpowered loadouts, XP farming. Safety: fatigue opt-outs, accessibility paths, absence of coercive streaks. Community (later): fair win rates and moderation load. Set numerical business KPI targets after observing an instrumented prototype, not by inventing benchmarks.

### 12.2 Codex implementation operating instructions
1. Read current `ytcat/fit` main at execution time. Inspect README, game modules, tests, existing PRs and relevant branch changes. **Do not copy generated visuals directly into production.**
2. Create an isolated feature branch and write a current-state vs target-state traceability matrix for each requirement. No force push or overwrite other agent changes.
3. Implement M1 in vertical slices: identity -> validated events -> rewards -> inventory/equip -> hub -> match/result -> QA. Every slice must be runnable with existing static-server architecture.
4. Use feature flags for new screens and game rules; retain the previous UI as recovery fallback. Avoid premature framework migration or new physics engine during progression work.
5. Test desktop and mobile browser, languages EN/HE/RU, keyboard/touch, accessibility, offline save and all modes. Continue to run all existing regression suites; add event-ledger and progression tests.
6. Collect screenshot/video comparisons and check the actual boxers remain visible and move accurately. Do not claim features passed physical-phone testing unless performed.
7. Open a PR with screenshots, reproducible verification, changed files, explicit incomplete items and rollback procedure. Only proceed to M2 after M1 quality gates are met. Never invent an implemented feature that has only been designed.

## 13. Definition of epic success
The first 10 minutes produce a satisfying reward and personalized fight. By the first week, the player has discovered a signature tactic and an opponent who reacts to it. By the first month, there are real choices about style, equipment, gym and competition. By the long-term endgame, the player owns a named legacy of fighters, combos, trophies and stories—not just a large number next to an XP bar. Every world change must be visible, earned, and grounded in verified gameplay events.

**END OF SPECIFICATION**


---
# PART II — THE LIVING WORLD EXPANSION (V2 AUTHORITATIVE ADDENDUM)
**Status:** Complete product proposal; no new feature below is claimed to be implemented. **Economic figures are balancing hypotheses**, not tested production rates. **No real-money payment, advertising requirement, loot boxes, cash-equivalent currency, gambling, paid subscriptions or purchasable virtual currency.**

## 14. Executive decisions — what makes this a distinctive game
The original FIT/RingFighter boxing renderer remains the combat and training engine. The player becomes the **founder of a fighting school**. Their unique asset is not a numerical power level; it is a growing *school philosophy*: a roster, named combos, tactical policies, rival relationships, gyms, arena access, trophies and a chronicle of consequences. The player can Fight, Coach, Architect, or Watch, and switch between activities without losing their place. We are not building an unbounded open-world sandbox for release 1: the living world is delivered first as a **persistent interactive world map, event feed, progression graphs and instanced 3D gym/arena scenes**. This can be significantly richer than a large, empty 3D city while staying viable on phones.

**Signature experience:** In 3 minutes the player makes a choice that matters; in 15 minutes they master a skill or settle a rivalry; in an hour they can complete a meaningful tournament arc. Upon return, the world shows a truthful, bounded digest of simulated rival development and new challenges, without penalties for absence.

### 14.1 Five creative principles
1. **Ownership of strategy.** Equip new combos by game mode, combine technique fragments, name an original signature, assign it to fighters, and teach an academy student. No arbitrary damage boost for every unlocked move; benefits come from the attack's actual tactical geometry, compatibility and mastery.
2. **Drama from cause and effect.** Rivalry, scouting, media coverage, invites and story arcs reflect the player's recorded choices. Unexpectedness comes from controlled authored event templates and the player's history, not incoherent AI-generated claims.
3. **Delight in short visits.** A meaningful solo challenge is available in <30 seconds from hub; suspend and return where safe. No daily login debt, lost inventory, expiring purchased items or pressure to disrupt sleep.
4. **Modern-world flavor, original IP.** Trends become original event themes: tech rivalry, sports culture, gadget launches, global festivals, arena fashion, fictional viral challenges and invented celebrity archetypes. No unlicensed film/TV/game characters, logos, celebrity likenesses or deceptively similar impersonations.
5. **Earn and express.** Every reward is earned with gameplay, in-game credits only. Cosmetics express progress; gear changes training or offers bounded playstyles rather than paid/statistical domination.

### 14.2 Product promise and exclusions
- **Promise:** "Build a school. Invent a style. Teach a champion. Watch the world learn your moves."
- **Not promised:** real-time shared world while offline; actual online PvP, live social rankings or push alerts without backend; genuine machine-learning opponent cognition; playable named public figures or copyrighted franchise characters.
- **Differentiation test:** Remove rendered punches. The remaining Lab, school, scouting, resource allocation, rivalry, special missions and tournament planning must still make sense as a rewarding strategy game. Remove management. Real-time boxing still remains playable. Both loops should reinforce each other.

## 15. Engagement architecture: bite-size, mid-length and deep sessions
| Time | Entry point | Activity | Exactly what the player decides | Outcome | Exit contract |
|---|---|---|---|---|---|
| 30–90 sec | World Feed > Choose | Respond to a scouting report; equip or swap combo; collect already-earned challenge reward | Choose risk/defense/gear; save one change | New loadout or strategy note | Immediate autosave, clear Resume |
| 2–4 min | Quick Missions | One-round defense, precision targets, short combo chain | Skill and difficulty | XP, modest credits, mastery | Resume hub in one tap |
| 3–6 min | Rival Lab | Analyze replay, test one counter with AI sparring | Choose trigger and response | Tactical rule unlocked/verified | Save hypothesis, no penalty |
| 6–12 min | Gym | Training session + visible facilities upgrade | Train or spend credits | Mastery + permanent gym change | Mid-drill pause or safe checkpoint |
| 10–25 min | Challenge Tour | 3 chained fights with altered constraints | Loadouts, opponent order, round coaching | Trophy / invitation / rival memory | Resume between bouts |
| 25–60 min | Regional Event | Bracket, scouts, matches, intermissions | Recruitment, tactics, choice of prize | Event ending with causal chronicle | Stop between matches |
| 60–180 min | Academy / World Arc | Multi-event story, fighter training plans, season matches | Allocate resources, develop style, recruit | Legacy milestones / history | Every scene has checkpoint |

**Home screen must never demand a 25-minute tutorial or a timed login reward.** First meaningful decision within 60 seconds; first tactical reward within a 5–10-minute target. Longer sessions should be richly optional, not mandatory for baseline progression.

### 15.1 Welcome back after 1, 7, 30 days
- **One day:** show at most 3 grounded cards: your selected trainee's planned session has completed *if locally simulated*, new suggested opponent, an equipment item newly unlocked by recorded achievements. Do not fabricate unrelated achievements.
- **Seven days:** replay bounded seasonal events and rival progression from a deterministic simulation with upper caps (e.g. max 3 simulated rival matches per offline week). Present "What changed / Why / What you can do." Skills and purchases stay intact. Missed timed events become archives with equivalent rewards later.
- **Thirty days:** a "Welcome back" panel offers one catch-up match and choice of three directions; do not reset rank arbitrarily or shame player for absence. Archive world time remains understandable; catch-up rewards are proportional and non-exploitable.
- **Never:** endless streak loss, notifications that falsely imply imminent disaster, punishment for time-zone changes, or weapons-grade engagement loops designed to impair sleep.

## 16. Virtual economy — free forever, fair by design
### 16.1 Four non-convertible values
| Value | Purpose | Earned through | Spent on | Can trade? |
|---|---|---|---|---|
| XP | Career chapter progress | Completing validated activities | Not spendable | No |
| Credits (CR) | General in-game store currency | Training, fights, challenges, tournaments | Clothes, gloves, shoes, gym equipment, arenas' custom themes | No |
| Mastery Marks (MM) | Skill-specific competence token | Accurate varied practice, tactical learning | Unlocking *earned* skill mastery nodes / signature recipes | No |
| Reputation (REP) | World and academy standing | Notable achievements and legitimate championships | Unlocks access; cannot be purchased | No |

Avoid unnecessary currency proliferation. A trophy, title belt, rank-watch or collectible character is an **inventory item/achievement**, not a currency. No loot box randomness, premium tiers, real-money payment, marketplace or crypto. Reward grants must be idempotent and attached to an authoritative completed event ID.

### 16.2 Proposed starter earning and prices (numbers to tune)
| Action/item | Proposed amount | Constraints |
|---|---:|---|
| 3-minute warmup mission | +25 CR / +40 XP | Partial reward if interrupted |
| 5-minute targeted training | +55 CR / +90 XP | Accuracy and variation validation |
| 60-second quick exhibition | +35 CR / +60 XP | Win adds +15 CR, capped repetitive rewards |
| First rivalry win | +125 CR / +180 XP / +10 REP | Unique per rivalry chapter |
| Win a 3-bout regional cup | +240 CR / +350 XP / +25 REP | First clear full reward; repeat scaled |
| Basic pants colorway | 90 CR | Cosmetic only, reversible |
| Distinct gloves skin | 150 CR | Cosmetic; physical glove material follows model |
| Speed-work shoes | 280 CR | +small movement feel in solo mode OR +1 training proficiency; standardized for ranked |
| Heavy-power gloves | 330 CR | Solo modes: bounded +impact / −stamina tradeoff; standardized in ranked |
| Original title belt variant | 420 CR + earned title gate | Cosmetic; cannot fake actual earned title |
| Rank wristwatch | 180–460 CR | Appearance + visible career-rank indicator, no combat stat |
| Professional mitt station | 600 CR + gym level | Unlocks drills and academy routine |
| Las-Vegas-inspired neon stage | 900 CR + arena gate | Original "Neon Strip Championship", no casino branding |
| New roster fighter license | 950 CR + story contract | New moveset / tactic; no inherently superior damage |

Amounts above are **example balancing parameters**; scale after playtests. A beginner should reasonably afford a cosmetic within 10–20 minutes, and the first functional gym upgrade during first 3–5 sessions. Under no circumstances can a player buy an earned competitive title without winning that title. Display preview, stats and ownership before purchase; spending requires confirmation; support restore on interrupted transaction; prevent negative balances; support refunds for confirmed purchase bug/rollback.

### 16.3 Equipment gameplay contract
**Three categories**: cosmetic (skin/clothes/watches/belts), training utility (enables new stations/drills), sidegrade combat (changes tactics but carries an offset). Gloves can have a power/stamina tradeoff; shoes can favor agility/guard recovery while lowering impact stability in solo mode; no purchased equipment gives net advantage in competitive ranked. Arena choice may modify lighting/ambience and *announced* rules for special challenges, never hidden hitbox or input disadvantages. All stats must be shown as understandable labels plus exact tunable values in advanced view. Equipped items must attach correctly to animated lion and rabbit across body proportions; no clipping, wrist inversion or missing texture on mobile.

### 16.4 Economy abuse prevention
- Credits from result *only* on transition `match.finished -> ledger.grantOnce(matchId)`; no repeated UI claim, reload farming, negative inventory or disconnected credit duplication.
- Quick matches grant reasonable full first-time rewards; diminishing returns on repeated idle/watch farming, with transparent reason. Manual quality, useful tactics and diversified goals count more than raw tapping.
- Offline clock cannot independently mint unbounded credits. Simulated rival activity changes world state but does not silently generate wealth for the absent player; planned training gains have a capped explicit result.
- Fixed seeds used for QA, secure server validation required before real shared leaderboards. Preserve local progression after any eventual server rollout and resolve conflicts explicitly.

## 17. New-world story engine: relatable current events without risky licenses
### 17.1 Event content tiers
**Tier A — evergreen original:** sports festivals, local gym rivalries, seasonal championship tours, funny internet challenges, prototype gadgets, streaming culture, fictitious sponsor wars. Fully offline and low-maintenance.

**Tier B — configurable timely themes:** small JSON event packs authored after reviewing current context. Seasonal world-festival, tech-product-launch frenzy, viral-dance challenge, football tournament tie-in, night-stadium spectacle, futuristic sports-expo. Themed 3D decorations and dialogue must be original. A JSON update changes event date, venue, reward, eligible missions and story card without modifying core runtime.

**Tier C — licensed collaborations (NOT release scope):** actual famous people, movie characters, game franchises, identifiable superheroes or real brand logos only with explicit rights and approved terms. Do not model Elon Musk, Trump, Toy Story characters or Wolverine as identifiable playable characters absent verified rights, even if the game is free. For nonlicensed humor, invent obviously original archetypes (e.g. "Tech Tycoon Titan" with unique appearance, name, voice and backstory; "The Showman"), and do not imply endorsement. Named real nationalities can be treated respectfully as regional teams, not as collectively villainized peoples. Avoid playable combat narratives based on real conflicts or terrorist propaganda. Public news may inspire fictional contests, not real-world hate.

### 17.2 Event data model — editable without code changes
```json
{
  "id": "evt_neon_innovation_01",
  "version": 1,
  "titleKey": "event.neonInnovation.title",
  "startAt": "2026-11-01T00:00:00Z",
  "endAt": "2026-12-15T00:00:00Z",
  "archiveReplay": true,
  "venueId": "neon_strip_original",
  "npcIds": ["gearhead_fox", "showman_bear"],
  "scenarioIds": ["gear_counter_test", "spotlight_defense"],
  "requirements": {"chapterMin": 2},
  "rewards": [{"itemId": "glove_neon_circuit", "count": 1}],
  "fallbackReward": {"currency": "CR", "amount": 160},
  "maxCompletionsPerProfile": 1,
  "contentRating": "general",
  "licenseStatus": "original",
  "translations": ["en", "he", "ru"]
}
```
Offline schedule note: local-only schedule cannot guarantee real-time coordination across users. Event availability uses trusted timestamps when connected; otherwise use an explicit offline calendar fallback with anti-clock-tampering rules. Event-specific rewards remain unlockable through archive rotations or equivalent replay; never punish a player for not logging in on a particular day.

### 17.3 Complete event scripts ready for content production
**EV-01 Neon Innovation Cup (tech culture).** A futuristic startup district unveils experimental sparring equipment. Three matches: (1) precision targets with light-reactive gloves; (2) defense against an agile fox "Gearhead" who switches patterns; (3) final against "The Showman" in a neon arena. Player choices: purchase decorative visor (CR), equip precise jab, or train counter. Reward: neon gloves skin and "Inventor" stamp. Failures: rematch available; no hard loss of progress. Assets: existing arena re-lit with emissive signage (original marks); two roster skin variants (new model only when justified).

**EV-02 Stadium Fever (football-season energy).** The world celebrates athletic footwork: step-and-pivot mini-game, defend corners, coach a team relay; no use of sports-club marks. Reward: special footwork shoes skin and a 3-stage "Stadium Step" combo fragment. Player can play solo timed drills or coach AI. Focus is boxing footwork, not launching a whole football engine.

**EV-03 Pop Culture Spotlight.** A fictional action-movie premiere sends arena fans into a frenzy; the rival "Clawstrike" (original design, not a known superhero) challenges the player to a stunt-style exhibition. Select camera stage, music from licensed/original assets, and 3-hit cinematic finisher challenge. Reward: collectible movie-night belt trim; the finishing move must remain grounded boxing choreography, not magical combat.

**EV-04 World Circuit Nights.** Original venue looks inspired by generic real-world city moods: "Neon Strip" (glittering desert city), "Harbor Dome" (coastal metropolis), "Mountain Training Camp", "Old Town Rooftop", "Festival Plaza". Do not promise faithful copyrighted architecture or actual licensed venues. Each venue has one rule variation and one environmental story beat; no additional complex 3D open-world streaming.

**EV-05 Viral Combo Relay.** In-world fans challenge the school to a distinctive 4-action defensive combo with an optional player-defined signature; players can share a text seed / code offline before public UGC exists. Opponents attempt to solve it. Rewards focus on ingenuity and accuracy, not replay grinding.

**EV-06 The Comeback Documentary.** A rival who previously beat the player appears on the fictional sports-news feed, with highlights assembled from actual match logs. Player can request a technical rematch, inspect rival tendencies and earn the "Second Chance" badge on a comeback. Never claim a real journalist or live news source exists.

**EV-07 The Academy Invitation.** A new trainee contacts the player's school because they admire a specific recorded signature move. Mentor choices produce three skill paths. The trainee debuts after capped planned training. Reward: academy legacy progress, not a mandatory daily check-in.

**EV-08 Rival School Uprising.** Another fictional school learns and counters the player's top 2 combos, then issues a team challenge. Play direct, coach a teammate or create new counter rule. After three chapters the rival school changes identity/style based on match history. Outcomes include rivalry friendship, sportsmanship and tactical rivalry, not only hostility.

### 17.4 Scenario generator rules
Generator input: current unlocked features + match history + opponent style + eligible event pack + safe player preference. Filter out illegal move combinations, impossible equipment, already-claimed unique rewards, age-inappropriate material, stale references and impossible objectives. Generate a candidate `(setup, challenge, twist, meaningful choice, result, follow-up)`; run deterministic simulation preflight to guarantee at least one viable success path. Require tutorial-level objectives to have multiple ways to complete. Provide a debuggable event seed, story template ID and explanation of why the event appeared. Never fabricate a real-world breaking news event.

## 18. The academy founder fantasy — world systems and agency
### 18.1 Club progression
| Academy tier | Theme / physical change | New gameplay systems | Meaningful decision |
|---|---|---|---|
| 0 Neighborhood Corner | One ring, old bag, locker | Player vs NPC quick match, beginner drills | Starter fighter identity |
| 1 Training Club | New floor, lighting, speed bag | 3-item shop, combo loadouts, one coach | Buy style or utility |
| 2 Fight Studio | Mitt station, tactical wall | Coach mode, rival scouting, gym challenge | Invest in counters or power training |
| 3 Competitive Academy | Two training spaces, locker gallery | Trainee slot, team mini-event | Which student receives teaching time |
| 4 Championship Facility | Media wall, trophy corridor | 3-fighter team roster, world circuit | Plan team tournament |
| 5 Legacy School | Hall of fame, custom banner | Signature school style, inherited technique | Preserve/retire champion to mentor |

Upgrade choices use earned credits and chapter gates, not persistent rent or maintenance fees. Upgrades don't become unusable while the player is away. Visual changes use staged scene assets and configuration (avoid costly custom map generation). Each room must have at least one unique gameplay function.

### 18.2 Fighter relationship and developmental mechanics
- **Identity:** profile owner username + fighter name + species + style + personality traits, distinct entities.
- **Rival memory:** per matchup retain recent tactical tendencies (e.g. 4 most-used moves, exit side, defensive rate), rivalry arc, last outcome, confidence and tactical knowledge; cap memory horizon and counter accuracy. Opponents may improve only after logged fights or deterministic simulated challenges and must retain weaknesses.
- **Friend/mentor/teammate relationships:** coaching a former rival can be a narrative event after fair play; this is an authored branching relationship, not unsupervised chat generation.
- **Recruitment:** player gets a scouting report with a trade-off (quick but fragile; strong but slow; calm defender; creative counterpuncher). Each candidate comes with 2 starter tactics and 1 growth path. New species/character art added in milestone batches only when assets meet quality baseline.
- **Legacy:** a champion can retire from competitive roster to mentor and pass *one* mastered signature fragment to a student, with student needing training and compatible style. Champion remains in Hall of Fame and can be used in exhibition; no irreversible accidental retirement.

### 18.3 Opponent learning algorithm, bounded and transparent
Per fighter store an exponentially decayed histogram of observed strike categories, direction, range, accuracy, combo prefix and defensive decisions. After a match compute strength-weighted updates with stable seed, minimum evidence threshold (e.g. 8 observed opportunities) and a counter-choice cap. Opponent defensive bias follows estimated habit frequency but never responds perfectly; introduce reaction lag and perceptual mistakes; skill changes by bounded increments gated to actual events. Present plain-language scouting: "Shadow noticed you finish with a left hook"; add option to feint or train right-side exit. Don't claim ML training when underlying system uses explicit weights. Automated simulated matches must use deterministic snapshots.

## 19. Detailed end-to-end sample story — "The Lion School"
### ACT I — The forgotten gym, first 15 minutes
1. Cinematic opening shows the user's current ring (existing scene) and a named NPC coach. A one-tap Skip enters immediate Quick Fight.
2. Local player profile: username, chosen fighter (lion or rabbit), outfit color (default free), preferred controls and motion/fitness preference; player can continue without registration.
3. Tutorial is contextual, optional and 3 minutes max per module. Jab, guard and step earn a first clear result.
4. An in-world announcer presents "[Username] (Lion) vs Shadow (Rabbit)." HUD and winner screen use username. Match is 60 seconds with Play/Coach/Watch available as permitted.
5. First completion awards 90 XP, 55 CR, and `one_two` combo. Player chooses Equip to Training, Fight, Both or Vault. Preview shows bonus eligibility and command placement.
6. Player sees two offers with real trade-offs: cosmetic red gloves (later purchasable) or save for mitt station. Both paths are valid; first purchase does not block play.
7. On exit, a Save Confirmed toast appears; next launch resumes at the World Hub, not a new tutorial.

### ACT II — A rival learns, 3–8 sessions
8. First three fights expose repeated same-side exit. The rabbit records the observation, unlocks a bounded counter response and the feed says why it developed.
9. Player opens a 2-minute scouting lesson and tests defense in Architect mode (When jab -> slip outside -> counter body -> pivot). The rule is a tactical policy; it does not guarantee an unblockable combo.
10. New variation is tested in a sparring simulation. Actual contact, guard and balance determine result. Player is rewarded for successful new patterns, not mere UI configuration.
11. Shadow adapts again to a second distinct habit. Story branches depending on player outcome: friendly sparring invite, public championship challenge or an academy recruitment lead. The rival remains beatable and has consistent strengths/weaknesses.
12. Earn credits, upgrade gym mitt station, unlock real training drill; gain a fragment toward a named signature combo (e.g. "Lion's Trap").

### ACT III — Tournament season, 8–20 sessions
13. World Circuit reveals 3 venues: Neighborhood Hall, Neon Strip, Harbor Dome; each has a theme and rule variation (accuracy round, stamina round, standard match).
14. Player manages a 3-fight cup and can switch roles between matches. Opponent announcements, camera, applause and bell depend on match state.
15. A surprise matchup is drawn from eligible original fighters, not an arbitrary unbeatable boss. Player sees scouting trade-offs before making a consequential loadout decision.
16. Championship win grants actual title belt and REP. The belt can be displayed and recolored via credits, but the recognized title's provenance remains visible and immutable.
17. Local press recap: "[Username]'s Lion wins at Neon Strip" generated from match record, seed and venue metadata. Replay accessible; incorrect winner naming is a release blocker.

### ACT IV — Founder and mentor, 20+ sessions
18. Recruit original character: a quick Fox counter specialist, slow Bear pressure fighter, or a Wolf endurance boxer (asset production only after visual quality acceptance).
19. Decide academy investment: develop trainees or improve the trophy hall; neither path has coercive upkeep costs.
20. Create a signature style from compatible technique fragments, give it a name, test it, and teach it. The result is a rule set plus animation paths already available, not an unbounded procedurally generated new animation without rig validation.
21. A new school challenges your signature. World feed references its real use and observed effectiveness. Player discovers a counter-counter; rivalry evolves.
22. At Legend chapter, player can choose to mentor with a retired champion, leaving a permanent hall-of-fame record and launching a new fighter's progression with limited inherited training knowledge, not overpowering starting stats.
23. After a week away, the user returns to 3 grounded digest cards and selects a rematch, a 3-minute mission or the longer Academy arc. No assets or points expire.

## 20. Detailed system state contracts
### 20.1 Identity and entitlement
`Profile {id, username, createdAt, locale, preferences, wallet, xp, rep, season, stats, achievements}`. `Fighter {id, ownerProfileId|null, npcOwnerName|null, displayName, species, style, loadouts, condition, mastery, aiMemory}`. The visible match label must use `ownerProfile.username + fighter.displayName` for human owners and `npcOwnerName + fighter.displayName` for NPCs. Handle guest `Player 1` safely; never overwrite a user's username with species.

### 20.2 Purchases
`ShopOffer -> Preview -> Confirm -> WalletCheck -> AtomicDebitAndGrant -> Inventory -> Equip -> UIUpdate`; on insufficient funds show ways to earn credits; on duplicate purchase of non-stackable item show Owned; interrupted save restores either **both** debit and item or **neither**. Offline local storage uses transaction journal; save schema migrations include inventory dedupe. No purchase button may open external payment.

### 20.3 Combo assembly
`SkillEarned -> SkillLibrary -> CompatibilityCheck -> Training/Fight/Both/Vault -> LoadoutCapacity -> Equip -> TrainingMastery -> FightUse -> Replay/Feedback`. If a move isn't supported by a character's rig, show incompatible and fallback (never animation crash). Quality bonus checks real hit/contact and unique action IDs; no extra bonus on blocked, missed or repeatedly spammed combos. Base fight remains balanced even without advanced combos.

### 20.4 Match results and narrative
`match.finished` contains immutable ID, timestamp, seed, players, arena, inputs, stats, judge scores, knockdown count, method and winner profile ID. `rewards.grantOnce` and `world.applyResultOnce` consume it; `announcer.render` and `feed.render` use same winner IDs. No fabricated history if match incomplete, aborted, or automatically simulated while app closed unless a documented simulation log exists. Rematch creates a new match ID and increments rivalry memory only after finalized match.

### 20.5 World tick and offline catch-up
Separate **world calendar** from match simulation. On resume compute bounded elapsed period; deterministic NPC-only world results, with at most N encounters; if the offline simulator cannot be trusted, generate a "new opportunities" summary not a false claim about actual matches. Save events, timestamps, lineage and source. Local clock rollback -> mark pending until trusted validation or fall back to offline-safe events.

## 21. Full scenario catalog and design cards
| ID | Name | Duration | Winning condition | Special mechanic | Reuse existing systems | Reward |
|---|---|---|---|---|---|---|
| SC01 | Opening Bell | 60s | Complete a jab and guard tutorial | Coach hints, pause | existing punch / guard | first XP+CR |
| SC02 | Precise Five | 2m | 5 verified clean contacts | target movement | existing hit/contact | precision MM |
| SC03 | Ghost Defense | 3m | Avoid/guard 8 attacks | telegraphed jabs | slip/guard/AI | defensive fragment |
| SC04 | Corner Escape | 2m | Avoid corner pressure + pivot | edge constraint | footwork/ring | pivot mastery |
| SC05 | Heavy Power | 4m | 3 high-quality bag impacts | bag recoil / rest | heavy bag physics | glove color unlock |
| SC06 | Speed Circuit | 3m | Timed speed bag alternation | rhythm | speed bag | speed work CR |
| SC07 | Counter School | 4m | Read and counter 3 patterns | AI bias | tactical lab | counter fragment |
| SC08 | Rival Rematch | 3–8m | Win or show tactical improvement | rival memory | fight state + AI | rivalry REP |
| SC09 | Scramble Round | 60s | Outscore aggressive opponent | stochastic interrupts | short fight | exhibition CR |
| SC10 | Endurance Wall | 5m | Survive / recover to guard | fatigue | stamina & reaction | stamina mastery |
| SC11 | Combo Showcase | 4m | Land distinct combo variants | compatibility | combo engine | recipe slot |
| SC12 | Coach's Corner | 6m | Win through changing strategy | inter-round coaching | fight AI | coach rating |
| SC13 | Surprise Substitute | 8m | Adapt to 2 opponent archetypes | story twist | roster/scouting | REP |
| SC14 | Stadium Footwork | 3m | Complete pivots + sidesteps | precision stepping | foot IK | stadium shoes skin |
| SC15 | Neon Innovation | 12m | Clear 3 science-themed stages | event pack | arena skins + AI | neon gloves |
| SC16 | Creator's Puzzle | 5m | Break a specific guard policy | tactical brain | Architect mode | invention stamp |
| SC17 | Championship Cup | 20–35m | Win best-of-three bracket | bracket persistence | fight results | true title belt |
| SC18 | Trainer's Apprentice | 8m | Teach and test trainee move | academy transfer | drill templates | trainee badge |
| SC19 | School vs School | 20m | 2 wins / 3 bouts | roster tactics | team selector | school REP |
| SC20 | Hall of Fame | 4m | Choose retirement / mentor | legacy provenance | history | founder banner |
| SC21 | Return Challenge | 3m | Complete one tailored goal | re-entry catch-up | world feed | normal CR |
| SC22 | Rival Documentary | 6m | Review then revise tactic | recorded evidence | replay + AI summary | narrative stamp |
| SC23 | City Circuit | 15m | Win rounds with varying objectives | venue rules | arena settings | venue theme |
| SC24 | Signature Defense | 4m | Survive a self-designed combo | player creation | tactical simulation | signature mastery |

All rewards are illustrative. A scenario declares: `requiredFeatures`, `duration`, `difficulty`, `startState`, `validActions`, `goalPredicate`, `failurePredicate`, `pausePolicy`, `rewardPolicy`, `fallback`, `analyticsEvents`, `testSeed`, `ageContentRating`. **Never implement scenarios as purely narrated menus while claiming playable action**.

## 22. Screen-level UX acceptance and player journeys
### 22.1 Global hub above fold
- Header: avatar, username, school name, XP level, accessible currency balance. Primary CTA "Resume" with last activity.
- Main 3D window: current fighter at current gym, appears interactable with Play/Coach/Watch affordances; DO NOT clutter with unclickable decorative controls.
- Dynamic opportunity carousel: at most 3 items: rivalry, immediate 3-minute activity, story progression. Each says **why it appeared** and **estimated time**.
- Tabs on phone: World, Train, Fight, Lab, Club. Inventory/shop reachable within 2 taps. Desktop sidebar equivalent.
- Fast mode switch not reload 3D scene unnecessarily; menus preserve camera and fight state. Reduce motion mode and accessible contrast/font size.

### 22.2 Specific screens requiring built mockups and implementation
`S25 Shop Listing` filters for Gloves / Shoes / Shorts / Accessories / Belts / Gym / Arenas / Fighters; shows 3D preview and correct CR price. `S26 Item Detail` preview worn on selected fighter, effects with trade-offs, purchase confirmation. `S27 Title Room` actual earned belt record versus purchased belt appearance. `S28 World Event Feed` active, upcoming and archive events with grounded metadata. `S29 Venue Gallery` individual venue thumbnails, rules, unlocked state. `S30 Academy Map` school rooms with upgrade affordances and real in-game consequences. `S31 Return Digest` observed match logs, learning summary, next goals; quick dismiss. `S32 Signature Composer` move fragments, validity states, named output, training/fight equip. `S33 Rival Intelligence` history, weaknesses, confidence and counter suggestions. `S34 Season Dashboard` local bracket and past winners; global ranking only when backend enabled. `S35 Fictional News Studio` real profile names in generated summaries. `S36 Legacy Hall` retired mentors, achievements, school-style ancestry.

### 22.3 User stories with exact testable criteria
- As a first-time player, I can start a 60s match without creating an online account; pass if ≤3 taps from start and the result carries my chosen username.
- As a collector, I can preview and spend CR on colored gloves; pass if balance decreases exactly once, item equips, survives reload and renders correctly on both models.
- As a strategist, I can win a new combo and choose Training-only; pass if it appears in training and is NOT selectable in fight until equipped there.
- As a competitor, I can lose a match and still receive useful actionable feedback; pass if a reason, suggested counter and rematch option are available.
- As a returning player, I can be away 30 days without losing any bought item or earned trophy; pass with simulated clock test.
- As a competitive player, I am not at a ranked disadvantage against CR-bought gloves; pass with baseline-stat normalization tests.
- As a parent or time-limited player, I can pause/leave after a short activity without losing safe checkpoints; pass with interruption/restart tests.
- As a non-English user, menus, rewards, messages and generated event titles work in Hebrew RTL and Russian without clipping.

## 23. Content, data, telemetry and operational design
### 23.1 Versioned persistence and services
Modules must be isolated from the current stage engine: `ProfileService`, `WalletLedger`, `InventoryService`, `ProgressionService`, `ComboLibrary`, `LoadoutService`, `TacticalPolicyEngine`, `RivalMemoryService`, `WorldCalendar`, `WorldEventEngine`, `SchoolService`, `TournamentService`, `NarrativeChronicle`, `SaveMigrationService`, `EventPackValidator`. Every service defines inputs/outputs and forwards only typed events. Implement no monolithic global save blob with UI state mixed into transactional rewards. Provide versioned migration from current career/local save. Do not modify current fights' underlying scoring mechanics without separate verified testing.

### 23.2 Content schema
- `CatalogItem`: id, itemType, version, speciesCompatibility, meshAsset, thumbnail, currencyPrice, requiredAchievement, cosmeticEffect, gameEffect, tradeoff, balanceTier, sourceLicense.
- `SkillDefinition`: id, ordered move IDs, hand, leadFoot, durationRange, animationCompatibility, masteryChecks, tacticalTags, cooldown, staminaCost, variationRules.
- `WorldEvent`: versioned schema from section 17, plus `requires`, `provides`, `schedule`, `fallbackRewards`, `eventSeed`.
- `OpponentMemory`: matchupId, observationCount, moveHistogram, exitBias, defenseReads, decayTime, counterCap, confidence, lastUpdatedEventId.
- `MatchRecord`: immutable record with profile owner, fighter, opponent, winner ID, judging breakdown, arena, seed, event ID and reward grant ID.
- `Academy`: founderProfileId, roomsOwned, coachAssignments, traineeRoster, gymTier, prestige, styleLineage.

### 23.3 Privacy and safety
Default local-first and no account requirement. Never ask for physical health details to play. Exercise suggestions are optional, nonmedical and age-appropriate. Sound, flash, camera shake and motion intensity adjustable. No gambling, real-money prizes, exploitative urgency, push-notification pressure, sleep disruption or punishment for breaks. Future user-made names and content require moderation, profanity filters, report workflows and privacy controls before sharing publicly. Avoid depicting real political conflict as a fight against entire nationality/ethnicity; use original fictional factions. Age gate and parental controls needed before user-generated online interaction.

### 23.4 Analytics (local-first, consent where applicable)
Track voluntary anonymized events: `hub_open`, `quick_start`, `training_complete`, `combo_unlocked`, `combo_equipped`, `shop_preview`, `purchase_success`, `refund_success`, `rival_mindshift`, `event_enter`, `story_choice`, `tournament_resume`, `session_exit`, `error`. Metrics: first meaningful action time, one-tap resume, crash-free sessions, tutorial completion, session length by mode, return quality (voluntary re-engagement rather than compulsion), percent unused unlocks, reward-sink balance, performance p50/p95 and player-reported fun. Define opt-out before remote telemetry.

## 24. Technical feasibility and exact release gates
### RELEASE A — Foundation + delight (implement first)
Preserve existing RingFighter combat animation, scores, audio, camera, controls and all game modes. Add local profile/username everywhere; stable match record; game shell Hub with Resume and 3-minute mission; XP/CR and ledger; 8 shop cosmetic offers (cloth/glove/wristwatch/belt appearances); unlock/equip 6 existing combos separately for training/fights; simple 3-fight offline tournament; 2 new original arena skins built from existing scene; deterministic one-page feed (no claimed external simulation). Acceptance: durable rewards, match record correctness, full core tests, 3-language UI, mobile UX and responsive design.

### RELEASE B — Intelligence + world relevance
Rival habit summaries and counter logic, bounded state transitions, 2 tactical rule templates, enemy style-specific reaction, 4 authored scenario packs including Neon Innovation and Stadium Fever, configurable JSON event packs and archive fallback, 2 gym equipment upgrades, tiered arenas and fair sidegrade gear. Acceptance: test sees rival counter behavior from match history but measurable failure probability; event pack validation and all locale strings pass; 5-minute player finds meaningful choice.

### RELEASE C — Creator + school
Full visual tactical builder with validated rule graph, 10+ combo recipes, per-species supported motions, 4 new characters only when art meets realistic quality, academy rooms, mentor slot, school rival team, 3-event story arc, Hall of Fame. Acceptance: no impossible chains; all gear fits; performance profile stable; narrative truth tests.

### RELEASE D — Community infrastructure (OPTIONAL; cannot work correctly as static-only)
User authentication, opt-in cloud save and merge, privacy policy, moderation, real asynchronous challenge exchange, server-authoritative scores and unlocks, account deletion, leaderboards, multiplayer event schedules, optional share links. Keep offline mode and no purchase requirements. Defer until hosting/security/moderation maintenance is funded and consented to.

### RELEASE E — Long-term evolving universe
Expanding dynamic seasonal narrative, school alliances, coach generations, user-created tactical challenges and rich world events, incremental 3D environment upgrades. No unlimited dynamic character generation until assets meet quality bar and mobile budget.

### 24.1 Exclusion register, reason, substitute
| Idea | Why not now | Credible substitute |
|---|---|---|
| Photoreal multiplayer city | Massive asset/server/performance scope | 2D world map + high-detail instanced scenes |
| Real celebrities as fighters | Personality/publicity/likeness/IP risk | Clearly original satirical archetypes, not look-alikes |
| Toy Story / Marvel characters | Licensing and character IP | New original animated-toy and clawed-animal archetypes |
| Real-world war-themed opponent factions | Harm, polarization, moderation risk | Fictional sporting nations/schools, respectful competition |
| Fully autonomous ML with constant online retraining | Cost, opacity, unpredictable quality | Deterministic utility AI, bounded tactical learning |
| Global rankings in local-only browser | Cheating and identity trust | Offline seasons and NPC ladders until backend |
| User-to-user asset sales | Fraud, moderation, economic abuse | Nontransferable, earned personal inventory |
| Massive realistic 3D character roster overnight | Rig, skinning, animation workload | 2–4 quality-controlled original characters per milestone |
| Passive offline currency farming | Clock abuse, unearned advantage | Bounded local progression and optional simulation summaries |

## 25. Delivery ticket backlog (self-executing specification for Codex)
| Ticket | Priority | Inputs and files to inspect | Expected deliverable | Verification |
|---|---|---|---|---|
| F-001 | P0 | `README.md`, `index.html`, current saves | Architecture snapshot + migration plan | Existing game unmodified and tests baseline |
| F-002 | P0 | Current career UI/storage | Local profile and username binding | Username all UI / score / history / fight outcome |
| F-003 | P0 | `boxing-fight.js` | Immutable match result event | Idempotent finalization tests |
| F-004 | P0 | Current achievements | XP/CR wallet ledger + economic constants | Atomic save / no negative balance |
| F-005 | P0 | existing combo library | Skill rewards, Training/Fight equip state | Locked vs equipped across reload |
| F-006 | P0 | existing canvas | World Hub, Resume/Quick Start, clean mode navigation | <=3-tap quick start; responsive phone |
| F-007 | P0 | existing model materials | Shop previews + 8 cosmetics | Both species, orbit, animation, shadows |
| F-008 | P0 | existing ring layouts | 2 original arena skins with venue IDs | All cameras/rotations, FPS comparison |
| F-009 | P1 | fight presets and scores | 3-match NPC tournament | Resume between matches; correct champion |
| F-010 | P1 | existing training scoring | 3-minute mission templates | Proper quality reward; pause/resume |
| F-011 | P1 | opponent behavior | Memory histogram + fair counter bias | Deterministic adaptation and weaknesses |
| F-012 | P1 | fight prep and between rounds | 2 Coach interventions / Architect templates | Actual action selection changes |
| F-013 | P1 | scene + config | JSON pack validation and 2 live-ops examples | No code updates for new event copy/rewards |
| F-014 | P1 | event log | Return digest and archive | Truthful summaries; 7/30-day tests |
| F-015 | P2 | gym and training | Upgrade station with unique drill | Asset+functional delta |
| F-016 | P2 | existing procedural model | New character prototype with parity bar | Rig, IK, phone rendering and test matrix |
| F-017 | P2 | combo+rule systems | Skill Fusion composer | Validity and counterplay tests |
| F-018 | P2 | career+history | Academy mentorship + legacy screen | Champion provenance, safe rollback |
| F-019 | P2 | all content | Three-language translations, RTL, accessibility | Locale snapshots, screen reader audit |
| F-020 | P2 | all tests | Performance automation and before/after review | Mobile 30 FPS fallback measured, no blanket claims |

### 25.1 Codex operating procedure
1. Create isolated branch/worktree. Record latest main SHA, open work, baseline current tests and actual screenshots. Other agents may be changing code; do not overwrite their files.
2. Read the existing engine (`index.html`, `boxing-coach-v2.js`, `boxing-fight.js`, `training-arena.js`, `career-*`, `boxing-routines.js`, storage modules and tests) and verify real APIs before touching implementation. **No invented paths or assumed React rewrite.**
3. Work ticket by ticket in priority order. For each: write state contract, implement with feature flags, add integration test, capture at least one real app screenshot, compare old/new behaviors and record exact files/commits.
4. Preserve offline statically hosted operation and avoid dependency on paid/cloud services. New licensed assets must have attribution/license in repository and be served locally.
5. Existing gameplay and realism work is a hard dependency: don't regress limb poses, glove contact, feet grounding, bag physics, ring crowd visibility or controls. New equipment requires animation testing and camera orbit.
6. Reject and document impossible features rather than silently stubbing them. In particular do not claim shared world/multiplayer/cloud sync without backend.
7. Before merging, run all existing tests and new scenario/migration tests; inspect screenshots at phone widths 390px and 430px plus desktop; profile rendering; review the current main ancestry and other active branches. Open PR with checklist and visual evidence. No force push or forced merge.
8. The master PRD is a product target. Implement phased scope; do not mark the entire game done after completing a UI facade.

## 26. Test and acceptance matrix (mandatory coverage)
| Test family | Cases | Expected result |
|---|---|---|
| Identity | Guest, rename, Unicode/RTL, duplicate names, two saved profiles | Correct username displayed, no overwritten fighter |
| Currency | Duplicate match event, simultaneous claim, refresh, interruption, insufficient CR, purchase & rollback | Exactly-once debit/grant, no negative wallet |
| Inventory | Glove, shoes, shorts, wristwatch, belt, unlocked vs purchased, both fighters | Correct geometry, ownership, no clipping |
| Combos | Training-only, Fight-only, Both, Vault, incompatibility, spam | Correct controls, points, no illegal clip |
| Competition | KO, TKO, draw, decision, interrupted/forfeit, spectator match | One winner record, consistent announcer/UI |
| World | 1/7/30-day return, timezone shift, offline and clock rollback | No asset loss, bounded events, no false claims |
| Current events | Disabled pack, expired pack, translated pack, stale asset, bad license tag | Safe reject/fallback; archived equivalent rewards |
| AI | Counter frequency, reaction delay, knowledge decay, rare style, rematch | Learns but is beatable and explainable |
| Academy | Recruiting, mentorship, retirement, school upgrade, no CR | No loss of legacy, clear blockers |
| Performance | low/medium/high tiers, small phone, slow GPU, memory leaks | 30fps fallback target and no runaway resources |
| Accessibility | RTL, Russian, font scaling, sound off, reduce motion, pause | Usable with no forced motion/sound |
| Integrity | Old saves migrated, recent main changes, broken model asset | Current user progress and combat survive |

## 27. Product review checklist and release criteria
**A: Emotional:** First 5 minutes deliver one win or useful loss, one player choice, one visible earned reward; user can explain why their next choice matters. **B: Mechanical:** Every reward has provenance; every gear stat has a trade-off; every adaptation has bounded counterplay. **C: Narrative:** All named opponents and events reference recorded states; no fake breaking news; every archived event offers equivalent long-term access. **D: Functional:** Save and restore for all purchasable/equippable items; player name everywhere; 3-language UI; no blank world screen. **E: Technical:** Existing render, combat, physics and audio regressions pass; scene performs on real phone tiers. **F: Commercial/Legal:** No payments, no advertisements required, no unlicensed famous likeness/characters/music/logos, no real-world inflammatory targeting. **G: Delivery:** User receives one working Git branch/PR per milestone, actual screenshots and test evidence, and exact rollback instructions.

## 28. Assumptions, choices and product risks
- **RISK R1 Scope:** Complete world/academy/backend at once will destabilize the current game. **Control:** M1/M2/M3 slices with acceptance gates.
- **RISK R2 Immersion vs phone performance:** attractive arena/character additions exceed GPU budget. **Control:** instancing, LOD, quality tiers, actual device measurements.
- **RISK R3 Progression balance:** power gear or repeat farming distorts competitive fairness. **Control:** trade-offs, standardized competitive stats, grant-once ledger.
- **RISK R4 Content timeliness:** events become stale or insensitive. **Control:** approved original JSON packs with expiry, editorial review, archive fallback.
- **RISK R5 Adaptive AI unfairness:** opponent reads player input with impossible reflexes. **Control:** observation-only history, lag and noise bounds, win-rate test seeds.
- **RISK R6 Unlicensed likeness:** popular franchises or celebrities create legal exposure. **Control:** original archetypes; licensed third-party content only under explicit signed rights.
- **RISK R7 Offline mismatch:** product implies online live world when actually local. **Control:** transparent "simulated world" labeling, no false time-based claims.
- **RISK R8 Retention pressure:** artificial scarcity or loss discourages healthy engagement. **Control:** archive, catch-up, no streak penalties, optional reminders, rest-friendly design.
- **OPEN DECISIONS (defaults chosen until owner changes):** Game name GLORY OF THE RING; player role Founder; free-only local-first; first release 2 existing species; original fictional city and sports-inspired events; one wallet CR; no mandatory account, no monetization; community deferred.

## 29. External implementation/reference links (nonmandatory reading)
- Three.js loaders and glTF: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js animation: https://threejs.org/docs/pages/AnimationMixer.html
- Unity on seasonal events (conceptual patterns, not a required Unity dependency): https://docs.unity.com/en-us/services/solutions/seasonal-events
- Unity 2026 developer report (illustrative industry context): https://unity.com/resources/gaming-report
- International Trademark Association — publicity rights overview: https://www.inta.org/topics/right-of-publicity/
- WIPO intellectual property and esports: https://www.wipo.int/edocs/pubdocs/en/wipo-pub-1085-26-en-intellectual-property-and-esports-an-overview-of-the-game.pdf

**FINAL PRODUCT RULE:** The game is *free forever*. Every meaningful progression reward, whether aesthetic or gameplay, can be earned entirely through play, fair challenges and skill. Every new feature should improve player agency or storytelling, not just increase grind. When in doubt, ship a small genuinely playable scenario rather than a large decorative noninteractive world.

## 30. V2 visual flow appendix — executable system semantics
Each chart is a product flow, not a screenshot of code already implemented. The seven baseline diagrams in Section 11 remain useful for the original progression and combat design. The following diagrams specify the expanded living-world and economy architecture.

### Player journey — from rookie to legacy
![Journey from rookie to founder to mentor](diagrams/01_full_player_journey.svg)

### The living core loop
![World hub through role, activity, proof, reward, equipment and world updates](diagrams/02_loop.svg)

### Free-only economy and earned rewards
![Verified actions and exactly-once ledger into XP credits mastery and reputation](diagrams/03_economy.svg)

### Rival learning and counterplay
![Fight observation leads to bounded memory, fair AI, rematch, player adaptation](diagrams/04_rival_evolution.svg)

### Shop transaction and inventory
![Catalog, preview, confirm, atomic purchase and equip with insufficient-credit path](diagrams/05_shop_states.svg)

### Current-events content pipeline
![Cultural theme, rights review, JSON event pack, validation, play and archive](diagrams/06_season_content_pipeline.svg)

### Phased build program
![Foundation, AI, creator academy, optional backend and expanding legacy](diagrams/07_release_plan.svg)


### Branding and trademark clearance (2026-11-08)
**Public-facing working title:** **Glory of the Ring**. **Internal project/repository ID:** `FIT` / `ytcat/fit` — retain for compatibility; no codebase rename is implied. Preliminary public-web screening found no verified exact-title game, but **this is not formal trademark clearance**. The GLORY combat-sports brand and other similar marks warrant professional similarity-based review, including US, EU and Israel, Classes 9 and 41. Do not claim the brand is registered, trademark-safe or available for launch.


---
## VERSION HANDOFF — V2
**Current title:** Glory of the Ring. **Canonical source:** `FIT_MASTER_PRD_V2.md`.
**Game source (confirmed repository):** https://github.com/ytcat/fit
**Live app:** https://ytcat.github.io/fit/?build=28f959b — verified R2 Pages run 42498491497, runtime 8395988, published commit 28f959b. See [R2 acceptance](../../game/R2-acceptance.md). Remaining Release A–E items are pending.
**Next specification:** Version 3 — not created yet. Create `../V3/GLORY_OF_THE_RING_PRD_V3.md` only after reviewing V2 gaps and current code, then replace this text with a working relative link.
**Execution handoff:** Preserve all validated features and existing character/motion quality; report exactly what was implemented, what is only proposed, the commit/PR, tests, screenshots, and next executable milestone. Continue via the linked next PRD only after current milestone acceptance. Never imply incomplete features are live.