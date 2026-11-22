// Film drawing cost (2026-11-22, qa/perf/films.json): every story film drew all of its characters at full detail all the time
// (each story rig 0.25-0.5 M triangles; Fight Night 2.1 M a frame on average). Now: characters outside the shot are not drawn, and
// bodies below extreme close-up use the unsubdivided body triangles (same vertices and streams, a quarter of the triangles); the
// gym-fight referee likewise. The full surface is restored when the film ends (the fight and the game use it).
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const coach = read('boxing-coach-v2.js'), scenes = read('adventure/story/dream-scenes.js'), gym = read('adventure/story/gym-fight.js');
assert.match(coach, /const baseIndex=refine&&data\.normal\?data\.index\.slice\(\):null;/);
assert.match(coach, /if\(baseIndex\)g\.userData\.lod=\{lo:new THREE\.BufferAttribute\(Uint32Array\.from\(baseIndex\),1\),hi:null\};/);
assert.match(scenes, /if \(!cullFr\.intersectsSphere\(cullS\)\) c\.root\.visible = false;/, 'off-screen characters are not drawn');
assert.match(scenes, /want = share < \(window\.__lodShare \?\? ([\d.]+)\) \? L\.lo : L\.hi;/);
assert.match(scenes, /for \(const c of lodRigs\) \{ const g = c\.skin\?\.geometry, L = g\?\.userData\?\.lod; if \(L\?\.hi && g\.index !== L\.hi\) g\.setIndex\(L\.hi\); \}/, 'full surfaces restored when the film ends');
assert.match(gym, /if \(bLod\?\.lo\) bruno\.skin\.geometry\.setIndex\(bLod\.lo\);/); assert.match(gym, /if \(bLod\?\.lo && bIdx\) bruno\.skin\.geometry\.setIndex\(bIdx\);/);
// the low index uses only existing vertices of the full mesh (midpoints are appended after the base vertices)
{ global.THREE = require('../assets/vendor/three.min.js'); const src = coach.slice(coach.indexOf('  function meshFrom(data,refine=false) {'), coach.indexOf('  // Joined, smooth leather volumes'));
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), meshFrom = new Function('THREE', 'V', src + '; return meshFrom;')(THREE, V);
  const g = meshFrom({ position: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], normal: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], index: [0, 1, 2, 0, 2, 3] }, true);
  assert.strictEqual(g.index.count, 6 * 4); assert.strictEqual(g.userData.lod.lo.count, 6); assert.ok(Math.max(...g.userData.lod.lo.array) < 4); }
const perf = JSON.parse(read('qa/perf/films.json'));
for (const r of perf.rows) assert.ok(r.mean < 1.1e6, `${r.id} draws ${r.mean} triangles on average`);
console.log('film-performance: ok');
