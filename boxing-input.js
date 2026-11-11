/* User commands share the existing simulation clock, poses and contact solver. */
(() => {
 const punches=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const durations={jab:.64,cross:.70,hook:.78,rear_hook:.78,uppercut:.84,rear_uppercut:.84,slip:.62,roll:.76,guard:.55,step:.72,speedbag:.32};
 const definitions={};
 for(const move of punches)definitions[move]={move,attack:true};
 Object.assign(definitions,{slip_left:{move:'slip',defend:true,defenceSide:-1},slip_right:{move:'slip',defend:true,defenceSide:1},roll:{move:'roll',defend:true},guard:{move:'guard',defend:true,brace:1},step_left:{move:'step',defenceSide:-1,stepDirection:-1},step_right:{move:'step',defenceSide:1,stepDirection:1}});
 Object.assign(definitions,{high_guard:{move:'guard',defend:true,brace:1,guardStyle:'high'},body_guard:{move:'guard',defend:true,brace:1,guardStyle:'body'},block_left:{move:'guard',defend:true,brace:1,guardStyle:'left'},block_right:{move:'guard',defend:true,brace:1,guardStyle:'right'},parry:{move:'guard',defend:true,brace:1,guardStyle:'parry'},step_forward:{move:'step',stepAdvance:1},step_back:{move:'step',stepAdvance:-1}});
 for(const [suffix,side] of [['lead','L'],['rear','R']])for(const [prefix,count] of [['tap',1],['double',2],['triple',3]])definitions[prefix+'_'+suffix]={move:'speedbag',side,attack:true,count};
 const combos={
  combo_one_two:['jab','cross'],combo_three:['jab','cross','hook'],combo_upper:['uppercut','rear_hook','cross'],
  combo_counter:['slip_right','cross','hook'],combo_roll:['roll','rear_uppercut','hook','cross'],combo_super:['jab','cross','hook','roll','rear_uppercut','hook'],
  combo_speed_alternate:['tap_lead','tap_rear','tap_lead','tap_rear'],combo_speed_doubles:['tap_lead','tap_lead','tap_rear','tap_rear'],combo_speed_triples:['tap_lead','tap_lead','tap_lead','tap_rear','tap_rear','tap_rear'],
  combo_speed_slip:['tap_lead','tap_rear','tap_lead','slip_left'],combo_speed_roll:['tap_lead','tap_rear','tap_lead','tap_rear','roll'],combo_speed_cover:['tap_lead','tap_lead','tap_rear','tap_rear','high_guard']
 };
 class BoxingInput {
  constructor(engine){this.engine=engine;this.enabled=false;this.serial=0;this.reset();}
  actor(){return this.engine.coach?.species==='rabbit'?'rabbit':'lion';}
  now(){return this.engine.arena?.mode==='fight'?this.engine.arena.fightView?.match.time||0:this.engine.arena?.previousTime??this.engine.animTime??0;}
  key(){return (this.engine.targetMode||this.engine.arena?.mode||'none')+'|'+this.actor();}
  reset(){this.current=null;this.queue=[];this.combo=null;this.lastTime=null;this.context=this.key();this.engine.onInputState?.();}
  setEnabled(enabled){
   this.enabled=!!enabled;this.reset();
   this.engine.arena?.fightView?.match.setPlayer(this.enabled?this.actor():null);
   this.engine.lastRenderStamp=null;this.engine.isPlaying=true;this.engine.onInputState?.();
  }
  canAct(){
   if(window.ringfighterGame?.isModalOpen||!this.enabled||!this.engine.coach||this.engine.targetMode==='rope')return false;
   const match=this.engine.arena?.fightView?.match;
   return !match||(match.phase==='round'&&!match.result&&!match.fighters[this.actor()].down);
  }
  sequence(){const m=this.engine.arena?.fightView?.match;return m?m.playerCombo:this.combo;}
  canCombo(){const match=this.engine.arena?.fightView?.match;return this.canAct()&&(match?!match.pendingPlayerCombo:!this.queue.some(c=>c.combo?.step===1));}
  pressCombo(id){
   if(this.context!==this.key())this.reset();
   const unlock=window.ringfighterGame&&window.GameDomain?.combos.find(c=>c.controllerId===id),game=this.engine.career?.store.game(),mode=this.engine.targetMode==='fight'?'fight':'training';if(unlock&&(!game?.combos.owned.includes(unlock.id)||!game.combos[mode].includes(unlock.id)))return false;
   const ids=combos[id],speed=(this.engine.targetMode||this.engine.arena?.mode)==='speed';
   if(!ids||!this.canCombo()||speed!==id.startsWith('combo_speed_'))return false;
   const commands=ids.map((input,i)=>{const d=definitions[input],duration=d.move==='speedbag'?.27:d.move==='jab'?.54:d.move==='cross'?.64:durations[d.move];return {...d,input,duration,combo:{id,step:i+1,total:ids.length}};});
   const match=this.engine.arena?.fightView?.match;let accepted;
   if(match){match.setPlayer(this.actor());accepted=match.requestPlayerCombo(commands,id);}
   else{this.queue.push(...commands);if(!this.current)this.combo={id,step:1,total:commands.length};this.frame(this.now());accepted=true;}
   if(accepted){this.engine.isPlaying=true;this.engine.lastRenderStamp=null;this.engine.onInputState?.();}return accepted;
  }
  press(id){
   if(combos[id])return this.pressCombo(id);
   const definition=definitions[id];if(!definition||!this.canAct())return false;
   const speed=(this.engine.targetMode||this.engine.arena?.mode)==='speed';
   if(definition.attack&&(speed!==(definition.move==='speedbag')))return false;
   const command={...definition,input:id,duration:durations[definition.move]};
   const match=this.engine.arena?.fightView?.match;
   let accepted;
   if(match){match.setPlayer(this.actor());accepted=match.requestPlayerMove(command);}
   else {
    if(this.context!==this.key())this.reset();
    if(this.combo){this.combo=null;this.queue=[];if(this.current)delete this.current.combo;}
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
   if(this.current?.combo){if(!this.combo||this.combo.id!==this.current.combo.id)this.combo={...this.current.combo};else this.combo.step=this.current.combo.step;}
   if(!this.current&&!this.queue.length)this.combo=null;
   if(!this.current)return {move:'guard',phase:.35,attack:false,defend:true,brace:1,rest:true,index:this.serial,manual:true};
   const a=this.current,R=window.BOXING_ROUTINES;
   // GOTR-0025: shared punch clock (faster drive into the target), and a
   // punch followed by another queued punch ends once its hand is back at
   // the guard, so a combination flows instead of resetting between punches.
   if(a.attack&&a.move!=='speedbag'&&R?.punchPhase){
    if(!a.linked&&this.queue[0]?.attack&&this.queue[0].move!=='speedbag'&&time-a.start<a.duration*.5){a.linked=true;a.span=R.punchSpan();a.duration*=a.span;}
    return {...a,phase:R.punchPhase(Math.max(0,Math.min(1,(time-a.start)/a.duration))*(a.span||1)),index:a.id,manual:true};
   }
   return {...a,phase:Math.max(0,Math.min(1,(time-a.start)/a.duration)),index:a.id,manual:true};
  }
 }
 BoxingInput.definitions=definitions;BoxingInput.durations=durations;BoxingInput.combos=combos;window.BoxingInput=BoxingInput;
})();
