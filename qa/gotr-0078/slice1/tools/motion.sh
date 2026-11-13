#!/usr/bin/env bash
# Motion evidence at 402x690: 8 frames of the street walk, 8 of the gym conversation, an old street scene before / after.
cd "$(dirname "$0")/../../../.." || exit 1
T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0078/slice1
run() { timeout 560 node $T/run.cjs "$T/$1" 402 690 2>&1 | grep -v "GL Driver" | tail -1; }
TAG=mw SCENE=dream_opening SHOTS=1:19.5,2:19.8,3:20.1,4:20.4,5:20.7,6:21.0,7:21.3,8:21.6 run film.js
TAG=mt SCENE=dream_gym_talk SHOTS=1:2.4,2:5.5,3:9.5,4:13.5,5:17.5,6:21.5,7:29.5,8:33.5 run film.js
SCENE=arrival AT=7.5 TAG=outfit-rule-after run oldscene.js
python3 - <<'EOF'
from pathlib import Path
from PIL import Image
d = Path('qa/gotr-0078/slice1')
def strip(names, out, crop=(0, 48, 402, 573), cols=4):
    ims = [Image.open(d / n).crop(crop) for n in names]; w, h = ims[0].size; rows = -(-len(ims) // cols)
    s = Image.new('RGB', (cols * (w + 4) - 4, rows * (h + 4) - 4), '#101418')
    for i, im in enumerate(ims): s.paste(im, ((i % cols) * (w + 4), (i // cols) * (h + 4)))
    s.save(d / out, quality=84); print(out, s.size)
strip([f'mw-{i}-402.webp' for i in range(1, 9)], 'motion-walk.webp')
strip([f'mt-{i}-402.webp' for i in range(1, 9)], 'motion-talk.webp')
strip(['outfit-rule-before-arrival-402.webp', 'outfit-rule-after-arrival-402.webp'], 'motion-old-arrival-before-after.webp', (0, 60, 402, 630), 2)
for f in list(d.glob('mw-*.webp')) + list(d.glob('mt-*.webp')): f.unlink()
EOF
