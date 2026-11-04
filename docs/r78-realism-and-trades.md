# R78: muscle motion, expressions, real contact boundaries and dry boxing audio

## Simultaneous contact findings

The prior regression threw one attack at a stationary opponent. It did not cover
both closing together. Exhaustive pairs exposed a case where two uppercuts
advanced the torsos into the same space; the old fist-only solve could not make a
forearm clear a torso that already overlapped its shoulder. An offset uppercut
pair produced roughly 122 mm penetration against the body collision envelope.

The new solve bounds torso approach/separation, fits the head/muzzle/chest/abdomen
and shoulder collision envelope to the visible anatomy, and checks the glove,
wrist and lower arm. It separates moving-guard constraints from solid-body
constraints and repeats the coupled solve for both fighters. A point that has
crossed the centre returns toward the entry side, rather than being pushed out
through the opponent's back. Scoring still uses observed contact, captured for
both actors before either scored reaction is processed. Practice partner work
uses the same solid-body/lower-arm protection.

The 108-case regression combines all six punches against all six punches, with
three timing offsets, complete approach/impact/recovery and swapped head/body
targets. It checks both hands and four samples along each lower arm. Maximum
measured overlap was about 21 mm against the collision envelope, within the
padding-scale allowance; the browser's reproduced simultaneous uppercuts measured
about 13 mm. This is an articulated contact constraint, not a full soft-body or
ragdoll simulation and not proof of every possible fight configuration.

## Graphics and visible muscle motion

The continuous skin now has pose-driven muscle correctives: biceps/triceps,
left/right pectorals, quadriceps, calves, abdomen and upper back, plus a lower-jaw
corrective. Elbow flexion changes biceps/triceps recruitment; striking-side
extension recruits the chest; knee loading, heel lift, trunk turn and breathing
change the remaining regions. The body vertices and their normals deform, with
coat roots sharing the deformation. Bones retain their original lengths. This
models visible athletic muscle regions; it is not a physiological simulation of
every individual muscle or fiber.

Facial acting coordinates contact-side eye squint, brow movement around its own
centre, mouth opening, jaw skin, lower lip and recovery. Head impact, body impact,
attack focus and fatigue have different controls. The referee now blinks,
raises its brow slightly on impact and watches the exchange. The rabbit has a
new, reproducibly built body/head surface without the lion ear volumes. This
removes the folded forehead artifacts created by flattening those ears in the
old cross-species vertex morph. Long rabbit ears remain independently articulated.

Materials/details now include woven ring canvas, a printed centre mark, wrapped
rope materials, sewn canvas edges, heavy-bag stitching, stitched speed-bag panels,
a wood-grain rebound board and mounting bolts. Neutral coat lighting from R77 is
preserved. All models, textures and correctives are local original assets; no
paid model, external AI API or second rendering engine was added. The characters
remain authored animal boxers, not photorealistic scanned animals.

## Training variety

There are 24 presets. Random sparring now composes punch phrases rather than
selecting from six hard-coded loops. The new Random combinations choice works
for shadowboxing, bag, dummy and partner practice. It composes attacks, defences
and exits with seeded replay, a steady or variable clock and reset pauses. A
10-minute seeded sample produced 105 distinct phrases. Language/target switching
preserves the selected generated practice mode. This is a boxing grammar, not a
claim of learned tactical intelligence.

## Sound replacement

The disliked high-pitched sound was the game-character effort recording used by
the old audio layer. Current playback replaces both those voices and the
hammer-derived pad/swing sounds with original dry leather impact, air-swing and
unvoiced pressure-release exhalation assets. No animal recording or periodic
vocal pitch sweep is used. The fallback is also air-only. These are designed
Foley, not recordings of a person in pain. Body thuds, claps and the bell retain
their previous recording credits. The build script, CC0 notice and active/legacy
asset mapping are in `scripts/build_boxing_audio.py` and `assets/audio/`.

The actual browser decoded the new 0.25/0.32-second exhalations and 0.16-second
pad clip. A Web Audio offline mix of head/body/bag impacts and air produced finite
output with approximately 0.671 peak and 0.053 RMS, with no leaked playing voices.
This establishes decoding, playback routing and bounded mixing, not an acoustic
match to a specific boxing venue.

## Browser and regression evidence

Actual Chromium/SwiftShader runs passed at 1100×950 and 393×852. They selected
Random combinations through the UI, exercised all four practice target types,
switched all three languages, enabled audio through a trusted tap, ran the
simultaneous uppercut case, checked the detailed ring and native rabbit asset,
and rendered the new impact/air mix. No page or shader errors were reported.
Closeups of the muscles and impact expressions, including the corrected rabbit
forehead, were inspected. Physical iPhone/Safari testing, device frame-rate
benchmarks and imported mocap remain outside this validation.

All 32 CPU regression suites passed, including the new native-rabbit anatomy,
expression, generated-training, non-tonal Foley and 108-case trade tests. Syntax
and whitespace checks passed. The final focused controls check also passed after
adding a generated-phrase indicator. These checks cover authored geometry and
playback behavior; they do not establish biological accuracy or physical-device
performance.

A concurrent upstream mobile-fur optimization was integrated rather than
replaced. The new anatomy and material pipeline retains its smaller short-coat
microgeometry tier on phones. Browser-global guards keep authoring/headless
checks working without `navigator` or `screen`. Focused avatar/anatomy tests,
including a run with Node's global navigator disabled, passed after integration.
The desktop and phone-size browser suite passed again, with an iPhone user agent
exercising the compact-coat path. This is still Chromium testing, not physical
Safari testing.
