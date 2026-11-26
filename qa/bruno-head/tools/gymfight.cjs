// Bruno as the referee of a gym-ring fight (adventure/story/gym-fight.js), in the real game at 402x690: node gymfight.cjs <outDir>
// env BEFORE=1: the head GLB answers 404 (the code head). Saves the game view in the round, then the referee's own poses driven
// through view.referee.update (the count over a fallen fighter, the winner's wrist held high), each as a whole-figure view and a
// close-up of the head-neck-collar join from the front 3/4 and from below (camera at chest height looking up).
const { open } = require('./serve.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const OUT = process.argv[2], tag = process.env.BEFORE ? 'before' : 'after'; fs.mkdirSync(OUT, { recursive: true });
  const { p, close } = await open({ block: process.env.BEFORE ? ['bruno-head.glb'] : null });
  await p.evaluate(() => { const s = app.engine.career.store; if (!s.current()) s.create('QA'); setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300); });
  await p.evaluate(() => { const e = app.engine; e.career.store.gameAction({ type: 'venue', venueId: 'default' }); e.fightOptions = { seed: 74 }; ringfighterGame.startFight({ preset: 'quick', rounds: 2, roundSeconds: 30, restSeconds: 8, place: 'gym_ring', watch: true }); });
  await p.waitForFunction(() => app.engine.arena?.fightView?.referee?.isBruno && app.engine.arena.fightView.match?.phase === 'round', null, { timeout: 240000 });
  const st = await p.evaluate(async () => { const t0 = performance.now(); while (window.Paws && Paws._pending() && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 150)); return StoryCast.market.heads.bruno.ready(20000); });
  console.log('head file', st);
  await new Promise(r => setTimeout(r, 3000));
  await p.screenshot({ path: path.join(OUT, `gym-${tag}-round.png`) });
  const shots = await p.evaluate(async () => {
    const e = app.engine, T = THREE, r = e.renderer, v = e.arena.fightView, ref = v.referee, b = StoryCast.rig('bruno', e), out = [];
    const W = 402, H = 690, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(W * H * 4);
    const grab = (cam, w = W, h = H) => { const t2 = new T.WebGLRenderTarget(w, h, { samples: 4 }); t2.texture.encoding = T.sRGBEncoding; const bb = new Uint8Array(w * h * 4); r.setRenderTarget(t2); r.render(e.scene, cam); r.readRenderTargetPixels(t2, 0, 0, w, h, bb); r.setRenderTarget(null); t2.dispose();
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d'), img = cx.createImageData(w, h); for (let y = 0; y < h; y++) img.data.set(bb.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); cx.putImageData(img, 0, 0); return cv.toDataURL('image/png'); };
    const views = (name) => {
      b.root.updateMatrixWorld(true); const hp = b.joints.head.getWorldPosition(new T.Vector3()), fwd = new T.Vector3(0, 0, 1).applyQuaternion(b.root.getWorldQuaternion(new T.Quaternion())).setY(0).normalize(), side = new T.Vector3(-fwd.z, 0, fwd.x);
      const cam = new T.PerspectiveCamera(30, W / H, .03, 80);
      cam.position.copy(hp).addScaledVector(fwd, 5.2).addScaledVector(side, 1.6).add(new T.Vector3(0, -.6, 0)); cam.lookAt(hp.x, hp.y - .75, hp.z); out.push([name + '-body', grab(cam)]);
      const c2 = new T.PerspectiveCamera(30, 1, .03, 80); const n = hp.clone().add(new T.Vector3(0, -.08, 0));
      c2.position.copy(n).addScaledVector(fwd, 1.0).addScaledVector(side, .7).add(new T.Vector3(0, .05, 0)); c2.lookAt(n); out.push([name + '-neck-q34', grab(c2, 300, 300)]);
      c2.position.copy(n).addScaledVector(fwd, .75).addScaledVector(side, .2).add(new T.Vector3(0, -.55, 0)); c2.lookAt(n); out.push([name + '-neck-below', grab(c2, 300, 300)]);
      c2.position.copy(n).addScaledVector(fwd, -1.0).addScaledVector(side, -.5).add(new T.Vector3(0, .1, 0)); c2.lookAt(n); out.push([name + '-neck-back', grab(c2, 300, 300)]);
    };
    views('stand');
    // the count: the match reads as a knockdown of the Opponent for the referee's update (restored right after)
    const m = v.match, keep = { phase: m.phase, downActor: m.downActor };
    m.phase = 'count'; m.downActor = 'rabbit';
    for (let k = 0; k < 60; k++) ref.update(100 + k / 30, null, 1, {});
    views('count');
    m.phase = keep.phase; m.downActor = keep.downActor;
    // the winner's wrist held high (the ceremony): grip = the Fighter's right hand raised
    const wrist = v.coaches.lion.joints.handR.getWorldPosition(new T.Vector3()); const g = wrist.clone(); g.y = Math.max(g.y, 2.05);
    for (let k = 0; k < 40; k++) ref.update(200 + k / 30, g, 1, { hold: Math.min(1, k / 20) });
    views('raise');
    rt.dispose(); return out;
  });
  for (const [n, url] of shots) fs.writeFileSync(path.join(OUT, `gym-${tag}-${n}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log('shots', shots.length, 'head on', await p.evaluate(() => !!StoryCast.rig('bruno', app.engine).castHead?.on));
  await close();
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
