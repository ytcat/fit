# pc-smooth-start evidence (GOTR-0121 films stuck on PC, GOTR-0122 start flash)

Branch `agent/pc-smooth-start`, base v1.94 (67ddca4). Handoff: `docs/checkpoints/pc-smooth-start.md`.

## Start (GOTR-0122)

Sheets of the first 8 s after a reload (video at 4 frames per second, 1366x768 unless named; SwiftShader is slow, so the
whole start takes longer than on a PC; the first white frames are the browser before the page's first paint, in both versions):

- `before-boot-adventure-1366x768-en.png` — returning Adventure player, v1.94: the plain training page (Jab/Cross bar, "ROUND DRILL",
  Pause) for ~5.5 s, then the Adventure home replaces it.
- `before-boot-training-1366x768-en.png` — a player who chose Training in Modes, v1.94: the training page for ~7 s, then the
  Adventure home anyway (no mode was remembered).
- `after-boot-adventure-1366x768-en.png` — the boot cover (logo + Loading…) until the Adventure home opens; nothing of the gym shows.
- `after-boot-training-1366x768-en.png`, `after-boot-training-402x690-he.png` — the cover, then the gym, and it stays in the gym.
- `cover-ru-1920x1080.png` (cover in Russian), `cover-welcome-en-1366x768.png`, `cover-welcome-he-402x690.png` (a new player:
  the welcome card above the cover, no training page behind it).

## Films (GOTR-0121)

`tools/filmperf.cjs` plays each Chapter 1 film in the real app with `StoryScenes.play` (no seek), taps each waiting line, presses
Buy, and records every frame: wall time between frames, the time inside the film's own frame (JS), and how many shader programs,
textures and geometries were new in it. Chromium with SwiftShader (a software GPU) on a shared 4-core machine that another agent
was also loading: wall times are dominated by software rasterising (every frame > 50 ms at these sizes) and are relative only; the
JS column and the new-programs counts are what a PC sees as pauses. TS = film clock speed-up per frame (same for before and after).
Raw summaries: `data/*.json`. Before = v1.94 (67ddca4), after = this branch.

### Phone size 402x690 (TS=2)

Wall frame time between frames (SwiftShader software GPU, so absolute values are not a PC's): frames over 50 / 100 ms, longest, p95, median.  
JS = time spent inside the film's own frame (pose, camera, draw submission, first-use shader compiles and uploads): the part a real GPU does not hide.  
Load = from play() to the first film frame (black screen with the loading dots).

| film | frames | wall >50 ms | wall >100 ms | wall max | wall p95 | JS >50 ms | JS >100 ms | JS max | JS p95 | load ms | quality at end |
|---|---|---|---|---|---|---|---|---|---|---|---|
| dream_opening | 351 → 353 | 351 → 342 | 341 → 325 | 3333 → 8550 | 400 → 367 | 4 → 2 | 4 → 1 | 1310 → 509 | 11 → 9 | 9984 → 28597 | low (auto) → low (auto) |
| dream_gym_talk | 139 → 140 | 139 → 140 | 139 → 140 | 4666 → 2233 | 917 → 1217 | 5 → 1 | 4 → 1 | 477 → 110 | 27 → 23 | 7042 → 15759 | low (auto) → low (auto) |
| dream_after_brick | 100 → 101 | 100 → 101 | 100 → 101 | 2467 → 2667 | 1217 → 1217 | 1 → 0 | 1 → 0 | 264 → 45 | 18 → 15 | 2610 → 1547 | low (auto) → low (auto) |
| dream_bag_break | 148 → 147 | 148 → 147 | 148 → 147 | 6316 → 1800 | 1067 → 850 | 5 → 0 | 0 → 0 | 96 → 24 | 19 → 11 | 870 → 9742 | – → low (auto) |
| dream_apology | 155 → 154 | 155 → 154 | 155 → 154 | 1467 → 1567 | 983 → 867 | 1 → 0 | 1 → 0 | 138 → 20 | 9 → 10 | 2817 → 6804 | low (auto) → low (auto) |
| dream_market_robbery | 191 → 189 | 191 → 189 | 191 → 189 | 9083 → 5150 | 2300 → 1183 | 4 → 4 | 3 → 1 | 520 → 390 | 23 → 23 | 17016 → 17646 | low (auto) → low (auto) |
| dream_market_reward | 68 → 68 | 68 → 68 | 68 → 68 | 6700 → 2466 | 1533 → 1316 | 9 → 3 | 3 → 1 | 920 → 108 | 81 → 44 | 7785 → 10181 | low (auto) → low (auto) |
| dream_otto_shop | 195 → 196 | 195 → 195 | 195 → 195 | 2817 → 933 | 883 → 533 | 6 → 4 | 4 → 0 | 444 → 95 | 40 → 29 | 3846 → 2374 | low (auto) → low (auto) |
| dream_new_bag | 121 → 121 | 121 → 121 | 121 → 121 | 2983 → 3000 | 1766 → 2083 | 1 → 2 | 0 → 1 | 52 → 184 | 18 → 15 | 5760 → 5275 | low (auto) → low (auto) |
| dream_offer | 74 → 73 | 74 → 73 | 74 → 73 | 2250 → 4150 | 2000 → 2350 | 0 → 1 | 0 → 1 | 32 → 131 | 16 → 35 | 3234 → 3473 | low (auto) → low (auto) |
| dream_docks | 157 → 156 | 157 → 156 | 157 → 156 | 6683 → 4000 | 1000 → 1933 | 2 → 0 | 0 → 0 | 58 → 39 | 25 → 24 | 10400 → 20175 | auto → low (auto) |
| dream_docks_after | 90 → 91 | 90 → 91 | 90 → 91 | 1050 → 1650 | 983 → 1483 | 0 → 0 | 0 → 0 | 31 → 18 | 16 → 13 | 594 → 4828 | auto → low (auto) |
| dream_fight_night | 130 → 131 | 130 → 131 | 130 → 131 | 14050 → 4766 | 2333 → 2800 | 2 → 0 | 2 → 0 | 1055 → 28 | 26 → 23 | 2517 → 3606 | low (auto) → low (auto) |
| dream_chapter_end | 81 → 81 | 81 → 81 | 81 → 81 | 3183 → 2566 | 2400 → 1733 | 0 → 0 | 0 → 0 | 33 → 27 | 19 → 18 | 2676 → 2347 | low (auto) → low (auto) |

Long JS frames (> 50 ms) with what was new in them (programs = shader programs compiled, tex = textures uploaded):

- before dream_opening: t=0.1s 1309.8 ms (+18 programs, +30 tex); t=6s 527.4 ms (+8 programs, +-1 tex); t=7.4s 656.6 ms (+11 programs, +1 tex); t=12.5s 100.2 ms (+2 programs, +7 tex)
- before dream_gym_talk: t=1.7s 156.2 ms (+2 programs, +0 tex); t=3s 245.1 ms (+2 programs, +0 tex); t=8.8s 477.1 ms (+11 programs, +-1 tex); t=12.3s 168.5 ms (+3 programs, +2 tex); t=36.4s 60.5 ms (+0 programs, +0 tex)
- before dream_after_brick: t=9s 264.1 ms (+4 programs, +-1 tex)
- before dream_bag_break: t=0.8s 57.1 ms (+0 programs, +0 tex); t=1.5s 96.2 ms (+0 programs, +0 tex); t=2.1s 91.8 ms (+1 programs, +1 tex); t=8.3s 82.3 ms (+0 programs, +0 tex); t=9.2s 50.1 ms (+0 programs, +0 tex)
- before dream_apology: t=32.1s 137.9 ms (+0 programs, +0 tex)
- before dream_market_robbery: t=0.5s 94.1 ms (+0 programs, +0 tex); t=6s 520.1 ms (+9 programs, +-1 tex); t=14.2s 134.6 ms (+0 programs, +0 tex); t=15s 127.6 ms (+0 programs, +0 tex)
- before dream_market_reward: t=0.6s 63.9 ms (+0 programs, +0 tex); t=9.1s 102.3 ms (+0 programs, +5 tex); t=9.3s 81.4 ms (+0 programs, +0 tex); t=9.4s 61 ms (+0 programs, +0 tex); t=9.7s 143.7 ms (+0 programs, +0 tex); t=9.8s 81.3 ms (+0 programs, +0 tex); t=9.9s 80.7 ms (+1 programs, +2 tex); t=12.6s 71.2 ms (+0 programs, +0 tex)
- before dream_otto_shop: t=0.3s 255.6 ms (+2 programs, +0 tex); t=1.5s 387.3 ms (+5 programs, +0 tex); t=4.4s 443.9 ms (+4 programs, +9 tex); t=5.1s 125.5 ms (+0 programs, +0 tex); t=6s 69.2 ms (+3 programs, +-1 tex); t=22.2s 53.5 ms (+0 programs, +0 tex)
- before dream_new_bag: t=4.7s 52.2 ms (+0 programs, +0 tex)
- before dream_docks: t=0.5s 58.3 ms (+0 programs, +0 tex); t=0.6s 53.8 ms (+0 programs, +0 tex)
- before dream_fight_night: t=6s 1054.7 ms (+15 programs, +-1 tex); t=15.1s 123.6 ms (+3 programs, +0 tex)
- after dream_opening: t=6s 508.8 ms (+33 programs, +-1 tex); t=7.37s 58.2 ms (+0 programs, +0 tex)
- after dream_gym_talk: t=36.4s 110.2 ms (+0 programs, +0 tex)
- after dream_market_robbery: t=0.3s 73.7 ms (+0 programs, +0 tex); t=1.6s 390 ms (+0 programs, +0 tex); t=6.1s 63.9 ms (+0 programs, +0 tex); t=7.1s 55.4 ms (+0 programs, +0 tex)
- after dream_market_reward: t=0.2s 56.2 ms (+0 programs, +0 tex); t=0.3s 66.1 ms (+0 programs, +0 tex); t=9.1s 107.8 ms (+0 programs, +0 tex)
- after dream_otto_shop: t=4.47s 95.2 ms (+0 programs, +0 tex); t=4.57s 60 ms (+0 programs, +0 tex); t=18.3s 53.1 ms (+0 programs, +0 tex); t=35.8s 83.7 ms (+0 programs, +0 tex)
- after dream_new_bag: t=0.6s 55.8 ms (+0 programs, +0 tex); t=1.3s 183.5 ms (+0 programs, +0 tex)
- after dream_offer: t=5.05s 131.4 ms (+0 programs, +0 tex)
