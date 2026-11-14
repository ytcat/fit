/* Bare paws for the Fighter (GOTR-0100): big, powerful lion (or rabbit) hands for street clothes, ringless fights and
 * hand wraps. Each paw is one vertex-coloured mesh on the hand bone (one draw call) with a morph target: the base is the
 * relaxed, half-open hand (fingers slightly curled), the morph is a real fist (fingers rolled into the palm, thumb across
 * the middle finger bones). Four thick fingers with knuckles, a thumb, short dark retracted claws, fur in the coat colour
 * on the back with a few tufts at the wrist, a lighter palm, dark leather pads (a big palm pad, a pad on every finger).
 * The curl follows the pose: DreamPose sets rig.pawCurl[side] for the everyday gestures (relaxed when walking or talking,
 * a fist for "fist" / "pound"); anything else (boxing, guard, a ringless fight) closes the fist. Gloves are untouched.
 * Hand frame (as the gloves): -y from the wrist to the knuckles, +z the palm, the thumb on -x for the right hand.
 * API: LionPaws.attach(rig, { fur, pad }) -> [meshL, meshR] ; LionPaws.wraps(rig) -> [meshL, meshR] ; LionPaws.curl(rig, side) */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const LOOK = {
    lion: { fur: '#b98143', back: '#a8733a', palm: '#e1c497', pad: '#6a443d', padHi: '#8f5e53', claw: '#2b2420', tuft: '#9c6a34', scale: 1.0, finger: 1.0, claws: 1 },
    rabbit: { fur: '#939ba7', back: '#858d99', palm: '#e8e1d8', pad: '#b98c90', padHi: '#d2a9ab', claw: '#d9d2c4', tuft: '#c2c8d0', scale: .94, finger: .9, claws: .55 }
  };
  let unit = null; const sphere = () => unit || (unit = new THREE.SphereGeometry(1, 13, 10).toNonIndexed());

  /** A paw as a list of pieces (ellipsoids): position, axes (x across, y along, z palm-facing), radii, colour(u) on the unit sphere. */
  function pieces(side, curl, L) {
    const s = side === 'L' ? -1 : 1, th = -s, out = [], k = L.scale, f = L.finger;
    const C = name => lin(L[name]);
    const fur = C('fur'), back = C('back'), palm = C('palm'), pad = C('pad'), padHi = C('padHi'), claw = C('claw'), tuft = C('tuft');
    const add = (pos, ax, ay, r, col) => { const az = ax.clone().cross(ay).normalize(); out.push({ pos: pos.multiplyScalar(k), ax, ay, az, r: r.multiplyScalar(k), col }); };
    const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
    // back of the hand and the palm: fur on the back, a lighter palm with a big dark pad
    const handCol = u => u.z > .3 ? palm.clone().lerp(fur, .3 * (1 - u.z)) : u.z > 0 ? fur.clone().lerp(palm, u.z / .3) : back.clone().lerp(fur, .35 + .3 * u.y);
    add(V(0, -.058, -.004), X, Y, V(.072, .06, .044), handCol);
    add(V(0, -.004, -.002), X, Y, V(.058, .045, .052), u => u.z > .5 ? palm.clone().lerp(fur, .5) : fur.clone().multiplyScalar(.96 + .05 * u.y)); // wrist
    add(V(0, -.076, .039), X, Y, V(.05, .04, .013), u => u.z > .3 ? pad.clone().lerp(padHi, .35 * smooth((u.y + .2) / .9)) : pad.clone()); // palm pad (heart-shaped: two lobes below)
    for (const sx of [-1, 1]) add(V(sx * .024, -.104, .034), X, Y, V(.03, .022, .011), u => pad.clone().lerp(padHi, .25 * (u.z > .3 ? 1 : 0)));
    // four thick fingers: knuckle bump, proximal and distal segments, a pad and a short retracted claw at each tip
    const xs = [-.053, -.0178, .0178, .053], len = [.054, .058, .056, .049].map(v => v * f), lenD = [.043, .046, .045, .039].map(v => v * f), rad = [.0215, .0225, .022, .0198].map(v => v * f);
    const a1 = lerp(.22, 1.62, curl), a2 = lerp(.38, 1.95, curl); // finger bends (radians) toward the palm
    for (let i = 0; i < 4; i++) {
      const x = xs[i] * (1 - .08 * curl), knuckle = V(x, -.11 + (i === 1 || i === 2 ? -.005 : .004), -.006);
      add(knuckle.clone().add(V(0, .004, -.012)), X, Y, V(rad[i] * 1.1, .018, .016), u => back.clone().lerp(fur, .4 + .4 * u.y)); // knuckle bump
      const d1 = V(0, -Math.cos(a1), Math.sin(a1)), p1 = V(0, Math.sin(a1), Math.cos(a1)), mid1 = knuckle.clone().addScaledVector(d1, len[i] / 2), j1 = knuckle.clone().addScaledVector(d1, len[i]);
      add(mid1, X, d1.clone().negate(), V(rad[i], len[i] / 2 + rad[i] * .55, rad[i] * .95), u => u.z > .6 ? palm.clone().lerp(pad, .25) : fur.clone().lerp(back, .3 * (u.z < -.3 ? 1 : 0)));
      const aa = a1 + a2, d2 = V(0, -Math.cos(aa), Math.sin(aa)), mid2 = j1.clone().addScaledVector(d2, lenD[i] / 2), tip = j1.clone().addScaledVector(d2, lenD[i]);
      add(mid2, X, d2.clone().negate(), V(rad[i] * .95, lenD[i] / 2 + rad[i] * .5, rad[i] * .92), u => u.z > .45 && u.y < .3 ? pad.clone().lerp(padHi, .3 * smooth(u.z)) : fur.clone().multiplyScalar(.97));
      add(j1.clone(), X, d1.clone().negate(), V(rad[i] * .98, rad[i] * .85, rad[i] * .9), u => fur.clone().lerp(back, .2)); // the middle knuckle
      const n2 = V(0, Math.sin(aa), Math.cos(aa)); // palm-facing of the tip
      if (L.claws) add(tip.clone().addScaledVector(d2, -.004).addScaledVector(n2, -rad[i] * .45), X, d2.clone().negate(), V(.0065 * L.claws, .013 * L.claws, .0055 * L.claws), u => claw.clone().lerp(lin('#6d625a'), .4 * smooth(u.y))); // short retracted claw
    }
    // thumb: along the side of the palm when relaxed; across the middle finger bones in a fist
    { const base = V(th * .062, -.052, .022), tipR = V(th * .086, -.118, .05), tipF = V(-th * .006, -.135, .086), tp = tipR.clone().lerp(tipF, smooth(curl)), midR = V(th * .082, -.088, .036), midF = V(th * .046, -.112, .074), mp = midR.clone().lerp(midF, smooth(curl));
      const seg = (a, b, r, col) => { const d = b.clone().sub(a), l = d.length(); d.normalize(); const ax = Math.abs(d.dot(Z)) > .9 ? X.clone() : Z.clone().cross(d).normalize(); add(a.clone().lerp(b, .5), ax, d.clone().negate(), V(r, l / 2 + r * .5, r * .95), col); };
      seg(base, mp, .024 * f, u => fur.clone().lerp(palm, .35 * smooth(-u.x * th)));
      seg(mp, tp, .021 * f, u => fur.clone().lerp(pad, .5 * smooth(-u.x * th - .3)));
      if (L.claws) add(tp.clone().add(V(0, -.012, .006 * (1 - curl))).lerp(tp, .3), X, Y, V(.006 * L.claws, .011 * L.claws, .005 * L.claws), u => claw.clone()); }
    // a few tufts of fur at the wrist (back and sides)
    for (const ang of [-2.4, -1.9, -1.35, -.8, -.25, th * 1.75, th * 2.25]) { // tufts lying on the fur at the wrist, pointing toward the hand
      const n = V(Math.sin(ang), 0, Math.cos(ang)), at = n.clone().multiplyScalar(.052).add(V(0, -.012, 0)), ay = V(0, 1, 0).addScaledVector(n, -.35).normalize(), ax = n.clone().cross(ay).normalize();
      add(at, ax, ay, V(.012, .026, .0045), u => tuft.clone().lerp(fur, .5 * smooth(u.y)));
    }
    return out;
  }
  function geometry(side, curl, L, colours) {
    const S = sphere(), P = S.attributes.position, N = S.attributes.normal, pos = [], nor = [], col = [], u = V(), n = V(), m = new THREE.Matrix3();
    for (const q of pieces(side, curl, L)) {
      m.set(q.ax.x, q.ay.x, q.az.x, q.ax.y, q.ay.y, q.az.y, q.ax.z, q.ay.z, q.az.z);
      for (let i = 0; i < P.count; i++) {
        u.fromBufferAttribute(P, i); const p = V(u.x * q.r.x, u.y * q.r.y, u.z * q.r.z).applyMatrix3(m).add(q.pos); pos.push(p.x, p.y, p.z);
        n.set(u.x / q.r.x, u.y / q.r.y, u.z / q.r.z).applyMatrix3(m).normalize(); nor.push(n.x, n.y, n.z);
        if (colours) { const c = q.col(u); col.push(c.r, c.g, c.b); }
      }
    }
    return { pos, nor, col };
  }
  const mats = {};
  const material = () => mats.paw || (mats.paw = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: 0, morphTargets: true, morphNormals: true }));
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

  /** Big bare paws on both hand bones. Returns [L, R]. */
  function attach(rig, o = {}) {
    const L = { ...(LOOK[rig.species] || LOOK.lion) }; if (o.fur && rig.species !== 'rabbit' && rig.species !== 'lion') L.fur = o.fur;
    const out = [];
    for (const side of ['L', 'R']) {
      const relaxed = geometry(side, 0, L, true), fist = geometry(side, 1, L, false), g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(relaxed.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(relaxed.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(relaxed.col, 3));
      g.morphAttributes.position = [new THREE.Float32BufferAttribute(fist.pos, 3)]; g.morphAttributes.normal = [new THREE.Float32BufferAttribute(fist.nor, 3)]; g.computeBoundingSphere(); g.boundingSphere.radius += .05;
      const m = new THREE.Mesh(g, material()); m.name = 'Bare hand'; m.userData.storyPart = true; m.userData.mane = true; m.userData.paw = side; m.castShadow = true; m.updateMorphTargets(); m.morphTargetInfluences[0] = 1;
      const st = { v: 1, t: 0 };
      m.onBeforeRender = () => { const want = curl(rig, side), t = now(), dt = st.t ? clamp(t - st.t, 0, .2) : 1; st.t = t; st.v = lerp(st.v, want, dt >= 1 ? 1 : 1 - Math.exp(-dt * 14)); m.morphTargetInfluences[0] = st.v; };
      rig.joints['hand' + side].add(m); out.push(m);
    }
    return out;
  }
  /** How closed the paw should be now: the everyday pose sets it (fresh within 1.5 s); otherwise a fist (boxing, fights). */
  function curl(rig, side) { const c = rig.pawCurl?.[side]; return c && now() - c.at < 1.5 ? c.v : 1; }
  /** Hand wraps over the paws: turns round the palm and the wrist, an X over the back of the hand; fingers and thumb free. */
  function wraps(rig) {
    const L = LOOK[rig.species] || LOOK.lion, k = L.scale, out = [], cloth = lin('#f1ece0'), edge = lin('#d6cfbf');
    // the cross-section of the paw (back of hand + wrist ellipsoids) at height y, plus the cloth's thickness
    const half = y => { const a = (y + .058) / .06, w = (y + .004) / .045, hx = Math.max(a * a < 1 ? .072 * Math.sqrt(1 - a * a) : 0, w * w < 1 ? .058 * Math.sqrt(1 - w * w) : 0), hz = Math.max(a * a < 1 ? .044 * Math.sqrt(1 - a * a) : 0, w * w < 1 ? .052 * Math.sqrt(1 - w * w) : 0); const palmZ = y < -.03 && y > -.1 ? .056 : 0, tuftR = y > -.03 ? .061 : 0; return [Math.max(hx, .045, tuftR), Math.max(hz, .035, palmZ, tuftR)]; }; // over the palm pad and the wrist tufts
    for (const side of ['L', 'R']) {
      const pos = [], nor = [], col = [], NU = 40;
      const band = (y0, y1, tw = 0) => { // a turn of cloth from y0 to y1 (a tilt tw makes it run diagonally over the back)
        const rows = 4, P = [];
        for (let r = 0; r <= rows; r++) { const row = []; for (let i = 0; i <= NU; i++) { const a = i / NU * Math.PI * 2, y = lerp(y0, y1, r / rows) + tw * Math.cos(a), [hx, hz] = half(y), bulge = .0035 + .0015 * Math.sin(r / rows * Math.PI); row.push(V(Math.sin(a) * (hx + bulge), y, -.004 + Math.cos(a) * (hz + bulge)).multiplyScalar(k)); } P.push(row); }
        for (let r = 0; r < rows; r++) for (let i = 0; i < NU; i++) { const q = [P[r][i], P[r][i + 1], P[r + 1][i], P[r + 1][i + 1]], n1 = q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])).normalize().negate(), c = r === 0 || r === rows - 1 ? edge : cloth;
          for (const p of [q[0], q[2], q[1], q[1], q[2], q[3]]) { pos.push(p.x, p.y, p.z); const nn = V(p.x, 0, p.z + .004 * k).normalize(); nor.push(nn.x, nn.y, nn.z); col.push(c.r, c.g, c.b); } }
      };
      band(.018, .0, 0); band(.001, -.017, 0); band(-.016, -.034, 0); // the wrist, three turns
      band(-.04, -.06, .006); band(-.058, -.078, -.006); band(-.075, -.094, 0); // round the palm below the knuckles
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, mats.wrap || (mats.wrap = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: THREE.DoubleSide }))); m.name = 'Hand wraps'; m.userData.storyPart = true; m.userData.mane = true; m.castShadow = true;
      rig.joints['hand' + side].add(m); out.push(m);
    }
    return out;
  }
  window.LionPaws = { attach, wraps, curl, LOOK };
})();
