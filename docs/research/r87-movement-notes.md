# R87 research and implementation decisions — 2026-11-06

Read before implementation. Baseline f7a9673. No new motion asset is imported.

The repository's prior coaching review (`docs/motion-review.md`) cites England
Boxing Level 1 pp73–75 / Level 2 pp80–83, Boxing Canada beginner instruction
pp49–52/57, Boxing Scotland trunk defence, and Dinu/Louis' segment-contribution
study. It records floor/hip/trunk initiation, distinct straight/hook/uppercut
mechanics, neutral wrists, chin protection, coordinated knee/trunk defence and
prompt guard recovery. Those prior notes were reviewed here; the external
handbooks/paper were not newly retrieved through this restricted network.

Newly retrieved and read:
- https://github.com/Dareczin/boxing_biomechanics (README): Noraxon event slicing
  and speed-analysis workflow. It supplies no drop-in boxing animation and does
  not establish our avatar's joint angles or timings.
- https://github.com/orangeduck/Motion-Matching (README and controller.cpp):
  code/data-driven displacement, inertial transitions and contact/foot-lock
  implementation. Transferable lesson: coordinate root displacement with stance
  contacts and smooth transitions. No code/dataset imported. Its animation data
  has a separate noncommercial/no-derivatives licence and is not used here.

Engineering decisions (authored approximations, not motion capture):
1. Sustained high guard, side covers, body cover and a compact rear-hand catch
   use the existing skeleton/IK and real collision geometry. No automatic block
   or invulnerability bonus. Defensive reads should match the incoming attack.
2. A clear load/drive/strike/recovery distinction: pelvis/trunk/shoulder drive
   can precede uppercut hand acceleration slightly. Preserve the verified wrist
   path, forearm alignment and neutral gaze; do not bow the head out of sight.
   Existing pose-linked muscles, hair, face and shadows follow the same clock.
3. Longer supported ring steps; first foot chosen by travel direction; distinct
   swing/support phases. Settle to double support instead of freezing midair or
   abruptly deleting stride offsets when an attack starts. Remain inside ropes.
4. One-press player combinations share the real action/contact state machine,
   use varied per-move timing, retain independent AI, and are cancelled by
   counts/mode changes. Defence cancels remaining commands without teleporting
   an active punching arm. Do not buffer repeated long macros.
5. Validate actual geometry/contacts, pause/seek, both species and sustained
   guard coverage; inspect app-rendered defence and stepping sequences. Tests
   cannot certify human biomechanics or sustained physical-phone performance.
