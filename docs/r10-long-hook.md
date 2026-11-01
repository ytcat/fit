# R10: long hooks, driving feet and muscle definition

The supplied commercial's 5–7 second sample shows a wider fist path with changing
shoulder/hip orientation. The previous coach's hook was a compact version, which
read too much as a raised elbow. Both hooks now use a longer-range bent-arm path.

References:
- [England Boxing Level 2 handbook, bent-arm punches](https://www.englandboxing.org/wp-content/uploads/2022/03/Level-2-Coaching-Handbook-compressed.pdf): long-range hooks open the elbow beyond 90 degrees; hip turn, foot pivot and a protected chin remain central.
- [Boxing Science: How to Improve Your Hook](https://boxingscience.co.uk/how-to-improve-your-hook/): shoulder and core rotation contribute to the longer curved acceleration path.

Implementation:
- Build the fist arc from the actual rotating shoulder, expanding shoulder-to-wrist
  radius from 0.43 to 0.59 m. Contact elbow angle is about 125 degrees on this rig.
- Increase pelvis/back rotation, driving-foot pivot and modest support-foot turn.
- Lower into a short knee-loading phase and transfer across the stance during drive.
- Coordinate shoulder protraction with the body turn; maintain the opposite guard.
- Add serratus, upper-arm/triceps and lower-quadriceps contours to the continuous
  refined surface. Reduce fill/hemisphere light so shape is less flattened.

These distances and angles are authored animation choices, not measured motion
capture. Numerical tests cover reachable hands, long-hook elbow bend, driving-foot
pivot, shoulder/back contribution, glove continuity and planted ball contact.
Lead/rear hook software pose renders were inspected. The CPU preview does not
reproduce the adjusted browser lighting; live WebGL remains unverified.
