/* Side job A "Clean the gym" (GOTR-0099), pure rules: no DOM, no three.js. Loads in node (tests) and the browser
 * (window.MopCore), after trials-core.js (the shared Trial base: score, streak, multiplier, flash, result).
 *
 * The floor of Bruno's Gym has two taped LANES, five SPOTS each. Wet streaks appear on the spots and slowly set into stains.
 * The Fighter (street clothes, a mop in both hands) moves with the game's pad: left / right = a step along the lane (In / Out),
 * up = Slip to the other lane, down = Duck. Standing on a streak, the mop swings in a steady push-pull stroke; tap Mop
 * ("straight", J) as the push lands (the ring closes on the streak) to wipe it clean. Big streaks need two clean strokes.
 * Clean wipes in a row build the combo (Trial.mult, x1..x5). A tap off the beat smears (the combo breaks).
 * Coach Bruno stands at the left end and now and then shoves one of the two heavy bags that hang over the lane ends
 * ("they hang high so you can mop under them"). The bag is a real pendulum (length L, g = 9.81): it swings out along the
 * lane and back into his hands. If it reaches the Fighter in its lane, low enough to meet his head, he is knocked (combo
 * lost, stunned for a moment) unless he ducks under it or has slipped to the other lane: that dodge counts in the combo.
 *
 * new MopTrial(rules?, { hard }) ; key(k, down) ; step(dt) ; view() ; result(starsFor) -> { value = marks (score / 100, floored), cleaned, ... }
 * MopCore.pay(stars) -> coins for one shift (a small job wage, paid every time: the job is repeatable). */
(() => {
  const T = typeof module !== 'undefined' ? require('./trials-core.js') : window.StoryTrials;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const G = 9.81;
  const MOP = Object.freeze({
    missionId: 'clean_gym', metric: 'marks', duration: 50, seed: 23,
    lanes: 2, spots: 5, x0: -1.0, dx: .8, zLane: [.7, 1.9], reachZ: .8, // world metres of the gym set: spot x, lane z (the streak); the Fighter stands reachZ behind it
    start: { lane: 0, spot: 2 },
    life: [7.0, 4.2], gap: [1.6, .8], maxWet: 3, big: 5, // a streak sets after `life` s (shorter as the shift goes on); every 5th is big (two wipes)
    stroke: .9, window: .15, perfect: .06, whiff: .35, // the mop's beat: a push lands every `stroke` s after arriving; tap within `window`
    move: .22, slip: .28, duck: .6, stun: 1.0,
    bag: { first: 7, every: [8.5, 5.5], warn: 1.1, length: 3.05, pivotY: 5.3, half: .5, theta: .8, restX: -1.5, radius: .2, reach: .45, head: 2.02, ducked: 1.6 },
    pts: { clean: 100, perfect: 150, big: 50, dodge: 60 }
  });
  /** Coins for one shift by stars (owner: a job pays little; gold is worth it). */
  const PAY = Object.freeze([0, 6, 10, 15]);
  const pay = stars => PAY[Math.max(0, Math.min(3, stars | 0))];
  /** The bag's pendulum: angle at time tau after the shove (out and back in one half period), its world x and bottom height. */
  function pendulum(b, tau, hard = 1) {
    const w = Math.sqrt(G / b.length), half = Math.PI / w, th = tau <= 0 || tau >= half ? 0 : b.theta * hard * Math.sin(w * tau);
    return { th, half, x: b.restX + b.length * Math.sin(th), bottom: b.pivotY - (b.length + b.half) * Math.cos(th) };
  }

  class MopTrial extends T.Trial {
    constructor(rules = MOP, opts) {
      super(rules, opts); this.R = T.rng(rules.seed + (this.hard ? 11 : 0));
      this.f = { lane: rules.start.lane, spot: rules.start.spot, from: null, t0: -9, kind: null, arrive: 0 };
      this.wet = []; this.n = 0; this.cleaned = 0; this.stains = 0; this.smears = 0; this.knocks = 0; this.dodges = 0;
      this.duckAt = -9; this.stunUntil = -9; this.busyUntil = 0; this.queued = null;
      this.nextWet = .4; this.bag = null; this.nextBag = rules.bag.first / this.k;
    }
    get frac() { return clamp(this.t / this.r.duration); }
    spotX(s) { return this.r.x0 + s * this.r.dx; }
    standZ(lane) { return this.r.zLane[lane] - this.r.reachZ; }
    moving() { return this.f.from && this.t < this.f.t0 + (this.f.kind === 'slip' ? this.r.slip : this.r.move); }
    ducking() { return this.t - this.duckAt < this.r.duck; }
    stunned() { return this.t < this.stunUntil; }
    /** The Fighter's body now (world x, z, and the lane he counts as in: a Slip leaves the old lane halfway). */
    body() {
      const f = this.f, r = this.r; let k = 1;
      if (this.moving()) k = clamp((this.t - f.t0) / (f.kind === 'slip' ? r.slip : r.move));
      const a = f.from || f, ease = k * k * (3 - 2 * k);
      return { x: lerp(this.spotX(a.spot), this.spotX(f.spot), ease), z: lerp(this.standZ(a.lane), this.standZ(f.lane), ease), lane: k < .5 ? a.lane : f.lane, k, moving: k < 1 };
    }
    under() { return this.moving() ? null : this.wet.find(w => w.lane === this.f.lane && w.spot === this.f.spot && w.state === 'wet') || null; }
    /** Time to the nearest landing push of the stroke (negative = it already landed), and the ring 0..1 (1 = closed). */
    beat() { const s = this.r.stroke / Math.min(this.k, 1.12), u = (this.t - this.f.arrive) / s, n = Math.max(1, Math.round(u)); return { d: this.t - (this.f.arrive + n * s), ring: u <= 0 ? 0 : u % 1, s }; }
    key(k, down) {
      if (this.done || !down) return;
      if (this.stunned() || this.ducking() || this.moving()) { if (['left', 'right', 'up'].includes(k) && !this.stunned()) this.queued = k; return; }
      this.act(k);
    }
    act(k) {
      const f = this.f, r = this.r;
      if (k === 'left' || k === 'right') { const s = f.spot + (k === 'left' ? -1 : 1); if (s < 0 || s >= r.spots) return; this.go({ lane: f.lane, spot: s }, 'step'); }
      else if (k === 'up') this.go({ lane: 1 - f.lane, spot: f.spot }, 'slip');
      else if (k === 'down') { this.duckAt = this.t; this.event('duck'); }
      else if (k === 'straight') this.mop();
    }
    go(to, kind) { this.f = { ...to, from: { lane: this.f.lane, spot: this.f.spot }, t0: this.t, kind, arrive: this.t + (kind === 'slip' ? this.r.slip : this.r.move) }; this.event(kind, { to: [to.lane, to.spot] }); }
    mop() {
      if (this.t < this.busyUntil) return;
      const w = this.under(), b = this.beat();
      this.busyUntil = this.t + this.r.whiff; this.lastMop = this.t;
      if (!w) { this.flash = { type: 'whiff', pts: 0, t: this.t }; this.event('whiff'); return; } // dry floor: nothing happens, the mop is busy a moment
      const d = Math.abs(b.d);
      if (d <= this.r.window) {
        w.wipes--; this.f.arrive = this.t; // the next push follows this one
        if (w.wipes > 0) { this.flash = { type: 'note', pts: 0, t: this.t }; this.event('wipe'); return; }
        w.state = 'clean'; w.until = this.t; this.cleaned++;
        const base = (d <= this.r.perfect ? this.r.pts.perfect : this.r.pts.clean) + (w.big ? this.r.pts.big : 0);
        this.gain(base, d <= this.r.perfect ? 'perfect' : 'hit');
      } else { this.smears++; w.smeared = (w.smeared || 0) + 1; this.fail(b.d < 0 ? 'late' : 'early'); }
    }
    spawn() {
      const r = this.r, wet = this.wet.filter(w => w.state === 'wet'); if (wet.length >= r.maxWet) return false;
      const free = []; for (let l = 0; l < r.lanes; l++) for (let s = 0; s < r.spots; s++) if (!wet.some(w => w.lane === l && w.spot === s) && !(l === this.f.lane && s === this.f.spot)) free.push([l, s]);
      if (!free.length) return false;
      // the first streaks lie next to the Fighter (the job explains itself); later anywhere
      const pick = this.n < 2 ? free.filter(([l, s]) => l === this.f.lane && Math.abs(s - this.f.spot) === 1)[0] || free[0] : free[Math.floor(this.R() * free.length)];
      this.n++; const life = lerp(r.life[0], r.life[1], this.frac) / this.k, big = this.n % r.big === 0;
      this.wet.push({ id: this.n, lane: pick[0], spot: pick[1], t0: this.t, life, state: 'wet', wipes: big ? 2 : 1, big, len: .7 + .5 * this.R(), turn: (this.R() - .5) * .5 });
      this.event('spill', { lane: pick[0], spot: pick[1] }); return true;
    }
    step(dt) {
      if (this.done || !(dt > 0)) return this; dt = Math.min(dt, .1); this.t += dt; const r = this.r;
      if (this.queued && !this.moving() && !this.ducking() && !this.stunned()) { const q = this.queued; this.queued = null; this.act(q); }
      if (this.f.from && !this.moving() && this.f.kind) this.f.kind = null;
      // streaks: appear, set into stains, dry away after a wipe
      if (this.t >= this.nextWet) { this.spawn(); this.nextWet = this.t + lerp(r.gap[0], r.gap[1], this.frac) / this.k; }
      for (const w of this.wet) if (w.state === 'wet' && this.t - w.t0 >= w.life) { w.state = 'stain'; w.until = this.t; this.stains++; this.fail('stain'); }
      this.wet = this.wet.filter(w => w.state === 'wet' || this.t - w.until < 2.5);
      // Bruno and the bags
      const B = r.bag;
      if (!this.bag && this.t >= this.nextBag && this.t < r.duration - 3) { this.bag = { lane: this.R() < .5 ? 0 : 1, t0: this.t, phase: 'warn', hit: false, credited: false, threatened: false }; this.event('warn', { lane: this.bag.lane }); }
      const bg = this.bag;
      if (bg) {
        const tau = this.t - bg.t0 - B.warn / this.k, p = pendulum(B, tau, this.hard ? 1.08 : 1), b = this.body();
        if (bg.phase === 'warn' && tau >= 0) { bg.phase = 'swing'; this.event('shove', { lane: bg.lane }); }
        if (b.lane === bg.lane && Math.abs(this.spotX(this.f.spot) - B.restX) < 3) bg.threatened = bg.threatened || bg.phase === 'swing' && Math.abs(p.x - b.x) < B.reach + .4;
        if (bg.phase === 'swing') {
          const near = Math.abs(p.x - b.x) < B.reach && p.bottom < B.head;
          if (near && b.lane === bg.lane && !bg.hit) {
            if (this.ducking() && p.bottom >= B.ducked - .25) { if (!bg.credited) { bg.credited = true; this.dodges++; this.gain(r.pts.dodge, 'dodge'); } }
            else { bg.hit = true; this.knocks++; this.stunUntil = this.t + r.stun; this.duckAt = -9; this.queued = null; this.fail('bagged'); }
          } else if (near && b.lane !== bg.lane && this.f.from && this.f.from.lane === bg.lane && this.t - this.f.t0 < 1.4 && !bg.credited && !bg.hit) { bg.credited = true; this.dodges++; this.gain(r.pts.dodge, 'dodge'); } // slipped out of its way just in time
          if (tau >= p.half) { bg.phase = 'caught'; this.event('caught', { lane: bg.lane }); this.bag = null; this.nextBag = this.t + lerp(B.every[0], B.every[1], this.frac) / this.k; }
        }
      }
      if (this.t >= r.duration) { this.done = true; this.event('end'); }
      return this;
    }
    view() {
      const r = this.r, B = r.bag, b = this.body(), w = this.under(), bt = this.beat(), bag = this.bag, tau = bag ? this.t - bag.t0 - B.warn / this.k : 0, p = bag ? pendulum(B, tau, this.hard ? 1.08 : 1) : null;
      return {
        ...this.base(), phase: this.stunned() ? 'stunned' : this.ducking() ? 'duck' : b.moving ? 'move' : w ? 'mop' : 'free',
        body: b, f: { lane: this.f.lane, spot: this.f.spot, kind: this.f.kind, from: this.f.from }, ducking: this.ducking(), duckK: clamp((this.t - this.duckAt) / r.duck), stunned: this.stunned(), stunK: clamp(1 - (this.stunUntil - this.t) / r.stun),
        wet: this.wet.map(x => ({ id: x.id, lane: x.lane, spot: x.spot, state: x.state, big: x.big, wipes: x.wipes, len: x.len, turn: x.turn, smeared: x.smeared || 0, age: this.t - x.t0, left: x.state === 'wet' ? clamp(1 - (this.t - x.t0) / x.life) : 0, since: x.state === 'wet' ? 0 : this.t - x.until })),
        on: w ? w.id : null, ring: w && !b.moving ? bt.ring : -1, open: !!(w && Math.abs(bt.d) <= r.window), strokeK: bt.ring, stroke: bt.s, lastMop: this.lastMop ?? -9,
        bag: bag ? { lane: bag.lane, phase: bag.phase, warn: bag.phase === 'warn' ? clamp((this.t - bag.t0) / (B.warn / this.k)) : 1, th: p.th, x: p.x, bottom: p.bottom, tau: Math.max(0, tau), half: p.half, hit: bag.hit } : null,
        danger: !!(bag && bag.lane === b.lane && !bag.hit && (bag.phase === 'warn' || Math.abs(p.x - b.x) < B.reach + 1.2)),
        cleaned: this.cleaned, stains: this.stains, knocks: this.knocks, dodges: this.dodges, left: Math.max(0, r.duration - this.t), progress: this.frac,
        prompt: this.stunned() ? 'bagged' : bag && bag.lane === b.lane && !bag.hit && (bag.phase === 'warn' || Math.abs(p.x - b.x) < B.reach + 1.2) ? 'dodge' : w ? 'mop' : this.wet.some(x => x.state === 'wet') ? 'go' : null
      };
    }
    /** Recorded value (metric marks): the shift's score in hundreds, so timing (perfect wipes) and long combos count, not only how many streaks. */
    get marks() { return Math.floor(this.score / 100); }
    result(starsFor) { return { ...this.finish(starsFor, this.marks), cleaned: this.cleaned, stains: this.stains, smears: this.smears, knocks: this.knocks, dodges: this.dodges, pay: 0 }; }
  }

  const api = { MOP, MopTrial, PAY, pay, pendulum, G };
  if (typeof module !== 'undefined') module.exports = api; else window.MopCore = api;
})();
