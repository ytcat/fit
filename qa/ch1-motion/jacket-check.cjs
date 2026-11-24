// Fang's jacket beat and the handbag in dream_market_robbery (ch1-motion QA, node): per frame, where the held / flying jacket
// is (largest jump of its centre between frames, ignoring the 14.95 s cut), how close its surface comes to Fang's body
// (capsules on his skeleton), where the heap lands against the handbag and the feet, and the handbag's largest jump.
// usage: node qa/ch1-motion/jacket-check.cjs [t0=13.2] [t1=17.0]
const path = require('path');
const [t0 = '13.2', t1 = '17.0'] = process.argv.slice(2);
global.__jacketProbe = rigs => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), f = rigs.fang, j = f.joints, w = o => o.getWorldPosition(V());
  const caps = [[w(j.hips), w(j.chest), .2, 'torso'], [w(j.chest), w(j.head), .13, 'neck'], ...['L', 'R'].flatMap(s => [[w(j['thigh' + s]), w(j['knee' + s]), .1, 'thigh' + s], [w(j['knee' + s]), w(j['foot' + s]), .075, 'shin' + s], [w(j['arm' + s]), w(j['elbow' + s]), .07, 'arm' + s]])];
  const seg = (p, a, b) => { const ab = b.clone().sub(a), u = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, u)); };
  const out = { wear: f.castWear };
  const h = f.castJacketHeld, g = f.castJacketGround;
  const vis = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  if (h && vis(h)) {
    h.updateMatrixWorld(true); let clear = Infinity, who = null; const v = V(); const box = new THREE.Box3();
    h.traverse(m => { if (!m.isMesh) return; const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); box.expandByPoint(v); for (const [a, b, r, n] of caps) { if (n === 'armR') continue; const d = seg(v, a, b) - r; if (d < clear) { clear = d; who = n; } } } });
    out.held = { c: box.getCenter(V()).toArray().map(x => +x.toFixed(3)), clear: +clear.toFixed(3), who, inHand: h.parent === j.handR, minY: +box.min.y.toFixed(3) };
  }
  if (g && vis(g)) { g.updateMatrixWorld(true); out.ground = w(g).toArray().map(x => +x.toFixed(3)); }
  const bag = window.StoryCast.market.handbag(rigs.hazel); if (bag && vis(bag)) out.bag = w(bag).toArray().map(x => +x.toFixed(3));
  out.feet = ['fighter', 'fang'].flatMap(k => ['L', 'R'].map(s => w(rigs[k].joints['foot' + s]).toArray().map(x => +x.toFixed(3))));
  return out;
};
process.env.PROBE = '__jacketProbe(rigs)';
process.argv = [process.argv[0], path.join(__dirname, 'sim.cjs'), 'dream_market_robbery', t0, t1, '0', String(1 / 60)];
const { rows } = require('./sim.cjs');
let prev = null; const s = { heldJump: 0, heldJumpAt: null, clear: Infinity, clearWho: null, clearAt: null, bagJump: 0, bagJumpAt: null, landed: null, heldFrames: 0 };
for (const r of rows) {
  const p = r.probe; if (!p) continue;
  if (p.held) { s.heldFrames++; if (p.held.clear < s.clear) { s.clear = p.held.clear; s.clearWho = p.held.who; s.clearAt = r.t; } }
  if (prev && p.held && prev.held && Math.abs(r.t - 14.95) > .02) { const d = Math.hypot(...p.held.c.map((x, i) => x - prev.held.c[i])); if (d > s.heldJump) { s.heldJump = +d.toFixed(3); s.heldJumpAt = r.t; } }
  if (prev && p.bag && prev.bag) { const d = Math.hypot(...p.bag.map((x, i) => x - prev.bag[i])); if (d > s.bagJump) { s.bagJump = +d.toFixed(3); s.bagJumpAt = r.t; } }
  if (p.ground && !s.landed) { s.landed = { t: r.t, at: p.ground, fromLastHeld: prev?.held ? +Math.hypot(p.ground[0] - prev.held.c[0], p.ground[2] - prev.held.c[2]).toFixed(3) : null, toBag: p.bag ? +Math.hypot(p.ground[0] - p.bag[0], p.ground[2] - p.bag[2]).toFixed(3) : null, toFeet: +Math.min(...p.feet.map(f => Math.hypot(p.ground[0] - f[0], p.ground[2] - f[2]))).toFixed(3) }; }
  prev = p;
}
s.clear = +s.clear.toFixed(3);
console.log(JSON.stringify(s));
if (process.env.ROWS) for (const r of rows) if (r.probe?.held || Math.abs(r.t - 14.95) < .05) console.log(r.t.toFixed(3), JSON.stringify(r.probe.held || null), r.probe.wear, JSON.stringify(r.probe.ground || null));
