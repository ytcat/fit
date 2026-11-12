// GOTR-0071: the timed (15-second) round has a start bell, every landed punch on the mitts sounds, a final bell at 0,
// a second tap stops it, the scene keeps running afterwards, and audio retries a resume when iOS left it interrupted.
// Browser evidence (real engine, real samples): qa/gotr-0071/round-browser.cjs.
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm'), path = require('node:path');
const base = path.resolve(__dirname, '..') + '/';

/* ---------- 1. career round: bells, events, control, scene keeps playing ---------- */
class El { constructor() { this.children = []; this.listeners = {}; this.classList = { toggle() {} }; this.attrs = {}; } append(...ns) { this.children.push(...ns); } prepend(n) { this.children.unshift(n); } after() {} setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; } addEventListener(k, f) { this.listeners[k] = f; } showModal() {} remove() {} }
const els = new Map(), node = id => { if (!els.has(id)) els.set(id, new El()); return els.get(id); }, created = [];
const values = new Map(), storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
const { CareerStore } = require(base + 'career-progress.js'); new CareerStore(storage).create('Round Tester');
const bells = [], rounds = [], padPaints = [];
const e = { coach: { species: 'lion' }, targetMode: 'pads', isPlaying: true, compactLayout: true, player: { enabled: false, setEnabled(v) { this.enabled = v; } } };
const ctx = { app: { engine: e, lang: 'en', audio: { bell: kind => bells.push(kind) } }, localStorage: storage,
  document: { readyState: 'complete', createElement: () => { const n = new El(); created.push(n); return n; }, querySelector: node, getElementById: node, body: new El() },
  setInterval() {}, setTimeout() {}, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o.detail; } }, addEventListener() {},
  dispatchEvent: ev => { if (ev.type === 'ringfighter-round') rounds.push(ev.detail); }, fighterPad: { paint: () => padPaints.push(1) } };
ctx.window = ctx;
for (const f of ['game-world.js', 'game-tournament.js', 'game-domain.js', 'career-progress.js', 'career-interface.js']) vm.runInNewContext(fs.readFileSync(base + f, 'utf8'), ctx, { filename: f });
const api = e.career, start = created.find(n => n.id === 'startTraining');
assert.ok(start, 'timer button');
assert.equal(start.attrs['aria-label'], 'Start a 15-second round', 'the timer says what it does');
const frame = i => ({ swings: i % 8 ? [] : [{ actor: 'lion', move: 'jab' }], contacts: i % 8 === 4 ? [{ actor: 'lion', kind: 'glove', receiver: 'pads', move: 'jab' }] : [] });

// One tap from Auto: the round is the player's turn (UX R1) and says so; the pad is repainted at once; one start bell.
start.onclick();
assert.equal(e.player.enabled, true, 'the round is played by hand'); assert.ok(padPaints.length, 'punch pad shown immediately');
assert.deepEqual(bells, ['start'], 'one start bell'); assert.equal(rounds.at(-1).phase, 'start'); assert.equal(rounds.at(-1).duration, 15);
api.paint(true); assert.match(start.attrs['aria-label'], /^Stop the round · 15s left$/);
for (let i = 0; i < 400 && api.active; i++) api.onFrame(frame(i), .05);
assert.equal(api.active, null, 'the round ends at 0');
assert.deepEqual(bells, ['start', 'end'], 'final bell at 0 (three strikes inside bell("end"))');
const end = rounds.at(-1); assert.equal(end.phase, 'end'); assert.equal(end.reason, 'time'); assert.ok(end.hits > 10, 'clean hits counted'); assert.ok(end.xp > 0 && /XP/.test(end.recap), 'result with XP');
assert.equal(e.isPlaying, true, 'the scene keeps running after the final bell (no frozen, silent stage)');
console.log('PASS timed round: start bell, hand play with the pad, final bell at 0, result event, scene keeps running');

// Second tap stops the round: no final bell, reason 'stop'.
start.onclick(); for (let i = 0; i < 40; i++) api.onFrame(frame(i), .05); start.onclick();
assert.equal(api.active, null); assert.deepEqual(bells, ['start', 'end', 'start'], 'stopping does not ring the final bell'); assert.equal(rounds.at(-1).reason, 'stop');
// A round already in Auto (guided cards: startTraining({play:false})) keeps the coach-driven Fighter.
e.player.enabled = false; api.startSession({ duration: 15 }); assert.equal(e.player.enabled, false); assert.equal(rounds.at(-1).control, 'coach');
api.finish(); assert.equal(rounds.at(-1).reason, 'left', 'leaving (mode change, pagehide) is not a result'); assert.equal(bells.filter(b => b === 'end').length, 1);
console.log('PASS second tap stops the round without the final bell; Auto rounds stay Auto; leaving is silent');

/* ---------- 2. audio engine: bells, mitt impacts, interrupted context ---------- */
const html = fs.readFileSync(base + 'index.html', 'utf8'), src = html.slice(html.indexOf('    class AudioEngine'), html.indexOf('    /* MASTER APPLICATION CONTROLLER'));
const actx = { window: {}, Date }; vm.runInNewContext(src + '\nglobalThis.TestAudio=AudioEngine;', actx);
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
const started = [], gnode = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
let resumes = 0;
const audio = new actx.TestAudio(); audio.unlocked = true;
audio.ctx = { state: 'running', currentTime: 0, sampleRate: 48000, destination: {}, createGain: gnode, createBiquadFilter: gnode, createDynamicsCompressor: gnode, createOscillator: gnode,
  createBufferSource() { const n = gnode(); n.playbackRate = param(); n.start = t => started.push(n.buffer.name); return n; }, resume() { resumes++; return Promise.resolve(); } };
for (const name of ['pad', 'body-1', 'body-2', 'swing', 'effort-1', 'effort-2', 'bell']) audio.samples.set(name, { name, duration: .4 });
audio.bell('start'); assert.deepEqual(started.splice(0), ['bell'], 'start: one bell strike');
audio.bell('end'); assert.deepEqual(started.splice(0), ['bell', 'bell', 'bell'], 'end: three strikes');
const mitt = { actor: 'lion', receiver: 'pads', kind: 'glove', closingSpeed: 6, move: 'cross' };
for (let i = 0; i < 40; i++) { audio.hit(mitt); audio.swing({ move: 'cross' }); }
assert.ok(started.filter(n => n === 'pad').length >= 80, 'every punch on the mitts plays its pad layers'); assert.ok(audio.voices.size <= 24, 'voice cap'); started.length = 0;
// iOS left the context interrupted while nobody touched the screen: a sound request asks it to resume (throttled), never throws.
audio.ctx.state = 'interrupted';
assert.equal(audio.playSample('pad'), false); audio.hit(mitt); audio.pain({ kind: 'head', receiver: 'rabbit', severity: 1 });
assert.equal(resumes, 1, 'one resume request, throttled'); assert.equal(started.length, 0);
audio.retryAt -= 600; audio.hit(mitt); assert.equal(resumes, 2, 'retried after half a second');
audio.ctx.state = 'running'; audio.hit(mitt); assert.ok(started.includes('pad'), 'sound returns as soon as the context runs');
audio.muted = true; audio.ctx.state = 'suspended'; audio.retryAt = 0; audio.hit(mitt); assert.equal(resumes, 2, 'muted audio never resumes by itself');
audio.muted = false; audio.unlocked = false; audio.hit(mitt); assert.equal(resumes, 2, 'never before the first user gesture unlocked it');
console.log('PASS bells (1 start, 3 end), every mitt punch audible within the voice cap, throttled resume of an interrupted context');

/* ---------- 3. round line copy in EN / HE / RU ---------- */
const mm = fs.readFileSync(base + 'modes-menu.js', 'utf8'), rc = mm.slice(mm.indexOf('const RC = {'), mm.indexOf('const fill ='));
const RC = new Function(rc + ';return RC;')();
const keys = Object.keys(RC.en).sort();
for (const l of ['he', 'ru']) assert.deepEqual(Object.keys(RC[l]).sort(), keys, l + ' has every round line');
assert.ok(/[֐-׿]/.test(RC.he.mitts) && /[Ѐ-ӿ]/.test(RC.ru.mitts), 'translated, not English fallbacks');
assert.ok(/timer:\s*'<circle/.test(mm) && /gm-tool-sec/.test(mm), 'stopwatch icon with the seconds');
assert.ok(!/gm-round\{[^}]*background(?!:none)/.test(fs.readFileSync(base + 'modes-menu.css', 'utf8')), 'round line is plain text, no box');
console.log('PASS round line copy EN/HE/RU and a plain-text, stopwatch-marked timer');
