"""Contact sheets for the owner: owner-preview-cast.webp (4 rows x front, 3/4, side) and owner-preview-film.webp."""
from pathlib import Path
from PIL import Image
d = Path(__file__).resolve().parent.parent
def sheet(rows, out, crop=None):
    ims = [[Image.open(d / n) for n in r] for r in rows]
    if crop: ims = [[i.crop(crop) for i in r] for r in ims]
    w, h = ims[0][0].size; g = 6
    s = Image.new('RGB', (len(rows[0]) * (w + g) - g, len(rows) * (h + g) - g), '#101418')
    for y, r in enumerate(ims):
        for x, i in enumerate(r): s.paste(i, (x * (w + g), y * (h + g)))
    s.save(d / out, quality=84); print(out, s.size)
sheet([[f'{w}-body-{v}-402.webp' for v in ('front', '34', 'side')] for w in ('bruno', 'brick', 'lion-street', 'rabbit-street')], 'owner-preview-cast.webp', (40, 60, 362, 640))
sheet([[f'film-{n}-402.webp' for n in r] for r in (('01-map-high', '02-map-dive', '04-bus-arriving', '06-stepping-off'), ('08-the-city', '10-walking-front', '11-crossing', '12-gym-door'))], 'owner-preview-film.webp')
