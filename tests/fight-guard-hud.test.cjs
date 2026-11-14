// GOTR-0075: Guard explained where it applies, a held Guard closes the gloves to the cover, the last-seconds countdown and the
// winner line sit in the top band (never cut at an edge), score cards and result buttons are laid out away from the fighters.
// Browser evidence with measured boxes against the fighters: qa/gotr-0075/fight-browser.cjs.
const assert = require('node:assert/strict'), fs = require('fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* Guard hint copy: every place in EN / HE / RU, naming the on-screen Guard (and Duck) labels, never claiming a block where nothing hits back. */
const pad = read('fighter-pad.js'), tipsSrc = pad.slice(pad.indexOf('const GUARD_TIPS='), pad.indexOf('const guardContext='));
const TIPS = new Function(tipsSrc + ';return GUARD_TIPS;')(), keys = Object.keys(TIPS.en).sort();
for (const l of ['he', 'ru']) assert.deepEqual(Object.keys(TIPS[l]).sort(), keys, l + ' has every Guard line');
for (const l of ['en', 'he', 'ru']) {
  for (const k of ['fight', 'rabbit', 'pads', 'solo']) assert.ok(TIPS[l][k].includes('{g}'), `${l}.${k} names the Guard button as labelled`);
  assert.ok(TIPS[l].pads.includes('{r}'), l + ': mitts point to Duck (the Coach swing is ducked, not blocked)');
  assert.ok(/Burst/.test(TIPS[l].fight), l + ': Burst stays in Latin script');
}
const guardContext = new Function(pad.slice(pad.indexOf('const guardContext='), pad.indexOf('const CHEVRON=')) + ';return guardContext;')();
assert.deepEqual(['fight', 'rabbit', 'pads', 'heavy', 'none', 'speed', 'dummy'].map(guardContext), ['fight', 'rabbit', 'pads', 'solo', 'solo', 'solo', 'solo']);
assert.ok(/hit\.receiver===view\.match\.playerActor&&hit\.blocked/.test(pad), 'fight: Blocked feedback only for punches the player blocked');
assert.ok(/e\.targetMode==='fight'&&e\.arena\?\.fightView\?\.match\?\.result/.test(pad), 'the pad is put away once the bout has a result');
console.log('PASS Guard hint per place in EN/HE/RU and Blocked feedback wiring');

/* A held Guard (an ordered guard of the player, id > 0) closes both gloves to the blocking cover, eased so repeats never flicker. */
const arena = read('fight-arena.js');
assert.ok(/actor===m\.playerActor&&spec\.move==='guard'&&spec\.defend&&spec\.id>0/.test(arena), 'fight: only the player\'s ordered guard, not the idle stance');
assert.ok(/options\.blockCover=Math\.max\(options\.blockCover\|\|0,c\.v\)/.test(arena), 'fight: never weakens the automatic threat cover');
assert.ok(/isHero\)\{const want=manual&&spec\.move==='guard'&&spec\.defend&&!spec\.rest/.test(read('training-arena.js')), 'stations: the Fighter\'s held Guard covers too');
// the easing used by both: 60 ms time constant, at least 35 % on the first frame, stays closed across repeated orders
let v = 0; const ease = (want, dt) => { v += (want - v) * (1 - Math.exp(-dt / .06)); if (want && v < .35) v = .35; return v; };
assert.ok(ease(1, .016) >= .35); for (let i = 0; i < 12; i++) ease(1, .016); assert.ok(v > .9, 'closed within ~0.2 s'); ease(1, .016); assert.ok(v > .9, 'a repeated order keeps it closed');
for (let i = 0; i < 20; i++) ease(0, .016); assert.ok(v < .01, 'opens again after release');
console.log('PASS held Guard cover pose wiring and easing');

/* Countdown and winner line: centred in the free part of the top band, never with left:auto + translateX(-50%) (the cut). */
const hud = read('stage-hud.css'), tail = hud.slice(hud.indexOf('GOTR-0075'));
const rule = sel => { const i = tail.indexOf(sel + '{'); assert.ok(i >= 0, sel); return tail.slice(i, tail.indexOf('}', i)); };
const cd = rule('#stageContainer .bout-announcement[data-kind=countdown]');
assert.ok(/left:var\(--hud-band-mid\)!important/.test(cd) && /transform:translateX\(-50%\)!important/.test(cd) && /top:calc\(var\(--hud-status-top\) \+ 26px\)!important/.test(cd), 'countdown under the round bar, positioned from its centre');
assert.ok(/max-width:calc\(100% - 184px\)!important/.test(cd), 'never reaches the edge tools or the stage edge');
assert.ok(/--hud-band-mid:calc\(50% - 80px\)/.test(tail) && /\[dir=rtl\] #stageContainer[^{]*\{--hud-band-mid:calc\(50% \+ 80px\)/.test(tail), 'mirrored in RTL');
assert.ok(/\.game-enabled #stageContainer \.bout-announcement\[data-kind=winner\]:not\(\[hidden\]\):not\(\[data-kind=countdown\]\)\{top:calc\(var\(--hud-status-top\) \+ 26px\)!important/.test(tail), 'winner line beats the older centre rule');
assert.ok(/#fightResults \.fight-card-grid\{position:absolute;top:calc\(var\(--hud-status-top\) \+ (\d+)px\)/.test(tail) && +tail.match(/#fightResults \.fight-card-grid\{position:absolute;top:calc\(var\(--hud-status-top\) \+ (\d+)px\)/)[1] >= 54, 'score cards under the (two-line) winner line, above the heads');
assert.ok(/#fightResults \.fight-result-actions\{position:absolute;[^}]*bottom:/.test(tail), 'result buttons in the bottom band');
assert.ok(/body\.fight-over #manualControls/.test(tail), 'the old move panel does not return after the bout');
console.log('PASS countdown, winner line, score cards and result buttons placed by the GOTR-0075 rules');
