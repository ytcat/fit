// qa/armpit-fold/axilla.cjs — armpit / shoulder fold metrics on a posed rig (CPU skinning = the vertex shader, rig.skinPoint),
// limited to the shoulder region of the REST surface (|x| .10-.52, y 1.20-1.95 by default):
//   selfIntersections  triangle pairs of one surface that cross each other (skin or cloth folded through itself, the crack /
//                      pin-hole / slit look). Triangles sharing a vertex do not count; slivers under 0.5 mm2 are skipped.
//   folds              triangles turned over: the posed normal more than 90 deg from the rest normal carried by the
//                      triangle's own blended (dual-quaternion) rotation; count and rest area (mm2).
//   stretchRange       edge length posed / rest (edges >= 2 mm): min, 0.1 %, 99.9 %, max.
// Used by tests/armpit-fold.test.cjs and the QA tools in this folder.
const M = require('../avatar-joins/metrics.cjs');
const pose = (c, fn) => { fn(c); c.root.updateMatrixWorld(true); c.syncSkin(); };
const MINA = 5e-7; // m2: slivers smaller than half a square millimetre are sub-pixel even in close-ups
const REGION = { x0: .10, x1: .52, y0: 1.20, y1: 1.95 };
function regionMask(mesh, reg = REGION, P = mesh.geometry.attributes.position.array) {
  const n = P.length / 3, m = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const x = Math.abs(P[i * 3]), y = P[i * 3 + 1]; m[i] = x > reg.x0 && x < reg.x1 && y > reg.y0 && y < reg.y1 && (!reg.z || P[i * 3 + 2] > reg.z[0] && P[i * 3 + 2] < reg.z[1]) ? 1 : 0; }
  return m;
}
function weldRep(P) { const n = P.length / 3, rep = new Int32Array(n), map = new Map(); for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * 20000) + ':' + Math.round(P[i * 3 + 1] * 20000) + ':' + Math.round(P[i * 3 + 2] * 20000), w = map.get(k); if (w == null) { map.set(k, i); rep[i] = i; } else rep[i] = w; } return rep; }
const triArea = (P, i, j, k) => { const ux = P[j * 3] - P[i * 3], uy = P[j * 3 + 1] - P[i * 3 + 1], uz = P[j * 3 + 2] - P[i * 3 + 2], vx = P[k * 3] - P[i * 3], vy = P[k * 3 + 1] - P[i * 3 + 1], vz = P[k * 3 + 2] - P[i * 3 + 2]; return .5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); };
/** Segment p->q against triangle a,b,c (Moller-Trumbore), strict interior. */
function segTri(P, p, q, a, b, c) {
  const ex = P[b * 3] - P[a * 3], ey = P[b * 3 + 1] - P[a * 3 + 1], ez = P[b * 3 + 2] - P[a * 3 + 2], fx = P[c * 3] - P[a * 3], fy = P[c * 3 + 1] - P[a * 3 + 1], fz = P[c * 3 + 2] - P[a * 3 + 2];
  const dx = P[q * 3] - P[p * 3], dy = P[q * 3 + 1] - P[p * 3 + 1], dz = P[q * 3 + 2] - P[p * 3 + 2];
  const hx = dy * fz - dz * fy, hy = dz * fx - dx * fz, hz = dx * fy - dy * fx, det = ex * hx + ey * hy + ez * hz; if (Math.abs(det) < 1e-14) return false;
  const inv = 1 / det, sx = P[p * 3] - P[a * 3], sy = P[p * 3 + 1] - P[a * 3 + 1], sz = P[p * 3 + 2] - P[a * 3 + 2], u = (sx * hx + sy * hy + sz * hz) * inv; if (u < 1e-6 || u > 1 - 1e-6) return false;
  const qx = sy * ez - sz * ey, qy = sz * ex - sx * ez, qz = sx * ey - sy * ex, v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 1e-6 || u + v > 1 - 1e-6) return false;
  const t = (fx * qx + fy * qy + fz * qz) * inv; return t > 1e-6 && t < 1 - 1e-6;
}
/** Crossing triangle pairs among the triangles whose 3 vertices pass mask (positions `posed`). { pairs, tris, at, hitSet } */
function selfIntersections(mesh, posed, mask, cell = .012) {
  const idx = M.drawnTris(mesh), rest = mesh.geometry.attributes.position.array, rep = weldRep(rest);
  const tris = []; for (let t = 0; t < idx.length; t += 3) if (mask[idx[t]] && mask[idx[t + 1]] && mask[idx[t + 2]] && triArea(rest, idx[t], idx[t + 1], idx[t + 2]) >= MINA) tris.push(t / 3);
  const grid = new Map(), P = posed;
  for (const f of tris) {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let k = 0; k < 3; k++) { const v = idx[f * 3 + k]; for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], P[v * 3 + a]); hi[a] = Math.max(hi[a], P[v * 3 + a]); } }
    for (let x = Math.floor(lo[0] / cell); x <= Math.floor(hi[0] / cell); x++) for (let y = Math.floor(lo[1] / cell); y <= Math.floor(hi[1] / cell); y++) for (let z = Math.floor(lo[2] / cell); z <= Math.floor(hi[2] / cell); z++) { const k = x + ',' + y + ',' + z; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(f); }
  }
  const seen = new Set(), hit = new Set(), at = []; let pairs = 0;
  for (const l of grid.values()) for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const f = l[i], g = l[j], key = f < g ? f * 1e6 + g : g * 1e6 + f; if (seen.has(key)) continue; seen.add(key);
    const A = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]], B = [idx[g * 3], idx[g * 3 + 1], idx[g * 3 + 2]];
    const ra = A.map(v => rep[v]), rb = B.map(v => rep[v]); if (ra.some(v => rb.includes(v))) continue;
    let x = false; for (let k = 0; k < 3 && !x; k++) x = segTri(P, A[k], A[(k + 1) % 3], B[0], B[1], B[2]) || segTri(P, B[k], B[(k + 1) % 3], A[0], A[1], A[2]);
    if (x) { pairs++; hit.add(f); hit.add(g); if (at.length < 6) at.push([rest[A[0] * 3], rest[A[0] * 3 + 1], rest[A[0] * 3 + 2]].map(v => +v.toFixed(3))); }
  }
  return { pairs, tris: hit.size, at, hitSet: hit };
}
/** Turned-over triangles: the posed normal against the rest normal carried by the triangle's blended (DQ) rotation. */
function folds(c, mesh, posed, mask) {
  const g = mesh.geometry, idx = M.drawnTris(mesh), rest = g.attributes.position.array, I = g.attributes.skinIndex.array, W = g.attributes.skinWeight.array;
  const mirror = mesh.bindMatrix.determinant() < 0; let farea = 0, count = 0, worst = 1, at = null; const list = [];
  const q = new THREE.Quaternion(), blendQ = i => { const q0 = c.dqReal[I[i * 4]]; let x = 0, y = 0, z = 0, w = 0; for (let k = 0; k < 4; k++) { const r = c.dqReal[I[i * 4 + k]], s = (q0.x * r.x + q0.y * r.y + q0.z * r.z + q0.w * r.w) < 0 ? -1 : 1, wt = W[i * 4 + k] * s; x += r.x * wt; y += r.y * wt; z += r.z * wt; w += r.w * wt; } const l = Math.hypot(x, y, z, w); return q.set(x / l, y / l, z / l, w / l); };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), n0 = new THREE.Vector3(), n1 = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const i = idx[t], j = idx[t + 1], k = idx[t + 2]; if (!(mask[i] && mask[j] && mask[k])) continue;
    a.set(rest[j * 3] - rest[i * 3], rest[j * 3 + 1] - rest[i * 3 + 1], rest[j * 3 + 2] - rest[i * 3 + 2]); b.set(rest[k * 3] - rest[i * 3], rest[k * 3 + 1] - rest[i * 3 + 1], rest[k * 3 + 2] - rest[i * 3 + 2]); n0.crossVectors(a, b); const area0 = n0.length() / 2; if (area0 < MINA) continue; n0.normalize();
    a.set(posed[j * 3] - posed[i * 3], posed[j * 3 + 1] - posed[i * 3 + 1], posed[j * 3 + 2] - posed[i * 3 + 2]); b.set(posed[k * 3] - posed[i * 3], posed[k * 3 + 1] - posed[i * 3 + 1], posed[k * 3 + 2] - posed[i * 3 + 2]); n1.crossVectors(a, b);
    if (n1.lengthSq() < 1e-16) { count++; farea += area0; continue; } n1.normalize();
    if (mirror) n0.x = -n0.x; n0.applyQuaternion(blendQ(i)); if (mirror) n0.x = -n0.x; // the DQ rotation acts in the bind (mirrored) frame
    const d = n0.dot(n1); if (d < 0) { count++; farea += area0; list.push(t / 3); if (d < worst) { worst = d; at = [rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]].map(v => +v.toFixed(3)); } }
  }
  return { count, area: +(farea * 1e6).toFixed(1), worst: +worst.toFixed(3), at, list };
}
function stretchRange(mesh, posed, mask) {
  const idx = M.drawnTris(mesh), rest = mesh.geometry.attributes.position.array, r = [];
  for (let t = 0; t < idx.length; t += 3) for (const [u, v] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) { if (!(mask[u] && mask[v])) continue; const r0 = Math.hypot(rest[u * 3] - rest[v * 3], rest[u * 3 + 1] - rest[v * 3 + 1], rest[u * 3 + 2] - rest[v * 3 + 2]); if (r0 < .002) continue; r.push(Math.hypot(posed[u * 3] - posed[v * 3], posed[u * 3 + 1] - posed[v * 3 + 1], posed[u * 3 + 2] - posed[v * 3 + 2]) / r0); }
  r.sort((x, y) => x - y); return { min: +r[0].toFixed(3), p001: +r[Math.floor(r.length * .001)].toFixed(3), p999: +r[Math.floor(r.length * .999)].toFixed(3), max: +r[r.length - 1].toFixed(3) };
}
function measure(c, mesh, opt = {}) {
  const mask = opt.mask || regionMask(mesh, opt.region), posed = opt.posed || M.skinAll(c, mesh);
  const si = selfIntersections(mesh, posed, mask), fo = folds(c, mesh, posed, mask), st = stretchRange(mesh, posed, mask);
  return { selfX: si.pairs, selfTris: si.tris, folds: fo.count, foldArea: fo.area, at: si.at[0] || fo.at, stretch: st };
}
module.exports = { pose, REGION, regionMask, selfIntersections, folds, stretchRange, measure, weldRep };
