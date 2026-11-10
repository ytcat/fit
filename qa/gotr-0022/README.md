# GOTR-0022 - built arena sets: evidence

Six new selectable arenas built by `arena-sets.js` around the unchanged ring: Street Fight, Boxing Club,
The Basement, Dockside Hangar, City Sports Hall (regional) and Championship Arena.

## How to reproduce

```sh
python3 -m http.server 8147 --bind 127.0.0.1 &
node qa/gotr-0022/capture.cjs all fight,wide,thumb,cost   # PNGs in qa/gotr-0022/raw (ignored), cost.json here
node qa/gotr-0022/gallery.cjs                             # 9 cards x EN/HE/RU x 393x852, 360x640, 852x393, 1366x768
node tests/arena-sets.test.cjs && node tests/game-venues.test.cjs && node tests/venue-selection.test.cjs
```

Gallery cards in `assets/venues/` are the `thumb-*.png` renders of the shipped scene (fighters and referee hidden
only for that capture), reduced to a 160-colour palette (about 50-70 KB each).

## Files

- `fight-desktop-<id>.webp`, `fight-phone-<id>.webp`: the app at 1366x768 and 393x852 from the normal fight camera.
- `wide-<id>.webp`: canvas only, raised wide camera (lower for the two low-ceiling rooms).
- `fight-desktop-existing-styles.webp`: the three existing styles from the same camera, for comparison.
- `gallery-*.webp`, `gallery-results.json`: the gallery at the four required viewports.
- `signage-he-ru.webp`: in-scene signs with the Hebrew (top) and Russian (bottom) arena names
  (`UI_LANG=he OUT=qa/gotr-0022/raw/he node qa/gotr-0022/capture.cjs street,regional wide`).
- `cost.json`: raw renderer counters for every arena.

## Render cost (three.js `renderer.info`, one frame, same paused fight, seed 74)

Chromium headless with SwiftShader. Counts include the fighters, referee, ring and shadow pass.

| Arena | Desktop calls | Desktop triangles | Phone calls | Phone triangles | Wide calls | Wide triangles | Set meshes | Set triangles |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Neighborhood Hall (existing) | 539 | 1,152,499 | 460 | 1,143,971 | 533 | 1,151,753 | - | - |
| Neon Strip (existing) | 539 | 1,152,499 | 460 | 1,143,971 | 533 | 1,151,753 | - | - |
| Harbor Dome (existing) | 539 | 1,152,499 | 460 | 1,143,971 | 533 | 1,151,753 | - | - |
| Street Fight | 399 | 1,152,053 | 384 | 1,148,421 | 396 | 1,147,131 | 29 | 32,700 |
| Boxing Club | 396 | 1,136,303 | 381 | 1,133,935 | 395 | 1,135,407 | 26 | 10,372 |
| The Basement | 398 | 1,150,551 | 385 | 1,143,875 | 396 | 1,147,275 | 27 | 32,100 |
| Dockside Hangar | 397 | 1,144,835 | 382 | 1,138,955 | 397 | 1,143,667 | 31 | 26,852 |
| City Sports Hall | 396 | 1,139,651 | 380 | 1,134,779 | 397 | 1,138,231 | 29 | 17,260 |
| Championship Arena | 401 | 1,158,041 | 384 | 1,144,849 | 400 | 1,153,201 | 35 | 48,186 |

- New sets draw fewer calls than the existing hall (539 desktop / 460 phone) because their crowd is
  a few merged meshes per visible sector instead of 288 separate audience meshes, and the stock hall is masked.
- Each set: at most 35 meshes and 48,186 triangles in total (camera-side sectors are hidden), three shared unlit
  materials, one 1024x512 procedural atlas, no lights, no shadow casters or receivers. Light is baked into vertex
  colours when the set is built (20-80 ms in Node), so there is no per-pixel lighting cost for the set.
- The scene keeps the same seven lights; a set only retunes their colour and intensity while its fight is on
  screen and restores them afterwards, so no shader is recompiled for lighting.
- Not measured: frame time, memory or thermals on a physical phone. Software-renderer timings are not gameplay FPS.
