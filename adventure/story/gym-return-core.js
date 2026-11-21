/* Chapter 1 beats 8–9: in-game film scripts. Existing mission rules and save IDs stay unchanged. */
(() => {
  const C = typeof module !== 'undefined' ? require('./dream-core.js') : window.DreamCore;
  const Story = typeof module !== 'undefined' ? require('../story.js') : window.AdventureStory;
  const B = typeof module !== 'undefined' ? require('./bag-break-core.js') : window.BagBreakCore;
  const { x, z, stand } = B.PLACE;
  const X = 1.03 * stand;
  const strikes = [
    { who: 'fighter', t: 7, dur: .56, move: 'jab', push: 1 },
    { who: 'pip', t: 8.20, dur: .61, move: 'cross', push: -1 },
    { who: 'fighter', t: 9.40, dur: .61, move: 'cross', push: 1 },
    { who: 'pip', t: 10.60, dur: .56, move: 'jab', push: -1 }
  ];
  const line = (id, i, t) => ({ t, ...Story.lines[id].intro[i], hold: true });
  const scenes = {
    dream_new_bag: {
      set: 'dream_gym', place: 'gym', chapter: 1, tap: true, playTailAfterDialogue: true, duration: 13.4, gymBag: 'new', gymStrikes: true,
      outfit: { fighter: 'kit', pip: 'kit' },
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: x + 1.7, z: z + 1.0, face: 'bruno', look: 'bruno' },
          { t: 1.4, x: x + X, z, face: [x,z] }, { t: 6.4, look: [x,1.56,z], act: 'guard' }, { t: 11.65, act: 'idle', look: 'pip' }
        ] },
        pip: { rig: 'pip', keys: [
          { t: 0, x: x - 1.4, z: z + .75, face: 'fighter', look: 'fighter' },
          { t: 1.5, x: x - X, z, face: [x,z] }, { t: 6.4, look: [x,1.56,z], act: 'guard' }, { t: 11.65, act: 'idle', look: 'fighter' }
        ] },
        bruno: { rig: 'bruno', keys: [
          { t: 0, x: x -.3, z: z - 1.35, face: 'fighter', look: 'fighter' },
          { t: 2.1, arms: { R: 'open' } }, { t: 3.7, arms: {}, look: 'pip' },
          { t: 6.4, face: [x,z], look: [x,1.55,z] }, { t: 11.65, look: 'fighter' }
        ] }
      },
      camera: [
        { t: 0, pos: [x + .30,2.32,z + 5.55], look: [x,1.37,z + .45], fov: 42 },
        { t: 2.0, cut: true, pos: [x + 3.4,2.04,z + 3.92], look: [x+.18,1.48,z+.48], fov: 41 },
        { t: 6.2, cut: true, pos: [x + .15,2.11,z + 5.15], look: [x,1.43,z], fov: 42 },
        { t: 13.4, pos: [x + .46,2.02,z + 4.86], look: [x,1.45,z], fov: 42, ease: 'smooth' }
      ],
      lines: [line('bag_drill',0,2.1), line('bag_drill',1,4.5)]
    },
    dream_offer: {
      set: 'dream_gym', place: 'gym', chapter: 1, tap: true, playTailAfterDialogue: true, duration: 9, gymBag: 'new',
      outfit: { fighter: 'kit', pip: 'kit' },
      actors: {
        fighter: { rig: 'fighter', keys: [
          { t: 0, x: .64, z: 3.2, face: 'bruno', look: 'bruno' },
          { t: 4.05, arms: { R: 'fist' } }, { t: 5.25, arms: {} },
          { t: 6.35, look: 'pip', face: 'pip' }, { t: 8.3, x: .9, z: 2.15, face: 'pip' }
        ] },
        bruno: { rig: 'bruno', keys: [
          { t: 0, x: -.70, z: 3.1, face: 'fighter', look: 'fighter' },
          { t: 1.3, arms: { R: 'open' } }, { t: 3.1, arms: {} },
          { t: 5.25, arms: { R: 'point' }, look: 'pip' }, { t: 6.55, arms: {} }
        ] },
        pip: { rig: 'pip', keys: [
          { t: 0, x: 1.16, z: 1.42, face: 'fighter', look: 'fighter' },
          { t: 6.25, arms: { R: 'open' } }, { t: 7.35, arms: {} }
        ] }
      },
      camera: [
        { t: 0, pos: [.12,2.0,7.55], look: [.08,1.45,2.84], fov: 39 },
        { t: 1.40, cut: true, pos: [1.86,1.85,5.50], look: [-.25,1.61,3.15], fov: 42 },
        { t: 4.20, cut: true, pos: [-1.78,1.82,5.34], look: [.20,1.57,3.15], fov: 43 },
        { t: 6.0, cut: true, pos: [.58,2.21,7.60], look: [.62,1.40,2.65], fov: 40 },
        { t: 9, pos: [.5,2.13,7.16], look: [.62,1.41,2.35], fov: 40, ease: 'smooth' }
      ],
      lines: [line('fight_prep',0,1.7), line('fight_prep',1,4.45)]
    }
  };
  function punch(who, t) {
    const s = strikes.find(q => q.who === who && t >= q.t && t < q.t + q.dur);
    return s && { move: s.move, phase: (t - s.t) / s.dur };
  }
  function angle(t) {
    return strikes.reduce((v, s) => {
      const d = t - s.t - B.HIT_PHASE * s.dur;
      return d <= 0 ? v : v + s.push * .15 * Math.exp(-2.6*d) * Math.sin(7.5*d);
    }, 0);
  }
  // Work in the existing rig's pendulum frame: s along the first punch, y up, w perpendicular.
  function bagPose(base, t) {
    const th = angle(t), sn = Math.sin(th), co = Math.cos(th), pivot = B.BAG.mount;
    const turn = (s, h) => [s*co - h*sn, s*sn + h*co];
    const b = base.bag, [s,y] = turn(b.s,b.y - pivot);
    return { ...base, bag: { ...b, s, y: y + pivot, th }, links: base.links.map(l => {
      const [a,b] = turn(l.p[0],l.p[1] - pivot), [c,d] = turn(l.d[0],l.d[1]);
      return { ...l, p: [a,b + pivot,l.p[2]], d: [c,d,l.d[2]] };
    }) };
  }
  const api = { scenes, strikes, punch, angle, bagPose };
  if (typeof module !== 'undefined') module.exports = api;
  else { window.GymReturnCore = api; C.register(scenes); }
})();
