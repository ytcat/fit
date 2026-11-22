# Compose before/after frame strips from strips.cjs output: one sheet per station, one row pair (before, after) per punch,
# frames around contact (ticks from the press at 120 Hz; "C" marks the frame at or right after contact).
# Also prints the changed-pixel count between consecutive frames, so a strip that does not move is caught.
# Usage (repo root): python3 -I qa/gotr-0032-v2/compose.py [framesdir]
import os, sys, json
from PIL import Image, ImageChops, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
frames = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'frames')
res = json.load(open(os.path.join(here, 'strips.json')))['results']
moves = ['jab', 'cross', 'hook', 'rear_hook', 'uppercut', 'rear_uppercut']
for mode in ['pads', 'heavy']:
    rows = []
    for move in moves:
        for version in ['before', 'after']:
            shots = [r for r in res if r.get('mode') == mode and r.get('move') == move and r['version'] == version and 'file' in r]
            if not shots:
                continue
            contact = next((r['contactTick'] for r in res if r.get('mode') == mode and r.get('move') == move and r['version'] == version and 'contactTick' in r), None)
            # 7 frames: from 4 frames (12 ticks) before contact to 2 frames after, every 3 ticks
            c = contact if contact is not None else 27
            ticks = [r['tick'] for r in shots]
            want = ticks
            tiles, last, moved = [], None, []
            for r in shots:
                if r['tick'] not in want:
                    continue
                im = Image.open(os.path.join(frames, r['file'])).convert('RGB')
                if last is not None:
                    d = ImageChops.difference(im.convert('L'), last.convert('L'))
                    moved.append(sum(1 for v in d.getdata() if v > 24))
                last = im
                w, h = im.size
                t = im.crop((int(w * .04), int(h * .10), int(w * .96), int(h * .70))).resize((int(w * .92 * .45), int(h * .60 * .45)))
                mark = ' C' if contact is not None and r['tick'] >= contact and r['tick'] - 3 < contact else ''
                ImageDraw.Draw(t).rectangle((0, 0, t.width, 14), fill=(0, 0, 0))
                ImageDraw.Draw(t).text((3, 1), f"{version} {move} t{r['tick'] - c:+d}{mark}", fill=(255, 255, 0) if mark else (255, 255, 255))
                tiles.append(t)
            print(mode, move, version, 'contact tick', contact, 'changed px', moved)
            row = Image.new('RGB', (max(1, sum(t.width for t in tiles)), tiles[0].height if tiles else 1))
            x = 0
            for t in tiles:
                row.paste(t, (x, 0)); x += t.width
            rows.append(row)
    if not rows:
        continue
    W = max(r.width for r in rows)
    sheet = Image.new('RGB', (W, sum(r.height for r in rows)))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y)); y += r.height
    sheet.save(os.path.join(here, f'{mode}-before-after.webp'), quality=72)
    print(mode, sheet.size)
