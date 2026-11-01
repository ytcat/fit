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
vm.runInThisContext(fs.readFileSync('boxing-routines.js','utf8'));
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
app.engine.isPlaying=true;app.toggle();assert.equal(app.engine.isPlaying,false);assert.equal(app.isActive,false);
app.toggle();assert.equal(app.engine.isPlaying,true);assert.equal(app.clock,180,'continuous play must not start a round timer');
assert.ok(BOXING_ROUTINES.speeds.includes(3),'fast playback must be available');
assert.ok(!html.includes('>START TRAINING</button>'),'start-exercise entry must be replaced');
console.log('PASS continuous pause/resume without starting a timed exercise');
app.engine.technique='random';app.setLanguage('ru');assert.equal(app.engine.technique,'random','language must preserve random sparring');

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
assert.ok(!html.includes('id="savedCoach"'),'saved-avatar switch must be removed');
assert.ok(!html.includes('id="modelFilePicker"'),'alternate-avatar upload must not appear in coach UI');
// Portrait framing must use the posed instructor envelope, not spread rest arms.
const framingEngine=Object.create(TestEngine.prototype);
const framingModel=new THREE.Group();framingModel.add(new THREE.Mesh(new THREE.BoxGeometry(1.6,2.3,.6),new THREE.MeshBasicMaterial()));
framingEngine.demoModel=framingModel;framingEngine.camera=new THREE.PerspectiveCamera(38,393/800,.1,100);
framingEngine.fitCameraToModel(framingModel);const frontDistance=framingEngine.camera.position.z;
framingModel.rotation.y=1.15;framingEngine.fitCameraToModel(framingModel);
assert.ok(framingEngine.camera.position.z>frontDistance,'profile framing must allow full reach');
console.log('PASS view-aware portrait framing');
// A missing WebGL context must not abort MasterApp and leave a stale loader.
const realThree=global.THREE,appended=[];
for(const id of ['fallbackCanvas','fallbackStage'])Object.assign(element(id),{getBoundingClientRect:()=>({width:320,height:640}),addEventListener(){},append:n=>appended.push(n)});
global.THREE={...realThree,WebGLRenderer:class {constructor(){throw new Error('WebGL unavailable');}}};
window.addEventListener=()=>{};
const fallbackEngine=new TestEngine('fallbackCanvas','fallbackStage');
assert.ok(appended.some(n=>n.id==='renderingNotice'),'renderer failure must show a useful message');
assert.equal(element('modelStatusText').textContent,'WebGL unavailable');
assert.equal(fallbackEngine.isPlaying,true);
global.THREE=realThree;
console.log('PASS graceful WebGL startup failure with usable application controls');
// Impacts must stay silent before a user gesture and while muted.
audio.hit({receiver:'heavy',closingSpeed:6}); // no AudioContext: no creation or throw
let audioStarts=0;const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
const audioNode=()=>({connect(){},start(){audioStarts++;},stop(){},frequency:{...parameter},gain:{...parameter}});
audio.ctx={state:'running',currentTime:0,sampleRate:8000,destination:{},createOscillator:audioNode,createGain:audioNode,createBufferSource:audioNode,createBiquadFilter:audioNode,createBuffer:(_,length)=>({getChannelData:()=>new Float32Array(length)})};
audio.muted=true;audio.hit({receiver:'heavy',closingSpeed:6});assert.equal(audioStarts,0);
audio.muted=false;audio.hit({receiver:'heavy',closingSpeed:6});assert.equal(audioStarts,2,'an actual impact synthesizes a local thud and padding transient');
console.log('PASS gesture-gated local impact synthesis and mute');
