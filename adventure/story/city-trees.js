/* Street trees for the story sets (owner, 2026-11-22: the round tree behind the Fighter at the bus stop read as a green sphere).
 * Two procedural forms built from the same recipe: a trunk that forks into limbs and twigs (tapered five-sided tubes, bark
 * colours) and a crown of leaf clumps (fans of small leaves at the twig tips, over the crown's shell and, darker, deeper
 * inside so the crown is not see-through; colour lighter at the sunny top and darker inside and underneath). The leaves are
 * lit with the crown's own rounded normals, so the crown reads as one soft volume while its outline stays leafy and broken.
 *   'broad'    Old Town shade tree (plane / linden): a wide, rounded, spreading crown   (Gloryland map: treeGeo, Old Town)
 *   'upright'  Market Row street tree: a narrow oval crown on steeper limbs              (map: Market Row civic planting)
 * The detailed authored narrow tree stays the GLB in city-assets.js (assets/street/ch01-trees/street-tree-low.glb).
 *
 *   CityTrees.FORMS                              the form names
 *   CityTrees.template(form) -> { wood, leaf }   cached, deterministic arrays { p, n, c } (metres, ground at y 0, height REF)
 *   CityTrees.add(wood, leaf, form, site)        appends one tree at site { x, z, h, yaw?, scale?: [sx, sy, sz] } to two
 *                                                collectors ({ p, n, c } arrays or a map-kit Batch: same fields)
 *   CityTrees.mesh(store, name, kind)            one Mesh from a collector: kind 'wood' (bark) or 'leaf' (double-sided
 *                                                foliage with a gentle breeze in the vertex shader)
 *   CityTrees.triangles(form)                    triangles of one tree (tests, budgets)
 * About 3.2k triangles a broad tree, 2k an upright one; a set merges all its trees into one wood and one leaf mesh (two draw calls in all). */
(() => {
  const REF = 4.6, TAU = Math.PI * 2;
  const FORMS = {
    broad: { ref: 4.6, trunk: 1.95, r0: .15, crown: [0, 3.2, 0], rad: [2.0, 1.45, 1.85], limbs: 5, lean: [.8, 1.12], limb: [1.25, 1.55], twigs: [2, 3], twig: [.6, .9],
      clumps: 150, inner: 34, perClump: [8, 10], leafLen: [.3, .42], seed: 7,
      leaves: ['#6a9a3e', '#77a646', '#5b8a37', '#86b250', '#6f9c40', '#62923b'], bark: ['#6e5642', '#5b4636'] },
    upright: { ref: 4.4, trunk: 1.45, r0: .12, crown: [0, 3.05, 0], rad: [1.02, 1.78, 1.0], limbs: 4, lean: [.32, .55], limb: [1.2, 1.5], twigs: [2, 3], twig: [.5, .75],
      clumps: 92, inner: 18, perClump: [8, 10], leafLen: [.22, .32], seed: 19,
      leaves: ['#5c8c40', '#679a48', '#517f39', '#74a650', '#5e8c3f'], bark: ['#6a5644', '#584636'] }
  };
  const cache = new Map();
  const col = hex => { const c = new THREE.Color(hex); if (c.convertSRGBToLinear) c.convertSRGBToLinear(); return [c.r, c.g, c.b]; };
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const V = THREE.Vector3;

  function build(form) {
    const F = FORMS[form], R = rng(F.seed), rnd = (a, b) => a + (b - a) * R();
    const wood = { p: [], n: [], c: [] }, leaf = { p: [], n: [], c: [] };
    const [bA, bB] = F.bark.map(col), cen = new V(...F.crown), rad = new V(...F.rad);
    const push = (s, P, N, C) => { s.p.push(P.x, P.y, P.z); s.n.push(N.x, N.y, N.z); s.c.push(C[0], C[1], C[2]); };
    /** A tapered five-sided tube from a to b (radial normals); colour darkens toward the ground. */
    function tube(a, b, r0, r1, sides = 5) {
      const d = new V().subVectors(b, a).normalize(), u = new V(), w = new V();
      u.set(Math.abs(d.y) < .9 ? 0 : 1, Math.abs(d.y) < .9 ? 1 : 0, 0).cross(d).normalize(); w.crossVectors(d, u);
      const ring = (o, r, k) => { const out = []; for (let i = 0; i < sides; i++) { const t = (i + k * .5) / sides * TAU, nr = new V().addScaledVector(u, Math.cos(t)).addScaledVector(w, Math.sin(t)); out.push([new V().copy(o).addScaledVector(nr, r), nr]); } return out; };
      const A = ring(a, r0, 0), B = ring(b, r1, 0), shade = y => { const k = Math.min(1, .55 + y * .16); return [0, 1, 2].map(i => (bA[i] * (1 - Math.min(1, y / 4)) + bB[i] * Math.min(1, y / 4)) * k); };
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides, ca = shade(a.y), cb = shade(b.y);
        push(wood, A[i][0], A[i][1], ca); push(wood, A[j][0], A[j][1], ca); push(wood, B[j][0], B[j][1], cb);
        push(wood, A[i][0], A[i][1], ca); push(wood, B[j][0], B[j][1], cb); push(wood, B[i][0], B[i][1], cb);
      }
    }
    /** A limb from a, heading d, of length L in two bent segments; returns its end. */
    function limb(a, d, L, r0, r1, up = .18) {
      const m = new V().copy(a).addScaledVector(d, L * .52); m.y += L * up * .5;
      const d2 = new V().copy(d); d2.y += up; d2.normalize();
      const e = new V().copy(m).addScaledVector(d2, L * .5);
      tube(a, m, r0, (r0 + r1) / 2); tube(m, e, (r0 + r1) / 2, r1); return { mid: m, end: e, dir: d2 };
    }
    /** Inside the crown's ellipsoid (k = 1 on its surface). */
    const inside = (p, k = 1) => { const x = (p.x - cen.x) / rad.x, y = (p.y - cen.y) / rad.y, z = (p.z - cen.z) / rad.z, l = Math.hypot(x, y, z); if (l > k) p.set(cen.x + x / l * k * rad.x, cen.y + y / l * k * rad.y, cen.z + z / l * k * rad.z); return p; };
    const crownNormal = p => new V((p.x - cen.x) / (rad.x * rad.x), (p.y - cen.y) / (rad.y * rad.y), (p.z - cen.z) / (rad.z * rad.z)).normalize();
    // ---- trunk with a root flare, a leader and spreading limbs, each forking into twigs
    const base = new V(0, -.02, 0), fork = new V(rnd(-.06, .06), F.trunk, rnd(-.06, .06)), knee = new V().lerpVectors(base, fork, .55); knee.x += rnd(-.05, .05);
    tube(base, new V(0, .28, 0), F.r0 * 1.55, F.r0 * 1.02, 6); tube(new V(0, .26, 0), knee, F.r0, F.r0 * .86, 6); tube(knee, fork, F.r0 * .86, F.r0 * .7, 6);
    const tips = [], mids = [];
    const leader = limb(fork, new V(rnd(-.1, .1), 1, rnd(-.1, .1)).normalize(), (cen.y + rad.y * .55 - fork.y) * .85, F.r0 * .62, F.r0 * .26, 0);
    tips.push(leader.end); mids.push(leader.mid);
    const a0 = rnd(0, TAU);
    for (let i = 0; i < F.limbs; i++) {
      const az = a0 + i / F.limbs * TAU + rnd(-.35, .35), el = rnd(F.lean[0], F.lean[1]);
      const d = new V(Math.sin(el) * Math.cos(az), Math.cos(el), Math.sin(el) * Math.sin(az));
      const start = new V().lerpVectors(knee, fork, i % 2 ? 1 : .86);
      const L = limb(start, d, rnd(F.limb[0], F.limb[1]), F.r0 * .58, F.r0 * .3, .22);
      inside(L.end, .82); mids.push(L.mid);
      const n = Math.round(rnd(F.twigs[0], F.twigs[1] + .49));
      for (let k = 0; k < n; k++) {
        const t = new V().copy(L.dir); const s = (k - (n - 1) / 2) * rnd(.5, .8);
        t.applyAxisAngle(new V(0, 1, 0), s).y += rnd(-.05, .35); t.normalize();
        const from = k === 0 ? L.mid : L.end, T = limb(from, t, rnd(F.twig[0], F.twig[1]), F.r0 * .28, F.r0 * .1, .12);
        inside(T.end, .95); tips.push(T.end);
      }
    }
    // ---- crown: leaf clumps at the twig tips, spread over the shell and (darker) deeper inside
    const pal = F.leaves.map(col), light = p => { const h = Math.min(1, Math.max(0, (p.y - (cen.y - rad.y)) / (2 * rad.y))), x = (p.x - cen.x) / rad.x, y = (p.y - cen.y) / rad.y, z = (p.z - cen.z) / rad.z, r = Math.min(1, Math.hypot(x, y, z)); return (.55 + .42 * h) * (.6 + .42 * r); };
    const anchors = [...tips];
    while (anchors.length < F.clumps) { // shell points (more round the sides and the top than underneath), then inner ones
      const deep = anchors.length >= F.clumps - F.inner, t = rnd(0, TAU), y = rnd(-.55, 1), r = Math.sqrt(1 - y * y), k = deep ? rnd(.35, .7) : rnd(.74, 1.0);
      anchors.push(new V(cen.x + Math.cos(t) * r * rad.x * k, cen.y + y * rad.y * k, cen.z + Math.sin(t) * r * rad.z * k));
    }
    const up = new V(0, 1, 0), tmp = new V();
    for (let a = 0; a < anchors.length; a++) {
      const q = anchors[a], out = crownNormal(q), c0 = pal[Math.floor(rnd(0, pal.length)) % pal.length], n = Math.round(rnd(F.perClump[0], F.perClump[1]));
      for (let k = 0; k < n; k++) {
        const dir = new V(rnd(-1, 1), rnd(-.7, 1), rnd(-1, 1)).normalize().addScaledVector(out, .6).normalize();
        const len = rnd(F.leafLen[0], F.leafLen[1]), wdt = len * rnd(.46, .6), B = new V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(.2).add(q).addScaledVector(dir, rnd(0, .1)); // scattered round the clump, not a star
        const T = new V().copy(B).addScaledVector(dir, len);
        const side = tmp.crossVectors(dir, Math.abs(dir.y) > .95 ? new V(1, 0, 0) : up).normalize().applyAxisAngle(dir, rnd(-.9, .9));
        const M1 = new V().copy(B).addScaledVector(dir, len * .42).addScaledVector(side, wdt / 2), M2 = new V().copy(B).addScaledVector(dir, len * .42).addScaledVector(side, -wdt / 2);
        const kk = light(T) * rnd(.9, 1.1), cBase = c0.map(x => x * kk * .82), cTip = c0.map(x => x * kk * 1.06);
        // rounded crown normals with a little of each leaf's own tilt: one soft volume, leafy edges
        const fn = new V().crossVectors(new V().subVectors(M1, B), new V().subVectors(T, B)).normalize(); if (fn.dot(out) < 0) fn.negate();
        const nn = new V().copy(out).multiplyScalar(.78).addScaledVector(fn, .22).normalize();
        push(leaf, B, nn, cBase); push(leaf, M1, nn, cTip); push(leaf, T, nn, cTip);
        push(leaf, B, nn, cBase); push(leaf, T, nn, cTip); push(leaf, M2, nn, cTip);
      }
    }
    return { wood: { p: new Float32Array(wood.p), n: new Float32Array(wood.n), c: new Float32Array(wood.c) }, leaf: { p: new Float32Array(leaf.p), n: new Float32Array(leaf.n), c: new Float32Array(leaf.c) }, ref: F.ref };
  }
  function template(form) { if (!FORMS[form]) form = 'broad'; if (!cache.has(form)) cache.set(form, build(form)); return cache.get(form); }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V(), _v = new V(), _n3 = new THREE.Matrix3();
  function append(dst, src, m, nm) {
    const P = src.p, N = src.n, Cc = src.c, e = m.elements, ne = nm.elements;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      dst.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const a = N[i], b = N[i + 1], c = N[i + 2]; let nx = ne[0] * a + ne[3] * b + ne[6] * c, ny = ne[1] * a + ne[4] * b + ne[7] * c, nz = ne[2] * a + ne[5] * b + ne[8] * c; const l = Math.hypot(nx, ny, nz) || 1;
      dst.n.push(nx / l, ny / l, nz / l); dst.c.push(Cc[i], Cc[i + 1], Cc[i + 2]);
      if (dst.uv) dst.uv.push(0, 0); if (dst.t) dst.t.push(1, 1, 1);
    }
  }
  /** One tree at site { x, z, h, yaw, scale } into the wood and leaf collectors (y = 0 is the pavement). */
  function add(wood, leaf, form, site) {
    const T = template(form), k = (site.h || T.ref) / T.ref, sc = site.scale || [1, 1, 1];
    _s.set(k * sc[0], k * sc[1], k * sc[2]); _q.setFromAxisAngle(_v.set(0, 1, 0), site.yaw ?? (site.x * 1.7 + site.z * .9));
    _m.compose(_v.set(site.x, site.y || 0, site.z), _q, _s); _n3.getNormalMatrix(_m);
    if (wood) append(wood, T.wood, _m, _n3); if (leaf) append(leaf, T.leaf, _m, _n3);
  }
  // breeze: one time value for every leaf material; leaves high in the crown move a few centimetres
  const SWAY = { value: 0 };
  function foliage(sh) {
    sh.uniforms.uSway = SWAY;
    sh.vertexShader = 'uniform float uSway;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  float swH = clamp((position.y - 1.8) / 3.0, 0.0, 1.0), swP = dot(position.xz, vec2(.83, .61));\n  transformed.x += sin(uSway * 1.9 + swP) * .03 * swH;\n  transformed.z += cos(uSway * 1.4 + swP * 1.3) * .024 * swH;\n  transformed.y += sin(uSway * 2.3 + swP * 2.1) * .012 * swH;');
    // the crown's rounded normals are kept on both faces of a leaf (no flip on the back face)
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal = normal * faceDirection;', ''));
  }
  function mesh(store, name, kind) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(store.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(store.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(store.c, 3));
    g.computeBoundingSphere();
    const leafy = kind === 'leaf', m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: leafy ? .86 : .93, metalness: 0, side: leafy ? THREE.DoubleSide : THREE.FrontSide });
    if (leafy) { m.onBeforeCompile = foliage; m.name = 'street tree leaves'; } else m.name = 'street tree bark';
    const o = new THREE.Mesh(g, m); o.name = name; o.castShadow = true; o.receiveShadow = true;
    if (leafy) o.onBeforeRender = () => { SWAY.value = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; };
    return o;
  }
  const triangles = form => { const T = template(form); return (T.wood.p.length + T.leaf.p.length) / 9; };
  window.CityTrees = { FORMS: Object.keys(FORMS), REF, template, add, mesh, triangles };
})();
