/* "Coach calls" drills (owner, 2026-11-22: "clicking three times on three buttons in 50 seconds is not training"; "shadow boxing with
 * the same punch 50 times … is not a game"). Pure rules, no DOM, no three.js: adventure/oldtown.js runs them on the live trainings
 * (shadowboxing, heavy bag, mitts) and tests/call-drills.test.cjs in node.
 *
 * The coach calls a short combination (1-4 moves); press it in order before its window closes. A wrong move breaks it; the next call
 * comes after a short rest. Calls grow from single punches to four-move combinations and the windows shrink as the round goes on.
 * Optional `power`: the last punch of every call must also land hard (power(): the station reports a hit at the power mark).
 * value = completed calls (the mission's metric 'combos').
 *
 * Moves: straight hook uppercut slip duck. Input ids from boxing-input.js map onto them (CallCore.moveOf). */
(() => {
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const rng = seed => { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; };
  const S = 'straight', H = 'hook', U = 'uppercut', SL = 'slip', D = 'duck';
  // Pools by stage (real boxing combinations; a stage is picked by the share of the round played)
  const DRILLS = Object.freeze({
    // night shadowboxing: punches only; learn the three, then link them
    shadow: { time: 40, stages: [[[S], [H], [U], [S, S]], [[S, S], [S, H], [S, U], [H, U], [U, H]], [[S, S, H], [S, U, H], [S, H, U], [H, U, H], [S, S, U]], [[S, S, H, U], [S, H, S, H], [U, H, S, S], [S, U, H, S]]] },
    // the old heavy bag: two or three punches, the last one with power
    bag: { time: 45, power: true, stages: [[[S], [S, H], [H]], [[S, H], [S, U], [H, U]], [[S, S, H], [S, U, H], [H, U, H]], [[S, S, H, U], [S, H, S, U]]] },
    // fight preparation on the mitts: punches and defences mixed
    mitts: { time: 45, stages: [[[S, S], [SL], [D], [S, H]], [[S, SL], [D, H], [S, S, SL], [H, D]], [[S, S, SL, S], [D, H, U], [S, H, D], [SL, S, H]], [[S, S, H, D, H], [SL, S, H, U], [D, H, H, S], [S, SL, S, H]]] },
    // advanced training: defend, then answer at once (Bruno: "Slip, then answer. Every Slip opens a door.")
    counter: { time: 40, stages: [[[SL, S], [D, H], [SL, S, S]], [[SL, S, H], [D, H, U], [SL, U, H]], [[SL, S, H, U], [D, U, H, S], [SL, S, S, H]], [[D, H, U, H], [SL, S, H, D, H]]] }
  });
  const RULES = { first: 1.2, rest: .55, penalty: 1.3, base: 1.05, perMove: .48, squeeze: .28, powerWait: .8, seed: 41 }; // penalty: the pause after a wrong move (spamming one button pays nothing)
  const moveOf = id => /^(jab|cross)$/.test(id) ? S : /hook$/.test(id) ? H : /uppercut$/.test(id) ? U : /^slip/.test(id) ? SL : id === 'roll' ? D : null;

  class CallDrill {
    constructor(kind, o = {}) {
      const d = DRILLS[kind]; if (!d) throw Error('unknown drill ' + kind);
      this.kind = kind; this.d = d; this.r = { ...RULES, ...o }; this.time = o.time || d.time; this.R = rng(this.r.seed + kind.length * 7);
      this.t = 0; this.done = false; this.value = 0; this.misses = 0; this.streak = 0; this.best = 0; this.calls = 0; this.flash = null; this.last = null;
      this.call = null; this.next = this.r.first;
    }
    get progress() { return clamp(this.t / this.time); }
    window(len) { return (this.r.base + this.r.perMove * len) * (1 - this.r.squeeze * this.progress); }
    deal() {
      const st = this.d.stages, pool = st[Math.min(st.length - 1, Math.floor(this.progress * st.length))];
      let seq; do seq = pool[Math.floor(this.R() * pool.length)]; while (pool.length > 1 && this.last && seq.join() === this.last.join());
      this.last = seq; this.calls++;
      this.call = { seq, at: 0, start: this.t, end: this.t + this.window(seq.length), wait: null };
    }
    end(ok, why) {
      if (ok) { this.value++; this.streak++; this.best = Math.max(this.best, this.streak); } else { this.misses++; this.streak = 0; }
      this.flash = { ok, why: why || null, t: this.t, seq: this.call.seq }; this.call = null; this.next = this.t + (ok || why !== 'wrong' ? this.r.rest : this.r.penalty);
    }
    /** A move the player made (a name from moveOf). Returns 'hit' | 'done' | 'wrong' | 'ignored'. */
    input(move) {
      if (this.done || !move) return 'ignored'; const c = this.call; if (!c || c.wait != null) return 'ignored';
      if (move !== c.seq[c.at]) { this.end(false, 'wrong'); return 'wrong'; }
      c.at++;
      if (c.at < c.seq.length) return 'hit';
      if (this.d.power && c.seq[c.seq.length - 1] !== SL && c.seq[c.seq.length - 1] !== D) { c.wait = this.t + this.r.powerWait; return 'hit'; } // the last punch must still land hard
      this.end(true); return 'done';
    }
    /** The station reported a hit at the power mark (heavy bag). */
    power() { const c = this.call; if (c && c.wait != null) this.end(true); }
    step(dt) {
      if (this.done || !(dt > 0)) return this; this.t += Math.min(dt, .1);
      const c = this.call;
      if (c) { if (c.wait != null ? this.t > c.wait : this.t > c.end) this.end(false, c.wait != null ? 'soft' : 'late'); }
      else if (this.t >= this.next && this.t < this.time - .4) this.deal();
      if (this.t >= this.time && !this.call) this.done = true;
      return this;
    }
    view() {
      const c = this.call;
      return { kind: this.kind, t: this.t, left: Math.max(0, this.time - this.t), value: this.value, misses: this.misses, streak: this.streak, best: this.best, calls: this.calls, power: !!this.d.power,
        seq: c ? c.seq : null, at: c ? c.at : 0, waiting: !!(c && c.wait != null), share: c ? clamp((c.end - this.t) / (c.end - c.start)) : 0, flash: this.flash && this.t - this.flash.t < .7 ? this.flash : null, done: this.done };
    }
  }
  const api = { DRILLS, RULES, CallDrill, moveOf, MOVES: Object.freeze([S, H, U, SL, D]) };
  if (typeof module !== 'undefined') module.exports = api; else window.CallCore = api;
})();
