/* Chapter 1 beat 4, "the old bag breaks" (GOTR-0087): the old heavy bag of Bruno's Gym (model), the short film that ends
 * the night training (scene id 'dream_bag_break') and the state of the bag in the gym afterwards.
 * Script, time warp and physics: bag-break-core.js. Same picture rules as the Dream scenes: bars top and bottom, the one
 * line as plain text in the bottom bar, Skip always works, borrowed rig handed back exactly as found.
 *
 * BagBreak.play(id, { onDone(result), reducedMotion?, timeScale? }) -> true when it starts ; result { id, skipped, error? }
 *   (StoryScenes.play forwards 'dream_bag_break' here) ; BagBreak.ids / has(id) / playing / stop() / seek(wallSeconds) / debug / stats()
 * BagBreak.filmFor(stepId) -> the film that ends a story step ('night_bag' -> 'dream_bag_break')
 * BagBreak.gymState() -> 'hanging' | 'broken' | 'new' from the save (docs/adventure/DREAM_HOOKS.md) ; BagBreak.force = state for QA
 * BagBreak.dress(ctx) -> used by the set 'dream_gym': puts the old bag there in its present state (set.objects.oldBag)
 * BagBreak.bag({ worn }) -> { group, body, ... } the bag alone ; BagBreak.rig(state) -> bag + chain + ceiling mount + pose(sample)
 * BagBreak.training(on) -> dresses the training heavy bag as the old bag (the night training hits the bag that falls) */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), Core = () => window.BagBreakCore, Cast = () => window.StoryCast, Pose = () => window.DreamPose;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); }, lerp = (a, b, k) => a + (b - a) * k;
  const W = { en: { skip: 'Skip', you: 'Fighter' }, he: { skip: 'דילוג', you: 'הלוחם' }, ru: { skip: 'Пропустить', you: 'Боец' } };
  const lang = () => W[window.app?.lang] ? window.app.lang : 'en';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const UP = V(0, 1, 0);
  let current = null, lastStats = null, force = null;

  // ---------------------------------------------------------------- the bag
  /** Leather skin: six stitched panels, band seams, the worn strike zone with cracks and a tape patch, the faded gym stencil. */
  function skin(worn) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
    let seed = worn ? 9157 : 3391; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    x.fillStyle = worn ? '#6f2c20' : '#1f3559'; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 2600; i++) { const d = rnd() < .5; x.fillStyle = d ? `rgba(20,8,5,${.03 + rnd() * .07})` : `rgba(255,214,170,${.015 + rnd() * .04})`; x.fillRect(rnd() * 1024, rnd() * 512, 2 + rnd() * 22, 1 + rnd() * 5); }
    if (worn) for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(30,12,8,${.05 + rnd() * .05})`; x.fillRect(rnd() * 1024, 380 + rnd() * 110, 60 + rnd() * 160, 20 + rnd() * 50); } // grime low down
    const stitch = (x0, y0, x1, y1) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 11); x.fillStyle = worn ? '#cdb892' : '#e9e4d6'; for (let i = 0; i < n; i++) { if (worn && rnd() < .08) continue; const k = (i + .2) / n, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k; x.fillRect(px - (x0 === x1 ? 1 : 0), py - (y0 === y1 ? 1 : 0), x0 === x1 ? 2.2 : 6, x0 === x1 ? 6 : 2.2); } };
    for (let k = 0; k < 6; k++) { const px = k * 1024 / 6; for (const o of k ? [0] : [0, 1024]) { x.fillStyle = 'rgba(18,7,5,.85)'; x.fillRect(px + o - 3, 0, 6, 512); x.fillStyle = 'rgba(255,220,180,.10)'; x.fillRect(px + o + 3, 0, 3, 512); stitch(px + o - 9, 0, px + o - 9, 512); stitch(px + o + 10, 0, px + o + 10, 512); } }
    for (const py of [66, 446]) { x.fillStyle = 'rgba(18,7,5,.85)'; x.fillRect(0, py - 3, 1024, 6); stitch(0, py - 9, 1024, py - 9); stitch(0, py + 10, 1024, py + 10); }
    x.fillStyle = worn ? 'rgba(28,12,8,.55)' : 'rgba(10,14,24,.5)'; x.fillRect(0, 0, 1024, 54); x.fillRect(0, 458, 1024, 54);
    // stencil on the side that faces the hall (u = .5)
    x.save(); x.textAlign = 'center'; x.fillStyle = worn ? 'rgba(226,205,160,.42)' : 'rgba(244,193,82,.9)'; x.font = '900 46px sans-serif'; x.fillText(worn ? "BRUNO'S" : 'GLORY', 598, 150); x.font = '700 20px sans-serif'; x.fillText(worn ? 'G Y M  ·  OLD TOWN' : 'OLD TOWN', 598, 180); x.restore();
    if (worn) {
      // the strike zone on the Fighter's side (u = .25): scuffed pale, cracked, patched with tape
      for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(214,170,140,${.035 + rnd() * .03})`; x.beginPath(); x.ellipse(256 + (rnd() - .5) * 40, 228 + (rnd() - .5) * 50, 34 + rnd() * 52, 46 + rnd() * 70, rnd(), 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(24,9,6,.7)'; x.lineWidth = 1.4; for (let i = 0; i < 16; i++) { let px = 200 + rnd() * 112, py = 150 + rnd() * 150; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (rnd() - .5) * 26; py += 6 + rnd() * 14; x.lineTo(px, py); } x.stroke(); }
      x.save(); x.translate(300, 318); x.rotate(-.14); x.fillStyle = '#8f9399'; x.fillRect(-54, -19, 108, 38); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(-54, -19, 108, 4); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(-54, 15, 108, 4); x.restore();
      x.save(); x.translate(214, 352); x.rotate(.5); x.fillStyle = '#7f838a'; x.fillRect(-40, -14, 80, 28); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-40, -14, 80, 3); x.restore();
      x.fillStyle = '#84888f'; x.fillRect(0, 404, 1024, 24); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(0, 404, 1024, 3); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, 425, 1024, 3); // a wrap of tape round the bottom
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }
  /** The bag alone, origin at the middle of the body, axis along +y, the strike zone toward -x.
   *  Returns { group, body, top, base, dent(contact | null, fold), dispose() }. */
  function bag(o = {}) {
    const B = Core().BAG, worn = o.worn !== false, group = new THREE.Group(); group.name = worn ? 'Old heavy bag' : 'New heavy bag';
    const map = skin(worn), leather = new THREE.MeshStandardMaterial({ map, roughness: worn ? .66 : .5, metalness: 0 });
    const dark = new THREE.MeshStandardMaterial({ color: lin(worn ? '#2a1712' : '#141b2a'), roughness: .7 }), web = new THREE.MeshStandardMaterial({ color: lin('#25221f'), roughness: .9 }), steel = new THREE.MeshStandardMaterial({ color: lin('#aab2bc'), roughness: .36, metalness: .85 });
    const mesh = (parent, g, m, x = 0, y = 0, z = 0) => { const n = new THREE.Mesh(g, m); n.position.set(x, y, z); n.castShadow = n.receiveShadow = true; parent.add(n); return n; };
    const bodyG = new THREE.CylinderGeometry(B.r, B.r, B.h * 2, 48, 28, true).rotateY(Math.PI), pos = bodyG.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), k = 1 + (worn ? .035 : .012) * Math.exp(-(((y + .2) / .3) ** 2)) - .02 * smooth((Math.abs(y) - B.h + .06) / .06); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); } // an old bag sags low and tucks in at the rims
    bodyG.computeVertexNormals(); const nor = bodyG.attributes.normal; for (let i = 0; i <= 28; i++) { const a = i * 49, b2 = a + 48; for (const f of ['X', 'Y', 'Z']) nor['set' + f](b2, nor['get' + f](a)); } // close the shading seam
    const body = mesh(group, bodyG, leather); body.name = 'Heavy bag leather';
    const rest = Float32Array.from(pos.array), restN = Float32Array.from(nor.array);
    const base = new THREE.Group(), top = new THREE.Group(); group.add(base, top);
    mesh(base, new THREE.SphereGeometry(B.r * .985, 32, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dark, 0, -B.h + .002).scale.y = .26;
    mesh(base, new THREE.CylinderGeometry(B.r + .004, B.r + .004, .05, 48, 1, true), dark, 0, -B.h + .025);
    mesh(top, new THREE.CylinderGeometry(B.r + .004, B.r + .004, .07, 48, 1, true), dark, 0, B.h - .035);
    mesh(top, new THREE.CylinderGeometry(B.r, B.r + .004, .012, 48), dark, 0, B.h);
    // four webbing straps from D-rings on the top band up to the steel ring and swivel
    const ringY = B.ring - .05, strapG = new THREE.BoxGeometry(.034, 1, .005), dG = new THREE.TorusGeometry(.022, .0045, 6, 14);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2, from = V(Math.cos(a) * (B.r - .03), B.h + .012, Math.sin(a) * (B.r - .03)), to = V(Math.cos(a) * .022, ringY, Math.sin(a) * .022), d = to.clone().sub(from);
      const s = mesh(top, strapG, web); s.position.copy(from).addScaledVector(d, .5); s.scale.y = d.length(); s.quaternion.setFromUnitVectors(UP, d.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(UP, -a + Math.PI / 2));
      const dr = mesh(top, dG, steel, from.x, from.y - .012, from.z); dr.rotation.y = -a + Math.PI / 2;
      mesh(top, new THREE.BoxGeometry(.05, .05, .006), web, Math.cos(a) * (B.r + .004), B.h - .04, Math.sin(a) * (B.r + .004)).rotation.y = -a + Math.PI / 2;
    }
    mesh(top, new THREE.TorusGeometry(.034, .0065, 8, 18), steel, 0, ringY, 0); mesh(top, new THREE.CylinderGeometry(.011, .011, .05, 10), steel, 0, B.ring - .022, 0);
    let dented = false;
    /** contact = { y, ax, az, depth } in bag space (ax, az = unit direction from the axis to the glove); fold = how far the bag bends round it (m). */
    function dent(contact, fold = 0) {
      const on = !!contact && (contact.depth > .002 || Math.abs(fold) > .002);
      if (!on) { if (dented) { pos.array.set(rest); nor.array.set(restN); pos.needsUpdate = nor.needsUpdate = true; top.position.set(0, 0, 0); base.position.set(0, 0, 0); dented = false; } return; }
      const { y: cy, ax, az, depth } = contact, bend = y => fold * (.3 - clamp(((y - cy) / B.h) ** 2, 0, 2.2));
      for (let i = 0; i < pos.count; i++) {
        const rx = rest[i * 3], ry = rest[i * 3 + 1], rz = rest[i * 3 + 2], r = Math.hypot(rx, rz) || 1, ux = rx / r, uz = rz / r, cosA = ux * ax + uz * az;
        const arc = Math.acos(clamp(cosA, -1, 1)) * B.r, d2 = arc * arc + (ry - cy) ** 2, push = depth * Math.exp(-d2 / (2 * .125 * .125)), bulge = depth * .22 * Math.exp(-((ry - cy) ** 2) / .06) * (1 - cosA * cosA); // pressed in at the glove, squeezed out at the sides
        const f = bend(ry); pos.array[i * 3] = rx - ux * push + ux * bulge - ax * f; pos.array[i * 3 + 1] = ry; pos.array[i * 3 + 2] = rz - uz * push + uz * bulge - az * f;
      }
      pos.needsUpdate = true; bodyG.computeVertexNormals(); for (let i = 0; i <= 28; i++) { const a = i * 49, b2 = a + 48, nx = nor.getX(a) + nor.getX(b2), ny = nor.getY(a) + nor.getY(b2), nz = nor.getZ(a) + nor.getZ(b2), l = Math.hypot(nx, ny, nz) || 1; nor.setXYZ(a, nx / l, ny / l, nz / l); nor.setXYZ(b2, nx / l, ny / l, nz / l); }
      const ft = bend(B.h), fb = bend(-B.h); top.position.set(-ax * ft, 0, -az * ft); base.position.set(-ax * fb, 0, -az * fb); dented = true;
    }
    const dispose = () => { group.traverse(n => { n.geometry?.dispose(); }); for (const m of [leather, dark, web, steel]) m.dispose(); map.dispose(); };
    return { group, body, top, base, dent, dispose, materials: { leather, dark, web, steel }, map };
  }

  /** The bag where it hangs in Bruno's Gym: ceiling mount, chain of 13 links, the bag. state: 'hanging' | 'broken' | 'new'.
   *  pose(sample) places everything from a physics sample (BagBreakCore.sample). World frame: s along the punch direction. */
  function rig(state = 'hanging') {
    const C = Core(), B = C.BAG, P = C.PLACE, group = new THREE.Group(); group.name = 'Old bag place (' + state + ')';
    const dir = V(P.dir[0], 0, P.dir[1]), side = V(P.side[0], 0, P.side[1]), origin = V(P.x, 0, P.z);
    const world = (p, out = V()) => out.copy(origin).addScaledVector(dir, p[0]).addScaledVector(side, p[2]).setY(p[1]);
    const theBag = bag({ worn: state !== 'new' }); group.add(theBag.group);
    const steel = theBag.materials.steel, iron = new THREE.MeshStandardMaterial({ color: lin('#3b4350'), roughness: .6, metalness: .5 });
    const add = (g, m, x, y, z) => { const n = new THREE.Mesh(g, m); n.position.set(x, y, z); n.castShadow = n.receiveShadow = true; group.add(n); return n; };
    // ceiling mount: plate, drop pipe, brace plate, eye
    add(new THREE.BoxGeometry(.34, .04, .34), iron, P.x, 5.38, P.z); add(new THREE.CylinderGeometry(.028, .028, 5.4 - B.mount - .05, 10), iron, P.x, (5.4 + B.mount + .05) / 2, P.z);
    add(new THREE.BoxGeometry(.12, .02, .12), iron, P.x, B.mount + .05, P.z); add(new THREE.TorusGeometry(.026, .008, 8, 16), steel, P.x, B.mount + .02, P.z);
    const linkG = new THREE.TorusGeometry(.0205, .0058, 6, 14), links = [];
    for (let i = 0; i < B.links; i++) { const l = add(linkG, steel, 0, 0, 0); l.scale.set(1, 1.5, 1); links.push(l); }
    const basis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, UP, side)), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), tmp = V(), twist = [new THREE.Quaternion(), new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2)];
    function pose(s) {
      const b = s.bag; world([b.s, b.y, b.w], theBag.group.position);
      tmp.copy(dir).multiplyScalar(-Math.sin(b.th)).addScaledVector(UP, Math.cos(b.th)); q1.setFromUnitVectors(UP, tmp); q2.setFromAxisAngle(UP, -b.yaw);
      theBag.group.quaternion.copy(q2).multiply(q1).multiply(basis).multiply(q2.setFromAxisAngle(UP, b.roll * (b.th < 0 ? 1 : -1)));
      for (let i = 0; i < links.length; i++) { const l = s.links[i]; world(l.p, links[i].position); tmp.copy(dir).multiplyScalar(l.d[0]).addScaledVector(side, l.d[2]).setY(l.d[1]).normalize(); links[i].quaternion.setFromUnitVectors(UP, tmp).multiply(twist[i % 2]); }
      current0 = s;
    }
    let current0 = null;
    pose(state === 'broken' ? C.rest() : C.sample(0)); if (state !== 'broken') { const s = C.sample(0); s.bag.s = 0; s.bag.th = 0; for (let i = 0; i < s.links.length; i++) { s.links[i].p = [0, B.mount - (i + .5) * B.pitch, 0]; s.links[i].d = [0, -1, 0]; } pose(s); }
    return { group, state, bag: theBag, links, pose, world, dir, side, get sample() { return current0; }, dispose() { theBag.dispose(); linkG.dispose(); iron.dispose(); group.traverse(n => { if (n.isMesh && n.parent === group && n.geometry !== linkG) n.geometry.dispose(); }); } };
  }
  const game = () => { try { return window.ringfighterGame?.store?.game?.() || null; } catch { return null; } };
  const gymState = g => force || Core().gymState(g || game());
  /** Called by the set 'dream_gym' in place of its plain first bag. */
  function dress(ctx) {
    if (!Core() || !ctx?.add) return false;
    const r = rig(gymState()); ctx.add(r.group, false, false); ctx.objects.oldBag = r; ctx.disposables.push({ dispose: () => r.dispose() });
    if (ctx.shade) ctx.shade(r.bag.group.position.x, r.bag.group.position.z, .8, .8);
    return true;
  }

  // ---------------------------------------------------------------- the training bag wears the old bag's skin
  let trained = null;
  function training(on) {
    const model = window.app?.engine?.arena?.models?.heavy, body = model?.userData?.soft;
    if (trained) { const t = trained; trained = null; for (const [m, mat] of t.swaps) m.material = mat; for (const n of t.hidden) n.visible = true; for (const n of t.added) n.parent?.remove(n); t.dispose(); }
    if (!on || !body || !Core()) return false;
    const B = Core().BAG, map = skin(true); map.offset.x = -.25; // the strike zone faces the Fighter (u = .5 on the training model)
    const leather = new THREE.MeshStandardMaterial({ map, roughness: .66 }), dark = new THREE.MeshStandardMaterial({ color: lin('#2a1712'), roughness: .7 }), steel = new THREE.MeshStandardMaterial({ color: lin('#aab2bc'), roughness: .36, metalness: .85 }), iron = new THREE.MeshStandardMaterial({ color: lin('#3b4350'), roughness: .6, metalness: .5 });
    const swing = model.userData.swing, swaps = [], hidden = [], added = [];
    for (const n of swing.children) if (n.isMesh && n.material === body.material) swaps.push([n, n.material]);
    for (const [m] of swaps) m.material = m === body ? leather : dark; if (!swaps.some(s => s[0] === body)) { swaps.push([body, body.material]); body.material = leather; }
    for (const n of model.children) if (n !== swing && n.isMesh) { hidden.push(n); n.visible = false; } // the floor stand: this bag hangs from the ceiling
    const linkG = new THREE.TorusGeometry(.0205, .0058, 6, 14), py = swing.position.y, chain = B.mount - py;
    for (let i = 0; i < B.links; i++) { const l = new THREE.Mesh(linkG, steel); l.position.set(0, py + (i + .5) * chain / B.links, 0); l.scale.set(1, 1.5 * chain / B.chain, 1); l.rotation.y = i % 2 ? Math.PI / 2 : 0; l.castShadow = true; model.add(l); added.push(l); }
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, 2.05, 10), iron); pipe.position.set(0, B.mount + 1.075, 0); model.add(pipe); added.push(pipe);
    trained = { swaps, hidden, added, dispose() { map.dispose(); leather.dispose(); dark.dispose(); steel.dispose(); iron.dispose(); linkG.dispose(); pipe.geometry.dispose(); } };
    return true;
  }

  // ---------------------------------------------------------------- dust, sweat, sparks: closed-form particles on sim time
  function particles(scene, r, events) {
    const C = Core(), cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.45, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), list = []; let seed = 4711; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }, R = (a, b) => a + (b - a) * rnd();
    const emit = (t0, p, v, o) => { const m = new THREE.SpriteMaterial({ map: tex, color: lin(o.color || '#b9a78c'), transparent: true, opacity: 0, depthWrite: false }), s = new THREE.Sprite(m); s.visible = false; s.renderOrder = 3; scene.add(s); list.push({ s, m, t0, p: r.world(p), v: V().addScaledVector(r.dir, v[0]).addScaledVector(r.side, v[2]).setY(v[1]), life: o.life, drag: o.drag || 0, g: o.g || 0, s0: o.s0, s1: o.s1, a: o.a }); };
    const B = C.BAG;
    for (const m of C.MOVES) { const n = m.big ? 16 : 4, y = B.cy + m.y, st = C.sample(m.hit).bag; for (let i = 0; i < n; i++) { const a = R(-1, 1) * 1.9; emit(m.hit + R(0, .02), [st.s - B.r * Math.cos(a) * .9, y + R(-.2, .25), B.r * Math.sin(a)], [-Math.cos(a) * R(.3, 1.3) * (m.big ? 1 : .4) + (m.big ? .9 : 0), R(-.1, .8), Math.sin(a) * R(.6, 2.1) * (m.big ? 1 : .4)], { life: m.big ? R(.7, 1.3) : .5, drag: 3.2, g: -.15, s0: .07, s1: m.big ? R(.4, .75) : .22, a: m.big ? .34 : .16 }); } }
    for (let i = 0; i < 9; i++) emit(C.BIG.hit + R(0, .03), [-.5, 1.78 + R(-.05, .08), R(-.08, .08)], [R(.8, 3.2), R(.4, 2.2), R(-1.2, 1.2)], { life: R(.45, .8), g: 9.8, drag: .4, s0: .016, s1: .012, a: .85, color: '#dfeeff' }); // sweat off the head
    if (events.snap != null) for (let i = 0; i < 7; i++) emit(events.snap + R(0, .01), [0, B.mount - (B.keep + .5) * B.pitch, 0], [R(-2.5, 2.5), R(-.5, 3), R(-2, 2)], { life: R(.2, .4), g: 9.8, drag: .5, s0: .022, s1: .008, a: 1, color: '#ffd28a' }); // sparks where the link opens
    for (const f of events.floor) if (f.speed > 1.9) { const n = f.flat ? 18 : 16; for (let i = 0; i < n; i++) { const a = R(0, Math.PI * 2), k = f.speed / 4.5, w = C.sample(f.t).bag.w; emit(f.t + R(0, .03), [f.s + (f.flat ? R(-.9, .3) : 0) + Math.cos(a) * .15, .05, w + Math.sin(a) * .2], [Math.cos(a) * R(.5, 2.2) * k, R(.15, .9) * k, Math.sin(a) * R(.7, 2.6) * k], { life: R(1.4, 2.6), drag: 2.4, g: .08, s0: .14, s1: R(.6, 1.15), a: .3 }); } }
    function update(t) {
      for (const q of list) {
        const u = t - q.t0, k = u / q.life; if (u < 0 || k >= 1) { q.s.visible = false; continue; }
        const e = q.drag ? (1 - Math.exp(-q.drag * u)) / q.drag : u; q.s.visible = true; q.s.position.copy(q.p).addScaledVector(q.v, e); q.s.position.y = Math.max(.02, q.s.position.y - .5 * q.g * u * u);
        const sc = lerp(q.s0, q.s1, Math.sqrt(k)); q.s.scale.set(sc, sc, 1); q.m.opacity = q.a * Math.min(1, u / .04) * (1 - k) ** 1.4;
      }
    }
    return { update, count: list.length, dispose() { for (const q of list) { scene.remove(q.s); q.m.dispose(); } tex.dispose(); } };
  }

  /** The one lamp over the bag: cord, enamel shade, bulb, a spot light that swings with it, a faint beam. */
  function lamp(scene, r, shadows) {
    const P = Core().PLACE, at = V(P.x, P.lamp[1], P.z).addScaledVector(r.dir, -P.lamp[0]).addScaledVector(r.side, P.lamp[2]), len = P.lamp[3], pivot = new THREE.Group(); pivot.position.copy(at); scene.add(pivot);
    const mats = [new THREE.MeshStandardMaterial({ color: lin('#20241f'), roughness: .8 }), new THREE.MeshStandardMaterial({ color: lin('#2f5d4a'), roughness: .35, metalness: .3, side: THREE.DoubleSide, emissive: lin('#3a2c12'), emissiveIntensity: .5 }), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false })];
    const geos = [new THREE.CylinderGeometry(.006, .006, len, 5), new THREE.ConeGeometry(.3, .19, 20, 1, true), new THREE.SphereGeometry(.055, 12, 8)];
    const part = (i, y) => { const m = new THREE.Mesh(geos[i], mats[i]); m.position.y = y; pivot.add(m); return m; };
    part(0, -len / 2); part(1, -len - .02); part(2, -len - .1);
    const spot = new THREE.SpotLight(0xffd6a0, 62, 0, 1.08, .5, 2), glow = new THREE.PointLight(0xffc888, 5, 9, 2); glow.position.set(0, -len + .12, 0); pivot.add(glow); // glow: what the room throws back up at the chain and the ceiling spot.position.set(0, -len - .1, 0); spot.target.position.set(0, -len - 3, 0); pivot.add(spot, spot.target);
    spot.castShadow = !!shadows; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0012; spot.shadow.normalBias = .04; spot.shadow.camera.near = .4; spot.shadow.camera.far = 9; spot.shadow.radius = 3;
    return { pivot, spot, set(a, b) { pivot.quaternion.setFromAxisAngle(r.side, -a).multiply(new THREE.Quaternion().setFromAxisAngle(r.dir, b)); }, dispose() { scene.remove(pivot); geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); spot.shadow.map?.dispose(); } };
  }

  // ---------------------------------------------------------------- the film
  const borrow = c => ({ c, parent: c.root.parent, pos: c.root.position.clone(), q: c.root.quaternion.clone(), scale: c.root.scale.clone(), visible: c.root.visible });
  function giveBack(b) { const r = b.c.root; r.parent?.remove(r); if (b.parent) b.parent.add(r); r.position.copy(b.pos); r.quaternion.copy(b.q); r.scale.copy(b.scale); r.visible = b.visible; b.c.maneInitialized = false; }
  const sound = (name, level, rate = 1, cutoff = 0) => { try { window.app?.audio?.playSample?.(name, level, rate, 0, cutoff); } catch { /* no sound */ } };

  function play(id, opts = {}) {
    const C = Core(), e = window.app?.engine, done = typeof opts.onDone === 'function' ? opts.onDone : () => {};
    const fail = error => { setTimeout(() => done({ id, skipped: true, error }), 0); return false; };
    if (!C || id !== C.ID) return fail('unknown scene');
    if (!e?.renderer || !e.coach?.update || !window.StorySets || !window.DreamCore || !Cast() || !Pose()) return fail('engine not ready');
    if (current) current.finish({ skipped: true, replaced: true });
    if (window.StoryScenes?.playing && window.StoryScenes.playing !== id) window.StoryScenes.stop();
    if (e.fightIQDemo) return fail('busy');
    training(false); window.DreamSets?.register();
    const scene0 = C.scene, w = W[lang()], P = C.PLACE, B = C.BAG;
    if (!Pose().GESTURES.head) Pose().GESTURES.head = { h: [.19, 1.985, .035], pole: [1, .3, -.25], palm: [-.6, -.8, 0], turn: .5 }; // both hands on the head: "...uh oh"
    // ---- overlay: bars, the line in the bottom bar, Skip (same parts as the Dream scenes)
    const d = el('dialog', 'story-scene dream-scene'); d.dir = lang() === 'he' ? 'rtl' : 'ltr'; d.dataset.kind = 'dream'; d.dataset.scene = id; d.dataset.tap = 'false';
    const host = el('div', 'story-host'), busy = el('div', 'story-busy', '…'), sub = el('div', 'dream-sub'), name = el('strong', 'dream-name'), text = el('p', 'dream-text'), skip = el('button', 'dream-skip', w.skip + ' ▸▸');
    sub.setAttribute('role', 'status'); sub.setAttribute('aria-live', 'polite'); skip.type = 'button'; sub.append(name, text);
    d.append(host, el('div', 'story-vignette'), el('div', 'dream-bar dream-bar-top'), el('div', 'dream-bar dream-bar-bottom'), busy, sub, skip); document.body.append(d);
    d.tabIndex = -1; try { d.showModal(); } catch { d.setAttribute('open', ''); } d.focus({ preventScroll: true });
    const run = { id, closed: false, t: 0, sim: 0, clock: 0, shot: 0, lineIndex: -1, phase: 'load' };
    current = run;
    let set = null, scene = null, camera = null, borrowed = null, c = null, hang = null, fx = null, light = null, stageMove = null, oldFit = null, lineKey = '', ended = false, prevSim = 0, depth = 0, contact = null, turn = null, exposure = null;
    const look = V(), a1 = V(), a2 = V(), inv = new THREE.Matrix4();
    const finish = (result = {}) => {
      if (run.closed) return; run.closed = true; if (current === run) current = null;
      try { cleanup(); } catch (x) { console.warn('bag break', x); }
      d.close?.(); d.remove(); window.removeEventListener('keydown', onKey);
      done({ id, skipped: false, ...result });
    };
    run.finish = finish;
    function cleanup() {
      if (e.fightIQDemo === run) e.fightIQDemo = null;
      if (c) { Cast().bag(c, 'off'); Cast().outfit(c, 'kit'); Cast().talk(c, 0); Pose().reset(c); c.root.position.y = 0; }
      if (borrowed) giveBack(borrowed); borrowed = null;
      fx?.dispose(); fx = null; light?.dispose(); light = null;
      set?.dispose(); set = null; hang = null;
      if (exposure != null) { e.renderer.toneMappingExposure = exposure; exposure = null; }
      if (stageMove) { stageMove.placeholder.replaceWith(stageMove.stage); stageMove.stage.classList.remove('game-preview-live', 'story-live'); stageMove.stage.style.pointerEvents = stageMove.pe; stageMove = null; window.dispatchEvent(new Event('resize')); }
      if (oldFit) { e.fitCameraToModel = oldFit; oldFit = null; }
      e.lastPoseStamp = null; e.lastRenderStamp = null;
    }
    const onKey = ev => { if (ev.key === 'Escape') { ev.preventDefault(); finish({ skipped: true }); } };
    window.addEventListener('keydown', onKey);
    d.addEventListener('cancel', ev => { ev.preventDefault(); finish({ skipped: true }); });
    skip.addEventListener('click', ev => { ev.stopPropagation(); finish({ skipped: true }); }); skip.addEventListener('pointerdown', ev => ev.stopPropagation());

    window.StorySets.ready().then(() => new Promise(r => requestAnimationFrame(() => r()))).then(() => {
      if (run.closed) return;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
      const shadows = !!e.renderer.shadowMap?.enabled, was = force; force = 'hanging';
      try { set = window.StorySets.build(scene0.set, scene, { renderer: e.renderer, shadows }); } finally { force = was; }
      hang = set.objects.oldBag; if (!hang) throw Error('the gym has no old bag');
      night(shadows); light = lamp(scene, hang, shadows); fx = particles(scene, hang, C.track().events);
      c = e.coach; borrowed = borrow(c); scene.add(c.root); c.root.visible = true; c.root.rotation.set(0, 0, 0); c.root.scale.set(-1, 1, 1); c.maneInitialized = false; Pose().reset(c); // always the mirrored root (GOTR-0074 / GOTR-0085)
      Cast().outfit(c, 'kit'); Cast().bag(c, 'off');
      const stage = e.stage || document.getElementById('stageContainer');
      if (stage) { const placeholder = document.createComment('bag break stage'); stage.before(placeholder); stageMove = { stage, placeholder, pe: stage.style.pointerEvents }; stage.style.pointerEvents = 'none'; host.append(stage); stage.classList.add('game-preview-live', 'story-live'); }
      oldFit = e.fitCameraToModel; e.fitCameraToModel = () => {};
      run.frame = frame; e.fightIQDemo = run; busy.remove(); window.dispatchEvent(new Event('resize')); run.phase = 'play';
    }).catch(x => { console.warn('bag break', x); finish({ skipped: true, error: String(x?.message || x) }); });

    /** Night: the hall lamps are off, moonlight in the windows, one lamp over the bag. */
    function night(shadows) {
      scene.fog = null; scene.background = new THREE.Color('#05060a').convertSRGBToLinear();
      set.group.traverse(o => { if (o.isHemisphereLight) { o.intensity = .42; o.color.set(0x7d8fc4); o.groundColor.set(0x2a211c); } else if (o.isAmbientLight) o.intensity = .05; else if (o.isMesh && o.name === 'glow') o.material.color.setRGB(.05, .075, .15); else if (o.isMesh && o.name === 'light pools') o.visible = false; });
      if (set.sun) { set.sun.intensity = .5; set.sun.color.set(0x8ea4e6); set.sun.castShadow = false; }
      void shadows;
    }
    function lens(fovKey) {
      const size = e.renderer.getSize(new THREE.Vector2()), aspect = Math.max(.2, size.x / Math.max(1, size.y));
      let v = Math.min(66, Math.max(36, 2 * Math.atan(.345 / aspect) * 180 / Math.PI)); if (fovKey) v *= fovKey / 36;
      if (camera.aspect !== aspect || Math.abs(camera.fov - v) > .01) { camera.aspect = aspect; camera.fov = v; camera.updateProjectionMatrix(); }
    }
    const HEAVY = { stance: 1, guardCover: 1, guardTightness: 1, stanceWidth: .54, stanceDepth: .55, stanceDrop: .015, shoulderCover: .055, armReachMargin: .001, chinTuck: .035 };
    const GLOVE = .085, offs = new Map();
    const gloveAt = side => { const j = c.joints, wr = j['hand' + side].getWorldPosition(V()), el = j['elbow' + side].getWorldPosition(V()); return wr.clone().addScaledVector(wr.clone().sub(el).normalize(), .11); };
    /** The game's own straight punch (jab / cross animation and IK) aimed at the bag where it is when the glove lands.
     *  Returns the centre of the punching glove in world space. */
    function punch(m, phase, sim) {
      const st = C.sample(m.hit).bag, side = m.move === 'jab' ? 'L' : 'R';
      a1.copy(hang.dir).multiplyScalar(-Math.sin(st.th)).addScaledVector(UP, Math.cos(st.th)); // bag axis
      const want = hang.world([st.s, st.y, 0]).addScaledVector(a1, m.y).addScaledVector(hang.dir, -B.r - GLOVE + (m.big ? .13 : .06)); // glove centre at full reach: pressed into the leather
      const solve = off => {
        const aim = want.clone().add(off); inv.copy(c.root.matrixWorld).invert(); const local = aim.applyMatrix4(inv), sd = a2.copy(hang.dir).transformDirection(inv);
        c.update(phase * 1.22, m.move, 'one_two', { ...HEAVY, simulationTime: sim, keepFaceClear: false, power: m.big ? 1.3 : 1.16, planStraight: true, contactDrive: m.big ? .09 : .065, straightRecovery: m.big ? .3 : .22, knuckleTarget: local.toArray(), strikeDirection: sd.toArray(), strikeHeight: local.y - .026, levelChange: m.big ? .03 : .018 });
        c.root.updateMatrixWorld(true); return gloveAt(side);
      };
      if (!offs.has(m)) { // the solver's knuckle point is not the glove's centre: measure the difference once at full reach and aim through it
        const keep = phase, off = V(); phase = .44; for (let i = 0; i < 3; i++) off.add(want.clone().sub(solve(off))); phase = keep; offs.set(m, off); (run.calib = run.calib || []).push({ move: m.move, off: off.toArray().map(x => +x.toFixed(3)) });
      }
      return solve(offs.get(m));
    }
    /** The Fighter this frame. Returns the glove's strike point in world space while he punches. */
    function fighter(sim, dt) {
      const f = C.fighterAt(sim), base = scene0.actors.fighter.keys[0], face = Math.atan2(P.dir[0], P.dir[1]);
      if (f.act !== 'react') {
        c.root.position.set(base.x, 0, base.z); c.root.rotation.set(0, face, 0); c.root.updateMatrixWorld(true); Pose().reset(c); turn = null;
        if (f.act === 'guard') { c.update(sim * 1.5, 'guard', 'one_two', { ...HEAVY, simulationTime: sim, keepFaceClear: true }); return null; } // breathing hard: the guard bobs faster
        return punch(C.MOVES.find(q => sim >= q.t && sim < q.t + q.dur), f.phase, sim);
      }
      const r = C.reactionAt(f.t), at = V(base.x, 0, base.z).addScaledVector(hang.dir, -r.back);
      const targets = { bag: hang.bag.group.position.clone().setY(.4), door: V(8.4, 1.5, -7.4) };
      let body = face; if (r.look === 'door') { let dTurn = Math.atan2(targets.door.x - at.x, targets.door.z - at.z) - face; dTurn = Math.atan2(Math.sin(dTurn), Math.cos(dTurn)); body = face + clamp(dTurn, -.95, .95); }
      turn = turn == null || !(dt > 0) ? body : turn + (body - turn) * (1 - Math.exp(-dt * 4.5));
      c.root.position.copy(at); c.root.rotation.set(0, turn, 0); c.root.updateMatrixWorld(true);
      let lk = { yaw: -.42, pitch: -.62 }; // the glove he is holding up
      if (targets[r.look]) { const to = targets[r.look], from = V(at.x, 1.9, at.z), dx = to.x - from.x, dz = to.z - from.z; let yaw = Math.atan2(dx, dz) - turn; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)); if (c.root.scale.x < 0) yaw = -yaw; lk = { yaw, pitch: Math.atan2(to.y - from.y, Math.hypot(dx, dz)) }; }
      const heave = Math.sin(run.sim * 5.2); // out of breath
      Pose().civil(c, { t: run.sim, dt, dist: 40 - r.back, walk: r.walking ? 1 : 0, arms: r.arms || {}, look: lk, lean: (r.lean || 0) + .028 * heave, drop: .008 * heave, talk: 0, listen: 0, nod: 0 });
      return null;
    }
    function frame(delta) {
      if (run.closed) return;
      const dt = run.hold ? 0 : Math.min(Math.max(delta || 0, 0), .05) * (opts.timeScale || 1); run.clock += dt;
      run.t = Math.min(run.t + dt, scene0.duration); const sim = C.warp(run.t), ds = Math.max(0, sim - prevSim); run.sim = sim;
      const cam = window.DreamCore.camera(scene0.camera, run.t); run.shot = cam.shot;
      // the line
      let li = -1; for (let i = 0; i < scene0.lines.length; i++) if (scene0.lines[i].t <= run.t) li = i; run.lineIndex = li;
      const l = li >= 0 ? scene0.lines[li] : null, key = l ? li + '|' + lang() : '';
      if (key !== lineKey) { lineKey = key; sub.dataset.who = l ? l.who : ''; let nm = ''; if (l) { try { nm = e.career?.store?.current?.()?.name || ''; } catch { /* no profile */ } nm = nm && !/^guest$/i.test(nm.trim()) ? nm : w.you; } name.textContent = nm; text.textContent = l ? l.text[lang()] || l.text.en : ''; sub.classList.remove('in'); if (l) { void sub.offsetWidth; sub.classList.add('in'); } }
      // physics sample -> bag, chain, lamp, dust
      const s = C.sample(sim); hang.pose(s); light.set(s.lamp[0], s.lamp[1]); fx.update(sim);
      const glove = fighter(sim, ds); if (l && C.fighterAt(sim).act === 'react') Cast().talk(c, run.t - l.t < 1.6 ? clamp(.35 + .65 * Math.abs(Math.sin(run.t * 11.3) * Math.sin(run.t * 4.1 + 1))) : 0);
      // the leather gives where the glove is, and the bag folds round the big punch
      hang.bag.group.updateMatrixWorld(true); let pen = 0; run.glove = glove ? glove.toArray() : null;
      if (glove) { const g = hang.bag.group.worldToLocal(glove.clone()), rad = Math.hypot(g.x, g.z); if (Math.abs(g.y) < B.h && rad < B.r + GLOVE) { pen = B.r + GLOVE - rad; contact = { y: g.y, ax: g.x / (rad || 1), az: g.z / (rad || 1), depth: 0 }; } }
      run.pen = pen;
      depth = Math.max(Math.min(.17, pen), depth * Math.exp(-ds / .07));
      let fold = 0; for (const m of C.MOVES) { const u = sim - m.hit; if (u >= 0 && u < 1.2) fold += (m.big ? .085 : .014) * smooth(u / .025) * Math.exp(-u / (m.big ? .17 : .09)) * Math.cos(u * (m.big ? 9 : 16)); }
      if (contact) { contact.depth = depth; hang.bag.dent(depth > .002 || Math.abs(fold) > .002 ? contact : null, fold); }
      // sound: reuse the game's samples
      const ev = C.track().events, crossed = t => prevSim < t && sim >= t;
      for (const m of C.MOVES) if (crossed(m.hit)) { if (m.big) { sound('body-1', .8, .55); sound('pad', .7, .7); sound('effort-1', .5, .9); } else sound('pad', .34, m.move === 'jab' ? 1.1 : .95); }
      if (ev.snap != null && crossed(ev.snap)) sound('clap-1', .5, 1.9, 0);
      for (const f of ev.floor) if (f.speed > 1.9 && crossed(f.t)) sound(f.flat ? 'body-2' : 'body-1', Math.min(.8, .2 * f.speed), f.flat ? .4 : .46, 900);
      prevSim = sim;
      // camera: a short shake on the impact and on the floor hits
      lens(cam.fov); camera.position.fromArray(cam.pos); look.fromArray(cam.look);
      let shake = 0; for (const t of [C.BIG.hit, ...ev.floor.filter(f => f.speed > 1.9).map(f => f.t)]) { const u = sim - t; if (u >= 0 && u < .5) shake += .028 * Math.exp(-u / .1); }
      if (shake && !opts.reducedMotion) { camera.position.x += shake * Math.sin(run.clock * 71); camera.position.y += shake * Math.sin(run.clock * 93 + 1); }
      camera.lookAt(look); set.focus(look.x, look.z);
      if (e.renderer.shadowMap?.enabled) e.renderer.shadowMap.needsUpdate = true;
      e.renderer.render(scene, camera);
      const info = e.renderer.info.render; lastStats = { phase: 'play', calls: info.calls, triangles: info.triangles, shot: run.shot, particles: fx.count };
      if (run.t >= scene0.duration && !ended) { ended = true; setTimeout(() => finish({ skipped: false }), 350); }
    }
    Object.defineProperty(run, 'rig', { get: () => c }); Object.defineProperty(run, 'hang', { get: () => hang }); Object.defineProperty(run, 'set', { get: () => set });
    run.seek = (t, hold) => { run.hold = !!hold; run.t = clamp(t, 0, scene0.duration); prevSim = C.warp(run.t); depth = 0; contact = null; turn = null; if (c) Pose().reset(c); };
    return true;
  }

  const api = {
    play, bag, rig, dress, training, gymState,
    has: id => !!Core() && id === Core().ID,
    get ids() { return Core() ? [Core().ID] : []; },
    get playing() { return current ? current.id : null; },
    get force() { return force; }, set force(v) { force = v || null; },
    filmFor: step => step === 'night_bag' && Core() ? Core().ID : null,
    stop() { current?.finish({ skipped: true }); },
    stats: () => lastStats,
    seek(t, hold) { current?.seek?.(t, hold); },
    get debug() { return current; }
  };
  window.BagBreak = api;
})();
