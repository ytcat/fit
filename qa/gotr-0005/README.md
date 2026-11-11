# GOTR-0005 Burst — evidence

- `tests/burst.test.cjs` — charge rules, Watch-order boundary, Play commit, recovery cost, count/round/KO, button reasons.
- `browser.cjs [port] [parts]` — real app, parts `watch,play,rules,cup,layout`. Software WebGL renders about 1 fps,
  so the script advances the real fight clock (`arena.update` → `match.advance`, real poses and contact solver) in 1/60 s
  steps and skips rendering while it does. Test hook (only for pause/count/KO/layout states): `fighters[actor].burst.charge=1`.
- `survey-layout.cjs`, `probe.cjs` — diagnostics. `results-*.json` — last run.

## Balance (all in `BoxingFight.burst`, `boxing-fight.js`)

| Rule | Value |
| --- | --- |
| Meter at every bell | 0 |
| Time fill (round live, not during the count) | 0.045 / s (0.9 after 20 s, so time alone never fills it in a 20 s round) |
| Clean head/body hit landed | +0.10 |
| Block (glove/arm contact) or evaded punch | +0.07 |
| No charge while ordered, bursting or recovering | — |
| Sequence | jab, cross, hook (body), rear uppercut, hook — Super burst without its roll |
| Speed | each punch 0.76 × the player's move duration (`BoxingInput.durations`) |
| Cost | 0.7 s committed recovery step (no defence possible), −0.08 stamina, opponent skips its read/reset pause |
| Damage | no multiplier; contacts score through the normal solver, faster gloves give the higher contact speed |
