/* Shared deterministic choreography. All timing advances with the app speed. */
(() => {
 const list=[
  ['one_two',['jab','cross'],['Jab–cross','ג׳אב–קרוס','Джеб–кросс']],
  ['one_two_hook',['jab','cross','hook'],['One–two–hook','ג׳אב–קרוס–הוק','Джеб–кросс–хук']],
  ['slip_cross',['slip','cross'],['Slip & counter','התחמקות וקרוס','Уклон и контратака']],
  ['uppercut_flow',['uppercut','hook','cross'],['Uppercut flow','רצף אפרקאט','Серия с апперкотом']],
  ['double_jab',['jab','jab','cross'],['Double jab–cross','ג׳אב כפול וקרוס','Двойной джеб–кросс']],
  ['jab_slip_counter',['jab','jab','slip','rear_uppercut','roll','cross','hook'],['Double jab, defend, counter','ג׳אב כפול, הגנה, התקפה','Двойной джеб, защита, ответ']],
  ['hook_roll_cross',['jab','cross','hook','roll','cross','hook'],['Three punches, roll, return','שלוש מכות, גלגול, תגובה','Три удара, нырок, ответ']],
  ['inside_work',['uppercut','rear_hook','roll','rear_uppercut','hook'],['Inside combinations','שילובים מטווח קצר','Ближняя дистанция']],
  ['defence_flow',['slip','cross','roll','uppercut','rear_hook'],['Read, defend & counter','קריאה, הגנה ותגובה','Чтение, защита, ответ']],
  ['jab_exit',['jab','cross','step','jab','slip','cross'],['Attack, step out, return','התקפה, יציאה וחזרה','Атака, отход, возврат']],
  ['body_to_head',['jab','rear_uppercut','hook','roll','cross'],['Uppercut–hook counter','אפרקאט–הוק ותגובה','Апперкот–хук и ответ']],
  ['sparring_flow',['jab','cross','slip','cross','hook','roll','uppercut','cross'],['Partner flow','רצף עם יריב','Серия с партнёром']]
 ].map(([id,moves,names])=>({id,moves,names}));
 const sequences=Object.fromEntries(list.map(r=>[r.id,r.moves]));
 function frame(time,technique='combo',combo='one_two'){
  const moves=technique==='combo'?(sequences[combo]||sequences.one_two):[technique];
  const duration=technique==='combo'?1:1.22,beat=Math.max(0,time)/duration;
  const index=Math.floor(beat),fraction=beat-index;
  return {move:moves[index%moves.length],phase:fraction*(technique==='combo'?.86:1),index,slot:index%moves.length,moves,duration};
 }
 function opponent(frame){
  const p=frame.phase,clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10);};
  const phase=delta=>clamp(p+delta*ease(p/.14)*(1-ease((p-.62)/.20)));
  if(frame.move==='slip')return {move:'jab',phase:Math.min(1,p+.055),attack:true};
  if(frame.move==='roll')return {move:'hook',phase:Math.max(0,p-.01),attack:true};
  if(['jab','cross','hook','rear_hook','uppercut','rear_uppercut'].includes(frame.move)){
   // Mix evasions with guarded contact. Never duck down into an uppercut.
   if(frame.index%3===1)return {move:'guard',phase:p,attack:false,defend:true,brace:1};
   const rear=['cross','rear_hook','rear_uppercut'].includes(frame.move),side=rear?1:-1;
   if(frame.move.includes('hook')){
    const rollPhase=p<.40?.45*ease(p/.40):p<.60?.45+.06*ease((p-.40)/.20):.51+.49*ease((p-.60)/.40);
    return {move:'roll',phase:rollPhase,attack:false,defend:true,defenceSide:side};
   }
   return {move:'slip',phase:phase(frame.move.includes('uppercut')?-.07:-.055),attack:false,defend:true,defenceSide:side};
  }
  return {move:'guard',phase:p,attack:false};
 }

 // Seeded rehearsal clock: vary active tempos and guard gaps without ever
 // skipping a technique or using wall-clock randomness during playback.
 class PracticeTimeline {
  constructor(seed=1){this.seed=seed>>>0;this.state=this.seed;this.events=[];this.end=0;this.key='';}
  random(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
  frame(time,technique='combo',combo='one_two'){
   const key=technique+'|'+combo;
   if(key!==this.key){this.key=key;this.events=[];this.end=0;this.state=this.seed;}
   const moves=technique==='combo'?(sequences[combo]||sequences.one_two):[technique];
   time=Math.max(0,time);
   while(this.end<=time){
    const index=this.events.length,move=moves[index%moves.length];
    const duration=(move.includes('uppercut')?.96:.76)+this.random()*.46;
    const gap=this.random()<.42?0:.14+this.random()*.92;
    this.events.push({start:this.end,activeEnd:this.end+duration,end:this.end+duration+gap,duration,gap,index,move});
    this.end+=duration+gap;
   }
   let lo=0,hi=this.events.length-1;
   while(lo<hi){const mid=(lo+hi)>>1;if(this.events[mid].end<=time)lo=mid+1;else hi=mid;}
   const event=this.events[lo],rest=time>=event.activeEnd;
   return {...event,move:rest?'guard':event.move,phase:rest?0:(time-event.start)/event.duration*(technique==='combo'?.86:1),rest,slot:event.index%moves.length,moves};
  }
 }
 class RandomSparring {
  constructor(seed=1,timing='sync'){this.seed=seed>>>0;this.state=this.seed;this.timing=timing;this.timeline=[];this.end=0;this.turn=0;}
  random(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
  append(){
   const combinations=[['jab','cross'],['jab','jab','cross'],['jab','cross','hook'],['uppercut','rear_hook'],['cross','hook','rear_uppercut'],['jab','rear_uppercut','hook']];
   const moves=combinations[Math.floor(this.random()*combinations.length)],attacker=this.timing==='random'?(this.random()<.5?'lion':'rabbit'):this.turn%2===0?'lion':'rabbit';
   for(const move of moves){const duration=this.timing==='random'?(move.includes('uppercut')?.96:.76)+this.random()*.46:move.includes('uppercut')?1.22:1.02+this.random()*.16;this.timeline.push({start:this.end,end:this.end+duration,duration,move,attacker,index:this.timeline.length});this.end+=duration;}
   if(this.timing==='random'){
    const duration=.12+this.random()*.95;
    this.timeline.push({start:this.end,end:this.end+duration,duration,move:'guard',attacker:null,index:this.timeline.length});this.end+=duration;
   }
   this.turn++;
  }
  frame(time){
   time=Math.max(0,time);while(this.end<=time)this.append();
   let lo=0,hi=this.timeline.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.timeline[mid].end<=time)lo=mid+1;else hi=mid;}
   const beat=this.timeline[lo],phase=(time-beat.start)/beat.duration;
   const attack={move:beat.move,phase,attack:beat.move!=='guard'},defence=opponent({move:beat.move,phase,index:beat.index});
   return {...beat,phase,lion:beat.attacker==='lion'?attack:defence,rabbit:beat.attacker==='rabbit'?attack:defence};
  }
 }
 window.BOXING_ROUTINES={list,sequences,frame,opponent,PracticeTimeline,RandomSparring,speeds:[.5,.75,1,1.25,1.5,2,2.5,3]};
})();
