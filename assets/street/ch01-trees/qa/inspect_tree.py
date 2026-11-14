"""Inspect the saved source, then render the actual exported GLB using CPU Cycles."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(OUT/'street-tree.blend'))
report={}
for prefix in ['StreetTree','StreetTreeLow']:
    ob=bpy.data.objects[prefix+' connected trunk and branches']
    adj=[[] for _ in ob.data.vertices]
    edge_faces={}
    for edge in ob.data.edges:
        a,b=edge.vertices;adj[a].append(b);adj[b].append(a);edge_faces[tuple(sorted((a,b)))]=0
    for face in ob.data.polygons:
        for edge in face.edge_keys:edge_faces[tuple(sorted(edge))]+=1
    seen=set();components=0;component_info=[]
    for i in range(len(adj)):
        if i in seen:continue
        components+=1;stack=[i];seen.add(i);members=[i]
        while stack:
            for j in adj[stack.pop()]:
                if j not in seen:seen.add(j);stack.append(j);members.append(j)
        component_info.append({'vertices':len(members),'centre':[sum(ob.data.vertices[j].co[k] for j in members)/len(members) for k in range(3)]})
    nonmanifold=sum(v!=2 for v in edge_faces.values())
    print('TREE_TOPOLOGY',prefix,components,nonmanifold,component_info,flush=True)
    assert components==1,(prefix,components)
    assert nonmanifold==0,(prefix,nonmanifold)
    maximum_weight_error=max(abs(sum(g.weight for g in v.groups)-1) for v in ob.data.vertices)
    assert maximum_weight_error<1e-6
    def positions(frame):
        bpy.context.scene.frame_set(frame)
        return [v.co.copy() for v in ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices]
    p0=positions(1);pm=positions(49);p1=positions(97)
    root_ids=[v.index for v in ob.data.vertices if v.co.z<1.8]
    root_motion=max((pm[i]-p0[i]).length for i in root_ids)
    loop_error=max((a-b).length for a,b in zip(p0,p1))
    assert root_motion<1e-6 and loop_error<1e-5
    report[prefix]={'wood_connected_components':components,'wood_nonmanifold_edges':nonmanifold,'maximum_weight_sum_error':maximum_weight_error,'fixed_root_vertex_max_motion_m':root_motion,'loop_endpoint_max_error_m':loop_error,'sampled_crown_motion_m':max((a-b).length for a,b in zip(pm,p0))}
(OUT/'qa/structure.json').write_text(json.dumps(report,indent=2)+'\n')
print('TREE_STRUCTURE',json.dumps(report),flush=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for ob in list(bpy.data.objects):bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'street-tree.glb'))
scene=bpy.context.scene;scene.frame_set(1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.055));ground=bpy.context.object
m=bpy.data.materials.new('QA neutral ground');m.diffuse_color=(.34,.36,.32,1);ground.data.materials.append(m)
world=bpy.data.worlds.new('QA overcast ambient');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.66,.75,.86,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.world=world
bpy.ops.object.light_add(type='SUN',location=(-5,-8,10));sun=bpy.context.object;sun.rotation_euler=(.40,-.50,-.5);sun.data.energy=2.5;sun.data.angle=.12
bpy.ops.object.camera_add(location=(8,-11,5.2));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,3.1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=48;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=False
scene.render.resolution_x=760;scene.render.resolution_y=840;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'qa/tree-hero.png');scene.view_settings.view_transform='AgX'
bpy.ops.render.render(write_still=True)
camera.location=(2.3,-3.4,1.8);camera.rotation_euler=(Vector((0,0,1.9))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=46
scene.render.resolution_x=800;scene.render.resolution_y=700;scene.render.filepath=str(OUT/'qa/tree-trunk.png')
bpy.ops.render.render(write_still=True)
