# Compose before/after rows of the mitt frames (per move) into small webp strips.
# Usage (repo root, after strip.cjs): python3 -I qa/gotr-0032/compose.py
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
offsets = ['-4', '+0', '+2', '+4', '+8', '+16', '+30']
for move in ['cross', 'hook']:
    rows = []
    for version in ['before', 'after']:
        tiles = []
        for k in offsets:
            im = Image.open(os.path.join(frames, f'{version}-{move}-{k}.png')).convert('RGB')
            w, h = im.size
            im = im.crop((0, int(h * .12), w, int(h * .72))).resize((w // 2, int(h * .60) // 2))
            ImageDraw.Draw(im).text((6, 6), f'{version} {k}t', fill=(255, 255, 255))
            tiles.append(im)
        row = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height))
        x = 0
        for t in tiles:
            row.paste(t, (x, 0)); x += t.width
        rows.append(row)
    sheet = Image.new('RGB', (rows[0].width, rows[0].height * 2))
    sheet.paste(rows[0], (0, 0)); sheet.paste(rows[1], (0, rows[0].height))
    sheet.save(os.path.join(here, f'{move}-before-after.webp'), quality=80)
    print(move, sheet.size)
