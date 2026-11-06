const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-input.js','boxing-footwear.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);const coach=e.coach;
 for(const move of ['jab','cross','hook','uppercut','rear_uppercut','roll','step'])for(let i=0;i<16;i++){
  const m=coach.update(i*1.22/16,move,'one_two');for(const f of m.footTargets){const foot=coach.joints['foot'+f.side],sole=foot.children.find(n=>n.name==='Boxing boot sole'),p=sole.geometry.attributes.position;for(let j=0;j<p.count;j++){const point=coach.root.worldToLocal(sole.localToWorld(new THREE.Vector3().fromBufferAttribute(p,j)));assert.ok(point.y>=.005+f.lift,`${species} ${move} sole ${point.y}`);}const up=new THREE.Vector3(0,1,0).applyQuaternion(foot.userData.bootAnkle.getWorldQuaternion(new THREE.Quaternion())),shin=foot.parent.getWorldPosition(new THREE.Vector3()).sub(foot.getWorldPosition(new THREE.Vector3())).normalize();assert.ok(up.dot(shin)>.9999);}
 }
 e.animTime=0;e.targetMode='rope';e.arena.setTarget('rope');let jumps=0;
 for(let i=1;i<=90;i++){const f=e.arena.update(i/30);jumps+=f.jumps;assert.ok(f.hero.hands.flat().every(Number.isFinite));if(Math.abs(f.rope.phase-.5)<.04){assert.ok(f.rope.lowest>=0,'rope must pass above floor');assert.ok(f.rope.lowest<f.rope.jump,'boots must clear the rope');}}
 assert.ok(jumps>=4);assert.equal(e.arena.update(3).jumps,0,'a held frame cannot award another jump');
 e.animTime=0;e.targetMode='pads';e.arena.setTarget('pads');let hits=0,defences=0;
 for(let i=1;i<=270;i++){const f=e.arena.update(i/30);hits+=f.contacts.length;defences+=f.defences;assert.ok(f.hero.hands.flat().every(Number.isFinite));}
 console.log(species,{jumps,hits,defences});assert.ok(hits>=4,'punches must actually meet the moving mitts');assert.ok(defences>=2,'roll must clear the trainer hook');
 e.player.setEnabled(true);e.animTime=0;e.arena.setTarget('pads');let idleHits=0,idleDefences=0;for(let i=1;i<=135;i++){const f=e.arena.update(i/30);idleHits+=f.contacts.length;idleDefences+=f.defences;}assert.equal(idleHits,0);assert.equal(idleDefences,0,'manual idle cannot earn duck credit');e.player.setEnabled(false);
 const trainer=e.arena.careerDrill.trainer;const original=trainer.root.children.length;e.targetMode='none';e.arena.setTarget('none');assert.equal(trainer.root.children.length,original-2,'dispose mitt geometry without leaking cached props');assert.equal(e.coach.root.position.y,0);
}
const ref=new RhinoReferee();let soles=0;ref.root.traverse(n=>{if(n.name==='Boxing boot sole')soles++;});assert.equal(soles,2);
console.log('PASS both species: articulated grounded boots, referee shoes, rope clearance, real pad contact, actual duck and clean drill lifecycle');
