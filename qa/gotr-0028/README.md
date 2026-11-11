# GOTR-0028 — hit sparring partner slid back on planted feet

Owner recording (v1.17, Train → Sparring): the rabbit glides backwards after the lion's punches.

## Root cause
`training-arena.js` `applyDynamics()` set the partner root to `z = .79 + pushback` where `pushback.rabbit`
is a spring kicked by every hit (impulse up to 4 m/s, peak travel ~0.2 m, clamp 0.30 m). The feet are posed
in root space, so the whole body including both planted soles translated with the root.

## Fix (commit on `agent/smooth-motion`)
- The root no longer follows that spring. A solid blow (push > 1.1 m/s) starts `partnerFootwork()`: a real
  step back (rear foot first, then lead foot, each lifted ~45 mm, 0.30 s), a 0.14 s pause and a step in again
  (0.40 s), using the coach's existing `ringStep` (root moves by the step ease; each foot only moves during its
  own lifted swing). Step length `min(.16, push*.045)` m. Lighter blows are absorbed by the existing body
  recoil spring (`options.recoil`, ≤ 6 cm in the torso/hips) with the feet planted.
- No change to contacts, damage or scoring.

## Numbers (planted = sole lift ≤ 2 mm in both frames; horizontal sole travel per frame)
| run | hits on partner | worst slide / frame | total slide after hits | frames sliding > 2 mm |
|---|---|---|---|---|
| node, 8 s, 60 Hz, before | 4 | 59.9 mm | 3042 mm | 210 |
| node, 8 s, 60 Hz, after | 4 | 0.19 mm | 1.0 mm | 0 |
| node, 8 s, phone schedule (16.7/33/50 ms), before | 4 | 143.5 mm | 2992 mm | 138 |
| node, 8 s, phone schedule, after | 4 | 0.19 mm | 0.6 mm | 0 |
| real app (Chromium, software GL), 104 frames, before | 1 | 59.9 mm | 815 mm | – |
| real app, after | 1 | 0.4 mm | 1.3 mm | – |

Sources: `../gotr-0027/before.json` (`spar-*`), `after-spar.json`, `strip-results.json`. Step trace
(`step-trace.cjs spar`): rear sole lifts 44 mm and travels ~10 cm, then the lead sole; the return mirrors it.

`spar-hit-before-after.webp`: frames −2…+36 (60 Hz) around the first hit, top row before, bottom row after
(cropped to gloves and feet). Before: the partner's boots slide back while flat on the floor. After: the rear
boot lifts and steps, the body follows.

## Fights (not fixed in this slice)
`slide-frames.cjs fight lion 6` shows the fight is mostly planted (`plantFeet()` anchors soles in ring
space) but has two remaining faults: (1) at step take-off the foot snaps from its anchor to the authored
step path (lift 0 → 1 mm while moving 20–230 mm in one frame), and (2) a few frames with lift 0 on both
frames still move 87–172 mm (anchor dropped while lift was between 1e-7 and 2 mm, or leg reach exceeded by
`impactIntent` + `keepRange` root moves). Worst per frame 172 mm, ~0.6 m total in 8 s. Needs: blend the
swing foot from its anchor at take-off, keep the anchor until the lift is visible, and turn reach overflow
into a step.

Scripts: `slide-frames.cjs`, `step-trace.cjs`, `strip.cjs` (+ `compose.py`). Not a physical-phone check.
