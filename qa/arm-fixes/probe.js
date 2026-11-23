/* Browser-side measurements for qa/arm-fixes (loaded with page.addScriptTag). window.__armQA:
 *   step(dt)                       advance the taken-over film by dt (DreamScenes.debug frame)
 *   view(target, yawDeg, dist, h, fov) render the film's scene from a QA camera round a rig (yaw 0 = in front of it, 90 = its right side)
 *   carry()                        one Otto-shop sample: hand-to-bag contact, wrist / shoulder jumps, elbow direction, penetration
 *   limb(c, side)                  joints of one arm in world and rig space
 * Rig space: +z forward, +y up, the side called R at +x (DreamPose). The roots are mirrored (scale.x -1); worldToLocal undoes it. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), deg = r => r * 180 / Math.PI;
  const prev = new Map();
  function step(dt = 1 / 60, draw = false) { const R = app.engine.renderer, o = R.render; if (!draw) R.render = () => { }; try { window.__qaFrame(dt); } finally { R.render = o; } }
  function seek(t) { const r = DreamScenes.debug; r.seek(t); r.ack = 999; prev.clear(); }
  function filmView() { const r = DreamScenes.debug; app.engine.renderer.render(r.scene, r.camera); }
  function view(c, yawDeg = 0, dist = 2.6, h = 1.35, fov = 34, lookY = h) {
    const r = DreamScenes.debug, cam = r.camera, root = c.root, p = root.getWorldPosition(V());
    const fwd = V(0, 0, 1).applyQuaternion(root.quaternion).setY(0).normalize();
    const sR = c.joints.armR.getWorldPosition(V()), sL = c.joints.armL.getWorldPosition(V()), side = sR.sub(sL).setY(0).normalize();
    const a = yawDeg * Math.PI / 180, dir = fwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
    cam.position.copy(p).addScaledVector(dir, dist).setY(h); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(p.x, lookY, p.z);
    r.rigs && Object.values(r.rigs).forEach(q => { q.root.visible = q === c; }); // only him: nobody stands in the QA view
    app.engine.renderer.render(r.scene, cam);
  }
  function limb(c, side = 'R') {
    const j = c.joints, root = c.root; root.updateMatrixWorld(true);
    const w = n => j[n + side].getWorldPosition(V()), l = p => root.worldToLocal(p.clone());
    const sh = w('arm'), el = w('elbow'), ha = w('hand');
    return { sh, el, ha, shL: l(sh), elL: l(el), haL: l(ha), chestL: l(j.chest.getWorldPosition(V())) };
  }
  // signed distance to the bag's leather (capped cylinder, bag-local: origin at its middle, axis y)
  function bagSDF(bag, B, wp, inv) {
    const p = wp.clone().applyMatrix4(inv), dx = Math.hypot(p.x, p.z) - B.r, dy = Math.abs(p.y) - B.h;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  }
  const skinCache = new WeakMap();
  function bodyPoints(c) {
    // skinned vertices of the body and the street clothes (every 3rd), split into the R arm and the rest
    const meshes = [c.skin, ...c.root.children.filter(o => o.userData?.streetCloth && o.visible)].filter(m => m && m.isSkinnedMesh);
    const armR = new Set(['armR', 'elbowR', 'handR']), out = { arm: [], body: [] }, v = V();
    for (const m of meshes) {
      let idx = skinCache.get(m); const g = m.geometry, I = g.attributes.skinIndex, W = g.attributes.skinWeight, P = g.attributes.position;
      if (!idx) { idx = { arm: [], body: [] }; for (let i = 0; i < P.count; i += 3) { let dom = 0; for (let k = 1; k < 4; k++) if (W.array[i * 4 + k] > W.array[i * 4 + dom]) dom = k; const b = m.skeleton.bones[I.array[i * 4 + dom]]; if (armR.has(b?.name)) { idx.arm.push(i); (idx.bone || (idx.bone = [])).push(b.name); } else idx.body.push(i); } skinCache.set(m, idx); }
      m.updateMatrixWorld(true); m.skeleton.update();
      for (const key of ['arm', 'body']) for (const i of idx[key]) { v.fromBufferAttribute(P, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld); out[key].push(v.clone()); } (out.bone || (out.bone = [])).push(...(idx.bone || []));
    }
    return out;
  }
  function pawPoints(c, side = 'R') {
    const pts = [], v = V(); c.joints['hand' + side].updateWorldMatrix(true, true);
    c.joints['hand' + side].traverse(o => { if (!o.isMesh || !o.visible) return; let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) vis = false; if (!vis) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i += 2) pts.push(v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).clone()); });
    return pts;
  }
  function jump(key, q) { const p = prev.get(key); prev.set(key, q.clone()); return p ? deg(2 * Math.acos(Math.min(1, Math.abs(p.dot(q))))) : 0; }
  /** twist of the upper arm about its own axis since the last sample (deg) */
  function twist(key, q, axisLocal) {
    const p = prev.get(key); prev.set(key, q.clone()); if (!p) return 0;
    const d = q.clone().multiply(p.clone().invert()), ax = axisLocal.clone().applyQuaternion(q).normalize(), r = V(d.x, d.y, d.z), proj = ax.multiplyScalar(r.dot(ax));
    const t = new THREE.Quaternion(proj.x, proj.y, proj.z, d.w).normalize(); return deg(2 * Math.acos(Math.min(1, Math.abs(t.w))));
  }
  function carry(opts = {}) {
    const r = DreamScenes.debug, c = r.rigs.fighter, bag = r.scene.getObjectByName('New heavy bag'), B = window.BagBreakCore.BAG, j = c.joints;
    const L = limb(c, 'R'), out = { t: +r.t.toFixed(3) };
    // elbow: where it points from the shoulder-hand line, in rig space (+x = out to his right, -z = behind him)
    const a = L.shL, b = L.haL, e = L.elL, ab = b.clone().sub(a), u = ab.clone().normalize(), off = e.clone().sub(a).sub(u.clone().multiplyScalar(e.clone().sub(a).dot(u)));
    const offN = off.length() > 1e-4 ? off.clone().normalize() : V();
    out.elbow = { out: +offN.x.toFixed(2), back: +(-offN.z).toFixed(2), down: +(-offN.y).toFixed(2), z: +(e.z - L.chestL.z).toFixed(3), x: +e.x.toFixed(3), y: +e.y.toFixed(3), bend: +deg(Math.PI - e.clone().sub(a).angleTo(b.clone().sub(e))).toFixed(1) };
    out.hand = L.haL.toArray().map(v => +v.toFixed(3));
    out.wristJump = +jump('handR', j.handR.getWorldQuaternion(new THREE.Quaternion())).toFixed(2);
    out.handStep = prev.has('handP') ? +(L.ha.distanceTo(prev.get('handP')) * 100).toFixed(2) : 0; prev.set('handP', L.ha.clone()); // cm per sample (world)
    out.shoulderTwist = +twist('armR', j.armR.getWorldQuaternion(new THREE.Quaternion()), j.elbowR.position.clone()).toFixed(2);
    out.shoulderJump = +jump('armRq', j.armR.getWorldQuaternion(new THREE.Quaternion())).toFixed(2);
    if (bag && bag.visible) {
      bag.updateMatrixWorld(true); const inv = bag.matrixWorld.clone().invert(), bp = bag.getWorldPosition(V());
      out.bagStep = prev.has('bagP') ? +(bp.distanceTo(prev.get('bagP')) * 100).toFixed(2) : 0; prev.set('bagP', bp.clone());
      out.bagTilt = +deg(V(0, 1, 0).applyQuaternion(bag.getWorldQuaternion(new THREE.Quaternion())).angleTo(V(0, 1, 0))).toFixed(1);
      const paw = pawPoints(c, 'R'); let pmin = 1e9; for (const p of paw) pmin = Math.min(pmin, bagSDF(bag, B, p, inv));
      out.pawGap = +(pmin * 100).toFixed(1); // cm: + = gap between the paw and the leather, - = the paw inside the bag
      const pawL = pawPoints(c, 'L'); let lmin = 1e9; for (const p of pawL) lmin = Math.min(lmin, bagSDF(bag, B, p, inv)); out.pawGapL = +(lmin * 100).toFixed(1);
      if (opts.body) {
        const pts = bodyPoints(c); let bmin = 1e9, amin = 1e9, bin = 0, ain = 0;
        for (const p of pts.body) { const d = bagSDF(bag, B, p, inv); bmin = Math.min(bmin, d); if (d < -.01) bin++; }
        const per = {}; pts.arm.forEach((p, n) => { const d = bagSDF(bag, B, p, inv), k = pts.bone[n]; amin = Math.min(amin, d); if (d < -.01) ain++; per[k] = Math.min(per[k] ?? 9, d); });
        out.body = { min: +(bmin * 100).toFixed(1), inside: bin, armMin: +(amin * 100).toFixed(1), armInside: ain, perBone: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, +(v * 100).toFixed(1)])) };
      }
      out.bag = { pos: c.root.worldToLocal(bp.clone()).toArray().map(v => +v.toFixed(3)) };
    } else out.bagVisible = false;
    return out;
  }
  window.__armQA = { step, seek, filmView, view, limb, carry, bagSDF, bodyPoints, pawPoints, jump, twist, prev };
})();
