/* Market Row cast (GOTR-0092, docs/adventure/DREAM_HOOKS.md): Fang, the wolf robber of beat 6; Mrs. Hazel, the doe who runs the fruit
 * stall; Otto, the otter who owns the boxing shop "Otto's Corner" (beat 7). Same construction as Bruno and Brick in story-cast.js and
 * registered into StoryCast (ids 'fang', 'hazel', 'otto'): the rig's own continuous skin is sculpted (head field + body bulk), coloured
 * and dressed in place; clothes that lie ON the body (collars, lapels, the headscarf, the skirt and the shop apron) are skinned shells
 * that copy the body's own bone weights, so they bend with it instead of floating; small rigid things (eyes, ears, nose, teeth, zips,
 * studs, chain, glasses, tape, bag, shoes) are merged vertex-coloured meshes, one draw call per material and bone.
 * Face dynamics: the lower jaw is a morph of the skin (anatomy channel 12, the one the fight already drives on a hit), so the mouth
 * really opens when they talk; eyes blink with the rig's face acting; ears, cheek ruffs and the tail lag behind head and hip motion.
 * Nothing in story-cast.js is changed: StoryCast.talk is wrapped so the jaw follows speech. World: metres, y up, rest pose faces +z. */
(() => {
  const SC = window.StoryCast; if (!SC || !window.THREE || !SC.defs) return;
  const { Parts, seat, dress, bulk, tufts } = SC;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); }, bell = (v, c, r) => Math.exp(-(((v - c) / r) ** 2));
  const band = (v, a, b, e = .02) => smooth((v - a) / e) * (1 - smooth((v - b) / e));
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const HEAD_Y = 1.84, HS = .9, HEAD0 = V(0, HEAD_Y, 0), CHEST0 = V(0, 1.36, 0), SPINE0 = V(0, 1.13, 0), HIPS0 = V(0, .99, 0);
  const SWAP = ['position', 'normal', 'color', 'avatarMuscle', 'avatarMuscleNormal', 'avatarDefinition', 'avatarDefinitionNormal', 'avatarMass'];
  const use = (g, s) => { for (const k of SWAP) if (s[k]) g.setAttribute(k, s[k]); };
  const hc = p => [p.x / HS, (p.y - HEAD_Y) / HS, p.z / HS]; // rest world -> head coordinates (before the 0.9 head scale)
  const rnd = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  /* ---------------------------------------------------------------- materials (one set per rig: rigs are built once and cached) */
  const vmat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0, ...o });
  function mats(rig) {
    return rig.castMarket || (rig.castMarket = { parts: vmat({ roughness: .8 }), fur: vmat({ roughness: 1, side: THREE.DoubleSide }), metal: vmat({ roughness: .28, metalness: .95 }), gold: vmat({ roughness: .22, metalness: 1 }),
      glossy: vmat({ roughness: .3 }), ear: vmat({ roughness: .9, side: THREE.DoubleSide }), lens: new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: .05, metalness: 0, transparent: true, opacity: .22, clearcoat: 1, depthWrite: false }),
      wet: new THREE.MeshPhysicalMaterial({ color: 0x120e0c, roughness: .25, clearcoat: .6 }), glint: new THREE.MeshBasicMaterial({ color: 0xfff6e6 }), black: new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: .5 }) });
  }
  const mark = m => { m.userData.storyPart = true; m.userData.mane = true; m.castShadow = true; return m; };
  const meshOf = (P, name, mat) => { const m = mark(new THREE.Mesh(P.geometry(), mat)); m.name = name; return m; };

  /* ---------------------------------------------------------------- the skin: colour, gloss, jaw */
  /** Repaints the sculpted skin in its final rest shape: fn(p, h = [hx, hy, hz], c) edits c (linear). Grain and back shade on top. */
  function paint(rig, fn) {
    const g = rig.skin.geometry, P = g.attributes.position, C = g.attributes.color, p = V(), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); c.fromBufferAttribute(C, i); fn(p, hc(p), c);
      c.multiplyScalar(1 + .045 * Math.sin(p.y * 130 + p.x * 61) * Math.sin(p.z * 151 + p.x * 37)); C.setXYZ(i, c.r, c.g, c.b);
    }
    C.needsUpdate = true;
  }
  /** Per-vertex roughness: castGloss 0 = the skin's own roughness, 1 = `rough` (leather, glossy fur); the fur bump fades with it. */
  function gloss(rig, values, rough) {
    const g = rig.skin.geometry, mat = rig.skin.material; g.setAttribute('castGloss', new THREE.BufferAttribute(values, 1));
    const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey;
    mat.onBeforeCompile = (sh, r) => {
      prev?.call(mat, sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float castGloss;varying float vCastGloss;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCastGloss=castGloss;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCastGloss;')
        .replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment.replace(/bumpScale \*/g, '(bumpScale*(1.0-.8*vCastGloss)) *'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,' + rough.toFixed(3) + ',clamp(vCastGloss,0.0,1.0));');
    };
    mat.customProgramCacheKey = () => (key ? key.call(mat) : '') + '|castGloss' + rough;
    mat.needsUpdate = true;
  }
  /** The lower jaw as a morph on anatomy channel 12 (what AvatarAnatomy drives on a hit; StoryCast.talk drives it in speech).
   *  o: { lip(hz) -> mouth line height (head coords), from, to: hz range of the mouth, hinge: [hy, hz], angle (rad at 1), depth, lips colour }.
   *  The lips band (between the two lips) folds into the muzzle as it opens, and is painted dark: an open mouth with depth. */
  function jaw(rig, o) {
    const g = rig.skin.geometry, P = g.attributes.position, M = g.attributes.avatarMuscle, MN = g.attributes.avatarMuscleNormal, C = g.attributes.color, p = V(), lips = lin(o.lips || '#141113'), inner = lin(o.inner || '#3a1418');
    if (!M) return; const ca = Math.cos(o.angle), sa = Math.sin(o.angle), [hy0, hz0] = o.hinge;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); if (p.y < 1.66) continue; const [hx, hy, hz] = hc(p);
      if (hz < o.back || Math.abs(hx) > (o.width || .2)) continue;
      const ly = o.lip(hz), along = smooth((hz - o.from) / (o.ramp || .07)) * (1 - smooth((hz - o.to) / .02)), under = smooth((ly - hy) / (o.band || .012));
      const w = under * along * (1 - smooth((-hy - (o.throat || .1)) / .06)) * smooth((hz - o.back) / .08); if (!(w > 1e-4)) continue;
      const dy = hy - hy0, dz = hz - hz0, ry = dy * ca - dz * sa, rz = dz * ca + dy * sa, fold = 4 * under * (1 - under) * along, r = Math.hypot(hx, 0) || 1;
      M.setXYZW(i, HS * ((ry - dy) * w * 0 - (hx / r) * (o.depth || .02) * fold * smooth(Math.abs(hx) / .02)), HS * ((ry - dy) * w), HS * ((rz - dz) * w - (o.depthZ || .01) * fold), 12);
      if (MN) MN.setXYZ(i, 0, 0, 0);
      const bw = o.band || .012, lipZone = smooth((hy - (ly - bw - .005)) / .003) * (1 - smooth((hy - (ly + .004)) / .003)) * smooth((hz - o.from - .01) / .03) * (1 - smooth((hz - o.to) / .02)), mid = 4 * under * (1 - under) * along;
      if (lipZone > .02) { const c = new THREE.Color().fromBufferAttribute(C, i).lerp(lips, clamp(lipZone)).lerp(inner, clamp(mid * 1.4 - .3)); C.setXYZ(i, c.r, c.g, c.b); }
    }
    M.needsUpdate = true; C.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- skinned shells: cloth that lies on the body and bends with it */
  /** A shell over part of the dressed skin: pick(p, n, h) -> null | { d: offset along the normal, c: Color (linear) }. Triangles whose
   *  three corners are picked are copied, offset, and get the skin's own bone weights; the open edge gets a wall down to the skin
   *  (the cloth has thickness). One skinned mesh, one draw call. */
  function shell(rig, pick, o = {}) {
    const g = rig.skin.geometry, P = g.attributes.position, N = g.attributes.normal, idx = g.index.array, topo = g.userData.storyTopo, rep = topo ? topo.rep : null, n0 = P.count;
    const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, CL = g.attributes.coachLinear, p = V(), n = V(), info = new Array(n0);
    for (let i = 0; i < n0; i++) { if (rep && rep[i] !== i) continue; p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); const r = pick(p, n, hc(p), i); if (r) info[i] = r; }
    const R = i => rep ? rep[i] : i, out = new Map(), inn = new Map(), pos = [], col = [], si = [], sw = [], cl = [], tri = [];
    const vert = (i, inner) => {
      const m = inner ? inn : out; if (m.has(i)) return m.get(i); const r = info[i], d = inner ? (o.base ?? .0015) : r.d, k = pos.length / 3;
      p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); pos.push(p.x + n.x * d, p.y + n.y * d, p.z + n.z * d); const c = inner ? r.c.clone().multiplyScalar(.7) : r.c; col.push(c.r, c.g, c.b);
      si.push(SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)); sw.push(SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)); cl.push(CL ? CL.getX(i) : 0); m.set(i, k); return k;
    };
    const edges = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const a = R(idx[t]), b = R(idx[t + 1]), c = R(idx[t + 2]); if (a === b || b === c || a === c || !info[a] || !info[b] || !info[c]) continue;
      tri.push(vert(a), vert(b), vert(c));
      for (const [u, v] of [[a, b], [b, c], [c, a]]) { const key = u < v ? u + ':' + v : v + ':' + u, e = edges.get(key); if (e) e.n++; else edges.set(key, { u, v, n: 1 }); }
    }
    if (o.wall !== false) for (const e of edges.values()) if (e.n === 1) { const A = vert(e.u), B = vert(e.v), Ai = vert(e.u, true), Bi = vert(e.v, true); tri.push(A, Ai, B, B, Ai, Bi); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); geo.setIndex(tri); geo.computeVertexNormals();
    const m = rig.skinned(geo, o.material || vmat({ roughness: o.roughness ?? .85, side: THREE.DoubleSide, skinning: true }), false);
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.setAttribute('coachLinear', new THREE.Float32BufferAttribute(cl, 1));
    m.name = o.name || 'Cloth shell'; m.userData.storyPart = true; m.castShadow = true; m.receiveShadow = true; return m;
  }
  /** A skirt or apron panel below the waist, skinned to the hips and (blended across the middle) to both thighs, so a stride lifts
   *  it instead of passing through it. rings: [[y, rx, rz], ...] top to bottom; arc: [a0, a1] around the body (0 = front, radians);
   *  colour(y, a, u) -> Color (u = 0..1 down the panel); folds: count and depth growing toward the hem. */
  function drape(rig, o) {
    const rings = o.rings, segs = o.segs || 72, rows = [], pos = [], col = [], idx = [], si = [], sw = [], cl = [], [a0, a1] = o.arc || [-Math.PI, Math.PI], full = a1 - a0 >= Math.PI * 2 - 1e-6;
    const B = name => rig.bones.indexOf(rig.joints[name]), hips = B('hips'), tl = B('thighL'), tr = B('thighR'), spine = B('spine');
    const ys = []; for (let r = 0; r < rings.length - 1; r++) for (let k = 0; k < (o.sub || 6); k++) ys.push([r, k / (o.sub || 6)]); ys.push([rings.length - 2, 1]);
    const yTop = rings[0][0], yBot = rings[rings.length - 1][0];
    ys.forEach(([r, k], row) => {
      const A = rings[r], Bq = rings[r + 1], y = lerp(A[0], Bq[0], k), rx = lerp(A[1], Bq[1], k), rz = lerp(A[2], Bq[2], k), u = (yTop - y) / (yTop - yBot), line = [];
      for (let s = 0; s <= segs; s++) {
        if (full && s === segs) { line.push(line[0]); continue; }
        const a = a0 + (a1 - a0) * s / segs, fold = 1 + (o.folds ? o.folds[1] * Math.pow(u, 1.3) * Math.sin(a * o.folds[0] + .7) : 0) + (o.flare ? o.flare(a, u) : 0);
        const x = Math.sin(a) * rx * fold, z = Math.cos(a) * rz * fold + (o.dz ? o.dz(a, u) : 0), c = o.colour(y, a, u, x, z), k2 = pos.length / 3;
        pos.push(x, y, z); col.push(c.r, c.g, c.b);
        const legs = smooth(((o.legFrom ?? 1.0) - y) / (o.legSpan || .32)) * (o.legMax ?? .88), right = smooth((x + .06) / .12), top = o.spineAbove != null ? smooth((y - o.spineAbove) / .06) : 0;
        const w = [[spine, top * (1 - legs)], [hips, (1 - top) * (1 - legs)], [tl, legs * (1 - right)], [tr, legs * right]].filter(q => q[1] > 1e-4).sort((p, q) => q[1] - p[1]);
        while (w.length < 4) w.push([0, 0]); const tot = w.reduce((n, q) => n + q[1], 0) || 1; si.push(...w.map(q => q[0])); sw.push(...w.map(q => q[1] / tot)); cl.push(0); line.push(k2);
      }
      rows.push(line);
    });
    for (let r = 0; r < rows.length - 1; r++) for (let s = 0; s < segs; s++) { const a = rows[r][s], b = rows[r][s + 1], c = rows[r + 1][s], d = rows[r + 1][s + 1]; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = rig.skinned(geo, vmat({ roughness: o.roughness ?? .88, side: THREE.DoubleSide, skinning: true }), false);
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.setAttribute('coachLinear', new THREE.Float32BufferAttribute(cl, 1));
    m.name = o.name || 'Skirt'; m.userData.storyPart = true; m.castShadow = true; m.receiveShadow = true; return m;
  }
  /** The waist ring of the dressed skin at height y: half widths [rx, rz] (z measured about zc). */
  function waist(rig, y, zc = -.01) { const P = rig.skin.geometry.attributes.position; let rx = 0, rz = 0; for (let i = 0; i < P.count; i++) { if (Math.abs(P.getY(i) - y) > .01 || Math.abs(P.getX(i)) > .4) continue; rx = Math.max(rx, Math.abs(P.getX(i))); rz = Math.max(rz, Math.abs(P.getZ(i) - zc)); } return [rx, rz]; }

  /* ---------------------------------------------------------------- fur locks anywhere (ears, tails): like StoryCast.tufts on given roots */
  function locksAt(roots, o) {
    const pos = [], nor = [], col = [], c = new THREE.Color(), rand = rnd(o.seed || 77), org = o.origin || V();
    const put = (q, m, k) => { pos.push(q.x - org.x, q.y - org.y, q.z - org.z); nor.push(m.x, m.y, m.z); col.push(c.r * k, c.g * k, c.b * k); };
    for (const { p, n, colour, len: L = 1, flow } of roots) {
      const r0 = rand(), r1 = rand(), r2 = rand(), r3 = rand(), tangent = (flow || o.flow(p, n)).clone(); tangent.addScaledVector(n, -tangent.dot(n)); if (tangent.lengthSq() < 1e-6) tangent.set(0, -n.z, n.y); tangent.normalize().applyAxisAngle(n, (r2 - .5) * .6);
      const angle = (o.lift ?? .3) + .15 * r0, fwd = tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(n, Math.sin(angle)), len = o.len * L * (.7 + .6 * r1), width = o.width * (.75 + .5 * r2), curl = (r3 - .5) * .35 * len;
      const across = fwd.clone().cross(n).normalize(), lift = n.clone().addScaledVector(fwd, -n.dot(fwd)).normalize(); c.copy(colour); const shade = .94 + .1 * r0, st = [];
      for (let k = 0; k <= 4; k++) { const t = k / 4, half = width * (1 - t) * (.6 + 1.6 * t), q = p.clone().addScaledVector(n, -.004).addScaledVector(fwd, len * t).addScaledVector(n, -.3 * len * t * t).addScaledVector(across, curl * t * t); q.y -= (o.droop ?? .2) * len * t * t; st.push([t, [q.clone().addScaledVector(across, -half), q.clone().addScaledVector(lift, .35 * half), q.clone().addScaledVector(across, half)]]); }
      const ridge = [lift.clone().multiplyScalar(.6).addScaledVector(across, -.8).addScaledVector(n, .5).normalize(), lift.clone().addScaledVector(n, .5).normalize(), lift.clone().multiplyScalar(.6).addScaledVector(across, .8).addScaledVector(n, .5).normalize()];
      for (let k = 0; k < 4; k++) { const a = st[k], b = st[k + 1]; for (const [q, e] of [[a, 0], [a, 1], [b, 0], [a, 1], [b, 1], [b, 0], [a, 1], [a, 2], [b, 1], [a, 2], [b, 2], [b, 1]]) put(q[1][e], ridge[e], shade * (.86 + .2 * q[0]) * (e === 1 ? 1.05 : 1)); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, o.material); m.name = o.name || 'Fur locks'; m.userData.storyPart = true; m.userData.mane = true; m.receiveShadow = true; return m;
  }

  /* ---------------------------------------------------------------- ears: a cupped leaf with thickness, rim and inner fur */
  /** Builds an ear in its own frame (base at the origin, tip along +y, inside facing +z). o: { len, width, cup, thick, outer, inner, rim,
   *  notch?: [u, depth], shape?(u) -> width factor, tilt }. Returns { geo, roots } (roots: points for inner-ear fur). */
  function earGeometry(o) {
    const U = 16, W = 12, pos = [], col = [], idx = [], roots = [], outer = lin(o.outer), inner = lin(o.inner), rim = lin(o.rim || o.outer), deep = lin(o.deep || o.inner);
    const wAt = (u, side) => { let w = o.width * (o.shape ? o.shape(u) : Math.pow(1 - u, .85) * (1 + .25 * Math.sin(u * Math.PI))); if (o.notch && side > 0) w *= 1 - o.notch[1] * bell(u, o.notch[0], .045); return Math.max(w, .0008); };
    const P = (u, v, back) => { const side = v < 0 ? -1 : 1, w = wAt(u, side), x = v * w, y = u * o.len, cupz = o.cup * (1 - v * v) * Math.sin(Math.PI * Math.min(1, u * 1.15 + .1)) , z = -cupz - (back ? o.thick * (1 - .6 * u) * (1 - .5 * v * v) : 0) + (o.bend || 0) * u * u * o.len; return V(x, y, z); };
    for (const back of [0, 1]) for (let i = 0; i <= U; i++) for (let j = 0; j <= W; j++) {
      const u = i / U, v = j / W * 2 - 1, q = P(u, v, back); pos.push(q.x, q.y, q.z);
      const edge = smooth((Math.abs(v) - .72) / .26), c = back ? outer.clone().lerp(rim, edge * .5 + smooth((u - .78) / .2) * .6) : inner.clone().lerp(deep, (1 - Math.abs(v)) * .55 * (1 - u)).lerp(rim, edge * .85 + smooth((u - .82) / .16) * .7);
      col.push(c.r, c.g, c.b);
      if (!back && Math.abs(v) < .7 && u > .08 && u < .75 && (i + j) % 2 === 0) roots.push({ p: q.clone().add(V(0, 0, .002)), n: V(-v * .3, .1, 1).normalize(), u, v });
    }
    const row = W + 1, off = (U + 1) * row;
    for (let i = 0; i < U; i++) for (let j = 0; j < W; j++) { const a = i * row + j, b = a + 1, c = a + row, d = c + 1; idx.push(a, b, c, b, d, c); idx.push(off + a, off + c, off + b, off + b, off + c, off + d); }
    for (let i = 0; i < U; i++) for (const j of [0, W]) { const a = i * row + j, c = a + row; if (j === 0) idx.push(a, c, off + a, off + a, c, off + c); else idx.push(a, off + a, c, c, off + a, off + c); } // rim walls
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return { geo, roots };
  }
  /** Ear on the head: a pivot group at its base (for inertia), returns the pivot. at: head-joint local (rest metres), rot: Euler. */
  function ear(rig, at, rot, o, inner) {
    const m = mats(rig), { geo, roots } = earGeometry(o), pivot = new THREE.Group(); pivot.name = 'Ear pivot'; pivot.position.copy(at); pivot.rotation.set(...rot); pivot.userData.storyPart = true; pivot.userData.mane = true;
    const mesh = mark(new THREE.Mesh(geo, m.ear)); mesh.name = 'Ear'; pivot.add(mesh);
    if (inner) { const fur = locksAt(roots.filter((r, i) => i % (inner.every || 1) === 0).map(r => ({ p: r.p, n: r.n, colour: lin(inner.colour), len: 1 - .5 * r.u })), { len: inner.len, width: inner.width, lift: .6, droop: -.1, seed: 5, material: m.fur, flow: (p) => V(-p.x * 3, 1, .2).normalize(), name: 'Inner ear fur' }); pivot.add(fur); }
    rig.joints.head.add(pivot); (rig.castSprings || (rig.castSprings = [])).push({ o: pivot, rest: pivot.quaternion.clone(), k: o.spring ?? 1, kind: 'ear', side: at.x < 0 ? -1 : 1 }); return pivot;
  }

  /* ---------------------------------------------------------------- eyes with lids, iris, pupil and highlights */
  /** In head coordinates (face(), before the 0.9 head scale). The ball is a direct head child flagged as an eye (it blinks);
   *  iris, pupil and glints ride on it; lids in the coat colour frame it. o: { size, iris, yaw, roll, lid: { color, open, low, tilt }, lashes } */
  function eye(rig, s, x, y, z, o) {
    const m = mats(rig), head = rig.joints.head, r = o.size, q = new THREE.Euler(o.pitch || 0, s * (o.yaw || 0), s * (o.roll || 0));
    const ball = rig.ellipsoid(head, o.white ? m.white || (m.white = new THREE.MeshPhysicalMaterial({ color: 0xe8e2d8, roughness: .3, clearcoat: .5 })) : m.wet, V(s * x, y, z), V(r, r * (o.tall || .74), r * .64)); ball.rotation.copy(q); ball.userData.eye = true; ball.userData.mane = true; ball.name = 'Eye';
    const irisMat = m['iris' + o.iris] || (m['iris' + o.iris] = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.iris), roughness: .2, clearcoat: .7 }));
    const kid = (mat, p, sc) => { const k = new THREE.Mesh(ball.geometry, mat); k.position.set(...p); k.scale.set(...sc); ball.add(k); return k; };
    const ir = o.irisSize || .72; kid(irisMat, [0, 0, .86], [ir, ir * 1.02, .47]); kid(m.black, [0, .01, 1.3], [ir * (o.pupilW || .42), ir * (o.pupilH || .72), .17]);
    kid(m.glint, [-.26, .3, 1.43], [.13, .17, .085]); kid(m.glint, [.22, -.24, 1.4], [.06, .07, .05]);
    if (o.lid) {
      const lm = new THREE.MeshStandardMaterial({ color: o.lid.color, roughness: .95 });
      const up = rig.ellipsoid(head, lm, V(s * x, y + r * (.5 + (o.lid.open || 0)), z - r * .08), V(r * 1.1, r * .42, r * .78)), lo = rig.ellipsoid(head, lm, V(s * x, y - r * (.66 + (o.lid.low || 0)), z - r * .14), V(r * 1.02, r * .3, r * .7));
      for (const L of [up, lo]) { L.rotation.copy(q); L.userData.mane = true; } up.rotation.z += s * (o.lid.tilt || 0); lo.rotation.z -= s * (o.lid.tilt || 0) * .4;
      if (o.lid.edge) { const P = new Parts(), e = o.lid.edge, pts = [-1, -.5, 0, .5, 1].map(t => V(s * x + t * r * 1.02 * Math.cos(o.lid.tilt || 0), y + r * (.5 + (o.lid.open || 0)) - r * .4 * (1 - t * t) * .9 - s * t * r * Math.sin(o.lid.tilt || 0) * .9, z + r * .32 * (1 - t * t * .7) + .002)); P.ribbon(pts, r * .16, r * .12, e, V(0, 1, 0), 14, 6); head.add(meshOf(P, 'Lid line', m.parts)); }
    }
    return ball;
  }

  /* ---------------------------------------------------------------- hands, shoes */
  function hands(rig, fur, pad, o = {}) {
    for (const s of [-1, 1]) {
      const P = new Parts();
      P.sph(V(0, -.052, .002), V(.047 * (o.k || 1), .062, .034 * (o.k || 1)), fur); P.sph(V(0, -.106, .012), V(.044 * (o.k || 1), .036, .031), fur, [.35, 0, 0]);
      for (let k = 0; k < 4; k++) { const fx = -.032 + k * .0213; P.sph(V(fx * (o.k || 1), -.128, .014 + (k === 0 || k === 3 ? -.003 : 0)), V(.0128, .021, .016), fur, [.5, 0, 0]); if (o.claw) P.sph(V(fx * (o.k || 1), -.146, .024), V(.0045, .011, .006), o.claw, [.9, 0, 0]); if (o.knuckle) P.sph(V(fx * (o.k || 1), -.124, -.004), V(.011, .006, .008), o.knuckle); }
      P.sph(V(s * -.043, -.062, .02), V(.016, .034, .017), fur, [.2, 0, s * .45]); if (o.claw) P.sph(V(s * -.052, -.094, .03), V(.0045, .01, .006), o.claw, [.6, 0, s * .45]);
      P.sph(V(0, -.07, .033), V(.024, .026, .006), pad); P.cyl(V(0, 0, 0), V(.043, .06, .037), o.cuff || fur);
      const m = meshOf(P, 'Bare hand', mats(rig).parts); rig.joints['hand' + (s < 0 ? 'L' : 'R')].add(m);
    }
  }
  /** Shoes / boots on the foot joints (foot frame: sole at y = -0.08, toes toward +z). o: { upper, toe, sole, welt, lace?, shaft?, buckle?, heel? } */
  function shoes(rig, o) {
    const mt = mats(rig);
    for (const s of ['L', 'R']) {
      const P = new Parts(), k = o.scale || 1;
      P.sph(V(0, -.068, .045), V(.068 * k, o.soleH || .024, .17 * k), o.sole); P.sph(V(0, -.06, .045), V(.07 * k, .011, .173 * k), o.welt || o.sole);
      if (o.heel) P.box(V(0, -.07, -.075), V(.09 * k, o.heel, .07), o.sole);
      P.sph(V(0, -.03, .098), V(.06 * k, .043, .11 * k), o.upper); P.sph(V(0, -.012, -.035), V(.057 * k, .058, .079), o.upper); P.sph(V(0, .012, .02), V(.05 * k, .05, .07), o.upper, [-.35, 0, 0]);
      P.sph(V(0, -.04, .165), V(.056 * k, .031, .055 * k), o.toe);
      if (o.shaft) { P.cyl(V(0, .06, -.012), V(.072, .14, .08), o.upper); P.tor(V(0, .13, -.012), V(.073, .08, .073), o.toe, [Math.PI / 2, 0, 0]); for (let q = 0; q < 3; q++) P.ribbon([V(-.055, .02 + q * .03, .045), V(0, .03 + q * .03, .07), V(.055, .02 + q * .03, .045)], .007, .004, o.welt || '#555', V(0, 0, 1), 6, 6); }
      else P.tor(V(0, .052, -.02), V(.05, .05, .05), o.collar || o.upper, [Math.PI / 2, 0, 0]);
      if (o.lace) for (let q = 0; q < 4; q++) P.ribbon([V(-.028, .0 + q * .011, .112 - q * .024), V(0, .012 + q * .011, .118 - q * .024), V(.028, .0 + q * .011, .112 - q * .024)], .006, .004, o.lace, V(0, 0, 1), 6, 6);
      if (o.strap) P.ribbon([V(-.058, -.012, .07), V(0, .02, .082), V(.058, -.012, .07)], .016, .005, o.strap, V(0, 0, 1), 10, 6);
      const m = meshOf(P, 'Shoe', o.glossy ? mt.glossy : mt.parts); rig.joints['foot' + s].add(m);
      if (o.buckle) { const B = new Parts(); B.tor(V(.062, .02, -.01), V(.016, .02, .016), '#c9ccd1', [0, Math.PI / 2, 0]); rig.joints['foot' + s].add(meshOf(B, 'Boot buckle', mt.metal)); }
    }
  }

  /* ---------------------------------------------------------------- motion: lagging ears / ruffs / tails, the jaw in speech */
  const tmpQ = new THREE.Quaternion(), tmpV = V(), tmpE = new THREE.Euler();
  function settle(rig, time) {
    const sp = rig.castSprings; if (!sp || !rig.joints) return; const head = rig.joints.head, hips = rig.joints.hips;
    const st = rig.castSpring || (rig.castSpring = { t: null, head: V(), hips: V(), vh: V(), vp: V(), lag: V(), lagV: V(), hipLag: V(), hipV: V() });
    head.updateWorldMatrix(true, false); const hp = head.getWorldPosition(V()), pp = hips.getWorldPosition(V()), dt = st.t == null ? 0 : time - st.t; st.t = time;
    if (!(dt > 0) || dt > .25) { st.head.copy(hp); st.hips.copy(pp); st.lag.set(0, 0, 0); st.lagV.set(0, 0, 0); st.hipLag.set(0, 0, 0); st.hipV.set(0, 0, 0); }
    else {
      const vh = hp.clone().sub(st.head).divideScalar(dt), vp = pp.clone().sub(st.hips).divideScalar(dt), ah = vh.clone().sub(st.vh).divideScalar(dt), ap = vp.clone().sub(st.vp).divideScalar(dt); st.vh.copy(vh); st.vp.copy(vp); st.head.copy(hp); st.hips.copy(pp);
      const inv = head.getWorldQuaternion(tmpQ).invert(), a = ah.clampLength(0, 30).applyQuaternion(inv), h = Math.min(dt, .033);
      for (const [x, v, acc, k, d] of [[st.lag, st.lagV, a, 160, 13], [st.hipLag, st.hipV, ap.clampLength(0, 30).applyQuaternion(hips.getWorldQuaternion(new THREE.Quaternion()).invert()), 90, 9]]) { v.addScaledVector(acc, -h * .012).addScaledVector(x, -k * h).multiplyScalar(Math.max(0, 1 - d * h)); x.addScaledVector(v, h); x.clampLength(0, .6); }
    }
    const L = st.lag, sway = Math.sin(time * 1.3) * .015;
    for (const s of sp) {
      if (s.kind === 'ear') { tmpE.set(clamp(L.z * 2.2 - L.y * 1.5, -.35, .35) * s.k + sway * .5, 0, clamp(-L.x * 2.5 * s.side - L.y * s.side, -.3, .3) * s.k * s.side); s.o.quaternion.copy(s.rest).multiply(tmpQ.setFromEuler(tmpE)); }
      else if (s.kind === 'ruff') s.o.position.set(s.rest.x - L.x * .02 * s.k, s.rest.y - Math.abs(L.y) * .01 * s.k, s.rest.z - L.z * .02 * s.k);
      else if (s.kind === 'tail') { const H = st.hipLag; tmpE.set(clamp(-H.z * 1.4, -.4, .4) + sway, 0, clamp(H.x * 1.8, -.5, .5) + Math.sin(time * .9) * .05 * s.k); s.o.quaternion.copy(s.rest).multiply(tmpQ.setFromEuler(tmpE)); }
      else if (s.kind === 'bag') { // hangs from the hand by its handles: gravity in rig space, with a little swing
        s.o.parent.updateWorldMatrix(true, false); const pw = s.o.parent.getWorldQuaternion(new THREE.Quaternion()), rw = rig.root.getWorldQuaternion(new THREE.Quaternion());
        s.o.quaternion.copy(pw.invert().multiply(rw)).multiply(tmpQ.setFromEuler(tmpE.set(clamp(-st.hipLag.z * 1.2, -.35, .35), 0, clamp(st.hipLag.x * 1.2, -.35, .35))));
      }
    }
  }
  function mouthParts(rig, amount) {
    const f = rig.castMouth; if (!f) return; const a = clamp(amount);
    if (f.lower) f.lower.rotation.x = f.angle * a;
    for (const m of f.show || []) m.visible = a > (m.userData.from ?? .12);
  }
  /** Face acting on the rig's own update: lag, the jaw parts from the anatomy channel the fight drives (a hit opens the mouth too). */
  function install(rig) {
    const base = rig.updateMane.bind(rig);
    rig.updateMane = time => { base(time); settle(rig, time); mouthParts(rig, rig.anatomy?.value?.[12] || 0); };
    // the lion's default mouth parts sit where a lion's mouth is: these faces open their own jaw instead
    if (!rig.castMouth) rig.castMouth = { show: [], talk: rig.cast?.talkGain ?? .7 };
    const dummy = new THREE.Object3D(); dummy.visible = false;
    rig.faceActing = { inner: dummy, lip: new THREE.Object3D(), eyes: (rig.facialRest || []).filter(f => f.eye), brows: [] };
    for (const m of [rig.celebrationSmile, rig.painMouth]) if (m) { m.geometry = new THREE.BufferGeometry(); m.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); }
  }
  const baseTalk = SC.talk;
  SC.talk = (rig, amount) => {
    baseTalk(rig, amount); if (!rig?.castMouth) return;
    const a = clamp(amount) * (rig.castMouth.talk || .75); if (rig.anatomy?.value) rig.anatomy.value[12] = Math.max(rig.anatomy.value[12] || 0, a); rig.castMouth.said = a; mouthParts(rig, rig.anatomy?.value?.[12] ?? a);
  };

  /* ================================================================ FANG: big grey wolf, rocker jacket, gold chain, ripped jeans */
  const FANG = {
    id: 'fang', fur: '#7d7c7b', light: '#d6d0c4',
    build: { torso: .07, depth: .07, belly: 0, chest: .015, arm: .1, leg: .08, neck: .6, hips: .02, back: .02, traps: .05 }, // the lion fighter's body (muscle relief kept), a heavyweight's few percent bigger
    stoop: 0, talkGain: .8,
    headForm(x, y, z, out) {
      const s = x < 0 ? -1 : 1, ax = Math.abs(x), fade = smooth((y + .09) / .05);
      let dx = 0, dy = 0, dz = 0;
      // the long muzzle: everything in front of the cheeks is drawn forward and narrowed into a tapered snout
      const mz = smooth((y + .085) / .06) * (1 - smooth((y - .155) / .075)), fz = (z - .15) * smooth((z - .11) / .09), fw = smooth((z - .16) / .1) * mz;
      dz += 1.25 * fz * mz;
      dx -= x * .42 * fw;
      dy -= .045 * smooth((z - .2) / .1) * smooth((y - .08) / .08) * mz;   // the bridge slopes down to the nose
      dy += .035 * smooth((z - .2) / .1) * smooth((.02 - y) / .07) * mz;   // the lower jaw rises toward the chin
      dz -= .025 * smooth((z - .2) / .1) * smooth((.0 - y) / .06) * mz;     // a shorter, slimmer lower jaw
      // skull: broad cheekbones, flat crown, sloping forehead, a hard brow ridge over deep-set eyes
      dx += x * .1 * smooth((y + .02) / .1) * (1 - smooth((z - .18) / .08));
      dx += s * .028 * bell(y, .1, .08) * bell(z, .06, .1);
      dy -= .02 * smooth((y - .25) / .08) * bell(x, 0, .18); dz -= .028 * bell(y, .3, .07) * smooth((z + .02) / .1);
      const front = smooth((z - .1) / .08);
      dz += .026 * bell(y, .228, .022) * bell(ax, .085, .055) * front; dy -= .006 * bell(y, .228, .03) * bell(ax, .085, .05) * front;
      dz -= .016 * bell(y, .185, .022) * bell(ax, .09, .035) * front;
      dz -= .02 * bell(y, .2, .03) * bell(x, 0, .035) * front * (1 - mz * .5); // the stop
      return out.set(dx * fade, dy * fade, dz * fade);
    },
    coat(p, h, c) {
      const [hx, hy, hz] = h, ax = Math.abs(p.x);
      const grey = lin('#73716f'), dark = lin('#34353a'), pale = lin('#d3cabb'), tan = lin('#8a6f52'), mz = lin('#5a5049'), throat = lin('#9b958c');
      c.copy(grey).lerp(dark, clamp((p.y > 1.74 ? .3 : .6) * smooth((-p.z + .02) / .14) + .3 * smooth((p.y - 1.9) / .2)));
      if (p.y < 1.74 && p.y > .95 && ax < .3) c.lerp(lin('#a49d93'), .7 * bell(p.x, 0, .085) * smooth((p.z - .03) / .07) * band(p.y, 1.0, 1.72, .08)); // pale chest and belly
      if (ax > .22 && p.y > 1.3 && p.y < 1.8) c.lerp(lin('#5a595b'), .55 + .25 * smooth((ax - .5) / .3)); // darker, grizzled arms: the muscle shading reads on them
      if (p.y > 1.72 && (p.y > 1.8 || ax < .2)) { // the head and neck only (the rest-pose arms and the raised traps lie at this height too)
        const ahx = Math.abs(hx), muzzle = smooth((hz - .26) / .05);
        const under = smooth((.075 - hy) / .05) * smooth((hz - .05) / .1) + smooth((.13 - hy) / .08) * smooth((ahx - .12) / .05) * smooth((hz + .02) / .1) * .8; // pale cheeks, lips and throat
        c.lerp(tan, .55 * bell(hy, .1, .08) * smooth((ahx - .15) / .05) * smooth((.12 - hz) / .1));
        c.lerp(pale, clamp(under)); c.lerp(throat, .7 * smooth((-.02 - hy) / .05) * smooth((hz + .05) / .1));
        c.lerp(mz, .9 * muzzle * smooth((hy - .07) / .03) * bell(hx, 0, .07));                                           // grizzled bridge
        c.lerp(pale, .75 * bell(hy, .262, .02) * bell(ahx, .07, .025) * smooth((hz - .1) / .05));                         // pale brow spots
        c.lerp(dark, clamp(.7 * smooth((hy - .25) / .06) * bell(hx, 0, .09) * smooth((hz - .05) / .1) + .55 * bell(hy, .2, .016) * bell(ahx, .135, .03) * smooth((hz - .1) / .05))); // dark crown stripe, eye lines
        c.multiplyScalar(1 - .38 * bell(hy, .186, .02) * bell(ahx, .09, .04) * smooth((hz - .1) / .05)); // shade in the sockets
        c.multiplyScalar(1 - .3 * bell(hy, .21, .025) * bell(hx, 0, .03) * smooth((hz - .15) / .05));   // in the stop
        c.multiplyScalar(1 - .25 * smooth((.0 - hy) / .07) * smooth((hz - .1) / .1) * smooth((.06 - hy) / .1) * (1 - smooth((hz - .25) / .1))); // under the jaw
      }
    },
    sculpt(rig) {
      const g = rig.skin.geometry; reshapeLocal(g, p => bulk(p, FANG.build));
      paint(rig, FANG.coat);
      jaw(rig, { lip: hz => .052 - .02 * smooth((hz - .36) / .08) + .006 * bell(hz, .26, .05), from: .17, to: .5, back: .06, hinge: [.07, .04], angle: .26, depth: .02, depthZ: .012, band: .011, throat: .1, lips: '#121012', inner: '#4a1a1e' });
      // street (leather jacket) and fight (fitted tank top: the bare arms keep the lion's muscle relief, the fabric none) from the same body
      rig.castFight = dress(g, fangClothes(rig, true), { relax: 14 }); const fightGloss = new THREE.BufferAttribute(rig.castGlossOf, 1);
      rig.castBase = dress(g, fangClothes(rig), { relax: 24 }); const jacketGloss = new THREE.BufferAttribute(rig.castGlossOf, 1);
      use(g, rig.castBase); gloss(rig, jacketGloss.array, .38); rig.castGlossSets = { jacket: g.attributes.castGloss, fight: fightGloss }; rig.castWear = 'jacket';
    },
    face(rig) {
      const head = rig.joints.head, Z = (x, y) => seat(rig, x, y), m = mats(rig);
      for (const s of [-1, 1]) {
        const ex = .093, ey = .192;
        eye(rig, s, ex, ey, Z(ex, ey) - .016, { size: .03, iris: '#d18e22', yaw: .22, roll: -.18, irisSize: .76, pupilW: .36, pupilH: .62, lid: { color: 0x4e4f53, open: -.12, low: .08, tilt: -.28, edge: '#151214' } });
      }
      // the nose: a broad wet leather pad on the end of the snout, nostrils, a highlight; the philtrum runs down to the lips
      const nz = Z(0, .112), N = new Parts();
      N.sph(V(0, .112, nz - .017), V(.043, .028, .03), '#16131a'); N.sph(V(0, .126, nz - .012), V(.034, .014, .022), '#221e24');
      for (const sd of [-1, 1]) N.sph(V(sd * .021, .104, nz + .012), V(.011, .0075, .008), '#050405', [0, 0, sd * .5]);
      N.sph(V(-.012, .131, nz + .012), V(.012, .006, .005), '#8a8490'); N.ribbon([V(0, .088, nz + .006), V(0, .066, Z(0, .066) + .001)], .006, .006, '#0e0c0e', V(1, 0, 0), 6, 6);
      head.add(meshOf(N, 'Fang: nose', m.glossy));
    },
    finish(rig) {
      const j = rig.joints, m = mats(rig), head = j.head, at = (x, y, z) => V(x, y, z).sub(HEAD0);
      rig.tail.clear(); hideKit(rig); rig.bodyFurOff = true;
      // pointed ears, set high and wide; the left one has an old notch out of its edge
      for (const s of [-1, 1]) {
        const base = sHead(rig, s * .135, .3, -.02);
        ear(rig, base, [-.12, s * .25, s * -.32], { len: .155, width: .062, cup: .022, thick: .012, outer: '#55555a', inner: '#9c9186', deep: '#4a3e39', rim: '#2b2b30', notch: s < 0 ? [.55, .55] : null, bend: -.05, spring: 1 }, { colour: '#c4bcb0', len: .03, width: .009, every: 1 });
      }
      // fur: thick cheek ruff swept back, a heavy mane-like ruff round the neck above the collar, a short coat over the crown and brow
      const shoulder = p => p.y < 1.82 && Math.hypot(p.x, p.z + .02) > .14; // fur roots never on the jacket's shoulders (they would stay with the head)
      const where = { cheek: (p, n) => { const [hx, hy, hz] = hc(p), ax = Math.abs(hx); if (p.y < 1.76 || shoulder(p)) return 0; return smooth((ax - .13) / .05) * band(hy, -.09, .17, .045) * smooth((hz + .1) / .1) * (1 - smooth((hz - .2) / .06)); },
        neck: (p, n) => { if (p.y > 1.87 || p.y < 1.775 || Math.hypot(p.x, p.z + .02) > .17) return 0; const [hx, hy, hz] = hc(p); return band(p.y, 1.79, 1.86, .015) * (1 - .6 * smooth((hz - .1) / .08) * bell(hx, 0, .12)); },
        crown: (p, n) => { const [hx, hy, hz] = hc(p); return p.y > 1.8 && !shoulder(p) ? Math.max(smooth((hy - .2) / .05) * smooth((-hz + .14) / .08) * (1 - .4 * smooth((hz - .05) / .06)), smooth((-hz - .02) / .05) * smooth((hy + .02) / .05)) : 0; } };
      const ruff = tufts(rig, where.cheek, { count: 1500, len: .085, width: .024, lift: .3, droop: .22, origin: HEAD0, seed: 41, name: 'Fang: cheek ruff', flow: q => V(q.x * 1.3, -.55, -.85).normalize() });
      const neck = tufts(rig, where.neck, { count: 1300, len: .095, width: .026, lift: .34, droop: .3, origin: HEAD0, seed: 43, name: 'Fang: neck ruff', flow: q => V(q.x * .6, -1, q.z * .3 - .2).normalize() });
      const crown = tufts(rig, where.crown, { count: 1600, len: .046, width: .017, lift: .22, droop: .12, origin: HEAD0, seed: 47, name: 'Fang: crown fur', flow: q => V(q.x * .5, q.z < -.05 ? -.8 : .1, -1).normalize() });
      const brow = tufts(rig, (p) => { const [hx, hy, hz] = hc(p); return p.y > 1.9 ? bell(hy, .238, .016) * bell(Math.abs(hx), .09, .04) * smooth((hz - .12) / .04) : 0; }, { count: 140, len: .026, width: .01, lift: .5, droop: .02, origin: HEAD0, seed: 49, name: 'Fang: brows', flow: q => V(q.x * 3, .5, -.2).normalize() });
      for (const t of [ruff, neck, crown, brow]) { t.material = m.fur; head.add(t); }
      for (const t of [ruff, neck]) rig.castSprings.push({ o: t, rest: t.position.clone(), k: t === neck ? .6 : 1, kind: 'ruff' });
      // teeth: upper canines and incisors show when the mouth opens; the lower set rides on the jaw
      const lip = .052 * HS, tipZ = seat(rig, 0, .05) * HS, upper = new Parts(), lower = new Parts();
      for (const s of [-1, 1]) { upper.sph(V(s * .028, lip - .012, tipZ - .03), V(.0065, .02, .0075), '#f1ebdc', [.15, 0, s * .1]); lower.sph(V(s * .024, -.004, .006), V(.006, .017, .007), '#efe8d8', [-.2, 0, 0]); }
      for (let k = -2; k <= 2; k++) upper.sph(V(k * .0085, lip - .008, tipZ - .016 - Math.abs(k) * .003), V(.004, .007, .004), '#f4efe2');
      const up = meshOf(upper, 'Fang: upper teeth', m.glossy); up.userData.from = .1; head.add(up);
      const hinge = new THREE.Group(); hinge.position.set(0, .07 * HS, .04 * HS); head.add(hinge); hinge.userData.storyPart = true;
      const lw = new THREE.Group(); lw.position.set(0, lip - hinge.position.y - .01, tipZ - .03 - hinge.position.z); hinge.add(lw); const lt = meshOf(lower, 'Fang: lower teeth', m.glossy); lt.userData.from = .12; lw.add(lt);
      const tg = new Parts(); tg.sph(V(0, .004, -.05), V(.03, .009, .07), '#a8404c'); const tongue = meshOf(tg, 'Fang: tongue', m.glossy); tongue.userData.from = .2; lw.add(tongue);
      rig.castMouth = { lower: hinge, angle: .26, show: [up, lt, tongue], talk: FANG.talkGain };
      // whisker studs and long whiskers on the muzzle
      const W = new Parts(); for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const z = seat(rig, s * .05, .07 - k * .004) * HS, y0 = (.075 - k * .006) * HS, x0 = s * (.045 + k * .002) * HS, zz = z - .03 - k * .012; W.ribbon([V(x0, y0, zz), V(x0 + s * .06, y0 - .004 + k * .002, zz - .02), V(x0 + s * .12, y0 - .012 + k * .004, zz - .05)], .0016, .0016, '#e6e1d8', V(0, 1, 0), 10, 4); }
      head.add(meshOf(W, 'Fang: whiskers', m.parts));
      fangOutfit(rig);
      if (rig.definition?.look) rig.definition.look.value.multiplyScalar(1.5); // muscle lines read on grey fur like the lion's on tawny
      // bushy tail: a tapered core hidden in long locks
      const tl = new THREE.Group(); tl.name = 'Fang: tail'; rig.tail.add(tl); tl.position.set(0, -.04, -.2); const core = new Parts(), path = [V(0, 0, 0), V(0, -.12, -.1), V(.04, -.32, -.16), V(.08, -.52, -.12)], curve = new THREE.CatmullRomCurve3(path);
      core.ribbon(path, .07, .07, '#5a5a5e', V(1, 0, 0), 20, 10); tl.add(meshOf(core, 'Fang: tail core', m.parts));
      const roots = [], rr = rnd(9); for (let k = 0; k < 520; k++) { const u = rr(), q = curve.getPoint(u), t = curve.getTangent(u), a = rr() * Math.PI * 2, side = V(1, 0, 0).addScaledVector(t, -t.x).normalize(), nn = side.clone().applyAxisAngle(t, a); roots.push({ p: q.clone().addScaledVector(nn, .032 * (1 - .4 * u)), n: nn, colour: lin(u > .85 ? '#1e1e22' : nn.z > .2 ? '#a9a39a' : '#66666b'), len: 1 - .3 * u, flow: t.clone() }); }
      tl.add(locksAt(roots, { len: .11, width: .03, lift: .25, droop: .05, material: m.fur, flow: () => V(0, -1, 0), name: 'Fang: tail fur' }));
      rig.castSprings.push({ o: tl, rest: tl.quaternion.clone(), k: 1, kind: 'tail' });
      install(rig);
    }
  };
  const grabStreams = g => { const o = {}; for (const k of SWAP) if (g.attributes[k]) o[k] = g.attributes[k]; return o; };
  const reshapeLocal = (g, fn) => { const P = g.attributes.position, p = V(); for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); fn(p); P.setXYZ(i, p.x, p.y, p.z); } P.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); };
  /** A point on the head surface in head-joint local rest metres: (hx, hy) head coordinates, dz pushed along +z from the front surface,
   *  or with back = true the rear surface. Used for ears and hats. */
  function sHead(rig, hx, hy, dz = 0, back = false) { const z = seat(rig, hx, hy, true, .02, back, .02); return V(hx * HS, hy * HS, (z + dz) * HS); }
  function hideKit(rig) { const k = SC.kitParts(rig); for (const gname of ['gloves', 'shorts', 'boots', 'trim', 'fur']) for (const o of k[gname] || []) o.visible = false; }

  /** Fang's clothes on the skin: black leather rocker jacket (open, wide lapels, shoulder yoke, quilted creases at the elbows, belted
   *  hem, zipped cuffs) over a charcoal T-shirt; ripped faded-black jeans. Sets rig.castGlossOf (leather is glossy). */
  function fangClothes(rig, fight = false) {
    const leather = lin('#242024'), worn = lin('#4a4446'), seamC = lin('#0c0a0c'), tee = lin('#3a3d44'), teeRib = lin('#22242a'), denim = lin('#2f3542'), fadeC = lin('#5f6779'), thread = lin('#d9d6cc'), fur = lin('#6f6e6d'), tmp = new THREE.Color();
    const G = rig.castGlossOf = new Float32Array(rig.skin.geometry.attributes.position.count); let i = -1;
    return v => {
      i++; const ax = Math.abs(v.x), s = v.x < 0 ? -1 : 1;
      if (v.y > 1.79 || ax > .905 || v.y < .112) return null;
      if (v.y < 1.04 && v.arm < .5) { // jeans: faded front, side seam, rips at both knees and the left thigh with white threads across
        const cx = .15 + (1 - v.y) * .07, ang = Math.atan2(v.z, ax - cx), seamL = bell(Math.abs(ang), 0, .05) * smooth((ax - .2) / .03), front = smooth(v.z / .04);
        const fade = Math.max(.55 * bell(v.y, .78, .14) * front, .45 * bell(v.y, .52, .08) * front) * bell(ax, cx, .085);
        const rip = (cy, h, w, sx) => (sx == null || sx === s ? 1 : 0) * band(v.y, cy - h, cy + h, .008) * (1 - smooth((Math.abs(v.x - s * cx) - w) / .01)) * smooth((v.z - .02) / .03);
        const hole = Math.max(rip(.57, .035, .045), rip(.82, .022, .035, -1)), threads = hole * (.5 + .5 * Math.sin(v.y * 640)) ** 6;
        const c = tmp.copy(denim).lerp(fadeC, clamp(fade)).lerp(seamC, seamL * .5).multiplyScalar(1 - .07 * Math.sin(v.y * 820 + ax * 300)).clone();
        if (hole > 0) c.lerp(fur, smooth((hole - .3) / .4)).lerp(thread, clamp(threads * 1.2 + bell(hole, .3, .12) * .7));
        const hem = 1 - smooth((v.y - .135) / .02), crease = .003 * Math.sin(v.y * 110 + ang * 3) * bell(v.y, .3, .14);
        return { d: lerp(.014 + .008 * hem + crease, .004, smooth((hole - .25) / .5)), c, move: v.y < .93 ? trouser(v, lerp(.118, .13, smooth((v.y - .5) / .4)), smooth((.93 - v.y) / .1)) : null };
      }
      if (fight) { // a fitted charcoal tank top: no sleeves, scooped neck, bound edges, ribbed hem over the jeans
        if (v.arm > .3 || ax > .3) return null; const fr = v.z > 0;
        const neck = fr ? v.y > 1.66 && ax < .11 : v.y > 1.735; // scooped front, straps over the shoulders
        const arm = v.y > 1.4 && ax > .2 + .02 * smooth((v.y - 1.55) / .12) - .03 * smooth((1.52 - v.y) / .1); if (arm || neck || (v.y > 1.6 && ax > .175)) return null;
        const edge = Math.max(bell(ax, .2 + .02 * smooth((v.y - 1.55) / .12) - .03 * smooth((1.52 - v.y) / .1), .008) * smooth((v.y - 1.4) / .02), fr ? bell(v.y, 1.66, .008) * (ax < .12 ? 1 : 0) : 0), hem = bell(v.y, 1.06, .012);
        const c = tmp.copy(lin('#2a2c32')).lerp(lin('#1b1c21'), clamp(edge * .8 + hem * .5 + bell(v.z, -.005, .004) * smooth((ax - .2) / .03) * .6)).multiplyScalar(1 - .04 * Math.sin(v.y * 500) * Math.sin(ax * 210)).clone();
        G[i] = 0; return { d: .0045 + .0015 * edge + .002 * hem + .0012 * Math.sin(v.y * 90 + ax * 30) * bell(v.y, 1.15, .06), c };
      }
      // the jacket is open: a T-shirt shows between the fronts, wider toward the collar
      const front = smooth((v.z - .02) / .05) * (v.arm < .3 ? 1 : 0), open = .025 + .09 * smooth((v.y - 1.2) / .5), opening = front * (1 - smooth((ax - open) / .012));
      const neckLine = 1 - smooth((v.y - 1.745) / .02);
      if (opening > .5) { const rib = bell(v.y, 1.735, .01), c = tmp.copy(tee).lerp(teeRib, rib).multiplyScalar(1 - .05 * Math.sin(v.y * 700)).clone(); G[i] = 0; return { d: .006 * neckLine + .003 * rib, c, move: v.y < 1.6 ? tube(v, .34, .25, .25, 1, -.005) : null }; }
      // leather: yoke and shoulder seams, side panels, belted hem, cuffs; elbow and waist creases; worn edges
      const hem = band(v.y, 1.0, 1.055, .006), belt = band(v.y, 1.015, 1.045, .004), cuff = smooth((ax - .84) / .015), edge = front * bell(ax, open + .004, .006);
      const seams = Math.max(bell(ax, .312, .005) * smooth((v.y - 1.42) / .05), bell(v.y, 1.6, .004) * smooth((-v.z) / .04), front * bell(ax, .17, .004) * band(v.y, 1.1, 1.5, .02), bell(v.z, -.01, .004) * smooth((ax - .2) / .04) * (v.arm < .5 ? 1 : 0) * (v.y < 1.45 ? 1 : 0), v.arm > .6 ? bell(Math.atan2(v.z, v.y - 1.615), -1.57, .045) : 0);
      const elbow = v.arm > .5 ? bell(ax, .66, .05) : 0, waistC = (1 - v.arm) * bell(v.y, 1.2, .07) * smooth((ax - .1) / .1), wrinkle = (Math.sin(ax * 170) * elbow + Math.sin(v.y * 140 + ax * 20) * waistC * .7);
      const wear = clamp(.15 + .1 * Math.sin(v.y * 37 + ax * 23) * Math.sin(ax * 41 - v.z * 30) + .6 * Math.max(0, wrinkle) + .5 * edge + .35 * smooth((v.y - 1.6) / .1) * smooth(v.z / .05) * bell(ax, .2, .08) + .25 * cuff);
      const c = tmp.copy(leather).lerp(worn, wear).lerp(seamC, clamp(seams * .9 + belt * .3)).clone();
      G[i] = .85 - .3 * wear;
      const move = v.arm > .5 ? sleeve(v, lerp(.112, .078, smooth((ax - .40) / .45)), smooth((v.arm - .5) / .35)) : v.y < 1.72 ? tube(v, .33, lerp(.28, .23, smooth((v.y - 1.4) / .3)), lerp(.25, .2, smooth((v.y - 1.55) / .17)), (1 - v.arm * 2) * smooth((1.74 - v.y) / .05), -.005) : null;
      return { d: .021 + .006 * hem + .004 * belt + .005 * cuff + .0035 * wrinkle * (elbow + waistC) - .012 * smooth((v.y - 1.76) / .03), c, move };
    };
  }
  function tube(v, a, bf, bb, k = 1, zc = -.005) { const dz = v.z - zc, r = Math.hypot(v.x, dz); if (r < 1e-4) return null; const b = dz > 0 ? bf : bb, cx = v.x / r, cz = dz / r, R = a * b / Math.hypot(b * cx, a * cz); return R > r ? [cx * (R - r) * k, 0, cz * (R - r) * k] : null; }
  function sleeve(v, R, k = 1) { const dy = v.y - 1.615, r = Math.hypot(dy, v.z); return r > 1e-4 && R > r ? [0, dy / r * (R - r) * k, v.z / r * (R - r) * k] : null; }
  function trouser(v, R, k = 1) { const s = v.x < 0 ? -1 : 1, dx = v.x - s * (.15 + (1 - v.y) * .07), dz = v.z + .02 * smooth((.7 - v.y) / .3), r = Math.hypot(dx, dz); return r > 1e-4 && R > r ? [dx / r * (R - r) * k, 0, dz / r * (R - r) * k] : null; }

  /** Fang's jacket hardware and the rest: lapels and collar (skinned shells), zips, shoulder studs, the gold chain, boots, bare hands. */
  function fangOutfit(rig) {
    const j = rig.joints, m = mats(rig), B = (x, y, back) => seat(rig, x, y, false, .02, back), L = p => p.clone().sub(CHEST0);
    const open = y => .025 + .09 * smooth((y - 1.2) / .5);
    // lapels: wide notched leather lapels folded back over the chest, and the collar standing round the back of the neck
    const lap = lin('#1d1c1f'), lapEdge = lin('#3a3739');
    const lapels = shell(rig, (p, n, h) => {
      const ax = Math.abs(p.x), o = open(p.y), fr = p.z > .02;
      const onLap = fr && p.y > 1.4 && p.y < 1.775 && ax > o - .004 && ax < o + .02 + .085 * smooth((p.y - 1.42) / .25) * (1 - smooth((p.y - 1.72) / .05)) && !(bell(p.y, 1.62, .012) > .5 && ax > o + .05);
      const collar = !fr && p.y > 1.7 && p.y < 1.83 - .03 * smooth((ax - .05) / .1) && ax < .2;
      const side = !fr && false;
      if (!onLap && !collar && !side) return null;
      const out = Math.max(ax - o, 0), rim = onLap ? bell(out, .1 * smooth((p.y - 1.42) / .25), .012) : 0;
      return { d: onLap ? .012 + .003 * smooth((p.y - 1.5) / .2) : .016 + .02 * smooth((p.y - 1.74) / .05), c: lap.clone().lerp(lapEdge, clamp(rim * .7)) };
    }, { name: 'Fang: lapels and collar', material: vmat({ roughness: .42, side: THREE.DoubleSide, skinning: true }) });
    // hardware on the chest: the asymmetric front zip along one front, a chest pocket zip, snap studs on the lapel points
    const H = new Parts(), G = new Parts();
    const zipPts = [1.06, 1.15, 1.25, 1.35, 1.45, 1.55, 1.62].map(y => V(-(open(y) + .006), y, B(-(open(y) + .006), y) + .004));
    H.ribbon(zipPts.map(L), .009, .005, '#9aa0a8', V(0, 0, 1), 30, 6);
    for (let k = 0; k < 26; k++) { const q = new THREE.CatmullRomCurve3(zipPts).getPoint(k / 25); H.box(L(q).add(V(-.003, 0, .002)), V(.006, .0025, .003), '#c3c8cf'); }
    H.box(L(zipPts[0]).add(V(0, .012, .006)), V(.012, .02, .006), '#b9bec6'); // the pull
    const pz = [V(.08, 1.47), V(.17, 1.53)].map(q => V(q.x, q.y, B(q.x, q.y) + .004)); H.ribbon(pz.map(L), .007, .004, '#9aa0a8', V(0, 0, 1), 8, 6); H.box(L(pz[1]).add(V(.004, -.012, .004)), V(.008, .016, .005), '#c3c8cf');
    for (const s of [-1, 1]) { const y = 1.61, x = s * (open(y) + .07); H.sph(L(V(x, y, B(x, y) + .016)), V(.008, .008, .005), '#d4d7dc'); }
    // shoulder epaulettes with pyramid studs
    for (const s of [-1, 1]) {
      // studs on the collar-side of the shoulder only: the outer shoulder moves with the arm, a rigid strap there would stick out
      const pts = [.125, .16, .195].map(x => V(s * x, 0, .005)).map(q => V(q.x, Math.max(1.66, crest(rig, q.x, q.z, .03, .05)) + .012, q.z));
      for (const q of pts) for (const dz of [-.012, .012]) { const c = L(q).add(V(s * .02, .007, dz)); G.add(pyramid(), new THREE.Matrix4().compose(c.add(V(-s * .02, -.004, 0)), new THREE.Quaternion(), V(.009, .009, .009)), '#d9dce0'); }
    }
    const jacket = rig.castJacketParts = [lapels]; for (const [P, n] of [[H, 'Fang: jacket zips'], [G, 'Fang: jacket studs']]) { const k = meshOf(P, n, m.metal); j.chest.add(k); jacket.push(k); }
    // the gold chain: heavy curb links round the neck, hanging on the T-shirt
    const C = new Parts(), chain = new THREE.CatmullRomCurve3([V(-.115, 1.76, -.05), V(-.12, 1.72, B(.12, 1.72) + .012), V(-.07, 1.6, B(.07, 1.6) + .012), V(0, 1.535, B(0, 1.54) + .014), V(.07, 1.6, B(.07, 1.6) + .012), V(.12, 1.72, B(.12, 1.72) + .012), V(.115, 1.76, -.05)]), nL = 46;
    for (let k = 0; k <= nL; k++) { const u = k / nL, q = chain.getPoint(u), t = chain.getTangent(u), quat = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), t).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), k % 2 ? Math.PI / 2 : 0)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2)); C.add(linkGeo(), new THREE.Matrix4().compose(L(q), quat, V(.0105, .0105, .0105)), '#e2b44c'); }
    j.chest.add(meshOf(C, 'Fang: gold chain', m.gold));
    // cuff zips on the forearms
    for (const s of [-1, 1]) { const Z = new Parts(), side = s < 0 ? 'L' : 'R'; Z.ribbon([V(s * .2, -.05, -.0), V(s * .27, -.068, .0)].map(q => q.clone()), .006, .004, '#9aa0a8', V(0, 0, 1), 6, 6); Z.box(V(s * .272, -.07, 0), V(.008, .012, .005), '#c3c8cf'); const cz = meshOf(Z, 'Fang: cuff zip', m.metal); j['elbow' + side].add(cz); jacket.push(cz); }
    hands(rig, '#6f6e6d', '#1c1a1d', { claw: '#1a1718', knuckle: '#5c5b5c', k: 1.05, cuff: '#6f6e6d' });
    // fight body only: fur on the forearms (on the forearm bone, rooted on the bare skin of the fight streams)
    const g = rig.skin.geometry, keep = grabStreams(g); use(g, rig.castFight); rig.castFightParts = [];
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R', org = V(s * .6538361203, 1.62, 0);
      const t = tufts(rig, p => { const ax = Math.abs(p.x); return p.x * s > 0 && ax > .7 && ax < .9 ? .9 * (1 - smooth((p.z + .02) / .2) * .3) : 0; }, { count: 420, len: .034, width: .013, lift: .25, droop: .1, origin: org, seed: s < 0 ? 71 : 73, name: 'Fang: forearm fur', flow: q => V(s, -.25, 0).normalize() });
      t.material = m.fur; t.visible = false; j['elbow' + side].add(t); rig.castFightParts.push(t);
    }
    use(g, keep);
    shoes(rig, { upper: '#141316', toe: '#0f0e10', sole: '#1e1d1f', welt: '#3a3634', shaft: true, buckle: true, heel: .028, soleH: .03, scale: 1.08, glossy: true });
  }
  let PYR = null, LINK = null;
  function pyramid() { if (PYR) return PYR; const g = new THREE.ConeGeometry(1, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, .5, 0); PYR = g.toNonIndexed(); PYR.computeVertexNormals(); return PYR; }
  function linkGeo() { if (LINK) return LINK; const g = new THREE.TorusGeometry(1, .34, 6, 12); g.scale(1, 1.45, 1); LINK = g.toNonIndexed(); return LINK; }
  function crest(rig, x, z, rx = .03, rz = .03, below = 1.79) { const P = rig.skin.geometry.attributes.position; let best = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > below || y < best || Math.abs(P.getX(i) - x) > rx || Math.abs(P.getZ(i) - z) > rz) continue; best = y; } return best; }

  /* ================================================================ MRS. HAZEL: doe, fruit stall, headscarf, cardigan, apron, handbag */
  const HAZEL = {
    id: 'hazel', fur: '#9a6640', light: '#efe4d2',
    build: { torso: -.14, depth: -.1, belly: .02, bellyY: 1.15, chest: -.01, arm: -.2, leg: -.16, neck: -.25, hips: .06, back: 0, traps: -.02 },
    stoop: .07, talkGain: .6,
    headForm(x, y, z, out) {
      const s = x < 0 ? -1 : 1, ax = Math.abs(x), fade = smooth((y + .09) / .05);
      let dx = 0, dy = 0, dz = 0;
      // a narrow, long, gentle face: the muzzle drawn forward and slimmed, tapering to a soft round nose
      const mz = smooth((y + .08) / .06) * (1 - smooth((y - .17) / .08)), fz = (z - .15) * smooth((z - .11) / .09), fw = smooth((z - .14) / .1) * mz;
      dz += .8 * fz * mz; dx -= x * .4 * fw;
      dy -= .014 * smooth((z - .2) / .1) * smooth((y - .1) / .08) * mz; dy += .008 * smooth((z - .22) / .1) * smooth((.02 - y) / .07) * mz;
      dz += .02 * bell(y, .2, .04) * bell(x, 0, .05) * smooth((z - .12) / .06); // a straight bridge from brow to nose (no stop)
      // narrower skull, a domed forehead, cheeks that fall away under big side-set eyes; the whole head a little smaller
      dx -= x * .1 * smooth((y + .02) / .1) * (1 - fw);
      dy += .012 * smooth((y - .22) / .1) * bell(x, 0, .15);
      dx += s * .012 * bell(y, .185, .03) * bell(z, .08, .06); // the eyes sit out on the sides of the head
      dx -= s * .012 * bell(y, .06, .05) * smooth((z - .12) / .08);
      dy -= .022; // a slightly shorter neck: she stands a little lower than the fighters
      const K = .93; dx += x * (K - 1); dy += (y + .05) * (K - 1); dz += z * (K - 1);
      return out.set(dx * fade, dy * fade, dz * fade);
    },
    coat(p, h, c) {
      const [hx, hy, hz] = h, ahx = Math.abs(hx), red = lin('#87603f'), deep = lin('#5c3d27'), pale = lin('#f1e7d6'), grey = lin('#b8ab9c');
      c.copy(red).lerp(deep, clamp(.6 * smooth((-p.z + .02) / .14)));
      if (p.y > 1.62) {
        const muzzleTip = smooth((hz - .26) / .04);
        c.lerp(pale, clamp(smooth((.04 - hy) / .04) * smooth((hz - .08) / .1) + .85 * bell(hy, .085, .02) * smooth((hz - .3) / .03)));   // white chin and upper lip
        c.lerp(pale, .9 * bell(hy, .185, .022) * bell(ahx, .125, .045) * smooth((hz - .02) / .06));                                                                      // pale eye rings
        c.lerp(grey, .45 * muzzleTip * smooth((hy - .05) / .05));                                                                                                       // greying muzzle (an older face)
        c.lerp(deep, .55 * smooth((hy - .2) / .05) * bell(hx, 0, .05) * smooth((hz - .1) / .05));                                                                         // darker forehead blaze
        if (p.y < 1.83 && Math.abs(p.x) < .2) { const sp = Math.max(0, Math.sin(p.x * 95 + 1.3) * Math.sin(p.y * 120) * Math.sin(p.z * 70 + p.x * 40)); c.lerp(pale, .8 * smooth((sp - .45) / .12) * smooth((-p.z + .1) / .1) * band(p.y, 1.66, 1.8, .02)); } // light spots on the neck
        c.lerp(pale, .85 * band(p.y, 1.66, 1.79, .02) * smooth((p.z - .03) / .05) * bell(p.x, 0, .07));                                                                  // white throat
        c.multiplyScalar(1 - .3 * bell(hy, .175, .016) * bell(ahx, .125, .035) * smooth((hz - .02) / .06) * 0 - .22 * bell(hy, .045, .02) * bell(ahx, .07, .04) * smooth((hz - .18) / .06)); // shade at the mouth corners
      }
    },
    sculpt(rig) {
      const g = rig.skin.geometry; reshapeLocal(g, p => bulk(p, HAZEL.build)); paint(rig, HAZEL.coat);
      jaw(rig, { lip: hz => .045 - .015 * smooth((hz - .3) / .06), from: .17, to: .45, back: .07, hinge: [.07, .05], angle: .18, depth: .012, depthZ: .008, band: .01, throat: .09, lips: '#2a1d1c', inner: '#5a2a2c' });
      rig.castBase = dress(g, hazelClothes(rig), { relax: 24 }); use(g, rig.castBase);
    },
    face(rig) {
      const head = rig.joints.head, Z = (x, y) => seat(rig, x, y), m = mats(rig);
      for (const s of [-1, 1]) {
        const ex = .112, ey = .182;
        eye(rig, s, ex, ey, Z(ex, ey) - .019, { size: .044, iris: '#3b2416', yaw: .55, roll: .06, irisSize: .84, pupilW: .5, pupilH: .62, tall: .8, lid: { color: 0x8a6142, open: .2, low: .06, tilt: -.14 } });
        const lash = new Parts(), base = V(s * ex, ey + .03, Z(ex, ey + .03) - .002);
        for (let k = 0; k < 6; k++) { const t = (k - 2.5) / 2.5, p0 = V(base.x + s * t * .026 + s * .006, base.y - .003 * t * t, base.z - .004 * Math.abs(t) - .012 * (s * t > 0 ? t : 0)); lash.ribbon([p0, p0.clone().add(V(s * (.006 + .008 * t), .008, .006)), p0.clone().add(V(s * (.012 + .014 * t), .012, .006))], .0028, .0018, '#120c0b', V(0, 0, 1), 6, 4); }
        head.add(meshOf(lash, 'Hazel: lashes', m.parts));
      }
      const nz = Z(0, .118), N = new Parts();
      N.sph(V(0, .118, nz - .014), V(.034, .024, .022), '#1b1416'); for (const sd of [-1, 1]) N.sph(V(sd * .019, .108, nz + .008), V(.009, .006, .006), '#060404', [0, 0, sd * .5]);
      N.sph(V(-.01, .13, nz + .008), V(.009, .005, .004), '#958a90'); N.ribbon([V(0, .095, nz + .004), V(0, .07, Z(0, .07) + .001)], .005, .005, '#2b1d1d', V(1, 0, 0), 6, 6);
      // smile lines of an older, kind face
      for (const s of [-1, 1]) for (const k of [0, 1]) N.ribbon([V(s * (.15 + k * .006), .19 - k * .012, Z(.15 + k * .006, .19 - k * .012) - .003), V(s * (.168 + k * .006), .182 - k * .016, Z(.168 + k * .006, .182 - k * .016) - .004)], .003, .0025, '#6b4630', V(0, 0, 1), 4, 4); // crow's feet
      head.add(meshOf(N, 'Hazel: nose', m.glossy));
    },
    finish(rig) {
      const j = rig.joints, m = mats(rig), head = j.head;
      rig.tail.clear(); hideKit(rig); rig.bodyFurOff = true;
      // long oval ears out from under the scarf, held sideways
      for (const s of [-1, 1]) ear(rig, sHead(rig, s * .17, .25, -.06), [-.15, s * .35, s * -1.15], { len: .2, width: .066, cup: .03, thick: .01, outer: '#8c5a35', inner: '#e9d8c6', deep: '#c49b86', rim: '#3a2618', shape: u => Math.pow(Math.sin(Math.PI * Math.min(1, u * .92 + .08)), .7) * (1 - .25 * u), spring: 1.3 }, { colour: '#f4ece1', len: .026, width: .008, every: 1 });
      // the headscarf: a printed kerchief over the crown and the back of the head, tied at the nape (a skinned shell on the head)
      const sc = lin('#a6342a'), scDark = lin('#7d2420'), dot = lin('#f0d9a8'), leaf = lin('#3f6b46');
      head.updateWorldMatrix(true, false);
      const scarf = shell(rig, (p, n, h) => {
        const [hx, hy, hz] = h; if (p.y < 1.78 || hz > .2) return null;
        const front = smooth((hz - .0) / .12), edge = lerp(-.005, .315, front) + .015 * Math.sin(hx * 30) * front; if (hy < edge) return null;
        const u = hx * 26, w = hy * 26 + hz * 18, fx = u - Math.floor(u) - .5, fy = w - Math.floor(w) - .5, dots = 1 - smooth((Math.hypot(fx, fy) - .16) / .06);
        const border = smooth((edge + .028 - hy) / .01), c = sc.clone().lerp(dot, dots * .9 * (1 - border)).lerp(scDark, border * .85).lerp(leaf, border * dots * .7);
        return { d: .01 + .005 * smooth((-hz) / .1), c };
      }, { name: 'Hazel: headscarf', roughness: .8 });
      // the knot at the nape and its two tails
      const K = new Parts(), nape = sHead(rig, 0, .02, -.01, true);
      K.sph(nape.clone().add(V(0, .01, -.012)), V(.038, .03, .028), '#9a2f26');
      for (const s of [-1, 1]) K.ribbon([nape.clone().add(V(s * .01, 0, -.02)), nape.clone().add(V(s * .04, -.05, -.03)), nape.clone().add(V(s * .055, -.11, -.02))], .045, .008, '#a6342a', V(s, 0, .4), 12, 8);
      head.add(meshOf(K, 'Hazel: scarf knot', m.parts));
      hazelOutfit(rig);
      install(rig);
    }
  };
  /** Mrs. Hazel's clothes on the skin: a soft heather cardigan (ribbed hem and cuffs, buttons, patch pockets) open over a plum dress
   *  with a small white print; fawn stockings below the skirt (the skirt is its own skinned drape). */
  function hazelClothes(rig) {
    const card = lin('#7f8f73'), cardRib = lin('#66765c'), dress0 = lin('#6b2a3e'), dot = lin('#efe1cf'), stock = lin('#8a6a52'), tmp = new THREE.Color();
    return v => {
      const ax = Math.abs(v.x);
      if (v.y > 1.775 || ax > .9 || v.y < .112) return null;
      if (v.y < 1.0 && v.arm < .5) return { d: .003, c: tmp.copy(stock).multiplyScalar(1 - .05 * Math.sin(v.y * 400)).clone(), move: null }; // stockings
      const front = smooth((v.z - .02) / .05) * (v.arm < .3 ? 1 : 0), open = .03 + .06 * smooth((v.y - 1.3) / .4), inside = front * (1 - smooth((ax - open) / .01));
      if (inside > .5) { const pr = Math.max(0, Math.sin(v.x * 260) * Math.sin(v.y * 260)); return { d: .006 - .004 * smooth((v.y - 1.7) / .05), c: tmp.copy(dress0).lerp(dot, smooth((pr - .8) / .1) * .9).clone() }; }
      const hem = bell(v.y, 1.025, .022) * (1 - v.arm), cuff = smooth((ax - .83) / .025), edge = front * bell(ax, open + .012, .01), knit = .5 + .5 * Math.sin((v.arm > .5 ? ax : v.y) * 560);
      const pocket = front * band(v.y, 1.06, 1.18, .006) * band(ax, .1, .22, .006), pEdge = front * Math.max(bell(v.y, 1.18, .005) * band(ax, .1, .22, .006), band(v.y, 1.06, 1.18, .006) * Math.max(bell(ax, .1, .005), bell(ax, .22, .005)));
      const seam = Math.max(bell(ax, .315, .006) * smooth((v.y - 1.42) / .05), v.arm > .6 ? bell(Math.atan2(v.z, v.y - 1.615), -1.57, .05) : 0);
      const c = tmp.copy(card).lerp(cardRib, clamp(Math.max(hem, cuff, edge) * (.5 + .5 * knit) + pEdge * .9 + seam * .8)).multiplyScalar(1 - .025 * Math.sin(v.y * 300 + ax * 80) * Math.sin(ax * 320 + v.z * 220)).clone();
      const move = v.arm > .5 ? sleeve(v, lerp(.088, .062, smooth((ax - .40) / .48)), smooth((v.arm - .5) / .35)) : v.y < 1.72 ? tube(v, .25, lerp(.22, .19, smooth((v.y - 1.4) / .3)), lerp(.22, .18, smooth((v.y - 1.55) / .17)), (1 - v.arm * 2) * smooth((1.74 - v.y) / .05)) : null;
      return { d: .016 + .006 * Math.max(hem, cuff) + .004 * pocket + .004 * edge - .008 * smooth((v.y - 1.73) / .04), c, move };
    };
  }
  function hazelOutfit(rig) {
    const j = rig.joints, m = mats(rig), B = (x, y, back) => seat(rig, x, y, false, .02, back), L = p => p.clone().sub(SPINE0);
    // the skirt of the dress, calf length, with the stall apron over its front
    const w0 = waist(rig, 1.0), w1 = waist(rig, .9), w2 = waist(rig, .74), [rx, rz] = w0, plum = lin('#6b2a3e'), plumD = lin('#561f31'), dot = lin('#efe1cf'), ap = lin('#e9dfc8'), apS = lin('#6f8f6a'), apD = lin('#b9ab8e');
    const skirt = drape(rig, { name: 'Hazel: skirt and apron', rings: [[1.0, rx + .006, rz + .008], [.9, Math.max(w1[0], rx) + .03, Math.max(w1[1], rz) + .035], [.7, Math.max(w2[0], rx) + .07, Math.max(w2[1], rz) + .075], [.4, Math.max(w2[0], rx) + .12, Math.max(w2[1], rz) + .115]], segs: 84, sub: 7, folds: [9, .06],
      legFrom: 1.0, legSpan: .34, legMax: .85,
      colour: (y, a, u, x, z) => {
        const c = plum.clone().lerp(plumD, .45 * (.5 + .5 * Math.sin(a * 9 + .7)) * u);
        const apron = Math.abs(a) < .95 && y > .5; if (!apron) return c.lerp(plumD, smooth((.43 - y) / .02) * .6);
        const stripe = .5 + .5 * Math.sin(x * 220), pocket = band(y, .76, .88, .006) * band(Math.abs(x), .04, .17, .006), pe = Math.max(bell(y, .88, .004), bell(Math.abs(x), .04, .004), bell(Math.abs(x), .17, .004)) * band(y, .76, .88, .006) * band(Math.abs(x), .03, .18, .006);
        return ap.clone().lerp(apS, .06 * stripe).lerp(apD, clamp(pe * .9 + smooth((.53 - y) / .02) * .6 + bell(Math.abs(a), .95, .03) * .7)).multiplyScalar(1 - pocket * .04);
      }, dz: (a, u) => .012 * smooth((.95 - Math.abs(a)) / .1) });
    // the apron waistband and bow at the back; cardigan buttons
    const W = new Parts(), band0 = 1.045;
    W.ribbon([-1.2, -.6, 0, .6, 1.2].map(a => V(Math.sin(a) * (rx + .02), band0 - 1.13, Math.cos(a) * (rz + .024) - .005)), .028, .007, '#d8cdb3', V(0, 1, 0), 24, 6);
    const back = V(0, band0 - 1.13, -(rz + .02)); W.sph(back.clone().add(V(0, 0, -.006)), V(.018, .016, .012), '#d8cdb3');
    for (const s of [-1, 1]) { W.ribbon([back, back.clone().add(V(s * .05, .02, -.012)), back.clone().add(V(s * .07, -.005, -.01)), back.clone()], .025, .006, '#d8cdb3', V(0, 0, 1), 14, 6); W.ribbon([back, back.clone().add(V(s * .02, -.08, -.01)), back.clone().add(V(s * .035, -.14, -.006))], .024, .005, '#d8cdb3', V(0, 0, 1), 10, 6); }
    j.spine.add(meshOf(W, 'Hazel: apron ties', m.parts));
    const Bt = new Parts(); for (const y of [1.25, 1.33, 1.41, 1.49]) { const x = .03 + .06 * smooth((y - 1.3) / .4) + .016; Bt.sph(V(-x, y, B(-x, y) + .004).sub(CHEST0), V(.011, .011, .005), '#d7c9a7'); }
    j.chest.add(meshOf(Bt, 'Hazel: buttons', m.glossy));
    // a cardigan collar lying round the neck (skinned)
    const col = lin('#6f7f64');
    shell(rig, (p, n, h) => { const ax = Math.abs(p.x), open = .03 + .06 * smooth((p.y - 1.3) / .4); if (p.y < 1.68 || p.y > 1.77 || ax > .2) return null; if (p.z > .02 && ax < open) return null; return { d: .022 + .006 * smooth((p.y - 1.7) / .05), c: col.clone().multiplyScalar(1 - .08 * Math.sin(Math.atan2(p.x, p.z) * 60)) }; }, { name: 'Hazel: cardigan collar', roughness: .95 });
    hands(rig, '#8d5c3a', '#2e2220', { k: .92, cuff: '#8d5c3a' });
    shoes(rig, { upper: '#4a2b22', toe: '#3c231c', sole: '#2a1c18', welt: '#2a1c18', strap: '#3c231c', scale: .9, glossy: true });
    // the handbag in her left hand, hanging by its handles (kept upright; swings a little)
    const bag = new THREE.Group(); bag.name = 'Hazel: handbag'; j.handL.add(bag); bag.position.set(0, -.11, .02); bag.userData.storyPart = true;
    const Hb = new Parts(), tan = '#7b4425';
    Hb.box(V(0, -.16, 0), V(.2, .15, .075), tan); Hb.box(V(0, -.095, 0), V(.205, .03, .079), '#6a3a20'); Hb.ribbon([V(-.1, -.235, .039), V(.1, -.235, .039)], .004, .003, '#4e2a16', V(0, 1, 0), 4, 4);
    Hb.ribbon([V(-.06, -.09, 0), V(-.04, -.01, 0), V(0, .015, 0), V(.04, -.01, 0), V(.06, -.09, 0)], .012, .008, '#5a3019', V(0, 0, 1), 18, 6);
    const Hg = new Parts(); Hg.tor(V(0, -.105, .041), V(.014, .01, .01), '#e2b44c', [0, 0, 0]); for (const s of [-1, 1]) Hg.sph(V(s * .06, -.088, 0), V(.006, .006, .006), '#e2b44c');
    bag.add(meshOf(Hb, 'Hazel: handbag leather', m.glossy)); bag.add(meshOf(Hg, 'Hazel: handbag clasp', m.gold));
    rig.castSprings.push({ o: bag, rest: bag.quaternion.clone(), k: 1, kind: 'bag' }); rig.castProps = { handbag: bag };
  }

  /* ================================================================ OTTO: otter, shop owner, reading glasses, tape measure, apron */
  const OTTO = {
    id: 'otto', fur: '#5b3a24', light: '#d9c4a6',
    build: { torso: .13, depth: .2, belly: .13, bellyY: 1.17, bellyH: .2, chest: 0, arm: .0, leg: .1, neck: 1.1, hips: .13, back: .02, traps: .06 },
    stoop: .03, talkGain: .7,
    headForm(x, y, z, out) {
      const s = x < 0 ? -1 : 1, ax = Math.abs(x), fade = smooth((y + .1) / .06);
      let dx = 0, dy = 0, dz = 0;
      // broad, flat-topped round head; a short wide blunt muzzle with full whisker pads
      dx += x * .16 * smooth((y + .04) / .1) * (1 - smooth((z - .2) / .08));
      dy -= .05 * smooth((y - .17) / .12) * (.6 + .4 * bell(x, 0, .25)); dx -= x * .18 * smooth((y - .2) / .1);
      dz -= .03 * smooth((y - .22) / .08) * smooth((z + .05) / .1);
      const pad = bell(y, .07, .05) * bell(ax, .075, .05) * smooth((z - .15) / .06); dx += s * .028 * pad; dz += .03 * pad; dy -= .01 * pad;
      const mz = smooth((y + .05) / .05) * (1 - smooth((y - .14) / .05)) * smooth((z - .16) / .08); dz += .02 * mz;
      dz += .01 * bell(y, -.03, .03) * bell(x, 0, .07) * smooth((z - .1) / .06);
      dz -= .012 * bell(y, .19, .025) * bell(ax, .1, .035) * smooth((z - .08) / .08);
      dy -= .035; // the neck is short: the head sits down into the shoulders
      return out.set(dx * fade, dy * fade, dz * fade);
    },
    coat(p, h, c) {
      const [hx, hy, hz] = h, ahx = Math.abs(hx), ax = Math.abs(p.x), brown = lin('#5a3822'), deep = lin('#3a2416'), pale = lin('#d5bea0'), mid = lin('#8b6446');
      c.copy(brown).lerp(deep, clamp(.6 * smooth((-p.z + .02) / .14) + .3 * smooth((p.y - 1.9) / .15) * bell(p.x, 0, .1)));
      if (p.y > 1.6) {
        c.lerp(mid, clamp(smooth((.16 - hy) / .08) * smooth((hz - .02) / .1))); c.lerp(pale, clamp(smooth((.1 - hy) / .07) * smooth((hz - .16) / .08) * (1 - .3 * smooth((hy - .08) / .04))));              // pale muzzle and cheeks
        c.lerp(pale, .85 * band(p.y, 1.6, 1.79, .025) * smooth((p.z - .0) / .06) * (1 - smooth((ax - .17) / .04)));                                                    // the lighter throat
        c.lerp(mid, .5 * bell(hy, .2, .05) * smooth((hz - .1) / .05));
        c.multiplyScalar(1 - .3 * bell(hy, .186, .02) * bell(ahx, .1, .035) * smooth((hz - .08) / .06) - .25 * bell(hy, .025, .02) * bell(ahx, .08, .05) * smooth((hz - .15) / .05));
      }
    },
    sculpt(rig) {
      const g = rig.skin.geometry; reshapeLocal(g, p => bulk(p, OTTO.build)); paint(rig, OTTO.coat);
      jaw(rig, { lip: hz => .03 + .004 * bell(hz, .26, .04), from: .16, to: .36, back: .05, hinge: [.06, .04], angle: .2, depth: .014, depthZ: .01, band: .01, throat: .08, lips: '#2a1a14', inner: '#62302e' });
      rig.castBase = dress(g, ottoClothes(rig), { relax: 24 }); use(g, rig.castBase);
      const P = g.attributes.position, G = new Float32Array(P.count); for (let i = 0; i < P.count; i++) if (P.getY(i) > 1.72) G[i] = .7; gloss(rig, G, .5); // the wet-look sheen of otter fur
    },
    face(rig) {
      const head = rig.joints.head, Z = (x, y) => seat(rig, x, y), m = mats(rig);
      for (const s of [-1, 1]) { const ex = .098, ey = .175; eye(rig, s, ex, ey, Z(ex, ey) - .014, { size: .026, iris: '#2a1810', yaw: .18, irisSize: .86, pupilW: .5, pupilH: .6, lid: { color: 0x4f321e, open: .04, low: .02, tilt: .1, edge: '#1a100b' } }); }
      const nz = Z(0, .1), N = new Parts();
      N.sph(V(0, .1, nz - .01), V(.05, .03, .03), '#17110f'); N.sph(V(0, .116, nz - .004), V(.036, .012, .018), '#2a201c');
      for (const sd of [-1, 1]) N.sph(V(sd * .024, .093, nz + .01), V(.01, .007, .007), '#050303', [0, 0, sd * .4]);
      N.sph(V(-.014, .113, nz + .012), V(.011, .005, .004), '#8e868a'); N.ribbon([V(0, .074, nz + .004), V(0, .05, Z(0, .05) + .001)], .005, .005, '#2a1a14', V(1, 0, 0), 6, 6);
      for (const s of [-1, 1]) for (let k = 0; k < 9; k++) N.sph(V(s * (.045 + (k % 3) * .018), .085 - Math.floor(k / 3) * .014, Z(.045 + (k % 3) * .018, .085 - Math.floor(k / 3) * .014) - .001), V(.003, .003, .002), '#3a2618'); // whisker pores
      head.add(meshOf(N, 'Otto: nose', m.glossy));
    },
    finish(rig) {
      const j = rig.joints, m = mats(rig), head = j.head;
      rig.tail.clear(); hideKit(rig); rig.bodyFurOff = true;
      // small round ears low on the sides of the head
      for (const s of [-1, 1]) ear(rig, sHead(rig, s * .205, .13, -.1), [0, s * .9, s * -.9], { len: .034, width: .026, cup: .008, thick: .008, outer: '#4a2e1c', inner: '#7a5a46', rim: '#2f1d12', shape: u => Math.sin(Math.PI * Math.min(1, u * .85 + .15)), spring: .5 }, null);
      // long whiskers from the pads; dense short glossy fur over the crown and the cheeks
      const W = new Parts(), wz = (x, y) => seat(rig, x, y) * HS;
      for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const y = (.09 - k * .009) * HS, x = s * (.06 + (k % 2) * .02) * HS, z = wz(Math.abs(x / HS), y / HS) - .004; W.ribbon([V(x, y, z), V(x + s * .07, y - .005 + k * .002, z - .01), V(x + s * .15, y - .02 + k * .005, z - .045)], .0017, .0017, '#efe9de', V(0, 1, 0), 10, 4); }
      head.add(meshOf(W, 'Otto: whiskers', m.parts));
      const cheek = tufts(rig, (p) => { const [hx, hy, hz] = hc(p), ax = Math.abs(hx); return p.y > 1.74 ? smooth((ax - .14) / .04) * band(hy, -.06, .14, .04) * smooth((hz + .08) / .1) * (1 - smooth((hz - .16) / .05)) : 0; }, { count: 700, len: .04, width: .017, lift: .22, droop: .15, origin: HEAD0, seed: 61, name: 'Otto: cheek fur', flow: q => V(q.x * 1.6, -.6, -.6).normalize() });
      const crown = tufts(rig, (p) => { const [hx, hy, hz] = hc(p); return p.y > 1.9 ? smooth((hy - .18) / .05) * smooth((-hz + .12) / .08) : 0; }, { count: 700, len: .03, width: .014, lift: .18, droop: .05, origin: HEAD0, seed: 67, name: 'Otto: crown fur', flow: q => V(q.x * .4, .05, -1).normalize() });
      for (const t of [cheek, crown]) { t.material = m.fur; head.add(t); } rig.castSprings.push({ o: cheek, rest: cheek.position.clone(), k: .7, kind: 'ruff' });
      // reading glasses low on the muzzle, the cord round behind the head and down to the chest
      const Gl = new Parts(), bridgeY = .162 * HS, gz = wz(0, .162) + .004;
      const lensC = []; for (const s of [-1, 1]) { const cx = s * .05, cy = .15 * HS, cz = wz(.05 * 1.11, .15) + .002; lensC.push(V(cx, cy, cz)); Gl.tor(V(cx, cy, cz), V(.033, .024, .02), '#6b4a2a', [0, s * .12, 0]); Gl.ribbon([V(s * .083, cy + .004, cz - .006), V(s * .15, cy + .02, cz - .07), V(s * .19, cy + .02, wz(.21, .16) - .14)], .005, .004, '#6b4a2a', V(0, 1, 0), 10, 6); }
      Gl.ribbon([V(-.018, bridgeY - .004, gz), V(0, bridgeY + .004, gz + .004), V(.018, bridgeY - .004, gz)], .006, .004, '#6b4a2a', V(0, 0, 1), 8, 6);
      head.add(meshOf(Gl, 'Otto: glasses frame', m.glossy));
      const Ln = new Parts(); for (const c of lensC) Ln.sph(c, V(.031, .022, .003), '#ffffff'); const lens = meshOf(Ln, 'Otto: lenses', m.lens); lens.castShadow = false; head.add(lens);
      ottoOutfit(rig);
      // a thick tapering otter tail
      const tl = new THREE.Group(); tl.name = 'Otto: tail'; rig.tail.add(tl); tl.position.set(0, -.08, -.2); const T = new Parts();
      T.ribbon([V(0, 0, 0), V(0, -.15, -.12), V(0, -.36, -.17), V(0, -.55, -.12)], .11, .085, '#4c301d', V(1, 0, 0), 22, 12); T.sph(V(0, .0, .01), V(.06, .06, .05), '#4c301d');
      tl.add(meshOf(T, 'Otto: tail', m.glossy)); rig.castSprings.push({ o: tl, rest: tl.quaternion.clone(), k: .6, kind: 'tail' });
      install(rig);
    }
  };
  /** Otto's clothes on the skin: a red flannel check shirt with the sleeves rolled to the elbow, a navy canvas shop apron bib over it,
   *  brown corduroy trousers. The apron's skirt is its own skinned drape. */
  function ottoClothes(rig) {
    const red = lin('#8e2a24'), dk = lin('#4b1513'), lt = lin('#c9a07a'), navy = lin('#24324b'), navyD = lin('#1a2437'), stitch = lin('#d9c9a3'), cord = lin('#6a4a2e'), cordD = lin('#523823'), tmp = new THREE.Color();
    return v => {
      const ax = Math.abs(v.x);
      if (v.y > 1.775 || v.y < .112) return null;
      if (v.arm > .5 && ax > .66) return null; // fur forearms below the rolled sleeves
      if (v.y < 1.04 && v.arm < .5) { const wale = .5 + .5 * Math.sin(Math.atan2(v.z, ax - (.15 + (1 - v.y) * .07)) * 40); return { d: .015 + .002 * wale + .008 * (1 - smooth((v.y - .135) / .02)), c: tmp.copy(cord).lerp(cordD, wale * .5).clone(), move: v.y < .93 ? trouser(v, lerp(.12, .135, smooth((v.y - .5) / .4)), smooth((.93 - v.y) / .1)) : null }; }
      // apron bib on the front of the chest and belly (straps over the shoulders go in parts)
      const front = smooth((v.z - .03) / .04) * (v.arm < .3 ? 1 : 0), bibW = .15 + .07 * smooth((1.42 - v.y) / .2), bib = front * (1 - smooth((ax - bibW) / .008)) * (1 - smooth((v.y - 1.58) / .008));
      const cu = v.arm > .5 ? Math.atan2(v.z, v.y - 1.615) * .1 : Math.atan2(v.x, v.z + .02) * .2, cv = v.arm > .5 ? ax : v.y, chk = smooth((Math.sin(cv * 48) - .2) / .2) + smooth((Math.sin(cu * 48 * 1.6) - .2) / .2), chkFine = false;
      const rolled = v.arm > .5 ? band(ax, .6, .665, .006) : 0, collarSh = bell(v.y, 1.75, .015);
      if (bib > .5) {
        const pocket = band(v.y, 1.2, 1.34, .006) * band(ax, .03, .14, .006), pe = Math.max(bell(v.y, 1.34, .004) * band(ax, .03, .14, .006), band(v.y, 1.2, 1.34, .006) * Math.max(bell(ax, .03, .004), bell(ax, .14, .004)), bell(ax, bibW - .008, .003)) ;
        return { d: .028 + .005 * pocket, c: tmp.copy(navy).lerp(navyD, pocket * .35).lerp(stitch, pe * .85).multiplyScalar(1 - .05 * Math.sin(v.y * 600 + ax * 200)).clone(), move: v.y < 1.6 ? tube(v, .36, .3, .27, 1) : null };
      }
      const c = tmp.copy(red).lerp(dk, chk * .34).lerp(lt, chkFine ? .3 : 0).lerp(dk, collarSh * .3).clone();
      const move = v.arm > .5 ? sleeve(v, lerp(.09, .08, smooth((ax - .40) / .26)) + .012 * rolled, smooth((v.arm - .5) / .35)) : v.y < 1.72 ? tube(v, .33, lerp(.3, .22, smooth((v.y - 1.4) / .3)), lerp(.27, .2, smooth((v.y - 1.55) / .17)), (1 - v.arm * 2) * smooth((1.74 - v.y) / .05)) : null;
      return { d: .014 + .01 * rolled - .006 * smooth((v.y - 1.73) / .04), c, move };
    };
  }
  function ottoOutfit(rig) {
    const j = rig.joints, m = mats(rig), B = (x, y, back) => seat(rig, x, y, false, .02, back), L = p => p.clone().sub(CHEST0);
    const [rx, rz] = waist(rig, 1.05), navy = lin('#24324b'), navyD = lin('#1a2437'), stitch = lin('#d9c9a3');
    drape(rig, { name: 'Otto: apron', rings: [[1.08, rx + .03, rz + .035], [.9, rx + .04, rz + .05], [.62, rx + .05, rz + .06]], arc: [-1.25, 1.25], segs: 48, sub: 6, folds: [5, .02], legFrom: 1.0, legSpan: .36, legMax: .8,
      colour: (y, a, u, x) => { const pocket = band(y, .8, .94, .006) * band(Math.abs(x), .03, .17, .006), pe = Math.max(bell(y, .94, .004) * band(Math.abs(x), .03, .17, .006), band(y, .8, .94, .006) * Math.max(bell(Math.abs(x), .03, .004), bell(Math.abs(x), .17, .004)), bell(Math.abs(a), 1.24, .02), smooth((.635 - y) / .01)); return navy.clone().lerp(navyD, pocket * .3 + .2 * (.5 + .5 * Math.sin(a * 5 + .7)) * u).lerp(stitch, clamp(pe) * .85); } });
    // apron neck strap, waist ties, a pencil and a folded rule in the pockets, the tape measure round the neck
    const P = new Parts();
    for (const s of [-1, 1]) P.ribbon([V(s * .15, 1.58, B(s * .15, 1.58) + .028), V(s * .12, 1.7, B(s * .12, 1.7) + .022), V(s * .08, 1.775, -.0), V(0, 1.79, -.07)].map(L), .03, .006, '#24324b', V(0, 0, 1), 14, 6);
    const [wx, wz] = waist(rig, 1.08), Ties = new Parts(), LS = p => p.clone().sub(SPINE0); for (const s of [-1, 1]) Ties.ribbon([V(s * .2, 1.08, wz * .4), V(s * (wx + .03), 1.08, 0), V(s * .1, 1.08, -wz - .03), V(0, 1.075, -wz - .035)].map(LS), .025, .006, '#24324b', V(0, 1, 0), 16, 6);
    Ties.sph(LS(V(0, 1.075, -wz - .04)), V(.022, .018, .012), '#24324b'); j.spine.add(meshOf(Ties, 'Otto: apron ties', m.parts));
    P.box(L(V(.09, 1.36, B(.09, 1.36) + .034)), V(.008, .07, .008), '#d4a640'); P.sph(L(V(.09, 1.4, B(.09, 1.4) + .034)), V(.005, .006, .005), '#d68a8a'); // pencil in the bib pocket
    const tape = [V(-.11, 1.775, -.04), V(-.12, 1.72, B(.12, 1.72) + .03), V(-.1, 1.6, B(.1, 1.6) + .034), V(-.095, 1.45, B(.095, 1.45) + .036), V(-.1, 1.36, B(.1, 1.36) + .036)];
    const tape2 = [V(.11, 1.775, -.04), V(.12, 1.72, B(.12, 1.72) + .03), V(.11, 1.6, B(.11, 1.6) + .034), V(.115, 1.5, B(.115, 1.5) + .036)];
    const back = [V(-.11, 1.775, -.04), V(-.06, 1.8, -.1), V(.06, 1.8, -.1), V(.11, 1.775, -.04)];
    for (const path of [tape, tape2, back]) P.ribbon(path.map(L), .02, .0025, '#e8c22e', V(0, 0, 1), 28, 6, q => V(q.x, 0, q.z + .3).normalize());
    for (const path of [tape, tape2]) { const cv = new THREE.CatmullRomCurve3(path); for (let k = 1; k < 22; k++) { const q = cv.getPoint(k / 22), t = cv.getTangent(k / 22), side = V(0, 0, 1).cross(t).normalize(); P.ribbon([L(q).add(V(0, 0, .002)).addScaledVector(side, -.009), L(q).add(V(0, 0, .002)).addScaledVector(side, k % 5 ? -.003 : .002)], .0016, .0016, '#1c1a16', V(0, 0, 1), 2, 4); } }
    P.box(L(V(-.1, 1.345, B(.1, 1.345) + .036)), V(.022, .02, .004), '#9aa0a8');
    j.chest.add(meshOf(P, 'Otto: straps, tape measure, pencil', m.parts));
    const Bt = new Parts(); for (const y of [1.62, 1.69]) Bt.sph(L(V(0, y, B(0, y) + .006)), V(.008, .008, .004), '#efe6d2'); for (const s of [-1, 1]) Bt.sph(L(V(s * .14, 1.57, B(s * .14, 1.57) + .032)), V(.011, .011, .006), '#b8bcc4');
    j.chest.add(meshOf(Bt, 'Otto: buttons and rivets', m.metal));
    // the shirt collar (skinned): points lying on the chest either side of the top button
    const shirt = lin('#8e2a24'), dk = lin('#4b1513');
    shell(rig, (p, n) => { const ax = Math.abs(p.x); if (p.y < 1.66 || p.y > 1.785 || ax > .19) return null; if (p.z > .02 && ax < .012) return null; const pt = p.z > .02 ? smooth((1.73 - p.y) / .05) : 0; if (p.z > .02 && ax > .02 + .08 * (1 - pt) && p.y < 1.72) return null; return { d: .017 + .005 * smooth((p.y - 1.72) / .05), c: shirt.clone().lerp(dk, (Math.sin(p.y * 95) > .3 ? .35 : 0) + (Math.sin(p.x * 95) > .3 ? .35 : 0)) }; }, { name: 'Otto: shirt collar', roughness: .9 });
    hands(rig, '#55361f', '#2a1a12', { k: 1.04, cuff: '#55361f' });
    shoes(rig, { upper: '#5a3420', toe: '#4a2a18', sole: '#2e2219', welt: '#8a6a4a', lace: '#2e2219', scale: 1.02, glossy: true });
  }

  /* ---------------------------------------------------------------- register */
  const DEFS = { fang: FANG, hazel: HAZEL, otto: OTTO };
  for (const [id, def] of Object.entries(DEFS)) { SC.defs[id] = def; if (!SC.ids.includes(id)) SC.ids.push(id); }
  Object.assign(SC.names, { fang: { en: 'Fang', he: 'פאנג', ru: 'Фанг' }, hazel: { en: 'Mrs. Hazel', he: 'גברת הייזל', ru: 'Миссис Хейзел' }, otto: { en: 'Otto', he: 'אוטו', ru: 'Отто' } });
  /** Which outfit rule each character follows: Fang fights bare-handed in his street clothes (no gloves ever on this rig). */
  /** Fang's two looks: 'jacket' (street, story scenes) and 'fight' (tank top: the fighter body shows). Swaps the skin streams and parts. */
  function wear(rig, mode) {
    if (!rig?.castFight || (mode !== 'jacket' && mode !== 'fight')) return false; const g = rig.skin.geometry, fight = mode === 'fight';
    use(g, fight ? rig.castFight : rig.castBase); g.setAttribute('castGloss', rig.castGlossSets[mode]);
    for (const o of rig.castJacketParts || []) o.visible = !fight; for (const o of rig.castFightParts || []) o.visible = fight;
    if (!fight) { const h = rig.castJacketHeld, gr = rig.castJacketGround; if (h) h.visible = false; if (gr) gr.visible = false; }
    rig.castWear = mode; return true;
  }
  /** The leather jacket as a loose prop: held by the collar (hanging) or lying crumpled on the ground. */
  function jacketProp(rig, ground) {
    const P = new Parts(), L = '#232024', D = '#151316', E = '#3e393b';
    if (!ground) { // hanging from the collar, open: two flat fronts with the zips, the back behind, sleeves hanging past the hem
      for (const s of [-1, 1]) {
        P.box(V(s * .1, -.27, .012), V(.17, .44, .018), L, [0, 0, s * .03]); P.box(V(s * .1, -.27, -.012), V(.18, .45, .016), D);
        P.ribbon([V(s * .06, -.01, 0), V(s * .17, -.035, 0), V(s * .25, -.07, 0)], .05, .03, L, V(0, 0, 1), 8, 6); // shoulder seam
        P.ribbon([V(s * .25, -.07, 0), V(s * .275, -.3, .01), V(s * .27, -.56, .02)], .095, .035, E, V(1, 0, 0), 16, 8);    // empty sleeves
        P.ribbon([V(s * .03, -.05, .024), V(s * .025, -.48, .024)], .007, .005, '#9aa0a8', V(1, 0, 0), 8, 6); P.ribbon([V(s * .05, -.04, .024), V(s * .17, -.2, .024)], .04, .006, D, V(0, 0, 1), 8, 6); // zip, lapel
      }
      P.ribbon([V(-.1, -.005, -.005), V(0, .02, -.01), V(.1, -.005, -.005)], .05, .016, D, V(0, 1, 0), 12, 6); P.box(V(0, -.5, 0), V(.36, .03, .04), D);
    } else {
      P.box(V(0, .025, 0), V(.48, .05, .36), L, [.05, .2, .04]); P.box(V(.05, .055, -.04), V(.3, .04, .22), E, [.0, -.3, 0]);
      for (const s of [-1, 1]) P.ribbon([V(s * .18, .03, .05), V(s * .36, .03, .12), V(s * .46, .025, .02)], .1, .04, L, V(0, 1, 0), 14, 8);
      P.ribbon([V(-.15, .06, -.16), V(0, .075, -.2), V(.15, .06, -.16)], .06, .025, D, V(0, 0, 1), 10, 6); P.ribbon([V(-.1, .056, .12), V(.12, .058, .1)], .008, .006, '#9aa0a8', V(0, 0, 1), 6, 6);
    }
    const m = meshOf(P, ground ? 'Fang: jacket on the ground' : 'Fang: jacket in the hand', mats(rig).glossy); m.userData.mane = false; return m;
  }
  /** The jacket-off beat before the street fight, u = 0..1 (about 2 s): shrugs it off the shoulders, swings it off the arm, tosses it
   *  to the ground, rolls his shoulders. Returns the DreamPose state for this moment ({ arms, lean, look }); pose with DreamPose.civil.
   *  The tossed jacket stays on the ground (world space, next to him) until wear(rig, 'jacket'). */
  function jacketOff(rig, u) {
    if (!rig?.castFight) return null; u = clamp(u);
    if (u < .3) { wear(rig, 'jacket'); return { arms: { L: 'hang', R: 'hang' }, lean: -.06 * smooth(u / .3), look: { yaw: 0, pitch: -.1 * smooth(u / .3) } }; }
    wear(rig, 'fight');
    const held = rig.castJacketHeld || (rig.castJacketHeld = (() => { const h = jacketProp(rig, false), grp = new THREE.Group(); grp.name = 'Fang: held jacket'; grp.add(h); h.position.set(0, -.02, 0); rig.joints.handR.add(grp); grp.position.set(0, -.12, .02); grp.userData.storyPart = true; (rig.castSprings || []).push({ o: grp, rest: grp.quaternion.clone(), k: 1, kind: 'bag' }); return grp; })());
    const ground = rig.castJacketGround || (rig.castJacketGround = jacketProp(rig, true));
    held.visible = u < .62;
    const host = rig.root.parent || rig.root; if (ground.parent !== host) host.add(ground);
    ground.visible = u >= .62;
    if (u >= .62 && !ground.userData.placed) { rig.root.updateMatrixWorld(true); const at = rig.root.localToWorld(V(-.55, 0, .35)); host.worldToLocal(at); ground.position.set(at.x, host === rig.root ? 0 : at.y, at.z); ground.rotation.set(0, rig.root.rotation.y + .7, 0); ground.userData.placed = true; }
    if (u < .62) ground.userData.placed = false;
    if (u < .62) return { arms: { L: 'hang', R: u < .45 ? 'low' : 'shrug' }, lean: -.03, look: { yaw: -.3, pitch: .05 } };
    if (u < .8) return { arms: { L: 'hang', R: 'point' }, lean: .02, look: { yaw: -.5, pitch: .15 } };
    const roll = Math.sin((u - .8) / .2 * Math.PI * 2); return { arms: { L: 'shrug', R: 'shrug' }, lean: .04 * roll, look: { yaw: .1 * roll, pitch: -.05 } };
  }
  // the street fight: Fang takes the Opponent slot in his fight clothes (tank top, bare fists); back in the jacket afterwards
  const baseOpponent = SC.asOpponent;
  SC.asOpponent = (engine, id) => {
    const restore = baseOpponent(engine, id); if (id !== 'fang') return restore;
    const c = SC.rig(id, engine); wear(c, 'fight');
    return () => { restore(); wear(c, 'jacket'); };
  };
  SC.market = { ids: Object.keys(DEFS), barehanded: ['fang'], handbag: rig => rig?.castProps?.handbag || null, wear, jacketOff, settle, version: 2 };
})();
