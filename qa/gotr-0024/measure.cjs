/* GOTR-0024 / GOTR-0025 punch feel measurement (headless, deterministic).
   Usage (repo root): node qa/gotr-0024/measure.cjs out.json [label]
   env SEEDS=3,11,42  CASES=watch,play-lion,play-rabbit,combo-lion,combo-rabbit,training
   Per punch: time start->contact, action duration, striking-glove peak speed and
   speed in the frame before contact, recorded contact speed, target head
   displacement / speed / rotation after a clean hit, guard jolt after a block,
   and the gaps between linked punches. Positions are arena-local metres. */
const fs=require('fs'),vm=require('vm'),path=require('path');process.chdir(path.join(__dirname,'..','..'));
global.THREE=require(path.resolve('assets/vendor/three.min.js'));global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),rear=m=>['cross','rear_hook','rear_uppercut'].includes(m),deg=THREE.MathUtils.radToDeg;
const r2=x=>x==null?null:Math.round(x*100)/100,r3=x=>x==null?null:Math.round(x*1000)/1000;
function engine(species='lion'){const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);if(species==='rabbit')e.roster.select('rabbit');return e;}
const dt=1/60;
function headState(view,actor){
 const c=view.coaches[actor],g=view.arena.group,L=n=>g.worldToLocal(n.getWorldPosition(V()));
 const rootQ=c.root.getWorldQuaternion(new THREE.Quaternion()),headQ=rootQ.clone().invert().multiply(c.joints.head.getWorldQuaternion(new THREE.Quaternion())),chestQ=rootQ.clone().invert().multiply(c.joints.chest.getWorldQuaternion(new THREE.Quaternion()));
 return {head:L(c.joints.head),root:c.root.position.clone(),headQ,chestQ,hands:{L:c.root.worldToLocal(c.joints.handL.getWorldPosition(V())),R:c.root.worldToLocal(c.joints.handR.getWorldPosition(V()))}};
}
// One fight; script(view,e) may press inputs each frame.
function bout({seed,mode,species='lion',script,preset='quick'}){
 const e=engine(species);e.player.setEnabled(mode==='play');e.targetMode='fight';e.fightOptions={preset,seed};e.arena.setTarget('fight');
 const view=e.arena.fightView,m=view.match,records=[],open={},follow=[],knuckle={},history={lion:[],rabbit:[]},playerActor=mode==='play'?e.player.actor():null;let frame=0;
 while(!m.result&&frame<60*60){
  script?.(view,e,playerActor);
  view.step();frame++;
  const states={lion:headState(view,'lion'),rabbit:headState(view,'rabbit')};
  for(const actor of ['lion','rabbit']){
   for(const side of ['L','R']){const k=actor+side,p=view.previous[k].clone(),old=knuckle[k];knuckle[k]={p,v:old?p.distanceTo(old.p)/dt:0,prev:old};}
   const a=m.fighters[actor].action,o=open[actor];
   if(o&&(!a||a.id!==o.id)){o.end=m.time;records.push(o);delete open[actor];}
   if(a?.attack){
    const side=rear(a.move)?'R':'L',v=knuckle[actor+side].v;
    const r=open[actor]||(open[actor]={seed,mode,species,actor,player:actor===playerActor,id:a.id,move:a.move,target:a.target,start:a.start,duration:a.duration,planLeft:m.fighters[actor].plan.length,combo:a.combo?{...a.combo}:null,peak:0,landed:false});
    if(!r.landed)r.peak=Math.max(r.peak,v);
   }else if(a&&!o){/* defence or step: not a punch */}
  }
  for(const c of view.contacts){
   const r=open[c.actor];if(!r||r.id!==c.action)continue;const side=rear(c.move)?'R':'L',k=knuckle[c.actor+side];
   Object.assign(r,{landed:true,part:c.part,blocked:c.blocked,clean:c.legal&&!c.blocked,contactTime:m.time,toContact:m.time-r.start,speed:c.speed,approach:k.prev?.v??0,severity:c.severity});
   const s=states[c.receiver];follow.push({r,receiver:c.receiver,side:c.side<0?'L':'R',t0:m.time,head0:s.head.clone(),root0:s.root.clone(),headQ0:s.headQ.clone(),chestQ0:s.chestQ.clone(),hand0:null,last:s.head.clone(),maxHead:0,maxHeadRel:0,peakHeadSpeed:0,maxRot:0,maxChestRot:0,maxGuard:0,peakGuardSpeed:0,lastHand:null});
  }
  for(const f of follow){
   if(f.done)continue;const s=states[f.receiver],age=m.time-f.t0;if(age>.40){f.done=true;continue;}
   const hand=s.hands[f.side];if(!f.hand0)f.hand0=hand.clone();
   f.maxHead=Math.max(f.maxHead,s.head.distanceTo(f.head0));
   f.maxHeadRel=Math.max(f.maxHeadRel,s.head.clone().sub(s.root).distanceTo(f.head0.clone().sub(f.root0)));
   f.peakHeadSpeed=Math.max(f.peakHeadSpeed,s.head.distanceTo(f.last)/dt);f.last=s.head.clone();
   f.maxRot=Math.max(f.maxRot,deg(s.headQ.angleTo(f.headQ0)));f.maxChestRot=Math.max(f.maxChestRot,deg(s.chestQ.angleTo(f.chestQ0)));
   f.maxGuard=Math.max(f.maxGuard,hand.distanceTo(f.hand0));if(f.lastHand)f.peakGuardSpeed=Math.max(f.peakGuardSpeed,hand.distanceTo(f.lastHand)/dt);f.lastHand=hand.clone();
   Object.assign(f.r,{headMove:f.maxHead,headMoveRel:f.maxHeadRel,headSpeed:f.peakHeadSpeed,headRot:f.maxRot,chestRot:f.maxChestRot,guardJolt:f.maxGuard,guardSpeed:f.peakGuardSpeed});
  }
 }
 for(const o of Object.values(open)){o.end=m.time;records.push(o);}
 records.sort((a,b)=>a.start-b.start);
 return {records,winner:m.result?.winner??null,method:m.result?.method,health:{lion:r2(m.fighters.lion.condition),rabbit:r2(m.fighters.rabbit.condition)},totals:{lion:{thrown:m.totals.lion.thrown,landed:m.totals.lion.landed},rabbit:{thrown:m.totals.rabbit.thrown,landed:m.totals.rabbit.landed}},frames:frame};
}
const q=(xs,p)=>{xs=xs.filter(x=>x!=null&&isFinite(x));if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return s[l]+(s[h]-s[l])*(i-l);};
const med=xs=>r3(q(xs,.5));
function perMove(records){
 const out={};
 for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
  const rs=records.filter(r=>r.move===move),landed=rs.filter(r=>r.landed),clean=landed.filter(r=>r.clean),blocked=landed.filter(r=>r.blocked);
  if(!rs.length)continue;
  out[move]={thrown:rs.length,landed:landed.length,clean:clean.length,blocked:blocked.length,
   toContact:med(landed.map(r=>r.toContact)),duration:med(rs.map(r=>r.duration)),peakGlove:med(landed.map(r=>r.peak)),approach:med(landed.map(r=>r.approach)),approachOverPeak:med(landed.map(r=>r.peak>0?r.approach/r.peak:null)),contactSpeed:med(landed.map(r=>r.speed)),
   cleanHeadMove:med(clean.map(r=>r.headMove)),cleanHeadMoveRel:med(clean.map(r=>r.headMoveRel)),cleanHeadSpeed:med(clean.map(r=>r.headSpeed)),cleanHeadRot:med(clean.map(r=>r.headRot)),cleanChestRot:med(clean.map(r=>r.chestRot)),
   blockedGuardJolt:med(blocked.map(r=>r.guardJolt)),blockedGuardSpeed:med(blocked.map(r=>r.guardSpeed)),blockedChestRot:med(blocked.map(r=>r.chestRot))};
 }
 return out;
}
// Consecutive attacks of one actor inside one AI plan / one player combo.
function links(records){
 const by={};for(const r of records)(by[r.actor]=by[r.actor]||[]).push(r);const gaps=[],starts=[],contacts=[];
 for(const rs of Object.values(by))for(let i=1;i<rs.length;i++){const a=rs[i-1],b=rs[i];const linked=a.combo?b.combo&&b.combo.id===a.combo.id&&b.combo.step===a.combo.step+1:a.planLeft>0&&b.start-a.end<.25;if(!linked)continue;gaps.push(b.start-a.end);starts.push(b.start-a.start);if(a.landed&&b.landed)contacts.push(b.contactTime-a.contactTime);}
 return {n:starts.length,gap:med(gaps),startToStart:med(starts),contactToContact:med(contacts)};
}
function combos(records){
 const groups={};for(const r of records)if(r.combo){const k=r.actor+'|'+r.combo.id+'|'+r.start;}
 // group consecutive steps 1..total
 const out={};let cur=null;
 for(const r of records.filter(r=>r.combo&&r.player)){
  if(r.combo.step===1){cur={id:r.combo.id,total:r.combo.total,start:r.start,steps:[r]};}
  else if(cur&&r.combo.id===cur.id&&r.combo.step===cur.steps.length+1)cur.steps.push(r);
  if(cur&&cur.steps.length===cur.total){const o=out[cur.id]||(out[cur.id]={n:0,total:[],firstContact:[],landed:0,punches:0});o.n++;o.total.push(cur.steps.at(-1).end-cur.start);const fc=cur.steps.find(s=>s.landed);if(fc)o.firstContact.push(fc.contactTime-cur.start);o.landed+=cur.steps.filter(s=>s.landed).length;o.punches+=cur.total;cur=null;}
 }
 for(const o of Object.values(out)){o.total=med(o.total);o.firstContact=med(o.firstContact);}
 return out;
}
// Training: each punch pressed alone after settling (heavy bag / mitts), Play mode.
function training(target,species){
 const e=engine(species),res={};
 for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
  e.targetMode=target==='pads'?'none':target;e.player.setEnabled(true);e.animTime=0;e.arena.setTarget(target);e.player.reset();let t=0;
  for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t);}
  const coach=e.coach,side=rear(move)?'R':'L',K=()=>e.arena.group.worldToLocal(coach.joints['hand'+side].getWorldPosition(V()));
  if(!e.player.press(move)){res[move]={pressed:false};continue;}
  const t0=t;let last=K(),peak=0,approach=null,contact=null,speeds=[];
  for(let i=0;i<150;i++){t+=1/120;e.animTime=t;const f=e.arena.update(t);const p=K(),v=p.distanceTo(last)*120;speeds.push(v);last=p;if(!contact)peak=Math.max(peak,v);const hit=(f.contacts||[]).find(h=>h.actor!=='rabbit'&&h.receiver!=='lion');if(hit&&!contact){contact={t:t-t0,closing:hit.closingSpeed,impulse:hit.impulse};approach=speeds.at(-2);}}
  res[move]={toContact:r3(contact?.t),closing:r3(contact?.closing),wristPeak:r3(peak),wristApproach:r3(approach),duration:r3(BoxingInput.durations[move])};
 }
 return res;
}
module.exports={bout,perMove,links,combos,training,engine};
if(require.main===module){
 const out=process.argv[2],label=process.argv[3]||'run',seeds=(process.env.SEEDS||'3,11,42').split(',').map(Number),only=(process.env.CASES||'watch,play-lion,play-rabbit,combo-lion,combo-rabbit,training').split(',');
 const singles=['jab','cross','hook','jab','rear_uppercut','cross','rear_hook','uppercut'];
 const press=list=>{let i=0;return (view,e,actor)=>{const m=view.match,f=m.fighters[actor];if(m.phase==='round'&&!f.action&&!m.playerQueue.length&&!m.pendingPlayerCombo&&!f.down){if(e.player.press(list[i%list.length]))i++;}};};
 const comboList=['combo_one_two','combo_three','combo_upper','combo_super'];
 const report={label,seeds,cases:{},bouts:{}};
 const cases={watch:{mode:'watch'},'play-lion':{mode:'play',species:'lion',list:singles},'play-rabbit':{mode:'play',species:'rabbit',list:singles},'combo-lion':{mode:'play',species:'lion',list:comboList},'combo-rabbit':{mode:'play',species:'rabbit',list:comboList}};
 for(const [name,c] of Object.entries(cases)){if(!only.includes(name))continue;const all=[];report.bouts[name]=[];
  for(const seed of seeds){const b=bout({seed,mode:c.mode,species:c.species,script:c.list?press(c.list):null});all.push(...b.records);report.bouts[name].push({seed,winner:b.winner,method:b.method,health:b.health,totals:b.totals});process.stderr.write(name+' '+seed+' '+b.winner+' '+JSON.stringify(b.health)+'\n');}
  report.cases[name]={moves:perMove(all.filter(r=>c.mode==='watch'||r.player)),links:links(all.filter(r=>c.mode==='watch'||r.player)),combos:combos(all)};
 }
 if(only.includes('training'))for(const target of ['heavy','pads'])for(const species of ['lion','rabbit'])report.cases['train-'+target+'-'+species]=training(target,species);
 report.static={inputDurations:BoxingInput.durations,comboTotals:Object.fromEntries(Object.entries(BoxingInput.combos).filter(([k])=>!k.startsWith('combo_speed')).map(([k,ids])=>[k,null])),routineTimings:Object.fromEntries(Object.entries(BOXING_ROUTINES.timings).map(([k,v])=>[k,r3(v.reduce((a,b)=>a+b,0))]))};
 console.log(JSON.stringify(report.cases,null,1));
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,1));
}
