# GOTR-0027 — hand motion not smooth: measurements (no code fix in this slice)

## 1. The owner's recordings (`recording-diffs.py`, 160×160 grey crop of the fighters)
- Heavy bag (`fcde4182…mp4`, 60 fps capture, 463 frames): 100 identical consecutive pairs; 32 held frames sit
  between two moving frames, i.e. dropped frames *during* motion. Punch stretches read like `oO#OO#O#oo#o`
  (30 fps bursts), idle stretches mostly run at 60 fps.
- Sparring (`1a09cbae…mov`, 312 frames): 165 identical pairs; the pattern is `##O##O##O` and `#O#O` for most of
  the clip, i.e. **20–30 fps sustained**. Held frames, not pose maths, dominate what the owner sees.

## 2. Simulation time and frame schedule (`measure.cjs` → `before.json`)
Each mode was driven headlessly at steady 60 Hz, at a phone-like schedule (70% 16.7 ms, 20% 33.3 ms, 10% 50 ms)
and at 120 Hz. Pose time vs. display time (“lag jitter”):
- Shadow, sparring: pose is evaluated at the exact display time — jitter 0 at every schedule.
- Heavy bag (120 Hz ticks), mitts (`FixedStepClock` 120 Hz), fights (60 Hz ticks): jitter 0 ms at 60 Hz and at
  the phone schedule, because `framePace()` snaps deltas to whole refresh periods. A late frame advances by the
  real elapsed time (2 or 3 periods): correct, not a double jump.
- Fights on a 120 Hz display: jitter 4.17 ms and every second frame repeats the previous pose (60 Hz ticks are
  not interpolated). Affects 90/120/144 Hz screens, not a 60 Hz iPhone Safari.

## 3. CPU per update (node, this server; glove/bag padding on the GPU as in the browser)
heavy bag p50 2.5 ms / p90 4.3 ms; sparring ~3 ms / p95 6–7 ms; mitts ~6 ms; **fight 8–11 ms p50, p95 12–20 ms**
(two rigs, `resolveTrades`, `stabilizeBends`, `clearOwnFaces`, repeated `syncSkin`/`updateMatrixWorld`).
The heavy-bag JS cost is small, so its dropped frames on the phone are GPU/compositing-bound; the fight's JS alone
uses half of a 16.7 ms budget. Profiles: `profile.cjs` + `profile-summary.cjs`.

## 4. Pose discontinuities (glove velocity change per frame, `jumps.cjs`)
- Shadow: max |Δv| 2.2 m/s per 8.3 ms tick; heavy bag 5.1 (contact stops on the bag); fights 12.7–14.2 per 60 Hz
  tick at contact.
- **Mitts: a real glitch.** During the mitt rear hook the lead (guard) hand jumps 23 cm for a single 120 Hz tick
  and back (|Δv| 58 m/s; e.g. t = 5.008, 5.033, 5.125 s). `flip-probe.cjs` shows the raw arm solve puts the lead
  glove at the muzzle; `clearOwnFace()` then walks it ~23 cm away on most ticks but does nothing on ticks where the
  touch is under its 0.2 mm threshold. Two fixes were tried and reverted (only-inside-volume weighting; capping the
  walk to 3× the first penetration): the flip went from 58 → 38 m/s but did not disappear. Root cause still open.
- Sparring: |Δv| up to 16 m/s at contacts (glove constraint against the partner).

## What is left (not done)
- Mitt guard flicker above (P1, a visible one-frame flicker of the lead glove).
- Render interpolation of the 60 Hz fight tick for >60 Hz displays (`BoxingPose.PoseFrame.interpolate` exists).
- Fight CPU cost (8–11 ms) and phone GPU cost; the adaptive ladder needs ≥ 3 s windows + 3 s dwell before it
  drops a level. Recommended next: start at level 2 on coarse-pointer DPR ≥ 2 screens and evaluate downward
  steps after 1.5 s. Not changed here (no phone to verify).
No physical phone was available; all numbers are headless.
