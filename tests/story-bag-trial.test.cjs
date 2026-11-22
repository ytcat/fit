// GOTR-0077 "Brick's bag" in the real app (Chromium, 402x690): the first swing is answered with a real tap on the pad's punch
// button, the next two with the keyboard path; every press at the moment the ring closes must land, the glove must stop on the
// leather (never inside it) and the scene must be the new one: Brick the bulldog, the chain, the boom stand, the Fighter in kit.
// Rules are covered in node by tests/story-trials.test.cjs.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), http = require('http');
process.chdir(path.join(__dirname, '..'));
const src = fs.readFileSync('adventure/story/story-scenes.js', 'utf8');
assert.match(src, /carry_bag: \{\n\s+set: 'gymfront', roles: \{ fighter: \{ wear: 'kit' \}, brick: \{ rig: 'brick', cast: true \} \}, make: \(T, o\) => new T\.BagTrial/);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.GOTR_CHROMIUM || undefined, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 }, hasTouch: true }), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
    await p.goto('http://127.0.0.1:' + server.address().port + '/', { timeout: 300000 });
    await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes && window.StoryTrials?.BagTrial && window.BagBreak, null, { timeout: 300000 });
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); StoryScenes.play('carry_bag', { noIntro: true, timeScale: .35, onDone: () => { } }); }); // slow game time: a loaded test machine renders a few frames a second
    await p.waitForFunction(() => app.engine.fightIQDemo?.sim && app.engine.fightIQDemo.memo?.props, null, { timeout: 300000 });
    // after every rendered frame: the closest glove to the leather; the keyboard bot answers swings 1 and 2 when the ring closes
    await p.evaluate(() => {
      const run = app.engine.fightIQDemo, f0 = run.frame, V = () => new THREE.Vector3(), M = window.__bag = { worst: 9, contacts: {}, frames: 0, cue: 0 };
      run.frame = d => { f0(d); const s = run.sim, v = s.view(), L = run.memo.props.mesh; L.updateMatrixWorld(true); const inv = L.matrixWorld.clone().invert(), u = L.userData;
        let gap = 9; for (const side of ['L', 'R']) { const q = run.rigs.fighter.joints['hand' + side].getWorldPosition(V()).applyMatrix4(inv); if (Math.abs(q.y) < u.h) gap = Math.min(gap, Math.hypot(q.x, q.z) - u.r - .06); }
        M.frames++; M.worst = Math.min(M.worst, gap); const c = s.punch?.contact; if (c && s.t >= c.t && s.t < c.t + .07) M.contacts[s.i] = Math.min(M.contacts[s.i] ?? 9, +gap.toFixed(3)); // closest the glove is while the hit lands (the bag then flies off it)
        if (!document.querySelector('.story-cue').hidden) M.cue++;
        if (s.i >= 1 && s.i < 3 && v.prompt && v.prompt !== 'back' && !s.punch && s.t >= v.due) for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key: { straight: 'j', hook: 'k', uppercut: 'l' }[v.type], bubbles: true })); };
    });
    // swing 0: a real tap with coordinates on the pad's Straight button when the ring closes
    await p.waitForFunction(() => { const s = app.engine.fightIQDemo.sim; return s.sw.state === 'swing' && s.t >= s.sw.due - .03; }, null, { timeout: 1200000, polling: 'raf' });
    const box = await p.locator('.story-pad .fp-btn[data-pad="straight"]').boundingBox(); await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await p.waitForFunction(() => app.engine.fightIQDemo.sim.i >= 3 || app.engine.fightIQDemo.sim.mistakes > 0, null, { timeout: 1500000, polling: 500 });
    const out = await p.evaluate(() => { const run = app.engine.fightIQDemo, s = run.sim, b = run.rigs.brick; let links = 0; run.memo.props.group.traverse(n => { if (n.geometry?.type === 'TorusGeometry' && n.geometry.parameters.radius < .021) links++; });
      return { ...window.__bag, hits: s.hits, mistakes: s.mistakes, log: s.log.map(e => e.type), brick: b.character, species: b.species, links, kit: window.StoryCast.outfitOf(run.rigs.fighter), stats: StoryScenes.stats() }; });
    console.log('bag trial', JSON.stringify({ hits: out.hits, mistakes: out.mistakes, worst: +out.worst.toFixed(3), contacts: out.contacts, frames: out.frames, cue: out.cue, links: out.links, brick: out.brick, kit: out.kit, calls: out.stats?.calls }));
    assert.equal(out.mistakes, 0, 'every press when the ring closes lands: ' + out.log.join(' ')); assert.equal(out.hits, 3);
    assert.ok(out.worst > -.03, 'a glove never goes into the bag: ' + out.worst);
    const touch = Object.values(out.contacts); assert.ok(touch.length === 3 && touch.every(g => g < .04 && g > -.03), 'the glove is on the leather when the hit counts: ' + JSON.stringify(out.contacts));
    assert.equal(out.brick, 'brick', 'Brick is the bulldog of the story cast'); assert.equal(out.kit, 'kit', 'gloves on'); assert.ok(out.links >= 8, 'a chain: ' + out.links); assert.ok(out.cue > 0, 'the ring cue shows');
    assert.deepEqual(errors, []);
    console.log('PASS story-bag-trial: tap and keys land when the ring closes, gloves stop on the leather');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
