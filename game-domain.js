/* Offline R1 rules. All coins are earned in play; cosmetics confer no combat stats. */
(() => {
 const cupRules=typeof module!=='undefined'?require('./game-tournament.js'):window.GameTournament;
 const worldRules=typeof module!=='undefined'?require('./game-world.js'):window.GameWorld;
 const iqRules=typeof module!=='undefined'?require('./fight-iq.js'):window.FightIQ;
 const adventureRules=typeof module!=='undefined'?require('./adventure-progress.js'):window.AdventureProgress;
 const accessories=typeof module!=='undefined'?require('./game-accessories.js'):window.GameAccessories;
 const venueIds=Object.freeze(['default','neon_strip','harbor_dome','street','boxing_club','underground','docks','regional','championship']);
 const slots=['gloves','shorts','boots','belt'],species=['lion','rabbit'];
 const palette=[['default',0,0xc53d32],['midnight',25,0x27334c],['jade',75,0x208675],['sunrise',150,0xe8a341]];
 // Belt-slot items are designed boxing-trunk waistbands (GOTR-0030); ids, prices and saves are unchanged.
 const waistbands={en:{default:'Gold pinstripe',midnight:'Navy racing stripe',jade:'Jade chevron',sunrise:'Sunrise wordmark'},he:{default:'פסי זהב',midnight:'פס מרוץ כחול',jade:'זיגזג ירקן',sunrise:'זריחה עם כיתוב'},ru:{default:'Золотая полоска',midnight:'Синяя с полосой',jade:'Нефритовый зигзаг',sunrise:'Рассвет с надписью'}};
 const catalog=slots.flatMap(slot=>palette.map(([variant,price,color])=>({id:slot+'_'+variant,slot,variant,price,color:variant==='default'?{gloves:0xc53d32,shorts:0x202535,boots:0x202535,belt:0xd8ad4a}[slot]:color,species:[...species],name:(slot==='belt'?'Waistband · '+waistbands.en[variant]:slot[0].toUpperCase()+slot.slice(1)+' · '+variant),names:slot==='belt'?{en:'Waistband · '+waistbands.en[variant],he:'רצועת מותניים · '+waistbands.he[variant],ru:'Пояс шорт · '+waistbands.ru[variant]}:{en:slot+' · '+variant,he:({gloves:'כפפות',shorts:'מכנסיים',boots:'נעליים'}[slot])+' · '+({default:'בסיס',midnight:'חצות',jade:'ירקן',sunrise:'זריחה'}[variant]),ru:({gloves:'Перчатки',shorts:'Шорты',boots:'Ботинки'}[slot])+' · '+({default:'базовый',midnight:'полночь',jade:'нефрит',sunrise:'рассвет'}[variant])}})));
 const combos=[
  {id:'first_rhythm',name:'First Rhythm',controllerId:'combo_one_two',sequence:['jab','cross'],requirement:'Complete one active activity',key:'completed',target:1},
  {id:'corner_turn',name:'Corner Turn',controllerId:'combo_three',sequence:['jab','cross','hook'],requirement:'Complete two rope drills',key:'rope',target:2},
  {id:'counter_chain',name:'Counter Chain',controllerId:'combo_counter',sequence:['slip_right','cross','hook'],requirement:'Record 12 defences in completed active activities',key:'defences',target:12},
  {id:'thunder_arc',name:'Thunder Arc',controllerId:'combo_upper',sequence:['uppercut','rear_hook','cross'],requirement:'Complete three active fights',key:'fights',target:3},
  {id:'rolling_return',name:'Rolling Return',controllerId:'combo_roll',sequence:['roll','rear_uppercut','hook','cross'],requirement:'Record 24 defences in completed active activities',key:'defences',target:24},
  {id:'school_signature',name:'School Signature',controllerId:'combo_super',sequence:['jab','cross','hook','roll','rear_uppercut','hook'],requirement:'Land 150 contacts in completed active activities',key:'hits',target:150}
 ].map(c=>({...c,price:{first_rhythm:0,corner_turn:20,counter_chain:40,thunder_arc:40,rolling_return:70,school_signature:120}[c.id],species:[...species],allowedModes:['training','fight'],slotCost:1}));
 const comboPurchase=id=>'purchase:combo:'+id;
 // GOTR-0088 Finishers (moves category of the Shop). Owned when bought (ledger 'purchase:finisher:<id>', a grant in the development
 // build) OR earned in the story (adventure step `earn` finished: Bruno teaches the Sunday Punch before the Brick rematch).
 // Ownership is DERIVED from the ledger and the story, so no new save field and no migration is needed.
 const finishers=Object.freeze([Object.freeze({id:'sunday_punch',name:'Sunday Punch',finisher:true,price:150,earn:'advanced_training',sequence:Object.freeze(['rear_uppercut']),species:Object.freeze([...species])})]);
 const finisherPurchase=id=>'purchase:finisher:'+id;
 const ownsFinisher=(g,id)=>{const f=finishers.find(x=>x.id===id);if(!f||!g)return false;return !!(g.ledger?.some(t=>t.id===finisherPurchase(id))||adventureRules?.dreamDone?.(g,f.earn)||adventureRules?.bossWon?.(g,'brick'));};
 const finishersOwned=g=>finishers.filter(f=>ownsFinisher(g,f.id)).map(f=>f.id);
 // GOTR-0078 Chapter 1 "The Dream": gym equipment bought in the story (Otto's Corner) and the story's fixed cash rewards. The
 // market reward (beat 6) is defined AS the heavy bag's price, so the reward always buys exactly the bag of beat 7.
 const L3=(en,he,ru)=>({en,he,ru});
 const gear=Object.freeze([Object.freeze({id:'heavy_bag',kind:'gym',price:90,step:'buy_heavy_bag',names:Object.freeze(L3('Heavy bag (Otto\'s Corner)','שק כבד (הפינה של אוטו)','Тяжёлый мешок (лавка Отто)'))})]);
 const gearPurchase=id=>'purchase:gear:'+id,storyRewardId=step=>'story:'+step;
 const storyRewards=Object.freeze({market_robber:gear.find(x=>x.id==='heavy_bag').price,docks_fight:120});
 const ownsGear=(g,id)=>!!g?.ledger?.some(t=>t.id===gearPurchase(id));
 // Fight Academy: passing a combo lesson pays once and unlocks that combo. No XP, no combat stats.
 const lesson=Object.freeze({coins:15,repetitions:3,windowMs:2000,rule:'academy-lesson-v1'}),lessonId=id=>'lesson:'+id;
 // GOTR-0033 release switch. version.js channel 'dev' = development: every item and combo can be taken free (price still shown); 'live' or missing = prices charged and locks apply.
 const freeMode=()=>globalThis.APP_VERSION?.channel==='dev',grantRule='dev-free-v1',grant=(id,extra)=>({id,type:'grant',coins:0,xp:0,...extra,rule:grantRule});
 // GOTR-0043: fights pay by result; a loss still pays participation money (less than a win).
 const fightPay=Object.freeze({win:1.5,draw:1,loss:.6});
 const quests=[...combos.map(c=>({id:c.id,name:c.name,key:c.key,target:c.target,comboId:c.id})),{id:'steady_school',name:'Five completed activities',key:'completed',target:5},{id:'first_bout',name:'Complete an active fight',key:'fights',target:1},{id:'straight_work',name:'Land 100 contacts',key:'hits',target:100},{id:'school_minutes',name:'Complete ten active minutes',key:'seconds',target:600}];
 const cleanName=name=>String(name||'').replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,'').trim();
 const fresh=p=>({version:1,venue:'default',school:{name:cleanName(p.name+' School'),crest:'sun',philosophy:'balance'},inventory:slots.map(s=>s+'_default'),equipment:Object.fromEntries(slots.map(s=>[s,s+'_default'])),combos:{owned:[],training:[],fight:[]},activity:{completed:0,rope:0,fights:0,defences:0,hits:0,seconds:0},ledger:[{id:'baseline:'+p.id,type:'baseline',coins:0,xp:p.boxers.lion.xp+p.boxers.rabbit.xp,rule:'migration-v1'}],processed:[],quests:[],history:[],...(cupRules?{cup:cupRules.fresh()}:{}),...(worldRules?{world:worldRules.fresh(p.id)}:{}),...(iqRules?{learning:iqRules.fresh()}:{}),...(adventureRules?{adventure:adventureRules.fresh()}:{})});
 const wallet=g=>({coins:g.ledger.reduce((n,t)=>n+t.coins,0),xp:g.ledger.reduce((n,t)=>n+t.xp,0),transactions:g.ledger.length});
 const fail=message=>{throw Error(message);};
 const integer=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const modes=['none','heavy','dummy','speed','rope','pads','rabbit','fight'];
 const controls=['play','coach','architect','watch'];
 const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const exactKeys=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>keys.includes(k));
 // Compact, local runtime observations. This is schema validation, not server verification.
 function evidence(value){
  if(value===undefined)return undefined;
  if(!exactKeys(value,['seed','rounds','method','decision','opponentName','playerName','stats','cardTotals','moveCounts','rivalId','eventId','cleanChains','cupId','cupStage','cupOpponentId']))fail('Invalid match evidence.');
  const cupKeys=['cupId','cupStage','cupOpponentId'];
  if(cupKeys.some(key=>key in value)&&(cupKeys.some(key=>!(key in value))||!cupRules||!/^school-cup:[1-9]\d{0,8}$/.test(value.cupId)||!integer(value.cupStage,2)||!Object.values(cupRules.rosters).some(rows=>rows[value.cupStage]?.id===value.cupOpponentId)||'rivalId' in value||'eventId' in value))fail('Invalid cup evidence.');
  const out={};
  for(const key of Object.keys(value)){
   const v=value[key];
   if(key==='cleanChains'&&!integer(v,100))fail('Invalid verified chain count.');
   if(key==='rivalId'&&(!worldRules||!worldRules.rivals.some(r=>r.id===v))||key==='eventId'&&(!worldRules||!worldRules.events.some(e=>e.eventId===v)))fail('Unknown activity opportunity.');
   if(key==='seed'&&!integer(v,0xffffffff)||key==='rounds'&&(!integer(v,12)||v<1))fail('Invalid match metadata.');
   if(key==='method'&&!['points','health','KO','TKO','ko','tko','draw'].includes(v)||key==='decision'&&!['unanimous','majority','split','draw','points','health','KO','TKO','ko','tko'].includes(v))fail('Invalid match decision.');
   if(['opponentName','playerName'].includes(key)&&(typeof v!=='string'||!v.length||v.length>48||cleanName(v)!==v||/[<>]/.test(v)))fail('Invalid match identity.');
   if(key==='stats'){
    if(!exactKeys(v,species)||!species.every(actor=>exactKeys(v[actor],['landed','thrown'])&&integer(v[actor].landed,100000)&&integer(v[actor].thrown,100000)&&v[actor].landed<=v[actor].thrown))fail('Invalid match stats.');
   }
   if(key==='cardTotals'&&(!Array.isArray(v)||v.length!==3||v.some(row=>!Array.isArray(row)||row.length!==2||row.some(n=>!integer(n,120)))))fail('Invalid score cards.');
   if(key==='moveCounts'&&(!exactKeys(v,moves)||Object.values(v).some(n=>!integer(n,100000))))fail('Invalid move counts.');
   out[key]=JSON.parse(JSON.stringify(v));
  }
  return out;
 }
 // Compact local proof of a passed lesson: three exact run-throughs with in-tempo gaps. Schema validation, not server verification.
 function lessonEvidence(c,value){
  if(!exactKeys(value,['version','reps'])||value.version!==1||!Array.isArray(value.reps)||value.reps.length!==lesson.repetitions)fail('Invalid lesson evidence.');
  for(const run of value.reps)if(!exactKeys(run,['moves','ms'])||!Array.isArray(run.moves)||!Array.isArray(run.ms)||run.moves.length!==c.sequence.length||run.ms.length!==c.sequence.length||run.moves.some((m,i)=>m!==c.sequence[i])||run.ms[0]!==0||run.ms.some((t,i)=>!integer(t,1e6)||i>0&&(t<run.ms[i-1]||t-run.ms[i-1]>lesson.windowMs)))fail('Lesson evidence does not match the combination.');
  return {version:1,reps:value.reps.map(run=>({moves:[...run.moves],ms:[...run.ms]}))};
 }
 function validateHistory(g){
  if(g.history===undefined)g.history=[]; // Older schema-1 saves predate local activity records.
  if(!Array.isArray(g.history)||g.history.length>50)fail('Invalid local history.');
  const seen=new Set();
  for(const record of g.history){
   if(!exactKeys(record,['id','transactionId','mode','species','control','seconds','hits','attempts','defences','jumps','result','xp','coins','evidence'])||typeof record.id!=='string'||!record.id.length||record.id.length>120||seen.has(record.id)||record.transactionId!=='reward:'+record.id||!g.processed.includes(record.id)||!modes.includes(record.mode)||!species.includes(record.species)||!controls.includes(record.control)||!Number.isFinite(record.seconds)||record.seconds<(record.mode==='fight'?1:10)||record.seconds>(record.mode==='fight'?2160:60)||!['hits','attempts','defences','jumps','xp','coins'].every(k=>integer(record[k],1e6))||record.hits>record.attempts||!(record.mode==='fight'?['win','loss','draw'].includes(record.result):record.result===null))fail('Invalid local activity record.');
   const tx=g.ledger.find(t=>t.id===record.transactionId);
   if(!tx||tx.type!=='earn'||tx.activityId!==record.id||tx.species!==record.species||tx.xp!==record.xp||tx.coins!==record.coins||record.control==='watch'&&(record.coins!==0||record.xp>10))fail('Local activity does not match ledger.');
   evidence(record.evidence);if(record.evidence?.cleanChains>Math.floor(record.hits/3))fail('Verified chains exceed actual contacts.');seen.add(record.id);
  }
 }
 function validate(g,p){
  if(g&&g.version!==1)fail('Incompatible game version.');
  if(!g||g.version!==1||!g.school||typeof g.school.name!=='string'||!g.school.name.trim()||cleanName(g.school.name)!==g.school.name||g.school.name.length>48||!['sun','paw','shield','star'].includes(g.school.crest)||!['balance','precision','courage','patience'].includes(g.school.philosophy))fail('Invalid school.');
  if(g.venue===undefined)g.venue='default';if(!venueIds.includes(g.venue))fail('Invalid arena style.');
  const list=(a,max,predicate)=>Array.isArray(a)&&a.length<=max&&new Set(a).size===a.length&&a.every(predicate);
  if(!list(g.inventory,16,x=>catalog.some(c=>c.id===x))||slots.some(s=>!g.inventory.includes(g.equipment?.[s])||!catalog.some(c=>c.id===g.equipment[s]&&c.slot===s)))fail('Invalid inventory.');
  if(!g.combos||!list(g.combos.owned,combos.length,x=>combos.some(c=>c.id===x))||!list(g.combos.training,5,x=>g.combos.owned.includes(x))||!list(g.combos.fight,3,x=>g.combos.owned.includes(x)))fail('Invalid combo loadout.');
  if(!g.activity||!['completed','rope','fights','defences','hits','seconds'].every(k=>integer(g.activity[k])))fail('Invalid activity counters.');
  if(!list(g.processed,20000,x=>typeof x==='string'&&x.length>0&&x.length<=120)||!list(g.quests,quests.length,x=>quests.some(q=>q.id===x)))fail('Invalid activity history.');
  if(!Array.isArray(g.ledger)||g.ledger.length>20020)fail('Invalid ledger.');
  const seen=new Set();let coins=0,xp=0;
  for(const t of g.ledger){if(!t||typeof t.id!=='string'||t.id.length>240||seen.has(t.id)||!['baseline','earn','spend','grant'].includes(t.type)||!Number.isSafeInteger(t.coins)||Math.abs(t.coins)>1e6||!integer(t.xp,1e8)||typeof t.rule!=='string'||(t.type==='spend'?(t.coins>=0||t.xp!==0):t.coins<0)||(t.type==='baseline'&&t.coins!==0)||(t.type==='grant'&&(t.coins!==0||t.xp!==0||t.rule!==grantRule||!/^(purchase|accessory):/.test(t.id))))fail('Invalid ledger transaction.');seen.add(t.id);coins+=t.coins;xp+=t.xp;if(coins<0)fail('Negative coin balance.');}
  if(xp!==p.boxers.lion.xp+p.boxers.rabbit.xp||!g.ledger.length||g.ledger[0].type!=='baseline')fail('XP ledger does not match career.');
  for(const event of g.processed)if(!seen.has('reward:'+event))fail('Missing reward transaction.');
  for(const t of g.ledger)if(t.comboId!==undefined||t.id.startsWith('purchase:combo:')){const c=combos.find(c=>c.id===t.comboId);if(!c||t.id!==comboPurchase(c.id)||!(t.type==='grant'||c.price&&t.type==='spend'&&t.coins===-c.price&&t.rule==='combo-shop-v1')||!g.combos.owned.includes(c.id))fail('Invalid combo purchase.');}
  for(const t of g.ledger)if(t.id.startsWith('story:')||t.rule==='story-reward-v1'){const step=t.id.slice(6);if(!(step in storyRewards)||!exactKeys(t,['id','type','coins','xp','rule','storyStep'])||t.storyStep!==step||t.type!=='earn'||t.coins!==storyRewards[step]||t.xp!==0||t.rule!=='story-reward-v1')fail('Invalid story reward.');}
 for(const t of g.ledger)if(t.id.startsWith('purchase:finisher:')||t.rule==='finisher-shop-v1'){const item=finishers.find(x=>finisherPurchase(x.id)===t.id);if(!item||t.finisherId!==item.id||!(t.type==='grant'||t.type==='spend'&&t.coins===-item.price&&t.rule==='finisher-shop-v1'))fail('Invalid finisher purchase.');}
 for(const t of g.ledger)if(t.id.startsWith('purchase:gear:')||t.rule==='gear-shop-v1'){const item=gear.find(x=>gearPurchase(x.id)===t.id);if(!item||t.gearId!==item.id||!(t.type==='grant'||t.type==='spend'&&t.coins===-item.price&&t.rule==='gear-shop-v1'))fail('Invalid gear purchase.');}
 for(const t of g.ledger)if(t.rule===lesson.rule||t.lessonId!==undefined||t.id.startsWith('lesson:')){const c=combos.find(c=>c.id===t.lessonId);if(!c||!exactKeys(t,['id','type','coins','xp','rule','lessonId','evidence'])||t.id!==lessonId(c.id)||t.type!=='earn'||t.coins!==lesson.coins||t.xp!==0||t.rule!==lesson.rule||!g.combos.owned.includes(c.id))fail('Invalid lesson reward.');lessonEvidence(c,t.evidence);}
  for(const c of combos)if(g.combos.owned.includes(c.id)&&g.activity[c.key]<c.target&&!seen.has(comboPurchase(c.id))&&!seen.has(lessonId(c.id)))fail('Invalid combo unlock.');
  validateHistory(g);if(accessories){if(!g.accessories)g.accessories=accessories.fresh();accessories.validate(g.accessories,g.ledger);}
  if(worldRules){if(g.world===undefined)g.world=worldRules.fresh(p.id);worldRules.validate(g.world,g);}
  if(iqRules){if(g.learning===undefined)g.learning=iqRules.fresh();iqRules.validate(g.learning,g.ledger);}
  if(adventureRules){if(g.adventure===undefined)g.adventure=adventureRules.fresh();adventureRules.validate(g.adventure);}
  if(g.cup!==undefined&&!cupRules)fail('Local cup rules are unavailable. Saved progress is preserved.');
  if(cupRules){if(g.cup===undefined)g.cup=cupRules.fresh();cupRules.validate(g.cup,{history:g.history,ledger:g.ledger});}
  return g;
 }
 function action(g,a,p){
  if(!a||typeof a!=='object')fail('Invalid action.');
  if(a.type==='cup'){if(!cupRules||!p)fail('Local cups are unavailable.');if(!['start','resume','bind','abandon'].includes(a.cupAction))fail('Unknown cup action.');if(!g.cup)g.cup=cupRules.fresh();const result=cupRules.action(g.cup,{...a,type:a.cupAction},{profileId:p.id,history:g.history,ledger:g.ledger});if(a.cupAction==='bind'&&g.world)g.world.opportunity=null;return result;}
  if(a.type==='iq'){if(!iqRules||!p||!species.includes(a.species))fail('Learning is unavailable.');if(g.ledger.length>=20015)fail('History is full. Export a backup.');if(!g.learning)g.learning=iqRules.fresh();const result=iqRules.apply(g.learning,{...a,type:a.iqAction,usernameProfileId:p.id});if(result.transaction){g.ledger.push({...result.transaction,species:a.species});p.boxers[a.species].xp+=result.earnedXP;}return result;}
  if(a.type==='venue'){if(!venueIds.includes(a.venueId))fail('Unknown arena style.');g.venue=a.venueId;return {venueId:g.venue};}
  if(a.type==='accessory'){if(!accessories)fail('Accessories unavailable.');return accessories.action(g,{...a,free:freeMode()});}
  if(a.type==='adventure'&&a.adventure==='story'){if(!adventureRules)fail('Adventure rules are unavailable.');return storyAction(g,a);}
  if(a.type==='adventure'){if(!adventureRules)fail('Adventure rules are unavailable.');return adventureRules.action(g,a,freeMode());}
  if(a.type==='world'){if(!worldRules)fail('World rules are unavailable.');return worldRules.action(g,a);}
  if(a.type==='buy'){const item=catalog.find(c=>c.id===a.itemId);if(!item||!item.price)fail('Choose a shop item.');if(g.inventory.includes(item.id))fail('Already owned.');const free=freeMode();if(!free&&wallet(g).coins<item.price)fail('Not enough coins. Complete training or a quick fight to earn coins.');g.ledger.push(free?grant('purchase:'+item.id,{itemId:item.id}):{id:'purchase:'+item.id,type:'spend',coins:-item.price,xp:0,itemId:item.id,rule:'shop-v1'});g.inventory.push(item.id);return {itemId:item.id,transactionId:'purchase:'+item.id,free};}
  if(a.type==='equip'){const item=catalog.find(c=>c.id===a.itemId);if(!slots.includes(a.slot)||item?.slot!==a.slot||!g.inventory.includes(a.itemId))fail('Own a compatible item for this slot first.');g.equipment[a.slot]=a.itemId;return {itemId:a.itemId};}
  if(a.type==='combo-buy'){const c=combos.find(c=>c.id===a.comboId);if(!c)fail('Choose a combination.');if(g.combos.owned.includes(c.id))fail('Already owned.');const free=freeMode();if(!free&&!c.price)fail('This combination is earned by completing your first activity.');if(!free&&wallet(g).coins<c.price)fail('Not enough coins. Complete training or a quick fight to earn coins.');if(g.ledger.length>=20015)fail('History is full. Export a backup.');g.ledger.push(free?grant(comboPurchase(c.id),{comboId:c.id}):{id:comboPurchase(c.id),type:'spend',coins:-c.price,xp:0,comboId:c.id,rule:'combo-shop-v1'});g.combos.owned.push(c.id);return {comboId:c.id,transactionId:comboPurchase(c.id),free};}
  if(a.type==='finisher-buy'){const f=finishers.find(x=>x.id===a.finisherId);if(!f)fail('Choose a finisher.');if(ownsFinisher(g,f.id))fail('Already owned.');const free=freeMode();if(!free&&wallet(g).coins<f.price)fail('Not enough coins. Complete training or a quick fight to earn coins.');if(g.ledger.length>=20015)fail('History is full. Export a backup.');const id=finisherPurchase(f.id);g.ledger.push(free?grant(id,{finisherId:f.id}):{id,type:'spend',coins:-f.price,xp:0,finisherId:f.id,rule:'finisher-shop-v1'});return {finisherId:f.id,transactionId:id,free};}
  if(a.type==='lesson'){const c=combos.find(c=>c.id===a.comboId);if(!c)fail('Choose a lesson.');const proof=lessonEvidence(c,a.evidence),id=lessonId(c.id),first=!g.ledger.some(t=>t.id===id),unlocked=!g.combos.owned.includes(c.id),equipped=[];
   if(first){if(g.ledger.length>=20015)fail('History is full. Export a backup.');g.ledger.push({id,type:'earn',coins:lesson.coins,xp:0,rule:lesson.rule,lessonId:c.id,evidence:proof});if(unlocked)g.combos.owned.push(c.id);
    // A newly learned combo goes straight into free loadout slots so it can be used at once.
    for(const [mode,max] of [['training',5],['fight',3]])if(!g.combos[mode].includes(c.id)&&g.combos[mode].length<max){g.combos[mode].push(c.id);equipped.push(mode);}}
   return {comboId:c.id,first,unlocked:first&&unlocked,coins:first?lesson.coins:0,equipped,loadout:{training:g.combos.training.includes(c.id),fight:g.combos.fight.includes(c.id)},...(first?{transactionId:id}:{})};}
  if(a.type==='combo'){const c=combos.find(c=>c.id===a.comboId);if(!c||!g.combos.owned.includes(c.id)||!c.allowedModes.includes(a.mode)||typeof a.enabled!=='boolean'||(a.species&&!c.species.includes(a.species)))fail('Combo is locked or incompatible.');const load=g.combos[a.mode],index=load.indexOf(c.id);if(a.enabled&&index<0){if(load.length>=(a.mode==='fight'?3:5))fail('All combo slots are full.');load.push(c.id);}else if(!a.enabled&&index>=0)load.splice(index,1);return {comboId:c.id};}
  if(a.type==='school'){g.school={name:cleanName(a.name),crest:a.crest,philosophy:a.philosophy};return {school:g.school};}
  fail('Unknown game action.');
 }
 // Story events (GOTR-0078). The street and Docks fights pay their fixed reward once; buy_heavy_bag charges the bag (a grant in the
 // development build, like every Shop item) and is finished by the purchase. The order rule is checked before any coin moves.
 function storyAction(g,a){
  if(!g.adventure)g.adventure=adventureRules.fresh();adventureRules.migrate(g.adventure);adventureRules.storyReady(g,a.step,freeMode());
  const extra={};
  if(a.step in storyRewards&&a.outcome==='won'){const id=storyRewardId(a.step);if(!g.ledger.some(t=>t.id===id)){if(g.ledger.length>=20015)fail('History is full. Export a backup.');g.ledger.push({id,type:'earn',coins:storyRewards[a.step],xp:0,rule:'story-reward-v1',storyStep:a.step});extra.coins=storyRewards[a.step];extra.transactionId=id;}else extra.coins=0;}
  const item=gear.find(x=>x.step===a.step);
  if(item&&!ownsGear(g,item.id)){const free=freeMode();if(!free&&wallet(g).coins<item.price)fail('Not enough coins.');if(g.ledger.length>=20015)fail('History is full. Export a backup.');g.ledger.push(free?grant(gearPurchase(item.id),{gearId:item.id}):{id:gearPurchase(item.id),type:'spend',coins:-item.price,xp:0,gearId:item.id,rule:'gear-shop-v1'});extra.spent=free?0:item.price;extra.gearId=item.id;extra.free=free;}
  return {...adventureRules.action(g,{adventure:'story',step:a.step,outcome:a.outcome},freeMode()),...extra};
 }
 function reward(g,event,xp,quality,profileId){
  const active=event.control!=='watch',coins=active?Math.max(1,Math.round(Math.min(event.mode==='fight'?100:60,event.seconds)*(.42+.16*quality)*(event.mode==='fight'?fightPay[event.result]||1:1))):0;
  const transactionId='reward:'+event.id;g.ledger.push({id:transactionId,type:'earn',coins,xp,species:event.species,activityId:event.id,rule:active?'activity-v1':'watch-v1'});g.processed.push(event.id);
  const record={id:event.id,transactionId,mode:event.mode,species:event.species,control:event.control||'play',seconds:event.seconds,hits:event.hits,attempts:event.attempts,defences:event.defences,jumps:event.jumps,result:event.mode==='fight'?event.result:null,xp,coins};if(event.evidence!==undefined)record.evidence=evidence(event.evidence);g.history.push(record);g.history=g.history.slice(-50);
  const unlocks=[];
  if(active){const a=g.activity;a.completed++;a.seconds+=Math.floor(event.seconds);a.hits+=event.hits;a.defences+=event.defences;if(event.mode==='rope')a.rope++;if(event.mode==='fight')a.fights++;for(const c of combos)if(a[c.key]>=c.target&&!g.combos.owned.includes(c.id)){g.combos.owned.push(c.id);unlocks.push(c.id);}for(const q of quests)if(a[q.key]>=q.target&&!g.quests.includes(q.id))g.quests.push(q.id);}
  if(worldRules)worldRules.record(g,record);
  const cup=cupRules&&g.cup?cupRules.action(g.cup,{type:'record',matchId:event.id},{profileId,history:g.history,ledger:g.ledger}):undefined;
  return {coins,unlocks,activityId:event.id,transactionId,record,...(cup&&!cup.ignored?{cup}:{})};
 }
 const lessonPassed=(g,id)=>!!g?.ledger.some(t=>t.id===lessonId(id));
 const api={finishers,finisherPurchase,ownsFinisher,finishersOwned,gear,storyRewards,gearPurchase,ownsGear,freeMode,fightPay,venueIds,catalog,combos,quests,slots,species,fresh,wallet,validate,action,reward,evidence,cleanName,lesson,lessonPassed};if(typeof module!=='undefined')module.exports=api;else window.GameDomain=api;
})();
