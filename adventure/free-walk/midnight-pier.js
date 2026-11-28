/* Midnight Pier authored art: preserve the GLB's sampled rotor and upright gondola tracks.
   Runtime batching reuses the identical primitive within each opaque cabin material. */
(() => {
  'use strict';
  function mount(bake, pivot) {
    if (!bake?.scene || !bake.animations?.[0]) return null;
    const T = THREE, wheel = bake.scene.clone(true);
    const rotor = wheel.children.find(o => /^02[_ ]Rotor/.test(o.name));
    const fixed = wheel.children.find(o => /^01[_ ]Fixed/.test(o.name));
    if (!fixed) return null;
    fixed.traverse(o => { if (o.isMesh) o.userData.fwSolid = true; });
    const cabins = rotor?.children.filter(o => /^Gondola[_ ]/.test(o.name)) || [];
    if (cabins.length !== 16 || cabins.some(o => o.children.length !== 8 || o.children.some(m => !m.isMesh || Array.isArray(m.material)))) return null;
    const meshes = new Map();
    for (const cabin of cabins) for (const mesh of cabin.children) {
      if (mesh.material.transparent) continue; // keep individual glass depth sorting
      if (!meshes.has(mesh.material)) meshes.set(mesh.material, []);
      meshes.get(mesh.material).push(mesh);
    }
    const rigs = [];
    for (const parts of meshes.values()) {
      const prototype = parts[0];
      if (!parts.every(o => o.geometry.index?.count === prototype.geometry.index?.count &&
        o.geometry.attributes.position.count === prototype.geometry.attributes.position.count)) return null;
      const obj = new T.InstancedMesh(prototype.geometry, prototype.material, parts.length);
      obj.name = prototype.material.name + ' (gondola instances)'; obj.frustumCulled = false;
      rigs.push({ obj, parts });
    }
    const group = new T.Group(); group.name = 'Midnight Pier (authored)';
    group.add(wheel); for (const { obj, parts } of rigs) {
      group.add(obj);
      for (const m of parts) m.visible = false;
    }
    const inv = new T.Matrix4(), mat = new T.Matrix4(), mixer = new T.AnimationMixer(wheel);
    mixer.clipAction(bake.animations[0]).play();
    const update = t => {
      mixer.setTime(t);
      group.updateMatrixWorld(true); inv.copy(group.matrixWorld).invert();
      for (const { obj, parts } of rigs) {
        parts.forEach((p, i) => obj.setMatrixAt(i, mat.multiplyMatrices(inv, p.matrixWorld)));
        obj.instanceMatrix.needsUpdate = true;
      }
    };
    pivot.add(group); update(0);
    function dispose() {
      mixer.stopAllAction(); mixer.uncacheRoot(wheel);
      for (const { obj } of rigs) obj.dispose?.();
      pivot.remove(group);
    }
    return { group, cabins, update, dispose };
  }
  window.MidnightPier = { mount };
})();
