import json,sys,numpy as np
from PIL import Image,ImageDraw
frames=json.load(open(sys.argv[1]));out=Image.new('RGB',(560*len(frames),700),'#131a24')
for k,f in enumerate(frames):
 tris=[];cs=[]
 for m in f['meshes']:
  p=np.array(m['positions']).reshape(-1,3);ids=np.array(m['index']).reshape(-1,3)
  tris.append(p[ids]);cs.append(np.array(m['colors']).reshape(-1,3)[ids].mean(1))
 t=np.concatenate(tris);color=np.concatenate(cs);n=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]);n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-10)
 light=np.array([-.4,.7,1]);light/=np.linalg.norm(light);shade=.38+.62*np.maximum(n@light,0)
 color=np.clip(color*shade[:,None],0,1)**(1/2.2);color=(color*255).astype('uint8')
 xy=t[:,:,:2].copy();xy[:,:,0]=xy[:,:,0]*260+280;xy[:,:,1]=660-xy[:,:,1]*260
 im=Image.new('RGB',(560,700),'#131a24');draw=ImageDraw.Draw(im)
 for i in np.argsort(t[:,:,2].mean(1)):
  draw.polygon([tuple(v) for v in xy[i]],fill=tuple(color[i]))
 draw.text((15,15),f['name'],fill='white');out.paste(im,(k*560,0))
out.save(sys.argv[2])
