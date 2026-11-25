// qa/armpit-fold/backface.js — page snippet (STUDIO_AFTER for qa/avatar-joins/studio.cjs): paints every VISIBLE BACK FACE of the
// skin (and of the clothes) in the shoulder/armpit region pure magenta. A closed, unfolded surface seen from outside shows only
// front faces, so any magenta pixel is skin folded through itself, a pin-hole or a slit (cloth open edges far from the shoulder
// - hems, cuffs, the hood opening - are outside the region). Fur, mane, hair and flat straps are left as they are (double-sided
// by design).
// Region: rest |x| .14-.56, y 1.22-1.92 (the armpit, deltoid, pectoral and back-of-armpit folds of every rig).
(() => {
  const c = window.__aj, list = [c.skin];
  c.root.traverse(o => { if (o.isSkinnedMesh && o !== c.skin && o !== c.bodyFur && !o.userData.mane && !/strap|duffel|bag|piping/i.test(o.name) && o.material && !Array.isArray(o.material)) list.push(o); });
  // the street clothes are one mesh: the garment bodies (hoodie, jeans: the two largest connected pieces, wound like the skin
  // they grew from) and sewn-on parts (hood, ribs, pocket, cords: any winding). Only the garment bodies are checked.
  const garment = m => {
    const P = m.geometry.attributes.position.array, idx = m.geometry.index.array, n = P.length / 3, key = i => Math.round(P[i * 3] * 2e4) + ':' + Math.round(P[i * 3 + 1] * 2e4) + ':' + Math.round(P[i * 3 + 2] * 2e4);
    const rep = new Int32Array(n), map = new Map(); for (let i = 0; i < n; i++) { const k = key(i), r = map.get(k); if (r == null) { map.set(k, i); rep[i] = i; } else rep[i] = r; }
    const par = Int32Array.from({ length: n }, (_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = find(rep[idx[t + k]]), b = find(rep[idx[t + (k + 1) % 3]]); if (a !== b) par[a] = b; }
    const size = new Map(); for (let i = 0; i < n; i++) { const r = find(rep[i]); size.set(r, (size.get(r) || 0) + 1); }
    const big = new Set([...size].sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0])), flag = new Float32Array(n); for (let i = 0; i < n; i++) flag[i] = big.has(find(rep[i])) ? 1 : 0;
    m.geometry.setAttribute('qaBody', new THREE.BufferAttribute(flag, 1));
  };
  for (const m of list) {
    const parts = Boolean(m.userData.streetCloth); if (parts) garment(m); // (the skin has no spare vertex attribute slot: no flag there)
    const mat = m.material, prev = mat.onBeforeCompile, key = mat.customProgramCacheKey;
    mat.side = THREE.DoubleSide;
    mat.onBeforeCompile = (shader, r) => {
      prev.call(mat, shader, r);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + (parts ? 'attribute float qaBody;' : '') + 'varying vec3 qaRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nqaRest=vec3(abs(position.x),position.y,' + (parts ? 'qaBody' : '1.0') + ');');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 qaRest;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif(!gl_FrontFacing&&qaRest.z>.5&&qaRest.x>.14&&qaRest.x<.56&&qaRest.y>1.22&&qaRest.y<1.92)gl_FragColor=vec4(1.0,0.0,1.0,1.0);');
    };
    mat.customProgramCacheKey = () => (key ? key.call(mat) : '') + '-qa-backface';
    mat.needsUpdate = true;
  }
})();
