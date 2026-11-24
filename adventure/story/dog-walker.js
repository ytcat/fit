/* A woman walking her dog on the far pavement of the opening street (ch1-motion; PR #40 "Street life"). She replaces the
 * geometric cat-with-a-dog figure of street-life.js: the same townsfolk as the crowds (ArenaSets.spectators: an animal head
 * with muzzle, nose, eyes and ears, a shaped body in everyday clothes, arms with hands, legs with shoes), here made into ONE
 * skinned mesh on a small skeleton so she can walk; the dog is one skinned mesh too (a body with chest and rump, the
 * crowds' dog head, four two-segment legs with paws, a wagging tail, a collar) and the leash is a thin tube.
 *
 * Motion (all pure functions of the scene time, so a seek gives the same picture as playing through):
 *   her walk: the planted foot moves back in her frame at exactly her walking speed (no sliding), the swing foot leaves and
 *   lands at ground speed; the pelvis bobs and turns a little, the free arm swings against the legs, the leash hand is held
 *   forward at the hip. The dog walks a four-beat walk (hind left, fore left, hind right, fore right) beside and a little
 *   ahead of her, drifting in and out; its paws are planted the same way (its step phase comes from its own path).
 *   The leash has a fixed length: the dog is never further than 98.5 % of it from her hand (it cannot stretch), it hangs in a
 *   parabola with the sag of a rope of that length, attached to her hand and the dog's collar, on the dog's side of her
 *   (it never crosses her body).
 *
 *   DogWalker.build(o) -> { group, person, dog, leash, update(t, at), probe(), stats(), dispose() } | null without ArenaSets
 *     o: { species, fur, muzzle, top, legs, shoes, dog (colour), side: +1 dog on her right | -1 left, seed }
 *     at: { x, z, ry, dist } her place on the pavement at time t (StreetLife.walkerAt)
 *   probe(): QA numbers for this frame: her soles and the dog's paws (world, y above the pavement), the leash chord and its
 *     length, and the smallest clearance between the leash and her legs and body, the dog's body and the ground (metres).
 *   DogWalker.LEASH = 1.05 (m). World: y up, the pavement at y 0; a person faces +z when ry = 0. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); }, lerp = (a, b, t) => a + (b - a) * t;
  const lin = h => { const c = new THREE.Color(h).convertSRGBToLinear(); return [c.r, c.g, c.b]; }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const herm = (a, b, ma, mb, w) => { const w2 = w * w, w3 = w2 * w; return (2 * w3 - 3 * w2 + 1) * a + (w3 - 2 * w2 + w) * ma + (-2 * w3 + 3 * w2) * b + (w3 - w2) * mb; };
  const LEASH = 1.05;

  /* ---------------------------------------------------------------- one skinned mesh from weighted parts */
  // bones: [{ name, parent, at: [x, y, z] rest position in the mesh frame }]; verts carry up to two bone weights
  function skinned(bones, build, material) {
    const bs = bones.map(b => { const o = new THREE.Bone(); o.name = b.name; return o; });
    bones.forEach((b, i) => { const p = b.parent >= 0 ? bones[b.parent].at : [0, 0, 0]; bs[i].position.set(b.at[0] - p[0], b.at[1] - p[1], b.at[2] - p[2]); if (b.parent >= 0) bs[b.parent].add(bs[i]); });
    const pos = [], nor = [], col = [], si = [], sw = [], idx = [];
    const add = (g, m, colorOf, weightOf) => { // g: indexed geometry; m: placement matrix; colorOf(vertex index, local pos) -> [r,g,b]; weightOf(world pos, comp) -> [[bone, w], ...]
      const P = g.attributes.position, N = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(m), base = pos.length / 3, v = V(), n = V(), flip = m.determinant() < 0;
      const comp = components(g);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); const c = colorOf(i, n); col.push(c[0], c[1], c[2]);
        const w = weightOf(v, comp.of[i], comp); const a = w[0] || [0, 1], b = w[1] || [0, 0], tot = a[1] + b[1] || 1;
        si.push(a[0], b[0], 0, 0); sw.push(a[1] / tot, b[1] / tot, 0, 0);
      }
      const I = g.index; if (I) for (let i = 0; i < I.count; i += 3) { const A = base + I.getX(i), B = base + I.getX(i + 1), C = base + I.getX(i + 2); if (flip) idx.push(A, C, B); else idx.push(A, B, C); }
      else for (let i = 0; i < P.count; i++) idx.push(base + i);
    };
    build(add);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.setIndex(idx);
    const mesh = new THREE.SkinnedMesh(geo, material); mesh.add(bs[0]); mesh.bind(new THREE.Skeleton(bs)); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.bones = Object.fromEntries(bs.map(b => [b.name, b])); mesh.userData.rest = Object.fromEntries(bones.map(b => [b.name, V(...b.at)])); return mesh;
  }
  /** Connected parts of an indexed geometry (each tube, sphere or shell of a crowd prototype is its own part): centroid and extent. */
  function components(g) {
    const P = g.attributes.position, n = P.count, par = new Int32Array(n).map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const I = g.index; if (I) for (let i = 0; i < I.count; i += 3) { const a = find(I.getX(i)), b = find(I.getX(i + 1)), c = find(I.getX(i + 2)); par[b] = a; par[find(c)] = a; }
    const of = new Int32Array(n), stats = new Map(), v = V();
    for (let i = 0; i < n; i++) { const r = find(i); of[i] = r; v.fromBufferAttribute(P, i); let s = stats.get(r); if (!s) stats.set(r, s = { c: V(), n: 0, lo: V(1e9, 1e9, 1e9), hi: V(-1e9, -1e9, -1e9) }); s.c.add(v); s.n++; s.lo.min(v); s.hi.max(v); }
    for (const s of stats.values()) s.c.divideScalar(s.n);
    return { of, stats };
  }
  /** Turns a bone so that its rest direction `rest` (parent space) points along world direction `dir`. */
  function aim(bone, rest, dir) { const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); bone.quaternion.setFromUnitVectors(rest, dir.clone().applyQuaternion(pq).normalize()); bone.updateMatrixWorld(true); }
  /** Two-bone leg: upper and lower bone (rest directions), root joint world position, target world position, bend toward pole. */
  function twoBone(upper, lower, r1, r2, l1, l2, target, pole) {
    const H = upper.getWorldPosition(V()), d = target.clone().sub(H), len = clamp(d.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * .9995), dir = d.normalize();
    const a = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    const knee = H.clone().addScaledVector(dir, a).addScaledVector(perp, h), end = H.clone().addScaledVector(dir, len);
    aim(upper, r1, knee.clone().sub(H)); aim(lower, r2, end.sub(knee));
  }

  /* ---------------------------------------------------------------- her: a crowd townsperson on a walking skeleton */
  // ArenaSets palette slots: fur, muzzle, eye, glint, inner ear, mane, cloth, shirt, legs, shoes, hat, hat band, phone, chair, stripe, nose
  function palette(o) {
    const fur = lin(o.fur), P = []; P[0] = fur; P[1] = mix(fur, lin(o.muzzle || '#f2ece2'), .75); P[2] = lin('#110d0b'); P[3] = lin('#f6f3ec'); P[4] = mix(fur, lin('#2a201c'), .5); P[5] = mix(fur, lin('#3a2414'), .3);
    P[6] = lin(o.top); P[7] = lin(o.shirt || '#e8e4da'); P[8] = lin(o.legs); P[9] = lin(o.shoes); P[10] = P[6]; P[11] = mix(P[6], [0, 0, 0], .35); P[12] = lin('#16171a'); P[13] = P[12]; P[14] = lin('#d8dcd8'); P[15] = lin(o.nose || '#141212'); return P;
  }
  const HUMAN = [ // rest joints of the crowd body (arena-sets.js ARM.down / LEG.stand), sides by the sign of x
    { name: 'root', parent: -1, at: [0, 0, 0] }, { name: 'hips', parent: 0, at: [0, .87, 0] }, { name: 'spine', parent: 1, at: [0, 1.06, 0] }, { name: 'chest', parent: 2, at: [0, 1.26, 0] }, { name: 'head', parent: 3, at: [0, 1.46, 0] },
    { name: 'thighP', parent: 1, at: [.095, .865, 0] }, { name: 'shinP', parent: 5, at: [.105, .48, .02] }, { name: 'footP', parent: 6, at: [.11, .085, -.005] },
    { name: 'thighN', parent: 1, at: [-.095, .865, 0] }, { name: 'shinN', parent: 8, at: [-.105, .48, .02] }, { name: 'footN', parent: 9, at: [-.11, .085, -.005] },
    { name: 'armP', parent: 3, at: [.16, 1.36, -.005] }, { name: 'foreP', parent: 11, at: [.238, 1.07, -.025] }, { name: 'handP', parent: 12, at: [.25, .83, .02] },
    { name: 'armN', parent: 3, at: [-.16, 1.36, -.005] }, { name: 'foreN', parent: 14, at: [-.238, 1.07, -.025] }, { name: 'handN', parent: 15, at: [-.25, .83, .02] }
  ];
  const HEAD_AT = [0, 1.57, .015], HEAD_S = 1.12;
  function person(o) {
    const parts = window.ArenaSets.spectators.parts({ tier: 2, species: o.species, outfit: o.outfit || 'jacket', pose: 'idle', legPose: 'stand' }), P = palette(o), B = Object.fromEntries(HUMAN.map((b, i) => [b.name, i]));
    const shade = n => .72 + .28 * (.5 + .5 * n.y); // the crowds' soft occlusion under chins, arms and hems
    const colour = g => { const S = g.attributes.slot; return (i, n) => { const c = P[S ? S.getX(i) : 0] || P[0], k = shade(n); return [c[0] * k, c[1] * k, c[2] * k]; }; };
    const two = (a, b, k) => [[a, 1 - k], [b, k]];
    const body = (v, ci, comp) => {
      const s = comp.stats.get(ci), side = s.c.x >= 0 ? 'P' : 'N', y = v.y, ax = Math.abs(s.c.x);
      if (s.c.y > 1.38 && ax < .08) return two(B.chest, B.head, smooth((y - 1.42) / .08));                                     // neck
      if (ax > .17 && s.c.y > .7 && s.c.y < 1.36 && s.hi.y - s.lo.y > .12) {                                                     // an arm (shoulder to wrist)
        if (y > 1.3) return two(B['arm' + side], B.chest, smooth((y - 1.32) / .06) * .6);
        return two(B['arm' + side], B['fore' + side], smooth((1.11 - y) / .07));
      }
      if (ax > .17 && s.c.y > .7 && s.c.y < .9) return [[B['hand' + side], 1]];                                                // a hand
      if (s.c.y < .13 && ax > .05) return [[B['foot' + side], 1]];                                                              // a shoe
      if (ax > .05 && s.c.y < .8) { if (y > .8) return two(B['thigh' + side], B.hips, smooth((y - .8) / .07)); return two(B['thigh' + side], B['shin' + side], smooth((.53 - y) / .09)); } // a leg
      return y < .96 ? two(B.hips, B.spine, smooth((y - .9) / .08)) : y < 1.2 ? two(B.spine, B.chest, smooth((y - 1.16) / .08)) : [[B.chest, 1]]; // the torso and the clothes on it
    };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: .82 });
    const mesh = skinned(HUMAN, add => {
      add(parts.body, new THREE.Matrix4(), colour(parts.body), body);
      add(parts.head, new THREE.Matrix4().compose(V(...HEAD_AT), new THREE.Quaternion(), V(HEAD_S, HEAD_S, HEAD_S)), colour(parts.head), () => [[B.head, 1]]);
    }, mat);
    mesh.name = 'townsperson ' + (o.id || o.species); return mesh;
  }
  const P_STRIDE = 1.12, P_DUTY = .62, ANK = .085;
  /** Her pose at step phase ph (cycles), in her own frame (the mesh at her place and turn); side = the leash hand's side. */
  function walkPerson(m, ph, side, t) {
    const b = m.userData.bones, r = m.userData.rest, S = P_STRIDE, D = P_DUTY;
    const foot = (p, s) => { // ankle (rig space) and pitch for one leg at its phase (0 = heel strike)
      p = ((p % 1) + 1) % 1; const x = s * .1;
      if (p < D) { const z = S * (D / 2 - p), off = smooth((p - .42) / (D - .42)), pitch = .32 * off; return { x, y: ANK + .09 * Math.sin(pitch), z, pitch, planted: true }; } // the heel comes up over the ball at the end (the toes stay down)
      const w = (p - D) / (1 - D), m0 = -S * (1 - D), z = herm(-S * D / 2, S * D / 2, m0, m0, w);
      return { x, y: ANK + .06 * Math.sin(Math.PI * Math.pow(w, .7)) ** 1.1 + .09 * Math.sin(.32 * (1 - smooth(w / .4))), z, pitch: lerp(.32, -.12, smooth(w / .7)) * (1 - smooth((w - .85) / .15)), planted: false };
    };
    const legs = [foot(ph, 1), foot(ph + .5, -1)];
    const bob = Math.cos(ph * 2 * TAU), yaw = .06 * Math.cos(ph * TAU);
    b.hips.rotation.set(.03, yaw, .035 * Math.sin(ph * TAU)); b.spine.rotation.set(.02, -yaw * .8, 0); b.chest.rotation.set(0, -yaw * .4, 0); b.head.rotation.set(-.05 + .02 * Math.sin(t * .4), .25 * side * Math.max(0, Math.sin(t * .23 + 1)) ** 3, 0); // now and then she glances at the dog
    const l1 = r.shinP.distanceTo(r.thighP), l2 = r.footP.distanceTo(r.shinP); let hy = .855 + .012 * bob;
    for (const L of legs) { const dx = L.x - Math.sign(L.x) * .095, dz = L.z; hy = Math.min(hy, L.y + Math.sqrt(Math.max(.01, ((l1 + l2) * .995) ** 2 - dx * dx - dz * dz)) + .005); }
    b.hips.position.y = hy; m.updateMatrixWorld(true);
    const fwd = V(0, 0, 1).transformDirection(m.matrixWorld);
    for (const [L, s] of [[legs[0], 'P'], [legs[1], 'N']]) {
      twoBone(b['thigh' + s], b['shin' + s], r['shin' + s].clone().sub(r['thigh' + s]).normalize(), r['foot' + s].clone().sub(r['shin' + s]).normalize(), l1, l2, m.localToWorld(V(L.x, L.y, L.z)), fwd);
      const want = m.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(L.pitch, 0, 0))), sq = b['shin' + s].getWorldQuaternion(new THREE.Quaternion()).invert();
      b['foot' + s].quaternion.copy(sq.multiply(want));
    }
    // arms: the free one swings against its leg; the leash hand forward at the hip, elbow bent, a little give with each step
    for (const s of ['P', 'N']) {
      const sg = s === 'P' ? 1 : -1, leg = sg > 0 ? ph : ph + .5, leash = sg === side;
      b['arm' + s].rotation.set(leash ? -.42 + .04 * Math.sin(leg * TAU) : -.3 * Math.sin(leg * TAU + Math.PI), 0, sg * (leash ? .1 : .05));
      b['fore' + s].rotation.set(leash ? -.62 : -.22 - .1 * Math.max(0, Math.sin(leg * TAU)), 0, 0); b['hand' + s].rotation.set(leash ? .2 : 0, 0, 0);
    }
    m.updateMatrixWorld(true);
    return legs;
  }

  /* ---------------------------------------------------------------- the dog */
  const DOGB = [
    { name: 'root', parent: -1, at: [0, 0, 0] }, { name: 'body', parent: 0, at: [0, .41, 0] }, { name: 'neck', parent: 1, at: [0, .46, .24] }, { name: 'head', parent: 2, at: [0, .58, .33] }, { name: 'tail', parent: 1, at: [0, .47, -.27] },
    { name: 'FPu', parent: 1, at: [.075, .38, .19] }, { name: 'FPl', parent: 5, at: [.075, .22, .16] }, { name: 'FNu', parent: 1, at: [-.075, .38, .19] }, { name: 'FNl', parent: 7, at: [-.075, .22, .16] },
    { name: 'HPu', parent: 1, at: [.075, .38, -.18] }, { name: 'HPl', parent: 9, at: [.075, .17, -.22] }, { name: 'HNu', parent: 1, at: [-.075, .38, -.18] }, { name: 'HNl', parent: 11, at: [-.075, .17, -.22] }
  ];
  const PAW = { F: [0, .04, .19], H: [0, .04, -.17] }; // paw rest (x from the side) under each leg
  const D_STRIDE = .64, D_DUTY = .64, D_LEGS = [['HN', 0], ['FN', .25], ['HP', .5], ['FP', .75]];
  function dogMesh(o) {
    const B = Object.fromEntries(DOGB.map((b, i) => [b.name, i])), coat = lin(o.dog || '#c79257'), light = mix(coat, lin('#f1e6d2'), .6), dark = mix(coat, lin('#3a2616'), .45);
    const shade = (c, n) => { const k = .74 + .26 * (.5 + .5 * n.y); return [c[0] * k, c[1] * k, c[2] * k]; };
    const head = window.ArenaSets.spectators.parts({ tier: 2, species: 'dog', outfit: 'tee' }).head, hp = palette({ fur: o.dog || '#c79257', muzzle: '#f1e6d2', top: '#000', legs: '#000', shoes: '#000' });
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: .9 });
    const at = (x, y, z, sx, sy, sz, rx = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), V(sx, sy, sz));
    const seg = (a, b, r0, r1) => { const A = V(...a), Bp = V(...b), len = A.distanceTo(Bp), m = new THREE.Matrix4().compose(A.clone().lerp(Bp, .5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), Bp.clone().sub(A).normalize()), V(1, 1, 1)); return [new THREE.CylinderGeometry(r1, r0, len, 9, 2), m]; };
    const mesh = skinned(DOGB, add => {
      const one = (bone, c = coat) => [(i, n) => shade(c, n), () => [[bone, 1]]];
      const byZ = (back, front, z0, z1) => (v) => [[back, 1 - smooth((v.z - z0) / (z1 - z0))], [front, smooth((v.z - z0) / (z1 - z0))]];
      const ball = new THREE.SphereGeometry(1, 14, 10);
      add(ball, at(0, .42, -.02, .125, .13, .3), (i, n) => shade(n.y < -.4 ? light : coat, n), () => [[B.body, 1]]);              // barrel, lighter belly
      add(ball, at(0, .43, .16, .12, .145, .14), (i, n) => shade(n.z > .5 && n.y < .3 ? light : coat, n), () => [[B.body, 1]]);   // chest
      add(ball, at(0, .43, -.19, .115, .12, .12), (i, n) => shade(coat, n), () => [[B.body, 1]]);                                // rump
      const [ng, nm] = seg([0, .45, .2], [0, .59, .33], .075, .06); add(ng, nm, (i, n) => shade(coat, n), (v) => [[B.body, 1 - smooth((v.y - .47) / .1)], [B.neck, smooth((v.y - .47) / .1)]]);
      add(new THREE.TorusGeometry(.068, .012, 6, 14), at(0, .547, .29, 1, 1, 1, -.82), (i, n) => shade(lin('#a8322c'), n), () => [[B.neck, 1]]); // collar
      add(head, at(0, .615, .37, .74, .74, .74, .15), (() => { const S = head.attributes.slot; return (i, n) => { const c = hp[S.getX(i)] || hp[0], k = .74 + .26 * (.5 + .5 * n.y); return [c[0] * k, c[1] * k, c[2] * k]; }; })(), () => [[B.head, 1]]);
      const [tg, tm] = seg([0, .47, -.27], [0, .6, -.46], .03, .012); add(tg, tm, (i, n) => shade(dark, n), () => [[B.tail, 1]]);
      for (const [L, s] of [['F', 1], ['F', -1], ['H', 1], ['H', -1]]) {
        const sd = s > 0 ? 'P' : 'N', u = DOGB[B[L + sd + 'u']].at, l = DOGB[B[L + sd + 'l']].at, p = [u[0], PAW[L][1] + .02, PAW[L][2]];
        const [ug, um] = seg(u, l, L === 'H' ? .06 : .045, .033); add(ug, um, (i, n) => shade(coat, n), () => [[B[L + sd + 'u'], 1]]);
        const [lg, lm] = seg(l, p, .03, .026); add(lg, lm, (i, n) => shade(coat, n), () => [[B[L + sd + 'l'], 1]]);
        add(ball, at(p[0], .03, p[2] + .025, .035, .028, .05), (i, n) => shade(light, n), () => [[B[L + sd + 'l'], 1]]);       // paw
      }
    }, mat);
    mesh.name = 'dog'; return mesh;
  }
  /** The dog's pose at its own step phase; legs planted on the pavement under its frame. */
  function walkDog(d, ph, t, wag) {
    const b = d.userData.bones, r = d.userData.rest, S = D_STRIDE, D = D_DUTY;
    b.body.position.y = .41 + .01 * Math.cos(ph * 2 * TAU); b.body.rotation.set(0, .04 * Math.sin(ph * TAU), .03 * Math.sin(ph * TAU));
    b.neck.rotation.set(-.08 + .05 * Math.sin(ph * 2 * TAU), 0, 0); b.head.rotation.set(.1 + .06 * Math.sin(t * 1.3), .25 * Math.sin(t * .37), 0); b.tail.rotation.set(-.2, 0, .45 * Math.sin(t * wag));
    d.updateMatrixWorld(true); const back = V(0, 0, -1).transformDirection(d.matrixWorld), fwd = back.clone().negate(), paws = [];
    for (const [L, off] of D_LEGS) {
      const p = (((ph + off) % 1) + 1) % 1, F = L[0], u = b[L + 'u'], l = b[L + 'l'], ru = r[L + 'u'], rl = r[L + 'l'], x = ru.x;
      let z, y;
      if (p < D) { z = PAW[F][2] + S * (D / 2 - p); y = .035; }
      else { const w = (p - D) / (1 - D), m0 = -S * (1 - D); z = PAW[F][2] + herm(-S * D / 2, S * D / 2, m0, m0, w); y = .035 + .055 * Math.sin(Math.PI * w); }
      const target = d.localToWorld(V(x, y, z)), pr = V(x, .035, PAW[F][2]);
      twoBone(u, l, rl.clone().sub(ru).normalize(), pr.clone().sub(rl).normalize(), rl.distanceTo(ru), pr.distanceTo(rl), target, F === 'F' ? back : fwd); // elbows back, stifles forward
      paws.push({ at: target, planted: p < D });
    }
    d.updateMatrixWorld(true); return paws;
  }

  /* ---------------------------------------------------------------- the leash: a tube of fixed length from her hand to the collar */
  const SEG = 22, RAD = 5;
  function leashMesh() {
    const g = new THREE.BufferGeometry(), n = (SEG + 1) * RAD, idx = [];
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) { const a = i * RAD + j, b = i * RAD + (j + 1) % RAD; idx.push(a, b, a + RAD, b, b + RAD, a + RAD); } g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x8a2f2a, roughness: .6 })); m.name = 'leash'; m.frustumCulled = false; m.castShadow = true; return m;
  }
  /** Points of a rope of length L hung between A and B (a parabola with the sag of that length; taut when the ends are L apart). */
  function rope(A, B, L) {
    const c = A.distanceTo(B), at = sag => { const pts = []; for (let i = 0; i <= SEG; i++) { const u = i / SEG, p = A.clone().lerp(B, u); p.y -= sag * 4 * u * (1 - u); pts.push(p); } return pts; };
    const len = pts => { let n = 0; for (let i = 1; i < pts.length; i++) n += pts[i].distanceTo(pts[i - 1]); return n; };
    let lo = 0, hi = L, sag = 0; if (c < L) for (let k = 0; k < 24; k++) { sag = (lo + hi) / 2; if (len(at(sag)) > L) hi = sag; else lo = sag; } // the sag that makes the drawn rope exactly L long
    return { pts: at(sag), chord: c, sag };
  }
  function shapeLeash(mesh, pts) {
    const P = mesh.geometry.attributes.position, N = mesh.geometry.attributes.normal, t = V(), a = V(), b = V(), r = .007;
    for (let i = 0; i <= SEG; i++) {
      t.subVectors(pts[Math.min(SEG, i + 1)], pts[Math.max(0, i - 1)]).normalize(); a.set(0, 1, 0).cross(t); if (a.lengthSq() < 1e-6) a.set(1, 0, 0); a.normalize(); b.crossVectors(t, a);
      for (let j = 0; j < RAD; j++) { const th = j / RAD * TAU, nx = a.x * Math.cos(th) + b.x * Math.sin(th), ny = a.y * Math.cos(th) + b.y * Math.sin(th), nz = a.z * Math.cos(th) + b.z * Math.sin(th), k = i * RAD + j; P.setXYZ(k, pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r); N.setXYZ(k, nx, ny, nz); }
    }
    P.needsUpdate = true; N.needsUpdate = true; mesh.geometry.computeBoundingSphere();
  }
  const segDist = (p, a, b) => { const ab = b.clone().sub(a), u = clamp(p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, u)); };

  function build(o = {}) {
    if (!window.ArenaSets?.spectators?.parts) return null;
    const side = o.side || 1, group = new THREE.Group(); group.name = 'dog walker';
    const her = person(o), dog = dogMesh(o), leash = leashMesh(); group.add(her, dog, leash);
    // where the dog walks, in her frame: beside her on the leash side and a little ahead, drifting (pure in time)
    const wide = t => .62 + .05 * Math.sin(t * .41 + 2.3), taut = t => .95 + .008 * Math.sin(t * .53 + 1.1) + .004 * Math.sin(t * 1.7);
    // how far ahead: the leash ring on the collar (0.29 m in front of the dog's middle, 0.6 m up) is `taut` of the leash length from her
    // leash hand as she carries it (0.29 m out, 0.91 m up, 0.37 m ahead): a leash with a little slack, never a loop on the ground
    const lead = t => { const k = taut(t) * LEASH, dx = wide(t) - .29, dy = .6 - .91; return .37 - .29 + Math.sqrt(Math.max(.04, k * k - dx * dx - dy * dy)); };
    // the dog's own path length (its step phase): her distance plus the drift ahead and across, integrated once per 1/20 s
    const table = [0], DT = .05, speedOf = (t, v) => { const dl = (lead(t + .01) - lead(t - .01)) / .02, dw = (wide(t + .01) - wide(t - .01)) / .02; return Math.hypot(v + dl, dw); };
    const dogDist = (t, at) => { const v = Math.max(.3, at.speed || 1.15); if (t <= 0) return at.dist; const n = Math.ceil(t / DT); while (table.length <= n) { const k = table.length; table.push(table[k - 1] + DT * speedOf((k - .5) * DT, v)); } const i = Math.floor(t / DT), f = t / DT - i; return at.dist - v * t + table[i] + (table[i + 1] - table[i]) * f; };
    let last = null;
    function update(t, at) {
      her.position.set(at.x, 0, at.z); her.rotation.set(0, at.ry, 0); her.updateMatrixWorld(true);
      const legs = walkPerson(her, at.dist / P_STRIDE + (o.seed || 0), side, t);
      const hand = her.userData.bones[side > 0 ? 'handP' : 'handN'].localToWorld(V(0, -.035, .025));
      // the dog: its place in her frame (the leash side), then pulled in so the leash is never more than 92 % taut
      const f = V(Math.sin(at.ry), 0, Math.cos(at.ry)), sx = V(Math.cos(at.ry), 0, -Math.sin(at.ry)).multiplyScalar(side), lz = lead(t), lx = wide(t);
      const pos = V(at.x, 0, at.z).addScaledVector(f, lz).addScaledVector(sx, lx);
      // the dog faces along its own path: her walking direction plus its drift in and out
      const v = Math.max(.3, at.speed || 1.15), dw = (wide(t + .05) - wide(t - .05)) / .1, dl = (lead(t + .05) - lead(t - .05)) / .1, vel = f.clone().multiplyScalar(v + dl).addScaledVector(sx, dw);
      dog.position.copy(pos); dog.rotation.set(0, Math.atan2(vel.x, vel.z), 0); dog.updateMatrixWorld(true);
      let collar = dog.localToWorld(V(0, .6, .29)), chord = collar.distanceTo(hand);
      if (chord > LEASH * .999) { const pull = collar.clone().sub(hand).setY(0).setLength(chord - LEASH * .975); dog.position.sub(pull); dog.updateMatrixWorld(true); collar = dog.localToWorld(V(0, .6, .29)); }
      const paws = walkDog(dog, dogDist(t, at) / D_STRIDE + .37, t, 8 + 2 * Math.sin(t * .3));
      collar = dog.localToWorld(V(0, .6, .29));
      const R = rope(hand, collar, LEASH); shapeLeash(leash, R.pts);
      last = { her, dog, hand, collar, R, legs, paws };
    }
    function probe() {
      if (!last) return null; const { her, dog, hand, collar, R } = last, b = her.userData.bones, d = dog.userData.bones, w = o => o.getWorldPosition(V());
      const feet = ['P', 'N'].map(s => { const f = b['foot' + s], q = f.localToWorld(V(0, -.085, .05)); return [+q.x.toFixed(4), +q.y.toFixed(4), +q.z.toFixed(4)]; });
      const paws = ['FP', 'FN', 'HP', 'HN'].map(L => { const F = L[0], rl = dog.userData.rest[L + 'l'], q = d[L + 'l'].localToWorld(V(rl.x, .035, PAW[F][2]).sub(rl)); return [+q.x.toFixed(4), +(q.y - .035).toFixed(4), +q.z.toFixed(4)]; });
      // clearance of the leash: her legs and body (capsules), the dog's body, the ground; the first and last 8 cm are at the hand and the collar
      const caps = [];
      for (const s of ['P', 'N']) { caps.push([w(b['thigh' + s]), w(b['shin' + s]), .085], [w(b['shin' + s]), w(b['foot' + s]), .065]); }
      caps.push([w(b.hips), w(b.chest), .17], [w(d.body).add(V(0, 0, 0)).addScaledVector(V(0, 0, -1).transformDirection(dog.matrixWorld), .2), w(d.body).addScaledVector(V(0, 0, 1).transformDirection(dog.matrixWorld), .16), .13]);
      let hit = Infinity, who = -1, whereAt = null, ground = Infinity; const L0 = R.pts.length;
      R.pts.forEach((p, i) => { const along = i / (L0 - 1) * LEASH; ground = Math.min(ground, p.y); if (along < .1 || along > LEASH - .12) return; caps.forEach(([a, c, r], k) => { const d = segDist(p, a, c) - r; if (d < hit) { hit = d; who = k; whereAt = [+along.toFixed(2), +p.y.toFixed(3)]; } }); });
      let len = 0; for (let i = 1; i < L0; i++) len += R.pts[i].distanceTo(R.pts[i - 1]);
      return { feet, paws, leash: { span: +R.chord.toFixed(4), length: LEASH, drawn: +len.toFixed(4), sag: +R.sag.toFixed(4), clear: +hit.toFixed(4), near: ["thigh+", "shin+", "thigh-", "shin-", "body", "dog"][who] || null, nearAt: whereAt, ground: +ground.toFixed(4), hand: hand.toArray().map(v => +v.toFixed(3)), collar: collar.toArray().map(v => +v.toFixed(3)) } };
    }
    function stats() { let tris = 0; for (const m of [her, dog, leash]) tris += m.geometry.index.count / 3; return { meshes: 3, triangles: tris }; }
    function dispose() { group.parent?.remove(group); for (const m of [her, dog, leash]) { m.geometry.dispose(); m.material.dispose(); } }
    return { group, person: her, dog, leash, update, probe, stats, dispose };
  }

  window.DogWalker = { build, LEASH, rope };
})();
