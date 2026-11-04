# R76 contact, avatar and phone-audio review

## Findings and changes

The fight controller recorded a score at contact but continued to render the
unconstrained authored fist for the rest of that action. A recorded action then
skipped further contact tests. Both fighters now pose before an IK contact pass
constrains all four rendered gloves throughout impact, follow-through and return.
Padding overlap is bounded to about 18 mm against the scene collision surfaces;
this is a compliant character constraint, not a full soft-body simulation. A
12-strike/target regression observed a maximum overlap under 18 mm while retaining
real body hits and blocks. Fist/forearm alignment is preserved by the same
anatomical glove orientation after each solve.

The root recoil sign was reversed: its small translation moved a receiving boxer
toward the striker. It now moves away. Head reactions rise faster and remain
visible longer. Bout strikes use stronger hip/trunk drive. Uppercuts use the
actual supplied wrist target; the previous `upperWristHeight` option was unused.
Head-targeted uppercuts chamber near the striker, avoiding an early chest sweep.
A valid guard can still block them. No scheduled hit or guaranteed head strike is
invented. Contact direction, location and normal also drive local skin compression
and cumulative, side-specific facial bruising. Blocks do not bruise a face.

The raised-arm fold was confirmed in rendered closeups. The new GPU/CPU shoulder
correction uses a smooth union of the posed chest, deltoid and upper arm. Its
projection follows the smooth field normal with its total displacement bounded
to 35 mm, avoiding an unstable large correction through a joint.
Position and shadow passes share the correction. New geometry checks cover all
six strikes on lion and rabbit. This is an authored corrective surface, not an
imported anatomical model or full muscle solver.

Short coat fibers now share the boxing skeleton and root attachment weights.
The generated lion has about 19,000 short fibers; the rabbit about 25,000. Bounded
bone-motion lag bends their tips while roots remain attached. The mane retains
its existing inertial guides. Pause, seeks and parent changes reset/freeze inertia
appropriately. Facial details retain their attachment instead of translating
individually into the skull during a hit. Eye blinks target explicitly marked eye
parts. Feline/rabbit noses and muzzle details were refined. The rhino has a longer,
broader muzzle, lateral inset eyes, orbital ridges, smaller ears and backward-
curving nasal horns. Facial details are projected onto its actual sculpt surface,
so nostrils, mouth folds and eyes do not float at guessed depths.

## Mobile sound

The old once-only pointer-down listener could leave iOS audio suspended with no
later activation attempt. Sound now unlocks synchronously from pointer-up,
touch-end and click gestures; a visible stage button shows the activation state.
It retries after suspension/interruption, supports callback-only audio decoding,
keeps successful samples when one download fails, and requests Safari's playback
audio session where supported. A mock Safari lifecycle test and trusted touch
browser tests cover first activation, mute, resume and sample decoding. This is
not a claim of testing on a physical iPhone; a device's speaker/OS volume remains
outside the application.

## Training variety

Six speed-bag drills use real wrist trajectories and contact events: alternating,
lead hand, rear hand, doubles, triples and build/recover intervals. Playback speed
and variable/steady practice timing still apply. The combination menu now also
contains four authored tempo-change sequences, including 0.48-second double jabs
followed by a 1.30-second uppercut. Each move has its own duration; changing the
whole-app playback rate scales the complete sequence without erasing that ratio.

## Free tool/model investigation

Reviewed the Khronos glTF Sample Assets Fox model metadata:
https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox
The mesh is CC0, with CC BY 4.0 rig/animation/conversion credits. Its quadruped
skeleton and locomotion clips are not directly compatible with these biped boxing
characters. It was not imported or advertised as a drop-in realistic boxer.

Reviewed Babylon.js's open-source FurMaterial and shell-generation implementation:
https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/materials/src/fur/furMaterial.ts
It creates multiple shell meshes and depends on Babylon's renderer. This app
retains Three.js and uses original bone-attached fibers to avoid adding a second
3D engine or repeated full-body shells on mobile. No external model or fur source
code was copied, and no paid service, AI API or new runtime dependency is used.

The characters remain procedural animal boxers. These changes improve contact,
anatomy and surface detail; they do not establish photorealism, mocap retargeting,
validated human impact biomechanics or physical-phone performance.

## Validation

All 28 CPU regression suites passed. After the final bounded shoulder and bruise
placement refinements, the focused avatar-surface, complete contact/recovery and
audio tests passed again. JavaScript syntax and whitespace checks passed.

The R76 Playwright suite passed in actual Chromium/SwiftShader at 1100×950 and
393×852. It used trusted touch events to test first-tap sound, suspended-context
recovery and mute; selected all six drills through the visible menu; verified
actual contacts/reachable wrists; selected the mixed-tempo double-jab/uppercut;
switched languages; and observed a real geometric head hit in a seeded bout.
No page or shader errors were reported. Final shoulder and referee closeups and
phone fight framing were inspected. The fight camera now frames the action more
closely; ring geometry remains complete. These are cloud-browser checks, not a
physical iPhone/Safari or phone frame-rate benchmark.
