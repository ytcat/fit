/* Authored Market Row stalls. Optional assets, stable counter collision, only two close decorations. */
(() => {
  'use strict';
  const BASE = './assets/street/city-review/market-stalls-v1/';
  const slots = Object.freeze({ '-1:-11': 'baker', '-1:-5.5': 'olive', '-1:11': 'spice', '1:-8.25': 'fish', '1:8.25': 'textile' });
  const titles = Object.freeze({ baker: 'BAKERY', fish: 'FISH MARKET', spice: 'SPICES & GRAINS', olive: 'OLIVES & PICKLES', textile: 'TEXTILES' });
  const ids = [...new Set(Object.values(slots))];
  const loaded = new Map(), request = new Map();
  function load(id, detail) {
    const key = id + '-' + detail, T = window.THREE;
    if (!T?.GLTFLoader || !ids.includes(id)) return Promise.resolve(null);
    if (loaded.has(key)) return Promise.resolve(loaded.get(key));
    if (request.has(key)) return request.get(key);
    const p = new Promise(resolve => {
      new T.GLTFLoader().load(BASE + key + '.glb', resolve, undefined, () => resolve(null));
    }).then(g => g?.scene || null, () => null).then(scene => {
      request.delete(key); // keep successful geometry, not permanent failed requests
      if (scene) loaded.set(key, scene);
      return scene;
    });
    request.set(key,p); return p;
  }
  const prepare = () => Promise.all(ids.map(id => load(id, 'mid')));
  function create(c, id, x, z, yaw, options = null) {
    const T = window.THREE, art = loaded.get(id + '-mid');
    if (!T || !ids.includes(id) || (!art && !options?.placeholder)) return null;
    const root = new T.Group(); root.name = 'Market stall ' + id; root.position.set(x,0,z); root.rotation.y = yaw;
    const prep = source => { const clone = source.clone(true); clone.traverse(m => { if (m.isMesh) { m.userData.fwSolid=false; m.castShadow=false; m.receiveShadow=true; } }); return clone; };
    const solid = new T.Mesh(new T.BoxGeometry(2.52,1.02,1.18), new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}));
    solid.name='Market counter collision'; solid.position.y=.51; solid.userData.fwSolid=true;
    let mid, hi, placeholder, timer, alive=true, want=false, fetchingHi=false, attempts=0;
    const item = {root,detail,near:false,id,ready:false,dispose};
    function install(source) {
      if (!alive || mid || !source) return;
      if (placeholder) {
        options.detachPlaceholder(placeholder);
        placeholder = null;
      }
      mid = prep(source); mid.name = 'Authored mid stall ' + id; root.add(mid); item.ready=true;
      options?.onReady?.();
      if (want) detail(true);
    }
    function populate() {
      if (!alive || mid || !options) return;
      attempts++;
      load(id, 'mid').then(source => {
        if (!alive) return;
        if (source) install(source);
        else if (attempts < 3) timer=setTimeout(populate, attempts * 1200);
      });
    }
    if (art) install(art);
    else placeholder=options.placeholder();
    root.add(solid); c.group.add(root);
    c.disposables.push(solid.geometry,solid.material);
    // Keep identical blockers before/after the art swap so the already-baked height grid stays valid.
    const g = new T.BoxGeometry(.10,2.35,.10); c.disposables.push(g);
    for (const px of [-1.37,1.37]) for (const pz of [-.77,.74]) {
      const post = new T.Mesh(g,solid.material); post.position.set(px,1.175,pz); post.userData.fwSolid=true; post.name='Market stall post collision'; root.add(post);
    }
    if (!art) populate();
    function detail(on) {
      want=on;
      if (on && mid && id!=='textile' && !hi && !fetchingHi) {
        fetchingHi=true; load(id,'near').then(v => {
          fetchingHi=false;
          if (!v || !alive || !root.parent) return;
          hi=prep(v); hi.name='Authored near stall ' + id; root.add(hi); hi.visible=want; mid.visible=!want;
        });
      }
      if (hi) { hi.visible=on; mid.visible=!on; }
    }
    function dispose() {
      alive=false; if (timer !== undefined) clearTimeout(timer);
    }
    return item;
  }
  const where = new (window.THREE.Vector3)();
  function update(items,p,cap=2) {
    const list=items.map(e=>{e.root.getWorldPosition(where);return{e,d:Math.hypot(p.x-where.x,p.z-where.z)};});
    const near=list.filter(o=>o.d<=(o.e.near?10:8)).sort((a,b)=>a.d-b.d).slice(0,cap);
    for (const {e} of list){let next=near.some(q=>q.e===e);if(next!==e.near){e.near=next;e.detail(next);}}
  }
  window.FreeWalkMarketStalls = {prepare,create,update,slots,titles};
})();
