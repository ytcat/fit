/* Free walk (GOTR-0118): the whole Gloryland town at street level. The town is the map itself (gloryland-map.js, the same
 * layout, buildings, signs, trees and coast as the Adventure map), built once in metres (3 m per map unit, the story sets'
 * scale) with a walkable curb and the signs in the player's language. On top of it, at street level:
 *   - where a person can stand: a height field of the town rendered once from above on the GPU (everything solid, not trees
 *     or people), joined to the street network (roofs and water are left out), tree trunks and lamp posts as small discs;
 *   - cars that drive the streets (the map's grid streets and main roads, right-hand traffic, turning at crossings) and
 *     always stop before a person in their path; one instanced mesh;
 *   - people walking the pavements around the blocks near the player (StreetLife walkers, one draw call each), streamed:
 *     only the ones near the player exist;
 *   - a fine grain on the painted ground (asphalt, paving) so it holds up close.
 * Draw calls stay flat (the map is ~30 merged meshes) and nothing is rebuilt while walking.
 * The look (owner 2026-11-25, GOTR-0120): the story places are the films' street (free-walk-sets.js: Bruno's Gym and the bus
 * stop, Market Row round Hazel's stall, Otto's Corner, the Docks), the picture is drawn like the films (free-walk-look.js:
 * full screen resolution, the films' light for the story's time of day, a sun shadow round the player, image-based light,
 * sharper facades with windows that have depth), and the merged meshes are cut into tiles so only what is near is drawn.
 *
 *   FreeWalkTown.prepare(ms) -> Promise   the films' kit and street models (at most ms; call before build)
 *   FreeWalkTown.build({ renderer, time: 'morning' | 'day' | 'evening' | 'night', quality, lang }) -> town
 *     town.scene, town.grid (FreeWalkCore.grid), town.places [{ id, x, z, r, spawn }], town.targets { id: { x, z } },
 *     town.update(dt, player {x, z}, camera), town.blocked(x, z) (cars), town.snapshot(), town.dispose()
 *     town.views { gym, busstop, market, otto, docks, basement: { x, z, yaw } } (the films' views of the story places),
 *     town.look() (picture settings), town.quality(level | null) (pin the look's ladder; QA), town.settled() -> Promise
 * World: metres, x east, z south, y up. */
(() => {
  'use strict';
  const Core = () => window.FreeWalkCore;
  const S = 3, CELL = .5;
  const BOUNDS = { x0: -114, x1: 118, z0: -88, z1: 68 }; // map units: the land and its coast
  const REACH = { oldtown: 30, market: 28, docks: 34, downtown: 44, neon: 40, dome: 18, hill: 30, tech: 22, fair: 24, cove: 22, fort: 24 }; // map units
  const STREET_LIFE = new Set(['people', 'people moving', 'cars', 'cars moving', 'trams moving', 'carlights moving']); // replaced at street level
  const SOLID = name => name === 'solid' || name === 'ground' || name === 'lit' || name === 'containers' || name.startsWith('facade ');
  const solidMesh = o => o.isMesh && (SOLID(o.name) || o.userData.fwSolid === true); // the map's solid batches and the story sets' walls and floors
  const TRUNK = { trees: .45, pines: .42, palms: .32, lamps: .2, bushes: .6, umbrellas: .22 }; // metres per unit instance scale
  const MAX_CARS = 12, MAX_WALKERS = 10;
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /** Top surface of everything solid, seen from straight above: one render into a byte target, depth unpacked to heights. */
  function heightField(renderer, scene) {
    const T = THREE, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) * S / CELL), nz = Math.round((BOUNDS.z1 - BOUNDS.z0) * S / CELL);
    const x0 = BOUNDS.x0 * S, z0 = BOUNDS.z0 * S, W = nx * CELL, H = nz * CELL, TOP = 250, NEAR = 1, FAR = 320;
    const cam = new T.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, NEAR, FAR);
    cam.up.set(0, 0, -1); cam.position.set(x0 + W / 2, TOP, z0 + H / 2); cam.lookAt(x0 + W / 2, 0, z0 + H / 2); cam.updateMatrixWorld(true);
    const rt = new T.WebGLRenderTarget(nx, nz, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, stencilBuffer: false });
    const mat = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, side: T.DoubleSide });
    const shown = [];
    scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) { shown.push(o); o.visible = solidMesh(o); } });
    const was = { override: scene.overrideMaterial, fog: scene.fog, bg: scene.background, target: renderer.getRenderTarget(), clear: renderer.getClearColor(new T.Color()), alpha: renderer.getClearAlpha(), auto: renderer.shadowMap.autoUpdate, sm: renderer.shadowMap.enabled };
    const buf = new Uint8Array(nx * nz * 4);
    try {
      scene.overrideMaterial = mat; scene.fog = null; scene.background = null; renderer.shadowMap.enabled = false;
      renderer.setRenderTarget(rt); renderer.setClearColor(0xffffff, 1); renderer.clear(true, true, true);
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, nx, nz, buf);
    } finally {
      scene.overrideMaterial = was.override; scene.fog = was.fog; scene.background = was.bg; renderer.shadowMap.enabled = was.sm;
      renderer.setRenderTarget(was.target); renderer.setClearColor(was.clear, was.alpha);
      for (const o of shown) o.visible = true;
      rt.dispose(); mat.dispose();
    }
    const heights = new Float32Array(nx * nz), k = 255 / 256 / 255, f = [k / 16777216, k / 65536, k / 256, k];
    for (let r = 0; r < nz; r++) {
      const j = nz - 1 - r; // row 0 of the target is the bottom of the view: the south (+z) edge
      for (let i = 0; i < nx; i++) {
        const p = (r * nx + i) * 4, d = buf[p] * f[0] + buf[p + 1] * f[1] + buf[p + 2] * f[2] + buf[p + 3] * f[3];
        heights[j * nx + i] = TOP - (NEAR + d * (FAR - NEAR));
      }
    }
    return { x0, z0, cell: CELL, nx, nz, heights };
  }

  /** Fine grain on the painted ground: two octaves of cell noise in world space (asphalt and paving read up close). */
  function groundGrain(mat) {
    const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(mat, sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFwG;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFwG = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFwG;\nfloat fwH(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\nfloat fwN(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(fwH(i), fwH(i + vec2(1.0, 0.0)), u.x), mix(fwH(i + vec2(0.0, 1.0)), fwH(i + vec2(1.0, 1.0)), u.x), u.y); }')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ float g = fwN(vFwG * 3.1) * .5 + fwN(vFwG * .8 + 7.0) * .5; diffuseColor.rgb *= .9 + .17 * g; }');
    };
    mat.customProgramCacheKey = () => 'fw-grain|' + key; mat.needsUpdate = true;
  }

  function signTexture(text) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#7a2e22'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#f4c152'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
    g.font = '900 64px "Inter","Arial Black",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff3d6';
    g.fillText(text, 256, 66, 470);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }

  function buildTown(opts = {}, keep = {}) {
    const C = Core(), T = THREE, renderer = opts.renderer, lang = C.langOf(opts.lang);
    const scene = new T.Scene(), owned = [], own = x => { owned.push(x); return x; };
    const hour = ['morning', 'day', 'evening', 'night'].includes(opts.time) ? opts.time : 'day', tier = opts.quality === 'low' ? 'low' : 'high';
    const Sets = window.FreeWalkSets, Look = window.FreeWalkLook, ms = { start: performance.now() }, mark = k => { ms[k] = Math.round(performance.now() - ms.start); };
    const map = GlorylandMap.build(scene, { time: hour, renderer, quality: tier, curb: .05, lang, scale: S, walk: true, shadowSize: 1024, skip: Sets?.skip, facadeScale: tier === 'low' ? 0 : 2, litWindows: hour === 'evening' });
    keep.map = map; keep.scene = scene;
    const lay = map.layout, landY = lay.landY * S;
    map.sun.castShadow = false;
    const night = map.night;
    scene.fog = new T.Fog(map.fogColor, night ? 70 : 110, night ? 300 : 420);
    // the films' look: facades painted sharper with windows that have depth (lit at dusk and at night), the story places
    if (Look) try { Look.facades(map, { renderer, sharp: tier === 'low' ? 1 : 2 }); } catch (x) { console.warn('walk facades', x); }
    let places3d = null;
    mark('map');
    if (Sets) try { places3d = Sets.build({ map, scene, renderer, time: hour, lang, tier }); keep.sets = places3d; } catch (x) { console.warn('walk sets', x); places3d = null; }
    mark('sets');
    // at night the street is lit for a person: a cool moon fill and a warm street-lamp light that follows the player (one point light)
    let lamp = null; if (night) { scene.add(new T.HemisphereLight(0x8fa3d8, 0x2a2438, .7)); lamp = new T.PointLight(0xffd9a8, 1.6, 16, 1.6); scene.add(lamp); }
    for (const [name, m] of Object.entries(map.meshes)) if (STREET_LIFE.has(name)) m.visible = false;
    if (map.meshes.ground) groundGrain(map.meshes.ground.material);

    /* ---- where a person can stand */
    const t0 = performance.now();
    const field = heightField(renderer, scene);
    const msHeight = performance.now() - t0;
    const cellOf = (x, z) => { const i = Math.floor((x - field.x0) / CELL), j = Math.floor((z - field.z0) / CELL); return i < 0 || j < 0 || i >= field.nx || j >= field.nz ? -1 : j * field.nx + i; };
    const segs = [];
    for (const s of lay.streets) segs.push({ a: [s.a[0] * S, s.a[1] * S], b: [s.b[0] * S, s.b[1] * S], w: s.w * S, ext: s.w * S / 2 });
    for (const r of lay.roads) for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: [r.pts[i][0] * S, r.pts[i][1] * S], b: [r.pts[i + 1][0] * S, r.pts[i + 1][1] * S], w: r.w * S, ext: 0 });
    const seeds = [];
    for (const s of segs) for (const t of [.25, .5, .75]) seeds.push(cellOf(s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t));
    const walk = C.walkGrid(field.heights, field.nx, field.nz, { step: .32, sea: .15, seeds, erode: 1 });
    const discs = [];
    for (const [name, r] of Object.entries(TRUNK)) for (const o of lay.inst[name]?.list || []) discs.push([o.x * S, o.z * S, r * (o.s || 1)]);
    if (places3d) discs.push(...places3d.discs);
    C.blockDiscs(walk, field, discs);
    const pockets = C.keepConnected(walk, field.nx, field.nz, seeds); // pockets closed by trunks and posts are not walkable
    // tree crowns (instanced, not in the height field): a coarse top map so the camera keeps out of the leaves
    const CC = 2, cnx = Math.ceil(field.nx * CELL / CC), cnz = Math.ceil(field.nz * CELL / CC), crowns = new Float32Array(cnx * cnz).fill(-1e9);
    for (const [name, [r0, h0]] of Object.entries({ trees: [1.0, 2.9], pines: [.9, 2.7], palms: [1.5, 3.4] })) for (const o of lay.inst[name]?.list || []) {
      const sc = o.s || 1, r = r0 * sc * S, top = ((o.y || 0) + h0 * sc) * S, x = o.x * S, z = o.z * S;
      for (let cj = Math.max(0, Math.floor((z - r - field.z0) / CC)); cj <= Math.min(cnz - 1, Math.floor((z + r - field.z0) / CC)); cj++)
        for (let ci = Math.max(0, Math.floor((x - r - field.x0) / CC)); ci <= Math.min(cnx - 1, Math.floor((x + r - field.x0) / CC)); ci++) { const k = cj * cnx + ci; if (top > crowns[k]) crowns[k] = top; }
    }
    const canopy = (x, z) => { const i = Math.floor((x - field.x0) / CC), j = Math.floor((z - field.z0) / CC); return i < 0 || j < 0 || i >= cnx || j >= cnz ? -1e9 : crowns[j * cnx + i]; };
    const grid = C.grid({ ...field, walk });
    // a device that cannot read the height field back (or renders it wrong) gets a clean failure, never a walk inside walls
    let open = 0; for (let k = 0; k < walk.length; k += 7) open += walk[k]; if (open * 7 < 100000) throw Error('free walk: the town could not be measured on this device');

    /* ---- districts, landmarks and story waypoints (metres) */
    const near = (x, z) => grid.nearest(x, z, 400) || { x, z };
    // a district starts on its nearest street crossing (open view), the landmark itself is the place to walk to
    const roads = C.roadGraph(segs.map(s => { const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l = Math.hypot(dx, dz) || 1, e = s.ext; return { a: [s.a[0] - dx / l * e, s.a[1] - dz / l * e], b: [s.b[0] + dx / l * e, s.b[1] + dz / l * e], w: s.w }; }), 2.2);
    const crossing = (x, z) => { let best = null, bd = 75; for (const n of roads.nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd && grid.allowed(n.x, n.z)) { bd = d; best = n; } } return best ? { x: best.x, z: best.z } : null; };
    const places = map.places.map(p => { const x = p.anchor.x * S, z = p.anchor.z * S; const door = near(x, z), cross = crossing(x, z); return { id: p.id, kind: p.kind, x, z, r: (REACH[p.id] || 24) * S, spawn: cross && Math.hypot(cross.x - x, cross.z - z) < 45 ? cross : door, door }; });
    const L = lay.landmarks, mf = lay.marketFrame, mat2 = (u, w) => [(mf.o[0] + mf.U[0] * u + mf.Wv[0] * w) * S, (mf.o[1] + mf.U[1] * u + mf.Wv[1] * w) * S];
    const mc = mat2(22, 0), otto = mat2(44, 4.4), gym = L.homeGym ? [L.homeGym.x * S, L.homeGym.z * S] : [places[0].x, places[0].z], quay = L.hangar ? [L.hangar.x * S, (L.hangar.z + 4) * S] : [places[2].x, places[2].z];
    const targets = { bruno: near(gym[0], gym[1]), market_stall: near(mc[0], mc[1]), otto: near(otto[0], otto[1]), docks_quay: near(quay[0], quay[1]) };
    for (const p of places) targets[p.id] = p.door; // walking to a district leads to its landmark; opening there starts on a street nearby (spawn)
    { // the story places of the films' street: in front of Bruno's door, at Hazel's counter, at Otto's door
      const F = places3d?.frames, at = (f, lx, lz) => { const c = Math.cos(f.ry), s = Math.sin(f.ry), x = f.x + lx * c + lz * s, z = f.z - lx * s + lz * c; return grid.allowed(x, z) ? { x, z } : near(x, z); };
      if (F?.gym) targets.bruno = at(F.gym, -.35, 11.4);
      if (F?.market) targets.market_stall = at(F.market, 0, -2.3);
      if (F?.otto) targets.otto = at(F.otto, .9, 1.5);
    }
    if (!places3d?.frames?.otto) { // Otto's shop: a localized board on two posts at the market's east end (the shop of Chapter 1)
      const fr = Math.atan2(mf.U[0], mf.U[1]), at = mat2(44, 3.8), y = grid.height(targets.otto.x, targets.otto.z);
      const tex = own(signTexture(C.text(lang, 'ottoSign'))), board = new T.Mesh(own(new T.PlaneGeometry(2.6, .65)), own(new T.MeshStandardMaterial({ map: tex, roughness: .7, side: T.DoubleSide })));
      board.position.set(at[0], y + 2.35, at[1]); board.rotation.y = fr + Math.PI / 2; board.name = 'Otto sign';
      const postG = own(new T.CylinderGeometry(.05, .05, 2.4, 6)), postM = own(new T.MeshStandardMaterial({ color: 0x3a3f48, roughness: .6 }));
      for (const s of [-1.15, 1.15]) { const p = new T.Mesh(postG, postM); p.position.set(at[0] + Math.sin(fr + Math.PI / 2) * s, y + 1.2, at[1] + Math.cos(fr + Math.PI / 2) * s); scene.add(p); }
      scene.add(board); C.blockDiscs(walk, field, [[at[0], at[1], .25]]);
    }

    /* ---- the picture: tiles of the merged meshes (view and shadow culling), the films' light and the quality ladder */
    if (Look && places3d?.cuts?.length) try { for (const c of places3d.cuts) Look.clip(map.group, [c], c.yMin, /^(ground|sea|road marks|clouds)$/); } catch (x) { console.warn('walk cuts', x); }
    if (Look && places3d?.marks?.length) try { Look.clip(map.group, places3d.marks, -Infinity, /^$/, /^road marks$/); } catch (x) { console.warn('walk marks', x); }
    mark('walkable');
    let tiles = 0; if (Look) try { tiles = Look.tile(map.group, 96).length; } catch (x) { console.warn('walk tiles', x); }
    let look = null; if (Look) try { look = Look.attach({ renderer, scene, map, time: hour, tier }); keep.look = look; } catch (x) { console.warn('walk look', x); look = null; }
    // the town's own trees and lamps near the player in the films' detail (the map's low copies far away)
    let dress = null; if (Sets?.dressing) try { dress = Sets.dressing({ map, scene, city: window.CityAssets?.cached?.(['props'], false), time: hour, tier }); keep.dress = dress; } catch (x) { console.warn('walk dressing', x); dress = null; }

    /* ---- traffic */
    const carSrc = map.meshes.cars, cars = [], R = rng(1234);
    const carMesh = carSrc ? new T.InstancedMesh(carSrc.geometry, carSrc.material, MAX_CARS) : null; // the map's own car, shared geometry
    if (carMesh) { carMesh.name = 'street cars'; carMesh.frustumCulled = false; for (let i = 0; i < MAX_CARS; i++) carMesh.setColorAt(i, new T.Color(1, 1, 1)); carMesh.count = 0; scene.add(carMesh); } // colours first: the colour buffer is sized by the count
    const palette = GlorylandMap.PAL.car.map(h => new T.Color(h).convertSRGBToLinear()), M4 = new T.Matrix4(), Q = new T.Quaternion(), E3 = new T.Euler(), P3 = new T.Vector3(), SC = new T.Vector3(S, S, S);
    function spawnCar(px, pz, minD, maxD) {
      for (let k = 0; k < 30; k++) {
        const e = Math.floor(R() * roads.edges.length), E = roads.edges[e]; if (!E) return null;
        const A = roads.nodes[E.a], B = roads.nodes[E.b], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, d = Math.hypot(mx - px, mz - pz);
        if (d < minD || d > maxD) continue;
        const dir = R() < .5 ? 1 : -1, s = R() * E.len;
        if (cars.some(c => c.e === e && c.dir === dir && Math.abs(c.s - s) < 12)) continue;
        return { e, dir, s, speed: 4, cruise: 6 + R() * 2.5, color: palette[Math.floor(R() * palette.length)] };
      }
      return null;
    }
    function updateCars(dt, p) {
      for (let i = cars.length - 1; i >= 0; i--) { const q = C.lanePose(roads, cars[i].e, cars[i].dir, cars[i].s); if (Math.hypot(q.x - p.x, q.z - p.z) > 190) cars.splice(i, 1); }
      while (cars.length < MAX_CARS) { const c = spawnCar(p.x, p.z, cars.length < 4 ? 25 : 60, 170); if (!c) break; cars.push(c); }
      for (const c of cars) {
        const E = roads.edges[c.e], q = C.lanePose(roads, c.e, c.dir, c.s);
        let ahead = Infinity; for (const o of cars) if (o !== c && o.e === c.e && o.dir === c.dir && o.s > c.s) ahead = Math.min(ahead, o.s - c.s);
        // the person in lane coordinates of this street; near a crossing also anyone just in front of the bonnet
        const dx = p.x - q.sx, dz = p.z - q.sz, local = { u: dx * q.ux + dz * q.uz, v: dx * q.rx + dz * q.rz - q.off };
        const fx = p.x - q.x, fz = p.z - q.z, front = fx * q.ux + fz * q.uz, side = Math.abs(fx * q.rx + fz * q.rz);
        const person = front > 0 && front < 7 && side < 2.2 ? { u: c.s + front, v: 0 } : local;
        C.carStep(c, dt, person, ahead);
        if (c.s >= E.len) { const n = C.nextEdge(roads, c.e, c.dir, R); c.s -= E.len; c.e = n.e; c.dir = n.dir; }
      }
      if (!carMesh) return;
      cars.forEach((c, i) => {
        const q = C.lanePose(roads, c.e, c.dir, c.s), y = grid.allowed(q.x, q.z) ? grid.height(q.x, q.z) : landY;
        c.x = q.x; c.z = q.z; c.ry = q.ry; c.ux = q.ux; c.uz = q.uz;
        M4.compose(P3.set(q.x, y, q.z), Q.setFromEuler(E3.set(0, q.ry, 0)), SC); carMesh.setMatrixAt(i, M4); carMesh.setColorAt(i, c.color);
      });
      carMesh.count = cars.length; carMesh.instanceMatrix.needsUpdate = true; if (carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;
    }
    // a stopped (or moving) car is solid for the person
    function blocked(x, z) {
      for (const c of cars) { if (c.x === undefined) continue; const dx = x - c.x, dz = z - c.z, u = dx * c.ux + dz * c.uz, v = dx * -c.uz + dz * c.ux; if (Math.abs(u) < C.CAR.halfLen + .3 && Math.abs(v) < C.CAR.halfWidth + .3) return true; }
      return false;
    }

    /* ---- people on the pavements: a loop around a block near the player */
    const loops = [];
    for (const b of lay.blocks) {
      if (b.kind === 'park' || b.kind === 'field') continue;
      const c = Math.cos(b.ang), s = Math.sin(b.ang), at = (lx, lz) => [(b.x + lx * c + lz * s) * S, (b.z - lx * s + lz * c) * S];
      for (const inset of [.25, 0, -.35, -.7]) { // just inside the curb, else along it on the street side
        const hw = b.w / 2 - inset, hd = b.d / 2 - inset; if (hw < 1 || hd < 1) break;
        const pts = [at(-hw, -hd), at(hw, -hd), at(hw, hd), at(-hw, hd)];
        let good = 0, n = 0; for (let k = 0; k < 4; k++) { const A = pts[k], B = pts[(k + 1) % 4]; for (let t = 0; t < 1; t += .05) { n++; if (grid.allowed(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)) good++; } }
        if (good / n > .93) { let len = 0; for (let k = 0; k < 4; k++) len += Math.hypot(pts[(k + 1) % 4][0] - pts[k][0], pts[(k + 1) % 4][1] - pts[k][1]); loops.push({ pts, len, x: b.x * S, z: b.z * S }); break; }
      }
    }
    const SL = window.StreetLife, looks = SL?.walkers || [], walkers = [], pool = [];
    if (SL?.walker) for (let k = 0; k < MAX_WALKERS; k++) { const look = looks[k % Math.max(1, looks.length)] || {}; const m = SL.walker({ ...look, bag: k % 3 === 0 ? look.bag : null }); m.frustumCulled = true; m.visible = false; scene.add(m); pool.push(m); }
    function loopAt(L0, d) {
      d = ((d % L0.len) + L0.len) % L0.len;
      for (let k = 0; k < 4; k++) { const A = L0.pts[k], B = L0.pts[(k + 1) % 4], l = Math.hypot(B[0] - A[0], B[1] - A[1]); if (d <= l) { const t = d / l; return { x: A[0] + (B[0] - A[0]) * t, z: A[1] + (B[1] - A[1]) * t, ry: Math.atan2(B[0] - A[0], B[1] - A[1]) }; } d -= l; }
      return { x: L0.pts[0][0], z: L0.pts[0][1], ry: 0 };
    }
    function spawnWalker(p, minD, maxD) {
      if (!SL?.walker || !loops.length) return null;
      const near = loops.filter(l => { const d = Math.hypot(l.x - p.x, l.z - p.z); return d > minD && d < maxD; }); if (!near.length) return null;
      const loop = near[Math.floor(R() * near.length)];
      // a person from the pool made behind the loading cover (making one while walking - its body, skeleton and bone texture -
      // was a visible hitch): the pool is shuffled so the street does not repeat the same order
      if (!pool.length) return null; const m = pool.splice(Math.floor(R() * pool.length), 1)[0]; m.visible = true;
      return { m, loop, d: R() * loop.len, v: (.95 + R() * .45) * (R() < .5 ? 1 : -1), ph: R(), wait: 0 };
    }
    function updateWalkers(dt, p) {
      for (let i = walkers.length - 1; i >= 0; i--) { const w = walkers[i]; if (Math.hypot(w.x - p.x, w.z - p.z) > 95) { w.m.visible = false; pool.push(w.m); walkers.splice(i, 1); } }
      if (walkers.length < (opts.quality === 'low' ? 6 : MAX_WALKERS) && pool.length) { const w = spawnWalker(p, walkers.length < 3 ? 8 : 30, 80); if (w) walkers.push(w); }
      for (const w of walkers) {
        // a walker meeting the player steps aside (to the side away from the player) and slows; nobody blocks anybody
        const at0 = loopAt(w.loop, w.d), dir = Math.sign(w.v), fx = Math.sin(at0.ry) * dir, fz = Math.cos(at0.ry) * dir;
        const px = p.x - at0.x, pz = p.z - at0.z, along = px * fx + pz * fz, across = px * fz - pz * fx, near = Math.hypot(px, pz) < 2.4 && along > -.6;
        const want = near ? (across > 0 ? -.85 : .85) : 0; w.side = (w.side || 0) + (want - (w.side || 0)) * Math.min(1, dt * 4);
        const v = w.v * (near ? .55 : 1); w.d += v * dt; w.ph += Math.abs(v) * dt / (SL.WALK_STRIDE || 1.42);
        const q = loopAt(w.loop, w.d), qf = [Math.sin(q.ry) * dir, Math.cos(q.ry) * dir], ox = qf[1] * w.side, oz = -qf[0] * w.side;
        let x = q.x + ox, z = q.z + oz; if (!grid.allowed(x, z)) { x = q.x; z = q.z; }
        w.x = x; w.z = z;
        w.m.position.set(x, grid.allowed(x, z) ? grid.height(x, z) : landY, z); w.m.rotation.y = q.ry + (w.v < 0 ? Math.PI : 0) + w.side * .25 * dir;
        SL.walkPose(w.m, w.ph, 1);
      }
    }
    /* ---- pigeons: small flocks pecking on open pavement near the player; they burst up and away when the player comes close
     * (StreetLife's pigeon shapes and flight; three instanced meshes in all) */
    const FLOCKS = 3, PER = 6, NB = FLOCKS * PER, flocks = [], birds = [];
    let bodyM = null, wingM = [];
    if (SL?.birdGeometry && SL?.wingGeometry) {
      bodyM = new T.InstancedMesh(own(SL.birdGeometry()), own(new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 })), NB);
      const wm = own(new T.MeshStandardMaterial({ color: 0x7d8290, roughness: .85, side: T.DoubleSide }));
      wingM = [-1, 1].map(s => new T.InstancedMesh(own(SL.wingGeometry(s)), wm, NB));
      for (const m of [bodyM, ...wingM]) { m.frustumCulled = false; m.name = 'pigeons'; scene.add(m); }
      for (let i = 0; i < NB; i++) birds.push({ f: Math.floor(i / PER), dx: (R() - .5) * 1.8, dz: (R() - .5) * 1.2, ry: R() * 6.28, ph: R() * 10, a: (R() - .5) * 1.6, up: 1.4 + R(), out: 1.6 + R(), delay: R() * .25 });
    }
    function openSpot(p) { // a walkable, open spot (2 m around) 12-40 m from the player
      for (let k = 0; k < 40; k++) {
        const a = R() * 6.283, d = 12 + R() * 28, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if ([[0, 0], [1.6, 0], [-1.6, 0], [0, 1.2], [0, -1.2]].every(([u, v]) => grid.allowed(x + u, z + v))) return { x, z, y: grid.height(x, z), flushed: -1, t: 0 };
      }
      return null;
    }
    const Mb = new T.Matrix4(), Wb = new T.Matrix4(), Wt = new T.Matrix4(), Pb = new T.Vector3(), Eb = new T.Euler(), Qb = new T.Quaternion(), ONE = new T.Vector3(1, 1, 1), ZERO = new T.Matrix4().makeScale(0, 0, 0);
    function updateBirds(dt, p) {
      if (!bodyM) return;
      for (let f = 0; f < FLOCKS; f++) {
        let F = flocks[f];
        if (F) { F.t += dt; if (F.flushed < 0 && Math.hypot(F.x - p.x, F.z - p.z) < (SL.FLUSH || 2.6) + .6) { F.flushed = F.t; F.from = { x: p.x, z: p.z }; } }
        if (!F || Math.hypot(F.x - p.x, F.z - p.z) > 70 || (F.flushed >= 0 && F.t - F.flushed > 6)) { F = flocks[f] = openSpot(p); }
      }
      birds.forEach((b, i) => {
        const F = flocks[b.f]; let flap = 0;
        if (!F) { bodyM.setMatrixAt(i, ZERO); wingM[0].setMatrixAt(i, ZERO); wingM[1].setMatrixAt(i, ZERO); return; }
        const x0 = F.x + b.dx, z0 = F.z + b.dz, t = F.t, u = F.flushed < 0 ? -1 : t - F.flushed - b.delay;
        if (u < 0) { const pk = Math.max(0, Math.sin(t * 3.1 + b.ph)) ** 6; Pb.set(x0 + .08 * Math.sin(t * .4 + b.ph), F.y + .06, z0 + .06 * Math.cos(t * .33 + b.ph)); Eb.set(.5 * pk, b.ry + .4 * Math.sin(t * .25 + b.ph), 0); }
        else { const away = Math.atan2(x0 - F.from.x, z0 - F.from.z) + b.a, k = Math.min(u, 4.5); Pb.set(x0 + Math.sin(away) * (b.out * k + .4 * k * k), F.y + .06 + b.up * k + .25 * k * k, z0 + Math.cos(away) * (b.out * k + .4 * k * k)); Eb.set(-.5 * Math.min(1, u * 3), away, 0); flap = 1; }
        Qb.setFromEuler(Eb); Mb.compose(Pb, Qb, ONE); const gone = u > 4.5; bodyM.setMatrixAt(i, gone ? ZERO : Mb);
        const beat = flap ? Math.sin(time * 42 + b.ph) * 1.1 : 0;
        [-1, 1].forEach((s, w) => { Wb.makeRotationZ(s * -beat).premultiply(Wt.makeTranslation(s * .035, .045, 0)); const m = Mb.clone().multiply(Wb); wingM[w].setMatrixAt(i, gone || !flap ? ZERO : m); });
      });
      bodyM.instanceMatrix.needsUpdate = true; for (const w of wingM) w.instanceMatrix.needsUpdate = true;
    }

    let time = 0;
    /* ---- nothing is compiled, uploaded or allocated for the first time while walking: every program (the town's, the
     * Fighter's in every outfit piece, a walker's), every texture and every vertex buffer is made here, behind the walk's
     * loading cover: renderer.compile with the walk's lights, then one draw of everything into a one-pixel viewport. */
    function warm() {
      const t0 = performance.now(), saved = [], rig = window.app?.engine?.coach?.root, home = rig?.parent || null;
      if (rig && home !== scene) scene.add(rig);
      scene.traverse(o => { if (o.isLight || o === scene) return; saved.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; });
      const cam = new T.PerspectiveCamera(60, 1, .1, 3000); cam.position.set(0, 400, 1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
      try {
        renderer.compile(scene, cam);
        if (renderer.initTexture) scene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'envMap']) if (m[k]?.isTexture && !m[k].isRenderTargetTexture) renderer.initTexture(m[k]); });
        const vp = renderer.getViewport(new T.Vector4()); renderer.setViewport(0, 0, 1, 1); renderer.shadowMap.needsUpdate = true;
        try { renderer.render(scene, cam); } finally { renderer.setViewport(vp); }
      } catch (x) { console.warn('walk warm-up', x); }
      finally {
        for (const [o, v, f] of saved) { o.visible = v; o.frustumCulled = f; }
        if (rig && home !== scene) { if (home) home.add(rig); else scene.remove(rig); }
      }
      return Math.round(performance.now() - t0);
    }
    ms.warm = warm(); mark('total');
    function update(dt, p, camera) {
      time += dt;
      updateCars(dt, p); updateWalkers(dt, p); updateBirds(dt, p);
      if (lamp) lamp.position.set(p.x - 1.2, (grid.allowed(p.x, p.z) ? grid.height(p.x, p.z) : landY) + 4.2, p.z + 1.5);
      map.update(dt, camera, renderer);
      look?.update(dt, p, camera); places3d?.update(p, camera); dress?.update(p);
    }
    function snapshot() {
      return { cars: cars.map(c => ({ x: +(c.x ?? 0).toFixed(2), z: +(c.z ?? 0).toFixed(2), speed: +c.speed.toFixed(2), waiting: !!c.waiting })), walkers: walkers.length,
        grid: { nx: grid.nx, nz: grid.nz, cell: CELL, walkable: walk.reduce((n, v) => n + v, 0), pockets }, roads: { nodes: roads.nodes.length, edges: roads.edges.length }, loops: loops.length, look: look?.stats() || null, dressing: dress?.stats() || null, sets: places3d ? { built: places3d.sets.map(s => s.id), models: places3d.models } : null, tiles, flocks: flocks.filter(Boolean).map(F => ({ x: +F.x.toFixed(1), z: +F.z.toFixed(1), flushed: F.flushed >= 0 })), msHeight: Math.round(msHeight), build: { ...ms, start: undefined }, parked: !!parkedAt, map: map.stats() };
    }
    /* ---- the same town again in this session (owner: the walk is opened often): closing parks it (its GPU copies freed, the
     * built town kept in memory for a few minutes); opening with the same time of day, language and tier resumes it. */
    let parkedAt = 0;
    function park() {
      parkedAt = performance.now();
      try { look?.dispose(); } catch (x) { console.warn('walk look dispose', x); } look = null;
      try { dress?.dispose(); } catch (x) { console.warn('walk dressing dispose', x); } dress = null;
      const seen = new Set(); // GPU copies only: geometry, textures (the arrays and images stay; three uploads them again)
      scene.traverse(o => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap']) if (m[k]?.isTexture && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); } });
    }
    function resume() {
      const t0 = performance.now(); parkedAt = 0;
      try { look = Look?.attach({ renderer, scene, map, time: hour, tier }) || null; } catch (x) { console.warn('walk look', x); look = null; }
      try { dress = Sets?.dressing?.({ map, scene, city: window.CityAssets?.cached?.(['props'], false), time: hour, tier }) || null; } catch (x) { console.warn('walk dressing', x); dress = null; }
      ms.resumed = Math.round(performance.now() - t0); ms.warm = warm(); ms.resumeTotal = Math.round(performance.now() - t0);
    }
    function dispose() {
      for (const m of [...pool, ...walkers.map(w => w.m)]) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); m.skeleton?.dispose?.(); } walkers.length = 0; pool.length = 0;
      if (carMesh) { scene.remove(carMesh); carMesh.dispose?.(); }
      for (const m of [bodyM, ...wingM]) if (m) { scene.remove(m); m.dispose?.(); }
      try { look?.dispose(); } catch (x) { console.warn('walk look dispose', x); }
      try { dress?.dispose(); } catch (x) { console.warn('walk dressing dispose', x); }
      try { places3d?.dispose(); } catch (x) { console.warn('walk sets dispose', x); }
      for (const x of owned) x.dispose?.();
      for (const m of tileMeshes()) m.geometry.dispose();
      map.dispose();
    }
    const tileMeshes = () => map.group.children.filter(o => o.userData.tileOf);
    return { scene, map, grid, canopy, places, targets, roads, night, update, blocked, snapshot, dispose, park, resume, S, tier,
      views: places3d?.views || {}, look: () => look?.stats() || null, quality: level => look?.lock(level), settled: () => Promise.resolve(true) };
  }
  /** Builds the town; on any failure everything made so far is released and the error is passed on (the mode shows a notice). */
  let parked = null; // { key, town, timer }: the last town, kept for PARK_MS after the walk closed
  const PARK_MS = 180000;
  const smallDevice = () => (navigator.deviceMemory && navigator.deviceMemory < 4) || /[?&]gfx=low/.test(location.search);
  function drop() { if (!parked) return; clearTimeout(parked.timer); const t = parked.town; parked = null; try { t.destroy(); } catch (x) { console.warn('free walk town', x); } }
  function build(opts = {}) {
    const key = [opts.time, Core().langOf(opts.lang), opts.quality === 'low' ? 'low' : 'high'].join('|');
    if (parked && parked.key === key && parked.renderer === opts.renderer) { const t = parked.town; clearTimeout(parked.timer); parked = null; t.resume(); return t; }
    drop();
    const keep = {};
    let town;
    try { town = buildTown(opts, keep); } catch (x) { try { keep.dress?.dispose(); keep.look?.dispose(); keep.sets?.dispose(); keep.map?.dispose(); } catch { /* already gone */ } throw x; }
    // the mode calls dispose() when the walk closes: the town is parked instead (released for good later, or on a small device now)
    const destroy = town.dispose; town.destroy = destroy;
    town.dispose = () => {
      if (smallDevice() || town.tier === 'low') { destroy(); return; }
      drop(); town.park(); parked = { key, town, renderer: opts.renderer, timer: setTimeout(drop, PARK_MS) };
    };
    return town;
  }
  window.addEventListener?.('pagehide', drop);
  /** The films' kit and street models before a build (never longer than ms; a build without them uses the generated pieces). */
  // one wait shared by every caller of the same open: the mode starts it as the walk opens (with the map script's download)
  // and waits for it before the build, so the models load while the map script loads
  let preparing = null;
  const prepare = (ms = 6000) => { if (!window.FreeWalkSets) return Promise.resolve(false); if (!preparing) { preparing = window.FreeWalkSets.prepare(ms).finally(() => setTimeout(() => { preparing = null; }, 0)); } return preparing; };
  window.FreeWalkTown = { build, prepare, drop, S, CELL, BOUNDS, REACH, get parked() { return parked ? parked.key : null; } };
})();
