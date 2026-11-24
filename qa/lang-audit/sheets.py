# Evidence for the languages audit: copies the sweep screenshots (402x690 PNG) to qa/lang-audit/{before,after}/ as WebP
# and builds one before/after sheet per language. usage: python3 qa/lang-audit/sheets.py <before-dir> <after-dir> [film-before-dir]
import os, sys
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
before, after = sys.argv[1], sys.argv[2]
extra = sys.argv[3] if len(sys.argv) > 3 else None
SCREENS = ['welcome', 'home', 'map-card', 'modes', 'shop', 'settings', 'story-card', 'film', 'market-film', 'training-calls', 'story-fight', 'super-punch', 'fight-result', 'bag-trial', 'mop', 'mop-result']
def copy(src_dir, dst, name):
    p = os.path.join(src_dir, name)
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGB'); os.makedirs(dst, exist_ok=True); im.save(os.path.join(dst, name.replace('.png', '.webp')), 'WEBP', quality=72); return im
for lang in ['en', 'he', 'ru']:
    rows = []
    for s in SCREENS:
        name = f'{lang}-{s}.png'
        b = (extra and copy(extra, os.path.join(here, 'before'), name)) or copy(before, os.path.join(here, 'before'), name)  # the film run first (dream_arrival did not exist)
        a = copy(after, os.path.join(here, 'after'), name)
        if a is not None: rows.append((s, b, a))
    # sheet: pairs (before | after) in a grid of 5 pairs per row, half size
    W, H = 201, 345; cols = 5; n = len(rows); r = (n + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (2 * W + 12), r * (H + 22)), (16, 18, 22)); d = ImageDraw.Draw(sheet)
    for i, (s, b, a) in enumerate(rows):
        x, y = (i % cols) * (2 * W + 12), (i // cols) * (H + 22)
        d.text((x + 4, y + 4), f'{s}: before | after', fill=(230, 230, 230))
        if b is not None: sheet.paste(b.resize((W, H)), (x, y + 20))
        sheet.paste(a.resize((W, H)), (x + W + 2, y + 20))
    sheet.save(os.path.join(here, f'sheet-{lang}-before-after.webp'), 'WEBP', quality=70); print(lang, n, 'screens')
