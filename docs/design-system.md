# Glory of the Ring — design system

Introduced for GOTR-0014 (proportional buttons) and GOTR-0015 (professional redesign).
Evidence and tools: `qa/gotr-0015/`.

## Files

| File | Role |
| --- | --- |
| `design-tokens.css` | Every colour, radius, control size, type step, spacing step and shadow. Loaded first. **Re-theme the app by changing values here only.** |
| `design-system.css` | Shared components: buttons, icon buttons, tabs, cards, dialogs, inputs, HUD. Loaded last. |
| Feature stylesheets (`game-shell.css`, `club-interface.css`, `ringside-layout.css`, `ringfighter-controls.css`, `workout-experience.css`, `career-interface.css`, `assets/app.css`) | Layout mechanics (grids, no-scroll sizing, breakpoints). They contain no hard-coded colours; they reference tokens. |

New CSS must use the tokens (with fallbacks if the file may load without `design-tokens.css`) and must not introduce hex/rgb colours. `<meta name="theme-color">` in `index.html` is the one literal copy of `--gr-bg`; update it when the background changes.

## Colour tokens

| Token | Use |
| --- | --- |
| `--gr-bg` | App background, insets (tab containers, inputs, meters) |
| `--gr-surface` | Header, toolbar, dialogs |
| `--gr-surface-2` | Cards inside a surface |
| `--gr-surface-3` / `--gr-surface-4` | Secondary buttons and raised controls / their hover |
| `--gr-border`, `--gr-border-strong` | Hairlines / input outlines and hover borders |
| `--gr-text`, `--gr-text-muted`, `--gr-text-faint` | Primary text / secondary text / captions and disabled |
| `--gr-accent-rgb` → `--gr-accent`, `--gr-accent-soft`, `--gr-accent-line` | Primary actions and selection. One RGB triplet drives the fill and its tints |
| `--gr-accent-hover`, `--gr-accent-press`, `--gr-accent-ink` | Primary button states and the label colour on the accent |
| `--gr-accent-text` | Accent-coloured text on dark surfaces (lighter step, keeps contrast) |
| `--gr-info*` | Information and the keyboard focus ring (`--gr-focus`) |
| `--gr-gold*` | **Coins, prices, titles and rewards only** |
| `--gr-success*`, `--gr-warning*`, `--gr-danger*` | Semantic states |
| `--gr-corner-red`, `--gr-corner-blue` | Fight corners (health bars); independent of the accent |
| `--gr-scrim`, `--gr-scene-chip`, `--gr-scene-chip-strong`, `--gr-scene-line` | Dialog backdrop and controls laid over the 3D scene |

Contrast is checked by `python3 qa/gotr-0015/contrast.py` (WCAG AA 4.5:1 for text pairs, 3:1 for focus and selection indicators) for the default palette and both alternatives.

### Alternative accents

`qa/gotr-0015/palettes.cjs` holds three palettes expressed purely as token values: **A** crimson (default), **B** electric blue, **C** volt/lime on graphite. To adopt one, copy its values over the same tokens in `design-tokens.css`.

## Scale

- **Radii:** `--gr-radius-s` 8px (buttons, small cards), `--gr-radius-m` 12px (cards, tab containers), `--gr-radius-l` 16px (dialogs, the ring frame), `--gr-radius-pill`.
- **Control heights:** `--gr-control-h` 44px and `--gr-control-h-m` 40px (standard), `--gr-control-h-s` 36px and `--gr-control-h-xs` 32px (small), `--gr-icon-btn` 40px / `--gr-icon-btn-s` 36px (square icon buttons).
- **Type:** system font stack only (`--gr-font`; the app works offline). Steps `--gr-fs-2xs` 10 · `xs` 11 · `s` 12 · `m` 14 · `l` 16 · `xl` 20 · `2xl` 24 · `3xl` 32. Weights 500 / 600 / 700 / 800. Uppercase with `--gr-label-spacing` is for short section labels only and is switched off for Hebrew.
- **Spacing:** 4-point steps `--gr-space-1` … `--gr-space-6` (4–24px).
- **Elevation:** `--gr-shadow-1/2/3`; dialogs use 3, floating scene controls 1–2, cards none.

## Buttons

| Kind | Look | Use |
| --- | --- | --- |
| Primary | Accent fill, `--gr-accent-ink` label, bold | The one action that moves the player forward: Start/Finish session, Buy/Equip, Create player |
| Secondary (default) | `--gr-surface-3` fill, hairline border | Everything else, including the dialog footer "Back to game" |
| Tonal | `--gr-accent-soft` fill, `--gr-accent-text` label | A call to action repeated in a list (lesson cards) |
| Icon | 40px square (32px on very short screens), secondary look | Dialog close and other glyph-only controls |
| Disabled | Transparent, `--gr-text-faint` label, no opacity tricks | Any unavailable control |

States: hover goes one surface step lighter (primary goes darker), pressed darker again, `:focus-visible` shows a 2px `--gr-focus` ring at 2px offset. Never enlarge a control to show focus.

Sizes: standard 40–44px high, small 32–36px, icon 36–40px square. Tuned short-screen layouts (Shop on small/landscape phones, landscape move pads) keep their smaller measured heights.

## Selection

- **Tabs / segmented controls** (Train–Fight–World, World tabs, training-menu tabs, Play/Watch switch, camera): inset container on `--gr-bg`; the selected item is a raised `--gr-surface-3` pill with bold text and a short accent tick.
- **Choice cards** (shop products and categories, boxer, equipment, routines, arenas, cup stage): accent border plus `--gr-accent-soft` fill.
- **Scene controls** (Moves / Combos / Defence, active move): solid accent, because they sit on a busy 3D background.

## Dialogs and cards

One shell for every dialog: `--gr-surface`, hairline border, `--gr-radius-l`, `--gr-shadow-3`, blurred `--gr-scrim` backdrop; a 20px bold title on the leading side and the icon close button on the trailing side. Cards inside use `--gr-surface-2`, a hairline border and `--gr-radius-m`.

## Known JS-embedded visuals (not themeable from CSS)

- `game-shell.js`: shop product and combo icons are inline SVG data URIs with fixed gold strokes/fills; coin glyph `◈`, cart emoji (hidden by CSS and replaced with a mask icon), `⤓`.
- `fight-ui.js`: inline health-bar colours (overridden in CSS by the corner tokens).
- `index.html` inline script: sound button emoji.
