"""Assemble labeled actual app captures. Does not synthesize or repaint art."""
import json, sys, shutil, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
src=Path(sys.argv[1]); dest=Path(__file__).parent; images=dest/'images'; results=dest/'results'
images.mkdir(exist_ok=True); results.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)

def tile(file,label,w=360,h=300,crop=False):
    im=Image.open(file).convert('RGB')
    if crop: im=im.crop((im.width*.20,im.height*.04,im.width*.80,im.height*.64))
    im.thumbnail((w,h-28),Image.Resampling.LANCZOS)
    out=Image.new('RGB',(w,h),(20,25,31));out.paste(im,((w-im.width)//2,28+(h-28-im.height)//2));ImageDraw.Draw(out).text((9,6),label,font=font,fill='#e4c180');return out

def sheet(entries,cols,name,w=360,h=300,crop=False):
    out=Image.new('RGB',(w*cols,h*((len(entries)+cols-1)//cols)),(20,25,31))
    for i,(file,label) in enumerate(entries):out.paste(tile(file,label,w,h,crop),((i%cols)*w,(i//cols)*h))
    out.save(images/name,quality=87,optimize=True)

sheet([(src/'r88-visual-final'/f'{species}-{style}.png',f'{species.title()} / {style}') for species in ['lion','rabbit'] for style in ['high','body','left','right','parry']],5,'defence-grid.jpg',270,270,True)
phases=[3,8,12,17,25,34]
sheet([(src/folder/f'upper-{i:02}.png',f'{label} / t={i/30:.2f}s') for folder,label in [('r88-baseline-selected','R87 published'),('r88-motion-final','R88')] for i in phases],6,'uppercut-comparison.jpg',230,250,True)
frames=[]
for i in [0,7,13,17,21,27,33,39]:
    im=Image.new('RGB',(800,350),(20,25,31))
    for j,(folder,label) in enumerate([('r88-baseline-selected','R87 published'),('r88-motion-final','R88')]):im.paste(tile(src/folder/f'ring-{i:02}.png',label+' / sampled pose',400,350),(400*j,0))
    frames.append(im)
frames[0].save(images/'walk-comparison.gif',save_all=True,append_images=frames[1:],duration=[700,600,400,400,600,600,600,500],loop=0,optimize=True)
frames=[]; indices=[24,30,36,42]
for i in indices:
    im=Image.new('RGB',(800,350),(20,25,31))
    for j,(folder,label) in enumerate([('r88-arms-before-clean','Unpublished pre-fix R87'),('r88-arms-after-clean','R88 corrected')]):im.paste(tile(src/folder/f'trade-{i}.png',f'{label} / frame {i}',400,350),(400*j,0))
    frames.append(im)
durations=[round((b-a)/60*3000) for a,b in zip(indices,indices[1:])]+[600]
frames[0].save(images/'contact-recovery.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True)
sheet([(src/folder/file,label+' / '+file.removesuffix('.png')) for folder,label in [('r88-arms-before-clean','Pre-fix R87'),('r88-arms-after-clean','R88')] for file in ['trade-30-side.png','trade-36-side.png','dummy-43.png','dummy-52.png']],4,'arm-details.jpg',320,300)
for folder,file,out in [('r88-ui-final-clean','combos-393-650.png','play-combos.jpg'),('r88-player-release','player-combo-fight.png','player-fight.jpg')]:Image.open(src/folder/file).convert('RGB').save(images/out,quality=88,optimize=True)
for folder,file,out in [('r88-ui-final-clean','browser-results.json','browser.json'),('r88-visual-final','visual-results.json','poses.json'),('r88-player-release','fight-results.json','player-fight.json'),('r88-motion-final','motion-results.json','motion-after.json'),('r88-baseline-selected','motion-results.json','motion-before.json'),('r88-arms-before-clean','arm-results.json','arms-before.json'),('r88-arms-after-clean','arm-results.json','arms-after.json')]:shutil.copyfile(src/folder/file,results/out)
manifest=[]
for p in sorted(images.iterdir()):
    im=Image.open(p);manifest.append({'path':str(p.relative_to(dest)), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'width':im.width,'height':im.height,'frames':getattr(im,'n_frames',1)})
(results/'images.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Assembled',len(manifest),'actual-render artifacts; full-size originals retained externally.')
