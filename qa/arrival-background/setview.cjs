// A story set on its own (no cast), seen from given cameras, with renderer numbers: for the sets the films do not reach
// easily (busstop, gymfront, market alley) and for street-level views of every neighbourhood.
// usage: ROOT=<repo> node qa/arrival-background/setview.cjs <outdir> <tag> 'set|px,py,pz|lx,ly,lz|fov;...'
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2]), tag = process.argv[3];
const views = process.argv[4].split(';').filter(Boolean).map(v => { const [set, p, l, fov] = v.split('|'); return { set, pos: p.split(',').map(Number), look: l.split(',').map(Number), fov: +(fov || 40) }; });
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  await p.goto(`http://localhost:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.StorySets && window.CityAssets && window.DreamSets, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 300); });
  await p.evaluate(() => CityAssets.ready(120000, Object.keys(CityAssets.FILES)).then(() => StorySets.ready()));
  await p.evaluate(() => { const cv = document.createElement('canvas'); cv.id = 'qa-view'; cv.style.cssText = 'position:fixed;inset:0;width:402px;height:690px;z-index:99999'; document.body.appendChild(cv); const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); r.setSize(402, 690, false); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; window.__qa = { r }; });
  for (let i = 0; i < views.length; i++) {
    const v = views[i];
    const row = await p.evaluate(async v => {
      const { r } = window.__qa, scene = new THREE.Scene(), names = v.set === 'dream_market' ? ['hazelStall', 'tree'] : Object.keys(CityAssets.FILES);
      const city = /^dream_(street|market)$/.test(v.set) ? await CityAssets.ready(1000, names) : undefined;
      const set = StorySets.build(v.set, scene, { renderer: r, shadows: true, city });
      const cam = new THREE.PerspectiveCamera(v.fov, 402 / 690, .1, 400); cam.position.fromArray(v.pos); cam.lookAt(new THREE.Vector3(...v.look));
      set.focus(v.look[0], v.look[2], 16); set.objects.city?.frame?.({ t: 1 }, cam);
      const gl = r.getContext(), px = new Uint8Array(4); r.render(scene, cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); for (let k = 0; k < 5; k++) { r.shadowMap.needsUpdate = true; r.render(scene, cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } const ms = (performance.now() - t0) / 5;
      const info = { calls: r.info.render.calls, triangles: r.info.render.triangles, ms: +ms.toFixed(0) };
      window.__qa.dispose = () => set.dispose(); return info;
    }, v);
    await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, `${tag}-${i}.png`) }); console.log(JSON.stringify({ i, ...v, ...row }));
    await p.evaluate(() => window.__qa.dispose());
  }
  await b.close(); server.close();
});
