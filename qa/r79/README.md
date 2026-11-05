# R79 review evidence

`comparison.html` shows actual before/after app-rendered captures at fixed pose,
camera, viewport and lighting. Baseline: `eec0dc7`; candidate code SHA256 values
are in `evidence/after-manifest.json`. No user-uploaded videos are published.

The WebGL renders use Chromium 155 / SwiftShader. They demonstrate appearance
and pose state, not physical-phone FPS or sound quality on a phone speaker.

- `browser-review.cjs`: fixed uppercut contact/recovery views, speed-bag profiles
  and staged fight knockdowns. Optional `APP_ROOT` selects an isolated baseline;
  `QA_OUT` selects an output folder outside app sources.
- `browser-flow.cjs`: actual desktop/portrait interactions, trusted touch audio
  unlock, all 11 decoded samples, speed-rail replacement/restoration, defence,
  languages and offline-rendered audio levels. It freezes automatic game
  updates and explicitly steps poses, avoiding uncontrolled software-renderer
  load; it does not replace the separate real-RAF motion-freeze browser check.
- `run-regressions.py OUT --jobs 2`: independent Node suites in separate processes,
  source fingerprints and JS/CJS syntax checks. `--resume` may reuse completed
  results only from the same frozen application sources. Result status is a real
  failing exit code if any check fails.

Playwright is a local QA dependency (`NODE_PATH` may point to its installation).
The deployed game does not load these scripts, use remote rendering or require
Python, Playwright or Blender. Runtime assets remain same-origin.
