# Gloryland — story layer (approved by the owner 2026-11-11, GOTR-0056)

Rise to champion. Every mission happens because of the previous one; the Next bar always shows the next story beat.
Each mission has a 1–2 line intro and outro spoken by a character with a portrait (coach, rival, locals); no long cutscenes.
A story journal ("Chapter 1 · Nobody") keeps the lines already seen. Development build: everything open, recommended order shown.
Words: Coach = mitt-holding rabbit (Pip in chapter 1); Fighter = the player; Opponent = who the fighter faces.
Recurring rival **Dash**: a cocky young fighter of the other species (the engine fights lion vs rabbit), always one step ahead; final ladder before Blaze.

## Chapter 1 — Old Town (morning) — "Nobody"
1. Arrival: the fighter arrives with nothing; Coach Pip sees them shadowboxing at a bus stop and offers a corner of his gym → First stance, One-two on the mitts.
2. Brick, the gym bully, mocks the newcomer and dumps the new heavy bag outside → carry the bag in (funny), then Bag power test to answer him.
3. Earning a place: wake the snoring night guard so the gym opens; teach Pip's nephew a one-two → Night guard (funny), Teach the kid (help).
4. Dash walks in, beats a regular in seconds and laughs; Pip: "Not yet. Learn to roll first." → Roll under the hook, Rope rhythm, Morning sparring.
5. Boss: Brick challenges the fighter for their spot. Win → Pip gives his old hand wraps: "Go see Vix at Market Row." Map dots move to chapter 2.
Side quest — Old Fort: dawn runs on the fort walls with Pip (bonus Stamina).

## Chapter 2 — Market Row (evening) — "The Street"
Vix tests footwork → the Hyena crew runs the market → a raccoon steals Pip's whistle (chase) → help Grandma past the pigeon gang, win back a kid's skateboard → Dash takes the crowd circle before you arrive → Boss King Hyena. Win → the crew whispers about "real fights at the Docks".
Side quest — Midnight Fairground: strongman booth challenge.

## Story mode steps (GOTR-0069, `adventure/story-flow.js`)
A chapter is an ordered list of numbered steps; one is current, finished steps (≥1 star, or the boss beaten) show ✓ and stars and can be replayed, later steps are locked. Side steps are optional, appear after the step they follow and are marked "Side". Every step has a BEFORE beat (its scene the first time, else 1–2 lines) and an AFTER beat on the map (the Coach reacts to fail / 1–2 / 3 stars, the step's own line, "Unlocked: …", Next / Retry / Back to map). The boss is the last step; below his entry level the quest panel says how many stars are missing and which steps to replay. Nothing new is saved: step state comes from mission stars and boss wins, so old saves keep their finished steps.

**Chapter 1 · Old Town (Coach Pip)** — arrival in Gloryland with nothing → earn a place in Pip's gym → Brick.
1. Pip's trial — One-two on the mitts (before: arrival scene). Unlocks a corner in Pip's gym.
2. Brick's bag — skill trial: hit the swinging bag at its peak (before: Brick scene).
3. Pillow hands — Bag power test, Brick's "you punch like a pillow".
4. The night guard — Sleep talker trial; unlocks the gym at dawn.
5. Pip's nephew — teach the kid a Jab-Cross; unlocks your own locker. Side after it: Rope at dawn (Stamina).
6. Dash walks in — Roll under the Hook (before: Dash scene); unlocks the move Roll.
7. First Sparring — morning Sparring round; unlocks Brick's challenge.
8. Boss: Brick (entry Level 5; before: boss intro scene; after: outro scene → chapter summary). Unlocks Market Row and Coach Vix.

**Chapter 2 · Market Row (Coach Vix)** — Pip's hand wraps open Vix's door → the Hyena crew → King Hyena.
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
