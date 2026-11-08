/* Compact fight HUD and transparent judge cards. */
(() => {
 const words={
 en:{fight:'Fight mode',choose:'Choose a bout',three:'Three-round exhibition',club:'Club bout · 4 rounds',six:'Six-round bout',title:'Title bout · 12 rounds',exhibition:'Quick exhibition · 3 rounds',real:'3 min per round · 1 min rest · 3 judges',quick:'1 min per round · 15 sec rest · shortened exhibition',start:'Start a new fight',close:'Close',round:'Round',rest:'Corner break',intro:'Fighters ready',count:'Knockdown count',cards:'Scorecards',waiting:'Judges’ scorecards',lion:'Lion',rabbit:'Rabbit',winner:'wins',draw:'Draw',unanimous:'unanimous decision',split:'split decision',majority:'majority decision',TKO:'referee stoppage',details:'Round-by-round details',new:'New fight',judge:'Judge',pending:'Awaiting the decision',scoring:'Head/body contacts score. Glove and shoulder contacts do not.',stats:'Clean head / body · blocked · thrown',stoppage:'Scores through stoppage; TKO decides the result.'},
 he:{fight:'מצב קרב',choose:'בחירת קרב',three:'קרב ראווה · 3 סיבובים',club:'קרב מועדון · 4 סיבובים',six:'קרב של 6 סיבובים',title:'קרב אליפות · 12 סיבובים',exhibition:'קרב ראווה קצר · 3 סיבובים',real:'3 דקות לסיבוב · דקת מנוחה · 3 שופטים',quick:'דקה לסיבוב · 15 שניות מנוחה · קרב ראווה מקוצר',start:'התחלת קרב חדש',close:'סגירה',round:'סיבוב',rest:'מנוחה בפינה',intro:'הלוחמים מוכנים',count:'ספירת נוקדאון',cards:'ניקוד השופטים',waiting:'כרטיסי השופטים',lion:'אריה',rabbit:'ארנב',winner:'מנצח',draw:'תיקו',unanimous:'החלטה פה אחד',split:'החלטה חצויה',majority:'החלטת רוב',TKO:'עצירת השופט',details:'פירוט לפי סיבוב',new:'קרב חדש',judge:'שופט',pending:'ממתינים להכרעה',scoring:'פגיעות בראש ובגוף מזכות בניקוד. פגיעות בכפפה ובכתף אינן מזכות בניקוד.',stats:'ראש / גוף · חסימות · אגרופים',stoppage:'ניקוד עד העצירה; הניצחון נקבע בעצירת השופט.'},
 ru:{fight:'Режим боя',choose:'Выберите бой',three:'Показательный бой · 3 раунда',club:'Клубный бой · 4 раунда',six:'Бой на 6 раундов',title:'Титульный бой · 12 раундов',exhibition:'Короткий бой · 3 раунда',real:'3 мин раунд · 1 мин отдых · 3 судьи',quick:'1 мин раунд · 15 сек отдых · показательный бой',start:'Начать новый бой',close:'Закрыть',round:'Раунд',rest:'Перерыв',intro:'Бойцы готовы',count:'Отсчёт нокдауна',cards:'Судейские записки',waiting:'Записки судей',lion:'Лев',rabbit:'Кролик',winner:'побеждает',draw:'Ничья',unanimous:'единогласное решение',split:'раздельное решение',majority:'решение большинства',TKO:'остановка рефери',details:'Подробности по раундам',new:'Новый бой',judge:'Судья',pending:'Ожидание решения',scoring:'Очки за попадания в голову и корпус. Перчатки и плечи не дают очков.',stats:'Голова / корпус · блоки · удары',stoppage:'Записки до остановки; результат решён техническим нокаутом.'}
 };
 Object.assign(words.en,{quickfight:'Quick fight · 1 minute',quickhelp:'One 60-second round · health damage · knockout or draw',KO:'Knockout',health:'health decision'});
 Object.assign(words.he,{quickfight:'קרב מהיר · דקה אחת',quickhelp:'סיבוב אחד של דקה · מד חיים · נוקאאוט או תיקו',KO:'נוקאאוט',health:'הכרעה לפי מד חיים'});
 Object.assign(words.ru,{quickfight:'Быстрый бой · 1 минута',quickhelp:'Один раунд 60 секунд · здоровье · нокаут или ничья',KO:'Нокаут',health:'по здоровью'});
 const clock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 function boot(){
  const app=window.app;if(!app)return;const e=app.engine,w=()=>words[app.lang]||words.en,make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
  const hud=make('div','fight-hud');hud.id='fightHud';hud.hidden=true;hud.setAttribute('role','status');document.getElementById('stageContainer').append(hud);
  const health=make('div','fight-health');health.id='fightHealth';health.hidden=true;document.getElementById('stageContainer').append(health);
  const banner=make('div','fight-knockout');banner.id='fightKnockout';banner.hidden=true;document.getElementById('stageContainer').append(banner);
  const panel=make('section','fight-results');panel.id='fightResults';panel.hidden=true;document.querySelector('footer').prepend(panel);
  function dialog(title){const d=make('dialog','training-dialog fight-dialog'),head=make('div','practice-control-heading');head.append(make('h2','',title));const close=make('button','', '×');close.type='button';close.setAttribute('aria-label',w().close);close.onclick=()=>d.close();head.append(close);d.append(head);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;}
  function configure(){
   const d=dialog(w().choose),grid=make('div','routine-grid');
   for(const preset of ['club','quick','three','six','title','exhibition']){const b=make('button','routine-choice');b.type='button';b.dataset.fightPreset=preset;b.append(make('strong','',preset==='quick'?w().quickfight:w()[preset]),make('span','',preset==='quick'?w().quickhelp:preset==='exhibition'?w().quick:w().real));b.onclick=()=>{e.fightOptions={preset,seed:Math.floor(Math.random()*4294967296)};e.animTime=0;e.targetMode='fight';e.technique='fight';e.speed=1;e.isPlaying=true;window.trainingControls.chooseTarget('fight');d.close();};grid.append(b);}d.append(grid);
  }
  const labels=view=>window.GameIdentity?.labels(view)||w();
  function detail(view=e.arena?.fightView){
   if(!view)return;const m=view.match,d=dialog(w().cards);d.append(make('p','fight-note',labels(view).lion+' — '+labels(view).rabbit));d.append(make('p','fight-note',w().scoring));
   const table=make('table','fight-score-table'),head=make('tr');for(const t of [w().round,w().judge+' 1',w().judge+' 2',w().judge+' 3'])head.append(make('th','',t));table.append(head);
   for(let i=0;i<m.cards[0].rounds.length;i++){const row=make('tr');row.append(make('th','',String(i+1)));for(const card of m.cards)row.append(make('td','',card.rounds[i].scores.join(' – ')));table.append(row);}d.append(table);
   for(const actor of ['lion','rabbit']){const t=m.totals[actor];d.append(make('p','fight-note',labels(view)[actor]+': '+t.head+' / '+t.body+' · '+t.blocked+' · '+t.thrown));}d.append(make('p','fight-note',w().stats));
  }
  let last='';
  function render(view){
   const m=view.match,s=m.snapshot(),key=[labels(view).lion,labels(view).rabbit,app.lang,s.phase,s.round,Math.ceil(s.remaining),Math.ceil(s.restRemaining),s.count,s.cardsShown,s.totals.lion.landed,s.totals.rabbit.landed,s.health?.lion,s.health?.rabbit].join('|');if(last===key)return;last=key;
   hud.hidden=false;health.hidden=false;health.replaceChildren();
   for(const actor of ['lion','rabbit']){const value=Math.max(0,Math.min(100,s.health?.[actor]??100)),column=make('div','fight-health-player'),label=make('span','fight-health-label',labels(view)[actor]+' · '+Math.ceil(value)),track=make('div','fight-health-track'),fill=make('div','fight-health-fill');
    track.setAttribute('role','progressbar');track.setAttribute('aria-label',labels(view)[actor]);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(Math.round(value)));
    const color=value>75?'#38bdf8':value>50?'#34d399':value>25?'#facc15':'#f87171';fill.setAttribute('style','width:'+value+'%;background:'+color);track.append(fill);column.append(label,track);health.append(column);}
   banner.hidden=!(s.result?.stoppage==='KO');banner.textContent=s.result?.winner?w().KO.toUpperCase()+' · '+labels(view)[s.result.winner]+' '+w().winner:w().KO.toUpperCase()+' · '+w().draw;
   const status=s.phase==='round'?w().round+' '+s.round+'/'+s.rounds+' · '+clock(s.remaining):s.phase==='rest'?w().rest+' · '+clock(s.restRemaining):s.phase==='count'?w().count+' · '+s.count:s.phase==='intro'?w().intro:s.phase==='scoring'?w().pending:'';
   hud.textContent=status+(s.phase==='round'?'  |  '+labels(view).lion+' '+s.totals.lion.landed+' · '+labels(view).rabbit+' '+s.totals.rabbit.landed:'');
   const before=panel.hidden;panel.hidden=!s.result;if(before!==panel.hidden)window.dispatchEvent?.(new Event('resize'));if(!s.result)return;panel.replaceChildren();
   const title=s.phase==='ceremony'?(s.result.winner?labels(view)[s.result.winner]+' '+w().winner+' · '+w()[s.result.decision]:w().draw):w().waiting;
   panel.append(make('strong','fight-result-title',title),make('p','fight-card-order',labels(view).lion+' — '+labels(view).rabbit));const cards=make('div','fight-card-grid');
   for(const [i,card] of s.result.cards.entries()){const cell=make('div','fight-card');cell.append(make('span','',w().judge+' '+(i+1)),make('strong','',i<s.cardsShown?card.totals.join(' – '):'•• – ••'));cards.append(cell);}panel.append(cards);
   if(s.result.method==='TKO')panel.append(make('p','fight-note',w().stoppage));
   const actions=make('div','fight-result-actions'),details=make('button','workout-tool',w().details),again=make('button','workout-tool',w().new);details.onclick=()=>detail(view);again.onclick=configure;actions.append(details,again);panel.append(actions);
  }
  function hide(){hud.hidden=panel.hidden=health.hidden=banner.hidden=true;last='';}
  e.onFightEvent=event=>{if(event.type==='announcement')app.audio.applause?.();else app.audio.bell(event.type==='final-bell'?'final':event.kind||'start');};
  window.fightUI={configure,detail,render,hide,words:()=>w()};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
