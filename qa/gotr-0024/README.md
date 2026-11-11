# GOTR-0024 (punches read as hits) and GOTR-0025 (faster punches and combinations)

Base `031f8a6`, branch `agent/punch-feel`. Everything is measured headlessly in
the real game modules (`measure.cjs`, `staged.cjs`) and rendered in the real app
in headless Chromium with software WebGL (`render.cjs`). No physical phone was
tested. GOTR-0025 evidence lives here too (`qa/gotr-0025/README.md` points here).

## Why a landed punch read as a touch (measured, before)

1. **The target held a pose instead of snapping.** The hit reaction
   (`fight-arena.js reaction()`) was `clamp(severity*2.1*…, 0, 1.25)`: every
   clean hit saturated it. Staged clean cross (`staged.cjs --trace cross`): the
   receiver's head jumped 17 cm and 23° in ONE frame and then stayed frozen at
   exactly 22.6° for ~0.4 s before easing back. Every clean punch, jab or
   uppercut, produced the same frozen lean — a pose switch, not an impact.
2. **The glove eased out before contact.** The straight's hand envelope was
   `smooth(x^1.35)` (zero velocity at full extension). Since GOTR-0018 straights
   land in the last centimetres of the extension, where that curve had slowed to
   ~20% of its peak: staged cross 9.0 → 5.3 → 1.1 m/s in the last three frames
   before contact. The fight compensated by *scoring* half the earlier drive, but
   visually the glove arrived nearly stopped. Hooks were similar (drive curve at
   ~50% of peak at contact).
3. **Blocked punches did nothing visible.** A blocked jab moved the receiver's
   guard glove 1 mm (guard reaction `amount*.30` into crouch only).
4. **Slow and idle.** Fight straights took 0.32-0.37 s to land; every punch then
   idled at the guard for the last ~18% of its duration (hand back at phase
   ~0.8 of 1.0), so combinations reset fully between punches.

## What changed

- `boxing-routines.js` — shared **punch clock** `punchPhase(r)`: the drive into
  the target and the short hold after it run 1.25x faster; the return to guard
  absorbs the saved time (C1 blend after contact), so a single punch keeps its
  total duration and a readable recovery. `punchSpan()` gives the end of a
  **linked** punch (phase 0.80, hand already back at the guard).
- `fight-arena.js` (Watch and Play fights) — `punchSpec()` applies the clock to
  every punch and links a punch when the next queued/planned move is a punch
  (AI plan, player combo or queued presses): the sim action ends once the hand
  is home, so the next punch starts from the return path. Reaction is now a
  snap: peak ~45 ms after contact, proportional to the blow
  (`severity*1.05`, cap 1.2; jab < cross < heavy hooks), back near zero in
  ~0.4 s. Blocked blows get a baseline guard jolt. Reach-controller per-frame
  rate .022 → .028 m (scaled with the faster clock, otherwise straights reached
  full extension a frame before the controller closed the distance).
- `boxing-input.js` (Play training, heavy bag, mitts, Academy lessons) — same
  clock and linking for queued punches; no change to queue size, FIFO order or
  combo definitions.
- `boxing-coach-v2.js` — straights use a **cruise** envelope: smooth start,
  constant speed, stop in the last ~6% of the time (on the target or at
  lockout). Targeted hooks use it for the body drive and arc. Head snap now
  depends on punch type (straights/uppercuts lift the chin, hooks turn and tilt
  the head); blocked blows drive the struck glove ~4-6 cm back towards the chin
  and rock the shoulders.

Not changed: contact detection, damage formula, `boxing-fight.js` (owned by
`burst`), heavy-bag / mitt choreography, sound code (`index.html`; louder hits
come only from the measured contact speed it already uses).

## Before / after

Full table: `table.md` (`node qa/gotr-0024/table.cjs`), raw data `before.json`
/ `after.json`, seeds 3, 11, 42, quick preset. Medians. `after.json` was taken
with a clean-hit reaction scale of `severity*.78`, raised to `*1.05` afterwards
(head-reaction columns in `table.md` are therefore conservative; timing and
combination numbers are unaffected).

| case | start→contact (jab / cross / hook / uppercuts) s | combination |
|---|---|---|
| Watch fight | .32/.34/.33/.42 → .28/.28/.28/.38 | linked punches start-to-start 1.03 → .83 s |
| Play fight, lion | .37/.34/.35/.46-.48 → .30/.29/.30/.38-.40 | — |
| Play fight, rabbit | .37/.35/.36/.42-.47 → .32/.28/.30/.38-.39 | — |
| Play combos, lion | — | one-two 1.40 → 1.25 s, one-two-hook 2.34 → 2.05 s, uppercut-hook-cross 2.78 → 2.36 s; start-to-start .77 → .62 s |
| Play combos, rabbit | — | 1.41 → 1.25, 2.37 → 2.08, 2.80 → 2.35 s; start-to-start .79 → .63 s |
| Heavy bag (Play, lion) | .21/.23/.28/.34-.35 → .17/.19/.24/.28-.29 | training combo_three 1.96 → 1.68 s (computed, test-checked) |
| Mitts (Play, lion) | .25/.28/.34/.35 → .20/.23/.30/.29 | |

Staged clean straight to an open head (`staged.cjs`, lion, seed 74):

| | before | after |
|---|---|---|
| cross: start → contact | 0.35 s | 0.283 s |
| cross: glove speed in the frame before contact | 5.3 m/s (1.1 in the contact frame) | 7.6 m/s (4.5) |
| jab: glove speed before contact | — | 7.5 m/s |
| head after clean hit | 17 cm / 23° in 1 frame, frozen ~0.4 s | same peak in 2-3 frames, decays from ~70 ms, < half by 0.45 s |
| blocked jab: guard glove jolt | 0.1 cm | 2.9 cm (cross 3.6 cm) |

Mitts straights: glove before contact 5.5/4.5 → 8.1/7.0 m/s, closing 4.5/3.8 →
5.0/5.0 m/s. In real (unstaged) fights straights already met the target with
~8-10 m/s on the frame before contact, so that column barely changes there; the
visible gain in fights is the snap/recover target, the guard jolt and the timing.

## Balance (honest)

Who wins is a chaotic function of timing. Same seeds: Watch 3/3 same winner;
Play lion 3/3; Play rabbit 3/3; Play combos lion 1/3 and rabbit 2/3 (2 of 3
player-side wins either way). Punches thrown rise with the shorter
combinations (Watch 56 → 66 over three bouts, combos 97 → 107 / 92 → 104);
clean landed 21 → 22 (Watch), 32 → 33, 26 → 34. No damage constants changed;
higher volume is the intended effect of faster combinations.

## Frames (`render.cjs`, `strips.py`)

`cross-before-after.webp`, `hook-before-after.webp`: frames -2, -1, 0, +2, +5,
+12 (60 Hz) around the contact frame, staged clean head shot, side view.
`onetwo-before-after.webp`: player one-two every 0.15 s from the press.
Contact frame in the real app: cross 20 → 17 (0.333 → 0.283 s), hook 19 → 16
(0.317 → 0.267 s); no page errors either version.

What the frames show (looked at, not just asserted): the one-two is clearly
tighter — the cross is fully extended at 0.75 s after vs 0.90 s before, with
the jab at the same 0.30 s. In the cross/hook strips the striking arm and
timing differences are visible, but the receiver's head snap is hard to read in
stills at this side angle because the rabbit's own raised gloves cover its face
and the change is mostly temporal (snap and recover instead of jump and hold),
which single frames do not show well; the staged numbers above are the better
evidence for that part. PNG frames are not committed (regenerate with
`render.cjs`, then `strips.py`).

## Tests

- New `tests/punch-feel.test.cjs`: punch clock monotonic / same total / ≥18%
  sooner to contact phase; staged jab and cross land ≤ 0.30 s with ≥ 6 m/s
  glove speed before contact and ≥ 4.5 m/s scored speed, head snaps ≥ 15° and
  is below half of that by 0.45 s; blocked jab jolts the guard ≥ 2 cm;
  training combo_three < 90% of its old 1.96 s; fight one-two ≥ 0.10 s shorter
  and the cross starts from the jab's return.
- `tests/coach.test.cjs` checks the solo (shadow) hook arc between phases .23
  and .48; the cruise arc is therefore only used for hooks with a target.
- No existing test was edited.

## Left / limits

- Mitt hooks still meet the pad at ~1.1 m/s: the pad is presented where the
  hook arrives at the end of its arc (mitt choreography in `career-drills.js` /
  `training-arena.js`, outside this change).
- No camera impulse and no new impact sound (sound lives in `index.html`).
- `separateTorso()` still reads the raw sim phase for its preparation weight
  (smooth, minor).
