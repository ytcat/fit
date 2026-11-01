/* Follow-along training and device-local challenge progress. */
(() => {
  const KEY='shadowbox.challenge.v1';
  const words={
    en:{plan:'28-day plan',focus:'Focus view',controls:'Show controls',title:'Your shadowboxing plan',close:'Close',day:'Day',done:'completed',start:'Practice this day',finish:'Mark workout complete',saved:'Saved on this device',next:'Up next',practice:'Today’s practice',round:'Round',week:['Foundation','Build coordination','Extend combinations','Consolidate'],reset:'Start again',confirm:'Clear the completed days on this device?'},
    he:{plan:'תוכנית ל־28 יום',focus:'תצוגת אימון',controls:'הצגת פקדים',title:'תוכנית אימון אגרוף',close:'סגירה',day:'יום',done:'הושלמו',start:'תרגול היום הזה',finish:'סימון האימון כהושלם',saved:'נשמר במכשיר הזה',next:'בהמשך',practice:'התרגול להיום',round:'סיבוב',week:['יסודות','בניית תיאום','הארכת שילובים','תרגול מסכם'],reset:'התחלה מחדש',confirm:'למחוק את סימוני ההשלמה במכשיר הזה?'},
    ru:{plan:'План на 28 дней',focus:'Режим тренировки',controls:'Показать управление',title:'Ваш план боя с тенью',close:'Закрыть',day:'День',done:'завершено',start:'Практиковать этот день',finish:'Отметить тренировку завершённой',saved:'Сохранено на этом устройстве',next:'Далее',practice:'Сегодняшняя практика',round:'Раунд',week:['Основы','Координация','Комбинации','Закрепление'],reset:'Начать заново',confirm:'Сбросить завершённые дни на этом устройстве?'}
  };
  function load(){try {const s=JSON.parse(localStorage.getItem(KEY));return {selected:Math.min(28,Math.max(1,Math.round(Number(s?.selected))||1)),done:[...new Set((s?.done||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=28))]};}catch{return {selected:1,done:[]};}}
  function boot(){
    const app=window.app;if(!app)return;
    const state=load();let focus=false,lastLabel='',dialog;
    const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
    const bar=el('div','workout-tools');const plan=el('button','workout-tool'),focusButton=el('button','workout-tool');bar.append(plan,focusButton);document.querySelector('footer').prepend(bar);
    const next=el('div','workout-next');document.getElementById('stageContainer').append(next);
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}};
    const w=()=>words[app.lang]||words.en;
    const selectedDrill=day=>{const week=Math.floor((day-1)/7);return week===2?[1,3,1,3,2,3,1][(day-1)%7]:([0,0,1,0,2,1,3][(day-1)%7]+week)%4;};
    const paint=()=>{plan.textContent=`${w().plan} · ${state.done.length}/28`;focusButton.textContent=focus?w().controls:w().focus;focusButton.setAttribute('aria-pressed',String(focus));};
    focusButton.onclick=()=>{focus=!focus;document.body.classList.toggle('workout-focus',focus);paint();};
    plan.onclick=()=>{
      dialog=el('dialog','challenge-dialog');const title=el('h2','',w().title),close=el('button','workout-tool',w().close);close.onclick=()=>dialog.close();
      const head=el('div','challenge-head');head.append(title,close);dialog.append(head);
      const summary=el('p','challenge-summary',`${state.done.length}/28 ${w().done} · ${w().saved}`);dialog.append(summary);
      const grid=el('div','challenge-grid');
      for(let day=1;day<=28;day++){
        const button=el('button','challenge-day',`${state.done.includes(day)?'✓ ':''}${w().day} ${day}`);
        button.classList.toggle('complete',state.done.includes(day));button.classList.toggle('selected',state.selected===day);button.setAttribute('aria-pressed',String(state.selected===day));
        button.onclick=()=>{state.selected=day;save();dialog.close();plan.click();};grid.append(button);
      }
      dialog.append(grid);
      const info=el('p','challenge-summary',`${w().day} ${state.selected} · ${w().week[Math.floor((state.selected-1)/7)]}`);dialog.append(info);
      const start=el('button','challenge-primary',w().start);start.onclick=()=>{
        if(app.isActive||app.isRest){clearInterval(app.timer);app.isActive=false;app.isRest=false;document.getElementById('restModal').classList.add('hidden');}
        app.round=1;app.clock=180;app.drillIdx=selectedDrill(state.selected);app.renderDrill();app.updateHUD();app.updatePlayBtnText();dialog.close();
      };
      const finish=el('button','workout-tool',w().finish);finish.onclick=()=>{if(!state.done.includes(state.selected))state.done.push(state.selected);const persisted=save();paint();summary.textContent=`${state.done.length}/28 ${w().done}${persisted?' · '+w().saved:''}`;finish.disabled=true;};
      dialog.append(start,finish);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
    };
    const original=app.setLanguage.bind(app);app.setLanguage=(lang)=>{original(lang);paint();};
    // Expose current and next drill without covering the instructor's body.
    setInterval(()=>{
      const drills=I18N[app.lang].drills,current=drills[app.drillIdx],upcoming=drills[(app.drillIdx+1)%drills.length];
      const seconds=app.clock%25||25;
      const label=app.isActive&&!app.isRest?`${w().next}: ${upcoming.codes} · ${seconds}s`:`${w().practice}: ${current.codes}`;
      if(label!==lastLabel){next.textContent=label;lastLabel=label;}paint();
    },500);
    window.addEventListener('shadowbox-workout-complete',()=>{if(!state.done.includes(state.selected))state.done.push(state.selected);save();paint();});
    paint();
  }
  if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
