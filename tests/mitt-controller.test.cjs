const fileSystem=require('fs'),vm2=require('vm');global.require=require('module').createRequire(process.cwd()+'/tests/training-motion.test.cjs');const prefix=fileSystem.readFileSync('tests/training-motion.test.cjs','utf8').split("for(const species of ['lion','rabbit']){\n")[0];
vm2.runInThisContext(prefix+`
const rows=[];
function perform(move,hz,rate,delay){
 e.animTime=0;e.arena.setTarget('pads');e.player.reset();e.animTime=delay;e.arena.update(delay);assert.ok(e.player.press(move));const d=e.arena.careerDrill,events=[];
 for(let i=1;i<=Math.ceil(1.25*hz/rate);i++){
  e.animTime=delay+i*rate/hz;const f=e.arena.update(e.animTime);if(move.includes('uppercut')&&f.hero.phase>=.45&&f.hero.phase<=.53){const c=e.coach,side=move==='uppercut'?'L':'R',hand=c.joints['hand'+side],elbow=c.joints['elbow'+side],axis=hand.getWorldPosition(V()).sub(elbow.getWorldPosition(V())).normalize(),glove=V(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())),strike=c.root.worldToLocal(V(0,-.204,0).applyMatrix4(hand.matrixWorld));assert.ok(axis.y>.8,'uppercuts rise with the elbow below the glove');assert.ok(axis.dot(glove)>1-1e-9,'uppercut wrists stay aligned with the forearm');assert.ok(Math.abs(strike.x)<.14,'uppercut finishes stay near the centreline');}
  for(const hit of f.contacts){
   events.push(hit);const normal=V(...hit.normal),velocity=V(...hit.relativeVelocity),local=V(...hit.localPoint),centre=d.mitts[hit.hand==='R'?1:0].userData.face;
   assert.ok(Math.abs(normal.length()-1)<1e-10);assert.ok(velocity.dot(normal)<-.12,'retreating hands cannot score');assert.ok(Math.abs(hit.closingSpeed-Math.min(5,-velocity.dot(normal)))<1e-9);
   assert.ok(Math.abs(local.z-centre.z)<=.035+1e-8,'swept point must meet the narrow pad band');assert.ok(((local.x-centre.x)/.125)**2+((local.y-centre.y)/.145)**2<=1+1e-9,'contact must be on the oval pad');
   assert.equal(hit.hand,['cross','rear_hook','rear_uppercut'].includes(move)?'R':'L');assert.ok(hit.actionId.startsWith('pads:'));assert.equal(hit.targetRegion,'mitt');assert.ok(hit.time<=hit.sampleTime+1e-9&&hit.sampleTime<=f.poseTime+1e-9);
  }
 }
 assert.equal(events.length,1,JSON.stringify({species:e.coach.species,move,hz,rate,delay,events}));assert.equal(e.arena.update(e.animTime).contacts.length,0,'held display frames cannot replay impacts');
 rows.push({species:e.coach.species,move,hz,rate,delay,time:events[0].time,speed:events[0].closingSpeed});return d;
}
for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);e.player.setEnabled(true);
 for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut'])perform(move,120,1,3);
 for(const move of ['uppercut','rear_uppercut'])for(const [hz,rate] of [[30,3],[144,.5]])perform(move,hz,rate,0);
 const d=perform('uppercut',60,1,3),pad=d.mitts[0],face=pad.localToWorld(pad.userData.face.clone()),normal=V(0,0,1).transformDirection(pad.matrixWorld),inside=face.clone(),away=face.clone().addScaledVector(normal,.05),before=inside.clone();
 assert.equal(d.contactWithMitt(pad,away,before,face,face,1/120),false,'a separating fist cannot make a pad hit');assert.equal(d.contactWithMitt(pad,inside,away,face,face,0),false,'a pause has no collision velocity');
 const far=face.clone().addScaledVector(V(1,0,0).transformDirection(pad.matrixWorld),3);assert.equal(d.contactWithMitt(pad,far,far.clone().addScaledVector(normal,.1),face,face,1/120),false,'a swept miss cannot create a contact');
 e.animTime+=5;assert.equal(e.arena.update(e.animTime).contacts.length,0,'seeking/hidden-tab jumps cannot create a phantom impact');e.player.setEnabled(false);
}
for(const species of ['lion','rabbit'])for(const move of ['uppercut','rear_uppercut']){const pair=rows.filter(r=>r.species===species&&r.move===move&&r.delay===0);assert.equal(pair.length,2);assert.ok(Math.abs(pair[0].speed-pair[1].speed)<1e-10&&Math.abs(pair[0].time-pair[1].time)<1e-10,'render cadence and playback speed cannot change the authoritative contact');}
// Visual detail work is done once after fixed physics ticks, not at each catch-up tick.
e.targetMode='none';e.roster.select('lion');e.player.setEnabled(false);e.animTime=0;e.arena.setTarget('pads');const trainer=e.arena.careerDrill.trainer,oldHero=e.coach.updateMane,oldTrainer=trainer.updateMane;let detailCalls=0;
e.coach.updateMane=function(...args){detailCalls++;return oldHero.apply(this,args)};trainer.updateMane=function(...args){detailCalls++;return oldTrainer.apply(this,args)};
for(let i=1;i<=30;i++){e.animTime=i/30;e.arena.update(e.animTime);}assert.equal(detailCalls,60,'two actors receive one final detail pass per rendered update');e.coach.updateMane=oldHero;trainer.updateMane=oldTrainer;
console.log('PASS all six same-hand mitt punches for both species after waiting, uppercuts at 30 Hz/3× and 144 Hz/0.5×, incoming swept contact, no duplicate/teleport/miss hits, and one final detail pass',rows);
`);
