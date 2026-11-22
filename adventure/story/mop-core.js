/* Clean the gym (GOTR-0099, night shift rebuild 2026-11-22): the rules of the night mop shift, node-testable.
 * Bruno's Gym after closing: the Fighter mops the floor between the ring and the heavy bags before the lights go out.
 * The floor is a grid of 5 cm cells. Each cell holds an amount of dirt (0..1) and how stubborn it is; the dirt comes from
 * stains (shoe scuffs, chalk dust, sweat drops, footprints) laid out from a seed. The mop picks the dirt up and gets
 * dirty itself: a dirty mop cleans less and smears grey water back on clean floor, so the player rinses it in the bucket
 * (tap the bucket, or drag the mop into it; rinsing takes a second). Long clean strokes build a streak that buys a little
 * time; clearing an area (by the ring, by the bags, the middle) buys more. Marks = % of the starting dirt that is gone
 * (smears count as dirt again), so the stars (25/50/75, the saved metric 'marks') reward a clean floor without smears.
 * Coordinates are the metres of the 3D set (dream-sets.js 'dream_gym'): x right, z toward the camera.
 *   new MopTrial({ seed }) ; begin(p) drag(p) release() ; key(k, down) ; step(dt) ; rinse() ; finish() ; view() ; result(starsFor)
 */
(function (root) {
  'use strict';
  const PAY = Object.freeze([0, 6, 10, 15]);
  const MOP = Object.freeze({
    missionId: 'clean_gym', metric: 'marks',
    minX: .05, maxX: 3.25, minZ: -2.3, maxZ: 1.6, cell: .05,         // the floor between the ring corner and the bag mat
    radius: .2, core: .11,                                            // the string mop's footprint on the floor (m)
    bucket: Object.freeze({ x: 3.62, z: 1.2, r: .36 }),                // the mop bucket at the front right, just off the floor area
    time: 90, bonusCap: 20, rinseTime: 1.0, dry: 7,                   // seconds: the shift, the most bonus time, a rinse (+ the walk to the bucket), wet floor drying
    speed: 3.0,                                                       // m/s: the mop head follows the finger no faster than this
    capacity: 1 / 4,                                                  // a clean mop holds about a quarter of the floor's dirt
    smearFrom: .62,                                                   // mop load where it starts to smear
    strokeLen: .7,                                                    // a long stroke (m) can count for the streak
    zones: Object.freeze([
      Object.freeze({ id: 'ring', x0: .05, x1: 1.65, z0: -2.3, z1: -0.45 }),
      Object.freeze({ id: 'bags', x0: 1.65, x1: 3.25, z0: -2.3, z1: -0.45 }),
      Object.freeze({ id: 'floor', x0: .05, x1: 3.25, z0: -0.45, z1: 1.6 })
    ])
  });
  const NX = Math.round((MOP.maxX - MOP.minX) / MOP.cell), NZ = Math.round((MOP.maxZ - MOP.minZ) / MOP.cell), CLEAN = .03;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const inFloor = p => Number.isFinite(p?.x) && Number.isFinite(p?.z) && p.x >= MOP.minX && p.x <= MOP.maxX && p.z >= MOP.minZ && p.z <= MOP.maxZ;
  const atBucket = p => !inFloor(p) && Number.isFinite(p?.x) && Number.isFinite(p?.z) && Math.hypot(p.x - MOP.bucket.x, p.z - MOP.bucket.z) <= MOP.bucket.r;
  const zoneOf = (x, z) => MOP.zones.findIndex(q => x >= q.x0 && x < q.x1 + (q.x1 === MOP.maxX ? 1e-9 : 0) && z >= q.z0 && z < q.z1 + (q.z1 === MOP.maxZ ? 1e-9 : 0));
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const segDist = (px, pz, ax, az, bx, bz) => { const x = bx - ax, z = bz - az, d = x * x + z * z, t = d ? clamp(((px - ax) * x + (pz - az) * z) / d) : 0; return Math.hypot(px - ax - t * x, pz - az - t * z); };

  /** The stains of one shift, laid out by zone from the seed (the picture draws the same list). */
  function layout(seed = 1) {
    const r = rng(seed), between = (a, b) => a + (b - a) * r(), raw = [];
    // laid out on a 4.2 x 4.0 m plan (x -0.45..3.75, z -2.2..1.8), then fitted to the floor
    const out = { push: s => { s.x = MOP.minX + (s.x + .45) * (MOP.maxX - MOP.minX) / 4.2; s.z = MOP.minZ + (s.z + 2.2) * (MOP.maxZ - MOP.minZ) / 4; if (s.drops) for (const d of s.drops) { d.x = MOP.minX + (d.x + .45) * (MOP.maxX - MOP.minX) / 4.2; d.z = MOP.minZ + (d.z + 2.2) * (MOP.maxZ - MOP.minZ) / 4; } raw.push(s); } };
    const keep = (x, z, m = .12) => x > -.45 + m && x < 3.75 - m && z > -2.2 + m && z < 1.8 - m;
    const scuff = (x0, x1, z0, z1, n) => { for (let i = 0; i < n; i++) { const x = between(x0, x1), z = between(z0, z1), a = between(0, Math.PI), len = between(.12, .32), bend = between(-.05, .05); if (keep(x, z)) out.push({ kind: 'scuff', x, z, a, len, bend, w: between(.012, .02) }); } };
    const chalk = (x, z, rad) => { if (keep(x, z, .05)) out.push({ kind: 'chalk', x, z, r: rad, a: between(0, Math.PI), squash: between(.55, .9), seed: Math.floor(r() * 1e9) }); };
    const sweat = (x, z, rad, n) => { const drops = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; drops.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, r: between(.009, .024) }); } out.push({ kind: 'sweat', x, z, r: rad, drops }); };
    const prints = (x0, z0, x1, z1, n, bendBy) => { // a walk: left and right shoes on either side of a gently curving line
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, cx = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * bendBy, cz = z0 + (z1 - z0) * t, a = Math.atan2(z1 - z0, x1 - x0) + Math.cos(t * Math.PI) * bendBy * .6, side = i % 2 ? 1 : -1;
        const x = cx + Math.cos(a + Math.PI / 2) * side * .09, z = cz + Math.sin(a + Math.PI / 2) * side * .09;
        if (keep(x, z, .08)) out.push({ kind: 'print', x, z, a: a + between(-.12, .12), side, fade: between(.55, 1) });
      }
    };
    // by the ring: chalk from the corner, sweat that dripped off the apron, scuffs from ducking under the ropes
    chalk(between(-.1, .25), between(-1.95, -1.6), between(.3, .4)); chalk(between(.55, 1.0), between(-1.05, -.7), between(.22, .3));
    sweat(between(.1, .5), between(-1.25, -.95), .2, 9); sweat(between(.95, 1.25), between(-1.85, -1.55), .18, 7);
    scuff(-.2, 1.3, -2.0, -.55, 5);
    // by the bags: chalk where the gloves were taped, the pivot scuffs of footwork round the bag, drops
    chalk(between(2.6, 3.0), between(-1.95, -1.65), between(.3, .38)); chalk(between(3.2, 3.5), between(-1.0, -.7), between(.2, .26));
    sweat(between(2.0, 2.4), between(-1.3, -.95), .2, 8);
    for (let i = 0; i < 4; i++) { const cx = between(1.9, 3.45), cz = between(-2.0, -.6); for (let k = 0; k < 3; k++) { const a = between(0, Math.PI * 2), len = between(.1, .22); out.push({ kind: 'scuff', x: cx + Math.cos(a) * .07, z: cz + Math.sin(a) * .07, a: a + Math.PI / 2, len, bend: between(.04, .07), w: between(.012, .018) }); } }
    // the middle: someone walked across in street shoes after the rain; a sweat trail from the ring to the lockers
    prints(-.25, -.15, 3.5, 1.45, 14, .35);
    sweat(between(.7, 1.1), between(.7, 1.1), .24, 10); sweat(between(2.4, 2.9), between(.05, .35), .18, 7);
    scuff(.0, 3.4, .1, 1.55, 6);
    chalk(between(1.4, 1.8), between(1.2, 1.45), .2);
    return raw;
  }

  class MopTrial {
    constructor(opts = {}) {
      this.seed = Number.isFinite(opts.seed) ? opts.seed : 1;
      this.nx = NX; this.nz = NZ;
      const n = NX * NZ;
      this.dirt = new Float32Array(n); this.tough = new Float32Array(n).fill(1); this.wetAt = new Float32Array(n).fill(-99); this.smearAt = new Float32Array(n);
      this.zoneCell = new Int8Array(n);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) this.zoneCell[j * NX + i] = zoneOf(MOP.minX + (i + .5) * MOP.cell, MOP.minZ + (j + .5) * MOP.cell);
      this.stains = layout(this.seed);
      for (const s of this.stains) this.paint(s);
      this.start = this.residual(); this.startZone = MOP.zones.map((_, k) => this.residual(k));
      this.zoneDone = MOP.zones.map(() => false);
      this.point = { x: 1.65, z: .9 }; this.previous = null; this.keys = new Set();
      this.load = 0; this.rinseT = 0; this.target = null; this.lift = false; this.rinses = 0; this.smears = 0; this.smeared = 0;
      this.clock = 0; this.started = false; this.left = MOP.time; this.bonus = 0;
      this.smearMarks = []; this.lastWipe = -99; // for the picture: where grey water was laid, when the floor was last wetted
      this.streak = 0; this.best = 0; this.stroke = null; this.events = []; this.revision = 0; this.done = false; this.finished = false; this.lightsOut = false;
      this._marks = this.computeMarks();
    }
    /** Lays one stain into the grid: amount (0..1) and how stubborn it is (factor on the cleaning rate). */
    paint(s) {
      const C = MOP.cell, reach = s.kind === 'chalk' ? s.r : s.kind === 'sweat' ? s.r + .05 : s.kind === 'print' ? .16 : s.len / 2 + .06;
      const i0 = Math.max(0, Math.floor((s.x - reach - MOP.minX) / C)), i1 = Math.min(NX - 1, Math.ceil((s.x + reach - MOP.minX) / C));
      const j0 = Math.max(0, Math.floor((s.z - reach - MOP.minZ) / C)), j1 = Math.min(NZ - 1, Math.ceil((s.z + reach - MOP.minZ) / C));
      const ca = Math.cos(s.a || 0), sa = Math.sin(s.a || 0);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = MOP.minX + (i + .5) * C, z = MOP.minZ + (j + .5) * C, dx = x - s.x, dz = z - s.z;
        let c = 0, amount = .8, tough = 1;
        if (s.kind === 'chalk') { const u = (dx * ca + dz * sa) / s.r, v = (-dx * sa + dz * ca) / (s.r * s.squash), d = Math.hypot(u, v); c = Math.pow(clamp(1.05 - d), .6); amount = .7; tough = 1.25; }
        else if (s.kind === 'sweat') { for (const q of s.drops) c = Math.max(c, clamp(1 - (Math.hypot(x - q.x, z - q.z) - q.r) / .035)); amount = .75; tough = .85; }
        else if (s.kind === 'print') { const u = dx * ca + dz * sa, v = -dx * sa + dz * ca, sole = Math.hypot((u - .045) / .09, v / .05), heel = Math.hypot((u + .1) / .05, v / .045); c = clamp((1.25 - Math.min(sole, heel)) / .45); amount = .8 * s.fade; tough = .62; }
        else { const hx = ca * s.len / 2, hz = sa * s.len / 2, d = segDist(x, z, s.x - hx, s.z - hz, s.x + hx, s.z + hz); c = clamp(1 - (d - s.w) / .035); amount = .9; tough = .36; }
        if (c <= 0) continue;
        const k = j * NX + i; this.dirt[k] = Math.min(1, this.dirt[k] + c * amount); this.tough[k] = Math.min(this.tough[k], tough);
      }
    }
    residual(zone = -1) { let r = 0; for (let k = 0; k < this.dirt.length; k++) if (this.dirt[k] > CLEAN && (zone < 0 || this.zoneCell[k] === zone)) r += this.dirt[k]; return r; }
    computeMarks() { return clamp(Math.floor(100 * (1 - this.residual() / this.start) + 1e-9), 0, 100); }
    get marks() { return this._marks; }
    get rinsing() { return this.rinseT > 0; }
    emit(type, o = {}) { this.events.push({ type, t: this.clock, n: this.events.length, ...o }); if (this.events.length > 64) this.events.splice(0, this.events.length - 64); }
    begin(p) {
      this.release();
      if (this.done) return false;
      if (atBucket(p)) { this.rinse(); return false; }
      if (!inFloor(p)) return false;
      this.started = true;
      this.previous = this.target = { x: p.x, z: p.z };
      if (!this.rinsing) this.lift = Math.hypot(p.x - this.point.x, p.z - this.point.z) > MOP.radius; // a far touch: the mop is carried there, then it cleans
      return true;
    }
    /** The finger moved: the mop head follows it (step) at up to MOP.speed, cleaning on the way. */
    drag(p) {
      if (this.done || !this.previous) return;
      if (atBucket(p)) { this.release(); this.rinse(); return; }
      if (!inFloor(p)) { this.release(); return; }
      this.target = { x: p.x, z: p.z };
    }
    /** Moves the mop head to p; with wipe it cleans (and maybe smears) every cell it passes over. */
    move(p, wipe, minStep = .012) {
      const from = this.point, dx = p.x - from.x, dz = p.z - from.z, len = Math.hypot(dx, dz);
      if (len <= minStep) return;
      this.point = { x: p.x, z: p.z };
      if (!wipe) return;
      this.started = true;
      const ux = dx / len, uz = dz / len, s = this.stroke;
      if (s && s.ux * ux + s.uz * uz < -.25) this.endStroke(); // the mop turned back: one stroke ends, the next begins
      const st = this.stroke || (this.stroke = { ux, uz, len: 0, removed: 0, smeared: 0 });
      st.ux = st.ux * .7 + ux * .3; st.uz = st.uz * .7 + uz * .3; const n = Math.hypot(st.ux, st.uz) || 1; st.ux /= n; st.uz /= n; st.len += len;
      const steps = Math.max(1, Math.ceil(len / .025));
      for (let k = 1; k <= steps; k++) this.wipeAt(from.x + dx * k / steps, from.z + dz * k / steps, len / steps, ux, uz);
      this._marks = this.computeMarks(); this.revision++;
      this.checkZones();
      if (this._marks >= 100) this.end(false);
    }
    wipeAt(x, z, ds, ux, uz) {
      const C = MOP.cell, R = MOP.radius, cap = this.start * MOP.capacity, eff = clamp(1 - this.load * .82, .12, 1), rate = .17 * eff * Math.min(1.6, ds / .025);
      const smear = this.load > MOP.smearFrom ? (this.load - MOP.smearFrom) / (1 - MOP.smearFrom) * .5 : 0;
      const i0 = Math.max(0, Math.floor((x - R - MOP.minX) / C)), i1 = Math.min(NX - 1, Math.floor((x + R - MOP.minX) / C));
      const j0 = Math.max(0, Math.floor((z - R - MOP.minZ) / C)), j1 = Math.min(NZ - 1, Math.floor((z + R - MOP.minZ) / C));
      let removed = 0, laid = 0;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const cx = MOP.minX + (i + .5) * C, cz = MOP.minZ + (j + .5) * C, d = Math.hypot(cx - x, cz - z);
        if (d > R) continue;
        const w = d < MOP.core ? 1 : 1 - (d - MOP.core) / (R - MOP.core), k = j * NX + i, a = this.dirt[k];
        this.wetAt[k] = this.clock;
        if (a > 0) { const cut = a * clamp(rate * w * this.tough[k], 0, .9); this.dirt[k] = a - cut; removed += cut; }
        if (smear > 0) { const target = smear * w * Math.max(0, Math.sin((cx * uz - cz * ux) * 61 + this.seed)); if (this.dirt[k] < target) { laid += target - this.dirt[k]; this.dirt[k] = target; this.tough[k] = Math.min(1.1, Math.max(this.tough[k], .9)); this.smearAt[k] = this.clock + 1; } }
      }
      this.lastWipe = this.clock; if (laid > .005 && this.smearMarks.length < 400) this.smearMarks.push({ x, z, ux, uz });
      this.load = clamp(this.load + (removed - laid) / cap); // a dirty mop moves dirt about: what it lays down leaves the mop
      if (this.stroke) { this.stroke.removed += removed; if (laid > .02) this.stroke.smeared += laid; }
      if (laid > .02) { this.smeared += laid; if (!this.smearFlag) { this.smearFlag = true; this.smears++; this.streak = 0; this.emit('smear', { x, z }); } }
    }
    endStroke() {
      const s = this.stroke; this.stroke = null; this.smearFlag = false; if (!s) return;
      if (s.smeared > .02) return; // the smear already broke the streak
      if (s.len >= MOP.strokeLen && s.removed >= this.start * .006) {
        this.streak++; this.best = Math.max(this.best, this.streak);
        const add = Math.min(this.streak >= 4 ? 1 : .5, MOP.bonusCap - this.bonus); if (add > 0) { this.bonus += add; this.left += add; }
        this.emit('stroke', { streak: this.streak, bonus: add });
      }
    }
    checkZones() {
      MOP.zones.forEach((q, k) => {
        if (this.zoneDone[k] || !this.startZone[k]) return;
        if (this.residual(k) <= this.startZone[k] * .06) { this.zoneDone[k] = true; const add = Math.min(3, MOP.bonusCap - this.bonus); if (add > 0) { this.bonus += add; this.left += add; } this.emit('zone', { zone: q.id, bonus: add, x: (q.x0 + q.x1) / 2, z: (q.z0 + q.z1) / 2 }); }
      });
    }
    /** Rinse and wring the mop in the bucket: a clean mop after MOP.rinseTime seconds. */
    rinse() {
      if (this.done || this.rinsing) return false;
      this.release(); this.started = true;
      const d = Math.hypot(this.point.x - MOP.bucket.x, this.point.z - MOP.bucket.z); this.rinseTravel = Math.min(1.6, d / 2.4); this.rinseDur = MOP.rinseTime + this.rinseTravel; // walk the mop over, then dunk and wring
      this.rinseT = this.rinseDur; this.rinses++; this.emit('rinse', { load: this.load }); return true;
    }
    release() { this.endStroke(); this.previous = null; this.target = null; }
    clearInput() { this.release(); this.keys.clear(); }
    key(key, down) {
      if (this.done) return;
      if (key === 'rinse') { if (down) this.rinse(); return; }
      if (!['left', 'right', 'up', 'down', 'wipe'].includes(key)) return;
      if (down) this.keys.add(key); else { this.keys.delete(key); if (key === 'wipe') this.endStroke(); }
    }
    step(dt) {
      dt = Math.min(.05, Math.max(0, dt));
      this.clock += dt;
      if (this.done) return;
      if (this.rinsing) {
        this.rinseT = Math.max(0, this.rinseT - dt);
        if (this.rinseT <= 0) { this.load = 0; this.emit('rinsed'); this.revision++; this.point = { ...MOP.bucket }; this.lift = true; }
      }
      if (this.started) { this.left = Math.max(0, this.left - dt); if (this.left <= 0) { this.end(true); return; } }
      if (this.rinsing) return;
      if (this.previous && this.target) { // follow the finger
        const p = this.point, dx = this.target.x - p.x, dz = this.target.z - p.z, d = Math.hypot(dx, dz), go = Math.min(d, MOP.speed * (this.lift ? 1.6 : 1) * dt);
        if (d > 1e-4) this.move({ x: p.x + dx * go / d, z: p.z + dz * go / d }, !this.lift, 0);
        if (this.lift && d - go < .02) this.lift = false;
        return;
      }
      if (this.previous || !this.keys.size) return;
      const x = Number(this.keys.has('right')) - Number(this.keys.has('left')), z = Number(this.keys.has('down')) - Number(this.keys.has('up'));
      if (!x && !z) return;
      const n = Math.hypot(x, z), d = 2.0 * dt, p = { x: clamp(this.point.x + d * x / n, MOP.minX, MOP.maxX), z: clamp(this.point.z + d * z / n, MOP.minZ, MOP.maxZ) };
      if (atBucket({ x: this.point.x + .6 * x / n, z: this.point.z + .6 * z / n }) && this.keys.has('wipe') && this.load > .05) { this.rinse(); return; }
      this.move(p, this.keys.has('wipe'), 0);
    }
    end(timeUp) {
      if (this.done) return;
      this.endStroke(); this.done = true; this.lightsOut = !!timeUp; this.finished = this._marks >= 25; this.keys.clear(); this.previous = null; this.rinseT = 0;
      this.emit(timeUp ? 'lights' : 'done');
    }
    /** The Finish button: allowed from one star on. */
    finish() { if (this.done || this._marks < 25) return false; this.end(false); return true; }
    /** Wetness 0..1 of cell k now (the mopped floor dries over MOP.dry seconds). */
    wet(k) { return clamp(1 - (this.clock - this.wetAt[k]) / MOP.dry); }
    view() {
      return {
        progress: this._marks / 100, score: this._marks, mult: 1, active: !!this.previous || this.keys.has('wipe'), revision: this.revision, point: this.point,
        load: this.load, dirty: this.load > MOP.smearFrom - .07, rinsing: this.rinsing ? 1 - this.rinseT / this.rinseDur : 0, rinseTravel: this.rinsing ? this.rinseTravel / this.rinseDur : 0, left: this.left, started: this.started,
        streak: this.streak, best: this.best, smears: this.smears, rinses: this.rinses, zones: this.zoneDone.slice(), events: this.events, clock: this.clock, done: this.done, lightsOut: this.lightsOut
      };
    }
    result(starsFor) {
      const value = this._marks, stars = this.finished ? (starsFor ? starsFor(MOP.missionId, value) : [25, 50, 75].filter(x => value >= x).length) : 0;
      return { missionId: MOP.missionId, metric: MOP.metric, value, score: value, stars, streak: this.best, cleaned: this.zoneDone.filter(Boolean).length, zones: MOP.zones.length,
        smears: this.smears, rinses: this.rinses, left: Math.round(this.left), lightsOut: this.lightsOut, finished: this.finished };
    }
  }
  const api = { MOP, PAY, NX, NZ, CLEAN, pay: stars => PAY[stars] || 0, inFloor, atBucket, layout, MopTrial };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MopCore = api;
})(typeof window === 'object' ? window : globalThis);
