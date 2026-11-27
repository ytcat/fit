# Approved city browser QA

Code target `095d855cb7a21691149487c21eb90f1b29bd5635`, with current `origin/main` `e25cd5389d4ab341aff130f530c1087e2dc87fac` as an ancestor. Worktree `/workspace/fit-approved-city-qa`, branch `wip/approved-city-browser-qa-20261127`. The original `546e8be` worktree and its recovery bundle are preserved. Its experimental street controls, avatar joins and failing ringless camera candidate are separate. The approved city branch already contains the saved ringless result, night light and crossing work, so their equivalent duplicate commits were excluded.

Browser QA runs on the exact code target. Logs and captures: `/workspace/fit-v199-delivery/city-qa/`. Use `/workspace/otto-system-chromium.cjs` as Node preload to select installed Chromium. User-facing entry is local `index.html`, with the normal game profile and free-walk / street-bout paths.

Release held pending new docks review. Rejected crane and triangle boat remain absent. No version bump, merge or public push. Northline remains staged. Direct live version access was previously blocked by HTTP 403, and the release owner is verifying it separately.
