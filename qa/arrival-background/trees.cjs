// Screenshots qa/arrival-background/tree-preview.html: old generated tree, new broad and upright trees, the authored GLB.
// usage: node qa/arrival-background/trees.cjs <out.png> [query, e.g. "az=1.2&el=.3&dist=24"] [W] [H]
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
  await p.goto(`http://localhost:${server.address().port}/qa/arrival-background/tree-preview.html?${process.argv[3] || ''}`);
  await p.waitForFunction(() => window.glbReady && window.drawn > 3, null, { timeout: 120000 });
  await p.screenshot({ path: out }); console.log(out, JSON.stringify(await p.evaluate(() => window.info())));
  await b.close(); server.close();
});
