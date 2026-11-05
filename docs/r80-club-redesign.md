# ShadowBox R80 — club redesign and improvement plan

The app now has a coherent boxing club identity and a visible path from choosing a boxer to training and watching a bout. This release builds on the published R79 motion, shoulder, contact, recovery and recorded-audio fixes.

## Findings and completed improvements

| Priority | Finding | Implemented change |
| --- | --- | --- |
| 1 | Important choices were hidden behind generic controls. | A dedicated training sidebar, direct equipment buttons, a visible character selector, and separate Training gym / Fight night navigation. |
| 1 | The instructor was fixed to the lion. | Select Lion or Rabbit for every practice mode. The choice is remembered locally; the opposite species becomes the sparring partner. Both actual species keep the correct identity in fight simulation and scorecards. |
| 1 | Dark empty backgrounds gave little sense of place. | An original 3D gym with industrial windows, masonry, posters, hanging bags, weights, a bench, towel, bottle and lockers. Fight mode switches to a championship arena with grandstands, banners, scoreboard and overhead fixtures. |
| 1 | Small controls and inconsistent visual weights obscured the main task. | Charcoal, cream and muted gold styling; consistent control shapes; distinct selected, paused, active, disabled, hover and keyboard-focus states. Camera controls sit outside the character view. |
| 2 | Footwork and standing posture needed a clearer inspection path. | An explicit Stance technique, visible orthodox-stance label, front/side/back views and accessible pause. Existing grounded foot placement and shoulder corrections remain in place. |
| 2 | Phone controls competed with the character. | A compact top selection area, horizontal technique rail, full-width canvas, correct canvas aspect ratio and sticky transport. Desktop uses a dedicated sidebar and technique rail. |
| 2 | Switching characters could confuse the names of fight actors. | Cached species-specific rigs, an opposite-species practice partner, and an explicit species-to-fight-actor mapping. Character replacement is disabled during a running bout. Returning to practice after a knockdown also clears the fighter’s root tilt, preventing sideways training. |
| 2 | More scenery could increase rendering cost. | Static props, brick joints and seats are instanced by geometry/material; each environment stays under 65 mesh objects in regression checks. Environments are reused rather than rebuilt on mode changes. |
| 2 | Accessibility and failure states needed attention. | Restored browser zoom, keyboard shortcuts, reduced-motion styles, translated new controls, language persistence, correct HTML language and direction, and clear asset/WebGL loading states. |

## Interaction details

- Choose a character, then Shadowbox, Heavy bag, Body dummy, Speed bag or Sparring.
- Select individual punches, defence, footwork, Stance or a combination. Existing 24 presets and generated sequences remain available.
- Space pauses/resumes when focus is outside a control; 1–6 select punches; G returns to the gym; F opens fight setup. Native button keyboard interactions remain intact.
- Fight night runs an autonomous bout between Lion and Rabbit. The training selection is retained when returning to the gym.
- Preferences are saved on the current browser only. Storage denial does not block use. A refresh does not resume an old fight.

## Verification

All 37 existing regression suites and both new integration suites passed locally. The final knockdown-to-practice change also passed the fight-lifecycle check.

The existing CPU regression suites cover motion, joint reach, shoulders, ground contact, equipment contacts, bag dynamics, fight lifecycle, judging, knockdown recovery, audio and translated controls. New integration checks exercise the shipped HTML with the real UI modules and cover character/equipment selection, the speed-drill rail, pause, English/Hebrew/Russian, settings, fight setup, return to training and unique control IDs. A new 3D test switches both species through all five practice modes and verifies the fight identity mapping, rig reuse, frozen state and scene draw-call budget.

The managed browser tool was unavailable in this session. These checks do not verify rendered desktop/phone screenshots, physical-device performance or perceived lighting. No new browser runner was substituted for that unavailable tool.

## Next validation priorities

1. Compare the new gym and arena on physical phones, especially low-power Android WebGL devices.
2. Review the 3D fur and facial anatomy under the new backgrounds; future mesh authoring should use the existing authored-head review process.
3. Validate contrast and tap comfort at increased browser font sizes with native assistive technology.

These are follow-up validation and art refinements, not claims of completed physical-device or photorealism verification.
