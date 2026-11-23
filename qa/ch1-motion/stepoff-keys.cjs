// Builds the city step-off keys of dream_opening (ch1-motion) for a start time t0 and stop time t1, with the floor marker
// (z 2.5) at key time 7.6 (doors fully open: tests/city-assets.test.cjs). Constant pre-ramp speed; DreamCore's actor ramp
// eases the start and the stop. usage: node qa/ch1-motion/stepoff-keys.cjs t0 t1  -> JSON keys (also used by sim PATCH)
function keys(t0, t1, tf = 7.6) {
  const zf = 2.5, z1 = 4.5, z0 = (zf * (t1 - t0) - z1 * (tf - t0)) / ((t1 - t0) - (tf - t0)), vp = (z1 - z0) / (t1 - t0);
  const at = z => +(t0 + (z - z0) / vp).toFixed(3), zAt = t => +(z0 + (t - t0) * vp).toFixed(3), r = v => +v.toFixed(3);
  const tk = at(3.85), ty = (t) => { const u = Math.min(1, Math.max(0, (t - tf) / (tk - tf))); return r(.57 * (1 - u * u * (3 - 2 * u))); };
  const tLook1 = at(2.95), tLook2 = at(3.6), tTown = at(4.0);
  return { z0: r(z0), vp: r(vp), keys: [
    { t: 0, x: 2.75, z: r(z0), y: .57, act: 'off', face: 0, arms: { R: 'strap' }, look: { yaw: 0, pitch: -.05 } },
    { t: t0, x: 2.75, z: r(z0) },
    { t: 7.3, x: 2.75, z: zAt(7.3), act: 'idle', face: 0 },
    { t: tf, x: 2.75, z: zf, y: .57 },
    { t: tLook1, x: 2.75, z: 2.95, y: ty(tLook1), look: { yaw: 0, pitch: -.4 } },
    { t: tLook2, x: 2.75, z: 3.6, y: ty(tLook2), look: { yaw: .15, pitch: -.15 } },
    { t: tk, x: 2.75, z: 3.85, y: 0 },
    { t: tTown, x: 2.75, z: 4.0, look: [30, 5.4, -6] },
    { t: t1, x: 2.75, z: 4.5, y: 0 }
  ] };
}
module.exports = { keys };
if (require.main === module) console.log(JSON.stringify(keys(+process.argv[2], +process.argv[3])));
