// Character selection must preserve practice state and actual fight identities.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
const saved=new Map();global.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};global.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail;}};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','club-world.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const coach=new LionCoach(data),e={coach,demoModel:coach.root,activeModel:coach.root,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.65,.1,100),animTime:0,isPlaying:false,technique:'cross',currentAnim:'one_two',targetMode:'none',fitCameraToModel(){}};
e.scene.add(coach.root);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
assert.equal(CoachRoster.preferred(),'lion');
for(const mode of ['none','heavy','dummy','speed','rabbit']){
 e.targetMode=mode;e.arena.setTarget(mode);
 for(const species of ['rabbit','lion','rabbit']){
  const playing=e.isPlaying;assert.equal(e.roster.select(species),true);assert.equal(e.coach.species,species);assert.equal(e.activeModel,e.coach.root);assert.equal(e.demoModel,e.coach.root);assert.equal(e.isPlaying,playing);assert.equal(e.arena.mode,mode);assert.equal(CoachRoster.preferred(),species);
  for(let i=1;i<=30;i++){const metrics=e.arena.update(i/30,mode==='speed'?'speedbag':'cross','one_two');assert.ok(metrics.hero.handErrors.every(Number.isFinite));}
  if(mode==='rabbit'){assert.notEqual(e.arena.rabbit.species,species);assert.notEqual(e.arena.rabbit.root,e.coach.root);assert.equal(e.arena.rabbit.root.parent,e.arena.group);}
 }
}
assert.equal(Object.keys(e.roster.coaches).length,2,'repeated switching must reuse rigs');
e.targetMode='fight';e.fightOptions={preset:'quick',seed:814};e.arena.setTarget('fight');
assert.equal(e.arena.fightView.coaches.lion.species,'lion');assert.equal(e.arena.fightView.coaches.rabbit.species,'rabbit');assert.equal(e.roster.select('lion'),false,'cannot replace an active fighter mid-bout');
for(let i=1;i<=180;i++)e.arena.update(i/60,'fight','one_two');
assert.ok(e.arena.fightView.match.time>2);assert.notEqual(e.arena.fightView.coaches.lion.root,e.arena.fightView.coaches.rabbit.root);
const fight=e.arena.fightView;fight.match.fighters.rabbit.down=true;fight.match.phase='count';fight.match.phaseTime=.8;fight.downStarts={rabbit:Math.max(0,fight.match.time-.8)};fight.pose();assert.ok(Math.abs(e.coach.root.rotation.x)>1,'exercise a real knockdown pose before leaving the ring');
e.targetMode='none';e.arena.setTarget('none');assert.equal(e.coach.root.rotation.x,0,'leaving a knockdown must restore an upright practice stance');assert.equal(e.coach.root.rotation.z,0);assert.equal(e.coach.species,'rabbit');assert.equal(e.arena.fightView,null);assert.equal(e.coach.root.parent,e.scene);
const world=new ClubWorld(e);let count=0;world.gym.traverse(n=>count+=Number(!!n.isMesh));assert.ok(count<65,`gym must batch fixtures; got ${count} meshes`);count=0;world.arena.traverse(n=>count+=Number(!!n.isMesh));assert.ok(count<65,`arena must batch fixtures; got ${count} meshes`);
const objectCount=e.scene.children.length;for(let i=0;i<20;i++){world.update(i,'fight');assert.equal(world.gym.visible,false);assert.equal(world.arena.visible,true);world.update(i,'heavy');assert.equal(world.gym.visible,true);assert.equal(world.arena.visible,false);}assert.equal(e.scene.children.length,objectCount,'scene switching must not leak objects');
global.localStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};assert.equal(CoachRoster.preferred(),'lion');assert.equal(e.roster.select('lion'),true,'blocked storage must not prevent selection');
console.log('PASS both species across all five practice modes; cached rigs; freeze preservation; correct species in fights; scene switching and draw-call budget; blocked storage');
