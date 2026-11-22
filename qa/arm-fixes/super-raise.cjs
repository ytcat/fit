// The winner's hand raise after a Super Punch (ring: the rhino referee; gym: Coach Bruno) and after a plain gym bout,
// measured frame by frame (60 fps) from the start of the ceremony: the referee's grip vs the winner's wrist, per-frame steps
// of both, the winner's wrist turn and where his elbow points; pictures from the game camera and a close-up.
// usage: node qa/arm-fixes/super-raise.cjs <outdir> [case,...]   cases: ring, ring-rabbit, gym, gym-plain
const path = require('path'), fs = require('fs'), { open } = require('./harness.cjs');
const out = process.argv[2] || path.join(__dirname, 'out'), only = (process.argv[3] || 'ring,gym,gym-plain').split(',');
const TIMES = (process.env.TIMES || '0.3,0.9,1.5,2.5,5.0,6.3').split(',').map(Number);
const CASES = {
  ring: [`()=>{__ctx.change({type:'venue',venueId:'championship'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'lion', true],
  'ring-rabbit': [`()=>{__ctx.change({type:'venue',venueId:'championship'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'rabbit', true],
  gym: [`()=>AdventureOldTown.storyFightStart(__ctx,'first_brick')`, 'lion', true],
  'gym-plain': [`()=>AdventureOldTown.storyFightStart(__ctx,'first_brick')`, 'lion', false]
};
fs.mkdirSync(out, { recursive: true });
(async () => {
  const summary = {};
  for (const name of only) {
    const [start, striker, sp] = CASES[name], h = await open('lion'), p = h.page; p.setDefaultTimeout(600000);
    await p.evaluate(() => { if (!app.engine.career.store.current()) app.engine.career.store.create('Ring QA');
      const rg = window.ringfighterGame, e = app.engine; window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } };
      setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene):not(.story-scene)').forEach(d => d.close()), 400);
      window.__tick = () => { e.animTime += 1 / 60; const f = e.arena.update(e.animTime, e.technique, e.currentAnim); e.career?.onFrame?.(f, 1 / 60); e.world?.update?.(e.animTime, e.arena?.mode || 'none'); e.cameraDirector?.update?.(1 / 60); };
      window.__until = async (cond, max = 3000) => { for (let i = 0; i < max; i++) { if (cond()) return true; if (e.cameraDirector?.holdsClock) e.cameraDirector.skipIntro?.(); window.__tick(); if (i % 30 === 29) await new Promise(r => setTimeout(r, 0)); } return cond(); }; });
    await p.evaluate(`(${start})()`); await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 600000 });
    await p.evaluate(() => { app.engine.isPlaying = true; app.engine.speed = 0; if (app.engine.player) app.engine.player.enabled = false; });
    await p.evaluate(() => __until(() => app.engine.arena.fightView.match.phase === 'round' && app.engine.arena.fightView.match.time > 2));
    if (sp) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const done = await p.evaluate(async s => { const v = app.engine.arena.fightView, m = v.match, o = s === 'lion' ? 'rabbit' : 'lion';
          m.finisherOwned = { ...(m.finisherOwned || {}), [s]: ['sunday_punch'] }; m.fighters[o].condition = Math.min(m.fighters[o].condition, 18); m.fighters[s].burst.charge = 1;
          const misses = m.events.filter(x => x.type === 'finisher-miss').length;
          await __until(() => m.fighters[s].action?.finisher || m.requestFinisher(s), 900);
          await __until(() => m.result || m.events.filter(x => x.type === 'finisher-miss').length > misses, 1200); return !!m.result?.finisher; }, striker);
        if (done) break;
      }
    } else await p.evaluate(s => app.engine.arena.fightView.match.finish(s, 'KO', true), striker);
    const ok = await p.evaluate(() => __until(() => app.engine.arena.fightView.match.phase === 'ceremony', 6000));
    if (!ok) { console.log(name, 'no ceremony'); await h.close(); continue; }
    await p.evaluate(([s]) => {
      const e = app.engine, v = e.arena.fightView, R = e.renderer, render = R.render.bind(R); R.render = () => { };
      window.__draw = cam => { render(e.scene, cam); return R.domElement.toDataURL('image/png'); };
      const V = THREE.Vector3, side = s === 'lion' ? 'R' : 'L';
      window.__probe = (prev) => {
        const m = v.match, c = v.coaches[s], j = c.joints, ref = v.referee, wrist = j['hand' + side].getWorldPosition(new V());
        let grip; if (ref.isBruno) { const b = StoryCast.rig('bruno'); grip = ['L', 'R'].map(k => b.joints['hand' + k].getWorldPosition(new V())).sort((a, b2) => a.distanceTo(wrist) - b2.distanceTo(wrist))[0]; }
        else grip = ref.root.localToWorld(ref.arms[s === 'lion' ? -1 : 1].points.wrist.clone());
        const sh = c.root.worldToLocal(j['arm' + side].getWorldPosition(new V())), el = c.root.worldToLocal(j['elbow' + side].getWorldPosition(new V())), ha = c.root.worldToLocal(wrist.clone());
        const u = ha.clone().sub(sh).normalize(), off = el.clone().sub(sh); off.sub(u.clone().multiplyScalar(off.dot(u))); off.normalize();
        const q = j['hand' + side].getWorldQuaternion(new THREE.Quaternion());
        const r = { pt: +m.phaseTime.toFixed(3), hold: !!m.finisherHold?.(), gap: +(grip.distanceTo(wrist) * 100).toFixed(1), gripStep: prev ? +(grip.distanceTo(new V(...prev.g)) * 100).toFixed(2) : 0, wristStep: prev ? +(wrist.distanceTo(new V(...prev.w)) * 100).toFixed(2) : 0,
          wristJump: prev ? +(2 * Math.acos(Math.min(1, Math.abs(q.dot(new THREE.Quaternion(...prev.q))))) * 57.3).toFixed(2) : 0, elbow: { out: +(off.x * (side === 'R' ? 1 : -1)).toFixed(2), back: +(-off.z).toFixed(2), down: +(-off.y).toFixed(2) }, up: +(ha.y - sh.y).toFixed(2),
          g: grip.toArray(), w: wrist.toArray(), q: q.toArray() };
        return r;
      };
      window.__close = () => { const c = v.coaches[s], sh = c.joints['arm' + side].getWorldPosition(new V()), ref = v.referee.root.getWorldPosition(new V()), toCam = e.camera.position.clone().sub(sh).setY(0).normalize(), toRef = ref.clone().sub(c.root.getWorldPosition(new V())).setY(0).normalize();
        const cam = window.__cam || (window.__cam = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, .05, 60)); cam.position.copy(sh).addScaledVector(toCam, 2.3).addScaledVector(toRef, .45).add(new V(0, .05, 0)); cam.lookAt(sh.x, sh.y + .2, sh.z); cam.updateProjectionMatrix(); return __draw(cam); };
    }, [striker]);
    const rows = []; let prev = null; const shots = TIMES.slice();
    for (let n = 0; n < 60 * 7.5; n++) {
      const r = await p.evaluate(pr => { __tick(); return __probe(pr); }, prev); rows.push(r); prev = r;
      if (shots.length && r.pt >= shots[0]) { const t = shots.shift(), tag = `${name}-${t.toFixed(2)}`;
        const save = (f, url) => fs.writeFileSync(path.join(out, f), Buffer.from(url.split(',')[1], 'base64'));
        save(`${tag}-phone.png`, await p.evaluate(() => __draw(app.engine.camera))); save(`${tag}-close.png`, await p.evaluate(() => __close())); }
    }
    const held = rows.filter(r => r.pt > .55 && r.pt < 5.4), mx = (a, f) => Math.max(...a.map(f));
    summary[name] = { frames: rows.length, gapHeldMax: mx(held, r => r.gap), gripStepMax: mx(rows.slice(1), r => r.gripStep), wristStepMax: mx(rows.slice(1), r => r.wristStep), wristJumpMax: mx(rows.slice(1), r => r.wristJump), elbowAtTop: held[held.length - 1]?.elbow, elbowBackMax: mx(held, r => r.elbow.back), upAtTop: held[held.length - 1]?.up, errors: h.errors };
    console.log(name, JSON.stringify(summary[name]));
    fs.writeFileSync(path.join(out, `${name}-rows.json`), JSON.stringify(rows.map(({ g, w, q, ...r }) => r)));
    await h.close();
  }
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
