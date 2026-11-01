# R18: lower bag targets, closed-fist gloves and coupled bag movement

## Glove fit and striking surface

Replace the elongated glove bulb with a broader, rounded knuckle block. The
curled-finger volume is shorter and tucked onto the palm side, behind the
leading MCP knuckle surface. The attached thumb remains tucked in and the
wrist opening sits inside the cuff. Both hands share the same anatomical
construction, with mirrored thumbs and independent deformation.

The rig now exports a knuckle centre and a leading striking point from the
actual hand frame. Collision detection uses these points instead of a generic
point along the distal glove. The leading face remains aligned with the
forearm; wrist rotation still comes from forearm pronation. Receiver-glove
collision proxies match the broader knuckle block. Pressure compression and
surface indentation use consistent contact depths rather than allowing the
finger end to lead.

England Boxing's coaching handbook describes contact with the knuckle part of
the closed glove:
https://www.englandboxing.org/wp-content/uploads/2022/03/Level-2-Coaching-Handbook-compressed.pdf

## Target height and range

Heavy-bag drills target its middle band, approximately 1.5–1.6 metres high in
this scene, rather than inheriting the higher opponent-head target. The knees
change level while the spine, shoulder and hip drive remain active. The dummy
has a separate face-height target, and the speed-bag rhythm keeps its higher
working position. Dummy/speed-bag spacing is adjusted for the corrected glove.

The heavy-bag striking point is transformed from the moving bag surface into
the fighter's frame. The wrist target is solved against the leading knuckle
face. For hooks, the target planner intersects the upper-arm reach circle with
possible forearm-normal contact positions on the cylinder. This selects a
feasible contact point instead of bending the wrist to compensate. IK reach
limits remain enforced.

At each new heavy-bag beat, a small additional step can close the distance to
an outgoing bag. The feet and pelvis perform this movement together. The
main bag is darker and the default view shows the contact side, so the red
knuckle pad, cuff and point of contact remain visible.

## Heavy-bag mechanics

The previous one-time tuned wobble is replaced for the heavy bag by sustained
compliant contact. The configured model is a uniform 30 kg cylinder, radius
0.235 m, height 1.15 m, with its centre of mass 0.94 m below the suspension.
These are explicit simulation defaults, not measurements of a real bag.

The transverse moment of inertia is
I = m × (offset² + height²/12 + radius²/4).
The small-angle pendulum frequency follows sqrt(m × g × offset / I).
Damping represents suspension/material losses. Gravity is approximated by this
small-angle response; torsional restoration is also an approximation.

Glove and bag compliance are modelled in series, using configured stiffnesses
of 8,000 and 12,000 N/m, plus relative-velocity damping. At each contact step,
the force depends on compression and on glove velocity relative to the moving
bag contact point. Tangential friction is bounded by the normal load. The
angular impulse is the hit lever arm crossed with force × time, divided by the
bag's inertia. Force continues through contact instead of stopping at the
first touch. Glove compression and bag indentation divide the same overlap.

Kinematics are advanced at no more than 1/120 second intervals during live
heavy-bag playback, with contact substeps no larger than 1/240 second. Small
floating-point tolerances keep exact frame multiples from creating extra
substeps. Camera orbit is excluded from contact velocity. Pausing freezes the
entire coupled response. The bag receives no force while the glove is clear,
and its momentum continues after release.

This is a geometry-driven, compliant animation model, not a calibrated boxing
force measurement or a complete finite-element soft-body simulation. It uses
only bundled app code. The other targets retain their existing local response
models.

Contact-force and lever-arm reference:
https://box2d.org/documentation/md_simulation.html
https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf
No Box2D runtime is imported.

## Validation

Nine Node suites cover the prior functionality plus the new bag mechanics.
Tests verify mass/inertia calculations, force-to-angular-momentum direction,
material depth sharing, a broad knuckle-first surface, straight wrist axes,
lower targets across all six punches, reachable limbs, multi-frame contact
loads, frame-rate consistency, no force without contact, and range-following
footwork. Contact, guard, random-sparring, speed, language and layout checks
remain in place.

The actual skinned geometry was inspected in CPU pose renders, including a
closer view of the glove/bag contact. The cloud browser cannot create a WebGL
context, so these checks do not verify live GPU shading or playback quality.
