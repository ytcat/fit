# Checkpoint: free walk across the whole town (GOTR-0118)

Branch `agent/free-walk-city` (from `claude/ecstatic-clarke-9as2ak`: v1.92 + AGENTS.md "Languages", LTR rule). Not merged, no
version bump, no PR. Review media: `qa/free-walk-city/evidence/` (committed), full runs with `bash qa/free-walk-city/run-all.sh <out>`.

## What it is
- **In the game, not a page.** `adventure/free-walk/free-walk.js` runs on the engine's renderer through its demo hook (like the
  story films): the player's own Fighter (species, body, street outfit), the game's language, the current profile. Entry: the
  "Free walk" chip on the Adventure map tools (resumes the last spot), "Walk here" on every place card, and on the Old Town card
  "Walk here · <story place>" for the current Chapter 1 step. Exit: "Map" (back to the Adventure map) or Escape.
  `chapter1-roam.html` only forwards to `index.html#free-walk[=place]` (no language or direction of its own).
- **The whole town.** `adventure/free-walk/free-walk-town.js` builds the Gloryland map itself in metres (3 m per map unit, the
  story sets' scale; walkable curb; signs in EN/HE/RU) so the walk, the map and the films show one town. Where a person can
  stand comes from a height field of the town rendered once from above (GPU, ~120-170 ms in SwiftShader), joined to the street
  network; roofs, water, walls, tree trunks and lamp posts are out; pockets are dropped. Walk-only fixes so every district is
  on foot: dome bridge at platform level with a ramp, tech walkway ramp and joint, fort landing and open gateway; a boardwalk to
  Pirate Cove is on the map too (same town).
- **Life.** Cars on the map's street graph (right-hand lanes, turning at crossings) always stop before the player (pure rule
  `FreeWalkCore.carStep`, tested) and never trap the player; StreetLife walkers on the pavements around blocks near the player
  (they step aside), pigeon flocks that burst away when the player comes close; all streamed around the player.
- **Languages.** Every word in `FreeWalkCore.COPY` (EN/HE/RU), district names from `AdventureUI.places`, map signs from
  `GlorylandMap.SIGN_TEXT`; layout left-to-right in every language (CSS `direction:ltr`, text lines `dir="auto"`).
- **Saves.** Position in its own key `gotr.freewalk.v1.<profile>` (old `fit.private.chapter1-roam.v1` only picks the start
  district); the game save is never written by the walk.
- **Story.** Integrator item 5: a deliberately marked story place (the Old Town card button, or picking the current step's place
  in "Walk to") arms a one-time ticket (sessionStorage, nonce of this walk, 30 min); physically walking into the ring consumes it,
  closes the walk, opens the map at Old Town and runs `AdventureOldTown.start(ctx, step)` after a live re-check. Ordinary walking,
  other markers, locked steps and bosses never start anything.
- **Offline.** The free-walk scripts and CSS are in `index.html` and so in `offline-manifest.json` (regenerated, version unchanged).

## Checks (latest)
- `node tests/free-walk.test.cjs` ok; `bash scripts/run-tests.sh -j 2` see the final report.
- `qa/free-walk-city/tour.cjs`: walked on foot from Old Town to all 14 destinations (4 story places + 11 districts' landmarks), all reached.
- `qa/free-walk-city/story.cjs` (real save at `market_robber`): ordinary walk 0 launches, save unchanged; card button (real tap)
  armed, ring entry -> exactly 1 launch (`dream_market_robbery` plays); a new walk into the ring -> still 1.
- `qa/free-walk-city/walk.cjs <out> en|he|ru`: each district opens, real touch stick and keys move the Fighter, names localized.

## Next
- Look at the EN/HE/RU sheets in `qa/free-walk-city/evidence/`; phone check (real device) of frame time.
- Integrator: reconcile with ChatGPT's PR #40 (strings, story ticket) at the end.
