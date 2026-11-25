"""Walk town look: side-by-side sheets per story place: the walk before | the walk after | the matching film frame.
usage: python3 qa/walk-town-look/sheet.py <before dir> <before tag> <after dir> <after tag> <size> <time> <out.webp> [spots]
Film frames come from the committed film captures (qa/render-realism, qa/films-11-12): the frame of the same place."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
bdir, btag, adir, atag, size, time, out = sys.argv[1:8]
spots = (sys.argv[8] if len(sys.argv) > 8 else 'gym,busstop,market,otto,docks').split(',')
RR = root / 'qa/render-realism'
# (sheet, frame box) of the film frame at the same place: render-realism sheets keep their AFTER row at y 766..1290, 402 px a frame
FILM = {
    'gym': (RR / 'dream_opening-high.webp', (804, 766, 1206, 1290), 'film: dream_opening (gym door)'),
    'busstop': (RR / 'dream_opening-high.webp', (0, 766, 402, 1290), 'film: dream_opening (bus stop)'),
    'market': (RR / 'dream_market_robbery-high.webp', (0, 766, 402, 1290), 'film: dream_market_robbery'),
    'otto': (RR / 'dream_otto_shop-high.webp', (0, 766, 402, 1290), 'film: dream_otto_shop'),
    'docks': (root / 'qa/films-11-12/docks-films.webp', (0, 24, 201, 286), 'film: dream_docks (inside)'),
}
H = 690
tiles = []
for s in spots:
    row = []
    for d, tag, label in ((bdir, btag, 'walk before (v1.94)'), (adir, atag, 'walk after')):
        p = Path(d) / f'{tag}-{size}-{time}-{s}.png'
        im = Image.open(p).convert('RGB') if p.exists() else Image.new('RGB', (402, H), (40, 40, 40))
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS); row.append((im, label))
    f = FILM.get(s)
    if f and f[0].exists():
        im = Image.open(f[0]).convert('RGB').crop(f[1]); im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS); row.append((im, f[2]))
    tiles.append((s, row))
W = max(sum(im.width for im, _ in row) + 8 * (len(row) - 1) for _, row in tiles)
sheet = Image.new('RGB', (W, len(tiles) * (H + 24)), (14, 16, 20)); g = ImageDraw.Draw(sheet)
for k, (s, row) in enumerate(tiles):
    x, y = 0, k * (H + 24)
    for im, label in row:
        sheet.paste(im, (x, y + 22)); g.text((x + 4, y + 5), f'{s} · {time} · {label}', fill=(240, 220, 150)); x += im.width + 8
sheet.save(out, quality=82)
print(out, sheet.size)
