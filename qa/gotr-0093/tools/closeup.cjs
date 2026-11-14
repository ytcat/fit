// GOTR-0093 evidence: the Fighter in street clothes, close, in a neutral studio (the game's renderer settings).
//   node qa/gotr-0093/tools/closeup.cjs <name> [shots]
// shots: comma list of species:view[:pose[:t]]  view = front | q34 | side | back | top | low | face
//        pose = idle | walk | strap | talk | up | bend | guard | punch | sit | cross  (t = scene seconds / walk distance)
// Env: APP_URL (default http://127.0.0.1:18791/), W/H (default 402x690), COLS, KIT=1 (boxing kit), OLD=1 (the old painted-on clothes)
// Writes qa/gotr-0093/<name>.webp (a labelled sheet) and prints the draw calls / triangles of the dressed rig.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:18791/', OUT = path.join(__dirname, '..');
(async () => {
  const [name = 'closeup', list = 'lion:front,lion:q34,lion:side,lion:back,rabbit:front,rabbit:q34,rabbit:side,rabbit:back'] = process.argv.slice(2);
  const W = +(process.env.W || 402), H = +(process.env.H || 690), shots = list.split(',').map(s => { const [species, view, pose = 'idle', t = '1'] = s.split(':'); return { species, view, pose, t: +t }; });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } }), log = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message)); p.on('console', m => { if (['error'].includes(m.type())) log.push(m.type() + ' ' + m.text().slice(0, 240)); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private */ } });
  if (process.env.OLD) await p.route('**/street-wear.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && window.app?.engine?.coach?.anatomy && window.StoryCast && window.DreamPose, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); try { window.StoryScenes?.stop?.(); } catch { /* none */ } });
  const files = [], stats = [];
  for (const [k, s] of shots.entries()) {
    const r = await p.evaluate(async ({ s, W, H, kit, hide, outfit }) => {
      const T = THREE, e = app.engine, V = (x, y, z) => new T.Vector3(x, y, z);
      if (!window.__studio) {
        const R = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); const src = e.renderer;
        R.outputEncoding = src.outputEncoding; R.toneMapping = src.toneMapping; R.toneMappingExposure = src.toneMappingExposure; R.physicallyCorrectLights = src.physicallyCorrectLights; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
        const sc = new T.Scene(); sc.background = new T.Color(0x9aa6b2);
        sc.add(new T.HemisphereLight(0xdfe8f5, 0x5a5048, .75)); const key = new T.DirectionalLight(0xfff2e0, 1.15); key.position.set(2.2, 4.2, 3.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.6, bottom: -.2, near: .5, far: 12 }); key.shadow.bias = -.0004; sc.add(key);
        const rim = new T.DirectionalLight(0xc9d8ff, .45); rim.position.set(-2.5, 2.5, -3); sc.add(rim);
        const floor = new T.Mesh(new T.CircleGeometry(4, 48), new T.MeshStandardMaterial({ color: 0x8c8a86, roughness: .95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
        window.__studio = { R, sc, rigs: {} };
      }
      const S = window.__studio; S.R.setSize(W, H, false); S.R.setPixelRatio(1);
      let c = S.rigs[s.species]; if (!c) { c = S.rigs[s.species] = new LionCoach(e.roster?.data || e.arena?.data, { species: s.species }); S.sc.add(c.root); c.root.scale.set(-1, 1, 1); }
      for (const o of Object.values(S.rigs)) o.root.visible = o === c;
      const t0 = performance.now();
      if (kit) { StoryCast.bag(c, 'off'); StoryCast.outfit(c, 'kit'); } else { StoryCast.outfit(c, outfit || 'street'); StoryCast.bag(c, s.pose === 'guard' || s.pose === 'punch' || s.pose === 'up' ? 'off' : 'shoulder'); }
      const dressMs = performance.now() - t0;
      const G = DreamPose.GESTURES; G.__up = G.__up || { h: [.26, 2.12, .12], pole: [.6, -.2, -.6], palm: [0, 0, 1], turn: .4 }; G.__wave = G.__wave || { h: [.34, 1.86, .24], pole: [.8, -.8, -.2], palm: [0, 0, 1], turn: .5 };
      DreamPose.reset(c); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0);
      const pose = (t, o) => { for (let i = 0; i < 4; i++) DreamPose.civil(c, { t, dist: 0, ...o, dt: i ? .5 : 0 }); };
      if (s.pose === 'walk') { for (let i = 0; i <= 40; i++) { const d = s.t - .04 * (40 - i); c.root.position.z = 0; DreamPose.civil(c, { t: d / 1.3, dist: d, walk: 1, dt: i ? 1 / 30 : 0 }); } }
      else if (s.pose === 'strap') pose(s.t, { arms: { R: 'strap' } });
      else if (s.pose === 'talk') pose(s.t, { arms: { L: 'open', R: 'open' }, talk: .6, look: { yaw: .2, pitch: .05 } });
      else if (s.pose === 'cross') pose(s.t, { arms: { L: 'cross', R: 'cross2' } });
      else if (s.pose === 'up') pose(s.t, { arms: { L: '__up', R: '__up' }, look: { yaw: 0, pitch: .3 } });
      else if (s.pose === 'bend') pose(s.t, { lean: .45, drop: .12, arms: { L: 'carry', R: 'carry' } });
      else if (s.pose === 'guard') { for (let i = 0; i < 3; i++) c.update(s.t, 'guard', 'one_two', { guardCover: 1 }); }
      else if (s.pose === 'punch') { for (let i = 0; i < 3; i++) c.update(s.t, 'combo', 'one_two'); }
      if (s.pose === 'guard' || s.pose === 'punch') c.pawCurl = null; // a boxing pose: the bare paws close into fists
      else pose(s.t, {});
      if (hide) c.root.traverse(o => { if (o.isMesh && new RegExp(hide).test(o.name || '(unnamed)')) o.visible = false; });
      const names = []; if (hide) c.root.traverse(o => { if (o.isMesh && o.visible) names.push(o.name || '(unnamed)@' + o.parent?.name); });
      c.root.updateMatrixWorld(true);
      const yaw = { front: 0, q34: .62, side: 1.5708, back: Math.PI, top: .4, low: .5, face: .35 }[s.view] ?? 0;
      const close = s.view === 'face' ? [1.5, 1.25] : s.view === 'top' ? [1.35, 1.7] : s.view === 'low' ? [.4, 1.5] : [1.08, 4.1];
      const cam = new T.PerspectiveCamera(s.view === 'face' ? 30 : 34, W / H, .05, 40), dist = close[1], ty = close[0], cy = s.view === 'top' ? 2.4 : s.view === 'low' ? .35 : ty + .1;
      cam.position.set(Math.sin(yaw) * dist, cy, Math.cos(yaw) * dist); cam.lookAt(0, ty, 0);
      if (/^(hand|palm)/.test(s.view)) { const hj = c.joints[s.view.endsWith('L') ? 'handL' : 'handR'], hp = hj.localToWorld(new T.Vector3(0, -.07, 0)), pn = hj.localToWorld(new T.Vector3(0, -.07, 1)).sub(hp).normalize(), side = new T.Vector3(0, 1, 0).cross(pn).normalize();
        const dir = (s.view.startsWith('palm') ? pn.clone() : pn.clone().negate()).addScaledVector(side, .35).add(new T.Vector3(0, .25, 0)).normalize(); cam.fov = 26; cam.updateProjectionMatrix(); cam.position.copy(hp).addScaledVector(dir, .62); cam.lookAt(hp); }
      if (s.view.startsWith('paw')) { // the right paw alone (and its wraps), in the hand frame: -y to the knuckles, +z the palm
        const sc2 = new T.Scene(); sc2.background = new T.Color(0x9aa6b2); sc2.add(new T.HemisphereLight(0xdfe8f5, 0x5a5048, .8)); const k2 = new T.DirectionalLight(0xfff2e0, 1.1); k2.position.set(.6, 1.2, .9); sc2.add(k2); const r2 = new T.DirectionalLight(0xc9d8ff, .5); r2.position.set(-1, .3, -1); sc2.add(r2);
        const g = new T.Group(); sc2.add(g); const v = window.LionPaws?.curl(c, 'R') ?? 1;
        c.joints.handR.children.forEach(o => { if (o.isMesh && o.visible) { const m = new T.Mesh(o.geometry, o.material); m.matrix.copy(o.matrix); m.matrixAutoUpdate = false; if (o.morphTargetInfluences) { m.updateMorphTargets(); m.morphTargetInfluences[0] = v; } g.add(m); } });
        const wrist = new T.Mesh(new T.CylinderGeometry(.052, .058, .16, 24), new T.MeshStandardMaterial({ color: c.species === 'rabbit' ? 0x8d95a1 : 0xa8733a, roughness: .9 })); wrist.position.set(0, .085, 0); g.add(wrist);
        const at = new T.Vector3(0, -.085, .01), dir = { pawback: [.25, .35, -1], pawpalm: [.2, .3, 1], pawside: [-1, .3, .25], pawfront: [0, -1, .35] }[s.view] || [0, .3, -1];
        const c2 = new T.PerspectiveCamera(30, W / H, .01, 10); c2.position.copy(at).add(new T.Vector3(...dir).normalize().multiplyScalar(.62)); c2.up.set(0, 1, 0); if (s.view === 'pawfront') c2.up.set(0, 0, -1); c2.lookAt(at);
        S.R.info.reset(); S.R.render(sc2, c2);
        return { url: S.R.domElement.toDataURL('image/png'), calls: 0, tris: 0, info: { ...S.R.info.render }, dressMs: 0, names: '' };
      }
      S.R.info.reset(); S.R.render(S.sc, cam);
      let calls = 0, tris = 0; c.root.traverse(o => { let v = o.visible, q = o; while (v && q.parent && q !== c.root) { q = q.parent; v = q.visible; } if (o.isMesh && v) { calls++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
      return { url: S.R.domElement.toDataURL('image/png'), calls, tris: Math.round(tris), info: { ...S.R.info.render }, dressMs: Math.round(dressMs), names: names.join(';') };
    }, { s, W, H, kit: !!process.env.KIT, hide: process.env.HIDE || '', outfit: process.env.OUTFIT || '' });
    const f = path.join(OUT, `.${name}-${k}.png`); fs.writeFileSync(f, Buffer.from(r.url.split(',')[1], 'base64')); files.push(f);
    const label = `${s.species} ${s.view} ${s.pose}${s.pose === 'walk' ? ' ' + s.t : ''}`; stats.push({ label, calls: r.calls, tris: r.tris, render: r.info, dressMs: r.dressMs }); console.log(label, JSON.stringify(stats[stats.length - 1]));
  }
  console.log('console', log.length ? log.join(' | ') : 'clean'); await b.close();
  const py = `
import sys
from PIL import Image, ImageDraw
out, cols, labels, files = sys.argv[1], int(sys.argv[2]), sys.argv[3].split('|'), sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size; cols = cols or len(ims); rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * w, rows * h), (16, 18, 22)); d = ImageDraw.Draw(sheet)
for i, (im, l) in enumerate(zip(ims, labels)):
    x, y = (i % cols) * w, (i // cols) * h; sheet.paste(im, (x, y)); d.rectangle([x, y, x + 8 + 7 * len(l), y + 16], fill=(0, 0, 0)); d.text((x + 4, y + 2), l, fill=(255, 255, 255))
sheet.save(out, quality=84)
`;
  execFileSync('python3', ['-c', py, path.join(OUT, name + '.webp'), process.env.COLS || '0', stats.map(s => s.label).join('|'), ...files]);
  files.forEach(f => fs.unlinkSync(f));
})().catch(e => { console.error(e); process.exit(1); });
