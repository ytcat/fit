/* Story sets (GOTR-0056 layer 2): compact street-scale 3D sets in the visual style of the Gloryland map. The houses are
 * the map's own pieces (GlorylandMap.kit: facade textures, tinted facade material, roofs, awnings) at 3 m per map unit;
 * streets and props are merged vertex-coloured geometry; all signs share one small canvas atlas. Morning light: a low
 * warm sun with long shadows, a warm sky gradient and light haze. Built only when a scene plays, disposed after.
 *
 * STABLE API (other chapters add their own sets from their own file):
 *   StorySets.ready() -> Promise                      loads the map script for its building kit
 *   StorySets.build(id, scene, { renderer, shadows }) -> { id, group, objects, focus(x, z, r), stats(), dispose() }
 *   StorySets.register(id, ctx => focus)              a new set. ctx = { K, PAL, C, S (street batch, metres), objects,
 *       box, cyl, house, road, pave, curb, dashes, tree, lamp, bin, planter, bollard, wheel, car, sign, picto, movable(batch, name) }
 *       glow (batch of unlit bright things: bulbs, lantern glass), pool(x, z, r, hex) (light pool on the ground)
 *       return { x, z, r, time?: 'morning' | 'evening' } (where the sun's shadow box starts; evening = low orange sun,
 *       dusk sky, lit windows). Built-in sets: 'busstop', 'gymfront' (morning), 'market' (evening).
 *   objects of the built-in sets: busstop { bus } ; gymfront { bag, stand, cyclist, pillow, wraps } ; market { whistle,
 *       balloon, balloon2 (gold), pigeon, crate, crate2, bar, bar2, basket } (hidden until a scene or trial uses them)
 * World: metres, y up, the street runs along x, the camera side is +z. Walking surfaces are at y = 0, the road at -0.15. */
(() => {
  const MAP_SRC = './adventure/gloryland-map.js?v=2026111100';
  let loader = null;
  function ready() {
    if (window.GlorylandMap?.kit) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = MAP_SRC; s.onload = () => window.GlorylandMap?.kit ? resolve() : reject(Error('map kit')); s.onerror = () => { loader = null; reject(Error('map script')); }; document.head.append(s); });
    return loader;
  }
  const U = 3, TAU = Math.PI * 2; // metres per map unit
  const SETS = {};
  // Sign atlas cells (px in a 512 x 256 canvas): gym glove board, bus route board, four shop pictograms.
  const CELL = { gym: [0, 0, 256, 128], route: [256, 0, 256, 128], bread: [0, 128, 128, 128], cup: [128, 128, 128, 128], flower: [256, 128, 128, 128], book: [384, 128, 128, 128] };
  function paintSigns() {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
    // gym: two red gloves on a dark board with a gold rim
    g.fillStyle = '#141a26'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#f4c152'; g.lineWidth = 7; g.strokeRect(7, 7, 242, 114);
    for (const [cx, flip] of [[88, 1], [168, -1]]) { g.save(); g.translate(cx, 62); g.scale(flip, 1); g.rotate(-.18); g.fillStyle = '#e63946'; g.beginPath(); g.ellipse(0, -6, 29, 33, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-24, 2, 12, 18, -.4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(6, -18, 12, 8, -.5, 0, TAU); g.fill(); g.fillStyle = '#f3f6fb'; g.fillRect(-20, 26, 40, 15); g.fillStyle = '#c9ced8'; g.fillRect(-20, 31, 40, 3); g.restore(); }
    // bus route board: amber on black, like a roller blind
    g.fillStyle = '#12151b'; g.fillRect(256, 0, 256, 128); g.fillStyle = '#ffb52e'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = '900 60px "Inter Display","Inter","Arial Black",Impact,system-ui,sans-serif'; g.fillText('12', 300, 66); g.font = '900 34px "Inter Display","Inter","Arial Black",Impact,system-ui,sans-serif'; g.fillText('GLORYLAND', 420, 66, 164);
    // shop pictograms on enamel plates
    const plate = (i, bg) => { const x = i * 128; g.fillStyle = '#f7f0dc'; g.fillRect(x, 128, 128, 128); g.fillStyle = bg; g.beginPath(); g.arc(x + 64, 192, 52, 0, TAU); g.fill(); return x + 64; };
    let x = plate(0, '#c9653d'); g.fillStyle = '#f6d58a'; g.beginPath(); g.ellipse(x, 196, 36, 22, 0, 0, TAU); g.fill(); g.strokeStyle = '#a8742c'; g.lineWidth = 5; for (const d of [-16, 0, 16]) { g.beginPath(); g.moveTo(x + d - 6, 182); g.lineTo(x + d + 6, 206); g.stroke(); }
    x = plate(1, '#2fa59a'); g.fillStyle = '#fff'; g.fillRect(x - 24, 176, 40, 34); g.beginPath(); g.arc(x + 20, 192, 11, -1.4, 1.4); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); g.fillRect(x - 32, 214, 58, 6); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; for (const d of [-14, 0]) { g.beginPath(); g.moveTo(x + d, 168); g.quadraticCurveTo(x + d + 8, 160, x + d, 152); g.stroke(); }
    x = plate(2, '#d63d6d'); g.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + Math.cos(k / 6 * TAU) * 20, 190 + Math.sin(k / 6 * TAU) * 20, 13, 13, 0, 0, TAU); g.fill(); } g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(x, 190, 11, 0, TAU); g.fill();
    x = plate(3, '#3c7fc0'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, 172); g.lineTo(x - 36, 164); g.lineTo(x - 36, 214); g.lineTo(x, 222); g.lineTo(x + 36, 214); g.lineTo(x + 36, 164); g.closePath(); g.fill(); g.strokeStyle = '#3c7fc0'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 172); g.lineTo(x, 222); g.stroke();
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function skyTexture(evening) {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    const stops = evening ? [[0, '#27306e'], [.3, '#5a4a92'], [.5, '#b2648f'], [.66, '#f28a52'], [.8, '#ffc27a'], [1, '#f0a763']] : [[0, '#6fa8de'], [.38, '#a9cdea'], [.6, '#e6dccb'], [.74, '#ffd9a6'], [1, '#f6c58e']];
    for (const [k, c] of stops) gr.addColorStop(k, c);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }

  function build(id, scene, opts = {}) {
    const K = window.GlorylandMap.kit, PAL = window.GlorylandMap.PAL, C = K.C, P = K.P, M = K.M;
    K.initProtos(); K.seed(id === 'busstop' ? 4021 : 7333);
    const group = new THREE.Group(); group.name = 'Story set ' + id;
    const disposables = [], objects = {};
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: 0 }); disposables.push(mat);
    const signTex = paintSigns(), signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: .7 }); disposables.push(signTex, signMat);
    const S = new K.Batch(), SG = new K.Batch({ uv: true }), G = new K.Batch(), PL = new K.Batch({ uv: true }); // street + props (metres), sign quads, unlit glow, light pools
    const W = { solid: new K.Batch(), facade: {} }; // map-unit houses
    for (const s of Object.keys(K.FACADE)) W.facade[s] = new K.Batch({ uv: true, tint: true });
    const col = c => typeof c === 'string' ? C(c) : c, white = C('#ffffff');
    const box = (B, x, y, z, sx, sy, sz, c, ry = 0, o) => B.add(P.box, M(x, y, z, sx, sy, sz, ry), col(c), o);
    const cyl = (B, x, y, z, r, h, c, proto = P.cyl8, rx = 0, rz = 0, r2) => B.add(proto, M(x, y, z, r, h, r2 ?? r, 0, rx, rz), col(c));
    const house = o => K.building(W, { ...o, x: o.x / U, z: o.z / U, w: o.w / U, d: o.d / U, y0: 0, tint: C(o.tint) });
    /** A sign quad from the atlas, centred at (x, y, z), facing +z when ry = 0. */
    const sign = (cell, x, y, z, w, h, ry = 0, B = SG) => {
      const [px, py, pw, ph] = CELL[cell], u0 = px / 512, u1 = (px + pw) / 512, v1 = 1 - py / 256, v0 = 1 - (py + ph) / 256, c = Math.cos(ry), s = Math.sin(ry), pt = (lx, yy) => [x + lx * c, yy, z - lx * s];
      B.quad(pt(-w / 2, y - h / 2), pt(w / 2, y - h / 2), pt(w / 2, y + h / 2), pt(-w / 2, y + h / 2), white, white, [u0, v0, u1, v0, u1, v1, u0, v1]);
    };
    /** Round enamel shop sign on a wall bracket above an awning. */
    const picto = (cell, x, y, z) => { box(S, x, y - .5, z - .06, 1.1, 1.0, .06, '#3b4350'); sign(cell, x, y, z + .01, .96, .96); };
    const shade = (x, z, w, d, onRoad) => box(S, x - .12, onRoad ? -.1485 : .002, z - .14, w, .006, d, onRoad ? '#474e5c' : '#cfc6b4');
    const plinth = (x0, x1, z) => { box(S, (x0 + x1) / 2, 0, z, x1 - x0, .22, .14, '#b3a892'); box(S, (x0 + x1) / 2, .001, z + .16, x1 - x0, .006, .3, '#d3cab8'); };
    const road = (x0, x1, z0, z1) => box(S, (x0 + x1) / 2, -.45, (z0 + z1) / 2, x1 - x0, .3, z1 - z0, PAL.asphalt);
    const pave = (x0, x1, z0, z1, c = PAL.pave) => { box(S, (x0 + x1) / 2, -.4, (z0 + z1) / 2, x1 - x0, .4, z1 - z0, c); };
    // paving joints: thin darker lines every 2 m so the ground reads as slabs, not a flat colour
    const joints = (x0, x1, z0, z1) => { for (let x = Math.ceil(x0 / 2) * 2; x < x1; x += 2) box(S, x, -.004, (z0 + z1) / 2, .04, .008, z1 - z0, '#cfc5b2'); for (let z = Math.ceil(z0 / 2) * 2; z < z1; z += 2) box(S, (x0 + x1) / 2, -.004, z, x1 - x0, .008, .04, '#cfc5b2'); };
    const curb = (x0, x1, z) => { box(S, (x0 + x1) / 2, -.2, z, x1 - x0, .21, .24, PAL.curb); box(S, (x0 + x1) / 2, -.151, z + (z > 0 ? -.3 : .3), x1 - x0, .012, .34, '#4c5463'); };
    const dashes = (x0, x1, z) => { for (let x = x0; x < x1; x += 4) box(S, x + 1, -.149, z, 2, .01, .14, PAL.line); };
    const tree = (x, z, h = 4.6) => {
      cyl(S, x, 0, z, .15, h * .52, PAL.trunk, P.cyl6); cyl(S, x, 0, z, .24, .25, '#7a5a3f', P.cyl6);
      const L = PAL.leaf, k = Math.abs(Math.round(x * 3));
      S.add(P.ico1, M(x, h * .62, z, 1.3, 1.25, 1.3, x), C(L[k % L.length])); S.add(P.ico1, M(x + .62, h * .78, z - .25, .85, .8, .85, 1), C(L[(k + 2) % L.length])); S.add(P.ico1, M(x - .55, h * .74, z + .3, .8, .75, .8, 2), C(L[(k + 1) % L.length])); S.add(P.ico1, M(x + .1, h * .95, z, .7, .6, .7, 3), C(L[(k + 4) % L.length]));
      box(S, x, -.003, z, 1.3, .012, 1.3, '#8c7a63'); box(S, x, .0, z, 1.42, .05, .08, '#b9ad98'); for (const d of [-.67, .67]) { box(S, x + d, 0, z, .08, .05, 1.42, '#b9ad98'); box(S, x, 0, z + d, 1.42, .05, .08, '#b9ad98'); }
    };
    // Old Town lantern post
    const lamp = (x, z) => { shade(x, z, .5, .5); cyl(S, x, 0, z, .14, .5, '#2f3640', P.cyl8); cyl(S, x, .5, z, .06, 3.1, '#2f3640', P.cyl6); cyl(S, x, 3.55, z, .12, .06, '#2f3640', P.cyl6); cyl(S, x, 3.61, z, .19, .36, '#fff0c4', P.cyl6); S.add(P.cone6, M(x, 3.97, z, .28, .2, .28), C('#2f3640')); cyl(S, x, 4.17, z, .03, .1, '#2f3640', P.cyl6); box(S, x + .22, 3.2, z, .5, .04, .04, '#2f3640'); };
    const bin = (x, z) => { shade(x, z, .7, .7); cyl(S, x, 0, z, .26, .82, '#4f7a5a', P.cyl8); cyl(S, x, .82, z, .3, .07, '#3c5c45', P.cyl8); cyl(S, x, .3, z, .275, .05, '#3c5c45', P.cyl8); };
    const planter = (x, z, w = 1.1) => { shade(x, z, w + .25, .75); box(S, x, 0, z, w, .46, .5, '#b5643e', 0, { ao: .28 }); box(S, x, .44, z, w + .06, .06, .56, '#c97250'); for (let k = 0; k < 3; k++) S.add(P.ico, M(x - w * .3 + k * w * .3, .58, z, .3, .26, .26, k), C(PAL.leaf[(k * 2 + 1) % PAL.leaf.length])); for (const [d, c] of [[-.35, '#ff8fb1'], [.05, '#ffd166'], [.38, '#ff8fb1']]) S.add(P.ico, M(x + d, .78, z + .08, .07, .07, .07), C(c)); };
    const bollard = (x, z) => { cyl(S, x, 0, z, .08, .8, '#3b4350', P.cyl6); cyl(S, x, .8, z, .1, .06, '#f4c152', P.cyl6); };
    const wheel = (B, x, y, z, r, w) => { B.add(P.cyl12, M(x, y, z - w / 2, r, w, r, 0, Math.PI / 2), C('#1c1f25')); B.add(P.cyl12, M(x, y, z - w / 2 - .012, r * .62, w + .024, r * .62, 0, Math.PI / 2), C('#c9ccd2')); B.add(P.cyl8, M(x, y, z - w / 2 - .03, r * .2, w + .06, r * .2, 0, Math.PI / 2), C('#6b7280')); };
    /** Parked car along x on the road (y -0.15). dir = +1 faces +x. */
    const car = (x, z, c, dir = 1) => {
      const y = -.15; shade(x, z, 4.5, 2.1, true); box(S, x, y + .28, z, 4.1, .5, 1.72, c); box(S, x - dir * .15, y + .76, z, 2.3, .5, 1.56, c); box(S, x, y + .2, z, 4.2, .14, 1.76, '#2a2f38');
      for (const s of [-1, 1]) { box(S, x - dir * .15, y + .82, z + s * .785, 2.0, .34, .02, '#2c3e50'); box(S, x - dir * .15, y + .82, z + s * .79, .06, .36, .02, c); wheel(S, x - 1.3, y + .32, z + s * .78 + (s > 0 ? .2 : 0), .32, .2); wheel(S, x + 1.3, y + .32, z + s * .78 + (s > 0 ? .2 : 0), .32, .2); }
      box(S, x + dir * 1.01, y + .8, z, .04, .36, 1.4, '#2c3e50'); box(S, x - dir * 1.31, y + .8, z, .04, .34, 1.4, '#2c3e50');
      for (const s of [-1, 1]) { box(S, x + dir * 2.06, y + .46, z + s * .6, .03, .14, .34, '#fff6d8'); box(S, x - dir * 2.06, y + .46, z + s * .6, .03, .12, .34, '#d9473b'); }
    };
    const add = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; group.add(m); disposables.push(m.geometry, m.material); return m; };
    /** A movable object made from its own batch (one draw call). */
    const movable = (B, name) => { const m = add(new THREE.Mesh(B.geometry(), mat)); m.name = name; return m; };
    // hazy far skyline so the gaps between houses are never empty sky
    const skyline = z => { for (let k = 0; k < 9; k++) { const x = -44 + k * 11 + (k % 2) * 3, h = 9 + (k * 37 % 7) * 1.6; box(S, x, 0, z, 9, h, 6, ['#d9cdb8', '#cfd6d9', '#e0cdb4'][k % 3]); box(S, x, h, z, 9.4, .5, 6.4, '#c08a66'); } };
    /** Light pool on the ground under a lantern (additive, evening sets). */
    const pool = (x, z, r, hex, y = .02) => { const c = C(hex); PL.quad([x - r, y, z + r], [x + r, y, z + r], [x + r, y, z - r], [x - r, y, z - r], c, c, [0, 0, 1, 0, 1, 1, 0, 1]); };
    const ctx = { id, signMat, disposables, shade, plinth, glow: G, pool, K, PAL, C, P, M, S, W, objects, box, cyl, house, sign, picto, road, pave, joints, curb, dashes, tree, lamp, bin, planter, bollard, wheel, car, movable, add, skyline };
    const focus = { r: 11, ...(SETS[id] || SETS.gymfront)(ctx) }, evening = focus.time === 'evening';

    // ---- meshes: street (1), signs (1), houses (1 + one per facade style)
    const street = add(new THREE.Mesh(S.geometry(), mat)); street.name = 'street'; street.matrixAutoUpdate = false; street.updateMatrix();
    if (SG.tris) { const sg = add(new THREE.Mesh(SG.geometry(), signMat), false, true); sg.name = 'signs'; sg.matrixAutoUpdate = false; sg.updateMatrix(); }
    if (G.tris) { const gm = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), g = add(new THREE.Mesh(G.geometry(), gm), false, false); g.name = 'glow'; g.matrixAutoUpdate = false; g.updateMatrix(); }
    if (PL.tris) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(.5, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const pt = new THREE.CanvasTexture(cv), pm = new THREE.MeshBasicMaterial({ map: pt, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }); disposables.push(pt);
      const pl = add(new THREE.Mesh(PL.geometry(), pm), false, false); pl.name = 'light pools'; pl.renderOrder = 1; pl.matrixAutoUpdate = false; pl.updateMatrix();
    }
    const houses = new THREE.Group(); houses.scale.setScalar(U); houses.name = 'houses (map pieces)'; group.add(houses); houses.updateMatrix();
    const addH = m => { m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); houses.add(m); disposables.push(m.geometry, m.material); };
    addH(new THREE.Mesh(W.solid.geometry(), mat));
    const aniso = opts.renderer ? Math.min(4, opts.renderer.capabilities.getMaxAnisotropy()) : 2, tex = K.paintFacades(evening, aniso, s => W.facade[s].tris ? (s === 'shop' ? 3 : 2) : 0);
    for (const s of Object.keys(K.FACADE)) {
      const t = tex[s]; if (!t) continue; disposables.push(t.map); if (t.emissive) disposables.push(t.emissive);
      const fm = K.facadeMaterial(t, evening, s === 'office' ? .45 : .85, s === 'office' ? .75 : .12); if (evening) fm.emissiveIntensity = 1.5; // lit windows at dusk
      addH(new THREE.Mesh(W.facade[s].geometry(), fm));
    }
    // ---- morning light: low warm sun (long shadows), cool sky fill, warm sky gradient, light haze
    const hemi = evening ? new THREE.HemisphereLight(0x8f9cff, 0x7a4f3c, .46) : new THREE.HemisphereLight(0xc4dcff, 0xdcb98c, .54), sun = new THREE.DirectionalLight(evening ? 0xff9450 : 0xffd7a3, evening ? 1.85 : 2.05), amb = new THREE.AmbientLight(0xffffff, .05);
    const sunDir = (evening ? new THREE.Vector3(-.72, .3, .62) : new THREE.Vector3(.58, .44, .68)).normalize();
    sun.castShadow = !!opts.shadows; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0007; sun.shadow.normalBias = .05; sun.shadow.radius = 2;
    group.add(hemi, sun, sun.target, amb);
    const sky = skyTexture(evening); disposables.push(sky); scene.background = sky; scene.fog = evening ? new THREE.Fog(0xd08a64, 22, 95) : new THREE.Fog(0xf3dfc4, 26, 105);
    let fx = 1e9, fz = 1e9;
    /** Centres the sun's shadow box on (x, z); moves only when the point drifts, so shadow edges do not swim. */
    function aim(x, z, r = focus.r) {
      if (Math.hypot(x - fx, z - fz) < 2.5) return; fx = x; fz = z;
      const sc = sun.shadow.camera; sun.target.position.set(x, 0, z); sun.target.updateMatrixWorld();
      sun.position.set(x + sunDir.x * 40, sunDir.y * 40, z + sunDir.z * 40); sun.updateMatrixWorld();
      sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 100; sc.updateProjectionMatrix();
    }
    aim(focus.x, focus.z);
    scene.add(group);
    function stats() { let meshes = 0, tris = 0; group.traverse(o => { if (!o.isMesh || !o.visible) return; meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return { meshes, triangles: Math.round(tris) }; }
    return { id, group, objects, sun, focus: aim, stats, dispose() { scene.remove(group); for (const d of new Set(disposables)) d?.dispose?.(); scene.fog = null; scene.background = null; } };
  }

  /* ---------------------------------------------------------------- bus-stop street corner */
  SETS.busstop = c => {
    const { K, PAL, C, P, M, S, box, cyl, house, sign, picto, road, pave, joints, curb, dashes, tree, lamp, bin, planter, bollard, wheel, car, movable, objects } = c;
    road(-44, 44, -3.5, 3.5); dashes(-44, 44, 0);
    pave(-44, -11.6, -14, -3.5); pave(-5.6, 44, -14, -3.5); pave(-11.6, -5.6, -34, -3.5, PAL.pave2); // the corner: a cobbled Old Town lane
    joints(-44, -11.6, -7, -3.6); joints(-5.6, 44, -7, -3.6);
    for (let x = -11.2; x < -5.6; x += .9) for (let z = -13.5; z < -3.6; z += .9) if ((Math.round(x * 10) + Math.round(z * 10)) % 3 === 0) box(S, x + .45, -.005, z + .45, .82, .01, .82, '#cdbfa7');
    pave(-44, 44, 3.5, 9); curb(-44, -11.6, -3.62); curb(-5.6, 44, -3.62); curb(-44, 44, 3.62);
    for (let z = -2.9; z < 3.2; z += 1.0) box(S, -8.6, -.148, z + .25, 4.6, .012, .5, '#f4f1e6'); // zebra crossing in front of the lane
    cyl(S, 12, -.149, 1.6, .42, .012, '#474e5c', P.cyl12);
    // houses: the stop side, both corners of the lane, the far side
    house({ style: 'plaster', x: -18, z: -13.2, w: 11, d: 10, floors: 3, tint: PAL.oldTown[0], roof: 'hip', roofColor: C(PAL.terracotta[0]), shop: true, awning: PAL.awning[0] });
    house({ style: 'brick', x: -2.3, z: -13.2, w: 6.4, d: 10, floors: 2, tint: PAL.oldTown[3], roof: 'hip', roofColor: C(PAL.terracotta[2]), shop: true, awning: PAL.awning[5] });
    house({ style: 'plaster', x: 5.4, z: -13.2, w: 8.6, d: 10, floors: 3, tint: PAL.oldTown[1], roof: 'hip', roofColor: C(PAL.terracotta[1]), shop: true });
    house({ style: 'apartment', x: 15.6, z: -13.2, w: 11.6, d: 10, floors: 3, tint: PAL.apartment[1], roof: 'flat' });
    house({ style: 'plaster', x: 27.6, z: -13.2, w: 12, d: 10, floors: 2, tint: PAL.oldTown[5], roof: 'hip', roofColor: C(PAL.terracotta[4]) });
    house({ style: 'plaster', x: -18, z: 14, w: 11, d: 10, floors: 2, tint: PAL.oldTown[4], roof: 'hip', roofColor: C(PAL.terracotta[3]), ry: Math.PI });
    house({ style: 'brick', x: 2, z: 14, w: 14, d: 10, floors: 2, tint: PAL.oldTown[6], roof: 'hip', roofColor: C(PAL.terracotta[4]), ry: Math.PI, shop: true, awning: PAL.awning[1] });
    c.skyline(-48); c.plinth(-44, -11.6, -8.12); c.plinth(-5.6, 44, -8.12); c.shade(3.7, -5.9, 4.2, 1.9);
    picto('bread', -18, 4.6, -8.14); picto('cup', 5.4, 4.6, -8.14); picto('flower', -2.3, 4.6, -8.14);
    // the stop: glass shelter with a poster end, slatted bench, round stop sign, timetable
    for (const x of [2.0, 3.7, 5.4]) box(S, x, 0, -6.45, .09, 2.5, .09, '#3d4654');
    box(S, 3.7, 2.46, -5.85, 3.9, .08, 1.6, '#2f5d8a'); box(S, 3.7, 2.38, -5.07, 3.9, .16, .05, '#f4c152'); box(S, 3.7, 2.54, -5.85, 3.6, .05, 1.3, '#3a6c9c');
    box(S, 3.7, .3, -6.47, 3.4, 2.05, .04, '#b9d6e6'); box(S, 3.7, 1.3, -6.45, 3.4, .05, .05, '#3d4654'); box(S, 5.42, .3, -5.95, .04, 2.05, 1.0, '#e8f1f5'); box(S, 5.45, .7, -5.95, .02, 1.3, .8, '#e63946'); box(S, 5.46, 1.2, -5.95, .02, .5, .5, '#f7f0dc');
    for (const z of [-6.22, -6.08, -5.94]) box(S, 3.5, .44, z, 2.6, .05, .11, '#9a7350'); box(S, 3.5, .62, -6.33, 2.6, .3, .05, '#9a7350'); for (const x of [2.5, 4.5]) { box(S, x, 0, -6.08, .07, .44, .42, '#3d4654'); }
    cyl(S, 6.9, 0, -4.05, .05, 2.7, '#8f98a4', P.cyl6); S.add(P.cyl12, M(6.9, 2.5, -4.08, .34, .06, .34, 0, Math.PI / 2), C('#2f6fc0')); box(S, 6.9, 2.44, -4.0, .42, .13, .02, '#ffffff'); box(S, 6.9, 1.5, -4.03, .46, .62, .04, '#f3ead8'); box(S, 6.9, 1.9, -4.0, .4, .12, .02, '#2f6fc0');
    tree(-14, -5.3); tree(10.4, -5.2); tree(21, -5.2); tree(-25, -5.2); tree(-16, 6.6, 4.2); tree(9, 6.8, 4.4);
    lamp(-5.0, -4.0); lamp(15, -4.0); lamp(-2, 4.3); bin(1.2, -6.35); planter(8.2, -6.7); planter(-13.4, -7.6); planter(12.6, -6.7, 1.6);
    for (const x of [-11.9, -5.3]) bollard(x, -4.1);
    car(-17.5, 2.45, '#3b7dd8', -1); car(17, 2.45, '#f4f1ea', -1);
    // the bus: two-tone body, window line with pillars, doors on the kerb side, wheels with hubs, lights, route boards
    const B = new K.Batch(), glass = '#33485c', shine = '#587891', dark = '#2a2f38';
    box(B, 0, .32, 0, 10.9, .36, 2.46, dark); box(B, 0, .5, 0, 10.8, 1.0, 2.5, '#f0b429'); box(B, 0, 1.5, 0, 10.84, .1, 2.54, '#d9473b'); box(B, 0, 1.6, 0, 10.8, 1.26, 2.5, '#f7f0dc'); box(B, 0, 2.86, 0, 10.5, .13, 2.3, '#e9e2cc'); box(B, -1.2, 2.99, 0, 2.6, .2, 1.4, '#d9d2bc');
    for (let k = 0; k < 6; k++) { const x = -4.35 + k * 1.52; box(B, x, 1.72, 1.255, 1.3, .82, .02, glass); box(B, x, 2.34, 1.26, 1.3, .2, .02, shine); }
    for (const [x, w] of [[-4.35, 1.3], [-2.83, 1.3], [1.4, 1.5]]) { box(B, x, 1.72, -1.255, w, .82, .02, glass); box(B, x, 2.34, -1.26, w, .2, .02, shine); }
    for (const x of [-.75, 3.75]) { box(B, x, .56, -1.26, 1.2, 2.1, .03, dark); for (const d of [-.29, .29]) box(B, x + d, .7, -1.275, .5, 1.75, .02, glass); }
    box(B, 5.41, 1.42, 0, .03, 1.3, 2.24, glass); box(B, 5.42, 2.3, 0, .02, .42, 2.24, shine); box(B, 5.43, 2.46, 0, .03, .4, 1.9, '#12151b'); box(B, -5.41, 1.7, 0, .03, .85, 2.0, glass);
    for (const s of [-1, 1]) { box(B, 5.42, .6, s * .88, .04, .2, .42, '#fff6d8'); box(B, 5.42, .62, s * .52, .04, .12, .16, '#ffb52e'); box(B, -5.42, .7, s * .9, .04, .3, .3, '#d9473b'); box(B, 5.2, 2.0, s * 1.42, .08, .34, .2, dark); for (const x of [-3.35, 3.35]) wheel(B, x, .5, s * 1.16 + (s > 0 ? .32 : 0), .5, .32); }
    box(B, 5.48, .3, 0, .14, .22, 2.52, dark); box(B, -5.48, .3, 0, .14, .22, 2.52, dark);
    const bus = movable(B, 'bus'); bus.position.set(.4, -.15, -1.9); objects.bus = bus;
    const BS = new K.Batch({ uv: true }); sign('route', 2.6, 1.0, 1.262, 2.0, .42, 0, BS); sign('route', 5.45, 2.66, 0, 1.8, .36, Math.PI / 2, BS);
    const boards = new THREE.Mesh(BS.geometry(), c.signMat); bus.add(boards); c.disposables.push(boards.geometry);
    return { x: 0, z: -4, r: 12 };
  };

  /* ---------------------------------------------------------------- gym front door */
  SETS.gymfront = c => {
    const { K, PAL, C, P, M, S, box, cyl, house, sign, picto, road, pave, joints, curb, dashes, tree, lamp, bin, planter, bollard, wheel, car, movable, add, objects } = c;
    road(-44, 44, .5, 7.5); dashes(-44, 44, 4);
    pave(-44, 4.2, -14, .5); pave(5.8, 44, -14, .5); pave(4.2, 5.8, -30, .5, PAL.pave2); pave(-44, 44, 7.5, 12);
    joints(-44, 4.2, -3.5, .4); joints(5.8, 44, -3.5, .4); curb(-44, 44, .58); curb(-44, 44, 7.42);
    // gym: the Old Town home gym, door at x = 11
    house({ style: 'brick', x: 11, z: -8.6, w: 8, d: 10, floors: 2, tint: '#c9653d', roof: 'flat', shop: true, shopTint: C('#f4e4c4') }); // no awning: the door and the glove board stay in view
    house({ style: 'plaster', x: 0, z: -8.6, w: 8.4, d: 10, floors: 3, tint: PAL.oldTown[1], roof: 'hip', roofColor: C(PAL.terracotta[1]), shop: true, awning: PAL.awning[3] });
    house({ style: 'plaster', x: -9.6, z: -8.6, w: 9.6, d: 10, floors: 2, tint: PAL.oldTown[2], roof: 'hip', roofColor: C(PAL.terracotta[0]) });
    house({ style: 'brick', x: -19.6, z: -8.6, w: 9.6, d: 10, floors: 3, tint: PAL.oldTown[5], roof: 'hip', roofColor: C(PAL.terracotta[4]), shop: true, awning: PAL.awning[4] });
    house({ style: 'apartment', x: 20.6, z: -8.6, w: 10, d: 10, floors: 3, tint: PAL.apartment[0], roof: 'flat' });
    house({ style: 'plaster', x: 31.6, z: -8.6, w: 11, d: 10, floors: 2, tint: PAL.oldTown[0], roof: 'hip', roofColor: C(PAL.terracotta[3]) });
    house({ style: 'plaster', x: -6, z: 17.5, w: 16, d: 10, floors: 2, tint: PAL.oldTown[7], roof: 'hip', roofColor: C(PAL.terracotta[2]), ry: Math.PI });
    house({ style: 'brick', x: 12, z: 17.5, w: 14, d: 10, floors: 3, tint: PAL.oldTown[3], roof: 'hip', roofColor: C(PAL.terracotta[5]), ry: Math.PI });
    c.skyline(-44); c.plinth(-44, 4.2, -3.52); c.plinth(5.8, 10.1, -3.52); c.plinth(11.9, 44, -3.52); c.shade(-14.2, 2.1, 6.4, 2.4, true); c.shade(-4.25, -1.2, .7, 1.5);
    picto('book', 0, 4.6, -3.55); picto('flower', -19.6, 4.6, -3.55);
    // door: frame, leaf with a window, brass handle, step, mat, wall lantern, the opening bell
    box(S, 11, 0, -3.64, 1.66, 2.56, .14, '#3a2b24'); box(S, 11, .02, -3.52, 1.3, 2.3, .07, '#6b4630'); box(S, 11, 1.25, -3.47, .86, .8, .03, '#33485c'); box(S, 11, 1.62, -3.455, .86, .2, .02, '#587891'); box(S, 11, .25, -3.47, .9, .7, .03, '#5a3a28');
    box(S, 11.48, 1.02, -3.44, .06, .22, .07, '#e0b84d'); box(S, 11, 0, -3.3, 2.1, .1, .62, '#cfc6b6'); box(S, 11, .1, -3.1, 1.3, .02, .5, '#7a3b34');
    box(S, 12.25, 2.25, -3.5, .06, .06, .3, '#2f3640'); cyl(S, 12.25, 1.92, -3.3, .12, .3, '#fff0c4', P.cyl6); S.add(P.cone6, M(12.25, 2.22, -3.3, .18, .14, .18), C('#2f3640'));
    box(S, 9.75, 2.05, -3.45, .05, .05, .34, '#2f3640'); cyl(S, 9.75, 1.98, -3.26, .012, .1, '#2f3640', P.cyl6); S.add(P.cone8, M(9.75, 1.72, -3.26, .14, .26, .14), C('#e0b84d')); cyl(S, 9.75, 1.7, -3.26, .15, .03, '#c99a2e', P.cyl8); cyl(S, 9.75, 1.5, -3.26, .008, .22, '#8a6446', P.cyl6);
    // glove board over the awning and a small hanging board on a bracket
    box(S, 11, 2.95, -3.56, 2.9, 1.5, .1, '#0d1118'); sign('gym', 11, 3.7, -3.45, 2.7, 1.35); box(S, 11, 2.82, -3.3, 3.3, .1, .5, '#8f2f22');
    box(S, 8.2, 3.0, -3.1, .05, .05, .9, '#2f3640'); box(S, 8.2, 2.3, -2.78, .06, .62, .7, '#0d1118'); sign('gym', 8.235, 2.6, -2.78, .66, .46, Math.PI / 2); sign('gym', 8.165, 2.6, -2.78, .66, .46, -Math.PI / 2);
    // Brick's delivery van at the kerb
    const vx = -14.6, vz = 2.1;
    box(S, vx + .4, .25, vz, 4.6, 2.1, 2.0, '#f4f1ea'); box(S, vx + .4, .12, vz, 4.64, .16, 2.04, '#2a2f38'); box(S, vx - 2.3, .25, vz, 1.3, 1.5, 1.95, '#f4f1ea'); box(S, vx - 2.96, .95, vz, .04, .7, 1.7, '#33485c'); box(S, vx - 2.3, 1.75, vz, 1.1, .5, 1.9, '#f4f1ea');
    for (const s of [-1, 1]) { box(S, vx - 2.2, 1.0, vz + s * .98, .9, .6, .02, '#33485c'); box(S, vx + .4, 1.15, vz + s * 1.01, 3.6, .4, .02, '#e63946'); box(S, vx - 2.97, .5, vz + s * .7, .03, .14, .3, '#fff6d8'); for (const x of [vx - 1.9, vx + 1.6]) wheel(S, x, .27, vz + s * .95 + (s > 0 ? .25 : 0), .42, .25); }
    box(S, vx + 2.71, .4, vz, .04, 1.7, 1.8, '#d7d3cb'); box(S, vx + 2.73, .4, vz, .02, 1.7, .04, '#9aa5b1');
    car(21, 2.2, '#45b39d', -1);
    // carry-the-bag obstacles: a gym bench across the path, a puddle, the alley the cyclist comes from
    const bx = -4.25, bz = -1.2;
    box(S, bx, .38, bz, .34, .1, 1.3, '#1d2026'); box(S, bx, .46, bz, .3, .03, 1.2, '#a4262c'); for (const z of [-.45, .45]) { box(S, bx, 0, bz + z, .06, .38, .06, '#aab2bc'); box(S, bx, 0, bz + z, .5, .04, .08, '#aab2bc'); }
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: C('#5b7f96'), roughness: .05, metalness: .4 }));
    puddle.position.set(-.5, .006, -1.2); puddle.scale.set(.75, 1, 1.05); add(puddle, false, true);
    for (let z = -13.5; z < .2; z += .9) for (const x of [4.25, 5.05]) if ((Math.round(z * 10) + Math.round(x * 4)) % 3) box(S, x + .35, -.005, z + .4, .7, .01, .8, '#cdbfa7');
    tree(-6.6, -2.7, 4); tree(16.6, -2.7, 4.2); tree(-21, -2.7, 4.4); tree(27, -2.7, 4.2); tree(2, 9.2, 4.2); tree(14, 9.4, 4.4);
    lamp(-2.2, -3.1); lamp(6.5, -3.1); lamp(15, -3.1); lamp(-15.2, -3.1); bin(14.0, -3.0); planter(9.0, -3.1); planter(12.95, -3.1); planter(-1.6, -3.1, 1.5); planter(1.6, -3.1, 1.5);
    for (const x of [3.9, 6.1]) bollard(x, .2);
    // movable things: cyclist, the new heavy bag, the guard's pillow, Pip's old hand wraps
    const Cb = new K.Batch();
    wheel(Cb, 0, .34, -.55, .34, .05); wheel(Cb, 0, .34, .55, .34, .05);
    box(Cb, 0, .34, -.5, .05, .06, 1.0, '#e63946'); box(Cb, 0, .38, -.1, .05, .52, .06, '#e63946'); box(Cb, 0, .4, .5, .05, .5, .05, '#3b4350'); box(Cb, 0, .88, .44, .52, .04, .04, '#3b4350'); box(Cb, 0, .86, -.14, .16, .06, .3, '#1d2026');
    box(Cb, 0, .56, -.1, .34, .6, .3, '#3c7fc0'); box(Cb, 0, 1.12, 0, .44, .6, .3, '#f2b632'); Cb.add(P.sph, M(0, 1.84, .1, .16, .17, .16), C('#b9c0c9')); Cb.add(P.hemi, M(0, 1.88, .1, .19, .14, .21), C('#e63946'));
    for (const s of [-1, 1]) { box(Cb, s * .2, .98, .22, .09, .09, .34, '#f2b632'); box(Cb, s * .12, .2, -.05, .1, .44, .12, '#2c3e50'); }
    box(Cb, 0, 1.1, -.24, .34, .4, .14, '#8a5a38');
    objects.cyclist = movable(Cb, 'cyclist'); objects.cyclist.position.set(5, 0, -6); objects.cyclist.visible = false;
    const Bg = new K.Batch();
    Bg.add(P.cyl20, M(0, -.5, 0, .17, 1.0, .17), C('#a4262c')); Bg.add(P.cyl20, M(0, .38, 0, .176, .12, .176), C('#1d1f24')); Bg.add(P.cyl20, M(0, -.52, 0, .176, .1, .176), C('#1d1f24'));
    Bg.add(P.cyl20, M(0, -.08, 0, .173, .22, .173), C('#f3f6fb')); Bg.add(P.cyl20, M(0, .02, 0, .1745, .03, .1745), C('#f4c152')); for (let k = 0; k < 4; k++) Bg.add(P.box, M(Math.cos(k * TAU / 4) * .1, .5, Math.sin(k * TAU / 4) * .1, .02, .14, .02), C('#aab2bc')); Bg.add(P.cyl8, M(0, .63, 0, .05, .02, .05), C('#aab2bc'));
    objects.bag = movable(Bg, 'heavy bag'); objects.bag.position.set(-13, 1.1, -.4); objects.bag.visible = false;
    const St = new K.Batch(); for (const z of [-1.0, 1.0]) { St.add(P.box, M(0, 0, z, .11, 2.72, .11), C('#5b3a2a')); St.add(P.box, M(0, 0, z, 1.3, .08, .14), C('#3a2b24')); St.add(P.box, M(.3, 1.9, z * .82, .08, .9, .08, 0, 0, .0), C('#5b3a2a')); }
    St.add(P.box, M(0, 2.62, 0, .14, .14, 2.25), C('#3a2b24')); St.add(P.cyl8, M(0, 2.5, 0, .035, .12, .035), C('#aab2bc')); St.add(P.box, M(0, 2.76, 0, .2, .26, 1.7), C('#1d2026'));
    objects.stand = movable(St, 'bag stand'); objects.stand.visible = false;
    const Pw = new K.Batch(); Pw.add(P.sph, M(0, 0, 0, .3, .12, .2), C('#f7f3ea')); for (const s of [-1, 1]) Pw.add(P.ico, M(s * .29, 0, .17 * 0, .05, .05, .05), C('#c9d6e6')); Pw.add(P.box, M(0, -.02, 0, .5, .04, .1), C('#9fc3e6'));
    objects.pillow = movable(Pw, 'pillow'); objects.pillow.visible = false;
    const Wr = new K.Batch(); for (const s of [-1, 1]) { Wr.add(P.cyl12, M(s * .06, -.05, 0, .055, .1, .055), C('#f3ead8')); Wr.add(P.cyl12, M(s * .06, -.02, 0, .057, .03, .057), C('#e63946')); } Wr.add(P.box, M(0, -.06, .05, .2, .02, .03), C('#f3ead8'));
    objects.wraps = movable(Wr, 'hand wraps'); objects.wraps.visible = false;
    return { x: 8, z: -1.5, r: 12 };
  };

  /* ---------------------------------------------------------------- market alley (Chapter 2, evening) */
  SETS.market = c => {
    const { K, PAL, C, P, M, S, box, cyl, house, picto, pave, tree, bin, planter, movable, objects, glow: G, pool, shade } = c;
    const WARM = '#ffd27a', R = (i, a, b) => a + (b - a) * (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1); // repeatable scatter
    pave(-48, 48, -14, 14, PAL.pave2);
    for (let x = -40; x < 40; x += 1.1) for (let z = -4.2; z < 7; z += 1.1) { const k = Math.round(x * 7 + z * 13); if (k % 3 === 0) box(S, x + .5, -.004, z + .5, .95, .01, .95, k % 2 ? '#cdbfa7' : '#bfae94'); }
    box(S, 0, -.002, -.8, 96, .008, .16, '#a8987f'); box(S, 0, -.002, 1.9, 96, .008, .16, '#a8987f'); // worn drain lines along the alley
    // a patch of large paving slabs in front of the stalls: the 7 x 5 footwork grid of the cut-off trial (X0 -1.4, 1.15 x 0.8 m cells)
    for (let cc = 0; cc < 7; cc++) for (let rr = 0; rr < 5; rr++) box(S, -1.4 + cc * 1.15, .001, -2.0 + rr * .8, 1.07, .012, .72, (cc + rr) % 2 ? '#d9cbb0' : '#cbbb9c');
    // houses: shop fronts behind the stalls, the far side behind the camera
    const row = [['plaster', 10, 3, 0, 0], ['brick', 9, 2, 3, 2], ['plaster', 11, 3, 1, 1], ['brick', 8, 3, 6, 4], ['plaster', 10, 2, 4, 3], ['apartment', 11, 3, 0, 0], ['plaster', 9, 3, 7, 5], ['brick', 10, 2, 5, 2]];
    let hx = -40; row.forEach(([style, w, floors, tint, roofC], i) => { house({ style, x: hx + w / 2, z: -9.8, w, d: 10, floors, tint: style === 'apartment' ? PAL.apartment[1] : PAL.market[tint % PAL.market.length], roof: style === 'apartment' ? 'flat' : 'hip', roofColor: C(PAL.terracotta[roofC]), shop: i % 3 !== 2 }); hx += w + (i === 3 ? 2.4 : 0); });
    hx = -38; [['plaster', 12, 2, 2], ['brick', 14, 3, 5], ['plaster', 12, 2, 1], ['brick', 13, 3, 3], ['plaster', 12, 2, 6], ['plaster', 12, 3, 4]].forEach(([style, w, floors, tint], i) => { house({ style, x: hx + w / 2, z: 15, w, d: 10, floors, tint: PAL.market[tint % PAL.market.length], roof: 'hip', roofColor: C(PAL.terracotta[i % 6]), ry: Math.PI, shop: i % 2 === 0 }); hx += w; });
    c.skyline(-44); c.plinth(-44, 44, -4.72);
    picto('bread', -30, 4.4, -4.75); picto('cup', -8, 4.4, -4.75); picto('flower', 14, 4.4, -4.75); picto('book', 31, 4.4, -4.75);
    // lantern: unlit bright glass + a warm pool on the cobbles
    const lantern = (x, y, z, r = .13, hex = WARM) => { G.add(P.cyl6, M(x, y, z, r, r * 1.7, r), C(hex)); S.add(P.cone6, M(x, y + r * 1.7, z, r * 1.5, r * .9, r * 1.5), C('#2f3640')); cyl(S, x, y - .04, z, r * .7, .04, '#2f3640', P.cyl6); pool(x, z + .5, 2.4, '#ff9d45'); };
    const post = (x, z) => { cyl(S, x, 0, z, .13, .5, '#2f3640', P.cyl8); cyl(S, x, .5, z, .055, 3.0, '#2f3640', P.cyl6); box(S, x, 3.42, z + .25, .04, .04, .55, '#2f3640'); lantern(x, 3.02, z + .5, .15); };
    // a market stall: posts, counter, striped awning with a scalloped valance, crates of fruit, a hanging lantern
    const stall = (x, [a, b], goods, w = 3.0) => {
      const zb = -4.1, zf = -2.3, ya = 2.95, yf = 2.3, n = 8, c1 = C(a), c2 = C(b), wood = '#8a6446';
      for (const sx of [-1, 1]) { box(S, x + sx * (w / 2 - .06), 0, zb + .1, .08, ya, .08, wood); box(S, x + sx * (w / 2 - .06), 0, zf - .1, .08, yf, .08, wood); }
      box(S, x, 0, -3.0, w - .2, .86, 1.0, '#a97c55', 0, { ao: .3 }); box(S, x, .86, -3.0, w, .06, 1.12, '#c29a6f'); box(S, x, .2, -2.47, w - .2, .5, .03, a);
      for (let k = 0; k < n; k++) {
        const x0 = x - w / 2 - .15 + k * (w + .3) / n, x1 = x0 + (w + .3) / n, col = k % 2 ? c2 : c1, lo = col.clone().multiplyScalar(.8);
        S.quad([x0, yf, zf], [x1, yf, zf], [x1, ya, zb], [x0, ya, zb], col, lo); S.quad([x0, ya, zb], [x1, ya, zb], [x1, yf, zf], [x0, yf, zf], lo, lo);
        S.tri([x0, yf, zf], [(x0 + x1) / 2, yf - .26, zf], [x1, yf, zf], col, lo, col); S.tri([x1, yf, zf], [(x0 + x1) / 2, yf - .26, zf], [x0, yf, zf], lo, lo, lo);
      }
      shade(x, -2.9, w + .6, 2.4);
      goods.forEach((hex, i) => { const gx = x - w / 2 + .5 + i * ((w - 1) / Math.max(1, goods.length - 1)); box(S, gx, .92, -2.95, .62, .22, .78, '#9c7448', R(i + x, -.12, .12)); for (let k = 0; k < 9; k++) S.add(P.ico, M(gx - .2 + (k % 3) * .2, 1.17 + (k % 2) * .03, -3.2 + Math.floor(k / 3) * .24, .1, .1, .1, k), C(hex).multiplyScalar(R(k + i, .85, 1.1))); });
      lantern(x, 1.95, zf + .05, .11);
    };
    const AW = PAL.awning, FRUIT = ['#f08a3c', '#d9473b', '#7bc06b', '#f2c14e', '#8e5fa8', '#e84a3d'];
    [-33, -27.5, -21, -15.5, -9.5, -4, 2.2, 8, 16.5, 22, 28, 34].forEach((x, i) => stall(x, AW[i % AW.length], [FRUIT[i % 6], FRUIT[(i + 2) % 6], FRUIT[(i + 4) % 6]], i % 3 === 1 ? 3.6 : 3.0));
    // loose goods between the stalls: crates, barrels, sacks
    const crate = (B, x, y, z, s = .5, ry = 0) => { B.add(P.box, M(x, y, z, s, s * .8, s, ry), C('#a97c55'), { ao: .3 }); B.add(P.box, M(x, y + s * .3, z, s * 1.04, s * .1, s * 1.04, ry), C('#7e5b3c')); };
    [[-24.3, -3.2], [-12.4, -3.4], [-6.8, -3.3], [5.2, -3.3], [12.6, -3.5], [19.3, -3.2], [25, -3.4], [31, -3.2]].forEach(([x, z], i) => {
      crate(S, x, 0, z, .55, i * .4); crate(S, x + .5, 0, z - .3, .5, i * .7 + .3); if (i % 2) crate(S, x + .15, .44, z - .1, .45, i); else { cyl(S, x - .6, 0, z, .3, .8, '#8a5a38', P.cyl12); cyl(S, x - .6, .25, z, .315, .06, '#3b4350', P.cyl12); cyl(S, x - .6, .6, z, .315, .06, '#3b4350', P.cyl12); }
      S.add(P.ico1, M(x + 1.0, .2, z + .25, .3, .26, .26, i), C('#c9b08a')); shade(x + .1, z, 1.9, 1.2);
    });
    for (const x of [-30, -18.4, -1, 11, 25.4, 37]) post(x, -1.95);
    tree(-36.5, 4.6, 4.4); tree(-13, 5.4, 4.2); tree(6, 5.2, 4.6); tree(19.5, 5.5, 4.2); tree(38, 4.8, 4.4); bin(-19.6, -3.9); bin(14.6, -3.9); planter(-2, 5.6, 1.6); planter(10, 5.9, 1.6); planter(-24, 5.8, 1.6);
    // string lights and bunting across the alley
    const BULB = ['#ffd27a', '#ff9d6b', '#fff0c4', '#ffb347'], FLAG = ['#e8473b', '#f2b632', '#2fa59a', '#3c7fc0', '#d63d6d', '#fff4e0'];
    [-34, -26, -19, -11.5, -4, 4.5, 12, 20, 27, 35].forEach((x, i) => {
      const z0 = -4.5, z1 = 6.2, y0 = 5.0 + (i % 2) * .3, n = 15, wire = C('#2a2f38');
      for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n, pt = u => [x + (u - .5) * 1.4 * (i % 2 ? 1 : -1), y0 - Math.sin(u * Math.PI) * .7, z0 + (z1 - z0) * u], a = pt(u0), b = pt(u1);
        S.quad(a, b, [b[0], b[1] + .025, b[2]], [a[0], a[1] + .025, a[2]], wire); S.quad(b, a, [a[0], a[1] + .025, a[2]], [b[0], b[1] + .025, b[2]], wire);
        if (i % 3 === 2) { const col = C(FLAG[(k + i) % FLAG.length]), m = pt((u0 + u1) / 2); S.tri(a, [m[0], m[1] - .34, m[2]], b, col); S.tri(b, [m[0], m[1] - .34, m[2]], a, col); }
        else G.add(P.ico, M(a[0], a[1] - .07, a[2], .075, .095, .075), C(BULB[(k + i) % 4]));
      }
      cyl(S, x + .7 * (i % 2 ? 1 : -1), 0, z1, .06, y0, '#3b4350', P.cyl6);
    });
    // people of the market: simple evening silhouettes (static, merged)
    const SIL = ['#3b3552', '#4b3b4c', '#2f3b57', '#57424c', '#40465e', '#5a4a3f'];
    const person = (x, z, i, h = 1) => { const col = C(SIL[i % SIL.length]), hd = col.clone().multiplyScalar(1.25); S.add(P.cyl8, M(x, 0, z, .2 * h, .78 * h, .15 * h), col.clone().multiplyScalar(.8)); S.add(P.cyl8, M(x, .76 * h, z, .25 * h, .62 * h, .17 * h), col); S.add(P.sph, M(x, 1.56 * h, z, .15 * h, .17 * h, .15 * h), hd); if (i % 3 === 0) S.add(P.cone8, M(x, 1.66 * h, z, .2 * h, .12 * h, .2 * h), C('#6b3b2b')); shade(x, z, .7, .6); };
    for (let k = 0; k < 12; k++) { const a = Math.PI * (1.05 + .9 * k / 11); person(13.4 + Math.cos(a) * (2.75 + (k % 2) * .5), -1.0 + Math.sin(a) * (2.0 + (k % 2) * .45) * .78, k, .92 + (k % 4) * .04); } // the crowd circle
    [[-15.8, -2.0], [-16.6, -1.2], [-16.2, -.3], [-15.2, -2.4]].forEach(([x, z], i) => person(x, z, i + 3, 1.04)); // the Hyena crew behind their king
    [[-31, -1.9], [-26, -1.7], [-22.5, -2.0], [-7.6, -2.2], [3.4, -2.1], [6.6, -1.9], [21, -2.0], [24, -1.7], [29.5, -2.1], [33, -1.8], [-3, 4.6], [9, 4.9], [-20, 4.4], [27, 4.7]].forEach(([x, z], i) => person(x, z, i + 1, .95 + (i % 3) * .05));
    // rooftop pranksters on a balcony over the balloon run, with a bucket of balloons
    box(S, -2, 3.6, -4.2, 15, .14, 1.0, '#b3a892'); for (let x = -9.2; x <= 5.3; x += .48) box(S, x, 3.74, -3.74, .05, .7, .05, '#3b4350'); box(S, -2, 4.44, -3.74, 15, .06, .08, '#3b4350');
    [-7, -2.4, 3.2].forEach((x, i) => { person(x, -4.3, i + 2, .8); S.add(P.sph, M(x + .45, 5.1 - 1.2, -3.9, .16, .19, .16), C(['#3fc1e8', '#ff6b8b', '#ffd166'][i])); });
    // movable things for the scenes and the three street games
    const Wh = new K.Batch(); Wh.add(P.cyl8, M(0, -.03, 0, .035, .06, .035), C('#e0b84d')); Wh.add(P.box, M(.05, -.02, 0, .08, .035, .03), C('#e0b84d')); Wh.add(P.box, M(-.02, .03, 0, .01, .14, .01), C('#e63946'));
    objects.whistle = movable(Wh, 'whistle'); objects.whistle.visible = false;
    const Ba = new K.Batch(); Ba.add(P.sph, M(0, 0, 0, .2, .24, .2), C('#3fc1e8')); Ba.add(P.cone6, M(0, -.3, 0, .05, .08, .05), C('#2b8fb0')); Ba.add(P.ico, M(.07, .1, .13, .05, .06, .03), C('#c9f2ff'));
    objects.balloon = movable(Ba, 'water balloon'); objects.balloon.visible = false;
    const Bg2 = new K.Batch(); Bg2.add(P.sph, M(0, 0, 0, .2, .24, .2), C('#ffc94d')); Bg2.add(P.cone6, M(0, -.3, 0, .05, .08, .05), C('#c9952a')); Bg2.add(P.ico, M(.07, .1, .13, .05, .06, .03), C('#fff4c4')); Bg2.add(P.cyl12, M(0, -.02, 0, .215, .04, .215), C('#fff4c4'));
    objects.balloon2 = movable(Bg2, 'gold balloon'); objects.balloon2.visible = false;
    const Pg = new K.Batch(); Pg.add(P.sph, M(0, 0, 0, .1, .1, .17), C('#8f98a8')); Pg.add(P.sph, M(0, .09, .15, .065, .065, .07), C('#6f7888')); Pg.add(P.cone6, M(0, .07, .2, .02, .06, .02, 0, Math.PI / 2), C('#f2b632'));
    for (const sx of [-1, 1]) Pg.add(P.box, M(sx * .17, .02, -.02, .26, .02, .16, 0, 0, sx * -.35), C('#aab2bc')); Pg.add(P.box, M(0, -.01, -.2, .1, .02, .12), C('#6f7888'));
    objects.pigeon = movable(Pg, 'pigeon'); objects.pigeon.visible = false;
    for (const id of ['crate', 'crate2']) { const Cr = new K.Batch(); crate(Cr, 0, 0, 0, .62); crate(Cr, .1, .5, .05, .5, .4); for (let k = 0; k < 6; k++) Cr.add(P.ico, M(-.12 + (k % 3) * .14, .98, -.06 + Math.floor(k / 3) * .16, .08, .08, .08, k), C(FRUIT[k % 6])); objects[id] = movable(Cr, 'chase crates'); objects[id].visible = false; }
    for (const id of ['bar', 'bar2']) { const Br = new K.Batch(); for (const z of [-1.5, 1.5]) Br.add(P.cyl6, M(0, 0, z, .05, 1.95, .05), C('#8a6446')); Br.add(P.box, M(0, 1.5, 0, .07, .07, 3.0), C('#8a6446')); for (let k = 0; k < 7; k++) { const col = C(FLAG[k % 6]), z = -1.2 + k * .4; Br.tri([0, 1.5, z - .18], [0, 1.16, z], [0, 1.5, z + .18], col); Br.tri([0, 1.5, z + .18], [0, 1.16, z], [0, 1.5, z - .18], col); } objects[id] = movable(Br, 'chase pole'); objects[id].visible = false; }
    const Bk = new K.Batch(); Bk.add(P.cyl8, M(0, -.3, 0, .16, .28, .12), C('#b88a55')); Bk.add(P.ico, M(-.05, 0, 0, .08, .08, .08), C('#d9473b')); Bk.add(P.ico, M(.07, .01, .02, .07, .07, .07), C('#7bc06b')); Bk.add(P.box, M(.02, -.02, -.04, .03, .2, .03, 0, 0, .3), C('#e8c98a'));
    objects.basket = movable(Bk, 'groceries'); objects.basket.visible = false;
    return { x: 0, z: -1, r: 12, time: 'evening' };
  };

  window.StorySets = { ready, build, register(id, fn) { SETS[id] = fn; }, ids: () => Object.keys(SETS) };
})();
