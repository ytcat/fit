/* Local autonomous bout. Random decisions; only observed contacts earn points. */
(() => {
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),actors=['lion','rabbit'];
 const other=a=>a==='lion'?'rabbit':'lion';
 const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 // Short tactical phrases permit defensive reads between strikes. Targets are
 // authored independently of contacts; scoring still requires observed hits.
 const tactics={
  pressure:[[['jab','head'],['cross','body'],['hook','head']], [['jab','head'],['jab','head'],['rear_uppercut','body'],['hook','head']], [['uppercut','body'],['rear_hook','head'],['hook','head']]],
  outside:[[['jab','head'],['cross','head'],['step']], [['jab','head'],['jab','body'],['cross','head'],['step']], [['jab','body'],['cross','head'],['slip']]],
  counter:[[['slip'],['cross','head'],['hook','body']], [['roll'],['rear_uppercut','head'],['hook','head'],['step']], [['jab','head'],['roll'],['cross','body'],['hook','head']]],
  angle:[[['step'],['jab','head'],['cross','body'],['hook','head']], [['jab','body'],['rear_uppercut','head'],['hook','head'],['step']], [['cross','head'],['hook','body'],['slip'],['cross','head']]]
 };
 const empty=()=>({thrown:0,landed:0,head:0,body:0,shoulder:0,blocked:0,evaded:0,missed:0,quality:0,power:0,control:0,knockdowns:0});
 // GOTR-0005 Burst: one short, faster run of the fighter's own punches (Super burst without its roll),
 // ordered once the meter is full and started only at an action boundary. Charge comes from observed
 // clean hits, successful defences and slow round time, and is empty at every bell. There is no damage
 // multiplier: faster gloves score through the normal contact solver, and the burst ends in a committed
 // recovery step during which the fighter cannot defend and the opponent does not pause to reset.
 const burst={sequence:[['jab','head'],['cross','head'],['hook','body'],['rear_uppercut','head'],['hook','head']],tempo:.76,perSecond:.11,hit:.25,defence:.17,recover:.7,stamina:.08,durations:{jab:.64,cross:.70,hook:.78,rear_hook:.78,uppercut:.84,rear_uppercut:.84}};
 // GOTR-0088 Finisher "Sunday Punch": one dipping, rising rear Uppercut under the chin, available when the Opponent is hurt
 // (health under `hurt`) AND the fighter's Burst meter is full. Pressing it spends the whole Burst at once (a miss or a block
 // wastes it). A clean head contact knocks the Opponent out cold: KO, no count. Owned per actor (options.finishers), so a
 // boss can be given its own finisher later through the same requestFinisher(actor) hook. `hold` = game seconds the result
 // waits (phase clock frozen) after the knockout so the fall plays out before the cards/ceremony; `duration` = the move.
 const finishers={sunday_punch:{id:'sunday_punch',move:'rear_uppercut',target:'head',hurt:25,duration:1.32,hold:3.0,stamina:.10,read:.30}};
 const presets={three:{rounds:3,roundSeconds:20,restSeconds:10},club:{rounds:2,roundSeconds:20,restSeconds:10},six:{rounds:1,roundSeconds:40,restSeconds:10},title:{rounds:1,roundSeconds:60,restSeconds:10},exhibition:{rounds:2,roundSeconds:20,restSeconds:10},quick:{rounds:1,roundSeconds:20,restSeconds:0}};
 class BoxingFight {
  constructor({seed=1,preset='club',rounds,roundSeconds,restSeconds,careerStats,careerActor,adventureEdge,finishers:owned}={}){
   this.seed=seed>>>0;this.state=this.seed;this.preset=preset;Object.assign(this,presets[preset]||presets.club);
   if(rounds!=null)this.rounds=rounds;if(roundSeconds!=null)this.roundSeconds=roundSeconds;if(restSeconds!=null)this.restSeconds=restSeconds;
   this.knockdownSeconds=5.6;
   this.time=0;this.phase='intro';this.phaseTime=0;this.round=1;this.roundTime=0;this.eventId=0;this.actionId=0;this.events=[];this.history=[];this.roundStats={lion:empty(),rabbit:empty()};this.totals={lion:empty(),rabbit:empty()};this.seen=new Set();this.result=null;
   this.cards=[{name:'Judge 1',weights:[1,.08,.18,.003],rounds:[]},{name:'Judge 2',weights:[1.04,.16,.09,.002],rounds:[]},{name:'Judge 3',weights:[.98,.05,.25,.005],rounds:[]}];
   this.fighters={};for(const actor of actors)this.fighters[actor]={actor,condition:100,stamina:1,stun:0,down:0,action:null,next:0,plan:[],tactic:actor==='lion'?'pressure':'outside',skill:.78+this.random()*.18,power:.85+this.random()*.3,tempo:.85+this.random()*.3,reaction:null,damage:{left:0,right:0,body:0}};
   if(actors.includes(careerActor)&&careerStats){const f=this.fighters[careerActor],n=k=>clamp((Number(careerStats[k]||20)-20)/79);f.power*=1+n('power')*.55;f.tempo*=1+n('speed')*.38;f.skill=Math.min(.99,f.skill+n('defence')*.18);f.footwork=1+n('footwork')*.40;f.recovery=1+n('stamina')*.65;f.economy=1-n('stamina')*.28;f.accuracy=n('accuracy');
    // Adventure stat edge (Power/Speed/Stamina). Multipliers are 1 without an adventure profile.
    const edge=n=>Number.isFinite(adventureEdge?.[n])&&adventureEdge[n]>0?Math.min(1.5,adventureEdge[n]):1;f.power*=edge('impact');f.tempo*=edge('speed');f.recovery*=edge('stamina');}
   this.order=this.random()<.5?['lion','rabbit']:['rabbit','lion'];
   for(const a of actors)this.fighters[a].burst={charge:0,order:null,run:null,open:0,used:0};
   // Owned finishers per actor: {lion:['sunday_punch']} or an array for the player's career actor.
   const own=options=>Array.isArray(options)?{[careerActor||'lion']:options}:options||{};this.finisherOwned=own(owned);
   for(const a of actors)this.fighters[a].finisher={order:null,used:0,spent:0};
  }
  random(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
  setPlayer(actor){
   actor=actors.includes(actor)?actor:null;if(this.playerActor===actor)return;
   const old=this.playerActor;this.playerActor=actor;if(actor)this.fighters[actor].plan=[];this.playerQueue=[];this.playerCombo=null;this.pendingPlayerCombo=null;
   if(old)this.fighters[old].next=this.time+.15;
  }
  requestPlayerMove(command){
   const actor=this.playerActor,f=this.fighters[actor];
   if(!f||this.phase!=='round'||this.result||f.down||f.burst.order||f.burst.run||f.finisher.order||f.action?.finisher||!moves.concat(['guard','slip','roll','step']).includes(command.move))return false;
   this.pendingPlayerCombo=null;if(this.playerCombo){this.playerCombo=null;this.playerQueue=[];}
   if(!f.action){this.startPlayerMove(command);return true;}
   if(this.playerQueue.length>=2)return false;this.playerQueue.push({...command});return true;
  }
  requestPlayerCombo(commands,id){
   const f=this.fighters[this.playerActor];
   if(!f||this.phase!=='round'||this.result||f.down||f.burst.order||f.burst.run||f.finisher.order||f.action?.finisher||this.pendingPlayerCombo||!commands.length||commands.length>8||commands.some(c=>!moves.concat(['guard','slip','roll','step']).includes(c.move)||!(c.duration>=.25&&c.duration<=1.3)))return false;
   if(this.playerCombo||this.playerQueue.length||f.action&&(f.action.move!=='guard'||f.action.guardStyle&&f.action.guardStyle!=='high')){this.pendingPlayerCombo={id,commands:commands.map(c=>({...c}))};return true;}
   this.playerCombo={id,step:1,total:commands.length};this.playerQueue=commands.map(c=>({...c}));f.action=null;this.startPlayerMove(this.playerQueue.shift());return true;
  }
  startPlayerMove(command){
   const actor=this.playerActor,f=this.fighters[actor];
   if(moves.includes(command.move)){
    const action=this.attack(actor,command.move,command.target||'head');if(action){action.input=command.input;action.combo=command.combo;if(command.combo)action.duration=command.duration*(1+(1-f.stamina)*.3)/f.tempo;}
   }else f.action={...command,id:++this.actionId,actor,start:this.time,duration:(command.duration||.65)/(command.move==='step'?(f.footwork||1):1),attack:false};
   if(command.combo&&this.playerCombo)this.playerCombo.step=command.combo.step;
  }
  // Why Burst is unavailable, or ready / ordered / running, for one fighter.
  burstState(actor){
   const f=this.fighters[actor];if(!f)return null;const b=f.burst;
   const status=this.result||this.phase==='rest'||this.phase==='scoring'||this.phase==='ceremony'?'over':this.phase==='intro'?'bell':this.phase==='count'||f.down?'down':b.run?'active':b.order?'queued':this.time<b.open?'recover':b.charge>=1?'ready':'charging';
   return {status,charge:b.charge,step:b.run?b.run.index:0,total:burst.sequence.length,used:b.used,final:!!this.result||this.round>=this.rounds};
  }
  // One order per full meter, in Play (the player's fighter) and Watch (the AI fighter) alike.
  requestBurst(actor){
   const f=this.fighters[actor];if(!f||this.burstState(actor).status!=='ready')return false;
   f.burst.order={time:this.time,player:actor===this.playerActor};if(actor===this.playerActor){this.playerQueue=[];this.pendingPlayerCombo=null;}
   this.emit('burst-order',{actor,player:actor===this.playerActor});return true;
  }
  // GOTR-0088: why the Finisher is unavailable, or 'ready' / 'queued' / 'active' (the move in the air) for one fighter.
  finisherState(actor,id){
   const f=this.fighters[actor];if(!f)return null;const ids=(this.finisherOwned[actor]||[]).filter(k=>finishers[k]);id=id&&ids.includes(id)?id:ids[0];
   if(!id)return {status:'none',id:null};const spec=finishers[id],op=this.fighters[other(actor)],b=f.burst;
   const status=this.result||this.phase!=='round'&&this.phase!=='count'?'over':this.phase==='count'||f.down||op.down?'down':f.finisher.order?'queued':f.action?.finisher?'active':b.run||b.order?'busy':this.time<b.open?'recover':b.charge<1?'charging':op.condition>=spec.hurt?'healthy':'ready';
   return {status,id,charge:b.charge,hurt:op.condition<spec.hurt,threshold:spec.hurt,used:f.finisher.used};
  }
  // One press: spends the full Burst at once and throws the finisher at the next action boundary (now, if the fighter is free).
  requestFinisher(actor,id){
   const state=this.finisherState(actor,id);if(state?.status!=='ready')return false;const f=this.fighters[actor],b=f.burst;
   b.charge=0;b.used++;f.finisher.used++;f.finisher.order={id:state.id,time:this.time};f.plan=[];
   if(actor===this.playerActor){this.playerQueue=[];this.playerCombo=null;this.pendingPlayerCombo=null;}
   this.emit('finisher-order',{actor,id:state.id,player:actor===this.playerActor});
   if(!f.action||!f.action.attack&&!f.action.burstRecover)this.finisherStep(actor);
   return true;
  }
  finisherStep(actor){
   const f=this.fighters[actor],order=f.finisher.order;if(!order||this.phase!=='round'||this.result||f.down)return false;
   const spec=finishers[order.id];f.finisher.order=null;f.action=null;
   const a=this.attack(actor,spec.move,spec.target);if(!a)return false;
   // A deeper dip and a longer leg drive than the normal Uppercut; tempo and stamina still matter a little.
   a.finisher=spec.id;a.input='finisher';a.duration=spec.duration*(1+(1-f.stamina)*.15)/Math.sqrt(f.tempo);f.stamina=clamp(f.stamina-spec.stamina);
   this.emit('finisher-start',{actor,id:spec.id,action:a.id,player:actor===this.playerActor});return true;
  }
  // True while a finisher knockout is still playing out (the result waits; the phase clock is frozen).
  finisherHold(){const r=this.result;return !!(r?.finisher&&!r.finisherSkipped&&this.time-r.finisherTime<finishers[r.finisher].hold);}
  skipFinisher(){if(this.result?.finisher)this.result.finisherSkipped=true;}
  chargeBurst(actor,amount){const b=this.fighters[actor].burst;if(this.phase==='round'&&!this.result&&!b.order&&!b.run&&!(this.time<b.open))b.charge=clamp(b.charge+amount);}
  stopBurst(actor){const b=this.fighters[actor].burst;this.fighters[actor].finisher.order=null;if(b.order||b.run)this.emit('burst-cancel',{actor,started:!!b.run});b.order=null;b.run=null;b.open=0;}
  bellStart(){for(const a of actors){this.stopBurst(a);this.fighters[a].burst.charge=0;}this.emit('bell',{kind:'start'});}
  // Called only at an action boundary: no action in progress, the round live and nobody down.
  burstStep(actor){
   const f=this.fighters[actor],b=f.burst;
   if(f.action||f.down||this.phase!=='round'||this.result||!b.run&&!b.order)return false;
   if(!b.run){b.order=null;b.charge=0;b.used++;f.plan=[];if(actor===this.playerActor){this.playerQueue=[];this.playerCombo=null;this.pendingPlayerCombo=null;}b.run={index:0,start:this.time};this.emit('burst-start',{actor,player:actor===this.playerActor,previous:f.last||null});}
   if(b.run.index<burst.sequence.length){
    const [move,target]=burst.sequence[b.run.index++],a=this.attack(actor,move,target);
    if(a){a.input=move;a.burst=b.run.index;a.duration=(window.BoxingInput?.durations?.[move]||burst.durations[move])*burst.tempo*(1+(1-f.stamina)*.3)/f.tempo;}
    return true;
   }
   b.run=null;b.open=this.time+burst.recover;f.stamina=clamp(f.stamina-burst.stamina);
   f.action={id:++this.actionId,actor,move:'step',start:this.time,duration:burst.recover,attack:false,stepAdvance:.25,burstRecover:true};this.emit('burst-end',{actor});return true;
  }
  emit(type,data={}){const event={id:++this.eventId,type,time:this.time,round:this.round,...data};this.events.push(event);if(this.events.length>300)this.events.shift();return event;}
  attack(actor,move,target){
   if(this.phase!=='round'||this.result)return null;
   const f=this.fighters[actor],duration=(move.includes('uppercut')?.98:.85)*(1+(1-f.stamina)*.3)/f.tempo;
   f.action={id:++this.actionId,actor,move,target,start:this.time,duration,attack:true,recorded:false,aim:null};f.stamina=clamp(f.stamina-(.045+(move==='jab'?0:.025))*(f.economy||1));
   this.roundStats[actor].thrown++;this.totals[actor].thrown++;this.emit('punch',{actor,move,target,action:f.action.id});
   return f.action;
  }
  decide(actor){
   const f=this.fighters[actor],op=this.fighters[other(actor)],incoming=op.action?.attack&&this.time-op.action.start<op.action.duration*.57;
   if(incoming&&this.random()<f.skill*.72*(op.action.finisher?finishers[op.action.finisher].read:1)){
    const punch=op.action.move,choice=this.random();let move=choice<.36?'guard':punch.includes('hook')?'roll':punch.includes('uppercut')?'slip':choice<.8?'slip':'guard';
    if(op.action.target==='body'&&move==='roll')move='guard';
    const guardStyle=op.action.target==='body'?'body':punch==='hook'?'right':punch==='rear_hook'?'left':punch.includes('uppercut')?'high':'parry';
    f.action={id:++this.actionId,actor,move,guardStyle:move==='guard'?guardStyle:undefined,start:this.time,duration:Math.max(.75,op.action.duration-(this.time-op.action.start)+.1),attack:false,defend:true,defenceSide:this.random()<.5?-1:1};
   }else if(!incoming&&!(this.time<op.burst.open)&&this.random()<.22){
    // Read and reset instead of attacking on every decision. Repeated reads
    // and defensive actions are allowed; there is no turn-taking fight clock.
    f.action={id:++this.actionId,actor,move:this.random()<.7?'guard':'step',start:this.time,duration:.20+this.random()*.60,attack:false};
   }else if(f.stamina<.28&&this.random()<.72){f.action={id:++this.actionId,actor,move:'step',start:this.time,duration:1.0,attack:false};}
   else {
    if(!f.plan.length){
     const styles=['pressure','outside','counter','angle'],index=actors.indexOf(actor);
     f.tactic=f.stamina<.42||f.condition<32?'outside':f.cupTactic||styles[(Math.floor(this.roundTime/(6.5+index*1.3))+index+this.round)%styles.length];
     const library=tactics[f.tactic],selection=Math.floor(this.random()*library.length);
     f.plan=library[selection].map(([move,target])=>({move,target}));
     this.emit('combination',{actor,tactic:f.tactic,length:f.plan.length});
    }
    const next=f.plan.shift();
    if(moves.includes(next.move))this.attack(actor,next.move,next.target);
    else f.action={id:++this.actionId,actor,move:next.move,start:this.time,duration:.45+this.random()*.28,attack:false,defend:next.move!=='step',defenceSide:this.random()<.5?-1:1,stepDirection:this.random()<.5?-1:1,stepAdvance:f.tactic==='outside'?-.35:.25};
   }
  }
  advance(dt){
   if(!(dt>0))return;this.time+=dt;if(!this.finisherHold())this.phaseTime+=dt;
   if(this.phase!=='round'){this.playerQueue=[];this.playerCombo=null;this.pendingPlayerCombo=null;}
   for(const a of actors){const f=this.fighters[a];f.stamina=clamp(f.stamina+dt*(this.phase==='rest'?.025:.018)*(f.recovery||1));f.stun=Math.max(0,f.stun-dt*2.2);}
   if(this.phase==='intro'){if(this.phaseTime>=3){this.phase='round';this.phaseTime=0;this.bellStart();}return;}
   if(this.phase==='rest'){if(this.phaseTime>=this.restSeconds){this.round++;this.roundTime=0;this.roundStats={lion:empty(),rabbit:empty()};for(const a of actors){this.fighters[a].action=null;this.fighters[a].plan=[];this.fighters[a].next=this.time+.15+this.random()*.2;this.fighters[a].condition=Math.min(100,this.fighters[a].condition+4);}this.phase='round';this.phaseTime=0;this.bellStart();}return;}
   if(this.phase==='scoring'){if(this.phaseTime>=10){this.phase='ceremony';this.phaseTime=0;this.emit('announcement',{result:this.result});}return;}
   if(this.phase==='ceremony')return;
   if(this.phase==='count'){
    this.roundTime+=dt;
    if(this.phaseTime>=this.knockdownSeconds){const f=this.fighters[this.downActor];f.down=0;f.stun=0;f.action=null;f.next=this.time+.25;this.fighters[other(this.downActor)].next=this.time+.45;
     if(f.condition<8)this.finish(other(this.downActor),'TKO');else {this.phase='round';this.phaseTime=0;if(this.roundTime>=this.roundSeconds)this.endRound();}}
    return;
   }
   const stopped=actors.filter(a=>this.fighters[a].condition<=0);if(stopped.length){for(const actor of stopped)this.fighters[actor].down=1;this.finish(stopped.length===1?other(stopped[0]):null,'KO');return;}
   const fallen=actors.filter(a=>this.fighters[a].pendingDown);
   if(fallen.length){this.downActor=fallen.sort((a,b)=>this.fighters[b].stun-this.fighters[a].stun)[0];for(const actor of fallen)this.fighters[actor].pendingDown=false;const f=this.fighters[this.downActor];f.down=1;for(const actor of actors){this.fighters[actor].action=null;this.fighters[actor].plan=[];this.fighters[actor].next=this.time+8.2;this.stopBurst(actor);}this.phase='count';this.phaseTime=0;this.emit('knockdown',{actor:this.downActor});return;}
   this.roundTime+=dt;
   if(this.roundTime>=this.roundSeconds){this.endRound();return;}
   for(const a of actors)this.chargeBurst(a,dt*burst.perSecond);
   for(const actor of this.order){
    const f=this.fighters[actor];
    if(f.action&&this.time-f.action.start>=f.action.duration+(f.action.contactTime!=null?.045:0)){
     if(f.action.finisher&&!f.action.recorded)this.emit('finisher-miss',{actor,receiver:other(actor),id:f.action.finisher,blocked:false});
     if(f.action.attack&&!f.action.recorded){this.roundStats[actor].missed++;this.totals[actor].missed++;if(f.action.facedDefence){this.roundStats[other(actor)].evaded++;this.totals[other(actor)].evaded++;this.chargeBurst(other(actor),burst.defence);}this.emit('miss',{actor,action:f.action.id});}
     f.last={move:f.action.move,start:f.action.start,end:this.time,attack:!!f.action.attack,burst:f.action.burst||0};f.action=null;f.next=this.time+(f.plan.length&&f.stamina>.30?.045+this.random()*.12:.10+this.random()*.52+(1-f.stamina)*.6)/(f.footwork||1);
    }
    if(!f.action&&f.finisher.order&&this.finisherStep(actor))continue;
    if(!f.action&&this.burstStep(actor))continue;
    if(!f.action&&actor===this.playerActor){if(this.playerQueue.length)this.startPlayerMove(this.playerQueue.shift());else if(this.pendingPlayerCombo){const next=this.pendingPlayerCombo;this.pendingPlayerCombo=null;this.playerCombo={id:next.id,step:1,total:next.commands.length};this.playerQueue=next.commands;this.startPlayerMove(this.playerQueue.shift());}else this.playerCombo=null;}
    else if(!f.action&&this.time>=f.next)this.decide(actor);
   }
  }
  spec(actor){
   const f=this.fighters[actor],a=f.action;
   if(this.phase!=='round'||!a){const idle={move:'guard',phase:.35,attack:false,id:0,brace:1};if(this.phase==='round'&&actor===this.playerActor)Object.assign(idle,{defend:true,brace:1});return idle;}
   return {...a,phase:clamp((this.time-a.start-(a.contactTime!=null?Math.min(.045,Math.max(0,this.time-a.contactTime)*.70):0))/a.duration),brace:a.move==='guard'?1:0};
  }
  contact({actor,action,part,speed=1,point,side,direction,surfacePoint,surfaceNormal}){
   if(this.phase!=='round')return null;const f=this.fighters[actor],a=f.action,receiver=other(actor),victim=this.fighters[receiver];
   if(!a?.attack||a.id!==action||a.recorded||this.seen.has(action)||!(speed>.12))return null;
   a.recorded=true;a.contactTime=this.time;this.seen.add(action);const stats=this.roundStats[actor],total=this.totals[actor];
   const blocked=part==='glove'||part==='arm',legal=part==='head'||part==='body';
   const quality=clamp(speed/3,.35,1.6)*f.power*(.65+.35*f.stamina);
   if(blocked){this.roundStats[receiver].blocked++;this.totals[receiver].blocked++;this.chargeBurst(receiver,burst.defence);}
   else if(legal){for(const s of [stats,total]){s.landed++;s[part]++;s.quality+=quality;s.power+=quality*quality;}this.chargeBurst(actor,burst.hit);}
   else if(part==='shoulder'){stats.shoulder++;total.shoulder++;}
   const severity=quality*(blocked?.14:part==='shoulder'?.30:1);
   victim.reaction={time:this.time,part:part==='glove'?'guard':part,severity,side:side||1,move:a.move,surfacePoint,surfaceNormal,direction:direction||[0,a.move.includes('uppercut')?.8:0,-1]};
   if(legal){const zone=part==='body'?'body':(side||1)<0?'left':'right';victim.damage[zone]+=severity;victim.condition=Math.max(0,victim.condition-severity*(this.preset==='quick'?(part==='head'?12:9):(part==='head'?3:2.2)));victim.stamina=clamp(victim.stamina-severity*.025);victim.stun+=severity*(part==='head'?5:3);f.stamina=clamp(f.stamina+.012);}
   const event=this.emit('contact',{actor,receiver,action,part,legal,blocked,speed,quality,severity,point,move:a.move,direction});
   // GOTR-0088: the finisher landing clean on the head knocks the Opponent out cold (no count). Glove/arm = blocked: Burst is gone.
   if(a.finisher){event.finisher=a.finisher;if(legal&&part==='head'){victim.condition=0;victim.stun=40;this.finisherKO={actor,receiver,id:a.finisher,time:this.time,action:{...a},point,direction};this.emit('finisher-ko',{actor,receiver,id:a.finisher});}else this.emit('finisher-miss',{actor,receiver,id:a.finisher,blocked});}
   if(legal&&victim.stun>18&&!a.finisher){if(!victim.pendingDown){victim.pendingDown=true;this.roundStats[receiver].knockdowns++;this.totals[receiver].knockdowns++;}}
   return event;
  }
  measure(stats,weights){const [clean,power,defence,control]=weights;return stats.quality*clean+stats.power*power+(stats.blocked+stats.evaded)*defence+stats.control*control;}
  scoreRound(){
   const stats=JSON.parse(JSON.stringify(this.roundStats));
   for(const card of this.cards){const l=this.measure(stats.lion,card.weights)-stats.lion.knockdowns*3,r=this.measure(stats.rabbit,card.weights)-stats.rabbit.knockdowns*3,difference=l-r;let scores=[10,10];
    if(Math.abs(difference)>1e-8){const winner=difference>0?0:1,loser=1-winner,dominance=Math.abs(difference)/Math.max(1,l+r);scores[loser]=dominance>.65&&Math.abs(difference)>7?8:9;scores[loser]=Math.max(7,scores[loser]-Math.max(0,stats[actors[loser]].knockdowns-stats[actors[winner]].knockdowns));}
    card.rounds.push({round:this.round,scores,stats,merit:[l,r]});
   }
   this.history.push({round:this.round,stats});
  }
  endRound(){this.scoreRound();if(this.round<this.rounds)this.emit('bell',{kind:'end'});for(const a of actors){this.fighters[a].action=null;this.stopBurst(a);}
   if(this.round>=this.rounds){if(this.preset==='quick'){const delta=this.fighters.lion.condition-this.fighters.rabbit.condition;this.finish(Math.abs(delta)<=2?null:delta>0?'lion':'rabbit','health',false);}else this.finish(null,'points',false);}else {this.phase='rest';this.phaseTime=0;}}
  finish(winner,method='points',scorePartial=true){
   if(this.result)return;if(scorePartial&&this.roundStats.lion.thrown+this.roundStats.rabbit.thrown>0)this.scoreRound();
   const cards=this.cards.map(c=>({name:c.name,totals:c.rounds.reduce((t,r)=>[t[0]+r.scores[0],t[1]+r.scores[1]],[0,0]),rounds:c.rounds}));
   const votes=cards.map(c=>c.totals[0]===c.totals[1]?null:c.totals[0]>c.totals[1]?'lion':'rabbit');
   if(method==='points'){const l=votes.filter(v=>v==='lion').length,r=votes.filter(v=>v==='rabbit').length;winner=l>=2?'lion':r>=2?'rabbit':null;}
   this.result={winner,stoppage:method,method:winner?method:'draw',decision:method!=='points'?method:!winner?'draw':votes.every(v=>v===winner)?'unanimous':votes.includes(null)?'majority':'split',cards,votes,totals:JSON.parse(JSON.stringify(this.totals))};
   const ko=this.finisherKO;if(ko&&method==='KO'&&winner===ko.actor){this.result.finisher=ko.id;this.result.finisherTime=ko.time;this.result.finisherActor=ko.actor;this.result.finisherAction=ko.action;}
   this.phase=this.preset==='quick'?'ceremony':'scoring';this.phaseTime=0;for(const a of actors){this.fighters[a].action=null;this.stopBurst(a);}this.emit('final-bell',{result:this.result});if(this.preset==='quick')this.emit('announcement',{result:this.result});
  }
  snapshot(){return {finisher:this.result?.finisher?{id:this.result.finisher,hold:this.finisherHold()}:null,phase:this.phase,round:this.round,rounds:this.rounds,remaining:Math.max(0,this.roundSeconds-this.roundTime),restRemaining:Math.max(0,this.restSeconds-this.phaseTime),count:this.phase==='count'?Math.min(8,Math.floor(this.phaseTime/(this.knockdownSeconds/8))+1):0,cardsShown:this.phase==='scoring'?(this.phaseTime<1?0:Math.min(3,Math.floor((this.phaseTime-1)/2.5)+1)):this.phase==='ceremony'?3:0,health:{lion:this.fighters.lion.condition,rabbit:this.fighters.rabbit.condition},result:this.result,totals:this.totals};}
 }
 BoxingFight.presets=presets;BoxingFight.burst=burst;BoxingFight.finishers=finishers;window.BoxingFight=BoxingFight;
})();
