// Debug: front surface of the street outfit against the bare body, and fur visibility.
module.exports = async (p) => {
  await p.waitForFunction(() => window.StoryCast, null, { timeout: 120000 });
  const info = await p.evaluate(() => {
    const c = app.engine.coach, g = c.skin.geometry, out = [];
    const front = (y, x = 0) => { const P = g.attributes.position; let z = -9; for (let i = 0; i < P.count; i++) if (Math.abs(P.getY(i) - y) < .012 && Math.abs(P.getX(i) - x) < .012) z = Math.max(z, P.getZ(i)); return +z.toFixed(3); };
    const base = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6].map(y => front(y)), baseX = [1.1, 1.2, 1.3, 1.4].map(y => front(y, .1));
    StoryCast.outfit(c, 'street');
    out.push('base ' + base, 'street ' + [1.1, 1.2, 1.3, 1.4, 1.5, 1.6].map(y => front(y)), 'baseX ' + baseX, 'streetX ' + [1.1, 1.2, 1.3, 1.4].map(y => front(y, .1)));
    const a = g.attributes; out.push('attrs ' + Object.keys(a).join(','), 'mass ' + Array.from(a.avatarMass.array.slice(0, 3)) + ' ' + a.avatarMass.array.reduce((n, v) => n + (v !== 0), 0), 'fur ' + c.bodyFur?.visible);
    const b = StoryCast.rig('bruno'); out.push('bruno fur ' + b.bodyFur?.visible + ' ' + b.bodyFurOff);
    return out;
  });
  console.log(info.join('\n'));
};
