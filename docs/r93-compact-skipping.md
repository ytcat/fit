# R93 — hands beside the hips, tucked skipping elbows

Baseline `013b477` (R92), isolated worktree `/workspace/fit-r93`.
Final candidate runtime `43f3191`. [Actual comparison](../qa/r93/review.html).

The previous hand targets were ±43.5 cm from the centreline, with an outward
elbow pole that flared the upper arms. The targets are now ±31.5 cm: 12 cm inward
on each side. The elbow guide points mostly down/back with minimal outward bias.
Hands remain just outside the hips rather than being glued to the torso.

Vertical hand-circle amplitude is 1.8 cm instead of 4.8; fore/aft amplitude 2.5
instead of 5.2. Shoulder pulse is 8 mm instead of 20. Small rope-specific wrist
flex/deviation remain; full-body knee/ankle loading, back recruitment, head
counterbalance, four footwork patterns and the existing rope clock are retained.
Species-specific hand height still accommodates rabbit ears. These are authored
model controls, not joint angles measured from a human study.

The cable still meets both real bearing exits. A width-bounded outward bow keeps
the loop away from the shoulders/mane with narrower grips. Its derivative is
bounded to avoid folding back near the handles and twisting the tube frame.
There are no extra rope vertices, textures, draw calls or runtime libraries.
The R92 trainer spacing and all other game modes remain in the same module.

## Human-reference check and its limits

- Retrieved the basic [Rope Jumping entry](https://github.com/yuhonas/free-exercise-db/blob/main/exercises/Rope_Jumping.json). It describes overhead/front rotation,
  jumping as the rope reaches the ground and maintained cadence; it does **not**
  provide detailed arm-position guidance. Its calorie claims are not used.
- Read [Jump Rope Counter's methodology](https://github.com/danimaaz/Jump-Rope-Counter)
  and inspected its publicly posted [actual human skipping screenshot](https://github.com/danimaaz/Jump-Rope-Counter/blob/main/Images/example%20screenshot.png).
  It shows relaxed upper arms rather than the old raised/outward elbow pose.
  This is a recreational demonstration, not a certified coaching standard;
  the forearms/hands are still outside the torso. A still image cannot establish
  wrist speeds or joint timing. The reference informed a qualitative posture
  check; no image, motion clip, trained model or code is imported into the app.
- Tried Crossrope's how-to guide; the environment proxy denied that domain.
  No claim is made to have read it or verified exact angles against its advice.
- Inspected the official IJRU document archive for accessible training material;
  the inspected folders contained rules/results rather than a basic-form manual.
  Those documents are not used to assert an optimal arm position.

The implementation follows the user's compact-hand request and the basic
technique principle of relaxed upper arms and small wrist-driven turns. It does
not claim every skipping style uses one fixed hand width, medical validation,
motion capture or measured physical rope simulation.

## Checks and reproduction

Both species, all four exercises pass the original overhead/underfoot/sole,
attachment, wrist-flex and continuity gates. New checks require wrists within
37 cm and elbows within 40 cm laterally of the hips through the sampled motion,
and a basic cable loop that does not fold back on itself near either handle.
All **55 regression suites passed** on exact runtime `43f3191`: [CI run](https://github.com/ytcat/fit/actions/runs/42383322542).
Observed maxima: wrist 35.42 cm, elbow 35.77 cm. These bounds suit the current
muscular rig; they are not universal human proportions. The existing bilateral
mitt checks also pass. Exact full-suite result is in
[validation.json](../qa/r93/results/validation.json).

Matching front, side, rear, overhead, underfoot and 393×844 phone-sized captures
pass with linked shaders and no page errors. Additional rabbit front/side
captures also pass; its shared compact pose was checked separately. Baseline and final runtime captures
are separate, outside the live app; only labeled comparison sheets are packaged.
Physical iPhone/Android sustained FPS remains unverified.

```sh
node tests/training-motion.test.cjs
node tests/fluid-drills.test.cjs
QA_SPECIES=rabbit QA_SHORT=1 NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r93-rabbit node qa/r93/compact.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r93-after node qa/r93/compact.cjs
APP_ROOT=/path/to/frozen-r92 NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r93-before node qa/r93/compact.cjs
```

Runtime changes: `career-drills.js` and cache query `2026110706` in `index.html`;
regressions: `tests/training-motion.test.cjs`. No other worktree is modified.
R92 is the release rollback baseline. The known pre-existing manual-uppercut
mitt-scoring gap documented in R92 is unchanged by this rope-only correction.
