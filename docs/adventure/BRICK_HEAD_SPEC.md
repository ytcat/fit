# Brick's head — measured spec (GOTR-0082, v3)

Target: an unmistakable, tough English-bulldog boxer, original character (no picture, logo or brand is copied). Style and
anatomy taken from the owner's six reference pictures (2026-11-13) and his notes. Units: metres in the head joint's frame
(x across, y up, z toward the nose; the head group adds back the rig's 0.9 head scale, so these are world sizes).

## Proportions
| What | Target | Built as |
|---|---|---|
| Head width (jowl to jowl) | ≈ shoulder-to-neck width; as wide as tall | 0.66 wide, 0.58 crown to dewlap |
| Placement | low and forward; almost no visible neck, the dewlap runs into the traps | head group 3.5 cm down, 1.5 cm forward; dewlap 0.52 wide |
| Biggest mass | cheeks, jowls and jaw | cheek volumes 0.30 wide each side, flews and dewlap below |
| Muzzle | very short, flat, wide (≈ 0.85 of the skull width) | nose front 8 cm in front of the eyes |
| Nose | large, broad, black, set back high, almost between the eyes | 0.15 wide, 0.09 tall, top level with the lower lids |
| Rope | thick arch of skin over the nose, cheek to cheek | cord r 0.028, apex 7 cm above the nose centre, ends down beside the nose into the flews |
| Eyes | small, deep-set, low and wide apart, under a heavy frowning brow, dark rims | r 0.032 at x ±0.145, y 0.155; sockets carved 1.5 cm; brow overhangs; upper lids slanted down inside |
| Forehead | many deep, curved, vertical-ish folds from the brow up over the skull; a centre furrow | displacement folds radiating from between the eyes (≈ 14 across) + 2 cross rolls |
| Flews | massive, hang in heavy folds well below the jaw on both sides | bottom 5 cm below the chin, diagonal folds |
| Jaw | undershot, broad square chin, lower lip and two lower canines showing (open: teeth row, dark lips, tongue) | separate surface on a hinge; chin 3 cm in front of the nose; 0.23 wide |
| Ears | rose ears: small, high on the skull corners, folded back and slightly down, darker edge | 7 cm, one torn |
| Dewlap | loose folds under the chin into the chest | 3 horizontal folds |
| Shading | strong contact shadow in every fold | curvature + ambient occlusion from the field, baked into vertex colours |

## Coat
Fawn head and back of the skull, white blaze up the forehead, white rope, muzzle, flews, chin, throat and chest; dark grey
mask round the nose and on the lip edges with a few dark spots on the flews; dark rims round the eyes; one dark-brown patch
over his left eye up to the ear (Brick's own mark); a pink scar through that brow; one gold lower canine.

## Face dynamics (cheap: 3 floats per vertex, 4 uniforms, one spring)
- Jowls, flews and dewlap lag behind the head on a spring-damper (stiffness 90, damping 9, max 3 cm) and swing back when he
  moves, turns, punches or is hit.
- Brow: a permanent slight frown, lower in guard, lifts when he takes a hit; the upper lids follow it.
- Impact: cheeks and jowls ripple (a travelling wave along the skin) for a moment after a hit.
- Jaw: opens for speech (`StoryCast.talk`) and on effort (a snarl while punching) and when hurt.
- Blink: the rig's own blink.
