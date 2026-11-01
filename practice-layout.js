// A clear full-body practice view; secondary controls live in one native dialog.
(() => {
 function boot(){
  if(!window.app)return;const app=window.app;
  const stage=document.getElementById('stageContainer'),footer=document.querySelector('footer');
  const dialog=document.createElement('dialog');dialog.id='practiceControls';
  const top=document.createElement('div');top.className='practice-control-heading';
  const title=document.createElement('h2'),close=document.createElement('button');
  close.type='button';close.textContent='×';close.setAttribute('aria-label','Close controls');close.onclick=()=>dialog.close();top.append(title,close);dialog.append(top);
  const addSection=node=>{node.className='practice-control-section';dialog.append(node);};
  const techniques=document.getElementById('techniqueBar');
  techniques.className='practice-techniques';techniques.setAttribute('aria-label','Boxing techniques');
  addSection(document.getElementById('camFront').parentElement);
  addSection(document.getElementById('defaultCoach').parentElement);
  addSection(document.querySelector('header').lastElementChild);
  addSection(document.getElementById('biomechanicsLabel').parentElement.parentElement);
  addSection(document.getElementById('modelStatusBadge').parentElement);
  const navigation=document.createElement('div');navigation.append(document.getElementById('prevBtn'),document.getElementById('nextBtn'));addSection(navigation);
  const tools=document.querySelector('.workout-tools');if(tools){const plan=tools.firstElementChild;addSection(plan);tools.remove();}
  const stats=document.getElementById('lblRound').parentElement.parentElement;stats.className='practice-stats';
  document.getElementById('lblLevel').parentElement.hidden=true;
  const actions=document.getElementById('playBtn').parentElement;actions.className='practice-actions';
  const open=document.createElement('button');open.id='openPracticeControls';open.type='button';open.className='workout-tool';open.onclick=()=>dialog.showModal();actions.append(open);
  const hint=document.getElementById('orbitHint').parentElement;hint.hidden=true;
  const current=document.getElementById('drillTier').parentElement.parentElement;current.className='practice-current';stage.before(current);
  document.body.append(dialog);document.body.classList.add('practice-clear');
  document.querySelector('.workout-next')?.remove();
  ['camFront','camBack','camSide','prevBtn','nextBtn'].map(id=>document.getElementById(id))
    .forEach(button=>button.addEventListener('click',()=>dialog.close()));
  const update=()=>{const labels={en:['Controls','Practice controls','Close controls'],he:['אפשרויות','אפשרויות תרגול','סגירת אפשרויות'],ru:['Управление','Настройки тренировки','Закрыть настройки']}[app.lang]||['Controls','Practice controls','Close controls'];open.textContent=labels[0];title.textContent=labels[1];close.setAttribute('aria-label',labels[2]);};
  const setLanguage=app.setLanguage.bind(app);app.setLanguage=lang=>{setLanguage(lang);update();};update();
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
