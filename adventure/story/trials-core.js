/* Skill trials, pure rules (GOTR-0061): the side games of the adventure are short trials built on the boxing mechanics:
 * a readable challenge, escalating tempo, a streak multiplier, risk and reward, and a score to chase. No DOM, no three.js:
 * used by adventure/story/story-scenes.js (window.StoryTrials) and by tests/story-trials.test.cjs in node.
 *
 * Every trial: new Trial(rules?, { hard }) ; key(k, down) with k in left right up down straight hook uppercut ;
 * step(dt) ; view() (what the screen shows) ; result(starsFor) -> { missionId, metric, value, score, streak, time, hard,
 * stars, finished } ; .done. "value" is what the mission records (adventure-progress.js metric); "score" is the number to
 * beat. hard = the variant unlocked by gold: the same trial about a quarter faster.
 *   BagTrial     heavy_bag_van      Brick's bag: hit the swinging bag at the peak with the punch its swing calls for
 *   EchoTrial    snoring_guard      Sleep talker: repeat the growing combo the guard mumbles (lamps), duck if you wake him
 *   BarrageTrial rooftop_balloons   Rooftop barrage: slip / duck / step out, punch the marked balloons back
 *   CutoffTrial  whistle_chase      Cut him off: footwork on a grid, corner the raccoon five times, each time faster
 *   BetTrial     grandma_groceries  The hustler's bet: punish real openings, three bites on feints lose the bet */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const rng = seed => { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; };
  const PUNCH = ['straight', 'hook', 'uppercut'], isPunch = k => PUNCH.includes(k);
  class Trial {
    constructor(rules, opts = {}) { this.r = rules; this.hard = !!opts.hard; this.k = this.hard ? 1.25 : 1; this.t = 0; this.score = 0; this.streak = 0; this.maxStreak = 0; this.done = false; this.flash = null; this.log = []; }
    get mult() { return Math.min(5, 1 + Math.floor(this.streak / 4)); }
    event(type, extra) { this.log.push({ t: +this.t.toFixed(2), type, ...extra }); }
    gain(base, type = 'hit') { const pts = base * this.mult; this.score += pts; this.streak++; this.maxStreak = Math.max(this.maxStreak, this.streak); this.flash = { type, pts, mult: this.mult, t: this.t }; this.event(type, { pts }); }
    fail(type = 'miss') { this.streak = 0; this.flash = { type, pts: 0, t: this.t }; this.event(type); }
    base() { return { t: this.t, score: this.score, streak: this.streak, mult: this.mult, flash: this.flash, done: this.done, hard: this.hard }; }
    finish(starsFor, value, finished = true) { return { missionId: this.r.missionId, metric: this.r.metric, value, score: this.score, streak: this.maxStreak, time: +this.t.toFixed(1), hard: this.hard, stars: !finished ? 0 : typeof starsFor === 'function' ? starsFor(this.r.missionId, value) : null, finished }; }
  }

  /* ---------------------------------------------------------------- Brick's bag */
  const BAG = Object.freeze({ missionId: 'heavy_bag_van', metric: 'mistakes', swings: 24, period: [1.45, .85], window: .17, perfect: .07, back: .6, dodge: .42, rest: .28, seed: 77 });
  class BagTrial extends Trial {
    constructor(rules = BAG, opts) { super(rules, opts); const R = rng(rules.seed + (this.hard ? 9 : 0)); this.types = Array.from({ length: rules.swings }, (_, i) => i < 3 ? PUNCH[i] : PUNCH[Math.floor(R() * 3)]); this.i = 0; this.mistakes = 0; this.hits = 0; this.dodged = 0; this.start(0); }
    period(i) { return lerp(this.r.period[0], this.r.period[1], i / (this.r.swings - 1)) / this.k; }
    start(at) { this.sw = { type: this.types[this.i], t0: at, peak: at + this.period(this.i), state: 'swing', dodgeAt: -9 }; }
    next(at) { this.i++; if (this.i >= this.r.swings) { this.done = true; this.sw = null; this.event('end'); } else this.start(at); }
    key(k, down) {
      const s = this.sw; if (this.done || !down || !s) return;
      if (this.t < s.t0) return;
      if (isPunch(k) && s.state === 'swing') {
        const d = Math.abs(this.t - s.peak);
        if (k === s.type && d <= this.r.window) { this.hits++; this.gain(d <= this.r.perfect ? 150 : 100, d <= this.r.perfect ? 'perfect' : 'hit'); s.state = 'hit'; s.until = this.t + this.r.rest; }
        else { s.state = 'missed'; this.mistakes++; this.fail(k === s.type ? 'early' : 'wrong'); }
      } else if ((k === 'left' || k === 'down') && (s.state === 'back' || s.state === 'missed')) s.dodgeAt = this.t;
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt; const s = this.sw, r = this.r;
      if (s.state === 'hit') { if (this.t >= s.until) this.next(this.t); }
      else if (s.state === 'swing' || s.state === 'missed') { if (this.t > s.peak + r.window) { if (s.state === 'swing') { this.mistakes++; this.fail('late'); } s.state = 'back'; s.land = s.peak + r.window + r.back / this.k; } }
      else if (s.state === 'back' && this.t >= s.land) { // the bag is back: slipped or ducked in time, or it lands
        if (this.t - s.dodgeAt <= r.dodge) { this.dodged++; this.flash = { type: 'dodge', pts: 0, t: this.t }; this.event('dodge'); } else { this.mistakes++; this.fail('bagged'); }
        this.next(this.t + r.rest);
      }
      return this;
    }
    view() {
      const s = this.sw, r = this.r, v = this.base();
      if (!s) return { ...v, phase: 'end', i: this.i, total: r.swings, mistakes: this.mistakes, prompt: null, progress: 1 };
      const k = clamp((this.t - s.t0) / (s.peak - s.t0)), back = s.state === 'back' ? clamp(1 - (s.land - this.t) / (r.back / this.k)) : 0;
      return { ...v, phase: s.state, type: s.type, k, back, open: s.state === 'swing' && Math.abs(this.t - s.peak) <= r.window, i: this.i, total: r.swings, mistakes: this.mistakes, hits: this.hits, progress: this.i / r.swings,
        prompt: s.state === 'swing' && this.t >= s.t0 ? s.type : s.state === 'back' || s.state === 'missed' ? 'dodge' : null };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.mistakes, this.i >= this.r.swings), hits: this.hits, dodged: this.dodged }; }
  }

  /* ---------------------------------------------------------------- Sleep talker */
  const ECHO = Object.freeze({ missionId: 'snoring_guard', metric: 'dodges', lengths: [2, 2, 3, 3, 4, 4, 5, 5, 6], show: .6, gap: .16, limit: 2.0, lives: 3, wake: .85, dodge: .45, rest: .7, seed: 31 });
  class EchoTrial extends Trial {
    constructor(rules = ECHO, opts) { super(rules, opts); this.R = rng(rules.seed + (this.hard ? 5 : 0)); this.round = 0; this.lives = rules.lives; this.ducked = 0; this.deal(.6); }
    deal(delay) { const n = this.r.lengths[this.round]; this.seq = Array.from({ length: n }, () => PUNCH[Math.floor(this.R() * 3)]); this.idx = 0; this.phase = 'rest'; this.until = this.t + delay; this.dodgeAt = -9; }
    get showStep() { return (this.r.show + this.r.gap) / this.k; }
    wakeUp(why) { this.fail(why); this.phase = 'wake'; this.t0 = this.t; this.until = this.t + this.r.wake / this.k; this.dodgeAt = -9; }
    key(k, down) {
      if (this.done || !down) return;
      if (this.phase === 'wake') { if (k === 'down') this.dodgeAt = this.t; return; }
      if (this.phase !== 'input' || !isPunch(k)) return;
      if (k !== this.seq[this.idx]) { this.wakeUp('wrong'); return; }
      this.idx++; this.deadline = this.t + this.r.limit / this.k;
      if (this.idx < this.seq.length) { this.flash = { type: 'note', pts: 0, t: this.t }; return; }
      this.gain(100 * this.seq.length, 'combo'); this.round++;
      if (this.round >= this.r.lengths.length) { this.done = true; this.event('end'); } else this.deal(this.r.rest);
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt;
      if (this.phase === 'rest' && this.t >= this.until) { this.phase = 'show'; this.t0 = this.t; }
      else if (this.phase === 'show' && this.t >= this.t0 + this.seq.length * this.showStep) { this.phase = 'input'; this.deadline = this.t + this.r.limit / this.k; }
      else if (this.phase === 'input' && this.t >= this.deadline) this.wakeUp('faded');
      else if (this.phase === 'wake' && this.t >= this.until) { // the pillow arrives
        if (this.t - this.dodgeAt <= this.r.dodge) { this.ducked++; this.flash = { type: 'dodge', pts: 0, t: this.t }; this.event('dodge'); } else { this.lives--; this.flash = { type: 'bagged', pts: 0, t: this.t }; this.event('pillow'); }
        if (this.lives <= 0) { this.done = true; this.event('end'); } else this.deal(this.r.rest);
      }
      return this;
    }
    view() {
      const r = this.r, show = this.phase === 'show' ? (this.t - this.t0) / this.showStep : -1, lit = show >= 0 && show % 1 < r.show / (r.show + r.gap) ? Math.floor(show) : -1;
      return { ...this.base(), phase: this.phase, seq: this.seq, lit, litType: lit >= 0 ? this.seq[lit] : null, idx: this.idx, round: this.round, rounds: r.lengths.length, lives: this.lives, progress: this.round / r.lengths.length,
        fade: this.phase === 'input' ? clamp((this.deadline - this.t) / (r.limit / this.k)) : 1, wake: this.phase === 'wake' ? clamp((this.t - this.t0) / (r.wake / this.k)) : 0,
        prompt: this.phase === 'wake' ? 'down' : this.phase === 'input' ? 'repeat' : this.phase === 'show' ? 'watch' : null };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.round), lives: this.lives, rounds: this.round }; }
  }

  /* ---------------------------------------------------------------- Rooftop barrage */
  const BARRAGE = Object.freeze({ missionId: 'rooftop_balloons', metric: 'dodges', count: 20, flight: [1.5, .8], gap: .5, max: 12, dodge: .46, reflect: [.78, .98], keys: { head: 'left', low: 'down', wide: 'right' }, seed: 12 });
  class BarrageTrial extends Trial {
    constructor(rules = BARRAGE, opts) {
      super(rules, opts); const R = rng(rules.seed + (this.hard ? 3 : 0)), kinds = ['head', 'low', 'wide'];
      this.list = Array.from({ length: rules.count }, (_, i) => ({ kind: i < 3 ? kinds[i] : kinds[Math.floor(R() * 3)], marked: i > 1 && R() < .4, from: Math.floor(R() * 3) }));
      this.i = 0; this.clean = 0; this.hits = 0; this.reflected = 0; this.dodge = null; this.launch(.8);
    }
    launch(at) { const b = this.list[this.i]; this.b = { ...b, t0: at, land: at + lerp(this.r.flight[0], this.r.flight[1], this.i / (this.r.count - 1)) / this.k, state: 'fly' }; }
    key(k, down) {
      const b = this.b; if (this.done || !down || !b || this.t < b.t0 || b.state !== 'fly' && b.state !== 'whiff') return;
      if (k === 'straight' && b.state === 'fly') {
        const u = (this.t - b.t0) / (b.land - b.t0);
        if (b.marked && u >= this.r.reflect[0] && u <= this.r.reflect[1]) { this.reflected++; this.clean++; this.gain(300, 'reflect'); b.state = 'back'; b.until = this.t + .35; }
        else { b.state = 'whiff'; this.flash = { type: 'early', pts: 0, t: this.t }; } // swung at air: this one will land
      } else if (['left', 'down', 'right'].includes(k) && b.state === 'fly' && !(this.dodge && this.t < this.dodge.until)) this.dodge = { key: k, t0: this.t, until: this.t + this.r.dodge };
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt; const b = this.b;
      if (b.state === 'back') { if (this.t >= b.until) this.advance(); }
      else if (this.t >= b.land) {
        const ok = b.state === 'fly' && this.dodge && this.dodge.key === this.r.keys[b.kind] && this.t < this.dodge.until && this.dodge.t0 >= b.t0;
        if (ok) { this.clean++; this.gain(100, 'dodge'); } else { this.hits++; this.fail('splash'); }
        this.advance();
      }
      return this;
    }
    advance() { this.i++; if (this.i >= this.r.count) { this.done = true; this.b = null; this.event('end'); } else this.launch(this.t + this.r.gap / this.k); }
    view() {
      const b = this.b, dodging = this.dodge && this.t < this.dodge.until;
      const u = b ? clamp((this.t - b.t0) / (b.land - b.t0)) : 0, flying = b && this.t >= b.t0;
      return { ...this.base(), balloon: flying ? { kind: b.kind, marked: b.marked, from: b.from, k: u, state: b.state, back: b.state === 'back' ? clamp(1 - (b.until - this.t) / .35) : 0 } : null, i: this.i, total: this.r.count, clean: this.clean, hits: this.hits, reflected: this.reflected, progress: this.i / this.r.count,
        dodge: dodging ? { key: this.dodge.key, k: clamp((this.t - this.dodge.t0) / this.r.dodge) } : null, canReflect: !!(flying && b.marked && b.state === 'fly' && u >= this.r.reflect[0] && u <= this.r.reflect[1]),
        prompt: flying && b.state === 'fly' ? this.r.keys[b.kind] : null, bonus: !!(flying && b.marked && b.state === 'fly') };
    }
    /** Recorded value: 12 minus the balloons that landed (a flawless barrage is gold). */
    result(starsFor) { return { ...this.finish(starsFor, Math.max(0, this.r.max - this.hits), this.i >= this.r.count), clean: this.clean, hits: this.hits, reflected: this.reflected }; }
  }

  /* ---------------------------------------------------------------- Cut him off */
  // A 7 x 5 grid in the alley. Column 0 is a dead end, the raccoon escapes past column 6. He only steps to cells out of the
  // Fighter's reach (not next to him, diagonals count), so staying level with him and stepping in takes his angles away.
  const CUTOFF = Object.freeze({ missionId: 'whistle_chase', metric: 'secondsToFinish', cols: 7, rows: 5, catches: 5, beat: [.5, .44, .38, .34, .3], move: .15, escape: 5, timeout: 60, starts: [[3, 2], [4, 0], [3, 4], [4, 1], [4, 3]], seed: 5 });
  class CutoffTrial extends Trial {
    constructor(rules = CUTOFF, opts) { super(rules, opts); this.R = rng(rules.seed); this.catches = 0; this.escapes = 0; this.place(); }
    place() { const [c, r] = this.r.starts[this.catches % this.r.starts.length]; this.rc = { c, r, fc: c, fr: r, t0: this.t }; this.f = { c: 6, r: 2, fc: 6, fr: 2, t0: this.t }; this.nextBeat = this.t + .9; this.ready = 0; }
    reach(c, r, f = this.f) { return Math.max(Math.abs(c - f.c), Math.abs(r - f.r)) <= 1; }
    key(k, down) {
      if (this.done || !down || this.t < this.ready) return;
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[k]; if (!d) return;
      const c = this.f.c + d[0], r = this.f.r + d[1]; if (c < 0 || c >= this.r.cols || r < 0 || r >= this.r.rows || (c === this.rc.c && r === this.rc.r)) return;
      this.f = { c, r, fc: this.f.c, fr: this.f.r, t0: this.t }; this.ready = this.t + this.r.move;
    }
    /** The raccoon's options: neighbouring cells (or the way out past the last column) that are out of the Fighter's reach. */
    options() {
      const { c, r } = this.rc, out = [];
      for (const [dc, dr] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) { const nc = c + dc, nr = r + dr; if (nr < 0 || nr >= this.r.rows || nc < 0) continue; if (nc >= this.r.cols) { out.push({ c: nc, r: nr, exit: true, score: 99 }); continue; } if (!this.reach(nc, nr)) out.push({ c: nc, r: nr, score: nc * 2 + Math.abs(nr - this.f.r) + this.R() * .5 }); }
      return out;
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt;
      if (this.t >= this.nextBeat) {
        const o = this.options().sort((a, b) => b.score - a.score)[0];
        if (!o) { this.catches++; this.gain(300, 'catch'); if (this.catches >= this.r.catches) { this.done = true; this.event('end'); } else this.place(); }
        else if (o.exit) { this.escapes++; this.t += this.r.escape; this.fail('escape'); this.place(); }
        else { this.rc = { c: o.c, r: o.r, fc: this.rc.c, fr: this.rc.r, t0: this.t }; this.nextBeat = this.t + this.r.beat[Math.min(this.catches, this.r.beat.length - 1)] / this.k; }
      }
      if (this.t >= this.r.timeout && !this.done) { this.done = true; this.event('timeout'); }
      return this;
    }
    view() {
      const mv = (p, d) => { const k = clamp((this.t - p.t0) / d); return { c: lerp(p.fc, p.c, k), r: lerp(p.fr, p.r, k), k, moving: k < 1 }; };
      return { ...this.base(), f: mv(this.f, this.r.move), rc: mv(this.rc, .22), cell: { f: [this.f.c, this.f.r], rc: [this.rc.c, this.rc.r] }, catches: this.catches, need: this.r.catches, escapes: this.escapes, options: this.options().length, left: Math.max(0, this.r.timeout - this.t), progress: this.catches / this.r.catches, prompt: null };
    }
    result(starsFor) { return { ...this.finish(starsFor, +this.t.toFixed(1), this.catches >= this.r.catches), catches: this.catches, escapes: this.escapes }; }
  }

  /* ---------------------------------------------------------------- The hustler's bet */
  const BET = Object.freeze({ missionId: 'grandma_groceries', metric: 'dodges', opens: 14, feints: 14, open: [.62, .38], feint: .3, idle: [.55, 1.0], bites: 3, offerAt: 4, offer: 5, bonusOpen: .3, max: 12, seed: 41 });
  class BetTrial extends Trial {
    constructor(rules = BET, opts) {
      super(rules, opts); const R = this.R = rng(rules.seed + (this.hard ? 7 : 0)), ev = [...Array(rules.opens).fill('open'), ...Array(rules.feints).fill('feint')];
      for (let i = ev.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ev[i], ev[j]] = [ev[j], ev[i]]; }
      if (ev[0] === 'open') { const j = ev.indexOf('feint'); [ev[0], ev[j]] = [ev[j], ev[0]]; } // he always opens with a feint
      this.events = ev; this.i = 0; this.hits = 0; this.bites = 0; this.opened = 0; this.stage = 'main'; this.idle(.9);
    }
    idle(d) { this.phase = 'idle'; this.until = this.t + d; }
    tell() {
      const kind = this.events[this.i], r = this.r; this.phase = kind; this.t0 = this.t; this.punished = false;
      this.until = this.t + (kind === 'feint' ? r.feint : this.stage === 'bonus' ? r.bonusOpen : lerp(r.open[0], r.open[1], this.opened / (r.opens - 1))) / this.k; if (kind === 'open') this.opened++;
    }
    get value() { return Math.min(this.r.max, this.hits); }
    key(k, down) {
      if (this.done || !down) return;
      if (this.phase === 'offer') { if (k === 'up') { this.stage = 'bonus'; this.events = ['feint', 'feint', 'feint', 'open']; this.i = 0; this.idle(.7); this.event('double'); } else if (k === 'down') { this.done = true; this.event('end'); } return; }
      if (!isPunch(k)) return;
      if (this.phase === 'open' && !this.punished) { this.punished = true; if (this.stage === 'bonus') { this.hits = Math.min(this.r.max, this.hits + 2); this.score *= 2; this.flash = { type: 'double', pts: this.score, t: this.t }; this.done = true; this.event('end'); } else { this.hits++; this.gain(150, 'hit'); } }
      else if (this.phase !== 'open') { // bit on a feint, or swung at nothing
        if (this.stage === 'bonus') { this.lose(); return; }
        this.bites++; this.fail('bite'); if (this.bites >= this.r.bites) { this.done = true; this.event('end'); }
      }
    }
    lose() { this.hits = Math.floor(this.hits / 2); this.score = 0; this.fail('bust'); this.done = true; this.event('end'); }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt;
      if (this.t < this.until) return this;
      if (this.phase === 'idle') this.tell();
      else if (this.phase === 'offer') { this.done = true; this.event('end'); }
      else {
        if (this.stage === 'bonus' && this.phase === 'open' && !this.punished) { this.lose(); return this; }
        this.i++;
        if (this.i < this.events.length) this.idle(lerp(this.r.idle[0], this.r.idle[1], this.R()) / this.k);
        else if (this.stage === 'main' && this.hits >= this.r.offerAt) { this.phase = 'offer'; this.until = this.t + this.r.offer; }
        else { this.done = true; this.event('end'); }
      }
      return this;
    }
    view() {
      const k = this.phase === 'idle' || this.phase === 'offer' ? 0 : clamp((this.t - this.t0) / (this.until - this.t0));
      return { ...this.base(), phase: this.phase, stage: this.stage, k, hits: this.hits, bites: this.bites, maxBites: this.r.bites, left: this.events.length - this.i, progress: this.stage === 'bonus' ? 1 : this.i / this.events.length, punished: !!this.punished, prompt: this.phase === 'offer' ? 'offer' : null };
    }
    result(starsFor) { return { ...this.finish(starsFor, this.value), hits: this.hits, bites: this.bites, doubled: this.stage === 'bonus' }; }
  }

  const api = { PUNCH, rng, Trial, BAG, BagTrial, ECHO, EchoTrial, BARRAGE, BarrageTrial, CUTOFF, CutoffTrial, BET, BetTrial };
  if (typeof module !== 'undefined') module.exports = api; else window.StoryTrials = api;
})();
