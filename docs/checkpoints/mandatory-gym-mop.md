# Mandatory gym mop development update

- Integration base: latest live/main v1.78, `939bfebc9d97a5513f9ace1cbd18e778c699c35a`.
- Source: isolated design branch [PR #13](https://github.com/ytcat/fit/pull/13), exact `5417a8736b7185e51c8516232f2d9c492d14d01d`.
- Scope: complete a direct 3D swipe shift after the first Brick fight, win or lose. Keep old saves, unchanged wages and optional replays. Preserve the separate Otto shop releases.
- Source QA: [regular and real-touch Chromium](https://github.com/ytcat/fit/actions/runs/44928822055), phone touch evidence artifact; not physical Safari.
- Next: validate the exact integration head before any fast-forward, then recheck current main, parallel releases and live version; verify the Pages job and cache-busted live version after deployment.
