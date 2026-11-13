#!/usr/bin/env bash
# Brick's face v3: head close-ups next to the lion (front, 3/4, side, talking), the gym-talk frame and the fight camera.
# FAST=1: heads only.
cd "$(dirname "$0")/../../../.." || exit 1
T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0082
run() { timeout 560 node $T/run.cjs "$T/$1" 402 690 2>&1 | grep -v "GL Driver" | tail -1; }
WHO=brick ZOOM=head VIEWS=front,34,side,b34 TAG=v3 run cast.js
WHO=brick ZOOM=head VIEWS=34 TAG=v3talk STATE='{"talk":1}' run cast.js
if [ -z "$FAST" ]; then TAG=v3 SCENE=dream_gym_talk SHOTS=gym:41.6 run film.js; NOTALK=1 TAG=v3 run flow.js; fi
python3 - <<'EOF'
from pathlib import Path
from PIL import Image
d = Path('qa/gotr-0082'); L = Path('qa/gotr-0078/slice1')
def sheet(rows, out, crop):
    ims = [[Image.open(p).crop(crop) for p in r] for r in rows]; w, h = ims[0][0].size
    s = Image.new('RGB', (len(rows[0]) * (w + 6) - 6, len(rows) * (h + 6) - 6), '#101418')
    for y, r in enumerate(ims):
        for x, i in enumerate(r): s.paste(i, (x * (w + 6), y * (h + 6)))
    s.save(d / out, quality=86); print(out, s.size)
V = ('front', '34', 'side')
sheet([[L / f'lion-head-{v}-402.webp' for v in V] + [L / 'lion-head-34-402.webp'], [d / f'v3-head-{v}-402.webp' for v in V] + [d / 'v3talk-head-34-402.webp']], 'brick-face-v3-heads.webp', (0, 120, 402, 560))
if (d / 'v3-gym-402.webp').is_file(): Image.open(d / 'v3-gym-402.webp').save(d / 'brick-face-v3-gym.webp', quality=88)
if (d / 'v3-fight-guard-402.webp').is_file(): sheet([[d / 'v3-head-side-402.webp', d / 'v3-head-b34-402.webp', d / 'v3-fight-guard-402.webp', d / 'v3-fight-punch-402.webp']], 'brick-face-v3-fight.webp', (0, 60, 402, 630))
EOF
