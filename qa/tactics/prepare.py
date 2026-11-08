"""Build review media from actual preview.cjs PNG captures (requires Pillow)."""
import json
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw

before, after = map(Path, sys.argv[1:3])
out = Path(__file__).parent / 'results'
out.mkdir(exist_ok=True)
old = json.loads((before / 'review.json').read_text())
new = json.loads((after / 'review.json').read_text())
assert not new['errors']
for kind in ['guard', 'paw', 'rope']:
    sheet = Image.new('RGB', (960, 400), '#171c22')
    draw = ImageDraw.Draw(sheet)
    for col, (label, source, report) in enumerate([
        ('Before', before, old), ('After', after, new)
    ]):
        draw.text((col * 480 + 12, 8), f"{label} {report['sourceSha'][:7]} / {kind}", fill='white')
        im = Image.open(source / f'{kind}.png')
        im.thumbnail((480, 365))
        sheet.paste(im, (col * 480 + (480 - im.width) // 2, 30))
    sheet.save(out / f'{kind}-comparison.webp', quality=90)
for mode in ['autonomous', 'footwork']:
    frames = []
    for sample in new['motion']:
        if sample['mode'] != mode:
            continue
        im = Image.open(after / sample['file']).convert('RGB')
        im.thumbnail((480, 360))
        frames.append(im)
    assert frames
    frames[0].save(out / f'{mode}.gif', save_all=True, append_images=frames[1:], duration=167, loop=0, optimize=True)
for kind in ['fight', 'heavy']:
    Image.open(after / f'{kind}.png').save(out / f'{kind}.webp', quality=88)
shutil.copy(after / 'review.json', out / 'browser.json')
shutil.copy(before / 'review.json', out / 'baseline-browser.json')
print('Prepared actual app media:', new['sourceSha'])
