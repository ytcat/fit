# Release review: Neon, Docks, Fang, and Northline

Parent d63fa35 is the already public, exact conjunction of the Neon crossing, nighttime parked-car light and Fang result fixes. It does not include the rejected Bruno source. The player version and offline version remain unchanged because this is not a release.

The optimized static Northline source is a review asset only, not referenced by the game. The original is already published on the art handoff branch in Gloryland-3-Vehicles-Blender-GLB.zip (SHA-256 6b78283c5d62c2aa2cc4b4d897938cdf1d32e9a30c8d34b902eed6c5991e2772). Blender 4.3.2 round-trip preserves 21,318 triangles and their world position/material multiset at a 0.1 mm tolerance. Eleven opaque materials remain; two emissive factors differ by floating-point rounding only. One static mesh uses 11 primitives instead of 153; this is not a measured phone frame rate. Keep the original source as authority for editable wheel parts. No movement, collisions or browser changes are made by this asset alone.

Next: fit a controlled in-scene placement without changing the existing lane collision, verify both map entry orders, real Fang result frames and actual mobile art, then land all accepted release work together. Do not pull this whole branch while any overlapping release work is active.
