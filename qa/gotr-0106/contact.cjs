// GOTR-0106 contact check: plays the two-sided drill with the timing bot and measures, every rendered frame, how far each glove
// (Fighter and Mack, both hands) is from the leather of the bag: negative = inside the bag. Prints the deepest value per actor.
//   node qa/gotr-0106/contact.cjs [gameSeconds=12]
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), until = +(process.argv[2] || 12);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes && window.StoryTrials?.DuoTrial && window.BagBreak, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.BagBreak.force = 'new'; StoryScenes.play('bag_duo', { noIntro: true, onDone: () => { } }); });
  await p.waitForFunction(() => app.engine.fightIQDemo?.sim, null, { timeout: 300000 });
  await p.evaluate(() => {
    const key = { straight: 'j', hook: 'k', uppercut: 'l' }, V = () => new THREE.Vector3(), worst = window.__worst = { fighter: 9, pip: 9, samples: 0 };
    const tick = () => { const run = app.engine.fightIQDemo, s = run?.sim; if (!s || s.done) return; const c = s.c;
      if (c.state === 'toward' && c.hits < c.need && Math.abs(s.t - s.due) < .03 && c.pressedFor !== s.due) { c.pressedFor = s.due; for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key: key[c.type], bubbles: true })); }
      let root = app.engine.coach.root; while (root.parent) root = root.parent; let leather = null; root.traverse(o => { if (o.name === 'Heavy bag leather' && o.visible && o.parent?.name === 'New heavy bag') leather = o; });
      if (leather) { leather.updateMatrixWorld(true); const inv = leather.matrixWorld.clone().invert(), B = window.BagBreakCore.BAG;
        for (const [who, rig] of [['fighter', app.engine.coach], ['pip', run.rigs?.pip]]) { if (!rig) continue; for (const side of ['L', 'R']) { const h = rig.joints['hand' + side]; if (!h) continue; const p = h.getWorldPosition(V()).applyMatrix4(inv);
          if (Math.abs(p.y) < B.h) { const gap = Math.hypot(p.x, p.z) - B.r - .06; if (who === 'fighter' && run.memo?.act) { const k = 'fighter_' + run.memo.act.k; worst[k] = Math.min(worst[k] ?? 9, gap); }
          if (gap < worst[who]) { worst[who] = gap; const bc = leather.getWorldPosition(V()), hw = h.getWorldPosition(V()); worst[who + 'At'] = { t: +s.t.toFixed(2), phase: s.c.state, call: s.c.type, act: run.memo?.act ? [run.memo.act.k, +(run.t - run.memo.act.t).toFixed(2)] : null, swing: +s.view().swing.toFixed(2), root: +rig.root.position.x.toFixed(3), bag: [+bc.x.toFixed(3), +bc.y.toFixed(2)], hand: [+hw.x.toFixed(3), +hw.y.toFixed(2), +hw.z.toFixed(3)], side, localY: +p.y.toFixed(2) }; } } } } worst.samples++; }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(u => (app.engine.fightIQDemo?.sim?.t || 0) >= u, until, { timeout: 1500000, polling: 2000 });
  const out = await p.evaluate(() => ({ ...window.__worst, landed: app.engine.fightIQDemo.sim.landed, misses: app.engine.fightIQDemo.sim.misses }));
  console.log('contact', JSON.stringify(out), 'errors', JSON.stringify(errs));
  await b.close(); server.close();
});
