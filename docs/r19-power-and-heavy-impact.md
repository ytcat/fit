# R19: committed punches and heavy impacts

The previous moving target solver guided the knuckle face toward the bag every
frame. Combined with a slow extension and dwell, this read as a sustained push.
Equipment drills now use a shared full-body phase map: load, accelerate, brief
contact, quick recoil, reset. The feet, pelvis, back and shoulder share that clock.
Pelvis/thorax commitment increases by 12%; contact adds a small damped brace.
Sparring keeps its synchronized attack/defence clock.

The heavy bag target is committed before impact in arena coordinates. It no
longer chases the departing bag. The desired face can enter the original foam
surface by up to 45 mm, subject to arm reach and actual bag motion. Glove and
local target compression respond to real contact, with a short 55 ms decay pulse
to preserve the brief impact between display frames. Misses produce no pulse.

A single normal collision impulse uses incoming relative surface velocity,
effective striking mass and the bag's rotational inertia about its suspension:

```
J = 1.05 * closingSpeed / (1 / strikingMass + sum((r cross n)^2 / inertia))
```

The impulse is applied once per actual punch contact; compliant padding forces
then act over the remaining contact. The bag is a configured 45 kg cylinder,
radius 0.235 m, height 1.15 m, suspended 0.94 m below its pivot. Jab effective
mass is 2.5 kg, hooks 5 kg and other punches 5.5 kg. These are explicit animation
model defaults, not measurements or exact predictions of human punching force.
The hanging response remains a damped small-angle approximation, not a general
rigid-body solver. Target recoil is bounded in the tested one-punch cases.

The dummy has a stronger damped torso response with its weighted base planted.
The speed bag keeps its faster wrist rhythm and lighter swivel response.
Impacts synthesize a short bass thud and padding transient in local WebAudio,
initialized only after a user gesture and respecting mute. No downloads,
external runtime engine or network sound service are used.

Equipment simulation now uses exact 120 Hz pose ticks, with heavy contact
substeps at 240 Hz, rather than display-dependent step partitions. This adds at
most 8.3 ms display latency and makes 30/60/90/120/144/165 Hz playback agree.

Validation includes all six punches, knuckle alignment, reachable limbs,
actual collision impulses, heavier-target resistance, quick release, coasting,
out-of-range misses, pause, orbit invariance and high-refresh convergence.
`qa/render-arena.cjs ... power` exports load/drive/contact/recoil/coast poses
from actual deformed geometry. CPU renders omit browser PBR, shadows and textures;
the available cloud browser cannot validate WebGL appearance.

Physics reference: Erin Catto, Understanding Constraints (GDC 2014), effective
mass and contact impulse:
https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf
The equation is implemented locally; Box2D is not a dependency.
