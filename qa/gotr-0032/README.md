# GOTR-0032 — mitt work punches look like small touches

## Causes found (`measure.cjs`, Play, 120 Hz like the pad clock; `before.json`)
- Hooks were aimed exactly at the mitt face, so the planned arc eased to a stop on it: glove 2.1–2.3 m/s in the
  tick before contact against a 7.8–9.2 m/s peak, closing speed on the mitt 1.09 m/s (sound strength ~0.16).
- The boxer's knuckle target followed the mitt every tick, so after contact the glove *chased the retreating
  pad* (4.4–5.6 cm extra travel vs. the same punch with the contact suppressed).
- Pad pop 2.7 cm (hooks) / 5.2–5.5 cm (others), peaking 42 ms after contact; the holder's shoulder moved
  1.2 cm and chest 0.3 cm in reaction — nothing read as absorbing a blow.

## Changes (`career-drills.js`, one hunk in `index.html` sound)
- Hooks aim 5 cm and uppercuts 4.5 cm *through* the mitt face; every punch aims at the face position without its
  recoil, so the glove keeps its own path while the mitt pops away. Straights are unchanged before contact.
- Pop per mitt: depth by type (jab .085, cross .09, hook .095, rear hook .10, uppercuts .08/.085 m) × force
  `clamp(closing/3, .6, 1.3)`, rise τ 12 ms, recovery τ 120 ms.
- The holder absorbs: struck shoulder turns back (chest/spine yaw), scapula gives 1.5 cm, trunk braces back, knees
  give 1.2 cm — all scaled by the pop. The existing straight "meet" (mitt moves 5.5 cm toward the punch) stays.
- Striker accent: the striking glove's padding squashes on the mitt (peak ~0.85 × force, ~60 ms) — the
  "equivalent" of a hit-stop that does not touch the input clock (Academy tempo untouched).
- Sound: an extra brighter mitt "pop" layer scaled by closing speed.
- No change to scoring (closing speed is only used by sound and visuals).

## Before → after (lion; the rabbit's numbers are identical because targets are world-space)
| punch | closing m/s | glove m/s 1 tick before | mitt pop cm (peak at ms) | holder shoulder / chest cm | glove chases pad cm | knuckle past face cm |
|---|---|---|---|---|---|---|
| jab | 5.0 → 5.0 (cap) | 13.0 → 13.0 | 5.2 (42) → 7.9 (25) | 1.2/0.3 → 8.2/1.5 | 4.7 → 0.1 | −2.1 → −2.1 |
| cross | 3.5 → 3.5 | 10.7 → 10.7 | 5.2 (42) → 7.5 (25) | 1.2/0.3 → 7.4/1.4 | 4.4 → 0.1 | −0.9 → −0.9 |
| hook | 1.09 → 2.45 | 2.1 → 3.9 | 2.7 (42) → 5.5 (25) | 1.2/0.3 → 5.5/1.0 | 2.3 → 0.04 | 0.3 → 1.2 |
| rear hook | 1.09 → 2.32 | 2.3 → 3.7 | 2.7 (42) → 5.5 (25) | 1.2/0.3 → 5.3/1.0 | 2.4 → 0.03 | 0.2 → 1.1 |
| uppercut | 3.17 → 4.92 | 9.4 → 12.8 | 5.5 (42) → 8.0 (25) | 1.2/0.3 → 8.1/1.5 | 5.5 → 3.1 | 0.1 → −0.1 |
| rear uppercut | 3.72 → 4.00 | 8.7 → 8.9 | 5.4 (42) → 8.7 (33) | 1.2/0.3 → 8.1/1.5 | 5.6 → 2.9 | 0.0 → −0.3 |

“Glove chases pad” and the reaction columns are the difference from the same punch with the mitt contact
suppressed. Watch mode (auto sequence): hooks 0.89/0.93 → 2.04/2.05 m/s, uppercuts 3.69/3.06 → 3.97/4.57 m/s.
GOTR-0012: jab 164° / 0.990 and cross 167° / 0.994 extension at contact, unchanged; `mitt-range`,
`mitt-controller`, `career-drills`, `fluid-drills`, `training-motion` pass. Hooks now sink 1.1–1.2 cm past the
face plane at contact (inside the mitt cushion, which squashes); planted-foot slide unchanged (≤ 2.1 mm, the
pre-existing uppercut step).

Frame strips: `cross-before-after.webp`, `hook-before-after.webp` (`strip.cjs` + `compose.py`; 120 Hz ticks
−4…+30 around contact; top before, bottom after). New test: `tests/mitt-power.test.cjs`.

## Left
- Watch-mode straights at the mitts are still slow (jab 3.8, cross 2.2 m/s closing): the auto sequence spreads one
  punch over the whole 1.2 s beat. Compressing it with the punch clock changes the Watch mitt rhythm; not done.
- Mitt uppercuts have a chamber jump (knuckle 27–30 m/s for one tick, `../gotr-0027/README.md`), separate bug.
- No real hit-stop (time freeze) on the striker. Not checked on a physical phone.
