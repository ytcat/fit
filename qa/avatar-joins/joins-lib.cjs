// qa/avatar-joins/joins-lib.cjs — join checks shared by qa/avatar-joins/measure.cjs and tests/avatar-joins.test.cjs.
// All positions are CPU-skinned with the rig's own skinPoint (= the vertex shader) or taken from the bone the part is on.
const M = require('./metrics.cjs');
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const pose = (c, fn) => { fn(c); c.root.updateMatrixWorld(true); c.syncSkin(); };

/** Boxing shorts openings: the steepest (most horizontal) fabric facet within 12 mm of the leg hems / the waist cut, and how
 *  many such facets there are. A saw-tooth rim is a row of near-horizontal chamfer facets along the opening. */
function shortsRim(c, HEM = .735, TOP = 1.085) {
  const P = c.shorts.geometry.attributes.position.array, a = V(), b = V(), n = V(); let worst = 0, steep = 0;
  for (let i = 0; i < P.length; i += 9) {
    const ys = [P[i + 1], P[i + 4], P[i + 7]], near = ys.every(y => Math.abs(y - HEM) < .012) || ys.every(y => Math.abs(y - TOP) < .012); if (!near) continue;
    a.set(P[i + 3] - P[i], P[i + 4] - P[i + 1], P[i + 5] - P[i + 2]); b.set(P[i + 6] - P[i], P[i + 7] - P[i + 1], P[i + 8] - P[i + 2]); n.crossVectors(a, b); if (n.lengthSq() < 1e-14) continue; n.normalize();
    const ny = Math.abs(n.y); worst = Math.max(worst, ny); if (ny > .8) steep++;
  }
  return { worst: +worst.toFixed(3), steep };
}

/** Forearm skin outside the glove cuff ('Oval wrist strap') in the hand's frame, over the given poses. Returns the deepest
 *  poke (m) and its pose. The cuff's own oval is measured from its geometry at each height (linear between its rims). */
function cuffEnvelope(c, poses) {
  const dom = M.dominant(c.skin), names = M.boneNames(c); let worst = 0, at = null, count = 0;
  for (const [pname, fn] of Object.entries(poses)) {
    pose(c, fn); const skin = M.skinAll(c, c.skin);
    for (const side of ['L', 'R']) {
      const hand = c.joints['hand' + side], cuff = hand.children.find(o => o.name === 'Oval wrist strap'); if (!cuff || !cuff.visible) continue;
      cuff.updateMatrix(); const cp = cuff.geometry.attributes.position, rings = new Map();
      for (let i = 0; i < cp.count; i++) { const v = V().fromBufferAttribute(cp, i).applyMatrix4(cuff.matrix), k = v.y.toFixed(4), r = rings.get(k) || rings.set(k, { y: v.y, rx: 0, rz: 0 }).get(k); r.rx = Math.max(r.rx, Math.abs(v.x)); r.rz = Math.max(r.rz, Math.abs(v.z)); }
      const R = [...rings.values()].sort((p, q) => p.y - q.y), y0 = R[0].y, y1 = R[R.length - 1].y;
      const oval = y => { let k = 1; while (k < R.length - 1 && R[k].y < y) k++; const p = R[k - 1], q = R[k], t = (y - p.y) / ((q.y - p.y) || 1); return [p.rx + (q.rx - p.rx) * t, p.rz + (q.rz - p.rz) * t]; };
      const m = hand.matrixWorld.clone().invert().multiply(c.root.matrixWorld), v = V();
      for (let i = 0; i < dom.length; i++) { const b = names[dom[i]]; if (b !== 'hand' + side && b !== 'elbow' + side) continue;
        v.set(skin[i * 3], skin[i * 3 + 1], skin[i * 3 + 2]).applyMatrix4(m); if (v.y < y0 + .003 || v.y > y1 - .001) continue;
        const [rx, rz] = oval(v.y), e = Math.hypot(v.x / rx, v.z / rz); if (e <= 1) continue; const d = (e - 1) * Math.min(rx, rz); if (d > .001) count++; if (d > worst) { worst = d; at = pname + side; } }
    }
  }
  return { worst: +worst.toFixed(4), at, count };
}

/** The shorts' side piping: share of its vertices under the posed shorts (> 1.5 mm inside the fabric), worst pose. */
function pipingUnderShorts(c, poses) {
  const pipes = []; c.root.traverse(o => { if (o.isMesh && o.visible && (o.name === 'Satin side piping' || (o.parent === c.joints.thighL || o.parent === c.joints.thighR))) pipes.push(o); });
  let worst = 0, at = null;
  for (const [pname, fn] of Object.entries(poses)) {
    pose(c, fn); const sp = M.skinAll(c, c.shorts), f = M.coverField(sp, M.triIds(c.shorts)); let n = 0, under = 0;
    for (const p of pipes) { const pts = p.isSkinnedMesh ? M.skinAll(c, p) : M.rigidPoints(c, p); for (let i = 0; i < pts.length; i += 3) { const r = f.outside(pts[i], pts[i + 1], pts[i + 2]); if (!r) continue; n++; if (r.s < -.0015 && r.t < .006) under++; } }
    const share = n ? under / n : 0; if (share > worst) { worst = share; at = pname; }
  }
  return { worst: +worst.toFixed(3), at, pipes: pipes.length };
}

/** Sharp edges (dihedral > deg) of a mesh at given positions, only where keep(vertex) (rest-pose region test). */
function sharpEdges(mesh, pos, deg, keep) {
  const { pairs } = M.edgeFaces(mesh), idx = M.drawnTris(mesh), c = Math.cos(deg * Math.PI / 180), a = [0, 0, 0], b = [0, 0, 0];
  const nrm = (f, o) => { const i = idx[f * 3] * 3, j = idx[f * 3 + 1] * 3, k = idx[f * 3 + 2] * 3, ux = pos[j] - pos[i], uy = pos[j + 1] - pos[i + 1], uz = pos[j + 2] - pos[i + 2], vx = pos[k] - pos[i], vy = pos[k + 1] - pos[i + 1], vz = pos[k + 2] - pos[i + 2]; o[0] = uy * vz - uz * vy; o[1] = uz * vx - ux * vz; o[2] = ux * vy - uy * vx; const l = Math.hypot(...o); if (l < 1e-14) return false; o[0] /= l; o[1] /= l; o[2] /= l; return true; };
  let n = 0; for (let e = 0; e < pairs.length; e += 4) { if (!keep(pairs[e + 2])) continue; if (!nrm(pairs[e], a) || !nrm(pairs[e + 1], b)) continue; if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < c) n++; }
  return n;
}
/** The street hoodie round the armholes (rest |x| .18-.5, y > 1.3): sharp edges (> 60 deg) at rest and in each pose. */
function armhole(c, poses) {
  const cloth = c.root.children.find(o => o.userData.streetCloth && o.visible), R = cloth.geometry.attributes.position.array, nH = cloth.geometry.attributes.position.count;
  const keep = i => { const x = Math.abs(R[i * 3]), y = R[i * 3 + 1]; return y > 1.3 && y < 1.8 && x > .18 && x < .5; };
  const out = { rest: sharpEdges(cloth, R, 60, keep) };
  for (const [pname, fn] of Object.entries(poses)) { if (pname === 'bind') continue; pose(c, fn); out[pname] = sharpEdges(cloth, M.skinAll(c, cloth), 60, keep); }
  out.worst = Math.max(...Object.values(out)); return out;
}
/** Clothes dressed on the skin's own streams (Bruno's sweater): sharp edges round the armpits in each pose. */
function streamArmpit(c, poses) {
  const R = c.skin.geometry.attributes.position.array, keep = i => { const x = Math.abs(R[i * 3]), y = R[i * 3 + 1]; return y > 1.3 && y < 1.8 && x > .18 && x < .5; };
  const out = {}; for (const [pname, fn] of Object.entries(poses)) { pose(c, fn); out[pname] = sharpEdges(c.skin, M.skinAll(c, c.skin), 60, keep); }
  out.worst = Math.max(...Object.values(out)); return out;
}
/** Open (unshared) edges on the underside of the street sneakers: a slit through the sole. */
function soleSlit(c) {
  let open = 0;
  for (const s of ['L', 'R']) for (const m of c.joints['foot' + s].children.filter(o => o.isMesh && o.visible && /sneaker|shoe/i.test(o.name))) {
    const P = m.geometry.attributes.position.array, key = i => Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5), cnt = new Map(), idx = M.triIds(m);
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = idx[t + k], b = idx[t + (k + 1) % 3], ka = key(a), kb = key(b); if (ka === kb) continue; const e = ka < kb ? ka + '|' + kb : kb + '|' + ka; cnt.set(e, (cnt.get(e) || { n: 0, y: Math.max(P[a * 3 + 1], P[b * 3 + 1]), x: Math.max(Math.abs(P[a * 3]), Math.abs(P[b * 3])) })); cnt.get(e).n++; }
    for (const e of cnt.values()) if (e.n === 1 && e.y < -.08 && e.x < .03) open++;
  }
  return { open };
}
module.exports = { pose, shortsRim, cuffEnvelope, pipingUnderShorts, sharpEdges, armhole, streamArmpit, soleSlit };
