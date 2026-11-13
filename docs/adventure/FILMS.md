# Animation films — ongoing tracker (GOTR-0091)

One list of every animated film (scripted 3D scene) in Glory of the Ring: what it shows, where it plays, and its state.
Updated by the integrator at every release that touches a film. A film is **Done** only when it was played in the
game flow at 402×690, its pictures were shown to the owner, and it is live.

**Rules for every film (owner):** pictures first, not text; Skip at any time; clothes follow the place (street and
market: street clothes and bare hands; docks: track pants and hand wraps; gym and ring: boxing kit); nobody holds a guard
outside a fight; natural walking and talk gestures; orthodox stance in fights; smooth, realistic motion and shadows;
subtitles in the bottom bar, nothing over a character; EN/HE/RU. City sets, bus and buildings are authored by Codex
(`assets/street/`), characters and animation by us.

States: **Live** (released) · **Built** (on a branch, not released) · **In work** · **Planned** · **Old** (live, to be redone).

## Chapter 1 — "The Dream"

| # | Film (scene id) | Beat | What it shows | State | Where / notes |
|---|---|---|---|---|---|
| 1 | Opening (`dream_opening`) | 0 | Camera dives from the city map to the bus station; bus arrives; Fighter steps off in street clothes with his bag; walks to Bruno's Gym | **Live** v1.53; Codex's bus, station and buildings v1.61 (GOTR-0089) | `adventure/story/dream-core.js`, `adventure/story/city-assets.js` |
| 2 | Gym talk (`dream_gym_talk`) | 1 | Fighter meets Coach Bruno: no money, a dream, "whatever it takes"; Brick steps in | **Live** v1.53, natural dialogue v1.60 | |
| 3 | First fight vs Brick | 2 | Fight on the gym floor, Bruno referees | **In work** (GOTR-0083); live version still uses the arena ring | `agent/dream-1b` |
| 4 | After the fight (`dream_after_brick`) | 2 | Bruno's deal: clean the gym, run errands, train for free — loss and win versions | **Live** v1.53 (torn-arms fix v1.56) | |
| 5 | Bag break (`dream_bag_break`) | 4 | Night gym, one huge Cross, the chain snaps, the bag falls and rolls; "Bruno's going to kill me" | **Done on `agent/bag-break-b`** (GOTR-0087), not released: Jab-Cross, slowed big Cross, bag folds, top link snaps, swing up, falls on its end, bounce, tips over, rolls; lamp sways; replay from the step | `adventure/story/bag-break-core.js` (script, physics), `bag-break.js` (bag model, film); evidence `qa/gotr-0087/` |
| 6 | Apology | 5 | Morning: Fighter apologises, Bruno sends him to the market (walk, Skip) | **Planned** — stand-in: portrait conversation | |
| 7 | Market robbery | 6 | Fang (wolf, leather jacket, gold chain) snatches Mrs. Hazel's bag; street fight, bare hands; reward | **Planned** — stand-in: street bout with gloves | Codex: market set |
| 8 | Otto's Corner | 7 | Buying the new heavy bag; carrying it back (walk, Skip) | **Planned** — stand-in: buy counter on the map | Codex: shop front |
| 9 | New bag | 8 | Bruno heard about the market; two-sided bag drill with Mack | **Planned** | |
| 10 | Offer | 9 | Bruno proposes an unofficial fight | **Planned** — stand-in lines | |
| 11 | The Docks | 10 | Arrival at night, illegal fight in a crowd circle, bare-knuckle vs Hook | **Planned** — stand-in: Docks bout with gloves | Codex: warehouse set |
| 12 | Fight night | 12 | Rematch vs Brick in the gym with the neighbourhood watching; chapter ending | **Planned** | |

## Fight films (every fight)

| # | Film | What it shows | State |
|---|---|---|---|
| F1 | Sunday Punch (finisher, GOTR-0088) | Dip, rising rear Uppercut under the chin, slow motion, Opponent lifted and falls out cold; earned at the end of Chapter 1 or bought | **Planned** |
| F2 | Corner break (GOTR-0076) | Between rounds: walk to the corner, cornerman brings the stool (corner colour), towel, water bottle; stool removed at the bell | **Planned** |
| F3 | Knockout fall | Believable fall to the canvas, no floating or clipping; referee or Coach waves it off | **Planned** (part of F1) |
| F4 | Fight intro and result | Intro, VS, result ceremony with score cards only on a decision | **Live** (v1.49) |

## Older scenes (live, to be redone in the new style)

| Scene id | Chapter | State |
|---|---|---|
| `arrival`, `brick`, `dash`, `boss_intro`, `boss_outro` | 1 (old story) | **Old** — replaced in the step list by The Dream; kept for Market Row references |
| `vix_intro`, `whistle_theft`, `dash_circle`, `hyena_intro`, `hyena_outro` | 2 (Market Row) | **Old** — Chapter 2 becomes "Junior League"; redo when its script exists |
| Trials: `carry_bag` (Brick's bag), `snoring_guard`, `rooftop_barrage`, `cut_him_off`, `hustlers_bet` | 1–2 | **Live** — everyday pose and outfit rule since v1.55; Brick's bag easier since v1.53 |

## Next in order

1. Bag break (5) — done on `agent/bag-break-b`, waiting for review and release.
2. Opening with Codex's assets (1) and first fight on the gym floor (3) — in work.
3. Sunday Punch (F1) and knockout fall (F3).
4. Corner break (F2).
5. Apology (6) → Market robbery (7) → Otto's Corner (8), as Codex delivers the market and shop sets.
6. New bag (9), Offer (10), The Docks (11), Fight night (12).
