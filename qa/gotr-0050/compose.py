"""GOTR-0050 before/after sheet per species (guard: front, side, back, torso), top v1.24, bottom after.
Usage: python3 qa/gotr-0050/compose.py <png dir> <out dir>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
src, dst = sys.argv[1], sys.argv[2]
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except OSError:
    FONT = ImageFont.load_default()
cell, views = 320, ['front', 'side', 'back', 'torso']
for sp in ['lion', 'rabbit']:
    sheet = Image.new('RGB', (cell * len(views), 2 * cell + 24), (16, 18, 22))
    d = ImageDraw.Draw(sheet)
    d.text((6, 4), f'GOTR-0050 {sp} · guard · same camera/lights · top: v1.24 (before) · bottom: after', fill=(235, 235, 235), font=FONT)
    for c, v in enumerate(views):
        for r, label in enumerate(['before', 'after']):
            p = os.path.join(src, f'{label}-{sp}-{v}.png')
            if not os.path.exists(p):
                continue
            x, y = c * cell, 24 + r * cell
            sheet.paste(Image.open(p).convert('RGB').resize((cell, cell), Image.LANCZOS), (x, y))
            tag = f'{label.upper()} · {v}'
            d.rectangle([x, y, x + d.textlength(tag, font=FONT) + 8, y + 18], fill=(0, 0, 0))
            d.text((x + 4, y + 2), tag, fill=(255, 255, 255), font=FONT)
    sheet.save(os.path.join(dst, f'{sp}-guard-before-after.webp'), quality=80, method=6)
print('written')
