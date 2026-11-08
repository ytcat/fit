# Fight straights: extension and contact follow-through

Baseline `044ddb3`; runtime `4f2bf71e16d0bb726f553aeb0f9fc5e3d039756d`.
[Matched actual app renders](../qa/straights/review.html).

The previous finite fight target and early world-space contact latch left normal
jab/cross poses bent at roughly 70–110 degrees. Fight straights now author a
near-full reachable wrist endpoint with a 3 mm unlocked elbow reserve. Smooth
preparation creates room for a straight; inside hooks/uppercuts retain their old
range. Extra straight lunge is reduced while shoulder rotation and chin cover
remain. Existing collision resolution still stops gloves at the actual guard,
head or torso, including follow-through and recovery.

Registered jab/cross contacts create bounded horizontal recoil along incoming
motion, in ring coordinates. The spacing projection preserves that displacement
instead of cancelling it. A 55 ms contact phase follows the receiver's actual
bounded translation before returning to guard. Misses cannot create this recoil.
Optional range/recoil respects rope bounds and the referee reserve; short blocked
punches can remain bent. Pre-IK support reserve smoothly follows preparation so
legs stay reachable and planted, and resets outside rounds.

Validation: all **60 suites passed** on the runtime SHA in
[CI](https://github.com/ytcat/fit/actions/runs/42454351860), plus 120 actual Chromium
frames covering both native fighters, jab/cross, open head/body and blocked head,
at four matched elapsed times and two camera views. Native clean hits reach
160–171 degrees, reach ratio at least .98; wrists remain collinear and knees/feet
stay reachable under the original 2 mm threshold. Posed corner clearance remains
above .74 m (observed .773 m). Original 12-strike and 108-trade tests retain their
penetration, scoring and arm-continuity thresholds. See `qa/straights/results/`.

Design and final source reviewed read-only by `fit_realism` (`gpt-6-astra`), as
required by the repository routing skill; the primary agent implemented changes
and produced numerical/browser evidence. Physical-phone performance is not
verified. This is a visually plausible animation/contact upgrade, not a new
full-body physics simulation. Existing model, audio, other training modes and
skeleton are preserved. Rollback: revert the isolated application commit.
