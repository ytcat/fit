// GOTR-0077: measures the hand paths trials-core.js uses (HANDS, OTHER, GUARD) inside the running trial: the Fighter at his spot in
// the street, settled in the guard, then each punch phase by phase with the trial's options (story-scenes.js PUNCH_OPT).
//   node qa/gotr-0077/hands.cjs > hands.json
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes && window.BagBreak, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); StoryScenes.play('carry_bag', { noIntro: true, timeScale: .01, onDone: () => { } }); });
  await p.waitForFunction(() => app.engine.fightIQDemo?.sim && app.engine.fightIQDemo.memo?.props, null, { timeout: 300000 });
  const out = await p.evaluate(() => {
    const run = app.engine.fightIQDemo; run.frame = () => { }; const c = run.rigs.fighter, V = () => new THREE.Vector3(), BX = 8.35, BZ = -1.55;
    const opt = { keepFaceClear: true, guardCover: 1, power: 1.2, recoil: 0, advance: 0, contactDrive: 0 }, res = {}, r3 = v => +v.toFixed(3);
    c.root.position.set(BX, 0, BZ); c.root.rotation.set(0, Math.PI / 2, 0); c.root.updateMatrixWorld(true);
    const at = s => { const h = c.joints['hand' + s].getWorldPosition(V()); return [r3(h.x - BX), r3(h.y), r3(h.z - BZ)]; };
    for (const [move, side, other] of [['jab', 'L', 'R'], ['cross', 'R', 'L'], ['hook', 'L', 'R'], ['rear_uppercut', 'R', 'L']]) {
      for (let rep = 0; rep < 2; rep++) { // twice: the second pass is what a punch after a punch looks like; keep the max difference
        let tt = 10 + rep * 3 + Object.keys(res).length * 7; for (let k = 0; k < 12; k++) { tt += 1 / 60; c.update(tt, 'guard', 'one_two', { simulationTime: tt, ...opt }); }
        const S = [], O = []; for (let ph = .14; ph <= .5801; ph += .04) { tt += .04 / (.8 / .38); c.update(ph * 1.22, move, 'one_two', { simulationTime: tt, ...opt }); c.root.updateMatrixWorld(true); S.push(at(side)); O.push(at(other)); }
        if (!res[move]) res[move] = { S, O }; else res[move].diff = Math.max(...S.map((p, i) => Math.hypot(p[0] - res[move].S[i][0], p[1] - res[move].S[i][1], p[2] - res[move].S[i][2])));
      }
    }
    let tt = 50; for (let k = 0; k < 20; k++) { tt += 1 / 60; c.update(tt, 'guard', 'one_two', { simulationTime: tt, ...opt }); } c.root.updateMatrixWorld(true); res.guard = [at('L'), at('R')];
    return res;
  });
  console.log(JSON.stringify(out));
  await b.close(); server.close();
});
