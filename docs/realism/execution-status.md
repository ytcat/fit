# Master brief implementation checkpoints

Source brief: [FIT_REALISM_CODEX_MASTER_INSTRUCTIONS.md](../FIT_REALISM_CODEX_MASTER_INSTRUCTIONS.md).

- Phase 0: fresh isolated branch, exact published baseline, architecture map,
  two-species/four-angle snapshots, material-neutral checks, test proof and
  reproducible short software-renderer profiling. Physical-device and sustained
  thermal measurements remain unavailable; representative snapshots do not yet
  cover every action's complete animated timeline.
- Phase 1 foundation: structured final-pose contract, explicit coordinate spaces,
  reusable buffers, quaternion interpolation and tested capped clock utility.
  A 120-Hz mitt-station pilot now solves both characters, aggregates real
  contacts and uploads skin/face/mane detail once per displayed update. Whole-game
  layer ownership, render interpolation and remaining clock migrations are not complete. The legacy controller remains the source of authoritative poses.
- First motion pilot implemented: all six mitt punches, centred compact uppercut
  targeting, down-facing catches, upward mitt recoil, incoming swept contact and
  arbitrary player wait timing. Same-hand assignments and 1.2-metre standing
  separation remain. Both species pass targeted tests at normal and extreme pacing.
- Phases 2–3: complete data-driven action families, all defensive reactions,
  unified impact event across every mode, bounded stagger/recovery with support
  steps and comprehensive interruptions remain to be implemented/validated.
- Phase 4: new geometry/material authoring and cross-character visual review
  remain. No new realism score or replacement character asset is claimed.
- Phase 5: modern-Three, incremental GLB and constrained Rapier proof-of-concepts
  remain isolated experiments to perform after baseline/behavior gates.
- Phases 6–7: sustained physical-device profiling, final quality tiers and full
  four-angle animated regression matrix remain; current QA is an engineering
  baseline and first tested milestone, not completion of the complete brief.

PR access: `gh pr list --repo ytcat/fit --state open` is blocked by the environment's
network policy at `https://api.github.com/graphql` (Forbidden). The tested review branch is `release/realism-master-first`. A concrete
`gh pr create --base main --head release/realism-master-first --body-file ...`
attempt also returned `Post https://api.github.com/graphql: Forbidden`.
No PR was created; a branch/compare link is not an existing PR. Git transport and public GitHub
Actions pages are accessible. YouTube reference frames are also blocked (403).

Next migration order: profile extreme-rate mitt catch-up cost, establish explicit
layer ownership and render interpolation, then migrate other controllers without
nested clocks. Capture the final post-contact pose once. Do not relax elbow,
wrist or foot collision tests to make motion gates pass.

[First milestone evidence and limitations](first-motion-milestone.md).
