// Brick as the fight Opponent through the hook: StoryCast.asOpponent(engine, 'brick') then the game's own startFight.
module.exports = async (p, shot, u) => {
  await p.waitForFunction(() => window.StoryCast && window.ringfighterGame?.startFight, null, { timeout: 120000 });
  const tag = process.env.TAG || 'fight-brick';
  await p.evaluate(() => { setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300); window.__restore = StoryCast.asOpponent(app.engine, 'brick'); ringfighterGame.startFight({ rounds: 1, roundSeconds: 60 }); });
  await p.waitForFunction(() => app.engine.targetMode === 'fight' && app.engine.arena?.fightView?.match, null, { timeout: 120000 });
  const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 60, n0, { timeout: 280000 });
  await shot(`${tag}-${u.w}`);
  console.log(JSON.stringify(await p.evaluate(() => { const a = app.engine.arena, r = app.engine.renderer.info.render; const out = { opponent: a.rabbit?.character, phase: a.fightView.match.phase, calls: r.calls, triangles: r.triangles }; window.__restore(); return { ...out, restored: a.castOpponent == null }; })));
};
