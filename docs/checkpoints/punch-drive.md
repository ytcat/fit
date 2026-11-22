# Checkpoint: punch drive and smooth hands (GOTR-0032, GOTR-0027)

Branch `agent/punch-drive` (from v1.87 `37247bc`). Not merged, no version bump.

## Changed so far
- `qa/gotr-0032-v2/measure.cjs` (per punch on mitts and bag: contact speed, elbow, hip/shoulder turn, weight transfer,
  snap-back, per-tick velocity jumps of knuckles/elbows, isolated pops; rapid coach-called sequences at 0.12/0.18/0.25 s),
  `trace.cjs` (per-tick table for one punch). Baseline from `37247bc` in `before-*.json/log`.
- WIP `boxing-coach-v2.js` option `cheekGuard` (set for the Fighter by `career-drills.js` and `training-arena.js`):
  the guard glove stays at the cheek during a punch and the striking glove starts from the open guard; root cause of
  most jitter was the face clearance walking gloves out of the muzzle by 15-27 cm per tick.

## Next
- Hooks decelerate into the mitt (arc blended into the knuckle target): rebuild the fitted hook path so it accelerates
  through contact; faster snap-back; inertialize action switches (rapid presses).
- Run `bash scripts/run-tests.sh -j 2 coach pose mitt pads bag stance training` and the fight/guard tests.

## Checks run
- Baseline `bash scripts/run-tests.sh -j 2 coach pose mitt pads bag stance training` on 37247bc: files=13 fails=0.
