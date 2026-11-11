# GOTR-0002 belts, headbands, arm ribbons · GOTR-0003 boots (agent `gear-3d`)

## How the real things are built (reference notes used for modelling)
- **Title belt.** A wide leather strap (10–13 cm on a person) that wraps the waist with real
  thickness and stitched or piped edges; a large rigid **centre plate** gently curved to the
  belly, made of a base plate, a raised border, an enamel field and cast relief (medallion,
  wreath, star, crest/crown on top, name banner below); a row of smaller **side plates** on each
  side; closure at the back (snaps on an overlapping tongue, or a framed buckle). Worn over the
  trunks' waistband. Our two designs are original (no organisation names or logos).
- **Tied headband / bandana.** A folded cloth band a few millimetres thick, pulled tight so it
  bridges hollows of the head, tied in a square knot with two loops and two tails that hang
  from the knot and are cut on an angle. A bandana is wider, folded (crease line, edge
  stripes) and often tied at the side with short splayed tails.
- **Arm ribbons.** Cloth bands tied around the upper arm with a small knot and short tails.
- **Boxing boots.** Thin flexible gum sole whose tread wraps the edge, welt, light upper on a
  narrow last; **high-top** (laced shaft to mid-calf, padded collar), **mid-top** (ends just above
  the ankle bone with a thick padded collar and pull tab), **modern panelled** (high shaft,
  contrast panels/stripes, hook-and-loop ankle strap, pull tab).

## What was built
- `game-accessories.js`: belts `champion_belt` (crest: black strap, gold cartouche with red enamel,
  medallion + star, laurel wreath, crown crest, banner, 2+2 engraved side plates, snap tongue) and
  `heritage_belt` (medallion: oxblood strap with gold piping, silver round medallion with gold
  sunburst, bead ring and dome, 3+3 diamond-set side plates, framed buckle). Strap = convex hull of
  the bind-pose waist (skin, fur, shorts, waistband) per height + 7 mm, so it hugs both rigs and
  bridges hollows like real leather under tension. Headbands `headband` (tied, back knot, long
  tails) and `bandana` (navy, crease, cream edge stripes, side knot, short tails) fitted to the
  forehead hull of each species (rabbit: above the eyes, below the ears; lion: under the mane,
  knot on the mane surface). Arm ribbons gain a knot and tails on the upper-arm bone.
  One item per kind is worn; old saves (three original ids) still validate.
- `boxing-footwear.js` + `game-presentation.js`: boots variants select a construction —
  default/sunrise classic high-top, midnight mid-top, jade modern panelled; shared sole/last.

## Cost (lion, `node qa/gotr-0002/budget.cjs`, visible triangles / draw calls)
Old belt 92/2 → crest 7 830/3, medallion 6 972/3. Old headband 92/2 → ribbon 1 464/1, bandana 2 760/2.
Arm knots +~300/+2. Boots both feet: classic 9 104/56 (+768/+2 tread), mid 8 128/52, panelled 11 208/76.
Whole lion before ≈ 488 k triangles.

## Evidence (real app, WebGL, `capture.cjs`)
`before-lion-guard.webp`, `after-lion.webp`, `after-rabbit.webp` (guard + mid-cross, front /
three-quarter / side / rear), `belts-crest-medallion.webp`, `belt-plates-zoom.webp`,
`headbands.webp`, `arm-ribbon-knot.webp`, `boots-classic-mid-panel.webp`, `shop-icons.webp`.
Fit numbers: `node tests/accessory-gear-fit.test.cjs` (strap clears skin/shorts by ≥14 mm in
guard, all punches, slip, roll, step and jump rope for both rigs; front plate ≤2 mm grid error).

Commands: `python3 -m http.server 8153 --bind 127.0.0.1`, then
`node qa/gotr-0002/capture.cjs after champion_belt,headband,armbands jade front,three,side,rear full`
and `python3 qa/gotr-0002/sheet.py out.webp .3 <pngs>`.
