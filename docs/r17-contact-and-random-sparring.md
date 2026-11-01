# R17: responding opponent, padded contact and random sparring

## Opponent responses

The rabbit now reacts to the lion's attacks. It slips straight punches, rolls
under hooks, and moves sideways against uppercuts rather than ducking into the
rising fist. Some exchanges use a guarded block: the gloves lift and close
inward, while the knees, hips and upper back brace. The roll reaches its low
point before the hook crosses the head and continues underneath the punch
before recovering. Incoming rabbit punches on the lion's Slip/Roll drill beats
remain supported.

Guard or body contact can produce a small critically damped recoil through the
hips, knees and spine. Contact detection uses glove spheres and approximate
head/torso ellipsoids; this is not an anatomically exact collision mesh.

## Glove and target contact

Each hand now has an independent glove surface. Contact pressure shortens the
padded knuckle section by up to 14% and spreads it sideways by up to 5.5%.
The cuff remains fixed, thumb deformation is reduced, smooth normals are
preserved, and the original shape is restored when contact ends. Guarding
gloves can compress as well as the attacking glove. Missed punches do not
trigger a timed squash.

Target practice adds a short body-led drive through the contact point and a
slightly closer uppercut step. Hooks aim at the partner's actual head height.
The arm remains constrained by its two-bone IK; no wrist or elbow is stretched
past the rig's reach. The heavy bag, dummy and speed bag get local surface
indentation, with pressure smoothing and recovery.

A new locally implemented spring response replaces the old fixed wobble.
Each contact adds angular momentum from hit position and direction. The heavy
bag keeps a slower pendulum sway, the dummy settles more firmly over its fixed
base, and the speed bag has a faster response beneath its swivel. Successive
hits add momentum instead of restarting the motion. A small swept-contact
check helps retain impacts during fast playback. Contact velocity is measured
in the arena frame so orbiting the camera cannot add energy.

The spring equations are evaluated analytically, including a critically damped
body response, to avoid frame-step-dependent numerical integration. Mass,
frequency and damping are tuned for the animation; this is a lightweight
contact approximation, not a complete rigid-body or soft-body solver. No
external physics service or runtime engine was added.

Reference for spring frequency/damping and impulse-driven simulation concepts:
https://box2d.org/documentation/md_simulation.html
The app does not import Box2D.

## Random sparring

The Combinations menu now includes Random sparring in addition to the 12 fixed
routines. Choosing it selects the rabbit partner and creates a fresh local
seed. Both characters take turns attacking with short boxing combinations;
the other character receives a matching slip, roll or guarded block. They do
not choose unrelated animations independently and never attack simultaneously
within a planned exchange. A defender does not roll into an uppercut.

The exchange planner and both poses share one animation clock, including the
existing 0.5×–3× speed choices and Pause/Resume. A given seed can be replayed
for testing. The current actions of both fighters appear in the compact cue.
Selecting a fixed routine, individual technique or different equipment exits
random sparring. Labels remain available in English, Hebrew and Russian.

## Validation

Eight Node suites cover coach kinematics, app behavior, workout progress,
layout, arena interactions, controls, contact response and random sparring.
New checks include exact spring consistency across time steps; momentum
addition and decay; independent gloves, stable cuffs, smooth normals and shape
recovery; one impulse per punch; target indentation; frozen response while
paused; missed-jab behavior; guarded contact and ducking under hooks; camera
orbit invariance; reproducible but varied random exchanges; both attacking
roles; appropriate defenses; reachable limbs and smooth exchange handoffs.

The actual skinned scene is inspected with CPU diagnostic renders, advancing
through the strike so contact reactions are present. These omit live browser
PBR, textures and shadows. The cloud browser does not provide WebGL, so GPU
animation cannot be verified there. Runtime code and assets remain served by
this app alone.
