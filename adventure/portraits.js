/* Character portraits (GOTR-0081): a sports-broadcast look instead of flat cartoon faces. Characters with a real 3D model get an
 * offscreen render of their own rig (head and shoulders, three-quarter view, one studio light set for everyone, dark vignette)
 * made once per session with the game's renderer and cached as an image; the others get a monogram badge in the same frame. A thin
 * metal ring with a small corner accent frames both. If WebGL render-to-image fails, a neutral silhouette is shown instead.
 * 3D: the Fighter (the player's lion or rabbit), Mack (the rabbit), and every story character on the game rig (StoryCast): Bruno,
 * Brick, Fang, Mrs. Hazel, Otto and Rourke (speaker id 'hook'). Framing follows the head itself: the skin vertices bound to the
 * head bone (posed, above the jaw) and the rigid parts on the head are projected; the face (skin, eyes, nose, teeth, cap) sets the
 * size (~70 % of the frame width, a long snout up to ~86 %) and sits a little above the middle; the frame then grows until the top
 * of the head (ears, crown, mane) is inside with space above (a rabbit's ear tips may leave it). Rourke is seen further round so
 * his long snout shows. Off-stage rigs stand in a neutral pose for the picture (arms
 * down, head straight); gloves are hidden. API: StoryPortraits.el(id, { name, mono, accent }) -> <span class="adv-bust sp-portrait">. */
(() => {
  const PX = 168; // image pixels: 56 css px at 3x (phones)
  const cache = new Map(), waiting = new Map(), debug = { renders: [], fails: [], frames: {}, parts: {} };
  const eng = () => window.app?.engine;
  const ALIAS = { hook: 'rourke' }; // speaker ids of the story lines -> StoryCast ids
  const castId = id => ALIAS[id] || id;
  // id -> the rig whose head is rendered. Only characters with their own model: a recoloured stand-in body would misrepresent them.
  function rigOf(id, e) {
    if (!e?.coach) return null;
    if (id === 'fighter') return e.coach;
    if (id === 'pip') { const c = castRig('pip', e); if (c) return c; const r = [e.arena?.padTrainers?.rabbit, e.roster?.get?.('rabbit')].find(x => x?.root && x.joints?.head); return r || (e.coach.species === 'rabbit' ? e.coach : null); }
    if (castHas(id)) return castRig(castId(id), e);
    return null;
  }
  function castRig(id, e) { try { return typeof window.StoryCast?.rig === 'function' ? window.StoryCast.rig(id, e) || null : null; } catch { return null; } }
  // Story characters on the game rig: Bruno and Brick (story-cast.js), Fang, Mrs. Hazel and Otto (cast-market.js), Rourke (cast-docks.js).
  function castHas(id) { const S = window.StoryCast, c = castId(id); return typeof S?.rig === 'function' && (Array.isArray(S.ids) ? S.ids.includes(c) : c === 'bruno' || c === 'brick'); }
  const has3d = id => id === 'fighter' || id === 'pip' || castHas(id);
  const keyOf = (id, e) => id === 'fighter' ? 'fighter:' + (e?.coach?.species || '?') : castId(id);
  // A rig may be posed for the picture when nothing is playing it: off stage, or the Fighter outside a fight and a film.
  function free(rig, e) {
    if (!rig.root.parent) return true;
    if (rig !== e.coach) return false;
    const fv = e.arena?.fightView; return !(fv?.match && fv.match.phase !== 'done') && !window.DreamScenes?.playing && !window.StoryScenes?.playing && !e.fightIQDemo;
  }
  function pose(rig, e) { // neutral standing pose: arms hanging, head straight (DreamPose drives the rig's own controller for one frame)
    const D = window.DreamPose; if (!D?.civil || !free(rig, e)) return false;
    try { D.reset?.(rig); D.civil(rig, { t: 1, dist: 0, walk: 0, arms: { L: 'hang', R: 'hang' }, look: { yaw: 0, pitch: 0 }, talk: 0, dt: 0 }); rig.root.updateMatrixWorld(true); return true; } catch { return false; }
  }
  // One offscreen render of the rig root from `cam`: RGBA bytes, rows bottom-up.
  function shoot(T, r, root, cam, S) {
    const rt = new T.WebGLRenderTarget(S, S, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding;
    try { r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(root, cam); const buf = new Uint8Array(S * S * 4); r.readRenderTargetPixels(rt, 0, 0, S, S, buf); return buf; } finally { rt.dispose(); }
  }
  const FOV = 20, TAN = Math.tan(FOV * Math.PI / 360), VIEW = { rourke: [1.05, .2] }; // VIEW: [yaw from the front, camera lift] per character (default three-quarter)
  const shown = (o, root) => { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === root) return true; } return true; };
  // Loose fur and clothes round the head (ruffs, collars, whiskers) widen the silhouette but are not the face: the frame ignores them.
  const LOOSE = /ruff|collar|lapel|whisker|bruis|coat|scarf|mouth interior|tongue/i, FACE = /eye|lid|nose|nostril|teeth|brow|lash|glasses|lens|cap|lip/i;
  /** World points of the head as it stands now: skin vertices of the body skin (and a mane) bound mostly to the head bone or a bone
   *  under it (posed with the skeleton), and vertices of the rigid parts under the head joint (ears, nose, cap, eyes, teeth).
   *  core: the skin and the face parts (the frame is sized and centred on these); all: also ears, crown fur and mane (the top). */
  function headPoints(rig, T) {
    const head = rig.joints.head, bones = new Set(), core = [], all = [], v = new T.Vector3(), root = rig.root, parts = {}, floor = head.getWorldPosition(new T.Vector3()).y - .03; // floor: below the jaw is neck
    head.traverse(o => { if (o.isBone) bones.add(o); }); bones.add(head);
    root.traverse(o => {
      if (!o.isSkinnedMesh || !o.skeleton || !shown(o, root) || (o !== rig.skin && !/mane/i.test(o.name))) return;
      const idx = new Set(); o.skeleton.bones.forEach((b, i) => { if (bones.has(b)) idx.add(i); }); if (!idx.size) return;
      const g = o.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = g.attributes.position?.count || 0; if (!si || !sw) return;
      const step = Math.max(1, Math.floor(n / 30000)); let k = 0;
      for (let i = 0; i < n; i += step) {
        const w = (idx.has(si.getX(i)) ? sw.getX(i) : 0) + (idx.has(si.getY(i)) ? sw.getY(i) : 0) + (idx.has(si.getZ(i)) ? sw.getZ(i) : 0) + (idx.has(si.getW(i)) ? sw.getW(i) : 0);
        if (w > .5) { o.boneTransform(i, v); const q = v.clone().applyMatrix4(o.matrixWorld); if (q.y < floor) continue; all.push(q); if (o === rig.skin) core.push(q); k++; }
      }
      parts[o.name || 'skin'] = k;
    });
    head.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes.position || !shown(o, root) || LOOSE.test(o.name)) return;
      const P = o.geometry.attributes.position, step = Math.max(1, Math.floor(P.count / 300));
      const face = FACE.test(o.name); for (let i = 0; i < P.count; i += step) { const q = new T.Vector3(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(o.matrixWorld); all.push(q); if (face) core.push(q); }
      parts[o.name || 'part'] = (parts[o.name || 'part'] || 0) + Math.ceil(P.count / step);
    });
    debug.parts[rig.character || rig.species] = parts;
    return { core, all };
  }

  // Renders the rig's head and shoulders into an image. Returns a data URL, or null when the render is empty or WebGL refuses.
  function render(rig, e) {
    const T = window.THREE, r = e.renderer; if (!T || !r || !rig?.root || !rig.joints?.head) return null;
    const root = rig.root, added = [], hidden = [], prev = { rt: r.getRenderTarget(), color: r.getClearColor(new T.Color()), alpha: r.getClearAlpha(), vis: root.visible };
    let posed = false;
    try {
      posed = pose(rig, e); root.updateMatrixWorld(true);
      const W = o => o.getWorldPosition(new T.Vector3()), head = W(rig.joints.head), up = new T.Vector3(0, 1, 0);
      const fwd = new T.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
      const side = new T.Vector3().crossVectors(up, fwd).normalize();
      // three-quarter view, the camera a little above the eyes
      const yaw = VIEW[rig.character]?.[0] ?? .5, lift = VIEW[rig.character]?.[1] ?? .08; // a crocodile from further round, so the long snout shows
      const dir = fwd.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, Math.sin(yaw)).addScaledVector(up, lift).normalize();
      // Studio light in world space, parented to the rig only for this render (lights must be inside the rendered subtree).
      const place = (light, world) => { light.position.copy(root.worldToLocal(world.clone())); root.add(light); added.push(light); };
      const target = new T.Object3D(); target.position.copy(root.worldToLocal(head.clone())); root.add(target); added.push(target);
      // short lighting: the key from the far side of the face (modelling, not flat), a cool rim behind on the camera side, a soft fill
      const key = new T.DirectionalLight(0xfff0dc, 3.6); key.target = target; place(key, head.clone().addScaledVector(fwd, 1.1).addScaledVector(side, -.8).addScaledVector(up, 1.1));
      const rim = new T.DirectionalLight(0xd2e2ff, 3.0); rim.target = target; place(rim, head.clone().addScaledVector(fwd, -1).addScaledVector(side, 1).addScaledVector(up, .6));
      const fill = new T.HemisphereLight(0xeef2ff, 0x2e2822, 1.5); place(fill, head.clone().addScaledVector(up, 2));
      root.visible = true;
      // Gloves held in guard would cover the face: hidden for the portrait only.
      for (const g of [rig.gloveMeshes?.L, rig.gloveMeshes?.R]) if (g?.visible) { g.visible = false; hidden.push(g); }
      // 1. the head itself: every skin vertex bound to the head bone (or a bone under it: jaw, ears), posed, plus the rigid parts on
      //    the head (ears, nose, cap, eyes, teeth). A crocodile's snout, a rabbit's ears and a mane are all in it; the torso is not.
      const { core, all } = headPoints(rig, T); if (core.length < 8) return null;
      const cam = new T.PerspectiveCamera(FOV, 1, .02, 30), centre = core.reduce((a, p) => a.add(p), new T.Vector3()).multiplyScalar(1 / core.length);
      const aim = (c, view) => { cam.position.copy(c).addScaledVector(dir, view / (2 * TAN)); cam.lookAt(c); cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); };
      // 2. fit the frame to the head as the camera sees it (three passes: the perspective changes a little with the distance).
      //    The face (skin + eyes, nose, teeth, cap) fills ~2/3 of the frame width and centres it; the whole head (ears, crown fur,
      //    mane) stays inside with ~6 % space above; a rabbit's ear tips may leave the frame.
      let view = .8, box = null; aim(centre, view);
      const camRight = new T.Vector3(), camUp = new T.Vector3(), q = new T.Vector3();
      const flat = (list, half) => list.map(p => { q.copy(p).project(cam); return [q.x * half, q.y * half]; }); // metres in the plane of the head
      const bounds = f => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of f) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1 }; };
      for (let it = 0; it < 3; it++) {
        camRight.setFromMatrixColumn(cam.matrixWorld, 0); camUp.setFromMatrixColumn(cam.matrixWorld, 1);
        const fc = flat(core, view / 2), c = bounds(fc); let fa = flat(all, view / 2); box = c;
        if (rig.species === 'rabbit') { const t = bounds(fa).y1, cut = t - (t - c.y1) * .25; fa = fa.filter(([, y]) => y <= cut); } // ear tips may leave the frame
        const cw = c.x1 - c.x0, ch = c.y1 - c.y0, cx = (c.x0 + c.x1) / 2, mid = (c.y0 + c.y1) / 2;
        const top = bounds(fa).y1; let H = Math.max(cw / (cw > 1.4 * ch ? .86 : .7), ch / .72, .24); // the face large; a long snout may span the circle
        H = Math.max(H, (top - mid) / .4); // the top of the head (ears, crown, mane) inside with ~5 % space above
        const H0 = H;
        for (let k = 0; k < 4; k++) { // ears and crown inside the round frame too, unless they stick far out sideways (then their outer ends may touch the ring)
          const cy = mid - H * .05; let r = 0; for (const [x, y] of fa) if (y > cy) r = Math.max(r, Math.hypot(x - cx, y - cy));
          H = Math.min(Math.max(H, r / .49), H0 * 1.2);
        }
        centre.addScaledVector(camRight, cx).addScaledVector(camUp, mid - H * .05); view = H; aim(centre, view);
      }
      debug.frames[rig.character || rig.species] = { view: +view.toFixed(3), face: [+(box.x1 - box.x0).toFixed(3), +(box.y1 - box.y0).toFixed(3)], points: core.length };
      // 3. the picture
      const S = PX * 2, buf = shoot(T, r, root, cam, S);
      let covered = 0; for (let i = 3; i < buf.length; i += 4) if (buf[i] > 8) covered++;
      const share = covered / (S * S); debug.last = { char: rig.character || rig.species, share: +share.toFixed(3) }; if (share < .05 || share > .985) return null; // nothing (head off) or everything (wrong subtree)
      const big = document.createElement('canvas'); big.width = big.height = S; const bc = big.getContext('2d'), img = bc.createImageData(S, S);
      for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4); // WebGL rows are bottom-up
      bc.putImageData(img, 0, 0);
      const out = document.createElement('canvas'); out.width = out.height = PX; const c = out.getContext('2d');
      const g = c.createRadialGradient(PX * .5, PX * .38, PX * .04, PX * .5, PX * .5, PX * .66); g.addColorStop(0, '#535e6d'); g.addColorStop(.5, '#1b212b'); g.addColorStop(1, '#06080c');
      c.fillStyle = g; c.fillRect(0, 0, PX, PX); c.imageSmoothingQuality = 'high'; c.drawImage(big, 0, 0, PX, PX);
      const v = c.createRadialGradient(PX * .5, PX * .45, PX * .3, PX * .5, PX * .5, PX * .72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = v; c.fillRect(0, 0, PX, PX); // a soft vignette over the figure too
      return out.toDataURL('image/png');
    } catch (x) { console.warn('portraits', x); return null; }
    finally {
      for (const o of added) root.remove(o); for (const g of hidden) g.visible = true; root.visible = prev.vis;
      r.setRenderTarget(prev.rt); r.setClearColor(prev.color, prev.alpha);
      if (posed) { try { window.DreamPose?.reset?.(rig); } catch { /* fine */ } rig.maneInitialized = false; }
    }
  }
  // Renders a character once per session (deferred to the next frame), then fills every portrait element that waits for it.
  function request(id) {
    const e = eng(), k = keyOf(id, e); if (cache.has(k) || waiting.has(k)) return;
    waiting.set(k, new Set());
    const go = (tries = 0) => {
      const e2 = eng(); if (!e2?.renderer || !e2.coach?.anatomy) { if (tries < 60) setTimeout(() => go(tries + 1), 1000); else finish(null); return; }
      const rig = rigOf(id, e2), url = rig ? render(rig, e2) : null; finish(url);
    };
    const finish = url => {
      cache.set(k, url || 'fail'); (url ? debug.renders : debug.fails).push(k);
      for (const el of waiting.get(k) || []) fill(el, id, url);
      waiting.delete(k);
    };
    (window.requestAnimationFrame || setTimeout)(() => go());
  }
  const NS = 'http://www.w3.org/2000/svg';
  // Neutral silhouette (head and shoulders), for a 3D character whose render failed.
  function silhouette() {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 40 40'); s.setAttribute('class', 'sp-sil'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<defs><radialGradient id="spv" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#3a4659"/><stop offset=".55" stop-color="#161c27"/><stop offset="1" stop-color="#05070b"/></radialGradient></defs><rect width="40" height="40" fill="url(#spv)"/><circle cx="20" cy="17" r="7.2" fill="#7d8796" opacity=".55"/><path d="M6 40c1.5-8.5 7.5-12.5 14-12.5S32.5 31.5 34 40z" fill="#7d8796" opacity=".45"/>';
    return s;
  }
  const SKIP = /^(coach|mrs\.?|mr\.?|uncle|המאמן|גברת|тренер|миссис)$/i;
  // One letter (the name without a title or a possessive), or the character's own two-letter mark (King Hyena: KH).
  function monogram(name, mono) {
    const words = String(name || '?').split(/\s+/).filter(w => w && !SKIP.test(w) && !/['’]s$/.test(w)), letters = mono || (words[0] ? [...words[0]][0] : '');
    const m = document.createElement('span'); m.className = 'sp-mono'; m.textContent = (letters || '?').toUpperCase(); m.dir = 'auto'; return m;
  }
  function fill(el, id, url) {
    if (!el.isConnected && el.dataset.spFilled) return; el.dataset.spFilled = '1';
    const inner = el.querySelector('.sp-face'); inner.replaceChildren();
    if (url) { const img = new Image(); img.src = url; img.alt = ''; img.decoding = 'async'; img.className = 'sp-img'; inner.append(img); el.dataset.kind = '3d'; }
    else if (has3d(id)) { inner.append(silhouette()); el.dataset.kind = 'silhouette'; }
    else { inner.append(monogram(el.dataset.name, el.dataset.mono)); el.dataset.kind = 'monogram'; }
  }
  // The portrait element: frame + face. 3D characters show the silhouette until their render is ready (usually the next frame).
  function el(id, o = {}) {
    const span = document.createElement('span'), face = document.createElement('span');
    span.className = 'adv-bust sp-portrait'; span.dataset.who = id; span.dataset.name = o.name || ''; if (o.mono) span.dataset.mono = o.mono; span.setAttribute('aria-hidden', 'true');
    if (o.accent) span.style.setProperty('--sp-accent', o.accent);
    face.className = 'sp-face'; span.append(face);
    if (!has3d(id)) { fill(span, id, null); return span; }
    // The Fighter's species is known only once his rig is built: wait for it (the face is keyed by species).
    if (id === 'fighter' && !eng()?.coach?.species) { face.append(silhouette()); span.dataset.kind = 'pending'; let n = 0; const t = setInterval(() => { if (eng()?.coach?.species || ++n > 120) { clearInterval(t); attach(span, id); } }, 500); return span; }
    attach(span, id); return span;
  }
  function attach(span, id) {
    const face = span.querySelector('.sp-face');
    const k = keyOf(id, eng()), hit = cache.get(k);
    if (hit) { fill(span, id, hit === 'fail' ? null : hit); return; }
    if (!face.firstChild) face.append(silhouette()); span.dataset.kind = 'pending';
    request(id); waiting.get(k)?.add(span);
  }
  const api = { el, has3d, render, debug, cache, reset: () => { cache.clear(); debug.renders.length = debug.fails.length = 0; } };
  if (typeof window !== 'undefined') window.StoryPortraits = api;
})();
