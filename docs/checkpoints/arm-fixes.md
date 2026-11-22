# Checkpoint: arm-fixes (branch `agent/arm-fixes`)

Base: `a42fa83` (v1.91 candidate, `claude/ecstatic-clarke-9as2ak`). Not merged, not released; no version bump (only the
`?v=` strings of changed files in `index.html` and `offline-manifest.json`, regenerated). No PR.

## Asked (PR #35 notes from the owner's other assistant)
1. Otto's shop: after buying, the Fighter reaches out to the side and up to support the heavy bag on his shoulder, elbow
   out (not folded behind the torso); a reachable hand-to-bag contact before the bag moves; hand and bag together through
   lift, settle and the first steps; no wrist jump, shoulder twist, pass-through or teleport. Lion and Rabbit, side and 3/4.
2. Referee's victory hand raise: the whole pickup, lift, hold and release; grip and wrist aligned; natural shoulder motion;
   elbow in its natural bend plane (not folding backward); mesh pinch checked separately. Lion and Rabbit, phone and close-up.

## What changed
- `adventure/story/market-core.js` (shop film 35.5 -> 39.1 s, buy point and lines before it unchanged): after "Deal!" he
  steps to the display (bag 0.40 m ahead, 0.47 m to his right), reaches (24.95 s, 1.1 s), knees bend (26.0), "Lift with
  your legs!" (26.0, tap), lift 26.9-27.9, settle, then 16 walking steps round half a circle to the door (no turn on the
  spot with the bag), door 33.8, street 33.8-39.1. Otto steps out of his way. New pickup camera shot (from behind his right).
- `adventure/story/market-sets.js` `CARRY`: bag pose as a function of time (display -> unhook -> tipping arc -> shoulder,
  riding the chest); the hand is a fixed spot on the leather (outer side, 85 deg from the top, 14 cm forward), wrist
  `HAND_R` = r + 6.5 cm off the axis; the reach path curves round the outside of the bag; elbow pole out and down; head tilts away.
- `adventure/story/dream-pose.js`: `reach[side]` may be an object (exact contact, weight `w`, pole/palm/turn/paw; `at` may be
  a function evaluated after the trunk is posed); `reach.tilt`; body-clearance pole push proportional to the intrusion; the
  clearance push eased in/out (it popped for single frames); palm/pole smoothed by turning (a lerp through zero flipped the
  hand); continuous glove roll (opt-in `orientGlove(..., roll)`); `DreamPose.restOf` exported.
- `boxing-coach-v2.js`: the winner's raised wrist travels on an arc (spherical Bezier) out to the side and up, the arm opening,
  pole out/down -> elbow out at the top, top 9 cm toward the referee; `orientGlove(side, turn, palm, roll)` optional roll memory.
- `fight-referee.js`: `RhinoReferee.RAISE` / `raiseAt(t)` (reach 0-0.5 s, lift 0.55-2.05 s, hold, release 5.4-6.2 s) and
  `context.hold` (the hand reaches to the grip and back, turning onto the forearm line).
- `fight-arena.js`: uses `raiseAt` for the ceremony; continuous glove roll in `stabilizeBends`.
- `adventure/story/gym-fight.js`: Bruno holds the wrist with an exact contact (no smoothing lag), steps in as he reaches (was a
  jump of up to 42 cm).
- `sunday-punch.js`: Super Punch endings use `raiseAt` + hold; the raise blends from the celebration's hand; the referee
  stands 0.6 m beside the winner (was 0.82: his arm fell 13 cm short of the lion's wrist); the V raise tops at 1.93 m.
- Tests: `tests/otto-carry.test.cjs` (rewritten: plays the pickup on the rig in node), `tests/referee-raise-motion.test.cjs` (new).

## Measurements (60 fps; browser = Chromium SwiftShader 402x690)
Otto carry, lion / rabbit identical within 0.1 except where noted (`otto-carry.cjs` + `phases.cjs`):
| | v1.91 | now |
|---|---|---|
| bag step per frame | 161 cm (appears on the shoulder) | <= 1.7 cm lift, 3.7-4.2 cm walking |
| paw to leather while held | -11.7 (inside) .. +4.8 cm | +0.1 .. +0.8 cm (lift, settle, walk) |
| wrist turn per frame | 45.6 deg | <= 2.9 (lift), 5.8 (the reach) |
| upper-arm twist per frame | 55 deg | <= 2.0 (lift), 7.0 (the reach) |
| elbow (carrying) | back 0.97, 29 cm behind the chest | out 0.57, down 0.8, back <= 0.22, 2-9 cm ahead of the chest |
| body inside the bag | 23 cm (head) | none while carried; 1.9 cm (mane/hood) for a moment in the lift |
| right arm inside the bag | 9.5 cm | sleeve/forearm 3.1-3.8 cm while carried, 6.7 cm briefly in the lift |
Referee raise, ring (node `raise-probe.cjs`, lion / rabbit): grip jump 44 cm -> 3.7 / 3.9 cm per frame; grip held within
0 / 2.3 cm; wrist 8.2 / 20.1 -> 4.6 / 6.0 deg per frame; upper arm 11 / 20 -> 4.3 / 5.7; elbow bend on the way up 150 -> 78 / 88
deg (no fold); at the top the elbow points out (0.98) instead of back (1.0); release 5.4-6.2 s, arm stays up.
Super Punch ring ending (node `super-raise-node.cjs`): held within 1.7 / 1.0 cm (was 14.2 / 0); a 155-178 deg one-frame glove
flip removed. Gym (Bruno, browser `super-raise.cjs gym-plain`): Bruno holds the wrist from 1.3 s (mid-lift) to the story's
cut at 3.2 s (0 cm); before this branch's fix the rising wrist was read as the count and he chopped instead.
Skin pinch (CPU skinning, shoulder/upper-arm triangles under 35 % of their guard area at the top): 611 -> 850 (lion),
534 -> 696 (rabbit); the GPU shoulder correctives are not in this count; the close-ups show no kink (raise-top.webp).

## QA tools (qa/arm-fixes/)
- `otto-carry.cjs <lion|rabbit> <outdir> [from] [to]` (SHOTS=t,t,..): steps the shop film at 60 fps, per-frame contact /
  wrist / shoulder / elbow / penetration measurements, pictures film / side / 3/4 / close; `phases.cjs <json> [before]` sums it up.
- `raise-probe.cjs [out.json]`: node, ring ceremony per frame (grip gap, steps, jumps, twist, elbow direction, skin pinch).
- `raise-browser.cjs <winner> <outdir>`: real app, phone framing with UI and a canvas close-up at TIMES.
- `super-raise-node.cjs [tree]`: Super Punch ring ending in node; `super-raise.cjs <outdir> [cases]`: browser (gym-plain = Bruno).
- `strip.py out scale "label|pattern-with-{t}" ...` (TIMES=...): frame strips. `ROOT=<tree>` serves another checkout (before).
- Evidence: `otto-carry-before-*.webp` (v1.91), `otto-carry-after-*.webp`, `raise-before-after.webp`, `raise-top.webp`.

## Remaining / next
- Integrator: merge with PR #35 (`dream-scenes.js` untouched here, so no conflict expected there); full suite; phone check.
- Not done: the left hand does not help lift the 36 kg bag; the right forearm/sleeve rests up to 3.7 cm into the leather
  while carried (6.7 cm briefly in the lift); Super Punch: the referee's arm still switches pose at the film -> ceremony hand-off
  (pre-existing), one 10.7 deg wrist step when the raise starts.

## Checks (2026-11-22, on 922112f)
- `bash scripts/run-tests.sh -j 2 otto market referee sunday super fight gym dream`: files=31 fails=1
  (`story-clean-gym`: Playwright `locator.fill` timeout; it fails the same way on the v1.91 base `a42fa83` here).
  The first run on 6b6c792 also failed `fight-corner-break` (cornerman paw 0.185 m from the head, limit 0.2): fixed in
  922112f (the eased clearance push no longer applies to exact array reach targets); passes alone and in the rerun.
- `tests/offline-version-match.test.cjs` ok. New/rewritten: `tests/otto-carry.test.cjs`, `tests/referee-raise-motion.test.cjs`.
- Not checked on a phone; pictures from SwiftShader. Next: integrator review, merge with PR #35, full suite, phone check.
