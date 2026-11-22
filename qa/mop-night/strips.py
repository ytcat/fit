"""Compose the frame strips of qa/mop-night/body.cjs: one row per camera (phone framing, side, 3/4), one column per moment.
usage: python3 qa/mop-night/strips.py <body outdir> <dest dir>"""
import json, os, sys
from PIL import Image, ImageDraw
src, dest = sys.argv[1], sys.argv[2]
os.makedirs(dest, exist_ok=True)
data = json.load(open(os.path.join(src, 'body.json')))
shots = data['shots']
groups = {'sweep': [k for k in shots if k.startswith('sweep')], 'walk': [k for k in shots if k.startswith('walk') or k == 'left'],
          'rinse': [k for k in shots if k.startswith('rinse')] + [k for k in shots if k == 'stretch']}
crop = {'phone': None, 'side': (61, 95, 341, 655), '34': (61, 95, 341, 655)}
W, H = 200, 400
for name, keys in groups.items():
    if not keys: continue
    sheet = Image.new('RGB', (len(keys) * (W + 6) + 6, 3 * (H + 24) + 6), (18, 20, 26))
    d = ImageDraw.Draw(sheet)
    for ci, k in enumerate(keys):
        for ri, view in enumerate(['phone', 'side', '34']):
            im = Image.open(shots[k][view]).convert('RGB')
            if crop[view]: im = im.crop(crop[view])
            im.thumbnail((W, H)); x, y = 6 + ci * (W + 6), 6 + ri * (H + 24)
            sheet.paste(im, (x + (W - im.width) // 2, y + 18))
            d.text((x + 2, y + 2), f'{k} / {view}', fill=(230, 230, 230))
    out = os.path.join(dest, f'body-strip-{name}.webp'); sheet.save(out, quality=82); print(out, sheet.size)
