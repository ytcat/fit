const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
global.EQUIPMENT_SURFACES=JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
for(const f of ['boxing-routines.js','avatar-detail.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;const coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);e.fightOptions={seed:74};arena.setTarget('fight');const v=arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);let minimumFace=Infinity,minimumElbow=Infinity;
function inspectGuard(c){for(const side of ['L','R']){
 const s=side==='L'?-1:1,shoulder=c.point(c.joints['arm'+side]),elbow=c.point(c.joints['elbow'+side]),wrist=c.point(c.joints['hand'+side]);
 minimumElbow=Math.min(minimumElbow,s*(elbow.x-shoulder.x));assert.ok(s*(elbow.x-shoulder.x)>-.025,'guard elbow cannot be buried across the chest');assert.ok(wrist.y-elbow.y>.17,'the glove must rise above the elbow');assert.ok(Math.abs(shoulder.distanceTo(elbow)-c.joints['elbow'+side].position.length())<1e-6);assert.ok(Math.abs(elbow.distanceTo(wrist)-c.joints['hand'+side].position.length())<1e-6);
}}
function inspectFace(c){for(const side of ['L','R']){
 const mesh=c.gloveMeshes[side],p=mesh.geometry.attributes.position,toHead=new THREE.Matrix4().multiplyMatrices(c.joints.head.matrixWorld.clone().invert(),mesh.matrixWorld);
 for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/220))){const q=V().fromBufferAttribute(p,i).applyMatrix4(toHead);for(const [cx,cy,cz,rx,ry,rz] of [[0,.13,.03,.17,.20,.17],[0,.065,.195,.135,.105,.125]]){const outside=Math.hypot((q.x-cx)/rx,(q.y-cy)/ry,(q.z-cz)/rz);minimumFace=Math.min(minimumFace,outside);assert.ok(outside>=1,'actual fight glove vertices must stay outside their own skull and muzzle');}}
}}
for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;}m.phase='round';
for(let i=0;i<90;i++){v.step();for(const c of Object.values(v.coaches)){inspectGuard(c);inspectFace(c);}}
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;f.condition=100;f.stamina=1;f.stun=0;f.down=0;f.pendingDown=false;}m.result=null;m.phase='round';m.attack('lion',move,'head');m.attack('rabbit',move==='jab'?'cross':'jab','head');
 for(let i=0;i<70;i++){v.step();if(i%3===0)for(const c of Object.values(v.coaches))inspectFace(c);}
}
console.log('PASS guard elbows outside the chest, fixed arm lengths and actual glove-face clearance in idle and simultaneous strikes',{minimumFace,minimumElbow});
