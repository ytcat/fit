# GOTR-0064 follow-up (shorter lion forehead): phone-size composites, top row v1.46, bottom row after.
# Columns: shadow front, 3/4, side, then fight front, 3/4, side.
# Usage: node qa/gotr-0064/head-shots.cjs forehead-before (QA_URL = v1.46 tree) ; node qa/gotr-0064/head-shots.cjs forehead-after ;
#        python3 -I qa/gotr-0064/compose-forehead.py   (QA_ONLY=phone is enough)
import os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = os.path.join(here, 'frames')
for framing in ['head', 'full']:
    rows = []
    for tag in ['before', 'after']:
        row = []
        for mode in ['shadow', 'fight']:
            for view in ['front', 'quarter', 'side']:
                im = Image.open(os.path.join(frames, 'forehead-' + tag, f'phone-{mode}-lion-{view}-{framing}.png')).convert('RGB')
                draw = ImageDraw.Draw(im)
                draw.rectangle((0, 0, 150, 16), fill=(0, 0, 0))
                draw.text((4, 3), f'{tag.upper()} {mode} {view}', fill=(255, 255, 255))
                row.append(im)
        rows.append(row)
    tw, th = rows[0][0].size
    sheet = Image.new('RGB', (tw * 6, th * 2))
    for r, row in enumerate(rows):
        for c, tile in enumerate(row):
            sheet.paste(tile, (c * tw, r * th))
    name = f'lion-forehead-phone-{framing}.webp'
    sheet.save(os.path.join(here, name), quality=82)
    print(name, sheet.size)
