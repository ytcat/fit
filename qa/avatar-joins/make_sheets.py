"""python3 qa/avatar-joins/make_sheets.py <before frames dir> <after frames dir> <out dir>
Builds the before/after seam sheets of qa/avatar-joins/AUDIT.md from batch.cjs frames (<dir>/<variant>/<pose>-<join>-<view>.png)."""
import os, sys, subprocess
B, A, OUT = sys.argv[1:4]
SHEET = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sheet.py')

def tiles(name, title, cols, items):
    args = []
    for path, label in items:
        if os.path.exists(path):
            args += [path, label]
    if args:
        subprocess.run(['python3', SHEET, 'tiles', os.path.join(OUT, name), title, str(cols)] + args, check=True)

def pairs(name, title, frames):
    """frames: [(variant, frame)] -> rows of before | after"""
    items = []
    for v, f in frames:
        items += [(os.path.join(B, v, f + '.png'), f'before {v} {f}'), (os.path.join(A, v, f + '.png'), f'after {v} {f}')]
    tiles(name, title, 4, items)

def after_only(name, title, frames, cols=4):
    tiles(name, title, cols, [(os.path.join(A, v, f + '.png'), f'{v} {f}') for v, f in frames])

pairs('shorts-before-after.webp', 'Shorts openings: saw-tooth hems and the rim under the waistband (before | after)',
      [('lion-kit', 'walkA-hipR-below'), ('lion-kit', 'guard-hipR-below'), ('lion-kit', 'walkA-waist-front'), ('lion-kit', 'guard-waist-side'),
       ('rabbit-kit', 'walkA-hipR-below'), ('brick', 'walkA-hipR-below'), ('brick', 'walkA-waist-side'), ('lion-kit', 'walkA-tail-below')])
pairs('cuff-before-after.webp', 'Glove cuff: the forearm came out through the strap (before | after)',
      [('lion-kit', 'guard-wristR-side'), ('lion-kit', 'guard-wristR-front'), ('lion-kit', 'uppercut-wristR-below'), ('lion-kit', 'uppercut-wristR-q34'),
       ('lion-kit', 'hook-wristL-front'), ('rabbit-kit', 'guard-wristR-side'), ('brick', 'guard-wristR-side'), ('brick', 'guard-wristR-q34')])
pairs('piping-before-after.webp', 'Shorts side piping: sank into the shorts when the hip moved (before | after)',
      [('lion-kit', 'walkA-hipR-q34'), ('lion-kit', 'walkA-hipR-front'), ('lion-kit', 'uppercut-hipR-q34'), ('lion-kit', 'hook-hipR-side'),
       ('lion-kit', 'down-hipR-q34'), ('rabbit-kit', 'walkA-hipR-q34')])
pairs('sole-before-after.webp', 'Street sneaker: slit along the sole (before | after)',
      [('lion-street', 'walkA-ankleR-below'), ('rabbit-street', 'walkA-ankleR-below'), ('lion-street', 'talk-ankleR-below'), ('lion-street', 'guard-ankleR-below')])
after_only('armpit-skin-raised.webp', 'OPEN #5: skin armpit fold with the arm raised (current build; unchanged by this branch)',
           [('lion-kit', 'arms_up-shoulderL-front'), ('lion-kit', 'arms_up-shoulderL-side'), ('lion-kit', 'uppercut-shoulderL-side'), ('lion-kit', 'uppercut-shoulderL-below'),
            ('rabbit-kit', 'arms_up-shoulderR-side'), ('brick', 'uppercut-shoulderL-side'), ('fang-fight', 'uppercut-shoulderL-side'), ('rourke', 'arms_up-shoulderL-side')])
after_only('hoodie-armhole.webp', 'OPEN #6/#10: street hoodie armhole slits, mane through the hood (current build)',
           [('lion-street', 'guard-shoulderR-back'), ('lion-street', 'guard-shoulderR-q34'), ('lion-street', 'guard-shoulderL-back'), ('lion-street', 'walkA-shoulderR-front'),
            ('lion-street', 'walkA-shoulderR-back'), ('lion-street', 'walkA-shoulderL-below'), ('rabbit-street', 'guard-shoulderR-back'), ('rabbit-street', 'walkA-shoulderR-front')])
after_only('bruno-armpit.webp', 'OPEN #7: clothes on the skin: back armpit fold cracks (current build)',
           [('bruno', 'walkA-shoulderR-back'), ('bruno', 'walkA-shoulderL-back'), ('bruno', 'talk-shoulderR-back'), ('bruno', 'walkA-shoulderL-below'),
            ('fang-jacket', 'walkA-shoulderL-below'), ('hazel', 'walkA-shoulderR-back'), ('otto', 'walkA-shoulderR-back'), ('fang-jacket', 'walkA-shoulderR-back')])
after_only('misc-findings.webp', 'OPEN #8/#9/#13/#14: whiskers through gloves, Rourke teeth through his fists, Rourke waist, Otto collar',
           [('lion-kit', 'guard-neck-front'), ('lion-wraps', 'guard-wristR-front'), ('rourke', 'guard-wristR-front'), ('rourke', 'guard-wristR-q34'),
            ('rourke', 'walkA-waist-front'), ('otto', 'walkA-neck-below'), ('brick', 'guard-neck-back'), ('lion-street', 'walkA-tail-back')])

# one seam sheet per character: the joins from the five views at its main pose, before | after
MAIN = {'lion-kit': 'guard', 'rabbit-kit': 'guard', 'lion-street': 'walkA', 'rabbit-street': 'walkA', 'lion-wraps': 'guard', 'rabbit-wraps': 'guard',
        'bruno': 'walkA', 'brick': 'guard', 'fang-jacket': 'walkA', 'fang-fight': 'guard', 'hazel': 'walkA', 'otto': 'walkA', 'rourke': 'guard'}
SEAMS = ['neck-q34', 'neck-below', 'shoulderR-back', 'shoulderL-below', 'elbowR-side', 'wristR-q34', 'waist-side', 'hipR-below', 'kneeR-side', 'ankleR-side', 'tail-back', 'full-q34']
NAME = {'lion-kit': 'fighter-kit', 'rabbit-kit': 'fighter-rabbit-kit', 'lion-street': 'fighter-street', 'rabbit-street': 'fighter-rabbit-street', 'lion-wraps': 'fighter-wraps',
        'rabbit-wraps': 'fighter-rabbit-wraps', 'fang-jacket': 'fang', 'fang-fight': 'fang-fight'}
for v, p in MAIN.items():
    pairs(f'{NAME.get(v, v)}-seams-before-after.webp', f'{v}: seams at {p} (before | after)', [(v, f'{p}-{s}') for s in SEAMS])
