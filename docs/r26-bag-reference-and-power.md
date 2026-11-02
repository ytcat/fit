# R26 — reference posture and heavier bag impacts

The six supplied images were reviewed for straight-arm follow-through, shoulder/chin protection, the defending glove, stance width, alternating speed-bag rolls and padded impact. They are references only; the stock/product photographs are not distributed in the app.

The previous equipment aiming shortened jab/cross to roughly 145°/132° at maximum contact, despite the longer solo punches. Straight bag punches now solve their complete fist target before interpolating from guard. The loaded fist stays ahead of the protracting shoulder, avoiding the elbow loop introduced by blending feedback corrections. Both punches reach approximately 174° with unchanged bone lengths and a small elbow bend.

The striking shoulder rises farther toward the tucked chin. The other glove follows a closer cheek guard. The bag stance is 0.54 m wide and 0.55 m front to back; support is checked for both feet before leg IK, adding only the knee flexion needed for the wider step. Pelvis adjustment after solving one leg is avoided because that would move its planted foot.

The hanging bag's configured mass increases from 45 to 110 kg, with stronger damping. Effective striking masses increase to 5.25 kg for the jab, 9 kg for hooks and 10 kg for cross/uppercuts. These are game tuning parameters, not measured human punching performance. Collision impulses still depend on relative closing velocity and contact inertia, occur once per strike and do not occur on misses. The target coasts after release.

Straight punches aim through the resting pad, with a quicker guard recovery. The virtual follow-through target is not a command to move the whole glove through the cylinder. Compressed glove geometry and local leather indentation provide the visible contact. Maximum local leather deformation increases from 40 to 60 mm; compression recovers to the original mesh.

At 120 Hz, the same one-cycle fixture measured:

| Measure | R25 jab | R26 jab | R25 cross | R26 cross |
| --- | ---: | ---: | ---: | ---: |
| Collision impulse, game units | 10.69 | 25.80 | 22.24 | 54.71 |
| Peak pad force, game units | 335.0 | 459.4 | 338.5 | 584.4 |
| Maximum contact elbow angle | 144.9° | 173.7° | 131.8° | 173.7° |

The actual compressed glove vertices enter the nominal leather surface by about 54 mm / 79 mm in this fixture; the defending glove's knuckle centre stays within 154 mm / 182 mm of its cheek target. These are rendering and motion diagnostics, not tissue biomechanics measurements.

Speed-bag collision eligibility now follows the forward-rolling hand. A retreating fist cannot add another impulse just because the platform sends the bag back. The existing contact-driven swivel continues to rebound between alternating strikes.

## Checks

`tests/heavy-reference.test.cjs` checks actual glove/pad geometry, full extension during contact, stronger impulse and pad load than recorded R25, cheek coverage, shoulder protection, chin tuck, wider support, reachable limbs and speed-bag hand alternation. Existing regressions retain arm/elbow continuity for all six punches on heavy bag and dummy, constant limb lengths, finite shoulder surfaces, contact frame-rate agreement, misses, guard recovery, full-body framing, fights and cached rig compatibility. Deeper compression is allowed up to 280 ms, with no late force while returning to guard.

Run the complete suite from the repository root:

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
```

CPU pose diagnostics use the real scene geometry and custom skinning:

```sh
node qa/render-arena.cjs /tmp/lion-reference.json reference
python3 qa/render-model.py /tmp/lion-reference.json /tmp/lion-reference.png
```

These diagnostics omit PBR, textures and shadows. The available cloud browser reports WebGL unavailable; shaded continuous playback, perceived sound quality and real-phone performance remain unverified. No new runtime service, dependency or external engine is introduced.
