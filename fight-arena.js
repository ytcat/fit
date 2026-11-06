/* Fight-only scene/controller. Practice choreography remains independent. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const other=a=>a==='lion'?'rabbit':'lion',rear=move=>['cross','rear_hook','rear_uppercut'].includes(move);
 class FightArena {
  recoveryState(actor){
   const m=this.match,f=m.fighters[actor];this.downStarts=this.downStarts||{};
   if(!f.down){delete this.downStarts[actor];return {tilt:0,down:0,sit:0,kneel:0,stand:0,shake:0};}
   if(this.downStarts[actor]==null)this.downStarts[actor]=m.time-m.phaseTime;
   const t=Math.max(0,m.time-this.downStarts[actor]),smooth=(a,b)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v);};
   const fall=smooth(0,.65),sit=m.result?0:smooth(1.05,1.80),kneel=m.result?0:smooth(1.80,2.55),stand=m.result?0:smooth(2.55,3.60);
   const shock=m.result?0:clamp((t-3.60)/.85),shake=Math.sin(shock*Math.PI*4)*Math.sin(shock*Math.PI)*.075;
   return {tilt:-1.43*fall*(1-.48*sit)*(1-.85*kneel)*(1-stand),down:fall*(1+.25*kneel)*(1-stand),sit,kneel,stand,shake};
  }
  downPose(coach,state){
   const j=coach.joints,weight=state.down;
   if(weight>.001){
    for(const [side,s] of [['L',-1],['R',1]]){
     const foot=j['foot'+side],current=coach.point(foot),lying=V(s*.19,.105,side==='L'?.04:-.015),kneeling=V(s*.20,.105,side==='L'?.32:-.20);
     const target=lying.lerp(kneeling,state.kneel).lerp(current,state.stand);
     current.lerp(target,clamp(weight*1.4));
     coach.solve(j['thigh'+side],j['knee'+side],foot,current,V(s*.10,.05,1));
     const footQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.12*weight,0,0));coach.orient(foot,footQ);
     const shin=coach.point(j['knee'+side]).sub(coach.point(foot)).normalize().applyQuaternion(footQ.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
    }
   }
   const brace=state.sit*(1-state.stand);
   if(brace>.001){
    const shoulder=coach.point(j.armR),target=coach.point(j.handR).lerp(V(.29,.55,.20),brace),reach=j.elbowR.position.length()+j.handR.position.length()-.002;
    target.copy(shoulder.clone().add(target.clone().sub(shoulder).clampLength(.05,reach)));
    coach.solve(j.armR,j.elbowR,j.handR,target,V(.4,-.6,.2));
    coach.metrics.gloves[1]=coach.orientGlove('R',0,V(0,-1,0));coach.metrics.hands[1]=coach.point(j.handR).toArray();
   }
   j.head.rotation.y+=state.shake;j.chest.rotation.z+=state.shake*.12;coach.syncSkin();
   // World-space support follows the articulated limbs, not a fixed root lift.
   // Ellipsoid supports cover body volume; boot/glove boxes cover their mesh.
   let low=Infinity;
   const ell=(bone,centre,r)=>{const p=bone.localToWorld(V(...centre)),a=bone.matrixWorld.elements;low=Math.min(low,p.y-Math.hypot(a[1]*r[0],a[5]*r[1],a[9]*r[2]));};
   ell(j.hips,[0,.06,0],[.25,.23,.19]);ell(j.spine,[0,.10,0],[.25,.23,.19]);ell(j.chest,[0,.13,-.018],[.34,.27,.22]);ell(j.head,[0,.13,.03],[.19,.22,.20]);
   for(const side of ['L','R']){
    ell(j['thigh'+side],[0,-.20,.01],[.14,.24,.15]);ell(j['knee'+side],[0,-.18,-.01],[.10,.22,.11]);
    const sign=side==='L'?-1:1;ell(j['arm'+side],[sign*.17,0,0],[.20,.13,.13]);ell(j['elbow'+side],[sign*.15,0,0],[.18,.075,.08]);
    for(const root of [j['foot'+side],coach.gloveMeshes[side]])root.traverse(part=>{if(!part.isMesh)return;const g=part.geometry;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])low=Math.min(low,V(x,y,z).applyMatrix4(part.matrixWorld).y);});
   }
   if(low<.004){coach.root.position.y+=.004-low;coach.syncSkin();}
  }
  constructor(arena,options){
   this.arena=arena;this.engine=arena.engine;this.match=new BoxingFight(options);this.tick=0;this.previous={};this.compressions={lion:{L:0,R:0},rabbit:{L:0,R:0}};this.contacts=[];this.eventCursor=0;this.pendingSwings=[];this.travelTime=0;this.travelLast=null;
   this.coaches=this.engine.coach.species==='rabbit'?{lion:arena.rabbit,rabbit:this.engine.coach}:{lion:this.engine.coach,rabbit:arena.rabbit};
   if(this.engine.player?.enabled)this.match.setPlayer(this.engine.player.actor());
   this.referee=new RhinoReferee();arena.group.add(this.referee.root);this.audience=new FightAudience(arena.group);
   this.ring=new THREE.Group();arena.group.add(this.ring);
   // Raised canvas and apron make the ring a complete visible platform.
   const canvas=new THREE.Mesh(new THREE.BoxGeometry(3.48,.16,3.48),new THREE.MeshStandardMaterial({color:0x263449,roughness:.92,side:THREE.DoubleSide}));
   canvas.position.y=-.08;canvas.receiveShadow=true;this.ring.add(canvas);
   const apron=new THREE.Mesh(new THREE.BoxGeometry(3.65,.14,3.65),new THREE.MeshStandardMaterial({color:0x141c2a,roughness:.8,side:THREE.DoubleSide}));
   apron.position.y=-.24;apron.receiveShadow=true;this.ring.add(apron);
   for(const s of [-1,1])for(const z of [-1.65,1.65]){
    arena.rod(this.ring,V(s*1.65,.02,z),V(s*1.65,1.30,z),.035).userData.ringPost=true;
    const pad=arena.mesh(this.ring,new THREE.SphereGeometry(1,20,12),arena.leather,V(s*1.65,1.05,z));pad.scale.set(.065,.23,.065);pad.userData.ringPost=true;
   }
   for(const y of [.36,.65,.94,1.23]){
    // All four complete sides, at identical heights, with shared corner posts.
    for(const z of [-1.65,1.65])arena.rod(this.ring,V(-1.65,y,z),V(1.65,y,z),.012,arena.accent);
    for(const x of [-1.65,1.65])arena.rod(this.ring,V(x,y,-1.65),V(x,y,1.65),.012,arena.accent);
   }
   for(const x of [-1.65,1.65])for(const z of [-1.65,1.65]){
    const corner=new THREE.MeshStandardMaterial({color:z<0?0x973d38:0x315d91,roughness:.55});
    for(const y of [.36,.65,.94,1.23]){
     const pad=arena.mesh(this.ring,new THREE.BoxGeometry(.13,.10,.13),corner,V(x,y,z));
     pad.rotation.y=Math.PI/4;
    }
   }
   window.GymDetails?.ring(this.ring);arena.group.rotation.y=.90;this.pose();
  }
  dispose(){
   const materials=new Set();for(const root of [this.referee.root,this.audience.root,this.ring]){
    root.traverse(node=>{if(!node.isMesh)return;node.geometry.dispose();for(const material of (Array.isArray(node.material)?node.material:[node.material])){if(root!==this.ring||![this.arena.dark,this.arena.leather,this.arena.accent].includes(material))materials.add(material);}});
    root.parent?.remove(root);
   }const textures=new Set();for(const material of materials){for(const key of ['map','bumpMap','normalMap','roughnessMap'])if(material[key])textures.add(material[key]);material.dispose();}for(const texture of textures)texture.dispose();
  }
  reaction(actor){
   const r=this.match.fighters[actor].reaction;if(!r)return null;const age=this.match.time-r.time;
   return {...r,amount:clamp(r.severity*2.1*(1-Math.exp(-age/.012))*Math.exp(-age/.34),0,1.25)};
  }
  target(actor,spec){
   const receiver=this.coaches[other(actor)],coach=this.coaches[actor],action=this.match.fighters[actor].action;
   if(action.aim)return V(...action.aim);
   const side=rear(spec.move)?1:-1;
   const point=spec.target==='body'?V(side*.055,1.37,.155):spec.target==='shoulder'?V(side*.29,1.59,.08):V(spec.move.includes('hook')?side*.085:side*.012,1.90,.19);
   const world=receiver.root.localToWorld(point),local=coach.root.worldToLocal(world.clone());
   // Commit to the target's arena position; a late slip can actually miss.
   if(spec.phase>=.18){action.aim=this.arena.group.worldToLocal(world.clone()).toArray();action.aimInArena=true;}
   return local;
  }
  ringTravel(){
   const m=this.match,dt=this.travelLast==null?0:clamp(m.time-this.travelLast,0,.05);this.travelLast=m.time;
   // Translate between exchanges, never drag a planted punch through its target.
   const mobile=m.phase==='round'&&!Object.values(m.fighters).some(f=>f.down||f.action?.attack);
   if(mobile)this.travelTime+=dt;
   this.gaitWeight=(this.gaitWeight||0)+((mobile?1:0)-(this.gaitWeight||0))*(1-Math.exp(-dt/.06));
   const t=this.travelTime,beat=Math.floor(t/.72),phase=(t/.72)%1;
   const anchor=n=>V(.58*Math.sin(n*.27),0,.42*Math.sin(n*.39));
   const from=anchor(beat),to=anchor(beat+1),ease=phase*phase*(3-2*phase);
   const centre=from.clone().lerp(to,ease),delta=to.clone().sub(from);
   // Circle through both sides of the ring, with measured changes in range.
   const angle=.65*Math.sin(t*.35),range=1.16+.06*Math.sin(t*.55);
   return {centre,delta,phase,ease,angle,range,mobile,weight:this.gaitWeight};
  }
  pose(){
   const m=this.match,a=this.arena,ceremony=m.phase==='scoring'||m.phase==='ceremony',reveal=m.phase==='ceremony',raise=reveal?clamp((m.phaseTime-.4)/1.5):0;
   if(ceremony&&!this.lineupStart)this.lineupStart=Object.fromEntries(['lion','rabbit'].map(actor=>[actor,{position:this.coaches[actor].root.position.clone(),yaw:this.coaches[actor].root.rotation.y}]));
   const travel=this.ringTravel();
   const lineup=ceremony?clamp((reveal?10:m.phaseTime)/2):0,ease=lineup*lineup*(3-2*lineup);
   if(ceremony&&!this.userView&&this.lineupEase!==1)a.group.rotation.y=.90*(1-ease);this.lineupEase=ease;
   for(const [actor,index] of [['lion',0],['rabbit',1]]){
    const coach=this.coaches[actor],f=m.fighters[actor];
    if(ceremony){coach.root.position.copy(this.lineupStart[actor].position).lerp(V(index?.72:-.72,0,.05),ease);coach.root.rotation.y=this.lineupStart[actor].yaw*(1-ease);}
    else {const direction=index?-1:1,corner=m.phase==='rest'?.34*clamp(m.phaseTime/1.4):0;const reaction=this.reaction(actor),push=reaction?.move?.includes('uppercut')?Math.min(.06,(reaction.amount||0)*.04):Math.min(.045,(reaction?.amount||0)*.032);
     const axis=V(Math.sin(travel.angle),0,Math.cos(travel.angle));coach.root.position.copy(travel.centre).addScaledVector(axis,direction*(-travel.range/2-corner-push));coach.root.rotation.y=travel.angle+(index?Math.PI:0);}
   }
   for(const actor of ['lion','rabbit']){
    const coach=this.coaches[actor],state=this.recoveryState(actor),yaw=coach.root.rotation.y;
    coach.root.quaternion.setFromEuler(new THREE.Euler(state.tilt,yaw,0,'YXZ'));coach.root.position.y=0;
   }
   a.group.updateMatrixWorld(true);
   // Establish boxing range before committing wrist/impact targets. Moving
   // roots only after IK moved a latched contact point twice on the next frame.
   if(m.phase==='round')this.separateTorso(false);
   const specs={lion:m.spec('lion'),rabbit:m.spec('rabbit')},metrics={};
   for(const actor of ['lion','rabbit']){
    const coach=this.coaches[actor],spec=specs[actor],f=m.fighters[actor],state=this.recoveryState(actor),options={guardElbowBack:.55,guardWidth:.24,keepFaceClear:true,simulationTime:m.time,defenceSide:spec.defenceSide,stepDirection:spec.stepDirection,brace:spec.brace,hitReaction:this.reaction(actor),damage:f.damage,stamina:f.stamina,down:state.down,duckDepth:.28};
    if(m.phase==='round'&&travel.weight>.001&&!ceremony){const yaw=coach.root.rotation.y;options.ringStep={phase:travel.phase,ease:travel.ease,weight:travel.weight,delta:travel.delta.clone().applyAxisAngle(V(0,1,0),-yaw).toArray()};}
    if(spec.attack){
     options.planStraight=true;options.strikeDirection=[0,0,1];
     let target=this.target(actor,spec);if(f.action.aimInArena)target=coach.root.worldToLocal(a.group.localToWorld(V(...f.action.aim)));
     const through=target.clone().sub(V(0,target.y,0)).normalize().multiplyScalar(.035);
     options.knuckleTarget=target.add(through).toArray();options.strikeHeight=target.y-.035;
     options.advance=spec.move.includes('uppercut')?.08:spec.move.includes('hook')?.065:.025;
     options.power=1.32;options.contactDrive=.075;options.levelChange=spec.target==='body'?.065:.015;
     if(spec.move.includes('uppercut')){
      options.upperLoadHeight=spec.target==='body'?1.02:1.28;
      // The wrist chamber stays on the striker's side of the torso. Drive the
      // knuckle crown up under the target instead of sweeping through ribs.
      options.uppercutBagTarget=[target.x,target.y-.19,target.z-.08];
     }
     if(f.action?.returnHand){
      const returned=f.action.returnHand,t=clamp((m.time-f.action.contactTime-.025)/.21),blend=t*t*(3-2*t);
      options.contactReturn={...returned,point:coach.root.worldToLocal(a.group.localToWorld(V(...returned.point))).toArray(),blend,guide:returned};
      options.advance*=1-blend;options.contactDrive*=1-blend;
     }
    }
    if(ceremony){options.presentation={mode:!reveal?'waiting':!m.result.winner?'winner':m.result.winner===actor?'winner':'loser',side:actor==='lion'?'R':'L',raise:!m.result.winner||m.result.winner===actor?raise:0};}
    const time=ceremony||(!spec.attack&&!spec.defend)?m.time:spec.phase*1.22;
    metrics[actor]=coach.update(time,ceremony?(ease<1?'step':'guard'):spec.move,'one_two',options);
    if(f.down)this.downPose(coach,state);
   }
   if(m.phase==='round'){this.stabilizeBends();this.clearOwnFaces();}
   a.group.updateMatrixWorld(true);
   if(m.phase==='round')this.separateTorso();
   this.referee.root.position.set(ceremony?1.13*(1-ease):1.13,0,ceremony?-.83+.71*ease:-.83);this.referee.root.rotation.y=ceremony?-.55*(1-ease):-.55;
   a.group.updateMatrixWorld(true);
   let grip=null,side=1;
   if(reveal&&m.result.winner){const winner=m.result.winner,coach=this.coaches[winner],hand=coach.joints[winner==='lion'?'handR':'handL'];grip=hand.getWorldPosition(V());side=winner==='lion'?-1:1;}
   if(reveal&&!m.result.winner)grip={'-1':this.coaches.lion.joints.handR.getWorldPosition(V()),'1':this.coaches.rabbit.joints.handL.getWorldPosition(V())};
   if(m.phase==='count'){grip=this.referee.root.localToWorld(V(.32,1.76,.27));side=1;}
   const leftReaction=this.reaction('lion')?.amount||0,rightReaction=this.reaction('rabbit')?.amount||0;
   this.referee.update(m.time,grip,side,{lookAt:ceremony?null:this.coaches[leftReaction>rightReaction?'lion':'rabbit'].joints.head.getWorldPosition(V()),alert:Math.max(leftReaction,rightReaction)});this.audience.update(m.time,reveal);
   // Crowd occlusion is determined in WORLD space, not by fixed side IDs.
   // Hide every spectator in the camera-facing half of the arena, including
   // diagonal near-side seats, so no crowd meshes cover the fighters.
   a.group.updateMatrixWorld(true);
   const ringCentre=this.ring.getWorldPosition(V());
   const cameraVector=this.engine.camera.getWorldPosition(V()).sub(ringCentre);
   cameraVector.y=0;cameraVector.normalize();
   for(const spectator of this.audience.root.children){
    if(spectator.userData.audienceSide===undefined)continue;
    const offset=spectator.getWorldPosition(V()).sub(ringCentre);offset.y=0;
    spectator.visible=offset.dot(cameraVector)<-.15;
   }
   // Ring posts and ropes are physical geometry: keep all four sides visible
   // regardless of camera rotation. Camera-facing culling hid entire sides.
   for(const part of this.ring.children)part.visible=true;
   this.metrics=metrics;this.specs=specs;
   return metrics;
  }
  separateTorso(sync=true){
   const a=this.coaches.lion,b=this.coaches.rabbit;
   const ca=a.joints.chest.getWorldPosition(V()),cb=b.joints.chest.getWorldPosition(V()),axis=cb.clone().sub(ca);axis.y=0;
   const distance=axis.length();if(distance>=1.02)return;
   if(distance>.001)axis.divideScalar(distance);else axis.copy(b.root.getWorldPosition(V()).sub(a.root.getWorldPosition(V()))).setY(0).normalize();
   const amount=(1.02-distance)*.5;
   for(const [coach,sign] of [[a,-1],[b,1]]){
    const world=coach.root.getWorldPosition(V()).addScaledVector(axis,amount*sign);coach.root.position.copy(coach.root.parent.worldToLocal(world));if(sync)coach.syncSkin();else coach.root.updateMatrixWorld(true);
   }
  }
  collision(point,receiver,options={}){
   const a=this.arena,c=this.coaches[receiver],candidates=[];
   if(!options.bodyOnly)for(const side of ['L','R'])candidates.push({...a.closest(point,c.joints['hand'+side],{centre:[0,-.137,0],radius:[.091,.067,.068]}),part:'glove',side});
   const guard=candidates.filter(h=>h.penetration>0).sort((x,y)=>x.distance-y.distance)[0];if(guard)return guard;
   candidates.length=0;
   if(!options.bodyOnly)for(const side of ['L','R'])for(const [from,to,radius] of [['arm','elbow',.092],['elbow','hand',.063]]){
    const start=c.joints[from+side].getWorldPosition(V()),end=c.joints[to+side].getWorldPosition(V()),axis=end.clone().sub(start),t=clamp(point.clone().sub(start).dot(axis)/axis.lengthSq());
    const centre=start.addScaledVector(axis,t),delta=point.clone().sub(centre),length=delta.length(),normal=length>1e-8?delta.divideScalar(length):V(0,0,1),distance=length-radius;
    candidates.push({point:centre.addScaledVector(normal,radius),normal,distance,penetration:.064-distance,part:'arm',side});
   }
   const radius=options.radius??.064;
   candidates.push(...a.bodyContacts(point,c,radius).map(hit=>({...hit,part:hit.kind})));
   return candidates.sort((x,y)=>x.distance-y.distance)[0];
  }
  solidContact(point,receiver,actor,radius=.064){
   let hit=this.arena.solidContact(point,this.coaches[receiver],this.coaches[actor],radius);
   // Solve both contact constraints together. An opponent correction must not
   // push the same glove or forearm into its owner's skull on the next pass.
   const head=this.coaches[actor].joints.head;
   for(const shape of [{centre:[0,.13,.03],radius:[.17,.20,.17]},{centre:[0,.065,.195],radius:[.135,.105,.125]}]){
    const own=this.arena.closest(point,head,shape,radius+.040);if(own.penetration>hit.penetration)hit=own;
   }
   return hit;
  }
  clearOwnFaces(){
   for(const coach of Object.values(this.coaches)){
    for(const side of ['L','R']){
     const i=side==='L'?0:1,reference=coach.armBendReference(side),glove=coach.metrics.gloves[i];
     const safe=coach.clearOwnFace(side,glove,V(...glove.palmTarget),reference.bend,{...reference,lateral:true});
     coach.metrics.gloves[i]=safe.glove;coach.metrics.hands[i]=coach.point(coach.joints['hand'+side]).toArray();coach.metrics.handErrors[i]=safe.error;
    }
    coach.syncSkin();
   }
  }
  stabilizeBends(){
   this.bendFrames=this.bendFrames||{};
   for(const actor of ['lion','rabbit'])for(const side of ['L','R']){
    const coach=this.coaches[actor],key=actor+side,old=this.bendFrames[key],now=coach.armBendReference(side),dt=this.match.time-(old?.time??-1);
    if(old&&dt>0&&dt<.1){
     const previous=coach.contactBendPole(side,coach.point(coach.joints['hand'+side]),old);
     const angle=Math.atan2(now.axis.dot(previous.clone().cross(now.bend)),previous.dot(now.bend));
     const pole=previous.applyAxisAngle(now.axis,clamp(angle,-dt*12,dt*12));
     coach.solve(coach.joints['arm'+side],coach.joints['elbow'+side],coach.joints['hand'+side],coach.point(coach.joints['hand'+side]),pole);
     const i=side==='R'?1:0,glove=coach.metrics.gloves[i];coach.metrics.gloves[i]=coach.orientGlove(side,glove.turn,V(...glove.palmTarget));
    }
   }
   for(const coach of Object.values(this.coaches))coach.syncSkin();
  }
  resolveTrades(){
   // Body constraints are independent of the other fighter's moving guard.
   // Repeat the coupled solve, then finish on the solid torso/head constraint.
   const poles={};for(const actor of ['lion','rabbit'])for(const side of ['L','R'])poles[actor+side]=this.coaches[actor].armBendReference(side);
   for(let pass=0;pass<3;pass++){
    for(const actor of ['lion','rabbit'])for(const side of ['L','R'])this.coaches[actor].constrainGlove(side,p=>this.collision(p,other(actor)),.014,poles[actor+side]);
    for(const actor of ['lion','rabbit'])for(const side of ['L','R'])this.coaches[actor].constrainArm(side,(p,r)=>this.solidContact(p,other(actor),actor,r),.012,poles[actor+side]);
   }
   // Contact correction can change the reach axis again. Retain continuity
   // after the coupled solve, then recheck the surfaces with that elbow plane.
   this.stabilizeBends();
   for(const actor of ['lion','rabbit'])for(const side of ['L','R']){
    const coach=this.coaches[actor],pole=coach.armBendReference(side);
    coach.constrainGlove(side,p=>this.collision(p,other(actor)),.014,pole);
    coach.constrainArm(side,(p,r)=>this.solidContact(p,other(actor),actor,r),.012,pole);
   }
   this.clearOwnFaces();
   for(const actor of ['lion','rabbit'])for(const side of ['L','R'])this.bendFrames[actor+side]={...this.coaches[actor].armBendReference(side),time:this.match.time};
  }
  step(){
   const dt=1/60,m=this.match;m.advance(dt);this.pose();this.contacts=[];
   const goals={lion:{L:0,R:0},rabbit:{L:0,R:0}};
   // Capture both fists before resolving either actor so simultaneous trades are fair.
   const samples=[];for(const actor of ['lion','rabbit']){
    const action=m.fighters[actor].action,spec=this.specs[actor];
    if(action?.attack&&!action.swingPlayed&&spec.phase>=.22&&spec.phase<.65){action.swingPlayed=true;this.pendingSwings.push({actor,move:spec.move});}
   }
   for(const actor of ['lion','rabbit']){const action=m.fighters[actor].action;if(action?.attack&&this.specs[actor].phase>.22&&this.specs[actor].phase<.65&&this.specs[other(actor)].defend)action.facedDefence=true;}
   for(const actor of ['lion','rabbit'])for(const [index,side] of ['L','R'].entries()){
    const coach=this.coaches[actor],spec=this.specs[actor],key=actor+side,world=coach.root.localToWorld(V(...this.metrics[actor].gloves[index].knuckles));
    const current=this.arena.group.worldToLocal(world.clone()),previous=this.previous[key]||current,velocity=current.clone().sub(previous).divideScalar(dt);
    if(spec.attack&&side===(rear(spec.move)?'R':'L')&&spec.phase>.18&&spec.phase<.78&&!m.fighters[actor].action?.recorded){
     const count=Math.max(1,Math.ceil(previous.distanceTo(current)/.018));let contact=null;
     for(let i=1;i<=count;i++){const hit=this.collision(this.arena.group.localToWorld(previous.clone().lerp(current,i/count)),other(actor));if(hit.penetration>0){contact=hit;break;}}
     if(contact){const normal=contact.normal.clone().applyQuaternion(this.arena.group.getWorldQuaternion(new THREE.Quaternion()).invert()),speed=Math.max(0,-velocity.dot(normal),spec.move.includes('uppercut')?Math.max(0,velocity.y)*.70:0);const direction=velocity.clone().applyQuaternion(this.arena.group.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(this.coaches[other(actor)].root.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize().toArray();samples.push({normal:contact.normal.toArray(),direction,actor,action:spec.id,part:contact.part,speed,point:contact.point.toArray(),side:contact.side==='L'?-1:contact.side==='R'?1:(this.coaches[other(actor)].root.worldToLocal(contact.point.clone()).x<0?-1:1),hand:side,receiver:other(actor)});}
    }
    this.previous[key]=current;
    if(spec.attack&&spec.phase>.15&&spec.phase<.7&&m.phase==='round'){m.roundStats[actor].control+=dt;m.totals[actor].control+=dt;}
   }
   for(const sample of samples){
    const receiver=this.coaches[sample.receiver],bone=receiver.joints[sample.part==='head'?'head':'chest'];
    const bind=receiver.skeleton.boneInverses[receiver.bones.indexOf(bone)].clone().invert();
    sample.surfacePoint=bone.worldToLocal(V(...sample.point)).applyMatrix4(bind).toArray();
    sample.surfaceNormal=V(...sample.normal).applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(bind)).toArray();
    const event=m.contact(sample);if(event){
     this.contacts.push({...event,kind:sample.part,impulse:event.severity,closingSpeed:sample.speed});goals[sample.actor][sample.hand]=clamp(.3+event.severity*.45);if(sample.part==='glove')goals[sample.receiver][sample.side<0?'L':'R']=.5;}}
   // Always constrain the rendered glove, including follow-through/recovery
   // after an action has already scored. Previously a.recorded skipped the
   // only collision path and let the animation continue through the opponent.
   this.resolveTrades();
   for(const event of this.contacts){
    const action=m.fighters[event.actor].action;if(!action||action.returnHand)continue;
    const coach=this.coaches[event.actor],side=rear(action.move)?'R':'L',reference=coach.armBendReference(side),glove=coach.metrics.gloves[side==='R'?1:0];
    action.returnHand={side,point:this.arena.group.worldToLocal(coach.joints['hand'+side].getWorldPosition(V())).toArray(),axis:reference.axis.toArray(),bend:reference.bend.toArray(),palm:glove.palmTarget||[0,-1,0],turn:glove.turn};
   }
   for(const actor of ['lion','rabbit'])for(const [i,side] of ['L','R'].entries())this.previous[actor+side]=this.arena.group.worldToLocal(this.coaches[actor].root.localToWorld(V(...this.coaches[actor].metrics.gloves[i].knuckles)));
   for(const actor of ['lion','rabbit'])for(const side of ['L','R']){const old=this.compressions[actor][side],goal=goals[actor][side],value=goal>old?goal:old*Math.exp(-dt/ .08);this.compressions[actor][side]=value;this.coaches[actor].deformGlove(side,value);}
   return this.contacts;
  }
  update(time){
   const target=Math.max(0,Math.floor((time+1e-8)*60)),contacts=[];
   if(target<this.tick)return this.arena.metrics;
   while(this.tick<target){contacts.push(...this.step());this.tick++;}
   const m=this.match,snapshot=m.snapshot();
   this.arena.metrics={mode:'fight',fight:snapshot,hero:this.metrics.lion,partner:this.metrics.rabbit,contacts,swings:this.pendingSwings.splice(0),loads:[]};
   for(const event of m.events.filter(e=>e.id>this.eventCursor)){
    if(event.type==='bell'||event.type==='final-bell')this.engine.onFightEvent?.(event);
    if(event.type==='announcement')this.engine.onFightEvent?.(event);
    this.eventCursor=event.id;
   }
   window.fightUI?.render(this);
   return this.arena.metrics;
  }
 }
 const setTarget=TrainingArena.prototype.setTarget,update=TrainingArena.prototype.update,fit=TrainingArena.prototype.fitCamera;
 TrainingArena.prototype.setTarget=function(mode){
  this.fightView?.dispose();
  if(mode!=='fight'){this.fightView=null;return setTarget.call(this,mode);}
  this.engine.technique='guard';setTarget.call(this,'rabbit');this.mode='fight';this.engine.targetMode='fight';this.engine.technique='fight';this.engine.animTime=0;this.engine.speed=1;this.engine.isPlaying=true;
  this.fightView=new FightArena(this,this.engine.fightOptions||{seed:Date.now()>>>0});this.fitCamera(this.engine.camera);this.fightView.update(0);
 };
 TrainingArena.prototype.update=function(time,technique,combo){return this.mode==='fight'&&this.fightView?this.fightView.update(time):update.call(this,time,technique,combo);};
 TrainingArena.prototype.fitCamera=function(camera){
  if(this.mode!=='fight')return fit.call(this,camera);const fov=THREE.MathUtils.degToRad(camera.fov),distance=Math.max(3.15/(2*Math.tan(fov/2)),3.15/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))+.55;
  camera.position.set(0,1.82,distance);camera.lookAt(0,1.30,0);this.engine.viewControls?.refit(V(0,1.30,0));
 };
 window.FightArena=FightArena;
})();
