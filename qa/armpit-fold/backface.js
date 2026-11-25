// qa/armpit-fold/backface.js — page snippet (STUDIO_AFTER for qa/avatar-joins/studio.cjs): paints every VISIBLE BACK FACE of the
// skin (and of the clothes) in the shoulder/armpit region pure magenta. A closed, unfolded surface seen from outside shows only
// front faces, so any magenta pixel is skin folded through itself, a pin-hole or a slit (cloth open edges far from the shoulder
// - hems, cuffs, the hood opening - are outside the region). Fur, mane and hair are left as they are (double-sided by design).
// Region: rest |x| .14-.56, y 1.22-1.92 (the armpit, deltoid, pectoral and back-of-armpit folds of every rig).
(() => {
  const c = window.__aj, list = [c.skin];
  c.root.traverse(o => { if (o.isSkinnedMesh && o !== c.skin && o !== c.bodyFur && !o.userData.mane && o.material && !Array.isArray(o.material)) list.push(o); });
  for (const m of list) {
    const mat = m.material, prev = mat.onBeforeCompile, key = mat.customProgramCacheKey;
    mat.side = THREE.DoubleSide;
    mat.onBeforeCompile = (shader, r) => {
      prev.call(mat, shader, r);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 qaRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nqaRest=vec2(abs(position.x),position.y);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 qaRest;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif(!gl_FrontFacing&&qaRest.x>.14&&qaRest.x<.56&&qaRest.y>1.22&&qaRest.y<1.92)gl_FragColor=vec4(1.0,0.0,1.0,1.0);');
    };
    mat.customProgramCacheKey = () => (key ? key.call(mat) : '') + '-qa-backface';
    mat.needsUpdate = true;
  }
})();
