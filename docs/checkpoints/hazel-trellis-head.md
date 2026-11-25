# Checkpoint: Mrs. Hazel's TRELLIS.2 head in the game (branch `agent/hazel-trellis-head`, GOTR-0126)

Owner 2026-11-25: Hazel's TRELLIS.2 head "perfect". Started from `origin/claude/ecstatic-clarke-9as2ak` b6228dd (v1.95 + source).
Not merged, not released, no version bump.

## What changed
- `tools/blender/hazel_head_game.py` -> `assets/characters/hazel/hazel-head.glb` (run with the defaults:
  `<blender venv python> tools/blender/hazel_head_game.py -- assets/characters/hazel/trellis/hazel-head-trellis-source.glb assets/characters/hazel/hazel-head.glb`):
  scale 0.72 m/unit into her head joint's frame (+Z nose, origin at the joint; dy 0.032, dz 0.06: nose tip at z 0.355 like the code
  head's 0.357, ears to x +-0.33 like the code head's 0.35, eyes at y 0.18), 99.7k -> 14.0k triangles, one 1024 px JPEG, roughness
  0.8, metal 0 (TRELLIS metal map averaged 0.84: an artifact). 0.81 MB.
- Neck scarf: the source's slim long neck ends in a polka-dot scarf. On Hazel's short neck and cardigan collar it sat inside the
  body; tried rigid on the head, then as its own node on the chest joint widened 1.3x and raised 3.5 cm: still red fragments through
  the collar (`qa/hazel-trellis/neck-scarf-trials.webp`). Left out: red faces below head-frame y -0.07 (picked by the base colour,
  smoothed over neighbours) are removed (`scarf=1` exports them as node `neckScarf` for another try; the game does not use it). The
  kerchief over the head, its knotted bow on top and its drape down to the collar at the nape stay.
- Colour: her coat in the TRELLIS texture is more orange than her body (#87603f); `warm=.7` moves the brown coat pixels (green/red
  0.4..0.85, not the red kerchief, white or black) toward her body's ratios (green/red .70, blue/red .46), same red channel.
- `adventure/story/cast-market.js`: the authored-head code is now per character (`HEADS` table: url, label, skin fold band, code pieces
  to hide). Hazel: fold y 1.78..1.84 (her cardigan ends at 1.775), hides her skinned `Hazel: headscarf` too (no doubled kerchief); her
  code eyes, lashes, nose, ears and scarf knot are head-joint children and leave the render layers as Fang's do. Same fallback (code
  head until loaded, never both, retry), same ground rule. API: `StoryCast.market.heads.{fang,hazel}` ({ url, load, ready(ms),
  on(rig, bool), state() }); `StoryCast.market.head` stays Fang's.
- `adventure/story/dream-scenes.js`: `headIds(scene, id)` = every actor with an authored head (Hazel is in dream_market_robbery,
  dream_market_reward, dream_fight_night, dream_chapter_end) plus Fang and Hazel for dream_apology (the film before the market); the
  story-panel prefetch and the film's 5 s wait use it.
- `adventure/portraits.js`: waits for the portrait character's own head (`heads[rig.castHead.id]`).
- Offline pack: `./assets/characters/hazel/hazel-head.glb?v=2026112501` (builder + regenerated manifest, version string untouched).
- `index.html` `?v=20261125hz` for cast-market.js, dream-scenes.js, portraits.js.
- Tests: new `tests/hazel-head.test.cjs`; `tests/pc-smooth-start.test.cjs` and `tests/fang-head.test.cjs` follow the generic wait.

## Numbers (headless SwiftShader, 402x690 page; load ~1.3, so frame times are comparable this time)
- Robbery film, same moments, Hazel's head only changed: draw calls 46/62/121 -> 24/40/99 (-22), triangles -33k (423k -> 390k at 1.5 s).
- Reward film: calls 104/96/126/74 -> 82/77/104/73, triangles -33k.
- Interleaved same-frame renders (reward 12.6 s): auto 726.7 -> 740.1 ms median (+2 %), low 540.8 -> 523.5 ms (-3 %): within noise.

## Evidence (`qa/hazel-trellis/`, tools in `qa/hazel-trellis/tools/`)
studio-head-before-after (front, 3/4, side, back, body), neck-seam-talk-before-after (low front, 3/4, side, back 3/4, talk),
neck-scarf-trials, market-robbery-before-after, market-reward-before-after, films-head-close-before-after, portrait-before-after-cold
(the cold portrait drawn before the file arrived is redrawn when it does).

## Remaining / limits
- No neck scarf (see above); the mouth stays closed (closed smile, no jaw on this head).
- The portrait crops her ear tips like the code head did.
- Hazel never lies down in the game; the ground rule is shared and tested.
- Integrator: full suite before release.

## Checks run
- `bash scripts/run-tests.sh -j 1 hazel-head fang-head story-cast-market portraits dream-market-films market-handbag-drop city-assets
  lang-generic offline-version-match otto-civilian-lifecycle pc-smooth-start` -> files=11 fails=0 (320 s). Full suite not run here.
