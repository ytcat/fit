/* Street wear for the Fighter (GOTR-0093): clothes that are worn, not painted on.
 * The hoodie, the jeans and everything sewn on them (rib bands, hood, kangaroo pocket, drawstrings, waistband, belt, loops)
 * are ONE skinned mesh of their own, on the rig's skeleton and its dual-quaternion skinning. The garment surface starts from
 * the body's own rest surface (so armpits and crotch keep a clean topology), then is cut along hem / cuff / neckline lines,
 * reshaped like fabric (a slice-wise convex hull washes out the pecs, abs and muscle bulges; the hoodie hangs straight
 * from the chest and shoulder blades to a gathered hem; sleeves are loose tubes; the jeans fall straight from the knee),
 * kept 1.2-3 cm off the skin, and skinned with the body's bone weights (copied from the vertex it grew from, smoothed).
 * The body triangles hidden under the clothes are left out of the draw (index swap), so nothing can poke through; the
 * body near the edges is pulled in a few millimetres. Sneakers are lofted shoes (sole with a side wall, toe cap, tongue,
 * laces, heel tab). The duffel hangs behind the hip on a cross-body strap and swings on a spring as he walks.
 * Everything is built once per rig, colours once per tint; switching back to the kit restores the index, the streams and
 * every visibility flag exactly (StoryCast.outfit).
 * Loads after story-cast.js; registers the 'street' outfit and wraps StoryCast.bag. World: metres, y up, rest pose faces +z,
 * arms out along x. */
(() => {
  const SC = window.StoryCast; if (!SC) return;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); }, bell = (v, c, r) => Math.exp(-(((v - c) / r) ** 2));
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- garment lines (rest pose) */
  const HEM = 1.15, CUFF = .872, RIB = .052, CUFF_RIB = .062;          // hoodie hem, sleeve end (|x|), rib band heights
  const NECK_Z = -.012, neckY = th => 1.745 - .032 * Math.cos(th);        // neckline: lower at the throat, higher at the nape
  const neckF = (x, y, z) => { const r = Math.hypot(x, z - NECK_Z); return Math.max(y - 1.80, y - (neckY(Math.atan2(x, z - NECK_Z)) + 1.1 * Math.max(0, r - .128))); };
  const waistY = th => 1.13 - .012 * Math.cos(th);                      // jeans top, a little lower in front
  const LEG_X = .19, hemJ = th => .124 - .006 * Math.cos(th);            // jeans hem round the ankle (rests on the shoe)
  const legTh = (x, z) => Math.atan2(Math.abs(x) - LEG_X, z);

  /* ---------------------------------------------------------------- small geometry helpers */
  function weld(P) { const n = P.length / 3, rep = new Int32Array(n), map = new Map(); for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * 20000) + ':' + Math.round(P[i * 3 + 1] * 20000) + ':' + Math.round(P[i * 3 + 2] * 20000), r = map.get(k); if (r == null) { map.set(k, i); rep[i] = i; } else rep[i] = r; } return rep; }
  function csr(n, tris) { // vertex adjacency from triangles (local indices)
    const deg = new Int32Array(n), seen = new Set(), e = [];
    for (let t = 0; t < tris.length; t += 3) for (let k = 0; k < 3; k++) { const a = tris[t + k], b = tris[t + (k + 1) % 3], key = a < b ? a * 1048576 + b : b * 1048576 + a; if (a === b || seen.has(key)) continue; seen.add(key); e.push(a, b); deg[a]++; deg[b]++; }
    const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
    const fill = new Int32Array(n), nb = new Int32Array(start[n]); for (let k = 0; k < e.length; k += 2) { const a = e[k], b = e[k + 1]; nb[start[a] + fill[a]++] = b; nb[start[b] + fill[b]++] = a; }
    return { start, nb };
  }
  function smoothPos(pos, G, pin, rounds, lam = .5, mu = -.53, mask = null) { // Taubin: smooths without shrinking
    const n = pos.length / 3, tmp = new Float32Array(pos.length);
    for (let r = 0; r < rounds * 2; r++) {
      const f = r % 2 ? mu : lam; tmp.set(pos);
      for (let i = 0; i < n; i++) {
        if (pin[i]) continue; const a = G.start[i], b = G.start[i + 1]; if (a === b) continue; const w = f * (mask ? mask[i] : 1); if (!w) continue;
        let x = 0, y = 0, z = 0; for (let k = a; k < b; k++) { const j = G.nb[k] * 3; x += tmp[j]; y += tmp[j + 1]; z += tmp[j + 2]; } const m = 1 / (b - a);
        pos[i * 3] += (x * m - tmp[i * 3]) * w; pos[i * 3 + 1] += (y * m - tmp[i * 3 + 1]) * w; pos[i * 3 + 2] += (z * m - tmp[i * 3 + 2]) * w;
      }
    }
  }
  function vnormals(pos, tris, out = new Float32Array(pos.length)) {
    out.fill(0); const a = V(), b = V(), c = V();
    for (let t = 0; t < tris.length; t += 3) { const i = tris[t] * 3, j = tris[t + 1] * 3, k = tris[t + 2] * 3; a.set(pos[j] - pos[i], pos[j + 1] - pos[i + 1], pos[j + 2] - pos[i + 2]); b.set(pos[k] - pos[i], pos[k + 1] - pos[i + 1], pos[k + 2] - pos[i + 2]); c.crossVectors(a, b); for (const q of [i, j, k]) { out[q] += c.x; out[q + 1] += c.y; out[q + 2] += c.z; } }
    for (let i = 0; i < out.length; i += 3) { const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1; out[i] /= l; out[i + 1] /= l; out[i + 2] /= l; }
    return out;
  }
  function hull2(pts) { // convex hull of [x, z] pairs (monotone chain), counter-clockwise
    if (pts.length < 3) return pts; pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  function rayHull(h, dx, dz) { let best = 0; for (let k = 0; k < h.length; k++) { const a = h[k], b = h[(k + 1) % h.length], ex = b[0] - a[0], ez = b[1] - a[1], den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue; const t = (a[0] * ez - a[1] * ex) / den, u = (a[0] * dz - a[1] * dx) / den; if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.max(best, t); } return best; }
  /** Radius table R[slice][angle] of the convex hull of each slice (points relative to a per-slice centre). */
  function hullTable(slices, nTh) {
    return slices.map(pts => { const h = hull2(pts.slice()), row = new Float32Array(nTh); if (h.length < 3) return null; for (let k = 0; k < nTh; k++) { const a = k / nTh * TAU; row[k] = rayHull(h, Math.sin(a), Math.cos(a)); } return row; });
  }
  const lookup = (T, s, th, nTh) => { const f = ((th / TAU) % 1 + 1) % 1 * nTh, k = Math.floor(f), u = f - k, row = T[s]; return row ? lerp(row[k % nTh], row[(k + 1) % nTh], u) : 0; };
  function fillRows(T) { for (let s = 0; s < T.length; s++) if (!T[s]) { let a = s, b = s; while (a >= 0 && !T[a]) a--; while (b < T.length && !T[b]) b++; T[s] = T[a >= 0 ? a : b] || T[b < T.length ? b : a]; } }
  function blurRows(T, nTh, rounds = 2, k = 1) { for (let r = 0; r < rounds; r++) { const C = T.map(r0 => r0.slice()); for (let s = 0; s < T.length; s++) for (let i = 0; i < nTh; i++) { let acc = 0, n = 0; for (let ds = -k; ds <= k; ds++) for (let di = -k; di <= k; di++) { const row = C[clamp(s + ds, 0, T.length - 1)]; acc += row[(i + di + nTh) % nTh]; n++; } T[s][i] = Math.max(T[s][i], acc / n); } } }

  /** Spatial hash of points for nearest / surface queries. */
  class Grid {
    constructor(pos, cell = .03) { this.p = pos; this.c = cell; this.m = new Map(); for (let i = 0; i < pos.length / 3; i++) { const k = this.key(Math.floor(pos[i * 3] / cell), Math.floor(pos[i * 3 + 1] / cell), Math.floor(pos[i * 3 + 2] / cell)); let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(i); } }
    key(i, j, k) { return ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); }
    near(x, y, z, r, fn) { const c = this.c, P = this.p, n = Math.ceil(r / c), i0 = Math.floor(x / c), j0 = Math.floor(y / c), k0 = Math.floor(z / c), r2 = r * r; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) { const a = this.m.get(this.key(i0 + i, j0 + j, k0 + k)); if (a) for (let t = 0; t < a.length; t++) { const q = a[t], dx = P[q * 3] - x, dy = P[q * 3 + 1] - y, dz = P[q * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d <= r2) fn(q, d); } } }
    nearest(x, y, z, r = .06) { let best = -1, bd = 1e9; this.near(x, y, z, r, (q, d) => { if (d < bd) { bd = d; best = q; } }); return best < 0 && r < .5 ? this.nearest(x, y, z, r * 2) : best; }
    /** The outermost surface point along the ray p + t d (d unit, t in [t0, t1]): max t of points within `w` of the line. Marches in from outside. */
    surface(p, d, w = .014, t0 = -.12, t1 = .45) { const P = this.p, w2 = w * w, c = this.c; let best = -1e9, at = -1;
      for (let t = t1; t >= t0 - 1e-9; t -= c) { this.near(p.x + d.x * t, p.y + d.y * t, p.z + d.z * t, c * 1.05, q => { const vx = P[q * 3] - p.x, vy = P[q * 3 + 1] - p.y, vz = P[q * 3 + 2] - p.z, tt = vx * d.x + vy * d.y + vz * d.z, px = vx - d.x * tt, py = vy - d.y * tt, pz = vz - d.z * tt; if (px * px + py * py + pz * pz < w2 && tt > best) { best = tt; at = q; } }); if (at >= 0 && best > t - c * 2) break; }
      return at < 0 ? null : { t: best, i: at }; }
  }

  /* ---------------------------------------------------------------- vertex-coloured triangle soup (skinned later) */
  class Soup {
    constructor() { this.p = []; this.n = []; this.c = []; this.k = []; } // k: tag (0 cloth, 1 rigid-ish part) - for weight transfer
    tri(a, b, c, ca, cb, cc, na, nb, nc, tag = 0) { for (const [p, q, n] of [[a, ca, na], [b, cb, nb], [c, cc, nc]]) { this.p.push(p.x, p.y, p.z); this.c.push(q.r, q.g, q.b); this.n.push(n.x, n.y, n.z); this.k.push(tag); } }
    /** A grid surface f(u, v) -> [point, colour] for u in [0, nu], v in [0, nv]; closedU wraps u. Normals by finite differences, flipped by `flip`. */
    grid(nu, nv, f, { closedU = false, flip = false, tag = 0 } = {}) {
      const P = [], C = [], N = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const [p, c] = f(closedU ? i % nu : i, j); P.push(p); C.push(c); }
      const at = (i, j) => P[clamp(j, 0, nv) * (nu + 1) + (closedU ? ((i % nu) + nu) % nu : clamp(i, 0, nu))];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const du = at(i + 1, j).clone().sub(at(i - 1, j)), dv = at(i, j + 1).clone().sub(at(i, j - 1)), n = du.cross(dv).normalize(); if (flip) n.negate(); N.push(n); }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1, T = flip ? [[a, c, b], [b, c, d]] : [[a, b, c], [b, d, c]];
        for (const [x, y, z] of T) this.tri(P[x], P[y], P[z], C[x], C[y], C[z], N[x], N[y], N[z], tag);
      }
      return this;
    }
    /** A round cord along points (radius r), closed ends. */
    cord(pts, r, col, seg = 20, ring = 6, tag = 1) { const path = new THREE.CatmullRomCurve3(pts), up = V(0, 1, 0); this.grid(ring, seg, (i, j) => { const u = j / seg, o = path.getPoint(u), t = path.getTangent(u), s = Math.abs(t.dot(up)) > .9 ? V(1, 0, 0) : up.clone(), a = t.clone().cross(s).normalize(), b = t.clone().cross(a).normalize(), ang = i / ring * TAU, taper = Math.min(1, Math.min(u, 1 - u) * seg / 1.2 + .3); return [o.clone().addScaledVector(a, Math.cos(ang) * r * taper).addScaledVector(b, Math.sin(ang) * r * taper), col]; }, { closedU: true, tag }); return this; }
    geometry() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); return g; }
  }

  /* ---------------------------------------------------------------- the garment surface from the body */
  const PALETTE = {
    lion: { hood: '#8e949b', hood2: '#73797f', drawcord: '#ecebe4' },
    rabbit: { hood: '#a85b3b', hood2: '#86452c', drawcord: '#efe6d6' }
  };
  const DENIM = { base: '#344d73', fade: '#7f9bc0', dark: '#223450', stitch: '#c79a55', belt: '#3b2a20', buckle: '#b9b4a8' };

  function buildShape(rig) {
    const st = rig.storyCast, g = rig.skin.geometry, base = st.base, P = base.position.array, N = base.normal.array, A = g.attributes.coachArmBlend.array, idx = st.fullIndex.array;
    const SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, LIN = g.attributes.coachLinear?.array, NB = rig.bones.length;
    const n = P.length / 3, rep = weld(P);
    // which garment each body vertex is in (signed: < 0 inside) - hoodie (H) and jeans (J) overlap at the waist
    const fH = new Float32Array(n), fJ = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], a = A[i], ax = Math.abs(x);
      fH[i] = a >= .5 ? (ax - CUFF) : Math.max(HEM - y, neckF(x, y, z));
      fJ[i] = a >= .5 ? 1 : (y < .62 ? Math.max(y - waistY(Math.atan2(x, z)), hemJ(legTh(x, z)) - y) : y - waistY(Math.atan2(x, z)));
    }
    // body triangles under the clothes (all corners deep inside) are not drawn in street clothes
    const keep = [];
    const deep = i => { const x = P[i * 3], y = P[i * 3 + 1], ax = Math.abs(x); return (A[i] >= .5 ? ax < CUFF - .035 : (fH[i] < -.022)) || fJ[i] < -.02 || (A[i] < .5 && y < hemJ(legTh(x, P[i * 3 + 2])) + .01); };
    for (let t = 0; t < idx.length; t += 3) if (!(deep(idx[t]) && deep(idx[t + 1]) && deep(idx[t + 2]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    const reduced = new THREE.BufferAttribute(new (idx.constructor)(keep), 1);
    // the body near the clothes' edges is pulled in under them (a few mm), relief washed out
    const pull = new Float32Array(n); for (let i = 0; i < n; i++) pull[i] = Math.max(clamp(-fH[i] / .01), clamp(-fJ[i] / .01));

    const parts = {};
    for (const key of ['H', 'J']) {
      const f = key === 'H' ? fH : fJ, tris = [], local = new Map(), orig = [];
      const L = i => { const r = rep[i]; let k = local.get(r); if (k == null) { k = orig.length; local.set(r, k); orig.push(r); } return k; };
      for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if ((f[a] + f[b] + f[c]) / 3 < 0) { const la = L(a), lb = L(b), lc = L(c); if (la !== lb && lb !== lc && la !== lc) tris.push(la, lb, lc); } }
      parts[key] = { tris, orig, G: csr(orig.length, tris) };
    }

    /* hoodie: torso by slices (hull, drape, ease), sleeves as loose tubes, shoulders from the smoothed body */
    const H = parts.H, nH = H.orig.length, X = new Float32Array(nH * 3), S = new Float32Array(nH * 3);
    for (let k = 0; k < nH; k++) { const i = H.orig[k]; S[k * 3] = P[i * 3]; S[k * 3 + 1] = P[i * 3 + 1]; S[k * 3 + 2] = P[i * 3 + 2]; }
    smoothPos(S, H.G, new Uint8Array(nH), 40);
    const SN = vnormals(S, H.tris); const DBG = window.__swDbg; DBG?.("S", S);
    const Y0 = 1.05, DY = .01, NS = 75, NT = 72, slices = Array.from({ length: NS }, () => []), cz = new Float32Array(NS);
    { const zmin = new Float32Array(NS).fill(9), zmax = new Float32Array(NS).fill(-9);
      for (let i = 0; i < n; i++) { const y = P[i * 3 + 1], s = Math.round((y - Y0) / DY); if (s < 0 || s >= NS || A[i] > .02 || Math.abs(y - (Y0 + s * DY)) > .007) continue; const x = P[i * 3], z = P[i * 3 + 2]; if (y > 1.36 && Math.abs(x) > .27) continue; zmin[s] = Math.min(zmin[s], z); zmax[s] = Math.max(zmax[s], z); slices[s].push([x, z]); }
      { let acc = 0, m = 0; for (let s = 0; s < NS; s++) if (zmax[s] > zmin[s]) { acc += (zmin[s] + zmax[s]) / 2; m++; } cz.fill(m ? acc / m : 0); } /* one fixed axis: the drape is measured straight down */ for (let s = 0; s < NS; s++) slices[s] = slices[s].map(([x, z]) => [x, z - cz[s]]); }
    const RT = hullTable(slices, NT); fillRows(RT);
    // drape: the cloth falls from the fullest point above (chest, shoulder blades) and barely tapers to the hem
    const top = th => lerp(1.68, 1.36, smooth((Math.abs(Math.sin(th)) - .42) / .38));
    for (let k = 0; k < NT; k++) { const th = k / NT * TAU, sTop = Math.round((top(th) - Y0) / DY); let run = 0; for (let s = Math.min(NS - 1, sTop); s >= 0; s--) { run = Math.max(run - .06 * DY, RT[s][k]); RT[s][k] = Math.max(RT[s][k], run); } }
    blurRows(RT, NT, 3, 1);
    const sliceOf = y => clamp(Math.round((y - Y0) / DY), 0, NS - 1);
    // sleeves: per-x centre and radius of the arm
    const AX0 = .38, ADX = .01, NA = 52, ac = Array.from({ length: NA }, () => [0, 0, 0, 0, 9, -9, 9, -9]); // [n, ., ., r, ymin, ymax, zmin, zmax]
    for (let i = 0; i < n; i++) { if (A[i] < .95) continue; const ax = Math.abs(P[i * 3]), s = Math.round((ax - AX0) / ADX); if (s < 0 || s >= NA) continue; const q = ac[s], y = P[i * 3 + 1], z = P[i * 3 + 2]; q[4] = Math.min(q[4], y); q[5] = Math.max(q[5], y); q[6] = Math.min(q[6], z); q[7] = Math.max(q[7], z); q[0]++; }
    for (let s = 0; s < NA; s++) { const q = ac[s]; if (q[0]) { q[1] = (q[4] + q[5]) / 2; q[2] = (q[6] + q[7]) / 2; } }
    { const full = ac.map((q, s) => q[0] ? s : -1).filter(s => s >= 0); for (let s = 0; s < NA; s++) if (!ac[s][0]) { const f = full.reduce((b, k) => Math.abs(k - s) < Math.abs(b - s) ? k : b, full[0]); ac[s] = ac[f].slice(); ac[s][0] = 0; ac[s][9] = 1; } }
    for (let i = 0; i < n; i++) { if (A[i] < .95) continue; const ax = Math.abs(P[i * 3]), s = Math.round((ax - AX0) / ADX); if (s < 0 || s >= NA || ac[s][9]) continue; const q = ac[s]; q[3] = Math.max(q[3], Math.hypot(P[i * 3 + 1] - q[1], P[i * 3 + 2] - q[2])); }
    { const full = ac.map((q, s) => q[9] ? -1 : s).filter(s => s >= 0); for (let s = 0; s < NA; s++) if (ac[s][9]) ac[s][3] = ac[full.reduce((b, k) => Math.abs(k - s) < Math.abs(b - s) ? k : b, full[0])][3]; }
    { const sm = ac.map((q, s) => { let cy = 0, czz = 0, r = 0, w = 0; for (let d = -5; d <= 5; d++) { const o = ac[clamp(s + d, 0, NA - 1)], k = Math.exp(-(d * d) / 10); cy += o[1] * k; czz += o[2] * k; w += k; } return [cy / w, czz / w]; }); // centre line smoothed along the arm
      for (let s = 0; s < NA; s++) { ac[s][1] = sm[s][0]; ac[s][2] = sm[s][1]; }
      let run = 0; for (let s = NA - 1; s >= 0; s--) { run = Math.max(run - .0006, ac[s][3]); ac[s][3] = run; } } // a sleeve never narrows toward the shoulder: no biceps / elbow relief
    const armAt = ax => { const f = clamp((ax - AX0) / ADX, 0, NA - 1), k = Math.min(NA - 2, Math.floor(f)), u = f - k, a = ac[k], b = ac[k + 1]; return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; };
    // the sleeve radius: loose over the upper arm, a little narrower down the forearm, gathered into the cuff
    let maxUpper = 0; for (let s = 0; s < NA; s++) if (AX0 + s * ADX < .62) maxUpper = Math.max(maxUpper, ac[s][3]);
    const sleeveR = (ax, body) => { const prof = lerp(maxUpper + .008, maxUpper * .76 + .012, smooth((ax - .48) / .34)); const cuffK = smooth((ax - (CUFF - .075)) / .06); return Math.max(body + .012, lerp(prof, body + .013, cuffK)); };
    const ease = (y, th) => lerp(.012, .022, smooth((y - (HEM + .02)) / .07)) + .004 * bell(y, HEM + .085, .03); // gathered at the rib, blousing just above it
    const pinH = new Uint8Array(nH), bnd = boundary(H);
    for (let k = 0; k < nH; k++) {
      const i = H.orig[k], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], a = A[i], ax = Math.abs(x);
      // torso target
      const s = sliceOf(y), th = Math.atan2(x, z - cz[s]), r = Math.hypot(x, z - cz[s]), R = lookup(RT, s, th, NT) + ease(y, th);
      const hullW = (1 - smooth((y - top(th) + .02) / .16)) * (1 - smooth((a - .02) / .2));
      let tx = lerp(S[k * 3] + SN[k * 3] * .018, Math.sin(th) * R, hullW), ty = lerp(S[k * 3 + 1] + SN[k * 3 + 1] * .018, y, hullW), tz = lerp(S[k * 3 + 2] + SN[k * 3 + 2] * .018, cz[s] + Math.cos(th) * R, hullW);
      if (hullW > 0 && r > Math.sin(0) && R < r + .012) { /* hull never inside the body */ }
      // sleeve target
      const aw = smooth((a - .3) / .5);
      if (aw > 0) { const [cy, czA] = armAt(ax), [, , rb] = armAt(ax), dy = y - cy, dz = z - czA, rr = Math.hypot(dy, dz) || 1, Rs = sleeveR(ax, rb); tx = lerp(tx, x, aw); ty = lerp(ty, cy + dy / rr * Rs, aw); tz = lerp(tz, czA + dz / rr * Rs, aw); }
      X[k * 3] = tx; X[k * 3 + 1] = ty; X[k * 3 + 2] = tz;
    }
    // clean lines: hem, cuffs and neckline exactly on their curves, pinned while the rest relaxes
    const snapH = k => { const i = H.orig[k]; if (A[i] >= .5) { X[k * 3] = Math.sign(X[k * 3]) * CUFF; return; } const x = X[k * 3], z = X[k * 3 + 2]; if (fH[i] > -.02 && HEM - P[i * 3 + 1] > neckF(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])) X[k * 3 + 1] = HEM; else X[k * 3 + 1] = neckY(Math.atan2(x, z - NECK_Z)) + 1.1 * Math.max(0, Math.hypot(x, z - NECK_Z) - .128); };
    { const m = new Float32Array(nH); for (let k = 0; k < nH; k++) { const i = H.orig[k]; m[k] = bell(A[i], .5, .35) * smooth((P[i * 3 + 1] - 1.36) / .08); } smoothPos(X, H.G, pinH, 60, .55, -.57, m); } // round shoulders, no deltoid balloons
    for (const k of bnd) { snapH(k); pinH[k] = 1; } DBG?.("T", X);
    const clear = (Xa, part, cmin) => { for (let k = 0; k < part.orig.length; k++) { const i = part.orig[k], d = (Xa[k * 3] - P[i * 3]) * N[i * 3] + (Xa[k * 3 + 1] - P[i * 3 + 1]) * N[i * 3 + 1] + (Xa[k * 3 + 2] - P[i * 3 + 2]) * N[i * 3 + 2], c = cmin(k, i); if (d < c) { Xa[k * 3] += N[i * 3] * (c - d); Xa[k * 3 + 1] += N[i * 3 + 1] * (c - d); Xa[k * 3 + 2] += N[i * 3 + 2] * (c - d); } } };
    const cH = (k, i) => A[i] >= .5 ? .012 : .014;
    for (let r = 0; r < 3; r++) { smoothPos(X, H.G, pinH, r ? 4 : 12); clear(X, H, cH); } DBG?.("X", X);

    /* jeans: legs by slices round each leg, the seat and hips round the body; straight below the knee */
    const J = parts.J, nJ = J.orig.length, XJ = new Float32Array(nJ * 3), SJ = new Float32Array(nJ * 3);
    for (let k = 0; k < nJ; k++) { const i = J.orig[k]; SJ[k * 3] = P[i * 3]; SJ[k * 3 + 1] = P[i * 3 + 1]; SJ[k * 3 + 2] = P[i * 3 + 2]; }
    smoothPos(SJ, J.G, new Uint8Array(nJ), 30);
    const LY0 = .1, LDY = .01, NL = 102, legS = [[], []].map(() => Array.from({ length: NL }, () => [])), legC = [0, 1].map(() => Array.from({ length: NL }, () => [0, 0]));
    { const ext = [0, 1].map(() => Array.from({ length: NL }, () => [9, -9, 9, -9]));
      for (let i = 0; i < n; i++) { if (A[i] > .02) continue; const y = P[i * 3 + 1], s = Math.round((y - LY0) / LDY); if (s < 0 || s >= NL || Math.abs(y - (LY0 + s * LDY)) > .007) continue; const x = P[i * 3], z = P[i * 3 + 2], side = x < 0 ? 0 : 1, e = ext[side][s]; e[0] = Math.min(e[0], x); e[1] = Math.max(e[1], x); e[2] = Math.min(e[2], z); e[3] = Math.max(e[3], z); legS[side][s].push([x, z]); }
      for (const side of [0, 1]) for (let s = 0; s < NL; s++) { const e = ext[side][s]; legC[side][s] = e[1] > e[0] ? [(e[0] + e[1]) / 2, (e[2] + e[3]) / 2] : (s ? legC[side][s - 1] : [side ? LEG_X : -LEG_X, 0]); legS[side][s] = legS[side][s].map(([x, z]) => [x - legC[side][s][0], z - legC[side][s][1]]); } }
    // pelvis rows (y > 0.92) use the whole slice round x = 0
    const pel = Array.from({ length: NL }, () => []), pz = new Float32Array(NL);
    for (let s = 0; s < NL; s++) { const y = LY0 + s * LDY; if (y < .9) continue; let lo = 9, hi = -9; for (const side of [0, 1]) for (const [x, z] of legS[side][s]) { const zz = z + legC[side][s][1]; lo = Math.min(lo, zz); hi = Math.max(hi, zz); } pz[s] = (lo + hi) / 2; for (const side of [0, 1]) for (const [x, z] of legS[side][s]) pel[s].push([x + legC[side][s][0], z + legC[side][s][1] - pz[s]]); }
    const RL = [0, 1].map(side => { const T = hullTable(legS[side], NT); fillRows(T); return T; }), RP = hullTable(pel, NT); for (let s = 0; s < NL; s++) if (!RP[s]) RP[s] = new Float32Array(NT);
    // straight leg: below the knee the cloth falls from the knee and calf, barely tapering, never tighter than the shoe needs
    for (const side of [0, 1]) for (let k = 0; k < NT; k++) { let run = 0; for (let s = Math.round((.78 - LY0) / LDY); s >= 0; s--) { run = Math.max(run - .085 * LDY, RL[side][s][k]); RL[side][s][k] = Math.max(RL[side][s][k], run, .066); } }
    for (const T of RL) blurRows(T, NT, 2, 1); blurRows(RP, NT, 2, 1);
    const legEase = y => lerp(.016, .011, smooth((y - .5) / .3)) + .004 * bell(y, .55, .06);
    const pinJ = new Uint8Array(nJ), bndJ = boundary(J);
    for (let k = 0; k < nJ; k++) {
      const i = J.orig[k], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], side = x < 0 ? 0 : 1, s = clamp(Math.round((y - LY0) / LDY), 0, NL - 1), c = legC[side][s];
      const th = Math.atan2(x - c[0], z - c[1]), R = lookup(RL[side], s, th, NT) + legEase(y);
      let tx = c[0] + Math.sin(th) * R, tz = c[1] + Math.cos(th) * R;
      const pw = smooth((y - .93) / .06), medial = smooth((.9 - y) / .04) ? 0 : 0;
      if (pw > 0) { const tp = Math.atan2(x, z - pz[s]), Rp = lookup(RP, s, tp, NT) + .012; tx = lerp(tx, Math.sin(tp) * Rp, pw); tz = lerp(tz, pz[s] + Math.cos(tp) * Rp, pw); }
      const cw = bell(y, .88, .035) * (1 - smooth((Math.abs(x) - .06) / .05)); // the crotch: smoothed body
      tx = lerp(tx, SJ[k * 3], cw); tz = lerp(tz, SJ[k * 3 + 2] + .012, cw);
      XJ[k * 3] = tx; XJ[k * 3 + 1] = y + medial; XJ[k * 3 + 2] = tz;
    }
    for (const k of bndJ) { const i = J.orig[k], x = XJ[k * 3], z = XJ[k * 3 + 2]; XJ[k * 3 + 1] = P[i * 3 + 1] < .62 ? hemJ(legTh(x, z)) : waistY(Math.atan2(x, z)); pinJ[k] = 1; }
    for (let r = 0; r < 3; r++) { smoothPos(XJ, J.G, pinJ, r ? 4 : 10); clear(XJ, J, () => .011); }

    // the skin weights the cloth grew from, smoothed along the cloth
    const weights = (part, rounds, mask = null) => { const m = part.orig.length, W = new Float32Array(m * NB), T = new Float32Array(m * NB); for (let k = 0; k < m; k++) { const i = part.orig[k]; for (let q = 0; q < 4; q++) W[k * NB + SI[i * 4 + q]] += SW[i * 4 + q]; }
      for (let r = 0; r < rounds; r++) { T.set(W); for (let k = 0; k < m; k++) { const a = part.G.start[k], b = part.G.start[k + 1]; if (a === b) continue; for (let q = 0; q < NB; q++) { let acc = 0; for (let e = a; e < b; e++) acc += T[part.G.nb[e] * NB + q]; const w = mask ? .5 * mask[k] : .5; W[k * NB + q] = (1 - w) * T[k * NB + q] + w * acc / (b - a); } } } return W; };
    const shoulder = new Float32Array(nH); for (let k = 0; k < nH; k++) { const i = H.orig[k]; shoulder[k] = Math.max(.25, bell(A[i], .45, .35) * smooth((P[i * 3 + 1] - 1.4) / .1)); }
    H.W = weights(H, 30, shoulder); J.W = weights(J, 4); H.X = X; J.X = XJ; H.lin = H.orig.map((i, k) => Math.max(LIN ? LIN[i] : 0, .6 * bell(A[i], .45, .3) * smooth((P[i * 3 + 1] - 1.48) / .1))); J.lin = J.orig.map(i => LIN ? LIN[i] : 0);
    H.N = vnormals(X, H.tris); J.N = vnormals(XJ, J.tris);
    return { parts, reduced, pull, legC, NB, ac, armAt, sleeveR };
  }
  function boundary(part) { // vertices on open edges
    const cnt = new Map(); for (let t = 0; t < part.tris.length; t += 3) for (let k = 0; k < 3; k++) { const a = part.tris[t + k], b = part.tris[t + (k + 1) % 3], key = a < b ? a * 1048576 + b : b * 1048576 + a; cnt.set(key, (cnt.get(key) || 0) + 1); }
    const out = new Set(); for (const [key, c] of cnt) if (c === 1) { out.add(Math.floor(key / 1048576)); out.add(key % 1048576); } return out;
  }

  /* ---------------------------------------------------------------- dressing: colours, folds, sewn parts */
  function dressMesh(rig, shape, tint) {
    const pal = PALETTE[rig.species] || PALETTE.lion, hood = tint ? lin(tint).lerp(lin('#8a8f96'), .35) : lin(pal.hood), hood2 = hood.clone().multiplyScalar(.8), dark = hood.clone().multiplyScalar(.62);
    const denim = lin(DENIM.base), fade = lin(DENIM.fade), dd = lin(DENIM.dark), stitch = lin(DENIM.stitch), tmp = new THREE.Color();
    const { parts } = shape, H = parts.H, J = parts.J, soup = new Soup();
    const P0 = rig.storyCast.base.position.array;
    // folds: small displacements along the cloth normal, darker in the creases
    const foldH = (x, y, z, a) => {
      const ax = Math.abs(x); let f = 0;
      if (a > .5) { // sleeves: bunching at the wrist, a few creases inside the elbow
        const wr = smooth((ax - .68) / .08) * (1 - smooth((ax - (CUFF - .055)) / .02)), ang = Math.atan2(z, y - 1.615);
        f += .0042 * wr * Math.sin(ax * 230 + 2.2 * Math.sin(ang * 1.5 + ax * 40)) * (.35 + .65 * smooth(Math.sin(ang * 2 + ax * 25 + 1) * 1.5 + .2));
        f += .004 * bell(ax, .655, .05) * smooth(z / .04) * Math.sin(ax * 190 + y * 40);
      } else { // body: soft vertical drape below the chest, a roll over the rib, drag folds from the armpit
        const th = Math.atan2(x, z), drape = smooth((1.42 - y) / .2) * smooth((y - HEM - .07) / .05);
        f += .0045 * drape * Math.sin(th * 7 + .8 * Math.sin(y * 9)) + .006 * bell(y, HEM + .065, .022);
        f += .0035 * bell(ax, .2, .06) * bell(y, 1.42, .06) * Math.sin((y + ax * .9) * 120);
      }
      return f;
    };
    const foldJ = (x, y, z) => { const ax = Math.abs(x), th = legTh(x, z);
      const stack = smooth((.3 - y) / .1) * smooth((y - .13) / .015), knee = bell(y, .55, .05) * smooth(-Math.cos(th) / .3), whisk = bell(y, .9, .04) * bell(ax, .1, .05) * smooth(z / .05);
      return .005 * stack * Math.sin(y * 210 + 1.4 * Math.sin(th * 2)) + .003 * knee * Math.sin(y * 260) + .0025 * whisk * Math.sin((y - ax * 1.2) * 250); };
    const colH = (x, y, z, a, f) => {
      const ax = Math.abs(x), th = Math.atan2(x, z), heather = 1 + .07 * (hash(x * 91, y * 57, z * 33) - .5) + .03 * Math.sin(y * 230 + x * 170);
      const seamShoulder = a > .3 && a < .8 ? bell(a, .55, .06) : 0, side = a < .5 ? bell(Math.abs(Math.abs(th) - Math.PI / 2), 0, .035) * smooth((1.4 - y) / .05) : 0, under = a > .5 ? bell(Math.atan2(z, y - 1.615), -Math.PI, .08) : 0;
      const c = tmp.copy(hood).lerp(hood2, clamp(.35 * smooth((-z - .02) / .1)));
      c.lerp(dark, clamp(Math.max(seamShoulder, side, under) * .55)); c.multiplyScalar(heather * (1 - clamp(-f * 70) * .35 + clamp(f * 70) * .05));
      return c.clone();
    };
    const colJ = (x, y, z, f) => {
      const ax = Math.abs(x), th = legTh(x, z), lt = Math.atan2(x, z);
      const fadeK = Math.max(.6 * bell(y, .8, .14) * smooth(Math.cos(th) / .5), .45 * bell(y, .55, .07) * smooth(Math.cos(th) / .4), .35 * bell(y, .9, .07) * smooth(-z / .05) * bell(ax, .12, .07));
      const seam = y < .97 ? bell(th - Math.PI / 2, 0, .045) : 0, inseam = y < .86 ? bell(th + Math.PI / 2, 0, .05) : 0; // outseam, inseam
      const yoke = z < -.02 ? bell(y - (1.035 - .06 * smooth(ax / .16)), 0, .0045) : 0;
      const backPocket = z < -.06 ? Math.max(bell(y, .995, .004), bell(ax, .045, .004), bell(ax, .165, .004)) * (y < 1.0 && y > .86 && ax > .04 && ax < .17 ? 1 : 0) : 0;
      const frontPocket = z > .04 ? bell(Math.hypot(ax - .2, y - 1.08) - .075, 0, .004) * (y > 1.0 && ax > .12 ? 1 : 0) : 0, fly = z > .06 ? bell(ax - .035 - .015 * smooth((.98 - y) / .03), 0, .004) * (y > .93 && y < 1.08 ? 1 : 0) : 0;
      const hem = smooth((hemJ(th) + .018 - y) / .006);
      const twill = 1 + .06 * Math.sin((y * 1.2 + (x + z) * .8) * 520) + .06 * (hash(x * 77, y * 91, z * 51) - .5);
      const c = tmp.copy(denim).lerp(fade, clamp(fadeK + .18 * clamp(f * 120))).lerp(dd, clamp(-f * 90) * .5 + .3 * seam + .3 * inseam);
      c.lerp(stitch, clamp(Math.max(yoke, backPocket, frontPocket, fly) * .6 + hem * .25)); c.multiplyScalar(twill);
      return c.clone();
    };
    const emit = (part, fold, col, isH) => {
      const X = part.X, Nn = part.N, m = part.orig.length, pos = new Float32Array(m * 3), cols = [];
      const A = rig.skin.geometry.attributes.coachArmBlend.array;
      for (let k = 0; k < m; k++) { const i = part.orig[k], x = P0[i * 3], y = P0[i * 3 + 1], z = P0[i * 3 + 2], a = isH ? A[i] : 0, f = isH ? fold(x, y, z, a) : fold(x, y, z); for (let q = 0; q < 3; q++) pos[k * 3 + q] = X[k * 3 + q] + Nn[k * 3 + q] * f; cols.push(isH ? col(x, y, z, a, f) : col(x, y, z, f)); }
      const nn = vnormals(pos, part.tris), cl = new Float32Array(m * 3); cols.forEach((c, k) => { cl[k * 3] = c.r; cl[k * 3 + 1] = c.g; cl[k * 3 + 2] = c.b; });
      return { pos, nn, col: cl, tris: part.tris, m };
    };
    const eh = emit(H, foldH, colH, true), ej = emit(J, foldJ, colJ, false);
    // a surface grid for the sewn-on parts: the dressed cloth (both garments)
    const all = new Float32Array(eh.pos.length + ej.pos.length); all.set(eh.pos); all.set(ej.pos, eh.pos.length);
    const alln = new Float32Array(all.length); alln.set(eh.nn); alln.set(ej.nn, eh.nn.length);
    const grid = new Grid(all, .03), hoodN = H.orig.length;
    const surf = (p, d, off = 0, onlyH = null) => { const s = grid.surface(p, d); if (!s) return p.clone(); return p.clone().addScaledVector(d, s.t + off); };
    const ribC = (u, k) => { const r = .5 + .5 * Math.sin(u); return tmp.copy(hood).lerp(dark, .28 + .2 * r).multiplyScalar(1 + .04 * (hash(u, k) - .5)).clone(); };

    // hoodie hem rib: a band round the hips, gathered, its lower edge rolled back to the cloth
    { const nu = 192, nv = 6, cz0 = 0;
      soup.grid(nu, nv, (i, j) => { const th = i / nu * TAU, d = V(Math.sin(th), 0, Math.cos(th)), y = HEM + RIB * (1 - j / nv), o = V(0, y, cz0), s = surf(o, d, 0), prof = j === nv ? .001 : j === 0 ? -.001 : .0045 + .0015 * Math.sin(i * Math.PI / 2 * 2); return [s.addScaledVector(d, prof).setY(y - (j === nv ? .002 : 0)), ribC(i * Math.PI, j)]; }, { closedU: true });
      soup.grid(nu, 1, (i, j) => { const th = i / nu * TAU, d = V(Math.sin(th), 0, Math.cos(th)), o = V(0, HEM, cz0), s = surf(o, d, 0); return [s.addScaledVector(d, j ? -.006 : .001).setY(HEM - .001), dark]; }, { closedU: true, flip: true }); }
    // sleeve cuffs: rib bands round the wrist
    for (const sx of [-1, 1]) {
      const nu = 64, nv = 5; soup.grid(nu, nv, (i, j) => { const ax = CUFF - CUFF_RIB * (j / nv), [cy, cz] = shape.armAt(ax), ang = i / nu * TAU, d = V(0, Math.cos(ang), Math.sin(ang)), o = V(sx * ax, cy, cz), s = surf(o, d), prof = j === 0 || j === nv ? .0005 : .004 + .001 * Math.sin(i * Math.PI); return [s.addScaledVector(d, prof).setX(sx * ax), ribC(i * Math.PI, j)]; }, { closedU: true, flip: sx > 0 });
      soup.grid(nu, 1, (i, j) => { const ang = i / nu * TAU, [cy, cz] = shape.armAt(CUFF), d = V(0, Math.cos(ang), Math.sin(ang)), s = surf(V(sx * CUFF, cy, cz), d); return [s.addScaledVector(d, j ? -.007 : .0005).setX(sx * (CUFF + .001)), dark]; }, { closedU: true, flip: sx < 0 });
    }
    // kangaroo pocket: a patch on the belly, slanted open sides, a rolled top edge
    { const nu = 26, nv = 14, y0 = HEM + RIB + .004, y1 = y0 + .17, half = y => lerp(.175, .118, (y - y0) / (y1 - y0));
      const pt = (u, v, off) => { const y = lerp(y0, y1, v), x = u * half(y), d = V(x * 2.2, 0, 1).normalize(); return surf(V(x, y, 0), d, off); };
      soup.grid(nu, nv, (i, j) => { const u = i / nu * 2 - 1, v = j / nv, edge = Math.max(Math.abs(u) > .93 ? 1 : 0, v > .92 ? 1 : 0), p = pt(u, v, .004 + .003 * (1 - Math.abs(u) ** 6) * (1 - v * v) * (v > .05 ? 1 : .4)); return [p, tmp.copy(hood).multiplyScalar((1 - .18 * edge) * (1 + .05 * (hash(i, j) - .5)) * (1 - .12 * bell(u, 0, .06) * (v < .9 ? 1 : 0))).clone()]; });
      // the open sides: a dark slit behind the pocket edge
      for (const sd of [-1, 1]) soup.grid(1, nv, (i, j) => { const v = j / nv, p = pt(sd, v, i ? .0015 : .0075); return [p, dark]; }, { flip: sd > 0 });
      soup.grid(nu, 1, (i, j) => { const u = i / nu * 2 - 1; return [pt(u, j ? 1 : .98, j ? .0015 : .009), hood2]; }, { flip: true }); }
    // hood, down on the upper back: an outer shell over a pouch, its face opening a rolled rim round the neck, dark inside
    const hoodPts = [];
    { const nu = 28, nv = 18, W = v => .19 * Math.sqrt(Math.max(0, 1 - Math.pow(v, 2.4))) + .004, yAt = v => 1.785 - .315 * v;
      const back = (x, y) => { const d = V(x * 1.6, 0, -1).normalize(); return { p: surf(V(x, y, -.05), d, 0), d }; };
      const shell = (u, v, lift) => { const x = u * W(v), y = yAt(v), { p, d } = back(x, y), h = (lift ?? (.034 * Math.pow(1 - v, .8) + .006)) * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - .25 * Math.cos(u * Math.PI * 3) * (1 - v) * .3); return p.addScaledVector(d, h + .003).add(V(0, .006 * (1 - v), 0)); };
      soup.grid(nu, nv, (i, j) => { const u = i / nu * 2 - 1, v = j / nv, p = shell(u, v); hoodPts.push(p); const shade = 1 - .22 * smooth((v - .55) / .45) * (1 - Math.abs(u)) - .12 * bell(u, 0, .05) * (v > .2 ? 1 : 0) + .05 * (hash(i, j) - .5); return [p, tmp.copy(hood).multiplyScalar(shade).clone()]; }, { flip: true });
      // the lining from the rim down into the pouch (seen through the face opening)
      soup.grid(nu, 4, (i, j) => { const u = i / nu * 2 - 1, v = j / 4, p0 = shell(u, 0), { p } = back(u * W(0) * .85, yAt(.2 * v) - .01); return [p0.clone().lerp(p.addScaledVector(V(0, 0, -1), .004), v), tmp.copy(dark).multiplyScalar(lerp(.9, .55, v)).clone()]; });
      // rolled rim: from the nape round both sides of the neck to the front, where the edges cross under the drawstrings
      const rim = []; for (let k = 0; k <= 24; k++) { const u = k / 24 * 2 - 1, p = shell(u, 0); rim.push(p.clone().add(V(0, .004, 0))); }
      for (const sd of [-1, 1]) { const side = []; for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 - k / 10 * .92) * sd, rN = .148 + .012 * Math.sin(k / 10 * Math.PI), x = Math.sin(a) * rN, z = NECK_Z + Math.cos(a) * rN, y = neckY(a) + .006 + .02 * smooth((k - 6) / 4) * 0; side.push(surf(V(x, y + .03, z), V(0, -1, 0), .004).add(V(0, .004, 0)).setY(Math.max(y + .004, 1.69))); } rim.push(...(sd < 0 ? side.reverse() : [])); if (sd > 0) rim.unshift(...side.reverse()); }
      soup.cord(rim, .0075, hood2, 80, 8, 0);
      // drawstrings: out of two eyelets at the throat, hanging down the chest, with tipped ends
      for (const sd of [-1, 1]) { const x0 = sd * .045, y0 = neckY(0) - .004, pts = []; for (let k = 0; k <= 8; k++) { const y = y0 - k * .028, x = x0 + sd * .004 * Math.sin(k * .9); pts.push(surf(V(x, y, .05), V(0, 0, 1), .007)); }
        soup.cord(pts, .0035, lin(pal.drawcord), 32, 6, 1); const e = pts[pts.length - 1]; soup.cord([e.clone().add(V(0, .006, .001)), e.clone().add(V(0, -.02, .002))], .0042, lin('#d9d4c4'), 4, 6, 1);
        soup.cord([pts[0].clone().add(V(0, .006, -.002)), pts[0].clone().add(V(0, -.004, .002))], .0065, lin('#b7b3aa'), 3, 8, 1); } }
    // jeans waistband, belt with a buckle, belt loops
    { const nu = 160, w0 = .042, beltW = .03;
      const band = (j, nv, top, h, off, colf, flip) => soup.grid(nu, nv, (i, k) => { const th = i / nu * TAU, d = V(Math.sin(th), 0, Math.cos(th)), y = waistY(th) - top - h * (k / nv), p = surf(V(0, y, .0), d, 0), prof = (k === 0 || k === nv) ? off * .2 : off; return [p.addScaledVector(d, prof).setY(y), colf(th, k)]; }, { closedU: true, flip });
      band(0, 4, -.001, w0, .004, (th, k) => tmp.copy(denim).lerp(dd, .2).lerp(stitch, k === 1 || k === 3 ? .35 : 0).clone());
      const belt = lin(DENIM.belt); band(0, 3, .006, beltW, .009, (th, k) => tmp.copy(belt).multiplyScalar((k === 0 || k === 3 ? .75 : 1) * (1 + .1 * (hash(th * 9, k) - .5))).clone());
      // buckle at the front, a little to the side
      const bx = .0, by = waistY(0) - .006 - beltW / 2, bp = surf(V(bx, by, 0), V(0, 0, 1), .011), buck = lin(DENIM.buckle);
      soup.grid(16, 2, (i, j) => { const a = i / 16 * TAU, rx = .032 - .006 * j / 2, ry = .022 - .006 * j / 2; return [bp.clone().add(V(Math.cos(a) * rx, Math.sin(a) * ry, .003 + .002 * (j === 1 ? 1 : 0))), buck]; }, { closedU: true });
      soup.cord([bp.clone().add(V(-.012, -.016, .006)), bp.clone().add(V(-.012, .016, .006))], .0022, buck, 3, 6, 0);
      for (const th of [-2.6, -1.55, -.62, .62, 1.55, 2.6, Math.PI]) { const d = V(Math.sin(th), 0, Math.cos(th)), yT = waistY(th) - .001, yB = waistY(th) - w0 - .002, a = surf(V(0, yT, 0), d, .012), b = surf(V(0, yB, 0), d, .012), m = a.clone().lerp(b, .5).addScaledVector(d, .003); const sd = V(Math.cos(th), 0, -Math.sin(th)).multiplyScalar(.006);
        soup.grid(1, 3, (i, j) => [[a, m, m, b][j].clone().addScaledVector(sd, i ? 1 : -1), tmp.copy(denim).lerp(dd, .1).clone()]); } }

    // one indexed geometry: hoodie, jeans (weights they grew from), then the sewn-on parts (weights by transfer)
    const nS = soup.p.length / 3, nC = eh.m + ej.m, nT = nC + nS, pos = new Float32Array(nT * 3), nor = new Float32Array(nT * 3), colr = new Float32Array(nT * 3);
    pos.set(eh.pos); pos.set(ej.pos, eh.m * 3); pos.set(soup.p, nC * 3); nor.set(eh.nn); nor.set(ej.nn, eh.m * 3); nor.set(soup.n, nC * 3); colr.set(eh.col); colr.set(ej.col, eh.m * 3); colr.set(soup.c, nC * 3);
    const index = new Uint32Array(eh.tris.length + ej.tris.length + nS); index.set(eh.tris); for (let k = 0; k < ej.tris.length; k++) index[eh.tris.length + k] = ej.tris[k] + eh.m; for (let k = 0; k < nS; k++) index[eh.tris.length + ej.tris.length + k] = nC + k;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.setIndex(new THREE.BufferAttribute(index, 1));
    return { geo, all, alln, nC };
  }

  /** Skin weights for every vertex of a soup: cloth vertices keep the weights they grew from, sewn parts take their nearest cloth vertex. */
  function skinSoup(geo, shape, clothPos, from = 0) {
    const { parts, NB } = shape, H = parts.H, J = parts.J, nH = H.orig.length, nC = nH + J.orig.length, P = geo.attributes.position.array, n = P.length / 3;
    const WA = new Float32Array(nC * NB); WA.set(H.W); WA.set(J.W, nH * NB); const LA = new Float32Array(nC); LA.set(H.lin); LA.set(J.lin, nH);
    const ids = new Uint16Array(n * 4), ws = new Float32Array(n * 4), lin1 = new Float32Array(n), acc = new Float32Array(NB);
    const put = (v, w, o, l) => { // the four largest weights, normalised
      let tot = 0; for (let q = 0; q < 4; q++) { let bi = -1, bw = 0; for (let b = 0; b < NB; b++) { const x = w[o + b]; if (x > bw && (q < 1 || (b !== ids[v * 4] && (q < 2 || b !== ids[v * 4 + 1]) && (q < 3 || b !== ids[v * 4 + 2])))) { bw = x; bi = b; } } ids[v * 4 + q] = bi < 0 ? 0 : bi; ws[v * 4 + q] = bw; tot += bw; }
      for (let q = 0; q < 4; q++) ws[v * 4 + q] /= tot || 1; lin1[v] = l; };
    let grid = null;
    for (let v = 0; v < n; v++) {
      if (from === 0 && v < nC) { put(v, WA, v * NB, LA[v]); continue; }
      grid = grid || new Grid(clothPos, .03); const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; acc.fill(0); let l = 0, wsum = 0;
      grid.near(x, y, z, .022, (q, d) => { const w = 1 / (d + 1e-5); for (let b = 0; b < NB; b++) acc[b] += WA[q * NB + b] * w; l += LA[q] * w; wsum += w; });
      if (!wsum) { const q = grid.nearest(x, y, z); for (let b = 0; b < NB; b++) acc[b] = WA[q * NB + b]; l = LA[q]; wsum = 1; }
      put(v, acc, 0, l / wsum);
    }
    return { ids, ws, lin: lin1 };
  }

  /* ---------------------------------------------------------------- sneakers (foot frame: sole at y = -0.088, toes +z) */
  function sneaker(o) {
    const s = new Soup(), Z0 = -.088, ZH = -.088, LEN = .305, zh = -.09, ysTop = Z0 + .028;
    const w = t => { const ball = .059, heel = .045; let r = t < .62 ? lerp(heel, ball, smooth((t - .08) / .54)) : ball * Math.sqrt(Math.max(0, 1 - ((t - .62) / .385) ** 2)); if (t < .1) r *= Math.sqrt(Math.max(0, 1 - ((.1 - t) / .102) ** 2)); return Math.max(r, .0005); };
    const h = t => { const heelTop = .086, col = .079; if (t < .16) return lerp(.055, heelTop, smooth(t / .16)); if (t < .42) return lerp(heelTop, col, smooth((t - .16) / .26)); return Math.max(.02, lerp(col + .006, .028, smooth((t - .42) / .56))); };
    const zOf = t => zh + t * LEN, NU = 26, NV = 40;
    const C = k => lin(o[k]);
    // upper: a lofted shell over the sole; toe cap, side panel (a darker overlay), heel counter, opening dark
    s.grid(NU, NV, (i, j) => { const t = j / NV, a = i / NU * Math.PI, ca = Math.cos(a), sa = Math.sin(a), e = 2 / 2.6, x = w(t) * Math.sign(ca) * Math.abs(ca) ** e, y = ysTop - .002 + h(t) * Math.abs(sa) ** e, z = zOf(t);
      let c = C('upper'); const top = Math.abs(sa) ** e, open = t > .06 && t < .4 && top > .93, toe = t > .82 && top < .8, heelC = t < .2 && top < .85, panel = t > .3 && t < .72 && top > .25 && top < .7 && (Math.abs(ca) > .3);
      if (open) c = C('inside'); else if (toe) c = C('toe'); else if (heelC) c = C('heel'); else if (panel) c = C('panel');
      return [V(x * (open ? .8 : 1), open ? y - .008 : y, z), c.clone().multiplyScalar(1 + .04 * (hash(i, j) - .5))]; }, { flip: true });
    // sole: a wall round the footprint (visible side), foxing stripe, toe bumper, flat tread underneath
    const NS = 60, ring = k => { const t = k / NS, side = t < .5 ? 1 : -1, tt = t < .5 ? t * 2 : (1 - t) * 2; return { x: side * (w(tt) + .005), z: zOf(tt), tt }; };
    s.grid(NS, 4, (i, j) => { const r = ring(i), lift = .012 * smooth((r.tt - .84) / .16), ys = [ZH + lift + .002, ZH + lift, ZH + .012 + lift * .6, ysTop - .004, ysTop + .007 + .012 * smooth((r.tt - .86) / .1)][j], inset = j === 0 ? .004 : j === 4 ? .002 : 0, k = r.x > 0 ? -1 : 1;
      const col = j === 2 ? C('stripe') : j >= 3 ? C('sole') : C('sole').clone().multiplyScalar(.82); return [V(r.x + k * inset, ys, r.z + (r.tt > .95 ? .004 * (j < 4 ? 1 : 0) : r.tt < .03 ? -.004 : 0)), col]; }, { closedU: true });
    s.grid(NS, 1, (i, j) => { const r = ring(i), lift = .012 * smooth((r.tt - .84) / .16); return [V(r.x * (j ? .02 : .93), ZH + lift + .002, r.z), C('tread')]; }, { closedU: true, flip: true });
    // tongue: a padded flap rising out of the opening; laces across the eyestay; a heel pull tab; collar padding
    s.grid(6, 8, (i, j) => { const u = i / 6 * 2 - 1, v = j / 8, t = lerp(.52, .33, v), z = zOf(t) - .01 * v, y = ysTop + h(t) + .004 + .012 * v + .004 * (1 - u * u); return [V(u * .026, y, z + .004 * u * u), C('tongue')]; }, { flip: true });
    for (let k = 0; k < 5; k++) { const t = .46 + k * .07, z = zOf(t), y = ysTop + h(t) + .006, hw = .028 - k * .002; s.cord([V(-hw, y - .003, z - .008), V(0, y + .002, z), V(hw, y - .003, z + .008)], .0028, C('lace'), 6, 5); s.cord([V(hw, y - .003, z - .008), V(0, y + .001, z), V(-hw, y - .003, z + .008)], .0028, C('lace'), 6, 5); }
    { const t = .44, z = zOf(t), y = ysTop + h(t) + .008; for (const sd of [-1, 1]) s.cord([V(0, y, z), V(sd * .02, y + .006, z - .014), V(sd * .026, y - .006, z - .004), V(0, y, z)], .0025, C('lace'), 12, 5); s.cord([V(-.006, y, z), V(-.014, y - .02, z + .004)], .0022, C('lace'), 4, 5); }
    s.grid(24, 3, (i, j) => { const a = i / 24 * TAU, t0 = .22, cz = zOf(t0) - .006, rx = .046, rz = .085, y = ysTop + h(.2) + [-.004, .003, .003, -.002][j], g = [1, 1.04, .96, .9][j]; return [V(Math.sin(a) * rx * g, y, cz + Math.cos(a) * rz * g * .7 - (Math.cos(a) < 0 ? .0 : 0)), C('collar')]; }, { closedU: true, flip: true });
    s.grid(2, 3, (i, j) => { const u = i / 2 * 2 - 1, y = ysTop + h(.02) - .012 + j * .013, z = zh + .006 - .004 * j; return [V(u * .009, y, z - .002 * (1 - u * u)), C('tab')]; });
    const m = new THREE.Mesh(s.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .74, metalness: 0, side: THREE.DoubleSide })); m.name = 'Sneaker'; m.castShadow = true; m.userData.storyPart = true; m.userData.mane = true; return m;
  }

  /** A skinned mesh on the rig's skeleton with the rig's own skinning shader (installed through rig.skinned on a stand-in). */
  function rigMesh(rig, geo, mat) {
    const stand = new THREE.BufferGeometry(); stand.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 0, .01, 1, 0, 0, 1.01, 0], 3)); stand.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    const inv = rig.skeleton.boneInverses.map(b => b.clone()); // rig.skinned binds without a matrix, which re-derives the bone inverses from the CURRENT pose
    const m = rig.skinned(stand, mat, false); m.parent?.remove(m); rig.skeleton.boneInverses.forEach((b, i) => b.copy(inv[i]));
    for (const [k, a] of Object.entries(stand.attributes)) { if (geo.attributes[k] || k === 'uv') continue; const n = geo.attributes.position.count, arr = new a.array.constructor(n * a.itemSize); for (let i = 0; i < n; i++) for (let q = 0; q < a.itemSize; q++) arr[i * a.itemSize + q] = a.array[q]; geo.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize, a.normalized)); }
    m.geometry = geo; stand.dispose(); m.bind(rig.skeleton, rig.skin.bindMatrix.clone()); m.frustumCulled = false; return m;
  }

  /* ---------------------------------------------------------------- the outfit */
  const SKIN_CACHE = new WeakMap();
  function clothFor(rig, tint) {
    const st = rig.storyCast; if (!st.fullIndex) st.fullIndex = rig.skin.geometry.index;
    let c = SKIN_CACHE.get(rig); if (!c) SKIN_CACHE.set(rig, c = { shape: buildShape(rig), byTint: {} });
    if (c.byTint[tint]) return c.byTint[tint];
    const d = dressMesh(rig, c.shape, tint), geo = d.geo;
    if (!c.skin || c.skin.n !== geo.attributes.position.count) c.skin = { n: geo.attributes.position.count, ...skinSoup(geo, c.shape, d.all, 0) };
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(c.skin.ids, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(c.skin.ws, 4)); geo.setAttribute('coachLinear', new THREE.Float32BufferAttribute(c.skin.lin, 1));
    geo.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0, side: THREE.DoubleSide, skinning: true });
    // rig.skinned() installs the rig's dual-quaternion skinning shader (as for the boxing trunks); our own weights replace its
    const m = rigMesh(rig, geo, mat); rig.root.add(m); m.name = 'Street clothes'; m.castShadow = true; m.receiveShadow = true; m.userData.storyPart = true; m.userData.streetCloth = true; m.visible = false;
    return (c.byTint[tint] = { mesh: m, shape: c.shape, all: d.all, alln: d.alln });
  }

  const SHOE = { upper: '#e6e1d6', panel: '#c9c2b4', toe: '#efebe2', heel: '#b7362f', inside: '#3a3733', sole: '#f1ede3', stripe: '#b7362f', tread: '#5a5650', tongue: '#e2ddd2', lace: '#f6f3ec', collar: '#d8d2c6', tab: '#b7362f' };
  const def = {
    hide: ['gloves', 'shorts', 'boots', 'trim', 'fur'],
    // the body under the clothes: pulled in a few millimetres and without muscle flex (it is not drawn where fully covered)
    cloth(rig) {
      const st = rig.storyCast; if (!st.fullIndex) st.fullIndex = rig.skin.geometry.index;
      return v => { const a = v.arm, inH = a >= .5 ? Math.abs(v.x) < CUFF + .01 : (v.y > HEM - .01 && neckF(v.x, v.y, v.z) < .012), inJ = a < .5 && v.y < waistY(Math.atan2(v.x, v.z)) + .01; return inH || inJ ? { d: -.006, c: null } : null; };
    },
    parts(rig, add, tint) {
      const c = clothFor(rig, tint || ''); add(c.mesh);
      for (const m of SC.bareHands(rig, rig.species === 'rabbit' ? '#939ba7' : '#b98143', rig.species === 'rabbit' ? '#c79a9a' : '#4a3324')) add(m);
      for (const s of ['L', 'R']) { const m = sneaker(SHOE); rig.joints['foot' + s].add(m); add(m); }
    },
    on(rig) { const c = SKIN_CACHE.get(rig); if (c) rig.skin.geometry.setIndex(c.shape.reduced); },
    off(rig) { const st = rig.storyCast; if (st?.fullIndex) rig.skin.geometry.setIndex(st.fullIndex); }
  };
  SC.registerOutfit('street', def);

  /* ---------------------------------------------------------------- the duffel: cross-body strap, bag behind the hip on a spring */
  const BAG = { at: V(-.03, 1.1, -.262), len: .44, r: .118 };
  function bagFor(rig) {
    const st = rig.storyCast, c = SKIN_CACHE.get(rig); if (!c) return null;
    const anyTint = Object.values(c.byTint)[0], grid = new Grid(anyTint.all, .03), surf = (p, d, off) => { const s = grid.surface(p, d, .02); return s ? p.clone().addScaledVector(d, s.t + off) : p.clone(); };
    const front = (x, y) => surf(V(x, y, .02), V(x * .8, 0, 1).normalize(), .012), back = (x, y) => surf(V(x, y, -.03), V(x * .8, 0, -1).normalize(), .012), topAt = (x, z) => surf(V(x, 1.7, z), V(0, 1, 0), .012);
    const L = BAG.at, eL = L.clone().add(V(-BAG.len / 2 + .07, BAG.r * .8, .03)), eR = L.clone().add(V(BAG.len / 2 - .07, BAG.r * .8, .03));
    const strap = [eR, back(.12, 1.22), back(.13, 1.38), back(.155, 1.55), topAt(.165, -.06), topAt(.17, .0), front(.17, 1.64), front(.16, 1.52), front(.07, 1.4), front(-.06, 1.29), front(-.17, 1.25), surf(V(-.1, 1.26, .02), V(-1, 0, .4).normalize(), .012), surf(V(-.1, 1.23, -.06), V(-1, 0, -.75).normalize(), .014), eL];
    if (window.__debugStrap) window.__debugStrap(strap);
    const sp = new Soup(), path = new THREE.CatmullRomCurve3(strap, false, 'centripetal'), tan = lin('#3f4434'), tan2 = lin('#2c3025'); // olive webbing, like the bag
    const frames = []; { const AN = anyTint.alln; let prev = null; for (let j = 0; j <= 120; j++) { const u = j / 120, o = path.getPoint(u), t = path.getTangent(u), n = V(); grid.near(o.x, o.y, o.z, .05, (q, d) => { const w = 1 / (d + 1e-4); n.x += AN[q * 3] * w; n.y += AN[q * 3 + 1] * w; n.z += AN[q * 3 + 2] * w; }); if (n.lengthSq() < 1e-9) n.copy(prev || V(0, 0, 1)); n.addScaledVector(t, -n.dot(t)).normalize(); if (prev && n.dot(prev) < 0) n.negate(); if (prev) n.lerp(prev, .5).normalize(); prev = n.clone(); frames.push([o, t, n]); } } // the strap lies flat on the cloth: its width follows the surface
    sp.grid(4, 120, (i, j) => { const [o, t, n] = frames[j], side = t.clone().cross(n).normalize(), corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]][i % 4];
      return [o.clone().addScaledVector(side, corner[0] * .025).addScaledVector(n, corner[1] * .0045), (i === 1 || i === 3) ? tan2 : tan]; }, { closedU: true });
    const sgeo = sp.geometry(), sk = skinSoup(sgeo, c.shape, anyTint.all, 1);
    sgeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sk.ids, 4)); sgeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sk.ws, 4)); sgeo.setAttribute('coachLinear', new THREE.Float32BufferAttribute(sk.lin, 1));
    const sm = rigMesh(rig, sgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, side: THREE.DoubleSide, skinning: true, flatShading: true })); sm.name = 'Duffel strap'; sm.castShadow = true; sm.userData.storyPart = true; sm.userData.mane = false;
    // the bag body hangs from its two strap rings; the pivot sits between them and follows the pelvis, plus a damped swing
    const body = SC.duffel(); body.userData.storyPart = true; body.scale.setScalar(BAG.len / .56 * 1.02);
    const pivot = new THREE.Group(); pivot.name = 'Duffel bag'; pivot.add(body); body.position.set(0, -BAG.r * .8 - .002, -.03); body.rotation.set(0, 0, 0);
    const hips = rig.joints.hips;
    pivot.matrixAutoUpdate = false; body.frustumCulled = false;
    const g = new THREE.Group(); g.name = 'Duffel bag on the shoulder'; g.add(sm); g.add(pivot); rig.root.add(g);
    // spring: pitch (fore-aft) and roll (sideways) from the pelvis acceleration, damped; integrated once per frame
    const spr = { px: 0, vx: 0, pz: 0, vz: 0, last: null, vel: null, t: 0, frame: -1 };
    const restLocal = new THREE.Matrix4(), inv = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), tmpP = V(), hipsRest = rig.rest ? rig.rest[rig.bones.indexOf(hips)].clone() : V(0, .99, 0);
    restLocal.makeTranslation(L.x - hipsRest.x, L.y + BAG.r * .8 - hipsRest.y, L.z + .03 - hipsRest.z);
    const place = renderer => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000, frame = renderer?.info?.render?.frame ?? now;
      if (frame !== spr.frame) {
        spr.frame = frame; const dt = spr.t ? clamp(now - spr.t, 1 / 120, 1 / 20) : 1 / 60; spr.t = now;
        hips.updateWorldMatrix(true, false); tmpP.setFromMatrixPosition(hips.matrixWorld); inv.copy(rig.root.matrixWorld).invert();
        const p = tmpP.clone().applyMatrix4(inv); // pelvis in the rig's own frame (facing +z)
        if (spr.last && p.distanceTo(spr.last) < .25) { const v = p.clone().sub(spr.last).divideScalar(dt); const a = spr.vel ? v.clone().sub(spr.vel).divideScalar(dt) : V(); spr.vel = v;
          const k = 60, c = 7, ax = clamp(a.z, -12, 12), ay = clamp(a.x, -12, 12), ab = clamp(a.y, -12, 12);
          spr.vx += (-k * spr.px - c * spr.vx + ax * .55 + ab * .12) * dt; spr.px = clamp(spr.px + spr.vx * dt, -.32, .32);
          spr.vz += (-k * spr.pz - c * spr.vz - ay * .5) * dt; spr.pz = clamp(spr.pz + spr.vz * dt, -.25, .25);
        } else { spr.vel = null; spr.vx *= .5; spr.vz *= .5; }
        spr.last = p;
      }
      e.set(spr.px + .04, 0, spr.pz); q.setFromEuler(e);
      pivot.matrixWorld.copy(hips.matrixWorld).multiply(restLocal).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeRotationY(.04));
      body.matrixWorld.multiplyMatrices(pivot.matrixWorld, body.matrix);
      body.children.forEach(ch => ch.matrixWorld.multiplyMatrices(body.matrixWorld, ch.matrix));
    };
    body.updateMatrix(); body.onBeforeRender = renderer => place(renderer); st.bagSpring = spr; st.bagPlace = place;
    return g;
  }
  const baseBag = SC.bag;
  SC.bag = function bag(rig, mode) {
    const st = rig?.storyCast;
    if (mode === 'shoulder' && st && !st.bag && !rig.cast && st.outfit === 'street' && SKIN_CACHE.get(rig)) st.bag = bagFor(rig);
    return baseBag(rig, mode);
  };
  SC.streetWear = { buildShape, dressMesh, skinSoup, clothFor, sneaker, def, BAG, lines: { HEM, CUFF, neckY, waistY, hemJ, LEG_X } };
})();
