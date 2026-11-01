// Controller regressions without a browser or WebGL context.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
const elements=new Map();
const element=id=>{
  if(!elements.has(id))elements.set(id,{id,innerText:'',textContent:'',className:'',classList:{toggle(){}}});
  return elements.get(id);
};
const buttons=['jab','cross','hook','uppercut','slip','rear_hook','rear_uppercut','roll','step','combo']
  .map(technique=>({...element(technique),dataset:{technique}}));
global.document={readyState:'loading',documentElement:{},addEventListener(){},
  getElementById:element,querySelectorAll:()=>buttons,
  createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
vm.runInThisContext(fs.readFileSync('boxing-coach.js','utf8'));
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
vm.runInThisContext(source+'\nglobal.TestApp=MasterApp;global.TestEngine=AutoModelEngine;global.TestAudio=AudioEngine;');
const app=Object.create(TestApp.prototype);
Object.assign(app,{engine:{technique:'cross',currentAnim:'one_two',animTime:.57,isPlaying:false},
  drillIdx:0,clock:180,isActive:false,isRest:false,playBtn:element('playBtn')});
for(const lang of ['he','ru','en']) {
  app.setLanguage(lang);
  assert.equal(app.engine.technique,'cross','language must preserve selected technique');
  assert.equal(app.engine.animTime,.57,'language must preserve pose');
  assert.equal(app.engine.isPlaying,false,'language must preserve freeze');
  assert.equal(element('comboCodes').textContent,'2');
  assert.ok(element('exerciseNotes').textContent.length>10);
}
app.engine.technique='combo';app.setLanguage('he');
assert.equal(app.engine.technique,'combo');assert.equal(app.engine.animTime,.57);
assert.equal(document.documentElement.dir,'rtl');
console.log('PASS language changes preserve technique, frozen pose and combination time');

const engine=Object.create(TestEngine.prototype);let stopped=false;
Object.assign(engine,{mixer:{},technique:'uppercut',animTime:0,actions:{Rear_Uppercut:{}},
  activeAction:{stop(){stopped=true;}}});
engine.playClipForDrill();
assert.equal(engine.activeAction,null);assert.ok(stopped);
assert.equal(element('modelStatusText').textContent,'Avatar has no Uppercut clip');
const action={getClip:()=>({duration:1.22})};
for(const method of ['reset','setLoop','setEffectiveTimeScale','fadeIn','play'])action[method]=()=>action;
engine.actions={'Lead Hook':action};engine.technique='hook';engine.playClipForDrill();
assert.equal(engine.activeAction,action,'normalized exact clip name should play');
console.log('PASS uploaded avatars never substitute a rear punch for a missing lead punch');

// The app must not fall back to network-backed browser speech.
let spoken=0;
window.speechSynthesis={cancel(){},getVoices:()=>[{lang:'en-US',localService:false}],speak(){spoken++}};
global.SpeechSynthesisUtterance=function(text){this.text=text};
const audio=new TestAudio();audio.speak('Jab','en');assert.equal(spoken,0);
window.speechSynthesis.getVoices=()=>[{lang:'en-US',localService:true}];
audio.speak('Jab','en');assert.equal(spoken,1);
audio.speak('Jab','he');assert.equal(spoken,1,'no remote fallback for missing local language');
assert.ok(html.includes("connect-src 'self' blob: data:"),'same-origin runtime policy');
for(const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g))assert.ok(match[1].startsWith('./'),'runtime dependencies must be bundled');
assert.ok(!html.includes('https://api.github.com'),'no GitHub API model discovery');
console.log('PASS bundled dependencies, same-origin connection policy and local-only speech');
