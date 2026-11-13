"""Original seeded masonry/roof maps and a hand-drawn fictional street tag.

python scripts/authoring/build_oldtown_textures.py
Build-time NumPy/Pillow; no downloads or generative service.
"""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
OUT=Path(__file__).resolve().parents[2]/'assets/street/ch01-oldtown/textures'
OUT.mkdir(parents=True,exist_ok=True)
N=1024;rng=np.random.default_rng(13117)
Y,X=np.mgrid[:N,:N]
def noise(cells):
    # Wrap padded lattice before resampling so the repeat does not acquire a seam.
    a=rng.random((cells,cells)).astype('float32');a=np.pad(a,1,mode='wrap')
    im=Image.fromarray(a).resize((N+2*N//cells,N+2*N//cells),Image.Resampling.BICUBIC)
    k=N//cells;return np.asarray(im)[k:k+N,k:k+N]
def save(a,name):
    im=Image.fromarray(np.clip(a,0,255).astype('uint8'))
    # Measured first GLB was 12.3 MB, with 8.8 MB in images. Keep 1K color,
    # reduce micro normal/roughness maps rather than sacrificing architectural form.
    if name.endswith(('-normal','-roughness')):
        im=im.resize((512,512),Image.Resampling.LANCZOS)
        if name.endswith('-normal'):
            v=np.asarray(im).astype(float)/127.5-1;v/=np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-7)
            im=Image.fromarray(np.clip((v*.5+.5)*255,0,255).astype('uint8'))
    im.save(OUT/(name+'.png'),compress_level=3)
def normal(h,gain):
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))*gain;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*gain
    # Image rows run down while glTF texture V runs up: +dy is OpenGL tangent Y.
    v=np.stack([-dx,dy,np.ones_like(h)],-1);v/=np.linalg.norm(v,axis=-1,keepdims=True);return (v*.5+.5)*255
fine=noise(160);grain=rng.random((N,N));broad=noise(12)
# Eight courses and eight bricks per tile, 1.84 m × .64 m at the default UV scale.
row=Y//128;xx=(X+(row%2)*64)%128;yy=Y%128
edge=np.minimum.reduce([xx,127-xx,yy,127-yy]).astype(float)
edge+=(fine-.5)*1.8
brick=np.clip((edge-3)/8,0,1);shade=rng.uniform(-17,17,(8,8))[row,(X+(row%2)*64)//128%8]
rgb=np.stack([139+shade+broad*13,82+shade*.50+broad*9,60+shade*.35+broad*7],-1)
rgb*=((.82+.18*np.clip((edge-4)/15,0,1)))[...,None]
mortar=np.stack([103+fine*10,101+fine*10,91+fine*10],-1)
rgb=rgb*brick[...,None]+mortar*(1-brick[...,None]);rgb+=(grain[...,None]-.5)*8
height=brick*.48+fine*.035+grain*.015
save(rgb,'brick-color');save(166+fine*42+(shade+17)*.9+(1-brick)*20,'brick-roughness');save(normal(height,2.5),'brick-normal')
# Warm lime plaster: fine grain plus broad mottling; local dampness is in a unique front map.
plaster=172+broad*21+fine*8+grain*3
save(np.stack([plaster*1.08,plaster*1.015,plaster*.86],-1),'plaster-color')
save(211+fine*25,'plaster-roughness');save(normal(fine*.07+grain*.02,1.8),'plaster-normal')
stains=np.exp(-Y/(N*.17))*.20
for cx,z in [(.18,.85),(.50,.85),(.82,.85),(.18,.43),(.50,.43),(.82,.43)]:
    # Image origin at top; these run down from selected sill heights.
    top=int((1-z)*N);length=N*.14;dx=(X-cx*N)/(N*.021)
    stains+=np.exp(-dx*dx)*np.where(Y>top,np.exp(-(Y-top)/length),0)*.12
unique=np.stack([plaster*1.08,plaster*1.015,plaster*.86],-1)*(1-stains[...,None])
save(unique,'plaster-front-color')
# Fired clay roof: pan/cover ridges and overlapping staggered courses.
u=(X%128)/128;v=(Y%128)/128
wave=np.cos(u*np.pi*2)*.5+.5;lap=np.clip((v-.88)/.12,0,1)
tile=rng.uniform(-16,16,(8,8))[Y//128,X//128]
a=133+wave*9+tile*.65+broad*5
save(np.stack([a,a*.49+fine*5,a*.29+fine*5],-1),'roof-color')
save(194+fine*36,'roof-roughness');save(normal(wave*.18+lap*.14+fine*.012,2.5),'roof-normal')
# Original brush tag RISE: no downloaded artwork/font. Broken paint reveals its wall.
tag=Image.new('RGBA',(1024,512));mask=Image.new('L',tag.size);d=ImageDraw.Draw(mask)
letters=[[(0,1),(0,0),(.55,0),(.7,.16),(.65,.38),(0,.46),(.75,1)],[(0,0),(.5,0),(.25,0),(.25,1),(0,1),(.5,1)],[(.7,.08),(.18,0),(0,.25),(.65,.6),(.65,.87),(.18,1),(0,.9)],[(.65,0),(0,0),(0,1),(.65,1),(0,1),(0,.5),(.53,.5)]]
for i,points in enumerate(letters):
    xy=[(80+i*230+x*220,80+y*330) for x,y in points];d.line(xy,fill=205,width=27,joint='curve')
alpha=np.asarray(mask).copy();erode=rng.random(alpha.shape);alpha[erode<.08]=0
rgba=np.zeros((512,1024,4),dtype='uint8');rgba[:,:,:3]=[61,95,90];rgba[:,:,3]=alpha
Image.fromarray(rgba).save(OUT/'graffiti-rise.png',compress_level=3)
print('Original Old Town material maps:',OUT)
