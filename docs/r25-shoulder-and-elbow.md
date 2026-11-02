# R25 — rebuild the shoulder attachment and stabilize arm motion

The reported defects had two independent causes. The diagonal arm rest mesh included a carved armpit saddle, while a spatial weight blend coupled nearby rib and arm surfaces. Raising the arm could turn this material into a broad hanging fold. Separately, target aiming could replace the elbow pole with an almost collinear direction at full jab extension; its projected bend direction could flip.

## Changes

- Rebuilt the connected body with horizontal T-pose arms and rounded shoulder junctions. Removed the carved diagonal saddle. The original 0.353836 m upper-arm and 0.310161 m forearm lengths are unchanged.
- Baked harmonic arm/trunk attachment weights along mesh edges, with fixed chest and limb anchors. The runtime interpolates these weights when refining triangles. Geometric proximity across an empty armpit no longer shares attachments. Removed the old intermediate axilla bones from this rig.
- Arm IK now constructs upper-arm and forearm orientations from a shared elbow plane. The previous direction-only rotations did not define humeral roll.
- Straight bag punches retain the authored elbow direction. Hook aiming projects its correction into the bend plane and reduces influence near collinearity or an anatomically opposing bend direction. No temporal position swapping or bone-length scaling is used.
- Solo hooks now use a compact approximately right-angle elbow rather than unfolding into a long straight-like strike. Equipment contact retains its target-specific reach constraints.
- `coach-surface-v2.json` and `boxing-coach-v2.js` ship together as rig version 2. Both original controller and model paths remain unchanged for cached R24 pages, including pages whose script must be fetched again. A mismatched asset/controller pair fails explicitly instead of silently deforming. A regression executes both matching pairs.

## Verification

The actual deformed mesh was rendered in CPU diagnostics and inspected for jab, cross, both hooks, both uppercuts, and front/side/rear views. The earlier hanging fold is substantially reduced in those views. These previews omit PBR/textures/shadows, so they do not establish final device rendering quality.

At action phase 0.47, localized p99 edge stretch ratios in the same defined shoulder region changed as follows:

| Action | R24 | R25 |
| --- | ---: | ---: |
| Jab | 2.773 | 1.950 |
| Cross | 2.866 | 2.042 |
| Lead hook | 2.915 | 2.067 |
| Rear hook | 3.103 | 2.071 |
| Lead uppercut | 2.437 | 1.906 |
| Rear uppercut | 2.433 | 1.837 |

This compares complete action samples: topology changed, and solo hook technique changed. It is a deformation diagnostic, not a claim of physically exact skin. The regression limits are now stricter: p95 <1.95 and p99 <2.20 at these poses.

A targeted heavy-bag jab check exposed an adjacent-sample upper-arm rotation jump of 1.241 rad and elbow displacement of 0.170 m. After the aiming fix those maxima are 0.104 rad and 0.039 m at the same 120 Hz sampling. The new shoulder test covers all six punches on both heavy bag and dummy, plus solo paths, fixed segment lengths, forward/below-head elbows, and cached-model compatibility. Existing contact, force, guard, foot placement and framing checks are retained. Hook tests now enforce the intentionally chosen compact elbow angle rather than the previous long-hook angle.

Rebuild with Python, NumPy and SciPy:

```sh
python3 scripts/build_coach.py
```

SciPy is authoring-only; there is no new runtime dependency or service.

All 21 `tests/*.test.cjs` suites passed after the versioned-controller change, including the cached-page pair check, both actual fight winners, impact response, repeated uppercuts, mane settling, camera framing and audio signal bounds. The managed browser loaded the R25 preview; opening the controls dialog and switching Hebrew/English worked. Its WebGL context is unavailable, so shaded playback, perceived audio quality and real-device performance remain unverified. CPU previews do not replace those checks.
