/* Local autonomous bout. Random decisions; only observed contacts earn points. */
(() => {
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),actors=['lion','rabbit'];
 const other=a=>a==='lion'?'rabbit':'lion';
 const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const empty=()=>({thrown:0,landed:0,head:0,body:0,shoulder:0,blocked:0,evaded:0,missed:0,quality:0,power:0,control:0,knockdowns:0});
 const presets={three:{rounds:3,roundSeconds:180,restSeconds:60},club:{rounds:4,roundSeconds:180,restSeconds:60},six:{rounds:6,roundSeconds:180,restSeconds:60},title:{rounds:12,roundSeconds:180,restSeconds:60},exhibition:{rounds:3,roundSeconds:60,restSeconds:15},quick:{rounds:1,roundSeconds:60,restSeconds:0}};
 class BoxingFight {
  constructor({seed=1,preset='club',rounds,roundSeconds,restSeconds}={}){
   this.seed=seed>>>0;this.state=this.seed;this.preset=preset;Object.assign(this,presets[preset]||presets.club);
   if(rounds!=null)this.rounds=rounds;if(roundSeconds!=null)this.roundSeconds=roundSeconds;if(restSeconds!=null)this.restSeconds=restSeconds;
   this.knockdownSeconds=5.6;
   this.time=0;this.phase='intro';this.phaseTime=0;this.round=1;this.roundTime=0;this.eventId=0;this.actionId=0;this.events=[];this.history=[];this.roundStats={lion:empty(),rabbit:empty()};this.totals={lion:empty(),rabbit:empty()};this.seen=new Set();this.result=null;
   this.cards=[{name:'Judge 1',weights:[1,.08,.18,.003],rounds:[]},{name:'Judge 2',weights:[1.04,.16,.09,.002],rounds:[]},{name:'Judge 3',weights:[.98,.05,.25,.005],rounds:[]}];
   this.fighters={};for(const actor of actors)this.fighters[actor]={actor,condition:100,stamina:1,stun:0,down:0,action:null,next:0,skill:.78+this.random()*.18,power:.85+this.random()*.3,tempo:.85+this.random()*.3,reaction:null,damage:{left:0,right:0,body:0}};
   this.order=this.random()<.5?['lion','rabbit']:['rabbit','lion'];
  }
  random(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
  setPlayer(actor){
   actor=actors.includes(actor)?actor:null;if(this.playerActor===actor)return;
   const old=this.playerActor;this.playerActor=actor;this.playerQueue=[];
   if(old)this.fighters[old].next=this.time+.15;
  }
  requestPlayerMove(command){
   const actor=this.playerActor,f=this.fighters[actor];
   if(!f||this.phase!=='round'||this.result||f.down||!moves.concat(['guard','slip','roll','step']).includes(command.move))return false;
   if(!f.action){this.startPlayerMove(command);return true;}
   if(this.playerQueue.length>=2)return false;this.playerQueue.push({...command});return true;
  }
  startPlayerMove(command){
   const actor=this.playerActor,f=this.fighters[actor];
   if(moves.includes(command.move)){
    const action=this.attack(actor,command.move,command.target||'head');if(action)action.input=command.input;
   }else f.action={...command,id:++this.actionId,actor,start:this.time,duration:command.duration||.65,attack:false};
  }
  emit(type,data={}){const event={id:++this.eventId,type,time:this.time,round:this.round,...data};this.events.push(event);if(this.events.length>300)this.events.shift();return event;}
  attack(actor,move,target){
   if(this.phase!=='round'||this.result)return null;
   const f=this.fighters[actor],duration=(move.includes('uppercut')?.98:.85)*(1+(1-f.stamina)*.3)/f.tempo;
   f.action={id:++this.actionId,actor,move,target,start:this.time,duration,attack:true,recorded:false,aim:null};f.stamina=clamp(f.stamina-.045-(move==='jab'?0:.025));
   this.roundStats[actor].thrown++;this.totals[actor].thrown++;this.emit('punch',{actor,move,target,action:f.action.id});
   return f.action;
  }
  decide(actor){
   const f=this.fighters[actor],op=this.fighters[other(actor)],incoming=op.action?.attack&&this.time-op.action.start<op.action.duration*.57;
   if(incoming&&this.random()<f.skill*.72){
    const punch=op.action.move,choice=this.random();let move=choice<.36?'guard':punch.includes('hook')?'roll':punch.includes('uppercut')?'slip':choice<.8?'slip':'guard';
    if(op.action.target==='body'&&move==='roll')move='guard';
    f.action={id:++this.actionId,actor,move,start:this.time,duration:Math.max(.75,op.action.duration-(this.time-op.action.start)+.1),attack:false,defend:true,defenceSide:this.random()<.5?-1:1};
   }else if(!incoming&&this.random()<.22){
    // Read and reset instead of attacking on every decision. Repeated reads
    // and defensive actions are allowed; there is no turn-taking fight clock.
    f.action={id:++this.actionId,actor,move:this.random()<.7?'guard':'step',start:this.time,duration:.20+this.random()*.60,attack:false};
   }else if(f.stamina<.28&&this.random()<.72){f.action={id:++this.actionId,actor,move:'step',start:this.time,duration:1.0,attack:false};}
   else {
    const selection=this.random(),move=selection<.28?'jab':selection<.50?'cross':moves[2+Math.floor(this.random()*4)];
    const target=this.random()<.56?'head':this.random()<.82?'body':'shoulder';this.attack(actor,move,target);
   }
  }
  advance(dt){
   if(!(dt>0))return;this.time+=dt;this.phaseTime+=dt;
   if(this.phase!=='round')this.playerQueue=[];
   for(const a of actors){const f=this.fighters[a];f.stamina=clamp(f.stamina+dt*(this.phase==='rest'?.025:.018));f.stun=Math.max(0,f.stun-dt*2.2);}
   if(this.phase==='intro'){if(this.phaseTime>=3){this.phase='round';this.phaseTime=0;this.emit('bell',{kind:'start'});}return;}
   if(this.phase==='rest'){if(this.phaseTime>=this.restSeconds){this.round++;this.roundTime=0;this.roundStats={lion:empty(),rabbit:empty()};for(const a of actors){this.fighters[a].action=null;this.fighters[a].next=this.time+.15+this.random()*.2;this.fighters[a].condition=Math.min(100,this.fighters[a].condition+4);}this.phase='round';this.phaseTime=0;this.emit('bell',{kind:'start'});}return;}
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
   if(fallen.length){this.downActor=fallen.sort((a,b)=>this.fighters[b].stun-this.fighters[a].stun)[0];for(const actor of fallen)this.fighters[actor].pendingDown=false;const f=this.fighters[this.downActor];f.down=1;for(const actor of actors){this.fighters[actor].action=null;this.fighters[actor].next=this.time+8.2;}this.phase='count';this.phaseTime=0;this.emit('knockdown',{actor:this.downActor});return;}
   this.roundTime+=dt;
   if(this.roundTime>=this.roundSeconds){this.endRound();return;}
   for(const actor of this.order){
    const f=this.fighters[actor];
    if(f.action&&this.time-f.action.start>=f.action.duration+(f.action.contactTime!=null?.045:0)){
     if(f.action.attack&&!f.action.recorded){this.roundStats[actor].missed++;this.totals[actor].missed++;if(f.action.facedDefence){this.roundStats[other(actor)].evaded++;this.totals[other(actor)].evaded++;}this.emit('miss',{actor,action:f.action.id});}
     f.action=null;f.next=this.time+.06+this.random()*.48+(1-f.stamina)*.6;
    }
    if(!f.action&&actor===this.playerActor){if(this.playerQueue.length)this.startPlayerMove(this.playerQueue.shift());}
    else if(!f.action&&this.time>=f.next)this.decide(actor);
   }
  }
  spec(actor){
   const f=this.fighters[actor],a=f.action;
   if(this.phase!=='round'||!a){const idle={move:'guard',phase:.35,attack:false,id:0};if(this.phase==='round'&&actor===this.playerActor)Object.assign(idle,{defend:true,brace:1});return idle;}
   return {...a,phase:clamp((this.time-a.start-(a.contactTime!=null?Math.min(.045,Math.max(0,this.time-a.contactTime)*.70):0))/a.duration),brace:a.move==='guard'?1:0};
  }
  contact({actor,action,part,speed=1,point,side,direction,surfacePoint,surfaceNormal}){
   if(this.phase!=='round')return null;const f=this.fighters[actor],a=f.action,receiver=other(actor),victim=this.fighters[receiver];
   if(!a?.attack||a.id!==action||a.recorded||this.seen.has(action)||!(speed>.12))return null;
   a.recorded=true;a.contactTime=this.time;this.seen.add(action);const stats=this.roundStats[actor],total=this.totals[actor];
   const blocked=part==='glove'||part==='arm',legal=part==='head'||part==='body';
   const quality=clamp(speed/3,.35,1.6)*f.power*(.65+.35*f.stamina);
   if(blocked){this.roundStats[receiver].blocked++;this.totals[receiver].blocked++;}
   else if(legal){for(const s of [stats,total]){s.landed++;s[part]++;s.quality+=quality;s.power+=quality*quality;}}
   else if(part==='shoulder'){stats.shoulder++;total.shoulder++;}
   const severity=quality*(blocked?.14:part==='shoulder'?.30:1);
   victim.reaction={time:this.time,part:part==='glove'?'guard':part,severity,side:side||1,move:a.move,surfacePoint,surfaceNormal,direction:direction||[0,a.move.includes('uppercut')?.8:0,-1]};
   if(legal){const zone=part==='body'?'body':(side||1)<0?'left':'right';victim.damage[zone]+=severity;victim.condition=Math.max(0,victim.condition-severity*(this.preset==='quick'?(part==='head'?12:9):(part==='head'?3:2.2)));victim.stamina=clamp(victim.stamina-severity*.025);victim.stun+=severity*(part==='head'?5:3);f.stamina=clamp(f.stamina+.012);}
   const event=this.emit('contact',{actor,receiver,action,part,legal,blocked,speed,quality,severity,point,move:a.move,direction});
   if(legal&&victim.stun>18){if(!victim.pendingDown){victim.pendingDown=true;this.roundStats[receiver].knockdowns++;this.totals[receiver].knockdowns++;}}
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
  endRound(){this.scoreRound();if(this.round<this.rounds)this.emit('bell',{kind:'end'});for(const a of actors)this.fighters[a].action=null;
   if(this.round>=this.rounds){if(this.preset==='quick'){const delta=this.fighters.lion.condition-this.fighters.rabbit.condition;this.finish(Math.abs(delta)<=2?null:delta>0?'lion':'rabbit','health',false);}else this.finish(null,'points',false);}else {this.phase='rest';this.phaseTime=0;}}
  finish(winner,method='points',scorePartial=true){
   if(this.result)return;if(scorePartial&&this.roundStats.lion.thrown+this.roundStats.rabbit.thrown>0)this.scoreRound();
   const cards=this.cards.map(c=>({name:c.name,totals:c.rounds.reduce((t,r)=>[t[0]+r.scores[0],t[1]+r.scores[1]],[0,0]),rounds:c.rounds}));
   const votes=cards.map(c=>c.totals[0]===c.totals[1]?null:c.totals[0]>c.totals[1]?'lion':'rabbit');
   if(method==='points'){const l=votes.filter(v=>v==='lion').length,r=votes.filter(v=>v==='rabbit').length;winner=l>=2?'lion':r>=2?'rabbit':null;}
   this.result={winner,stoppage:method,method:winner?method:'draw',decision:method!=='points'?method:!winner?'draw':votes.every(v=>v===winner)?'unanimous':votes.includes(null)?'majority':'split',cards,votes,totals:JSON.parse(JSON.stringify(this.totals))};
   this.phase=this.preset==='quick'?'ceremony':'scoring';this.phaseTime=0;for(const a of actors)this.fighters[a].action=null;this.emit('final-bell',{result:this.result});if(this.preset==='quick')this.emit('announcement',{result:this.result});
  }
  snapshot(){return {phase:this.phase,round:this.round,rounds:this.rounds,remaining:Math.max(0,this.roundSeconds-this.roundTime),restRemaining:Math.max(0,this.restSeconds-this.phaseTime),count:this.phase==='count'?Math.min(8,Math.floor(this.phaseTime/(this.knockdownSeconds/8))+1):0,cardsShown:this.phase==='scoring'?(this.phaseTime<1?0:Math.min(3,Math.floor((this.phaseTime-1)/2.5)+1)):this.phase==='ceremony'?3:0,health:{lion:this.fighters.lion.condition,rabbit:this.fighters.rabbit.condition},result:this.result,totals:this.totals};}
 }
 BoxingFight.presets=presets;window.BoxingFight=BoxingFight;
})();
