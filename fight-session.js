/* Three-judge exhibition bout. Scores are derived only from observed contacts. */
(() => {
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const actors=['lion','rabbit'],other=a=>a==='lion'?'rabbit':'lion';
 const fresh=()=>({attempts:0,head:0,body:0,blocked:0,shoulder:0,quality:0,power:0});
 class FightSession {
  constructor(seed=1,config={}){
   this.seed=seed>>>0;this.rng=this.seed;this.rounds=config.rounds??3;this.roundSeconds=config.roundSeconds??180;this.restSeconds=config.restSeconds??60;
   this.cards=[[],[],[]];this.stats={lion:fresh(),rabbit:fresh()};this.total={lion:fresh(),rabbit:fresh()};
   this.stamina={lion:1,rabbit:1};this.reactions={lion:[],rabbit:[]};this.events=[];this.seen=new Set();this.index=0;this.lastTime=0;
   this.phase='countdown';this.round=1;this.phaseStart=0;this.phaseEnd=3;this.exchange=null;this.winner=null;this.decision=null;
   this.skill={lion:.85+this.random()*.3,rabbit:.85+this.random()*.3};
  }
  random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
  scoreRound(){
   // Fixed judges weigh quality, clean volume and effective power differently.
   // A blocked glove or shoulder strike never becomes a scoring blow.
   const weights=[[1,.22,.15],[1,.35,.08],[1,.12,.28]];
   weights.forEach((w,j)=>{
    const value=a=>{const s=this.stats[a];return s.quality*w[0]+(s.head+s.body)*w[1]+s.power*w[2];};
    const l=value('lion'),r=value('rabbit'),gap=Math.abs(l-r),ratio=gap/Math.max(1,l+r);
    const loser=ratio>.62&&gap>8?8:9;
    this.cards[j].push({round:this.round,lion:gap<1e-8?10:l>r?10:loser,rabbit:gap<1e-8?10:r>l?10:loser,stats:JSON.parse(JSON.stringify(this.stats))});
   });
   this.stats={lion:fresh(),rabbit:fresh()};
  }
  finish(){
   const votes={lion:0,rabbit:0};
   this.totals=this.cards.map(card=>card.reduce((s,r)=>({lion:s.lion+r.lion,rabbit:s.rabbit+r.rabbit}),{lion:0,rabbit:0}));
   this.totals.forEach(s=>{if(s.lion!==s.rabbit)votes[s.lion>s.rabbit?'lion':'rabbit']++;});
   this.winner=votes.lion>votes.rabbit?'lion':votes.rabbit>votes.lion?'rabbit':null;
   this.decision=this.winner?(votes[this.winner]===3?'unanimous':votes[other(this.winner)]?'split':'majority'):'draw';
  }
  advance(time){
   if(time<this.lastTime-1e-8)throw new Error('Start a new FightSession before rewinding');
   while(time>=this.phaseEnd){
    const at=this.phaseEnd;
    if(this.phase==='countdown'||this.phase==='rest'){
     if(this.phase==='rest')this.round++;
     this.phase='round';this.phaseEnd=at+this.roundSeconds;this.exchange=null;this.events.push({type:'bell',time:at});
    }else if(this.phase==='round'){
     this.scoreRound();this.exchange=null;this.events.push({type:'bell',time:at});
     if(this.round===this.rounds){this.finish();this.phase='decision';this.phaseEnd=at+8;}
     else {this.phase='rest';this.phaseEnd=at+this.restSeconds;}
    }else if(this.phase==='decision'){
     this.phase='ceremony';this.phaseEnd=Infinity;this.events.push({type:'applause',time:at});
    }else break;
    this.phaseStart=at;
   }
   const dt=clamp(time-this.lastTime,0,.1);this.lastTime=time;
   for(const a of actors)this.stamina[a]=clamp(this.stamina[a]+dt*(this.phase==='rest'?.010:.0012),.22,1);
  }
  nextExchange(time){
   const probability=clamp(.5+(this.stamina.lion-this.stamina.rabbit)*.15,.35,.65),attacker=this.random()<probability?'lion':'rabbit';
   const moves=['jab','jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
   const move=moves[Math.floor(this.random()*moves.length)],target=this.random()<.31?'body':this.random()<.12?'shoulder':'head';
   const defend=this.random(),defence=defend<.29?'guard':defend<.60?(move.includes('hook')?'roll':'slip'):'open';
   const duration=(move.includes('uppercut')?1.27:1.08)+(1-this.stamina[attacker])*.30+this.random()*.18;
   const accuracy=(this.random()-.5)*.13/this.skill[attacker];
   this.exchange={start:time,end:Math.min(this.phaseEnd,time+duration),duration,attacker,move,target,defence,accuracy,index:this.index++};
   this.stamina[attacker]=Math.max(.22,this.stamina[attacker]-.012);
   for(const s of [this.stats,this.total])s[attacker].attempts++;
  }
  frame(time){
   this.advance(time);
   const neutral={move:'guard',phase:(time%1.22)/1.22,attack:false};
   if(this.phase!=='round')return {index:-1,phase:0,lion:{...neutral},rabbit:{...neutral},phaseName:this.phase};
   if(!this.exchange||time>=this.exchange.end)this.nextExchange(time);
   const x=this.exchange,p=clamp((time-x.start)/x.duration,0,.999999);
   const attack={move:x.move,phase:p,attack:true,target:x.target,accuracy:x.accuracy};
   let defence={move:x.defence==='open'?'guard':x.defence,phase:p,attack:false,defend:x.defence!=='open',brace:x.defence==='guard'?1:0,defenceSide:x.index%2?1:-1};
   if(x.defence==='roll')defence=BOXING_ROUTINES.opponent({move:x.move,phase:p,index:0});
   return {...x,phase:p,lion:x.attacker==='lion'?attack:defence,rabbit:x.attacker==='rabbit'?attack:defence,phaseName:this.phase};
  }
  record(hit,time){
   if(this.phase!=='round'||!this.exchange)return;
   const key=this.exchange.index+':'+hit.actor;if(this.seen.has(key)||hit.closingSpeed<.12)return;this.seen.add(key);
   const amount=clamp(hit.closingSpeed/4,.18,1),kind=hit.kind;
   for(const table of [this.stats,this.total]){
    const s=table[hit.actor];
    if(kind==='head'||kind==='body'){s[kind]++;s.quality+=.65+amount*.7;s.power+=amount;}
    else if(kind==='glove')s.blocked++;else if(kind==='shoulder')s.shoulder++;
   }
   this.reactions[hit.receiver].push({time,kind,amount,side:hit.localSide||1});
   if(this.reactions[hit.receiver].length>8)this.reactions[hit.receiver].shift();
  }
  reaction(actor,time){
   const result={pitch:0,yaw:0,roll:0,crouch:0,back:0,headPitch:0,headYaw:0};
   for(const hit of this.reactions[actor]){
    const age=time-hit.time;if(age<0||age>1.5)continue;
    const pulse=(1-Math.exp(-age/ .025))*Math.exp(-age/(hit.kind==='body'?.30:.19))*hit.amount;
    const s=hit.side;
    if(hit.kind==='head'){result.headPitch-=.40*pulse;result.headYaw+=s*.42*pulse;result.pitch-=.10*pulse;result.back+=.022*pulse;}
    else if(hit.kind==='body'){result.pitch+=.28*pulse;result.crouch+=.045*pulse;result.headPitch+=.10*pulse;result.back+=.014*pulse;}
    else if(hit.kind==='shoulder'){result.yaw+=s*.18*pulse;result.roll+=s*.12*pulse;}
    else {result.back+=.008*pulse;result.pitch-=.025*pulse;}
   }
   return result;
  }
  snapshot(time){return {phase:this.phase,round:this.round,remaining:Math.max(0,this.phaseEnd-time),elapsed:time-this.phaseStart,winner:this.winner,decision:this.decision,cards:this.cards,totals:this.totals,total:this.total,stamina:{...this.stamina}};}
 }
 window.FightSession=FightSession;
})();
