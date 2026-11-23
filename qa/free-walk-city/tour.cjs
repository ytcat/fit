// Free walk QA (GOTR-0118): walk the whole town on foot. Starts in Old Town and walks to every district in turn with the
// stick (FreeWalk.qa.walk: the same movement, collision and traffic as play, 1/30 s steps, drawn only at each stop),
// steering along the map's street route. Reports per leg: reached, metres walked, game seconds, the district name shown.
//   node qa/free-walk-city/tour.cjs <out dir> [lang=en] [legs=market,otto,...]
const { chromium } = require('playwright'), fs = require('fs');
const { serve, boot } = require('./serve.cjs');
const out = process.argv[2] || 'qa/free-walk-city/out', lang = process.argv[3] || 'en';
const legs = (process.argv[4] || 'bruno,market_stall,otto,market,docks_quay,docks,downtown,dome,cove,fort,hill,fair,neon,tech').split(',');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const s = await serve(), base = `http://localhost:${s.address().port}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 402, height: 690 }, hasTouch: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push((e.stack || e.message).slice(0, 300)));
  await boot(p, base, lang);
  await p.evaluate(() => FreeWalk.open({ start: 'oldtown' }));
  await p.waitForFunction(() => FreeWalk.snapshot() && !FreeWalk.snapshot().busy, null, { timeout: 300000 });
  const report = [];
  for (const target of legs) {
    const leg = await p.evaluate(target => {
      // a distance field to the target over the walk grid itself (4-neighbour BFS): proves the target is reachable on foot,
      // then the stick steers down the field; the movement itself (collision, cars, people) is the game's own
      const town = FreeWalk.qa.town, G = town.grid, t = town.targets[target], nx = G.nx, nz = G.nz, N = nx * nz, dist = new Int32Array(N).fill(-1), q = new Int32Array(N);
      const t0 = G.idx(t.x, t.z); let h = 0, tl = 0; if (t0 < 0 || !G.walk[t0]) return { target, reached: false, why: 'target not walkable' };
      dist[t0] = 0; q[tl++] = t0;
      while (h < tl) { const k = q[h++], i = k % nx; for (const n of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, k - nx, k + nx]) if (n >= 0 && n < N && dist[n] < 0 && G.walk[n]) { dist[n] = dist[k] + 1; q[tl++] = n; } }
      const s0 = FreeWalk.snapshot().s, k0 = G.idx(s0.x, s0.z); if (dist[k0] < 0) return { target, reached: false, why: 'no path on foot' };
      let walked = 0, secs = 0, prev = s0;
      for (let it = 0; it < 700; it++) {
        const s = FreeWalk.snapshot().s; if (Math.hypot(t.x - s.x, t.z - s.z) <= 3.5) return { target, reached: true, path: Math.round(dist[k0] * G.cell), walked: Math.round(walked), secs: Math.round(secs) };
        let k = G.idx(s.x, s.z); if (k < 0 || dist[k] < 0) { const n = G.nearest(s.x, s.z); k = G.idx(n.x, n.z); }
        for (let step = 0; step < 8; step++) { let best = k; for (const n of [k - 1, k + 1, k - nx, k + nx, k - nx - 1, k - nx + 1, k + nx - 1, k + nx + 1]) if (n >= 0 && n < N && dist[n] >= 0 && dist[n] < dist[best]) best = n; if (best === k) break; k = best; }
        const ax = G.x0 + (k % nx + .5) * G.cell, az = G.z0 + (Math.floor(k / nx) + .5) * G.cell; let dx = ax - s.x, dz = az - s.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Y = FreeWalk.snapshot().yaw, fx = -Math.sin(Y), fz = -Math.cos(Y), rx = Math.cos(Y), rz = -Math.sin(Y);
        FreeWalk.qa.walk(dx * rx + dz * rz, dx * fx + dz * fz, .4); secs += .4;
        const n = FreeWalk.snapshot().s; walked += Math.hypot(n.x - prev.x, n.z - prev.z); prev = n;
      }
      const s = FreeWalk.snapshot().s; return { target, reached: false, why: 'time', left: Math.round(Math.hypot(t.x - s.x, t.z - s.z)), walked: Math.round(walked), secs: Math.round(secs) };
    }, target);
    await p.waitForTimeout(1200);
    const v = await p.evaluate(() => FreeWalk.snapshot());
    leg.zone = v.zone; leg.cars = v.town.cars.length; leg.walkers = v.town.walkers; leg.calls = v.perf.calls; leg.triangles = v.perf.triangles;
    await p.screenshot({ path: `${out}/tour-${lang}-${target}.png` });
    report.push(leg); console.log(JSON.stringify(leg));
  }
  fs.writeFileSync(`${out}/tour-${lang}.json`, JSON.stringify({ lang, report, errors: errs.slice(0, 10) }, null, 1));
  console.log('errors', JSON.stringify(errs.slice(0, 8)));
  await b.close(); s.close();
})();
