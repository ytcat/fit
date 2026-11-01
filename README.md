# ShadowBox 3D — Lion Boxing Coach

A static, three-language boxing practice app. Open it through an HTTP server:

```sh
python3 -m http.server 8080
```

The default lion loads from the repository on every device. No model upload or
external styling/3D CDN is required. Choose a technique, rotate the view, use
0.5×–3× playback, or freeze the motion to inspect a pose. The workout timer
and the motion freeze control are independent. Continuous practice uses pause/resume.

The original continuous body and clothing surfaces are built with marching
tetrahedra and attached to a shared skeleton. The face has recessed eyes and
muzzle detail; the mane uses an undercoat and tapered hair clusters. Materials
include fur grain, leather, satin, stitching and boot laces.

Dual-quaternion skinning preserves arm volume in the bent-elbow guard, with a
local linear blend at the underarm fold. Surface
and shadow passes share the same deformation, and shared material colors are
converted to linear space once.

The motion controller covers jab, cross, both hooks, both uppercuts, right slip,
roll, forward/backward footwork, 12 combinations and seeded two-way random sparring. Analytic
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

### Validation

```sh
node tests/coach.test.cjs
node tests/app.test.cjs
node tests/workout.test.cjs
node tests/layout.test.cjs
node tests/arena.test.cjs
node tests/training-controls.test.cjs
node tests/contact.test.cjs
node tests/random-sparring.test.cjs
node tests/bag-mechanics.test.cjs
node tests/power-impact.test.cjs
node tests/avatar-surface.test.cjs
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

To rebuild the original mesh data (Python + NumPy):

```sh
python3 scripts/build_coach.py
```

To rebuild the checked-in stylesheet after changing utility classes:

```sh
npm exec --yes --package=tailwindcss@3.4.17 -- tailwindcss --content ./index.html --output ./assets/app.css --minify
```

Three.js r128 and its GLTFLoader are distributed under the included MIT license.
