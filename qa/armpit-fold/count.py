"""Counts the magenta (visible back-face) pixels of studio frames rendered with qa/armpit-fold/backface.js.
python3 qa/armpit-fold/count.py <frames dir> [<out.json>]  -> per frame count; prints the non-zero frames and the total."""
import sys, os, json
from PIL import Image

def count(path):
    """Magenta pixels that belong to a visible patch or line: the pixel and at least 2 of its 8 neighbours are magenta.
    Lone pixels are multisampling at silhouettes (the far side's back faces peeking through one sample), not a defect."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    m = [[1 if (lambda p: p[0] > 235 and p[1] < 30 and p[2] > 235)(px[x, y]) else 0 for x in range(w)] for y in range(h)]
    n = 0
    for y in range(h):
        row = m[y]
        for x in range(w):
            if not row[x]:
                continue
            k = 0
            for dy in (-1, 0, 1):
                yy = y + dy
                if 0 <= yy < h:
                    r2 = m[yy]
                    for dx in (-1, 0, 1):
                        xx = x + dx
                        if (dx or dy) and 0 <= xx < w and r2[xx]:
                            k += 1
            if k >= 2:
                n += 1
    return n

if __name__ == '__main__':
    src = sys.argv[1]
    out = {}
    for root, _, files in os.walk(src):
        for f in sorted(files):
            if f.endswith('.png'):
                p = os.path.join(root, f)
                out[os.path.relpath(p, src)] = count(p)
    bad = {k: v for k, v in out.items() if v}
    for k, v in sorted(bad.items(), key=lambda kv: -kv[1]):
        print(f'{v:6d}  {k}')
    print('frames', len(out), 'with magenta', len(bad), 'total px', sum(out.values()))
    if len(sys.argv) > 2:
        json.dump(out, open(sys.argv[2], 'w'), indent=0, sort_keys=True)
