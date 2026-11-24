# Dockside Hangar props for Glory of the Ring (round 2), modelled by script in headless Blender (bpy 5.x). They stand in for the
# box/tube-built pieces of the docks venue (arena-sets.js docks(): the bare-knuckle fight and the story set 'dream_docks') at the
# same places and sizes. The arena kit bakes its lamps into the vertex colours, so every class is lit the same way there.
#   Dock_crate (0.9 x 0.9 x 0.72 m shipping crate), Oil_drum_{blue,red,green,rust} (r 0.29, 0.88 m), Rope_coil, Mooring_bollard,
#   Pallet (1.2 x 1.0 x 0.14 m), Cargo (a shrink-wrapped stack of cartons for a pallet, 1.05 x 0.9 x 0.62 m), Work_lamp (enamel
#   shade with a wire guard over the circle; origin at the rim, the bulb glows).
# Conventions: prop_kit.py.
#
# usage: <blender-venv>/bin/python tools/blender/dock-props.py -- <asset dir> [<preview dir>] [--no-render]
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Matrix
from prop_kit import reset, lathe, cyl, box, sphere, tube, poly, finish, export, render, jitter, tint

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; PREVIEW = args[1] if len(args) > 1 and not args[1].startswith('--') else None; RENDER = '--no-render' not in args and PREVIEW
STEEL, BLACK, YELLOW = '#59636c', '#15171a', '#d0aa1e'


def dock_crate():
    """A nailed shipping crate: planked faces, edge battens, a diagonal brace on the long faces, stencilled marks."""
    W, D, H = .9, .9, .72; rnd = random.Random(3); P = '#8a7052'
    box('core', (W - .04, D - .04, H - .04), (0, 0, H / 2), tint(P, .7), 'matte', bevel=0)
    for k in range(5):  # planks on the four faces
        z = .02 + k * (H - .04) / 5 + (H - .04) / 10
        for sy in (-1, 1): box('plank', (W - .02, .02, (H - .04) / 5 - .008), (0, sy * (D / 2 - .01), z), tint(P, rnd.uniform(.85, 1.1)), 'matte', bevel=0)
        for sx in (-1, 1): box('plank', (.02, D - .02, (H - .04) / 5 - .008), (sx * (W / 2 - .01), 0, z), tint(P, rnd.uniform(.85, 1.1)), 'matte', bevel=0)
    for k in range(4): box('lid plank', (W - .02, (D - .02) / 4 - .008, .02), (0, -D / 2 + .01 + (k + .5) * (D - .02) / 4, H - .01), tint(P, rnd.uniform(.88, 1.08)), 'matte', bevel=0)
    B = tint(P, .78)
    for sx in (-1, 1):
        for sy in (-1, 1): box('corner batten', (.07, .07, H), (sx * (W / 2 - .025), sy * (D / 2 - .025), H / 2), B, 'matte', bevel=.004)
    for sy in (-1, 1):
        for z in (.035, H - .035): box('rail', (W, .03, .07), (0, sy * (D / 2 + .005), z), B, 'matte', bevel=0)
        L = math.hypot(W - .14, H - .14); box('brace', (L, .025, .07), (0, sy * (D / 2 + .004), H / 2), B, 'matte', bevel=0, rot=(0, sy * math.atan2(H - .14, W - .14), 0))
    for sx in (-1, 1):
        for z in (.035, H - .035): box('rail', (.03, D, .07), (sx * (W / 2 + .005), 0, z), B, 'matte', bevel=0)
    for k, (w, h, x, z) in enumerate(((.3, .05, -.05, .5), (.18, .035, -.11, .42), (.08, .08, .22, .25))):  # stencil on a side face
        box('stencil', (.004, w, h), (W / 2 + .022, x, z), '#2a2420', 'matte', bevel=0)
    box('arrow', (.004, .04, .14), (W / 2 + .022, .22, .44), '#2a2420', 'matte', bevel=0)
    return .72, .9


def oil_drum(col, seed):
    """A 200 l steel drum: rolled rims, two rolling hoops, a top with two bungs; paint chipped toward rust."""
    prof = [(.0, 0), (.27, 0), (.285, .012), (.285, .03), (.278, .04), (.278, .27), (.29, .285), (.29, .3), (.278, .315), (.278, .56),
            (.29, .575), (.29, .59), (.278, .605), (.278, .84), (.285, .85), (.285, .875), (.272, .88), (.262, .872), (.262, .862), (.0, .862)]
    d = lathe('drum', prof, col, 'gloss', segs=20, var=.08, seed=seed)
    jitter(d, .003, seed)
    for k, (x, y, r) in enumerate(((.13, .06, .03), (-.12, -.08, .022))): cyl('bung', r, .015, (x, y, .862), col=tint(col, .8) if isinstance(col, str) else col, segs=8)
    rnd = random.Random(seed)
    for k in range(5):  # rust streaks and scuffs near the rims
        a = rnd.uniform(0, 6.28); z = rnd.choice((.06, .33, .6, .8)); box('rust', (.006, .07, rnd.uniform(.05, .15)), (math.cos(a) * .281, math.sin(a) * .281, z), '#6a3a22', 'matte', bevel=0, rot=(0, 0, a))
    return .9, .6


def rope_coil():
    """A coiled mooring rope (0.7 m across, 3 cm rope): a flat spiral, a second loose turn on top and the end lying out."""
    pts = []; turns = 4.2; n = int(turns * 12)
    for i in range(n + 1):
        t = i / 12 * 2 * math.pi; r = .12 + .21 * i / n
        pts.append((math.cos(t) * r, math.sin(t) * r, .016))
    for i in range(1, 13):
        t = 2 * math.pi * (turns + i / 12); r = .31 - .03 * i / 12
        pts.append((math.cos(t) * r, math.sin(t) * r, .04 + .004 * math.sin(i)))
    pts += [(.33 + .1, -.05, .016), (.6, -.1, .016), (.72, .02, .016)]
    tube('rope', pts, .016, '#c9b08a', 'matte', res=2, bres=1, var=.06, seed=5)
    return .2, .9


def mooring_bollard():
    """A cast-iron quay bollard: base plate, waisted barrel, a mushroom head painted safety yellow."""
    lathe('base plate', [(.0, 0), (.24, 0), (.24, .03), (.2, .045), (0, .045)], BLACK, 'gloss', segs=16)
    for k in range(4): a = k * math.pi / 2 + .785; cyl('bolt', .018, .02, (math.cos(a) * .2, math.sin(a) * .2, .03), col='#2a2d33', segs=6)
    lathe('barrel', [(.13, .045), (.12, .2), (.11, .32), (.12, .4), (.15, .43)], '#2a2d33', 'gloss', segs=16, cap_bot=False, cap_top=False)
    lathe('head', [(.15, .43), (.2, .45), (.205, .48), (.17, .5), (.0, .52)], YELLOW, 'gloss', segs=16, cap_bot=False, var=.05, seed=2)
    return .55, .45


def pallet():
    """A wooden euro pallet 1.2 x 1.0 x 0.144 m: top deck, stringer blocks, bottom boards."""
    rnd = random.Random(9); P = '#8a7052'
    for k in range(7): box('deck board', (1.2, .1, .022), (0, -.45 + k * .15, .133), tint(P, rnd.uniform(.85, 1.1)), 'matte', bevel=0)
    for y in (-.45, 0, .45): box('stringer', (1.2, .1, .022), (0, y, .1), tint(P, .9), 'matte', bevel=0)
    for x in (-.55, 0, .55):
        for y in (-.45, 0, .45): box('block', (.1, .1, .078), (x, y, .05), tint(P, rnd.uniform(.72, .88)), 'matte', bevel=0)
    for y in (-.45, 0, .45): box('bottom board', (1.2, .1, .011), (0, y, .0055), tint(P, .85), 'matte', bevel=0)
    return .15, 1.2


def cargo():
    """Cartons stacked and shrink-wrapped for a pallet (1.05 x 0.9 x 0.62 m), two straps."""
    box('wrapped stack', (1.05, .9, .62), (0, 0, .31), '#7b6248', 'matte', bevel=.02, segs=2, var=.05)
    for x in (-.26, .26):
        for z in (.2, .42): box('carton seam', (.006, .91, .006), (x, 0, z), '#5a4634', 'matte', bevel=0)
    for z in (.2, .42): box('carton seam', (1.06, .006, .006), (0, -.453, z), '#5a4634', 'matte', bevel=0)
    for x in (-.3, .3):
        box('strap', (.03, .914, .006), (x, 0, .621), '#2a3a5a', 'matte', bevel=0)
        for sy in (-1, 1): box('strap', (.03, .006, .62), (x, sy * .455, .31), '#2a3a5a', 'matte', bevel=0)
    box('label', (.2, .004, .14), (.25, -.454, .5), '#ece6d6', 'matte', bevel=0)
    return .62, 1.05


def work_lamp():
    """An industrial enamel work lamp: rim at the origin, shade 0.32 m, wire guard, bulb (glow), a short cord stub."""
    lathe('shade', [(.32, 0), (.31, .01), (.2, .09), (.09, .2), (.06, .24), (.05, .28), (.0, .28)], '#c9a020', 'gloss', segs=20, cap_bot=False)
    lathe('enamel', [(.05, .22), (.09, .19), (.2, .085), (.3, .012), (.31, .004)], '#f2efe6', 'matte', segs=20, cap_bot=False, cap_top=False)
    sphere('bulb', .07, (0, 0, .07), '#fff1cf', 'glow', sub=2, scale=(1, 1, 1.15))
    for k in range(6):
        a = k * math.pi / 3; tube('guard', [(math.cos(a) * .3, math.sin(a) * .3, .01), (math.cos(a) * .2, math.sin(a) * .2, -.1), (0, 0, -.14)], .004, BLACK, 'gloss', res=3, bres=0)
    lathe('guard ring', [(.2, -.105), (.208, -.1), (.2, -.095)], BLACK, 'gloss', segs=16, cap_bot=False, cap_top=False)
    cyl('cord', .01, .2, (0, 0, .28), col=BLACK, segs=6)
    return .5, .7


DRUMS = {'blue': '#2f5a80', 'red': '#8a3a2a', 'green': '#3f6a48', 'rust': '#8a4a2a'}
PROPS = [('Dock_crate', dock_crate)] + [(f'Oil_drum_{k}', (lambda c=c, i=i: oil_drum(c, 31 + i))) for i, (k, c) in enumerate(DRUMS.items())] + [
    ('Rope_coil', rope_coil), ('Mooring_bollard', mooring_bollard), ('Pallet', pallet), ('Cargo', cargo), ('Work_lamp', work_lamp)]

reset(); built = []
for name, fn in PROPS:
    h, w = fn(); ob, tris = finish(name); built.append((ob, h, w)); print('PROP', name, 'tris', tris)
export([b[0] for b in built], os.path.join(OUT, 'gloryland-dock-props.glb'))
from glb_pack import pack; print('PACKED', *pack(os.path.join(OUT, 'gloryland-dock-props.glb')))  # KHR_mesh_quantization: byte normals and colours
print('WROTE', os.path.join(OUT, 'gloryland-dock-props.glb'))
if RENDER:
    os.makedirs(PREVIEW, exist_ok=True)
    for ob, h, w in built:
        if ob.name == 'Work_lamp': ob.location.z = .4
        render([b[0] for b in built], ob, os.path.join(PREVIEW, 'docks-' + ob.name.lower() + '.png'), h, w, res=260, samples=16)
        ob.location.z = 0
