// Phase summary of an otto-carry.cjs run: node qa/arm-fixes/phases.cjs <dir>/<species>-carry.json [before]
// approach = the hand going to the bag, contact = on the hanging bag (knees bent), lift, settle, walk (the turn and the
// first steps). gap: paw to leather (cm, - = inside); wJ: wrist turn per frame (deg); tw: upper-arm twist per frame;
// hs / bs: hand / bag travel per frame (cm); el: where the elbow points (out to his right / behind him, unit vector; elZ =
// elbow ahead of the chest, m); body / arm: deepest skinned vertex of the body / the right arm inside the bag (cm, - = inside).
// `before`: the v1.91 film (the bag appears on the shoulder at 27.5, he walks out from 27.5).
const r = require(require('path').resolve(process.argv[2]));
const mm = (a, f) => a.length ? [Math.min(...a.map(f)), Math.max(...a.map(f))].map(v => +v.toFixed(2)) : null;
const P = process.argv[3] === 'before' ? [['attach', 27.4, 27.6], ['carry', 27.6, 30.0]] : [['approach', 24.8, 25.7], ['contact', 25.7, 26.9], ['lift', 26.9, 27.9], ['settle', 27.9, 28.4], ['walk', 28.4, 30.2]];
const out = {};
for (const [n, a, b] of P) {
  const s = r.filter(x => x.t >= a && x.t < b), bd = s.filter(x => x.body);
  out[n] = { gap: mm(s.filter(x => x.pawGap != null), x => x.pawGap), wJ: mm(s, x => x.wristJump)[1], tw: mm(s, x => x.shoulderTwist)[1], hs: mm(s, x => x.handStep)[1], bs: mm(s, x => x.bagStep || 0)[1], elOut: mm(s, x => x.elbow.out), elBack: mm(s, x => x.elbow.back), elZ: mm(s, x => x.elbow.z), body: mm(bd, x => x.body.min), arm: mm(bd, x => x.body.armMin) };
}
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(9), JSON.stringify(v));
