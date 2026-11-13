// One frame of an existing story scene or trial (story-scenes.js). Env: SCENE=arrival, AT=seconds, TAG=file prefix.
module.exports = async (p, shot, u) => {
  const id = process.env.SCENE || 'arrival', at = +(process.env.AT || 7), tag = process.env.TAG || 'outfit-rule';
  await p.waitForFunction(() => window.StoryScenes && window.StorySets, null, { timeout: 120000 });
  await p.evaluate(id => { setInterval(() => document.querySelectorAll('dialog[open]:not(.story-scene)').forEach(d => d.close()), 300); StoryScenes.play(id, { timeScale: 8, noIntro: true, onDone: () => {} }); }, id);
  await p.waitForFunction(at => StoryScenes.debug && StoryScenes.debug.t >= at, at, { timeout: 280000 }).catch(() => {});
  await p.evaluate(() => { const d = StoryScenes.debug; if (d) d.frame = (f => dt => f(0))(d.frame); }); // hold this moment
  const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 120000 });
  await shot(`${tag}-${id}-${u.w}`);
  console.log(id, JSON.stringify(await p.evaluate(() => { const e = app.engine, c = e.coach; return { t: StoryScenes.debug?.t, outfit: window.StoryCast?.outfitOf(c), gloves: c.gloveMeshes.L.visible, handY: c.metrics?.hands?.[0]?.[1] }; })));
};
