# Film drawing cost — 2026-11-22

Headless Chromium at 402×690, `node qa/perf/films.cjs 6` (6 moments per film; triangles of the rendered frame). Raw numbers in `films.json`.

| Film | Before mean | After mean | Before worst | After worst |
|---|---:|---:|---:|---:|
| dream_opening | 340k | 346k | 430k | 437k |
| dream_gym_talk | 993k | 634k | 1,049k | 684k |
| dream_after_brick | 1,132k | 537k | 1,158k | 597k |
| dream_apology | 625k | 400k | 698k | 522k |
| dream_market_robbery | 1,143k | 651k | 1,239k | 880k |
| dream_market_reward | 976k | 726k | 1,168k | 809k |
| dream_otto_shop | 682k | 493k | 722k | 546k |
| dream_new_bag | 1,283k | 738k | 1,284k | 738k |
| dream_offer | 1,238k | 692k | 1,284k | 738k |
| dream_fight_night | 2,107k | 981k | 2,391k | 1,297k |
| dream_chapter_end | 2,002k | 946k | 2,045k | 1,158k |
| dream_docks | 910k | 592k | 963k | 698k |
| dream_docks_after | 910k | 470k | 978k | 664k |
| Gym-ring rematch (bout) | 1.31 M | 1.12 M | | |

What changed: characters outside the shot are not drawn; bodies below extreme close-up use the unsubdivided body triangles (same
vertices, skinning, clothes and muscle streams; compared side by side at 402×690 — no visible difference); the rematch neighbourhood
is venue-crowd people (33k triangles) instead of three story characters (~1M); the gym-fight referee uses the light body.

Still above the ~450k phone estimate: the six-character gym films (~1M), the market and two-sided-drill films (~0.7M). Remaining
large items per character: kit shorts 70k, boxing gloves 64k each, head detail ~65k. Not measured on a physical phone.
