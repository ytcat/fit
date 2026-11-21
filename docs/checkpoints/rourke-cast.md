# Checkpoint: Rourke cast (crocodile dock worker, Chapter 1 beat 10)

Branch `agent/rourke-cast`. Not merged, not released.

## What changed
- `adventure/story/cast-docks.js` (new, loaded after `cast-market.js`): StoryCast id `rourke` (EN Rourke / HE רורק / RU Рурк).
  Lion fighter body with a heavyweight bulk; crocodile head field (long flat broad snout, levelled skull table, eye turrets, nostril
  dome, wavy jaw line with the upper jaw overhanging); the lion's eye sockets filled and the upper jaw unfolded onto a clean envelope
  (they showed as slits and see-through holes once stretched); lion face morphs and muscle definition cleared on the head; jaw morph
  on anatomy channel 12 (opens in speech through cast-market's `StoryCast.talk` wrapper, and on hits); scale pattern in the vertex
  colours with a little relief (keeled back scutes, snout plates, square belly scales, fine scales elsewhere, dark mottling,
  countershading); yellow-green slit-pupil eyes with bony lids; ragged teeth rows (upper outside the lower jaw, big lower teeth,
  front teeth, one missing); no ears, mane or fur; tapered crested tail with lag; work trousers with the overall bib rolled down and
  the straps tied at the waist, bare chest, white wraps over scaly clawed hands, work boots. `SC.asOpponent` wrapper hides the boxing
  kit, and the kit (incl. Shop gear that the fight adds later, e.g. "Trunk waistband") is re-hidden every frame.
- `index.html`: script tag after cast-market.js (`?v=2026112180`). `offline-manifest.json` regenerated (versions untouched).
- `tests/rourke-cast.test.cjs` (node + real app in Chromium). `qa/rourke/*.webp` evidence, `qa/rourke/tools/` (docks.cjs, plan.py, webp.py).

## Not done / for the integrator
- `adventure/oldtown.js` `docks_fight` has no `cast: 'rourke'` yet (file owned by another agent): add it to put Rourke in the bout.
- `adventure/story.js` still calls the Docks opponent `hook` (monogram portrait); portraits render 3D only for StoryCast ids.
- Backlog/FILMS entries not updated (avoid overwrite races); add a GOTR entry when integrating.

## Checks
- `node tests/rourke-cast.test.cjs` PASS. `bash scripts/run-tests.sh -j 2 story cast fang ringless fight`: see the report.

## Evidence
- `qa/rourke/rourke-sheet.webp` (all frames), head front/three-quarter/profile/talk, body, Docks guard and mid-punch (close render of
  the live scene and the game view). Re-render: `node qa/rourke/tools/docks.cjs <dir>`; studio: serve the repo, then
  `python3 qa/rourke/tools/plan.py && APP_URL=http://127.0.0.1:PORT/ node qa/gotr-0092/tools/shots.cjs qa/rourke/tools/plan.json <dir>`.

## Known limitations
- Front view of the head is still somewhat blob/frog-like (the lion cheeks); 3/4 and profile read clearly as a crocodile.
- A couple of tiny see-through specks can remain on the snout side in extreme close-ups (folded lion socket triangles).
- Code-built head: owner may still want a Codex-made head like the other casts.
