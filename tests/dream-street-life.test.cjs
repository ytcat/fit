// node tests/dream-street-life.test.cjs — GOTR-0097, the opening film's street: the zebra crossing lies the right way (bars
// along the traffic, side by side across the road: the walker steps over them), the pigeons flush when the Fighter comes
// close, the people loop the far pavement; in the browser (skips without Playwright): quality 'high' = real sun shadows
// (PCF soft, the Fighter through his light stand-in, not his 200 meshes), people, dog and birds; 'low' = no shadow pass, the
// contact shadows, clouds and litter only; the renderer and the rig are handed back as they were.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global; require('../adventure/story/street-life.js');
const L = window.StreetLife, Core = require('../adventure/story/dream-core.js');

// ---- the zebra crossing (generated street, dream-sets.js): bars long along x (the traffic), stacked across the road in z
const src = fs.readFileSync('adventure/story/dream-sets.js', 'utf8'), line = src.split('\n').find(l => /zebra crossing to the gym/.test(l));
const m = line.match(/for \(let z = (-?[\d.]+); z < (-?[\d.]+); z \+= ([\d.]+)\) box\(S, ([\d.]+), (-?[\d.]+), z, ([\d.]+), ([\d.]+), ([\d.]+),/);
assert.ok(m, 'zebra bars found: ' + line.trim().slice(0, 120)); const [z0, z1, dz, x, , w, , d] = m.slice(1).map(Number), bars = Math.floor((z1 - z0) / dz + 1e-9) + 1;
assert.ok(w > 4 * d, 'each bar is long along the street (x ' + w + ' m) and narrow across it (z ' + d + ' m)');
assert.ok(bars >= 6 && z0 > -3.5 && z0 + (bars - 1) * dz < 3.5 && dz > d, bars + ' bars side by side across the road, with gaps');
const sc = Core.withCity(Core.scenes.dream_opening); let crossed = 0;
for (let t = 22.6; t < 26.2; t += .05) { const a = Core.sample(sc, t).actors.fighter; if (Math.abs(a.z) < 3.4) { assert.ok(a.x > x - w / 2 && a.x < x + w / 2, 'he crosses on the zebra (x ' + a.x.toFixed(2) + ')'); crossed++; } }
assert.ok(crossed > 20, 'the Fighter walks across the bars');
console.log('PASS zebra crossing: bars', bars, 'x', w, 'm long, z', d, 'm wide, every', dz, 'm');

// ---- pigeons and people (pure)
const track = []; for (let t = 0; t <= sc.duration; t += .1) { const a = Core.sample(sc, t).actors.fighter; if (a.act !== 'off') track.push([t, a.x, a.z]); }
for (const f of L.pigeons) { const t0 = L.pigeonState(f, sc.duration, track); assert.ok(t0 != null && t0 > 9 && t0 < 23, 'the flock at x ' + f.x + ' flies off when he walks by (t ' + t0 + ')'); assert.equal(L.pigeonState(f, t0 - .2, track), null, 'and pecks on the ground before'); }
for (const w of L.walkers) { const a = L.walkerAt(w, 0), b = L.walkerAt(w, 10); assert.ok(w.z < -3.8 && w.z > -7.6, w.id + ' on the far pavement'); assert.ok(Math.abs(Math.abs(b.x - a.x) - Math.abs(w.v) * 10) < 1e-6 || Math.abs(b.x - a.x) > 50, w.id + ' walks at its speed'); }
console.log('PASS pigeons and walkers');

// ---- in the browser
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.ktx2': 'image/ktx2' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', x => errors.push(x.message));
    const wait = (f, a) => p.waitForFunction(f, a, { timeout: 300000 });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* none */ } });
    await p.goto(url, { timeout: 300000 }); await wait(() => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamScenes && window.StreetLife);
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); return window.CityAssets?.preload(); }); // both runs with the same (full) city
    const before = await p.evaluate(() => { const c = app.engine.coach, sm = app.engine.renderer.shadowMap; let n = 0; c.root.traverseVisible(o => { if (o.isMesh && o.castShadow) n++; }); return { enabled: sm.enabled, type: sm.type, cast: n }; });
    const run = async q => {
      await p.evaluate(q => { DreamScenes.quality(q); window.__done = null; StoryScenes.stop(); StoryScenes.play('dream_opening', { noMap: true, onDone: r => { window.__done = r; } }); }, q);
      await wait(() => DreamScenes.debug && DreamScenes.debug.phase === 'play' && DreamScenes.debug.set);
      await p.evaluate(() => { const d = DreamScenes.debug, f = d.frame; app.engine.fightIQDemo = d; DreamScenes.seek(17.0); for (let i = 0; i < 18; i++) f(1 / 30); });
      const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await wait(n => app.engine.renderer.info.render.frame >= n + 2, n0);
      return p.evaluate(() => { const d = DreamScenes.debug, c = d.rigs.fighter, e = app.engine, sm = e.renderer.shadowMap, sun = d.set.sun; let cast = 0, castTris = 0, castNames = [], proxy = null; c.root.traverse(o => { if (o.isMesh && o.castShadow && o.layers.mask === 1) { cast++; castTris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; castNames.push(o.name); } if (o.name === 'shadow stand-in') proxy = { cast: o.castShadow, layer: o.layers.mask, tris: o.geometry.attributes.position.count / 3 }; });
        return { stats: DreamScenes.stats(), enabled: sm.enabled, pcfSoft: sm.type === THREE.PCFSoftShadowMap, sunCasts: sun.castShadow, shadowCamSeesProxy: sun.shadow.camera.layers.test((() => { const l = new THREE.Layers(); l.set(1); return l; })()), map: sun.shadow.mapSize.x, rigMeshesCasting: cast, castTris, castNames, proxy }; });
    };
    const hi = await run('high'); console.log('high', JSON.stringify(hi));
    assert.ok(hi.enabled && hi.pcfSoft && hi.sunCasts && hi.stats.shadows, 'quality high: real sun shadows, PCF soft'); assert.ok(hi.map >= 2048, 'a 2048 shadow map');
    assert.ok(hi.rigMeshesCasting <= 4 && hi.castTris < 5000, 'the Fighter\'s own ~200 meshes stay out of the shadow pass (only the small duffel may cast): ' + hi.castNames.join(', ') + ' ' + hi.castTris); assert.ok(hi.proxy && hi.proxy.cast && hi.proxy.layer === 2 && hi.proxy.tris < 6000, 'his shadow comes from the light stand-in on layer 1'); assert.ok(hi.shadowCamSeesProxy, 'the sun\'s shadow camera sees layer 1');
    assert.equal(hi.stats.life.level, 2); assert.ok(hi.stats.life.meshes >= 15, 'clouds, litter, people, dog and pigeons: ' + hi.stats.life.meshes);
    assert.ok(hi.stats.calls <= 250, 'draw calls within the phone budget: ' + hi.stats.calls);
    await p.evaluate(() => StoryScenes.stop());
    const lo = await run('low'); console.log('low', JSON.stringify(lo));
    assert.ok(!lo.stats.shadows && !lo.sunCasts, 'quality low: no shadow pass'); assert.equal(lo.stats.life.level, 1, 'low: clouds and litter only');
    assert.ok(lo.stats.calls < hi.stats.calls && lo.stats.triangles < hi.stats.triangles, 'low draws less: ' + lo.stats.calls + '/' + lo.stats.triangles + ' vs ' + hi.stats.calls + '/' + hi.stats.triangles);
    await p.evaluate(() => { StoryScenes.stop(); DreamScenes.quality('auto'); });
    const after = await p.evaluate(() => { const c = app.engine.coach, sm = app.engine.renderer.shadowMap; let n = 0, proxy = 0; c.root.traverseVisible(o => { if (o.isMesh && o.castShadow) n++; }); c.root.traverse(o => { if (o.name === 'shadow stand-in') proxy++; }); return { enabled: sm.enabled, type: sm.type, cast: n, proxy }; });
    assert.deepEqual({ enabled: after.enabled, type: after.type, cast: after.cast }, before, 'renderer shadows and the rig\'s shadow flags handed back'); assert.equal(after.proxy, 0, 'stand-in removed');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS street film quality switch', JSON.stringify({ high: { calls: hi.stats.calls, triangles: hi.stats.triangles }, low: { calls: lo.stats.calls, triangles: lo.stats.triangles } }));
  } finally { await browser.close(); server.close(); }
})().catch(x => { console.error(x); process.exit(1); });
