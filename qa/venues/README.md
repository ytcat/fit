# F-008 evidence

`preview.cjs` serves and captures the actual app renderer; no concept or generated images are used. Run from the repo root with Playwright in NODE_PATH. It produces desktop/mobile front, quarter and reverse screenshots for each style, locale captures, renderer counts and a pixel-exact default-restoration assertion. `SIGNAGE_ONLY=1` exports the production CanvasTextures for readable English/Hebrew/Russian text inspection; `PORT` avoids a conflicting local QA server. Thumbnails hide the actors only for the picture, never in gameplay.

`gallery.cjs` uses http://127.0.0.1:8132 (or APP_URL), verifies selection/reload/profile isolation, preserves an actual fight/camera/entry/control/pause state, and checks nine localized layouts. Two local test profiles are fixtures; no completed human activity is claimed. Its output is gallery-results.json.

Renderer artifacts are one fixed pose/lighting/camera per view and style. Submitted counts include whatever passes that renderer configuration performs. SwiftShader CPU submission times are not physical phone FPS, GPU completion time or sustained thermal tests. Physical phones remain unverified. See docs/game/F008-arena-styles.md.
