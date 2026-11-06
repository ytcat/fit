"""Offline Taubin shoulder relaxation; original topology/bones remain unchanged.
Requires NumPy/SciPy. Input is the actual CPU-equivalent posed skin, not new primitives.
"""
import json,sys,hashlib,struct,base64
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix,diags
source=Path(sys.argv[1]);data=json.loads(source.read_text());result={'version':2,'armHingeFrame':data['armHingeFrame'],'controllerSHA256':data['controllerSHA256'],'authoring':'bounded, masked Taubin relaxation of existing guard shoulder surface','inputSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'species':{}}
def smooth(x):
 x=np.clip(x,0,1);return x*x*(3-2*x)
for species,pose in data['poses'].items():
 p=np.array(pose['position']).reshape(-1,3);r=np.array(pose['rest']).reshape(-1,3);tri=np.array(pose['index']).reshape(-1,3);count=len(p)
 edges=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]);edges=np.unique(np.sort(edges,axis=1),axis=0)
 adjacency=coo_matrix((np.ones(len(edges)*2),(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(count,count)).tocsr();average=diags(1/np.maximum(np.asarray(adjacency.sum(1)).ravel(),1))@adjacency
 u=np.abs(r[:,0]);y=r[:,1];mask=smooth((u-.19)/.09)*(1-smooth((u-.45)/.10))*smooth((y-1.34)/.10)*(1-smooth((y-1.69)/.10))
 target=p.copy()
 for _ in range(50):
  for gain in [.50,-.52]:target+=gain*mask[:,None]*(average@target-target)
 delta=target-p;length=np.linalg.norm(delta,axis=1);delta*=np.minimum(1,.025/np.maximum(length,1e-12))[:,None];target=p+delta
 normals=np.zeros_like(target);cross=np.cross(target[tri[:,1]]-target[tri[:,0]],target[tri[:,2]]-target[tri[:,0]])
 for k in range(3):np.add.at(normals,tri[:,k],cross)
 normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
 inv=np.array(pose['chestInverse']).reshape(4,4).T[:3,:3];local_delta=delta@inv.T;local_normal=normals@inv.T
 selected=np.flatnonzero((mask>.0001)&(np.linalg.norm(delta,axis=1)>1e-7));rows=[]
 for i in selected:rows.append([int(i),*np.round(local_delta[i],8),*np.round(local_normal[i],7),round(float(mask[i]),6)])
 packed=b''.join(struct.pack('<IhhhhhhB',row[0],*(int(round(x*1000000)) for x in row[1:4]),*(int(np.clip(round(x*32767),-32767,32767)) for x in row[4:7]),int(round(row[7]*255))) for row in rows)
 result['species'][species]={'restFNV32':pose['restFNV32'],'encoding':'u32-i16x6-u8-le','deltaScale':1000000,'normalScale':32767,'packed':base64.b64encode(packed).decode(),'vertexCount':count,'restSHA256':pose['restSHA256'],'shoulderQuaternions':pose['shoulderQuaternions'],'rowCount':len(rows),'maxDisplacementMetres':float(np.linalg.norm(delta,axis=1).max()),'affectedVertices':len(rows),'iterations':50,'positionLimitMetres':.025}
 print(species, len(rows),'vertices; maximum displacement',np.linalg.norm(delta,axis=1).max())
out=Path(sys.argv[2] if len(sys.argv)>2 else 'assets/models/shoulder-correctives-v2.json');out.write_text(json.dumps(result,separators=(',',':'))+'\n');print(out,out.stat().st_size)
