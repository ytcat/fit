# One webp per species: top row before (front, side), bottom row after. Usage: python3 -I qa/gotr-0051/compose.py
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
for species in ['lion', 'rabbit']:
    tiles = {}
    for version in ['before', 'after']:
        for view in ['front', 'side']:
            im = Image.open(os.path.join(frames, f'{version}-{species}-{view}.png')).convert('RGB')
            w, h = im.size
            im = im.resize((w // 2, h // 2))
            ImageDraw.Draw(im).text((6, 6), f'{version} {view}', fill=(255, 255, 255))
            tiles[version, view] = im
    tw, th = tiles['before', 'front'].size
    sheet = Image.new('RGB', (tw * 2, th * 2))
    for r, version in enumerate(['before', 'after']):
        for c, view in enumerate(['front', 'side']):
            sheet.paste(tiles[version, view], (c * tw, r * th))
    sheet.save(os.path.join(here, f'stance-{species}-before-after.webp'), quality=80)
    print(species, sheet.size)
