# GOTR-0097: side-view walk strips with the measured foot contacts and pelvis height written under each frame
# (from the film tool's JSON: pelvis = world y of the hips joint, feet = DreamPose.feet ball points, down = ball < 5.5 cm).
#   python3 qa/gotr-0097/tools/annotate.py out.webp before.webp before.json after.webp after.json
import json, sys
from PIL import Image, ImageDraw
out = sys.argv[1]; pairs = [(sys.argv[i], sys.argv[i + 1]) for i in range(2, len(sys.argv), 2)]
rows = []
for img, js in pairs:
    im = Image.open(img).convert('RGB'); d = json.load(open(js)); fr = d['frames']; n = len(fr); w = im.width // n
    band = 92; row = Image.new('RGB', (im.width, im.height + band), (18, 20, 24)); row.paste(im, (0, 0)); g = ImageDraw.Draw(row)
    ps = [f['pelvis'] - (f['fighter'][1] if f['fighter'] else 0) for f in fr]; lo, hi = min(ps), max(ps)
    g.text((6, im.height + 4), '%s   pelvis above the ground: %.3f-%.3f m (bob %.1f cm over these frames)' % (d['name'], lo, hi, (hi - lo) * 100), fill=(240, 240, 240))
    pts = []
    for i, f in enumerate(fr):
        x = i * w; base = f['fighter'][1] if f['fighter'] else 0
        down = ['L' if f['feet'][0][1] - base < .055 else '', 'R' if f['feet'][1][1] - base < .055 else '']
        lab = ('down: ' + '+'.join(s for s in down if s)) if any(down) else 'AIRBORNE'
        g.text((x + 6, im.height + 22), 't %.1f  %s' % (f['t'], lab), fill=(255, 120, 120) if lab == 'AIRBORNE' else (180, 230, 180))
        g.text((x + 6, im.height + 38), 'pelvis %.3f m' % ps[i], fill=(200, 200, 255))
        pts.append((x + w // 2, im.height + band - 8 - (ps[i] - .90) / .12 * 30))
    g.line([(0, im.height + band - 8 - (.90 - .90) / .12 * 30), (im.width, im.height + band - 8)], fill=(60, 60, 70))
    g.line(pts, fill=(140, 140, 255), width=3)
    for p in pts: g.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], fill=(140, 140, 255))
    rows.append(row)
W = max(r.width for r in rows); H = sum(r.height for r in rows); sheet = Image.new('RGB', (W, H), (18, 20, 24)); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height
sheet.save(out, quality=84); print('wrote', out)
