"""Contact sheets for the owner (402x690 frames): cast bodies and heads next to the lion at the same scale, street clothes, film.
Usage: sheet.py [cast] [heads] [street] [film]   (no argument = all that have their frames)"""
import sys
from pathlib import Path
from PIL import Image
d = Path(__file__).resolve().parent.parent
def sheet(rows, out, crop=None):
    if not all((d / n).is_file() for r in rows for n in r): print('skip', out); return
    ims = [[Image.open(d / n) for n in r] for r in rows]
    if crop: ims = [[i.crop(crop) for i in r] for r in ims]
    w, h = ims[0][0].size; g = 6
    s = Image.new('RGB', (len(rows[0]) * (w + g) - g, len(rows) * (h + g) - g), '#101418')
    for y, r in enumerate(ims):
        for x, i in enumerate(r): s.paste(i, (x * (w + g), y * (h + g)))
    s.save(d / out, quality=84); print(out, s.size)
want = sys.argv[1:] or ['cast', 'heads', 'street', 'film']
V = ('front', '34', 'side'); WHO = ('lion', 'rabbit', 'bruno', 'brick')
if 'cast' in want: sheet([[f'{w}-body-{v}-402.webp' for v in V] for w in WHO], 'owner-preview-cast.webp', (40, 60, 362, 640))
if 'heads' in want: sheet([[f'{w}-head-{v}-402.webp' for v in V] for w in WHO], 'owner-preview-heads.webp', (0, 120, 402, 560))
if 'street' in want: sheet([[f'{w}-street-body-{v}-402.webp' for v in V] for w in ('lion', 'rabbit')], 'owner-preview-street.webp', (40, 60, 362, 640))
if 'film' in want: sheet([[f'film-{n}-402.webp' for n in r] for r in (('01-map-high', '02-map-dive', '04-bus-arriving', '06-stepping-off'), ('08-the-city', '10-walking-front', '11-crossing', '12-gym-door'))], 'owner-preview-film.webp')
