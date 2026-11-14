/* Ringless fights (GOTR-0065). "A street fight doesn't have a ring, and neither does an underground fight."
 * In the Street, the Basement and the Dockside Hangar the bout is staged on the venue's own floor: the built set
 * (arena-sets.js, mood.ring===false) brings the ground marks, the close circle of standing people and the props; this
 * file hides the ring hardware (canvas, apron, posts, ropes, corner pads, steps: the whole ring group) and the referee,
 * and dresses both fighters for the place (street clothes or track pants and hand wraps, bare hands: no gloves).
 * The bout itself is untouched: the same invisible limits keep the fighters inside the painted circle, the count of a
 * knockdown is shown in the HUD, the cast stays mirrored (scale.x = -1). Everything is undone when the venue goes or
 * the fight view is disposed.
 *
 * game-venues.js calls RinglessVenues.sync(engine, set) once per rendered frame while a built set is shown, and
 * RinglessVenues.release(engine) when the set is taken down. */
(() => {
 // Outfit per place (story-core.js OUTFIT rule): street -> street clothes; docks and the basement fight night -> track pants and wraps.
 const PLACES = Object.freeze({ street: Object.freeze({ outfit: 'street' }), underground: Object.freeze({ outfit: 'track_wraps' }), docks: Object.freeze({ outfit: 'track_wraps' }) });
 const isRingless = id => Object.prototype.hasOwnProperty.call(PLACES, id);
 const outfitFor = id => isRingless(id) ? PLACES[id].outfit : 'kit';
 const rigs = view => [...new Set(Object.values(view.coaches || {}))].filter(c => c && c.root && c.joints);
 // Anything left on the hands that is not the outfit's own (Shop gloves re-shown after the outfit, a training mitt).
 function handGear(c) { const out = []; for (const s of ['L', 'R']) for (const o of c.joints['hand' + s]?.children || []) if (!o.isBone && !o.userData.storyPart) out.push(o); return out; }
 function install(view, id) {
  if (!view || !view.ring || !isRingless(id) || view.gymFight) return false;
  if (view.ringless) { if (view.ringless.id === id) { enforce(view); return false; } uninstall(view); }
  const st = { id, ring: view.ring.visible, referee: view.referee.root.visible, dressed: [], hidden: new Map() };
  view.ringless = st;
  const Cast = window.StoryCast, wear = outfitFor(id);
  if (Cast?.outfit) for (const c of rigs(view)) {
   if (!c.skin || c.cast) continue; // story characters (Brick) keep their own look
   const before = Cast.outfitOf(c), tint = String(c.storyCast?.key || '').split('|')[1] || '';
   try { if (Cast.outfit(c, wear)) st.dressed.push({ c, before, tint }); } catch (x) { console.warn('ringless', x); }
  }
  const dispose = view.dispose; st.dispose = dispose;
  view.dispose = function (...args) { uninstall(this); return dispose.apply(this, args); };
  enforce(view);
  view.engine && (view.engine.lastRenderStamp = null);
  return true;
 }
 // Re-applied every frame: the fight view sets every ring part visible each pose, and Shop gear may be re-applied on top.
 function enforce(view) {
  const st = view.ringless; if (!st) return;
  view.ring.visible = false;
  if (view.referee?.root && !view.referee.isBruno) view.referee.root.visible = false;
  for (const { c } of st.dressed) for (const o of handGear(c)) if (o.visible) { if (!st.hidden.has(o)) st.hidden.set(o, true); o.visible = false; }
 }
 function uninstall(view) {
  const st = view?.ringless; if (!st) return;
  view.ringless = null;
  if (st.dispose && view.dispose !== st.dispose) view.dispose = st.dispose;
  view.ring.visible = st.ring;
  if (view.referee?.root && !view.referee.isBruno) view.referee.root.visible = st.referee;
  for (const [o, v] of st.hidden) o.visible = v;
  const Cast = window.StoryCast;
  for (const d of st.dressed) { try { Cast?.outfit(d.c, d.before || 'kit', d.tint ? { tint: d.tint } : {}); } catch (x) { console.warn('ringless', x); } }
  view.engine && (view.engine.lastRenderStamp = null);
 }
 function sync(engine, set) {
  const view = engine?.arena?.fightView; if (!view) return false;
  const want = set && set.mood?.ring === false ? set.id : null;
  if (want) return install(view, want) || !!view.ringless;
  if (view.ringless) uninstall(view);
  return false;
 }
 function release(engine) { const view = engine?.arena?.fightView; if (view?.ringless) uninstall(view); }
 const api = Object.freeze({ ids: Object.freeze(Object.keys(PLACES)), isRingless, outfitFor, install, uninstall, enforce, sync, release });
 if (typeof module !== 'undefined') module.exports = api;
 if (typeof window !== 'undefined') window.RinglessVenues = api;
})();
