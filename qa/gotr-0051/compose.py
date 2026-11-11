# One webp per species: top row heavy bag (front, side), bottom row fight. Usage: python3 -I qa/gotr-0051/compose.py
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
for species in ['lion', 'rabbit']:
    tiles = []
    for mode in ['bag', 'fight']:
        for view in ['front', 'side']:
            im = Image.open(os.path.join(frames, f'{mode}-{species}-{view}.png')).convert('RGB')
            w, h = im.size
            im = im.resize((w // 2, h // 2))
            ImageDraw.Draw(im).text((6, 6), f'{mode} {view}', fill=(255, 255, 255))
            tiles.append(im)
    tw, th = tiles[0].size
    sheet = Image.new('RGB', (tw * 2, th * 2))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 2) * tw, (i // 2) * th))
    sheet.save(os.path.join(here, f'stance-{species}-shipped.webp'), quality=80)
    print(species, sheet.size)
