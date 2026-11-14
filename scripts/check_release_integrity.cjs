#!/usr/bin/env node
// Read-only release metadata and offline-asset validation. No npm dependencies.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const file = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let errors = [];
function check(name, fn) {
  try { fn(); console.log('PASS ' + name); }
  catch (err) { errors.push(name + ': ' + err.message); console.error('FAIL ' + name + ': ' + err.message); }
}
const meta = file('version.js');
const match = meta.match(/number\s*:\s*['"](\d+\.\d+)['"]/);
const version = match && match[1];
const manifest = JSON.parse(file('offline-manifest.json'));
const worker = file('offline-worker.js');
check('app version is valid and documented', () => {
  assert.ok(version, 'version.js must declare a numeric version');
  assert.ok(file('docs/glory-of-the-ring/RELEASES.md').includes('| v' + version + ' |'), 'missing release log row');
});
check('offline manifest is consistent with app version', () => {
  assert.ok(typeof manifest.version === 'string', 'manifest version missing');
  const prefix = 'v' + version.replace('.', '');
  assert.ok(manifest.version.startsWith(prefix + '-'), 'manifest must match app version');
  assert.ok(worker.includes("manifest.version!=='" + manifest.version + "'"), 'worker must validate exactly this manifest version');
  assert.ok(worker.includes('ringfighter-offline-' + manifest.version), 'worker cache name must match manifest version');
});
check('offline assets are valid, local and present', () => {
  assert.ok(Array.isArray(manifest.urls) && manifest.urls.length > 0, 'offline assets missing');
  const seen = new Set();
  for (const url of manifest.urls) {
    assert.ok(typeof url === 'string' && url.startsWith('./'), 'not a relative URL: ' + url);
    assert.ok(!url.includes('..') && !url.includes('#'), 'unsafe URL: ' + url);
    assert.ok(!seen.has(url), 'duplicate URL: ' + url); seen.add(url);
    const relative = decodeURIComponent(url.split('?')[0].slice(2));
    assert.ok(relative && !path.isAbsolute(relative), 'invalid asset path: ' + url);
    const full = path.resolve(root, relative);
    assert.ok(full.startsWith(root + path.sep), 'asset escapes repository: ' + url);
    assert.ok(fs.statSync(full).isFile(), 'offline asset missing: ' + url);
  }
});
if (errors.length) {
  console.error('\n' + errors.length + ' release gate(s) failed');
  process.exitCode = 1;
} else console.log('Release metadata and offline asset checks passed.');
