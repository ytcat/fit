/* A fight on the gym floor (GOTR-0083): the first fight against Brick takes place on the mat of Bruno's Gym. No ring, ropes,
 * posts, crowd or arena signage; Coach Bruno is the referee (he counts a knockdown and raises the winner's arm). The bout
 * itself, its boundary (the mat is exactly the size of the ring canvas), the cameras and the HUD are the game's own:
 * this file only swaps what is seen around the two fighters.
 *
 * fight-arena.js calls StoryGymFight.install(view) when the fight was started with { place: 'gym' } (e.fightOptions.place).
 * Everything is undone when the view is disposed: the rhino referee goes back (and is disposed by the view as usual),
 * Bruno's cached rig is detached untouched, the gym set is disposed. */
(() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const CENTRE = [1.5, 2.0]; // where the mat lies in the gym set (dream-sets.js, 'dream_gym_floor')
  function install(view) {
    const e = view.engine, arena = view.arena, Cast = window.StoryCast, Pose = window.DreamPose, Sets = window.StorySets;
    if (!Cast || !Pose || !Sets || view.gymFight) return false;
    const bruno = Cast.rig('bruno', e); if (!bruno) return false;
    const rhino = view.referee, st = { set: null, gone: false, last: null, hidden: [] };
    view.gymFight = st;
    rhino.root.visible = false;
    bruno.root.parent?.remove(bruno.root); bruno.root.scale.set(1, 1, 1); bruno.root.visible = true; view.cast.add(bruno.root); Pose.reset(bruno); // scale 1 inside the mirrored cast, like the fighters
    const hide = () => { if (view.ring) view.ring.visible = false; if (view.audience?.root) view.audience.root.visible = false; };
    hide();
    const p = V();
    view.referee = {
      root: bruno.root, isBruno: true,
      update(time, grip, side, o = {}) {
        hide();
        const dt = st.last != null && time > st.last ? Math.min(.05, time - st.last) : 0; st.last = time;
        bruno.root.updateMatrixWorld(true);
        const state = { t: time, dt, dist: 0, arms: { L: 'hips', R: 'hips' }, look: null };
        if (o.lookAt) { p.copy(o.lookAt); bruno.root.worldToLocal(p); state.look = { yaw: Math.atan2(p.x, p.z), pitch: Math.atan2(p.y - 1.9, Math.hypot(p.x, p.z)) }; }
        if (grip && grip.isVector3) {
          p.copy(grip); bruno.root.worldToLocal(p);
          if (Math.hypot(p.x, p.z) < .6 && p.y > 1.5) { const beat = time % 1; state.arms = { L: 'hips', R: 'count' }; state.reach = { R: [.3, 1.62 - .22 * Math.min(1, beat * 4) * (1 - Math.min(1, Math.max(0, beat - .25) * 3)), .34] }; state.look = { yaw: 0, pitch: -.35 }; state.lean = .12; } // the count: the arm chops down once a second
          else { const arm = p.x >= 0 ? 'R' : 'L'; state.arms = { [arm]: 'wave', [arm === 'R' ? 'L' : 'R']: 'hips' }; state.reach = { [arm]: [p.x, p.y, p.z] }; } // the winner's wrist, held high
        } else if (grip) state.arms = { L: 'open', R: 'open' }; // a draw: both palms out
        Pose.civil(bruno, state);
      }
    };
    // the room: Bruno's Gym with a sparring mat where the ring canvas would be; its own lights are dropped (the bout keeps the arena's)
    const proxy = { add: g => arena.group.add(g), remove: g => arena.group.remove(g), background: null, fog: null };
    Sets.ready().then(() => {
      if (st.gone) return; window.DreamSets?.register();
      const set = Sets.build('dream_gym_floor', proxy, { renderer: e.renderer, shadows: false }); st.set = set;
      set.group.position.set(-CENTRE[0], 0, -CENTRE[1]);
      const lights = []; set.group.traverse(o => { if (o.isLight) lights.push(o); }); for (const l of lights) l.parent.remove(l);
      set.group.add(new THREE.HemisphereLight(0xfff1dc, 0x9a7a5c, .55));
      // anything else the arena shows round the ring (venue dressing) stays outside the room's walls; hide what is inside them
      for (const o of arena.group.children) if (o !== set.group && o !== view.cast && o !== view.ring && o !== view.audience?.root && o.visible && o.userData.venueSet) { st.hidden.push(o); o.visible = false; }
    }).catch(x => console.warn('gym fight', x));
    const dispose = view.dispose;
    view.dispose = function (...args) {
      st.gone = true; view.referee = rhino; rhino.root.visible = true;
      bruno.root.parent?.remove(bruno.root); bruno.root.scale.set(-1, 1, 1); Pose.reset(bruno);
      for (const o of st.hidden) o.visible = true;
      try { st.set?.dispose(); } catch (x) { console.warn('gym fight', x); }
      view.gymFight = null; return dispose.apply(this, args);
    };
    return true;
  }
  window.StoryGymFight = { install, CENTRE };
})();
