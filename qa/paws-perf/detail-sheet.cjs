// Paw detail levels side by side (GOTR-0100 follow-up): full detail (unchanged), the low-detail paw (drawn when the paw is under
// 3 % of the view height) and the quick stand-in (shown only until the worker delivers). Studio light, the game's renderer and
// paw material. Rows: lion (Fighter), wolf (Fang), doe (Mrs. Hazel), crocodile in wraps (Rourke); columns: full / low / stand-in,
// each large (back 3/4 view, relaxed) and then full vs low at the size where the switch happens (~21 px tall on a 690 px view).
// node qa/paws-perf/detail-sheet.cjs <siteRoot> <out.png>
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..')), OUT = process.argv[3] || path.join(__dirname, 'detail-sheet.png');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 900, height: 900 } });
    await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
    await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
    await p.waitForFunction(() => window.app?.engine?.renderer && window.Paws, null, { timeout: 300000 });
    const ROWS = [['lion', false, '#b98143'], ['wolf', false, '#6f737c'], ['doe', false, '#b98a5e'], ['croc', true, '#4b5a2c']];
    await p.evaluate(async rows => { for (const [sp, w] of rows) Paws.request(sp, 'relaxed', w, 0); const t0 = performance.now(); while (rows.some(([sp, w]) => !Paws.isReady(sp, 'relaxed', w)) && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 200)); }, ROWS);
    const url = await p.evaluate(rows => {
      const T = THREE, r = app.engine.renderer, S = 200, small = 21, cols = 5, cv = document.createElement('canvas'); cv.width = S * cols; cv.height = S * rows.length; const cx = cv.getContext('2d'); cx.fillStyle = '#1d232c'; cx.fillRect(0, 0, cv.width, cv.height);
      const scene = new T.Scene(); scene.add(new T.HemisphereLight(0xeef2ff, 0x3a3028, 1.2)); const k = new T.DirectionalLight(0xfff1dd, 2.6); k.position.set(1, 2, 2); scene.add(k); const rim = new T.DirectionalLight(0xcfe0ff, 1.2); rim.position.set(-2, 1, -1); scene.add(rim);
      const cam = new T.PerspectiveCamera(30, 1, .01, 10); cam.position.set(.3, .1, -.62); cam.lookAt(0, -.085, .01);
      const shot = (mesh, size) => { scene.add(mesh); const rt = new T.WebGLRenderTarget(size, size, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(size * size * 4); r.setRenderTarget(rt); r.setClearColor(0x1d232c, 1); r.clear(); r.render(scene, cam); r.readRenderTargetPixels(rt, 0, 0, size, size, buf); r.setRenderTarget(null); rt.dispose(); scene.remove(mesh);
        const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size); for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4); x.putImageData(img, 0, 0); return c; };
      const info = [];
      rows.forEach(([sp, w, fur], i) => {
        const coat = new T.Color(fur).convertSRGBToLinear(), mat = Paws.material(null), mk = d => new T.Mesh(Paws.geometry(sp, 'relaxed', 'L', coat, { wraps: w, detail: d }), mat);
        const g = d => mk(d).geometry.index.count / 3; info.push(sp + (w ? ' wraps' : '') + ': full ' + g('full') + ', low ' + g('lod') + ', stand-in ' + g('quick') + ' triangles');
        ['full', 'lod', 'quick'].forEach((d, j) => cx.drawImage(shot(mk(d), S), j * S, i * S));
        // full and low at the switch size, shown 1:1 in the middle of their cells (and 4x enlarged with no smoothing below them)
        ['full', 'lod'].forEach((d, j) => { const c = shot(mk(d), small * 3); const x0 = (3 + j) * S; cx.drawImage(c, x0 + S / 2 - c.width / 2, i * S + 20); cx.imageSmoothingEnabled = false; cx.drawImage(c, x0 + S / 2 - 60, i * S + 80, 120, 120); cx.imageSmoothingEnabled = true; });
      });
      cx.fillStyle = '#e9edf3'; cx.font = '14px system-ui'; ['full detail', 'low detail', 'stand-in', 'full @ switch size', 'low @ switch size'].forEach((t, j) => cx.fillText(t, j * S + 8, 16));
      return { url: cv.toDataURL('image/png'), info };
    }, ROWS);
    fs.writeFileSync(OUT, Buffer.from(url.url.split(',')[1], 'base64')); console.log(url.info.join('\n'));
  } finally { await b.close(); server.close(); }
})().catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
