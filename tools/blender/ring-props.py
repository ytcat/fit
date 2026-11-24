# Ringside props for Glory of the Ring (round 2), modelled by script in headless Blender (bpy 5.x). Static dressing only: they
# stand in for the box/tube-built ringside pieces of the built venues (arena-sets.js: Boxing Club corner stool, bucket and ring
# steps; the Regional and Championship judges' tables) and dress Bruno's Gym on fight night (dream-sets.js 'dream_gym_ring').
# The ring, its ropes and posts, and the corner kit carried by fight-corner.js between rounds are the game's own and untouched.
#   Ring_stool, Water_bucket (bottle and sponge), Spit_bucket (with funnel), Towel_rack (two towels), Ring_steps (two treads),
#   Judges_table (1.9 x 0.62 m, cloth, score sheets), Timekeeper_table (the same with the bell, the round clock and the hammer).
# Conventions: prop_kit.py.
#
# usage: <blender-venv>/bin/python tools/blender/ring-props.py -- <asset dir> [<preview dir>] [--no-render]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Matrix
from prop_kit import reset, lathe, cyl, box, sphere, tube, poly, finish, export, render, moved

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; PREVIEW = args[1] if len(args) > 1 and not args[1].startswith('--') else None; RENDER = '--no-render' not in args and PREVIEW
STEEL, CHROME, GALV, WOOD_D = '#3b4350', '#c9ccd2', '#9aa3ad', '#5b3a2a'


def ring_stool():
    """A corner stool (seat 0.5 m): four splayed steel legs, a foot ring, a padded red seat."""
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        tube('leg', [(math.cos(a) * .2, math.sin(a) * .2, 0), (math.cos(a) * .15, math.sin(a) * .15, .24), (math.cos(a) * .11, math.sin(a) * .11, .46)], .014, STEEL, res=3, bres=1)
        cyl('foot', .02, .012, (math.cos(a) * .2, math.sin(a) * .2, 0), col='#1d1f24', segs=8)
    lathe('foot ring', [(.165, .15), (.175, .155), (.175, .17), (.165, .175)], STEEL, segs=16, cap_bot=False, cap_top=False)
    lathe('seat', [(.12, .45), (.17, .46), (.185, .48), (.185, .505), (.175, .515), (.0, .52)], '#8f231f', segs=20)
    lathe('seat rim', [(.187, .465), (.187, .48)], '#1d1f24', segs=20, cap_bot=False, cap_top=False)
    return .55, .45


def bucket(r0, r1, h, col, seed):
    lathe('bucket', [(.0, .005), (r0, .005), (r0 + .004, 0), (r0 + .01, .02), (r1, h - .01), (r1 + .008, h), (r1 + .004, h + .004), (r1 - .006, h), (r0 + .002, .03), (0, .03)], col, 'gloss', segs=20, cap_top=False, cap_bot=False)
    for z in (h * .35, h * .7): k = z / h; lathe('rib', [(r0 + (r1 - r0) * k + .004, z - .005), (r0 + (r1 - r0) * k + .008, z), (r0 + (r1 - r0) * k + .004, z + .005)], col, 'gloss', segs=20, cap_bot=False, cap_top=False)
    tube('handle', [(-r1 - .005, 0, h - .03), (-r1 * .7, .01, h + .1), (0, .015, h + .14), (r1 * .7, .01, h + .1), (r1 + .005, 0, h - .03)], .005, '#7d858f', res=4, bres=1)


def water_bucket():
    """The corner water bucket (r 0.15, 0.3 m): water, a squeeze bottle and a sponge on the rim."""
    bucket(.12, .155, .3, GALV, 1)
    lathe('water', [(.148, .24), (0, .24)], '#4f6f86', 'gloss', segs=20, cap_bot=False, cap_top=False)
    lathe('bottle', [(.0, .14), (.04, .14), (.042, .16), (.042, .32), (.03, .34), (.012, .36), (.008, .39), (0, .395)], '#2f6fc0', 'gloss', segs=12)
    for ob in bpy.context.scene.objects:
        if ob.get('done') is None and ob.name.startswith('bottle'): ob.data.transform(Matrix.Translation((.05, .03, 0)) @ Matrix.Rotation(.18, 4, 'Y'))
    box('sponge', (.12, .08, .05), (-.11, -.05, .31), '#f2c14e', 'matte', bevel=.012, segs=2, rot=(0, .25, .3))
    return .5, .4


def spit_bucket():
    """A spit bucket (r 0.13, 0.28 m) with a funnel on top."""
    bucket(.1, .13, .26, '#c0392b', 2)
    lathe('funnel', [(.135, .27), (.13, .285), (.05, .34), (.022, .36), (.022, .42), (.0, .42)], '#e9e4d6', 'gloss', segs=16, cap_bot=False, cap_top=False)
    lathe('funnel in', [(.02, .35), (.045, .335), (.122, .283)], '#2b2f36', 'matte', segs=16, cap_bot=False, cap_top=False)
    return .45, .32


def towel(x0, x1, col, seed, drop=(.5, .4)):
    """A towel hung over a bar at z 0.9 (y 0): two flaps of cloth, thick."""
    nx, verts, faces = 6, [], []
    path = [(-.03, .9 - drop[0]), (-.03, .7), (-.025, .86), (0, .92), (.025, .86), (.03, .7), (.03, .9 - drop[1])]
    for j, (y, z) in enumerate(path):
        for i in range(nx + 1):
            u = i / nx; x = x0 + (x1 - x0) * u
            verts.append((x, y + .006 * math.sin(u * 9 + j + seed), z + (.012 * math.sin(u * 5 + seed) if j in (0, 6) else 0)))
    for j in range(len(path) - 1):
        for i in range(nx): a = j * (nx + 1) + i; faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    ob = poly('towel', verts, faces, col, 'matte', smooth=True, var=.03, seed=seed)
    m = ob.modifiers.new('thick', 'SOLIDIFY'); m.thickness = .012; m.offset = 0
    box('stripe', (x1 - x0, .062, .03), ((x0 + x1) / 2, 0, .9 - drop[1] + .06), '#b4302c' if col != '#b4302c' else '#f1ece0', 'matte', bevel=0)


def towel_rack():
    """A freestanding towel rail (0.8 m wide, 0.95 m high) with two towels."""
    for x in (-.38, .38):
        tube('upright', [(x, 0, .02), (x, 0, .95)], .014, CHROME, res=1, bres=1)
        box('foot', (.04, .36, .025), (x, 0, .0125), STEEL, bevel=.004)
    for z in (.6, .92): tube('bar', [(-.38, 0, z), (.38, 0, z)], .012, CHROME, res=1, bres=1)
    towel(-.34, -.02, '#f1ece0', 1)
    towel(.03, .33, '#2f5fa8', 2, drop=(.45, .5))
    return 1.0, .85


def ring_steps():
    """Wooden ring steps (0.7 m wide, two treads to 0.32 m) with rubber treads and side stringers."""
    for k, (y, z, d) in enumerate(((-.12, .16, .26), (.12, .32, .26))):
        box('tread', (.7, d, .04), (0, y, z - .02), '#8a6a48', 'matte', bevel=.006)
        box('rubber', (.62, d - .04, .006), (0, y, z + .002), '#1d1f24', 'matte', bevel=0)
        box('riser', (.66, .02, z - .04), (0, y - d / 2 + .01, (z - .04) / 2), '#7a5a3a', 'matte', bevel=0)
    for x in (-.34, .34):
        poly('stringer', [(x, -.25, 0), (x, .25, 0), (x, .25, .3), (x, 0, .3), (x, 0, .14), (x, -.25, .14)], [(0, 1, 2, 3, 4, 5)], '#6a4a30', 'matte')
        poly('stringer back', [(x + .001, -.25, 0), (x + .001, -.25, .14), (x + .001, 0, .14), (x + .001, 0, .3), (x + .001, .25, .3), (x + .001, .25, 0)], [(0, 1, 2, 3, 4, 5)], '#6a4a30', 'matte')
    return .4, .8


def table(L=1.9, D=.62, H=.74):
    """A ringside table with a white cloth over the top and the front (toward -y), score sheets."""
    box('top', (L, D, .04), (0, 0, H - .02), '#d9d9de', 'matte', bevel=.006)
    lathe_free = None
    box('cloth front', (L + .02, .012, H - .06), (0, -D / 2 - .006, (H + .02) / 2), '#e8e8ec', 'matte', bevel=0)
    for sx in (-1, 1):
        box('cloth end', (.012, D + .02, H - .06), (sx * (L / 2 + .006), 0, (H + .02) / 2), '#e8e8ec', 'matte', bevel=0)
        for sy in (-1, 1): box('leg', (.04, .04, H - .04), (sx * (L / 2 - .06), sy * (D / 2 - .06), (H - .04) / 2), STEEL, bevel=0)
    box('hem', (L + .03, .016, .04), (0, -D / 2 - .008, .06), '#123a9c', 'matte', bevel=0)
    for k, x in enumerate((-.6, 0, .6)):
        box('score sheets', (.21, .3, .006), (x, -.05, H + .003), '#f7f5ee', 'matte', bevel=0, rot=(0, 0, .08 * (k - 1)))
        box('pen', (.13, .01, .01), (x + .07, -.18, H + .009), '#1d1f24', 'gloss', bevel=0, rot=(0, 0, .5))
        lathe('cup', [(.0, 0), (.03, 0), (.036, .1), (.0, .1)], '#f1ece0', 'matte', segs=10).data.transform(Matrix.Translation((x + .2, .12, H)))
    return H + .1, L


def judges_table():
    table(); return .85, 1.9


def timekeeper_table():
    """The timekeeper's table: the bell on a wooden board with its hammer, the round clock, score sheets."""
    H = .74; table()
    box('bell board', (.34, .22, .03), (-.55, .08, H + .015), WOOD_D, 'matte', bevel=.006)
    lathe('bell', [(.0, .0), (.13, 0), (.135, .01), (.12, .045), (.085, .08), (.04, .1), (0, .104)], '#d9a93e', 'gloss', segs=24).data.transform(Matrix.Translation((-.55, .08, H + .05)))
    cyl('bell post', .012, .05, (-.55, .08, H + .03), col='#b08a3e', segs=8)
    cyl('hammer', .01, .22, (-.3, -.06, H + .016), (0, math.pi / 2, .4), col='#8a6446', cls='matte', segs=6)
    cyl('hammer head', .022, .07, (-.42, -.105, H + .022), (math.pi / 2, 0, .4), col='#3b4350', segs=8)
    box('clock', (.32, .14, .2), (.45, .12, H + .1), '#1d1f24', bevel=.01)
    for k, (x, c) in enumerate(((.38, '#ff3b2f'), (.45, '#ff3b2f'), (.52, '#ff3b2f'))): box('digit', (.05, .006, .09), (x, .048, H + .11), c, 'glow', bevel=0)
    box('round lamp', (.04, .006, .03), (.33, .048, H + .17), '#4cd964', 'glow', bevel=0)
    return .95, 1.9


PROPS = [('Ring_stool', ring_stool), ('Water_bucket', water_bucket), ('Spit_bucket', spit_bucket), ('Towel_rack', towel_rack),
         ('Ring_steps', ring_steps), ('Judges_table', judges_table), ('Timekeeper_table', timekeeper_table)]

reset(); built = []
for name, fn in PROPS:
    h, w = fn(); ob, tris = finish(name); built.append((ob, h, w)); print('PROP', name, 'tris', tris)
export([b[0] for b in built], os.path.join(OUT, 'gloryland-ring-props.glb'))
from glb_pack import pack; print('PACKED', *pack(os.path.join(OUT, 'gloryland-ring-props.glb')))  # KHR_mesh_quantization: byte normals and colours
print('WROTE', os.path.join(OUT, 'gloryland-ring-props.glb'))
if RENDER:
    os.makedirs(PREVIEW, exist_ok=True)
    for ob, h, w in built: render([b[0] for b in built], ob, os.path.join(PREVIEW, 'ring-' + ob.name.lower() + '.png'), h, w, res=260, samples=16)
