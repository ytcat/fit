"""Contact sheets for the story-walk QA (GOTR-0120): one row per walk (start, near the ring, the step it started) per device and
language, and the joystick close-ups before/after. python3 qa/story-walk/sheet.py <shots dir> <out dir>"""
import sys, os, glob
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

def sheet(files, cols, name, scale=.5, labels=None):
    files = [f for f in files if f and os.path.exists(f)]
    if not files: return
    ims = [Image.open(f).convert('RGB') for f in files]
    w, h = int(ims[0].width * scale), int(ims[0].height * scale)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + 6) + 6, rows * (h + 22) + 6), (20, 24, 30))
    d = ImageDraw.Draw(S)
    for i, im in enumerate(ims):
        x, y = 6 + (i % cols) * (w + 6), 6 + (i // cols) * (h + 22)
        S.paste(im.resize((w, h)), (x, y + 16))
        d.text((x, y), labels[i] if labels else os.path.basename(files[i])[:-4], fill=(230, 230, 230))
    S.save(os.path.join(out, name), quality=82)
    print(name, S.size)

for dev in ('phone', 'pc'):
    for lang in ('en', 'he', 'ru'):
        tag = f'{dev}-{lang}'
        files, labels = [], []
        for n in range(1, 7):
            for k in ('start', 'near', 'arrived'):
                f = os.path.join(src, f'{tag}-walk{n}-{k}.png')
                if os.path.exists(f): files.append(f); labels.append(f'walk {n} {k}')
        sheet(files, 3, f'sheet-{tag}.webp', .5 if dev == 'phone' else .3, labels)
        extra = [os.path.join(src, f'{tag}-{x}.png') for x in ('entry-topbar', 'walk2-resumed', 'walk3-quest-card', 'walk4-otto-buy', 'entry-after', 'entry-walk')]
        sheet(extra, 3, f'sheet-{tag}-entry-resume.webp', .5 if dev == 'phone' else .3)

# joystick close-ups: the lower-left corner, before (v1.94) and after
def crop(f, box):
    return Image.open(f).convert('RGB').crop(box) if os.path.exists(f) else None
pairs = [('before/stick-idle.png', 'idle (v1.94)'), ('before/stick-held.png', 'held (v1.94)')]
after = [(os.path.join(src, 'phone-en-walk1-start.png'), 'idle (new)'), (os.path.join(src, 'phone-en-walk1-touch.png'), 'held (new)')]
ims, labels = [], []
here = os.path.dirname(os.path.abspath(__file__))
for f, l in pairs:
    p = os.path.join(here, f)
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); ims.append(im.crop((0, max(0, im.height - 230), 220, im.height))); labels.append(l)
for f, l in after:
    if os.path.exists(f):
        im = Image.open(f).convert('RGB'); ims.append(im.crop((0, im.height - 230, 220, im.height))); labels.append(l)
if ims:
    S = Image.new('RGB', (len(ims) * 226 + 6, 260), (20, 24, 30)); d = ImageDraw.Draw(S)
    for i, im in enumerate(ims): S.paste(im, (6 + i * 226, 24)); d.text((6 + i * 226, 6), labels[i], fill=(230, 230, 230))
    S.save(os.path.join(out, 'joystick-before-after.webp'), quality=88); print('joystick', S.size)
