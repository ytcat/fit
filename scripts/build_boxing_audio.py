"""Original dry glove/air Foley, deterministic and local. CC0-1.0.
No game-character voices, animal recordings, pitch glides or remote service.
"""
from pathlib import Path
import wave
import numpy as np
from scipy.signal import butter, sosfilt
RATE = 24000
OUT = Path(__file__).resolve().parents[1] / 'assets/audio'

def band(noise, low, high):
    return sosfilt(butter(3, [low, high], btype='bandpass', fs=RATE, output='sos'), noise)

def save(name, signal, peak=.72):
    signal = np.nan_to_num(signal)
    signal -= signal.mean()
    signal *= peak / max(1e-9, np.abs(signal).max())
    signal *= np.minimum(1, np.arange(len(signal))/24) * np.minimum(1, np.arange(len(signal))[::-1]/150)
    with wave.open(str(OUT / (name + '.wav')), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes(np.round(signal * 32767).astype('<i2').tobytes())

for variant, duration in [(1, .25), (2, .32)]:
    rng = np.random.default_rng(8120 + variant)
    t = np.arange(int(RATE*duration))/RATE
    noise = rng.normal(size=len(t))
    # Broadband turbulent mouth air with low chest air. Deliberately unvoiced:
    # there is no periodic larynx tone that could turn into a bird-like chirp.
    air = band(noise, 420, 3600) + .55*band(noise, 140, 700)
    pressure = (1-np.exp(-t/.014)) * np.exp(-np.maximum(0, t-.025)/(.065+variant*.018))
    pressure *= 1 + .09*np.sin(t*32) + .04*np.sin(t*77)
    save('breath-'+str(variant), air*pressure, .66)

rng = np.random.default_rng(8211)
t = np.arange(int(RATE*.16))/RATE
noise = rng.normal(size=len(t))
snap = band(noise, 650, 5800)*np.exp(-t/.008)
pad = band(noise, 90, 1200)*np.exp(-t/.028)
thud = np.sin(2*np.pi*92*t)*np.exp(-t/.025)
save('leather-hit', .55*snap + .55*pad + .26*thud)

t = np.arange(int(RATE*.19))/RATE
noise = rng.normal(size=len(t))
air = band(noise, 320, 3700)
envelope = np.sin(np.pi*np.clip(t/.19,0,1))**2.4
save('air-swing', air*envelope, .66)
print('Built 4 original local boxing Foley clips')
