// GOTR-0088 Finisher "Sunday Punch": availability (Opponent hurt + full Burst), Burst spent on a miss/block, KO result recorded,
// ownership through the Shop or the story (saves without it still load), the pad button rule, and on the real rigs in the
// mirrored ring cast: the knocked-out fighter ends at rest ON the canvas (no float, no sinking), rig scale kept and restored.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','sunday-punch.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

/* 1. availability */
{
 const m=new BoxingFight({seed:3,preset:'quick',careerActor:'lion',finishers:['sunday_punch']});m.setPlayer('lion');
 assert.equal(new BoxingFight({seed:3}).finisherState('lion').status,'none','not owned: no finisher');
 assert.equal(m.finisherState('rabbit').status,'none','owned per actor');
 assert.equal(m.finisherState('lion').status,'over','not before the bell');assert.equal(m.requestFinisher('lion'),false);
 while(m.phase==='intro')m.advance(.1);
 assert.equal(m.finisherState('lion').status,'charging');
 m.fighters.lion.burst.charge=1;assert.equal(m.finisherState('lion').status,'healthy','full Burst but the Opponent is not hurt');assert.equal(m.requestFinisher('lion'),false);
 m.fighters.rabbit.condition=26;assert.equal(m.finisherState('lion').status,'healthy','26 % is not hurt');
 m.fighters.rabbit.condition=24;m.fighters.lion.burst.charge=.99;assert.equal(m.finisherState('lion').status,'charging','hurt but Burst not full');
 m.fighters.lion.burst.charge=1;assert.equal(m.finisherState('lion').status,'ready');
 m.fighters.lion.action=null;const used=m.fighters.lion.burst.used;
 assert.equal(m.requestFinisher('lion'),true);assert.equal(m.fighters.lion.burst.charge,0,'pressing spends the whole Burst');assert.equal(m.fighters.lion.burst.used,used+1);
 assert.equal(m.fighters.lion.action.finisher,'sunday_punch');assert.equal(m.fighters.lion.action.move,'rear_uppercut');assert.equal(m.finisherState('lion').status,'active');
 assert.equal(m.requestPlayerMove({move:'jab'}),false,'no other order while the finisher is in the air');
 // a block: the glove takes it, the Burst stays spent, no knockout
 m.contact({actor:'lion',action:m.fighters.lion.action.id,part:'glove',speed:4,side:1});
 assert.ok(m.events.some(e=>e.type==='finisher-miss'&&e.blocked));assert.equal(m.result,null);assert.equal(m.fighters.lion.burst.charge,0);assert.ok(m.fighters.rabbit.condition>0);
 // a miss: the action ends without a contact
 const m2=new BoxingFight({seed:4,preset:'quick',finishers:{lion:['sunday_punch']}});while(m2.phase==='intro')m2.advance(.1);m2.decide=()=>{};
 m2.fighters.rabbit.condition=10;m2.fighters.lion.burst.charge=1;m2.fighters.lion.action=null;assert.ok(m2.requestFinisher('lion'));for(let i=0;i<120;i++)m2.advance(1/60);
 assert.ok(m2.events.some(e=>e.type==='finisher-miss'&&!e.blocked),'a miss is reported');assert.equal(m2.result,null);assert.ok(m2.fighters.lion.burst.charge<.3,'Burst is gone after a miss (only the slow time charge since)');
 // in training stations there is no BoxingFight and no finisher: the pad rule hides it outside fights
 const padModule={exports:{}};vm.runInNewContext(fs.readFileSync('fighter-pad.js','utf8'),{module:padModule});const pad=padModule.exports;
 assert.equal(pad.finisherView({status:'ready'},{mode:'rabbit'}).show,false,'not in sparring');assert.equal(pad.finisherView({status:'ready'},{mode:'heavy'}).show,false,'not at the bag');
 assert.equal(pad.finisherView({status:'none'},{mode:'fight'}).show,false,'not owned');
 const lit=pad.finisherView({status:'ready'},{mode:'fight',readyAt:1000,now:2000});assert.ok(lit.show&&lit.enabled&&lit.lit&&lit.pulse,'lit and pulsing when ready');
 assert.equal(pad.finisherView({status:'ready'},{mode:'fight',readyAt:1000,now:1000+pad.PULSE_MS+1}).pulse,false,'pulses for a few seconds only');
 const dim=pad.finisherView({status:'healthy'},{mode:'fight'});assert.ok(dim.show&&!dim.enabled&&!dim.lit);
 console.log('PASS availability: hurt (<25 %) + full Burst; spent on press; block and miss keep it spent; pad rule');
}

/* 2. ownership: Shop or story, saved like other owned moves; old saves load */
{
 const Domain=require('../game-domain.js'),Adventure=require('../adventure-progress.js');global.GameDomain=Domain;
 const profile={id:'p1',name:'A',boxers:{lion:{xp:0},rabbit:{xp:0}}};
 const live=()=>{globalThis.APP_VERSION={channel:'live'};},dev=()=>{globalThis.APP_VERSION={channel:'dev'};};
 live();let g=Domain.fresh(profile);assert.deepEqual(Domain.finishersOwned(g),[]);
 assert.throws(()=>Domain.action(g,{type:'finisher-buy',finisherId:'sunday_punch'}),/Not enough coins/);
 const item=Domain.finishers.find(f=>f.id==='sunday_punch');assert.ok(item.price>0&&item.name==='Sunday Punch','price shown');
 g.ledger.push({id:'reward:x',type:'earn',coins:item.price+5,xp:0,species:'lion',activityId:'x',rule:'activity-v1'});g.processed.push('x');g.history.push({id:'x',transactionId:'reward:x',mode:'fight',species:'lion',control:'play',seconds:20,hits:1,attempts:1,defences:0,jumps:0,result:'win',xp:0,coins:item.price+5});
 const r=Domain.action(g,{type:'finisher-buy',finisherId:'sunday_punch'});assert.equal(r.free,false);assert.equal(Domain.wallet(g).coins,5);assert.deepEqual(Domain.finishersOwned(g),['sunday_punch']);
 assert.throws(()=>Domain.action(g,{type:'finisher-buy',finisherId:'sunday_punch'}),/Already owned/);
 const saved=JSON.parse(JSON.stringify(g));Domain.validate(saved,profile);assert.deepEqual(Domain.finishersOwned(saved),['sunday_punch'],'kept through save/load');
 const forged=JSON.parse(JSON.stringify(g));forged.ledger.find(t=>t.id==='purchase:finisher:sunday_punch').coins=-1;assert.throws(()=>Domain.validate(forged,profile),/Invalid finisher purchase/);
 dev();const d=Domain.fresh(profile);const free=Domain.action(d,{type:'finisher-buy',finisherId:'sunday_punch'});assert.equal(free.free,true,'free in the development build');Domain.validate(JSON.parse(JSON.stringify(d)),profile);live();
 // story: earned when the step before the Brick rematch (advanced_training) is finished
 const s=Domain.fresh(profile);assert.equal(Adventure.dreamSteps[Adventure.dreamSteps.indexOf('brick')-1],item.earn);
 assert.equal(Domain.ownsFinisher(s,'sunday_punch'),false);s.adventure.missions.advanced_training={stars:1,value:1,plays:1};assert.equal(Domain.ownsFinisher(s,'sunday_punch'),true,'Bruno teaches it before the rematch');
 Domain.validate(JSON.parse(JSON.stringify(s)),profile);
 // an older save (no finisher anywhere, no adventure story) still validates unchanged
 const old=Domain.fresh(profile);delete old.adventure;Domain.validate(old,profile);assert.deepEqual(Domain.finishersOwned(old),[]);
 // Shop card: price, buy action, owned state
 const Shop=require('../game-shell.js');assert.equal(Shop.kind(item),'finisher');assert.deepEqual(Shop.buy(item),{type:'finisher-buy',finisherId:'sunday_punch'});
 assert.equal(Shop.state(item,Domain.fresh(profile),item.price),'price');assert.equal(Shop.state(item,Domain.fresh(profile),0),'short');assert.equal(Shop.state(item,g,0),'equipped');assert.equal(Shop.wear(item,g),null);
 assert.ok(require('../glossary.js').terms.includes('Sunday Punch'),'a move name: Latin in every language');
 console.log('PASS ownership: Shop (price, free in dev) or story step',item.earn,'; saved in the ledger; old saves load');
}

/* 3. on the rigs: the punch lands, KO recorded, the fallen fighter at rest on the canvas, rig scale */
{
 SundayPunch.install(FightArena);
 const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
 const skinLow=c=>{let lo=Infinity;const p=c.skin.geometry.attributes.position;for(let i=0;i<p.count;i+=5)lo=Math.min(lo,c.root.localToWorld(c.skinPoint(c.skin,i)).y);return lo;};
 let checked=0;
 for(const [species,seed] of [['lion',5],['rabbit',13]]){
  const coach=new LionCoach(data,{species}),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);
  const arena=e.arena=new TrainingArena(e,data);e.fightOptions={seed,preset:'quick',finishers:{lion:['sunday_punch'],rabbit:['sunday_punch']}};arena.setTarget('fight');
  const v=arena.fightView,m=v.match,striker=coach.species==='rabbit'?'rabbit':'lion',fallen=striker==='lion'?'rabbit':'lion';
  while(m.phase==='intro')v.step();for(let i=0;i<40;i++)v.step();
  m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.plan=[];}
  m.fighters[fallen].condition=20;m.fighters[striker].burst.charge=1;
  let k=0;while(!m.requestFinisher(striker)&&k++<120)v.step();assert.equal(m.fighters[striker].burst.charge,0);
  for(let i=0;i<150&&!m.result;i++){v.step();for(const c of Object.values(v.coaches))assert.equal(c.root.scale.x,1,'scale 1 inside the mirrored cast');}
  assert.ok(m.result,species+': the finisher lands on an undefended hurt Opponent');
  assert.equal(m.result.method,'KO');assert.equal(m.result.winner,striker);assert.equal(m.result.finisher,'sunday_punch');assert.ok(m.fighters[fallen].condition<=0);
  assert.ok(!m.events.some(e=>e.type==='knockdown'),'no count');
  assert.ok(m.finisherHold()&&m.snapshot().finisher.hold,'the result waits while the knockout plays');const phaseTime=m.phaseTime;
  const c=v.coaches[fallen],start=c.root.position.clone();let peakLift=0,minDuring=Infinity;
  while(m.time-m.result.finisherTime<4.2){v.step();const u=m.time-m.result.finisherTime;
   if(u<.24)peakLift=Math.max(peakLift,Math.min(c.joints.footL.getWorldPosition(V()).y,c.joints.footR.getWorldPosition(V()).y));
   if(Math.round(u*60)%9===0){minDuring=Math.min(minDuring,skinLow(c));for(const r of Object.values(v.coaches))assert.equal(r.root.scale.x,1);}
  }
  assert.ok(!m.finisherHold()&&m.phaseTime>0&&phaseTime<.05,'the phase clock waited, then the result went on');
  const pelvis=c.joints.hips.getWorldPosition(V()).y,head=c.joints.head.getWorldPosition(V()).y,low=skinLow(c),chest=c.joints.chest.getWorldPosition(V()).y;
  console.log(species,'fallen',fallen,{pelvis:+pelvis.toFixed(3),chest:+chest.toFixed(3),head:+head.toFixed(3),skinLow:+low.toFixed(3),minDuringFall:+minDuring.toFixed(3),feetOffCanvas:+peakLift.toFixed(3),travel:+start.distanceTo(c.root.position).toFixed(2)});
  assert.ok(pelvis>.05&&pelvis<.30,'pelvis rests low, on the canvas');assert.ok(head>.05&&head<.36,'head down on the canvas');assert.ok(Math.abs(pelvis-head)<.2,'lying flat');
  assert.ok(low>=-.006,'no part sinks through the canvas');assert.ok(low<=.02,'not hovering: the body touches the canvas');assert.ok(minDuring>=-.03,'no sinking while falling');
  assert.ok(peakLift>.17,'the feet leave the canvas briefly (ankles above their standing height)');
  // still lying through the ceremony
  for(let i=0;i<120;i++)v.step();assert.ok(c.joints.hips.getWorldPosition(V()).y<.31,'stays down');
  const ends=[...Object.values(v.coaches)];arena.setTarget('none');for(const r of ends)assert.equal(r.root.scale.x,-1,'root scale restored (-1) when the bout view goes');
  checked++;
 }
 assert.equal(checked,2);
 console.log('PASS rigs: finisher lands, KO recorded without a count, fallen fighter flat on the canvas (lion and rabbit), scale restored');
}
