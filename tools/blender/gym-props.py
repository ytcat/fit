# Bruno's Gym interior props for Glory of the Ring, modelled by script in headless Blender (bpy 5.x). They stand in for the
# generated pieces of the gym hall (adventure/story/dream-sets.js, sets dream_gym / dream_gym_floor / dream_gym_ring) at the
# same places and sizes; the heavy bags, the ring and everything moved by code stay generated.
#   Lockers (bank of six), Gym_bench, Water_cooler, Glove_rack (five gloves on pegs), Medicine_balls (three), Dumbbell_rack
#   (eight hex dumbbells), Kettlebells (three), Skipping_ropes (three on hooks), Wall_clock, Ring_bell, Speed_bag (platform,
#   swivel and bag), Corner_stool, Bucket_towel, Pendant_lamp (enamel shade, bulb, cord).
# Wall-mounted props have their back on the wall plane (Blender y = 0) and their origin at floor height below their centre,
# except Wall_clock (origin at the clock's centre) and Pendant_lamp (origin at the shade's rim). Conventions: prop_kit.py.
#
# usage: <blender-venv>/bin/python tools/blender/gym-props.py -- <asset dir> [<preview dir>] [--no-render]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Matrix, Vector
from prop_kit import reset, lathe, cyl, box, sphere, tube, poly, finish, export, render

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; PREVIEW = args[1] if len(args) > 1 and not args[1].startswith('--') else None; RENDER = '--no-render' not in args and PREVIEW
STEEL, CHROME, WOOD, DARKWOOD = '#3b4350', '#c9ccd2', '#9a7350', '#5b3a2a'


def turn_free(mat):
    """Transforms every part built so far for the current prop (not yet joined)."""
    for ob in bpy.context.scene.objects:
        if ob.get('done') is None and ob.type == 'MESH': ob.data.transform(mat)
        elif ob.get('done') is None and ob.type == 'CURVE': ob.matrix_world = mat @ ob.matrix_world


def lockers():
    cols = ['#4f7a5a', '#3c5c45', '#4f7a5a', '#55657a', '#4f7a5a', '#3c5c45']
    box('plinth', (3.7, .5, .08), (0, .02, .04), '#23272c', 'matte', bevel=0)
    for k, c in enumerate(cols):
        x = -1.55 + k * .62
        box('carcass', (.6, .55, 1.86), (x, 0, .08 + .93), c, bevel=.004, var=.02, seed=k)
        box('door', (.56, .014, 1.78), (x, -.282, .08 + .93), c, bevel=.006, segs=2)
        for z0 in (1.58, .3):
            for j in range(5): box('vent', (.3, .006, .016), (x - .02, -.29, z0 + j * .032), '#20262b', 'matte', bevel=0)
        box('handle', (.03, .03, .15), (x + .2, -.3, 1.0), CHROME, bevel=.006)
        cyl('lock', .014, .012, (x + .2, -.289, 1.12), (math.pi / 2, 0, 0), col=CHROME, segs=8)
        box('number plate', (.09, .004, .05), (x - .02, -.29, 1.42), '#ece4cf', 'matte', bevel=0)
    box('top', (3.74, .57, .03), (0, 0, 1.955), '#2f363d', bevel=.005)
    return 1.98, 3.7


def gym_bench():
    for i in range(3): box('slat', (2.4, .125, .04), (0, -.135 + i * .135, .46), WOOD, 'matte', bevel=.008, segs=2, var=.07, seed=i)
    for x in (-1.0, 1.0):
        for y in (-.17, .17): box('leg', (.04, .04, .44), (x, y, .22), STEEL, bevel=.004)
        box('cross', (.04, .4, .04), (x, 0, .42), STEEL, bevel=.004); box('foot', (.05, .42, .03), (x, 0, .015), STEEL, bevel=.004)
    box('rail', (2.04, .03, .03), (0, 0, .14), STEEL, bevel=.003)
    return .5, 2.4


def water_cooler():
    W = '#e9edf0'
    box('cabinet', (.32, .32, .94), (0, 0, .47), W, bevel=.02, segs=2)
    box('front panel', (.24, .006, .5), (0, -.161, .36), '#d6dde2', bevel=0)
    box('recess', (.22, .02, .2), (0, -.152, .8), '#2b3036', 'matte', bevel=.004)
    box('drip tray', (.18, .07, .02), (0, -.16, .71), '#5b6168', bevel=.003)
    for x, c in ((-.05, '#2f6fc0'), (.05, '#d9473b')): cyl('tap', .014, .04, (x, -.16, .87), (math.pi / 2, 0, 0), col=c, segs=8)
    lathe('collar', [(.12, .94), (.12, .97), (.09, .985)], W, segs=24, cap_bot=False)
    lathe('bottle', [(.04, .97), (.04, 1.0), (.13, 1.06), (.145, 1.1), (.145, 1.18), (.138, 1.2), (.145, 1.22), (.145, 1.32), (.138, 1.34), (.145, 1.36), (.145, 1.42), (.12, 1.47), (.0, 1.49)], '#8cc4e6', segs=24)
    return 1.49, .4


def glove(x, col, seed):
    """A boxing glove hanging fingers-down from a peg at (x, -0.15, 1.55)."""
    sphere('fist', .095, (x, -.13, 1.25), col, sub=2, scale=(1.0, .85, 1.3), seed=seed)
    sphere('knuckle roll', .07, (x, -.165, 1.19), col, sub=2, scale=(1.25, .8, 1.0), seed=seed + 1)
    sphere('thumb', .036, (x + .085, -.145, 1.3), col, sub=1, scale=(.9, .9, 1.7), seed=seed + 2)
    cyl('cuff', .062, .13, (x, -.125, 1.33), col=col, segs=14)
    cyl('strap', .066, .045, (x, -.125, 1.37), col='#f1ece0', cls='matte', segs=14)
    tube('loop', [(x - .02, -.125, 1.46), (x, -.15, 1.56), (x + .02, -.125, 1.46)], .004, '#e8e2d0', 'matte', res=4, bres=1)


def glove_rack():
    box('board', (2.6, .03, .14), (0, -.015, 1.55), DARKWOOD, 'matte', bevel=.008, var=.05)
    cols = ['#d9473b', '#2f6fc0', '#1d1f24', '#d9473b', '#f4c152']
    for k, c in enumerate(cols):
        x = -1.0 + k * .5
        cyl('peg', .013, .16, (x, -.03, 1.57), (math.pi / 2 + .2, 0, 0), col=CHROME, segs=8)
        glove(x, c, 100 + k * 5)
    for x in (-1.2, 1.2): cyl('screw', .01, .006, (x, -.03, 1.55), (math.pi / 2, 0, 0), col=CHROME, segs=6)
    return 1.65, 2.7


def medicine_balls():
    for (x, y, c, s) in ((0, 0, '#7a5238', 1), (.5, -.5, '#3b4350', 2), (0, -1.0, '#8f2f22', 3)):
        sphere('ball', .22, (x, y, .22), c, 'matte', sub=3, seed=s, var=.03)
        for turn in (Matrix.Rotation(math.pi / 2, 4, 'X' if s % 2 else 'Y'), Matrix.Identity(4)):  # two seams at right angles
            seam = lathe('seam', [(.221, -.01), (.2235, 0), (.221, .01)], '#1d1f24', 'matte', segs=32, cap_bot=False, cap_top=False)
            seam.data.transform(Matrix.Translation((x, y, .22)) @ turn)
    return .45, 1.2


def dumbbell(x, z, s):
    """A rubber hex dumbbell lying across the rack (axis along y)."""
    hl = .07 + .02 * s; r = .05 + .016 * s; w = .06 + .02 * s
    cyl('handle', .016, 2 * hl + .04, (x, hl + .02, z), (math.pi / 2, 0, 0), col=CHROME, segs=10)
    for side in (-1, 1):
        rot = (-side * math.pi / 2, 0, 0)  # -pi/2 points +z at +y
        cyl('head', r, w, (x, side * hl, z), rot, col='#24272d', cls='matte', segs=6, bevel=.006)
        cyl('end cap', r * .45, .006, (x, side * (hl + w), z), rot, col=CHROME, segs=10)


def dumbbell_rack():
    for x in (-.72, .72):
        for y in (-.2, .2): box('upright', (.045, .045, .7), (x, y, .35), STEEL, bevel=.004)
        box('foot', (.06, .5, .035), (x, 0, .0175), STEEL, bevel=.004)
        box('arm low', (.045, .48, .04), (x, 0, .28), STEEL, bevel=.004)
        box('arm high', (.045, .48, .04), (x, 0, .6), STEEL, bevel=.004, rot=(-.18, 0, 0))
    for y in (-.2, .2):
        box('rail low', (1.48, .045, .035), (0, y, .3), STEEL, bevel=.004)
    box('rail high f', (1.48, .045, .035), (0, -.2, .565), STEEL, bevel=.004); box('rail high b', (1.48, .045, .035), (0, .2, .635), STEEL, bevel=.004)
    for k in range(4):
        dumbbell(-.54 + k * .36, .66, k * .5)
        dumbbell(-.54 + k * .36, .38, 1.6 + k * .45)
    return .85, 1.5


def kettlebells():
    for k, (c, s) in enumerate((('#2f6fc0', .82), ('#f4c152', .92), ('#d9473b', 1.05))):
        x = -.36 + k * .36
        bell = lathe('bell', [(.0, 0), (.07 * s, 0), (.1 * s, .02 * s), (.115 * s, .08 * s), (.11 * s, .14 * s), (.08 * s, .19 * s), (.04 * s, .212 * s), (0, .216 * s)], c, segs=18)
        bell.data.transform(Matrix.Translation((x, 0, 0)))
        tube('handle', [(x - .07 * s, 0, .17 * s), (x - .06 * s, 0, .27 * s), (x, 0, .3 * s), (x + .06 * s, 0, .27 * s), (x + .07 * s, 0, .17 * s)], .017 * s, '#2a2d33', res=4, bres=2)
    return .32, 1.0


def skipping_ropes():
    box('rail', (.9, .025, .08), (0, -.0125, 1.62), DARKWOOD, 'matte', bevel=.006)
    for k, c in enumerate(('#d9473b', '#2f6fc0', '#1d1f24')):
        x = -.3 + k * .3
        tube('hook', [(x, -.02, 1.62), (x, -.08, 1.6), (x, -.09, 1.65)], .007, CHROME, res=4, bres=1)
        for side in (-1, 1):
            hx = x + side * .045
            cyl('handle', .016, .15, (hx, -.08, 1.42), col='#c9a36a', cls='matte', segs=8)
            tube('rope', [(hx, -.08, 1.42), (hx + side * .03, -.09, 1.1), (x + side * .02, -.1, .86), (x, -.1, .82)], .005, c, 'matte', res=5, bres=1)
    return 1.7, 1.0


def wall_clock():
    lathe('rim', [(.0, 0), (.27, 0), (.27, .035), (.285, .045), (.285, .07), (.262, .075)], '#1d1f24', segs=32)
    lathe('face', [(.262, .055), (.0, .055)], '#f7f0dc', 'matte', segs=32, cap_bot=False, cap_top=False)
    for i in range(12):
        a = 2 * math.pi * i / 12; box('tick', (.012, .045 if i % 3 == 0 else .025, .004), (math.sin(a) * .22, math.cos(a) * .22, .058), '#1d1f24', 'matte', bevel=0, rot=(0, 0, -a))
    box('hour hand', (.016, .13, .004), (math.sin(-.7) * .06, math.cos(-.7) * .06, .062), '#1d1f24', bevel=0, rot=(0, 0, .7))
    box('minute hand', (.01, .2, .004), (math.sin(2.1) * .095, math.cos(2.1) * .095, .066), '#1d1f24', bevel=0, rot=(0, 0, -2.1))
    box('second hand', (.004, .2, .003), (math.sin(3.6) * .08, math.cos(3.6) * .08, .07), '#d9473b', bevel=0, rot=(0, 0, -3.6))
    cyl('hub', .012, .016, (0, 0, .058), col='#1d1f24', segs=8)
    turn_free(Matrix.Rotation(math.pi / 2, 4, 'X'))  # face toward -y (the room), back on the wall
    return .6, .6


def ring_bell():
    box('board', (.3, .03, .5), (0, -.015, .25), DARKWOOD, 'matte', bevel=.01, segs=2, var=.04)
    lathe('dome', [(.0, .0), (.15, 0), (.155, .012), (.14, .05), (.1, .09), (.05, .11), (0, .115)], '#d9a93e', segs=28)
    cyl('stem', .012, .04, (0, 0, -.04), col='#b08a3e', segs=8)
    for ob in bpy.context.scene.objects:  # crown toward the room, open rim 4 cm in front of the board, centre 0.3 m up
        if ob.get('done') is None and ob.name.startswith(('dome', 'stem')): ob.data.transform(Matrix.Translation((0, -.04, .3)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    tube('striker arm', [(.12, -.04, .12), (.16, -.08, .2), (.15, -.12, .26)], .006, '#2a2d33', res=3, bres=1)
    sphere('striker', .018, (.15, -.125, .265), '#2a2d33', sub=1)
    return .55, .4


def speed_bag():
    box('backboard', (.9, .04, 1.0), (0, -.02, 1.8), DARKWOOD, 'matte', bevel=.01, segs=2, var=.04)
    box('platform', (1.1, .95, .07), (0, -.52, 2.24), '#6b4a33', 'matte', bevel=.02, segs=2, var=.04, seed=3)
    for x in (-.35, .35):
        tube('bracket', [(x, -.04, 1.45), (x, -.4, 1.85), (x, -.75, 2.2)], .018, STEEL, res=3, bres=1)
        tube('top bracket', [(x, -.04, 2.2), (x, -.9, 2.2)], .016, STEEL, res=2, bres=1)
    cyl('swivel plate', .05, .015, (0, -.55, 2.19), col=CHROME, segs=12)
    cyl('swivel', .012, .05, (0, -.55, 2.14), col=CHROME, segs=8)
    for part in (lathe('bag', [(.0, 1.82), (.05, 1.83), (.095, 1.88), (.11, 1.95), (.1, 2.02), (.07, 2.08), (.035, 2.12), (.012, 2.14), (0, 2.145)], '#8f2f22', segs=20),
                 lathe('seam', [(.112, 1.948), (.113, 1.955), (.112, 1.962)], '#5d1c15', 'matte', segs=20, cap_bot=False, cap_top=False)):
        part.data.transform(Matrix.Translation((0, -.55, 0)))
    return 2.3, 1.1


def corner_stool():
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        tube('leg', [(math.cos(a) * .22, math.sin(a) * .22, 0), (math.cos(a) * .17, math.sin(a) * .17, .25), (math.cos(a) * .13, math.sin(a) * .13, .5)], .015, STEEL, res=3, bres=1)
    lathe('foot ring', [(.185, .16), (.195, .165), (.195, .18), (.185, .185)], STEEL, segs=20, cap_bot=False, cap_top=False)
    lathe('seat', [(.15, .49), (.2, .5), (.215, .52), (.215, .56), (.205, .575), (.0, .58)], '#8f2f22', segs=24)
    lathe('seat rim', [(.217, .505), (.217, .52)], '#1d1f24', segs=24, cap_bot=False, cap_top=False)
    return .6, .5


def bucket_towel():
    lathe('bucket', [(.0, .005), (.14, .005), (.145, 0), (.152, .02), (.17, .29), (.178, .3), (.175, .305), (.162, .3), (.145, .03), (0, .03)], '#aab2bc', segs=24, cap_top=False, cap_bot=False)
    for z in (.1, .2): lathe('rib', [(.157 + z * .07, z - .006), (.161 + z * .07, z), (.157 + z * .07, z + .006)], '#9aa3ad', segs=24, cap_bot=False, cap_top=False)
    lathe('water', [(.16, .22), (0, .22)], '#4f6f86', segs=24, cap_bot=False, cap_top=False)
    tube('handle', [(-.17, 0, .28), (-.12, .02, .4), (0, .03, .44), (.12, .02, .4), (.17, 0, .28)], .006, '#7d858f', res=4, bres=1)
    # the towel: a cloth strip draped over the front rim (inside the bucket, over the rim, down the outside)
    path = [(-.09, .2), (-.15, .27), (-.18, .31), (-.2, .3), (-.21, .24), (-.215, .16), (-.22, .07)]
    nx, verts, faces = 6, [], []
    for j, (y, z) in enumerate(path):
        for i in range(nx + 1):
            u = i / nx; x = (u - .5) * .26
            verts.append((x, y - .012 * math.sin(u * math.pi * 2 + j) * (j > 3), z + .01 * math.sin(u * 7 + j * 1.3)))
    for j in range(len(path) - 1):
        for i in range(nx): a = j * (nx + 1) + i; faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    ob = poly('towel', verts, faces, '#f1ece0', 'matte', smooth=True, var=.03)
    m = ob.modifiers.new('thick', 'SOLIDIFY'); m.thickness = .012; m.offset = 0
    return .45, .45


def pendant_lamp():
    lathe('shade', [(.3, 0), (.29, .012), (.2, .09), (.09, .19), (.055, .24), (.05, .3), (.0, .3)], '#2f5d4a', segs=28, cap_bot=False)
    lathe('shade inside', [(.05, .23), (.085, .18), (.19, .085), (.28, .012), (.288, .004)], '#f2efe6', 'matte', segs=28, cap_bot=False, cap_top=False)
    cyl('socket', .028, .06, (0, 0, .17), col='#1d1f24', segs=10)
    sphere('bulb', .05, (0, 0, .13), '#fff3cf', 'glow', sub=2, scale=(1, 1, 1.2))
    cyl('cord', .006, 1.68, (0, 0, .3), col='#1d1f24', segs=6)
    cyl('ceiling rose', .05, .03, (0, 0, 1.95), col='#e6dcc6', segs=12)
    return 2.0, .6


PROPS = [('Lockers', lockers), ('Gym_bench', gym_bench), ('Water_cooler', water_cooler), ('Glove_rack', glove_rack),
         ('Medicine_balls', medicine_balls), ('Dumbbell_rack', dumbbell_rack), ('Kettlebells', kettlebells),
         ('Skipping_ropes', skipping_ropes), ('Wall_clock', wall_clock), ('Ring_bell', ring_bell), ('Speed_bag', speed_bag),
         ('Corner_stool', corner_stool), ('Bucket_towel', bucket_towel), ('Pendant_lamp', pendant_lamp)]
WALL = {'Glove_rack', 'Skipping_ropes', 'Wall_clock', 'Ring_bell', 'Speed_bag'}

reset(); built = []
for name, fn in PROPS:
    h, w = fn(); ob, tris = finish(name); built.append((ob, h, w)); print('PROP', name, 'tris', tris)
export([b[0] for b in built], os.path.join(OUT, 'gloryland-gym-props.glb'))
print('WROTE', os.path.join(OUT, 'gloryland-gym-props.glb'))
if RENDER:
    os.makedirs(PREVIEW, exist_ok=True)
    for ob, h, w in built:
        if ob.name == 'Wall_clock': ob.location.z = .6
        render([b[0] for b in built], ob, os.path.join(PREVIEW, 'gym-' + ob.name.lower() + '.png'), h, w, wall=ob.name in WALL)
        ob.location.z = 0
