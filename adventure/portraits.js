/* Character portraits (GOTR-0081): a sports-broadcast look instead of flat cartoon faces. Characters with a real 3D model get an
 * offscreen render of their own head (lit three-quarter view, dark vignette) made once per session with the game's renderer and
 * cached as an image; the others get a monogram badge in the same frame. A thin metal ring with a small corner accent frames both.
 * If WebGL render-to-image fails, or the head is not on screen to render, a neutral silhouette is shown instead.
 * 3D heads today: the Fighter (the player's lion or rabbit) and Mack (the rabbit). Bruno and Brick come from agent/dream-1's
 * StoryCast.rig when it is loaded. API: StoryPortraits.el(id, { who, lang }) -> <span class="adv-bust sp-portrait">; .debug. */
(() => {
  const PX = 112; // image pixels: 56 css px at 2x
  const cache = new Map(), waiting = new Map(), debug = { renders: [], fails: [] };
  const eng = () => window.app?.engine;
  // id -> the rig whose head is rendered. Only characters with their own model: a recoloured stand-in body would misrepresent them.
  function rigOf(id, e) {
    if (!e?.coach) return null;
    if (id === 'fighter') return e.coach;
    if (id === 'pip') { const r = [e.arena?.padTrainers?.rabbit, e.roster?.get?.('rabbit')].find(x => x?.root && x.joints?.head); return r || (e.coach.species === 'rabbit' ? e.coach : null); }
    if ((id === 'bruno' || id === 'brick') && typeof window.StoryCast?.rig === 'function') { try { return window.StoryCast.rig(id, e) || null; } catch { return null; } }
    return null;
  }
  const has3d = id => id === 'fighter' || id === 'pip' || ((id === 'bruno' || id === 'brick') && typeof window.StoryCast?.rig === 'function');
  const keyOf = (id, e) => id === 'fighter' ? 'fighter:' + (e?.coach?.species || '?') : id;

  // Renders the rig's head into an image. Returns a data URL, or null when the render is empty or WebGL refuses.
  function render(rig, e) {
    const T = window.THREE, r = e.renderer; if (!T || !r || !rig?.root || !rig.joints?.head) return null;
    const root = rig.root, added = [], hidden = [], prev = { rt: r.getRenderTarget(), color: r.getClearColor(new T.Color()), alpha: r.getClearAlpha(), vis: root.visible };
    let rt = null;
    try {
      root.updateMatrixWorld(true);
      const head = rig.joints.head.getWorldPosition(new T.Vector3()), up = new T.Vector3(0, 1, 0);
      const fwd = new T.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
      // Framing per body: the lion's mane is wide, the rabbit's ears are tall (Bruno and Brick are lion-bodied in agent/dream-1).
      const lion = rig.species !== 'rabbit', dist = lion ? 2.3 : 1.3, lift = lion ? .08 : .14;
      const side = new T.Vector3().crossVectors(up, fwd).normalize(), centre = head.clone().addScaledVector(up, lift).addScaledVector(fwd, .03);
      const cam = new T.PerspectiveCamera(22, 1, .05, 20);
      cam.position.copy(centre).addScaledVector(fwd, dist * .82).addScaledVector(side, dist * .55).addScaledVector(up, .12); cam.lookAt(centre); cam.updateMatrixWorld(true);
      // Studio light in world space, parented to the rig only for this one render (lights must be inside the rendered subtree).
      const place = (light, world) => { light.position.copy(root.worldToLocal(world.clone())); root.add(light); added.push(light); };
      const target = new T.Object3D(); target.position.copy(root.worldToLocal(centre.clone())); root.add(target); added.push(target);
      const key = new T.DirectionalLight(0xfff1dd, 3.2); key.target = target; place(key, centre.clone().addScaledVector(fwd, 1).addScaledVector(side, 1.1).addScaledVector(up, .9));
      const rim = new T.DirectionalLight(0xcfe0ff, 1.8); rim.target = target; place(rim, centre.clone().addScaledVector(fwd, -1).addScaledVector(side, -.8).addScaledVector(up, .6));
      const fill = new T.HemisphereLight(0xf2f4ff, 0x3a3028, 1.6); place(fill, centre.clone().addScaledVector(up, 2));
      root.visible = true;
      // Gloves held in guard would cover the face: hidden for the portrait only.
      for (const g of [rig.gloveMeshes?.L, rig.gloveMeshes?.R]) if (g?.visible) { g.visible = false; hidden.push(g); }
      const S = PX * 2; rt = new T.WebGLRenderTarget(S, S, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding;
      r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(root, cam);
      const buf = new Uint8Array(S * S * 4); r.readRenderTargetPixels(rt, 0, 0, S, S, buf);
      let covered = 0; for (let i = 3; i < buf.length; i += 4) if (buf[i] > 8) covered++;
      const share = covered / (S * S); debug.last = { char: rig.character || rig.species, share: +share.toFixed(3) }; if (share < .05 || share > .985) return null; // nothing (head off) or everything (wrong subtree)
      const big = document.createElement('canvas'); big.width = big.height = S; const bc = big.getContext('2d'), img = bc.createImageData(S, S);
      for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4); // WebGL rows are bottom-up
      bc.putImageData(img, 0, 0);
      const out = document.createElement('canvas'); out.width = out.height = PX; const c = out.getContext('2d');
      const g = c.createRadialGradient(PX * .5, PX * .42, PX * .05, PX * .5, PX * .5, PX * .62); g.addColorStop(0, '#3a4659'); g.addColorStop(.55, '#161c27'); g.addColorStop(1, '#05070b');
      c.fillStyle = g; c.fillRect(0, 0, PX, PX); c.imageSmoothingQuality = 'high'; c.drawImage(big, 0, 0, PX, PX);
      return out.toDataURL('image/png');
    } catch (x) { console.warn('portraits', x); return null; }
    finally {
      for (const o of added) root.remove(o); for (const g of hidden) g.visible = true; root.visible = prev.vis;
      r.setRenderTarget(prev.rt); r.setClearColor(prev.color, prev.alpha); rt?.dispose();
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
    if (!has3d(id) || (id === 'fighter' && !eng()?.coach?.species)) { if (!has3d(id)) { fill(span, id, null); return span; } span.querySelector('.sp-face').append(silhouette()); span.dataset.kind = 'silhouette'; return span; }
    const k = keyOf(id, eng()), hit = cache.get(k);
    if (hit) { fill(span, id, hit === 'fail' ? null : hit); return span; }
    face.append(silhouette()); span.dataset.kind = 'pending';
    request(id); waiting.get(k)?.add(span);
    return span;
  }
  const api = { el, has3d, render, debug, cache, reset: () => { cache.clear(); debug.renders.length = debug.fails.length = 0; } };
  if (typeof window !== 'undefined') window.StoryPortraits = api;
})();
