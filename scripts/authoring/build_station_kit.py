"""Chapter 1 arrival station kit, original Blender authoring, no add-ons.

python scripts/authoring/build_street_textures.py
blender -b -t 2 --python scripts/authoring/build_station_kit.py
Blender X street direction, +Y curb side, Z up. GLB uses X east, -Z curb, Y up.
"""
import bpy,math,json,random
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/street/ch01-station';OUT.mkdir(parents=True,exist_ok=True)
TEX=OUT/'textures'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(12013)

def material(name,color,rough=.7,metal=0,alpha=1,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    p.inputs['Base Color'].default_value=(*rgb,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED';m.use_transparency_overlap=False
    if emission:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m
M={
 'iron':material('powder coated iron','#30434a',.5,.35),
 'edge':material('galvanised steel','#7d878b',.4,.7),
 'wood':material('oiled ash slats','#805f3e',.7),
 'gold':material('aged brass details','#bca66b',.42,.65),
 'glass':material('toughened shelter glass','#b4ced0',.2,.03,.19),
 'paint':material('worn road paint','#d4d1bf',.94),
 'blue':material('bus stop enamel','#28546e',.36,.16),
 'white':material('enamel lettering','#e4dfcc',.6),
 'red':material('poster red','#8d4339',.85),
 'light':material('lamp diffuser','#ffe2a3',.5,0,1,.5),
 'black':material('rubber and cavity','#252a2d',.92),
}
def textured(key,name):
    m=material(key,'#ffffff',.85);p=m.node_tree.nodes['Principled BSDF'];links=m.node_tree.links
    for suffix,slot in [('color','Base Color'),('roughness','Roughness'),('normal',None)]:
        n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(TEX/(name+'-'+suffix+'.png')))
        if suffix!='color':n.image.colorspace_settings.name='Non-Color'
        if slot:links.new(n.outputs['Color'],p.inputs[slot])
        else:
            nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.48;links.new(n.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
    M[key]=m
textured('asphalt','asphalt');textured('stone','stone')

def group(name,pos=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos;o.parent=parent;return o
root=group('Gloryland_arrival_station');root['units']='metres';root['road_elevation_m']=-.15;root['walk_elevation_m']=0.0
road=group('Road_and_pavement',parent=root);shelter=group('Shelter',parent=root);lamp=group('Streetlamp',(0,0,0),root);stop=group('Bus_stop_sign',parent=root);bench=group('Bench',parent=root);binroot=group('Litter_bin',parent=root)
def finish(o,name,key,parent):
    o.name=name;o.parent=parent;o.data.materials.append(M[key]);return o
def box(name,loc,size,key,parent,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('manufactured edge radius','BEVEL');b.width=bevel;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,key,parent)
def rod(name,a,b,r,key,parent,sides=12):
    a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');finish(o,name,key,parent)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o
def surface(name,vs,fs,key,parent,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);finish(o,name,key,parent)
    for f in d.polygons:f.use_smooth=smooth
    return o
def tube(name,points,r,key,parent):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,key,parent)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o
def text(name,body,loc,size,key,parent):
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.0002;c.resolution_u=2
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler.x=math.pi/2;finish(o,name,key,parent)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
def lathe(name,profile,xy,key,parent):
    n=24;vs=[(xy[0]+r*math.cos(i/n*math.tau),xy[1]+r*math.sin(i/n*math.tau),z) for z,r in profile for i in range(n)]
    fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
    return surface(name,vs,fs,key,parent,True)
def uv_world(o,scale):
    # Flat objects use continuous metric coordinates; slabs share a coherent road plane.
    uv=o.data.uv_layers.active or o.data.uv_layers.new()
    for f in o.data.polygons:
        for i in f.loop_indices:
            v=o.matrix_world @ o.data.vertices[o.data.loops[i].vertex_index].co;uv.data[i].uv=(v.x/scale,v.y/scale)

# Street and curb meet the existing StorySets dimensions. Sidewalk plane is z=0.
o=box('asphalt strip',(0,0,-.235),(20,7,.17),'asphalt',road,.015);bpy.context.view_layer.update();uv_world(o,4)
box('sidewalk support',(0,5.9,-.17),(20,4.8,.24),'black',road,.005)
for i in range(20):
    for j in range(4):
        o=box('individual paving slab',(-9.5+i,4.25+j*1.1,-.055+random.uniform(-.001,.001)),(.987,1.087,.11),'stone',road,.011)
        bpy.context.view_layer.update();uv_world(o,2.8)
for i in range(20):
    o=box('dressed curb stone',(-9.5+i,3.58,-.10),(.989,.20,.20),'stone',road,.018);bpy.context.view_layer.update();uv_world(o,2.8)
    o=box('pavement rear edge',(-9.5+i,8.2,-.055),(.989,.20,.11),'stone',road,.011);bpy.context.view_layer.update();uv_world(o,2.8)
for x in [-8,-4,0,4,8]:box('worn lane dash',(x,0,-.148),(1.8,.10,.006),'paint',road,.006)
# Drain with actual open grate, recessed bed and rim.
box('drain well',(2.4,3.27,-.22),(.7,.38,.06),'black',road,.015)
for x in [2.055,2.745]:box('grate edge',(x,3.27,-.145),(.028,.39,.025),'iron',road,.005)
for y in [3.08,3.46]:box('grate edge',(2.4,y,-.145),(.70,.028,.025),'iron',road,.005)
for x in [2.10+i*.065 for i in range(10)]:box('open drain bar',(x,3.27,-.145),(.022,.36,.024),'iron',road,.004)

# Shelter: separate structural frames and real glazing, curved sheet canopy.
for x in [-1.85,0,1.85]:
    box('shelter foot plate',(x,6.65,.012),(.26,.28,.024),'edge',shelter,.016)
    box('rear mullion',(x,6.65,1.36),(.065,.065,2.70),'iron',shelter,.012)
    for dx in [-.085,.085]:rod('anchor bolt',(x+dx,6.65,.016),(x+dx,6.65,.041),.018,'edge',shelter,6)
for x in [-.925,.925]:
    box('back safety glass',(x,6.64,1.38),(1.77,.012,2.30),'glass',shelter,.02)
    box('glass safety marking',(x,6.625,1.12),(1.70,.009,.035),'white',shelter,.004)
for y in [5.0,6.65]:box('right corner frame',(1.85,y,1.36),(.065,.065,2.70),'iron',shelter,.012)
box('end glazing',(1.845,5.83,1.38),(.012,1.56,2.30),'glass',shelter,.02)
for x in [-1.85,1.85]:
    box('canopy side rail',(x,5.65,2.72),(.075,2.08,.08),'iron',shelter,.018)
    box('back rail',(0,6.65,2.72),(3.82,.075,.08),'iron',shelter,.018)
vs=[];n=18
for x in [-2.05,2.05]:
    for j in range(n+1):
        y=4.60+j*2.35/n;z=2.79+.15*math.sin(j/n*math.pi);vs.append((x,y,z))
fs=[(j,j+1,n+j+2,n+j+1) for j in range(n)]
canopy=surface('formed shelter canopy',vs,fs,'iron',shelter,True)
sol=canopy.modifiers.new('sheet thickness','SOLIDIFY');sol.thickness=.035;bpy.context.view_layer.objects.active=canopy;bpy.ops.object.modifier_apply(modifier=sol.name)
box('drip edge',(0,4.60,2.76),(4.16,.055,.09),'edge',shelter,.015)
box('shelter fascia',(0,4.58,2.68),(4.13,.05,.11),'gold',shelter,.012)
box('poster enclosure',(.925,6.59,1.38),(.95,.06,1.60),'iron',shelter,.025)
# Poster fitted inside the rear glazing bay, facing the street.
box('poster panel',(.925,6.553,1.38),(.87,.009,1.42),'red',shelter,.014)
text('poster title','GLORYLAND',(.925,6.543,1.82),.115,'white',shelter)
text('poster line','FIGHT NIGHT',(.925,6.543,1.51),.11,'gold',shelter)
text('poster footer','BRUNO S GYM',(.925,6.543,.94),.085,'white',shelter)
for x in [.76,1.09]:box('poster gloves',(x,6.53,1.26),(.21,.024,.24),'gold',shelter,.075)

# Bench: curved armrests, open slats and braced steel feet.
for x in [-1.22,1.12]:
    box('bench foot',(x,6.00,.025),(.12,.64,.05),'iron',bench,.02)
    for y in [5.78,6.22]:rod('bench leg',(x,y,.05),(x,y,.47),.027,'iron',bench)
    tube('curved bench arm',[(x,6.25,.47),(x,6.29,.70),(x,6.23,.77),(x,5.80,.77),(x,5.72,.70),(x,5.72,.48)],.025,'iron',bench)
for y in [5.76+i*.105 for i in range(5)]:box('rounded timber seat slat',(-.05,y,.48),(2.65,.092,.045),'wood',bench,.015)
for z in [.65,.77,.89]:box('timber back slat',(-.05,6.31,z),(2.65,.045,.10),'wood',bench,.015)

# Route sign: cast stop plate, fitted timetable and a separate pole.
rod('galvanized stop pole',(3.12,4.08,0),(3.12,4.08,3.05),.041,'edge',stop)
rod('round stop enamel',(3.12,4.06,2.80),(3.12,3.995,2.80),.32,'blue',stop,40)
text('route number','12',(3.12,3.958,2.80),.29,'white',stop)
box('timetable frame',(3.12,4.045,1.67),(.47,.08,.78),'iron',stop,.035)
box('timetable sheet',(3.12,3.997,1.67),(.40,.005,.70),'white',stop,.012)
for txt,z,size in [('OLD TOWN',1.92,.055),('GLORYLAND',1.82,.045),('05:30 - 23:30',1.66,.044),('Every 12 min',1.56,.042),('ROUTE 12',1.39,.05)]:text('timetable',txt,(3.12,3.988,z),size,'blue',stop)

# Old Town lamp with turned base, tapered shaft, glazed lantern and shaped crown.
lx,ly=-3.5,4.15
lathe('turned cast iron base',[(0,.21),(.06,.23),(.12,.21),(.17,.16),(.45,.14),(.51,.11),(.56,.085),(3.25,.05),(3.30,.10),(3.36,.11)],(lx,ly),'iron',lamp)
lathe('lantern sill',[(3.34,.12),(3.40,.24),(3.45,.24)],(lx,ly),'iron',lamp)
lathe('warm lantern glass',[(3.45,.17),(3.90,.21)],(lx,ly),'light',lamp)
for i in range(6):
    a=i/6*math.tau;rod('lantern glazing rib',(lx+.17*math.cos(a),ly+.17*math.sin(a),3.44),(lx+.21*math.cos(a),ly+.21*math.sin(a),3.91),.012,'iron',lamp,8)
lathe('lantern roof',[(3.91,.25),(3.95,.28),(4.00,.26),(4.08,.15),(4.18,.055),(4.21,.018),(4.25,0)],(lx,ly),'iron',lamp)
light_anchor=group('Lamp_light_anchor',(lx,ly,3.70),root)
light_anchor['light_note']='Attach a budgeted actual warm scene light here; emissive mesh alone does not illuminate.'

# Litter bin with open ribbed shell and separate rim.
bx,by=-2.7,6.55
lathe('bin bottom',[(.035,.26),(.08,.27),(.13,.25)],(bx,by),'iron',binroot)
for i in range(20):
    a=i/20*math.tau;rod('bin vertical slat',(bx+.25*math.cos(a),by+.25*math.sin(a),.12),(bx+.27*math.cos(a),by+.27*math.sin(a),.78),.018,'iron',binroot,8)
lathe('bin rolled rim',[(.75,.27),(.78,.29),(.82,.29),(.84,.27),(.82,.25)],(bx,by),'iron',binroot)
lathe('inner liner',[(.12,.23),(.76,.245)],(bx,by),'black',binroot)

# Batch each independently reusable component by material, preserving the root anchors.
for parent in [road,shelter,lamp,stop,bench,binroot]:
    groups={}
    for o in list(parent.children):
        if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
    for key,obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs:o.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=parent.name+'__'+key

# Give each component a practical placement pivot without changing its assembled position.
for parent,origin in [(shelter,(0,5.65,0)),(lamp,(-3.5,4.15,0)),(stop,(3.12,4.08,0)),(bench,(-.05,6,0)),(binroot,(-2.7,6.55,0))]:
    bpy.context.view_layer.update();world=[(o,o.matrix_world.copy()) for o in parent.children]
    parent.location=origin;bpy.context.view_layer.update()
    for o,transform in world:o.matrix_world=transform
bpy.context.view_layer.update();transform=light_anchor.matrix_world.copy();light_anchor.parent=lamp;light_anchor.matrix_world=transform

objects=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'gloryland-station.glb'),use_selection=True,export_format='GLB',export_yup=True,export_extras=True,export_animations=False)
stats={'source_sha':'b6a19c2424fc179af6d702137c391b8677e25fd9','remote_checked':'dab12f682e58f68f1d35398069aa606fe15001fa','authoring':'Blender '+bpy.app.version_string,'triangles':0,'mesh_nodes':0,'glb_bytes':(OUT/'gloryland-station.glb').stat().st_size,'textures':'6 original 1024px PBR maps, packed into GLB','game_integration':False,'physical_phone':'NOT VERIFIED'}
for o in objects:
    if o.type=='MESH':o.data.calc_loop_triangles();stats['triangles']+=len(o.data.loop_triangles);stats['mesh_nodes']+=1
(OUT/'manifest.json').write_text(json.dumps(stats,indent=2)+'\n')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gloryland-station.blend'))
print('STATION_MANIFEST '+json.dumps(stats))
