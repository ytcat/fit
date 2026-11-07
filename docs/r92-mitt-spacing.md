# R92 — more room between mitt-work partners

Baseline `c4d5cb0` (R91); runtime `b064eac`. Development is isolated in
`lion/r92-mitt-spacing`, based on freshly fetched main; no other worktree changed.

The trainer stands 30 cm farther back, restoring 1.2 m between partner roots
instead of 0.9 m. In the guard capture the actual chest-joint separation increases
from 0.879 to 1.179 m. Matching jab views measure 0.775 to 1.075 m. The trainee can
extend punches without standing directly against the coach.

To retain the overhead exercise at this distance, the trainer reaches through
a bounded hip hinge and shoulder glide. The trainee rolls into the passing arc
with a hip hinge, steady gaze and re-solved planted feet. Manual punches keep
their own choreography; only an actual roll receives the roll overlay. The same
real contacts, wrist alignment, reach limits and duck proximity/clearance gates
remain. No scoring tolerance was expanded to compensate for spacing.

Existing career-drill, training-motion and bilateral fluid-drill checks pass for
both species: six actual hits and two ducks in each 10-second career sample,
no floor penetration, minimum sweep palm-down alignment 0.854 and maximum
trainer hand reach error 3.62 mm. The spacing regression now requires at least
1.15 m root separation throughout the sampled phases. Original continuity,
floor, neutral-wrist and reach assertions remain unchanged.

[Actual matching renders](../qa/r92/review.html) include guard, jab and sweep.
The QA script also captures 393×844 phone-sized and 1100×950 desktop viewports,
records chest/root separation and verifies shader linking. It is reproducible:

```sh
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r92-after node qa/r92/spacing.cjs
APP_ROOT=/path/to/frozen-r91 NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r92-before node qa/r92/spacing.cjs
node tests/career-drills.test.cjs
node tests/fluid-drills.test.cjs
node tests/training-motion.test.cjs
```

Exact complete-suite status: [validation.json](../qa/r92/results/validation.json).
These are authored poses and Chromium compatibility/visual checks, not measured
human biomechanics or physical-phone performance. No new mesh, texture, library,
model, menu or runtime dependency. Only `career-drills.js`, its versioned script
reference and the existing spacing regression are changed. R91 remains the
release rollback baseline. Cache query `2026110705` loads the corrected module.
