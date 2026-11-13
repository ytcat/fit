# Approved game sounds — safe staged integration

Status: **staging branch only; not a live deployment.** Integrate all approved recordings, not just the Russian referee.

## The six approved recordings
| Type | Source | Exact status |
|---|---|---|
| Rhino referee Russian «БОКС!» | User-approved trimmed `Box_first_shout_trimmed.wav` (0.84 s) | **IN GIT**: transcoded from approved 0.84 s WAV as `assets/audio/approved/referee-fight-ru.opus` (Git blob `90578c5`), retaining the same shout; original WAV remains saved separately |
| Rhino referee Hebrew “להילחם!” | User-uploaded approved WAV | **IN GIT**: `assets/audio/approved/referee_he.opus` (SHA `b741279`) |
| Rhino referee English “FIGHT!” | User-uploaded approved WAV | **IN GIT**: `assets/audio/approved/referee_en.opus` (SHA `0a95c09`) |
| Boxing bell | Benboncan, Freesound 66951, the *second* bell example, three strikes | Exact approved file must be downloaded and attributed (CC BY 4.0) |
| Glove punches | Pixabay “Punching Bag” #38481 | Approved sample; exact binary still needed; Pixabay Content License |
| Knockout applause | Bansemer, Freesound 160493 | Approved sample; exact binary still needed; CC0 |

Do not confuse approved KO applause with the *rejected* regular audience recording.
The rejected heavy bag, fighter grunts, regular crowd, and other rejected referee versions must **not** be substituted. The user confirmed that the previously selected Hebrew “להילחם!” recording is approved; identify its exact WAV before importing rather than regenerating or substituting.

## Source links
- English (approved exact generated WAV): https://resource2.heygen.ai/text_to_speech/3df7e370c86747a2bc7b7a7e550f19c8/24ec3736b0ef4c67a1c635794629679e/id=54f86ed5d7374771a86e8131cc0f93e9.wav
- Bell (Benboncan): https://freesound.org/people/Benboncan/sounds/66951/
- Glove punch: https://pixabay.com/sound-effects/film-special-effects-punching-bag-38481/
- KO audience (Bansemer): https://freesound.org/people/Bansemer/sounds/160493/

## Code strategy
The staged `approved-fight-audio.js` module loads only same-origin recordings under
`assets/audio/approved/` and stores them separately from the existing synthesized or recorded sounds.
A failed load never installs a substitute. It uses the existing audio engine's mute and gain controls.
A referee command plays once only on `bell(kind=start)`; no extra speech on scene render.
The knockout crowd should play only for confirmed KO (not all result ceremonies).
The selected three-strike bell should play ONCE when an end/final bell fires; do **not** wrap the recording
in the existing 3x loop. For start-of-round bell decide whether the approved recording is appropriate;
it is a three-strike end bell, not an approved single start bell.
For punches trigger only on a confirmed impact with intensity and frequency limiting.

## Before live merge
1. Ensure the **exact** six approved recordings are present under `assets/audio/approved/` and record their SHA-256 and source metadata. All three approved referee commands are committed as compact Opus. Only the bell, glove impact and knockout applause exact recordings still need import; do not use sound-alikes.
2. Wire the handler to `fight-ui.js` event callbacks and fight hit callbacks, with unchanged behavior if a file is missing.
3. Only replace the existing synth bell/applause/punch paths **after** the approved sample decodes successfully; never double-play old+new.
4. Preserve iOS audio unlock/resume, mute, cached clips, and language switching. Do not touch animation or 3D logic.
5. Test fight start, round end, knockout, contact, mute/unmute, switching EN/HE/RU, pause/resume and missing-file fallback on both phone and desktop.
6. Do not merge until assets are complete and the user approves test results.

Attribution for bell: “Boxing Bell.wav” by Benboncan, Freesound.org, CC BY 4.0.
