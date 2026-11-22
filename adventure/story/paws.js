/* Animal paws for every bare-handed character (GOTR-0100: "Look at his paws ... I want to see lion fingers, the colours of the
 * paw from inside and outside" / "every avatar paws — invest in it").
 * Each paw shape is ONE continuous surface: a signed distance field (the wrist, a tapered palm with thenar and hypothenar
 * mounds, the metacarpal ridges and knuckles on the back, four fingers as chains of round cones with joint knobs, an opposable
 * thumb, raised leather pads) joined by smooth unions, extracted with surface nets on a fine grid, projected back onto the
 * field, reduced with quadric edge collapse to the triangle budget (~5,600 per paw) and shaded with normals taken from the
 * field itself. Claws (or the doe's hoof-like tips) are small curved keratin cones rooted inside the fingertips, in the same
 * mesh. Colours are vertex colours: the coat on the back (sampled from the character's own forearm, so the wrist joins
 * seamlessly), a lighter palm, dark leather pads, glossy claws, ambient occlusion baked from the field (the creases between the
 * fingers and round the pads). Hand wraps (docks, Rourke) are a second surface from the same field, offset over the wrist,
 * palm and knuckles with the fingers and thumb free, merged into the same mesh with the hidden skin left out.
 * Shapes (one geometry each, swapped, never morphed through a broken in-between): relaxed, open, point, grip, fist.
 * Built once per species, shape and side; shared by every rig (only the vertex colours are cloned per coat).
 * Hand frame (as the gloves): -y from the wrist to the knuckles, +z the palm, the thumb on -x for the left hand (+x right).
 * The shape follows the pose: DreamPose sets rig.pawPose = { L, R, time } for the everyday gestures (stamped with the rig's
 * renderTime); without a fresh stamp (a fight, a drill, any boxing pose) the paw is a fist. rig.pawOverride = { L, R } wins (QA).
 * API: Paws.attach(rig, { species?, fur?, pad?, wraps?, name? }) -> [meshL, meshR]
 *      Paws.shapeFor(gesture) ; Paws.build(species, shape, side, { wraps }) -> { geometry, stats } (shared, do not dispose)
 *      Paws.species ; Paws.shapes ; Paws.speciesOf(rig) ; rig.pawHold = { L|R: object } -> a grip while that object is shown
 *      Paws.prefetch(['fang', 'hazel'] | [{ who, wraps }], { prio, shapes }) -> asks the workers for a coming scene's paws first
 * Phones (follow-up): shapes are only built in background workers (two on 4+ cores, in priority order); the page never builds one
 * during play. Until a shape is ready a paw shows the nearest ready shape or a quick stand-in (the same anatomy in capsules and
 * ellipsoids, a few ms); a paw small on screen draws a low-detail version (~900 triangles, no claws) made in the same worker job.
 * Paws.debug counts worker builds, page builds (should stay empty in a browser) and geometry swaps. */
(() => {
  const G = typeof self !== 'undefined' ? self : globalThis, T = G.THREE || null, WORKER = typeof WorkerGlobalScope !== 'undefined' && G instanceof WorkerGlobalScope;
  if (!T && !WORKER) return;
  const SRC = !WORKER && typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null; // the same file builds paws in a worker
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lin = hex => { const n = parseInt(hex.slice(1), 16), f = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return { r: f(n >> 16 & 255), g: f(n >> 8 & 255), b: f(n & 255) }; }; // sRGB hex -> linear (no THREE in the worker)
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  /* ---------------------------------------------------------------- species looks
   * S size, FL finger length, FT finger thickness, claw: [visible length, half width, half height, curl] or 'hoof', web: webbed fingers
   * colours (sRGB): palm (skin between the pads), pad, padHi (pad sheen), claw, clawTip; fur is the character's coat. */
  const LOOK = {
    lion: { S: 1.18, FL: .92, FT: 1.14, claw: [.012, .0034, .0046, .55], palm: '#d8b27c', pad: '#6b4741', padHi: '#8b5f58', claw0: '#2a221f', claw1: '#5d5047', streak: .08 },
    bear: { S: 1.14, FL: .86, FT: 1.13, claw: [.022, .0042, .0056, .75], palm: '#4a3427', pad: '#2c2422', padHi: '#463834', claw0: '#2d2620', claw1: '#76664f', streak: .12, palmFur: .5 },
    rabbit: { S: .95, FL: 1.06, FT: .86, claw: [.0085, .0025, .0032, .5], palm: '#c3c9d2', pad: '#c99a9c', padHi: '#dcb3b4', claw0: '#d8cfc0', claw1: '#efe9dd', streak: .05, padK: .72, palmFur: .7 },
    wolf: { S: 1.02, FL: 1.08, FT: .93, claw: [.014, .0031, .0043, .6], palm: '#8e8b8a', pad: '#1f1b1d', padHi: '#3a3437', claw0: '#221e1f', claw1: '#4f4848', streak: .1, palmFur: .35 },
    bulldog: { S: 1.04, FL: .9, FT: 1.05, claw: [.01, .0033, .0042, .45], palm: '#e4d9c6', pad: '#3a2d2d', padHi: '#5a4646', claw0: '#3b3330', claw1: '#6d625a', streak: .05 },
    otter: { S: .93, FL: .84, FT: .96, claw: [.0075, .0026, .0034, .55], palm: '#6e4a31', pad: '#2a1a12', padHi: '#46322a', claw0: '#1d1510', claw1: '#3c2d24', streak: .07, web: true, palmFur: .2 },
    doe: { S: .87, FL: 1.1, FT: .79, claw: 'hoof', palm: '#d9c6a6', pad: '#8a6a55', padHi: '#a6846e', claw0: '#2e2220', claw1: '#4a3a34', streak: .06, padK: .6, palmFur: .4 },
    croc: { S: 1.1, FL: .95, FT: 1.1, claw: [.012, .0046, .0055, .4], palm: '#b5ab7d', pad: '#8f8a5c', padHi: '#a9a274', claw0: '#221d14', claw1: '#4a4030', streak: 0, scales: true, padK: .5 }
  };
  const CHAR = { bruno: 'bear', brick: 'bulldog', fang: 'wolf', hazel: 'doe', otto: 'otter', rourke: 'croc' };
  const speciesOf = rig => CHAR[rig?.character] || (LOOK[rig?.species] ? rig.species : 'lion');

  /* ---------------------------------------------------------------- shapes (left hand; degrees: [MCP, PIP, DIP] per finger, splay)
   * thumb: carpometacarpal, MCP, IP and tip positions (unscaled metres, left hand). */
  const SHAPES = {
    relaxed: { f: [[16, 26, 14], [20, 32, 16], [25, 38, 19], [30, 44, 22]], splay: [-.045, -.012, .02, .055], thumb: [[-.03, -.016, .012], [-.058, -.053, .03], [-.067, -.086, .045], [-.064, -.118, .054]] },
    open: { f: [[4, 8, 5], [3, 7, 4], [5, 9, 5], [8, 11, 6]], splay: [-.14, -.04, .06, .17], thumb: [[-.03, -.016, .01], [-.064, -.048, .022], [-.088, -.074, .028], [-.104, -.1, .032]] },
    point: { f: [[2, 6, 4], [86, 102, 52], [88, 104, 54], [90, 106, 56]], splay: [-.04, 0, .01, .03], thumb: [[-.03, -.016, .014], [-.056, -.06, .04], [-.036, -.092, .068], [-.006, -.103, .073]] },
    grip: { f: [[52, 72, 34], [55, 75, 36], [58, 78, 38], [62, 82, 40]], splay: [-.03, -.01, .01, .04], thumb: [[-.03, -.016, .014], [-.058, -.058, .036], [-.05, -.093, .06], [-.028, -.115, .068]] },
    fist: { f: [[84, 100, 50], [87, 102, 52], [89, 104, 54], [91, 106, 56]], splay: [-.02, 0, .01, .03], thumb: [[-.03, -.016, .014], [-.056, -.06, .04], [-.036, -.092, .068], [-.004, -.101, .074]] }
  };
  const FINGERS = [{ x: -.0435, y: -.106, len: [.047, .031, .026], r: .0150 }, { x: -.0145, y: -.111, len: [.051, .034, .027], r: .0156 },
    { x: .0145, y: -.109, len: [.049, .032, .026], r: .0150 }, { x: .0425, y: -.101, len: [.041, .027, .023], r: .0136 }];
  const SWITCH_CLAW = { fist: .55, grip: .75, point: .7 }; // claws drawn in when the hand closes (retractile; a fighter's fist keeps them in)
  const GESTURE = { hang: 'relaxed', strap: 'relaxed', open: 'open', fist: 'fist', point: 'point', hips: 'relaxed', thumb: 'point', chin: 'grip', cross: 'relaxed', cross2: 'relaxed',
    pound: 'fist', shrug: 'open', count: 'open', wave: 'open', low: 'open', carry: 'grip', head: 'relaxed' };
  const shapeFor = g => GESTURE[g] || 'relaxed';

  /* ---------------------------------------------------------------- signed distance primitives (numbers, no allocation) */
  function cone(a, b, r1, r2) { // iq's round cone between two points
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2;
    return { k: 0, ax: a[0], ay: a[1], az: a[2], bax, bay, baz, l2, rr, a2: l2 - rr * rr, il2: 1 / l2, r1, r2, lo: [Math.min(a[0] - r1, b[0] - r2), Math.min(a[1] - r1, b[1] - r2), Math.min(a[2] - r1, b[2] - r2)], hi: [Math.max(a[0] + r1, b[0] + r2), Math.max(a[1] + r1, b[1] + r2), Math.max(a[2] + r1, b[2] + r2)] };
  }
  function coneD(c, px, py, pz) {
    const pax = px - c.ax, pay = py - c.ay, paz = pz - c.az, y = pax * c.bax + pay * c.bay + paz * c.baz, z = y - c.l2;
    const qx = pax * c.l2 - c.bax * y, qy = pay * c.l2 - c.bay * y, qz = paz * c.l2 - c.baz * y, x2 = qx * qx + qy * qy + qz * qz;
    const y2 = y * y * c.l2, z2 = z * z * c.l2, k = Math.sign(c.rr) * c.rr * c.rr * x2;
    if (Math.sign(z) * c.a2 * z2 > k) return Math.sqrt(x2 + z2) * c.il2 - c.r2;
    if (Math.sign(y) * c.a2 * y2 < k) return Math.sqrt(x2 + y2) * c.il2 - c.r1;
    return (Math.sqrt(x2 * c.a2 * c.il2) + y * c.rr) * c.il2 - c.r1;
  }
  function ell(c, r, ax) { // ellipsoid; ax: rows of the local frame (x, y, z unit vectors) or null
    const m = ax ? [...ax[0], ...ax[1], ...ax[2]] : [1, 0, 0, 0, 1, 0, 0, 0, 1], R = Math.max(...r);
    return { k: 1, cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], m, lo: c.map(v => v - R), hi: c.map(v => v + R) };
  }
  function ellD(e, px, py, pz) {
    const dx = px - e.cx, dy = py - e.cy, dz = pz - e.cz, m = e.m;
    const lx = (dx * m[0] + dy * m[1] + dz * m[2]) / e.rx, ly = (dx * m[3] + dy * m[4] + dz * m[5]) / e.ry, lz = (dx * m[6] + dy * m[7] + dz * m[8]) / e.rz;
    const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz), k1 = Math.sqrt(lx * lx / (e.rx * e.rx) + ly * ly / (e.ry * e.ry) + lz * lz / (e.rz * e.rz));
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(e.rx, e.ry, e.rz);
  }
  function box(c, hx0, hx1, y0, y1, hy, hz, r) { return { k: 2, cx: c[0], cy: c[1], cz: c[2], hx0, hx1, y0, y1, hy, hz, r, lo: [c[0] - Math.max(hx0, hx1) - r, c[1] - hy - r, c[2] - hz - r], hi: [c[0] + Math.max(hx0, hx1) + r, c[1] + hy + r, c[2] + hz + r] }; }
  function boxD(b, px, py, pz) { // rounded box whose half width tapers from hx0 (at y0) to hx1 (at y1)
    const hx = lerp(b.hx0, b.hx1, clamp((py - b.y0) / (b.y1 - b.y0))), qx = Math.abs(px - b.cx) - hx, qy = Math.abs(py - b.cy) - b.hy, qz = Math.abs(pz - b.cz) - b.hz;
    const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - b.r;
  }
  const D = (p, x, y, z) => p.k === 0 ? coneD(p, x, y, z) : p.k === 1 ? ellD(p, x, y, z) : boxD(p, x, y, z);
  const smin = (a, b, k) => { if (k <= 0) return a < b ? a : b; const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
  const smax = (a, b, k) => -smin(-a, -b, k);

  /* ---------------------------------------------------------------- vectors as arrays */
  const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.sqrt(dot(a, a)), nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const rad = d => d * Math.PI / 180;

  /* ---------------------------------------------------------------- the paw as a field */
  function anatomy(species, shapeName) {
    const L = LOOK[species], S = L.S, FL = L.FL, FT = L.FT, sh = SHAPES[shapeName], P = v => scl(v, S), WX = 1; // WX: knuckle spread
    const chains = [], pads = [], claws = [], frames = [];
    // the wrist: a round cone inside the forearm (radius ~0.05 m on every rig) that takes over from it at the joint; the carpus below it
    const wrist = cone([0, .036, 0], [0, -.014, 0], .0488, .0512), carpus = ell(P([0, -.02, .002]), P([.04, .026, .03]));
    // the palm: four metacarpals (ridges on the back that end in the knuckle heads), the padded flesh of the palm under them,
    // the thenar mound (thumb side, -x) and the hypothenar mound
    const metas = [], knuckles = [];
    FINGERS.forEach(f => { const M = P([f.x * WX, f.y + .004, -.007]), r = f.r * FT * S; metas.push(cone(P([f.x * .48, -.024, -.006]), M, .0148 * S, r * 1.02)); knuckles.push(ell(add(M, [0, -r * .05, -r * .16]), [r * 1.06, r * .98, r * 1.04])); });
    const flesh = ell(P([.002, -.064, .011]), P([.05 * WX, .05, .025]));
    const thenar = ell(P([-.035, -.049, .016]), P([.025, .038, .022]), [nrm([.94, -.34, 0]), nrm([.34, .94, 0]), [0, 0, 1]]);
    const hypo = ell(P([.045 * WX, -.064, .011]), P([.019, .043, .02]));
    const list = [[carpus, .025], ...metas.map(m => [m, metas.indexOf(m) ? .02 : .02]), [flesh, .018], [thenar, .016], [hypo, .016]], tops = knuckles.map(k => [k, .009]);
    const palmOnly = (x, y, z) => { let d = coneD(wrist, x, y, z); for (const [q, k] of list) d = smin(d, D(q, x, y, z), k); return d; };
    const surfaceZ = (x, y) => { let a = 0, b = .12; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (palmOnly(x, y, m) < 0) a = m; else b = m; } return (a + b) / 2; }; // the palm surface above (x, y)
    // fingers: MCP knuckle, proximal, middle and distal phalanx; the bend is toward the palm (+z), splay about z
    sh.f.forEach((ang, i) => {
      const f = FINGERS[i], sp = sh.splay[i], d0 = [Math.sin(sp), -Math.cos(sp), 0], z = [0, 0, 1], r = f.r * FT * S, lens = f.len.map(l => l * FL * S);
      const dir = th => add(scl(d0, Math.cos(th)), z, Math.sin(th)), nor = th => add(scl(d0, -Math.sin(th)), z, Math.cos(th));
      const M = P([f.x * WX, f.y, -.003]); let th = rad(ang[0]); const J1 = add(M, dir(th), lens[0]); const th1 = th; th += rad(ang[1]); const J2 = add(J1, dir(th), lens[1]); const th2 = th; th += rad(ang[2]); const J3 = add(J2, dir(th), lens[2]); const th3 = th;
      const segs = [cone(M, J1, r, r * .96), cone(J1, J2, r * .97, r * .93), cone(J2, J3, r * .94, r * .87)];
      const knobs = [ell(add(J1, nor(th1), -r * .1), [r * 1.02, r, r]), ell(add(J2, nor(th2), -r * .08), [r * .97, r * .94, r * .94])];
      chains.push({ segs, knobs, nor: [nor(th1), nor(th2), nor(th3)], dir: [dir(th1), dir(th2), dir(th3)], J: [M, J1, J2, J3], r });
      const lat = nrm(cross(dir(th3), nor(th3))), pk = L.padK || 1;
      pads.push({ p: ell(add(add(J2, dir(th3), lens[2] * .62), nor(th3), r * .42), [r * .86 * pk, lens[2] * .56, r * .6], [lat, dir(th3), nor(th3)]), tone: 1 }); // the digital pad on the fingertip
      pads.push({ p: ell(add(add(J1, dir(th2), lens[1] * .5), nor(th2), r * .55), [r * .7 * pk, lens[1] * .4, r * .5], [nrm(cross(dir(th2), nor(th2))), dir(th2), nor(th2)]), tone: .55 }); // a small pad on the middle phalanx
      frames.push({ tip: J3, dir: dir(th3), nor: nor(th3), r: r * .87, lat });
    });
    // thumb: metacarpal (inside the thenar), proximal and distal phalanx
    { const [C, M, I, Tp] = sh.thumb.map(P), r = .0158 * FT * S, palmC = P([0, -.098, .032]);
      const segs = [cone(C, M, r * 1.12, r * 1.03), cone(M, I, r * 1.02, r * .96), cone(I, Tp, r * .95, r * .85)], dt = nrm(sub(Tp, I)), toward = sub(palmC, Tp), nT = nrm(add(toward, dt, -dot(toward, dt)));
      const knobs = [ell(M, [r * 1.05, r * 1.05, r * 1.05]), ell(I, [r * .98, r * .98, r * .98])], dm = nrm(sub(I, M)), nM = nrm(add(nT, dm, -dot(nT, dm)));
      chains.push({ segs, knobs, nor: [nM, nM, nT], dir: [nrm(sub(M, C)), dm, dt], J: [C, M, I, Tp], r, thumb: true });
      const lat = nrm(cross(dt, nT)), dl = len(sub(Tp, I));
      pads.push({ p: ell(add(add(I, dt, dl * .52), nT, r * .52), [r * .82 * (L.padK || 1), dl * .55, r * .56], [lat, dt, nT]), tone: 1 });
      frames.push({ tip: Tp, dir: dt, nor: nT, r: r * .85, lat, thumb: true }); }
    // the big palm pad (three lobes over a heart-shaped body), seated on the palm surface
    const pk = L.padK || 1, seat = (x, y, rz, sink) => [x * S, y * S, surfaceZ(x * S, y * S) - sink * S + 0 * rz];
    pads.push({ p: ell(seat(.003, -.07, .012, .005), P([.034 * pk, .026 * pk, .012])), tone: 1, palm: true });
    for (const [x, y, rx] of [[-.024, -.09, .017], [0, -.097, .018], [.025, -.09, .017]]) pads.push({ p: ell(seat(x * WX, y, .011, .0052), P([rx * pk, .0135 * pk, .011])), tone: 1, palm: true });
    // claws: curved keratin cones rooted inside the fingertip on its back edge, curving down past the tip
    if (L.claw !== 'hoof') for (const fr of frames) {
      const [cl, w, h, curl] = L.claw, k = (fr.thumb ? .92 : 1) * (SWITCH_CLAW[shapeName] ?? 1), root = add(add(fr.tip, fr.dir, -fr.r * .2), fr.nor, -fr.r * .5), hide = fr.r * .91; // rooted under the fur on the back of the fingertip, it leaves the tip at ~0.9 r
      claws.push({ root, dir: fr.dir, nor: fr.nor, lat: fr.lat, len: hide + cl * S * k, hide, w: w * S * k, h: h * S * k, curl });
    }
    return { L, S, base: { wrist, list, tops, all: [wrist, ...list.map(q => q[0]), ...knuckles] }, chains, pads, claws, frames };
  }
  /** The field of a paw: d(x, y, z), plus parts() for colouring (distances to each region). Parts whose bounding box is further
   *  than the blend width beyond the distance found so far cannot change it and are skipped. */
  function fieldOf(A) {
    const B = A.base, chains = A.chains, pads = A.pads.map(q => q.p), kff = A.L.web ? .011 : .0022, webs = [];
    if (A.L.web) for (let i = 0; i < 3; i++) { const a = chains[i], b = chains[i + 1], pa = add(a.J[0], sub(a.J[1], a.J[0]), .62), pb = add(b.J[0], sub(b.J[1], b.J[0]), .62); webs.push(cone(add(pa, a.nor[0], -.002), add(pb, b.nor[0], -.002), .0042 * A.S, .0042 * A.S)); }
    const boxOf = list => { const lo = [9, 9, 9], hi = [-9, -9, -9]; for (const q of list) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q.lo[k]); hi[k] = Math.max(hi[k], q.hi[k]); } return { lo, hi }; };
    const far = (b, x, y, z) => { const dx = Math.max(b.lo[0] - x, 0, x - b.hi[0]), dy = Math.max(b.lo[1] - y, 0, y - b.hi[1]), dz = Math.max(b.lo[2] - z, 0, z - b.hi[2]); return Math.sqrt(dx * dx + dy * dy + dz * dz); };
    for (const c of chains) c.box = boxOf([...c.segs, ...c.knobs]);
    const extra = [...B.list, ...B.tops];
    const baseD = (x, y, z) => {
      let d = coneD(B.wrist, x, y, z);
      for (let i = 0; i < extra.length; i++) { const [q, k] = extra[i]; if (far(q, x, y, z) < d + k) d = smin(d, D(q, x, y, z), k); }
      return d;
    };
    const chainD = (c, x, y, z) => { let d = Math.min(coneD(c.segs[0], x, y, z), coneD(c.segs[1], x, y, z), coneD(c.segs[2], x, y, z)); for (const k of c.knobs) d = smin(d, ellD(k, x, y, z), .005); return d; };
    const field = (x, y, z) => {
      let d = baseD(x, y, z), f = 9;
      for (let i = 0; i < 4; i++) { const c = chains[i]; if (far(c.box, x, y, z) < Math.min(f + kff, d + .012 + kff)) f = smin(f, chainD(c, x, y, z), kff); }
      for (const w of webs) f = smin(f, coneD(w, x, y, z), .008);
      d = smin(d, f, .012); if (far(chains[4].box, x, y, z) < d + .015) d = smin(d, chainD(chains[4], x, y, z), .015);
      for (const p of pads) if (far(p, x, y, z) < d + .0032) d = smin(d, ellD(p, x, y, z), .0032);
      return d;
    };
    const parts = (x, y, z) => ({ base: baseD(x, y, z), chains: chains.map(c => c.segs.map(s => coneD(s, x, y, z))), pads: pads.map(p => ellD(p, x, y, z)) });
    const all = boxOf([...B.all, ...pads, ...chains.flatMap(c => [...c.segs, ...c.knobs])]);
    return { field, parts, base: baseD, lo: all.lo.map(v => v - .012), hi: all.hi.map(v => v + .012) };
  }

  /* ---------------------------------------------------------------- surface nets on a narrow band */
  function surfaceNets(field, lo, hi, h) {
    const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
    const idx = (i, j, k) => (i * ny + j) * nz + k, val = new Float32Array(nx * ny * nz).fill(NaN), B = 3, hd = B * h * Math.sqrt(3) / 2;
    const cx = i => lo[0] + i * h, cy = j => lo[1] + j * h, cz = k => lo[2] + k * h, todo = [];
    for (let i = 0; i < nx - 1; i += B) for (let j = 0; j < ny - 1; j += B) for (let k = 0; k < nz - 1; k += B) {
      const f = field(cx(i + B / 2), cy(j + B / 2), cz(k + B / 2));
      if (Math.abs(f) > hd * 1.25 + h) todo.push([i, j, k, f]); else for (let a = i; a <= Math.min(i + B, nx - 1); a++) for (let b = j; b <= Math.min(j + B, ny - 1); b++) for (let c = k; c <= Math.min(k + B, nz - 1); c++) { const q = idx(a, b, c); if (Number.isNaN(val[q])) val[q] = field(cx(a), cy(b), cz(c)); }
    }
    for (const [i, j, k, f] of todo) for (let a = i; a <= Math.min(i + B, nx - 1); a++) for (let b = j; b <= Math.min(j + B, ny - 1); b++) for (let c = k; c <= Math.min(k + B, nz - 1); c++) { const q = idx(a, b, c); if (Number.isNaN(val[q])) val[q] = f; }
    const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), cid = (i, j, k) => (i * (ny - 1) + j) * (nz - 1) + k, pos = [];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], O = [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1]], v8 = new Float64Array(8);
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) for (let k = 0; k < nz - 1; k++) {
      let neg = 0; for (let q = 0; q < 8; q++) { v8[q] = val[idx(i + O[q][0], j + O[q][1], k + O[q][2])]; if (v8[q] < 0) neg++; }
      if (neg === 0 || neg === 8) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of E) { if ((v8[a] < 0) === (v8[b] < 0)) continue; const t = v8[a] / (v8[a] - v8[b]); sx += O[a][0] + (O[b][0] - O[a][0]) * t; sy += O[a][1] + (O[b][1] - O[a][1]) * t; sz += O[a][2] + (O[b][2] - O[a][2]) * t; n++; }
      cell[cid(i, j, k)] = pos.length / 3; pos.push(cx(i) + sx / n * h, cy(j) + sy / n * h, cz(k) + sz / n * h);
    }
    const tri = [], quad = (a, b, c, d, out) => { // a b c d around the edge; out: +1 if the outward normal follows the right-hand order
      if (a < 0 || b < 0 || c < 0 || d < 0) return; const q = out > 0 ? [a, b, c, d] : [a, d, c, b], P = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      const d02 = len(sub(P(q[0]), P(q[2]))), d13 = len(sub(P(q[1]), P(q[3])));
      if (d02 < d13) tri.push(q[0], q[1], q[2], q[0], q[2], q[3]); else tri.push(q[0], q[1], q[3], q[1], q[2], q[3]);
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const v = val[idx(i, j, k)], inside = v < 0;
      if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && inside !== (val[idx(i + 1, j, k)] < 0)) quad(cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)], inside ? 1 : -1);
      if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && inside !== (val[idx(i, j + 1, k)] < 0)) quad(cell[cid(i - 1, j, k - 1)], cell[cid(i - 1, j, k)], cell[cid(i, j, k)], cell[cid(i, j, k - 1)], inside ? 1 : -1);
      if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && inside !== (val[idx(i, j, k + 1)] < 0)) quad(cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)], inside ? 1 : -1);
    }
    return { pos: Float64Array.from(pos), tri: Int32Array.from(tri) };
  }
  const grad = (field, x, y, z, e = .00035) => { const gx = field(x + e, y, z) - field(x - e, y, z), gy = field(x, y + e, z) - field(x, y - e, z), gz = field(x, y, z + e) - field(x, y, z - e), l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1; return [gx / l, gy / l, gz / l, l / (2 * e)]; };
  function project(field, pos, steps = 2, maxStep = .003) {
    for (let i = 0; i < pos.length; i += 3) for (let s = 0; s < steps; s++) {
      const f = field(pos[i], pos[i + 1], pos[i + 2]); if (Math.abs(f) < 1e-6) break; const g = grad(field, pos[i], pos[i + 1], pos[i + 2]), m = clamp(f / (g[3] || 1), -maxStep, maxStep);
      pos[i] -= g[0] * m; pos[i + 1] -= g[1] * m; pos[i + 2] -= g[2] * m;
    }
  }

  /* ---------------------------------------------------------------- quadric edge collapse (Garland & Heckbert) */
  function decimate(pos, tri, target) {
    const nv = pos.length / 3, nt = tri.length / 3, Q = new Float64Array(nv * 10), alive = new Uint8Array(nt).fill(1), gone = new Uint8Array(nv), stamp = new Int32Array(nv), mark = new Int32Array(nv);
    // vertex -> faces (grown as faces move to the surviving vertex)
    let vf = Array.from({ length: nv }, () => []);
    for (let t = 0; t < nt; t++) {
      const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2]; vf[a].push(t); vf[b].push(t); vf[c].push(t);
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2], vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz); if (l < 1e-14) continue;
      nx /= l; ny /= l; nz /= l; const d = -(nx * pos[a * 3] + ny * pos[a * 3 + 1] + nz * pos[a * 3 + 2]), w = l * .5;
      for (const v of [a, b, c]) { const o = v * 10; Q[o] += nx * nx * w; Q[o + 1] += nx * ny * w; Q[o + 2] += nx * nz * w; Q[o + 3] += nx * d * w; Q[o + 4] += ny * ny * w; Q[o + 5] += ny * nz * w; Q[o + 6] += ny * d * w; Q[o + 7] += nz * nz * w; Q[o + 8] += nz * d * w; Q[o + 9] += d * d * w; }
    }
    // a binary heap of [cost, a, b, stamp a, stamp b] in flat arrays
    let cap = 1 << 16, hc = new Float64Array(cap), hi = new Int32Array(cap * 4), size = 0;
    const swap = (i, j) => { const c = hc[i]; hc[i] = hc[j]; hc[j] = c; for (let k = 0; k < 4; k++) { const v = hi[i * 4 + k]; hi[i * 4 + k] = hi[j * 4 + k]; hi[j * 4 + k] = v; } };
    const push = (c, a, b) => {
      if (size === cap) { cap *= 2; const c2 = new Float64Array(cap), i2 = new Int32Array(cap * 4); c2.set(hc); i2.set(hi); hc = c2; hi = i2; }
      let i = size++; hc[i] = c; hi[i * 4] = a; hi[i * 4 + 1] = b; hi[i * 4 + 2] = stamp[a]; hi[i * 4 + 3] = stamp[b];
      while (i > 0) { const p = (i - 1) >> 1; if (hc[p] <= hc[i]) break; swap(p, i); i = p; }
    };
    const popTo = out => { out[0] = hi[0]; out[1] = hi[1]; out[2] = hi[2]; out[3] = hi[3]; size--; if (size > 0) { hc[0] = hc[size]; for (let k = 0; k < 4; k++) hi[k] = hi[size * 4 + k]; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < size && hc[l] < hc[m]) m = l; if (r < size && hc[r] < hc[m]) m = r; if (m === i) break; swap(m, i); i = m; } } };
    const best = new Float64Array(3);
    const plan = (a, b) => { // cost of collapsing a-b; the position goes to best
      const oa = a * 10, ob = b * 10, q0 = Q[oa] + Q[ob], q1 = Q[oa + 1] + Q[ob + 1], q2 = Q[oa + 2] + Q[ob + 2], q3 = Q[oa + 3] + Q[ob + 3], q4 = Q[oa + 4] + Q[ob + 4], q5 = Q[oa + 5] + Q[ob + 5], q6 = Q[oa + 6] + Q[ob + 6], q7 = Q[oa + 7] + Q[ob + 7], q8 = Q[oa + 8] + Q[ob + 8], q9 = Q[oa + 9] + Q[ob + 9];
      const cost = (x, y, z) => q0 * x * x + 2 * q1 * x * y + 2 * q2 * x * z + 2 * q3 * x + q4 * y * y + 2 * q5 * y * z + 2 * q6 * y + q7 * z * z + 2 * q8 * z + q9;
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2], bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2], mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
      const el2 = (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2, det = q0 * (q4 * q7 - q5 * q5) - q1 * (q1 * q7 - q5 * q2) + q2 * (q1 * q5 - q4 * q2);
      let c = Infinity;
      if (Math.abs(det) > 1e-18) {
        const r0 = -q3, r1 = -q6, r2 = -q8, x = (r0 * (q4 * q7 - q5 * q5) - q1 * (r1 * q7 - q5 * r2) + q2 * (r1 * q5 - q4 * r2)) / det, y = (q0 * (r1 * q7 - q5 * r2) - r0 * (q1 * q7 - q5 * q2) + q2 * (q1 * r2 - r1 * q2)) / det, z = (q0 * (q4 * r2 - r1 * q5) - q1 * (q1 * r2 - r1 * q2) + r0 * (q1 * q5 - q4 * q2)) / det;
        if ((x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2 < el2 * 2.25) { c = cost(x, y, z); best[0] = x; best[1] = y; best[2] = z; }
      }
      if (c === Infinity) { const ca = cost(ax, ay, az), cb = cost(bx, by, bz), cm = cost(mx, my, mz); if (cm <= ca && cm <= cb) { c = cm; best[0] = mx; best[1] = my; best[2] = mz; } else if (ca <= cb) { c = ca; best[0] = ax; best[1] = ay; best[2] = az; } else { c = cb; best[0] = bx; best[1] = by; best[2] = bz; } }
      return Math.max(c, 0) + el2 * 1e-7; // a tiny length term: equal-cost flat regions collapse short edges first
    };
    for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const a = tri[t * 3 + k], b = tri[t * 3 + (k + 1) % 3]; if (a < b) push(plan(a, b), a, b); else { // each edge once: from the face where it runs a -> b with a < b, or the boundary
        let twin = false; for (const u of vf[a]) if (u !== t && (tri[u * 3] === b || tri[u * 3 + 1] === b || tri[u * 3 + 2] === b)) { twin = true; break; } if (!twin) push(plan(a, b), a, b); } }
    let faces = nt, epoch = 0; const e = new Int32Array(4), ring = [];
    const has = (t, v) => tri[t * 3] === v || tri[t * 3 + 1] === v || tri[t * 3 + 2] === v;
    while (faces > target && size) {
      popTo(e); const a = e[0], b = e[1]; if (gone[a] || gone[b] || e[2] !== stamp[a] || e[3] !== stamp[b]) continue;
      let fa = vf[a], fb = vf[b]; if (fa.some(t => !alive[t])) fa = vf[a] = fa.filter(t => alive[t]); if (fb.some(t => !alive[t])) fb = vf[b] = fb.filter(t => alive[t]);
      let s0 = -1, s1 = -1, ns = 0; for (const t of fa) if (has(t, b)) { if (ns === 0) s0 = t; else s1 = t; ns++; } if (ns !== 2) continue;
      // link condition: a and b share exactly the two opposite vertices
      epoch++; for (const t of fa) for (let k = 0; k < 3; k++) mark[tri[t * 3 + k]] = epoch;
      let common = 0; const seen = epoch + .5; void seen; for (const t of fb) for (let k = 0; k < 3; k++) { const v = tri[t * 3 + k]; if (v !== a && v !== b && mark[v] === epoch) { common++; mark[v] = -epoch; } } if (common !== 2) continue;
      plan(a, b); const px = best[0], py = best[1], pz = best[2]; let ok = true;
      for (const list of [fa, fb]) { for (const t of list) {
        if (t === s0 || t === s1) continue; const i0 = tri[t * 3], i1 = tri[t * 3 + 1], i2 = tri[t * 3 + 2];
        const X = i => i === a || i === b ? px : pos[i * 3], Y = i => i === a || i === b ? py : pos[i * 3 + 1], Z = i => i === a || i === b ? pz : pos[i * 3 + 2];
        const bux = pos[i1 * 3] - pos[i0 * 3], buy = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], buz = pos[i1 * 3 + 2] - pos[i0 * 3 + 2], bvx = pos[i2 * 3] - pos[i0 * 3], bvy = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], bvz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
        const nbx = buy * bvz - buz * bvy, nby = buz * bvx - bux * bvz, nbz = bux * bvy - buy * bvx;
        const ux = X(i1) - X(i0), uy = Y(i1) - Y(i0), uz = Z(i1) - Z(i0), vx = X(i2) - X(i0), vy = Y(i2) - Y(i0), vz = Z(i2) - Z(i0), wx = X(i2) - X(i1), wy = Y(i2) - Y(i1), wz = Z(i2) - Z(i1);
        const nax = uy * vz - uz * vy, nay = uz * vx - ux * vz, naz = ux * vy - uy * vx, la = Math.sqrt(nax * nax + nay * nay + naz * naz), lb = Math.sqrt(nbx * nbx + nby * nby + nbz * nbz);
        if (la < 1e-12 || nax * nbx + nay * nby + naz * nbz < .25 * la * lb) { ok = false; break; }
        const e2 = Math.max(ux * ux + uy * uy + uz * uz, vx * vx + vy * vy + vz * vz, wx * wx + wy * wy + wz * wz); if (la / e2 < .04) { ok = false; break; } // no slivers
      } if (!ok) break; }
      if (!ok) continue;
      pos[a * 3] = px; pos[a * 3 + 1] = py; pos[a * 3 + 2] = pz; for (let k = 0; k < 10; k++) Q[a * 10 + k] += Q[b * 10 + k];
      alive[s0] = 0; alive[s1] = 0; faces -= 2;
      for (const t of fb) if (alive[t]) { for (let k = 0; k < 3; k++) if (tri[t * 3 + k] === b) tri[t * 3 + k] = a; fa.push(t); }
      vf[a] = fa = fa.filter(t => alive[t]); gone[b] = 1; stamp[a]++; vf[b] = null;
      epoch++; ring.length = 0; for (const t of fa) for (let k = 0; k < 3; k++) { const v = tri[t * 3 + k]; if (v !== a && mark[v] !== epoch) { mark[v] = epoch; ring.push(v); } }
      for (const v of ring) push(plan(a, v), a, v);
    }
    vf = null;
    const map = new Int32Array(nv).fill(-1), outP = [], outT = [];
    for (let t = 0; t < nt; t++) if (alive[t]) for (let k = 0; k < 3; k++) { const v = tri[t * 3 + k]; if (map[v] < 0) { map[v] = outP.length / 3; outP.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } outT.push(map[v]); }
    return { pos: Float64Array.from(outP), tri: Int32Array.from(outT) };
  }
  function components(tri, nv) { // number of connected pieces (QA)
    const p = Int32Array.from({ length: nv }, (_, i) => i), f = i => { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; };
    for (let t = 0; t < tri.length; t += 3) { const a = f(tri[t]), b = f(tri[t + 1]), c = f(tri[t + 2]); p[b] = a; p[f(c)] = a; }
    const roots = new Set(); for (let t = 0; t < tri.length; t++) roots.add(f(tri[t])); return roots.size;
  }

  /* ---------------------------------------------------------------- colour */
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  function noise(x, y, z) { // value noise
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const c = (a, b, d) => hash(ix + a, iy + b, iz + d);
    return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v), lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
  }
  function cells(x, y, z, s) { // Voronoi: distance to the nearest and second nearest cell point (scales)
    const X = x / s, Y = y / s, Z = z / s, ix = Math.floor(X), iy = Math.floor(Y), iz = Math.floor(Z); let d1 = 9, d2 = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const px = ix + a + hash(ix + a, iy + b, iz + c), py = iy + b + hash(iy + b, iz + c, ix + a), pz = iz + c + hash(iz + c, ix + a, iy + b), d = Math.hypot(px - X, py - Y, pz - Z); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return d2 - d1;
  }
  /** Per vertex: col = [r, g, b, w] the palm-side colour (linear) and how much of it shows (the rest is the coat), streak = the coat's
   *  brightness pattern [r, g, b] (multiplied by the character's coat colour later), gloss 0..1. */
  function paint(A, F, pos, nor) {
    const L = A.L, n = pos.length / 3, col = new Float32Array(n * 4), gloss = new Float32Array(n), streakA = new Float32Array(n * 3), palmC = lin(L.palm), padC = lin(L.pad), padH = lin(L.padHi), hoof = L.claw === 'hoof' ? lin(L.claw0) : null;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], N = [nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]], pr = F.parts(x, y, z);
      // which bone the point belongs to: its palm direction
      let best = pr.base, pn = [0, 0, 1], ci = -1, si = -1;
      pr.chains.forEach((c, k) => c.forEach((d, s) => { if (d < best - .002) { best = d; pn = A.chains[k].nor[s]; ci = k; si = s; } }));
      const fringe = noise(x * 1400, y * 420, z * 1400) - .5, side = dot(N, pn) + .26 * fringe, wristFur = smooth((-y - .012 + .02 * fringe) / .05);
      let palmar = smooth((side - (ci >= 0 ? .32 : .12)) / .3) * wristFur * (ci >= 0 ? .6 : 1), pad = 0; // fingers: only their true underside is palm-coloured
      pr.pads.forEach((d, k) => { pad = Math.max(pad, (1 - smooth((d + .0003) / .0016)) * A.pads[k].tone); });
      pad *= smooth((side + .25) / .5); // only where it faces the palm
      // fur: streaks along the fingers on the back, a fringe where it meets the palm
      const streak = 1 + (L.streak || 0) * (noise(x * 900, y * 160, z * 900) - .5) * 2 + .04 * (noise(x * 90, y * 90, z * 90) - .5);
      const coat = [streak, streak, streak]; // multiplied by the coat colour later
      let c = [palmC.r, palmC.g, palmC.b];
      if (L.palmFur) { const fz = 1 + .1 * (noise(x * 700, y * 150, z * 700) - .5); c = c.map(v => v * fz); }
      if (ci >= 0) c = c.map((v, j) => lerp(v, [padC.r, padC.g, padC.b][j], .18 * (L.padK ? .5 : 1))); // the underside of the fingers: a shade darker than the palm
      const pc = [lerp(padC.r, padH.r, .35 * smooth(side) * (.6 + .4 * noise(x * 400, y * 400, z * 400))), lerp(padC.g, padH.g, .35 * smooth(side)), lerp(padC.b, padH.b, .35 * smooth(side))];
      c = c.map((v, j) => lerp(v, pc[j], pad));
      if (hoof && ci >= 0 && si === 2) { // doe: hard dark fingertips
        const J = A.chains[ci].J, tt = clamp(dot(sub([x, y, z], J[2]), A.chains[ci].dir[2]) / len(sub(J[3], J[2]))), cap = smooth((tt - .42) / .12);
        if (cap > 0) { c = c.map((v, j) => lerp(v, [hoof.r, hoof.g, hoof.b][j] * (1 + .25 * smooth(-side)), cap)); palmar = Math.max(palmar, cap); gloss[i] = Math.max(gloss[i], .7 * cap); }
      }
      if (L.scales) { // crocodile: scales on the back, pebbled palm, dark seams
        const big = cells(x, y, z, palmar > .5 ? .0045 : .0075), seam = 1 - smooth(big / .25);
        const fz = .85 + .3 * noise(x * 120, y * 120, z * 120); coat[0] *= fz * (1 - .45 * seam); coat[1] *= fz * (1 - .45 * seam); coat[2] *= fz * (1 - .45 * seam); c = c.map(v => v * (1 - .3 * seam)); gloss[i] = .35;
      }
      col[i * 4] = c[0]; col[i * 4 + 1] = c[1]; col[i * 4 + 2] = c[2]; col[i * 4 + 3] = Math.max(palmar, pad);
      streakA[i * 3] = coat[0]; streakA[i * 3 + 1] = coat[1]; streakA[i * 3 + 2] = coat[2];
      gloss[i] = Math.max(gloss[i], pad * .55);
    }
    return { col, gloss, streak: streakA };
  }
  /** Ambient occlusion from the field: how much the surface around each vertex is closed in (creases, under the curled fingers). */
  function occlusion(field, pos, nor) {
    const n = pos.length / 3, ao = new Float32Array(n), steps = [.003, .0065, .012, .02, .032], w = [.5, .3, .2, .14, .1];
    for (let i = 0; i < n; i++) {
      let o = 0; for (let s = 0; s < steps.length; s++) { const d = steps[s], f = field(pos[i * 3] + nor[i * 3] * d, pos[i * 3 + 1] + nor[i * 3 + 1] * d, pos[i * 3 + 2] + nor[i * 3 + 2] * d); o += w[s] * Math.max(0, (d - f) / d); }
      ao[i] = clamp(1 - o * .85, .25, 1);
    }
    return ao;
  }

  /* ---------------------------------------------------------------- claws (curved keratin cones, same mesh) */
  function clawMesh(c, out) {
    const seg = 6, ring = 8, base = out.pos.length / 3, L = c.len, k = c.curl;
    // the claw's spine: a parabola from the root along dir, bending toward the palm (nor) by `curl` radians at the tip
    const at = u => add(add(c.root, c.dir, L * u), c.nor, L * k * u * u * .5), tan = u => nrm(add(c.dir, c.nor, k * u));
    for (let s = 0; s <= seg; s++) {
      const u = s / seg, t = tan(u), up = nrm(add(scl(c.nor, -1), t, dot(c.nor, t))), centre = at(u); // up: the claw's back (away from the palm)
      const visible = clamp((u * L - c.hide) / Math.max(1e-4, L - c.hide)), taper = 1 - .94 * Math.pow(visible, 1.15), w = c.w * taper, h = c.h * taper;
      for (let q = 0; q < ring; q++) {
        const a = q / ring * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), hh = sa > 0 ? h : h * .7; // a fuller back, a flatter underside
        out.pos.push(...add(add(centre, c.lat, ca * w), up, sa * hh)); out.nor.push(...nrm(add(scl(c.lat, ca / w), up, sa / hh))); out.claw.push(visible);
      }
    }
    const tipI = out.pos.length / 3; out.pos.push(...add(at(1), tan(1), c.h * .15)); out.nor.push(...tan(1)); out.claw.push(1);
    for (let s = 0; s < seg; s++) for (let q = 0; q < ring; q++) { const a = base + s * ring + q, b = base + s * ring + (q + 1) % ring, d = a + ring, e = b + ring; out.tri.push(a, b, d, b, e, d); }
    for (let q = 0; q < ring; q++) out.tri.push(base + seg * ring + q, base + seg * ring + (q + 1) % ring, tipI);
  }

  /* ---------------------------------------------------------------- hand wraps over the paw (docks) */
  const wrapTurn = (x, y, z, S) => { const ang = Math.atan2(z, x), turn = y / (.019 * S) + ang / (Math.PI * 2) * .85 + (y < -.04 * S ? .3 * Math.sin(ang * 2) : 0); return turn - Math.floor(turn); }; // where a point is across its turn of cloth (0 lower edge .. 1 upper edge)
  function wrapField(A, F) {
    const S = A.S, t = .0036, sleeve = cone([0, .066, 0], [0, -.004, 0], .0612, .0552), thumb = A.chains[4]; // the turns on the forearm sit just outside it (radius ~0.05-0.057 m)
    const core = (x, y, z) => { let d = smin(F.base(x, y, z), coneD(thumb.segs[0], x, y, z) + .001, .012); for (const p of A.pads) if (p.palm) d = smin(d, ellD(p.p, x, y, z), .014); return d; }; // the cloth bridges the pads (a soft swell, no lobes) and covers the root of the thumb
    const yLo = -.121 * S;
    return (x, y, z) => {
      let d = Math.min(core(x, y, z) - t, coneD(sleeve, x, y, z));
      const fr = wrapTurn(x, y, z, S); d -= .0016 * (smooth(fr / .8) - smooth((fr - .9) / .1)); // each turn lies on the one below: thicker toward its upper edge, a step down to the next turn
      d = smax(d, yLo - y + .004 * Math.max(0, -z) / .02, .006); d = smax(d, y - .06, .002); // the knuckle line (lower on the back over the knuckles), the top turn on the forearm
      const th = Math.min(coneD(thumb.segs[1], x, y, z), coneD(thumb.segs[2], x, y, z)) - .0028; d = smax(d, -th, .004); // the thumb comes out free
      for (let i = 0; i < 4; i++) { const c = A.chains[i], fd = Math.min(coneD(c.segs[0], x, y, z) - .002, coneD(c.segs[1], x, y, z)); d = smax(d, -smax(fd, smin(0, -(dot(sub([x, y, z], c.J[0]), c.dir[0]) - c.r * .45), 0), .003), .005); } // fingers free past the knuckle
      return d;
    };
  }

  /* ---------------------------------------------------------------- build (cached per species, shape, side, wraps) */
  const H = .0034;
  /** Keeps the largest connected piece (a closed pocket inside a fist would otherwise leave a hidden inner shell). */
  function largest(s) {
    const nv = s.pos.length / 3, p = Int32Array.from({ length: nv }, (_, i) => i), f = i => { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; };
    for (let t = 0; t < s.tri.length; t += 3) { const a = f(s.tri[t]), b = f(s.tri[t + 1]); p[b] = a; p[f(s.tri[t + 2])] = a; }
    const count = new Map(); for (let t = 0; t < s.tri.length; t += 3) { const r = f(s.tri[t]); count.set(r, (count.get(r) || 0) + 1); }
    let best = -1, n = 0; for (const [r, c] of count) if (c > n) { n = c; best = r; }
    if (count.size < 2) return { ...s, dropped: 0 };
    const keep = []; for (let t = 0; t < s.tri.length; t += 3) if (f(s.tri[t]) === best) keep.push(s.tri[t], s.tri[t + 1], s.tri[t + 2]);
    return { pos: s.pos, tri: Int32Array.from(keep), dropped: s.tri.length / 3 - n };
  }
  function surface(field, lo, hi, target, h = H) { const s = largest(surfaceNets(field, lo, hi, h)); const r = s.tri.length / 3 > target ? decimate(s.pos, s.tri, target) : s; project(field, r.pos, 2, .0015); r.dropped = s.dropped; r.netTris = s.tri.length / 3 + s.dropped; return r; }
  function normalsOf(field, pos) { const n = new Float32Array(pos.length); for (let i = 0; i < pos.length; i += 3) { const g = grad(field, pos[i], pos[i + 1], pos[i + 2]); n[i] = g[0]; n[i + 1] = g[1]; n[i + 2] = g[2]; } return n; }
  const BUDGET = 5600, WRAP_SKIN = 3950, WRAP_CLOTH = 1500, LOD_SKIN = 900, LOD_CLOTH = 300;
  /** Flat arrays of one paw: skin, claws (optional), cloth. Colour recipe per vertex: base (palm side, AO in), coatW (how much is
   *  base), streak (x coat), gloss. skin: { pos, tri, nor, ao, pt (paint()) }; wrap: { pos, tri, nor, ao } or null. */
  function pack(A, skin, claws, wrap) {
    const pos = [], nrmA = [], base = [], coatW = [], streak = [], gl = [], idx = [], nSkin = skin.pos.length / 3, pt = skin.pt, nor = skin.nor, ao = skin.ao;
    for (let i = 0; i < nSkin; i++) {
      pos.push(skin.pos[i * 3], skin.pos[i * 3 + 1], skin.pos[i * 3 + 2]); nrmA.push(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]);
      const a = .42 + .58 * ao[i]; base.push(pt.col[i * 4] * a, pt.col[i * 4 + 1] * a, pt.col[i * 4 + 2] * a); coatW.push(pt.col[i * 4 + 3]); streak.push(pt.streak[i * 3] * a, pt.streak[i * 3 + 1] * a, pt.streak[i * 3 + 2] * a); gl.push(pt.gloss[i]);
    }
    for (const v of skin.tri) idx.push(v);
    const cl = { pos: [], nor: [], tri: [], claw: [] }; if (claws) for (const c of A.claws) clawMesh(c, cl);
    const c0 = typeof A.L.claw0 === 'string' ? lin(A.L.claw0) : null, c1 = c0 ? lin(A.L.claw1) : null, off = pos.length / 3;
    for (let i = 0; i < cl.pos.length / 3; i++) { pos.push(cl.pos[i * 3], cl.pos[i * 3 + 1], cl.pos[i * 3 + 2]); nrmA.push(cl.nor[i * 3], cl.nor[i * 3 + 1], cl.nor[i * 3 + 2]); const u = smooth(cl.claw[i] * 1.15); base.push(lerp(c0.r, c1.r, u), lerp(c0.g, c1.g, u), lerp(c0.b, c1.b, u)); coatW.push(1); streak.push(0, 0, 0); gl.push(.85); }
    for (const v of cl.tri) idx.push(v + off);
    if (wrap) { // cotton wraps: turns that climb round the wrist, an X over the back of the hand, a shadow line at each turn's edge
      const o2 = pos.length / 3, cloth = lin('#e2dccf'), shade = lin('#9a917f');
      for (let i = 0; i < wrap.pos.length / 3; i++) {
        const x = wrap.pos[i * 3], y = wrap.pos[i * 3 + 1], z = wrap.pos[i * 3 + 2], fr = wrapTurn(x, y, z, A.S);
        const edge = (1 - smooth(fr / .32)) * .85 + .15 * Math.exp(-(((fr - .97) / .05) ** 2)); // each turn darker at its lower edge (it lies on the one below), a light rim at its upper edge
        const xb = z < 0 && y < -.025 * A.S && y > -.11 * A.S ? Math.max(Math.exp(-(((x - (y + .07 * A.S) * .9) / .007) ** 2)), Math.exp(-(((x + (y + .07 * A.S) * .9) / .007) ** 2))) : 0; // the X over the back of the hand
        const k = clamp(.5 * edge + .35 * xb + .1 * (noise(x * 700, y * 700, z * 700) - .5)), a = .5 + .5 * wrap.ao[i];
        pos.push(x, y, z); nrmA.push(wrap.nor[i * 3], wrap.nor[i * 3 + 1], wrap.nor[i * 3 + 2]); base.push(lerp(cloth.r, shade.r, k) * a, lerp(cloth.g, shade.g, k) * a, lerp(cloth.b, shade.b, k) * a); coatW.push(1); streak.push(0, 0, 0); gl.push(0);
      }
      for (const v of wrap.tri) idx.push(v + o2);
    }
    return { pos: Float32Array.from(pos), nor: Float32Array.from(nrmA), base: Float32Array.from(base), coatW: Float32Array.from(coatW), streak: Float32Array.from(streak), gloss: Float32Array.from(gl), idx: Uint32Array.from(idx), nSkin, claws: cl.tri.length / 3 };
  }
  /** The left paw at full detail, with its low-detail version in `lod` (~900 skin triangles, no claws; for distant characters). */
  function buildLeft(species, shapeName, wraps) {
    const t0 = now(), A = anatomy(species, shapeName), F = fieldOf(A), clawTris = A.claws.length * 104;
    const paw = surface(F.field, F.lo, F.hi, (wraps ? WRAP_SKIN : BUDGET) - clawTris), skinPieces = components(paw.tri, paw.pos.length / 3);
    const nor = normalsOf(F.field, paw.pos), ao = occlusion(F.field, paw.pos, nor), pt = paint(A, F, paw.pos, nor);
    let wrap = null, W = null;
    if (wraps) { // drop the skin under the cloth, add the cloth
      W = wrapField(A, F); const keep = [];
      for (let i = 0; i < paw.pos.length / 3; i++) { const w = W(paw.pos[i * 3], paw.pos[i * 3 + 1], paw.pos[i * 3 + 2]); if (w < .0012) { const k = .0024 * smooth((.0012 - w) / .0015); paw.pos[i * 3] -= nor[i * 3] * k; paw.pos[i * 3 + 1] -= nor[i * 3 + 1] * k; paw.pos[i * 3 + 2] -= nor[i * 3 + 2] * k; } } // the skin at the cloth edge tucks under it (no fur poking through the cotton)
      for (let t = 0; t < paw.tri.length; t += 3) { const v = [paw.tri[t], paw.tri[t + 1], paw.tri[t + 2]]; if (v.every(i => W(paw.pos[i * 3], paw.pos[i * 3 + 1], paw.pos[i * 3 + 2]) < -.0012)) continue; keep.push(...v); }
      paw.tri = Int32Array.from(keep);
      wrap = surface(W, [F.lo[0] - .012, -.135 * A.S, F.lo[2] - .012], [F.hi[0] + .012, .075, F.hi[2] + .012], WRAP_CLOTH); wrap.nor = normalsOf(W, wrap.pos); wrap.ao = occlusion(W, wrap.pos, wrap.nor);
    }
    const full = pack(A, { pos: paw.pos, tri: paw.tri, nor, ao, pt }, true, wrap);
    full.stats = { triangles: full.idx.length / 3, skin: paw.tri.length / 3, claws: full.claws, wraps: wrap ? wrap.tri.length / 3 : 0, skinPieces, dropped: paw.dropped, netTris: paw.netTris, ms: 0 };
    // low detail: the same surface collapsed further (it keeps its outline), shaded again from the field
    const ls = decimate(Float64Array.from(paw.pos), Int32Array.from(paw.tri), Math.round(LOD_SKIN * (wraps ? WRAP_SKIN / BUDGET : 1))), ln = normalsOf(F.field, ls.pos);
    let lw = null; if (wrap) { lw = decimate(Float64Array.from(wrap.pos), Int32Array.from(wrap.tri), LOD_CLOTH); lw.nor = normalsOf(W, lw.pos); lw.ao = occlusion(W, lw.pos, lw.nor); }
    full.lod = pack(A, { pos: ls.pos, tri: ls.tri, nor: ln, ao: occlusion(F.field, ls.pos, ln), pt: paint(A, F, ls.pos, ln) }, false, lw);
    full.lod.stats = { triangles: full.lod.idx.length / 3, lod: true };
    full.stats.ms = Math.round(now() - t0);
    return full;
  }
  const BUFS = d => [d.pos.buffer, d.nor.buffer, d.base.buffer, d.coatW.buffer, d.streak.buffer, d.gloss.buffer, d.idx.buffer, ...(d.lod ? BUFS(d.lod) : [])];

  /* ---------------------------------------------------------------- in a worker: build on request, hand the arrays back */
  if (WORKER) { G.onmessage = e => { const q = e.data || {}; try { const d = buildLeft(q.species, q.shape, q.wraps); G.postMessage({ key: q.key, d }, BUFS(d)); } catch (x) { G.postMessage({ key: q.key, error: String(x && x.message || x) }); } }; return; }

  /* ---------------------------------------------------------------- quick stand-in (on the page, a few ms)
   * Until the worker has delivered a shape, the paw shows this: the same anatomy (palm, knuckles, finger chains, thumb, pads,
   * claws) as low-poly capsules and ellipsoids with the same colour recipe (coat on the back, palm and pads underneath). It is only
   * a stand-in for a few seconds; the real surface replaces it as soon as it is ready. No field is evaluated here. */
  function quickLeft(species, shapeName, wraps) {
    const t0 = now(), A = anatomy(species, shapeName), L = A.L, S = A.S, palmC = lin(L.palm), padC = lin(L.pad);
    const pos = [], nor = [], base = [], coatW = [], streak = [], gl = [], idx = [];
    // w: 0 coat .. 1 palm colour; pn: the palm direction of this part
    const vert = (p, n, pn, c, padTone) => {
      pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]);
      const fur = smooth((-p[1] - .012) / .05), w = padTone ? 1 : smooth((dot(n, pn) - .2) / .35) * fur;
      const col = padTone ? padC : c || palmC; base.push(col.r, col.g, col.b); coatW.push(w); streak.push(1, 1, 1); gl.push(padTone ? .5 * padTone : 0);
    };
    const RING = 8;
    const capsule = (a, b, r1, r2, pn) => { // a round-ended tapered tube: rings on the two end spheres
      const u = nrm(sub(b, a)), v = nrm(Math.abs(u[0]) < .9 ? cross(u, [1, 0, 0]) : cross(u, [0, 1, 0])), w = cross(u, v), o = pos.length / 3, rows = [];
      for (const [phi, c, r] of [[-1.2, a, r1], [-.6, a, r1], [0, a, r1], [0, b, r2], [.6, b, r2], [1.2, b, r2]]) rows.push([phi, c, r]);
      for (const [phi, c, r] of rows) for (let q = 0; q < RING; q++) { const t = q / RING * Math.PI * 2, n = add(add(scl(u, Math.sin(phi)), v, Math.cos(phi) * Math.cos(t)), w, Math.cos(phi) * Math.sin(t)); vert(add(c, n, r), n, pn); }
      const tipA = pos.length / 3; vert(add(a, u, -r1), scl(u, -1), pn); const tipB = pos.length / 3; vert(add(b, u, r2), u, pn);
      for (let k = 0; k < rows.length - 1; k++) for (let q = 0; q < RING; q++) { const p0 = o + k * RING + q, p1 = o + k * RING + (q + 1) % RING; idx.push(p0, p1, p0 + RING, p1, p1 + RING, p0 + RING); }
      for (let q = 0; q < RING; q++) { idx.push(tipA, o + (q + 1) % RING, o + q); const l = o + (rows.length - 1) * RING; idx.push(tipB, l + q, l + (q + 1) % RING); }
    };
    const ellipsoid = (e, pn, padTone) => { // e: an ell() of the anatomy (centre, radii, frame rows)
      const m = e.m, X = [m[0], m[1], m[2]], Y = [m[3], m[4], m[5]], Z = [m[6], m[7], m[8]], c = [e.cx, e.cy, e.cz], o = pos.length / 3, LAT = 5;
      for (let i = 0; i <= LAT; i++) { const th = i / LAT * Math.PI; for (let q = 0; q < RING; q++) { const ph = q / RING * Math.PI * 2, l = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        const p = add(add(add(c, X, l[0] * e.rx), Y, l[1] * e.ry), Z, l[2] * e.rz), n = nrm(add(add(scl(X, l[0] / e.rx), Y, l[1] / e.ry), Z, l[2] / e.rz)); vert(p, n, pn, null, padTone); } }
      for (let i = 0; i < LAT; i++) for (let q = 0; q < RING; q++) { const p0 = o + i * RING + q, p1 = o + i * RING + (q + 1) % RING; idx.push(p0, p1, p0 + RING, p1, p1 + RING, p0 + RING); } // outward winding
    };
    const cone2 = q => [[q.ax, q.ay, q.az], [q.ax + q.bax, q.ay + q.bay, q.az + q.baz]], Zp = [0, 0, 1];
    { const [a, b] = cone2(A.base.wrist); capsule(a, b, A.base.wrist.r1, A.base.wrist.r2, Zp); }
    for (const [q] of A.base.list) if (q.k === 0) { const [a, b] = cone2(q); capsule(a, b, q.r1, q.r2, Zp); } else if (q.k === 1) ellipsoid(q, Zp);
    for (const [q] of A.base.tops) ellipsoid(q, Zp);
    for (const c of A.chains) c.segs.forEach((s, i) => { const [a, b] = cone2(s); capsule(a, b, s.r1, s.r2, c.nor[i]); });
    for (const p of A.pads) { const e = p.p, inflate = { ...e, rx: e.rx * 1.08, ry: e.ry * 1.08, rz: e.rz * 1.25 }; ellipsoid(inflate, Zp, p.tone); }
    const nSkin = pos.length / 3, cl = { pos: [], nor: [], tri: [], claw: [] }; for (const c of A.claws) clawMesh(c, cl);
    const c0 = typeof L.claw0 === 'string' ? lin(L.claw0) : null, c1 = c0 ? lin(L.claw1) : null, off = pos.length / 3;
    for (let i = 0; i < cl.pos.length / 3; i++) { pos.push(cl.pos[i * 3], cl.pos[i * 3 + 1], cl.pos[i * 3 + 2]); nor.push(cl.nor[i * 3], cl.nor[i * 3 + 1], cl.nor[i * 3 + 2]); const u = smooth(cl.claw[i] * 1.15); base.push(lerp(c0.r, c1.r, u), lerp(c0.g, c1.g, u), lerp(c0.b, c1.b, u)); coatW.push(1); streak.push(0, 0, 0); gl.push(.85); }
    for (const v of cl.tri) idx.push(v + off);
    if (wraps) { // the cloth: a sleeve on the wrist and a flattened shell over the palm and knuckles
      const cloth = lin('#d9d2c4'), o = pos.length / 3, n0 = pos.length / 3; void o; void n0;
      const before = pos.length / 3; capsule([0, .066, 0], [0, -.004, 0], .0612, .0552, Zp); ellipsoid({ cx: .002 * S, cy: -.052 * S, cz: .004, rx: .061 * S, ry: .072 * S, rz: .037 * S, m: [1, 0, 0, 0, 1, 0, 0, 0, 1] }, Zp);
      for (let i = before; i < pos.length / 3; i++) { base[i * 3] = cloth.r; base[i * 3 + 1] = cloth.g; base[i * 3 + 2] = cloth.b; coatW[i] = 1; streak[i * 3] = streak[i * 3 + 1] = streak[i * 3 + 2] = 0; gl[i] = 0; }
    }
    const d = { pos: Float32Array.from(pos), nor: Float32Array.from(nor), base: Float32Array.from(base), coatW: Float32Array.from(coatW), streak: Float32Array.from(streak), gloss: Float32Array.from(gl), idx: Uint32Array.from(idx), nSkin };
    d.stats = { triangles: idx.length / 3, quick: true, ms: +(now() - t0).toFixed(2) }; return d;
  }

  /* ---------------------------------------------------------------- on the page: a cache filled by background workers
   * Shapes are built in Web Workers (the same file), in priority order: 0 a shape wanted on screen now, 1 a character just made
   * or a scene about to start (Paws.prefetch), 2 the rest of a character's shapes, 3 the warm-up after page load. Until a shape is
   * ready the paw shows the nearest ready shape of its species, or the quick stand-in: a film or a fight never waits for a field
   * (0.3-0.9 s per shape on a desktop, several seconds on a phone). Without Worker support (node tests) shapes are built right
   * here on demand, as before; if the worker fails to start in a browser, shapes are built here one at a time between frames. */
  const CACHE = new Map(), QUICK = new Map(), QUEUE = new Map(), PENDING = new Set(), FAILED = new Set(), keyOf = (species, shape, wraps) => species + '|' + shape + '|' + (wraps ? 'w' : 'b');
  const SYNC = !SRC || typeof Worker === 'undefined', debug = { worker: 0, workerMs: 0, page: [], quick: 0, quickMs: 0, lod: 0, full: 0 }; // page: shapes built on the page [key, ms]; quick/lod/full: geometry swaps
  const MAXW = Math.max(1, Math.min(2, ((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2) - 2));
  let workers = [], workerDead = SYNC, seq = 0, idleT = null;
  function spawn() {
    let w = null;
    try { w = new Worker(SRC); } catch (x) { return null; }
    w.job = null;
    w.onmessage = e => { const { key, d } = e.data || {}; w.job = null; PENDING.delete(key); if (d) { if (!CACHE.has(key + '|L')) CACHE.set(key + '|L', d); debug.worker++; debug.workerMs += d.stats?.ms || 0; } else FAILED.add(key); pump(); };
    w.onerror = ev => { ev?.preventDefault?.(); die(); }; // e.g. offline without the file: build here between frames
    return w;
  }
  function die() {
    workerDead = true;
    for (const w of workers) { if (w.job) { PENDING.delete(w.job.key); QUEUE.set(w.job.key, w.job); } try { w.terminate(); } catch (x) { /* gone */ } }
    workers = []; PENDING.clear(); pump();
  }
  const next = () => { let best = null; for (const j of QUEUE.values()) if (!best || j.prio < best.prio || (j.prio === best.prio && j.seq < best.seq)) best = j; if (best) QUEUE.delete(best.key); return best; };
  function pump() {
    if (SYNC) return;
    if (workerDead) { // one shape at a time on the page, between frames
      if (idleT || !QUEUE.size) return;
      idleT = setTimeout(() => { idleT = null; const j = next(); if (j && !CACHE.has(j.key + '|L')) { const t0 = now(); try { CACHE.set(j.key + '|L', buildLeft(j.species, j.shape, j.wraps)); } catch (x) { FAILED.add(j.key); } debug.page.push([j.key, Math.round(now() - t0)]); } pump(); }, 120);
      return;
    }
    while (QUEUE.size) {
      let w = workers.find(x => !x.job);
      if (!w) { if (workers.length >= MAXW) return; w = spawn(); if (!w) { die(); return; } workers.push(w); }
      const j = next(); PENDING.add(j.key); w.job = j; w.postMessage({ key: j.key, species: j.species, shape: j.shape, wraps: j.wraps });
    }
  }
  const norm = (species, shape) => [LOOK[species] ? species : 'lion', SHAPES[shape] ? shape : 'fist'];
  const isReady = (species, shape, wraps) => CACHE.has(keyOf(...norm(species, shape), wraps) + '|L');
  /** Asks for a shape in the background (prio: 0 now .. 3 warm-up; a later ask with a lower number moves it up the queue).
   *  Returns true while it is on its way, false when it is ready, failed or there is no worker (node: built on demand). */
  function request(species, shape, wraps, prio = 2) {
    [species, shape] = norm(species, shape); const key = keyOf(species, shape, wraps);
    if (CACHE.has(key + '|L') || FAILED.has(key) || SYNC) return false;
    if (PENDING.has(key)) return true;
    const j = QUEUE.get(key); if (j) j.prio = Math.min(j.prio, prio); else QUEUE.set(key, { key, species, shape, wraps: !!wraps, prio, seq: seq++ });
    pump(); return true;
  }
  /** Asks for the paws of the characters a coming scene needs, ahead of the warm-up. who: character ids (bruno, fang, hazel,
   *  otto, rourke), species names, or { who, wraps }. o.shapes (default all, relaxed first), o.prio (default 1). */
  function prefetch(who, o = {}) {
    for (const w of [].concat(who || [])) {
      const id = typeof w === 'string' ? w : w?.who, sp = CHAR[id] || (LOOK[id] ? id : null); if (!sp) continue;
      const wraps = !!(w?.wraps || id === 'rourke'); for (const sh of o.shapes || ORDER) request(sp, sh, wraps, o.prio ?? 1);
    }
  }
  function mirror(L) { // the right hand: x mirrored, winding flipped
    const pos = L.pos.slice(), nor = L.nor.slice(), idx = L.idx.slice();
    for (let i = 0; i < pos.length; i += 3) { pos[i] = -pos[i]; nor[i] = -nor[i]; }
    for (let t = 0; t < idx.length; t += 3) { const v = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = v; }
    return { ...L, pos, nor, idx, lod: L.lod ? mirror(L.lod) : undefined };
  }
  /** The shared data of one paw (built here now if neither the cache nor the worker has it: node tests and QA; the game's paws
   *  never call this for a shape that is not ready). */
  function build(species, shape, side, o = {}) {
    [species, shape] = norm(species, shape); const wraps = !!o.wraps, key = keyOf(species, shape, wraps);
    let L = CACHE.get(key + '|L'); if (!L) { const t0 = now(); L = buildLeft(species, shape, wraps); CACHE.set(key + '|L', L); if (!SYNC) debug.page.push([key, Math.round(now() - t0)]); }
    if (side !== 'R') return L;
    let R = CACHE.get(key + '|R'); if (!R) { R = mirror(L); CACHE.set(key + '|R', R); } return R;
  }
  /** The quick stand-in of a shape (made here, a few ms). */
  function quick(species, shape, side, o = {}) {
    [species, shape] = norm(species, shape); const key = keyOf(species, shape, o.wraps);
    let L = QUICK.get(key + '|L'); if (!L) { L = quickLeft(species, shape, !!o.wraps); QUICK.set(key + '|L', L); debug.quickMs += L.stats.ms; }
    if (side !== 'R') return L;
    let R = QUICK.get(key + '|R'); if (!R) { R = mirror(L); QUICK.set(key + '|R', R); } return R;
  }
  const geoCache = new Map();
  /** A BufferGeometry for one paw in one coat: position/normal/index/uv/gloss shared across coats, colour per coat.
   *  o: { wraps, detail: 'full' (default) | 'lod' (distant) | 'quick' (the stand-in) }. */
  function geometry(species, shape, side, coat, o = {}) {
    [species, shape] = norm(species, shape);
    const detail = o.detail === 'quick' || o.detail === 'lod' ? o.detail : 'full', key = species + '|' + shape + '|' + side + '|' + (o.wraps ? 'w' : 'b') + (detail === 'full' ? '' : '|' + detail), coatKey = key + '|' + coat.getHexString();
    let g = geoCache.get(coatKey); if (g) return g;
    let d = detail === 'quick' ? quick(species, shape, side, o) : build(species, shape, side, o); if (detail === 'lod') d = d.lod || d;
    let shared = geoCache.get(key);
    if (!shared) {
      const uv = new Float32Array(d.pos.length / 3 * 2); for (let i = 0; i < d.pos.length / 3; i++) { uv[i * 2] = (d.pos[i * 3] + d.pos[i * 3 + 2] * .8) * 2; uv[i * 2 + 1] = d.pos[i * 3 + 1] * 2; }
      shared = { position: new T.BufferAttribute(d.pos, 3), normal: new T.BufferAttribute(d.nor, 3), uv: new T.BufferAttribute(uv, 2), gloss: new T.BufferAttribute(d.gloss, 1), index: new T.BufferAttribute(d.idx, 1) }; geoCache.set(key, shared);
    }
    const n = d.pos.length / 3, col = new Float32Array(n * 3), cc = [coat.r, coat.g, coat.b];
    for (let i = 0; i < n; i++) { const w = d.coatW[i]; for (let k = 0; k < 3; k++) col[i * 3 + k] = lerp(d.streak[i * 3 + k] * cc[k], d.base[i * 3 + k], w); }
    g = new T.BufferGeometry(); g.setIndex(shared.index); g.setAttribute('position', shared.position); g.setAttribute('normal', shared.normal); g.setAttribute('uv', shared.uv); g.setAttribute('pawGloss', shared.gloss); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeBoundingSphere(); g.boundingSphere.radius += .01; g.userData.paw = { species, shape, side, wraps: !!o.wraps, detail, stats: d.stats };
    geoCache.set(coatKey, g); return g;
  }

  /* ---------------------------------------------------------------- material: matte fur, satin pads, glossy claws */
  let MAT = null;
  function material(rig) {
    if (MAT) return MAT;
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0, bumpMap: rig?.skin?.material?.bumpMap || null, bumpScale: .0028 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float pawGloss;varying float vPawGloss;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPawGloss=pawGloss;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vPawGloss;')
        .replace('#include <bumpmap_pars_fragment>', T.ShaderChunk.bumpmap_pars_fragment.replace(/bumpScale \*/g, '(bumpScale*(1.0-vPawGloss)) *'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.3,clamp(vPawGloss,0.0,1.0));');
    };
    m.customProgramCacheKey = () => 'paws-v2';
    m.name = 'Paw'; MAT = m; return m;
  }

  /* ---------------------------------------------------------------- on the rig */
  const color = hex => new T.Color(hex).convertSRGBToLinear();
  /** The coat at the wrist: the mean colour of the forearm skin next to the hand (rest pose), so the paw joins it without a seam. */
  function coatOf(rig, fallback) {
    const g = rig?.skin?.geometry, P = g?.attributes.position, C = rig?.storyCast?.base?.color || g?.attributes.color;
    if (P && C) { let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < P.count; i++) { const x = Math.abs(P.getX(i)); if (x < .945 || x > .99 || P.getY(i) < 1.5 || P.getY(i) > 1.75) continue; r += C.getX(i); gg += C.getY(i); b += C.getZ(i); n++; } if (n > 20) return new T.Color(r / n, gg / n, b / n); }
    return color(fallback || '#b98143');
  }
  const SWITCH = { relaxed: 0, open: 0, point: 1, grip: 1, fist: 2 }, ORDER = ['relaxed', 'grip', 'fist', 'open', 'point'];
  /** Which shape the paw should show this frame. */
  function wanted(rig, side) {
    const o = rig.pawOverride?.[side]; if (o) return SHAPES[o] ? o : 'fist';
    const h = rig.pawHold?.[side]; if (h && h.visible && h.parent) return 'grip'; // something held by its handle (Hazel's handbag, Fang's jacket)
    const p = rig.pawPose; return p && p.time === rig.renderTime && SHAPES[p[side]] ? p[side] : 'fist';
  }
  // Detail by size on screen: a paw under 3 % of the view height (~20 px on a phone) draws the low-detail paw, back to full above 4 %.
  const LOD_IN = .03, LOD_OUT = .04, PAW_SIZE = .2, _a = new T.Vector3(), _b = new T.Vector3();
  function farFrom(m, cam, was) {
    if (!cam?.isPerspectiveCamera) return false;
    _a.setFromMatrixPosition(m.matrixWorld); _b.setFromMatrixPosition(cam.matrixWorld);
    const view = 2 * _a.distanceTo(_b) * Math.tan(cam.fov * Math.PI / 360) / (cam.zoom || 1), frac = PAW_SIZE / Math.max(view, 1e-6);
    return was ? frac < LOD_OUT : frac < LOD_IN;
  }
  /** Big bare paws on both hand joints. Returns [L, R]. o: { species, fur (coat override), fallback (coat if the skin has none),
   *  wraps, name }. Pads, palm and claws are the species' own (a caller's pad colour is not used). Without `fur` the coat is
   *  sampled again when the paw is first drawn (cast characters are painted after their hands are made). Nothing is built here:
   *  the shapes come from the workers (the one on screen first); until one is ready the nearest ready shape shows, or the quick
   *  stand-in. Each paw has a detail marker just before it on the hand joint (an LOD hook the renderer calls with each camera)
   *  that switches it to the low-detail paw when it is small on screen. */
  function attach(rig, o = {}) {
    const species = norm(o.species || speciesOf(rig), 'fist')[0], wraps = !!o.wraps, out = [];
    let coat = o.fur ? color(o.fur) : coatOf(rig, o.fallback), sampled = !!o.fur;
    const ready = sh => SYNC || isReady(species, sh, wraps);
    request(species, wanted(rig, 'L'), wraps, 1); for (const sh of ORDER) request(species, sh, wraps, 2);
    for (const side of ['L', 'R']) {
      const st = { shape: null, via: null, until: 0, final: null, far: false };
      const m = new T.Mesh(undefined, material(rig)); m.name = o.name || 'Bare hand'; m.castShadow = true; m.receiveShadow = false;
      m.userData.storyPart = true; m.userData.mane = true; m.userData.paw = { species, side, wraps }; if (wraps) m.userData.wraps = true;
      const show = sh => { // the geometry for a shape: full or low detail when it is ready, else the quick stand-in
        const real = ready(sh), detail = !real ? 'quick' : st.far ? 'lod' : 'full', key = sh + '|' + detail;
        if (m.userData.pawKey !== key) { m.geometry = geometry(species, sh, side, coat, { wraps, detail }); m.userData.pawKey = key; debug[detail]++; }
        m.userData.shape = sh; m.userData.pawDetail = detail;
      };
      const choose = () => {
        if (!sampled) { sampled = true; const c = coatOf(rig, o.fallback); if (c.getHex() !== coat.getHex()) { coat = c; for (const p of out) p.userData.pawKey = null; } }
        let want = wanted(rig, side);
        if (!ready(want)) { request(species, want, wraps, 0); const alt = [st.shape, ...ORDER].find(s => s && ready(s)); if (alt) want = alt; } // never wait for the worker: the nearest ready shape until it comes, else the stand-in
        if (want !== st.shape && !st.via) { const far = Math.abs(SWITCH[want] - SWITCH[st.shape]) > 1; if (far && !rig.pawOverride && ready('grip')) { st.via = 'grip'; st.until = now() + 55; st.final = want; } else st.shape = want; } // a hand that opens or closes passes the half-closed hand (~2 frames)
        if (st.via && (now() >= st.until || want !== st.final)) { st.shape = want; st.via = null; }
        show(st.via || st.shape);
      };
      st.shape = ORDER.find(sh => isReady(species, sh, wraps)) || (SYNC ? 'relaxed' : wanted(rig, side)); show(st.shape);
      const base = T.Mesh.prototype.updateMatrixWorld;
      m.updateMatrixWorld = function (force) { if (this.visible) { try { choose(); } catch (x) { /* keep the last shape */ } } return base.call(this, force); };
      const lod = new T.Object3D(); lod.name = 'Paw detail'; lod.userData.storyPart = true; lod.userData.pawDetail = true;
      Object.defineProperty(lod, 'isLOD', { value: true }); lod.autoUpdate = true; // the renderer calls update(camera) on it while projecting, before the paw after it
      lod.update = cam => { if (!m.visible || !m.parent) return; const far = farFrom(m, cam, st.far); if (far !== st.far) { st.far = far; try { show(m.userData.shape); } catch (x) { /* keep it */ } } };
      rig.joints['hand' + side].add(lod, m); out.push(m);
    }
    return out;
  }
  /** Asks the workers for every shape of a species (built here instead when there is no worker and `now` is set). */
  function warm(species, o = {}) { for (const sh of ORDER) if (!request(species, sh, o.wraps, o.prio ?? 3) && o.now && !isReady(species, sh, o.wraps)) for (const s of ['L', 'R']) build(species, sh, s, o); }
  // After the game has loaded: the Fighter's paws (his species) and Bruno's, before the first street or gym scene. Everyone else is
  // asked for when they are made or when a scene that needs them is coming (Paws.prefetch).
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('load', () => setTimeout(() => {
    const fighter = window.app?.engine?.coach?.species === 'rabbit' ? 'rabbit' : 'lion';
    for (const sh of ['relaxed', 'fist', 'grip', 'open', 'point']) request(fighter, sh, false, 3);
    for (const sh of ['relaxed', 'open', 'point', 'grip', 'fist']) request('bear', sh, false, 3);
  }, 2500));

  const api = { attach, build, geometry, quick, warm, request, prefetch, isReady, shapeFor, speciesOf, coatOf, material, components, LOOK, SHAPES, GESTURE, BUDGET, LOD: { in: LOD_IN, out: LOD_OUT }, species: Object.keys(LOOK), shapes: ORDER.slice(), debug, _anatomy: anatomy, _field: fieldOf, _pending: () => PENDING.size + QUEUE.size, get worker() { return workers.length > 0; }, get sync() { return SYNC; } };
  if (typeof window !== 'undefined') window.Paws = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
