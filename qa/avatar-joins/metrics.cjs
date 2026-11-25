// qa/avatar-joins/metrics.cjs — numeric join checks on a posed rig (CPU skinning = the vertex shader, rig.skinPoint).
//   stretch(c, mesh)      edge-length ratio posed/rest per region (candy-wrapper / collapse / spikes) and folded triangles
//   bodyField(c)          the posed body surface (drawn skin triangles) as a point grid with normals -> signed distance
//   penetration(...)      how deep the vertices of a part go under the body surface (hands/gloves/paws vs torso and face)
//   partGap(...)          the gap between a rigid part and the body (floating pieces, opening collars/cuffs)
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function boneNames(c) { return c.bones.map(b => b.name); }
/** Dominant bone of each vertex (index into c.bones). */
function dominant(mesh) {
  const g = mesh.geometry; if (g.userData.dom) return g.userData.dom;
  const I = g.attributes.skinIndex.array, W = g.attributes.skinWeight.array, n = g.attributes.position.count, d = new Uint8Array(n);
  for (let i = 0; i < n; i++) { let b = 0, w = -1; for (let k = 0; k < 4; k++) if (W[i * 4 + k] > w) { w = W[i * 4 + k]; b = I[i * 4 + k]; } d[i] = b; }
  return (g.userData.dom = d);
}
/** Skinned positions of every vertex (or only `which`) of a skinned mesh, in the rig root's frame. */
function skinAll(c, mesh, which = null) {
  const n = mesh.geometry.attributes.position.count, out = new Float32Array(n * 3), t = V();
  if (which) { for (const i of which) { c.skinPoint(mesh, i, t); out[i * 3] = t.x; out[i * 3 + 1] = t.y; out[i * 3 + 2] = t.z; } return out; }
  for (let i = 0; i < n; i++) { c.skinPoint(mesh, i, t); out[i * 3] = t.x; out[i * 3 + 1] = t.y; out[i * 3 + 2] = t.z; }
  return out;
}
function drawnTris(mesh) { const g = mesh.geometry; return g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, i) => i); }

/** Edge-stretch and fold check. rest: rest positions (Float32Array, same layout), posed: posed positions.
 *  Returns per region: { maxRatio, minRatio, p999, folds, worst: [x,y,z] } — only edges >= 2 mm at rest. */
function stretch(c, mesh, posed, rest = mesh.geometry.attributes.position.array, opt = {}) {
  const idx = drawnTris(mesh), dom = dominant(mesh), names = boneNames(c), regions = {}, skip = opt.skip || null;
  const q = new THREE.Quaternion(), n0 = V(), n1 = V(), a = V(), b = V(), mirror = mesh.bindMatrix.determinant() < 0;
  const R = name => regions[name] || (regions[name] = { edges: 0, maxRatio: 0, minRatio: 9, folds: 0, tris: 0, worstMax: null, worstMin: null, worstFold: null, ratios: [] });
  for (let t = 0; t < idx.length; t += 3) {
    const i = idx[t], j = idx[t + 1], k = idx[t + 2]; if (skip && (skip[i] || skip[j] || skip[k])) continue;
    const reg = R(names[dom[i]]); reg.tris++;
    for (const [u, v] of [[i, j], [j, k], [k, i]]) {
      const r0 = Math.hypot(rest[u * 3] - rest[v * 3], rest[u * 3 + 1] - rest[v * 3 + 1], rest[u * 3 + 2] - rest[v * 3 + 2]); if (r0 < .002) continue;
      const r1 = Math.hypot(posed[u * 3] - posed[v * 3], posed[u * 3 + 1] - posed[v * 3 + 1], posed[u * 3 + 2] - posed[v * 3 + 2]), r = r1 / r0;
      reg.edges++; if (reg.ratios.length < 400000) reg.ratios.push(r);
      if (r > reg.maxRatio) { reg.maxRatio = r; reg.worstMax = [posed[u * 3], posed[u * 3 + 1], posed[u * 3 + 2]]; }
      if (r < reg.minRatio) { reg.minRatio = r; reg.worstMin = [posed[u * 3], posed[u * 3 + 1], posed[u * 3 + 2]]; }
    }
    // fold: the posed normal against the rest normal carried by the dominant bone's rotation
    a.set(rest[j * 3] - rest[i * 3], rest[j * 3 + 1] - rest[i * 3 + 1], rest[j * 3 + 2] - rest[i * 3 + 2]); b.set(rest[k * 3] - rest[i * 3], rest[k * 3 + 1] - rest[i * 3 + 1], rest[k * 3 + 2] - rest[i * 3 + 2]); n0.crossVectors(a, b);
    if (n0.lengthSq() < 1e-12) continue; n0.normalize();
    a.set(posed[j * 3] - posed[i * 3], posed[j * 3 + 1] - posed[i * 3 + 1], posed[j * 3 + 2] - posed[i * 3 + 2]); b.set(posed[k * 3] - posed[i * 3], posed[k * 3 + 1] - posed[i * 3 + 1], posed[k * 3 + 2] - posed[i * 3 + 2]); n1.crossVectors(a, b);
    if (n1.lengthSq() < 1e-14) { reg.folds++; continue; } n1.normalize();
    const r = c.dqReal[dom[i]]; q.set(r.x, r.y, r.z, r.w); if (mirror) n0.x = -n0.x; n0.applyQuaternion(q); if (mirror) n0.x = -n0.x; // the DQ rotation acts in the bind (mirrored) frame
    if (n0.dot(n1) < -.2) { reg.folds++; if (!reg.worstFold) reg.worstFold = [posed[i * 3], posed[i * 3 + 1], posed[i * 3 + 2]]; }
  }
  for (const reg of Object.values(regions)) { const s = reg.ratios.sort((x, y) => x - y); reg.p999 = s.length ? s[Math.floor(s.length * .999)] : 0; reg.p001 = s.length ? s[Math.floor(s.length * .001)] : 0; delete reg.ratios; }
  return regions;
}

/** Welded edge -> its two triangles (drawn index), cached per geometry + index. */
function edgeFaces(mesh) {
  const g = mesh.geometry, idx = drawnTris(mesh); if (g.userData.edgeFaces && g.userData.edgeFacesIdx === idx) return g.userData.edgeFaces;
  const P = g.attributes.position.array, n = P.length / 3, rep = new Int32Array(n), weld = new Map();
  for (let i = 0; i < n; i++) { const key = Math.round(P[i * 3] * 20000) + ':' + Math.round(P[i * 3 + 1] * 20000) + ':' + Math.round(P[i * 3 + 2] * 20000), w = weld.get(key); if (w == null) { weld.set(key, i); rep[i] = i; } else rep[i] = w; }
  const map = new Map(), pairs = [];
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = rep[idx[t + k]], b = rep[idx[t + (k + 1) % 3]]; if (a === b) continue; const key = a < b ? a * 262144 + b : b * 262144 + a, f = map.get(key); if (f == null) map.set(key, t / 3); else if (f >= 0) { pairs.push(f, t / 3, a, b); map.set(key, -1); } }
  g.userData.edgeFaces = { pairs: new Int32Array(pairs), rep }; g.userData.edgeFacesIdx = idx; return g.userData.edgeFaces;
}
/** New sharp creases: interior edges whose dihedral (angle between the two face normals) is > `sharp` deg posed but < `soft`
 *  deg at rest (the rest skin is smooth: a crease that appears in a pose is a pinch, a fold, a spike or a candy-wrapper twist). */
function creases(c, mesh, posed, rest = mesh.geometry.attributes.position.array, sharp = 75, soft = 35, skip = null) {
  const { pairs } = edgeFaces(mesh), idx = drawnTris(mesh), dom = dominant(mesh), names = boneNames(c), out = {};
  const nrm = (A, f, o) => { const i = idx[f * 3] * 3, j = idx[f * 3 + 1] * 3, k = idx[f * 3 + 2] * 3, ux = A[j] - A[i], uy = A[j + 1] - A[i + 1], uz = A[j + 2] - A[i + 2], vx = A[k] - A[i], vy = A[k + 1] - A[i + 1], vz = A[k + 2] - A[i + 2]; o[0] = uy * vz - uz * vy; o[1] = uz * vx - ux * vz; o[2] = ux * vy - uy * vx; const l = Math.hypot(o[0], o[1], o[2]); if (l < 1e-14) return false; o[0] /= l; o[1] /= l; o[2] /= l; return true; };
  const a = [0, 0, 0], b = [0, 0, 0], cs = Math.cos(sharp * Math.PI / 180), cf = Math.cos(soft * Math.PI / 180);
  for (let e = 0; e < pairs.length; e += 4) {
    const f = pairs[e], g = pairs[e + 1], v = pairs[e + 2]; if (skip && skip[v]) continue;
    if (!nrm(rest, f, a) || !nrm(rest, g, b) || a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < cf) continue;
    if (!nrm(posed, f, a) || !nrm(posed, g, b)) continue; const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; if (d > cs) continue;
    const r = out[names[dom[v]]] || (out[names[dom[v]]] = { edges: 0, worst: 180, at: null }); r.edges++;
    const ang = Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI; if (r.at == null || ang > 180 - r.worst) { r.worst = 180 - ang; r.at = [posed[v * 3], posed[v * 3 + 1], posed[v * 3 + 2]]; }
  }
  for (const r of Object.values(out)) r.maxAngle = +(180 - r.worst).toFixed(1);
  return out;
}

/** The posed body: drawn skin triangles (optionally only vertices passing keep(i)), a hash grid of vertices with normals. */
function bodyField(c, posed, keep = null, mesh = c.skin) {
  const idx = drawnTris(mesh), n = posed.length / 3, nor = new Float32Array(n * 3), used = new Uint8Array(n);
  for (let t = 0; t < idx.length; t += 3) {
    const i = idx[t] * 3, j = idx[t + 1] * 3, k = idx[t + 2] * 3;
    const ux = posed[j] - posed[i], uy = posed[j + 1] - posed[i + 1], uz = posed[j + 2] - posed[i + 2], vx = posed[k] - posed[i], vy = posed[k + 1] - posed[i + 1], vz = posed[k + 2] - posed[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [i, j, k]) { nor[q] += nx; nor[q + 1] += ny; nor[q + 2] += nz; used[q / 3] = 1; }
  }
  // weld duplicates (seams) so normals are smooth across them
  const P = mesh.geometry.attributes.position.array, weld = new Map();
  for (let i = 0; i < n; i++) if (used[i]) { const key = Math.round(P[i * 3] * 20000) + ':' + Math.round(P[i * 3 + 1] * 20000) + ':' + Math.round(P[i * 3 + 2] * 20000), w = weld.get(key); if (w == null) weld.set(key, i); else { nor[w * 3] += nor[i * 3]; nor[w * 3 + 1] += nor[i * 3 + 1]; nor[w * 3 + 2] += nor[i * 3 + 2]; used[i] = 0; } }
  const cell = .03, grid = new Map(), pts = [];
  for (let i = 0; i < n; i++) {
    if (!used[i] || (keep && !keep(i))) continue; const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) || 1;
    nor[i * 3] /= l; nor[i * 3 + 1] /= l; nor[i * 3 + 2] /= l; pts.push(i);
    const key = Math.floor(posed[i * 3] / cell) + ',' + Math.floor(posed[i * 3 + 1] / cell) + ',' + Math.floor(posed[i * 3 + 2] / cell); (grid.get(key) || grid.set(key, []).get(key)).push(i);
  }
  /** Signed distance of p to the body (negative = inside), with the nearest body vertex. Search radius `r` (cells). */
  function sd(x, y, z, r = 2) {
    const x0 = Math.floor(x / cell), y0 = Math.floor(y / cell), z0 = Math.floor(z / cell); let best = -1, bd = 1e9;
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (const i of grid.get((x0 + dx) + ',' + (y0 + dy) + ',' + (z0 + dz)) || []) { const d = (posed[i * 3] - x) ** 2 + (posed[i * 3 + 1] - y) ** 2 + (posed[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best < 0) return { d: Infinity, i: -1 };
    const s = (x - posed[best * 3]) * nor[best * 3] + (y - posed[best * 3 + 1]) * nor[best * 3 + 1] + (z - posed[best * 3 + 2]) * nor[best * 3 + 2];
    return { d: Math.sqrt(bd) * Math.sign(s || 1), depth: s, i: best };
  }
  return { sd, posed, nor, count: pts.length };
}

/** A cover (cuff, boot, shorts, collar ...) as a field: posed vertex positions `pts` (Float32Array) with normals from its
 *  triangles (idx: triangle vertex ids into pts). outside(x,y,z) -> { s: height over the nearest cover vertex along its normal,
 *  t: distance across it } — a body point under the cover's span with s > 0 pokes through it. */
function coverField(pts, idx) {
  const n = pts.length / 3, nor = new Float32Array(n * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const i = idx[t] * 3, j = idx[t + 1] * 3, k = idx[t + 2] * 3;
    const ux = pts[j] - pts[i], uy = pts[j + 1] - pts[i + 1], uz = pts[j + 2] - pts[i + 2], vx = pts[k] - pts[i], vy = pts[k + 1] - pts[i + 1], vz = pts[k + 2] - pts[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const q of [i, j, k]) { nor[q] += nx; nor[q + 1] += ny; nor[q + 2] += nz; }
  }
  // weld coincident vertices (UV seams of cylinders) so the normal is the surface's
  const weld = new Map(); for (let i = 0; i < n; i++) { const key = Math.round(pts[i * 3] * 5e4) + ':' + Math.round(pts[i * 3 + 1] * 5e4) + ':' + Math.round(pts[i * 3 + 2] * 5e4), w = weld.get(key); if (w == null) weld.set(key, [i]); else w.push(i); }
  for (const list of weld.values()) if (list.length > 1) { let x = 0, y = 0, z = 0; for (const i of list) { x += nor[i * 3]; y += nor[i * 3 + 1]; z += nor[i * 3 + 2]; } for (const i of list) { nor[i * 3] = x; nor[i * 3 + 1] = y; nor[i * 3 + 2] = z; } }
  const cell = .02, grid = new Map();
  for (let i = 0; i < n; i++) { const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]); if (l < 1e-12) continue; nor[i * 3] /= l; nor[i * 3 + 1] /= l; nor[i * 3 + 2] /= l; const key = Math.floor(pts[i * 3] / cell) + ',' + Math.floor(pts[i * 3 + 1] / cell) + ',' + Math.floor(pts[i * 3 + 2] / cell); (grid.get(key) || grid.set(key, []).get(key)).push(i); }
  return { outside(x, y, z) {
    const x0 = Math.floor(x / cell), y0 = Math.floor(y / cell), z0 = Math.floor(z / cell); let best = -1, bd = 1e9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const i of grid.get((x0 + dx) + ',' + (y0 + dy) + ',' + (z0 + dz)) || []) { const d = (pts[i * 3] - x) ** 2 + (pts[i * 3 + 1] - y) ** 2 + (pts[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best < 0) return null; const dx = x - pts[best * 3], dy = y - pts[best * 3 + 1], dz = z - pts[best * 3 + 2], s = dx * nor[best * 3] + dy * nor[best * 3 + 1] + dz * nor[best * 3 + 2];
    return { s, t: Math.sqrt(Math.max(0, bd - s * s)), i: best };
  } };
}
/** Body vertices (posed, ids `cand`) that come out through a cover: height over it > `tol` within `span` across its surface. */
function pokeThrough(field, posed, cand, tol = .002, span = .006) {
  let n = 0, worst = 0, at = null;
  for (const i of cand) { const r = field.outside(posed[i * 3], posed[i * 3 + 1], posed[i * 3 + 2]); if (!r || r.t > span || r.s <= tol) continue; n++; if (r.s > worst) { worst = r.s; at = [posed[i * 3], posed[i * 3 + 1], posed[i * 3 + 2]].map(v => +v.toFixed(3)); } }
  return { count: n, worst: +worst.toFixed(4), at };
}
/** Triangle vertex ids of a mesh (indexed or not). */
function triIds(mesh) { const g = mesh.geometry; return g.index ? g.index.array : Uint32Array.from({ length: g.attributes.position.count }, (_, i) => i); }

/** Vertices of a rigid (bone-attached) mesh in the rig root's frame. Paws/LOD hooks included as they are drawn. */
function rigidPoints(c, mesh, step = 1) {
  c.root.updateMatrixWorld(true); const inv = c.root.matrixWorld.clone().invert(), m = inv.multiply(mesh.matrixWorld), P = mesh.geometry.attributes.position, out = [], v = V();
  for (let i = 0; i < P.count; i += step) { v.fromBufferAttribute(P, i).applyMatrix4(m); out.push(v.x, v.y, v.z); }
  return new Float32Array(out);
}
/** Deepest point of `pts` under the body surface (by the nearest body vertex's normal plane), within 6 cm of the surface. */
function penetration(field, pts) {
  let depth = 0, at = null, n = 0;
  for (let i = 0; i < pts.length; i += 3) { const r = field.sd(pts[i], pts[i + 1], pts[i + 2]); if (!Number.isFinite(r.d) || r.depth >= 0) continue; const d = -r.depth; if (d > .06) continue; if (d > .004) n++; if (d > depth) { depth = d; at = [pts[i], pts[i + 1], pts[i + 2]].map(v => +v.toFixed(3)); } }
  return { depth: +depth.toFixed(4), count: n, at };
}
/** Smallest distance from the part to the body (a gap > 0 means it floats). */
function partGap(field, pts) { let g = Infinity; for (let i = 0; i < pts.length; i += 3) { const r = field.sd(pts[i], pts[i + 1], pts[i + 2], 3); if (Math.abs(r.d) < g) g = Math.abs(r.d); } return +g.toFixed(4); }

module.exports = { V, boneNames, dominant, skinAll, drawnTris, stretch, creases, edgeFaces, coverField, pokeThrough, triIds, bodyField, rigidPoints, penetration, partGap };
