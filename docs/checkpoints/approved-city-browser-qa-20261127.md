# Approved city browser QA

Code target `095d855cb7a21691149487c21eb90f1b29bd5635`, with current `origin/main` `e25cd5389d4ab341aff130f530c1087e2dc87fac` as an ancestor. Worktree `/workspace/fit-approved-city-qa`, branch `wip/approved-city-browser-qa-20261127`. The original `546e8be` worktree and its recovery bundle are preserved. Its experimental street controls, avatar joins and failing ringless camera candidate are separate. The approved city branch already contains the saved ringless result, night light and crossing work, so their equivalent duplicate commits were excluded.

Browser QA runs on the exact code target. Logs and captures: `/workspace/fit-v199-delivery/city-qa/`. Use `/workspace/otto-system-chromium.cjs` as Node preload to select installed Chromium. User-facing entry is local `index.html`, with the normal game profile and free-walk / street-bout paths.

Release held pending new docks review. Rejected crane and triangle boat remain absent. No version bump, merge or public push. Northline remains staged. Direct live version access was previously blocked by HTTP 403, and the release owner is verifying it separately.

## Distance detail plan (owner, 20:34 UTC)
Author near, mid and far geometry together with shared pivot, orientation, ground contact, silhouette, color, marks and footprint. Use existing FreeWalk tile/facade culling and instancing or batching. Use a small hysteresis band and a hard cap on near objects. Keep collision separate, common across tiers, and shadows cheap. Test slow approach, turn-back and repeated traversals at phone framing in day/night where relevant. Check for popping, doubles, invisible walls, frame-time distribution, triangles/draws and allocation growth. Label device emulation. Investigate district streaming only if real device evidence identifies loading or memory as the problem.

Containers first: 239 placements × 8,683 triangles would be about 2.08M triangle instances before culling. Keep cheap ribbed/color/label forms at distance. Use a shared shell and separate marks for the four approved liveries, with hinges, rods, handles, wear and high-resolution labels only nearby. Source package libfile_bc03a7b2c0e081919c6be2d20bc26496. The parent will stage the exact assets if needed. This approves visual direction for integration and testing. Keep stock fallback. The new crane and ship await approval. Future approved versions should keep their silhouette at distance and reserve cables, deck railings, interior and hardware for close views. Shops should pause animated atlases/NPCs outside range and use simple distant geometry.

## Browser findings
- 402×690 Chromium SwiftShader on exact city code: gym, Market, Docks, fairground all reached with zero logged errors. Market shows Hazel's stall and lamp. Docks capture shows readable lamp pools and HUD but does not frame the hero container. Generic fairground waypoint lands at an occluded/steep view and does not verify the wheel. These are software-rendered phone-size captures, with no hardware performance claim.
- Street-level storefront camera probe: bar interior, bartender and patrons visible, with tree leaves crossing the sign. Record shop and florist central sightlines clear. TV screens are visible through glass at one angle; shelter and poster occlude the offset angle. Keep this open for player-route validation.
- Exact candidate Fang result: win 6 frames, loss 7 frames; zero sampled ring/referee/glove regressions. Browser gate failed on three page errors from incomplete clap loading. Follow-up runtime commit `352185b` uses only currently loaded clap buffers. Audio tests pass. First browser rerun concurrent with graphics capture failed the five-frame minimum (4 win frames, zero ring/referee/glove frames). An isolated rerun is logged separately.
- The canonical container source and distance plan were fetched and verified at `d788f079a6c1e82c93b6ffe86aa4bae4dbccd20d` on `wip/city-detail-plan-20261127`, directly above `095d855`. No container tier wiring, crane or ship integration in this QA branch.

English PNGs and raw logs are in `/workspace/fit-v199-delivery/city-qa`. EN/HE/RU browser sweep, direct wheel placement, container near/far runtime, physical iPhone and final release suite are pending.

- Isolated Chromium rerun on runtime SHA `352185bc4313c24f1c869ed5b90eb3aabc037a24` completed with explicit browser PASS. Raw log `fang-solo.log`.

## Container distance detail and anchored dock QA

Runtime and capture target `ff641e208184d46b2d26330f690850d40c982b63`, with the exact four approved liveries and work plan from `d788f079a6c1e82c93b6ffe86aa4bae4dbccd20d`. Four ground-level stock slots receive distinct paint and IDs at the dock aisle. They share one detailed shell and use individual near markings. Entry is 15 m, exit is 19 m, and at most two detailed containers appear at once. The original stock collision is built before any visual swap. Stock rendering remains available if the pack fails to load. Mid/far stock has paint and ribs, and detailed text is near-only. The candidate keeps the applause fix. No TV relocation, new tower crane or cargo ship was included.

The English FreeWalk entry ran at evening in 402×690 touch Chromium with software WebGL. Inspection cameras used the exact Harborline and Midnight Pier anchors. Harborline entered, exited and re-entered at the matched near/far/return views, and the authored wheel was in frame. No page errors were recorded. The far camera is 34 m out, while the corresponding player stands around 23 m out on walkable ground. The first walking probe crossed Harborline's exit and Nordquay's entry, but camera drift prevented retracing the same aisle. Captures and raw measurements are in `qa/approved-city/evidence/`.

| Frame | Baseline draws / triangles | Candidate draws / triangles |
| --- | ---: | ---: |
| Near | 57 / 470,163 | 60 / 488,468 |
| Far | 117 / 553,690 | 108 / 544,775 |
| Return | 57 / 470,163 | 57 / 467,700 |
| Wheel | 76 / 490,294 | 76 / 490,294 |

Whole-scene textures stayed at 101. Geometries went from 632 to 636 during the candidate run versus 627 in the baseline. This does not establish allocation stability over long traversals. JSON records four render/readback samples per view. SwiftShader timings do not establish iPhone frame rate. Still captures and state samples do not establish transition smoothness.

The focused container-detail and offline-version-match tests passed on v198. The broader city-assets cache test still rejects street precaches already present at `ec007b8` (gull, Harborline, wheel and Hazel stall). None of the new livery GLBs are added to the precache. Leave the cache-contract mismatch, TV sightline, physical iPhone Safari, daylight transition, EN/HE/RU browser sweep and final release suite open.

The corrected heading probe on `ce39312` used the game movement and collision path for two out-and-back passes, with an initial placement only. Across 20 samples, the player moved from the 7 m starting area out to z≈100 and back to z≈120 on both passes. Harborline left the near set and returned on both passes. No page errors were recorded. See `qa/approved-city/evidence/lod-walk.json`.

## Offline contract, west TV bay and daylight replay

Fast-forwarded to the exact offline handoff at `9e65a409e12f80f992110fd33d05e1a9401849da`. City GLBs load on demand. City-assets, container-offline, city-storefronts and offline-version-match passed together. The offline fixture covers a cold miss, warm exact hit and missing stencil. Future incompatible container changes need one immutable directory for the shell and its four stencils.

Runtime `bba3634` shifts the sign, glazing and 12-screen display west into the more open bay. The shop floor and roof footprint, bus stop, navigation logic, bar and Market shops are unchanged. 402×690 Chromium SwiftShader verified the window from two distinct walkable cells with an eye-height camera: 12/12 screen centers clear by the west pavement and 10/12 on the second English view through the shelter. The shelter still edges the second view. Hebrew and Russian both rendered their localized signs with 12/12 screen centers clear on the sampled second view. Bar interior and both Market shops were visible, with some foliage/awning crossing the signs. This is a focused storefront sweep. No page errors were recorded. Evidence is in `qa/approved-city/evidence/frontage-review.jpg` and `frontage-report.json`.

Daylight replay exercised the same dock aisle and matched inspection cameras, with Harborline visible near, hidden far, then visible on return. See `lod-day.jpg` and `lod-day.json`. This augments the original evening and Fang evidence. The two software browsers overlapped, so render timings are diagnostic only. Physical iPhone Safari, continuous visual smoothness and the final release suite are still open. Joystick, navigation/camera, Market cars, transit and additional Market stalls remain open.

## Approved crane and Portward

Ported exact art-only source `97c3f8a306f45f888de4b7c8fc6ef89f417fc556` after saving the frontage checkpoint at `6d7dcd795756f2550a78b82ca667e502d9677bc3`. Explicit owner approval was recorded at 20:54 UTC. Runtime integration starts at `3c70bcd`, browser daylight target `b4c8a52fe82774d659ef6bd9933a04dc166af759`. Only FreeWalk opts into the replacement. Both far models must load to adopt the new layout; otherwise the procedural cranes, hull, deck stacks and collision are built. The far tier is the only tier requested on entry. Mid/near load with proximity, and at most one crane and the ship use near detail together. The ship uses the existing anchor and sea level, and the two gantries keep their previous x centers and use a common rotation toward the south quay. Simple fixed blockers follow the eight new wheel assemblies. Livery slots and 140 stock quay boxes remain. The stock ship and its deck boxes are removed together. All six GLBs use on-demand caching.

Explicit browser PASS on 402×690 Chromium SwiftShader at evening and daylight. Both checks verified the far-only start, individual mid/near fetches with no duplicate URLs, one visible tier per anchor, eight blocked wheel positions, preserved quay stacks, absent stock deck stacks and zero page errors. The simulated player walked east along the quay from about x=-18.5 to -10.5. Anchored daylight inspection framed the port, ship and gantries. The first evening ship camera hit the hangar. The updated camera verified the ship in daylight. Evidence is in `qa/approved-city/evidence/harbor-review.jpg`, `harbor-day.json` and `harbor-evening.json`. These are software WebGL captures, including elevated inspection views, and cannot establish mobile GPU or full-route performance. Focused city assets, container offline, container detail, harbor detail and offline-version tests passed. Partial far-pack fallback passed in a loader fixture. An in-browser offline harbor replay and full night ship review remain pending.

Keep the QA branch out of main until physical iPhone Safari and release gates are complete. Joystick, navigation/camera, Market cars, transit and additional stall designs are separate open work. Existing Fang browser evidence and the matched livery captures are retained.

## Night ship and browser offline replay

Night screenshot on runtime `1e330ec` shows the full Portward hull from an elevated inspection camera. The ship's silhouette and deck are visible in the software-WebGL capture, with darker branding and hull surfaces. The stock fallback was also tested in a separate Chromium replay using the installed app service worker, browser networking disabled, and harbor GLBs missing from cache. Docks opened at night with 91 stock deck containers and 142 quay boxes, no approved harbor group and zero page errors. No worker or lighting code changed. Evidence is in `qa/approved-city/evidence/night-ship.jpg` and `offline-docks.json`.
