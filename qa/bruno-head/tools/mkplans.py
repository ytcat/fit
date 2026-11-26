"""Plans for studio.cjs: python3 mkplans.py -> plan-*.json next to this file."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
# close views of the head-neck-collar join: front, side, back, below (camera at chest height looking up), 3/4
views = [('front', 0, .0, 1.0), ('side', 1.57, -.03, 1.0), ('back', 3.14, .05, 1.1), ('below', .35, -.6, .9), ('q34', .8, -.1, 1.0), ('backq', 2.4, .02, 1.05)]
def cam(n, y, p, d): return dict(yaw=y, pitch=p, look='head', off=[0, -.06, .02 if n not in ('back', 'backq') else -.06], dist=d, fov=30)
fr = []
for pose in ('stand', 'talk', 'walk', 'point', 'count', 'raise'):
    for n, y, p, d in views:
        for head in (False, True):
            fr.append(dict(name=pose + '-' + n + ('-after' if head else '-before'), head=head, pose=pose, cam=cam(n, y, p, d)))
json.dump(dict(who='bruno', size=[300, 300], frames=fr), open(os.path.join(H, 'plan-seams.json'), 'w'))
# whole figure at phone size, before/after
fb = []
for n, y in (('front', 0), ('q34', .75), ('side', 1.57), ('back', 3.14)):
    for head in (False, True):
        fb.append(dict(name='body-' + n + ('-after' if head else '-before'), head=head, pose='stand', cam=dict(yaw=y, pitch=.02, look=[0, 1.15, 0], dist=6.2, fov=30)))
for n, y in (('front', 0), ('q34', .75)):
    for head in (False, True):
        fb.append(dict(name='face-' + n + ('-after' if head else '-before'), head=head, pose='stand', cam=dict(yaw=y, pitch=.02, look='head', off=[0, .12, .05], dist=1.25, fov=30)))
json.dump(dict(who='bruno', size=[402, 690], frames=fb), open(os.path.join(H, 'plan-body.json'), 'w'))
print(len(fr), len(fb))
