# GOTR-0129 street camera — handoff

Branch `agent/street-camera` (from `origin/claude/ecstatic-clarke-9as2ak` ad1247e). Not merged, not released, no version bump.

## Changed
- `camera-director.js`: a set may declare `userData.cameraStage` (room polygon in set space, `top`, `rise`, `pitch`, `lens`).
  `place()` keeps the camera on that floor in every mode (intro, lock, ceremony, corner break, release) and the free orbit is
  staged too (`freeStage`): the bearing is kept, the distance is clamped to the room, the camera rises (over the people, up
  to a broadcast angle) and the lens widens (fov restored exactly when the set goes).
- `arena-sets.js`: `cameraStage` for street, docks and underground.
- `tests/ringless-camera.test.cjs`: Node test with the real set geometry (ray casts) and the real director.

## Remaining / next
- WIP: first run of the test; tune rooms; screenshots `qa/street-camera/`; backlog entry.

## Checks
- (pending)
