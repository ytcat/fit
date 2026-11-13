// GOTR-0089: where the submitted triangles / draw calls of the opening film come from, per shot.
//   APP_URL=http://127.0.0.1:8517/ node qa/gotr-0089/tools/budget.cjs  -> qa/gotr-0089/budget.json
// For each time: the whole frame, then the frame with the city models hidden, then with the characters hidden.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const URL = process.env.APP_URL || 'http://127.0.0.1:8489/', TIMES = (process.env.TIMES || '3,6,9.1,11.5,14.5,18.1,21.5,25,30').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* */ } });
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamScenes, null, { timeout: 300000 });
  await p.evaluate(() => window.CityAssets?.preload());
  await p.evaluate(() => { StoryScenes.play('dream_opening', { noMap: true, onDone() {} }); });
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play', null, { timeout: 300000 });
  const rows = [];
  for (const t of TIMES) {
    const r = await p.evaluate(async t => {
      const d = DreamScenes.debug, e = app.engine, frame = () => new Promise(res => { const n = e.renderer.info.render.frame; const w = () => e.renderer.info.render.frame > n + 1 ? res() : requestAnimationFrame(w); w(); });
      DreamScenes.seek(t); await frame(); DreamScenes.seek(t); await frame();
      const all = { ...DreamScenes.stats() }, city = d.set.group.getObjectByName('city art (GLB)'), bus = d.set.objects.city?.bus?.wrap, rigs = Object.values(d.rigs);
      const set = (v, list) => list.forEach(o => { if (o) o.visible = v; });
      set(false, [city, bus]); DreamScenes.seek(t); await frame(); const noCity = { ...DreamScenes.stats() }; set(true, [city, bus]);
      const vis = rigs.map(c => c.root.visible); rigs.forEach(c => { c.root.visible = false; }); const hide = () => rigs.forEach(c => { c.root.visible = false; });
      const orig = d.frame; d.frame = dt => { orig(dt); }; DreamScenes.seek(t); e.renderer.info.autoReset = true;
      // the frame loop shows the rigs again; measure them by difference with one more frame where they are hidden right before render
      const R = e.renderer, render0 = R.render; R.render = function (s, c) { hide(); return render0.call(this, s, c); }; await frame(); const noRigs = { ...DreamScenes.stats() }; R.render = render0; rigs.forEach((c, i) => { c.root.visible = vis[i]; });
      return { t, shot: all.shot, shadows: !!R.shadowMap.enabled, all: [all.calls, all.triangles], withoutCity: [noCity.calls, noCity.triangles], withoutCharacters: [noRigs.calls, noRigs.triangles], cityMeshes: all.city };
    }, t);
    console.log(JSON.stringify(r)); rows.push(r);
  }
  fs.writeFileSync(path.join(__dirname, '..', process.env.OUT || 'budget.json'), JSON.stringify(rows, null, 1) + '\n');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
