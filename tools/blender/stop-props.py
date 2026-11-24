# Bus stop props for Glory of the Ring (round 2), modelled by script in headless Blender (bpy 5.x). The opening film's shelter,
# bench, stop pole and timetable are already modelled (assets/street/ch01-station); this file models the piece that was still
# box-built beside them in adventure/story/dream-sets.js ('dream_street'): the Ticket_machine (0.62 x 0.42 x 1.6 m, screen,
# keypad, card reader, coin slot, ticket tray, a little canopy), at the same place and size.
# Conventions: prop_kit.py.
#
# usage: <blender-venv>/bin/python tools/blender/stop-props.py -- <asset dir> [<preview dir>] [--no-render]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from prop_kit import reset, lathe, cyl, box, sphere, tube, finish, export, render

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; PREVIEW = args[1] if len(args) > 1 and not args[1].startswith('--') else None; RENDER = '--no-render' not in args and PREVIEW
BLUE, BLUE_D, INK = '#2f6fc0', '#254f86', '#12151b'


def ticket_machine():
    box('plinth', (.58, .38, .06), (0, 0, .03), '#2a2f38', 'matte', bevel=.004)
    box('cabinet', (.62, .42, 1.5), (0, 0, .06 + .75), BLUE, bevel=.025, segs=2)
    box('face', (.54, .012, 1.0), (0, -.212, .95), '#3a7fd0', bevel=.004)
    box('screen bezel', (.42, .02, .3), (0, -.22, 1.2), '#1d2330', bevel=.008)
    box('screen', (.36, .006, .24), (0, -.231, 1.2), '#9fd3f2', 'glow', bevel=0)
    box('screen text', (.24, .002, .02), (-.03, -.235, 1.27), '#2f6fc0', 'glow', bevel=0)
    box('label', (.3, .006, .1), (0, -.22, .88), '#f4c152', bevel=0)
    for r in range(4):
        for k in range(3): box('key', (.045, .012, .035), (-.15 + k * .055, -.222, 1.0 - r * .05), '#d6dde2', bevel=.003)
    box('card reader', (.12, .03, .08), (.13, -.226, .98), INK, bevel=.006)
    box('card slot', (.07, .004, .006), (.13, -.242, .99), '#4cd964', 'glow', bevel=0)
    box('coin slot', (.05, .01, .012), (.13, -.222, 1.06), '#c9ccd2', bevel=0)
    box('tray recess', (.3, .03, .1), (0, -.205, .58), INK, 'matte', bevel=.004)
    box('tray lip', (.32, .04, .015), (0, -.225, .53), '#c9ccd2', bevel=.003)
    box('canopy', (.7, .5, .06), (0, -.02, 1.59), BLUE_D, bevel=.012, segs=2)
    box('canopy band', (.7, .012, .04), (0, -.276, 1.59), '#f4c152', bevel=0)
    for x in (-.25, .25): cyl('bolt', .012, .01, (x, -.17, .06), col='#c9ccd2', segs=6)
    return 1.62, .7


PROPS = [('Ticket_machine', ticket_machine)]
reset(); built = []
for name, fn in PROPS:
    h, w = fn(); ob, tris = finish(name); built.append((ob, h, w)); print('PROP', name, 'tris', tris)
export([b[0] for b in built], os.path.join(OUT, 'gloryland-stop-props.glb'))
from glb_pack import pack; print('PACKED', *pack(os.path.join(OUT, 'gloryland-stop-props.glb')))  # KHR_mesh_quantization: byte normals and colours
print('WROTE', os.path.join(OUT, 'gloryland-stop-props.glb'))
if RENDER:
    os.makedirs(PREVIEW, exist_ok=True)
    for ob, h, w in built: render([b[0] for b in built], ob, os.path.join(PREVIEW, 'stop-' + ob.name.lower() + '.png'), h, w, res=260, samples=16)
