# Staggered guards, skipping paws and independent fight tactics

Baseline: `76e2c2422daba30576840d16ea7020939757c02e`.
Runtime candidate: `9131377d8fe4abdb9efc797bda961d32f76c6d80`.

## Player-visible changes

- Normal defense places the lead wrist farther forward and the rear wrist closer
  to the cheek: default local depths 0.395 m and 0.255 m. Tight/high covers retain
  asymmetry while existing face-clearance and opponent-contact corrections remain
  authoritative. Defensive reactions can still move either glove where needed.
- Skipping uses a continuous, broader species-specific gripping paw, integrated
  knuckle ridges, palm-pad coloring, a fitted thumb and a separate wrist wrap.
  The lion palm is 0.16 m wide; the previous wrapped palm was 0.104 m wide. Rabbit
  grips remain smaller and gray. Wrist motion and palm-up orientation stay intact.
  Handle bearings remain outside the broader paw, with unchanged rope attachment.
- Fighters have separate waypoint paths and stride periods (0.72/0.86 s). A boxer
  finishes a half-step and plants for their own strike; the opponent can continue
  stepping. Facing follows the actual opponent. Paths remain inside the ropes
  and exclude the official's corner. A sole-contact anchor in ring coordinates
  feeds planted contacts into the existing pelvis reach solver and prevents
  sliding while the torso tracks an independently moving
  opponent; orbiting the scene preserves those floor-relative anchors. Pause
  does not advance either clock.
- AI combines pressure, outside boxing, counters and angle changes. Twelve short
  tactical phrases vary head/body targeting, reads, lateral exits and follow-ups;
  stamina and condition favor outside resets when tired. Opponents still read and
  defend during a phrase. Seeded choices remain reproducible, and selecting an
  attack never awards a hit without observed contact.
- Training gains four selectable mixed-rhythm combinations: Body–head switch and
  exit; Angle step, hook and reset; Two reads, two counters; Pressure burst and
  re-entry. There are 44 presets total. Generated routines have additional opening
  phrases, including defensive reads; sparring filters defense-only openers out
  of attacking phrases. Existing controls and three languages are preserved.

## Contact and verification

Independent spacing exposed interaction between muzzle-clearance and opponent
arm/glove projections. The controller now performs bounded coupled corrections,
including forearm and wrist samples, with an early exit when all tested surfaces
are clear. The final pass retains a fixed elbow reference to avoid accumulating
roll during repeated corrections. Face corrections upload
skin only when they actually change a hand. The original strict collision and
own-face tests retain their thresholds; the preset-count assertions now expect
44 because the product intentionally adds four combinations. The cached shoulder
sculpt retains its original angle-dependent blend; its full-activation test now
poses the baked reference explicitly, since the new neutral guard deliberately
has a different shoulder orientation. Surface displacement limits, visible guard
correction, topology, rig, fur/shadow matching and frozen-pose checks remain.

The gait regression now reads each actor's path instead of the retired shared
path, and its braking window derives from that actor's stride duration. The
original >0.30 m stride, <0.002 m planted-slip and >0.74 m official-clearance gates
remain. Observed quiet-gait maxima: stride 0.37054 m, planted displacement below
1e-12 m, official path clearance 0.83584 m. These are model diagnostics, not human
motion capture or a claim of complete physical simulation.

Targeted checks cover all six punches to head/body, follow-through and recovery,
simultaneous attacks, fixed arm lengths, own-face clearance, real mitt contacts,
full-cycle rope clearance, cable outlets, species paw size, glove restoration,
seed replay, manual takeover, pause and independent planted footwork. All 59 suites passed on runtime commit `9131377` in
[full CI](https://github.com/ytcat/fit/actions/runs/42451073229), including syntax and
local-asset checks. This includes the 108 simultaneous-punch cases, the stricter
12-strike contact fixture and the final guard/shoulder checks. Exact provenance
is recorded in `qa/tactics/results/validation.json`; current local guard/contact/
gait logs are alongside it.

[Actual app comparison and movement captures](../qa/tactics/review.html).
The harness uses local Chromium and the existing app renderer. Matched skipping close-ups submitted 47 draw calls / 376,511 triangles after,
versus 55 / 377,327 before (same scene/camera/software renderer). This reflects
replacing separate small finger meshes; it is not a whole-game FPS claim.
Browser viewport
captures and software rendering do not establish physical iPhone/Android FPS or
sustained thermal performance. No new face/mane asset or realism score is claimed.

Rollback: revert this isolated release's application commits together; no model,
save schema, paid service or runtime dependency migration is involved.


## Reproducing the visual review

Run `NODE_PATH=/path/to/playwright/node_modules QA_OUT=/tmp/candidate node
qa/tactics/preview.cjs` against this checkout. Set `APP_ROOT` to a separate frozen
baseline checkout for the before capture. The harness renders five static views
and 24 motion frames in local Chromium; it does not modify the game assets.
Then run `python qa/tactics/prepare.py /tmp/baseline /tmp/candidate` (Pillow) to
produce the labeled review media. Capture metadata records the runtime source SHA.
