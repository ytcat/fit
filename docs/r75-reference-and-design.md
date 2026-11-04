# R75 reference review and implementation scope

## Reference material considered before implementation

The repository's motion review records England Boxing Level 1 (pp. 73–75),
Level 2 (pp. 80–83), Boxing Canada's Instruction Beginners manual and the Dinu /
Louis paper. The relevant principles are a floor/hip/trunk-led strike, a neutral
wrist, a protected opposite cheek, distinct straight/hook/uppercut trajectories
and prompt recovery. Direct re-download of the England Boxing PDF was denied by
the environment's network policy; this pass used the existing documented review,
not a claim to have watched additional bout footage.

Also inspected the Dareczin/boxing_biomechanics study-code repository, which
describes extracting individual strike events and velocities from Noraxon data.
No motion data or numerical human-kinematics results were imported from it.

Practice and competition have different timing goals. A rehearsal may deliberately
use an even beat. A fight has independent decisions, reading, repeated defence,
openings and recovery. Randomizing a beat alone does not establish tactical AI.
The new variable practice clock therefore includes burst tempos and guard gaps,
while fights retain their own stamina/opponent-dependent decisions and can read
or defend repeatedly instead of being required to alternate attacks.

All timing ranges, joint poses and response gains remain authored values for this
procedural character. This update does not claim motion capture, coaching
certification, a full ragdoll or a validated head-injury simulation.

## Contact response

Reactions begin on registered geometric contact, never simply because an
animation reaches a scheduled hit frame. Incoming direction is passed through
the bout model, so rising uppercuts produce upward face/neck response with
rearward torso recoil. Support/IK constraints remain active. Blocks, body shots,
misses and head shots remain distinct.

A heavy suspended bag retains its mass/inertia and fixed hanger. The dummy's
weighted base stays attached to the floor. The speed bag now uses a low-damping
pendulum and physical platform stop/restitution; the old high-frequency spring
and small angle cap could not reproduce a real board rebound.

Swing, padded impact, platform tap and vocal reaction use separate events.
Hit sounds and pain require contact; a missed punch produces only its air swing.
Recorded source/license details are in assets/audio/ATTRIBUTION.md.

## Artwork, loading and browser evidence

The dummy now uses one sculpted anatomical surface with carved facial features,
modeled details, color variation and a fine molded-rubber surface. The referee
has finer connected sculptures, curved arm sections, a woven white referee shirt,
collar, bow tie, pocket/badge, face creases and grounded leather shoes. The five
sculptures are baked with `node scripts/build_equipment.cjs` into indexed local
geometry. This prevents running their sculpting algorithm when selected on a
phone. Source SDF definitions remain in the rendering modules.

Actual Chromium/SwiftShader checks at 1100×950 and 393×852 passed all techniques,
camera views, three languages, pause and equipment/fight mode switching. A second
browser suite exercised both timing choices through the visible UI, their
persistence between practice modes/languages, and their disabled state in fights.
All ten bundled WAVs decoded in the browser. An actual OfflineAudioContext mix
of swing, impact, vocal response, three bell strikes and stereo applause produced
finite output, about 0.605 peak, with voices removed after playback. Blocked
strikes, vocal cooldown and mute were tested. These checks establish playback and
bounded mixing, not an acoustic match to a particular boxing venue.

Rendered closeups and phone screenshots were inspected. Initial dummy selection
fell from roughly 4.9 seconds of procedural sculpture work to 18 ms after baking
in this software-rendered browser; the fight build fell from roughly 2.1 seconds
to 0.8 seconds including the audience/ring. These are individual cloud browser
measurements, not physical-phone frame-rate benchmarks or a claim of photorealism.

The final CPU regression run passed all 24 `tests/*.test.cjs` suites. The new
practice/impact suite additionally checks seeded replay/seek, burst/guard timing,
all five practice modes, reachable hands, actual equipment contacts, separating
fists, board restitution, directional bout-event persistence, duplicate-contact
rejection, supported head lift/recoil and baked triangle integrity. The updated
speed-bag regression retains first-frame/miss/alternating-hand checks and now
checks travel against its physical platform constraint instead of the old small
wobble limit. All JavaScript syntax checks and `git diff --check` passed.
