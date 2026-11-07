"""Compose labeled actual app captures; no generated or retouched character art."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import sys,json,hashlib,shutil
src=Path(sys.argv[1]);dest=Path(__file__).parent;images=dest/'images';results=dest/'results';images.mkdir(exist_ok=True);results.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
def tile(file,label,w=420,h=370):
 im=Image.open(file).convert('RGB');im.thumbnail((w,h-28),Image.Resampling.LANCZOS);out=Image.new('RGB',(w,h),(20,25,31));out.paste(im,((w-im.width)//2,28+(h-28-im.height)//2));ImageDraw.Draw(out).text((8,6),label,font=font,fill='#e4c180');return out
def sheet(entries,cols,name,w=420,h=370):
 im=Image.new('RGB',(w*cols,h*((len(entries)+cols-1)//cols)),(20,25,31))
 for i,(f,l) in enumerate(entries):im.paste(tile(f,l,w,h),(i%cols*w,i//cols*h))
 im.save(images/name,quality=89,optimize=True)
frames=[]
for i in range(8):
 im=Image.new('RGB',(840,370),(20,25,31))
 for j,(folder,label) in enumerate([('r90-motion-before','R89 baseline'),('r90-motion-after','R90 coordinated rope')]):im.paste(tile(src/folder/f'rope-{i}.png',label),(j*420,0))
 frames.append(im)
frames[0].save(images/'rope-comparison.gif',save_all=True,append_images=frames[1:],duration=150,loop=0,optimize=True)
sheet([(src/folder/f'rope-{i}.png',f'{label} / phase {i}/8') for folder,label in [('r90-motion-before','Before'),('r90-motion-after','After')] for i in [0,2,4,7]],4,'rope-poses.jpg',310,290)
sheet([(src/folder/f'mitt-{i}.png',f'{label} / t={i/100:.2f}s') for folder,label in [('r90-motion-before','Before'),('r90-motion-after','After')] for i in [30,290]],2,'mitts-comparison.jpg')
sheet([(src/'r90-gear/handle.png','Actual attached handle'),(src/'r90-gear/mitt.png','Actual oxblood / black mitt')],2,'gear-detail.jpg')
sheet([(src/'r90-gpu-parity/cpu-padding.png','CPU padding reference'),(src/'r90-gpu-parity/gpu-padding.png','GPU padding: identical pixels')],2,'padding-parity.jpg')
for folder,file,out in [('r90-motion-before','results.json','motion-before.json'),('r90-motion-after','results.json','motion-after.json'),('r90-gpu-parity','results.json','webgl2.json'),('r90-webgl1','results.json','webgl1.json'),('r90-interaction','results.json','interaction.json'),('r90-native','native.json','native.json'),('r90-gear','gear.json','gear.json')]:shutil.copyfile(src/folder/file,results/out)
for file,out in [('r90-cpu-before-final.json','cpu-before.json'),('r90-cpu-after-final.json','cpu-after.json'),('r90-training-motion-final.log','training-motion.log')]:shutil.copyfile(src/file,results/out)
manifest=[]
for f in sorted(images.iterdir()):
 im=Image.open(f);manifest.append({'path':str(f.relative_to(dest)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size,'dimensions':im.size,'frames':getattr(im,'n_frames',1)})
(results/'images.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Composed',len(manifest),'actual-render artifacts.')
