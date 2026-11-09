# Rounded shorts QA

Run from the repository root with Chromium and Playwright available. Start a local HTTP server on port 8137. Capture the fixed baseline (commit `37255d5`) and current source with:

```sh
node qa/rounded-shorts/capture.cjs before /tmp/shorts-before
node qa/rounded-shorts/capture.cjs after /tmp/shorts-after
node qa/rounded-shorts/metrics.cjs before
node qa/rounded-shorts/metrics.cjs after
node tests/avatar-surface.test.cjs
```

The capture script accepts a third positional base URL. Each run records lion and rabbit in guard, roll crouch (labelled squat), and hook at fixed phases from front, profile (labelled side), quarter and rear: 24 PNGs, two overview sheets, and render counters. RAF animation is paused, shadows disabled, and pixel ratio fixed at 1. Captures examine garment shape; they do not establish full-motion realism or phone GPU performance.

Metrics include garment vertices, triangles, attribute bytes, character mesh count and sorted hashes of all vertex attributes (including weights) at the hems and below y=.89. Matching hashes establish those lower regions are unchanged. Browser counters should preserve draw calls and reduce submitted triangles by 4,496 at each matched view.

Review the continuous upper hip silhouette, three intended garment openings, crotch support, body coverage and detached panels. Preexisting limitations include jagged opening edges, interrupted gold side stripes, and one lower-hem triangle whose averaged vertex normals oppose its face normal. The regression winding assertion covers the modified upper panels; the existing topology test still checks all garment boundaries.
