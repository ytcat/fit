# Street furniture for Glory of the Ring, modelled by script in headless Blender (bpy 5.x):
#   Lamp (Old Town lantern post), Bin (slatted litter bin), Planter / Planter_wide (terracotta trough with box shrubs and
#   flowers), Bollard, Bench (slatted park bench), Hydrant.
# Sizes follow the generated pieces they replace in adventure/story/story-sets.js (lamp 4.25 m with its lantern at 3.4-3.9 m,
# bin 0.9 m, planter 1.1 / 1.6 x 0.5 x 0.46 m, bollard 0.8 m, gym-front bench 1.6 m) so footprints, collisions and the
# walking route stay as they were. Conventions and material classes: tools/blender/prop_kit.py.
#
# usage: <blender-venv>/bin/python tools/blender/street-props.py -- <asset dir> [<preview dir>] [--no-render]
#   writes <asset dir>/gloryland-street-props.glb and, unless --no-render, Cycles previews <preview dir>/street-<prop>.png
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from prop_kit import reset, srgb, lathe, cyl, box, sphere, tube, poly, shrub, finish, export, render, link, _own

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; PREVIEW = args[1] if len(args) > 1 and not args[1].startswith('--') else None; RENDER = '--no-render' not in args and PREVIEW
IRON, GREEN, GREEN_D = '#262d2b', '#3f6a4c', '#2b4535'
LEAF = ['#5e8f3e', '#4f7f35', '#6b9a45', '#3f6e30', '#557f3a']


def lamp():
    lathe('base', [(.15, 0), (.15, .05), (.125, .08), (.118, .26), (.1, .3), (.085, .34), (.085, .4), (.07, .44), (.062, .56)], IRON, segs=16)
    # fluted pole: 16 flutes
    bm = bmesh.new(); segs = 32; rings = []
    for z in (.56, 3.1):
        rings.append([bm.verts.new(((.052 + .006 * (i % 2)) * math.cos(2 * math.pi * i / segs), (.052 + .006 * (i % 2)) * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)])
    for i in range(segs): bm.faces.new((rings[0][i], rings[0][(i + 1) % segs], rings[1][(i + 1) % segs], rings[1][i]))
    me = bpy.data.meshes.new('pole'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    _own(link('pole', me), IRON, 'gloss')
    lathe('collar', [(.06, 3.1), (.075, 3.12), (.075, 3.17), (.06, 3.2), (.06, 3.25), (.08, 3.27), (.08, 3.3)], IRON, segs=16)
    tube('ladder bar', [(-.32, 0, 3.22), (0, 0, 3.235), (.32, 0, 3.22)], .016, IRON, res=4, bres=1)
    for s in (-1, 1): sphere('finial', .03, (s * .335, 0, 3.22), IRON, sub=1)
    q = math.pi / 4
    lathe('lantern cup', [(.05, 3.3), (.1, 3.36), (.12, 3.42), (.135, 3.44)], IRON, segs=4, rot=q, smooth=False)
    lathe('lantern glass', [(.125, 3.44), (.19, 3.86)], '#ffd9a0', 'lantern', segs=4, rot=q, smooth=False, cap_bot=False, cap_top=False)
    lathe('lantern inner', [(.11, 3.445), (.0, 3.445)], '#ffe8c0', 'lantern', segs=4, rot=q, smooth=False, cap_bot=False, cap_top=False)
    for i in range(4):
        a = q + i * math.pi / 2; tube('frame', [(math.cos(a) * .13, math.sin(a) * .13, 3.44), (math.cos(a) * .2, math.sin(a) * .2, 3.86)], .013, IRON, res=1, bres=1)
    lathe('roof', [(.215, 3.86), (.215, 3.885), (.17, 3.95), (.06, 4.08), (.0, 4.1)], IRON, segs=4, rot=q, smooth=False)
    lathe('top finial', [(.03, 4.08), (.035, 4.12), (.014, 4.2), (.0, 4.25)], IRON, segs=8)
    return 4.25, .7


def bin_():
    lathe('foot', [(.2, 0), (.2, .02), (.235, .05), (.235, .09), (.0, .09)], GREEN_D, segs=24)
    lathe('liner', [(.236, .09), (.236, .76)], '#1d2621', 'matte', segs=18, cap_bot=False, cap_top=False)
    for i in range(18):
        a = 2 * math.pi * i / 18; box('slat', (.062, .018, .64), (math.cos(a) * .262, math.sin(a) * .262, .43), GREEN, bevel=.004, rot=(0, 0, a + math.pi / 2), var=.05, seed=i)
    for z0 in (.1, .72): lathe('band', [(.27, z0), (.284, z0 + .01), (.284, z0 + .05), (.27, z0 + .06)], GREEN_D, segs=24, cap_bot=False, cap_top=False)
    lathe('lid', [(.288, .78), (.288, .80), (.272, .83), (.2, .875), (.1, .9), (.0, .905)], GREEN, segs=24)
    lathe('lid rim', [(.24, .77), (.24, .785)], GREEN_D, segs=24, cap_top=False)
    sphere('lid knob', .028, (0, 0, .92), GREEN_D, sub=1)
    return .95, .6


def planter(w):
    tc, rim = '#b0603b', '#c46e4b'
    d, h = .5, .42
    # tapered trough on four little feet
    b = .04; vs = [(-w / 2 + .04, -d / 2 + .04, b), (w / 2 - .04, -d / 2 + .04, b), (w / 2 - .04, d / 2 - .04, b), (-w / 2 + .04, d / 2 - .04, b),
                   (-w / 2, -d / 2, h), (w / 2, -d / 2, h), (w / 2, d / 2, h), (-w / 2, d / 2, h)]
    poly('trough', vs, [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], tc, 'matte', var=.03, seed=1)
    box('rim', (w + .06, d + .06, .055), (0, 0, h + .02), rim, 'matte', bevel=.012, segs=2)
    for z in (.13, .3): box('band', (w - .03 * (1 - z), .004, .035), (0, -d / 2 + .04 * (1 - z / h) - .003, z), '#9b5233', 'matte', bevel=0)
    for z in (.13, .3): box('band', (w - .03 * (1 - z), .004, .035), (0, d / 2 - .04 * (1 - z / h) + .003, z), '#9b5233', 'matte', bevel=0)
    for sx in (-1, 1):
        for sy in (-1, 1): box('foot', (.09, .09, .04), (sx * (w / 2 - .09), sy * (d / 2 - .09), .02), '#7f4a31', 'matte', bevel=.008)
    box('soil', (w - .02, d - .02, .02), (0, 0, h + .03), '#4a3426', 'matte', bevel=0)
    # box shrubs and smaller tufts, flowers on top
    n = 3 if w < 1.3 else 4; flowers = []
    for i in range(n):
        x = -w / 2 + w * (i + .5) / n; r = .2 + .03 * ((i * 7) % 3); y = (.04 if i % 2 else -.04)
        shrub('shrub', (x, y, h + .03 + r * .62), (r * 1.08, r * .95, r * .82), LEAF[i % 3:] + LEAF[:i % 3], 11 + i, leaves=130)
        flowers += [(x + r * .55 * math.cos(a), y + r * .5 * math.sin(a), h + .03 + r * .62 + r * .66) for a in (.4 + i, 2.3 + i, 4.2 + i)]
        flowers.append((x, y, h + .03 + r * .62 + r * .86))
    for i in range(n - 1):
        x = -w / 2 + w * (i + 1) / n
        shrub('tuft', (x, (-.13 if i % 2 else .13), h + .1), (.13, .12, .1), LEAF, 31 + i, leaves=40, size=(.035, .05))
    cols = ['#ff8fb1', '#ffd166', '#f7f0dc', '#e8576e']
    for i, p in enumerate(flowers): sphere('flower', .032, p, cols[i % len(cols)], 'matte', sub=1, scale=(1, 1, .6), seed=50 + i, var=.08)
    return .78, w


def bollard():
    D = '#343b45'
    lathe('post', [(.1, 0), (.1, .03), (.08, .06), (.068, .1), (.062, .58), (.07, .6), (.078, .62), (.078, .64)], D, segs=16)
    lathe('band', [(.082, .64), (.082, .70)], '#d8a93a', segs=16, cap_bot=False, cap_top=False)
    lathe('top', [(.078, .70), (.078, .72), (.06, .76), (.03, .79), (.0, .80)], D, segs=16)
    return .8, .3


def bench():
    wood, iron = '#9a6a42', '#2c3a33'
    L = 1.6
    for i in range(4): box('seat slat', (L, .085, .032), (0, -.17 + i * .1, .44), wood, 'matte', .006, segs=1, var=.06, seed=i)
    for i in range(3): box('back slat', (L, .085, .03), (0, .2 + i * .03, .58 + i * .1), wood, 'matte', .006, rot=(math.radians(-75), 0, 0), var=.06, seed=10 + i)
    for x in (-.68, .68):
        tube('leg front', [(x, -.24, 0), (x, -.22, .2), (x, -.2, .43)], .022, iron, res=4)
        tube('leg back', [(x, .22, 0), (x, .2, .2), (x, .22, .44), (x, .26, .62), (x, .3, .82)], .022, iron, res=4)
        tube('arm', [(x, .2, .62), (x, .0, .63), (x, -.2, .62), (x, -.25, .55), (x, -.21, .5)], .02, iron, res=4)
        tube('scroll', [(x, -.2, .1), (x, -.1, .16), (x, -.02, .1), (x, -.08, .04), (x, -.13, .09)], .012, iron, res=4, bres=1)
        tube('seat rail', [(x, -.24, .42), (x, .24, .42)], .018, iron, res=2)
        for y in (-.24, .22): cyl('foot pad', .03, .012, (x, y, 0), col='#1d2320', segs=8)
    return .85, 1.6


def hydrant():
    red, dark, brass = '#c8322b', '#2b2b2e', '#b08a3e'
    lathe('flange', [(.16, 0), (.16, .03), (.13, .045)], dark, segs=24, cap_top=False)
    lathe('body', [(.13, .045), (.115, .07), (.104, .45), (.112, .47), (.126, .48), (.126, .52), (.110, .535), (.098, .56), (.090, .62), (.074, .66), (.03, .69), (.0, .695)], red, segs=24)
    lathe('top nut', [(.026, .69), (.026, .73), (.018, .74), (0, .742)], red, segs=6, smooth=False)
    for i in range(8):
        a = 2 * math.pi * i / 8; cyl('bolt', .011, .022, (math.cos(a) * .132, math.sin(a) * .132, .5), col=dark, segs=6)
    for side in (-1, 1):
        cyl('side nozzle', .048, .07, (side * .1, 0, .36), (0, side * math.pi / 2, 0), col=red, segs=16)
        cyl('side cap', .055, .03, (side * .17, 0, .36), (0, side * math.pi / 2, 0), col=red, segs=6)
    cyl('front nozzle', .062, .08, (0, -.1, .30), (math.pi / 2, 0, 0), col=red, segs=16)
    cyl('front cap', .07, .035, (0, -.18, .30), (math.pi / 2, 0, 0), col=red, segs=6)
    tube('chain', [(.2, -.03, .33), (.15, -.12, .24), (.04, -.2, .27)], .005, brass, res=4, bres=1)
    return .75, .45


PROPS = [('Lamp', lamp), ('Bin', bin_), ('Planter', lambda: planter(1.1)), ('Planter_wide', lambda: planter(1.6)), ('Bollard', bollard), ('Bench', bench), ('Hydrant', hydrant)]

reset(); built = []
for name, fn in PROPS:
    h, w = fn(); ob, tris = finish(name); built.append((ob, h, w)); print('PROP', name, 'tris', tris, 'height', round(h, 2))
export([b[0] for b in built], os.path.join(OUT, 'gloryland-street-props.glb'))
print('WROTE', os.path.join(OUT, 'gloryland-street-props.glb'))
if RENDER:
    os.makedirs(PREVIEW, exist_ok=True)
    for ob, h, w in built: render([b[0] for b in built], ob, os.path.join(PREVIEW, 'street-' + ob.name.lower() + '.png'), h, w)
    lampob = built[0]
    render([b[0] for b in built], lampob[0], os.path.join(PREVIEW, 'street-lamp-dusk.png'), lampob[1], lampob[2], night=True)
