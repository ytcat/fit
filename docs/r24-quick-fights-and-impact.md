# R24 — quick fights and contact response

Choose **Fight mode → Quick fight · 1 minute**. There is one 60-second active round after the ready phase. A real contact removes health according to closing speed, attacker power, stamina and head/body target. Blocks do not remove health. Either actor may win; within two health points at the bell is a draw. Zero health ends the bout immediately with a KO, centre banner and falling loser. The quick result bypasses the long judge reveal. Longer bouts keep their scorecards and knockdown count/stoppage rules.

Both damage bars show the remaining numeric health and change blue → green → yellow → red at 75/50/25. Each new session uses a new random seed; winners are consequences of contacts and damage, never a preselected coin toss. Seeded playback is retained for reproducible tests. Contact slows the attack clock briefly before recovery. Face details compress 12 mm and squint while the existing head/neck/trunk response carries the impact. These are bounded game approximations, not measured tissue biomechanics.

The old heavy-bag cylinder had no vertical subdivisions: a local body-height dent had almost no vertices to move. It now has 32 height segments; a full diagnostic load produces a local 40 mm dent which recovers exactly. Speed-bag hand circles are reachable, the equipment sits within striking distance, and the swivel receives momentum from approaching contacts using effective angular mass. No target-entry or first-frame impulse is invented. The observed three-second diagnostic has 13 contacts (9 left, 4 right), about 0.058 rad peak swing and visible localized compression. This is alternating practice, not a validated professional speed-bag routine.

The mane follows body acceleration with wind disabled and settles at rest. Twenty-four bounded spring guides use the arena frame so camera orbit adds no energy. Seek, reparent, and long time-jump reset paths are covered. Handed glove geometry now uses positive determinant transforms rather than negative scale mirroring.

Audio remains synthesized locally: five independently decaying inharmonic bell modes replace the descending triangle beep. Applause combines irregular stereo palm transients, resonances and quiet reflections with peak normalization to avoid buffer clipping. Legal head/body impacts can add a short voiced exhalation. The audio test verifies signal bounds and mute; auditory realism on speakers is NOT TESTED.

## Validation

Run all focused checks with:

```sh
for f in tests/*.test.cjs; do node "$f" || exit 1; done
```

New regressions cover one-minute clock, both health winners, draw, early KO, damage strength, blocks, contact dwell, inertial mane settling/reset/orbit isolation, facial recovery, speed-bag contact causality, reach, bounded rebound, local bag indentation, modal bell, stereo clipping bounds and mute. Existing checks cover every action, foot contacts, guard, camera envelope, shoulder strain, equipment modes, all languages, UI and frame-rate convergence.

Actual scene simulations (not injected contacts): seed 11 → rabbit KO at 26.23 s simulation time, seed 999 → lion KO at 17.50 s, seed 42 → rabbit KO at 33.32 s. These times include the ready phase. The loser root reaches -1.38 rad pitch after falling. Timeout health decisions and ties are separately tested with controlled fixtures.

See `implementation-audit.md` for unpassed visual/performance gates. Automated checks do not establish photorealism, coach certification or actual iPhone frame rate.
