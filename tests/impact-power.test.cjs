// GOTR-0040 power meter scaling and GOTR-0032 impact accents (hit-stop, camera kick that leaves the camera
// where the director put it, spray), driven by real contact events from the mitt station.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','training-gear.js','career-drills.js','character-roster.js','power-meter.js','impact-fx.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const {power,SCALE}=PowerMeter;

// 1. Meter scaling: landed fight punches only; the fighter's own training punches only; 0..1.
assert.equal(power({actor:'lion',receiver:'rabbit',kind:'head',legal:true,blocked:false,impulse:1.6},'fight'),1);
assert.equal(power({actor:'rabbit',receiver:'lion',kind:'glove',blocked:true,impulse:.2},'fight'),null,'a blocked punch is not a landed punch');
assert.equal(power({actor:'lion',receiver:'pads',kind:'pad',impulse:18},'pads'),.5);
assert.equal(power({actor:'lion',receiver:'heavy',kind:'bag',impulse:220},'heavy'),1,'clamped');
assert.equal(power({actor:'rabbit',receiver:'lion',kind:'head',impulse:1},'rabbit'),null,'the opponent hitting the fighter is not the fighter\'s power');
assert.equal(power({receiver:'platform',impulse:1},'speed'),null);

// 2. Real mitt contacts drive the hit-stop, kick and spray.
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'pads',animTime:0,isPlaying:true,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};
e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);e.player.setEnabled(true);e.arena.setTarget('pads');
const hits=[];e.onImpact=h=>hits.push(h);const fx=new ImpactFx.ImpactFx(e);
let t=0,clock=0;const frame=dt=>{t+=dt;const scaled=dt*fx.timeScale(dt);clock+=scaled;e.animTime=clock;const f=e.arena.update(clock);for(const h of f.contacts||[])e.onImpact(h);return scaled;};
for(let i=0;i<144;i++)frame(1/120);e.player.press('cross');
let held=0,during=0,kicked=false;const camera0=e.camera.position.clone();
for(let i=0;i<120;i++){const scaled=frame(1/120);if(hits.length&&scaled<1/120*.5){held+=1/120;during+=scaled;}
 const moved=fx.beforeRender(1/120);if(fx.offset)kicked=true;fx.afterRender();assert.ok(e.camera.position.distanceTo(camera0)<1e-9,'the kick never moves the camera the director placed');}
assert.ok(hits.length>=1,'the cross meets the mitt');const p=power(hits[0],'pads');assert.ok(p>.5,'mitt cross power '+p.toFixed(2));
assert.ok(held>=.045&&held<=.075,'hit-stop lasts 50-70 ms: '+(held*1000).toFixed(0)+' ms');assert.ok(during<held*.12,'the clock nearly halts during the hit-stop');
assert.equal(kicked,p>=.7,'camera kick only on power shots');
assert.ok(fx.points.geometry.attributes.position.count===72,'spray pool');
console.log('PASS power meter scaling; hit-stop '+(held*1000).toFixed(0)+' ms, kick restores the camera, spray on clean contact');
