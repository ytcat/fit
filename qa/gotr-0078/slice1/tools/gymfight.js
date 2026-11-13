// GOTR-0083: the first fight vs Brick through the game's own flow (fresh profile, AdventureOldTown.launch 'first_brick'),
// on the gym floor with Bruno as referee. Shots: guard, Brick punching, a knockdown with Bruno counting, the result.
// Env: TAG (file prefix), SPEED (game speed while waiting, default 6). The intro is skipped with the game's own skip.
module.exports = async (p, shot, u) => {
  const tag = process.env.TAG || 'gym', speed = +(process.env.SPEED || 6), wait = (f, a, t = 280000) => p.waitForFunction(f, a, { timeout: t });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('gotr.adv.nointro', '1'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.engine.career.store.create('QA Gym'); });
  await p.reload({ timeout: 300000 }); await wait(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown && window.StoryCast && window.StoryGymFight);
  await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene):not(.story-scene)').forEach(d => d.close()), 400); const rg = window.ringfighterGame; window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } }; });
  const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await wait(a => app.engine.renderer.info.render.frame >= a[0] + a[1], [n0, n]); };
  const info = () => p.evaluate(() => { const v = app.engine.arena.fightView, m = v?.match, b = v?.coaches?.lion, k = v?.coaches?.rabbit; const xz = c => c ? [+c.root.position.x.toFixed(2), +c.root.position.z.toFixed(2)] : null;
    return { phase: m?.phase, time: +(m?.time || 0).toFixed(1), result: m?.result ? { winner: m.result.winner, method: m.result.method } : null, opponent: k?.character, gym: !!v?.gymFight, set: !!v?.gymFight?.set, ref: v?.referee?.isBruno ? 'bruno' : 'rhino', ring: v?.ring?.visible, crowd: v?.audience?.root?.visible, stands: app.engine.world?.arena?.visible, fighter: xz(b), brick: xz(k), bruno: v?.referee?.root ? xz({ root: v.referee.root }) : null }; });
  await p.evaluate(() => { const ao = StoryCast.asOpponent; StoryCast.asOpponent = (...a) => { const restore = ao(...a); return () => window.__held ? window.__held.push(restore) : restore(); }; AdventureOldTown.launch(window.__ctx, 'first_brick'); }); // (capture only: Brick stays until the result picture is taken)
  await p.waitForTimeout(1500); await p.evaluate(() => { const b = document.querySelector('#sfBeat .sf-beat-main'); if (b) b.click(); });
  await wait(() => app.engine.targetMode === 'fight' && app.engine.arena?.fightView?.match);
  console.log('start', JSON.stringify(await info()));
  await p.evaluate(s => { app.engine.cameraDirector?.skipIntro?.(); app.engine.speed = s; }, speed);
  await wait(() => app.engine.arena.fightView.match.phase === 'round' && app.engine.arena.fightView.gymFight?.set);
  await p.evaluate(() => { app.engine.speed = 1; }); await frames(3); console.log('guard', JSON.stringify(await info())); await shot(`${tag}-1-guard-${u.w}`);
  await p.evaluate(s => { app.engine.speed = s; }, speed);
  await wait(() => { const v = app.engine.arena.fightView, s = v.specs?.rabbit; return s?.attack && s.phase > .3 && s.phase < .6; }, null, 240000).catch(() => console.log('no Brick punch seen'));
  await p.evaluate(() => { app.engine.speed = 1; }); await frames(2); console.log('punch', JSON.stringify(await info())); await shot(`${tag}-2-punch-${u.w}`);
  // a knockdown of the Fighter: the match's own path (pendingDown -> count), Bruno counts over him
  await p.evaluate(s => { const m = app.engine.arena.fightView.match, f = m.fighters.lion; f.stun = 30; f.pendingDown = true; app.engine.speed = s; }, speed);
  await wait(() => app.engine.arena.fightView.match.phase === 'count'); await p.evaluate(() => { app.engine.speed = 1; });
  await wait(() => app.engine.arena.fightView.match.phaseTime > 1.6, null, 200000).catch(() => {}); await frames(2);
  console.log('count', JSON.stringify(await info())); await shot(`${tag}-3-count-${u.w}`);
  // the stoppage: condition too low to go on after the count -> TKO for Brick; Bruno raises the winner's arm
  await p.evaluate(s => { const m = app.engine.arena.fightView.match; m.fighters.lion.condition = 4; app.engine.speed = s; }, speed);
  // headless frames take seconds: the after-fight scene is held back until the picture of the raised arm is taken (capture only)
  await p.evaluate(() => { const S = window.StoryScenes, play = S.play; window.__held = []; S.play = (...a) => { window.__held.push(() => { S.play = play; play.apply(S, a); }); return true; }; });
  if (process.env.TRACE) await p.evaluate(() => { const t0 = performance.now(); window.__trace = []; setInterval(() => { const v = app.engine.arena.fightView, m = v?.match; window.__trace.push([Math.round(performance.now() - t0), m?.phase, +(m?.phaseTime || 0).toFixed(2), window.StoryScenes?.playing || '', app.engine.targetMode]); }, 250); });
  await p.waitForFunction(() => { const m = app.engine.arena.fightView?.match; if (m?.phase === 'ceremony') { app.engine.speed = 22; return true; } }, null, { timeout: 280000, polling: 50 }).catch(() => console.log('no ceremony'));
  await p.waitForFunction(() => { const m = app.engine.arena.fightView?.match; if (!m || m.phaseTime > 2.2) { app.engine.speed = 0; return true; } }, null, { timeout: 280000, polling: 30 }).catch(() => console.log('arm not up in time')); await frames(2);
  console.log('ceremony time', await p.evaluate(() => app.engine.arena.fightView?.match.phaseTime));
  console.log('result', JSON.stringify(await info())); await shot(`${tag}-4-result-${u.w}`);
  console.log('story goes on', await p.evaluate(() => { const h = window.__held || []; window.__held = null; for (const f of h) f(); return h.length; }));
  if (process.env.TRACE) console.log('trace', JSON.stringify(await p.evaluate(() => window.__trace)));
};
