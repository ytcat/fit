# Street props for Glory of the Ring, modelled in Blender (headless): fire hydrant, street lamp, park bench, trash bin.
# Metres, Z up in Blender (exported Y up), origin at the base centre. Each prop is exported as its own GLB and rendered.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix
OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=.5, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

def lathe(name, prof, segs=32, m=None):
    """prof: [(radius, z)] bottom to top; a closed solid of revolution with smooth shading."""
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segs):
            bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    bot = bm.verts.new((0, 0, prof[0][1])); top = bm.verts.new((0, 0, prof[-1][1]))
    for i in range(segs):
        bm.faces.new((rings[0][(i + 1) % segs], rings[0][i], bot)); bm.faces.new((rings[-1][i], rings[-1][(i + 1) % segs], top))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    if m: me.materials.append(m)
    return ob

def cyl(name, r, h, at=(0, 0, 0), rot=(0, 0, 0), m=None, segs=24, bevel=.004):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=r, depth=h, location=at, rotation=rot); ob = bpy.context.object; ob.name = name
    if bevel: mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2; mod.limit_method = 'ANGLE'
    bpy.ops.object.shade_smooth(); ob.data.materials.append(m) if m else None
    return ob

def box(name, size, at, m=None, bevel=.006, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at, rotation=rot); ob = bpy.context.object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2
    ob.data.materials.append(m) if m else None
    return ob

def tube(name, pts, r, m=None, res=10):
    """A bent bar through points (cast-iron scrollwork)."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.resolution_u = res
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    if m: cu.materials.append(m)
    return ob

def finish(name):
    # apply modifiers, convert curves, join into one object, origin at base centre
    for ob in list(bpy.context.scene.objects):
        if ob.type == 'CURVE':
            bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.convert(target='MESH'); ob.select_set(False)
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            bpy.context.view_layer.objects.active = ob
            for mod in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join(); ob = bpy.context.object; ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return ob, tris

def export(ob, name):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), use_selection=True, export_format='GLB', export_yup=True, export_apply=True)

def render(ob, name, h):
    scn = bpy.context.scene; scn.render.engine = 'CYCLES'; scn.cycles.samples = 48; scn.cycles.device = 'CPU'
    scn.render.resolution_x = scn.render.resolution_y = 520; scn.render.film_transparent = False
    w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.78, .8, .84, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = .9
    bpy.ops.mesh.primitive_plane_add(size=20); fl = bpy.context.object; fl.data.materials.append(mat('floor', srgb('#b9b5ad'), .9))
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(35))); bpy.context.object.data.energy = 3.2; bpy.context.object.data.angle = .2
    bpy.ops.object.light_add(type='AREA', location=(-2, -2, 2.5)); bpy.context.object.data.energy = 120; bpy.context.object.data.size = 3
    d = max(h * 2.05, 1.6)
    bpy.ops.object.camera_add(location=(d * .72, -d * .9, h * .62 + .25)); cam = bpy.context.object; scn.camera = cam; cam.data.lens = 50
    tc = cam.constraints.new('TRACK_TO'); e = bpy.data.objects.new('t', None); e.location = (0, 0, h * .5); bpy.context.collection.objects.link(e); tc.target = e
    scn.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)

def build(name, fn):
    reset(); h = fn(); ob, tris = finish(name); export(ob, name); render(ob, name, h); print('PROP', name, 'tris', tris, 'height', round(h, 2))

def hydrant():
    red = mat('hydrant red', srgb('#c8322b'), .38, .15); dark = mat('iron', srgb('#2b2b2e'), .55, .6); brass = mat('brass', srgb('#b08a3e'), .32, .9)
    lathe('body', [(.150, 0), (.150, .03), (.118, .045), (.108, .07), (.104, .45), (.112, .47), (.126, .48), (.126, .52), (.110, .535), (.098, .56), (.090, .62), (.074, .66), (.03, .69), (.0, .695)], 40, red)
    lathe('top nut', [(.026, .69), (.026, .73), (.018, .74), (0, .742)], 6, red)
    for i in range(8):
        a = 2 * math.pi * i / 8; cyl('bolt', .011, .022, (math.cos(a) * .132, math.sin(a) * .132, .512), m=dark, segs=6, bevel=0)
    for side in (-1, 1):
        cyl('side nozzle', .048, .09, (side * .13, 0, .36), (0, math.pi / 2, 0), m=red)
        cyl('side cap', .055, .03, (side * .18, 0, .36), (0, math.pi / 2, 0), m=red, segs=6)
    cyl('front nozzle', .062, .09, (0, -.13, .30), (math.pi / 2, 0, 0), m=red)
    cyl('front cap', .07, .035, (0, -.18, .30), (math.pi / 2, 0, 0), m=red, segs=6)
    tube('chain', [(.18, -.03, .33), (.15, -.12, .25), (.04, -.18, .27)], .005, brass)
    return .742

def lamp():
    green = mat('lamp green', srgb('#25483a'), .45, .55); glass = mat('lamp glass', srgb('#f3e7c6'), .1, 0); glass.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (1, .82, .5, 1); glass.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 2.5
    lathe('base', [(.22, 0), (.22, .05), (.17, .08), (.15, .30), (.11, .36), (.08, .40), (.065, .5)], 8, green)
    # fluted pole
    bm = bmesh.new(); segs = 24; rings = []
    for j, z in enumerate([.5, 3.1]):
        rings.append([bm.verts.new(((.052 + .006 * (i % 2)) * math.cos(2 * math.pi * i / segs), (.052 + .006 * (i % 2)) * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)])
    for i in range(segs): bm.faces.new((rings[0][i], rings[0][(i + 1) % segs], rings[1][(i + 1) % segs], rings[1][i]))
    me = bpy.data.meshes.new('pole'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('pole', me); bpy.context.collection.objects.link(ob); me.materials.append(green)
    lathe('collar', [(.075, 3.08), (.09, 3.12), (.07, 3.18), (.11, 3.22), (.11, 3.25)], 16, green)
    # lantern: tapered glass box with frame and a cap
    lathe('lantern glass', [(.10, 3.25), (.17, 3.62), (.0, 3.62)], 4, glass)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2; tube('frame', [(math.cos(a) * .14, math.sin(a) * .14, 3.25), (math.cos(a) * .24, math.sin(a) * .24, 3.62)], .012, green)
    lathe('cap', [(.26, 3.62), (.26, 3.65), (.20, 3.70), (.08, 3.80), (.03, 3.86), (.04, 3.92), (0, 3.98)], 4, green)
    return 3.98

def bench():
    wood = mat('bench wood', srgb('#9a6235'), .62, 0); iron = mat('bench iron', srgb('#1f3d31'), .5, .55)
    L = 1.6
    for i in range(4): box('seat slat', (L, .085, .032), (0, -.17 + i * .1, .44), wood, .006)
    for i in range(3): box('back slat', (L, .085, .03), (0, .2 + i * .03, .58 + i * .1), wood, .006, rot=(math.radians(-75), 0, 0))
    for x in (-.68, .68):
        tube('leg front', [(x, -.24, 0), (x, -.22, .2), (x, -.2, .43)], .022, iron)
        tube('leg back', [(x, .22, 0), (x, .2, .2), (x, .22, .44), (x, .26, .62), (x, .3, .82)], .022, iron)
        tube('arm', [(x, .2, .62), (x, .0, .63), (x, -.2, .62), (x, -.25, .55), (x, -.21, .5)], .02, iron)
        tube('scroll', [(x, -.2, .1), (x, -.1, .16), (x, -.02, .1), (x, -.08, .04), (x, -.13, .09)], .012, iron)
        tube('seat rail', [(x, -.24, .42), (x, .24, .42)], .018, iron)
    return .9

def bin_():
    green = mat('bin green', srgb('#2f4f3a'), .45, .5); dark = mat('bin dark', srgb('#1c2b22'), .5, .5)
    lathe('bottom', [(.25, 0), (.25, .04), (.235, .05), (.0, .05)], 32, dark)
    for i in range(20):
        a = 2 * math.pi * i / 20; box('slat', (.055, .018, .78), (math.cos(a) * .24, math.sin(a) * .24, .44), green, .004, rot=(0, 0, a + math.pi / 2))
    for z in (.12, .8): lathe('band', [(.255, z - .02), (.262, z - .01), (.262, z + .01), (.255, z + .02), (.0, z + .02)], 32, dark)
    lathe('lid', [(.28, .86), (.28, .88), (.24, .95), (.12, 1.0), (.04, 1.02), (.0, 1.02)], 32, green)
    for i in range(3): a = 2 * math.pi * i / 3; tube('post', [(math.cos(a) * .2, math.sin(a) * .2, .83), (math.cos(a) * .2, math.sin(a) * .2, .92)], .01, dark)
    return 1.02

for n, f in [('hydrant', hydrant), ('street_lamp', lamp), ('park_bench', bench), ('trash_bin', bin_)]: build(n, f)
