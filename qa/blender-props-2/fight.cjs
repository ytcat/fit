// Blender props round 2: ring fights (Bruno's Gym on fight night and the built venues), renderer numbers + the fight view + a close-up
// of the ringside dressing, at 402x690 (swiftshader). Props loaded first (the venue sets are built at once and read the cache).
// usage: ROOT=<repo dir to serve> node qa/blender-props-2/fight.cjs <outdir> <tag> [places=gym_ring,boxing_club,regional,championship,docks]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || 'out'), tag = process.argv[3] || 'fight';
const places = (process.argv[4] || 'gym_ring,boxing_club,regional,championship,docks').split(',');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg' };
// close-ups in arena space (the ring at the origin): [camera, look-at, fov]
const CLOSE = {
  gym_ring: [[-1.6, 1.25, 2.4], [-5.2, .2, -.4], 42],     // the timekeeper's table, the towel rail and the spare buckets (gym x -3.7, centre 1.5, 2.0)
  boxing_club: [[.8, 1.0, .9], [2.5, -.1, 2.2], 48],       // corner stool and bucket
  regional: [[-.6, 1.1, 1.6], [-3.3, .2, 0], 44],           // the timekeeper's table
  championship: [[.2, 1.0, 1.2], [1.2, .2, 3.25], 46],      // the timekeeper's table with the bell and clock
  docks: [[1.4, 1.75, 1.4], [2.0, .4, 2.6], 52]             // crates and drums round the circle, the work lamp above
};
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 }, deviceScaleFactor: 1 }); p.setDefaultTimeout(240000);
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.CityAssets && window.StoryGymFight, null, { timeout: 300000 });
  console.log('city', JSON.stringify(await p.evaluate(() => CityAssets.ready(120000, Object.keys(CityAssets.FILES).filter(k => /Props$/.test(k))).then(() => CityAssets.status()))));
  await p.evaluate(() => { const s = app.engine.career.store; if (!s.current()) s.create('QA'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  const rows = [];
  for (const place of places) {
    await p.evaluate(place => {
      const e = app.engine; document.querySelectorAll('dialog[open]').forEach(d => d.close());
      const gym = place === 'gym_ring'; e.career.store.gameAction({ type: 'venue', venueId: gym ? 'default' : place });
      e.fightOptions = gym ? { seed: 74, place: 'gym_ring' } : { seed: 74 }; ringfighterGame.quick(); document.querySelectorAll('dialog[open]').forEach(d => d.close());
      if (!gym) GameVenues.apply(e, place, app.lang);
    }, place);
    await p.waitForTimeout(place === 'gym_ring' ? 6000 : 2500);
    const shot = async (kind, cam) => p.evaluate(([cam]) => {
      const e = app.engine, c = e.camera, r = e.renderer, s = { p: c.position.toArray(), q: c.quaternion.toArray(), zoom: c.zoom, fov: c.fov };
      if (cam) { const g = e.arena.group, a = g.localToWorld(new THREE.Vector3(...cam[0])), l = g.localToWorld(new THREE.Vector3(...cam[1])); c.position.copy(a); c.zoom = 1; c.fov = cam[2]; c.lookAt(l); c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
      e.world.update(e.animTime, 'fight'); e.arena.fightView?.pose?.(); r.render(e.scene, c);
      const info = { calls: r.info.render.calls, triangles: r.info.render.triangles }, url = e.canvas.toDataURL('image/png');
      if (cam) { c.position.fromArray(s.p); c.quaternion.fromArray(s.q); c.zoom = s.zoom; c.fov = s.fov; c.updateProjectionMatrix(); }
      return { info, url: url.split(',')[1] };
    }, [cam]);
    const f = await shot('fight'), k = await shot('close', CLOSE[place]);
    fs.writeFileSync(path.join(out, `${tag}-${place}-fight.png`), Buffer.from(f.url, 'base64')); fs.writeFileSync(path.join(out, `${tag}-${place}-close.png`), Buffer.from(k.url, 'base64'));
    const extra = await p.evaluate(() => { const v = app.engine.arena.fightView, g = v?.gymFight?.set; return { gymSetProps: g?.props || null }; });
    rows.push({ place, fight: f.info, close: k.info, ...extra }); console.log(JSON.stringify(rows.at(-1)));
  }
  fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ root, rows, errors }, null, 1));
  if (errors.length) console.log('page errors', errors);
  await b.close(); server.close();
});
