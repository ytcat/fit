# RingFighter short-session and presentation fixes — 2026-11-09

Baseline: `47c65dabce096f757fdbb6cc4bc6775ff6e088fa` (published main).
Implementation: `88d3e2b` and `0cfdf542c02e4d57bdd95e33f1e1b6baf3a14bab`, isolated branch `lion/short-session-bugfix`.

## Behavior delivered

- Closed the boot toe, heel and bottom; fitted the complete articulated ankle shaft to the actual posed shin. Moved tongue/laces and added an upper binding. Both species retain foot pivots. Across guard and five punches at five phases, the tested lower-leg surface stays inside the shaft (maximum normalized elliptical radius squared **0.96123**, below 1).
- One world-fixed directional light casts into the full ring. Shadow maps update with the moving fighter. Fine coat/mane ribbons no longer cast speckled shadows; the opaque mane mass and body still cast on the floor. Skin no longer receives self-shadows: this intentionally removes the chest artifact at the cost of skin self-shadowing, while retaining diffuse muscle shading.
- Training defaults to **15 seconds** and stops at completion. Fight choices are **20, 40 or 60 seconds**, or **2 × 20 seconds** with a **10-second** break. Existing explicit-duration programmatic calls remain compatible.
- A running player combination accepts **one next combination**. It executes after the current movement without snapping the pose; additional buffered chains are refused. Ownership and training/fight loadouts remain authoritative. Locked controls clearly open the loadout library. Both combo rails contain punch combinations.
- Rope Play exposes **Double under**, synchronized with the next jump boundary, for three jumps. Repeated presses cannot interrupt an active trick. Default automatic footwork varies between two feet, alternating feet and each single leg, with eased transitions. The existing focused footwork choices remain in settings.
- Fight introductions, HUD and winner announcements use profile/opponent names without a species suffix. An actual KO result immediately displays a large centered **KO**, with e.g. **Shadow won** beneath it.
- Replaced the long store with category navigation, square illustrated item tiles, buy/equip states and a live fitted avatar preview. Added earned cosmetic head ribbon, skin-following arm ribbons and a cosmetic champion-style belt. These do not grant a sporting title, stats, reach, damage or XP. Purchases persist atomically through the existing career store. The arm-ribbon preview uses a quarter view so its width is visible.
- World uses compact Practice/School/Rivals/Events tabs. The six-combination library is visible without scrolling at the tested standard phone viewport. Existing school, rivals, events, backup, offline download and reward recovery remain available.

## Evidence and commands

**GitHub validation passed all 70 suites, syntax and asset checks** for implementation `0cfdf54`: https://github.com/ytcat/fit/actions/runs/42571465196. Browser and offline reload checks passed.

Actual Chromium screenshots and browser result data are in `qa/bug-review/`. Wallet/activity setup in the UI harness is a deterministic test fixture, **not human-played progress**. KO UI evidence uses the real match's `finish()` result, but is not evidence of a naturally played knockout animation.

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
find . -type f -name '*.js' -not -path './node_modules/*' -print0 | xargs -0 -r -n1 node --check
NODE_PATH=/tmp/fit-tools/node_modules node qa/bug-review/browser.cjs
APP_URL=http://127.0.0.1:8128 NODE_PATH=/tmp/fit-tools/node_modules node qa/career-r1/offline.cjs
NODE_PATH=/tmp/fit-tools/node_modules QA_BUILD=candidate node qa/bug-review/performance.cjs
```

The browser harness verifies actual WebGL shader compilation, changing GPU shadow maps under movement, exactly one shadow-casting light, purchases/equips of all three accessories, four scroll-free store layouts (320×568, 393×852, 430×932, 844×390), Hebrew/Russian store layouts, six-combo library, World tabs, actual queued `jab → jab → cross`, short/name-only fights, and KO text. Offline installation/reload includes **77** same-origin assets (~21.16 MB uncompressed source files). No new runtime package, CDN or paid asset is introduced.

The fitted ribbons reuse the exact original body's vertices, categorical skin attributes and visible/depth/distance deformation hooks. They add one draw and 3,754 triangles per dressed boxer, with a bounded 6 mm normal offset; no per-frame ribbon geometry upload. Rigs, IK, contact scoring and the paired legacy controller/model are preserved.

## Short performance diagnostic

Matching seed **78**, 393×852 desktop-browser viewport, 32 production arena updates after four warmups, followed by one WebGL render. Raw results and method are `qa/bug-review/performance-*.json`; rerun `performance.cjs` with `APP_URL` and `QA_BUILD`. This is a microbenchmark, not a sustained FPS test.

| Metric | Baseline 47c65da | Candidate 0cfdf54 |
|---|---:|---:|
| Submitted triangles, including shadows | 2,287,524 | 2,224,947 |
| Draw calls, including shadows | 848 | 856 |
| CPU arena update median | 6.95 ms | 5.85 ms |
| CPU arena update p95 | 10.60 ms | 14.40 ms |
| Renderer texture count | 25 | 25 |
| Renderer geometry count | 399 | 404 |

Triangle submissions decreased by 62,577 while boot closure added eight color/shadow draws. The short CPU measurements vary with allocation and runner load; the higher candidate p95 means **no end-to-end speed improvement is established**. Single cold render submissions took 2.15/2.37 seconds on SwiftShader and include shader initialization; those are not gameplay frame times or phone GPU timings. Reliable frame-time/thermal acceptance remains open.

## Remaining limits

- **Crossover is withheld, with no executable crossover path/button in this release.** The attempted path's opposing forearm centerlines approached 3.07 mm. A candidate improved opposing-arm clearance but still penetrated a conservative torso proxy by 37.8 mm. Reachable wrists and a clear cable were insufficient. A future implementation must validate arm/torso separation and rendered skin continuity before enabling it.
- Performance sampling is desktop Chromium on Linux using software WebGL at a phone-sized viewport, not a physical phone GPU benchmark or sustained thermal test. It measures arena CPU updates and actual render submissions; end-to-end automatic-quality frame pacing is not measured. A broad desktop/mobile sweep was stopped after excessive software-renderer time under concurrent QA. Its timings are not used as acceptance evidence. Physical iPhone Safari and Android remain **NOT VERIFIED**. Render CPU submission time is not GPU completion time.
- This release addresses this bug packet; it does not claim the complete realism/PRD roadmap, photorealism or a subjective 75/100 visual score. Safe resume, authored facial reconstruction, venue/tournament milestones and remaining roadmap gates require separate integration/review.
- Sol reviewed queue/equipment/ownership/timer routes. Astra reviewed the demanding graphics/clearance concerns; its unsafe crossover finding was honored. Screenshots, rather than code-only assertions, drove the final boot and preview corrections.

Rollback: revert these isolated release commits together, including the versioned index and offline manifest/worker. Existing classic equipment IDs and the base rigs remain intact. Accessory records are optional, independently validated cosmetic data.
