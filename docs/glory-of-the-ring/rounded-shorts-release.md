# Rounded upper shorts — GOTR-0011

Baseline: `37255d5`; scoped source: `c5a2311`. Menu/public-title integration preserves `ca8e396`.

The wide leg volumes previously ended in flat upper caps outside the narrower hip shell, exposing a horizontal shelf. Their upper field now rounds into the hip shell in the existing continuous garment. The skeleton, weighting algorithm, materials, lower hems, other body geometry and contact remain unchanged. No standalone panels or extra draw calls are added.

## Actual browser evidence

Both species × guard/roll crouch/hook × front/profile/quarter/rear:24 matched views per version. [Lion before](../../qa/rounded-shorts/before-lion-sheet.png) / [after](../../qa/rounded-shorts/after-lion-sheet.png); [rabbit before](../../qa/rounded-shorts/before-rabbit-sheet.png) / [after](../../qa/rounded-shorts/after-rabbit-sheet.png). The square shelf is removed without new visible holes or detached panels in these sampled poses. Astra authored/reviewed the demanding geometry; root separately inspected actual rendered sheets and diff.

Garment geometry:75,346→70,850 triangles;226,038→212,550 vertices;13,562,280→12,753,000 attribute bytes. Character mesh count160 and matched browser draw calls unchanged. Hems and all vertices below y=.89 retain identical sorted attribute hashes, including weights. [Raw matched render counters](../../qa/rounded-shorts/render-comparison.json) and [measurements/test results](../../qa/rounded-shorts/results.json).

Focused checks pass: `avatar-surface`, `avatar-normal-frame`, `coach`, `character-selection`, `contact-transform`; changed syntax/whitespace checks pass. New assertions cover upper width/outward winding; existing boundary/pelvis tests remain. The full suite, versioned offline pack and exact deployment are required before publication; see release handoff for their final status.

## Limits and rollback

These fixed poses use Linux Chromium software WebGL, pixel ratio1, shadows disabled to inspect shape. This establishes neither sustained device FPS nor all-motion cloth collision. Existing jagged hem edges, interrupted gold stripes and a lower-hem normal discrepancy remain; this task fixes the reported upper shelf. Physical iPhone/Android performance remains NOT VERIFIED.

Rollback the scoped shorts source/test commit and its corresponding asset/offline versions together. Menu and saved profiles need no migration. [Remaining tasks and effort](remaining-small-releases.md).
