/* The Docks cast (Chapter 1 beat 10, docs/adventure/CHAPTER1_SCRIPT_V2.md): Rourke, a big crocodile dock worker, the bare-knuckle
 * opponent of the Docks fight. Same construction as Fang in cast-market.js (loaded before this file) and registered into StoryCast
 * (id 'rourke'): the lion fighter's continuous skin is reshaped (a crocodile head field + a heavyweight's body bulk), painted with a
 * scale pattern in the vertex colours (big keeled scutes down the back and plates on the snout, square belly scales, fine scales
 * elsewhere, raised a little in the geometry so they catch the light) and dressed in place: work trousers with the overall bib
 * rolled down and tied round the waist, bare chest. Small rigid things (eyes and bony lids, nostrils, teeth, hands and wraps,
 * boots, the bib knot, the tail) are merged vertex-coloured meshes. Face dynamics: the lower jaw is a morph of the skin on anatomy
 * channel 12 (the one the fight drives on a hit and StoryCast.talk drives in speech, through cast-market.js's wrapper); the
 * lower teeth ride on a hinge with it; the eyes blink with the rig's face acting; the tail lags behind the hips.
 * One look everywhere: films and the fight show the same clothes (StoryCast.outfit leaves cast rigs alone); as the fight Opponent
 * the boxing kit is hidden again every frame, so no glove, shorts or boot of the kit can show on him.
 * Nothing in story-cast.js or cast-market.js is changed. World: metres, y up, the rest pose faces +z (arms out along x). */
(() => {
  const SC = window.StoryCast; if (!SC || !window.THREE || !SC.defs) return;
  const { Parts, seat, dress, bulk } = SC;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); }, bell = (v, c, r) => Math.exp(-(((v - c) / r) ** 2));
  const band = (v, a, b, e = .02) => smooth((v - a) / e) * (1 - smooth((v - b) / e));
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const HEAD_Y = 1.84, HS = .9;
  const SWAP = ['position', 'normal', 'color', 'avatarMuscle', 'avatarMuscleNormal', 'avatarDefinition', 'avatarDefinitionNormal', 'avatarMass'];
  const use = (g, s) => { for (const k of SWAP) if (s[k]) g.setAttribute(k, s[k]); };
  const hc = p => [p.x / HS, (p.y - HEAD_Y) / HS, p.z / HS]; // rest world -> head coordinates (before the 0.9 head scale)
  const hash = (a, b, c) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ---------------------------------------------------------------- materials (one set per rig: rigs are built once and cached) */
  const vmat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0, ...o });
  function mats(rig) {
    return rig.castDocks || (rig.castDocks = { parts: vmat({ roughness: .82 }), scales: vmat({ roughness: .55 }), teeth: vmat({ roughness: .38 }), cloth: vmat({ roughness: .95 }), metal: vmat({ roughness: .35, metalness: .9 }),
      wet: new THREE.MeshPhysicalMaterial({ color: 0x15130b, roughness: .2, clearcoat: .8 }), glint: new THREE.MeshBasicMaterial({ color: 0xfffbea }), black: new THREE.MeshStandardMaterial({ color: 0x050504, roughness: .4 }) });
  }
  const mark = m => { m.userData.storyPart = true; m.userData.mane = true; m.castShadow = true; return m; };
  const meshOf = (P, name, mat) => { const m = mark(new THREE.Mesh(P.geometry(), mat)); m.name = name; return m; };
  let CONE = null; const cone = () => CONE || (CONE = new THREE.ConeGeometry(1, 1, 9, 2).toNonIndexed()); // tip at +y/2, base at -y/2
  /** A conical tooth from its root `at` along `dir` (unit), length len, root radius r. */
  function tooth(P, at, dir, len, r, hex, flat = .8) {
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
    P.add(cone(), new THREE.Matrix4().compose(at.clone().addScaledVector(dir, len / 2), q, V(r, len, r * flat)), hex);
  }

  /* ================================================================ the head: a crocodile's, from the lion's skull */
  // Head coordinates (x across, y up, z forward; the lion's muzzle front is at z ~0.29, its crown at y ~0.37, the back at z ~-0.19).
  // The snout is drawn forward from z = ZB to a tip at ZT (about the skull's own length), flattened top to bottom and kept broad;
  // the crown is levelled, the eyes ride on bony turrets on top, the jaw line runs back under the eye.
  const ZB = .1, KS = 1.25, ZT = .29 + KS * (.29 - ZB), TIP = ZT + .005;
  /** Mouth line height (head coordinates) along the jaw: a croc's gently wavy line, rising behind the eye. */
  const lip = hz => .046 + .008 * bell(hz, .33, .07) - .006 * bell(hz, .45, .03) + .005 * bell(hz, .5, .025) + .035 * smooth((.1 - hz) / .14);
  /** Snout half-width factor along the snout (tp 0 at the eyes, 1 at the tip): broad, a bulge over the big upper teeth,
   *  the notch the big lower tooth fits into, the rounded rosette at the tip. */
  const outline = tp => lerp(1, .74, smooth(tp)) * (1 + .07 * bell(tp, .5, .14) - .06 * bell(tp, .8, .05) + .05 * bell(tp, .93, .05));
  // the lion's front surface on either side of its eye sockets (x = 0.06 and 0.14, y = 0.10 .. 0.24): the pits are filled flush first
  const Z06 = [.278, .274, .269, .266, .26, .25, .238, .196], Z14 = [.2, .198, .192, .18, .17, .154, .137, .115];
  const rowAt = (T, y) => { const f = clamp((y - .1) / .02, 0, 7), i = Math.min(6, Math.floor(f)); return lerp(T[i], T[i + 1], f - i); };
  function headForm(x, y, z, out) {
    const z0 = z, s = x < 0 ? -1 : 1, fade = smooth((y + .095) / .05);
    { const ax0 = Math.abs(x), w = band(ax0, .03, .155, .012) * band(y, .1, .25, .02) * smooth((z - .04) / .03);
      if (w > 0) { const fill = lerp(rowAt(Z06, y), rowAt(Z14, y), (ax0 - .06) / .08) - .004; if (z < fill) z = lerp(z, fill - (fill - z) * .3, w); } }
    // 1. the long snout: everything in front of the eyes is drawn forward
    const vm = smooth((y + .13) / .05) * (1 - smooth((y - .37) / .05)), dzb = z - ZB, g = dzb * smooth((dzb + .03) / .08);
    let Z = z + KS * g * vm;
    const tp = clamp((Z - .12) / (ZT - .12)), st = smooth(tp);
    // 2. flat: the upper jaw squashed top to bottom onto the croc's mouth line, the lion's short chin drawn out into a long lower jaw
    const YM = .03, sUp = lerp(1, .36, st), sLow = lerp(1, 1.5, st), sv = lerp(sLow, sUp, smooth((y - YM) / .03 + .5));
    let Y = y + vm * ((lip(Z) - YM) * smooth(tp / .3) + (y - YM) * (sv - 1));
    Z += .03 * vm * smooth((YM - y) / .03 + .5) * smooth((tp - .45) / .45);                   // the lower jaw reaches the tip
    // 3. broad, with the croc outline from above
    let X = x * (1 + (outline(tp) - 1) * vm);
    // 4. a level crown and a broad flat skull table behind the eyes (the lion's ear mounds levelled); the back flows into the neck
    const mound = bell(Math.abs(x), .19, .08) * bell(z, -.02, .08) * smooth((y - .1) / .06);
    X *= 1 - .2 * mound; Y -= .8 * (Y - .12) * mound;
    Y -= .5 * (Y - .17) * smooth((Y - .17) / .06);
    Y -= .4 * (Y - .12) * smooth((Y - .12) / .06) * smooth((.07 - z) / .1);                 // the skull slopes down behind the eyes
    Z += .025 * smooth((-z - .08) / .08) * smooth(y / .1);
    X += s * .018 * bell(z, .0, .09) * bell(y, .01, .07);                                   // jaw muscles behind the gape
    // the cranium behind the eyes is wrapped onto a smooth, boxy shell: a croc's flat skull table, no trace of the lion's ear sockets
    { const cx = X, cy = Y - .035, cz = Z, n = 2.4, F = Math.pow(Math.abs(cx / (.19 - .035 * smooth(-cy / .12))) ** n + Math.abs(cy / .165) ** n + Math.abs(cz / (.15 - .03 * smooth(-cy / .12))) ** n, 1 / n), w = smooth((Y + .05) / .17) * smooth((.07 - Z) / .1);
      if (F > 1e-4 && w > 0) { X = lerp(X, cx / F, w); Y = lerp(Y, cy / F + .035, w); Z = lerp(Z, cz / F, w); }
      Y -= .055 * smooth((-Z - .0) / .12) * smooth((Y - .04) / .1); }                         // the top line runs back and down into the neck
    // 5. bumps in the final shape: the nostril dome on the tip, the eye turrets, bony brows, snout ridges
    const ax = Math.abs(X);
    Y += .034 * bell(X, 0, .045) * bell(Z, TIP - .042, .032) * smooth((Y - .07) / .025);
    const turret = bell(ax, .092, .046) * bell(Z, .115, .055) * smooth((Y - .17) / .05);
    Y += .05 * turret; X += s * .01 * turret;
    Y += .012 * bell(ax, .06, .025) * bell(Z, .2, .05) * smooth((Y - .17) / .04);           // the ridges in front of the eyes
    Y += .007 * bell(ax, .045, .02) * smooth((Z - .22) / .05) * (1 - smooth((Z - TIP + .1) / .05)) * smooth((Y - .1) / .03); // two low ridges down the snout
    // 6. the upper jaw overhangs the narrower lower jaw: the upper teeth come down outside it
    const ly = lip(Z), lower = smooth((ly - .004 - Y) / .02) * smooth((Z - .1) / .08);
    X *= 1 - .085 * lower;
    return out.set((X - x) * fade, (Y - y) * fade, (Z - z0) * fade);
  }

  /* ---------------------------------------------------------------- the scale pattern */
  /** Jittered-grid cells in 3D: distances to the nearest and second feature point and the nearest cell's id and centre. */
  function cells(x, y, z, sx, sy = sx, sz = sx, jit = .8, seed = 1) {
    const gx = x / sx, gy = y / sy, gz = z / sz, ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz); let f1 = 9, f2 = 9, id = 0, cx = 0, cy = 0, cz = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const X = ix + a, Y = iy + b, Z = iz + c, h = hash(X + seed * 97, Y, Z);
      const px = X + .5 + jit * (hash(X, Y + seed, Z) - .5), py = Y + .5 + jit * (hash(X, Y, Z + seed) - .5), pz = Z + .5 + jit * (hash(X + seed, Y, Z) - .5);
      const d = Math.hypot(px - gx, py - gy, pz - gz);
      if (d < f1) { f2 = f1; f1 = d; id = h; cx = px; cy = py; cz = pz; } else if (d < f2) f2 = d;
    }
    return { f1, f2, id, cx: cx * sx, cy: cy * sy, cz: cz * sz };
  }
  /** Rectangular scales in rows (belly, back scutes): u, v in metres along the two grid directions; rows offset by half. */
  function grid(u, v, su, sv, stagger = .5) {
    const r = Math.floor(v / sv), uu = u / su + (r & 1) * stagger, c = Math.floor(uu), fu = uu - c, fv = v / sv - r;
    return { e: Math.min(fu, 1 - fu, (fv) * su / sv, (1 - fv) * su / sv), fu, fv, id: hash(c, r, 7), r, c };
  }
  const OLIVE = lin('#44532a'), MOSS = lin('#66773a'), FLANK = lin('#8a8746'), JAW = lin('#c4b97a'), CREAM = lin('#ddd4a2'), BELLY = lin('#d2c78c'), BLOT = lin('#232a15');
  /** Irregular dark blotches (a croc's mottling): 0..1. */
  const blot = (p, size, seed, amount = .42) => { const k = cells(p.x, p.y, p.z, size, size, size, .9, seed); return k.id < amount ? 1 - smooth((k.f1 - .32) / .2) : 0; };
  /** Colour and relief of a rest-pose skin point. Returns { c, d (m, along the normal), gloss 0..1 }. */
  function scale(p, out) {
    const ax = Math.abs(p.x), [hx, hy, hz] = hc(p), head = p.y > 1.74 && (p.y > 1.8 || ax < .2), arm = smooth((ax - .3) / .08) * smooth((p.y - 1.36) / .07);
    const c = out.c; let d = 0, crease = 0, gl = .45, tone = 1, deep = .42;
    if (head) {
      const ahx = Math.abs(hx), lipY = lip(hz), snout = smooth((hz - .2) / .06), neck = 1 - smooth((hy + .02) / .04);
      // plates: bigger, squarish on the snout top and the skull table, fine on the sides, small square scales under the jaw
      const top = smooth((hy - lipY - .035) / .03);
      if (top > .5) { const k = cells(p.x, p.y, p.z, snout > .5 ? .02 : .017, .03, snout > .5 ? .026 : .019, .55, 3); crease = 1 - smooth((k.f2 - k.f1) / .13); tone = .86 + .28 * k.id; d = .0018 * (1 - crease); }
      else if (hy < lipY - .02) { const k = grid(p.x, p.z, .011, .012, 0); crease = 1 - smooth(k.e / .14); tone = .94 + .1 * k.id; d = .0006 * (1 - crease); deep = .3; }
      else { const k = cells(p.x, p.y, p.z, .009, .009, .011, .8, 5); crease = 1 - smooth((k.f2 - k.f1) / .2); tone = .9 + .2 * k.id; d = .0007 * (1 - crease); deep = .35; }
      // the rows of bony bumps on the skull table behind the eyes (post-occipital scutes)
      const neckRow = bell(hz, -.1, .03) * smooth((hy - .12) / .04) * (bell(ahx, .05, .02) + bell(ahx, .11, .02));
      d += .006 * neckRow; tone *= 1 - .15 * neckRow;
      // countershading: dark olive on top, mid olive down the sides, the lower jaw yellow, cream under it and down the front of the throat
      const lowerJaw = smooth((lipY - .004 - hy) / .012) * smooth((hz - .04) / .08), under = smooth((lipY - .05 - hy) / .03) * smooth((hz - .02) / .08);
      const throat = neck * smooth((p.z + .01) / .08) * (1 - smooth((ax - .1) / .08));
      c.copy(OLIVE).lerp(MOSS, .35 + .5 * smooth((lipY + .07 - hy) / .06) * smooth((ahx - .05) / .05)).lerp(JAW, clamp(lowerJaw * .9)).lerp(CREAM, clamp(Math.max(under, throat)));
      c.lerp(BLOT, .5 * blot(p, .03, 21) * (1 - lowerJaw) * (1 - throat) * smooth((ahx - .03) / .04));
      c.multiplyScalar(1.2); gl = .55;
    } else if (arm > .5) {
      // arms (rest pose: out along x): dark on top, pale underneath, fine scales, a few blotches; the wraps cover the hands
      const k = cells(p.x, p.y, p.z, .026, .02, .02, .8, 11); crease = 1 - smooth((k.f2 - k.f1) / .22); tone = .9 + .2 * k.id; d = .0011 * (1 - crease); deep = .36;
      const pale = smooth((1.59 - p.y) / .05) * (.5 + .5 * smooth((p.z + .01) / .05));
      c.copy(OLIVE).lerp(MOSS, .5 * smooth((p.z + .02) / .06)).lerp(JAW, .8 * pale).lerp(BLOT, .5 * blot(p, .045, 23) * (1 - pale));
    } else if (p.y > .92) {
      // trunk: square belly scales in rows down the front, keeled scutes in rows down the back, fine flank scales between
      const front = smooth((p.z - .0) / .06), belly = front * (1 - smooth((ax - (.13 + .05 * bell(p.y, 1.45, .12))) / .06)), back = smooth((-p.z - .02) / .06) * (1 - smooth((ax - .15) / .03));
      if (belly > .5) { const k = grid(p.x + .5, p.y, .034, .028, .5); crease = 1 - smooth(k.e / .16); tone = .95 + .08 * k.id; d = .0012 * (1 - crease); deep = .25; }
      else if (back > .5) { const k = grid(ax, p.y, .052, .046, 0); crease = 1 - smooth(k.e / .14); tone = .82 + .3 * k.id; const keel = bell(k.fu, .5, .12) * band(k.fv, .15, .85, .1); d = (.0032 + .0055 * keel) * (1 - crease); deep = .5; }
      else { const k = cells(p.x, p.y, p.z, .028, .026, .028, .75, 13); crease = 1 - smooth((k.f2 - k.f1) / .2); tone = .88 + .24 * k.id; d = .0014 * (1 - crease); deep = .4; }
      const chest = front * bell(p.y, 1.47, .13) * (1 - belly), flank = front * smooth((ax - .1) / .08);
      c.copy(OLIVE).lerp(MOSS, .6 * smooth((p.z + .08) / .12)).lerp(FLANK, clamp(.55 * chest + .25 * flank)).lerp(BELLY, clamp(belly * .95));
      c.lerp(BLOT, .6 * blot(p, .06, 29) * (1 - belly) * (1 - .6 * chest) * smooth((ax - .05) / .05)); // dark blotches on the flanks and back
    } else {
      // legs (under the trousers; only shows if the cloth is ever cut): fine scales, pale inside
      const k = cells(p.x, p.y, p.z, .028, .028, .028, .8, 17); crease = 1 - smooth((k.f2 - k.f1) / .2); tone = .9 + .2 * k.id; d = .001 * (1 - crease);
      c.copy(OLIVE).lerp(CREAM, .6 * smooth((.12 - ax) / .05));
    }
    c.multiplyScalar(tone * (1 - deep * crease)); out.d = d; out.gloss = gl * (1 - crease * .6); return out;
  }
  /** Taubin smoothing (no shrinking) of the masked part of the skin: irons the lion's face creases (eye sockets, nose, whisker pads)
   *  out of the stretched snout while its overall form stays. Welded vertices (seams) move together. */
  function iron(g, maskOf, rounds = 16, shrink = false) {
    const P = g.attributes.position, n = P.count, rep = new Int32Array(n), map = new Map(), p = V();
    for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 20000) + ':' + Math.round(P.getY(i) * 20000) + ':' + Math.round(P.getZ(i) * 20000), r = map.get(k); if (r == null) { map.set(k, i); rep[i] = i; } else rep[i] = r; }
    const mask = new Float32Array(n), nbs = new Map(), idx = g.index.array;
    for (let i = 0; i < n; i++) if (rep[i] === i) { p.fromBufferAttribute(P, i); mask[i] = maskOf(p); }
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = rep[idx[t + k]], b = rep[idx[t + (k + 1) % 3]]; if (a === b || !(mask[a] > 0 || mask[b] > 0)) continue; for (const [u, v] of [[a, b], [b, a]]) { let l = nbs.get(u); if (!l) nbs.set(u, l = new Set()); l.add(v); } }
    const ids = [...nbs.keys()].filter(i => mask[i] > 0), pos = new Float32Array(P.array), next = new Float32Array(ids.length * 3);
    for (let r = 0; r < rounds * 2; r++) {
      const f = r % 2 && !shrink ? -.53 : .5;
      ids.forEach((i, k) => { let x = 0, y = 0, z = 0, m = 0; for (const j of nbs.get(i)) { x += pos[j * 3]; y += pos[j * 3 + 1]; z += pos[j * 3 + 2]; m++; } const w = f * mask[i]; next[k * 3] = pos[i * 3] + (x / m - pos[i * 3]) * w; next[k * 3 + 1] = pos[i * 3 + 1] + (y / m - pos[i * 3 + 1]) * w; next[k * 3 + 2] = pos[i * 3 + 2] + (z / m - pos[i * 3 + 2]) * w; });
      ids.forEach((i, k) => { pos[i * 3] = next[k * 3]; pos[i * 3 + 1] = next[k * 3 + 1]; pos[i * 3 + 2] = next[k * 3 + 2]; });
    }
    for (let i = 0; i < n; i++) { const j = rep[i]; P.setXYZ(i, pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); }
    P.needsUpdate = true; g.computeVertexNormals();
  }
  /** The upper jaw rebuilt as a clean surface: around the snout's axis its cross-section is star-shaped, so every vertex of the upper
   *  jaw (between the eyes and the tip, above the mouth line) is put on the outer envelope of the sculpted snout, radius F(angle, z),
   *  and spread evenly over it (a Tutte relaxation with the region's rim held): the lion's eye sockets, folded inside the stretched
   *  snout, are unfolded instead of showing as slits or see-through holes. */
  function unfold(g, rounds = 1500) {
    const P = g.attributes.position, n = P.count, rep = new Int32Array(n), map = new Map(), YA = .1;
    for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 20000) + ':' + Math.round(P.getY(i) * 20000) + ':' + Math.round(P.getZ(i) * 20000), r = map.get(k); if (r == null) { map.set(k, i); rep[i] = i; } else rep[i] = r; }
    const inR = new Uint8Array(n), th = new Float32Array(n), zz = new Float32Array(n), rho = new Float32Array(n);
    for (let i = 0; i < n; i++) { if (rep[i] !== i || P.getY(i) < 1.75) continue; const hx = P.getX(i) / HS, hy = (P.getY(i) - HEAD_Y) / HS, hz = P.getZ(i) / HS; if (hz < .15 || hz > .44 || hy < lip(hz) + .006) continue; inR[i] = 1; th[i] = Math.atan2(hx, hy - YA); zz[i] = hz; rho[i] = Math.hypot(hx, hy - YA); }
    // the envelope: the largest radius per (angle, z) bin, gaps filled, softened
    const TA = 64, TZ = 30, T0 = -2.2, T1 = 2.2, Z0 = .15, Z1 = .44, F = new Float32Array(TA * TZ), bin = (t, z) => [clamp((t - T0) / (T1 - T0)) * (TA - 1), clamp((z - Z0) / (Z1 - Z0)) * (TZ - 1)];
    for (let i = 0; i < n; i++) if (inR[i]) { const [a, b] = bin(th[i], zz[i]), k = Math.round(b) * TA + Math.round(a); F[k] = Math.max(F[k], rho[i]); }
    for (let pass = 0; pass < 40; pass++) { let empty = 0; const G = F.slice(); for (let b = 0; b < TZ; b++) for (let a = 0; a < TA; a++) { const k = b * TA + a; if (F[k] > 0) continue; let s = 0, m = 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const A = a + da, B = b + db; if (A < 0 || B < 0 || A >= TA || B >= TZ || !(F[B * TA + A] > 0)) continue; s += F[B * TA + A]; m++; } if (m) G[k] = s / m; else empty++; } F.set(G); if (!empty) break; }
    for (let pass = 0; pass < 2; pass++) { const G = F.slice(); for (let b = 0; b < TZ; b++) for (let a = 0; a < TA; a++) { let s = 0, m = 0; for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) { const A = a + da, B = b + db; if (A < 0 || B < 0 || A >= TA || B >= TZ) continue; s += F[B * TA + A]; m++; } G[b * TA + a] = s / m; } F.set(G); }
    // vertices folded deep inside the snout (the sockets' walls) join the region wherever they lie above the mouth line
    for (let i = 0; i < n; i++) { if (inR[i] || rep[i] !== i || P.getY(i) < 1.75) continue; const hx = P.getX(i) / HS, hy = (P.getY(i) - HEAD_Y) / HS, hz = P.getZ(i) / HS; if (hz < .15 || hz > .44 || hy < lip(hz) - .01) continue; const t = Math.atan2(hx, hy - YA), r = Math.hypot(hx, hy - YA); if (Math.abs(t) > 1.9) continue; const [a, b] = bin(t, hz); if (r < 1.02 * F[Math.round(b) * TA + Math.round(a)]) { inR[i] = 1; th[i] = t; zz[i] = hz; rho[i] = r; } }
    const env = (t, z) => { const [a, b] = bin(t, z), a0 = Math.min(TA - 2, Math.floor(a)), b0 = Math.min(TZ - 2, Math.floor(b)), fa = a - a0, fb = b - b0; return lerp(lerp(F[b0 * TA + a0], F[b0 * TA + a0 + 1], fa), lerp(F[(b0 + 1) * TA + a0], F[(b0 + 1) * TA + a0 + 1], fa), fb); };
    // neighbours (welded); a region vertex next to the outside is held
    const nb = new Map(), idx = g.index.array, fixed = new Uint8Array(n);
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = rep[idx[t + k]], b = rep[idx[t + (k + 1) % 3]]; if (a === b) continue; if (inR[a] && !inR[b]) fixed[a] = 1; if (!inR[a]) continue; let l = nb.get(a); if (!l) nb.set(a, l = new Set()); l.add(b); }
    const ids = [...nb.keys()].filter(i => inR[i] && !fixed[i]), T = th.slice(), Zs = zz.slice();
    for (let i = 0; i < n; i++) if (!inR[i] && rep[i] === i && P.getY(i) > 1.72) { const hx = P.getX(i) / HS, hy = (P.getY(i) - HEAD_Y) / HS; T[i] = Math.atan2(hx, hy - YA); Zs[i] = P.getZ(i) / HS; }
    for (let r = 0; r < rounds; r++) for (const i of ids) { let a = 0, b = 0, m = 0; for (const j of nb.get(i)) { a += T[j]; b += Zs[j]; m++; } T[i] = lerp(T[i], a / m, .9); Zs[i] = lerp(Zs[i], b / m, .9); }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { if (!inR[i] || rep[i] !== i) continue; const t = fixed[i] ? th[i] : T[i], z = fixed[i] ? zz[i] : Zs[i], R = fixed[i] ? rho[i] : env(t, z); out[i * 3] = Math.sin(t) * R * HS; out[i * 3 + 1] = (YA + Math.cos(t) * R) * HS + HEAD_Y; out[i * 3 + 2] = z * HS; }
    for (let i = 0; i < n; i++) { const j = rep[i]; if (inR[j] && !fixed[j]) P.setXYZ(i, out[j * 3], out[j * 3 + 1], out[j * 3 + 2]); }
    // a few triangles of the lion's folded sockets still face into the snout once laid on the envelope: turn them outward
    let turned = 0; const ix = g.index.array, A = V(), B = V(), Cc = V(), N = V();
    for (let t = 0; t < ix.length; t += 3) {
      if (!inR[rep[ix[t]]] || !inR[rep[ix[t + 1]]] || !inR[rep[ix[t + 2]]]) continue;
      A.fromBufferAttribute(P, ix[t]); B.fromBufferAttribute(P, ix[t + 1]); Cc.fromBufferAttribute(P, ix[t + 2]); N.subVectors(B, A).cross(Cc.clone().sub(A));
      const cx = (A.x + B.x + Cc.x) / 3 / HS, cy = ((A.y + B.y + Cc.y) / 3 - HEAD_Y) / HS - YA, cz = (A.z + B.z + Cc.z) / 3 / HS; if (cz > .19 && N.x * cx + N.y * cy < 0) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; turned++; }
    }
    if (turned) g.index.needsUpdate = true; g.userData.castTurned = turned;
    P.needsUpdate = true; g.computeVertexNormals(); return ids.length;
  }
  /** Paints and raises the scales over the whole sculpted skin (before the clothes are made, so cloth washes the relief out). */
  function scaleSkin(rig) {
    const g = rig.skin.geometry, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, p = V(), n = V(), o = { c: new THREE.Color(), d: 0, gloss: 0 };
    const G = rig.castScaleGloss = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); scale(p, o);
      C.setXYZ(i, o.c.r, o.c.g, o.c.b); G[i] = o.gloss; if (o.d) P.setXYZ(i, p.x + n.x * o.d, p.y + n.y * o.d, p.z + n.z * o.d);
    }
    P.needsUpdate = true; C.needsUpdate = true; g.computeVertexNormals();
  }
  /** Per-vertex roughness (castGloss 1 = `rough`); the fur bump of the rig's skin fades with it (scales are smooth). */
  function gloss(rig, values, rough) {
    const g = rig.skin.geometry, mat = rig.skin.material; g.setAttribute('castGloss', new THREE.BufferAttribute(values, 1));
    const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey;
    mat.onBeforeCompile = (sh, r) => {
      prev?.call(mat, sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float castGloss;varying float vCastGloss;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCastGloss=castGloss;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCastGloss;')
        .replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment.replace(/bumpScale \*/g, '(bumpScale*(1.0-.85*vCastGloss)) *'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,' + rough.toFixed(3) + ',clamp(vCastGloss,0.0,1.0));');
    };
    mat.customProgramCacheKey = () => (key ? key.call(mat) : '') + '|castGloss' + rough;
    mat.needsUpdate = true;
  }
  /** The lower jaw as a morph on anatomy channel 12 (as Fang's): vertices under the mouth line turn about the hinge. */
  function jaw(rig, o) {
    const g = rig.skin.geometry, P = g.attributes.position, M = g.attributes.avatarMuscle, MN = g.attributes.avatarMuscleNormal, C = g.attributes.color, p = V(), lips = lin(o.lips), inner = lin(o.inner);
    if (!M) return 0; const ca = Math.cos(o.angle), sa = Math.sin(o.angle), [hy0, hz0] = o.hinge; let n = 0;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); if (p.y < 1.66) continue; const [hx, hy, hz] = hc(p);
      if (hz < o.back || Math.abs(hx) > o.width) continue;
      const ly = lip(hz), along = smooth((hz - o.from) / o.ramp), under = smooth((ly - hy) / o.band);
      const w = under * along * (1 - smooth((-hy - o.throat) / .06)) * smooth((hz - o.back) / .08); if (!(w > 1e-4)) continue;
      const dy = hy - hy0, dz = hz - hz0, ry = dy * ca - dz * sa, rz = dz * ca + dy * sa, fold = 4 * under * (1 - under) * along;
      M.setXYZW(i, -HS * Math.sign(hx) * o.depth * fold * smooth(Math.abs(hx) / .02), HS * ((ry - dy) * w), HS * ((rz - dz) * w - o.depthZ * fold), 12); n++;
      if (MN) MN.setXYZ(i, 0, 0, 0);
      const bw = o.band, lipZone = smooth((hy - (ly - bw)) / .002) * (1 - smooth((hy - (ly + .002)) / .002)) * along, mid = 4 * under * (1 - under) * along;
      if (lipZone > .02) { const c = new THREE.Color().fromBufferAttribute(C, i).lerp(lips, clamp(lipZone * .8)).lerp(inner, clamp(mid * 1.1 - .5)); C.setXYZ(i, c.r, c.g, c.b); }
    }
    M.needsUpdate = true; C.needsUpdate = true; return n;
  }

  /* ---------------------------------------------------------------- clothes */
  const tube = (v, a, bf, bb, k = 1, zc = -.005) => { const dz = v.z - zc, r = Math.hypot(v.x, dz); if (r < 1e-4) return null; const b = dz > 0 ? bf : bb, cx = v.x / r, cz = dz / r, R = a * b / Math.hypot(b * cx, a * cz); return R > r ? [cx * (R - r) * k, 0, cz * (R - r) * k] : null; };
  const trouser = (v, R, k = 1) => { const s = v.x < 0 ? -1 : 1, dx = v.x - s * (.15 + (1 - v.y) * .07), dz = v.z + .02 * smooth((.7 - v.y) / .3), r = Math.hypot(dx, dz); return r > 1e-4 && R > r ? [dx / r * (R - r) * k, 0, dz / r * (R - r) * k] : null; };
  /** Heavy navy-grey work canvas, double orange stitching, darker knee patches, the bib of the overalls rolled down over the waist
   *  and its front panel folded down over the fly, the straps tied round the waist; turned-up hems over the boots. Bare above. */
  function rourkeClothes(rig) {
    const canvas = lin('#2b3139'), worn = lin('#4e535a'), patch = lin('#22272e'), thread = lin('#8a6a40'), seam = lin('#16191e'), strap = lin('#383f49'), tmp = new THREE.Color();
    const G = rig.castGlossOf = new Float32Array(rig.skin.geometry.attributes.position.count), S = rig.castScaleGloss; let i = -1;
    return v => {
      i++; const ax = Math.abs(v.x), s = v.x < 0 ? -1 : 1; G[i] = S ? S[i] : .4;
      if (v.y > 1.125 || v.y < .112 || v.arm > .5) return null;
      G[i] = 0;
      const cx = .15 + (1 - v.y) * .07, ang = Math.atan2(v.z, ax - cx), front = smooth(v.z / .04);
      // the rolled bib: a fat roll of canvas round the waist, folds pinched where the straps tie it
      const roll = band(v.y, 1.03, 1.115, .012), rollProfile = Math.sin(Math.PI * clamp((v.y - 1.025) / .095)), around = Math.atan2(v.x, v.z + .01);
      if (roll > .02) {
        const pinch = Math.max(bell(around, 0, .09), bell(Math.abs(around), 2.4, .12)), fold = .004 * Math.sin(around * 9 + v.y * 60) * (1 - pinch);
        const strapBand = bell(v.y, 1.07, .012) * (1 - pinch * .5), c = tmp.copy(canvas).lerp(worn, .25 + .2 * rollProfile).lerp(strap, clamp(strapBand * 1.2)).lerp(seam, .5 * bell(rollProfile, 0, .25)).clone();
        c.multiplyScalar(1 - .06 * Math.sin(v.y * 700 + around * 40));
        return { d: (.017 + .021 * rollProfile * (1 - .5 * pinch) + fold) * roll + .015 * (1 - roll), c, move: tube(v, .33, .27, .25, smooth((1.1 - v.y) / .05) * .6, -.01) };
      }
      if (v.y < 1.06) {
        // the bib folded down over the front: a panel with a stitched edge and the chest pocket upside down on it
        const bib = front * (1 - smooth((ax - (.12 + .02 * smooth((1.03 - v.y) / .12))) / .008)) * smooth((v.y - .84) / .01), bibEdge = front * Math.max(bell(ax, .12 + .02 * smooth((1.03 - v.y) / .12), .006), bell(v.y, .845, .006) * (ax < .14 ? 1 : 0)) * smooth((v.y - .835) / .01);
        const pocket = front * band(v.y, .88, .965, .006) * band(v.x, -.075, .045, .006), pocketEdge = front * (bell(v.y, .88, .004) + bell(v.y, .965, .004)) * band(v.x, -.075, .045, .004) + front * (bell(v.x, -.075, .004) + bell(v.x, .045, .004)) * band(v.y, .88, .965, .004);
        // legs: side seams with double stitching, knee patches, worn thighs, rips of hard work
        const seamL = bell(Math.abs(ang), 0, .05) * smooth((ax - .2) / .03), stitch = bell(Math.abs(Math.abs(ang) - .07), 0, .012) * smooth((ax - .2) / .03) * (.5 + .5 * Math.sign(Math.sin(v.y * 420)));
        const knee = band(v.y, .45, .62, .01) * (1 - smooth((Math.abs(v.x - s * cx) - .07) / .008)) * smooth((v.z - .0) / .03), kneeEdge = knee * (1 - smooth((Math.min(Math.abs(v.y - .45), Math.abs(v.y - .62), Math.abs(.07 - Math.abs(v.x - s * cx))) - .004) / .004));
        const fade = .45 * bell(v.y, .76, .13) * front * bell(ax, cx, .08), hem = 1 - smooth((v.y - .175) / .02), hemLine = bell(v.y, .175, .006);
        const c = tmp.copy(canvas).lerp(worn, clamp(fade + .3 * hem)).lerp(patch, knee * .8).lerp(seam, clamp(seamL * .6 + hemLine * .7 + pocketEdge * .6 + bibEdge * .5)).lerp(thread, clamp(stitch * .6 + kneeEdge * .45 + bibEdge * .5)).clone();
        c.multiplyScalar(1 - .07 * Math.sin(v.y * 820 + ax * 300) * Math.sin(v.y * 90 + ax * 50));
        const crease = .003 * Math.sin(v.y * 100 + ang * 3) * bell(v.y, .3, .14) + .004 * Math.sin(v.y * 60) * bell(v.y, .55, .05) * front;
        return { d: .016 + .009 * hem + crease + .011 * bib + .002 * knee + .002 * pocket, c, move: v.y < .93 ? trouser(v, lerp(.124, .136, smooth((v.y - .5) / .4)), smooth((.93 - v.y) / .1)) : tube(v, .33, .27, .25, .5 * smooth((1.06 - v.y) / .05), -.01) };
      }
      const c = tmp.copy(canvas).lerp(worn, .2).clone(); return { d: .016, c, move: tube(v, .33, .27, .25, .5, -.01) };
    };
  }

  /* ---------------------------------------------------------------- eyes: high on the skull, yellow-green, vertical slit, bony lids */
  function eye(rig, s, x, y, z, o) {
    const m = mats(rig), head = rig.joints.head, r = o.size, q = new THREE.Euler(o.pitch || 0, s * (o.yaw || 0), s * (o.roll || 0));
    const ball = rig.ellipsoid(head, m.wet, V(s * x, y, z), V(r, r * .86, r * .78)); ball.rotation.copy(q); ball.userData.eye = true; ball.userData.mane = true; ball.userData.storyPart = true; ball.name = 'Rourke: eye';
    const iris = m.iris || (m.iris = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.iris), roughness: .18, clearcoat: .8, emissive: new THREE.Color(o.iris).multiplyScalar(.12) }));
    const kid = (mat, p, sc) => { const k = new THREE.Mesh(ball.geometry, mat); k.position.set(...p); k.scale.set(...sc); k.userData.storyPart = true; ball.add(k); return k; };
    kid(iris, [0, 0, .5], [.94, .94, .58]); kid(m.black, [0, 0, .95], [.13, .8, .16]); // a vertical slit pupil
    kid(m.glint, [-.3, .34, 1.02], [.13, .15, .08]); kid(m.glint, [.26, -.3, 1.0], [.05, .06, .04]);
    // heavy bony lids: the upper one juts out over the eye like a brow, the lower one is a thick rim
    const lm = m.lid || (m.lid = new THREE.MeshStandardMaterial({ color: o.lid, roughness: .7 }));
    const up = rig.ellipsoid(head, lm, V(s * x, y + r * .5, z - r * .12), V(r * 1.12, r * .46, r * .95)), lo = rig.ellipsoid(head, lm, V(s * x, y - r * .62, z - r * .12), V(r * 1.05, r * .34, r * .88));
    for (const L of [up, lo]) { L.rotation.copy(q); L.userData.mane = true; L.userData.storyPart = true; L.name = 'Rourke: eyelid'; } up.rotation.x -= .25; up.rotation.z += s * .12; lo.rotation.x += .1;
    return ball;
  }

  /* ---------------------------------------------------------------- hands in white wraps, work boots */
  /** Rourke's hands (GOTR-0100): broad scaly crocodile paws (thick fingers, blunt dark claws, a pebbled pale palm) from
   *  adventure/story/paws.js, in white wraps over the wrist, palm and knuckles with the fingers free: one mesh per hand. */
  function hands(rig) { return SC.bareHands(rig, '#4b5a2c', '#b8ad7c', { wraps: true, species: 'croc' }); }
  function boots(rig) {
    const m = mats(rig), o = { upper: '#5b3d24', toe: '#3e2a19', sole: '#1c1a17', welt: '#2c2620', lace: '#c9b48a' };
    for (const s of ['L', 'R']) {
      const P = new Parts(), k = 1.12;
      P.sph(V(0, -.068, .045), V(.07 * k, .03, .175 * k), o.sole); P.sph(V(0, -.058, .045), V(.073 * k, .012, .178 * k), o.welt); P.box(V(0, -.072, -.075), V(.095 * k, .03, .075), o.sole);
      P.sph(V(0, -.03, .098), V(.062 * k, .045, .113 * k), o.upper); P.sph(V(0, -.012, -.035), V(.059 * k, .06, .081), o.upper); P.sph(V(0, .012, .02), V(.052 * k, .052, .072), o.upper, [-.35, 0, 0]);
      P.sph(V(0, -.038, .168), V(.06 * k, .036, .062 * k), o.toe); // the steel toe cap under worn leather
      P.cyl(V(0, .055, -.012), V(.075, .13, .083), o.upper); P.tor(V(0, .118, -.012), V(.076, .08, .084), o.toe, [Math.PI / 2, 0, 0]);
      for (let q = 0; q < 5; q++) P.ribbon([V(-.03, -.005 + q * .022, .1 - q * .021), V(0, .004 + q * .022, .108 - q * .021), V(.03, -.005 + q * .022, .1 - q * .021)], .006, .004, o.lace, V(0, 0, 1), 6, 6);
      rig.joints['foot' + s].add(meshOf(P, 'Rourke: work boot', m.parts));
    }
  }
  /** The overall straps tied in a knot at the front of the waist, two ends hanging, the bib's metal buckles hanging at the sides. */
  function waistKnot(rig) {
    const m = mats(rig), j = rig.joints, H = V(0, .99, 0), L = p => p.clone().sub(H), B = (x, y) => seat(rig, x, y, false, .02);
    const K = new Parts(), M = new Parts(), strap = '#3b4556', zf = B(0, 1.07) + .01;
    K.sph(L(V(0, 1.07, zf + .012)), V(.03, .024, .02), strap, [0, 0, .3]); K.sph(L(V(-.012, 1.068, zf + .028)), V(.016, .014, .012), '#434e60', [0, 0, -.4]);
    for (const sd of [-1, 1]) K.ribbon([L(V(sd * .012, 1.06, zf + .018)), L(V(sd * .034, 1.0, B(sd * .034, 1.0) + .03)), L(V(sd * .04, .93, B(sd * .04, .93) + .03))], .044, .007, strap, V(1, 0, 0), 12, 6);
    for (const sd of [-1, 1]) { const y = .925, x = sd * .04, z = B(x, y) + .034; M.box(L(V(x, y, z)), V(.04, .03, .008), '#a9adb3'); M.box(L(V(x, y, z + .004)), V(.022, .012, .006), '#7d8288'); }
    j.hips.add(meshOf(K, 'Rourke: overall straps knot', m.cloth)); j.hips.add(meshOf(M, 'Rourke: overall buckles', m.metal));
  }

  /* ---------------------------------------------------------------- the tail: thick, tapered, scaled, a double crest becoming one */
  function tailGeometry() {
    const path = new THREE.CatmullRomCurve3([V(0, .0, -.04), V(0, -.1, -.27), V(.015, -.31, -.49), V(.04, -.53, -.66), V(.07, -.69, -.78), V(.1, -.77, -.84)]);
    const RINGS = 150, AROUND = 30, ROWS = 46, COLS = 16, pos = [], col = [], idx = [], c = new THREE.Color();
    const back = lin('#36421f'), side = lin('#55622e'), under = lin('#cfc589'), band2 = lin('#20271a');
    for (let i = 0; i <= RINGS; i++) {
      // the frame: dorsal = up and back (away from the legs), across = sideways
      const u = i / RINGS, o = path.getPoint(u), t = path.getTangent(u), dors = V(0, 1, 0).addScaledVector(t, -t.y).normalize(), sidev = t.clone().cross(dors).normalize();
      const rx = lerp(.14, .012, Math.pow(u, .8)), ry = lerp(.12, .036, Math.pow(u, 1.1)), row = u * ROWS, fr = row - Math.floor(row), ri = Math.floor(row);
      for (let k = 0; k < AROUND; k++) {
        const a = k / AROUND * Math.PI * 2 - Math.PI, sa = Math.sin(a), ca = Math.cos(a);
        let r = 1 / Math.hypot(sa / rx, ca / ry);
        const colF = (a + Math.PI) / (Math.PI * 2) * COLS + (ri & 1) * .5, fc = colF - Math.floor(colF), edge = Math.min(fr, 1 - fr, fc, 1 - fc);
        r *= 1 + .05 * Math.sin(Math.PI * fr) * Math.sin(Math.PI * fc);
        // the crest: two rows of keeled scutes on the back that merge into one along the last part of the tail
        const twin = 1 - smooth((u - .5) / .1), keel = Math.max(twin * (bell(a, .42, .1) + bell(a, -.42, .1)), (1 - twin) * bell(a, 0, .14)), saw = Math.pow(1 - fr, 1.6);
        r += keel * lerp(.032, .022, u) * (.35 + .65 * saw) * (u < .03 ? u / .03 : 1);
        const q = o.clone().addScaledVector(sidev, sa * r).addScaledVector(dors, ca * r); pos.push(q.x, q.y, q.z);
        const pale = smooth((-ca - .15) / .45), cross = smooth((Math.sin(u * Math.PI * 2 * 5.5) - .55) / .3) * (1 - pale);
        c.copy(back).lerp(side, .5 * smooth((Math.abs(sa) - .5) / .4)).lerp(under, pale).lerp(band2, .55 * cross).multiplyScalar((1 - .45 * (1 - smooth(edge / .12))) * (.9 + .2 * hash(ri, Math.floor(colF), 3)) * (1 + .15 * keel));
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < RINGS; i++) for (let k = 0; k < AROUND; k++) { const a = i * AROUND + k, b = i * AROUND + (k + 1) % AROUND, d = a + AROUND, e = b + AROUND; idx.push(a, b, d, b, e, d); }
    const tip = pos.length / 3, end = path.getPoint(1).addScaledVector(path.getTangent(1), .012); pos.push(end.x, end.y, end.z); col.push(back.r * .7, back.g * .7, back.b * .7);
    for (let k = 0; k < AROUND; k++) idx.push(RINGS * AROUND + k, RINGS * AROUND + (k + 1) % AROUND, tip);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    return geo;
  }

  /* ---------------------------------------------------------------- motion: the jaw parts with the anatomy channel, tail lag */
  function mouthParts(rig, amount) {
    const f = rig.castMouth; if (!f) return; const a = clamp(amount);
    if (f.lower) f.lower.rotation.x = f.angle * a;
    for (const m of f.show || []) m.visible = a > (m.userData.from ?? .12);
  }
  function install(rig) {
    const base = rig.updateMane.bind(rig), settle = SC.market?.settle;
    rig.updateMane = time => { base(time); settle?.(rig, time); mouthParts(rig, rig.anatomy?.value?.[12] || 0); if (rig.castKit) for (const o of kitList(rig)) if (o.visible) o.visible = false; };
    const dummy = new THREE.Object3D(); dummy.visible = false;
    rig.faceActing = { inner: dummy, lip: new THREE.Object3D(), eyes: (rig.facialRest || []).filter(f => f.eye), brows: [] };
    for (const m of [rig.celebrationSmile, rig.painMouth]) if (m) { m.geometry = new THREE.BufferGeometry(); m.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); }
  }
  const kitList = rig => { const k = SC.kitParts(rig); return ['gloves', 'shorts', 'boots', 'trim', 'fur'].flatMap(n => k[n] || []); };
  function hideKit(rig) { rig.castKit = kitList(rig); for (const o of rig.castKit) o.visible = false; }
  /** The head surface in head coordinates: the top (largest y) over (hx, hz), and the side (largest |x|) at (hy, hz). */
  function topAt(rig, hx, hz, r = .012) { const P = rig.skin.geometry.attributes.position; let best = -9; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < 1.7) continue; if (Math.abs(P.getX(i) / HS - hx) > r || Math.abs(P.getZ(i) / HS - hz) > r) continue; best = Math.max(best, (y - HEAD_Y) / HS); } return best > -9 ? best : (r < .05 ? topAt(rig, hx, hz, r * 1.8) : 0); }
  function sideAt(rig, hy, hz, sgn, r = .008) { const P = rig.skin.geometry.attributes.position; let best = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < 1.7 || Math.abs((y - HEAD_Y) / HS - hy) > r || Math.abs(P.getZ(i) / HS - hz) > r) continue; const x = P.getX(i) / HS; if (x * sgn > best) best = x * sgn; } return best > 0 ? best : (r < .04 ? sideAt(rig, hy, hz, sgn, r * 1.8) : .05); }
  const reshapeLocal = (g, fn) => { const P = g.attributes.position, p = V(); for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); fn(p); P.setXYZ(i, p.x, p.y, p.z); } P.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); };

  /* ================================================================ ROURKE */
  const ROURKE = {
    id: 'rourke', fur: '#3d4a24', light: '#d9d09a', talkGain: .65,
    build: { torso: .09, depth: .08, belly: .05, bellyY: 1.2, bellyH: .2, chest: -.022, arm: .12, leg: .1, neck: .7, hips: .03, back: .025, traps: .06 }, // the lion fighter's body, a few percent heavier than Fang
    headForm,
    sculpt(rig) {
      const g = rig.skin.geometry; reshapeLocal(g, p => bulk(p, ROURKE.build));
      // the lion's muscle definition carries its own face (displacement, cavity shading): none on the crocodile's head
      { const D = g.attributes.avatarDefinition, DN = g.attributes.avatarDefinitionNormal, MA = g.attributes.avatarMass, P = g.attributes.position;
        for (let i = 0; i < P.count; i++) { const k = 1 - smooth((P.getY(i) - 1.66) / .06); if (k > .999) continue;
          for (let c = 0; c < 3; c++) { if (D) D.array[i * 4 + c] = Math.round(D.array[i * 4 + c] * k); if (DN) DN.array[i * 4 + c] = Math.round(DN.array[i * 4 + c] * k); if (MA) MA.array[i * 3 + c] = Math.round(MA.array[i * 3 + c] * k); }
          if (DN) DN.array[i * 4 + 3] = Math.round(DN.array[i * 4 + 3] * k); }
        for (const a of [D, DN, MA]) if (a) a.needsUpdate = true; }
      rig.castUnfolded = unfold(g);
      // where the lion's eye pits were filled the skin is crumpled: relax it, then iron the whole face and skull (no shrinking)
      iron(g, p => { if (p.y < 1.72) return 0; const [hx, hy, hz] = hc(p), ax = Math.abs(hx); return band(hz, .15, .44, .04) * band(hy, .07, .25, .03) * band(ax, .015, .175, .02); }, 6, true);
      iron(g, p => { if (p.y < 1.72) return 0; const [hx, hy, hz] = hc(p); return Math.max(smooth((hz - .1) / .06) * smooth((hy + .06) / .04) * (1 - .5 * bell(Math.abs(hx), .1, .03) * bell(hz, .12, .04)), .6 * smooth((hy - .02) / .06) * smooth((.08 - hz) / .06)); }, 60);
      scaleSkin(rig);
      // the lion's own mouth morph (anatomy channel 12 over its short muzzle) would sag the snout top in speech: cleared on the head
      { const M = g.attributes.avatarMuscle, MN = g.attributes.avatarMuscleNormal, P = g.attributes.position; if (M) for (let i = 0; i < P.count; i++) if (P.getY(i) > 1.7) { M.setXYZ(i, 0, 0, 0); if (MN) MN.setXYZ(i, 0, 0, 0); } }
      rig.castJawVerts = jaw(rig, { from: .02, to: ZT, ramp: .1, back: -.06, width: .26, hinge: [.075, -.02], angle: .2, depth: .012, depthZ: .006, band: .006, throat: .12, lips: '#4a4a26', inner: '#7a3a34' });
      rig.castBase = dress(g, rourkeClothes(rig), { relax: 22 }); use(g, rig.castBase); gloss(rig, rig.castGlossOf, .42);
      rig.castWear = 'work';
    },
    face(rig) {
      const head = rig.joints.head, m = mats(rig);
      // eyes high on the skull, on the turrets, looking out sideways and forward from under the bony lids
      for (const s of [-1, 1]) { const ex = .1, ez = .122, ey = topAt(rig, s * ex, ez) - .008; eye(rig, s, ex, ey - .006, ez, { size: .031, iris: '#b8c43a', lid: '#5f6f35', yaw: .62, pitch: -.42, roll: -.1 }); }
      // the nostrils: two crescent slits on the dome at the tip of the snout
      const N = new Parts(), nz = TIP - .04, ny = topAt(rig, 0, nz);
      for (const sd of [-1, 1]) { N.sph(V(sd * .014, ny - .002, nz), V(.009, .005, .012), '#0b0b07', [.2, sd * .4, 0]); N.sph(V(sd * .019, ny - .001, nz - .002), V(.004, .006, .012), '#56632f', [.2, sd * .4, 0]); }
      head.add(meshOf(N, 'Rourke: nostrils', m.parts));
    },
    finish(rig) {
      const j = rig.joints, m = mats(rig), head = j.head;
      rig.tail.clear(); hideKit(rig); rig.bodyFurOff = true; rig.skin.material.bumpScale *= .5;
      // teeth: a ragged row along each side of the closed jaw: the upper ones hang down outside the narrower lower jaw, a few big
      // lower ones stand up outside the upper jaw (the fourth one in its notch near the tip); some chipped, one missing
      const upper = new Parts(), lower = new Parts(), rnd = (() => { let s = 4242; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
      const hingeAt = V(0, .075 * HS, -.02 * HS), ivory = ['#efe6c8', '#e3d6ae', '#d6c897', '#f2ead2'];
      for (const s of [-1, 1]) {
        for (let k = 0; k < 17; k++) {
          const hz = .17 + (TIP - .17 - .018) * (k / 16) ** .92, ly = lip(hz); if (s < 0 && k === 6) continue; // a gap: one lost on the docks
          const x = sideAt(rig, ly + .008, hz, s) - .004, big = k === 4 || k === 10 || k === 11 ? 1.35 : 1, chip = rnd() < .18 ? .6 : 1;
          tooth(upper, V(s * x * HS, (ly + .01) * HS, hz * HS), V(s * .2, -1, .05 * (rnd() - .5)), (.022 + .011 * rnd()) * big * chip * HS, .0072 * big * HS, ivory[Math.floor(rnd() * 4)]);
        }
        for (const [fx, len] of [[.016, .02], [.036, .026], [.056, .03], [.074, .022]]) { // round the front of the snout
          const ly = lip(TIP - .02) + .004, z = seat(rig, fx, ly + .008) - .006; if (!(z > .3)) continue;
          tooth(upper, V(s * fx * HS, (ly + .008) * HS, z * HS), V(s * .12, -1, .18), len * HS, .0062 * HS, ivory[Math.floor(rnd() * 4)]);
        }
        for (const [hz, len, r] of [[TIP - .055, .036, .0075], [TIP - .1, .022, .0055], [.3, .02, .005], [.21, .024, .0058], [.15, .02, .005]]) {
          const ly = lip(hz), x = sideAt(rig, ly - .012, hz, s) + .001, root = V(s * x * HS, (ly - .01) * HS, hz * HS).sub(hingeAt);
          tooth(lower, root, V(s * .25, 1, 0), len * HS, r * HS, ivory[Math.floor(rnd() * 4)]);
        }
      }
      head.add(meshOf(upper, 'Rourke: upper teeth', m.teeth));
      const hinge = new THREE.Group(); hinge.name = 'Rourke: jaw hinge'; hinge.position.copy(hingeAt); hinge.userData.storyPart = true; head.add(hinge);
      hinge.add(meshOf(lower, 'Rourke: lower teeth', m.teeth));
      const tg = new Parts(); tg.sph(V(0, .03 * HS, .25 * HS).sub(hingeAt), V(.07, .012, .15), '#c98d7c'); const tongue = meshOf(tg, 'Rourke: tongue', m.teeth); tongue.userData.from = .25; hinge.add(tongue);
      rig.castMouth = { lower: hinge, angle: .2, show: [tongue], talk: ROURKE.talkGain };
      hands(rig); boots(rig); waistKnot(rig);
      if (rig.definition?.look) rig.definition.look.value.multiplyScalar(1.25);
      // the tail on the hips, lagging behind them
      const tl = new THREE.Group(); tl.name = 'Rourke: tail'; rig.tail.add(tl); tl.position.set(0, -.02, -.12);
      tl.add(mark(Object.assign(new THREE.Mesh(tailGeometry(), m.scales), { name: 'Rourke: tail scales' })));
      (rig.castSprings || (rig.castSprings = [])).push({ o: tl, rest: tl.quaternion.clone(), k: .6, kind: 'tail' });
      install(rig);
    }
  };

  /* ---------------------------------------------------------------- register */
  SC.defs.rourke = ROURKE; if (!SC.ids.includes('rourke')) SC.ids.push('rourke');
  SC.names.rourke = { en: 'Rourke', he: 'רורק', ru: 'Рурк' };
  // the Docks fight: Rourke takes the Opponent slot bare-handed in his work clothes; the kit (gloves, shorts, boots) stays hidden
  const baseOpponent = SC.asOpponent;
  SC.asOpponent = (engine, id) => {
    const restore = baseOpponent(engine, id); if (id !== 'rourke') return restore;
    const c = SC.rig(id, engine); if (c) hideKit(c);
    return restore;
  };
  SC.docks = { ids: ['rourke'], barehanded: ['rourke'], lip, tip: TIP, version: 1 };
})();
