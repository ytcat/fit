// What is at a pixel of a studio frame? node pick.cjs <plan.json> <frame name> <px> <py> [radius px]
// Poses Bruno as studio.cjs does, then raycasts from the frame's camera through the pixel (and a small ring round it) and prints the
// first object hit (name, material colour or vertex colour at the hit).
const { open } = require('./serve.cjs'), fs = require('fs');
(async () => {
  const [planFile, name, px, py, rad] = process.argv.slice(2), plan = JSON.parse(fs.readFileSync(planFile, 'utf8')), f = plan.frames.find(q => q.name === name);
  const { p, close } = await open();
  await p.evaluate(async () => { StoryCast.rig('bruno', app.engine); await StoryCast.market.heads.bruno.ready(30000); });
  const res = await p.evaluate(({ plan, f, px, py, rad }) => {
    const T = THREE, e = app.engine, [W, H] = plan.size, c = StoryCast.rig('bruno', e), scene = new T.Scene(); scene.add(c.root); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.scale.set(...(f.root || [-1, 1, 1]));
    StoryCast.market.heads.bruno.on(c, f.head !== false); DreamPose.reset(c);
    for (let k = 0; k <= 40; k++) { const t = 2 - (40 - k) / 30; const st = { t, dt: 1 / 30, dist: 0, walk: 0, arms: f.arms || {}, look: f.look || { yaw: 0, pitch: 0 }, lean: f.lean || 0 }; if (f.reach) st.reach = f.reach; DreamPose.civil(c, st); c.updateMane?.(t); }
    c.root.updateMatrixWorld(true);
    const C = f.cam, hp = c.joints.head.getWorldPosition(new T.Vector3()), look = C.look === 'head' ? hp.clone().add(new T.Vector3(...(C.off || [0, .1, .05]))) : C.look === 'neck' ? hp.clone().add(new T.Vector3(...(C.off || [0, -.08, 0]))) : new T.Vector3(...C.look), d = C.dist, pitch = C.pitch ?? .06;
    const cam = new T.PerspectiveCamera(C.fov || 30, W / H, .02, 50); cam.position.set(look.x + Math.sin(C.yaw) * Math.cos(pitch) * d, look.y + Math.sin(pitch) * d, look.z + Math.cos(C.yaw) * Math.cos(pitch) * d); cam.lookAt(look); cam.updateMatrixWorld(true);
    // skinned meshes: raycast against their posed positions (three r128 raycasts skinned meshes with boneTransform)
    const ray = new T.Raycaster(), out = [];
    for (const [dx, dy] of [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]]) {
      ray.setFromCamera(new T.Vector2((px + dx) / W * 2 - 1, 1 - (py + dy) / H * 2), cam);
      const hits = ray.intersectObject(c.root, true).filter(h => h.object.visible && h.object.layers.mask && (!h.object.geometry.drawRange || h.face == null || h.face.a >= (h.object.geometry.drawRange.start || 0)));
      const h = hits[0]; if (!h) { out.push(null); continue; }
      const C2 = h.object.geometry.attributes.color, col = C2 && h.face ? [C2.getX(h.face.a), C2.getY(h.face.a), C2.getZ(h.face.a)].map(v => +v.toFixed(3)) : null;
      const lp = c.root.worldToLocal(h.point.clone());
      out.push({ name: h.object.name, parent: h.object.parent?.name, colour: col, rig: lp.toArray().map(v => +v.toFixed(3)), face: h.face ? h.face.a : null });
    }
    return out;
  }, { plan, f, px: +px, py: +py, rad: +(rad || 3) });
  console.log(JSON.stringify(res, null, 0)); await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
