// GOTR-0086: a hidden fight announcement must not be re-shown by a display rule.
const fs=require('fs'),assert=require('node:assert/strict'),css=fs.readFileSync('stage-hud.css','utf8');
assert.ok(/#stageContainer \.bout-announcement\[hidden\]\{display:none!important\}/.test(css),'hidden announcement stays hidden');
assert.ok(css.lastIndexOf('.bout-announcement[hidden]{display:none!important}')>css.lastIndexOf('display:flex'),'the hidden rule comes after the display rules');
console.log('PASS hidden fight announcement stays hidden');
