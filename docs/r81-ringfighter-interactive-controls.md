# RingFighter R81 — viewport, direct control and simultaneous contact

Baseline: published `7605fd4` (R80 club redesign). Work isolated in
`feature/ringfighter-manual-controls`, `/workspace/fit-ringfighter`. Other
worktrees and their uncommitted work were preserved. Current remote main and
open pull requests were inspected before implementation and before publication.

## Player-visible changes

- Renamed the app, document title, header and in-world club/ring branding to
  **RingFighter**. Existing stored character/language preferences remain compatible.
- Removed the tall introductory block from phone gameplay. The page fits the
  visible viewport, including Safari viewport-height changes and safe-area insets.
  The arena stays in the workspace and transport stays inside the screen. Setup
  becomes compact; short landscape uses the available width. Settings remain in
  the existing dialog. Desktop retains its training sidebar.
- Added **Watch / Play** directly above the arena. Watch preserves existing
  routines and autonomous bouts. Play gives the selected Lion or Rabbit to the
  user in shadowboxing, heavy bag, dummy, speed bag, sparring and fight modes.
- Play shows lead-side controls on the left and rear-side controls on the right:
  jab/cross, both hooks/uppercuts, slips, roll, guard and directional footwork.
  Speed bag replaces punches with lead/rear taps, doubles and triples, plus
  defence/footwork. Short landscape/portrait arrange each side into two columns
  when needed. Health bars stay clear of the controls.
- Touch/click activates a move immediately when ready. Two following moves can
  form a short combination; unlimited stale input is not buffered. Pause freezes
  the simulation clock. A move press resumes it; seeking, switching equipment or
  changing boxer clears old commands. Commands cannot bypass the bell, a
  knockdown or a finished bout.
- Keyboard in Play: 1–6 punch (or speed-bag strokes), arrows slip/roll/guard,
  A/D step left/right. Space retains pause. Dialogs, form fields, native buttons
  and repeated keydown events do not leak commands into the boxer.
- The sparring opponent has an independent clock; it can attack while the player
  waits. In a fight, only the selected actor's AI decisions are disabled. The
  other fighter, rounds, stamina, judging, knockdowns and reactions remain active.
  Button presses never award landed hits or trigger impact audio themselves.

## Why the hands twisted

A baseline trade grid reproduced an upper-arm change of about 3.14 radians
between adjacent 60 Hz frames, despite passing the old penetration checks.
Repeated collision passes could change the elbow plane, and advancing bodies
left too little striking space. Continuing a scored punch forward then required
large corrective deflections.

The fix preserves the authored elbow reference across coupled contact passes,
parallel-transports it to the corrected reach axis, and bounds normal-induced
roll rather than accumulating it. Boxing range is established before wrist
planning and checked after posing. A registered hit briefly holds then returns
arm and torso to guard together over approximately 235 ms. The target remains
within the original limb lengths; guard orientation follows the forearm.

The new continuity check rejects frame reversals greater than 60 degrees. This
is an engineering regression gate, not a medical joint limit or proof of exact
biomechanics. The measured maximum is about 54 degrees, versus the former near
180-degree reversal. The existing 27 mm bounded-contact threshold is unchanged;
the observed stress-grid maximum is about 12.3 mm. The physics clock remains
60 Hz; an experimental extra substep was discarded after comparison.

## Integration and rollback

`boxing-input.js` is a local command/timeline layer. It feeds the existing
TrainingArena/FightArena pose and collision paths. `LionCoach.update()` gains
optional contact-return and lateral-step inputs; existing callers, custom DQ
skinning, shoulder correction, materials, audio files and model versions remain.
No new hosted service, asset license, model, skeleton or runtime dependency.
The old cached controller/model pair remains available. Versioned local scripts
and the new controls stylesheet avoid stale mixed releases.

Switching to Watch is the immediate behavior fallback. The previous published
commit is the release rollback. This work does not claim completion of the
separate authored face/mane overhaul or a 75/100 realism score.

## Evidence and validation

- 41 Node regression suites pass, including the complete prior suite and new
  command/real-contact integration tests. The real-markup UI test now exercises
  Watch/Play, direct punches and speed-bag input as well as previous controls.
- All JS/CJS syntax checks pass. Per-suite results, hashes and raw logs are in
  `qa/r81/results/`. Unchanged suite results are retained when resuming; changed
  harness tests and the affected fight/character suites were explicitly rerun
  after experiments were removed. Stylesheet-only revisions use the separate
  real-browser layout gate and do not change Node physics results.
- Browser interaction/layout checks cover 393×650 and 393×568 portrait,
  844×390 landscape, and 1100×950 desktop; EN/HE/RU; every practice target; real
  manual contacts; Watch/Play transitions; selected-actor control; and all twelve
  move buttons inside the viewport. A final landscape check also prevents health
  bars being covered by the manual buttons.
- The baseline fight page was 948 CSS px tall in a 650 px viewport, with the
  canvas ending below 800 px. The revised document fits the viewport and keeps
  the primary controls visible.
- The existing 108 paired-move/offset stress cases now also check upper-arm
  continuity, with real contacts and constant-length IK retained.
- `qa/r81/comparison.html` contains actual browser screenshots and matched
  sampled motion. Joint diagnostics hide coat/mane ribbons and scenery to expose
  deformation; they are not beauty renders. Samples are 100 ms apart, not a
  measured real-time FPS result. Production appearance is retained in layout
  screenshots. No generated concept images or user-uploaded videos are proof.

Chromium 155 / software WebGL is the browser environment. **Physical iPhone and
Android performance, audio behavior and thermal testing remain unverified.**
Viewport emulation and CPU test timing do not establish sustained device FPS.
