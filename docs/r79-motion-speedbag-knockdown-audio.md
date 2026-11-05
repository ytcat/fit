# R79 — uppercut, speed bag, knockdown and recorded audio

Baseline: `eec0dc7a5cb162f6e7bc3c71c40d2472133ce093` (published R78 shoulder fix). Work isolated in `fix/uppercut-elbow-wrist-20261105`, `/workspace/fit-uppercut`; other worktrees, including rejected appearance experiments, preserved. Remote main checked before implementation and again before publication.

## Behavior

- Both uppercuts: less excessive torso/shoulder rotation; endpoint and elbow bend plane derived from an approximately upright forearm. Preserve wrist-to-knuckle alignment and original palm reference when collision solvers reposition the arm. Bag/opponent aiming stays authoritative.
- Speed bag: bounded IK clearance for the padded glove against skull/muzzle, including defensive moves. Compact recovery circles stay ahead of the face; boxer stands 10 cm farther back to deliver the stroke instead of remaining embedded against the bag. Actual measured glove velocity drives the existing pendulum; no extra synthetic rebound kick.
- Existing technique rail becomes ten localized speed-bag drills, including single-hand, doubles, triples, intervals, burst/slip, burst/roll, double/cover and step/reset. No additional drill menu. Existing footer button cycles drills. Leaving speed bag restores the original technique buttons and handlers. Defensive intervals cannot score phantom hits.
- Normal practice cadence is 12% faster; fight attack durations fall from .96/1.12 seconds to .85/.98 before stamina/tempo scaling. Slightly greater effective striking mass and contact-driven recoil; collision, guard, scoring and neutral wrists remain in use. Speed-bag tempos retain their own authored variation.
- Articulated knockdown support keeps boots/legs above the canvas. Local fall orientation works for both fighters. Recovery stages are fall, sit, half-kneel, stand by 3.6 seconds, then a small bounded head/torso shake. Count presentation is 5.6 seconds instead of eight, then both fighters can resume promptly. This is accelerated game presentation, not a regulation referee count or ragdoll simulation. A final KO stays down across scoring/ceremony clock resets.

## Audio and reproducibility

New 48 kHz PCM punch Foley from Kenney's CC0 impact pack, a recorded VCSL CC0 handbell with its natural resonant tail, and a stereo crowd arrangement made from recorded CC0 claps. The applause is an authored mix, not a recording of an actual boxing audience. Playback is close to native pitch; reduced breath level avoids shrill character-like reactions. Existing unvoiced swing/effort sounds and missing-asset fallback remain. No claim that reactions are recordings of an injured person.

`assets/audio/ATTRIBUTION.md` and `recorded-v3-manifest.json` contain immutable source revisions, provenance, source/output SHA256 and licenses. Rebuild with `python scripts/build_recorded_boxing_audio.py SOURCE_DIRECTORY` after obtaining the documented CC0 sources. No paid service, runtime CDN or external generation dependency. New asset names and versioned scripts protect cached clients; old assets are retained.

## Reproducible review

Run from repository root:

```
python qa/lion-realism-m0/run-cpu-tests.py /tmp/r79-tests
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node tests/browser.cjs
NODE_PATH=/tmp/fit-tools/node_modules BROWSER_EXECUTABLE=/usr/bin/chromium node tests/browser-r78.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/r79/browser-flow.cjs
NODE_PATH=/tmp/fit-tools/node_modules node qa/r79/browser-review.cjs
APP_ROOT=/path/to/baseline QA_OUT=/tmp/r79-before NODE_PATH=/tmp/fit-tools/node_modules node qa/r79/browser-review.cjs
```

Browser scripts require locally installed Playwright and Chromium; the game has no such dependency. Compare identical pose, camera, viewport and lighting using the review captures. New CPU tests cover rendered glove vertices/forearm angles for both species and all ten speed drills, actual articulated boot/leg floor support, faster recovery and persistent KO, recorded sample hashes/levels and audio mapping. Existing tests cover reciprocal contacts, guards, mechanics, modes and controls.

Validation results and selected before/after captures are in `qa/r79/`. These are actual Three.js app renders, not generated art. The uploaded user videos are not included in the public repository.

## Scope and limits

No face/mane asset replacement, skeleton rewrite, shared shoulder shader rewrite or realism-score claim. Existing continuous body, appearance fallback, equipment, referee, languages and modes retained. Browser tests use Chromium 155 software WebGL (SwiftShader), including iPhone user-agent/touch and portrait viewport checks. **NOT VERIFIED ON PHYSICAL IPHONE OR ANDROID.** Software-renderer timings do not establish mobile FPS, thermal behavior or iOS silent-switch behavior. No claim of reaching the separate 75/100 appearance target.

Rollback is the preceding published commit and its cached compatible assets; no other agent's work was reset or overwritten.

### Review notes

The first regression pass caught a compressed speed-bag orbit, loss of right-hand
contacts at excessive stand-off, excessive light-bag denting, and a loading-phase
uppercut roll. These were corrected before release: a complete orbit farther in
front of the head, a tight conservative ellipsoid-plus-padding clearance bound,
a real striking gap, bounded light-bag leather compression, and a less ambiguous
loading elbow pole. The target-continuity test's per-frame angular/spatial bound
is scaled by the explicitly requested 12% faster practice cadence; the original
solo shoulder continuity bounds and fixed limb-length requirements remain.

In the fixed uppercut contact view, both baseline and candidate submit 319 draw
calls and 1,123,522 triangles including shadow work. This change adds no character
geometry. New recorded PCM files total about 1.3 MiB; decoded buffers add audio
memory. CPU clearance/support work and sustained hardware frame timing are not
established by these counts; no mobile performance acceptance claim is made.

### Final validation

- **37/37 Node regression suites passed; 79 JS/CJS syntax checks passed.** The
  final frozen-source run used two independent Node processes and resumed the
  already completed suites from that same source snapshot. Hashes were checked
  again before committing. Raw per-suite logs, timings and status are in
  `qa/r79/results/`; resume did not reuse the earlier failing candidate results.
- `tests/browser.cjs`: desktop 1100×950 and portrait 393×852 passed, including
  real animation-clock freeze, all techniques, camera views, languages and modes.
- `tests/browser-r78.cjs`: both viewports passed generated practice, reciprocal
  uppercut constraints, ring/native-rabbit integration, touch-unlocked decoding
  and finite unclipped offline audio. The suite freezes automatic scene updates
  during explicit pose loops to avoid software-renderer contention; it does not
  measure live gameplay FPS. Initial software-renderer action timeouts were
  resolved in the QA harness without changing the production UI.
- `qa/r79/browser-flow.cjs`: desktop and iPhone-UA portrait passed all ten rail
  entries, no additional drill dialog, defence, three languages, restoration of
  normal techniques and 11 decoded samples. Final mix peak 0.5743, RMS 0.0393.
- Actual glove vertices stayed outside skull/muzzle proxies for both species in
  all ten speed patterns, including 260 defence frames each. Maximum uppercut
  contact forearm lean ~9.1°. Floor support checks sampled actual articulated
  boots and deformed leg vertices for both fighters; no leg/boot canvas crossing.
- Simultaneous punch/forearm stress grid: 108 paired move/offset cases, zero
  violations of the existing 27 mm bounded-contact threshold.
- 21 fixed browser-rendered images: both uppercuts at contact/recovery from three
  angles, three speed profiles and six fall/get-up stages; zero page/shader errors.
  Selected matched before/after captures: `qa/r79/comparison.html`.
- Physical-phone sound, sustained FPS and thermal testing remain unverified.
