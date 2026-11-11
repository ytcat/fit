// GOTR-0048 rope realism metrics (headless, no renderer).
// Usage: node qa/gotr-0048/measure.cjs [exercise ...] [--species=lion,rabbit] [--json=out.json]
// Every value is in metres (angles in degrees) in the gym frame, floor at y=0.
const {e,V,THREE}=require('./harness.cjs');
const args=process.argv.slice(2),flag=k=>(args.find(a=>a.startsWith('--'+k+'='))||'').split('=')[1];
const species=(flag('species')||'lion,rabbit').split(','),only=args.filter(a=>!a.startsWith('--'));
const exercises=only.length?only:Object.keys(CareerDrill.ropeDrills);
const r3=v=>Math.round(v*1000)/1000,deg=r=>Math.round(r*1800/Math.PI)/10;
function skinSamples(coach){
 // Torso skin (chest/spine/hips dominant) and arm skin near the elbow, from the
 // posed skinned body; sampled sparsely to keep the run cheap.
 let body=null,shorts=null;coach.root.traverse(n=>{if(!n.isSkinnedMesh)return;const names=new Set();const si=n.geometry.attributes.skinIndex.array;for(let i=0;i<si.length;i+=97)names.add(n.skeleton.bones[si[i]].name);if(!body&&names.has('chest')&&names.has('head'))body=n;else if(!shorts&&!names.has('chest')&&names.has('hips'))shorts=n;});
 const si=body.geometry.attributes.skinIndex.array,sw=body.geometry.attributes.skinWeight.array,pos=body.geometry.attributes.position,groups={torso:[],armL:[],armR:[]};
 for(let i=0;i<pos.count;i+=5){let b=0,w=-1;for(let k=0;k<4;k++)if(sw[i*4+k]>w){w=sw[i*4+k];b=si[i*4+k];}const nm=body.skeleton.bones[b].name;
  if(['chest','spine','hips'].includes(nm))groups.torso.push(i);else if(nm==='elbowL'||nm==='armL')groups.armL.push(i);else if(nm==='elbowR'||nm==='armR')groups.armR.push(i);}
 const hipList=[];if(shorts)for(let i=0;i<shorts.geometry.attributes.position.count;i+=11)hipList.push(i);return {body,groups,shorts,hipList};
}
function posed(skin,list,root,mesh=skin.body){const out=[],v=V();mesh.updateMatrixWorld(true);mesh.skeleton.update();for(const i of list){v.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,v);mesh.localToWorld(v);out.push(root.worldToLocal(v.clone()));}return out;}
function measure(sp,exercise,revolutions=4,steps=60){
 e.targetMode='none';e.roster.select(sp);e.ropeDrill=exercise;e.ropeTrick=null;e.animTime=0;e.targetMode='rope';e.arena.setTarget('rope');
 const d=e.arena.careerDrill,cadence=CareerDrill.ropeDrills[d.exercise].cadence,j=e.coach.joints,skin=skinSamples(e.coach);
 const soles=['L','R'].map(s=>j['foot'+s].children.find(n=>n.name==='Boxing boot sole'));const sp0=soles[0].geometry.attributes.position;
 const soleIdx=[],heelIdx=[];for(let i=0;i<sp0.count;i++){if(sp0.getY(i)<-.088){soleIdx.push(i);if(sp0.getZ(i)<-.075)heelIdx.push(i);}}
 const ball=V(0,-.086,.215);const world=(o,v)=>d.root.worldToLocal(o.localToWorld(v.clone()));
 const M={exit:[[],[]],jumpApex:[],heelMin:Infinity,slide:0,hand:[[],[]],elbow:[[],[]],handOut:[],handAboveHip:[],elbowGap:Infinity,elbowJointGap:Infinity,ropeBody:Infinity,ropeFloor:Infinity,ropeSole:Infinity,lean:[],head:[],shoulderLift:[],flexMax:0,handErr:0,legErr:0};
 let plantedAt=[null,null],apex=0,lastRev=-1;const total=revolutions*steps;
 for(let k=0;k<=total;k++){
  const t=k/steps/cadence,f=e.arena.update(t),rev=Math.floor(k/steps);
  if(rev!==lastRev){if(lastRev>=0)M.jumpApex.push(apex);apex=0;lastRev=rev;}
  const soleMin=[0,1].map(s=>{const p=soles[s].geometry.attributes.position;let m=Infinity;for(const i of soleIdx)m=Math.min(m,world(soles[s],V().fromBufferAttribute(p,i)).y);return m;});
  apex=Math.max(apex,Math.min(...soleMin));
  for(let s=0;s<2;s++){const p=soles[s].geometry.attributes.position;let h=Infinity;for(const i of heelIdx)h=Math.min(h,world(soles[s],V().fromBufferAttribute(p,i)).y);M.heelMin=Math.min(M.heelMin,h);
   const b=world(soles[s],ball);if(soleMin[s]<.0065){if(!plantedAt[s])plantedAt[s]=b;M.slide=Math.max(M.slide,Math.hypot(b.x-plantedAt[s].x,b.z-plantedAt[s].z));}else plantedAt[s]=null;}
  const P=n=>d.root.worldToLocal(j[n].getWorldPosition(V())),chest=P('chest'),hips=P('hips'),neck=P('neck');
  for(let s=0;s<2;s++){const side=s?'R':'L';M.exit[s].push(V(...f.rope.ends[s]).sub(chest));M.hand[s].push(P('hand'+side).sub(chest));M.elbow[s].push(P('elbow'+side).sub(chest));}
  M.lean.push(Math.atan2(neck.z-hips.z,neck.y-hips.y));M.shoulderLift.push(P('armL').y-neck.y);
  const fwd=V(0,0,1).applyQuaternion(j.head.getWorldQuaternion(new THREE.Quaternion()));M.head.push(Math.asin(Math.max(-1,Math.min(1,fwd.y))));
  M.handErr=Math.max(M.handErr,...(f.hero.handErrors||[0]));
  const distal=j.handL.getWorldPosition(V()).sub(j.elbowL.getWorldPosition(V())).normalize(),knuckle=V(0,-1,0).applyQuaternion(j.handL.getWorldQuaternion(new THREE.Quaternion()));M.flexMax=Math.max(M.flexMax,distal.angleTo(knuckle));
  // Rope: conservative body volumes, floor, and the gap above it under the soles.
  for(const p of d.ropePoints.slice(2,-2)){M.ropeBody=Math.min(M.ropeBody,d.ropeClearance.clearance(p).minimum);M.ropeFloor=Math.min(M.ropeFloor,p.y-.0045);}
  for(let s=0;s<2;s++){const inv=new THREE.Matrix4().copy(soles[s].matrixWorld).invert().multiply(d.root.matrixWorld);for(const p of d.ropePoints){const l=p.clone().applyMatrix4(inv);if(Math.abs(l.x)<.085&&l.z>-.115&&l.z<.225&&l.y<.06)M.ropeSole=Math.min(M.ropeSole,-.095-(l.y+.0045));}}
  if(k%10===0){
   const torso=posed(skin,skin.groups.torso,d.root),hipSkin=torso.concat(skin.shorts?posed(skin,skin.hipList,d.root,skin.shorts):[]);
   for(let s=0;s<2;s++){const side=s?'R':'L',sign=s?1:-1,hand=P('hand'+side),elbow=P('elbow'+side);
    // Hand: lateral distance beyond the hip/abdomen skin at the same height.
    let surf=0;for(const v of hipSkin)if(Math.abs(v.y-hand.y)<.05&&Math.abs(v.z-hand.z)<.25&&v.x*sign>surf)surf=v.x*sign;M.handOut.push(hand.x*sign-surf);M.handAboveHip.push(hand.y-hips.y);
    let g=Infinity;for(const v of torso)g=Math.min(g,v.distanceTo(elbow));M.elbowJointGap=Math.min(M.elbowJointGap,g);
    const arm=posed(skin,skin.groups['arm'+side],d.root).filter(v=>v.distanceTo(elbow)<.09);for(const a of arm)for(const v of torso)if(Math.abs(a.y-v.y)<.06){const dd=a.distanceTo(v);if(dd<M.elbowGap)M.elbowGap=dd;}
   }
  }
 }
 const circle=list=>{const m=V();for(const v of list)m.add(v);m.multiplyScalar(1/list.length);let vy=0,vz=0,vx=0;for(const v of list){vx+=(v.x-m.x)**2;vy+=(v.y-m.y)**2;vz+=(v.z-m.z)**2;}return {r:Math.sqrt((vy+vz)/list.length),lateral:Math.sqrt(vx/list.length),centre:m};};
 const hc=[0,1].map(s=>circle(M.hand[s])),ec=[0,1].map(s=>circle(M.elbow[s])),range=a=>Math.max(...a)-Math.min(...a),avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
 return {species:sp,exercise:d.exercise,cadence,jumpHeight:{min:r3(Math.min(...M.jumpApex)),max:r3(Math.max(...M.jumpApex))},wristCircleRadius:r3((hc[0].r+hc[1].r)/2),handleCircleRadius:r3((circle(M.exit[0]).r+circle(M.exit[1]).r)/2),elbowTravel:r3((ec[0].r+ec[1].r)/2),
  elbowSkinGap:r3(M.elbowGap),elbowJointToRibs:r3(M.elbowJointGap),handOutFromHip:{min:r3(Math.min(...M.handOut)),max:r3(Math.max(...M.handOut))},handAboveHipJoint:r3(avg(M.handAboveHip)),
  heelMinHeight:r3(M.heelMin),plantedFootSlide:r3(M.slide),ropeBodyClearance:r3(M.ropeBody),ropeFloorGap:r3(M.ropeFloor),ropeUnderSole:r3(M.ropeSole),
  torsoLeanDeg:{mean:deg(avg(M.lean)),range:deg(range(M.lean))},headPitchDeg:{mean:deg(avg(M.head)),range:deg(range(M.head))},wristFlexMaxDeg:deg(M.flexMax),handIkError:r3(M.handErr)};
}
const out=[];for(const sp of species)for(const x of exercises){const m=measure(sp,x);out.push(m);console.log(JSON.stringify(m));}
const file=flag('json');if(file)require('fs').writeFileSync(file,JSON.stringify(out,null,1));
module.exports={measure};
