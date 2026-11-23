// Motion metrics shared by measure.cjs (browser) and sim.cjs (node); see measure.cjs for the definitions.
function summary(rows) {
  const res = {}, ids = new Set(rows.flatMap(r => Object.keys(r.a)));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  for (const id of ids) {
    const s = { frames: 0, slideMax: 0, slideMaxAt: null, slideSum: 0, hop: 0, hopAt: null, dropMax: 0, air: 0, airAt: null, airStill: 0, agree: 0, agreeAt: null, gazeVsTravel: 0, chestVsTravel: 0, feetVsTravel: 0 };
    let prev = null;
    for (const r of rows) {
      const a = r.a[id]; if (!a || !a.vis) { prev = null; continue; } s.frames++;
      const h = f => Math.min(f.ball[1] - f.g, f.heel[1] - f.gh), low = f => (f.ball[1] - f.g < f.heel[1] - f.gh ? f.ball : f.heel);
      if (prev && prev.shot === r.shot) {
        for (let k = 0; k < 2; k++) {
          const f0 = prev.a.feet[k], f1 = a.feet[k];
          if (h(f0) < .015 && h(f1) < .015) { const p0 = low(f0), p1 = low(f1), same = (p0 === f0.ball) === (p1 === f1.ball); const q0 = same ? p0 : f0.ball, q1 = same ? p1 : f1.ball, d = Math.hypot(q1[0] - q0[0], q1[2] - q0[2]); s.slideSum += d; if (d > s.slideMax) { s.slideMax = d; s.slideMaxAt = r.t; } }
        }
        const dy = a.hips[1] - prev.a.hips[1]; if (dy > s.hop) { s.hop = dy; s.hopAt = r.t; } if (-dy > s.dropMax) s.dropMax = -dy;
        const moving = Math.hypot(a.x - prev.a.x, a.z - prev.a.z) > .004;
        if (moving) {
          const travel = Math.atan2(a.x - prev.a.x, a.z - prev.a.z), feetYaw = Math.atan2(Math.sin(a.feet[0].yaw) + Math.sin(a.feet[1].yaw), Math.cos(a.feet[0].yaw) + Math.cos(a.feet[1].yaw));
          const dirs = [a.yHead, a.yChest, feetYaw, travel], spread = Math.max(...dirs.flatMap(x => dirs.map(y => Math.abs(wrap(x - y)))));
          if (spread > s.agree) { s.agree = spread; s.agreeAt = r.t; }
          s.gazeVsTravel = Math.max(s.gazeVsTravel, Math.abs(wrap(a.yHead - travel))); s.chestVsTravel = Math.max(s.chestVsTravel, Math.abs(wrap(a.yChest - travel))); s.feetVsTravel = Math.max(s.feetVsTravel, Math.abs(wrap(feetYaw - travel)));
        }
      }
      const air = Math.min(h(a.feet[0]), h(a.feet[1])) > .03; if (air) { s.air++; s.airAt ??= r.t; if (prev && Math.hypot(a.x - prev.a.x, a.z - prev.a.z) < .002) s.airStill++; }
      prev = { a, shot: r.shot };
    }
    for (const k of Object.keys(s)) if (typeof s[k] === 'number' && !Number.isInteger(s[k])) s[k] = +s[k].toFixed(4);
    res[id] = s;
  }
  const life = rows.filter(r => r.life); if (life.length) res.life = lifeSummary(life);
  return res;
}
function lifeSummary(rows) {
  const s = { frames: rows.length, leashMin: Infinity, leashMax: 0, leashStretch: 0, leashHit: 0, footSlideMax: 0, pawSlideMax: 0 };
  let prev = null;
  for (const r of rows) {
    const L = r.life; if (L.leash) { s.leashMin = Math.min(s.leashMin, L.leash.span); s.leashMax = Math.max(s.leashMax, L.leash.span); s.leashStretch = Math.max(s.leashStretch, L.leash.span - (L.leash.length || L.leash.span)); s.leashHit = Math.max(s.leashHit, L.leash.hit || 0); }
    if (prev && L.feet && prev.feet) for (let k = 0; k < L.feet.length; k++) { const a = prev.feet[k], b = L.feet[k]; if (a[1] < .015 && b[1] < .015) s.footSlideMax = Math.max(s.footSlideMax, Math.hypot(b[0] - a[0], b[2] - a[2])); }
    if (prev && L.paws && prev.paws) for (let k = 0; k < L.paws.length; k++) { const a = prev.paws[k], b = L.paws[k]; if (a[1] < .012 && b[1] < .012) s.pawSlideMax = Math.max(s.pawSlideMax, Math.hypot(b[0] - a[0], b[2] - a[2])); }
    prev = L;
  }
  for (const k of Object.keys(s)) if (typeof s[k] === 'number' && !Number.isInteger(s[k])) s[k] = +s[k].toFixed(4);
  return s;
}
module.exports = { summary, lifeSummary };
