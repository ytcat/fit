/* Bout controls, three scorecards, local sound and a rhino referee ceremony. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 class FightVisual {
  constructor(arena){
   this.arena=arena;this.root=new THREE.Group();this.root.name='Rhino referee and applauding audience';arena.group.add(this.root);
   const mat=(color,roughness=.85)=>{const m=new THREE.MeshStandardMaterial({color,roughness});m.color.convertSRGBToLinear();return m;};
   this.gray=mat(0x818890);this.dark=mat(0x182331);this.white=mat(0xdedbd2);this.horn=mat(0xd3c7ad);this.black=mat(0x090e16);
   this.ref=new THREE.Group();this.ref.name='Rhino referee';this.root.add(this.ref);
   const ball=(parent,p,size,m)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);mesh.position.copy(p);mesh.scale.copy(size);mesh.castShadow=true;parent.add(mesh);return mesh;};
   this.ball=ball;
   ball(this.ref,V(0,1.18,0),V(.25,.37,.16),this.white);
   ball(this.ref,V(0,.86,0),V(.22,.17,.16),this.dark);
   for(const s of [-1,1]){
    ball(this.ref,V(s*.115,.48,0),V(.095,.40,.09),this.dark);ball(this.ref,V(s*.115,.08,.055),V(.10,.065,.17),this.black);
    ball(this.ref,V(s*.20,1.99,.015),V(.080,.115,.045),this.gray);
   }
   ball(this.ref,V(0,1.73,.015),V(.25,.25,.20),this.gray);
   ball(this.ref,V(0,1.64,.20),V(.235,.13,.18),this.gray);
   const horn=new THREE.Mesh(new THREE.ConeGeometry(.055,.22,24),this.horn);horn.position.set(0,1.82,.30);horn.rotation.x=.32;this.ref.add(horn);
   for(const s of [-1,1]){
    ball(this.ref,V(s*.13,1.78,.179),V(.018,.022,.012),this.black);
    ball(this.ref,V(s*.105,1.67,.355),V(.023,.013,.01),this.black);
    ball(this.ref,V(s*.045,1.47,.165),V(.045,.026,.02),this.black);
   }
   this.arms=[];
   for(const s of [-1,1]){
    const upper=this.segment(this.ref,.062,this.white),lower=this.segment(this.ref,.045,this.gray),hand=ball(this.ref,V(),V(.055,.075,.044),this.gray);
    this.arms.push({s,upper,lower,hand});
   }
   this.crowd=[];
   for(let i=0;i<12;i++){
    const s=i<6?-1:1,x=s*(.75+(i%6)*.17),z=-.7-(i%3)*.17,root=new THREE.Group();this.root.add(root);root.position.set(x,0,z);
    const m=mat([0x42556b,0x796446,0x485e5e][i%3]);ball(root,V(0,.57,0),V(.10,.22,.08),m);ball(root,V(0,.88,0),V(.08,.09,.075),this.gray);
    const arms=[this.segment(root,.025,m),this.segment(root,.025,m)];this.crowd.push({root,arms,i});
   }
   this.root.visible=false;
  }
  segment(parent,r,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12),material);mesh.castShadow=true;parent.add(mesh);return mesh;}
  link(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=a.distanceTo(b);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());}
  update(state,time){
   const show=state.phase==='decision'||state.phase==='ceremony';this.root.visible=show;if(!show)return;
   if(!this.shown){this.startYaw=this.arena.group.rotation.y;this.arena.fitCamera(this.arena.engine.camera);this.shown=true;}
   if(state.phase==='decision'&&state.elapsed<2)this.arena.group.rotation.y=this.startYaw*(1-ease(state.elapsed/2));
   const lift=state.phase==='ceremony'?ease(state.elapsed/1.5):0;
   this.ref.position.z=-.08;this.ref.position.y=0;
   for(const arm of this.arms){
    const actor=arm.s<0?'lion':'rabbit',coach=actor==='lion'?this.arena.engine.coach:this.arena.rabbit;
    const raising=state.winner===actor?lift:0;
    const shoulder=V(arm.s*.23,1.43,-.08),elbow=V(arm.s*(.30+.10*raising),1.16+raising*.57,-.04);
    const target=coach.joints[actor==='lion'?'handR':'handL'].getWorldPosition(V());this.arena.group.worldToLocal(target);
    // Keep a visible grasp at the inner glove cuff throughout the hand raise.
    target.y+=.025;this.link(arm.upper,shoulder,elbow);this.link(arm.lower,elbow,target);arm.hand.position.copy(target);
   }
   for(const person of this.crowd){
    const pulse=lift*(.5+.5*Math.sin(time*12+person.i)),y=.72+pulse*.13;
    for(let i=0;i<2;i++){const s=i?1:-1;this.link(person.arms[i],V(s*.10,.68,0),V(s*(.018+.08*(1-pulse)),y,.13));}
   }
  }
 }
 window.FightVisual=FightVisual;
 const words={
  en:{fight:'Fight',start:'Start bout',rematch:'Rematch',exit:'Back to training',title:'Lion vs Rabbit',format:'3 rounds × 3 minutes · 1-minute rests',note:'Three simulated judges score clean head and body hits. Blocks and shoulder hits do not score. A tied bout is a draw.',ready:'Ready',round:'Round',rest:'Rest',decision:'Judges’ scorecards',winner:'Winner',draw:'Draw',lion:'Lion',rabbit:'Rabbit',judge:'Judge',landed:'Clean hits',power:'Stamina',unanimous:'Unanimous decision',split:'Split decision',majority:'Majority decision',countdown:'Get ready',skip:'End rest',close:'Close',cards:'Scorecards',applause:'Winner announcement'},
  he:{fight:'קרב',start:'התחלת קרב',rematch:'קרב חוזר',exit:'חזרה לאימון',title:'אריה נגד ארנב',format:'3 סיבובים של 3 דקות · דקת מנוחה',note:'שלושה שופטים מדומים מנקדים פגיעות נקיות בראש ובגוף. חסימות ופגיעות בכתף אינן מקנות נקודות. שוויון מסתיים בתיקו.',ready:'מוכנים',round:'סיבוב',rest:'מנוחה',decision:'ניקוד השופטים',winner:'המנצח',draw:'תיקו',lion:'אריה',rabbit:'ארנב',judge:'שופט',landed:'פגיעות נקיות',power:'סיבולת',unanimous:'החלטה פה אחד',split:'החלטה חצויה',majority:'החלטת רוב',countdown:'היכונו',skip:'סיום מנוחה',close:'סגירה',cards:'כרטיסי ניקוד',applause:'הכרזת המנצח'},
  ru:{fight:'Бой',start:'Начать бой',rematch:'Реванш',exit:'К тренировке',title:'Лев против кролика',format:'3 раунда по 3 минуты · отдых 1 минута',note:'Три виртуальных судьи оценивают чистые попадания в голову и корпус. Блоки и удары в плечо не дают очков. Равный бой заканчивается ничьей.',ready:'Готовы',round:'Раунд',rest:'Отдых',decision:'Судейские записки',winner:'Победитель',draw:'Ничья',lion:'Лев',rabbit:'Кролик',judge:'Судья',landed:'Чистые удары',power:'Выносливость',unanimous:'Единогласное решение',split:'Раздельное решение',majority:'Решение большинства',countdown:'Приготовьтесь',skip:'Завершить отдых',close:'Закрыть',cards:'Судейские записки',applause:'Объявление победителя'}
 };
 function boot(){
  const app=window.app;if(!app)return;const e=app.engine,w=()=>words[app.lang]||words.en;
  const make=(tag,cls,label)=>{const n=document.createElement(tag);n.className=cls;if(label)n.textContent=label;return n;};
  const button=make('button','workout-tool fight-launch',w().fight);button.type='button';button.id='fightBtn';
  // Defer to the next task so the existing training rail has been assembled.
  setTimeout(()=>document.getElementById('trainingBar')?.append(button),0);
  const hud=make('section','fight-hud');hud.hidden=true;hud.id='fightHud';hud.setAttribute('aria-label',w().title);
  const status=make('strong','fight-status'),timer=make('span','fight-clock'),stats=make('div','fight-stats');hud.append(status,timer,stats);e.stage.append(hud);
  const scorePanel=make('section','fight-scorecards');scorePanel.hidden=true;scorePanel.id='fightScorecards';scorePanel.setAttribute('aria-live','polite');e.stage.append(scorePanel);
  let soundCursor=0,scoreKey='',lastPhase='',hasStarted=false;
  function active(){return e.technique==='fight'&&e.arena?.mode==='rabbit';}
  function start(){
   if(!e.arena)return;
   window.trainingControls.chooseTarget('rabbit');e.randomSeed=(Math.random()*4294967296)>>>0;e.technique='fight';e.animTime=0;e.isPlaying=true;
   e.arena.fightSession=null;if(e.arena.fightVisual)e.arena.group.remove(e.arena.fightVisual.root);
   e.arena.fightVisual=new FightVisual(e.arena);soundCursor=0;scoreKey='';lastPhase='';hasStarted=true;
   app.audio.init();app.updatePlayBtnText();update();
  }
  function exit(){
   e.technique='combo';e.animTime=0;e.arena.fightSession=null;e.arena.fightVisual=null;
   window.trainingControls.chooseTarget('none');app.renderDrill();update();
  }
  button.onclick=()=>{
   const d=make('dialog','training-dialog fight-dialog');const title=make('h2','',w().title),close=make('button','fight-close','×');close.type='button';close.setAttribute('aria-label',w().close);close.onclick=()=>d.close();
   const begin=make('button','fight-primary',hasStarted?w().rematch:w().start);begin.type='button';begin.disabled=!e.arena;begin.onclick=()=>{d.close();start();};
   d.append(close,title,make('p','fight-format',w().format),make('p','fight-note',w().note),begin);
   if(!e.arena)d.append(make('p','fight-note',document.getElementById('renderingNotice')?.textContent||({en:'The boxer is loading. Close this panel and try again shortly.',he:'המתאגרף נטען. סגרו את החלונית ונסו שוב בעוד רגע.',ru:'Боксёр загружается. Закройте окно и повторите через несколько секунд.'}[app.lang])));
   if(active()){const leave=make('button','workout-tool',w().exit);leave.type='button';leave.onclick=()=>{d.close();exit();};d.append(leave);}
   d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
  };
  function applause(){
   const ctx=app.audio.ctx;if(app.audio.muted||!ctx||ctx.state!=='running')return;
   const duration=4,buffer=ctx.createBuffer(1,ctx.sampleRate*duration,ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++){const t=i/ctx.sampleRate;data[i]=(Math.random()*2-1)*(.15+.1*Math.sin(t*37)**10)*Math.min(1,t*3)*Math.min(1,(duration-t)*2);}
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1400;filter.Q.value=.5;gain.gain.value=.20;
   source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
  }
  function update(){
   const on=active();hud.hidden=!on;document.body.classList.toggle('fight-active',on);button.textContent=w().fight;
   if(!on){scorePanel.hidden=true;return;}
   const s=e.arena.fightSession?.snapshot(e.arena.fightTime);if(!s)return;
   const events=e.arena.fightSession.events;
   while(soundCursor<events.length){const event=events[soundCursor++];if(event.type==='bell')app.audio.bell();else applause();}
   const label=s.phase==='round'?w().round+' '+s.round+' / 3':s.phase==='ceremony'?(s.winner?w().winner+': '+w()[s.winner]:w().draw):w()[s.phase]||w().ready;
   status.textContent=label;const seconds=Math.ceil(s.remaining);timer.textContent=Number.isFinite(seconds)?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'';
   stats.textContent=w().landed+'  '+w().lion+' '+(s.total.lion.head+s.total.lion.body)+' · '+w().rabbit+' '+(s.total.rabbit.head+s.total.rabbit.body);
   const results=s.phase==='decision'||s.phase==='ceremony';scorePanel.hidden=!results;
   const key=[s.phase,app.lang,s.winner,s.cards[0].length].join('|');
   if(results&&key!==scoreKey){
    scoreKey=key;scorePanel.replaceChildren();scorePanel.append(make('h2','',w().decision));
    s.totals.forEach((total,j)=>{
     const row=make('div','fight-judge');row.append(make('span','',w().judge+' '+(j+1)),make('strong','',total.lion+' — '+total.rabbit));scorePanel.append(row);
    });
    scorePanel.append(make('p','',w().lion+' — '+w().rabbit));
    if(s.phase==='ceremony')scorePanel.append(make('strong','fight-verdict',s.winner?w()[s.winner]+' · '+w()[s.decision]:w().draw));
    const rematch=make('button','fight-primary',w().rematch);rematch.type='button';rematch.onclick=start;scorePanel.append(rematch);
   }
   if(lastPhase!==s.phase){lastPhase=s.phase;app.updatePlayBtnText();}
  }
  window.fightControls={start,exit,update,FightVisual};setInterval(update,120);
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
