// Original container hardware/Shell: shared geometry. Position matches existing Harborline.
(function (root) {
'use strict';
const liveries=[{"slug":"harborline","company":"HARBORLINE","tag":"GLORYLAND FREIGHT","prefix":"HLFU","serial":"402918","paint":"#277B91","frame":"#175160","ink":"#EAE5CE","mark":"wave","id":"HLFU 402918 8"},{"slug":"tidemarsh","company":"TIDEMARSH","tag":"REGIONAL LOGISTICS","prefix":"TMLU","serial":"593207","paint":"#9D4937","frame":"#713226","ink":"#F0E0BB","mark":"bars","id":"TMLU 593207 9"},{"slug":"nordquay","company":"NORDQUAY","tag":"NORTH COAST SHIPPING","prefix":"NQSU","serial":"724681","paint":"#466452","frame":"#304537","ink":"#E7E8CD","mark":"mountain","id":"NQSU 724681 4"},{"slug":"sunspoke","company":"SUNSPOKE","tag":"ISLAND CARGO","prefix":"SSCU","serial":"631046","paint":"#BE9656","frame":"#7E663F","ink":"#352C20","mark":"sun","id":"SSCU 631046 9"}];

/**
 * @param {object} loader Three.js GLTFLoader
 * @param {string} base URL pointing to this directory (must end with /)
 * Resolves to {create(slug), liveries, dispose()}; clone shell geometry + tint materials lazily.
 * In production, load it only in the docks scene and use the existing fallback if loading fails.
 */
async function load(loader, base) {
 const get = (name) => new Promise((res, rej) => loader.load(base + name, res, undefined, rej));
 const gltfs = await Promise.all([get('shared-shell.glb'), ...liveries.map(v => get(v.slug + '-markings.glb'))]);
 const [shell, ...marks]=gltfs, cache=new Map();
 function create(slug) {
  const i=liveries.findIndex(v=>v.slug===slug); if(i<0) throw Error('Unknown container livery: '+slug);
  const l=liveries[i], model=shell.scene.clone(true);
  const Material = m => {
   if(!m.name.startsWith('faded harbor') && !m.name.startsWith('reinforced frame')) return m;
   const key=slug+':'+m.name;
   if(!cache.has(key)){
    const c=m.clone();
    c.color.set(m.name.startsWith('faded harbor')?l.paint:l.frame);
    if (c.color.convertSRGBToLinear) c.color.convertSRGBToLinear();
    cache.set(key, c);
   }
   return cache.get(key);
  };
  model.traverse(n=>{if(n.isMesh) n.material=Array.isArray(n.material)?n.material.map(Material):Material(n.material);});
  model.add(marks[i].scene.clone(true));
  model.name=l.company+' / '+l.id;
  return model;
 }
 function dispose() {
  // Call only after every clone has been removed. Mesh geometry is shared.
  const geom=new Set(), mat=new Set(cache.values());
  for(const g of gltfs) g.scene.traverse(o=>{if(o.isMesh){geom.add(o.geometry); for(const m of [].concat(o.material))mat.add(m);}});
  for(const g of geom)g.dispose(); for(const m of mat)m.dispose(); cache.clear();
 }
 return { create, liveries, dispose };
}
root.ContainerLiveries={load,liveries};
})(globalThis);
