/* Final-pose snapshots. Diagnostic opt-in; the existing solver stays authoritative.
 * All buffers are reused. Interpolation is data only: never used for collisions.
 */
(() => {
 const vector=(out,v)=>{out[0]=v.x;out[1]=v.y;out[2]=v.z;};
 const quaternion=(out,q)=>{out[0]=q.x;out[1]=q.y;out[2]=q.z;out[3]=q.w;};
 const vectorKeys=['leftFootTarget','rightFootTarget','leftHandTarget','rightHandTarget','muscleActivation'];
 const expressionKeys=['jaw','focus','headFlinch','bodyFlinch','side'];
 class PoseFrame {
  constructor(coach){
   if(!coach?.root||!coach.joints)throw new TypeError('A compatible boxer rig is required');
   this.version=1;this.modelId=coach.root.uuid;this.species=coach.species;this.time=0;this.sequence=0;
   this.jointNames=Object.freeze(Object.keys(coach.joints));this.joints={};this.jointPositions={};this.jointScales={};
   for(const name of this.jointNames){this.joints[name]=new Float64Array(4);this.jointPositions[name]=new Float64Array(3);this.jointScales[name]=new Float64Array(3);}
   this.rootTransform={space:'world',position:new Float64Array(3),quaternion:new Float64Array(4),scale:new Float64Array(3)};
   this.jointSpace='parent';this.targetSpace='world';this.targetKind='observedRigControlPoint';
   this.leftFootTarget=new Float64Array(3);this.rightFootTarget=new Float64Array(3);this.leftHandTarget=new Float64Array(3);this.rightHandTarget=new Float64Array(3);
   this.contactFlags={leftFootPlantedIntent:false,rightFootPlantedIntent:false};this.expression={};for(const k of expressionKeys)this.expression[k]=0;
   this.muscleActivation=new Float32Array(14);this.expressionAvailable=false;this.musclesAvailable=false;this.targetsValid=false;this.move='guard';
   this.scratch=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.qa=new THREE.Quaternion();this.qb=new THREE.Quaternion();
  }
  capture(coach,time){
   if(coach.root.uuid!==this.modelId)throw new Error('Pose buffers cannot be shared between avatars');
   if(!Number.isFinite(time))throw new TypeError('Pose time must be finite');
   coach.root.updateWorldMatrix(true,true);this.time=time;this.sequence++;this.move=coach.metrics?.move||'guard';
   vector(this.rootTransform.position,coach.root.getWorldPosition(this.scratch));quaternion(this.rootTransform.quaternion,coach.root.getWorldQuaternion(this.rotation));vector(this.rootTransform.scale,coach.root.getWorldScale(this.scratch));
   for(const name of this.jointNames){const j=coach.joints[name];quaternion(this.joints[name],j.quaternion);vector(this.jointPositions[name],j.position);vector(this.jointScales[name],j.scale);}
   const m=coach.metrics;this.targetsValid=!!(m?.footTargets?.length===2&&m.gloves?.length===2);
   if(this.targetsValid){
    for(let i=0;i<2;i++){
     const foot=i?this.rightFootTarget:this.leftFootTarget,hand=i?this.rightHandTarget:this.leftHandTarget;
     const side=i?'R':'L';this.scratch.set(0,-.102,.215).applyMatrix4(coach.joints['foot'+side].matrixWorld);vector(foot,this.scratch);
     this.scratch.set(0,-.204,0).applyMatrix4(coach.joints['hand'+side].matrixWorld);vector(hand,this.scratch);
    }
   }
   // These are authored support intents, not newly invented ground collisions.
   this.contactFlags.leftFootPlantedIntent=this.targetsValid&&(m.footTargets[0].lift||0)<=.002;
   this.contactFlags.rightFootPlantedIntent=this.targetsValid&&(m.footTargets[1].lift||0)<=.002;
   this.expressionAvailable=!!coach.expression;for(const k of expressionKeys)this.expression[k]=coach.expression?.[k]||0;
   this.musclesAvailable=!!coach.anatomy?.value;for(let i=0;i<14;i++)this.muscleActivation[i]=this.musclesAvailable?(coach.anatomy.value[i]||0):0;
   return this;
  }
  mixVector(out,a,b,t){for(let i=0;i<out.length;i++)out[i]=a[i]+(b[i]-a[i])*t;}
  mixQuaternion(out,a,b,t){this.qa.fromArray(a);this.qb.fromArray(b);this.rotation.copy(this.qa).slerp(this.qb,t).normalize();quaternion(out,this.rotation);}
  interpolate(a,b,alpha){
   if(this===a||this===b)throw new Error('Use a separate interpolation output buffer');
   if(this.modelId!==a.modelId||a.modelId!==b.modelId)throw new Error('Never blend different avatars');
   if(!Number.isFinite(alpha))throw new TypeError('Interpolation weight must be finite');
   const t=Math.max(0,Math.min(1,alpha));
   this.mixVector(this.rootTransform.position,a.rootTransform.position,b.rootTransform.position,t);this.mixVector(this.rootTransform.scale,a.rootTransform.scale,b.rootTransform.scale,t);this.mixQuaternion(this.rootTransform.quaternion,a.rootTransform.quaternion,b.rootTransform.quaternion,t);
   for(const n of this.jointNames){this.mixVector(this.jointPositions[n],a.jointPositions[n],b.jointPositions[n],t);this.mixVector(this.jointScales[n],a.jointScales[n],b.jointScales[n],t);this.mixQuaternion(this.joints[n],a.joints[n],b.joints[n],t);}
   for(const key of vectorKeys)this.mixVector(this[key],a[key],b[key],t);
   for(const k of expressionKeys)this.expression[k]=k==='side'?(t<1?a.expression[k]:b.expression[k]):a.expression[k]+(b.expression[k]-a.expression[k])*t;
   const discrete=t<1?a:b;Object.assign(this.contactFlags,discrete.contactFlags);this.move=discrete.move;this.time=a.time+(b.time-a.time)*t;this.sequence=b.sequence;this.targetsValid=a.targetsValid&&b.targetsValid;this.expressionAvailable=a.expressionAvailable&&b.expressionAvailable;this.musclesAvailable=a.musclesAvailable&&b.musclesAvailable;return this;
  }
  serialize(){
   const joints={},jointPositions={},jointScales={};for(const n of this.jointNames){joints[n]=Array.from(this.joints[n]);jointPositions[n]=Array.from(this.jointPositions[n]);jointScales[n]=Array.from(this.jointScales[n]);}
   return {version:this.version,modelId:this.modelId,species:this.species,time:this.time,move:this.move,rootTransform:{space:'world',position:Array.from(this.rootTransform.position),quaternion:Array.from(this.rootTransform.quaternion),scale:Array.from(this.rootTransform.scale)},jointSpace:this.jointSpace,joints,jointPositions,jointScales,targetSpace:this.targetSpace,targetKind:this.targetKind,leftFootTarget:Array.from(this.leftFootTarget),rightFootTarget:Array.from(this.rightFootTarget),leftHandTarget:Array.from(this.leftHandTarget),rightHandTarget:Array.from(this.rightHandTarget),targetsValid:this.targetsValid,contactFlags:{...this.contactFlags},expression:{...this.expression},expressionAvailable:this.expressionAvailable,muscleActivation:Array.from(this.muscleActivation),musclesAvailable:this.musclesAvailable};
  }
 }
 class FixedStepClock {
  constructor({step=1/120,maxSteps=8}={}){if(!(step>0&&Number.isFinite(step))||!Number.isInteger(maxSteps)||maxSteps<1)throw new TypeError('Invalid fixed-step budget');this.step=step;this.maxSteps=maxSteps;this.reset();}
  reset(time=0){if(!Number.isFinite(time))throw new TypeError('Clock time must be finite');this.origin=time;this.time=time;this.tick=0;this.accumulator=0;this.alpha=0;this.droppedSeconds=0;return this;}
  advance(delta,step){
   if(!Number.isFinite(delta)||delta<0)throw new TypeError('Clock delta must be finite and nonnegative');
   const wanted=this.accumulator+delta,accepted=Math.min(wanted,this.step*this.maxSteps);this.droppedSeconds+=wanted-accepted;this.accumulator=accepted;let count=0;
   while(this.accumulator+1e-12>=this.step&&count<this.maxSteps){this.tick++;this.time=this.origin+this.tick*this.step;this.accumulator=Math.max(0,this.accumulator-this.step);step(this.time,this.step,this.tick);count++;}
   this.alpha=Math.min(1,this.accumulator/this.step);return count;
  }
 }
 class PoseAudit {
  constructor(){this.buffers=new WeakMap();this.actors={hero:null,partner:null,trainer:null};}
  record(coach,time){if(!coach)return null;let frame=this.buffers.get(coach);if(!frame){frame=new PoseFrame(coach);this.buffers.set(coach,frame);}return frame.capture(coach,time);}
  capture(engine){const a=engine.arena,time=a?.metrics?.poseTime??engine.animTime;this.actors.hero=this.record(engine.coach,time);this.actors.partner=this.record(a?.mode==='fight'?(a.fightView?.coaches.lion===engine.coach?a.fightView.coaches.rabbit:a.fightView?.coaches.lion):a?.mode==='rabbit'?a.rabbit:null,time);this.actors.trainer=this.record(a?.careerDrill?.mode==='pads'?a.careerDrill.trainer:null,time);return this.actors;}
 }
 window.BoxingPose={PoseFrame,FixedStepClock,PoseAudit,enabled:typeof location!=='undefined'&&new URLSearchParams(location.search).get('poseAudit')==='1'};
})();
