// GOTR-0098: at the result the referee stands between the two fighters, holds the winner's near wrist and lifts that arm
// straight up beside the head; no arm of the three passes through a body (measured: arm segments vs trunk/head volumes).
// Both corners as winner; KO and stoppage (a points decision uses the same ceremony).
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),coach,animTime:0,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};
e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);
const segDist=(p,a,b)=>{const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/ab.lengthSq()));return a.clone().addScaledVector(ab,t).distanceTo(p);};
for(const [winner,method] of [['lion','TKO'],['rabbit','TKO'],['lion','KO'],['rabbit','KO']]){
 e.fightOptions={seed:3,rounds:1,roundSeconds:2,restSeconds:0};arena.setTarget('fight');const view=arena.fightView,m=view.match;for(const f of Object.values(m.fighters))f.next=Infinity;m.decide=()=>{};
 let t=0;while(m.phase==='intro'||m.phase==='round'&&m.roundTime<1)arena.update(t+=1/30,'fight','one_two');
 m.finish(winner,method,true);
 let worst={d:9},samples=0;
 while(t<90&&!(m.phase==='ceremony'&&m.phaseTime>4)){arena.update(t+=1/30,'fight','one_two');if(m.phase!=='ceremony'||m.phaseTime<1.9)continue;samples++;
  const w=o=>view.cast.worldToLocal(o.getWorldPosition(V())),ref=view.referee,rl=p=>view.cast.worldToLocal(ref.root.localToWorld(p.clone()));
  const bodies=[],arms=[];
  for(const a of ['lion','rabbit']){const j=view.coaches[a].joints;bodies.push({who:a,name:'chest',c:w(j.chest).add(V(0,.06,0)),r:.2},{who:a,name:'head',c:w(j.head).add(V(0,.08,.03)),r:.15},{who:a,name:'hips',c:w(j.hips),r:.18});
   for(const s of ['L','R'])arms.push({who:a,name:a+' arm'+s,pts:[w(j['arm'+s]),w(j['elbow'+s]),w(j['hand'+s])],r:.05});}
  bodies.push({who:'ref',name:'ref trunk',c:rl(V(0,1.15,0)),r:.27},{who:'ref',name:'ref head',c:rl(V(0,1.8,.05)),r:.17});
  for(const s of [-1,1]){const p=ref.arms[s].points;arms.push({who:'ref',name:'ref arm'+s,pts:[rl(p.shoulder),rl(p.elbow),rl(p.wrist)],r:.06});}
  for(const arm of arms)for(const b of bodies){if(b.who===arm.who&&b.name!=='head')continue; // own trunk: the shoulder is attached to it
   for(let k=0;k<2;k++){const d=segDist(b.c,arm.pts[k],arm.pts[k+1])-b.r-arm.r;if(d<worst.d)worst={d,arm:arm.name,body:b.who+' '+b.name,k};}}
  // the raise itself
  const wj=view.coaches[winner].joints,side=winner==='lion'?'R':'L',sh=w(wj['arm'+side]),hand=w(wj['hand'+side]),elbow=w(wj['elbow'+side]),head=w(wj.head);
  if(m.phaseTime>3){assert.ok(hand.y>head.y+.25,'winner hand above the head');assert.ok(Math.hypot(hand.x-sh.x,hand.z-sh.z)<.12,'arm straight up from the shoulder');
   const a=elbow.clone().sub(sh).normalize(),b=hand.clone().sub(elbow).normalize();assert.ok(a.dot(b)>.9,'elbow nearly straight ('+(Math.acos(a.dot(b))*180/Math.PI).toFixed(0)+' deg)');
   const r=view.referee.root.position.x,lx=view.coaches.lion.root.position.x,rx=view.coaches.rabbit.root.position.x;assert.ok(r>Math.min(lx,rx)+.5&&r<Math.max(lx,rx)-.5,'referee between the fighters');
   assert.ok(Math.abs(hand.x-r)<Math.abs(w(wj['arm'+(side==='R'?'L':'R')]).x-r),'the raised arm is the one nearer the referee');
   const grip=rl(view.referee.arms[winner==='lion'?-1:1].points.wrist);assert.ok(grip.distanceTo(hand)<.05,'referee holds the raised wrist ('+grip.distanceTo(hand).toFixed(3)+')');}
 }
 assert.ok(samples>20);
 console.log(winner,method,'smallest arm-to-body clearance',worst.d.toFixed(3),'m',worst.arm,'vs',worst.body);
 assert.ok(worst.d>=0,'arm through a body: '+worst.arm+' vs '+worst.body+' by '+(-worst.d).toFixed(3)+' m');
}
arena.setTarget('none');
console.log('PASS result raise: referee between, near wrist straight up, no arm through a body (both corners, KO and stoppage)');
