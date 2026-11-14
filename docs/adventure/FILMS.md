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
| 3 | First fight vs Brick | 2 | Fight on the gym floor, Bruno referees | **Live** v1.64 (GOTR-0083) | `adventure/story/gym-fight.js` |
| 4 | After the fight (`dream_after_brick`) | 2 | Bruno's deal: clean the gym, run errands, train for free — loss and win versions | **Live** v1.53 (torn-arms fix v1.56) | |
| A | Clean the gym (`clean_gym`, skill game) | side A | Day, Bruno's Gym: the Fighter in street clothes mops wet streaks along two taped lanes on the beat (In / Out steps, Slip to the other lane); Bruno shoves the high-hung heavy bags along the lane ends: Duck or Slip, or get knocked; combo, stars, a small wage every shift; Bruno's line before and after | **Built** on `agent/clean-gym` (GOTR-0099), not released | `adventure/story/mop-core.js` (rules), `adventure/story/mop-game.js` (picture); evidence `qa/gotr-0099/clean-gym.webp` |
| 5 | Bag break (`dream_bag_break`) | 4 | Night gym, one huge Cross, the chain snaps, the bag falls and rolls; "Bruno's going to kill me" | **Done on `agent/bag-break-b`** (GOTR-0087), not released: Jab-Cross, slowed big Cross, bag folds, top link snaps, swing up, falls on its end, bounce, tips over, rolls; lamp sways; replay from the step | `adventure/story/bag-break-core.js` (script, physics), `bag-break.js` (bag model, film); evidence `qa/gotr-0087/` |
| 6 | Apology (`dream_apology`) | 5 | Morning gym, the old bag on the floor under the empty chain; the Fighter (street clothes) owns up, Bruno grumbles ("Forty years"), sends him to Market Row; he walks out (tap / Skip) | **Built** on branch agent/market-films (GOTR-0096), not released | `adventure/story/market-core.js`; plays at the step, then chains into the robbery film; evidence `qa/gotr-0096/apology.webp` |
| 7 | Market robbery (`dream_market_robbery` -> street fight -> `dream_market_reward`) | 6 | Market Row by day: Fang snatches Mrs. Hazel's handbag, runs, the Fighter blocks him, Fang drops the bag and takes his jacket off; hand-off into the ringless street fight vs Fang (bare hands); after a win Mrs. Hazel gets her bag back and she and Otto hand over the reward (= heavy bag price); a loss keeps the existing lost beat and Retry | **Built** on branch agent/market-films (GOTR-0096), not released | Placeholder set `dream_market` (`market-sets.js`) until Codex's market set; evidence `qa/gotr-0096/robbery.webp`, `robbery-fight.webp` |
| 8 | Otto's Corner (`dream_otto_shop`) | 7 | Shop front, then inside: Otto greets him, shows the new heavy bag; the film waits for the in-scene Buy button (the step's own purchase); he carries the bag out on his shoulder (tap / Skip; Skip before buying shows the old counter) | **Built** on branch agent/market-films (GOTR-0096), not released | Placeholder set `dream_shop` until Codex's shop; evidence `qa/gotr-0096/otto.webp` |
| 9 | New bag | 8 | Bruno heard about the market; two-sided bag drill with Mack | **Planned** | |
| 10 | Offer | 9 | Bruno proposes an unofficial fight | **Planned** — stand-in lines | |
| 11 | The Docks | 10 | Arrival at night, illegal fight in a crowd circle, bare-knuckle vs Rourke | **Planned** — stand-in: Docks bout with gloves | Codex: warehouse set |
| 12 | Fight night | 12 | Rematch vs Brick in the gym with the neighbourhood watching; chapter ending | **Planned** | |

## Fight films (every fight)

| # | Film | What it shows | State |
|---|---|---|---|
| F1 | Sunday Punch (finisher, GOTR-0088) | Dip, rising rear Uppercut under the chin, slow motion, Opponent lifted and falls out cold; earned at the end of Chapter 1 or bought | **In review** (`agent/sunday-punch`) |
| F2 | Corner break (GOTR-0076) | Between rounds: walk to the corner, cornerman brings the stool (corner colour), towel, water bottle; stool removed at the bell | **Ready for QA** (`agent/corner-break`, `fight-corner.js`) |
| F3 | Knockout fall | Believable fall to the canvas, no floating or clipping; referee or Coach waves it off | **In review** (part of F1, `sunday-punch.js`) |
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
5. Apology (6), Market robbery (7), Otto's Corner (8) — built on branch agent/market-films; swap the placeholder sets when Codex delivers the market and the shop.
6. New bag (9), Offer (10), The Docks (11), Fight night (12).
