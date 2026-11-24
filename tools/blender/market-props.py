# Market Row and Otto's Corner props for Glory of the Ring (round 2), modelled by script in headless Blender (bpy 5.x). They stand
# in for the box-built pieces of adventure/story/market-sets.js ('dream_market', 'dream_shop') at the same places and sizes;
# Mrs. Hazel's modelled stall (hazel-fruit-stall.glb), the heavy bags and the carried bag (MarketProps CARRY) stay as they are.
#   Market: Fruit_crate_{apples,oranges,lemons,pears,plums,limes} (slatted crate heaped with fruit), Stall_counter (trestle counter,
#   posts and the awning frame; the striped cloth stays generated), Barrel (apples), Sack (potatoes), Basket (wicker, fruit),
#   Price_board (A-frame chalk board), Hand_cart (two-wheeled cart with two crates and a sack).
#   Shop: Shop_counter, Cash_register, Glove_wall (pegboard with 16 pairs and two head guards), Shop_shelf (shoe boxes),
#   Display_stand (the price stand by the new bag; the price card stays generated text), Shop_cartons, Shop_bench, Shop_lamp.
# Conventions (origins, axes, material classes): prop_kit.py. Wall props (Glove_wall, Shop_shelf) have their back on the wall plane
# (Blender y = 0) and their origin on the floor below their centre; Shop_lamp's origin is the shade's rim.
#
# usage: <blender-venv>/bin/python tools/blender/market-props.py -- <asset dir> [<preview dir>] [--no-render]
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Matrix, Vector
from prop_kit import reset, srgb, lathe, cyl, box, sphere, tube, poly, finish, export, render, moved, heap, jitter, tint

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; PREVIEW = args[1] if len(args) > 1 and not args[1].startswith('--') else None; RENDER = '--no-render' not in args and PREVIEW
WOOD, WOOD_D, CRATE, STEEL, CHROME = '#9a7350', '#6b4630', '#b08a5e', '#3b4350', '#c9ccd2'
# fruit: colour, radius, shape (x, y, z scale), second colour mixed into some pieces
FRUIT = {'apples': ('#c8372d', .042, (1, 1, .9), '#8fb04a'), 'oranges': ('#f08a2c', .044, (1, 1, .95), '#e67a22'),
         'lemons': ('#f2d04e', .037, (1.3, 1, 1), '#e8c53a'), 'pears': ('#c9d65a', .04, (1, 1, 1.25), '#b5c24a'),
         'plums': ('#6e3f86', .03, (1, 1, 1.05), '#5a2f70'), 'limes': ('#7bc06b', .032, (1, 1, 1), '#5fa852')}


def fruit_piece(kind, at, seed):
    col, r, sc, alt = FRUIT[kind]; rnd = random.Random(seed)
    base = alt if rnd.random() < .3 else col
    ob = sphere('fruit', r, at, tint(base, rnd.uniform(.88, 1.1)), 'gloss', sub=2, scale=sc, noise=.04, seed=seed, var=.05)
    return ob


def fruit_crate(kind, seed=0):
    """A slatted wooden crate 0.6 x 0.45 x 0.27 m heaped with fruit (about 1.1k triangles)."""
    W, D, H = .6, .45, .27; rnd = random.Random(seed)
    box('bottom', (W - .02, D - .02, .02), (0, 0, .02), CRATE, 'matte', bevel=0, var=.06, seed=seed)
    for sx in (-1, 1):
        for sy in (-1, 1): box('post', (.035, .035, H), (sx * (W / 2 - .018), sy * (D / 2 - .018), H / 2), tint(CRATE, .82), 'matte', bevel=0)
    for k, (z0, z1) in enumerate(((.02, .115), (.15, .255))):
        for sy in (-1, 1): box('side slat', (W, .012, z1 - z0), (0, sy * (D / 2 - .006), (z0 + z1) / 2), tint(CRATE, rnd.uniform(.9, 1.08)), 'matte', bevel=0)
        for sx in (-1, 1): box('end slat', (.012, D - .02, z1 - z0), (sx * (W / 2 - .006), 0, (z0 + z1) / 2), tint(CRATE, rnd.uniform(.9, 1.08)), 'matte', bevel=0)
    box('label', (.16, .002, .06), (-.12, -D / 2 - .002, .2), '#efe3c2', 'matte', bevel=0)
    box('label band', (.16, .0025, .014), (-.12, -D / 2 - .003, .2), FRUIT[kind][0], 'matte', bevel=0)
    col, r = FRUIT[kind][0], FRUIT[kind][1]
    heap('fruit bed', W - .05, D - .05, .2, .07, r, tint(col, .8), seed=seed, nx=8, ny=6, var=.12)
    n = 10; pts = []
    for i in range(n):  # loose fruit on top, kept inside the rim
        for _ in range(20):
            x, y = rnd.uniform(-W / 2 + .05 + r, W / 2 - .05 - r), rnd.uniform(-D / 2 + .05 + r, D / 2 - .05 - r)
            if all((x - a) ** 2 + (y - b) ** 2 > (1.7 * r) ** 2 for a, b in pts): break
        pts.append((x, y)); e = max(abs(x) / (W / 2), abs(y) / (D / 2))
        fruit_piece(kind, (x, y, .2 + .07 * (1 - e ** 3) + r * .55), seed * 31 + i)
    return .36, .6


def stall_counter():
    """The trestle counter (3.0 m), its four posts and the awning frame; origin under the counter's centre (game z -3.15)."""
    W = 3.0; rnd = random.Random(7)
    for k in range(6): box('top plank', (W, .18, .05), (0, -.47 + k * .187, .89), tint('#c29a6f', rnd.uniform(.9, 1.07)), 'matte', bevel=.004)
    for k in range(10): box('front board', (.29, .025, .78), (-W / 2 + .16 + k * .297, -.5, .45), tint('#a97c55', rnd.uniform(.85, 1.08)), 'matte', bevel=0)
    for sx in (-1, 1): box('end panel', (.025, .96, .78), (sx * (W / 2 - .05), 0, .45), '#a97c55', 'matte', bevel=0)
    box('shelf', (W - .2, .8, .03), (0, .02, .2), tint('#a97c55', .85), 'matte', bevel=0)
    box('top rail', (W - .1, .04, .06), (0, -.51, .82), WOOD_D, 'matte', bevel=0)
    for sx in (-1, 1):
        x = sx * (W / 2 - .06)
        box('back post', (.08, .08, 2.88), (x, 1.05, 1.44), '#8a6446', 'matte', bevel=.006)
        box('front post', (.08, .08, 2.32), (x, -.6, 1.16), '#8a6446', 'matte', bevel=.006)
        box('foot', (.14, .14, .04), (x, 1.05, .02), WOOD_D, 'matte', bevel=0); box('foot', (.14, .14, .04), (x, -.6, .02), WOOD_D, 'matte', bevel=0)
        L = math.hypot(1.65, .55); a = math.atan2(.55, 1.65)
        box('side rail', (.05, L, .05), (x, .225, 2.58), '#7e5b3c', 'matte', bevel=0, rot=(a, 0, 0))
        box('brace', (.035, .55, .035), (x, .8, 2.6), '#7e5b3c', 'matte', bevel=0, rot=(-.9, 0, 0))
    box('front beam', (W, .06, .06), (0, -.6, 2.29), '#7e5b3c', 'matte', bevel=0)
    box('back beam', (W, .06, .06), (0, 1.05, 2.85), '#7e5b3c', 'matte', bevel=0)
    box('mid beam', (W, .05, .05), (0, .225, 2.56), '#7e5b3c', 'matte', bevel=0, rot=(math.atan2(.55, 1.65), 0, 0))
    for sx in (-1, 1): sphere('lamp hook', .012, (sx * .7, -.6, 2.25), STEEL, sub=1)
    return 2.9, 3.0


def barrel():
    """A wooden barrel of apples (r 0.3, 0.8 m), staves and three iron hoops."""
    prof = [(.27, 0), (.29, .1), (.305, .25), (.31, .4), (.305, .55), (.29, .7), (.27, .8)]
    lathe('staves', prof, '#8a5a38', 'matte', segs=16, var=.14, seed=3, cap_top=False, smooth=True)
    lathe('inner', [(.26, .79), (.26, .72)], '#5b3a24', 'matte', segs=16, cap_bot=False, cap_top=False)
    for z, r in ((.06, .282), (.25, .307), (.55, .307), (.74, .282)): lathe('hoop', [(r, z - .02), (r + .006, z - .015), (r + .006, z + .015), (r, z + .02)], '#2f3236', 'gloss', segs=16, cap_bot=False, cap_top=False)
    heap('apples', .5, .5, .72, .08, .04, tint('#b8342a', .85), seed=4, nx=8, ny=8, round_=True)
    for i, (x, y) in enumerate(((-.1, .05), (.08, -.1), (.12, .1), (-.05, -.13), (0, .0), (-.16, -.04))): fruit_piece('apples', (x, y, .79 + .03 * (i % 2)), 70 + i)
    return .85, .65


def sack(seed=11):
    """A burlap sack of potatoes, the top rolled down."""
    s = lathe('sack', [(.0, 0), (.2, .005), (.25, .05), (.27, .18), (.26, .32), (.23, .42), (.22, .47)], '#b89a6e', 'matte', segs=14, cap_top=False, var=.08, seed=seed)
    jitter(s, .014, seed)
    lathe('rolled lip', [(.215, .45), (.25, .465), (.255, .5), (.235, .52), (.21, .5)], '#a8895e', 'matte', segs=14, cap_bot=False, cap_top=False, var=.06, seed=seed + 1)
    heap('potatoes', .42, .42, .46, .05, .035, '#a07a4a', seed=seed, nx=6, ny=6, round_=True)
    rnd = random.Random(seed)
    for i in range(5):
        a = i * 1.3; sphere('potato', .035, (math.cos(a) * .1, math.sin(a) * .1, .51), tint('#a8804e', rnd.uniform(.85, 1.1)), 'matte', sub=1, scale=(1.3, 1, .9), noise=.12, seed=seed + i)
    return .55, .55


def basket(kind='apples', seed=21):
    """A round wicker basket with a handle, heaped with fruit (0.42 m across)."""
    lathe('wicker', [(.0, 0), (.15, 0), (.17, .02), (.2, .16), (.21, .2)], '#b8915a', 'matte', segs=18, cap_top=False, var=.16, seed=seed)
    lathe('rim', [(.205, .19), (.222, .2), (.222, .215), (.205, .225)], '#8f6a3e', 'matte', segs=18, cap_bot=False, cap_top=False)
    heap('fruit bed', .38, .38, .18, .05, FRUIT[kind][1], tint(FRUIT[kind][0], .82), seed=seed, nx=6, ny=6, round_=True)
    for i in range(6): a = i * 1.05; fruit_piece(kind, (math.cos(a) * .09, math.sin(a) * .09, .24 + .01 * (i % 2)), seed * 7 + i)
    tube('handle', [(-.2, 0, .21), (-.15, 0, .38), (0, 0, .44), (.15, 0, .38), (.2, 0, .21)], .011, '#8f6a3e', 'matte', res=4, bres=1)
    return .45, .45


def price_board():
    """An A-frame chalk board (0.5 x 0.78 m), the written face toward -y; chalk prices as strokes."""
    from prop_kit import free_parts
    for side in (-1, 1):
        before = set(o.name for o in free_parts())
        box('frame', (.5, .03, .78), (0, 0, .39), '#8a6446', 'matte', bevel=.004)
        box('slate', (.42, .012, .6), (0, side * .016, .43), '#2e3b33', 'matte', bevel=0)
        if side < 0:
            for k, (w, x) in enumerate(((.3, -.02), (.2, -.07), (.26, -.04), (.14, -.1))):
                box('chalk', (w, .004, .018), (x, -.024, .64 - k * .1), '#f3ead8', 'matte', bevel=0)
            for k in range(3): box('chalk price', (.06, .004, .03), (.14, -.024, .54 - k * .1), '#ffd166', 'matte', bevel=0)
        mat = Matrix.Translation((0, 0, .77 - .016)) @ Matrix.Rotation(side * .22, 4, 'X') @ Matrix.Translation((0, 0, -.77))  # feet on the floor
        for ob in free_parts():
            if ob.name not in before and ob.type == 'MESH': ob.data.transform(mat)
    tube('hinge', [(-.24, 0, .754), (.24, 0, .754)], .01, STEEL, res=1, bres=1)
    return .8, .5


def hand_cart():
    """A two-wheeled market hand cart (1.5 m bed), two crates and a sack on it; handles toward +x."""
    rnd = random.Random(5)
    for k in range(7): box('bed plank', (1.4, .11, .035), (0, -.33 + k * .11, .56), tint('#a97c55', rnd.uniform(.88, 1.06)), 'matte', bevel=0)
    for sy in (-1, 1):
        box('side board', (1.4, .025, .16), (0, sy * .39, .64), '#8a6446', 'matte', bevel=0)
        box('frame', (1.9, .05, .06), (.2, sy * .3, .51), WOOD_D, 'matte', bevel=0)
        cyl('grip', .022, .14, (1.15, sy * .3, .51), (0, math.pi / 2, 0), col='#3a2b24', cls='matte', segs=8)
        box('leg', (.05, .05, .5), (-.6, sy * .3, .26), WOOD_D, 'matte', bevel=0)
    for sx in (-1, 1): box('end board', (.025, .8, .16), (sx * .7, 0, .64), '#8a6446', 'matte', bevel=0)
    cyl('axle', .02, .95, (.15, -.475, .32), (-math.pi / 2, 0, 0), col=STEEL, segs=8)
    for sy in (-1, 1):
        y = sy * .45
        tyre = lathe('tyre', [(.3, -.03), (.32, -.02), (.325, 0), (.32, .02), (.3, .03), (.29, 0)], '#3a2b24', 'matte', segs=24, cap_bot=False, cap_top=False)
        rim = lathe('felloe', [(.26, -.025), (.29, -.025), (.29, .025), (.26, .025)], '#8a6446', 'matte', segs=24, cap_bot=False, cap_top=False)
        hub = cyl('hub', .06, .1, (0, 0, -.05), col=WOOD_D, cls='matte', segs=10)
        for ob in (tyre, rim, hub): ob.data.transform(Matrix.Translation((.15, y, .32)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
        for k in range(8):
            a = k * math.pi / 4
            box('spoke', (.024, .02, .24), (.15 + math.sin(a) * .15, y, .32 + math.cos(a) * .15), '#8a6446', 'matte', bevel=0, rot=(0, a, 0))
    moved(fruit_crate, (-.35, .02, .575), .1, 1.0, 'apples', 41)
    moved(fruit_crate, (.28, -.03, .575), -.08, 1.0, 'oranges', 42)
    moved(sack, (.33, .05, .855), .4, .62, 43)
    return 1.2, 1.9


# ---------------------------------------------------------------- Otto's Corner
def shop_counter():
    """Otto's counter (2.6 x 0.62 x 0.95 m): panelled front, varnished top; origin under its centre."""
    box('carcass', (2.6, .6, .9), (0, 0, .45), '#6b4630', 'matte', bevel=.004)
    box('kick', (2.56, .56, .1), (0, -.025, .05), '#3a2b24', 'matte', bevel=0)
    box('top', (2.7, .7, .05), (0, -.03, .925), '#8a6446', 'gloss', bevel=.008, segs=2)
    for k in range(3):
        x = -.86 + k * .86
        box('panel', (.74, .012, .54), (x, -.306, .5), '#7a5238', 'matte', bevel=.004)
        box('panel bead', (.66, .006, .46), (x, -.313, .5), '#6b4630', 'matte', bevel=0)
    for x in (-1.29, -.43, .43, 1.29): box('stile', (.05, .014, .78), (x, -.307, .5), '#5b3a2a', 'matte', bevel=0)
    return 1.0, 2.7


def cash_register():
    """A vintage brass cash register (0.38 m wide) with a key deck, a drawer and a crank; front toward -y."""
    BR = '#b08a3e'
    box('drawer', (.38, .34, .09), (0, 0, .045), '#5b3a2a', 'matte', bevel=.004)
    box('drawer front', (.34, .01, .06), (0, -.172, .045), BR, 'gloss', bevel=.002)
    box('body', (.36, .26, .16), (0, .03, .17), BR, 'gloss', bevel=.01, segs=2)
    deck = box('key deck', (.34, .16, .02), (0, -.1, .2), '#3a2b24', 'matte', bevel=0, rot=(.45, 0, 0))
    for r in range(3):
        for k in range(5):
            y, z = -.155 + r * .045, .17 + r * .022
            cyl('key', .011, .018, (-.12 + k * .06, y, z), (.45, 0, 0), col='#f3ead8', segs=6)
    box('top', (.3, .2, .1), (0, .06, .3), BR, 'gloss', bevel=.008)
    box('window', (.2, .01, .05), (0, -.042, .31), '#14181c', 'gloss', bevel=0)
    for k, c in enumerate(('#f3ead8', '#f3ead8', '#d9473b')): box('price flag', (.035, .004, .03), (-.05 + k * .05, -.046, .31), c, 'matte', bevel=0)
    tube('crank', [(.19, .05, .16), (.24, .05, .18), (.26, .0, .22)], .008, CHROME, res=3, bres=1)
    sphere('crank knob', .016, (.26, -.005, .225), '#1d1f24', sub=1)
    return .4, .45


def glove(x, z, col, seed, side):
    """A small glove hanging cuff-up (the generated pair: 0.19 x 0.25 m), at wall distance 0.14 m."""
    sphere('fist', .095, (x, -.14, z), col, sub=2, scale=(1, .9, 1.3), seed=seed)
    sphere('thumb', .04, (x - side * .07, -.19, z + .03), tint(col, .9) if isinstance(col, str) else col, sub=1, scale=(.9, .9, 1.4), seed=seed + 1)
    cyl('cuff', .066, .1, (x, -.14, z + .1), col='#f4f1ea', cls='matte', segs=8)


def glove_wall():
    """Otto's pegboard (4.6 x 1.95 m from 1.05 m up) with three rows of glove pairs and two head guards; back on the wall."""
    box('board', (4.6, .04, 1.95), (0, -.02, 1.05 + .975), '#c9a77a', 'matte', bevel=.004, var=.03)
    verts, faces = [], []
    for i in range(22):
        for j in range(9):
            x, z = -2.1 + i * .2, 1.15 + j * .2; k = len(verts)
            verts += [(x - .01, -.0405, z - .01), (x + .01, -.0405, z - .01), (x + .01, -.0405, z + .01), (x - .01, -.0405, z + .01)]; faces.append((k, k + 1, k + 2, k + 3))
    poly('peg holes', verts, faces, '#7a5d40', 'matte')
    G = ['#d9473b', '#2f6fc0', '#1d1f24', '#f4c152', '#f4f1ea', '#c0392b', '#3a7d44', '#8f2f22']
    for r in range(3):
        for k in range(6):
            gx, gy, col = -1.85 + k * .72 + (r % 2) * .2, 2.55 - r * .55, G[(k + r * 3) % len(G)]
            cyl('peg', .008, .12, (gx, -.04, gy), (math.pi / 2 + .25, 0, 0), col=CHROME, segs=6)
            if r == 2 and k % 3 == 1:
                lathe('head guard', [(.0, 0), (.13, .02), (.15, .1), (.14, .2), (.09, .27), (0, .29)], col, 'gloss', segs=12, seed=r * 9 + k).data.transform(Matrix.Translation((gx, -.17, gy - .32)))
                box('face bar', (.2, .03, .05), (gx, -.31, gy - .2), tint(col, .7), 'gloss', bevel=0)
                continue
            for s in (-1, 1): glove(gx + s * .1, gy - .2, col, 300 + r * 20 + k * 2 + (s > 0), s)
            tube('lace', [(gx - .1, -.13, gy - .08), (gx, -.1, gy - .01), (gx + .1, -.13, gy - .08)], .004, '#e9e2cc', 'matte', res=2, bres=0)
    return 3.0, 4.6


def shop_shelf():
    """A wall shelving unit (2.0 m long, 0.42 deep) with shoe boxes and rolls of tape on three shelves; back on the wall."""
    COL = ['#f4f1ea', '#d9473b', '#1d1f24', '#2f6fc0', '#f4c152']
    for x in (-.98, 0, .98): box('upright', (.04, .4, 1.68), (x, -.21, .84), '#5b3a2a', 'matte', bevel=0)
    for y in (.5, 1.05, 1.6):
        box('shelf', (2.0, .42, .035), (0, -.23, y + .0175), '#8a6446', 'matte', bevel=.003, var=.04)
        for k in range(5):
            c = COL[(k + round(y * 10)) % 5]; h = .2 + (k % 2) * .05; x = -.8 + k * .4
            box('shoe box', (.32, .3, h - .02), (x, -.24, y + .035 + (h - .02) / 2), c, 'matte', bevel=0)
            box('lid', (.33, .31, .025), (x, -.24, y + .035 + h - .012), tint(c, .85) if c != '#1d1f24' else '#2c3038', 'matte', bevel=0)
            box('label', (.08, .004, .04), (x + .08, -.391, y + .035 + h * .45), '#efe3c2' if c != '#f4f1ea' else '#d9473b', 'matte', bevel=0)
    return 1.7, 2.0


def display_stand():
    """The price stand by the new heavy bag: a weighted base, a pole and a clip; the card itself is the game's text board."""
    lathe('base', [(.0, 0), (.16, 0), (.16, .015), (.12, .03), (.03, .04), (0, .04)], '#2a2d33', 'gloss', segs=16)
    cyl('pole', .012, 1.05, (0, 0, .04), col=CHROME, segs=8)
    box('clip', (.08, .02, .03), (0, 0, 1.08), CHROME, bevel=.003)
    return 1.1, .35


def shop_cartons():
    """Three cardboard cartons stacked, taped."""
    for (x, y, z, w, d, h, r, k) in ((0, 0, 0, .6, .45, .4, .0, 1), (.05, .02, .4, .5, .4, .32, .12, .92), (-.02, -.0, .72, .36, .3, .24, -.2, 1.05)):
        def one():
            box('carton', (w, d, h), (0, 0, h / 2), tint('#b8915a', k), 'matte', bevel=.004)
            box('tape', (w + .004, .06, .004), (0, 0, h + .001), '#c9a46a', 'matte', bevel=0)
            box('tape', (.004, .06, h * .6), (w / 2 + .001, 0, h * .7), '#c9a46a', 'matte', bevel=0)
            box('print', (w * .4, .002, h * .25), (-w * .15, -d / 2 - .001, h * .5), '#5a4a3a', 'matte', bevel=0)
        moved(one, (x, y, z), r)
    return .96, .6


def shop_bench():
    """A short waiting bench (1.3 m), varnished seat on two steel frames."""
    box('seat', (1.3, .42, .05), (0, 0, .445), '#9a7350', 'gloss', bevel=.008, segs=2)
    for x in (-.55, .55):
        box('frame', (.05, .36, .035), (x, 0, .405), STEEL, bevel=.003)
        for y in (-.15, .15): box('leg', (.04, .04, .4), (x, y, .2), STEEL, bevel=.003)
        box('foot', (.05, .38, .02), (x, 0, .01), STEEL, bevel=0)
    return .5, 1.3


def shop_lamp():
    """An enamel pendant over the shop floor: rim at the origin, cord to the 3.2 m ceiling (0.65 m)."""
    lathe('shade', [(.32, 0), (.31, .01), (.22, .08), (.1, .17), (.05, .2), (.045, .24), (0, .24)], '#2f4a3d', 'gloss', segs=24, cap_bot=False)
    lathe('shade inside', [(.045, .19), (.095, .16), (.21, .075), (.3, .01), (.31, .003)], '#f2efe6', 'matte', segs=24, cap_bot=False, cap_top=False)
    sphere('bulb', .05, (0, 0, .1), '#fff3cf', 'glow', sub=2, scale=(1, 1, 1.2))
    cyl('socket', .025, .05, (0, 0, .15), col='#1d1f24', segs=10)
    cyl('cord', .006, .41, (0, 0, .24), col='#1d1f24', segs=6)
    cyl('ceiling rose', .05, .03, (0, 0, .62), col='#e6dcc6', segs=12)
    return .65, .64


PROPS = [(f'Fruit_crate_{k}', (lambda k=k, i=i: fruit_crate(k, 11 + i))) for i, k in enumerate(FRUIT)] + [
    ('Stall_counter', stall_counter), ('Barrel', barrel), ('Sack', sack)] + [(f'Basket_{k}', (lambda k=k, i=i: basket(k, 21 + i))) for i, k in enumerate(('apples', 'pears', 'oranges'))] + [('Price_board', price_board), ('Hand_cart', hand_cart),
    ('Shop_counter', shop_counter), ('Cash_register', cash_register), ('Glove_wall', glove_wall), ('Shop_shelf', shop_shelf),
    ('Display_stand', display_stand), ('Shop_cartons', shop_cartons), ('Shop_bench', shop_bench), ('Shop_lamp', shop_lamp)]
WALL = {'Glove_wall', 'Shop_shelf'}

reset(); built = []
for name, fn in PROPS:
    h, w = fn(); ob, tris = finish(name); built.append((ob, h, w)); print('PROP', name, 'tris', tris)
export([b[0] for b in built], os.path.join(OUT, 'gloryland-market-props.glb'))
from glb_pack import pack; print('PACKED', *pack(os.path.join(OUT, 'gloryland-market-props.glb')))  # KHR_mesh_quantization: byte normals and colours
print('WROTE', os.path.join(OUT, 'gloryland-market-props.glb'))
if RENDER:
    os.makedirs(PREVIEW, exist_ok=True)
    for ob, h, w in built:
        if ob.name == 'Shop_lamp': ob.location.z = .4
        render([b[0] for b in built], ob, os.path.join(PREVIEW, 'market-' + ob.name.lower() + '.png'), h, w, wall=ob.name in WALL, res=260, samples=16)
        ob.location.z = 0
