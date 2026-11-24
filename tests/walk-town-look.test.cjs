// Free walk look (GOTR-0125, owner 2026-11-25: "the graphics are terrible ... blurry ... doesn't look like in the video"):
// the films' street at the story places, the films' light, a sharp picture. Static and pure checks (the pictures and numbers
// are in qa/walk-town-look/).
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const src = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
global.window = global; global.THREE = require('../assets/vendor/three.min.js');
global.document = { createElement: () => ({ getContext: () => null }) };
require('../adventure/free-walk/free-walk-look.js'); require('../adventure/free-walk/free-walk-sets.js');
const Look = global.FreeWalkLook, Sets = global.FreeWalkSets;
const HE = /[֐-׿]/, RU = /[Ѐ-ӿ]/;

/* ---- every sign of the walk's sets reads in EN / HE / RU (owner rule 2026-11-23) */
{
  const s = src('adventure/free-walk/free-walk-sets.js'), texts = new Set([...s.matchAll(/board\(c, X\.lang, ("[^"]+"|'[^']+')/g)].map(m => m[1].slice(1, -1)));
  for (const t of Object.values({ a: 'CORNER COFFEE', b: 'BAKERY' })) texts.add(t);
  assert.ok(texts.size >= 7, 'sign texts found: ' + [...texts]);
  for (const t of texts) { assert.ok(HE.test(Sets.WORDS[t]?.he || ''), `${t}: he`); assert.ok(RU.test(Sets.WORDS[t]?.ru || ''), `${t}: ru`); }
  // the films' words are the same words (dream-sets.js, market-sets.js)
  assert.ok(src('adventure/story/dream-sets.js').includes(Sets.WORDS["BRUNO'S GYM"].he), "Bruno's Gym: the films' Hebrew");
  assert.ok(src('adventure/story/market-sets.js').includes(Sets.WORDS["OTTO'S CORNER"].ru), "Otto's Corner: the films' Russian");
  for (const f of ['adventure/free-walk/free-walk-look.js', 'adventure/free-walk/free-walk-sets.js']) assert.ok(!/dir\s*=\s*['"]rtl|setAttribute\('dir', 'rtl'/.test(src(f)), `${f}: no right-to-left layout`);
  assert.ok(/LETTERING = \/\^\(enamel lettering\|shop lettering and brass\)\$\//.test(s) && /if \(lang === 'en'\) return;/.test(s), 'modelled English lettering is replaced in Hebrew and Russian');
}

/* ---- what the map leaves out for the sets (map units; the piece goes to a throwaway batch) */
{
  const b = { kind: 'homegym', x: 53.2, z: -43.42, w: 9.5, d: 8.5, ang: -.02 }, W = { oldtown: [b], marketFrame: { o: [17, -24], U: [Math.cos(.06), Math.sin(.06)], Wv: [-Math.sin(.06), Math.cos(.06)] } };
  const at = (lx, lz) => { const c = Math.cos(b.ang), s = Math.sin(b.ang); return [b.x + (lx * c + lz * s) / 3, b.z + (-lx * s + lz * c) / 3]; };
  assert.equal(Sets.skip(0, 0, 'homegym', null, W), true, 'the map gym (and its awning, posts and HOME GYM letters) is left out');
  assert.equal(Sets.skip(...at(-2.85, 6), 'building', null, W), true, 'row houses on the gym street are left out');
  assert.equal(Sets.skip(...at(-2.85, -6.2), 'building', null, W), false, 'the row behind stays');
  const mf = W.marketFrame, mk = (u, w) => [mf.o[0] + mf.U[0] * u + mf.Wv[0] * w, mf.o[1] + mf.U[1] * u + mf.Wv[1] * w];
  assert.equal(Sets.skip(...mk(22, -1.55), 'stall', { u: 22, w: -1.55 }, W), true, "Hazel's stretch of stalls is the films'");
  assert.equal(Sets.skip(...mk(8, -1.55), 'stall', { u: 8, w: -1.55 }, W), false, 'the rest of Market Row keeps the map stalls');
  assert.equal(Sets.skip(...mk(44, 7.75), 'building', null, W), true, "Otto's building is the films' shop");
  assert.equal(Sets.skip(...mk(40, 7.75), 'building', null, W), false, "Otto's neighbours stay");
  assert.equal(Sets.skip(10, 10, 'building', null, W), false, 'elsewhere nothing is left out');
}

/* ---- the map's skip option keeps the random sequence: a left-out piece is still generated, into a throwaway W */
{
  const m = src('adventure/gloryland-map.js');
  assert.match(m, /function sinkOf\(W\)/); assert.match(m, /function building\(W, o\) \{\n  W = outFor\(W, o\.x, o\.z, 'building', o\);/);
  assert.match(m, /D = outFor\(W, x, z, 'homegym', null\)/); assert.match(m, /const T = outFor\(W, x, z, 'stall', \{ u, w \}\);/);
  assert.match(m, /sign\(D, \{ text: 'HOME GYM'/, 'the HOME GYM letters go with the map gym');
}

/* ---- the picture: sharp (pixel ratio up to 2), a ladder that gives detail back only when slow, the films' light */
{
  const L = Look.LEVELS; assert.ok(L.length >= 3);
  for (let i = 1; i < L.length; i++) assert.ok(L[i][0] >= L[i - 1][0] && L[i][1] >= L[i - 1][1], 'each level up costs more');
  for (let i = 1; i < L.length; i++) assert.ok(L[i][2] <= L[i - 1][2], 'each level up refreshes the shadow at least as often');
  // no shader changes while walking: a ladder step only sets the pixel ratio and the shadow map size / refresh
  const look = src('adventure/free-walk/free-walk-look.js'), set = look.slice(look.indexOf('function set(level)'), look.indexOf('set(look.locked ?? top);'));
  assert.ok(!/sm\.enabled\s*=|castShadow\s*=|rlook\?\.high|rebuild\(\)/.test(set), 'a ladder step rebuilds no program');
  assert.equal(L[L.length - 1][0], 2, 'the top level draws at up to 2x (iPhone 3x screens: two thirds of native, not a third)');
  assert.ok(L[0][0] >= 1.25, 'even the floor draws above the engine minimum');
  for (const t of ['morning', 'evening']) { const l = Look.LIGHTS[t]; assert.ok(l.hemi && l.sun && l.sky && l.fog && l.look, t); }
  // the same light as the films (story-sets.js): morning sun 0xffd7a3 x 2.05 from (.58,.44,.68), evening 0xff9450 x 1.85
  assert.equal(Look.LIGHTS.morning.sun[0], 0xffd7a3); assert.equal(Look.LIGHTS.morning.sun[1], 2.05); assert.deepEqual(Look.LIGHTS.morning.dir, [.58, .44, .68]);
  assert.equal(Look.LIGHTS.evening.sun[0], 0xff9450); assert.equal(Look.LIGHTS.evening.sun[1], 1.85);
  assert.match(src('adventure/story/story-sets.js'), /0xff9450 : 0xffd7a3, evening \? 1\.85 : 2\.05/, "the films' sun");
  for (const st of ['plaster', 'brick', 'apartment', 'shop', 'office', 'deco']) { const w = Look.WIN[st]; assert.ok(w[0] < w[2] && w[1] < w[3] && w[4] > .1, st); }
}

/* ---- geometry helpers: tiles keep every triangle; clip takes out only what stands in the footprint above the pavement */
{
  const T = THREE, g = new T.Group(); g.scale.setScalar(3);
  const tri = []; for (let i = 0; i < 3000; i++) { const x = (i % 60) * 2, z = Math.floor(i / 60) * 2; tri.push(x, 1, z, x + 1, 1, z, x, 2, z); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(tri, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(tri.map(() => 0), 3));
  const m = new T.Mesh(geo, new T.MeshBasicMaterial()); m.name = 'solid'; m.matrixAutoUpdate = false; m.updateMatrix(); g.add(m);
  const made = Look.tile(g, 96); let n = 0; for (const t of made) n += t.geometry.attributes.position.count / 3;
  assert.ok(made.length > 1 && n === 3000 && made.every(t => t.name === 'solid'), 'tiles keep every triangle and the name');
  const r = Look.clip(g, [{ x: 30, z: 30, ry: 0, hw: 10, hd: 10 }], 2); let left = 0; for (const t of g.children) left += t.geometry.attributes.position.count / 3;
  assert.ok(r.tris > 0 && left === 3000 - r.tris, 'clip removes inside the footprint');
  const low = Look.clip(g, [{ x: 150, z: 150, ry: 0, hw: 10, hd: 10 }], 100); assert.equal(low.tris, 0, 'below yMin (the pavement) nothing goes');
}

/* ---- no first-time work while walking: everything compiled, uploaded and allocated behind the loading cover; walkers pooled;
 * the same town parked between opens in a session */
{
  const t = src('adventure/free-walk/free-walk-town.js');
  assert.match(t, /renderer\.initTexture/); assert.match(t, /renderer\.setViewport\(0, 0, 1, 1\)/);
  assert.match(t, /if \(!opts\.defer\) ms\.warm = warm\(\)/, 'a caller without ready() still gets the whole warm-up');
  // the first open (GOTR-0125 round 3): the warm-up in slices behind the cover, one object per program, the GPU awaited with
  // a fence polled without blocking (the page and the cover's progress stay alive), everything drawn once at the end
  const rd = t.slice(t.indexOf('function ready('), t.indexOf('if (!opts.defer)'));
  assert.match(rd, /representatives\(\)/); assert.match(rd, /compileAll\(\)/); assert.match(t, /renderer\.compile\(scene, cam\)/); assert.match(rd, /slice\(reps\.slice\(i, i \+ PER\), false\)/); assert.match(rd, /slice\(null, true\)/); assert.match(rd, /if \(!alive\(\)\) return false/);
  assert.match(t, /gl\.fenceSync\(gl\.SYNC_GPU_COMMANDS_COMPLETE, 0\)/); assert.match(t, /gl\.clientWaitSync\(f, 0, 0\)/, 'the fence is polled, never waited on');
  assert.match(t, /cam\.layers\.set\(WARM_LAYER\)/, 'a slice picks its objects by layer (every light stays: the programs are the walk\'s)');
  const fw = src('adventure/free-walk/free-walk.js');
  assert.match(fw, /defer: true \}\);/); assert.match(fw, /await town\.ready\?\.\(f => say\(\.4 \+ f \* \.6\), \(\) => !R\.closed\)/);
  assert.match(fw, /notice\.textContent = t\('loading'\) \+ ' ' \+ Math\.round\(f \* 100\) \+ '%'/, 'the cover shows how far the loading got (digits: every language)');
  assert.match(fw, /e\.fightIQDemo = R\.hold = \{ frame\(\) \{\} \}/); assert.match(fw, /R\.hold && e\.fightIQDemo === R\.hold\)\) e\.fightIQDemo = null/, 'the arena is not drawn behind the cover, and the engine gets its frame back on close'); assert.ok(!/SL\.walker\(/.test(t.slice(t.indexOf('function spawnWalker'), t.indexOf('function updateWalkers'))), 'no walker is made while walking');
  // the chase camera keeps out of market umbrellas and the sets' awnings / stall roofs (story-walk note): they are in the crown map
  assert.match(t, /umbrellas: \[\.66, 1\.1\]/); assert.match(t, /o\.name !== 'overhead'/);
  assert.match(t, /function park\(\)/); assert.match(t, /function resume\(defer\)/); assert.match(t, /PARK_MS = 180000/);
}

/* ---- wiring: scripts in order with matching versions; the map's ?v everywhere the same; the models stay out of the offline pack */
{
  const html = src('index.html'), order = ['free-walk-core', 'free-walk-look', 'free-walk-sets', 'free-walk-town', 'free-walk.js'].map(k => html.indexOf(k));
  assert.ok(order.every((p, i) => p > 0 && (i === 0 || p > order[i - 1])), 'free walk scripts in order');
  const v = /gloryland-map\.js\?v=(\w+)/.exec(html)[1];
  for (const f of ['adventure/adventure-ui.js', 'adventure/story/story-sets.js', 'adventure/free-walk/free-walk.js']) assert.ok(src(f).includes(`gloryland-map.js?v=${v}`), `${f}: MAP_SRC ?v=${v}`);
  const man = JSON.parse(src('offline-manifest.json')).urls;
  for (const k of ['free-walk-look.js', 'free-walk-sets.js']) assert.ok(man.some(u => u.includes(k)), k + ' offline');
  assert.ok(!man.some(u => /assets\/street\//.test(u)), 'street models stay out of the offline pack');
  assert.match(src('adventure/free-walk/free-walk.js'), /await window\.FreeWalkTown\.prepare\?\.\(4000, f => say\(f \* \.3\)\)/);
}
console.log('walk-town-look: ok');
