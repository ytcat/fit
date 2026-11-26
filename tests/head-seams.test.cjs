// node tests/head-seams.test.cjs — the joins of the authored heads (Fang, Mrs. Hazel, Coach Bruno) with their bodies, in every tested pose
// (AGENTS.md "Avatars and character parts: joins must be checked"; owner 2026-11-25 on v1.96: "what is in her neck?").
//  1. nothing of the body pokes out between the collar and the jaw: every body-skin vertex above the character's collar line lies
//     inside the head model's own cross-section (same height, same direction round the neck), 5 mm tolerance;
//  2. the model's open bottom ring stays inside the body (below the collar, inside the torso's cross-section);
//  3. no flare (Hazel): between collar and jaw the model stays within its neck envelope (the kerchief's drape at the back excepted);
//  4. the check catches the v1.96 faults: with v1.96's skin settings both heads fail check 1 (negative control, in this test).
// Poses: Fang standing, talking, walking in the jacket; guard, punches, a hit and the knockdown in the fight top. Hazel through her
// films (robbery and reward, every 0.5 s), talking and walking. Bruno (owner 2026-11-26) through his nine films (every second), talking,
// walking, pointing, hands on hips, the referee's count and the winner's wrist held high, looking round and down; his bottom rings
// (the neck tube's end and the bust's cut rim, both meant to sit inside the cardigan) stay inside the body.
// Env HAZEL_GLB=<file> / BRUNO_GLB=<file> runs it on another model (v1.96 Hazel, or Bruno's head without its neck tube
// (tools/blender/bruno_head_game.py tube=0): both fail). Env ONLY=bruno checks one character.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; global.addEventListener = () => {};
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
const RealLoader = THREE.GLTFLoader;
THREE.GLTFLoader = class { load(url, ok, _p, err) { let f = url.replace(/^\.\//, '').split('?')[0]; if (/hazel/.test(f) && process.env.HAZEL_GLB) f = process.env.HAZEL_GLB; if (/bruno/.test(f) && process.env.BRUNO_GLB) f = process.env.BRUNO_GLB; const b = fs.readFileSync(f); new RealLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), '', ok, err); } };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const Core = require('../adventure/story/dream-core'), M = require('../adventure/story/market-core');
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// per character: the collar line (rest y: above it only the head model may show), the axis round which cross-sections are taken
// (head frame x 0, z), where the model's bottom ring is, and (Hazel) the neck envelope between collar and jaw
const SPEC = {
  fang: { collar: 1.805, zc: -.12, ringBelow: -.2, ringFront: -.08, ringX: .14 }, // the throat stump; behind and beside it the ruff and mane hang over the shoulders and back by design and their spikes cover the stump
  hazel: { collar: 1.78, zc: -.06, ringBelow: -.1, ringFront: -9, ringX: 9, envelope: { y: [-.075, -.048], rx: .115, rz: .125, zc: -.064, behind: -.15 } /* below the drape's hem (-0.045) */ },
  bruno: { collar: 1.78, zc: 0, ringBelow: -.09, ringFront: -9, ringX: 9 } // the cardigan ends at 1.775; rings: the tube's end (-0.2) and the bust's cut (-0.1)
};
const V196 = { fang: { from: 1.79, to: 1.85, amount: .62 }, hazel: { from: 1.78, to: 1.84, amount: .62 }, bruno: { from: 1.79, to: 1.85, amount: .62 } /* the generic v1.96 fold, as the other heads had it */ };

function modelOf(c) { let m = null; c.joints.head.getObjectByName(c.castHead.group.name).traverse(o => { if (o.isMesh) m = o; }); return m; }
/** The model's surface as cross-sections round the axis: bins of 1 cm height x 6 degrees -> max radius (head frame). */
function sections(c, spec) {
  const m = modelOf(c), P = m.geometry.attributes.position, toHead = new THREE.Matrix4().copy(c.joints.head.matrixWorld).invert().multiply(m.matrixWorld), v = V(), bins = new Map();
  c.root.updateMatrixWorld(true);
  // the surface itself, not only its vertices (a flat tube keeps few vertices after decimation): points every ~6 mm on each triangle
  const I = m.geometry.index.array, A = V(), B = V(), C = V();
  const put = q => { const yb = Math.round(q.y * 100), ab = Math.round(Math.atan2(q.x, q.z - spec.zc) / (Math.PI / 30)), r = Math.hypot(q.x, q.z - spec.zc), k = yb + ':' + ab; if (!(bins.get(k) >= r)) bins.set(k, r); };
  for (let t = 0; t < I.length; t += 3) {
    A.fromBufferAttribute(P, I[t]).applyMatrix4(toHead); B.fromBufferAttribute(P, I[t + 1]).applyMatrix4(toHead); C.fromBufferAttribute(P, I[t + 2]).applyMatrix4(toHead);
    const n = Math.max(1, Math.ceil(Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)) / .006));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const a = i / n, b = j / n; put(v.set(0, 0, 0).addScaledVector(A, 1 - a - b).addScaledVector(B, a).addScaledVector(C, b)); }
  }
  return (y, x, z) => { const yb = Math.round(y * 100), ab = Math.round(Math.atan2(x, z - spec.zc) / (Math.PI / 30)); let r = -1; for (let dy = -1; dy <= 1; dy++) for (let da = -2; da <= 2; da++) { const q = bins.get((yb + dy) + ':' + ((ab + da + 90) % 60 - 30)) ?? bins.get((yb + dy) + ':' + (ab + da)); if (q > r) r = q; } return r; };
}
/** Check 1: skin vertices above the collar that stick out of the model (count, worst distance). */
function pokes(c, spec, band) {
  const sec = sections(c, spec), sk = c.skin, P = sk.geometry.attributes.position, inv = new THREE.Matrix4().copy(c.joints.head.matrixWorld).invert(), v = V();
  let n = 0, worst = 0, at = null;
  for (const i of band) {
    sk.boneTransform(i, v); v.applyMatrix4(sk.matrixWorld).applyMatrix4(inv);
    const R = sec(v.y, v.x, v.z), r = Math.hypot(v.x, v.z - spec.zc);
    if (R < 0) continue; // no model at that height and direction (above the head or below the stump)
    if (r > R + .005) { n++; if (r - R > worst) { worst = r - R; at = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; } }
  }
  return { n, worst: +worst.toFixed(3), at };
}
/** Check 2: the model's open bottom ring inside the torso. */
function ringOutside(c, spec, ring) {
  const m = modelOf(c), sk = c.skin, P = sk.geometry.attributes.position, v = V(), pts = [], out = [];
  c.root.updateMatrixWorld(true);
  // cross-sections across the torso (the chest joint's frame: a bent or lying body is cut square, not by world height)
  const toChest = new THREE.Matrix4().copy(c.joints.chest.matrixWorld).invert();
  for (let i = 0; i < P.count; i += 3) { const y = P.getY(i); if (y < 1.35 || y > 1.85 || Math.abs(P.getX(i)) > .4) continue; sk.boneTransform(i, v); pts.push(v.clone().applyMatrix4(sk.matrixWorld).applyMatrix4(toChest)); }
  const chest = V();
  for (const p0 of ring) {
    const p = p0.clone().applyMatrix4(m.matrixWorld).applyMatrix4(toChest), slab = pts.filter(q => Math.abs(q.y - p.y) < .015 && Math.hypot(q.x - chest.x, q.z - chest.z) < .45); if (slab.length < 20) continue;
    const cx = slab.reduce((s, q) => s + q.x, 0) / slab.length, cz = slab.reduce((s, q) => s + q.z, 0) / slab.length, a = Math.atan2(p.x - cx, p.z - cz), r = Math.hypot(p.x - cx, p.z - cz);
    // the torso's radius in that direction (a sector of the slab); where the slab has no surface in that direction (the armpits)
    // the torso is at least 0.8 of its median radius there
    const rad = slab.map(q => Math.hypot(q.x - cx, q.z - cz)).sort((x, y) => x - y);
    let R = .8 * rad[rad.length >> 1]; for (const q of slab) { let d = Math.atan2(q.x - cx, q.z - cz) - a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < .3) R = Math.max(R, Math.hypot(q.x - cx, q.z - cz)); }
    if (r > R - .003) { out.push(+(r - R).toFixed(3)); if (process.env.SEAM_DEBUG) console.log("ring out", p0.toArray().map(x => +x.toFixed(3)), "world", p.toArray().map(x => +x.toFixed(3)), "c", +cx.toFixed(3), +cz.toFixed(3), "r", +r.toFixed(3), "R", +R.toFixed(3), slab.length, JSON.stringify([slab.filter(q => q.x > cx).length, slab.filter(q => q.x <= cx).length, Math.max(...slab.map(q => q.x)).toFixed(3), Math.min(...slab.map(q => q.x)).toFixed(3), Math.max(...slab.map(q => q.z)).toFixed(3), Math.min(...slab.map(q => q.z)).toFixed(3)])); }
  }
  return out;
}
/** Check 3: flare between collar and jaw (vertices outside the neck envelope, the drape behind excepted). */
function flare(c, spec) {
  const e = spec.envelope; if (!e) return 0; const m = modelOf(c), P = m.geometry.attributes.position, v = V(); let n = 0;
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y < e.y[0] || v.y > e.y[1] || v.z < e.behind) continue; if (Math.hypot(v.x / e.rx, (v.z - e.zc) / e.rz) > 1) n++; }
  return n;
}
function bottomRing(c, spec) {
  const m = modelOf(c), g = m.geometry, I = g.index.array, P = g.attributes.position, cnt = new Map();
  for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) { const k = a < b ? a + ':' + b : b + ':' + a; cnt.set(k, (cnt.get(k) || 0) + 1); }
  const vs = new Set(); for (const [k, n] of cnt) if (n === 1) for (const i of k.split(':').map(Number)) if (P.getY(i) < spec.ringBelow && P.getZ(i) > spec.ringFront && Math.abs(P.getX(i)) < spec.ringX) vs.add(i);
  return [...vs].map(i => V().fromBufferAttribute(P, i));
}
const bandOf = (c, spec) => { const P = c.skin.geometry.attributes.position, out = []; for (let i = 0; i < P.count; i += 2) { const y = P.getY(i); if (y >= spec.collar && y < 1.9 && Math.abs(P.getX(i)) < .16) out.push(i); /* the neck and head, not the tops of the shoulders (a tucked chin meets the shoulder in a punch) */ } return out; };

(async () => {
  const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
  data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json')); global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
  const report = {};
  for (const id of ['fang', 'hazel', 'bruno'].filter(i => !process.env.ONLY || process.env.ONLY.split(',').includes(i))) {
    const c = StoryCast.rig(id, engine), H = StoryCast.market.heads[id], spec = SPEC[id];
    assert.equal(await H.ready(30000), 'ready', id + ' head loads'); assert.ok(c.castHead.on, id + ' head on');
    c.root.scale.set(-1, 1, 1); // the films' and fights' mirrored root
    const band = bandOf(c, spec), ring = bottomRing(c, spec), poses = [];
    assert.ok(band.length > 1000 && ring.length > 8, id + ': band ' + band.length + ', ring ' + ring.length);
    const pose = (name, fn) => poses.push([name, fn]);
    if (id === 'fang') {
      for (const [n, st] of [['stand', {}], ['talk', { talk: 1 }], ['walk', { walk: 1, dist: 1.3 }], ['look', { look: { yaw: .5, pitch: .2 } }]]) pose('jacket ' + n, t => { StoryCast.market.wear(c, 'jacket'); DreamPose.civil(c, { t, dt: 1 / 30, dist: 0, ...st }); if (st.talk) StoryCast.talk(c, .9); });
      for (const [n, mv, ph, ex] of [['guard', 'guard', 0, {}], ['jab', 'jab', .5, {}], ['cross', 'cross', .5, {}], ['hook', 'lead_hook', .55, {}], ['uppercut', 'rear_uppercut', .5, {}], ['hit', 'guard', 0, { hitReaction: { side: 1, power: 1 } }], ['knockdown', 'guard', 0, { down: true, presentation: { mode: 'loser', raise: 0 } }]])
        pose('fight ' + n, t => { StoryCast.market.wear(c, 'fight'); c.update(mv === 'guard' ? t : ph * 1.22, mv, 'one_two', { simulationTime: t, keepFaceClear: true, guardCover: 1, power: 1.15, recoil: 0, advance: 0, contactDrive: 0, ...ex }); DreamPose.reset(c); });
    } else if (id === 'bruno') {
      const films = [[require('../adventure/story/dream-core'), ['dream_gym_talk', 'dream_after_brick']], [M, ['dream_apology']], [require('../adventure/story/docks-core'), ['dream_docks', 'dream_docks_after', 'dream_fight_night', 'dream_chapter_end']], [require('../adventure/story/gym-return-core'), ['dream_new_bag', 'dream_offer']]];
      for (const [mod, ids] of films) for (const sid of ids) { const S = mod.scenes[sid]; for (let t = 0; t <= S.duration; t += 1) { const s = Core.sample(S, t).actors.bruno; if (!s || s.act === 'off') continue; pose(sid + ' ' + t.toFixed(1), () => { DreamPose.civil(c, { t, dt: 1 / 30, dist: s.dist, walk: +s.walking, arms: s.arms, lean: s.lean, drop: s.drop, talk: s.talk ? 1 : 0, look: { yaw: 0, pitch: 0 } }); if (s.talk) StoryCast.talk(c, .8); }); } }
      for (const [n, st] of [['talk', { talk: 1, arms: { R: 'open' } }], ['walk', { walk: 1 }], ['point', { arms: { R: 'point' } }], ['hips', { arms: { L: 'hips', R: 'hips' } }], ['shrug', { arms: { L: 'shrug', R: 'shrug' } }],
        ['look left', { look: { yaw: .7, pitch: 0 } }], ['look right', { look: { yaw: -.7, pitch: 0 } }], ['look down', { look: { yaw: 0, pitch: -.5 } }], ['look up', { look: { yaw: 0, pitch: .35 } }]])
        pose(n, t => { DreamPose.civil(c, { t, dt: 1 / 30, dist: st.walk ? t * 1.25 : 0, ...st }); if (st.talk) StoryCast.talk(c, 1); });
      // the referee (adventure/story/gym-fight.js): the count over a fallen fighter, the winner's wrist held high, the Sunday Punch wave-off
      pose('referee count', t => { const beat = t % 1; DreamPose.civil(c, { t, dt: 1 / 30, dist: 0, arms: { L: 'hips', R: 'count' }, reach: { R: [.3, 1.6 - .24 * Math.min(1, beat * 4), .38] }, look: { yaw: 0, pitch: -.45 }, lean: .2 }); });
      for (const x of [.55, -.55]) pose('referee raise ' + x, t => DreamPose.civil(c, { t, dt: 1 / 30, dist: 0, arms: { L: 'hips', R: 'hips' }, reach: { [x > 0 ? 'R' : 'L']: { at: [x, 2.0, .25], w: 1, pole: [Math.sign(x), -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } }, look: { yaw: 0, pitch: .2 } }));
      pose('referee wave-off', t => { const k = Math.sin(t * Math.PI * 2 * 1.4); DreamPose.civil(c, { t, dt: 1 / 30, dist: 0, arms: { L: 'count', R: 'count' }, reach: { L: [-.05 + .4 * k, 2.05, .22], R: [.05 - .4 * k, 2.05, .22] }, lean: .04, look: { yaw: 0, pitch: -.3 } }); });
    } else {
      for (const sid of ['dream_market_robbery', 'dream_market_reward']) { const S = M.scenes[sid]; for (let t = 0; t <= S.duration; t += .5) { const s = Core.sample(S, t).actors.hazel; if (!s || s.act === 'off') continue; pose(sid + ' ' + t.toFixed(1), () => { DreamPose.civil(c, { t, dt: 1 / 30, dist: s.dist, walk: +s.walking, arms: s.arms, lean: s.lean, talk: s.talk ? 1 : 0, look: { yaw: 0, pitch: 0 } }); if (s.talk) StoryCast.talk(c, .8); }); } }
      pose('talk', t => { DreamPose.civil(c, { t, dt: 1 / 30, dist: 0, talk: 1, arms: { R: 'open' } }); StoryCast.talk(c, 1); });
      pose('walk', t => DreamPose.civil(c, { t, dt: 1 / 30, dist: t * 1.2, walk: 1 }));
    }
    let worst = { n: 0 }, ringBad = [], checked = 0;
    for (const [name, fn] of poses) {
      for (let k = 0; k < 4; k++) { fn(2 + k / 30); c.updateMane?.(2 + k / 30); } c.root.updateMatrixWorld(true);
      const p = pokes(c, spec, band), r = ringOutside(c, spec, ring); checked++;
      if (process.env.SEAM_DEBUG) console.log("pose", name, "headY", +c.joints.head.getWorldPosition(V()).y.toFixed(3), "nod", +(c.castHead.group.rotation.x).toFixed(3), "lift", +c.castHead.group.position.length().toFixed(3), "pokes", p.n, "ring", r.length);
      if (p.n > worst.n) worst = { ...p, pose: name };
      if (r.length) ringBad.push([name, r.length, Math.max(...r)]);
      assert.equal(p.n, 0, `${id} ${name}: ${p.n} body vertices stick out of the head model between collar and jaw (worst ${p.worst} m at head-frame ${p.at})`);
      assert.equal(r.length, 0, `${id} ${name}: the model's bottom ring leaves the body at ${r.length} points (worst ${Math.max(...r)} m)`);
    }
    const fl = flare(c, spec); assert.equal(fl, 0, `${id}: ${fl} model vertices flare out of the neck envelope between collar and jaw`);
    // negative control: v1.96's skin settings put the old jaw and throat outside the model (the owner's "what is in her neck?")
    H.on(c, false); const cfg = H.cfg, keep = cfg.fold; cfg.fold = V196[id]; c.castHead.skin = null; H.on(c, true);
    DreamPose.reset(c); StoryCast.market.wear?.(c, 'jacket'); DreamPose.civil(c, { t: 1, dt: 1 / 30, dist: 0 }); c.root.updateMatrixWorld(true);
    const old = pokes(c, spec, band);
    H.on(c, false); cfg.fold = keep; c.castHead.skin = null; H.on(c, true);
    assert.ok(old.n > 10 && old.worst > .01, `${id}: the check catches v1.96's poking jaw (${old.n} vertices, worst ${old.worst} m)`);
    report[id] = { poses: checked, band: band.length, ring: ring.length, flare: fl, v196: { pokes: old.n, worst: old.worst } };
  }
  console.log('head seams ok', JSON.stringify(report));
})().catch(e => { console.error(e.message || e); process.exit(1); });
