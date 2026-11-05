# RingFighter R81 review

The comparison page uses actual application renders. Diagnostic motion hides
coat/mane ribbons, scenery and shadows so the elbow and wrist are visible. It
does not claim improved face art, real-time FPS or physical-phone validation.

Run from the repository root with local Python, Node, Playwright and Chromium:

```
python qa/r81/run-checks.py /tmp/r81-checks --jobs 2
NODE_PATH=/path/to/node_modules node qa/r81/browser.cjs
NODE_PATH=/path/to/node_modules node qa/r81/motion.cjs
APP_ROOT=/path/to/baseline QA_BASELINE=1 QA_OUT=/tmp/r81-before NODE_PATH=/path/to/node_modules node qa/r81/browser.cjs
APP_ROOT=/path/to/baseline QA_OUT=/tmp/r81-motion-before NODE_PATH=/path/to/node_modules node qa/r81/motion.cjs
```

`QA_VIEWPORTS` can select browser viewports, e.g. `[[844,390]]`.
`BROWSER_EXECUTABLE` can choose Chromium. `QA_OUT` selects an evidence folder
outside the app source tree. The app itself needs none of these QA dependencies.

The Node runner records source hashes, statuses, wall-clock test durations and
syntax checks. `--resume` reuses unchanged successful tests; changed test files
are rerun. `--recheck` explicitly reruns named suites. Changed application JS or
assets require a new output directory. Stylesheet-only changes require the
separate browser layout check; they do not invalidate Node-only physics tests.

Automatic scene updates are frozen for deterministic browser checks, then poses
are stepped explicitly through the real controllers. The earlier real-RAF pause
check remains in the suite. Browser viewport tests are not a hardware benchmark.
