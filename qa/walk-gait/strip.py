#!/usr/bin/env python3
"""Walk-gait QA strips: python3 qa/walk-gait/strip.py <out.webp> <speed> <dirA> [labelA] [<dirB> labelB] [views=side,front,q34,behind] [frames=0-11]
Rows: per view (and per run when two runs are given, before above after), 12 frames of one cycle cropped round the Fighter."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
args = sys.argv[1:]
out, speed = args[0], args[1]
runs = []
rest = args[2:]
views = ['side', 'front', 'q34', 'behind']
frames = list(range(12))
while rest:
    a = rest.pop(0)
    if a.startswith('views='): views = a[6:].split(','); continue
    if a.startswith('frames='): lo, hi = map(int, a[7:].split('-')); frames = list(range(lo, hi + 1)); continue
    label = rest.pop(0) if rest and not os.path.isdir(rest[0]) and not rest[0].startswith(('views=', 'frames=')) else os.path.basename(a)
    runs.append((a, label))
CW, CH, X0, Y0 = 290, 480, 56, 90  # crop round the figure (canvas 402x690, the camera looks at the hips)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
rows = [(v, d, l) for v in views for d, l in runs]
W, H = CW * len(frames), (CH + 22) * len(rows)
img = Image.new('RGB', (W, H), (24, 24, 28)); dr = ImageDraw.Draw(img)
for r, (v, d, l) in enumerate(rows):
    y = r * (CH + 22)
    dr.text((6, y + 3), f'{l} - {speed} - {v}', fill=(240, 230, 200), font=font)
    for c, i in enumerate(frames):
        p = os.path.join(d, f'{speed}-{v}-{i:02d}.png')
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB').crop((X0, Y0, X0 + CW, Y0 + CH))
        img.paste(im, (c * CW, y + 22))
img.save(out, quality=82)
print(out, img.size)
