// The ring result ceremony in the real app: the referee picks up the winner's wrist, lifts it, holds it and lets go.
// usage: node qa/arm-fixes/raise-browser.cjs <winner lion|rabbit> <outdir> [venue]
// Pictures at TIMES (ceremony seconds): the game's own camera with the page UI (phone framing, 402x690) and a close-up of
// the raised arm and the referee's grip (canvas only). The engine loop is paused (it no longer draws); the bout is stepped
// at 60 fps.
const path = require('path'), fs = require('fs'), { open } = require('./harness.cjs');
const winner = process.argv[2] || 'lion', out = process.argv[3] || path.join(__dirname, 'out'), venue = process.argv[4] || '';
const TIMES = (process.env.TIMES || '0.25,0.5,0.9,1.2,1.5,2.1,4.0,5.7,6.4').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const h = await open(process.env.PLAYER || 'lion'), p = h.page;
  await p.evaluate(async ([win, venue]) => {
    const e = app.engine; try { StoryScenes.stop(); } catch { } try { AdventureOldTown.leave?.(); } catch { }
    ringfighterGame.startFight({ seed: 9, rounds: 1, roundSeconds: 20, restSeconds: 0, ...(venue ? { venueId: venue } : {}) }); await new Promise(r => setTimeout(r, 4000));
    const v = e.arena.fightView, m = v.match; e.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5);
    for (let i = 0; i < 20; i++) e.arena.update(e.animTime += .05, e.technique, e.currentAnim);
    m.finish(win, 'TKO', true); e.isPlaying = false;
    const R = e.renderer, render = R.render.bind(R); R.render = () => { }; // the engine loop no longer draws: only the QA cameras do
    const draw = cam => { render(e.scene, cam); return R.domElement.toDataURL('image/png'); };
    window.__step = until => { let n = 0; while (!(m.phase === 'ceremony' && m.phaseTime >= until) && n++ < 4000) { e.arena.update(e.animTime += 1 / 60, e.technique, e.currentAnim); e.cameraDirector?.update?.(1 / 60); } return m.phaseTime; };
    window.__close = () => {
      const c = v.coaches[win], side = win === 'lion' ? 'R' : 'L', sh = c.joints['arm' + side].getWorldPosition(new THREE.Vector3()), ref = v.referee.root.getWorldPosition(new THREE.Vector3());
      const toCam = e.camera.position.clone().sub(sh).setY(0).normalize(), toRef = ref.clone().sub(c.root.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
      const cam = window.__cam || (window.__cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .05, 60));
      cam.position.copy(sh).addScaledVector(toCam, 1.9).addScaledVector(toRef, .55).add(new THREE.Vector3(0, .1, 0)); cam.lookAt(sh.x, sh.y + .3, sh.z); cam.updateProjectionMatrix();
      return draw(cam);
    };
    window.__phone = () => draw(e.camera);
  }, [winner, venue]);
  const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  for (const t of TIMES) {
    const pt = await p.evaluate(t => __step(t), t), tag = `${venue || 'ring'}-${winner}`;
    await p.evaluate(() => __phone()); await p.screenshot({ path: path.join(out, `${tag}-phone-${t.toFixed(2)}.png`) }); // with the page UI
    save(path.join(out, `${tag}-close-${t.toFixed(2)}.png`), await p.evaluate(() => __close()));
    console.log('shot', t, pt.toFixed(2));
  }
  if (h.errors.length) console.log('errors', h.errors);
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
