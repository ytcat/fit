# R21 — Contact-scored exhibition bouts

Fight starts a fresh randomized lion/rabbit bout inside the existing application.
The default is three three-minute rounds, two one-minute rests, an eight-second
scorecard reveal and then the referee ceremony. The existing speed selector
changes the complete simulation clock; pause freezes contact, scoring and poses.

The timing follows the elite bout duration in World Boxing's March 2026 rules:
https://worldboxing.org/wp-content/uploads/2026/10/World-Boxing-Competition-Rules-March-2026-v5.0.pdf
The requested three-judge exhibition is a game format, not a complete implementation
of those competition rules (which use five judges). This version resolves on
points and has no knockdown, KO, foul, medical stoppage or official certification.

## Simulation and scores

- `FightSession` owns seeded attack selection, defense, target choice, fatigue,
  rounds and immutable round cards. Neither actor is assigned a winner in advance.
- `TrainingArena` samples actual glove/guard/head/torso/shoulder intersections at
  fixed 60 Hz. There is one recorded contact per punch, no camera-added momentum,
  and no scoring during the countdown, rest, score reveal or ceremony.
- Clean head/body strikes earn quality and effective-power values based on their
  measured closing speed. Gloves and shoulders can react but earn no points.
- Three fixed weightings assess quality, volume and power. Each round is normally
  10–9, with 10–8 for a dominant difference. Equal measured performance is 10–10;
  final cards vote for the winner. This exhibition allows an honest draw.
- Scores are a transparent game approximation. No random judge scores, fixed
  winner, biomechanical accuracy or official boxing-judging equivalence is claimed.

## Animation and presentation

Local contact impulses produce head recoil/turn, torso folding and knee flexion,
or shoulder rotation. Feet retain IK contact; guard recovery follows the head.
Both fighters move into the announcement formation. The rhino holds their inner
glove cuffs and lifts the winning glove; the winner raises both gloves and turns
their head, while the loser lowers their head. Audience arm motion and synthesized
applause start after the scorecards. The app's mute setting is respected.

The new controls and scorecards support English, Hebrew and Russian. Rematch
generates a fresh seed; leaving Fight restores the existing training controls.
The 3D assets, logic and sound remain bundled or generated locally.

## Verification

`node tests/fight.test.cjs` covers bout boundaries, contact-only scoring,
duplicate suppression, blocked-shot exclusion, different head/body reactions,
freeze, reachable limbs, score agreement at 30/90 Hz, both possible winners and
the hand-raise ceremony. All eleven prior regression suites also pass.

`node qa/render-fight.cjs /tmp/fight.json` followed by
`python3 qa/render-model.py /tmp/fight.json /tmp/fight.png` renders actual CPU-skinned
pose diagnostics. These omit PBR shading, textures and shadows. The available
cloud browser cannot create a WebGL context, so final live GPU rendering and
mobile frame rate remain unverified.
