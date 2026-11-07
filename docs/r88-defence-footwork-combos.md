# R88 — defensive covers, ring locomotion and one-press player combinations

Movement development baseline: `f7a96738611bf2ceaec940a31b44798972134bc5`.
Integration base: concurrent published career release
`de93d1170d879fb1574cfabf2dbc20895cf5cfc3`.
Source candidate: see `qa/r88/results/validation.json` for the exact validated SHA.
Work isolated in `/workspace/fit-r88`, `lion/r88-movement-integration`.
No other worktree, model asset or concurrent branch was overwritten.
Main changed during validation. Owned changes were manually ported into a new
worktree rooted at that new main; no merge, cherry-pick or rewritten external
commit was used. Career ratings, match entry/rewards, rope/mitt stations,
footwear hooks, onboarding, clock/audio and announcements were retained.
The initial isolated 48-suite candidate passed; the integrated release has 51 suites, including transform-cache invalidation checks.

## Research and scope

[Movement research notes](research/r88-movement-notes.md) were written before
implementation. Existing coaching references describe floor/hip/trunk initiation,
neutral wrists, chin protection, coordinated lower-body defence and guard return.
Newly read open locomotion code demonstrates contact locking and smooth motion
transitions. No animation data, external model, runtime service or borrowed code
was imported. The source/licence and retrieval limits are explicit in the notes.

These remain authored, visually plausible motions with geometric constraints.
This is not motion capture, a validated coaching curriculum, dynamic balance
simulation or a promise of exact human biomechanics.

## Defence that changes actual coverage

High cover is sustained instead of following a punch-shaped pulse. The default
ring guard and the free hand during punches share a raised cheek guard, avoiding
the earlier hand drop when an attack begins. Guard itself no longer performs an
unrelated cyclic foot shuffle. New covers use the existing connected arms and
gloves, with smooth entry/exit:

- **High cover** protects the central incoming line with real glove contact.
- **Body cover** lowers and closes the arms over the body target.
- **Left/right cover** brings the corresponding forearm toward the temple, with
  an elbow plane that supports the glove rather than pointing across the chest.
- **Catch** closes the rear hand toward the incoming straight-punch line.

AI guard choice now considers body targets, hooks, rising punches and straights.
Slips and rolls remain available. Coverage never grants an automatic block or
invulnerability: the opponent must collide with the drawn guard's hit volumes.
Ten representative path checks across both species intercept glove/forearm before
head/body; these are specified paths and held poses, not all-angle guarantees.

## Larger, supported ring movement

The ring path uses larger advancing, retreating and lateral steps. First-foot
selection depends on travel direction and is latched for each stride. A boxer
retreats rear-foot-first, and lateral steps begin on the movement side. Translation
and turning are compensated together so the supporting foot remains on the canvas.

The previous foot compensation read `root.rotation.y` after a quaternion update.
That Euler component can flip representation for the boxer facing away. Keeping
the intended heading separately removes the reversed compensation and sliding.

When an exchange begins, the active half-step settles to double support. A bounded
cubic braking profile matches incoming speed and finishes at zero speed, rather
than freezing a foot midair or abruptly deleting stride offsets. The clock is
monotonic at floating-point boundaries, and paused poses stay fixed. Root and limb
reach gates continue to constrain travel inside the ropes. The observed maximum
stride delta is about 0.494 m in the new test. The path also reserves the fixed
official's corner (minimum sampled root clearance about 0.778 m). These are
model tuning values, not a dynamic collision/balance simulation.

Step in/out commands use larger 0.24 m step-and-reset motions. They are temporary
stance actions; autonomous ring travel remains active between exchanges.

## Whole-body sequencing

Uppercut pelvis/trunk/shoulder drive begins slightly before wrist acceleration;
the verified glove trajectory, central finish and neutral forearm/knuckle frame
remain coordinated with the original movement clock. Knee load and drive now feed existing quadriceps/calf and chest
activation. Focus can begin during loading. Existing head/neck motion, mane
guides, coat, facial reactions, skin normals and shadow passes use the same pose
and simulation time. Tail detail also follows simulation time rather than
restarting its oscillator at every action. Gaze remains on the opponent.

## One press executes a player combination

Play initially shows **Combos**. Six buttons trigger one–two, one–two–hook,
uppercut–hook–cross, slip/counter, roll/return and a six-move Super burst.
Speed bag substitutes six hand-pattern/defence chains. **Moves** preserves the
single-hit controls; **Defence** provides covers, evasions and footwork.
The side rails, page controls, zoom and transport remain within the viewport.

Each chain advances on the existing simulation clock, with varied move durations,
fatigue, real targets, collision, stamina, scoring and audio. Only the selected
boxer is player-controlled; the opponent continues deciding independently.
Progress is visible as e.g. `Super burst 3/6`. Repeated taps cannot queue long
macros. A new primitive/defensive command cancels the remaining chain, allowing
the active strike to recover without teleporting the arm. Seek, mode changes,
counts, bells/results and Watch/Play handoff clear pending commands as appropriate.

Keyboard 1–6 runs combinations on the Combos page and retains individual punches
on other pages. Arrows retain defensive controls; A/D step sideways and W/S step
in/out. Shortcuts do not capture typing, dialogs or native button key handling.
Cached older input modules retain a safe primitive-control fallback.

## Regression fixes and evidence

The new guard initially exposed a coupled-correction issue: a later arm/own-face
projection could push a glove back into the other glove. A tighter internal
padding margin leaves room for those projections. The existing 21 mm complete
follow-through gate is unchanged. The final targeted test observed approximately
19.8 mm maximum intrusion across its twelve strike/target cases. The separate
simultaneous/macro stress gate remains 27 mm; all cases use the same solver.

A second failure caught a tiny backwards stride-clock snap at a floating-point
boundary. The monotonic settling clock preserves the existing exact freeze test.
The new braking check verifies monotonic progress, substantial deceleration
before landing and exact rest, rather than assuming a device-independent speed.

Two arm-continuity failures were also caught before release: dummy uppercut
aiming and simultaneous contact recovery. Aiming now filters the perpendicular
elbow plane after transporting it to the current reach axis. Contact correction
can no longer collapse the wrist almost onto the shoulder: the arm retains a
30-degree internal elbow angle (a tuned 150-degree flexion bound). Leg IK and
the R84 rest/bind frame remain intact. The isolated full stress grid observed
12.26 mm maximum sampled head/body intrusion and 0.938 radians maximum adjacent
upper-arm rotation, below the unchanged 27 mm and pi/3 gates. Integrated results
are recorded separately in the exact validation record. These bounds do not
constitute clinical joint-limit validation or motion-capture accuracy.

Profiling found a collision-transform hotspot during crowded exchanges. The
closest-surface calculation now reuses inverse/normal matrices while the exact
object world matrix remains unchanged, and invalidates immediately after parent,
limb or scale edits. It uses an arena-owned WeakMap and changes no collider or
contact threshold. A differential geometry test compares against the previous
world/local API route, including same-tick edits. CPU-only browser sampling
(seed 87, 30 warmup + 180 active-fight steps, no drawing during measurement)
recorded median/p95 updates of 8.9/20.7 ms on R87, 9.3/42.2 ms before caching,
and 6.0/24.5 ms after caching. These are short cloud software-renderer diagnostics,
not sustained FPS, GPU work or physical-phone performance. The separate 55-frame
contact screenshot trace was contended by concurrent rendering; its raw timing
is retained but is not used to infer performance gains.

Scene records use Three's normally reset renderer.info counters: they describe
the main draw pass, not total shadow resubmission. Example textured views submit
about 497k triangles / 170 calls for lion guard and 1.158M / 504 calls for the
staged fight view. Allocated texture counts depend on the roster/mode sequence;
they are not GPU memory measurements. Movement work adds no mesh/texture density.
Physical-device CPU/GPU/thermal measurements and startup benchmarking remain open.

See [QA commands, matched app renders and motion clips](../qa/r88/README.md).
The original controller/model fallback assets, all modes, audio, cameras and R84
arm frame are retained. No mesh/material/texture density was added by this work.
Physical iPhone/Android, Safari behavior, sustained FPS and thermal performance
remain unverified. The referee's locomotion and the separately planned authored
face reconstruction are unchanged. Rollback is the prior published release.
