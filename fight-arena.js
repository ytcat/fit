/* Fight-only scene/controller. Practice choreography remains independent. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const other=a=>a==='lion'?'rabbit':'lion',rear=move=>['cross','rear_hook','rear_uppercut'].includes(move);
 class FightArena {
  constructor(arena,options){
   this.arena=arena;this.engine=arena.engine;this.match=new BoxingFight(options);this.tick=0;this.previous={};this.compressions={lion:{L:0,R:0},rabbit:{L:0,R:0}};this.contacts=[];this.eventCursor=0;
   this.coaches={lion:this.engine.coach,rabbit:arena.rabbit};
   this.referee=new RhinoReferee();arena.group.add(this.referee.root);this.audience=new FightAudience(arena.group);
   this.ring=new THREE.Group();arena.group.add(this.ring);
   for(const s of [-1,1])for(const z of [-1.65,1.65]){
    arena.rod(this.ring,V(s*1.65,.02,z),V(s*1.65,1.30,z),.035).userData.ringPost=true;
    const pad=arena.mesh(this.ring,new THREE.SphereGeometry(1,20,12),arena.leather,V(s*1.65,1.05,z));pad.scale.set(.065,.23,.065);pad.userData.ringPost=true;
   }
   for(const y of [.48,.82,1.16]){arena.rod(this.ring,V(-1.65,y,-1.65),V(1.65,y,-1.65),.012,arena.accent).userData.ringNormal=V(0,0,-1);for(const s of [-1,1])arena.rod(this.ring,V(s*1.65,y,-1.65),V(s*1.65,y,1.65),.012,arena.accent).userData.ringNormal=V(s,0,0);}
   arena.group.rotation.y=.90;this.pose();
  }
  reaction(actor){
   const r=this.match.fighters[actor].reaction;if(!r)return null;const age=this.match.time-r.time;
   return {...r,amount:clamp(r.severity*1.5*(1-Math.exp(-age/.018))*Math.exp(-age/.25),0,1.4)};
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
  pose(){
   const m=this.match,a=this.arena,ceremony=m.phase==='scoring'||m.phase==='ceremony',reveal=m.phase==='ceremony',raise=reveal?clamp((m.phaseTime-.4)/1.5):0;
   if(ceremony&&!this.lineupStart)this.lineupStart=Object.fromEntries(['lion','rabbit'].map(actor=>[actor,{position:this.coaches[actor].root.position.clone(),yaw:this.coaches[actor].root.rotation.y}]));
   const lineup=ceremony?clamp((reveal?10:m.phaseTime)/2):0,ease=lineup*lineup*(3-2*lineup);
   if(ceremony&&this.lineupEase!==1)a.group.rotation.y=.90*(1-ease);this.lineupEase=ease;
   for(const [actor,index] of [['lion',0],['rabbit',1]]){
    const coach=this.coaches[actor],f=m.fighters[actor];
    if(ceremony){coach.root.position.copy(this.lineupStart[actor].position).lerp(V(index?.72:-.72,0,.05),ease);coach.root.rotation.y=this.lineupStart[actor].yaw*(1-ease);}
    else {const direction=index?-1:1,corner=m.phase==='rest'?.34*clamp(m.phaseTime/1.4):0;coach.root.position.set(.055*Math.sin(m.time*.62+index*2),0,direction*(-.55-corner-.025*Math.sin(m.time*.73+index)));coach.root.rotation.y=index?Math.PI:0;}
   }
   a.group.updateMatrixWorld(true);
   const specs={lion:m.spec('lion'),rabbit:m.spec('rabbit')},metrics={};
   for(const actor of ['lion','rabbit']){
    const coach=this.coaches[actor],spec=specs[actor],f=m.fighters[actor],options={defenceSide:spec.defenceSide,brace:spec.brace,hitReaction:this.reaction(actor),down:f.down?Math.sin(clamp(m.phaseTime/.4)*Math.PI/2)*(1-clamp((m.phaseTime-6.4)/1.4)):0,duckDepth:.28};
    if(spec.attack){
     let target=this.target(actor,spec);if(f.action.aimInArena)target=coach.root.worldToLocal(a.group.localToWorld(V(...f.action.aim)));
     options.knuckleTarget=target.toArray();options.strikeHeight=target.y-.035;
     options.advance=spec.move.includes('uppercut')?.23:spec.move.includes('hook')?.10:.025;
     options.contactDrive=.025;options.levelChange=spec.target==='body'?.065:.015;
     if(spec.move.includes('uppercut')){options.upperLoadHeight=spec.target==='body'?1.02:1.28;options.upperWristHeight=target.y-.16;}
    }
    if(ceremony){options.presentation={mode:!reveal?'waiting':!m.result.winner?'winner':m.result.winner===actor?'winner':'loser',side:actor==='lion'?'R':'L',raise:!m.result.winner||m.result.winner===actor?raise:0};}
    const time=ceremony||(!spec.attack&&!spec.defend)?m.time:spec.phase*1.22;
    metrics[actor]=coach.update(time,ceremony?(ease<1?'step':'guard'):spec.move,'one_two',options);
   }
   a.group.updateMatrixWorld(true);
   this.referee.root.position.set(ceremony?1.13*(1-ease):1.13,0,ceremony?-.83+.71*ease:-.83);this.referee.root.rotation.y=ceremony?-.55*(1-ease):-.55;
   a.group.updateMatrixWorld(true);
   let grip=null,side=1;
   if(reveal&&m.result.winner){const winner=m.result.winner,coach=this.coaches[winner],hand=coach.joints[winner==='lion'?'handR':'handL'];grip=hand.getWorldPosition(V());side=winner==='lion'?-1:1;}
   if(reveal&&!m.result.winner)grip={'-1':this.coaches.lion.joints.handR.getWorldPosition(V()),'1':this.coaches.rabbit.joints.handL.getWorldPosition(V())};
   if(m.phase==='count'){grip=this.referee.root.localToWorld(V(.32,1.76,.27));side=1;}
   this.referee.update(m.time,grip,side);this.audience.update(m.time,reveal);
   const rotation=a.group.getWorldQuaternion(new THREE.Quaternion());
   for(const part of this.ring.children){if(part.userData.ringNormal)part.visible=part.userData.ringNormal.clone().applyQuaternion(rotation).z<.05;else if(part.userData.ringPost)part.visible=part.getWorldPosition(V()).z<.65;}
   this.metrics=metrics;this.specs=specs;
   return metrics;
  }
  collision(point,receiver){
   const a=this.arena,c=this.coaches[receiver],candidates=[];
   for(const side of ['L','R'])candidates.push({...a.closest(point,c.joints['hand'+side],{centre:[0,-.137,-.026],radius:[.091,.067,.068]}),part:'glove',side});
   const guard=candidates.filter(h=>h.penetration>0).sort((x,y)=>x.distance-y.distance)[0];if(guard)return guard;
   candidates.length=0;
   for(const side of ['L','R'])for(const [from,to,radius] of [['arm','elbow',.092],['elbow','hand',.063]]){
    const start=c.joints[from+side].getWorldPosition(V()),end=c.joints[to+side].getWorldPosition(V()),axis=end.clone().sub(start),t=clamp(point.clone().sub(start).dot(axis)/axis.lengthSq());
    const centre=start.addScaledVector(axis,t),delta=point.clone().sub(centre),length=delta.length(),normal=length>1e-8?delta.divideScalar(length):V(0,0,1),distance=length-radius;
    candidates.push({point:centre.addScaledVector(normal,radius),normal,distance,penetration:.064-distance,part:'arm',side});
   }
   candidates.push({...a.closest(point,c.joints.head,{centre:[0,.16,.08],radius:[.145,.18,.14]}),part:'head'});
   candidates.push({...a.closest(point,c.joints.chest,{centre:[0,.10,.045],radius:[.23,.24,.16]}),part:'body'});
   for(const side of ['L','R'])candidates.push({...a.closest(point,c.joints['arm'+side],{centre:[0,-.025,.015],radius:[.115,.135,.115]}),part:'shoulder',side});
   return candidates.sort((x,y)=>x.distance-y.distance)[0];
  }
  step(){
   const dt=1/60,m=this.match;m.advance(dt);this.pose();this.contacts=[];
   const goals={lion:{L:0,R:0},rabbit:{L:0,R:0}};
   // Capture both fists before resolving either actor so simultaneous trades are fair.
   const samples=[];for(const actor of ['lion','rabbit']){const action=m.fighters[actor].action;if(action?.attack&&this.specs[actor].phase>.22&&this.specs[actor].phase<.65&&this.specs[other(actor)].defend)action.facedDefence=true;}
   for(const actor of ['lion','rabbit'])for(const [index,side] of ['L','R'].entries()){
    const coach=this.coaches[actor],spec=this.specs[actor],key=actor+side,world=coach.root.localToWorld(V(...this.metrics[actor].gloves[index].knuckles));
    const current=this.arena.group.worldToLocal(world.clone()),previous=this.previous[key]||current,velocity=current.clone().sub(previous).divideScalar(dt);
    if(spec.attack&&side===(rear(spec.move)?'R':'L')&&spec.phase>.18&&spec.phase<.78&&!m.fighters[actor].action?.recorded){
     const count=Math.max(1,Math.ceil(previous.distanceTo(current)/.018));let contact=null;
     for(let i=1;i<=count;i++){const hit=this.collision(this.arena.group.localToWorld(previous.clone().lerp(current,i/count)),other(actor));if(hit.penetration>0){contact=hit;break;}}
     if(contact){const normal=contact.normal.clone().applyQuaternion(this.arena.group.getWorldQuaternion(new THREE.Quaternion()).invert()),speed=Math.max(0,-velocity.dot(normal));samples.push({actor,action:spec.id,part:contact.part,speed,point:contact.point.toArray(),side:contact.side==='L'?-1:contact.side==='R'?1:(this.coaches[other(actor)].root.worldToLocal(contact.point.clone()).x<0?-1:1),hand:side,receiver:other(actor)});}
    }
    this.previous[key]=current;
    if(spec.attack&&spec.phase>.15&&spec.phase<.7&&m.phase==='round'){m.roundStats[actor].control+=dt;m.totals[actor].control+=dt;}
   }
   for(const sample of samples){const event=m.contact(sample);if(event){this.contacts.push({...event,kind:sample.part,impulse:event.severity,closingSpeed:sample.speed});goals[sample.actor][sample.hand]=clamp(.3+event.severity*.45);if(sample.part==='glove')goals[sample.receiver][sample.side<0?'L':'R']=.5;}}
   for(const actor of ['lion','rabbit'])for(const side of ['L','R']){const old=this.compressions[actor][side],goal=goals[actor][side],value=goal>old?goal:old*Math.exp(-dt/ .08);this.compressions[actor][side]=value;this.coaches[actor].deformGlove(side,value);}
   return this.contacts;
  }
  update(time){
   const target=Math.max(0,Math.floor((time+1e-8)*60)),contacts=[];
   if(target<this.tick)return this.arena.metrics;
   while(this.tick<target){contacts.push(...this.step());this.tick++;}
   const m=this.match,snapshot=m.snapshot();
   this.arena.metrics={mode:'fight',fight:snapshot,hero:this.metrics.lion,partner:this.metrics.rabbit,contacts,loads:[]};
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
  if(mode!=='fight'){this.fightView=null;return setTarget.call(this,mode);}
  this.engine.technique='guard';setTarget.call(this,'rabbit');this.mode='fight';this.engine.targetMode='fight';this.engine.technique='fight';this.engine.animTime=0;this.engine.speed=1;this.engine.isPlaying=true;
  this.fightView=new FightArena(this,this.engine.fightOptions||{seed:Date.now()>>>0});this.fitCamera(this.engine.camera);this.fightView.update(0);
 };
 TrainingArena.prototype.update=function(time,technique,combo){return this.mode==='fight'&&this.fightView?this.fightView.update(time):update.call(this,time,technique,combo);};
 TrainingArena.prototype.fitCamera=function(camera){
  if(this.mode!=='fight')return fit.call(this,camera);const fov=THREE.MathUtils.degToRad(camera.fov),distance=Math.max(2.75/(2*Math.tan(fov/2)),3.1/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))+1.1;
  camera.position.set(0,1.52,distance);camera.lookAt(0,1.30,0);
 };
 window.FightArena=FightArena;
})();
