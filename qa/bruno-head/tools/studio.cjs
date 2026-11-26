// Studio renders of Coach Bruno in the real game renderer (Chromium/SwiftShader): node studio.cjs <outDir> <plan.json>
// plan: { who: 'bruno', size: [w, h], frames: [{ name, head: true|false, pose: 'stand'|'talk'|'walk'|'point'|'count'|'raise'|'hips'|'carry',
//         t, look, cam: { yaw, pitch?, look: [x,y,z] | 'head' | 'neck', off?, dist, fov } }] }
// head false = the code head (before); true = the authored model (after). Root mirrored (-1, 1, 1) like the films.
const { open, save } = require('./serve.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2], plan = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), who = plan.who || 'bruno';
  // env HEAD_FILE=<glb>: that file served as the head (an earlier build, for before/after rows)
  const { p, close } = await open({ alias: process.env.HEAD_FILE ? { [who + '-head.glb']: path.resolve(process.env.HEAD_FILE) } : null });
  const st = await p.evaluate(async w => { StoryCast.rig(w, app.engine); const t0 = performance.now(); let s; do { s = await StoryCast.market.heads[w].ready(20000); } while (s !== 'ready' && performance.now() - t0 < 120000); return s; }, who);
  if (st !== 'ready') throw Error('head not loaded: ' + st);
  console.log('head state', st);
  const res = await p.evaluate(async ({ plan, who }) => {
    const e = app.engine, T = THREE, r = e.renderer, [W, H] = plan.size, scene = new T.Scene(), frames = [];
    scene.background = new T.Color('#9fabb9').convertSRGBToLinear();
    scene.add(new T.HemisphereLight(0xe4ecff, 0x7a6450, .8)); const sun = new T.DirectionalLight(0xfff1de, 1.9); sun.position.set(2.2, 4, 4.5); scene.add(sun); const rim = new T.DirectionalLight(0xc6d8ff, .7); rim.position.set(-3, 3, -4); scene.add(rim);
    scene.add(new T.Mesh(new T.CircleGeometry(5, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x858c96, roughness: .95 })));
    const c = StoryCast.rig(who, e), H0 = StoryCast.market.heads[who]; scene.add(c.root); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); c.root.visible = true;
    const rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const cam = new T.PerspectiveCamera(30, W / H, .02, 50), buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
    const ARMS = { stand: {}, talk: { R: 'open' }, walk: {}, point: { R: 'point' }, hips: { L: 'hips', R: 'hips' }, count: { L: 'hips', R: 'count' }, raise: { L: 'hang', R: 'raise' }, carry: { R: 'carry' }, shrug: { L: 'shrug', R: 'shrug' } };
    for (const f of plan.frames) {
      H0.on(c, f.head !== false); DreamPose.reset(c);
      const P = f.pose || 'stand', t1 = f.t ?? 2;
      for (let k = 0; k <= 40; k++) { const t = t1 - (40 - k) / 30;
        const st = { t, dt: 1 / 30, dist: P === 'walk' ? t * 1.25 : 0, walk: P === 'walk' ? 1 : 0, talk: P === 'talk' ? 1 : 0, arms: f.arms || ARMS[P] || {}, look: f.look || { yaw: 0, pitch: 0 }, lean: f.lean || 0 }; if (f.reach) st.reach = f.reach; c.root.scale.set(...(f.root || [-1, 1, 1]));
        if (P === 'count') { const beat = t % 1; st.reach = { R: [.3, 1.6 - .24 * Math.min(1, beat * 4) * (1 - Math.min(1, Math.max(0, beat - .25) * 3)), .38] }; st.look = { yaw: 0, pitch: -.45 }; st.lean = .2; }
        if (P === 'raise') { st.arms = { L: 'hips', R: 'hips' }; st.reach = { R: { at: [.55, 2.0, .25], w: 1, pole: [1, -.3, -.2], palm: [0, 0, 1], turn: .5, paw: 'grip' } }; } // the winner's wrist held high beside him (gym-fight.js ceremony)
        DreamPose.civil(c, st);
        if (P === 'talk') StoryCast.talk(c, .9);
        if (P === 'walk') c.root.position.z = 0;
        c.updateMane?.(t);
      }
      c.root.updateMatrixWorld(true);
      const C = f.cam, hp = c.joints.head.getWorldPosition(new T.Vector3());
      const look = C.look === 'head' ? hp.clone().add(new T.Vector3(...(C.off || [0, .1, .05]))) : C.look === 'neck' ? hp.clone().add(new T.Vector3(...(C.off || [0, -.08, 0]))) : new T.Vector3(...C.look), d = C.dist, pitch = C.pitch ?? .06;
      cam.fov = C.fov || 30; cam.aspect = W / H; cam.updateProjectionMatrix();
      cam.position.set(look.x + Math.sin(C.yaw) * Math.cos(pitch) * d, look.y + Math.sin(pitch) * d, look.z + Math.cos(C.yaw) * Math.cos(pitch) * d); cam.lookAt(look);
      r.setRenderTarget(rt); r.setClearColor(0, 1); r.clear(); r.info.reset(); r.render(scene, cam); const info = { calls: r.info.render.calls, tris: r.info.render.triangles }; r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0);
      frames.push({ name: f.name, url: cv.toDataURL('image/png'), info });
    }
    H0.on(c, true); scene.remove(c.root);
    return frames;
  }, { plan, who });
  for (const f of res) { save(path.join(out, f.name + '.png'), f.url); console.log(f.name, JSON.stringify(f.info)); }
  await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
