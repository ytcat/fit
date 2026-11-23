# Checkpoint: free walk across the whole town (GOTR-0118)

Branch `agent/free-walk-city` (from `claude/ecstatic-clarke-9as2ak`, v1.92 + AGENTS.md "Languages"). Not merged, no version bump.

## Done so far
- `adventure/free-walk/free-walk-core.js` (pure): EN/HE/RU copy, walk grid from a height field, movement, own save key, districts, car rule, road graph.
- `adventure/free-walk/free-walk-town.js`: the Gloryland map built in metres (3 m/unit, walkable curb, localized signs), GPU height field -> walkable grid, cars (brake for the player), pavement walkers.
- `adventure/free-walk/free-walk.js` + `.css`: the in-game mode (engine demo hook, player's own rig in street outfit), stick/keys/zoom/drag-turn, district name, destination + arrow, story return, day/night.
- `adventure/gloryland-map.js`: opts `scale`, `curb`, `walk`, `lang` (signs in EN/HE/RU), `layout` export; the Adventure map passes `lang`.
- Entry: "Free walk" chip on the Adventure map tools; "Walk here" on every place card (the Old Town Chapter 1 card suggests the story waypoint).

## Next
- chapter1-roam.html -> redirect into the game; tests (no single-language strings, core rules); QA sheets per district/language; perf numbers.

## Checks
- `node qa/free-walk-city/walk.cjs <out> en oldtown,downtown` -> opens, walks, 12 cars, 10 walkers, no page errors.
