# GOTR-0038 — coach's mitt inside his own face (mitt work)

## Measurement (`measure.cjs`, 120 Hz, the game's own body volumes: skull, muzzle, chest, abdomen)
Minimum clearance between each mitt's padded body (26 surface samples) and the holder's own head/torso, per
drill; negative = inside. Watch, fighter lion (coach rabbit) and fighter rabbit (coach lion) give identical
numbers (targets are world-space and both rigs share proportions).

| drill | before (`before-watch.json`) | after (`after-watch.json`) |
|---|---|---|
| roll under the hook, coach sweeps L / R | **−13.5 cm (skull)** / −10.2 cm | +0.91 / +0.90 cm |
| jab / cross | +0.07 / −0.63 cm (muzzle) | +1.01 / +0.79 cm |
| hook / rear hook | −1.65 / −0.73 cm | +0.95 / +1.00 cm |
| uppercut / rear uppercut | −1.17 / −2.49 cm | +1.00 / +0.97 cm |

Play (fighter lion, `after-play.json`): every coach mitt ≥ +0.79 cm.

## Cause and fix (`career-drills.js`)
- In the roll drill the free mitt went to a fixed point in front of the chest while the coach leaned into the
  sweep (step in, spine/chest pitch), so the head moved onto it. It is now placed from the head: beside the cheek
  (head-local ±0.27, 0.07, 0.17).
- After every mitt placement, any overlap with the holder's own skull/muzzle/chest/abdomen volumes is pushed out
  along the surface normal to 1 cm clearance (≤ 3 passes); a mitt catching a straight is moved sideways only, so
  the straight still lands at full reach (jab 164°/0.990, cross 167°/0.994, unchanged).
- Strip: `roll-before-after.webp` (real app, 0.30–0.75 s into the roll beat, top before / bottom after).

## Not fixed
- Fighter guard flicker (GOTR-0027): the lead glove still jumps ~23 cm for one 120 Hz tick in the mitt rear hook
  (|Δv| 56 m/s at t≈4.91 s). Cause: `clearOwnFace()` in `boxing-coach-v2.js` walks the glove ~23 cm when it
  touches the muzzle by > 0.2 mm and not at all below that. Two contained fixes there did not remove it, and that
  file was off limits for this task.
- Fighter gloves vs. the *chest hit volume* read −19 to −25 cm during the uppercut load. That volume is the
  generous hit shape (0.315 × 0.25 × 0.27 m), not the skin, so this is not proof of visible penetration; not
  verified visually here.
- The cross strip did not advance after the press in this harness (`strip.cjs`), so it is not included.
