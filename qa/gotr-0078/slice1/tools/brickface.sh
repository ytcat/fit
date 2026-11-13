#!/usr/bin/env bash
# Brick's face: head close-ups (front, 3/4, side) next to the lion and the previous head, and the gym-talk frame before / after.
cd "$(dirname "$0")/../../../.." || exit 1
T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0082
run() { timeout 560 node $T/run.cjs "$T/$1" 402 690 2>&1 | grep -v "GL Driver" | tail -1; }
WHO=brick ZOOM=head VIEWS=front,34,side TAG=after run cast.js
[ -n "$FAST" ] || { TAG=after SCENE=dream_gym_talk SHOTS=talk:41.6 run film.js; }
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
sheet([[L / f'lion-head-{v}-402.webp' for v in V], [d / f'before-head-{v}.webp' for v in V], [d / f'after-head-{v}-402.webp' for v in V]], 'brick-face-heads.webp', (0, 120, 402, 560))
if (d / 'after-talk-402.webp').is_file(): sheet([[d / 'before-talk.webp', d / 'after-talk-402.webp']], 'brick-face-before-after.webp', (0, 48, 402, 573))
EOF
