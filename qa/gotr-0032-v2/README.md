# GOTR-0032 v2 / GOTR-0027 — punch drive and smooth hands (mitts and heavy bag)

Branch `agent/punch-drive`; "before" = `37247bc` (v1.87). Headless node at 120 Hz in the real station code (Play, the
Fighter pressing one punch from a settled guard), plus rapid coach-called style sequences (`adventure/story/call-core.js`
pools: 1-4 punches pressed every 0.12 / 0.18 / 0.25 s). Browser pictures: Chromium (SwiftShader), 402x690.

## What was wrong
- In Play the Fighter's technique guard is the "cover" (`guardCover:1`): both gloves sat inside the muzzle and
  `clearOwnFace()` walked them out by 15-27 cm on every tick (guard hand rate-limited to 3.5 cm/tick, striking hand all at
  once, with switches between cheek and forward modes). Result: the guard glove swung ~25 cm at the start and end of every
  punch, the punch started with a hitch (hand moves, stops, then punches), and the uppercut "chamber jump" (27-30 m/s for a
  tick) — `face.cjs`-style logs in this folder's history (`trace.cjs` shows the per-tick table).
- Fitted hooks pulled the authored arc onto the mitt by a growing fraction, so the glove braked into the pad (peak 9-10 m/s
  well before contact, ~5.6-6.8 m/s at contact).
- `ready.z=max(...)` for straights switched on mid-drive and doubled the fist speed in one tick.
- Pre-existing bug for everyone: the folded-reach clamp copied the shoulder into the wrist before reading the offset, so
  the wrist collapsed onto the shoulder for a tick (0.5 m pop of the lead uppercut in rapid sequences).
- Action switches (linked punches, punch → guard) jumped between poses.

## Changes (behind `options.cheekGuard` = the Fighter in mitts, bag, shadow, dummy; not sparring, fights, story)
See `docs/checkpoints/punch-drive.md`. Guard glove to a cover point already clear of the face; striking glove from/to its
open guard; straights reach the shoulder-target line first; smooth maximum for the ready point; hooks shifted onto the
target by one offset fitted at 85 % of the swing, faster hip/rib drive (0.19), quicker return, lead hook turns 1.15x; rear
uppercut loads wider (clear of the muzzle); striking-glove clearance follows a ~14 ms critically damped spring; per-wrist
inertialization of action switches (~0.1 s); folded-reach clamp aliasing fixed (all users).

## Measurements (`measure.cjs`; `before-lion.json` → `after-lion.json`)
Columns: glove speed over the last tick before contact; peak before contact (the old peaks include one-tick pops); elbow
angle at the contact tick; largest hip-line / shoulder-line turn from the guard up to contact; pelvis travel toward the
target; snap-back = contact until the knuckle is within 6 cm of its guard position relative to the head; largest per-tick
velocity change of any knuckle/elbow outside the contact tick and 3 after; same for the guard glove; isolated one-tick
spikes (> 2.5 m/s with both neighbours < half). The rabbit Fighter gives identical numbers (same rig and world-space
targets: `before-rabbit.json`, `after-rabbit.json`). The bag "pop" column is not measured (0).

### lion — mitts (Play, single punch from the guard; before → after)

| punch | contact m/s | peak m/s | elbow° at contact | hip turn° | shoulder turn° | pelvis fwd cm | snap-back ms | max Δv/tick | guard Δv/tick | 1-tick pops | mitt/bag pop |
|---|---|---|---|---|---|---|---|---|---|---|---|
| jab | 12.97 → **9.81** | 15.61 → **9.83** | 164.1 → **164.6** | 15.6 → **15.6** | 25.4 → **25.4** | 14.1 → **14.1** | 258 → **167** | 12.91 → **2.6** | 5.8 → **2.6** | 11 → **0** | 7.9 → **7.9** |
| cross | 11 → **11.04** | 21.97 → **17.2** | 167.4 → **167.4** | 42.4 → **42.4** | 101.1 → **101.1** | 12.1 → **12.1** | 267 → **250** | 23.69 → **6.22** | 5.07 → **1.73** | 5 → **0** | 8.3 → **8.3** |
| hook | 6.83 → **7.74** | 9.14 → **8.07** | 87.3 → **84.2** | 22.5 → **30** | 47.9 → **47.9** | 24.2 → **25** | 367 → **275** | 8.76 → **4.89** | 5.51 → **4.12** | 15 → **3** | 16.4 → **16.4** |
| rear_hook | 5.63 → **7.19** | 20.84 → **9.83** | 93.1 → **88.5** | 34.4 → **34.5** | 87.6 → **87.9** | 30.4 → **30.5** | 342 → **250** | 16.67 → **5.97** | 5.8 → **5.04** | 10 → **5** | 17.4 → **17.5** |
| uppercut | 12.77 → **12.72** | 25.99 → **14.64** | 68 → **68.1** | 12 → **12** | 52.3 → **52.3** | 28 → **28** | 308 → **283** | 24.27 → **2.85** | 5.64 → **1.43** | 10 → **1** | 7.4 → **7.4** |
| rear_uppercut | 8.89 → **8.43** | 24.17 → **13.2** | 93.7 → **94.7** | 17 → **17** | 59.6 → **59.6** | 28.5 → **28.5** | 300 → **317** | 25.96 → **2.96** | 6.27 → **1.83** | 5 → **0** | 7.9 → **7.9** |

Rapid coach-called sequences (pads):

| press gap | max Δv/tick | p99 | p99.9 | 1-tick pops | refused presses |
|---|---|---|---|---|---|
| 0.12 s | 29.87 → **8.08** | 13.63 → **3.16** | 24.45 → **6.17** | 287 → **46** | 3 → 3 |
| 0.18 s | 29.87 → **8.08** | 13.63 → **3.14** | 24.47 → **6.17** | 309 → **48** | 1 → 1 |
| 0.25 s | 29.87 → **8.08** | 13.63 → **3.14** | 24.47 → **6.17** | 309 → **48** | 1 → 1 |

### lion — heavy bag (Play, single punch from the guard; before → after)

| punch | contact m/s | peak m/s | elbow° at contact | hip turn° | shoulder turn° | pelvis fwd cm | snap-back ms | max Δv/tick | guard Δv/tick | 1-tick pops | mitt/bag pop |
|---|---|---|---|---|---|---|---|---|---|---|---|
| jab | 16.51 → **11.76** | 20.21 → **11.76** | 154.1 → **130.3** | 15.7 → **15.6** | 25.4 → **24.2** | 17.9 → **17** | 267 → **150** | 16.64 → **3.04** | 6.5 → **1.44** | 11 → **1** | 0 → **0** |
| cross | 16.95 → **16.02** | 24.56 → **21.73** | 124.3 → **122.5** | 42.5 → **42.5** | 99.5 → **99.5** | 17.7 → **17.7** | 300 → **175** | 25.76 → **8.56** | 6.04 → **1.84** | 6 → **1** | 0 → **0** |
| hook | 6.19 → **6.76** | 14.44 → **10.64** | 77 → **94** | 25 → **32.6** | 47.3 → **51.2** | 37.2 → **38** | 383 → **267** | 15.19 → **4.34** | 5.99 → **3.65** | 17 → **4** | 0 → **0** |
| rear_hook | 6.19 → **6.38** | 23.71 → **12.58** | 79.3 → **89.7** | 33.2 → **33.7** | 85.4 → **86.4** | 37.9 → **38** | 367 → **233** | 18.8 → **4.78** | 4.55 → **4.78** | 8 → **4** | 0 → **0** |
| uppercut | 6.43 → **6.3** | 25 → **13.46** | 85.6 → **85.9** | 11.3 → **11.3** | 48.7 → **48.7** | 48.2 → **48.2** | 292 → **258** | 12.8 → **3.8** | 6.73 → **1.67** | 6 → **0** | 0 → **0** |
| rear_uppercut | 7.51 → **6.92** | 26.24 → **12.05** | 101.1 → **99.6** | 17 → **17** | 59.9 → **59.9** | 48.2 → **48.2** | 308 → **258** | 28.06 → **3** | 5.83 → **2.02** | 7 → **0** | 0 → **0** |

Rapid coach-called sequences (heavy):

| press gap | max Δv/tick | p99 | p99.9 | 1-tick pops | refused presses |
|---|---|---|---|---|---|
| 0.12 s | 31.47 → **9.67** | 13.2 → **4.05** | 26.77 → **8.13** | 288 → **76** | 3 → 3 |
| 0.18 s | 38.3 → **8.56** | 13.43 → **3.92** | 26.79 → **7.3** | 308 → **74** | 1 → 1 |
| 0.25 s | 38.3 → **8.56** | 13.25 → **3.89** | 26.79 → **7.3** | 322 → **78** | 0 → 0 |


## Guard glove vs. the face (`guard-cheek.cjs`, bag, automatic station without face clearance)
| | guard knuckles to cheek point | guard glove inside the face |
|---|---|---|
| jab before → after | 0.142 → 0.347 m | 7.0 → **0.0 cm** |
| cross before → after | 0.195 → 0.409 m | 4.3 → **0.0 cm** |

`tests/heavy-reference.test.cjs` therefore checks "in front of the face, outside it" (< 0.45 m and < 0.5 cm inside)
instead of the old 0.20 m, which was only met with the glove inside the muzzle.

## Pictures
`pads-before-after.webp`, `heavy-before-after.webp` (`strips.cjs` + `compose.py`): per punch a before row and an after row,
frames 10/18/24/30/44 ticks (120 Hz) after the press, input through `window.fighterPad.press`. The skins are synced
before each picture (the mitt station defers them between render ticks, which is why the 2026-11-11 attempt showed no
motion). What they show: the rear glove stays at the chin during the jab, hook and uppercut instead of jumping in front
of the muzzle; the lead glove comes back to the face during the cross; hooks land with the trunk turned. At the bag (camera behind the Fighter, small figure) before and after look almost
the same in stills; the difference there is in the per-tick numbers. Stills do not show speed; the tables do.

## Not done / limits
- Hooks reach 7.2-7.7 m/s at the mitt (target 8-10); jab, cross and uppercut hip turn unchanged; the bag jab meets the
  bag at elbow 130° (154° before), it still extends to 174° in contact.
- Fights, sparring and story scenes keep the old paths (`cheekGuard` off); fight 120 Hz interpolation and phone GPU cost
  (GOTR-0027) untouched. No physical phone; headless timings on a shared, loaded machine.
