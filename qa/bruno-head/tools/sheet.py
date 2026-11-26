"""Labelled contact sheet: sheet.py out.webp "title" <w> <h> <cols> file1 "label1" file2 "label2" ...  (each frame resized to w x h)."""
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, w, h, cols, rest = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6:]
pairs = list(zip(rest[0::2], rest[1::2]))
head = 26; rows = (len(pairs) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, head + h * rows), (18, 18, 22)); d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
except OSError:
    font = small = ImageFont.load_default()
d.text((6, 6), title, fill=(255, 220, 120), font=font)
for i, (f, label) in enumerate(pairs):
    x, y = (i % cols) * w, head + (i // cols) * h
    sheet.paste(Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS), (x, y))
    d.rectangle([x, y + h - 16, x + w, y + h], fill=(0, 0, 0)); d.text((x + 4, y + h - 15), label, fill=(255, 255, 255), font=small)
sheet.save(out, quality=84)
