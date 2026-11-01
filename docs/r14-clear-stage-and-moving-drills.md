# R14: unobstructed practice view and travelling footwork

## Practice view

Move technique buttons, camera views, language/speed/sound, freeze/reset, notes,
model status, drill navigation and challenge entry into a single native Controls
dialog. The main layout keeps a compact exercise label outside the canvas, a
small round/timer strip, Start/Pause and Controls. No routine controls or text
overlay the instructor's head, torso or feet. The rest overlay remains intentional.

Existing IDs and handlers move with their nodes. Controls are translated in the
three supported languages and remain keyboard accessible through the native dialog.

## Movement

Every punch/defence drill now moves its foot contacts: short step-in and recovery
for straights/uppercuts, diagonal/lateral placement for hooks, slips and rolls.
The first foot steps, the supporting foot follows, and recovery reverses the order.
A small additional knee flexion keeps the intended contacts reachable. At least
one foot remains in support during each action. The separate footwork drill retains
its larger forward/backward sequence.

Uppercuts lower the wrist target to 1.40 m during loading and raise it to 1.94 m
before adding the body's offset. The existing hip/trunk turn, leg extension,
forearm alignment and direct guard recovery remain. Tests additionally verify
that the glove/knuckles lead above the elbow during the upward stroke.

These are authored model-specific exercise trajectories, not motion capture or
validated dynamic balance. Software-rendered uppercut and jab poses were inspected.
DOM-level tests verify that only the canvas/rest state stay in the stage and that
the consolidated panel opens/closes and changes language. Live WebGL appearance
and frame rate remain unverified.
