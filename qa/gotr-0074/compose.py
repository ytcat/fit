# Compose the GOTR-0074 renders: one sheet per species. Row 1: shadow training front, 3/4, side, jab.
# Row 2: fight front, 3/4, side, cross (shadow). Usage: python3 -I qa/gotr-0074/compose.py
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
rows = [[('shadow-front', 'shadow: front'), ('shadow-quarter', 'shadow: 3/4'), ('shadow-side', 'shadow: left side'), ('shadow-jab', 'jab (left hand)')],
        [('fight-front', 'fight: front'), ('fight-quarter', 'fight: 3/4'), ('fight-side', 'fight: left side'), ('shadow-cross', 'cross (right hand)')]]
for species in ['lion', 'rabbit']:
    tiles = []
    for row in rows:
        for name, label in row:
            im = Image.open(os.path.join(frames, f'{species}-{name}.png')).convert('RGB')
            w, h = im.size
            im = im.crop((0, int(h * .05), w, int(h * .95))).resize((w // 2, int(h * .9) // 2))
            ImageDraw.Draw(im).text((6, 6), label, fill=(255, 255, 255))
            tiles.append(im)
    tw, th = tiles[0].size
    sheet = Image.new('RGB', (tw * 4, th * 2))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 4) * tw, (i // 4) * th))
    sheet.save(os.path.join(here, f'stance-{species}.webp'), quality=82)
    print(species, sheet.size)
im = Image.open(os.path.join(frames, 'fight-pair.png')).convert('RGB')
im.resize((im.width * 2 // 3, im.height * 2 // 3)).save(os.path.join(here, 'fight-pair.webp'), quality=82)
