"""Seam close-up sheets for qa/avatar-joins.
sheet.py grid <out.webp> <title> <frames dir> <pose> <join,join,...> [views]  -> rows = joins, columns = views (centre crop)
sheet.py pair <out.webp> <title> <before dir> <after dir> <name,name,...>     -> rows = frames, before | after
sheet.py tiles <out.webp> <title> <cols> <file> <label> <file> <label> ...    -> free list of frames
Frames are 402x690 phone renders; tiles are the centre 402x402 square scaled to 230 px (full-body frames keep the whole frame)."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
except OSError:
    FONT = SMALL = ImageFont.load_default()
T = 230
VIEWS = ['front', 'side', 'back', 'below', 'q34']

def tile(path, full=False):
    im = Image.open(path).convert('RGB')
    if full:
        return im.resize((int(T * im.width / im.height), T), Image.LANCZOS)
    w, h = im.size
    top = (h - w) // 2
    return im.crop((0, top, w, top + w)).resize((T, T), Image.LANCZOS)

def build(out, title, rows, cols, cells):
    """cells: list of (row, col, path or None, label)"""
    head = 26
    sheet = Image.new('RGB', (cols * T, head + rows * T), (18, 18, 22))
    d = ImageDraw.Draw(sheet)
    d.text((6, 6), title, fill=(255, 220, 120), font=FONT)
    for r, c, p, label in cells:
        x, y = c * T, head + r * T
        if p and os.path.exists(p):
            im = tile(p, full='-full-' in os.path.basename(p))
            sheet.paste(im, (x + (T - im.width) // 2, y))
        else:
            d.text((x + 8, y + T // 2), 'missing', fill=(200, 80, 80), font=SMALL)
        d.rectangle([x, y + T - 15, x + T, y + T], fill=(0, 0, 0))
        d.text((x + 4, y + T - 14), label, fill=(255, 255, 255), font=SMALL)
    sheet.save(out, quality=80)

mode = sys.argv[1]
if mode == 'grid':
    out, title, src, pose, joins = sys.argv[2:7]
    views = sys.argv[7].split(',') if len(sys.argv) > 7 else VIEWS
    joins = joins.split(',')
    cells = [(r, c, os.path.join(src, f'{pose}-{j}-{v}.png'), f'{pose} {j} {v}') for r, j in enumerate(joins) for c, v in enumerate(views)]
    build(out, title, len(joins), len(views), cells)
elif mode == 'pair':
    out, title, a, b, names = sys.argv[2:7]
    names = names.split(',')
    cells = []
    for r, n in enumerate(names):
        cells.append((r, 0, os.path.join(a, n + '.png'), 'before ' + n))
        cells.append((r, 1, os.path.join(b, n + '.png'), 'after ' + n))
    build(out, title, len(names), 2, cells)
elif mode == 'tiles':
    out, title, cols = sys.argv[2], sys.argv[3], int(sys.argv[4])
    rest = sys.argv[5:]
    pairs = list(zip(rest[0::2], rest[1::2]))
    cells = [(i // cols, i % cols, p, l) for i, (p, l) in enumerate(pairs)]
    build(out, title, (len(pairs) + cols - 1) // cols, cols, cells)
