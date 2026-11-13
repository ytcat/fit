// Frames of a Dream scene at chosen times. Env: SCENE=dream_opening, SHOTS="name:t,name:t" (t in scene seconds; "map:x" = during
// the map dive at x seconds), OUTCOME=win|loss, LANG=en|he|ru, TAG=prefix, TAPS=1 (also tap through a conversation and report).
module.exports = async (p, shot, u) => {
  const id = process.env.SCENE || 'dream_opening', shots = (process.env.SHOTS || 'a:1').split(',').map(s => s.split(':')), tag = process.env.TAG || id;
  await p.waitForFunction(() => window.StoryScenes && window.DreamScenes && window.StoryCast, null, { timeout: 120000 });
  await p.evaluate(({ id, outcome, lang }) => {
    setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); if (lang) app.setLanguage(lang);
    window.__done = null; window.__mapWanted = /dream_opening/.test(id);
    StoryScenes.play(id, { outcome, noMap: !window.__wantMap, onDone: r => { window.__done = r; } });
  }, { id, outcome: process.env.OUTCOME || undefined, lang: process.env.LANG || '' });
  const wantMap = shots.some(s => s[0].startsWith('map'));
  if (wantMap) { await p.evaluate(id => { StoryScenes.stop(); window.__done = null; StoryScenes.play(id, { onDone: r => { window.__done = r; } }); }, id); }
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase !== 'load', null, { timeout: 300000 });
  for (const [name, t] of shots) {
    if (name.startsWith('map')) await p.evaluate(t => { DreamScenes.debug.mapT = t; }, +t); else await p.evaluate(t => DreamScenes.seek(t), +t);
    const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 3, n0, { timeout: 120000 });
    await shot(`${tag}-${name}-${u.w}`);
    console.log(name, t, JSON.stringify(await p.evaluate(() => ({ s: DreamScenes.stats(), t: +DreamScenes.debug.t.toFixed(2), line: document.querySelector('.dream-text')?.textContent }))));
  }
  console.log('errors-free end', await p.evaluate(() => DreamScenes.playing));
};
