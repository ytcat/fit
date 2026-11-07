/* Articulated mitt work and forward skipping. Gear is always attached to the rig. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Q=()=>new THREE.Quaternion();
 const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);},rear=m=>['cross','rear_hook','rear_uppercut'].includes(m);
 let stationSequence=0;
 const mittSequence=['jab','cross','roll','uppercut','rear_hook','rear_uppercut','roll','hook'];
 const mittCues={};
 for(const [lang,column,meet,up,roll] of [['en',1,'meet the mitt and recover guard','drive up into the mitt and recover','Roll under the hook'],['he',3,'פגעו בכפפה וחזרו להגנה','עלו אל הכפפה וחזרו להגנה','התכופפו מתחת להוק'],['ru',5,'попадите в лапу и вернитесь в защиту','удар снизу в лапу и возврат в защиту','Нырок под хук']]){
  const cues=mittCues[lang]={roll,guard:window.COACH_TECHNIQUES?.guard?.[column]||'Guard'};
  for(const move of mittSequence)if(move!=='roll')cues[move]=(window.COACH_TECHNIQUES?.[move]?.[column]||move)+' · '+(move.includes('uppercut')?up:meet);
 }
 const ropeDrills={two_feet:{name:'Two feet',height:.15,cadence:1.72},alternating:{name:'Alternating feet',height:.135,cadence:1.90},left_leg:{name:'Left leg',height:.15,cadence:1.60},right_leg:{name:'Right leg',height:.15,cadence:1.60}};
 // Conservative posed exclusion volumes; only the rope is routed around them.
 // The render mesh, IK, jump clock and close hand targets remain authoritative.
 class RopeBodyClearance {
  constructor(coach,root){
   this.coach=coach;this.root=root;this.volumes=[];this.a=V();this.b=V();this.axis=V();this.mid=V();this.rotation=Q();this.up=V(0,1,0);this.unit=V(1,1,1);this.maxCorrection=0;
   const j=coach.joints,add=(name,node,c,r)=>this.volumes.push({name,node,c:V(...c),base:V(...r),r:V(),local:new THREE.Matrix4(),world:new THREE.Matrix4(),inverse:new THREE.Matrix4()});
   add('chest',j.chest,[0,.10,0],[.32,.26,.255]);add('abdomen',j.spine,[0,.07,.01],[.255,.25,.21]);add('shorts',j.hips,[0,-.045,0],[.28,.23,.225]);
   add('skull',j.head,[0,.12,.015],[.205,.24,.195]);add('muzzle',j.head,[0,.055,.20],[.17,.13,.16]);
   if(coach.species==='lion')add('mane',j.head,[0,.065,-.065],[.36,.38,.28]);
   for(const [i,ear] of (coach.rabbitEars||[]).entries())add('ear'+i,ear,[0,.20,0],[.068,.26,.048]);
   for(const side of ['L','R']){
    for(const [name,start,end,radius] of [['upper-arm','arm','elbow',.175],['forearm','elbow','hand',.095],['thigh','thigh','knee',.16],['calf','knee','foot',.105]]){
     add(name+side,null,[0,0,0],[radius,1,radius]);const v=this.volumes[this.volumes.length-1];v.start=j[start+side];v.end=j[end+side];v.cap=radius;
    }
    add('boot'+side,j['foot'+side],[0,.055,.045],[.105,.15,.225]);
   }
   if(coach.species==='rabbit')add('tail',coach.tail,[0,-.11,-.18],[.09,.09,.085]);
   else for(const [i,c] of [[0,[.045,-.10,-.235]],[1,[.12,-.31,-.37]],[2,[.20,-.49,-.35]],[3,[.23,-.54,-.29]]])add('tail'+i,coach.tail,c,i===3?[.055,.09,.055]:[.065,.14,.075]);
  }
  update(){
   this.root.updateWorldMatrix(true,false);this.coach.root.updateMatrixWorld(true);
   for(const v of this.volumes){
    if(v.node){v.r.copy(v.base).addScalar(.030);v.local.compose(v.c,this.rotation.identity(),v.r);v.world.multiplyMatrices(v.node.matrixWorld,v.local);}
    else{
     v.start.getWorldPosition(this.a);v.end.getWorldPosition(this.b);this.mid.copy(this.a).add(this.b).multiplyScalar(.5);this.axis.copy(this.b).sub(this.a);const length=this.axis.length();this.rotation.setFromUnitVectors(this.up,this.axis.normalize());
     v.base.y=length*.5+v.cap;v.r.copy(v.base).addScalar(.030);v.world.compose(this.mid,this.rotation,v.r);
    }
    v.inverse.copy(v.world).invert().multiply(this.root.matrixWorld);
   }
  }
  route(points){
   this.maxCorrection=0;
   for(let i=1;i<points.length-1;i++){
    const p=points[i],original=p.x,side=i<(points.length-1)/2?-1:1;let next=original;
    for(const v of this.volumes){
     const m=v.inverse.elements,x=m[4]*p.y+m[8]*p.z+m[12],y=m[5]*p.y+m[9]*p.z+m[13],z=m[6]*p.y+m[10]*p.z+m[14];
     const A=m[0]*m[0]+m[1]*m[1]+m[2]*m[2],B=m[0]*x+m[1]*y+m[2]*z,h=1-(x*x+y*y+z*z-B*B/A);
     if(h<=-.35)continue;
     // Fade in outside the protected shell before a moving branch reaches it.
     const weight=smooth((h+.35)/.35),bound=-B/A+side*Math.sqrt((Math.max(0,h)+.04)/A),candidate=original+(bound-original)*weight;
     next=side<0?Math.min(next,candidate):Math.max(next,candidate);
    }
    p.x=next;this.maxCorrection=Math.max(this.maxCorrection,Math.abs(next-original));
   }
  }
  // Diagnostic API uses a smaller shell than routing, leaving room for the
  // cable radius, interpolation, coat fibres and a visible air gap.
  clearance(point,margin=.012){let minimum=Infinity,part='';
   for(const v of this.volumes){const e=v.inverse.elements,x=(e[0]*point.x+e[4]*point.y+e[8]*point.z+e[12])*v.r.x/(v.base.x+margin),y=(e[1]*point.x+e[5]*point.y+e[9]*point.z+e[13])*v.r.y/(v.base.y+margin),z=(e[2]*point.x+e[6]*point.y+e[10]*point.z+e[14])*v.r.z/(v.base.z+margin),d=Math.sqrt(x*x+y*y+z*z)-1;if(d<minimum){minimum=d;part=v.name;}}
   return {minimum,part};
  }
 }

 class CareerDrill {
  constructor(arena,mode){this.arena=arena;this.engine=arena.engine;this.mode=mode;this.sessionId=++stationSequence;this.start=this.engine.animTime;this.last=-1;this.seen=new Set();this.deferVisuals=false;this.root=new THREE.Group();this.root.name=mode==='rope'?'Jump rope station':'Focus mitt station';arena.group.add(this.root);
   if(mode==='rope'){
    this.exercise=ropeDrills[this.engine.ropeDrill]?this.engine.ropeDrill:'two_feet';this.grips=['L','R'].map(side=>TrainingGear.ropeGrip(this.engine.coach,side));
    const segments=96,sides=6,p=new Float32Array((segments+1)*sides*3),index=[];for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;index.push(a,b,a+sides,b,b+sides,a+sides);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const uv=[];for(let i=0;i<=segments;i++)for(let k=0;k<sides;k++)uv.push(i/segments*24,k/sides*2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);this.rope=new THREE.Mesh(g,TrainingGear.cordMaterial());this.rope.name='Round woven skipping cable';this.rope.frustumCulled=false;this.rope.castShadow=true;this.root.add(this.rope);this.ropePoints=Array.from({length:97},()=>V());this.ropeFrame={tangent:V(),normal:V(),binormal:V()};this.ropeClearance=new RopeBodyClearance(this.engine.coach,this.root);this.finalizeRope=coach=>this.poseRope(coach);this.rope.geometry.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(p.length),3));this.rope.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);this.rope.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
   }else{
    const species=this.engine.coach.species==='lion'?'rabbit':'lion';arena.padTrainers=arena.padTrainers||{};this.trainer=arena.padTrainers[species]||(arena.padTrainers[species]=new LionCoach(arena.data,{species}));this.root.add(this.trainer.root);this.trainer.root.position.set(0,0,.60);this.trainer.root.rotation.set(0,Math.PI,0);this.mitts=['L','R'].map(side=>TrainingGear.mitt(this.trainer,side));this.previousFist={};this.previousPadFace={};this.padNormal=new THREE.Vector3();this.padNormalMatrix=new THREE.Matrix3();this.padVelocity=new THREE.Vector3();this.padLocal=new THREE.Vector3();this.padBeforeLocal=new THREE.Vector3();this.padContactLocal=new THREE.Vector3();this.padWorldContact=new THREE.Vector3();this.finalizeTrainer=coach=>this.poseTrainer(coach);this.finalizeBoxer=coach=>this.poseBoxer(coach);
    this.padClock=window.BoxingPose&&(typeof location==='undefined'||new URLSearchParams(location.search).get('padClock')!=='legacy')?new BoxingPose.FixedStepClock({step:1/120,maxSteps:24}):null;this.padClock?.reset(this.start);this.padRequestedTime=this.start;this.padFrame=null;this.padStep=time=>{this.deferVisuals=this.padClock.tick<this.padRenderTick;const frame=this.update(time);this.padContacts.push(...frame.contacts);this.padSwings.push(...frame.swings);this.padDefences+=frame.defences||0;this.padFrame=frame;};
   }
  }
  dispose(){this.engine.coach.root.position.y=0;for(const prop of this.grips||this.mitts||[])TrainingGear.dispose(prop);if(this.trainer)this.trainer.root.parent?.remove(this.trainer.root);this.root.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});this.root.parent?.remove(this.root);}
  once(key){if(this.seen.has(key))return false;this.seen.add(key);if(this.seen.size>80)this.seen.delete(this.seen.values().next().value);return true;}
  face(pad){return this.trainer.root.worldToLocal(pad.localToWorld(pad.userData.face.clone()));}
  placeMitt(side,goal,palm=V(0,0,1),catchingUpper=false){
   const coach=this.trainer,j=coach.joints,pad=this.mitts[side==='L'?0:1],pole=V((side==='L'?-1:1)*(.7+.4*palm.y),catchingUpper?-.45:-.45-1.8*palm.y,-.12);let error=0;
   // Solve the actual catching face, not the hand origin. Pronation follows
   // the forearm, so even a palm-down sweep retains a straight wrist.
   for(let i=0;i<5;i++){
    const delta=goal.clone().sub(this.face(pad)),wrist=coach.point(j['hand'+side]).add(delta);
    error=coach.solve(j['arm'+side],j['elbow'+side],j['hand'+side],wrist,pole);coach.orientGlove(side,1,palm);
   }
   return error;
  }
  poseTrainer(coach){
   const {phase,hook,sweepSide}=this.padPose,j=coach.joints;
   const rootQ=coach.root.getWorldQuaternion(Q()).invert(),feet=['L','R'].map(side=>({side,ankle:coach.point(j['foot'+side]),q:j['foot'+side].getWorldQuaternion(Q()).premultiply(rootQ)}));
   const sweep=hook?smooth((phase-.08)/.23)*(1-smooth((phase-.76)/.22)):0;
   const travel=smooth((phase-.18)/.56),sign=sweepSide==='L'?-1:1;
   const catchPulse=hook?0:Math.sin(Math.PI*smooth((phase-.16)/.65))**2;
   let shock=0;for(const pad of this.mitts){const age=this.padPose.t-(pad.userData.hitAt??-100);if(age>=0)shock=Math.max(shock,(1-Math.exp(-age/.025))*Math.exp(-age/.15));}
   j.hips.position.y-=.035*(sweep+catchPulse);j.hips.position.x+=.010*Math.sin(this.padPose.t*1.3);j.hips.rotation.y-=sign*.08*sweep;
   // Reach over the roll through a small hip hinge and shoulder glide;
   // keep the partners' feet a full mitt-work distance apart.
   j.hips.position.z+=.035*sweep;j.spine.rotation.x+=.11*sweep-.020*shock;j.chest.rotation.x+=.09*sweep-.035*shock;
   j.spine.rotation.y-=sign*.10*sweep;j.chest.rotation.y-=sign*(.13*sweep-.055*catchPulse);
   j.chest.rotation.x+=.025*catchPulse;j.neck.rotation.y+=sign*.06*sweep;j.head.rotation.y+=sign*.08*sweep;
   const palms=[],errors=[],upper=this.padPose.move.includes('uppercut'),ready=upper?smooth(this.padPose.heroPhase/.18)*(1-smooth((this.padPose.heroPhase-.72)/.25)):0;
   for(const [i,side] of ['L','R'].entries()){
    const pad=this.mitts[i],age=this.padPose.t-(pad.userData.hitAt??-100),recoil=age>=0?.065*(pad.userData.hitForce??1)*(1-Math.exp(-age/.022))*Math.exp(-age/.15):0;
    const goal=V(i?.20:-.20,1.82+.010*Math.sin(this.padPose.t*2.3+i),.43-recoil),palm=V(0,0,1);
    const catchingUpper=upper&&side===(rear(this.padPose.move)?'R':'L');
    if(catchingUpper){goal.lerp(V(0,1.86+recoil,.60-recoil*.3),ready);palm.set(0,-Math.sin(ready*Math.PI/2),Math.cos(ready*Math.PI/2));}
    else if(upper)goal.lerp(V(i?.24:-.24,1.96,.43),ready);
    if(hook&&side!==sweepSide)goal.lerp(V(i?.22:-.22,1.74,.29),sweep);
    if(hook&&side===sweepSide){
     // Round sweep over the ducking boxer: chamber to the outside, pronate,
     // pass across the crown and fold back. The 90-degree turn is about the
     // forearm, never an artificial bend of the hand.
     const arc=Math.PI*travel,x=sign*(.14+.24*Math.cos(arc)),y=this.padPose.sweepHeight+.07*Math.sin(arc),z=.60+.12*Math.sin(arc);
     goal.lerp(V(x,y,z),sweep);const roll=sweep*Math.PI/2;palm.set(0,-Math.sin(roll),Math.cos(roll));
    }
    j['arm'+side].position.z+=.035*sweep+.012*catchPulse;j['arm'+side].position.y+=.045*sweep;
    errors.push(this.placeMitt(side,goal,palm,catchingUpper));palms.push(coach.orientGlove(side,1,palm));pad.userData.cushion.scale.z=1-Math.min(.18,recoil*4);
   }
   const footTargets=[];for(const {side,ankle,q} of feet){
    const foot=j['foot'+side],error=coach.solve(j['thigh'+side],j['knee'+side],foot,ankle,V(side==='L'?-.08:.08,.1,1));coach.orient(foot,q);
    const shin=coach.point(j['knee'+side]).sub(coach.point(foot)).normalize().applyQuaternion(q.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
    footTargets.push({side,contact:ankle.clone().add(V(0,-.102,.215).applyQuaternion(q)).toArray(),lift:0,error});
   }
   return {gloves:palms,handErrors:errors,footTargets,motionState:{load:.35*sweep+.25*catchPulse,drive:catchPulse*.4,left:hook&&sweepSide==='L'?sweep:0,right:hook&&sweepSide==='R'?sweep:0,rope:0}};
  }
  poseBoxer(coach){
   const {hook,move,heroPhase:phase}=this.padPose;if(!hook||move!=='roll')return;
   const q=smooth(phase),dip=Math.sin(q*Math.PI),j=coach.joints;
   const rootQ=coach.root.getWorldQuaternion(Q()).invert(),feet=['L','R'].map(side=>({side,ankle:coach.point(j['foot'+side]),q:j['foot'+side].getWorldQuaternion(Q()).premultiply(rootQ)}));
   // Roll into the passing arc through a hip hinge, keeping both soles planted.
   // Normal punches retain the wider stance separation and full reach.
   j.hips.position.z+=.075*dip;j.spine.rotation.x+=.08*dip;j.chest.rotation.x+=.06*dip;
   j.neck.rotation.x-=.095*dip;j.head.rotation.x-=.125*dip;
   const footTargets=[];for(const {side,ankle,q} of feet){
    const foot=j['foot'+side],error=coach.solve(j['thigh'+side],j['knee'+side],foot,ankle,V(side==='L'?-.08:.08,.1,1));coach.orient(foot,q);
    const shin=coach.point(j['knee'+side]).sub(coach.point(foot)).normalize().applyQuaternion(q.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
    footTargets.push({side,contact:ankle.clone().add(V(0,-.102,.215).applyQuaternion(q)).toArray(),lift:0,error});
   }
   const gloves=['L','R'].map(side=>coach.orientGlove(side,0,V(0,-1,0)));
   return {gloves,footTargets,motionState:{load:dip*.8,drive:Math.max(0,-Math.cos(q*Math.PI))*.45}};
  }
  poseRope(hero){
   const {phase,jump,transfer,single,support,alternating,clock}=this.ropePose,j=hero.joints,angle=2*Math.PI*(phase-.5);
   // Grounded loading/landing bend the legs; the torso counterbalances while
   // the head stays directed forward. Hands turn beside the hips, not in guard.
   const load=Math.cos(Math.PI*phase)**4,landing=Math.exp(-(((phase-.90)/.11)**2)),coil=Math.max(load,landing),lean=.045+.070*coil;
   const sway=Math.sin(Math.PI*(clock-.5)),twist=.042*sway,breath=.012*Math.sin(clock*Math.PI*.5);
   // Elastic ankle/knee loading with a small two-beat boxer shift. Rotation
   // is distributed through the back instead of translating a rigid torso.
   j.hips.position.y-=.062*coil;j.hips.position.x+=transfer*.030+sway*.014;j.hips.rotation.z=-transfer*.022-sway*.008;j.hips.rotation.y+=twist*.38;
   j.spine.rotation.x+=lean*.45;j.spine.rotation.y+=twist*.32;j.chest.rotation.x+=lean*.55+breath;j.chest.rotation.y+=twist*.30;j.chest.rotation.z+=transfer*.015-sway*.012;
   j.neck.rotation.x-=lean*.35;j.head.rotation.x-=lean*.50-.020*Math.sin(angle-.35);j.neck.rotation.y-=twist*.35;j.head.rotation.y-=twist*.35;
   const handY=hero.species==='rabbit'?1.29:1.13,footLifts=[],footTargets=[],gloves=[],handErrors=[];
   for(const [i,side] of ['L','R'].entries()){
    const sign=i?1:-1,lift=single?(sign===support?0:.21):alternating?.18*Math.max(0,-sign*transfer)**2:0,foot=j['foot'+side];footLifts.push(lift);
    const heel=.18*Math.sin(Math.PI*phase)**2+.055*Math.sin(2*Math.PI*phase)**2,q=Q().setFromEuler(new THREE.Euler(heel*(1-Math.min(1,lift/.21))-lift*.6,0,0));
    const contact=V(sign*.115+sway*.008,.015+lift,.19-lift*.55+sway*sign*.008),ankle=contact.clone().sub(V(0,-.102,.215).applyQuaternion(q));
    const error=hero.solve(j['thigh'+side],j['knee'+side],foot,ankle,V(sign*.08,.1,1));hero.orient(foot,q);const shin=hero.point(j['knee'+side]).sub(hero.point(foot)).normalize().applyQuaternion(q.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);footTargets.push({side,contact:contact.toArray(),lift:jump+lift,error});
    j['arm'+side].position.y+=.008*Math.cos(angle-.25);j['arm'+side].position.z+=.018*coil+sign*.009*sway;
    const hand=V(sign*(.315+.006*Math.sin(angle-.2))+sway*.010,handY+.018*Math.cos(angle)-.025*coil,.16-.025*Math.sin(angle)+sign*.012*sway);
    handErrors.push(hero.solve(j['arm'+side],j['elbow'+side],j['hand'+side],hand,V(sign*.045,-.85,-.40)));
    gloves.push(hero.orientGlove(side,1,V(0,1,0)));
    // Rope-specific wrist flex/deviation; boxing strikes retain neutral wrists.
    j['hand'+side].quaternion.multiply(Q().setFromEuler(new THREE.Euler(.075*Math.sin(angle),sign*.035*Math.cos(angle),sign*.045*Math.sin(angle-.3))));
   }
   this.ropePose.footLifts=footLifts;
   return {gloves,handErrors,footTargets,motionState:{load:coil,drive:Math.max(0,Math.sin(2*Math.PI*phase)),rope:1,left:.25+.20*Math.sin(angle-.3),right:.25+.20*Math.sin(angle+.3)}};
  }
  updateRope(t,time,frame){
   const hero=this.engine.coach,exercise=ropeDrills[this.exercise],clock=t*exercise.cadence,phase=clock%1,cycle=Math.floor(clock),flight=clamp((phase-.12)/.76),jump=exercise.height*Math.sin(flight*Math.PI)**2;
   const alternating=this.exercise==='alternating',single=this.exercise.endsWith('_leg'),support=this.exercise==='left_leg'?-1:1,transfer=alternating?Math.sin(Math.PI*(clock-.5)):single?support:.25*Math.sin(Math.PI*(clock-.5));
   this.ropePose={phase,jump,transfer,single,support,alternating,clock};hero.root.position.set(0,jump,0);hero.root.rotation.set(0,0,0);hero.update(0,'guard','one_two',{simulationTime:time,poseOverlay:this.finalizeRope});this.arena.group.updateMatrixWorld(true);
   const ends=this.grips.map(g=>this.root.worldToLocal(g.userData.exit.getWorldPosition(V()))),height=(ends[0].y+ends[1].y)/2-jump,radius=height+.055,angle=2*Math.PI*(phase-.5),points=this.ropePoints;
   for(let i=0;i<=96;i++){const u=i/96,a=u*Math.PI,envelope=Math.sin(a),bow=envelope*envelope;
    // A taut loop with small phase lag toward its centre, asymmetric shoulders
    // and a traveling bend. Zero lag at overhead/underfoot preserves clearance.
    const lag=.12*Math.sin(angle)*bow,turn=angle+lag,overhead=Math.max(0,-Math.cos(turn));
    const rad=(radius+.12*overhead)*Math.pow(envelope,.55),point=points[i].copy(ends[0]).lerp(ends[1],u);
    point.y-=rad*Math.cos(turn);point.z-=rad*Math.sin(turn);
    // The loop bows outside the shoulders even with hands tucked at the
    // hips; narrowing the grips must not pull the cable through the mane.
    point.x-=Math.min(.14,Math.abs(ends[1].x-ends[0].x)*.11)*Math.sin(2*a);point.x+=.018*Math.sin(angle)*Math.sin(2*a)*envelope;}
   this.ropeClearance.update();this.ropeClearance.route(points);
   const p=this.rope.geometry.attributes.position,n=this.rope.geometry.attributes.normal,{tangent,normal,binormal}=this.ropeFrame;
   normal.set(1,0,0);
   for(let i=0;i<points.length;i++){
    tangent.copy(points[Math.min(96,i+1)]).sub(points[Math.max(0,i-1)]).normalize();
    // Transport the frame along the curve; world-up cross products flip when
    // a branch bows past its handle to clear a shoulder or arm.
    normal.addScaledVector(tangent,-normal.dot(tangent));if(normal.lengthSq()<1e-8)normal.set(0,0,1).addScaledVector(tangent,-tangent.z);normal.normalize();binormal.copy(tangent).cross(normal).normalize();
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2,c=Math.cos(a),s=Math.sin(a),x=normal.x*c+binormal.x*s,y=normal.y*c+binormal.y*s,z=normal.z*c+binormal.z*s;p.setXYZ(i*6+k,points[i].x+.0045*x,points[i].y+.0045*y,points[i].z+.0045*z);n.setXYZ(i*6+k,x,y,z);}
   }p.needsUpdate=n.needsUpdate=true;
   if(phase>.54&&this.once('jump'+cycle))frame.jumps=1;
   frame.cue=exercise.name+' · soft landings, relaxed shoulders, wrist turns';frame.hero=hero.metrics;frame.rope={exercise:this.exercise,phase,jump,footLifts:this.ropePose.footLifts,ends:ends.map(v=>v.toArray()),lowest:Math.min(...points.map(v=>v.y)),centre:points[48].toArray()};
  }
  contactWithMitt(pad,fist,before,face,previousFace,dt){
   this.padClosingSpeed=0;if(!before||!previousFace||!(dt>0&&dt<=.20))return false;
   this.padNormalMatrix.getNormalMatrix(pad.matrixWorld);this.padNormal.set(0,0,1).applyMatrix3(this.padNormalMatrix).normalize();
   this.padVelocity.copy(fist).sub(before).sub(face).add(previousFace).multiplyScalar(1/dt);this.padClosingSpeed=Math.max(0,Math.min(5,-this.padVelocity.dot(this.padNormal)));
   if(this.padClosingSpeed<=.12)return false;
   pad.worldToLocal(this.padLocal.copy(fist));pad.worldToLocal(this.padBeforeLocal.copy(before).add(face).sub(previousFace));
   const centre=pad.userData.face,a=this.padBeforeLocal.z-centre.z,b=this.padLocal.z-centre.z;
   if(a<-.035||b>.035)return false;
   this.padContactFraction=Math.max(0,Math.min(1,a/(a-b||1)));this.padContactLocal.copy(this.padBeforeLocal).lerp(this.padLocal,this.padContactFraction);
   return ((this.padContactLocal.x-centre.x)/.125)**2+((this.padContactLocal.y-centre.y)/.145)**2<=1;
  }
  updatePads(t,time,frame){
   const hero=this.engine.coach,trainer=this.trainer,beat=Math.floor(t/1.20),part=beat%8,autoPhase=(t/1.20)%1,autoMove=mittSequence[part],autoHook=autoMove==='roll',manual=this.engine.player?.frame(time),spec=manual||{move:autoMove,phase:autoPhase,attack:!autoHook,index:beat},phase=manual?spec.phase:autoPhase,hook=manual?spec.move==='roll':autoHook;
   hero.root.position.set(0,0,-.60);hero.root.rotation.set(0,0,0);
   const sweepSide=Math.floor(beat/4)%2?'R':'L';
   this.padPose={t,phase,hook,move:spec.move,heroPhase:spec.phase,sweepSide,sweepHeight:1.96};
   // Boxing distance gives the trainee room to extend each punch.
   trainer.root.position.set(0,0,.60);
   trainer.update(0,'guard','one_two',{simulationTime:time,deferVisuals:this.deferVisuals,guardElbowBack:.5,guardWidth:.22,keepFaceClear:true,poseOverlay:this.finalizeTrainer});
   this.arena.group.updateMatrixWorld(true);
   const targetIndex=rear(spec.move)?1:0,pad=this.mitts[targetIndex],worldTarget=pad.localToWorld(pad.userData.face.clone()),target=hero.root.worldToLocal(worldTarget.clone());
   hero.update(spec.phase*1.22,spec.move,'one_two',{simulationTime:time,deferVisuals:this.deferVisuals,duckDepth:hero.species==='rabbit'?.24:.16,earFold:hook&&spec.move==='roll'?.58*Math.sin(Math.PI*phase)**2:0,guardElbowBack:.5,keepFaceClear:true,guardCover:manual?1:0,guardHeight:manual?1.72:undefined,guardStyle:spec.guardStyle,brace:spec.brace,defenceSide:spec.defenceSide,stepDirection:spec.stepDirection,stepAdvance:spec.stepAdvance,planUppercut:spec.move.includes('uppercut'),uppercutBagTarget:spec.move.includes('uppercut')?[target.x,target.y-.18,target.z-.02]:undefined,knuckleTarget:target.toArray(),strikeHeight:target.y,planStraight:true,advance:(spec.move==='jab'||spec.move==='cross')?.065:spec.move.includes('uppercut')?.08:.025,contactDrive:(spec.move==='jab'||spec.move==='cross')?.045:spec.move.includes('uppercut')?.025:0,shoulderCover:(spec.move==='jab'||spec.move==='cross')?.055:0,guardTightness:1,power:1.15,straightRecovery:.25,poseOverlay:this.finalizeBoxer});this.arena.group.updateMatrixWorld(true);
   const dt=this.last<0?0:t-this.last;
   if(spec.attack){
    if(spec.phase>.2&&this.once('swing'+spec.index))frame.swings.push({actor:'lion',move:spec.move});
    const fist=hero.root.localToWorld(V(...hero.metrics.gloves[targetIndex].strikePoint)),incoming=this.contactWithMitt(pad,fist,this.previousFist[targetIndex],worldTarget,this.previousPadFace[targetIndex],dt),speed=this.padClosingSpeed;
    if(!hook&&spec.phase>.25&&spec.phase<.80&&incoming&&this.once('hit'+spec.index)){
     frame.contacts.push({actor:'lion',receiver:'pads',part:'glove',kind:'pad',move:spec.move,blocked:false,closingSpeed:speed,impulse:speed*(rear(spec.move)?7.2:5.8),point:pad.localToWorld(this.padWorldContact.copy(this.padContactLocal)).toArray(),normal:this.padNormal.toArray(),relativeVelocity:this.padVelocity.toArray(),localPoint:this.padContactLocal.toArray(),hand:targetIndex?'R':'L',actionId:'pads:'+this.sessionId+':'+spec.index,attacker:'hero',defender:'trainer',targetRegion:'mitt',outcome:'clean',sampleTime:time,time:time-dt*(1-this.padContactFraction),contactFraction:this.padContactFraction});pad.userData.hitAt=t;pad.userData.hitForce=Math.max(.65,Math.min(1.25,speed/2.4));
    }this.previousFist[targetIndex]=fist;this.previousPadFace[targetIndex]=worldTarget;
   }
   if(hook&&phase>.40&&phase<.72){const head=hero.root.localToWorld(V(...hero.metrics.head)),mitt=this.mitts[sweepSide==='L'?0:1].localToWorld(this.mitts[0].userData.face.clone());if(spec.move==='roll'&&head.y+.29<mitt.y&&Math.hypot(head.x-mitt.x,head.z-mitt.z)<.32&&this.once('defence'+(manual?spec.index:beat)))frame.defences=1;}
   const cues=mittCues[window.app?.lang]||mittCues.en;frame.cue=cues[hook?'roll':spec.move]||cues.guard;frame.hero=hero.metrics;frame.partner=trainer.metrics;frame.padPhase={hook,phase,sweepSide,targetIndex};
  }
  advance(time){
   if(this.mode!=='pads'||!this.padClock)return this.update(time);
   let delta=time-this.padRequestedTime;
   if(delta< -1e-8||delta>.20){this.padClock.reset(time);this.padFrame=null;this.last=-1;this.previousFist={};this.previousPadFace={};delta=0;}
   this.padRequestedTime=time;
   const count=Math.floor((Math.min(this.padClock.accumulator+Math.max(0,delta),this.padClock.step*this.padClock.maxSteps)+1e-12)/this.padClock.step);
   if(!count){this.padClock.advance(Math.max(0,delta),this.padStep);if(!this.padFrame)this.padFrame=this.update(this.padClock.time);const frame={...this.padFrame,contacts:[],swings:[],defences:0,jumps:0};frame.poseTime=this.padClock.time;this.arena.metrics=frame;return frame;}
   this.padContacts=[];this.padSwings=[];this.padDefences=0;this.padRenderTick=this.padClock.tick+count;
   this.padClock.advance(Math.max(0,delta),this.padStep);this.deferVisuals=false;
   const frame=this.padFrame;frame.contacts=this.padContacts;frame.swings=this.padSwings;frame.defences=this.padDefences;frame.poseTime=this.padClock.time;this.arena.metrics=frame;return frame;
  }
  update(time){const t=Math.max(0,time-this.start),frame={mode:this.mode,contacts:[],swings:[],loads:[],jumps:0,defences:0};this.arena.previousTime=time;if(this.mode==='rope')this.updateRope(t,time,frame);else this.updatePads(t,time,frame);this.last=t;this.arena.metrics=frame;return frame;}
 }
 const set=TrainingArena.prototype.setTarget,update=TrainingArena.prototype.update,fit=TrainingArena.prototype.fitCamera;
 TrainingArena.prototype.setTarget=function(mode){this.careerDrill?.dispose();this.careerDrill=null;if(!['rope','pads'].includes(mode))return set.call(this,mode);set.call(this,'none');this.mode=mode;this.engine.targetMode=mode;this.engine.scene.add(this.group);this.group.add(this.engine.coach.root);this.group.rotation.y=mode==='pads'?.95:.38;this.careerDrill=new CareerDrill(this,mode);this.update(this.engine.animTime);this.fitCamera(this.engine.camera);};
 TrainingArena.prototype.update=function(time,technique,combo){return this.careerDrill?this.careerDrill.advance(time):update.call(this,time,technique,combo);};
 TrainingArena.prototype.fitCamera=function(camera){if(!this.careerDrill)return fit.call(this,camera);const height=this.mode==='rope'?(this.engine.coach.species==='rabbit'?3.12:2.86):2.55,width=this.mode==='rope'?1.8:2.35,fov=THREE.MathUtils.degToRad(camera.fov);camera.position.set(0,1.70,Math.max(height/(2*Math.tan(fov/2)),width/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))+.35);camera.lookAt(0,height*.48,0);this.engine.viewControls?.refit(V(0,height*.48,0));};
 CareerDrill.ropeDrills=ropeDrills;window.CareerDrill=CareerDrill;
})();
