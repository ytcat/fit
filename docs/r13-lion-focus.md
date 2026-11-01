# R13: focus on one lion and a larger visual revision

Removed Saved avatar and local avatar upload controls from the interface and
their UI handlers. Existing stored uploads are not deleted. The built-in lion
remains the default.

## Character

- Broad, layered mane with expanded side, crown, nape and rear coverage.
- Consistent 10% reduction in skull/face dimensions, including attached facial
  parts, against the fuller mane and athletic torso.
- Wider upper torso, tapered waist and stronger tonal separation at sculpted
  pectoral boundaries; warm gold fur, lighter chest/muzzle and dark brow detail.
- View-aware camera framing: use a posed motion envelope instead of the spread-arm rest mesh bounds. Reframe when switching front/profile/back, leaving more of the portrait screen for the instructor.

## Coordination

Combination punches now use a one-second cadence with the inactive tail trimmed
from each action. Individual techniques retain the deliberate 1.22-second reset.
A small coordinated settling action passes through the pelvis and constrained
legs during recovery; guard hands follow the head. Mane response is zero when
the character settles, avoiding a hair jump at combination boundaries.

The motions remain authored kinematics. No new neural model or captured-human
animation has been added. Existing joint/foot/glove tests are retained; new tests
check body-point continuity across every combination boundary and removal of
alternate-avatar controls. Front/rear and uppercut software pose renders were
inspected. Live WebGL appearance and device frame rate remain unverified.
