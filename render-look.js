/* Render look (render realism, owner 2026-11-22: "improve the graphics ... as realistic as possible, with existing
 * capabilities"). Image-based light for the engine's own renderer, built on the device from a small procedural scene: no
 * download, no new extension (three r128 PMREM writes RGBE into 8-bit targets, which every WebGL 1 device can render).
 *
 * How the light is kept honest: every set already has a tuned HemisphereLight (sky colour over ground colour). The
 * environment of a look starts from exactly that sky / ground pair (a step at the horizon convolves to the same Lambert
 * irradiance as the hemisphere light), so a share R of each hemisphere is MOVED into the environment instead of added:
 * an "anti" hemisphere light with intensity -R x the original rides along with it (lights add linearly in the shader).
 * The total diffuse level stays where the sets were tuned; what changes is that the light now has direction (windows,
 * lamps, the bright sky, the dark street canyon) and that every material gets reflections (gloves, metal, glass, eyes).
 *
 *   RenderLook.attach(scene, renderer, { look, high, sun, share }) -> handle | null
 *     look: 'day' | 'gym' | 'gym_evening' | 'shop' | 'hall' | 'street_night' | ... (LOOKS below); high: false = nothing
 *     changes (no environment, the hemisphere lights untouched); sun: a DirectionalLight whose direction brightens the sky
 *     round it; handle.high(bool), handle.dispose() (everything back as found), handle.stats().
 *   RenderLook.engine(engine) -> the engine's handle: look per place (ring hall, built venue sets), environment only while the
 *     adaptive quality keeps the shadow pass (level >= 1), contact shadows under the fighters' feet at level 0 (no shadow
 *     pass), the key light's shadow box fitted to the ring in a fight.
 *   RenderLook.current(scene) -> { look, high, env } or null (QA).
 * Materials: only MeshStandard / MeshPhysical take the environment (three's rule); envMapIntensity per material family
 * (FAMILY); a material that brought its own small environment (the city models) uses the look's while it is attached. */
(() => {
  if (typeof THREE === 'undefined') return;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), lin = h => new THREE.Color(h).convertSRGBToLinear();
  const handles = new Map(); // scene -> handle

  // ---- looks: what surrounds the place besides sky and ground. Radiances are linear scene units (a white wall in the
  // morning sun is ~0.6; the sky behind a hemisphere light of 0.5 is ~0.15). Directions: world axes of the sets.
  const LOOKS = {
    // Old Town morning street: building fronts round the horizon (sunlit ones warm, shaded ones cool), brighter sky by the sun
    day: { share: .8, skyline: { near: '#d9b58e', far: '#8d95a6', lit: .5, shade: .12, top: .32 }, sunGlow: .9 },
    market: { share: .8, skyline: { near: '#e0b48a', far: '#9a8f86', lit: .5, shade: .12, top: .36 }, sunGlow: .8 },
    evening: { share: .75, skyline: { near: '#9a6a58', far: '#4a4660', lit: .2, shade: .06, top: .3, windows: '#ffcf8a' }, sunGlow: 1.2 },
    // Otto's shop (room x 36..44.4, z -3.2..3.6): cream walls, open street door (+x), front window (+z), three warm lamps
    shop: { share: .85, room: { centre: [40.2, 1.5, .2], walls: '#e9dcc0', wall: 1, floor: '#9a7452', ceil: '#d8ceb8' },
      panels: [{ at: [44.5, 1.2, 1.45], w: 1.1, h: 2.3, c: '#eef4ff', L: 1.6 }, { at: [39.2, 1.85, 3.6], w: 2.4, h: 1.5, c: '#e8f2ff', L: 1.1 },
        { at: [38.6, 2.55, -1.4], w: .35, h: .25, c: '#ffd9a0', L: 5 }, { at: [41.4, 2.55, -.6], w: .35, h: .25, c: '#ffd9a0', L: 5 }, { at: [41.0, 2.55, 2.2], w: .35, h: .25, c: '#ffd9a0', L: 5 }],
      rig: { lamps: [[38.6, 2.45, -1.4], [41.4, 2.45, -.6], [41.0, 2.45, 2.2]], n: 2, c: '#ffd29a', I: 1.6, d: 6 } },
    // Bruno's gym (x -11..11, z -7.5..12, 5.4 high): tall windows on the back and right walls, six enamel lamps
    gym: { share: .85, room: { centre: [0, 1.5, 1.5], walls: '#e6dcc6', wall: 1, floor: '#a9825a', ceil: '#d8ceb8', dado: '#8c4a3a' },
      panels: [[-7.6, -7.5], [-3.8, -7.5], [3.8, -7.5], [7.6, -7.5]].map(([x, z]) => ({ at: [x, 1.9 + 1.25, z], w: 1.9, h: 2.5, c: '#eaf4ff', L: 1.5 }))
        .concat([[11, -3], [11, 2]].map(([x, z]) => ({ at: [x, 3.15, z], w: 1.9, h: 2.5, c: '#f2f6ff', L: 1.7, side: true })), [{ at: [-11, 3.15, 1], w: 1.9, h: 2.5, c: '#eaf4ff', L: 1.3, side: true }])
        .concat([[-4.6, -3.3], [-2.4, 3.4], [2.6, 3.6], [7.2, -.6], [-6, 5.5], [6, 5.5]].map(([x, z]) => ({ at: [x, 3.44, z], w: .4, h: .3, c: '#ffe2b0', L: 4 }))),
      // window light: the low sun comes in through the right-hand windows (x = 11), a little toward the camera side
      sunDir: [.78, .5, .32], rig: { lamps: [[-4.6, 3.3, -3.3], [-2.4, 3.3, 3.4], [2.6, 3.3, 3.6], [7.2, 3.3, -.6], [-6, 3.3, 5.5], [6, 3.3, 5.5]], n: 2, c: '#ffd6a0', I: 2.2, d: 7.5 } },
    gym_evening: { share: .8, room: { centre: [0, 1.5, 1.5], walls: '#b8a890', wall: .8, floor: '#7a5c40', ceil: '#9a907e', dado: '#5c3428' },
      panels: [[-7.6, -7.5], [-3.8, -7.5], [3.8, -7.5], [7.6, -7.5]].map(([x, z]) => ({ at: [x, 3.15, z], w: 1.9, h: 2.5, c: '#5a6a9a', L: .35 }))
        .concat([[-4.6, -3.3], [-2.4, 3.4], [2.6, 3.6], [7.2, -.6], [-6, 5.5], [6, 5.5]].map(([x, z]) => ({ at: [x, 3.44, z], w: .4, h: .3, c: '#ffcf90', L: 5 }))),
      rig: { lamps: [[-2.4, 3.3, 3.4], [2.6, 3.3, 3.6], [7.2, 3.3, -.6], [-6, 3.3, 5.5], [6, 3.3, 5.5]], n: 1, c: '#ffc988', I: 2.4, d: 7.5 } },
    // the engine's own hall (training and the stock ring): a dark hall, a lit truss over the ring, warm and cool rims
    hall: { share: .75, room: { centre: [0, 1.2, 0], walls: '#3a4048', wall: 1, floor: '#2a2e34', ceil: '#15181c' },
      panels: [{ at: [0, 5.2, 0], w: 3.2, h: 3.2, c: '#fff6e8', L: 1.6, up: true }, { at: [-3, 4.2, -3.5], w: 1.2, h: .5, c: '#ffe8cc', L: 2.4 }, { at: [3, 4.2, -3.5], w: 1.2, h: .5, c: '#e6eeff', L: 2.4 },
        { at: [0, 3.6, 5.5], w: 3, h: .8, c: '#fff4e0', L: 1.2 }] },
    // built venues (arena-sets.js): their walls are baked, so only the fighters and the ring take this
    street_night: { share: .7, skyline: { near: '#2a2a33', far: '#1a1c26', lit: .05, shade: .02, top: .3, windows: '#ffb86a' },
      panels: [[-6, 4, 5], [6, 4.5, -4], [-5, 3.8, -6], [5.5, 4.2, 6]].map(([x, y, z]) => ({ at: [x, y, z], w: .6, h: .4, c: '#ffb060', L: 4 })) },
    boxing_club: { share: .75, room: { centre: [0, 1.2, 0], walls: '#6a5a48', wall: 1, floor: '#4a3a2c', ceil: '#2a241e' },
      panels: [{ at: [0, 5, 0], w: 3, h: 3, c: '#fff1dc', L: 1.5, up: true }, { at: [-5, 3, -5], w: 2, h: 1.6, c: '#dde8ff', L: 1.0 }, { at: [5, 3, -5], w: 2, h: 1.6, c: '#dde8ff', L: 1.0 }] },
    arena: { share: .75, room: { centre: [0, 1.2, 0], walls: '#141824', wall: .6, floor: '#101218', ceil: '#05060a' },
      panels: [{ at: [0, 7, 0], w: 4, h: 4, c: '#ffffff', L: 2.0, up: true }, { at: [-8, 5, 0], w: 3, h: .6, c: '#ff6a6a', L: 1.2 }, { at: [8, 5, 0], w: 3, h: .6, c: '#6a8aff', L: 1.2 }] }
  };
  LOOKS.underground = LOOKS.street_night; LOOKS.regional = LOOKS.boxing_club; LOOKS.championship = LOOKS.arena;

  // ---- material families: one environment is one light, so most families take it at 1; metals lean in a little (their
  // only light is the reflection), fur and skin slightly less (no oily sheen on a coat).
  const lum = c => .2126 * c.r + .7152 * c.g + .0722 * c.b;
  function family(m) {
    if (m.metalness >= .45) return 1.15;
    // wet dark leather (noses, lips): its sharp highlights stay, the blurred room in it would read as grey plastic
    if (m.isMeshPhysicalMaterial && m.clearcoat > 0 && m.color && lum(m.color) < .13 && !m.map) return .5;
    if (m.vertexColors && m.roughness >= .85) return .92; // fur / painted skin streams
    return 1;
  }

  // ---- the environment: a small procedural scene rendered once by PMREMGenerator.fromScene
  function skyVertexColours(geo, sky, ground, sunDir, sunGlow, sunColour) {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), d = V(), c = new THREE.Color(), hz = new THREE.Color().copy(sky).lerp(ground, .35);
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      if (d.y >= 0) c.copy(hz).lerp(sky, Math.min(1, Math.pow(d.y, .5) * 1.25)); else c.copy(hz).lerp(ground, Math.min(1, -d.y * 6));
      if (sunDir && d.y > -.05) { const k = Math.pow(Math.max(0, d.dot(sunDir)), 6) * sunGlow; c.r += sunColour.r * k; c.g += sunColour.g * k; c.b += sunColour.b * k; }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  function envScene(spec) {
    const s = new THREE.Scene(), disposables = [], R = 40;
    const basic = (color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false, toneMapped: false, ...extra }); disposables.push(m); return m; };
    const dome = new THREE.SphereGeometry(R, 40, 20); disposables.push(dome);
    skyVertexColours(dome, spec.sky, spec.ground, spec.sunDir, spec.sunGlow || 0, spec.sunColour || new THREE.Color(1, 1, 1));
    s.add(new THREE.Mesh(dome, basic(0xffffff, { vertexColors: true, side: THREE.BackSide })));
    const box = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1); disposables.push(box, plane);
    const centre = V(...(spec.room?.centre || [0, 1.5, 0]));
    if (spec.room) { // the room round the horizon carries the hemisphere's energy in the room's own colours: walls between sky and
      // ground, the floor at the ground's level, the ceiling a little under the sky's; a darker dado band
      const r = spec.room, tint = h => { const c = lin(h), l = lum(c); return c.multiplyScalar(1 / Math.max(.02, l)).lerp(new THREE.Color(1, 1, 1), .5); }; // half the room's hue: bounce, not paint
      const mid = new THREE.Color().copy(spec.sky).lerp(spec.ground, .5);
      const wallC = tint(r.walls).multiplyScalar(lum(mid) * (r.wall ?? 1)), floorC = tint(r.floor).multiplyScalar(lum(spec.ground) * (r.floorGain ?? 1)), ceilC = tint(r.ceil).multiplyScalar(lum(spec.sky) * (r.ceilGain ?? .7));
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * .6, R * .6, R * .55, 24, 1, true), basic(wallC)); ring.position.y = R * .12; s.add(ring); disposables.push(ring.geometry);
      if (r.dado) { const d = new THREE.Mesh(new THREE.CylinderGeometry(R * .59, R * .59, R * .1, 24, 1, true), basic(tint(r.dado).multiplyScalar(lum(mid) * .6))); d.position.y = -R * .1; s.add(d); disposables.push(d.geometry); }
      const fl = new THREE.Mesh(plane, basic(floorC)); fl.rotation.x = -Math.PI / 2; fl.position.y = -R * .15; fl.scale.setScalar(R * 1.4); s.add(fl);
      const ce = new THREE.Mesh(plane, basic(ceilC)); ce.rotation.x = Math.PI / 2; ce.position.y = R * .4; ce.scale.setScalar(R * 1.4); s.add(ce);
    }
    if (spec.skyline) { // the street canyon: blocks round the horizon, fronts facing the sun lit, the others in shade
      const L = spec.skyline, sun = spec.sunDir || V(.5, .5, .5), near = lin(L.near), far = lin(L.far), win = L.windows ? lin(L.windows) : null;
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2 + (i % 3) * .05, dist = R * (.45 + (i * 37 % 10) / 40), h = dist * L.top * (.55 + (i * 53 % 9) / 12), w = dist * (.18 + (i * 29 % 7) / 40);
        const n = V(-Math.sin(a), 0, -Math.cos(a)), lit = Math.max(0, n.dot(V(sun.x, 0, sun.z).normalize()));
        const c = new THREE.Color().copy(far).lerp(near, (i * 17 % 10) / 10).multiplyScalar(L.shade + (L.lit - L.shade) * lit);
        const b = new THREE.Mesh(box, basic(c)); b.scale.set(w, h, w * .6); b.position.set(Math.sin(a) * dist, h / 2 - 1.5, Math.cos(a) * dist); b.rotation.y = a; s.add(b);
        if (win && i % 2 === 0) { const g = new THREE.Mesh(plane, basic(new THREE.Color().copy(win).multiplyScalar(.9))); g.scale.set(w * .5, h * .35, 1); g.position.set(Math.sin(a) * (dist - w * .31), h * .55 - 1.5, Math.cos(a) * (dist - w * .31)); g.rotation.y = a; s.add(g); }
      }
    }
    for (const p of spec.panels || []) { // windows, lamps, lit trusses: emitters seen from the room's centre, at their real direction
      const d = V(...p.at).sub(centre), dist = d.length(), scale = Math.min(R * .55, Math.max(R * .3, dist * 4)) / dist;
      const m = new THREE.Mesh(plane, basic(lin(p.c).multiplyScalar(p.L))); m.position.copy(d.multiplyScalar(scale)); m.scale.set(p.w * scale, p.h * scale, 1);
      if (p.up) m.rotation.x = Math.PI / 2; else m.lookAt(0, m.position.y, 0);
      s.add(m);
    }
    return { scene: s, dispose() { for (const d of disposables) d.dispose(); } };
  }
  const cache = new Map(); // key -> { rt, users }
  function envFor(renderer, key, spec) {
    const hit = cache.get(key); if (hit) { hit.users++; return hit.rt; }
    if (!THREE.PMREMGenerator) return null;
    let rt = null, made = null, pm = null;
    try { made = envScene(spec); pm = new THREE.PMREMGenerator(renderer); rt = pm.fromScene(made.scene, .04, .1, 100); }
    catch (x) { console.warn('render look: no environment', x); rt = null; }
    finally { try { pm?.dispose(); } catch { /* gone */ } made?.dispose(); }
    if (!rt) return null;
    cache.set(key, { rt, users: 1 }); return rt;
  }
  function release(key) { const hit = cache.get(key); if (!hit) return; if (--hit.users <= 0) { cache.delete(key); hit.rt.dispose(); } }

  // ---- attach a look to a scene
  function attach(scene, renderer, opts = {}) {
    if (!scene || !renderer || !LOOKS[opts.look]) return null;
    handles.get(scene)?.dispose();
    const look = LOOKS[opts.look], share = opts.share ?? look.share, group = new THREE.Group(); group.name = 'RenderLook'; scene.add(group);
    const h = { scene, look: opts.look, isHigh: false, env: null, key: '', anti: new Map(), saved: new Map(), frame: 0, envWas: scene.environment, exposureWas: renderer.toneMappingExposure, pending: false };
    h.sunDir = look.sunDir ? V(...look.sunDir).normalize() : null;
    // practical lights of the place (high only): the lamps nearest the action, warm, no shadows
    const practicals = [];
    if (look.rig) {
      const f = opts.focus || [0, 0], r = look.rig, near = [...r.lamps].sort((a, b) => Math.hypot(a[0] - f[0], a[2] - f[1]) - Math.hypot(b[0] - f[0], b[2] - f[1])).slice(0, r.n);
      for (const [x, y, z] of near) { const l = new THREE.PointLight(lin(r.c), r.I, r.d, 2); l.position.set(x, y, z); l.name = 'RenderLook practical lamp'; l.visible = false; group.add(l); practicals.push(l); }
    }
    const hemis = () => { const out = []; scene.traverse(o => { if (o.isHemisphereLight && !o.userData.renderLookAnti) out.push(o); }); return out; };
    function sync() { // mirror each hemisphere light (its colours and intensity can be changed by the place's own code)
      for (const [src, a] of h.anti) { a.visible = src.visible && h.isHigh && !!h.env; a.intensity = -share * src.intensity; a.color.copy(src.color); a.groundColor.copy(src.groundColor); a.position.copy(src.position); }
    }
    function scan() {
      const list = hemis();
      for (const src of list) if (!h.anti.has(src)) { const a = new THREE.HemisphereLight(0, 0, 0); a.userData.renderLookAnti = true; a.name = 'RenderLook: moved into the environment'; group.add(a); h.anti.set(src, a); }
      for (const [src, a] of h.anti) if (!list.includes(src)) { group.remove(a); h.anti.delete(src); }
      return list;
    }
    function specNow(list) {
      const sky = new THREE.Color(0, 0, 0), ground = new THREE.Color(0, 0, 0);
      for (const l of list) if (l.visible) { sky.add(new THREE.Color().copy(l.color).multiplyScalar(l.intensity * share / Math.PI)); ground.add(new THREE.Color().copy(l.groundColor).multiplyScalar(l.intensity * share / Math.PI)); }
      const sun = opts.sun, sunDir = sun ? V().subVectors(sun.position, sun.target.position).normalize() : null;
      const spec = { ...look, sky, ground, sunDir, sunGlow: (look.sunGlow || 0) * (sun ? sun.intensity * .05 : 0), sunColour: sun ? sun.color.clone() : null };
      const q = c => [c.r, c.g, c.b].map(v => Math.round(v * 400)).join(',');
      const key = [opts.look, q(sky), q(ground), sunDir ? [sunDir.x, sunDir.y, sunDir.z].map(v => Math.round(v * 10)).join(',') : '-', sun ? Math.round(sun.intensity * 10) : 0].join('|');
      return { spec, key };
    }
    function refresh() { // outside a render: build (or reuse) the environment for the current light
      h.pending = false; if (!h.isHigh || h.disposed) return;
      const { spec, key } = specNow(scan()); if (key === h.key && h.env) return;
      const rt = envFor(renderer, key, spec); const oldKey = h.key;
      h.env = rt; h.key = rt ? key : ''; if (oldKey) release(oldKey);
      scene.environment = rt ? rt.texture : h.envWas; sync();
    }
    function materials() {
      scene.traverse(o => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m || !m.isMeshStandardMaterial || h.saved.has(m)) continue;
          h.saved.set(m, { envMap: m.envMap, i: m.envMapIntensity });
          if (h.isHigh && h.env) { if (m.envMap) { m.envMap = null; m.needsUpdate = true; } m.envMapIntensity = family(m) * (m.userData.renderLookScale ?? 1); }
        }
      });
    }
    function unMaterials() { for (const [m, s] of h.saved) { if (m.envMap !== s.envMap) { m.envMap = s.envMap; m.needsUpdate = true; } m.envMapIntensity = s.i; } h.saved.clear(); }
    // A caller that owns the frame (the engine) calls h.tick() itself; otherwise the scene's hook does (films).
    const before = scene.onBeforeRender, own = Object.prototype.hasOwnProperty.call(scene, 'onBeforeRender');
    h.tick = () => {
      if (!h.isHigh || h.disposed) return;
      if (++h.frame % 30 === 1) { const { key } = specNow(scan()); if (key !== h.key && !h.pending) { h.pending = true; requestAnimationFrame(refresh); } }
      if (h.frame % 60 === 2 && h.env) materials();
      sync();
    };
    const hook = function (...a) { before.apply(this, a); h.tick(); };
    if (!opts.noHook) scene.onBeforeRender = hook;
    h.high = on => {
      on = !!on; if (on === h.isHigh) return h;
      h.isHigh = on;
      for (const l of practicals) l.visible = on;
      if (on) { refresh(); materials(); if (opts.exposure) { h.exposureWas = renderer.toneMappingExposure; renderer.toneMappingExposure = opts.exposure; } }
      else { unMaterials(); if (h.key) release(h.key); h.key = ''; h.env = null; scene.environment = h.envWas; if (opts.exposure) renderer.toneMappingExposure = h.exposureWas; sync(); }
      return h;
    };
    h.stats = () => ({ look: h.look, high: h.isHigh, env: !!h.env, anti: h.anti.size, materials: h.saved.size, practicals: practicals.length, key: h.key });
    h.dispose = () => {
      if (h.disposed) return; h.disposed = true; h.high(false);
      if (!opts.noHook && scene.onBeforeRender === hook) { if (own) scene.onBeforeRender = before; else delete scene.onBeforeRender; } // wrapped again by someone else: the hook stays, inert
      scene.remove(group); h.anti.clear(); handles.delete(scene);
    };
    handles.set(scene, h);
    scan(); sync();
    return h.high(opts.high !== false);
  }

  // ---- the engine: training hall, ring fights, built venues
  function engine(e) {
    if (!e?.scene || !e.renderer) return null;
    const venueId = () => { const set = e.world?.arena?.children?.find(n => n.userData?.arenaSet); return set?.visible !== false && e.world?.arena?.visible !== false ? (set?.name || '').replace(/^Arena set /, '') : ''; };
    let handle = null, lookId = '';
    const blobs = new THREE.Group(); blobs.name = 'RenderLook contact shadows'; e.scene.add(blobs);
    let blobMat = null, blobGeo = null; const pool = [];
    function blob(i) {
      if (!blobMat) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 32);
        gr.addColorStop(0, 'rgba(10,8,6,.9)'); gr.addColorStop(.5, 'rgba(10,8,6,.45)'); gr.addColorStop(1, 'rgba(10,8,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: .55, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      }
      while (pool.length <= i) { const m = new THREE.Mesh(blobGeo, blobMat); m.renderOrder = 1; m.name = 'contact shadow'; m.frustumCulled = false; blobs.add(m); pool.push(m); }
      return pool[i];
    }
    const fa = V(), fb = V(), rp = V();
    function feet() { // contact shadows where no real shadow falls: one soft ellipse under each foot and one under the body
      const view = e.arena?.fightView;
      // no shadow pass, or a built ringless venue (street, basement, docks): its floor is baked (unlit), it takes no shadow
      let n = 0; const shadowless = (!e.renderer.shadowMap.enabled || !!view?.ringless) && !e.lookOff; // lookOff: QA switch (before / after in one page)
      const rigs = view?.coaches ? [...new Set(Object.values(view.coaches))] : e.activeModel === e.coach?.root ? [e.coach] : [];
      if (view?.referee?.root?.visible && view.referee.joints) rigs.push(view.referee);
      if (shadowless) for (const c of rigs) {
        if (!c?.root?.visible || !c.joints?.footL || !c.joints?.footR) continue;
        let hidden = false; for (let q = c.root; q; q = q.parent) if (!q.visible) { hidden = true; break; } if (hidden) continue;
        c.joints.footL.getWorldPosition(fa); c.joints.footR.getWorldPosition(fb); c.root.getWorldPosition(rp);
        const floor = rp.y + .012;
        for (const f of [fa, fb]) { const m = blob(n++); const lift = Math.max(0, f.y - floor - .08); m.position.set(f.x, floor + .002, f.z); const s = .34 + lift * .5; m.scale.set(s, 1, s); m.material.opacity = .55; m.visible = lift < .5; }
        const body = blob(n++); body.position.set((fa.x + fb.x) / 2, floor, (fa.z + fb.z) / 2); const w = Math.max(.7, fa.distanceTo(fb) + .45); body.scale.set(w, 1, w * .75); body.visible = true;
      }
      for (let i = n; i < pool.length; i++) pool[i].visible = false;
    }
    // the key light's shadow box: the default +-5 m covers the training hall; a fight only needs the ring and its posts
    const key = e.keyLight, box0 = key ? { l: key.shadow.camera.left, r: key.shadow.camera.right, t: key.shadow.camera.top, b: key.shadow.camera.bottom } : null;
    function fitShadow(fight) {
      if (!key) return; const c = key.shadow.camera, half = fight ? 3.2 : null;
      const want = half ? { l: -half, r: half, t: half, b: -half } : box0;
      if (c.left !== want.l || c.right !== want.r || c.top !== want.t || c.bottom !== want.b) { c.left = want.l; c.right = want.r; c.top = want.t; c.bottom = want.b; c.updateProjectionMatrix(); }
    }
    const before = e.scene.onBeforeRender, own = Object.prototype.hasOwnProperty.call(e.scene, 'onBeforeRender');
    const hook = function (...a) {
      before.apply(this, a);
      const fight = !!e.arena?.fightView;
      { // every frame: a children scan of the arena group and two comparisons
        const v = venueId(), want = v ? (LOOKS[v] ? v : 'hall') : 'hall';
        if (want !== lookId) { lookId = want; const hi = handle ? handle.isHigh : (e.qualityLevel ?? 3) > 0; handle?.dispose(); handle = attach(e.scene, e.renderer, { look: want, high: false, noHook: true }); if (handle && hi) requestAnimationFrame(() => handle?.high(true)); }
        const hi = (e.qualityLevel ?? 3) > 0 && !e.lookOff; if (handle && hi !== handle.isHigh) requestAnimationFrame(() => handle?.high(hi));
      }
      handle?.tick();
      fitShadow(fight);
      feet();
    };
    e.scene.onBeforeRender = hook;
    lookId = 'hall'; handle = attach(e.scene, e.renderer, { look: 'hall', high: (e.qualityLevel ?? 3) > 0, noHook: true });
    return { get handle() { return handle; }, get look() { return lookId; }, dispose() { handle?.dispose(); if (e.scene.onBeforeRender === hook) { if (own) e.scene.onBeforeRender = before; else delete e.scene.onBeforeRender; } e.scene.remove(blobs); blobMat?.map.dispose(); blobMat?.dispose(); blobGeo?.dispose(); } };
  }

  function current(scene) { const h = handles.get(scene); return h ? { look: h.look, high: h.isHigh, env: !!h.env } : null; }
  window.RenderLook = Object.freeze({ LOOKS, attach, engine, current, family, _cache: cache });
})();
