/* Story sets (GOTR-0056 layer 2): compact street-scale 3D sets in the visual style of the Gloryland map. The houses are
 * the map's own pieces (GlorylandMap.kit: facade textures, tinted facade material, roofs, awnings) at 4 m per map unit;
 * streets and props are merged vertex-coloured geometry. Built only when a scene plays, disposed after.
 *   const set = StorySets.build('busstop' | 'gymfront', scene, { renderer, shadows })
 *   set.objects -> { bus, bag, cyclist } (movable meshes, may be absent), set.focus(x, z), set.stats(), set.dispose()
 * World: metres, y up, the street runs along x, the camera side is +z. Walking surfaces are at y = 0. */
(() => {
  const MAP_SRC = './adventure/gloryland-map.js?v=2026111100';
  let loader = null;
  /** Loads the map script (once) for its building kit. */
  function ready() {
    if (window.GlorylandMap?.kit) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = MAP_SRC; s.onload = () => window.GlorylandMap?.kit ? resolve() : reject(Error('map kit')); s.onerror = () => { loader = null; reject(Error('map script')); }; document.head.append(s); });
    return loader;
  }
  const U = 4; // metres per map unit

  function build(id, scene, opts = {}) {
    const K = window.GlorylandMap.kit, PAL = window.GlorylandMap.PAL, C = K.C, P = K.P, M = K.M;
    K.initProtos(); K.seed(id === 'busstop' ? 4021 : 7333);
    const group = new THREE.Group(); group.name = 'Story set ' + id;
    const disposables = [], objects = {};
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: 0 }); disposables.push(mat);
    const S = new K.Batch(); // street, props, static things (metres)
    const W = { solid: new K.Batch(), facade: {} }; // map-unit houses
    for (const s of Object.keys(K.FACADE)) W.facade[s] = new K.Batch({ uv: true, tint: true });
    const box = (B, x, y, z, sx, sy, sz, col, ry = 0, o) => B.add(P.box, M(x, y, z, sx, sy, sz, ry), typeof col === 'string' ? C(col) : col, o);
    const cyl = (B, x, y, z, r, h, col, proto = P.cyl8, rx = 0, rz = 0, rzz) => B.add(proto, M(x, y, z, r, h, rzz ?? r, 0, rx, rz), typeof col === 'string' ? C(col) : col);
    const house = o => K.building(W, { ...o, x: o.x / U, z: o.z / U, w: o.w / U, d: o.d / U, y0: 0, tint: C(o.tint) });

    // ---- street: road (y -0.15), pavements (y 0), curbs, lane marks
    const road = (x0, x1, z0, z1) => box(S, (x0 + x1) / 2, -.45, (z0 + z1) / 2, x1 - x0, .3, z1 - z0, PAL.asphalt);
    const pave = (x0, x1, z0, z1, col = PAL.pave) => box(S, (x0 + x1) / 2, -.4, (z0 + z1) / 2, x1 - x0, .4, z1 - z0, col);
    const curb = (x0, x1, z) => box(S, (x0 + x1) / 2, -.2, z, x1 - x0, .21, .22, PAL.curb);
    const dashes = (x0, x1, z) => { for (let x = x0; x < x1; x += 4) box(S, x + 1, -.152, z, 2, .01, .14, PAL.line); };
    const tree = (x, z, h = 4.6) => { cyl(S, x, 0, z, .14, h * .5, PAL.trunk, P.cyl6); S.add(P.ico1, M(x, h * .62, z, 1.25, 1.35, 1.25, x), C(PAL.leaf[Math.abs(Math.round(x * 3)) % PAL.leaf.length])); S.add(P.ico1, M(x + .5, h * .75, z - .3, .8, .85, .8), C(PAL.leaf[(Math.abs(Math.round(x)) + 2) % PAL.leaf.length])); box(S, x, -.01, z, 1.1, .02, 1.1, '#8c7a63'); };
    const lamp = (x, z) => { cyl(S, x, 0, z, .07, 4.4, '#3b4350', P.cyl6); box(S, x, 4.3, z + .35, .14, .12, .9, '#3b4350'); box(S, x, 4.18, z + .7, .38, .14, .26, '#f5ecd2'); };
    const bin = (x, z) => { cyl(S, x, 0, z, .26, .9, '#4f7a5a', P.cyl8); cyl(S, x, .88, z, .29, .06, '#3c5c45', P.cyl8); };
    const planter = (x, z) => { box(S, x, 0, z, 1.0, .5, .5, '#b5643e'); S.add(P.ico, M(x, .55, z, .55, .35, .3), C(PAL.leaf[1])); };
    const wheel = (B, x, y, z, r, w) => { B.add(P.cyl12, M(x, y, z - w / 2, r, w, r, 0, Math.PI / 2), C('#22252b')); B.add(P.cyl8, M(x, y, z - w / 2 - .01, r * .5, w + .02, r * .5, 0, Math.PI / 2), C('#c9ccd2')); };
    let focus = { x: 0, z: -3, r: 14 };

    if (id === 'busstop') {
      road(-40, 40, -3.5, 3.5); dashes(-40, 40, 0);
      pave(-40, -11.6, -14, -3.5); pave(-5.6, 40, -14, -3.5); pave(-11.6, -5.6, -30, -3.5, PAL.pave2); // the corner: a cobbled Old Town lane
      for (let x = -11.2; x < -5.6; x += .9) for (let z = -13.5; z < -3.6; z += .9) if ((Math.round(x * 10) + Math.round(z * 10)) % 3 === 0) box(S, x + .45, -.005, z + .45, .82, .01, .82, '#cdbfa7');
      pave(-40, 40, 3.5, 9); curb(-40, -11.6, -3.6); curb(-5.6, 40, -3.6); curb(-40, 40, 3.6);
      box(S, -8.6, -.149, -2.4, 6, .01, 1.6, '#f4f1e6'); for (let x = -11.2; x < -6; x += 1.1) box(S, x + .3, -.148, -.5, .6, .01, 2.6, '#f4f1e6'); // crossing stripes
      // houses along the stop side and both corners of the lane
      house({ style: 'plaster', x: -18, z: -19, w: 11, d: 10, floors: 3, tint: PAL.oldTown[0], roof: 'hip', roofColor: C(PAL.terracotta[0]), shop: true, awning: PAL.awning[0] });
      house({ style: 'brick', x: -2.3, z: -19, w: 6.4, d: 10, floors: 2, tint: PAL.oldTown[3], roof: 'hip', roofColor: C(PAL.terracotta[2]) });
      house({ style: 'plaster', x: 5.4, z: -19, w: 8.6, d: 10, floors: 3, tint: PAL.oldTown[1], roof: 'hip', roofColor: C(PAL.terracotta[1]), shop: true, awning: PAL.awning[2] });
      house({ style: 'apartment', x: 15.6, z: -19, w: 11.6, d: 10, floors: 3, tint: PAL.apartment[1], roof: 'flat' });
      house({ style: 'plaster', x: -18, z: 14, w: 11, d: 10, floors: 2, tint: PAL.oldTown[4], roof: 'hip', roofColor: C(PAL.terracotta[3]), ry: Math.PI });
      house({ style: 'brick', x: 2, z: 14, w: 14, d: 10, floors: 2, tint: PAL.oldTown[6], roof: 'hip', roofColor: C(PAL.terracotta[4]), ry: Math.PI, shop: true, awning: PAL.awning[1] });
      // the stop: glass shelter, bench, sign, timetable
      for (const x of [2.0, 5.4]) box(S, x, 0, -6.4, .1, 2.5, .1, '#3d4654');
      box(S, 3.7, 2.45, -5.9, 3.9, .1, 1.5, '#2f5d8a'); box(S, 3.7, .35, -6.42, 3.4, 2.0, .05, '#bcd7e6');
      box(S, 3.7, .42, -6.1, 2.6, .08, .45, '#8a6446'); for (const x of [2.7, 4.7]) box(S, x, 0, -6.1, .08, .42, .3, '#3d4654');
      cyl(S, 6.9, 0, -3.95, .05, 2.6, '#8f98a4', P.cyl6); box(S, 6.9, 2.25, -3.95, .62, .5, .05, '#2f6fc0'); box(S, 6.9, 2.36, -3.92, .4, .2, .02, '#ffffff');
      box(S, 6.2, 0, -6.2, .7, 1.6, .1, '#3d4654'); box(S, 6.2, .5, -6.14, .58, 1.0, .02, '#f3ead8');
      tree(-14, -5.2); tree(10, -5.0); tree(20, -5.0); tree(-24, -5.0); lamp(-4.6, -4.1); lamp(14.5, -4.1); lamp(-1, 4.2); bin(1.1, -6.3); planter(8, -6.6); planter(-13.2, -8.2);
      // the bus (moves along x, lane z = -1.9)
      const B = new K.Batch(), body = C('#f2c14e'), glass = C('#2c3e50');
      box(B, 0, .35, 0, 10.6, 2.6, 2.5, body); box(B, 0, 2.95, 0, 10.4, .12, 2.4, C('#f7f3e6'));
      for (const s of [-1, 1]) { box(B, -.3, 1.45, s * 1.255, 8.6, 1.05, .03, glass); box(B, 0, .55, s * 1.255, 10.4, .12, .03, C('#d9473b')); }
      box(B, 5.31, 1.0, 0, .03, 1.7, 2.1, glass); box(B, -5.31, 1.4, 0, .03, 1.1, 2.0, glass); box(B, 5.32, 2.5, 0, .02, .3, 1.4, C('#1c2028'));
      for (const x of [-3.4, 3.4]) for (const s of [-1, 1]) wheel(B, x, .45, s * 1.2 + (s > 0 ? .3 : 0), .5, .3);
      const bus = mesh(B, 'bus'); bus.position.set(.4, -.15, -1.9); objects.bus = bus;
      focus = { x: 0, z: -4, r: 13 };
    } else {
      road(-40, 40, .5, 7.5); dashes(-40, 40, 4);
      pave(-40, 4.2, -14, .5); pave(5.8, 40, -14, .5); pave(4.2, 5.8, -14, .5, PAL.pave2); pave(-40, 40, 7.5, 12);
      curb(-40, 40, .55); curb(-40, 40, 7.45);
      // gym: the Old Town home gym with a glove pictogram, door at x = 11
      house({ style: 'brick', x: 11, z: -8.6, w: 8, d: 10, floors: 2, tint: '#c9653d', roof: 'flat', shop: true, shopTint: C('#f4e4c4'), awning: PAL.awning[0] });
      house({ style: 'plaster', x: 0, z: -8.6, w: 8.4, d: 10, floors: 3, tint: PAL.oldTown[1], roof: 'hip', roofColor: C(PAL.terracotta[1]), shop: true, awning: PAL.awning[3] });
      house({ style: 'plaster', x: -9.6, z: -8.6, w: 9.6, d: 10, floors: 2, tint: PAL.oldTown[2], roof: 'hip', roofColor: C(PAL.terracotta[0]) });
      house({ style: 'brick', x: -19.6, z: -8.6, w: 9.6, d: 10, floors: 3, tint: PAL.oldTown[5], roof: 'hip', roofColor: C(PAL.terracotta[4]), shop: true, awning: PAL.awning[4] });
      house({ style: 'apartment', x: 20.6, z: -8.6, w: 10, d: 10, floors: 3, tint: PAL.apartment[0], roof: 'flat' });
      house({ style: 'plaster', x: -6, z: 17.5, w: 16, d: 10, floors: 2, tint: PAL.oldTown[7], roof: 'hip', roofColor: C(PAL.terracotta[2]), ry: Math.PI });
      box(S, 11, 0, -3.62, 1.5, 2.45, .12, '#3a2b24'); box(S, 11, 0, -3.5, 1.2, 2.25, .06, '#5b3a2a'); box(S, 11.4, 1.05, -3.45, .1, .1, .06, '#e0b84d'); box(S, 11, 0, -3.35, 1.9, .12, .5, '#cfc6b6');
      // sign with a red glove pictogram (no words, so it reads in every language)
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
      g.fillStyle = '#121823'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#f4c152'; g.lineWidth = 8; g.strokeRect(6, 6, 244, 116);
      for (const [cx, flip] of [[88, 1], [168, -1]]) { g.save(); g.translate(cx, 64); g.scale(flip, 1); g.fillStyle = '#e63946'; g.beginPath(); g.ellipse(0, -6, 30, 34, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(-24, 2, 12, 18, -.4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f3f6fb'; g.fillRect(-20, 26, 40, 16); g.restore(); }
      const signTex = new THREE.CanvasTexture(cv); signTex.encoding = THREE.sRGBEncoding; disposables.push(signTex);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(11, 3.25, -3.42); add(sign, false, false);
      // van parked at the kerb (Brick's delivery)
      const vx = -14.6, vz = 2.1;
      box(S, vx + .4, .25, vz, 4.6, 2.1, 2.0, '#f4f1ea'); box(S, vx - 2.3, .25, vz, 1.3, 1.5, 1.95, '#f4f1ea'); box(S, vx - 2.95, .95, vz, .05, .7, 1.7, '#2c3e50');
      box(S, vx + .4, 1.2, vz + 1.01, 3.2, .35, .02, '#e63946'); box(S, vx + 2.71, .4, vz, .04, 1.7, 1.8, '#d7d3cb');
      for (const x of [vx - 1.9, vx + 1.6]) for (const s of [-1, 1]) wheel(S, x, .25, vz + s * .95 + (s > 0 ? .25 : 0), .42, .25);
      // obstacles on the pavement: a gym bench put out across the path, a puddle, the alley the cyclist comes from
      const bx = -4.5 + .25, bz = -1.2;
      box(S, bx, .38, bz, .34, .1, 1.3, '#1d2026'); for (const z of [-.45, .45]) { box(S, bx, 0, bz + z, .06, .38, .06, '#aab2bc'); box(S, bx, 0, bz + z, .5, .04, .08, '#aab2bc'); }
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: C('#4b6b80'), roughness: .06, metalness: .35 }));
      puddle.position.set(-.5, .006, -1.2); puddle.scale.set(.75, 1, 1.05); add(puddle, false, true);
      box(S, 5, -.005, -8, 1.6, .01, 9, '#c4b9a5');
      tree(-6.6, -2.8, 4); tree(16.5, -2.8, 4.2); lamp(-1.8, -.1); lamp(8.2, -.1); bin(14.2, -3.0); planter(9.2, -3.1); planter(12.8, -3.1);
      // cyclist (moves along z out of the alley at x = 5)
      const Cb = new K.Batch();
      wheel(Cb, 0, .34, -.55, .34, .05); wheel(Cb, 0, .34, .55, .34, .05);
      box(Cb, 0, .34, -.5, .05, .06, 1.0, '#e63946', 0, { }); box(Cb, 0, .38, 0, .05, .5, .06, '#e63946'); box(Cb, 0, .86, .35, .5, .04, .04, '#3b4350');
      box(Cb, 0, .55, -.1, .34, .62, .3, '#3c7fc0'); box(Cb, 0, 1.15, .02, .42, .62, .3, '#f2b632'); Cb.add(P.sph, M(0, 1.66, .1, .16, .17, .16), C('#9aa5b1')); Cb.add(P.hemi, M(0, 1.7, .1, .19, .14, .2), C('#e63946'));
      box(Cb, .17, .9, .25, .08, .08, .3, '#f2b632'); box(Cb, -.17, .9, .25, .08, .08, .3, '#f2b632');
      const cyclist = mesh(Cb, 'cyclist'); cyclist.position.set(5, 0, -6); objects.cyclist = cyclist;
      focus = { x: -2, z: -1.2, r: 15 };
    }
    // the new heavy bag: red leather, black bands, chain stub. Origin at its centre (1.05 m tall).
    if (id === 'gymfront') {
      const Bg = new K.Batch();
      Bg.add(P.cyl20, M(0, -.5, 0, .17, 1.0, .17), C('#a4262c')); Bg.add(P.cyl20, M(0, .38, 0, .175, .12, .175), C('#1d1f24')); Bg.add(P.cyl20, M(0, -.52, 0, .175, .1, .175), C('#1d1f24'));
      Bg.add(P.cyl20, M(0, -.06, 0, .172, .2, .172), C('#f3f6fb')); Bg.add(P.cyl8, M(0, .5, 0, .03, .12, .03), C('#aab2bc'));
      objects.bag = mesh(Bg, 'heavy bag'); objects.bag.position.set(-13, 1.1, -.4);
    }

    // ---- meshes
    function add(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; group.add(m); disposables.push(m.geometry, m.material); return m; }
    function mesh(B, name) { const m = add(new THREE.Mesh(B.geometry(), mat)); m.name = name; return m; }
    const street = new THREE.Mesh(S.geometry(), mat); street.name = 'street'; add(street, true, true); street.matrixAutoUpdate = false; street.updateMatrix();
    const houses = new THREE.Group(); houses.scale.setScalar(U); houses.name = 'houses (map pieces)'; group.add(houses);
    const addH = m => { m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); houses.add(m); disposables.push(m.geometry, m.material); };
    addH(new THREE.Mesh(W.solid.geometry(), mat));
    const aniso = opts.renderer ? Math.min(4, opts.renderer.capabilities.getMaxAnisotropy()) : 2, tex = K.paintFacades(false, aniso);
    for (const s of Object.keys(K.FACADE)) {
      const t = tex[s]; disposables.push(t.map); if (t.emissive) disposables.push(t.emissive);
      if (!W.facade[s].tris) continue;
      addH(new THREE.Mesh(W.facade[s].geometry(), K.facadeMaterial(t, false, s === 'office' ? .45 : .85, s === 'office' ? .75 : .12)));
    }
    // ---- light: the map's morning sun, sky and fog
    const hemi = new THREE.HemisphereLight(0xd9eeff, 0xcdb88c, .62), sun = new THREE.DirectionalLight(0xfff0d6, 1.55), amb = new THREE.AmbientLight(0xffffff, .05);
    const sunDir = new THREE.Vector3(-.62, .72, .52).normalize();
    sun.castShadow = !!opts.shadows; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
    group.add(hemi, sun, sun.target, amb);
    scene.background = new THREE.Color(0xbfdcec); scene.fog = new THREE.Fog(0xcfe4ee, 45, 120);
    function aim(x, z, r = focus.r) {
      const sc = sun.shadow.camera; sun.target.position.set(x, 0, z); sun.target.updateMatrixWorld();
      sun.position.set(x + sunDir.x * 40, sunDir.y * 40, z + sunDir.z * 40); sun.updateMatrixWorld();
      sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 100; sc.updateProjectionMatrix();
    }
    aim(focus.x, focus.z);
    scene.add(group);
    function stats() { let meshes = 0, tris = 0; group.traverse(o => { if (!o.isMesh || !o.visible) return; meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return { meshes, triangles: Math.round(tris) }; }
    return { id, group, objects, sun, focus: aim, stats, dispose() { scene.remove(group); for (const d of disposables) d?.dispose?.(); scene.fog = null; scene.background = null; } };
  }
  window.StorySets = { ready, build };
})();
