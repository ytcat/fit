# Checkpoint: Super Punch film (GOTR-0088 follow-up, owner 2026-11-22)

Branch `agent/super-punch` (from v1.87 `37247bc`). Not merged, no version bump (`version.js`, offline worker untouched), no PR. Release status: **not released**; ready for the integrator's review.

## What changed
- **Rename:** every player-visible "Sunday Punch" is "Super Punch" (pad button + aria label `fighter-pad.js`, KO caption `sunday-punch.js`, Shop name `game-domain.js`, glossary `glossary.js`, Chapter 1 recap EN/HE/RU `adventure/story-flow.js`, comment in `game-shell.js`). Internal ids kept: `sunday_punch`, `gotr-sunday-punch-seen`, ledger `purchase:finisher:sunday_punch`, `window.SundayPunch`, file names. Saves stay valid.
- **`super-punch-film.js` (new, pure):** `choose()` — camera choreography (`side_track`, `low_orbit`, `shoulder_push`, `overhead_drop`, `front_low`) and celebration (`arms_up`, `double_biceps`, `shuffle`, `chest_pound`, `point_crowd`) from seed / venue / Opponent / striker; never the same camera or celebration as the previous film (`localStorage gotr-super-punch-last`). `timeScale` (0.6x dip, 0.12x from the glove contact for 0.22 fight s, 1x by 0.55 s), `squash` (jaw/cheek dent, 3 cm peak, rebound + wobble), `blackout` (1.95–2.75 s, K.O. stamp), `crawl` (street: comes to at 3.1 s, drags himself away on his elbows), `ENDINGS` / `STORY` (ring: referee raises; gym: Bruno; street: no referee, crowd cheers, beaten man crawls away; docks: crowd closes in; underground: crowd roars; Fang / Rourke lines EN/HE/RU), `celebrate()` DreamPose states, DOM overlay (letterbox, speed lines, black).
- **`sunday-punch.js`:** film camera with close-up blend on the impact; head jolt + mouth knocked open + skin dent; winner takes his place inside the black and celebrates over the fallen body facing the lens (DreamPose IK, arms cleared off the torso); referee / Bruno steps beside him and raises the arm after the hold (ring, gym); referee left out of the picture while he stands in front of the lens during the punch/fall; ring posts by the lens hidden; ringless lens kept inside the 2.75 m crowd circle (widens instead), side with more room; street winner at the beaten man's feet seen from the side; crowd cheer/close on the venue set; scene line in the caption; skip during the dip ends the hold too.
- **Supporting:** `boxing-fight.js` hold 3.0 → 5.3 fight s; `impact-fx.js` particles follow the film's slow motion (`slowmo`); `arena-sets.js` set `tick` reads `cheer` / `close`; `ringless-venues.js` keeps the set on the view and resets the crowd; `adventure/oldtown.js` `fightDone` waits while the film holds; `sunday-punch.css` overlay styles; `index.html` new script + `?v=2026112210` for changed files; `offline-manifest.json` regenerated (version string unchanged).
- **Docs:** backlog GOTR-0088 follow-up entry, `docs/adventure/FILMS.md` F1 row.

## Checks
- `node tests/sunday-punch.test.cjs` PASS (hold loop now `FILM.hold`, rest measured before the street wake-up, street crawl asserted).
- `node tests/super-punch-film.test.cjs` (new) PASS: variants per seed/venue, no repeat of the last film, endings (no referee / no raise in every ringless venue), timing, celebrations clear of torso and head on lion and rabbit rigs, ring raise (hand 2.0 m) and docks crowd closing in without a referee.
- `offline-version-match`, `arena-sets`, `ringless-venues`, `fighter-pad`, `game-domain`, `story-flow`, `adventure-oldtown`, `impact-power`, `arena-crowd` PASS.
- `bash scripts/run-tests.sh -j 2 sunday fight ringless story gym`: see the final report (earlier run 34 files, 1 fail = `story-clean-gym`, a browser tap timeout under load, unrelated).

## Pictures (Chromium + SwiftShader, 402x690; `node qa/super-punch/film.cjs [outDir] [cases]`)
`qa/super-punch/ring-shoulder_push-arms_up.webp`, `ring-low_orbit-double_biceps.webp`, `ring-rabbit-front_low-point_crowd.webp`, `gym-bruno-side_track-chest_pound.webp`, `street-fang-side_track-point_crowd.webp`, `street-low_orbit-arms_up.webp`, `docks-rourke-overhead_drop-chest_pound.webp`, `basement-front_low-shuffle.webp`, `face-impact.webp`. Each sheet: dip, contact, slow motion, fall, down, blackout, three celebration frames, ending.

## Limits / next
- The jaw/cheek dent is subtle at phone framing; the head snap, open mouth, spray and flash carry the hit. Bigger dents would separate the skin from the eye/nose meshes.
- In story fights the after-film follows ~3 s after the hold (unchanged rule); in the headless captures it sometimes starts earlier (slow software rendering), so some sheets end on it.
- Physical phones not checked; frame cost added is one IK celebration pose and small camera maths per frame (no new geometry).
- Next: owner review on a phone; integrator merges and releases.
