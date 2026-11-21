// Approved referee "Fight!" recordings: language choice, Opus -> AAC fallback, unchanged sounds when nothing loaded.
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'approved-fight-audio.js'), 'utf8');

function load({ opusFails = false } = {}) {
  const fetched = [];
  const win = {};
  const ctx = {
    decodeAudioData(buf, ok, bad) {
      const name = buf.__url;
      if (opusFails && name.endsWith('.opus')) { const e = Error('no opus'); bad?.(e); return Promise.reject(e); }
      const out = { name }; ok?.(out); return Promise.resolve(out);
    }
  };
  const sandbox = {
    window: win,
    fetch: async url => { fetched.push(url); const exists = fs.existsSync(path.join(root, url)); return { ok: exists, arrayBuffer: async () => ({ __url: url }) }; }
  };
  vm.runInNewContext(src, sandbox);
  const played = [];
  const audio = { ctx, muted: false, samples: new Map(), playSample(k, v) { played.push(k); return true; } };
  return { api: win.ApprovedFightAudio, audio, fetched, played };
}

(async () => {
  // every listed file exists in the repository
  const { api } = load();
  for (const urls of Object.values(api.paths)) for (const u of [].concat(urls)) assert(fs.existsSync(path.join(root, u)), 'missing ' + u);

  // no audio context yet: nothing is fetched (the app creates the context on the player's gesture)
  { const t = load(); t.audio.ctx = null; assert.strictEqual(await t.api.preload(t.audio), false); assert.strictEqual(t.fetched.length, 0); }

  // Opus decodes: the Opus copy is used; language picks the right recording; once per start bell
  for (const lang of ['en', 'he', 'ru']) {
    const t = load(); await t.api.preload(t.audio);
    assert.ok(t.audio.samples.get('approved:referee-fight-' + lang).name.endsWith('.opus'));
    assert.strictEqual(t.api.handle({ type: 'bell', kind: 'start' }, { audio: t.audio, lang }), true);
    assert.deepStrictEqual(t.played, ['approved:referee-fight-' + lang]);
    // bell, final bell and KO announcement have no approved file yet: the caller keeps its existing sound
    assert.strictEqual(t.api.handle({ type: 'bell', kind: 'end' }, { audio: t.audio, lang }), false);
    assert.strictEqual(t.api.handle({ type: 'final-bell' }, { audio: t.audio, lang }), false);
    assert.strictEqual(t.api.handle({ type: 'announcement', result: { stoppage: 'KO' } }, { audio: t.audio, lang }), false);
  }

  // Opus cannot be decoded (older iOS Safari): the AAC copy of the same recording loads
  { const t = load({ opusFails: true }); await t.api.preload(t.audio); for (const lang of ['en', 'he', 'ru']) assert.ok(t.audio.samples.get('approved:referee-fight-' + lang).name.endsWith('.m4a')); }

  // muted: nothing plays
  { const t = load(); await t.api.preload(t.audio); t.audio.muted = true; assert.strictEqual(t.api.handle({ type: 'bell', kind: 'start' }, { audio: t.audio, lang: 'en' }), false); }

  // wired: fight-ui plays the start bell and then the referee command; index and offline manifest list the files
  const ui = fs.readFileSync(path.join(root, 'fight-ui.js'), 'utf8');
  assert.match(ui, /kind==='start'\)\{app\.audio\.bell\('start'\);approvedAudio\?\.handle\(event,app\);\}/);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('approved-fight-audio.js') > 0 && html.indexOf('approved-fight-audio.js') < html.indexOf('fight-ui.js'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'offline-manifest.json'), 'utf8')).urls;
  for (const urls of Object.values(api.paths)) for (const u of [].concat(urls)) assert.ok(manifest.includes(u), 'offline manifest lacks ' + u);
  console.log('approved-fight-audio: ok');
})().catch(e => { console.error(e); process.exit(1); });
