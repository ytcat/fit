"""Original Hazel's Market Row fruit stall. Offline Blender, no downloaded artwork.
blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_market_stall.py
Blender Z-up, front -Y; GLB Y-up, customer side +Z. Metres.
"""
import bpy, math, random, sys, json
from pathlib import Path
import numpy as np
from PIL import Image
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from city_blender_helpers import material,group,box,mesh,rod,tube,text,uv_planar,batch
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/street/ch01-market';OUT.mkdir(parents=True,exist_ok=True)
TEX=OUT/'textures';TEX.mkdir(exist_ok=True)
rng=random.Random(14531)
# Original directional grain. Multiple frequencies, knots and end-wear; no photos.
n=512;y,x=np.mgrid[0:n,0:n]/n;noise=np.random.default_rng(14531).normal(0,1,(n,n))
grain=np.sin((x+.016*np.sin(y*15)+.008*np.sin(y*43))*210)+.32*np.sin(x*611+y*3)
knot=np.exp(-((x-.42)**2/.006+(y-.62)**2/.025));shade=grain*.018+noise*.006-knot*.07
rgb=np.stack([.48+shade,.35+shade*.78,.22+shade*.55],axis=-1)
Image.fromarray(np.uint8(np.clip(rgb,0,1)*255)).save(TEX/'wood-color.png')
Image.fromarray(np.uint8(np.clip(.79+grain*.025+noise*.012,0,1)*255)).save(TEX/'wood-roughness.png')
# Original subtle skin pore normal, reused at different strength by fruit species.
pores=np.random.default_rng(912).normal(0,1,(128,128));dy,dx=np.gradient(pores)
norm=np.stack([-dx*.14,-dy*.14,np.ones_like(dx)],axis=-1);norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
Image.fromarray(np.uint8((norm*.5+.5)*255)).save(TEX/'fruit-normal.png')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={k:material(name,col,r,m) for k,name,col,r,m in [
 ('wood','worn honey timber','#a78454',.86,0),('edge','end grain and worn edges','#b49b71',.88,0),
 ('green','faded forest canvas','#375c50',.96,0),('cream','unbleached canvas','#d4c6a4',.97,0),
 ('frame','painted iron frame','#334942',.65,.2),('metal','scale bowl and fittings','#a1a5a0',.31,.76),
 ('black','chalk slate and rubber','#252d2c',.92,0),('chalk','chalk and scale dial','#e4dfc9',.83,0),
 ('red','apple crimson','#a33e31',.44,0),('red2','apple blushed gold','#c38c42',.48,0),
 ('orange','orange rind','#de8d26',.77,0),('pear','pear yellow green','#a9ac48',.69,0),
 ('leaf','fruit leaves and stems','#4c6134',.89,0),('paper','folded kraft paper','#b19468',.94,0),
 ('scale','enamel weighing scale','#5e8075',.38,.17) ]}
for suff,slot in [('color','Base Color'),('roughness','Roughness')]:
 node=M['wood'].node_tree.nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(TEX/('wood-'+suff+'.png')))
 if suff=='roughness':node.image.colorspace_settings.name='Non-Color'
 M['wood'].node_tree.links.new(node.outputs['Color'],M['wood'].node_tree.nodes['Principled BSDF'].inputs[slot])
for key in ['red','red2','orange','pear']:
 mat=M[key];nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes['Principled BSDF']
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TEX/'fruit-normal.png'),check_existing=True);tex.image.colorspace_settings.name='Non-Color'
 normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.27 if key=='orange' else .09
 links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
 attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='FruitTint';links.new(attr.outputs['Color'],p.inputs['Base Color'])
for m in M.values():m.use_backface_culling=False
root=group('Hazel_fruit_stall');structure=group('Stall_structure',parent=root);produce=group('Produce_display',parent=root);counter=group('Scale_and_service',parent=root)
def timber(name,p,s,par=structure):
 o=box(name,p,s,M['wood'],par,.006)
 uv=o.data.uv_layers.active or o.data.uv_layers.new();long=max(range(3),key=lambda k:s[k])
 for face in o.data.polygons:
  normal_axis=max(range(3),key=lambda k:abs(face.normal[k]));other=next(k for k in range(3) if k not in [long,normal_axis]) if long!=normal_axis else (long+1)%3
  for li in face.loop_indices:
   co=o.matrix_local @ o.data.vertices[o.data.loops[li].vertex_index].co
   uv.data[li].uv=(co[other]/.45,co[long]/1.7)
 return o
# Tall back rails leave seller opening and a fully open aisle behind the display.
for xx in [-1.38,1.38]:
 for yy in [-.72,.66]:
  rod('canopy upright',(xx,yy,.04),(xx,yy,2.29 if yy<0 else 2.49),.023,M['frame'],structure)
  box('flat foot',(xx,yy,.025),(.16,.13,.05),M['frame'],structure,.012)
  rod('upright collar',(xx,yy,.82),(xx,yy,.89),.030,M['metal'],structure)
 for yy,z in [(-.78,2.25),(.72,2.46)]:
  tube('roof side eave',[(xx,-.80,2.25),(xx,.04,2.66),(xx,.74,2.46)],.020,M['frame'],structure) if yy<0 else None
for yy,z in [(-.78,2.25),(.04,2.66),(.72,2.46)]:rod('cross beam',(-1.43,yy,z),(1.43,yy,z),.021,M['frame'],structure)
for xx in [-1.24,1.24]:
 for yy in [-.42,.43]:
  timber('tapered table leg',(xx,yy,.47),(.075,.075,.91))
 timber('leg brace',(xx,0,.28),(.065,.94,.055))
for yy in [-.45,.47]:timber('apron rail',(0,yy,.83),(2.58,.055,.16))
for j in range(7):timber('counter plank',(0,-.48+j*.16,.94),(2.65,.152,.055))
for i in range(13):
 xx=-1.23+i*.205;timber('front skirt boards',(xx,-.49,.54),(.194,.028,.62))
timber('front skirt top',(0,-.515,.86),(2.70,.045,.055));timber('front skirt bottom',(0,-.515,.23),(2.70,.045,.055))
# Large continuous pitched canopy, sagged between rails. Material stripes share vertices.
NX=84;NY=24;verts=[];faces=[]
def roof(u,v):
 z=(2.25+(v+.8)/.84*.41) if v<=.04 else (2.66-(v-.04)/.70*.20)
 return z-.044*math.sin(math.pi*(u+1.5)/3)**2*math.sin(math.pi*(v+.8)/1.54)**2+.007*math.cos(u*33)*math.sin(math.pi*(v+.8)/1.54)
for i in range(NX+1):
 xx=-1.50+3*i/NX
 for j in range(NY+1):
  yy=-.8+1.54*j/NY;verts.append((xx,yy,roof(xx,yy)))
for i in range(NX):
 for j in range(NY):faces.append((i*(NY+1)+j,(i+1)*(NY+1)+j,(i+1)*(NY+1)+j+1,i*(NY+1)+j+1))
o=mesh('sewn pitched canvas canopy',verts,faces,M['cream'],structure,True);o.data.materials.append(M['green'])
for i,p in enumerate(o.data.polygons):p.material_index=((i//NY)//7)%2
# Scalloped valance, not a solid box fascia.
vv=[];ff=[]
for i in range(NX+1):
 xx=-1.5+3*i/NX;zz=2.25-.13-.025*(.5-.5*math.cos(i/NX*12*math.tau));vv.extend([(xx,-.802,2.253),(xx,-.805,zz)])
for i in range(NX):ff.append((2*i,2*i+2,2*i+3,2*i+1))
o=mesh('scalloped front valance',vv,ff,M['cream'],structure,True);o.data.materials.append(M['green'])
for i,p in enumerate(o.data.polygons):p.material_index=(i//7)%2
for i in range(13):
 xx=-1.5+i*.25;tube('stitched canvas seam',[(xx,-.8+1.54*j/16,roof(xx,-.8+1.54*j/16)+.002) for j in range(17)],.0016,M['cream'],structure)
# Material batching below preserves multiple canopy material slots (handled separately).
# Hand-lettered fitted store board.
board=timber('Hazel sign board',(0,-.535,.66),(1.38,.035,.28));text('Hazel name',"HAZEL'S",(0,-.559,.71),.16,M['chalk'],structure);text('Hazel subtitle','FRUIT & GREENS',(0,-.559,.58),.071,M['chalk'],structure)

def crate(cx,cy,cz,w=.74,d=.48):
 for k in range(5):timber('crate base slat',(cx-w/2+(k+.5)*w/5,cy,cz),(.9*w/5,d,.018),produce)
 for side in [-1,1]:
  for k in range(3):
   timber('crate long slat',(cx,cy+side*d/2,cz+.04+k*.053),(w+.02,.019,.041),produce)
   timber('crate end slat',(cx+side*w/2,cy,cz+.04+k*.053),(.019,d,.041),produce)
  for yy in [-d/2,d/2]:
   timber('crate corner',(cx+side*(w/2-.02),cy+yy,cz+.093),(.035,.035,.20),produce)
   for zz in [.05,.14]:rod('crate fixing',(cx+side*(w/2-.02),cy+yy-.011,cz+zz),(cx+side*(w/2-.02),cy+yy-.016,cz+zz),.003,M['metal'],produce,6)
# Sculpted fruit profiles, recessed poles and lobed apple bases, curved pear stem.
def fruit(kind,p,size,phase):
 n=16;nr=12;vs=[]
 for j in range(nr+1):
  a=math.pi*j/nr;z=math.cos(a);r=math.sin(a)
  if kind=='pear':r*=.82-.27*z;z*=1.40
  elif kind.startswith('red'):r*=1+.055*math.cos(a*3);z=z*.93-.14*math.exp(-(a/.33)**2)+.07*math.exp(-((a-math.pi)/.4)**2)
  for i in range(n):
   b=i/n*math.tau;rr=r*(1+.025*math.sin(b*5+phase)*math.sin(a));vs.append((p[0]+size*rr*math.cos(b),p[1]+size*rr*math.sin(b),p[2]+size*z))
 fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(nr) for i in range(n)]
 o=mesh('hand sorted '+kind,vs,[f[::-1] for f in fs],M[kind],produce,True)
 uv=o.data.uv_layers.new();color=o.data.color_attributes.new(name='FruitTint',type='FLOAT_COLOR',domain='POINT')
 base=M[kind].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:3]
 for i,v in enumerate(o.data.vertices):
  ring=i//n;ang=(i%n)/n*math.tau;variation=.90+.10*math.sin(ang*2+phase)+.025*math.cos(ring*.8+phase)
  color.data[i].color=(*(min(1,max(0,c*variation)) for c in base),1)
 for face in o.data.polygons:
  ids=[o.data.loops[li].vertex_index for li in face.loop_indices];seam=any(i%n==0 for i in ids) and any(i%n==n-1 for i in ids)
  for li in face.loop_indices:
   idx=o.data.loops[li].vertex_index;u=(idx%n)/n
   if seam and u==0:u=1
   uv.data[li].uv=(u,idx//n/nr)
 top=p[2]+size*(1.4 if kind=='pear' else .80 if kind.startswith('red') else .98)
 tube('fruit stem',[(p[0],p[1],top),(p[0]+.004,p[1],top+.012),(p[0]+.009,p[1]+.002,top+.018)],.0025,M['leaf'],produce)
 if phase>.5:
  mesh('curved fruit leaf',[(p[0]+.003,p[1],top+.01),(p[0]+.022,p[1]-.009,top+.021),(p[0]+.046,p[1]+.004,top+.012),(p[0]+.022,p[1]+.012,top+.025)],[(0,1,2),(0,2,3)],M['leaf'],produce,True)
for cx,kind in [(-.88,'red'),(-.06,'orange'),(.76,'pear')]:
 crate(cx,-.13,.981)
 for layer in range(2):
  for i in range(5-layer):
   for j in range(3-layer):
    xx=cx-.275+i*.135+layer*.065+rng.uniform(-.012,.012);yy=-.26+j*.135+layer*.06+rng.uniform(-.008,.008)
    fruit('red2' if kind=='red' and rng.random()<.28 else kind,(xx,yy,1.071+layer*.106),rng.uniform(.057,.065),rng.random()*math.tau)
 # Price label on angled front crate board; local readable original lettering.
 box('produce price slate',(cx,-.391,1.08),(.22,.013,.125),M['black'],produce,.008)
 text('produce price',{'red':'2.50','orange':'3.00','pear':'2.80'}[kind],(cx,-.4,1.10),.051,M['chalk'],produce)
 text('price unit','PER KG',(cx,-.4,1.055),.025,M['chalk'],produce)
# Empty return crate at ground level, with a diagonally folded sack.
crate(-1.03,.80,.04,.62,.45)
# Analog market scale at rear service corner: flared enamel body, metal bowl, dial/ticks.
def lathe(name,profile,mat,parent,loc=(0,0,0),n=40):
 vs=[(loc[0]+r*math.cos(i/n*math.tau),loc[1]+r*math.sin(i/n*math.tau),loc[2]+z) for r,z in profile for i in range(n)]
 fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
 return mesh(name,vs,fs,mat,parent,True)
sx=.90;sy=.42
lathe('scale enamel pedestal',[(0,0),(.16,0),(.18,.025),(.15,.055),(.10,.12),(.12,.22),(.04,.25),(0,.25)],M['scale'],counter,(sx,sy,.969))
rod('scale bowl support',(sx,sy,1.19),(sx,sy,1.29),.032,M['metal'],counter)
lathe('hollow weighing pan',[(0,0),(.06,0),(.15,.035),(.235,.10),(.24,.113),(.23,.119),(.215,.098),(.14,.045),(.055,.012),(0,.012)],M['metal'],counter,(sx,sy,1.27))
rod('round dial surround',(sx,sy-.11,1.12),(sx,sy-.147,1.12),.10,M['metal'],counter,40)
rod('round printed dial',(sx,sy-.149,1.12),(sx,sy-.151,1.12),.09,M['chalk'],counter,40)
for i in range(21):
 a=(-.78+i/20*math.pi*1.5);r=.075;rod('dial tick',(sx+r*math.sin(a),sy-.154,1.12+r*math.cos(a)),(sx+(r-.009)*math.sin(a),sy-.154,1.12+(r-.009)*math.cos(a)),.0014,M['black'],counter,6)
tube('scale needle',[(sx,sy-.155,1.12),(sx-.049,sy-.155,1.166)],.002,M['black'],counter)
text('scale unit','kg',(sx,sy-.156,1.083),.022,M['black'],counter)
# A folded paper bag is a creased, open shell with visible inside and rolled rim.
px=-.18;py=.47;profile=[(-.085,-.060),(-.060,-.074),(.085,-.060),(.068,.02),(.085,.068),(-.085,.068),(-.067,.00)]
vv=[(px+x*(1+.07*lev),py+y, .975+lev*.23) for lev in [0,1] for x,y in profile];nn=len(profile)
ff=[tuple(range(nn-1,-1,-1))]+[(i,(i+1)%nn,(i+1)%nn+nn,i+nn) for i in range(nn)]
o=mesh('creased open kraft bag',vv,ff,M['paper'],counter);solid=o.modifiers.new('paper thickness','SOLIDIFY');solid.thickness=.0015;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
tube('paper folded upper edge',vv[nn:]+[vv[nn]],.002,M['edge'],counter)
# Avoid helper batch losing the stripe material assignments: group by material signature.
def merge_material_sets(parent):
 groups={}
 for o in list(parent.children_recursive):
  if o.type=='MESH':groups.setdefault(tuple(o.data.materials),[]).append(o)
 for mats,obs in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=obs[0];world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world;o.name=parent.name+'__'+mats[0].name
for g in [structure,produce,counter]:merge_material_sets(g)
bpy.ops.object.select_all(action='DESELECT');objects=[root]+list(root.children_recursive)
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'hazel-fruit-stall.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
tri=0;nodes=0
for o in objects:
 if o.type=='MESH':o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles);nodes+=1
stats={'authoring':'Blender '+bpy.app.version_string,'bytes':(OUT/'hazel-fruit-stall.glb').stat().st_size,'triangles':tri,'mesh_nodes':nodes,'units':'metres','front':'glTF +Z','origin':'centre ground','game_integration':False,'physical_phone':'NOT VERIFIED','seed':14531}
(OUT/'manifest.json').write_text(json.dumps(stats,indent=2)+'\n')
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hazel-fruit-stall.blend'))
print('STALL_MANIFEST '+json.dumps(stats))
