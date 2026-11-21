// The offline worker accepts only the manifest version it names; a mismatch breaks the offline install.
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'offline-manifest.json'), 'utf8'));
const worker = fs.readFileSync(path.join(root, 'offline-worker.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts/build_offline_manifest.py'), 'utf8');
assert.ok(worker.includes(`manifest.version!=='${manifest.version}'`), 'offline-worker.js does not accept manifest ' + manifest.version);
assert.ok(worker.includes(`ringfighter-offline-${manifest.version}`), 'offline cache name does not match ' + manifest.version);
assert.ok(script.includes(`'version':'${manifest.version}'`), 'build_offline_manifest.py writes another version');
for (const u of manifest.urls) assert.ok(fs.existsSync(path.join(root, u.split('?')[0])), 'missing ' + u);
console.log('offline-version-match: ok', manifest.version);
