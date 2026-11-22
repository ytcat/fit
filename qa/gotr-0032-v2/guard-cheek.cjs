/* Guard glove vs. the cheek during heavy-bag contacts (the tests/heavy-reference rule: knuckles within 20 cm of the
   head-space point (+-0.10, 0.13, 0.12)), and how deep the guard glove's padding sits inside the face volumes (the
   tests/compact-guard measure; this automatic station applies no face clearance). Worst values over the load ticks.
   Usage (repo root): node qa/gotr-0032-v2/guard-cheek.cjs */
const fs=require('fs'),vm=require('vm');process.chdir(require('path').join(__dirname,'..','..'));
global.THREE=require('../../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const V=(...a)=>new THREE.Vector3(...a),data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
const coach=new LionCoach(data),engine={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),animTime:0,fitCameraToModel(){}};engine.demoModel=coach.root;
const arena=new TrainingArena(engine,data),f=v=>v.toArray().map(x=>x.toFixed(3)).join(',');
for(const [move,side,index] of [['jab','L',0],['cross','R',1]]){
 arena.setTarget('heavy');const other=side==='L'?'R':'L';arena.update(0,move,'one_two');let worst=0,at=null,inside=0;
 for(let tick=1;tick<=144;tick++){const m=arena.update(tick/120,move,'one_two');if(!m.loads.length)continue;
  const cheek=coach.joints.head.localToWorld(V(other==='L'?-.10:.10,.13,.12)),guard=coach.root.localToWorld(V(...m.hero.gloves[1-index].knuckles));
  const d=guard.distanceTo(cheek);if(d>worst){worst=d;at=coach.joints.head.worldToLocal(guard.clone());}
  const toHead=new THREE.Matrix4().copy(coach.joints.head.matrixWorld).invert();
  for(const [x,y,z,r] of [[0,.015,0,.077],[0,-.07,0,.089],[0,-.145,0,.099],[0,-.195,0,.068]]){const p=coach.joints['hand'+other].localToWorld(V(x,y,z)).applyMatrix4(toHead);for(const [cx,cy,cz,rx,ry,rz] of [[0,.13,.03,.17,.20,.17],[0,.065,.195,.135,.105,.125]]){const k=Math.hypot((p.x-cx)/(rx+r),(p.y-cy)/(ry+r),(p.z-cz)/(rz+r));inside=Math.max(inside,(1-k)*Math.min(rx,ry,rz));}}}
 console.log(move,'worst guard-cheek',worst.toFixed(3),'guard knuckles in head space',at&&f(at),'glove inside face (cm)',(inside*100).toFixed(1));
}
