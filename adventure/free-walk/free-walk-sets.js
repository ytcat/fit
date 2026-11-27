/* Free walk story places (owner 2026-11-25: "This is definitely not how the city should look like, and it doesn't look like in
 * the video"). Where Chapter 1 happens, the walk town shows the films' street, built from the films' own pieces (StorySets
 * kit: houses, kerbs, paving, Blender props, lamps, trees, signs in the player's language, display windows, glazed doors;
 * CityAssets models: the Old Town houses, the bus shelter and stop, the street lamps, Hazel's fruit stall), fitted to the
 * town plan of the map (gloryland-map.js) so routes, districts and collision stay the town's:
 *   gym      Bruno's Gym on its Old Town block (door, sidelight, BRUNO'S GYM board, glove sign, displays, bench, planters),
 *            the bus stop on the same pavement (shelter, bench, stop sign, ticket machine), an Old Town house each side,
 *            a widened kerb with paving, lamps, a tree, bollards and a hydrant;
 *   market   Market Row round Mrs. Hazel's stall: two rows of the films' fruit stalls, her authored stall, crates, barrels,
 *            baskets, price boards, a hand cart, bunting, narrow street trees and lamps;
 *   otto     Otto's Corner on its Market Row block: the films' shop front (display windows, striped awning, door, OTTO'S
 *            CORNER board, BOXING blade sign);
 *   docks    the Dockside Hangar's quay door and The Basement's stairwell: crates, pallets, drums, rope, work lamps, a sign.
 * The map leaves out what a set replaces (GlorylandMap.build opts.skip: the generated piece goes to a throwaway batch, so the
 * rest of the town is unchanged).
 *
 *   FreeWalkSets.skip(x, z, kind, o, W)       the map's skip option (map units)
 *   FreeWalkSets.MODELS                       the CityAssets models the sets use (FreeWalkSets.prepare waits for them)
 *   FreeWalkSets.prepare(ms) -> Promise       the kit (StorySets.ready) and the models, at most ms
 *   FreeWalkSets.build({ map, scene, renderer, time, lang, tier, city }) -> { sets, views, discs, update(p, camera), stats(), dispose() }
 *     every set mesh a person cannot walk through has userData.fwSolid (the walk reads it into its height field)
 * World: metres, x east, z south, y up. Set frames: x along the street, +z toward the street (out of the building row). */
(() => {
  'use strict';
  const S = 3;
  const PUBLIC_ART = ['harborGull', 'ferrisWheel'];
  const MODELS = ['oldtown', 'station', 'hazelStall', 'props', 'marketProps', 'dockProps', 'stopProps'];
  // the films' sign words (dream-sets.js, market-sets.js, the map's SIGN_TEXT) in the player's language
  const WORDS = {
    "BRUNO'S GYM": { he: 'האולם של ברונו', ru: 'ЗАЛ БРУНО' }, "HAZEL'S FRUIT": { he: 'הפירות של הייזל', ru: 'ФРУКТЫ ХЕЙЗЕЛ' },
    "OTTO'S CORNER": { he: 'הפינה של אוטו', ru: 'УГОЛОК ОТТО' }, BOXING: { he: 'אגרוף', ru: 'БОКС' },
    'DOCKSIDE HANGAR': { he: 'ההאנגר בנמל', ru: 'АНГАР В ДОКАХ' }, 'THE BASEMENT': { he: 'המרתף', ru: 'ПОДВАЛ' },
    'CORNER COFFEE': { he: 'קפה פינתי', ru: 'КОФЕ НА УГЛУ' }, BAKERY: { he: 'מאפייה', ru: 'ПЕКАРНЯ' }
  };
  // modelled English lettering of the Old Town and stop models (merged into their own meshes): in Hebrew and Russian the
  // letters are hidden and the shop names are painted on a board in their place (the owner's rule: every text in every language)
  const LETTERING = /^(enamel lettering|shop lettering and brass)$/, SHOP_NAME = { OldTown_plaster_parapet: 'CORNER COFFEE', OldTown_brick_hiproof: 'BAKERY' };
  function relabel(c, root, lang, name) {
    if (lang === 'en') return;
    const hide = []; root.traverse(o => { if (o.isMesh && LETTERING.test(o.material?.name || '')) hide.push(o); });
    const text = SHOP_NAME[name]; let box = null;
    root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), v = new THREE.Vector3();
    for (const o of hide) {
      o.visible = false; if (!text) continue;
      const P = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); if (v.y < 2.1) continue; (box ||= new THREE.Box3()).expandByPoint(v); }
    }
    if (!text || !box) return;
    const w = Math.max(1.2, box.max.x - box.min.x + .2), h = Math.max(.32, box.max.y - box.min.y + .1);
    const tex = signTexture(word(text, lang), 1024, Math.max(96, Math.round(1024 * h / w)), '#2f4436', '#f1e6c8'), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .7 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); plane.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + .012); plane.name = 'shop name ' + text;
    root.add(plane); c.disposables.push(tex, mat, plane.geometry);
  }
  const word = (text, lang) => WORDS[text]?.[lang] || text;
  function signTexture(text, w, h, bg, fg) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = Math.max(4, h * .05); g.strokeRect(h * .06, h * .06, w - h * .12, h - h * .12);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = /[֐-׿]/.test(text) ? 'rtl' : 'ltr';
    g.font = `900 ${Math.round(h * .48)}px "Inter Display","Inter","Arial Black",Impact,system-ui,sans-serif`; g.fillText(text, w / 2, h / 2 + 3, w - h * .5);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  /** A painted board (the films' board()), in the player's language. */
  function board(c, lang, text, x, y, z, w, h, ry = 0, bg = '#141a26', fg = '#f4c152') {
    const tex = signTexture(word(text, lang), 1024, Math.max(96, Math.round(1024 * h / w)), bg, fg), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.name = 'sign ' + text;
    c.add(m, false, true); c.disposables.push(tex); m.userData.fwSolid = true; return m;
  }

  /* ------------------------------------------------------------ where the places are (from the map's own plan) */
  const gymBlock = W => (W.oldtown || W.blocks || []).find(b => b.kind === 'homegym');
  const local = (b, x, z) => { const dx = (x - b.x) * S, dz = (z - b.z) * S, c = Math.cos(b.ang), s = Math.sin(b.ang); return [dx * c - dz * s, dx * s + dz * c]; }; // map units -> block frame (metres)
  const marketUW = (mf, x, z) => { const dx = x - mf.o[0], dz = z - mf.o[1]; return [dx * mf.U[0] + dz * mf.U[1], dx * mf.Wv[0] + dz * mf.Wv[1]]; };
  const MARKET_U = [15.6, 28.4], OTTO_U = 44;
  /** GlorylandMap.build opts.skip: what the walk's sets replace (map units). */
  function skip(x, z, kind, o, W) {
    if (kind === 'homegym') return true;
    if (kind === 'building') {
      const b = gymBlock(W); if (b) { const [lx, lz] = local(b, x, z); if (Math.abs(lx) < 14.6 && lz > 0 && lz < 15) return true; } // the gym's pavement side
      const mf = W.marketFrame; if (mf) { const [u, w] = marketUW(mf, x, z); if (Math.abs(u - OTTO_U) < 1.4 && w > 5 && w < 10.5) return true; } // Otto's building
      return false;
    }
    if (kind === 'stall' || kind === 'umbrella' || kind === 'crate') {
      const mf = W.marketFrame; if (!mf) return false; const [u0, w0] = marketUW(mf, x, z), u = o?.u ?? u0, w = o?.w ?? w0;
      return (u > MARKET_U[0] && u < MARKET_U[1]) || ((w > .5 || kind === 'umbrella') && Math.abs(u - OTTO_U) < 4.6); // Hazel's stretch; the row's side in front of Otto's door
    }
    return false;
  }

  /** The sets' frames in the walk (metres): origin, turn (three.js rotation about y) and the ground height. */
  function frames(L) {
    const b = L.blocks.find(k => k.kind === 'homegym'), mf = L.marketFrame, out = {};
    const at = (u, w) => [(mf.o[0] + mf.U[0] * u + mf.Wv[0] * w) * S, (mf.o[1] + mf.U[1] * u + mf.Wv[1] * w) * S], mry = -Math.atan2(mf.U[1], mf.U[0]);
    if (b) out.gym = { x: b.x * S, z: b.z * S, ry: b.ang, y: L.blockY * S };
    out.market = { ...xz(at(22, 0)), ry: mry, y: L.blockY * S };
    out.otto = { ...xz(at(OTTO_U, 4.2)), ry: mry + Math.PI, y: L.blockY * S };
    const h = L.landmarks.hangar; if (h) out.docks = { x: h.x * S, z: (h.z + 5.6) * S, ry: 0, y: L.landY * S };
    out.basement = { x: 19.6 * S, z: (28.4 + 2.65) * S, ry: 0, y: L.landY * S };
    return out;
  }
  const xz = ([x, z]) => ({ x, z });
  const toWorld = (f, lx, lz) => { const c = Math.cos(f.ry), s = Math.sin(f.ry); return { x: f.x + lx * c + lz * s, z: f.z - lx * s + lz * c }; };

  /* ------------------------------------------------------------ models */
  function clone(gltf, name) {
    const src = gltf?.scene?.getObjectByName(name); if (!src) return null;
    const o = src.clone(true); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); return o;
  }
  const HOUSE_CAST = /brick|plaster|pan tiles|membrane/;
  function prepModel(gltf, renderer) {
    if (!gltf || gltf.userData.fwPrepped) return; gltf.userData.fwPrepped = true;
    const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    gltf.scene.traverse(o => { if (!o.isMesh) return; const m = o.material; m.envMap = null; for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) m[k].anisotropy = aniso; if (m.transparent) o.renderOrder = 2; m.needsUpdate = true; });
  }
  function disposeGPU(g) {
    if (!g) return; g.userData.fwPrepped = false; const seen = new Set();
    g.scene.traverse(o => {
      if (!o.isMesh) return; if (!seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      const m = o.material; if (seen.has(m)) return; seen.add(m);
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) if (m[k] && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); }
      m.dispose();
    });
  }

  /* ------------------------------------------------------------ the sets (StorySets kit, set-local metres) */
  let registered = false;
  function register() {
    const Sets = window.StorySets; if (!Sets || registered) return !!registered;
    registered = true;
    // a set's common pieces: an overhead batch (awnings, bunting, wires: left out of the walking surface), house LOD, models
    const extras = c => {
      const K = c.K, OV = new K.Batch(), lod = [], models = c.opts.fw || {};
      const overhead = () => { if (!OV.tris) return; const m = c.add(new THREE.Mesh(OV.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide })), true, true); m.name = 'overhead'; };
      /** An Old Town house model (front-centre at x, z; front toward +z), with its interior and trim shown near only. */
      const glbHouse = (name, x, z, ry = 0) => {
        const h = clone(models.city?.oldtown, name); if (!h) return false;
        h.traverse(o => { if (o.isMesh) { o.castShadow = HOUSE_CAST.test(o.material.name) && !o.material.transparent; o.receiveShadow = true; o.userData.fwSolid = !o.material.transparent; } });
        h.position.set(x, 0, z); h.rotation.y = ry; h.name = 'Old Town house ' + name; c.group.add(h); relabel(c, h, models.lang || 'en', name);
        const detail = [], trim = []; h.traverse(o => { if (!o.isMesh) return; const n = o.material.name; if (/interior|curtain|herbs|flowerpot|room plaster|lamp glow/.test(n)) detail.push(o); else if (/ivory timber|ironwork|zinc|shop timber/.test(n)) trim.push(o); });
        lod.push({ root: h, detail, trim, at: new THREE.Vector3(x, 3, z + 3) });
        return true;
      };
      const station = (name, x, z, ry = 0, cast = false) => {
        const o = clone(models.city?.station, name); if (!o) return null;
        o.traverse(m => { if (m.isMesh) { m.castShadow = typeof cast === 'function' ? cast(m) : cast; m.receiveShadow = true; m.userData.fwSolid = !m.material.transparent; } });
        o.position.set(x, 0, z); o.rotation.y = ry; o.name = 'stop ' + name; c.group.add(o); relabel(c, o, models.lang || 'en', name); return o;
      };
      c.objects.fwLod = lod; c.objects.fwStyles = () => Object.keys(K.FACADE).filter(s => c.W.facade[s].tris);
      return { OV, overhead, glbHouse, station, lang: models.lang || 'en', time: models.time };
    };
    const night = t => t === 'evening' || t === 'night';
    // kit pieces that turn: a rotation of the stall's own frame about y (0 or half a turn), never a mirror
    const rot = (ox, oz, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [ox + lx * c + lz * s, oz - lx * s + lz * c]; };

    /* ---------------- Old Town: Bruno's Gym block (frame: the gym's block, +z = the gym street; front line z 9.5) */
    Sets.register('walk_gym', c => {
      const { PAL, C, P, M, S: B, box, cyl, house, sign, lamp, bin, planter, bollard, tree, shade, joints } = c, X = extras(c), FZ = 9.5;
      // pavement: the block's pavement widened by 0.85 m over the road (to 13.6) with a kerb, slabs with joints up to the houses
      box(B, 0, -.152, 13.175, 28.5, .162, .85, '#c3bfb6'); box(B, 0, -.18, 13.48, 28.5, .19, .24, '#b9b4aa'); box(B, 0, -.151, 13.75, 28.5, .006, .3, '#4c5463');
      for (const s of [-1, 1]) box(B, s * 14.13, -.18, 13.18, .24, .19, .85, '#b9b4aa');
      box(B, 0, 0, 11.6, 28.5, .01, 4.0, '#c3bfb6'); box(B, -9.5, 0, 7.75, 6.5, .01, 3.5, '#c3bfb6');
      joints(-14, 14, FZ + .1, 13.5); joints(-12.6, -6.4, 6.1, FZ);
      // Bruno's Gym (the films' house and front, dream-sets.js), 11.8 m wide
      const gx = -.35, gz = FZ - .04;
      house({ style: 'brick', x: gx, z: FZ - 5.25, w: 11.8, d: 10.5, floors: 2, tint: '#c9653d', roof: 'flat', shop: true, shopTint: C('#f4e4c4') });
      box(B, gx, 0, gz, 1.66, 2.56, .14, '#3a2b24'); box(B, gx, .02, gz + .12, 1.3, 2.3, .07, '#6b4630'); c.doorInterior(gx, 1.25, gz + .156, .86, .8); c.reflectivePane('Bruno door glass', gx, 1.65, gz + .183, .86, .8, 1, .08);
      { const sx = gx - 1.25, sw = .8; box(B, sx, .28, gz + .06, sw + .1, 2.14, .04, '#3a2b24'); c.doorInterior(sx, .4, gz + .082, sw - .06, 1.92); c.reflectivePane('Bruno sidelight glass', sx, .4 + .96, gz + .1, sw - .06, 1.92, 1, .08); }
      box(B, gx, .25, gz + .17, .9, .7, .03, '#5a3a28'); box(B, gx + .48, 1.02, gz + .2, .06, .22, .07, '#e0b84d'); box(B, gx, 0, gz + .34, 2.1, .1, .62, '#cfc6b6'); box(B, gx, .1, gz + .54, 1.3, .02, .5, '#7a3b34');
      for (const s of [-1, 1]) { box(B, gx + s * 1.25, 2.25, gz + .14, .06, .06, .3, '#2f3640'); cyl(B, gx + s * 1.25, 1.92, gz + .34, .12, .3, '#fff0c4', P.cyl6); B.add(P.cone6, M(gx + s * 1.25, 2.22, gz + .34, .18, .14, .18), C('#2f3640')); }
      box(B, gx, 2.86, gz + .08, 4.6, 1.02, .1, '#0d1118'); X.OV.add(P.box, M(gx, 2.78, gz + .34, 4.9, .08, .5), C('#8f2f22')); box(B, gx, 3.9, gz + .1, 4.9, .08, .3, '#8f2f22');
      board(c, X.lang, "BRUNO'S GYM", gx + .55, 3.38, gz + .2, 3.3, .82); sign('gym', gx - 1.7, 3.38, gz + .2, 1.1, .82);
      box(B, gx - 3.4, 3.0, gz + .64, .05, .05, .9, '#2f3640'); box(B, gx - 3.4, 2.3, gz + .96, .06, .62, .7, '#0d1118'); sign('gym', gx - 3.365, 2.6, gz + .96, .66, .46, Math.PI / 2); sign('gym', gx - 3.435, 2.6, gz + .96, .66, .46, -Math.PI / 2);
      for (const side of [-1, 1]) c.displayBay(gx + side * 2.9, .32, gz + .16, 1.7, 1.7, 'gym', .30);
      for (const side of [-1, 1]) c.displayBay(gx + side * 4.75, .32, gz + .16, 1.5, 1.7, 'gym', .30);
      shade(gx + 3.3, gz + .9, 1.9, .8); if (!c.prop('Bench', gx + 3.3, 0, gz + .86)) { box(B, gx + 3.3, .4, gz + .8, 1.6, .06, .4, '#9a7350'); for (const d of [-.7, .7]) box(B, gx + 3.3 + d, 0, gz + .8, .06, .4, .36, '#3d4654'); }
      planter(gx - 2.2, gz + .9); planter(gx + 2.0, gz + .9);
      // east: an Old Town brick house (the opening film's model), a garden wall behind it; west: the bus stop before a plaster house
      if (!X.glbHouse('OldTown_brick_hiproof', 9.15, FZ)) house({ style: 'brick', x: 9.15, z: FZ - 3.2, w: 7.0, d: 6.4, floors: 3, tint: PAL.oldTown[3], roof: 'hip', roofColor: C(PAL.terracotta[2]), shop: true, awning: PAL.awning[4] });
      box(B, 12.62, 0, 1.1, .26, 2.3, 4.2, '#9a5a44'); box(B, 12.62, 2.3, 1.1, .34, .1, 4.3, '#b9ad98');
      if (!X.glbHouse('OldTown_plaster_parapet', -9.5, 6.0)) house({ style: 'plaster', x: -9.5, z: 2.8, w: 6.6, d: 6.4, floors: 2, tint: PAL.oldTown[0], roof: 'flat', shop: true, awning: PAL.awning[0] });
      const sx = -9.5, sz = 11.25;
      if (X.station('Shelter', sx, sz, 0, o => !o.material.transparent && /iron|steel/.test(o.material.name))) {
        X.station('Bench', sx - .05, sz - .35); X.station('Bus_stop_sign', sx + 3.12, sz + 1.57); X.station('Streetlamp', -13.0, 12.9); X.station('Litter_bin', -12.4, sz - .7);
      } else { // the films' generated stop (dream-sets.js)
        const z = sz + .45; c.shade(sx, z - .3, 4.6, 2.2);
        for (const x of [sx - 2.05, sx, sx + 2.05]) box(B, x, 0, z - .55, .09, 2.55, .09, '#3d4654');
        for (const x of [sx - 2.05, sx + 2.05]) box(B, x, 0, z + .75, .07, 2.5, .07, '#3d4654');
        X.OV.add(P.box, M(sx, 2.5, z + .1, 4.5, .09, 1.75), C('#2f5d8a'));
        box(B, sx, .32, z - .57, 4.0, 2.0, .04, '#bcd8e8'); for (const zz of [z - .1, z - .24, z - .38]) box(B, sx - .2, .45, zz, 2.9, .05, .11, '#9a7350');
        cyl(B, sx + 3.1, 0, z + 1.2, .05, 2.9, '#8f98a4', P.cyl6); B.add(P.cyl12, M(sx + 3.1, 2.62, z + 1.24, .36, .06, .36, 0, Math.PI / 2), C('#2f6fc0'));
        lamp(-13.0, 12.9); bin(-12.4, sz - .7);
      }
      c.shade(-6.9, 10.9, .9, .8); if (!c.prop('Ticket_machine', -6.9, 0, 10.9, 0)) { box(B, -6.9, 0, 10.9, .62, 1.55, .42, '#2f6fc0'); box(B, -6.9, 1.0, 11.12, .44, .3, .02, '#12151b'); }
      // street furniture along the kerb
      lamp(-4.6, 13.05); lamp(6.2, 13.05); tree(11.4, 12.35, 4.6, 'broad'); bin(5.1, 12.8); planter(-4.6, 10.0, 1.3);
      for (const x of [13.4, 13.9]) bollard(x, 12.9); bollard(-13.9, 13.2); c.prop('Hydrant', 4.2, 0, 13.05, 0);
      X.overhead();
      return { x: gx, z: 11, r: 14, time: night(X.time) ? 'evening' : undefined };
    });

    /* ---------------- Market Row round Mrs. Hazel's stall (frame: the market street, x along it, origin at her stall's aisle) */
    const FRUIT = ['#f08a3c', '#d9473b', '#7bc06b', '#f2c14e', '#8e5fa8', '#e84a3d', '#c9d65a'];
    const KIND = { '#f08a3c': 'oranges', '#d9473b': 'apples', '#e84a3d': 'apples', '#7bc06b': 'limes', '#f2c14e': 'lemons', '#8e5fa8': 'plums', '#c9d65a': 'pears' };
    const R = (i, a, b) => a + (b - a) * (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1);
    Sets.register('walk_market', c => {
      const { PAL, C, P, M, S: B, box, cyl, lamp, bin, planter, tree, shade } = c, X = extras(c), ZC = 4.65;
      /** One of the films' stalls (market-sets.js) at x, its counter centred ZC metres off the aisle on side s (-1 north, +1 south), facing the aisle. */
      const stall = (x, s, [a, b2], goods, w = 3.0) => {
        const ry = s < 0 ? 0 : Math.PI, to = rot(x, s * ZC, ry), q = (lx, y, lz) => { const [X0, Z0] = to(lx, lz); return [X0, y, Z0]; };
        const zb = -1.15, zf = .7, ya = 2.95, yf = 2.32, n = 8, c1 = C(a), c2 = C(b2), wood = '#8a6446';
        const [cx, cz] = to(0, 0);
        const modelled = c.prop('Stall_counter', cx, 0, cz, ry, w / 3);
        if (!modelled) {
          for (const sx of [-1, 1]) { const [px, pz] = to(sx * (w / 2 - .06), zb + .1); box(B, px, 0, pz, .08, ya, .08, wood); const [fx, fz] = to(sx * (w / 2 - .06), zf - .1); box(B, fx, 0, fz, .08, yf, .08, wood); }
          box(B, cx, 0, cz, w - .2, .86, 1.0, '#a97c55', ry, { ao: .3 }); box(B, cx, .86, cz, w, .06, 1.12, '#c29a6f', ry);
        }
        for (let k = 0; k < n; k++) {
          const x0 = -w / 2 - .15 + k * (w + .3) / n, x1 = x0 + (w + .3) / n, col = k % 2 ? c2 : c1, lo = col.clone().multiplyScalar(.82);
          X.OV.quad(q(x0, yf, zf), q(x1, yf, zf), q(x1, ya, zb), q(x0, ya, zb), col, lo);
          X.OV.tri(q(x0, yf, zf), q((x0 + x1) / 2, yf - .24, zf), q(x1, yf, zf), col, lo, col);
        }
        shade(cx, cz, w + .6, 2.4);
        goods.forEach((hex, i) => {
          const [gx, gz] = to(-w / 2 + .5 + i * ((w - 1) / Math.max(1, goods.length - 1)), .05);
          if (c.prop('Fruit_crate_' + (KIND[hex] || 'apples'), gx, modelled ? .915 : .92, gz, ry + R(i + x, -.1, .1))) return;
          box(B, gx, .92, gz, .62, .2, .78, '#9c7448', ry);
          for (let k = 0; k < 9; k++) B.add(P.ico1, M(gx - .2 + (k % 3) * .2, 1.13, gz - .2 + Math.floor(k / 3) * .2, .095, .1, .095, k), C(hex).multiplyScalar(R(k + i + x, .82, 1.12)));
        });
        // crates of fruit in front, on the aisle side
        for (const [lx, k] of [[-.8, 0], [-.2, 1], [.9, 2]]) { const [px, pz] = to(lx, 1.15 + (k % 2) * .1); if (!c.prop('Fruit_crate_' + (KIND[goods[k % goods.length]] || 'apples'), px, 0, pz, ry + R(k + x, -.4, .4), 1, .92)) box(B, px, 0, pz, .5, .3, .4, '#a97c55', ry); }
      };
      const AW = PAL.awning;
      [-16.5, -11, -5.5, 5.5, 11, 16.5].forEach((x, i) => stall(x, -1, AW[i % AW.length], [FRUIT[i % 7], FRUIT[(i + 2) % 7], FRUIT[(i + 4) % 7]], i % 3 === 1 ? 3.6 : 3.0));
      [-13.75, -8.25, -2.75, 2.75, 8.25, 13.75].forEach((x, i) => stall(x, 1, AW[(i + 3) % AW.length], [FRUIT[(i + 1) % 7], FRUIT[(i + 3) % 7], FRUIT[(i + 5) % 7]], i % 3 === 2 ? 3.6 : 3.0));
      // Mrs. Hazel's stall: the authored model (its chalk lettering in the player's language) or the films' generated one with her board
      const city = c.opts.fw?.city, art = window.CityAssets;
      if (city?.hazelStall && art) {
        c.objects.city = art.dress(c, { hazelStall: city.hazelStall }, []);
        const st = c.group.getObjectByName("Hazel's fruit stall"); if (st) { st.position.set(0, 0, -ZC - .15); st.updateMatrix(); st.traverse(o => { if (o.isMesh) { o.userData.fwSolid = !o.material.transparent; o.castShadow = true; } }); }
        shade(0, -ZC, 3.6, 2.4);
      } else {
        stall(0, -1, ['#4f8f5a', '#fff4e0'], ['#c9d65a', '#f2c14e', '#c9d65a'], 3.6);
        board(c, X.lang, "HAZEL'S FRUIT", 0, 2.62, -ZC + .73, 1.6, .3, 0, '#fff4e0', '#3c6b45');
      }
      // barrels and sacks, price boards, baskets, a hand cart (behind the stalls and at the row's ends: the aisle stays open)
      for (const [x, z] of [[-19.2, -3.2], [19.6, 3.4], [-8.3, -7.4], [6.9, 7.2]]) { if (!c.prop('Barrel', x, 0, z, x)) cyl(B, x, 0, z, .3, .8, '#8a5a38', P.cyl12); c.prop('Sack', x + .7, 0, z + .1, x); }
      for (const [x, z, ry] of [[-14.2, -2.9, .15], [3.6, -2.9, -.2], [-5.2, 2.9, Math.PI + .1], [12.0, 2.9, Math.PI]]) c.prop('Price_board', x, 0, z, ry);
      for (const [x, z, k] of [[-7.2, -2.8, 'apples'], [7.6, -2.9, 'pears'], [-11.0, 3.0, 'oranges']]) c.prop('Basket_' + k, x, 0, z, x);
      c.prop('Hand_cart', 19.4, 0, -2.4, -.4);
      // bunting across the row on posts by the house fronts
      const FLAG = ['#e8473b', '#f2b632', '#2fa59a', '#3c7fc0', '#d63d6d', '#fff4e0'];
      [-18, -6, 6, 18].forEach((x, i) => {
        const z0 = -10.6, z1 = 10.6, y0 = 4.9 + (i % 2) * .3, n = 18, wire = C('#2a2f38');
        for (let k = 0; k < n; k++) {
          const u0 = k / n, u1 = (k + 1) / n, pt = u => [x + (u - .5) * 1.6 * (i % 2 ? 1 : -1), y0 - Math.sin(u * Math.PI) * .9, z0 + (z1 - z0) * u], a = pt(u0), b2 = pt(u1);
          X.OV.quad(a, b2, [b2[0], b2[1] + .025, b2[2]], [a[0], a[1] + .025, a[2]], wire);
          const col = C(FLAG[(k + i) % FLAG.length]), m = pt((u0 + u1) / 2); X.OV.tri(a, [m[0], m[1] - .34, m[2]], b2, col); X.OV.tri(b2, [m[0], m[1] - .34, m[2]], a, col);
        }
        for (const z of [z0, z1]) cyl(B, x + .8 * (i % 2 ? 1 : -1) * (z > 0 ? 1 : -1), 0, z, .06, y0, '#3b4350', P.cyl6);
      });
      for (const [x, z, h] of [[-12, -8.9, 4.2], [12.5, -9.0, 4.4], [-6.8, 8.8, 4.3], [17.5, 8.9, 4.1]]) tree(x, z, h, 'upright');
      for (const [x, z] of [[-17.5, -11.2], [0, -11.2], [17.5, -11.2], [-9, 11.2], [9, 11.2]]) lamp(x, z);
      bin(-4.5, -9.6); bin(13.6, 9.6); planter(-15, 9.9, 1.6); planter(4.6, 10.0, 1.6); planter(10.5, -10.0, 1.3);
      X.overhead();
      return { x: 0, z: 0, r: 16, time: night(X.time) ? 'evening' : undefined };
    });

    /* ---------------- Otto's Corner (frame: the shop's front line on its Market Row block, +z toward the row) */
    Sets.register('walk_otto', c => {
      const { PAL, C, P, M, S: B, box, cyl, house, bin, planter, lamp, glow: G } = c, X = extras(c), fz = 0;
      house({ style: 'brick', x: 0, z: -9.8, w: 9.0, d: 19.6, floors: 2, tint: '#7c5a48', roof: 'flat', shop: true, shopTint: C('#efe3cc') });
      box(B, 0, 0, fz + .9, 10, .01, 1.8, '#c3bfb6'); c.joints(-4.5, 4.5, .1, 1.8);
      box(B, 0, 0, fz + .02, 7.4, 3.25, .1, '#1f3a4a');
      box(B, .9, 0, fz + .06, 1.18, 2.35, .08, '#2b2420'); box(B, .9, .04, fz + .1, .98, 2.22, .05, '#7a2f26'); box(B, 1.27, 1.0, fz + .16, .05, .16, .05, '#e0b84d');
      box(B, .9, 0, fz + .2, 1.4, .1, .5, '#b3a892'); c.reflectivePane('Otto door glass', .9, 1.60, fz + .153, .72, .90);
      const glassMat = new THREE.MeshStandardMaterial({ color: '#d6ecf5', roughness: .08, metalness: .25, transparent: true, opacity: .16, depthWrite: false });
      const GZ = fz + .44;
      for (const [wx, ww] of [[-1.85, 2.9], [2.75, 1.7]]) {
        box(B, wx, .55, fz + .08, ww, 1.85, .06, '#4a3a2e');
        box(B, wx, 2.08, fz + .12, ww - .14, .03, .14, '#8a6446'); if (ww > 2) box(B, wx, 1.12, fz + .12, ww - .14, .03, .14, '#8a6446');
        for (let k = 0; k < Math.floor(ww / .42); k++) box(B, wx - ww / 2 + .2 + k * .42, 2.11, fz + .12, .24, .16 + (k % 3) * .04, .12, ['#c9a46a', '#d9473b', '#e9e2cc', '#2f6fc0'][k % 4]);
        G.add(P.box, M(wx, 2.3, fz + .14, ww - .2, .025, .05), C('#ffe9b8'));
        for (const s of [-1, 1]) box(B, wx + s * (ww / 2 - .035), .55, (fz + .05 + GZ) / 2, .07, 1.85, GZ - fz - .05, '#3a2b24');
        box(B, wx, 2.32, (fz + .05 + GZ) / 2, ww, .08, GZ - fz - .05, '#3a2b24'); box(B, wx, .55, (fz + .05 + GZ + .04) / 2, ww + .1, .08, GZ + .04 - fz - .05, '#3a2b24');
        const glass = c.add(new THREE.Mesh(new THREE.PlaneGeometry(ww - .14, 1.69), glassMat), false, false); glass.position.set(wx, .63 + 1.69 / 2, GZ); glass.renderOrder = 2; glass.name = 'shop window glass';
      }
      for (let k = 0; k < 4; k++) { const gx = -3 + k * .72, col = ['#d9473b', '#2f6fc0', '#1d1f24', '#f4c152'][k]; for (const s of [-1, 1]) B.add(P.sph, M(gx + s * .12, 1.55 + (k % 2) * .18, fz + .16, .11, .14, .1), C(col)); cyl(B, gx, 1.72 + (k % 2) * .18, fz + .16, .006, .3, '#e9e2cc', P.cyl6); }
      cyl(B, 2.75, .7, fz + .2, .17, .95, '#2f6fc0', P.cyl12); cyl(B, 2.75, 1.65, fz + .2, .01, .55, '#aab2bc', P.cyl6);
      { const x0 = -3.6, x1 = 3.6, n = 14, zf2 = fz + 1.25, y0 = 2.85, y1 = 2.4; for (let k = 0; k < n; k++) { const a = x0 + (x1 - x0) * k / n, b2 = x0 + (x1 - x0) * (k + 1) / n, col = C(k % 2 ? '#fff4e0' : '#7a2f26'), lo = col.clone().multiplyScalar(.8); X.OV.quad([a, y1, zf2], [b2, y1, zf2], [b2, y0, fz + .1], [a, y0, fz + .1], col, lo); X.OV.add(P.box, M((a + b2) / 2, y1 - .2, zf2, b2 - a, .2, .02), C(k % 2 ? '#fff4e0' : '#7a2f26')); } }
      board(c, X.lang, "OTTO'S CORNER", 0, 3.45, fz + .1, 4.2, .62, 0, '#14202b', '#f4c152');
      box(B, 3.9, 2.95, fz + .1, .05, .05, .7, '#2f3640'); board(c, X.lang, 'BOXING', 3.9, 2.62, fz + .78, .7, .32, Math.PI / 2, '#7a2f26', '#fff4e0'); board(c, X.lang, 'BOXING', 3.9, 2.62, fz + .78, .7, .32, -Math.PI / 2, '#7a2f26', '#fff4e0');
      bin(4.4, .5); planter(-4.0, .5, 1.3); lamp(-4.9, 1.6);
      X.overhead();
      return { x: 0, z: 2, r: 12, time: night(X.time) ? 'evening' : undefined };
    });

    /* ---------------- The Docks: the hangar's quay door (frame: the door, +z toward the quay) */
    Sets.register('walk_docks', c => {
      const { C, P, M, S: B, box, cyl, shade, glow: G, pool } = c, X = extras(c), lit = night(X.time);
      // the hangar's front (the map's barrel vault is open at its ends: seen from the quay it showed the dark inside of the
      // vault): a corrugated gable with the big quay door, the hall behind it (floor, walls, roof, crates, the sodium lamps)
      { const R = 14.4, H0 = 4.2, H1 = 11.8, DW = 7.8, DH = 9.6, sh = new THREE.Shape();
        sh.moveTo(-R, 0); sh.lineTo(-DW, 0); sh.lineTo(-DW, DH); sh.lineTo(DW, DH); sh.lineTo(DW, 0); sh.lineTo(R, 0); sh.lineTo(R, H0);
        for (let k = 1; k <= 24; k++) { const a = k / 24 * Math.PI; sh.lineTo(R * Math.cos(a), H0 + H1 * Math.sin(a)); }
        sh.lineTo(-R, 0);
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 4; const g = cv.getContext('2d'); for (let x = 0; x < 64; x++) { const v = 150 + 50 * Math.cos(x / 64 * Math.PI * 4); g.fillStyle = `rgb(${v | 0},${v + 12 | 0},${v + 22 | 0})`; g.fillRect(x, 0, 1, 4); }
        const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8; c.disposables.push(tex);
        const wall = c.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ map: tex, color: '#9fb0bc', roughness: .55, metalness: .35, side: THREE.DoubleSide })));
        wall.position.set(0, 0, -.12); wall.name = 'hangar gable'; wall.userData.fwSolid = true;
        box(B, 0, DH, -.05, DW * 2 + .5, .35, .3, '#5f6b74'); for (const s2 of [-1, 1]) box(B, s2 * (DW + .1), 0, -.05, .3, DH, .3, '#5f6b74'); // door frame
        for (const s2 of [-1, 1]) { box(B, s2 * (DW + 3.4), 0, .12, 6.4, DH + .3, .16, '#c8452f'); for (let k = 0; k < 7; k++) box(B, s2 * (DW + .5 + k * .95), .2, .22, .06, DH - .2, .04, '#a8392a'); box(B, s2 * (DW + 3.4), DH + .3, .1, 6.6, .12, .3, '#3b4350'); } // the slid-open door leaves on their rail
        // the hall is in the vault's shade: light walls and floor (corrugated sheet, concrete) so it reads as a hall, not a hole
        const D = 9; box(B, 0, -.02, -D / 2 - .1, DW * 2, .03, D, '#9a958a'); box(B, 0, 0, -D - .2, DW * 2, DH, .2, lit ? '#6a5e52' : '#a9b3bb'); box(B, 0, DH, -D / 2 - .1, DW * 2, .2, D, '#7d858c');
        for (const s2 of [-1, 1]) box(B, s2 * DW, 0, -D / 2 - .1, .2, DH, D, '#9aa5ae');
        for (let k = -3; k <= 3; k++) box(B, k * 2.2, 0, -D - .05, .12, DH, .12, '#6f7a83'); // the back wall's frame
        for (const x of [-6.6, 6.6]) for (let k = 0; k < 3; k++) box(B, x, 2.2 + k * 2.4, -D - .02, 1.2, .9, .05, lit ? '#f0c070' : '#dfe9ef'); // high windows
        for (const [x, z, n] of [[-5.6, -6.5, 2], [-4.6, -7.4, 1], [5.2, -6.8, 2], [6.2, -5.2, 1]]) for (let k = 0; k < n; k++) c.prop('Dock_crate', x + k * .2, k * .72, z, k * .3) || box(B, x, k * .72, z, .9, .7, .9, '#8a6a48');
        for (const x of [-4.5, 0, 4.5]) { cyl(B, x, DH - 1.6, -4.5, .02, 1.4, '#2a2d33', P.cyl6); G.add(P.box, M(x, DH - 1.75, -4.5, .5, .12, .5), C(lit ? '#ffb45a' : '#c9b48a')); if (lit) pool(x, -4.5, 3.2, '#ff9c40'); }
        for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; box(B, 2.4 * Math.cos(a), -.005, -5.6 + 2.4 * Math.sin(a), .55, .012, .12, '#e0b84d', -a); } // the painted circle on the hall floor (the films' fight venue)
      }
      const put = (name, x, z, ry = 0, y = 0, s = 1) => c.prop(name, x, y, z, ry, 1, s) || (box(B, x, y, z, .9 * s, .7 * s, .9 * s, '#8a6a48', ry), false);
      for (const [x, z, ry] of [[-11.5, 2.2, .1], [-10.4, 2.4, -.2], [-11.1, 3.4, .3]]) put('Pallet', x, z, ry);
      for (const [x, z, ry, y] of [[-11.5, 2.2, .1, .14], [-10.6, 2.3, -.15, .14], [-11.1, 2.25, .05, .86], [-12.6, 3.6, .4, 0], [-9.3, 4.1, -.3, 0]]) put('Dock_crate', x, z, ry, y);
      put('Cargo', -11.1, 3.4, .3, .14);
      for (const [x, z, k] of [[9.2, 2.0, 'rust'], [9.9, 2.4, 'blue'], [9.4, 2.9, 'red'], [10.6, 1.9, 'rust'], [10.4, 3.1, 'green']]) put('Oil_drum_' + k, x, z, x);
      put('Rope_coil', 7.4, 4.0, .6); put('Rope_coil', -7.8, 4.4, -.2);
      // work lamps on posts each side of the door (the hangar's sodium light)
      for (const s of [-1, 1]) {
        const x = s * 8.7; cyl(B, x, 0, .9, .07, 3.1, '#3b4350', P.cyl8); box(B, x, 3.05, .9, .5, .06, .1, '#3b4350');
        if (!c.prop('Work_lamp', x, 3.1, 1.0, s * .4)) box(B, x, 2.9, 1.0, .3, .2, .3, '#2a2d33');
        G.add(P.box, M(x, 2.92, 1.08, .26, .06, .2), C('#ffcf8a')); if (night(X.time)) pool(x * .8, 2.6, 3.4, '#ffbf70');
      }
      board(c, X.lang, 'DOCKSIDE HANGAR', 0, 10.55, .14, 6.2, .95, 0, '#1d2430', '#f4c152');
      shade(0, 2.4, 9, 4);
      X.overhead();
      return { x: 0, z: 3, r: 12, time: night(X.time) ? 'evening' : undefined };
    });
    Sets.register('walk_basement', c => {
      const { C, P, M, S: B, box, cyl, glow: G } = c, X = extras(c);
      for (const [x, z, k] of [[-4.6, 2.6, 'rust'], [-5.2, 3.2, 'red'], [-4.2, 3.4, 'blue']]) c.prop('Oil_drum_' + k, x, 0, z, x);
      for (const [x, z, ry, y] of [[4.8, 2.4, .2, 0], [5.6, 2.9, -.3, 0], [5.1, 2.6, .1, .72]]) if (!c.prop('Dock_crate', x, y, z, ry)) box(B, x, y, z, .9, .7, .9, '#8a6a48', ry);
      cyl(B, -3.2, 0, .5, .06, 2.8, '#3b4350', P.cyl8); if (!c.prop('Work_lamp', -3.2, 2.8, .6, .3)) box(B, -3.2, 2.7, .6, .3, .2, .3, '#2a2d33'); G.add(P.box, M(-3.2, 2.62, .68, .24, .06, .2), C('#ff6a5a'));
      board(c, X.lang, 'THE BASEMENT', 0, 2.25, .16, 2.4, .42, 0, '#1a0d10', '#ff4b5c');
      X.overhead();
      return { x: 0, z: 3, r: 10, time: night(X.time) ? 'evening' : undefined };
    });
    return true;
  }

  /** The kit and the models the sets use: never longer than ms (what is not ready is built from the films' generated pieces,
   * and a later walk uses the models once they are cached). */
  function prepare(ms = 6000) {
    const kit = window.StorySets?.ready ? window.StorySets.ready().catch(() => null) : Promise.resolve(null);
    const models = window.CityAssets?.ready ? window.CityAssets.ready(ms, [...MODELS, ...PUBLIC_ART]).catch(() => null) : Promise.resolve(null);
    return Promise.race([Promise.all([kit, models, window.FreeWalkContainerDetail?.prepare(), window.FreeWalkHarborDetail?.prepare(ms)]), new Promise(r => setTimeout(r, ms + 500))]).then(() => true, () => false);
  }

  /** Builds the story places into the walk scene. */
  function build({ map, scene, renderer, time = 'morning', lang = 'en', tier = 'high' } = {}) {
    const Sets = window.StorySets; if (!Sets || !window.GlorylandMap?.kit || !register()) return null;
    const city = window.CityAssets?.cached ? window.CityAssets.cached(MODELS) : {};
    if (tier === 'low') { city.oldtown = null; city.station = null; } // the light path: generated houses and stop (the films' fallback pieces)
    for (const g of Object.values(city)) if (g?.scene) prepModel(g, renderer);
    const F = frames(map.layout), sets = [], views = {}, discs = [], used = new Set(Object.values(city).filter(Boolean));
    const fw = { city, lang, time };
    const tmp = new THREE.Scene();
    for (const [id, f] of Object.entries(F)) {
      let set;
      try { set = Sets.build('walk_' + id, tmp, { renderer, shadows: true, city, fw }); } catch (x) { console.warn('walk set', id, x); continue; }
      // the walk has its own light: the set's sun, sky light and ambient go
      for (const o of [...set.group.children]) if (o.isLight || o === set.sun?.target) set.group.remove(o);
      const g = set.group; g.position.set(f.x, f.y, f.z); g.rotation.set(0, f.ry, 0); g.updateMatrix(); g.matrixAutoUpdate = false; g.name = 'walk set ' + id;
      // walkable surfaces and walls (not leaves, glass, light, wires or awnings)
      g.traverse(o => { if (!o.isMesh) return; const n = o.name || ''; if (o.userData.fwSolid === undefined) o.userData.fwSolid = !/leaves|glass|glow|light pools|overhead|panes|sheen|contact shade|leaf/.test(n) && !o.material?.transparent && !o.material?.blending; });
      // window depth on the set's facades (the same as the town's)
      const styles = set.objects.fwStyles?.() || [], houses = g.children.find(o => o.name === 'houses (map pieces)');
      if (houses && renderer?.capabilities?.isWebGL2 !== false && tier !== 'low') houses.children.slice(1).forEach((m, i) => { if (styles[i] && m.material) window.FreeWalkLook?.relief(m.material, styles[i], S); });
      const fronts = (id === 'gym' || id === 'market') ? window.CityStorefronts?.build({ lang, tier, section: id }) : null;
      if (fronts) g.add(fronts.group);
      scene.add(g);
      sets.push({ id, set, fronts, frame: f, centre: new THREE.Vector3(f.x, f.y, f.z), lod: set.objects.fwLod || [] });
    }
    // QA / story views: where to stand and which way the camera looks (yaw: the camera's side of the player)
    const v = (name, id, lx, lz, turn = 0) => { const f = F[id]; if (!f) return; const p = toWorld(f, lx, lz); views[name] = { x: p.x, z: p.z, yaw: f.ry + turn }; };
    v('gym', 'gym', -.35, 12.2); v('busstop', 'gym', -9.0, 13.1, .25); v('market', 'market', 0, 1.0); v('otto', 'otto', .9, 2.6); v('docks', 'docks', 2.5, 4.2, .45); v('basement', 'basement', 0, 4.0);
    // trunks and posts are thin: they block the walk as discs
    const disc = (id, lx, lz, r) => { const f = F[id]; if (!f) return; const p = toWorld(f, lx, lz); discs.push([p.x, p.z, r]); };
    for (const [x, z] of [[-4.6, 13.05], [6.2, 13.05], [-13.0, 12.9]]) disc('gym', x, z, .25); disc('gym', 11.4, 12.35, .45);
    for (const [x, z] of [[-17.5, -11.2], [0, -11.2], [17.5, -11.2], [-9, 11.2], [9, 11.2]]) disc('market', x, z, .25);
    for (const [x, z] of [[-12, -8.9], [12.5, -9.0], [-6.8, 8.8], [17.5, 8.9]]) disc('market', x, z, .4);
    for (const x of [-18, -6, 6, 18]) for (const z of [-10.6, 10.6]) disc('market', x + .8 * (Math.abs(x) === 6 ? 1 : -1) * Math.sign(z), z, .2);
    disc('otto', -4.9, 1.6, .25); for (const s of [-1, 1]) disc('docks', s * 8.7, .9, .25); disc('basement', -3.2, .5, .2);
    const V = new THREE.Vector3();
    function update(p, camera) {
      for (const s of sets) {
        const d = Math.hypot(p.x - s.frame.x, p.z - s.frame.z); s.set.group.visible = d < 260;
        if (!s.set.group.visible || !camera) continue;
        s.fronts?.update(p, camera);
        for (const h of s.lod) { V.copy(h.at).applyMatrix4(s.set.group.matrixWorld); const dd = camera.position.distanceTo(V); for (const m of h.detail) m.visible = dd < 16; for (const m of h.trim) m.visible = dd < 26; }
      }
    }
    function stats() { const out = {}; for (const s of sets) out[s.id] = s.set.stats(); return out; }
    function dispose() { for (const s of sets) { scene.remove(s.set.group); try { s.fronts?.dispose(); s.set.dispose(); } catch (x) { console.warn('walk set dispose', x); } } sets.length = 0; for (const g of used) disposeGPU(g); }
    // road paint the sets cover (a crossing painted across Market Row's aisle): { x, z, ry, hw, hd } metres
    const marks = F.market ? [{ x: F.market.x, z: F.market.z, ry: F.market.ry, hw: 20, hd: 9.5 }] : [];
    // map pieces the sets stand in for, cut out above the ground: the hangar's end (its closing face was dark from the quay: it
    // faced into the hall), its door quad, side doors and sign at the quay end (the docks set has the gable, door and sign)
    const cuts = F.docks ? [{ x: F.docks.x, z: F.docks.z, ry: 0, hw: 15, hd: .45, yMin: F.docks.y + .3 }] : [];
    return { sets, views, discs, marks, cuts, update, stats, dispose, frames: F, models: Object.fromEntries(Object.entries(city).map(([k, g]) => [k, !!g])) };
  }

  /** The town's own street trees and lamps near the player, in the films' detail (city-trees.js trees, the Blender street
   * lamp): the nearest ones (within `reach` m, at most MAX of each) are drawn as instances of the detailed pieces and their
   * low map copies are hidden; the rest of the town keeps the map's. Refreshed when the player has moved a few metres.
   * Positions, trunks and collision are the map's (nothing moves). */
  function dressing({ map, scene, city, time = 'morning', tier = 'high', reach = 64 } = {}) {
    if (tier === 'low' || !window.CityTrees) return null;
    const L = map.layout, inst = L.inst || {}, made = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), SC = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    const kinds = [];
    const hash = (x, z) => Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    const mf = L.marketFrame, inMarket = (x, z) => { const [u, w] = marketUW(mf, x / S, z / S); return u > -6 && u < 56 && Math.abs(w) < 16; };
    /** One kind: the map's instanced mesh `src` and its list, drawn near by `parts` [{ geometry, material }] instanced. */
    function kind(src, parts, place, MAX) {
      if (!src?.mesh || !src.list?.length || !parts.length) return;
      const orig = src.list.map((o, i) => { const m = new THREE.Matrix4(); src.mesh.getMatrixAt(i, m); return m; });
      // positions and the detailed piece's turn and size, worked out once (the refresh only measures distances)
      const xs = new Float32Array(src.list.length), zs = new Float32Array(src.list.length), q = src.list.map((o, i) => { xs[i] = o.x * S; zs[i] = o.z * S; return orig[i].elements[0] !== 0 ? place(o, xs[i], zs[i]) : null; });
      const meshes = parts.map(({ geometry, material, cast = true, before }) => { const im = new THREE.InstancedMesh(geometry, material, MAX); im.count = 0; im.frustumCulled = false; im.castShadow = cast; im.receiveShadow = true; im.name = 'street detail'; if (before) im.onBeforeRender = before; scene.add(im); made.push(im); return im; });
      kinds.push({ src, orig, meshes, xs, zs, q, MAX, shown: new Set() });
    }
    // trees: the Old Town shade tree, Market Row's narrow tree (by district, as on the map)
    for (const form of ['broad', 'upright']) {
      const T = window.CityTrees.template(form), wood = window.CityTrees.mesh(T.wood, 'tree wood', 'wood'), leaf = window.CityTrees.mesh(T.leaf, 'tree leaves', 'leaf');
      const up = form === 'upright';
      kind(inst.trees, [{ geometry: wood.geometry, material: wood.material }, { geometry: leaf.geometry, material: leaf.material, before: leaf.onBeforeRender }],
        (o, x, z) => (inMarket(x, z) === up) ? { s: (o.s || 1) * (up ? 1.75 : 1.6) * (.92 + .16 * hash(x, z)), ry: hash(z, x) * 6.283, sx: .84 + .33 * hash(x + 4, z), sy: .90 + .23 * hash(x, z + 7) } : null, up ? 14 : 22);
    }
    // street lamps: the Blender lamp (street-props.py); lantern glass lit at dusk and at night
    const kit = window.CityAssets?.propKit?.(city), lampParts = kit?.get('Lamp');
    if (lampParts) {
      const lit = time === 'evening' || time === 'night', parts = [];
      const mats = { matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), gloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .42 }), glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
        lantern: lit ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) : new THREE.MeshStandardMaterial({ color: '#c9d4d6', roughness: .2 }) };
      for (const [cls, q] of Object.entries(lampParts)) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(q.p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(q.n, 3)); g.setAttribute('color', new THREE.BufferAttribute(q.c, 3)); g.computeBoundingSphere();
        parts.push({ geometry: g, material: mats[cls] || mats.matte, cast: cls === 'matte' });
      }
      made.push(...Object.values(mats).map(m => ({ dispose: () => m.dispose() })));
      kind(inst.lamps, parts, o => ({ s: 1, ry: (o.ry || 0) + Math.PI / 2 }), 32);
    }
    let at = null, turn = 0;
    function update(p) {
      // one kind a frame (trees, then the other trees, then lamps), after every 6 m walked: no frame does it all
      if (turn === 0) { if (at && Math.hypot(p.x - at.x, p.z - at.z) < 6) return; at = { x: p.x, z: p.z }; }
      const k = kinds[turn]; turn = (turn + 1) % Math.max(1, kinds.length); if (!k) return;
      {
        const near = [], r2 = reach * reach, list = k.src.list;
        for (let i = 0; i < list.length; i++) { if (!k.q[i]) continue; const dx = k.xs[i] - at.x, dz = k.zs[i] - at.z, d2 = dx * dx + dz * dz; if (d2 < r2) near.push({ i, d: d2, x: k.xs[i], y: (list[i].y || 0) * S, z: k.zs[i], q: k.q[i] }); }
        near.sort((a, b) => a.d - b.d); near.length = Math.min(near.length, k.MAX);
        const now = new Set(near.map(n => n.i));
        for (const i of k.shown) if (!now.has(i)) k.src.mesh.setMatrixAt(i, k.orig[i]);
        near.forEach((n, j) => { k.src.mesh.setMatrixAt(n.i, ZERO); M4.compose(P.set(n.x, n.y, n.z), Q.setFromEuler(E.set(0, n.q.ry, 0)), SC.set(n.q.s * (n.q.sx || 1), n.q.s * (n.q.sy || 1), n.q.s / (n.q.sx || 1) ** .35)); for (const m of k.meshes) m.setMatrixAt(j, M4); });
        for (const m of k.meshes) { m.count = near.length; m.instanceMatrix.needsUpdate = true; }
        k.src.mesh.instanceMatrix.needsUpdate = true; k.shown = now;
      }
    }
    function dispose() { for (const k of kinds) { for (const i of k.shown) k.src.mesh.setMatrixAt(i, k.orig[i]); k.src.mesh.instanceMatrix.needsUpdate = true; } for (const m of made) { if (m.isObject3D) { scene.remove(m); m.geometry?.dispose(); m.material?.dispose?.(); } else m.dispose(); } }
    const stats = () => kinds.map(k => ({ kind: k.src.mesh.name, shown: k.shown.size }));
    return { update, dispose, stats };
  }

  window.FreeWalkSets = { skip, frames, prepare, build, dressing, register, MODELS, PUBLIC_ART, WORDS };
})();
