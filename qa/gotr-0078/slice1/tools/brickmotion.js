// GOTR-0082 face dynamics: Brick's head in motion (idle, guard frown, jab with the jowls swinging, a hit with the ripple,
// talking). The rig is stepped at 60 Hz in page time, so the springs run as in the game. Env: TAG, VIEW (yaw radians).
module.exports = async (p, shot, u) => {
  const tag = process.env.TAG || 'motion';
  await p.waitForFunction(() => window.StoryCast, null, { timeout: 120000 });
  await p.evaluate(() => { const st = document.createElement('style'); st.textContent = '#stageContainer{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483000;margin:0!important;max-height:none!important;border-radius:0!important}#stageContainer>*:not(canvas){display:none!important}'; document.head.append(st); setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300); window.dispatchEvent(new Event('resize')); });
  await p.evaluate(yaw => {
    const e = app.engine, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    scene.background = new THREE.Color('#aeb9c6').convertSRGBToLinear();
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x8a7460, .75)); const sun = new THREE.DirectionalLight(0xfff0dc, 1.7); sun.position.set(2.5, 4, 5); scene.add(sun); const rim = new THREE.DirectionalLight(0xbfd4ff, .5); rim.position.set(-3, 3, -4); scene.add(rim);
    const c = StoryCast.rig('brick', e); c.root.parent?.remove(c.root); scene.add(c.root); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.visible = true;
    const pv = window.__pv = { c, t: 0, yaw };
    pv.step = (to, move, opt = {}) => { while (pv.t < to) { pv.t += 1 / 60; const o = typeof opt === 'function' ? opt(pv.t) : opt; if (o.talk != null) DreamPose.civil(c, { t: pv.t, dt: 1 / 60, talk: o.talk }); else c.update(pv.t, move, 'one_two', { simulationTime: pv.t, ...o }); } };
    e.fightIQDemo = { frame() {
      const size = e.renderer.getSize(new THREE.Vector2()); camera.aspect = size.x / size.y; camera.updateProjectionMatrix();
      const h = new THREE.Vector3(); c.joints.head.getWorldPosition(h); h.y -= .05;
      camera.position.set(h.x + Math.sin(pv.yaw) * 3.1, h.y + .2, h.z + Math.cos(pv.yaw) * 3.1); camera.lookAt(h); e.renderer.render(scene, camera);
    } };
  }, +(process.env.VIEW || .55));
  const box = await p.evaluate(() => { const r = document.getElementById('stageContainer').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const frames = [
    ['1-idle', 'p.step(3, "guard", { presentation: { mode: "waiting", raise: 0 } })'],
    ['2-guard-frown', 'p.step(5, "guard", { guardCover: 1 })'],
    ['3-jab-out', 'p.step(5.45, "jab", { power: 1.2 })'],
    ['4-jab-back', 'p.step(5.75, "jab", { power: 1.2 })'],
    ['5-hit', 'p.step(7.12, "guard", t => ({ guardCover: 1, hitReaction: { amount: t > 7 ? Math.max(0, 1 - (t - 7) * 1.4) : 0, part: "head", side: 1 } }))'],
    ['6-hit-ripple', 'p.step(7.3, "guard", t => ({ guardCover: 1, hitReaction: { amount: t > 7 ? Math.max(0, 1 - (t - 7) * 1.4) : 0, part: "head", side: 1 } }))'],
    ['7-talk', 'p.step(9.05, null, { talk: 1 })'],
    ['8-talk-open', 'p.step(9.4, null, { talk: 1 }); StoryCast.talk(p.c, 1)']];
  for (const [name, code] of frames) {
    await p.evaluate(code => { const p = window.__pv; eval(code); }, code);
    const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 120000 });
    await shot(`${tag}-${name}`, box);
    console.log(name, JSON.stringify(await p.evaluate(() => { const f = __pv.c.castFace; return { jowl: f.U.uJowl.value.toArray().map(v => +v.toFixed(4)), brow: +f.brow.toFixed(2), ripple: +f.U.uRipple.value.toFixed(4), jaw: +__pv.c.castTalk.hinge.rotation.x.toFixed(2) }; })));
  }
};
