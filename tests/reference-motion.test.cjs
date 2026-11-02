// Regress the screenshot defects using the real skinned surface and app camera.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={readyState:'loading',addEventListener(){},createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const html=fs.readFileSync('index.html','utf8');
vm.runInThisContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n')+'\nglobal.ReferenceEngine=AutoModelEngine;');
const coach=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json'))),g=coach.skin.geometry,p=g.attributes.position,ids=g.index.array;
const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
const rest=i=>new THREE.Vector3().fromBufferAttribute(p,i);
const inside=i=>Math.abs(p.getX(i))>.22&&Math.abs(p.getX(i))<.48&&p.getY(i)>1.30&&p.getY(i)<1.65;
const edges=[];
for(let i=0;i<ids.length;i+=3)for(let k=0;k<3;k++){
  const a=ids[i+k],b=ids[i+(k+1)%3];if(!inside(a)||!inside(b))continue;
  const length=rest(a).distanceTo(rest(b));if(length>=.002)edges.push({a,b,length});
}
for(const move of moves){
  const m=coach.update(.47*1.22,move,'one_two'),index=move==='cross'||move.startsWith('rear')?1:0;
  if(!move.includes('uppercut'))assert.ok(m.hands[index][1]<1.76,'straight and hook wrists must not rise above their face-height target');
  const cache=new Map(),posed=i=>{if(!cache.has(i))cache.set(i,coach.skinPoint(coach.skin,i));return cache.get(i);};
  const ratios=edges.map(e=>posed(e.a).distanceTo(posed(e.b))/e.length).sort((a,b)=>a-b);
  // R22 exceeded 3.45 at p95 and 5.38 at p99: its axilla became a broad flap.
  assert.ok(ratios[Math.floor(ratios.length*.95)]<2.30,move+' excessive widespread underarm stretching');
  assert.ok(ratios[Math.floor(ratios.length*.99)]<3.35,move+' excessive local underarm stretching');
  const side=index?'R':'L',blade=coach.joints['scapula'+side];
  assert.ok(blade.position.z>-.035,move+' shoulder blade must protract during the punch');
}
console.log('PASS lower punch paths, moving shoulder blades and reduced raised-arm surface strain');
for(const aspect of [393/800,560/700])for(const view of [-.32,1.15,Math.PI]){
  coach.root.rotation.y=view;coach.update(0,'jab','one_two');
  const engine=Object.create(ReferenceEngine.prototype);engine.demoModel=coach.root;engine.camera=new THREE.PerspectiveCamera(38,aspect,.1,100);engine.fitCameraToModel(coach.root);engine.camera.updateMatrixWorld(true);
  assert.equal(engine.camera.position.y,1.78,'camera should not look upward from below the glove');
  for(const move of moves)for(const phase of [.22,.48,.70]){
    coach.update(phase*1.22,move,'one_two');
    for(const side of ['L','R']){
      const mesh=coach.gloveMeshes[side],v=mesh.geometry.attributes.position;
      for(let i=0;i<v.count;i+=37){
        const point=new THREE.Vector3().fromBufferAttribute(v,i).applyMatrix4(mesh.matrixWorld).project(engine.camera);
        assert.ok(Math.abs(point.x)<.98&&Math.abs(point.y)<.98,`${move}: glove clipped in ${view} view at aspect ${aspect}`);
      }
    }
  }
}
console.log('PASS complete gloves stay visible through portrait/profile/back-view punch paths');
