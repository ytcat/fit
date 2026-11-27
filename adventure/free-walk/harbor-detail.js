/* FreeWalk's approved quay scenery, in authored metres. The ship and cranes adopt the
 * same distance policy independently of traffic and the map's existing lighting. */
(() => {
  'use strict';
  const kinds = ['crane', 'ship'];
  const key = (kind, tier) => 'harbor' + kind + tier;
  const far = kinds.map(kind => key(kind, 'far'));
  const prepare = ms => window.CityAssets?.ready(ms, far);
  function mount(group, scale, landY) {
    const assets = window.CityAssets;
    const initial = assets?.cached(far, false);
    if (!far.every(name => initial?.[name]?.scene)) return null;

    const quay = new THREE.Group();
    quay.name = 'Approved harbor';
    group.add(quay);
    const points = [
      { kind: 'crane', x: -1, y: landY, z: 48.6 + 5.8 / scale, yaw: -Math.PI / 2 },
      { kind: 'crane', x: 11, y: landY, z: 48.6 + 5.8 / scale, yaw: -Math.PI / 2 },
      { kind: 'ship', x: 5, y: 0, z: 56.4, yaw: 0 }
    ];
    const colliders = points.slice(0, 2).flatMap(({ x, z }) =>
      [-8, 8].flatMap(offset => [-5.8, 4.9].map(rail => [x * scale + offset, z * scale + rail, 1.55])));
    const pending = new Set();
    const nodes = points.map(point => {
      const { kind, x, y, z, yaw } = point;
      const node = new THREE.Group();
      node.name = kind === 'ship' ? 'Portward cargo ship (approved)' : 'Harborline gantry (approved) ' + x;
      node.position.set(x, y, z);
      node.rotation.y = yaw;
      node.scale.setScalar(1 / scale);
      quay.add(node);
      return { node, point, levels: {}, tier: 'far', desired: 'far' };
    });
    let live = true;
    function add(entry, tier, gltf) {
      const model = gltf.scene.clone(true);
      model.name = entry.point.kind + ' ' + tier;
      model.traverse(o => {
        if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; }
      });
      model.visible = tier === entry.tier;
      entry.node.add(model);
      entry.levels[tier] = model;
    }
    for (const entry of nodes) add(entry, 'far', initial[key(entry.point.kind, 'far')]);
    function request(kind, tier) {
      const name = key(kind, tier);
      if (pending.has(name)) return;
      pending.add(name);
      assets.load(name).then(gltf => {
        if (!live) return;
        for (const e of nodes) if (e.point.kind === kind) add(e, tier, gltf);
      }).catch(() => {}); // stay on the loaded tier for this visit
    }
    let lastX = Infinity, lastZ = Infinity;
    function update(player) {
      if (Math.hypot(player.x - lastX, player.z - lastZ) >= .8) {
        lastX = player.x;
        lastZ = player.z;
        const distance = e => Math.hypot(player.x - e.point.x * scale, player.z - e.point.z * scale);
        const nearestCrane = distance(nodes[0]) <= distance(nodes[1]) ? nodes[0] : nodes[1];
        for (const e of nodes) {
          const d = distance(e);
          const canUseNear = e === nearestCrane || e.point.kind === 'ship';
          e.desired = canUseNear && d <= (e.desired === 'near' ? 50 : 42) ? 'near'
            : d <= (e.desired === 'far' ? 76 : 86) ? 'mid' : 'far';
          if (e.desired !== 'far' && !e.levels[e.desired]) request(e.point.kind, e.desired);
        }
      }
      for (const e of nodes) {
        const tier = e.levels[e.desired] ? e.desired : e.desired === 'near' && e.levels.mid ? 'mid' : 'far';
        if (tier === e.tier) continue;
        e.levels[e.tier].visible = false;
        e.tier = tier;
        e.levels[tier].visible = true;
      }
    }
    return {
      colliders, update,
      snapshot: () => nodes.map(({ node, tier, desired }) => ({ name: node.name, tier, desired })),
      dispose() {
        live = false;
        group.remove(quay);
        const resources = new Set();
        quay.traverse(o => { if (o.isMesh) { resources.add(o.geometry); resources.add(o.material); } });
        for (const resource of resources) resource.dispose();
      }
    };
  }

  window.FreeWalkHarborDetail = { prepare, mount };
})();
