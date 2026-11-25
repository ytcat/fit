// node qa/avatar-joins/studio.cjs <outDir> <variant> [pose,pose,...] [join,join,...]
// Close-ups of every join of one character variant (qa/avatar-joins/poses.js) in the real page (Chromium, SwiftShader,
// 402x690 viewport): the rig alone in a lit studio, each join from the front, side, back, below (chest height looking up)
// and 3/4, plus a full-body frame per pose. ROOT=<checkout> renders another tree (before pictures). Frames: <out>/<variant>/<pose>-<join>-<view>.png
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
const POSES_JS = fs.readFileSync(path.join(__dirname, 'poses.js'), 'utf8');
// join: [bone, offset in the bone's rig-space position (m), distance (m)]; views: yaw about the rig (0 = in front of its face), pitch
const JOINS = {
  full: ['hips', [0, .05, 0], 3.3], neck: ['neck', [0, .1, 0], 1.05], shoulderR: ['armR', [0, -.04, 0], 1.1], shoulderL: ['armL', [0, -.04, 0], 1.1],
  elbowR: ['elbowR', [0, 0, 0], .95], elbowL: ['elbowL', [0, 0, 0], .95], wristR: ['handR', [0, 0, 0], .8], wristL: ['handL', [0, 0, 0], .8],
  waist: ['hips', [0, .12, 0], 1.25], hipR: ['thighR', [0, -.08, 0], 1.15], kneeR: ['kneeR', [0, 0, 0], .95], ankleR: ['footR', [0, -.03, 0], .85], tail: ['hips', [0, -.05, -.15], 1.1]
};
const VIEWS = { front: [0, .08], side: [Math.PI / 2, .08], back: [Math.PI, .1], below: [.35, -.55], q34: [.75, .15] };
const save = (file, url) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); };
async function open() {
  const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* ignore */ } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`, { timeout: 300000 });
  await p.waitForFunction(() => window.app?.engine?.coach?.anatomy && window.StoryCast?.market && window.DreamPose && window.Paws, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (window.app?.engine) app.engine.isPlaying = false; });
  await p.addScriptTag({ content: POSES_JS });
  return { b, p, close: async () => { await b.close(); server.close(); } };
}
async function run(out, variant, poses, joins, views) {
  const { p, close } = await open();
  // paws and the TRELLIS heads come from workers / downloads: wait for them
  if (process.env.STUDIO_SETUP) await p.evaluate(process.env.STUDIO_SETUP); // QA experiments: e.g. window.__ajData = { ...app.engine.roster.data, shoulderCorrectives: null }
  await p.evaluate(async name => {
    const e = app.engine, c = window.__aj = AJ.make(name, window.__ajData || e.roster.data, e); const v = AJ.VARIANTS[name];
    if (v.cast && StoryCast.market?.heads?.[v.cast]) await StoryCast.market.heads[v.cast].ready(30000);
    const sp = Paws.speciesOf(c), wraps = v.outfit === 'track_wraps' || v.cast === 'rourke';
    for (const sh of Paws.shapes) Paws.request(sp, sh, wraps, 0);
    const t0 = performance.now(); while (performance.now() - t0 < 90000 && !Paws.shapes.every(sh => Paws.isReady(sp, sh, wraps))) await new Promise(r => setTimeout(r, 250));
  }, variant);
  if (process.env.STUDIO_AFTER) await p.evaluate(process.env.STUDIO_AFTER); // QA experiments on the built rig (window.__aj)
  const list = await p.evaluate(({ name, poses, joins, views, JOINS, VIEWS }) => {
    const e = app.engine, T = THREE, r = e.renderer, c = window.__aj, scene = new T.Scene(), frames = [];
    scene.background = new T.Color('#9aa6b4').convertSRGBToLinear();
    scene.add(new T.HemisphereLight(0xe4ecff, 0x7a6450, .75)); const sun = new T.DirectionalLight(0xfff1de, 1.8); sun.position.set(2.2, 4, 4.5); scene.add(sun);
    const rim = new T.DirectionalLight(0xc6d8ff, .65); rim.position.set(-3, 3, -4); scene.add(rim); const low = new T.DirectionalLight(0xffffff, .35); low.position.set(0, -2, 2); scene.add(low);
    scene.add(new T.Mesh(new T.CircleGeometry(5, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x7d848e, roughness: .95 })));
    c.root.parent?.remove(c.root); scene.add(c.root); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); c.root.visible = true;
    const W = 402, H = 690, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const cam = new T.PerspectiveCamera(30, W / H, .01, 50), buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
    const all = AJ.posesFor(name);
    for (const pose of poses) {
      const fn = all[pose]; if (!fn) continue;
      for (let k = 0; k < 3; k++) { fn(c); c.renderTime = c.renderTime; } // settle springs / paws
      c.root.updateMatrixWorld(true);
      for (const j of joins) {
        const [bone, off, dist] = JOINS[j], at = c.joints[bone].getWorldPosition(new T.Vector3()).add(new T.Vector3(off[0] * -1, off[1], off[2]));
        for (const vw of (j === 'full' ? ['front', 'q34'] : views)) {
          const sideSign = /R$/.test(j) ? -1 : 1, [yaw0, pitch] = VIEWS[vw], yaw = (vw === 'side' || vw === 'q34' || vw === 'below') ? yaw0 * sideSign : yaw0, d = dist; // R joints (rig +x, mirrored: world -x) from their own side
          cam.fov = 30; cam.aspect = W / H; cam.updateProjectionMatrix();
          cam.position.set(at.x + Math.sin(yaw) * Math.cos(pitch) * d, at.y + Math.sin(pitch) * d, at.z + Math.cos(yaw) * Math.cos(pitch) * d); cam.lookAt(at);
          c.root.updateMatrixWorld(true);
          r.setRenderTarget(rt); r.setClearColor(0, 1); r.clear(); r.render(scene, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null);
          for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0);
          frames.push({ name: pose + '-' + j + '-' + vw, url: cv.toDataURL('image/png') });
        }
      }
    }
    scene.remove(c.root);
    return frames;
  }, { name: variant, poses, joins, views, JOINS, VIEWS });
  for (const f of list) save(path.join(out, variant, f.name + '.png'), f.url);
  console.log(variant, list.length, 'frames');
  await close();
}
module.exports = { run, JOINS, VIEWS };
if (require.main === module) {
  const [out, variant, poses, joins, views] = process.argv.slice(2);
  const P = require('./poses.js');
  run(out, variant, poses ? poses.split(',') : Object.keys(P.posesFor(variant)), joins ? joins.split(',') : Object.keys(JOINS), views ? views.split(',') : Object.keys(VIEWS)).catch(e => { console.log('ERROR', e.stack || e); process.exit(1); });
}
