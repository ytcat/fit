/* Authored city art for the Chapter 1 opening and market films. The GLBs are loaded asynchronously through the page's GLTFLoader and kept
 * in a cache; the generated set stays the fallback: a model that failed or is not ready when the film starts is simply not
 * used, and the generated piece is built instead (nothing ever waits longer than CityAssets.WAIT_MS).
 *
 *   CityAssets.preload(names?) -> Promise (never rejects)      defaults to the opening assets for Adventure home
 *   CityAssets.ready(ms?, names?) -> Promise                  each requested model a loaded glTF or null, after at most ms
 *   CityAssets.status() -> { bus: 'idle' | 'loading' | 'ready' | 'failed', ... }
 *   CityAssets.dress(ctx, city) -> handle                      called by the street and market builders with ready models
 *       handle { active, bus, station, oldtown, trees, frame(sample, camera), stats(), dispose() }  (objects.city of the set)
 *   CityAssets.LAYOUT                                          where the models go; dream-sets.js skips what they replace
 *   CityAssets.dresses(city, site) -> boolean                  whether dress() plants that tree site (else the set does)
 *   CityAssets.wheelAngle(distance) / doorClipTime(...)        pure helpers (tests/city-assets.test.cjs)
 *   CityAssets.propKit(city) -> Map name -> parts | null      the Blender props (tools/blender/*-props.py) of the ready models
 *   CityAssets.placeProp(parts, matrix, batches)               appends one prop instance to the set's merged batches
 *       (story-sets.js ctx.prop / lamp / bin / planter / bollard: the model or the generated piece, never both)
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
    hazelStall: './assets/street/ch01-market/hazel-fruit-stall.glb',
    // Blender props (tools/blender/street-props.py, gym-props.py): one node per prop, vertex-coloured, four material classes
    props: './assets/street/ch01-props/gloryland-street-props.glb',
    gymProps: './assets/street/ch01-props/gloryland-gym-props.glb'
  };
  const PROP_FILES = ['props', 'gymProps'], PROP_CLASSES = ['gloss', 'matte', 'glow', 'lantern'];
  // One authored asset/download and three silhouettes (form 'street': the GLB). Keep these on the arrival street only;
  // positions match the generated trees so a cold/offline load keeps a complete street (dream-sets.js plants the
  // generated tree for every site this dressing does not, see dresses()).
  // Form 'broad' (owner 2026-11-22): the round shade tree behind the Fighter as he steps off the bus, now a branching
  // broadleaf with a leafy crown from city-trees.js (same place; the generated set kept it as four green balls).
  const ARRIVAL_TREES = Object.freeze([
    Object.freeze({ name: 'Old Town street tree', form: 'street', x: 6.6, z: -5.3, h: 4.3, yaw: 0, scale: [1, 1, 1], phase: 0 }),
    Object.freeze({ name: 'Old Town compact tree', form: 'street', x: 11.6, z: 5.4, h: 4.4, yaw: 2.2, scale: [.74, .88, .81], phase: .7 }),
    Object.freeze({ name: 'Old Town spreading tree', form: 'street', x: 17.4, z: -5.4, h: 4.5, yaw: -1.3, scale: [1.17, .92, 1.03], phase: 1.6 }),
    Object.freeze({ name: 'Old Town round tree', form: 'broad', x: -6.4, z: -5.4, h: 4.6, yaw: .55, scale: [1, 1, 1], phase: 0 })
  ]);
  const MARKET_TREES = Object.freeze([
    Object.freeze({ name: 'Market west tree', form: 'street', x: -2.9, z: -4.45, h: 4.0, yaw: 1.8, scale: [.74, .83, .75], phase: 1.1 }),
    Object.freeze({ name: 'Market east tree', form: 'street', x: 3.25, z: -4.6, h: 4.1, yaw: -.6, scale: [.91, .88, .79], phase: 2.2 })
  ]);
  const OPENING_MODELS = ['tree', 'car', 'bus', 'station', 'oldtown', 'props'];
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
    // parked compacts (the GLB; the generated car is built only where no model stands): [x, z, body colour or null]
    // turned like the generated car they replace (parked with the traffic), merged per material (one draw call each)
    cars: [[8.4, -2.45, null], [-16, -2.45, '#3b7dd8']], carDetailDist: 14, carFarCell: .075, // beyond 14 m the welded far copy
    houses: [['brick', -12.6, -8.2, 0], ['plaster', 2.4, -8.2, 0], ['plaster', 6.2, 10.4, HALF], ['brick', 13.1, 10.4, HALF]],
    replaced: { far: [-11, .6], near: [9.5] }, // generated house slots (x) the prototypes stand in
    fill: [{ style: 'plaster', x: -5.1, w: 7.0, floors: 3, tint: 0, roof: 4 }], // a generated house between the two far prototypes
    detailDist: 15, trimDist: 22, busInsideDist: 9, busSilhouetteDist: 24
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
  /** Whether dress(ctx, city, sites) plants this tree site (the generated set plants exactly the others: never both). */
  const dresses = (city, site) => !city ? false : (site.form || 'street') === 'street' ? !!city.tree : !!window.CityTrees;
  /** The parked car model merged into one mesh per material (built once per loaded model; it never moves). */
  const carParts = new WeakMap();
  function staticCar(gltf) {
    let parts = carParts.get(gltf); if (parts) return parts;
    const by = new Map(); gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (o.isMesh && o.geometry?.attributes?.position) { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); } });
    const p = new THREE.Vector3(), nm = new THREE.Matrix3();
    parts = [...by].map(([material, list]) => {
      let nv = 0, ni = 0; for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let v0 = 0, i0 = 0;
      for (const o of list) {
        const g = o.geometry, P = g.attributes.position, N = g.attributes.normal; nm.getNormalMatrix(o.matrixWorld);
        for (let k = 0; k < P.count; k++) { p.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); pos[(v0 + k) * 3] = p.x; pos[(v0 + k) * 3 + 1] = p.y; pos[(v0 + k) * 3 + 2] = p.z; if (N) { p.fromBufferAttribute(N, k).applyMatrix3(nm).normalize(); nor[(v0 + k) * 3] = p.x; nor[(v0 + k) * 3 + 1] = p.y; nor[(v0 + k) * 3 + 2] = p.z; } }
        if (g.index) for (let k = 0; k < g.index.count; k++) idx[i0 + k] = g.index.getX(k) + v0; else for (let k = 0; k < P.count; k++) idx[i0 + k] = k + v0;
        v0 += P.count; i0 += g.index ? g.index.count : P.count;
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geometry.setIndex(new THREE.BufferAttribute(idx, 1)); geometry.computeBoundingSphere();
      return { material, geometry };
    });
    carParts.set(gltf, parts); return parts;
  }
  /** The far copy of a parked car: its vertices welded on a grid of `cell` metres (normals averaged), collapsed triangles
   * dropped. Built once per loaded model; shown instead of the full car beyond LAYOUT.carDetailDist (never a re-index of a
   * drawn mesh: two meshes, one visible). */
  const carFar = new WeakMap();
  function clustered(gltf, cell) {
    let far = carFar.get(gltf); if (far) return far;
    far = staticCar(gltf).map(({ material, geometry }) => {
      const P = geometry.attributes.position, N = geometry.attributes.normal, I = geometry.index, cells = new Map(), rep = new Uint32Array(P.count), pos = [], nor = [], cnt = [];
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), key = Math.floor(x / cell) + ',' + Math.floor(y / cell) + ',' + Math.floor(z / cell) + ',' + Math.round(N.getX(i) * 1.4) + Math.round(N.getY(i) * 1.4) + Math.round(N.getZ(i) * 1.4); // facing kept apart: no inner and outer skin averaged
        let k = cells.get(key); if (k === undefined) { k = cnt.length; cells.set(key, k); cnt.push(0); pos.push(0, 0, 0); nor.push(0, 0, 0); }
        rep[i] = k; cnt[k]++; pos[k * 3] += x; pos[k * 3 + 1] += y; pos[k * 3 + 2] += z; nor[k * 3] += N.getX(i); nor[k * 3 + 1] += N.getY(i); nor[k * 3 + 2] += N.getZ(i);
      }
      for (let k = 0; k < cnt.length; k++) { for (let j = 0; j < 3; j++) pos[k * 3 + j] /= cnt[k]; const l = Math.hypot(nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]); if (l > 1e-6) for (let j = 0; j < 3; j++) nor[k * 3 + j] /= l; else nor[k * 3 + 1] = 1; }
      const idx = [];
      for (let t = 0; t < I.count; t += 3) { const a = rep[I.getX(t)], b = rep[I.getX(t + 1)], c = rep[I.getX(t + 2)]; if (a !== b && b !== c && a !== c) idx.push(a, b, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); g.computeBoundingSphere();
      return { material, geometry: g };
    }).filter(p => p.geometry.index.count > 0);
    carFar.set(gltf, far); return far;
  }

  /* The stall's chalk lettering (HAZEL'S / FRUIT & GREENS on the front board, PER KG on the price boards; modelled in
     Blender) in the player's language (owner rule 2026-11-23): in Hebrew and Russian the modelled letters are hidden and
     the same words are chalked on a plane in their place, one label per board (boards found from gaps along x). */
  const HAZEL_SIGN = { he: { name: ['הייזל', 'פירות וירקות'], unit: ['לקילו'] }, ru: { name: ['ХЕЙЗЕЛ', 'ФРУКТЫ И ЗЕЛЕНЬ'], unit: ['ЗА КГ'] } };
  function hazelSign(root) {
    const lang = window.app?.lang, words = HAZEL_SIGN[lang]; if (!words) return;
    const find = re => { let m = null; root.traverse(o => { if (!m && o.isMesh && o.material?.name === 'chalk and scale dial' && re.test(o.name)) m = o; }); return m; };
    chalk(find(/^Stall_structure/), words.name, lang); // the 'Hazel name' mesh under the canopy
    chalk(find(/^Produce_display/), words.unit, lang); // the 'price unit' lettering on the small slates
  }
  function chalk(src, lines, lang) {
    if (!src) return; const geo0 = src.geometry; geo0.computeBoundingBox();
    const b = geo0.boundingBox, w = b.max.x - b.min.x, h = b.max.z - b.min.z, P = geo0.attributes.position;
    // boards: runs of letters along x separated by more than 6 cm
    const xs = []; for (let i = 0; i < P.count; i++) xs.push(P.getX(i)); xs.sort((p, q) => p - q);
    const boards = []; let a = xs[0]; for (let i = 1; i <= xs.length; i++) if (i === xs.length || xs[i] - xs[i - 1] > .06) { boards.push([a, xs[i - 1]]); a = xs[i]; }
    const S = 1024 / w, cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.max(16, Math.round(h * S));
    const g = cv.getContext('2d'); g.fillStyle = '#' + src.material.color.getHexString(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = lang === 'he' ? 'rtl' : 'ltr';
    for (const [x0, x1] of boards) {
      const cx = (x0 + x1) / 2 - b.min.x, bw = Math.max(x1 - x0, .04) * S * 1.1;
      if (lines.length === 1) { g.font = `800 ${Math.round(cv.height * .8)}px sans-serif`; g.fillText(lines[0], cx * S, cv.height / 2, bw); }
      else { g.font = `900 ${Math.round(cv.height * .4)}px sans-serif`; g.fillText(lines[0], cx * S, cv.height * .3, bw); g.font = `700 ${Math.round(cv.height * .24)}px sans-serif`; g.fillText(lines[1], cx * S, cv.height * .74, bw); }
    }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(w, h); geo.rotateX(-Math.PI / 2); geo.translate((b.min.x + b.max.x) / 2, b.max.y + .0008, (b.min.z + b.max.z) / 2); // the top line at -z, like the modelled letters
    const plane = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .95, side: THREE.DoubleSide }));
    plane.name = src.name + ' (' + lang + ')'; plane.position.copy(src.position); plane.quaternion.copy(src.quaternion); plane.scale.copy(src.scale);
    src.parent.add(plane); src.visible = false;
  }
  /* ---------------------------------------------------------------- Blender props: merged into the set's batches */
  /** Each prop node of a loaded props model as triangle soup per material class, in the node's own frame (built once per
   * model): { gloss|matte|glow|lantern: { p, n, c } } (linear vertex colours). Placing a prop copies these arrays: the set
   * draws all its props with its street batch (matte), one glossy mesh, its glow batch and (lanterns) one of the two. */
  const propParts = new WeakMap();
  function parseProps(gltf) {
    let out = propParts.get(gltf); if (out) return out;
    out = new Map(); gltf.scene.updateMatrixWorld(true);
    const rel = new THREE.Matrix4(), inv = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
    for (const node of gltf.scene.children) {
      const parts = {}; inv.copy(node.matrixWorld).invert();
      node.traverse(o => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color, I = g.index, cls = PROP_CLASSES.includes(o.material?.name) ? o.material.name : 'matte';
        const q = parts[cls] ||= { p: [], n: [], c: [] }; rel.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(rel);
        // r128 getX() does not denormalize: COLOR_0 is exported as normalized unsigned short (or byte)
        const cs = !Cc?.normalized ? 1 : Cc.array instanceof Uint16Array ? 1 / 65535 : Cc.array instanceof Uint8Array ? 1 / 255 : 1;
        const n = I ? I.count : P.count;
        for (let k = 0; k < n; k++) {
          const i = I ? I.getX(k) : k;
          v.fromBufferAttribute(P, i).applyMatrix4(rel); q.p.push(v.x, v.y, v.z);
          if (N) v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); else v.set(0, 1, 0); q.n.push(v.x, v.y, v.z);
          if (Cc) q.c.push(Cc.getX(i) * cs, Cc.getY(i) * cs, Cc.getZ(i) * cs); else q.c.push(1, 1, 1);
        }
      });
      for (const q of Object.values(parts)) for (const k of ['p', 'n', 'c']) q[k] = new Float32Array(q[k]);
      out.set(node.name, parts);
    }
    propParts.set(gltf, out); return out;
  }
  function propKit(city) {
    let kit = null;
    for (const k of PROP_FILES) { const g = city?.[k]; if (g?.scene) for (const [name, parts] of parseProps(g)) (kit ||= new Map()).set(name, parts); }
    return kit;
  }
  /** One instance: parts transformed by matrix (scale allowed) appended to batches { gloss, matte, glow, lantern } (K.Batch). */
  function placeProp(parts, matrix, batches) {
    const e = matrix.elements, nm = new THREE.Matrix3().getNormalMatrix(matrix).elements; let tris = 0;
    for (const [cls, q] of Object.entries(parts)) {
      const B = batches[cls] || batches.matte; if (!B) continue; const P = q.p, N = q.n, C = q.c;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2], a = N[i], b = N[i + 1], c = N[i + 2];
        B.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
        const nx = nm[0] * a + nm[3] * b + nm[6] * c, ny = nm[1] * a + nm[4] * b + nm[7] * c, nz = nm[2] * a + nm[5] * b + nm[8] * c, l = Math.hypot(nx, ny, nz) || 1;
        B.n.push(nx / l, ny / l, nz / l); B.c.push(C[i], C[i + 1], C[i + 2]);
        if (B.uv) B.uv.push(0, 0); if (B.t) B.t.push(1, 1, 1);
      }
      tris += P.length / 9;
    }
    return tris;
  }

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
    const L = LAYOUT, group = new THREE.Group(), handle = { active: false, bus: null, station: false, oldtown: false, parts: [], houses: [], trees: [], cars: [] };
    group.name = 'city art (GLB)'; c.group.add(group);
    const used = [], env = environment(c.opts?.renderer), aniso = c.opts?.renderer ? Math.min(4, c.opts.renderer.capabilities.getMaxAnisotropy()) : 1;
    for (const [k, g] of Object.entries(city || {})) if (g && !PROP_FILES.includes(k)) used.push(g); // props: copied into the set's batches
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
      if ((site.form || 'street') !== 'street') continue;
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
    // procedural shade trees (city-trees.js): into the set's own tree batches when it has them (bark with the street,
    // one leaf mesh for every tree of the set), else one bark and one leaf mesh for these sites
    const planted = treeSites.filter(site => (site.form || 'street') !== 'street' && dresses(city, site));
    if (planted.length) {
      const own = c.treeParts ? null : { wood: { p: [], n: [], c: [] }, leaf: { p: [], n: [], c: [] } }, into = c.treeParts || own;
      for (const site of planted) CityTrees.add(into.wood, into.leaf, site.form, site);
      if (own) for (const kind of ['wood', 'leaf']) { const m = CityTrees.mesh(own[kind], 'city trees (' + kind + ')', kind); m.receiveShadow = true; m.castShadow = kind === 'leaf'; group.add(m); c.disposables.push(m.geometry, m.material); }
      handle.trees = planted.map(site => ({ name: site.name, form: site.form, x: site.x, z: site.z }));
      handle.active = true;
    }
    if (city?.car) {
      const parts = staticCar(city.car), far = clustered(city.car, L.carFarCell);
      c.disposables.push({ dispose() { for (const part of [...parts, ...far]) part.geometry.dispose(); } });
      for (const [x, z, tint] of L.cars) {
        const name = tint ? 'Old Town compact ' + tint : 'Old Town compact', paint = new Map();
        const build = (list, label) => {
          const car = new THREE.Group(); car.name = name + label;
          for (const { material, geometry } of list) {
            let m = material; if (tint && /enamel/.test(material.name)) { if (!paint.has(material)) { const p = material.clone(); p.color.set(tint); p.color.convertSRGBToLinear(); c.disposables.push(p); paint.set(material, p); } m = paint.get(material); }
            const mesh = new THREE.Mesh(geometry, m); mesh.name = name + ' · ' + material.name; mesh.renderOrder = material.transparent ? 2 : 0; mesh.castShadow = false; mesh.receiveShadow = true; car.add(mesh);
          }
          return put(car, x, -.15, z, city.bus ? 0 : HALF); // as the generated car: dir = -lane (lane -1 with the model bus)
        };
        const full = build(parts, ''), distant = build(far, ' (far)'); distant.visible = false;
        handle.cars.push({ full, far: distant, centre: new THREE.Vector3(x, .6, z) });
      }
      handle.active = true;
    }
    if (city?.hazelStall) {
      const stall = city.hazelStall.scene.clone(true);
      stall.name = "Hazel's fruit stall"; hazelSign(stall);
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
      // The authored cabin is 7.6k triangles. Keep a 288-triangle seat silhouette at street distance
      // instead of leaving clear windows over an empty coach. No part touches the GLB animation nodes.
      const lite = new c.K.Batch();
      for (const x of [-4.15,-2.85,-1.55,-.25,1.1,2.45]) for (const z of [-.73,.73]) {
        c.box(lite,x,1.05,z,.44,.15,.56,'#405f61');
        c.box(lite,x-.18,1.17,z,.14,.52,.55,'#4c6a6b');
      }
      const cabinLOD = new THREE.Mesh(lite.geometry(),new THREE.MeshStandardMaterial({ vertexColors:true,roughness:.92 }));
      cabinLOD.name = 'bus cabin distant seat silhouette';
      cabinLOD.visible = false; model.add(cabinLOD); c.disposables.push(cabinLOD.geometry,cabinLOD.material);
      const bus = { wrap, model, mixer, doors, wheels, inside, cabinLOD, x0: null, dist: 0, clipT: 0 };
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
      if (b) { b.roll(); if (s?.props?.doorClip) b.door(s.props.doorClip[0]); if (camera) {
        // Measure from the visible cabin, not its midpoint eleven metres across:
        // a close passenger-door or windscreen view still needs proper seats and rails.
        const nearX = Math.min(b.wrap.position.x+4.3,Math.max(b.wrap.position.x-4.3,camera.position.x));
        const d = camera.position.distanceTo(v.set(nearX,1.55,b.wrap.position.z));
        const full = d < L.busInsideDist;
        for (const m of b.inside) m.visible = full;
        b.cabinLOD.visible = !full && d < L.busSilhouetteDist;
      } }
      if (camera) for (const car of handle.cars) { const near = camera.position.distanceTo(car.centre) < L.carDetailDist; car.full.visible = near; car.far.visible = !near; }
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
    FILES, LAYOUT, ARRIVAL_TREES, MARKET_TREES, WAIT_MS, TIRE_R, load, preload, ready, status, dress, dresses, wheelAngle, propKit, placeProp,
    get: n => cache.get(n)?.gltf || null,
    _setLoader(f) { makeLoader = f || defaultLoader; cache.clear(); } // tests
  };
})();
