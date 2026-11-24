# Checkpoint: free walk across the whole town (GOTR-0118)

Branch `agent/free-walk-city` (v1.92 + release branch `claude/ecstatic-clarke-9as2ak` up to 644f85a merged in). Not merged to
main, no version bump, no PR. Evidence: `qa/free-walk-city/evidence/` (sheets per language, night, story; JSON reports);
full re-run: `bash qa/free-walk-city/run-all.sh <out>` (about 1.5 h in SwiftShader).

## What it is
- **In the game, not a page.** `adventure/free-walk/free-walk.js` runs on the engine's renderer through its demo hook (like the
  story films) with the player's own Fighter (species, body, street outfit), language and profile. Entry: the "Free walk" chip
  on the Adventure map tools (resumes the last spot), "Walk here" on every place card, and on the Old Town card
  "Walk here · <story place>" for the current Chapter 1 step. Exit: "Map" or Escape (back to the Adventure map).
  `chapter1-roam.html` only forwards to `index.html#free-walk[=place]` (no language or direction of its own; a link never arms a story start).
- **The whole town.** `free-walk-town.js` builds the Gloryland map itself in metres (3 m per map unit = the story sets' scale;
  walkable curb; map signs in EN/HE/RU) so the walk, the map and the films show one town. Walkable ground = a height field of the
  town rendered once from above on the GPU, joined to the street network (roofs, water, walls, trunks, posts and closed pockets
  out). Walk-only fixes: dome bridge at platform level + ramp, tech walkway ramp and joint, fort landing and open gateway; a
  boardwalk to Pirate Cove (on the map too). A device that cannot read the height field back gets a clean notice, never a broken walk.
- **Life.** Cars on the street graph (right-hand lanes, turning at crossings) always stop before the player and never trap the
  player; StreetLife walkers on the pavements near the player (step aside, never block); pigeon flocks that burst away; all
  streamed around the player. Night: a moon fill and a warm light following the Fighter.
- **Languages.** `FreeWalkCore.COPY` (EN/HE/RU), district names from `AdventureUI.places`, map signs from
  `GlorylandMap.SIGN_TEXT`; layout left-to-right in every language (`direction:ltr`, text left-aligned; text lines `dir="auto"`).
- **Saves.** Own key `gotr.freewalk.v1.<profile>`; old `fit.private.chapter1-roam.v1` only picks the start district; the walk never writes the game save.
- **Story.** A deliberately marked place of the still-eligible current Chapter 1 step (not a boss) arms a one-time ticket
  (sessionStorage, this walk's nonce, 30 min). Walking into its ring consumes it, closes the walk, opens the map at Old Town and
  runs the quest card's own `AdventureOldTown.start(ctx, step)` after a live re-check, never on top of a film. Ordinary walking,
  other markers, locked steps never start anything. The guarded "Back to the story mission" return stays.
- **Offline.** The scripts and CSS load from `index.html` and are in `offline-manifest.json` (regenerated; version unchanged).

## Checks
- `node tests/free-walk.test.cjs` (languages, no literal UI text, LTR, signs, walk grid, car rule, road graph, ticket, offline pack).
- Full suite: see the final report of this session.
- `tour.cjs`: from Old Town on foot to all 14 destinations (4 story places + 11 district landmarks): all reached (`evidence/tour-en.json`).
- `walk.cjs` EN/HE/RU: 11/11 districts each, real touch stick moves the Fighter, keys move, district names localized, no page errors.
- `story.cjs` (real save at `market_robber`): ordinary walk 0 launches and save unchanged; card button (real tap) -> ticket ->
  ring entry -> exactly 1 launch (`dream_market_robbery`); a new walk into the ring -> still 1.
- SwiftShader (CPU) numbers only: 84-96 draw calls, ~0.55 M triangles a frame (the Fighter ~0.34 M of it), town build 0.4-1.9 s.

## Not done / limits
- Not checked on a real phone. Overhangs (awnings, arches) are solid from above: the space under them is not walkable.
- The four detailed Chapter 1 film sets are not walkable inside the town (the town is the map at street level).
- Integrator: reconcile with ChatGPT's PR #40 (old page localization, URL story handoff) — this branch replaces the page by a forward.
