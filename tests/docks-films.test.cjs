// Chapter 1 films 11-12 (docs/adventure/FILMS.md): the Docks before and after the bare-knuckle fight, fight night before the
// rematch with Brick and the chapter ending. Scene data, story wiring, the Docks set (lane through the crowd, cash on the drum).
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require('../adventure/story/dream-core.js'), D = require('../adventure/story/docks-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// every scene and variant validates; every line has EN, HE and RU; durations cover the last line
const all = { ...D.scenes, docks_loss: D.variants.dream_docks_after.loss, night_won: D.variants.dream_fight_night.won };
for (const [id, s] of Object.entries(all)) {
  assert.deepStrictEqual(C.validate(s), [], id + ' invalid');
  for (const l of s.lines) for (const k of ['en', 'he', 'ru']) assert.ok(String(l.text[k] || '').trim(), `${id} line at ${l.t} lacks ${k}`);
  assert.ok(s.lines[s.lines.length - 1].t < s.duration, id + ' ends before its last line');
  for (const a of Object.values(s.actors)) assert.ok(C.RIGS.includes(a.rig), `${id}: rig ${a.rig} not in DreamCore.RIGS`);
}
assert.ok(C.RIGS.includes('rourke'));
// outfits follow the place (owner's rule): track pants and wraps at the Docks, the kit in the gym
for (const id of ['dream_docks', 'dream_docks_after']) assert.strictEqual(D.scenes[id].outfit.fighter, 'track_wraps');
for (const id of ['dream_fight_night', 'dream_chapter_end']) assert.strictEqual(D.scenes[id].outfit.fighter, 'kit');
// Rourke is the speaker 'hook' (adventure/story.js who.hook) played by the rig 'rourke'
assert.strictEqual(D.scenes.dream_docks.actors.hook.rig, 'rourke');
// the purse names the real prize (game-domain.js storyRewards.docks_fight)
const prize = +read('game-domain.js').match(/docks_fight:(\d+)/)[1];
assert.ok(D.scenes.dream_docks_after.lines[0].text.en.includes(String(prize)), 'purse line must name ' + prize);

// Docks cameras stay inside the crowd ring (arena-sets.js docks crowd: inner radius 3.1, jitter 0.16), except the entrance shots
for (const s of [D.scenes.dream_docks, D.variants.dream_docks_after.win, D.variants.dream_docks_after.loss])
  for (const k of s.camera) assert.ok(Math.hypot(k.pos[0], k.pos[2]) < 2.75, `camera at ${k.t}s stands in the crowd (${k.pos})`);
// they end inside the circle, Rourke waits in it
const end = C.sample(D.scenes.dream_docks, D.scenes.dream_docks.duration - .01).actors;
for (const k of ['fighter', 'bruno', 'hook']) assert.ok(Math.hypot(end[k].x, end[k].z) < 2.6, k + ' must end inside the circle');

// the Docks set: the hangar of the fight, a lane through the crowd from the quay door, banded notes on the drum
const arena = read('arena-sets.js');
assert.match(arena, /\(z<0&&Math\.abs\(x-\.15\)<\.62\)/, 'lane through the crowd');
assert.match(arena, /cash on a barrel/);
const sets = read('adventure/story/docks-sets.js');
assert.match(sets, /ArenaSets\.build\('docks'/); assert.match(sets, /objects\.tune/);
assert.match(read('adventure/story/dream-scenes.js'), /set\.objects\.tune\(scene, set\)/);

// story wiring: the step films and the after films
const flow = read('adventure/story-flow.js'), town = read('adventure/oldtown.js');
assert.match(flow, /beat: 10, scene: 'dream_docks'/); assert.match(flow, /beat: 12, scene: 'dream_fight_night'/);
assert.match(town, /docks_fight: \{ kind: 'story_fight', venue: 'docks', cast: 'rourke', after: 'dream_docks_after'/);
assert.match(town, /BOSS_SCENE = \{ brick: \[null, 'dream_chapter_end'\]/);
assert.match(town, /\(S\.sceneIds \|\| \[\]\)\.includes\(s\.scene\)/, 'an unregistered film must fall back to the lines');
assert.match(town, /outcome: SF\(\)\.firstBrick\(g\) \|\| undefined/, 'fight night picks the variant for a won first fight');
// both files load, after the modules they need
const html = read('index.html'), at = f => html.indexOf(f);
assert.ok(at('docks-core.js') > at('dream-core.js') && at('docks-core.js') > 0);
assert.ok(at('docks-sets.js') > at('story-sets.js') && at('docks-sets.js') > at('arena-sets.js'));
const manifest = JSON.parse(read('offline-manifest.json')).urls.join(' ');
for (const f of ['docks-core.js', 'docks-sets.js']) assert.ok(manifest.includes(f), 'offline manifest lacks ' + f);
console.log('docks-films: ok', Object.keys(all).length, 'scenes');
