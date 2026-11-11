/* GOTR-0032 (reopened): glove speed at contact in every mode — Play and automatic, mitts, heavy bag, fights.
   "Approach" = speed of the striking knuckle over the last tick before the contact tick (120 Hz for training,
   60 Hz fight ticks); "closing" = the contact event's own closing speed. Also flags single-tick spikes
   (a tick faster than 1.8x both neighbours and > 12 m/s) in the 0.3 s before contact.
   Usage (repo root): node qa/gotr-0032/speeds.cjs out.json   env SECONDS (automatic modes, default 12) */
const fs=require('fs'),path=require('path');
const {engine,bout}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
require('vm').runInThisContext(fs.readFileSync('padding-deformation.js','utf8'),{filename:'padding-deformation.js'});window.BoxingPadding.enable();
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),rear=m=>['cross','rear_hook','rear_uppercut'].includes(m),r2=x=>x==null?null:Math.round(x*100)/100;
const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
function station(target,play,seconds){
 const e=engine('lion'),dt=1/120,out=[];e.targetMode=target==='pads'?'pads':target;e.player.setEnabled(play);e.arena.setTarget(target);e.technique='combo';e.currentAnim='one_two';
 const knuckle=i=>e.coach.root.localToWorld(V(...e.coach.metrics.gloves[i].strikePoint));let t=0,hist=[[],[]];const step=()=>{t+=dt;e.animTime=t;const f=e.arena.update(t,e.technique,e.currentAnim);for(const i of [0,1]){hist[i].push(knuckle(i));if(hist[i].length>40)hist[i].shift();}return f;};
 const record=(f,move)=>{for(const c of f.contacts||[]){if(c.actor!=='lion'||['lion','platform'].includes(c.receiver))continue;const i=rear(c.move||move)?1:0,h=hist[i],n=h.length;const sp=k=>h[k].distanceTo(h[k-1])/dt,speeds=[];for(let k=1;k<n;k++)speeds.push(sp(k));
  const spikes=speeds.slice(-36).filter((s,k,a)=>k>0&&k<a.length-1&&s>12&&s>1.8*a[k-1]&&s>1.8*a[k+1]).length;out.push({move:c.move||move,approach:r2(speeds[speeds.length-2]),closing:r2(c.closingSpeed),spikes});}};
 for(let i=0;i<144;i++)step();
 if(play){for(const move of moves){e.player.reset();e.player.press(move);for(let i=0;i<Math.round(1.6/dt);i++)record(step(),move);}}
 else for(let i=0;i<Math.round(seconds/dt);i++)record(step());
 return out;
}
function fights(play,seeds){
 const out=[];const press=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 for(const seed of seeds){let i=0;const script=play?(view,e,actor)=>{const m=view.match,f=m.fighters[actor];if(m.phase==='round'&&!f.action&&!m.playerQueue.length&&!f.down){if(e.player.press(press[i%press.length]))i++;}}:null;
  const b=bout({seed,mode:play?'play':'watch',script});for(const r of b.records)if(r.landed&&(!play||r.player))out.push({move:r.move,approach:r2(r.approach),closing:r2(r.speed),actor:r.actor});}
 return out;
}
function summary(list){const by={};for(const r of list)(by[r.move]=by[r.move]||[]).push(r);const res={};for(const m of moves){const rs=by[m]||[];if(!rs.length)continue;const a=rs.map(r=>r.approach).sort((x,y)=>x-y),c=rs.map(r=>r.closing).sort((x,y)=>x-y);res[m]={n:rs.length,approachMin:a[0],approachMedian:a[a.length>>1],closingMedian:c[c.length>>1],spikes:rs.reduce((s,r)=>s+(r.spikes||0),0)};}return res;}
if(require.main===module){
 const file=process.argv[2],seconds=+(process.env.SECONDS||12),report={};
 const cases={'mitts-auto':()=>station('pads',false,seconds),'mitts-play':()=>station('pads',true),'bag-auto':()=>station('heavy',false,seconds),'bag-play':()=>station('heavy',true),'fight-auto':()=>fights(false,[3,11]),'fight-play':()=>fights(true,[3])};
 for(const [name,run] of Object.entries(cases)){if(process.env.CASES&&!process.env.CASES.split(',').includes(name))continue;const s=summary(run());report[name]=s;console.log(name);for(const [m,v] of Object.entries(s))console.log('  '+m.padEnd(14),JSON.stringify(v));}
 if(file)fs.writeFileSync(file,JSON.stringify(report,null,1));
}
