# R15: glove anatomy, boxing boots and target-height uppercuts

The supplied lion screenshot showed the uppercut finishing above the forehead.
The revised wrist loads at (±0.21, 1.34, 0.36) metres and rises to
(±0.12, 1.72, 0.64), before pelvis offsets. The knuckles now finish in front
of a face-height target, with the elbow underneath. Existing asymmetric knee,
hip, thorax, shoulder and head coordination remains active. A new height bound
prevents an overhead finish. Direct cheek recovery follows the moving body;
its test uses head-relative height instead of the previous fixed height.

Reference: England Boxing Level 2 Coaching Handbook, page 84:
https://www.englandboxing.org/wp-content/uploads/2022/03/Level-2-Coaching-Handbook-compressed.pdf
Its uppercut coaching points specify knee/leg drive, heel lift, inward palm,
a bent arm, eyes on target and prompt guard recovery. The longer stroke here
is an authored exercise demonstration, not a motion-captured boxer.

Both gloves use a new joined implicit surface, with flatter palm/back,
compact knuckle padding and a much smaller thumb tucked into the palm side.
Right-hand geometry mirrors the left; the transported forearm frame continues
to keep wrists straight and avoid rotation flips. Surfaces build once locally,
using the bundled Three.js implementation. No inference service or external
engine was added.

Replace the pointed ellipsoid shoes with wider rounded boxing boots, joined
instep/heel volumes, taller ankle shafts, crossed laces, eyelets and thin flat
outsoles. The ankle collar follows the shin independently of the pivoting sole,
keeping the calf inside the leather during knee bends. Forward outsole contact
now anchors heel pivots. The old mid-foot
anchor allowed the rigid toe to enter the floor. Tests sample the actual sole
mesh throughout every action, in addition to checking foot IK and contact.

The technique buttons return to a scrollable right-side rail. The canvas gets
its own remaining width, and camera aspect/framing follows that width through
a ResizeObserver. Other settings remain in Controls. Cache versions for the
coach, layout script and CSS are advanced; the app subtitle identifies R15.

Validation: coach, app, workout and layout Node suites; CPU renders of the
actual skinned meshes for uppercut and hook. CPU renders omit browser PBR,
textures and shadows. A generated edit of the selected screenshot was used
only as a visual concept, not as an app screenshot or replacement 3D asset.
