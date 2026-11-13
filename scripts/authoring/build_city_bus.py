"""Original Gloryland arrival bus. Offline authoring, Blender 4.3.2, no add-ons.

blender -b --python scripts/authoring/build_city_bus.py -- --render
X forward, Z up in Blender; exported GLB is X forward, Y up, curb doors at -Z.
This is an isolated art candidate. Nothing in the game imports it yet.
"""
import bpy, math, json, sys
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/street/ch01-bus'
QA = ROOT / 'qa/city-art/bus'
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.5, metal=0, alpha=1, emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    # Explicit sRGB -> scene-linear, exported by Blender as linear glTF factors.
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    p.inputs['Base Color'].default_value=(*rgb,alpha)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    p.inputs['Alpha'].default_value=alpha
    if alpha<1: m.surface_render_method='DITHERED'; m.use_transparency_overlap=False
    if emission:
        p.inputs['Emission Color'].default_value=(*rgb,1)
        p.inputs['Emission Strength'].default_value=emission
    return m

M={
 'ochre':mat('01 enamel · municipal ochre','#ba782a',.36,.16),
 'cream':mat('02 warm ivory · roof and pillars','#ded9c9',.43,.1),
 'teal':mat('03 fleet stripe · deep petrol','#1e4549',.4,.18),
 'rubber':mat('04 rubber seals and tires','#202426',.88),
 'metal':mat('05 brushed aluminum','#8b969d',.34,.78),
 'dark':mat('06 graphite chassis','#343d42',.62,.35),
 'glass':mat('07 lightly tinted safety glass','#8bb8c0',.18,.05,.24),
 'seat':mat('08 woven petrol upholstery','#33535e',.93),
 'rail':mat('09 yellow powder-coated handrails','#d3a541',.48,.15),
 'white':mat('10 warm headlamps','#fff0c8',.28,0,1,1.2),
 'red':mat('11 red rear lenses','#a62122',.3,0,1,.5),
 'amber':mat('12 amber indicators','#e5a23e',.3,0,1,.5),
 'sign':mat('13 amber route lettering','#ffe3a2',.52,0,1,.4),
}

def empty(name,pos=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o)
    o.location=pos; o.parent=parent; return o

root=empty('Gloryland_Bus_12')
root['asset_version']='0.1-review'
root['ground_y']=0.0
root['wheel_radius_m']=.515
root['door_clear_width_m']=1.12
root['story']='Chapter 1 / The Dream / beat 0'
static=empty('Body',parent=root)

def finish(o,name,material,parent=static):
    o.name=name; o.parent=parent
    if material: o.data.materials.append(M[material])
    return o

def box(name,pos,size,material,bevel=.025,parent=static):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object
    o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('manufactured edge radii','BEVEL'); b.width=bevel;b.segments=2
        bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('weighted panel normals','WEIGHTED_NORMAL');n.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,material,parent)

def mesh(name,vs,fs,material,parent=static,smooth=False):
    data=bpy.data.meshes.new(name); data.from_pydata(vs,[],fs);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);finish(o,name,material,parent)
    for f in data.polygons:f.use_smooth=smooth
    return o

def rod(name,a,b,r,material,parent=static,sides=10):
    a,b=Vector(a),Vector(b);d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y')
    finish(o,name,material,parent)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o

def tube(name,points,r,material,parent=static):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,material,parent)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def lettering(name,text,pos,size,material,rot,parent=static):
    c=bpy.data.curves.new(name,'FONT');c.body=text;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.0004;c.resolution_u=3
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=rot;finish(o,name,material,parent)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

# Thin chassis / actual passenger floor. No opaque block behind the glazing.
box('steel underframe',(0,0,.41),(10.5,2.3,.19),'dark',.07)
floor_pan=box('non-slip passenger floor',(0,0,.66),(10.3,2.28,.12),'dark',.015)
for a,b in [(-1.02,.22),(3.86,5.12)]:
    cutter=box('temporary stairwell cut',((a+b)/2,1.08,.66),(b-a,.74,.45),'dark',0)
    bpy.context.view_layer.objects.active=floor_pan
    mod=floor_pan.modifiers.new('recessed stairwell','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
box('interior aisle',(0,0,.725),(9.5,.65,.012),'rubber',0)
box('rear engine housing',(-4.54,0,.94),(1.25,2.24,.43),'dark',.07)

# Body panels have a sampled continuous wheel-arch silhouette, not overlaid wheels.
wheel_x=(-3.25,3.18)
door_ranges=[(-1.02,.22),(3.86,5.12)]
for side in (-1,1):
    intervals=[(-5.22,5.22)] if side==-1 else [(-5.22,-1.02),(.22,3.86),(5.12,5.22)]
    for idx,(lo,hi) in enumerate(intervals):
        n=max(8,int((hi-lo)/.035));vs=[]
        for i in range(n+1):
            x=lo+(hi-lo)*i/n;bottom=.42
            for wx in wheel_x:
                dx=x-wx
                if abs(dx)<.625:bottom=max(bottom,.515+math.sqrt(.625**2-dx*dx))
            # Slightly crowned coachwork, continuous inward-turned sill.
            for z,y in [(bottom,1.205),(max(bottom+.025,.52),1.245),(1.44,1.25)]:vs.append((x,side*y,z))
        fs=[]
        for i in range(n):
            for j in range(2):
                f=(i*3+j,(i+1)*3+j,(i+1)*3+j+1,i*3+j+1)
                fs.append(f if side<0 else f[::-1])
        p=mesh('formed lower side panel',vs,fs,'ochre',smooth=True)
        sol=p.modifiers.new('panel thickness','SOLIDIFY');sol.thickness=.024
        bpy.context.view_layer.objects.active=p;bpy.ops.object.modifier_apply(modifier=sol.name)
        box('upper belt line',((lo+hi)/2,side*1.25,1.46),(hi-lo,.045,.11),'teal',.015)
        box('aluminum belt molding',((lo+hi)/2,side*1.276,1.52),(hi-lo,.018,.018),'metal',.007)
    for wx in wheel_x:
        points=[(wx+math.cos(t)*.634,side*1.26,.515+math.sin(t)*.634) for t in [i*math.pi/32 for i in range(33)]]
        tube('rolled wheel arch trim',points,.025,'rubber')
        box('mud flap',(wx-.57,side*1.11,.38),(.045,.25,.33),'rubber',.006)

# Window belt with seated interior visible through each separate pane.
for side in (-1,1):
    spans=[(-5.14,-3.92),(-3.83,-2.48),(-2.39,-1.11),(.31,1.87),(1.96,3.77)]
    if side<0:spans += [(-1.02,.22),(3.86,5.10)]
    for i,(a,b) in enumerate(spans):
        box('window EPDM surround',((a+b)/2,side*1.228,2.105),(b-a,.052,1.09),'rubber',.075)
        # Hollow gasket: replace its opaque middle with an actual opening.
        o=bpy.context.object
        cutter=box('temporary window cut',((a+b)/2,side*1.228,2.105),(b-a-.075,.25,1.015),'rubber',.05)
        bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('glazing aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
        bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
        box('window pane',((a+b)/2,side*1.231,2.105),(b-a-.08,.008,1.01),'glass',.04)
        box('sliding ventilator rail',((a+b)/2,side*1.241,2.40),(b-a-.045,.014,.018),'metal',.004)
        box('pillar',(a-.043,side*1.23,2.1),(.086,.10,1.20),'cream',.018)
    box('cant rail',(0,side*1.225,2.72),(10.35,.1,.14),'cream',.035)
    box('rain gutter',(0,side*1.27,2.81),(10.39,.045,.045),'metal',.012)

# Crowned roof and curved ends; authored cross-section rather than a slab.
vs=[];rows=13;cols=25
for i in range(rows):
    x=-5.22+10.44*i/(rows-1);end=max(0,(abs(x)-4.85)/.37)
    for j in range(cols):
        y=-1.25+2.5*j/(cols-1);z=2.82+.16*math.cos(y/1.25*math.pi/2)-.10*end**2
        vs.append((x,y,z))
fs=[(i*cols+j,(i+1)*cols+j,(i+1)*cols+j+1,i*cols+j+1) for i in range(rows-1) for j in range(cols-1)]
mesh('continuous crowned roof',vs,fs,'cream',smooth=True)
box('roof ventilation unit',(-2.0,0,3.01),(2.3,1.35,.25),'cream',.12)
for x in [-2.8+i*.12 for i in range(14)]:box('AC vent slat',(x,0,3.143),(.038,.87,.009),'dark',.003)
box('escape hatch',(.9,0,2.99),(.86,.87,.055),'metal',.045)

# Front and rear molded fascia, glazing, lights and bumpers.
for direction in (-1,1):
    x=direction*5.23
    box('nose fascia' if direction>0 else 'rear engine panel',(x,0,.95),(.20,2.43,.99),'ochre',.12)
    box('crash bumper',(direction*5.38,0,.46),(.19,2.48,.22),'rubber',.075)
    box('bumper rub strip',(direction*5.482,0,.49),(.012,2.15,.035),'metal',.007)
    box('upper windshield seal',(direction*5.196,0,2.12),(.08,2.26,1.18),'rubber',.09)
    o=bpy.context.object
    cutter=box('temporary aperture',(direction*5.196,0,2.12),(.3,2.12,1.045),'rubber',.06)
    bpy.context.view_layer.objects.active=o;m=o.modifiers.new('windscreen aperture','BOOLEAN');m.operation='DIFFERENCE';m.object=cutter
    bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)
    box('windscreen',(direction*5.20,0,2.12),(.008,2.13,1.05),'glass',.06)
    box('upper front header',(direction*5.18,0,2.78),(.16,2.27,.20),'cream',.05)
    for s in (-1,1):
        box('curved A pillar',(direction*5.16,s*1.17,2.08),(.18,.13,1.24),'cream',.06)
        box('lamp housing',(direction*5.345,s*.91,.97),(.07,.43,.25),'dark',.075)
        for yy in (-.104,.104):
            rod('headlamp lens' if direction>0 else 'tail lamp',(direction*5.37,s*.91+yy,.98),(direction*5.405,s*.91+yy,.98),.075,'white' if direction>0 else 'red',sides=20)
        box('indicator',(direction*5.36,s*.96,1.20),(.04,.22,.07),'amber',.02)
    box('registration mount',(direction*5.348,0,.65),(.035,.63,.14),'dark',.008)
    lettering('plate','GL 012',(direction*5.37,0,.65),.095,'cream',(math.pi/2,0,direction*math.pi/2))
    for z in [.82+i*.045 for i in range(7)]:box('engine grille',(direction*5.337,0,z),(.025,1.03,.014),'dark',.004)

# Driver's front destination display and windshield wipers.
box('route display',(5.247,0,2.52),(.055,1.96,.27),'rubber',.025)
lettering('route 12','12  GLORYLAND',(5.28,0,2.52),.175,'sign',(math.pi/2,0,math.pi/2))
for sy in (-.5,.5):
    rod('wiper linkage',(5.265,sy-.18,1.60),(5.272,sy+.15,2.11),.012,'dark')
    rod('wiper blade',(5.28,sy+.02,1.89),(5.28,sy+.27,2.31),.017,'rubber')
for side in (-1,1):
    tube('mirror arm',[(4.96,side*1.2,2.6),(5.13,side*1.51,2.62),(5.35,side*1.55,2.34)],.024,'dark')
    box('mirror casing',(5.32,side*1.56,2.24),(.14,.24,.37),'rubber',.06)
    box('mirror reflective inset',(5.238,side*1.56,2.24),(.008,.18,.30),'metal',.04)

# Rim profiles, recesses, lugs and fine treads all belong to wheel pivots.
def wheel(wx,side):
    steer=empty(('Front' if wx>0 else 'Rear')+('_curb' if side>0 else '_road')+'_steer',(wx,side*1.09,.515),root)
    pivot=empty(steer.name.replace('_steer','_wheel'),parent=steer)
    profile=[(-.19,.32),(-.19,.43),(-.15,.50),(-.10,.515),(.10,.515),(.15,.50),(.19,.43),(.19,.32)]
    vs=[];N=48
    for y,r in profile:
        for i in range(N):
            a=i/N*math.tau;vs.append((r*math.sin(a),y,r*math.cos(a)))
    fs=[]
    for j in range(len(profile)-1):
        for i in range(N):fs.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    mesh('rounded radial tire',vs,fs,'rubber',pivot,True)
    rod('rim barrel',(0,-.16,0),(0,.16,0),.325,'metal',pivot,32)
    rod('recessed wheel dish',(0,side*.17,0),(0,side*.183,0),.25,'dark',pivot,32)
    rod('hub cap',(0,side*.182,0),(0,side*.205,0),.135,'metal',pivot,24)
    for i in range(10):
        a=i/10*math.tau;x,z=math.sin(a)*.19,math.cos(a)*.19
        rod('wheel lug',(x,side*.18,z),(x,side*.207,z),.025,'metal',pivot,6)
    for i in range(48):
        a=i/48*math.tau
        for yy in (-.075,.075):
            o=box('tread siping',(.515*math.sin(a),yy,.515*math.cos(a)),(.027,.067,.008),'dark',0,pivot)
            o.rotation_euler[1]=a
    return pivot
wheels=[wheel(x,s) for x in wheel_x for s in (-1,1)]

# Interior wheel housings meet the floor and hide the tire crown from passengers.
for x in wheel_x:
    for s in (-1,1):
        radius=.615;angle=math.asin((.72-.515)/radius)
        arc=[(x+radius*math.cos(t),.515+radius*math.sin(t)) for t in [angle+(math.pi-2*angle)*i/20 for i in range(21)]]
        vs=[(xx,y,zz) for y in (s*.78,s*1.22) for xx,zz in arc]
        fs=[(i,i+1,22+i,21+i) for i in range(20)]
        fs.extend([tuple(range(20,-1,-1)),tuple(range(21,42))])
        mesh('integrated cabin wheel housing',vs,fs,'dark',smooth=True)

# Seats and grab rails: fitted, visible interior, no passengers at this milestone.
for x in [-4.05,-2.35,-1.5,.70,1.55,2.40]:
    for s in (-1,1):
        # Keep curb-side entry aisle clear.
        for y in [s*.68,s*.99]:
            box('contoured seat cushion',(x,y,1.04),(.43,.30,.12),'seat',.06)
            seat=box('seat back',(x-.23,y,1.37),(.095,.31,.61),'seat',.05);seat.rotation_euler[1]=-.10
            rod('seat pedestal',(x-.06,y,.73),(x-.06,y,.99),.024,'metal')
            tube('seat top grip',[(x-.25,y-.12,1.60),(x-.27,y-.12,1.71),(x-.27,y+.12,1.71),(x-.25,y+.12,1.60)],.014,'rail')
for y in (-.35,.35):
    rod('overhead grab rail',(-4.65,y,2.51),(4.55,y,2.51),.022,'rail')
    for x in (-3.8,-1.2,.4,2.2,3.7):rod('standing grab pole',(x,y,.75),(x,y,2.62),.023,'rail')
box('driver dashboard',(4.89,-.55,1.31),(.43,1.08,.24),'dark',.065)
box('driver seat',(4.10,-.7,1.08),(.53,.5,.14),'seat',.065)
box('driver backrest',(3.86,-.7,1.44),(.13,.5,.66),'seat',.055)
rod('steering column',(4.65,-.67,.85),(4.50,-.67,1.40),.032,'dark')
bpy.ops.mesh.primitive_torus_add(major_radius=.18,minor_radius=.018,major_segments=24,minor_segments=8,location=(4.5,-.67,1.42))
finish(bpy.context.object,'steering wheel','rubber')

# Two split-leaf plug doors. Each leaf has its own outward hinge and baked clip.
doors=[]
for entrance,(lo,hi) in enumerate(door_ranges):
    mid=(lo+hi)/2
    for sy,z in [(1.19,.36),(.95,.54),(.71,.72)]:
        box('entry tread',(mid,sy,z-.035),(hi-lo,.25,.07),'dark',.014)
        box('yellow step nosing',(mid,sy+.12,z+.006),(hi-lo,.025,.012),'rail',.004)
    for leaf in (-1,1):
        hinge_x=lo if leaf<0 else hi
        pivot=empty(('Entry' if entrance==1 else 'Exit')+('_left' if leaf<0 else '_right')+'_door',(hinge_x,1.25,.4),root)
        width=(hi-lo)/2-.018;cx=-leaf*width/2
        box('door lower skin',(cx,0,.43),(width,.055,.86),'ochre',.018,pivot)
        for ex in (-width/2,width/2):box('door vertical seal',(cx+ex,0,1.14),(.035,.06,2.28),'rubber',.008,pivot)
        for z in (.88,2.28):box('door horizontal seal',(cx,0,z),(width,.06,.035),'rubber',.008,pivot)
        box('door glazing',(cx,.003,1.57),(width-.04,.008,1.35),'glass',.02,pivot)
        rod('door handle',(cx,.065,1.16),(cx,.065,1.40),.018,'rail',pivot)
        pivot.rotation_euler.z=0;pivot.keyframe_insert('rotation_euler',frame=1)
        pivot.rotation_euler.z=-leaf*math.radians(82);pivot.keyframe_insert('rotation_euler',frame=40)
        pivot.keyframe_insert('rotation_euler',frame=90)
        pivot.rotation_euler.z=0;pivot.keyframe_insert('rotation_euler',frame=130)
        pivot.animation_data.action.name='Doors_open_hold_close'
        doors.append(pivot)
empty('Entry_curb_marker',(4.49,1.95,.15),root)
empty('Entry_floor_marker',(4.49,.60,.72),root)

# Panel service seams, latches, reflectors, fleet graphics.
for side in (-1,1):
    for x in [-4.78,-4.2,-2.3,-1.15,.3,1.3,2.45,3.8]:
        if side>0 and any(a<x<b for a,b in door_ranges):continue
        box('service panel join',(x,side*1.254,.91),(.009,.008,.83),'dark',.002)
        box('service hatch latch',(x+.13,side*1.267,1.24),(.085,.018,.022),'metal',.004)
    for x in (-4.72,-1.3,1.4,4.87):box('side marker',(x,side*1.277,.58),(.12,.02,.04),'amber',.012)
    lettering('fleet name','GLORYLAND TRANSIT',(-.05,side*1.278,1.18),.16,'cream',(math.pi/2,0,math.pi if side>0 else 0))
    lettering('fleet number','012',(-4.6,side*1.278,1.31),.11,'cream',(math.pi/2,0,math.pi if side>0 else 0))
for z in [.74+i*.07 for i in range(8)]:box('rear side cooling grille',(-4.62,-1.271,z),(.72,.012,.025),'dark',.006)

# Consolidate by material within each moving assembly. Static details are not hundreds of draw calls.
bpy.context.scene.frame_set(1)
for parent in [static]+wheels+doors:
    bymat={}
    for o in list(parent.children):
        if o.type=='MESH':bymat.setdefault(o.data.materials[0].name,[]).append(o)
    for material,obs in bymat.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs:o.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join()
        obs[0].name=parent.name+'__'+material.split(' · ')[0]

# Wheel rolling clip (root displacement deliberately owned by story movement).
for o in wheels:
    o.rotation_euler.y=0;o.keyframe_insert('rotation_euler',frame=1)
    o.rotation_euler.y=math.tau;o.keyframe_insert('rotation_euler',frame=61)
    o.animation_data.action.name='Wheels_one_revolution'
    for fc in o.animation_data.action.fcurves:
        for k in fc.keyframe_points:k.interpolation='LINEAR'
# Shared NLA names merge the four separate pivots into two useful glTF clips.
for o in doors+wheels:
    action=o.animation_data.action
    track=o.animation_data.nla_tracks.new()
    track.name='Doors_open_hold_close' if o in doors else 'Wheels_one_revolution'
    track.strips.new(track.name,1,action)
    o.animation_data.action=None
bpy.context.scene.frame_set(1)
bpy.context.scene.render.fps=30
bpy.context.scene.frame_end=130

# Export only asset objects. Standard glTF PBR; no required decoders / new shader extensions.
bpy.ops.object.select_all(action='DESELECT')
asset_objects=[root]+list(root.children_recursive)
for o in asset_objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'gloryland-bus.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_extras=True,export_materials='EXPORT')

stats={'baseline_sha':'b6a19c2424fc179af6d702137c391b8677e25fd9','authoring':'Blender '+bpy.app.version_string,'triangles':0,'mesh_nodes':0,'materials':len(M),'glb_bytes':(OUT/'gloryland-bus.glb').stat().st_size,'physical_phone':'NOT VERIFIED','game_integration':False,'units':'metres','length_m':10.96,'width_m_excluding_mirrors':2.57,'height_m':3.147}
for o in asset_objects:
    if o.type=='MESH':o.data.calc_loop_triangles();stats['triangles']+=len(o.data.loop_triangles);stats['mesh_nodes']+=1
(OUT/'manifest.json').write_text(json.dumps(stats,indent=2)+'\n')

# Render-only neutral street surface and lights; not exported in the game asset.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32
scene.cycles.use_denoising=False;scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.37,.46,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
floor=mat('QA asphalt','#596268',.92);M['floor']=floor
ground=box('QA ground',(0,0,-.055),(200,200,.1),'floor',0,parent=None)
def light(name,kind,loc,energy,color,size):
    d=bpy.data.lights.new(name,kind);d.energy=energy;d.color=color
    if kind=='AREA':d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler();return o
light('large sky key','AREA',(3,-7,12),2400,(1,.91,.79),8)
light('soft fill','AREA',(-4,4,7),1700,(.72,.85,1),7)
bpy.ops.object.camera_add(location=(12,14,6.8));cam=bpy.context.object;scene.camera=cam;cam.data.lens=48
def camera(loc,target=(0,0,1.35)):
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gloryland-bus.blend'))
if '--render' in sys.argv:
    for name,loc,frame in [('front-curb',(12,14,6.8),1),('rear-road',(-12,-14,6.4),1),('entry-open',(8.5,10,3.4),62)]:
        scene.frame_set(frame);camera(loc);scene.render.filepath=str(QA/(name+'.png'));bpy.ops.render.render(write_still=True)
print('CITY_BUS_MANIFEST '+json.dumps(stats))
