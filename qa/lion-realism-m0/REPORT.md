# Lion realism M0 — frozen baseline, not an avatar release

Source: `280775eef9cb80903eaf258cb43f7900cd0d61a4` (R78). Date: 2026-11-05 UTC.
Branch: `audit/lion-realism-m0-20261105`, isolated worktree `/workspace/fit-realism-m0`.
Application source, live main, deployment, saved controls and character assets are unchanged.
The full brief supplied in the conversation is the governing plan; its proposed
`LION_REALISM_UPGRADE_CODEX_PLAN.md` filename was absent from this checkout.

## Review artifacts

- [Eight-view face](face-eight-views.jpg) and [clay face](clay-eight-views.jpg)
- [Production body](body-eight-views.jpg), [underarms](underarms.jpg),
  [punch poses](punches.jpg), [expressions](expressions.jpg)
- [Measurements](measurements.md), [test summary](test-summary.json),
  [baseline identity](baseline.json)
- Raw browser renders, screenshots, shader sources, per-frame rows and silent
  recording: `/workspace/lion-realism-evidence/280775e`
- [Clean evidence archive](/workspace/lion-realism-evidence/r78-lion-m0-280775e.tar.gz)
  and [silent motion recording](/workspace/lion-realism-evidence/280775e/video/lion-baseline-sequence.webm)

## Collaboration and reproducibility

Fetched main before creating this worktree. Public GitHub PR page showed zero open
PRs; remote heads also include `feature/boxing-course-ux`,
`fix/anatomical-gloves-and-motion`, `improve/lion-boxing-coach`,
`referee-glb-experiment` and `referee-r71-backup`. Branch names do not establish
ownership or inactivity. This thread has no other agents; outside ownership is
unknown. No app edit, reset, cherry-pick, merge, push or publication was performed.
Baseline file hashes, script order and environment metadata are in `baseline.json`.

Read README.md, PROJECT_PROGRESS.md, docs/review-2026-11-04.md,
docs/r76-contact-avatar-review.md, docs/implementation-audit.md and recent commits.
The supplied architecture predates some R78 features. Current R78 already includes
14 anatomy activation channels, connected leather mitts, reaction expressions,
simultaneous-contact constraints and generated training. These are preservation
requirements. README's old combination count is stale; it is not evidence of
missing current routines.

## Architecture and measured priorities

The default lion is not an exported GLB. Baked JSON is refined/sculpted at runtime,
weighted into the existing custom skeleton, then combined with face attachments,
mane, short coat, clothing and equipment. The old `boxing-coach.js` /
`coach-surface.json` pair remains intact for cached/legacy clients. The current
pair is `boxing-coach-v2.js` / `coach-surface-v2.json?v=1`. Script cache suffixes
are recorded verbatim, not updated for this QA-only work.

Bundled Three.js revision 128 was confirmed in an actual WebGL2 context. Shader
patches wrap existing `onBeforeCompile`, rather than using modern Three APIs.
Compiled vertex/fragment sources are saved under the external evidence `shaders/`.
The effective position pipeline is rest-space anatomy activation and bounded
contact dent, hybrid DQ/linear skinning, then posed axilla correction and coat
motion. Depth/distance materials receive corresponding position patches. Normals
have anatomy deltas, skinned normal transforms and posed surface corrections.
`skinPoint()` provides a position QA path, not a complete GPU normal oracle.
Do not reorder these patches or replace the skeleton during M1.

Actual idle lion inventory: 163 meshes (158 visible), 162 unique geometries,
38 materials including custom shadow materials, eight textures, 561,257 visible
triangles before shadow repeats. Typed geometry backing arrays total 58,383,692
bytes; decoded RGBA8 textures with estimated mip chains total about 4.63 MB.
These are estimates, not total GPU allocation or network bytes. The phone
profile reduces the lion coat to 5,629 triangles; it retains the body surface. Runtime refinement
makes the 3.4 MB source JSON an unreliable proxy for render cost.

Largest surfaces: body 243,664 triangles / 121,804 vertices; shorts 75,346 triangles;
each glove 32,228 triangles; short coat 19,191 triangles; mane 19,098 triangles.
The all-pass idle render submits about 318 calls and 1.12 million triangles.
Full desktop fight submits about 943 calls and 2.58 million triangles.
This rules out blindly adding global tessellation or more hair as a sensible
first step. Full-scene inventories and per-mesh/material/texture listings are in
raw profile JSON; shared geometries/textures are counted once by identity.

`avatar-detail.js` initially sets coat shadow casting false, but the later coach
constructor sets it true on every mesh. Runtime inventory confirms the short coat
casts shadows. This is an existing baseline finding, not fixed in M0. A separate
coat-shadow ablation quantifies its cost without changing production source.

The mane has 24 spring regions, bounded offsets, opaque double-sided ribbon
geometry and an ellipsoidal undercoat. Each active update rewrites its entire
position attribute (687,528 bytes). Normals are not regenerated by `updateMane()`.
The idle profile indeed uploads about that many buffer bytes per frame. The
mane-off diagnostic removes both update and visible mane/undercoat, so timing
changes combine CPU upload and render savings; they do not isolate one cause. Desktop median RAF spacing is essentially
unchanged (1316.6 vs 1316.7 ms) despite zero median uploads with mane off.
This does not establish a throughput benefit from a mane optimization on phones.

The facial system includes recessed head-surface eye sockets plus separate eye,
iris, pupil, highlight, lid/brow curves, nose leather/nostrils, whiskers and ear
attachments. R78 adds jaw surface deltas, reactive lip/interior, brow motion,
squint/blink and side-dependent bruising. These are deterministic authored
expressions, not a facial simulation. M1 must improve continuous skull/muzzle
shape before increasing decorative detail.

## Rendering and measurement method

Production uses physically correct lights, sRGB output, ACES filmic mapping,
exposure 1.05 and soft PCF shadows (1024 map). Default DPR is capped at 1.5;
the diagnostic low tier uses DPR 1 and disables shadows. The production adaptive
quality controller is deliberately bypassed in fixed-tier samples so scenarios
remain comparable. Shadow and main passes are included by disabling automatic
renderer-info resets and resetting once per sampled frame.

`instrument.js` is injected only by the QA driver. It pauses the original app RAF
callback, advances production `arena.update()` with the same 50 ms delta cap,
runs swing/contact audio callbacks and invokes the existing renderer. Component
method timings are inclusive and must not be summed. GL buffer/texture entry
points record upload traffic. Buffer byte counts describe JS submission;
texture bytes and mip memory are estimates. Draw calls/triangles use actual
renderer counters, not source file sizes. RAF intervals measure observed browser
scheduling/render throughput. `renderCpuSubmissionMs` does not measure GPU
completion. No disjoint GPU timer extension is available in this environment.

Each profile uses a fresh context, five warmup frames and 30 measured frames (standard median; nearest-rank p95),
serialized in one browser with no other test/capture jobs running. This is a
short diagnostic baseline; p95 is reported from those 30 samples, not a sustained
thermal/phone benchmark. Simulated time advances more slowly than wall time on
this software renderer. Fight skips the introduction and runs the actual seeded
match/arena/referee/audience code. The small sample cannot cover an entire round.

The browser is Chromium 155 with ANGLE/SwiftShader software Vulkan, not a hardware
GPU. Desktop viewport 1100×950 at DPR 1; phone-sized Chromium viewport 393×852 at
device DPR 2 (render cap 1.5) with touch and an iPhone UA. It is still Chromium,
not Safari or an iPhone. No physical iPhone Safari or Android device is available.
**NOT VERIFIED ON PHYSICAL PHONE. No 30/60 FPS or release performance claim. The 1–3 second cloud RAF intervals
are software-renderer observations, not estimates of users’ phone performance.**
Startup also waits for all three JSON assets: coach, rabbit and equipment
total about 17.13 MB raw before transport compression. The idle lion constructor
took about 2.07 s in desktop-profile Chromium and 2.31 s in phone-profile Chromium
on this machine; the first observed GL draw after coach creation was about
3.30 / 3.48 s from navigation. Coach-ready polling observed about 6.13 / 7.03 s,
which includes polling/render scheduling and is not an exact first-present marker.
This argues against inflating startup geometry or adding runtime sculpt work.
Startup values use local loopback, uncompressed/no-store responses and include
shader/asset warmup on this cloud machine. Response JSON timings combine body
read and parse. They are not isolated parsing time or real mobile download time.
The first-draw marker is the first GL draw after coach construction is observed,
not proof that a complete character frame was presented. JS heap is observed
where available; it is not GPU memory. Texture uploads during
steady-state samples are separate from startup texture allocation.

See [measurements.md](measurements.md) for the compact table and
[measurements.json](measurements.json) for startup, raw summary and component costs.
External per-frame rows, geometry inventories, shaders and screenshots are in
`/workspace/lion-realism-evidence/280775e`.

## Visual evidence method

The reversible QA studio reuses the actual lion and all existing deformation
shaders. It renders 720×900 pixels, fixed FOV/camera/pose/time, white diffuse key,
modest neutral fill/rim, gray floor and a six-step gray chart. Material properties
are temporarily changed in place to preserve shader closures. Clay removes maps,
vertex color, mane/undercoat and coat fibers to expose connected anatomy; fitted
eye/nose attachments remain visible. Production lighting uses the original
scene lights and floor. No generated concept image or substitute mesh is used. The browser test context
bypasses CSP for instrumentation only; the shipped security policy is unchanged.

The matrix includes eight body/face angles in clay and textured neutral light,
plus production light; both hands' jab/cross/hook/uppercut load/contact/recovery,
slip/roll/steps; underarm closeups; neutral/blink/left/right head/body/block
expressions; glove palm/back/knuckles and boot views. Forced diagnostic hit poses
do not establish accumulated bruise history or real collision registration. The clean matrix contains 196 PNGs with zero page/shader errors; 85 clay/textured
pairs have exactly matched camera metadata. Image hashes, dimensions and unique
IDs were checked. All 16 composed browser studio screenshots are pixel-identical
to their corresponding direct WebGL RGB captures. Exact parameters, camera,
counts and image hashes live in the external `render-manifest.json`.
The silent motion recording uses the actual WebGL canvas captureStream and
MediaRecorder during cloud-browser playback, with its actual frame
interval timeline saved separately; no interpolated frames or FPS claim.
Static pose captures reset spring history for reproducibility; they do not
validate dynamic hair lag. The separate recording retains temporal state. Software rendering yields sparse
actual motion samples, so this clip cannot establish animation fluidity; use
the saved frame timeline and pose matrix alongside it. The final VP9 recording
is 720×900, about 17.93 seconds encoded, with 17 rendered updates spanning all
ten actions; timestamps are nonnegative and page/shader errors are zero.
The fixed-pose PNGs are read directly from the browser WebGL canvas immediately
after rendering; test workflow images and the separate 16-view studio screenshot set use
browser composition. Initial compositor captures had a QA layout/resize conflict and
are excluded under `excluded-initial-compositor-captures/`. The studio now
disconnects application resize observers and hides surrounding UI while retaining callback targets to prevent
camera resets. The first studio run also removed UI nodes and caused periodic text-update
callbacks to throw; that attempt is archived separately and the clean rerun
retains hidden DOM nodes. The performance runs used the untouched application
layout and are unaffected by these capture corrections.
All are **before** images. M0 makes no before/after improvement claim.

## Observed visual findings

The verified neutral front closeup has a rounded forehead and muzzle, strongly
outlined separate eye/lid/brow layers, and coarse triangular mane roots visible
at the crown. The clay profile exposes facet-like shading on the skull/neck and
separate lid shapes that textured/fur views partly conceal. Raised-arm clay views also show crease-like shading at the axilla, retained
as an M3 diagnostic rather than declared a geometry hole. These are observed
baseline limitations, not proof that more triangles are needed. M1 should test
surface normals separately from head contour in its clay A/B comparison. Raised
gloves obscure part of the lower face in guard; keep the same guard for matching
comparisons and add a controlled unobstructed diagnostic when evaluating the jaw.
Mane crown/groom improvements belong to M2, not an unreviewed face rewrite.

## Validation

All 32 `tests/*.test.cjs` suites pass; all checked application/vendor JS parses.
`tests/browser.cjs` passes 1100×950 and 393×852: techniques, camera views, freeze
and English/Hebrew/Russian. `tests/browser-r78.cjs` passes both viewports:
Foley sample durations, generated-training preservation across targets/languages,
contact overlap bound, ring construction, anatomy channels and rendered audio
signal. Audio rendering proves a decoded audible signal, not an actual phone
speaker or subjective sound quality. Existing tests establish their assertions,
not absence of every possible interpenetration or visual defect.

Commands (from this worktree):

```sh
python3 qa/lion-realism-m0/run-cpu-tests.py /workspace/lion-realism-evidence/280775e/tests
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node tests/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node tests/browser-r78.cjs
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium M0_FRAMES=30 M0_WARMUP=5 node qa/lion-realism-m0/browser-baseline.cjs profile
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node qa/lion-realism-m0/browser-baseline.cjs capture
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node qa/lion-realism-m0/browser-baseline.cjs screenshots
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node qa/lion-realism-m0/browser-baseline.cjs video
python3 qa/lion-realism-m0/summarize.py /workspace/lion-realism-evidence/280775e
```

QA runtime: Node 24.22.1, Playwright 1.51.1, system Chromium 155; Python/Pillow
versions and platform are in baseline.json. A reusable local install can use
`npm install --prefix /tmp/fit-tools playwright@1.51.1` and the platform Chromium
package, with Pillow installed in a Python environment. These are test tools.
Pillow is only needed for arranging the actual render contact sheets. Playwright
and system Chromium are QA dependencies, never runtime dependencies. No licensed
external character asset, paid service, CDN or model runtime was added.

## Explicit coverage gaps

No physical phone, thermal soak, entire-match GPU benchmark, Safari/Android
shader run, exhaustive cached-client/network-failure matrix or subjective
listening assessment is established by this M0 run. Existing tests cover legacy
geometry/rig assertions, not every old-browser rendering combination. The capture
matrix is an anatomy baseline, not proof of zero penetrations throughout a match.

## M1 implementation plan and acceptance

1. Re-fetch main and inspect PRs/ownership before app edits. Preserve this SHA and
   capture harness; if main has changed, establish an additional current baseline.
   Create a separate M1 branch. Scope changes to lion-only face generation,
   expression binding and explicitly versioned lion asset/controller loading.
   Do not silently modify rabbit/referee, contact mechanics, core IK or audio.
2. Keep the R78 lion as a switchable baseline. Add a diagnostic face variant
   selector (`baseline` / `candidate`) with a safe baseline default/failure path;
   keep old cache-compatible pairs available. Do not make a new GLB or duplicate
   the whole character. Shared shader changes require explicit shared-species QA.
3. A/B-test a shape-driven connected implicit head against the current head in
   clay. Author cranium/temporal/brow, orbital recess, cheek/mandible and jaw hinge;
   feline concave bridge, paired whisker pads, philtrum and lip planes. Use
   controlled smooth unions/subtractions, not global density increases. Preserve
   existing head-to-neck skin weights and boundaries. Fit nose leather and eyes
   to real sockets, with integrated margins, lids and recessed pupils. Avoid
   arbitrary overlapping facial spheres or floating tube decorations.
4. Bake geometry deterministically using the existing Python pipeline. Add
   lion-only parameters/output so rebuilding does not overwrite rabbit/equipment
   assets. Record the exact rebuild command, dependencies, asset hashes and build
   seed. Review neutral eight-view silhouette before fur/material polish.
5. Adapt the existing reaction timeline to a compact set of connected facial
   deltas: blink/squint, brow tension, cheek/lip pull and lower-jaw recoil.
   Preserve hit-side bruise placement, gaze, muzzle/contact extents, nonpenetrating
   mouth cavity/teeth and recovery to neutral. Face effects follow registered
   impacts, not arbitrary clip phases; block/body/head expressions remain distinct.
6. Compare baseline/candidate with identical manifest parameters: eight angles,
   jaw closed/open, blink, both hit sides, guard/jab/cross/hooks/uppercuts,
   slips/crouch and impact recovery. Inspect clay first, then neutral texture,
   then production lighting and motion. Reject seams, eye popping, embedded pupils,
   lip/teeth penetration or neck discontinuity. The reference checklist is golden
   tawny coat, adult feline muzzle/eyes, layered mane, muscular boxer, red leather
   gloves and black/gold kit. No new concept sheet was supplied as an actual
   accessible 3D asset, so no exact visual-parity claim is justified.
7. Re-run all 32 suites, browser workflows and shader compile checks. Test both
   the current and fallback loader paths, cached mismatches and missing assets.
   Capture contact-driven expressions in a real fight as well as diagnostic
   forced reaction poses. Check paused/seek/resume temporal state explicitly.
8. Re-run fixed-tier costs against M0 and current main. Report added vertices,
   attributes, calls, shader permutations, upload bytes, heap/startup and med/p95.
   Prefer replacing existing facial detail with integrated shape over adding
   many meshes. Do not choose a global triangle ceiling from this cloud result.
   Physical iPhone Safari and representative Android sustained full-fight testing
   remain a release gate before any claim that mobile performance is acceptable.

M2–M7 remain future milestones. A shader-upload mane optimization, shadow-policy
fix or body rewrite would be separate measured work, not smuggled into M1.

## Delivery boundary

M0 is complete. Only `qa/lion-realism-m0/` is added on the audit branch.
M1 is planned, not implemented. No current/legacy application file or generated
character asset changed; source hashes match the frozen SHA. Main and the
original worktree remain unchanged. This is review evidence, not a published
visual upgrade or approval of physical-phone performance.
