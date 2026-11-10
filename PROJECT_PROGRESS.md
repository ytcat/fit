## 2026-11-10 — Fight Academy designed landing and lesson screens (GOTR-0013, part 2)

Hero panel with real progress (solved variants / 18), numbered lesson cards with
progress pips, styled corner notes, numbered answer choices and coloured feedback.
Learning rules and saved progress unchanged. Verified in the real app in EN/HE/RU at
three sizes. [Evidence](qa/gotr-0013/).

## 2026-11-10 — Shop entry on every screen (GOTR-0001, slice 1)

The unlabeled coin chip is now a gold **🛒 Shop · coins** header button on every
screen, one tap from anywhere; the store screen is titled Shop/חנות/Магазин and the
EN "Waistband" category reads "Belts". Store logic is unchanged. Verified in the real
app at four sizes in EN/HE/RU; full suite 76/76 test files pass. Combos-in-Shop, badges and confirmation remain.
[Evidence](qa/gotr-0001/).

## 2026-11-10 — Fight IQ renamed Fight Academy (GOTR-0013, part 1)

Visible name only (EN/HE/RU); internal IDs and saved progress unchanged. Published
on `main` at `31a17bd`. Screen redesign follows with GOTR-0007. [Evidence](qa/gotr-0013/).

## 2026-11-10 — Readable combo controls, max three (GOTR-0006)

The Combos page now shows only the equipped loadout (max three) with **More n/m**
paging and a **Choose combos** shortcut, instead of six buttons with lock suffixes.
The bottom quick bar holds max three, wraps only between words and hides while the
side Combos page is open. Verified in the real app at four sizes in EN/HE/RU; full
regression suite passes (76/76 test files, 0 failures). Not yet merged or published. The Moves page on 360-px
phones still breaks long words (separate follow-up).
[Evidence](qa/gotr-0006/) · [Backlog entry](docs/glory-of-the-ring/FEEDBACK_BACKLOG.md).

## 2026-11-09 — Rounded upper shorts (GOTR-0011)

Removed the exposed square upper leg caps by rounding them into the existing hip
shell. Both species pass24 matched before/after pose/angle comparisons; lower
hems/weights are byte-identical and garment triangles decrease4,496 with no added
draw calls. Focused regressions pass. This addresses the upper shelf; existing hem
and stripe polish and real-phone performance remain open.
[Evidence](docs/glory-of-the-ring/rounded-shorts-release.md) ·
[Remaining tasks and rough effort](docs/glory-of-the-ring/remaining-small-releases.md).

## 2026-11-09 — Compact training menu and public title

Fixed stretched Training/Moves/View tabs by assigning their intended grid row.
Applied the current **Glory of the Ring** public name while preserving technical
IDs, saved profiles and the app URL. Actual updated arena previews and the full
optional offline pack are versioned.36 localized layouts and offline navigation
pass; physical-device performance remains unverified.
[Evidence and rollback](docs/glory-of-the-ring/menu-brand-release.md).

## 2026-11-09 — Three-bout Local School Cup (F-009)

World → **Local cup** provides three20-second Play wins, checkpoint recovery,
loss/draw retries, distinct NPC tactics and a real earned title. Standard match
records/ledger atomically control progression; Watch never advances the cup.
The live-entry descriptor is one-shot so legacy Fight navigation remains safe.
[Contract and actual six-bout evidence](docs/game/F009-local-school-cup.md).

The scripted production-contact run earned one title after three wins and three
losses; it inserted neither health nor results. Title archives retain the latest50
while cups remain replayable. Phone-sized EN/HE/RU entry and title layouts pass;
physical-device performance is unverified. All work ends at a tested published
checkpoint. Later PRD tasks and the unsafe crossover remain separate.

## 2026-11-09 — Selectable arena styles (F-008)

World → **Arena styles** offers Neighborhood Hall, Neon Strip and Harbor Dome.
Selection saves per player without charges or combat changes; ring replacement
reapplies it synchronously. The gallery fits portrait/landscape in EN/HE/RU.
[Contract, actual render comparisons and resource limits](docs/game/F008-arena-styles.md).

Next: F-009 three-bout local cup integration. A pure rules/test draft is isolated
in `lion/foundation-cup-rules`; no tournament behavior is claimed in this release.
The earlier unsafe crossover remains withheld pending actual arm/torso clearance.

## 2026-11-09 — Short sessions, compact store and safe station return

[RingFighter app](https://ytcat.github.io/fit/). Bug release `2e855e7` fixes closed
boot shafts, moving directional shadows, queued punch combinations, 15-second
training, short fights, name-only results and KO presentation; it adds a compact
pictured store with fitted accessories. [Evidence and limits](docs/game/short-session-bugfix.md).

F-006 (implementation `372241c`) adds per-profile **Return to station** in World:
restore the fighter/station/routine paused, then start a fresh 15-second workout.
Reload cannot overwrite the saved station with startup defaults. Career rewards,
wallet, live bouts and clocks are not restored. [Contract and checks](docs/game/F006-station-resume.md).

Remaining work stays isolated: unsafe crossover, venue/tournament integration,
and later PRD/realism gates. Do not call the entire roadmap complete or reapply
old branches over this version. End work at a verified published milestone and
provide its versioned app link; account token allowance is not observable here.

## 2026-11-08 — Guards, paws and independent tactics

Normal defense now staggers glove depth; skipping uses broader species paws.
Separate ring walkers plant for their own attacks. AI uses four tactical families
and 12 short phrases; training adds four presets (44 total) and generated openings.
[Implementation and verification](docs/guard-paws-tactics.md).

## 2026-11-07 — Master-brief first motion milestone

Final-pose audit and capped clock contracts added; mitt station pilots 120-Hz
contact, all six punches, centreline uppercuts and down-facing catches. Existing
rig, modes, same-hand mapping and standing distance retained.
[Evidence, CPU cost and limitations](docs/realism/first-motion-milestone.md).
[Unfinished phases](docs/realism/execution-status.md). No new realism score or
physical-phone performance claim. Whole-game clock/layer migration remains open.

# Lion app development checkpoints

Updated: 2026-11-02

## Rules
- No paid dependencies or external AI API.
- One independently testable milestone per commit.
- Never claim visual/performance validation without actual browser/device measurements.
- GitHub Actions validates committed code; it does NOT generate new AI code or resume ChatGPT after usage limits.
- Preserve existing working features and avoid automatic merges of untested animation changes.

## Dependency order
1. **IN PROGRESS — architecture audit and realistic jab feasibility**: inventory animation, rig, render loop and speed-bag behavior; verify a candidate free motion-capture source/license; prototype a jab on the existing skeleton. Acceptance: documented skeleton compatibility, valid jab motion, no glove inversion or armpit distortion, no regression in other modes.
2. **PENDING — rig and animation foundation**: resolve glove orientation, shoulder deformation, joint limits and retargeting.
3. **PENDING — complete boxing movements**: cross, hook, uppercut, combos, defensive movement and footwork.
4. **PENDING — contact and reactions**: heavy/speed bag, dummy, rabbit, impact and sound.
5. **PENDING — responsive UX**: desktop/mobile navigation, accessible controls, lion framing.
6. **PENDING — regression/performance**: frame timing, memory, mobile/desktop and rotating fight ring.

## Initial code audit
- `boxing-coach-v2.js`: custom bone rig and authored kinematics, not imported motion capture.
- `training-arena.js`: speed bag geometry is created lazily and cached by mode; spring-based response.
- `index.html`: local Three.js and separate coach/arena/fight scripts.
- Actual frame-time measurements, live browser visual tests and motion-capture retargeting are NOT yet completed.

## Verification update (2026-11-02)
- Confirmed that `index.html`, `boxing-coach-v2.js`, `training-arena.js`, and `boxing-routines.js` are present in the default branch.
- Corrected a malformed Python regex in `.github/workflows/lion-ci.yml` (commit `3d613f3`). This is a source-level fix, not a confirmed passing Actions run.
- GitHub's combined commit-status endpoint returned no reported statuses for the previous workflow commit. GitHub Actions job outcome remains unverified.
- Inspected the coach skeleton definition: `hips`, `spine`, `chest`, `neck`, `head`, paired `arm`, `elbow`, `hand`, `scapula`, `thigh`, `knee`, `foot` bones. The rig is custom, so third-party mocap would require retargeting rather than direct playback.
- No jab prototype, full-body visual check, or device frame-rate benchmark is complete yet.

## Jab milestone — incremental implementation
- Committed `5bf13f6`: add a small jab-phase chin tuck and raise the rear cheek guard during lead-hand extension.
- Scope: targeted guard/head biomechanics only; full jab mechanics, shoulder deformation and glove orientation still require rendered visual regression checks.
- JavaScript syntax and GitHub Actions outcome for this commit have not yet been confirmed.

## Jab footwork milestone
- Committed `3d71265`: lead jab advances the lead foot while keeping the rear foot planted as support. Other movements retain their previous footwork behavior.
- This is a code-level change only. No measured foot-skating, visual joint deformation, or browser performance result is available yet.

## Next action
Inspect rig joint names and animation update paths, identify a free licensed boxing jab clip, and test retargeting on a separate branch before altering main.

## Review and contact repair — 2026-11-04
- Started the architecture/contact/regression milestones with a review of the
  current procedural rig and target response paths.
- Removed duplicate uppercut bag kicks and dummy torque boosts; added bounded
  lever-arm lift response, reachable uppercut wrists and earlier release.
- Reduced uppercut side sway and head recoil, applied planted-leg support to
  solo uppercuts, moved their load chamber forward and ramped rabbit reactions.
- Corrected a hook shoulder-vector mutation, softened its chamber and widened
  its swing timing.
- Refined dummy/referee detail, ring corners/ropes and transient material cleanup.
- Repaired CPU canvas mocks, obsolete referee assertions and browser harness.
- Evidence and limitations: docs/review-2026-11-04.md. Mocap sourcing, retargeting
  and measured device performance remain open; this does not complete the roadmap.

## R73 completion pass
- Completed the pending rig/contact repair from this review: compact uppercut
  load/rise/recovery, stable elbow planes and gaze, consistent closing footwork,
  live dummy chin targeting, coupled bag/dummy recoil and pause-safe aiming.
- Corrected continuity checks to use anatomical shoulder references and
  distinguish whole-body travel from a discontinuous IK correction.
- Preserved contact-derived fight scoring and added bounded seeded outcome
  coverage, equipment browser checks and complete CPU suites in CI.
- Mocap sourcing/retargeting and measured device-performance milestones remain
  separate pending work; no completion or benchmark is claimed for those.

## R75 practice and contact experience
- Added synchronized/variable practice pacing, seeded bursts and guard pauses for
  every practice target; live bouts keep independent stamina/read/defence decisions.
- Preserved centered uppercuts and neutral glove/forearm alignment. Rising contact
  now carries direction into the receiving fighter, with bounded upward head/neck
  response, rearward torso recoil and planted leg support; body/block reactions
  and contact-derived scoring stay distinct.
- Reworked speed-bag pendulum/platform rebound, actual contact-event aggregation,
  swing events and dummy response. Misses cannot add bag momentum or scored hits.
- Rebuilt anatomical dummy and detailed rhino/referee clothing and surfaces. Added
  a reproducible geometry bake to remove procedural sculpture work on selection.
- Bundled licensed local impact, air-swing, vocal, clap and struck-metal recordings;
  added contact gating, voice cleanup, limiting, mute and accessible source credits.
- Browser validation covered desktop/phone layouts, practice controls, all target
  modes, fight, languages, pause and actual Web Audio rendering. The reference,
  measurement and remaining realism/device-performance limits are documented in
  docs/r75-reference-and-design.md. Imported mocap/retargeting remain pending.

## R76 follow-up — physical contacts and animal surfaces
- Fixed rendered glove pass-through after a scored contact, corrected the sign of
  root recoil and fitted uppercuts to the supplied wrist target. Added compliant
  local skin response, stronger visible recoil and contact-side facial damage.
- Added a bounded connected shoulder correction, dense skeleton-attached short
  coat with inertial tips, stable face attachments and revised animal features.
- Restored persistent phone audio activation with a visible stage sound control,
  interrupted-context recovery and callback-compatible/partial asset decoding.
- Added six speed-bag drill patterns and four combinations with per-move tempos.
- Detailed findings, free model/material research and limits are recorded in
  docs/r76-contact-avatar-review.md. Mocap and physical-device benchmarks remain
  separate open work; no photorealism or full soft-body simulation is claimed.

## R77 coat color correction
- Reproduced the reported brown rabbit underarm in the raised lead-hook pose.
  The short coat used a beige material multiplier on top of species vertex colors,
  and both amber rim lights plus brown ground bounce exaggerated the color cast.
- Made the fur multiplier neutral and replaced colored rims/ground bounce with
  neutral studio lighting. Rabbit underarm shading now stays grey; the lion's
  tawny color still comes from its own coat colors.
- Inspected matched before/after closeups and a fresh 393×852 browser render of
  the source-level fix; no page or shader errors. Existing avatar-detail and app
  regression suites, syntax and whitespace checks passed. Physical-phone testing
  is not claimed.

## R78 professional presentation and simultaneous exchanges
- Reproduced an offset two-uppercut failure with overlapping torsos and added
  torso separation plus coupled glove/wrist/forearm constraints for both fighters.
- Added pose-driven continuous muscle/normal deformation, coordinated facial
  acting, reactive referee gaze, a native rabbit head/body surface and detailed
  boxing canvas, ropes and stitched equipment.
- Expanded to 24 presets and seeded generated attack/defence/exit combinations.
- Removed game-character vocals from active playback and replaced them with dry
  local leather/air Foley and unvoiced exhalations; retained licensing for legacy
  files and added reproducible original-asset build scripts.
- Evidence, measurements and realism limits: docs/r78-realism-and-trades.md.

## R79 motion, recovery and recorded-sound release (2026-11-05)
- Corrected uppercut forearm stacking and loading continuity; collision
  repositioning preserves the intended palm orientation.
- Added bounded speed-bag self-face clearance and replaced the existing technique
  rail with ten relevant drills, including bursts followed by defence.
- Added articulated canvas support, staged faster recovery, bounded shock shake
  and persistent final-KO behavior for both fighters; increased practice/fight pace.
- Replaced active punch/bell samples with licensed CC0 recordings and authored a
  stereo crowd mix from recorded claps; retained mobile audio unlocking/fallback.
- Implementation, reproducible QA and limitations: docs/r79-motion-speedbag-knockdown-audio.md.
- This release does not claim completion of the separate authored face/mane
  realism overhaul or sustained performance verification on physical phones.

## RingFighter R81 — direct play and contained mobile layout (2026-11-05)
- Renamed the header, document and rendered club/ring branding to RingFighter.
- Replaced the overflowing phone page with a viewport-sized arena and contained
  transport, compact setup, safe-area handling and short-screen controls.
- Added Watch / Play and left/right move controls for both selectable boxers in
  every practice target, sparring and fights, with independent opponents and
  real-contact scoring/audio. Speed bag uses relevant taps/doubles/triples.
- Reproduced the simultaneous-contact upper-arm reversal and added stable elbow
  references, suitable striking range and coordinated contact-driven recovery.
- Validation and limitations: docs/r81-ringfighter-interactive-controls.md.
- Physical-device performance and the separate face/mane realism overhaul remain
  unverified/incomplete; this release does not claim photorealism.

## RingFighter R82 — ring travel and camera gestures (2026-11-06)
- Added a glove-first fight guard, stable elbow transitions and continued real
  contact constraints; retained the prior simultaneous-punch regression gates.
- Added bounded between-exchange ring movement, supported alternating steps and
  smooth settling into punch footwork; expanded presets to 28 with more steps.
- Made gym/arena surroundings follow rotation, completed side/end scenery and
  cut away near walls; widened fight framing and added pinch/wheel zoom.
- Review, validation provenance and device limitations:
  docs/r82-ring-movement-camera.md. Physical phone testing remains unverified.

## RingFighter R83 — folded guard correction (2026-11-06)
- Reproduced the R82 elbow pole projecting the guard elbows into the chest.
- Corrected the pole and cheek-side wrist spacing; added own-face clearance
  after pose stabilization and final fight contact correction.
- Replaced the incorrect wrist-forward guard criterion with anatomical guard
  checks; added actual glove-mesh clearance tests for both fighters.
- Matched app-rendered evidence and validation: docs/r83-fight-hand-correction.md.

## RingFighter R84 — arm hinge frame (2026-11-06)
- Reproduced a 90° upper-arm roll during isolated elbow flexion, despite correct
  joint endpoints. Corrected the model's bind-space elbow fold to -Z.
- Added humeral-roll, actual palm/forearm alignment and world-space hit-volume
  compatibility tests. The complete 44-suite validation passes.
- Rebuilt the versioned shoulder corrective for the new frame; retained v1 and
  incompatible-data fallback. Repeated authoring output is byte-identical.
- Actual normal/clay motion comparisons and limitations:
  docs/r84-arm-hinge-frame.md and qa/r84/comparison.html.

## RingFighter R85 — studio, camera recovery and game-mode review (2026-11-06)
- Furnished all gym walls, retained directional cutaways and batched fixtures
  within the existing mesh budget.
- Camera-only orbit preserves paused skin/pose caches, recovers interrupted
  gestures and keeps user-selected views through fight ceremonies.
- Extended zoom to 0.30 and added − / + / Fit to Watch and Play.
- Consolidated prior direct-control game-mode requirements in docs/game-mode.md;
  preserved existing player-versus-AI/contact behavior and R84 arm assets.
- Complete 45-suite committed-runtime CI passed; native browser checks passed
  in six modes and three layouts, plus real Play contact and fight checks.
- Evidence: docs/r85-studio-camera.md and qa/r85/comparison.html. Physical-phone
  gesture/performance checks remain unverified.

## RingFighter R86 — Super combinations and groom/material polish (2026-11-06)
- Added twelve mixed-tempo advanced chains (40 presets total), directional
  exits, longer seeded freestyle phrases and four Super speed-bag drills (14 total).
- Corrected truncated footwork recovery so the trailing foot plants before the
  next combo beat; standalone and arena playback share authored timing.
- Improved directional short coat, mane root/crown grooming, leather/fabric
  detail and material contrast with shared deterministic maps.
- Complete 46-suite exact-runtime CI passed, plus matched actual renders for
  both boxers, all advanced selections in EN/HE/RU, real fast-combo bag contacts,
  camera recovery and manual player-versus-AI browser checks.
- Evidence: docs/r86-combo-groom-polish.md and qa/r86/comparison.html. Authored
  facial reconstruction and sustained physical-phone benchmarks remain open.

## RingFighter R87 — training careers, footwear and fight announcements (2026-11-06)
- Added scored training sessions, six attributes, independent Lion/Rabbit careers,
  seven ranks, completed-bout rewards and actual fight parameter improvements.
- Added jump rope and responsive focus mitt drills with measured contacts and
  hook/duck clearance, plus compact progress controls and player profiles.
- Rebuilt articulated boxing boots for both species and low-top referee shoes.
- Added versus, Fight, Break and winner announcements, an urgent final-ten-second
  clock and gesture/mute-aware second sounds.
- All 48 regression suites pass, including new geometry, persistence, interface,
  rewards and countdown checks; final targeted UI/scoring checks also pass.
- Cross-device accounts remain blocked on an unconfigured account backend.
  Current named/guest saves are device-local, with portable backup files.
- Live GPU/browser visual QA is unavailable in this environment. Details and
  the implementation plan: docs/r87-career-training-and-fight-presentation.md.

## RingFighter R88 — defence, supported steps and player combinations (2026-11-07)
- Added sustained high/body/side covers and a catch, with real collider coverage,
  direction-led ring steps, planted support and gradual settling into rest.
- Play now offers one-press combinations, speed-bag patterns and defensive
  interruption, preserving independent opponents, scoring, clocks and audio.
- Fixed unstable aimed elbow planes and collapsed close-contact arms; original
  collision/continuity thresholds remain unchanged. Cached exact collision
  transforms reduce repeated CPU work without changing surface geometry.
- Retained the concurrently published R87 career/drill/footwear/presentation work;
  manual mitts receive the new covers/steps and rope retains automatic rhythm.
- All 51 regression suites passed on exact final source `3efa994`; actual
  matched renders, native input checks, CPU profiling
  and limitations: docs/r88-defence-footwork-combos.md and qa/r88/comparison.html.
- Authored realistic heads/mane and sustained physical-phone FPS remain open;
  docs/realism/next-steps-2026-11-06.md records the unfinished art milestones.


## RingFighter R89 — connected training gear and larger play area (2026-11-07)
- Replaced scene-positioned trainer targets with articulated, hand-mounted
  professional mitts; added detailed leather, padding, straps and stitching.
- Trainer hooks now use a full kinetic chain and smooth mitt/guard transitions.
- Corrected rope rotation, attached handles, added round cable/wrapped hands,
  and implemented two-foot, alternating-foot, left-leg and right-leg exercises.
- Moved secondary controls into one Training drawer. Preserved playback state,
  camera gestures, saved scores and optional full manual controls.
- Thirteen targeted suites pass; actual Chromium rendering and interaction checks
  are included in tests/browser-r89.cjs. Phone canvas is 377 × 694 at 393 × 844.
- Full details and verification limits: docs/r89-mitts-rope-and-larger-ring.md.

## RingFighter R90 — coordinated rope and smoother training (2026-11-07)
- Coordinated wrist/shoulder/trunk/head/ankle skipping across all four exercises.
- Added oxblood/black mitt materials, rubber handle channels and woven round cord.
- Moved exact padding deformation to optional local shaders; sampled vertex uploads
  fell 86%, with pixel-identical CPU/GPU renders in WebGL1 and WebGL2.
- Removed pointer-event world updates, reused paused poses and mane transforms,
  and allowed severe stalls to trigger adaptive quality.
- All 54 suites passed on `ae7dbf1`; native gesture/recovery and resource-cycle
  checks passed. Physical-phone sustained FPS and authored heads remain open.
- Evidence and limitations: docs/r90-rope-performance.md and qa/r90/review.html.

## RingFighter R91 — coupled skipping and rounded mitt work (2026-11-07)
- Added two-beat weight transfer, back/shoulder/ankle articulation and traveling
  cable bends while retaining four rope patterns and original clearance gates.
- Added bilateral palm-down arc sweeps with straight wrists, planted trainer
  feet, contact-led recoil, paired mitt targets and shallower defensive rolls.
- Strengthened existing continuous muscle correctives; no detached muscle meshes,
  rig replacement, paid tool, external asset or runtime dependency.
- All 55 regression suites passed on `1b7c32c`, including the new bilateral
  sweep/anatomy checks. Exact proof: qa/r91/results/validation.json.
- Actual motion/clay evidence, timing costs and physical-phone gaps:
  docs/r91-fluid-rope-and-mitts.md and qa/r91/review.html.
- The separately planned authored head/mane asset remains unfinished.

## R92 — mitt partner spacing (2026-11-07)
- Restored 1.2 m partner root spacing, 30 cm more than R91.
- Preserved real mitt contacts and sweep clearance with planted hip hinges,
  shoulder glide and a roll-only overlay that respects manual action timing.
- All 55 regression suites passed on `b064eac`; matching desktop/phone-sized
  browser renders passed. Proof: qa/r92/results/validation.json.
- Details and comparison: docs/r92-mitt-spacing.md and qa/r92/review.html.

## R93 — compact skipping posture (2026-11-07)
- Moved each rope hand target inward 12 cm, tucked elbow guides and reduced
  arm circles/shoulder pulse while retaining wrist turns and full-body motion.
- Bounded the cable bow to preserve head/shoulder clearance and tube continuity.
- All 55 regression suites passed on `43f3191`, with six-view lion and extra
  rabbit renders. Exact proof: qa/r93/results/validation.json.
- Human-reference observations, unavailable coaching source and limits are
  documented in docs/r93-compact-skipping.md; no external asset is imported.

## R94 — same-hand coaching mitt assignments (2026-11-07)
- Corrected anatomical routing to left-to-left and right-to-right, independently
  of camera orientation. Actual contact/recoil receiver is checked for both boxers.
- Retained partner spacing and compact rope posture. Targeted suites and real
  desktop/phone-sized scene checks pass; manual jab/cross/hooks still land.
- All 55 regression suites passed on `41d0ebc`. Proof: qa/r94/results/validation.json; visual report:
  docs/r94-mitt-hand-mapping.md and qa/r94/review.html.

## R95 — rope/body clearance (2026-11-07)
- Corrected handle outlets and added posed exclusion routing for the full body,
  limbs, head/mane/ears, boots and tail while retaining compact hand targets.
- Added a transported tube frame and full-cycle clearance regressions; separate
  exact swept-segment checks pass both characters and four drills.
- Reproduced baseline mesh overlap. Independent triangle checks measured final
  lion/rabbit centreline lower bounds of 30.00/31.84 mm in sampled poses.
- All 56 regression suites passed on `ddc111c`, plus WebGL1/2 checks.
  Proof: qa/r95/results/validation.json.
- Details and limits: docs/r95-rope-body-clearance.md and qa/r95/review.html.

## R96 — compact controls, palm-up rope and punch drive (2026-11-07)

- Rope palms face up with tucked arms, paired outward handles and connected
  bearing necks. Independent actual-mesh and swept-volume checks retain clearance.
- Phone training uses three no-scroll panels; all techniques and skill ratings
  fit together. Combination cards have pages; all manual controls remain visible
  on opposite sides. Pause and Back to game alignment corrected.
- Faster straight extension, more ordinary body drive, stronger contact-driven
  mitt recoil and higher heavy-bag striking-mass parameters. Existing fight
  body-drive limits and glove-penetration thresholds preserved.
- Runtime source: `40ceee6440f3e63db3c043ba20783da2e7fa4a14`.
- Evidence, limitations and exact validation outcome: `docs/r96-controls-grip-power.md`,
  `qa/r96/review.html`, `qa/r96/results/validation.json`.
- Physical-phone sustained FPS/thermals remain unverified. Existing manual
  uppercut-to-mitt scoring gap remains documented; no fake contacts added.
