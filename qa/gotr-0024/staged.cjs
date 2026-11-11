/* GOTR-0024 staged single punches in a fight (both species, every punch, open
   head / raised guard). Per frame around contact: striker phase, striking-glove
   speed, receiver head displacement and rotation. Usage:
   node qa/gotr-0024/staged.cjs [out.json] [--trace move]  */
const {engine}=require('./measure.cjs');
const fs=require('fs'),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),deg=THREE.MathUtils.radToDeg,rear=m=>['cross','rear_hook','rear_uppercut'].includes(m),r3=x=>x==null?null:Math.round(x*1000)/1000,r1=x=>x==null?null:Math.round(x*10)/10;
function stage(actor,move,situation,trace){
 const e=engine(actor==='lion'?'lion':'rabbit');e.player.setEnabled(false);e.targetMode='fight';e.fightOptions={seed:74,preset:'quick'};e.arena.setTarget('fight');
 const view=e.arena.fightView,m=view.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.tempo=1;f.reaction=null;}
 const receiver=actor==='lion'?'rabbit':'lion';
 const target=move.includes('uppercut')||move.includes('hook')?'head':'head';
 if(situation==='open')m.fighters[receiver].action={id:900,actor:receiver,move:'guard',guardStyle:'body',start:-1.75,duration:5,attack:false,defend:true};
 else m.fighters[receiver].action={id:900,actor:receiver,move:'guard',guardStyle:'high',start:-1.75,duration:5,attack:false,defend:true,brace:1};
 for(let i=0;i<20;i++)view.step();
 const g=view.arena.group,rc=view.coaches[receiver],side=rear(move)?'R':'L';
 const head=()=>g.worldToLocal(rc.joints.head.getWorldPosition(V())),headQ=()=>rc.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rc.joints.head.getWorldQuaternion(new THREE.Quaternion()));
 const hands=()=>({L:rc.root.worldToLocal(rc.joints.handL.getWorldPosition(V())),R:rc.root.worldToLocal(rc.joints.handR.getWorldPosition(V()))});
 m.attack(actor,move,target);const action=m.fighters[actor].action,start=m.time;
 let last=view.previous[actor+side].clone(),peak=0,hit=null,rows=[],h0=null,q0=null,hand0=null,maxHead=0,maxRot=0,maxGuard=0,peakHead=0,lastHead=null,approach=0,speeds=[];
 for(let i=0;i<70;i++){
  view.step();const p=view.previous[actor+side].clone(),v=p.distanceTo(last)*60;last=p;speeds.push(v);
  const c=view.contacts.find(x=>x.actor===actor);
  if(c&&!hit){hit={part:c.part,blocked:c.blocked,speed:c.speed,severity:c.severity,toContact:m.time-start,phase:view.specs[actor].phase};approach=speeds.at(-2)||0;h0=head();q0=headQ();hand0=hands()[c.side<0?'L':'R'];hit.side=c.side<0?'L':'R';}
  if(!hit)peak=Math.max(peak,v);
  if(hit&&m.time-start-hit.toContact<=.40){const hp=head();maxHead=Math.max(maxHead,hp.distanceTo(h0));maxRot=Math.max(maxRot,deg(headQ().angleTo(q0)));maxGuard=Math.max(maxGuard,hands()[hit.side].distanceTo(hand0));if(lastHead)peakHead=Math.max(peakHead,hp.distanceTo(lastHead)*60);lastHead=hp;}
  if(trace)rows.push({t:r3(m.time-start),phase:r3(view.specs[actor]?.phase),strike:r3(view.coaches[actor].metrics.strike),shift:r3(view.reach[actor].shift),glove:r3(v),contact:c?c.part+(c.blocked?'(blocked)':''):'',head:h0?r3(head().distanceTo(h0)):null,headRot:q0?r1(deg(headQ().angleTo(q0))):null});
 }
 return {actor,move,situation,...(hit||{}),toContact:r3(hit?.toContact),phase:r3(hit?.phase),speed:r3(hit?.speed),peak:r3(peak),approach:r3(approach),headMove:r3(maxHead),headRot:r1(maxRot),headSpeed:r3(peakHead),guardJolt:r3(maxGuard),duration:r3(action.duration),rows:trace?rows:undefined};
}
module.exports={stage};
if(require.main===module){
 const traceIndex=process.argv.indexOf('--trace');
 if(traceIndex>0){const move=process.argv[traceIndex+1],r=stage('lion',move,process.argv[traceIndex+2]||'open',true);console.table(r.rows);delete r.rows;console.log(JSON.stringify(r));return;}
 const out=[];
 for(const actor of ['lion','rabbit'])for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut'])for(const situation of ['open','guard']){const r=stage(actor,move,situation);out.push(r);console.log(JSON.stringify(r));}
 if(process.argv[2]&&!process.argv[2].startsWith('--'))fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
}
