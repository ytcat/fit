// Walk town look: top-down views of the walk town round the story places (layout probe for placing the film sets).
//   node qa/walk-town-look/probe.cjs <out dir> [radius m=70]   env ROOT=<repo dir to serve>
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), R = +(process.argv[3] || 70);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 800 } }); p.setDefaultTimeout(600000);
  p.on('pageerror', e => console.log('pageerror', String(e).slice(0, 300)));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`);
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.FreeWalk);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Walk QA'); });
  await p.waitForTimeout(800);
  await p.evaluate(() => FreeWalk.open({ start: 'oldtown' }));
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy && FreeWalk.qa.town);
  await p.evaluate(() => FreeWalk.qa.town?.settled?.(120000)).catch(() => null);
  const info = await p.evaluate(() => {
    const town = FreeWalk.qa.town, L = town.map.layout, S = town.S, hg = L.landmarks.homeGym, blk = L.blocks.find(b => b.kind === 'homegym');
    return { S, homeGym: hg && { x: hg.x * S, z: hg.z * S }, gymBlock: blk && { x: blk.x * S, z: blk.z * S, w: blk.w * S, d: blk.d * S, ang: blk.ang, street: blk.street * S }, marketFrame: L.marketFrame, hangar: L.landmarks.hangar && { x: L.landmarks.hangar.x * S, z: L.landmarks.hangar.z * S }, targets: town.targets, places: town.places.map(p => ({ id: p.id, x: p.x, z: p.z, spawn: p.spawn })),
      blocksNear: L.blocks.filter(b => Math.hypot(b.x * S - hg.x * S, b.z * S - hg.z * S) < 120).map(b => ({ kind: b.kind, x: +(b.x * S).toFixed(1), z: +(b.z * S).toFixed(1), w: +(b.w * S).toFixed(1), d: +(b.d * S).toFixed(1), ang: +b.ang.toFixed(3), street: +(b.street * S).toFixed(1) })) };
  });
  fs.writeFileSync(path.join(out, 'layout.json'), JSON.stringify(info, null, 1));
  const centres = { oldtown: info.homeGym, market: info.targets.market_stall, otto: info.targets.otto, docks: info.targets.docks_quay };
  for (const [name, c] of Object.entries(centres)) {
    const url = await p.evaluate(([c, R]) => {
      const run = app.engine.fightIQDemo; run._frame = run._frame || run.frame; run.frame = () => { };
      const town = FreeWalk.qa.town, cam = new THREE.OrthographicCamera(-R, R, R, -R, 1, 400); cam.up.set(0, 0, -1); cam.position.set(c.x, 200, c.z); cam.lookAt(c.x, 0, c.z);
      const r = app.engine.renderer, cv = r.domElement; r.setSize(800, 800, false); cv.style.width = cv.style.height = '800px';
      const fog = town.scene.fog; town.scene.fog = null; r.render(town.scene, cam); town.scene.fog = fog;
      return cv.toDataURL('image/png');
    }, [c, R]);
    fs.writeFileSync(path.join(out, `top-${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(JSON.stringify(info).slice(0, 3000));
  await b.close(); server.close();
});
