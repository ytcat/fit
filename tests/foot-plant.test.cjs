// GOTR-0028: a fighter that is hit never glides on planted feet. Ground is given
// only through real steps (a foot lifts, travels and plants; the body follows).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function engine(species){const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);if(species==='rabbit')e.roster.select('rabbit');return e;}
const sole=(coach,side)=>coach.joints['foot'+side].localToWorld(V(0,-.102,.215));
// Per frame: the receiver's soles, lifts and root; hit times on the receiver.
function watch(coach,frames,advance){
 const out=[];for(let i=0;i<frames;i++){const hit=advance(i);out.push({hit,root:coach.root.getWorldPosition(V()),feet:coach.metrics.footTargets.map(f=>({side:f.side,lift:f.lift||0,p:sole(coach,f.side)}))});}return out;
}
function slide(trace){
 let worst=0,lifted=0;
 for(let i=1;i<trace.length;i++)for(let k=0;k<2;k++){const a=trace[i-1].feet[k],b=trace[i].feet[k];lifted=Math.max(lifted,b.lift);if(a.lift>1e-7||b.lift>1e-7)continue;worst=Math.max(worst,Math.hypot(b.p.x-a.p.x,b.p.z-a.p.z));}
 return {worst,lifted};
}

// 1. Sparring station, both hero species: the partner is hit, steps back on lifted feet and steps in again.
for(const species of ['lion','rabbit']){
 const e=engine(species);e.targetMode='rabbit';e.arena.setTarget('rabbit');const partner=e.arena.rabbit;let t=0,hits=0,farthest=0;
 const trace=watch(partner,60*8,()=>{t+=1/60;e.animTime=t;const f=e.arena.update(t,'combo','one_two');const n=(f.contacts||[]).filter(c=>c.receiver==='rabbit').length;hits+=n;farthest=Math.max(farthest,partner.root.position.z-.79);return n>0;});
 const s=slide(trace);
 assert.ok(hits>=2,species+': the partner is hit: '+hits);
 assert.ok(s.worst<.0015,species+': planted feet of the hit partner stay put (worst '+(s.worst*1000).toFixed(2)+' mm per frame)');
 assert.ok(farthest>.05&&farthest<=.161,species+': the partner gives ground by stepping back '+farthest.toFixed(3)+' m');
 assert.ok(s.lifted>.03,species+': the step lifts a foot '+s.lifted.toFixed(3)+' m');
 assert.ok(Math.abs(partner.root.position.z-.79)<.17,'the partner returns toward its station');
}
console.log('PASS planted feet do not glide when hit (sparring); ground is given by stepping');
