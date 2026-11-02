# R22: autonomous fights, recorded judging and rhino referee

This release consolidates the earlier R21 fight implementation into one engine.
The direct Fight button and the three-round exhibition remain available. The
superseded `fight-session` / `fight-experience` runtime files are removed; the R21
release notes remain as history.

## User flow

Choose **Fight** (or **Target → Fight mode**), then select a bout. Each new bout draws a fresh
random seed. Pause/resume controls active fight time. Playback remains locked to
1× in fight mode; normal practice speeds remain available after leaving it.
The technique rail is hidden during a fight to make room for both full bodies.

The default club bout is four three-minute rounds, with one-minute corner breaks.
The earlier three-round exhibition is retained. Six-round and twelve-round title-style formats use the same round/rest lengths.
A clearly labelled exhibition uses three one-minute rounds with fifteen-second
breaks. These are app presets based on common adult men's professional formats;
there is no single duration that applies to every boxing discipline/category.

## Autonomous decisions and actual contacts

`boxing-fight.js` owns bout state and seeded decisions. Both fighters have their
own actions, recovery timing, stamina, condition and initiative. Choices include
straight punches, hooks, uppercuts, head/body/shoulder targets, slips, rolls,
guards, counters, trades and distance resets. No prewritten combination timeline
or winning character is selected. The target is committed before impact, so a
late evasion can cause a real geometric miss.

`fight-arena.js` advances both posed skeletons at fixed 60 Hz. Swept knuckle
samples intersect the other avatar's head, torso, shoulder, upper-arm, forearm
and glove volumes. Only the first observed contact of a punch can be recorded.
Clean head/body contacts earn scoring quality; gloves/arms register as blocks;
shoulder contacts react physically but earn no clean-hit points. Misses never
manufacture a contact. Evasion credit requires a defensive action during the
incoming strike. Both fists are sampled before contacts are resolved.

Head contacts drive a damped face/neck turn and backward recoil. Body hits flex
the trunk and knees; shoulder/arm contacts recoil the receiving shoulder. Both
punching and blocking gloves compress briefly. These are authored, contact-driven
animation responses, not a validated model of injury or human tissue mechanics.

Stamina/condition and stun are explicit game-model values. Accumulated clean
impacts can trigger a one-knee knockdown and an eight-second count; the fighter
rises toward the end of the count. Low remaining condition can lead to a referee
stoppage (TKO). Counts can extend past the round clock before the next phase.
There is no automatic three-knockdown rule and no standing-eight count.

## Three performance-based cards

Three deterministic simulated judges have distinct weights for recorded clean
contact quality, impact quality, successful defence and effective pressure.
Knockdowns influence round merit and the round margin. Each round's winner
receives ten points, the opponent normally nine, with wider margins for dominance
or net knockdowns. Exact ties can be ten–ten. This is a simplified professional
boxing-inspired scoring algorithm, not a certified judge or official rule engine.

Each card stores its round scores and the underlying statistics. Final totals
are the sum of those rounds. Majority votes determine unanimous, split or
majority decisions. A genuine draw is allowed; no random tie-break forces a
preferred winner. TKO wins independently of the cards, and the UI explicitly
labels any displayed scores as the cards through the stoppage.

The three cards are revealed separately before the result is announced. A detail
dialog shows all round scores and each fighter's head/body hits, blocks and
attempts. No judge score is randomly generated or added to make an ending work.

## Ceremony and audiovisuals

`fight-referee.js` creates an original grey rhino referee with two horns, tapered
ears, striped shirt, trousers, articulated arms and hands. After the cards, the
fighters line up. The referee's hand follows the winner's actual wrist using
arm IK; the winner raises the glove, smiles and turns/nods the head while the
loser lowers the gaze. A draw raises both hands. Ringside silhouettes clap.
A short applause sound is synthesized locally after the announcement and obeys
mute. Bells and impact sounds use the existing gesture-initialized audio engine.
Foreground ropes/posts are hidden according to viewing direction so they do not
obscure the fighters' bodies. All meshes, code and sounds run inside the app.

## Verification

Three new suites cover the state machine/scoring, the actual animated arena and
the UI. Observed seeded bouts produce both lion and rabbit wins. Tests check
contact totals against recorded legal events, frame-rate invariance, pause,
localized reactions, reachable finite limbs, referee wrist contact, loser pose,
three cards before announcement, full four-round timing, score sums, split
judging, draws, TKO, language changes and clean return to practice. The existing
eleven suites cover prior practice, equipment and avatar regressions.

`qa/render-fight.cjs` exports actual head/body reactions, pre-announcement lineup
and winner ceremony for CPU geometry review. These images omit PBR, textures and
shadows. The available cloud browser has no WebGL context, so final GPU shading
cannot be verified there. No external engine, remote AI or sound service is used.

Primary rules references:

- Association of Boxing Commissions: three-minute rounds, one-minute rests,
  three judges, ten-point-must, mandatory eight after a knockdown:
  https://www.abcboxing.com/unified-rules-boxing/
- WBC, professional progression through four/six/eight/ten/twelve rounds:
  https://wbcboxing.com/en/round-12-what-is-the-boxer/
- WBC, championship format:
  https://wbcboxing.com/downloads/WBC_RULES_FOR_CHAMPIONSHIP_FIGHTS_SYNTHESIZED-2016.pdf
