/* Sets of Chapter 1 "The Dream" (GOTR-0078 slice 1), registered in StorySets (same kit, light and materials as the other
 * story sets, so they are built when a scene plays and disposed after):
 *   'dream_street'  one continuous morning street: the bus station (shelter with a route sign, bench, stop pole, the bus
 *                   with opening doors) on the near pavement, shops, lamps and trees, a zebra crossing, and Bruno's Gym
 *                   (door, glove board, name sign) on the far side at x = 27. Far down the street stand the city's towers.
 *                   objects: bus (x = -1 when stopped; the front door is at x = 2.75), doors [leaf, leaf] (children of the bus)
 *   'dream_gym'     Bruno's Gym, main hall: plank floor, brick and plaster walls with tall windows, the ring, heavy bags on
 *                   a beam, speed bag, lockers, bench, posters, hanging lamps with light pools. The talk spot is x -1..1, z 0.8.
 * World: metres, y up, the camera side is +z. */
(() => {
  const TAU = Math.PI * 2;
  function signTexture(lines, w = 512, h = 128, bg = '#141a26', fg = '#f4c152') {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.round(h * .5)}px "Inter Display","Inter","Arial Black",Impact,system-ui,sans-serif`; g.fillText(lines, w / 2, h / 2 + 3, w - 60);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function board(c, text, x, y, z, w, h, ry = 0, colors = []) {
    const tex = signTexture(text, 512, Math.round(512 * h / w), ...colors), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; c.add(m, false, true); c.disposables.push(tex); return m;
  }

  function register() {
    const Sets = window.StorySets; if (!Sets || Sets.ids().includes('dream_street')) return;

    /* ------------------------------------------------------------ bus station street -> Bruno's Gym */
    Sets.register('dream_street', c => {
      const { K, PAL, C, P, M, S, box, cyl, house, sign, picto, road, pave, joints, curb, dashes, tree, lamp, bin, planter, bollard, wheel, car, movable, objects } = c;
      road(-70, 110, -3.5, 3.5); dashes(-70, 110, 0);
      pave(-70, 110, -14, -3.5); pave(-70, 110, 3.5, 10.2); joints(-44, 60, -8, -3.6); joints(-44, 60, 3.6, 10); curb(-70, 110, -3.62); curb(-70, 110, 3.62);
      box(S, 20, -.6, -40, 200, .2, 52, '#b9b2a2'); box(S, 20, -.6, 36, 200, .2, 52, '#b9b2a2'); // ground behind the house rows (seen in the dive)
      for (let x = 20.2; x < 24.2; x += 1.0) box(S, x + .25, -.148, 0, .5, .012, 6.4, '#f4f1e6'); // zebra crossing to the gym
      for (const z of [-3.9, 3.9]) for (let x = 20; x < 24.6; x += .5) box(S, x, .002, z, .3, .008, .3, '#e8c15a'); // tactile strip at the crossing
      box(S, -1, -.148, 3.38, 13, .012, .12, '#f4c152'); box(S, -1, -.148, .55, 13, .012, .1, '#f4c152'); // bus bay lines
      // far side (lit by the morning sun): shops, flats, and Bruno's Gym at x = 27
      house({ style: 'plaster', x: -34, z: -13.2, w: 11, d: 10, floors: 2, tint: PAL.oldTown[5], roof: 'hip', roofColor: C(PAL.terracotta[4]) });
      house({ style: 'brick', x: -22.5, z: -13.2, w: 11, d: 10, floors: 3, tint: PAL.oldTown[3], roof: 'hip', roofColor: C(PAL.terracotta[2]), shop: true, awning: PAL.awning[4] });
      house({ style: 'plaster', x: -11, z: -13.2, w: 11, d: 10, floors: 3, tint: PAL.oldTown[0], roof: 'hip', roofColor: C(PAL.terracotta[0]), shop: true, awning: PAL.awning[0] });
      house({ style: 'apartment', x: .6, z: -13.2, w: 11.4, d: 10, floors: 4, tint: PAL.apartment[1], roof: 'flat' });
      house({ style: 'plaster', x: 11.4, z: -13.2, w: 9.4, d: 10, floors: 3, tint: PAL.oldTown[1], roof: 'hip', roofColor: C(PAL.terracotta[1]), shop: true, awning: PAL.awning[5] });
      house({ style: 'brick', x: 27, z: -13.2, w: 10, d: 10, floors: 2, tint: '#c9653d', roof: 'flat', shop: true, shopTint: C('#f4e4c4') });
      house({ style: 'plaster', x: 37.6, z: -13.2, w: 10.4, d: 10, floors: 3, tint: PAL.oldTown[2], roof: 'hip', roofColor: C(PAL.terracotta[3]), shop: true, awning: PAL.awning[1] });
      house({ style: 'apartment', x: 49, z: -13.2, w: 11.6, d: 10, floors: 4, tint: PAL.apartment[0], roof: 'flat' });
      house({ style: 'plaster', x: 61, z: -13.2, w: 11, d: 10, floors: 3, tint: PAL.oldTown[6], roof: 'hip', roofColor: C(PAL.terracotta[5]) });
      // near side (behind the station, seen from the road and in the dive)
      const near = [[-30, 12, 2, 4, 'plaster'], [-17, 12, 3, 7, 'brick'], [-4, 13, 2, 2, 'plaster'], [9.5, 13, 3, 1, 'plaster'], [23, 13, 2, 6, 'brick'], [36, 12, 3, 0, 'plaster'], [48.5, 12, 4, 0, 'apartment'], [61, 12, 3, 5, 'plaster']];
      near.forEach(([x, w, floors, tint, style], i) => house({ style, x, z: 15.4, w, d: 10, floors, tint: style === 'apartment' ? PAL.apartment[1] : PAL.oldTown[tint], roof: style === 'apartment' ? 'flat' : 'hip', roofColor: C(PAL.terracotta[i % 6]), ry: Math.PI, shop: i % 2 === 0, awning: PAL.awning[(i + 2) % 6] }));
      c.skyline(-50); c.plinth(-70, 21.9, -8.12); c.plinth(32.1, 110, -8.12);
      picto('bread', -11, 4.6, -8.14); picto('cup', 11.4, 4.6, -8.14); picto('flower', -22.5, 4.6, -8.14); picto('book', 37.6, 4.6, -8.14);
      // the big city: hazy towers far down the street, and a second row of roofs behind both sides
      const tw = [[96, -30, 11, 46], [108, -10, 12, 74], [120, -28, 13, 58], [102, 20, 11, 42], [118, 14, 14, 92], [132, -6, 12, 66], [92, 34, 10, 34], [136, 26, 12, 50], [146, -22, 14, 84], [128, 40, 12, 60], [112, -46, 12, 52]];
      for (const [x, z, w, h] of tw) { const col = ['#8ea9c6', '#9db4cc', '#86a2c0'][Math.round(x) % 3]; box(S, x, 0, z, w, h, w, col); box(S, x, h, z, w * .6, h * .1, w * .6, col); for (let y = 6; y < h - 2; y += 4) box(S, x - w / 2 - .03, y, z, .06, 1.9, w * .86, '#6f8db0'); cyl(S, x, h * 1.1, z, .12, 5, '#9aa8b6', P.cyl6); }
      for (let k = 0; k < 13; k++) { const x = -52 + k * 10; box(S, x, 0, 29, 9, 8 + (k * 5 % 4) * 2, 8, ['#d9cdb8', '#cfd6d9', '#e0cdb4'][k % 3]); box(S, x, 8 + (k * 5 % 4) * 2, 29, 9.4, .5, 8.4, '#c08a66'); box(S, x + 2, 0, -29, 9, 9 + (k * 7 % 4) * 2, 8, ['#e0cdb4', '#d9cdb8', '#cfd6d9'][k % 3]); box(S, x + 2, 9 + (k * 7 % 4) * 2, -29, 9.4, .5, 8.4, '#b97a5c'); }

      // ---- the bus station: glass shelter with a route sign, bench, timetable, stop pole, ticket machine
      const sx = -1.5, sz = 6.1; c.shade(sx, sz - .3, 4.6, 2.2);
      for (const x of [sx - 2.05, sx, sx + 2.05]) box(S, x, 0, sz + .55, .09, 2.55, .09, '#3d4654');
      for (const x of [sx - 2.05, sx + 2.05]) box(S, x, 0, sz - .75, .07, 2.5, .07, '#3d4654');
      box(S, sx, 2.5, sz - .1, 4.5, .09, 1.75, '#2f5d8a'); box(S, sx, 2.59, sz - .1, 4.2, .05, 1.45, '#3a6c9c'); box(S, sx, 2.36, sz - .95, 4.5, .2, .06, '#f4c152');
      box(S, sx, .32, sz + .57, 4.0, 2.0, .04, '#bcd8e8'); box(S, sx, 1.3, sz + .55, 4.0, .05, .06, '#3d4654'); box(S, sx - 2.07, .32, sz - .1, .04, 2.0, 1.2, '#d6e8f1');
      box(S, sx + 2.07, .32, sz - .1, .05, 2.0, 1.2, '#e8f1f5'); box(S, sx + 2.11, .7, sz - .1, .02, 1.35, .9, '#e63946'); box(S, sx + 2.12, 1.25, sz - .1, .02, .5, .55, '#f7f0dc'); // poster end
      for (const z of [sz + .1, sz + .24, sz + .38]) box(S, sx - .2, .45, z, 2.9, .05, .11, '#9a7350'); box(S, sx - .2, .62, sz + .47, 2.9, .32, .05, '#9a7350'); for (const x of [sx - 1.3, sx + .9]) box(S, x, 0, sz + .24, .07, .45, .44, '#3d4654');
      sign('route', sx, 2.47, sz - .985, 2.4, .2, Math.PI); // faces the road
      sign('route', sx, 2.47, sz - .915, 2.4, .2, 0);
      cyl(S, 5.2, 0, 3.95, .05, 2.9, '#8f98a4', P.cyl6); S.add(P.cyl12, M(5.2, 2.62, 3.99, .36, .06, .36, 0, Math.PI / 2), C('#2f6fc0')); box(S, 5.2, 2.56, 4.07, .44, .14, .02, '#ffffff'); box(S, 5.2, 2.72, 4.07, .14, .2, .02, '#ffffff');
      box(S, 5.2, 1.45, 4.0, .5, .7, .05, '#f3ead8'); box(S, 5.2, 1.95, 4.03, .44, .13, .02, '#2f6fc0'); for (let k = 0; k < 4; k++) box(S, 5.2, 1.53 + k * .1, 4.03, .38, .03, .01, '#9aa5b1');
      c.shade(-4.7, 6.2, .9, .8); box(S, -4.7, 0, 6.3, .62, 1.55, .42, '#2f6fc0'); box(S, -4.7, 1.0, 6.08, .44, .3, .02, '#12151b'); box(S, -4.7, .72, 6.08, .3, .12, .02, '#f4c152'); box(S, -4.7, 1.55, 6.3, .7, .08, .5, '#254f86'); // ticket machine
      bin(-6.0, 6.5); planter(7.6, 8.9, 1.6); planter(-9.4, 8.9, 1.6); planter(13, 8.9);
      // street furniture along the walk
      for (const x of [-22, -9, 8.5, 13.4, 31.5, 44]) lamp(x, 4.15); for (const x of [-15, 2, 16, 33.6, 46]) lamp(x, -4.15);
      tree(-14, 5.6); tree(11.6, 5.4, 4.4); tree(28, 5.6, 4.2); tree(40, 5.5); tree(-26, 5.6, 4.3); tree(-6.4, -5.4); tree(6.6, -5.3, 4.3); tree(17.4, -5.4, 4.5); tree(34.6, -5.4, 4.2); tree(44, -5.4);
      bin(14.6, 8.6); bin(31.3, -7.3); planter(21.4, -7.6, 1.5); planter(32.9, -7.6); planter(-2.4, -7.6, 1.5); planter(16.8, 8.9);
      for (const x of [19.7, 24.7]) { bollard(x, 4.0); bollard(x, -4.0); }
      car(-16, -2.45, '#3b7dd8', -1); car(8.4, -2.45, '#f4f1ea', -1); car(35.5, -2.45, '#45b39d', -1); car(30, 2.45, '#d9473b', 1); car(44, 2.45, '#f2b632', 1);
      // newspaper stand and cafe tables on the near pavement (things to walk past)
      box(S, 10.2, 0, 8.7, 1.5, 1.0, .5, '#3c7fc0'); box(S, 10.2, 1.0, 8.7, 1.6, .06, .6, '#254f86'); for (let k = 0; k < 4; k++) box(S, 9.65 + k * .37, .25, 8.42, .3, .5, .03, ['#f7f0dc', '#e63946', '#f4c152', '#f7f0dc'][k]);
      for (const x of [16.2, 18.2]) { c.shade(x, 8.4, 1.3, 1.3); cyl(S, x, 0, 8.4, .04, .72, '#3d4654', P.cyl6); cyl(S, x, .72, 8.4, .42, .04, '#f7f0dc', P.cyl12); cyl(S, x, 0, 8.4, .22, .03, '#3d4654', P.cyl8); for (const d of [-.65, .65]) { box(S, x + d, 0, 8.4, .36, .45, .36, '#c9653d'); box(S, x + d + Math.sign(d) * .17, .45, 8.4, .04, .42, .36, '#c9653d'); } }
      cyl(S, 17.2, 0, 8.9, .03, 2.3, '#8a6446', P.cyl6); S.add(P.cone8, M(17.2, 2.0, 8.9, 1.5, .5, 1.5), C('#e63946'));

      // ---- Bruno's Gym: door, glove board, name sign, hanging board, bench outside
      const gx = 27, gz = -8.24;
      box(S, gx, 0, gz, 1.66, 2.56, .14, '#3a2b24'); box(S, gx, .02, gz + .12, 1.3, 2.3, .07, '#6b4630'); box(S, gx, 1.25, gz + .17, .86, .8, .03, '#33485c'); box(S, gx, 1.62, gz + .185, .86, .2, .02, '#587891'); box(S, gx, .25, gz + .17, .9, .7, .03, '#5a3a28');
      box(S, gx + .48, 1.02, gz + .2, .06, .22, .07, '#e0b84d'); box(S, gx, 0, gz + .34, 2.1, .1, .62, '#cfc6b6'); box(S, gx, .1, gz + .54, 1.3, .02, .5, '#7a3b34');
      for (const s of [-1, 1]) { box(S, gx + s * 1.25, 2.25, gz + .14, .06, .06, .3, '#2f3640'); cyl(S, gx + s * 1.25, 1.92, gz + .34, .12, .3, '#fff0c4', P.cyl6); S.add(P.cone6, M(gx + s * 1.25, 2.22, gz + .34, .18, .14, .18), C('#2f3640')); }
      box(S, gx, 2.86, gz + .08, 4.6, 1.02, .1, '#0d1118'); box(S, gx, 2.78, gz + .34, 4.9, .08, .5, '#8f2f22'); box(S, gx, 3.9, gz + .1, 4.9, .08, .3, '#8f2f22');
      board(c, "BRUNO'S GYM", gx + .55, 3.38, gz + .2, 3.3, .82); sign('gym', gx - 1.7, 3.38, gz + .2, 1.1, .82);
      box(S, gx - 3.4, 3.0, gz + .64, .05, .05, .9, '#2f3640'); box(S, gx - 3.4, 2.3, gz + .96, .06, .62, .7, '#0d1118'); sign('gym', gx - 3.365, 2.6, gz + .96, .66, .46, Math.PI / 2); sign('gym', gx - 3.435, 2.6, gz + .96, .66, .46, -Math.PI / 2);
      for (const s of [-1, 1]) { box(S, gx + s * 2.9, .32, gz + .15, 1.7, 1.7, .05, '#33485c'); box(S, gx + s * 2.9, .32, gz + .19, 1.7, .08, .06, '#3a2b24'); box(S, gx + s * 2.9, 1.1, gz + .2, .05, .9, .03, '#3a2b24'); box(S, gx + s * 2.9, 1.15, gz + .2, 1.5, .34, .02, s > 0 ? '#e63946' : '#f4c152'); } // windows with a poster strip
      c.shade(gx + 3.3, gz + .9, 1.9, .8); box(S, gx + 3.3, .4, gz + .8, 1.6, .06, .4, '#9a7350'); for (const d of [-.7, .7]) box(S, gx + 3.3 + d, 0, gz + .8, .06, .4, .36, '#3d4654');
      planter(gx - 2.2, gz + .9); planter(gx + 2.0, gz + .9);

      // ---- the bus: two-tone body, a real door well at the front door, sliding door leaves, wheels, lights, route boards
      const B = new K.Batch(), glass = '#33485c', shine = '#587891', dark = '#2a2f38', low = '#f0b429', up = '#f7f0dc';
      box(B, 0, .004, 0, 11.6, .01, 3.1, '#3f4551'); // contact shade on the road
      const body = (x0, x1, z0 = -1.25, z1 = 1.25) => { const x = (x0 + x1) / 2, w = x1 - x0, z = (z0 + z1) / 2, d = z1 - z0; box(B, x, .32, z, w, .2, d - .04, dark); box(B, x, .5, z, w, 1.0, d, low); box(B, x, 1.5, z, w + .02, .1, d + (z1 > 1.2 ? .04 : 0), '#d9473b'); box(B, x, 1.6, z, w, 1.26, d, up); };
      body(-5.4, 3.15); body(4.35, 5.4); body(3.15, 4.35, -1.25, .3);
      box(B, 3.75, 2.46, .78, 1.2, .4, .95, up); box(B, 3.75, .32, .78, 1.2, .1, .95, '#565d6b'); box(B, 3.75, .42, .78, 1.2, .02, .95, '#8a909c'); // door header and step
      box(B, 3.75, .44, .3, 1.2, 2.02, .02, '#3b4350'); box(B, 3.16, .44, .78, .02, 2.02, .95, '#49505e'); box(B, 4.34, .44, .78, .02, 2.02, .95, '#49505e'); cyl(B, 3.3, .44, 1.05, .022, 1.9, '#f4c152', P.cyl6); // well walls, grab pole
      box(B, 0, 2.86, 0, 10.5, .13, 2.3, '#e9e2cc'); box(B, -1.2, 2.99, 0, 2.6, .2, 1.4, '#d9d2bc'); box(B, 2.6, 2.99, 0, 1.2, .14, 1.0, '#d9d2bc');
      for (const [x, w] of [[-4.5, 1.3], [-3.0, 1.3], [.75, 1.3], [2.25, 1.3]]) { box(B, x, 1.72, 1.255, w, .82, .02, glass); box(B, x, 2.34, 1.26, w, .2, .02, shine); }
      for (let k = 0; k < 6; k++) { const x = -4.35 + k * 1.52; box(B, x, 1.72, -1.275, 1.3, .82, .02, glass); box(B, x, 2.34, -1.28, 1.3, .2, .02, shine); }
      box(B, -1.5, .56, 1.26, 1.2, 2.1, .03, dark); for (const d of [-.29, .29]) box(B, -1.5 + d, .7, 1.275, .5, 1.75, .02, glass); // rear door (stays shut)
      box(B, 5.41, 1.42, 0, .03, 1.3, 2.24, glass); box(B, 5.42, 2.3, 0, .02, .42, 2.24, shine); box(B, 5.43, 2.46, 0, .03, .4, 1.9, '#12151b'); box(B, -5.41, 1.7, 0, .03, .85, 2.0, glass);
      for (const s of [-1, 1]) { box(B, 5.42, .6, s * .88, .04, .2, .42, '#fff6d8'); box(B, 5.42, .62, s * .52, .04, .12, .16, '#ffb52e'); box(B, -5.42, .7, s * .9, .04, .3, .3, '#d9473b'); box(B, 5.2, 2.0, s * 1.42, .08, .34, .2, dark); for (const x of [-3.35, 2.35]) { wheel(B, x, .5, s * 1.16 + (s > 0 ? .32 : 0), .5, .32); box(B, x, .98, s * 1.262, 1.3, .1, .02, dark); } }
      box(B, 5.48, .3, 0, .14, .22, 2.52, dark); box(B, -5.48, .3, 0, .14, .22, 2.52, dark);
      const bus = movable(B, 'bus'); bus.position.set(-62, -.15, 1.9); objects.bus = bus;
      const BS = new K.Batch({ uv: true }); sign('route', -.4, 1.0, 1.262, 2.0, .42, 0, BS); sign('route', 5.45, 2.66, 0, 1.8, .36, Math.PI / 2, BS);
      const boards = new THREE.Mesh(BS.geometry(), c.signMat); bus.add(boards); c.disposables.push(boards.geometry);
      objects.doors = [-1, 1].map(s => { const D = new K.Batch(); box(D, 0, .44, 0, .6, 2.0, .04, dark); box(D, 0, .62, .012, .46, 1.7, .03, glass); box(D, s * -.27, 1.2, .04, .03, .5, .03, '#f4c152'); const m = movable(D, 'bus door'); c.S && bus.add(m); m.position.set(3.75 + s * .3, 0, 1.27); m.userData.shut = 3.75 + s * .3; m.userData.open = 3.75 + s * .93; return m; });
      return { x: 2, z: 3, r: 16 };
    });

    /* ------------------------------------------------------------ Bruno's Gym, main hall */
    Sets.register('dream_gym', c => {
      const { K, C, P, M, S, box, cyl, sign, movable, objects, glow: G, pool } = c;
      const A = new K.Batch(); // architecture: receives shadows, casts none (so the room is never black)
      const X = 11, ZB = -7.5, ZF = 12, H = 5.4;
      box(A, 0, -.3, (ZB + ZF) / 2, X * 2, .3, ZF - ZB, '#a9825a');
      for (let x = -X + .32; x < X; x += .32) box(A, x, -.002, (ZB + ZF) / 2, .012, .004, ZF - ZB, '#8d6a47'); // plank joints
      for (let k = 0; k < 40; k++) { const x = -X + .16 + (k * 7 % 68) * .32, z = ZB + 1 + (k * 13 % 18); box(A, x, -.001, z, .3, .004, .012, '#8d6a47'); }
      const wall = (x, z, w, d) => { box(A, x, 0, z, w, 1.25, d, '#8c4a3a'); box(A, x, 1.25, z, w + .04, .09, d + .04, '#5b3a2a'); box(A, x, 1.34, z, w, H - 1.34, d, '#e6dcc6'); box(A, x, 0, z, w + .03, .16, d + .03, '#4a3026'); };
      wall(0, ZB - .15, X * 2, .3); wall(-X - .15, (ZB + ZF) / 2, .3, ZF - ZB); wall(X + .15, (ZB + ZF) / 2, .3, ZF - ZB);
      for (let x = -X; x < X; x += .5) for (let y = .12; y < 1.2; y += .28) box(A, x + (Math.round(y * 10) % 2 ? .12 : .37), y, ZB + .003, .012, .26, .006, '#74392d'); // brick joints on the back wall
      for (let y = .4; y < 1.2; y += .28) box(A, 0, y - .02, ZB + .003, X * 2, .014, .006, '#74392d');
      box(A, 0, H, (ZB + ZF) / 2, X * 2, .2, ZF - ZB, '#d8ceb8'); for (const z of [-4.5, -.5, 3.5, 7.5]) box(A, 0, H - .32, z, X * 2, .32, .26, '#5b3a2a'); // ceiling and beams
      // tall windows on the back wall and the right wall: bright panes, dark frames, light on the floor
      const win = (x, z, side) => { const w = 1.9, h = 2.5, y = 1.9; if (side) { box(A, x, y - .08, z, .08, h + .16, w + .16, '#3a2b24'); G.add(P.box, M(x - side * .03, y, z, .04, h, w), C('#eaf4ff')); box(A, x - side * .06, y, z, .03, h, .06, '#3a2b24'); box(A, x - side * .06, y + h * .55, z, .03, .06, w, '#3a2b24'); pool(x - side * 2.6, z, 2.4, '#fff1d0'); } else { box(A, x, y - .08, z, w + .16, h + .16, .08, '#3a2b24'); G.add(P.box, M(x, y, z + .03, w, h, .04), C('#eaf4ff')); box(A, x, y, z + .06, .06, h, .03, '#3a2b24'); box(A, x, y + h * .55, z + .06, w, .06, .03, '#3a2b24'); pool(x + .8, z + 2.6, 2.4, '#fff1d0'); } };
      win(-7.6, ZB, 0); win(-3.8, ZB, 0); win(3.8, ZB, 0); win(7.6, ZB, 0); win(X, -3, 1); win(X, 2, 1); win(-X, 1, -1);
      const arch = movable(A, 'gym hall'); arch.castShadow = false;

      // ---- the ring (back left): platform, apron, canvas, padded posts, three ropes a side, steps
      const rx = -4.6, rz = -3.3, R = 2.9, top = .92;
      c.shade(rx, rz, R * 2 + .9, R * 2 + .9);
      box(S, rx, 0, rz, R * 2 + .5, top - .06, R * 2 + .5, '#1f3559'); box(S, rx, top - .06, rz, R * 2 + .56, .06, R * 2 + .56, '#e9e4d6'); box(S, rx, .5, rz + R + .26, R * 2 + .5, .16, .02, '#f4c152'); box(S, rx + R + .26, .5, rz, .02, .16, R * 2 + .5, '#f4c152');
      box(S, rx, top, rz, 1.6, .004, 1.6, '#d9d2c0'); sign('gym', rx, top + .006, rz, 1.5, .75, 0); // ring canvas mark (flat board)
      [[-1, -1, '#d9473b'], [1, -1, '#f4f1ea'], [-1, 1, '#f4f1ea'], [1, 1, '#2f6fc0']].forEach(([a, b, col]) => { const px = rx + a * R, pz = rz + b * R; cyl(S, px, top, pz, .07, 1.5, '#3b4350', P.cyl8); box(S, px - a * .1, top + .32, pz - b * .1, .2, 1.1, .2, col); });
      for (const y of [.5, .85, 1.2]) for (const s of [-1, 1]) { box(S, rx, top + y, rz + s * (R - .12), R * 2 - .2, .035, .035, s > 0 && y === .85 ? '#d9473b' : '#f4f1ea'); box(S, rx + s * (R - .12), top + y, rz, .035, .035, R * 2 - .2, y === .85 ? '#2f6fc0' : '#f4f1ea'); }
      for (let k = 0; k < 3; k++) box(S, rx + 1.2, 0, rz + R + .42 + (2 - k) * .3, 1.2, (k + 1) * .29, .3, '#5b3a2a'); // steps on the camera side
      // ---- heavy bags on a beam (back right), speed bag, floor mats
      const bag = (x, z, col, len = 1.15) => { const y1 = 1.02 + len, y0 = 1.02, ch = H - .32 - y1; c.shade(x, z, .8, .8); cyl(S, x, y0, z, .2, len, col, P.cyl20); cyl(S, x, y1 - .1, z, .206, .1, '#1d1f24', P.cyl20); cyl(S, x, y0, z, .206, .08, '#1d1f24', P.cyl20); cyl(S, x, y0 + len * .45, z, .203, .16, '#e9e4d6', P.cyl20); for (let k = 0; k < 4; k++) box(S, x + Math.cos(k * TAU / 4) * .1 * (1 - .0), y1, z + Math.sin(k * TAU / 4) * .1, .016, .5, .016, '#aab2bc'); cyl(S, x, y1 + .5, z, .018, ch - .5, '#8f98a4', P.cyl6); };
      bag(5.6, -2.5, '#8f2f22'); bag(7.9, -4.4, '#2b2f3a', 1.3); bag(8.6, -1.2, '#7a5238', 1.0);
      box(S, 6.8, 0, -3.0, 5.4, .03, 4.6, '#3b4350'); for (let x = 4.2; x < 9.6; x += 1.35) box(S, x, .031, -3.0, .02, .003, 4.6, '#2a2f38');
      box(S, 2.6, 2.2, ZB + .5, 1.1, .08, 1.0, '#5b3a2a'); box(S, 2.6, 1.3, ZB + .08, .9, 1.0, .08, '#5b3a2a'); S.add(P.sph, M(2.6, 1.93, ZB + .55, .14, .2, .14), C('#8f2f22')); cyl(S, 2.6, 2.1, ZB + .55, .03, .1, '#aab2bc', P.cyl6); // speed bag
      // ---- right wall: lockers, bench, water cooler; left wall: glove rack, weights, medicine balls
      for (let k = 0; k < 6; k++) { const z = 4.4 + k * .62, col = ['#4f7a5a', '#3c5c45', '#4f7a5a', '#55657a', '#4f7a5a', '#3c5c45'][k]; box(S, X - .36, 0, z, .6, 1.95, .58, col); box(S, X - .67, 1.45, z, .02, .24, .34, '#2a2f38'); box(S, X - .67, .95, z + .2, .03, .12, .04, '#c9ccd2'); }
      c.shade(X - 1.9, 6.0, .8, 2.6); box(S, X - 1.9, .42, 6.0, .42, .06, 2.4, '#9a7350'); for (const d of [-1, 1]) box(S, X - 1.9, 0, 6.0 + d, .38, .42, .06, '#3d4654');
      box(S, 9.6, 0, ZB + .5, .4, 1.0, .4, '#e8f1f5'); cyl(S, 9.6, 1.0, ZB + .5, .17, .46, '#9fd0ee', P.cyl12); cyl(S, 9.6, 1.46, ZB + .5, .09, .1, '#9fd0ee', P.cyl8);
      box(S, -X + .28, 1.5, 5.2, .1, .06, 2.6, '#5b3a2a'); for (let k = 0; k < 5; k++) { const z = 4.2 + k * .5, col = ['#d9473b', '#2f6fc0', '#1d1f24', '#d9473b', '#f4c152'][k]; S.add(P.sph, M(-X + .42, 1.32, z, .11, .15, .12), C(col)); cyl(S, -X + .42, 1.42, z, .012, .1, '#3b4350', P.cyl6); }
      for (let k = 0; k < 3; k++) { S.add(P.sph, M(-X + .7 + (k % 2) * .5, .22, 7.4 + k * .5, .22, .22, .22), C(['#7a5238', '#3b4350', '#8f2f22'][k])); }
      box(S, -X + .55, 0, 9.2, .5, .5, 1.5, '#3b4350'); for (let k = 0; k < 4; k++) { cyl(S, -X + .55, .55, 8.7 + k * .34, .09, .3, '#2a2f38', P.cyl8, 0, Math.PI / 2); }
      // ---- back wall between the windows: old fight posters, the champion's photo and belt, clock, bell
      const poster = (x, y, w, h, bg, bar) => { box(S, x, y, ZB + .01, w + .08, h + .08, .03, '#3a2b24'); box(S, x, y + .04, ZB + .03, w, h, .02, bg); box(S, x, y + h * .62, ZB + .045, w * .8, h * .16, .01, bar); box(S, x, y + h * .2, ZB + .045, w * .6, h * .08, .01, '#2a2f38'); S.add(P.sph, M(x, y + h * .46, ZB + .05, w * .16, h * .12, .01), C('#2a2f38')); };
      poster(-5.7, 1.75, .8, 1.15, '#f3ead8', '#d9473b'); poster(-1.9, 1.75, .8, 1.15, '#f4c152', '#1f3559'); poster(1.9, 2.75, .7, 1.0, '#e9e2cc', '#2f6fc0'); poster(5.7, 1.75, .8, 1.15, '#f3ead8', '#3c5c45');
      box(S, 0, 2.0, ZB + .01, 1.5, 1.1, .04, '#5b3a2a'); box(S, 0, 2.06, ZB + .035, 1.36, .98, .02, '#d6cbb4'); S.add(P.sph, M(0, 2.62, ZB + .05, .2, .22, .02), C('#6f4a31')); box(S, 0, 2.1, ZB + .05, .5, .36, .02, '#6f4a31'); // the champion, years ago
      box(S, 0, 1.52, ZB + .06, 1.3, .2, .06, '#8f2f22'); S.add(P.cyl12, M(0, 1.62, ZB + .12, .2, .05, .2, 0, Math.PI / 2), C('#f4c152')); for (const s of [-1, 1]) S.add(P.cyl8, M(s * .42, 1.62, ZB + .11, .1, .04, .1, 0, Math.PI / 2), C('#e0b84d')); // his belt
      S.add(P.cyl12, M(-9.4, 3.3, ZB + .04, .34, .06, .34, 0, Math.PI / 2), C('#f7f0dc')); box(S, -9.4, 3.3, ZB + .08, .03, .26, .02, '#1d1f24'); box(S, -9.3, 3.3, ZB + .08, .2, .03, .02, '#1d1f24');
      S.add(P.hemi, M(9.5, 2.6, ZB + .12, .16, .14, .16, 0, Math.PI / 2), C('#e0b84d')); box(S, 9.5, 2.3, ZB + .04, .3, .5, .04, '#5b3a2a');
      // store room door (right of the ring) and Bruno's office door
      for (const [x, lab] of [[1.2, '#f4c152'], [8.4, '#9fc3e6']]) { box(S, x, 0, ZB + .01, 1.16, 2.2, .06, '#3a2b24'); box(S, x, .03, ZB + .04, .98, 2.08, .04, '#6b4630'); box(S, x + .38, 1.02, ZB + .09, .05, .16, .05, '#e0b84d'); box(S, x, 1.7, ZB + .07, .5, .16, .01, lab); }
      // stool, bucket and towel near the ring corner, a mop against the wall
      cyl(S, -1.3, 0, -1.0, .2, .5, '#8f2f22', P.cyl12); cyl(S, -1.3, .5, -1.0, .23, .05, '#1d1f24', P.cyl12); cyl(S, -.75, 0, -1.3, .17, .32, '#aab2bc', P.cyl12, 0, 0, .2); box(S, -.75, .3, -1.3, .3, .03, .22, '#f1ece0');
      cyl(S, 3.4, 0, ZB + .35, .02, 1.6, '#c9a36a', P.cyl6, .18); box(S, 3.4, 0, ZB + .62, .34, .08, .14, '#d8d2c4');
      // hanging lamps: enamel shades, bright bulbs, warm pools on the floor
      pool(0, 1.0, 2.8, '#ffe2a8'); for (const [x, z] of [[-4.6, -3.3], [-2.4, 3.4], [2.6, 3.6], [7.2, -.6], [-6, 5.5], [6, 5.5]]) { cyl(S, x, 3.6, z, .012, H - 3.6, '#2a2f38', P.cyl6); S.add(P.cone8, M(x, 3.42, z, .46, .26, .46), C('#2f5d4a')); G.add(P.sph, M(x, 3.44, z, .1, .1, .1), C('#fff3cf')); pool(x, z, 2.6, '#ffe2a8'); }
      return { x: 0, z: 0, r: 13 };
    });
  }
  if (window.StorySets) register(); else window.addEventListener('DOMContentLoaded', register);
  window.DreamSets = { register };
})();
