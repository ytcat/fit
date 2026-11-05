/* User commands share the existing simulation clock, poses and contact solver. */
(() => {
 const punches=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const durations={jab:.64,cross:.70,hook:.78,rear_hook:.78,uppercut:.84,rear_uppercut:.84,slip:.62,roll:.76,guard:.55,step:.72,speedbag:.32};
 const definitions={};
 for(const move of punches)definitions[move]={move,attack:true};
 Object.assign(definitions,{slip_left:{move:'slip',defend:true,defenceSide:-1},slip_right:{move:'slip',defend:true,defenceSide:1},roll:{move:'roll',defend:true},guard:{move:'guard',defend:true,brace:1},step_left:{move:'step',defenceSide:-1,stepDirection:-1},step_right:{move:'step',defenceSide:1,stepDirection:1}});
 for(const [suffix,side] of [['lead','L'],['rear','R']])for(const [prefix,count] of [['tap',1],['double',2],['triple',3]])definitions[prefix+'_'+suffix]={move:'speedbag',side,attack:true,count};
 class BoxingInput {
  constructor(engine){this.engine=engine;this.enabled=false;this.serial=0;this.reset();}
  actor(){return this.engine.coach?.species==='rabbit'?'rabbit':'lion';}
  now(){return this.engine.arena?.mode==='fight'?this.engine.arena.fightView?.match.time||0:this.engine.arena?.previousTime??this.engine.animTime??0;}
  key(){return (this.engine.targetMode||this.engine.arena?.mode||'none')+'|'+this.actor();}
  reset(){this.current=null;this.queue=[];this.lastTime=null;this.context=this.key();this.engine.onInputState?.();}
  setEnabled(enabled){
   this.enabled=!!enabled;this.reset();
   this.engine.arena?.fightView?.match.setPlayer(this.enabled?this.actor():null);
   this.engine.lastRenderStamp=null;this.engine.isPlaying=true;this.engine.onInputState?.();
  }
  canAct(){
   if(!this.enabled||!this.engine.coach)return false;
   const match=this.engine.arena?.fightView?.match;
   return !match||(match.phase==='round'&&!match.result&&!match.fighters[this.actor()].down);
  }
  press(id){
   const definition=definitions[id];if(!definition||!this.canAct())return false;
   const speed=(this.engine.targetMode||this.engine.arena?.mode)==='speed';
   if(definition.attack&&(speed!==(definition.move==='speedbag')))return false;
   const command={...definition,input:id,duration:durations[definition.move]};
   const match=this.engine.arena?.fightView?.match;
   let accepted;
   if(match){match.setPlayer(this.actor());accepted=match.requestPlayerMove(command);}
   else {
    if(this.context!==this.key())this.reset();
    const count=definition.count||1,capacity=3-(this.current?1:0)-this.queue.length;
    if(count>capacity)return false;
    for(let i=0;i<count;i++)this.queue.push({...command,duration:count>1?.27:command.duration});
    this.frame(this.now());accepted=true;
   }
   if(accepted){this.engine.isPlaying=true;this.engine.lastRenderStamp=null;this.engine.onInputState?.();}
   return accepted;
  }
  frame(time){
   if(!this.enabled)return null;
   if(this.context!==this.key()||this.lastTime!=null&&time<this.lastTime-1e-6)this.reset();
   this.lastTime=time;
   while(this.current&&time>=this.current.start+this.current.duration){
    const end=this.current.start+this.current.duration;this.current=null;
    if(this.queue.length)this.current={...this.queue.shift(),start:end,id:++this.serial};
   }
   if(!this.current&&this.queue.length)this.current={...this.queue.shift(),start:time,id:++this.serial};
   if(!this.current)return {move:'guard',phase:.35,attack:false,defend:true,brace:1,rest:true,index:this.serial,manual:true};
   const a=this.current;return {...a,phase:Math.max(0,Math.min(1,(time-a.start)/a.duration)),index:a.id,manual:true};
  }
 }
 BoxingInput.definitions=definitions;BoxingInput.durations=durations;window.BoxingInput=BoxingInput;
})();
