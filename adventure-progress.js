/* Gloryland adventure progression core (GOTR-0008 slice B): chapters, missions, stars, stats, Fighter Level, boss gate.
   Integrity style matches game-domain.js: only verifiable facts are stored (best measured value per mission, boss results);
   stars, stats and level are always derived and re-checked on load, so forged derived values are rejected.
   Works in node and the browser. Schema validation, not server verification. */
(() => {
 const L=(en,he,ru)=>({en,he,ru}),fail=message=>{throw Error(message);};
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 const freeMode=()=>globalThis.APP_VERSION?.channel==='dev';
 const rules=Object.freeze({version:1,maxStat:10,startStat:1,starsPerLevel:3,bigGapLevels:5,maxEdgeLevels:5,impactPerPower:.02,speedPerSpeed:.015,staminaPerStamina:.03,trainingStatPoints:'+1 on the stat of each training mission that has 3 stars'});
 const stats=['power','speed','stamina'];
 // Measurable values the game already produces. lower=true means fewer/shorter is better.
 const metrics=freeze({cleanHits:{lower:false},landed:{lower:false},dodges:{lower:false},seconds:{lower:false},secondsToFinish:{lower:true},combos:{lower:false},powerMarks:{lower:false},guards:{lower:false},marks:{lower:false},bodyHits:{lower:false},hitsTaken:{lower:true},mistakes:{lower:true},wins:{lower:false}});
 const chapters=freeze([
  {id:1,key:'old_town',time:'morning',names:L('Old Town','העיר העתיקה','Старый город'),subtitle:L('Beginner training','אימון מתחילים','Первые тренировки'),places:['home_gym'],coach:'pip',boss:'brick'},
  {id:2,key:'market_row',time:'evening',names:L('Market Row','שדרת השוק','Рыночный ряд'),subtitle:L('The street','הרחוב','Улица'),places:['street_fight'],coach:'vix',boss:'king_hyena'},
  {id:3,key:'the_docks',time:'night',names:L('The Docks','הנמל','Доки'),subtitle:L('The underground','המחתרת','Подполье'),places:['basement','dockside_hangar'],coach:'tusk',boss:'iron_bull'},
  {id:4,key:'downtown',time:'neon',names:L('Downtown','מרכז העיר','Даунтаун'),subtitle:L('Rising','בדרך למעלה','Восхождение'),places:['boxing_club','city_sports_hall','neon_strip','harbor_dome'],coach:'kip',boss:'onyx'},
  {id:5,key:'glory_hill',time:'stadium',names:L('Glory Hill','גבעת התהילה','Холм славы'),subtitle:L('The championship','האליפות','Чемпионат'),places:['championship_arena'],coach:'tembo',boss:'blaze'}
 ]);
 const bosses=freeze([
  {id:'brick',chapter:1,entry:5,names:L('Brick, the gym bully','בריק, הבריון של האולם','Брик, задира зала')},
  {id:'king_hyena',chapter:2,entry:12,names:L('King Hyena','מלך הצבועים','Король гиен')},
  {id:'iron_bull',chapter:3,entry:20,names:L('The Iron Bull','שור הברזל','Железный бык')},
  {id:'onyx',chapter:4,entry:30,names:L('Onyx, city champion','אוניקס, אלוף העיר','Оникс, чемпион города')},
  {id:'blaze',chapter:5,entry:40,names:L('Blaze, world champion','בלייז, אלוף העולם','Блейз, чемпион мира')}
 ]);
 // M(id, chapter, place, type, stat (training only), metric, [1,2,3 star thresholds], titles EN/HE/RU)
 const M=(id,chapter,place,type,stat,metric,t,en,he,ru)=>({id,chapter,place,type,stat,metric,thresholds:t,titles:L(en,he,ru)});
 const missions=freeze([
  M('first_stance',1,'home_gym','training','stamina','guards',[1,2,3],'First stance','עמידת פתיחה','Первая стойка'),
  M('one_two_mitts',1,'home_gym','training','speed','cleanHits',[8,14,20],'One-two on the mitts','ימין-שמאל על הכפות','Двойка на лапах'),
  M('bag_power',1,'home_gym','training','power','powerMarks',[1,3,5],'Bag power test','מבחן כוח בשק','Проверка силы на мешке'),
  M('roll_under_hook',1,'home_gym','training','speed','dodges',[4,7,10],'Roll under the hook','גלגול מתחת לאגרוף עקום','Нырок под боковой'),
  M('rope_rhythm',1,'home_gym','training','stamina','seconds',[10,20,30],'Rope rhythm','קצב חבל','Ритм скакалки'),
  M('heavy_bag_van',1,'home_gym','funny',null,'mistakes',[5,2,0],'The new heavy bag','השק הכבד החדש','Новый тяжёлый мешок'),
  M('teach_the_kid',1,'home_gym','help',null,'combos',[1,2,3],'Teach the kid a one-two','ללמד את הילד ימין-שמאל','Научить малыша двойке'),
  M('morning_sparring',1,'home_gym','training','power','landed',[5,10,15],'Morning sparring','ספארינג בוקר','Утренний спарринг'),
  M('snoring_guard',1,'home_gym','funny',null,'dodges',[3,6,9],'The snoring night guard','שומר הלילה המנחר','Храпящий ночной сторож'),
  M('curb_footwork',2,'street_fight','training','speed','marks',[5,8,12],'Curb footwork','עבודת רגליים על המדרכה','Работа ног у бордюра'),
  M('rooftop_balloons',2,'street_fight','funny',null,'dodges',[6,9,12],'Rooftop water balloons','בלוני מים מהגג','Водяные шарики с крыши'),
  M('whistle_chase',2,'street_fight','funny',null,'secondsToFinish',[40,30,20],"The coach's whistle",'משרוקית המאמן','Свисток тренера'),
  M('kids_skateboard',2,'street_fight','help',null,'bodyHits',[3,6,9],"The kid's skateboard",'הסקייטבורד של הילד','Скейтборд мальчишки'),
  M('grandma_groceries',2,'street_fight','help',null,'dodges',[4,8,12],"Grandma's groceries",'הקניות של סבתא','Продукты бабушки'),
  M('influencer_challenge',2,'street_fight','funny',null,'landed',[20,30,40],'The show-off influencer','המשפיען המתנשא','Хвастливый блогер'),
  M('clean_hands',2,'street_fight','training','stamina','hitsTaken',[4,2,0],'Clean hands','ידיים נקיות','Чистые руки'),
  M('crowd_circle',2,'street_fight','event',null,'wins',[1,2,3],'Crowd circle','מעגל הקהל','Круг зрителей'),
  M('rooftop_callout',2,'street_fight','event',null,'landed',[3,4,5],'Rooftop callout','אתגר על הגג','Вызов с крыши')
 ]);
 // GOTR-0055: each side zone is an optional bonus attached to a chapter; it shows once that chapter is reached. Data only: no rules, no saved state.
 const sideZones=freeze([{id:'fort',chapter:1},{id:'fair',chapter:2},{id:'cove',chapter:3},{id:'tech',chapter:4}]);
 const missionOf=id=>missions.find(m=>m.id===id),bossOf=id=>bosses.find(b=>b.id===id),chapterOf=n=>chapters.find(c=>c.id===n);
 const fresh=()=>({version:1,missions:{},bosses:{}});
 const bound=v=>Number.isFinite(v)&&v>=0&&v<=1e5;
 const round1=v=>Math.round(v*10)/10;
 // Stars for a measured value (0 = not yet earned).
 function starsFor(missionId,value){
  const m=missionOf(missionId);if(!m||!bound(value))return 0;const lower=metrics[m.metric].lower;
  return m.thresholds.reduce((n,t)=>n+((lower?value<=t:value>=t)?1:0),0);
 }
 const better=(m,a,b)=>metrics[m.metric].lower?a<b:a>b;
 const adv=g=>g?.adventure||null;
 const stars=g=>Object.values(adv(g)?.missions||{}).reduce((n,r)=>n+r.stars,0);
 function statPoints(g){
  const out={power:rules.startStat,speed:rules.startStat,stamina:rules.startStat};
  for(const [id,r] of Object.entries(adv(g)?.missions||{})){const m=missionOf(id);if(m?.stat)out[m.stat]+=r.stars===3?1:0;}
  for(const k of stats)out[k]=Math.min(rules.maxStat,out[k]);return out;
 }
 const level=g=>{const s=statPoints(g);return Math.floor(stars(g)/rules.starsPerLevel)+(s.power+s.speed+s.stamina-3*rules.startStat);};
 // Boss gate. Development build: everything open (levels and stars still compute).
 const bossWon=(g,id)=>(adv(g)?.bosses?.[id]?.wins||0)>0;
 const chapterOpen=(g,n,free=freeMode())=>!!chapterOf(n)&&(free||n===1||bossWon(g,chapterOf(n-1).boss));
 function canChallenge(g,bossId,free=freeMode()){const b=bossOf(bossId);return !!b&&(free||level(g)>=b.entry);}
 // Estimated win chance (%) against an opponent level: 50 at equal level, +7 per level above (max +5 levels = 85), -5 per level below (floor 5).
 function chanceVs(fighterLevel,opponentLevel){const d=fighterLevel-opponentLevel;const pct=d>=0?50+7*Math.min(d,rules.maxEdgeLevels):50+5*Math.max(d,-9);return Math.round(Math.max(5,Math.min(85,pct)));}
 const chance=(g,bossId)=>{const b=bossOf(bossId);return b?chanceVs(level(g),b.entry):null;};
 // Boss reaction/damage modifiers for slices C/D: each level above entry (max 5) = 3% slower reaction and 3% softer hits.
 function bossEdge(g,bossId){const b=bossOf(bossId);const k=b?Math.max(0,Math.min(rules.maxEdgeLevels,level(g)-b.entry)):0;return {levels:k,reaction:1+.03*k,damage:1-.03*k};}
 // Fight multipliers from stats. Exactly 1 when there is no adventure profile.
 function fightEdge(g){
  if(!adv(g))return {impact:1,speed:1,stamina:1};const s=statPoints(g),up=k=>s[k]-rules.startStat;
  return {impact:1+rules.impactPerPower*up('power'),speed:1+rules.speedPerSpeed*up('speed'),stamina:1+rules.staminaPerStamina*up('stamina')};
 }
 // Opponent level/score for existing rivals and cup opponents: base score on the 20-99 rating scale plus rival practice (0-100) x .2.
 const opponentBase=Object.freeze({shadow:32,ember:36,circuit:40,swift:44,anvil:48,forge:52});
 const levelFromScore=score=>Math.max(1,Math.round((score-20)/2.5));
 function opponent(id,practice=0){
  if(!(id in opponentBase))return null;const p=Number.isFinite(practice)?Math.max(0,Math.min(100,practice)):0,score=Math.round(opponentBase[id]+p*.2);
  return {id,score,level:levelFromScore(score)};
 }
 const fighterScore=ratings=>{const v=Object.values(ratings||{}).filter(Number.isFinite);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):20;};
 // GOTR-0042: both fighters side by side, estimated chance, and the big-gap flag (opponent >= 5 levels above the fighter).
 function compare(g,ratings,opponentId,practice=0){
  const o=opponent(opponentId,practice);if(!o)return null;const fl=level(g),gap=o.level-fl;
  return {fighter:{level:fl,score:fighterScore(ratings)},opponent:o,gap,big:gap>=rules.bigGapLevels,chance:chanceVs(fl,o.level)};
 }
 function summary(g,free=freeMode()){
  return {level:level(g),stars:stars(g),maxStars:missions.length*3,stats:statPoints(g),free,
   chapters:chapters.map(c=>({id:c.id,open:chapterOpen(g,c.id,free),boss:c.boss,bossWon:bossWon(g,c.boss),canChallenge:canChallenge(g,c.boss,free),chance:chance(g,c.boss)}))};
 }
 // Awards stars for a result and keeps the best. Replayable; a worse replay changes nothing but the play count.
 function recordMission(g,missionId,measured,free=freeMode()){
  const m=missionOf(missionId);if(!m)fail('Unknown mission.');if(!adv(g))g.adventure=fresh();
  if(!chapterOpen(g,m.chapter,free))fail('This chapter is not open yet.');
  const raw=measured&&typeof measured==='object'?measured[m.metric]:measured;if(!bound(raw))fail('Invalid measured value.');
  const value=round1(raw),earned=starsFor(m.id,value),rec=g.adventure.missions[m.id],before=rec?.stars||0,levelBefore=level(g);
  if(!rec){if(earned>0)g.adventure.missions[m.id]={stars:earned,value,plays:1};}
  else{rec.plays=Math.min(1e6,rec.plays+1);if(better(m,value,rec.value)){rec.value=value;rec.stars=earned;}}
  const best=g.adventure.missions[m.id]?.stars||0;
  return {missionId:m.id,stars:earned,best,improved:best>before,newStars:best-before,levelBefore,level:level(g)};
 }
 function recordBoss(g,bossId,won,free=freeMode()){
  const b=bossOf(bossId);if(!b)fail('Unknown boss.');if(!adv(g))g.adventure=fresh();
  if(typeof won!=='boolean')fail('Invalid boss result.');
  if(!canChallenge(g,bossId,free))fail('Reach Level '+b.entry+' to challenge this boss.');if(!chapterOpen(g,b.chapter,free))fail('This chapter is not open yet.');
  const r=g.adventure.bosses[bossId]||(g.adventure.bosses[bossId]={wins:0,losses:0,free:false});
  if(won){r.wins=Math.min(1e6,r.wins+1);if(free&&(level(g)<b.entry||!chapterOpen(g,b.chapter,false)))r.free=true;}else r.losses=Math.min(1e6,r.losses+1); // losing costs nothing
  return {bossId,won,wins:r.wins,losses:r.losses,nextChapterOpen:b.chapter<5&&bossWon(g,bossId)};
 }
 // GOTR-0062 scouting: one answer per try; once right, the boss's tell is marked in the fight and a notebook line is kept.
 // Story choices: one per chapter, made once after the chapter's boss is beaten, never lock content. Both are optional keys:
 // saves without them (every save before GOTR-0062) load unchanged and gain them on the first scout or choice.
 const choiceDefs=freeze({ch1:{chapter:1,boss:'brick',values:['handshake','walk']},ch2:{chapter:2,boss:'king_hyena',values:['let_go','turn_in']}});
 const scouted=(g,id)=>!!adv(g)?.scouting?.[id]?.correct,scoutTries=(g,id)=>adv(g)?.scouting?.[id]?.tries||0;
 const choice=(g,id)=>adv(g)?.choices?.[id]||null;
 function recordScout(g,bossId,correct,free=freeMode()){
  const b=bossOf(bossId);if(!b)fail('Unknown boss.');if(!adv(g))g.adventure=fresh();if(typeof correct!=='boolean')fail('Invalid scouting answer.');
  if(!chapterOpen(g,b.chapter,free))fail('This chapter is not open yet.');
  const all=g.adventure.scouting||(g.adventure.scouting={}),r=all[bossId]||(all[bossId]={correct:false,tries:0});
  r.tries=Math.min(1e6,r.tries+1);if(correct)r.correct=true;
  return {bossId,correct,scouted:r.correct,tries:r.tries};
 }
 function recordChoice(g,choiceId,value){
  const c=choiceDefs[choiceId];if(!c||!c.values.includes(value))fail('Unknown story choice.');if(!adv(g))g.adventure=fresh();
  if(!bossWon(g,c.boss))fail('Beat the chapter boss first.');
  const all=g.adventure.choices||(g.adventure.choices={});if(all[choiceId])fail('This choice is already made.');
  all[choiceId]=value;return {choiceId,value};
 }
 const object=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
 function validate(a){
  if(a?.version!==1)fail('Incompatible adventure version.');
  if(!object(a,['version','missions','bosses','scouting','choices'])||!object(a.missions,missions.map(m=>m.id))||!object(a.bosses,bosses.map(b=>b.id)))fail('Invalid adventure progress.');
  for(const [id,r] of Object.entries(a.missions)){
   if(!object(r,['stars','value','plays'])||!Number.isSafeInteger(r.plays)||r.plays<1||r.plays>1e6||!bound(r.value)||r.value!==round1(r.value)||!Number.isSafeInteger(r.stars)||r.stars<1||r.stars>3||starsFor(id,r.value)!==r.stars)fail('Mission stars do not match the recorded result.');}
  const g={adventure:a};
  for(const [id,r] of Object.entries(a.bosses)){const b=bossOf(id);
   if(!object(r,['wins','losses','free'])||![r.wins,r.losses].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e6)||typeof r.free!=='boolean'||r.free&&r.wins===0)fail('Invalid boss record.');
   if(r.wins>0&&!r.free){if(level(g)<b.entry)fail('Boss result does not match the Fighter Level.');if(b.chapter>1&&!a.bosses[bosses[b.chapter-2].id]?.wins)fail('Boss result skips an earlier chapter.');}}
  if(a.scouting!==undefined){if(!object(a.scouting,bosses.map(b=>b.id)))fail('Invalid scouting record.');
   for(const r of Object.values(a.scouting))if(!object(r,['correct','tries'])||typeof r.correct!=='boolean'||!Number.isSafeInteger(r.tries)||r.tries<1||r.tries>1e6)fail('Invalid scouting record.');}
  if(a.choices!==undefined){if(!object(a.choices,Object.keys(choiceDefs)))fail('Invalid story choice.');
   for(const [id,v] of Object.entries(a.choices))if(!choiceDefs[id].values.includes(v)||!bossWon(g,choiceDefs[id].boss))fail('Invalid story choice.');}
  return a;
 }
 // Save action used by game-domain.js: {type:'adventure',adventure:'mission',missionId,measured} | {type:'adventure',adventure:'boss',bossId,won}
 // | {type:'adventure',adventure:'scout',bossId,correct} | {type:'adventure',adventure:'choice',choiceId,value}.
 function action(g,a,free=freeMode()){
  if(a.adventure==='mission')return recordMission(g,a.missionId,a.measured,free);
  if(a.adventure==='boss')return recordBoss(g,a.bossId,a.won,free);
  if(a.adventure==='scout')return recordScout(g,a.bossId,a.correct,free);
  if(a.adventure==='choice')return recordChoice(g,a.choiceId,a.value);
  fail('Unknown adventure action.');
 }
 const api={sideZones,rules,stats,metrics,chapters,bosses,missions,opponentBase,fresh,validate,action,starsFor,stars,statPoints,level,chapterOpen,canChallenge,chance,chanceVs,bossEdge,fightEdge,opponent,levelFromScore,fighterScore,compare,summary,recordMission,recordBoss,bossWon,freeMode,choiceDefs,recordScout,recordChoice,scouted,scoutTries,choice};
 if(typeof module!=='undefined')module.exports=api;else window.AdventureProgress=api;
})();
