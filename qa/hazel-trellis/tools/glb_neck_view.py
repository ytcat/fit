import bpy, sys, math, os
glb, out = sys.argv[sys.argv.index('--') + 1:][:2]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=glb)
scn = bpy.context.scene; scn.render.engine = 'CYCLES'; scn.cycles.samples = 12; scn.cycles.device = 'CPU'; scn.render.resolution_x = scn.render.resolution_y = 420
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.35, .4, .5, 1)
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(30))); bpy.context.object.data.energy = 3
# a grid plane at head-frame y = -0.06 (the collar) for reference
bpy.ops.mesh.primitive_plane_add(size=.5, location=(0, 0, -.065)); pl = bpy.context.object; m = bpy.data.materials.new('pl'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.2, .6, .2, 1); m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = .35; pl.data.materials.append(m)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scn.collection.objects.link(cam); scn.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = .42
# head frame: blender x = x, -y = forward(z), z = up(y). look at (0, z .03, y -.02)
tgt = (0, -.03, -.01)
for name, yaw, pitch in [('side', 90, 0), ('front', 0, 0), ('back', 180, 0), ('backq', 135, 0)]:
    a, p = math.radians(yaw), math.radians(pitch); d = 2
    cam.location = (tgt[0] + math.sin(a) * math.cos(p) * d, tgt[1] - math.cos(a) * math.cos(p) * d, tgt[2] + math.sin(p) * d)
    cam.rotation_euler = (math.radians(90) + p, 0, a)
    scn.render.filepath = os.path.join(out, name + '.png'); bpy.ops.render.render(write_still=True)
print('DONE')
