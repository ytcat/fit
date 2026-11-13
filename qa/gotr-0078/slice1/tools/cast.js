// Close-ups of the cast and the outfits on a neutral backdrop (front, three-quarter, side). Env: WHO=bruno,brick,fighter
// OUTFIT=street|kit, BAG=1, VIEWS=front,34,side,back, ZOOM=head|body, TAG=name prefix.
module.exports = async (p, shot, u) => {
  const STATE = encodeURIComponent(process.env.STATE || '{}');
  const who = (process.env.WHO || 'bruno').split(','), views = (process.env.VIEWS || 'front,34,side').split(','), zoom = process.env.ZOOM || 'body', tag = process.env.TAG || who.join('-');
  await p.waitForFunction(() => window.StoryCast, null, { timeout: 120000 });
  await p.evaluate(() => { const st = document.createElement('style'); st.textContent = '#stageContainer{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483000;margin:0!important;max-height:none!important;border-radius:0!important}#stageContainer>*:not(canvas){display:none!important}'; document.head.append(st); setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300); window.dispatchEvent(new Event('resize')); });
  const info = await p.evaluate(({ who, outfit, bag, state }) => {
    const e = app.engine, t0 = performance.now(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    scene.background = new THREE.Color('#aeb9c6').convertSRGBToLinear();
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x8a7460, .75)); const sun = new THREE.DirectionalLight(0xfff0dc, 1.7); sun.position.set(2.5, 4, 5); scene.add(sun); const rim = new THREE.DirectionalLight(0xbfd4ff, .5); rim.position.set(-3, 3, -4); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8d949e, roughness: .95 })); scene.add(floor);
    const rigs = who.map((id, i) => { const c = id === 'fighter' ? e.coach : id === 'lion' || id === 'rabbit' ? (e.coach.species === id ? e.coach : e.roster.get(id)) : StoryCast.rig(id, e); StoryCast.groom(c); c.root.parent?.remove(c.root); scene.add(c.root); c.root.position.set((i - (who.length - 1) / 2) * 1.1, 0, 0); c.root.rotation.set(0, 0, 0); c.root.visible = true; if (id === 'fighter' && outfit) { StoryCast.outfit(c, outfit); if (bag) StoryCast.bag(c, 'shoulder'); } return c; });
    const built = Math.round(performance.now() - t0);
    const pv = window.__pv = { state: JSON.parse(decodeURIComponent(state)), scene, camera, rigs, yaw: 0, look: [0, 1.1, 0], dist: 6.2, t: 0, pose: window.__pose || null };
    e.fightIQDemo = { frame(dt) {
      pv.t += Math.min(.05, dt || 0); const size = e.renderer.getSize(new THREE.Vector2()); camera.aspect = size.x / size.y; camera.updateProjectionMatrix();
      for (const c of rigs) { if (window.DreamPose && !pv.kit) window.DreamPose.civil(c, { t: pv.t, dt: Math.min(.05, dt || 0), ...(pv.state || {}) }); else c.update(pv.t, 'guard', 'one_two', { simulationTime: pv.t, keepFaceClear: true, ...(pv.kit ? { guardCover: 1 } : { presentation: { mode: 'waiting', raise: 0 } }) }); }
      camera.position.set(pv.look[0] + Math.sin(pv.yaw) * pv.dist, pv.look[1] + pv.dist * .06, pv.look[2] + Math.cos(pv.yaw) * pv.dist); camera.lookAt(pv.look[0], pv.look[1], pv.look[2]);
      e.renderer.render(scene, camera); const r = e.renderer.info.render; pv.stats = { calls: r.calls, triangles: r.triangles };
    } };
    const count = c => { let m = 0, n = 0; c.root.traverse(o => { let v = o.visible, q = o; while (v && q.parent && q !== c.root) { q = q.parent; v = q.visible; } if (o.isMesh && v) { m++; const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { meshes: m, triangles: Math.round(n) }; };
    return { built, rigs: rigs.map(count) };
  }, { who, outfit: process.env.OUTFIT || '', bag: !!process.env.BAG, state: STATE });
  console.log('built ms', info.built, JSON.stringify(info.rigs));
  const box = await p.evaluate(() => { const r = (app.engine.stage || document.getElementById('stageContainer')).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  if (process.env.KIT) await p.evaluate(() => { __pv.kit = true; });
  const yaw = { front: 0, 34: .75, side: Math.PI / 2, back: Math.PI, b34: Math.PI - .75, m34: -.75 };
  for (const v of views) {
    await p.evaluate(({ y, zoom, n }) => { __pv.yaw = y; if (zoom === 'head') { const bk = __pv.rigs[0].character === 'brick'; __pv.look = [0, bk ? 1.9 : 1.92, 0]; __pv.dist = (bk ? 2.9 : 2.0) + (n - 1) * 1.2; } else if (zoom === 'feet') { __pv.look = [0, .35, 0]; __pv.dist = 2.4; } else { __pv.look = [0, 1.08, 0]; __pv.dist = 5.6 + (n - 1) * 1.6; } }, { y: yaw[v], zoom, n: who.length });
    await p.waitForTimeout(2500); await shot(`${tag}-${zoom}-${v}-${u.w}`, box);
  }
  console.log('stats', JSON.stringify(await p.evaluate(() => __pv.stats)));
};
