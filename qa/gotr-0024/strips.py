"""Compose before/after strips from qa/gotr-0024/frames (render.cjs output).
Usage: python3 qa/gotr-0024/strips.py"""
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
sets = {
    'cross': ['-2', '-1', '+0', '+2', '+5', '+12'],
    'hook': ['-2', '-1', '+0', '+2', '+5', '+12'],
    'onetwo': [str(i) for i in range(8)],
}
labels = {'cross': 'frame {} vs contact', 'hook': 'frame {} vs contact', 'onetwo': '{}'}
for name, keys in sets.items():
    rows = []
    for version in ['before', 'after']:
        tiles = []
        for i, k in enumerate(keys):
            p = os.path.join(frames, f'{version}-{name}-{k}.png')
            if not os.path.exists(p):
                continue
            im = Image.open(p).convert('RGB')
            w, h = im.size
            im = im.crop((int(w * .10), int(h * .16), int(w * .92), h)).resize((300, int(300 * (h * .84) / (w * .82))))
            d = ImageDraw.Draw(im)
            text = f'{version} ' + (f'{(i + 1) * 0.15:.2f}s' if name == 'onetwo' else f'{k}f')
            d.rectangle((0, 0, 150, 18), fill=(0, 0, 0))
            d.text((4, 3), text, fill=(255, 255, 255))
            tiles.append(im)
        if tiles:
            row = Image.new('RGB', (sum(t.width for t in tiles), max(t.height for t in tiles)))
            x = 0
            for t in tiles:
                row.paste(t, (x, 0)); x += t.width
            rows.append(row)
    if len(rows) == 2:
        out = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows) + 4), (255, 255, 255))
        out.paste(rows[0], (0, 0)); out.paste(rows[1], (0, rows[0].height + 4))
        out.save(os.path.join(here, f'{name}-before-after.webp'), quality=72)
        print('wrote', name, out.size)
