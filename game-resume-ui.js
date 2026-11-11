/* Explicit station return. A checkpoint is navigation, never an unfinished activity. */
(() => {
 const copy={en:{title:'Your last station',resume:'Return to station',help:'Go back to this station. Start a new 15-second session when you are ready.',fight:'Finish this bout before changing station.'},he:{title:'התחנה האחרונה שלכם',resume:'חזרה לתחנה',help:'חזרה לתחנה הזאת. מתחילים אימון חדש של 15 שניות כשאתם מוכנים.',fight:'סיימו את הקרב לפני החלפת תחנה.'},ru:{title:'Последняя станция',resume:'Вернуться на станцию',help:'Вернитесь на эту станцию. Начните новое занятие на 15 секунд, когда будете готовы.',fight:'Завершите бой перед сменой станции.'}};
 const modeNames={en:{none:'Shadowboxing',heavy:'Heavy bag',dummy:'Body dummy',speed:'Speed bag',rope:'Jump rope',pads:'Coach mitts',rabbit:'Sparring'},he:{none:'אגרוף צל',heavy:'שק כבד',dummy:'בובת גוף',speed:'כדור מהירות',rope:'חבל',pads:'כפפות מאמן',rabbit:'ספארינג'},ru:{none:'Бой с тенью',heavy:'Тяжёлый мешок',dummy:'Манекен',speed:'Скоростная груша',rope:'Скакалка',pads:'Лапы',rabbit:'Спарринг'}};
 function attach({e,store,app,el,button,startTraining}){
  let storage;try{storage=localStorage;}catch{}const checkpoints=new GameResume.Store(storage,{profileIds:()=>store.data.profiles.map(p=>p.id)});
  const signature=()=>JSON.stringify([e.targetMode||'none',e.coach?.species,e.technique,e.currentAnim,e.player?.enabled]);
  let observedProfile=store.current()?.id,baseline=signature(),dirty=false,ready=!!e.coach;
  // Merely opening or leaving a refreshed page must not overwrite the user's saved station with boot defaults.
  function observe(){if(!e.coach)return false;const profileId=store.current()?.id;if(!ready){ready=true;observedProfile=profileId;baseline=signature();dirty=false;return false;}if(profileId!==observedProfile){observedProfile=profileId;baseline=signature();dirty=false;return false;}if(signature()!==baseline)dirty=true;return dirty;}
  function capture(record){
   const p=store.current(),mode=e.targetMode||'none';if(!p||!e.coach||record&&record.profileId!==p.id)return {ok:false};if(mode==='fight')return {ok:true,ignored:true};
   const descriptor={kind:'training',mode,species:e.coach.species,technique:e.technique,clip:e.currentAnim,control:e.player?.enabled?'play':'coach'};
   if(record&&record.mode===mode&&store.game().history.some(r=>r.id===record.id))descriptor.completedRecordId=record.id;
   const result=checkpoints.capture(p.id,descriptor);if(result.ok){observedProfile=p.id;baseline=signature();dirty=false;}return result;
  }
  function captureIfChanged(){return observe()?capture():{ok:true,ignored:true};}
  function render(host){
   observe();const profileId=store.current()?.id,saved=checkpoints.lookup(profileId);if(saved.kind!=='training')return;
   const lang=app.lang||'en',w=copy[lang]||copy.en,card=el('section','game-section game-world-hero game-station-resume');card.append(el('h3','',w.title),el('strong','',(modeNames[lang]||modeNames.en)[saved.mode]),el('p','game-muted',w.help));
   const active=e.targetMode==='fight'&&!e.arena?.fightView?.match.result,b=button(w.resume,()=>{if(store.current()?.id!==profileId||e.targetMode==='fight'&&!e.arena?.fightView?.match.result)return;const current=checkpoints.lookup(profileId);if(current.kind!=='training')return;startTraining({mode:current.mode,technique:current.technique,clip:current.clip,play:current.control==='play',setupOnly:true});});b.disabled=active;card.append(b);if(active)card.append(el('p','game-muted',w.fight));host.firstChild.after(card);
  }
  window.addEventListener('pagehide',captureIfChanged);return {capture,captureIfChanged,observe,render,checkpoints};
 }
 window.GameResumeUI={attach};
})();
