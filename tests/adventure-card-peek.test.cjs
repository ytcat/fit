// Owner 2026-11-22 (iPhone): the place card is collapsed by default and must not cover most of the screen; Continue is enough.
// Collapsed (not .open): only the title row and the first primary story button of the quest show; the handle opens the rest.
const assert = require('assert'), fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'adventure/adventure.css'), 'utf8');
assert.ok(css.includes('.adv-card:not(.open) .sf-quest>:not(.sf-primary),.adv-card:not(.open) .sf-quest>.sf-primary~.sf-primary{display:none}'), 'collapsed quest = one Continue button');
assert.ok(css.includes('.adv-card:not(.open)>.adv-primary:not(.sf-primary),.adv-card:not(.open)>.adv-recap,.adv-card:not(.open)>.adv-goal-line{display:none}'), 'collapsed card hides Free walk, recap and goal line');
const ui = fs.readFileSync(path.join(__dirname, '..', 'adventure/adventure-ui.js'), 'utf8');
assert.match(ui, /button\('', \(\) => card\.classList\.toggle\('open'\), 'adv-handle'\)/, 'the handle still opens the full card');
assert.match(ui, /fitPeek = \(\) => \{ const t = card\.querySelector\('\.sf-quest'\)/, 'the peek height follows the (now short) quest block');
console.log('adventure-card-peek: ok');
