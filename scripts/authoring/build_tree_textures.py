"""Original seeded bark and broadleaf textures; Pillow/NumPy, no downloaded inputs."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[2] / 'assets/street/ch01-trees/textures'
OUT.mkdir(parents=True, exist_ok=True)
N = 512
rng = np.random.default_rng(61309)
y, x = np.mgrid[:N, :N].astype(float)

# Periodic directional grooves: U wraps around a branch, V follows its length.
warp = x + 3.7*np.sin(y*2*np.pi/N*3) + 1.8*np.sin(y*2*np.pi/N*7+x*2*np.pi/N*2)
fissure = np.maximum(0, np.cos(warp*2*np.pi/N*29))**12
fine = .5*np.sin(warp*2*np.pi/N*61) + .25*np.sin(y*2*np.pi/N*29+x*2*np.pi/N*31)
slow = np.sin(x*2*np.pi/N*7 + .5*np.sin(y*2*np.pi/N*2))
h = .56-.25*fissure+.055*slow+.025*fine
noise = rng.normal(0, 1.6, (N,N))
rgb = np.stack([100+46*(h-.5)+noise, 87+41*(h-.5)+noise, 66+33*(h-.5)+noise], axis=-1)
Image.fromarray(np.uint8(np.clip(rgb,0,255))).save(OUT/'bark-color.png')
dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*2.2
dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*2.2
normal=np.stack([-dx,dy,np.ones_like(h)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1)[...,None]
Image.fromarray(np.uint8(np.clip((normal*.5+.5)*255,0,255))).save(OUT/'bark-normal.png')
Image.fromarray(np.uint8(np.clip(220+fissure*18-h*8,0,255))).save(OUT/'bark-roughness.png')

# Opaque leaf surface. Geometry, rather than transparency, supplies its silhouette.
u=x/(N-1);v=1-y/(N-1)
blade=.5+.25*np.sin(np.pi*v)+.08*np.cos(14*np.pi*v+u*8)
base=np.stack([75+32*blade,104+40*blade,35+25*blade],axis=-1)
base+=rng.normal(0,1.5,(N,N))[...,None]
leaf=Image.fromarray(np.uint8(np.clip(base,0,255)))
d=ImageDraw.Draw(leaf)
d.line([(N//2,N-1),(N//2,0)],fill=(135,153,70),width=3)
for t in [.13,.25,.37,.49,.61,.73,.84]:
    yy=int((1-t)*N)
    spread=.43*np.sin(np.pi*t)**.65
    for sign in [-1,1]:
        d.line([(N//2,yy),(int(N*(.5+sign*spread)),int(yy-N*.105))],fill=(121,143,59),width=2)
leaf.filter(ImageFilter.GaussianBlur(.4)).save(OUT/'leaf-color.png')
(OUT/'provenance.json').write_text(json.dumps({'author':'OpenAI Codex for Gloryland','method':'Original deterministic NumPy/Pillow synthesis, seed 61309; no external image inputs','files':['bark-color.png','bark-normal.png','bark-roughness.png','leaf-color.png'],'resolution':[512,512],'license':'Project-original artwork; no third-party asset licenses required'},indent=2)+'\n')
print('TREE_TEXTURES', OUT)
