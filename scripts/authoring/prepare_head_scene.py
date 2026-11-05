"""Blender 4.3 authoring template from frozen runtime geometry.
Not an authored replacement head. Shape-key slots start empty on purpose.
blender -b --factory-startup --python scripts/authoring/prepare_head_scene.py -- INPUT_JSON OUTPUT_DIRECTORY
"""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]).resolve();out=Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
data=json.loads(source.read_text());bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
C=Matrix.Rotation(math.pi/2,4,'X');origin=Vector(data['headOrigin'])

def collection(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
baseline=collection('00_FROZEN_RUNTIME_REFERENCE');rig=collection('01_EXISTING_JOINT_AXES_REFERENCE');work=collection('02_HEAD_AUTHORING_NOT_APPROVED');exports=collection('03_QA_ROUNDTRIP_ONLY')

def make_mesh(name,positions,index,where,material=None):
    vertices=[C@Vector(positions[i:i+3]) for i in range(0,len(positions),3)]
    faces=[index[i:i+3] for i in range(0,len(index),3)];mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);where.objects.link(obj)
    for face in mesh.polygons:face.use_smooth=True
    if material:mesh.materials.append(material)
    return obj
clay=bpy.data.materials.new('Neutral clay — anatomy review');clay.diffuse_color=(.35,.35,.35,1)
body=make_mesh('LOCKED_original_runtime_body',data['runtimeBody']['position'],data['runtimeBody']['index'],baseline,clay);body.hide_select=True;body.hide_render=True;body.display_type='WIRE'
head=data['head'];reference=make_mesh('LOCKED_original_head_local_geometry',head['position'],head['index'],baseline,clay);reference.location=C@origin;reference.hide_select=True;reference.hide_render=True;reference.hide_set(True)
objects={}
for bone in data['bones']:
    obj=bpy.data.objects.new(bone['name'],None);rig.objects.link(obj);obj.empty_display_type='ARROWS';obj.empty_display_size=.045;obj.hide_select=True
    if bone['parent']>=0:obj.parent=objects[data['bones'][bone['parent']]['name']]
    obj.matrix_world=C@Matrix.Translation(Vector(bone['restWorld']));obj['runtime_rest_world']=bone['restWorld'];obj['reference_only']='Do not export as a replacement game skeleton';objects[bone['name']]=obj
candidate=make_mesh('HEAD_WORKING_COPY__BASELINE_NOT_SCULPTED',head['position'],head['index'],work,clay);candidate.location=C@origin
uv=candidate.data.uv_layers.new(name='Runtime_UV_reference')
for polygon in candidate.data.polygons:
    for loop_index in polygon.loop_indices:
        vi=candidate.data.loops[loop_index].vertex_index;uv.data[loop_index].uv=head['uv'][vi*2:vi*2+2]
for bone in data['bones']:candidate.vertex_groups.new(name=bone['name'])
for i in range(len(head['position'])//3):
    for k in range(4):
        weight=head['skinWeight'][i*4+k]
        if weight>0:candidate.vertex_groups[data['bones'][head['skinIndex'][i*4+k]]['name']].add([i],weight,'REPLACE')
identifier=candidate.data.attributes.new(name='_RUNTIME_SOURCE_ID',type='FLOAT',domain='POINT')
for i,source_id in enumerate(head['sourceVertexIds']):identifier.data[i].value=source_id
seam=candidate.vertex_groups.new(name='AUTHORING_BOUNDARY_LOCK');seam.add(head['seamVertices'],1,'REPLACE')
candidate['source_app_sha']=data['sourceAppSHA'];candidate['approved_reference']='MISSING — do not call this a realism candidate';candidate['runtime_axes']='X right / Y up / +Z forward, metres';candidate['export_origin']='Existing head joint, runtime [0,1.84,0]';candidate['boundary_note']='Boundary is a source diagnostic; authored neck seam must be validated in motion.'
candidate.shape_key_add(name='Basis')
for name in ['blink_left','blink_right','jaw_open','snarl','pain']:
    key=candidate.shape_key_add(name=name);key.value=0
candidate['shape_keys_status']='EMPTY AUTHORING SLOTS, not completed facial acting'
sub=candidate.modifiers.new('Optional sculpt preview — excluded from roundtrip','SUBSURF');sub.levels=1;sub.render_levels=1;sub.show_viewport=False;sub.show_render=False
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.render.engine='BLENDER_WORKBENCH';scene['status']='Authoring template and baseline GLB compatibility test only';scene['reference_status']='Approved lion reference sheet not available';scene['do_not_score']='No new realism result is present in this scene'
for obj in bpy.context.selected_objects:obj.select_set(False)
candidate.select_set(True);bpy.context.view_layer.objects.active=candidate
bpy.ops.wm.save_as_mainfile(filepath=str(out/'lion-head-authoring-template.blend'))
# Export an unmodified baseline copy at head-local origin to prove axes/units.
export=candidate.copy();export.data=candidate.data.copy();exports.objects.link(export);export.name='QA_BASELINE_HEAD_ROUNDTRIP';export.location=(0,0,0);export.modifiers.clear();candidate.select_set(False);export.select_set(True);bpy.context.view_layer.objects.active=export
bpy.ops.export_scene.gltf(filepath=str(out/'baseline-head-roundtrip.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_morph=True,export_normals=True,export_texcoords=True,export_extras=True,export_attributes=True,export_apply=False,export_draco_mesh_compression_enable=False)
manifest={'blender':bpy.app.version_string,'sourceAppSHA':data['sourceAppSHA'],'sourceModelSHA256':data['modelSHA256'],'sourceHeadBounds':head['bounds'],'authoringScene':'lion-head-authoring-template.blend','roundtripAsset':'baseline-head-roundtrip.glb','shapeKeys':'five empty authoring slots, not a finished face rig','artworkClaim':'none — baseline geometry only','approvedReference':'missing','transform':'runtime XYZ -> Blender (X,-Z,Y); glTF Y-up export -> runtime XYZ; head-local origin'}
(out/'authoring-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('AUTHORING_TEMPLATE_READY',json.dumps(manifest))
