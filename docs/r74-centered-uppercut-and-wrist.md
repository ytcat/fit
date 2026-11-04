# R74 — central uppercuts and visible wrist alignment

The R73 glove bone was aligned with the forearm, but the rendered padded crown
was offset 26 mm toward the dorsum. That made the visible mitt look cocked despite
passing a bone-only wrist check. The crown/profile now follows the forearm axis;
the strike point, glove collision volumes and projected back label follow the
same surface.

Both solo uppercuts now finish with the wrist close to the target centerline
instead of 130 mm off to the side. Reach remains sufficient for a bent-arm strike.
The front camera is now actually frontal, including after returning from target
practice; an angled camera no longer exaggerates the apparent lateral finish.

The new regression samples actual leading-pad vertices, transforms them through
the posed glove, and checks their alignment with the forearm for all six punches,
in guard/recovery and with compressed padding. It also checks the physical padded
uppercut impact and contact solver position within 60 mm of the centerline across
the impact interval. Existing palm orientation, upward strike, elbow continuity,
reachable limb, guard and contact tests remain active.

Validation: all 23 CPU suites pass, including the actual-surface regression and
existing motion/contact/fight checks. Chromium passes at 1100×950 and 393×852,
including all techniques, views, equipment/fight modes, freeze and three languages.
The front-view uppercuts and side-view cross were also rendered and inspected.
