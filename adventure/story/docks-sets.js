/* Story set 'dream_docks' (Chapter 1 beat 10, the Docks; docs/adventure/FILMS.md film 11): the same Dockside Hangar the bare-knuckle
 * fight is staged in (arena-sets.js 'docks': corrugated hall, quay door, high-bay sodium lamps, the work lamp over the painted circle,
 * the dock crew standing round it, crates, drums, the cash on the drum), placed in a story scene at night. Arena coordinates are the
 * story coordinates (metres, y up, the circle at the origin); the quay door opens on -z (x -6 .. 9, z -11), the quay and the water
 * beyond it. objects.tune(scene, set) turns the story set's day lights into the hangar's night lights; the crowd sways a little.
 * World: metres, y up. */
(() => {
  const NAMES = { en: 'Dockside Hangar', he: 'האנגר בנמל', ru: 'Портовый ангар' };
  function register() {
    const Sets = window.StorySets; if (!Sets || !window.ArenaSets?.has?.('docks') || Sets.ids().includes('dream_docks')) return;
    Sets.register('dream_docks', c => {
      const lang = ['en', 'he', 'ru'].includes(window.app?.lang) ? window.app.lang : 'en';
      const city = c.opts?.city, kit = city?.dockProps && window.CityAssets?.propKit ? window.CityAssets.propKit({ dockProps: city.dockProps }) : undefined; // the film waited for them (dream-scenes.js)
      const made = window.ArenaSets.build('docks', lang, NAMES, kit ? { kit } : {}); // no kit: arena-sets.js uses what is loaded
      c.group.add(made.group); c.disposables.push({ dispose: () => made.dispose() });
      const crowd = made.sectors.flatMap(s => s.crowd);
      // the crowd sways while anything renders (a never-culled, invisible helper drives it from the render loop)
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(.01, .01), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      tick.frustumCulled = false; tick.name = 'docks crowd sway'; const t0 = performance.now();
      tick.onBeforeRender = () => { const t = (performance.now() - t0) / 1000; crowd.forEach((m, j) => { m.position.y = .014 * Math.sin(t * 2.3 + j * 2.4); }); };
      c.add(tick, false, false);
      c.objects.docks = made; c.objects.crowd = crowd;
      c.objects.tune = (scene, set) => { // night in the hangar: the venue's own light rig (arena-sets.js mood.lights) on the story lights
        const L = made.mood.lights; scene.fog = new THREE.Fog(made.mood.background, made.mood.fog[0], made.mood.fog[1]); scene.background = new THREE.Color(made.mood.background);
        set.group.traverse(o => { if (o.isHemisphereLight) { o.color.setHex(L.hemi[0]); o.intensity = L.hemi[1] * 1.6; o.groundColor.setHex(L.hemi[2]); } else if (o.isAmbientLight) o.intensity = .12; });
        if (set.sun) { set.sun.color.setHex(L.fill[0]); set.sun.intensity = L.fill[1] * 1.6; } // cool moonlight through the quay door
        const lamp = new THREE.SpotLight(L.key[0], L.key[1] * 1.15, 14, .78, .55, 1.4); lamp.position.set(0, 4.2, 0); lamp.target.position.set(0, 0, 0); lamp.name = 'work lamp over the circle';
        const warm = new THREE.PointLight(L.a[0], L.a[1] * .55, 16, 1.6); warm.position.set(-1.5, 4.5, -5.5); warm.name = 'sodium bay';
        const rim = new THREE.PointLight(L.b[0], L.b[1] * .5, 18, 1.6); rim.position.set(2.5, 3, -12.5); rim.name = 'quay light';
        set.group.add(lamp, lamp.target, warm, rim);
      };
      return { x: 0, z: -3, r: 12, time: 'evening' };
    });
  }
  if (window.StorySets) register(); else window.addEventListener('DOMContentLoaded', register);
  window.DocksSets = { register };
})();
