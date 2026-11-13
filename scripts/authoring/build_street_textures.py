"""Original seeded street PBR maps. Build-time Python + NumPy + Pillow only.

python scripts/authoring/build_street_textures.py
No downloaded photograph, texture, model, font, API or paid dependency.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT=Path(__file__).resolve().parents[2]/'assets/street/ch01-station/textures'
OUT.mkdir(parents=True,exist_ok=True)
N=1024
rng=np.random.default_rng(12013)
def noise(cells):
    a=rng.random((cells,cells)).astype('float32')
    return np.asarray(Image.fromarray(a,mode='F').resize((N,N),Image.Resampling.BICUBIC))
def save(a,name):
    Image.fromarray(np.clip(a,0,255).astype('uint8')).save(OUT/(name+'.png'),optimize=True)
def normal(height,strength):
    dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*strength
    dy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*strength
    v=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);v/=np.linalg.norm(v,axis=-1,keepdims=True)
    return (v*.5+.5)*255

coarse=noise(7);medium=noise(42);fine=noise(256);grain=rng.random((N,N))
cracks=Image.new('L',(N,N),0);d=ImageDraw.Draw(cracks)
for i in range(15):
    x,y=rng.uniform(0,N,2);points=[(x,y)]
    a=rng.uniform(0,6.28)
    for j in range(int(rng.integers(6,20))):
        a+=rng.normal(0,.45);x+=np.cos(a)*rng.uniform(6,26);y+=np.sin(a)*rng.uniform(6,26);points.append((x,y))
    d.line(points,fill=int(rng.integers(80,180)),width=int(rng.integers(1,4)))
crack=np.asarray(cracks.filter(ImageFilter.GaussianBlur(.55)))/255
h=.25*medium+.14*fine+.035*grain-crack*.24
a=48+coarse*15+medium*9+fine*10+grain*8-crack*22
save(np.stack([a*.93,a*.98,a],axis=-1),'asphalt-color')
save(185+medium*30+fine*25,'asphalt-roughness');save(normal(h,2),'asphalt-normal')

stone=noise(9)*.6+noise(90)*.17+noise(300)*.09
a=143+stone*40
save(np.stack([a*1.035,a*1.01,a*.94],axis=-1),'stone-color')
save(190+stone*50,'stone-roughness');save(normal(stone,1.7),'stone-normal')
print('Original street PBR maps:',OUT)
