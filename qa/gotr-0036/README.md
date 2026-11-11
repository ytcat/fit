# GOTR-0036 — Burst meter charges faster

Owner: "Charging takes too long. You need to get to fully charge faster."

Change (`BoxingFight.burst` in `boxing-fight.js`): time fill 0.045 → 0.11 per second, clean hit +0.10 → +0.25,
block or evasion +0.07 → +0.17 (all ×≈2.5). Time alone now fills the meter in about 9 s; hits and defence fill it faster.

Measurement: `charge-time.cjs` — 4 Watch quick fights (seeds 11, 18, 25, 32), 8 fighters, real fight clock with real poses
and the real contact solver, stepped at 1/60 s without rendering (software WebGL). `full` values in the logs are match
time; the round starts at match time 3.0 s (intro and bell), so round time = match time − 3.0.

| | Before (`before.jsonl`) | After (`after.jsonl`) |
|---|---|---|
| First full meter, round time, mean | 12.3 s | 5.4 s |
| Range | 8.9 – 17.6 s | 3.8 – 9.1 s |
| Full within the first 10 s of the 20 s round | 2 / 8 | 8 / 8 |

In these Watch runs nobody presses Burst (the player orders it), so the meter stays full once ready.
`tests/burst.test.cjs` updated on purpose: time alone fills in 7–12 s; two hits and a block make it ready in 2–8 s.
