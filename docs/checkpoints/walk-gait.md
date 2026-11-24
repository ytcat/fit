# Checkpoint: walk-gait (the Fighter's walk and jog, owner feedback 2026-11-25)

Branch `agent/walk-gait` from `origin/claude/ecstatic-clarke-9as2ak` (67ddca4 = v1.94). Not merged, no version bump of
`version.js` / offline worker, no PR (coordinator's rule). Backlog: GOTR-0120.

## Status
WIP — gait core rewritten and measured in node; browser pictures and tests next.

## What changed so far
- `adventure/story/dream-pose.js` (the one walk cycle used by the free walk and every film):
  - `params(v)`: stride and cadence follow the ground speed (stride ~ v^0.6, exactly 1.30 m at the film's 1.25 m/s, so the
    films keep the GOTR-0097 walk when the speed is 1.25 or unknown); a brisk walk at 2.22 m/s; a heavy boxer's jog above
    2.6 m/s (stance 36 %, short flight, heel kick, body lowest at mid-stance).
  - per-leg heel memory (a planted foot stays put while the stride changes), integrated step phase, quicker steps in turns,
    the next step sooner when a planted foot is left far behind.
  - pelvis turn / tilt / bob grow with pace; thorax counter-rotation with the arms; shoulder roll (arm joint forward/up with
    its swing); soft spring for the heavy chest and shoulders; lean with speed and acceleration; bank into turns; head
    stabilised; lion's tail follows with lag.
  - arms: angle-based pendulum from the shoulder (`armSwing`), against the leg, elbow bend grows forward and with pace,
    carried out from the body, forearm turning in; jog: elbow ~60-90 deg, loose fists.
  - plant layer: heel anchored at its landing pitch, landing spot stops turning with the body in the last third of a swing,
    touchdown speed capped in turns and stops, both feet may be in the air in the jog, pelvis clamp from the hip joint.
  - `DreamPose.pace(state, vx, vz, facing, dt)`: the free walk's stick velocity -> body velocity (accelerate 4.5 m/s2,
    stop 7 m/s2, turn in an arc, slow through sharp turns).
- `adventure/free-walk/free-walk.js` (2 lines, for the walk-town/story-walk owners): `step()` passes the stick velocity
  through `DreamPose.pace(R.pace, vx, vz, R.turn, dt)` before `grid.move`, and the pose call adds `plant: true`.
- `qa/walk-gait/gait-metrics.cjs`, `gait-sim.cjs`: node measurement on the real rig (courses film/slow/walk/fast/turn/startstop).

## Next
Browser QA in the free walk (touch stick), pictures, tests, film metrics (qa/ch1-motion/measure.cjs), backlog entry.
