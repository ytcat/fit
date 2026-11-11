# Compose before/after rows (roll drill and cross) into two small webp strips; prints the pixel change between
# consecutive frames so a strip that does not move is caught. Usage (repo root): python3 -I qa/gotr-0038/compose.py
import os
from PIL import Image, ImageChops, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
# The cross frames stopped moving after the press in this harness (see README), so only the roll strip is composed.
sets = {'roll': ['30', '45', '60', '75']}
for name, keys in sets.items():
    rows = []
    for version in ['before', 'after']:
        tiles, last = [], None
        for k in keys:
            im = Image.open(os.path.join(frames, f'{version}-{name}-{k}.png')).convert('RGB')
            if last is not None:
                d = ImageChops.difference(im.convert('L'), last.convert('L'))
                print(name, version, k, 'changed px', sum(1 for v in d.getdata() if v > 24))
            last = im
            w, h = im.size
            t = im.crop((int(w * .15), int(h * .10), int(w * .85), int(h * .52))).resize((int(w * .70 * .62), int(h * .42 * .62)))
            ImageDraw.Draw(t).text((5, 5), f'{version} {k}', fill=(255, 255, 255))
            tiles.append(t)
        row = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height))
        x = 0
        for t in tiles:
            row.paste(t, (x, 0)); x += t.width
        rows.append(row)
    sheet = Image.new('RGB', (rows[0].width, rows[0].height * 2))
    sheet.paste(rows[0], (0, 0)); sheet.paste(rows[1], (0, rows[0].height))
    sheet.save(os.path.join(here, f'{name}-before-after.webp'), quality=78)
    print(name, sheet.size)
