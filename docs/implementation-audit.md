# R24 implementation audit — 2 November 2026

For the current rig, shoulder topology and arm-motion changes, see
[R25 shoulder and elbow fixes](r25-shoulder-and-elbow.md). The audit below
records the preceding R24 implementation and its verification limits.

Repository: `ytcat/fit`, branch `main`. Baseline: `021444c299697c9195ae2537b713efddbe099ea1` (R23), initially clean. No AGENTS.md or package manifest is present. This is a static app: `python3 -m http.server 8080`. Established release route is main → GitHub Pages, at https://ytcat.github.io/fit/. The live browser was opened and displayed R23 before this release.

## Existing implementation

- Same-origin Three.js r128 and GLTFLoader, with included MIT notice; no dependency update or paid service.
- Original connected implicit body/shorts surfaces in `assets/models/coach-surface.json`, authored by `scripts/build_coach.py`. Runtime mesh generation adds gloves, face, mane, boots and accessories. No downloaded third-party character asset is introduced.
- 21-bone shared skeleton, normalized four-influence weights, hybrid dual-quaternion/linear skinning with matching shadow shaders. Y up, +Z forward, metres; scene placement is separate from bounded authored motion.
- Authored two-bone IK paths for jab, cross, both hooks, both uppercuts, slip, roll and footwork; `boxing-routines.js` supplies twelve combinations and seeded random sparring. Existing speed-bag mode uses alternating circles. Rabbit and fight modes use the same rig and action names. No kicks are selectable.
- Gloves use -Y wrist-to-knuckle and +Z palm. R23 mirrored the right glove using a negative X scale. R24 bakes handedness into geometry and reverses triangle winding, retaining a proper wrist basis and separately mirrored thumb compression.
- Prior raised-arm deformation comes from the joined rest surface, influence partition and interpolation; it is not fully solved by extra shading. R23 helper bones and camera envelopes are retained. Sharpening the weight partition was tried and rejected because existing strain limits regressed.
- Existing camera fits include a conservative moving glove/body envelope, portrait profile widening and arena-specific framing. Same-origin CSP and local speech-voice checks are preserved.

## R24 additions

One-minute health-based fight, damage bars, zero-health KO/fall and immediate quick-fight result, contact dwell and deeper committed reach; 24 inertial mane guides in arena space with bounded substeps and reset; facial compression/squint/recovery and blinks; speed-bag reachable hand circles and effective angular collision mass; heavy-bag height subdivisions for a local dent; modal bell, stereo clap buffer with peak normalization, and contact-triggered voiced exhalation. Pixel ratio adapts with a 12-second dwell and hides rendering work while the document is hidden. Reduced quality changes pixel work/shadows rather than technique or contact clocks.

## Evidence and limits

The prior handoff and existing R23 reference review were read. This turn's Library image read returned an asset pointer, not viewable pixels; no claim is made that those reference photographs were newly reviewed. Actual posed CPU mesh previews were generated and inspected. They omit PBR, textures, lighting and shadows. Angular underarm folds remain visible; the character remains stylized. This is not a completed photorealistic production sculpt or a soft-tissue finite-element simulation.

Local Playwright could not launch because no browser binary is installed; normal browser installation failed with an empty/non-ZIP response. The cloud browser loads the real published UI but reports WebGL unavailable. Consequently shaded animation, perceived sound quality, real iOS/Android performance, heat, GPU memory and sustained ten-minute rendering are NOT TESTED here. These limits prevent claiming the full realism handoff's visual/performance gates passed.

No portable GLB is claimed: the canonical asset remains the existing surface data plus bundled rig, custom skinning and runtime systems. Exporting this custom shader/deformation pipeline into a general GLB viewer would require additional authoring and validation.
