const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'); process.chdir(require('node:path').resolve(__dirname,'..')); global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.addEventListener=()=>{};
global.document={createElement:()=>({getContext:()=>new Proxy({}, {get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-footwear.js','padding-deformation.js','boxing-pose.js','boxing-coach-v2.js','adventure/story/paws.js','adventure/story/story-cast.js','adventure/story/street-wear.js','adventure/story/cast-market.js','adventure/story/dream-pose.js','adventure/story/market-sets.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const Core=require('../adventure/story/dream-core'),M=require('../adventure/story/market-core'),S=M.scenes.dream_market_robbery,V=(...a)=>new THREE.Vector3(...a), data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),engine={roster:{data},arena:{models:{}}};
data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
const fang=StoryCast.rig('fang',engine),hazel=StoryCast.rig('hazel',engine),fighter=new LionCoach(data,{species:'lion'}),rigs={fighter,fang,hazel},scene=new THREE.Scene();Object.values(rigs).forEach(c=>{c.root.scale.set(-1,1,1);scene.add(c.root);});StoryCast.outfit(fighter,'street');
const props=MarketProps.create({scene,set:{},rigs,carry:S.carry}), bag=StoryCast.market.handbag(hazel);
const dt=1/60;let q; const frames=[]; const project=(o,c)=>{const a=o.clone().project(c);return [201*(a.x+1),345*(1-a.y),a.z];};
for(let i=360;i<=940;i++){
 const t=i*dt,s=Core.sample(S,t),camera=new THREE.PerspectiveCamera(s.camera.fov||40,402/690,.05,125);
 camera.position.fromArray(s.camera.pos);camera.lookAt(V(...s.camera.look));camera.updateMatrixWorld(true);
 if(i<800)i+=1; // 30 Hz warmup before the measured 60 Hz beat
 for(const [id,a] of Object.entries(s.actors)){
  const c=rigs[id]; c.root.position.set(a.x,a.y,a.z);c.root.rotation.y=a.ry;c.root.updateMatrixWorld(true);
  const p=id==='fang'&&a.act==='jacketoff'?StoryCast.market.jacketOff(c,Math.max(0,Math.min(1,a.actT/2.2))):null;
  DreamPose.civil(c,{t,dt,dist:a.dist,walk:p?0:+a.walking,arms:p?.arms||a.arms,lean:p?.lean||a.lean,look:{yaw:0,pitch:0}});
 }
 props.frame(t,dt);scene.updateMatrixWorld(true);
 if(i>=810&&i<=940){const p=bag.getWorldPosition(V()),hand=fang.joints.handL.getWorldPosition(V()),box=new THREE.Box3().setFromObject(bag);frames.push({t,p:p.toArray(),hand:hand.toArray(),facing:fang.root.rotation.y,screen:project(p,camera),box:[box.min.toArray(),box.max.toArray()],items:scene.children.filter(o=>o.userData.handbagSpill).map(o=>({vis:o.visible,p:o.position.toArray(),screen:project(o.position,camera)}))});}
}

const f=t=>frames.reduce((best,a)=>Math.abs(a.t-t)<Math.abs(best.t-t)?a:best);
const before=f(13.88),drop=f(13.9),land=f(14.34),end=f(14.9);
const gap=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
assert.ok(gap(before.p,drop.p)<.003,'no reparent teleport at release');
assert.ok(Math.abs(before.p[1]-before.hand[1]+.02)<1e-7);
assert.ok(gap(before.p,land.p)>.85,'visible fall before ground');
assert.ok(end.box[0][1]>=0&&end.box[0][1]<.012,'rests on pavement');
let last;
for(const e of frames.filter(e=>e.t>=13.88&&e.t<=14.90)){
 if(last)assert(gap(last.p,e.p)<.08,'no discontinuous pose sample at '+e.t);
 assert(e.box[0][1]>=-.001,'bag does not tunnel below pavement');
 assert(e.screen[0]>17&&e.screen[0]<385&&e.screen[1]>60&&e.screen[1]<620,'bag inside authored phone shot');
 for(const item of e.items.filter(i=>i.vis))assert(item.screen[0]>=0&&item.screen[0]<=402&&item.screen[1]>=0&&item.screen[1]<=620,'spilled item inside shot');
 last=e;
}
assert.equal(f(14.3).items.filter(i=>i.vis).length,0,'does not spill before ground impact');
assert.equal(f(14.55).items.filter(i=>i.vis).length,3,'coin purse, note, key ring emerge progressively');
const saved=end.p;props.frame(13.4,dt);assert(scene.children.filter(o=>o.userData.handbagSpill).every(o=>!o.visible),'rewind clears spill');
props.frame(15.3,dt);assert(gap(saved,bag.position.toArray())<.001,'forward seek lands in same place');
props.dispose();assert.equal(bag.parent,hazel.joints.handL);assert.equal(scene.children.filter(o=>o.userData.handbagSpill).length,0);
console.log('Market handbag: real rig release, continuous drop, geometry contact, 3 spill objects and rewind/seek lifecycle PASS');
