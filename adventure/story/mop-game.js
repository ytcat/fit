/* Side job A "Clean the gym" (GOTR-0099): the mop-lanes skill game in Bruno's Gym. Rules in mop-core.js (MopCore); this
 * file is the picture: it registers StoryScenes.games.clean_gym, so the story runner (story-scenes.js) plays it with the
 * game's own pad, tutorial, hit-stop, score pops, result card, retry and hard mode.
 *
 * What is seen: the gym hall (set 'dream_gym', day) with two taped lanes on the planks; wet streaks (glossy, they shrink and
 * dry after a clean wipe, a missed one sets into a dull stain); a gold ring closes on the streak as the push lands. The Fighter
 * wears street clothes and no gloves (a job is not training) and holds the mop in both hands: an everyday standing pose
 * (DreamPose.civil with exact hand targets, never the guard), a push-pull stroke on the beat, shuffle steps along the lane,
 * a Slip to the other lane, a Duck under the bag, a stagger when the bag catches him. Coach Bruno stands at the left end
 * and shoves one of the two heavy bags hung high over the lane ends; the bag is drawn from the same pendulum as the rules.
 * Sounds: the game's own samples (a soft swish for each push, a leather thud when the bag lands); the squeak of a clean wipe
 * is a short synthesised rubber chirp, because no existing sample is a squeak.
 * All meshes are built when the job starts and disposed with it (StoryScenes.games[id].dispose). */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const L = (en, he, ru) => ({ en, he, ru });
  const Core = () => window.MopCore, Pose = () => window.DreamPose, WET = '#34495c';
  const sound = (name, level, rate = 1, cutoff = 0) => { try { window.app?.audio?.playSample?.(name, level, rate, 0, cutoff); } catch { /* no sound */ } };
  let squeakBuf = null;
  /** A rubber squeak (no existing sample fits): 110 ms, pitch gliding 1.4 -> 2.3 kHz with a little roughness, soft attack. */
  function squeak(level = .16) {
    const a = window.app?.audio, ctx = a?.ctx; if (!ctx || !a.playSample) return;
    if (!squeakBuf || squeakBuf.sampleRate !== ctx.sampleRate) {
      const sr = ctx.sampleRate, n = Math.round(sr * .11), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0); let ph = 0;
      for (let i = 0; i < n; i++) { const u = i / n, f = 1400 + 900 * u * u + 120 * Math.sin(u * 60), env = Math.min(1, u * 14) * Math.pow(1 - u, 1.6); ph += 2 * Math.PI * f / sr; d[i] = env * (.75 * Math.sin(ph) + .25 * Math.sin(2 * ph + .7) + .05 * (Math.random() - .5)); }
      squeakBuf = buf;
    }
    try { a.playSample(squeakBuf, level, .94 + Math.random() * .12, 0, 6000); } catch { /* no sound */ }
  }

  /* ---------------------------------------------------------------- props (one group in the scene, disposed with the job) */
  function canvasTex(draw, w = 128, h = 128) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); return t; }
  function build(scene, R) {
    const g = new THREE.Group(); g.name = 'Mop lanes'; scene.add(g); const bin = [];
    const keep = o => { bin.push(o); return o; };
    const std = (color, o = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: 0, ...o }));
    const mesh = (geo, mat, parent = g) => { keep(geo); const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };
    const xs = s => R.x0 + s * R.dx, xA = xs(0) - .5, xB = xs(R.spots - 1) + .5;
    // lanes: yellow floor tape along both edges of each lane, short ticks at the spots
    const tape = std('#e9b93c', { roughness: .55 }), tapeRed = std('#e2553f', { roughness: .55 }), tapes = [];
    for (let l = 0; l < R.lanes; l++) {
      const z = R.zLane[l], lane = [];
      for (const dz of [-.36, .36]) { const m = mesh(new THREE.BoxGeometry(xB - xA, .004, .05), tape); m.position.set((xA + xB) / 2, .002, z + dz); m.receiveShadow = true; lane.push(m); }
      for (let s = 0; s < R.spots; s++) for (const dz of [-.36, .36]) { const m = mesh(new THREE.BoxGeometry(.05, .004, .12), tape); m.position.set(xs(s), .003, z + dz * .82); lane.push(m); }
      tapes.push(lane);
    }
    // the streaks: a glossy wet film (alpha from a soft blot) and a dull stain for the ones that set
    const blot = keep(canvasTex((c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(.62, '#e8e8e8'); gr.addColorStop(.86, '#555'); gr.addColorStop(1, '#000'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'multiply'; for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.arc(w / 2 + Math.cos(i * 2.4) * w * .43, h / 2 + Math.sin(i * 2.4) * h * .43, w * (.08 + (i % 3) * .03), 0, 7); c.fill(); } }));
    const glint = keep(canvasTex((c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.filter = 'blur(3px)'; c.beginPath(); c.ellipse(w * .42, h * .4, w * .2, h * .06, -.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(w * .62, h * .6, w * .1, h * .04, -.4, 0, 7); c.fill(); }));
    const pool = { wet: [], ring: null };
    const ringGeo = keep(new THREE.RingGeometry(.93, 1, 48)), ringMat = keep(new THREE.MeshBasicMaterial({ color: '#f4c152', transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
    pool.ring = mesh(ringGeo, ringMat); pool.ring.rotation.x = -Math.PI / 2; pool.ring.renderOrder = 3; pool.ring.visible = false;
    const wetGeo = keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    pool.make = () => { const mat = keep(new THREE.MeshStandardMaterial({ color: WET, roughness: .05, metalness: .35, transparent: true, opacity: .8, alphaMap: blot, depthWrite: false })); const m = mesh(wetGeo, mat); m.renderOrder = 2;
      const sheen = new THREE.Mesh(wetGeo, keep(new THREE.MeshBasicMaterial({ color: '#cfe6f5', transparent: true, opacity: .35, alphaMap: glint, depthWrite: false, toneMapped: false }))); sheen.position.y = .002; sheen.renderOrder = 3; m.add(sheen); m.userData.sheen = sheen; return m; };
    // the bags, hung high over the lane ends ("so you can mop under them"): chain to a ceiling plate, leather, caps, a seam band
    const leather = std('#8f2f22', { roughness: .55 }), cap = std('#1d1f24', { roughness: .5 }), band = std('#e9e4d6', { roughness: .6 }), metal = std('#7d848e', { roughness: .35, metalness: .7 });
    const B = R.bag, bags = [];
    for (let l = 0; l < R.lanes; l++) {
      const z = R.zLane[l] - R.reachZ, pivot = new THREE.Group(); pivot.position.set(B.restX, B.pivotY, z); g.add(pivot);
      const plate = mesh(new THREE.BoxGeometry(.3, .04, .3), metal); plate.position.set(B.restX, B.pivotY + .08, z);
      const chainLen = B.length - B.half, chain = mesh(new THREE.CylinderGeometry(.014, .014, chainLen, 6), metal, pivot); chain.position.y = -chainLen / 2;
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .4, s = mesh(new THREE.CylinderGeometry(.007, .007, .26, 4), metal, pivot); s.position.set(Math.cos(a) * .09, -chainLen - .1 + .22, Math.sin(a) * .09); s.rotation.set(Math.sin(a) * .36, 0, -Math.cos(a) * .36); }
      const body = mesh(new THREE.CylinderGeometry(.2, .2, B.half * 2, 24), leather, pivot); body.position.y = -B.length; body.castShadow = true;
      for (const y of [B.half - .05, -B.half + .04]) { const c2 = mesh(new THREE.CylinderGeometry(.206, .206, y > 0 ? .1 : .08, 24), cap, pivot); c2.position.y = -B.length + y; c2.castShadow = true; }
      const b2 = mesh(new THREE.CylinderGeometry(.203, .203, .14, 24), band, pivot); b2.position.y = -B.length + .08;
      bags.push(pivot);
    }
    // the mop: a wooden handle, a ferrule and a head of cotton strands (they splay on the floor and drag behind)
    const mop = new THREE.Group(); g.add(mop);
    const handle = mesh(new THREE.CylinderGeometry(.016, .016, 1, 8), std('#c9a36a', { roughness: .6 }), mop); handle.castShadow = true;
    const head = new THREE.Group(); mop.add(head);
    const ferrule = mesh(new THREE.CylinderGeometry(.03, .045, .1, 10), std('#3b6fb0', { roughness: .45 }), head); ferrule.position.y = .07;
    const cotton = std('#e8e2d2', { roughness: .95 }), strands = [];
    const sGeo = keep(new THREE.CylinderGeometry(.014, .02, .26, 5)); sGeo.translate(0, -.13, 0);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, s = new THREE.Mesh(sGeo, cotton); s.position.set(Math.cos(a) * .03, .04, Math.sin(a) * .03); s.userData.a = a; head.add(s); strands.push(s); s.castShadow = true; }
    // bucket with a wringer at the right end, and a yellow "wet floor" A-frame at the left end
    const bucket = new THREE.Group(); bucket.position.set(xB + .55, 0, (R.zLane[0] + R.zLane[1]) / 2 - .2); g.add(bucket);
    const pail = mesh(new THREE.CylinderGeometry(.2, .16, .34, 16, 1, true), std('#2f6fc0', { roughness: .5, side: THREE.DoubleSide }), bucket); pail.position.y = .17; pail.castShadow = true;
    const water = mesh(new THREE.CircleGeometry(.185, 16).rotateX(-Math.PI / 2), std('#9fb6c2', { roughness: .1 }), bucket); water.position.y = .27;
    const wring = mesh(new THREE.BoxGeometry(.26, .08, .16), std('#e9b93c'), bucket); wring.position.set(0, .38, -.06);
    const rim = mesh(new THREE.TorusGeometry(.2, .012, 6, 20).rotateX(Math.PI / 2), std('#245a9e'), bucket); rim.position.y = .34;
    const sign = new THREE.Group(); sign.position.set(xA - .25, 0, R.zLane[1] + .55); sign.rotation.y = .5; g.add(sign);
    const yel = std('#f4c152', { roughness: .5 }), signTex = keep(canvasTex((c, w, h) => { c.fillStyle = '#f4c152'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1f24'; c.beginPath(); c.moveTo(w / 2, 14); c.lineTo(w - 18, h - 30); c.lineTo(18, h - 30); c.closePath(); c.fill(); c.fillStyle = '#f4c152'; c.beginPath(); c.moveTo(w / 2, 34); c.lineTo(w - 34, h - 40); c.lineTo(34, h - 40); c.closePath(); c.fill(); c.fillStyle = '#1d1f24'; c.beginPath(); c.arc(w / 2, 60, 8, 0, 7); c.fill(); c.fillRect(w / 2 - 14, 70, 28, 20); }, 128, 128));
    for (const s of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(.32, .62, .02), [yel, yel, yel, yel, keep(new THREE.MeshStandardMaterial({ map: signTex, roughness: .5 })), yel], sign); p.position.set(0, .3, s * .1); p.rotation.x = s * .17; p.castShadow = true; }
    return { g, bin, tapes, tape, tapeRed, pool, bags, mop, handle, head, strands, wetMeshes: new Map() };
  }
  function dispose(P) { if (!P) return; P.g.parent?.remove(P.g); for (const o of new Set(P.bin)) o.dispose?.(); }

  /* ---------------------------------------------------------------- the Fighter with the mop (everyday pose, no guard) */
  const STAND = { L: [-.15, 0, .1], R: [.15, 0, -.12] }; // a relaxed stagger, left foot ahead
  /** Feet in rig space while the root travels: the leading foot moves first, the other follows, each lifted a little. */
  function feet(v, R) {
    const b = v.body, f = v.f; if (!b.moving || !f.from) return { L: STAND.L, R: STAND.R };
    const X0 = R.x0 + f.from.spot * R.dx, X1 = R.x0 + f.spot * R.dx, Z0 = R.zLane[f.from.lane] - R.reachZ, Z1 = R.zLane[f.lane] - R.reachZ, out = {};
    const plusX = X1 > X0, plusZ = Z1 > Z0, sideways = X1 !== X0;
    for (const side of ['L', 'R']) {
      const [lx, , lz] = STAND[side], lead = sideways ? (side === 'L') === plusX : (side === 'L') === plusZ; // mirrored root: rig -x is world +x
      const fe = lead ? smooth(b.k / .62) : smooth((b.k - .38) / .62);
      const wx = lerp(X0 - lx, X1 - lx, fe), wz = lerp(Z0 + lz, Z1 + lz, fe);
      out[side] = [b.x - wx, .07 * Math.sin(Math.PI * clamp(fe)), wz - b.z];
    }
    return out;
  }
  /** Mop head and both hands in rig space for this frame. push 1 = the head reaches the streak (the stroke lands). */
  function grip(v, x) {
    const t = x.t; let push, sway, lift = 0;
    const sinceMop = v.t - v.lastMop, swish = sinceMop >= 0 && sinceMop < .35 ? Math.sin(sinceMop / .35 * Math.PI) : 0;
    if (v.phase === 'mop') { const u = v.strokeK; push = u < .55 ? 1 - smooth(u / .55) : smooth((u - .55) / .45); sway = .12 * Math.sin(u * Math.PI * 2); }
    else if (v.phase === 'move') { push = .35; sway = 0; }
    else if (v.phase === 'duck') { push = .55; sway = 0; lift = 0; }
    else if (v.phase === 'stunned') { push = .2; sway = .1 * Math.sin(t * 9); lift = .25 * (1 - v.stunK); }
    else { push = .45 + .08 * Math.sin(t * 1.3); sway = .05 * Math.sin(t * .9); }
    sway += .2 * swish * Math.sin(sinceMop * 30); // the quick wipe after a tap
    const H = V(sway, .05 + lift, .42 + .42 * push), duck = v.ducking ? smooth(v.duckK / .25) * (1 - smooth((v.duckK - .7) / .3)) : 0;
    const U = V(.14, 1.06 + .04 * (1 - push) - .36 * duck, .12 + .2 * push + .05 * duck);
    const d = U.clone().sub(H).normalize(), Lh = U.clone().addScaledVector(d, -.5);
    return { H, U, Lh, d, push, duck };
  }

  /* ---------------------------------------------------------------- the game definition (StoryScenes.games.clean_gym) */
  const words = {
    en: { title: 'Clean the gym', goal: 'Mop the wet streaks', clean: 'Clean', combo: 'Combo', left: 's', help: 'Step to a streak, tap Mop as the ring closes. Bruno shoves a bag: Slip or Duck.', mop: 'Mop!', go: 'Wet floor', dodge: 'Bag!', watch: 'Bruno…', ouch: 'Ouch!', stains: 'Stains', knocks: 'Knocked', pay: 'Pay +{n} ◈', caps: { up: 'Slip', down: 'Duck', left: 'Step', right: 'Step' }, pads: { straight: 'Mop' } },
    he: { title: 'לנקות את האולם', goal: 'נגבו את הכתמים הרטובים', clean: 'נוקו', combo: 'רצף', left: 'שנ׳', help: 'צעדו לכתם והקישו "מגב" כשהטבעת נסגרת. ברונו דוחף שק: Slip או התכופפו.', mop: 'מגב!', go: 'רצפה רטובה', dodge: 'שק!', watch: 'ברונו…', ouch: 'אאוץ׳!', stains: 'כתמים', knocks: 'נפגעתם', pay: 'שכר +{n} ◈', caps: { up: 'Slip', down: 'להתכופף', left: 'צעד', right: 'צעד' }, pads: { straight: 'מגב' } },
    ru: { title: 'Уборка зала', goal: 'Вытрите мокрые полосы', clean: 'Чисто', combo: 'Серия', left: 'с', help: 'Шаг к полосе — жмите «Швабра», когда кольцо сомкнётся. Бруно толкает мешок: Slip или нырок.', mop: 'Швабра!', go: 'Мокрый пол', dodge: 'Мешок!', watch: 'Бруно…', ouch: 'Ой!', stains: 'Пятна', knocks: 'Сбит', pay: 'Плата +{n} ◈', caps: { up: 'Slip', down: 'Нырок', left: 'Шаг', right: 'Шаг' }, pads: { straight: 'Швабра' } }
  };
  // Bruno: one line before the shift, one after (by stars). Spoken lines, natural EN / HE / RU (he talks to one young man).
  // The journal copy lives in adventure/story.js (clean_gym.job, job_0..job_3); these are the fallback when it is not loaded.
  const SAY = {
    intro: L("Floor's yours, kid. Mop on the beat, mind the bags.", 'הרצפה שלך, ילד. מגב בקצב, ותיזהר מהשקים.', 'Пол твой, малой. Шваброй в такт и следи за мешками.'),
    end: [L('Call that clean? Again.', 'זה נקרא נקי? עוד פעם.', 'Это, по-твоему, чисто? Ещё раз.'),
      L('Not bad. Quicker feet next time.', 'לא רע. בפעם הבאה רגליים יותר מהירות.', 'Неплохо. В следующий раз ноги побыстрее.'),
      L('Good. You ducked that bag like a boxer.', 'יפה. התכופפת מתחת לשק כמו מתאגרף.', 'Хорошо. Под мешок нырнул как боксёр.'),
      L('Floor shines. Feet like that win fights.', 'הרצפה מבריקה. עם רגליים כאלה מנצחים קרבות.', 'Пол блестит. С такими ногами бои выигрывают.')]
  };
  function hud(v, g) {
    const prompt = v.prompt === 'bagged' ? g.ouch : v.prompt === 'dodge' ? (v.bag?.phase === 'warn' ? g.watch : g.dodge) : v.prompt === 'mop' ? g.mop : v.prompt === 'go' ? g.go : '';
    return { goal: `${g.goal} · ${g.clean} ${v.cleaned} · ${g.combo} ${v.streak} · ${Math.ceil(v.left)} ${g.left}`, prompt, arrow: v.prompt === 'dodge' && v.bag?.phase === 'swing' ? 'down' : v.prompt === 'mop' ? 'straight' : '', kind: v.prompt === 'dodge' || v.prompt === 'bagged' ? 'warn' : v.prompt === 'mop' ? 'straight' : '', ring: v.ring, now: !!v.open };
  }
  const game = {
    set: 'dream_gym', place: 'gym', wear: 'street', // the gym, but a job: street clothes, bare hands (owner's outfit rule)
    roles: { fighter: {}, bruno: { rig: 'bruno' } },
    make: (T, o) => new (Core().MopTrial)(undefined, o), pads: ['straight'], ghost: ['right', 'straight', 'up', 'down'], words, padWords: lang => words[lang]?.pads || words.en.pads,
    job: 'clean_gym', pay: stars => Core().pay(stars),
    say: (phase, res) => { const kind = phase === 'intro' ? 'job' : 'job_' + (res?.stars || 0), own = window.AdventureStory?.lines?.clean_gym?.[kind]?.[0]; return { who: 'bruno', id: 'clean_gym', kind, text: own?.text || (phase === 'intro' ? SAY.intro : SAY.end[res?.stars || 0]) }; },
    hud,
    detail: (r, g) => `${g.clean} ${r.cleaned} · ${g.stains} ${r.stains} · ${g.knocks} ${r.knocks}`,
    dispose: x => { dispose(x.scene?.userData.mop); if (x.scene) x.scene.userData.mop = null; },
    frame(x, v, dt) {
      const R = Core().MOP, f = x.rigs.fighter, br = x.rigs.bruno, P = x.scene.userData.mop || (x.scene.userData.mop = build(x.scene, R));
      const m = x.memo, t = x.t, Ps = Pose();
      if (!P.tuned) { P.tuned = true; // the hall's own interior light, as the gym films use it (dream-scenes.js tuneInterior)
        x.scene.fog = null; x.scene.background = new THREE.Color('#2a2420').convertSRGBToLinear();
        x.set.group.traverse(o => { if (o.isHemisphereLight) { o.intensity = .78; o.color.set(0xfff1dc); o.groundColor.set(0x9a7a5c); } else if (o.isAmbientLight) o.intensity = .2; });
        if (x.set.sun) { x.set.sun.intensity = 1.25; x.set.sun.color.set(0xffe6c2); } }
      // ---- streaks and the timing ring (a restart begins a fresh floor)
      if (P.sim !== x.sim) { P.sim = x.sim; for (const me of P.wetMeshes.values()) { me.parent?.remove(me); me.material.dispose(); } P.wetMeshes.clear(); }
      const seen = new Set();
      for (const w of v.wet) {
        seen.add(w.id); let me = P.wetMeshes.get(w.id); if (!me) { me = P.pool.make(); P.wetMeshes.set(w.id, me); me.userData.born = t; }
        const X = R.x0 + w.spot * R.dx, Z = R.zLane[w.lane], grow = smooth((t - me.userData.born) / .35), big = w.big ? 1.3 : 1;
        let sc = grow * big, op = .8, col = WET;
        if (w.state === 'wet') { if (w.wipes < (w.big ? 2 : 1)) sc *= .7; op = .55 + .3 * w.left; if (w.left < .3 && !x.reduced) op *= .75 + .25 * Math.sin(t * 14); } // the last moments: it is setting
        else if (w.state === 'clean') { const k = smooth(w.since / .7); sc *= 1 - .65 * k; op = .8 * (1 - k); } // wiped: the film shrinks and dries
        else { col = '#6e5638'; op = .5 * (1 - smooth((w.since - 1.2) / 1.3)); me.material.roughness = .9; me.material.metalness = 0; } // set into a stain, then fades
        me.material.color.set(col); me.material.opacity = Math.max(0, op); me.visible = op > .01; me.userData.sheen.material.opacity = w.state === 'stain' ? 0 : .4 * Math.max(0, op);
        me.position.set(X, .006 + w.id % 5 * .0004, Z); me.rotation.y = w.turn; me.scale.set(.78 * w.len * sc + .01, 1, .5 * sc + .01);
      }
      for (const [id, me] of P.wetMeshes) if (!seen.has(id)) { me.parent?.remove(me); me.material.dispose(); P.wetMeshes.delete(id); }
      const ring = P.pool.ring, on = v.on != null && v.ring >= 0 && !x.over;
      ring.visible = on; if (on) { const X = R.x0 + v.f.spot * R.dx, Z = R.zLane[v.f.lane], s = .34 + .5 * (1 - v.ring); ring.position.set(X, .012, Z); ring.scale.set(s * 1.3, s, 1); ring.material.opacity = v.open ? 1 : .55; ring.material.color.set(v.open ? '#ffe28a' : '#f4c152'); }
      // ---- lane tape of the bag's lane turns red while Bruno is at it (the warning is on the floor, not over anyone)
      const hot = v.bag && v.bag.phase !== 'caught' ? v.bag.lane : -1;
      P.tapes.forEach((lane, l) => { const mat = l === hot && (x.reduced || Math.sin(t * 12) > -.3) ? P.tapeRed : P.tape; for (const me of lane) me.material = mat; });
      // ---- bags: the pendulum of the rules; the idle one breathes a little
      P.bags.forEach((pivot, l) => { const th = v.bag && v.bag.lane === l ? v.bag.th : .012 * Math.sin(t * 1.7 + l * 2); pivot.rotation.set(0, 0, th); });
      if (v.bag && v.bag.phase === 'swing' && m.shoveSnd !== v.bag.lane + ':' + (v.t - v.bag.tau).toFixed(1)) { m.shoveSnd = v.bag.lane + ':' + (v.t - v.bag.tau).toFixed(1); sound('pad', .22, .62, 1600); }
      // ---- the Fighter: placed by the rules, posed as a person with a mop
      const b = v.body; f.root.position.set(b.x, 0, b.z); f.root.rotation.set(0, 0, 0);
      const gp = grip(v, x), stagger = v.stunned ? (1 - v.stunK) : 0;
      if (stagger && !x.reduced) { f.root.position.x += -.12 * Math.sin(v.stunK * Math.PI) * (m.hitDir || 1); f.root.rotation.z = .07 * Math.sin(t * 22) * stagger; }
      f.root.updateMatrixWorld(true);
      let look = { yaw: 0, pitch: -.42 };
      if (v.danger || v.stunned) { const bw = V(R.bag.restX + (v.bag ? Math.sin(v.bag.th) * R.bag.length : 0), 2.1, b.z), p = f.root.worldToLocal(bw); look = { yaw: Math.atan2(p.x, p.z), pitch: .05 }; }
      Ps.civil(f, { t, dt: dt > 0 ? dt : 0, dist: 0, walk: 0, feet: feet(v, R), arms: { L: 'low', R: 'low' }, reach: { L: gp.Lh.toArray(), R: gp.U.toArray() }, lean: .2 + .1 * gp.push + .38 * gp.duck - .25 * stagger, drop: .05 + .4 * gp.duck, look });
      // ---- the mop follows the hands: handle through both grips, head on the floor
      const grab = s => f.joints['hand' + s].localToWorld(V(0, -.07, .02)); // the middle of the closed hand, not the wrist
      const hu = grab('R'), foot = f.root.localToWorld(gp.H.clone());
      const dir = hu.clone().sub(foot); if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0); dir.normalize(); const top = hu.clone().addScaledVector(dir, .16);
      const len = foot.distanceTo(top); P.handle.scale.set(1, len, 1); P.handle.position.copy(foot).add(top).multiplyScalar(.5); P.handle.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      P.head.position.copy(foot); P.head.quaternion.setFromUnitVectors(V(0, 1, 0), V(dir.x * .25, 1, dir.z * .25).normalize());
      const vel = m.lastFoot ? foot.clone().sub(m.lastFoot).divideScalar(Math.max(1e-3, dt || 1 / 60)) : V(); m.lastFoot = foot.clone();
      const drag = V(-vel.x, 0, -vel.z).multiplyScalar(.05).clampLength(0, .6); m.drag = (m.drag || V()).lerp(drag, clamp((dt || .016) * 10));
      for (const s of P.strands) { const a = s.userData.a; s.rotation.set(Math.sin(a) * 1.1 + m.drag.z * 2.2, 0, -Math.cos(a) * 1.1 - m.drag.x * 2.2); }
      // ---- sounds: a soft swish on each push, the squeak of a clean wipe, a thud when the bag lands
      if (v.phase === 'mop' && m.lastU != null && v.strokeK < m.lastU && !x.over) sound('air-swing', .05, 1.6, 2600);
      m.lastU = v.phase === 'mop' ? v.strokeK : null;
      const fl = v.flash; if (fl && fl.t !== m.flT) { m.flT = fl.t; if (fl.type === 'hit' || fl.type === 'perfect') squeak(fl.type === 'perfect' ? .2 : .14); else if (fl.type === 'bagged') { sound('body-1', .5, .7, 1400); m.hitDir = v.bag && v.bag.th > 0 ? 1 : -1; } else if (fl.type === 'dodge') sound('swing', .14, .8, 2400); }
      // ---- Coach Bruno at the left end: arms folded, a hand on the bag to wind it up, the shove, and he catches it on the way back
      const bz = (R.zLane[0] + R.zLane[1]) / 2 - R.reachZ, BX = R.bag.restX - .78, lane = v.bag ? v.bag.lane : m.bLane ?? 0; m.bLane = lane;
      const BZ = R.zLane[lane] - R.reachZ, face = Math.atan2(R.bag.restX - BX, BZ - bz);
      br.root.position.set(BX, 0, bz); m.bFace = lerp(m.bFace ?? face, v.bag ? face : Math.PI / 2 + .25, clamp((dt || .016) * 5)); br.root.rotation.set(0, m.bFace, 0); br.root.updateMatrixWorld(true);
      const st = { t, dt: dt > 0 ? dt : 0, dist: 0, arms: { L: 'cross', R: 'cross2' }, look: null, lean: 0 };
      const toLocal = p => br.root.worldToLocal(p.clone()).toArray();
      if (v.bag) {
        const th = v.bag.th, c = V(R.bag.restX + Math.sin(th) * R.bag.length, R.bag.pivotY - Math.cos(th) * R.bag.length - .1, BZ), side = V(-Math.cos(face) * .1, 0, Math.sin(face) * .1);
        const near = c.clone().add(V(-Math.cos(th) * .2, 0, 0)), reachable = c.x - BX < .95;
        if (v.bag.phase === 'warn') { const pull = Math.sin(v.bag.warn * Math.PI * .5); st.arms = { L: 'low', R: 'low' }; st.reach = { L: toLocal(near.clone().add(side).add(V(-.05 * pull, -.05, 0))), R: toLocal(near.clone().sub(side).add(V(-.05 * pull, .05, 0))) }; st.lean = .12 - .08 * pull; }
        else if (reachable) { st.arms = { L: 'low', R: 'low' }; st.reach = { L: toLocal(near.clone().add(side)), R: toLocal(near.clone().sub(side)) }; st.lean = .18; }
        else if (v.bag.tau < .5) { st.arms = { L: 'point', R: 'point' }; st.lean = .15; }
        const p = br.root.worldToLocal(c.clone()); st.look = { yaw: Math.atan2(p.x, p.z), pitch: -.05 };
      } else { const p = br.root.worldToLocal(V(b.x, 1.6, b.z + .6)); st.look = { yaw: Math.atan2(p.x, p.z), pitch: -.2 }; st.talk = x.over && t - x.overAt < 2.4 ? 1 : 0; }
      Ps.civil(br, st);
      // ---- camera: in front of the lanes, a little above, both lanes and Bruno in the picture
      return { pos: [-.3, 3.3, 7.7], look: [-.3, 1.95, .55], fit: [f, br] };
    }
  };
  function register() { const S = window.StoryScenes; if (!S?.games || S.games.clean_gym) return; S.games.clean_gym = game; }
  if (window.StoryScenes) register(); else window.addEventListener('DOMContentLoaded', register);
  window.MopGame = { register, game, words, SAY, feet, grip };
})();
