// Screenshots qa/arrival-background/car-preview.html: the parked car full (left) and its far copy (right).
// usage: node qa/arrival-background/cars.cjs <out.png> ["dist=24&fov=33"] [W] [H]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), out = path.resolve(process.argv[2] || 'trees.png');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +(process.argv[4] || 1400), height: +(process.argv[5] || 520) } });
  p.on('pageerror', e => console.log('error', String(e)));
  await p.goto(`http://localhost:${server.address().port}/qa/arrival-background/car-preview.html?${process.argv[3] || ''}`);
  await p.waitForFunction(() => window.done, null, { timeout: 120000 });
  await p.screenshot({ path: out }); console.log(out, '');
  await b.close(); server.close();
});
