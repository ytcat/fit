// node qa/avatar-joins/covers.cjs [variant ...] — skin that comes out through what covers it (glove cuffs, gloves, paws,
// boots and shoes, shorts and waistband, street clothes, collars, wraps), per pose. ROOT=<checkout> audits another tree.
// A drawn skin vertex pokes through when it is > 2 mm outside the cover within 6 mm across the cover's surface.
const lib = require('./lib.cjs'); lib.load();
const M = require('./metrics.cjs'), cast = require('./cast.cjs');
const COVER = /glove|strap|cuff|boot|shoe|hand|paw|wrap|band|collar|hood|cap|scarf|kerchief|belt|apron|jacket|sleeve|sock|trouser|cloth|shorts/i, THIN = /binding|stitch|lace|rim|tongue|seam|label|eyelet|piping|sole|toe|heel|loop|knot|string/i;
const shown = (o, root) => { for (let q = o; q && q !== root; q = q.parent) if (!q.visible) return false; return o.visible; };
function covers(c) {
  const out = []; c.root.traverse(o => { if (!o.isMesh || !shown(o, c.root) || o === c.skin || o === c.bodyFur || !o.geometry?.attributes?.position) return;
    if (o.isSkinnedMesh || (COVER.test(o.name || '') && !THIN.test(o.name || '')) || o === c.shorts) out.push(o); });
  return out;
}
function check(c, opt = {}) {
  c.root.updateMatrixWorld(true); c.syncSkin();
  const skin = M.skinAll(c, c.skin), idx = M.drawnTris(c.skin), drawn = new Uint8Array(skin.length / 3); for (const i of idx) drawn[i] = 1;
  const res = {};
  for (const m of covers(c)) {
    const pts = m.isSkinnedMesh ? M.skinAll(c, m) : M.rigidPoints(c, m), f = M.coverField(pts, M.triIds(m));
    let lo = [9, 9, 9], hi = [-9, -9, -9]; for (let i = 0; i < pts.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pts[i + k]); hi[k] = Math.max(hi[k], pts[i + k]); }
    // only the body under this cover: a rigid cover takes the skin of its bone and that bone's parent; a skinned cover
    // the skin whose nearest cover vertex follows the same bone (hands touching a sleeve or a face are not under it)
    const bone = (() => { for (let q = m.parent; q && q !== c.root; q = q.parent) if (q.isBone) return q; return null; })(), dom = M.dominant(c.skin), names = M.boneNames(c);
    const okBone = bone ? new Set([bone.name, bone.parent?.isBone ? bone.parent.name : bone.name]) : null, cdom = m.isSkinnedMesh ? M.dominant(m) : null;
    const cand = []; for (let i = 0; i < drawn.length; i++) if (drawn[i] && (!okBone || okBone.has(names[dom[i]])) && skin[i * 3] > lo[0] - .01 && skin[i * 3] < hi[0] + .01 && skin[i * 3 + 1] > lo[1] - .01 && skin[i * 3 + 1] < hi[1] + .01 && skin[i * 3 + 2] > lo[2] - .01 && skin[i * 3 + 2] < hi[2] + .01) cand.push(i);
    const keep = cdom ? cand.filter(i => { const h = f.outside(skin[i * 3], skin[i * 3 + 1], skin[i * 3 + 2]); return h && cdom[h.i] === dom[i]; }) : cand;
    const r = M.pokeThrough(f, skin, keep, opt.tol ?? .002, opt.span ?? .006); const key = (m.parent?.name || 'root') + ':' + (m.name || 'mesh');
    if (!res[key] || r.count > res[key].count) res[key] = { ...r, tested: keep.length };
  }
  return res;
}
module.exports = { check, covers };
if (require.main === module) {
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cast.VARIANTS);
  for (const n of want) { const c = cast.make(n), poses = cast.posesFor(n);
    for (const [pose, fn] of Object.entries(poses)) { fn(c); const r = check(c); const bad = Object.entries(r).filter(([, v]) => v.count > 0).map(([k, v]) => `${k} ${v.count}/${v.tested} max ${(v.worst * 1000).toFixed(1)} mm at ${v.at}`); console.log(n, pose, bad.length ? '\n   ' + bad.join('\n   ') : 'clean'); } }
}
