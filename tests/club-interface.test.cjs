// DOM integration without WebGL: run the real UI modules against the shipped markup.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.listeners={};this._text='';this.style={};this.classList={add:(...v)=>{const s=new Set(this.className.split(/\s+/));v.forEach(x=>s.add(x));this.className=[...s].join(' ');},remove:(...v)=>this.className=this.className.split(/\s+/).filter(x=>!v.includes(x)).join(' '),contains:v=>this.className.split(/\s+/).includes(v),toggle:(v,on)=>{on=on===undefined?!this.classList.contains(v):on;if(on)this.classList.add(v);else this.classList.remove(v);return on;}};}
 get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
 getAttribute(k){if(k==='id')return this.id;if(k.startsWith('data-'))return this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];return this.attrs[k];}
 append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);}}
 prepend(...nodes){for(const n of [...nodes].reverse()){n.remove();n.parentElement=this;this.children.unshift(n);}}
 replaceChildren(...nodes){for(const n of [...this.children])n.remove();this._text='';this.append(...nodes);}
 remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
 before(n){const p=this.parentElement;n.remove();n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);}
 after(n){const p=this.parentElement;n.remove();n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);}
 get firstElementChild(){return this.children[0];}get lastElementChild(){return this.children.at(-1);}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}set textContent(v){this.replaceChildren();this._text=String(v);}
 get innerText(){return this.textContent;}set innerText(v){this.textContent=v;}
 set innerHTML(html){this.replaceChildren();parse(html,this);}get innerHTML(){return this.textContent;}
 matches(selector){const attrs=[...selector.matchAll(/\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]/g)];let rest=selector.replace(/\[[^\]]+\]/g,'');for(const a of attrs){const value=a[1]==='open'?(this.open?'':undefined):this.getAttribute(a[1]);if(value===undefined||a[2]!==undefined&&value!==a[2])return false;}const id=rest.match(/#([\w-]+)/);if(id&&this.id!==id[1])return false;const classes=[...rest.matchAll(/\.([\w-]+)/g)];if(classes.some(c=>!this.classList.contains(c[1])))return false;const tag=rest.match(/^[\w-]+/);return !tag||this.tagName===tag[0].toUpperCase();}
 querySelectorAll(s){const parts=s.trim().split(/\s+/),result=[];const walk=n=>{for(const child of n.children){if(child.matches(parts.at(-1))){let p=child.parentElement,i=parts.length-2;while(p&&i>=0){if(p.matches(parts[i]))i--;p=p.parentElement;}if(i<0)result.push(child);}walk(child);}};walk(this);return result;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}dispatchEvent(e){for(const fn of this.listeners[e.type]||[])fn(e);}
 click(){if(this.disabled)return;const event={target:this,type:'click'};this.onclick?.(event);this.dispatchEvent(event);}
 showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent({type:'close'});}
}
function parse(html,root){const stack=[root];for(const token of html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<([^>]+)>|([^<]+)/g)){if(token[2]){stack.at(-1)._text+=token[2];continue;}const raw=token[1];if(raw[0]==='/'){stack.pop();continue;}if(raw[0]==='!')continue;const tag=raw.match(/^([\w-]+)/)?.[1];if(!tag)continue;const n=new Element(tag);for(const a of raw.slice(tag.length).matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))n.setAttribute(a[1],a[2]??a[3]??a[4]??'');stack.at(-1).append(n);if(!/\/$/.test(raw)&&!['input','meta','link','img','br','hr'].includes(tag))stack.push(n);}}
const body=new Element('body'),html=fs.readFileSync('index.html','utf8');parse(html.split(/<body[^>]*>/)[1].split('<script>')[0],body);
const document={body,documentElement:new Element('html'),readyState:'complete',getElementById:id=>body.querySelector('#'+id),createElement:t=>new Element(t),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),listeners:{},addEventListener(k,f){(this.listeners[k]||=[]).push(f);}};
const get=id=>document.getElementById(id),saved=new Map(),intervals=[],events={};
const e={technique:'combo',currentAnim:'one_two',animTime:0,speed:1,isPlaying:true,coach:{species:'lion'},targetMode:'none',arena:{setTarget(mode){this.mode=mode;}},world:{update(){}}};
const app={engine:e,lang:'en',drillIdx:0,clock:180,isActive:false,isRest:false,audio:{muted:true,onState(){},applause(){},bell(){}},setLanguage(l){this.lang=l;document.documentElement.dir=l==='he'?'rtl':'ltr';},updatePlayBtnText(){get('playBtn').textContent=e.isPlaying?'Pause':'Resume';},toggle(){e.isPlaying=!e.isPlaying;this.updatePlayBtnText();},renderTechnique(){},renderDrill(){e.technique='combo';e.currentAnim=ctx.BOXING_ROUTINES.list[this.drillIdx].id;e.animTime=0;},updateHUD(){}};
e.roster={select(species){if(e.targetMode==='fight')return false;e.coach.species=species;return true;}};
const sound=new Element('button');sound.id='stageSound';get('stageContainer').append(sound);
get('playBtn').onclick=()=>app.toggle();get('motionPause').onclick=()=>app.toggle();
for(const b of document.querySelectorAll('[data-technique]'))b.addEventListener('click',()=>{e.technique=b.dataset.technique;e.isPlaying=true;});
for(const lang of ['EN','HE','RU'])get('lang'+lang).onclick=()=>app.setLanguage(lang.toLowerCase());
const ctx={THREE:require('../assets/vendor/three.min.js'),document,app,console,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},setTimeout:()=>1,clearTimeout(){},setInterval:fn=>intervals.push(fn),clearInterval(){},CustomEvent:class{},Event:class{},CoachRoster:{preferred:()=> 'lion'},addEventListener:(k,fn)=>(events[k]||=[]).push(fn),dispatchEvent(){},I18N:{}};ctx.window=ctx;
for(const f of ['boxing-routines.js','boxing-input.js','boxing-coach-v2.js','character-roster.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
for(const lang of ['en','he','ru'])ctx.I18N[lang]={drills:ctx.BOXING_ROUTINES.list.map(x=>({codes:x.id}))};
for(const f of ['workout-experience.js','practice-layout.js','fight-ui.js','training-controls.js','club-interface.js','ringfighter-controls.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
assert.equal(get('appTitle').textContent,'RingFighter');get('playMode').click();assert.ok(e.player.enabled);assert.equal(document.querySelectorAll('[data-input-move]').length,12);document.querySelector('[data-input-move="jab"]').click();assert.equal(e.player.current.move,'jab');get('watchMode').click();assert.equal(e.player.enabled,false);assert.equal(get('manualControls').hidden,true);
assert.ok(body.classList.contains('club-app'));assert.equal(get('stageContainer').parentElement.className,'club-studio');assert.equal(get('openPracticeControls').parentElement.className,'club-head-tools');assert.equal(get('camFront').parentElement.className,'club-camera-group');assert.equal(document.querySelectorAll('[data-character]').length,2);assert.equal(document.querySelectorAll('[data-equipment]').length,5);
document.querySelector('[data-character="rabbit"]').click();assert.equal(e.coach.species,'rabbit');assert.equal(body.dataset.character,'rabbit');assert.equal(document.querySelector('[data-character="rabbit"]').getAttribute('aria-pressed'),'true');
document.querySelector('[data-equipment="heavy"]').click();assert.equal(e.targetMode,'heavy');assert.equal(document.querySelector('[data-equipment="heavy"]').getAttribute('aria-pressed'),'true');
document.querySelector('[data-equipment="speed"]').click();assert.equal(get('techniqueBar').children.length,10);assert.ok(get('techniqueBar').children.every(n=>n.dataset.speedDrill));get('playMode').click();document.querySelector('[data-input-move="tap_rear"]').click();assert.equal(e.player.current.side,'R');assert.equal(e.player.current.move,'speedbag');get('watchMode').click();
document.querySelector('[data-equipment="none"]').click();assert.equal(get('techniqueBar').children.length,11);assert.equal(document.querySelector('[data-technique="guard"]').textContent,'Stance');document.querySelector('[data-technique="guard"]').click();ctx.clubInterface.paint();assert.equal(document.querySelector('[data-technique="guard"]').getAttribute('aria-pressed'),'true');
get('playBtn').click();ctx.clubInterface.paint();assert.equal(e.isPlaying,false);assert.equal(get('sessionStatus').textContent,'Paused');
for(const lang of ['he','ru','en']){get('lang'+lang.toUpperCase()).click();assert.equal(app.lang,lang);assert.equal(saved.get('shadowbox-language'),lang);assert.equal(e.isPlaying,false);assert.equal(e.coach.species,'rabbit');}
get('openPracticeControls').click();assert.equal(get('practiceControls').open,true);get('practiceControls').firstElementChild.lastElementChild.click();assert.equal(get('practiceControls').open,false);
document.querySelector('.club-navigation').lastElementChild.click();let fightDialog=document.querySelector('dialog[open]');assert.ok(fightDialog);fightDialog.querySelector('[data-fight-preset="quick"]').click();ctx.clubInterface.paint();assert.equal(body.dataset.scene,'arena');assert.equal(e.targetMode,'fight');assert.ok(document.querySelectorAll('[data-character]').every(b=>b.disabled));
document.querySelector('.club-primary').click();assert.equal(e.targetMode,'none');assert.equal(body.dataset.scene,'gym');assert.ok(document.querySelectorAll('[data-character]').every(b=>!b.disabled));
assert.equal(get('prevBtn').parentElement,get('playBtn').parentElement);assert.equal(get('nextBtn').parentElement,get('playBtn').parentElement);
const ids=body.querySelectorAll('[id]').map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'redesign must move controls rather than duplicate their IDs');
console.log('PASS real-markup UI integration: character/equipment selection, 11 techniques, speed rail, pause, EN/HE/RU, settings, quick-fight setup, return to gym, transport and unique IDs');
