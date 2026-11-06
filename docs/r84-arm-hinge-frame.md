# R84 — fix the arm's rotation frame

Baseline: b569fa0 (published R83). Final runtime: 57344ed.
Validation: https://github.com/ytcat/fit/actions/runs/42180856741 — Success,
44 Node regression suites, syntax and local asset validation (6m 52s).
Development used the isolated `lion/r84-arm-roll` worktree.

## Root cause

The arm solver used -Y as the bind-space outer elbow fold, although the authored
arm's anatomical front is +Z. That chooses the wrong axial frame. In a controlled
test where the humerus stays still and only the forearm bends forward 90°, the
old solver rolls the entire upper arm by 90°. Joint endpoints can remain correct,
so endpoint, glove reach and collision tests did not detect the surface twisting.

The corrected outer fold is -Z. The isolated test now measures zero unwanted
humeral roll, under both left/right and torso/root rotations. A second check
compares the actual glove palm with the forearm front in neutral elbow flexion;
it rejects the former quarter-turn mismatch.

## Changes and compatibility

- Correct the bind-space elbow frame; preserve the skeleton, bone lengths,
  authored wrist targets, choreography, game controls and existing assets.
- Convert the legacy shoulder collision volumes into the new local frame
  (a +90° X rotation of their stored center/radii). Independent world-space
  distance/normal checks verify that the hit volumes remain in the same place.
  This avoids changing contact response as a side effect of correcting the skin.
- Rebuild the bounded shoulder correction for the new hinge. Version 2 declares
  `posterior-z`; a controller rejects incompatible old corrective data and falls
  back to the continuous surface. The v1 asset remains available for cached
  clients. Mesh topology and weights are unchanged; displacement remains <=25 mm.
- Keep the offline review packager aware of both asset versions and update cache
  versions. No paid asset, CDN, runtime model service or rig replacement is added.

Rebuild with NumPy/SciPy and Node:

```sh
node scripts/authoring/export_shoulder_pose.cjs /tmp/shoulder-pose.json
python3 scripts/authoring/build_shoulder_correctives.py /tmp/shoulder-pose.json assets/models/shoulder-correctives-v2.json
```

A repeated export/build produced a byte-identical asset. Source/controller hashes
and the raw pose fingerprint are recorded in the asset. Authoring metadata is
independent of the checkout's HEAD so rebuilds stay deterministic.

## Rendered evidence and validation limits

`qa/r84/comparison.html` contains actual app renders with normal materials and
matched moving neutral-material comparisons. Four forced exchanges cover all six
punches, chamber/contact/recovery and both fighters. Fur ribbons/scenery/shadows
are hidden in the motion diagnostic to expose surface rotation. The samples are
100 ms apart; they are not a real-time FPS measurement or a beauty-render claim.

Across 36 sampled paired frames, the maximum knuckle-position change is below
1e-12 m. The corrected surface orientation therefore preserves the sampled glove
paths. The existing body-intrusion and temporal continuity gates remain intact.
The full 44-suite workflow passes; the redundant local contact sweep was stopped
after the identical CI suite passed and is not reported as a local pass.

This correction adds no triangles, draw calls or new shader features. The new
optional asset is 1,003,415 bytes, replacing the active v1 download. Sustained
FPS, heat and gesture behavior on physical iPhone/Android hardware remain
unverified. This is a rotation/deformation correction, not a new character or a
claim that the separate face/mane realism overhaul is complete.
