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
  ['change_gears',['jab','jab','cross','roll','rear_uppercut','cross'],['Change gears','שינויי קצב','Смена темпа']],
  ['six_punch_flow',['jab','cross','hook','rear_uppercut','hook','cross'],['Six-punch flow','רצף שש מכות','Серия из шести']],
  ['double_jab_exit',['jab','jab','cross','slip','step'],['Double jab and exit','ג׳אב כפול ויציאה','Двойной джеб и отход']],
  ['slip_both_counter',['slip','roll','cross','hook','rear_uppercut'],['Defend twice and counter','שתי הגנות ותגובה','Две защиты и ответ']],
  ['upper_hook_exit',['uppercut','rear_hook','cross','step'],['Uppercut, hook and exit','אפרקאט, הוק ויציאה','Апперкот, хук, отход']],
  ['rear_upper_return',['jab','rear_uppercut','hook','cross','roll'],['Set up the rear uppercut','הכנה לאפרקאט אחורי','Подготовка заднего апперкота']],
  ['pressure_reset',['jab','cross','jab','cross','step','jab'],['Pressure and reset','לחץ וחזרה לעמדה','Давление и перестройка']],
  ['counterburst',['roll','rear_uppercut','hook','cross','slip','cross'],['Counter burst','רצף תגובה','Ответная серия']],
  ['step_one_two_exit',['step','jab','cross','step'],['Step in, one–two, step out','צעד, ג׳אב–קרוס ויציאה','Шаг, двойка, отход']],
  ['circle_counter',['step','slip','cross','hook','step'],['Circle, defend and counter','תנועה, הגנה ותגובה','Сместиться, защита, ответ']],
  ['moving_double_jab',['step','jab','jab','step','cross'],['Moving double jab','ג׳אב כפול בתנועה','Двойной джеб в движении']],
  ['reset_reenter',['jab','cross','step','slip','step','jab'],['Exit, reset and re-enter','יציאה, איפוס וכניסה','Отход, перестройка, вход']],
  ['level_change',['jab','cross','hook','slip','rear_uppercut','step'],['Body–head switch and exit','גוף–ראש ויציאה','Смена уровней и отход']],
  ['check_hook_exit',['jab','step','hook','cross','roll','step'],['Angle step, hook and reset','צעד זווית, הוק ואיפוס','Смещение, хук и перестройка']],
  ['double_counter_return',['slip','cross','hook','roll','rear_uppercut','hook','step'],['Two reads, two counters','שתי קריאות ושתי תגובות','Две защиты, два ответа']],
  ['pressure_break',['jab','jab','cross','hook','step','cross'],['Pressure burst and re-entry','רצף לחץ וכניסה מחדש','Натиск и повторный вход']],
  ['long_exchange',['jab','jab','cross','hook','roll','cross','rear_hook','step'],['Long exchange','חילופי מכות ארוכים','Длинный обмен']]
,
  ['super_blitz',['jab','jab','cross','hook','roll','rear_uppercut','hook','cross','step'],['Super · Lightning counter','סופר · תגובת ברק','Супер · Молниеносный ответ']],
  ['super_angle',['step','jab','cross','slip','cross','hook','step','jab'],['Super · Angle hunter','סופר · שינוי זווית','Супер · Охотник за углом']],
  ['super_inside',['jab','rear_uppercut','hook','roll','uppercut','rear_hook','slip','cross','step'],['Super · Inside storm','סופר · סערה מקרוב','Супер · Ближний шторм']],
  ['super_gears',['jab','jab','cross','slip','rear_uppercut','hook','cross','roll','step'],['Super · Change gears','סופר · החלפת הילוך','Супер · Смена передач']],
  ['super_defence',['slip','roll','cross','hook','slip','rear_uppercut','hook','cross','step'],['Super · Read and punish','סופר · לקרוא ולהגיב','Супер · Прочитать и ответить']],
  ['super_ten',['jab','cross','hook','rear_uppercut','hook','cross','roll','uppercut','rear_hook','cross','step'],['Super · Power engine','סופר · מנוע התקפה','Супер · Двигатель атаки']],
  ['super_double_wave',['jab','cross','hook','step','jab','jab','cross','roll','rear_uppercut','hook','step'],['Super · Double wave','סופר · גל כפול','Супер · Двойная волна']],
  ['super_upper_ladder',['jab','rear_uppercut','hook','cross','roll','uppercut','rear_hook','cross','step'],['Super · Uppercut ladder','סופר · סולם אפרקאטים','Супер · Лестница апперкотов']],
  ['super_checkmate',['jab','slip','cross','hook','roll','rear_uppercut','hook','step','cross'],['Super · Counter checkmate','סופר · רצף הכרעה','Супер · Мат контратакой']],
  ['super_ringcraft',['step','jab','cross','step','slip','cross','hook','roll','step','jab'],['Super · Ring commander','סופר · שליטה בזירה','Супер · Хозяин ринга']],
  ['super_comeback',['roll','uppercut','rear_hook','slip','cross','hook','rear_uppercut','step'],['Super · Comeback burst','סופר · חזרה למתקפה','Супер · Ответный прорыв']],
  ['super_marathon',['jab','jab','cross','hook','roll','cross','rear_uppercut','hook','step','jab','cross','slip'],['Super · Championship chain','סופר · שרשרת אליפות','Супер · Чемпионская цепь']]
 ].map(([id,moves,names])=>({id,moves,names}));
 const sequences=Object.fromEntries(list.map(r=>[r.id,r.moves]));
 const timings={fast_jabs_upper:[.48,.48,1.30,.78],burst_exit:[.52,.60,.70,1.18,.76],read_upper:[.72,.92,1.20,.65,1.15],change_gears:[.46,.50,.68,.98,1.36,.65]};
 // Short straight bursts, deliberate uppercuts, and enough time to plant exits.
 Object.assign(timings,{
  level_change:[.54,.70,.74,.82,1.08,1.02],
  check_hook_exit:[.54,1.02,.76,.68,.88,1.02],
  double_counter_return:[.78,.66,.72,.88,1.10,.70,1.02],
  pressure_break:[.48,.50,.66,.72,1.02,.68],
  super_blitz:[.44,.48,.60,.64,.78,.94,.66,.62,.96],
  super_angle:[.94,.52,.64,.72,.62,.68,.98,.56],
  super_inside:[.54,.96,.68,.82,.98,.72,.76,.66,.98],
  super_gears:[.44,.48,.72,.78,1.10,.64,.58,.84,.98],
  super_defence:[.72,.84,.62,.68,.74,1.02,.66,.64,.98],
  super_ten:[.48,.58,.64,.94,.66,.60,.82,.98,.72,.62,1.02],
  super_double_wave:[.48,.60,.66,.96,.44,.48,.62,.82,1.02,.68,1.00],
  super_upper_ladder:[.54,1.00,.68,.62,.84,1.04,.72,.64,.98],
  super_checkmate:[.54,.74,.62,.68,.84,1.00,.68,.98,.66],
  super_ringcraft:[.98,.52,.64,.98,.76,.62,.68,.84,1.00,.56],
  super_comeback:[.84,1.02,.72,.76,.64,.68,1.04,1.00],
  super_marathon:[.46,.50,.62,.68,.84,.64,1.02,.70,1.02,.50,.62,.80]
 });
 const cues={level_change:{5:{stepDirection:-1}},check_hook_exit:{1:{stepDirection:1},5:{stepDirection:-1}},double_counter_return:{0:{defenceSide:-1},6:{stepDirection:1}},pressure_break:{4:{stepDirection:-1}},super_blitz:{8:{stepDirection:-1}},super_angle:{0:{stepDirection:-1},3:{defenceSide:-1},6:{stepDirection:1}},super_inside:{8:{stepDirection:1}},super_gears:{8:{stepDirection:-1}},super_defence:{0:{defenceSide:-1},4:{defenceSide:1},8:{stepDirection:1}},super_ten:{10:{stepDirection:-1}},super_double_wave:{3:{stepDirection:1},10:{stepDirection:-1}},super_upper_ladder:{8:{stepDirection:1}},super_checkmate:{7:{stepDirection:-1}},super_ringcraft:{0:{stepDirection:-1},3:{stepDirection:1},8:{stepDirection:-1}},super_comeback:{3:{defenceSide:-1},7:{stepDirection:1}},super_marathon:{8:{stepDirection:1}}};
 for(const r of list)if(r.id.startsWith('super_'))r.advanced=true;
 // Footwork must finish its full plant; attack-only tail trimming caused a hop.
 const phaseScale=move=>move==='step'?1:.86;
 const speedDrills=[
  {id:'alternating',names:['Alternating speed-bag rhythm','קצב לסירוגין','Чередование рук']},
  {id:'lead',names:['Lead hand control','שליטה ביד קדמית','Передняя рука']},
  {id:'rear',names:['Rear hand control','שליטה ביד אחורית','Задняя рука']},
  {id:'doubles',names:['Double lead, double rear','כפול קדמי, כפול אחורי','Два передней, два задней']},
  {id:'triples',names:['Triple-hand bursts','רצפים של שלוש','Тройки каждой рукой']},
  {id:'intervals',names:['Build speed, recover','האצה והתאוששות','Ускорение и восстановление']},
  {id:'burst_slip',names:['Fast three + slip','שלוש מהירות והתחמקות','Быстрая тройка + уклон']},
  {id:'burst_roll',names:['Fast four + roll','ארבע מהירות וגלגול','Четыре + нырок']},
  {id:'double_cover',names:['Doubles + cover','כפולות והגנה','Двойки + защита']},
  {id:'step_reset',names:['Four + step away','ארבע וצעד החוצה','Четыре + отход']}
,
  {id:'super_pyramid',names:['Super · Pyramid sprint','סופר · פירמידת מהירות','Супер · Пирамида скорости']},
  {id:'super_switch',names:['Super · Switch hands + slip','סופר · החלפת יד והתחמקות','Супер · Смена рук + уклон']},
  {id:'super_endurance',names:['Super · Eight + cover','סופר · שמונה והגנה','Супер · Восемь + защита']},
  {id:'super_gears',names:['Super · Fast / slow / roll','סופר · מהר, לאט וגלגול','Супер · Быстро / медленно / нырок']}
 ];
 const speedBursts={burst_slip:[['L',.22],['R',.22],['L',.25],['slip',.60]],burst_roll:[['L',.24],['R',.24],['L',.24],['R',.24],['roll',.72]],double_cover:[['L',.20],['L',.20],['R',.20],['R',.20],['guard',.45]],step_reset:[['L',.23],['R',.23],['L',.23],['R',.23],['step',.65]]};
 Object.assign(speedBursts,{
  super_pyramid:[['L',.32],['R',.29],['L',.26],['R',.23],['L',.22],['R',.24],['L',.29],['R',.34],['guard',.52]],
  super_switch:[['L',.24],['L',.24],['R',.24],['R',.24],['L',.22],['R',.22],['slip',.64]],
  super_endurance:[['L',.24],['R',.24],['L',.24],['R',.24],['L',.24],['R',.24],['L',.24],['R',.24],['guard',.56]],
  super_gears:[['L',.22],['R',.22],['L',.24],['R',.24],['L',.42],['R',.42],['roll',.76]]
 });
 function speedFrame(time,id='alternating'){
  time=Math.max(0,time);
  if(id==='alternating')return {clock:time*1.8/1.22,index:Math.floor(time*1.8/1.22*2),legacy:true};
  if(speedBursts[id]){
   const sequence=speedBursts[id],total=sequence.reduce((n,s)=>n+s[1],0),cycle=Math.floor(time/total);let age=time-cycle*total,slot=0;
   while(slot<sequence.length-1&&age>=sequence[slot][1])age-=sequence[slot++][1];
   const [action,duration]=sequence[slot],defenceMove=['L','R'].includes(action)?null:action;
   return {index:cycle*sequence.length+slot,phase:age/duration,side:defenceMove?null:action,clock:cycle+slot/sequence.length,legacy:false,tempo:60/duration,defenceMove};
  }
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
   return {move:moves[slot],...cues[combo]?.[slot],phase:age/ds[slot]*phaseScale(moves[slot]),index:cycle*moves.length+slot,slot,moves,duration:ds[slot],authoredTempo:true};
  }
  const duration=technique==='combo'?1:1.22,beat=Math.max(0,time)/duration;
  const index=Math.floor(beat),fraction=beat-index;
  return {move:moves[index%moves.length],phase:fraction*(technique==='combo'?phaseScale(moves[index%moves.length]):1),index,slot:index%moves.length,moves,duration};
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
   return {...event,...cues[combo]?.[event.index%moves.length],move:rest?'guard':event.move,phase:rest?0:(time-event.start)/event.duration*(technique==='combo'?phaseScale(event.move):1),rest,slot:event.index%moves.length,moves};
  }
 }
 // Boxing grammar provides many phrases, not a random pick from six loops.
 function phrase(random,defence=true){
  const open=[['jab'],['jab','jab'],['jab','cross'],['cross','hook'],['jab','rear_uppercut','hook'],['jab','cross','hook','roll','cross'],['jab','jab','cross','step','jab'],['slip','cross','hook'],['roll','uppercut','rear_hook']];
  const choicesOpen=defence?open:open.filter(p=>p.every(m=>!['slip','roll','step'].includes(m)));
  const moves=choicesOpen[Math.floor(random()*choicesOpen.length)].slice(),length=3+Math.floor(random()*4)+(defence&&random()<.30?3:0);
  while(moves.length<length){
   const last=moves.at(-1),choices=['jab','hook','uppercut'].includes(last)?['cross','rear_hook','rear_uppercut']:['jab','hook','uppercut'];
   moves.push(choices[Math.floor(random()*choices.length)]);
  }
  if(defence){if(random()<.35)moves.unshift('step');if(random()<.45)moves.splice(2,0,random()<.5?'slip':'roll');moves.push(random()<.5?'step':random()<.5?'slip':'roll');}
  return moves;
 }
 class RoutineDeck {
  constructor(seed=1,timing='sync'){this.seed=seed>>>0;this.state=this.seed;this.timing=timing;this.timeline=[];this.end=0;this.phrases=0;}
  random(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
  append(){
   const moves=phrase(()=>this.random()),packet=this.phrases++;
   moves.forEach((move,slot)=>{
    const duration=this.timing==='random'?(move.includes('uppercut')?1.02:move==='jab'?.54:.72)+this.random()*.25:1.05;
    this.timeline.push({start:this.end,end:this.end+duration,duration,move,slot,moves,packet,index:this.timeline.length});this.end+=duration;
   });
   const duration=this.timing==='random'?.18+this.random()*.75:.32;
   this.timeline.push({start:this.end,end:this.end+duration,duration,move:'guard',slot:moves.length-1,moves,packet,index:this.timeline.length,rest:true});this.end+=duration;
  }
  frame(time){
   time=Math.max(0,time);while(this.end<=time)this.append();let lo=0,hi=this.timeline.length-1;
   while(lo<hi){const mid=(lo+hi)>>1;if(this.timeline[mid].end<=time)lo=mid+1;else hi=mid;}
   const event=this.timeline[lo];return {...event,phase:event.rest?0:(time-event.start)/event.duration,authoredTempo:true};
  }
 }
 class RandomSparring {
  constructor(seed=1,timing='sync'){this.seed=seed>>>0;this.state=this.seed;this.timing=timing;this.timeline=[];this.end=0;this.turn=0;}
  random(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
  append(){
   const moves=phrase(()=>this.random(),false),attacker=this.timing==='random'?(this.random()<.5?'lion':'rabbit'):this.turn%2===0?'lion':'rabbit';
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
 // GOTR-0025 punch clock. Maps an action's raw progress (elapsed / authored
 // duration) to choreography phase. Everything up to the landing and the
 // short hold after it (phase .48) runs `rate` times faster; the return to
 // guard absorbs the saved time, so a single punch keeps its total duration
 // and its readable recovery. The rate change is blended (C1) after contact.
 // A linked combination punch ends at phase `link`, where the hand is
 // already back at the guard, instead of idling there before the next one.
 const punchTempo=Object.freeze({rate:1.25,knee:.48,blend:.05,link:.80});
 function punchPhase(r,tempo=punchTempo){
  r=Math.max(0,Math.min(1,r));const {rate,knee,blend:b}=tempo,r1=knee/rate,slow=(1-knee)/(1-r1);
  if(r<=r1-b)return rate*r;
  if(r>=r1+b)return Math.min(1,knee+slow*(r-r1));
  const u=r-(r1-b);return rate*(r1-b)+rate*u+(slow-rate)*u*u/(4*b);
 }
 // Raw progress at which punchPhase reaches `phase` (phase past the blend).
 function punchSpan(phase=punchTempo.link,tempo=punchTempo){const r1=tempo.knee/tempo.rate,slow=(1-tempo.knee)/(1-r1);return Math.min(1,r1+(phase-tempo.knee)/slow);}
 window.BOXING_ROUTINES={list,sequences,timings,speedDrills,speedFrame,frame,opponent,PracticeTimeline,RandomSparring,RoutineDeck,phrase,punchTempo,punchPhase,punchSpan,speeds:[.5,.75,1,1.25,1.5,2,2.5,3]};
})();
