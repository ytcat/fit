import bpy, sys, math, os
from mathutils import Vector
glb, out = sys.argv[sys.argv.index('--') + 1:][:2]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=glb)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
mats = {m.name for o in meshes for m in o.data.materials if m}
imgs = [(i.name, tuple(i.size)) for i in bpy.data.images if i.size[0] > 0]
print('MESHES', len(meshes), 'TRIS', tris, 'VERTS', sum(len(o.data.vertices) for o in meshes), 'MATS', sorted(mats), 'IMAGES', imgs)
# bounds, then scale to a 0.45 m tall head (the game Fang's head+neck) and centre it
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
print('BOUNDS', [round(v, 3) for v in lo], [round(v, 3) for v in hi])
root = bpy.data.objects.new('root', None); bpy.context.collection.objects.link(root)
for o in meshes:
    if o.parent is None: o.parent = root
s = 0.45 / max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z, 1e-6); root.scale = (s, s, s); c = (lo + hi) / 2; root.location = (-c.x * s, -c.y * s, -c.z * s)
scn = bpy.context.scene; scn.render.engine = 'CYCLES'; scn.cycles.samples = 32; scn.cycles.device = 'CPU'; scn.render.resolution_x = scn.render.resolution_y = 600
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; bgn = w.node_tree.nodes['Background']; bgn.inputs['Color'].default_value = (0.25, 0.27, 0.30, 1); bgn.inputs['Strength'].default_value = 2.2
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(55), 0, math.radians(30))); bpy.context.object.data.energy = 3.5; bpy.ops.object.light_add(type='SUN', rotation=(math.radians(75), 0, math.radians(-150))); bpy.context.object.data.energy = 1.5
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scn.collection.objects.link(cam); scn.camera = cam
cam.data.sensor_fit = 'VERTICAL'; cam.data.angle_y = math.radians(22)
# glTF faces +Z forward (Blender -Y after import): front view looks from -Y
for name, yaw in [("front", 0), ("three_quarter", -45), ("profile", -90)]:
    a = math.radians(yaw); d = 2.6
    cam.location = (math.sin(a) * d, -math.cos(a) * d, 0.02)
    cam.rotation_euler = (math.radians(90), 0, a)
    scn.render.filepath = os.path.join(out, 'trellis-' + name + '.png'); bpy.ops.render.render(write_still=True)
print('RENDERED')
