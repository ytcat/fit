# FIT: RISE OF THE CHAMPIONS
## Epic Product Requirements Document | Product vision + end-to-end player journey + full game systems
**Status:** Proposed product design, not implemented. **Version:** 1.0 | **Date:** 8 November 2026 | **Platforms:** Mobile web and desktop web | **Repository:** `ytcat/fit`

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
## VERSION HANDOFF — V1 → V2
**Public working title:** Glory of the Ring. **Repo:** https://github.com/ytcat/fit
**Live app:** Not yet verified; inspect deployment configuration before providing URL.
**Next PRD:** [V2 — Full living-world master PRD](../V2/FIT_MASTER_PRD_V2.md).
**Implementation:** This is a proposed specification, not proof of implementation. Read V2, its expansion, and [Codex execution contract](../V2/CODEX_START_HERE.md) before coding. Track exact commits, tests, screenshots and unmet acceptance criteria. Retain compatibility with current FIT identifiers.
