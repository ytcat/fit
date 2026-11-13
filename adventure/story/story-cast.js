/* Story cast and outfits (GOTR-0078 slice 1, docs/adventure/DREAM_HOOKS.md).
 * New characters on the game's own rig (LionCoach skeleton, skinning and animation): Coach Bruno, an old bear and former
 * champion, and Brick, a bulldog heavyweight. Their heads and bodies are the rig's own smooth skin reshaped by a
 * displacement field (no extra shells: the same 0.24 M-triangle surface, so nothing is faceted and nothing pokes through);
 * small things (ears, cap, towel, whistle, jowls, bare hands, sneakers, the duffel bag) are merged vertex-coloured meshes,
 * one draw call each. Clothes are a second set of vertex streams on the same skin (position, normal, colour, muscle
 * relief off under cloth): switching an outfit swaps streams and visibility flags, nothing is rebuilt and the boxing kit
 * and any Shop gear come back exactly as they were.
 *
 * STABLE API
 *   StoryCast.ids -> ['bruno', 'brick'] ; StoryCast.names[id][lang]
 *   StoryCast.rig(id, engine) -> rig (cached; rig.character === id)
 *   StoryCast.asOpponent(engine, id) -> restore()     the character takes the sparring-partner / fight Opponent slot
 *   StoryCast.outfit(rig, 'kit' | 'street' | <registered>) ; StoryCast.outfitOf(rig) ; StoryCast.outfits
 *   StoryCast.registerOutfit(name, { cloth(v) -> { d, c, wrinkle? } | null, parts?(rig, add), hide?: [...] })
 *   StoryCast.bag(rig, 'shoulder' | 'off') ; StoryCast.duffel() -> a loose duffel-bag mesh for sets (caller disposes)
 *   StoryCast.talk(rig, amount 0..1)                   opens the mouth (lines in conversations)
 * World: metres, y up, the rig faces +z in its rest pose (arms out along x). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); }, bell = (v, c, r) => Math.exp(-(((v - c) / r) ** 2));
  const band = (v, a, b, e = .02) => smooth((v - a) / e) * (1 - smooth((v - b) / e)); // 1 inside [a, b], soft edges
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const HEAD_Y = 1.84, HS = .9; // head joint height at rest, head scale

  /* ---------------------------------------------------------------- merged vertex-coloured parts (one draw call) */
  const PROTO = {};
  const proto = k => PROTO[k] || (PROTO[k] = ({ sph: () => new THREE.SphereGeometry(1, 22, 16), box: () => new THREE.BoxGeometry(1, 1, 1), cyl: () => new THREE.CylinderGeometry(1, 1, 1, 20, 1), tor: () => new THREE.TorusGeometry(1, .18, 10, 28), rbox: () => roundBox() })[k]().toNonIndexed());
  function roundBox() { // a box with soft edges: a subdivided cube pushed toward a sphere
    const g = new THREE.BoxGeometry(1, 1, 1, 6, 6, 6), p = g.attributes.position, v = V();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const q = v.clone().multiplyScalar(2), r = Math.max(Math.abs(q.x), Math.abs(q.y), Math.abs(q.z)), s = q.clone().normalize().multiplyScalar(r); v.copy(q.lerp(s, .34)).multiplyScalar(.5); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  }
  let partMat = null;
  const partMaterial = () => partMat || (partMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86, metalness: 0 }));
  class Parts {
    constructor() { this.p = []; this.n = []; this.c = []; }
    add(g, m, hex) {
      const P = g.attributes.position, N = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(m), v = V(), c = hex.isColor ? hex : lin(hex), flip = m.determinant() < 0;
      for (let t = 0; t < P.count; t += 3) for (const k of flip ? [0, 2, 1] : [0, 1, 2]) {
        const i = t + k; v.fromBufferAttribute(P, i).applyMatrix4(m); this.p.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); this.n.push(v.x, v.y, v.z); this.c.push(c.r, c.g, c.b);
      }
      return this;
    }
    m(pos, scale, rot) { return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), scale); }
    sph(pos, scale, hex, rot) { return this.add(proto('sph'), this.m(pos, scale, rot), hex); }
    box(pos, scale, hex, rot) { return this.add(proto('rbox'), this.m(pos, scale, rot), hex); }
    cyl(pos, scale, hex, rot) { return this.add(proto('cyl'), this.m(pos, scale, rot), hex); }
    tor(pos, scale, hex, rot) { return this.add(proto('tor'), this.m(pos, scale, rot), hex); }
    /** A flattened tube along a path: width across `side`, thickness across the path normal. width === thickness -> a round cord. */
    ribbon(points, width, thick, hex, side = V(1, 0, 0), seg = 28, ring = 10, out = null) {
      const path = new THREE.CatmullRomCurve3(points), c = hex.isColor ? hex : lin(hex), rows = [];
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, o = path.getPoint(u), t = path.getTangent(u), s = (out ? t.clone().cross(out(o)) : side.clone().addScaledVector(t, -side.dot(t))).normalize(), n = t.clone().cross(s).normalize(), row = [];
        const taper = Math.min(1, Math.min(u, 1 - u) * seg / 1.5 + .35); // rounded ends
        for (let k = 0; k < ring; k++) { const a = k / ring * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); row.push([o.clone().addScaledVector(s, ca * width / 2 * taper).addScaledVector(n, sa * thick / 2 * taper), s.clone().multiplyScalar(ca / width).addScaledVector(n, sa / thick).normalize()]); }
        rows.push(row);
      }
      const put = q => { this.p.push(q[0].x, q[0].y, q[0].z); this.n.push(q[1].x, q[1].y, q[1].z); this.c.push(c.r, c.g, c.b); };
      for (let i = 0; i < seg; i++) for (let k = 0; k < ring; k++) { const a = rows[i][k], b = rows[i][(k + 1) % ring], d = rows[i + 1][k], e = rows[i + 1][(k + 1) % ring]; put(a); put(d); put(b); put(b); put(d); put(e); }
      return this;
    }
    geometry() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.computeBoundingSphere(); return g; }
    mesh(name, material = partMaterial()) { const m = new THREE.Mesh(this.geometry(), material); m.name = name; m.castShadow = true; m.receiveShadow = false; m.userData.mane = true; m.userData.storyPart = true; return m; }
  }

  /* ---------------------------------------------------------------- the skin as editable streams */
  /** Welded topology of the rig's skin (duplicate vertices along seams move and shade together). Cached per geometry. */
  function topology(g) {
    if (g.userData.storyTopo) return g.userData.storyTopo;
    const P = g.attributes.position, n = P.count, rep = new Int32Array(n), map = new Map();
    for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 20000) + ':' + Math.round(P.getY(i) * 20000) + ':' + Math.round(P.getZ(i) * 20000), r = map.get(k); if (r == null) { map.set(k, i); rep[i] = i; } else rep[i] = r; }
    const idx = g.index.array, deg = new Int32Array(n), seen = new Set();
    const edges = [];
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = rep[idx[t + k]], b = rep[idx[t + (k + 1) % 3]]; if (a === b) continue; const key = a < b ? a * 131072 + b : b * 131072 + a; if (seen.has(key)) continue; seen.add(key); edges.push(a, b); deg[a]++; deg[b]++; }
    const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
    const fill = new Int32Array(n), nb = new Int32Array(start[n]);
    for (let e = 0; e < edges.length; e += 2) { const a = edges[e], b = edges[e + 1]; nb[start[a] + fill[a]++] = b; nb[start[b] + fill[b]++] = a; }
    return (g.userData.storyTopo = { rep, start, nb });
  }
  /** Smooth normals for welded vertices (area weighted), written for every duplicate. */
  function normals(g, pos, out) {
    const { rep } = topology(g), idx = g.index.array, n = pos.length / 3, acc = new Float32Array(pos.length);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const i of [idx[t], idx[t + 1], idx[t + 2]]) { const r = rep[i] * 3; acc[r] += nx; acc[r + 1] += ny; acc[r + 2] += nz; }
    }
    for (let i = 0; i < n; i++) { const r = rep[i] * 3, l = Math.hypot(acc[r], acc[r + 1], acc[r + 2]) || 1; out[i * 3] = acc[r] / l; out[i * 3 + 1] = acc[r + 1] / l; out[i * 3 + 2] = acc[r + 2] / l; }
    return out;
  }
  /** Laplacian smoothing of the masked vertices (washes the muscle relief out from under cloth). */
  function relax(g, pos, mask, rounds = 8, amount = .5) {
    const { rep, start, nb } = topology(g), n = pos.length / 3, next = new Float32Array(pos.length);
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < n; i++) {
        if (rep[i] !== i) continue; const w = mask[i] * amount, a = start[i], b = start[i + 1];
        if (!(w > 0) || a === b) { next[i * 3] = pos[i * 3]; next[i * 3 + 1] = pos[i * 3 + 1]; next[i * 3 + 2] = pos[i * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0; for (let k = a; k < b; k++) { const j = nb[k] * 3; x += pos[j]; y += pos[j + 1]; z += pos[j + 2]; }
        const m = 1 / (b - a); next[i * 3] = lerp(pos[i * 3], x * m, w); next[i * 3 + 1] = lerp(pos[i * 3 + 1], y * m, w); next[i * 3 + 2] = lerp(pos[i * 3 + 2], z * m, w);
      }
      for (let i = 0; i < n; i++) { const j = rep[i] * 3; pos[i * 3] = next[j]; pos[i * 3 + 1] = next[j + 1]; pos[i * 3 + 2] = next[j + 2]; }
    }
  }
  /** Loose cloth hangs as a tube: these push a rest-pose point OUT to a smooth tube (never in). Returned as a move [dx, dy, dz]. */
  function tube(v, a, bf, bb, k = 1, zc = -.005) { const dz = v.z - zc, r = Math.hypot(v.x, dz); if (r < 1e-4) return null; const b = dz > 0 ? bf : bb, cx = v.x / r, cz = dz / r, R = a * b / Math.hypot(b * cx, a * cz); return R > r ? [cx * (R - r) * k, 0, cz * (R - r) * k] : null; }
  function sleeve(v, R, k = 1) { const dy = v.y - 1.615, r = Math.hypot(dy, v.z); return r > 1e-4 && R > r ? [0, dy / r * (R - r) * k, v.z / r * (R - r) * k] : null; }
  function trouser(v, R, k = 1) { const s = v.x < 0 ? -1 : 1, dx = v.x - s * (.15 + (1 - v.y) * .07), dz = v.z + .02 * smooth((.7 - v.y) / .3), r = Math.hypot(dx, dz); return r > 1e-4 && R > r ? [dx / r * (R - r) * k, 0, dz / r * (R - r) * k] : null; }
  const SWAP = ['position', 'normal', 'color', 'avatarMuscle', 'avatarMuscleNormal', 'avatarDefinition', 'avatarDefinitionNormal', 'avatarMass'];
  /** Dresses a copy of the skin's streams. cloth(v) -> null (bare) or { d: offset along the normal (m), c: THREE.Color (linear),
   *  loose?: 0..1 relief washed out (default 1) }. v = { x, y, z, nx, ny, nz, arm (0..1 arm blend) } in the rest pose. */
  function dress(g, cloth, opt = {}) {
    const P = g.attributes.position, N = g.attributes.normal, n = P.count, pos = new Float32Array(P.array), col = new Float32Array(g.attributes.color.array), mask = new Float32Array(n), off = new Float32Array(n);
    const arm = g.attributes.coachArmBlend, v = {};
    for (let i = 0; i < n; i++) {
      v.x = pos[i * 3]; v.y = pos[i * 3 + 1]; v.z = pos[i * 3 + 2]; v.nx = N.getX(i); v.ny = N.getY(i); v.nz = N.getZ(i); v.arm = smooth((Math.abs(v.x) - .29) / .075) * smooth((v.y - 1.34) / .07); // 0 on the trunk and legs, 1 on the arms (rest pose: arms out along x)
      const o = cloth(v); if (!o) continue;
      mask[i] = o.loose ?? 1; off[i] = o.d; if (o.c) { col[i * 3] = o.c.r; col[i * 3 + 1] = o.c.g; col[i * 3 + 2] = o.c.b; }
      if (o.move) { pos[i * 3] += o.move[0]; pos[i * 3 + 1] += o.move[1]; pos[i * 3 + 2] += o.move[2]; }
    }
    if (opt.relax !== 0) relax(g, pos, mask, opt.relax ?? 14);
    const nor = normals(g, pos, new Float32Array(pos.length));
    for (let i = 0; i < n; i++) if (off[i]) { pos[i * 3] += nor[i * 3] * off[i]; pos[i * 3 + 1] += nor[i * 3 + 1] * off[i]; pos[i * 3 + 2] += nor[i * 3 + 2] * off[i]; }
    normals(g, pos, nor);
    const out = { position: new THREE.BufferAttribute(pos, 3), normal: new THREE.BufferAttribute(nor, 3), color: new THREE.BufferAttribute(col, 3) };
    // no muscle flex, definition lines or cavity shading under cloth
    for (const k of SWAP.slice(3)) { const a = g.attributes[k]; if (!a) continue; const arr = a.array.slice(), s = a.itemSize; for (let i = 0; i < n; i++) if (mask[i] > 0) { const keep = 1 - Math.min(1, mask[i] * 1.5); for (let j = 0; j < s; j++) arr[i * s + j] = k === 'avatarMuscle' && j === 3 ? arr[i * s + j] : arr[i * s + j] * keep; } out[k] = new THREE.BufferAttribute(arr, s, a.normalized); }
    return out;
  }
  const use = (g, streams) => { for (const k of SWAP) if (streams[k]) g.setAttribute(k, streams[k]); };
  const grab = g => { const s = {}; for (const k of SWAP) if (g.attributes[k]) s[k] = g.attributes[k]; return s; };

  /* ---------------------------------------------------------------- body bulk (rest pose, after skinning) */
  /** Moves a rest-pose point for a heavier build. o: { torso, depth, belly, bellyY, chest, arm, leg, neck, hips } (fractions / metres). */
  function bulk(p, o) {
    const ax = Math.abs(p.x), s = p.x < 0 ? -1 : 1;
    const wa = smooth((ax - .30) / .10) * smooth((p.y - 1.34) / .08), wrist = 1 - smooth((ax - .78) / .16);
    if (wa > 0) { const k = 1 + (o.arm || 0) * wa * wrist; p.y = 1.62 + (p.y - 1.62) * k; p.z *= k; }
    if (p.y < 1.02) {
      const wl = smooth((1.02 - p.y) / .14), ankle = smooth((p.y - .14) / .22), cx = s * (.15 + (1 - p.y) * .07), k = 1 + (o.leg || 0) * wl * ankle;
      const inner = smooth((s * (p.x - cx) + .02) / .06); // the outside of the leg grows more than the inside (no thigh clash)
      p.x = cx + (p.x - cx) * (1 + (k - 1) * lerp(.35, 1, inner)); p.z *= k;
    }
    const wt = (1 - wa) * smooth((p.y - .86) / .14) * (1 - smooth((p.y - 1.70) / .10));
    if (wt > 0) {
      const inside = 1 - smooth((ax - .22) / .12), front = smooth((p.z + .02) / .10);
      p.x *= 1 + (o.torso || 0) * wt * inside; p.z *= 1 + (o.depth || 0) * wt;
      const b = (o.belly || 0) * bell(p.y, o.bellyY || 1.22, o.bellyH || .19) * wt;
      p.z += b * front * bell(p.x, 0, .24); p.x += s * b * .45 * bell(ax, .2, .12) * smooth(ax / .06);
      p.z += (o.chest || 0) * bell(p.y, 1.52, .12) * front * bell(ax, .12, .16) * wt;
      p.z -= (o.back || 0) * bell(p.y, 1.5, .2) * (1 - front) * bell(p.x, 0, .26) * wt;
      const hip = (o.hips || 0) * bell(p.y, .98, .12); p.x *= 1 + hip * inside; p.z *= 1 + hip;
    }
    // trapezius: the shoulder line rises toward the neck, so the shoulders flow into the head instead of a flat shelf
    if (o.traps) { const tr = o.traps * bell(ax, .125, .085) * smooth((p.y - 1.60) / .09) * (1 - smooth((p.y - 1.80) / .06)); p.y += tr; p.z -= tr * .35 * smooth((-p.z) / .08); }
    // bull neck: the column between the shoulders and the jaw grows outward by a fixed amount (a scale here makes a ledge on the shoulders)
    const wn = smooth((p.y - 1.63) / .08) * (1 - smooth((p.y - 1.79) / .09)), r = Math.hypot(p.x, p.z + .02);
    if (wn > 0 && r > 1e-4) { const push = (o.neck || 0) * .075 * wn * (1 - smooth((r - .13) / .13)); p.x += p.x / r * push; p.z += (p.z + .02) / r * push; }
    return p;
  }
  function reshape(g, fn) { const P = g.attributes.position, p = V(); for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); fn(p); P.setXYZ(i, p.x, p.y, p.z); } P.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); }

  /** Front (or back) surface of the sculpted skin at (x, y): the largest z of nearby vertices. Head coordinates when head = true. */
  function seat(rig, x, y, head = true, r = .014, back = false, rx = r) {
    const P = rig.skin.geometry.attributes.position; let best = back ? 9 : -9;
    const wx = head ? x * HS : x, wy = head ? y * HS + HEAD_Y : y, rr = head ? r * HS : r, rrx = head ? rx * HS : rx;
    for (let i = 0; i < P.count; i++) { if (Math.abs(P.getY(i) - wy) > rr || Math.abs(P.getX(i) - wx) > rrx) continue; const z = P.getZ(i); best = back ? Math.min(best, z) : Math.max(best, z); }
    if (Math.abs(best) > 8) return r > .05 ? (back ? -.1 : .1) : seat(rig, x, y, head, r * 1.8, back, rx * 1.8);
    return head ? best / HS : best;
  }
  /** Top of the body (shoulder line) over (x, z): the largest y below the head. */
  function crest(rig, x, z, rx = .03, rz = .03, below = 1.79) { const P = rig.skin.geometry.attributes.position; let best = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > below || y < best || Math.abs(P.getX(i) - x) > rx || Math.abs(P.getZ(i) - z) > rz) continue; best = y; } return best; }
  /** Largest radius of the skin around the vertical axis at height y, direction th (0 = front, + toward +x). */
  function rim(rig, y, th, ry = .012, ra = .13) { const P = rig.skin.geometry.attributes.position; let best = 0; for (let i = 0; i < P.count; i++) { if (Math.abs(P.getY(i) - y) > ry) continue; const x = P.getX(i), z = P.getZ(i) + .02; let d = Math.atan2(x, z) - th; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > ra) continue; best = Math.max(best, Math.hypot(x, z)); } return best; }
  let tuftMat = null;
  const tuftMaterial = () => tuftMat || (tuftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
  /** Locks of fur rooted on the sculpted skin, like the lion's mane locks: tapered, curved leaves that lie along `flow`.
   *  where(p, n) -> 0..1 (density and length), o: { count, len, width, lift, droop, flow(p, n) -> Vector3, origin (bone rest position), seed, tone? }.
   *  One mesh (one draw call), rigid on the bone it is given to. About 5 triangles a lock. */
  function tufts(rig, where, o) {
    const g = rig.skin.geometry, P = g.attributes.position, N = g.attributes.normal, K = g.attributes.color, pos = [], nor = [], col = [], p = V(), n = V(), c = new THREE.Color(), org = o.origin || V();
    let seed = o.seed || 9173; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const put = (q, m, k) => { pos.push(q.x - org.x, q.y - org.y, q.z - org.z); nor.push(m.x, m.y, m.z); col.push(c.r * k, c.g * k, c.b * k); };
    for (let made = 0, tries = 0; made < o.count && tries < o.count * 400; tries++) {
      const i = Math.floor(rand() * P.count); p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); const w = where(p, n); if (!(w > 0) || rand() > w) continue; made++;
      const r0 = rand(), r1 = rand(), r2 = rand(), r3 = rand(), tangent = o.flow(p, n).clone(); tangent.addScaledVector(n, -tangent.dot(n)); if (tangent.lengthSq() < 1e-6) tangent.set(0, -n.z, n.y); tangent.normalize().applyAxisAngle(n, (r2 - .5) * .7);
      const angle = (o.lift ?? .3) + .15 * r0, forward = tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(n, Math.sin(angle)), len = o.len * (.7 + .6 * r1) * (.55 + .45 * w), width = o.width * (.75 + .5 * r2), curl = (r3 - .5) * .35 * len;
      const across = forward.clone().cross(n).normalize(), lift = n.clone().addScaledVector(forward, -n.dot(forward)).normalize();
      c.fromBufferAttribute(K, i); if (o.tone) c.lerp(o.tone, .1 * r3); const shade = .96 + .08 * r0, st = [];
      for (let k = 0; k <= 4; k++) { const t = k / 4, half = width * (1 - t) * (.6 + 1.6 * t), q = p.clone().addScaledVector(n, -.01).addScaledVector(forward, len * t).addScaledVector(n, -.3 * len * t * t).addScaledVector(across, curl * t * t); q.y -= (o.droop ?? .2) * len * t * t; st.push([t, [q.clone().addScaledVector(across, -half), q.clone().addScaledVector(lift, .35 * half), q.clone().addScaledVector(across, half)]]); }
      const ridge = [lift.clone().multiplyScalar(.6).addScaledVector(across, -.8).addScaledVector(n, .5).normalize(), lift.clone().addScaledVector(n, .5).normalize(), lift.clone().multiplyScalar(.6).addScaledVector(across, .8).addScaledVector(n, .5).normalize()];
      for (let k = 0; k < 4; k++) { const a = st[k], b = st[k + 1]; for (const [q, e] of [[a, 0], [a, 1], [b, 0], [a, 1], [b, 1], [b, 0], [a, 1], [a, 2], [b, 1], [a, 2], [b, 2], [b, 1]]) put(q[1][e], ridge[e], shade * (.9 + .16 * q[0]) * (e === 1 ? 1.04 : 1)); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, tuftMaterial()); mesh.name = o.name || 'Fur locks'; mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.mane = true; mesh.userData.storyPart = true; return mesh;
  }
  const HEAD0 = V(0, HEAD_Y, 0), CHEST0 = V(0, 1.36, 0), NECK0 = V(0, 1.72, 0);
  const emptyMane = rig => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); rig.mane = new THREE.Mesh(g, partMaterial()); rig.maneRest = []; rig.maneFlex = []; };
  /** An eye that blinks with the rig's face acting: dark ball, coloured iris, pupil and one highlight. */
  function eye(rig, s, x, y, z, size, iris, lid = null) {
    const head = rig.joints.head, wet = rig.castMats.wet, mk = (mat, p, sc, eyePart = true) => { const m = rig.ellipsoid(head, mat, p, sc); m.userData.eye = eyePart; m.userData.mane = true; if (rig.cast.K) grow(m, rig.cast.K); return m; };
    mk(wet, V(s * x, y, z), V(size, size * .88, size * .62));
    mk(rig.castMats[iris], V(s * x, y - size * .02, z + size * .47), V(size * .74, size * .70, size * .26));
    mk(rig.black, V(s * x, y - size * .01, z + size * .68), V(size * .36, size * .40, size * .10));
    mk(rig.castMats.glint, V(s * x - size * .27, y + size * .26, z + size * .76), V(size * .17, size * .17, size * .05));
    mk(rig.castMats.glint, V(s * x + size * .22, y - size * .2, z + size * .74), V(size * .07, size * .07, size * .03));
    if (lid) { // upper and lower lids in the coat colour: the eye sits in the face instead of on it
      const mat = new THREE.MeshStandardMaterial({ color: lid.color, roughness: .95 }), up = mk(mat, V(s * x, y + size * (.58 + (lid.open || 0)), z + size * .04), V(size * 1.16, size * .56, size * .78), false), low = mk(mat, V(s * x, y - size * .72, z - size * .02), V(size * 1.08, size * .4, size * .7), false);
      up.rotation.z = s * (lid.tilt || 0); low.rotation.z = s * (lid.tilt || 0) * -.4;
    }
  }
  function castMats(rig) {
    rig.castMats = { wet: new THREE.MeshPhysicalMaterial({ color: 0x1d1714, roughness: .3, clearcoat: .4 }), amber: new THREE.MeshPhysicalMaterial({ color: 0xc08a2e, roughness: .26, clearcoat: .5 }), hazel: new THREE.MeshPhysicalMaterial({ color: 0x9a6a34, roughness: .26, clearcoat: .5 }), glint: new THREE.MeshBasicMaterial({ color: 0xfff5df }) };
  }
  /** Bigger heads: the head field ends with a uniform growth about GC; face parts are authored at lion scale and grown the same way. */
  const GC = V(0, -.045, 0); // growth starts at the jaw line, so the neck stays visible under a bigger head
  const growField = (out, x, y, z, K, fade) => out.set(out.x + (x + out.x - GC.x) * (K - 1) * fade, out.y + (y + out.y - GC.y) * (K - 1) * fade, out.z + (z + out.z - GC.z) * (K - 1) * fade);
  const grow = (part, K) => { part.position.sub(GC).multiplyScalar(K).add(GC); part.scale.multiplyScalar(K); return part; };
  const seatHead = (rig, K) => (x, y) => seat(rig, x * K, GC.y + (y - GC.y) * K) / K;
  const brow = (rig, pts, hex, r) => { const m = rig.curve(rig.joints.head, pts, new THREE.MeshStandardMaterial({ color: hex, roughness: .95 }), r); m.userData.mane = true; if (rig.cast.K) grow(m, rig.cast.K); return m; };

  /* ---------------------------------------------------------------- Coach Bruno: old bear, former champion */
  const BRUNO = {
    id: 'bruno', K: 1.1, fur: '#6f4a31', light: '#b9b1a6', build: { torso: .19, depth: .18, belly: .16, bellyY: 1.19, bellyH: .22, chest: .02, arm: .18, leg: .15, neck: .5, hips: .14, back: .035, traps: .03 },
    cardigan: '#3f5d4a', rib: '#33503f', shirt: '#d8d5cc', pants: '#3b3e46', stripe: '#d9d4c6',
    colour(p, c, tawny, light) {
      // grey of age: the whole muzzle, the chin and a soft ring up the cheeks and brows
      if (p.y > 1.80) {
        const hx = p.x / HS, hy = (p.y - HEAD_Y) / HS, hz = p.z / HS;
        const grey = Math.max(smooth((hz - .19) / .05) * (1 - smooth((hy - .15) / .05)), .75 * bell(hy, .215, .03) * bell(Math.abs(hx), .09, .05) * smooth((hz - .12) / .05), .5 * bell(hy, .03, .07) * smooth((hz - .08) / .1));
        c.copy(tawny).lerp(light, clamp(grey));
      }
    },
    headForm(x, y, z, out) {
      const s = x < 0 ? -1 : 1, ax = Math.abs(x), fade = smooth((y + .09) / .05), front = smooth((z - .10) / .08), muzzle = smooth((z - .19) / .06) * (1 - smooth((y - .125) / .05));
      let dx = 0, dy = 0, dz = 0;
      // broad round skull, full cheeks, a high dome between the ears
      const skull = 1 - smooth((z - .14) / .10);
      dx += x * .17 * skull * smooth((y + .02) / .08); dz += z * .10 * smooth((-z) / .1);
      dy += .034 * smooth((y - .20) / .13) * bell(x, 0, .24);
      const cheek = .034 * bell(y, .055, .085) * bell(z, .09, .13); dx += s * cheek * smooth(ax / .05);
      // the snout: narrower and rounder than the lion's broad pad, with a soft step up to the forehead
      dx -= x * .20 * muzzle; dy -= .012 * muzzle * smooth((y - .07) / .05); dz += .034 * muzzle * bell(x, 0, .11) + .012 * bell(y, .09, .03) * muzzle; // a long bear snout
      const bone = .016 * bell(y, .13, .03) * bell(ax, .16, .045) * front; dx += s * bone; dz += bone * .6; // cheekbones under the eyes
      dz += .030 * bell(y, .215, .06) * bell(ax, .085, .085) * front; // brow and eye plane come forward: small friendly eyes, not deep sockets
      dz -= .022 * bell(y, .155, .03) * bell(x, 0, .05) * front;      // stop between forehead and snout
      const jaw = bell(y, -.03, .05) * smooth((z + .02) / .1); dx += s * .020 * jaw * smooth(ax / .04);
      return growField(out.set(dx * fade, dy * fade, dz * fade), x, y, z, BRUNO.K, smooth((y + .10) / .13));
    },
    sculpt(rig) { reshape(rig.skin.geometry, p => { bulk(p, BRUNO.build); }); rig.castBase = brunoClothes(rig); use(rig.skin.geometry, rig.castBase); },
    face(rig) {
      castMats(rig); emptyMane(rig);
      const head = rig.joints.head, P = new Parts(), fur = lin(BRUNO.fur), Z = seatHead(rig, BRUNO.K);
      for (const s of [-1, 1]) {
        P.sph(V(s * .255, .272, -.04), V(.078, .082, .046), fur, [0, s * .35, s * -.25]); P.sph(V(s * .252, .27, -.008), V(.05, .054, .022), '#a07c66', [0, s * .35, s * -.25]); // round ears, low enough to stay under the cap
        eye(rig, s, .084, .19, Z(.084, .19) - .012, .034, 'hazel', { color: 0x5f3f2a, tilt: -.16 });
        for (const [dy, w] of [[-.052, .034], [-.064, .026]]) P.ribbon([V(s * (.084 - w), .19 + dy + .006, Z(.084 - w, .19 + dy) + .0005), V(s * .084, .19 + dy, Z(.084, .19 + dy) + .002), V(s * (.084 + w), .19 + dy + .008, Z(.084 + w, .19 + dy) + .0005)], .005, .004, '#4a3122', V(0, 1, 0), 10, 6); // bags under the eyes
        brow(rig, [V(s * .036, .224, Z(.04, .224) - .002), V(s * .085, .240, Z(.085, .24) - .001), V(s * .140, .218, Z(.14, .218) - .002)], 0xb8b2a8, .0095); // heavy grey brows that droop at the outside
        P.ribbon([V(s * .012, .048, Z(.012, .05) - .001), V(s * .045, .03, Z(.045, .03) - .001), V(s * .078, .04, Z(.078, .04) - .002)], .0055, .005, '#4a372d', V(0, 1, 0), 12, 6); // mouth line
        for (let k = 0; k < 3; k++) P.sph(V(s * (.05 + k * .02), .075 - k * .008, Z(.05 + k * .02, .075 - k * .008) - .001), V(.0035, .0035, .002), '#8a7a70'); // whisker dots
      }
      const nz = Z(0, .108);
      P.sph(V(0, .114, nz + .002), V(.056, .04, .036), '#211916'); P.sph(V(-.014, .13, nz + .03), V(.014, .008, .006), '#7a706a'); for (const sd of [-1, 1]) P.sph(V(sd * .024, .1, nz + .028), V(.011, .008, .008), '#0d0a09'); // big leathery nose: highlight and nostrils
      for (const [y, w] of [[.292, .07], [.31, .05]]) P.ribbon([V(-w, y - .004, Z(w, y) + .0005), V(0, y + .003, Z(0, y) + .002), V(w, y - .004, Z(w, y) + .0005)], .006, .004, '#5a3b28', V(0, 1, 0), 12, 6); // forehead lines of age
      P.ribbon([V(0, .082, Z(0, .085) + .002), V(0, .05, Z(0, .05) + .002)], .007, .007, '#2a201b', V(1, 0, 0), 6, 6);
      // flat cap: soft crown pulled forward over a short stiff peak
      const cap = '#5b5346', dark = '#454036', top = .355;
      P.sph(V(0, top - .012, -.02), V(.228, .07, .245), cap, [.16, 0, 0]); P.sph(V(0, top - .05, -.03), V(.232, .045, .232), dark, [.1, 0, 0]);
      P.sph(V(0, top - .066, .215), V(.15, .016, .095), dark, [.34, 0, 0]); P.sph(V(0, top + .036, -.03), V(.022, .012, .022), dark);
      { const cq = new THREE.Quaternion().setFromEuler(new THREE.Euler(.16, 0, 0)), cc = V(0, top - .012, -.02), on = (ph, th, k = 1.012) => V(.228 * Math.cos(ph) * Math.sin(th), .07 * Math.cos(th), .245 * Math.sin(ph) * Math.sin(th)).multiplyScalar(k).applyQuaternion(cq).add(cc);
        for (let k = 0; k < 8; k++) { const ph = k / 8 * Math.PI * 2 + .39; P.ribbon([.12, .5, .9, 1.25].map(th => on(ph, th)), .006, .004, '#3f3a31', V(1, 0, 0), 10, 6, q => q.clone().sub(cc).normalize()); } // panel seams on the crown
        P.ribbon([-1.25, -.8, -.4, 0, .4, .8, 1.25].map(a => V(.152 * Math.sin(a), top - .058 - .03 * Math.cos(a), .2 + .096 * Math.cos(a))), .007, .006, '#37322a', V(0, 1, 0), 22, 6); } // stitched edge of the brim
      head.add(grow(P.mesh('Bruno: ears, nose, flat cap'), BRUNO.K));
      BRUNO.mouthZ = Z(0, .03) * BRUNO.K - .012;
    },
    finish(rig) {
      rig.tail.clear(); rig.ellipsoid(rig.tail, new THREE.MeshStandardMaterial({ color: 0x5f3f2a, roughness: 1 }), V(0, -.06, -.21), V(.06, .055, .05));
      hideKit(rig, ['gloves', 'shorts', 'boots', 'trim']); rig.bodyFurOff = true;
      const j = rig.joints, chest = new Parts(), B = (x, y, back) => seat(rig, x, y, false, .02, back);
      // towel over the left shoulder: down the chest in front, over the trapezius, down the back
      const tx = -.155, T = [], W = (y, back) => seat(rig, tx, y, false, .02, back, .08), sag = k => .012 * Math.sin(k * 2.3);
      for (const [k, y] of [1.33, 1.39, 1.45, 1.51, 1.57, 1.63, 1.68].entries()) T.push(V(tx + sag(k), y, W(y) + .016));
      for (const z of [.11, .04, -.04, -.11]) T.push(V(tx + .012, crest(rig, tx, z, .08, .035) + .016, z));
      for (const [k, y] of [1.68, 1.61, 1.54, 1.47, 1.4].entries()) T.push(V(tx - sag(k), y, W(y, true) - .016));
      const TL = T.map(q => q.clone().sub(V(0, 1.36, 0))), flat = q => V(0, smooth((q.y - .28) / .1), q.z > 0 ? 1 : -1).normalize();
      chest.ribbon(TL, .17, .026, '#f3eee2', V(1, 0, 0), 44, 14); for (const sd of [-1, 1]) chest.ribbon(TL.map(q => q.clone().add(V(sd * .082, 0, 0))), .02, .032, '#e9e3d5', V(1, 0, 0), 44, 8); // terry cloth with thickness and rolled edges
      for (const [a, b] of [[0, 1], [15, 14]]) { const q = T[a].clone().lerp(T[b], .4).sub(V(0, 1.36, 0)); chest.ribbon([q.clone().add(V(-.085, 0, a ? -.009 : .009)), q.clone().add(V(.085, 0, a ? -.009 : .009))], .03, .004, '#4f7fb3', V(0, 1, 0), 4, 6); } // blue stripe at both ends
      // whistle on a cord round the neck
      const wz = B(0, 1.47) + .012, cord = [V(-.105, 1.735, -.02), V(-.09, 1.69, B(.09, 1.69) + .006), V(-.03, 1.52, B(.03, 1.52) + .008), V(0, 1.475, wz), V(.03, 1.52, B(.03, 1.52) + .008), V(.09, 1.69, B(.09, 1.69) + .006), V(.105, 1.735, -.02)];
      chest.ribbon(cord.map(p => p.clone().sub(V(0, 1.36, 0))), .007, .007, '#b3261e', V(0, 0, 1), 30, 6);
      chest.cyl(V(0, 1.445 - 1.36, wz + .012), V(.019, .034, .019), '#c9ccd2', [0, 0, Math.PI / 2]); chest.box(V(.03, 1.452 - 1.36, wz + .012), V(.03, .018, .016), '#c9ccd2'); chest.sph(V(-.006, 1.445 - 1.36, wz + .027), V(.007, .007, .004), '#3b4350');
      j.chest.add(chest.mesh('Bruno: towel and whistle'));
      // cardigan buttons on the spine (belly) and the chest
      const but = new Parts(); for (const y of [1.08, 1.15, 1.22, 1.29]) { but.sph(V(.026, y - 1.13, B(.026, y) + .003), V(.015, .015, .007), '#d9c9a3'); but.sph(V(.026, y - 1.13, B(.026, y) + .009), V(.006, .006, .003), '#8a7a58'); but.sph(V(-.03, y - 1.13, B(-.03, y) + .002), V(.011, .004, .003), '#2a4033'); } j.spine.add(but.mesh('Bruno: buttons'));
      bareHands(rig, BRUNO.fur, '#3a2a22'); shoes(rig, { upper: '#4a3a30', toe: '#3c2f27', sole: '#c9c0ae', lace: '#d8d2c4' });
      // fur: a ruff round the cheeks and under the jaw, tufts on the back of the head, shaggy grey brows
      const hd = q => [q.x / HS, (q.y - HEAD_Y) / HS, q.z / HS];
      j.head.add(tufts(rig, q => { const [hx, hy, hz] = hd(q), ax = Math.abs(hx); if (q.y < 1.79) return 0; return Math.max(smooth((ax - .17) / .05) * band(hy, -.08, .16, .04) * smooth((hz + .12) / .08), .9 * band(hy, -.11, -.02, .025) * smooth((hz + .1) / .1), .7 * smooth((-hz - .06) / .06) * band(hy, -.06, .24, .05)); },
        { count: 900, len: .075, width: .022, lift: .28, droop: .25, origin: HEAD0, seed: 311, name: 'Bruno: cheek and neck ruff', flow: q => V(q.x * 1.4, -1, q.z * .5 - .15).normalize() }));
      j.head.add(tufts(rig, q => { const [hx, hy, hz] = hd(q); return q.y > 1.8 ? bell(hy, .245, .016) * bell(Math.abs(hx), .09, .05) * smooth((hz - .12) / .05) : 0; }, { count: 110, len: .034, width: .011, lift: .4, droop: .05, origin: HEAD0, seed: 77, name: 'Bruno: brows', tone: lin('#d8d2c8'), flow: q => V(q.x * 2.4, .25, .4).normalize() }));
    }
  };
  /** Bruno's clothes are part of him: cardigan over a gym shirt, track pants. Returns the dressed streams. */
  function brunoClothes(rig) {
    const card = lin(BRUNO.cardigan), rib = lin(BRUNO.rib), shirt = lin(BRUNO.shirt), pants = lin(BRUNO.pants), stripe = lin(BRUNO.stripe), tmp = new THREE.Color(), tmp2 = new THREE.Color();
    return dress(rig.skin.geometry, v => {
      const ax = Math.abs(v.x);
      if (v.y > 1.775 || ax > .915) return null;
      if (v.y < 1.035 && v.arm < .5) { // track pants with a pale side stripe, elastic hem at the ankle
        if (v.y < .115) return null;
        const side = bell(Math.abs(Math.atan2(v.z, ax - (.15 + (1 - v.y) * .07))), 0, .16) * smooth((ax - .2) / .04);
        return { d: .016 + .008 * bell(v.y, .13, .03), c: tmp.copy(pants).lerp(stripe, clamp(side * 1.4)).clone(), move: v.y < .93 ? trouser(v, lerp(.122, .15, smooth((v.y - .5) / .4)), smooth((.93 - v.y) / .1)) : null };
      }
      const front = smooth((v.z - .02) / .06) * (v.arm < .3 ? 1 : 0), open = .016 + .085 * smooth((v.y - 1.30) / .42), k = 1 - front * (1 - smooth((ax - open) / .02)); // k = 0 in the open front (gym shirt), 1 on the cardigan
      const top = 1 - smooth((v.y - 1.735) / .04), hem = bell(v.y, 1.055, .028) * (1 - v.arm), cuff = smooth((ax - .86) / .02), edge = front * bell(ax, open + .03, .016), knit = .5 + .5 * Math.sin((v.arm > .5 ? ax : v.y) * 520);
      const seamC = Math.max(bell(ax, .315, .006) * smooth((v.y - 1.42) / .05), front * Math.max(bell(v.y, 1.2, .005) * band(ax, .1, .24, .008), bell(v.y, 1.09, .005) * band(ax, .1, .24, .008), band(v.y, 1.09, 1.2, .006) * Math.max(bell(ax, .1, .005), bell(ax, .24, .005)))); // shoulder seams and two patch pockets
      const c = tmp.copy(card).lerp(rib, clamp(Math.max(hem, cuff, edge) * (.55 + .45 * knit) + seamC * .9)).multiplyScalar(1 - .07 * Math.sin(v.y * 260 + ax * 90) * Math.sin(ax * 300 + v.z * 200));
      if (k < 1) c.lerp(tmp2.copy(shirt).multiplyScalar(1 - .1 * bell(v.y, 1.75, .02)), 1 - smooth(k / .45));
      const move = v.arm > .5 ? sleeve(v, lerp(.118, .074, smooth((ax - .40) / .48)), smooth((v.arm - .5) / .35)) : v.y < 1.72 ? tube(v, .37, lerp(.37, .23, smooth((v.y - 1.4) / .3)), lerp(.27, .2, smooth((v.y - 1.55) / .17)), (1 - v.arm * 2) * smooth((1.74 - v.y) / .05)) : null;
      return { d: lerp(.006, .022 + .006 * Math.max(hem, cuff) + .007 * edge, k) * lerp(.25, 1, top), c: c.clone(), move };
    }, { relax: 26 });
  }

  /* ---------------------------------------------------------------- Brick: bulldog heavyweight */
  const BRICK = {
    id: 'brick', K: 1.16, fur: '#dccbb0', light: '#f4ecdf', patch: '#55331f', build: { torso: .17, depth: .2, belly: .03, bellyY: 1.2, chest: .03, arm: .24, leg: .18, neck: .8, hips: .08, back: .03, traps: .045 },
    trunks: '#b8231d', stripe: '#f4f1ea', gloves: '#1d1f24',
    colour(p, c, tawny, light) {
      const patch = lin(BRICK.patch), hx = p.x / HS, hy = (p.y - HEAD_Y) / HS, hz = p.z / HS, ax = Math.abs(p.x);
      // a fawn coat that deepens on the back, the flanks and down the limbs; a clean white blaze on the chest and muzzle
      c.lerp(lin('#b89a76'), clamp(.6 * smooth((-p.z + .02) / .14) + .45 * smooth((ax - .5) / .3) + .4 * smooth((.6 - p.y) / .4)));
      if (p.y > 1.05 && p.y < 1.72) c.lerp(light, .8 * bell(p.x, 0, .13) * smooth((p.z - .04) / .08));
      let k = 0;
      if (p.y > 1.80) k = Math.max(smooth((.112 - Math.hypot(hx - .1, (hy - .2) * .95, (hz - .19) * .45)) / .022), smooth((hx - .13) / .03) * smooth((hy - .2) / .03) * smooth((.1 - hz) / .1));
      else k = Math.max(smooth((.26 - Math.hypot((p.x - .12) * .8, p.y - 1.5, (p.z + .2) * 1.2)) / .03), smooth((.2 - Math.hypot((p.x + .36) * .8, p.y - 1.63, p.z * .4)) / .025), smooth((.13 - Math.hypot(p.x - .27, (p.y - 1.22) * .7, p.z * .5)) / .025), p.y < 1 ? smooth((.12 - Math.hypot(p.x + .2, (p.y - .74) * .7, (p.z - .08) * .6)) / .025) : 0, smooth((.085 - Math.hypot(p.x - .72, (p.y - 1.62) * 1.4, p.z)) / .02));
      if (k > 0) c.lerp(patch, clamp(k));
      // jowls, lips and the skin round the nose are darker and pinker
      if (p.y > 1.80) c.lerp(lin('#b79a86'), .7 * smooth((hz - .2) / .06) * bell(hy, .02, .05));
    },
    headForm(x, y, z, out) {
      const s = x < 0 ? -1 : 1, ax = Math.abs(x), fade = smooth((y + .09) / .05), front = smooth((z - .08) / .08), muzzle = smooth((z - .19) / .06) * (1 - smooth((y - .13) / .05));
      let dx = 0, dy = 0, dz = 0;
      // wide, flat skull; heavy cheeks and jaw
      const skull = 1 - smooth((z - .13) / .10);
      dx += x * .24 * skull * smooth((y + .04) / .08); dy -= .030 * smooth((y - .24) / .09) * bell(x, 0, .13); dy += .012 * smooth((y - .24) / .09) * bell(ax, .2, .07);
      const cheek = .05 * bell(y, .02, .085) * bell(z, .10, .13); dx += s * cheek * smooth(ax / .05);
      // flat face: the brow and eye plane come forward to the muzzle plane, the muzzle spreads wide and short
      dz += .074 * bell(y, .205, .075) * (1 - smooth((ax - .17) / .07)) * front;
      dx += x * .36 * muzzle; dy += .018 * muzzle * bell(y, .11, .04);
      dz -= .030 * muzzle * bell(y, .105, .03) * bell(x, 0, .05); // the nose sits in a fold between the eyes
      dz -= .028 * muzzle * smooth((y - .03) / .05); dy += .012 * bell(y, .16, .03) * bell(x, 0, .1) * front; // short, pushed-in muzzle under a roll of skin
      dz += .016 * bell(y, .262, .02) * (1 - smooth((ax - .16) / .05)) * front; // heavy brow bar
      const chin = bell(y, -.035, .035) * smooth((z - .10) / .07); dz += .034 * chin * bell(x, 0, .13); dx += s * .03 * chin * smooth(ax / .04); // underbite
      dz += .012 * bell(y, .252, .018) * bell(ax, .085, .07) * front; // brow ridge
      return growField(out.set(dx * fade, dy * fade, dz * fade), x, y, z, BRICK.K, smooth((y + .10) / .13));
    },
    sculpt(rig) { reshape(rig.skin.geometry, p => { bulk(p, BRICK.build); }); normals(rig.skin.geometry, rig.skin.geometry.attributes.position.array, rig.skin.geometry.attributes.normal.array); rig.skin.geometry.attributes.normal.needsUpdate = true; },
    face(rig) {
      castMats(rig); emptyMane(rig);
      const head = rig.joints.head, P = new Parts(), Z = seatHead(rig, BRICK.K), patch = BRICK.patch;
      for (const s of [-1, 1]) {
        // rose ears: small, folded back and down at the corners of the flat skull
        const ec = s > 0 ? patch : '#cdb89a', ei = s > 0 ? '#3f2616' : '#b79a86';
        // rose ears: a thick root on the skull corner, the leaf folded back and down with the inner fold showing
        P.sph(V(s * .236, .285, -.045), V(.05, .05, .03), ec, [.2, s * .6, s * -.5]);
        P.ribbon([V(s * .236, .3, -.04), V(s * .275, .305, -.06), V(s * .305, .27, -.075), V(s * .31, .225, -.07)], .085, .022, ec, V(0, .3, 1), 16, 10); P.ribbon([V(s * .262, .296, -.045), V(s * .292, .272, -.058), V(s * .3, .238, -.056)], .04, .012, ei, V(0, .3, 1), 10, 8);
        eye(rig, s, .098, .188, Z(.098, .188) - .012, .035, 'amber', { color: s > 0 ? 0x55331f : 0xd6c4a8, tilt: .22, open: .22 });
        // jowls hang over the corners of the mouth
        const jz = Z(.075, .02); P.sph(V(s * .082, .012, jz - .05), V(.068, .058, .06), '#e4d3bd', [0, 0, s * .3]); P.sph(V(s * .1, -.022, jz - .07), V(.05, .04, .05), '#d9c6ad', [0, 0, s * .4]);
        P.sph(V(s * .046, .012, Z(.046, .0) + .006), V(.011, .024, .01), '#fbf7ee', [0, 0, s * .12]); // lower canines of the underbite
        brow(rig, [V(s * .036, .222, Z(.036, .222) - .002), V(s * .095, .242, Z(.095, .242) - .001), V(s * .156, .228, Z(.156, .228) - .004)], s > 0 ? 0x3a2416 : 0xa8926f, .015);
      }
      const nz = Z(0, .112);
      P.sph(V(0, .118, nz + .006), V(.05, .03, .026), '#1f1917'); P.sph(V(-.013, .128, nz + .026), V(.012, .006, .005), '#6d645f');
      for (const [y, w, t] of [[.15, .058, .02], [.172, .075, .022], [.196, .06, .016]]) P.ribbon([V(-w, y - .012, Z(w, y - .012) - .008), V(-w * .5, y + .002, Z(w * .5, y) - .004), V(0, y + .007, Z(0, y) - .003), V(w * .5, y + .002, Z(w * .5, y) - .004), V(w, y - .012, Z(w, y - .012) - .008)], t, t * .8, y > .19 ? '#c7b294' : '#d6c4a8', V(0, 1, 0), 18, 8); // rolls of skin over the nose
      P.ribbon([V(-.11, .02, Z(.11, .02) - .004), V(-.06, .034, Z(.06, .034) + .004), V(0, .05, Z(0, .05) + .004), V(.06, .034, Z(.06, .034) + .004), V(.11, .02, Z(.11, .02) - .004)], .016, .014, '#3a2a25', V(0, 1, 0), 22, 8); // dark upper lip line across the muzzle
      P.ribbon([V(-.1, .0, Z(.1, 0) + .002), V(-.04, -.004, Z(.04, 0) + .016), V(0, .028, Z(0, .03) + .01), V(.04, -.004, Z(.04, 0) + .016), V(.1, .0, Z(.1, 0) + .002)], .008, .008, '#2a1f1b', V(0, 1, 0), 20, 6); // mouth line under the jowls
      // scar across the right brow: a pale hairless line with two stitch marks
      const sx = .098, scar = [V(sx - .03, .272, Z(sx - .03, .272) - .001), V(sx - .01, .246, Z(sx - .01, .246) + .001), V(sx + .012, .214, Z(sx + .012, .214) - .001)];
      P.ribbon(scar, .015, .007, '#e8a093', V(1, 0, 0), 10, 6);
      for (const k of [.3, .62]) { const c = scar[0].clone().lerp(scar[2], k); c.z = Z(c.x, c.y) + .001; P.ribbon([c.clone().add(V(-.017, -.006, 0)), c.clone().add(V(.017, .006, 0))], .005, .004, '#d18c80', V(0, 1, 0), 4, 6); }
      head.add(grow(P.mesh('Brick: ears, jowls, nose, scar'), BRICK.K));
      BRICK.mouthZ = Z(0, .03) * BRICK.K - .004;
    },
    finish(rig) {
      rig.tail.clear(); rig.ellipsoid(rig.tail, new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 1 }), V(0, -.05, -.2), V(.04, .045, .04));
      // red trunks with a white side stripe and a white waistband, on the heavier hips
      const g = rig.shorts.geometry; reshape(g, p => bulk(p, BRICK.build));
      const P = g.attributes.position, col = new Float32Array(P.count * 3), red = lin(BRICK.trunks), white = lin(BRICK.stripe), c = new THREE.Color();
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), side = smooth((Math.abs(x) - .2) / .02) * bell(z, -.005, .05), hem = 1 - smooth((y - .752) / .012); c.copy(red).lerp(white, clamp(Math.max(side, hem * .0))); col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      rig.shorts.material.vertexColors = true; rig.shorts.material.color.set(0xffffff); // the cloth material belongs to this rig alone
      for (const m of kitParts(rig).trim) { if (m.geometry.type === 'CylinderGeometry') { m.material = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: .6 }); m.scale.x *= 1 + BRICK.build.torso * .9 + BRICK.build.hips; m.scale.z *= 1 + BRICK.build.depth * .9 + BRICK.build.hips; } else m.visible = false; }
      rig.gloveMeshes.L.material.color.set(BRICK.gloves);
      { const NK = new Parts(), y0 = 1.745; for (const [dy, t, col] of [[0, .05, '#cdb99b'], [-.045, .058, '#c4ae8e']]) { const pts = []; for (let a = -1.9; a <= 1.91; a += .19) { const r = Math.max(.11, rim(rig, y0 + dy, a, .016, .22)) - t * .32; pts.push(V(Math.sin(a) * r, y0 + dy - 1.72 - .03 * (1 - Math.cos(a)) * .0, Math.cos(a) * r - .02)); } NK.ribbon(pts, t, t * .9, col, V(0, 1, 0), 40, 10); } rig.joints.neck.add(NK.mesh('Brick: neck rolls')); } // soft rolls sunk into the neck
      rig.skin.material.roughness = .8; if (rig.definition?.look) rig.definition.look.value.multiplyScalar(1.45); // short coat with a little sheen; hard muscle lines
    }
  };
  const DEFS = { bruno: BRUNO, brick: BRICK };
  /** The rabbit gets the same fur care: a cheek ruff, fur behind the ears and a chest tuft (identity unchanged). */
  function groom(rig) {
    if (!rig || rig.cast || rig.species !== 'rabbit' || rig.storyGroomed || !rig.skin?.geometry.attributes.color) return false; rig.storyGroomed = true;
    const j = rig.joints, hd = q => [q.x / HS, (q.y - HEAD_Y) / HS, q.z / HS], white = lin('#f0e9df');
    j.head.add(tufts(rig, q => { if (q.y < 1.8) return 0; const [hx, hy, hz] = hd(q), ax = Math.abs(hx); return smooth((ax - .135) / .04) * band(hy, -.04, .1, .035) * smooth((hz + .06) / .08) * (1 - smooth((hz - .1) / .05)); },
      { count: 520, len: .06, width: .019, lift: .28, droop: .2, origin: HEAD0, seed: 23, name: 'Rabbit: cheek ruff', flow: q => V(q.x * 2.2, -.7, -.35).normalize() }));
    return true;
  }
  function groomAll() { const e = window.app?.engine; if (!e) return; for (const c of [e.coach, ...Object.values(e.roster?.coaches || {}), e.arena?.rabbit, ...Object.values(e.arena?.padTrainers || {})]) groom(c); }
  if (typeof window.addEventListener === 'function') { window.addEventListener('load', () => setTimeout(groomAll, 0)); window.addEventListener('shadowbox-character', () => setTimeout(groomAll, 0)); }

  /* ---------------------------------------------------------------- kit parts, bare hands, shoes */
  /** The boxing kit as lists of objects (for hiding and restoring): gloves (everything on the hand joints), shorts, boots, trim. */
  function kitParts(rig) {
    const j = rig.joints, own = o => !o.userData.storyPart && !o.isBone, list = { gloves: [], shorts: [rig.shorts], boots: [], trim: [], fur: [rig.bodyFur, rig.storyChestFur].filter(Boolean) };
    for (const s of ['L', 'R']) { list.gloves.push(...j['hand' + s].children.filter(own)); list.boots.push(...j['foot' + s].children.filter(own)); list.trim.push(...j['thigh' + s].children.filter(own)); }
    list.trim.push(...j.hips.children.filter(o => own(o) && o.isMesh));
    list.shorts.push(...rig.root.children.filter(o => o.isSkinnedMesh && o !== rig.skin && o !== rig.shorts && o !== rig.bodyFur && own(o))); // Shop gear skinned to the body (trunk waistband)
    return list;
  }
  function hideKit(rig, groups) { const k = kitParts(rig); for (const gname of groups) for (const o of k[gname] || []) o.visible = false; }
  /** Bare hands: a soft closed paw with a thumb, in the fur colour, on the hand joints (hand frame: -y to the knuckles, +z palm). */
  function bareHands(rig, fur, pad) {
    const out = [];
    for (const s of [-1, 1]) {
      const P = new Parts();
      P.sph(V(0, -.052, .002), V(.047, .062, .034), fur); P.sph(V(0, -.108, .012), V(.043, .036, .030), fur, [.35, 0, 0]); // palm and loosely curled fingers
      for (let k = 0; k < 4; k++) P.sph(V(-.032 + k * .0213, -.128, .014 + (k === 0 || k === 3 ? -.003 : 0)), V(.0125, .02, .015), fur, [.5, 0, 0]);
      P.sph(V(s * -.043, -.062, .02), V(.016, .034, .017), fur, [.2, 0, s * .45]); // thumb on the inside
      P.sph(V(0, -.07, .033), V(.024, .026, .006), pad); P.cyl(V(0, .0, 0), V(.043, .06, .037), fur);
      const m = P.mesh('Bare hand'); rig.joints['hand' + (s < 0 ? 'L' : 'R')].add(m); out.push(m);
    }
    return out;
  }
  /** Street shoes on the foot joints (foot frame: sole at y = -0.08, toes toward +z). */
  function shoes(rig, o) {
    const out = [];
    for (const s of ['L', 'R']) {
      const P = new Parts();
      P.sph(V(0, -.066, .045), V(.066, .022, .168), o.sole); P.sph(V(0, -.062, .045), V(.0685, .012, .171), o.edge || o.sole); // sole with a foxing line
      P.sph(V(0, -.030, .098), V(.059, .042, .108), o.upper); P.sph(V(0, -.012, -.035), V(.056, .058, .078), o.upper); P.sph(V(0, .012, .02), V(.05, .05, .07), o.upper, [-.35, 0, 0]);
      P.sph(V(0, -.040, .168), V(.056, .03, .05), o.toe); // rubber toe cap
      P.tor(V(0, .052, -.02), V(.05, .05, .05), o.collar || o.upper, [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 4; k++) P.ribbon([V(-.028, .0 + k * .011, .112 - k * .024), V(0, .012 + k * .011, .118 - k * .024), V(.028, .0 + k * .011, .112 - k * .024)], .006, .004, o.lace, V(0, 0, 1), 6, 6);
      const m = P.mesh('Street shoe'); rig.joints['foot' + s].add(m); out.push(m);
    }
    return out;
  }

  /* ---------------------------------------------------------------- outfits (the Fighter and anyone else on the rig) */
  const HOODIE = { lion: ['#8f959c', '#787e86'], rabbit: ['#a55a3c', '#8a4630'] }; // grey marl on the lion, faded rust on the grey rabbit
  const FUR = { lion: { fur: '#b98143', pad: '#4a3324' }, rabbit: { fur: '#939ba7', pad: '#c79a9a' } };
  const OUTFITS = {
    kit: null,
    // arrival clothes: a grey marl hoodie, worn jeans, tired canvas sneakers, bare hands
    street: {
      hide: ['gloves', 'shorts', 'boots', 'trim', 'fur'],
      cloth(rig) {
        const tone = HOODIE[rig.species] || HOODIE.lion, hood = lin(tone[0]), dark = lin(tone[1]), denim = lin('#3d5b86'), worn = lin('#7f9cc4'), seam = lin('#c9a36a'), tmp = new THREE.Color();
        return v => {
          const ax = Math.abs(v.x);
          if (v.y > 1.772 || ax > .925 || v.y < .112) return null;
          if (v.y < 1.045 && v.arm < .5) { // jeans: side seam, faded thighs and knees, a turned-up hem
            const cx = .15 + (1 - v.y) * .07, ang = Math.atan2(v.z, ax - cx), seamLine = bell(Math.abs(ang), 0, .05) * smooth((ax - .2) / .03);
            const fade = Math.max(.5 * bell(v.y, .8, .16) * smooth(v.z / .05), .3 * bell(v.y, .55, .09) * smooth(v.z / .04)) * bell(ax, cx, .09);
            const hem = 1 - smooth((v.y - .135) / .02), fold = .0035 * Math.sin(v.y * 95 + ang * 2) * bell(v.y, .3, .16);
            const c = tmp.copy(denim).lerp(worn, clamp(fade)).lerp(seam, clamp(seamLine * .8)).lerp(worn, hem * .6).clone().multiplyScalar(1 - .06 * Math.sin(v.y * 700 + ax * 300));
            return { d: .013 + .009 * hem + fold * .15 + .004 * bell(v.y, .9, .12), c, move: v.y < .93 ? trouser(v, lerp(.112, .124, smooth((v.y - .5) / .4)), smooth((.93 - v.y) / .1)) : null };
          }
          // hoodie: ribbed hem and cuffs, a kangaroo pocket, loose over the waist
          const hem = 1 - smooth((v.y - 1.085) / .02), cuff = smooth((ax - .875) / .02), front = smooth((v.z - .02) / .06) * (1 - v.arm);
          const pocket = front * band(v.y, 1.10, 1.275, .012) * (1 - smooth((ax - (.185 - (v.y - 1.10) * .28)) / .012)), pocketEdge = front * Math.max(bell(v.y, 1.28, .009) * (1 - smooth((ax - .14) / .01)), bell(ax, .185 - (v.y - 1.10) * .28, .008) * band(v.y, 1.10, 1.28, .01));
          const waist = bell(v.y, 1.2, .14) * (1 - v.arm), wr = v.arm > .5 ? .004 * Math.sin(ax * 62) * bell(ax, .66, .11) : 0; // a few soft folds at the elbow only
          const rib = (hem > .2 || cuff > .2) ? .5 + .5 * Math.sin((cuff > .2 ? Math.atan2(v.z, v.y - 1.62) * 26 : Math.atan2(v.z, v.x) * 44)) : 0;
          const seamH = Math.max(bell(ax, .315, .006) * smooth((v.y - 1.42) / .05), bell(v.z, -.005, .005) * smooth((ax - .2) / .04) * (1 - v.arm) * (v.y < 1.4 ? 1 : 0), v.arm > .6 ? bell(Math.atan2(v.z, v.y - 1.615), -1.57, .05) : 0);
          const c = tmp.copy(hood).lerp(dark, clamp(Math.max(hem, cuff) * (.45 + .4 * rib) + pocketEdge * .9 + seamH * .75)).clone().multiplyScalar(1 - .07 * Math.sin(v.y * 900 + v.x * 610) * Math.sin(v.z * 770));
          const gather = .0045 * Math.sin(Math.atan2(v.z, v.x) * 13) * bell(v.y, 1.14, .05) * (1 - v.arm);
          const move = v.arm > .5 ? sleeve(v, lerp(.112, .07, smooth((ax - .40) / .48)), smooth((v.arm - .5) / .35)) : v.y < 1.73 ? tube(v, .30, lerp(.262, .19, smooth((v.y - 1.56) / .17)), lerp(.225, .17, smooth((v.y - 1.6) / .13)), (1 - v.arm * 2) * smooth((1.75 - v.y) / .05)) : null;
          return { d: .022 + .006 * waist + .005 * pocket + wr + gather - .006 * Math.max(hem, cuff) * (1 - rib * .5) - .006 * smooth((v.y - 1.71) / .06), c, move };
        };
      },
      parts(rig, add) {
        const f = FUR[rig.species] || FUR.lion, j = rig.joints, B = (x, y, back) => seat(rig, x, y, false, .02, back);
        for (const m of bareHands(rig, f.fur, f.pad)) add(m);
        for (const m of shoes(rig, { upper: '#d6cfbf', toe: '#bdb5a3', sole: '#a79e8c', edge: '#8c3b33', lace: '#efeadf', collar: '#b9b1a0' })) add(m);
        // the hood lies on the upper back; a collar ring and two drawstrings in front
        const P = new Parts(), [hood, dark] = HOODIE[rig.species] || HOODIE.lion, bz = B(0, 1.66, true), o = V(0, 1.36, 0), L = p => p.clone().sub(o);
        P.sph(L(V(0, 1.63, bz - .02)), V(.2, .17, .07), hood, [.2, 0, 0]); P.sph(L(V(0, 1.675, bz - .068)), V(.13, .09, .03), dark, [.2, 0, 0]); for (const sd of [-1, 1]) P.sph(L(V(sd * .13, 1.72, bz * .5 - .01)), V(.075, .06, .1), hood, [0, sd * .5, 0]);
        P.tor(L(V(0, 1.775, -.012)), V(.118, .135, .11), hood, [Math.PI / 2 - .22, 0, 0]);
        for (const s of [-1, 1]) { const z = B(s * .045, 1.62); P.ribbon([L(V(s * .05, 1.70, B(s * .05, 1.70) + .01)), L(V(s * .045, 1.64, B(s * .045, 1.64) + .01)), L(V(s * .05, 1.575, B(s * .05, 1.575) + .008))], .008, .008, '#e9e4d8', V(1, 0, 0), 10, 6); P.sph(L(V(s * .05, 1.568, B(s * .05, 1.575) + .008)), V(.008, .012, .008), '#e9e4d8'); }
        const m = P.mesh('Hood, collar, drawstrings'); j.chest.add(m); add(m);
      }
    }
  };
  const state = rig => rig.storyCast || (rig.storyCast = { outfit: 'kit', built: {}, hidden: [], base: null, bag: null });
  function outfit(rig, name) {
    if (!rig?.skin || !(name in OUTFITS)) return false;
    groom(rig); const st = state(rig), g = rig.skin.geometry; if (st.outfit === name) return true;
    // back to the kit: streams and every visibility flag exactly as they were
    if (st.outfit !== 'kit') { use(g, st.base); for (const [o, v] of st.hidden) o.visible = v; st.hidden = []; for (const m of st.built[st.outfit].parts) m.visible = false; if (st.bag) st.bag.visible = false; st.outfit = 'kit'; }
    if (name === 'kit') return true;
    const def = OUTFITS[name]; if (!st.base) st.base = grab(g);
    let b = st.built[name];
    if (!b) { b = st.built[name] = { parts: [], streams: null }; if (def.cloth) { b.streams = dress(g, def.cloth(rig), { relax: 26 }); use(g, b.streams); } if (def.parts) def.parts(rig, m => b.parts.push(m)); } // small parts are seated on the dressed surface
    if (b.streams) use(g, b.streams);
    const kit = kitParts(rig); for (const k of def.hide || []) for (const o of kit[k] || []) { st.hidden.push([o, o.visible]); o.visible = false; }
    for (const m of b.parts) m.visible = true; st.outfit = name; return true;
  }
  const outfitOf = rig => rig?.storyCast?.outfit || 'kit';

  /* ---------------------------------------------------------------- duffel bag */
  /** A worn canvas duffel bag along x (0.56 m long), origin at its centre. strap: a carrying loop for the shoulder. */
  function duffelParts(P, at = V(), strap = null) {
    const canvas = '#6b6d4e', dark = '#4f5139', tan = '#b08a55', A = p => p.clone().add(at);
    P.cyl(A(V()), V(.135, .52, .125), canvas, [0, 0, Math.PI / 2]); for (const s of [-1, 1]) { P.sph(A(V(s * .26, 0, 0)), V(.07, .135, .125), dark); P.tor(A(V(s * .2, 0, 0)), V(.132, .122, .12), tan, [0, Math.PI / 2, 0]); }
    P.ribbon([A(V(-.2, .128, 0)), A(V(0, .134, 0)), A(V(.2, .128, 0))], .022, .008, '#2f3026', V(0, 0, 1), 8, 6); // zip
    for (const z of [-1, 1]) P.ribbon([A(V(-.11, .1, z * .085)), A(V(-.07, .19, z * .05)), A(V(.07, .19, z * .05)), A(V(.11, .1, z * .085))], .024, .008, tan, V(0, 0, 1), 14, 6); // two grab handles
    P.box(A(V(.08, -.02, .118)), V(.13, .09, .02), dark); // side pocket
    if (strap) P.ribbon(strap, .042, .009, tan, V(0, 0, 1), 34, 8);
    return P;
  }
  function duffel() { const m = duffelParts(new Parts()).mesh('Duffel bag'); m.userData.mane = false; return m; }
  /** The bag on the Fighter's back, strap over the right shoulder and across the chest. */
  function bag(rig, mode) {
    const st = state(rig);
    if (!st.bag && mode === 'shoulder') {
      const B = (x, y, back) => seat(rig, x, y, false, .03, back), o = V(0, 1.36, 0), L = p => p.clone().sub(o), bz = B(-.12, 1.2, true) - .15;
      const at = V(-.2, 1.16, bz), strap = [V(-.34, 1.2, bz + .11), V(-.3, 1.3, B(-.26, 1.3, true) - .03), V(-.05, 1.6, B(-.05, 1.6, true) - .03), V(.17, 1.765, -.02), V(.19, 1.7, B(.19, 1.66) + .03), V(.06, 1.5, B(.06, 1.5) + .03), V(-.16, 1.3, B(-.16, 1.3) + .035), V(-.3, 1.2, .12), V(-.36, 1.17, bz + .13)].map(L);
      const g = new THREE.Group(); g.name = 'Duffel bag on the shoulder';
      const body = new Parts(); duffelParts(body, V(), null); const bm = body.mesh('Duffel bag'); bm.position.copy(L(at)); bm.rotation.set(.0, .28, -.5); g.add(bm);
      const sp = new Parts(); sp.ribbon(strap, .046, .01, '#b08a55', V(0, 0, 1), 44, 8, q => V(q.x, 0, q.z + .01).normalize().add(V(0, smooth((q.y - .3) / .08) * 1.2, 0)).normalize()); g.add(sp.mesh('Duffel strap'));
      rig.joints.chest.add(g); st.bag = g; st.bagBody = bm;
    }
    if (st.bag) st.bag.visible = mode === 'shoulder';
    return true;
  }

  /* ---------------------------------------------------------------- rigs */
  const cache = {};
  function rig(id, engine) {
    const def = DEFS[id]; if (!def) return null;
    if (cache[id]) return cache[id];
    const e = engine || window.app?.engine, data = e?.roster?.data || e?.arena?.data; if (!data || !window.LionCoach) return null;
    const c = new window.LionCoach(data, { species: 'lion', cast: def }); c.root.name = 'Story character ' + id;
    if (c.bodyFurOff && c.bodyFur) c.bodyFur.visible = false;
    return (cache[id] = c);
  }
  /** The character becomes the sparring partner / fight Opponent until restore() is called. */
  function asOpponent(engine, id) {
    const c = rig(id, engine), arena = engine?.arena; if (!c || !arena) return () => {};
    const before = arena.castOpponent || null; arena.castOpponent = c;
    return () => { if (arena.castOpponent === c) arena.castOpponent = before; if (arena.rabbit === c && !arena.castOpponent) { c.root.parent?.remove(c.root); arena.rabbit = null; delete arena.models.rabbit; } };
  }
  /** Opens the mouth for speech (0..1). Uses the face acting parts the rig makes on its first update. */
  function talk(rig, amount) { const f = rig.faceActing; if (!f) return; const a = clamp(amount); f.inner.visible = a > .06; f.inner.scale.y = .001 + .016 * a; f.lip.position.y = -.016 * a; }

  window.StoryCast = {
    ids: Object.keys(DEFS), names: { bruno: { en: 'Bruno', he: 'ברונו', ru: 'Бруно' }, brick: { en: 'Brick', he: 'בריק', ru: 'Брик' } }, defs: DEFS,
    rig, asOpponent, outfit, outfitOf, bag, duffel, talk, groom, groomAll, tufts,
    get outfits() { return Object.keys(OUTFITS); },
    registerOutfit(name, def) { if (name && name !== 'kit' && def) OUTFITS[name] = def; },
    Parts, seat, dress, bulk, kitParts
  };
})();
