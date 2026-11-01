# R16: continuous practice, training equipment and rabbit partner

## Practice flow

Replace the timed Start Training entry with continuous demonstrations and a
Pause/Resume button. Main-screen controls choose equipment, combinations and
playback speed. The speed menu offers 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×, 2.5×
and 3×. The round/timer strip is hidden. Technique buttons remain in the side
rail; all models are framed within the separate canvas column.

A shared routine registry supplies choreography, labels and animation timing
for 12 combinations. They include double jab–cross; jab, jab, slip, rear
uppercut, roll, cross, hook; attack/roll/counter sequences; inside combinations;
and step-out/re-entry work. The current action and next action are displayed.
The existing language choices remain available.

## Body mechanics

Straights now have more hip/thorax rotation, a small controlled body transfer,
and scapular protraction before the arm reaches extension. Wrists turn later in
the extension. Straight/hook target heights were raised towards the actual
model's chin line. Eyes and the opposite glove continue following the head.

Target work closes distance for bent-arm punches with ordered foot placement.
The pelvis follows the feet's support midpoint; it does not translate the whole
character root. Additional knee flexion keeps both feet reachable during the
longer step. Targeted hooks use a shorter arc endpoint; uppercuts retain their
bent-arm upward path. Shadowboxing keeps full straight-arm reach. Rolls lower
the body farther through the legs so a head-height hook clears the skull.

## Equipment and partner

- Heavy bag: cylindrical leather body, rounded end, reinforced top, four straps,
  overhead hanger and an independent floor frame.
- Freestanding body dummy: joined head/neck/shoulder/torso, facial features,
  anatomical chest/abdomen, adjustable stem with height holes, collar and a broad
  weighted base. Original geometry informed by the familiar BOB category;
  this is not a branded product replica.
- Speed bag: pear-shaped leather bag beneath a swivel and circular rebound board,
  mounted on a floor stand. Selecting it activates alternating circular-hand
  rhythm practice; incompatible punch/combination controls are disabled until
  another target is selected.
- Rabbit: the existing continuous body mesh, dual-quaternion skinning, IK,
  detailed gloves and articulated boxing boots, with grey/white fur, a shorter
  muzzle, white cheek pads, teeth, pink nose and ear lining, tall softly moving
  ears, cotton tail, teal shorts and blue gloves. It is a separate 3D character,
  visible from every camera angle, not a raster overlay.

One target is selected at a time. Equipment reactions are authored damped visual
responses triggered by nearby fists; they are not a rigid-body simulation.
The rabbit uses the same animation clock as the lion. On slip beats it throws
a jab; on roll beats it throws a head-height hook. Other beats hold guard for
the lion's attacks. The menu selects an attack/defence routine when the rabbit
is first chosen. This is choreographed partner training, not an AI combatant.

## Research

England Boxing Coaching Handbook, straight punches: drive the shot with hip
rotation, extend the relaxed arm, turn the wrist near contact, protect the chin
and return to guard:
https://www.englandboxing.org/wp-content/uploads/2022/03/EB_Boxing-Coaching-Handbook-Part-1_v8-002.pdf

Century manufacturer description of BOB's human-shaped vinyl torso, adjustable
height and weighted freestanding base:
https://centurymartialarts.com/collections/bob/products/bob-body-opponent-bag

TITLE manufacturer assembly reference for a speed-bag platform and underside swivel:
https://www.titleboxing.com/blogs/news/how-to-assemble-the-title-fold-away-adjustable-speed-bag-platform

## Validation and limits

The existing coach, app, workout and layout suites remain. New arena tests check
all six punches reaching both bags, reachable stepping feet, shared-clock timing
across all routines, threatening incoming punches clearing the defending head,
portrait/landscape full-body framing, speed-bag hand movement and clean target
removal. New UI tests cover all five target choices, speed selection through 3×,
12 routines, partner default flow, speed-bag restrictions, pause and languages.

Actual scene geometry and skinning were inspected through CPU pose renders.
These omit browser textures, PBR, shadows and antialiasing. The cloud browser
has no WebGL context, so full live GPU playback cannot be verified there.
Application startup now handles that failure with a clear rendering notice;
menus and playback controls still initialize instead of leaving a frozen loading
screen.
All runtime code and assets remain hosted with the app. No external inference
engine, motion service, network speech fallback or paid model was introduced.
