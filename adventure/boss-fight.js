/* Boss bouts (GOTR-0062, docs/adventure/BOSSES_SCOUTING_CHOICES.md): three phases by the boss's health, one readable tell
 * before his big attack, and a weak point that opens after three right answers to the tell. A controller that sits on an
 * existing BoxingFight match (boxing-fight.js): it chooses the boss's actions and scales observed damage; scoring, contacts
 * and poses stay the engine's own (a hit still has to land in the 3D contact solver). Rules work in node (tests).
 * The browser part (hud) writes plain text on the scene: the phase and answers in the goal line, one call line under it.
 *
 * Brick (chapter 1, brawler): 1 slow heavy hooks, 2 (60% health) charges forward, 3 (25%) tired, wild swings.
 * Tell: his right glove (the southpaw lead) drops to the hip, then the big lead hook comes.
 * Answer: Duck (the pad's Duck = roll) under it, then an Uppercut while he is over-committed. */
(() => {
  const L = (en, he, ru) => ({ en, he, ru });
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const other = a => a === 'lion' ? 'rabbit' : 'lion';
  const plan = list => list.map(([move, target]) => ({ move, target: target || 'head' }));
  const BOSSES = {
    brick: {
      chapter: 1, rounds: 3, roundSeconds: 30, restSeconds: 8,
      tellStyle: 'drop_lead', bigMove: 'hook', bigSlow: 1.12, bigPower: 1.45,
      defence: ['roll'], counter: ['uppercut', 'rear_uppercut'],
      needed: 3, counterSeconds: 1.4, counterBonus: 1.5, weakSeconds: 4.5, weakBonus: 2, firstTell: 3,
      phases: [
        { at: 1, key: 'heavy', tempo: .86, skill: 0, gap: .45, every: 7, tell: 1, tactic: 'pressure',
          plans: [[['hook']], [['jab'], ['rear_hook']], [['rear_hook', 'body'], ['hook']], [['jab'], ['jab'], ['rear_hook']]] },
        { at: .6, key: 'charge', tempo: 1.06, skill: 0, gap: .1, every: 5.5, tell: .9, tactic: 'pressure',
          plans: [[['step'], ['hook'], ['rear_hook']], [['step'], ['jab'], ['cross'], ['hook']], [['step'], ['rear_hook', 'body'], ['hook']]] },
        { at: .25, key: 'wild', tempo: .9, skill: -.18, gap: .6, every: 4.5, tell: 1, tactic: 'pressure',
          plans: [[['rear_hook'], ['hook'], ['rear_hook']], [['hook'], ['rear_hook', 'body']], [['rear_uppercut'], ['hook']]] }
      ]
    }
  };
  // Phase from the boss's health (0..1): it only ever moves forward.
  function phaseFor(id, health) { const ph = BOSSES[id].phases; let p = 1; for (let i = 1; i < ph.length; i++) if (health <= ph[i].at + 1e-9) p = i + 1; return p; }

  // attach(match, {boss, actor, player, scouted, clip, onEvent}) -> controller. clip: a watched scouting bout, the other
  // fighter does not defend the tell so the big hook can be seen landing.
  function attach(match, o) {
    const b = BOSSES[o.boss]; if (!b || !match?.fighters?.[o.actor]) throw Error('Unknown boss bout.');
    const boss = o.actor, player = o.player || other(boss), f = match.fighters[boss], base = { tempo: f.tempo, skill: f.skill };
    const s = { boss: o.boss, phase: 1, answers: 0, reads: 0, misses: 0, landedBig: 0, weakCount: 0, scouted: !!o.scouted, clip: !!o.clip,
      nextTell: null, tell: null, hook: null, pendingHook: false, rolled: false, counterPending: 0, counterUntil: 0, counterAction: 0, weakUntil: 0, seen: 0, tells: 0 };
    const P = () => b.phases[s.phase - 1];
    const emit = (type, data = {}) => { const ev = match.emit('boss-' + type, { boss: o.boss, phase: s.phase, ...data }); o.onEvent?.(ev); return ev; };
    const tune = () => { f.tempo = base.tempo * P().tempo; f.skill = clamp(base.skill + P().skill, .2, .99); };
    const pose = (style, duration, extra = {}) => { f.plan = []; f.action = { id: ++match.actionId, actor: boss, move: 'guard', guardStyle: style, start: match.time, duration, attack: false, ...extra }; return f.action; };
    tune();
    const decide0 = match.decide, advance0 = match.advance, contact0 = match.contact;

    function startTell() {
      const a = pose(b.tellStyle, P().tell, { tell: true });
      s.tell = { id: a.id, start: a.start, end: a.start + a.duration }; s.pendingHook = true; s.rolled = false; s.counterPending = 0; s.tells++;
      emit('tell', { until: s.tell.end });
    }
    function startHook() {
      s.pendingHook = false; const a = match.attack(boss, b.bigMove, 'head'); if (!a) { s.tell = null; return; }
      a.big = true; a.duration *= b.bigSlow; s.hook = { id: a.id, start: a.start, duration: a.duration, landed: false };
      emit('hook', { action: a.id });
    }
    function answer(id) {
      s.counterPending = 0; s.counterUntil = 0; s.answers++; s.counterAction = id; emit('answer', { answers: s.answers, needed: b.needed });
      if (s.answers >= b.needed) {
        s.answers = 0; s.weakCount++; s.weakUntil = match.time + b.weakSeconds; s.nextTell = s.weakUntil + P().every * .6;
        pose('drop_both', b.weakSeconds, { weak: true }); emit('weak', { until: s.weakUntil });
      }
    }
    // The hook is over (or was cut by a bell or knockdown): a read is a Duck in the window and the hook not landing.
    function resolve() {
      const h = s.hook, live = match.phase === 'round' && !match.result; s.hook = null; s.tell = null;
      s.nextTell = match.time + (s.clip ? 3 : P().every);
      if (!live) { s.counterPending = 0; s.rolled = false; return; }
      if (!h.landed && s.rolled) {
        s.reads++; s.counterUntil = match.time + b.counterSeconds; pose(b.tellStyle, b.counterSeconds, { stagger: true }); emit('read', { reads: s.reads });
        if (s.counterPending) answer(s.counterPending);
      } else { s.misses++; s.counterPending = 0; emit('hook-end', { landed: h.landed }); }
      s.rolled = false;
    }
    // The Fighter's new actions: a Duck during the tell or before the hook's contact; an Uppercut after a Duck.
    function watchPlayer() {
      const a = match.fighters[player].action; if (!a || a.id <= s.seen) return; s.seen = a.id;
      if (b.defence.includes(a.move)) {
        const t0 = s.tell?.start; if (t0 == null) return;
        const late = s.hook ? s.hook.start + s.hook.duration * .6 : Infinity;
        if (a.start >= t0 - .15 && a.start <= late) s.rolled = true;
      } else if (b.counter.includes(a.move)) {
        if (s.rolled && (s.hook || s.pendingHook)) s.counterPending = a.id;
        else if (match.time <= s.counterUntil) answer(a.id);
      }
    }

    match.decide = function (actor) {
      if (actor !== boss) {
        if (s.clip && (s.tell || s.hook)) { this.fighters[actor].next = this.time + .25; return; }
        return decide0.call(this, actor);
      }
      const t = this.time, op = this.fighters[player], incoming = op.action?.attack && t - op.action.start < op.action.duration * .57;
      if (s.pendingHook) { startHook(); return; }
      if (!incoming && s.nextTell != null && t >= s.nextTell && t >= s.weakUntil) { startTell(); return; }
      if (!f.plan.length && !incoming) { const lib = P().plans; f.plan = plan(lib[Math.floor(this.random() * lib.length)]); f.tactic = P().tactic; }
      decide0.call(this, actor);
      if (f.action?.move === 'step' && !f.action.attack && s.phase === 2) f.action.stepAdvance = .45; // the charge: steps go forward
    };
    match.advance = function (dt) {
      const had = f.action?.id;
      advance0.call(this, dt);
      if (s.weakUntil && (this.time >= s.weakUntil || this.phase !== 'round' || this.result)) { s.weakUntil = 0; emit('weak-end'); }
      if (this.phase !== 'round' || this.result) {
        if (s.hook) resolve(); s.tell = null; s.pendingHook = false; s.nextTell = null; s.counterUntil = 0; return;
      }
      if (s.nextTell == null) s.nextTell = this.time + (s.clip ? 1.2 : b.firstTell);
      watchPlayer();
      if (s.hook && f.action?.id !== s.hook.id) resolve();
      if (s.pendingHook && !f.action && !f.down) startHook();
      else if (had && !f.action && !s.pendingHook) f.next += P().gap;
      const np = phaseFor(o.boss, f.condition / 100);
      if (np > s.phase) {
        s.phase = np; tune(); s.pendingHook = false; if (s.hook) { s.hook = null; } s.tell = null; s.nextTell = this.time + 2.2;
        if (!(this.time < s.weakUntil)) { f.plan = []; f.action = { id: ++this.actionId, actor: boss, move: 'step', start: this.time, duration: 1.1, attack: false, stepAdvance: -.35, phaseBeat: true }; }
        emit('phase', { key: P().key });
      }
    };
    match.contact = function (c) {
      const victim = this.fighters[other(c.actor)], before = victim.condition, act = this.fighters[c.actor]?.action;
      const ev = contact0.call(this, c); if (!ev) return ev;
      if (!ev.legal) return ev;
      let mult = 1;
      if (c.actor === boss && act?.big) { mult = b.bigPower; if (s.hook?.id === act.id) s.hook.landed = true; s.landedBig++; emit('big-hit'); }
      else if (c.actor === player) mult = this.time < s.weakUntil ? b.weakBonus : act?.id === s.counterAction ? b.counterBonus : 1;
      if (mult !== 1) { const lost = before - victim.condition; victim.condition = Math.max(0, victim.condition - lost * (mult - 1)); ev.bossBonus = mult; }
      return ev;
    };
    const detach = () => { delete match.decide; delete match.advance; delete match.contact; if (match.decide !== decide0) { match.decide = decide0; match.advance = advance0; match.contact = contact0; } f.tempo = base.tempo; f.skill = base.skill; };
    return { state: s, data: b, boss, player, detach, phase: () => s.phase, weak: () => match.time < s.weakUntil, tellActive: () => !!(s.tell || s.hook || s.pendingHook) && match.time < (s.hook ? s.hook.start + s.hook.duration : s.tell?.end ?? 0) };
  }

  // ---- text (EN/HE/RU; boxing terms stay in Latin script, see glossary.js) ----
  const copy = {
    phases: { brick: [L('Slow heavy Hooks', 'Hook כבדים ואיטיים', 'Медленные тяжёлые Hook'), L('Charging', 'מסתער', 'Идёт напролом'), L('Tired, wild swings', 'עייף, מניף בפראות', 'Устал, машет как попало')] },
    lines: { brick: { 2: L("Enough dancing. I'm coming through!", 'די לרקוד. אני עובר דרככם!', 'Хватит танцев. Я иду напролом!'), 3: L('Huff... still up? Then I swing till you drop!', 'פוף... עוד עומדים? אז אני מניף עד שתיפלו!', 'Уф... ещё стоишь? Тогда буду махать, пока не упадёшь!') } },
    tell: { brick: L('Right hand down → Duck!', 'יד ימין למטה ← התכופפות!', 'Правая рука вниз → Нырок!') },
    counter: { brick: L('Now: Uppercut!', 'עכשיו: Uppercut!', 'Сейчас: Uppercut!') },
    notebook: { brick: L('Brick: drops his right hand → Duck, then Uppercut', 'בריק: מוריד את יד ימין ← התכופפות, ואז Uppercut', 'Брик: опускает правую руку → Нырок, затем Uppercut') },
    words: {
      en: { phase: 'Phase {p}/3: {n}', ducked: 'Ducked!', answer: 'Right answer {n}/{k}', weak: 'Weak point! He is wide open — hit him!', big: 'Wrecking Hook!' },
      he: { phase: 'שלב {p}/3: {n}', ducked: 'התכופפתם!', answer: 'תשובה נכונה {n}/{k}', weak: 'נקודת תורפה! הוא פתוח לגמרי — הכו!', big: 'Hook מוחץ!' },
      ru: { phase: 'Фаза {p}/3: {n}', ducked: 'Нырнул!', answer: 'Верный ответ {n}/{k}', weak: 'Слабое место! Он раскрыт — бей!', big: 'Сокрушительный Hook!' }
    }
  };
  const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  // The goal line: boss name, phase and the answers so far (● right answer, ○ still needed).
  function stripText(ctl, name, lang = 'en') {
    const s = ctl.state, w = copy.words[lang] || copy.words.en, ph = copy.phases[s.boss][s.phase - 1];
    return `${name} · ${fill(w.phase, { p: s.phase, n: ph[lang] || ph.en })} · ${'●'.repeat(s.answers)}${'○'.repeat(ctl.data.needed - s.answers)}`;
  }
  // Which call line to show now, from the controller state and the last boss event. Scouted: the tell itself is marked.
  function callFor(ctl, ev, time, lang = 'en') {
    const s = ctl.state, w = copy.words[lang] || copy.words.en, T = o => o?.[lang] || o?.en || '';
    if (time < s.weakUntil) return { text: w.weak, cls: 'weak' };
    if (s.scouted) {
      if ((s.tell || s.pendingHook || s.hook) && !s.rolled) return { text: T(copy.tell[s.boss]), cls: 'tell' };
      if ((s.rolled && (s.hook || s.pendingHook)) || time <= s.counterUntil) return { text: `${w.ducked} ${T(copy.counter[s.boss])}`, cls: 'tell' };
    }
    if (!ev || time - ev.time > 2.2) return null;
    if (ev.type === 'boss-phase') return { text: T(copy.lines[s.boss]?.[ev.phase]), cls: 'phase', who: s.boss };
    if (ev.type === 'boss-answer') return { text: fill(w.answer, { n: ev.answers, k: ev.needed }), cls: 'good' };
    if (ev.type === 'boss-read') return { text: w.ducked, cls: 'good' };
    if (ev.type === 'boss-big-hit') return { text: w.big, cls: 'bad' };
    return null;
  }
  // Browser: plain text on the stage, right under the goal line; a short camera push-in on a phase change.
  function hud(ctl, o) {
    const doc = globalThis.document; if (!doc) return null;
    const el = doc.createElement('div'); el.className = 'boss-call'; el.id = 'bossCall'; el.dir = doc.documentElement.dir || 'ltr'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    (o.stage || doc.body).append(el);
    let cursor = 0, last = null, key = '';
    function beat() {
      const cam = o.camera; if (!cam || o.reducedMotion) return; const z0 = cam.zoom, t0 = performance.now();
      const step = now => { const u = Math.min(1, (now - t0) / 1100), k = Math.sin(Math.PI * u); cam.zoom = z0 * (1 + .14 * k); cam.updateProjectionMatrix(); if (u < 1) requestAnimationFrame(step); else { cam.zoom = z0; cam.updateProjectionMatrix(); } };
      requestAnimationFrame(step);
    }
    function update(match) {
      for (const ev of match.events) if (ev.id > cursor) { cursor = ev.id; if (/^boss-/.test(ev.type) && ev.type !== 'boss-tell' && ev.type !== 'boss-hook' && ev.type !== 'boss-hook-end' && ev.type !== 'boss-weak-end') { last = ev; if (ev.type === 'boss-phase') beat(); } }
      const lang = o.lang(), c = callFor(ctl, last, match.time, lang), k = c ? c.cls + '|' + c.text : '';
      if (k !== key) { key = k; el.textContent = c?.text || ''; el.dataset.kind = c?.cls || ''; el.classList.remove('in'); void el.offsetWidth; if (c) el.classList.add('in'); }
      o.strip?.(stripText(ctl, o.name(), lang));
    }
    return { el, update, remove: () => el.remove() };
  }
  const api = { BOSSES, phaseFor, attach, copy, stripText, callFor, hud, fill };
  if (typeof module !== 'undefined') module.exports = api; else window.BossFight = api;
})();
