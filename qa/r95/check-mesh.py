"""Independent dense triangle-distance check of the exported, actually posed meshes."""
from pathlib import Path
import sys,json,numpy as np
from scipy.spatial import cKDTree
root=Path(sys.argv[1]);manifest=json.loads((root/'manifest.json').read_text());results=[]
def distances(p,t):
 a,b,c=t[:,0],t[:,1],t[:,2];ab=b-a;ac=c-a;ap=p-a
 n=np.cross(ab,ac);nn=(n*n).sum(1);d=(ap*n).sum(1);proj=ap-n*(d/np.maximum(nn,1e-30))[:,None]
 aa=(ab*ab).sum(1);cc=(ac*ac).sum(1);abac=(ab*ac).sum(1);pa=(proj*ab).sum(1);pc=(proj*ac).sum(1);den=aa*cc-abac*abac
 u=(cc*pa-abac*pc)/np.maximum(den,1e-30);v=(aa*pc-abac*pa)/np.maximum(den,1e-30)
 best=np.where((den>1e-24)&(u>=0)&(v>=0)&(u+v<=1),d*d/np.maximum(nn,1e-30),np.inf)
 for x,y in [(a,b),(b,c),(c,a)]:
  axis=y-x;f=np.clip(((p-x)*axis).sum(1)/np.maximum((axis*axis).sum(1),1e-30),0,1);q=x+axis*f[:,None];best=np.minimum(best,((p-q)**2).sum(1))
 return np.sqrt(best)
for item in manifest['frames']:
 f=item['frame'];vertices=np.fromfile(root/f'phase-{f}-vertices.f32',dtype=np.float32).reshape(-1,3).astype(float);indices=np.fromfile(root/f'phase-{f}-faces.u32',dtype=np.uint32).reshape(-1,3);triangles=vertices[indices];centres=triangles.mean(1);radii=np.linalg.norm(triangles-centres[:,None,:],axis=2).max(1);largest=radii.max();tree=cKDTree(centres);rope=np.fromfile(root/f'phase-{f}-rope.f32',dtype=np.float32).reshape(-1,3).astype(float)
 samples=[]
 for a,b in zip(rope[:-1],rope[1:]):
  steps=max(1,int(np.ceil(np.linalg.norm(b-a)/.005)));samples.extend(a+(b-a)*np.arange(steps)[:,None]/steps)
 samples=np.array(samples+[rope[-1]]);minimum=float('inf');nearest='';violations=[]
 for p in samples:
  nearestCentre,_=tree.query(p)
  if nearestCentre-largest>.04:continue
  candidates=tree.query_ball_point(p,largest+.04)
  if not candidates:continue
  ds=distances(p,triangles[candidates]);j=int(ds.argmin());distance=float(ds[j]);face=candidates[j]
  if distance<minimum:minimum=distance;nearest=next((r['name'] for r in item['regions'] if r['start']<=face<r['end']),'unknown')
  if distance<.018:violations.append({'point':p.tolist(),'distance':distance,'mesh':next((r['name'] for r in item['regions'] if r['start']<=face<r['end']),'unknown')})
 result={'phase':item['phase'],'samples':len(samples),'triangles':len(triangles),'minimumSampledDistance':minimum if np.isfinite(minimum) else .04,'continuousLowerBound':minimum-.0025 if np.isfinite(minimum) else .0375,'closestMesh':nearest,'violations':len(violations),'examples':violations[:3]};results.append(result);print(json.dumps(result),flush=True)
(root/'mesh-check.json').write_text(json.dumps({'method':'All exported visible triangles; samples <=5 mm apart. Cable radius 4.5 mm. Minimum sample threshold 18 mm gives at least 15.5 mm centreline clearance by distance Lipschitz bound. Handles/bearings excluded as intended attachment; wraps/fingers included.','species':manifest['species'],'frames':results,'pass':not any(r['violations'] for r in results)},indent=2)+'\n')
if any(r['violations'] for r in results):sys.exit(1)
