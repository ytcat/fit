# Fit v1.74 checkpoint

The Friday, November 20 release work was spread across `main` and `release/chapter-one-scenery`. The compact car (`2419d9a`), Hazel’s stall (`bf7e79a`), its background preload (`577bd22`), and parallel regression jobs (`a8d7efd`) reached `main`. The animated street tree was recovered from `b1bf20e` into `release/v1.74-recovered`.

The recovered build keeps the current stall in both Market Row films. The opening loads the reduced-detail tree before the film and uses the generated tree if the GLB is unavailable. The tree GLB and its source are tracked in Git under `assets/street/ch01-trees/` and on `art/city-components-20261113`, respectively.

`node tests/city-assets.test.cjs` passed with the recovered build, including the tree’s breeze, replay, cache isolation, and geometry budget. Run `bash scripts/run-tests.sh` with Playwright and Chromium available for the full check. After merging, verify the published build at [Fit](https://ytcat.github.io/fit/).
