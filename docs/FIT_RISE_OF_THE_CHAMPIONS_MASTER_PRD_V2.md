# FIT: RISE OF THE CHAMPIONS
## Epic Product Requirements Document | Product vision + end-to-end player journey + full game systems
**Status:** Proposed master design, not implemented; includes November 2026 V2 expansion. **Version:** 2.0 | **Date:** 8 November 2026 | **Platforms:** Mobile web and desktop web | **Repository:** `ytcat/fit`

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

**V1 BASE SPECIFICATION COMPLETE — EXTENDED BY V2 SECTIONS BELOW**


---
# V2 EXPANSION — THE LIVING SCHOOL, VIRTUAL ECONOMY & CULTURAL EVENTS
**Version 2.0 | 8 November 2026 | Design status: proposed, not implemented | Product: FIT / Rise of the Champions**

## 14. Final creative thesis and business constraints
**The new game:** The player is the founder of a fighting school, the creator of a distinctive fighting philosophy, and the owner of fighters who practice and develop that philosophy. Realistic boxing is the expressive simulation layer. Player decisions are the game. The school, fighter relationships, tactical inventions, world news, tournaments, reputation, equipment and history form one connected progression system. This is a **free, accessible, replayable, phone-first game**: no real-money purchases, ads required to progress, paywalls, loot boxes, purchasable coins, pay-to-win subscriptions, cash-out or gambling.

**One-sentence pitch:** *Create a fighting school, invent combinations, raise champions, outsmart rivals who learn your moves, and shape an ever-changing boxing world—all through the choices you make, whether you play for three minutes or three hours.*

**Differentiator:** Fighting is not merely a high-score event. A fight creates knowledge; knowledge produces new choices; choices build a school's identity; rivals react to that identity; the world creates another story. What the player **invents and changes** is more important than grinding levels.

**Engagement ethics:** Encourage return through curiosity and creative projects, not artificial anxiety, mandatory streaks, sleep loss, punitive absence, unpredictable loot-box gambling, or time-limited purchases. Every short session provides completion; every long session offers depth. A missed week yields a catch-up digest and opportunities, not destruction of progress. Player controls all notifications and can pause any offline content.

**Hard constraints from owner:** (a) entirely free forever with in-game soft currency only; (b) usernames on all fights, awards and history, e.g. `PlayerName (Lion)` vs `Shadow (Rabbit)`; (c) lion/rabbit and current modes remain; (d) earned combos independently assigned to Fight and Training; (e) fully customizable gear including gloves, pants, boots, championship belts, optional wrist accessories, costumes and arenas; (f) recognizable cultural flavor, humor and topical events without unauthorized branded/copyrighted IP; (g) implementation must be incremental and preserve current app quality, mobile rendering and simultaneous development work; (h) no paid cloud or costly required infrastructure for initial releases.

### 14.1 Success tests for differentiated gameplay
1. In a 3-minute visit, user can make a meaningful strategic choice, complete one mini-objective, and save the result.
2. Two players with equivalent levels but different strategy/gear choices see genuinely different matches or gyms.
3. An NPC rematch uses observable prior history with a comprehensible counter and a fair counter-counter.
4. The user's invented combo/style acquires a persistent name and visible history (usage, successes, counters).
5. The game remains interesting if the user chooses **Coach** or **Architect** and never directly taps punches.
6. After seven days offline, the user's progress remains intact, and the feed shows a digest of **deterministically simulated or previously recorded** developments, never made-up claims of real network events.
7. The first hour contains at least one exciting choice not reducible to increasing damage stats.
8. The interface clearly distinguishes fictional in-game current events from actual news, real players, real competitions, or licensed celebrities.

## 15. Detailed gameplay sessions and return structure
| Session intent | Target duration | Immediate entry point | Primary actions | Real progress | Exit/resume |
|---|---|---|---|---|---|
| Micro visit | 60–180 sec | World > Quick action | Claim earned reward, test combo, change gear, scout one rival, do 45s counter trial | One completed objective or choice | Autosave after each valid change |
| Coffee break | 3–7 min | Continue card | 60-second match or timed drill, first round strategy, one purchase | XP/coins/mastery, match history | Results persisted atomically |
| Daily leisure | 10–20 min | Personalized story | 2 fights, 1 training, unlock a rule, gym upgrade | Rival memory, new skill, venue eligibility | Save hub state, no unfinished XP duplication |
| Deep session | 30–90 min | Tournament / club | Multi-round tournament, coach strategy, academy, replay and creator | Season ladder, character arc | Checkpoints after each match and round |
| Extended creativity | 1–3 h | Lab / Academy | Design, test, analyze, rebuild strategies; academy and team tournaments | Style library, school reputation, mentor history | Every edit versioned; no lost progress |
| Return after week | 2–10 min | Welcome-back digest | Review 3 developments; pick 1 opportunity; select short or deep activity | Catch-up quest offers optional | Dismiss digest, no penalty |

**Session resume contract:** App state must retain last navigation context, last valid match checkpoint, active fighter/loadout, unfinished local challenge, unclaimed deterministic reward IDs. On reopening, choose `Resume` / `Quick action` / `World`. Never auto-launch a long tutorial. Pausing and closing should not cause player loss in offline events.

## 16. Player school ownership: the new game centerpiece
**School entity:** A player names their school, chooses emblem/color theme and selects its initial philosophy. First choice creates flavor, not permanent penalty.

**Founding styles** (all unlock alternative schools later):
- **Iron Guard** — protect centerline, counter on opponent commitment; tradeoff: lower offensive tempo.
- **Lightning Steps** — evasive angles, jabs and rapid exits; tradeoff: stamina under repeated transitions.
- **Pressure Forge** — range control and combinations; tradeoff: vulnerability to lateral movement.
- **Precision Lab** — timing and counterpoint accuracy; tradeoff: harder to execute consistently.

**School growth:** name + founder story → starter gym → tactic desk → specialist trainer → 2nd fighter → local league → school rivalry → district championship → tactical laboratory → pro academy → world school championship → Hall of Legacy. The school has reputation, trophy case, tech collection, training facilities, recruit roster, rival relationships, curriculum and historical named tactics. The school does not physically evolve when app is closed unless replayable simulation rules are advanced on return or the backend later authoritatively records events.

**School signature:** At mastery threshold, player can promote one fully validated tactical chain to a `Signature`. It is displayed under player's username, can be given a short safe name, and can accrue matches, successful uses and defeats. Opponents may develop counters from encounter evidence. The player may refine (version) a signature; past versions remain in history. No fake genetic mutation claim: this is game-rule adaptation from observed events.

**School rivalries:** A persistent rival school may poach a fictional NPC (story branch only, never remove an owned/paid item), copy a visible tactic, challenge for a title, recruit a former opponent, or propose collaboration. Players select among 2–3 meaningful responses; each changes reputation, relationship or access to an event. All story events have expiry-free alternatives for returning players.

## 17. Fully virtual economy: XP, coins, reputation, mastery, trophies
### 17.1 Currency policy
- **XP** = profile career experience, awarded for completed verified activities; cannot be spent.
- **Coins** = only *spendable* currency; earned through play and spent in cosmetics, gym facilities, equipment and selected technique workshop actions. No purchase with real money, no paid boosts, no premium currency.
- **Mastery** = per technique and fighter proficiency progress, never transferable as spendable coins.
- **Reputation** = school standing used to unlock venues, divisions and invitations; cannot be bought.
- **Trophies/Titles** = achievement records; cannot be bought. **Championship belts sold in shop are cosmetic belt styles**, while official earned title belts and title ownership remain earned only.

**Suggested initial numerical economy — BALANCING PLACEHOLDERS; tune with playtests:**
| Verified action | XP | Coins | Guardrails |
|---|---:|---:|---|
| 45–90 sec completed training | 40–65 | 15–25 | Valid target/time/form criteria; time capped |
| 3–5 min completed drill | 85–125 | 35–55 | First valid completion higher than repeat |
| Quick exhibition (60s) | 60–95 | 25–45 | Defeat still gives fair participation XP |
| Standard full fight | 120–180 | 55–85 | Rewards tied to match quality and activity |
| Clean technique mastery milestone | 80–150 | 30–60 | One time per milestone per fighter |
| First verified rival rematch objective | 140–220 | 65–100 | One time per defined rival quest |
| Local tournament progression | 150–260 | 80–120 | Per distinct bracket completion |
| Tournament title | 250–450 | 120–240 | One time per title tier; repeat reduced |
| School chapter / key story decision | 80–200 | 25–80 | Narrative choices do not require winning |

**Example formula:** `reward = baseReward × participationFactor × objectiveQualityFactor × repetitionFactor`, then clamp to `[minimum, maximum]` for a completed activity. ParticipationFactor ∈ [0.7,1.0]; quality ∈ [0.8,1.25]; repetition ∈ [0.45,1.0] for repeated identical short drills. Maximum combo bonus: **+20% of activity coins and +15% mastery progress**, only once per uniquely valid chain execution with a cooldown and verified contacts; not stacked recursively. Never punish physical limitations or force strenuous intensity; training objectives should have adaptable difficulty.

**Economy integrity:** Every reward references activity ID + event ID + source rule version. Atomic ledger records `earn` and `spend`; balances are derived, never mutated directly by UI. One-time milestones have globally unique keys. Cancelled/disconnected match earns only safe partial participation if anti-exploit checks pass. User can inspect purchase history and undo equipment equips (not necessarily spent purchases). Offline save backups and corruption recovery required.

### 17.2 Shop examples — starting catalog, all fictional and free-currency
| Category | Sample item | Coins | Benefit | Power in ranked play |
|---|---|---:|---|---|
| Gloves | Basic red gloves | 0 | Default look, starter rig | Baseline |
| Gloves | Midnight leather | 150 | Color/material | None |
| Gloves | Pro Impact gloves | 450 | Unlock advanced heavy-bag impact feedback/drill challenge | Competitive stats normalized |
| Gloves | Lightning Wraps | 650 | +5% drill timing-score ceiling in *eligible training missions*, matched difficulty | No ranked bonus |
| Pants | Street Club shorts | 100 | Cosmetic color/set | None |
| Pants | Champion satin trunks | 500 | Cosmetic, unlocks intro pose | None |
| Shoes | Pivot Pro boots | 400 | Unlock footwork clinic and visual pivot flair | No ranked speed advantage |
| Shoes | Velocity boots | 700 | Training-specific agility challenge and practice feedback | No ranked speed advantage |
| Belt | Gold champion fashion belt | 350 | Cosmetic outfit/trunk accessory | None; not an official title |
| Belt | Regional Title Belt | Earned | Display true achievement | No stat |
| Wrist | Bronze milestone watch | 200 | Profile/accessory, small timekeeping animation | None |
| Wrist | Legend timepiece | 1200 | High-level vanity collectible | None |
| Gym | Focus mitt station | 250 | Unlock pad accuracy exercises | N/A |
| Gym | Speed bag rig | 450 | Unlock speed bag progression | N/A |
| Gym | Tactical analysis screen | 850 | Unlock richer battle review/Architect tutorials | N/A |
| Gym | Pro training ring | 1500 | New gym venue + training missions | N/A |
| Arena | Neon Rooftop event permit | 500 | Offline exhibition appearance/mission access | No ranked advantage |
| Arena | Vegas-inspired Strip Showcase | 1200 | Non-branded fictional venue theme | No ranked advantage |
| Character | Wolf fighter contract | 1800 or story unlock | New archetype, new mastery track | Balanced |
| Combo | Advanced Counter Chain | Earned through skill gate | New tactical option | Has stamina/telegraph/counters |

**Mandatory distinction:** *Power fantasy without pay-to-win*. Equipment may visibly improve training, broaden possible moves, enhance feedback or add risk/reward in unranked arcade challenges. PvP/ranked (once backend exists) normalizes raw power and speed, and cosmetic outfits never convey hidden hitboxes or frame advantages. Unranked gear modifiers must show exact tradeoffs (e.g. +5% heavy-bag score window vs 8% stamina consumption) and be disabled for official record competition.

### 17.3 Purchase and reward flow
1. Open Store → choose item → inspect model preview on selected fighter, category, compatibility, price and precise effect.
2. If affordable → confirm single-click purchase (no pressure timer) → emit `purchase_requested` with transaction key → ledger debit+inventory award as one atomic operation → equip now / later.
3. If insufficient coins → show explicit legitimate earning routes (quick drill, tournament, mastery), no real-money button.
4. If item incompatible → preview only, explain which character/slot works. Never deduct coins.
5. If item already owned → show Equip rather than Buy; duplicate purchase rejected.
6. Offline crash during commit → idempotent transaction replay, no lost item, no double charge.
7. Display a rewards path: `Play -> Earn Coins -> Preview -> Buy -> Equip -> Visible Change -> New Challenge`.

## 18. Unlock, collect and equip: full rules
**Equip surfaces:** `training`, `fight`, `coach-deck` (for tactical rules), `presentation` (belt/outfit/intro), `gym` (facility), `arena` (cosmetic venue or story event). A combo has separate boolean equip status for Training and Fight plus `mastery`, `weight/stamina`, `compatibleFighterArchetypes`, `allowedModes`, `comboVersion` and `unlockSource`. A new technique can be claimed but not automatically forced into the player's loadout.

**Slot plan (initial):** 3 active Fight combos, 5 Training combos, 4 reactive Coach tactics. Additional slots unlock gradually, but all players retain competitive counterplay. Slot swaps allowed outside live rounds; between rounds can change 1 tactic if coach opportunity is unlocked. In-game direct combo buttons must remain accessible and legible on phone; optional quick-wheel or one-tap favorite actions.

**Loot/rewards:** deterministic reward track or transparent explicit achievement prizes; no random premium rarity with concealed probabilities. Titles are never sold as earned achievements. Cosmetic rarity can represent chapter difficulty, but should have a nonrandom earn route.

**Combos (illustrative):**
| ID | Name | Inputs | Unlock | Mastery use | Tradeoff |
|---|---|---|---|---|---|
| C01 | First Rhythm | Jab → Cross | Intro chapter | Timing and straight guard | Predictable on repeat |
| C02 | Corner Turn | Jab → Lead Hook → Pivot | Footwork challenge | Exit-angle control | Stamina, pivot window |
| C03 | Lion's Trap | Slip → Body Hook → Step out | Rival-counter quest | Reads incoming jab | Wrong read vulnerable |
| C04 | Thunder Arc | Cross → Lead Hook → Rear Uppercut | Specialist tournament | Multi-range transitions | Long commitment |
| C05 | Phantom Return | Step out → Cross counter | Defensive mastery | Distance judgment | Counter can miss |
| C06 | Broken Rhythm | Jab pause → Jab → Cross | Timing lab | Beat variation | Exposed pause |
| C07 | Guardian Wall | Guard → Parry → Jab counter | Three successful defenses | Reaction precision | Lower burst damage |
| C08 | Final Bell | Slip → Cross → Hook → Exit | Final championship trial | Advanced strategic chain | Higher stamina / difficulty |

**Unlock scenario (exact):** Player wins one challenge, sees reward summary → receives C03 as **owned / not equipped** → inspects animated preview → chooses `Training` only / `Fight` only / `Both` / `Save` → app checks compatibility and slot limits → confirms result → update current mode HUD after safe transition → next valid use contributes mastery and rewards → rivals may eventually identify repeated sequence from evidence → player can swap or evolve tactic.

## 19. Contemporaneous world: safe, recognizable, easy to ship
### 19.1 Live-culture design philosophy
Player should recognize the *vibe* of current life: internet fame, short-video challenges, livestream tournaments, AI-made tactical rivals, public debates about robots and tech, city trends, game-release excitement, clothing/sneaker culture, sports championship culture and playful satirical personalities. Do not build core functionality around a specific headline, election, movie release, named celebrity, trademark or real-world conflict. Keep all event gameplay mechanically self-contained and age-appropriate.

**Design rule:** `Familiar cultural pattern + original character + original environment + short mechanic + limited content cost`. Example: a billionaire-like tech founder character must be clearly original and not impersonate or misuse Elon Musk; a presidential debate challenge can feature fictional mascots rather than an identifiable real-world politician. Do not copy movie/cartoon superheroes or game characters (Toy Story, Wolverine etc.) without license. Avoid ethnic/nationality-as-enemy framing or geopolitical mock combat with protected groups; use fictional teams, robots, schools or national-neutral competitions instead. Real people, if ever featured, require legal/rights review and an accurate, clearly fictional satirical context.

### 19.2 Event catalog — evergreen topical templates
| Code | Event name | Recognizable contemporary vibe | 3-minute hook | Deep-play branch | Production scope |
|---|---|---|---|---|---|
| E01 | Viral Combo Challenge | Short-form video trends | Recreate 3-beat original combo | Design remix and leaderboard later | UI + challenge rules |
| E02 | AI Coach Invitational | AI tools in daily life | Defeat strategy-explaining bot | Teach the bot a counter strategy | Reuse rival AI + cosmetics |
| E03 | Tech Tycoon Exhibition | Technology celebrity culture | Fight fictional showman `Mr. Circuit` | Corporate-style sponsored league *within fiction* | Re-skin existing opponent |
| E04 | The Great Debate | Big political TV debates without real politicians | Win rhythm-based 'argument/counter' combo quiz-fight | Rival schools choose competing tactics | Copywriting + match rules |
| E05 | Space Training Week | Rocket/space news | Low-light 'orbital' gym drill (normal physics) | Zero-distraction precision tournament | Arena skybox + drill |
| E06 | City Lights Championship | Vegas and live-event energy | One-minute televised-style final | Bracket, intros, awards | Arena lighting + UI |
| E07 | Sneaker Culture Drop | Collectible shoes | Complete footwork mission for original boot color | Multi-stage shoe craft | Texture palette + shop |
| E08 | Animation Festival | Animated movie excitement (no protected character) | Face original clockwork toy champion | Three unique 'toy-box' drills | Original character/texture |
| E09 | Retro Arcade Night | Nostalgic gaming | Beat 8-bit themed score mission | Boss gauntlet | Filter optional + HUD |
| E10 | Fitness Creator Battle | Online creator competition | Coach a scripted influencer NPC | Community-created challenge later | NPC dialogue + match |
| E11 | Robot vs Instinct | Robotics and automation | Outsmart predictable mechanical boxer | Adaptive robot responds next round | Low-risk custom geometry |
| E12 | World Street Style Cup | Global urban culture | Gear-style challenge plus skill score | Multiple original fictional districts | Venue decals + cosmetics |

**Do NOT** claim actual official partnerships with cities, studios, celebrities or sports bodies. A real geographic city like Las Vegas can be named when accurate, but design must not include copied casino/trademarks/venue identities. For low engineering cost, ship E01/E02/E06/E07 first; leave E08/E11 original character art until a high-quality rig can be produced.

### 19.3 Content-as-data, not continual programming
An `event-pack.json` registry describes story copy, locales, asset references, start/end dates (optional), eligibility, rule template, original character ID, reward cap, cooldown, offline behavior and content review status. Pack activation should not require code changes if only it uses allowlisted primitives. Do not load executable code, remote HTML or user-provided JS from packs. Localize EN/HE/RU. For 'fresh' world feeling without server, rotate a **curated evergreen pool** by season and deterministic seed. If web-backed news/events added later, editorial approval / fact checks / licensing are mandatory; never programmatically turn breaking political violence or war into player-vs-nationality boxing.

**Event record example:**
```json
{
  "eventId": "E02_AI_COACH_INVITATIONAL_01",
  "contentVersion": 1,
  "titleKey": "events.aiCoach.title",
  "ruleTemplate": "COUNTER_THREE_CLEAN",
  "arenaId": "ARENA_NEON_CITY",
  "opponentId": "NPC_COACH_CIRCUIT",
  "durationSeconds": 75,
  "prerequisites": {"chapterAtLeast": 3},
  "reward": {"xp": 90, "coins": 40, "onceKey": "E02_FIRST_WIN"},
  "availability": {"mode": "EVERGREEN_ROTATION"},
  "rightsStatus": "ORIGINAL_CONTENT_APPROVED",
  "offlinePlayable": true
}
```
Reject unknown rule templates, duplicate IDs, missing localization, nonexistent assets, negative rewards, invalid prerequisites, and unauthorized/real-world impersonation content. Build a pack linter and tests.

### 19.4 Event authoring workflow
Pitch → match cultural pattern to original fictional form → legal/brand/safety/content checklist → choose existing template → create art/audio assets → localization EN/HE/RU → pack schema validation → performance checks → editorial approval → publish in registry → track engagement (local privacy-preserving metrics at first) → retire/archive without deleting previously earned rewards. The world feed should explain **why this is showing**: e.g., "You mastered three counters; the AI Coach invites you."

## 20. Living world director, offline simulation and missed-week return
### 20.1 World clock
Separate clocks: wall time for display only, simulation ticks for offline events, competitive match time for fights. Offline single-player simulation should be **bounded**: on next launch, compute capped changes based on saved `lastWorldTick`, deterministic seed and event rules. Maximum 7 days of lightweight NPC-school progression per return; after longer inactivity, provide one summarized catch-up event. Simulation never deletes items, spends coins, penalizes health or stages unseen real-player fights. It may increase an NPC's fictional style mastery a small bounded amount, add a story invitation, rotate exhibition availability and update fictional standings *marked simulated*.

### 20.2 World feed prioritization
Each card gets novelty, player relevance, actionable reward, diversity and fatigue score. Show max 3 high-value cards on launch plus optional 'More'. Avoid fake urgency, countdowns for purchased items, and forced notification permission. Cards should include: cause, what's new, optional choice, expected benefit and dismiss action. Event priority: unfinished choice > owned reward pending equip > rival adaptation > new original culture event > gym upgrade > generic competition. Never show a locked or already completed card as a new surprise.

### 20.3 Return after seven days: canonical scenario
1. Player returns after 7 days. Screen says **Welcome back, [username]**, shows previous progress safely saved.
2. World engine advances at most bounded simulated ticks. The rival `Shadow` may have practiced one counter based on the player's *previous recorded tactics*, clearly attributed to in-world simulation.
3. Feed includes `Shadow developed a defense against Lion's Trap`, `Your tactical desk is ready` (if the player earned it), and `City Lights Showcase is available` (curated event).
4. Player selects `Quick 2-minute counter test` or `Full rematch` or `Later`.
5. If player chooses quick test, one challenge resolves and award ledger updates; player exits immediately.
6. If player chooses rematch, opponent counters favored exit at a bounded frequency; player can change combo and win through skill.
7. If no history or data insufficient, feed shows neutral starter missions rather than fake rival learning.
8. No missed streak, lost season badge, expiring unrecoverable item or hostile notification.

## 21. Story arcs, dramatic twists and scenario generator
### 21.1 Arc recipe (deterministic, templated)
`Act 1: introduction -> Act 2: player choice -> Act 3: validated consequence -> Act 4: new dilemma -> Act 5: climax -> Act 6: permanent story record`. Choose from authored arcs, not uncontrolled generative AI or costly server inference.

**Arc 1 — The Copycat:** An NPC school observes repeated favorite technique → competitor adopts a weak imitation → player decides to patent in-world as signature, teach a teammate or keep it secret → a tournament rewards inventiveness or counters. **Branches:** low pattern-confidence means event not offered; player can ignore; rival must remain beatable.

**Arc 2 — The Defector:** Fictional coach asks to join a rival school → player offers a different mentorship path or allows departure → NPC creates new in-world rival. Never remove a purchased/earned fighter from inventory. **Branches:** player has no coach; choose replacement story.

**Arc 3 — The Unbeatable Defender:** A defensive specialist challenges the player's school → direct KO isn't the objective → player develops a three-counter pattern → unlocks a defense-focused combo fragment. **Branches:** player prefers watch mode, selects coach-driven version.

**Arc 4 — The Founder Tournament:** Three schools with conflicting philosophies compete in a school-cup bracket → player assigns specialist fighters → tactical loadout before each match → alumni return as opponents → founder's legacy certificate and academy permit. **Branches:** not enough fighters → loaned balanced NPC roster.

**Arc 5 — The Secret Gym:** Training rumor appears after mastery milestone → do a puzzle of footwork and timing → discover hidden original facility → decide whether to reveal its lesson to rivals → changes later AI counter meta. **Branches:** no fatigue/medical intensity gates; alternative puzzle route.

**Arc 6 — The Comeback:** Player loses title → rival taunts fictionally → coaching report highlights actual mistake → choose new drill or tactic → rematch optional → historic rivalry record includes outcome. **Branches:** repeated losses unlock an adaptive assisted challenge instead of punishing loop.

**Arc 7 — The Broadcast Night:** Fictional streaming host announces surprising challenge rules → choose a short broadcast-style fight → crowd reacts to actual action → unlock original gloves/costume if successful. **Branches:** reduced-motion/crowd options and muted-audio mode supported.

**Arc 8 — Generations:** Champion voluntarily becomes mentor → new trainee inherits a capped tactic fragment, not raw dominant stats → rookie championship → school Hall of Legacy archives both histories. **Branches:** player keeps champion active; mentor status reversible with clear consequences.

### 21.2 Scenario template schema
Each scenario must define `entry conditions`, `narrative context`, `player choice`, `objective`, `fight rule`, `AI archetype`, `equipment constraints`, `reward`, `exit state`, `replay variation`, `failure recovery`, `offline behavior`, `accessibility variant`, `telemetry/test oracle` and `content ratings`. All scenarios need at least 2 choices with meaningful consequences; avoid 'choose red button or blue button' cosmetic nonchoices presented as deep strategy.

## 22. UI/UX detailed screens, feedback and art direction
**Visual language:** premium, contemporary boxing broadcast aesthetic with deep navy/charcoal, controlled gold accents for earned achievements, neon secondary events, high-contrast typography. Character rendering has priority over overlays; never obscure gloves, faces, opponent or lower-body movement. Illustrative generated posters are moodboards only, not implementation screenshots or claim of current fidelity.

### 22.1 New screens required in V2 (extend S01–S24)
| ID | Screen | Main UI | Interaction | Validation / edge case |
|---|---|---|---|---|
| S25 | School Founding | School name, crest, fighting philosophy | Choose + create | Profanity filter / offline safe |
| S26 | Academy World Map | Locations, divisions, new challenges | Explore node | No fake live rankings |
| S27 | Store | Category tabs, virtual coin balance, 3D previews | Inspect, buy, equip | No real currency/payments |
| S28 | Locker / Outfit Studio | Fighter rotatable model, gloves, shoes, belt, pants | Preview outfits | Clipping and performance tests |
| S29 | Daily Choice Deck | Max 3 suggestions ranked by relevance | Act / dismiss | No streak punishment |
| S30 | School Dashboard | Philosophy, facilities, roster, records | Upgrade/recruit | Ledger consistency |
| S31 | Signature Workshop | Fragment graph, stamina risk, combo name | Build/test/version | No physically impossible animation |
| S32 | Cultural Event Lobby | Fictional event poster, objective, venue, eligibility | Start/preview | Expiry-free alternatives |
| S33 | Rival Intel Report | Evidence, observed move frequencies, counter hint | Plan/tune fighter | Missing sample disclosure |
| S34 | Legacy Timeline | Named highlights, titles, rival histories | Replay/export | Deleted account behavior |
| S35 | Back After Break | 3 grounded developments + resume options | Quick action/full | No fake online updates |
| S36 | Season Recap | Earned scores, school evolution and upcoming goals | Review/share image | No fabricated statistics |

### 22.2 Screen-by-screen top three design goals
- **World Hub:** personalized but uncluttered; three actionable cards max; one-tap quick match; small visual school progress.
- **Store:** currency clear, differences cosmetic/functional visible, no purchase surprises; compare equipped vs preview outfit.
- **Match:** `Username (species)` vs `Opponent Name (species)` with scoring matching real model; after each special hit clearly show reactions without screen-filling UX effects.
- **Result:** battle performance + reward ledger + choice: `Rematch` / `Equip reward` / `Go to School`; no forced ads.
- **Lab:** manipulate 2–5 tactic blocks; preview as animations; invalid chain explained; don't show complicated code.
- **Return:** show three meaningful changes and a dismissible summary, with `2-minute activity` prominently available.

### 22.3 High-level screen prototype contracts
**World Hub**: top-left username & school title, top-right soft coin count; center one large 'Continue Your Story' card with rival/quest; below: `Quick Fight`, `Training`, `Tactics`, `My School`, `Store`; bottom persistent tabs. **Store**: sticky coin balance, categories, gear preview on selected rig, effect description, buy/owned state; confirmation with before/after. **Between-Rounds Coach**: 3 safe tactical options e.g. defend head, pressure body, change exit side with explainable predicted tradeoffs; apply for next round only. **World Event**: poster, why recommended, objective, duration, reward, original-fictional disclosure, one-button start. **Legacy**: chronological highlight reel with earned items and named fighter stories.

## 23. Technical integration with existing ytcat/fit codebase
**Current architecture as inspected earlier (time-specific):** static `0 script-heavy Three.js r128 WebGL application, custom lion/rabbit procedural/rigged models, `0boxing-coach-v2.js`0, `0boxing-fight.js`0, `0boxing-input.js`0, `0avatar-anatomy.js`0, `0contact-response.js`0, `0training-arena.js`0, `0career-progress.js`0, `0career-drills.js`0, `0character-roster.js`0, `0club-world.js`0, `0club-interface.js`0 and existing tests/QA. This is a preliminary repository snapshot; Codex MUST read current main before editing. Avoid replacing current engine with an unverified framework or costly new backend.

### 23.1 Bounded module plan — illustrative file names
| Module | Responsibility | No-go boundaries |
|---|---|---|
| `game-profile.js` | Username, local profile ID, selected fighter and school | No fight scoring code |
| `game-activity-events.js` | Validate core matches, drills, contact counts | No UI mutation |
| `game-ledger.js` | Atomic coins/XP earned and spent, purchase IDs | No random reward rolls |
| `game-inventory.js` | Ownership, equip, compatibility and slots | No direct coin mutation |
| `game-catalog.js` | Versioned original items/combos/venues | No remote executable content |
| `game-school.js` | Facilities, styles, roster, school reputation | No reimplementation of combat |
| `game-world-director.js` | Offline deterministic event selection, capped world advance | No fabricated true-live activity |
| `game-rival-memory.js` | Observational behavior profiles | No instantaneous perfect predictions |
| `game-tactics.js` | Evaluate rule decks from observable combat context | No uncontrolled AI claims |
| `game-story-arcs.js` | Versioned branching scenario states | No destructive arbitrary outcomes |
| `game-event-packs.js` | Validate allowlisted event data and localization | No JS eval/dynamic injection |
| `game-shell.js` | Hub/store/screens/navigation and overlays | No engine rewrite |
| `game-save.js` | Versioned migrations, backup, export/import | No implicit cross-device sync |

### 23.2 Runtime event pipeline
1. Existing combat emits `match.completed` / `training.completed` with unique match ID, raw round outcomes, countable valid hit IDs, result and seeded validation record.
2. `game-activity-events` checks event authenticity, shape, version and duplication. It must never trust text shown in HUD as evidence.
3. `game-ledger` calculates rewards using versioned deterministic rules and stores transaction atomically.
4. `game-inventory` applies unlock or purchases in same commit boundary; `game-school` updates reputation and eligible rooms; `game-rival-memory` consumes battle observation record.
5. `game-world-director` selects eligible events and next story decisions with seeded fairness and diversity.
6. `game-shell` renders responsive results/feed/store; no game state created by animation confetti.

### 23.3 Storage contract and migrations
Versioned envelope: `{schemaVersion, profile, school, fighters, inventory, loadouts, ledger, matches, rivals, world, arcs, settings, lastSavedAt, checksum}`. Where web storage limits may be exceeded, use IndexedDB and migrate old localStorage safely; store models/large media in versioned static assets, not save blobs. Use crash-resistant double-buffer snapshots or transaction log. Export/import JSON includes schemaVersion; validate size and data integrity before accepting imports. Always protect user saves from incompatible migrations, and offer backup download. UI must state local-only persistence clearly.

### 23.4 Performance and device policy
Initial releases static/offline on phone + PC; no required live server. Prefer asset reuse and color/material variants over brand-new high-poly characters. Avoid active new full-body physics engine during game feature builds. New outfit layers must skin correctly and not clip; throttle crowd effects and shader extras. Test iPhone Safari, Android Chrome and desktop browsers where devices are actually available; don't claim tests absent hardware. Target sustained 30 FPS on lower-end supported devices and 60 FPS on newer devices as aspirations pending measurement. New screen transitions under ~250ms when possible; never block quick fight with heavy asset preloading.

### 23.5 Backend only if actually required
Local simulated leagues, NPC rival memory, event rotation, single-player academy and content catalog work offline. Real cross-device accounts, true live player markets, shared UGC, verified worldwide leaderboard and asynchronously deployed worldwide world changes require authentication, authoritative server, secure storage and moderation. **Do not promise these in offline M1–M3**. Alternative now: local AI-only school tournaments clearly labeled simulated.

## 24. Detailed QA, acceptance and failure catalogue
| Scenario | Expected acceptance | Failure case tested |
|---|---|---|
| New player enters username | Display exact username on result, fight HUD and saved history | Empty/long/RTL username, profile switch |
| Earn first combo | Owned but not automatically equipped; choose Train/Fight/both/save | Crash/reload between claim/equip |
| Equip combo in Fight | Shows usable only when prerequisites met | Slot full, incompatible fighter, no animation |
| Equip combo in Training | Score only for validated completion; bonuses capped | Button spam, replay exploit |
| Buy red gloves with coins | One atomic debit; new material on current rig | Repeated tap, offline crash, insufficient coins |
| Acquire earned title | Official belt remains achievement-only; cosmetic alternatives can be bought | Buy cosmetic belt without title but UI says champion |
| Switch lion to rabbit | Gear and combo compatibility rechecked without losing ownership | Outfit mesh clip, wrong rig hand |
| Shop shows speed shoes | Exact mode-specific effects shown; no ranked raw speed advantage | Unexplained stat advantage |
| Choose Vegas-inspired arena | Fictional, non-branded venue loads smoothly | Copyrighted logos, huge frame-rate drop |
| Complete rival fight | Match history and observed tactics update once | Duplicate impact or repeated result grant |
| Rematch after counter learned | Rival visibly counters previously observed habit; counterplay exists | Sample size too small, AI perfect defense |
| Return after 7 days | 3 grounded summary cards, zero lost items, 2-minute option | Changed device time; no saved history |
| Event pack import | Schema, localization, rights status, templates checked | Malformed JSON, unsafe labels, executable content |
| Publish private challenge | Local challenge saved with valid rule and reward cap | Impossible win condition |
| Resume after forced browser close | Completed valid items persist; paused fight resumable | Duplicate XP/coins |
| Turn off effects/sound | Game fully playable and legible | Screen shake despite reduced motion |
| Play/Coach/Architect/Watch | Same player identity and economic policy | Autonomous passive farming exploit |
| Language switches EN/HE/RU | Buttons, RTL, names and numerals render properly | Overflow in mobile match HUD |

**Automated test families:** ledger property-based invariants (`balance >= 0`, never double-spend, unique idempotency keys); content-pack schema; save migration roundtrip; combo validation; AI deterministic replay; economy anti-grind; UI accessibility and navigation; browser screenshot diff and frame timing. Manual QA: realistic camera orbit, outfit clipping, physical phone touch input, culturally sensitive/event language review, clear no-money policy.

## 25. Release plan with concrete scope and exit gates
**R1 — Playable economy and identity (small release; do first):** username; school name/crest; persistent profile; XP + Coins ledger; 12 purchasable/equip cosmetic items (simple material variants first), 4 combo unlocks, 4 equipment slots, 2-minute quick challenge, wallet/shop, real match result and reward screen; save/migration. **Exit:** complete first purchase in <=10 minutes, profile survives refresh, no duplicate coin grant, existing game unbroken, mobile usable.

**R2 — School and short-session loop:** School hub, first facilities, tutorial, 3-minute challenge deck, gym art states, 3 rival profile screens, first world director digest, 2 original themed events from E01/E02. **Exit:** a player can play <3 min, earn and equip; after simulated 7-day absence catch-up is accurate and optional.

**R3 — Strategy and evolving opponents:** Tactical rule editor, Coach mode, rival AI observation with bounded counteradaptation, named signatures, 4 branches of story arcs and first multi-stage school tournament. **Exit:** rival rematch differs for evidence-based reason and can still be won with counter-strategy.

**R4 — Collections and cinematic world:** Additional complete characters (only when full rig/motions pass), 3–4 new arenas, advanced outfit studio, scripted commentary/replay, culture event registry, academy starter and school crest/story evolution. **Exit:** no clipping or obvious loss of motion realism; device performance stable.

**R5 — Endgame and legacy:** mentoring, world school cup, school rival leagues, generational fighters, persistent hall, six full arcs, advanced challenge architect. **Exit:** meaningful endgame without forced prestige or destructive resets.

**R6 — Optional online expansion (separate architecture approval):** accounts, synced saves, signed match verification, public ladders, public UGC/multi-player challenge sharing, moderation and privacy. **Exit:** real server-authoritative verification and maintenance budget; otherwise explicitly defer.

**Milestone discipline:** Each release should be a functional vertical slice. Code agents should not move to a higher release if lower-release acceptance fails or current main changed incompatibly. Use feature flags and reversible migrations. One master PRD, one implementation task per release, one acceptance matrix per PR; never let separate agents edit same core file simultaneously without integration ownership.

## 26. Actual Codex work order — no second brainstorming or research required
> Open repository `ytcat/fit` at current `main`; read current file tree and active PRs. This PRD is the approved **target design**, not evidence of implemented behavior. Work on a new isolated branch/worktree. Implement **R1 end-to-end first**, not 200 unfinished stubs. Reuse the existing Three.js combat, animations, fight result, gym and career modules. Create an event/ledger adapter and storage compatibility layer, then username/school profile, store/inventory, combo equip, result/reward, quick action, regression tests and screenshots. Do not modify concurrent agents' branches. Keep free-currency-only, offline capability, existing EN/HE/RU translations and phone support. Publish a PR with working app link if deployment is available, actual before/after captures, passing test evidence, exact unfinished items and rollback. Continue to R2 only after R1 tests and integration pass. Stop on genuine unresolved repository conflict, security/privacy blocker or impossible engine dependency and report it precisely; otherwise make bounded decisions from the spec without seeking approval for every implementation detail.

### 26.1 Technical priorities for first Codex sprint
1. Inventory existing files and determine current source-of-truth for career currency and progression; avoid duplicate wallets.
2. Add immutable ledger + idempotent migration with seeded local profile; test reset/backup.
3. Introduce current username to fight HUD, announcer/result and tournament identity without substituting avatar species for username.
4. Add a reward catalog with four tested combos and a mode-specific loadout UI wired to existing move system.
5. Build Store and Locker with 12 original cosmetic items using existing textures/material palettes and safe modular equipment; confirm no geometry clipping.
6. Wire genuine fighter results to XP/Coins and the first purchase/unlock journey.
7. Add story World entry point with `Quick Action` and `Continue`; retain classic UI option.
8. Run entire regression suite and browser/mobile verification; produce screenshots and PR.

## 27. Final player experience — beginning to legacy, one complete narrative
**Minute 0:** New player launches and sees an optional impressive but skippable training/fight intro. Enters nickname, names school and chooses Lion, then passes a 60–90 second movement/punch mini-course. Receives enough **virtual** coins to choose an outfit detail, claims first `Jab → Cross` combo, and chooses to equip it in Training and Fight. A short exhibition begins with `Nickname (Lion)` versus `Shadow (Rabbit)`; the result reflects actual fighting. A clear reward screen offers rematch, locker, or school hub.

**First hour:** Player completes a precision mini-challenge, buys colored gloves with earned coins, unlocks a punch bag station, meets the first rival and chooses to train counters instead of endlessly fighting. In the tactics workshop, an incoming jab triggers a slip/body counter/angle exit. Player tests it in short bouts and starts earning mastery; the chosen strategy creates a distinct identity.

**First week (flexible, no required attendance):** The school becomes known for evasive counters. Shadow learns a bounded response to a *recorded* favorite combination. Player sees a concise rematch invitation, tries a new fake exit and wins a special event. The event is presented in a fictional flashy city broadcast arena, with original outfits and crowd. A new character is earned or bought using coins. A locally simulated school rival approaches for a friendly exchange of techniques.

**First month:** Player has multiple equipment choices, verified achievements, 3–4 consistent fighters, school rooms, earned title belts, advanced combos and a regional championship. Some days they only test a tactic for 2 minutes; other days they run an entire tournament. Distinct missions test precision, defense, coaching and combinations rather than KO. World-feed stories respond to historical decisions.

**Champion phase:** Championship bracket demands multiple tactics; an AI rival counters a favorite signature during final round, requiring mid-match coaching. Victory earns a genuine championship belt, not a purchased fake. Player may still customize the belt display/costume and enter special show matches in original venues inspired by famous entertainment capitals.

**Legacy phase:** Founder trains a novice under the champion's coaching, teaches a capped inherited tactical fragment and records a lineage in the Legacy Hall. Other fictional school philosophies compete. The player's style evolves; rivals make discoveries; original current-culture event packs bring fresh missions. The game has no forced final ending or destructive reset. The player's evolving story is permanently associated with their username and school, whether they play for 2 minutes or 2 hours.

**END OF VERSION 2 EXPANSION.**


## 28. Visual flow gallery — V2 decisions and implementation diagrams

### 8. School: from rookie to legacy
![School evolution](diagrams/08_school_evolution.svg)

### 9. Earn, spend and equip: a single atomic economy
![Earn spend equip flow](diagrams/09_economy_transaction.svg)

### 10. Original topical events: editorial to playable
![Event content pipeline](diagrams/10_live_event_pipeline.svg)

### 11. One world, flexible sessions: 2 minutes to 3 hours
![Micro and long session choices](diagrams/11_short_long_sessions.svg)

### 12. Seven-day return: grounded changes and no penalty
![Return after absence](diagrams/12_world_return.svg)

**Illustrative art:** The storyboards are aspirational concept images, not production screenshots. Exact UI geometry, text and mechanics are governed by this specification. All scenes and models must be built and verified in the existing app.