const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class El{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.classList={toggle(){}};}
 append(...nodes){for(const n of nodes){n.remove();this.children.push(n);n.parentElement=this;}}
 prepend(n){n.remove();this.children.unshift(n);n.parentElement=this;}
 remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
 setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){(this.listeners[k]||=[]).push(f);}
 showModal(){this.open=true;}close(){this.open=false;for(const f of this.listeners.close||[])f();}
 click(){if(!this.disabled){this.onclick?.();for(const f of this.listeners.click||[])f();}}
}
const els=new Map(),get=id=>{if(!els.has(id)){const n=new El('div');n.id=id;els.set(id,n);}return els.get(id);};
const body=new El('body'),footer=get('footer');body.append(footer);
const techniques=['jab','cross','hook','uppercut','slip','roll','combo'].map(m=>{const n=new El('button');n.dataset.technique=m;return n;});
const e={technique:'combo',currentAnim:'one_two',animTime:0,speed:1,isPlaying:true,arena:{setTarget(m){this.mode=m;}}};
const app={lang:'en',engine:e,drillIdx:0,setLanguage(l){this.lang=l;},updatePlayBtnText(){get('playBtn').textContent=e.isPlaying?'Pause':'Resume';},renderDrill(){e.technique='combo';e.currentAnim=ctx.BOXING_ROUTINES.list[this.drillIdx].id;e.animTime=0;}};
get('motionPause').onclick=()=>e.isPlaying=!e.isPlaying;
const ctx={THREE:require('../assets/vendor/three.min.js'),app,document:{body,readyState:'complete',createElement:t=>new El(t),getElementById:get,querySelector:s=>s==='footer'?footer:null,querySelectorAll:()=>techniques},setInterval:f=>ctx.pulse=f};ctx.window=ctx;
for(const f of ['boxing-routines.js','boxing-coach.js','training-controls.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const bar=footer.children[0],[target,combo,speed]=bar.children;
assert.equal(bar.id,'trainingBar');assert.equal(target.textContent,'Shadowboxing');assert.equal(speed.id,'speedBtn');
speed.click();let rates=body.children.at(-1);assert.equal(rates.children[1].children.length,8);rates.children[1].children[7].click();assert.equal(e.speed,3);assert.equal(speed.textContent,'3×');
target.click();let d=body.children.at(-1);assert.equal(d.children[1].children.length,5);d.children[1].children[4].click();
assert.equal(e.targetMode,'rabbit');assert.equal(e.arena.mode,'rabbit');assert.equal(e.currentAnim,'sparring_flow');assert.equal(d.parentElement,null);
combo.click();d=body.children.at(-1);assert.equal(d.children[1].children.length,12);d.children[1].children[5].click();assert.equal(e.currentAnim,'jab_slip_counter');
ctx.trainingControls.chooseTarget('speed');assert.equal(e.technique,'speedbag');assert.ok(combo.disabled);assert.ok(techniques.every(b=>b.disabled));ctx.pulse();assert.match(get('comboCues').textContent,/speed-bag/);
ctx.trainingControls.chooseTarget('none');assert.ok(!combo.disabled&&techniques.every(b=>!b.disabled));assert.equal(e.technique,'combo');
get('motionPause').click();assert.equal(e.isPlaying,false);assert.equal(get('playBtn').textContent,'Resume');
app.setLanguage('he');assert.equal(target.textContent,'אגרוף צל');app.setLanguage('ru');assert.equal(combo.textContent,'Комбинации');
console.log('PASS equipment chooser, 12 routines, rabbit defence flow, speed-bag mode, pause and three languages');
