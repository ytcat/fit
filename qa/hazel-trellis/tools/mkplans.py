import json, os
H = os.path.dirname(os.path.abspath(__file__))
views = [('front', 0, .0, 1.1), ('side', 1.57, -.05, 1.1), ('back', 3.14, .05, 1.2), ('below', .3, -.55, 1.0), ('tq', .8, -.12, 1.1)]
def cam(n, y, p, d): return dict(yaw=y, pitch=p, look='head', off=[0, -.09, .03 if n != 'back' else -.06], dist=d, fov=30)
for who in ('hazel', 'fang'):
    fr = []
    wears = ['jacket', 'fight'] if who == 'fang' else [None]
    for w in wears:
        for pose in ('stand', 'talk', 'walk'):
            if w == 'fight' and pose != 'stand': continue
            for n, y, p, d in views:
                f = dict(name=(w + '-' if w else '') + pose + '-' + n, head=True, pose=pose, cam=cam(n, y, p, d))
                if w: f['wear'] = w
                fr.append(f)
    if who == 'fang':
        for n, y, p, d in views:
            fr.append(dict(name='fight-guard-' + n, head=True, wear='fight', pose={'move': 'guard'}, cam=cam(n, y, p, d)))
    json.dump(dict(who=who, size=[300, 300], frames=fr), open(os.path.join(H, 'plan-seam-' + who + '.json'), 'w'))
    print(who, len(fr))
