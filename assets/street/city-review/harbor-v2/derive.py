import bpy, sys, json, struct, math
from mathutils import Vector
from pathlib import Path
source,middle,far=map(Path,sys.argv[sys.argv.index('--')+1:])
def read(p):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(p));bpy.context.view_layer.update()
 return [o for o in bpy.context.scene.objects if o.type=='MESH']
def bounds(meshes):
 b=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 return [[round(fn(v[i] for v in b),5) for i in range(3)] for fn in (min,max)]
def counts(meshes):
 total=0
 for o in meshes:
  o.data.calc_loop_triangles(); total+=len(o.data.loop_triangles)
 return total
def glb(p):
 b=p.read_bytes();j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
 return dict(bytes=len(b), primitives=sum(len(m['primitives']) for m in j['meshes']),materials=len(j['materials']))
root=read(source);before=counts(root);b=bounds(root); print('NEAR',before,b,glb(source),flush=True)
for ratio,p,cap in [(.54,middle,.68),(.24,far,.37)]:
 meshes=read(source)
 for o in meshes:
  if len(o.data.polygons)<50:continue
  if p.name.startswith('ship') and any(k in o.name for k in ('Antifoul','Boot topping','Marine blue topsides')):continue
  bpy.context.view_layer.objects.active=o
  m=o.modifiers.new('Distance geometry; keep silhouette and material seams','DECIMATE'); m.ratio=ratio; m.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)
 new=read(p);c=counts(new);a=bounds(new)
 assert c<before*cap,(c,before)
 assert max(abs(a[j][i]-b[j][i]) for i in range(3) for j in range(2))<=.26,(a,b)
 print(p.name,c,a,glb(p),flush=True)
