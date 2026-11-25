# Checkpoint: armpit-fold (GOTR-0127 #5-#7: armpit / shoulder folds of the skin and of the clothes)

Status: WIP. Branch `agent/armpit-fold` (from `origin/claude/ecstatic-clarke-9as2ak` 8aa6ebb). Not merged, not released.

## Root causes found (measured)
1. `boxing-coach-v2.js` `sculptBody`: the torso relief ended at a hard border |x| = .30 (and y 1.12 / 1.70); the 7 % chest
   widening jumped ~2 cm there. The REST surface already crossed itself along the front and back axillary folds
   (436 crossing triangle pairs, lion and rabbit; the authored surface has 0): the crack / pin-hole line on the deltoid-pectoral
   line and the back armpit, worse when the arm moves. Fixed: the relief fades out across |x| .24-.36 and at its top/bottom.
2. `avatar-detail.js` "connected axillary surface": the skinned pit was projected onto an implicit chest+arm surface. A
   projection collapses both sides of the pit onto one sheet: visible back faces (mop, uppercut top of the shoulder, walk) and
   9 cm webs across the pit in the punches. Removed (pit max edge over the punch set 9.0 -> 3.4 cm).

## Next
- Regenerate the guard shoulder corrective (rest hash changed): `node scripts/authoring/export_shoulder_pose.cjs <json>` then
  `python3 scripts/authoring/build_shoulder_correctives.py <json>` (needs scipy).
- Cast bodies (Bruno, Fang, Hazel, Otto, Rourke): `bulk` + `dress` (clothes on the skin streams) fold the armpit at rest.
- Street hoodie armhole. Residual sliver flips. Tests, sheets, numbers.

## Tools
- `qa/armpit-fold/backface.js` (STUDIO_AFTER for `qa/avatar-joins/studio.cjs`): visible back faces in the shoulder region in
  magenta; `python3 qa/armpit-fold/count.py <frames>` counts them (lone multisample pixels ignored).
