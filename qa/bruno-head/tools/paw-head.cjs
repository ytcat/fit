// node qa/bruno-head/tools/paw-head.cjs — does a paw (or the towel / whistle) go into Bruno's head model in his films and referee poses?
// For every pose: each paw / towel vertex is tested against the model (nearest model vertex, inside if behind its normal by > 3 mm and
// within 4 cm of the surface). Prints the worst per film and the poses where something is inside.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
process.chdir(path.join(__dirname, '..', '..', '..'));
global.THREE = require(process.cwd() + '/assets/vendor/three.min.js'); global.window = global; global.addEventListener = () => {};
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ getContext: ctx2d }), createElementNS: () => { const l = {}; return { addEventListener: (k, f) => { l[k] = f; }, removeEventListener() {}, set src(v) { setTimeout(() => l.load?.(), 0); } }; } };
global.self = global; vm.runInThisContext(fs.readFileSync('assets/vendor/GLTFLoader.js', 'utf8'));
const RealLoader = THREE.GLTFLoader;
THREE.GLTFLoader = class { load(url, ok, _p, err) { const b = fs.readFileSync(url.replace(/^\.\//, '').split('?')[0]); new RealLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), '', ok, err); } };
for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-pose.js', 'boxing-coach-v2.js', 'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/street-wear.js', 'adventure/story/cast-market.js', 'adventure/story/dream-pose.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const Core = require(process.cwd() + '/adventure/story/dream-core');
const V = (...v) => new THREE.Vector3(...v);
(async () => {
  const data = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')), engine = { roster: { data }, arena: { models: {} } };
  data.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json')); global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
  const c = StoryCast.rig('bruno', engine); await StoryCast.market.heads.bruno.ready(20000);
  let mesh = null; c.joints.head.getObjectByName('Bruno: authored head').traverse(o => { if (o.isMesh) mesh = o; });
  const MP = mesh.geometry.attributes.position, MN = mesh.geometry.attributes.normal, mv = [], mn = [];
  for (let i = 0; i < MP.count; i += 2) { mv.push(V().fromBufferAttribute(MP, i)); mn.push(V().fromBufferAttribute(MN, i)); }
  const parts = []; for (const s of ['L', 'R']) c.joints['hand' + s].traverse(o => { if (o.isMesh && o.geometry.attributes.position) parts.push(['paw ' + s, o]); });
  const tw = c.root.getObjectByName('Bruno: towel and whistle'); parts.push(['towel+whistle', tw]);
  const inv = new THREE.Matrix4(), v = V(), d = V();
  const probe = () => {
    c.root.updateMatrixWorld(true); inv.copy(mesh.matrixWorld).invert(); const W = {};
    for (const [nm, o] of parts) { let worst = W[nm.split(' ')[0]] || { depth: 0 };
      if (!o.visible) continue; const P = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < P.count; i += 3) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); let best = 1e9, k = -1;
        for (let j = 0; j < mv.length; j++) { const q = mv[j], dd = (q.x - v.x) ** 2 + (q.y - v.y) ** 2 + (q.z - v.z) ** 2; if (dd < best) { best = dd; k = j; } }
        if (best > .04 * .04) continue; const depth = -d.copy(v).sub(mv[k]).dot(mn[k]);
        if (depth > .003 && depth > worst.depth) worst = { depth: +depth.toFixed(3), part: nm, at: v.toArray().map(x => +x.toFixed(3)) };
      }
      W[nm.split(' ')[0]] = worst;
    }
    return W;
  };
  if (process.env.CHIN) { // try chin targets: CHIN="x,y,z;x,y,z"
    for (const cand of process.env.CHIN.split(';')) { c.gestureAt.chin = cand.split(',').map(Number); let w = { depth: 0 };
      for (const talk of [0, 1]) for (let k = 0; k < 40; k++) { DreamPose.civil(c, { t: 4 + k / 15, dt: 1 / 15, dist: 0, talk, arms: { L: 'hips', R: 'chin' }, look: { yaw: 0, pitch: 0 } }); const q = probe().paw; if (q?.depth > w.depth) w = q; }
      const hp = V(); c.joints.handR.getWorldPosition(hp); console.log('chin', cand, JSON.stringify(w), 'hand', hp.toArray().map(x => +x.toFixed(3))); }
    return;
  }
  const films = [[Core, ['dream_gym_talk', 'dream_after_brick']], [require(process.cwd() + '/adventure/story/market-core'), ['dream_apology']], [require(process.cwd() + '/adventure/story/docks-core'), ['dream_docks', 'dream_docks_after', 'dream_fight_night', 'dream_chapter_end']], [require(process.cwd() + '/adventure/story/gym-return-core'), ['dream_new_bag', 'dream_offer']]];
  c.root.scale.set(-1, 1, 1);
  for (const [mod, ids] of films) for (const id of ids) {
    const S = mod.scenes[id]; const worst = {}; let n = 0;
    for (let t = 0; t <= S.duration; t += .5) {
      const st = Core.sample(S, t).actors.bruno; if (!st || st.act === 'off') continue;
      for (let k = 0; k < 3; k++) DreamPose.civil(c, { t: t + k / 30, dt: 1 / 30, dist: st.dist, walk: +st.walking, arms: st.arms, lean: st.lean, drop: st.drop, talk: st.talk ? 1 : 0, look: st.look && typeof st.look === 'object' ? st.look : { yaw: 0, pitch: 0 } });
      const w = probe(); n++; for (const k in w) if (w[k].depth > (worst[k]?.depth || 0)) worst[k] = { ...w[k], t };
    }
    console.log(id, n, 'poses; worst inside', JSON.stringify(worst));
  }
  c.root.scale.set(1, 1, 1);
  for (const [nm, st] of [['count', { arms: { L: 'hips', R: 'count' }, reach: { R: [.3, 1.5, .38] }, look: { yaw: 0, pitch: -.45 }, lean: .2 }], ['raise R', { arms: { L: 'hips', R: 'hips' }, reach: { R: { at: [.55, 2.0, .25], w: 1, pole: [1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } } }], ['raise L', { arms: { L: 'hips', R: 'hips' }, reach: { L: { at: [-.55, 2.0, .25], w: 1, pole: [-1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } } }], ['point', { arms: { R: 'point' } }], ['shrug', { arms: { L: 'shrug', R: 'shrug' } }], ['neck', { arms: { R: 'neck' } }],
    ...[0, .25, .5, .75, 1, 1.25].map(ph => { const k = Math.sin(ph * Math.PI * 2 * 1.4 / 1.4 * 1), z = +(process.env.WAVEZ || .22); // adventure/story/gym-fight.js waveOff (w = 1)
      return ['wave-off ' + ph, { arms: { L: 'count', R: 'count' }, reach: { L: [-1 * (.05 - .40 * k), 2.02 + .04 * Math.abs(k), z], R: [1 * (.05 - .40 * k), 2.02 + .04 * Math.abs(k), z] }, lean: .04, look: { yaw: 0, pitch: -.3 } }]; })]) {
    for (let k = 0; k < 20; k++) DreamPose.civil(c, { t: 4 + k / 30, dt: 1 / 30, dist: 0, ...st });
    console.log('pose', nm, JSON.stringify(probe()));
  }
})().catch(e => { console.error(e); process.exit(1); });
