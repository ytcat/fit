/* GOTR-0040 punch power meter.
   Fight: a slim meter under each fighter's health bar shows the power of that fighter's last landed punch
   (fills, then fades; power shots in a stronger colour). Training (bag, dummy, speed bag, mitts, sparring):
   a small gauge with the last punch and the best of this session at the station.
   Values come from the real contact impulse of each contact event, scaled per target. */
(() => {
 const WORDS={en:{power:'Power',last:'Last',best:'Best'},he:{power:'עוצמה',last:'אחרון',best:'שיא'},ru:{power:'Сила',last:'Удар',best:'Рекорд'}};
 // Full scale of the contact impulse per target, from measured ranges (qa/gotr-0040/impulses.cjs):
 // heavy bag 56-104, mitts 12-33 (max 36), fight severity 0.07-1.6, light targets 0.3-1.3.
 const SCALE={heavy:110,pads:36,fight:1.6,speed:1.3,dummy:1.3,rabbit:1.3};
 const STRONG=.7,TRAINING=['heavy','dummy','speed','pads','rabbit'];
 const clamp=x=>Math.max(0,Math.min(1,x));
 function power(hit,mode){
  if(!hit||hit.receiver==='platform'||!(hit.impulse>0))return null;
  if(mode==='fight'){const landed=!hit.blocked&&(hit.legal??(hit.kind==='head'||hit.kind==='body'));return landed?clamp(hit.impulse/SCALE.fight):null;}
  if(!TRAINING.includes(mode)||hit.actor!=='lion'||hit.receiver==='lion')return null;
  return clamp(hit.impulse/(SCALE[mode]||1.3));
 }
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const words=()=>WORDS[window.app?.lang]||WORDS.en;
 function bar(){const track=make('span','gr-power-track'),fill=make('span','gr-power-fill'),best=make('span','gr-power-best');track.append(fill,best);return {track,fill,best};}
 function show(row,fill,value){
  fill.style.setProperty('--p',(value*100).toFixed(1)+'%');row.dataset.strong=value>=STRONG?'1':'0';
  // Restart the fade: full brightness on contact, then down to a faint trace.
  row.classList.remove('is-fresh');void row.offsetWidth;row.classList.add('is-fresh');
 }
 class PowerMeter {
  constructor(engine){
   this.engine=engine;this.corners={};this.fightKey=null;this.mode=null;this.best=0;this.last=null;this.lang='';
   const stage=document.getElementById('stageContainer');
   const gauge=make('div','gr-power-gauge');gauge.id='powerGauge';gauge.hidden=true;gauge.setAttribute('role','status');gauge.setAttribute('aria-live','polite');
   this.label=make('span','gr-power-label');const b=bar();this.gaugeBar=b;this.text=make('span','gr-power-text');
   gauge.append(this.label,b.track,this.text);stage?.append(gauge);this.gauge=gauge;
   const previous=engine.onImpact;engine.onImpact=hit=>{previous?.(hit);try{this.hit(hit);}catch(error){console.warn('power meter',error);}};
   this.paint();setInterval(()=>this.paint(),300);
  }
  modeNow(){const a=this.engine.arena;return a&&a.mode!=='none'?a.mode:'none';}
  // Fight rows live inside each health corner, so they share its layout, direction and visibility.
  cornerRow(actor){
   const corner=document.querySelector('#fightHealth .fight-health-player[data-corner='+(actor==='lion'?'red':'blue')+']');if(!corner)return null;
   let c=this.corners[actor];if(c&&c.row.parentNode===corner)return c;
   const row=make('div','gr-power-row'),label=make('span','gr-power-label'),b=bar();row.append(label,b.track);corner.append(row);
   c=this.corners[actor]={row,label,fill:b.fill};label.textContent=words().power;return c;
  }
  hit(hit){
   const mode=this.modeNow(),value=power(hit,mode);if(value==null)return;
   if(mode==='fight'){const c=this.cornerRow(hit.actor);if(c)show(c.row,c.fill,value);return;}
   if(this.mode!==mode){this.mode=mode;this.best=0;}
   this.last=value;this.best=Math.max(this.best,value);show(this.gauge,this.gaugeBar.fill,value);
   this.gaugeBar.best.style.setProperty('--p',(this.best*100).toFixed(1)+'%');this.gaugeBar.best.hidden=false;this.writeText();
  }
  writeText(){const w=words(),f=v=>v==null?'–':String(Math.round(v*100));this.text.textContent=w.last+' '+f(this.last)+' · '+w.best+' '+f(this.last==null?null:this.best);this.gauge.setAttribute('aria-label',w.power+': '+this.text.textContent);}
  paint(){
   const mode=this.modeNow(),lang=window.app?.lang||'en',w=words(),view=this.engine.arena?.fightView;
   // A new bout or a new station starts empty.
   const key=mode==='fight'?view:null;if(key!==this.fightKey){this.fightKey=key;for(const c of Object.values(this.corners)){c.fill.style.setProperty('--p','0%');c.row.classList.remove('is-fresh');c.row.dataset.strong='0';}}
   if(mode!==this.mode&&mode!=='fight'){this.mode=mode;this.best=0;this.last=null;this.gaugeBar.fill.style.setProperty('--p','0%');this.gaugeBar.best.hidden=true;this.gauge.classList.remove('is-fresh');this.writeText();}
   if(mode==='fight'){this.cornerRow('lion');this.cornerRow('rabbit');}
   this.gauge.hidden=!TRAINING.includes(mode);
   if(lang!==this.lang){this.lang=lang;this.label.textContent=w.power;for(const c of Object.values(this.corners))c.label.textContent=w.power;this.writeText();}
  }
 }
 const api={PowerMeter,power,SCALE,WORDS};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof window!=='undefined'){window.PowerMeter=api;
  if(typeof document!=='undefined'&&document.getElementById){const start=setInterval(()=>{const e=window.app?.engine;if(!e||!e.onImpact)return;clearInterval(start);e.powerMeter=new PowerMeter(e);},250);}}
})();
