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
  ['sparring_flow',['jab','cross','slip','cross','hook','roll','uppercut','cross'],['Partner flow','רצף עם יריב','Серия с партнёром']],
  ['fast_jabs_upper',['jab','jab','rear_uppercut','cross'],['Fast double jab, measured uppercut','ג׳אב כפול מהיר ואפרקאט איטי','Быстрые джебы, медленный апперкот']],
  ['burst_exit',['jab','cross','hook','step','cross'],['Fast burst, reset, cross','רצף מהיר, יציאה וקרוס','Быстрая серия, отход, кросс']],
  ['read_upper',['slip','slip','rear_uppercut','hook','step'],['Read twice, uppercut counter','שתי התחמקויות ואפרקאט נגד','Два уклона, ответ апперкотом']],
  ['change_gears',['jab','jab','cross','roll','rear_uppercut','cross'],['Change gears','שינויי קצב','Смена темпа']]
 ].map(([id,moves,names])=>({id,moves,names}));
 const sequences=Object.fromEntries(list.map(r=>[r.id,r.moves]));
 const timings={fast_jabs_upper:[.48,.48,1.30,.78],burst_exit:[.52,.60,.70,1.18,.76],read_upper:[.72,.92,1.20,.65,1.15],change_gears:[.46,.50,.68,.98,1.36,.65]};
 const speedDrills=[
  {id:'alternating',names:['Alternating speed-bag rhythm','קצב לסירוגין','Чередование рук']},
  {id:'lead',names:['Lead hand control','שליטה ביד קדמית','Передняя рука']},
  {id:'rear',names:['Rear hand control','שליטה ביד אחורית','Задняя рука']},
  {id:'doubles',names:['Double lead, double rear','כפול קדמי, כפול אחורי','Два передней, два задней']},
  {id:'triples',names:['Triple-hand bursts','רצפים של שלוש','Тройки каждой рукой']},
  {id:'intervals',names:['Build speed, recover','האצה והתאוששות','Ускорение и восстановление']}
 ];
 function speedFrame(time,id='alternating'){
  time=Math.max(0,time);
  if(id==='alternating')return {clock:time*1.8/1.22,index:Math.floor(time*1.8/1.22*2),legacy:true};
  const sides=id==='lead'?['L']:id==='rear'?['R']:id==='triples'?['L','L','L','R','R','R']:['L','L','R','R'];
  const durations=id==='intervals'?[.48,.42,.36,.30,.30,.36,.42,.55]:id==='triples'?[.32,.32,.48,.32,.32,.48]:sides.map(()=>.46);
  const total=durations.reduce((a,b)=>a+b,0),cycle=Math.floor(time/total);let age=time-cycle*total,slot=0;
  while(slot<durations.length-1&&age>=durations[slot])age-=durations[slot++];
  const phase=age/durations[slot],side=id==='intervals'?(slot%2?'R':'L'):sides[slot%sides.length];
  return {index:cycle*durations.length+slot,phase,side,clock:cycle+slot/durations.length,legacy:false,tempo:60/durations[slot]};
 }
 function frame(time,technique='combo',combo='one_two'){
  const moves=technique==='combo'?(sequences[combo]||sequences.one_two):[technique];
  if(technique==='combo'&&timings[combo]){
   const ds=timings[combo],total=ds.reduce((a,b)=>a+b,0),cycle=Math.floor(Math.max(0,time)/total);let age=Math.max(0,time)-cycle*total,slot=0;
   while(slot<ds.length-1&&age>=ds[slot])age-=ds[slot++];
   return {move:moves[slot],phase:age/ds[slot]*.86,index:cycle*moves.length+slot,slot,moves,duration:ds[slot],authoredTempo:true};
  }
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
    const duration=technique==='combo'&&timings[combo]?timings[combo][index%moves.length]*(.82+this.random()*.36):(move.includes('uppercut')?.96:.76)+this.random()*.46;
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
 window.BOXING_ROUTINES={list,sequences,timings,speedDrills,speedFrame,frame,opponent,PracticeTimeline,RandomSparring,speeds:[.5,.75,1,1.25,1.5,2,2.5,3]};
})();
