# Bundled audio sources

These files play locally from this application. No external audio service or API
is used. The recordings were converted to mono 24 kHz PCM WAV, leading quiet
trimmed, gently low-pass filtered and peak-normalized to 0.78. Playback adds small
rate/level variations and mixes the recorded handclaps into stereo applause.

## R78 active air and glove Foley — original CC0 sound design

The current application replaces the previous game-character effort voices with
`breath-1.wav` and `breath-2.wav`: dry, unvoiced pressure-release exhalations.
`leather-hit.wav` replaces the hammer-derived pad sound, and `air-swing.wav`
replaces the former swing sample. These four clips are original deterministic
sound designs built by `scripts/build_boxing_audio.py`, dedicated under CC0 1.0
([full text](CC0-1.0.txt)). They contain no animal or game-character recordings
and no pitched vocal sweep. They are not recordings of a person in pain.

The older `effort-*.wav`, `pad.wav` and `swing.wav` files remain for cached old
versions but are not selected by the current audio engine. Recorded body thuds,
handclaps and the metal bell retain their source notices below.

## Teeworlds — CC BY-SA 3.0

Source: https://github.com/teeworlds/teeworlds/tree/master/datasrc/audio
License/source notice: https://github.com/teeworlds/teeworlds/blob/master/license.txt

Copyright Magnus Auvinen and the Teeworlds contributors. Content authors credited
by that project: android272, Chi11y (chi1), Crises, Daniel, Echchouik, Fisico,
leovilok, Landil, Lappi, LordSk, maikka, matricks, Pocram, red_com, serpis, SkizZ,
somerunce, Sonix, Stephanator, teetow, Ubu and Zatline.

| Bundled file | Original file |
| --- | --- |
| body-1.wav | foley_body_impact-01.wv |
| body-2.wav | foley_body_impact-02.wv |
| pad.wav | wp_hammer_hit-01.wv |
| swing.wav | wp_hammer_swing-01.wv |
| effort-1.wav | vo_teefault_pain_short-01.wv |
| effort-2.wav | vo_teefault_pain_short-02.wv |

These converted/processed audio files remain available under CC BY-SA 3.0.
Full license: [CC-BY-SA-3.0.txt](CC-BY-SA-3.0.txt).
The upstream notice is retained in [Teeworlds-LICENSE.txt](Teeworlds-LICENSE.txt).
No endorsement by the original authors is implied.

## Versilian Community Sample Library — CC0

Source: https://github.com/sgossner/VCSL
Creator: Versilian Studios LLC / Sam Gossner and VCSL contributors.
License: [CC0-1.0.txt](CC0-1.0.txt).

| Bundled file | Original path under VCSL |
| --- | --- |
| clap-1.wav | Idiophones/Struck Idiophones/Claps/Clap_rr1.wav |
| clap-2.wav | Idiophones/Struck Idiophones/Claps/Clap_rr2.wav |
| clap-3.wav | Idiophones/Struck Idiophones/Claps/Clap_rr3.wav |
| bell.wav | Idiophones/Struck Idiophones/Cowbells/Cowbell1_Normal_v3_rr1_Mid.wav |

The bell is an acoustic struck-metal recording, rather than a synthesized tone
or a claim to be a recording from a particular boxing venue.

## R79 recorded impacts, resonant bell and handclap room mix — CC0

The active impact aliases now select `punch-head-v3.wav`, `punch-body-1-v3.wav`
and `punch-body-2-v3.wav`. Sources are Kenney's Impact Sounds, redistributed by
Boyquotes under CC0 1.0:
https://github.com/Boyquotes/kenney-impact-sounds-for-godot/tree/999dd1684873f8b020a3aa5b26e713da21688924
Original files: `impact_punch_medium_000.ogg`, `impact_punch_heavy_000.ogg`,
`impact_punch_heavy_002.ogg` in `addons/kenney impact sounds/`.
The source repository's license was checked against CC0 before import.

`ring-bell-v3.wav` uses VCSL's acoustic Nepalese handbell `HB_1.wav`, preserving
its resonant tail rather than the former cowbell timbre:
https://github.com/sgossner/VCSL/blob/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/Idiophones/Struck%20Idiophones/Hand%20Bells%2C%20Nepalese/HB_1.wav
This is a recorded handbell, not a claim of a recording from a boxing venue.

`applause-room-v3.wav` is an original stereo arrangement of the existing CC0
VCSL handclaps, with irregular individual timing and short room reflections.
It uses no pitched resampling or synthetic clap oscillators. It is an assembled
crowd effect, not a field recording of spectators. The arrangement is CC0 too.

All new clips are 48 kHz PCM. The original impact recordings were onset-trimmed
and gently faded; the bell's natural decay was retained. Playback uses near-native
rates. Quiet, unvoiced reaction air remains original sound design; there are no
animal/game-character voice clips in the active map.

Rebuild: `python scripts/build_recorded_boxing_audio.py SOURCE_DIRECTORY`.
Exact source revisions, original hashes, output hashes and processing metadata:
[recorded-v3-manifest.json](recorded-v3-manifest.json). Legacy files and their
licenses remain for cached clients. Full CC0 license: [CC0-1.0.txt](CC0-1.0.txt).
