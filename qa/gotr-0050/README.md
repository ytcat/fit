# GOTR-0050 — bigger build, smoother surface

**Volume:** a static, smooth mass layer along the rest normal (`muscleMass` in `avatar-anatomy.js`, new
`avatarMass` vertex attribute, applied in the colour and shadow shaders and in the CPU skin). It adds volume
to the pectorals and rib cage, the lats and upper back, the traps, the deltoid caps, the upper arms and the
forearms. The lion gets the full amount and the rabbit 72%. The waist below the navel (belts), the hands
(the volume fades out before the glove cuff) and the legs are untouched.

**Surface:** the ab pads are rounder and lower (lion ×0.42, was 0.62; rabbit ×0.62, was 1.0), the serratus
is softer, the crease darkening is lower (lion 0.42 → 0.28, rabbit 0.52 → 0.34) and creases are measured
over a wider neighbourhood.

## Girths
Tape measure: convex hull of a plane cut, rest pose, rig units in cm. From `girths.cjs`
(`girths-before.json` is v1.24, `girths-after.json` is this branch).

| | lion before → after | rabbit before → after |
|---|---|---|
| chest (y 1.50) | 191.3 → 200.9 (+5%) | 191.0 → 197.6 (+3%) |
| chest depth | 43.4 → 48.7 (+12%) | 42.7 → 46.5 (+9%) |
| rib cage (y 1.40) | 154.4 → 166.6 (+8%) | 153.8 → 162.2 (+5%) |
| deltoid (x 0.38) | 78.4 → 87.8 (+12%) | 77.5 → 84.3 (+9%) |
| upper arm (x 0.50) | 66.2 → 76.5 (+16%) | 65.2 → 72.6 (+11%) |
| forearm (x 0.74) | 44.9 → 51.4 (+14%) | 44.6 → 49.3 (+11%) |
| waist, calf | unchanged | unchanged |

## Checks
- `scripts/run-tests.sh -j 2 anatomy accessory muscle shoulder avatar mitt fight-range strike gear boot`:
  files=15 fails=0.
- Belt front plate worst intrusion: lion 1.6 mm, rabbit 0.6 mm (limit 4 mm). Straps clear the skin by
  14 mm and 16 mm.
- Sheets: `lion-guard-before-after.webp`, `rabbit-guard-before-after.webp` (front, side, back, torso;
  same camera and lights).

`boxing-coach-v2.js` is not touched.
