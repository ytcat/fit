/* Clean the gym: a free floor sweep. Coordinates are in the same metres as the 3D set. */
(function (root) {
  'use strict';
  const PAY = Object.freeze([0, 6, 10, 15]);
  const MOP = Object.freeze({
    missionId: 'clean_gym', metric: 'marks', minX: -2.55, maxX: 2.55, minZ: .48, maxZ: 4.65, radius: .21,
    spots: Object.freeze([[-1.57,1.22],[-.45,1.11],[.86,1.07],[1.78,1.65],[-1.65,2.42],[-.3,2.37],[.94,2.72],[-1.3,3.77],[.18,3.72],[1.51,4.1]].map(Object.freeze))
  });
  const inFloor = p => Number.isFinite(p?.x) && Number.isFinite(p?.z) && p.x >= MOP.minX && p.x <= MOP.maxX && p.z >= MOP.minZ && p.z <= MOP.maxZ;
  const sqDistance = (p, a, b) => {
    const x = b.x - a.x, z = b.z - a.z, den = x*x + z*z;
    const t = den ? Math.max(0, Math.min(1, ((p.x - a.x)*x + (p.z - a.z)*z)/den)) : 0;
    return (p.x - a.x - t*x)**2 + (p.z - a.z - t*z)**2;
  };
  function makeSpots() {
    return MOP.spots.map(([x,z], n) => {
      const dots = [{ x, z, left: true }];
      for (let i = 0; i < 8; i++) {
        const a = i*Math.PI/4 + n*1.17, r = .16 + .042*((n*3+i*7)%4);
        dots.push({ x: x + Math.cos(a)*r*1.18, z: z + Math.sin(a)*r*.91, left: true });
      }
      return { x, z, dots, left: dots.length };
    });
  }
  class MopTrial {
    constructor() {
      this.spots = makeSpots();
      this.total = this.spots.reduce((n, s) => n+s.dots.length, 0);
      this.point = { x: 0, z: 3.3 };
      this.previous = null; this.keys = new Set(); this.removed = 0; this.revision = 0; this.done = false;
    }
    get marks() { return Math.floor(100*this.removed/this.total); }
    begin(p) {
      this.release();
      if (this.done || !inFloor(p)) return false;
      this.previous = this.point = { x: p.x, z: p.z };
      return true;
    }
    drag(p) {
      if (this.done || !this.previous) return;
      if (!inFloor(p)) { this.release(); return; }
      this.move(p, true);
    }
    move(p, wipe, minStep = .012) {
      const from = this.point;
      if (Math.hypot(from.x-p.x, from.z-p.z) <= minStep) return;
      this.point = { x: p.x, z: p.z };
      if (!wipe) return;
      for (const s of this.spots) for (const dot of s.dots) {
        if (dot.left && sqDistance(dot, from, p) <= MOP.radius**2) {
          dot.left = false; s.left--; this.removed++; this.revision++;
        }
      }
      if (this.removed === this.total) this.finish();
    }
    release() { this.previous = null; }
    clearInput() { this.release(); this.keys.clear(); }
    key(key, down) {
      if (!['left','right','up','down','wipe'].includes(key) || this.done) return;
      if (down) this.keys.add(key); else this.keys.delete(key);
    }
    step(dt) {
      if (this.done || this.previous || !this.keys.size) return;
      const x = Number(this.keys.has('right')) - Number(this.keys.has('left'));
      const z = Number(this.keys.has('down')) - Number(this.keys.has('up'));
      if (!x && !z) return;
      const n = Math.hypot(x,z), d = 2.45*Math.min(.05, Math.max(0,dt));
      this.move({ x: Math.max(MOP.minX, Math.min(MOP.maxX, this.point.x + d*x/n)), z: Math.max(MOP.minZ, Math.min(MOP.maxZ, this.point.z + d*z/n)) }, this.keys.has('wipe'), 0);
    }
    finish() {
      if (this.done || this.marks < 25) return false;
      this.done = true; this.clearInput(); return true;
    }
    view() {
      return { progress: this.marks/100, score: this.marks, mult: 1, cleaned: this.spots.filter(s => s.left === 0).length,
        totalSpots: this.spots.length, active: !!this.previous || this.keys.has('wipe'), revision: this.revision, point: this.point };
    }
    result(starsFor) {
      const value = this.marks, stars = this.done ? (starsFor ? starsFor(MOP.missionId, value) : [25,50,75].filter(x => value >= x).length) : 0;
      return { missionId: MOP.missionId, metric: MOP.metric, value, score: value, stars, streak: 0, cleaned: this.view().cleaned, finished: this.done };
    }
  }
  const api = { MOP, PAY, pay: stars => PAY[stars] || 0, inFloor, MopTrial };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MopCore = api;
})(typeof window === 'object' ? window : globalThis);
