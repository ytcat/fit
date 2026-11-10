/* GOTR-0018 measurement: straight-punch geometry at the contact frame in real
   seeded fights. Usage: node qa/gotr-0018/measure.cjs [out.json] [label]
   Cases: watch (AI vs AI), play-lion / play-rabbit (scripted player presses). */
const fs=require('fs'),vm=require('vm'),path=require('path');process.chdir(path.join(__dirname,'..','..'));
global.THREE=require(path.resolve('assets/vendor/three.min.js'));global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','boxing-input.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),deg=THREE.MathUtils.radToDeg,rearMove=m=>['cross','rear_hook','rear_uppercut'].includes(m),straight=r=>r.move==='jab'||r.move==='cross';
function engine(){const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:false,technique:'combo',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);return e;}
function arm(view,actor,side){
 const c=view.coaches[actor],g=view.arena.group,L=j=>g.worldToLocal(j.getWorldPosition(V()));
 const s=L(c.joints['arm'+side]),el=L(c.joints['elbow'+side]),w=L(c.joints['hand'+side]),upper=c.joints['elbow'+side].position.length(),fore=c.joints['hand'+side].position.length();
 return {elbow:deg(s.clone().sub(el).angleTo(w.clone().sub(el))),extension:s.distanceTo(w)/(upper+fore),shoulder:s,wrist:w};
}
function geometry(view){
 const g=view.arena.group,L=j=>g.worldToLocal(j.getWorldPosition(V())),a=view.coaches.lion,b=view.coaches.rabbit;
 const flat=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);
 return {root:flat(a.root.position,b.root.position),chest:flat(L(a.joints.chest),L(b.joints.chest)),head:flat(L(a.joints.head),L(b.joints.head))};
}
// Runs one bout and returns one record per punch thrown (all six moves).
function bout({seed,mode,species='lion',script,preset='quick',mutate}){
 const e=engine();if(species==='rabbit')e.roster.select('rabbit');
 e.player.setEnabled(mode==='play');e.targetMode='fight';e.fightOptions={preset,seed};e.arena.setTarget('fight');
 const view=e.arena.fightView,m=view.match,records=[],open={};let frame=0,pressIndex=0;mutate?.(view);
 const playerActor=mode==='play'?e.player.actor():null;
 while(!m.result&&frame<60*90){
  if(mode==='play'&&m.phase==='round'&&script){const f=m.fighters[playerActor];if(!f.action&&!m.playerQueue.length&&!f.down){const id=script[pressIndex%script.length];if(e.player.press(id))pressIndex++;}}
  view.step();frame++;
  for(const actor of ['lion','rabbit']){
   const a=m.fighters[actor].action,o=open[actor];
   if(o&&(!a||a.id!==o.id)){records.push(o);delete open[actor];}
   if(a?.attack){
    const side=rearMove(a.move)?'R':'L',now=arm(view,actor,side),geo=geometry(view);
    const r=open[actor]||(open[actor]={seed,mode,species,id:a.id,actor,player:actor===playerActor,move:a.move,target:a.target,start:m.time,startGeometry:geo,peakElbow:0,peakExtension:0,minChest:Infinity,landed:false});
    if(now.elbow>r.peakElbow){r.peakElbow=now.elbow;r.peakExtension=now.extension;}r.minChest=Math.min(r.minChest,geo.chest);
   }
  }
  for(const c of view.contacts){
   const r=open[c.actor];if(!r||r.id!==c.action)continue;
   const side=rearMove(c.move)?'R':'L',now=arm(view,c.actor,side),geo=geometry(view);
   Object.assign(r,{landed:true,part:c.part,legal:c.legal,blocked:c.blocked,clean:c.legal&&!c.blocked,contactTime:m.time,phase:view.specs[c.actor].phase,elbow:now.elbow,extension:now.extension,root:geo.root,chest:geo.chest,head:geo.head,speed:c.speed,receiverMove:view.specs[c.receiver].move,receiverAttack:!!view.specs[c.receiver].attack});
  }
 }
 for(const o of Object.values(open))records.push(o);
 return {records,result:m.result,totals:m.totals,frames:frame};
}
const q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return s[l]+(s[h]-s[l])*(i-l);};
const r1=x=>x==null?null:Math.round(x*10)/10,r3=x=>x==null?null:Math.round(x*1000)/1000;
function summary(records){
 const d=xs=>({n:xs.length,min:r1(q(xs,0)),p10:r1(q(xs,.1)),median:r1(q(xs,.5)),p90:r1(q(xs,.9)),max:r1(q(xs,1))}),d3=xs=>({min:r3(q(xs,0)),median:r3(q(xs,.5)),max:r3(q(xs,1))});
 const row=rs=>!rs.length?{n:0}:{n:rs.length,elbow:d(rs.map(r=>r.elbow)),extensionPct:d(rs.map(r=>r.extension*100)),elbowGE150:rs.filter(r=>r.elbow>=150).length,elbowLT120:rs.filter(r=>r.elbow<120).length,extGE85:rs.filter(r=>r.extension>=.85).length,root:d3(rs.map(r=>r.root)),chest:d3(rs.map(r=>r.chest)),phase:d3(rs.map(r=>r.phase))};
 const moves={};for(const r of records){const t=moves[r.move]||(moves[r.move]={thrown:0,clean:0,blocked:0,other:0,missed:0});t.thrown++;t[!r.landed?'missed':r.clean?'clean':r.blocked?'blocked':'other']++;}
 records=records.filter(straight);
 const landed=records.filter(r=>r.landed),clean=landed.filter(r=>r.clean),out={moves,thrown:records.length,landed:landed.length,clean:row(clean),blocked:row(landed.filter(r=>r.blocked)),other:row(landed.filter(r=>!r.clean&&!r.blocked))};
 for(const [k,f] of Object.entries({cleanHead:r=>r.part==='head',cleanBody:r=>r.part==='body',cleanJab:r=>r.move==='jab',cleanCross:r=>r.move==='cross',cleanLion:r=>r.actor==='lion',cleanRabbit:r=>r.actor==='rabbit',cleanPlayer:r=>r.player,cleanAI:r=>!r.player,cleanVsAttacking:r=>r.receiverAttack,cleanVsNotAttacking:r=>!r.receiverAttack}))out[k]=row(clean.filter(f));
 return out;
}
module.exports={bout,summary,engine,arm,geometry};
if(require.main===module){
 const out=process.argv[2],label=process.argv[3]||'run',seeds=(process.env.SEEDS||'3,11,42,74,81,190,999,2024,7,91,1234,5150').split(',').map(Number),only=(process.env.CASES||'watch,play-lion,play-rabbit').split(',');
 const cases={watch:[],'play-lion':[],'play-rabbit':[]};
 for(const seed of seeds){
  if(only.includes('watch'))cases.watch.push(...bout({seed,mode:'watch'}).records);
  if(only.includes('play-lion'))cases['play-lion'].push(...bout({seed,mode:'play',species:'lion',script:['jab','cross','jab','jab','cross']}).records);
  if(only.includes('play-rabbit'))cases['play-rabbit'].push(...bout({seed,mode:'play',species:'rabbit',script:['jab','cross','jab','jab','cross']}).records);
 }
 const report={label,seeds,cases:Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,summary(v)]))};
 for(const [k,v] of Object.entries(report.cases)){if(!v.thrown)continue;console.log('==',label,k,'straights thrown',v.thrown,'landed',v.landed,'moves',JSON.stringify(v.moves));for(const key of Object.keys(v))if(typeof v[key]==='object'&&v[key].n)console.log(' ',key.padEnd(20),'n',String(v[key].n).padStart(3),'elbow',JSON.stringify(v[key].elbow),'ext%',JSON.stringify(v[key].extensionPct),'>=150:',v[key].elbowGE150,'<120:',v[key].elbowLT120,'chest',JSON.stringify(v[key].chest),'root',JSON.stringify(v[key].root),'phase',JSON.stringify(v[key].phase));}
 if(out)fs.writeFileSync(out,JSON.stringify({report,records:cases},null,1));
}
