# RingFighter game mode: agreed behavior and implementation

The user's earlier request is direct interaction in every existing mode, with
move buttons on both sides of the screen. This is implemented by the existing
**Watch / Play** switch. Preserve Watch as autonomous playback and Play as
player control; do not add an unrelated second game menu.

## Player behavior

- Either Lion or Rabbit can be selected. Play works in shadowboxing, heavy bag,
  body dummy, speed bag, sparring and Fight night.
- Lead-side punches/defences appear on the left; rear-side moves on the right.
  Include both hooks/uppercuts, slips, roll, guard and lateral footwork.
- Speed bag substitutes relevant lead/rear taps, doubles and triples for normal
  punch commands. Retain defence and footwork.
- Start a move immediately when ready; buffer at most two following moves.
  Clear pending input on seeking, equipment changes and character switches.
- Sparring opponents act independently. Fight disables only the selected
  fighter's automatic decisions. Rounds, stamina, contact, knockdowns and judging
  remain authoritative. Manual input cannot bypass a count or finished bout.
- Score and play impact audio only from registered physical contacts. Pressing
  a punch button alone does not award a hit.
- Keep all controls inside the visible mobile viewport. Camera dragging,
  pinch/wheel zoom and the − / + / Fit buttons remain usable in Play.

## Existing integration

`boxing-input.js` owns command validation, bounded buffering and the shared
simulation timeline. `ringfighter-controls.js` owns move buttons and keyboard input.
`club-interface.js` connects Watch/Play to the selected boxer and mode.
`training-arena.js` and `fight-arena.js` apply the existing pose/contact system;
`boxing-fight.js` owns independent opponent decisions and bout state.

The implementation history is in
[R81 interactive controls](r81-ringfighter-interactive-controls.md),
[R22 fight rules and judging](r22-autonomous-fights-and-judging.md), and
[R82 ring movement](r82-ring-movement-camera.md). Historical notes describe
their release, so later fixes and current source take precedence.

## Regression gates

`tests/player-input.test.cjs` checks input validation, queue limits, timing and
fight-phase restrictions. `tests/player-arena.test.cjs` checks real equipment
contacts, speed-bag hands, defence without fabricated hits, actual lateral
steps, independent sparring and player-versus-AI fights. The real-markup
`tests/club-interface.test.cjs` checks the switch and controls. R85 browser QA
checks camera/zoom and viewport containment in Watch and Play across all modes.

No separate career, currency, online multiplayer or progression design was
found in the current repository or supplied conversation. Those features are
not implied by these requirements. Character realism and physical-phone
performance verification remain separate unfinished work.
