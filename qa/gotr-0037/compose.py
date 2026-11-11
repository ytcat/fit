"""GOTR-0037 evidence sheets: before/after pairs and the labelled muscle sheet, as small .webp.
Usage: python3 qa/gotr-0037/compose.py <png dir> <out dir>"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except OSError:
    FONT = SMALL = ImageFont.load_default()


def load(name, cell):
    path = os.path.join(src, name + '.png')
    if not os.path.exists(path):
        return None
    return Image.open(path).convert('RGB').resize((cell, cell), Image.LANCZOS)


def pairs(name, items, cell=300, title=''):
    """items: list of (key, caption). Row 1 before, row 2 after."""
    cols = len(items)
    sheet = Image.new('RGB', (cols * cell, 2 * cell + 26), (16, 18, 22))
    d = ImageDraw.Draw(sheet)
    d.text((6, 5), title, fill=(235, 235, 235), font=FONT)
    for c, (key, caption) in enumerate(items):
        for r, label in enumerate(['before', 'after']):
            im = load(f'{label}-{key}', cell)
            if im is None:
                continue
            x, y = c * cell, 26 + r * cell
            sheet.paste(im, (x, y))
            tag = f'{label.upper()} · {caption}'
            w = d.textlength(tag, font=SMALL)
            d.rectangle([x, y, x + w + 8, y + 17], fill=(0, 0, 0))
            d.text((x + 4, y + 2), tag, fill=(255, 255, 255) if label == 'after' else (190, 190, 190), font=SMALL)
    sheet.save(os.path.join(dst, name + '.webp'), quality=80, method=6)


for sp in ['lion', 'rabbit']:
    for pose in ['guard', 'jab', 'hook']:
        pairs(f'{sp}-{pose}-gym', [(f'gym-{sp}-{pose}-{v}', f'{pose} {v}') for v in ['front', 'q34', 'side', 'back']],
              title=f'{sp} · {pose} · gym · same camera and lights (top: before, bottom: after)')
    pairs(f'{sp}-closeups-gym', [(f'gym-{sp}-guard-torso', 'torso'), (f'gym-{sp}-hook-torso34', 'hook torso'),
                                 (f'gym-{sp}-guard-backclose', 'back'), (f'gym-{sp}-guard-arm', 'arm'),
                                 (f'gym-{sp}-jab-shoulder', 'jab shoulder'), (f'gym-{sp}-guard-legs', 'legs')],
          title=f'{sp} · close-ups (top: before, bottom: after)')
for pose in ['guard', 'jab']:
    pairs(f'arena-{pose}', [(f'arena-{r}-{pose}-{v}', f'{r} {v}') for r in ['lion', 'rabbit'] for v in ['q34', 'side', 'back']],
          cell=260, title=f'Championship arena · {pose} (top: before, bottom: after)')

# Labelled muscle sheet (atlas groups painted on the rest pose).
for sp in ['rabbit', 'lion']:
    views = [v for v in ['atlasfront', 'atlasback', 'atlas34'] if os.path.exists(os.path.join(src, f'labels-{sp}-{v}.png'))]
    if not views:
        continue
    cell = 900
    sheet = Image.new('RGB', (cell * len(views), cell + 30), (16, 18, 22))
    d = ImageDraw.Draw(sheet)
    d.text((8, 7), f'GOTR-0037 muscle definition atlas · {sp} · each colour = one muscle group (both sides)', fill=(240, 240, 240), font=FONT)
    for c, v in enumerate(views):
        im = Image.open(os.path.join(src, f'labels-{sp}-{v}.png')).convert('RGB')
        sheet.paste(im, (c * cell, 30))
        meta = json.load(open(os.path.join(src, f'labels-{sp}-{v}.json')))
        placed = []
        for name, pt in sorted(meta['anchors'].items(), key=lambda kv: kv[1]['y']):
            x, y = c * cell + pt['x'], 30 + pt['y']
            tw = d.textlength(name, font=SMALL)
            lx, ly = (x + 14, y - 8) if pt['x'] < cell * .62 else (x - 14 - tw, y - 8)
            for (px, py, pw) in placed:
                if abs(ly - py) < 17 and lx < px + pw + 6 and lx + tw > px - 6:
                    ly = py + 17
            placed.append((lx, ly, tw))
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(255, 255, 255), outline=(0, 0, 0))
            d.line([x, y, lx if lx > x else lx + tw, ly + 8], fill=(255, 255, 255))
            d.rectangle([lx - 2, ly, lx + tw + 3, ly + 16], fill=(0, 0, 0))
            d.text((lx, ly + 1), name, fill=(255, 255, 255), font=SMALL)
    sheet = sheet.resize((sheet.width * 2 // 3, sheet.height * 2 // 3), Image.LANCZOS)
    sheet.save(os.path.join(dst, f'muscle-atlas-{sp}.webp'), quality=82, method=6)
print('sheets written to', dst)
