/* Articulated mitt work and forward skipping. Gear is always attached to the rig. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Q=()=>new THREE.Quaternion();
 const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);},rear=m=>['cross','rear_hook','rear_uppercut'].includes(m);
 let stationSequence=0;
 // Mitt-work range. Partners stand at jab distance, so a straight punch lands with a
 // long, unlocked arm; bent-arm punches and the roll close the gap with real steps.
 const padRange=1.74,gloveLength=.204,straightReachMargin=.004;
 // Coach footwork for inside work: [lead-foot step, rear-foot step, pelvis travel] in metres.
 const coachSteps={roll:[.34,.20,.27],uppercut:[.20,.08,.14],hook:[0,0,.03],hold:[0,0,0]};
 // How far the boxer steps in before each bent-arm punch or roll (see LionCoach `advance`).
 // GOTR-0032: a power shot drives THROUGH the mitt face (metres past it, into the pad) instead of easing to a
 // stop on it, and the struck mitt pops back by type (peak about 0.7 x depth x force).
 const driveThrough={hook:.05,rear_hook:.05,uppercut:.045,rear_uppercut:.045},popDepth={jab:.085,cross:.09,hook:.095,rear_hook:.10,uppercut:.08,rear_uppercut:.085};
 const boxerAdvance={hook:.15,rear_hook:.19,uppercut:.12,rear_uppercut:.12,roll:.20};
 const mittSequence=['jab','cross','roll','uppercut','rear_hook','rear_uppercut','roll','hook'];
 const mittCues={};
 for(const [lang,column,meet,up,roll] of [['en',1,'meet the mitt and recover guard','drive up into the mitt and recover','Roll under the hook'],['he',3,'פגעו בכפפה וחזרו להגנה','עלו אל הכפפה וחזרו להגנה','התכופפו מתחת להוק'],['ru',5,'попадите в лапу и вернитесь в защиту','удар снизу в лапу и возврат в защиту','Нырок под хук']]){
  const cues=mittCues[lang]={roll,guard:window.COACH_TECHNIQUES?.guard?.[column]||'Guard'};
  for(const move of mittSequence)if(move!=='roll')cues[move]=(window.COACH_TECHNIQUES?.[move]?.[column]||move)+' · '+(move.includes('uppercut')?up:meet);
 }
 // GOTR-0048: boxer rope exercises. cadence = jumps per second, hop = ballistic rise of the
 // forefoot contact (m), level = suggested career level (tag only). Legacy ids map via ropeAliases.
 const ropeDrills={bounce:{name:'Basic bounce',cadence:2.1,hop:.04,level:1},boxer_skip:{name:'Boxer skip',cadence:2.2,hop:.035,level:1,support:'alternate',swing:.045,swingZ:-.35},side_hops:{name:'Side & front hops',cadence:2.0,hop:.045,level:2},shuffle:{name:'Boxer shuffle',cadence:2.2,hop:.04,level:2,scissor:.075},high_knees:{name:'High knees',cadence:2.3,hop:.035,level:3,support:'alternate',swing:.36,swingZ:.5,shape:4},double_under:{name:'Double unders',cadence:1.9,hop:.13,level:4,turns:2},freestyle:{name:'Free combination',cadence:2.1,hop:.04,level:4,sequence:['bounce','boxer_skip','shuffle','side_hops','high_knees','bounce','double_under']}};
 // Criss-cross is unfinished (crossed cable still clips the forearms): off unless enabled.
 if(window.ROPE_CRISS_CROSS)ropeDrills.criss_cross={name:'Criss-cross',cadence:2.0,hop:.045,level:3,cross:true};
 const ropeAliases={mixed:'freestyle',two_feet:'bounce',alternating:'boxer_skip',left_leg:'boxer_skip',right_leg:'boxer_skip'};
 const ropeCues={en:{bounce:'Basic bounce',boxer_skip:'Boxer skip',side_hops:'Side & front hops',shuffle:'Boxer shuffle',high_knees:'High knees',criss_cross:'Criss-cross',double_under:'Double unders',freestyle:'Free combination',form:'light on the balls of the feet, elbows in, wrists turn'},he:{bounce:'קפיצה בסיסית',boxer_skip:'Boxer skip',side_hops:'צד וקדימה',shuffle:'Boxer shuffle',high_knees:'ברכיים גבוהות',criss_cross:'ידיים מוצלבות',double_under:'סיבוב כפול',freestyle:'שילוב חופשי',form:'קל על כריות הרגליים, מרפקים צמודים, סיבוב בפרקי הידיים'},ru:{bounce:'Базовые прыжки',boxer_skip:'Boxer skip',side_hops:'Вбок и вперёд',shuffle:'Boxer shuffle',high_knees:'Высокие колени',criss_cross:'Скрёстно',double_under:'Двойной оборот',freestyle:'Свободная связка',form:'легко на носках, локти прижаты, крутят кисти'}};
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
  route(points,swap){
   this.maxCorrection=0;
   for(let i=1;i<points.length-1;i++){
    const p=points[i],original=p.x,side=swap==null?(i<(points.length-1)/2?-1:1):(original<swap?-1:1);let next=original;
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
    this.exercise=ropeDrills[this.engine.ropeDrill]?this.engine.ropeDrill:ropeAliases[this.engine.ropeDrill]||'bounce';this.grips=['L','R'].map(side=>TrainingGear.ropeGrip(this.engine.coach,side));
    const segments=96,sides=6,p=new Float32Array((segments+1)*sides*3),index=[];for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;index.push(a,b,a+sides,b,b+sides,a+sides);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const uv=[];for(let i=0;i<=segments;i++)for(let k=0;k<sides;k++)uv.push(i/segments*24,k/sides*2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);this.rope=new THREE.Mesh(g,TrainingGear.cordMaterial());this.rope.name='Round woven skipping cable';this.rope.frustumCulled=false;this.rope.castShadow=true;this.root.add(this.rope);this.ropePoints=Array.from({length:97},()=>V());this.ropeFrame={tangent:V(),normal:V(),binormal:V()};this.ropeClearance=new RopeBodyClearance(this.engine.coach,this.root);this.finalizeRope=coach=>this.poseRope(coach);this.rope.geometry.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(p.length),3));this.rope.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);this.rope.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
   }else{
    const species=this.engine.coach.species==='lion'?'rabbit':'lion';arena.padTrainers=arena.padTrainers||{};this.trainer=arena.padTrainers[species]||(arena.padTrainers[species]=new LionCoach(arena.data,{species}));this.root.add(this.trainer.root);this.trainer.root.position.set(0,0,padRange/2);this.trainer.root.rotation.set(0,Math.PI,0);this.mitts=['L','R'].map(side=>TrainingGear.mitt(this.trainer,side));this.previousFist={};this.previousPadFace={};this.padNormal=new THREE.Vector3();this.padNormalMatrix=new THREE.Matrix3();this.padVelocity=new THREE.Vector3();this.padLocal=new THREE.Vector3();this.padBeforeLocal=new THREE.Vector3();this.padContactLocal=new THREE.Vector3();this.padWorldContact=new THREE.Vector3();this.finalizeTrainer=coach=>this.poseTrainer(coach);this.finalizeBoxer=coach=>this.poseBoxer(coach);
    this.padClock=window.BoxingPose&&(typeof location==='undefined'||new URLSearchParams(location.search).get('padClock')!=='legacy')?new BoxingPose.FixedStepClock({step:1/120,maxSteps:24}):null;this.padClock?.reset(this.start);this.padRequestedTime=this.start;this.padFrame=null;this.padStep=time=>{this.deferVisuals=this.padClock.tick<this.padRenderTick;const frame=this.update(time);this.padContacts.push(...frame.contacts);this.padSwings.push(...frame.swings);this.padDefences+=frame.defences||0;this.padFrame=frame;};
   }
  }
  dispose(){this.engine.coach.root.position.set(0,0,0);for(const prop of this.grips||this.mitts||[])TrainingGear.dispose(prop);if(this.trainer)this.trainer.root.parent?.remove(this.trainer.root);this.root.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});this.root.parent?.remove(this.root);}
  once(key){if(this.seen.has(key))return false;this.seen.add(key);if(this.seen.size>80)this.seen.delete(this.seen.values().next().value);return true;}
  face(pad){return this.trainer.root.worldToLocal(pad.localToWorld(pad.userData.face.clone()));}
  // Authored body commitment of the boxer for each mitt punch.
  boxerDrive(move){
   const straight=move==='jab'||move==='cross',upper=move.includes('uppercut');
   return {advance:straight?.02:boxerAdvance[move]??.025,contactDrive:move==='jab'?.015:upper?.025:0,shoulderCover:straight?.055:0,armReachMargin:straight?straightReachMargin:undefined,stepLift:boxerAdvance[move]?.036:undefined,guardTightness:1,power:1.15,straightRecovery:.25};
  }
  // The coach reads the boxer's reach once per session: where the striking
  // shoulder finishes each straight and how long the unlocked arm is.
  measureReach(hero){
   this.reachOwner=hero;this.reach={};hero.update(0,'guard','one_two',{deferVisuals:true});
   for(const move of ['jab','cross']){
    const side=move==='jab'?'L':'R',j=hero.joints;
    hero.update(.445*1.22,move,'one_two',{...this.boxerDrive(move),guardElbowBack:.5,deferVisuals:true});
    const shoulder=hero.point(j['arm'+side]);
    // Boxer space to coach space: the partners face each other across padRange.
    this.reach[move]={shoulder:V(-shoulder.x,shoulder.y,padRange-shoulder.z),length:j['elbow'+side].position.length()+j['hand'+side].position.length()-straightReachMargin+gloveLength};
   }
  }
  // Depth, in coach space, at which a mitt centred on (x,y) touches the
  // knuckles of the boxer's fully extended straight.
  reachDepth(move,goal){const r=this.reach[move],dx=goal.x-r.shoulder.x,dy=goal.y-r.shoulder.y;return r.shoulder.z-Math.sqrt(Math.max(.04,r.length*r.length-dx*dx-dy*dy));}
  placeMitt(side,goal,palm=V(0,0,1),catchingUpper=false,elbow=null){
   const coach=this.trainer,j=coach.joints,pad=this.mitts[side==='L'?0:1],pole=elbow||V((side==='L'?-1:1)*(.7+.4*palm.y),catchingUpper?-.45:-.45-1.8*palm.y,-.12);let error=0;
   // Solve the actual catching face, not the hand origin. Pronation follows
   // the forearm, so even a palm-down sweep retains a straight wrist.
   for(let i=0;i<5;i++){
    const delta=goal.clone().sub(this.face(pad)),wrist=coach.point(j['hand'+side]).add(delta);
    error=coach.solve(j['arm'+side],j['elbow'+side],j['hand'+side],wrist,pole);coach.orientGlove(side,1,palm);
   }
   return error;
  }
  poseTrainer(coach){
   const {phase,hook,sweepSide,move}=this.padPose,j=coach.joints;
   const rootQ=coach.root.getWorldQuaternion(Q()).invert(),feet=['L','R'].map(side=>({side,ankle:coach.point(j['foot'+side]),q:j['foot'+side].getWorldQuaternion(Q()).premultiply(rootQ),lift:0}));
   const sweep=hook?smooth((phase-.08)/.23)*(1-smooth((phase-.76)/.22)):0;
   const travel=smooth((phase-.18)/.56),sign=sweepSide==='L'?-1:1;
   const catchPulse=hook?0:Math.sin(Math.PI*smooth((phase-.16)/.65))**2;
   const upper=move.includes('uppercut'),hookPunch=move==='hook'||move==='rear_hook',catchSide=rear(move)?'R':'L';
   // Inside work: the coach closes the distance with a real lead-then-rear step and
   // returns rear-then-lead. Straight punches are caught from the planted stance.
   const [leadStep,rearStep,lean]=coachSteps[hook?'roll':upper?'uppercut':hookPunch?'hook':'hold'];
   const leadOut=clamp((phase-.03)/.19),leadBack=clamp((phase-.81)/.16),rearOut=clamp((phase-.17)/.17),rearBack=clamp((phase-.69)/.15);
   const leadIn=smooth(leadOut)-smooth(leadBack),rearIn=smooth(rearOut)-smooth(rearBack),closeIn=lean*(.65*leadIn+.35*rearIn);
   feet[0].ankle.z+=leadStep*leadIn;feet[0].lift=.045*Math.min(1,leadStep/.2)*(Math.sin(Math.PI*leadOut)**2+Math.sin(Math.PI*leadBack)**2);
   feet[1].ankle.z+=rearStep*rearIn;feet[1].lift=.045*Math.min(1,rearStep/.2)*(Math.sin(Math.PI*rearOut)**2+Math.sin(Math.PI*rearBack)**2);
   for(const foot of feet)foot.ankle.y+=foot.lift;
   let shock=0;for(const pad of this.mitts){const age=this.padPose.t-(pad.userData.hitAt??-100);if(age>=0)shock=Math.max(shock,(1-Math.exp(-age/.025))*Math.exp(-age/.15));}
   // GOTR-0032: crisp pop per mitt (fast rise, ~0.12 s recovery) scaled by the blow; the holder absorbs it:
   // the struck shoulder turns back, the trunk braces and the knees give a little.
   const pops=this.mitts.map(pad=>{const age=this.padPose.t-(pad.userData.hitAt??-100);return age>=0?(pad.userData.hitForce??1)*(1-Math.exp(-age/.012))*Math.exp(-age/.12):0;}),brace=Math.max(...pops);
   j.hips.position.y-=.035*(sweep+catchPulse);j.hips.position.x+=.010*Math.sin(this.padPose.t*1.3);j.hips.rotation.y-=sign*.08*sweep;
   // Reach over the roll through the step, a small hip hinge and shoulder glide.
   j.hips.position.z+=.035*sweep+closeIn;j.spine.rotation.x+=.11*sweep-.020*shock;j.chest.rotation.x+=.09*sweep-.035*shock;
   j.spine.rotation.y-=sign*.10*sweep;j.chest.rotation.y-=sign*(.13*sweep-.055*catchPulse);
   const give=.08*(pops[1]-pops[0]);j.chest.rotation.y+=give;j.spine.rotation.y+=.5*give;j.spine.rotation.x-=.035*brace;j.chest.rotation.x-=.03*brace;j.hips.position.y-=.012*brace;
   j.chest.rotation.x+=.025*catchPulse;j.neck.rotation.y+=sign*.06*sweep;j.head.rotation.y+=sign*.08*sweep;
   const ready=upper?smooth(phase/.18)*(1-smooth((phase-.72)/.25)):0,feed=hookPunch?smooth((phase-.04)/.22)*(1-smooth((phase-.62)/.26)):0;
   // Turn the catching shoulder toward an inside punch so the rear arm is not left
   // reaching across a bladed stance; the eyes stay on the boxer.
   const turnIn=(catchSide==='R'?-1:.35)*(.24*ready+.18*feed);j.spine.rotation.y+=.4*turnIn;j.chest.rotation.y+=.6*turnIn;j.neck.rotation.y-=.45*turnIn;j.head.rotation.y-=.45*turnIn;
   // Lower the pelvis just enough that neither leg is asked to reach past its bones.
   coach.root.updateMatrixWorld(true);let drop=0;
   for(const {side,ankle} of feet){const start=coach.point(j['thigh'+side]),reach=j['knee'+side].position.length()+j['foot'+side].position.length()-.004,dx=start.x-ankle.x,dz=start.z-ankle.z;drop=Math.max(drop,start.y-ankle.y-Math.sqrt(Math.max(.01,reach*reach-dx*dx-dz*dz)));}
   j.hips.position.y-=drop;
   const palms=[],errors=[];
   for(const [i,side] of ['L','R'].entries()){
    const pad=this.mitts[i],recoil=(pad.userData.popDepth??.065)*pops[i];pad.userData.recoil=recoil;
    const goal=V(i?.20:-.20,1.82+.010*Math.sin(this.padPose.t*2.3+i),0),palm=V(0,0,1),straight=i?'cross':'jab',catching=side===catchSide;let elbow=null;
    // A straight is caught at the end of the boxer's reach: the mitt waits just
    // beyond it, meets the arriving glove and then gives with the impact.
    const meet=move===straight?smooth((phase-.38)/.08)*(1-smooth((phase-.56)/.20)):0;
    goal.z=this.reachDepth(straight,goal)-.035+.055*meet;
    const catchingUpper=upper&&catching;
    if(catchingUpper){goal.lerp(V(0,1.80,.58+closeIn),ready);palm.set(0,-Math.sin(ready*Math.PI/2),Math.cos(ready*Math.PI/2));}
    else if(upper)goal.lerp(V(i?.24:-.24,1.96,.43+closeIn),ready);
    if(hookPunch&&catching){
     // Feed the hook mitt forward and turn its face inward to meet the arc;
     // the elbow drops under the hand so the turn stays in the forearm.
     const turn=.87*feed;goal.lerp(V(i?.22:-.22,1.75,.57+closeIn),feed);palm.set((i?-1:1)*Math.sin(turn),0,Math.cos(turn));
     elbow=V((i?1:-1)*(.7-.4*feed),-.45-.55*feed,-.12-.13*feed);
    }
    if(hook&&side!==sweepSide)goal.lerp(V(i?.22:-.22,1.74,.29+closeIn),sweep);
    if(hook&&side===sweepSide){
     // Round sweep over the ducking boxer: chamber to the outside, pronate,
     // pass across the crown and fold back. The 90-degree turn is about the
     // forearm, never an artificial bend of the hand.
     const arc=Math.PI*travel,x=sign*(.14+.24*Math.cos(arc)),y=this.padPose.sweepHeight+.07*Math.sin(arc),z=.60+closeIn+.12*Math.sin(arc);
     goal.lerp(V(x,y,z),sweep);const roll=sweep*Math.PI/2;palm.set(0,-Math.sin(roll),Math.cos(roll));
    }
    // The struck mitt gives along its own face normal.
    goal.addScaledVector(palm,-recoil);if(catchingUpper)goal.z-=recoil*.3*ready;
    j['arm'+side].position.z+=.035*sweep+.012*catchPulse-.015*pops[i];j['arm'+side].position.y+=.045*sweep;pad.userData.palm=palm.clone();
    errors.push(this.placeMitt(side,goal,palm,catchingUpper,elbow));palms.push(coach.orientGlove(side,1,palm));pad.userData.cushion.scale.z=1-Math.min(.18,recoil*4);
   }
   const footTargets=[];for(const {side,ankle,q,lift} of feet){
    const foot=j['foot'+side],error=coach.solve(j['thigh'+side],j['knee'+side],foot,ankle,V(side==='L'?-.08:.08,.1,1));coach.orient(foot,q);
    const shin=coach.point(j['knee'+side]).sub(coach.point(foot)).normalize().applyQuaternion(q.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
    footTargets.push({side,contact:ankle.clone().add(V(0,-.102,.215).applyQuaternion(q)).toArray(),lift,error});
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
    const contact=ankle.clone().add(V(0,-.102,.215).applyQuaternion(q));footTargets.push({side,contact:contact.toArray(),lift:Math.max(0,contact.y-.015),error});
   }
   const gloves=['L','R'].map(side=>coach.orientGlove(side,0,V(0,-1,0)));
   return {gloves,footTargets,motionState:{load:dip*.8,drive:Math.max(0,-Math.cos(q*Math.PI))*.45}};
  }
  // GOTR-0048 boxer rope work. Every stance k is centred on an integer rope
  // clock (rope overhead); flight k (centred on k+.5) carries the rope under
  // the feet. Feet are planted in gym space for a whole stance, so they never
  // slide; any travel, stagger or swap happens only while the foot is airborne.
  ropeStyle(k){const spec=ropeDrills[this.exercise],seq=spec.sequence;return seq?seq[((Math.floor(k/4)%seq.length)+seq.length)%seq.length]:this.exercise;}
  ropeFlight(k){
   // Ballistic flight time follows the hop height (T = sqrt(8h/g)).
   const base=ropeDrills[this.exercise],style=ropeDrills[this.ropeStyle(k)],trick=this.ropeTrickClock,double=style.turns===2||(trick!=null&&k>=trick&&k<trick+3);
   const hop=double?(this.ropeStyle(k)==='double_under'&&!base.sequence?style.hop:1.226*(.64/base.cadence)**2):style.hop;
   return {hop,turns:double?2:1,f:Math.min(.72,Math.sqrt(8*hop/9.81)*base.cadence),style:this.ropeStyle(k)};
  }
  ropeStance(k,side){
   // Planted ball-of-foot position (gym space) or null when this foot is the
   // free leg of a single-support stance.
   const style=this.ropeStyle(k),spec=ropeDrills[style],sign=side==='L'?-1:1,odd=((k%2)+2)%2,flip=odd?1:-1;
   if(spec.support&&(odd?'R':'L')!==side)return null;
   let x=sign*.115,z=.185;
   if(style==='side_hops'){const m=((k%8)+8)%8;if(m<4)x+=flip*.07;else z+=flip*.06;}
   if(style==='shuffle')z+=sign*flip*spec.scissor;
   return V(x,.0062,z);
  }
  ropeBody(k){
   // Travel (root, x/z) and the lateral weight shift of the pelvis (w) per stance.
   const style=this.ropeStyle(k),spec=ropeDrills[style],odd=((k%2)+2)%2,flip=odd?1:-1,m=((k%8)+8)%8;
   const w=flip*(spec.support?(style==='high_knees'?.022:.03):style==='double_under'?.006:.013);
   return style==='side_hops'?(m<4?V(flip*.07,w*.5,0):V(0,w*.5,flip*.06)):V(0,w,0);
  }
  ropeClock(c){
   const k=Math.floor(c),fl=this.ropeFlight(k),u=c-k;
   if(Math.abs(u-.5)<=fl.f/2)return {flight:true,k,s:(u-.5)/(fl.f/2),fl};
   const K=u<.5?k:k+1,a=K-.5+this.ropeFlight(K-1).f/2,b=K+.5-this.ropeFlight(K).f/2;return {flight:false,K,v:clamp((c-a)/(b-a))};
  }
  ropeFoot(c,side,state){
   const sign=side==='L'?-1:1,K=state.flight?null:state.K;
   if(!state.flight){const p=this.ropeStance(K,side);if(p)return {ball:p,lift:0,planted:true};}
   // Airborne or free leg: travel from the previous planted spot to the next.
   let j=state.flight?state.k:K-1;while(!this.ropeStance(j,side))j--;
   let n=state.flight?state.k+1:K+1;while(!this.ropeStance(n,side))n++;
   const a=j+.5-this.ropeFlight(j).f/2,b=n-.5+this.ropeFlight(n-1).f/2,w=clamp((c-a)/(b-a));
   let swing=0,swingZ=0,shape=2;for(let m=j+1;m<n;m++){const spec=ropeDrills[this.ropeStyle(m)];if((spec.swing||0)>swing){swing=spec.swing;swingZ=spec.swingZ||0;shape=spec.shape||2;}}
   const lift=swing*Math.sin(Math.PI*w)**shape,ball=this.ropeStance(j,side).lerp(this.ropeStance(n,side),smooth(w));ball.z+=swingZ*lift;ball.x+=sign*.02*lift;
   if(state.flight)ball.y+=state.fl.hop*(1-state.s*state.s);ball.y+=lift;return {ball,lift,planted:false};
  }
  poseRope(hero){
   const R=this.ropePose,j=hero.joints,state=R.state,angle=R.angle,rabbit=hero.species==='rabbit';
   // Spring-mass legs: soft knees and ankles absorb each landing while the
   // heels stay up; the torso stays upright and the head is stabilised level.
   const load=state.flight?0:Math.sin(Math.PI*state.v),drive=state.flight?0:Math.max(0,Math.sin(Math.PI*(state.v-.5)))*smooth((state.v-.5)/.5);
   const single=!!ropeDrills[R.style].support,deep=R.style==='double_under'?.034:single?.028:.022,e=.012,base=.962;
   const H=state.flight?base+e+state.fl.hop*(1-state.s*state.s)*.92:base+e-(e+deep)*load;
   const sway=this.ropeSway||0,yaw=.028*Math.sin(Math.PI*(R.clock-.5))+(R.style==='shuffle'?.045*R.scissor:0),roll=-.6*sway;
   j.hips.position.set(sway,H,0);j.hips.rotation.set(.03,yaw,roll);
   j.spine.rotation.set(.02+.015*load,-yaw*.5,-roll*.55);j.chest.rotation.set(.012+.025*load+.012*Math.sin(R.clock*Math.PI*.5),-yaw*.4,-roll*.3);
   hero.root.updateMatrixWorld(true);
   const headQ=Q().setFromEuler(new THREE.Euler(.035+.04*load-.015*drive+.012*Math.sin(angle),-yaw*.15,0,'YXZ'));hero.orient(j.neck,hero.parentRotation(j.neck).slerp(headQ,.5));hero.orient(j.head,headQ);
   const footLifts=[],footTargets=[],gloves=[],handErrors=[],root=hero.root.position;
   for(const [i,side] of ['L','R'].entries()){
    const sign=i?1:-1,foot=j['foot'+side],f=R.feet[i];footLifts.push(f.lift);
    // Forefoot pivot (the rigid boot's toe edge): stance pitch keeps the heel
    // 2-3 cm up; flight and the free leg point the toes. The ankle is placed so
    // the planted contact never moves.
    const pitch=f.planted?.10+.16*(1-load):.26+(state.flight?.10*(1-state.s*state.s):0)+1.15*f.lift,q=Q().setFromEuler(new THREE.Euler(pitch,sign*.09,0,'YXZ'));
    const contact=f.ball.clone().sub(root),ankle=contact.clone().sub(V(0,-.086,.215).applyQuaternion(q));
    const error=hero.solve(j['thigh'+side],j['knee'+side],foot,ankle,V(sign*.10,.05+f.lift,1));hero.orient(foot,q);const shin=hero.point(j['knee'+side]).sub(hero.point(foot)).normalize().applyQuaternion(q.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);footTargets.push({side,contact:contact.toArray(),lift:Math.max(0,f.ball.y-.004),error});
    // Relaxed, low shoulders; elbows hang beside the ribs and the forearms stay
    // quiet while the wrists draw small circles that drive the rope.
    j['arm'+side].position.y+=-.012+.005*Math.cos(angle)-.006*load;j['arm'+side].position.z+=-.012;
    const lead=angle+.45,radius=R.turns===2?.030:.022,cross=R.cross,X=rabbit?.37:.385,Z=.19;
    const hand=V(sign*X+sign*.006*Math.sin(lead)+.8*sway,H-base+(rabbit?1.07:1.05)-radius*Math.cos(lead),Z-radius*Math.sin(lead));
    if(cross){hand.x+=(-sign*.04-hand.x)*cross;hand.z+=(.06+(i?0:.03))*cross;hand.y+=(.06+(i?0:.02))*cross;}
    handErrors.push(hero.solve(j['arm'+side],j['elbow'+side],j['hand'+side],hand,V(sign*(-.06+.30*cross),-1,-.55+.75*cross)));
    const turnOver=Math.PI*smooth((cross-.15)/.7);gloves.push(hero.orientGlove(side,1,V(-sign*(.18*Math.cos(turnOver)+Math.sin(turnOver)),Math.cos(turnOver),.22*Math.cos(turnOver))));
    // Rope-specific wrist flex/deviation; boxing strikes retain neutral wrists.
    j['hand'+side].quaternion.multiply(Q().setFromEuler(new THREE.Euler(.12*Math.sin(lead),sign*.05*Math.cos(lead),sign*.05*Math.sin(lead-.3))));
   }
   R.footLifts=footLifts;
   return {gloves,handErrors,footTargets,motionState:{load,drive,rope:1,left:.25+.20*Math.sin(angle-.3),right:.25+.20*Math.sin(angle+.3)}};
  }
  updateRope(t,time,frame){
   const hero=this.engine.coach,base=ropeDrills[this.exercise],clock=t*base.cadence,phase=clock%1,cycle=Math.floor(clock),trick=this.engine.ropeTrick;
   this.ropeTrickClock=trick&&trick.kind==='double'?Math.round((trick.start-this.start)*base.cadence):null;
   const state=this.ropeClock(clock),k=Math.floor(clock),fl=this.ropeFlight(k),turnFrac=(fl.turns*(clock-k))%1,angle=2*Math.PI*(turnFrac-.5),style=state.flight?fl.style:this.ropeStyle(state.K);
   // Body (root) drifts smoothly between stance centres; feet stay planted.
   const b0=this.ropeBody(k),b1=this.ropeBody(k+1),bodyShift=b0.lerp(b1,smooth(clock-k));
   let cross=0;for(let m=k-1;m<=k+1;m++)if(ropeDrills[this.ropeStyle(m)].cross&&((m%2)+2)%2===1)cross=Math.max(cross,smooth((clock-m+.08)/.22)*smooth((m+1.06-clock)/.22));
   const scissor=this.ropeStance(k,'L')&&this.ropeStance(k,'R')&&ropeDrills[this.ropeStyle(k)].scissor?Math.sign(this.ropeStance(k,'L').z-this.ropeStance(k,'R').z):0;
   hero.root.position.set(bodyShift.x,0,bodyShift.z);this.ropeSway=bodyShift.y;hero.root.rotation.set(0,0,0);
   const feet=['L','R'].map(side=>this.ropeFoot(clock,side,state)),jump=state.flight?state.fl.hop*(1-state.s*state.s):0;
   this.ropePose={phase,jump,clock,state,angle,style,turns:fl.turns,cross,scissor,bodyShift,feet};
   hero.update(0,'guard','one_two',{simulationTime:time,poseOverlay:this.finalizeRope});this.arena.group.updateMatrixWorld(true);
   const ends=this.grips.map(g=>this.root.worldToLocal(g.userData.exit.getWorldPosition(V()))),endsY=(ends[0].y+ends[1].y)/2,reach=endsY-.010,
    // The hands sit ahead of the feet: advance the loop so its low point sweeps
    // under the arches at mid-flight, and let it brush the floor in front.
    advance=Math.asin(Math.max(-.5,Math.min(.5,((ends[0].z+ends[1].z)/2-(feet[0].ball.z+feet[1].ball.z)/2+.12)/reach))),radius=reach/Math.cos(advance),dir=ends[1].x>=ends[0].x?1:-1,points=this.ropePoints,over=hero.species==='rabbit'?.30:.21;
   for(let i=0;i<=96;i++){const u=i/96,a=u*Math.PI,envelope=Math.sin(a),bow=envelope*envelope;
    // A taut loop with small phase lag toward its centre and a traveling bend.
    // Zero lag at overhead/underfoot keeps the bottom pass at its set height;
    // the flattened crown spans both boots so the cable sweeps under, not beside, them.
    const lag=.12*Math.sin(angle)*bow,turn=angle+advance+lag,overhead=Math.max(0,-Math.cos(turn));
    const flat=1-(1-clamp(envelope/.85))**2,rad=(radius+over*overhead)*flat,point=points[i].copy(ends[0]).lerp(ends[1],u);
    point.y-=rad*Math.cos(turn);point.z-=rad*Math.sin(turn);
    // The loop bows outside the shoulders even with hands tucked at the
    // hips; narrowing the grips must not pull the cable through the mane.
    point.x-=dir*Math.min(.14,Math.abs(ends[1].x-ends[0].x)*.11)*Math.sin(2*a);point.x+=.018*Math.sin(angle)*Math.sin(2*a)*envelope;
    // Criss-cross: each half of the loop swings back out to its own side.
    // Criss-cross: the wrists pronate so each handle points to the side its hand
    // crossed to; the cable halves then swing wide around the body as usual.
    if(cross)point.x+=cross*((u<.5?-dir:dir)*(hero.species==='rabbit'?.40:.44)-point.x)*Math.abs(Math.sin(2*a))**1.5;
    if(point.y<.006)point.y=.006;}
   this.ropeClearance.update();this.ropeClearance.route(points,cross?hero.root.position.x:null);
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
   const lang=window.app?.lang,cues=ropeCues[lang]||ropeCues.en;
   frame.cue=(cues[style]||cues.bounce)+' · '+cues.form;frame.hero=hero.metrics;frame.rope={exercise:this.exercise,style,level:base.level,phase,turn:turnFrac,pass:(turnFrac+advance/(2*Math.PI)+1)%1,cross:this.ropePose.cross,turns:fl.turns,jump,footLifts:this.ropePose.footLifts,ends:ends.map(v=>v.toArray()),lowest:Math.min(...points.map(v=>v.y)),centre:points[48].toArray()};
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
   hero.root.position.set(0,0,-padRange/2);hero.root.rotation.set(0,0,0);if(this.reachOwner!==hero)this.measureReach(hero);
   const sweepSide=Math.floor(beat/4)%2?'R':'L';
   this.padPose={t,phase,hook,move:spec.move,heroPhase:spec.phase,sweepSide,sweepHeight:1.96};
   // Boxing distance gives the trainee room to extend each punch.
   trainer.root.position.set(0,0,padRange/2);
   trainer.update(0,'guard','one_two',{simulationTime:time,deferVisuals:this.deferVisuals,guardElbowBack:.5,guardWidth:.22,keepFaceClear:true,poseOverlay:this.finalizeTrainer});
   this.arena.group.updateMatrixWorld(true);
   const targetIndex=rear(spec.move)?1:0,pad=this.mitts[targetIndex],worldTarget=pad.localToWorld(pad.userData.face.clone());
   // GOTR-0032: aim at where the face would be without its recoil (the glove drives on instead of chasing the
   // retreating pad) and, for hooks and uppercuts, a few centimetres through it so the glove arrives with speed.
   const palmWorld=(pad.userData.palm||V(0,0,1)).clone().transformDirection(trainer.root.matrixWorld),aim=worldTarget.clone().addScaledVector(palmWorld,(pad.userData.recoil||0)-(spec.attack?driveThrough[spec.move]||0:0)),target=hero.root.worldToLocal(aim);
   hero.update(spec.phase*1.22,spec.move,'one_two',{simulationTime:time,deferVisuals:this.deferVisuals,duckDepth:hero.species==='rabbit'?.24:.16,earFold:hook&&spec.move==='roll'?.58*Math.sin(Math.PI*phase)**2:0,guardElbowBack:.5,keepFaceClear:true,guardCover:manual?1:0,guardHeight:manual?1.72:undefined,guardStyle:spec.guardStyle,brace:spec.brace,defenceSide:spec.defenceSide,stepDirection:spec.stepDirection,stepAdvance:spec.stepAdvance,planUppercut:spec.move.includes('uppercut'),uppercutBagTarget:spec.move.includes('uppercut')?[target.x,target.y-.18,target.z-.02]:undefined,knuckleTarget:target.toArray(),strikeHeight:target.y,planStraight:true,...this.boxerDrive(spec.move),poseOverlay:this.finalizeBoxer});this.arena.group.updateMatrixWorld(true);
   const dt=this.last<0?0:t-this.last;
   if(spec.attack){
    if(spec.phase>.2&&this.once('swing'+spec.index))frame.swings.push({actor:'lion',move:spec.move});
    const fist=hero.root.localToWorld(V(...hero.metrics.gloves[targetIndex].strikePoint)),incoming=this.contactWithMitt(pad,fist,this.previousFist[targetIndex],worldTarget,this.previousPadFace[targetIndex],dt),speed=this.padClosingSpeed;
    if(!hook&&spec.phase>.25&&spec.phase<.80&&incoming&&this.once('hit'+spec.index)){
     frame.contacts.push({actor:'lion',receiver:'pads',part:'glove',kind:'pad',move:spec.move,blocked:false,closingSpeed:speed,impulse:speed*(rear(spec.move)?7.2:5.8),point:pad.localToWorld(this.padWorldContact.copy(this.padContactLocal)).toArray(),normal:this.padNormal.toArray(),relativeVelocity:this.padVelocity.toArray(),localPoint:this.padContactLocal.toArray(),hand:targetIndex?'R':'L',actionId:'pads:'+this.sessionId+':'+spec.index,attacker:'hero',defender:'trainer',targetRegion:'mitt',outcome:'clean',sampleTime:time,time:time-dt*(1-this.padContactFraction),contactFraction:this.padContactFraction});pad.userData.hitAt=t;pad.userData.hitForce=Math.max(.6,Math.min(1.3,speed/3));pad.userData.popDepth=popDepth[spec.move]||.08;this.gloveHit={index:targetIndex,t,force:pad.userData.hitForce};
    }this.previousFist[targetIndex]=fist;this.previousPadFace[targetIndex]=worldTarget;
   }
   // Impact accent on the striker: the glove padding squashes on the mitt and springs back (~60 ms).
   const g=this.gloveHit;if(g){const age=t-g.t,squash=age>=0&&age<.4?Math.min(1,.85*g.force)*(1-Math.exp(-age/.006))*Math.exp(-age/.06):0;hero.deformGlove(g.index?'R':'L',squash);if(!(age>=0&&age<.4))this.gloveHit=null;}
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
 TrainingArena.prototype.fitCamera=function(camera){if(!this.careerDrill)return fit.call(this,camera);const rope=this.mode==='rope',height=rope?(this.engine.coach.species==='rabbit'?3.12:2.86):2.55,frame=rope?height:2.95,width=rope?1.8:2.80,fov=THREE.MathUtils.degToRad(camera.fov);camera.position.set(0,1.70,Math.max(frame/(2*Math.tan(fov/2)),width/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))+.35);camera.lookAt(0,height*.48,0);this.engine.viewControls?.refit(V(0,height*.48,0));};
 CareerDrill.ropeDrills=ropeDrills;CareerDrill.ropeAliases=ropeAliases;CareerDrill.ropeCues=ropeCues;CareerDrill.padRange=padRange;window.CareerDrill=CareerDrill;
})();
