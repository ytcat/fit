// GOTR-0077 evidence: "Brick's bag" (StoryScenes 'carry_bag', mission heavy_bag_van) played in the real app at 402x690.
// A bot presses the called punch through the game's own key path (J/K/L, the same handler as the pad) at a chosen offset from
// the moment the rules want ("due": the old rules' peak, the new rules' ideal press). After every rendered frame it measures
// the distance from each glove to the leather (negative = inside the bag) and logs, per press: offset, the rules' verdict,
// the closest the glove came to the leather within 0.45 s, and when the bag started to move away.
//   node qa/gotr-0077/bag-trial.cjs <outdir>
//   OFFSETS=-.4,-.3,... press offsets (s) cycled over the swings (default: a sweep)   TS=.5 game time scale (finer frames)
//   SHOTS=a,b,c   pictures at these game times (paused frame)     PAD=1  first presses as real taps on the pad buttons (coordinates)
//   HUMAN=1  the bot presses when the leather first comes within the punch's reach (what a player sees), not at "due"
//   SWINGS=n stop after n swings (default all)
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), out = process.argv[2] || path.join(__dirname, 'run'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 }, hasTouch: !!process.env.PAD }), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes && window.StoryTrials?.BagTrial, null, { timeout: 300000 });
  const offsets = (process.env.OFFSETS || '-.5,-.4,-.3,-.2,-.1,0,.1,.2,.3').split(',').map(Number);
  await p.evaluate(([ts]) => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__res = null; StoryScenes.play('carry_bag', { noIntro: true, timeScale: ts, onDone: r => { window.__res = r; } }); }, [+(process.env.TS || .5)]);
  await p.waitForFunction(() => app.engine.fightIQDemo?.sim && app.engine.fightIQDemo.frame, null, { timeout: 300000 });
  await p.evaluate(([offsets, human, pad, swings]) => {
    const V = () => new THREE.Vector3(), run = app.engine.fightIQDemo, key = { straight: 'j', hook: 'k', uppercut: 'l' }, log = window.__log = [], frames = window.__frames = [];
    const leather = () => { const o = run.memo?.bagMesh || null; if (o) return o; let best = null; run.rigs.fighter.root.parent.traverse(n => { if (n.name === 'heavy bag' || n.name === 'Heavy bag leather') best = n.name === 'Heavy bag leather' ? n : best || n; }); return best; };
    const swing = s => s.sw || s.c || null, due = s => s.due ?? swing(s)?.peak, idOf = s => s.i ?? 0;
    const press = k => { for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true })); };
    let last = null;
    const f0 = run.frame;
    run.frame = d => {
      f0(d); const s = run.sim; if (!s || run.result) return;
      // measure: gloves to leather (bag axis = local y of the leather mesh, half height and radius from its userData or the old model)
      const L = leather(); let gap = 9, reach = null;
      if (L) { L.updateMatrixWorld(true); const inv = L.matrixWorld.clone().invert(), r = L.userData.r ?? .17, h = L.userData.h ?? .5, cy = L.userData.cy ?? 0;
        for (const side of ['L', 'R']) { const hand = run.rigs.fighter.joints['hand' + side]; const q = hand.getWorldPosition(V()); const lp = q.clone().applyMatrix4(inv); if (Math.abs(lp.y - cy) < h + .05) gap = Math.min(gap, Math.hypot(lp.x, lp.z) - r - .06); } }
      const sw = swing(s), v = s.view();
      frames.push({ t: +s.t.toFixed(3), gap: +gap.toFixed(3), phase: v.phase, k: +(v.k ?? 0).toFixed(2) });
      if (last && s.t - last.at <= .45) { last.minGap = Math.min(last.minGap, gap); if (gap <= .01 && last.touchAt == null) last.touchAt = +(s.t - last.at).toFixed(3); }
      if (v.flash && last && v.flash.t >= last.at - 1e-6 && !last.verdict) last.verdict = v.flash.type;
      // the bot
      if (!sw || window.__padMode || s.done) return; const i = idOf(s);
      if (window.__swings && i >= window.__swings) return;
      if (sw.__pressed) return;
      const type = sw.type; if (!key[type]) return;
      let fire = false;
      if (human) { if (v.phase === 'swing' || v.phase === 'toward') { if (gap < .12 && gap > -.5 && v.k > .3) fire = true; } }
      else { const off = offsets[i % offsets.length]; if (s.t >= due(s) + off) fire = true; }
      if (fire) { sw.__pressed = true; last = { i, type, at: s.t, off: +(s.t - due(s)).toFixed(3), minGap: 9, gapAtPress: +gap.toFixed(3) }; log.push(last); press(key[type]); last.verdict = s.view().flash && s.view().flash.t >= last.at - 1e-6 ? s.view().flash.type : null; }
    };
    window.__swings = swings || 0;
  }, [offsets, !!process.env.HUMAN, !!process.env.PAD, +(process.env.SWINGS || 0)]);
  if (process.env.PAD) {
    // real taps with coordinates on the story pad's punch buttons, timed from game state polled by the test (3 swings)
    await p.evaluate(() => { window.__padMode = true; });
    for (let n = 0; n < 3; n++) {
      const info = await p.waitForFunction(n => { const s = app.engine.fightIQDemo?.sim, sw = s?.sw || s?.c; if (!s || (s.i ?? 0) !== n || !sw) return null; const d = s.due ?? sw.peak; return s.t >= d - .06 ? { type: sw.type, t: s.t, due: d } : null; }, n, { timeout: 120000, polling: 'raf' }).then(h => h.jsonValue());
      const box = await p.locator(`.story-pad .fp-btn[data-pad="${info.type}"]`).boundingBox();
      await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      const after = await p.evaluate(() => { const s = app.engine.fightIQDemo.sim, v = s.view(); return { t: s.t, flash: v.flash, hits: s.hits, mistakes: s.mistakes }; });
      console.log('pad tap', n, info.type, 'due', info.due.toFixed(2), 'tapped at', info.t.toFixed(2), '->', JSON.stringify(after));
      await p.waitForFunction(n => (app.engine.fightIQDemo?.sim?.i ?? 0) > n || app.engine.fightIQDemo?.sim?.done, n, { timeout: 120000 });
    }
    // window.fighterPad (the main game pad) while the trial runs: does it reach the trial?
    const fp = await p.evaluate(() => { const s = app.engine.fightIQDemo.sim, m0 = s.mistakes + s.hits; try { window.fighterPad?.press?.('straight'); } catch (x) { return 'throws ' + x.message; } return { reached: s.mistakes + s.hits !== m0 || app.engine.fightIQDemo.memo.act?.k === 'straight' }; });
    console.log('window.fighterPad.press during the trial:', JSON.stringify(fp));
    await p.evaluate(() => { window.__padMode = false; });
  }
  const shots = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number);
  for (const at of shots) {
    await p.evaluate(at => { const run = app.engine.fightIQDemo; window.__paused = false; if (!run.__frame) run.__frame = run.frame; run.frame = d => { if (run.sim && run.sim.t >= at) { window.__paused = true; return; } run.__frame(d); }; }, at);
    await p.waitForFunction(() => window.__paused || window.__res || app.engine.fightIQDemo?.result, null, { timeout: 600000 });
    const f = path.join(out, `t${at.toFixed(2).replace('.', '_')}.png`); await p.screenshot({ path: f });
    console.log('shot', at, JSON.stringify(await p.evaluate(() => { const s = app.engine.fightIQDemo?.sim, v = s?.view(); return v && { t: +v.t.toFixed(2), phase: v.phase, type: v.type, i: v.i, k: +(v.k ?? 0).toFixed(2), prompt: document.querySelector('.story-prompt')?.textContent, now: document.querySelector('.story-prompt')?.dataset.now, gap: window.__frames.at(-1)?.gap }; })));
    await p.evaluate(() => { const run = app.engine.fightIQDemo; if (run.__frame) run.frame = run.__frame; });
  }
  if (!process.env.NORESULT) {
    await p.waitForFunction(() => window.__res || app.engine.fightIQDemo?.result, null, { timeout: 1200000, polling: 1000 });
    await p.waitForTimeout(800); await p.screenshot({ path: path.join(out, 'result.png') });
  }
  const res = await p.evaluate(() => ({ log: window.__log, result: app.engine.fightIQDemo?.result || null, fps: null }));
  fs.writeFileSync(path.join(out, 'presses.json'), JSON.stringify(res, null, 1));
  for (const l of res.log) console.log(`swing ${String(l.i).padStart(2)} ${l.type.padEnd(8)} off ${l.off >= 0 ? '+' : ''}${l.off.toFixed(2)}  verdict ${String(l.verdict).padEnd(8)} gapAtPress ${l.gapAtPress.toFixed(2)}  closest ${l.minGap.toFixed(3)}${l.touchAt != null ? '  touch +' + l.touchAt : ''}`);
  if (res.result) console.log('result', JSON.stringify({ value: res.result.value, hits: res.result.hits, score: res.result.score, stars: res.result.stars }));
  console.log('errors', JSON.stringify(errs.filter(e => !/favicon|404/.test(e)).slice(0, 8)));
  await b.close(); server.close();
});
