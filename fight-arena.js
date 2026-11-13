/* Fight-only scene/controller. Practice choreography remains independent. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const travelPlanes=[[1,0,1.2],[-1,0,1.2],[0,1,1.2],[0,-1,1.2],[1,-1,.88]];
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
   options={...options,...arena.engine.career?.fightOptions()};
   this.arena=arena;this.engine=arena.engine;this.match=new BoxingFight(options);this.tick=0;this.previous={};this.compressions={lion:{L:0,R:0},rabbit:{L:0,R:0}};this.contacts=[];this.eventCursor=0;this.pendingSwings=[];this.travelTime=0;this.travelLast=null;this.reach={lion:{shift:0,model:{}},rabbit:{shift:0,model:{}}};
   this.careerEntry=options.careerEntry;
   this.coaches=this.engine.coach.species==='rabbit'?{lion:arena.rabbit,rabbit:this.engine.coach}:{lion:this.engine.coach,rabbit:arena.rabbit};
   if(this.engine.player?.enabled)this.match.setPlayer(this.engine.player.actor());
   // GOTR-0074: the whole in-ring cast (both fighters and the referee) lives in one frame mirrored left-to-right.
   // Inside it the bout is exactly the choreography the game was built and tuned on; seen from the arena every
   // fighter is orthodox (left side forward). Outside the bout a fighter carries the same mirror on its own root.
   this.cast=new THREE.Group();this.cast.name='Ring cast (mirrored)';this.cast.scale.x=-1;arena.group.add(this.cast);
   for(const coach of Object.values(this.coaches)){coach.root.scale.x=1;this.cast.add(coach.root);}
   this.referee=new RhinoReferee();this.cast.add(this.referee.root);this.audience=new FightAudience(arena.group);
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
   for(const coach of Object.values(this.coaches||{})){coach.root.scale.x=-1;if(coach.root.parent===this.cast)this.arena.group.add(coach.root);}this.cast?.parent?.remove(this.cast);
   const materials=new Set();for(const root of [this.referee.root,this.audience.root,this.ring]){
    root.traverse(node=>{if(!node.isMesh)return;node.geometry.dispose();for(const material of (Array.isArray(node.material)?node.material:[node.material])){if(root!==this.ring||![this.arena.dark,this.arena.leather,this.arena.accent].includes(material))materials.add(material);}});
    root.parent?.remove(root);
   }const textures=new Set();for(const material of materials){for(const key of ['map','bumpMap','normalMap','roughnessMap'])if(material[key])textures.add(material[key]);material.dispose();}for(const texture of textures)texture.dispose();
  }
  reaction(actor){
   const r=this.match.fighters[actor].reaction;if(!r)return null;const age=this.match.time-r.time;
   // GOTR-0024: a snap, not a held pose. Peaks ~45 ms after contact in
   // proportion to the blow (the old curve saturated every clean hit and
   // held it ~0.4 s), then recovers; a blocked blow jolts the guard.
   const scale=r.part==='guard'?clamp((r.move==='jab'?.45:.6)+r.severity*2.5,0,.95):clamp(r.severity*1.05,0,1.2);
   return {...r,amount:scale*(1-Math.exp(-age/.016))*Math.exp(-age/.21)/.76};
  }
  travelCapacity(point,direction){
   let limit=Infinity;
   for(const [x,z,bound] of travelPlanes){
    const outward=x*direction.x+z*direction.z;
    if(outward>1e-9)limit=Math.min(limit,Math.max(0,(bound-x*point.x-z*point.z)/outward));
   }
   return limit;
  }
  impactOffset(actor){return this.impactOffsets?.[actor]?.clone()||V();}
  impactIntent(actor){
   const r=this.match.fighters[actor].reaction;if(!r?.pushDirection)return V();
   const age=Math.max(0,this.match.time-r.time),amount=Math.min(.11,r.severity*.09)*(1-Math.exp(-age/.020))*Math.exp(-age/.32);
   return V(...r.pushDirection).multiplyScalar(amount);
  }
  target(actor,spec){
   const receiver=this.coaches[other(actor)],coach=this.coaches[actor],action=this.match.fighters[actor].action;
   if(action.aim)return V(...action.aim);
   const side=rear(spec.move)?1:-1;
   const point=spec.target==='body'?V(side*.055,1.37,.155):spec.target==='shoulder'?V(side*.29,1.59,.08):spec.move.includes('hook')?V(side*.085,1.90,.19):spec.move.includes('uppercut')?V(side*.012,1.90,.19):V(side*.012,1.94,.30);
   const accuracy=this.match.fighters[actor].accuracy;if(accuracy!=null){const spread=.085*(1-accuracy);point.x+=Math.sin(action.id*12.9898+this.match.seed)*spread;point.y+=Math.cos(action.id*7.233+this.match.seed)*spread;}
   const world=receiver.root.localToWorld(point),local=coach.root.worldToLocal(world.clone());
   // Commit to the target's arena position; a late slip can actually miss.
   if(spec.phase>=.18){action.aim=this.cast.worldToLocal(world.clone()).toArray();action.aimInArena=true;if(spec.move==='jab'||spec.move==='cross')action.aimRoot=receiver.root.position.toArray();}
   return local;
  }
  ringTravel(){
   const m=this.match,dt=this.travelLast==null?0:clamp(m.time-this.travelLast,0,.05);this.travelLast=m.time;
   if(!this.walkers)this.walkers={lion:{time:0,stride:.72},rabbit:{time:0,stride:.86}};
   const paths={};
   for(const [actor,index] of [['lion',0],['rabbit',1]]){
    const w=this.walkers[actor],f=m.fighters[actor],mobile=m.phase==='round'&&!f.down&&!f.action?.attack,half=w.stride/2;
    if(mobile){w.stop=null;w.time+=dt;}
    else{
     if(w.stop==null){w.start=w.time;w.age=0;w.stop=Math.max(w.time,Math.ceil((w.time-1e-8)/half)*half);}
     const duration=w.stop-w.start;w.age+=dt;const q=duration>1e-8?Math.min(1,w.age/duration):1;
     w.time=q===1?w.stop:w.start+duration*(q+q*q-q*q*q);
    }
    const beat=Math.floor(w.time/w.stride),phase=(w.time/w.stride)%1,ease=phase*phase*(3-2*phase),sign=index?1:-1;
    const anchor=n=>{
     // Independent bounded waypoints: neither fighter is translated by the
     // opponent's clock. Convex corner exclusion also holds between anchors.
     const offset=index?1.7:0,p=V(.64*(Math.sin(n*.56+offset)-Math.sin(offset)),0,sign*(.60+.08*Math.sin(n*.71+offset))+.20*(Math.sin(n*.35+offset)-Math.sin(offset)));
     p.x=clamp(p.x,-.88,.88);p.z=clamp(p.z,-.96,.96);const spill=Math.max(0,p.x-p.z-.78)*.5;p.x-=spill;p.z+=spill;return p;
    };
    const from=anchor(beat),to=anchor(beat+1);paths[actor]={from,to,centre:from.clone().lerp(to,ease),delta:to.clone().sub(from),phase,ease,mobile,weight:m.phase==='round'?1:0};
   }
   this.travelTime=this.walkers.lion.time;return paths;
  }

  plantFeet(){
   if(this.match.phase!=='round'){this.footPlants={};return;}
   this.footPlants=this.footPlants||{};
   for(const actor of ['lion','rabbit']){
    const coach=this.coaches[actor],parent=coach.root.parent;
    if(this.match.fighters[actor].down){delete this.footPlants[actor+'L'];delete this.footPlants[actor+'R'];continue;}
    let changed=false;
    for(const plan of coach.metrics.footTargets){
     const side=plan.side,key=actor+side,foot=coach.joints['foot'+side];
     if(plan.lift>1e-7){delete this.footPlants[key];continue;}
     const sole=foot.localToWorld(V(0,-.102,.215)),current=parent.worldToLocal(sole.clone());
     if(!this.footPlants[key]){this.footPlants[key]=current;continue;}
     // Anchor in ring coordinates, so orbiting the whole scene does not drag
     // the feet. Keep the authored heel pivot around this forward sole point.
     const delta=parent.localToWorld(this.footPlants[key].clone()).sub(sole);
     if(delta.lengthSq()<1e-14)continue;
     const worldQ=foot.getWorldQuaternion(new THREE.Quaternion()),localQ=coach.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQ);
     const target=coach.root.worldToLocal(foot.getWorldPosition(V()).add(delta));
     const authored=V(...plan.ankle);
     plan.error=coach.solve(coach.joints['thigh'+side],coach.joints['knee'+side],foot,target,V(side==='L'?-.07:.07,0,1));coach.orient(foot,localQ);
     // A planted sole the leg can no longer reach (the body was driven away from it, e.g. onto the ropes) is
     // released and re-planted under the fighter instead of leaving an unreachable foot target.
     if(plan.error>=.0015){delete this.footPlants[key];plan.error=coach.solve(coach.joints['thigh'+side],coach.joints['knee'+side],foot,authored,V(side==='L'?-.07:.07,0,1));coach.orient(foot,localQ);changed=true;continue;}
     const shin=coach.point(coach.joints['knee'+side]).sub(coach.point(foot)).normalize().applyQuaternion(localQ.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
     plan.ankle=coach.point(foot).toArray();plan.contact=coach.root.worldToLocal(parent.localToWorld(this.footPlants[key].clone())).toArray();changed=true;
    }
    if(changed)coach.syncSkin();
   }
  }

  pose(){
   const m=this.match,a=this.arena,ceremony=m.phase==='scoring'||m.phase==='ceremony',reveal=m.phase==='ceremony',raise=reveal?clamp((m.phaseTime-.4)/1.5):0;
   if(ceremony&&!this.lineupStart)this.lineupStart=Object.fromEntries(['lion','rabbit'].map(actor=>[actor,{position:this.coaches[actor].root.position.clone(),yaw:this.coaches[actor].ringYaw??this.coaches[actor].root.rotation.y}]));
   const travel=this.ringTravel();
   const lineup=ceremony?clamp((reveal?10:m.phaseTime)/2):0,ease=lineup*lineup*(3-2*lineup);
   if(ceremony&&!this.userView&&this.lineupEase!==1)a.group.rotation.y=.90*(1-ease);this.lineupEase=ease;
   for(const [actor,index] of [['lion',0],['rabbit',1]]){
    const coach=this.coaches[actor],f=m.fighters[actor];
    if(ceremony){coach.root.position.copy(this.lineupStart[actor].position).lerp(V(index?.72:-.72,0,.05),ease);coach.ringYaw=this.lineupStart[actor].yaw*(1-ease);}
    else {const path=travel[actor];coach.root.position.copy(path.from).lerp(path.to,path.ease);coach.ringDelta=path.to.clone().sub(path.from);}
   }
   if(!ceremony){
    this.keepRange();
    for(const [actor,index] of [['lion',0],['rabbit',1]]){
     const coach=this.coaches[actor],direction=index?-1:1,corner=m.phase==='rest'?.34*clamp(m.phaseTime/1.4):0;const reaction=this.reaction(actor),push=reaction?.pushDirection?0:reaction?.move?.includes('uppercut')?Math.min(.06,(reaction.amount||0)*.04):Math.min(.045,(reaction?.amount||0)*.032);
     coach.root.position.z-=direction*(corner+push);const impulse=this.impactIntent(actor);impulse.multiplyScalar(Math.min(1,this.travelCapacity(coach.root.position,impulse)));this.impactOffsets=this.impactOffsets||{};this.impactOffsets[actor]=impulse;coach.root.position.add(impulse);
    }
    this.applyReach();
   }
   if(!ceremony){for(const actor of ['lion','rabbit']){const c=this.coaches[actor],op=this.coaches[other(actor)];const d=op.root.position.clone().sub(c.root.position);c.ringYaw=Math.atan2(d.x,d.z);}}

   for(const actor of ['lion','rabbit']){
    const coach=this.coaches[actor],state=this.recoveryState(actor),yaw=coach.ringYaw;
    coach.root.quaternion.setFromEuler(new THREE.Euler(state.tilt,yaw,0,'YXZ'));coach.root.position.y=0;
   }
   a.group.updateMatrixWorld(true);
   // Establish boxing range before committing wrist/impact targets. Moving
   // roots only after IK moved a latched contact point twice on the next frame.
   if(m.phase==='round')this.separateTorso(false);
   const specs={lion:this.punchSpec('lion'),rabbit:this.punchSpec('rabbit')},metrics={};
   for(const actor of ['lion','rabbit']){
    const coach=this.coaches[actor],spec=specs[actor],f=m.fighters[actor],state=this.recoveryState(actor),options={stance:1,guardElbowBack:.55,guardWidth:.24,guardHeight:1.72,guardCover:1,keepFaceClear:true,legReachMargin:.002+(m.phase==='round'?.012*(this.straightPreparationWeight||0):0),simulationTime:m.time,defenceSide:spec.defenceSide,stepDirection:spec.stepDirection,stepAdvance:spec.stepAdvance,guardStyle:spec.guardStyle,brace:spec.brace,hitReaction:this.reaction(actor),damage:f.damage,stamina:f.stamina,down:state.down,duckDepth:.28*(f.footwork||1)};
    if(m.phase==='round'&&this.footPlants){
     options.plantedContacts={};for(const side of ['L','R']){const anchor=this.footPlants[actor+side];if(anchor)options.plantedContacts[side]=coach.root.worldToLocal(coach.root.parent.localToWorld(anchor.clone())).toArray();}
    }
    // GOTR-0051: when a punch is coming the forward lead glove tightens back to the cheek cover, so blocks keep
    // the proven guard geometry (a straight caught on the glove still lands extended); it opens again afterwards.
    {const threat=specs[other(actor)];if(threat.attack&&!spec.attack)options.blockCover=clamp(threat.phase/.05)*(1-clamp((threat.phase-.62)/.25));}
    // GOTR-0075: a Guard the player orders (held on the pad) closes both gloves to that blocking cover for as long as it is
    // held, eased in/out over ~60 ms so the repeated guard orders of a hold never flicker. Idle stays the open stance.
    {const want=m.phase==='round'&&actor===m.playerActor&&spec.move==='guard'&&spec.defend&&spec.id>0?1:0,c=(this.heldCover=this.heldCover||{})[actor]||(this.heldCover[actor]={v:0,t:m.time}),dt=clamp(m.time-c.t,0,.1);c.t=m.time;c.v+=(want-c.v)*(1-Math.exp(-dt/.06));if(want&&c.v<.35)c.v=.35;if(c.v>.01)options.blockCover=Math.max(options.blockCover||0,c.v);}
    const path=travel[actor];
    if(m.phase==='round'&&path.weight>.001&&!ceremony){const yaw=coach.ringYaw,local=coach.ringDelta.clone().applyAxisAngle(V(0,1,0),-yaw),first=Math.abs(local.z)>=Math.abs(local.x)?(local.z>=0?-1:1):(local.x>=0?1:-1);options.ringStep={first,phase:path.phase,ease:path.ease,weight:path.weight,turn:0,delta:local.toArray()};}
    if(spec.attack){
     options.planStraight=true;options.extendStraight=spec.move==='jab'||spec.move==='cross';if(options.extendStraight)options.armReachMargin=.003;options.strikeDirection=[0,0,1];
     let target=this.target(actor,spec);
     // A committed straight still tracks the opponent's steps across the
     // ring; only a slip, roll or duck takes the head off its line.
     if(f.action.aimInArena)target=coach.root.worldToLocal(this.cast.localToWorld(f.action.aimRoot?V(...f.action.aim).add(this.coaches[other(actor)].root.position).sub(V(...f.action.aimRoot)).setY(f.action.aim[1]):V(...f.action.aim)));
     // GOTR-0032: bent-arm punches aim deeper through the target (hooks across, uppercuts up through the chin),
     // so the glove still accelerates at contact; the contact constraint keeps it on the receiver's surface.
     const upper=spec.move.includes('uppercut'),bent=upper||spec.move.includes('hook'),through=target.clone().sub(V(0,target.y,0)).normalize().multiplyScalar(bent?.07:.035);
     options.knuckleTarget=target.add(through).add(V(0,upper?.06:0,0)).toArray();options.strikeHeight=target.y-.035;
     options.advance=spec.move.includes('uppercut')?.08:spec.move.includes('hook')?.065:.025;
     if(options.extendStraight)this.reach[actor].aim=options.knuckleTarget;
     else{
      // Hooks and uppercuts are inside punches: step in from boxing range
      // with both feet and step back out, instead of swinging a long arm.
      if(f.action.closing==null)f.action.closing=clamp((this.chestGap()-1.22)/1.32,0,.14);
      options.advance+=f.action.closing;
     }
     options.power=1.32;options.contactDrive=options.extendStraight?.025:.075;options.levelChange=spec.target==='body'?.065:.015;
     if(spec.move.includes('uppercut')){
      options.upperLoadHeight=spec.target==='body'?1.02:1.28;
      // The wrist chamber stays on the striker's side of the torso. Drive the
      // knuckle crown up under the target instead of sweeping through ribs.
      options.uppercutBagTarget=[target.x,target.y-.19,target.z-.08];
     }
     if(f.action?.returnHand){
      const returned=f.action.returnHand,hold=returned.followReceiver?.055:.025,t=clamp((m.time-f.action.contactTime-hold)/.21),blend=t*t*(3-2*t),point=V(...returned.point);
      if(returned.followReceiver){
       const receiver=this.coaches[returned.followReceiver],delta=receiver.root.position.clone().sub(V(...returned.receiverRoot)),direction=V(...returned.pushDirection);
       point.addScaledVector(direction,clamp(delta.dot(direction),0,.11)*(1-blend));
      }
      options.contactReturn={...returned,point:coach.root.worldToLocal(this.cast.localToWorld(point)).toArray(),blend,guide:returned};
      options.advance*=1-blend;options.contactDrive*=1-blend;
     }
    }
    if(ceremony){options.presentation={mode:!reveal?'waiting':!m.result.winner?'winner':m.result.winner===actor?'winner':'loser',side:actor==='lion'?'R':'L',raise:!m.result.winner||m.result.winner===actor?raise:0};}
    const time=ceremony?m.time:spec.phase*1.22;
    metrics[actor]=coach.update(time,ceremony?(ease<1?'step':'guard'):spec.move,'one_two',options);
    if(f.down)this.downPose(coach,state);
   }
   if(m.phase==='round'){this.stabilizeBends();this.clearOwnFaces();}
   a.group.updateMatrixWorld(true);
   if(m.phase==='round')this.separateTorso();
   this.plantFeet();
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
  punchSpec(actor){
   // GOTR-0025: punches drive into the target faster (shared punch clock),
   // and a punch followed by another punch of the same combination ends
   // once its hand is back at the guard, so the next one starts at once.
   const m=this.match,a=m.fighters[actor].action,R=window.BOXING_ROUTINES;
   if(!a?.attack||!R?.punchPhase)return m.spec(actor);
   if(a.baseDuration==null)a.baseDuration=a.duration;
   if(!a.linked&&m.phase==='round'){
    const next=actor===m.playerActor?m.playerQueue?.[0]||m.pendingPlayerCombo?.commands?.[0]:m.fighters[actor].plan?.[0];
    if(next&&['jab','cross','hook','rear_hook','uppercut','rear_uppercut'].includes(next.move)&&(m.time-a.start)<a.baseDuration*.5){a.linked=true;a.duration=a.baseDuration*R.punchSpan();}
   }
   const spec=m.spec(actor);spec.phase=R.punchPhase(spec.phase*a.duration/a.baseDuration);return spec;
  }
  chestGap(){
   const a=this.coaches.lion.joints.chest.getWorldPosition(V()),b=this.coaches.rabbit.joints.chest.getWorldPosition(V());return Math.hypot(a.x-b.x,a.z-b.z);
  }
  keepRange(){
   // Boxing range. At the old 1.2 m the guards touched and every straight
   // was stopped while the elbow was still folded near 90-110 degrees. A
   // straight covers shoulder drive + arm + glove, so stance roots stay
   // far enough apart for it to land extended on the guard or the head.
   const m=this.match,a=this.coaches.lion,b=this.coaches.rabbit,axis=b.root.position.clone().sub(a.root.position).setY(0),distance=axis.length();
   if(distance<1e-4)return;axis.divideScalar(distance);
   const near=FightArena.range.near,far=FightArena.range.far,change=distance<near?near-distance:m.phase==='round'&&distance>far?far-distance:0;
   if(!change)return;
   if(change<0){a.root.position.addScaledVector(axis,-change*.5);b.root.position.addScaledVector(axis,change*.5);return;}
   // Opening the range yields to the ropes and the referee's corner: each
   // fighter gives ground in proportion to the room behind, so both keep
   // space to be driven back by a clean hit.
   const directions=[axis.clone().negate(),axis],coaches=[a,b],caps=coaches.map((c,i)=>this.travelCapacity(c.root.position,directions[i])),room=caps[0]+caps[1];
   if(room>1e-6)for(let i=0;i<2;i++)coaches[i].root.position.addScaledVector(directions[i],Math.min(caps[i],change*caps[i]/room));
  }
  applyReach(){
   // The striker's own weight shift fine-tunes the distance of a straight.
   for(const actor of ['lion','rabbit']){
    const shift=this.reach[actor].shift;if(Math.abs(shift)<1e-6)continue;
    const coach=this.coaches[actor],opponent=this.coaches[other(actor)],direction=opponent.root.position.clone().sub(coach.root.position).setY(0).normalize().multiplyScalar(Math.sign(shift));
    const own=Math.min(Math.abs(shift),this.travelCapacity(coach.root.position,direction));coach.root.position.addScaledVector(direction,own);
    // With the ropes or the referee's corner behind the striker, the
    // opponent gives the remaining ground; never store unreachable range.
    if(shift<0){const rest=Math.min(-shift-own,this.travelCapacity(opponent.root.position,direction.clone().negate()));opponent.root.position.addScaledVector(direction,-rest);this.reach[actor].shift=-(own+rest);}
    else this.reach[actor].shift=own;
   }
  }
  straightExcess(actor,terminal=false){
   // Signed distance by which the planned, fully extended glove would pass
   // the first surface on its path (guard, arm, head or body). Positive:
   // the punch would be stopped short of extension; negative: out of reach.
   const coach=this.coaches[actor],spec=this.specs[actor],state=this.reach[actor],side=rear(spec.move)?'R':'L',j=coach.joints;
   if(!state.aim)return null;
   const key=spec.move+(spec.target==='body'?'Body':'Head'),model=state.model[key]||FightArena.straightShoulder[key],now=coach.point(j['arm'+side]);
   // Until the body drive has delivered the shoulder, use where it will be.
   const settle=terminal?1:clamp((spec.phase-.33)/.065),shoulder=V(...model).lerp(now,settle*settle*(3-2*settle));
   if(spec.phase>=.395&&!state.sampled&&!this.match.fighters[actor].action.returnHand){state.sampled=true;state.model[key]=now.toArray();}
   const direction=V(...state.aim).sub(shoulder).normalize(),reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.003;
   // Sweep the knuckle sphere along the glove's own line, from the guard it
   // leaves to full extension and well past it. The launch point is kept in
   // ring coordinates once the hand has left the guard.
   // On the final approach the sweep starts at the glove itself.
   const group=this.cast,knuckle=coach.root.localToWorld(V(...coach.metrics.gloves[side==='R'?1:0].knuckles));if(spec.phase<.22||!state.launch)state.launch=group.worldToLocal(knuckle.clone());
   const finish=coach.root.localToWorld(shoulder.clone().addScaledVector(direction,reach+.140)),line=finish.clone().sub(terminal?knuckle:spec.phase<.18?coach.root.localToWorld(shoulder.clone()):group.localToWorld(state.launch.clone())),span=line.length();if(span<1e-4)return null;line.divideScalar(span);
   const length=terminal?span:.36,total=length+.34,from=finish.clone().addScaledVector(line,-length),beyond=finish.clone().addScaledVector(line,.34);
   const touches=s=>this.collision(from.clone().lerp(beyond,s/total),other(actor)).penetration>0;
   for(let s=0;s<=total+1e-6;s+=.03){
    if(!touches(s))continue;
    let lo=Math.max(0,s-.03),hi=s;if(s>0)for(let k=0;k<5;k++){const mid=(lo+hi)/2;if(touches(mid))hi=mid;else lo=mid;}
    return length-hi;
   }
   return null;
  }
  updateReach(){
   const m=this.match;
   for(const actor of ['lion','rabbit']){
    const state=this.reach[actor],spec=this.specs[actor],action=m.fighters[actor].action,straight=m.phase==='round'&&spec.attack&&(spec.move==='jab'||spec.move==='cross');
    if(state.action!==(straight?action.id:0)){state.action=straight?action.id:0;state.sampled=false;state.launch=null;state.gap=null;if(!straight)state.aim=null;}
    if(straight&&!action.recorded&&spec.phase<.47){
     const gap=this.coaches.lion.root.position.distanceTo(this.coaches.rabbit.root.position);let change=0;
     if(spec.phase<.22||state.gap==null){
      // Before the hand leaves the guard, pick the distance at which the
      // padded knuckles land in the last centimetres of the extension.
      const excess=this.straightExcess(actor);if(excess!=null)change=-(excess-.016)*.5;state.gap=gap+change;
     // In flight, a glancing guard makes that sweep jump; just keep the
     // chosen distance while the opponent keeps moving.
     }else if(spec.phase<.35)change=gap-state.gap;
     else{
      // Final approach: compare the glove's remaining travel with the free
      // path in front of it and close or open the last centimetres.
      const excess=this.straightExcess(actor,true);change=excess==null?gap-state.gap:-(excess-.010)*.7;state.gap=gap+change;
     }
     state.shift=clamp(state.shift+clamp(change,-FightArena.range.rate,FightArena.range.rate),-FightArena.range.back,FightArena.range.forward);
    }else if(!straight||spec.phase>.60||action.recorded&&m.time-action.contactTime>.10)state.shift*=Math.exp(-(1/60)/.16);
   }
  }
  separateTorso(sync=true){
   const a=this.coaches.lion,b=this.coaches.rabbit;
   const ca=a.joints.chest.getWorldPosition(V()),cb=b.joints.chest.getWorldPosition(V()),axis=cb.clone().sub(ca);axis.y=0;
   // Straights need room for the shoulder, forearm and padded fist. Ease the
   // spacing during preparation/recovery rather than snapping roots at contact.
   const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};let weight=0;
   for(const actor of ['lion','rabbit']){const spec=this.match.spec(actor);if(spec.attack&&(spec.move==='jab'||spec.move==='cross')){
    // Punching room is held by keepRange() and tuned by the reach controller;
    // only the leg reserve still follows the straight's preparation.
    const stage=smooth(spec.phase/.20)*(1-smooth((spec.phase-.66)/.25));weight=Math.max(weight,stage);
   }}
   this.straightPreparationWeight=weight;
   const distance=axis.length();
   if(distance>.001)axis.divideScalar(distance);else axis.copy(b.root.getWorldPosition(V()).sub(a.root.getWorldPosition(V()))).setY(0).normalize();
   // Baseline range correction must not absorb the registered impact recoil.
   const offset=this.impactOffset('rabbit').sub(this.impactOffset('lion')),recoil=offset.clone().transformDirection(this.cast.matrixWorld).multiplyScalar(offset.length());
   const clearance=1.02+Math.max(0,recoil.dot(axis));if(distance>=clearance)return;
   // Preserve mandatory body separation; only the new optional range expansion
   // yields to ropes/referee space. Do not clamp bodies back into each other.
   const hard=Math.max(0,1.02-distance)*.5;
   for(const [coach,sign] of [[a,-1],[b,1]])if(hard){const world=coach.root.getWorldPosition(V()).addScaledVector(axis,hard*sign);coach.root.position.copy(coach.root.parent.worldToLocal(world));}
   const extra=Math.max(0,clearance-Math.max(1.02,distance)),localAxis=axis.clone().transformDirection(new THREE.Matrix4().copy(this.cast.matrixWorld).invert());
   const directions=[localAxis.clone().negate(),localAxis],coaches=[a,b],caps=coaches.map((c,i)=>this.travelCapacity(c.root.position,directions[i])),amounts=caps.map(c=>Math.min(extra*.5,c));
   let remaining=extra-amounts[0]-amounts[1];
   for(let i=0;i<2;i++){const take=Math.min(remaining,caps[i]-amounts[i]);amounts[i]+=take;remaining-=take;}
   for(let i=0;i<2;i++){coaches[i].root.position.addScaledVector(directions[i],amounts[i]);if(sync)coaches[i].syncSkin();else coaches[i].root.updateMatrixWorld(true);}
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
   let anyChanged=false;
   for(const coach of Object.values(this.coaches)){let changed=false;
    for(const side of ['L','R']){
     const before=coach.point(coach.joints['hand'+side]),i=side==='L'?0:1,reference=coach.armBendReference(side),glove=coach.metrics.gloves[i];
     const safe=coach.clearOwnFace(side,glove,V(...glove.palmTarget),reference.bend,{...reference,lateral:true});
     coach.metrics.gloves[i]=safe.glove;coach.metrics.hands[i]=coach.point(coach.joints['hand'+side]).toArray();coach.metrics.handErrors[i]=safe.error;changed=changed||before.distanceToSquared(coach.point(coach.joints['hand'+side]))>1e-12;
    }
    if(changed){coach.syncSkin();anyChanged=true;}
   }
   return anyChanged;
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
   // Leave padding margin for the subsequent arm/own-face projections.
   // Body constraints are independent of the other fighter's moving guard.
   // Repeat the coupled solve, then finish on the solid torso/head constraint.
   const poles={};for(const actor of ['lion','rabbit'])for(const side of ['L','R'])poles[actor+side]=this.coaches[actor].armBendReference(side);
   for(let pass=0;pass<3;pass++){
    for(const actor of ['lion','rabbit'])for(const side of ['L','R'])this.coaches[actor].constrainGlove(side,p=>this.collision(p,other(actor)),.008,poles[actor+side]);
    for(const actor of ['lion','rabbit'])for(const side of ['L','R'])this.coaches[actor].constrainArm(side,(p,r)=>this.solidContact(p,other(actor),actor,r),.012,poles[actor+side]);
   }
   // Contact correction can change the reach axis again. Retain continuity
   // after the coupled solve, then recheck the surfaces with that elbow plane.
   this.stabilizeBends();
   for(const actor of ['lion','rabbit'])for(const side of ['L','R']){
    const coach=this.coaches[actor],pole=coach.armBendReference(side);
    coach.constrainGlove(side,p=>this.collision(p,other(actor)),.008,pole);
    coach.constrainArm(side,(p,r)=>this.solidContact(p,other(actor),actor,r),.012,pole);
   }
   this.clearOwnFaces();
   // Clearing a muzzle or forearm can move the padded knuckles back into
   // the opponent's arm. Finish on the coupled glove/face constraints too.
   const finishPoles={};for(const actor of ['lion','rabbit'])for(const side of ['L','R'])finishPoles[actor+side]=this.coaches[actor].armBendReference(side);
   for(let pass=0;pass<6;pass++){
    const faceChanged=this.clearOwnFaces();let overlap=false;const armOverlaps=[];
    for(const actor of ['lion','rabbit'])for(const [i,side] of ['L','R'].entries()){
     const coach=this.coaches[actor],p=coach.root.localToWorld(V(...coach.metrics.gloves[i].knuckles));
     if(this.collision(p,other(actor)).penetration>.010)overlap=true;
     const elbow=coach.joints['elbow'+side].getWorldPosition(V()),wrist=coach.joints['hand'+side].getWorldPosition(V());
     const samples=[{p,r:.078},{p:wrist,r:.05},... [.35,.65].map(t=>({p:elbow.clone().lerp(wrist,t),r:.052}))];
     if(samples.some(s=>this.solidContact(s.p,other(actor),actor,s.r).penetration>.014)){armOverlaps.push([actor,side]);overlap=true;}
    }
    if(!faceChanged&&!overlap)break;
    for(const actor of ['lion','rabbit'])for(const side of ['L','R']){
     const coach=this.coaches[actor];coach.constrainGlove(side,p=>{
      const opponent=this.collision(p,other(actor)),solid=this.solidContact(p,other(actor),actor);
      return solid.penetration>opponent.penetration?solid:opponent;
     },.008,finishPoles[actor+side]);
    }
    for(const [actor,side] of armOverlaps)this.coaches[actor].constrainArm(side,(p,r)=>this.solidContact(p,other(actor),actor,r),.012,finishPoles[actor+side]);
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
    const current=this.cast.worldToLocal(world.clone()),previous=this.previous[key]||current,velocity=current.clone().sub(previous).divideScalar(dt);
    // A straight now lands at the end of its extension, where the hand is
    // already easing out. Score half the peak drive of the last 0.1 s, which
    // matches the contact speeds measured when straights landed mid-flight.
    const drive=(this.drives=this.drives||{})[key]||(this.drives[key]=[]);drive.push(velocity);if(drive.length>6)drive.shift();
    if(spec.attack&&side===(rear(spec.move)?'R':'L')&&spec.phase>.18&&spec.phase<.78&&!m.fighters[actor].action?.recorded){
     const count=Math.max(1,Math.ceil(previous.distanceTo(current)/.018));let contact=null;
     for(let i=1;i<=count;i++){const hit=this.collision(this.cast.localToWorld(previous.clone().lerp(current,i/count)),other(actor));if(hit.penetration>0){contact=hit;break;}}
     if(contact){const normal=contact.normal.clone().transformDirection(new THREE.Matrix4().copy(this.cast.matrixWorld).invert()),impact=spec.move==='jab'||spec.move==='cross'?drive.reduce((best,v)=>-v.dot(normal)>-best.dot(normal)?v:best,velocity):velocity,speed=Math.max(0,-velocity.dot(normal),impact===velocity?0:-impact.dot(normal)*.5,spec.move.includes('uppercut')?Math.max(0,velocity.y)*.70:0);const direction=this.coaches[other(actor)].localDirection(impact.clone().transformDirection(this.cast.matrixWorld)).normalize().toArray();samples.push({normal:contact.normal.toArray(),direction,pushDirection:impact.clone().setY(0).normalize().toArray(),actor,action:spec.id,part:contact.part,speed,point:contact.point.toArray(),side:contact.side==='L'?-1:contact.side==='R'?1:(this.coaches[other(actor)].root.worldToLocal(contact.point.clone()).x<0?-1:1),hand:side,receiver:other(actor)});}
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
     if(event.move==='jab'||event.move==='cross')m.fighters[sample.receiver].reaction.pushDirection=sample.pushDirection;
     this.contacts.push({...event,kind:sample.part,impulse:event.severity,closingSpeed:sample.speed});goals[sample.actor][sample.hand]=clamp(.3+event.severity*.45);if(sample.part==='glove')goals[sample.receiver][sample.side<0?'L':'R']=.5;}}
   // Always constrain the rendered glove, including follow-through/recovery
   // after an action has already scored. Previously a.recorded skipped the
   // only collision path and let the animation continue through the opponent.
   this.resolveTrades();this.updateReach();
   for(const event of this.contacts){
    const action=m.fighters[event.actor].action;if(!action||action.returnHand)continue;
    const coach=this.coaches[event.actor],side=rear(action.move)?'R':'L',reference=coach.armBendReference(side),glove=coach.metrics.gloves[side==='R'?1:0];
    action.returnHand={side,point:this.cast.worldToLocal(coach.joints['hand'+side].getWorldPosition(V())).toArray(),axis:reference.axis.toArray(),bend:reference.bend.toArray(),palm:glove.palmTarget||[0,-1,0],turn:glove.turn};
    if(event.move==='jab'||event.move==='cross')Object.assign(action.returnHand,{followReceiver:event.receiver,receiverRoot:this.coaches[event.receiver].root.position.toArray(),pushDirection:m.fighters[event.receiver].reaction.pushDirection});
   }
   for(const actor of ['lion','rabbit'])for(const [i,side] of ['L','R'].entries())this.previous[actor+side]=this.cast.worldToLocal(this.coaches[actor].root.localToWorld(V(...this.coaches[actor].metrics.gloves[i].knuckles)));
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
   this.engine.career?.onFight(this);
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
 // Stance range in metres between fighter roots, and how far a striker may
 // shift its own weight back/forward to land a straight at full extension.
 // rate: most the weight shift may change per frame (GOTR-0025: raised from
 // .022 with the faster punch clock so a straight still lands extended).
 FightArena.range={near:1.74,far:1.88,back:.26,forward:.14,rate:.028};
 // Shoulder position (fighter-local) when a fight straight lands; refined
 // from each fighter's own completed punches during a bout.
 FightArena.straightShoulder={jabHead:[-.115,1.491,.512],jabBody:[-.106,1.441,.521],crossHead:[-.035,1.500,.560],crossBody:[-.035,1.450,.560]};
 window.FightArena=FightArena;
})();
