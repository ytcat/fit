# R86 — advanced combinations, planted movement and surface polish

Baseline: published `7a7b7389d171af2317427bd3d2ff37b5de2ce07f`.
Runtime: `88227e373e05344e5d123079670f0c5ce87ae059`.
Work isolated in `/workspace/fit-r86`, `lion/r86-combo-polish`, then the
evidence-only `release/r86-combo-polish` branch. The baseline worktree was left
unchanged. Existing rig, arm frame, assets, contact/scoring, audio and camera
recovery behavior remain authoritative.

## Training and movement

- Twelve advanced **Super** combinations bring the preset total to 40. Each
  includes 8–12 moves, fast straight-punch bursts, measured hooks/uppercuts,
  defensive reads and deliberate lateral exits. All three languages are present.
- Per-move durations vary within each chain. Exit direction and selected slip
  side are explicit authored cues, retained by the seeded variable-delay clock.
  Selecting a faster phrase does not bypass reach, contact or scoring checks.
- Four new speed-bag patterns bring the total to 14: pyramid sprint, switching
  hands with a slip, eight strokes and cover, and fast/slow strokes with a roll.
  They use the existing exercise rail and relevant hand targets.
- Freestyle sometimes generates longer attack phrases before defence/exit.
  Seeded replay remains deterministic; synchronized mode retains its fixed beat.
- Combination phases formerly stopped at 0.86 for every move. A step's trailing
  foot does not finish returning until 0.94, causing a visible reset at the next
  beat. Steps now receive their full phase in preset and variable practice.
  Attacks retain their earlier recovery-tail trimming. Standalone coach combo
  playback now reads the same authored timing as the arena.

## Graphics

Both boxers use a finer, less noisy coat bump; anatomically directed short fur;
woven satin rather than leather grain on shorts; and lower-amplitude leather
grain with nonmetallic, spatially varied roughness on gloves and boots. Texture
generation is deterministic and maps are shared across cached characters.
Roughness/bump textures remain linear data. Rabbit coat colors are unchanged.
Eye highlights are smaller and wet highlights less dominant.

Lion mane roots match the existing corrugated undercoat. Crown fibers sweep
back, cheeks fan down and nape fibers trail the neck; bounded crown curvature
keeps strands above the base. Root/tip color variation replaces unrelated
per-clump hue extremes. Existing cluster count, strip segmentation and 24
spring guides are retained. An initial groom exposed the crown base in actual
renders; root matching and crown clearance were corrected before acceptance.

This is a groom/material improvement, not the separately planned authored head
reconstruction or a verified 75/100 realism result. The face still needs better
authored anatomy, and close-up hair cards can still be seen. No new model, rig,
licensed download, external runtime service or hosted dependency was introduced.

## Validation and limitations

The new advanced-combo suite checks all twelve timing/cue sequences, deterministic
variable replay, full exit completion, speed-bag hands/defence and actual landed,
reachable feet. Existing suites traverse the expanded routine/drill sets with
their original physical reach/contact/own-face and arm-deformation gates.

Browser QA selects every advanced phrase through the real chooser in EN/HE/RU,
uses the fourteen-drill rail and verifies real bag contacts at the new fast
timing. Matched app-rendered screenshots cover both boxers from front/profile/
rear, face close-up, jab and uppercut with shadows enabled. Native phone-sized
camera regression checks retain dragging, pinching and control containment in
all six modes. See [raw evidence and results](../qa/r86/README.md).

Software Chromium/WebGL is used here. Draw/triangle/texture counts are captured
for matching views; they do not establish hardware FPS or thermal performance.
**Physical iPhone/Android performance and Safari behavior remain unverified.**
Rollback is the prior published release, with no data migration required.
