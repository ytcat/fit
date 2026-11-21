"""webp.py <outDir> <png>... : saves each PNG as <outDir>/<name>.webp (quality 88), plus a contact sheet when --sheet NAME COLS is given first."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
args = sys.argv[1:]; out = Path(args.pop(0)); out.mkdir(parents=True, exist_ok=True)
sheet = None
if args and args[0] == '--sheet': sheet = (args[1], int(args[2])); args = args[3:]
ims = []
for a in args:
    im = Image.open(a).convert('RGB'); ims.append((Path(a).stem, im)); im.save(out / (Path(a).stem + '.webp'), quality=88); print(out / (Path(a).stem + '.webp'), im.size)
if sheet:
    name, cols = sheet; w, h = ims[0][1].size; g = 6; rows = (len(ims) + cols - 1) // cols
    s = Image.new('RGB', (cols * (w + g) - g, rows * (h + g) - g), '#101418'); d = ImageDraw.Draw(s)
    for k, (n, im) in enumerate(ims):
        x, y = (k % cols) * (w + g), (k // cols) * (h + g); s.paste(im, (x, y)); d.text((x + 6, y + 4), n, fill='#ffffff')
    s.save(out / (name + '.webp'), quality=84); print(out / (name + '.webp'), s.size)
