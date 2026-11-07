# RingFighter — 3D Boxing

R91 adds coupled skipping, traveling cable motion, planted palm-down mitt sweeps,
shallower rolls and stronger pose-driven muscle definition.
[Actual before/after views and verification](docs/r91-fluid-rope-and-mitts.md).

R90 coordinates rope skipping across the body, improves leather mitts/rope handles,
and reduces training deformation and camera-event work.
[Changes, comparisons and verification](docs/r90-rope-performance.md).

R89 fixes detached trainer mitts, improves training gear and movement, adds four
forward-skipping exercises, and moves secondary controls into one menu for a
larger game view. [Changes and verification](docs/r89-mitts-rope-and-larger-ring.md).

R88 adds sustained defensive covers, supported ring steps and one-press player
combinations. See the [movement report](docs/r88-defence-footwork-combos.md) and
[actual app comparisons](qa/r88/comparison.html).

R87 adds scored training sessions, jump rope, coach mitts, boxer development,
new footwear and match announcements. See the [change plan and verification](docs/r87-career-training-and-fight-presentation.md).
Named profiles and guests save on this device; authenticated cross-device saving
still needs a connected backend.

A static, three-language boxing practice app. Open it through an HTTP server:

```sh
python3 -m http.server 8080
```

The default lion loads from the repository on every device. No model upload or
external styling/3D CDN is required. Choose a technique, rotate the view, use
0.5×–3× playback, or freeze the motion to inspect a pose. The workout timer
and the motion freeze control are independent. Continuous practice uses pause/resume.

Choose **Play** above the arena to control the selected boxer in training,
equipment drills, sparring or Fight night. Compact play shows the essential
individual moves. Enable **Show all punch and footwork controls** in Training
for **Combos** and **Defence**, including complete one-press chains, head/body/side
covers, catches and step in/out. A defensive command interrupts a queued chain
after the active strike recovers. **Watch** restores automatic play. Rope keeps
its automatic rhythm.
Drag to orbit, pinch or use **− / + / Fit** to zoom. The consolidated
[game-mode requirements and implementation](docs/game-mode.md) describe the
side controls, speed-bag substitutions, independent opponents and scoring.
The Combinations chooser includes twelve advanced **Super** chains with mixed
rhythms and exits. Speed bag has fourteen drills, including four Super patterns.

The original continuous body and clothing surfaces are built with marching
tetrahedra and attached to a shared skeleton. The face has recessed eyes and
muzzle detail; the mane uses an undercoat and tapered hair clusters. Materials
include fur grain, leather, satin, stitching and boot laces.

A connected T-pose shoulder and baked harmonic arm/chest weights replace the old diagonal armpit web. Both arm segments keep their original lengths; a shared elbow plane controls upper-arm roll. Solo hooks use a compact bent-arm arc. See [R25 shoulder and arm fixes](docs/r25-shoulder-and-elbow.md).

Bag punches now extend through the pad with a closer cheek guard, raised striking
shoulder, tucked chin and wider supported stance. The configured heavy bag is
110 kg; stronger contact impulses move it with greater resistance. Speed-bag
impacts follow the alternating forward fist. See [R26 reference and impact checks](docs/r26-bag-reference-and-power.md).

Dual-quaternion skinning preserves arm volume in the bent-elbow guard, with a
local linear blend at the underarm fold. Surface
and shadow passes share the same deformation, and shared material colors are
converted to linear space once.

The motion controller covers jab, cross, both hooks, both uppercuts, right slip,
roll, directional footwork, 40 combinations and seeded two-way random sparring. Analytic
two-bone IK keeps wrist targets reachable and foot placement fixed while hips,
spine, shoulders, head and gloves follow coordinated trajectories. Heel turns
pivot around the ball of the foot. Each action recovers to guard.

These are authored animation paths, not motion capture, a validated coaching
curriculum, or a dynamic balance/contact simulation. Joint and foot constraints
improve consistency but do not establish exact human biomechanics or
photorealism. Device performance still depends on WebGL hardware.

The default UI focuses on the lion. Target selection offers a heavy bag, body
dummy, speed bag or rabbit partner. The old saved-avatar switch is removed.
Equipment punches commit the whole body, transfer a contact impulse, compress
padding briefly and return to guard while the target carries the momentum.
See [R20 glove, garment and timing fixes](docs/r20-gloves-tailoring-and-smooth-contact.md)
and the [impact model](docs/r19-power-and-heavy-impact.md).

Choose **Target → Fight mode** for an autonomous lion/rabbit bout with timed
rounds, contact-driven reactions, three recorded scorecards and a rhino referee.
Select three/four/six/twelve three-minute rounds or a shorter exhibition. Fresh bouts
use fresh decisions and can have either winner or a draw. See the
[fight model, rules and validation](docs/r22-autonomous-fights-and-judging.md).

### Validation

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
```

The shoulder regressions cover all six punches solo and on both heavy bag and
dummy, fixed bone lengths, continuous elbow/shoulder motion, chest attachment,
and compatible controller/model pairs for new and cached pages.

Browser checks on a machine with WebGL:

```sh
npm install --no-save playwright@1.51.1
npx playwright install chromium --only-shell
node tests/browser.cjs
```

The first suite samples all nine actions and verifies actual ankle positions,
toe contact, reachable forward fists, opposite-hand guard, cycle recovery and
combination order. Browser checks cover desktop/mobile layouts, every technique
and camera view, freeze and the three languages. Screenshots go to `/tmp`.
Set `BROWSER_EXECUTABLE` to use an existing Chromium executable.

Controller regressions also verify that changing languages preserves a frozen
technique and that a missing uploaded-avatar clip cannot select the opposite hand.

To rebuild the current T-pose mesh and topology-based arm weights (Python + NumPy + SciPy):

```sh
python3 scripts/build_coach.py
```

To rebuild the checked-in stylesheet after changing utility classes:

```sh
npm exec --yes --package=tailwindcss@3.4.17 -- tailwindcss --content ./index.html --output ./assets/app.css --minify
```

Three.js r128 and its GLTFLoader are distributed under the included MIT license.
