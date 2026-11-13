> **2026-11-13 (GOTR-0078, branch `agent/dream-flow`):** Chapter 1 is now **"The Dream"**, the owner's script in
> [CHAPTER1_SCRIPT_V2.md](CHAPTER1_SCRIPT_V2.md). The story Coach is **Bruno** (bear); Pip the rabbit holds the mitts. The
> Fighter is never called "nobody". Chapter 2 is titled **"Junior League"** (its steps are still the Market Row list below until
> it is rewritten). The older chapter-1 list is kept at the end of this page for reference only.

# Gloryland — story layer (approved by the owner 2026-11-11, GOTR-0056)

Rise to champion. Every mission happens because of the previous one; the Next bar always shows the next story beat.
Each mission has a 1–2 line intro and outro spoken by a character with a portrait (coach, rival, locals); no long cutscenes.
A story journal ("Chapter 1 · The Dream") keeps the lines already seen. Development build: everything open, recommended order shown.
Words: Coach = Bruno in chapter 1 (Pip the rabbit holds the mitts); Fighter = the player; Opponent = who the fighter faces.
Recurring rival **Dash**: a cocky young fighter of the other species (the engine fights lion vs rabbit), always one step ahead; final ladder before Blaze.

## Chapter 1 — "The Dream" (GOTR-0078)
Beats, ids and what runs today (`adventure/story-flow.js`, `adventure/oldtown.js` DEFS; save order in `adventure-progress.js` dreamSteps).
"Stand-in" = the closest existing activity, marked in the game in small print, until the scene/gameplay of the script is built.

| Beat | Step id | Title | Runs as | Finished by |
|---|---|---|---|---|
| 0 | `dream_arrival` | The big city | film `dream_opening` (agent/dream-1); fallback: portrait lines | watching or Skip |
| 1 | `dream_gym_talk` | Coach Bruno | film `dream_gym_talk`; fallback: portrait conversation | watching or Skip |
| 2 | `first_brick` | First fight: Brick | real bout vs a much stronger Brick (power ×1.4, tempo ×1.18, skill +0.10), Brick's look via `StoryCast.asOpponent` | **win or loss** (saved as `adventure.story.firstBrick`); then `dream_after_brick` (loss/win) or Bruno's lines |
| A | `clean_gym` (side) | Clean the gym | stand-in: quick steps at the heavy bag, 30 s | ≥1 star; repeatable, activity pay |
| 3 | `night_shadow` | Night Shadowboxing | Shadowboxing station, 45 s, the Fighter's punches | ≥1 star |
| 4 | `night_bag` | The old bag | heavy bag power marks (bag-break scene: stand-in) | ≥1 star |
| 5 | `dream_apology` | Owning up | stand-in: portrait conversation (no 3D scene, no walk) | Continue |
| 6 | `market_robber` | The robber | stand-in: street-arena bout vs "Fang" with gloves | a win; pays **exactly the heavy bag's price** |
| 7 | `buy_heavy_bag` | A new bag | real purchase (`game-domain.js` gear `heavy_bag`, 90 ◈) at a stand-in counter on the map | the purchase |
| 8 | `bag_drill` | Two-sided drill | stand-in: heavy-bag hits, 40 s (Pip on the other side: GOTR-0077) | ≥1 star |
| 9 | `fight_prep` | Fight preparation | mitts with Pip, Slip/Roll defences, 60 s | ≥1 star |
| 10 | `docks_fight` | The Docks | stand-in: Docks-arena bout vs "Hook" with gloves | a win; pays 120 ◈ |
| 11 | `advanced_training` | Advanced training | Fight Academy lesson Counter Chain (Slip, Cross, Hook) | ≥1 star |
| 12 | `brick` | Rematch: Brick | boss bout, entry Level 5 with the usual gate advice (fight-night audience: stand-in) | a win → chapter summary, Chapter 2 "Junior League" |

Rules: one current step, later steps locked; the first Brick fight never blocks (a loss advances); the street and Docks fights
must be won (a loss can be retried). Bruno's later lines follow the first fight (`AdventureStory.pick(id, kind, firstBrick)`:
night Shadowboxing, the bag drill, the rematch). All lines EN/HE/RU in `adventure/story.js`.

First open of Adventure on a fresh profile: opening film → gym conversation → the Brick fight start by themselves, each skippable;
the quest panel leads with the face of the step (portrait) and shows one short line and the goal.

**Old saves** (`adventure-progress.js` migrate, once, when `adventure.story` is missing): an old step finished means every new beat up to
its equivalent is finished: One-two → beat 1, Brick's bag → 2, Bag power → 4, Night guard → 5, Pip's nephew → 8, Roll under the Hook → 9,
First Sparring → 10, Brick beaten → 12 (`firstBrick` = won if Brick was beaten, else lost). Old stars stay (level unchanged); Rope at dawn
and First stance map to nothing. No coins are granted or taken by the migration.

## Chapter 2 — Market Row (evening) — "The Street"
Vix tests footwork → the Hyena crew runs the market → a raccoon steals Pip's whistle (chase) → help Grandma past the pigeon gang, win back a kid's skateboard → Dash takes the crowd circle before you arrive → Boss King Hyena. Win → the crew whispers about "real fights at the Docks".
Side quest — Midnight Fairground: strongman booth challenge.

## Story mode steps (GOTR-0069, `adventure/story-flow.js`)
A chapter is an ordered list of numbered steps; one is current, finished steps (≥1 star, or the boss beaten) show ✓ and stars and can be replayed, later steps are locked. Side steps are optional, appear after the step they follow and are marked "Side". Every step has a BEFORE beat (its scene the first time, else 1–2 lines) and an AFTER beat on the map (the Coach reacts to fail / 1–2 / 3 stars, the step's own line, "Unlocked: …", Next / Retry / Back to map). The boss is the last step; below his entry level the quest panel says how many stars are missing and which steps to replay. Nothing new is saved: step state comes from mission stars and boss wins, so old saves keep their finished steps.

**Old chapter 1 list (GOTR-0069, replaced by "The Dream"; kept for the save mapping above)** — arrival in Gloryland → earn a place in Pip's gym → Brick.
1. Pip's trial — One-two on the mitts (before: arrival scene). Unlocks a corner in Pip's gym.
2. Brick's bag — skill trial: hit the swinging bag at its peak (before: Brick scene).
3. Pillow hands — Bag power test, Brick's "you punch like a pillow".
4. The night guard — Sleep talker trial; unlocks the gym at dawn.
5. Pip's nephew — teach the kid a Jab-Cross; unlocks your own locker. Side after it: Rope at dawn (Stamina).
6. Dash walks in — Roll under the Hook (before: Dash scene); unlocks the move Roll.
7. First Sparring — morning Sparring round; unlocks Brick's challenge.
8. Boss: Brick (entry Level 5; before: boss intro scene; after: outro scene → chapter summary). Unlocks Market Row and Coach Vix.

Old chapter 1 story (v1.47–v1.50): 1. Arrival: the fighter arrives with nothing; Coach Pip sees them shadowboxing at a bus stop and offers a corner of his gym → First stance, One-two on the mitts. 2. Brick, the gym bully, mocks the newcomer and dumps the new heavy bag outside → carry the bag in (funny), then Bag power test to answer him. 3. Earning a place: wake the snoring night guard so the gym opens; teach Pip's nephew a one-two → Night guard (funny), Teach the kid (help). 4. Dash walks in, beats a regular in seconds and laughs; Pip: "Not yet. Learn to roll first." → Roll under the hook, Rope rhythm, Morning sparring. 5. Boss: Brick challenges the fighter for their spot. Win → Pip gives his old hand wraps: "Go see Vix at Market Row." Map dots move to chapter 2. Side quest — Old Fort: dawn runs on the fort walls with Pip (bonus Stamina).

**Chapter 2 · "Junior League" (still the Market Row steps, Coach Vix)** — Pip's hand wraps open Vix's door → the Hyena crew → King Hyena.
1. Vix's test — Curb footwork (before: Vix intro scene).
2. Clean hands — win a street round taking few hits.
3. The skateboard — body shots until a hyena returns a kid's board. Side after it: Rooftop callout.
4. Rooftop barrage — the crew's revenge, skill trial: stay dry.
5. The stolen whistle — Cut him off trial (before: whistle theft scene). Side after it: The show-off (speed bag).
6. The hustler's bet — the same raccoon hustles Grandma's money; read his feints.
7. The crowd circle — Dash got there first; beat three challengers (before: Dash circle scene).
8. Boss: King Hyena (entry Level 12; intro and outro scenes). Unlocks The Docks (next).

## Chapters 3–5 (outline)
3 The Docks — underground money fights; Dash is already a name there; Iron Bull. 4 Downtown — clubs, rankings, press; Onyx. 5 Glory Hill — Dash in the semi-final, Blaze for the title.

## How the story is shown (owner approved 2026-11-11)
1. Character lines with portraits over the map and existing arenas (no boxes) — building now.
2. Small 3D story sets built with the map's style and the game engine: bus-stop street corner, gym front door, market alley, dock pier. Short scripted scenes (5–10 s): camera move, characters walking a fixed path and gesturing, lines on screen. No videos (size, offline pack, three languages).
3. On-rails street mini-games in the same sets, using the game pad: dodge water balloons (Slip/Duck), chase the raccoon (timing), carry the heavy bag (balance).
Order: bus stop + gym front door for Chapter 1 (arrival, Brick and the heavy bag), then the market alley for Chapter 2. Free walking in a district stays optional for later.
