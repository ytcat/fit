// Owner 2026-11-23: the logo and "Glory of the Ring" are one locked square picture that never wraps (a long player name or large
// numbers in the ribbon squeezed the title into three lines). The square carries the name; the version sits on its lower edge;
// on phones the logo column keeps its size and the ribbon shrinks instead.
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const svg = read('assets/brand/logo-square.svg');
assert.match(svg, /viewBox="0 0 96 96"/); assert.match(svg, />GLORY</); assert.match(svg, />OF THE RING</);
const js = read('club-interface.js');
assert.match(js, /logo-square\.svg\?v=\d+/, 'the header uses the square logo');
assert.match(js, /brand\.classList\.add\('club-brand-square'\)/);
assert.match(js, /ver\.textContent='v'\+APP_VERSION\.number/, 'the version is shown on the logo');
const css = read('club-interface.css');
assert.match(css, /\.club-app \.club-brand-square #appTitle,\.club-app \.club-brand-square #appSubtitle\{position:absolute!important;width:1px;height:1px;overflow:hidden/, 'title text only for screen readers');
assert.match(css, /\.game-enabled\.club-app \.club-header\{grid-template-columns:auto minmax\(0,1fr\)!important\}/, 'phones: the logo column keeps its size');
assert.match(css, /\.game-enabled\.club-app \.club-head-tools\{min-width:0;justify-content:flex-end;overflow:hidden\}/, 'phones: the ribbon shrinks instead');
const m = JSON.parse(read('offline-manifest.json')).urls.join(' '); assert.ok(m.includes('logo-square.svg'), 'square logo in the offline pack');
console.log('header-logo: ok');
