/* The small things of a living street in the opening film (GOTR-0097): soft clouds drifting in the sky, people (one with a
 * dog) walking on the far pavement, pigeons that peck on the pavement and flap off when the Fighter comes close, leaves and
 * a little litter, and a cheap shadow stand-in for a character (real sun shadows, see dream-scenes.js). Everything is low-poly
 * and batched: each walker and the dog are ONE skinned mesh (one draw call), the pigeons three instanced meshes, the litter
 * one mesh, each cloud one sprite. Built when the street film plays, disposed with it.
 *
 *   StreetLife.build(scene, { level, track? }) -> { group, update(dt, t, fighter), level(n), stats(), dispose() }
 *       level 2 = everything, 1 = clouds and litter only (phones that cannot keep up), 0 = nothing
 *       update: dt seconds, t scene seconds (pigeons take off from the Fighter's position; going back in time resets them),
 *       fighter = world position of the Fighter's root (or null); track = [[t, x, z], ...] the Fighter's path sampled from
 *       the script (then a seek gives the same pigeons as playing through), else the positions seen so far
 *   StreetLife.shadowProxy(rig) -> SkinnedMesh   capsules on the rig's own skeleton, drawn only into the sun's shadow map
 *       (layer 1, the shadow camera sees it; the film camera does not): a 3k-triangle shadow instead of the 340k-triangle body
 *       and its 200 fur and clothing meshes. StreetLife.SHADOW_LAYER = 1.
 *   StreetLife.walkers / pigeons (data, tests) ; StreetLife.pigeonState(flock, t, fighterPositions) is pure (tests).
 * World: the 'dream_street' set (x along the street, road y -0.15 between z -3.5 and 3.5, far pavement z < -3.6, y 0). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), TAU = Math.PI * 2, SHADOW_LAYER = 1;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const rnd = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------------------------------------------------------------- one skinned mesh from rigid parts */
  /** parts: [geometry (already placed in bind space), bone index, colour]; bones: [{ name, parent, at: [x, y, z] world rest }] */
  function rigidSkin(bones, parts, material) {
    const bs = bones.map(b => { const o = new THREE.Bone(); o.name = b.name; return o; });
    bones.forEach((b, i) => { const p = b.parent >= 0 ? bones[b.parent].at : [0, 0, 0]; bs[i].position.set(b.at[0] - p[0], b.at[1] - p[1], b.at[2] - p[2]); if (b.parent >= 0) bs[b.parent].add(bs[i]); });
    const pos = [], nor = [], col = [], si = [], sw = [], idx = []; let base = 0; const c = new THREE.Color();
    for (const [g0, bone, color] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); const P = g.attributes.position, N = g.attributes.normal; c.set(color).convertSRGBToLinear();
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); col.push(c.r, c.g, c.b); si.push(bone, 0, 0, 0); sw.push(1, 0, 0, 0); idx.push(base + i); }
      base += P.count; if (g !== g0) g.dispose(); g0.dispose();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const mesh = new THREE.SkinnedMesh(geo, material); mesh.add(bs[0]); mesh.bind(new THREE.Skeleton(bs)); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.bones = Object.fromEntries(bs.map(b => [b.name, b])); return mesh;
  }
  const at = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => g.applyMatrix4(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz)));
  const cyl = (r0, r1, h, n = 7) => new THREE.CylinderGeometry(r0, r1, h, n, 1);
  const ball = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);

  /* ---------------------------------------------------------------- people of the city: animal heads, everyday clothes */
  const HUMAN = [
    { name: 'root', parent: -1, at: [0, 0, 0] }, { name: 'hips', parent: 0, at: [0, .95, 0] }, { name: 'spine', parent: 1, at: [0, 1.18, 0] }, { name: 'head', parent: 2, at: [0, 1.6, 0] },
    { name: 'thighL', parent: 1, at: [-.1, .93, 0] }, { name: 'shinL', parent: 4, at: [-.1, .5, 0] }, { name: 'thighR', parent: 1, at: [.1, .93, 0] }, { name: 'shinR', parent: 6, at: [.1, .5, 0] },
    { name: 'armL', parent: 2, at: [-.21, 1.52, 0] }, { name: 'foreL', parent: 8, at: [-.23, 1.24, 0] }, { name: 'armR', parent: 2, at: [.21, 1.52, 0] }, { name: 'foreR', parent: 10, at: [.23, 1.24, 0] }
  ];
  function walker(o) {
    const parts = [], P = (g, b, c) => parts.push([g, b, c]), B = Object.fromEntries(HUMAN.map((b, i) => [b.name, i]));
    P(at(cyl(.15, .16, .5, 8), 0, 1.33, 0, 0, 0, 0, 1, 1, .68), B.spine, o.top); P(at(cyl(.16, .15, .22, 8), 0, 1.03, 0, 0, 0, 0, 1, 1, .7), B.hips, o.legs);
    if (o.coat) P(at(cyl(.17, .21, .55, 8), 0, 1.08, 0, 0, 0, 0, 1, 1, .72), B.spine, o.top);
    P(at(ball(.125), 0, 1.74, .01, 0, 0, 0, 1, 1.05, 1), B.head, o.fur); P(at(ball(.06, 6, 4), 0, 1.71, .11, 0, 0, 0, 1, .8, 1), B.head, o.muzzle || o.fur); P(at(ball(.018, 4, 3), 0, 1.73, .17), B.head, '#1b1512');
    if (o.ears === 'long') for (const s of [-1, 1]) P(at(ball(.035, 5, 4), s * .05, 1.93, -.01, 0, 0, s * -.15, 1, 3.2, .55), B.head, o.fur);
    else for (const s of [-1, 1]) P(at(ball(.04, 5, 4), s * .095, 1.84, -.01, 0, 0, 0, 1, 1, .5), B.head, o.fur);
    for (const [s, th, sh, ar, fo] of [[-1, B.thighL, B.shinL, B.armL, B.foreL], [1, B.thighR, B.shinR, B.armR, B.foreR]]) {
      P(at(cyl(.075, .062, .44), s * .1, .71, 0), th, o.legs); P(at(cyl(.058, .05, .44), s * .1, .29, 0), sh, o.legs); P(at(new THREE.BoxGeometry(.1, .08, .25), s * .1, .045, .05), sh, o.shoes);
      P(at(cyl(.055, .048, .3), s * .22, 1.38, 0, 0, 0, s * .06), ar, o.top); P(at(cyl(.044, .04, .26), s * .235, 1.11, 0), fo, o.sleeve ? o.top : o.fur); P(at(ball(.045, 5, 4), s * .24, .96, .01), fo, o.fur);
    }
    if (o.bag) P(at(new THREE.BoxGeometry(.08, .26, .3), .27, 1.0, -.02), B.foreR, o.bag);
    const mesh = rigidSkin(HUMAN, parts, new THREE.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: .85 })); mesh.name = 'walker ' + o.id; return mesh;
  }
  /** Walk pose of a low-poly walker at step phase ph (cycles) — hips swing the legs, knees fold in the swing, arms swing against the legs. */
  function walkPose(m, ph, bob = 1) {
    const b = m.userData.bones, s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    b.thighL.rotation.x = -.38 * s; b.thighR.rotation.x = .38 * s;
    b.shinL.rotation.x = .95 * Math.max(0, Math.cos((ph + .12) * TAU)) ** 2 + .06; b.shinR.rotation.x = .95 * Math.max(0, -Math.cos((ph + .12) * TAU)) ** 2 + .06;
    b.armL.rotation.x = .3 * s; b.armR.rotation.x = -.3 * s; b.foreL.rotation.x = -.25 - .12 * Math.max(0, -s); b.foreR.rotation.x = -.25 - .12 * Math.max(0, s);
    b.hips.position.y = .95 - .022 * bob * Math.abs(s) ** 1.5; // lowest with the legs apart b.hips.rotation.y = .07 * s; b.spine.rotation.y = -.1 * s; b.head.rotation.y = .03 * s;
  }
  const DOG = [{ name: 'root', parent: -1, at: [0, 0, 0] }, { name: 'body', parent: 0, at: [0, .38, 0] }, { name: 'head', parent: 1, at: [0, .48, .28] }, { name: 'fl', parent: 1, at: [-.07, .34, .2] }, { name: 'fr', parent: 1, at: [.07, .34, .2] }, { name: 'bl', parent: 1, at: [-.07, .34, -.2] }, { name: 'br', parent: 1, at: [.07, .34, -.2] }, { name: 'tail', parent: 1, at: [0, .44, -.27] }];
  function dog(color) {
    const parts = [], P = (g, b, c = color) => parts.push([g, b, c]);
    P(at(cyl(.1, .09, .52, 8), 0, .4, 0, Math.PI / 2), 1); P(at(ball(.09, 7, 5), 0, .55, .32), 2); P(at(ball(.05, 5, 4), 0, .52, .42, 0, 0, 0, 1, .8, 1.3), 2); P(at(ball(.015, 4, 3), 0, .53, .48), 2, '#111');
    for (const s of [-1, 1]) P(at(ball(.035, 4, 3), s * .06, .6, .3, 0, 0, s * .4, 1, 1.6, .6), 2, '#5a3a24');
    for (const [k, x, z] of [[3, -.07, .2], [4, .07, .2], [5, -.07, -.2], [6, .07, -.2]]) P(at(cyl(.03, .025, .34, 5), x, .17, z), k);
    P(at(cyl(.02, .012, .22, 5), 0, .5, -.34, -.9), 7); P(at(new THREE.TorusGeometry(.07, .012, 4, 10), 0, .5, .25, Math.PI / 2), 2, '#c0392b');
    const mesh = rigidSkin(DOG, parts, new THREE.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: .9 })); mesh.name = 'dog'; return mesh;
  }
  function trotPose(m, ph, t) { const b = m.userData.bones, s = Math.sin(ph * TAU); b.fl.rotation.x = -.5 * s; b.br.rotation.x = -.5 * s; b.fr.rotation.x = .5 * s; b.bl.rotation.x = .5 * s; b.body.position.y = .38 + .012 * Math.abs(Math.cos(ph * TAU)); b.tail.rotation.z = .35 * Math.sin(t * 9); b.head.rotation.x = .04 * Math.sin(ph * TAU * 2); }

  // the far pavement: two lanes; x0 start, speed m/s (sign = direction), outfits; the street loops between -34 and 66
  const walkers = [
    { id: 'rabbit in a coat', x0: 6, z: -6.3, v: 1.25, ears: 'long', fur: '#e9e1d4', muzzle: '#f5efe6', top: '#3f6b8c', legs: '#2e3440', shoes: '#4a3428', coat: true, sleeve: true },
    { id: 'bear with a shopping bag', x0: 38, z: -5.1, v: -1.1, fur: '#7a5236', muzzle: '#a7805e', top: '#c8a24a', legs: '#3d4b5c', shoes: '#222', sleeve: false, bag: '#e6dccb' },
    { id: 'cat with a dog', x0: -14, z: -5.0, v: 1.15, fur: '#d58a3c', muzzle: '#f0d2a8', top: '#8f3b3b', legs: '#262a33', shoes: '#ddd', sleeve: true, dog: '#c79257' },
    { id: 'dog in a suit', x0: 52, z: -6.5, v: -1.3, fur: '#9a9a9a', muzzle: '#cfcfcf', top: '#2c3138', legs: '#2c3138', shoes: '#111', sleeve: true }
  ];
  const LOOP = [-34, 66], WALK_STRIDE = 1.42;
  const walkerAt = (w, t) => { const L = LOOP[1] - LOOP[0]; let x = ((w.x0 + w.v * t - LOOP[0]) % L + L) % L + LOOP[0]; return { x, z: w.z, ry: w.v > 0 ? Math.PI / 2 : -Math.PI / 2, dist: Math.abs(w.v) * t }; };

  /* ---------------------------------------------------------------- pigeons */
  const pigeons = [
    { x: 6.0, z: 6.55, n: 4, seed: 7 },   // on the walk from the stop (walk shot 1)
    { x: 17.9, z: 6.9, n: 6, seed: 19 }   // in front of the café, he walks through them (walk shot 2)
  ];
  const FLUSH = 2.6; // metres: closer than this, the flock takes off
  /** When (scene time) the flock was flushed, given the Fighter's position at each sampled time; null while it is still on the ground. */
  function pigeonState(flock, t, track) { for (const [tt, x, z] of track) { if (tt > t) break; if (Math.hypot(x - flock.x, z - flock.z) < FLUSH) return tt; } return null; }
  function birdGeometry() {
    const body = at(ball(.06, 7, 5), 0, 0, 0, 0, 0, 0, .85, .8, 1.5), head = at(ball(.032, 6, 4), 0, .06, .075), beak = at(new THREE.ConeGeometry(.008, .025, 4), 0, .055, .11, Math.PI / 2), tail = at(new THREE.BoxGeometry(.06, .01, .07), 0, .01, -.1, -.25);
    const parts = [[body, '#8d929e'], [head, '#5f6b7d'], [beak, '#3a3a3a'], [tail, '#5a5f69']], pos = [], col = [], c = new THREE.Color();
    for (const [g0, cc] of parts) { const g = g0.index ? g0.toNonIndexed() : g0; c.set(cc).convertSRGBToLinear(); for (let i = 0; i < g.attributes.position.count; i++) { pos.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)); col.push(c.r, c.g, c.b); } if (g !== g0) g.dispose(); g0.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }
  function wingGeometry(s) { const g = new THREE.BufferGeometry(), v = [0, 0, .04, s * .17, 0, -.01, 0, 0, -.06, s * .12, 0, -.07]; g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(s > 0 ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1]); g.computeVertexNormals(); return g; }

  /* ---------------------------------------------------------------- clouds, litter */
  function cloudTexture(seed) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'), r = rnd(seed);
    for (let k = 0; k < 16; k++) { const x = 40 + r() * 176, y = 58 + (r() - .5) * 34 - Math.sin((x - 40) / 176 * Math.PI) * 14, rr = 22 + r() * 30, gr = g.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(250,248,244,.32)'); gr.addColorStop(1, 'rgba(240,238,236,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }
  function litter(rng) {
    const pos = [], col = [], c = new THREE.Color(), quad = (x, z, w, d, a, color, y = .006) => { const ca = Math.cos(a), sa = Math.sin(a), pts = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([u, v]) => [x + u * ca - v * sa, y, z + u * sa + v * ca]); c.set(color).convertSRGBToLinear(); for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(...pts[k]); col.push(c.r, c.g, c.b); } };
    const leaf = ['#b8742c', '#c9962e', '#8f5a26', '#a7a03a', '#d4a642'];
    const spots = [[11.6, 5.4, 2.2, 22], [17.4, -5.4, 2.4, 20], [28, 5.6, 2.2, 18], [6.6, -5.3, 2.2, 14], [34.6, -5.4, 2, 12]]; // under the trees
    for (const [x, z, r, n] of spots) for (let k = 0; k < n; k++) { const a = rng() * TAU, d = Math.sqrt(rng()) * r; quad(x + Math.cos(a) * d, z + Math.sin(a) * d * .8, .035 + rng() * .02, .022 + rng() * .01, rng() * TAU, leaf[k % leaf.length]); }
    for (let k = 0; k < 26; k++) { const x = 2 + rng() * 26, z = (rng() < .5 ? 3.75 + rng() * .5 : 8.6 + rng() * .4); quad(x, z, .03 + rng() * .02, .02, rng() * TAU, leaf[k % leaf.length]); } // along the kerb and walls
    for (let k = 0; k < 18; k++) { const x = 19 + rng() * 9, z = -3.62 - rng() * .5; quad(x, z, .03, .02, rng() * TAU, leaf[k % 5]); }
    for (const [x, z, color] of [[9.1, 7.9, '#f2efe6'], [14.2, 4.0, '#e8e2d0'], [25.3, -4.3, '#d9473b'], [21.0, 3.75, '#f2efe6'], [3.6, 8.2, '#4a6fa5'], [30.4, -6.9, '#f2efe6']]) quad(x, z, .06 + rng() * .03, .045, rng() * TAU, color, .008); // paper, a ticket, a wrapper
    for (const [x, z] of [[12.4, 7.6], [26.2, -5.9], [7.2, 4.4]]) quad(x, z, .09, .07, rng(), '#5d5b55', .002); // damp patches
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }

  function build(scene, opts = {}) {
    const group = new THREE.Group(); group.name = 'street life'; scene.add(group); const owned = [];
    const own = o => { owned.push(o); return o; };
    // clouds: soft sprites high over the far roofs and down the street, drifting with the wind
    const clouds = [], rng = rnd(97);
    for (let k = 0; k < 9; k++) {
      const tex = own(cloudTexture(11 + k * 7)), mat = own(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true, opacity: .9, color: new THREE.Color(k % 3 ? 0xfffaf2 : 0xf3ece4) })), s = new THREE.Sprite(mat);
      const a = -1.2 + k * .42 + rng() * .2, r = 150 + rng() * 50; s.position.set(20 + Math.cos(a) * r, 52 + rng() * 34, -Math.sin(a) * r * .9 - 20); const w = 70 + rng() * 50; s.scale.set(w, w * .42, 1); s.renderOrder = -2;
      s.userData.x0 = s.position.x; clouds.push(s); group.add(s);
    }
    // litter and leaves (one mesh)
    const lm = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), lg = own(litter(rnd(31))), lit = new THREE.Mesh(lg, lm); lit.name = 'leaves and litter'; lit.receiveShadow = true; group.add(lit);
    // walkers (and the dog)
    const people = walkers.map(w => { const m = walker(w); own(m.geometry); own(m.material); group.add(m); let d = null; if (w.dog) { d = dog(w.dog); own(d.geometry); own(d.material); group.add(d); } return { w, m, d }; });
    const leash = own(new THREE.BufferGeometry().setFromPoints([V(), V()])), leashLine = new THREE.Line(leash, own(new THREE.LineBasicMaterial({ color: 0x2b2420 }))); group.add(leashLine);
    // pigeons
    const total = pigeons.reduce((n, f) => n + f.n, 0), bm = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 })), wm = own(new THREE.MeshStandardMaterial({ color: 0x7d8290, roughness: .85, side: THREE.DoubleSide }));
    const body = new THREE.InstancedMesh(own(birdGeometry()), bm, total), wings = [-1, 1].map(s => new THREE.InstancedMesh(own(wingGeometry(s)), wm, total)); body.name = 'pigeons'; body.castShadow = true;
    for (const m of [body, ...wings]) { m.frustumCulled = false; group.add(m); }
    const track = opts.track ? opts.track.slice() : [], live = !opts.track; const birds = []; for (const f of pigeons) { const r = rnd(f.seed); for (let k = 0; k < f.n; k++) birds.push({ f, x: f.x + (r() - .5) * 1.6, z: f.z + (r() - .5) * 1.0, ry: r() * TAU, ph: r() * 10, fly: { a: (r() - .5) * 1.6, up: 2.2 + r() * 1.4, out: 3 + r() * 3, delay: r() * .35 } }); }
    let lastT = -1, level = opts.level ?? 2;
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S1 = V(1, 1, 1), P = V(), W = new THREE.Matrix4();
    function setLevel(n) { level = n; for (const p of people) { p.m.visible = n >= 2; if (p.d) p.d.visible = n >= 2; } leashLine.visible = n >= 2; for (const m of [body, ...wings]) m.visible = n >= 2; for (const c of clouds) c.visible = n >= 1; lit.visible = n >= 1; }
    setLevel(level);
    function update(dt, t, fighter) {
      for (const c of clouds) c.position.x = c.userData.x0 + t * 1.1; // wind from the west, slow
      if (level < 2) return;
      for (const { w, m, d } of people) {
        const p = walkerAt(w, t); m.position.set(p.x, 0, p.z); m.rotation.y = p.ry; walkPose(m, p.dist / WALK_STRIDE + w.x0 * .13);
        if (d) { const off = w.v > 0 ? 1.15 : -1.15, dx = p.x + off, dz = p.z - .55; d.position.set(dx, 0, dz); d.rotation.y = p.ry; trotPose(d, p.dist / .62, t); m.updateMatrixWorld(true); const hand = m.userData.bones.foreL.localToWorld(V(-.02, -.28, .02)); leash.attributes.position.setXYZ(0, hand.x, hand.y, hand.z); leash.attributes.position.setXYZ(1, dx + off * .2, .5, dz); leash.attributes.position.needsUpdate = true; }
      }
      if (live) { if (t < lastT - 1e-6) track.length = 0; if (fighter) track.push([t, fighter.x, fighter.z]); } lastT = t;
      const flushed = new Map(pigeons.map(f => [f, pigeonState(f, t, track)])); let i = 0;
      for (const b of birds) {
        const t0 = flushed.get(b.f), u = t0 == null ? -1 : t - t0 - b.fly.delay; let flap = 0;
        if (u < 0) { // on the ground: walk a little, bob the head, peck
          const pk = Math.max(0, Math.sin(t * 3.1 + b.ph)) ** 6; P.set(b.x + .08 * Math.sin(t * .4 + b.ph), 0, b.z + .06 * Math.cos(t * .33 + b.ph)); E.set(.5 * pk, b.ry + .4 * Math.sin(t * .25 + b.ph), 0); P.y = .06;
        } else { // away from him: a burst up and out, wings beating
          const away = fighter ? Math.atan2(b.x - fighter.x, b.z - fighter.z) + b.fly.a : b.fly.a, k = Math.min(u, 4.5); P.set(b.x + Math.sin(away) * (b.fly.out * k + .4 * k * k), .06 + b.fly.up * k + .25 * k * k, b.z + Math.cos(away) * (b.fly.out * k + .4 * k * k)); E.set(-.5 * smooth(u * 3), away, 0); flap = 1;
        }
        Q.setFromEuler(E); M4.compose(P, Q, S1); body.setMatrixAt(i, u > 4.5 ? M4.makeScale(0, 0, 0) : M4);
        const beat = flap ? Math.sin(t * 42 + b.ph) * 1.1 : -1.35;
        for (const [s, wing] of [[-1, wings[0]], [1, wings[1]]]) { W.makeRotationZ(s * -beat).premultiply(W.clone().makeTranslation(s * .035, .045, 0)); const m = M4.clone().multiply(W); wing.setMatrixAt(i, u > 4.5 ? m.makeScale(0, 0, 0) : m); }
        i++;
      }
      body.instanceMatrix.needsUpdate = true; for (const w of wings) w.instanceMatrix.needsUpdate = true;
    }
    function stats() { let meshes = 0, tris = 0; group.traverse(o => { if (!o.visible || !(o.isMesh || o.isSprite)) return; meshes++; const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); }); return { meshes, triangles: Math.round(tris), level }; }
    function dispose() { scene.remove(group); for (const o of owned) o?.dispose?.(); }
    return { group, update, level: setLevel, stats, dispose, clouds, people, birds };
  }

  /* ---------------------------------------------------------------- a character's shadow stand-in */
  const CAPS = { hips: ['spine', .17], spine: ['chest', .17], chest: ['neck', .2], neck: ['head', .08], armL: ['elbowL', .07], elbowL: ['handL', .055], armR: ['elbowR', .07], elbowR: ['handR', .055], thighL: ['kneeL', .09], kneeL: ['footL', .065], thighR: ['kneeR', .09], kneeR: ['footR', .065] };
  function shadowProxy(c) {
    const sk = c.skin.skeleton, names = sk.bones.map(b => b.name), rest = sk.boneInverses.map(m => m.clone().invert()), head = i => V().setFromMatrixPosition(rest[i]), parts = [];
    const capsule = (a, b, r, bone) => { const len = a.distanceTo(b), g = new THREE.CylinderGeometry(r, r * .9, Math.max(.01, len), 8, 1), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); g.applyMatrix4(new THREE.Matrix4().compose(a.clone().lerp(b, .5), q, V(1, 1, 1))); parts.push([g, bone]); for (const p of [a, b]) parts.push([at(ball(r, 8, 6), p.x, p.y, p.z), bone]); };
    for (const [n, [to, r]] of Object.entries(CAPS)) { const i = names.indexOf(n), j = names.indexOf(to); if (i >= 0 && j >= 0) capsule(head(i), head(j), r, i); }
    const hi = names.indexOf('head'); if (hi >= 0) { const h = head(hi); parts.push([at(ball(c.species === 'lion' ? .2 : .15, 10, 8), h.x, h.y + .14, h.z + .02), hi]); }
    for (const s of ['L', 'R']) { const i = names.indexOf('foot' + s); if (i >= 0) { const f = head(i); parts.push([at(new THREE.BoxGeometry(.11, .08, .27), f.x, f.y - .08, f.z + .07), i]); } const h = names.indexOf('hand' + s); if (h >= 0) { const p = head(h); parts.push([at(ball(.06, 6, 5), p.x, p.y - .05, p.z), h]); } }
    const pos = [], si = [], sw = [];
    for (const [g0, bone] of parts) { const g = g0.index ? g0.toNonIndexed() : g0; for (let i = 0; i < g.attributes.position.count; i++) { pos.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)); si.push(bone, 0, 0, 0); sw.push(1, 0, 0, 0); } if (g !== g0) g.dispose(); g0.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.computeVertexNormals();
    const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial({ skinning: true, colorWrite: false, depthWrite: false })); mesh.name = 'shadow stand-in'; mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.layers.set(SHADOW_LAYER);
    c.skin.parent.add(mesh); mesh.bind(sk, c.skin.bindMatrix); mesh.matrixAutoUpdate = c.skin.matrixAutoUpdate; mesh.position.copy(c.skin.position); mesh.quaternion.copy(c.skin.quaternion); mesh.scale.copy(c.skin.scale);
    mesh.userData.dispose = () => { mesh.parent?.remove(mesh); geo.dispose(); mesh.material.dispose(); }; return mesh;
  }

  window.StreetLife = { build, shadowProxy, pigeonState, walkers, pigeons, FLUSH, SHADOW_LAYER, walkerAt };
})();
