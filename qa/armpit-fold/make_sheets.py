"""Before/after close-up sheets of qa/armpit-fold (phone frames 402x690 from qa/armpit-fold/batch.cjs, centre crop).
python3 qa/armpit-fold/make_sheets.py <before frames> <after frames> <out dir> [seq_before seq_after]
Per character: for each pose, two rows (before, after) x five views (front, side, back, below, 3/4) of the shoulder that
moves most in that pose. With sequence frames (qa/armpit-fold/sequence.cjs): one sheet per motion, rows = view x (before,
after), columns = the 9 steps."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
except OSError:
    FONT = SMALL = ImageFont.load_default()
T = 200
VIEWS = ['front', 'side', 'back', 'below', 'q34']
# character -> [(pose, shoulder, label)]
SETS = {
    'lion-kit': [('bind', 'R', 'rest'), ('arms_up', 'L', 'celebration, arms up'), ('winner', 'R', "referee raises the winner's arm"), ('uppercut', 'L', 'lead uppercut'), ('rear_uppercut', 'R', 'rear uppercut'), ('guard', 'R', 'guard'), ('walkA', 'R', 'walk'), ('mop', 'R', 'mopping')],
    'rabbit-kit': [('bind', 'R', 'rest'), ('arms_up', 'L', 'celebration, arms up'), ('winner', 'R', "referee raises the winner's arm"), ('uppercut', 'L', 'lead uppercut'), ('guard', 'R', 'guard')],
    'lion-street': [('bind', 'R', 'rest'), ('guard', 'R', 'guard'), ('walkA', 'R', 'walk'), ('jog', 'R', 'jog')],
    'rabbit-street': [('bind', 'R', 'rest'), ('guard', 'R', 'guard'), ('walkA', 'R', 'walk'), ('jog', 'R', 'jog')],
    'lion-wraps': [('arms_up', 'L', 'celebration, arms up'), ('uppercut', 'L', 'lead uppercut')],
    'bruno': [('idle', 'R', 'idle'), ('talk', 'R', 'talk'), ('walkA', 'R', 'walk'), ('raise', 'L', 'raises an arm'), ('count', 'R', 'referee count')],
    'brick': [('arms_up', 'L', 'celebration, arms up'), ('uppercut', 'L', 'lead uppercut'), ('winner', 'R', "winner's arm raised")],
    'fang-jacket': [('idle', 'R', 'idle'), ('walkA', 'R', 'walk'), ('arms_up', 'L', 'arms up')],
    'fang-fight': [('guard', 'R', 'guard'), ('uppercut', 'L', 'lead uppercut'), ('winner', 'R', "winner's arm raised")],
    'hazel': [('talk', 'R', 'talk'), ('walkA', 'R', 'walk')],
    'otto': [('talk', 'R', 'talk'), ('walkA', 'R', 'walk')],
    'rourke': [('arms_up', 'L', 'celebration, arms up'), ('uppercut', 'L', 'lead uppercut'), ('winner', 'R', "winner's arm raised"), ('walkA', 'R', 'walk')],
}

def tile(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    top = (h - w) // 2
    return im.crop((0, top, w, top + w)).resize((T, T), Image.LANCZOS)

def build(out, title, rows, cols, cells, left=150):
    head = 26
    sheet = Image.new('RGB', (left + cols * T, head + rows * T), (18, 18, 22))
    d = ImageDraw.Draw(sheet)
    d.text((6, 6), title, fill=(255, 220, 120), font=FONT)
    for r, c, p, label, rowlabel in cells:
        x, y = left + c * T, head + r * T
        if p and os.path.exists(p):
            sheet.paste(tile(p), (x, y))
        else:
            d.text((x + 8, y + T // 2), 'missing', fill=(200, 80, 80), font=SMALL)
        d.rectangle([x, y + T - 15, x + T, y + T], fill=(0, 0, 0))
        d.text((x + 4, y + T - 14), label, fill=(255, 255, 255), font=SMALL)
        if c == 0:
            for k, line in enumerate(rowlabel.split('\n')):
                d.text((6, y + 8 + 15 * k), line, fill=(230, 230, 230) if 'after' not in line else (140, 230, 140), font=SMALL)
    sheet.save(out, quality=80)

def characters(before, after, out):
    for v, poses in SETS.items():
        cells = []
        for i, (pose, side, label) in enumerate(poses):
            for j, (src, tag) in enumerate([(before, 'before'), (after, 'after')]):
                r = i * 2 + j
                for c, view in enumerate(VIEWS):
                    cells.append((r, c, os.path.join(src, v, f'{pose}-shoulder{side}-{view}.png'), view, f'{label}\nshoulder {side}\n{tag}'))
        build(os.path.join(out, f'{v}-before-after.webp'), f'{v}: shoulder / armpit close-ups, before (old build) and after (agent/armpit-fold), phone 402x690', len(poses) * 2, len(VIEWS), cells)

def sequences(before, after, out, variant='lion-kit'):
    for key, side, label in [('raise', 'R', "the referee raises the winner's arm (raise 0 -> 1)"), ('upper', 'L', 'lead uppercut (phase 0 -> 1)')]:
        cells = []
        views = ['front', 'side', 'below', 'q34']
        for i, view in enumerate(views):
            for j, (src, tag) in enumerate([(before, 'before'), (after, 'after')]):
                for k in range(9):
                    cells.append((i * 2 + j, k, os.path.join(src, variant, f'{key}_{k}-shoulder{side}-{view}.png'), f'{k}/8', f'{view}\n{tag}'))
        build(os.path.join(out, f'sequence-{key}-{variant}.webp'), f'{variant}: {label}, shoulder {side}, before / after', len(views) * 2, 9, cells, left=90)

if __name__ == '__main__':
    b, a, out = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    characters(b, a, out)
    if len(sys.argv) > 5:
        sequences(sys.argv[4], sys.argv[5], out)
