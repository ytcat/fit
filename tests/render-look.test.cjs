// Render realism (2026-11-22): image-based light per place (render-look.js). Without WebGL the PMREM step is stubbed: what
// is checked is the bookkeeping that keeps the sets' tuned light level and leaves everything as found.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
global.document = { createElement: () => ({ getContext: () => new Proxy({ createRadialGradient: () => ({ addColorStop() { } }) }, { get: (o, k) => o[k] || (() => { }) }) }) };
let rafs = []; global.requestAnimationFrame = f => rafs.push(f); const flush = () => { const r = rafs; rafs = []; r.forEach(f => f(0)); };
// a PMREM stand-in: records the environment scene it was given
let made = 0, lastScene = null, disposed = 0;
THREE.PMREMGenerator = class { constructor() { } fromScene(s) { made++; lastScene = s; return { texture: new THREE.Texture(), dispose() { disposed++; } }; } dispose() { } };
vm.runInThisContext(fs.readFileSync('render-look.js', 'utf8'), { filename: 'render-look.js' });
const RL = window.RenderLook, renderer = { toneMappingExposure: 1.05, shadowMap: { enabled: true } };
const sum = (scene, f) => { let n = 0; scene.traverse(o => { if (o.isHemisphereLight && o.visible) n += f(o); }); return n; };

// ---- a film set: hemisphere + sun, a city material with its own environment, a fur material, a metal and a wet nose
{
  const scene = new THREE.Scene(), hemi = new THREE.HemisphereLight(0xc4dcff, 0xdcb98c, .54), sun = new THREE.DirectionalLight(0xffd7a3, 2.05);
  sun.position.set(23, 17.6, 27.2); scene.add(hemi, sun, sun.target);
  const own = new THREE.Texture(), city = new THREE.MeshStandardMaterial({ envMap: own, envMapIntensity: .35 }), fur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94 });
  const metal = new THREE.MeshStandardMaterial({ metalness: .8, roughness: .3 }), nose = new THREE.MeshPhysicalMaterial({ color: 0x201715, roughness: .28, clearcoat: .35 }), basic = new THREE.MeshBasicMaterial();
  for (const m of [city, fur, metal, nose, basic]) scene.add(new THREE.Mesh(new THREE.BoxGeometry(), m));
  const lightsBefore = []; scene.traverse(o => { if (o.isLight) lightsBefore.push(o.uuid); });
  const h = RL.attach(scene, renderer, { look: 'day', high: true, sun });
  assert.ok(h && h.isHigh && h.env, 'environment built');
  assert.equal(scene.environment, h.env.texture);
  // the hemisphere's share moves into the environment: total hemisphere intensity drops by exactly the share
  const share = RL.LOOKS.day.share; assert.ok(Math.abs(sum(scene, o => o.intensity) - .54 * (1 - share)) < 1e-9, 'anti hemisphere = -share');
  // the environment's sky and ground carry that share (radiance = irradiance / pi): the dome's top and bottom vertices
  let dome = null; lastScene.traverse(o => { if (o.isMesh && o.geometry.attributes.color && !dome) dome = o; });
  const pos = dome.geometry.attributes.position, col = dome.geometry.attributes.color; let top = -1, bottom = -1;
  for (let i = 0; i < pos.count; i++) { if (top < 0 || pos.getY(i) > pos.getY(top)) top = i; if (bottom < 0 || pos.getY(i) < pos.getY(bottom)) bottom = i; }
  const sky = new THREE.Color(0xc4dcff).multiplyScalar(.54 * share / Math.PI), ground = new THREE.Color(0xdcb98c).multiplyScalar(.54 * share / Math.PI);
  assert.ok(Math.abs(col.getX(bottom) - ground.r) < 1e-4 && Math.abs(col.getZ(bottom) - ground.b) < 1e-4, 'ground radiance');
  assert.ok(Math.abs(col.getZ(top) - sky.b) < .02, 'sky radiance at the zenith (plus a little sun glow)');
  // materials: one environment for all; families
  scene.onBeforeRender(renderer, scene, null); scene.onBeforeRender(renderer, scene, null);
  assert.equal(city.envMap, null, 'the city material takes the set environment while attached');
  assert.equal(metal.envMapIntensity, 1.15); assert.equal(fur.envMapIntensity, .92); assert.equal(nose.envMapIntensity, .5);
  // a change of the place's light rebuilds the environment outside the render, and the anti light follows at once
  hemi.intensity = .7; for (let k = 0; k < 31; k++) scene.onBeforeRender(renderer, scene, null);
  assert.ok(Math.abs(sum(scene, o => o.intensity) - .7 * (1 - share)) < 1e-9, 'anti light follows');
  const n0 = made; flush(); assert.equal(made, n0 + 1, 'rebuilt once, outside the render');
  // low: nothing of the look is left in the picture
  h.high(false);
  assert.equal(scene.environment, null); assert.ok(Math.abs(sum(scene, o => o.intensity) - .7) < 1e-9, 'hemisphere whole again');
  assert.equal(city.envMap, own); assert.equal(city.envMapIntensity, .35); assert.equal(metal.envMapIntensity, 1);
  h.high(true); h.dispose();
  const lightsAfter = []; scene.traverse(o => { if (o.isLight) lightsAfter.push(o.uuid); });
  assert.deepEqual(lightsAfter, lightsBefore, 'no light left behind'); assert.equal(Object.hasOwn(scene, 'onBeforeRender'), false, 'hook removed');
  assert.equal(scene.environment, null); assert.equal(city.envMap, own); assert.equal(renderer.toneMappingExposure, 1.05);
  assert.equal(RL._cache.size, 0, 'environment released');
}
// ---- 'low' from the start: no environment, no anti light, no practical lamps
{
  const scene = new THREE.Scene(), hemi = new THREE.HemisphereLight(0xfff1dc, 0x9a7a5c, .78); scene.add(hemi);
  const n0 = made, h = RL.attach(scene, renderer, { look: 'gym', high: false, focus: [0, 0] });
  scene.onBeforeRender(renderer, scene, null);
  let lit = 0; scene.traverse(o => { if (o.isLight && o.visible && o !== hemi) lit++; });
  assert.equal(made, n0); assert.equal(scene.environment, null); assert.equal(lit, 0, 'no extra light on low');
  assert.ok(h.sunDir && h.sunDir.x > .5, 'the gym light comes through the right-hand windows on every tier');
  h.high(true); let lamps = 0; scene.traverse(o => { if (o.isPointLight && o.visible) lamps++; }); assert.equal(lamps, RL.LOOKS.gym.rig.n, 'practical lamps on high');
  h.dispose(); let left = 0; scene.traverse(o => { if (o.isLight && o !== hemi) left++; }); assert.equal(left, 0);
}
// ---- a hook installed by someone else after the look stays working when the look goes
{
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, .5));
  const h = RL.attach(scene, renderer, { look: 'shop', high: true }); let calls = 0; const prev = scene.onBeforeRender; scene.onBeforeRender = function (...a) { prev.apply(this, a); calls++; };
  const theirs = scene.onBeforeRender; h.dispose(); assert.equal(scene.onBeforeRender, theirs, 'a later hook is not removed'); scene.onBeforeRender(renderer, scene, null); assert.equal(calls, 1);
}
// ---- the engine: contact shadows only where no real shadow falls; the ring shadow box
{
  const scene = new THREE.Scene(), hemi = new THREE.HemisphereLight(0xdbeaff, 0x404040, .48), key = new THREE.DirectionalLight(0xfffaed, 2.8); scene.add(hemi, key);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  const rig = () => { const root = new THREE.Group(), footL = new THREE.Object3D(), footR = new THREE.Object3D(); footL.position.set(-.15, .06, 0); footR.position.set(.15, .06, .2); root.add(footL, footR); scene.add(root); return { root, joints: { footL, footR } }; };
  const a = rig(), b = rig(); b.root.position.x = 1.2;
  const e = { scene, renderer: { toneMappingExposure: 1.05, shadowMap: { enabled: true } }, keyLight: key, qualityLevel: 3, arena: { fightView: { coaches: { lion: a, rabbit: b } } }, world: { arena: { children: [], visible: true } } };
  const E = RL.engine(e), shown = () => { let n = 0; scene.traverse(o => { if (o.name === 'contact shadow' && o.visible) n++; }); return n; };
  scene.updateMatrixWorld(true); scene.onBeforeRender(e.renderer, scene, null);
  assert.equal(shown(), 0, 'shadow pass on: no contact shadows'); assert.equal(key.shadow.camera.right, 3.2, 'shadow box fitted to the ring');
  e.renderer.shadowMap.enabled = false; scene.onBeforeRender(e.renderer, scene, null); assert.equal(shown(), 6, 'two feet and a body per fighter');
  e.renderer.shadowMap.enabled = true; e.arena.fightView.ringless = { id: 'street' }; scene.onBeforeRender(e.renderer, scene, null); assert.equal(shown(), 6, 'baked venue floor: contact shadows');
  e.arena.fightView = null; e.activeModel = null; scene.onBeforeRender(e.renderer, scene, null); assert.equal(shown(), 0); assert.equal(key.shadow.camera.right, 5, 'training: the hall box');
  E.dispose(); assert.equal(Object.hasOwn(scene, 'onBeforeRender'), false); let extra = 0; scene.traverse(o => { if (o.name === 'contact shadow' || o.name === 'RenderLook' || (o.isLight && o !== hemi && o !== key)) extra++; }); assert.equal(extra, 0);
}
// ---- the films wire it per place and give it back
{
  const src = fs.readFileSync('adventure/story/dream-scenes.js', 'utf8');
  assert.match(src, /LOOK_OF = \{ dream_street: 'day', dream_market: 'market', dream_shop: 'shop', dream_gym: 'gym'/);
  assert.ok(!/dream_docks:/.test(src.match(/LOOK_OF = \{[^}]*\}/)[0]), 'the Docks keep their own tuned night');
  assert.match(src, /high: quality !== 'low'/); assert.match(src, /rlook\?\.dispose\(\)/); assert.match(src, /function lowQuality\(\) \{ hi = false; rlook\?\.high\(false\);/);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.indexOf('render-look.js') > html.indexOf('three.min.js') && html.indexOf('render-look.js') < html.indexOf('boxing-coach-v2.js'), 'loaded right after three');
}
console.log('render-look: ok');
