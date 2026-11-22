// Film drawing cost (2026-11-22, qa/perf/films.json): every story film drew all of its characters at full detail all the time
// (each story rig 0.25-0.5 M triangles; Fight Night 2.1 M a frame on average). Now: characters outside the shot are not drawn, and
// bodies below extreme close-up use the unsubdivided body triangles (same vertices and streams, a quarter of the triangles); the
// gym-fight referee likewise. The full surface is restored when the film ends (the fight and the game use it).
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const coach = read('boxing-coach-v2.js'), scenes = read('adventure/story/dream-scenes.js'), gym = read('adventure/story/gym-fight.js');
assert.match(scenes, /if \(!cullFr\.intersectsSphere\(cullS\)\) c\.root\.visible = false;/, 'off-screen characters are not drawn');
// v1.86: no body is ever re-indexed (the v1.84 light-body index swap made the Fighter's body vanish on an iPhone after a film)
for (const [f, src] of [['dream-scenes.js', scenes], ['gym-fight.js', gym]]) assert.ok(!/setIndex|userData\.lod/.test(src), f + ' must not swap a body index');
assert.ok(!/userData\.lod/.test(coach), 'no light index built on the body');
const perf = JSON.parse(read('qa/perf/films.json'));
for (const r of perf.rows) assert.ok(r.mean < 1.8e6, `${r.id} draws ${r.mean} triangles on average`);
console.log('film-performance: ok');
