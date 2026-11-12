# Chapter 1 — "The Dream" (owner's script, 2026-11-12, GOTR-0078)

Replaces the chapter-1 step list in STORY.md and `adventure/story-flow.js`. The owner dictated the beats; names, species and
details below are the integrator's proposals and stay open to the owner's changes. Original characters only.

## Rules the owner set
- Show, don't tell: the story opens with pictures, not text. Every beat is a 3D scene; text is short spoken lines. Every scene
  and every walk can be skipped.
- The Fighter is never called "nobody". He comes to the big city with no money, one bag of clothes and a dream: to become
  the world champion.
- The Fighter really moves from place to place through the streets (walk shown, Skip jumps to the destination).
- Clothes fit the situation: street clothes on arrival, while cleaning, at the market and in the robber fight (no gloves);
  long track pants and hand wraps (no gloves) at the docks; boxing kit only for gym training and gym fights.
- Very good graphics: streets, audience, venues and equipment (the heavy bag above all); every movement smooth and realistic.
- New, detailed characters. The story Coach is not a rabbit. The robber is a bigger, muscular, different animal.

## Cast (proposal)
| Role | Character | Look |
|---|---|---|
| Fighter | the player's lion or rabbit | arrival: hoodie, jeans, worn sneakers, duffel bag on the shoulder |
| Coach | **Bruno**, an old bear, former champion | grey muzzle, flat cap, towel on the shoulder, whistle, cardigan over a gym shirt |
| Gym champion, chapter boss | **Brick**, a bulldog heavyweight | stocky, scar over one brow, red trunks with white stripe |
| Mitt man | **Pip**, the rabbit | Bruno's assistant: holds the mitts in drills (keeps today's mitt training) |
| Robber | **Fang**, a big wolf | black leather rocker jacket, gold chain, ripped jeans, boots |
| Victim | **Mrs. Hazel**, a doe who runs a fruit stall | apron, handbag |
| Shop owner | **Otto**, an otter | boxing-equipment shop "Otto's Corner" |
| Docks promoter | **Slick**, a weasel | cheap suit, cigar-less toothpick, cash roll |
| Docks opponent | **Hook**, a crocodile dock worker | bare fists with wraps, overalls rolled to the waist |

## Places (street-level sets, all reachable by walking from the map)
Bus station street · Bruno's Gym (front, main hall, store room) · Market Row street with stalls · Otto's Corner shop front ·
The Docks warehouse (crowd in a circle, no ring, hanging lamps) · Bruno's Gym on fight night (ring, benches, local audience).

## Beats — one step at a time; each unlocks the next
| # | Time | Place | What the player sees and does | Outfit | Unlocks |
|---|---|---|---|---|---|
| 0 | Morning | Map → bus station | Opening film: the camera dives from the city map to the bus station; a bus stops; the Fighter steps off with his bag, looks up at the city. He walks to the gym (walk, Skip). | street | 1 |
| 1 | Morning | Gym hall | Conversation with Coach Bruno (skippable): no money, a dream, "I'll do whatever is needed". Bruno: "Words are cheap. Show me." | street → borrowed kit | 2 |
| 2 | Morning | Gym ring | **First fight: Brick.** Brick is far stronger; the player is expected to lose (a win is possible and remembered). Either way Bruno is impressed: "You got up. That I can work with." He offers a job and a bed in the store room. | borrowed kit | 3, side A |
| A (side) | Day | Gym | **Clean the gym** (job): a short timed skill game, not a chore — footwork with the mop along marked lanes, wipe the bags as they swing back. Small pay. Repeatable. | street | — |
| 3 | Night | Gym, empty | **Night training 1: Shadowboxing** with the lights low. | kit | 4 |
| 4 | Night | Gym, empty | **Night training 2: the heavy bag.** Power builds; the last punch tears the chain and the old bag crashes to the floor (scripted animation, dust, the lamp swinging). | kit | 5 |
| 5 | Morning | Gym | The Fighter owns up: "I'm sorry. I'll work to pay it back." Bruno agrees and sends him to the market for supplies (walk, Skip). | street | 6 |
| 6 | Day | Market Row | Fang snatches Mrs. Hazel's handbag. The Fighter stops him: **street fight, no gloves, street clothes**, crowd of market people around. Win → Mrs. Hazel and the stall owners collect a reward: exactly the price of a new heavy bag. | street, bare hands | 7 |
| 7 | Day | Otto's Corner | **Buy the new bag** in the Shop with the reward coins (the price equals the reward). Carry it back (walk, Skip). | street | 8 |
| 8 | Afternoon | Gym | Bruno heard about the market and is impressed. "Let's test it." **Two-sided bag drill**: the Fighter and Pip hit the new bag from both sides in rhythm. | kit | 9 |
| 9 | Afternoon | Gym | Bruno proposes an unofficial fight. The Fighter agrees. **Fight preparation**: mitts with Pip (combos), Slip and Roll drill. | kit | 10 |
| 10 | Night | The Docks | They arrive (walk, Skip). The Fighter realises it is an illegal fight — and fights anyway. **Bare-knuckle fight vs Hook**, long track pants, hand wraps, crowd in a circle, cash on a barrel. Win → prize money. | track pants, wraps | 11 |
| 11 | Next day | Gym | **Advanced training**: longer combos, counter after Slip, body-head. | kit | 12 |
| 12 | Evening | Gym fight night | **Rematch: Brick**, with the neighbourhood as audience. By now the Fighter has the skills. Win → Chapter 1 complete; Bruno: "Now you need real gear and a real league." | kit, own gloves | Chapter 2 |

## Chapter 2 — "Junior League" (outline from the owner)
New skills, more side missions, buy the first professional equipment, train for the first professional fight in the Arena
as a junior-league boxer.

## Build order (each slice is released on its own)
1. Opening film, bus station set, street clothes + duffel bag, walk to the gym with Skip, conversation with Bruno, first fight
   vs Brick with the "expected loss" outcome. Needs: Bruno (bear) and Brick (bulldog) models, outfit system, walking.
2. Night training, bag-break animation, apology scene, Clean-the-gym side job. Needs: the detailed heavy bag.
3. Market set, Fang (wolf) and Mrs. Hazel, robbery scene, bare-hand street fight without a ring, reward, buying the bag at
   Otto's Corner. Uses the ringless-fight work (GOTR-0065).
4. Two-sided bag drill (GOTR-0077), fight preparation, Docks set, Slick and Hook, bare-knuckle fight.
5. Advanced training, fight-night gym with audience, rematch vs Brick, chapter ending, Chapter 2 opening.

Absorbs: GOTR-0067 (arrival clothes), GOTR-0049 (outfits by place), GOTR-0065 (ringless fights), GOTR-0062 (Brick as boss),
GOTR-0077 (bag trial), GOTR-0066 (street-level graphics), GOTR-0009 (new species: bear, bulldog, wolf, doe, otter, weasel,
crocodile).
