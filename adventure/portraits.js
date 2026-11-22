/* Character portraits (GOTR-0081): a sports-broadcast look instead of flat cartoon faces. Characters with a real 3D model get an
 * offscreen render of their own rig (head and shoulders, three-quarter view, one studio light set for everyone, dark vignette)
 * made once per session with the game's renderer and cached as an image; the others get a monogram badge in the same frame. A thin
 * metal ring with a small corner accent frames both. If WebGL render-to-image fails, a neutral silhouette is shown instead.
 * 3D: the Fighter (the player's lion or rabbit), Mack (the rabbit), and every story character on the game rig (StoryCast): Bruno,
 * Brick, Fang, Mrs. Hazel, Otto and Rourke (speaker id 'hook'). Framing is the same for everyone: a first small render finds the top
 * of the head (ears, mane) and the head's middle, the picture then runs from just above the head to the upper chest, so a tall-
 * eared rabbit and a wide-maned lion sit in the frame the same way. Off-stage rigs stand in a neutral pose for the picture (arms
 * down, head straight); gloves are hidden. API: StoryPortraits.el(id, { name, mono, accent }) -> <span class="adv-bust sp-portrait">. */
(() => {
  const PX = 168; // image pixels: 56 css px at 3x (phones)
  const cache = new Map(), waiting = new Map(), debug = { renders: [], fails: [], frames: {} };
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
  const FOV = 20, TAN = Math.tan(FOV * Math.PI / 360), FRAME = .8; // FRAME: the picture's height in metres (head and shoulders)

  // Renders the rig's head and shoulders into an image. Returns a data URL, or null when the render is empty or WebGL refuses.
  function render(rig, e) {
    const T = window.THREE, r = e.renderer; if (!T || !r || !rig?.root || !rig.joints?.head) return null;
    const root = rig.root, added = [], hidden = [], prev = { rt: r.getRenderTarget(), color: r.getClearColor(new T.Color()), alpha: r.getClearAlpha(), vis: root.visible };
    let posed = false;
    try {
      posed = pose(rig, e); root.updateMatrixWorld(true);
      const W = o => o.getWorldPosition(new T.Vector3()), head = W(rig.joints.head), chest = rig.joints.chest ? W(rig.joints.chest) : head.clone().add(new T.Vector3(0, -.32, 0)), up = new T.Vector3(0, 1, 0);
      const fwd = new T.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
      const side = new T.Vector3().crossVectors(up, fwd).normalize();
      // three-quarter view, the camera a little above the eyes
      const dir = fwd.clone().multiplyScalar(Math.cos(.5)).addScaledVector(side, Math.sin(.5)).addScaledVector(up, .08).normalize();
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
      // 1. a small wide render: the top of the head (ears, mane) and where the head sits across the picture
      const S0 = 96, view0 = 1.4, c0 = head.clone().addScaledVector(up, .12), cam = new T.PerspectiveCamera(FOV, 1, .05, 30);
      const aim = (centre, view) => { cam.position.copy(centre).addScaledVector(dir, view / (2 * TAN)); cam.lookAt(centre); cam.updateMatrixWorld(true); };
      aim(c0, view0);
      const a0 = shoot(T, r, root, cam, S0), cov = (x, yTop) => a0[((S0 - 1 - yTop) * S0 + x) * 4 + 3] > 24, rowY = i => c0.y + (.5 - (i + .5) / S0) * view0;
      let top = -1; for (let i = 0; i < S0 && top < 0; i++) { let n = 0; for (let x = 0; x < S0; x++) if (cov(x, i)) n++; if (n >= 2) top = i; }
      if (top < 0) return null;
      const yTop = Math.min(rowY(top), head.y + .46), yHead = head.y; // the top of the head; a rabbit's ear tips may leave the frame
      let sx = 0, sn = 0; for (let i = top; i < S0 && rowY(i) > yHead - .12; i++) for (let x = 0; x < S0; x++) if (cov(x, i)) { sx += x; sn++; }
      const dx = sn ? ((sx / sn + .5) / S0 - .5) * view0 * .6 : 0; // lean the frame toward the head's middle (a long snout or a mane on one side)
      const camRight = new T.Vector3().crossVectors(dir, up).normalize().negate();
      const height = FRAME, centre = c0.clone().addScaledVector(camRight, dx); centre.y = yTop + .03 - FRAME / 2; // one scale for everyone: heads keep their true relative size
      aim(centre, height); debug.frames[rig.character || rig.species] = { height: +height.toFixed(3), top: +(yTop - head.y).toFixed(3), dx: +dx.toFixed(3) };
      // 2. the picture
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
