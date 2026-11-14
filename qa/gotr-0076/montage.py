import sys
from PIL import Image, ImageDraw, ImageFont
# montage.py out.webp label1:img1 label2:img2 ...  (2 rows x 4)
out = sys.argv[1]; items = [a.split(':', 1) for a in sys.argv[2:]]
W, H = 402, 690; cols = 4; rows = (len(items) + cols - 1) // cols; pad = 6; cap = 26
sheet = Image.new('RGB', (cols * W + (cols + 1) * pad, rows * (H + cap) + (rows + 1) * pad), (18, 20, 26))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
except Exception: font = ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, (label, path) in enumerate(items):
    im = Image.open(path).convert('RGB').resize((W, H)); x = pad + (i % cols) * (W + pad); y = pad + (i // cols) * (H + cap + pad)
    d.text((x + 4, y + 3), f'{i+1}. {label}', fill=(240, 240, 240), font=font); sheet.paste(im, (x, y + cap))
sheet.save(out, 'WEBP', quality=72, method=6); print(out, sheet.size)
