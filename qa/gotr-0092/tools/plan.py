"""Writes the shot plans (heads, bodies, fight, closeups) for shots.cjs. Usage: plan.py <outDir> [who,...]"""
import json, sys, math
out = sys.argv[1]; who = (sys.argv[2] if len(sys.argv) > 2 else 'lion,fang,hazel,otto').split(',')
V = [('front', 0), ('34', .75), ('side', math.pi / 2)]
heads = {'size': [360, 400], 'frames': []}
for w in who:
    for n, y in V: heads['frames'].append({'name': f'{w}-head-{n}', 'who': [w], 'pose': 'stand', 'look': {'yaw': 0, 'pitch': 0}, 'cam': {'yaw': y, 'look': [0, 1.96, 0], 'dist': 1.45, 'lift': .05}})
    heads['frames'].append({'name': f'{w}-head-talk', 'who': [w], 'pose': 'talk', 'talkAmount': 1, 'look': {'yaw': 0, 'pitch': 0}, 'cam': {'yaw': .75, 'look': [0, 1.96, 0], 'dist': 1.45, 'lift': .05}})
json.dump(heads, open(f'{out}/heads.json', 'w'))
bodies = {'size': [300, 520], 'frames': []}
for w in who:
    for n, y in V + [('back', math.pi)]: bodies['frames'].append({'name': f'{w}-body-{n}', 'who': [w], 'pose': 'stand', 'cam': {'yaw': y, 'look': [0, 1.0, 0], 'dist': 5.4, 'lift': .25}})
    bodies['frames'].append({'name': f'{w}-body-walk', 'who': [w], 'pose': 'walk', 't': 2.37, 'cam': {'yaw': .9, 'look': [0, 1.0, 0], 'dist': 5.4, 'lift': .25}})
json.dump(bodies, open(f'{out}/bodies.json', 'w'))
fight = {'size': [640, 420], 'frames': []}
for i, (mv, ph) in enumerate([('guard', 0), ('jab', .5), ('cross', .5), ('hook', .5)]):
    fight['frames'].append({'name': f'fang-fight-{mv}', 'who': ['fang', 'lion'], 'at': [[-.82, 0, math.pi / 2], [.82, 0, -math.pi / 2]], 'pose': [{'move': mv, 'ph': ph}, {'move': 'guard', 'ph': 0}], 'cam': {'yaw': .35, 'look': [0, 1.3, 0], 'dist': 3.6, 'lift': .1}})
    fight['frames'].append({'name': f'fang-fight-{mv}-close', 'who': ['fang'], 'at': [[0, 0, .5]], 'pose': {'move': mv, 'ph': ph}, 'cam': {'yaw': .2, 'look': [0, 1.45, 0], 'dist': 2.4, 'lift': .05}})
json.dump(fight, open(f'{out}/fight.json', 'w'))
mouth = {'size': [360, 300], 'frames': []}
for w, lz in [('fang', .32), ('hazel', .27), ('otto', .22)]:
    for n, a in [('closed', 0), ('open', 1)]:
        mouth['frames'].append({'name': f'{w}-mouth-{n}', 'who': [w], 'pose': 'talk', 'talkAmount': a, 'look': {'yaw': 0, 'pitch': 0}, 'cam': {'yaw': 1.1, 'look': [0, 1.92, lz], 'dist': .9, 'lift': 0}})
json.dump(mouth, open(f'{out}/mouth.json', 'w'))
dbg = {'size': [360, 300], 'frames': []}
for k, h in enumerate([[], ['lapels'], ['studs', 'zips'], ['chain'], ['ruff', 'crown', 'brows']]):
    dbg['frames'].append({'name': f'dbg-{k}', 'who': ['fang'], 'at': [[0, 0, .5]], 'hide': h, 'pose': {'move': 'cross', 'ph': .5}, 'cam': {'yaw': .2, 'look': [0, 1.65, 0], 'dist': 1.6, 'lift': .05}})
json.dump(dbg, open(f'{out}/dbg.json', 'w'))
