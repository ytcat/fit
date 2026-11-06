# R87 — training careers and fight presentation

The training room now has deliberate 60-second scoring sessions, separate from fight bouts and free previews. A player has independent Lion and Rabbit careers. Starting a session enables scoring; simply watching a preview does not. Switching stations, switching boxer, leaving the page or pressing Finish settles the current session. Pausing and hiding the tab cannot advance its scoring clock.

## Implemented improvement plan

| Area | Change |
| --- | --- |
| Training and fighting | Retain separate gym and arena navigation; add explicit scored training sessions and completed-bout rewards. |
| Character development | Power, speed, accuracy, footwork, defence and stamina, independent for each boxer. |
| Exercises | Heavy bag, dummy, speed bag, shadowboxing and sparring; new jump rope and trainer mitt work. |
| Trainer response | Measured mitt contacts, recoil and a hook/roll/counter sequence. In Play mode the player must actually duck; idle guard earns no duck credit. |
| Fight benefits | Ratings change punch damage, punch duration, committed aim spread, defensive decisions, step duration, recovery gaps, duck depth and stamina use/recovery. |
| Skill levels | Rookie → Amateur → Prospect → Contender → Professional → Champion → World champion. |
| Shoes | Both species and their trainer variants use sculpted uppers, narrow heels, rounded toes, thin soles, stitched trim and collars that follow the shin. The referee wears matching low-top shoes. |
| Fight graphics | Lion vs Rabbit, Fight, Break and the actual winner. Last ten seconds have a prominent numeric clock and one audible tick per second. |
| Interface | Rank/XP card, six attribute meters, a compact mobile training strip, progress details and player selection. Existing camera, manual controls and EN/HE/RU equipment labels remain. |
| Saving available now | Named device-local profiles, a saved guest, and validated export/import backups. |

## Scoring

Training lasts 60 seconds, or can be ended early after at least 10 active seconds. A session needs actual activity: completed jumps, observed contacts, defensive blocks or shadowboxing punches. Duplicate session IDs are rejected. Fight rewards use round time, excluding the introductory announcement and corner rests. A completed fight is credited to the player/boxer captured when it started.

The base reward depends on active seconds, work rate and observed contact accuracy. Exercise weights distribute it to relevant attributes: rope favours footwork, speed and stamina; the heavy bag favours power; the dummy favours accuracy; mitt work favours accuracy and defence. Ratings have diminishing returns and are bounded between 20 and 99. Rank thresholds are 0, 250, 750, 1,800, 3,500, 7,000 and 14,000 XP.

Higher ratings improve physical/simulation parameters, but do not invent scoring contacts or force a winner. Opponent ratings remain unchanged. Judge cards still use actual rendered contacts.

## Cross-device accounts — blocked, not implemented

The user explicitly selected cross-device sign-in. This repository and its GitHub Pages host have no authentication service, server API, database or configured backend credentials. Browser profiles are **not accounts**, and export/import is **not automatic sync**. The interface discloses device-local storage. No password field or misleading sign-in button is shown.

A connected account backend remains required to finish this part. The requested project settings have not been supplied. The integration must provide authenticated player ownership, durable server-side scores, idempotent session awards, conflict-safe updates and an offline retry queue. Never place an administrative/service-role credential in this public repository.

## Verification

- All 48 regression suites passed. The final UI/scoring adjustments were also
  rerun against their targeted suites; script syntax and asset references pass.
- Regression checks cover saved profiles, independent boxers, reload/import, malformed data, duplicate awards, pause/preview behaviour and actual UI station transitions.
- Both character rigs are sampled for new-boot floor clearance and shin alignment; the existing knockdown support test now loads the new footwear.
- Both rope drills clear the floor/feet, and both mitt drills produce real target contacts and duck clearance. Manual idle earns neither hits nor duck credit.
- Fight-state tests cover announcements, repeated seconds, pauses and round restarts. Audio checks cover mute, gesture unlock, suspended contexts and final-three-second pitch emphasis.
- Live browser/GPU visual QA is unavailable in this execution environment. Geometry and DOM tests do not replace a rendered visual review or physical-phone testing.

## Remaining review

Connect and verify real account sync; inspect the new footwear, mitts and responsive layout in a GPU browser; tune difficulty against longer training histories. The authored animal-boxer motion is a game animation, not a motion-captured coaching reference.
