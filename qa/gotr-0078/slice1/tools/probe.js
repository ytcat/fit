// Lists the visible meshes of the Fighter in street clothes that sit around the waist (debug).
module.exports = async (p) => {
  await p.waitForFunction(() => window.StoryCast, null, { timeout: 120000 });
  const info = await p.evaluate(() => {
    const c = app.engine.coach; StoryCast.outfit(c, 'street'); c.root.updateMatrixWorld(true); const out = [];
    c.root.traverse(o => { if (!o.isMesh) return; let v = true, q = o; while (q && q !== c.root.parent) { v = v && q.visible; q = q.parent; } if (!v) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); if (b.max.y > .95 && b.min.y < 1.15 && !o.isSkinnedMesh) out.push([o.name || o.type, o.parent?.name, o.geometry.type, +b.min.y.toFixed(2), +b.max.y.toFixed(2)].join('|')); if (o.isSkinnedMesh) out.push('SK ' + (o.name || '') + ' ' + (o === c.skin) + ' ' + (o === c.shorts)); });
    return out;
  });
  console.log(info.join('\n'));
};
