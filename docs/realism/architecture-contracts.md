# Master brief — frozen baseline and pose contracts

Instruction source: `docs/fit-realism-codex-20261107` at
`04a23b9721369fe06d1293ff512cb202f451d149`, copied unchanged to
[the master brief](../FIT_REALISM_CODEX_MASTER_INSTRUCTIONS.md).
Application baseline: `a7fe5a4376cbe08a3237ae7d6f1355117b6b6282`.
Worktree: `/workspace/fit-realism-master`; other worktrees are untouched.

## Ownership and coordinate spaces

The app is static HTML/JS, bundled Three.js r128, local assets and GLTFLoader.
The default character remains the connected baked JSON surface plus procedural
face/mane/coat, custom bones, DQ/linear skinning and corrective shaders. It is not
an interchangeable exported GLB. No renderer, skeleton or asset is replaced.

`+Z` is forward in a coach's root coordinates; local Y is up. An arena rotates
that root/its parent, so local targets cannot be compared to world contacts
without the complete matrix chain. Gloves use local −Y from wrist to knuckles;
+Z is the palm. Pronation is around the live forearm, not a bent wrist.

Core joints are hips, spine, chest, neck, head and paired scapula, arm, elbow,
hand, thigh, knee and foot. Positions/scales/quaternions of these joints are
parent-relative. Existing IK owns limb lengths, wrist frames and sole pivots.
`CoachRoster` caches one rig per species; simulation actor `lion` can mean the
selected practice boxer even when its species is rabbit. Fight actor IDs map to
actual species. A pose buffer must never be reused for another rig UUID.

## Current update order

1. `AutoModelEngine.animate` advances animation time by capped wall delta × speed.
   Paused/cached poses skip work; camera movement independently permits rendering.
2. The arena selects the current action. Heavy/dummy/speed use 120-Hz contact
   samples; fights use 60-Hz steps. Rope/mitts currently use display-driven time.
3. `LionCoach.update` authors load/drive/recovery, hips/thorax/head, supported
   feet, two-bone arm IK, glove roll, target correction, face clearance and any
   station pose overlay. Mane, expression and scapula detail follow.
4. `syncSkin` updates the pose-dependent rendering data. Continuous body muscle,
   axilla and shoulder correctives, glove/target compression, short coat and
   custom depth/distance shaders have paired CPU/GPU paths. Their transform
   spaces must not be reordered by a generic skeleton replacement.
5. Arena/fight contact constraints can correct the drawn glove and synchronize
   the skin again. Real contacts drive scoring, damage, sound and progression.
6. The world updates gym/arena visibility and camera-facing room surfaces, then
   the renderer draws the final scene. A final-pose audit belongs after arena
   constraints, never in the middle of the initial arm solve.

The profile harness explicitly includes world.update. The initial older M0
sampler did not; its preliminary arena-only timings are not presented as full
scene performance. CPU submission time is not GPU completion time.

## Implemented contract foundation

`boxing-pose.js` provides reusable `PoseFrame` buffers, a read-only `PoseAudit`,
shortest-path quaternion interpolation and a capped `FixedStepClock`. It does
not replace existing choreography or silently apply interpolated bones.

- `rootTransform`: world position/quaternion/scale.
- `joints`: parent-relative quaternion by existing joint name; jointPositions
  and jointScales preserve the rest of the authored transform.
- left/right hand/foot targets: observed world-space strike/sole points.
  These are explicitly `targetKind: observed`, not unexposed requested IK goals.
- contactFlags: authored planted-foot **intent**, not a new physical ground
  collision. A raised root or knockdown requires separate ground verification.
- expression: actual jaw/focus/flinch/side parameters when available.
- muscleActivation: the existing fourteen channels, with availability flags.

Sampling/interpolation reuses buffers and does not write the rig. Serialization
allocates only when a diagnostic explicitly exports a snapshot. Quaternion
interpolation normalizes and handles antipodal representations. Discrete support
flags are not numerically blended. Interpolated snapshots are not authoritative
collision poses: a future render consumer must re-solve/validate constrained IK.

The clock has bounded catch-up, explicit pause (delta zero) and seek/reset. It is
staged for measured component migration; do not nest it around the arena's
existing fixed-step clocks. Its default eight-step budget is not automatically
a suitable budget for 3× playback. Seeded behavior remains owned by the existing
fight and practice generators, not a second random generator.

## Contact contract and baseline defects

Fight contacts already carry actor/action/part/quality/severity/direction and
are deduplicated before scoring. Equipment events have receiver/kind/point,
closingSpeed and impulse, with their own substep/load data. A unified
CombatImpact adapter must preserve these IDs, spaces and region meanings; it
must not turn a block into head damage or fabricate an evade event.

Manual uppercuts in mitt mode miss the target in the baseline: measured closest
strike-point distances are 228.9 / 221.9 mm. `knuckleTarget` is passed, but the
uppercut trajectory consumes `uppercutBagTarget` instead. The trainer also holds
an upright mitt instead of presenting its underside. A stricter contact prototype
additionally exposes straight punches stopping short: the old 90-mm plane band
can count a hit before reaching the mitt. Any repair must improve reach/receiving
posture and retain the actual contact test, rather than simply awarding hits.

## Evidence and limits

[Baseline manifest](../../qa/realism/baseline/manifest.json) records 128 textured
pose/view captures: both species, sixteen representative pose states, four
angles. The initial incorrectly selected rabbit views were discarded and
recaptured with a species assertion. Hit-pose snapshots exercise existing
reaction parameters; they are not proof of a collision or a stagger state machine.
Neutral clay views separately inspect guard and both uppercut load/contact poses.
The raw frozen source and reproducible scripts preserve full-resolution captures
outside the deployed art; contact sheets are comparison evidence, not new assets.

[Baseline test proof](../../qa/realism/baseline/tests.json): all 56 existing suites
passed on the exact baseline commit. [Profile](../../qa/realism/baseline/profile.json)
records software-renderer scene inventory, upload estimates and short samples.
No physical iPhone/Android, sustained thermal result, hardware FPS, true GPU-memory
peak, or photorealism score is claimed. YouTube reference access returned proxy
403; no video frames or timing were measured.
