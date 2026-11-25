// qa/avatar-joins/poses.js — the character variants and the pose set of the avatar-joins audit, shared by the Node audit
// (cast.cjs) and the browser close-up studio (studio.cjs). Browser: window.AJ; Node: module.exports.
(function (G) {
  const VARIANTS = {
    // the player's Fighter (both species) in each outfit; Mack is the rabbit rig in the kit
    'lion-kit': { species: 'lion', sets: ['box', 'civil'] },
    'rabbit-kit': { species: 'rabbit', sets: ['box', 'civil'] },
    'lion-street': { species: 'lion', outfit: 'street', sets: ['box', 'civil'] },
    'rabbit-street': { species: 'rabbit', outfit: 'street', sets: ['box', 'civil'] },
    'lion-wraps': { species: 'lion', outfit: 'track_wraps', sets: ['box', 'civil'] },
    'rabbit-wraps': { species: 'rabbit', outfit: 'track_wraps', sets: ['box'] },
    bruno: { cast: 'bruno', sets: ['civil', 'ref'] },
    brick: { cast: 'brick', sets: ['box', 'civil'] },
    'fang-jacket': { cast: 'fang', wear: 'jacket', sets: ['civil'] },
    'fang-fight': { cast: 'fang', wear: 'fight', sets: ['box'] },
    hazel: { cast: 'hazel', sets: ['civil'] },
    otto: { cast: 'otto', sets: ['civil'] },
    rourke: { cast: 'rourke', sets: ['box', 'civil'] }
  };
  /** Builds a variant. data: the rig surface data; engine: { roster: { data } } (or the game's engine). */
  function make(name, data, engine) {
    const v = VARIANTS[name], W = G;
    if (v.cast) { const c = W.StoryCast.rig(v.cast, engine); if (v.wear) W.StoryCast.market.wear(c, v.wear); return c; }
    const c = new W.LionCoach(data, { species: v.species }); if (v.outfit) W.StoryCast.outfit(c, v.outfit); return c;
  }
  const box = (move, phase, o = {}) => c => c.update(phase * 1.22, move, 'one_two', { simulationTime: phase * 1.22, ...o });
  const civ = st => c => { const D = G.DreamPose; if (!D.GESTURES.__up) D.GESTURES.__up = { h: [.26, 2.12, .12], pole: [.6, -.2, -.6], palm: [0, 0, 1], turn: .4 }; D.reset(c); return D.civil(c, { t: 1, dist: 0, ...st }); };
  const POSES = {
    box: {
      guard: box('guard', 0), jab: box('jab', .40), cross: box('cross', .42), hook: box('hook', .45), rear_hook: box('rear_hook', .45),
      uppercut: box('uppercut', .42), rear_uppercut: box('rear_uppercut', .42), slip: box('slip', .40), roll: box('roll', .45), step: box('step', .4),
      block: box('guard', 0, { guardCover: 1, cheekGuard: 1 }), hit_head: box('guard', 0, { hitReaction: { part: 'head', amount: 1, side: 1 } }),
      hit_body: box('guard', 0, { hitReaction: { part: 'body', amount: 1, side: -1 } }), down: box('guard', 0, { down: 1, hitReaction: { part: 'head', amount: .6, side: 1 } })
    },
    civil: {
      idle: civ({}), talk: civ({ t: 2.3, arms: { L: 'open', R: 'open' }, talk: .6 }), walkA: civ({ t: .3, dist: .45, walk: 1 }), walkB: civ({ t: .7, dist: 1.05, walk: 1 }),
      jog: civ({ t: .5, dist: .9, walk: 1, speed: 3.2 }), arms_up: civ({ arms: { L: '__up', R: '__up' } }), wave: civ({ arms: { R: 'wave' } }), carry: civ({ arms: { L: 'carry', R: 'carry' } }),
      mop: civ({ arms: { L: 'pole', R: 'pole' }, lean: .25 }), point: civ({ arms: { R: 'point' } }), cross_arms: civ({ arms: { L: 'cross', R: 'cross2' } }), chin: civ({ arms: { R: 'chin' } }),
      strap: civ({ arms: { R: 'strap' } }), bend: civ({ lean: .45, drop: .12, arms: { L: 'carry', R: 'carry' } })
    },
    ref: { count: civ({ arms: { R: 'count' } }), raise: civ({ arms: { L: '__up' } }) }
  };
  function posesFor(name) { const out = {}; for (const s of VARIANTS[name].sets) Object.assign(out, POSES[s]); return out; }
  const api = { VARIANTS, POSES, posesFor, make };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else G.AJ = api;
})(typeof window !== 'undefined' ? window : globalThis);
