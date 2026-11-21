/* Authored city art for the Chapter 1 opening and market films. The GLBs are loaded asynchronously through the page's GLTFLoader and kept
 * in a cache; the generated set stays the fallback: a model that failed or is not ready when the film starts is simply not
 * used, and the generated piece is built instead (nothing ever waits longer than CityAssets.WAIT_MS).
 *
 *   CityAssets.preload(names?) -> Promise (never rejects)      defaults to the opening assets for Adventure home
 *   CityAssets.ready(ms?, names?) -> Promise                  each requested model a loaded glTF or null, after at most ms
 *   CityAssets.status() -> { bus: 'idle' | 'loading' | 'ready' | 'failed', ... }
 *   CityAssets.dress(ctx, city) -> handle                      called by the street and market builders with ready models
 *       handle { active, bus, station, oldtown, frame(sample, camera), stats(), dispose() }  (objects.city of the set)
 *   CityAssets.LAYOUT                                          where the models go; dream-sets.js skips what they replace
 *   CityAssets.wheelAngle(distance) / doorClipTime(...)        pure helpers (tests/city-assets.test.cjs)
 *
 * Street frame (dream-sets.js): x along the street, the stop's pavement and the camera on +z, road at y -0.15, pavement 0.
 * The models were authored with their pavement on -z (bus doors on -Z), so every model is turned half a turn about y
 * (never mirrored: positive unit scale, lettering reads correctly) and the bus therefore drives toward -x in this street.
 * The GPU copies are disposed when the set is disposed; the parsed models stay cached for a replay. */
(() => {
  const FILES = {
    tree: './assets/street/ch01-trees/street-tree-low.glb',
    car: './assets/street/ch01-car/compact-car.glb',
    bus: './assets/street/ch01-bus/gloryland-bus.glb',
    station: './assets/street/ch01-station/gloryland-station.glb',
    oldtown: './assets/street/ch01-oldtown/gloryland-oldtown.glb',
    hazelStall: './assets/street/ch01-market/hazel-fruit-stall.glb'
  };
  // One authored asset/download and three silhouettes. Keep these on the arrival street only;
  // positions match the procedural trees so a cold/offline load keeps a complete street.
  const ARRIVAL_TREES = Object.freeze([
    Object.freeze({ name: 'Old Town street tree', x: 6.6, z: -5.3, h: 4.3, yaw: 0, scale: [1, 1, 1], phase: 0 }),
    Object.freeze({ name: 'Old Town compact tree', x: 11.6, z: 5.4, h: 4.4, yaw: 2.2, scale: [.74, .88, .81], phase: .7 }),
    Object.freeze({ name: 'Old Town spreading tree', x: 17.4, z: -5.4, h: 4.5, yaw: -1.3, scale: [1.17, .92, 1.03], phase: 1.6 })
  ]);
  const MARKET_TREES = Object.freeze([
    Object.freeze({ name: 'Market west tree', x: -2.9, z: -4.45, h: 4.0, yaw: 1.8, scale: [.74, .83, .75], phase: 1.1 }),
    Object.freeze({ name: 'Market east tree', x: 3.25, z: -4.6, h: 4.1, yaw: -.6, scale: [.91, .88, .79], phase: 2.2 })
  ]);
  const OPENING_MODELS = ['tree', 'car', 'bus', 'station', 'oldtown'];
  const WAIT_MS = 5000, TIRE_R = .515, HALF = Math.PI;
  const LAYOUT = {
    patches: [-17, 3, 23],              // centres of the 20 m road / kerb / paving modules; kerb face at z 3.45, paving to z 8.3
    gap: [-27, 33], pavingZ: 8.3,         // the generated road, near kerb and near paving are cut out here
    bus: { z: 1.9, y: -.15, door: 4.49, floor: .72, curb: [4.49, -1.95] }, // wrapper z; entry door centre (model x); markers
    shelter: [-1.6, 5.75], sign: [.35, 4.05],
    lamps: [[-22, 4.15, HALF], [-9, 4.15, HALF], [8.5, 4.15, HALF, 16.2], [13.4, 4.15, HALF], [31.5, 4.15, HALF], [-15, -4.15, 0], [2, -4.15, 0], [16, -4.15, 0]],
    bins: [[-6.0, 6.5, HALF], [14.6, 8.6, HALF]],
    // Old Town prototypes: front wall centre at pavement height; far side faces +z, near side is turned to face -z
    // (budget: four instances; the Fighter alone submits ~340k triangles, so the street keeps generated houses in between)
    houses: [['brick', -12.6, -8.2, 0], ['plaster', 2.4, -8.2, 0], ['plaster', 6.2, 10.4, HALF], ['brick', 13.1, 10.4, HALF]],
    replaced: { far: [-11, .6], near: [9.5] }, // generated house slots (x) the prototypes stand in
    fill: [{ style: 'plaster', x: -5.1, w: 7.0, floors: 3, tint: 0, roof: 4 }], // a generated house between the two far prototypes
    detailDist: 15, trimDist: 22, busInsideDist: 9
  };
  const cache = new Map(); // name -> { state, promise, gltf, error }
  let makeLoader = () => new THREE.GLTFLoader();

  function load(name) {
    const hit = cache.get(name); if (hit && hit.state !== 'failed') return hit.promise;
    const e = { state: 'loading', gltf: null, error: null };
    e.promise = new Promise((resolve, reject) => {
      let loader; try { loader = makeLoader(); } catch (x) { reject(x); return; }
      loader.load(FILES[name], g => resolve(g), undefined, x => reject(x || Error('load ' + name)));
    }).then(g => { e.state = 'ready'; e.gltf = g; return g; }, x => { e.state = 'failed'; e.error = String(x?.message || (x?.type ? 'network ' + x.type : x)); console.warn('city asset', name, e.error); throw x; });
    e.promise.catch(() => {}); cache.set(name, e); return e.promise;
  }
  const names = () => Object.keys(FILES);
  function preload(list = OPENING_MODELS) { return Promise.all(list.map(n => load(n).catch(() => null))).then(status); }
  const defaultLoader = makeLoader;
  /** Waits for the models for at most ms and reports what is ready; a model still loading keeps loading for the next time. */
  function ready(ms = WAIT_MS, list = OPENING_MODELS) {
    const pick = () => Object.fromEntries(list.map(n => [n, cache.get(n)?.state === 'ready' ? cache.get(n).gltf : null]));
    let all; try { all = preload(list); } catch { return Promise.resolve(pick()); }
    return Promise.race([all, new Promise(r => setTimeout(r, ms))]).then(pick, pick);
  }
  const status = () => Object.fromEntries(names().map(n => [n, cache.get(n)?.state || 'idle']));

  /* ---------------------------------------------------------------- pure helpers */
  /** Wheel roll (radians about the model's z axis) for a signed distance driven forward along the model's +x. */
  const wheelAngle = dist => -dist / TIRE_R;

  /* ---------------------------------------------------------------- dressing the street */
  function instance(gltf, name) { const src = gltf.scene.getObjectByName(name); if (!src) throw Error('city part ' + name); const o = src.clone(true); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); return o; }
  function shadows(root, cast, recv = true) { root.traverse(o => { if (o.isMesh) { o.castShadow = typeof cast === 'function' ? cast(o) : !!cast; o.receiveShadow = recv; } }); return root; }
  // shadow casters: only the big shells (budget: the shadow pass submits every caster again)
  const BUS_CAST = /enamel|ivory|stripe|rubber/, HOUSE_CAST = /brick|plaster|pan tiles|membrane/;
  /** Soft rectangular contact shade (the generated set has one under the bus). */
  function contactShade(w, d, opacity) {
    const W = 64, H = 32, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { // darkest under the body, fading out over the last 15 % of each side
      const ex = Math.min(x + .5, W - x - .5) / (W * .15), ey = Math.min(y + .5, H - y - .5) / (H * .3), k = Math.min(1, ex) * Math.min(1, ey), i = (y * W + x) * 4;
      img.data[i] = 14; img.data[i + 1] = 12; img.data[i + 2] = 10; img.data[i + 3] = Math.round(255 * k * k * (3 - 2 * k));
    }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity, toneMapped: false }));
    m.renderOrder = 1; m.name = 'contact shade'; return m;
  }
  /** A small sky / ground environment so the metal parts (rails, steel, brass) reflect something instead of going black. */
  function environment(renderer) {
    if (!renderer || !THREE.PMREMGenerator) return null;
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 32);
    for (const [k, c] of [[0, '#6fa8de'], [.32, '#a9cdea'], [.48, '#f1dcc0'], [.52, '#9c9384'], [1, '#5b5650']]) gr.addColorStop(k, c);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 32); const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.mapping = THREE.EquirectangularReflectionMapping;
    let rt = null; try { const pm = new THREE.PMREMGenerator(renderer); rt = pm.fromEquirectangular(tex); pm.dispose(); } catch (x) { console.warn('city env', x); }
    tex.dispose(); return rt;
  }

  function dress(c, city, treeSites = ARRIVAL_TREES) {
    const L = LAYOUT, group = new THREE.Group(), handle = { active: false, bus: null, station: false, oldtown: false, parts: [], houses: [] };
    group.name = 'city art (GLB)'; c.group.add(group);
    const used = [], env = environment(c.opts?.renderer), aniso = c.opts?.renderer ? Math.min(4, c.opts.renderer.capabilities.getMaxAnisotropy()) : 1;
    for (const [k, g] of Object.entries(city || {})) if (g) used.push(g);
    // materials: sRGB colour maps come from the loader; metals get the small environment, the ground better filtering
    for (const g of used) g.scene.traverse(o => {
      if (!o.isMesh) return; const m = o.material;
      if (env) { m.envMap = env.texture; m.envMapIntensity = m.metalness > .3 ? .8 : .35; }
      for (const s of ['map', 'normalMap', 'roughnessMap']) if (m[s]) m[s].anisotropy = aniso;
      if (m.transparent) o.renderOrder = 2; m.needsUpdate = true;
    });
    const put = (o, x, y, z, ry) => { o.position.set(x, y, z); o.rotation.y = ry; o.updateMatrix(); group.add(o); return o; };
    const trees = [], treeClip = new THREE.Frustum(), treeVP = new THREE.Matrix4();
    if (city?.tree) for (const site of treeSites) {
      // Give each film instance its own bones so playback leaves the cached GLTF intact.
      const template = city.tree.scene, tree = template.clone(true);
      const sources = [], copies = [];
      template.traverse(node => sources.push(node));
      tree.traverse(node => copies.push(node));
      const clones = new Map(sources.map((node, index) => [node, copies[index]]));
      template.traverse(node => {
        if (!node.isSkinnedMesh) return;
        const skeleton = node.skeleton.clone();
        skeleton.bones = node.skeleton.bones.map(bone => clones.get(bone));
        clones.get(node).bind(skeleton, node.bindMatrix);
        c.disposables.push(skeleton);
      });
      tree.name = site.name;
      tree.scale.fromArray(site.scale);
      put(shadows(tree, false), site.x, 0, site.z, site.yaw);
      // GLTFLoader disables native culling on skinned meshes; use a generous world-space
      // sphere to avoid submitting whole off-screen trees without clipping their swaying crowns.
      const entry = { root: tree, bounds: new THREE.Sphere(new THREE.Vector3(site.x, 2.5, site.z), 4.5), phase: site.phase };
      trees.push(entry);
      const breeze = city.tree.animations.find(clip => clip.name === 'Breeze');
      if (breeze) {
        const treeMixer = new THREE.AnimationMixer(tree);
        treeMixer.clipAction(breeze).play();
        entry.mixer = treeMixer;
        c.disposables.push({ dispose() { treeMixer.stopAllAction(); treeMixer.uncacheRoot(tree); } });
      }
      handle.active = true;
    }
    if (city?.car) {
      const car = city.car.scene.clone(true);
      car.name = 'Old Town compact';
      put(shadows(car, false), 8.4, -.15, -2.45, city.bus ? 0 : HALF);
      handle.active = true;
    }
    if (city?.hazelStall) {
      const stall = city.hazelStall.scene.clone(true);
      stall.name = "Hazel's fruit stall";
      put(shadows(stall, false), 0, 0, -3.3, 0);
      handle.active = true;
    }
    // ---- the bus: the wrapper keeps the generated bus's contract (objects.bus, moved along x); the model turns half a turn
    if (city?.bus) {
      const wrap = new THREE.Group(); wrap.name = 'bus'; wrap.position.set(-62, L.bus.y, L.bus.z); c.group.add(wrap);
      const model = instance(city.bus, 'Gloryland_Bus_12'); model.rotation.y = HALF; wrap.add(model);
      shadows(model, o => BUS_CAST.test(o.material.name));
      const shade = contactShade(11.6, 3.2, .55); shade.position.y = .158; wrap.add(shade); c.disposables.push(shade.geometry, shade.material, shade.material.map);
      const mixer = new THREE.AnimationMixer(model), clip = city.bus.animations.find(a => a.name === 'Doors_open_hold_close');
      const doors = clip ? mixer.clipAction(clip) : null; if (doors) { doors.setLoop(THREE.LoopOnce, 1); doors.clampWhenFinished = true; doors.play(); doors.paused = true; doors.time = 0; mixer.update(0); }
      const wheels = ['Front_curb_wheel', 'Front_road_wheel', 'Rear_curb_wheel', 'Rear_road_wheel'].map(n => model.getObjectByName(n)).filter(Boolean);
      const inside = []; model.traverse(o => { if (o.isMesh && /upholstery|handrails/.test(o.material.name) && /^Body/.test(o.name)) inside.push(o); });
      const bus = { wrap, model, mixer, doors, wheels, inside, x0: null, dist: 0, clipT: 0 };
      /** Wheels roll by the distance driven: the model faces -x in the street, so driving toward -x is forward. */
      bus.roll = () => { if (bus.x0 == null) bus.x0 = wrap.position.x; bus.dist = bus.x0 - wrap.position.x; const a = wheelAngle(bus.dist); for (const w of wheels) w.rotation.z = a; };
      bus.door = t => { if (!doors) return; const tt = Math.max(0, Math.min(clip.duration, t)); if (tt === bus.clipT) return; bus.clipT = tt; doors.time = tt; mixer.update(0); };
      handle.bus = bus; handle.active = true; c.objects.bus = wrap; // the wheel roll counts from the first film frame
      c.disposables.push({ dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); } });
    }
    // ---- the stop: road / kerb / paving modules, shelter with bench, stop sign, lamps, bins
    if (city?.station) {
      for (const x of L.patches) { const r = shadows(instance(city.station, 'Road_and_pavement'), false); put(r, x, 0, 0, HALF); r.matrixAutoUpdate = false; }
      const sh = shadows(instance(city.station, 'Shelter'), o => !o.material.transparent && /iron|steel/.test(o.material.name)); put(sh, L.shelter[0], 0, L.shelter[1], HALF);
      const bench = shadows(instance(city.station, 'Bench'), false); put(bench, L.shelter[0] + .05, 0, L.shelter[1] + .35, HALF); // its place in the shelter
      put(shadows(instance(city.station, 'Bus_stop_sign'), false), L.sign[0], 0, L.sign[1], HALF);
      for (const [x, z, ry, at] of L.lamps) put(shadows(instance(city.station, 'Streetlamp'), false), at ?? x, 0, z, ry); // [generated x, z, turn, model x]
      for (const [x, z, ry] of L.bins) put(shadows(instance(city.station, 'Litter_bin'), false), x, 0, z, ry);
      handle.station = true; handle.active = true;
    }
    // ---- Old Town: the two prototypes stand in for the generated façades around the stop
    if (city?.oldtown) {
      for (const [kind, x, z, ry] of L.houses) {
        const name = kind === 'brick' ? 'OldTown_brick_hiproof' : 'OldTown_plaster_parapet', near = z > 0;
        const h = shadows(instance(city.oldtown, name), o => near && HOUSE_CAST.test(o.material.name) && !o.material.transparent); put(h, x, 0, z, ry);
        const detail = [], trim = []; h.traverse(o => { if (!o.isMesh) return; const n = o.material.name; if (/interior|curtain|herbs|flowerpot|room plaster|lamp glow/.test(n)) detail.push(o); else if (/ivory timber|ironwork|zinc|shop timber/.test(n)) trim.push(o); });
        handle.houses.push({ root: h, detail, trim, centre: new THREE.Vector3(x, 4, z + (near ? 3.2 : -3.2)) });
      }
      handle.oldtown = true; handle.active = true;
    }
    group.traverse(o => { if (o !== group && o.parent === group) o.matrixAutoUpdate = false; });
    const v = new THREE.Vector3();
    /** Per frame: tree breeze, bus wheels and doors, and distance-based detail. */
    handle.frame = (s, camera) => {
      if (camera?.isCamera && trees.length) {
        camera.updateMatrixWorld();
        treeClip.setFromProjectionMatrix(treeVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      }
      for (const tree of trees) {
        tree.root.visible = !camera?.isCamera || treeClip.intersectsSphere(tree.bounds);
        if (tree.root.visible && Number.isFinite(s?.t)) tree.mixer?.setTime(s.t + tree.phase);
      }
      const b = handle.bus;
      if (b) { b.roll(); if (s?.props?.doorClip) b.door(s.props.doorClip[0]); if (camera) { const d = camera.position.distanceTo(v.set(b.wrap.position.x, 1.2, b.wrap.position.z)); for (const m of b.inside) m.visible = d < L.busInsideDist; } }
      if (camera) for (const h of handle.houses) { const d = camera.position.distanceTo(h.centre); for (const m of h.detail) m.visible = d < L.detailDist; for (const m of h.trim) m.visible = d < L.trimDist; }
    };
    const isCity = o => { for (let p = o; p; p = p.parent) if (p === group || p === handle.bus?.wrap) return true; return false; };
    handle.stats = () => { let meshes = 0, tris = 0; c.group.traverse(o => { if (!o.isMesh || !o.visible) return; let p = o.parent; while (p && p !== c.group) { if (!p.visible) return; p = p.parent; } if (!isCity(o)) return; meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return { meshes, triangles: Math.round(tris) }; };
    // GPU copies of everything the models use; the parsed glTF stays in the cache (a replay uploads it again)
    c.disposables.push({ dispose() { if (env) env.dispose(); for (const g of used) disposeGPU(g); } });
    return handle;
  }
  function disposeGPU(g) {
    const seen = new Set();
    g.scene.traverse(o => {
      if (!o.isMesh) return; if (!seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      const m = o.material; if (seen.has(m)) return; seen.add(m);
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) if (m[k] && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); }
      m.envMap = null; m.dispose();
    });
  }

  window.CityAssets = {
    FILES, LAYOUT, ARRIVAL_TREES, MARKET_TREES, WAIT_MS, TIRE_R, load, preload, ready, status, dress, wheelAngle,
    get: n => cache.get(n)?.gltf || null,
    _setLoader(f) { makeLoader = f || defaultLoader; cache.clear(); } // tests
  };
})();
