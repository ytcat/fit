# R94 — right hand to coach's right mitt

Baseline `057a82a` (R93), isolated worktree `/workspace/fit-r94`.
Runtime `41d0ebc`. [Actual scene captures](../qa/r94/review.html).

Changed the coaching target from opposite anatomical hands to the same hand:
left punches target the coach's left mitt, and right punches target the coach's
right mitt. This corrects the earlier screen-position interpretation documented
in R91. Anatomical sides are independent of camera rotation or facing direction.

The selected real mitt supplies the IK target, contact-local coordinates,
previous-fist tracking and recoil timestamp. Jab/lead hook/lead uppercut select
left; cross/rear hook/rear uppercut select right. No screen-only relabeling or
changes to which of the trainee's hands performs each punch.

The 1.2 m partner spacing, compact rope posture, clocks, collisions and scoring
rules remain. Cache query `2026110707` reloads the corrected drill module.
Regression assertions verify both the target index and the actual hand bone
owning the mitt that receives each registered contact/recoil. Both characters
retain six actual contacts and two ducks in the 10-second automatic sample;
original floor, reach, wrist and continuity limits remain unchanged.

Manual jab, cross and both hooks each register a contact. The documented existing
manual-uppercut scoring gap remains (zero scored contacts in both prior and
current versions); this correction does not claim all six manual hit tests pass.

The actual app browser checks compare source hand and real target-mitt parent
for left/right punches and a 393×844 phone-sized right-punch view. All linked
programs pass, without page errors. This is Chromium/SwiftShader, not sustained
physical-phone FPS validation. Reproduce with:

```sh
node tests/career-drills.test.cjs
node tests/fluid-drills.test.cjs
node tests/training-motion.test.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r94 node qa/r94/hands.cjs
node qa/r92/manual.cjs
```

All **55 regression suites passed** on exact runtime `41d0ebc`: [CI run](https://github.com/ytcat/fit/actions/runs/42386288337).
Exact full-suite result: [validation.json](../qa/r94/results/validation.json).
Runtime scope: one target-selector change in `career-drills.js` and its versioned
reference in `index.html`. No new runtime dependency, asset or geometry. R93 is
the release rollback baseline; no other worktree is modified.
