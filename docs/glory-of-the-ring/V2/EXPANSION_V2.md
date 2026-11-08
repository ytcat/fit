
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
- **OPEN DECISIONS (defaults chosen until owner changes):** Game name FIT: Rise of the Champions; player role Founder; free-only local-first; first release 2 existing species; original fictional city and sports-inspired events; one wallet CR; no mandatory account, no monetization; community deferred.

## 29. External implementation/reference links (nonmandatory reading)
- Three.js loaders and glTF: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js animation: https://threejs.org/docs/pages/AnimationMixer.html
- Unity on seasonal events (conceptual patterns, not a required Unity dependency): https://docs.unity.com/en-us/services/solutions/seasonal-events
- Unity 2026 developer report (illustrative industry context): https://unity.com/resources/gaming-report
- International Trademark Association — publicity rights overview: https://www.inta.org/topics/right-of-publicity/
- WIPO intellectual property and esports: https://www.wipo.int/edocs/pubdocs/en/wipo-pub-1085-26-en-intellectual-property-and-esports-an-overview-of-the-game.pdf

**FINAL PRODUCT RULE:** The game is *free forever*. Every meaningful progression reward, whether aesthetic or gameplay, can be earned entirely through play, fair challenges and skill. Every new feature should improve player agency or storytelling, not just increase grind. When in doubt, ship a small genuinely playable scenario rather than a large decorative noninteractive world.