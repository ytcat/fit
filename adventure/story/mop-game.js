/* Clean the gym (GOTR-0099), the night shift (2026-11-22 rebuild): Bruno's Gym after closing. Nobody else is there; the
 * hall lamps are off except one hanging lamp over the floor and the light left on in the store room; moonlight falls
 * through the tall windows and the city glows outside. The Fighter (street clothes) holds a real string mop in both hands
 * and walks after it; the strands drag and splay on the boards; the mopped floor shines wet and dries; the dirt (shoe
 * scuffs, chalk, sweat drops, footprints) is painted into one floor texture and fades as it is cleaned (rules:
 * mop-core.js). A dirty mop smears: tap the yellow bucket (or drag the mop into it, or press R) to rinse it.
 * One floor canvas + a small mask, merged meshes, no change to any character body (no index swaps). */
(() => {
  'use strict';
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const Core = () => window.MopCore;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const words = {
    en: { title: 'Night shift', goal: 'Floor clean', help: 'Drag to mop. Tap the bucket to rinse.', keyboard: 'Arrows move, hold Space to mop, R rinses.', finish: 'Finish shift', pay: 'Pay +{n} ◈',
      rinse: 'Rinse', mop: 'Mop', clock: 'Lights out', stroke: 'Clean stroke', smear: 'Smear! Rinse the mop', rinsed: 'Clean mop', dirty: 'Mop is dirty', sec: '+{n}s',
      zone: { ring: 'Ring corner clean', bags: 'Bag area clean', floor: 'Middle clean' }, lightsOut: 'Lights out', noteTitle: 'Note on the door',
      note: 'Floor before midnight. The lights go off on their own. Rinse the mop when it turns grey. — B.', detail: '{p}% clean · areas {a}/{b} · smears {s} · rinses {r}' },
    he: { title: 'משמרת לילה', goal: 'רצפה נקייה', help: 'גררו כדי לנגב. הקישו על הדלי כדי לשטוף.', keyboard: 'חצים לתנועה, רווח לחוץ לניגוב, R לשטיפה.', finish: 'סיום משמרת', pay: 'שכר +{n} ◈',
      rinse: 'לשטוף', mop: 'מגב', clock: 'כיבוי אורות', stroke: 'משיכה נקייה', smear: 'מריחה! שטפו את המגב', rinsed: 'מגב נקי', dirty: 'המגב מלוכלך', sec: '+{n} שנ׳',
      zone: { ring: 'פינת הזירה נקייה', bags: 'אזור השקים נקי', floor: 'המרכז נקי' }, lightsOut: 'האורות כבו', noteTitle: 'פתק על הדלת',
      note: 'הרצפה עד חצות. האורות כבים לבד. כשהמגב מאפיר, תשטוף אותו. — ב.', detail: '{p}% נקי · אזורים {a}/{b} · מריחות {s} · שטיפות {r}' },
    ru: { title: 'Ночная смена', goal: 'Чистый пол', help: 'Ведите, чтобы мыть. Нажмите на ведро, чтобы прополоскать.', keyboard: 'Стрелки — движение, пробел — мыть, R — прополоскать.', finish: 'Закончить', pay: 'Оплата +{n} ◈',
      rinse: 'Прополоскать', mop: 'Швабра', clock: 'Свет погаснет', stroke: 'Чистый проход', smear: 'Разводы! Прополощи швабру', rinsed: 'Швабра чистая', dirty: 'Швабра грязная', sec: '+{n} с',
      zone: { ring: 'У ринга чисто', bags: 'У мешков чисто', floor: 'Середина чистая' }, lightsOut: 'Свет погас', noteTitle: 'Записка на двери',
      note: 'Пол — до полуночи. Свет гаснет сам. Посереет швабра — прополощи. — Б.', detail: '{p}% чисто · зоны {a}/{b} · разводы {s} · полоскания {r}' }
  };
  const fallback = { who: 'fighter', text: { en: 'Just me and the floor.', he: 'רק אני והרצפה.', ru: 'Только я и пол.' } };
  const lang = () => ['en', 'he', 'ru'].includes(window.app?.lang) ? window.app.lang : 'en';
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  let mounted = null; // the overlay of the running shift (one at a time)

  /* ------------------------------------------------------------ input + DOM overlay */
  function mount({ surface, canvas, camera, getSim }) {
    let active = null;
    const R = Core().MOP, ray = new THREE.Raycaster(), plane = new THREE.Plane(V(0, 1, 0), 0), at = V(), ndc = new THREE.Vector2();
    const rect = () => canvas.getBoundingClientRect(), host = surface.parentElement, w = words[lang()] || words.en;
    const project = (x, z, y = 0) => { camera.updateMatrixWorld(); const p = V(x, y, z).project(camera), r = rect(); return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 }; };
    const floorAt = (cx, cy) => {
      const r = rect();
      if (!r.width || !r.height || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
      ndc.set(2 * (cx - r.left) / r.width - 1, 1 - 2 * (cy - r.top) / r.height); camera.updateMatrixWorld(); ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, at) ? { x: at.x, z: at.z } : null;
    };
    // a touch a little past the edge slides the mop along the edge; the bucket is its own target
    const point = (cx, cy) => {
      const p = floorAt(cx, cy); if (!p) return null;
      if (Core().atBucket(p) || Core().inFloor(p)) return p;
      if (p.x < R.minX - .5 || p.x > R.maxX + .5 || p.z < R.minZ - .5 || p.z > R.maxZ + .5) return null;
      return { x: clamp(p.x, R.minX, R.maxX), z: clamp(p.z, R.minZ, R.maxZ) };
    };
    const nearBucket = (cx, cy) => { const b = project(R.bucket.x, R.bucket.z, .2); return Math.hypot(cx - b.x, cy - b.y) < 46; };
    const clear = () => { const id = active; active = null; getSim()?.clearInput(); if (id != null && surface.hasPointerCapture?.(id)) surface.releasePointerCapture(id); };
    const onDown = e => {
      if (active !== null || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (nearBucket(e.clientX, e.clientY)) { e.preventDefault(); getSim()?.rinse(); return; }
      const p = point(e.clientX, e.clientY);
      if (!p || !getSim()?.begin(p)) return;
      active = e.pointerId; e.preventDefault(); surface.focus({ preventScroll: true }); surface.setPointerCapture?.(active);
    };
    const onMove = e => { if (active !== e.pointerId) return; e.preventDefault(); const p = point(e.clientX, e.clientY); if (!p) { clear(); return; } getSim()?.drag(p); };
    const onEnd = e => { if (e.pointerId === active) clear(); };
    const stopEvents = ['pointerup', 'pointercancel', 'lostpointercapture'];
    surface.addEventListener('pointerdown', onDown); surface.addEventListener('pointermove', onMove);
    for (const e of stopEvents) surface.addEventListener(e, onEnd);
    for (const e of ['resize', 'blur']) window.addEventListener(e, clear);
    surface.addEventListener('blur', clear);
    // ---- overlay: clock and mop gauge in the HUD card, the rinse button on the bucket, Bruno's note, pops, the dark
    const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; };
    const chips = el('div', 'mop-night-chips'), clock = el('span', 'mop-night-clock'), gauge = el('span', 'mop-night-gauge'), gFill = el('i'), gLab = el('b', '', w.mop);
    clock.setAttribute('aria-label', w.clock); gauge.append(gLab, el('span', 'mop-night-meter'));
    gauge.lastChild.append(gFill); chips.append(clock, gauge);
    (host?.querySelector('.story-mop-hud') || host)?.append(chips);
    const rinse = el('button', 'mop-night-rinse', w.rinse); rinse.type = 'button';
    rinse.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); getSim()?.rinse(); });
    rinse.addEventListener('click', e => { if (e.detail === 0) getSim()?.rinse(); }); // keyboard / screen reader
    const note = el('div', 'mop-night-note'); note.append(el('strong', '', w.noteTitle), el('p', '', w.note)); note.dir = 'auto';
    const dark = el('div', 'mop-night-dark'), pops = el('div', 'mop-night-pops');
    host?.append(dark, pops, note, rinse);
    const O = {
      w, clock, gauge, gFill, rinse, note, dark, pops, project, seen: 0, sim: null,
      pop(text, kind, x, z) {
        const p = project(x, z, .25), r = host.getBoundingClientRect(), n = el('div', 'mop-night-pop', text); n.dataset.kind = kind; n.dir = 'auto';
        n.style.left = (p.x - r.left).toFixed(0) + 'px'; n.style.top = (p.y - r.top).toFixed(0) + 'px'; pops.append(n); setTimeout(() => n.remove(), 1100);
      }
    };
    mounted = O;
    return {
      clear, project,
      dispose() {
        clear(); surface.removeEventListener('pointerdown', onDown); surface.removeEventListener('pointermove', onMove); surface.removeEventListener('blur', clear);
        for (const e of stopEvents) surface.removeEventListener(e, onEnd);
        for (const e of ['resize', 'blur']) window.removeEventListener(e, clear);
        for (const n of [chips, rinse, note, dark, pops]) n.remove();
        if (mounted === O) mounted = null;
      }
    };
  }

  /* ------------------------------------------------------------ small geometry helpers (merged, vertex coloured) */
  function merge(parts) { // parts: [geometry, matrix, hex]; one non-indexed geometry with colours
    const pos = [], nor = [], col = [], c = new THREE.Color(), nm = new THREE.Matrix3(), v = V();
    for (const [g0, m, hex] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0; c.set(hex); nm.getNormalMatrix(m);
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
      if (g !== g0) g.dispose(); g0.dispose();
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  }
  const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
  const canvasTex = (w, h, draw, srgb = true) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); if (srgb) t.encoding = THREE.sRGBEncoding; return t; };

  /* ------------------------------------------------------------ the night: lights, windows, moon on the floor */
  function night(scene, set, own) {
    scene.background = new THREE.Color('#06080e'); scene.fog = new THREE.Fog('#05070c', 13, 30);
    set.group.traverse(o => {
      if (o.isHemisphereLight) { o.color.set(0x5f78b8); o.groundColor.set(0x24180f); o.intensity = .34; }
      else if (o.isAmbientLight) o.intensity = .05;
      else if (o.isMesh && (o.name === 'glow' || o.name === 'light pools')) o.visible = false; // day windows and the hall lamps' pools: off
    });
    const moon = set.sun, dir = V(-.3, .62, -.72).normalize();
    if (moon) {
      moon.color.set(0x9db6ff); moon.intensity = .62;
      const f0 = set.focus; set.focus = (x, z, r) => { f0(x, z, r); moon.target.position.set(x, 0, z); moon.target.updateMatrixWorld(); moon.position.set(x + dir.x * 40, dir.y * 40, z + dir.z * 40); moon.updateMatrixWorld(); };
      set.focus(1.6, -.6, 9);
    }
    const g = new THREE.Group(); g.name = 'night in the gym'; scene.add(g);
    // the city through the windows: one panorama, each window shows its own slice of it (back wall + side walls)
    const sky = own(canvasTex(1024, 320, (c, W, H) => {
      const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#070b1c'); gr.addColorStop(.55, '#17193a'); gr.addColorStop(.8, '#4a2c3c'); gr.addColorStop(1, '#a2562c'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(230,236,255,${.25 + r() * .55})`; c.fillRect(r() * W, r() * H * .45, 1.4, 1.4); }
      const mx = 360, my = 70; const halo = c.createRadialGradient(mx, my, 6, mx, my, 70); halo.addColorStop(0, 'rgba(210,222,255,.55)'); halo.addColorStop(1, 'rgba(210,222,255,0)'); c.fillStyle = halo; c.fillRect(mx - 80, my - 80, 160, 160);
      c.fillStyle = '#eef2ff'; c.beginPath(); c.arc(mx, my, 17, 0, 7); c.fill(); c.fillStyle = 'rgba(160,170,200,.35)'; c.beginPath(); c.arc(mx + 5, my - 3, 5, 0, 7); c.arc(mx - 6, my + 6, 3.5, 0, 7); c.fill();
      for (let x = 0; x < W;) { // skyline: dark blocks, a water tower, lit windows
        const bw = 26 + r() * 60, bh = H * (.2 + r() * .42); c.fillStyle = r() < .5 ? '#0b0d18' : '#10121f'; c.fillRect(x, H - bh, bw, bh);
        if (r() < .15) { c.fillRect(x + bw * .3, H - bh - 18, bw * .4, 14); c.fillRect(x + bw * .45, H - bh - 4, 3, 6); }
        for (let y = H - bh + 8; y < H - 6; y += 9) for (let xx = x + 4; xx < x + bw - 5; xx += 7) if (r() < .16) { c.fillStyle = r() < .7 ? 'rgba(255,196,110,.85)' : 'rgba(190,220,255,.7)'; c.fillRect(xx, y, 3, 4); }
        x += bw + 2 + r() * 6;
      }
      const glow = c.createLinearGradient(0, H * .7, 0, H); glow.addColorStop(0, 'rgba(255,140,60,0)'); glow.addColorStop(1, 'rgba(255,150,70,.35)'); c.fillStyle = glow; c.fillRect(0, H * .7, W, H * .3);
    }));
    const wins = [[-7.6, -7.5, 0], [-3.8, -7.5, 0], [3.8, -7.5, 0], [7.6, -7.5, 0], [11, -3, 1], [11, 2, 1], [-11, 1, -1]];
    const pos = [], uv = [], idx = [];
    wins.forEach(([x, z, side], i) => {
      const w = 1.9, h = 2.5, y = 1.9, u0 = (i % 6) / 6, u1 = u0 + 1 / 6, n = pos.length / 3;
      const pts = side ? [[x - side * .056, y - h / 2, z + side * w / 2], [x - side * .056, y - h / 2, z - side * w / 2], [x - side * .056, y + h / 2, z - side * w / 2], [x - side * .056, y + h / 2, z + side * w / 2]] : [[x - w / 2, y - h / 2, z + .056], [x + w / 2, y - h / 2, z + .056], [x + w / 2, y + h / 2, z + .056], [x - w / 2, y + h / 2, z + .056]];
      for (const p of pts) pos.push(...p); uv.push(u0, 0, u1, 0, u1, 1, u0, 1); idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    });
    const wg = own(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); wg.setIndex(idx);
    const windows = new THREE.Mesh(wg, own(new THREE.MeshBasicMaterial({ map: sky, toneMapped: false, fog: false, side: THREE.DoubleSide }))); windows.name = 'night windows'; g.add(windows);
    // moonlight through the back windows: the window shape (with its cross) laid on the boards toward the camera
    const moonTex = own(canvasTex(128, 160, (c, W, H) => {
      c.fillStyle = '#fff'; c.filter = 'blur(5px)'; c.fillRect(10, 10, W - 20, H - 20); c.filter = 'none';
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,.85)'; c.fillRect(W / 2 - 3, 0, 6, H); c.fillRect(0, H * .42, W, 6);
    }, false));
    const mp = [], mu = [], mi = [];
    for (const x of [-7.6, -3.8, 3.8, 7.6]) {
      const k = 1 / Math.tan(.66), kx = .3 / .72, n = mp.length / 3, zb = -7.5, y0 = .65, y1 = 3.15;
      const near = [x - .95 + y0 * kx * .55, zb + y0 * k], far = [x - .95 + y1 * kx * .55, zb + y1 * k];
      mp.push(near[0], .016, near[1], near[0] + 1.9, .016, near[1], far[0] + 1.9, .016, far[1], far[0], .016, far[1]); mu.push(0, 1, 1, 1, 1, 0, 0, 0); mi.push(n, n + 2, n + 1, n, n + 3, n + 2);
    }
    const mg = own(new THREE.BufferGeometry()); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); mg.setAttribute('uv', new THREE.Float32BufferAttribute(mu, 2)); mg.setIndex(mi);
    const moonPools = new THREE.Mesh(mg, own(new THREE.MeshBasicMaterial({ map: moonTex, color: '#4d6aa8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })));
    moonPools.renderOrder = 1; moonPools.name = 'moonlight on the floor'; g.add(moonPools);
    // the store room door (back wall, x 1.2) left ajar: a warm line of light and its fan on the floor
    const fan = own(canvasTex(64, 128, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(W * .42, 0); c.lineTo(W * .58, 0); c.lineTo(W, H); c.lineTo(0, H); c.fill(); }, false));
    const fanMesh = new THREE.Mesh(own(new THREE.PlaneGeometry(1.5, 2.6).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: fan, color: '#a8662a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    fanMesh.position.set(1.62, .017, -7.5 + 1.3); fanMesh.renderOrder = 1; g.add(fanMesh);
    const slit = new THREE.Mesh(own(new THREE.BoxGeometry(.05, 2.04, .02)), own(new THREE.MeshBasicMaterial({ color: '#ffc07a', toneMapped: false }))); slit.position.set(1.66, 1.05, -7.5 + .09); g.add(slit);
    const store = new THREE.PointLight(0xffb066, .55, 7, 1.6); store.position.set(1.65, 1.6, -6.7); g.add(store);
    // the one hanging lamp still on, over the floor: cable, enamel shade, bulb, a soft cone of light and its pool
    const lamp = new THREE.Group(); lamp.position.set(1.65, 5.2, -.9); g.add(lamp);
    const cable = new THREE.Mesh(own(new THREE.CylinderGeometry(.008, .008, 1.75, 5)), own(new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: .8 }))); cable.position.y = -.87; lamp.add(cable);
    const shade = new THREE.Mesh(own(new THREE.CylinderGeometry(.06, .3, .22, 18, 1, true)), own(new THREE.MeshStandardMaterial({ color: '#2f5d4a', roughness: .5, metalness: .2, side: THREE.DoubleSide }))); shade.position.y = -1.8; lamp.add(shade);
    const bulbMat = own(new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false })), bulb = new THREE.Mesh(own(new THREE.SphereGeometry(.06, 12, 8)), bulbMat); bulb.position.y = -1.9; lamp.add(bulb);
    const coneTex = own(canvasTex(8, 128, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); }, false));
    const beamMat = own(new THREE.MeshBasicMaterial({ map: coneTex, color: '#ffcf8a', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false }));
    const beam = new THREE.Mesh(own(new THREE.CylinderGeometry(.28, 1.8, 3.2, 24, 1, true)), beamMat); beam.position.y = -1.9 - 1.6; beam.renderOrder = 4; lamp.add(beam);
    const poolTex = own(canvasTex(64, 64, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 1, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); }, false));
    const poolMat = own(new THREE.MeshBasicMaterial({ map: poolTex, color: '#6b4a22', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const pool = new THREE.Mesh(own(new THREE.PlaneGeometry(4.6, 4.2).rotateX(-Math.PI / 2)), poolMat); pool.position.set(1.65, .018, -.6); pool.renderOrder = 1; g.add(pool);
    const spot = new THREE.SpotLight(0xffc27a, 2.4, 11, .95, .75, 1.25); spot.position.set(1.65, 3.25, -.9); spot.target.position.set(1.65, 0, -.4); spot.name = 'the hanging lamp'; g.add(spot, spot.target);
    return { g, lamp, spot, bulbMat, beamMat, poolMat, store };
  }

  /* ------------------------------------------------------------ the floor: dirt art, mask, wet sheen */
  const FW = 512, FH = 488;
  function floor(sim, own, parent) {
    const R = Core().MOP, sx = FW / (R.maxX - R.minX), sz = FH / (R.maxZ - R.minZ), X = x => (x - R.minX) * sx, Z = z => (z - R.minZ) * sz;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const art = mk(FW, FH), view = mk(FW, FH), mask = mk(sim.nx, sim.nz), wet = mk(sim.nx, sim.nz), rough = mk(sim.nx, sim.nz);
    const a = art.getContext('2d'), v = view.getContext('2d'), mc = mask.getContext('2d'), wc = wet.getContext('2d'), rc = rough.getContext('2d');
    const wm = mk(sim.nx, sim.nz), wmc = wm.getContext('2d'), wmi = wmc.createImageData(sim.nx, sim.nz), mi = mc.createImageData(sim.nx, sim.nz), wi = wc.createImageData(sim.nx, sim.nz), ri = rc.createImageData(sim.nx, sim.nz);
    drawStains(a, sim.stains, X, Z, sx);
    const sheen = mk(FW, FH), sc = sheen.getContext('2d'), sheenArt = mk(FW, FH), sa = sheenArt.getContext('2d'); // soft streaks of reflected light on wet boards
    { let r = 3; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647; sa.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const x = rnd() * FW, y = rnd() * FH, l = 30 + rnd() * 90, g = sa.createLinearGradient(x, y - l / 2, x, y + l / 2); g.addColorStop(0, 'rgba(190,210,240,0)'); g.addColorStop(.5, `rgba(205,222,248,${.5 + rnd() * .5})`); g.addColorStop(1, 'rgba(190,210,240,0)'); sa.strokeStyle = g; sa.lineWidth = 2 + rnd() * 6; sa.beginPath(); sa.moveTo(x, y - l / 2); sa.lineTo(x + (rnd() - .5) * 10, y + l / 2); sa.stroke(); }
      sa.globalCompositeOperation = 'source-in'; sa.fillStyle = 'rgba(205,222,248,.55)'; sa.fillRect(0, 0, FW, FH); }
    const map = own(new THREE.CanvasTexture(view)); map.encoding = THREE.sRGBEncoding; map.anisotropy = 4;
    const rmap = own(new THREE.CanvasTexture(rough));
    const mat = own(new THREE.MeshStandardMaterial({ map, roughnessMap: rmap, roughness: 1, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(R.maxX - R.minX, R.maxZ - R.minZ).rotateX(-Math.PI / 2)), mat);
    mesh.position.set((R.minX + R.maxX) / 2, .011, (R.minZ + R.maxZ) / 2); mesh.renderOrder = 2; mesh.receiveShadow = true; mesh.name = 'floor dirt and wet sheen'; parent.add(mesh);
    const F = { mesh, sim: null, last: -1, at: -9, smearN: 0,
      /** Smear streaks where the dirty mop laid grey water (the core lists them). */
      smear(list) {
        a.save(); a.lineCap = 'round';
        for (const s of list) {
          const px = -s.uz, pz = s.ux; // across the stroke
          for (let k = -4; k <= 4; k++) {
            const o = k * .042 + Math.sin(k * 7.3 + s.x * 9) * .008, x0 = s.x + px * o - s.ux * .03, z0 = s.z + pz * o - s.uz * .03, x1 = s.x + px * o + s.ux * .03, z1 = s.z + pz * o + s.uz * .03;
            a.strokeStyle = `rgba(${84 + (k & 3) * 6},${76 + (k & 3) * 5},${64},${.34 + .2 * Math.abs(Math.sin(k * 3.1 + s.z * 7))})`; a.lineWidth = 2 + (k & 1) * 1.6;
            a.beginPath(); a.moveTo(X(x0), Z(z0)); a.lineTo(X(x1), Z(z1)); a.stroke();
          }
        }
        a.restore();
      },
      paint(sim) {
        const n = sim.nx * sim.nz, D = sim.dirt, md = mi.data, wd = wi.data, rd = ri.data;
        for (let k = 0; k < n; k++) {
          const d = D[k], wt = sim.wet(k), q = k * 4;
          md[q] = md[q + 1] = md[q + 2] = 255; md[q + 3] = 255 * clamp((d - .02) * 1.35);
          wd[q] = 26; wd[q + 1] = 17; wd[q + 2] = 9; wd[q + 3] = 255 * .22 * wt * (1 - clamp(d * 2)); wmi.data[q + 3] = 255 * wt * (1 - clamp(d * 2));
          rd[q] = rd[q + 1] = rd[q + 2] = 255 * (1 - .86 * wt * (1 - clamp(d * 2))); rd[q + 3] = 255;
        }
        mc.putImageData(mi, 0, 0); wc.putImageData(wi, 0, 0); wmc.putImageData(wmi, 0, 0); rc.putImageData(ri, 0, 0);
        v.globalCompositeOperation = 'copy'; v.imageSmoothingEnabled = true; v.drawImage(art, 0, 0);
        v.globalCompositeOperation = 'destination-in'; v.drawImage(mask, 0, 0, FW, FH);
        v.globalCompositeOperation = 'source-over'; v.drawImage(wet, 0, 0, FW, FH);
        sc.globalCompositeOperation = 'copy'; sc.drawImage(sheenArt, 0, 0); sc.globalCompositeOperation = 'destination-in'; sc.drawImage(wm, 0, 0, FW, FH); // the sheen only where it is wet
        v.drawImage(sheen, 0, 0);
        map.needsUpdate = true; rmap.needsUpdate = true;
      }
    };
    return F;
  }
  /** The dirt, painted once per shift from the core's stain list (canvas px; y down = +z). */
  function drawStains(c, stains, X, Z, s) {
    let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const st of stains) {
      const x = X(st.x), y = Z(st.z);
      if (st.kind === 'chalk') {
        c.save(); c.translate(x, y); c.rotate(st.a); c.scale(1, st.squash);
        const R = st.r * s, g = c.createRadialGradient(0, 0, 1, 0, 0, R); g.addColorStop(0, 'rgba(238,236,228,.62)'); g.addColorStop(.55, 'rgba(232,230,222,.34)'); g.addColorStop(1, 'rgba(230,228,220,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
        for (let i = 0; i < 160; i++) { const a = r() * 7, d = Math.sqrt(r()) * R * .95; c.fillStyle = `rgba(248,247,242,${.25 + r() * .5})`; c.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 2.2, 1 + r() * 2.2); }
        c.strokeStyle = 'rgba(246,244,238,.32)'; c.lineCap = 'round'; // a palm wiped through it
        for (let k = 0; k < 4; k++) { c.lineWidth = 4 + r() * 5; c.beginPath(); c.moveTo(-R * .6, (k - 1.5) * 6); c.quadraticCurveTo(0, (k - 1.5) * 6 + 8, R * .7, (k - 1.5) * 7 - 4); c.stroke(); }
        c.restore();
      } else if (st.kind === 'sweat') {
        for (const d of st.drops) {
          const px = X(d.x), py = Z(d.z), R = d.r * s;
          const g = c.createRadialGradient(px, py, R * .2, px, py, R * 1.15); g.addColorStop(0, 'rgba(44,26,12,.42)'); g.addColorStop(.75, 'rgba(40,24,10,.5)'); g.addColorStop(1, 'rgba(40,24,10,0)');
          c.fillStyle = g; c.beginPath(); c.ellipse(px, py, R * 1.15, R, r(), 0, 7); c.fill();
          c.strokeStyle = 'rgba(255,246,226,.55)'; c.lineWidth = Math.max(1, R * .22); c.beginPath(); c.arc(px - R * .2, py - R * .25, R * .55, 3.6, 4.9); c.stroke();
        }
      } else if (st.kind === 'print') {
        c.save(); c.translate(x, y); c.rotate(st.a); c.globalAlpha = .55 + .4 * st.fade;
        const sole = new Path2D(); sole.ellipse(.045 * s, 0, .09 * s, .05 * s, 0, 0, 7); sole.ellipse(-.1 * s, 0, .05 * s, .044 * s, 0, 0, 7);
        c.fillStyle = 'rgba(78,58,40,.62)'; c.fill(sole); c.save(); c.clip(sole);
        c.globalCompositeOperation = 'destination-out'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.6;
        for (let u = -.16 * s; u < .15 * s; u += 4.2) { c.beginPath(); c.moveTo(u, -.06 * s); c.lineTo(u + 2, .06 * s); c.stroke(); }
        c.restore(); c.strokeStyle = 'rgba(62,44,30,.5)'; c.lineWidth = 1.4; c.stroke(sole);
        c.restore();
      } else {
        const hx = Math.cos(st.a) * st.len / 2, hz = Math.sin(st.a) * st.len / 2, x0 = X(st.x - hx), y0 = Z(st.z - hz), x1 = X(st.x + hx), y1 = Z(st.z + hz), mx = (x0 + x1) / 2 - Math.sin(st.a) * st.bend * s, my = (y0 + y1) / 2 + Math.cos(st.a) * st.bend * s;
        c.lineCap = 'round'; // a rubber streak: soft edge, darker core, thinner at the ends
        const path = () => { c.beginPath(); if (st.arc) c.arc(x, y, st.r * s, st.a, st.a + st.span); else { c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); } };
        for (const [wk, al] of [[2.2, .1], [1.3, .26], [.65, .5]]) { c.strokeStyle = `rgba(24,20,19,${al})`; c.lineWidth = Math.max(.8, st.w * s * wk); path(); c.stroke(); }
      }
    }
  }

  /* ------------------------------------------------------------ the mop (handle, socket, strands) and the bucket */
  const STRANDS = 46, SEG = 6;
  function mopMesh(own, parent) {
    const handle = new THREE.Mesh(own(new THREE.CylinderGeometry(.0145, .0145, 1, 10)), own(new THREE.MeshStandardMaterial({ color: '#b88a58', roughness: .55 })));
    handle.castShadow = true; handle.name = 'mop handle'; parent.add(handle);
    const cap = new THREE.Mesh(own(new THREE.CylinderGeometry(.018, .018, .06, 10)), own(new THREE.MeshStandardMaterial({ color: '#c33b2e', roughness: .5 }))); parent.add(cap);
    const socket = new THREE.Mesh(own(new THREE.CylinderGeometry(.03, .045, .1, 12)), own(new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: .35, metalness: .7 }))); socket.castShadow = true; parent.add(socket);
    const band = new THREE.Mesh(own(new THREE.CylinderGeometry(.06, .066, .035, 14)), own(new THREE.MeshStandardMaterial({ color: '#2f6fc0', roughness: .8 }))); parent.add(band);
    const n = STRANDS * (SEG + 1) * 2, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = [];
    for (let s = 0; s < STRANDS; s++) for (let k = 0; k < SEG; k++) { const a = (s * (SEG + 1) + k) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    for (let i = 0; i < n; i++) { nor[i * 3 + 1] = 1; const s = Math.floor(i / ((SEG + 1) * 2)), k = Math.floor(i / 2) % (SEG + 1), sh = .9 + .1 * Math.sin(s * 2.7) - .14 * k / SEG; col[i * 3] = sh; col[i * 3 + 1] = sh * .985; col[i * 3 + 2] = sh * .94; }
    const geo = own(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const strandMat = own(new THREE.MeshStandardMaterial({ color: '#efe9d8', vertexColors: true, roughness: .95, side: THREE.DoubleSide }));
    const strands = new THREE.Mesh(geo, strandMat); strands.frustumCulled = false; strands.castShadow = true; strands.name = 'mop strands'; parent.add(strands);
    const tips = Array.from({ length: STRANDS }, (_, s) => { const a = s / STRANDS * Math.PI * 2 + Math.sin(s * 5.1) * .35, len = .09 + .06 * ((s * 7) % 5) / 4 + .02 * Math.sin(s * 2.3); return { a, len, root: V(), tip: null, sway: s * 1.37, curl: Math.sin(s * 3.7) * .5 }; });
    const discTex = own(canvasTex(64, 64, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 2, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(32,24,16,.55)'); g.addColorStop(.6, 'rgba(32,24,16,.35)'); g.addColorStop(1, 'rgba(32,24,16,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); }));
    const disc = new THREE.Mesh(own(new THREE.PlaneGeometry(.36, .36).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false }))); disc.renderOrder = 3; disc.name = 'wet mop on the boards'; parent.add(disc); // the soaked cotton mass under the strands
    return { handle, cap, socket, band, strands, strandMat, pos, tips, geo, disc };
  }
  /** Strands from the band at the socket to the boards: they splay round the head and trail behind the stroke. */
  function strandsFrame(M, head, vel, t, dt, reduced, lifted, spin = 0) {
    const P = M.pos, up = V(0, 1, 0), trail = V(-vel.x, 0, -vel.z).multiplyScalar(.07); if (trail.length() > .13) trail.setLength(.13);
    const k = dt > 0 ? 1 - Math.exp(-dt * 14) : 1, ctrl = V(), p = V(), side = V(), dirv = V();
    M.tips.forEach((s, i) => {
      const ca = Math.cos(s.a + spin), sa = Math.sin(s.a + spin), root = V(head.x + ca * .05, head.y + .045, head.z + sa * .05);
      const sway = reduced ? 0 : .012 * Math.sin(t * 3.1 + s.sway) * (1 + 4 * Math.min(1, vel.length()));
      const rest = lifted > .02 ? V(head.x + ca * .07, Math.max(.015, head.y - .3 + .06 * Math.abs(sa)), head.z + sa * .07)
        : V(head.x + ca * s.len + trail.x * (1 + .4 * Math.cos(s.a * 3)) - sa * sway, .016 + .004 * (i % 3), head.z + sa * s.len + trail.z * (1 + .4 * Math.cos(s.a * 3)) + ca * sway);
      s.tip = s.tip ? s.tip.lerp(rest, k) : rest.clone();
      ctrl.set(root.x + Math.cos(s.a + spin + s.curl) * .06, Math.max(.022, Math.min(root.y, s.tip.y + .035)), root.z + Math.sin(s.a + spin + s.curl) * .06);
      for (let q = 0; q <= SEG; q++) {
        const u = q / SEG, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        p.set(root.x * a + ctrl.x * b + s.tip.x * c, root.y * a + ctrl.y * b + s.tip.y * c, root.z * a + ctrl.z * b + s.tip.z * c);
        dirv.set(2 * (1 - u) * (ctrl.x - root.x) + 2 * u * (s.tip.x - ctrl.x), 0, 2 * (1 - u) * (ctrl.z - root.z) + 2 * u * (s.tip.z - ctrl.z)); if (dirv.lengthSq() < 1e-8) dirv.set(ca, 0, sa);
        side.crossVectors(dirv, up).normalize().multiplyScalar(.013 * (1.1 - .3 * u));
        const o = ((i * (SEG + 1)) + q) * 6; P[o] = p.x - side.x; P[o + 1] = p.y; P[o + 2] = p.z - side.z; P[o + 3] = p.x + side.x; P[o + 4] = p.y + .002; P[o + 5] = p.z + side.z;
      }
    });
    M.geo.attributes.position.needsUpdate = true;
  }
  function bucket(own, parent) {
    const B = Core().MOP.bucket, parts = [];
    const box = (x, y, z, w, h, d, hex, rx = 0, ry = 0) => parts.push([new THREE.BoxGeometry(w, h, d), mat4(x, y, z, rx, ry), hex]);
    const cyl = (x, y, z, r, h, hex, rx = 0, rz = 0) => parts.push([new THREE.CylinderGeometry(r, r, h, 10), mat4(x, y, z, rx, 0, rz), hex]);
    // a yellow mop bucket on casters: tapered tub (four walls), rim, a grey wringer press on the back half, a lever and a handle
    const Y = '#e5b21f', Yd = '#c99814';
    box(0, .03, 0, .5, .04, .36, '#3a3f47');
    box(0, .2, .178, .48, .32, .025, Y, -.06); box(0, .2, -.178, .48, .32, .025, Y, .06); box(.24, .2, 0, .025, .32, .34, Y, 0, 0); box(-.24, .2, 0, .025, .32, .34, Yd);
    box(0, .36, 0, .52, .025, .38, Yd);
    box(-.12, .44, 0, .2, .14, .3, '#7c858f'); box(-.12, .52, 0, .22, .03, .32, '#5d656e');
    cyl(-.12, .74, .14, .012, .5, '#8e97a1', .35); box(-.12, .97, .22, .03, .03, .14, '#2a2d33');
    parts.push([new THREE.TorusGeometry(.17, .008, 6, 16, Math.PI), mat4(.06, .36, 0, 0, Math.PI / 2, 0), '#8e97a1']);
    for (const [x, z] of [[-.2, -.14], [.2, -.14], [-.2, .14], [.2, .14]]) cyl(x, .025, z, .025, .03, '#1c1e22', 0, Math.PI / 2);
    const g = new THREE.Group(); g.position.set(B.x, 0, B.z); g.rotation.y = -.5; g.name = 'mop bucket'; parent.add(g);
    const tub = new THREE.Mesh(own(merge(parts)), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45 }))); tub.castShadow = true; g.add(tub);
    const waterMat = own(new THREE.MeshStandardMaterial({ color: '#6f9aa6', roughness: .12, metalness: .1 }));
    const water = new THREE.Mesh(own(new THREE.PlaneGeometry(.44, .32).rotateX(-Math.PI / 2)), waterMat); water.position.set(.04, .3, 0); g.add(water);
    // the wet-floor sign by the edge of the floor
    const signTex = own(canvasTex(128, 192, (c, W, H) => {
      c.fillStyle = '#f2c230'; c.fillRect(0, 0, W, H); c.fillStyle = '#1d1d1f'; c.fillRect(0, 0, W, 10); c.fillRect(0, H - 10, W, 10);
      c.beginPath(); c.moveTo(W / 2, 34); c.lineTo(W - 22, 112); c.lineTo(22, 112); c.closePath(); c.lineWidth = 7; c.stroke();
      c.font = '900 52px Arial,sans-serif'; c.textAlign = 'center'; c.fillText('!', W / 2, 104);
      c.lineWidth = 6; c.beginPath(); c.arc(42, 150, 10, 0, 7); c.moveTo(42, 160); c.lineTo(66, 176); c.moveTo(48, 166); c.lineTo(90, 158); c.stroke(); c.beginPath(); c.ellipse(80, 178, 26, 4, 0, 0, 7); c.fill();
    }));
    const sign = new THREE.Group(); sign.position.set(.2, 0, 2.05); sign.rotation.y = .5; parent.add(sign);
    const signMat = own(new THREE.MeshStandardMaterial({ map: signTex, roughness: .5, side: THREE.DoubleSide })), leaf = own(new THREE.PlaneGeometry(.3, .58));
    for (const s of [-1, 1]) { const m = new THREE.Mesh(leaf, signMat); m.position.set(0, .28, s * .09); m.rotation.x = -s * .3; m.castShadow = true; sign.add(m); }
    return { g, water, waterMat };
  }
  const _sparkTex = () => canvasTex(32, 32, (c, W) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(15, 2, 2, 28); c.fillRect(2, 15, 28, 2); }, false);

  function props(scene, set, sim) {
    const g = new THREE.Group(), bin = new Set(), own = x => (bin.add(x), x);
    g.name = 'night shift'; scene.add(g);
    const N = night(scene, set, own); g.add(N.g);
    const M = mopMesh(own, g), Bk = bucket(own, g), F = floor(sim, own, g);
    const sparkMat = own(new THREE.SpriteMaterial({ map: own(_sparkTex()), color: '#fff6dc', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const sparks = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(sparkMat.clone()); bin.add(s.material); s.visible = false; s.renderOrder = 5; g.add(s); return { s, t0: -9 }; });
    return { g, bin, N, M, Bk, F, sparks };
  }
  function dispose(P) { if (!P) return; P.g.parent?.remove(P.g); for (const o of P.bin) o.dispose?.(); }
  const timeText = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---- the body at work (owner 2026-11-22: "emulate real body movement of the player, not just he is holding the mop").
   * The mop head follows the core's point; the Fighter keeps it in front of him (0.55..0.85 m ahead, within 0.35 m to a side),
   * walking with real steps: each foot stays planted on its spot on the boards until the body has moved off it, then
   * steps (one foot at a time, lifted, 0.3 s) to its new place in a wide, staggered work stance. The thorax turns toward
   * the mop and with the sweep, the pelvis a little the other way; he leans into a push and further into a long reach,
   * the knees bend, the weight goes over the planted foot. Both hands hold the handle: the top (left) hand at the chest,
   * the lower (right) hand further down the same line; the handle is then laid through both real grips. Rinse: carry the
   * mop to the bucket, bend and dunk it twice, press it in the wringer and twist, straighten. Idle: breathing; near the
   * end of the shift (and after it) a tired stretch, one hand on the small of the back. QA reads m.qa. */
  function mopBody(x, v, dt, m, R) {
    const f = x.rigs.fighter, Pose = window.DreamPose, t = x.t, reduced = x.reduced, M = x.scene.userData.mop.M;
    const target = V(v.point.x, 0, v.point.z), last = m.head ? m.head.clone() : target.clone();
    if (!m.head) { m.head = target.clone(); m.body = V(target.x + .3, 0, target.z - .95); m.yaw = 0; }
    m.idle = v.active || v.rinsing ? 0 : (m.idle || 0) + dt;
    const stretch = !v.rinsing && (x.over || (v.started && v.left < 15 && m.idle > 1.2)) ? 1 : 0;
    m.stretch = (m.stretch || 0) + (stretch - (m.stretch || 0)) * Math.min(1, dt * 3);
    let phase = 'mop', press = 0, dunk = 0;
    if (v.rinsing > 0) { // carry -> dunk (twice) -> wring (press twice, twist) -> lift out
      const a = Math.max(.05, v.rinseTravel || 0), u = v.rinsing, k = (u - a) / (1 - a), bk = V(R.bucket.x + .03, 0, R.bucket.z);
      if (u < a) { phase = 'carry'; const step = bk.clone().sub(m.head), go = Math.min(step.length(), 2.6 * dt); if (go > 1e-4) m.head.add(step.setLength(go)); m.head.y += (.18 - m.head.y) * Math.min(1, dt * 10); }
      else {
        m.head.x += (bk.x - m.head.x) * Math.min(1, dt * 12); m.head.z += (bk.z - m.head.z) * Math.min(1, dt * 12);
        if (k < .45) { phase = 'dunk'; dunk = Math.sin(k / .45 * Math.PI * 2) ** 2; m.head.y = .3 - .2 * dunk; }
        else if (k < .85) { phase = 'wring'; press = Math.sin((k - .45) / .4 * Math.PI * 2) ** 2; m.head.y = .47 - .07 * press; m.spin = (m.spin || 0) + dt * 9; }
        else { phase = 'lift'; m.head.y = .47 + (k - .85) / .15 * .05; }
      }
    } else {
      const want = m.stretch > .5 ? 0 : Core().atBucket(v.point) ? .3 : x.sim.lift ? .16 : 0, k = reduced ? 1 : 1 - Math.exp(-dt * 30);
      if (m.stretch > .5) { const front = f.root.localToWorld(V(.12, 0, .42)); m.head.x += (front.x - m.head.x) * Math.min(1, dt * 3); m.head.z += (front.z - m.head.z) * Math.min(1, dt * 3); }
      else { m.head.x += (target.x - m.head.x) * k; m.head.z += (target.z - m.head.z) * k; }
      m.head.y += (want - m.head.y) * (1 - Math.exp(-dt * 14)); if (m.head.y < .002) m.head.y = 0; // on the boards: contact, never under them
    }
    const vel = m.head.clone().sub(last).divideScalar(Math.max(.016, dt)); vel.y = 0;
    // body: keep the mop in front; turn to face it
    const want = m.body.clone(), dx = m.head.x - want.x, dz = m.head.z - want.z, c0 = -.3, side = .24; // the mop a little to his right (world -x as he faces the camera)
    if (dx > c0 + side) want.x = m.head.x - c0 - side; else if (dx < c0 - side) want.x = m.head.x - c0 + side;
    if (dz > 1.1) want.z = m.head.z - 1.1; else if (dz < .85) want.z = m.head.z - .85; // the handle at ~55 degrees
    const atPail = phase !== 'mop' || Core().atBucket(v.point); if (atPail) want.set(R.bucket.x - .42, 0, R.bucket.z - .78); // at the bucket: behind it and to its left
    const before = m.body.clone(), mv = want.clone().sub(m.body), maxStep = 2.2 * dt; if (mv.length() > maxStep) mv.setLength(maxStep);
    m.body.add(mv); const bodyVel = m.body.clone().sub(before).divideScalar(Math.max(.016, dt));
    const yaw = atPail ? -.15 : clamp(Math.atan2(m.head.x - m.body.x + .3, Math.max(.25, m.head.z - m.body.z)) * .7, -.7, .7); // square to the work: the mop's home is at his right
    m.yaw += (yaw - m.yaw) * Math.min(1, dt * 4);
    f.root.position.copy(m.body); f.root.rotation.set(0, m.yaw, 0); f.root.updateMatrixWorld(true);
    // feet: planted on the boards (world), one step at a time to the work stance
    const homeOf = s => f.root.localToWorld(V(s * .155, 0, s * -.06)); // wide stance, right foot a little back
    if (!m.feet) m.feet = { L: { p: homeOf(-1), u: 1 }, R: { p: homeOf(1), u: 1 } };
    const swinging = ['L', 'R'].find(k => m.feet[k].u < .9); // the next step may start as the other foot lands
    for (const k of ['L', 'R']) {
      const F = m.feet[k], s = k === 'L' ? -1 : 1;
      if (F.u < 1) { F.u = Math.min(1, F.u + dt / .25); F.p.lerpVectors(F.from, F.to, F.u * F.u * (3 - 2 * F.u)); F.lift = .065 * Math.sin(Math.PI * F.u); continue; }
      F.lift = 0;
      const home = homeOf(s); if (swinging || F.p.distanceTo(home) < .12) continue;
      const other = m.feet[k === 'L' ? 'R' : 'L'], mine = F.p.distanceTo(home), theirs = other.p.distanceTo(homeOf(-s));
      if (theirs > mine + .03 && other.u >= 1) continue; // the foot left furthest behind goes first
      F.from = F.p.clone(); F.to = home.addScaledVector(bodyVel, .22); F.to.y = 0; F.u = 0; m.steps = (m.steps || 0) + 1; break;
    }
    const swing = ['L', 'R'].find(k => m.feet[k].u < 1), planted = swing === 'L' ? 1 : swing === 'R' ? -1 : 0;
    const feet = {}; for (const k of ['L', 'R']) { const q = f.root.worldToLocal(V(m.feet[k].p.x, 0, m.feet[k].p.z)); feet[k] = [q.x, m.feet[k].lift, q.z]; }
    // the work: where the socket is in the rig frame, how hard he pushes, the sweep
    const socketW = V(m.head.x, m.head.y + .1, m.head.z), S = f.root.worldToLocal(socketW.clone());
    const lv = f.root.worldToLocal(f.root.position.clone().add(vel)), reach = clamp((S.z - .85) / .25), push = clamp(lv.z * .12, -.08, .1), sweep = reduced ? 0 : clamp(lv.x * .1, -.18, .18);
    const bend = phase === 'dunk' ? 1 : phase === 'wring' ? .8 : phase === 'carry' ? .2 : 0;
    m.bend = (m.bend || 0) + (bend - (m.bend || 0)) * Math.min(1, dt * 6);
    const st = m.stretch, act = clamp(1 - Math.min(1, m.idle / 1.5) * .5);
    m.tb = clamp((m.tb ?? -.1) + ((m.err?.L || 0) - (m.err?.R || 0)) * 3 * dt, -.32, .12); // turns the chest until both hands reach the stick
    const twistT = (clamp(Math.atan2(S.x - .3, Math.max(.2, S.z)) * .85, -.55, .55) + m.tb + sweep) * (1 - st), twist = m.twist = (m.twist || 0) + (twistT - (m.twist || 0)) * Math.min(1, dt * 8);
    const lean = (.36 + .12 * reach + push) * (.6 + .4 * act) * (1 - st) + .2 * m.bend - .14 * st; // bent over the work
    const drop = .07 + .05 * reach + .17 * m.bend + .07 * press - .04 * st;
    const shift = clamp(S.x * .06, -.045, .045) * (1 - st) + planted * .035;
    // hands: the top (left) hand in front of the chest, placed from the shoulder so the arm can hold it there; the lower
    // (right) hand further down the line toward the socket, as far down as the right arm reaches (30..44 cm apart)
    const shL = f.point(f.joints.armL), shR = f.point(f.joints.armR), arm = f.joints.elbowL.position.length() + f.joints.handL.position.length();
    const T = V(clamp(-.02 + (S.x - .3) * .1, -.1, .06), shL.y - .38 - .08 * m.bend - .05 * press + .12 * st, shL.z + .3 + .06 * reach), axis = S.clone().sub(T).normalize();
    let u = .42, low = T.clone().addScaledVector(axis, u); while (u > .1 && low.distanceTo(shR) > .93 * arm) { u -= .02; low = T.clone().addScaledVector(axis, u); } // as far down the stick as the arm reaches
    const gripOff = m.gripOff || { L: V(), R: V() }, ride = V(0, .972 - f.joints.hips.position.y, 0), aimL = T.clone().sub(gripOff.L).add(ride), aimR = low.clone().sub(gripOff.R).add(ride); // DreamPose lets the hands ride with the pelvis: take its drop back out // last frame's grip offset (the grip sits inside the paw)
    const reachT = st > .5 ? { L: aimL.toArray() } : { L: aimL.toArray(), R: aimR.toArray() };
    Pose.civil(f, { t, dt, walk: 0, feet, arms: { L: 'pole', R: st > .5 ? 'hips' : 'pole' }, reach: reachT, lean, drop, twist, hipYaw: -.3 * twist, shift,
      look: { yaw: clamp(Math.atan2(S.x, Math.max(.2, S.z)) - twist, -.6, .6) * (1 - st), pitch: -.45 * (1 - st) + .32 * st - .1 * m.bend } });
    // the handle is laid through both real grips; where it meets the socket height is the mop head (within 15 cm of
    // where the core cleans, 24 cm while he is still walking after it); otherwise from the socket through the top hand
    const gT = f.joints.handL.localToWorld(V(0, -.07, .02)), gL = f.joints.handR.localToWorld(V(0, -.07, .02));
    m.err = { L: f.point(f.joints.handL).distanceTo(aimL.clone().sub(ride)), R: st > .5 ? 0 : f.point(f.joints.handR).distanceTo(aimR.clone().sub(ride)) };
    m.gripOff = { L: f.root.worldToLocal(gT.clone()).sub(f.point(f.joints.handL)), R: f.root.worldToLocal(gL.clone()).sub(f.point(f.joints.handR)) };
    let hAxis = gT.clone().sub(socketW).normalize(), sock = socketW.clone(), both = false;
    if (st <= .5) { const d = gT.clone().sub(gL); if (d.y > .05 && d.length() > .1) { const k = (gL.y - socketW.y) / d.y, at = gL.clone().addScaledVector(d, -k); if (at.distanceTo(socketW) < .24) { sock = at; hAxis = d.normalize(); both = true; } } }
    const end = gT.clone().addScaledVector(hAxis, .12), len = sock.distanceTo(end);
    M.handle.position.copy(sock).lerp(end, .5); M.handle.scale.set(1, len, 1); M.handle.quaternion.setFromUnitVectors(V(0, 1, 0), hAxis);
    M.cap.position.copy(end); M.cap.quaternion.copy(M.handle.quaternion);
    M.socket.position.copy(sock).addScaledVector(hAxis, -.02); M.socket.quaternion.copy(M.handle.quaternion);
    const vis = m.vis = V(sock.x, m.head.y, sock.z); // the head drawn where the handle meets the boards
    M.band.position.set(vis.x, vis.y + .055, vis.z);
    M.disc.position.set(vis.x, .014, vis.z); M.disc.visible = vis.y < .05;
    const lineDist = q => { const o = q.clone().sub(sock), a = o.dot(hAxis); return o.addScaledVector(hAxis, -a).length(); };
    const segDist = q => { const o = q.clone().sub(sock), a = clamp(o.dot(hAxis), 0, len); return o.addScaledVector(hAxis, -a).length(); }, body = Math.min(...['hips', 'spine', 'chest'].map(k => segDist(f.joints[k].getWorldPosition(V()))));
    m.qa = { phase, both, body: +body.toFixed(3), headOff: +Math.hypot(sock.x - socketW.x, sock.z - socketW.z).toFixed(3), apart: +gT.distanceTo(gL).toFixed(3), jL: +f.point(f.joints.handL).distanceTo(aimL.clone().sub(ride)).toFixed(3), jR: +f.point(f.joints.handR).distanceTo(aimR.clone().sub(ride)).toFixed(3),
      top: +lineDist(gT).toFixed(4), low: st > .5 ? null : +lineDist(gL).toFixed(4), handle: +len.toFixed(3), twist: +twist.toFixed(3), lean: +lean.toFixed(3), drop: +drop.toFixed(3), steps: m.steps || 0,
      feet: ['L', 'R'].map(k => ({ planted: m.feet[k].u >= 1, world: f.joints['foot' + k].getWorldPosition(V()).toArray().map(n => +n.toFixed(4)) })), head: m.head.toArray().map(n => +n.toFixed(3)), stretch: +st.toFixed(2) };
    m.gripErr = m.qa.low ?? 0; m.handleLen = len;
    return vel;
  }
  const game = {
    set: 'dream_gym', place: 'gym', wear: 'street', roles: { fighter: { rig: 'fighter' } }, direct: true, words, mount,
    make: () => new (Core().MopTrial)({ seed: 1 + Math.floor(Math.random() * 1e6) }), job: 'clean_gym', pay: n => Core().pay(n),
    keymap: { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'wipe', r: 'rinse' },
    say(phase, res) {
      const kind = phase === 'intro' ? 'job' : 'job_' + (res?.stars || 0), l = window.AdventureStory?.lines?.clean_gym?.[kind]?.[0];
      return { who: l?.who || 'fighter', id: 'clean_gym', kind, text: l?.text || fallback.text };
    },
    hud(v, w) { return { goal: w.goal + ' · ' + v.score + '%', prompt: '', kind: '', arrow: '', ring: -1 }; },
    detail(res, w) { return fill(w.detail, { p: res.value, a: res.cleaned, b: res.zones ?? Core().MOP.zones.length, s: res.smears ?? 0, r: res.rinses ?? 0 }); },
    dispose(x) { dispose(x.scene?.userData.mop); if (x.scene) x.scene.userData.mop = null; },
    frame(x, v, dt) {
      const R = Core().MOP, sim = x.sim, m = x.memo, O = mounted;
      const P = x.scene.userData.mop || (x.scene.userData.mop = props(x.scene, x.set, sim));
      if (P.F.sim !== sim) { // a fresh shift (first frame or Try again): new dirt art, reset the picture
        if (P.F.sim) { const fresh = floor(sim, f => (P.bin.add(f), f), P.g); P.F.mesh.parent.remove(P.F.mesh); P.F.mesh.material.map.dispose(); P.F.mesh.material.roughnessMap.dispose(); P.F.mesh.material.dispose(); P.F.mesh.geometry.dispose(); P.F = fresh; }
        P.F.sim = sim; P.F.last = -1; m.head = null; m.seen = 0; if (O) { O.seen = 0; O.sim = sim; }
      }
      const t = x.t, reduced = x.reduced;
      // ---- floor picture: on change, and a few times a second while the boards dry
      if (sim.smearMarks?.length) { P.F.smear(sim.smearMarks); sim.smearMarks.length = 0; }
      const drying = v.clock - (sim.lastWipe ?? -99) < R.dry + .3;
      if (P.F.last !== v.revision ? v.clock - P.F.at > 1 / 24 : drying && v.clock - P.F.at > 1 / 8) { P.F.paint(sim); P.F.last = v.revision; P.F.at = v.clock; }
      // ---- the mop head and the Fighter's whole body (mopBody: steps, twist, lean, knees, hands on the handle)
      const M = P.M, vel = mopBody(x, v, dt, m, R);
      strandsFrame(M, m.vis || m.head, vel, t, dt, reduced, m.head.y, m.spin || 0);
      M.strandMat.color.set('#efe9d8').lerp(new THREE.Color('#6d6252'), clamp(v.load * 1.1));
      P.Bk.waterMat.color.set('#6f9aa6').lerp(new THREE.Color('#6b5a44'), clamp(v.rinses * .12 + (v.rinsing ? v.load * .2 : 0)));
      // ---- lamp: sways a little; flickers in the last ten seconds; goes out with the time
      const N = P.N, flick = v.started && v.left < 10 && !v.done ? (Math.sin(t * 37) > .82 || Math.sin(t * 13.3) > .93 ? .25 : 1) : 1;
      m.dark = v.lightsOut ? Math.min(1, (m.dark || 0) + dt * 2.2) : 0;
      const lit = flick * (1 - m.dark);
      if (!reduced) N.lamp.rotation.z = .025 * Math.sin(t * .9); N.lamp.rotation.x = reduced ? 0 : .02 * Math.sin(t * .7 + 1);
      N.spot.intensity = 2.4 * lit; N.bulbMat.color.set('#ffe2a8').multiplyScalar(.15 + .85 * lit); N.beamMat.opacity = .16 * lit; N.poolMat.color.set('#6b4a22').multiplyScalar(lit);
      // ---- sparkles where the floor came clean; pops for strokes, smears, rinses, areas
      const ev = v.events;
      for (const e of ev) {
        if (e.n < (m.seen || 0)) continue; m.seen = e.n + 1;
        if (e.type === 'stroke' || e.type === 'zone') {
          const n = e.type === 'zone' ? 6 : 2;
          for (let i = 0; i < n; i++) { const s = P.sparks.find(q => t - q.t0 > .8) || P.sparks[0]; s.t0 = t; const zx = e.type === 'zone' ? e.x + (Math.random() - .5) * 1.6 : m.head.x - vel.x * .05 + (Math.random() - .5) * .8, zz = e.type === 'zone' ? e.z + (Math.random() - .5) * 1.2 : m.head.z + (Math.random() - .5) * .5; s.s.position.set(zx, .03, zz); }
        }
        if (!O) continue;
        const w = O.w, hx = m.head.x, hz = m.head.z;
        if (e.type === 'stroke') O.pop(w.stroke + (e.streak > 1 ? ' ×' + e.streak : '') + (e.bonus ? '  ' + fill(w.sec, { n: e.bonus }) : ''), 'good', hx, hz);
        else if (e.type === 'smear') O.pop(w.smear, 'bad', hx, hz);
        else if (e.type === 'rinsed') O.pop(w.rinsed, 'calm', R.bucket.x, R.bucket.z);
        else if (e.type === 'zone') O.pop((w.zone[e.zone] || '') + (e.bonus ? '  ' + fill(w.sec, { n: e.bonus }) : ''), 'gold', e.x, e.z);
      }
      for (const s of P.sparks) { const a = t - s.t0; s.s.visible = a < .8 && !reduced; if (s.s.visible) { const k = Math.sin(Math.PI * a / .8); s.s.scale.setScalar(.03 + .07 * k); s.s.material.opacity = k; } }
      // ---- overlay: clock, mop gauge, the rinse button on the bucket, the note until the first stroke
      if (O) {
        const txt = timeText(v.left); if (O.clock.textContent !== txt) O.clock.textContent = txt;
        O.clock.dataset.late = String(v.started && v.left < 10); O.gFill.style.width = Math.round(100 * (1 - v.load)) + '%'; O.gauge.dataset.dirty = String(!!v.dirty);
        const b = O.project(R.bucket.x, R.bucket.z, .95), hostR = O.rinse.parentElement?.getBoundingClientRect();
        if (hostR) { const half = (O.rinse.offsetWidth || 70) / 2 + 6; O.rinse.style.left = clamp(b.x - hostR.left, half, hostR.width - half).toFixed(0) + 'px'; O.rinse.style.top = clamp(b.y - hostR.top - 8, 150, hostR.height - 110).toFixed(0) + 'px'; }
        O.rinse.dataset.dirty = String(!!v.dirty); O.rinse.disabled = !!x.over || v.rinsing > 0; O.rinse.hidden = !!x.over;
        O.note.hidden = v.started || !!x.over; O.dark.dataset.on = String(!!v.lightsOut);
      }
      // the whole floor, the bucket and the window wall in view on a narrow phone
      const qaCam = window.__mopNightCam; if (qaCam) return { pos: qaCam.pos, look: qaCam.look, fit: [], minHorizontal: qaCam.minHorizontal || 40 }; // QA frame strips (side, 3/4)
      return { pos: [1.65, 4.9, 3.9], look: [1.65, .3, -.85], fit: [], minHorizontal: 44 };
    }
  };
  function register() { if (window.StoryScenes?.games && !window.StoryScenes.games.clean_gym) window.StoryScenes.games.clean_gym = game; }
  if (window.StoryScenes) register(); else window.addEventListener('DOMContentLoaded', register);
  window.MopGame = { register, game, words };
})();
