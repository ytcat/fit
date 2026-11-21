"""Writes qa/rourke/tools/plan.json: Rourke's studio evidence frames (402x690) for qa/gotr-0092/tools/shots.cjs.
Usage: python3 qa/rourke/tools/plan.py && APP_URL=http://127.0.0.1:PORT/ node qa/gotr-0092/tools/shots.cjs qa/rourke/tools/plan.json <outDir>"""
import json, math, os
H = [0, 1.95, .17]
f = []
for n, y in [('front', .0), ('three-quarter', .72), ('profile', math.pi / 2)]:
    f.append({'name': f'rourke-head-{n}', 'who': ['rourke'], 'pose': 'stand', 'look': {'yaw': 0, 'pitch': 0}, 'cam': {'yaw': y, 'look': H, 'dist': 2.35, 'lift': .12, 'fov': 30}})
f.append({'name': 'rourke-head-talk', 'who': ['rourke'], 'pose': 'talk', 'talkAmount': 1, 'look': {'yaw': 0, 'pitch': 0}, 'cam': {'yaw': .9, 'look': H, 'dist': 2.35, 'lift': .12, 'fov': 30}})
f.append({'name': 'rourke-body-film', 'who': ['rourke'], 'pose': 'stand', 'cam': {'yaw': .55, 'look': [0, 1.02, 0], 'dist': 6.4, 'lift': .3}})
f.append({'name': 'rourke-body-back', 'who': ['rourke'], 'pose': 'stand', 'cam': {'yaw': math.pi * .82, 'look': [0, 1.02, 0], 'dist': 6.4, 'lift': .3}})
json.dump({'size': [402, 690], 'frames': f}, open(os.path.join(os.path.dirname(__file__), 'plan.json'), 'w'), indent=1)
