# R82 reproducible review

Use Node 24, Playwright and Chromium. Run from the repository root:

```sh
NODE_PATH=/tmp/fit-tools/node_modules node qa/r82/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/r82/gestures.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/r82/scene.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/r82/motion.cjs
node tests/simultaneous-contact.test.cjs
node tests/ring-camera.test.cjs
```

Set `BROWSER_EXECUTABLE` if Chromium is not `/usr/bin/chromium`; `QA_OUT` selects
an output directory. `APP_ROOT` selects an isolated baseline checkout.
`QA_BASELINE=1` records baseline behavior without requiring new controls or
unobstructed rotating scenery. `QA_VIEWPORTS='[[393,650]]'` narrows the UI run.
The static HTTP server is local and temporary; no dependencies are added to the
production app. Install Playwright with a local package manager if unavailable.

Final runtime: afd763a. Baseline: 74176e0. See the implementation report for the
full-suite workflow and provenance of earlier layout captures. Evidence images
are real app renders. Motion captures deliberately hide the mane/fur ribbons,
shadows and scenery to expose deformation; they are not beauty renders. Browser
viewport/touch emulation and software renderer timings are not physical phone
validation. The new Node tests are included in the existing CI glob.
