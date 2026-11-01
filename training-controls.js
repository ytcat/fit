/* Continuous practice: equipment, routine selection, speed and pause. */
(() => {
 const text={
  en:{target:'Target',none:'Shadowboxing',heavy:'Heavy bag',dummy:'Body dummy',speed:'Speed bag',rabbit:'Rabbit boxer',combos:'Combinations',close:'Close',title:'Choose your training partner',routine:'Choose a combination',next:'Next',incoming:'Incoming',rhythm:'Alternating speed-bag rhythm',hints:{none:'Practise freely without a target.',heavy:'Suspended leather bag with damped swing.',dummy:'Head and torso on an adjustable stem and weighted base.',speed:'Pear-shaped bag, swivel and rebound platform. Rhythm drill.',rabbit:'Partner drills: slip the jab, roll under the hook, then counter.'}},
  he:{target:'מטרה',none:'אגרוף צל',heavy:'שק כבד',dummy:'בובת גוף',speed:'שק מהירות',rabbit:'ארנב מתאגרף',combos:'שילובים',close:'סגירה',title:'בחירת שותף לאימון',routine:'בחירת שילוב',next:'הבא',incoming:'מכה נכנסת',rhythm:'קצב שק מהירות בידיים לסירוגין',hints:{none:'תרגול חופשי ללא מטרה.',heavy:'שק עור תלוי עם תנודה נחלשת.',dummy:'ראש וגו על מוט מתכוונן ובסיס כבד.',speed:'שק בצורת אגס, ציר ומשטח החזרה. תרגול קצב.',rabbit:'תרגול זוגי: התחמקות מג׳אב, מעבר מתחת להוק ותגובת נגד.'}},
  ru:{target:'Цель',none:'Бой с тенью',heavy:'Тяжёлый мешок',dummy:'Манекен',speed:'Скоростная груша',rabbit:'Кролик-боксёр',combos:'Комбинации',close:'Закрыть',title:'Выберите партнёра',routine:'Выберите комбинацию',next:'Далее',incoming:'Атака',rhythm:'Ритм на скоростной груше',hints:{none:'Свободная практика без цели.',heavy:'Подвесной мешок с затухающим раскачиванием.',dummy:'Голова и торс на стойке с утяжелённым основанием.',speed:'Груша на шарнире под отбойной платформой. Ритм.',rabbit:'Парная работа: уклон от джеба, нырок под хук и ответ.'}}
 };
 const icons={none:'<path d="M8 30l4-13 8-5 7 8 7-6M12 17l-5-6m13 1 1-8m-4 20-7 12m14-14 7 14"/>',heavy:'<path d="M20 2v6m-9 4 9-5 9 5"/><rect x="10" y="12" width="20" height="25" rx="6"/><path d="M10 20h20m-20 10h20"/>',dummy:'<ellipse cx="20" cy="9" rx="6" ry="7"/><path d="M15 16 8 20l3 11h18l3-11-7-4M20 31v5m-9 2h18"/>',speed:'<path d="M5 5h30M20 5v6m0 0c-3 8-8 9-8 16a8 8 0 0016 0c0-7-5-8-8-16z"/>',rabbit:'<ellipse cx="14" cy="10" rx="3" ry="9"/><ellipse cx="25" cy="10" rx="3" ry="9"/><path d="M10 23a10 10 0 1020 0M10 32l-6 5m26-5 6 5"/><circle cx="16" cy="24" r="1"/><circle cx="24" cy="24" r="1"/>'};
 function boot(){
  const app=window.app;if(!app)return;const e=app.engine,w=()=>text[app.lang]||text.en;
  const make=(tag,cls,label)=>{const n=document.createElement(tag);n.className=cls;if(label)n.textContent=label;return n;};
  const footer=document.querySelector('footer'),bar=make('div','training-bar');bar.id='trainingBar';
  const target=make('button','workout-tool'),combo=make('button','workout-tool');target.id='equipmentBtn';combo.id='combinationBtn';target.type=combo.type='button';
  const speed=document.getElementById('speedBtn');speed.className='workout-tool training-speed';
  bar.append(target,combo,speed);footer.prepend(bar);
  const words=()=>{const n={en:1,he:3,ru:5}[app.lang];return m=>COACH_TECHNIQUES[m]?.[n]||m;};
  function paint(){
   const mode=e.targetMode||'none';target.textContent=w()[mode];target.setAttribute('aria-label',w().target+': '+w()[mode]);
   target.setAttribute('aria-haspopup','dialog');combo.textContent=w().combos;combo.disabled=mode==='speed';
   speed.setAttribute('aria-label',({en:'Playback speed',he:'מהירות תנועה',ru:'Скорость'}[app.lang])+': '+e.speed+'×');
   document.querySelectorAll('[data-technique]').forEach(b=>{b.disabled=mode==='speed';});app.updatePlayBtnText();
  }
  function dialog(title){
   const d=make('dialog','training-dialog');const head=make('div','practice-control-heading');head.append(make('h2','',title));
   const close=make('button','', '×');close.type='button';close.setAttribute('aria-label',w().close);close.onclick=()=>d.close();head.append(close);d.append(head);
   d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);return d;
  }
  function chooseTarget(mode){
   e.targetMode=mode;
   if(mode==='speed'){
    e.technique='speedbag';e.animTime=0;e.isPlaying=true;
   }else if(e.technique==='speedbag'){
    app.drillIdx=0;app.renderDrill();
   }
   const hasDefence=e.technique==='combo'?BOXING_ROUTINES.sequences[e.currentAnim]?.some(m=>m==='slip'||m==='roll'):['slip','roll'].includes(e.technique);
   if(mode==='rabbit'&&!hasDefence){
    app.drillIdx=BOXING_ROUTINES.list.findIndex(r=>r.id==='sparring_flow');app.renderDrill();
   }
   e.arena?.setTarget(mode);paint();
  }
  target.onclick=()=>{
   const d=dialog(w().title),grid=make('div','equipment-grid');
   for(const mode of ['none','heavy','dummy','speed','rabbit']){
    const b=make('button','equipment-choice');b.type='button';b.dataset.target=mode;b.setAttribute('aria-pressed',String((e.targetMode||'none')===mode));
    const icon=make('span','equipment-icon');icon.innerHTML='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+icons[mode]+'</svg>';
    b.append(icon,make('strong','',w()[mode]),make('span','equipment-hint',w().hints[mode]));b.onclick=()=>{chooseTarget(mode);d.close();};grid.append(b);
   }d.append(grid);d.showModal();
  };
  combo.onclick=()=>{
   const d=dialog(w().routine),grid=make('div','routine-grid');
   BOXING_ROUTINES.list.forEach((r,index)=>{
    const b=make('button','routine-choice');b.type='button';b.dataset.routine=r.id;b.setAttribute('aria-pressed',String(e.technique==='combo'&&e.currentAnim===r.id));
    b.append(make('strong','',r.names[{en:0,he:1,ru:2}[app.lang]]),make('span','',r.moves.map(words()).join(' → ')));
    b.onclick=()=>{app.drillIdx=index;app.renderDrill();e.isPlaying=true;paint();d.close();};grid.append(b);
   });d.append(grid);d.showModal();
  };
  speed.onclick=()=>{
   const d=dialog({en:'Playback speed',he:'מהירות תנועה',ru:'Скорость'}[app.lang]),grid=make('div','speed-grid');
   for(const rate of BOXING_ROUTINES.speeds){
    const b=make('button','workout-tool',rate+'×');b.type='button';b.setAttribute('aria-pressed',String(e.speed===rate));
    b.onclick=()=>{e.speed=rate;app.speedIdx=BOXING_ROUTINES.speeds.indexOf(rate);speed.textContent=rate+'×';paint();d.close();};grid.append(b);
   }d.append(grid);d.showModal();
  };
  // Keep all existing transport controls consistent with continuous playback.
  const pause=document.getElementById('motionPause'),freeze=pause.onclick;
  pause.onclick=()=>{freeze?.();paint();};
  document.querySelectorAll('[data-technique]').forEach(b=>b.addEventListener('click',paint));
  const camera=(id,yaw,solo)=>{document.getElementById(id).onclick=()=>{
   if(e.arena&&e.arena.mode!=='none'){e.arena.group.rotation.y=yaw;e.arena.fitCamera(e.camera);}
   else if(e.activeModel){e.activeModel.rotation.y=solo;e.fitCameraToModel(e.activeModel);}
  };};
  camera('camFront',.78,-.32);camera('camSide',Math.PI/2,1.15);camera('camBack',Math.PI+.78,Math.PI);
  const language=app.setLanguage.bind(app);app.setLanguage=lang=>{language(lang);paint();};
  setInterval(()=>{
   const mode=e.targetMode||'none';if(mode==='speed'){
    document.getElementById('comboCodes').textContent='↻';document.getElementById('comboCues').textContent=w().rhythm;return;
   }
   const f=BOXING_ROUTINES.frame(e.animTime,e.technique,e.currentAnim),counter=BOXING_ROUTINES.opponent(f),name=words();
   const incoming=mode==='rabbit'&&counter.attack?w().incoming+' '+name(counter.move)+' → ':'';
   const next=f.moves[(f.slot+1)%f.moves.length];
   document.getElementById('comboCues').textContent=incoming+name(f.move)+(f.moves.length>1?' · '+w().next+': '+name(next):'');
  },120);
  window.trainingControls={chooseTarget};paint();
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
