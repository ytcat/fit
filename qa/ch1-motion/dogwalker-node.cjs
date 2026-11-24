// Node check of the dog walker (adventure/story/dog-walker.js): leash length and clearance, her soles and the dog's paws.
// usage: node qa/ch1-motion/dogwalker-node.cjs [t0] [t1] [verbose]
const path = require('path'); process.chdir(path.join(__dirname, '../..'));
global.THREE = require('../../assets/vendor/three.min.js'); global.window = global; window.ArenaSets = require('../../arena-sets.js'); require('../../adventure/story/dog-walker.js');
const w = DogWalker.build({ species: 'fox', fur: '#c9743a', muzzle: '#f2ece2', top: '#8f3b3b', legs: '#262a33', shoes: '#e8e2d6', dog: '#c79257', side: +(process.env.SIDE || -1) });
const t0 = +(process.argv[2] || 0), t1 = +(process.argv[3] || 20), dt = 1 / 30; let prev = null;
const s = { clear: Infinity, clearAt: null, ground: Infinity, len: [Infinity, 0], chord: [Infinity, 0], footSlide: 0, pawSlide: 0, footAir: 0, pawLow: 0 };
for (let t = t0; t < t1; t += dt) {
  w.update(t, { x: -14 + 1.15 * t, z: -5, ry: Math.PI / 2, dist: 1.15 * t, speed: 1.15 }); const p = w.probe();
  if (p.leash.clear < s.clear) { s.clear = p.leash.clear; s.clearAt = +t.toFixed(2); }
  s.ground = Math.min(s.ground, p.leash.ground); s.len = [Math.min(s.len[0], p.leash.drawn), Math.max(s.len[1], p.leash.drawn)]; s.chord = [Math.min(s.chord[0], p.leash.span), Math.max(s.chord[1], p.leash.span)];
  if (Math.min(...p.feet.map(f => f[1])) > .02) s.footAir++;
  s.pawLow = Math.min(s.pawLow, ...p.paws.map(f => f[1]), ...p.feet.map(f => f[1]));
  if (prev) { p.feet.forEach((f, k) => { const a = prev.feet[k]; if (f[1] < .012 && a[1] < .012) s.footSlide = Math.max(s.footSlide, Math.hypot(f[0] - a[0], f[2] - a[2])); }); p.paws.forEach((f, k) => { const a = prev.paws[k]; if (f[1] < .01 && a[1] < .01) s.pawSlide = Math.max(s.pawSlide, Math.hypot(f[0] - a[0], f[2] - a[2])); }); }
  if (process.argv[4]) console.log(t.toFixed(2), JSON.stringify(p.leash), p.feet.map(f => f[1]).join(','), p.paws.map(f => f[1]).join(','));
  prev = p;
}
for (const k of Object.keys(s)) if (typeof s[k] === 'number') s[k] = +s[k].toFixed(4); else if (Array.isArray(s[k])) s[k] = s[k].map(v => +v.toFixed(4));
console.log(JSON.stringify(s), JSON.stringify(w.stats()));
