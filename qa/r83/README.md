# Fight guard review

From the repository root, with Node 24, Playwright and Chromium:

```sh
NODE_PATH=/tmp/fit-tools/node_modules QA_OUT=/tmp/r83-after node qa/r83/guard.cjs
APP_ROOT=/path/to/r82-checkout QA_OUT=/tmp/r83-before NODE_PATH=/tmp/fit-tools/node_modules node qa/r83/guard.cjs
node tests/fight-guard.test.cjs
node tests/simultaneous-contact.test.cjs
```

Set BROWSER_EXECUTABLE if Chromium is not /usr/bin/chromium. The harness serves
the chosen checkout locally, freezes the app clock, seeds the bout and captures
initial guard / early exchanges from three camera angles. Images are actual
app canvas renders, not generated art. Diagnostic zoom is 1.65×, DPR .75 with
shadows disabled. Source provenance and raw coordinates are in evidence/.

Physical phone performance remains unverified. The comparison viewer and QA
artifacts are not loaded by the game.
