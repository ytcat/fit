"""Build original connected broadleaf street trees with a three-bone breeze.

Run: python scripts/authoring/build_tree_textures.py
     blender -b -t 2 --python scripts/authoring/build_street_tree.py
The editable source retains graph meshes and construction parameters in a hidden
collection. Skin + Catmull-Clark creates a continuous woody surface at forks.
"""
import bpy, bmesh, math, random, json, sys, struct
from pathlib import Path
import numpy as np
from mathutils import Vector

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from city_blender_helpers import material, mesh, textured, group
OUT=HERE.parents[1]/'assets/street/ch01-trees'
TEX=OUT/'textures'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.unit_settings.scale_length=1
bpy.context.scene.render.fps=24
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=97
source=bpy.data.collections.new('EDITABLE branch skeletons (hidden)')
bpy.context.scene.collection.children.link(source)
source.hide_render=True
source.hide_viewport=True
SEED=61309

bark=textured('Directional rough bark',TEX,'bark')
bark.use_backface_culling=True
leaf_mats=[]
for name,tint in [('sun leaf',(1.0,1.0,.91,1)),('middle leaf',(.86,.94,.78,1)),('shade leaf',(.71,.84,.66,1))]:
    m=material(name,'#ffffff',.88)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=tint
    n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(TEX/'leaf-color.png'),check_existing=True)
    # glTF exports the linked base-color texture with a multiplicative factor.
    mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=tint
    m.node_tree.links.new(n.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
    m.use_backface_culling=False
    leaf_mats.append(m)
soilmat=material('tree pit earth','#51483a',.98)
stonemat=material('tree pit weathered stone','#8a897c',.96)

def branch_graph():
    rng=random.Random(SEED)
    verts=[];edges=[];radii=[];lengths=[];parents=[];leaf_sites=[]
    def node(pos,radius,parent=None):
        i=len(verts);verts.append(Vector(pos));radii.append(radius);parents.append(parent)
        lengths.append(0 if parent is None else lengths[parent]+(verts[i]-verts[parent]).length)
        if parent is not None:edges.append((parent,i))
        return i
    heights=[-.18,.035,.27,.72,1.28,1.86,2.38,2.88,3.35,3.80,4.22,4.62,4.99,5.33]
    widths=[.19,.245,.195,.175,.16,.143,.126,.111,.094,.079,.061,.044,.027,.010]
    trunk=[]
    for j,(z,r) in enumerate(zip(heights,widths)):
        trunk.append(node((.028*z+.045*math.sin(z*1.1),.048*math.sin(z*.9),z),r,trunk[-1] if trunk else None))
    # The buttress roots share the same Skin surface and disappear into soil.
    for k in range(4):
        a=k*math.tau/4+.34
        p=trunk[1]
        for dist,z,r in [(.27,.015,.10),(.45,-.055,.055),(.66,-.13,.012)]:
            p=node((math.cos(a)*dist,math.sin(a)*dist,z),r,p)
    # Main scaffold branches rise first, then spread; no orthogonal cylinders.
    for k in range(10):
        ti=6+k//2 if k<8 else 11+(k-8)
        start=trunk[ti];origin=verts[start];a=.30+k*2.39996323
        reach=[1.24,1.36,1.40,1.27,1.29,1.10,.97,.92,.67,.57][k]
        rise=[1.36,1.26,1.19,1.24,1.04,1.07,.94,.83,.70,.59][k]
        primary=[start]
        for j in range(1,5):
            t=j/4;angle=a+.13*math.sin(t*math.pi)
            p=origin+Vector((math.cos(angle)*reach*t,math.sin(angle)*reach*t,rise*(1.22*t-.22*t*t)))
            primary.append(node(p,max(.009,radii[start]*.63*(1-t)**.85),primary[-1]))
        for j in [2,3,4]:
            for side in [-1,1]:
                start2=primary[j];origin2=verts[start2]
                angle=a+side*(.68+.17*rng.random())
                reach2=.42+.12*rng.random()
                rise2=.25+.22*rng.random()
                sec=[start2]
                for s in range(1,4):
                    t=s/3;p=origin2+Vector((math.cos(angle)*reach2*t,math.sin(angle)*reach2*t,rise2*t))
                    sec.append(node(p,.018*(1-t)+.0038,sec[-1]))
                for s in [1,2,3]:
                    for side2 in [-1,1]:
                        a3=angle+side2*(.73+rng.random()*.30)
                        reach3=.24+.12*rng.random();rise3=.10+.19*rng.random()
                        p0=verts[sec[s]];direction=Vector((math.cos(a3)*reach3,math.sin(a3)*reach3,rise3))
                        p=sec[s]
                        for step in [1,2]:
                            t=step/2;p=node(p0+direction*t+Vector((0,0,.028*math.sin(t*math.pi))),.0052*(1-t)+.0018,p)
                        leaf_sites.append((p0,direction,rng.random(),k))
    return verts,edges,radii,lengths,leaf_sites

VS,ES,RS,LS,SITES=branch_graph()

def bark_uv(o):
    # UV V follows cumulative graph distance. Each face is projected onto its
    # closest actual branch segment; U is angular, with local seam unwrapping.
    uv=o.data.uv_layers.new(name='branch cylindrical UV')
    aa=np.array([VS[a] for a,b in ES]);bb=np.array([VS[b] for a,b in ES]);dd=bb-aa
    l2=np.sum(dd*dd,axis=1)
    for f in o.data.polygons:
        center=np.array(f.center);t=np.clip(np.sum((center-aa)*dd,axis=1)/l2,0,1)
        dist=np.sum((center-aa-dd*t[:,None])**2,axis=1)
        idx=int(np.argmin(dist));a,b=ES[idx]
        axis=(VS[b]-VS[a]).normalized();ref=Vector((1,0,0)) if abs(axis.x)<.8 else Vector((0,1,0))
        ex=axis.cross(ref).normalized();ey=axis.cross(ex)
        vals=[]
        for li in f.loop_indices:
            p=o.data.vertices[o.data.loops[li].vertex_index].co;rel=p-VS[a]
            u=math.atan2(rel.dot(ey),rel.dot(ex))/math.tau+.5
            v=(LS[a]+rel.dot(axis))/.8
            vals.append([li,u,v])
        if max(v[1] for v in vals)-min(v[1] for v in vals)>.5:
            for v in vals:
                if v[1]<.5:v[1]+=1
        for li,u,v in vals:uv.data[li].uv=(u,v)

def woody(root,low):
    data=bpy.data.meshes.new(root.name+' branch graph');data.from_pydata(VS,ES,[]);data.update()
    o=bpy.data.objects.new(root.name+' connected trunk and branches',data);bpy.context.collection.objects.link(o);o.parent=root;o.data.materials.append(bark)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    skin=o.modifiers.new('Continuous welded branch junctions','SKIN')
    for i,r in enumerate(RS):o.data.skin_vertices[0].data[i].radius=(r,r*(.92+.07*math.sin(i)))
    o.data.skin_vertices[0].data[0].use_root=True
    skin.use_smooth_shade=True
    sub=o.modifiers.new('Organic branch subdivision','SUBSURF');sub.levels=1;sub.render_levels=sub.levels
    # Retain the editable graph and live modifiers in the packed source only.
    original=o.copy();original.data=o.data.copy();source.objects.link(original);original.name=root.name+' editable Skin graph';original.hide_render=True;original.hide_set(True)
    for mod in list(o.modifiers):
        label=mod.name
        bpy.ops.object.modifier_apply(modifier=mod.name)
        print('TREE_STAGE',root.name,label,'vertices',len(o.data.vertices),'faces',len(o.data.polygons),flush=True)
    o.data.calc_loop_triangles()
    dec=o.modifiers.new('Preserve form reduce branch surface','DECIMATE');dec.ratio=min(1,(8000 if low else 18000)/len(o.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=dec.name)
    # Skin can leave isolated junction vertices and tiny open junction loops.
    # Remove those construction remnants and close the surface before UV/rigging.
    bm=bmesh.new();bm.from_mesh(o.data)
    loose=[v for v in bm.verts if not v.link_faces]
    if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    boundaries=[e for e in bm.edges if e.is_boundary]
    if boundaries:bmesh.ops.holes_fill(bm,edges=boundaries,sides=12)
    # A non-planar five-edge twig-tip loop can defeat the planar hole solver.
    # Close each remaining simple boundary with a tiny triangulated fan.
    remaining=set(e for e in bm.edges if e.is_boundary)
    while remaining:
        edge=remaining.pop();component=[edge];pending=[edge]
        while pending:
            for v in pending.pop().verts:
                for e in v.link_edges:
                    if e in remaining:remaining.remove(e);component.append(e);pending.append(e)
        ring=set(v for e in component for v in e.verts)
        assert all(sum(e in component for e in v.link_edges)==2 for v in ring),'Non-simple twig boundary'
        center=bm.verts.new(sum((v.co for v in ring),Vector())/len(ring))
        for e in component:bm.faces.new((e.verts[0],e.verts[1],center))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    print('TREE_STAGE',root.name,'reduced wood vertices',len(o.data.vertices),'faces',len(o.data.polygons),flush=True)
    for f in o.data.polygons:f.use_smooth=True
    o.data.update();bark_uv(o);o.select_set(False)
    return o

def foliage(root,low):
    rng=random.Random(SEED+1);verts=[];faces=[];uvs=[];shade=[]
    # Each final twig carries an alternating fan; leaves taper to pointed tips.
    for si,(origin,axis,jitter,k) in enumerate(SITES):
        normal=axis.normalized();horizontal=Vector((-normal.y,normal.x,0)).normalized()
        for step in range(4):
            for side in [-1,1]:
                t=.20+.21*step+(.055 if side==1 else 0)
                length=.16+.075*rng.random();width=length*(.60+.10*rng.random())
                phase=rng.random();pick=rng.random();tilt=rng.random()
                if low and (step+si+(side==1))%2:continue
                base=origin+axis*t+Vector((0,0,.028*math.sin(t*math.pi)))
                direction=(normal*(.15+.55*phase)+horizontal*(side*(.65+.3*phase))+Vector((0,0,-.40+1.05*tilt))).normalized()
                across=Vector((-direction.y,direction.x,0)).normalized()
                roll=(phase-.5)*1.8;across=(across*math.cos(roll)+Vector((0,0,1))*math.sin(roll)).normalized()
                length*=1.08 if low else 1
                width*=1.15 if low else 1
                ids=[]
                # Three sections, central raised vein, pointed base/tip.
                coords=[(0,0,0),(.32,-.43,-.035),(.32,0,.035),(.32,.43,-.035),(.72,-.38,-.055),(.72,0,.035),(.72,.38,-.055),(1,0,-.075)]
                for along,wide,bend in coords:
                    p=base+direction*(along*length)+across*(wide*width)+Vector((0,0,bend*length))
                    ids.append(len(verts));verts.append(p);uvs.append((.5+wide,along))
                for f in [(0,1,2),(0,2,3),(1,4,5,2),(2,5,6,3),(4,7,5),(5,7,6)]:
                    faces.append(tuple(ids[i] for i in f));shade.append(0 if pick>.75 else 2 if pick<.22 else 1)
    o=mesh(root.name+' directional opaque leaf fans',verts,faces,None,root,True)
    for m in leaf_mats:o.data.materials.append(m)
    for f,m in zip(o.data.polygons,shade):f.material_index=m
    uv=o.data.uv_layers.new(name='leaf surface UV')
    for loop in o.data.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
    o['leaf_count']=len(verts)//8;o['foliage_alpha']='OPAQUE; geometric leaf outlines'
    return o

def rig(root,objects):
    arm=bpy.data.armatures.new(root.name+' breeze bones');o=bpy.data.objects.new(root.name+' Breeze rig',arm);bpy.context.collection.objects.link(o);o.parent=root
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    parent=None
    for name,z0,z1 in [('base',0,2.2),('mid',2.2,4.3),('crown',4.3,6.4)]:
        bone=arm.edit_bones.new(name);bone.head=(0,0,z0);bone.tail=(0,0,z1)
        if parent:bone.parent=parent;bone.use_connect=True
        parent=bone
    bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
    for ob in objects:
        # glTF expects the armature to own skinned mesh nodes.
        world=ob.matrix_world.copy();ob.parent=o;ob.matrix_world=world
        groups=[ob.vertex_groups.new(name=x) for x in ['base','mid','crown']]
        for v in ob.data.vertices:
            z=v.co.z
            # Smooth height transitions preserve consistent branch/leaf motion.
            if z<=1.8:weights=[1,0,0]
            elif z<3.3:
                t=(z-1.8)/1.5;t=t*t*(3-2*t);weights=[1-t,t,0]
            elif z<5.4:
                t=(z-3.3)/2.1;t=t*t*(3-2*t);weights=[0,1-t,t]
            else:weights=[0,0,1]
            for g,w in zip(groups,weights):
                if w>0:g.add([v.index],w,'REPLACE')
        mod=ob.modifiers.new('Breeze deformation','ARMATURE');mod.object=o
    action=bpy.data.actions.new(root.name+' breeze action');o.animation_data_create();o.animation_data.action=action
    for frame in range(1,98,6):
        t=(frame-1)/96*math.tau
        for name,amplitude,phase in [('mid',.65,0),('crown',1.05,.65)]:
            b=o.pose.bones[name];b.rotation_mode='XYZ'
            b.rotation_euler=(math.radians(amplitude)*math.sin(t+phase),0,math.radians(amplitude*.52)*math.sin(t+phase+.8))
            b.keyframe_insert(data_path='rotation_euler',frame=frame,group=name)
    for fc in action.fcurves:
        for key in fc.keyframe_points:key.interpolation='LINEAR'
    track=o.animation_data.nla_tracks.new();track.name='Breeze'
    strip=track.strips.new('Breeze',1,action);strip.name='Breeze';o.animation_data.action=None
    root['breeze']='4 second looping skeletal motion; fixed base, <=1.05 degree per animated Euler axis; artistic motion, not physics'
    return o

def pit(root):
    rng=random.Random(SEED+3)
    # Compact soil mound, below the paving plane; no root-through-grate conflict.
    v=[(0,0,-.025)];n=24
    for i in range(n):
        a=i*math.tau/n;r=.73+.02*rng.random();v.append((math.cos(a)*r,math.sin(a)*r,-.045))
    v.extend([(x,y,-.16) for x,y,z in v[1:]])
    f=[(0,1+i,1+(i+1)%n) for i in range(n)]+[(1+i,1+n+i,1+n+(i+1)%n,1+(i+1)%n) for i in range(n)]
    f.append(tuple(reversed(range(n+1,2*n+1))))
    return mesh(root.name+' soil root bed',v,f,soilmat,root)

def glb_summary(path):
    raw=path.read_bytes();size,kind=struct.unpack_from('<II',raw,12);g=json.loads(raw[20:20+size])
    triangles=0;primitives=0
    for m in g.get('meshes',[]):
        for p in m['primitives']:
            primitives+=1
            triangles+=g['accessors'][p['indices']]['count']//3
    anims=[]
    for a in g.get('animations',[]):
        times=[g['accessors'][s['input']] for s in a['samplers']]
        anims.append({'name':a.get('name'),'duration_seconds':max(x['max'][0] for x in times)-min(x['min'][0] for x in times),'channels':len(a['channels'])})
    assert len(anims)==1 and anims[0]['name']=='Breeze',anims
    assert len(g.get('skins',[]))==1 and len(g['skins'][0]['joints'])==3
    assert all(m.get('alphaMode','OPAQUE')=='OPAQUE' for m in g.get('materials',[]))
    assert all(min(n.get('scale',[1,1,1]))>=0 for n in g.get('nodes',[]))
    assert path.stat().st_size<10_000_000
    return {'file':path.name,'bytes':len(raw),'triangles':triangles,'meshes':len(g['meshes']),'primitives':primitives,'materials':len(g['materials']),'skins':len(g['skins']),'bones':3,'animations':anims}

results=[];roots=[]
for low in [False,True]:
    name='StreetTreeLow' if low else 'StreetTree'
    root=group(name);roots.append(root)
    root['seed']=SEED;root['units']='metres';root['original_art']='Procedural original generic broadleaf; no external assets'
    trunk=woody(root,low);leaves=foliage(root,low);soil=pit(root);arm=rig(root,[trunk,leaves])
    root['branch_graph_nodes']=len(VS);root['branch_graph_edges']=len(ES)
    root['pedestrian_clearance_m']=2.2
    bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    objects=[root]+[x for x in root.children_recursive if x.name not in source.objects]
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    path=OUT/('street-tree-low.glb' if low else 'street-tree.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,export_format='GLB',export_yup=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=True,export_frame_step=1,export_skins=True,export_all_influences=False)
    result=glb_summary(path);coords=[v.co for ob in [trunk,leaves,soil] for v in ob.data.vertices]
    result['rest_bounds_blender_xyz']=[[min(p[i] for p in coords) for i in range(3)],[max(p[i] for p in coords) for i in range(3)]]
    result['leaf_count']=leaves['leaf_count'];results.append(result)
    for obj in objects:obj.select_set(False)

# Arrange only visibility, never transform LOD positions: both exported roots match.
for ob in [roots[1]]+list(roots[1].children_recursive):ob.hide_set(True);ob.hide_render=True
bpy.context.scene.frame_set(1)
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'street-tree.blend'))
manifest={'asset':'Original Gloryland street broadleaf tree','authoring':'Blender '+bpy.app.version_string,'seed':SEED,'source':'street-tree.blend','textures':'textures/','units':'metres','authoring_axes':'Z-up, +X/+Y horizontal','glTF_axes':'Y-up, Blender (x,y,z) maps to glTF (x,z,-y)','origin':'trunk centre at paving plane; soil and buried root tips below zero','branch_construction':'Connected tree graph, native Skin modifier, Catmull-Clark subdivision; retained editable graphs in hidden collection','foliage':'Opaque bent pointed leaf geometry on directional twig fans; no alpha blending','animation':'Breeze: 4 seconds; 3 bones, root fixed; same smooth height weights on bark and leaves; artistic approximation, no physics simulation','LOD':'Two separately selected GLBs; no automatic runtime switching; low keeps the same branching form and envelope','build_commands':['python scripts/authoring/build_tree_textures.py','blender -b -t 2 --python scripts/authoring/build_street_tree.py'],'provenance':'All geometry and textures generated locally from original seeded scripts, no imported artwork or paid services','game_integration':False,'physical_phone':'NOT VERIFIED','assets':results}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('TREE_MANIFEST '+json.dumps(manifest))
