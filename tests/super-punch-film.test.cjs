// Super Punch film (owner 2026-11-22): a knockout film that differs per fight (camera choreography, winner celebration), slow
// motion from the glove contact, the face squash, the blackout with the K.O. beat, and endings by scene: the referee (or Bruno)
// raises the winner's hand in the ring and the gym; in ringless venues (street / market, docks, underground) nobody does and
// the crowd ends it. Pure rules first, then on the real rigs (ring, docks and street).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
const store=new Map();global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','ringless-venues.js','adventure/story/paws.js','adventure/story/dream-pose.js','super-punch-film.js','sunday-punch.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const F=SuperPunchFilm,V=(x,y,z)=>new THREE.Vector3(x,y,z);

/* 1. variants: deterministic per fight, different across fights, never the same twice in a row */
{
 const pick=(seed,place='ring',opponent='rabbit',last=null)=>F.choose({seed,place,venue:place,opponent,striker:'lion',last});
 assert.deepEqual(pick(7),pick(7),'the same fight always gives the same film');
 const cams=new Set(),cels=new Set();for(let s=1;s<=16;s++){const p=pick(s);cams.add(p.camera);cels.add(p.celebrate);assert.ok(F.CAMERAS.includes(p.camera)&&F.CELEBRATIONS.includes(p.celebrate));}
 assert.ok(cams.size>=4,'at least four camera choreographies across 16 fights: '+[...cams]);assert.ok(cels.size>=4,'at least four celebrations across 16 fights: '+[...cels]);
 assert.ok(new Set(['street','docks','underground','ring'].map(v=>pick(3,v).camera+pick(3,v).celebrate)).size>=3,'the venue changes the film');
 // consecutive fights: the last film is remembered (localStorage) and never repeated, even for the same fight
 let last=null;for(let i=0;i<12;i++){const p=F.choose({seed:5,place:'ring',venue:'ring',opponent:'rabbit',striker:'lion'});if(last){assert.notEqual(p.camera,last.camera,'camera differs from the last finisher film');assert.notEqual(p.celebrate,last.celebrate,'celebration differs from the last one');}F.writeLast(p);last=p;}
 assert.equal(JSON.parse(localStorage.getItem(F.LAST)).camera,last.camera);
 console.log('PASS variants: cameras',[...cams].join(','),'| celebrations',[...cels].join(','));
}

/* 2. scene endings: who stops it, who raises the hand, what the crowd does */
{
 assert.deepEqual([F.ending('ring').referee,F.ending('ring').raise],['ring',true],'ring: the referee raises the hand');
 assert.deepEqual([F.ending('gym').referee,F.ending('gym').raise],['bruno',true],'gym: Coach Bruno raises the hand');
 for(const id of RinglessVenues.ids){const e=F.ending(id);assert.equal(e.referee,null,id+': no referee');assert.equal(e.raise,false,id+': nobody raises the hand');assert.ok(e.crowd,id+': the crowd ends it');for(const l of ['en','he','ru'])assert.ok(e.line[l]?.length>10,id+' line '+l);}
 assert.equal(F.ending('street').crowd,'cheer');assert.equal(F.ending('docks').crowd,'close');assert.equal(F.ending('underground').crowd,'roar');
 const fang=F.ending('street','fang'),rourke=F.ending('docks','rourke');
 assert.equal(fang.fallen,'crawl','market: Fang comes to and crawls away');assert.match(fang.line.en,/Fang/);assert.match(fang.line.he,/פאנג/);assert.match(fang.line.ru,/Фанг/);
 assert.equal(rourke.fallen,'out');assert.equal(rourke.crowd,'close');assert.match(rourke.line.en,/Rourke/);
 assert.equal(F.ending('ring','fang').referee,'ring','a story Opponent in a ring keeps the referee');
 console.log('PASS endings: ring/gym raise the hand; street cheers (Fang crawls away), docks close in (Rourke), basement roars');
}

/* 3. timing: slow motion from the glove contact, the face squash, the blackout with the K.O. beat, the hold */
{
 assert.equal(F.timeScale(null,true),F.SLOW_DIP);assert.equal(F.timeScale(null,false),1);assert.ok(F.SLOW_DIP>.5,'only a touch slow before the contact');
 assert.equal(F.timeScale(0,true),F.SLOW_HIT);assert.ok(F.SLOW_HIT<=.15,'very slow from the contact');assert.equal(F.timeScale(.6,true),1,'real time as the body goes');
 let peak=0,at=0;for(let u=0;u<=.5;u+=.002){const d=F.squash(u);if(d>peak){peak=d;at=u;}}
 assert.ok(peak>.025&&peak<.04&&at<.03,'the jaw squashes on the impact frame: '+peak.toFixed(3)+' m at '+at.toFixed(3));assert.ok(F.squash(.03)>0&&Math.min(...[.06,.08,.1,.12].map(F.squash))<0,'it rebounds and wobbles');assert.equal(F.squash(.5),0);
 const [a,b,c,d]=F.FILM.black;assert.ok(a>1.6&&a<F.FILM.celebrate&&F.FILM.celebrate<c,'the blackout follows the landing; the winner takes his place inside it');
 assert.equal(F.blackout(1).black,0);assert.equal(F.blackout((b+c)/2).black,1);assert.ok(F.blackout((b+c)/2).ko,'K.O. on the black');assert.equal(F.blackout(d+.01).black,0);assert.ok(F.blackout((a+b)/2).black>0&&F.blackout((a+b)/2).black<1,'a fade, not a cut');
 const m=new BoxingFight({seed:1});m.result={finisher:'sunday_punch',finisherTime:0};m.time=F.FILM.hold-.01;assert.ok(m.finisherHold(),'the result waits for the whole film');m.time=F.FILM.hold+.01;assert.ok(!m.finisherHold());
 assert.ok(F.FILM.hold-F.FILM.celebrate>=2.5,'at least 2.5 s of celebration before the result');
 console.log('PASS timing: slow',F.SLOW_HIT,'from contact; squash peak',peak.toFixed(3),'m; blackout',F.FILM.black.join('-'),'s; hold',F.FILM.hold,'s');
}

/* 4. celebrations: every variant poses both arms; mirrored per fight; the camera choreographies are distinct */
{
 for(const name of F.CELEBRATIONS)for(const c of [0,.4,1,1.6,2.4])for(const m of [1,-1]){const st=F.celebrate(name,c,m);for(const s of ['L','R']){assert.ok(st.arms[s],name+' arm '+s);if(st.reach[s])assert.ok(st.reach[s].every(Number.isFinite)&&st.reach[s][1]>.9&&st.reach[s][1]<2.15,name+' reach');}assert.ok([st.lift,st.drop,st.lean,st.yaw].every(Number.isFinite));}
 const up=F.celebrate('arms_up',1);assert.ok(up.reach.L[1]>1.9&&up.reach.R[1]>1.9&&up.reach.R[0]>.4&&up.reach.L[0]<-.4,'arms up and out in a V');
 const flex=F.celebrate('double_biceps',1);assert.equal(flex.arms.L,'flex');assert.ok(Math.abs(flex.reach.R[0])>.3,'fists out by the ears, elbows out');
 assert.notDeepEqual(F.celebrate('point_crowd',.8,1).reach,F.celebrate('point_crowd',.8,-1).reach,'mirrored per fight');
 const shots=new Set(F.CAMERAS.map(n=>{const s=F.shot(n,.5,.05);return [s.az.toFixed(2),(s.h??s.el).toFixed(2)].join();}));assert.equal(shots.size,F.CAMERAS.length,'five different camera placements on the impact');
 assert.ok(F.shot('overhead_drop',3,1.4).el>1,'the overhead drop ends looking down on the body');assert.ok(F.shot('low_orbit',.3,.02).h<.5,'the low orbit looks up at the punch');
 console.log('PASS celebrations',F.CELEBRATIONS.join(','),'and cameras',F.CAMERAS.join(','));
}

/* 5. on the rigs: ring (referee raises the hand), docks (no referee, the crowd closes in), every celebration clear of the body */
{
 SundayPunch.install(FightArena);
 const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
 const skinLow=c=>{let lo=Infinity;const p=c.skin.geometry.attributes.position;c.root.updateMatrixWorld(true);for(let i=0;i<p.count;i+=6)lo=Math.min(lo,c.root.localToWorld(c.skinPoint(c.skin,i)).y);return lo;};
 const clearOfBody=(c,label)=>{const prof=DreamPose.profile(c);c.root.updateMatrixWorld(true);for(const s of ['L','R']){const q=c.root.worldToLocal(c.joints['hand'+s].getWorldPosition(V())),d=DreamPose.clearance(c,prof,q,.03,0,s);assert.ok(!d||d.length()<.03,label+': hand '+s+' through the body '+(d&&d.length().toFixed(3)));
  assert.ok(c.joints['hand'+s].getWorldPosition(V()).distanceTo(c.joints.head.localToWorld(V(0,.12,.04)))>.15,label+': fist '+s+' through the head');}};
 for(const [venue,seed] of [[null,5],['docks',9]]){
  store.clear();
  const coach=new LionCoach(data,{species:'lion'}),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(50,.58,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);
  const arena=e.arena=new TrainingArena(e,data);e.fightOptions={seed,preset:'quick',finishers:{lion:['sunday_punch']}};arena.setTarget('fight');
  const v=arena.fightView,m=v.match,set={cheer:0,close:0};
  if(venue){assert.ok(RinglessVenues.install(v,venue));v.ringless.set=set;}
  while(m.phase==='intro')v.step();for(let i=0;i<40;i++)v.step();
  m.fighters.rabbit.condition=18;m.fighters.lion.burst.charge=1;let k=0;while(!m.requestFinisher('lion')&&k++<120)v.step();
  // the film runs through the arena's update (wall clock -> fight clock with the slow motion), as in the game
  let wall=v.tick/60;const tick=()=>{wall+=1/60;v.update(wall);};
  for(let i=0;i<400&&!m.result;i++)tick();
  assert.ok(m.result?.finisher,(venue||'ring')+': the Super Punch lands');const sp=v.sundayPunch;
  // slow motion from the contact: fight time advances at SLOW_HIT per wall second right after the impact
  const t0=m.time,w0=wall;for(let i=0;i<12;i++)tick();assert.ok((m.time-t0)/(wall-w0)<.2,'slow motion after the contact: '+((m.time-t0)/(wall-w0)).toFixed(2));
  assert.ok(v.coaches.rabbit.surfaceDent||m.time-m.result.finisherTime>.45,'the jaw dent is on');
  const fallen=v.coaches.rabbit,winner=v.coaches.lion;let refSeen=false;
  while(m.time-m.result.finisherTime<F.FILM.hold+.2){tick();const u=m.time-m.result.finisherTime;
   if(u>F.FILM.celebrate+.4){assert.ok(skinLow(winner)>-.012,'winner: feet on the floor, not through it');if(venue)assert.equal(v.referee.root.visible,false,'no referee in a ringless fight');else refSeen=refSeen||v.referee.root.visible;}}
  if(!venue)assert.ok(refSeen,'ring: the referee is there for the celebration');
  // ending
  for(let i=0;i<200;i++)tick();
  const hand=winner.joints[sp.striker.raise==='R'?'handR':'handL'].getWorldPosition(V());
  if(venue){assert.equal(v.referee.root.visible,false,'nobody comes to raise his hand');assert.ok(set.close>.5&&set.cheer>=1,'the dock crowd cheers and closes in: '+JSON.stringify(set));assert.equal(sp.film.ending.raise,false);}
  else{const ref=v.referee.root.getWorldPosition(V()),w=winner.root.getWorldPosition(V());assert.ok(v.referee.root.visible&&Math.hypot(ref.x-w.x,ref.z-w.z)<1.3,'ring: the referee beside the winner');assert.ok(hand.y>1.75,'ring: the winner\'s arm raised high ('+hand.y.toFixed(2)+')');}
  console.log(venue||'ring','film',sp.film.camera,sp.film.celebrate,sp.film.ending.id,{raisedHand:+hand.y.toFixed(2),crowd:venue?set:null});
  // every celebration on the rig: hands clear of the torso and the head, the feet on the floor
  if(!venue){for(const name of F.CELEBRATIONS){sp.film={...sp.film,celebrate:name};for(let i=0;i<70;i++){tick();if(i%10===9){clearOfBody(winner,name);assert.ok(skinLow(winner)>-.015&&skinLow(winner)<.12,name+': on the floor');}}}console.log('PASS every celebration clear of the body on the lion');}
  arena.setTarget('none');for(const r of [winner,fallen])assert.equal(r.root.scale.x,-1);
 }
 console.log('PASS rigs: ring raises the hand, docks without a referee (crowd closes in), slow motion from contact, squash on');
}
