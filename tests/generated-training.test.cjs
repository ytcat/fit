const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.window=global;vm.runInThisContext(fs.readFileSync('boxing-routines.js','utf8'));
const {RoutineDeck,RandomSparring,list}=BOXING_ROUTINES;assert.equal(list.length,44);assert.equal(new Set(list.map(x=>x.id)).size,44);
const a=new RoutineDeck(78,'random'),b=new RoutineDeck(78,'random'),c=new RoutineDeck(79,'random'),signatures=new Set();let changed=false,rests=0;
for(let t=0;t<600;t+=.17){const x=a.frame(t),y=b.frame(t);assert.deepEqual(x,y,'pause/replay must not use wall-clock randomness');changed||=x.move!==c.frame(t).move;assert.ok(x.phase>=0&&x.phase<1);if(x.rest){rests++;assert.equal(x.move,'guard');}else assert.equal(x.move,x.moves[x.slot]);signatures.add(x.moves.join(','));}
assert.ok(changed&&rests>30&&signatures.size>40,'generated training must provide genuinely different attack/defence/exit phrases');assert.ok([...signatures].some(x=>x.includes('slip'))&&[...signatures].some(x=>x.includes('roll')));
const first=a.frame(.3);assert.deepEqual(first,new RoutineDeck(78,'random').frame(.3),'seeking back must replay the same phrase');
const sync=new RoutineDeck(78,'sync');sync.frame(60);assert.ok(sync.timeline.filter(x=>!x.rest).every(x=>x.duration===1.05),'synchronized mode must preserve a steady practice beat');
const spar=new RandomSparring(78,'random');spar.frame(600);const attacks=new Set(spar.timeline.filter(x=>x.attacker).map(x=>x.move));assert.equal(attacks.size,6);assert.ok(spar.timeline.some(x=>x.move==='guard'));
console.log('PASS 44 presets, over 40 seeded generated phrases, defence/exit variety, steady/variable pacing and replay',{phrases:signatures.size,rests});
global.THREE=require('../assets/vendor/three.min.js');global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const file of ['boxing-coach-v2.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,practiceTiming:'random',randomSeed:78,fitCameraToModel(){}};e.demoModel=coach.root;const arena=new TrainingArena(e,data);
for(const mode of ['none','heavy','dummy','rabbit']){
 arena.setTarget(mode);const moves=new Set();let hits=0;
 for(let i=0;i<=420;i++){const m=arena.update(i/60,'freestyle','one_two');assert.ok(m.hero.handErrors.every(n=>n<.002),mode+' generated strikes must keep wrists reachable');moves.add(m.hero.move);hits+=m.contacts.length;assert.ok(m.practice?.authoredTempo);}
 assert.ok(moves.size>=3,mode+' must advance through generated techniques');if(mode==='none')assert.equal(hits,0);else assert.ok(hits>0,mode+' generated practice must hit actual targets');
}
console.log('PASS generated routines on shadowboxing, bag, dummy and partner with actual contacts and reachable wrists');

for(const id of ['step_one_two_exit','circle_counter','moving_double_jab','reset_reenter'])assert.ok(list.find(r=>r.id===id).moves.filter(m=>m==='step').length>=2,'footwork phrases must reposition before and after punches');
