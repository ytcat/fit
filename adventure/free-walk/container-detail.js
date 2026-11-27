/* Four prebuilt harbor details. The walk height field always measures the stock boxes first. */
(() => {
  'use strict';
  const BASE = './assets/street/city-review/container-liveries/';
  const ENTER = 15, EXIT = 19, CAP = 2;
  let pending, loaded;
  function prepare() {
    if (!pending && window.ContainerLiveries && THREE.GLTFLoader) {
      pending = ContainerLiveries.load(new THREE.GLTFLoader(), BASE)
        .then(kit => { loaded = kit; })
        .catch(() => { pending = null; });
    }
    return pending || Promise.resolve();
  }
  function mount(map, scale, kit = loaded) {
    const batch = map.layout.inst.containers;
    if (!kit || !batch?.mesh) return null;
    const { list, mesh } = batch;
    const placements = list.map((item, index) => ({ item, index }))
      .filter(({ item }) => item.y === map.layout.landY && item.z === 41 &&
        !list.some(other => other.x === item.x && other.z === item.z && other.y > item.y))
      .sort((a, b) => Math.abs(a.item.x + 2) - Math.abs(b.item.x + 2))
      .slice(0, kit.liveries.length);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0), color = new THREE.Color();
    const entries = placements.map(({ item, index }, i) => {
      const livery = kit.liveries[i], object = kit.create(livery.slug), stock = new THREE.Matrix4();
      mesh.getMatrixAt(index, stock);
      mesh.setColorAt(index, color.set(livery.paint).convertSRGBToLinear());
      object.position.set(item.x, item.y - .01, item.z);
      object.rotation.y = item.ry;
      object.scale.setScalar(.24);
      object.visible = false;
      object.traverse(part => {
        if (part.isMesh) { part.castShadow = false; part.receiveShadow = true; }
      });
      map.group.add(object);
      return { object, stock, index, slug: livery.slug, id: livery.id, x: item.x * scale, z: item.z * scale, near: false, distance: Infinity };
    });
    if (entries.length) mesh.instanceColor.needsUpdate = true;
    let lastX = Infinity, lastZ = Infinity;
    function set(entry, near) {
      if (entry.near === near) return;
      entry.near = entry.object.visible = near;
      mesh.setMatrixAt(entry.index, near ? hidden : entry.stock);
      mesh.instanceMatrix.needsUpdate = true;
    }
    function update(p) {
      if (Math.hypot(p.x - lastX, p.z - lastZ) < .65) return;
      lastX = p.x; lastZ = p.z;
      for (const e of entries) e.distance = Math.hypot(e.x - p.x, e.z - p.z);
      const near = entries.filter(e => e.distance <= (e.near ? EXIT : ENTER))
        .sort((a, b) => a.distance - b.distance).slice(0, CAP);
      for (const e of entries) set(e, near.includes(e));
    }
    function dispose() {
      for (const e of entries) { set(e, false); map.group.remove(e.object); }
    }
    return { update, dispose, snapshot: () => entries.map(({ index, slug, id, x, z, near }) => ({ index, slug, id, x, z, near })) };
  }
  window.FreeWalkContainerDetail = { mount, prepare };
})();
