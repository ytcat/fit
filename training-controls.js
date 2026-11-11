/* Continuous practice: equipment, routine selection, speed and pause. */
(() => {
 const text={
  en:{target:'Target',none:'Shadowboxing',heavy:'Heavy bag',dummy:'Body dummy',speed:'Speed bag',rabbit:'Rabbit boxer',combos:'Combinations',close:'Close',title:'Choose your training partner',routine:'Choose a combination',next:'Next',incoming:'Incoming',rhythm:'Alternating speed-bag rhythm',hints:{none:'Practise freely without a target.',heavy:'Suspended leather bag with damped swing.',dummy:'Head and torso on an adjustable stem and weighted base.',speed:'Pear-shaped bag, swivel and rebound platform. Rhythm drill.',rabbit:'Partner drills: slip the jab, roll under the hook, then counter.'}},
  he:{target:'מטרה',none:'Shadowboxing',heavy:'שק כבד',dummy:'בובת גוף',speed:'שק מהירות',rabbit:'ארנב מתאגרף',combos:'שילובים',close:'סגירה',title:'בחירת שותף לאימון',routine:'בחירת שילוב',next:'הבא',incoming:'מכה נכנסת',rhythm:'קצב שק מהירות בידיים לסירוגין',hints:{none:'תרגול חופשי ללא מטרה.',heavy:'שק עור תלוי עם תנודה נחלשת.',dummy:'ראש וגו על מוט מתכוונן ובסיס כבד.',speed:'שק בצורת אגס, ציר ומשטח החזרה. תרגול קצב.',rabbit:'תרגול זוגי: התחמקות מג׳אב, מעבר מתחת להוק ותגובת נגד.'}},
  ru:{target:'Цель',none:'Shadowboxing',heavy:'Тяжёлый мешок',dummy:'Манекен',speed:'Скоростная груша',rabbit:'Кролик-боксёр',combos:'Комбинации',close:'Закрыть',title:'Выберите партнёра',routine:'Выберите комбинацию',next:'Далее',incoming:'Атака',rhythm:'Ритм на скоростной груше',hints:{none:'Свободная практика без цели.',heavy:'Подвесной мешок с затухающим раскачиванием.',dummy:'Голова и торс на стойке с утяжелённым основанием.',speed:'Груша на шарнире под отбойной платформой. Ритм.',rabbit:'Парная работа: уклон от джеба, нырок под хук и ответ.'}}
 };
 Object.assign(text.en,{slip:'Slip',random:'Random sparring',randomHint:'Both fighters take turns attacking and defending. New exchanges each session.',lion:'Lion',guard:'Guard'});
 Object.assign(text.he,{slip:'התחמקות',random:'קרב אקראי',randomHint:'שני הלוחמים תוקפים ומתגוננים בתיאום. רצף חדש בכל אימון.',lion:'אריה',guard:'הגנה'});
 Object.assign(text.ru,{slip:'Уклон',random:'Случайный спарринг',randomHint:'Оба бойца по очереди атакуют и защищаются. Новые серии каждый раз.',lion:'Лев',guard:'Защита'});
 Object.assign(text.en,{timing:'Practice rhythm',sync:'Synchronized',variable:'Variable',steadyLabel:'Steady rhythm',variableLabel:'Variable rhythm',fightRhythm:'Fight pacing',syncHelp:'Evenly paced repetitions and partner drills.',variableHelp:'Quick combinations, slower reads and unpredictable guard pauses.',read:'Read and reset'});
 Object.assign(text.he,{timing:'קצב תרגול',sync:'קבוע ומתואם',variable:'משתנה',steadyLabel:'קצב קבוע',variableLabel:'קצב משתנה',fightRhythm:'קצב קרב',syncHelp:'חזרות ותרגול זוגי בקצב קבוע.',variableHelp:'שילובים מהירים, קריאת היריב והפסקות הגנה משתנות.',read:'קריאה וחזרה להגנה'});
 Object.assign(text.ru,{timing:'Ритм тренировки',sync:'Равномерный',variable:'Переменный',steadyLabel:'Ровный ритм',variableLabel:'Свободный ритм',fightRhythm:'Ритм боя',syncHelp:'Равномерные повторения и упражнения с партнёром.',variableHelp:'Быстрые серии, чтение соперника и разные паузы в защите.',read:'Чтение и возврат в защиту'});
 Object.assign(text.en,{freestyle:'Random combinations',freestyleHint:'Fresh attack, defence and exit sequences. Choose steady or variable timing.'});
 Object.assign(text.he,{freestyle:'שילובים אקראיים',freestyleHint:'רצפי התקפה, הגנה ויציאה חדשים. קצב קבוע או משתנה.'});
 Object.assign(text.ru,{freestyle:'Случайные комбинации',freestyleHint:'Новые серии атак, защиты и отходов. Ровный или переменный ритм.'});
 text.en.fight='Fight mode';text.he.fight='מצב קרב';text.ru.fight='Режим боя';
 for(const lang of ['en','he','ru'])text[lang].hints.fight=({en:'Live rounds, real contacts, three scorecards and a rhino referee.',he:'סיבובים חיים, פגיעות, שלושה כרטיסי ניקוד ושופט קרנף.',ru:'Раунды, попадания, три судейские записки и рефери-носорог.'})[lang];
 for(const [lang,labels] of Object.entries({en:['Jump rope','Coach mitts','Light, rhythmic jumps build speed, footwork and stamina.','Jab, cross, roll under the trainer’s hook, and counter.'],he:['קפיצה בחבל','אימון כפפות','קפיצות קלות לשיפור עבודת רגליים וסיבולת.','ג׳אב, קרוס, התחמקות מהוק ומכת נגד.'],ru:['Скакалка','Лапы тренера','Ритм, скорость ног и выносливость.','Джеб, кросс, нырок под хук и ответ.']})){text[lang].rope=labels[0];text[lang].pads=labels[1];text[lang].hints.rope=labels[2];text[lang].hints.pads=labels[3];}
 const icons={none:'<path d="M8 30l4-13 8-5 7 8 7-6M12 17l-5-6m13 1 1-8m-4 20-7 12m14-14 7 14"/>',heavy:'<path d="M20 2v6m-9 4 9-5 9 5"/><rect x="10" y="12" width="20" height="25" rx="6"/><path d="M10 20h20m-20 10h20"/>',dummy:'<ellipse cx="20" cy="9" rx="6" ry="7"/><path d="M15 16 8 20l3 11h18l3-11-7-4M20 31v5m-9 2h18"/>',speed:'<path d="M5 5h30M20 5v6m0 0c-3 8-8 9-8 16a8 8 0 0016 0c0-7-5-8-8-16z"/>',rabbit:'<ellipse cx="14" cy="10" rx="3" ry="9"/><ellipse cx="25" cy="10" rx="3" ry="9"/><path d="M10 23a10 10 0 1020 0M10 32l-6 5m26-5 6 5"/><circle cx="16" cy="24" r="1"/><circle cx="24" cy="24" r="1"/>'};
 icons.rope='<path d="M8 8v12a12 12 0 0024 0V8M5 2h6v9H5zM29 2h6v9h-6z"/>';icons.pads='<ellipse cx="11" cy="20" rx="8" ry="14"/><ellipse cx="29" cy="20" rx="8" ry="14"/><circle cx="11" cy="20" r="4"/><circle cx="29" cy="20" r="4"/>';
 icons.fight='<path d="M4 12h32v23H4zM4 19h32M4 27h32M10 7l7 4-2 10-7-3zM30 7l-7 4 2 10 7-3z"/>';
 function boot(){
  const app=window.app;if(!app)return;const e=app.engine,w=()=>text[app.lang]||text.en;
  // GOTR-0016: variable (asynchronous) practice rhythm is the default; Synchronized stays one tap away.
  if(!e.practiceTiming)e.practiceTiming='random';
  const make=(tag,cls,label)=>{const n=document.createElement(tag);n.className=cls;if(label)n.textContent=label;return n;};
  const footer=document.querySelector('footer'),bar=make('div','training-bar');bar.id='trainingBar';
  const target=make('button','workout-tool'),combo=make('button','workout-tool'),fight=make('button','workout-tool fight-launch');fight.id='fightBtn';fight.type='button';fight.onclick=()=>window.fightUI?.configure();target.id='equipmentBtn';combo.id='combinationBtn';target.type=combo.type='button';
  const timing=make('button','workout-tool training-timing');timing.id='timingBtn';timing.type='button';
  const speed=document.getElementById('speedBtn');speed.className='workout-tool training-speed';
  bar.append(target,combo,speed,fight,timing);footer.prepend(bar);
  const words=()=>{const n={en:1,he:3,ru:5}[app.lang];return m=>COACH_TECHNIQUES[m]?.[n]||m;};
  const rail=document.getElementById('techniqueBar'),normalButtons=[...rail.children];let speedRail=false;
  function chooseSpeedDrill(id){e.speedDrill=id;e.technique='speedbag';e.animTime=0;e.arena?.setTarget('speed');e.isPlaying=true;paint();}
  function paintRail(mode){
   if(mode==='speed'&&!speedRail){
    rail.replaceChildren(...BOXING_ROUTINES.speedDrills.map(drill=>{const b=make('button','technique-btn px-3 py-2 rounded-lg text-xs font-bold shrink-0');b.type='button';b.dataset.speedDrill=drill.id;b.onclick=()=>chooseSpeedDrill(drill.id);return b;}));speedRail=true;
   }else if(mode!=='speed'&&speedRail){rail.replaceChildren(...normalButtons);speedRail=false;}
   if(speedRail)for(const b of rail.children){const drill=BOXING_ROUTINES.speedDrills.find(d=>d.id===b.dataset.speedDrill),selected=drill.id===(e.speedDrill||'alternating');b.textContent=drill.names[{en:0,he:1,ru:2}[app.lang]];b.setAttribute('aria-pressed',String(selected));b.classList.toggle('bg-amber-500',selected);b.classList.toggle('text-slate-950',selected);b.classList.toggle('bg-slate-800',!selected);b.classList.toggle('text-white',!selected);}
   else for(const b of normalButtons){const selected=b.dataset.technique===e.technique||b.dataset.technique==='combo'&&['random','freestyle'].includes(e.technique);b.classList.toggle('bg-amber-500',selected);b.classList.toggle('text-slate-950',selected);b.classList.toggle('bg-slate-800',!selected);b.classList.toggle('text-white',!selected);b.disabled=mode==='fight';b.textContent=words()(b.dataset.technique==='combo'?'combo':b.dataset.technique);if(b.dataset.technique==='combo')b.textContent=({en:'Combination',he:'שילוב',ru:'Комбинация'})[app.lang];}
  }
  function paint(){
   paintRail(e.targetMode||'none');
   fight.textContent=({en:'Fight',he:'קרב',ru:'Бой'})[app.lang]||'Fight';fight.setAttribute('aria-label',w().fight);
   const mode=e.targetMode||'none';target.textContent=mode==='rabbit'&&e.coach?.species==='rabbit'?w().lion:w()[mode];target.setAttribute('aria-label',w().target+': '+w()[mode]);
   target.setAttribute('aria-haspopup','dialog');combo.textContent=e.technique==='freestyle'?w().freestyle:e.technique==='random'?w().random:w().combos;combo.disabled=false;if(mode==='fight')combo.textContent=window.fightUI?.words().cards||'Scorecards';speed.disabled=mode==='fight';if(mode==='fight')speed.textContent='1×';for(const id of ['prevBtn','nextBtn'])document.getElementById(id).disabled=mode==='fight'||mode==='speed';document.body.classList.toggle('fight-active',mode==='fight');if(mode!=='fight')window.fightUI?.hide();
   timing.disabled=mode==='fight';timing.textContent=mode==='fight'?w().fightRhythm:e.practiceTiming==='random'?w().variableLabel:w().steadyLabel;
   timing.setAttribute('aria-label',w().timing+': '+(e.practiceTiming==='random'?w().variable:w().sync));
   if(mode==='speed'){combo.textContent=({en:'Next drill',he:'התרגיל הבא',ru:'Следующее'})[app.lang];document.getElementById('drillTier').textContent=w().speed;document.getElementById('exerciseNotes').textContent=({en:'Keep compact circles in front of the face. Finish the burst, defend, then return to rhythm.',he:'מעגלים קצרים לפני הפנים. סיימו רצף, הגנו וחזרו לקצב.',ru:'Короткие круги перед лицом. Завершите серию, выполните защиту и вернитесь к ритму.'})[app.lang];}
   if(['rope','pads'].includes(mode)){combo.disabled=true;timing.disabled=true;document.getElementById('drillTier').textContent=w()[mode];document.getElementById('exerciseNotes').textContent=w().hints[mode];for(const id of ['prevBtn','nextBtn'])document.getElementById(id).disabled=true;}
   if(e.player?.enabled){combo.disabled=true;timing.disabled=true;for(const id of ['prevBtn','nextBtn'])document.getElementById(id).disabled=true;}
   app.audio?.onState?.();
   speed.setAttribute('aria-label',({en:'Playback speed',he:'מהירות תנועה',ru:'Скорость'}[app.lang])+': '+e.speed+'×');
   document.querySelectorAll('[data-technique]').forEach(b=>{b.disabled=mode==='fight';});app.updatePlayBtnText();
  }
  function dialog(title){
   const d=make('dialog','training-dialog');const head=make('div','practice-control-heading');head.append(make('h2','',title));
   const close=make('button','', '×');close.type='button';close.setAttribute('aria-label',w().close);close.onclick=()=>d.close();head.append(close);d.append(head);
   d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);return d;
  }
  function chooseTarget(mode){
   if(e.targetMode!==mode)e.career?.finish();
   e.targetMode=mode;
   if(['rope','pads'].includes(mode)){e.animTime=0;e.isPlaying=true;e.technique='guard';if(mode==='rope')e.player?.setEnabled(false);}

   if(mode!=='fight'&&e.technique==='fight'){app.drillIdx=0;app.renderDrill();}
   if(mode!=='rabbit'&&e.technique==='random'){app.drillIdx=0;app.renderDrill();}
   if(mode==='speed'){
    e.technique='speedbag';e.animTime=0;e.isPlaying=true;
   }else if(e.technique==='speedbag'){
    app.drillIdx=0;app.renderDrill();
   }
   const hasDefence=e.technique==='random'||e.technique==='freestyle'||(e.technique==='combo'?BOXING_ROUTINES.sequences[e.currentAnim]?.some(m=>m==='slip'||m==='roll'):['slip','roll'].includes(e.technique));
   if(mode==='rabbit'&&!hasDefence){
    app.drillIdx=BOXING_ROUTINES.list.findIndex(r=>r.id==='sparring_flow');app.renderDrill();
   }
   e.arena?.setTarget(mode);paint();window.manualControls?.paint(true);window.dispatchEvent?.(new Event('resize'));
  }
  function activateRandom(){
   chooseTarget('rabbit');e.randomSeed=Math.floor(Math.random()*4294967295);e.technique='random';e.animTime=0;e.isPlaying=true;paint();
  }
  target.onclick=()=>{
   const d=dialog(w().title),grid=make('div','equipment-grid');
   for(const mode of ['none','heavy','dummy','speed','rope','pads','rabbit','fight']){
    const b=make('button','equipment-choice');b.type='button';b.dataset.target=mode;b.setAttribute('aria-pressed',String((e.targetMode||'none')===mode));
    const icon=make('span','equipment-icon');icon.innerHTML='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+icons[mode]+'</svg>';
    b.append(icon,make('strong','',w()[mode]),make('span','equipment-hint',w().hints[mode]));b.onclick=()=>{d.close();if(mode==='fight')window.fightUI?.configure();else chooseTarget(mode);};grid.append(b);
   }d.append(grid);d.showModal();
  };
  combo.onclick=()=>{
   if(e.targetMode==='speed'){
    const drills=BOXING_ROUTINES.speedDrills,index=drills.findIndex(d=>d.id===(e.speedDrill||'alternating'));chooseSpeedDrill(drills[(index+1)%drills.length].id);return;
   }
   if(e.targetMode==='fight'){window.fightUI?.detail();return;}
   const d=dialog(w().routine),grid=make('div','routine-grid');d.className+=' routine-picker';
   const finish=()=>{d.close();if(window.ringsideLayout?.drawer.open)window.ringsideLayout.drawer.close();};
   BOXING_ROUTINES.list.forEach((r,index)=>{
    const b=make('button','routine-choice');b.type='button';b.dataset.routine=r.id;b.setAttribute('aria-pressed',String(e.technique==='combo'&&e.currentAnim===r.id));
    b.append(make('strong','',r.names[{en:0,he:1,ru:2}[app.lang]]),make('span','',r.moves.map(words()).join(' → ')));
    if(r.advanced)b.append(make('small','',({en:'Advanced · ',he:'מתקדם · ',ru:'Продвинутый · '}[app.lang])+r.moves.length+({en:' moves',he:' תנועות',ru:' движений'}[app.lang])));
    b.onclick=()=>{app.drillIdx=index;app.renderDrill();e.isPlaying=true;paint();finish();};grid.append(b);
   });
   const random=make('button','routine-choice');random.type='button';random.dataset.routine='random';random.setAttribute('aria-pressed',String(e.technique==='random'));
   random.append(make('strong','',w().random),make('span','',w().randomHint));random.onclick=()=>{activateRandom();finish();};grid.append(random);
   const deck=make('button','routine-choice');deck.type='button';deck.dataset.routine='freestyle';deck.setAttribute('aria-pressed',String(e.technique==='freestyle'));
   deck.append(make('strong','',w().freestyle),make('span','',w().freestyleHint));deck.onclick=()=>{e.technique='freestyle';e.randomSeed=Math.floor(Math.random()*4294967295);e.animTime=0;e.isPlaying=true;e.arena?.setTarget(e.targetMode||'none');paint();finish();};grid.append(deck);
   const pager=make('nav','routine-pager'),previous=make('button','', '◀'),next=make('button','', '▶'),status=make('output');previous.type=next.type='button';previous.setAttribute('aria-label',({en:'Previous combinations',he:'שילובים קודמים',ru:'Предыдущие комбинации'})[app.lang]);next.setAttribute('aria-label',({en:'Next combinations',he:'שילובים הבאים',ru:'Следующие комбинации'})[app.lang]);
   let page=0;const cards=[...grid.children],pageSize=12,total=Math.ceil(cards.length/pageSize);function showPage(){cards.forEach((card,i)=>card.hidden=Math.floor(i/pageSize)!==page);previous.disabled=page===0;next.disabled=page===total-1;status.textContent=(page+1)+' / '+total;}previous.onclick=()=>{page--;showPage();};next.onclick=()=>{page++;showPage();};pager.append(previous,status,next);showPage();d.append(grid,pager);d.showModal();
  };
  timing.onclick=()=>{
   if(e.targetMode==='fight')return;
   const d=dialog(w().timing),grid=make('div','routine-grid');
   for(const value of ['random','sync']){
    const b=make('button','routine-choice');b.type='button';b.dataset.timing=value;
    b.setAttribute('aria-pressed',String((e.practiceTiming||'random')===value));
    b.append(make('strong','',value==='sync'?w().sync:w().variable),make('span','',value==='sync'?w().syncHelp:w().variableHelp));
    b.onclick=()=>{e.practiceTiming=value;e.practiceSeed=Math.floor(Math.random()*4294967295);e.animTime=0;e.arena?.setTarget(e.targetMode||'none');paint();d.close();};grid.append(b);
   }
   const credits=make('a','audio-credits','Audio credits');credits.href='./assets/audio/ATTRIBUTION.md';credits.target='_blank';credits.rel='noopener';
   d.append(grid,credits);d.showModal();
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
   if(e.viewControls?.preset){e.viewControls.preset(yaw,solo);return;}
   if(e.arena&&e.arena.mode!=='none'){e.arena.group.rotation.y=yaw;e.arena.fitCamera(e.camera);}
   else if(e.activeModel){e.activeModel.rotation.y=solo;e.fitCameraToModel(e.activeModel);}
  };};
  camera('camFront',.78,0);camera('camSide',Math.PI/2,1.15);camera('camBack',Math.PI+.78,Math.PI);
  const language=app.setLanguage.bind(app);app.setLanguage=lang=>{language(lang);paint();};
  setInterval(()=>{
   const mode=e.targetMode||'none';if(e.player?.enabled)return;if(mode==='fight'){document.getElementById('comboCodes').textContent='VS';document.getElementById('comboCues').textContent=w().fight;return;}if(mode==='speed'){
    document.getElementById('comboCodes').textContent='↻';const drill=BOXING_ROUTINES.speedDrills.find(d=>d.id===(e.speedDrill||'alternating'));document.getElementById('comboCues').textContent=drill.names[{en:0,he:1,ru:2}[app.lang]];return;
   }
   if(e.technique==='random'){
    const exchange=e.arena?.metrics?.random,label=words(),name=move=>move==='slip'?w().slip:label(move);document.getElementById('comboCodes').textContent='↔';
    document.getElementById('comboCues').textContent=exchange?w().lion+': '+(exchange.lion.move==='guard'?w().guard:name(exchange.lion.move))+' · '+w().rabbit+': '+(exchange.rabbit.move==='guard'?w().guard:name(exchange.rabbit.move)):w().random;return;
   }
   const f=e.arena?.metrics?.practice||BOXING_ROUTINES.frame(e.animTime,e.technique,e.currentAnim),counter=BOXING_ROUTINES.opponent(f),name=words();
   if(e.technique==='freestyle')document.getElementById('comboCodes').textContent='↻ '+((f.packet||0)+1);
   const incoming=mode==='rabbit'&&counter.attack?w().incoming+' '+name(counter.move)+' → ':'';
   const next=f.moves[(f.slot+1)%f.moves.length];
   document.getElementById('comboCues').textContent=f.rest?w().read:incoming+name(f.move)+(f.moves.length>1?' · '+w().next+': '+name(next):'');
  },120);
  window.trainingControls={chooseTarget,activateRandom,refresh:paint};paint();
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
