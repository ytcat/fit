// GOTR-0008 Gloryland map budget: per-mesh triangles, draw calls, texture memory and a frame-time
// sample. Usage: node qa/gotr-0008/map/budget.cjs [day|night] [view] [width] [height]
// Needs the static server on :8177 (see capture.cjs). Headless SwiftShader is a CPU rasteriser, so its
// frame time is an upper bound for desktop GPUs and NOT a phone measurement.
const { chromium } = require('playwright');
const URL = process.env.MAP_URL || 'http://127.0.0.1:8177/adventure/map-preview.html';
(async () => {
  const [time = 'day', view = 'full', w = '1280', h = '720'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: +w, height: +h } });
    await page.goto(`${URL}?view=${view}&time=${time}&ui=0&static=1&dpr=1&shadow=${process.env.SHADOW || 2048}`, { timeout: 600000 });
    await page.waitForFunction(() => window.GL_PREVIEW && window.GL_PREVIEW.map, null, { timeout: 600000 });
    const out = await page.evaluate(() => {
      const map = GL_PREVIEW.map, rows = [];
      map.group.traverse(o => {
        if (!o.isMesh && !o.isPoints) return;
        const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count;
        rows.push({ name: o.name || o.type, type: o.isInstancedMesh ? 'instanced' : o.isPoints ? 'points' : 'mesh', count: o.isInstancedMesh ? o.count : 1, tris: o.isPoints ? 0 : Math.round(n / 3 * (o.isInstancedMesh ? o.count : 1)), shadow: o.castShadow });
      });
      const gl = document.querySelector('canvas').getContext('webgl2') || document.querySelector('canvas').getContext('webgl');
      const r = GL_PREVIEW.info();
      const px = new Uint8Array(4), t = [];
      for (let k = 0; k < 6; k++) { const t0 = performance.now(); GL_PREVIEW.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t.push(performance.now() - t0); }
      t.sort((a, b) => a - b);
      // CPU cost of one frame on the main thread (scene traversal, culling, uniform upload, draw submission)
      const cpu = []; for (let k = 0; k < 8; k++) { const t0 = performance.now(); GL_PREVIEW.renderOnly(); cpu.push(performance.now() - t0); } cpu.sort((a, b) => a - b);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let texBytes = 0; const seen = new Map();
      map.group.traverse(o => {
        const mats = o.material ? [].concat(o.material) : [];
        for (const m of mats) {
          const list = [['map', m.map], ['emissiveMap', m.emissiveMap], ['dist', m.userData && m.userData.u && m.userData.u.wDist.value]];
          for (const [k, tx] of list) if (tx && tx.image && !seen.has(tx)) { const bytes = tx.image.width * tx.image.height * 4 * (tx.generateMipmaps === false || tx.isDataTexture ? 1 : 4 / 3); seen.set(tx, `${o.name}.${k} ${tx.image.width}x${tx.image.height} ${(bytes / 1048576).toFixed(1)} MB`); texBytes += bytes; }
        }
      });
      return { rows, cpuSubmitMs: +cpu[4].toFixed(1), textures: [...seen.values()], calls: r.calls, triangles: r.triangles, buildMs: Math.round(r.buildMs), medianFrameMs: Math.round(t[3]), minFrameMs: Math.round(t[0]), textureMB: +(texBytes / 1048576).toFixed(1), canvas: [gl.drawingBufferWidth, gl.drawingBufferHeight] };
    });
    out.rows.sort((a, b) => b.tris - a.tris);
    console.log(JSON.stringify({ time, view, size: `${w}x${h}`, calls: out.calls, trianglesDrawn: out.triangles, buildMs: out.buildMs, cpuSubmitMs: out.cpuSubmitMs, swiftshaderFrameMs: { median: out.medianFrameMs, min: out.minFrameMs }, textureMB: out.textureMB, meshes: out.rows.length }));
    for (const r of out.rows) console.log(`  ${r.name.padEnd(16)} ${r.type.padEnd(9)} x${String(r.count).padEnd(5)} ${String(r.tris).padStart(7)} tris${r.shadow ? '  casts shadow' : ''}`);
    console.log('  textures (plus the shadow map, SHADOW x SHADOW depth):'); for (const t of out.textures) console.log('    ' + t);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
