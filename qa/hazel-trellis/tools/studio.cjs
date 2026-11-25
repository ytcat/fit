// studio renders of Fang: node studio.cjs <outDir> <plan.json>
// plan: { size:[w,h], frames:[{ name, head: true|false, wear:'jacket'|'fight', pose: 'stand'|'talk'|'walk'|{move,ph,down,hit}, t, look, cam:{ yaw, pitch?, look:[x,y,z] | 'head', dist, fov } }] }
const { open, save } = require('./serve.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2], plan = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const { p, close } = await open();
  const st = await p.evaluate(w => StoryCast.market.heads[w].ready(20000), plan.who || 'fang');
  console.log('head state', st);
  const res = await p.evaluate(async plan => {
    const e = app.engine, T = THREE, r = e.renderer, [W, H] = plan.size, scene = new T.Scene(), frames = [];
    scene.background = new T.Color('#9fabb9').convertSRGBToLinear();
    scene.add(new T.HemisphereLight(0xe4ecff, 0x7a6450, .8)); const sun = new T.DirectionalLight(0xfff1de, 1.9); sun.position.set(2.2, 4, 4.5); scene.add(sun); const rim = new T.DirectionalLight(0xc6d8ff, .7); rim.position.set(-3, 3, -4); scene.add(rim);
    scene.add(new T.Mesh(new T.CircleGeometry(5, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x858c96, roughness: .95 })));
    const c = StoryCast.rig(plan.who || 'fang', e); scene.add(c.root); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); c.root.visible = true;
    const rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const cam = new T.PerspectiveCamera(30, W / H, .02, 50), buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
    for (const f of plan.frames) {
      StoryCast.market.head.on(c, f.head !== false); StoryCast.market.wear(c, f.wear || 'jacket'); DreamPose.reset(c);
      const P = f.pose || 'stand', t1 = f.t ?? 2;
      for (let k = 0; k <= 40; k++) { const t = t1 - (40 - k) / 30;
        if (P && typeof P === 'object') { const ex = { simulationTime: t, keepFaceClear: true, guardCover: 1, hitReaction: P.hit, down: P.down, presentation: P.down ? { mode: 'loser', raise: 0 } : undefined }; if (P.move === 'guard') c.update(t, 'guard', 'one_two', ex); else c.update(P.ph * 1.22, P.move, 'one_two', { ...ex, power: 1.15, recoil: 0, advance: 0, contactDrive: 0 }); DreamPose.reset(c); }
        else DreamPose.civil(c, { t, dt: 1 / 30, dist: P === 'walk' ? t * 1.25 : 0, walk: P === 'walk' ? 1 : 0, talk: P === 'talk' ? 1 : 0, arms: f.arms || (P === 'talk' ? { R: 'open' } : {}), look: f.look || { yaw: 0, pitch: 0 } });
        if (P === 'talk') StoryCast.talk(c, .9);
        if (P === 'walk') c.root.position.z = 0;
      }
      c.root.updateMatrixWorld(true);
      const C = f.cam, look = C.look === 'head' ? c.joints.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(...(C.off || [0, .1, .05]))) : new T.Vector3(...C.look), d = C.dist, pitch = C.pitch ?? .06;
      cam.fov = C.fov || 30; cam.aspect = W / H; cam.updateProjectionMatrix();
      cam.position.set(look.x + Math.sin(C.yaw) * Math.cos(pitch) * d, look.y + Math.sin(pitch) * d, look.z + Math.cos(C.yaw) * Math.cos(pitch) * d); cam.lookAt(look);
      r.setRenderTarget(rt); r.setClearColor(0, 1); r.clear(); r.info.reset(); r.render(scene, cam); const info = { calls: r.info.render.calls, tris: r.info.render.triangles }; r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0);
      frames.push({ name: f.name, url: cv.toDataURL('image/png'), info });
    }
    StoryCast.market.head.on(c, true); scene.remove(c.root);
    return frames;
  }, plan);
  for (const f of res) { save(path.join(out, f.name + '.png'), f.url); console.log(f.name, JSON.stringify(f.info)); }
  await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
