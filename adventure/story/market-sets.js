/* Sets and props of Chapter 1 beats 6-7 (GOTR-0096), registered in StorySets like dream-sets.js. PLACEHOLDERS: Codex will
 * deliver the market and the shop sets (assets/street/); these are built from the same kit (map houses, merged vertex-coloured
 * props, one draw call per batch) and can be swapped for the models without touching the scene scripts (market-core.js).
 *   'dream_market'  Market Row by day: fruit stalls with striped awnings and crates of fruit along the back (z -2.3 .. -4.1),
 *                   Mrs. Hazel's pear stall at x 0, bunting across the row, shop houses behind, a few stall keepers.
 *                   The walking lane is z -1 .. 2 along x.
 *   'dream_shop'    Otto's Corner. The street front at x -12 .. 12 (door at x 0.9, the shop front at z -4.4, the pavement up
 *                   to z 0, the road beyond) and the interior at x 36 .. 44.4, z -3.2 .. 3.6: counter, glove wall, bags on
 *                   chains, shelves, the new heavy bag on display (objects.display = where its middle hangs).
 * MarketProps.create({ scene, set, rigs, carry }) -> { reach(actorId, t), frame(t), dispose() }: the handbag, the reward pouch
 *   and the new heavy bag of the scene scripts (carry), moved between hands, the ground, the display and the Fighter's shoulder.
 * World: metres, y up, the camera side is +z. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  // Shop signs in the player's language (owner rule 2026-11-23), painted when the set is built.
  const SIGN_WORDS = { "HAZEL'S FRUIT": ['הפירות של הייזל', 'ФРУКТЫ ХЕЙЗЕЛ'], "OTTO'S CORNER": ['הפינה של אוטו', 'УГОЛОК ОТТО'], 'BOXING': ['אגרוף', 'БОКС'], "OTTO'S CORNER · EST. 1979": ['הפינה של אוטו · מאז 1979', 'УГОЛОК ОТТО · С 1979'] };
  const signWord = text => { const t = SIGN_WORDS[text], l = (['he', 'ru'].includes(window.app?.lang) ? window.app.lang : 'en'); return t && l === 'he' ? t[0] : t && l === 'ru' ? t[1] : text; };
  function signTexture(text, w = 512, h = 128, bg = '#1d2b3a', fg = '#f4c152', font = 900) {
    text = signWord(text);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = Math.max(4, h * .05); g.strokeRect(h * .06, h * .06, w - h * .12, h - h * .12);
    g.fillStyle = fg; g.textAlign = 'center'; g.direction = /[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr'; g.textBaseline = 'middle'; g.font = `${font} ${Math.round(h * .46)}px "Inter Display","Inter","Arial Black",Impact,system-ui,sans-serif`; g.fillText(text, w / 2, h / 2 + 3, w - h * .5);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function board(c, text, x, y, z, w, h, ry = 0, colors = []) {
    const tex = signTexture(text, 512, Math.max(64, Math.round(512 * h / w)), ...colors), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; c.add(m, false, true); c.disposables.push(tex); return m;
  }
  const R = (i, a, b) => a + (b - a) * (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1); // repeatable scatter
  const FRUIT = ['#f08a3c', '#d9473b', '#7bc06b', '#f2c14e', '#8e5fa8', '#e84a3d', '#c9d65a'];

  function register() {
    const Sets = window.StorySets; if (!Sets || Sets.ids().includes('dream_market')) return;

    /* ------------------------------------------------------------ Market Row by day */
    Sets.register('dream_market', c => {
      const { PAL, C, P, M, S, box, cyl, house, pave, tree, bin, planter, shade, objects } = c;
      pave(-48, 48, -14, 14, PAL.pave2);
      for (let x = -40; x < 40; x += 1.1) for (let z = -2.2; z < 7; z += 1.1) { const k = Math.round(x * 7 + z * 13); if (k % 3 === 0) box(S, x + .5, -.004, z + .5, .95, .01, .95, k % 2 ? '#cdbfa7' : '#c4b499'); } // worn cobbles
      box(S, 0, -.002, -2.0, 96, .008, .14, '#a8987f'); box(S, 0, -.002, 2.6, 96, .008, .14, '#a8987f'); // drain lines along the row
      // houses: shop fronts behind the stalls, the other side behind the camera
      const row = [['plaster', 10, 3, 0, 0], ['brick', 9, 2, 3, 2], ['plaster', 11, 3, 1, 1], ['brick', 8, 3, 6, 4], ['plaster', 10, 2, 4, 3], ['apartment', 11, 3, 0, 0], ['plaster', 9, 3, 2, 5], ['brick', 10, 2, 5, 2], ['plaster', 10, 3, 1, 3]];
      let hx = -46; row.forEach(([style, w, floors, tint, roofC], i) => { house({ style, x: hx + w / 2, z: -10.4, w, d: 10, floors, tint: style === 'apartment' ? PAL.apartment[1] : PAL.market[tint % PAL.market.length], roof: style === 'apartment' ? 'flat' : 'hip', roofColor: C(PAL.terracotta[roofC]), shop: i % 3 !== 2, awning: PAL.awning[(i + 1) % 6] }); hx += w; });
      hx = -40; [['plaster', 12, 2, 2], ['brick', 14, 3, 5], ['plaster', 12, 2, 1], ['brick', 13, 3, 3], ['plaster', 12, 2, 6], ['plaster', 12, 3, 4]].forEach(([style, w, floors, tint], i) => { house({ style, x: hx + w / 2, z: 15.5, w, d: 10, floors, tint: PAL.market[tint % PAL.market.length], roof: 'hip', roofColor: C(PAL.terracotta[i % 6]), ry: Math.PI, shop: i % 2 === 0, awning: PAL.awning[i % 6] }); hx += w; });
      c.skyline(-46); c.plinth(-48, 48, -5.32);
      // Framed shop displays behind the market lane. The window backs are solid so
      // the existing map façades never reveal an unbuilt interior or the sky.
      for (const x of [-8.35, -2.74, 3.40, 8.15]) c.displayBay(x, .45, -5.27, 1.65, 1.72);

      // a stall: posts, counter with a skirt, striped awning with a scalloped valance, crates of fruit on the counter
      const stall = (x, [a, b], goods, w = 3.0, own) => {
        const zb = -4.3, zf = -2.45, ya = 2.95, yf = 2.32, n = 8, c1 = C(a), c2 = C(b), wood = '#8a6446';
        for (const sx of [-1, 1]) { box(S, x + sx * (w / 2 - .06), 0, zb + .1, .08, ya, .08, wood); box(S, x + sx * (w / 2 - .06), 0, zf - .1, .08, yf, .08, wood); }
        box(S, x, 0, -3.15, w - .2, .86, 1.0, '#a97c55', 0, { ao: .3 }); box(S, x, .86, -3.15, w, .06, 1.12, '#c29a6f'); box(S, x, .16, -2.62, w - .2, .56, .03, a);
        for (let k = 0; k < 6; k++) box(S, x - w / 2 + .3 + k * (w - .6) / 5, .12, -2.6, .03, .62, .02, '#7e5b3c'); // slats of the skirt
        for (let k = 0; k < n; k++) {
          const x0 = x - w / 2 - .15 + k * (w + .3) / n, x1 = x0 + (w + .3) / n, col = k % 2 ? c2 : c1, lo = col.clone().multiplyScalar(.82);
          S.quad([x0, yf, zf], [x1, yf, zf], [x1, ya, zb], [x0, ya, zb], col, lo); S.quad([x0, ya, zb], [x1, ya, zb], [x1, yf, zf], [x0, yf, zf], lo, lo);
          S.tri([x0, yf, zf], [(x0 + x1) / 2, yf - .24, zf], [x1, yf, zf], col, lo, col); S.tri([x1, yf, zf], [(x0 + x1) / 2, yf - .24, zf], [x0, yf, zf], lo, lo, lo);
        }
        shade(x, -3.05, w + .6, 2.4);
        goods.forEach((hex, i) => {
          const gx = x - w / 2 + .5 + i * ((w - 1) / Math.max(1, goods.length - 1)); box(S, gx, .92, -3.1, .62, .2, .78, '#9c7448', R(i + x, -.1, .1));
          for (let k = 0; k < 12; k++) S.add(P.ico1, M(gx - .2 + (k % 3) * .2, 1.13 + (k % 2) * .035 + (k > 8 ? .07 : 0), -3.4 + Math.floor(k / 3) * .2, .095, .1, .095, k), C(hex).multiplyScalar(R(k + i + x, .82, 1.12)));
        });
        if (own) { // Mrs. Hazel's stall: scales, a chalk price board, pears in front
          box(S, x + .9, .92, -2.85, .28, .05, .2, '#c9ccd2'); cyl(S, x + .9, .97, -2.85, .02, .2, '#aab2bc', P.cyl6); cyl(S, x + .9, 1.17, -2.85, .13, .02, '#c9ccd2', P.cyl12);
          box(S, x - 1.05, .92, -2.62, .5, .38, .04, '#2e3b33', 0, { ao: .1 }); box(S, x - 1.05, 1.0, -2.6, .38, .03, .01, '#f3ead8'); box(S, x - 1.05, 1.1, -2.6, .3, .03, .01, '#f3ead8'); box(S, x - 1.05, 1.2, -2.6, .34, .03, .01, '#f3ead8');
        }
      };
      const AW = PAL.awning;
      [-22, -16.5, -11, -5.5, 0, 5.5, 11, 16.5, 22].forEach((x, i) => {
        if (x !== 0) stall(x, AW[i % AW.length], [FRUIT[i % 7], FRUIT[(i + 2) % 7], FRUIT[(i + 4) % 7]], i % 3 === 1 ? 3.6 : 3.0);
      });
      const city = c.opts.city, art = window.CityAssets;
      const marketTrees = art?.MARKET_TREES || [{ x: -2.9, z: -4.45, h: 4 }, { x: 3.25, z: -4.6, h: 4.1 }];
      if (art && (city?.hazelStall || city?.tree)) objects.city = art.dress(c, city, marketTrees);
      for (const { x, z, h } of marketTrees) {
        if (!city?.tree) tree(x, z, h, 'upright'); // the authored narrow tree, else a generated narrow one
        else shade(x, z, 1.5, 1.15);
      }
      if (city?.hazelStall) {
        shade(0, -3.3, 3.6, 2.4);
      } else {
        stall(0, ['#4f8f5a', '#fff4e0'], ['#c9d65a', '#f2c14e', '#c9d65a'], 3.6, true);
        board(c, "HAZEL'S FRUIT", 0, 2.62, -2.42, 1.6, .3, 0, ['#fff4e0', '#3c6b45']);
      }
      // crates of fruit stacked in front of the stalls (not in the walking lane)
      const crate = (x, y, z, s, hex, ry = 0, i = 0) => { S.add(P.box, M(x, y, z, s, s * .62, s * .78, ry), C('#a97c55'), { ao: .3 }); S.add(P.box, M(x, y + s * .5, z, s * 1.03, s * .07, s * .8, ry), C('#7e5b3c')); for (let k = 0; k < 6; k++) S.add(P.ico1, M(x - s * .3 + (k % 3) * s * .3, y + s * .66, z - s * .17 + Math.floor(k / 3) * s * .34, s * .17, s * .17, s * .17, k + i), C(hex).multiplyScalar(R(k + i, .85, 1.1))); };
      crate(-1.05, 0, -2.05, .55, '#c9d65a', .1, 1); crate(-.45, 0, -2.0, .5, '#f2c14e', -.2, 2); crate(-.8, .35, -2.1, .46, '#d9473b', .3, 3);
      [[-12.4, -2.0], [-7.2, -2.1], [4.0, -2.0], [8.2, -2.15], [13.6, -2.0], [19.0, -2.1]].forEach(([x, z], i) => { crate(x, 0, z, .55, FRUIT[i % 7], i * .4, i); crate(x + .55, 0, z - .1, .5, FRUIT[(i + 3) % 7], i * .7 + .3, i + 5); if (i % 2) crate(x + .25, .35, z - .05, .45, FRUIT[(i + 5) % 7], i, i + 9); shade(x + .2, z, 1.6, 1.0); });
      for (const [x, z] of [[-9.5, -2.0], [6.9, -2.2], [17.6, -2.0]]) { cyl(S, x, 0, z, .3, .8, '#8a5a38', P.cyl12); cyl(S, x, .25, z, .315, .06, '#3b4350', P.cyl12); cyl(S, x, .6, z, .315, .06, '#3b4350', P.cyl12); S.add(P.ico1, M(x + .7, .2, z + .1, .3, .24, .26, x), C('#c9b08a')); }
      // bunting across the row (day: flags, no bulbs) on posts
      const FLAG = ['#e8473b', '#f2b632', '#2fa59a', '#3c7fc0', '#d63d6d', '#fff4e0'];
      [-19, -8.5, 2.6, 13.6].forEach((x, i) => {
        const z0 = -4.9, z1 = 6.4, y0 = 4.9 + (i % 2) * .3, n = 14, wire = C('#2a2f38');
        for (let k = 0; k < n; k++) {
          const u0 = k / n, u1 = (k + 1) / n, pt = u => [x + (u - .5) * 1.4 * (i % 2 ? 1 : -1), y0 - Math.sin(u * Math.PI) * .7, z0 + (z1 - z0) * u], a = pt(u0), b = pt(u1);
          S.quad(a, b, [b[0], b[1] + .025, b[2]], [a[0], a[1] + .025, a[2]], wire); S.quad(b, a, [a[0], a[1] + .025, a[2]], [b[0], b[1] + .025, b[2]], wire);
          const col = C(FLAG[(k + i) % FLAG.length]), m = pt((u0 + u1) / 2); S.tri(a, [m[0], m[1] - .34, m[2]], b, col); S.tri(b, [m[0], m[1] - .34, m[2]], a, col);
        }
        cyl(S, x + .7 * (i % 2 ? 1 : -1), 0, z1, .06, y0, '#3b4350', P.cyl6);
      });
      for (const [x, z, h] of [[-30, 5.4, 4.4], [-6.5, 5.6, 4.2], [9.5, 5.4, 4.6], [28, 5.5, 4.2]]) tree(x, z, h, 'upright'); // Market Row: narrow street trees (map)
      bin(-14.2, -4.6); bin(14.2, -4.6); planter(-3.5, 6.0, 1.6); planter(7.5, 6.2, 1.6); planter(-20, 6.0, 1.6);
      // stall keepers and shoppers, kept far from the camera (simple figures: the real cast is the three rigs)
      const SIL = ['#5a6c8a', '#8a5a5a', '#5a8a6c', '#8a7a5a', '#6c5a8a', '#7a8a9a'], SKIN = ['#c9a27a', '#a8825c', '#8a6a4a', '#d8b48c'];
      const person = (x, z, i, h = 1, ry = 0) => {
        const col = C(SIL[i % SIL.length]), skin = C(SKIN[i % SKIN.length]);
        S.add(P.cyl8, M(x, 0, z, .17 * h, .8 * h, .13 * h, ry), C('#3b4350')); S.add(P.cyl12, M(x, .78 * h, z, .23 * h, .62 * h, .16 * h, ry), col);
        S.add(P.sph, M(x, 1.48 * h, z, .1 * h, .1 * h, .1 * h), skin); S.add(P.sph, M(x, 1.62 * h, z, .13 * h, .15 * h, .13 * h), skin.clone().multiplyScalar(.92));
        if (i % 3 === 0) S.add(P.cyl12, M(x, 1.72 * h, z, .15 * h, .05 * h, .15 * h), C('#6b3b2b')); shade(x, z, .7, .6);
      };
      [[-16.5, -3.9], [-11, -3.9], [5.5, -3.9], [11, -3.9], [16.5, -3.9], [-22, -3.9]].forEach(([x, z], i) => person(x, z, i, .98)); // behind their counters
      [[-14.5, -1.4], [-13.9, -1.2], [12.6, -1.3], [18.4, 1.9], [-19.5, 2.2], [20.6, -1.5]].forEach(([x, z], i) => person(x, z, i + 2, .96 + (i % 3) * .04));
      return { x: 0, z: -1, r: 12 };
    });

    /* ------------------------------------------------------------ Otto's Corner: street front and interior */
    Sets.register('dream_shop', c => {
      const { PAL, C, P, M, S, box, cyl, house, road, pave, joints, curb, dashes, tree, lamp, bin, planter, shade, objects, glow: G, pool, add } = c;
      // ---- the street front (x -12 .. 12)
      // the street ends at x 34: the shop room (x 35.8 .. 44.6) has its own floor at the pavement height; overlapping them flickered (GOTR-0102)
      road(-40, 34, -.12, 7.6); dashes(-40, 34, 3.7); pave(-40, 34, -14, -.12); joints(-30, 30, -4.3, -.4); curb(-40, 34, -.24); pave(-40, 34, 7.6, 18);
      house({ style: 'plaster', x: -9.6, z: -9.4, w: 11, d: 10, floors: 3, tint: PAL.oldTown[1], roof: 'hip', roofColor: C(PAL.terracotta[1]), shop: true, awning: PAL.awning[2] });
      house({ style: 'brick', x: 0, z: -9.4, w: 7.6, d: 10, floors: 2, tint: '#7c5a48', roof: 'flat', shop: true, shopTint: C('#efe3cc') });
      house({ style: 'apartment', x: 9.8, z: -9.4, w: 11.6, d: 10, floors: 4, tint: PAL.apartment[0], roof: 'flat' });
      house({ style: 'plaster', x: 21.6, z: -9.4, w: 11, d: 10, floors: 3, tint: PAL.oldTown[4], roof: 'hip', roofColor: C(PAL.terracotta[3]), shop: true, awning: PAL.awning[4] });
      house({ style: 'plaster', x: -21, z: -9.4, w: 11, d: 10, floors: 2, tint: PAL.oldTown[6], roof: 'hip', roofColor: C(PAL.terracotta[5]), shop: true, awning: PAL.awning[0] });
      for (let k = 0; k < 6; k++) house({ style: k % 2 ? 'brick' : 'plaster', x: -24 + k * 10, z: 23, w: 9.6, d: 10, floors: 2 + k % 2, tint: PAL.oldTown[(k * 3) % 8], roof: 'hip', roofColor: C(PAL.terracotta[k % 6]), ry: Math.PI, shop: k % 2 === 0, awning: PAL.awning[k % 6] });
      c.skyline(-42);
      const fz = -4.4; // the shop front
      box(S, 0, 0, fz + .02, 7.4, 3.25, .1, '#1f3a4a'); // painted shop front
      box(S, .9, 0, fz + .06, 1.18, 2.35, .08, '#2b2420'); box(S, .9, .04, fz + .1, .98, 2.22, .05, '#7a2f26'); box(S, 1.27, 1.0, fz + .16, .05, .16, .05, '#e0b84d'); // door
      box(S, .9, 0, fz + .2, 1.4, .1, .5, '#b3a892'); // step
      // A lightly obscured reflective pane over the existing door. No display,
      // fake room, extra backing, or change to the door's surrounding geometry.
      c.reflectivePane('Otto exterior tinted door glass', .9, 1.60, fz + .153, .72, .90);

      // display windows (GOTR-0101/0102): a shallow lit display box in front of the shop front, see-through glass on the street side
      const glassMat = new THREE.MeshStandardMaterial({ color: '#d6ecf5', roughness: .08, metalness: .25, transparent: true, opacity: .16, depthWrite: false });
      const sheenMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .15, depthWrite: false, toneMapped: false });
      const GZ = fz + .44; // glass plane, clear of the gloves (to fz + .26) and the bag (to fz + .37)
      for (const [wx, ww] of [[-1.85, 2.9], [2.75, 1.7]]) {
        box(S, wx, .55, fz + .08, ww, 1.85, .06, '#4a3a2e'); // the shop interior seen through the glass
        box(S, wx, 2.08, fz + .12, ww - .14, .03, .14, '#8a6446'); if (ww > 2) box(S, wx, 1.12, fz + .12, ww - .14, .03, .14, '#8a6446'); // shelves (none across the bag)
        for (let k = 0; k < Math.floor(ww / .42); k++) box(S, wx - ww / 2 + .2 + k * .42, 2.11, fz + .12, .24, .16 + (k % 3) * .04, .12, ['#c9a46a', '#d9473b', '#e9e2cc', '#2f6fc0'][k % 4]); // boxes on the top shelf
        G.add(P.box, M(wx, 2.3, fz + .14, ww - .2, .025, .05), C('#ffe9b8')); // the display light under the header
        box(S, wx - ww / 2 + .035, .55, (fz + .05 + GZ) / 2, .07, 1.85, GZ - fz - .05, '#3a2b24'); box(S, wx + ww / 2 - .035, .55, (fz + .05 + GZ) / 2, .07, 1.85, GZ - fz - .05, '#3a2b24'); // side posts
        box(S, wx, 2.32, (fz + .05 + GZ) / 2, ww, .08, GZ - fz - .05, '#3a2b24'); // header
        box(S, wx, .55, (fz + .05 + GZ + .04) / 2, ww + .1, .08, GZ + .04 - fz - .05, '#3a2b24'); // sill
        const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(ww - .14, 1.69), glassMat), false, false); glass.position.set(wx, .63 + 1.69 / 2, GZ); glass.renderOrder = 2; glass.name = 'shop window glass';
        for (const [dx, wdt] of [[-.18, .16], [.12, .07]]) { const sh = add(new THREE.Mesh(new THREE.PlaneGeometry(wdt, 1.5), sheenMat), false, false); sh.position.set(wx + dx * ww, .63 + 1.69 / 2, GZ + .002); sh.rotation.z = -.5; sh.renderOrder = 3; sh.name = 'shop window sheen'; }
      }
      for (let k = 0; k < 4; k++) { const gx = -3 + k * .72, col = ['#d9473b', '#2f6fc0', '#1d1f24', '#f4c152'][k]; for (const s of [-1, 1]) S.add(P.sph, M(gx + s * .12, 1.55 + (k % 2) * .18, fz + .16, .11, .14, .1), C(col)); cyl(S, gx, 1.72 + (k % 2) * .18, fz + .16, .006, .3, '#e9e2cc', P.cyl6); }
      cyl(S, 2.75, .7, fz + .2, .17, .95, '#2f6fc0', P.cyl12); cyl(S, 2.75, 1.65, fz + .2, .01, .55, '#aab2bc', P.cyl6);
      // striped awning over windows and door, the shop sign above it
      { const x0 = -3.6, x1 = 3.6, n = 14, zf2 = fz + 1.25, y0 = 2.85, y1 = 2.4; for (let k = 0; k < n; k++) { const a = x0 + (x1 - x0) * k / n, b = x0 + (x1 - x0) * (k + 1) / n, col = C(k % 2 ? '#fff4e0' : '#7a2f26'), lo = col.clone().multiplyScalar(.8); S.quad([a, y1, zf2], [b, y1, zf2], [b, y0, fz + .1], [a, y0, fz + .1], col, lo); S.quad([a, y0, fz + .1], [b, y0, fz + .1], [b, y1, zf2], [a, y1, zf2], lo, lo); box(S, (a + b) / 2, y1 - .2, zf2, b - a, .2, .02, k % 2 ? '#fff4e0' : '#7a2f26'); } }
      board(c, "OTTO'S CORNER", 0, 3.45, fz + .1, 4.2, .62, 0, ['#14202b', '#f4c152']);
      box(S, 3.0, 2.95, fz + .1, .05, .05, .7, '#2f3640'); board(c, 'BOXING', 3.0, 2.62, fz + .78, .7, .32, Math.PI / 2, ['#7a2f26', '#fff4e0']); board(c, 'BOXING', 3.0, 2.62, fz + .78, .7, .32, -Math.PI / 2, ['#7a2f26', '#fff4e0']);
      for (const x of [-11, 8.5, 18]) lamp(x, -.9); tree(-6.2, -1.2, 4.2, 'upright'); tree(15.5, -1.2, 4.4, 'upright'); /* was x 6: its crown filled the last shot as he walks out with the bag (GOTR-0103) */ bin(4.6, -3.9); planter(-4.3, -3.95, 1.3); planter(13.6, -3.95, 1.3);
      c.car?.(-8, 1.35, '#3b7dd8', 1); c.car?.(12, 1.35, '#45b39d', 1);

      // ---- the interior (x 36 .. 44.4, z -3.2 .. 3.6, 3.2 m high)
      const X0 = 36, X1 = 44.4, Z0 = -3.2, Z1 = 3.6, H = 3.2, A = new c.K.Batch();
      box(A, (X0 + X1) / 2, -.3, (Z0 + Z1) / 2, X1 - X0, .3, Z1 - Z0, '#9a7452'); for (let x = X0 + .2; x < X1; x += .2) box(A, x, 0, (Z0 + Z1) / 2, .01, .006, Z1 - Z0, '#7e5d40');
      const wall = (x, z, w, d) => { box(A, x, 0, z, w, .14, d, '#3a2b24'); box(A, x, .14, z, w, 1.0, d, '#5a4436'); box(A, x, 1.14, z, w + .02, .05, d + .02, '#3a2b24'); box(A, x, 1.19, z, w, H - 1.19, d, '#e9dcc0'); };
      wall((X0 + X1) / 2, Z0 - .1, X1 - X0, .2); wall(X0 - .1, (Z0 + Z1) / 2, .2, Z1 - Z0); wall((X0 + X1) / 2, Z1 + .1, X1 - X0, .2);
      wall(X1 + .1, -1.0, .2, 4.4); wall(X1 + .1, 2.95, .2, 1.3); box(A, X1 + .1, 2.3, 1.45, .2, H - 2.3, 1.7, '#e9dcc0'); // right wall with the street door
      G.add(P.box, M(X1 + .15, 0, 1.45, .04, 2.3, 1.1), C('#f4ecdc')); box(A, X1 + .02, 0, 1.45, .06, 2.32, 1.3, '#3a2b24'); // the open door: daylight
      box(A, (X0 + X1) / 2, H, (Z0 + Z1) / 2, X1 - X0 + .4, .15, Z1 - Z0 + .4, '#d8ceb8');
      c.reflectivePane('Otto interior decorative window', 39.2, 1.85, Z1 - .022, 2.4, 1.5, -1); box(A, 39.2, 1.04, Z1 - .06, 2.6, .08, .12, '#3a2b24'); box(A, 39.2, 1.1, Z1 - .04, .05, 1.5, .03, '#3a2b24'); // front window
      const arch = c.movable(A, 'shop room'); arch.castShadow = false;
      // counter with a glass case of wraps and mouthguards, a till
      box(S, 41.3, 0, -1.45, 2.6, .95, .62, '#6b4630', 0, { ao: .25 }); box(S, 41.3, .95, -1.45, 2.7, .05, .7, '#8a6446'); box(S, 41.3, .1, -1.13, 2.4, .7, .02, '#4a3026');
      { // the glass case in front of the counter (GOTR-0102): wraps and mouthguards on a lit shelf behind see-through glass
        const z0 = -1.12, z1 = -.92, x0 = 40.25, x1 = 41.75, y0 = .48, y1 = .9;
        box(S, (x0 + x1) / 2, y0 - .04, (z0 + z1) / 2, x1 - x0 + .06, .04, z1 - z0 + .02, '#3a2b24'); box(S, (x0 + x1) / 2, y1, (z0 + z1) / 2, x1 - x0 + .06, .04, z1 - z0 + .02, '#3a2b24'); // base and lid
        for (const x of [x0, x1]) box(S, x, y0, (z0 + z1) / 2, .03, y1 - y0, z1 - z0, '#3a2b24'); // ends
        G.add(P.box, M((x0 + x1) / 2, y1 - .025, (z0 + z1) / 2 - .04, x1 - x0 - .1, .015, .03), C('#ffe9b8')); // case light
        for (let k = 0; k < 6; k++) box(S, 40.45 + k * .22, y0, -1.03, .14, .06, .14, ['#d9473b', '#f4f1ea', '#2f6fc0', '#1d1f24', '#f4c152', '#d9473b'][k]);
        const g = add(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - .03, y1 - y0), glassMat), false, false); g.position.set((x0 + x1) / 2, (y0 + y1) / 2, z1); g.renderOrder = 2; g.name = 'counter case glass';
        const sh = add(new THREE.Mesh(new THREE.PlaneGeometry(.06, .4), sheenMat), false, false); sh.position.set(x0 + .45, (y0 + y1) / 2, z1 + .002); sh.rotation.z = -.5; sh.renderOrder = 3; sh.name = 'counter case sheen';
      }
      box(S, 42.2, 1.0, -1.55, .38, .22, .3, '#3b4350'); box(S, 42.2, 1.22, -1.62, .3, .14, .06, '#1d1f24'); box(S, 41.5, 1.0, -1.4, .28, .08, .2, '#f4f1ea'); // till, a box of tape
      // glove wall behind the counter: pegboard, pairs of gloves hanging by their laces, a few head guards
      box(S, 41.1, 1.05, Z0 + .02, 4.6, 1.95, .04, '#c9a77a'); for (let x = 39.0; x < 43.4; x += .2) for (let y = 1.15; y < 2.95; y += .2) box(S, x, y, Z0 + .045, .02, .02, .005, '#8a6446');
      const GLOVE = ['#d9473b', '#2f6fc0', '#1d1f24', '#f4c152', '#f4f1ea', '#c0392b', '#3a7d44', '#8f2f22'];
      for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
        const gx = 39.25 + k * .72 + (r % 2) * .2, gy = 2.55 - r * .55, col = C(GLOVE[(k + r * 3) % GLOVE.length]);
        if (r === 2 && k % 3 === 1) { S.add(P.hemi, M(gx, gy - .12, Z0 + .18, .15, .18, .13, 0, -.3), col); continue; } // head guard
        for (const s of [-1, 1]) { S.add(P.sph, M(gx + s * .1, gy - .17, Z0 + .14, .095, .125, .09, s * .2), col); S.add(P.sph, M(gx + s * .1 - s * .06, gy - .14, Z0 + .2, .05, .06, .05), col.clone().multiplyScalar(.9)); cyl(S, gx + s * .1, gy - .32, Z0 + .14, .07, .1, '#f4f1ea', P.cyl8); }
        cyl(S, gx, gy - .06, Z0 + .07, .006, .08, '#e9e2cc', P.cyl6);
      }
      // heavy bags on chains along the left wall, the new one on display in front of them
      for (const [bx, bz, col, len] of [[37.0, -2.3, '#1d1f24', 1.1], [37.0, -1.1, '#8f2f22', 1.0], [37.05, .1, '#2b3a55', 1.2]]) { cyl(S, bx, 1.0, bz, .2, len, col, P.cyl20); cyl(S, bx, 1.0 + len - .08, bz, .205, .08, '#141418', P.cyl20); cyl(S, bx, 1.0, bz, .205, .07, '#141418', P.cyl20); cyl(S, bx, 1.0 + len, bz, .012, H - 1.0 - len, '#aab2bc', P.cyl6); c.shade(bx, bz, .7, .7); }
      const D = { x: 38.85, y: 1.54, z: .45 }; objects.display = D; c.shade(D.x, D.z, .8, .8);
      cyl(S, D.x, D.y + .93, D.z, .012, H - D.y - .93, '#aab2bc', P.cyl6); box(S, D.x, H - .04, D.z, .14, .04, .14, '#3b4350'); // its chain and ceiling plate stay
      const price = window.GameDomain?.gear?.find(x => x.id === 'heavy_bag')?.price ?? 90;
      box(S, D.x + .55, 0, D.z + .25, .04, 1.1, .04, '#3b4350'); board(c, `${price} ◈`, D.x + .55, 1.22, D.z + .27, .42, .26, 0, ['#fff4e0', '#7a2f26']);
      // shelves on the left wall by the window: shoe boxes, tape, skipping ropes; a bench
      for (const y of [.5, 1.05, 1.6]) { box(S, X0 + .25, y, 2.3, .42, .04, 2.0, '#8a6446'); for (let k = 0; k < 5; k++) box(S, X0 + .25, y + .04, 1.5 + k * .4, .3, .2 + (k % 2) * .05, .32, ['#f4f1ea', '#d9473b', '#1d1f24', '#2f6fc0', '#f4c152'][(k + Math.round(y * 10)) % 5]); }
      for (let k = 0; k < 3; k++) cyl(S, 43.9, .9, -2.6 + k * .3, .1, .05, ['#d9473b', '#2f6fc0', '#f4c152'][k], P.cyl12, Math.PI / 2);
      box(S, 43.5, .42, 2.9, 1.3, .06, .42, '#9a7350'); for (const d of [-.55, .55]) box(S, 43.5 + d, 0, 2.9, .06, .42, .38, '#3d4654');
      board(c, "OTTO'S CORNER · EST. 1979", 41.2, 2.85, Z0 + .06, 2.6, .24, 0, ['#14202b', '#f4c152']);
      // ceiling lamps with warm pools
      for (const [lx, lz] of [[38.6, -1.4], [41.4, -.6], [41.0, 2.2]]) { cyl(S, lx, 2.7, lz, .01, H - 2.7, '#2a2f38', P.cyl6); S.add(P.cone8, M(lx, 2.55, lz, .32, .2, .32), C('#2f4a3d')); G.add(P.sph, M(lx, 2.57, lz, .08, .08, .08), C('#fff3cf')); pool(lx, lz, 2.2, '#ffe2a8', .005); }
      return { x: 0, z: -2, r: 12 };
    });
  }

  /* ---------------------------------------------------------------- props carried between the actors (market-core.js carry) */
  const at = (keys, t) => { let i = 0; for (let k = 1; k < keys.length; k++) if (keys[k].t <= t) i = k; else break; return keys[i]; };
  function pouchMesh() {
    const g = new THREE.Group(); g.name = 'Reward pouch';
    const leather = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a5a34').convertSRGBToLinear(), roughness: .7 }), cord = new THREE.MeshStandardMaterial({ color: new THREE.Color('#e0b84d').convertSRGBToLinear(), roughness: .5, metalness: .3 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), leather); body.scale.set(1, .85, 1); body.position.y = -.06; g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.022, .04, .04, 12), leather); neck.position.y = .0; g.add(neck);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.026, .006, 6, 16), cord); tie.rotation.x = Math.PI / 2; tie.position.y = .0; g.add(tie);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.storyPart = true;
    return { group: g, dispose: () => { g.traverse(o => o.geometry?.dispose()); leather.dispose(); cord.dispose(); } };
  }
  // Geometry for a few personal effects: a coin purse, folded note and small key-ring.
  const SPILL = [
    { delay: .025, v: [.56, .63, -.24], ground: .035, spin: 2.6 },
    { delay: .072, v: [-.43, .58, -.44], ground: .015, spin: -4.5 },
    { delay: .105, v: [.50, .45, .19], ground: .024, spin: 4.8 }
  ];
  function spillMesh(scene) {
    const objects = SPILL.map((_, i) => {
      const g = new THREE.Group(); g.name = 'Handbag contents'; g.userData.handbagSpill = true; g.visible = false; scene.add(g);
      const add = (geo, c, y = 0, x = 0, z = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: new THREE.Color(c).convertSRGBToLinear(), roughness: .72
      })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
      if (i === 0) {
        const leather = add(new THREE.SphereGeometry(.052, 12, 8), '#315f6c'); leather.scale.set(1, .62, .78);
        add(new THREE.BoxGeometry(.050, .009, .010), '#e0bf79', .025, .008);
      } else if (i === 1) {
        add(new THREE.BoxGeometry(.091, .011, .059), '#eee0b4');
        add(new THREE.BoxGeometry(.074, .001, .005), '#b58b63', .006, 0, -.01);
      } else {
        const ring = add(new THREE.TorusGeometry(.019, .0045, 6, 12), '#e2ba72', 0, -.027); ring.rotation.x = Math.PI * .5;
        add(new THREE.BoxGeometry(.059, .009, .013), '#c7d0d4', 0, .017);
        add(new THREE.BoxGeometry(.014, .009, .022), '#e1e2db', 0, .040, .006);
      }
      return g;
    });
    return { objects, dispose() { for (const g of objects) { scene.remove(g); for (const m of g.children) { m.geometry.dispose(); m.material.dispose(); } } } };
  }

  // The local shell's real vertices set the lowest available contact, including the clasp and handles.
  // Rotation support can be evaluated from the local AABB corners (conservative by a few millimetres).
  function dropBounds(obj) {
    const box = new THREE.Box3(); obj.traverse(m => {
      if (!m.geometry) return;
      m.geometry.computeBoundingBox(); m.updateMatrix(); box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix));
    });
    return [box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>V(x,y,z))));
  }
  function makeDrop(key, obj, scene) {
    const seed=V(...key.fallFrom), from=new THREE.Quaternion(), to=new THREE.Quaternion(), tmp=V(), q=new THREE.Quaternion(), p=V();
    const corners=dropBounds(obj), spit=spillMesh(scene), yAxis=V(0,1,0);
    let anchor=null, last=null, time=-Infinity;
    const end=to.setFromEuler(new THREE.Euler(0,key.at[2],1.58,'YXZ'));
    const floor=q=>.006-Math.min(...corners.map(v=>tmp.copy(v).applyQuaternion(q).y));
    const endY=floor(end), gravity=9.81;
    function pose(state,u) {
      const hit=state.hit, v=clamp(u/hit);
      q.copy(state.q).slerp(end,smooth(v));
      const floorY=floor(q), drift=smooth(v), bump=Math.max(0,u-hit);
      const y=state.p.y-gravity*u*u/2;
      p.set(state.p.x+(key.at[0]-state.p.x)*drift,
        u<hit?Math.max(floorY,y):endY+Math.max(0,.61*bump-.5*gravity*bump*bump),
        state.p.z+(key.at[1]-state.p.z)*drift);
    }
    function held(t, position, rotation) {
      last={ t, p:position.clone(), q:rotation.clone() };anchor=null;time=t;
      for(const o of spit.objects)o.visible=false;
    }
    function frame(t, heldNow) {
      if(t<time-1e-6)anchor=null;
      time=t;
      if(!anchor) {
        // Live playback crosses the release with the actual solved paw. The authored measured anchor is for forward seeks.
        const ref=last&&key.t-last.t<=.085&&last.t<=key.t&&t-last.t<=.10?last:
          heldNow&&t-key.t<.075?heldNow:{p:seed,q:from.setFromAxisAngle(yAxis,key.fallFrom[3])};
        const hit=Math.sqrt(2*Math.max(.05,ref.p.y-endY)/gravity);
        anchor={p:ref.p.clone(),q:ref.q.clone(),hit};
      }
      const u=Math.max(0,t-key.t);pose(anchor,u);obj.position.copy(p);obj.quaternion.copy(q);obj.visible=true;
      for(let i=0;i<spit.objects.length;i++) {
        const o=spit.objects[i], d=SPILL[i], start=anchor.hit+d.delay, elapsed=u-start;
        o.visible=elapsed>=0;if(!o.visible)continue;
        pose(anchor,start);
        // Starts inside the turned bag's mouth, then follows a short hop and damped slide.
        const mouth=tmp.set(0,-.083,.023).applyQuaternion(q).add(p);
        const ground=d.ground, airborne=(d.v[1]+Math.sqrt(d.v[1]**2+2*gravity*Math.max(0,mouth.y-ground)))/gravity;
        const roll=Math.max(0,elapsed-airborne), r=Math.min(elapsed,airborne)+.24*(1-Math.exp(-roll*8));
        o.position.set(mouth.x+d.v[0]*r,Math.max(ground,mouth.y+d.v[1]*elapsed-.5*gravity*elapsed*elapsed),mouth.z+d.v[2]*r);
        const spin=(1-Math.exp(-elapsed*6))*d.spin;
        o.rotation.set(.12*Math.sin(spin)*Math.exp(-roll*10),spin,.68*Math.sin(spin)*Math.exp(-roll*10));
      }
    }
    return { held, frame, dispose:spit.dispose, hide(){for(const o of spit.objects)o.visible=false;} };
  }
  /* The new heavy bag from Otto's display to the Fighter's right shoulder (arm-fixes, after GOTR-0103). heavybag keys:
   *   { on: 'display', yaw }   hangs at set.objects.display, turned by yaw (its +x = his right side when he picks it up)
   *   { on: 'reach' }          he stands with the bag front-right and his right hand goes out to the side of it (REACH s)
   *   { on: 'lift' }           to the next key: the bag comes off the hook (UNHOOK), tips over (its top falls back over his
   *                            shoulder) and rises onto the shoulder while the hand stays on the same spot of the leather
   *   { on: 'shoulder' }       it rides the chest (breathing, the walk), settles in SETTLE s; the hand stays on it
   * The hand is a contact on the bag (DreamPose reach object): the wrist sits GRIP.out off the bag's axis on its outer side,
   * GRIP.along in front of its middle, so the palm lies on the leather and the elbow points out and down beside the bag
   * (the old target put the wrist over the bag with the elbow folded behind the shoulder, and the bag appeared on the
   * shoulder in one frame). Everything is a function of the scene time, so playback, seeking and the tap-to-continue
   * pauses give the same picture. */
  const BAG_R = .235, HAND_R = BAG_R + .065; // the wrist off the bag's axis: radius + the thickness of the paw under the wrist (measured: the palm on the leather)
  const CARRY = Object.freeze({ reach: 1.1, unhook: .045, settle: .45, mid: [.17, .345, -.045], tilt: .2, arc: .12, grip: Object.freeze({ out: HAND_R, a: 1.48, along: .14 }), pole: [1, -.4, -.05] });
  const DreamPoseHang = () => window.DreamPose?.GESTURES?.hang || { h: [.335, .985, .055], pole: [.25, -.1, -1], palm: [-1, 0, 0] }; // the right hand hanging (DreamPose rig space)
  function create({ scene, set, rigs, carry }) {
    const Cast = window.StoryCast, items = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), UP = V(0, 1, 0);
    const byRig = id => Object.keys(rigs).find(k => rigs[k].character === id || k === id);
    // the handbag: Mrs. Hazel's own prop, given back exactly as found
    if (carry.handbag) {
      const hk = byRig('hazel'), obj = hk ? Cast?.market?.handbag(rigs[hk]) : null;
      const key=carry.handbag.find(k=>k.fallFrom);
      if (obj) items.push({ name: 'handbag', obj, keys: carry.handbag, hang: .0, ground: .02,
        drop:key?makeDrop(key,obj,scene):null, home: { parent: obj.parent, pos: obj.position.clone(), q: obj.quaternion.clone(), visible: obj.visible, auto: obj.matrixAutoUpdate } });
    }
    if (carry.pouch) { const p = pouchMesh(); scene.add(p.group); items.push({ name: 'pouch', obj: p.group, keys: carry.pouch, hang: .02, ground: .06, own: p }); }
    let heavy = null;
    if (carry.heavybag && window.BagBreak?.bag) { const b = window.BagBreak.bag({ worn: false }); scene.add(b.group); heavy = { b, keys: carry.heavybag, local: null }; }
    const holderOf = on => on && rigs[byRig(on)] ? rigs[byRig(on)] : null;
    // ---- the heavy bag (see CARRY): its pose in the world at time t for the Fighter rig c (a frame: position + quaternion)
    const keyIndex = t => { const k = heavy.keys; let i = 0; for (let n = 1; n < k.length; n++) if (k[n].t <= t) i = n; else break; return i; };
    const display = () => { const D = set?.objects?.display, k0 = heavy.keys.find(k => k.on === 'display'); return D ? { p: V(D.x, D.y, D.z), q: new THREE.Quaternion().setFromAxisAngle(UP, k0?.yaw || 0) } : null; };
    /** On the shoulder this frame: fixed to the chest (its middle CARRY.mid from the right shoulder joint at rest), lying
     *  fore and aft with its top behind him, its +x to his right. World frame. */
    function shoulderPose(c) {
      const j = c.joints, R = c.root, P = window.DreamPose, M = new THREE.Matrix4().copy(R.matrixWorld).invert().multiply(j.chest.matrixWorld);
      const rig = P.restOf(c, j.armR).add(V(...CARRY.mid)).sub(P.restOf(c, j.chest)).applyMatrix4(M); // rig space, riding the chest
      const axis = V(0, 0, -1).transformDirection(M), side = V(1, 0, 0).transformDirection(M), Rw = R.matrixWorld;
      const Y = axis.transformDirection(Rw), X0 = side.transformDirection(Rw), X = X0.addScaledVector(Y, -X0.dot(Y)).normalize(), Z = X.clone().cross(Y);
      return { p: R.localToWorld(rig), q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)) };
    }
    /** Where the bag is at time t (world), how far it is lifted (0..1) and how far the hand has gone to it (0..1). */
    function bagPose(c, t) {
      const i = keyIndex(t), k = heavy.keys[i], next = heavy.keys[i + 1], D = display();
      if (k.on === 'display' || !D) return D ? { ...D, lift: 0, hand: 0 } : null;
      if (k.on === 'reach') return { ...D, lift: 0, hand: smooth((t - k.t) / CARRY.reach) };
      const E = shoulderPose(c);
      if (k.on === 'lift') {
        const u = clamp((t - k.t) / Math.max(.05, (next ? next.t : k.t + 1) - k.t)), up = CARRY.unhook * smooth(u / .15), r = smooth((u - .08) / .92), m = smooth(u);
        // the middle: up off the hook first, then an arc that rises in front of him and comes back onto the shoulder
        const S = D.p.clone().setY(D.p.y + up), C = S.clone().lerp(E.p, .5); C.y = Math.max(S.y, E.p.y) + .06;
        const out = E.p.clone().sub(c.root.getWorldPosition(V())).setY(0).normalize(); C.addScaledVector(out, CARRY.arc); // wide of his head (and mane) on the way up
        const p = S.clone().multiplyScalar((1 - m) * (1 - m)).addScaledVector(C, 2 * m * (1 - m)).addScaledVector(E.p, m * m);
        return { p, q: D.q.clone().slerp(E.q, r), lift: m, hand: 1 };
      }
      const s = clamp((t - k.t) / CARRY.settle); E.p.y -= .018 * Math.sin(Math.PI * s) * (1 - s); // it settles into the shoulder
      return { ...E, lift: 1, hand: 1 };
    }
    /** The hand's spot on the leather, in bag space (x = his right, y = the bag's axis toward its top, z = up once it lies on the
     *  shoulder): GRIP.a from the top on his right side, over the top-outer curve, GRIP.along in front of the middle. */
    const gripLocal = () => V(CARRY.grip.out * Math.sin(CARRY.grip.a), -CARRY.grip.along, CARRY.grip.out * Math.cos(CARRY.grip.a));
    /* Handovers (ch1-motion): an item that passes from one actor's hand to another's: both hands come to a point between them
     * (in the last 0.7 s before the key), the item changes hands there, and they let go (0.35 s). Without this the handbag
     * and the reward pouch jumped 1.5 m from one hand to the other. */
    const HAND_IN = .7, HAND_OUT = .35;
    function handover(actor, t) {
      const me = rigs[actor]; if (!me) return null;
      for (const it of items) for (let i = 1; i < it.keys.length; i++) {
        const a = it.keys[i - 1], b = it.keys[i], A = holderOf(a.on), B = holderOf(b.on); if (!A || !B || A === B || (me !== A && me !== B)) continue;
        const w = smooth((t - (b.t - HAND_IN)) / HAND_IN) * (1 - smooth((t - b.t) / HAND_OUT)); if (w <= 0) continue;
        const side = me === A ? a.hand || 'R' : b.hand || 'R', mid = () => { const p = A.joints['arm' + (a.hand || 'R')].getWorldPosition(V()), q = B.joints['arm' + (b.hand || 'R')].getWorldPosition(V()); return p.add(q).multiplyScalar(.5).setY(1.22); }; // between the two shoulders, at chest height
        return { [side]: { at: rig => rig.root.worldToLocal(mid()).toArray(), w, paw: 'grip' } };
      }
      return null;
    }
    /** Hand targets (DreamPose reach objects): the heavy bag's carrier, else a handover. */
    function reach(actor, t) { return heavyReach(actor, t) || handover(actor, t); }
    function heavyReach(actor, t) {
      if (!heavy || rigs[actor] !== holderOf('fighter')) return null;
      const c = rigs[actor], k = heavy.keys[keyIndex(t)]; if (k.on === 'display') return null;
      const first = bagPose(c, t); if (!first || first.hand <= 0) return null;
      const spot = (rig, b) => rig.root.worldToLocal(gripLocal().applyQuaternion(b.q).add(b.p)); // rig space
      const centre = c.root.worldToLocal(first.p.clone()), palm = centre.clone().sub(spot(c, first)).normalize(), u = first.hand;
      const H = DreamPoseHang(), pole = V(...H.pole).lerp(V(...CARRY.pole).normalize(), u).normalize(), pal = V(...H.palm).lerp(palm, u).normalize();
      // the reach: from the hanging hand out to the side of the bag and round onto its outer face (a curve that stays clear of
      // the leather: a straight line went through the bag), then on the leather; evaluated after the trunk is posed
      const at = rig => {
        const C = spot(rig, bagPose(rig, t)); if (u >= 1) return C.toArray();
        const A = V(...H.h), B = rig.root.worldToLocal(bagPose(rig, t).p.clone()), W = V(Math.max(C.x, B.x + BAG_R) + .22, A.y + .1, A.z - .02);
        return A.multiplyScalar((1 - u) * (1 - u)).addScaledVector(W, 2 * u * (1 - u)).addScaledVector(C, u * u).toArray();
      };
      return { R: { at, w: smooth(u / .2), pole: pole.toArray(), palm: pal.toArray(), turn: .35 + .2 * u, paw: 'relaxed' }, tilt: CARRY.tilt * first.lift };
    }
    const wp = V(), wq = new THREE.Quaternion(), ws = V(1, 1, 1);
    function frame(t) {
      for (const it of items) {
        const k = at(it.keys, t), o = it.obj, holder = holderOf(k.on);
        if (holder) {
          const hand = holder.joints['hand' + (k.hand || 'R')]; if (o.parent !== hand) hand.add(o);
          // hangs upright under the hand, turned with the holder (independent of the wrist and of the mirrored root)
          holder.root.updateMatrixWorld(true); hand.getWorldPosition(wp); wp.y -= it.hang + .02;
          wq.setFromAxisAngle(UP, holder.root.rotation.y); m4.compose(wp, wq, ws);
          o.matrixAutoUpdate = false; o.matrix.copy(hand.matrixWorld).invert().multiply(m4); o.matrixWorldNeedsUpdate = true; o.visible = true; it.drop?.held(t,wp,wq);
        } else if (k.on === 'ground') {
          if (o.parent !== scene) scene.add(o);
          o.matrixAutoUpdate = true;
          if(it.drop&&k.fallFrom) {
            const old=holderOf(it.keys[it.keys.indexOf(k)-1]?.on); let now=null;
            if(old&&t-k.t<.075) {
              old.root.updateMatrixWorld(true);old.joints['hand'+(it.keys[it.keys.indexOf(k)-1]?.hand||'R')].getWorldPosition(wp);
              wp.y-=it.hang+.02;wq.setFromAxisAngle(UP,old.root.rotation.y);now={p:wp,q:wq};
            }
            it.drop.frame(t,now);continue;
          }
          o.position.set(k.at[0], it.ground + .2, k.at[1]); o.rotation.set(0, k.at[2] || 0, it.name === 'handbag' ? 1.35 : 0); o.visible = true; // the handbag lies on its side
        } else { o.visible = false;it.drop?.hide(); }
      }
      if (heavy) {
        const g = heavy.b.group, c = holderOf('fighter'), k = heavy.keys[keyIndex(t)];
        if (c && c.root.visible === false && k.on !== 'display') { g.visible = false; return; }
        if (c) c.root.updateMatrixWorld(true);
        const b = c ? bagPose(c, t) : k.on === 'display' ? display() : null;
        if (b) { g.position.copy(b.p); g.quaternion.copy(b.q); g.visible = true; } else g.visible = false;
      }
    }
    function dispose() {
      for (const it of items) {
        const o = it.obj; it.drop?.dispose();
        if (it.home) { o.parent?.remove(o); it.home.parent?.add(o); o.position.copy(it.home.pos); o.quaternion.copy(it.home.q); o.scale.set(1, 1, 1); o.visible = it.home.visible; o.matrixAutoUpdate = it.home.auto; o.updateMatrix(); }
        else { o.parent?.remove(o); it.own?.dispose(); }
      }
      if (heavy) { heavy.b.group.parent?.remove(heavy.b.group); heavy.b.dispose(); }
      items.length = 0; heavy = null;
    }
    return { reach, frame, dispose, get items() { return items; }, get heavy() { return heavy; } };
  }

  if (window.StorySets) register(); else window.addEventListener('DOMContentLoaded', register);
  window.MarketSets = { register };
  window.MarketProps = { create };
})();
