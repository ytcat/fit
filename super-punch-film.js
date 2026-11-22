/* Super Punch knockout film (owner 2026-11-22: "like in Street Fighter or Mortal Kombat ... when the hand touches the opponent it
 * becomes slow motion, the face gets smashed, he falls and blackout, the player does a yeah, shows his muscles or dances ...
 * on the street there is no judge, so no one raises the winner's hand"). sunday-punch.js plays it on the game rigs in real time;
 * this file holds what makes every knockout its own film:
 *  - choose(): a camera choreography and a winner celebration picked from the fight (seed, venue, Opponent, striker), never the
 *    same as the last finisher film (localStorage `gotr-super-punch-last`), so consecutive fights differ;
 *  - CAMERAS: five choreographies for the punch and the fall (low orbit, over-the-shoulder push-in, side tracking, overhead drop,
 *    low front), each a function of the film clock (wall seconds since the glove met the jaw) and the fall clock (fight seconds);
 *  - celebrate(): five celebrations (arms up "yeah", double biceps, a victory shuffle, chest pound, pointing at the crowd) posed
 *    through DreamPose.civil (arms by IK, cleared off the torso), for the lion and the rabbit, gloved or bare-handed;
 *  - ending(): how the scene ends. In the ring the referee waves it off and later raises the winner's hand; in the gym Coach Bruno;
 *    in ringless venues (GOTR-0065: street / market, docks, underground basement) there is no referee: the street crowd cheers and
 *    the beaten man comes to and drags himself away, the dock crowd closes in round the winner, the basement roars;
 *  - blackout(): the fade to black with the K.O. beat after the body lands, and the letterbox bars of the film.
 * Nothing here plays a video file; all of it is pure and testable in node (tests/super-punch-film.test.cjs). */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const LAST = 'gotr-super-punch-last';
  // Film timeline in fight seconds after the impact (the fall itself is in sunday-punch.js T).
  const FILM = Object.freeze({ slow: .22, ramp: .55, refWalk: Object.freeze([.12, 1.0]), wave: Object.freeze([1.0, 1.9]), black: Object.freeze([1.95, 2.12, 2.50, 2.75]), celebrate: 2.3, hold: 5.3, wake: 3.1 });
  // (the winner takes his place for the celebration at FILM.celebrate, inside the black; the picture comes back from black[2])
  const SLOW_HIT = .12, SLOW_DIP = .6; // slow motion from the glove contact; a touch slower than real time on the dip before it
  const CAMERAS = Object.freeze(['side_track', 'low_orbit', 'shoulder_push', 'overhead_drop', 'front_low']);
  const CELEBRATIONS = Object.freeze(['arms_up', 'double_biceps', 'shuffle', 'chest_pound', 'point_crowd']);
  const L = (en, he, ru) => Object.freeze({ en, he, ru });
  // Scene endings. referee: who stops it and raises the hand ('ring' rhino referee, 'bruno', or null = nobody);
  // crowd: what the people round the fight do; fallen: 'out' (stays down) or 'crawl' (comes to and drags himself away).
  const ENDINGS = Object.freeze({
    ring: Object.freeze({ id: 'ring', referee: 'ring', raise: true, crowd: 'cheer', fallen: 'out', prefer: ['arms_up', 'double_biceps', 'point_crowd'] }),
    gym: Object.freeze({ id: 'gym', referee: 'bruno', raise: true, crowd: null, fallen: 'out', prefer: ['arms_up', 'chest_pound', 'shuffle'] }),
    street: Object.freeze({ id: 'street', referee: null, raise: false, crowd: 'cheer', fallen: 'crawl', prefer: ['point_crowd', 'arms_up', 'shuffle'],
      line: L('No referee on the street. The crowd cheers.', 'אין שופט ברחוב. הקהל מריע.', 'На улице нет судьи. Толпа ликует.') }),
    docks: Object.freeze({ id: 'docks', referee: null, raise: false, crowd: 'close', fallen: 'out', prefer: ['chest_pound', 'double_biceps', 'arms_up'],
      line: L('No referee at the Docks. The crowd closes in.', 'אין שופט בנמל. הקהל נסגר סביב.', 'В доках нет судьи. Толпа смыкается.') }),
    underground: Object.freeze({ id: 'underground', referee: null, raise: false, crowd: 'roar', fallen: 'out', prefer: ['double_biceps', 'chest_pound', 'shuffle'],
      line: L('No referee down here. The basement roars.', 'אין כאן שופט. המרתף שואג.', 'Здесь нет судьи. Подвал ревёт.') })
  });
  // Story Opponents give their scene its own words (Chapter 1: Fang in the market street, Rourke at the Docks).
  const STORY = Object.freeze({
    fang: Object.freeze({ fallen: 'crawl', line: L('Fang is down. Market Row cheers.', 'פאנג על הרצפה. השוק מריע.', 'Фанг на земле. Рынок ликует.') }),
    rourke: Object.freeze({ fallen: 'out', line: L('Rourke stays down. The Docks close in.', 'רורק לא קם. הנמל נסגר סביב.', 'Рурк не встаёт. Доки смыкаются.') }),
    brick: Object.freeze({ line: null })
  });
  // 32-bit FNV-1a of a string: the same fight always gives the same film.
  function hash(s) { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  function readLast(store) { try { const s = store ?? (typeof localStorage !== 'undefined' ? localStorage : null); const v = s && JSON.parse(s.getItem(LAST) || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; } }
  function writeLast(pick, store) { try { const s = store ?? (typeof localStorage !== 'undefined' ? localStorage : null); s?.setItem(LAST, JSON.stringify({ camera: pick.camera, celebrate: pick.celebrate })); } catch { /* optional */ } }
  /** The scene ending for a venue id ('ring' / 'gym' / a ringless id) and an Opponent character id (story fights). */
  function ending(place, opponent) {
    const base = ENDINGS[place] || ENDINGS.ring, story = STORY[opponent];
    if (!story || base.referee) return base;
    return Object.freeze({ ...base, ...story, line: story.line === undefined ? base.line : story.line, story: opponent });
  }
  /** Picks this fight's film. f: { seed, venue (set id or 'ring' / 'gym'), place ('ring' | 'gym' | ringless id), opponent, striker, last }. */
  function choose(f = {}) {
    const key = [f.seed >>> 0, f.venue || f.place || 'ring', f.opponent || '', f.striker || ''].join('|'), h = hash(key), h2 = hash(key + '#celebrate'), last = f.last === undefined ? readLast() : f.last;
    const end = ending(f.place || 'ring', f.opponent);
    let camera = CAMERAS[h % CAMERAS.length];
    if (last?.camera === camera) camera = CAMERAS[(CAMERAS.indexOf(camera) + 1 + (h >>> 8) % (CAMERAS.length - 1)) % CAMERAS.length];
    // the scene's favourites come first (two in three fights), any other celebration otherwise
    const pool = (h2 % 3) < 2 && end.prefer ? end.prefer : CELEBRATIONS;
    let celebrate = pool[(h2 >>> 4) % pool.length];
    if (last?.celebrate === celebrate) { const all = CELEBRATIONS; celebrate = all[(all.indexOf(celebrate) + 1 + (h2 >>> 12) % (all.length - 1)) % all.length]; }
    return { key, camera, celebrate, mirror: (h >>> 16) & 1 ? -1 : 1, ending: end };
  }
  /** Fight-time scale: a touch slow on the dip, very slow from the glove contact, back to real time as the body goes. */
  function timeScale(u, active) {
    if (u == null) return active ? SLOW_DIP : 1;
    if (u < FILM.slow) return SLOW_HIT;
    if (u < FILM.ramp) return lerp(SLOW_HIT, 1, smooth((u - FILM.slow) / (FILM.ramp - FILM.slow)));
    return 1;
  }
  /** Blackout opacity at fight time u after the impact (0..1), and whether the K.O. stamp shows. */
  function blackout(u) {
    const [a, b, c, d] = FILM.black; if (u == null || u < a || u > d) return { black: 0, ko: false };
    const black = u < b ? smooth((u - a) / (b - a)) : u < c ? 1 : 1 - smooth((u - c) / (d - c));
    return { black, ko: u > b - .04 && u < c + .08 };
  }
  /** The face taking it: depth (m) of the jaw/cheek squash at fight time u after the impact (a hit, a rebound and a wobble). */
  function squash(u) {
    if (!(u >= 0) || u > .45) return 0;
    const inn = smooth(u / .018), decay = Math.exp(-u / .085);
    return .034 * inn * decay * (Math.cos(u * Math.PI * 2 * 6.5) * .75 + .25);
  }

  /* ---------- camera choreographies ----------
   * f: film seconds (wall) since the glove met the jaw, negative before it (then fight seconds of the dip); u: fight seconds since
   * the impact (null before). Returns { az, h, el, tight, dk }: az = radians round the fighters from the striker's punching side
   * (+ toward behind the striker, so the Opponent's face is seen), h = lens height (m) or el = elevation angle (rad) when looking
   * down from above, tight = 0..1 framing on the faces and the punching glove, dk = distance multiplier (push in < 1). */
  const tightIn = (f, u) => f < 0 ? smooth((f + .35) / .3) : 1 - smooth((f - 1.7) / .9);
  const SHOTS = {
    side_track: (f, u) => ({ az: u == null ? -.14 : lerp(-.14, .10, smooth(u / .9)), h: u == null ? .62 : lerp(.62, 1.40, smooth((u - .7) / 1.1)), tight: tightIn(f, u) * .8, dk: 1 }),
    low_orbit: (f, u) => ({ az: f < 0 ? -.55 : lerp(-.55, .95, smooth(f / 2.6)), h: u == null || u < .55 ? .36 : lerp(.36, 1.15, smooth((u - .55) / 1.0)), tight: tightIn(f, u) * .65, dk: 1 }),
    shoulder_push: (f, u) => ({ az: f < 0 ? 1.15 : lerp(1.15, .55, smooth((f - 1.9) / 1.2)), h: u == null || u < .4 ? 1.62 : lerp(1.62, 1.95, smooth((u - .4) / .9)), tight: tightIn(f, u), dk: f < 0 ? 1.12 : lerp(1.12, .78, smooth(f / 1.7)) + .3 * smooth((f - 1.8) / 1.0) }),
    overhead_drop: (f, u) => { const up = u == null ? 0 : smooth((u - .3) / .9); return { az: lerp(.25, .55, up), h: null, el: lerp(-.04, 1.18, up), tight: tightIn(f, u) * (1 - up), dk: 1 }; },
    front_low: (f, u) => ({ az: f < 0 ? .62 : lerp(.62, .30, smooth((f - 1.6) / 1.4)), h: u == null || u < .5 ? .46 : lerp(.46, 1.25, smooth((u - .5) / 1.1)), tight: tightIn(f, u) * .9, dk: .95 })
  };
  function shot(name, f, u) { return (SHOTS[name] || SHOTS.side_track)(f, u); }

  /* ---------- celebrations (rig space: +z forward, +y up, L at -x; hand targets for DreamPose.civil) ---------- */
  const P = (x, y, z) => [x, y, z];
  const pulse = (c, at, len) => { const k = (c - at) / len; return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };
  // Extra arm shapes for the IK (elbow pole and palm per gesture), registered with DreamPose (only names that are not there yet).
  const GESTURES = {
    yeah: { h: [.30, 2.08, .12], pole: [1, -.2, -.45], palm: [0, 0, 1], turn: .5 },     // fist over the head
    flex: { h: [.42, 1.70, .02], pole: [1, -.25, -.35], palm: [-1, 0, 0], turn: .7 },   // double biceps: elbow out at the shoulder
    pump: { h: [.20, 1.45, .32], pole: [.8, -.6, -.2], palm: [0, 0, -1], turn: .6 },     // fists pumping at the chest (the shuffle)
    sky: { h: [.40, 2.02, .45], pole: [.9, -.3, -.4], palm: [0, -1, 0], turn: .4 }      // arm up and out: pointing at the crowd
  };
  function register(Pose) { const G = Pose?.GESTURES; if (!G) return; for (const [k, v] of Object.entries(GESTURES)) if (!G[k]) G[k] = v; }
  /** DreamPose.civil state for the winner c seconds into his celebration (loops). m = +1 / -1 mirrors the sides. */
  function celebrate(name, c, m = 1) {
    const st = { arms: {}, reach: {}, paws: {}, look: { yaw: 0, pitch: 0 }, lean: 0, drop: 0, talk: 0, lift: 0, yaw: 0, feet: null };
    const A = m > 0 ? 'R' : 'L', B = m > 0 ? 'L' : 'R', sx = s => s === 'R' ? 1 : -1;
    const set = (side, gesture, at, paw = 'fist') => { const s = sx(side); st.arms[side] = gesture; st.reach[side] = [at[0] * s, at[1], at[2]]; st.paws[side] = paw; };
    const rise = smooth(c / .35);
    if (name === 'arms_up') { // "yeah!": both fists thrown up, two hops, fists shaking, shouting at the sky
      const cyc = c % 2.4, hop = c < 1.2 ? pulse(c, .30, .40) + pulse(c, .78, .40) : 0, shake = .028 * Math.sin(c * 15) * rise;
      for (const s of ['L', 'R']) set(s, 'yeah', P(lerp(.22, .30, rise), lerp(1.42, 2.08, rise) + shake * (s === 'R' ? 1 : -1), lerp(.30, .10, rise)));
      st.lift = .075 * hop; st.drop = .05 * (pulse(c, .18, .22) + pulse(c, .66, .22) + pulse(c, 1.10, .2)); st.look.pitch = .38 * rise; st.talk = .85 * pulse(cyc, .2, 1.6) + .3 * pulse(cyc, 1.9, .4); st.lean = -.04 * rise;
    } else if (name === 'double_biceps') { // both arms up and bent, fists by the ears, squeezing; chest out, a roar
      const sq = c > .45 ? .5 + .5 * Math.sin((c - .45) * 7.5) : 0;
      for (const s of ['L', 'R']) set(s, 'flex', P(lerp(.20, .40 - .02 * sq, rise), lerp(1.42, 1.72 + .025 * sq, rise), lerp(.30, .03, rise)));
      st.drop = .04 * rise + .012 * sq; st.lean = -.07 * rise; st.look.pitch = .1 * rise; st.talk = .75 * smooth((c - .35) / .2) * (1 - smooth((c - 1.7) / .3)); st.feet = { L: [-.19, 0, .01], R: [.19, 0, -.02] };
    } else if (name === 'shuffle') { // a quick victory shuffle: feet flicking front and back, fists pumping, hips loose
      const w = Math.PI * 2 * 2.4, k = smooth(c / .3), s1 = Math.sin(c * w);
      st.feet = { L: [-.13, .025 * Math.max(0, Math.cos(c * w)) * k, .11 * s1 * k], R: [.13, .025 * Math.max(0, -Math.cos(c * w)) * k, -.11 * s1 * k] };
      st.drop = (.05 + .02 * Math.abs(s1)) * k; st.yaw = .16 * Math.sin(c * w / 2) * k; st.look.pitch = .08;
      set('L', 'pump', P(.20, 1.45 + .07 * s1 * k, .32)); set('R', 'pump', P(.20, 1.45 - .07 * s1 * k, .32));
      if (c > 1.5) { const up = smooth((c - 1.5) / .3); set(A, 'yeah', P(lerp(.20, .30, up), lerp(1.45, 2.06, up), lerp(.32, .12, up))); st.talk = .7 * up; }
    } else if (name === 'chest_pound') { // fist into the chest three times, then both arms spread wide with a roar
      const beats = [.30, .74, 1.18], hit = beats.reduce((a, b, i) => Math.max(a, (i % 2 ? 0 : 1) * pulse(c, b - .16, .3)), 0), hit2 = pulse(c, beats[1] - .16, .3);
      const fist = (amt) => P(lerp(.24, .10, amt), lerp(1.52, 1.43, amt), lerp(.50, .27, amt));
      if (c < 1.5) { set(A, 'fist', fist(hit)); set(B, 'fist', fist(hit2)); st.look.pitch = .05; st.lean = .03; }
      else { const wide = smooth((c - 1.5) / .35); for (const s of ['L', 'R']) set(s, 'shrug', P(lerp(.24, .58, wide), lerp(1.5, 1.66, wide), lerp(.45, .16, wide)), 'open'); st.look.pitch = .35 * wide; st.talk = .9 * wide; st.lean = -.06 * wide; }
      st.drop = .03;
    } else { // point_crowd: turns to one side of the crowd and points at them, the other hand on the hip; then the other side
      const second = c > 1.35, k = second ? smooth((c - 1.35) / .35) : smooth(c / .35), side = second ? B : A, other = second ? A : B, dir = (side === 'R' ? 1 : -1);
      set(side, 'sky', P(lerp(.22, .46, k), lerp(1.45, 1.86, k), lerp(.30, .50, k)), 'point'); set(other, 'hips', P(.305, 1.085, .03), 'relaxed'); st.arms[other] = 'hips'; delete st.reach[other];
      st.yaw = dir * .45 * k; st.look.yaw = dir * .35 * k; st.look.pitch = .22 * k; st.talk = .6 * pulse(c % 1.35, .15, .9);
    }
    return st;
  }

  /* ---------- the crawl: the beaten man comes to and drags himself away on his elbows (street endings) ---------- */
  /** 0..1 how far he has come round, and metres dragged along his own back, at fight time u (from FILM.wake). */
  function crawl(u) {
    const w = u - FILM.wake; if (!(w > 0)) return { up: 0, drag: 0, push: 0 };
    const up = smooth(w / .9), cyc = Math.max(0, w - .9) / 1.05, n = Math.floor(cyc), part = cyc - n, push = part < .45 ? smooth(part / .45) : 1;
    return { up, drag: Math.min(2.2, (n + push) * .24), push: part < .45 ? Math.sin(Math.PI * part / .45) : 0, cycle: part };
  }

  /* ---------- overlays: letterbox, blackout with the K.O. beat, the scene line ---------- */
  function overlay(stage, state) {
    if (!stage?.querySelector) return null;
    let root = stage.querySelector('.sp-film');
    if (!root) {
      root = stage.ownerDocument.createElement('div'); root.className = 'sp-film'; root.setAttribute('aria-hidden', 'true');
      for (const k of ['sp-bar sp-bar-top', 'sp-bar sp-bar-bottom', 'sp-black', 'sp-lines']) { const d = stage.ownerDocument.createElement('div'); d.className = k; root.append(d); }
      const ko = stage.ownerDocument.createElement('div'); ko.className = 'sp-ko'; ko.textContent = 'K.O.'; ko.dir = 'ltr'; root.querySelector('.sp-black').append(ko);
      stage.append(root);
    }
    root.classList.toggle('on', !!state.bars);
    const black = root.querySelector('.sp-black'); black.style.opacity = String(+(state.black || 0).toFixed(3)); black.classList.toggle('ko', !!state.ko);
    root.querySelector('.sp-lines').classList.toggle('on', !!state.lines);
    return root;
  }

  const api = { FILM, CAMERAS, CELEBRATIONS, ENDINGS, STORY, GESTURES, SLOW_HIT, SLOW_DIP, LAST, hash, choose, ending, readLast, writeLast, timeScale, blackout, squash, shot, celebrate, crawl, register, overlay };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SuperPunchFilm = api;
})();
