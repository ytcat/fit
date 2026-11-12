# GOTR-0064 composites: one webp per species, viewport and framing (head close-up / full figure).
# Top row before, bottom row after; columns: shadow front, 3/4, side, then fight front, 3/4, side.
# Usage: python3 -I qa/gotr-0064/compose.py   (after head-shots.cjs before|after wrote qa/gotr-0064/frames/)
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
for species in ['lion', 'rabbit']:
    for viewport, width in [('phone', 300), ('desktop', 440)]:
        for framing in ['head', 'full']:
            rows = []
            for tag in ['before', 'after']:
                row = []
                for mode in ['shadow', 'fight']:
                    for view in ['front', 'quarter', 'side']:
                        im = Image.open(os.path.join(frames, tag, f'{viewport}-{mode}-{species}-{view}-{framing}.png')).convert('RGB')
                        w, h = im.size
                        im = im.resize((width, round(h * width / w)), Image.LANCZOS)
                        draw = ImageDraw.Draw(im)
                        draw.rectangle((0, 0, 128, 16), fill=(0, 0, 0))
                        draw.text((4, 3), f'{tag.upper()} {mode} {view}', fill=(255, 255, 255))
                        row.append(im)
                rows.append(row)
            tw, th = rows[0][0].size
            sheet = Image.new('RGB', (tw * 6, th * 2))
            for r, row in enumerate(rows):
                for c, tile in enumerate(row):
                    sheet.paste(tile, (c * tw, r * th))
            name = f'{species}-{viewport}-{framing}.webp'
            sheet.save(os.path.join(here, name), quality=82)
            print(name, sheet.size)
