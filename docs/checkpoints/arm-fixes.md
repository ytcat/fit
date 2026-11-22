# Checkpoint: arm-fixes (branch `agent/arm-fixes`)

Base: `a42fa83` (v1.91 candidate, `claude/ecstatic-clarke-9as2ak`). Not merged, not released; no version bump.

## Asked (PR #35 notes from the owner's other assistant)
1. Otto's shop: after buying, the Fighter reaches out to the side and up to support the heavy bag on his shoulder, elbow
   out (not folded behind the torso); a reachable hand-to-bag contact before the bag moves; hand and bag together through
   lift, settle and the first steps; no wrist jump, shoulder twist, pass-through or teleport. Lion and Rabbit, side and 3/4.
2. Referee's victory hand raise: the whole pickup, lift, hold and release; grip and wrist aligned; natural shoulder motion;
   elbow in its natural bend plane (not folding backward); mesh pinch checked separately. Lion and Rabbit, phone and close-up.

## State
- WIP. See the commit log on this branch for what is in each checkpoint.

## QA tools (qa/arm-fixes/)
- `otto-carry.cjs <lion|rabbit> <outdir> [from] [to]` (SHOTS=t,t,..): steps the shop film at 60 fps, per-frame contact /
  wrist / shoulder / elbow / penetration measurements, pictures film / side / 3/4 / close.
- `raise-probe.cjs [out.json]`: node, ring ceremony per frame (grip gap, steps, jumps, twist, elbow direction, skin pinch).
- `raise-browser.cjs <winner> <outdir>`: real app, phone framing with UI and a canvas close-up at TIMES.
- `strip.py out scale "label|pattern-with-{t}" ...` (TIMES=...): frame strips. `ROOT=<tree>` serves another checkout (before).
