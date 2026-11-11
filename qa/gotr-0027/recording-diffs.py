# Held-frame pattern of a screen recording inside a crop (w:h:x:y).
# '#' = frame identical to the previous one (held), '.', 'o', 'O' = small / medium / large change.
# Usage: python3 -I qa/gotr-0027/recording-diffs.py <video> <crop>
import subprocess, sys
import numpy as np
f, crop = sys.argv[1], sys.argv[2]
w = h = 160
cmd = ['ffmpeg', '-v', 'error', '-i', f, '-vf', f'crop={crop},scale={w}:{h},format=gray', '-f', 'rawvideo', '-']
raw = subprocess.run(cmd, capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
same = d < 0.15
print('frames', len(fr), 'identical pairs', int(same.sum()))
s = ''.join('#' if x else ('.' if y < 2 else 'o' if y < 5 else 'O') for x, y in zip(same, d))
for i in range(0, len(s), 120):
    print(f'{i:4d}', s[i:i + 120])
# Longest moving stretches: how often a held frame interrupts motion.
moving = d > 1.0
held_in_motion = sum(1 for i in range(1, len(d) - 1) if same[i] and moving[i - 1] and moving[i + 1])
print('held frames between two moving frames', held_in_motion)
