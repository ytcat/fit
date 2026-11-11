# Compose before/after rows of the sparring frames into one small webp.
# Usage (repo root): python3 -I qa/gotr-0028/compose.py
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
offsets = ['-2', '+0', '+6', '+12', '+18', '+24', '+36']
rows = []
for version in ['before', 'after']:
    tiles = []
    for k in offsets:
        im = Image.open(os.path.join(frames, f'{version}-spar-{k}.png')).convert('RGB')
        w, h = im.size
        im = im.crop((0, int(h * .30), w, h)).resize((w // 2, int(h * .70) // 2))
        ImageDraw.Draw(im).text((6, 6), f'{version} {k}f', fill=(255, 255, 255))
        tiles.append(im)
    row = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height))
    x = 0
    for t in tiles:
        row.paste(t, (x, 0)); x += t.width
    rows.append(row)
sheet = Image.new('RGB', (rows[0].width, rows[0].height * 2))
sheet.paste(rows[0], (0, 0)); sheet.paste(rows[1], (0, rows[0].height))
sheet.save(os.path.join(here, 'spar-hit-before-after.webp'), quality=80)
print(sheet.size)
