// Chapter 1 rematch with Brick on fight night in Bruno's Gym (owner: the film and the fight in the same place). The boss bout runs in
// gym-fight.js ring mode: the game's ring stays, the gym is built round it without its practice ring, Bruno referees, Mrs. Hazel, Otto
// and Mack watch from ringside; the club hall and its stand crowd stay hidden from the first frame; ring corners for the break.
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const town = read('adventure/oldtown.js'), gym = read('adventure/story/gym-fight.js'), sets = read('adventure/story/dream-sets.js'), arena = read('fight-arena.js'), corner = read('fight-corner.js');
assert.match(town, /brick: \{ chapter: 1, name: L\('Brick', 'בריק', 'Брик'\), power: 1\.08, tempo: 1\.03, skill: \.04, place: 'gym_ring' \}/);
assert.match(town, /restSeconds: 8, \.\.\.\(cfg\.place \? \{ place: cfg\.place \} : \{\}\) \}\);/);
assert.match(town, /DEFS\[run\.id\]\?\.imp\?\.\(run, hit\)/, 'boss bouts have no step definition: no warning on every hit');
assert.match(arena, /gymPlace==='gym'\|\|gymPlace==='gym_ring'/); assert.match(arena, /install\(this,gymPlace==='gym_ring'\?'ring':'floor'\)/);
assert.match(corner, /\(!!v\.gymFight&&!v\.gymFight\.ring\)/, 'the gym ring keeps ring corners');
assert.match(sets, /Sets\.register\('dream_gym_ring', gym\('ring'\)\)/); assert.match(sets, /if \(floorFight !== 'ring'\) \{/); assert.match(sets, /if \(floorFight === true\) \{ \/\/ the sparring mat/);
assert.match(gym, /function install\(view, mode = 'floor'\)/); assert.match(gym, /Sets\.build\(ring \? 'dream_gym_ring' : 'dream_gym_floor'/);
assert.match(gym, /const WATCHERS = \[\{ id: 'hazel'/); assert.match(gym, /pin\(e\.world\?\.arena, \(\) => false\); pin\(view\.audience\?\.root, \(\) => false\);/);
assert.match(gym, /for \(const o of pinned\) \{ delete o\.visible; o\.visible = true; \}/, 'everything pinned is released on dispose');
// the neighbours stand outside the intro fly-around and the ropes
for (const m of gym.matchAll(/\{ id: '(\w+)', x: (-?[\d.]+), z: (-?[\d.]+) \}/g)) assert.ok(Math.hypot(+m[2], +m[3]) > 3.2, m[1] + ' too close to the ring');
console.log('gym-ring-rematch: ok');
