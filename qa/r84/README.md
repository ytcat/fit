# R84 arm frame review

From the repository root, with Node 24, Playwright and Chromium:

```sh
NODE_PATH=/tmp/fit-tools/node_modules QA_GUARD_ONLY=1 node qa/r84/guard.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_CLAY=1 node qa/r84/motion.cjs
node tests/elbow-hinge-frame.test.cjs
```

APP_ROOT selects a baseline checkout, QA_OUT selects an output directory,
BROWSER_EXECUTABLE overrides /usr/bin/chromium, and QA_CASE selects one forced
motion case. The motion harness resets its camera at every sampled frame to
avoid layout/ResizeObserver updates changing the diagnostic view. See the
implementation report for the offline asset rebuild commands and CI workflow.

These are actual app renders, not generated images. Neutral-material motion
captures hide ribbons, scenery and shadows to expose deformation; they do not
establish physical phone FPS or a new art-quality score. Final runtime 57344ed;
published baseline b569fa0. Old corrective data and legacy assets remain intact.
