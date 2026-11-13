// Brick through the GAME's own flow (AdventureOldTown.launch on a fresh profile): the gym talk close-up, then the first fight.
// Env: OUTDIR-relative names via TAG; SHOTS for the fight: guard, punch, down (taken when the match shows them).
module.exports = async (p, shot, u) => {
  const tag = process.env.TAG || 'flow', wait = (f, a, t = 280000) => p.waitForFunction(f, a, { timeout: t });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('gotr.adv.nointro', '1'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.engine.career.store.create('QA Brick'); });
  await p.reload({ timeout: 300000 }); await wait(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown && window.StoryCast && window.DreamScenes);
  await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene):not(.story-scene)').forEach(d => d.close()), 400); const rg = window.ringfighterGame; window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } }; });
  const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await wait(a => app.engine.renderer.info.render.frame >= a[0] + a[1], [n0, n]); };
  if (!process.env.NOTALK) {
    await p.evaluate(() => AdventureOldTown.launch(window.__ctx, 'dream_gym_talk')); await wait(() => DreamScenes.debug?.phase === 'play');
    await p.evaluate(() => DreamScenes.seek(41.6)); await frames(3); await shot(`${tag}-talk-brick-${u.w}`);
    await p.evaluate(() => DreamScenes.seek(38.8)); await frames(3); await shot(`${tag}-talk-brick-walks-in-${u.w}`);
    await p.evaluate(() => DreamScenes.stop()); await frames(2);
  }
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.launch(window.__ctx, 'first_brick'); });
  await p.waitForTimeout(1500); await p.evaluate(() => { const b = document.querySelector('#sfBeat .sf-beat-main'); if (b) b.click(); });
  await wait(() => app.engine.targetMode === 'fight' && app.engine.arena?.fightView?.match);
  console.log('fight', JSON.stringify(await p.evaluate(() => ({ opponent: app.engine.arena.rabbit?.character, venue: app.engine.arena.fightView.venue?.id || app.engine.fightOptions?.venue, phase: app.engine.arena.fightView.match.phase }))));
  console.log('graph', JSON.stringify(await p.evaluate(() => { const a = app.engine.arena, f = o => (o.name || o.type) + (o.visible ? '' : '(hidden)') + ':' + o.children.length; return { group: a.group.children.map(f), scene: app.engine.scene.children.map(f), gym: !!a.fightView.gymFight, set: !!a.fightView.gymFight?.set }; })));
  await frames(40); await shot(`${tag}-fight-guard-${u.w}`);
  // a punch by Brick: wait until his hand is far in front of his chest
  await wait(() => { const c = app.engine.arena.rabbit, m = c?.metrics; return m && m.strike > .7; }, null, 200000).catch(() => {}); await shot(`${tag}-fight-punch-${u.w}`);
  // knockdown: the match's own knockdown, if the fight offers one
  const kd = await p.evaluate(() => { const m = app.engine.arena.fightView.match; try { if (typeof m.knockdown === 'function') { m.knockdown('rabbit'); return 'knockdown()'; } const f = m.fighters?.rabbit; if (f) { f.condition = 1; return 'condition=1'; } } catch (x) { return String(x); } return 'none'; });
  await wait(() => ['count', 'down', 'knockdown'].includes(app.engine.arena.fightView.match.phase) || app.engine.arena.fightView.match.result, null, 200000).catch(() => {}); await frames(25);
  console.log('knockdown via', kd, JSON.stringify(await p.evaluate(() => ({ phase: app.engine.arena.fightView.match.phase, result: !!app.engine.arena.fightView.match.result }))));
  await shot(`${tag}-fight-down-${u.w}`);
};
