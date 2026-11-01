# R20: glove anatomy, garment binding and smoother equipment drills

## Closed-fist gloves

Replace the rounded rectangular block with a smooth loft: a domed knuckle crown,
tapered back of the hand, a recessed palm, a curled finger pocket and one attached
curved thumb. The thumb bends across the palm and is mirrored on the other hand.
There are no individual extended fingers or independent finger bars. A flattened
oval cuff, rolled binding, projected pocket/thumb seams, merged stitches and palm
ventilation details distinguish each surface. Surface details follow compression.
The leading knuckle position and wrist axis stay compatible with contact planning.

Geometry is generated locally and cached for the second character. Each hand
clones its own geometry so compression remains independent. Stitches are merged
into one mesh per glove to limit extra draw calls. No runtime model service,
texture CDN or external engine was added.

## Timing and contact

R19's piecewise quintic phase map stopped at every internal phase knot and then
rushed the entire body to the next. R20 uses a continuous map with clock speed
between approximately 0.84 and 1.16 times the authored cadence. The original
pelvis/shoulder/hand delay is retained. The heavy bag still receives one
velocity-dependent impact impulse and subsequent compliant contact forces.

The committed heavy-bag knuckle aim permits up to 70 mm of combined padding
entry, subject to arm reach and bag motion. Foam compression is anchored beyond
the wrist: at full pressure the crown flattens approximately 36 mm, spreads
laterally, and leaves the cuff stable. Maximum local bag indentation is 40 mm;
the actual indentation follows contact penetration and release. The short visual
compression tail now derives from actual penetration rather than a large
speed-triggered squash at first shallow touch. These are animation parameters,
not a calibrated physical measurement of boxing equipment.

## Raised arms and shorts

Reduce arm influence on the lower lateral ribs. A local per-vertex mix of linear
and dual-quaternion skinning reduces the axillary volume bulge while preserving
DQ deformation at the shoulder cap and arm bellies. Normals, visible rendering,
shadow passes and CPU pose QA use the same blend. This improves the authored
rig; it does not constitute a production anatomical muscle simulation.

Rebuild the shorts with a continuous crotch saddle and two separate leg tubes,
with sufficient clearance around the thighs. Remove the waist/hem end caps and
render both fabric sides. Blend the centre seam continuously under the pelvis.
All garment vertices bind exclusively to the pelvis and thighs. The old shared
body-classification rule could assign wide cloth panels to torso/arm bones,
which pulled fabric out of place and exposed the body underneath.

## Disappearing bag regression

R19 repeated uppercuts became invalid at 2.841666... seconds in the deterministic
120 Hz reproduction. The smoothstep polynomial returned 1.000000000000001;
`pow(1 - amount, 1/3)` then produced NaN, corrupting the arm and bag response.
Bound easing/target weights to [0,1] and use `cbrt` for the correction weight.
An eight-second repeated-contact regression now checks finite hands and bag
state throughout, including the original failing tick.

## Verification and limits

Eleven Node suites cover the original movement/controls, all six bag strikes,
contact compression, misses, seeded sparring, frame-rate convergence, garment
bindings and boundaries, mirrored thumbs, fixed cuffs, hybrid skinning, and the
repeated-uppercut failure. Garment topology has exactly three boundary loops:
one waist and two hems; any other open boundary fails the test.

`qa/render-gloves.cjs` inspects actual palm/back/thumb/knuckle/compressed geometry.
`qa/render-model.cjs ... tailoring` checks front/side/back raised arms and strides.
`qa/render-arena.cjs ... power` checks load/contact/recovery and target coasting.
These CPU diagnostics reproduce vertex deformation but omit browser textures,
PBR shading and shadows. The available cloud browser has no WebGL context, so
final GPU appearance remains unverified there.

References used for anatomy and skinning context:

- Everlast, Classic Boxing Gloves, secured thumb and ergonomic grip bar:
  https://www.everlast.com/products/classic-boxing-gloves
- Kavan et al., Skinning with Dual Quaternions:
  https://users.cs.utah.edu/~ladislav/kavan07skinning/kavan07skinning.html
- Autodesk, Bind Skin Options, per-vertex blend of linear and DQ skinning:
  https://help.autodesk.com/cloudhelp/2027/ENU/Maya-CharacterAnimation/files/GUID-CF2C698A-44BB-4CA0-BCB9-DB36500DA812.htm

No manufacturer assets or third-party skinning runtime are embedded.
